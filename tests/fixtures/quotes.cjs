const { journey, inquiry } = require('./inquiries.cjs');
const id = 'a552a878-0065-450d-a6d4-7c5077b1dea9';
const quoteAmount = {
  currency: 'MXN', total_cents: 100000, commission_cents: 15000, provider_cents: 85000,
  commission_included: true, commission_basis_points: 1500,
};
const amount = { ...quoteAmount, duration_minutes: 60, policy_version: 'synthetic-commercial-v1-15pct-half-up' };
const getQuote = (state = 'pending') => ({
  id, inquiry_id: inquiry.id, service_id: inquiry.service_id, provider_id: 7, client_id: 4,
  synthetic: true, price_version: 2, amount,
  issued_at: '2026-11-20T14:00:00Z', expires_at: '2026-11-21T14:00:00Z',
  acceptance_window_expired: state === 'expired', server_now: '2026-11-20T14:05:00Z',
  acceptance: { quote_id: id, state, accepted_at: state === 'accepted' ? '2026-11-20T14:04:00Z' : null, server_now: '2026-11-20T14:05:00Z' },
});
const getQuoteJourney = (quote, accepted) => ({
  ...journey,
  inquiry: { ...journey.inquiry, status: 'accepted', label: 'Aceptada' },
  commercial: {
    mode: 'quoted', can_issue: true, required_for_new_proposal: true, can_propose: accepted,
    quote: quote && { id, state: quote.acceptance.state, amount: quoteAmount,
      issued_at: quote.issued_at, expires_at: quote.expires_at, accepted_at: quote.acceptance.accepted_at },
    agreed_amount: accepted ? quoteAmount : null,
  },
  progress: { ...journey.progress, current_stage: accepted ? 'schedule' : 'agreement' },
  next_action: { ...journey.next_action,
    code: accepted ? 'propose_schedule' : quote ? 'review_quote' : 'issue_quote',
    stage: accepted ? 'schedule' : 'agreement',
    label: accepted ? 'Propón un horario' : quote ? 'Revisa y acepta tu cotización' : 'Consulta una cotización',
    description: 'Siguiente acción devuelta por el contrato de prueba.',
    interaction: 'navigate', reference: accepted || !quote ? { type: 'inquiry', id: inquiry.id } : { type: 'quote', id },
  },
});
module.exports = { id, getQuote, getQuoteJourney };
