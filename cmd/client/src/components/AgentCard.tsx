import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ChevronRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import type { Agent } from "../types/agent.types";
import { MODELS, getProviderDisplayName } from "../types/agent.types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Get the model display name from the model value
  const getModelDisplayName = () => {
    const provider = agent.provider as keyof typeof MODELS;
    if (!MODELS[provider]) return agent.llm_model;

    const model = MODELS[provider].find((m) => m.value === agent.llm_model);
    return model ? model.label : agent.llm_model;
  };

  // Generate the invoke URL
  const getInvokeUrl = () => {
    return `${window.location.origin}/api/agents/${agent.id}/invoke`;
  };

  // Truncate the agent ID for display
  const getTruncatedId = () => {
    if (!agent.id) return "unknown";
    if (agent.id.length <= 8) return agent.id;
    return `${agent.id.substring(0, 8)}...`;
  };

  // Copy the invoke URL to clipboard
  const copyInvokeUrl = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when copying URL
    navigator.clipboard
      .writeText(getInvokeUrl())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  // Handle card click to navigate to agent detail
  const handleCardClick = () => {
    navigate(`/app/agents/${agent.id}`);
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header with name and chevron */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Model info */}
        <p className="text-sm text-muted-foreground mb-3">
          {getProviderDisplayName(agent.provider)} • {getModelDisplayName()}
        </p>

        {/* System prompt preview */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {agent.system_prompt
            ? agent.system_prompt.length > 50
              ? `${agent.system_prompt.substring(0, 50)}...`
              : agent.system_prompt
            : ""}
        </p>

        {/* Invoke URL */}
        <div
          className="p-2 bg-muted/50 rounded border border-border text-xs text-muted-foreground flex items-center hover:text-foreground transition-colors group cursor-pointer"
          onClick={copyInvokeUrl}
          title="Click to copy API URL"
        >
          <code className="flex-grow truncate">
            /api/agents/{getTruncatedId()}/invoke
          </code>
          <span className="flex-shrink-0 ml-2">
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
