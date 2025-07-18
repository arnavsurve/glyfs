import { Wrench, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ToolCallEvent } from "../types/chat.types";

interface ToolCallDisplayProps {
  toolCalls: Record<string, ToolCallEvent>;
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const [expandedCalls, setExpandedCalls] = useState<Record<string, boolean>>({});

  const toggleExpanded = (callId: string) => {
    setExpandedCalls(prev => ({
      ...prev,
      [callId]: !prev[callId]
    }));
  };

  const getStatusIcon = (event: ToolCallEvent) => {
    switch (event.type) {
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

  const getStatusText = (event: ToolCallEvent) => {
    switch (event.type) {
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

  const toolCallsArray = Object.values(toolCalls).filter(tc => tc.call_id); // Filter out batch complete events

  if (toolCallsArray.length === 0) {
    return null;
  }

  return (
    <div className="my-2 space-y-2">
      {toolCallsArray.map((toolCall) => {
        const callId = toolCall.call_id!; // We know it exists because we filtered above
        const isExpanded = expandedCalls[callId];
        const hasDetails = toolCall.arguments || toolCall.result || toolCall.error;
        
        return (
          <div
            key={callId}
            className="border border-border rounded-lg bg-muted/20 overflow-hidden"
          >
            <div
              className={`flex items-center justify-between p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/40' : ''}`}
              onClick={hasDetails ? () => toggleExpanded(callId) : undefined}
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(toolCall)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{toolCall.tool_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getStatusText(toolCall)}
                    </span>
                    {toolCall.duration_ms && (
                      <span className="text-xs text-muted-foreground">
                        ({toolCall.duration_ms}ms)
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
                {toolCall.arguments && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Arguments</h4>
                    <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                      {formatArguments(toolCall.arguments)}
                    </pre>
                  </div>
                )}
                
                {toolCall.result && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Result</h4>
                    <div className="text-xs bg-background p-2 rounded border">
                      {toolCall.result}
                    </div>
                  </div>
                )}
                
                {toolCall.error && (
                  <div>
                    <h4 className="text-xs font-medium text-red-600 mb-1">Error</h4>
                    <div className="text-xs bg-red-50 border border-red-200 p-2 rounded text-red-700">
                      {toolCall.error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}