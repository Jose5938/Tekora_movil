const { getQuote, getQuoteJourney, id: quoteId } = require('./quotes.cjs');
const now = '2026-11-20T14:05:00Z';
const availability = { service_id: 21, configured: true, timezone: 'America/Mexico_City',
  kind: 'informational_weekly_schedule', intervals: [{ weekday: 1, start_local: '09:00', end_local: '17:00' }],
  blocked_dates: [], queried_at: now };
const options = { ...availability, inquiry_id: 42, availability_revision: 11,
  min_date: '2026-11-20', max_date: '2027-01-20', duration_minutes: 60, guaranteed: false,
  commercial: { requires_accepted_quote: true, hold_seconds: 900, quotes_web_url: 'https://tekora.example.test/quotes',
    accepted_quotes: [{ id: quoteId, total_cents: 100000, currency: 'MXN', duration_minutes: 60,
      price_version: 2, accepted_at_utc: '2026-11-20 14:04:00.000000' }] },
};
const heldUntil = '2026-11-20T14:20:00Z';
const hold = { state: 'held', stored_state: 'held', version: 3, hold_seconds: 900,
  accepted_at: now, expires_at: heldUntil, remaining_seconds: 900 };
const getReadiness = (state = 'ready', integrated = state === 'simulated_checkout_required') => ({
  state, advisory_only: true, can_offer_mobile_confirmation: state === 'ready', reservation_id: 17,
  reservation_version: 8, observed_at: now, synthetic_web_requirement: state === 'web_checkout_required' ? 'required' : 'not_applicable',
  blocking_reasons: state === 'web_checkout_required' ? ['synthetic_web_checkout_required']
    : state === 'simulated_checkout_required' ? ['simulated_checkout_required'] : [],
  ...(integrated ? { simulated_checkout_required: true } : {}),
});
const getReservation = (status = 'requested') => ({
  id: 17, inquiry_id: 42, service_id: 21, status, version: status === 'requested' ? 7 : status === 'held' ? 8 : 9,
  timezone: availability.timezone, date: '2026-11-23', time: '10:00', end_time: '11:00',
  starts_at: '2026-11-23T16:00:00Z', ends_at: '2026-11-23T17:00:00Z', created_at: now,
  ...(status === 'held' ? { hold: { state: hold.state, version: hold.version, accepted_at: hold.accepted_at,
    expires_at: heldUntil, remaining_seconds: hold.remaining_seconds, server_now: now } } : {}),
  quote_id: quoteId, commercial_protocol: 'quoted-slot-hold-v1', idempotency_key_required: true,
});
const getContext = (status = 'held', readinessState = 'ready', integrated = readinessState === 'simulated_checkout_required') => {
  const { id, inquiry_id, version, starts_at, ends_at, timezone } = getReservation(status);
  return {
    reservation: { id, inquiry_id, version, starts_at, ends_at, timezone, status },
    client: { id: 4, name: 'Solicitante de prueba' },
    service: { id: 21, title: 'Soporte de computadoras' },
    provider: { id: 7, display_name: 'Prestador de prueba' },
    amount: getQuote().amount, quote: getQuote('accepted'),
    hold: status === 'held' ? hold : null, server_now: now,
    ...(status === 'held' || integrated ? {confirmation_readiness: {
      ...getReadiness(status === 'held' ? readinessState : status === 'confirmed' ? 'already_confirmed'
        : status === 'requested' ? 'awaiting_provider' : status, integrated), reservation_version: version,
    }} : {}),
    ...(integrated ? { simulated_checkout: { required: true, enabled: true, synthetic_only: true } } : {}),
    future_payment: { enabled: false, can_start: false, advisory_only: true,
      commercial_eligible: status === 'held', blocking_reasons: ['payments_not_enabled'] },
    confirmation_policy: { requires_verified_payment: false, protocol: 'quoted-slot-hold-v1' },
  };
};
const getReservationJourney = (status, readinessState = 'ready', integrated = readinessState === 'simulated_checkout_required') => {
  const journey = getQuoteJourney(getQuote('accepted'), true);
  const reservation = getReservation(status);
  const needsCheckout = status === 'held' && readinessState === 'simulated_checkout_required';
  const currentReadiness = status === 'held' ? readinessState : status === 'confirmed' ? 'already_confirmed' : status;
  return { ...journey, confirmation_readiness: status === 'held' || integrated
      ? { ...getReadiness(currentReadiness, integrated), reservation_version:reservation.version } : null,
    commercial: { ...journey.commercial, can_propose: false },
    next_action: { ...journey.next_action,
      code: needsCheckout ? 'choose_simulated_checkout' : status === 'held' ? 'confirm_reservation' : status === 'confirmed' ? 'wait_service' : 'wait_schedule_decision',
      stage: status === 'held' ? 'confirmation' : 'schedule', label: 'Siguiente paso de la reserva',
      reference: { type: 'reservation', id: reservation.id },
      interaction: status === 'held' ? 'navigate' : 'wait',
      mobile_execution_available: status === 'held',
    },
    reservation: {
      id: reservation.id, status, label: status, version: reservation.version,
      starts_at: reservation.starts_at, ends_at: reservation.ends_at, timezone: reservation.timezone,
      local_date: reservation.date, local_start: reservation.time, local_end: reservation.end_time,
      quote_id: quoteId, explicitly_completed: false,
      hold: status === 'held' ? { state: 'held', remaining_seconds: 900, duration_seconds: 900, expires_at: heldUntil } : null,
      actions: ['requested', 'held', 'confirmed'].includes(status) ? ['cancel', ...(status === 'held' ? [needsCheckout ? 'checkout' : 'commit'] : [])] : [],
      events: [], hold_events: [],
    },
  };
};
module.exports = { availability, options, getReservation, getContext, getReservationJourney, getReadiness };
