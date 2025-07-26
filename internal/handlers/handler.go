package handlers

import (
	"gorm.io/gorm"
	"github.com/arnavsurve/agentplane/internal/services"
)

type Handler struct {
	DB               *gorm.DB
	MCPManager       *services.MCPConnectionManager
	SettingsHandler  *SettingsHandler
}
