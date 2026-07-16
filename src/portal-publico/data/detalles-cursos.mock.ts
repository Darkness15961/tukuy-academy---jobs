import type {
  Course,
  DetalleCursoPublico,
  InstructorCursoPublico,
  ModuloCursoPublico,
} from "@/types/academia";

const VIDEO_PRESENTACION =
  "https://www.pexels.com/download/video/10810477/";

const instructores: InstructorCursoPublico[] = [
  {
    nombre: "Ing. Marco Ruiz",
    cargo: "Especialista en gestión y control de obras",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Ingeniero civil dedicado a transformar procesos de obra en metodologías prácticas de aprendizaje y control digital.",
    experiencia: [
      "14 años liderando proyectos de infraestructura",
      "Consultor en transformación digital para construcción",
      "Formador de equipos técnicos y operativos",
    ],
  },
  {
    nombre: "Lic. Ana Torres",
    cargo: "Especialista en seguridad y formación laboral",
    foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Profesional en seguridad ocupacional con experiencia diseñando programas preventivos para personal técnico y de campo.",
    experiencia: [
      "12 años en seguridad y salud en el trabajo",
      "Auditora de sistemas de prevención de riesgos",
      "Facilitadora de programas para equipos de obra",
    ],
  },
  {
    nombre: "Arq. Luis Quispe",
    cargo: "Arquitecto y coordinador BIM",
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Arquitecto especializado en lectura técnica, coordinación de especialidades y comunicación visual aplicada a obra.",
    experiencia: [
      "11 años coordinando expedientes y planos",
      "Especialista en flujos BIM y control documental",
      "Docente de interpretación gráfica para campo",
    ],
  },
  {
    nombre: "Mg. Carla Mendoza",
    cargo: "Consultora en empleabilidad y desarrollo profesional",
    foto: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Especialista en desarrollo de talento, construcción de perfiles profesionales y conexión entre competencias y oportunidades.",
    experiencia: [
      "10 años gestionando talento en empresas técnicas",
      "Mentora de empleabilidad para perfiles operativos",
      "Especialista en selección basada en competencias",
    ],
  },
  {
    nombre: "Ing. Jorge Vargas",
    cargo: "Especialista en costos y producción de obra",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Ingeniero civil enfocado en metrados, valorizaciones y seguimiento de producción para decisiones sustentadas.",
    experiencia: [
      "15 años en costos y control de proyectos",
      "Responsable de valorizaciones públicas y privadas",
      "Asesor de oficinas técnicas de obra",
    ],
  },
  {
    nombre: "Lic. Patricia Soto",
    cargo: "Especialista en logística y gestión documental",
    foto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=85",
    biografia:
      "Profesional en logística con experiencia conectando almacén, documentación y operación para mejorar la trazabilidad de proyectos.",
    experiencia: [
      "13 años gestionando cadenas de abastecimiento",
      "Implementadora de Kardex y control de inventarios",
      "Formadora de responsables de almacén de obra",
    ],
  },
];

const promociones: Record<
  string,
  { precioAnterior: number; descuento: number }
> = {
  "c-001": { precioAnterior: 119, descuento: 25 },
  "c-002": { precioAnterior: 159, descuento: 20 },
  "c-004": { precioAnterior: 189, descuento: 20 },
  "c-005": { precioAnterior: 129, descuento: 20 },
  "c-007": { precioAnterior: 239, descuento: 25 },
  "c-008": { precioAnterior: 149, descuento: 20 },
  "c-009": { precioAnterior: 199, descuento: 20 },
};

const temarios: Record<string, Omit<ModuloCursoPublico, "id">[]> = {
  "c-000": [
    {
      titulo: "Configuración y entorno Tukuy Obra",
      temas: ["Acceso, roles y permisos", "Estructura digital del proyecto"],
    },
    {
      titulo: "Planificación inicial del proyecto",
      temas: ["Datos generales de obra", "Actividades, partidas y responsables"],
    },
    {
      titulo: "Seguimiento de avances",
      temas: ["Registro diario de producción", "Evidencias y alertas de control"],
    },
    {
      titulo: "Paneles y reportes de gestión",
      temas: ["Indicadores principales", "Exportación y lectura de reportes"],
    },
  ],
  "c-001": [
    {
      titulo: "Fundamentos de seguridad en obra",
      temas: ["Peligros, riesgos y controles", "Responsabilidades preventivas"],
    },
    {
      titulo: "Trabajo seguro en actividades críticas",
      temas: ["Altura, excavación y espacios confinados", "Herramientas y equipos"],
    },
    {
      titulo: "Inspecciones y respuesta",
      temas: ["Inspecciones planificadas", "Incidentes y acciones correctivas"],
    },
    {
      titulo: "Cultura preventiva",
      temas: ["Comunicación efectiva", "Evaluación final de seguridad"],
    },
  ],
  "c-002": [
    {
      titulo: "Organización del almacén de obra",
      temas: ["Zonificación y codificación", "Documentos de ingreso y salida"],
    },
    {
      titulo: "Kardex y movimientos",
      temas: ["Registro de operaciones", "Saldos y trazabilidad"],
    },
    {
      titulo: "Inventarios y control físico",
      temas: ["Conteos cíclicos", "Diferencias y regularizaciones"],
    },
    {
      titulo: "Indicadores logísticos",
      temas: ["Rotación y quiebres de stock", "Reportes para decisiones"],
    },
  ],
  "c-003": [
    {
      titulo: "Propuesta de valor profesional",
      temas: ["Competencias y logros", "Objetivo laboral"],
    },
    {
      titulo: "CV para perfiles de obra",
      temas: ["Estructura y palabras clave", "Experiencia y evidencias"],
    },
    {
      titulo: "Perfil digital y certificados",
      temas: ["Portafolio verificable", "Presentación profesional"],
    },
    {
      titulo: "Postulación y entrevista",
      temas: ["Búsqueda de oportunidades", "Preparación para entrevistas"],
    },
  ],
  "c-004": [
    {
      titulo: "Lenguaje y representación de planos",
      temas: ["Escalas, símbolos y convenciones", "Ubicación y orientación"],
    },
    {
      titulo: "Planos de arquitectura",
      temas: ["Plantas, cortes y elevaciones", "Detalles constructivos"],
    },
    {
      titulo: "Planos de estructuras e instalaciones",
      temas: ["Elementos estructurales", "Compatibilización básica"],
    },
    {
      titulo: "Aplicación en campo",
      temas: ["Replanteo e identificación", "Consultas y control de cambios"],
    },
  ],
  "c-005": [
    {
      titulo: "Bases del control integrado",
      temas: ["Alcance, costo y plazo", "Línea base del proyecto"],
    },
    {
      titulo: "Medición del avance físico",
      temas: ["Metrados ejecutados", "Curvas e indicadores"],
    },
    {
      titulo: "Seguimiento financiero",
      temas: ["Costos reales y comprometidos", "Desviaciones presupuestales"],
    },
    {
      titulo: "Reportes para decisiones",
      temas: ["Proyecciones de cierre", "Comunicación de resultados"],
    },
  ],
  "c-006": [
    {
      titulo: "Estructura del cuaderno digital",
      temas: ["Roles y responsabilidades", "Tipos de asiento"],
    },
    {
      titulo: "Registro técnico de obra",
      temas: ["Consultas y ocurrencias", "Anexos y evidencias"],
    },
    {
      titulo: "Seguimiento y trazabilidad",
      temas: ["Estados y respuestas", "Búsqueda y filtros"],
    },
    {
      titulo: "Cierre documental",
      temas: ["Reportes consolidados", "Archivo y entrega"],
    },
  ],
  "c-007": [
    {
      titulo: "Metrados y partidas contractuales",
      temas: ["Criterios de medición", "Sustento de cantidades"],
    },
    {
      titulo: "Preparación de valorizaciones",
      temas: ["Avance valorizado", "Amortizaciones y retenciones"],
    },
    {
      titulo: "Control y conciliación",
      temas: ["Revisión de metrados", "Observaciones y correcciones"],
    },
    {
      titulo: "Reportes de obra",
      temas: ["Resumen ejecutivo", "Proyección económica"],
    },
  ],
  "c-008": [
    {
      titulo: "Configuración de Tukuy Almacén",
      temas: ["Catálogos y unidades", "Usuarios y almacenes"],
    },
    {
      titulo: "Ingresos, salidas y transferencias",
      temas: ["Flujos documentarios", "Trazabilidad de movimientos"],
    },
    {
      titulo: "Stock y abastecimiento",
      temas: ["Saldos disponibles", "Alertas y reposición"],
    },
    {
      titulo: "Reportes operativos",
      temas: ["Kardex valorizado", "Consumos por proyecto"],
    },
  ],
  "c-009": [
    {
      titulo: "Fundamentos de IA para obra",
      temas: ["Casos de uso", "Datos y criterios de calidad"],
    },
    {
      titulo: "Asistencia para reportes",
      temas: ["Estructuración de información", "Redacción y síntesis"],
    },
    {
      titulo: "Análisis para decisiones",
      temas: ["Detección de tendencias", "Alertas y escenarios"],
    },
    {
      titulo: "Uso responsable y validación",
      temas: ["Revisión humana", "Seguridad y buenas prácticas"],
    },
  ],
};

function temarioPredeterminado(curso: Course): Omit<ModuloCursoPublico, "id">[] {
  return [
    {
      titulo: `Fundamentos de ${curso.category}`,
      temas: ["Conceptos principales", "Criterios de aplicación"],
    },
    {
      titulo: "Aplicación práctica",
      temas: ["Flujo de trabajo", "Caso aplicado"],
    },
    {
      titulo: "Control y evaluación",
      temas: ["Indicadores clave", "Evaluación final"],
    },
  ];
}

export function obtenerDetalleCursoPublico(
  curso: Course,
): DetalleCursoPublico {
  const indice = Number.parseInt(curso.id.replace("c-", ""), 10) || 0;
  const modulos = temarios[curso.id] ?? temarioPredeterminado(curso);

  return {
    cursoId: curso.id,
    videoPresentacion: VIDEO_PRESENTACION,
    ...promociones[curso.id],
    instructor: instructores[indice % instructores.length]!,
    modulos: modulos.map((modulo, posicion) => ({
      ...modulo,
      id: `${curso.id}-modulo-${posicion + 1}`,
    })),
  };
}
