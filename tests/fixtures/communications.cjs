const instant = '2026-11-20T14:00:00Z';
const currentMessage = { id: 3, inquiry_id: 42, is_mine: false, body: 'Mensaje recibido de prueba.', created_at: instant };
const olderMessage = { ...currentMessage, id: 2, body: 'Mensaje anterior de prueba.' };
const ownMessage = { id: 4, inquiry_id: 42, is_mine: true, body: 'Gracias por el seguimiento.', created_at: instant };
const conversation = { inquiry_id: 42, service_id: 21, service_title: 'Soporte de computadoras', status: 'accepted',
  unread_messages_count: 1, latest_message_id: 3, created_at: instant };
const notification = { id: 'inquiry:42', source_type: 'inquiry', source_id: 42, event: 'accepted',
  label: 'El prestador aceptó tu solicitud.', created_at: instant, read_at: null, resource: { type: 'inquiry', id: 42 } };
const cursor = 'opaque+cursor=&fixture';
const readToken = 'opaque-read-token-fixture';
const messagePage = (read = false, sent = false, older = false) => ({
  data: older ? [olderMessage] : sent ? [ownMessage, currentMessage] : [currentMessage],
  meta: {
    per_page: 20, next_cursor: older ? null : cursor, previous_cursor: older ? 'newer-fixture' : null,
    read_token: read || older ? null : readToken, last_read_message_id: read ? 3 : 0, unread_messages_count: read ? 0 : 1,
  },
});
module.exports = { instant, conversation, notification, cursor, readToken, ownMessage, messagePage };
