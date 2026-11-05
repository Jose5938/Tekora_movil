import { ApiClient, ApiError, errorMessage } from '../api/http';
import type { ClientUser, LoginData, Resource } from '../api/types';

export interface SessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
  deviceName(): Promise<string>;
}
type Credential = { access_token: string; expires_at: string };
export type SessionState = {
  status: 'checking' | 'anonymous' | 'authenticated' | 'error';
  user: ClientUser | null;
  expiresAt: string | null;
  message: string | null;
};

function validCredential(value: unknown): value is Credential {
  const item = value as Credential | null;
  return !!item && typeof item.access_token === 'string' && item.access_token.length > 0 &&
    typeof item.expires_at === 'string' && Number.isFinite(Date.parse(item.expires_at));
}
function validUser(user: ClientUser): boolean {
  return !!user && Number.isSafeInteger(user.id) && user.id > 0 && typeof user.name === 'string' &&
    typeof user.email === 'string' && user.experience === 'client' && Array.isArray(user.permissions);
}

export class SessionController {
  private state: SessionState = { status: 'checking', user: null, expiresAt: null, message: null };
  private credential: Credential | null = null;
  private listeners = new Set<() => void>();
  private operation: Promise<void> | null = null;
  private deletion: Promise<void> | null = null;
  private discard = false;

  constructor(private api: ApiClient, private storage: SessionStorage, private now = Date.now) {
    api.setSessionHandlers(() => {
      if (!this.credential) return null;
      if (Date.parse(this.credential.expires_at) <= this.now()) {
        void this.clear('Tu sesión expiró. Inicia sesión de nuevo.');
        return null;
      }
      return this.credential.access_token;
    }, async rejected => {
      if (rejected === this.credential?.access_token) await this.clear('El servidor rechazó la sesión. Inicia sesión de nuevo.');
    });
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(state: SessionState) { this.state = state; this.listeners.forEach(listener => listener()); }
  private exclusive(action: () => Promise<void>): Promise<void> {
    if (this.operation) return this.operation;
    this.operation = action().finally(() => { this.operation = null; });
    return this.operation;
  }

  private clear(message: string | null = null): Promise<void> {
    this.credential = null;
    this.discard = true;
    this.update({ status: 'checking', user: null, expiresAt: null, message });
    if (this.deletion) return this.deletion;
    this.deletion = this.storage.remove().then(() => {
      this.discard = false;
      this.update({ status: 'anonymous', user: null, expiresAt: null, message });
    }, () => {
      this.update({ status: 'error', user: null, expiresAt: null, message: 'No se pudo borrar la sesión del almacenamiento seguro. Reintenta.' });
    }).finally(() => { this.deletion = null; });
    return this.deletion;
  }

  restore = (): Promise<void> => this.exclusive(async () => {
    this.update({ status: 'checking', user: null, expiresAt: null, message: null });
    if (this.discard) { await this.clear(); return; }
    try {
      const raw = await this.storage.read();
      if (!raw) { await this.clear(); return; }
      let saved: unknown;
      try { saved = JSON.parse(raw); } catch { await this.clear(); return; }
      if (!validCredential(saved) || Date.parse(saved.expires_at) <= this.now()) {
        await this.clear('Tu sesión expiró. Inicia sesión de nuevo.'); return;
      }
      this.credential = saved;
      await this.validateIdentity();
    } catch (error) { this.restoreError(error); }
  });

  revalidate = (): Promise<void> => this.exclusive(async () => {
    if (!this.credential) return;
    this.update({ ...this.state, status: 'checking', user: null });
    try { await this.validateIdentity(); } catch (error) { this.restoreError(error); }
  });

  private async validateIdentity() {
    const expected = this.credential;
    const { data: user } = await this.api.request<Resource<ClientUser>>('/me', { authenticated: true });
    if (this.credential !== expected || !expected) return;
    if (Date.parse(expected.expires_at) <= this.now()) { await this.clear('Tu sesión expiró.'); return; }
    if (!validUser(user)) throw new ApiError(0, 'invalid_response', 'El servidor devolvió una identidad no válida.');
    this.update({ status: 'authenticated', user, expiresAt: expected.expires_at, message: null });
  }

  private restoreError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) return; // HTTP handler already cleared it.
    if (error instanceof ApiError && error.status === 403) { void this.clear(error.message); return; }
    this.update({ status: 'error', user: null, expiresAt: this.credential?.expires_at ?? null, message: errorMessage(error) });
  }

  login = (email: string, password: string): Promise<void> => this.exclusive(async () => {
    const device_name = await this.storage.deviceName();
    const { data } = await this.api.request<Resource<LoginData>>('/auth/login', {
      method: 'POST', body: { email: email.trim(), password, device_name },
    });
    if (!validCredential(data) || data.token_type !== 'Bearer' || !validUser(data.user) || Date.parse(data.expires_at) <= this.now()) {
      throw new ApiError(0, 'invalid_response', 'El servidor devolvió una sesión no válida.');
    }
    this.credential = { access_token: data.access_token, expires_at: data.expires_at };
    try { await this.storage.write(JSON.stringify(this.credential)); } catch {
      try { await this.api.request('/auth/logout', { method: 'POST', authenticated: true }); } catch { /* Best-effort revocation; never log the credential. */ }
      await this.clear();
      throw new ApiError(0, 'secure_storage', 'No se pudo guardar la sesión de forma segura. Reintenta.');
    }
    if (!this.credential || Date.parse(data.expires_at) <= this.now()) {
      await this.clear('Tu sesión expiró. Inicia sesión de nuevo.');
      throw new ApiError(401, 'expired_session', 'Tu sesión expiró. Inicia sesión de nuevo.');
    }
    this.update({ status: 'authenticated', user: data.user, expiresAt: data.expires_at, message: null });
  });

  logout = (): Promise<void> => this.exclusive(async () => {
    let message: string | null = null;
    try {
      const { data } = await this.api.request<Resource<{ revoked: boolean }>>('/auth/logout', { method: 'POST', authenticated: true });
      if (data?.revoked !== true) throw new Error();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        message = 'Sesión local cerrada. No se pudo confirmar la revocación en el servidor. Vuelve a iniciar sesión con este dispositivo cuando haya conexión.';
      }
    } finally { await this.clear(message); }
  });

  checkExpiration = () => {
    if (this.credential && Date.parse(this.credential.expires_at) <= this.now()) return this.clear('Tu sesión expiró. Inicia sesión de nuevo.');
    return Promise.resolve();
  };
}
