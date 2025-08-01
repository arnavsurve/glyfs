package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"regexp"
	"sync"
	"time"

	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

var (
	jwtSecret         string
	refreshTokenMutex sync.Mutex
)

func InitJWTSecret() {
	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("environment variable JWT_SECRET is not set")
	}
}

type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

const (
	accessTokenExpiry  = 15 * time.Minute   // Short-lived access token
	refreshTokenExpiry = 7 * 24 * time.Hour // 7 days
)

func (h *Handler) HandleSignup(c echo.Context) error {
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

	accessToken, err := generateJWT(user.ID, user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate access token")
	}

	refreshToken, err := h.createRefreshToken(user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate refresh token")
	}

	SetAuthCookies(c, accessToken, refreshToken)

	return c.JSON(http.StatusCreated, map[string]any{
		"message":    "User created successfully",
		"user_id":    user.ID,
		"user_email": user.Email,
	})
}

func (h *Handler) HandleLogin(c echo.Context) error {
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

	accessToken, err := generateJWT(user.ID, user.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate access token")
	}

	refreshToken, err := h.createRefreshToken(user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate refresh token")
	}

	SetAuthCookies(c, accessToken, refreshToken)

	return c.JSON(http.StatusOK, map[string]any{
		"message":    "Login successful",
		"user_id":    user.ID,
		"user_email": user.Email,
	})
}

func (h *Handler) HandleLogout(c echo.Context) error {
	// Revoke access token
	if cookie, err := c.Cookie("auth_token"); err == nil && cookie.Value != "" {
		token, _ := jwt.ParseWithClaims(cookie.Value, &JWTClaims{}, func(token *jwt.Token) (any, error) {
			return jwtSecret, nil
		})

		if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
			expiresAt := claims.ExpiresAt.Time
			revokedToken := shared.RevokedToken{
				Signature: hex.EncodeToString(token.Signature),
				ExpiresAt: expiresAt,
			}
			h.DB.Create(&revokedToken)
		}
	}

	// Revoke refresh token if present
	if cookie, err := c.Cookie("refresh_token"); err == nil && cookie.Value != "" {
		h.DB.Model(&shared.RefreshToken{}).Where("token = ?", cookie.Value).Update("is_revoked", true)
	}

	clearAuthCookies(c)
	return c.JSON(http.StatusOK, map[string]any{
		"message": "Logged out successfully",
	})
}

func (h *Handler) HandleMe(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	email := c.Get("email").(string)

	// Fetch full user info to include OAuth details
	var user shared.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch user details")
	}

	// Get tier configuration
	tierConfig, exists := shared.TierConfigs[user.Tier]
	if !exists {
		tierConfig = shared.TierConfigs["free"]
	}

	// Count active agents for the user
	var agentCount int64
	h.DB.Model(&shared.AgentConfig{}).Where("user_id = ?", userID).Count(&agentCount)

	response := map[string]any{
		"user_id":       userID,
		"user_email":    email,
		"auth_provider": user.AuthProvider,
		"tier":          user.Tier,
		"tier_limits": map[string]any{
			"agent_limit": tierConfig.AgentLimit,
			"agents_used": int(agentCount),
		},
	}

	// Include optional fields if they exist
	if user.DisplayName != nil {
		response["display_name"] = *user.DisplayName
	}
	if user.AvatarURL != nil {
		response["avatar_url"] = *user.AvatarURL
	}

	return c.JSON(http.StatusOK, response)
}

func (h *Handler) HandleRefreshToken(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		log.Printf("Refresh token error: missing cookie, err=%v", err)
		return echo.NewHTTPError(http.StatusUnauthorized, "refresh token required")
	}

	var refreshToken shared.RefreshToken
	if err := h.DB.Where("token = ? AND is_revoked = false AND expires_at > ?",
		cookie.Value, time.Now()).First(&refreshToken).Error; err != nil {
		log.Printf("Refresh token validation failed: token=%s, err=%v", cookie.Value[:10]+"...", err)
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired refresh token")
	}

	var user shared.User
	if err := h.DB.First(&user, refreshToken.UserID).Error; err != nil {
		log.Printf("User lookup failed for refresh token: user_id=%d, err=%v", refreshToken.UserID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "user not found")
	}

	tx := h.DB.Begin()
	if tx.Error != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}

	// Revoke the current refresh token
	if err := tx.Model(&refreshToken).Update("is_revoked", true).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to revoke current refresh token: id=%d, err=%v", refreshToken.ID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to revoke token")
	}

	newAccessToken, err := generateJWT(user.ID, user.Email)
	if err != nil {
		tx.Rollback()
		log.Printf("JWT generation failed: user_id=%d, err=%v", user.ID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate access token")
	}

	// Generate new refresh token
	newRefreshTokenString, err := generateRefreshToken()
	if err != nil {
		tx.Rollback()
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to generate refresh token")
	}

	// Create new refresh token
	newRefreshTokenRecord := shared.RefreshToken{
		UserID:    user.ID,
		Token:     newRefreshTokenString,
		ExpiresAt: time.Now().Add(refreshTokenExpiry),
		IsRevoked: false,
	}

	if err := tx.Create(&newRefreshTokenRecord).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to create refresh token for user %d: %v", user.ID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create refresh token")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Failed to commit refresh token transaction: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "transaction failed")
	}

	SetAuthCookies(c, newAccessToken, newRefreshTokenString)

	return c.JSON(http.StatusOK, map[string]any{
		"message": "tokens refreshed successfully",
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func generateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (h *Handler) createRefreshToken(userID uint) (string, error) {
	// Use mutex to prevent race conditions for the same user
	refreshTokenMutex.Lock()
	defer refreshTokenMutex.Unlock()

	// Generate token first to fail fast if there's an issue
	tokenString, err := generateRefreshToken()
	if err != nil {
		return "", err
	}

	// Use database transaction to ensure atomicity
	tx := h.DB.Begin()
	if tx.Error != nil {
		return "", tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Revoke all existing refresh tokens for this user
	if err := tx.Model(&shared.RefreshToken{}).Where("user_id = ?", userID).Update("is_revoked", true).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to revoke existing tokens for user %d: %v", userID, err)
		return "", err
	}

	// Create new refresh token
	refreshToken := shared.RefreshToken{
		UserID:    userID,
		Token:     tokenString,
		ExpiresAt: time.Now().Add(refreshTokenExpiry),
		IsRevoked: false,
	}

	if err := tx.Create(&refreshToken).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to create refresh token for user %d: %v", userID, err)
		return "", err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Failed to commit refresh token transaction for user %d: %v", userID, err)
		return "", err
	}

	return tokenString, nil
}

// CleanupExpiredTokens removes expired and revoked tokens from the database
func (h *Handler) CleanupExpiredTokens() error {
	// Delete refresh tokens that are either:
	// 1. Expired (past their expiration date)
	// 2. Revoked (marked as revoked)
	// 3. Very old (created more than 30 days ago as a safety measure)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	result := h.DB.Where(
		"expires_at < ? OR is_revoked = ? OR created_at < ?",
		time.Now(), true, thirtyDaysAgo,
	).Delete(&shared.RefreshToken{})

	if result.Error != nil {
		log.Printf("Failed to cleanup expired tokens: %v", result.Error)
		return result.Error
	}

	log.Printf("Cleaned up %d expired/revoked refresh tokens", result.RowsAffected)

	// Also cleanup revoked JWT tokens that have expired
	result = h.DB.Where("expires_at < ?", time.Now()).Delete(&shared.RevokedToken{})

	if result.Error != nil {
		log.Printf("Failed to cleanup expired revoked tokens: %v", result.Error)
		return result.Error
	}

	log.Printf("Cleaned up %d expired/revoked JWT tokens", result.RowsAffected)

	return nil
}

// StartTokenCleanupWorker starts a background goroutine that periodically cleans up expired tokens
func (h *Handler) StartTokenCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			if err := h.CleanupExpiredTokens(); err != nil {
				log.Printf("Token cleanup worker error: %v", err)
			}
		}
	}()

	log.Printf("Started token cleanup worker with interval: %v", interval)
}

// SetAuthCookies sets authentication cookies for access and refresh tokens
func SetAuthCookies(c echo.Context, accessToken, refreshToken string) {
	accessCookie := &http.Cookie{
		Name:     "auth_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(accessTokenExpiry.Seconds()),
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(accessCookie)

	refreshCookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/", // Make available to all endpoints
		MaxAge:   int(refreshTokenExpiry.Seconds()),
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(refreshCookie)
}

func clearAuthCookies(c echo.Context) {
	accessCookie := &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(accessCookie)

	// Clear refresh token cookie
	refreshCookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(refreshCookie)
}

func (h *Handler) JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cookie, err := c.Cookie("auth_token")
		if err != nil || cookie.Value == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "missing authentication cookie")
		}

		tokenString := cookie.Value

		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid signing method")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil {
			log.Printf("JWT Parse Error: %v\n", err)
			return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
		}

		var count int64
		h.DB.Model(&shared.RevokedToken{}).Where("signature = ?", hex.EncodeToString(token.Signature)).Count(&count)
		if count > 0 {
			return echo.NewHTTPError(http.StatusUnauthorized, "token has been revoked")
		}

		if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
			c.Set("user_id", claims.UserID)
			c.Set("email", claims.Email)
			return next(c)
		}

		return echo.NewHTTPError(http.StatusUnauthorized, "invalid token claims")
	}
}
