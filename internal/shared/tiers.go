package shared

type TierLimits struct {
	AgentLimit     int
	MCPServerLimit int
	APIKeyLimit    int
}

var TierConfigs = map[string]TierLimits{
	"free": {
		AgentLimit:     3,
		MCPServerLimit: 9,
		APIKeyLimit:    3,
	},
	"pro": {
		AgentLimit:     20,
		MCPServerLimit: 100, // Effectively unlimited
		APIKeyLimit:    50,  // Effectively unlimited
	},
}
