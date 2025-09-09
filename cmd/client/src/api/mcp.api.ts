import { apiClient } from "./client";

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  server_url: string;
  server_type: "http" | "sse";
  env?: Record<string, string>;
  timeout: number;
  headers?: Record<string, string>;
  max_retries: number;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  encrypted_url?: boolean;
  sensitive_headers?: string[];
}

export interface MCPServerDetail {
  id: string;
  name: string;
  description: string;
  server_url: string;
  server_type: "http" | "sse";
  env?: Record<string, string>;
  timeout: number;
  headers?: Record<string, string>;
  max_retries: number;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  encrypted_url?: boolean;
  sensitive_headers?: string[];
}


export interface CreateMCPServerRequest {
  name: string;
  description?: string;
  server_url: string;
  server_type: "http" | "sse";
  env?: Record<string, string>;
  timeout?: number;
  headers?: Record<string, string>;
  max_retries?: number;
  agent_id?: string;
  sensitive_url?: boolean;
  sensitive_headers?: string[];
}

export interface UpdateMCPServerRequest {
  name?: string;
  description?: string;
  server_url?: string;
  env?: Record<string, string>;
  timeout?: number;
  headers?: Record<string, string>;
  max_retries?: number;
  sensitive_url?: boolean;
  sensitive_headers?: string[];
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
  env?: Record<string, string>;
  timeout: number;
  headers?: Record<string, string>;
  max_retries: number;
  enabled: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  encrypted_url?: boolean;
  sensitive_headers?: string[];
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
