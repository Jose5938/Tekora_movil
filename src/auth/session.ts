import { ApiClient, ApiError, errorMessage } from '../api/http';
import { isClientUser, isLoginData, isRecord, isResource, type ClientUser } from '../api/types';

export interface SessionStorage {
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

const expiredMessage = 'Tu sesión expiró. Inicia sesión de nuevo.';
const unconfirmedLogout = 'No se pudo confirmar la revocación en el servidor. Vuelve a iniciar sesión con este dispositivo cuando haya conexión.';

export class SessionController {
  private state: SessionState = { status: 'checking', user: null, expiresAt: null, message: null };
  private credential: Credential | null = null;
  private listeners = new Set<() => void>();
  private operation: Promise<void> | null = null;
  private closing: Promise<void> | null = null;
  private deletion: Promise<void> | null = null;
  private generation = 0;
  private cleanupNotice: string | null = null;

  constructor(private api: ApiClient, private storage: SessionStorage, private now = Date.now) {
    api.setSessionHandlers(() => {
      if (!this.credential) return null;
      if (Date.parse(this.credential.expires_at) <= this.now()) {
        void this.clear(expiredMessage);
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

  private exclusive(action: (generation: number) => Promise<void>): Promise<void> {
    if (this.closing) return this.closing;
    if (this.operation) return this.operation;
    const generation = this.generation;
    this.operation = Promise.resolve().then(() => action(generation)).finally(() => { this.operation = null; });
    return this.operation;
  }

  private invalidate(message: string | null): number {
    const generation = ++this.generation;
    this.credential = null;
    this.cleanupNotice = message;
    this.update({ status: 'checking', user: null, expiresAt: null, message });
    return generation;
  }

  private async removeStored(generation: number, message: string | null) {
    if (generation === this.generation) this.cleanupNotice = message;
    this.deletion ??= Promise.resolve().then(() => this.storage.remove()).finally(() => { this.deletion = null; });
    try {
      await this.deletion;
      if (generation === this.generation) this.update({ status: 'anonymous', user: null, expiresAt: null, message });
    } catch {
      if (generation === this.generation) {
        const failure = 'No se pudo borrar la sesión del almacenamiento seguro. Reintenta.';
        this.update({ status: 'error', user: null, expiresAt: null, message: message ? `${message} ${failure}` : failure });
      }
    }
  }

  private clear(message: string | null = null) {
    return this.removeStored(this.invalidate(message), message);
  }

  // A persisted credential cannot prove that a previous process finished logout.
  // Only a successful login in this process can install a credential.
  restore = (): Promise<void> => this.credential ? this.revalidate() : this.exclusive(async generation => {
    if (generation === this.generation) await this.clear(this.cleanupNotice);
  });

  revalidate = (): Promise<void> => this.exclusive(async generation => {
    const expected = this.credential;
    if (generation !== this.generation || !expected) return;
    this.update({ ...this.state, status: 'checking', user: null });
    try {
      const result = await this.api.request<unknown>('/me', { authenticated: true });
      if (generation !== this.generation) return;
      if (Date.parse(expected.expires_at) <= this.now()) { await this.clear(expiredMessage); return; }
      if (!isResource(result, isClientUser)) {
        throw new ApiError(200, 'invalid_response', 'El servidor devolvió una identidad no válida.');
      }
      this.update({ status: 'authenticated', user: result.data, expiresAt: expected.expires_at, message: null });
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await this.clear(error.message);
        return;
      }
      this.update({ status: 'error', user: null, expiresAt: expected.expires_at, message: errorMessage(error) });
    }
  });

  private async revoke(token: string): Promise<boolean> {
    try {
      const result = await this.api.revoke(token);
      return isRecord(result) && isRecord(result.data) && result.data.revoked === true;
    } catch {
      return false;
    }
  }

  login = (email: string, password: string): Promise<void> => this.exclusive(async generation => {
    if (generation !== this.generation || this.credential) return;
    if (this.deletion) {
      throw new ApiError(0, 'secure_storage', 'Espera a que termine el cierre de sesión.');
    }
    let device_name: string;
    try { device_name = await this.storage.deviceName(); } catch {
      throw new ApiError(0, 'secure_storage', 'No se pudo acceder al almacenamiento seguro. Reintenta.');
    }
    if (generation !== this.generation) return;
    const result = await this.api.request<unknown>('/auth/login', {
      method: 'POST', body: { email: email.trim(), password, device_name },
    });
    if (!isResource(result, isLoginData)) {
      throw new ApiError(201, 'invalid_response', 'El servidor devolvió una sesión no válida.');
    }
    const { data } = result;
    if (generation !== this.generation || Date.parse(data.expires_at) <= this.now()) {
      await this.revoke(data.access_token);
      if (generation === this.generation) throw new ApiError(401, 'expired_session', expiredMessage);
      return;
    }
    const credential = { access_token: data.access_token, expires_at: data.expires_at };
    try { await this.storage.write(JSON.stringify(credential)); } catch {
      const revoked = await this.revoke(credential.access_token);
      if (generation === this.generation) await this.clear(revoked ? null : unconfirmedLogout);
      throw new ApiError(0, 'secure_storage', 'No se pudo guardar la sesión de forma segura. Reintenta.');
    }
    if (generation !== this.generation) {
      await this.revoke(credential.access_token);
      return;
    }
    if (Date.parse(credential.expires_at) <= this.now()) {
      await this.clear(expiredMessage);
      throw new ApiError(401, 'expired_session', expiredMessage);
    }
    this.credential = credential;
    this.update({ status: 'authenticated', user: data.user, expiresAt: data.expires_at, message: null });
  });

  logout = (): Promise<void> => {
    if (this.closing) return this.closing;
    const previous = this.operation;
    const credential = this.credential;
    let generation: number;
    this.closing = Promise.resolve().then(async () => {
      const revoked = credential ? this.revoke(credential.access_token) : Promise.resolve(true);
      // Let an interrupted login finish touching storage before deleting the old record.
      await previous?.catch(() => {});
      const message = await revoked ? this.cleanupNotice : unconfirmedLogout;
      await this.removeStored(generation, message);
    }).finally(() => { this.closing = null; });
    generation = this.invalidate(this.cleanupNotice);
    return this.closing;
  };

  checkExpiration = () => {
    if (this.credential && Date.parse(this.credential.expires_at) <= this.now()) return this.clear(expiredMessage);
    return Promise.resolve();
  };
}
