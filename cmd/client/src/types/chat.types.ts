export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: string;
  created_at: string;
}

export interface ChatContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatStreamRequest {
  message: string;
  session_id?: string;
  context?: ChatContextMessage[];
}

export interface ChatStreamEvent {
  type: 'token' | 'done' | 'error' | 'metadata' | 'tool_event';
  content: string;
  data?: any;
}

export interface ToolCallEvent {
  type: 'tool_start' | 'tool_result' | 'tool_error' | 'tool_batch_complete';
  call_id?: string;
  tool_name?: string;
  arguments?: Record<string, any>;
  result?: string;
  error?: string;
  duration_ms?: number;
  batch_complete?: boolean; // Frontend-only flag to track when tool batch is complete
}


export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
}

export interface Agent {
  id: string;
  name: string;
  provider: string;
  llm_model: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}