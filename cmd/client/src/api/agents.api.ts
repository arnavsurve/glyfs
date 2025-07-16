import { apiClient } from './client';

// Agent types (we'll enhance these later)
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

export interface CreateAgentRequest {
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  system_prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface UpdateAgentRequest {
  name?: string;
  provider?: 'anthropic' | 'openai' | 'google';
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

export interface GetAgentsResponse {
  agents: Agent[];
  count: number;
}

export interface CreateAgentResponse {
  message: string;
  agent_id: string;
  api_key: string;
}

export interface UpdateAgentResponse {
  message: string;
  agent_id: string;
}

export const agentsApi = {
  getAgents: async (): Promise<GetAgentsResponse> => {
    const response = await apiClient.get<GetAgentsResponse>('/agents');
    return response.data;
  },

  createAgent: async (agentData: CreateAgentRequest): Promise<CreateAgentResponse> => {
    const response = await apiClient.post<CreateAgentResponse>('/agents', agentData);
    return response.data;
  },

  updateAgent: async (agentId: string, agentData: UpdateAgentRequest): Promise<UpdateAgentResponse> => {
    const response = await apiClient.put<UpdateAgentResponse>(`/agents/${agentId}`, agentData);
    return response.data;
  },

  invokeAgent: async (agentId: string, request: AgentInferenceRequest): Promise<AgentInferenceResponse> => {
    const response = await apiClient.post<AgentInferenceResponse>(`/agents/${agentId}/invoke`, request);
    return response.data;
  },

  deleteAgent: async (agentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/agents/${agentId}`);
    return response.data;
  },
};