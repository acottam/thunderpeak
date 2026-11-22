// Small fetch wrapper for the Thunderpeak API (see docs/api.md).
// A phone cannot reach `localhost`, so the default is the live Render URL.
// To use a local API, set EXPO_PUBLIC_API_URL to your computer's network
// address, for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npm start`.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://thunderpeak-api.onrender.com').replace(/\/+$/, '');

// Render's free plan sleeps, and the first request after a pause takes about a minute.
const TIMEOUT_MS = 90_000;

export class ApiError extends Error {
  status: number; // HTTP status, or 0 when the server could not be reached

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'The server took too long to answer. Please try again.'
        : 'Could not reach the server. Check your internet connection.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  // Errors always look like { status: "error", message: "..." }.
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}
