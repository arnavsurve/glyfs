package shared

type LLM interface {
	IsValid() bool
}

type AnthropicModel string

const (
	Claude35Sonnet AnthropicModel = "claude-3.5-sonnet"
	Claude37Sonnet AnthropicModel = "claude-3.7-sonnet"
	Claude4Sonnet  AnthropicModel = "claude-4-sonnet"
	Claude4Opus    AnthropicModel = "claude-4-opus"
)

func (am AnthropicModel) IsValid() bool {
	switch am {
	case Claude35Sonnet, Claude37Sonnet, Claude4Sonnet, Claude4Opus:
		return true
	}
	return false
}

type OpenAIModel string

const (
	O4mini OpenAIModel = "o4-mini"
	O3mini OpenAIModel = "o3-mini"
	O3     OpenAIModel = "o3"
	GPT4o  OpenAIModel = "gpt-4o"
	GPT41  OpenAIModel = "gpt-4.1"
)

func (om OpenAIModel) IsValid() bool {
	switch om {
	case O4mini, O3mini, O3, GPT4o, GPT41:
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
	Name         string            `json:"name"`
	Provider     InferenceProvider `json:"provider"`
	Model        string            `json:"model"`
	SystemPrompt string            `json:"system_prompt"`
	MaxTokens    int               `json:"max_tokens"`
	Temperature  float64           `json:"temperature"`
}

func (r *CreateAgentRequest) IsValidModel() bool {
	switch r.Provider {
	case Anthropic:
		return AnthropicModel(r.Model).IsValid()
	case OpenAI:
		return OpenAIModel(r.Model).IsValid()
	case Google:
		// TODO: Add Google model validation when implemented
		return false
	default:
		return false
	}
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
