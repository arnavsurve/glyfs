import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  MessageSquare,
  Zap,
  Calendar,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function MetricsPage() {
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Track your AI assistant usage and performance analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+2</span> new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-0.3s</span> improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,891</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-orange-600">+8.2%</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Usage Over Time</span>
            </CardTitle>
            <CardDescription>
              Daily message volume and API usage trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center space-y-2">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Usage chart will be displayed here
                </p>
                <p className="text-xs text-muted-foreground">
                  Integration with analytics coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Agent Performance</span>
            </CardTitle>
            <CardDescription>
              Response times and usage by agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center space-y-2">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Performance metrics will be displayed here
                </p>
                <p className="text-xs text-muted-foreground">
                  Agent comparison dashboard coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Used Agents</CardTitle>
            <CardDescription>Ranked by message volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Research Assistant", messages: 342, change: "+15%" },
                { name: "Code Helper", messages: 298, change: "+8%" },
                { name: "Writing Coach", messages: 187, change: "-2%" },
                { name: "Data Analyst", messages: 156, change: "+22%" },
                { name: "Creative Writer", messages: 143, change: "+5%" },
              ].map((agent, index) => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{agent.messages}</div>
                    <div className={`text-xs ${
                      agent.change.startsWith('+') ? 'text-green-600' : 
                      agent.change.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {agent.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Patterns</CardTitle>
            <CardDescription>Peak activity hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: "9:00 AM", activity: 85, label: "Morning Peak" },
                { time: "1:00 PM", activity: 72, label: "Lunch Time" },
                { time: "3:00 PM", activity: 95, label: "Afternoon Peak" },
                { time: "6:00 PM", activity: 45, label: "Evening" },
                { time: "10:00 PM", activity: 25, label: "Night" },
              ].map((period) => (
                <div key={period.time} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{period.time}</span>
                    <span className="text-muted-foreground">{period.label}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${period.activity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest usage events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { agent: "Research Assistant", action: "Generated report", time: "2 min ago" },
                { agent: "Code Helper", action: "Fixed bug", time: "5 min ago" },
                { agent: "Writing Coach", action: "Reviewed document", time: "12 min ago" },
                { agent: "Data Analyst", action: "Analyzed dataset", time: "18 min ago" },
                { agent: "Creative Writer", action: "Created story", time: "25 min ago" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.agent}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Export & Reports</span>
          </CardTitle>
          <CardDescription>
            Download detailed usage reports and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Generate Usage Report</p>
              <p className="text-xs text-muted-foreground">
                Export detailed metrics for the selected time period
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Export CSV
              </Button>
              <Button variant="outline" size="sm">
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}