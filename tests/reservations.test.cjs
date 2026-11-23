const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { isAvailabilityResource, isOptionsResource, isReservationResource, isContextResource,
  observedHoldSeconds, civilDate, civilTime, proposeReservation, cancelReservation } =
  require(join(process.env.TEKORA_TEST_BUILD, 'api/reservations.js'));
const { availability, options, getReservation, getContext } = require('./fixtures/reservations.cjs');
const key = 'ae8869d8-9fed-438a-8b49-0bc70fd993cb';
const reply = (data, status = 200) => Response.json({ data }, { status });

function client(transport) {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', transport);
  api.setSessionHandlers(() => 'fixture-reservation-account', async () => {});
  return api;
}

test('disponibilidad distingue horario publicado, ausencia y opciones privadas con cotización', () => {
  assert.ok(isAvailabilityResource({ data: availability }));
  assert.ok(isAvailabilityResource({ data: { ...availability, configured: false, timezone: null, intervals: [] } }));
  assert.ok(isOptionsResource({ data: options }));
  assert.equal(isOptionsResource({ data: { ...options, availability_revision: 0 } }), false);
  assert.equal(civilDate('2026-02-31'), false);
  assert.equal(civilTime('24:00'), false);
});

test('contador respeta el menor plazo observado, con máximo de 900 y cero al vencer', () => {
  const context = getContext();
  assert.ok(isContextResource({ data: context }));
  assert.equal(observedHoldSeconds(context), 900);
  assert.equal(observedHoldSeconds({ ...context, server_now: '2026-11-20T14:19:45Z' }), 15);
  assert.equal(observedHoldSeconds({ ...context, server_now: context.hold.expires_at }), 0);
  assert.equal(observedHoldSeconds({ ...context, hold: null }), 0);
});

test('validadores cubren reservas de ambos protocolos y conservan la versión del servidor', () => {
  for (const status of ['requested', 'held', 'confirmed', 'hold_expired', 'hold_released', 'rejected', 'cancelled', 'completed']) {
    assert.ok(isReservationResource({ data: getReservation(status) }));
  }
  const { commercial_protocol, quote_id, ...legacy } = getReservation();
  assert.ok(isReservationResource({ data: legacy }));
  assert.equal(isReservationResource({ data: { ...legacy, version: 0 } }), false);
});

test('propuesta incluye fecha, hora civil, revisión y cotización explícita con UUID conservado', async () => {
  const proposal = { date: '2026-11-23', time: '10:00', availability_revision: 11, quote_id: options.commercial.accepted_quotes[0].id };
  let requests = 0;
  const api = client(async (url, req) => {
    assert.ok(url.endsWith('/inquiries/42/reservations'));
    assert.equal(req.method, 'POST');
    assert.deepEqual(JSON.parse(req.body), { ...proposal, idempotency_key: key });
    requests++;
    if (requests === 1) return Response.json({ error: {code:'temporarily_unavailable'} }, { status: 503 });
    return reply(getReservation(), 201);
  });
  await assert.rejects(proposeReservation(api, 42, proposal, key), { status: 503 });
  assert.equal(requests, 1);
  assert.equal((await proposeReservation(api, 42, proposal, key)).id, 17);
  assert.equal(requests, 2);
});

test('cancelación PATCH usa versión de reserva, requiere UUID comercial y acepta legacy sin UUID', async () => {
  let expected = { version: 8, idempotency_key: key };
  const api = client(async (url, req) => {
    assert.ok(url.endsWith('/reservations/17/cancel'));
    assert.equal(req.method, 'PATCH');
    assert.deepEqual(JSON.parse(req.body), expected);
    return reply(getReservation('cancelled'));
  });
  await assert.rejects(cancelReservation(api, getReservation('held')), { status: 422 });
  assert.equal((await cancelReservation(api, getReservation('held'), key)).status, 'cancelled');
  const { commercial_protocol, quote_id, ...legacy } = getReservation();
  expected = { version: 7 };
  await cancelReservation(api, legacy);
});
