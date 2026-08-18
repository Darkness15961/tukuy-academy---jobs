const FOTOS_PERFIL_DEMO = [
  "/img/vistasimg/perfilfoto.png",
  "perfilfoto.png",
];

export function urlFotoPerfilReal(url?: string | null): string | undefined {
  const valor = url?.trim();
  if (!valor) return undefined;
  const normalizada = valor.split("?")[0]?.toLowerCase() ?? "";
  if (
    FOTOS_PERFIL_DEMO.some(
      (demo) =>
        valor === demo ||
        normalizada.endsWith(demo) ||
        normalizada.includes("/vistasimg/perfilfoto"),
    )
  ) {
    return undefined;
  }
  return valor;
}

export function inicialesNombre(
  nombre?: string | null,
  respaldo = "TU",
): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  const letras = `${partes[0]?.[0] ?? ""}${partes[1]?.[0] ?? ""}`.toUpperCase();
  return letras || respaldo;
}
