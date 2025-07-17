export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: string;
  created_at: string;
}

export interface ChatContextMessage {
  id: string;
  role: 'user' | 'assistant';
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
  type: 'token' | 'done' | 'error' | 'metadata';
  content: string;
  data?: any;
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