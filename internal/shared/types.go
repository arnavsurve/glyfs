package shared

type AnthropicModel string

const (
	Claude35Sonnet AnthropicModel = "claude-3.5-sonnet"
	Claude37Sonnet AnthropicModel = "claude-3.7-sonnet"
	Claude4Sonnet  AnthropicModel = "claude-4-sonnet"
	Claude4Opus    AnthropicModel = "claude-4-opus"
)

func (m AnthropicModel) IsValid() bool {
	switch m {
	case Claude35Sonnet, Claude37Sonnet, Claude4Sonnet, Claude4Opus:
		return true
	}
	return false
}

type InferenceProvider string

const (
	Anthropic InferenceProvider = "anthropic"
	OpenAI    InferenceProvider = "openai"
	Google    InferenceProvider = "google"
)

type CreateAgentRequest struct {
	Provider     InferenceProvider `json:"provider"`
	Model        AnthropicModel    `json:"model"`
	SystemPrompt string            `json:"system_prompt"`
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
