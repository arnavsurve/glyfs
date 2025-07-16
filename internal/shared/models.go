package shared

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AgentConfig struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	UserID       uint           `gorm:"not null;uniqueIndex:idx_user_agent_name"`
	Name         string         `gorm:"type:text;not null;uniqueIndex:idx_user_agent_name"`
	Provider     string         `gorm:"type:text;not null"`
	LLMModel     string         `gorm:"type:text;not null"`
	SystemPrompt string         `gorm:"type:text"`
	MaxTokens    int            `gorm:"type:int"`
	Temperature  float64        `gorm:"type:float"`
}

type User struct {
	gorm.Model
	Email        string `gorm:"type:text;not null;unique"`
	PasswordHash []byte `gorm:"type:bytea;not null"`
}

type AgentAPIKey struct {
	gorm.Model
	AgentID  uuid.UUID `gorm:"type:uuid;not null;index"`
	Key      string    `gorm:"type:text;not null;unique;index"`
	LastUsed *time.Time
}
