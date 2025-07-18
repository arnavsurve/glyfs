import { useState } from "react";
import type { ReasoningEvent } from "../types/chat.types";

interface ReasoningDisplayProps {
  reasoningEvents: ReasoningEvent[];
  isVisible?: boolean;
}

export function ReasoningDisplay({
  reasoningEvents,
  isVisible = true,
}: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || reasoningEvents.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "planning":
        return "text-blue-600 dark:text-blue-400";
      case "analysis":
        return "text-green-600 dark:text-green-400";
      case "error_recovery":
        return "text-red-600 dark:text-red-400";
      case "decision":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "planning":
        return "🎯";
      case "analysis":
        return "🔍";
      case "error_recovery":
        return "🔧";
      case "decision":
        return "⚡";
      default:
        return "💭";
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🧠</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            AI Reasoning ({reasoningEvents.length} steps)
          </span>
        </div>
        <span className="text-xs text-gray-500">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {reasoningEvents.map((event, index) => (
            <div
              key={index}
              className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 py-1"
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm">
                  {getCategoryIcon(event.category)}
                </span>
                <span
                  className={`text-xs font-medium ${getCategoryColor(event.category)}`}
                >
                  {event.category.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  Step {event.iteration + 1}
                </span>
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {event.content}
              </div>
              {event.tool_context && (
                <div className="text-xs text-gray-500 mt-1">
                  Tool context: {event.tool_context}
                </div>
              )}
              {event.error_context && (
                <div className="text-xs text-red-500 mt-1">
                  Error context: {event.error_context}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

