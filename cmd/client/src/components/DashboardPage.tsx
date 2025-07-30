import { LayoutDashboard, TrendingUp, Activity, Users } from 'lucide-react';
import { RecentAgentsWidget } from './RecentAgentsWidget';

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Recent Agents Widget */}
          <div className="lg:col-span-1 xl:col-span-1">
            <RecentAgentsWidget />
          </div>

          {/* Placeholder for Usage Stats */}
          <div className="md:col-span-1">
            <div className="h-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Usage Stats
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon
              </p>
            </div>
          </div>

          {/* Placeholder for Activity Feed */}
          <div className="md:col-span-1">
            <div className="h-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <Activity className="w-8 h-8 text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Activity Feed
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon
              </p>
            </div>
          </div>

          {/* Placeholder for Team Overview */}
          <div className="md:col-span-1">
            <div className="h-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <Users className="w-8 h-8 text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Team Overview
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}