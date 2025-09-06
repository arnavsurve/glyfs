package handlers

import (
	"github.com/arnavsurve/glyfs/internal/middleware"
	"github.com/arnavsurve/glyfs/internal/services"
	"gorm.io/gorm"
)

type Handler struct {
	DB              *gorm.DB
	MCPConnManager  *services.MCPConnectionManager
	SettingsHandler *SettingsHandler
	OAuthHandler    *OAuthHandler
	PlanMiddleware  *middleware.PlanMiddleware
}
