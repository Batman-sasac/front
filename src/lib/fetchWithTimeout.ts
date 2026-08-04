const DEFAULT_API_TIMEOUT_MS = 10000;

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`서버 응답 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
