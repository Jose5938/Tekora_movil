const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { isDemoCheckoutResource, submitDemoCheckout, choiceLabel } =
  require(join(process.env.TEKORA_TEST_BUILD, 'api/demo-checkout.js'));
const { getContext } = require('./fixtures/reservations.cjs');

const key = 'cdf84a3d-760a-4a1f-9de4-0e506e0b9ae7';
const base = {
  reservation_id: 17, method: null, status: 'not_selected', reference: null,
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
