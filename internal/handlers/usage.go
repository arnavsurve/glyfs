package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type UsageHandler struct {
	DB *gorm.DB
}

func NewUsageHandler(db *gorm.DB) *UsageHandler {
	return &UsageHandler{DB: db}
}

// DailyUsage represents aggregated usage for a single day
type DailyUsage struct {
	Date             string `json:"date"`  // ISO date string in UTC
	InvocationCount  int    `json:"invocation_count"`
	TotalTokens      int    `json:"total_tokens"`
	PromptTokens     int    `json:"prompt_tokens"`
	CompletionTokens int    `json:"completion_tokens"`
}

// AgentUsage represents usage broken down by agent
type AgentUsage struct {
	AgentID         string `json:"agent_id"`
	AgentName       string `json:"agent_name"`
	Provider        string `json:"provider"`
	Model           string `json:"model"`
	InvocationCount int    `json:"invocation_count"`
	TotalTokens     int    `json:"total_tokens"`
}

// UsageDashboardResponse contains all usage data for the dashboard
type UsageDashboardResponse struct {
	DailyUsage []DailyUsage `json:"daily_usage"`
	TopAgents  []AgentUsage `json:"top_agents"`
	TotalUsage TotalUsage   `json:"total_usage"`
	DateRange  DateRange    `json:"date_range"`
}

type TotalUsage struct {
	InvocationCount  int `json:"invocation_count"`
	TotalTokens      int `json:"total_tokens"`
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type DateRange struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

// HandleGetUsageDashboard returns usage metrics for the dashboard
func (h *UsageHandler) HandleGetUsageDashboard(c echo.Context) error {
	userID, ok := c.Get("user_id").(uint)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user context")
	}

	// Get query parameters for date range (default to last 30 days)
	days := 30
	if daysParam := c.QueryParam("days"); daysParam != "" {
		if parsedDays, err := strconv.Atoi(daysParam); err == nil {
			days = parsedDays
		}
	}

	log.Printf("Usage dashboard request - UserID: %d, Days: %d", userID, days)

	// Use UTC for consistent date boundaries, but extend range to account for timezones
	// This ensures we capture all data regardless of user timezone
	now := time.Now().UTC()
	// Add 2 days buffer (1 before, 1 after) to handle all timezones
	endDate := now.AddDate(0, 0, 2)
	startDate := now.AddDate(0, 0, -days-1)

	// First, let's check if we have any usage metrics at all
	var totalCount int64
	if err := h.DB.Model(&shared.UsageMetric{}).Where("user_id = ?", userID).Count(&totalCount).Error; err != nil {
		log.Printf("Error counting usage metrics: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to count usage metrics")
	}
	log.Printf("Total usage metrics for user %d: %d", userID, totalCount)
	
	// Debug: Check actual date range of usage metrics
	var minDate, maxDate time.Time
	if err := h.DB.Raw("SELECT MIN(created_at), MAX(created_at) FROM usage_metrics WHERE user_id = ?", userID).
		Row().Scan(&minDate, &maxDate); err != nil {
		log.Printf("Error fetching date range: %v", err)
	} else {
		log.Printf("Usage metrics date range: %s to %s", minDate.Format("2006-01-02"), maxDate.Format("2006-01-02"))
	}

	// Debug: Check what records exist in the date range
	var debugCount int64
	if err := h.DB.Raw("SELECT COUNT(*) FROM usage_metrics WHERE user_id = ? AND created_at >= ? AND created_at <= ?", 
		userID, startDate, endDate).Scan(&debugCount).Error; err != nil {
		log.Printf("Error counting records in range: %v", err)
	} else {
		log.Printf("Records in date range %s to %s: %d", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), debugCount)
	}

	// Get daily usage using PostgreSQL date_trunc in UTC
	// Return as timestamp strings to preserve timezone info
	var dailyUsage []DailyUsage
	if err := h.DB.Raw(`
		SELECT 
			to_char(date_trunc('day', created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,
			COUNT(*) as invocation_count,
			SUM(total_tokens) as total_tokens,
			SUM(prompt_tokens) as prompt_tokens,
			SUM(completion_tokens) as completion_tokens
		FROM usage_metrics
		WHERE user_id = ? AND created_at >= ? AND created_at <= ?
		GROUP BY date_trunc('day', created_at)
		ORDER BY date_trunc('day', created_at) ASC
	`, userID, startDate, endDate).Scan(&dailyUsage).Error; err != nil {
		log.Printf("Error fetching daily usage: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch daily usage")
	}
	
	log.Printf("Found %d daily usage records for date range %s to %s", len(dailyUsage), startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	for i, du := range dailyUsage {
		log.Printf("Daily usage [%d]: %s = %d invocations, %d tokens", i, du.Date, du.InvocationCount, du.TotalTokens)
	}

	// Get top agents by usage
	var topAgents []AgentUsage
	if err := h.DB.Raw(`
		SELECT 
			um.agent_id,
			ac.name as agent_name,
			um.provider,
			um.model,
			COUNT(*) as invocation_count,
			SUM(um.total_tokens) as total_tokens
		FROM usage_metrics um
		JOIN agent_configs ac ON um.agent_id = ac.id
		WHERE um.user_id = ? AND um.created_at >= ? AND um.created_at <= ?
		GROUP BY um.agent_id, ac.name, um.provider, um.model
		ORDER BY invocation_count DESC
		LIMIT 3
	`, userID, startDate, endDate).Scan(&topAgents).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch agent usage")
	}

	// Get total usage
	var totalUsage TotalUsage
	if err := h.DB.Raw(`
		SELECT 
			COUNT(*) as invocation_count,
			COALESCE(SUM(total_tokens), 0) as total_tokens,
			COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
			COALESCE(SUM(completion_tokens), 0) as completion_tokens
		FROM usage_metrics
		WHERE user_id = ? AND created_at >= ? AND created_at <= ?
	`, userID, startDate, endDate).Scan(&totalUsage).Error; err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch total usage")
	}

	// Create a map for quick lookup by date
	dailyUsageMap := make(map[string]DailyUsage)
	for _, du := range dailyUsage {
		// The date is already in ISO format from the query
		dailyUsageMap[du.Date] = du
		log.Printf("Mapped daily usage: %s = %d invocations, %d tokens", du.Date, du.InvocationCount, du.TotalTokens)
	}

	// Fill in missing dates for the requested range
	// Generate all dates in the range in UTC
	requestedEndDate := time.Now().UTC()
	requestedStartDate := requestedEndDate.AddDate(0, 0, -days)
	
	var completeDailyUsage []DailyUsage
	for d := requestedStartDate; !d.After(requestedEndDate); d = d.AddDate(0, 0, 1) {
		// Create the ISO timestamp for start of day in UTC
		dateStr := d.Format("2006-01-02T00:00:00Z")
		if usage, exists := dailyUsageMap[dateStr]; exists {
			completeDailyUsage = append(completeDailyUsage, usage)
		} else {
			completeDailyUsage = append(completeDailyUsage, DailyUsage{
				Date:             dateStr,
				InvocationCount:  0,
				TotalTokens:      0,
				PromptTokens:     0,
				CompletionTokens: 0,
			})
		}
	}

	response := UsageDashboardResponse{
		DailyUsage: completeDailyUsage,
		TopAgents:  topAgents,
		TotalUsage: totalUsage,
		DateRange: DateRange{
			StartDate: requestedStartDate.Format("2006-01-02"),
			EndDate:   requestedEndDate.Format("2006-01-02"),
		},
	}

	return c.JSON(http.StatusOK, response)
}

// RegisterUsageRoutes registers all usage-related routes
func (h *UsageHandler) RegisterUsageRoutes(e *echo.Group) {
	e.GET("/usage/dashboard", h.HandleGetUsageDashboard)
}
