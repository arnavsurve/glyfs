import { useState } from "react";
import { Copy, Check, Pencil, MoreVertical } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import type { Agent } from "../types/agent.types";
import { MODELS } from "../types/agent.types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const [copied, setCopied] = useState(false);

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
  const copyInvokeUrl = () => {
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header with name and action buttons */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Edit agent"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="More options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Model info */}
        <p className="text-sm text-muted-foreground">
          {getModelDisplayName()}
        </p>

        {/* Invoke URL */}
        <div
          className="mt-3 p-2 bg-muted/50 rounded border border-border text-xs text-muted-foreground flex items-center cursor-pointer hover:text-foreground transition-colors group"
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
