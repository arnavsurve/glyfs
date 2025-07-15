package shared

import "gorm.io/gorm"

type AgentConfig struct {
	gorm.Model
	UserID       uint   `gorm:"not null;index"`
	Provider     string `gorm:"type:text;not null"`
	LLMModel     string `gorm:"type:text;not null"`
	SystemPrompt string `gorm:"type:text"`
}

type User struct {
	gorm.Model
	Email        string `gorm:"type:text;not null;unique"`
	PasswordHash []byte `gorm:"type:bytea;not null"`
}
