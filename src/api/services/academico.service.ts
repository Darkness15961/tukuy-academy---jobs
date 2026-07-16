import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { crearRepositorioLocal } from "@/api/repositorio-local";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import {
  cursosDocente,
  estudiantesDocente,
} from "@/portal-docente/data/docente.mock";
import type {
  ActividadCursoAcademico,
  ElegibilidadCertificadoAcademico,
  EntregaActividadAcademica,
  ModuloCursoAcademico,
  ResumenCursoCalificaciones,
  ResumenEstudianteCurso,
  VerificacionCertificadoAcademico,
} from "@/dominio-academico/types/academico.types";
import type { ContextoSesion } from "@/types/membresia.types";
import type { CursoDocente } from "@/portal-docente/types/docente.types";

export type {
  ActividadCursoAcademico,
  ArchivoEntregaAcademica,
  ElegibilidadCertificadoAcademico,
  EntregaActividadAcademica,
  EstadoEntregaAcademica,
  ModuloCursoAcademico,
  ResumenCursoCalificaciones,
  ResumenEstudianteCurso,
  VerificacionCertificadoAcademico,
} from "@/dominio-academico/types/academico.types";

const CLAVE_MODULOS = "tukuy_demo_academico_modulos";
const CLAVE_ENTREGAS = "tukuy_demo_academico_entregas";
const CLAVE_VERIFICACIONES = "tukuy_demo_academico_verificaciones";
const VERSION_ACADEMICA = 1;
const BASE_ARCHIVOS = "tukuy-academy-archivos";
const ALMACEN_ARCHIVOS = "entregas-pdf";

type RegistroVerificacionAcademica = VerificacionCertificadoAcademico & {
  id: string;
};

const titulosModulos = [
  "Fundamentos y contexto de aplicación",
  "Herramientas y metodología",
  "Desarrollo del caso práctico",
  "Control, evidencias y resultados",
  "Proyecto integrador y cierre",
];

const titulosActividades = [
  "Informe de fundamentos aplicados",
  "Matriz de metodología y herramientas",
  "Desarrollo del caso práctico",
  "Reporte de evidencias y resultados",
  "Proyecto integrador final",
];

const equivalenciasCursosPortal: Record<string, string> = {
  "c-000": "doc-1",
  "c-001": "doc-4",
  "c-002": "doc-2",
  "c-005": "doc-3",
  "c-008": "doc-2",
};

function contextoActual(): ContextoSesion | null {
  const guardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  if (!guardado) return null;
  try {
    return JSON.parse(guardado) as ContextoSesion;
  } catch {
    return null;
  }
}

function cursosSemillaPermitidos(): CursoDocente[] {
  const contexto = contextoActual();
  const cursos = cursosDocente.map((curso) => ({
    ...curso,
    estado: curso.estado as CursoDocente["estado"],
  }));
  if (
    !contexto ||
    !["docente", "organizacion"].includes(contexto.portal)
  ) {
    return cursos;
  }
  if (contexto.ambitoDocencia === "INDEPENDIENTE" || !contexto.organizacionId) {
    return cursos.filter((curso) => curso.ambito === "INDEPENDIENTE");
  }
  return cursos.filter(
    (curso) =>
      curso.ambito === "ORGANIZACION" &&
      curso.organizacionId === contexto.organizacionId,
  );
}

async function listarCursosPermitidos(): Promise<CursoDocente[]> {
  const contexto = contextoActual();
  if (
    !contexto ||
    !["docente", "organizacion"].includes(contexto.portal)
  ) {
    return cursosSemillaPermitidos();
  }
  const repo = crearRepositorioLocal<CursoDocente>({
    clave: `tukuy_demo_docente_${contexto.membresiaId}_cursos`,
    ruta: API.docente.cursos,
    semilla: cursosSemillaPermitidos(),
    version: 2,
  });
  return repo.listar();
}

function crearModulosCurso(cursoId: string): ModuloCursoAcademico[] {
  return titulosModulos.map((titulo, indice) => {
    const moduloId = `${cursoId}-mod-${indice + 1}`;
    const actividad: ActividadCursoAcademico = {
      id: `${cursoId}-act-${indice + 1}`,
      cursoId,
      moduloId,
      titulo: titulosActividades[indice] ?? `Actividad ${indice + 1}`,
      tipo: indice === 4 ? "PROYECTO" : "ENTREGA_PDF",
      orden: 1,
      ponderacion: 100,
      notaMaxima: 20,
      horasReconocidas: 4,
      obligatoria: true,
      intentosPermitidos: indice === 4 ? 2 : 3,
      fechaLimite: `2026-${String(7 + Math.floor(indice / 2)).padStart(2, "0")}-${String(20 + indice).padStart(2, "0")}`,
    };
    return {
      id: moduloId,
      cursoId,
      titulo: `Módulo ${indice + 1} · ${titulo}`,
      orden: indice + 1,
      ponderacion: 20,
      horasRequeridas: 4,
      actividades: [actividad],
    };
  });
}

function crearModulosDesdeSecciones(
  cursoId: string,
  secciones: Array<{ titulo: string; clases: string[] }>,
): ModuloCursoAcademico[] {
  const cantidad = Math.max(secciones.length, 1);
  return secciones.map((seccion, indice) => {
    const moduloId = `${cursoId}-mod-${indice + 1}`;
    const horas = Math.max(2, seccion.clases.length * 2);
    const titulo = seccion.titulo.trim() || `Módulo ${indice + 1}`;
    return {
      id: moduloId,
      cursoId,
      titulo: `Módulo ${indice + 1} · ${titulo}`,
      orden: indice + 1,
      ponderacion: Math.round(100 / cantidad),
      horasRequeridas: horas,
      actividades: [
        {
          id: `${cursoId}-act-${indice + 1}`,
          cursoId,
          moduloId,
          titulo: `Evidencia aplicada · ${titulo}`,
          tipo: indice === cantidad - 1 ? "PROYECTO" : "ENTREGA_PDF",
          orden: 1,
          ponderacion: 100,
          notaMaxima: 20,
          horasReconocidas: horas,
          obligatoria: true,
          intentosPermitidos: indice === cantidad - 1 ? 2 : 3,
        },
      ],
    };
  });
}

function crearModulosSemilla(): ModuloCursoAcademico[] {
  return cursosDocente.flatMap((curso) => crearModulosCurso(curso.id));
}

const modulosSemilla = crearModulosSemilla();

function crearEntregasSemilla(): EntregaActividadAcademica[] {
  return estudiantesDocente.flatMap((estudiante, estudianteIndice) => {
    const curso = cursosDocente.find((item) => item.id === estudiante.cursoId);
    if (!curso) return [];
    const modulos = modulosSemilla.filter(
      (modulo) => modulo.cursoId === curso.id,
    );
    const limiteEntregas = [5, 4, 5, 3, 4, 2, 5, 4][estudianteIndice] ?? 3;
    const limiteCalificadas = [4, 3, 5, 2, 3, 1, 5, 3][estudianteIndice] ?? 2;

    return modulos.map((modulo, moduloIndice) => {
      const actividad = modulo.actividades[0]!;
      const tieneEntrega = moduloIndice < limiteEntregas;
      const calificada = moduloIndice < limiteCalificadas;
      const nota = Math.min(20, 13 + ((estudianteIndice + moduloIndice) % 7));
      return {
        id: `entrega-${estudiante.id}-${actividad.id}`,
        organizacionId: curso.organizacionId,
        cursoId: curso.id,
        cursoTitulo: curso.titulo,
        moduloId: modulo.id,
        moduloTitulo: modulo.titulo,
        actividadId: actividad.id,
        actividadTitulo: actividad.titulo,
        estudianteId: estudiante.id,
        estudianteNombre: estudiante.nombre,
        estudianteIniciales: estudiante.iniciales,
        intento: tieneEntrega ? 1 : 0,
        entregadaEn: tieneEntrega
          ? `2026-07-${String(10 + ((estudianteIndice + moduloIndice) % 6)).padStart(2, "0")}T${String(8 + moduloIndice).padStart(2, "0")}:30:00-05:00`
          : null,
        estado: !tieneEntrega
          ? "SIN_ENTREGAR"
          : calificada
            ? "CALIFICADA"
            : "EN_REVISION",
        archivo: tieneEntrega
          ? {
              id: `archivo-${estudiante.id}-${actividad.id}`,
              nombre: `${actividad.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${estudiante.iniciales.toLowerCase()}.pdf`,
              tipo: "application/pdf",
              tamanio: 184_000 + moduloIndice * 21_500,
              referencia: `demo/${curso.id}/${estudiante.id}/${actividad.id}.pdf`,
            }
          : undefined,
        nota: calificada ? nota : undefined,
        retroalimentacion: calificada
          ? "Entrega revisada. Se valoró la aplicación práctica y la claridad de las evidencias."
          : undefined,
        calificadaEn: calificada
          ? `2026-07-${String(12 + (moduloIndice % 4)).padStart(2, "0")}T16:00:00-05:00`
          : undefined,
        horasReconocidas: calificada ? actividad.horasReconocidas : 0,
      } satisfies EntregaActividadAcademica;
    });
  });
}

const modulosRepo = crearRepositorioLocal<ModuloCursoAcademico>({
  clave: CLAVE_MODULOS,
  ruta: API.academico.modulos,
  semilla: modulosSemilla,
  version: VERSION_ACADEMICA,
});

const entregasRepo = crearRepositorioLocal<EntregaActividadAcademica>({
  clave: CLAVE_ENTREGAS,
  ruta: API.academico.entregas,
  semilla: crearEntregasSemilla(),
  version: VERSION_ACADEMICA,
});

const verificacionesRepo =
  crearRepositorioLocal<RegistroVerificacionAcademica>({
    clave: CLAVE_VERIFICACIONES,
    ruta: "/certificados/verificaciones",
    semilla: [],
    version: VERSION_ACADEMICA,
  });

function emitirCambio() {
  window.dispatchEvent(new CustomEvent("tukuy:academico-datos"));
}

function resolverCursoAcademicoId(cursoId: string) {
  return equivalenciasCursosPortal[cursoId] ?? cursoId;
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function abrirBaseArchivos() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const solicitud = indexedDB.open(BASE_ARCHIVOS, 1);
    solicitud.onupgradeneeded = () => {
      if (!solicitud.result.objectStoreNames.contains(ALMACEN_ARCHIVOS)) {
        solicitud.result.createObjectStore(ALMACEN_ARCHIVOS);
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(new Error("No se pudo abrir el almacén local de archivos"));
  });
}

async function guardarArchivoLocal(id: string, archivo: File) {
  const base = await abrirBaseArchivos();
  await new Promise<void>((resolve, reject) => {
    const transaccion = base.transaction(ALMACEN_ARCHIVOS, "readwrite");
    transaccion.objectStore(ALMACEN_ARCHIVOS).put(archivo, id);
    transaccion.oncomplete = () => resolve();
    transaccion.onerror = () =>
      reject(new Error("No se pudo conservar el PDF en este navegador"));
  });
  base.close();
}

async function obtenerArchivoLocal(id: string): Promise<Blob | null> {
  const base = await abrirBaseArchivos();
  const archivo = await new Promise<Blob | null>((resolve, reject) => {
    const solicitud = base
      .transaction(ALMACEN_ARCHIVOS, "readonly")
      .objectStore(ALMACEN_ARCHIVOS)
      .get(id);
    solicitud.onsuccess = () => resolve((solicitud.result as Blob) ?? null);
    solicitud.onerror = () => reject(new Error("No se pudo recuperar el PDF"));
  });
  base.close();
  return archivo;
}

function promedioNotas(entregas: EntregaActividadAcademica[]) {
  const calificadas = entregas.filter(
    (entrega) => entrega.estado === "CALIFICADA" && entrega.nota !== undefined,
  );
  if (!calificadas.length) return 0;
  return (
    Math.round(
      (calificadas.reduce((total, entrega) => total + (entrega.nota ?? 0), 0) /
        calificadas.length) *
        10,
    ) / 10
  );
}

async function crearPdfDemostracion(entrega: EntregaActividadAcademica) {
  const { jsPDF } = await import("jspdf");
  const documento = new jsPDF({ unit: "mm", format: "a4" });
  documento.setFillColor(7, 31, 82);
  documento.rect(0, 0, 210, 34, "F");
  documento.setFillColor(245, 180, 0);
  documento.rect(0, 34, 210, 2, "F");
  documento.setTextColor(255, 255, 255);
  documento.setFont("helvetica", "bold");
  documento.setFontSize(18);
  documento.text("Tukuy Academy", 18, 21);
  documento.setTextColor(7, 31, 82);
  documento.setFontSize(16);
  documento.text(entrega.actividadTitulo, 18, 54, { maxWidth: 174 });
  documento.setFont("helvetica", "normal");
  documento.setFontSize(11);
  documento.setTextColor(71, 85, 105);
  documento.text(`Estudiante: ${entrega.estudianteNombre}`, 18, 72);
  documento.text(`Curso: ${entrega.cursoTitulo}`, 18, 81, { maxWidth: 174 });
  documento.text(`Módulo: ${entrega.moduloTitulo}`, 18, 94, { maxWidth: 174 });
  documento.text(`Intento: ${entrega.intento}`, 18, 107);
  documento.setDrawColor(203, 213, 225);
  documento.rect(18, 120, 174, 105);
  documento.setTextColor(51, 65, 85);
  documento.text(
    [
      "Documento de evidencia académica para la demostración de Tukuy Academy.",
      "",
      "La entrega desarrolla el caso solicitado, identifica los criterios técnicos",
      "aplicables y presenta conclusiones sustentadas para la revisión del docente.",
      "",
      "En producción este documento será el PDF original almacenado mediante una",
      "referencia segura y descargado a través de una URL firmada.",
    ],
    25,
    137,
  );
  documento.setFontSize(8);
  documento.setTextColor(100, 116, 139);
  documento.text(`Código de entrega: ${entrega.id}`, 18, 274);
  return documento;
}

export const academicoService = {
  async sincronizarEstructuraCurso(
    cursoId: string,
    secciones: Array<{ titulo: string; clases: string[] }>,
  ): Promise<ModuloCursoAcademico[]> {
    if (!secciones.length) return [];
    if (!apiConfig.useMock) {
      const { data } = await api.put<ModuloCursoAcademico[]>(
        API.academico.estructuraCurso(cursoId),
        { secciones },
      );
      return data;
    }

    const actuales = await modulosRepo.listar();
    const otrosCursos = actuales.filter((modulo) => modulo.cursoId !== cursoId);
    const anteriores = new Map(
      actuales
        .filter((modulo) => modulo.cursoId === cursoId)
        .map((modulo) => [modulo.id, modulo]),
    );
    const estructura = crearModulosDesdeSecciones(cursoId, secciones).map(
      (modulo) => {
        const anterior = anteriores.get(modulo.id);
        if (!anterior) return modulo;
        return {
          ...modulo,
          actividades: modulo.actividades.map((actividad) => {
            const actividadAnterior = anterior.actividades.find(
              (item) => item.id === actividad.id,
            );
            return actividadAnterior
              ? { ...actividadAnterior, ...actividad }
              : actividad;
          }),
        };
      },
    );
    await modulosRepo.reemplazar([...otrosCursos, ...estructura]);
    emitirCambio();
    return estructura;
  },

  async listarModulos(cursoId: string): Promise<ModuloCursoAcademico[]> {
    const id = resolverCursoAcademicoId(cursoId);
    let modulos = await modulosRepo.listar();
    if (!modulos.some((modulo) => modulo.cursoId === id) && apiConfig.useMock) {
      const nuevos = crearModulosCurso(id);
      for (const modulo of nuevos) await modulosRepo.crear(modulo);
      modulos = [...modulos, ...nuevos];
    }
    return modulos
      .filter((modulo) => modulo.cursoId === id)
      .sort((a, b) => a.orden - b.orden);
  },

  async listarEntregasCurso(
    cursoId: string,
  ): Promise<EntregaActividadAcademica[]> {
    const id = resolverCursoAcademicoId(cursoId);
    const entregas = await entregasRepo.listar();
    return entregas.filter((entrega) => entrega.cursoId === id);
  },

  async listarEntregasDocente(): Promise<EntregaActividadAcademica[]> {
    const ids = new Set(
      (await listarCursosPermitidos()).map((curso) => curso.id),
    );
    const entregas = await entregasRepo.listar();
    return entregas.filter((entrega) => ids.has(entrega.cursoId));
  },

  async obtenerEntrega(
    entregaId: string,
  ): Promise<EntregaActividadAcademica | null> {
    return entregasRepo.obtener(entregaId);
  },

  async listarResumenCursos(): Promise<ResumenCursoCalificaciones[]> {
    if (!apiConfig.useMock) {
      const { data } = await api.get<ResumenCursoCalificaciones[]>(
        API.academico.resumenCalificaciones,
      );
      return data;
    }
    const [entregas, cursos] = await Promise.all([
      entregasRepo.listar(),
      listarCursosPermitidos(),
    ]);
    const modulosPorCurso = await Promise.all(
      cursos.map((curso) => this.listarModulos(curso.id)),
    );
    return cursos.map((curso, indiceCurso) => {
      const modulosCurso = modulosPorCurso[indiceCurso] ?? [];
      const entregasCurso = entregas.filter(
        (entrega) => entrega.cursoId === curso.id,
      );
      const estudiantes = new Set(
        entregasCurso.map((entrega) => entrega.estudianteId),
      );
      const resumenEstudiantes = this.resumirEstudiantes(
        entregasCurso,
        modulosCurso,
      );
      return {
        cursoId: curso.id,
        titulo: curso.titulo,
        imagen: curso.imagen,
        estadoCurso: curso.estado,
        modulos: modulosCurso.length,
        actividades: modulosCurso.reduce(
          (total, modulo) => total + modulo.actividades.length,
          0,
        ),
        estudiantes: estudiantes.size,
        entregasPendientes: entregasCurso.filter((entrega) =>
          ["ENTREGADA", "EN_REVISION"].includes(entrega.estado),
        ).length,
        entregasCalificadas: entregasCurso.filter(
          (entrega) => entrega.estado === "CALIFICADA",
        ).length,
        promedio: promedioNotas(entregasCurso),
        aprobados: resumenEstudiantes.filter(
          (estudiante) => estudiante.estado === "APROBADO",
        ).length,
        contexto:
          curso.ambito === "INDEPENDIENTE"
            ? "Docencia independiente"
            : curso.organizacionNombre,
      };
    });
  },

  resumirEstudiantes(
    entregas: EntregaActividadAcademica[],
    modulos: ModuloCursoAcademico[],
  ): ResumenEstudianteCurso[] {
    const requeridas = modulos.flatMap((modulo) =>
      modulo.actividades.filter((actividad) => actividad.obligatoria),
    );
    const horasRequeridas = requeridas.reduce(
      (total, actividad) => total + actividad.horasReconocidas,
      0,
    );
    const porEstudiante = new Map<string, EntregaActividadAcademica[]>();
    entregas.forEach((entrega) => {
      const grupo = porEstudiante.get(entrega.estudianteId) ?? [];
      grupo.push(entrega);
      porEstudiante.set(entrega.estudianteId, grupo);
    });
    return [...porEstudiante.values()].map((grupo) => {
      const primera = grupo[0]!;
      const calificadas = grupo.filter(
        (entrega) => entrega.estado === "CALIFICADA",
      );
      const notaFinal = promedioNotas(grupo);
      const horasCumplidas = calificadas.reduce(
        (total, entrega) => total + entrega.horasReconocidas,
        0,
      );
      return {
        estudianteId: primera.estudianteId,
        estudianteNombre: primera.estudianteNombre,
        iniciales: primera.estudianteIniciales,
        actividadesRequeridas: requeridas.length,
        actividadesCalificadas: calificadas.length,
        notaFinal,
        horasCumplidas,
        horasRequeridas,
        estado:
          calificadas.length < requeridas.length
            ? "PENDIENTE"
            : notaFinal >= 14
              ? "APROBADO"
              : "EN_RIESGO",
      };
    });
  },

  async obtenerResumenEstudiantes(
    cursoId: string,
  ): Promise<ResumenEstudianteCurso[]> {
    const [entregas, modulos] = await Promise.all([
      this.listarEntregasCurso(cursoId),
      this.listarModulos(cursoId),
    ]);
    return this.resumirEstudiantes(entregas, modulos);
  },

  async calificarEntrega(
    entregaId: string,
    nota: number,
    retroalimentacion: string,
  ): Promise<EntregaActividadAcademica> {
    if (nota < 0 || nota > 20) {
      throw new Error("La nota debe estar entre 0 y 20");
    }
    if (!apiConfig.useMock) {
      const { data } = await api.post<EntregaActividadAcademica>(
        API.academico.calificarEntrega(entregaId),
        { nota, retroalimentacion },
      );
      return data;
    }
    const entrega = await entregasRepo.obtener(entregaId);
    if (!entrega?.archivo)
      throw new Error("La actividad aún no tiene una entrega");
    const modulos = await this.listarModulos(entrega.cursoId);
    const actividad = modulos
      .flatMap((modulo) => modulo.actividades)
      .find((item) => item.id === entrega.actividadId);
    const actualizada = await entregasRepo.actualizar(entregaId, {
      estado: "CALIFICADA",
      nota,
      retroalimentacion,
      calificadaEn: new Date().toISOString(),
      horasReconocidas: actividad?.horasReconocidas ?? 0,
    });
    emitirCambio();
    return actualizada;
  },

  async solicitarCorreccion(
    entregaId: string,
    retroalimentacion: string,
  ): Promise<EntregaActividadAcademica> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<EntregaActividadAcademica>(
        API.academico.solicitarCorreccion(entregaId),
        { retroalimentacion },
      );
      return data;
    }
    const actualizada = await entregasRepo.actualizar(entregaId, {
      estado: "OBSERVADA",
      retroalimentacion,
      nota: undefined,
      horasReconocidas: 0,
    });
    emitirCambio();
    return actualizada;
  },

  async registrarEntregaPortal(
    cursoPortalId: string,
    itemId: string,
    archivo: File,
    estudiante: { id: string; nombre: string },
  ): Promise<EntregaActividadAcademica> {
    if (archivo.type !== "application/pdf") {
      throw new Error("Solo se permiten archivos PDF");
    }
    if (archivo.size > 8_000_000) {
      throw new Error("El PDF debe pesar menos de 8 MB en la demostración");
    }
    const cursoId = resolverCursoAcademicoId(cursoPortalId);
    if (!apiConfig.useMock) {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      const { data } = await api.post<EntregaActividadAcademica>(
        API.academico.entregarActividad(cursoId, itemId),
        formulario,
      );
      return data;
    }
    const curso = (await listarCursosPermitidos()).find(
      (item) => item.id === cursoId,
    );
    if (!curso)
      throw new Error("No se encontró el curso académico relacionado");
    const modulos = await this.listarModulos(cursoId);
    const numeroModulo = Number(itemId.match(/\d+/)?.[0] ?? 5);
    const modulo =
      modulos[Math.min(Math.max(numeroModulo - 1, 0), modulos.length - 1)];
    const actividad = modulo?.actividades[0];
    if (!modulo || !actividad)
      throw new Error("No se encontró la actividad académica");
    const entregas = await entregasRepo.listar();
    const existente = entregas.find(
      (entrega) =>
        entrega.cursoId === cursoId &&
        entrega.actividadId === actividad.id &&
        entrega.estudianteId === estudiante.id,
    );
    const archivoId = `archivo-${Date.now()}`;
    await guardarArchivoLocal(archivoId, archivo);
    const datos: EntregaActividadAcademica = {
      id: existente?.id ?? `entrega-${estudiante.id}-${actividad.id}`,
      organizacionId: curso.organizacionId,
      cursoId,
      cursoTitulo: curso.titulo,
      moduloId: modulo.id,
      moduloTitulo: modulo.titulo,
      actividadId: actividad.id,
      actividadTitulo: actividad.titulo,
      estudianteId: estudiante.id,
      estudianteNombre: estudiante.nombre,
      estudianteIniciales: iniciales(estudiante.nombre),
      intento: (existente?.intento ?? 0) + 1,
      entregadaEn: new Date().toISOString(),
      estado: "EN_REVISION",
      archivo: {
        id: archivoId,
        nombre: archivo.name,
        tipo: archivo.type,
        tamanio: archivo.size,
        referencia: `indexeddb/${archivoId}`,
      },
      nota: undefined,
      retroalimentacion: undefined,
      calificadaEn: undefined,
      horasReconocidas: 0,
    };
    const guardada = existente
      ? await entregasRepo.actualizar(existente.id, datos)
      : await entregasRepo.crear(datos);
    emitirCambio();
    return guardada;
  },

  async descargarArchivo(entrega: EntregaActividadAcademica) {
    if (!apiConfig.useMock) {
      const { data } = await api.get<{ url: string }>(
        API.academico.archivoEntrega(entrega.id),
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (entrega.archivo?.contenidoBase64) {
      const enlace = document.createElement("a");
      enlace.href = entrega.archivo.contenidoBase64;
      enlace.download = entrega.archivo.nombre;
      enlace.click();
      return;
    }
    if (entrega.archivo) {
      const archivo = await obtenerArchivoLocal(entrega.archivo.id);
      if (archivo) {
        const enlace = document.createElement("a");
        const url = URL.createObjectURL(archivo);
        enlace.href = url;
        enlace.download = entrega.archivo.nombre;
        enlace.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        return;
      }
    }
    (await crearPdfDemostracion(entrega)).save(
      entrega.archivo?.nombre ?? `entrega-${entrega.id}.pdf`,
    );
  },

  async abrirArchivo(entrega: EntregaActividadAcademica) {
    if (!apiConfig.useMock && entrega.archivo) {
      const { data } = await api.get<{ url: string }>(
        API.academico.archivoEntrega(entrega.id),
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    const archivoLocal = entrega.archivo
      ? await obtenerArchivoLocal(entrega.archivo.id)
      : null;
    const pdfDemostracion = archivoLocal
      ? null
      : await crearPdfDemostracion(entrega);
    const url = entrega.archivo?.contenidoBase64
      ? entrega.archivo.contenidoBase64
      : URL.createObjectURL(
          archivoLocal ?? pdfDemostracion!.output("blob"),
        );
    window.open(url, "_blank", "noopener,noreferrer");
    if (url.startsWith("blob:")) {
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    }
  },

  async obtenerElegibilidad(
    cursoId: string,
    estudianteId: string,
  ): Promise<ElegibilidadCertificadoAcademico> {
    const [entregas, modulos] = await Promise.all([
      this.listarEntregasCurso(cursoId),
      this.listarModulos(cursoId),
    ]);
    const delEstudiante = entregas.filter(
      (entrega) => entrega.estudianteId === estudianteId,
    );
    const resumen = this.resumirEstudiantes(delEstudiante, modulos)[0];
    const curso = (await listarCursosPermitidos()).find(
      (item) => item.id === resolverCursoAcademicoId(cursoId),
    );
    const actividadesRequeridas = modulos.reduce(
      (total, modulo) =>
        total +
        modulo.actividades.filter((actividad) => actividad.obligatoria).length,
      0,
    );
    const modulosCompletados = modulos.filter((modulo) =>
      modulo.actividades
        .filter((actividad) => actividad.obligatoria)
        .every((actividad) =>
          delEstudiante.some(
            (entrega) =>
              entrega.actividadId === actividad.id &&
              entrega.estado === "CALIFICADA",
          ),
        ),
    ).length;
    const motivos: string[] = [];
    if (!resumen || resumen.actividadesCalificadas < actividadesRequeridas) {
      motivos.push("Tiene actividades obligatorias pendientes de calificación");
    }
    if (!resumen || resumen.notaFinal < 14) {
      motivos.push("La nota final todavía no alcanza 14 sobre 20");
    }
    if (!resumen || resumen.horasCumplidas < resumen.horasRequeridas) {
      motivos.push("Aún no cumple las horas académicas requeridas");
    }
    return {
      cursoId: curso?.id ?? resolverCursoAcademicoId(cursoId),
      cursoTitulo: curso?.titulo ?? delEstudiante[0]?.cursoTitulo ?? "Curso",
      estudianteId,
      estudianteNombre:
        resumen?.estudianteNombre ??
        delEstudiante[0]?.estudianteNombre ??
        "Estudiante",
      notaFinal: resumen?.notaFinal ?? 0,
      horasCumplidas: resumen?.horasCumplidas ?? 0,
      horasRequeridas: resumen?.horasRequeridas ?? 0,
      modulosCompletados,
      modulosTotales: modulos.length,
      actividadesCalificadas: resumen?.actividadesCalificadas ?? 0,
      actividadesRequeridas,
      elegible: motivos.length === 0,
      motivos,
    };
  },

  async listarElegibilidades(
    cursoId?: string,
  ): Promise<ElegibilidadCertificadoAcademico[]> {
    const [cursosDisponibles, todasLasEntregas, modulosGuardados] =
      await Promise.all([
        listarCursosPermitidos(),
        entregasRepo.listar(),
        modulosRepo.listar(),
      ]);
    const cursos = cursoId
      ? cursosDisponibles.filter(
          (curso) => curso.id === resolverCursoAcademicoId(cursoId),
        )
      : cursosDisponibles;

    let todosLosModulos = modulosGuardados;
    if (apiConfig.useMock) {
      const cursosSinEstructura = cursos.filter(
        (curso) =>
          !todosLosModulos.some((modulo) => modulo.cursoId === curso.id),
      );
      if (cursosSinEstructura.length) {
        todosLosModulos = [
          ...todosLosModulos,
          ...cursosSinEstructura.flatMap((curso) =>
            crearModulosCurso(curso.id),
          ),
        ];
        await modulosRepo.reemplazar(todosLosModulos);
      }
    }

    const resultado: ElegibilidadCertificadoAcademico[] = [];
    for (const curso of cursos) {
      const entregas = todasLasEntregas.filter(
        (entrega) => entrega.cursoId === curso.id,
      );
      const modulos = todosLosModulos
        .filter((modulo) => modulo.cursoId === curso.id)
        .sort((primero, segundo) => primero.orden - segundo.orden);
      const resumenes = this.resumirEstudiantes(entregas, modulos);

      for (const resumen of resumenes) {
        const entregasEstudiante = entregas.filter(
          (entrega) => entrega.estudianteId === resumen.estudianteId,
        );
        const modulosCompletados = modulos.filter((modulo) =>
          modulo.actividades
            .filter((actividad) => actividad.obligatoria)
            .every((actividad) =>
              entregasEstudiante.some(
                (entrega) =>
                  entrega.actividadId === actividad.id &&
                  entrega.estado === "CALIFICADA",
              ),
            ),
        ).length;
        const motivos: string[] = [];
        if (resumen.actividadesCalificadas < resumen.actividadesRequeridas) {
          motivos.push(
            "Tiene actividades obligatorias pendientes de calificación",
          );
        }
        if (resumen.notaFinal < 14) {
          motivos.push("La nota final todavía no alcanza 14 sobre 20");
        }
        if (resumen.horasCumplidas < resumen.horasRequeridas) {
          motivos.push("Aún no cumple las horas académicas requeridas");
        }
        resultado.push({
          cursoId: curso.id,
          cursoTitulo: curso.titulo,
          estudianteId: resumen.estudianteId,
          estudianteNombre: resumen.estudianteNombre,
          notaFinal: resumen.notaFinal,
          horasCumplidas: resumen.horasCumplidas,
          horasRequeridas: resumen.horasRequeridas,
          modulosCompletados,
          modulosTotales: modulos.length,
          actividadesCalificadas: resumen.actividadesCalificadas,
          actividadesRequeridas: resumen.actividadesRequeridas,
          elegible: motivos.length === 0,
          motivos,
        });
      }
    }
    return resultado;
  },

  async registrarVerificacion(
    verificacion: VerificacionCertificadoAcademico,
  ): Promise<VerificacionCertificadoAcademico> {
    const existente = await verificacionesRepo.obtener(verificacion.codigo);
    const registro: RegistroVerificacionAcademica = {
      ...verificacion,
      id: verificacion.codigo,
    };
    const guardada = existente
      ? await verificacionesRepo.actualizar(verificacion.codigo, registro)
      : await verificacionesRepo.crear(registro);
    emitirCambio();
    return guardada;
  },

  async registrarVerificaciones(
    verificaciones: VerificacionCertificadoAcademico[],
  ): Promise<VerificacionCertificadoAcademico[]> {
    if (!verificaciones.length) return [];
    if (!apiConfig.useMock) {
      return Promise.all(
        verificaciones.map((verificacion) =>
          this.registrarVerificacion(verificacion),
        ),
      );
    }
    const actuales = await verificacionesRepo.listar();
    const porCodigo = new Map(
      actuales.map((verificacion) => [verificacion.codigo, verificacion]),
    );
    verificaciones.forEach((verificacion) => {
      porCodigo.set(verificacion.codigo, {
        ...porCodigo.get(verificacion.codigo),
        ...verificacion,
        id: verificacion.codigo,
      });
    });
    await verificacionesRepo.reemplazar([...porCodigo.values()]);
    emitirCambio();
    return verificaciones;
  },

  async verificarCertificado(
    codigo: string,
  ): Promise<VerificacionCertificadoAcademico | null> {
    if (!apiConfig.useMock) {
      const { data } = await api.get<VerificacionCertificadoAcademico>(
        API.academico.verificarCertificado(codigo),
      );
      return data;
    }
    return verificacionesRepo.obtener(codigo);
  },
};
