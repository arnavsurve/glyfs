import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Send, MessageSquare, Bot, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./markdown.css";
import {
  chatApi,
  type ChatMessage,
  type ChatSession,
  type ChatStreamEvent,
} from "../api/chat.api";
import type { ToolCallEvent } from "../types/chat.types";
import { agentsApi } from "../api/agents.api";
import type { Agent } from "../types/agent.types";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface ChatPageProps {}

export function ChatPage({}: ChatPageProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [currentToolCalls, setCurrentToolCalls] = useState<Record<string, ToolCallEvent>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load sessions when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadSessions();
    } else {
      setSessions([]);
      setCurrentSession(null);
      setMessages([]);
    }
  }, [selectedAgent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Auto-focus input when component mounts or agent changes
  useEffect(() => {
    if (selectedAgent && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedAgent]);

  // Focus input when session changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSession]);

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      console.log("Loading agents...");
      const response = await agentsApi.getAgents();
      console.log("Agents loaded:", response.agents);
      setAgents(response.agents);

      // Try to restore selected agent from localStorage
      const savedAgentId = localStorage.getItem("selectedAgentId");
      let agentToSelect = null;

      if (savedAgentId) {
        agentToSelect = response.agents.find(
          (agent) => agent.id === savedAgentId,
        );
      }

      // If saved agent not found or no saved agent, select first available
      if (!agentToSelect && response.agents.length > 0) {
        agentToSelect = response.agents[0];
      }

      if (agentToSelect && !selectedAgent) {
        console.log("Setting selected agent:", agentToSelect);
        setSelectedAgent(agentToSelect);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadSessions = async () => {
    if (!selectedAgent || !selectedAgent.id) {
      setSessions([]);
      return;
    }

    try {
      const response = await chatApi.getChatSessions(selectedAgent.id);
      setSessions(response.sessions || []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (!selectedAgent) return;

    try {
      const session = await chatApi.getChatSession(selectedAgent.id, sessionId);
      setCurrentSession(session);
      setMessages(session.messages || []);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const startNewSession = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the session click
    
    if (!selectedAgent) return;
    
    try {
      await chatApi.deleteChatSession(selectedAgent.id, sessionId);
      
      // Remove the session from the local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If we're currently viewing the deleted session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const sendMessage = async () => {
    if (
      !selectedAgent ||
      !selectedAgent.id ||
      !inputMessage.trim() ||
      isStreaming
    )
      return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: currentSession?.id || "",
      role: "user",
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsStreaming(true);
    setStreamingMessage("");

    // Re-focus input after a brief delay to ensure it's ready
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    try {
      // Convert messages to context format (only include necessary fields)
      const contextMessages = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
      }));

      const request = {
        message: inputMessage,
        session_id: currentSession?.id,
        context: contextMessages, // Send conversation history for context
      };

      await chatApi.streamChat(
        selectedAgent.id,
        request,
        (event: ChatStreamEvent) => {
          switch (event.type) {
            case "metadata":
              // Handle session creation or metadata
              if (event.data?.session_id && !currentSession) {
                setCurrentSession({
                  id: event.data.session_id,
                  title: "New Chat",
                  agent_id: selectedAgent.id,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
              break;
            case "token":
              setStreamingMessage((prev) => prev + event.content);
              break;
            case "done":
              const assistantMessage: ChatMessage = {
                id: event.data?.message_id || Date.now().toString(),
                session_id: currentSession?.id || event.data?.session_id || "",
                role: "assistant",
                content: event.data?.content || streamingMessage,
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingMessage("");
              setCurrentToolCalls({});
              setIsStreaming(false);
              loadSessions(); // Refresh sessions list
              // Re-focus input after response is complete
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }, 100);
              // Refresh sessions again after a delay to get updated titles
              setTimeout(() => {
                loadSessions();
              }, 2000);
              break;
            case "tool_event":
              if (event.data) {
                const toolEvent = event.data as ToolCallEvent;
                setCurrentToolCalls((prev) => ({
                  ...prev,
                  [toolEvent.call_id]: toolEvent,
                }));
              }
              break;
            case "error":
              console.error("Stream error:", event.content);
              
              // Add error message to chat
              const errorMessage: ChatMessage = {
                id: Date.now().toString(),
                session_id: currentSession?.id || "",
                role: "assistant",
                content: `⚠️ **Error**: ${formatErrorMessage(event.content)}`,
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, errorMessage]);
              
              setIsStreaming(false);
              setStreamingMessage("");
              setCurrentToolCalls({});
              // Re-focus input even on error
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }, 100);
              break;
          }
        },
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        session_id: currentSession?.id || "",
        role: "assistant",
        content: `⚠️ **Error**: ${formatErrorMessage(error instanceof Error ? error.message : String(error))}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      setIsStreaming(false);
      setStreamingMessage("");
      setCurrentToolCalls({});
      // Re-focus input even on error
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatErrorMessage = (errorText: string): string => {
    // Handle rate limiting errors
    if (errorText.includes("Rate limit reached") || errorText.includes("429")) {
      if (errorText.includes("gpt-4")) {
        return "OpenAI API rate limit reached. Please wait a few seconds and try again, or consider switching to a different model.";
      } else if (errorText.includes("claude")) {
        return "Anthropic API rate limit reached. Please wait a few seconds and try again.";
      }
      return "API rate limit reached. Please wait a moment and try again.";
    }
    
    // Handle authentication errors
    if (errorText.includes("401") || errorText.includes("authentication") || errorText.includes("unauthorized")) {
      return "Authentication failed. Please check your API keys in the agent configuration.";
    }
    
    // Handle quota/billing errors
    if (errorText.includes("quota") || errorText.includes("billing") || errorText.includes("insufficient_quota")) {
      return "API quota exceeded or billing issue. Please check your account status and billing information.";
    }
    
    // Handle context length errors
    if (errorText.includes("context_length") || errorText.includes("maximum context length") || errorText.includes("too long")) {
      return "Message too long for the model's context window. Try shortening your message or starting a new conversation.";
    }
    
    // Handle model availability errors
    if (errorText.includes("model") && (errorText.includes("not found") || errorText.includes("unavailable"))) {
      return "The selected model is not available. Please try a different model in the agent configuration.";
    }
    
    // Handle network/connection errors
    if (errorText.includes("connection") || errorText.includes("network") || errorText.includes("timeout")) {
      return "Connection error. Please check your internet connection and try again.";
    }
    
    // Handle MCP/tool errors
    if (errorText.includes("MCP") || errorText.includes("tool")) {
      return "Tool execution error. Some external tools may be temporarily unavailable.";
    }
    
    // Default fallback - clean up technical details but keep essential info
    if (errorText.length > 200) {
      // Extract key error information if the message is very long
      const lines = errorText.split('\n');
      const firstLine = lines[0] || errorText;
      return `${firstLine.substring(0, 150)}...`;
    }
    
    return errorText;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Agent Selector */}
        <div className="p-4 border-b border-border">
          <label className="text-sm font-medium mb-2 block">Select Agent</label>
          {isLoadingAgents ? (
            <div className="flex items-center justify-center h-10 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">
                Loading agents...
              </span>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex items-center justify-center h-10 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">
                No agents found
              </span>
            </div>
          ) : (
            <Select
              value={selectedAgent?.id || ""}
              onValueChange={(value) => {
                const agent = agents.find((a) => a.id === value);
                if (agent) {
                  setSelectedAgent(agent);
                  localStorage.setItem("selectedAgentId", agent.id);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent">
                  {selectedAgent ? (
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <span>{selectedAgent.name}</span>
                    </div>
                  ) : (
                    "Choose an agent"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <span>{agent.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={startNewSession}
            className="w-full"
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-2">Recent Chats</h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors relative group ${
                  currentSession?.id === session.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{selectedAgent.name}</h2>
                <span className="text-sm text-muted-foreground">
                  {selectedAgent.llm_model}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && !isStreaming ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-xl font-semibold mb-3">
                      Start a Conversation
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Begin chatting with{" "}
                      <span className="font-medium">{selectedAgent.name}</span>.
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <Bot className="w-4 h-4" />
                      <span>Powered by {selectedAgent.llm_model}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.content.startsWith("⚠️ **Error**:")
                            ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                            : "bg-card border"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="markdown-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              rehypePlugins={[rehypeHighlight]}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Tool Calls Display */}
                  {isStreaming && Object.keys(currentToolCalls).length > 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%]">
                        <ToolCallDisplay toolCalls={currentToolCalls} />
                      </div>
                    </div>
                  )}

                  {/* Streaming Message */}
                  {isStreaming && streamingMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-lg bg-card border">
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {streamingMessage}
                          </ReactMarkdown>
                        </div>
                        <div className="text-xs opacity-70 mt-1">Typing...</div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Say anything"
                  disabled={isStreaming}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isStreaming}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : isLoadingAgents ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3">
                No Agents Available
              </h3>
              <p className="text-muted-foreground mb-6">
                Create an agent to start chatting. Visit the Agents page to get
                started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
