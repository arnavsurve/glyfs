import { LayoutDashboard } from "lucide-react";
import { RecentAgentsWidget } from "./RecentAgentsWidget";
import { UsageGraphWidget } from "./UsageGraphWidget";

export function DashboardPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Overview of your agent activities and platform usage.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[300px_1fr] overflow-hidden">
          {/* Recent Agents Widget - fixed width */}
          <div className="flex-shrink-0">
            <RecentAgentsWidget />
          </div>

          {/* Usage Statistics Widget - takes remaining space */}
          <div className="min-w-0">
            <UsageGraphWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
