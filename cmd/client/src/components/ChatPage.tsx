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
import { Send, MessageSquare, Bot, Trash2, Clock, CheckCircle, XCircle, Wrench, ChevronDown, ChevronRight } from "lucide-react";
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
import type { ToolCallEvent, ReasoningEvent } from "../types/chat.types";
import { agentsApi } from "../api/agents.api";
import type { Agent } from "../types/agent.types";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { ReasoningDisplay } from "./ReasoningDisplay";

interface ChatPageProps {}

// Component to display tool messages with expanded details
function ToolMessageDisplay({ message }: { message: ChatMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);

  let toolEvent: ToolCallEvent | null = null;
  try {
    if (message.metadata) {
      toolEvent = JSON.parse(message.metadata);
    }
  } catch (e) {
    // Invalid JSON, ignore
  }

  if (!toolEvent) return null;

  const getStatusIcon = () => {
    switch (toolEvent.type) {
      case "tool_start":
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "tool_result":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "tool_error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (toolEvent.type) {
      case "tool_start":
        return "Running...";
      case "tool_result":
        return "Completed";
      case "tool_error":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const formatArguments = (args?: Record<string, any>) => {
    if (!args || Object.keys(args).length === 0) return "No arguments";
    return JSON.stringify(args, null, 2);
  };

  const hasDetails = toolEvent.arguments || toolEvent.result || toolEvent.error;

  return (
    <div className="border border-border rounded-lg bg-muted/20 overflow-hidden">
      <div
        className={`flex items-center justify-between p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/40' : ''}`}
        onClick={hasDetails ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{toolEvent.tool_name}</span>
              <span className="text-xs text-muted-foreground">
                {getStatusText()}
              </span>
              {toolEvent.duration_ms && (
                <span className="text-xs text-muted-foreground">
                  ({toolEvent.duration_ms}ms)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {hasDetails && (
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      
      {isExpanded && hasDetails && (
        <div className="border-t border-border bg-muted/10 p-3 space-y-3">
          {toolEvent.arguments && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Arguments</h4>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                {formatArguments(toolEvent.arguments)}
              </pre>
            </div>
          )}
          
          {toolEvent.result && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Result</h4>
              <div className="text-xs bg-background p-2 rounded border">
                {toolEvent.result}
              </div>
            </div>
          )}
          
          {toolEvent.error && (
            <div>
              <h4 className="text-xs font-medium text-red-600 mb-1">Error</h4>
              <div className="text-xs bg-red-50 border border-red-200 p-2 rounded text-red-700">
                {toolEvent.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [currentToolCalls, setCurrentToolCalls] = useState<
    Record<string, ToolCallEvent>
  >({});
  const [currentReasoningEvents, setCurrentReasoningEvents] = useState<
    ReasoningEvent[]
  >([]);
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
      setCurrentToolCalls({}); // Clear tool calls when no agent selected
    }
  }, [selectedAgent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, currentToolCalls, currentReasoningEvents]);

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
      const response = await agentsApi.getAgents();
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
      setCurrentToolCalls({}); // Clear tool calls when loading a session
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const startNewSession = () => {
    setCurrentSession(null);
    setMessages([]);
    setCurrentToolCalls({}); // Clear tool calls when starting new session
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the session click

    if (!selectedAgent) return;

    try {
      await chatApi.deleteChatSession(selectedAgent.id, sessionId);

      // Remove the session from the local state
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));

      // If we're currently viewing the deleted session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
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
    setCurrentReasoningEvents([]);
    setCurrentToolCalls({}); // Clear tool calls when starting a new message

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
              setCurrentReasoningEvents([]);
              setIsStreaming(false);
              // Don't clear currentToolCalls - let them persist in the UI
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
                if (toolEvent.type === "tool_batch_complete") {
                  // Mark all current tool calls as batch complete (for thinking indicator logic)
                  setCurrentToolCalls((prev) => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(key => {
                      updated[key] = { ...updated[key], batch_complete: true };
                    });
                    return updated;
                  });
                } else if (toolEvent.call_id) {
                  setCurrentToolCalls((prev) => ({
                    ...prev,
                    [toolEvent.call_id!]: toolEvent,
                  }));
                }
              }
              break;
            case "reasoning_event":
              if (event.data) {
                const reasoningEvent = event.data as ReasoningEvent;
                setCurrentReasoningEvents((prev) => [...prev, reasoningEvent]);
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
              setCurrentReasoningEvents([]);
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
      setCurrentReasoningEvents([]);
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
    if (
      errorText.includes("401") ||
      errorText.includes("authentication") ||
      errorText.includes("unauthorized")
    ) {
      return "Authentication failed. Please check your API keys in the agent configuration.";
    }

    // Handle quota/billing errors
    if (
      errorText.includes("quota") ||
      errorText.includes("billing") ||
      errorText.includes("insufficient_quota")
    ) {
      return "API quota exceeded or billing issue. Please check your account status and billing information.";
    }

    // Handle context length errors
    if (
      errorText.includes("context_length") ||
      errorText.includes("maximum context length") ||
      errorText.includes("too long")
    ) {
      return "Message too long for the model's context window. Try shortening your message or starting a new conversation.";
    }

    // Handle model availability errors
    if (
      errorText.includes("model") &&
      (errorText.includes("not found") || errorText.includes("unavailable"))
    ) {
      return "The selected model is not available. Please try a different model in the agent configuration.";
    }

    // Handle network/connection errors
    if (
      errorText.includes("connection") ||
      errorText.includes("network") ||
      errorText.includes("timeout")
    ) {
      return "Connection error. Please check your internet connection and try again.";
    }

    // Handle MCP/tool errors
    if (errorText.includes("MCP") || errorText.includes("tool")) {
      return "Tool execution error. Some external tools may be temporarily unavailable.";
    }

    // Default fallback - clean up technical details but keep essential info
    if (errorText.length > 200) {
      // Extract key error information if the message is very long
      const lines = errorText.split("\n");
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">{selectedAgent.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    {selectedAgent.llm_model}
                  </span>
                </div>
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
                        className={`max-w-[80%] ${
                          message.role === "user"
                            ? "p-3 rounded-lg bg-primary text-primary-foreground"
                            : message.role === "tool"
                              ? "" // No padding/styling for tool messages - they have their own
                              : message.content.startsWith("⚠️ **Error**:")
                                ? "p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                                : "p-3 rounded-lg bg-card border"
                        }`}
                      >
                        {message.role === "tool" ? (
                          <ToolMessageDisplay message={message} />
                        ) : message.role === "assistant" ? (
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

                  {/* Thinking Indicator */}
                  {isStreaming &&
                    currentReasoningEvents.length === 0 &&
                    !streamingMessage && 
                    (Object.keys(currentToolCalls).length === 0 || 
                     Object.values(currentToolCalls).every(tc => tc.batch_complete)) && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-lg bg-card border">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Reasoning Display */}
                  {isStreaming && currentReasoningEvents.length > 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%]">
                        <ReasoningDisplay
                          reasoningEvents={currentReasoningEvents}
                        />
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
