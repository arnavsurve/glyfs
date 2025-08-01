import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bot, Plus, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { agentsApi } from "../api/agents.api";
import type { Agent, AgentsResponse } from "../types/agent.types";
import { AgentCard } from "./AgentCard";
import { transformAgentsData } from "../utils/agent.utils";
import { AgentLimitIndicator } from "./AgentLimitIndicator";
import { UpgradePrompt } from "./UpgradePrompt";
import { useAuth } from "../auth/AuthContext";

export function AgentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tierInfo, setTierInfo] = useState<AgentsResponse['tier']>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    async function fetchAgents() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await agentsApi.getAgents();

        // Transform the data to match our interface
        const transformedAgents = transformAgentsData(response.agents);

        setAgents(transformedAgents);
        setTierInfo(response.tier);
      } catch (err: any) {
        console.error("Failed to fetch agents:", err);
        setError(err.message || "Failed to load agents");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgents();
  }, [location.key]); // Re-fetch when navigation occurs

  const handleCreateClick = () => {
    const agentLimit = tierInfo?.agent_limit ?? user?.tier_limits?.agent_limit ?? 3;
    const agentsUsed = tierInfo?.agents_used ?? agents.length;
    
    if (agentsUsed >= agentLimit) {
      setShowUpgradePrompt(true);
    } else {
      navigate("/agents/create");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Bot className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold">Agents</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your agents and their configurations.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Agent Limit Indicator */}
            <div className="w-48">
              <AgentLimitIndicator
                agentsUsed={tierInfo?.agents_used ?? agents.length}
                agentLimit={tierInfo?.agent_limit}
                onUpgradeClick={() => setShowUpgradePrompt(true)}
              />
            </div>
            <Button
              className="flex items-center space-x-2"
              onClick={handleCreateClick}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              <span>Create Agent</span>
            </Button>
          </div>
        </div>

        {/* Success Message (if redirected from create) */}
        {location.state?.message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg text-green-800 dark:text-green-300">
            {location.state.message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96 border border-border rounded-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Loading agents...
              </h3>
            </div>
          </div>
        ) : agents.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
            <div className="text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Agents Found
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first agent to get started.
              </p>
              <Button
                onClick={handleCreateClick}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Agent</span>
              </Button>
            </div>
          </div>
        ) : (
          // Agent List
          <div className="space-y-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Upgrade Prompt Dialog */}
        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
        />
      </div>
    </div>
  );
}

