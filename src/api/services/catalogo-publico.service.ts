import { apiConfig } from "@/api/config";
import { resolveMock } from "@/api/mock";
import { courses as coursesMock } from "@/data/academia.mock";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import {
  mapearCursoCatalogoPublico,
  normalizarListadoCatalogoPublico,
  type CursoCatalogoPublico,
} from "@/lib/catalogo-publico";
import { cursoEstadoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
import { cursoVisibleEnLandingPublica } from "@/lib/catalogo-publico-visibilidad";
import { env } from "@/lib/env";
import { supabasePrincipal } from "@/lib/supabase";
import { mapCourseList } from "@/mappers/academia.mapper";
import type { Course } from "@/types/academia";

type ListadoCatalogoPublicoRespuesta = {
  ok: boolean;
  total: number;
  cursos: CursoCatalogoPublico[];
};

let cacheListado: { at: number; cursos: Course[] } | null = null;
const CACHE_MS = 60_000;

function filtrarVisiblesCatalogoPublico(
  items: CursoCatalogoPublico[],
  opciones?: { exigirEstadoSecundaria?: boolean },
): CursoCatalogoPublico[] {
  const exigirSecundaria = opciones?.exigirEstadoSecundaria ?? false;

  return items.filter((item) => {
    if (String(item.estadoPublicacion ?? "").toUpperCase() !== "PUBLICADO") {
      return false;
    }

    const hist = item.datosHistoricos ?? {};
    if (hist.eliminadoPermanente === true || hist.oculto === true) {
      return false;
    }

    if (
      !cursoVisibleEnLandingPublica(
        hist,
        item.visibilidad ?? null,
        item.alcanceDirigido ?? null,
      )
    ) {
      return false;
    }

    const estadoSec = String(item.estadoSecundaria ?? "").trim();
    if (estadoSec) {
      return cursoEstadoVisibleEnCatalogoAlumno(estadoSec);
    }
    if (exigirSecundaria) {
      return false;
    }
    return true;
  });
}

function esErrorAuthGateway(data: Record<string, unknown> | null): boolean {
  const msg = String(data?.error ?? "").toLowerCase();
  return msg.includes("sesion requerida") || msg.includes("sesion invalida");
}

async function invocarCatalogoPublicoGateway(): Promise<Course[]> {
  const url = `${env.supabasePrimaryUrl.replace(/\/$/, "")}/functions/v1/secondary-gateway`;
  const payload = {
    action: "list-cursos-publicos",
    instalacionId: INSTALACION_TUKUY_ACADEMY_ID,
  };

  // Gateway actualizado: list-cursos-publicos no requiere JWT de usuario.
  let respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabasePrimaryAnonKey,
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  let data: Record<string, unknown> | null = respuesta
    ? ((await respuesta.json().catch(() => null)) as Record<string, unknown> | null)
    : null;

  if (!data?.ok) {
    // Gateway remoto desactualizado: reintento con invoke también exige sesión.
    if (!esErrorAuthGateway(data)) {
      const { data: invokeData, error } = await supabasePrincipal().functions.invoke(
        "secondary-gateway",
        { body: payload },
      );
      if (invokeData?.ok) {
        data = invokeData as Record<string, unknown>;
      } else if (!esErrorAuthGateway(invokeData as Record<string, unknown> | null)) {
        throw new Error(
          typeof invokeData?.error === "string"
            ? invokeData.error
            : error?.message || "No se pudo cargar el catálogo público",
        );
      }
    }
    if (!data?.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "Gateway desactualizado (falta list-cursos-publicos)",
      );
    }
  }

  const cursos = Array.isArray(data.cursos) ? data.cursos : [];
  return filtrarVisiblesCatalogoPublico(cursos as CursoCatalogoPublico[], {
    exigirEstadoSecundaria: false,
  }).map((item) => mapearCursoCatalogoPublico(item));
}

async function invocarCatalogoPublicoRpc(): Promise<Course[]> {
  const { data, error } = await (
    supabasePrincipal() as unknown as {
      rpc(
        fn: "public_listar_cursos_catalogo",
        args: { p_instalacion_id: string },
      ): Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("public_listar_cursos_catalogo", {
    p_instalacion_id: INSTALACION_TUKUY_ACADEMY_ID,
  });
  if (error) {
    throw new Error(error.message);
  }
  const raw = (data ?? {}) as ListadoCatalogoPublicoRespuesta;
  const items = Array.isArray(raw.cursos) ? raw.cursos : [];
  return filtrarVisiblesCatalogoPublico(items).map(mapearCursoCatalogoPublico);
}

function listadoMockPublico(): Course[] {
  return normalizarListadoCatalogoPublico(
    mapCourseList(coursesMock).filter(
      (curso) => curso.visibleEnCatalogo !== false,
    ),
  );
}

export const catalogoPublicoService = {
  async listarCursos(): Promise<Course[]> {
    if (cacheListado && Date.now() - cacheListado.at < CACHE_MS) {
      return cacheListado.cursos;
    }

    let cursos: Course[] = [];

    if (apiConfig.secundariaCursos && env.authProvider === "supabase") {
      try {
        cursos = await invocarCatalogoPublicoGateway();
      } catch {
        try {
          cursos = await invocarCatalogoPublicoRpc();
        } catch {
          cursos = [];
        }
      }
    } else if (apiConfig.useMock) {
      cursos = await resolveMock(listadoMockPublico());
    }

    cacheListado = { at: Date.now(), cursos };
    return cursos;
  },

  async obtenerPorId(cursoId: string): Promise<Course | null> {
    const id = cursoId.trim();
    if (!id) return null;
    const listado = await this.listarCursos();
    const enListado = listado.find((curso) => curso.id === id) ?? null;
    if (enListado) return enListado;

    // Listado vacío o desfasado: ficha pública directa (sin JWT).
    if (apiConfig.secundariaCursos && env.authProvider === "supabase") {
      const { cursoPublicoService } = await import(
        "@/api/services/curso-publico.service"
      );
      return cursoPublicoService.obtenerCursoPublico(id);
    }
    return null;
  },

  invalidarCache() {
    cacheListado = null;
  },
};
