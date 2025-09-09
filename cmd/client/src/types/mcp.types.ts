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
  sensitive_url?: boolean;
  sensitive_headers?: string[];
  agent_id?: string;
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

export const MCP_SERVER_TYPES = {
  HTTP: "http" as const,
  SSE: "sse" as const,
} as const;

export type MCPServerType =
  (typeof MCP_SERVER_TYPES)[keyof typeof MCP_SERVER_TYPES];
