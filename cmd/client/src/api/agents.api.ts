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
};