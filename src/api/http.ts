export type FieldErrors = Record<string, string[]>;
const statusMessages: Record<number, string> = {
  401: 'La sesión no es válida. Inicia sesión de nuevo.',
  403: 'Tu cuenta no tiene permiso para esta operación.',
  404: 'El recurso ya no existe o no está publicado.',
  409: 'La operación entra en conflicto con el estado actual.',
  422: 'Revisa los datos del formulario.',
  429: 'Demasiados intentos. Espera antes de reintentar.',
  503: 'Tekora no está disponible temporalmente. Inténtalo más tarde.',
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
type Transport = (url: string, init: RequestInit) => Promise<Pick<Response,
  'ok' | 'status' | 'headers' | 'json' | 'redirected' | 'type'>>;

function isLocalHost(host: string): boolean {
  const [first, second] = host.split('.').map(Number);
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
    (/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
      (first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)));
}

export class ApiClient {
  private pending = new Map<string, { token: string | null; body: string | undefined; promise: Promise<unknown> }[]>();
  private token: () => string | null = () => null;
  private unauthorized: (token: string) => Promise<void> = async () => {};

  constructor(
    private baseUrl: () => string | undefined,
    private transport: Transport = (input, init) => fetch(input, init),
    private allowLocalHttp = false,
  ) {}

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

  // Use only the captured credential for this logout, after disabling normal authenticated requests.
  revoke(token: string): Promise<unknown> {
    return this.send('/auth/logout', { method: 'POST' }, token, false);
  }

  private async send<T>(path: string, options: Options, token: string | null, notifyUnauthorized = true): Promise<T> {
    let url: URL;
    try {
      const base = this.baseUrl()?.trim();
      if (!base || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new Error();
      url = new URL(base);
      if (url.pathname.replace(/\/+$/, '') !== '/api/v1' || url.username || url.password || url.search || url.hash) throw new Error();
    } catch {
      throw new ApiError(0, 'configuration', 'Configura EXPO_PUBLIC_API_BASE_URL con la URL de Tekora terminada en /api/v1.');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && this.allowLocalHttp && isLocalHost(url.hostname))) {
      throw new ApiError(0, 'insecure_transport', 'Conéctate a Tekora por HTTPS. HTTP solo está permitido en desarrollo con un servidor local autorizado.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Awaited<ReturnType<Transport>>;
    let payload: unknown;
    try {
      response = await this.transport(`${url.origin}/api/v1${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.redirected || response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
        throw new ApiError(response.status, 'unsafe_redirect', 'El servidor redirigió la solicitud. Revisa la URL de Tekora.');
      }
      // Even a non-JSON 401 must invalidate the rejected credential.
      if (response.status === 401 && token && notifyUnauthorized) await this.unauthorized(token);
      try { payload = await response.json(); } catch {
        throw new ApiError(response.status,
          response.status === 503 ? 'temporarily_unavailable' : 'invalid_response',
          statusMessages[response.status] ?? 'El servidor no devolvió JSON válido.',
          {}, response.headers.get('Retry-After'));
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
          if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
            Object.defineProperty(fields, name, { value, enumerable: true });
          }
        }
      }
      throw new ApiError(response.status,
        typeof detail?.code === 'string' ? detail.code : response.status === 503 ? 'temporarily_unavailable' : 'http_error',
        typeof detail?.message === 'string' ? detail.message : statusMessages[response.status] ?? 'El servidor no pudo completar la operación.',
        fields, response.headers.get('Retry-After'));
    }
    return payload as T;
  }
}
