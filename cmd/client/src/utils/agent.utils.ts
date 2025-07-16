import type { Agent } from '../types/agent.types';

/**
 * Transform backend agent data to frontend interface
 * Backend uses capitalized field names (ID, Name, etc.)
 * Frontend uses snake_case field names (id, name, etc.)
 */
export function transformAgentData(rawAgent: any): Agent {
  return {
    id: rawAgent.ID,
    name: rawAgent.Name,
    provider: rawAgent.Provider,
    llm_model: rawAgent.LLMModel,
    system_prompt: rawAgent.SystemPrompt,
    max_tokens: rawAgent.MaxTokens,
    temperature: rawAgent.Temperature,
    created_at: rawAgent.CreatedAt,
    updated_at: rawAgent.UpdatedAt,
  };
}

/**
 * Transform an array of backend agents to frontend format
 */
export function transformAgentsData(rawAgents: any[]): Agent[] {
  return rawAgents.map(transformAgentData);
}