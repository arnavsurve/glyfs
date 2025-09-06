package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"github.com/arnavsurve/glyfs/internal/middleware"
	"github.com/arnavsurve/glyfs/internal/services"
	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

func (h *Handler) HandleCreateAgent(c echo.Context) error {
	var req shared.CreateAgentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	if !req.IsValidModel() {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model for the specified provider")
	}

	if req.Provider == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "provider is required")
	}

	if err := h.PlanMiddleware.CheckResourceLimit(userID, middleware.ResourceAgent); err != nil {
		return err
	}

	hasKey, err := h.SettingsHandler.CheckAPIKeyForProvider(userID, string(req.Provider))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to check API key configuration")
	}
	if !hasKey {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Please configure your %s API key in Settings before creating an agent", req.Provider))
	}

	tx := h.DB.Begin()
	if tx.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to start transaction")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	systemPrompt := ""
	if req.SystemPrompt != nil {
		systemPrompt = *req.SystemPrompt
	}

	agent := shared.AgentConfig{
		UserID:       userID,
		Name:         req.Name,
		Provider:     string(req.Provider),
		LLMModel:     req.Model,
		SystemPrompt: systemPrompt,
		MaxTokens:    req.MaxTokens,
		Temperature:  req.Temperature,
	}
	if err := tx.Create(&agent).Error; err != nil {
		tx.Rollback()
		if strings.Contains(err.Error(), "idx_user_agent_name_active") || strings.Contains(err.Error(), "duplicate") {
			return echo.NewHTTPError(http.StatusConflict, "An active agent with this name already exists")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create agent")
	}

	if err := tx.Commit().Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to commit transaction")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message":  "Agent created successfully",
		"agent_id": agent.ID,
	})
}

func (h *Handler) HandleAgentInferenceInternal(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	if agentIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	var req shared.AgentInferenceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Message == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "message is required")
	}

	var agent shared.AgentConfig
	if err := h.DB.First(&agent, agentId).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	apiKey, err := h.SettingsHandler.GetAPIKeyForProvider(userID, agent.Provider)
	if err != nil || apiKey == "" {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Please configure your %s API key in Settings", agent.Provider))
	}

	llmService := services.NewLLMService(h.MCPConnManager)

	response, err := llmService.GenerateResponse(c.Request().Context(), &agent, &req, apiKey)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Failed to generate response: %v", err))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) HandleAgentInference(c echo.Context) error {
	agent, ok := c.Get("agent").(*shared.AgentConfig)
	if !ok {
		return echo.NewHTTPError(http.StatusInternalServerError, "agent context not found")
	}

	var req shared.AgentInferenceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Message == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "message is required")
	}

	var user shared.User
	if err := h.DB.Where("id = ?", agent.UserID).First(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get agent owner")
	}

	apiKey, err := h.SettingsHandler.GetAPIKeyForProvider(agent.UserID, agent.Provider)
	if err != nil || apiKey == "" {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Agent owner has not configured %s API key", agent.Provider))
	}

	llmService := services.NewLLMService(h.MCPConnManager)

	response, err := llmService.GenerateResponse(c.Request().Context(), agent, &req, apiKey)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Failed to generate response: %v", err))
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) HandleAgentInferenceStream(c echo.Context) error {
	agent, ok := c.Get("agent").(*shared.AgentConfig)
	if !ok {
		return echo.NewHTTPError(http.StatusInternalServerError, "agent context not found")
	}

	var req shared.AgentInferenceRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Message == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "message is required")
	}

	var contextMessages []shared.ChatContextMessage
	for i, msg := range req.History {
		contextMessages = append(contextMessages, shared.ChatContextMessage{
			ID:        fmt.Sprintf("history_%d", i),
			Role:      msg.Role,
			Content:   msg.Content,
			CreatedAt: "",
		})
	}

	streamReq := &shared.ChatStreamRequest{
		Message: req.Message,
		Context: contextMessages,
	}

	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("Access-Control-Allow-Origin", "*")
	c.Response().Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	h.sendStreamEvent(c, "metadata", "", map[string]any{
		"agent_id": agent.ID,
	})

	var user shared.User
	if err := h.DB.Where("id = ?", agent.UserID).First(&user).Error; err != nil {
		h.sendStreamEvent(c, "error", "Failed to get agent owner", nil)
		return nil
	}

	apiKey, err := h.SettingsHandler.GetAPIKeyForProvider(agent.UserID, agent.Provider)
	if err != nil || apiKey == "" {
		h.sendStreamEvent(c, "error", fmt.Sprintf("Agent owner has not configured %s API key", agent.Provider), nil)
		return nil
	}

	llmService := services.NewLLMService(h.MCPConnManager)
	fullResponse := ""
	var finalUsage *shared.Usage

	streamFunc := func(chunk string) {
		fullResponse += chunk
		h.sendStreamEvent(c, "token", chunk, nil)
		c.Response().Flush()
	}

	toolEventFunc := func(event *shared.ToolCallEvent) {
		h.sendStreamEvent(c, "tool_event", "", event)
		c.Response().Flush()
	}

	err = llmService.GenerateResponseStream(c.Request().Context(), agent, streamReq, apiKey, streamFunc, toolEventFunc)
	if err != nil {
		h.sendStreamEvent(c, "error", fmt.Sprintf("Failed to generate response: %v", err), nil)
		return nil
	}

	finalUsage = &shared.Usage{
		PromptTokens:     len(req.Message) / 4,
		CompletionTokens: len(fullResponse) / 4,
		TotalTokens:      (len(req.Message) + len(fullResponse)) / 4,
	}

	h.sendStreamEvent(c, "done", "", map[string]any{
		"response": fullResponse,
		"usage":    finalUsage,
	})

	return nil
}

func (h *Handler) HandleUpdateAgent(c echo.Context) error {
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

	var req shared.UpdateAgentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if !req.IsValidModel() {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model for the specified provider")
	}

	var agent shared.AgentConfig
	if err := h.DB.Where("id = ? AND user_id = ?", agentId, userID).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	updates := make(map[string]any)
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Provider != nil {
		updates["provider"] = string(*req.Provider)
	}
	if req.Model != nil {
		updates["llm_model"] = *req.Model
	}
	if req.SystemPrompt != nil {
		updates["system_prompt"] = *req.SystemPrompt
	}
	if req.MaxTokens != nil {
		updates["max_tokens"] = *req.MaxTokens
	}
	if req.Temperature != nil {
		updates["temperature"] = *req.Temperature
	}

	if len(updates) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "No fields to update")
	}

	if err := h.DB.Model(&agent).Updates(updates).Error; err != nil {
		if strings.Contains(err.Error(), "idx_user_agent_name_active") || strings.Contains(err.Error(), "duplicate") {
			return echo.NewHTTPError(http.StatusConflict, "An active agent with this name already exists")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update agent")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"message":  "Agent updated successfully",
		"agent_id": agent.ID,
	})
}

func (h *Handler) HandleGetAgents(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var agents []shared.AgentConfig
	if err := h.DB.Where("user_id = ?", userID).Find(&agents).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve agents")
	}

	var user shared.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user information")
	}

	tierConfig, exists := shared.TierConfigs[user.Tier]
	if !exists {
		tierConfig = shared.TierConfigs["free"]
	}

	resourceCounts, err := h.PlanMiddleware.GetUserResourceCounts(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get resource counts")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"agents": agents,
		"count":  len(agents),
		"tier": map[string]any{
			"name":             user.Tier,
			"agent_limit":      tierConfig.AgentLimit,
			"agents_used":      resourceCounts["agents_used"],
			"mcp_server_limit": tierConfig.MCPServerLimit,
			"mcp_servers_used": resourceCounts["mcp_servers_used"],
			"api_key_limit":    tierConfig.APIKeyLimit,
			"api_keys_used":    resourceCounts["api_keys_used"],
		},
	})
}

func (h *Handler) HandleGetAgent(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	agentIdStr := c.Param("agentId")
	if agentIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	agentId, err := uuid.Parse(agentIdStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agentId format")
	}

	var agent shared.AgentConfig
	if err := h.DB.Where(&shared.AgentConfig{UserID: userID, ID: agentId}).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"agent": agent,
	})
}

func (h *Handler) HandleDeleteAgent(c echo.Context) error {
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

	var agent shared.AgentConfig
	if err := h.DB.Where(&shared.AgentConfig{UserID: userID, ID: agentId}).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	if err := h.DB.Delete(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to delete agent")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"message": "Agent deleted successfully",
	})
}

func (h *Handler) HandleRestoreAgent(c echo.Context) error {
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

	var agent shared.AgentConfig
	if err := h.DB.Unscoped().Where(&shared.AgentConfig{UserID: userID, ID: agentId}).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Agent not found")
	}

	if agent.DeletedAt.Time.IsZero() {
		return echo.NewHTTPError(http.StatusBadRequest, "Agent is not deleted")
	}

	if err := h.DB.Unscoped().Model(&agent).Update("deleted_at", nil).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to restore agent")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"message": "Agent restored successfully",
	})
}

func generateAPIKey() (string, error) {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", fmt.Errorf("generating bytes for agent API key: %w", err)
	}
	return "apk_" + base64.URLEncoding.EncodeToString(randomBytes), nil
}
