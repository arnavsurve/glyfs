package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"gorm.io/gorm"
)

type OAuthHandler struct {
	DB           *gorm.DB
	GitHubConfig *oauth2.Config
	GoogleConfig *oauth2.Config
	JWTSecret    string
	FrontendURL  string
	Handler      *Handler // Reference to main handler for token operations
}

func NewOAuthHandler(db *gorm.DB, jwtSecret string, handler *Handler) *OAuthHandler {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	return &OAuthHandler{
		DB:          db,
		JWTSecret:   jwtSecret,
		FrontendURL: frontendURL,
		Handler:     handler,
		GitHubConfig: &oauth2.Config{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GITHUB_REDIRECT_URL"),
			Scopes:       []string{"read:user", "user:email"},
			Endpoint:     github.Endpoint,
		},
		// Google config will be added later
	}
}

func (h *OAuthHandler) HandleGitHubLogin(c echo.Context) error {
	// Generate state token
	state, err := generateState()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate state")
	}

	// Store state in database
	oauthState := &shared.OAuthState{
		State:       state,
		RedirectURI: h.FrontendURL + "/dashboard",
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(10 * time.Minute),
	}

	if err := h.DB.Create(oauthState).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to store OAuth state")
	}

	// Redirect to GitHub
	authURL := h.GitHubConfig.AuthCodeURL(state)
	return c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *OAuthHandler) HandleGitHubCallback(c echo.Context) error {
	// Parse callback parameters
	code := c.QueryParam("code")
	state := c.QueryParam("state")
	errorParam := c.QueryParam("error")

	// Handle OAuth errors
	if errorParam != "" {
		errorDesc := c.QueryParam("error_description")
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=%s&description=%s", h.FrontendURL, errorParam, errorDesc))
	}

	// Validate state
	var oauthState shared.OAuthState
	err := h.DB.Where("state = ? AND expires_at > ?", state, time.Now()).First(&oauthState).Error
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=invalid_state", h.FrontendURL))
	}

	// Delete used state
	h.DB.Delete(&oauthState)

	// Exchange code for token
	token, err := h.GitHubConfig.Exchange(context.Background(), code)
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=token_exchange_failed", h.FrontendURL))
	}

	// Get user info from GitHub
	client := h.GitHubConfig.Client(context.Background(), token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=github_api_error", h.FrontendURL))
	}
	defer resp.Body.Close()

	var githubUser shared.GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&githubUser); err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=github_api_error", h.FrontendURL))
	}

	// If email is not public, fetch from emails endpoint
	if githubUser.Email == "" {
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailResp.Body.Close()
			var emails []shared.GitHubEmail
			if err := json.NewDecoder(emailResp.Body).Decode(&emails); err == nil {
				for _, email := range emails {
					if email.Primary && email.Verified {
						githubUser.Email = email.Email
						break
					}
				}
			}
		}
	}

	// Ensure we have an email
	if githubUser.Email == "" {
		log.Printf("GitHub user has no email: %+v\n", githubUser)
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=no_email", h.FrontendURL))
	}
	log.Printf("GitHub OAuth successful for user: %s (%s)\n", githubUser.Email, githubUser.Name)

	// Create or update user
	user, err := h.findOrCreateOAuthUser(&githubUser)
	if err != nil {
		log.Printf("OAuth user creation failed: %v\n", err)
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=user_creation_failed", h.FrontendURL))
	}
	log.Printf("OAuth user created/found: %s (ID: %d)\n", user.Email, user.ID)

	// Generate JWT tokens
	accessToken, err := generateJWT(user.ID, user.Email)
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=token_generation_failed", h.FrontendURL))
	}

	refreshToken, err := h.Handler.createRefreshToken(user.ID)
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s/login?error=token_generation_failed", h.FrontendURL))
	}

	// Set cookies manually since setAuthCookies is in user.go
	log.Printf("Setting OAuth cookies for user: %s\n", user.Email)

	accessCookie := &http.Cookie{
		Name:     "auth_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(15 * 60), // 15 minutes in seconds
		HttpOnly: true,
		Secure:   false, // Set to true in production
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(accessCookie)
	log.Printf("Set access token cookie\n")

	refreshCookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		MaxAge:   int(7 * 24 * 60 * 60), // 7 days in seconds
		HttpOnly: true,
		Secure:   false, // Set to true in production
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(refreshCookie)
	log.Printf("Set refresh token cookie\n")

	// Redirect to frontend
	return c.Redirect(http.StatusTemporaryRedirect, oauthState.RedirectURI)
}

func (h *OAuthHandler) findOrCreateOAuthUser(githubUser *shared.GitHubUser) (*shared.User, error) {
	var user shared.User
	oauthID := fmt.Sprintf("%d", githubUser.ID)

	// Try to find existing OAuth user
	err := h.DB.Where("auth_provider = ? AND oauth_id = ?", string(shared.OAuthProviderGitHub), oauthID).First(&user).Error
	if err == nil {
		// Update user info
		user.DisplayName = &githubUser.Name
		user.AvatarURL = &githubUser.AvatarURL
		return &user, h.DB.Save(&user).Error
	}

	// Try to find existing user by email (for linking)
	err = h.DB.Where("email = ?", githubUser.Email).First(&user).Error
	if err == nil {
		// User exists with this email, check if it's a local account
		if user.AuthProvider == shared.AuthProviderLocal {
			// Don't auto-link, require manual linking for security
			return nil, fmt.Errorf("email already exists with password login")
		}
		return &user, nil
	}

	// Create new user
	user = shared.User{
		Email:        githubUser.Email,
		AuthProvider: string(shared.OAuthProviderGitHub),
		OAuthID:      &oauthID,
		DisplayName:  &githubUser.Name,
		AvatarURL:    &githubUser.AvatarURL,
	}

	// Set a random password hash for OAuth users (never used but satisfies any constraints)
	randomPass := make([]byte, 32)
	rand.Read(randomPass)
	hashedPassword, _ := bcrypt.GenerateFromPassword(randomPass, bcrypt.DefaultCost)
	user.PasswordHash = hashedPassword

	return &user, h.DB.Create(&user).Error
}

func (h *OAuthHandler) HandleAuthProviders(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		// Return available providers for unauthenticated users
		return c.JSON(http.StatusOK, shared.AuthProvidersResponse{
			Providers: []shared.AuthProviderInfo{
				{
					ID:          "github",
					Name:        "GitHub",
					DisplayName: "GitHub",
					Connected:   false,
				},
				{
					ID:          "google",
					Name:        "Google",
					DisplayName: "Google",
					Connected:   false,
				},
			},
		})
	}

	// For authenticated users, show which providers are connected
	var user shared.User
	if err := h.DB.First(&user, userID).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch user")
	}

	providers := []shared.AuthProviderInfo{
		{
			ID:          "github",
			Name:        "GitHub",
			DisplayName: "GitHub",
			Connected:   user.AuthProvider == string(shared.OAuthProviderGitHub),
		},
		{
			ID:          "google",
			Name:        "Google",
			DisplayName: "Google",
			Connected:   user.AuthProvider == string(shared.OAuthProviderGoogle),
		},
	}

	return c.JSON(http.StatusOK, shared.AuthProvidersResponse{
		Providers: providers,
	})
}

func generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// Cleanup expired OAuth states periodically
func (h *OAuthHandler) CleanupExpiredStates() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		h.DB.Where("expires_at < ?", time.Now()).Delete(&shared.OAuthState{})
	}
}

