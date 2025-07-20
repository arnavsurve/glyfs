package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
	"github.com/tmc/langchaingo/tools"
)

type LLMService struct {
	mcpManager *MCPConnectionManager
}

func NewLLMService(mcpManager *MCPConnectionManager) *LLMService {
	return &LLMService{
		mcpManager: mcpManager,
	}
}

func (s *LLMService) CreateLLM(provider string) (llms.Model, error) {
	switch provider {
	case string(shared.Anthropic):
		return anthropic.New(
			anthropic.WithToken(os.Getenv("ANTHROPIC_API_KEY")),
		)
	case string(shared.OpenAI):
		return openai.New(
			openai.WithToken(os.Getenv("OPENAI_API_KEY")),
		)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

func (s *LLMService) GenerateResponse(ctx context.Context, agent *shared.AgentConfig, req *shared.AgentInferenceRequest) (*shared.AgentInferenceResponse, error) {
	llm, err := s.CreateLLM(agent.Provider)
	if err != nil {
		return nil, fmt.Errorf("creating LLM client: %w", err)
	}

	messages := s.buildMessages(agent.SystemPrompt, req.History, req.Message)

	// Get available tools for this agent
	var toolsList []tools.Tool
	if s.mcpManager != nil {
		agentTools, err := s.mcpManager.GetAgentTools(ctx, agent.ID)
		if err != nil {
			// Log error but continue without tools
			log.Printf("Warning: Failed to get agent tools: %v\n", err)
		} else {
			toolsList = agentTools
		}
	}

	opts := []llms.CallOption{
		llms.WithModel(agent.LLMModel),
		llms.WithTemperature(agent.Temperature),
	}

	// Add tools if available - convert to llms.Tool format
	if len(toolsList) > 0 {
		llmsTools := s.convertToLLMSTools(toolsList)
		opts = append(opts, llms.WithTools(llmsTools))
	}

	if agent.MaxTokens > 0 {
		opts = append(opts, llms.WithMaxTokens(agent.MaxTokens))
	}

	content, err := llm.GenerateContent(ctx, messages, opts...)
	if err != nil {
		return nil, fmt.Errorf("generating content: %w", err)
	}

	if len(content.Choices) == 0 {
		return nil, fmt.Errorf("no content generated")
	}

	response := &shared.AgentInferenceResponse{
		Response: content.Choices[0].Content,
	}

	return response, nil
}

func (s *LLMService) buildMessages(systemPrompt string, history []shared.Message, userMessage string) []llms.MessageContent {
	var messages []llms.MessageContent

	if systemPrompt != "" {
		messages = append(messages, llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt))
	}

	for _, msg := range history {
		msgType := llms.ChatMessageTypeHuman
		if msg.Role == "assistant" {
			msgType = llms.ChatMessageTypeAI
		}
		messages = append(messages, llms.TextParts(msgType, msg.Content))
	}

	messages = append(messages, llms.TextParts(llms.ChatMessageTypeHuman, userMessage))

	return messages
}

func (s *LLMService) GenerateResponseStream(ctx context.Context, agent *shared.AgentConfig, req *shared.ChatStreamRequest, streamFunc func(string), toolEventFunc func(*shared.ToolCallEvent)) error {
	llm, err := s.CreateLLM(agent.Provider)
	if err != nil {
		return fmt.Errorf("creating LLM client: %w", err)
	}

	messages := s.buildMessagesFromContext(agent.SystemPrompt, req.Context, req.Message)

	// Get available tools for this agent
	var toolsList []tools.Tool
	toolsMap := make(map[string]tools.Tool)
	if s.mcpManager != nil {
		agentTools, err := s.mcpManager.GetAgentTools(ctx, agent.ID)
		if err != nil {
			// Log error but continue without tools
			log.Printf("Warning: Failed to get agent tools: %v\n", err)
		} else {
			toolsList = agentTools
			// Create a map for quick tool lookup
			for _, tool := range toolsList {
				toolsMap[tool.Name()] = tool
			}
		}
	}

	return s.generateWithToolSupport(ctx, llm, agent, messages, toolsList, toolsMap, streamFunc, toolEventFunc)
}

func (s *LLMService) buildMessagesFromContext(systemPrompt string, context []shared.ChatContextMessage, userMessage string) []llms.MessageContent {
	var messages []llms.MessageContent

	if systemPrompt != "" {
		messages = append(messages, llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt))
	}

	for _, msg := range context {
		// Skip tool messages - they're for UI display only, not LLM context
		if msg.Role == "tool" {
			continue
		}

		msgType := llms.ChatMessageTypeHuman
		if msg.Role == "assistant" {
			msgType = llms.ChatMessageTypeAI
		}
		messages = append(messages, llms.TextParts(msgType, msg.Content))
	}

	messages = append(messages, llms.TextParts(llms.ChatMessageTypeHuman, userMessage))

	return messages
}

func (s *LLMService) GenerateChatTitle(ctx context.Context, firstMessage string) (string, error) {
	llm, err := s.CreateLLM("openai")
	if err != nil {
		return "", fmt.Errorf("creating LLM client: %w", err)
	}

	prompt := fmt.Sprintf(`Generate a very short, descriptive title (3-5 words max) for a chat conversation that starts with this message: "%s"

The title should:
- Be concise and capture the main topic
- Not include quotes or punctuation
- Be in title case
- Describe what the user is asking about

Examples:
- "How do I deploy?" → "Deployment Help"
- "Fix my React component" → "React Component Fix"
- "Explain machine learning" → "Machine Learning Basics"
- "What's the weather like?" → "Weather Inquiry"

Title:`, firstMessage)

	messages := []llms.MessageContent{
		llms.TextParts(llms.ChatMessageTypeHuman, prompt),
	}

	response, err := llm.GenerateContent(ctx, messages,
		llms.WithModel(string(shared.GPT41Nano)),
		llms.WithTemperature(0.3),
		llms.WithMaxTokens(20),
	)
	if err != nil {
		return "", fmt.Errorf("generating title: %w", err)
	}

	title := strings.TrimSpace(response.Choices[0].Content)
	if len(title) > 50 {
		title = title[:50]
	}
	if title == "" {
		title = "New Chat"
	}

	return title, nil
}

func (s *LLMService) generateWithToolSupport(ctx context.Context, llm llms.Model, agent *shared.AgentConfig, messages []llms.MessageContent, toolsList []tools.Tool, toolsMap map[string]tools.Tool, streamFunc func(string), toolEventFunc func(*shared.ToolCallEvent)) error {
	conversationMessages := messages
	maxIterations := 15

	for iteration := range maxIterations {
		opts := []llms.CallOption{
			llms.WithModel(agent.LLMModel),
			llms.WithTemperature(agent.Temperature),
		}

		// Add tools if available
		if len(toolsList) > 0 {
			llmsTools := s.convertToLLMSTools(toolsList)
			opts = append(opts, llms.WithTools(llmsTools))
		}

		if agent.MaxTokens > 0 {
			opts = append(opts, llms.WithMaxTokens(agent.MaxTokens))
		}

		// Generate content (non-streaming for tool handling)
		content, err := llm.GenerateContent(ctx, conversationMessages, opts...)
		if err != nil {
			return fmt.Errorf("generating content: %w", err)
		}

		if len(content.Choices) == 0 {
			return fmt.Errorf("no content generated")
		}

		choice := content.Choices[0]

		// Check if there are tool calls to execute
		if len(choice.ToolCalls) > 0 {
			// Execute all tool calls
			toolResults := make([]llms.MessageContent, 0)

			for _, toolCall := range choice.ToolCalls {
				result, err := s.executeToolCall(ctx, toolCall, toolsMap, toolEventFunc)
				if err != nil {
					// Continue with error message
					result = fmt.Sprintf("Error executing tool: %v", err)
				}

				// Add iteration progress guidance to encourage conclusion
				progressGuidance := ""
				if iteration >= maxIterations-5 {
					progressGuidance = fmt.Sprintf("\n\n[Iteration %d/%d: Consider summarizing your findings and providing a final response rather than continuing exploration]", iteration+1, maxIterations)
				}
				if iteration >= maxIterations-3 {
					progressGuidance = fmt.Sprintf("\n\n[Iteration %d/%d: You're approaching the iteration limit. Please provide a final response based on the information gathered so far.]", iteration+1, maxIterations)
				}

				// Add tool result to conversation
				toolResults = append(toolResults, llms.MessageContent{
					Role: llms.ChatMessageTypeTool,
					Parts: []llms.ContentPart{
						llms.ToolCallResponse{
							ToolCallID: toolCall.ID,
							Name:       toolCall.FunctionCall.Name,
							Content:    result + progressGuidance,
						},
					},
				})
			}

			// Add assistant message with tool calls
			assistantMsg := llms.MessageContent{
				Role:  llms.ChatMessageTypeAI,
				Parts: []llms.ContentPart{},
			}

			if choice.Content != "" {
				assistantMsg.Parts = append(assistantMsg.Parts, llms.TextPart(choice.Content))
			}

			for _, tc := range choice.ToolCalls {
				assistantMsg.Parts = append(assistantMsg.Parts, llms.ToolCall{
					ID:           tc.ID,
					Type:         tc.Type,
					FunctionCall: tc.FunctionCall,
				})
			}

			conversationMessages = append(conversationMessages, assistantMsg)
			conversationMessages = append(conversationMessages, toolResults...)

			// Send tool batch complete event to indicate all tools in this iteration are done
			if toolEventFunc != nil {
				toolEventFunc(&shared.ToolCallEvent{
					Type: "tool_batch_complete",
				})
			}

			// Continue to next iteration to get final response
			continue
		}

		// No tool calls, stream the final response
		if choice.Content != "" {
			// Stream the content character by character for smooth UX
			for _, char := range choice.Content {
				streamFunc(string(char))
				time.Sleep(10 * time.Millisecond) // Small delay for streaming effect
			}
		}

		return nil
	}

	return fmt.Errorf("maximum tool iterations reached")
}

func (s *LLMService) executeToolCall(ctx context.Context, toolCall llms.ToolCall, toolsMap map[string]tools.Tool, toolEventFunc func(*shared.ToolCallEvent)) (string, error) {
	startTime := time.Now()
	toolName := toolCall.FunctionCall.Name

	// Send tool start event
	if toolEventFunc != nil {
		var args map[string]any
		json.Unmarshal([]byte(toolCall.FunctionCall.Arguments), &args)

		toolEventFunc(&shared.ToolCallEvent{
			Type:      "tool_start",
			CallID:    toolCall.ID,
			ToolName:  toolName,
			Arguments: args,
		})
	}

	// Find the tool
	tool, exists := toolsMap[toolName]
	if !exists {
		err := fmt.Errorf("tool not found: %s", toolName)
		if toolEventFunc != nil {
			toolEventFunc(&shared.ToolCallEvent{
				Type:     "tool_error",
				CallID:   toolCall.ID,
				ToolName: toolName,
				Error:    err.Error(),
				Duration: time.Since(startTime).Milliseconds(),
			})
		}
		return "", err
	}

	// Execute the tool
	result, err := tool.Call(ctx, toolCall.FunctionCall.Arguments)
	duration := time.Since(startTime).Milliseconds()

	if err != nil {
		if toolEventFunc != nil {
			toolEventFunc(&shared.ToolCallEvent{
				Type:     "tool_error",
				CallID:   toolCall.ID,
				ToolName: toolName,
				Error:    err.Error(),
				Duration: duration,
			})
		}
		return "", err
	}

	// Send success event
	if toolEventFunc != nil {
		toolEventFunc(&shared.ToolCallEvent{
			Type:     "tool_result",
			CallID:   toolCall.ID,
			ToolName: toolName,
			Result:   result,
			Duration: duration,
		})
	}

	return result, nil
}

// convertToLLMSTools converts tools.Tool interface to llms.Tool struct
func (s *LLMService) convertToLLMSTools(toolsList []tools.Tool) []llms.Tool {
	llmsTools := make([]llms.Tool, len(toolsList))
	for i, tool := range toolsList {
		llmsTools[i] = llms.Tool{
			Type: "function",
			Function: &llms.FunctionDefinition{
				Name:        tool.Name(),
				Description: tool.Description(),
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"input": map[string]any{
							"type":        "string",
							"description": "JSON input for the tool",
						},
					},
					"required": []string{"input"},
				},
			},
		}
	}
	return llmsTools
}
