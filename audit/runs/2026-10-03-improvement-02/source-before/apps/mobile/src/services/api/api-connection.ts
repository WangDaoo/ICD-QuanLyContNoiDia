export async function checkApiConnection(baseUrl: string, request: typeof fetch = fetch, timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await request(baseUrl.replace(/\/+$/, '') + '/health/ready', { signal: controller.signal, cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
