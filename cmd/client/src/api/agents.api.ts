import { apiClient } from './client';
import type { Agent, CreateAgentRequest, UpdateAgentRequest, AgentInferenceRequest, AgentInferenceResponse } from '../types/agent.types';

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

export interface APIKey {
  id: number;
  name: string;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
}

export interface CreateAPIKeyResponse {
  message: string;
  api_key: string;
  key_id: number;
  name: string;
  created_at: string;
}

export const agentsApi = {
  getAgents: async (): Promise<GetAgentsResponse> => {
    const response = await apiClient.get<GetAgentsResponse>('/agents');
    return response.data;
  },

  getAgent: async (agentId: string): Promise<{ agent: Agent }> => {
    const response = await apiClient.get<{ agent: Agent }>(`/agents/${agentId}`);
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

  restoreAgent: async (agentId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/agents/${agentId}/restore`);
    return response.data;
  },

  // API Key Management
  getAPIKeys: async (agentId: string): Promise<{ api_keys: APIKey[]; count: number }> => {
    const response = await apiClient.get<{ api_keys: APIKey[]; count: number }>(`/agents/${agentId}/keys`);
    return response.data;
  },

  createAPIKey: async (agentId: string, name: string): Promise<CreateAPIKeyResponse> => {
    const response = await apiClient.post<CreateAPIKeyResponse>(`/agents/${agentId}/keys`, {
      name,
    });
    return response.data;
  },

  deleteAPIKey: async (agentId: string, keyId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/agents/${agentId}/keys/${keyId}`);
    return response.data;
  },
};