package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"

	"github.com/arnavsurve/agentplane/internal/services"
	"github.com/arnavsurve/agentplane/internal/shared"
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

	tx := h.DB.Begin()
	if tx.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to start transaction")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	agent := shared.AgentConfig{
		UserID:       userID,
		Name:         req.Name,
		Provider:     string(req.Provider),
		LLMModel:     req.Model,
		SystemPrompt: req.SystemPrompt,
		MaxTokens:    req.MaxTokens,
		Temperature:  req.Temperature,
	}
	if err := tx.Create(&agent).Error; err != nil {
		tx.Rollback()
		if strings.Contains(err.Error(), "idx_user_agent_name") || strings.Contains(err.Error(), "duplicate") {
			return echo.NewHTTPError(http.StatusConflict, "Agent name already exists")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create agent")
	}

	apiKey, err := generateAPIKey()
	if err != nil {
		tx.Rollback()
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate agent API key")
	}

	keyHash := sha256.Sum256([]byte(apiKey))
	agentAPIKey := shared.AgentAPIKey{
		AgentID: agent.ID,
		Key:     hex.EncodeToString(keyHash[:]),
	}
	if err := tx.Create(&agentAPIKey).Error; err != nil {
		tx.Rollback()
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create agent API key")
	}

	if err := tx.Commit().Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to commit transaction")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message":  "Agent created successfully",
		"agent_id": agent.ID,
		"api_key":  apiKey,
	})
}

func (h *Handler) HandleAgentInference(c echo.Context) error {
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

	llmService := services.NewLLMService()

	response, err := llmService.GenerateResponse(c.Request().Context(), &agent, &req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Failed to generate response: %v", err))
	}

	return c.JSON(http.StatusOK, response)
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
		if strings.Contains(err.Error(), "idx_user_agent_name") || strings.Contains(err.Error(), "duplicate") {
			return echo.NewHTTPError(http.StatusConflict, "Agent name already exists")
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

	return c.JSON(http.StatusOK, map[string]any{
		"agents": agents,
		"count":  len(agents),
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

func validateAPIKey(providedKey string, storedHash string) bool {
	keyHash := sha256.Sum256([]byte(providedKey))
	return hex.EncodeToString(keyHash[:]) == storedHash
}
