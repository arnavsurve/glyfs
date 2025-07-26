package handlers

import (
	"net/http"
	"strings"

	"github.com/arnavsurve/agentplane/internal/services"
	"github.com/arnavsurve/agentplane/internal/shared"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	db                *gorm.DB
	encryptionService *services.EncryptionService
}

func NewSettingsHandler(db *gorm.DB) (*SettingsHandler, error) {
	encryptionService, err := services.NewEncryptionService()
	if err != nil {
		return nil, err
	}

	return &SettingsHandler{
		db:                db,
		encryptionService: encryptionService,
	}, nil
}

// GetUserSettings retrieves the current user's settings with masked API keys
func (h *SettingsHandler) GetUserSettings(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var settings shared.UserSettings
	err := h.db.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return empty settings if none exist
			return c.JSON(http.StatusOK, shared.UserSettingsResponse{})
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve settings")
	}

	// Decrypt and mask API keys
	response := shared.UserSettingsResponse{}

	if settings.AnthropicAPIKey != "" {
		decrypted, err := h.encryptionService.Decrypt(settings.AnthropicAPIKey)
		if err == nil && decrypted != "" {
			response.AnthropicAPIKey = maskAPIKey(decrypted)
		}
	}

	if settings.OpenAIAPIKey != "" {
		decrypted, err := h.encryptionService.Decrypt(settings.OpenAIAPIKey)
		if err == nil && decrypted != "" {
			response.OpenAIAPIKey = maskAPIKey(decrypted)
		}
	}

	if settings.GeminiAPIKey != "" {
		decrypted, err := h.encryptionService.Decrypt(settings.GeminiAPIKey)
		if err == nil && decrypted != "" {
			response.GeminiAPIKey = maskAPIKey(decrypted)
		}
	}

	return c.JSON(http.StatusOK, response)
}

// UpdateUserSettings updates the current user's API keys
func (h *SettingsHandler) UpdateUserSettings(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "User not authenticated")
	}

	var req shared.UpdateUserSettingsRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// Find or create settings
	var settings shared.UserSettings
	err := h.db.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			settings = shared.UserSettings{UserID: userID}
		} else {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to retrieve settings")
		}
	}

	// Update and encrypt API keys
	if req.AnthropicAPIKey != nil {
		if *req.AnthropicAPIKey == "" {
			settings.AnthropicAPIKey = ""
		} else {
			// Validate Anthropic API key format
			if !strings.HasPrefix(*req.AnthropicAPIKey, "sk-ant-") {
				return echo.NewHTTPError(http.StatusBadRequest, "Invalid Anthropic API key format")
			}
			encrypted, err := h.encryptionService.Encrypt(*req.AnthropicAPIKey)
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to encrypt API key")
			}
			settings.AnthropicAPIKey = encrypted
		}
	}

	if req.OpenAIAPIKey != nil {
		if *req.OpenAIAPIKey == "" {
			settings.OpenAIAPIKey = ""
		} else {
			// Validate OpenAI API key format
			if !strings.HasPrefix(*req.OpenAIAPIKey, "sk-") {
				return echo.NewHTTPError(http.StatusBadRequest, "Invalid OpenAI API key format")
			}
			encrypted, err := h.encryptionService.Encrypt(*req.OpenAIAPIKey)
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to encrypt API key")
			}
			settings.OpenAIAPIKey = encrypted
		}
	}

	if req.GeminiAPIKey != nil {
		if *req.GeminiAPIKey == "" {
			settings.GeminiAPIKey = ""
		} else {
			// Gemini API keys don't have a specific prefix, just validate length
			if len(*req.GeminiAPIKey) < 20 {
				return echo.NewHTTPError(http.StatusBadRequest, "Invalid Gemini API key format")
			}
			encrypted, err := h.encryptionService.Encrypt(*req.GeminiAPIKey)
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to encrypt API key")
			}
			settings.GeminiAPIKey = encrypted
		}
	}

	// Save settings
	if err := h.db.Save(&settings).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save settings")
	}

	// Return updated settings (masked)
	return h.GetUserSettings(c)
}

// Helper function to mask API keys for display
func maskAPIKey(key string) string {
	if len(key) < 8 {
		return "***"
	}
	// Show first 7 characters and last 4 characters
	return key[:7] + "..." + key[len(key)-4:]
}

// CheckAPIKeyForProvider checks if user has configured API key for the given provider
func (h *SettingsHandler) CheckAPIKeyForProvider(userID uint, provider string) (bool, error) {
	var settings shared.UserSettings
	err := h.db.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, err
	}

	switch provider {
	case string(shared.Anthropic):
		return settings.AnthropicAPIKey != "", nil
	case string(shared.OpenAI):
		return settings.OpenAIAPIKey != "", nil
	case string(shared.Google):
		return settings.GeminiAPIKey != "", nil
	default:
		return false, nil
	}
}

// GetAPIKeyForProvider retrieves and decrypts the API key for a given provider
func (h *SettingsHandler) GetAPIKeyForProvider(userID uint, provider string) (string, error) {
	var settings shared.UserSettings
	err := h.db.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		return "", err
	}

	var encryptedKey string
	switch provider {
	case string(shared.Anthropic):
		encryptedKey = settings.AnthropicAPIKey
	case string(shared.OpenAI):
		encryptedKey = settings.OpenAIAPIKey
	case string(shared.Google):
		encryptedKey = settings.GeminiAPIKey
	default:
		return "", nil
	}

	if encryptedKey == "" {
		return "", nil
	}

	return h.encryptionService.Decrypt(encryptedKey)
}