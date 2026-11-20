const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiError, retryDeadline } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const now = Date.parse('2026-11-20T22:00:00Z');
const error = (status, after) => new ApiError(status, 'fixture', 'Fixture', {}, after);

test('plazo Retry-After reconoce segundos y fecha en 429 y 503', () => {
  assert.equal(retryDeadline(error(429, '8'), now), now + 8000);
  assert.equal(retryDeadline(error(503, 'Fri, 20 Nov 2026 22:00:20 GMT'), now), now + 20000);
});

test('plazos inválidos, vencidos y otros errores conservan el reintento manual', () => {
  for (const value of [error(503, null), error(429, '0'), error(429, 'texto'), error(503, 'Sun, 06 Nov 1994 08:49:37 GMT'),
    error(500, '30'), new Error('sin red')]) assert.equal(retryDeadline(value, now), 0);
});
