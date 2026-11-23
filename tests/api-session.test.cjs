const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { readFileSync, readdirSync } = require('node:fs');
const { ApiClient, ApiError } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { SessionController } = require(join(process.env.TEKORA_TEST_BUILD, 'auth/session.js'));
const { resourceId, isProviderCollection, isServiceCollection, isProviderResource, isServiceResource } = require(join(process.env.TEKORA_TEST_BUILD, 'api/types.js'));

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

test('revalidación mantiene checking hasta /me y usa su identidad actual', async () => {
  let resolve;
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    new Promise(done => { resolve = done; }));
  await h.session.login(user.email, 'sintética');
  const restoring = h.session.revalidate();
  await new Promise(done => setImmediate(done));
  assert.equal(h.session.getSnapshot().status, 'checking');
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.calls.at(-1).url, 'https://tekora.example.test/api/v1/me');
  assert.equal(h.calls.at(-1).options.headers.Authorization, `Bearer ${credential.access_token}`);
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
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    new Promise(done => { resolve = done; }));
  await h.session.login(user.email, 'sintética');
  const restoring = h.session.revalidate();
  await new Promise(done => setImmediate(done));
  h.setNow('2031-01-01T00:00:00Z');
  resolve(json({ data: user }));
  await restoring;
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

for (const body of ['json', 'html']) test(`revocación 401 (${body}) elimina token incluso sin JSON`, async () => {
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    body === 'json' ? failure(401, 'unauthenticated') : new Response('<html>Unauthorized</html>', { status: 401 }));
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
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

test('pérdida de conexión bloquea revalidación; reintento usa /me sin acceso intermedio', async () => {
  let offline = true;
  const h = harness(url => {
    if (url.endsWith('/auth/login')) return json({ data: loginData }, 201);
    if (offline) throw new TypeError('offline');
    return json({ data: user });
  });
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.equal(h.session.getSnapshot().user, null);
  assert.ok(h.storage.value);
  offline = false;
  await h.session.restore();
  assert.equal(h.session.getSnapshot().status, 'authenticated');
});

test('403 por permisos revocados bloquea y borra sesión', async () => {
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) : failure(403));
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
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

test('distribución rechaza HTTP antes de entregar contraseña o Bearer al transporte', async () => {
  let calls = 0;
  const api = new ApiClient(() => 'http://192.168.1.20:8013/api/v1', async () => { calls++; return json({}); });
  api.setSessionHandlers(() => credential.access_token, async () => {});
  const reject = { code: 'insecure_transport' };
  await assert.rejects(api.request('/auth/login', { method: 'POST', body: { password: 'fixture' } }), reject);
  await assert.rejects(api.request('/me', { authenticated: true }), reject);
  await assert.rejects(api.revoke(credential.access_token), reject);
  await assert.rejects(api.readProfilePhoto(), reject);
  await assert.rejects(api.uploadProfilePhoto(new FormData()), reject);
  for (const path of ['/auth/register', '/auth/register/confirm', '/auth/forgot-password', '/auth/reset-password']) {
    await assert.rejects(api.request(path, { method: 'POST', body: { email: 'fixture@example.test' } }), reject);
  }
  assert.equal(calls, 0);
});

test('HTTP explícito admite loopback y LAN privada literal; excluye hosts públicos y nombres arbitrarios', async () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '10.0.2.2', '172.16.0.2', '192.168.1.20']) {
    const base = `http://${host}:8013/api/v1`;
    const api = new ApiClient(() => base, async (url, init) => {
      assert.equal(url, `${base}/auth/login`);
      assert.equal(init.redirect, 'error');
      return json({ data: loginData }, 201);
    }, { allowLocalHttp: true });
    await api.request('/auth/login', { method: 'POST', body: { password: 'fixture' } });
  }
  for (const host of ['localhost.example.test', '192.168.1.20.example.test', '172.32.0.2', '8.8.8.8']) {
    const api = new ApiClient(() => `http://${host}/api/v1`, async () => assert.fail('invocó el transporte'), { allowLocalHttp: true });
    await assert.rejects(api.request('/auth/login', { method: 'POST', body: { password: 'fixture' } }), { code: 'insecure_transport' });
  }
});

test('HTTPS usa redirect error y rechaza un 307 antes de consumir su respuesta', async () => {
  let calls = 0;
  const api = new ApiClient(() => 'https://tekora.example.test/api/v1', async (url, init) => {
    calls++;
    assert.equal(url, 'https://tekora.example.test/api/v1/auth/login');
    assert.equal(init.redirect, 'error');
    return new Response(null, { status: 307, headers: { Location: 'http://example.test/elsewhere' } });
  });
  await assert.rejects(api.request('/auth/login', { method: 'POST', body: { password: 'fixture' } }), { code: 'unsafe_redirect' });
  assert.equal(calls, 1);
});

test('logout bloquea acceso inmediatamente; doble fallo y reinicio nunca reutilizan el token', async () => {
  let finish;
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    new Promise((_, reject) => { finish = reject; }));
  await h.session.login(user.email, 'sintética');
  h.storage.remove = async () => { throw new Error('keychain unavailable'); };
  h.storage.write = async () => { throw new Error('keychain unavailable'); };
  const logout = h.session.logout();
  assert.equal(h.session.getSnapshot().user, null);
  assert.equal(h.session.getSnapshot().status, 'checking');
  await assert.rejects(h.api.request('/me', { authenticated: true }), { status: 401 });
  finish(new TypeError('offline'));
  await logout;
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.match(h.session.getSnapshot().message, /No se pudo confirmar la revocación/);
  assert.equal(JSON.parse(h.storage.value).access_token, credential.access_token);

  const nextApi = new ApiClient(() => 'https://tekora.example.test/api/v1', async () => assert.fail('reutilizó la credencial'));
  const restarted = new SessionController(nextApi, h.storage);
  for (let attempt = 0; attempt < 2; attempt++) {
    await restarted.restore();
    assert.equal(restarted.getSnapshot().status, 'error');
    assert.equal(restarted.getSnapshot().user, null);
    await assert.rejects(nextApi.request('/me', { authenticated: true }), { status: 401 });
  }
  h.storage.remove = async () => { h.storage.value = null; };
  await restarted.restore();
  assert.equal(restarted.getSnapshot().status, 'anonymous');
});

test('credencial persistida válida de otro proceso se elimina sin restaurar la cuenta', async () => {
  const h = harness();
  h.storage.value = JSON.stringify(credential);
  await h.session.restore();
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.calls.length, 0);
  assert.equal(h.storage.value, null);
});

test('respuesta tardía de /me después de logout no restablece identidad', async () => {
  let finish;
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    url.endsWith('/auth/logout') ? json({ data: { revoked: true } }) :
      new Promise(resolve => { finish = resolve; }));
  await h.session.login(user.email, 'sintética');
  const checking = h.session.revalidate();
  await new Promise(resolve => setImmediate(resolve));
  const logout = h.session.logout();
  assert.equal(h.session.getSnapshot().user, null);
  finish(json({ data: user }));
  await Promise.all([checking, logout]);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
});

test('logout durante guardado espera la escritura tardía y elimina su credencial', async () => {
  let stored;
  let finish;
  const h = harness();
  h.storage.write = value => new Promise(resolve => {
    stored = value;
    finish = () => { h.storage.value = value; resolve(); };
  });
  const login = h.session.login(user.email, 'sintética');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(stored);
  const logout = h.session.logout();
  finish();
  await Promise.all([login, logout]);
  assert.equal(h.session.getSnapshot().status, 'anonymous');
  assert.equal(h.storage.value, null);
  assert.equal(h.calls.at(-1).options.headers.Authorization, `Bearer ${credential.access_token}`);
});

test('login y revalidación rechazan un 200 JSON sin identidad válida', async () => {
  const malformed = harness(() => json({ metadata: {} }));
  await malformed.session.restore();
  await assert.rejects(malformed.session.login(user.email, 'sintética'), { code: 'invalid_response' });
  assert.equal(malformed.storage.value, null);
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) : json({ data: { id: 4 } }));
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.equal(h.session.getSnapshot().user, null);
});

test('validadores de catálogo rechazan envolturas, elementos y paginación incompletos', () => {
  const provider = { id: 7, display_name: 'Fixture', headline: null, bio: null };
  const service = { id: 21, title: 'Fixture', description: 'Descripción', modality: 'remote',
    category: { id: 1, name: 'Fixture', slug: 'fixture' }, provider };
  const meta = { current_page: 1, per_page: 12, last_page: 1, total: 1 };
  for (const [list, detail, item] of [[isProviderCollection, isProviderResource, provider], [isServiceCollection, isServiceResource, service]]) {
    assert.equal(list({ data: [item], meta }), true);
    assert.equal(list({ data: [], meta: { ...meta, total: 0 } }), true);
    for (const value of [null, {}, { data: item, meta }, { data: [] }, { data: [null], meta },
      { data: [item], meta: { ...meta, last_page: 0 } }]) assert.equal(list(value), false);
    assert.equal(detail({ data: item }), true);
    assert.equal(detail({ data: {} }), false);
  }
  assert.equal(isServiceResource({ data: { ...service, category: null } }), false);
  assert.equal(isServiceResource({ data: { ...service, price: null } }), true);
});

test('503 JSON conserva código y Retry-After y bloquea la revalidación', async () => {
  const h = harness(url => url.endsWith('/auth/login') ? json({ data: loginData }, 201) :
    json({ error: { code: 'temporarily_unavailable', message: 'Tekora está temporalmente fuera de servicio.' } }, 503, { 'Retry-After': '30' }));
  await assert.rejects(h.api.request('/services'), { status: 503, code: 'temporarily_unavailable', retryAfter: '30' });
  await h.session.login(user.email, 'sintética');
  await h.session.revalidate();
  assert.equal(h.session.getSnapshot().status, 'error');
  assert.equal(h.session.getSnapshot().user, null);
});

test('503 sin JSON conserva Retry-After y usa un mensaje seguro', async () => {
  const h = harness(() => new Response('<html>Unavailable</html>', { status: 503, headers: { 'Retry-After': '45' } }));
  await assert.rejects(h.api.request('/services'), {
    status: 503, code: 'temporarily_unavailable', retryAfter: '45',
    message: 'Tekora no está disponible temporalmente. Inténtalo más tarde.',
  });
});

test('un 401 tardío de la cuenta anterior no invalida la sesión nueva', async () => {
  let finish;
  const secondUser = { ...user, id: 5, email: 'otro@example.test' };
  const h = harness((url, init) => {
    if (url.endsWith('/auth/login')) return json({ data: JSON.parse(init.body).email === user.email ?
      loginData : { ...loginData, user: secondUser, access_token: 'second-fixture' } }, 201);
    if (url.endsWith('/auth/logout')) return json({ data: { revoked: true } });
    return new Promise(resolve => { finish = resolve; });
  });
  await h.session.login(user.email, 'sintética');
  const oldRequest = h.api.request('/me', { authenticated: true });
  await h.session.logout();
  await h.session.login(secondUser.email, 'sintética');
  finish(failure(401));
  await assert.rejects(oldRequest, { status: 401 });
  assert.deepEqual(h.session.getSnapshot().user, secondUser);
});
