/** Meet real usa xxx-xxxx-xxx. El fallback local usa slug + sufijo. */
export function meetUrlEsSimulado(
  urlAcceso?: string | null,
  calendarEventId?: string | null,
) {
  const url = (urlAcceso ?? "").trim();
  const cal = (calendarEventId ?? "").trim();
  if (!url) return true;
  if (cal.startsWith("gcal_") || cal.startsWith("sec-")) return true;
  return !/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:\?|$)/i.test(url);
}
