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
		&shared.OAuthState{},
		&shared.ChatSession{},
		&shared.ChatMessage{},
		&shared.MCPServer{},
		&shared.AgentMCPServer{},
	)

	// Add OAuth columns to users table if they don't exist
	if err := db.Exec(`
		ALTER TABLE users 
		ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local',
		ADD COLUMN IF NOT EXISTS oauth_id TEXT,
		ADD COLUMN IF NOT EXISTS avatar_url TEXT,
		ADD COLUMN IF NOT EXISTS display_name TEXT
	`).Error; err != nil {
		log.Printf("Warning: Failed to add OAuth columns: %v", err)
	}

	// Make password_hash nullable for OAuth users
	if err := db.Exec(`
		ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL
	`).Error; err != nil {
		log.Printf("Warning: Failed to make password_hash nullable: %v", err)
	}

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

	// Create unique index for OAuth providers (only for OAuth users)
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider 
		ON users(auth_provider, oauth_id) 
		WHERE auth_provider != 'local'
	`).Error; err != nil {
		log.Printf("Warning: Failed to create OAuth provider unique index: %v", err)
	}

	return db
}
