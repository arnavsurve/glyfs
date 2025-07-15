package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/arnavsurve/agentplane/internal/shared"
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
	agentId := c.Param("agentId")
	if agentId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	return c.String(http.StatusOK, agentId)
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
