package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/arnavsurve/agentplane/internal/db"
	"github.com/arnavsurve/agentplane/internal/handlers"
	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	handlers.InitJWTSecret()

	if os.Getenv("ENV") != "production" {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     []string{"http://localhost:5173"},
			AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
			AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
			AllowCredentials: true, // Allow cookies to be sent with CORS requests
		}))
	}

	e.Use(middleware.CSRFWithConfig(middleware.CSRFConfig{
		TokenLookup:    "header:X-CSRF-Token",
		CookieName:     "_csrf",
		CookiePath:     "/",
		CookieHTTPOnly: false,
		CookieSameSite: http.SameSiteStrictMode,
		Skipper: func(c echo.Context) bool {
			return c.Path() == "/api/auth/me" || 
				   c.Path() == "/api/auth/refresh" ||
				   strings.HasPrefix(c.Path(), "/api/agents/") && strings.HasSuffix(c.Path(), "/invoke") ||
				   strings.HasPrefix(c.Path(), "/api/agents/") && strings.HasSuffix(c.Path(), "/stream")
		},
	}))

	db := db.SetupDB()
	h := handlers.Handler{DB: db}

	// Serve static files from React build
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
	auth.POST("/signup", func(c echo.Context) error {
		return h.HandleSignup(c)
	})
	auth.POST("/login", func(c echo.Context) error {
		return h.HandleLogin(c)
	})
	auth.POST("/logout", func(c echo.Context) error {
		return h.HandleLogout(c)
	})
	auth.GET("/me", h.JWTMiddleware(func(c echo.Context) error {
		return h.HandleMe(c)
	}))
	auth.POST("/refresh", func(c echo.Context) error {
		return h.HandleRefreshToken(c)
	})

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

	// API key management routes
	protected.GET("/agents/:agentId/keys", func(c echo.Context) error {
		return h.HandleGetAPIKeys(c)
	})
	protected.POST("/agents/:agentId/keys", func(c echo.Context) error {
		return h.HandleCreateAPIKey(c)
	})
	protected.DELETE("/agents/:agentId/keys/:keyId", func(c echo.Context) error {
		return h.HandleDeleteAPIKey(c)
	})

	// Public API key authenticated route
	api.POST("/agents/:agentId/invoke", h.APIKeyMiddleware(func(c echo.Context) error {
		return h.HandleAgentInference(c)
	}))

	// Catch-all route for React Router
	if _, err := os.Stat(staticPath); err == nil {
		e.GET("/*", func(c echo.Context) error {
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
