import { apiClient } from "./client";

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  server_url: string;
  server_type: "http" | "sse";
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface MCPServerDetail {
  id: string;
  name: string;
  description: string;
  server_url: string;
  server_type: "http" | "sse";
  config: MCPServerConfig;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface MCPServerConfig {
  server_type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  max_retries?: number;
}

export interface CreateMCPServerRequest {
  name: string;
  description?: string;
  server_url: string;
  server_type: "http" | "sse";
  config: MCPServerConfig;
  agent_id?: string;
}

export interface UpdateMCPServerRequest {
  name?: string;
  description?: string;
  server_url?: string;
  config?: MCPServerConfig;
}

export interface AgentMCPServer {
  server_id: string;
  server_name: string;
  enabled: boolean;
}

export interface AgentMCPServerDetail {
  server_id: string;
  server_name: string;
  description: string;
  server_url: string;
  server_type: "http" | "sse";
  config: MCPServerConfig;
  enabled: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ServerToolsResponse {
  tools: string[];
  count: number;
}

export const mcpApi = {
  // MCP Server management
  async listServers(): Promise<{ servers: MCPServer[] }> {
    const response = await apiClient.get("/mcp/servers");
    return response.data as { servers: MCPServer[] };
  },

  async getServer(id: string): Promise<{ server: MCPServerDetail }> {
    const response = await apiClient.get(`/mcp/servers/${id}`);
    return response.data as { server: MCPServerDetail };
  },

  async createServer(
    data: CreateMCPServerRequest
  ): Promise<{ server: MCPServer }> {
    const response = await apiClient.post("/mcp/servers", data);
    return response.data as { server: MCPServer };
  },

  async updateServer(
    id: string,
    data: UpdateMCPServerRequest
  ): Promise<{ server: MCPServer }> {
    const response = await apiClient.put(`/mcp/servers/${id}`, data);
    return response.data as { server: MCPServer };
  },

  async deleteServer(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/mcp/servers/${id}`);
    return response.data as { message: string };
  },

  async testConnection(id: string): Promise<TestConnectionResponse> {
    const response = await apiClient.post(`/mcp/servers/${id}/test`);
    return response.data as TestConnectionResponse;
  },

  async getServerTools(id: string): Promise<ServerToolsResponse> {
    const response = await apiClient.get(`/mcp/servers/${id}/tools`);
    return response.data as ServerToolsResponse;
  },

  // Agent-MCP associations
  async getAgentMCPServers(
    agentId: string
  ): Promise<{ servers: AgentMCPServerDetail[] }> {
    const response = await apiClient.get(`/mcp/agents/${agentId}/servers`);
    return response.data as { servers: AgentMCPServerDetail[] };
  },

  async associateAgentMCPServer(
    agentId: string,
    serverId: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post(
      `/mcp/agents/${agentId}/servers/${serverId}`
    );
    return response.data as { message: string };
  },

  async disassociateAgentMCPServer(
    agentId: string,
    serverId: string
  ): Promise<{ message: string }> {
    const response = await apiClient.delete(
      `/mcp/agents/${agentId}/servers/${serverId}`
    );
    return response.data as { message: string };
  },

  async toggleAgentMCPServer(
    agentId: string,
    serverId: string,
    enabled: boolean
  ): Promise<{ message: string }> {
    const response = await apiClient.put(
      `/mcp/agents/${agentId}/servers/${serverId}/toggle`,
      { enabled }
    );
    return response.data as { message: string };
  },
};
