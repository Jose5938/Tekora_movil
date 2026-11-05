export type FieldErrors = Record<string, string[]>;
const statusMessages: Record<number, string> = {
  401: 'La sesión no es válida. Inicia sesión de nuevo.',
  403: 'Tu cuenta no tiene permiso para esta operación.',
  404: 'El recurso ya no existe o no está publicado.',
  409: 'La operación entra en conflicto con el estado actual.',
  422: 'Revisa los datos del formulario.',
  429: 'Demasiados intentos. Espera antes de reintentar.',
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: FieldErrors = {},
    public readonly retryAfter: string | null = null,
  ) { super(message); this.name = 'ApiError'; }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No fue posible completar la operación. Reintenta.';
}

type Options = { method?: 'GET' | 'POST'; body?: unknown; authenticated?: boolean };

export class ApiClient {
  private pending = new Map<string, { token: string | null; body: string | undefined; promise: Promise<unknown> }[]>();
  private token: () => string | null = () => null;
  private unauthorized: (token: string) => Promise<void> = async () => {};

  constructor(private baseUrl: () => string | undefined, private transport: typeof fetch = (input, init) => fetch(input, init)) {}

  setSessionHandlers(token: () => string | null, unauthorized: (token: string) => Promise<void>) {
    this.token = token;
    this.unauthorized = unauthorized;
  }

  request<T>(path: string, options: Options = {}): Promise<T> {
    const token = options.authenticated ? this.token() : null;
    if (options.authenticated && !token) {
      return Promise.reject(new ApiError(401, 'unauthenticated', statusMessages[401]));
    }
    // Coalesce identical requests only. Bodies stay in memory while pending,
    // never in map keys, logs or persistent storage.
    const key = `${options.method ?? 'GET'} ${path}`;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    const entries = this.pending.get(key) ?? [];
    const pending = entries.find(entry => entry.token === token && entry.body === body);
    if (pending) return pending.promise as Promise<T>;
    const promise = this.send<T>(path, options, token).finally(() => {
      const remaining = this.pending.get(key)?.filter(entry => entry.promise !== promise);
      if (remaining?.length) this.pending.set(key, remaining);
      else this.pending.delete(key);
    });
    this.pending.set(key, [...entries, { token, body, promise }]);
    return promise;
  }

  private async send<T>(path: string, options: Options, token: string | null): Promise<T> {
    const base = this.baseUrl()?.trim().replace(/\/+$/, '');
    let url: URL;
    try {
      if (!base || !path.startsWith('/') || path.startsWith('//')) throw new Error();
      url = new URL(base);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    } catch {
      throw new ApiError(0, 'configuration', 'Configura EXPO_PUBLIC_API_BASE_URL con la URL del backend terminada en /api/v1.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    let payload: unknown;
    try {
      response = await this.transport(`${base}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      // Even a non-JSON 401 must invalidate the rejected credential.
      if (response.status === 401 && token) await this.unauthorized(token);
      try { payload = await response.json(); } catch {
        throw new ApiError(response.status, 'invalid_response', statusMessages[response.status] ?? 'El servidor no devolvió JSON válido.');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, 'network', 'No se pudo conectar con Tekora. Revisa tu conexión y reintenta.');
    } finally { clearTimeout(timeout); }

    if (!response.ok) {
      const detail = (payload as { error?: { code?: unknown; message?: unknown; fields?: unknown } })?.error;
      const fields: FieldErrors = {};
      if (detail?.fields && typeof detail.fields === 'object') {
        for (const [name, value] of Object.entries(detail.fields)) {
          if (Array.isArray(value) && value.every(item => typeof item === 'string')) fields[name] = value;
        }
      }
      throw new ApiError(response.status,
        typeof detail?.code === 'string' ? detail.code : 'http_error',
        typeof detail?.message === 'string' ? detail.message : statusMessages[response.status] ?? 'El servidor no pudo completar la operación.',
        fields, response.headers.get('Retry-After'));
    }
    return payload as T;
  }
}
