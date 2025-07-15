package shared

import (
	"time"

	"gorm.io/gorm"
)

type AgentConfig struct {
	gorm.Model
	UserID       uint    `gorm:"not null;index"`
	Name         string  `gorm:"type:text;not null"`
	Provider     string  `gorm:"type:text;not null"`
	LLMModel     string  `gorm:"type:text;not null"`
	SystemPrompt string  `gorm:"type:text"`
	MaxTokens    int     `gorm:"type:int"`
	Temperature  float64 `gorm:"type:float"`
}

type User struct {
	gorm.Model
	Email        string `gorm:"type:text;not null;unique"`
	PasswordHash []byte `gorm:"type:bytea;not null"`
}

type AgentAPIKey struct {
	gorm.Model
	AgentID  uint   `gorm:"not null;index"`
	Key      string `gorm:"type:text;not null;unique;index"`
	LastUsed *time.Time
}
