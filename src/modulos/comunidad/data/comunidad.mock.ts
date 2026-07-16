import type {
  EventoComunidad,
  GrupoComunidad,
  PublicacionComunidad,
} from "../types/comunidad.types";

const autores = {
  docente: {
    id: "autor-docente",
    nombre: "Ana Torres",
    cargo: "Especialista en seguridad de obra",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=220&q=85",
    portal: "docente" as const,
    verificado: true,
  },
  estudiante: {
    id: "autor-estudiante",
    nombre: "Carlos Quispe",
    cargo: "Auxiliar de almacén",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=220&q=85",
    portal: "estudiante" as const,
  },
  organizacion: {
    id: "autor-organizacion",
    nombre: "Constructora Andes",
    cargo: "Organización verificada",
    avatar:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=220&q=85",
    portal: "organizacion" as const,
    verificado: true,
  },
};

export const publicacionesMock: PublicacionComunidad[] = [
  {
    id: "pub-001",
    tipo: "experiencia",
    autor: autores.docente,
    contenido:
      "Una charla de cinco minutos antes de iniciar la jornada puede revelar riesgos que no aparecen en el procedimiento escrito. Comparto la matriz que utilizamos para convertir observaciones de campo en acciones preventivas.",
    imagen:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1300&q=86",
    etiquetas: ["Seguridad", "Experiencia de campo"],
    fecha: "Hace 35 minutos",
    reacciones: 48,
    reaccionada: false,
    comentarios: [],
  },
  {
    id: "pub-002",
    tipo: "pregunta",
    autor: autores.estudiante,
    contenido:
      "¿Qué indicadores recomiendan para detectar diferencias de inventario antes del cierre mensual? Actualmente controlo entradas, salidas y saldos por partida.",
    etiquetas: ["Almacén", "Kardex", "Consulta"],
    fecha: "Hace 2 horas",
    reacciones: 16,
    reaccionada: true,
    comentarios: [
      {
        id: "com-001",
        autor: autores.docente,
        contenido:
          "Comienza con rotación, diferencias por familia y movimientos sin sustento. Luego cruza esos datos con los responsables de cada frente.",
        fecha: "Hace 1 hora",
      },
    ],
  },
  {
    id: "pub-003",
    tipo: "oportunidad",
    autor: autores.organizacion,
    contenido:
      "Abrimos una convocatoria para asistentes de control de obra en Lima. Valoraremos certificados verificables y experiencia registrando avances y evidencias.",
    imagen:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1300&q=86",
    etiquetas: ["Oportunidad", "Control de obra", "Lima"],
    fecha: "Ayer",
    reacciones: 72,
    reaccionada: false,
    comentarios: [],
  },
];

export const gruposMock: GrupoComunidad[] = [
  {
    id: "grupo-almacenes",
    nombre: "Almacenes y logística de obra",
    descripcion:
      "Buenas prácticas, formatos y experiencias para mejorar la trazabilidad de materiales.",
    imagen:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=85",
    integrantes: 1284,
    categoria: "Operaciones",
  },
  {
    id: "grupo-seguridad",
    nombre: "Seguridad que se practica",
    descripcion:
      "Consultas y casos reales sobre prevención, inspecciones y cultura de seguridad.",
    imagen:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1000&q=85",
    integrantes: 936,
    categoria: "Seguridad",
  },
  {
    id: "grupo-control",
    nombre: "Control y producción de proyectos",
    descripcion:
      "Indicadores, avances, valorizaciones y decisiones basadas en información de obra.",
    imagen:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=85",
    integrantes: 742,
    categoria: "Gestión",
  },
];

export const eventosMock: EventoComunidad[] = [
  {
    id: "evento-001",
    titulo: "Del Kardex al control inteligente de materiales",
    descripcion:
      "Sesión práctica con casos de inventario, diferencias y trazabilidad en obra.",
    imagen:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=85",
    fecha: "24 julio 2026",
    hora: "19:00",
    modalidad: "Virtual",
    organizador: "Academia Tukuy",
    inscritos: 184,
  },
  {
    id: "evento-002",
    titulo: "Encuentro de responsables de seguridad",
    descripcion:
      "Conversación presencial sobre aprendizajes y desafíos preventivos en proyectos.",
    imagen:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1100&q=85",
    fecha: "2 agosto 2026",
    hora: "09:30",
    modalidad: "Presencial",
    organizador: "Comunidad Tukuy",
    inscritos: 76,
  },
];

