package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/arnavsurve/agentplane/internal/services"
	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// HandleChatStream handles streaming chat requests
func (h *Handler) HandleChatStream(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	if agentIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var req shared.ChatStreamRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Message == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "message is required")
	}

	// Find the agent
	var agent shared.AgentConfig
	if err := h.DB.Where("id = ? AND user_id = ?", agentId, userID).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	// Get or create chat session
	session, err := h.getOrCreateChatSession(agentId, userID, req.SessionID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Failed to get chat session: %v", err))
	}

	// Load conversation history if session exists
	var conversationHistory []shared.ChatMessage
	if session.ID != uuid.Nil {
		if err := h.DB.Where("session_id = ?", session.ID).
			Order("created_at ASC").Find(&conversationHistory).Error; err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to load conversation history")
		}
	}

	// Convert database history to context format
	var contextMessages []shared.ChatContextMessage
	if len(conversationHistory) > 0 {
		for _, msg := range conversationHistory {
			contextMessages = append(contextMessages, shared.ChatContextMessage{
				ID:        msg.ID.String(),
				Role:      msg.Role,
				Content:   msg.Content,
				CreatedAt: msg.CreatedAt.Format("2006-01-02T15:04:05.000000Z07:00"),
			})
		}
		req.Context = contextMessages
	} else if req.Context == nil {
		req.Context = []shared.ChatContextMessage{}
	}

	// Save user message
	userMessage := shared.ChatMessage{
		SessionID: session.ID,
		Role:      "user",
		Content:   req.Message,
		Metadata:  "{}",
	}
	if err := h.DB.Create(&userMessage).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save user message")
	}

	// Set headers for SSE
	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("Access-Control-Allow-Origin", "*")
	c.Response().Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	// Send initial event
	h.sendStreamEvent(c, "metadata", "", map[string]any{
		"session_id": session.ID,
		"message_id": userMessage.ID,
	})

	// Create assistant message to accumulate response
	assistantMessage := shared.ChatMessage{
		SessionID: session.ID,
		Role:      "assistant",
		Content:   "",
		Metadata:  "{}",
	}
	if err := h.DB.Create(&assistantMessage).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create assistant message")
	}

	// Stream the response
	llmService := services.NewLLMService(h.MCPManager)
	fullResponse := ""

	streamFunc := func(chunk string) {
		fullResponse += chunk
		h.sendStreamEvent(c, "token", chunk, nil)
		c.Response().Flush()
	}

	toolEventFunc := func(event *shared.ToolCallEvent) {
		// Save tool call as a message for persistence
		toolMessage := shared.ChatMessage{
			SessionID: session.ID,
			Role:      "tool",
			Content:   "", // We'll set this based on the event type
			Metadata:  "",
		}

		// Set content and metadata based on tool event type
		switch event.Type {
		case "tool_start":
			toolMessage.Content = fmt.Sprintf("🔧 Executing tool: %s", event.ToolName)
			metadataBytes, _ := json.Marshal(event)
			toolMessage.Metadata = string(metadataBytes)
		case "tool_result":
			toolMessage.Content = fmt.Sprintf("✅ Tool completed: %s", event.ToolName)
			metadataBytes, _ := json.Marshal(event)
			toolMessage.Metadata = string(metadataBytes)
		case "tool_error":
			toolMessage.Content = fmt.Sprintf("❌ Tool failed: %s", event.ToolName)
			metadataBytes, _ := json.Marshal(event)
			toolMessage.Metadata = string(metadataBytes)
		}

		// Save to database
		h.DB.Create(&toolMessage)

		// Send real-time event
		h.sendStreamEvent(c, "tool_event", "", event)
		c.Response().Flush()
	}

	err = llmService.GenerateResponseStream(c.Request().Context(), &agent, &req, streamFunc, toolEventFunc)
	if err != nil {
		h.sendStreamEvent(c, "error", fmt.Sprintf("Failed to generate response: %v", err), nil)
		return nil
	}

	// Update the assistant message with the full response
	assistantMessage.Content = fullResponse
	h.DB.Save(&assistantMessage)

	// Generate title for new sessions
	fmt.Printf("Session title before generation: '%s'\n", session.Title)
	if session.Title == "New Chat" {
		title, err := llmService.GenerateChatTitle(c.Request().Context(), req.Message)
		if err != nil {
			fmt.Printf("Error generating title with LLM: %v, falling back to simple title\n", err)
			title = h.generateChatTitle(req.Message)
		} else {
			fmt.Printf("Generated title with LLM: '%s' for message: '%s'\n", title, req.Message)
		}
		
		if title != "" && title != "New Chat" {
			session.Title = title
			fmt.Printf("Updating session title to: '%s'\n", title)
			if err := h.DB.Save(&session).Error; err != nil {
				fmt.Printf("Error saving session title: %v\n", err)
			}
		}
	}

	// Send completion event
	h.sendStreamEvent(c, "done", "", map[string]any{
		"message_id": assistantMessage.ID,
		"content":    fullResponse,
	})

	return nil
}

// HandleGetChatSessions returns all chat sessions for an agent
func (h *Handler) HandleGetChatSessions(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	if agentIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var sessions []shared.ChatSession
	if err := h.DB.Where("agent_id = ? AND user_id = ?", agentId, userID).
		Order("updated_at DESC").Find(&sessions).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve chat sessions")
	}

	var response []shared.ChatSessionResponse
	for _, session := range sessions {
		response = append(response, shared.ChatSessionResponse{
			ID:        session.ID,
			Title:     session.Title,
			AgentID:   session.AgentID,
			CreatedAt: session.CreatedAt,
			UpdatedAt: session.UpdatedAt,
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"sessions": response,
		"count":    len(response),
	})
}

// HandleGetChatSession returns a specific chat session with messages
func (h *Handler) HandleGetChatSession(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	sessionIdStr := c.Param("sessionId")

	if agentIdStr == "" || sessionIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId and sessionId path parameters are required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	sessionId, err := uuid.Parse(sessionIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid sessionId format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var session shared.ChatSession
	if err := h.DB.Where("id = ? AND agent_id = ? AND user_id = ?", sessionId, agentId, userID).
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).First(&session).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Chat session not found")
	}

	response := shared.ChatSessionResponse{
		ID:        session.ID,
		Title:     session.Title,
		AgentID:   session.AgentID,
		CreatedAt: session.CreatedAt,
		UpdatedAt: session.UpdatedAt,
		Messages:  session.Messages,
	}

	return c.JSON(http.StatusOK, response)
}

// HandleDeleteChatSession soft deletes a chat session
func (h *Handler) HandleDeleteChatSession(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	sessionIdStr := c.Param("sessionId")

	if agentIdStr == "" || sessionIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId and sessionId path parameters are required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	sessionId, err := uuid.Parse(sessionIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid sessionId format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	// Find the session to ensure it exists and belongs to the user
	var session shared.ChatSession
	if err := h.DB.Where("id = ? AND agent_id = ? AND user_id = ?", sessionId, agentId, userID).First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "Chat session not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to find chat session")
	}

	// Soft delete the session (GORM will automatically set deleted_at)
	if err := h.DB.Delete(&session).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete chat session")
	}

	return c.NoContent(http.StatusNoContent)
}

// Helper functions
func (h *Handler) sendStreamEvent(c echo.Context, eventType, content string, data any) {
	event := shared.ChatStreamEvent{
		Type:    eventType,
		Content: content,
		Data:    data,
	}

	jsonData, _ := json.Marshal(event)
	fmt.Fprintf(c.Response(), "data: %s\n\n", jsonData)
}

func (h *Handler) getOrCreateChatSession(agentId uuid.UUID, userID uint, sessionID *uuid.UUID) (*shared.ChatSession, error) {
	if sessionID != nil {
		var session shared.ChatSession
		if err := h.DB.Where("id = ? AND agent_id = ? AND user_id = ?", *sessionID, agentId, userID).First(&session).Error; err == nil {
			return &session, nil
		}
	}

	// Create new session
	session := shared.ChatSession{
		AgentID: agentId,
		UserID:  userID,
		Title:   "New Chat",
	}

	if err := h.DB.Create(&session).Error; err != nil {
		return nil, err
	}

	return &session, nil
}

func (h *Handler) generateChatTitle(firstMessage string) string {
	title := strings.TrimSpace(firstMessage)
	if len(title) > 50 {
		title = title[:50] + "..."
	}
	if title == "" {
		title = "New Chat"
	}
	return title
}

