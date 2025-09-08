import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Crown } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface AgentLimitIndicatorProps {
  agentsUsed?: number;
  agentLimit?: number;
  onUpgradeClick?: () => void;
}

export function AgentLimitIndicator({
  agentsUsed: propsAgentsUsed,
  agentLimit: propsAgentLimit,
  onUpgradeClick,
}: AgentLimitIndicatorProps) {
  const { user } = useAuth();

  // Use props if provided, otherwise use user data
  const agentsUsed = propsAgentsUsed ?? user?.tier_limits?.agents_used ?? 0;
  const agentLimit = propsAgentLimit ?? user?.tier_limits?.agent_limit ?? 3;
  const tier = user?.tier ?? "free";

  const percentage = (agentsUsed / agentLimit) * 100;
  const isAtLimit = agentsUsed >= agentLimit;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Agent Usage</span>
        <span
          className={
            isAtLimit ? "text-destructive font-medium" : "text-foreground"
          }
        >
          {agentsUsed} / {agentLimit} agents
        </span>
      </div>

      <Progress
        value={percentage}
        className={isAtLimit ? "bg-destructive/20" : ""}
      />

      {tier === "free" && (
        <Button
          variant={isAtLimit ? "default" : "outline"}
          size="sm"
          className="w-full"
          onClick={onUpgradeClick}
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to Pro
        </Button>
      )}
    </div>
  );
}
