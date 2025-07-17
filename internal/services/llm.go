package services

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
)

type LLMService struct{}

func NewLLMService() *LLMService {
	return &LLMService{}
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

	opts := []llms.CallOption{
		llms.WithModel(agent.LLMModel),
		llms.WithTemperature(agent.Temperature),
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

func (s *LLMService) GenerateResponseStream(ctx context.Context, agent *shared.AgentConfig, req *shared.ChatStreamRequest, streamFunc func(string)) error {
	llm, err := s.CreateLLM(agent.Provider)
	if err != nil {
		return fmt.Errorf("creating LLM client: %w", err)
	}

	messages := s.buildMessagesFromContext(agent.SystemPrompt, req.Context, req.Message)

	opts := []llms.CallOption{
		llms.WithModel(agent.LLMModel),
		llms.WithTemperature(agent.Temperature),
		llms.WithStreamingFunc(func(ctx context.Context, chunk []byte) error {
			streamFunc(string(chunk))
			return nil
		}),
	}

	if agent.MaxTokens > 0 {
		opts = append(opts, llms.WithMaxTokens(agent.MaxTokens))
	}

	_, err = llm.GenerateContent(ctx, messages, opts...)
	if err != nil {
		return fmt.Errorf("generating streaming content: %w", err)
	}

	return nil
}

func (s *LLMService) buildMessagesFromContext(systemPrompt string, context []shared.ChatContextMessage, userMessage string) []llms.MessageContent {
	var messages []llms.MessageContent

	if systemPrompt != "" {
		messages = append(messages, llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt))
	}

	for _, msg := range context {
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
	llm, err := s.CreateLLM("anthropic")
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
		llms.WithModel("claude-3-5-haiku-20241022"),
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
