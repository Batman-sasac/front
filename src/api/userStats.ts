import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import { AUTH_API_BASE } from "./authClient";
import type { HomeStatsResponse, UserStatsResponse } from "./authTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getHomeStats(token: string): Promise<HomeStatsResponse> {
  const response = await fetchWithTimeout(`${AUTH_API_BASE}/auth/home/stats`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`홈 화면 통계 조회 실패 (${response.status})`);
  }
  const json = await response.json();
  const raw = json?.data ?? json ?? {};
  return {
    status: json?.status ?? "success",
    data: {
      points: Number(raw.points ?? raw.total_points ?? raw.exp ?? 0),
      monthly_goal: raw.monthly_goal ?? raw.target_count ?? null,
      this_month_count: Number(raw.this_month_count ?? 0),
    },
  };
}

export function normalizeUserStats(json: unknown): UserStatsResponse {
  const response = isRecord(json) ? json : {};
  const raw = isRecord(response.data) ? response.data : response;
  const monthlyGoal = raw.monthly_goal ?? raw.target_count;
  return {
    status: typeof response.status === "string" ? response.status : "success",
    data: {
      total_learning_count: Number(
        raw.total_learning_count ?? raw.total_count ?? 0,
      ),
      consecutive_days: Number(
        raw.consecutive_days ?? raw.continuous_days ?? 0,
      ),
      monthly_goal: monthlyGoal == null ? null : Number(monthlyGoal),
      total_points: Number(raw.total_points ?? raw.exp ?? 0),
      is_subscribed: Boolean(
        raw.is_subscribed ??
          raw.subscribed ??
          raw.is_premium ??
          raw.premium ??
          raw.plan_active ??
          (typeof raw.plan_status === "string" &&
            raw.plan_status.toLowerCase() === "subscribed"),
      ),
    },
  };
}

export async function getUserStats(token: string): Promise<UserStatsResponse> {
  const response = await fetchWithTimeout(`${AUTH_API_BASE}/auth/user/stats`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`사용자 상태 조회 실패 (${response.status})`);
  }
  return normalizeUserStats(await response.json());
}
