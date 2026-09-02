import { supabasePrincipal } from "@/lib/supabase";
import { env } from "@/lib/env";

export type PlantillaCorreoApp =
  | "nodo_asignado"
  | "matricula_curso"
  | "clase_programada"
  | "recordatorio_clase"
  | "certificado_emitido";

export type DatosCorreoNodoAsignado = {
  nombrePersona: string;
  nombreOrganizacion: string;
  nombreNodo: string;
  urlPortal?: string;
};

export type DatosCorreoMatricula = {
  nombrePersona: string;
  nombreCurso: string;
  nombreOrganizacion?: string;
  urlCurso?: string;
  urlPortal?: string;
  /** Próxima sesión en vivo (si el curso tiene Meet programado). */
  tituloClase?: string;
  fechaHora?: string;
  urlMeet?: string;
};

export type DatosCorreoClase = {
  nombrePersona: string;
  tituloClase: string;
  nombreCurso?: string;
  fechaHora: string;
  urlMeet?: string;
  urlCurso?: string;
  urlPortal?: string;
  anticipacion?: string;
};

export type DatosCorreoCertificado = {
  nombrePersona: string;
  nombreCurso: string;
  codigoVerificacion?: string;
  urlVerificacion?: string;
  urlPortal?: string;
};

function urlBase() {
  return env.appUrl.replace(/\/$/, "");
}

function parsearCorreos(raw: string | string[] | undefined | null): string[] {
  if (!raw) return [];
  const lista = Array.isArray(raw) ? raw : raw.split(/[,;\s]+/);
  return [
    ...new Set(
      lista
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.includes("@")),
    ),
  ];
}

/**
 * Correos transaccionales vía Edge Function `enviar-correo` (SMTP cPanel).
 * No bloquea el flujo de negocio si falla el envío: el caller decide el toast.
 */
export const notificacionesCorreoService = {
  async enviarNodoAsignado(entrada: {
    para: string;
    datos: DatosCorreoNodoAsignado;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.enviar({
      plantilla: "nodo_asignado",
      para: entrada.para,
      datos: {
        ...entrada.datos,
        urlPortal: entrada.datos.urlPortal ?? urlBase(),
      },
    });
  },

  async enviarMatriculaCurso(entrada: {
    para: string;
    datos: DatosCorreoMatricula;
  }): Promise<{ ok: boolean; error?: string }> {
    const base = urlBase();
    return this.enviar({
      plantilla: "matricula_curso",
      para: entrada.para,
      datos: {
        ...entrada.datos,
        urlPortal: entrada.datos.urlPortal ?? base,
        urlCurso:
          entrada.datos.urlCurso ??
          `${base}/login?continuar=/tukuy-academy/aprendizaje`,
      },
    });
  },

  async enviarClaseProgramada(entrada: {
    para: string;
    datos: DatosCorreoClase;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.enviar({
      plantilla: "clase_programada",
      para: entrada.para,
      datos: {
        ...entrada.datos,
        urlPortal: entrada.datos.urlPortal ?? urlBase(),
      },
    });
  },

  async enviarRecordatorioClase(entrada: {
    para: string;
    datos: DatosCorreoClase;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.enviar({
      plantilla: "recordatorio_clase",
      para: entrada.para,
      datos: {
        ...entrada.datos,
        urlPortal: entrada.datos.urlPortal ?? urlBase(),
      },
    });
  },

  async enviarCertificadoEmitido(entrada: {
    para: string;
    datos: DatosCorreoCertificado;
  }): Promise<{ ok: boolean; error?: string }> {
    const base = urlBase();
    const codigo = entrada.datos.codigoVerificacion?.trim();
    return this.enviar({
      plantilla: "certificado_emitido",
      para: entrada.para,
      datos: {
        ...entrada.datos,
        urlPortal: entrada.datos.urlPortal ?? base,
        urlVerificacion:
          entrada.datos.urlVerificacion ??
          (codigo
            ? `${base}/certificados/verificar/${encodeURIComponent(codigo)}`
            : `${base}/login?continuar=/tukuy-academy/certificados`),
      },
    });
  },

  /** Envía la misma invitación a varios correos (p. ej. alumnos de la sesión). */
  async enviarClaseProgramadaMasivo(entrada: {
    correos: string | string[];
    datosBase: Omit<DatosCorreoClase, "nombrePersona"> & {
      nombrePersona?: string;
    };
  }): Promise<void> {
    const destinos = parsearCorreos(entrada.correos);
    await Promise.allSettled(
      destinos.map((para) =>
        this.enviarClaseProgramada({
          para,
          datos: {
            ...entrada.datosBase,
            nombrePersona: entrada.datosBase.nombrePersona ?? "Hola",
          },
        }),
      ),
    );
  },

  async enviarRecordatorioClaseMasivo(entrada: {
    correos: string | string[];
    datosBase: Omit<DatosCorreoClase, "nombrePersona"> & {
      nombrePersona?: string;
    };
  }): Promise<void> {
    const destinos = parsearCorreos(entrada.correos);
    await Promise.allSettled(
      destinos.map((para) =>
        this.enviarRecordatorioClase({
          para,
          datos: {
            ...entrada.datosBase,
            nombrePersona: entrada.datosBase.nombrePersona ?? "Hola",
          },
        }),
      ),
    );
  },

  /** Busca correo de un alumno/miembro por identidad (org o directorio alumnos). */
  async resolverCorreoIdentidad(identidadId: string): Promise<string | null> {
    const id = identidadId.trim();
    if (!id) return null;

    try {
      const { data: sesion } = await supabasePrincipal().auth.getUser();
      if (sesion.user?.id === id && sesion.user.email) {
        return sesion.user.email.trim().toLowerCase();
      }
    } catch {
      /* continuar */
    }

    try {
      const { organizacionService } = await import(
        "@/api/services/organizacion.service"
      );
      const miembros = await organizacionService.usuarios.listar();
      const miembro = miembros.find((item) => String(item.id) === id);
      if (miembro?.correo?.includes("@")) {
        return miembro.correo.trim().toLowerCase();
      }
      const alumnos = await organizacionService.matriculas.listarResumen({
        limite: 500,
        offset: 0,
      });
      const alumno = alumnos.alumnos.find((item) => item.alumnoId === id);
      if (alumno?.correo?.includes("@")) {
        return alumno.correo.trim().toLowerCase();
      }
    } catch {
      /* sin org activa */
    }

    return null;
  },

  async enviar(entrada: {
    plantilla: PlantillaCorreoApp;
    para: string;
    datos: Record<string, unknown>;
  }): Promise<{ ok: boolean; error?: string }> {
    const para = entrada.para.trim().toLowerCase();
    if (!para.includes("@")) {
      return { ok: false, error: "Correo destino inválido" };
    }

    try {
      const { data, error } = await supabasePrincipal().functions.invoke(
        "enviar-correo",
        {
          body: {
            plantilla: entrada.plantilla,
            para,
            datos: entrada.datos,
          },
        },
      );

      if (error) {
        return { ok: false, error: error.message };
      }

      const raw = (data ?? {}) as { ok?: boolean; error?: string };
      if (raw.ok === false) {
        return {
          ok: false,
          error: raw.error || "No se pudo enviar el correo",
        };
      }
      return { ok: true };
    } catch (causa) {
      return {
        ok: false,
        error:
          causa instanceof Error
            ? causa.message
            : "No se pudo enviar el correo",
      };
    }
  },
};
