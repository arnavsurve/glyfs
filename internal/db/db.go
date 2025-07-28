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

	// Create partial unique index for agent names (only for non-deleted agents)
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_user_agent_name_active 
		ON agent_configs(user_id, name) 
		WHERE deleted_at IS NULL
	`).Error; err != nil {
		log.Printf("Warning: Failed to create partial unique index: %v", err)
	}

	// Drop the old unique index if it exists
	if err := db.Exec(`DROP INDEX IF EXISTS idx_user_agent_name`).Error; err != nil {
		log.Printf("Warning: Failed to drop old unique index: %v", err)
	}

	return db
}
