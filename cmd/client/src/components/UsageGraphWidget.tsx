import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, parseISO } from "date-fns";
import { TrendingUp, Loader2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { usageApi } from "../api/usage.api";
import type { UsageDashboardResponse } from "../api/usage.api";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type MetricType = "invocations" | "tokens";

export function UsageGraphWidget() {
  const [usageData, setUsageData] = useState<UsageDashboardResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricType, setMetricType] = useState<MetricType>("invocations");
  const [dateRange, setDateRange] = useState<number>(7); // days

  useEffect(() => {
    loadUsageData();
  }, [dateRange]);

  const loadUsageData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usageApi.getDashboardUsage(dateRange);
      setUsageData(data);
    } catch (err: any) {
      console.error("Failed to load usage data:", err);
      setError("Failed to load usage statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const getChartData = () => {
    if (
      !usageData ||
      !usageData.daily_usage ||
      usageData.daily_usage.length === 0
    )
      return null;

    const labels = usageData.daily_usage.map((day) =>
      format(parseISO(day.date), "MMM d"),
    );

    const data =
      metricType === "invocations"
        ? usageData.daily_usage.map((day) => day.invocation_count)
        : usageData.daily_usage.map((day) => day.total_tokens);

    return {
      labels,
      datasets: [
        {
          label: metricType === "invocations" ? "Invocations" : "Total Tokens",
          data,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          tension: 0.3,
        },
      ],
    };
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
        titleColor: "white",
        bodyColor: "white",
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (metricType === "tokens") {
              return `Tokens: ${value.toLocaleString()}`;
            }
            return `Invocations: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(156, 163, 175, 0.1)",
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          callback: function (value) {
            if (metricType === "tokens" && typeof value === "number") {
              return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
            }
            return value;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <Card className="md:col-span-2 h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !usageData) {
    return (
      <Card className="md:col-span-2 h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {error || "No data available"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = getChartData();

  return (
    <Card className="md:col-span-2 h-full max-h-[800px] overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>Your usage at a glance</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={metricType}
              onValueChange={(value: MetricType) => setMetricType(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invocations">Invocations</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateRange.toString()}
              onValueChange={(value) => setDateRange(Number(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Invocations</p>
            <p className="text-lg font-semibold">
              {usageData.total_usage.invocation_count.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <p className="text-lg font-semibold">
              {usageData.total_usage.total_tokens.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Top Agent</p>
            <p className="text-lg font-semibold truncate">
              {usageData.top_agents && usageData.top_agents.length > 0
                ? usageData.top_agents[0].agent_name
                : "N/A"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Top Model</p>
            <p className="text-lg font-semibold truncate">
              {usageData.top_agents && usageData.top_agents.length > 0
                ? usageData.top_agents[0].model
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No usage data available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start chatting with your agents to see usage metrics
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Top Agents List */}
        {usageData.top_agents && usageData.top_agents.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Top Agents by Usage</h4>
            <div className="space-y-2">
              {usageData.top_agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {agent.agent_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent.provider} • {agent.model}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {agent.invocation_count} calls
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent.total_tokens.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

