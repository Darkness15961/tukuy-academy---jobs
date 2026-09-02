const CLAVE_CERTIFICADO_PENDIENTE = "tukuy_certificado_curso_pendiente";

export function guardarCertificadoPendiente(cursoId: string) {
  if (!cursoId) return;
  sessionStorage.setItem(CLAVE_CERTIFICADO_PENDIENTE, cursoId);
}

export function consumirCertificadoPendiente(): string | null {
  const cursoId = sessionStorage.getItem(CLAVE_CERTIFICADO_PENDIENTE);
  sessionStorage.removeItem(CLAVE_CERTIFICADO_PENDIENTE);
  return cursoId?.trim() || null;
}

export function peekCertificadoPendiente(): string | null {
  return sessionStorage.getItem(CLAVE_CERTIFICADO_PENDIENTE)?.trim() || null;
}
