package middleware

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type PlanMiddleware struct {
	DB    *gorm.DB
	cache map[uint]*userTierCache
	mutex sync.RWMutex
}

type userTierCache struct {
	tier       string
	tierConfig shared.TierLimits
}

type ResourceType string

const (
	ResourceAgent     ResourceType = "agent"
	ResourceMCPServer ResourceType = "mcp_server"
	ResourceAPIKey    ResourceType = "api_key"
)

func NewPlanMiddleware(db *gorm.DB) *PlanMiddleware {
	return &PlanMiddleware{
		DB:    db,
		cache: make(map[uint]*userTierCache),
	}
}

// CheckResourceLimit verifies if the user can create more of a specific resource type
func (pm *PlanMiddleware) CheckResourceLimit(userID uint, resourceType ResourceType) error {
	// Get user tier configuration (with caching)
	tierConfig, tier, err := pm.getUserTierConfig(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user tier information")
	}

	// Count existing resources based on type
	currentCount, err := pm.countUserResources(userID, resourceType)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Failed to count user %s", resourceType))
	}

	// Get the appropriate limit
	var limit int
	var resourceName string
	switch resourceType {
	case ResourceAgent:
		limit = tierConfig.AgentLimit
		resourceName = "agents"
	case ResourceMCPServer:
		limit = tierConfig.MCPServerLimit
		resourceName = "MCP servers"
	case ResourceAPIKey:
		limit = tierConfig.APIKeyLimit
		resourceName = "API keys"
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Unknown resource type")
	}

	// Check if limit is exceeded
	if currentCount >= limit {
		return echo.NewHTTPError(http.StatusForbidden, fmt.Sprintf(
			"%s limit reached. Your %s tier allows %d %s. Please upgrade to create more %s.",
			resourceName, tier, limit, resourceName, resourceName,
		))
	}

	return nil
}

// getUserTierConfig gets user tier configuration with caching
func (pm *PlanMiddleware) getUserTierConfig(userID uint) (shared.TierLimits, string, error) {
	// Check cache first
	pm.mutex.RLock()
	cached, exists := pm.cache[userID]
	pm.mutex.RUnlock()

	if exists {
		return cached.tierConfig, cached.tier, nil
	}

	// Cache miss - fetch from database
	var user shared.User
	if err := pm.DB.First(&user, userID).Error; err != nil {
		return shared.TierLimits{}, "", err
	}

	// Get tier configuration
	tierConfig, exists := shared.TierConfigs[user.Tier]
	if !exists {
		// Default to free tier if tier is not recognized
		tierConfig = shared.TierConfigs["free"]
		user.Tier = "free"
	}

	// Cache the result
	pm.mutex.Lock()
	pm.cache[userID] = &userTierCache{
		tier:       user.Tier,
		tierConfig: tierConfig,
	}
	pm.mutex.Unlock()

	return tierConfig, user.Tier, nil
}

// countUserResources counts the user's existing resources of a specific type
func (pm *PlanMiddleware) countUserResources(userID uint, resourceType ResourceType) (int, error) {
	var count int64

	switch resourceType {
	case ResourceAgent:
		// Count active agents (excluding soft deleted)
		if err := pm.DB.Model(&shared.AgentConfig{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
			return 0, err
		}
	case ResourceMCPServer:
		// Count MCP servers across all agents
		if err := pm.DB.Model(&shared.MCPServer{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
			return 0, err
		}
	case ResourceAPIKey:
		// Count API keys across all agents
		if err := pm.DB.Raw(`
			SELECT COUNT(*) 
			FROM agent_api_keys aak 
			JOIN agent_configs ac ON aak.agent_id = ac.id 
			WHERE ac.user_id = ? AND aak.deleted_at IS NULL
		`, userID).Scan(&count).Error; err != nil {
			return 0, err
		}
	default:
		return 0, fmt.Errorf("unknown resource type: %s", resourceType)
	}

	return int(count), nil
}

// ClearUserCache removes cached tier info for a user (call when tier changes)
func (pm *PlanMiddleware) ClearUserCache(userID uint) {
	pm.mutex.Lock()
	delete(pm.cache, userID)
	pm.mutex.Unlock()
}

// GetUserResourceCounts returns current usage counts for all resource types
func (pm *PlanMiddleware) GetUserResourceCounts(userID uint) (map[string]int, error) {
	counts := make(map[string]int)

	agentCount, err := pm.countUserResources(userID, ResourceAgent)
	if err != nil {
		return nil, err
	}
	counts["agents_used"] = agentCount

	mcpCount, err := pm.countUserResources(userID, ResourceMCPServer)
	if err != nil {
		return nil, err
	}
	counts["mcp_servers_used"] = mcpCount

	apiKeyCount, err := pm.countUserResources(userID, ResourceAPIKey)
	if err != nil {
		return nil, err
	}
	counts["api_keys_used"] = apiKeyCount

	return counts, nil
}