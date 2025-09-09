package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
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
	if err := m.db.WithContext(ctx).First(&server, "id = ?", serverID).Error; err != nil {
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

	// Use individual columns directly from server struct

	var mcpClient *client.Client
	var err error

	switch server.ServerType {
	case "http":
		mcpClient, err = m.createHTTPClient(decryptedServer)
	case "sse":
		mcpClient, err = m.createSSEClient(decryptedServer)
	default:
		return nil, fmt.Errorf("unsupported server type: %s (only http and sse are supported)", server.ServerType)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create MCP client: %w", err)
	}

	adapter, err := langchaingo_mcp_adapter.New(mcpClient)
	if err != nil {
		mcpClient.Close()
		return nil, fmt.Errorf("failed to create MCP adapter: %w", err)
	}

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

func (m *MCPConnectionManager) createHTTPClient(server shared.MCPServer) (*client.Client, error) {
	if server.ServerURL == "" {
		return nil, fmt.Errorf("URL is required for HTTP client")
	}

	timeout := server.Timeout
	if timeout == 0 {
		timeout = 30 // 30 seconds default
	}

	var options []transport.StreamableHTTPCOption

	if len(server.Headers) > 0 {
		options = append(options, transport.WithHTTPHeaders(server.Headers))
	}

	return client.NewStreamableHttpClient(server.ServerURL, options...)
}

func (m *MCPConnectionManager) createSSEClient(server shared.MCPServer) (*client.Client, error) {
	if server.ServerURL == "" {
		return nil, fmt.Errorf("URL is required for SSE client")
	}

	timeout := server.Timeout
	if timeout == 0 {
		timeout = 30 // 30 seconds default
	}

	var options []transport.ClientOption

	if len(server.Headers) > 0 {
		options = append(options, transport.WithHeaders(server.Headers))
	}

	return client.NewSSEMCPClient(server.ServerURL, options...)
}

func (m *MCPConnectionManager) GetAgentTools(ctx context.Context, agentID uuid.UUID) ([]tools.Tool, error) {
	var associations []shared.AgentMCPServer
	if err := m.db.Preload("MCPServer").Where("agent_id = ? AND enabled = ?", agentID, true).Find(&associations).Error; err != nil {
		return nil, fmt.Errorf("failed to get agent MCP servers: %w", err)
	}

	var allTools []tools.Tool
	var errors []error

	for _, assoc := range associations {

		conn, err := m.GetConnection(ctx, assoc.MCPServerID)
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to connect to server %s: %w", assoc.MCPServer.Name, err))
			continue
		}

		for _, tool := range conn.Tools {
			wrappedTool := &ServerTool{
				Tool:       tool,
				ServerID:   assoc.MCPServerID,
				ServerName: assoc.MCPServer.Name,
			}
			allTools = append(allTools, wrappedTool)
		}
	}

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
		if time.Since(conn.LastUsed) > 10*time.Minute {
			conn.Client.Close()
			delete(m.connections, serverID)
			continue
		}

		if conn.Status == StatusError {
			conn.Client.Close()
			delete(m.connections, serverID)
		}
	}
}

func (m *MCPConnectionManager) TestConnection(ctx context.Context, serverID uuid.UUID) error {
	m.CloseConnection(serverID)

	conn, err := m.createConnection(ctx, serverID)
	if err != nil {
		return err
	}

	if len(conn.Tools) == 0 {
		return fmt.Errorf("connection successful but no tools available")
	}

	return nil
}

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

type ServerTool struct {
	tools.Tool
	ServerID   uuid.UUID
	ServerName string
}

func (st *ServerTool) Name() string {
	return fmt.Sprintf("%s_%s", st.ServerName, st.Tool.Name())
}

func (st *ServerTool) Description() string {
	return fmt.Sprintf("[%s] %s", st.ServerName, st.Tool.Description())
}

func (st *ServerTool) Call(ctx context.Context, input string) (string, error) {
	return st.Tool.Call(ctx, input)
}

func (m *MCPConnectionManager) decryptServerData(server shared.MCPServer, encryptionService *EncryptionService) (shared.MCPServer, error) {
	decryptedServer := server

	// Decrypt URL if encrypted
	if server.EncryptedURL {
		decryptedURL, err := encryptionService.Decrypt(server.ServerURL)
		if err != nil {
			log.Printf("Warning: Failed to decrypt URL for server %s (assuming unencrypted): %v", server.ID, err)
		} else {
			decryptedServer.ServerURL = decryptedURL
		}
	}

	// Decrypt sensitive headers if any
	if server.SensitiveHeaders != "" {
		var sensitiveHeaders []string
		if err := json.Unmarshal([]byte(server.SensitiveHeaders), &sensitiveHeaders); err != nil {
			return server, fmt.Errorf("failed to parse sensitive headers: %w", err)
		}

		if len(sensitiveHeaders) > 0 && server.Headers != nil {
			headerMap := make(map[string]interface{})
			for k, v := range server.Headers {
				headerMap[k] = v
			}

			decryptedHeaders, err := encryptionService.DecryptSensitiveFields(headerMap, sensitiveHeaders)
			if err != nil {
				log.Printf("Warning: Failed to decrypt headers for server %s: %v", server.ID, err)
			} else {
				decryptedServer.Headers = make(map[string]string)
				for k, v := range decryptedHeaders {
					if str, ok := v.(string); ok {
						decryptedServer.Headers[k] = str
					}
				}
			}
		}
	}

	return decryptedServer, nil
}
