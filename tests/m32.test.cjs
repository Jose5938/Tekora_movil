const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const load = name => require(join(process.env.TEKORA_TEST_BUILD, 'api', name));
const { ApiClient, PROFILE_PHOTO_LIMIT } = load('http');
const { catalogPath, isCategories } = load('catalog');
const { identityCommand, identityErrors } = load('identity');
const { acceptedProfile, isProfileResource, photoDataUri, photoInputError, saveProfileName } = load('profile');
const { isPublicReviewPage, isOwnReviewResource, publishReview, withdrawReview } = load('reviews');

const profile = { id: 3, name: 'Lía', email: 'cliente@example.test', age: 29, gender: 'Otro',
  email_verified: true, photo_url: '/api/v1/me/photo' };
const review = { id: 23, reservation_id: 4, service_id: 11, service_title: 'Asesoría', rating: 5,
  comment: null, status: 'published', created_at: '2026-11-23T12:00:00Z', withdrawn_at: null };
const meta = { current_page: 1, last_page: 1, per_page: 5, total: 0, average_rating: null };

function client(respond, token = () => 'synthetic') {
  const calls = [];
  const api = new ApiClient(() => 'https://tekora.example.test/api/v1', async (url, init) => {
    calls.push({ path: new URL(url).pathname, init });
    return respond(init, url);
  });
  api.setSessionHandlers(token, async () => {});
  return { api, calls };
}

test('catalog requests omit blank searches and use real category slugs', () => {
  assert.equal(catalogPath('/providers', 1, '  '), '/providers?page=1');
  assert.equal(catalogPath('/services', 2, '  José & equipo ', 'diseno'), '/services?page=2&q=Jos%C3%A9+%26+equipo&category=diseno');
  assert.ok(isCategories({ data: [{ id: 1, name: 'Diseño', slug: 'diseno' }] }));
  assert.equal(isCategories({ data: [{ id: 1, name: 'Diseño', slug: '' }] }), false);
});

test('registration and reset use only documented fields without a bearer token', async () => {
  const { api, calls } = client(() => Response.json({ data: { message: 'Solicitud recibida.' } }));
  const credentials = { token: ' opaque+/= ', password: 'contraseña0', confirmation: 'contraseña0' };
  await identityCommand(api, 'register', ' CLIENTE@EXAMPLE.TEST ');
  await identityCommand(api, 'register', ' cliente@example.test ', credentials, { name: ' Lía ', age: '29', gender: 'Otro' });
  await identityCommand(api, 'recover', 'cliente@example.test');
  await identityCommand(api, 'recover', 'cliente@example.test', credentials);
  assert.deepEqual(calls.map(({ path }) => path), [
    '/api/v1/auth/register', '/api/v1/auth/register/confirm', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password',
  ]);
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'cliente@example.test' });
  assert.deepEqual(JSON.parse(calls[1].init.body), { email: 'cliente@example.test',
    token: 'opaque+/=', password: 'contraseña0', password_confirmation: 'contraseña0', name: 'Lía', age: 29, gender: 'Otro' });
  assert.deepEqual(Object.keys(JSON.parse(calls[3].init.body)), ['email', 'token', 'password', 'password_confirmation']);
  assert.ok(calls.every(({ init }) => !init.headers.Authorization && init.redirect === 'error' && init.credentials === 'omit'));
  assert.ok(identityErrors('cliente@example.test', { ...credentials, password: '🟦'.repeat(19) }).password);
  assert.ok(identityErrors('cliente@example.test', { ...credentials, password: 'a\0bcdefg' }).password);
  assert.ok(identityErrors('cliente@example.test', credentials, { name: '', age: '1.8', gender: '' }).age);
  assert.deepEqual(identityErrors('cliente@example.test', { ...credentials, password: '🟦'.repeat(18), confirmation: '🟦'.repeat(18) }), {});
});

test('identity does not treat an unexpected response as confirmation', async () => {
  const { api } = client(() => Response.json({ data: { message: 123 } }, { status: 202 }));
  await assert.rejects(identityCommand(api, 'register', 'cliente@example.test'), { code: 'invalid_response' });
});

test('profile reads only the authenticated account and writes name only', async () => {
  assert.ok(isProfileResource({ data: profile }));
  assert.equal(isProfileResource({ data: { ...profile, photo_url: 'https://other.example.test/private' } }), false);
  assert.throws(() => acceptedProfile({ data: profile }, 33), { code: 'invalid_response' });
  const { api, calls } = client(() => Response.json({ data: profile }));
  await assert.rejects(saveProfileName(api, 3, '  '), { status: 422 });
  await assert.rejects(saveProfileName(api, 33, 'Lía'), { code: 'invalid_response' });
  assert.deepEqual(await saveProfileName(api, 3, ' Lía '), profile);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].path, '/api/v1/me/profile');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer synthetic');
  assert.deepEqual(JSON.parse(calls[1].init.body), { name: 'Lía' });
});

test('private photo uses authenticated multipart and same-origin bytes without trusting photo URLs', async () => {
  const bytes = new Uint8Array([200, 210, 10, 19]);
  const { api, calls } = client(init => init.method === 'GET' ?
    new Response(bytes, { headers: { 'Content-Type': 'image/png', 'Content-Length': '4' } })
    : Response.json({ data: profile }));
  const photo = await api.readProfilePhoto();
  assert.equal(photoDataUri(photo.mime, photo.bytes), 'data:image/png;base64,' + Buffer.from(bytes).toString('base64'));
  const body = new FormData();
  body.append('photo', new Blob([bytes], { type: 'image/png' }), 'test.png');
  assert.deepEqual(await api.uploadProfilePhoto(body), { data: profile });
  assert.ok(calls.every(({ path, init }) => path === '/api/v1/me/photo' && init.cache === 'no-store' &&
    init.headers.Authorization === 'Bearer synthetic' && init.redirect === 'error'));
  assert.equal(calls[1].init.body, body);
  assert.equal(calls[1].init.headers['Content-Type'], undefined);
  assert.ok(photoInputError('image/gif', 40));
  assert.ok(photoInputError('image/jpeg', PROFILE_PHOTO_LIMIT + 1));
  assert.equal(photoInputError('image/webp', PROFILE_PHOTO_LIMIT), null);
});

test('private photo rejects anonymous requests, redirects, unsafe MIME, oversized bytes and stale sessions', async () => {
  const { api: noSession, calls } = client(() => { throw new Error('Unexpected request'); }, () => null);
  await assert.rejects(noSession.readProfilePhoto(), { status: 401 });
  await assert.rejects(noSession.uploadProfilePhoto(new FormData()), { status: 401 });
  assert.equal(calls.length, 0);
  for (const [response, code] of [
    [new Response(null, { status: 307, headers: { Location: 'https://other.example.test' } }), 'unsafe_redirect'],
    [new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }), 'invalid_photo'],
    [new Response(new Uint8Array(PROFILE_PHOTO_LIMIT + 1), { headers: { 'Content-Type': 'image/png' } }), 'invalid_photo'],
  ]) {
    await assert.rejects(client(() => response).api.readProfilePhoto(), { code });
  }
  let token = 'old';
  const stale = client(() => {
    token = 'new';
    return new Response(new Uint8Array([0]), { headers: { 'Content-Type': 'image/png' } });
  }, () => token);
  await assert.rejects(stale.api.readProfilePhoto(), { status: 401 });
});

test('reviews accept the public pagination contract and refuse unbound private results', async () => {
  assert.ok(isPublicReviewPage({ data: [], meta }));
  assert.ok(isPublicReviewPage({ data: [{ rating: 5, comment: null, month: '2026-11', service_id: 11,
    service_title: 'Asesoría' }], meta: { ...meta, total: 1, average_rating: 5 } }));
  assert.equal(isPublicReviewPage({ data: [], meta: { ...meta, total: 1 } }), false);
  assert.equal(isOwnReviewResource({ data: { ...review, status: 'hidden' } }), false);
  await assert.rejects(publishReview(client(() => Response.json({ data: review })).api, 9, { rating: 5, comment: null }),
    { code: 'invalid_response' });
  await assert.rejects(withdrawReview(client(() => Response.json({ data: review })).api, 23),
    { code: 'invalid_response' });
});

test('review replay sends the same immutable payload and withdrawal uses the dedicated action', async () => {
  let attempts = 0;
  const { api, calls } = client(init => init.method === 'PATCH' ? Response.json({
    data: { ...review, status: 'withdrawn', withdrawn_at: '2026-11-23T12:01:00Z' },
  }) : Response.json({ data: review }, { status: attempts++ === 0 ? 201 : 200 }));
  await assert.rejects(publishReview(api, 4, { rating: 6, comment: null }), { status: 422 });
  await assert.rejects(publishReview(api, 4, { rating: 3, comment: 'a'.repeat(1001) }), { status: 422 });
  const input = { rating: 5, comment: null };
  assert.deepEqual(await publishReview(api, 4, input), await publishReview(api, 4, input));
  assert.equal(calls[0].path, '/api/v1/reservations/4/review');
  assert.equal(calls[0].init.body, calls[1].init.body);
  assert.equal((await withdrawReview(api, 23)).status, 'withdrawn');
  assert.equal(calls[2].path, '/api/v1/reviews/23/withdraw');
  assert.equal(calls[2].init.body, undefined);
});
