package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/arnavsurve/agentplane/internal/db"
	"github.com/arnavsurve/agentplane/internal/handlers"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	if os.Getenv("ENV") != "production" {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{"http://localhost:5173"},
			AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
			AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		}))
	}

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

	protected := api.Group("")
	protected.Use(handlers.JWTMiddleware)

	protected.POST("/agents", func(c echo.Context) error {
		return h.HandleCreateAgent(c)
	})
	protected.POST("/agents/:userId/:agentId", func(c echo.Context) error {
		return h.HandleAgentInference(c)
	})

	// Catch-all route for React Router
	if _, err := os.Stat(staticPath); err == nil {
		e.GET("/*", func(c echo.Context) error {
			return c.File(filepath.Join(staticPath, "index.html"))
		})
	}

	e.Logger.Fatal(e.Start(":8080"))
}
