import type { Agent } from '../types/agent.types';

/**
 * Transform backend agent data to frontend interface
 * Backend uses JSON annotations with snake_case field names
 * Frontend uses snake_case field names (id, name, etc.)
 */
export function transformAgentData(rawAgent: any): Agent {
  return {
    id: rawAgent.id,
    name: rawAgent.name,
    provider: rawAgent.provider,
    llm_model: rawAgent.llm_model,
    system_prompt: rawAgent.system_prompt,
    max_tokens: rawAgent.max_tokens,
    temperature: rawAgent.temperature,
    created_at: rawAgent.created_at,
    updated_at: rawAgent.updated_at,
  };
}

/**
 * Transform an array of backend agents to frontend format
 */
export function transformAgentsData(rawAgents: any[]): Agent[] {
  return rawAgents.map(transformAgentData);
}