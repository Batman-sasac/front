import config from "../lib/config";

export const OCR_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? config.apiBaseUrl;

export async function getOcrAuthHeaders(
  contentType?: "application/json",
): Promise<Record<string, string>> {
  const { getToken } = await import("../lib/storage");
  const token = await getToken();
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token || ""}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}
