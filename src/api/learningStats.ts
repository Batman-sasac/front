import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import { getOcrAuthHeaders, OCR_API_BASE } from "./ocrClient";
import type {
  MonthlyStatsResponse,
  WeeklyGrowthResponse,
} from "./ocrTypes";

export async function getWeeklyGrowth(): Promise<WeeklyGrowthResponse> {
  const response = await fetchWithTimeout(
    `${OCR_API_BASE}/cycle/stats/weekly-growth`,
    {
      method: "GET",
      headers: await getOcrAuthHeaders("application/json"),
    },
  );
  if (!response.ok) throw new Error(`Weekly Stats HTTP ${response.status}`);
  return response.json();
}

export async function getMonthlyStats(): Promise<MonthlyStatsResponse> {
  const response = await fetchWithTimeout(
    `${OCR_API_BASE}/cycle/learning-stats`,
    {
      method: "GET",
      headers: await getOcrAuthHeaders("application/json"),
    },
  );
  if (!response.ok) throw new Error(`Monthly Stats HTTP ${response.status}`);
  return response.json();
}
