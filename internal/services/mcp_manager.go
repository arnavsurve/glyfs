package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/google/uuid"
	"github.com/i2y/langchaingo-mcp-adapter"
	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/tmc/langchaingo/tools"
	"gorm.io/gorm"
)

type MCPConnectionManager struct {
	connections map[uuid.UUID]*MCPConnection
	mutex       sync.RWMutex
	db          *gorm.DB
}

type MCPConnection struct {
	ServerID uuid.UUID
	Server   *shared.MCPServer
	Client   *client.Client
	Adapter  *langchaingo_mcp_adapter.MCPAdapter
	Tools    []tools.Tool
	LastUsed time.Time
	Status   ConnectionStatus
	Error    error
}

type ConnectionStatus string

const (
	StatusConnected    ConnectionStatus = "connected"
	StatusDisconnected ConnectionStatus = "disconnected"
	StatusError        ConnectionStatus = "error"
)

func NewMCPConnectionManager(db *gorm.DB) *MCPConnectionManager {
	manager := &MCPConnectionManager{
		connections: make(map[uuid.UUID]*MCPConnection),
		db:          db,
	}

	// Start background health checker
	go manager.healthChecker()

	return manager
}

func (m *MCPConnectionManager) GetConnection(ctx context.Context, serverID uuid.UUID) (*MCPConnection, error) {
	m.mutex.RLock()
	conn, exists := m.connections[serverID]
	m.mutex.RUnlock()

	if exists && conn.Status == StatusConnected {
		conn.LastUsed = time.Now()
		return conn, nil
	}

	return m.createConnection(ctx, serverID)
}

func (m *MCPConnectionManager) createConnection(ctx context.Context, serverID uuid.UUID) (*MCPConnection, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if conn, exists := m.connections[serverID]; exists && conn.Status == StatusConnected {
		return conn, nil
	}

	var server shared.MCPServer
	if err := m.db.First(&server, "id = ?", serverID).Error; err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	decryptedServer := server

	needsDecryption := server.EncryptedURL || server.SensitiveHeaders != ""

	if needsDecryption {
		encryptionService, err := NewEncryptionService()
		if err != nil {
			return nil, fmt.Errorf("failed to initialize encryption service: %w", err)
		}

		decryptedServer, err = m.decryptServerData(server, encryptionService)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt server data: %w", err)
		}
	}

	var config shared.MCPServerConfig
	if err := json.Unmarshal([]byte(decryptedServer.Config), &config); err != nil {
		return nil, fmt.Errorf("invalid server config: %w", err)
	}

	var mcpClient *client.Client
	var err error

	switch server.ServerType {
	case "http":
		mcpClient, err = m.createHTTPClient(config)
	case "sse":
		mcpClient, err = m.createSSEClient(config)
	default:
		return nil, fmt.Errorf("unsupported server type: %s (only http and sse are supported)", server.ServerType)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create MCP client: %w", err)
	}

	// Create adapter
	adapter, err := langchaingo_mcp_adapter.New(mcpClient)
	if err != nil {
		mcpClient.Close()
		return nil, fmt.Errorf("failed to create MCP adapter: %w", err)
	}

	// Get available tools
	tools, err := adapter.Tools()
	if err != nil {
		mcpClient.Close()
		return nil, fmt.Errorf("failed to get tools: %w", err)
	}

	connection := &MCPConnection{
		ServerID: serverID,
		Server:   &server,
		Client:   mcpClient,
		Adapter:  adapter,
		Tools:    tools,
		LastUsed: time.Now(),
		Status:   StatusConnected,
	}

	m.connections[serverID] = connection

	return connection, nil
}

func (m *MCPConnectionManager) createHTTPClient(config shared.MCPServerConfig) (*client.Client, error) {
	if config.URL == "" {
		return nil, fmt.Errorf("URL is required for HTTP client")
	}

	// Set default timeout if not specified
	if config.Timeout == 0 {
		config.Timeout = 30 // 30 seconds default
	}

	// Prepare options
	var options []transport.StreamableHTTPCOption

	// Add headers if provided
	if len(config.Headers) > 0 {
		options = append(options, transport.WithHTTPHeaders(config.Headers))
	}

	return client.NewStreamableHttpClient(config.URL, options...)
}

func (m *MCPConnectionManager) createSSEClient(config shared.MCPServerConfig) (*client.Client, error) {
	if config.URL == "" {
		return nil, fmt.Errorf("URL is required for SSE client")
	}

	// Set default timeout if not specified
	if config.Timeout == 0 {
		config.Timeout = 30 // 30 seconds default
	}

	// Prepare options
	var options []transport.ClientOption

	// Add headers if provided
	if len(config.Headers) > 0 {
		options = append(options, transport.WithHeaders(config.Headers))
	}

	// Create SSE client
	return client.NewSSEMCPClient(config.URL, options...)
}

func (m *MCPConnectionManager) GetAgentTools(ctx context.Context, agentID uuid.UUID) ([]tools.Tool, error) {
	// Get all MCP servers for this agent
	var associations []shared.AgentMCPServer
	if err := m.db.Preload("MCPServer").Where("agent_id = ? AND enabled = ?", agentID, true).Find(&associations).Error; err != nil {
		return nil, fmt.Errorf("failed to get agent MCP servers: %w", err)
	}

	var allTools []tools.Tool
	var errors []error

	for _, assoc := range associations {

		conn, err := m.GetConnection(ctx, assoc.MCPServerID)
		if err != nil {
			// Log error but continue with other servers
			errors = append(errors, fmt.Errorf("failed to connect to server %s: %w", assoc.MCPServer.Name, err))
			continue
		}

		// Add tools with server name prefix to avoid conflicts
		for _, tool := range conn.Tools {
			// Create a wrapped tool that includes server context
			wrappedTool := &ServerTool{
				Tool:       tool,
				ServerID:   assoc.MCPServerID,
				ServerName: assoc.MCPServer.Name,
			}
			allTools = append(allTools, wrappedTool)
		}
	}

	// If we have errors but also some tools, log errors but return tools
	if len(errors) > 0 && len(allTools) == 0 {
		return nil, fmt.Errorf("failed to connect to any MCP servers: %v", errors)
	}

	return allTools, nil
}

func (m *MCPConnectionManager) CloseConnection(serverID uuid.UUID) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if conn, exists := m.connections[serverID]; exists {
		conn.Client.Close()
		delete(m.connections, serverID)
	}
}

func (m *MCPConnectionManager) healthChecker() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.checkConnections()
	}
}

func (m *MCPConnectionManager) checkConnections() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	for serverID, conn := range m.connections {
		// Remove connections not used for 10 minutes
		if time.Since(conn.LastUsed) > 10*time.Minute {
			conn.Client.Close()
			delete(m.connections, serverID)
			continue
		}

		// TODO: Implement health check ping for HTTP/SSE connections
		// For now, assume connection is healthy if no error
		if conn.Status == StatusError {
			conn.Client.Close()
			delete(m.connections, serverID)
		}
	}
}


// TestConnection tests if we can connect to an MCP server
func (m *MCPConnectionManager) TestConnection(ctx context.Context, serverID uuid.UUID) error {
	// Close any existing connection first
	m.CloseConnection(serverID)

	// Try to create a new connection
	conn, err := m.createConnection(ctx, serverID)
	if err != nil {
		return err
	}

	// Test that we can get tools
	if len(conn.Tools) == 0 {
		return fmt.Errorf("connection successful but no tools available")
	}

	return nil
}

// GetServerTools returns available tools for a specific server
func (m *MCPConnectionManager) GetServerTools(ctx context.Context, serverID uuid.UUID) ([]string, error) {
	conn, err := m.GetConnection(ctx, serverID)
	if err != nil {
		return nil, err
	}

	toolNames := make([]string, len(conn.Tools))
	for i, tool := range conn.Tools {
		toolNames[i] = tool.Name()
	}

	return toolNames, nil
}

// ServerTool wraps a tool with server context information
type ServerTool struct {
	tools.Tool
	ServerID   uuid.UUID
	ServerName string
}

func (st *ServerTool) Name() string {
	// Prefix tool name with server name to avoid conflicts
	return fmt.Sprintf("%s_%s", st.ServerName, st.Tool.Name())
}

func (st *ServerTool) Description() string {
	return fmt.Sprintf("[%s] %s", st.ServerName, st.Tool.Description())
}

// Implement the Call method to maintain tool interface
func (st *ServerTool) Call(ctx context.Context, input string) (string, error) {
	return st.Tool.Call(ctx, input)
}

// decryptServerData decrypts sensitive fields in an MCP server
func (m *MCPConnectionManager) decryptServerData(server shared.MCPServer, encryptionService *EncryptionService) (shared.MCPServer, error) {
	decryptedServer := server

	// Decrypt URL if it's encrypted
	var decryptedURL string
	urlDecrypted := false
	if server.EncryptedURL {
		var err error
		decryptedURL, err = encryptionService.Decrypt(server.ServerURL)
		if err != nil {
			return server, fmt.Errorf("failed to decrypt URL: %w", err)
		}
		decryptedServer.ServerURL = decryptedURL
		urlDecrypted = true
	}

	// Parse config to update with decrypted data
	var config shared.MCPServerConfig
	if err := json.Unmarshal([]byte(server.Config), &config); err != nil {
		return server, fmt.Errorf("failed to parse config: %w", err)
	}

	// Update URL in config if it was decrypted
	if urlDecrypted {
		config.URL = decryptedURL
	}

	// Decrypt sensitive headers in config if they exist
	if server.SensitiveHeaders != "" {
		var sensitiveHeaders []string
		if err := json.Unmarshal([]byte(server.SensitiveHeaders), &sensitiveHeaders); err != nil {
			return server, fmt.Errorf("failed to parse sensitive headers: %w", err)
		}

		if len(sensitiveHeaders) > 0 && config.Headers != nil {
			configHeaders := make(map[string]interface{})
			for k, v := range config.Headers {
				configHeaders[k] = v
			}

			decryptedHeaders, err := encryptionService.DecryptSensitiveFields(configHeaders, sensitiveHeaders)
			if err != nil {
				return server, fmt.Errorf("failed to decrypt headers: %w", err)
			}

			// Convert back to string map
			config.Headers = make(map[string]string)
			for k, v := range decryptedHeaders {
				if str, ok := v.(string); ok {
					config.Headers[k] = str
				}
			}
		}
	}

	// Marshal updated config back to JSON
	configJSON, err := json.Marshal(config)
	if err != nil {
		return server, fmt.Errorf("failed to marshal config: %w", err)
	}
	decryptedServer.Config = string(configJSON)

	return decryptedServer, nil
}
