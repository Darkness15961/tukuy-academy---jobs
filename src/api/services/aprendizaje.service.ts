import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { crearRepositorioLocal } from "@/api/repositorio-local";
import {
  mapearContenidoAprendizajeSecundaria,
  mapearMatriculaAProgreso,
} from "@/api/services/mapper-curso-secundaria";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
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

/** Serializa mutaciones de progreso por curso (evita carreras read-modify-write). */
const colaProgresoPorCurso = new Map<string, Promise<unknown>>();

function encolarProgresoCurso<T>(
  cursoId: string,
  tarea: () => Promise<T>,
): Promise<T> {
  const previa = colaProgresoPorCurso.get(cursoId) ?? Promise.resolve();
  const siguiente = previa.then(tarea, tarea);
  colaProgresoPorCurso.set(
    cursoId,
    siguiente.then(
      () => undefined,
      () => undefined,
    ),
  );
  return siguiente;
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
    if (apiConfig.secundariaCursos) {
      const data =
        await secundariaGatewayService.obtenerContenidoAprendizaje(cursoId);
      return mapearContenidoAprendizajeSecundaria(data).contenido;
    }

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
    if (apiConfig.secundariaCursos) {
      const data =
        await secundariaGatewayService.obtenerContenidoAprendizaje(cursoId);
      return mapearContenidoAprendizajeSecundaria(data).progreso;
    }

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

  async obtenerApuntes(cursoId: string): Promise<string> {
    if (apiConfig.secundariaCursos) {
      const data =
        await secundariaGatewayService.obtenerContenidoAprendizaje(cursoId);
      return mapearContenidoAprendizajeSecundaria(data).apuntes;
    }
    return "";
  },

  async guardarApuntes(cursoId: string, apuntes: string): Promise<string> {
    if (apiConfig.secundariaCursos) {
      const resultado = await secundariaGatewayService.guardarApuntes(
        cursoId,
        apuntes,
      );
      return resultado.apuntes;
    }
    return apuntes;
  },

  async guardarProgreso(
    cursoId: string,
    cambios: ActualizarProgresoCurso,
  ): Promise<ProgresoCursoAprendizaje> {
    return encolarProgresoCurso(cursoId, () =>
      this._guardarProgresoInterno(cursoId, cambios),
    );
  },

  async guardarItemActivo(
    cursoId: string,
    actividadId: string,
  ): Promise<void> {
    if (!actividadId) return;
    if (apiConfig.secundariaCursos) {
      await encolarProgresoCurso(cursoId, async () => {
        await secundariaGatewayService.guardarItemActivo(cursoId, actividadId);
      });
      return;
    }
    if (!apiConfig.useMock) return;
    const actual = await progresosRepo.obtener(cursoId);
    if (!actual) return;
    await progresosRepo.actualizar(cursoId, {
      ...actual,
      itemActivoId: actividadId,
      actualizadoEn: new Date().toISOString(),
    });
  },

  async _guardarProgresoInterno(
    cursoId: string,
    cambios: ActualizarProgresoCurso,
  ): Promise<ProgresoCursoAprendizaje> {
    if (apiConfig.secundariaCursos) {
      const actual =
        await secundariaGatewayService.obtenerContenidoAprendizaje(cursoId);
      const mapeado = mapearContenidoAprendizajeSecundaria(actual);
      const itemsAntes = new Set(mapeado.progreso.itemsCompletados);
      const itemsDeseados = new Set(cambios.itemsCompletados ?? []);
      const itemsNuevos = [...itemsDeseados].filter((id) => !itemsAntes.has(id));
      const itemsReabiertos = [...itemsAntes].filter(
        (id) => !itemsDeseados.has(id),
      );
      const notas = cambios.notas ?? mapeado.progreso.notas;
      const notasNuevas = Object.entries(notas).filter(([id, valor]) => {
        const previa = mapeado.progreso.notas[id];
        return (
          typeof valor === "number" &&
          Number.isFinite(valor) &&
          previa !== valor
        );
      });

      let ultimo = mapeado.progreso;

      for (const actividadId of itemsReabiertos) {
        const resultado = await secundariaGatewayService.completarActividad(
          cursoId,
          actividadId,
          { marcarCompletada: false },
        );
        ultimo = {
          ...ultimo,
          itemsCompletados: resultado.itemsCompletados,
          notas: {
            ...ultimo.notas,
            ...(resultado.notas ?? {}),
          },
          progreso: Number(resultado.progresoPorcentaje),
          estado:
            resultado.estado === "Completado" ? "Completado" : "En curso",
          itemActivoId: cambios.itemActivoId ?? ultimo.itemActivoId,
          actualizadoEn: new Date().toISOString(),
        };
      }

      for (const [actividadId, nota] of notasNuevas) {
        if (itemsNuevos.includes(actividadId)) continue;
        if (itemsReabiertos.includes(actividadId)) continue;
        const resultado = await secundariaGatewayService.completarActividad(
          cursoId,
          actividadId,
          { nota, marcarCompletada: false },
        );
        ultimo = {
          ...ultimo,
          itemsCompletados: resultado.itemsCompletados,
          notas: {
            ...ultimo.notas,
            ...(resultado.notas ?? {}),
            ...(typeof resultado.nota === "number"
              ? { [actividadId]: resultado.nota }
              : { [actividadId]: nota }),
          },
          progreso: Number(resultado.progresoPorcentaje),
          estado:
            resultado.estado === "Completado" ? "Completado" : "En curso",
          itemActivoId: cambios.itemActivoId ?? ultimo.itemActivoId,
          actualizadoEn: new Date().toISOString(),
        };
      }

      for (const actividadId of itemsNuevos) {
        const nota = notas[actividadId];
        const resultado = await secundariaGatewayService.completarActividad(
          cursoId,
          actividadId,
          {
            nota: typeof nota === "number" ? nota : null,
            marcarCompletada: true,
          },
        );
        ultimo = {
          ...ultimo,
          itemsCompletados: resultado.itemsCompletados,
          notas: {
            ...ultimo.notas,
            ...(resultado.notas ?? {}),
            ...(typeof resultado.nota === "number"
              ? { [actividadId]: resultado.nota }
              : typeof nota === "number"
                ? { [actividadId]: nota }
                : {}),
          },
          progreso: Number(resultado.progresoPorcentaje),
          estado:
            resultado.estado === "Completado" ? "Completado" : "En curso",
          itemActivoId: cambios.itemActivoId ?? ultimo.itemActivoId,
          actualizadoEn: new Date().toISOString(),
        };
      }

      if (
        !itemsNuevos.length &&
        !itemsReabiertos.length &&
        !notasNuevas.length &&
        cambios.itemActivoId
      ) {
        await secundariaGatewayService.guardarItemActivo(
          cursoId,
          cambios.itemActivoId,
        );
        ultimo = { ...ultimo, itemActivoId: cambios.itemActivoId };
      } else if (cambios.itemActivoId) {
        await secundariaGatewayService.guardarItemActivo(
          cursoId,
          cambios.itemActivoId,
        );
        ultimo = { ...ultimo, itemActivoId: cambios.itemActivoId };
      }

      return {
        ...ultimo,
        id: cursoId,
        itemActivoId: cambios.itemActivoId ?? ultimo.itemActivoId,
        notas: { ...ultimo.notas, ...notas },
      };
    }

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

  async calificarQuiz(
    cursoId: string,
    actividadId: string,
    respuestas: number[],
  ): Promise<{
    score: number;
    passed: boolean;
    notaMinima: number;
    correctIndexes: number[];
    itemsCompletados: string[];
    notas: Record<string, number>;
    progreso: number;
    estado: Course["status"];
    certificado?: {
      ok?: boolean;
      certificadoId?: string;
      codigo?: string;
      error?: string;
    } | null;
  }> {
    if (apiConfig.secundariaCursos) {
      const resultado = await secundariaGatewayService.calificarQuiz(
        cursoId,
        actividadId,
        respuestas,
      );
      const progreso = Number(resultado.progresoPorcentaje ?? 0);
      const notas: Record<string, number> = {};
      for (const [id, valor] of Object.entries(resultado.notas ?? {})) {
        const n = Number(valor);
        if (Number.isFinite(n)) notas[id] = n;
      }
      if (Number.isFinite(Number(resultado.score))) {
        notas[actividadId] = Number(resultado.score);
      }
      return {
        score: Number(resultado.score ?? 0),
        passed: Boolean(resultado.passed),
        notaMinima: Number(resultado.notaMinima ?? 14),
        correctIndexes: Array.isArray(resultado.correctIndexes)
          ? resultado.correctIndexes.map((v) => Number(v))
          : [],
        itemsCompletados: (resultado.itemsCompletados ?? []).map(String),
        notas,
        progreso,
        estado: progreso >= 100 ? "Completado" : "En curso",
        certificado: resultado.certificado ?? null,
      };
    }

    const contenido =
      (await this.obtenerContenido(cursoId)) ??
      crearContenidoCursoSemilla(cursoId);
    const preguntas = contenido.quizzes[actividadId] ?? [];
    let correctas = 0;
    const correctIndexes: number[] = [];
    preguntas.forEach((q, idx) => {
      const correcta = typeof q.correctIndex === "number" ? q.correctIndex : 0;
      correctIndexes.push(correcta);
      if (respuestas[idx] === correcta) correctas += 1;
    });
    const score =
      preguntas.length === 0
        ? 0
        : Math.round((correctas / preguntas.length) * 20);
    const notaMinima = 14;
    const passed = score >= notaMinima;
    const progresoActual = await this.obtenerProgreso(cursoId);
    const itemsCompletados = new Set(progresoActual?.itemsCompletados ?? []);
    if (passed) itemsCompletados.add(actividadId);
    const notas = {
      ...(progresoActual?.notas ?? {}),
      [actividadId]: score,
    };
    const total = totalItemsContenido(contenido);
    const progreso =
      total > 0 ? Math.round((itemsCompletados.size / total) * 100) : 0;
    const estado: Course["status"] =
      progreso >= 100 ? "Completado" : "En curso";
    await this.guardarProgreso(cursoId, {
      itemsCompletados: [...itemsCompletados],
      notas,
      itemActivoId: actividadId,
      progreso,
      estado,
    });
    return {
      score,
      passed,
      notaMinima,
      correctIndexes,
      itemsCompletados: [...itemsCompletados],
      notas,
      progreso,
      estado,
      certificado: null,
    };
  },

  async listarProgresos(): Promise<ProgresoCursoAprendizaje[]> {
    if (apiConfig.secundariaCursos) {
      const listado = await secundariaGatewayService.listarMisCursos();
      return listado.cursos.map(mapearMatriculaAProgreso);
    }

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

  async abrirChatConDocente(cursoId: string) {
    if (!apiConfig.secundariaCursos) {
      return {
        conversacionId: `mock-${cursoId}`,
        docente: {
          id: "docente-mock",
          nombre: "Docente del curso",
          cargo: "Instructor",
          iniciales: "DO",
        },
        mensajes: [] as Array<{
          id: string;
          contenido: string;
          hora: string;
          autor: "DOCENTE" | "ESTUDIANTE";
        }>,
      };
    }
    const data = await secundariaGatewayService.abrirChatCursoAlumno(cursoId);
    return {
      conversacionId: data.conversacionId,
      docente: data.docente,
      mensajes: (data.mensajes ?? []).map((mensaje) => ({
        id: mensaje.id,
        contenido: mensaje.contenido,
        hora: mensaje.hora,
        autor: mensaje.autor,
      })),
    };
  },

  async enviarMensajeAlDocente(
    conversacionId: string,
    contenido: string,
  ) {
    if (!apiConfig.secundariaCursos) {
      return {
        id: `msg-${Date.now()}`,
        contenido,
        hora: new Intl.DateTimeFormat("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
        autor: "ESTUDIANTE" as const,
      };
    }
    const data = await secundariaGatewayService.enviarMensaje(
      conversacionId,
      contenido,
    );
    return {
      id: data.mensaje.id,
      contenido: data.mensaje.contenido,
      hora: data.mensaje.hora,
      autor: data.mensaje.autor,
    };
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
