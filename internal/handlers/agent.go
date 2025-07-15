package handlers

import (
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

	if !req.Model.IsValid() {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model")
	}

	if req.Provider == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "provider is required")
	}

	agent := shared.AgentConfig{
		UserID:       userID,
		Provider:     string(req.Provider),
		LLMModel:     string(req.Model),
		SystemPrompt: req.SystemPrompt,
	}
	if err := h.DB.Create(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create agent")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message":  "Agent created successfully",
		"agent_id": agent.ID,
	})
}

func (h *Handler) HandleAgentInference(c echo.Context) error {
	userId := c.Param("userId")
	if userId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "userId path parameter is required")
	}
	agentId := c.Param("agentId")
	if agentId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	return c.String(http.StatusOK, userId)
}
