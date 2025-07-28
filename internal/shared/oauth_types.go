package shared

import "time"

type OAuthProvider string

const (
	OAuthProviderGitHub OAuthProvider = "github"
	OAuthProviderGoogle OAuthProvider = "google"
	AuthProviderLocal   string        = "local"
)

type OAuthConfig struct {
	GitHub GitHubOAuthConfig
	Google GoogleOAuthConfig
}

type GitHubOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

type GitHubUser struct {
	ID        int     `json:"id"`
	Login     string  `json:"login"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	AvatarURL string  `json:"avatar_url"`
	Type      string  `json:"type"`
	SiteAdmin bool    `json:"site_admin"`
	Company   *string `json:"company"`
	Location  *string `json:"location"`
	Bio       *string `json:"bio"`
}

type GitHubEmail struct {
	Email      string `json:"email"`
	Primary    bool   `json:"primary"`
	Verified   bool   `json:"verified"`
	Visibility string `json:"visibility"`
}

type GoogleUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

type OAuthStateData struct {
	State       string
	RedirectURI string
	CreatedAt   time.Time
	ExpiresAt   time.Time
}

type OAuthCallbackParams struct {
	Code  string `query:"code"`
	State string `query:"state"`
	Error string `query:"error"`
}

type OAuthErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
	ErrorURI         string `json:"error_uri"`
}

type GitHubTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

type AuthProviderInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	IconURL     string `json:"icon_url"`
	Connected   bool   `json:"connected"`
}

type AuthProvidersResponse struct {
	Providers []AuthProviderInfo `json:"providers"`
}