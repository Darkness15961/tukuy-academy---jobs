/** Extrae el ID de un enlace o ID crudo de YouTube. */
export function idVideoYoutube(entrada: string | null | undefined): string | null {
  const raw = String(entrada ?? "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const partes = url.pathname.split("/").filter(Boolean);
      if (
        (partes[0] === "embed" ||
          partes[0] === "shorts" ||
          partes[0] === "live" ||
          partes[0] === "v") &&
        partes[1] &&
        /^[\w-]{11}$/.test(partes[1])
      ) {
        return partes[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function urlEmbedYoutube(
  entrada: string | null | undefined,
): string | null {
  const id = idVideoYoutube(entrada);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
