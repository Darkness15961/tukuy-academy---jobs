/** Meta de certificados del alumno (código, PDF S3) compartida entre vistas del portal. */

export type MetaCertificadoAlumno = {
  codigo: string;
  fecha: string;
  horas: number;
  certificadoId?: string;
  claveAlmacenamiento?: string | null;
  organizacionEmisora?: string;
};

const metaPorCursoId = new Map<string, MetaCertificadoAlumno>();

export function reemplazarMetaCertificadosAlumno(
  entradas: Array<{ cursoId: string; meta: MetaCertificadoAlumno }>,
): void {
  metaPorCursoId.clear();
  for (const entrada of entradas) {
    metaPorCursoId.set(entrada.cursoId, entrada.meta);
  }
}

export function metaCertificadoAlumno(
  cursoId: string,
): MetaCertificadoAlumno | undefined {
  return metaPorCursoId.get(cursoId);
}

export function clavePdfCertificadoReal(
  clave: string | null | undefined,
): string | null {
  const limpia = clave?.trim();
  if (!limpia) return null;
  if (/^certificados\/[0-9a-f-]{36}\.pdf$/i.test(limpia)) return null;
  if (!limpia.startsWith("certificados/")) return null;
  return limpia.replace(/^s3:\/\//, "");
}

export async function abrirPdfCertificadoAlumno(opciones: {
  cursoId: string;
  fallback: () => Promise<void>;
  descargar?: boolean;
  nombreArchivo?: string;
}): Promise<void> {
  const meta = metaCertificadoAlumno(opciones.cursoId);
  const clave = clavePdfCertificadoReal(meta?.claveAlmacenamiento);
  if (clave) {
    try {
      const { storageAcademia } = await import("@/lib/storage-academia");
      const url = await storageAcademia.urlDescargaCertificado(clave);
      if (opciones.descargar) {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          opciones.nombreArchivo ??
          `certificado-${meta?.codigo ?? opciones.cursoId}.pdf`;
        a.rel = "noopener";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return;
    } catch {
      // fallback local
    }
  }
  await opciones.fallback();
}
