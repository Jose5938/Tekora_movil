const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { isDemoCheckoutResource, submitDemoCheckout, choiceLabel, quotePaymentView } =
  require(join(process.env.TEKORA_TEST_BUILD, 'api/demo-checkout.js'));
const { getContext } = require('./fixtures/reservations.cjs');
const { id: quoteId } = require('./fixtures/quotes.cjs');

const key = 'cdf84a3d-760a-4a1f-9de4-0e506e0b9ae7';
const base = {
  reservation_id: 17, quote_id: quoteId, reservation_status: 'held', selection_verified: false,
  method: null, status: 'not_selected', reference: null, attempted_at: null, received_at: null,
  can_choose: true, can_confirm: false, amount: getContext().amount,
  server_now: '2026-11-22T20:00:00Z', expires_at: '2026-11-22T20:15:00Z',
  remaining_seconds: 900, synthetic_only: true,
};
function client(transport) {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', transport);
  api.setSessionHandlers(() => 'synthetic-client-token', async () => {});
  return api;
}
test('respuesta del checkout ficticio valida identidad, dinero y estados sin exponer datos bancarios', () => {
  assert.equal(isDemoCheckoutResource({ data: base }), true);
  assert.equal(isDemoCheckoutResource({ data: { ...base, synthetic_only: false } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, quote_id: 'wrong' } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, selection_verified: 'true' } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, attempted_at: 'not-a-date' } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, reservation_id: 0 } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, amount: { ...base.amount, commission_basis_points: 0 } } }), false);
  assert.equal(isDemoCheckoutResource({ data: { ...base, remaining_seconds: 901 } }), false);
  assert.match(choiceLabel('awaiting_cash'), /pendiente/);
});
test('solo envía tarjetas ficticias fijas y un UUID para la misma intención', async () => {
  const requests = [];
  const api = client(async (url, init) => {
    assert.ok(url.endsWith('/reservations/17/demo-checkout'));
    assert.equal(init.headers.Authorization, 'Bearer synthetic-client-token');
    assert.equal(init.method, 'POST');
    requests.push(JSON.parse(init.body));
    return Response.json({ data: { ...base, method: 'card', status: 'test_approved',
      can_choose: false, can_confirm: true, reference: 'TK-TEST-EXAMPLE' } });
  });
  assert.equal((await submitDemoCheckout(api, 17, { method: 'card', scenario: 'approved' }, key)).status, 'test_approved');
  assert.deepEqual(requests, [{ method: 'card', card_number: '4242424242424242',
    expiry: '12/30', cvv: '123', idempotency_key: key }]);
  assert.ok(!JSON.stringify(base).includes('card_number'));
});
test('efectivo queda pendiente, no se marca como recibido', async () => {
  const api = client(async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body), { method: 'cash', idempotency_key: key });
    return Response.json({ data: { ...base, method: 'cash', status: 'awaiting_cash',
      can_choose: false, can_confirm: true } });
  });
  const result = await submitDemoCheckout(api, 17, { method: 'cash' }, key);
  assert.equal(result.status, 'awaiting_cash');
});
test('no se escribe con reserva o UUID inválidos y no se oculta un rechazo del servidor', async () => {
  const api = client(async (_url, _init) => Response.json({ error: { code: 'conflict' } }, { status: 409 }));
  await assert.rejects(submitDemoCheckout(api, -1, { method: 'cash' }, key), { status: 422 });
  await assert.rejects(submitDemoCheckout(api, 17, { method: 'cash' }, 'invalido'), { status: 422 });
  await assert.rejects(submitDemoCheckout(api, 17, { method: 'cash' }, key), { status: 409 });
});


test('Cotizaciones solo indica Pagado (prueba) para la cotización exacta y reserva confirmada', () => {
  const approved = { ...base, method: 'card', status: 'test_approved',
    selection_verified: true, reservation_status: 'confirmed', can_confirm: false };
  assert.equal(isDemoCheckoutResource({ data: approved }), true);
  assert.deepEqual(quotePaymentView(quoteId, approved), { label: 'Pagado (prueba)', tone: 'paid' });
  assert.equal(quotePaymentView('dac82fd0-0f68-4826-8e56-cf9883939d2a', approved), null);
  assert.equal(quotePaymentView(quoteId, { ...approved, selection_verified: false })?.label, 'Pago de prueba pendiente');
  assert.equal(quotePaymentView(quoteId, { ...approved, reservation_status: 'held' })?.tone, 'pending');
  assert.deepEqual(quotePaymentView(quoteId, { ...approved, reservation_status: 'cancelled' }),
    { label: 'Reserva cancelada · aprobación de prueba histórica', tone: 'warning' });
  assert.equal(quotePaymentView(quoteId, null), null);
});

test('Cotizaciones distingue efectivo pendiente de dinero recibido y rechazos', () => {
  const cash = { ...base, method: 'cash', status: 'awaiting_cash',
    selection_verified: true, reservation_status: 'confirmed' };
  assert.deepEqual(quotePaymentView(quoteId, cash), { label: 'Efectivo pendiente', tone: 'pending' });
  assert.equal(quotePaymentView(quoteId, { ...cash, status: 'cash_received' })?.label, 'Efectivo recibido (prueba)');
  assert.deepEqual(quotePaymentView(quoteId, { ...cash, reservation_status: 'cancelled' }),
    { label: 'Efectivo no recibido · reserva cancelada', tone: 'warning' });
  assert.equal(quotePaymentView(quoteId, { ...cash, method: 'card', status: 'declined',
    selection_verified: false })?.tone, 'warning');
  assert.equal(quotePaymentView(quoteId, { ...cash, method: 'card', status: 'temporary_failure',
    selection_verified: false })?.tone, 'warning');
});
