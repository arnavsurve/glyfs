import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Clock, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { agentsApi } from "../api/agents.api";
import { chatApi } from "../api/chat.api";
import type { Agent } from "../types/agent.types";
import type { ChatSession } from "../types/chat.types";
import { getProviderDisplayName } from "../types/agent.types";

interface AgentWithActivity extends Agent {
  lastActivity?: Date;
  lastSessionId?: string;
}

export function RecentAgentsWidget() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentWithActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentAgents();
  }, []);

  const loadRecentAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all agents
      const agentsResponse = await agentsApi.getAgents();
      const allAgents = agentsResponse.agents;

      // Fetch chat sessions for each agent to find recent activity
      const agentsWithActivity = await Promise.all(
        allAgents.map(async (agent) => {
          try {
            const sessionsResponse = await chatApi.getChatSessions(agent.id);
            const sessions = sessionsResponse.sessions || [];

            // Find the most recent session
            const mostRecentSession = sessions.reduce(
              (latest: ChatSession | null, session: ChatSession) => {
                if (!latest) return session;
                return new Date(session.updated_at) >
                  new Date(latest.updated_at)
                  ? session
                  : latest;
              },
              null,
            );

            return {
              ...agent,
              lastActivity: mostRecentSession
                ? new Date(mostRecentSession.updated_at)
                : undefined,
              lastSessionId: mostRecentSession?.id,
            } as AgentWithActivity;
          } catch (err) {
            // If we can't fetch sessions for an agent, just return it without activity
            return agent as AgentWithActivity;
          }
        }),
      );

      // Filter agents with activity and sort by most recent
      const recentAgents = agentsWithActivity
        .filter((agent) => agent.lastActivity)
        .sort((a, b) => {
          if (!a.lastActivity || !b.lastActivity) return 0;
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        })
        .slice(0, 5); // Show top 5 recent agents

      setAgents(recentAgents);
    } catch (err: any) {
      console.error("Failed to load recent agents:", err);
      setError("Failed to load recent agents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentClick = (agent: AgentWithActivity) => {
    // Store the selected agent ID in localStorage
    localStorage.setItem("selectedAgentId", agent.id);
    // Navigate to chat
    navigate("/chat");
  };

  const formatRelativeTime = (date: Date | undefined): string => {
    if (!date) return "Never";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="h-full max-h-[800px] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recent Chats
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || agents.length === 0) {
    return (
      <Card className="h-full max-h-[800px] overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recent Chats
          </CardTitle>
          <CardDescription>Quick access to your recent agents</CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-2">No conversations yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create an agent to start chatting
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/agents")}
              >
                Create your first agent
              </Button>
            </div>
          </div>
          <div className="pt-2 border-t mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate("/agents")}
            >
              View all agents
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full max-h-[800px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Recent Chats
        </CardTitle>
        <CardDescription>Quick access to your recent agents</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent)}
              className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-sm truncate">
                      {agent.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {getProviderDisplayName(agent.provider)} •{" "}
                      {agent.llm_model}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(agent.lastActivity)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate("/agents")}
          >
            View all agents
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
