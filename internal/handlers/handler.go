package handlers

import (
	"gorm.io/gorm"
	"github.com/arnavsurve/glyfs/internal/services"
)

type Handler struct {
	DB               *gorm.DB
	MCPManager       *services.MCPConnectionManager
	SettingsHandler  *SettingsHandler
	OAuthHandler     *OAuthHandler
}
