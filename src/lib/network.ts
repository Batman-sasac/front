export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = 5000,
    timeoutMessage = '요청 시간이 초과되었습니다.'
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw new Error(timeoutMessage);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
