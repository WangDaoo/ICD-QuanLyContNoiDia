export function getApiPayload<T>(body: T | { data: T }): T {
  if (typeof body === 'object' && body !== null && 'data' in body && !('meta' in body)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function getApiErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const value = body as Record<string, unknown>;
    if (typeof value.error === 'object' && value.error !== null) {
      const error = value.error as { message?: unknown };
      if (typeof error.message === 'string') return error.message;
    }
    if (typeof value.message === 'string') return value.message;
    if (Array.isArray(value.message)) return value.message.join('\n');
  }
  return `Không thể thực hiện yêu cầu (${status}).`;
}

export function isGatePassTokenError(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const value = body as Record<string, unknown>;
  const error =
    typeof value.error === 'object' && value.error !== null
      ? (value.error as Record<string, unknown>)
      : value;
  return error.code === 'GATE_PASS_TOKEN_INVALID';
}
