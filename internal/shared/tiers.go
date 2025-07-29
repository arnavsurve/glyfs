package shared

type TierLimits struct {
	AgentLimit int
}

var TierConfigs = map[string]TierLimits{
	"free": {
		AgentLimit: 3,
	},
	"pro": {
		AgentLimit: 20,
	},
}
