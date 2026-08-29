const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000';

export type ApiErrorType = '400' | '401' | '404' | '500' | 'network';

export class ApiError extends Error {
  status: number;
  type: ApiErrorType;

  constructor(message: string, status: number, type: ApiErrorType) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiBase}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const payload = await parseJson<T>(response);

    if (!response.ok) {
      const message = typeof payload === 'object' && payload && 'message' in payload && typeof (payload as Record<string, unknown>).message === 'string'
        ? (payload as Record<string, unknown>).message as string
        : `Request failed with status ${response.status}`;

      const type: ApiErrorType =
        response.status === 400 ? '400' :
        response.status === 401 ? '401' :
        response.status === 404 ? '404' :
        response.status === 500 ? '500' : 'network';

      throw new ApiError(message, response.status, type);
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error. Please try again.', 0, 'network');
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const authStorage = {
  get(): { id: string; name: string; email: string; avatar: string } | null {
    const raw = localStorage.getItem('reachinbox-user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { id: string; name: string; email: string; avatar: string };
    } catch {
      return null;
    }
  },
  set(user: { id: string; name: string; email: string; avatar: string }) {
    localStorage.setItem('reachinbox-user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('reachinbox-user');
  },
};
