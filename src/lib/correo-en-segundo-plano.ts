/** Envía correos sin bloquear el flujo principal ni mostrar error al usuario. */
export function correoEnSegundoPlano(
  promesa: Promise<{ ok: boolean; error?: string } | void>,
  contexto?: string,
) {
  void promesa
    .then((resultado) => {
      if (resultado && resultado.ok === false && import.meta.env.DEV) {
        console.warn(
          `[correo${contexto ? `: ${contexto}` : ""}]`,
          resultado.error ?? "falló el envío",
        );
      }
    })
    .catch((causa) => {
      if (import.meta.env.DEV) {
        console.warn(
          `[correo${contexto ? `: ${contexto}` : ""}]`,
          causa instanceof Error ? causa.message : causa,
        );
      }
    });
}
