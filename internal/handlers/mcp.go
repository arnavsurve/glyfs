package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/arnavsurve/agentplane/internal/services"
	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type MCPHandler struct {
	db         *gorm.DB
	mcpManager *services.MCPConnectionManager
}

func NewMCPHandler(db *gorm.DB, mcpManager *services.MCPConnectionManager) *MCPHandler {
	return &MCPHandler{
		db:         db,
		mcpManager: mcpManager,
	}
}

type CreateMCPServerRequest struct {
	Name        string                     `json:"name" binding:"required"`
	Description string                     `json:"description"`
	ServerURL   string                     `json:"server_url" binding:"required"`
	ServerType  string                     `json:"server_type" binding:"required,oneof=http sse"`
	Config      shared.MCPServerConfig     `json:"config"`
}

type UpdateMCPServerRequest struct {
	Name        *string                    `json:"name"`
	Description *string                    `json:"description"`
	ServerURL   *string                    `json:"server_url"`
	Config      *shared.MCPServerConfig    `json:"config"`
}

// RegisterMCPRoutes registers all MCP-related routes
func (h *MCPHandler) RegisterMCPRoutes(router *echo.Group) {
	mcpGroup := router.Group("/mcp")

	// MCP Server management
	mcpGroup.POST("/servers", h.CreateMCPServer)
	mcpGroup.GET("/servers", h.ListMCPServers)
	mcpGroup.GET("/servers/:id", h.GetMCPServer)
	mcpGroup.PUT("/servers/:id", h.UpdateMCPServer)
	mcpGroup.DELETE("/servers/:id", h.DeleteMCPServer)
	mcpGroup.POST("/servers/:id/test", h.TestMCPServerConnection)
	mcpGroup.GET("/servers/:id/tools", h.GetMCPServerTools)

	// Agent-MCP associations
	mcpGroup.GET("/agents/:agent_id/servers", h.GetAgentMCPServers)
	mcpGroup.POST("/agents/:agent_id/servers/:server_id", h.AssociateAgentMCPServer)
	mcpGroup.DELETE("/agents/:agent_id/servers/:server_id", h.DisassociateAgentMCPServer)
	mcpGroup.PUT("/agents/:agent_id/servers/:server_id/toggle", h.ToggleAgentMCPServer)
}

func (h *MCPHandler) CreateMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var req CreateMCPServerRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Validate server type
	if req.ServerType != "http" && req.ServerType != "sse" {
		return echo.NewHTTPError(http.StatusBadRequest, "server_type must be 'http' or 'sse'")
	}

	// Set default config based on server type
	if req.Config.ServerType == "" {
		req.Config.ServerType = req.ServerType
	}
	if req.Config.URL == "" {
		req.Config.URL = req.ServerURL
	}
	if req.Config.Timeout == 0 {
		req.Config.Timeout = 30
	}

	// Marshal config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid config format")
	}

	server := shared.MCPServer{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		ServerURL:   req.ServerURL,
		ServerType:  req.ServerType,
		Config:      string(configJSON),
		Status:      "inactive",
	}

	if err := h.db.Create(&server).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create MCP server")
	}

	response := shared.MCPServerResponse{
		ID:          server.ID,
		Name:        server.Name,
		Description: server.Description,
		ServerURL:   server.ServerURL,
		ServerType:  server.ServerType,
		Status:      server.Status,
		LastSeen:    server.LastSeen,
		CreatedAt:   server.CreatedAt,
		UpdatedAt:   server.UpdatedAt,
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"server": response,
	})
}

func (h *MCPHandler) ListMCPServers(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	var servers []shared.MCPServer
	if err := h.db.Where("user_id = ?", userID).Find(&servers).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP servers")
	}

	response := make([]shared.MCPServerResponse, len(servers))
	for i, server := range servers {
		response[i] = shared.MCPServerResponse{
			ID:          server.ID,
			Name:        server.Name,
			Description: server.Description,
			ServerURL:   server.ServerURL,
			ServerType:  server.ServerType,
			Status:      server.Status,
			LastSeen:    server.LastSeen,
			CreatedAt:   server.CreatedAt,
			UpdatedAt:   server.UpdatedAt,
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"servers": response,
	})
}

func (h *MCPHandler) GetMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	var server shared.MCPServer
	if err := h.db.Where("id = ? AND user_id = ?", serverID, userID).First(&server).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP server")
	}

	response := shared.MCPServerResponse{
		ID:          server.ID,
		Name:        server.Name,
		Description: server.Description,
		ServerURL:   server.ServerURL,
		ServerType:  server.ServerType,
		Status:      server.Status,
		LastSeen:    server.LastSeen,
		CreatedAt:   server.CreatedAt,
		UpdatedAt:   server.UpdatedAt,
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"server": response,
	})
}

func (h *MCPHandler) UpdateMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	var req UpdateMCPServerRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	var server shared.MCPServer
	if err := h.db.Where("id = ? AND user_id = ?", serverID, userID).First(&server).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP server")
	}

	// Close existing connection if URL or config changes
	shouldReconnect := false

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ServerURL != nil {
		updates["server_url"] = *req.ServerURL
		shouldReconnect = true
	}
	if req.Config != nil {
		configJSON, err := json.Marshal(req.Config)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid config format")
		}
		updates["config"] = string(configJSON)
		shouldReconnect = true
	}

	if err := h.db.Model(&server).Updates(updates).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update MCP server")
	}

	// Close connection if needed to force reconnection
	if shouldReconnect {
		h.mcpManager.CloseConnection(serverID)
	}

	// Fetch updated server
	if err := h.db.Where("id = ?", serverID).First(&server).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch updated server")
	}

	response := shared.MCPServerResponse{
		ID:          server.ID,
		Name:        server.Name,
		Description: server.Description,
		ServerURL:   server.ServerURL,
		ServerType:  server.ServerType,
		Status:      server.Status,
		LastSeen:    server.LastSeen,
		CreatedAt:   server.CreatedAt,
		UpdatedAt:   server.UpdatedAt,
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"server": response,
	})
}

func (h *MCPHandler) DeleteMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	// Close any existing connections
	h.mcpManager.CloseConnection(serverID)

	// Delete all agent associations first
	if err := h.db.Where("mcp_server_id = ?", serverID).Delete(&shared.AgentMCPServer{}).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete agent associations")
	}

	// Delete the server
	result := h.db.Where("id = ? AND user_id = ?", serverID, userID).Delete(&shared.MCPServer{})
	if result.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete MCP server")
	}

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "MCP server deleted successfully"})
}

func (h *MCPHandler) TestMCPServerConnection(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	// Verify server belongs to user
	var server shared.MCPServer
	if err := h.db.Where("id = ? AND user_id = ?", serverID, userID).First(&server).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP server")
	}

	// Test connection
	ctx := context.Background()
	if err := h.mcpManager.TestConnection(ctx, serverID); err != nil {
		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Connection successful",
	})
}

func (h *MCPHandler) GetMCPServerTools(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	serverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	// Verify server belongs to user
	var server shared.MCPServer
	if err := h.db.Where("id = ? AND user_id = ?", serverID, userID).First(&server).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP server")
	}

	// Get available tools
	ctx := context.Background()
	tools, err := h.mcpManager.GetServerTools(ctx, serverID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"tools": tools,
		"count": len(tools),
	})
}

func (h *MCPHandler) GetAgentMCPServers(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	agentID, err := uuid.Parse(c.Param("agent_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agent ID")
	}

	// Verify agent belongs to user
	var agent shared.AgentConfig
	if err := h.db.Where("id = ? AND user_id = ?", agentID, userID).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "agent not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch agent")
	}

	var associations []shared.AgentMCPServer
	if err := h.db.Preload("MCPServer").Where("agent_id = ?", agentID).Find(&associations).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch agent MCP servers")
	}

	response := make([]shared.AgentMCPServerResponse, len(associations))
	for i, assoc := range associations {
		response[i] = shared.AgentMCPServerResponse{
			ServerID:   assoc.MCPServerID,
			ServerName: assoc.MCPServer.Name,
			Enabled:    assoc.Enabled,
			Status:     assoc.MCPServer.Status,
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"servers": response,
	})
}

func (h *MCPHandler) AssociateAgentMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	agentID, err := uuid.Parse(c.Param("agent_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agent ID")
	}
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	// Verify both agent and server belong to user
	var agent shared.AgentConfig
	if err := h.db.Where("id = ? AND user_id = ?", agentID, userID).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "agent not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch agent")
	}

	var server shared.MCPServer
	if err := h.db.Where("id = ? AND user_id = ?", serverID, userID).First(&server).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "MCP server not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch MCP server")
	}

	// Create or update association
	association := shared.AgentMCPServer{
		AgentID:     agentID,
		MCPServerID: serverID,
		Enabled:     true,
	}

	// Use UPSERT logic
	if err := h.db.Where("agent_id = ? AND mcp_server_id = ?", agentID, serverID).
		Assign(shared.AgentMCPServer{Enabled: true}).
		FirstOrCreate(&association).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create association")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Agent associated with MCP server successfully"})
}

func (h *MCPHandler) DisassociateAgentMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	agentID, err := uuid.Parse(c.Param("agent_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agent ID")
	}
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	// Verify agent belongs to user
	var agent shared.AgentConfig
	if err := h.db.Where("id = ? AND user_id = ?", agentID, userID).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "agent not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch agent")
	}

	// Delete association
	result := h.db.Where("agent_id = ? AND mcp_server_id = ?", agentID, serverID).Delete(&shared.AgentMCPServer{})
	if result.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to delete association")
	}

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "association not found")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Agent disassociated from MCP server successfully"})
}

func (h *MCPHandler) ToggleAgentMCPServer(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	agentID, err := uuid.Parse(c.Param("agent_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid agent ID")
	}
	serverID, err := uuid.Parse(c.Param("server_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid server ID")
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Verify agent belongs to user
	var agent shared.AgentConfig
	if err := h.db.Where("id = ? AND user_id = ?", agentID, userID).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return echo.NewHTTPError(http.StatusNotFound, "agent not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to fetch agent")
	}

	// Update association
	result := h.db.Model(&shared.AgentMCPServer{}).
		Where("agent_id = ? AND mcp_server_id = ?", agentID, serverID).
		Update("enabled", req.Enabled)

	if result.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update association")
	}

	if result.RowsAffected == 0 {
		return echo.NewHTTPError(http.StatusNotFound, "association not found")
	}

	status := "disabled"
	if req.Enabled {
		status = "enabled"
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Association " + status + " successfully"})
}