package shared

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentConfig struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	UserID       uint           `gorm:"not null" json:"user_id"`
	Name         string         `gorm:"type:text;not null" json:"name"`
	Provider     string         `gorm:"type:text;not null" json:"provider"`
	LLMModel     string         `gorm:"type:text;not null" json:"llm_model"`
	SystemPrompt string         `gorm:"type:text" json:"system_prompt"`
	MaxTokens    int            `gorm:"type:int" json:"max_tokens"`
	Temperature  float64        `gorm:"type:float" json:"temperature"`
}

type User struct {
	gorm.Model
	Email         string     `gorm:"type:text;not null;unique" json:"email"`
	PasswordHash  []byte     `gorm:"type:bytea" json:"-"` // Never serialize password hash - nullable for OAuth users
	AuthProvider  string     `gorm:"type:text;default:'local'" json:"auth_provider"`
	OAuthID       *string    `gorm:"type:text" json:"-"` // OAuth provider user ID
	AvatarURL     *string    `gorm:"type:text" json:"avatar_url"`
	DisplayName   *string    `gorm:"type:text" json:"display_name"`
	Tier          string     `gorm:"type:text;default:'free'" json:"tier"`
	TierUpdatedAt *time.Time `json:"tier_updated_at,omitempty"`
}

type UserSettings struct {
	gorm.Model
	UserID          uint   `gorm:"uniqueIndex;not null" json:"user_id"`
	User            User   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"-"`
	AnthropicAPIKey string `gorm:"type:text" json:"-"` // Encrypted, never serialize
	OpenAIAPIKey    string `gorm:"type:text" json:"-"` // Encrypted, never serialize
	GeminiAPIKey    string `gorm:"type:text" json:"-"` // Encrypted, never serialize
}

type AgentAPIKey struct {
	gorm.Model
	AgentID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"agent_id"`
	Key      string     `gorm:"type:text;not null;unique;index" json:"-"` // Never serialize actual key
	Name     string     `gorm:"type:text;not null" json:"name"`
	LastUsed *time.Time `json:"last_used,omitempty"`
	IsActive bool       `gorm:"default:true" json:"is_active"`
}

type RefreshToken struct {
	gorm.Model
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"type:text;not null;unique;index" json:"-"` // Never serialize token
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	IsRevoked bool      `gorm:"default:false" json:"is_revoked"`
}

type RevokedToken struct {
	gorm.Model
	Signature string    `gorm:"type:text;not null;unique;index" json:"signature"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
}

type OAuthState struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	State       string         `gorm:"type:text;not null;unique;index" json:"state"`
	RedirectURI string         `gorm:"type:text" json:"redirect_uri"`
	CreatedAt   time.Time      `json:"created_at"`
	ExpiresAt   time.Time      `gorm:"not null" json:"expires_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

type ChatSession struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	AgentID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"agent_id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Title     string         `gorm:"type:text;not null" json:"title"`

	// Relationships
	Agent    AgentConfig   `gorm:"foreignKey:AgentID;references:ID" json:"agent"`
	Messages []ChatMessage `gorm:"foreignKey:SessionID;references:ID" json:"messages,omitempty"`
}

type ChatMessage struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	SessionID uuid.UUID `gorm:"type:uuid;not null;index" json:"session_id"`
	Role      string    `gorm:"type:text;not null" json:"role"` // "user" or "assistant"
	Content   string    `gorm:"type:text;not null" json:"content"`
	Metadata  string    `gorm:"type:jsonb" json:"metadata,omitempty"`

	// Relationships
	Session ChatSession `gorm:"foreignKey:SessionID;references:ID" json:"session"`
}

// Chat API Types
type ChatContextMessage struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type ChatStreamRequest struct {
	Message   string               `json:"message"`
	SessionID *uuid.UUID           `json:"session_id,omitempty"`
	Context   []ChatContextMessage `json:"context,omitempty"`
}

type ChatStreamEvent struct {
	Type    string `json:"type"`    // "token", "done", "error", "metadata"
	Content string `json:"content"` // Token content or error message
	Data    any    `json:"data"`    // Additional metadata
}

type ChatSessionResponse struct {
	ID        uuid.UUID     `json:"id"`
	Title     string        `json:"title"`
	AgentID   uuid.UUID     `json:"agent_id"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
	Messages  []ChatMessage `json:"messages,omitempty"`
}

type MCPServer struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Name        string         `gorm:"type:text;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	ServerURL   string         `gorm:"type:text;not null" json:"server_url"`
	ServerType  string         `gorm:"type:text;not null" json:"server_type"` // "sse", "http"
	Config      string         `gorm:"type:jsonb" json:"config"`              // JSON config
	LastSeen    *time.Time     `json:"last_seen,omitempty"`

	// Encryption metadata
	EncryptedURL     bool   `gorm:"default:false" json:"encrypted_url"` // Whether ServerURL is encrypted
	SensitiveHeaders string `gorm:"type:text" json:"sensitive_headers"` // JSON array of sensitive header names

	// Relationships
	User            User             `gorm:"foreignKey:UserID;references:ID" json:"user"`
	AgentMCPServers []AgentMCPServer `gorm:"foreignKey:MCPServerID;references:ID" json:"agent_mcp_servers,omitempty"`
}

type AgentMCPServer struct {
	ID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	AgentID     uuid.UUID `gorm:"type:uuid;not null;index" json:"agent_id"`
	MCPServerID uuid.UUID `gorm:"type:uuid;not null;index" json:"mcp_server_id"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`

	// Relationships
	Agent     AgentConfig `gorm:"foreignKey:AgentID;references:ID" json:"agent"`
	MCPServer MCPServer   `gorm:"foreignKey:MCPServerID;references:ID" json:"mcp_server"`
}

// MCP Server Configuration Types
type MCPServerConfig struct {
	ServerType string            `json:"server_type"`
	Env        map[string]string `json:"env,omitempty"`         // Environment variables
	URL        string            `json:"url,omitempty"`         // For HTTP
	Headers    map[string]string `json:"headers,omitempty"`     // For HTTP
	Timeout    int               `json:"timeout,omitempty"`     // Timeout in seconds
	MaxRetries int               `json:"max_retries,omitempty"` // Max retry attempts
}

// API Response Types
type MCPServerResponse struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	ServerURL   string     `json:"server_url"`
	ServerType  string     `json:"server_type"`
	LastSeen    *time.Time `json:"last_seen,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type AgentMCPServerResponse struct {
	ServerID   uuid.UUID `json:"server_id"`
	ServerName string    `json:"server_name"`
	Enabled    bool      `json:"enabled"`
}

// Usage tracking types
type UsageMetric struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at"`
	UserID           uint      `gorm:"not null;index" json:"user_id"`
	AgentID          uuid.UUID `gorm:"type:uuid;not null;index" json:"agent_id"`
	SessionID        *uuid.UUID `gorm:"type:uuid;index" json:"session_id,omitempty"`
	MessageID        *uuid.UUID `gorm:"type:uuid;index" json:"message_id,omitempty"`
	Provider         string    `gorm:"type:text;not null" json:"provider"`
	Model            string    `gorm:"type:text;not null" json:"model"`
	PromptTokens     int       `gorm:"not null" json:"prompt_tokens"`
	CompletionTokens int       `gorm:"not null" json:"completion_tokens"`
	TotalTokens      int       `gorm:"not null" json:"total_tokens"`
	CostEstimate     *float64  `json:"cost_estimate,omitempty"` // Future use

	// Relationships
	User    User        `gorm:"foreignKey:UserID;references:ID" json:"user"`
	Agent   AgentConfig `gorm:"foreignKey:AgentID;references:ID" json:"agent"`
	Session *ChatSession `gorm:"foreignKey:SessionID;references:ID" json:"session,omitempty"`
	Message *ChatMessage `gorm:"foreignKey:MessageID;references:ID" json:"message,omitempty"`
}

// Tool calling related types
type ToolCallEvent struct {
	Type      string         `json:"type"` // "tool_start", "tool_result", "tool_error", "tool_batch_complete"
	CallID    string         `json:"call_id,omitempty"`
	ToolName  string         `json:"tool_name,omitempty"`
	Arguments map[string]any `json:"arguments,omitempty"`
	Result    string         `json:"result,omitempty"`
	Error     string         `json:"error,omitempty"`
	Duration  int64          `json:"duration_ms,omitempty"`
}
