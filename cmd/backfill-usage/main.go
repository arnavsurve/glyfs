package main

import (
	"log"

	"github.com/arnavsurve/glyfs/internal/db"
	"github.com/arnavsurve/glyfs/internal/shared"
	"github.com/joho/godotenv"
)

// max returns the larger of x or y
func max(x, y int) int {
	if x > y {
		return x
	}
	return y
}

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Setup database connection
	database := db.SetupDB()

	log.Println("Starting usage metrics backfill...")

	// Find all assistant messages that don't have corresponding usage metrics
	var assistantMessages []shared.ChatMessage
	if err := database.Raw(`
		SELECT cm.* 
		FROM chat_messages cm
		LEFT JOIN usage_metrics um ON cm.id = um.message_id
		WHERE cm.role = 'assistant' 
		AND um.id IS NULL
		ORDER BY cm.created_at ASC
	`).Scan(&assistantMessages).Error; err != nil {
		log.Fatalf("Failed to find assistant messages: %v", err)
	}

	log.Printf("Found %d assistant messages without usage metrics", len(assistantMessages))

	if len(assistantMessages) == 0 {
		log.Println("No messages to backfill. Exiting.")
		return
	}

	// Process each message
	var successCount int
	var errorCount int

	for i, message := range assistantMessages {
		log.Printf("Processing message %d/%d (ID: %s)", i+1, len(assistantMessages), message.ID)

		// Get the session to find the agent and user
		var session shared.ChatSession
		if err := database.Where("id = ?", message.SessionID).First(&session).Error; err != nil {
			log.Printf("Failed to find session for message %s: %v", message.ID, err)
			errorCount++
			continue
		}

		// Get the agent to find provider and model
		var agent shared.AgentConfig
		if err := database.Where("id = ?", session.AgentID).First(&agent).Error; err != nil {
			log.Printf("Failed to find agent for session %s: %v", session.ID, err)
			errorCount++
			continue
		}

		// Estimate token usage based on content length (improved approximation)
		contentLength := len(message.Content)
		
		// Use ~3.5 chars per token approximation with minimum of 1 token
		completionTokens := max(1, (contentLength*10+35)/35) // Equivalent to chars/3.5 rounded up
		promptTokens := max(1, completionTokens/3) // Rough estimate: prompt is ~1/3 of completion
		totalTokens := promptTokens + completionTokens

		// Create usage metric
		usageMetric := shared.UsageMetric{
			CreatedAt:        message.CreatedAt,
			UserID:           session.UserID,
			AgentID:          agent.ID,
			SessionID:        &session.ID,
			MessageID:        &message.ID,
			Provider:         agent.Provider,
			Model:            agent.LLMModel,
			PromptTokens:     promptTokens,
			CompletionTokens: completionTokens,
			TotalTokens:      totalTokens,
		}

		// Save the usage metric
		if err := database.Create(&usageMetric).Error; err != nil {
			log.Printf("Failed to create usage metric for message %s: %v", message.ID, err)
			errorCount++
			continue
		}

		successCount++
		if successCount%10 == 0 {
			log.Printf("Progress: %d/%d completed", successCount, len(assistantMessages))
		}
	}

	log.Printf("Backfill completed!")
	log.Printf("Successfully created: %d usage metrics", successCount)
	log.Printf("Errors encountered: %d", errorCount)
	log.Printf("Total processed: %d", len(assistantMessages))

	// Verify the results
	var totalUsageMetrics int64
	if err := database.Model(&shared.UsageMetric{}).Count(&totalUsageMetrics).Error; err != nil {
		log.Printf("Failed to count total usage metrics: %v", err)
	} else {
		log.Printf("Total usage metrics in database: %d", totalUsageMetrics)
	}
}