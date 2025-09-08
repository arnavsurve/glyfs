import { apiClient } from "./client";

export interface DailyUsage {
  date: string;
  invocation_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface AgentUsage {
  agent_id: string;
  agent_name: string;
  provider: string;
  model: string;
  invocation_count: number;
  total_tokens: number;
}

export interface TotalUsage {
  invocation_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface UsageDashboardResponse {
  daily_usage: DailyUsage[];
  top_agents: AgentUsage[];
  total_usage: TotalUsage;
  date_range: DateRange;
}

export const usageApi = {
  getDashboardUsage: async (days?: number): Promise<UsageDashboardResponse> => {
    const url = days ? `/usage/dashboard?days=${days}` : "/usage/dashboard";
    const response = await apiClient.get<UsageDashboardResponse>(url);
    return response.data;
  },
};
