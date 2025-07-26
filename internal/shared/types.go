package shared

type LLM interface {
	IsValid() bool
}

type AnthropicModel string

const (
	Claude35Sonnet AnthropicModel = "claude-3-5-sonnet-20241022"
	Claude35Haiku  AnthropicModel = "claude-3-5-haiku-20241022"
	Claude37Sonnet AnthropicModel = "claude-3-7-sonnet-20250219"
	Claude4Sonnet  AnthropicModel = "claude-sonnet-4-20250514"
	Claude4Opus    AnthropicModel = "claude-opus-4-20250514"
)

func (am AnthropicModel) IsValid() bool {
	switch am {
	case Claude35Sonnet, Claude35Haiku, Claude37Sonnet, Claude4Sonnet, Claude4Opus:
		return true
	}
	return false
}

type OpenAIModel string

const (
	O4Mini    OpenAIModel = "o4-mini"
	O3        OpenAIModel = "o3"
	O3Mini    OpenAIModel = "o3-mini"
	O3Pro     OpenAIModel = "o3-pro"
	O1        OpenAIModel = "o1"
	O1Mini    OpenAIModel = "o1-mini"
	GPT41     OpenAIModel = "gpt-4.1"
	GPT4o     OpenAIModel = "gpt-4o"
	GPT4oMini OpenAIModel = "gpt-4o-mini"
	GPT41Nano OpenAIModel = "gpt-4.1-nano-2025-04-14"
)

func (om OpenAIModel) IsValid() bool {
	switch om {
	case O4Mini, O3, O3Mini, O3Pro, O1, O1Mini, GPT41, GPT4o, GPT4oMini:
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

type UpdateAgentRequest struct {
	Name         *string            `json:"name,omitempty"`
	Provider     *InferenceProvider `json:"provider,omitempty"`
	Model        *string            `json:"model,omitempty"`
	SystemPrompt *string            `json:"system_prompt,omitempty"`
	MaxTokens    *int               `json:"max_tokens,omitempty"`
	Temperature  *float64           `json:"temperature,omitempty"`
}

func (r *UpdateAgentRequest) IsValidModel() bool {
	if r.Provider != nil && r.Model != nil {
		switch *r.Provider {
		case Anthropic:
			return AnthropicModel(*r.Model).IsValid()
		case OpenAI:
			return OpenAIModel(*r.Model).IsValid()
		case Google:
			// TODO: Add Google model validation when implemented
			return false
		default:
			return false
		}
	}
	return true // No provider/model update, so it's valid
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Message struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

type AgentInferenceRequest struct {
	Message string    `json:"message"`
	History []Message `json:"history,omitempty"`
}

type AgentInferenceResponse struct {
	Response string `json:"response"`
	Usage    *Usage `json:"usage,omitempty"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type UserSettingsResponse struct {
	AnthropicAPIKey string `json:"anthropic_api_key"` // Masked
	OpenAIAPIKey    string `json:"openai_api_key"`    // Masked
	GeminiAPIKey    string `json:"gemini_api_key"`    // Masked
}

type UpdateUserSettingsRequest struct {
	AnthropicAPIKey *string `json:"anthropic_api_key,omitempty"`
	OpenAIAPIKey    *string `json:"openai_api_key,omitempty"`
	GeminiAPIKey    *string `json:"gemini_api_key,omitempty"`
}
