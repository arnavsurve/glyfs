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
  sensitive_url?: boolean;
  sensitive_headers?: string[];
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

export const MCP_SERVER_TYPES = {
  HTTP: "http" as const,
  SSE: "sse" as const,
} as const;

export type MCPServerType =
  (typeof MCP_SERVER_TYPES)[keyof typeof MCP_SERVER_TYPES];

