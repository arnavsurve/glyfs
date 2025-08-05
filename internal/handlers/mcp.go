package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/arnavsurve/glyfs/internal/services"
	"github.com/arnavsurve/glyfs/internal/shared"
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
	Name             string                 `json:"name" binding:"required"`
	Description      string                 `json:"description"`
	ServerURL        string                 `json:"server_url" binding:"required"`
	ServerType       string                 `json:"server_type" binding:"required,oneof=http sse"`
	Config           shared.MCPServerConfig `json:"config"`
	SensitiveURL     bool                   `json:"sensitive_url"`
	SensitiveHeaders []string               `json:"sensitive_headers"`
}

type UpdateMCPServerRequest struct {
	Name        *string                 `json:"name"`
	Description *string                 `json:"description"`
	ServerURL   *string                 `json:"server_url"`
	Config      *shared.MCPServerConfig `json:"config"`
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

	// Initialize encryption service
	encryptionService, err := services.NewEncryptionService()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to initialize encryption service")
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

	// Handle encryption for sensitive data
	serverURL := req.ServerURL
	if req.SensitiveURL {
		encryptedURL, err := encryptionService.Encrypt(req.ServerURL)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to encrypt URL")
		}
		serverURL = encryptedURL
		req.Config.URL = encryptedURL
	}

	// Encrypt sensitive headers in config
	if len(req.SensitiveHeaders) > 0 && req.Config.Headers != nil {
		configHeaders := make(map[string]any)
		for k, v := range req.Config.Headers {
			configHeaders[k] = v
		}

		encryptedHeaders, err := encryptionService.EncryptSensitiveFields(configHeaders, req.SensitiveHeaders)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to encrypt headers")
		}

		// Convert back to string map
		req.Config.Headers = make(map[string]string)
		for k, v := range encryptedHeaders {
			if str, ok := v.(string); ok {
				req.Config.Headers[k] = str
			}
		}
	}

	// Marshal config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid config format")
	}

	// Marshal sensitive headers list
	sensitiveHeadersJSON, err := json.Marshal(req.SensitiveHeaders)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid sensitive headers format")
	}

	server := shared.MCPServer{
		UserID:           userID,
		Name:             req.Name,
		Description:      req.Description,
		ServerURL:        serverURL,
		ServerType:       req.ServerType,
		Config:           string(configJSON),
		EncryptedURL:     req.SensitiveURL,
		SensitiveHeaders: string(sensitiveHeadersJSON),
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
		LastSeen:    server.LastSeen,
		CreatedAt:   server.CreatedAt,
		UpdatedAt:   server.UpdatedAt,
	}

	return c.JSON(http.StatusCreated, map[string]any{
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
		decryptedServer := server

		// Only decrypt if needed
		if server.EncryptedURL || server.SensitiveHeaders != "" {
			encryptionService, err := services.NewEncryptionService()
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "failed to initialize encryption service")
			}

			decryptedServer, err = h.decryptServerData(server, encryptionService)
			if err != nil {
				// Log the error but continue with the original server data instead of failing
				// This handles cases where encrypted data might be corrupted
				decryptedServer = server
			}
		}

		response[i] = shared.MCPServerResponse{
			ID:          decryptedServer.ID,
			Name:        decryptedServer.Name,
			Description: decryptedServer.Description,
			ServerURL:   decryptedServer.ServerURL,
			ServerType:  decryptedServer.ServerType,
			LastSeen:    decryptedServer.LastSeen,
			CreatedAt:   decryptedServer.CreatedAt,
			UpdatedAt:   decryptedServer.UpdatedAt,
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
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

	decryptedServer := server

	// Only decrypt if needed
	if server.EncryptedURL || server.SensitiveHeaders != "" {
		encryptionService, err := services.NewEncryptionService()
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to initialize encryption service")
		}

		decryptedServer, err = h.decryptServerData(server, encryptionService)
		if err != nil {
			// Log the error but continue with the original server data instead of failing
			// This handles cases where encrypted data might be corrupted
			decryptedServer = server
		}
	}

	// Parse the config for detailed response
	var config shared.MCPServerConfig
	if err := json.Unmarshal([]byte(decryptedServer.Config), &config); err != nil {
		// If config parsing fails, use default config
		config = shared.MCPServerConfig{
			ServerType: decryptedServer.ServerType,
			URL:        decryptedServer.ServerURL,
			Timeout:    30,
			Headers:    make(map[string]string),
		}
	}

	response := shared.MCPServerDetailResponse{
		ID:          decryptedServer.ID,
		Name:        decryptedServer.Name,
		Description: decryptedServer.Description,
		ServerURL:   decryptedServer.ServerURL,
		ServerType:  decryptedServer.ServerType,
		Config:      config,
		LastSeen:    decryptedServer.LastSeen,
		CreatedAt:   decryptedServer.CreatedAt,
		UpdatedAt:   decryptedServer.UpdatedAt,
	}

	return c.JSON(http.StatusOK, map[string]any{
		"server": response,
	})
}

// decryptServerData decrypts sensitive fields in an MCP server
func (h *MCPHandler) decryptServerData(server shared.MCPServer, encryptionService *services.EncryptionService) (shared.MCPServer, error) {
	decryptedServer := server

	// Decrypt URL if it's encrypted
	if server.EncryptedURL {
		decryptedURL, err := encryptionService.Decrypt(server.ServerURL)
		if err != nil {
			return server, err
		}
		decryptedServer.ServerURL = decryptedURL
	}

	// Decrypt sensitive headers in config
	if server.SensitiveHeaders != "" {
		var sensitiveHeaders []string
		if err := json.Unmarshal([]byte(server.SensitiveHeaders), &sensitiveHeaders); err != nil {
			return server, err
		}

		if len(sensitiveHeaders) > 0 {
			var config shared.MCPServerConfig
			if err := json.Unmarshal([]byte(server.Config), &config); err != nil {
				return server, err
			}

			if config.Headers != nil {
				configHeaders := make(map[string]any)
				for k, v := range config.Headers {
					configHeaders[k] = v
				}

				decryptedHeaders, err := encryptionService.DecryptSensitiveFields(configHeaders, sensitiveHeaders)
				if err != nil {
					return server, err
				}

				// Convert back to string map
				config.Headers = make(map[string]string)
				for k, v := range decryptedHeaders {
					if str, ok := v.(string); ok {
						config.Headers[k] = str
					}
				}

				// Update decrypted URL in config if needed
				if server.EncryptedURL {
					config.URL = decryptedServer.ServerURL
				}

				// Marshal updated config back to JSON
				configJSON, err := json.Marshal(config)
				if err != nil {
					return server, err
				}
				decryptedServer.Config = string(configJSON)
			}
		}
	}

	return decryptedServer, nil
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

	updates := make(map[string]any)
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
		LastSeen:    server.LastSeen,
		CreatedAt:   server.CreatedAt,
		UpdatedAt:   server.UpdatedAt,
	}

	return c.JSON(http.StatusOK, map[string]any{
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
		return c.JSON(http.StatusOK, map[string]any{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
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

	return c.JSON(http.StatusOK, map[string]any{
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
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
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

