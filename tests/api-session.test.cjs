const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { ApiClient, ApiError } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { SessionController } = require(join(process.env.TEKORA_TEST_BUILD, 'auth/session.js'));
const { resourceId } = require(join(process.env.TEKORA_TEST_BUILD, 'api/types.js'));

// Synthetic fixtures only. No real account or token is used by this suite.
const user = { id: 4, name: 'Solicitante de prueba', email: 'cliente@example.test', experience: 'client', permissions: ['client.appointments.view'] };
const credential = { access_token: 'synthetic-test-credential', expires_at: '2030-02-01T18:00:00.000Z' };
const loginData = { ...credential, token_type: 'Bearer', user };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const failure = (status, code = 'test_error', fields = {}) => json({ error: { code, message: `Error ${status}`, fields } }, status);
function harness(handler) {
  const calls = [];
  const storage = {
    value: null, writes: [], removals: 0,
    async read() { return this.value; },
    async write(value) { this.value = value; this.writes.push(value); },
    async remove() { this.value = null; this.removals++; },
    async deviceName() { return 'Expo dispositivo sintético'; },
  };
  const api = new ApiClient(() => 'https://tekora.example.test/api/v1', async (url, options) => {
    calls.push({ url, options });
    if (handler) return handler(url, options);
    if (url.endsWith('/auth/login')) return json({ data: loginData }, 201);
    if (url.endsWith('/me')) return json({ data: user });
    if (url.endsWith('/auth/logout')) return json({ data: { revoked: true } });
    return json({ data: [], meta: { current_page: 1, per_page: 12, last_page: 1, total: 0 } });
  });
  let now = Date.parse('2029-01-01T00:00:00Z');
  const session = new SessionController(api, storage, () => now);
  return { api, session, storage, calls, setNow: value => { now = Date.parse(value); } };
}

test('login real: POST exacto, guarda solo credencial y expone identidad', async () => {
  const h = harness();
  await h.session.login(' cliente@example.test ', 'contraseña-sintética');
  assert.equal(h.session.getSnapshot().status, 'authenticated');
  assert.deepEqual(h.session.getSnapshot().user, user);
  assert.equal(h.calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(h.calls[0].options.body), { email: 'cliente@example.test', password: 'contraseña-sintética', device_name: 'Expo dispositivo sintético' });
  assert.equal(h.calls[0].options.headers.Authorization, undefined);
  assert.equal(h.calls[0].options.credentials, 'omit');
  assert.deepEqual(JSON.parse(h.storage.value), credential);
  assert.ok(!h.storage.value.includes('contraseña-sintética'));
  assert.ok(!h.storage.value.includes(user.email));
});

test('login incorrecto 401 no crea ni guarda sesión', async () => {
  const h = harness(() => failure(401, 'invalid_credentials'));
  await h.session.restore();
  await assert.rejects(h.session.login(user.email, 'incorrecta'), error => error.status === 401 && error.code === 'invalid_credentials');
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('doble pulsación de login produce una sola petición y un guardado', async () => {
  const h = harness();
  const first = h.session.login(user.email, 'sintética');
  const second = h.session.login(user.email, 'sintética');
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(h.calls.length, 1);
  assert.equal(h.storage.writes.length, 1);
});

test('transporte predeterminado conserva el contexto global de fetch', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = function () {
    assert.equal(this, globalThis);
    return Promise.resolve(json({ data: [] }));
  };
  try {
    const api = new ApiClient(() => 'https://tekora.example.test/api/v1');
    assert.deepEqual(await api.request('/services'), { data: [] });
  } finally { globalThis.fetch = original; }
});

test('no inicia sesión si la credencial expira durante el guardado seguro', async () => {
  const h = harness();
  h.storage.write = async value => { h.storage.value = value; h.setNow('2031-01-01T00:00:00Z'); };
  await assert.rejects(h.session.login(user.email, 'sintética'), error => error.code === 'expired_session');
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('restauración mantiene checking hasta /me y usa su identidad actual', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  h.storage.value = JSON.stringify(credential);
  const restoring = h.session.restore();
  await new Promise(done => setImmediate(done));
  assert.equal(h.session.getSnapshot().status, 'checking');
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.calls[0].url, 'https://tekora.example.test/api/v1/me');
  assert.equal(h.calls[0].options.headers.Authorization, `Bearer ${credential.access_token}`);
  resolve(json({ data: { ...user, name: 'Nombre actualizado' } }));
  await restoring;
  assert.equal(h.session.getSnapshot().user.name, 'Nombre actualizado');
});

test('credencial expirada al abrir: elimina sin llamar al servidor', async () => {
  const h = harness();
  h.storage.value = JSON.stringify({ ...credential, expires_at: '2020-01-01T00:00:00Z' });
  await h.session.restore();
  assert.equal(h.storage.value, null);
  assert.equal(h.calls.length, 0);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
});

test('expiración con app abierta elimina token y cierra acceso privado', async () => {
  const h = harness();
  await h.session.login(user.email, 'sintética');
  h.setNow('2031-01-01T00:00:00Z');
  await h.session.checkExpiration();
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
  await assert.rejects(h.api.request('/me', { authenticated: true }), error => error.status === 401);
});

test('no restaura identidad si expira mientras /me está pendiente', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  h.storage.value = JSON.stringify(credential);
  const restoring = h.session.restore();
  await new Promise(done => setImmediate(done));
  h.setNow('2031-01-01T00:00:00Z');
  resolve(json({ data: user }));
  await restoring;
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

for (const body of ['json', 'html']) test(`revocación 401 (${body}) elimina token incluso sin JSON`, async () => {
  const h = harness(() => body === 'json' ? failure(401, 'unauthenticated') : new Response('<html>Unauthorized</html>', { status: 401 }));
  h.storage.value = JSON.stringify(credential);
  await h.session.restore();
  assert.equal(h.storage.value, null);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
});

test('401 de una operación protegida durante sesión también cierra acceso', async () => {
  let rejected = false;
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) : rejected ? failure(401) : json({ data: user }));
  await h.session.login(user.email, 'sintética');
  rejected = true;
  await assert.rejects(h.api.request('/me', { authenticated: true }));
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('logout llama al servidor con Bearer, revoca y elimina localmente', async () => {
  const h = harness();
  await h.session.login(user.email, 'sintética');
  const first = h.session.logout();
  const second = h.session.logout();
  assert.equal(first, second);
  await first;
  const logout = h.calls.find(call => call.url.endsWith('/auth/logout'));
  assert.equal(logout.options.method, 'POST');
  assert.equal(logout.options.headers.Authorization, `Bearer ${credential.access_token}`);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('logout sin conexión: cierra localmente e informa revocación no confirmada', async () => {
  const h = harness(url => {
    if (url.endsWith('/auth/login')) return json({ data: loginData }, 201);
    throw new TypeError('offline');
  });
  await h.session.login(user.email, 'sintética');
  await h.session.logout();
  assert.equal(h.storage.value, null);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.match(h.session.getSnapshot().message, /No se pudo confirmar la revocación/);
});

test('acceso sin token no transmite peticiones protegidas', async () => {
  const h = harness();
  await h.session.restore();
  await assert.rejects(h.api.request('/me', { authenticated: true }), error => error.status === 401);
  assert.equal(h.calls.length, 0);
});

test('catálogo público y listas vacías no envían Bearer aunque haya sesión', async () => {
  const h = harness();
  await h.session.login(user.email, 'sintética');
  for (const path of ['/services', '/providers']) {
    const result = await h.api.request(path);
    assert.deepEqual(result.data, []);
    assert.equal(result.meta.total, 0);
    assert.equal(h.calls.at(-1).options.headers.Authorization, undefined);
  }
});

test('servicio inexistente 404 conserva sesión y expone código de error', async () => {
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) : failure(404, 'not_found'));
  await h.session.login(user.email, 'sintética');
  await assert.rejects(h.api.request('/services/99999'), error => error.status === 404 && error.code === 'not_found');
  assert.equal(h.session.getSnapshot().status, 'authenticated');
});

test('errores 401/403/404/409/422/429 interpretan code/message/fields y Retry-After', async () => {
  for (const status of [401, 403, 404, 409, 422, 429]) {
    const h = harness(() => json({ error: { code: `code_${status}`, message: 'Mensaje seguro', fields: { email: ['Revisa el correo'], ignored: 3 } } }, status, { 'Retry-After': '60' }));
    await assert.rejects(h.api.request('/services'), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.equal(error.code, `code_${status}`);
      assert.equal(error.message, 'Mensaje seguro');
      assert.deepEqual(error.fields, { email: ['Revisa el correo'] });
      assert.equal(error.retryAfter, '60');
      return true;
    });
  }
});

test('pérdida de conexión bloquea restauración; reintento usa /me sin acceso intermedio', async () => {
  let offline = true;
  const h = harness(() => { if (offline) throw new TypeError('offline'); return json({ data: user }); });
  h.storage.value = JSON.stringify(credential);
  await h.session.restore();
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.equal(h.session.getSnapshot().user, null);
  assert.ok(h.storage.value);
  offline = false;
  await h.session.restore();
  assert.equal(h.session.getSnapshot().status, 'authenticated');
});

test('403 por permisos revocados bloquea y borra sesión', async () => {
  const h = harness(() => failure(403));
  h.storage.value = JSON.stringify(credential);
  await h.session.restore();
  await new Promise(done => setImmediate(done));
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('revalidación al volver a primer plano detecta revocación', async () => {
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) : failure(401));
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
  assert.equal(h.session.getSnapshot().status, 'anonymous');
});

test('JSON corrupto o credencial inválida se elimina sin restaurar', async () => {
  for (const raw of ['invalid json', '{}', JSON.stringify({ ...credential, expires_at: 'invalid' })]) {
    const h = harness();
    h.storage.value = raw;
    await h.session.restore();
    assert.equal(h.session.getSnapshot().status, 'anonymous');
    assert.equal(h.storage.value, null);
    assert.equal(h.calls.length, 0);
  }
});

test('fallo al guardar en almacenamiento seguro intenta revocar y no abre sesión', async () => {
  const h = harness();
  h.storage.write = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(h.session.login(user.email, 'sintética'), error => error.code === 'secure_storage');
  assert.ok(h.calls.some(call => call.url.endsWith('/auth/logout')));
  assert.equal(h.session.getSnapshot().status, 'anonymous');
});

test('fallo al borrar almacenamiento bloquea acceso y reintenta borrado', async () => {
  const h = harness();
  await h.session.login(user.email, 'sintética');
  const remove = h.storage.remove.bind(h.storage);
  h.storage.remove = async () => { throw new Error('locked keychain'); };
  await h.session.logout();
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.equal(h.session.getSnapshot().user, null);
  h.storage.remove = remove;
  await h.session.restore();
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('cliente combina GET concurrentes; libera petición al terminar para reintento', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  const first = h.api.request('/services');
  const second = h.api.request('/services');
  assert.equal(first, second);
  resolve(json({ data: [] }));
  await first;
  assert.equal(h.calls.length, 1);
  const next = h.api.request('/services');
  resolve(json({ data: [] }));
  await next;
  assert.equal(h.calls.length, 2);
});

test('cliente no combina POST con cuerpos diferentes al mismo endpoint', async () => {
  const pending = [];
  const h = harness(() => new Promise(resolve => pending.push(resolve)));
  const first = h.api.request('/auth/login', { method: 'POST', body: { email: 'uno@example.test' } });
  const second = h.api.request('/auth/login', { method: 'POST', body: { email: 'dos@example.test' } });
  const duplicate = h.api.request('/auth/login', { method: 'POST', body: { email: 'uno@example.test' } });
  assert.notEqual(first, second);
  assert.equal(first, duplicate);
  assert.equal(h.calls.length, 2);
  pending[0](json({ data: 'first' }));
  pending[1](json({ data: 'second' }));
  assert.deepEqual(await Promise.all([first, second]), [{ data: 'first' }, { data: 'second' }]);
});

test('rechaza configuración ausente y URL con credenciales sin exponerlas', async () => {
  for (const url of [undefined, 'invalid', 'https://name:password@example.test/api/v1']) {
    const api = new ApiClient(() => url, async () => { throw new Error('should not send'); });
    await assert.rejects(api.request('/services'), error => error.code === 'configuration' && !error.message.includes('password'));
  }
});

test('IDs de navegación solo aceptan enteros positivos seguros', () => {
  for (const value of [undefined, ['1', '2'], '0', '-1', '1.5', 'abc', '9999999999999999999999999', '1/x']) assert.equal(resourceId(value), null);
  assert.equal(resourceId('21'), 21);
});

test('código de autenticación no registra credenciales ni usa almacenamiento inseguro', () => {
  for (const dir of ['src/auth', 'src/api']) {
    for (const name of readdirSync(dir).filter(name => /\.tsx?$/.test(name))) {
      const code = readFileSync(join(dir, name), 'utf8').replace(/\/\/.*$/gm, '');
      assert.doesNotMatch(code, /console\.(log|debug|info|warn|error)|AsyncStorage|localStorage|sessionStorage\.(setItem|getItem)|document\.cookie/);
    }
  }
  const native = readFileSync('src/auth/storage.ts', 'utf8');
  assert.match(native, /SecureStore\.setItemAsync/);
  assert.match(native, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
});
