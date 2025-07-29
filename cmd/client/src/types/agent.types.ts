export interface Agent {
  id: string;
  name: string;
  provider: string;
  llm_model: string;
  system_prompt: string;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface AgentsResponse {
  agents: Agent[];
  count: number;
  tier?: {
    name: string;
    agent_limit: number;
    agents_used: number;
  };
}

export interface CreateAgentRequest {
  name: string;
  provider: "anthropic" | "openai" | "google";
  model: string;
  system_prompt?: string;
  max_tokens: number;
  temperature: number;
}

export interface UpdateAgentRequest {
  name?: string;
  provider?: "anthropic" | "openai" | "google";
  model?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AgentInferenceRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

export interface AgentInferenceResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const PROVIDERS = {
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
  GOOGLE: "google",
} as const;

export const MODELS = {
  [PROVIDERS.ANTHROPIC]: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  ],
  [PROVIDERS.OPENAI]: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1 Mini" },
    { value: "o3", label: "o3" },
    { value: "o3-mini", label: "o3 Mini" },
    { value: "o3-pro", label: "o3 Pro" },
    { value: "o4-mini", label: "o4 Mini" },
  ],
  [PROVIDERS.GOOGLE]: [
    // TODO: Add Google models when implemented
  ],
} as const;

export type Provider = keyof typeof MODELS;

export const PROVIDER_DISPLAY_NAMES = {
  [PROVIDERS.ANTHROPIC]: "Anthropic",
  [PROVIDERS.OPENAI]: "OpenAI",
  [PROVIDERS.GOOGLE]: "Google",
} as const;

export const getProviderDisplayName = (provider: string): string => {
  return PROVIDER_DISPLAY_NAMES[provider as Provider] || provider;
};

