package db

import (
	"github.com/arnavsurve/agentplane/internal/shared"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupDB() *gorm.DB {
	dsn := "host=localhost user=agentplane password=agentplane dbname=agentplane port=5433"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect to database")
	}
	db.AutoMigrate(&shared.AgentConfig{}, &shared.AgentAPIKey{}, &shared.User{})

	return db
}
