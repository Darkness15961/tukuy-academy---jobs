import { env } from "@/lib/env";
import { supabasePrincipal } from "@/lib/supabase";

export type SituacionCarrera = "EJERCE" | "ESTUDIA" | "EXPLORA";

export type CarreraOnboarding = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  familia: string;
  orden: number;
  interesesSugeridos: string[];
};

export type InteresOnboarding = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  orden: number;
};

export type EstadoOnboardingAprendizaje = {
  completado: boolean;
  requiereOnboarding: boolean;
  carreraId?: string | null;
  situacion?: SituacionCarrera;
  interesIds: string[];
  completadoEn?: string | null;
};

const CLAVE_LOCAL = "tukuy_onboarding_aprendizaje_v1";
const CLAVE_CACHE_SESION = "tukuy_onboarding_aprendizaje_ok";
const CLAVE_DESTINO_PENDIENTE = "tukuy_onboarding_destino";

function leerLocal(): EstadoOnboardingAprendizaje | null {
  try {
    const raw = localStorage.getItem(CLAVE_LOCAL);
    if (!raw) return null;
    return JSON.parse(raw) as EstadoOnboardingAprendizaje;
  } catch {
    localStorage.removeItem(CLAVE_LOCAL);
    return null;
  }
}

function guardarLocal(estado: EstadoOnboardingAprendizaje) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(estado));
}

function marcarCompletadoEnSesion() {
  sessionStorage.setItem(CLAVE_CACHE_SESION, "1");
}

export function onboardingYaCompletadoEnSesion(): boolean {
  return sessionStorage.getItem(CLAVE_CACHE_SESION) === "1";
}

export function limpiarCacheOnboardingSesion() {
  sessionStorage.removeItem(CLAVE_CACHE_SESION);
  sessionStorage.removeItem(CLAVE_DESTINO_PENDIENTE);
}

export function guardarDestinoTrasOnboarding(destino: string | null) {
  if (
    destino &&
    destino.startsWith("/") &&
    !destino.startsWith("//") &&
    destino !== "/onboarding-aprendizaje"
  ) {
    sessionStorage.setItem(CLAVE_DESTINO_PENDIENTE, destino);
    return;
  }
  sessionStorage.removeItem(CLAVE_DESTINO_PENDIENTE);
}

export function consumirDestinoTrasOnboarding(): string | null {
  const destino = sessionStorage.getItem(CLAVE_DESTINO_PENDIENTE);
  sessionStorage.removeItem(CLAVE_DESTINO_PENDIENTE);
  return destino;
}

export const onboardingAprendizajeService = {
  async obtenerEstado(): Promise<EstadoOnboardingAprendizaje> {
    if (onboardingYaCompletadoEnSesion()) {
      return {
        completado: true,
        requiereOnboarding: false,
        interesIds: [],
      };
    }

    if (env.authProvider !== "supabase") {
      const local = leerLocal();
      if (local?.completado) {
        marcarCompletadoEnSesion();
        return { ...local, requiereOnboarding: false };
      }
      return {
        completado: false,
        requiereOnboarding: true,
        interesIds: [],
      };
    }

    const { data, error } = await supabasePrincipal().rpc(
      "obtener_mi_onboarding_aprendizaje",
    );
    if (error) {
      // Migración aún no aplicada: no bloquear el acceso.
      if (/obtener_mi_onboarding|Could not find|PGRST202/i.test(error.message)) {
        marcarCompletadoEnSesion();
        return {
          completado: true,
          requiereOnboarding: false,
          interesIds: [],
        };
      }
      throw new Error(error.message);
    }
    const raw = (data ?? {}) as Record<string, unknown>;
    const interesIds = Array.isArray(raw.interesIds)
      ? raw.interesIds.map((id) => String(id))
      : [];
    const situacion = String(raw.situacion ?? "EXPLORA").toUpperCase();
    const completado = raw.completado === true;
    if (completado) marcarCompletadoEnSesion();
    return {
      completado,
      requiereOnboarding: raw.requiereOnboarding !== false && !completado,
      carreraId: raw.carreraId ? String(raw.carreraId) : null,
      situacion:
        situacion === "EJERCE" || situacion === "ESTUDIA" || situacion === "EXPLORA"
          ? situacion
          : "EXPLORA",
      interesIds,
      completadoEn: raw.completadoEn ? String(raw.completadoEn) : null,
    };
  },

  async requiereOnboarding(): Promise<boolean> {
    const estado = await this.obtenerEstado();
    return estado.requiereOnboarding === true;
  },

  async listarCatalogo(): Promise<{
    carreras: CarreraOnboarding[];
    intereses: InteresOnboarding[];
  }> {
    if (env.authProvider !== "supabase") {
      return { carreras: CATALOGO_LOCAL.carreras, intereses: CATALOGO_LOCAL.intereses };
    }

    const { data, error } = await supabasePrincipal().rpc(
      "listar_catalogo_onboarding_aprendizaje",
    );
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const carrerasRaw = Array.isArray(raw.carreras) ? raw.carreras : [];
    const interesesRaw = Array.isArray(raw.intereses) ? raw.intereses : [];
    return {
      carreras: carrerasRaw.map((item) => {
        const c = item as Record<string, unknown>;
        const sugeridos = Array.isArray(c.interesesSugeridos)
          ? c.interesesSugeridos.map((id) => String(id))
          : [];
        return {
          id: String(c.id ?? ""),
          codigo: String(c.codigo ?? ""),
          nombre: String(c.nombre ?? ""),
          descripcion: String(c.descripcion ?? ""),
          familia: String(c.familia ?? ""),
          orden: Number(c.orden ?? 1),
          interesesSugeridos: sugeridos,
        };
      }),
      intereses: interesesRaw.map((item) => {
        const i = item as Record<string, unknown>;
        return {
          id: String(i.id ?? ""),
          codigo: String(i.codigo ?? ""),
          nombre: String(i.nombre ?? ""),
          descripcion: String(i.descripcion ?? ""),
          color: String(i.color ?? "#0B3A78"),
          orden: Number(i.orden ?? 1),
        };
      }),
    };
  },

  async completar(entrada: {
    carreraId: string;
    situacion: SituacionCarrera;
    interesIds: string[];
  }): Promise<EstadoOnboardingAprendizaje> {
    if (env.authProvider !== "supabase") {
      const estado: EstadoOnboardingAprendizaje = {
        completado: true,
        requiereOnboarding: false,
        carreraId: entrada.carreraId,
        situacion: entrada.situacion,
        interesIds: entrada.interesIds,
        completadoEn: new Date().toISOString(),
      };
      guardarLocal(estado);
      marcarCompletadoEnSesion();
      return estado;
    }

    const { data, error } = await supabasePrincipal().rpc(
      "completar_mi_onboarding_aprendizaje",
      {
        p_carrera_id: entrada.carreraId,
        p_situacion: entrada.situacion,
        p_interes_ids: entrada.interesIds,
      } as never,
    );
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    marcarCompletadoEnSesion();
    return {
      completado: raw.completado === true,
      requiereOnboarding: false,
      carreraId: raw.carreraId ? String(raw.carreraId) : entrada.carreraId,
      situacion: entrada.situacion,
      interesIds: Array.isArray(raw.interesIds)
        ? raw.interesIds.map((id) => String(id))
        : entrada.interesIds,
      completadoEn: raw.completadoEn
        ? String(raw.completadoEn)
        : new Date().toISOString(),
    };
  },
};

const CATALOGO_LOCAL = {
  carreras: [
    {
      id: "carr-ing-civil",
      codigo: "ING_CIVIL",
      nombre: "Ingeniería Civil",
      descripcion: "Diseño, construcción y gestión de obras.",
      familia: "INGENIERIA",
      orden: 1,
      interesesSugeridos: ["int-bim", "int-costos", "int-planificacion", "int-construccion"],
    },
    {
      id: "carr-estudiante",
      codigo: "ESTUDIANTE",
      nombre: "Estudiante (aún elijo especialidad)",
      descripcion: "Explorando hacia una carrera profesional.",
      familia: "FORMACION",
      orden: 10,
      interesesSugeridos: ["int-empleabilidad", "int-tecnologia", "int-excel"],
    },
  ] satisfies CarreraOnboarding[],
  intereses: [
    {
      id: "int-bim",
      codigo: "BIM",
      nombre: "BIM / Modelado",
      descripcion: "Revit, Navisworks, coordinación BIM.",
      color: "#6D28D9",
      orden: 1,
    },
    {
      id: "int-costos",
      codigo: "COSTOS",
      nombre: "Costos y presupuestos",
      descripcion: "Presupuestos y control de costos.",
      color: "#0B3A78",
      orden: 2,
    },
    {
      id: "int-planificacion",
      codigo: "PLANIFICACION",
      nombre: "Planificación de proyectos",
      descripcion: "Cronogramas y gestión de proyectos.",
      color: "#0E7490",
      orden: 3,
    },
    {
      id: "int-construccion",
      codigo: "CONSTRUCCION",
      nombre: "Construcción civil",
      descripcion: "Ejecución y supervisión en campo.",
      color: "#9A3412",
      orden: 4,
    },
    {
      id: "int-empleabilidad",
      codigo: "EMPLEABILIDAD",
      nombre: "Empleabilidad / CV",
      descripcion: "Perfil profesional y oportunidades.",
      color: "#0369A1",
      orden: 5,
    },
    {
      id: "int-tecnologia",
      codigo: "TECNOLOGIA",
      nombre: "Tecnología / digital",
      descripcion: "Herramientas digitales e innovación.",
      color: "#7C3AED",
      orden: 6,
    },
    {
      id: "int-excel",
      codigo: "EXCEL_DATOS",
      nombre: "Excel / datos",
      descripcion: "Hojas de cálculo y análisis.",
      color: "#B87A00",
      orden: 7,
    },
  ] satisfies InteresOnboarding[],
};
