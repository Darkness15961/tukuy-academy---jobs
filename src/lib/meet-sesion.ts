/** Meet real usa xxx-xxxx-xxx. El fallback local usa slug + sufijo. */
export function meetUrlEsSimulado(
  urlAcceso?: string | null,
  calendarEventId?: string | null,
) {
  const url = (urlAcceso ?? "").trim();
  if (!url) return true;
  // URL real de Meet siempre gana (aunque el calendar_event_id sea placeholder).
  if (/meet\.google\.com\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}(?:\?|$|\/)/i.test(url)) {
    return false;
  }
  const cal = (calendarEventId ?? "").trim();
  if (cal.startsWith("gcal_")) return true;
  return true;
}
