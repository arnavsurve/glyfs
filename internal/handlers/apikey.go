package handlers

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

func (h *Handler) APIKeyMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "missing authorization header")
		}

		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid authorization header format")
		}

		apiKey := authHeader[7:]
		if !strings.HasPrefix(apiKey, "apk_") {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid API key format")
		}

		keyHash := sha256.Sum256([]byte(apiKey))
		hashedKey := hex.EncodeToString(keyHash[:])

		var apiKeyRecord shared.AgentAPIKey
		if err := h.DB.Where("key = ? AND is_active = true", hashedKey).First(&apiKeyRecord).Error; err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid API key")
		}

		var agent shared.AgentConfig
		if err := h.DB.First(&agent, apiKeyRecord.AgentID).Error; err != nil {
			return echo.NewHTTPError(http.StatusNotFound, "agent not found")
		}

		now := time.Now()
		h.DB.Model(&apiKeyRecord).Update("last_used", &now)

		c.Set("agent_id", agent.ID)
		c.Set("agent", &agent)
		c.Set("api_key_id", apiKeyRecord.ID)

		return next(c)
	}
}

func (h *Handler) ValidateAPIKey(providedKey, storedHash string) bool {
	keyHash := sha256.Sum256([]byte(providedKey))
	computedHash := hex.EncodeToString(keyHash[:])
	return subtle.ConstantTimeCompare([]byte(computedHash), []byte(storedHash)) == 1
}

func (h *Handler) HandleGetAPIKeys(c echo.Context) error {
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
	if err := h.DB.Where("id = ? AND user_id = ?", agentId, userID).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "agent not found")
	}

	var apiKeys []shared.AgentAPIKey
	if err := h.DB.Where("agent_id = ? AND is_active = true", agentId).Find(&apiKeys).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to retrieve API keys")
	}

	type APIKeyResponse struct {
		ID        uint       `json:"id"`
		Name      string     `json:"name"`
		CreatedAt time.Time  `json:"created_at"`
		LastUsed  *time.Time `json:"last_used"`
		IsActive  bool       `json:"is_active"`
	}

	var response []APIKeyResponse
	for _, key := range apiKeys {
		response = append(response, APIKeyResponse{
			ID:        key.ID,
			Name:      key.Name,
			CreatedAt: key.CreatedAt,
			LastUsed:  key.LastUsed,
			IsActive:  key.IsActive,
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"api_keys": response,
		"count":    len(response),
	})
}

func (h *Handler) HandleCreateAPIKey(c echo.Context) error {
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

	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request format")
	}

	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name is required")
	}

	var agent shared.AgentConfig
	if err := h.DB.Where("id = ? AND user_id = ?", agentId, userID).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "agent not found")
	}

	apiKey, err := generateAPIKey()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate API key")
	}

	keyHash := sha256.Sum256([]byte(apiKey))
	agentAPIKey := shared.AgentAPIKey{
		AgentID:  agentId,
		Key:      hex.EncodeToString(keyHash[:]),
		Name:     req.Name,
		IsActive: true,
	}

	if err := h.DB.Create(&agentAPIKey).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create API key")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message":    "API key created successfully",
		"api_key":    apiKey,
		"key_id":     agentAPIKey.ID,
		"name":       agentAPIKey.Name,
		"created_at": agentAPIKey.CreatedAt,
	})
}

func (h *Handler) HandleDeleteAPIKey(c echo.Context) error {
	agentIdStr := c.Param("agentId")
	keyIdStr := c.Param("keyId")

	if agentIdStr == "" || keyIdStr == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId and keyId path parameters are required")
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
	if err := h.DB.Where("id = ? AND user_id = ?", agentId, userID).First(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "agent not found")
	}

	var apiKey shared.AgentAPIKey
	if err := h.DB.Where("id = ? AND agent_id = ?", keyIdStr, agentId).First(&apiKey).Error; err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "API key not found")
	}

	if err := h.DB.Model(&apiKey).Update("is_active", false).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to revoke API key")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"message": "API key revoked successfully",
	})
}

