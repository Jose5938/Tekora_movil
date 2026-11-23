const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { isQuoteResource, isQuoteCollection, isJourneyCommercial, issueQuote, acceptQuote, mxn } =
  require(join(process.env.TEKORA_TEST_BUILD, 'api/quotes.js'));
const { id, getQuote, getQuoteJourney } = require('./fixtures/quotes.cjs');
const key = 'e10b67d7-89f9-4f1f-b45b-bbe796ebe44c';

function client(transport) {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', transport);
  api.setSessionHandlers(() => 'synthetic-quote-credential', async () => {});
  return api;
}

test('cotizaciones validan estado, moneda, importes y aceptación sin perder snapshots', () => {
  for (const state of ['pending', 'accepted', 'expired']) assert.equal(isQuoteResource({ data: getQuote(state) }), true);
  const quote = getQuote();
  assert.equal(isQuoteCollection({ data: [quote], meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 } }), true);
  assert.equal(isQuoteResource({ data: { ...quote, amount: null } }), false);
  assert.equal(isQuoteResource({ data: { ...quote, amount: { ...quote.amount, total_cents: 0 } } }), false);
  assert.equal(isQuoteResource({ data: { ...quote, acceptance: { ...quote.acceptance, quote_id: key } } }), false);
  assert.equal(isJourneyCommercial(getQuoteJourney(null, false).commercial), true);
  assert.equal(isJourneyCommercial(getQuoteJourney(getQuote('accepted'), true).commercial), true);
  assert.match(mxn(quote.amount.total_cents), /MXN\s+1,000\.00/);
});

test('emitir solo envía UUID y permite reintentar voluntariamente la misma intención tras 503', async () => {
  const bodies = [];
  const api = client(async (url, request) => {
    assert.match(url, /\/inquiries\/42\/quotes$/);
    assert.equal(request.headers.Authorization, 'Bearer synthetic-quote-credential');
    bodies.push(JSON.parse(request.body));
    if (bodies.length === 1) return Response.json({ error: { code: 'temporarily_unavailable' } }, { status: 503 });
    return Response.json({ data: getQuote() });
  });
  await assert.rejects(issueQuote(api, 42, key), { status: 503 });
  assert.equal(bodies.length, 1);
  assert.equal((await issueQuote(api, 42, key)).id, id);
  assert.deepEqual(bodies, [{ idempotency_key: key }, { idempotency_key: key }]);
});

test('aceptación explícita envía solo acknowledge y requiere el estado accepted del recurso solicitado', async () => {
  let accepted = false;
  const api = client(async (url, request) => {
    assert.ok(url.endsWith(`/quotes/${id}/accept`));
    assert.equal(request.method, 'POST');
    assert.deepEqual(JSON.parse(request.body), { acknowledge: true });
    return Response.json({ data: getQuote(accepted ? 'accepted' : 'pending') });
  });
  await assert.rejects(acceptQuote(api, id), { code: 'invalid_response' });
  accepted = true;
  assert.equal((await acceptQuote(api, id)).acceptance.state, 'accepted');
});

test('IDs inválidos y falta de sesión no causan escrituras', async () => {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', async () => assert.fail('se invocó el transporte'));
  await assert.rejects(issueQuote(api, 42, 'invalid'), { status: 422 });
  await assert.rejects(acceptQuote(api, 'bad-id'), { status: 404 });
  await assert.rejects(acceptQuote(api, id), { status: 401 });
});
