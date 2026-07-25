import type { RevisionAcademicaCurso } from "@/portal-organizacion/types/revision-curso.types";

const recursosBase = [
  {
    id: "rec-1",
    nombre: "Guía práctica del módulo.pdf",
    tipo: "PDF" as const,
    tamanio: "2.4 MB",
    urlDemo: "#material-pdf",
  },
  {
    id: "rec-2",
    nombre: "Plantilla de trabajo.xlsx",
    tipo: "PLANTILLA" as const,
    tamanio: "840 KB",
    urlDemo: "#plantilla",
  },
];

function crearRevision(
  cursoId: string,
  tema: string,
  version = 1,
): RevisionAcademicaCurso {
  return {
    cursoId,
    version,
    descripcion: `Programa aplicado de ${tema.toLowerCase()} con demostraciones, casos institucionales y evidencias evaluables.`,
    objetivos: [
      `Comprender los fundamentos de ${tema.toLowerCase()}.`,
      "Aplicar el procedimiento en un caso real de la organización.",
      "Generar evidencias verificables para la evaluación final.",
    ],
    requisitos: [
      "Conocimientos básicos de gestión de proyectos",
      "Acceso a computadora o dispositivo móvil",
    ],
    modulos: [
      {
        id: `${cursoId}-m1`,
        titulo: "Fundamentos y diagnóstico",
        descripcion:
          "Conceptos, criterios y reconocimiento del escenario inicial.",
        clases: [
          "Introducción y alcance",
          "Diagnóstico del caso",
          "Buenas prácticas",
        ],
        recursos: recursosBase.map((item, i) => ({
          ...item,
          id: `${cursoId}-m1-r${i}`,
        })),
        actividades: ["Cuestionario diagnóstico"],
      },
      {
        id: `${cursoId}-m2`,
        titulo: "Aplicación guiada",
        descripcion: "Desarrollo paso a paso sobre un proyecto demostrativo.",
        clases: [
          "Preparación de información",
          "Ejecución del procedimiento",
          "Control de resultados",
        ],
        recursos: [
          {
            id: `${cursoId}-m2-r1`,
            nombre: "Demostración del procedimiento",
            tipo: "VIDEO",
            tamanio: "18 min",
            urlDemo: "#video-demo",
          },
        ],
        actividades: ["Entrega práctica en PDF", "Lista de verificación"],
      },
      {
        id: `${cursoId}-m3`,
        titulo: "Caso final y evaluación",
        descripcion: "Resolución integral, retroalimentación y cierre.",
        clases: ["Caso integrador", "Errores frecuentes", "Conclusiones"],
        recursos: [
          {
            id: `${cursoId}-m3-r1`,
            nombre: "Caso integrador descargable.pdf",
            tipo: "PDF",
            tamanio: "3.1 MB",
            urlDemo: "#caso-final",
          },
        ],
        actividades: ["Evaluación final", "Evidencia del caso aplicado"],
      },
    ],
    horasCertificables: 24,
    notaMinimaPropuesta: 14,
    certificadoPropuesto: true,
    enviadaEn: "2026-07-20T10:30:00-05:00",
  };
}

export const revisionesCursosMock: Record<string, RevisionAcademicaCurso> = {
  "prop-doc-3": crearRevision("doc-3", "Valorizaciones y avance de obra", 2),
  "prop-doc-8": crearRevision("doc-8", "Cuaderno de obra digital y evidencias"),
  "prop-doc-12": crearRevision(
    "doc-12",
    "Gestión de expedientes técnicos",
    3,
  ),
};

export function obtenerRevisionCursoMock(
  propuestaId: string,
  cursoId: string,
  titulo: string,
) {
  return structuredClone(
    revisionesCursosMock[propuestaId] ?? crearRevision(cursoId, titulo),
  );
}
