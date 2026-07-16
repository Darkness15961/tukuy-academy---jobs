import type { CourseSection } from "@/types/academia";

/**
 * Generates realistic course sections for any course.
 * Each course gets 3-5 sections with 4-6 lessons each.
 */
export function getCourseSections(
  courseId: string,
  courseTitle: string,
  category: string,
): CourseSection[] {
  const sectionsByCategory: Record<string, CourseSection[]> = {
    "Tukuy Obra": [
      {
        id: `${courseId}-s1`,
        title: "Introducción a Tukuy Obra",
        lessons: [
          {
            id: `${courseId}-s1-l1`,
            title: "¿Qué veremos en esta sección?",
            duration: "3 min",
            type: "video",
          },
          {
            id: `${courseId}-s1-l2`,
            title: "Navegación general del sistema",
            duration: "8 min",
            type: "video",
          },
          {
            id: `${courseId}-s1-l3`,
            title: "Configuración inicial de un proyecto",
            duration: "12 min",
            type: "video",
          },
          {
            id: `${courseId}-s1-l4`,
            title: "Roles y permisos de usuario",
            duration: "6 min",
            type: "video",
          },
          {
            id: `${courseId}-s1-l5`,
            title: "Lectura: Glosario de términos",
            duration: "5 min",
            type: "lectura",
          },
        ],
      },
      {
        id: `${courseId}-s2`,
        title: "Gestión de proyectos",
        lessons: [
          {
            id: `${courseId}-s2-l1`,
            title: "Creación y estructura de obra",
            duration: "10 min",
            type: "video",
          },
          {
            id: `${courseId}-s2-l2`,
            title: "Vinculación de partidas y presupuesto",
            duration: "14 min",
            type: "video",
          },
          {
            id: `${courseId}-s2-l3`,
            title: "Cronograma y hitos de avance",
            duration: "11 min",
            type: "video",
          },
          {
            id: `${courseId}-s2-l4`,
            title: "Quiz: Conceptos de gestión",
            duration: "5 min",
            type: "quiz",
          },
        ],
      },
      {
        id: `${courseId}-s3`,
        title: "Control y seguimiento",
        lessons: [
          {
            id: `${courseId}-s3-l1`,
            title: "Dashboard de indicadores",
            duration: "9 min",
            type: "video",
          },
          {
            id: `${courseId}-s3-l2`,
            title: "Reportes de avance físico",
            duration: "13 min",
            type: "video",
          },
          {
            id: `${courseId}-s3-l3`,
            title: "Alertas y notificaciones",
            duration: "7 min",
            type: "video",
          },
          {
            id: `${courseId}-s3-l4`,
            title: "Exportación de informes",
            duration: "8 min",
            type: "video",
          },
          {
            id: `${courseId}-s3-l5`,
            title: "Lectura: Buenas prácticas",
            duration: "4 min",
            type: "lectura",
          },
        ],
      },
      {
        id: `${courseId}-s4`,
        title: "Evaluación final",
        lessons: [
          {
            id: `${courseId}-s4-l1`,
            title: "Repaso general del módulo",
            duration: "6 min",
            type: "video",
          },
          {
            id: `${courseId}-s4-l2`,
            title: "Evaluación final",
            duration: "15 min",
            type: "quiz",
          },
          {
            id: `${courseId}-s4-l3`,
            title: "Cierre y próximos pasos",
            duration: "3 min",
            type: "video",
          },
        ],
      },
    ],
  };

  // Default sections for any category not specifically mapped
  const defaultSections: CourseSection[] = [
    {
      id: `${courseId}-s1`,
      title: `Introducción a ${category}`,
      lessons: [
        {
          id: `${courseId}-s1-l1`,
          title: "¿Qué veremos en esta sección?",
          duration: "3 min",
          type: "video",
        },
        {
          id: `${courseId}-s1-l2`,
          title: "Conceptos fundamentales",
          duration: "10 min",
          type: "video",
        },
        {
          id: `${courseId}-s1-l3`,
          title: "Marco normativo y referencias",
          duration: "8 min",
          type: "video",
        },
        {
          id: `${courseId}-s1-l4`,
          title: "Herramientas necesarias",
          duration: "5 min",
          type: "lectura",
        },
      ],
    },
    {
      id: `${courseId}-s2`,
      title: "Metodología aplicada",
      lessons: [
        {
          id: `${courseId}-s2-l1`,
          title: "Flujo de trabajo estándar",
          duration: "12 min",
          type: "video",
        },
        {
          id: `${courseId}-s2-l2`,
          title: "Configuración del entorno",
          duration: "9 min",
          type: "video",
        },
        {
          id: `${courseId}-s2-l3`,
          title: "Ejercicio guiado paso a paso",
          duration: "18 min",
          type: "video",
        },
        {
          id: `${courseId}-s2-l4`,
          title: "Errores comunes y cómo evitarlos",
          duration: "7 min",
          type: "video",
        },
        {
          id: `${courseId}-s2-l5`,
          title: "Quiz: Metodología",
          duration: "5 min",
          type: "quiz",
        },
      ],
    },
    {
      id: `${courseId}-s3`,
      title: "Casos prácticos",
      lessons: [
        {
          id: `${courseId}-s3-l1`,
          title: "Caso 1: Proyecto real simplificado",
          duration: "15 min",
          type: "video",
        },
        {
          id: `${courseId}-s3-l2`,
          title: "Caso 2: Escenario con incidencias",
          duration: "14 min",
          type: "video",
        },
        {
          id: `${courseId}-s3-l3`,
          title: "Análisis comparativo de resultados",
          duration: "10 min",
          type: "video",
        },
        {
          id: `${courseId}-s3-l4`,
          title: "Lectura: Lecciones aprendidas",
          duration: "6 min",
          type: "lectura",
        },
      ],
    },
    {
      id: `${courseId}-s4`,
      title: "Aplicación en campo",
      lessons: [
        {
          id: `${courseId}-s4-l1`,
          title: "Adaptación a tu contexto laboral",
          duration: "8 min",
          type: "video",
        },
        {
          id: `${courseId}-s4-l2`,
          title: "Integración con otros módulos",
          duration: "11 min",
          type: "video",
        },
        {
          id: `${courseId}-s4-l3`,
          title: "Reportes y evidencias",
          duration: "9 min",
          type: "video",
        },
      ],
    },
    {
      id: `${courseId}-s5`,
      title: "Evaluación y cierre",
      lessons: [
        {
          id: `${courseId}-s5-l1`,
          title: "Resumen del curso",
          duration: "5 min",
          type: "video",
        },
        {
          id: `${courseId}-s5-l2`,
          title: "Evaluación final",
          duration: "15 min",
          type: "quiz",
        },
        {
          id: `${courseId}-s5-l3`,
          title: "Recursos adicionales",
          duration: "3 min",
          type: "lectura",
        },
        {
          id: `${courseId}-s5-l4`,
          title: "Cierre y certificación",
          duration: "2 min",
          type: "video",
        },
      ],
    },
  ];

  return sectionsByCategory[category] ?? defaultSections;
}
