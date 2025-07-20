import { Wrench, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ChatMessage, ToolCallEvent } from "../types/chat.types";

interface ToolCallDisplayProps {
  message: ChatMessage;
}

export function ToolCallDisplay({ message }: ToolCallDisplayProps) {
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

  const hasDetails = toolEvent.arguments || toolEvent.result || toolEvent.error;

  return (
    <div className="border border-border rounded-lg bg-muted/20 overflow-hidden">
      <div
        className={`flex items-center justify-between p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/40' : ''}`}
        onClick={hasDetails ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center space-x-3">
          {getStatusIcon(toolEvent)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{toolEvent.tool_name}</span>
              <span className="text-xs text-muted-foreground">
                {getStatusText(toolEvent)}
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