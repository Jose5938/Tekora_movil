const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { ApiClient } = require(join(process.env.TEKORA_TEST_BUILD, 'api/http.js'));
const { isConversations, isMessagePage, isNotifications, isUnreadCount, normalizeMessage,
  sendMessage, markMessagesRead, markNotificationRead } = require(join(process.env.TEKORA_TEST_BUILD, 'api/communications.js'));
const { instant, conversation, notification, readToken, ownMessage, messagePage } = require('./fixtures/communications.cjs');
const meta = { current_page:1, last_page:1, per_page:12, total:1 };
const key = 'fbd042b0-ab1b-46bb-920c-1527603c3be1';

function client(transport) {
  const api = new ApiClient(() => 'https://api.example.test/api/v1', transport);
  api.setSessionHandlers(() => 'communications-fixture', async () => {});
  return api;
}

test('bandejas privadas validan paginación, cursor, contador y referencia autorizada', () => {
  assert.ok(isConversations({data:[conversation],meta}));
  assert.ok(isMessagePage(messagePage()));
  assert.ok(isMessagePage(messagePage(true, true, true)));
  assert.equal(isMessagePage({...messagePage(),meta:{...messagePage().meta,read_token:1}}),false);
  assert.ok(isNotifications({data:[notification],meta}));
  assert.equal(isNotifications({data:[{...notification,resource:{type:'web',id:42}}],meta}),false);
  assert.equal(isNotifications({data:[{...notification,source_type:'activity'}],meta}),false);
  assert.ok(isUnreadCount({data:{unread_count:0}}));
  assert.equal(isUnreadCount({data:{unread_count:-1}}),false);
});

test('envío normaliza texto, conserva UUID y no reenvía automáticamente tras 503', async () => {
  const bodies = [];
  const api = client(async (url, req) => {
    assert.ok(url.endsWith('/inquiries/42/messages'));
    assert.equal(req.method,'POST');
    assert.equal(req.headers.Authorization,'Bearer communications-fixture');
    bodies.push(JSON.parse(req.body));
    return bodies.length === 1 ? new Response('',{status:503}) : Response.json({data:ownMessage},{status:201});
  });
  assert.equal(normalizeMessage('a\r\nb\rc '),'a\nb\nc');
  await assert.rejects(sendMessage(api,42,ownMessage.body,key),{status:503});
  assert.equal(bodies.length,1);
  assert.deepEqual(await sendMessage(api,42,ownMessage.body,key),ownMessage);
  assert.deepEqual(bodies,[{body:ownMessage.body,idempotency_key:key},{body:ownMessage.body,idempotency_key:key}]);
});

test('marcado usa token solo en cuerpo y el aviso usa el identificador compuesto', async () => {
  const api = client(async (url, req) => {
    assert.equal(req.method,'POST');
    assert.ok(!url.includes(readToken));
    if (url.endsWith('/inquiries/42/messages/read')) {
      assert.deepEqual(JSON.parse(req.body),{read_token:readToken});
      return Response.json({data:{inquiry_id:42,last_read_message_id:3}});
    }
    assert.ok(url.endsWith('/notifications/inquiry/42/read'));
    assert.deepEqual(JSON.parse(req.body),{});
    return Response.json({data:{...notification,read_at:instant}});
  });
  await markMessagesRead(api,42,readToken);
  await markNotificationRead(api,notification);
});

test('409 y 503 de lectura no se convierten en marcados confirmados', async () => {
  const conflict = client(async () => new Response('',{status:409}));
  const unavailable = client(async () => new Response('',{status:503}));
  await assert.rejects(markMessagesRead(conflict,42,readToken),{status:409});
  await assert.rejects(markNotificationRead(unavailable,notification),{status:503});
});
