package handlers

import (
	"gorm.io/gorm"
	"github.com/arnavsurve/glyfs/internal/services"
	"github.com/arnavsurve/glyfs/internal/middleware"
)

type Handler struct {
	DB               *gorm.DB
	MCPManager       *services.MCPConnectionManager
	SettingsHandler  *SettingsHandler
	OAuthHandler     *OAuthHandler
	PlanMiddleware   *middleware.PlanMiddleware
}
