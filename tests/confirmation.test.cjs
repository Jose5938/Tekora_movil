const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { canConfirmReservation, commitReservation, readReadiness, readinessLabels } =
  require(join(process.env.TEKORA_TEST_BUILD, 'api/confirmation.js'));
const { getReservation, getContext, getReadiness } = require('./fixtures/reservations.cjs');
const key = 'ae8869d8-9fed-438a-8b49-0bc70fd993cb';

test('solo readiness concordante con reserva, hold y plazo presenta confirmación', () => {
  const reservation = getReservation('held');
  const context = getContext();
  const ready = getReadiness();
  assert.equal(canConfirmReservation(reservation, context, ready, 900), true);
  for (const invalid of [null, undefined, {}, { ...ready, state:'future_state' },
    { ...ready, can_offer_mobile_confirmation:false }, { ...ready, reservation_version:3 },
    { ...ready, reservation_id:18 }, { ...ready, blocking_reasons:['server_clock_uncertain'] },
    { ...ready, synthetic_web_requirement:'required' }]) {
    assert.equal(canConfirmReservation(reservation, { ...context, confirmation_readiness:invalid }, ready, 900), false);
    assert.equal(canConfirmReservation(reservation, context, invalid, 900), false);
  }
  assert.equal(canConfirmReservation(reservation, context, ready, 0), false);
  assert.equal(canConfirmReservation(reservation, { ...context, hold:{ ...context.hold, version:5 } }, ready, 900), false);
  assert.equal(canConfirmReservation(getReservation('confirmed'), context, ready, 900), false);
  assert.equal(canConfirmReservation({ ...reservation, commercial_protocol:undefined }, context, ready, 900), false);
});

test('interpreta todos los estados conocidos y rechaza oferta de confirmación para los bloqueos', () => {
  for (const state of Object.keys(readinessLabels)) {
    const readiness = getReadiness(state);
    assert.equal(readReadiness(readiness)?.state, state);
    if (state !== 'ready') assert.equal(readReadiness({ ...readiness, can_offer_mobile_confirmation:true }), null);
  }
});

test('commit envía versión de reserva y UUID y no transforma replay terminal en confirmado', async () => {
  let status = 'cancelled';
  const api = new ApiClient(() => 'https://api.example.test/api/v1', async (url, req) => {
    assert.ok(url.endsWith('/reservations/17/commit'));
    assert.equal(req.method,'PATCH');
    assert.deepEqual(JSON.parse(req.body), { version:8, idempotency_key:key });
    return Response.json({data:getReservation(status)});
  });
  api.setSessionHandlers(() => 'synthetic-confirmation-credential', async () => {});
  assert.equal((await commitReservation(api, getReservation('held'), key)).status, 'cancelled');
  status = 'confirmed';
  assert.equal((await commitReservation(api, getReservation('held'), key)).status, 'confirmed');
});
