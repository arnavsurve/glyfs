package db

import (
	"log"
	"os"

	"github.com/arnavsurve/agentplane/internal/shared"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupDB() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect to database")
	}
	db.AutoMigrate(
		&shared.AgentConfig{},
		&shared.AgentAPIKey{},
		&shared.User{},
		&shared.UserSettings{},
		&shared.RefreshToken{},
		&shared.RevokedToken{},
		&shared.ChatSession{},
		&shared.ChatMessage{},
		&shared.MCPServer{},
		&shared.AgentMCPServer{},
	)

	return db
}
