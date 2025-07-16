import { Bot, Plus } from 'lucide-react';
import { Button } from './ui/button';

export function AgentsPage() {
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
              Manage your AI agents and their configurations.
            </p>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Agent</span>
          </Button>
        </div>

        {/* Placeholder Content */}
        <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
          <div className="text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Agent Management Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground">
              This will show your agent configurations and chat interfaces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}