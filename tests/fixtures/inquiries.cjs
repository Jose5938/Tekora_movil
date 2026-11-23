// Synthetic complete examples of OpenAPI 1.4.0 at a21802f. No prod data.
const instant = '2026-11-20T14:00:00Z';
const inquiry = {
  id: 42, service_id: 21, service_title: 'Soporte de computadoras',
  message: 'Necesito ayuda con un equipo de prueba.', status: 'pending',
  created_at: instant, updated_at: instant,
  accepted_at: null, rejected_at: null, cancelled_at: null, completed_at: null,
};
const { accepted_at, rejected_at, cancelled_at, completed_at, ...summary } = inquiry;
const journey = {
  inquiry: { ...summary, label: 'Pendiente' },
  viewer_role: 'client',
  participants: { client: { name: 'Solicitante de prueba' }, provider: { id: 7, display_name: 'Prestador de prueba' } },
  progress: { current_stage: 'request', closed: false, steps: [
    { code: 'request', label: 'Solicitud', status: 'current' },
    { code: 'agreement', label: 'Acuerdo', status: 'pending' },
    { code: 'schedule', label: 'Horario', status: 'pending' },
    { code: 'confirmation', label: 'Confirmación', status: 'pending' },
    { code: 'service', label: 'Servicio', status: 'pending' },
  ] },
  next_action: {
    code: 'wait_inquiry_decision', stage: 'request', label: 'Espera la respuesta del prestador',
    description: 'Tu solicitud está enviada y el prestador aún no la ha aceptado.',
    reference: { type: 'inquiry', id: inquiry.id }, interaction: 'wait', mobile_execution_available: true,
  },
  commercial: { mode: 'legacy', required_for_new_proposal: false, quote: null, agreed_amount: null, can_issue: false, can_propose: false },
  reservation: null,
  review: { state: 'unavailable', eligible: false, reservation_id: null, record: null },
  closure: { inquiry_completed: false, can_close: false, explicit_service_completed: false },
  history: { inquiry: [{ label: 'Solicitud enviada', occurred_at: instant }], reservations: [], reservation_limit: 5 },
  conversation: { reference: { type: 'inquiry', id: inquiry.id }, unread_count: 0, can_send: true },
  payments: { enabled: false, required_for_confirmation: false, future_checkout_point: 'after_provider_acceptance_before_final_confirmation' },
  server_now: instant,
  confirmation_readiness: null,
};
const collection = { data: [inquiry], meta: { current_page: 1, per_page: 12, last_page: 1, total: 1 } };
module.exports = { inquiry, journey, collection };
