package main

import (
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"time"

	"github.com/arnavsurve/agentplane/internal/db"
	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

const jwtSecret = "secret-key-change-this-in-production"

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
	h := Handler{DB: db}

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
		return h.handleSignup(c)
	})
	auth.POST("/login", func(c echo.Context) error {
		return h.handleLogin(c)
	})

	protected := api.Group("")
	protected.Use(jwtMiddleware)

	protected.POST("/agents", func(c echo.Context) error {
		return h.handleCreateAgent(c)
	})
	protected.POST("/agents/:userId/:agentId", func(c echo.Context) error {
		return h.handleAgentInference(c)
	})

	// Catch-all route for React Router
	if _, err := os.Stat(staticPath); err == nil {
		e.GET("/*", func(c echo.Context) error {
			return c.File(filepath.Join(staticPath, "index.html"))
		})
	}

	e.Logger.Fatal(e.Start(":8080"))
}

func (h *Handler) handleSignup(c echo.Context) error {
	var req shared.CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "email is required")
	}

	if !isValidEmail(req.Email) {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid email format")
	}

	if req.Password == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "password is required")
	}

	if len(req.Password) < 8 {
		return echo.NewHTTPError(http.StatusBadRequest, "password must be at least 8 characters")
	}

	var existingUser shared.User
	if err := h.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return echo.NewHTTPError(http.StatusConflict, "user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to hash password")
	}

	user := shared.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create user")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message": "User created successfully",
		"user_id": user.ID,
	})
}

func (h *Handler) handleLogin(c echo.Context) error {
	var req shared.LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	if req.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "email is required")
	}

	if req.Password == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "password is required")
	}

	var user shared.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(req.Password)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid credentials")
	}

	token, err := generateJWT(user.ID, user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate token")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"message": "Login successful",
		"token":   token,
		"user_id": user.ID,
	})
}

func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

func generateJWT(userID uint, email string) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func jwtMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "missing authorization header")
		}

		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid authorization header format")
		}

		tokenString := authHeader[7:]

		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid signing method")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
		}

		if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
			c.Set("user_id", claims.UserID)
			c.Set("email", claims.Email)
			return next(c)
		}

		return echo.NewHTTPError(http.StatusUnauthorized, "invalid token claims")
	}
}

func (h *Handler) handleCreateAgent(c echo.Context) error {
	var req shared.CreateAgentRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request format")
	}

	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	if !req.Model.IsValid() {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid model")
	}

	if req.Provider == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "provider is required")
	}

	agent := shared.AgentConfig{
		UserID:       userID,
		Provider:     string(req.Provider),
		LLMModel:     string(req.Model),
		SystemPrompt: req.SystemPrompt,
	}
	if err := h.DB.Create(&agent).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create agent")
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"message":  "Agent created successfully",
		"agent_id": agent.ID,
	})
}

func (h *Handler) handleAgentInference(c echo.Context) error {
	userId := c.Param("userId")
	if userId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "userId path parameter is required")
	}
	agentId := c.Param("agentId")
	if agentId == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "agentId path parameter is required")
	}

	return c.String(http.StatusOK, userId)
}
