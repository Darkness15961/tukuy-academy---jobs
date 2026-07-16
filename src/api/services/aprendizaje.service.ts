import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { crearRepositorioLocal } from "@/api/repositorio-local";
import {
  crearContenidoCursoSemilla,
  idsItemsContenido,
  primerItemId,
  totalItemsContenido,
} from "@/data/aprendizaje.mock";
import {
  APRENDIZAJE_CONTENIDOS_KEY,
  APRENDIZAJE_NOTAS_LEGACY_KEY,
  APRENDIZAJE_PROGRESO_LEGACY_KEY,
  APRENDIZAJE_PROGRESOS_KEY,
} from "@/lib/constants";
import type { Course } from "@/types/academia";
import type {
  ActualizarProgresoCurso,
  ContenidoCursoAprendizaje,
  ProgresoCursoAprendizaje,
} from "@/types/aprendizaje.types";

const contenidosRepo = crearRepositorioLocal<ContenidoCursoAprendizaje>({
  clave: APRENDIZAJE_CONTENIDOS_KEY,
  ruta: API.aprendizaje.contenidos,
  semilla: [],
  version: 2,
});

const progresosRepo = crearRepositorioLocal<ProgresoCursoAprendizaje>({
  clave: APRENDIZAJE_PROGRESOS_KEY,
  ruta: API.aprendizaje.progresos,
  semilla: [],
  version: 1,
});

function progresoVacio(
  cursoId: string,
  itemActivoId: string,
): ProgresoCursoAprendizaje {
  return {
    id: cursoId,
    itemsCompletados: [],
    notas: {},
    itemActivoId,
    progreso: 0,
    estado: "En curso",
    actualizadoEn: new Date().toISOString(),
  };
}

async function migrarLegadoAsync(): Promise<void> {
  if (!apiConfig.useMock || typeof localStorage === "undefined") return;
  if (localStorage.getItem(`${APRENDIZAJE_PROGRESOS_KEY}_migrado`) === "1") {
    return;
  }

  try {
    const progresoRaw = localStorage.getItem(APRENDIZAJE_PROGRESO_LEGACY_KEY);
    const notasRaw = localStorage.getItem(APRENDIZAJE_NOTAS_LEGACY_KEY);
    const progresoMap = progresoRaw
      ? (JSON.parse(progresoRaw) as Record<
          string,
          { progress: number; status: Course["status"] }
        >)
      : {};
    const notasGlobales = notasRaw
      ? (JSON.parse(notasRaw) as Record<string, number>)
      : {};

    const actuales = await progresosRepo.listar();
    const porId = new Map(actuales.map((p) => [p.id, p]));

    for (const [cursoId, resumen] of Object.entries(progresoMap)) {
      const contenido = await asegurarContenido(cursoId);
      const todos = idsItemsContenido(contenido);
      const count = Math.round((resumen.progress / 100) * todos.length);
      const itemsCompletados = todos.slice(0, count);

      porId.set(cursoId, {
        id: cursoId,
        itemsCompletados,
        notas: { ...notasGlobales },
        itemActivoId: itemsCompletados.at(-1) ?? primerItemId(contenido),
        progreso: resumen.progress,
        estado: resumen.status,
        actualizadoEn: new Date().toISOString(),
      });
    }

    if (porId.size) {
      await progresosRepo.reemplazar([...porId.values()]);
    }

    localStorage.setItem(`${APRENDIZAJE_PROGRESOS_KEY}_migrado`, "1");
  } catch {
    localStorage.setItem(`${APRENDIZAJE_PROGRESOS_KEY}_migrado`, "1");
  }
}

async function asegurarContenido(
  cursoId: string,
): Promise<ContenidoCursoAprendizaje> {
  const existente = await contenidosRepo.obtener(cursoId);
  if (existente) return existente;

  const semilla = crearContenidoCursoSemilla(cursoId);
  if (apiConfig.useMock) {
    return contenidosRepo.crear(semilla);
  }

  // Sin mock, el backend debe proveer el contenido; si falla, no inventamos.
  return semilla;
}

function recalcularProgreso(
  contenido: ContenidoCursoAprendizaje,
  itemsCompletados: string[],
): { progreso: number; estado: Course["status"] } {
  const total = totalItemsContenido(contenido);
  const progreso =
    total === 0
      ? 0
      : Math.round((itemsCompletados.length / total) * 100);
  const estado: Course["status"] =
    progreso >= 100 ? "Completado" : progreso > 0 ? "En curso" : "En curso";
  return { progreso, estado };
}

export const aprendizajeService = {
  async obtenerContenido(cursoId: string): Promise<ContenidoCursoAprendizaje> {
    await migrarLegadoAsync();

    if (!apiConfig.useMock) {
      const { data } = await api.get<ContenidoCursoAprendizaje>(
        API.courses.content(cursoId),
      );
      return data;
    }

    return resolveMock(await asegurarContenido(cursoId));
  },

  async obtenerProgreso(cursoId: string): Promise<ProgresoCursoAprendizaje> {
    await migrarLegadoAsync();

    if (!apiConfig.useMock) {
      const { data } = await api.get<ProgresoCursoAprendizaje>(
        API.courses.progress(cursoId),
      );
      return data;
    }

    const contenido = await asegurarContenido(cursoId);
    const existente = await progresosRepo.obtener(cursoId);
    if (existente) return resolveMock(existente);

    const inicial = progresoVacio(cursoId, primerItemId(contenido));
    await progresosRepo.crear(inicial);
    return resolveMock(inicial);
  },

  async guardarProgreso(
    cursoId: string,
    cambios: ActualizarProgresoCurso,
  ): Promise<ProgresoCursoAprendizaje> {
    if (!apiConfig.useMock) {
      const { data } = await api.patch<ProgresoCursoAprendizaje>(
        API.courses.progress(cursoId),
        cambios,
      );
      return data;
    }

    const contenido = await asegurarContenido(cursoId);
    const actual =
      (await progresosRepo.obtener(cursoId)) ??
      progresoVacio(cursoId, primerItemId(contenido));

    const itemsCompletados =
      cambios.itemsCompletados ?? actual.itemsCompletados;
    const { progreso, estado } = recalcularProgreso(
      contenido,
      itemsCompletados,
    );

    const siguiente: ProgresoCursoAprendizaje = {
      ...actual,
      ...cambios,
      id: cursoId,
      itemsCompletados,
      progreso: cambios.progreso ?? progreso,
      estado: cambios.estado ?? estado,
      actualizadoEn: new Date().toISOString(),
    };

    const existe = await progresosRepo.obtener(cursoId);
    if (existe) {
      return progresosRepo.actualizar(cursoId, siguiente);
    }
    return progresosRepo.crear(siguiente);
  },

  async listarProgresos(): Promise<ProgresoCursoAprendizaje[]> {
    await migrarLegadoAsync();

    if (!apiConfig.useMock) {
      const { data } = await api.get<ProgresoCursoAprendizaje[]>(
        API.aprendizaje.progresos,
      );
      return data;
    }

    return progresosRepo.listar();
  },

  /** Aplica progresos guardados sobre la lista de cursos del portal. */
  async aplicarProgresosACursos(cursos: Course[]): Promise<Course[]> {
    const progresos = await this.listarProgresos();
    const porId = new Map(progresos.map((p) => [p.id, p]));

    return cursos.map((curso) => {
      const p = porId.get(curso.id);
      if (!p) return curso;
      return {
        ...curso,
        progress: p.progreso,
        status: p.estado,
      };
    });
  },

  reiniciarDemo(cursoId?: string): void {
    if (!apiConfig.useMock) return;
    if (cursoId) {
      void progresosRepo.eliminar(cursoId);
      return;
    }
    progresosRepo.reiniciar();
    contenidosRepo.reiniciar();
    localStorage.removeItem(`${APRENDIZAJE_PROGRESOS_KEY}_migrado`);
    localStorage.removeItem(APRENDIZAJE_PROGRESO_LEGACY_KEY);
    localStorage.removeItem(APRENDIZAJE_NOTAS_LEGACY_KEY);
  },
};
