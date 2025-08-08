package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/arnavsurve/glyfs/internal/db"
	"github.com/arnavsurve/glyfs/internal/handlers"
	planmiddleware "github.com/arnavsurve/glyfs/internal/middleware"
	"github.com/arnavsurve/glyfs/internal/services"
	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	if os.Getenv("ENV") != "production" {
		log.Println("ENV != production. Loading .env ...")
		err := godotenv.Load()
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}

	handlers.InitJWTSecret()
	services.InitEncryptionKey()

	if os.Getenv("ENV") != "production" {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     []string{"http://localhost:5173"},
			AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
			AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
			AllowCredentials: true,
		}))
	}

	e.Use(middleware.CSRFWithConfig(middleware.CSRFConfig{
		TokenLookup:    "header:X-CSRF-Token",
		CookieName:     "_csrf",
		CookiePath:     "/",
		CookieHTTPOnly: false,
		CookieSameSite: http.SameSiteStrictMode,
		Skipper: func(c echo.Context) bool {
			return strings.HasPrefix(c.Path(), "/api/auth/") ||
				strings.HasPrefix(c.Path(), "/api/agents/") && (strings.HasSuffix(c.Path(), "/invoke") || strings.HasSuffix(c.Path(), "/invoke/stream"))
		},
	}))

	db := db.SetupDB()

	mcpManager := services.NewMCPConnectionManager(db)

	settingsHandler, err := handlers.NewSettingsHandler(db)
	if err != nil {
		log.Fatal("Failed to initialize settings handler:", err)
	}

	planMiddleware := planmiddleware.NewPlanMiddleware(db)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable not set")
	}

	h := handlers.Handler{
		DB:              db,
		MCPManager:      mcpManager,
		SettingsHandler: settingsHandler,
		PlanMiddleware:  planMiddleware,
	}

	oauthHandler := handlers.NewOAuthHandler(db, jwtSecret, &h)
	h.OAuthHandler = oauthHandler

	h.StartTokenCleanupWorker(1 * time.Hour)

	go oauthHandler.CleanupExpiredStates()

	staticPath := filepath.Join("cmd", "client", "dist")
	if _, err := os.Stat(staticPath); err == nil {
		e.Static("/assets", filepath.Join(staticPath, "assets"))
		e.File("/", filepath.Join(staticPath, "index.html"))
	}

	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "server is up")
	})

	api := e.Group("/api")

	auth := api.Group("/auth")
	// auth.POST("/signup", func(c echo.Context) error {
	// 	return h.HandleSignup(c)
	// })
	// auth.POST("/login", func(c echo.Context) error {
	// 	return h.HandleLogin(c)
	// })
	auth.POST("/logout", func(c echo.Context) error {
		return h.HandleLogout(c)
	})
	auth.GET("/me", h.JWTMiddleware(func(c echo.Context) error {
		return h.HandleMe(c)
	}))
	auth.POST("/refresh", func(c echo.Context) error {
		return h.HandleRefreshToken(c)
	})

	oauth := auth.Group("/oauth")
	oauth.GET("/github", func(c echo.Context) error {
		return h.OAuthHandler.HandleGitHubLogin(c)
	})
	oauth.GET("/github/callback", func(c echo.Context) error {
		return h.OAuthHandler.HandleGitHubCallback(c)
	})
	oauth.GET("/google", func(c echo.Context) error {
		return h.OAuthHandler.HandleGoogleLogin(c)
	})
	oauth.GET("/google/callback", func(c echo.Context) error {
		return h.OAuthHandler.HandleGoogleCallback(c)
	})
	oauth.GET("/providers", func(c echo.Context) error {
		return h.OAuthHandler.HandleAuthProviders(c)
	})

	// api.POST("/admin/cleanup-tokens", h.JWTMiddleware(func(c echo.Context) error {
	// 	if err := h.CleanupExpiredTokens(); err != nil {
	// 		return echo.NewHTTPError(http.StatusInternalServerError, "failed to cleanup tokens")
	// 	}
	// 	return c.JSON(http.StatusOK, map[string]string{"message": "token cleanup completed"})
	// }))

	protected := api.Group("")
	protected.Use(h.JWTMiddleware)

	protected.GET("/agents", func(c echo.Context) error {
		return h.HandleGetAgents(c)
	})
	protected.POST("/agents", func(c echo.Context) error {
		return h.HandleCreateAgent(c)
	})
	protected.GET("/agents/:agentId", func(c echo.Context) error {
		return h.HandleGetAgent(c)
	})
	protected.PUT("/agents/:agentId", func(c echo.Context) error {
		return h.HandleUpdateAgent(c)
	})
	protected.DELETE("/agents/:agentId", func(c echo.Context) error {
		return h.HandleDeleteAgent(c)
	})
	protected.POST("/agents/:agentId/restore", func(c echo.Context) error {
		return h.HandleRestoreAgent(c)
	})
	protected.POST("/agents/:agentId/chat", func(c echo.Context) error {
		return h.HandleAgentInferenceInternal(c)
	})
	protected.POST("/agents/:agentId/chat/stream", func(c echo.Context) error {
		return h.HandleChatStream(c)
	})
	protected.GET("/agents/:agentId/chat/sessions", func(c echo.Context) error {
		return h.HandleGetChatSessions(c)
	})
	protected.GET("/agents/:agentId/chat/sessions/:sessionId", func(c echo.Context) error {
		return h.HandleGetChatSession(c)
	})
	protected.DELETE("/agents/:agentId/chat/sessions/:sessionId", func(c echo.Context) error {
		return h.HandleDeleteChatSession(c)
	})

	protected.GET("/agents/:agentId/keys", func(c echo.Context) error {
		return h.HandleGetAPIKeys(c)
	})
	protected.POST("/agents/:agentId/keys", func(c echo.Context) error {
		return h.HandleCreateAPIKey(c)
	})
	protected.DELETE("/agents/:agentId/keys/:keyId", func(c echo.Context) error {
		return h.HandleDeleteAPIKey(c)
	})

	mcpHandler := handlers.NewMCPHandler(db, mcpManager, planMiddleware)
	mcpHandler.RegisterMCPRoutes(protected)

	usageHandler := handlers.NewUsageHandler(db)
	usageHandler.RegisterUsageRoutes(protected)

	protected.GET("/user/settings", func(c echo.Context) error {
		return settingsHandler.GetUserSettings(c)
	})
	protected.PUT("/user/settings", func(c echo.Context) error {
		return settingsHandler.UpdateUserSettings(c)
	})

	api.POST("/agents/:agentId/invoke", h.APIKeyMiddleware(func(c echo.Context) error {
		return h.HandleAgentInference(c)
	}))
	api.POST("/agents/:agentId/invoke/stream", h.APIKeyMiddleware(func(c echo.Context) error {
		return h.HandleAgentInferenceStream(c)
	}))

	// Catch-all route for React Router
	if _, err := os.Stat(staticPath); err == nil {
		e.GET("/*", func(c echo.Context) error {
			// Prevent caching of the HTML to ensure React Router gets fresh URLs
			c.Response().Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Response().Header().Set("Pragma", "no-cache")
			c.Response().Header().Set("Expires", "0")

			return c.File(filepath.Join(staticPath, "index.html"))
		})
	}

	go func() {
		for {
			time.Sleep(1 * time.Hour)
			result := h.DB.Where("expires_at < ?", time.Now()).Delete(&shared.RevokedToken{})
			if result.Error != nil {
				log.Printf("Error cleaning up revoked tokens: %v", result.Error)
			} else if result.RowsAffected > 0 {
				log.Printf("Cleaned up %d expired revoked tokens", result.RowsAffected)
			}
		}
	}()

	e.Logger.Fatal(e.Start(":8080"))
}
