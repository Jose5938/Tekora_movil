const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const target = path => require(join(process.env.TEKORA_TEST_BUILD, 'api', path));
const { ApiClient } = target('http.js');
const { isJourneyResource } = target('inquiries.js');
const { readReadiness, canConfirmReservation } = target('confirmation.js');
const { isContextResource } = target('reservations.js');
const { quotePaymentView } = target('demo-checkout.js');
const { isIntegratedCheckoutResource, integratedCheckoutDisplay, submitIntegratedCheckout } = target('integrated-checkout.js');
const { getContext, getReadiness, getReservation, getReservationJourney } = require('./fixtures/reservations.cjs');
const { id: quoteId, getQuote } = require('./fixtures/quotes.cjs');

const key = 'cdf84a3d-760a-4a1f-9de4-0e506e0b9ae7';
const amount = getQuote().amount;
const approved = {
  reservation_id: 17, quote_id: quoteId, method: 'card', status: 'test_approved',
  reference: 'badc4e56-4ab1-4e93-8a49-3f3848852519',
  currency: 'MXN', amount_cents: amount.total_cents, commission_cents: amount.commission_cents,
  provider_cents: amount.provider_cents, attempted_at: '2026-11-20T14:05:02.000000Z',
  received_at: null, synthetic_only: true,
};
const status = {
  reservation_id: 17, attempt: null, synthetic_only: true, can_choose: true, can_confirm: false,
  server_now: '2026-11-20T14:05:00Z', expires_at: '2026-11-20T14:20:00Z',
};

test('Seguimiento V8.1.10 ofrece checkout conservando las validaciones de confirmación', () => {
  const context = getContext('held', 'simulated_checkout_required');
  const journey = getReservationJourney('held', 'simulated_checkout_required');
  assert.ok(isJourneyResource({ data: journey }));
  assert.ok(isContextResource({ data: context }));
  assert.equal(readReadiness(journey.confirmation_readiness).state, 'simulated_checkout_required');
  assert.equal(canConfirmReservation(getReservation('held'), context, journey.confirmation_readiness, 900), false);
  assert.equal(readReadiness({ ...journey.confirmation_readiness, can_offer_mobile_confirmation: true }), null);
  assert.equal(isContextResource({ data: { ...context, simulated_checkout: { ...context.simulated_checkout, synthetic_only: false } } }), false);
  const ready = getReadiness('ready', true);
  assert.ok(canConfirmReservation(getReservation('held'), getContext('held', 'ready', true), ready, 900));
  assert.equal(canConfirmReservation(getReservation('held'), getContext('held', 'ready', true), ready, 0), false);
});

test('GET integrado vincula intento a reserva, cotización, importe y datos sintéticos', () => {
  assert.ok(isIntegratedCheckoutResource({ data: status }));
  assert.ok(isIntegratedCheckoutResource({ data: { ...status, attempt: approved } }));
  for (const bad of [
    { ...approved, synthetic_only: false }, { ...approved, reservation_id: 18 },
    { ...approved, reference: 'folio no válido' }, { ...approved, status: 'cash_received' },
    { ...approved, provider_cents: amount.provider_cents + 1 },
  ]) assert.equal(isIntegratedCheckoutResource({ data: { ...status, attempt: bad } }), false);

  const view = integratedCheckoutDisplay({ ...status, attempt: approved, can_choose: false, can_confirm: true }, 'held', quoteId, amount);
  assert.equal(view.can_confirm, true);
  assert.equal(quotePaymentView(quoteId, view).tone, 'pending');
  assert.equal(integratedCheckoutDisplay({ ...status, attempt: { ...approved, amount_cents: amount.total_cents + 2 } },
    'held', quoteId, amount), null);
  assert.equal(integratedCheckoutDisplay({ ...status, attempt: approved }, 'held', key, amount), null);
  const receipt = integratedCheckoutDisplay({ ...status, attempt: approved }, 'confirmed', quoteId, amount);
  assert.equal(quotePaymentView(quoteId, receipt).label, 'Pagado (prueba)');
});

test('POST autenticado envía solo instrumento ficticio o efectivo y conserva UUID para el replay', async () => {
  const calls = [];
  const api = new ApiClient(() => 'https://api.tekora.example.test/api/v1', async (url, init) => {
    assert.equal(url, 'https://api.tekora.example.test/api/v1/reservations/17/checkout');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer synthetic');
    const payload = JSON.parse(init.body);
    calls.push(payload);
    return Response.json({ data: payload.method === 'card' ? approved : { ...approved, method: 'cash', status: 'awaiting_cash' } });
  });
  api.setSessionHandlers(() => 'synthetic', async () => {});
  const card = await submitIntegratedCheckout(api, 17, quoteId, amount, 'card', key);
  assert.equal((await submitIntegratedCheckout(api, 17, quoteId, amount, 'card', key)).reference, card.reference);
  assert.equal((await submitIntegratedCheckout(api, 17, quoteId, amount, 'cash', approved.reference)).status, 'awaiting_cash');
  assert.deepEqual(calls, [
    { method: 'card', instrument: 'tekora-test-card', idempotency_key: key },
    { method: 'card', instrument: 'tekora-test-card', idempotency_key: key },
    { method: 'cash', idempotency_key: approved.reference },
  ]);
  await assert.rejects(submitIntegratedCheckout(api, 17, key, amount, 'card', key), { code: 'invalid_response' });
});

test('el transporte mantiene demo-checkout fuera de servidores remotos aunque se active el laboratorio', async () => {
  const api = new ApiClient(() => 'https://api.tekora.example.test/api/v1', async () => assert.fail('contactó el servidor'), {
    allowLocalHttp: true, allowLocalDemoCheckout: true,
  });
  api.setSessionHandlers(() => 'synthetic', async () => {});
  for (const path of ['/reservations/17/demo-checkout', '/reservations/17/%64emo-checkout']) {
    await assert.rejects(api.request(path, { authenticated: true }), { code: 'demo_checkout_disabled' });
  }
});
