import { apiClient } from "./client";
import type {
  ChatSession,
  ChatStreamRequest,
  ChatStreamEvent,
} from "../types/chat.types";

// Re-export types for convenience
export type {
  ChatMessage,
  ChatSession,
  ChatStreamRequest,
  ChatStreamEvent,
} from "../types/chat.types";

export const chatApi = {
  // Get all chat sessions for an agent
  getChatSessions: async (
    agentId: string
  ): Promise<{ sessions: ChatSession[]; count: number }> => {
    const response = await apiClient.get<{
      sessions: ChatSession[];
      count: number;
    }>(`/agents/${agentId}/chat/sessions`);
    return response.data;
  },

  // Get a specific chat session with messages
  getChatSession: async (
    agentId: string,
    sessionId: string
  ): Promise<ChatSession> => {
    const response = await apiClient.get<ChatSession>(
      `/agents/${agentId}/chat/sessions/${sessionId}`
    );
    return response.data;
  },

  // Delete a chat session (soft delete)
  deleteChatSession: async (
    agentId: string,
    sessionId: string
  ): Promise<void> => {
    await apiClient.delete(`/agents/${agentId}/chat/sessions/${sessionId}`);
  },

  // Create a streaming chat connection - DEPRECATED, use streamChat instead
  createChatStream: (
    agentId: string,
    request: ChatStreamRequest
  ): EventSource => {
    // This method is deprecated as it causes race conditions between EventSource and fetch
    // Please use streamChat method instead which uses a single fetch request
    console.warn(
      "createChatStream is deprecated, please use streamChat instead",
      { agentId, request }
    );

    const url = `/api/agents/${agentId}/chat/stream?dummy=${encodeURIComponent(request.message)}`;
    const eventSource = new EventSource(url);

    return eventSource;
  },

  // Alternative: Create streaming connection via fetch with streaming response
  streamChat: async (
    agentId: string,
    request: ChatStreamRequest,
    onEvent: (event: ChatStreamEvent) => void
  ): Promise<void> => {
    const makeStreamRequest = async (): Promise<Response> => {
      // Get CSRF token
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf="))
        ?.split("=")[1];

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      const response = await fetch(`/api/agents/${agentId}/chat/stream`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(request),
      });

      // Handle authentication errors - let AuthContext handle refresh centrally
      if (response.status === 401) {
        throw new Error("Authentication failed - please log in again");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      return response;
    };

    const response = await makeStreamRequest();

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.substring(6));
              onEvent(eventData);
            } catch (error) {
              console.error("Failed to parse SSE data:", error, "Line:", line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
