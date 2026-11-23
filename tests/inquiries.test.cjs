const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const {
  inquiryLabels, inquiryMessageError, isInquiryCollection, isInquiryResource, isJourneyResource, openInquiry,
} = require(join(process.env.TEKORA_TEST_BUILD, 'api/inquiries.js'));
const { inquiry, journey, collection } = require('./fixtures/inquiries.cjs');

test('solicitudes aceptan los cinco estados y paginación, y rechazan elementos o timestamps inválidos', () => {
  assert.equal(isInquiryCollection(collection), true);
  for (const status of Object.keys(inquiryLabels)) {
    assert.equal(isInquiryResource({ data: { ...inquiry, status } }), true);
  }
  for (const invalid of [{ status: 'held' }, { id: 0 }, { accepted_at: 'invalid' }, { updated_at: null }]) {
    assert.equal(isInquiryResource({ data: { ...inquiry, ...invalid } }), false);
  }
  assert.equal(isInquiryCollection({ ...collection, data: [null] }), false);
});

test('journey permite la adición M2.1 opcional y rechaza otro rol, etapa, estado o referencia inválidos', () => {
  assert.equal(isJourneyResource({ data: journey }), true);
  const historical = { ...journey };
  delete historical.confirmation_readiness;
  assert.equal(isJourneyResource({ data: historical }), true);
  assert.equal(isJourneyResource({ data: { ...journey, viewer_role: 'provider' } }), false);
  assert.equal(isJourneyResource({ data: { ...journey, progress: { ...journey.progress, steps: [] } } }), false);
  assert.equal(isJourneyResource({ data: { ...journey, next_action: { ...journey.next_action, code: 'external_url' } } }), false);
  assert.equal(isJourneyResource({ data: { ...journey, next_action: { ...journey.next_action, reference: { type: 'inquiry', id: 0 } } } }), false);
});

test('validación de mensaje coincide con límites del contrato y cuenta caracteres Unicode', () => {
  for (const invalid of ['   ', 'a'.repeat(9), '🛠'.repeat(2001)]) assert.ok(inquiryMessageError(invalid));
  for (const valid of ['a'.repeat(10), '🛠'.repeat(2000)]) assert.equal(inquiryMessageError(valid), null);
});

test('POST de solicitud envía solamente mensaje y Bearer; reconoce 201 y recupera 200 sin inventar datos', async () => {
  for (const status of [200, 201]) {
    let calls = 0;
    const api = new ApiClient(() => 'https://api.example.test/api/v1', async (url, init) => {
      calls++;
      assert.equal(url, 'https://api.example.test/api/v1/services/21/inquiries');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, 'Bearer m22-fixture');
      assert.deepEqual(JSON.parse(init.body), { message: 'Necesito revisar este servicio.' });
      return Response.json({ data: inquiry }, { status });
    });
    api.setSessionHandlers(() => 'm22-fixture', async () => {});
    assert.deepEqual(await openInquiry(api, 21, '  Necesito revisar este servicio.  '), inquiry);
    assert.equal(calls, 1);
  }
});

test('no envía solicitudes sin sesión, con ID inválido, ni con mensajes inferiores al mínimo', async () => {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', async () => assert.fail('se invocó el transporte'));
  await assert.rejects(openInquiry(api, 21, 'Necesito revisar este servicio.'), { status: 401 });
  await assert.rejects(openInquiry(api, 0, 'Necesito revisar este servicio.'), { status: 404 });
  await assert.rejects(openInquiry(api, 21, 'breve'), { status: 422 });
});

test('rechaza respuestas con un servicio distinto y 503 sin reintentar la escritura', async () => {
  for (const reply of [
    Response.json({ data: { ...inquiry, service_id: 22 } }),
    Response.json({ error: { code: 'temporarily_unavailable' } }, { status: 503 }),
  ]) {
    let calls = 0;
    const api = new ApiClient(() => 'https://api.example.test/api/v1', async () => { calls++; return reply; });
    api.setSessionHandlers(() => 'm22-fixture', async () => {});
    await assert.rejects(openInquiry(api, 21, inquiry.message), { code: reply.ok ? 'invalid_response' : 'temporarily_unavailable' });
    assert.equal(calls, 1);
  }
});

test('API descarta el éxito privado que llega después de un cambio de credencial', async () => {
  let resolve;
  let token = 'fixture-account-one';
  const api = new ApiClient(() => 'https://api.example.test/api/v1', () => new Promise(done => { resolve = done; }));
  api.setSessionHandlers(() => token, async () => assert.fail('invalidó una sesión nueva'));
  const reading = api.request('/inquiries', { authenticated: true });
  token = 'fixture-account-two';
  resolve(Response.json(collection));
  await assert.rejects(reading, { status: 401 });
});
