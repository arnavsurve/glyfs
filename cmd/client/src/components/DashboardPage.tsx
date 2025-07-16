import { LayoutDashboard } from 'lucide-react';

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

        {/* Placeholder Content */}
        <div className="flex items-center justify-center h-96 border-2 border-dashed border-border rounded-lg">
          <div className="text-center">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Dashboard Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground">
              This will show your platform overview and analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}