import type {
  ContenidoCursoAprendizaje,
  ModuloAprendizaje,
  PreguntaQuiz,
} from "@/types/aprendizaje.types";

/** Semilla de temario compartida (demo). Se clona por cursoId al primer acceso. */
export const MODULOS_APRENDIZAJE_SEMILLA: ModuloAprendizaje[] = [
  {
    id: "m1",
    title: "Módulo 1: Fundamentos y Conceptos Generales",
    items: [
      {
        id: "v1.1",
        title: "Video 1.1: Introducción a la plataforma y objetivos",
        type: "video",
        duration: "5 min",
        description:
          "Explicación del contenido general del curso, dinámicas de estudio y cómo usar el portal de Tukuy Academy para maximizar tu aprendizaje.",
      },
      {
        id: "v1.2",
        title: "Video 1.2: Conceptos fundamentales de Tukuy Obra",
        type: "video",
        duration: "10 min",
        description:
          "Introducción a la arquitectura de Tukuy Obra, estructura de datos y cómo interactúa el equipo de oficina técnica con la información diaria de campo.",
      },
      {
        id: "v1.3",
        title: "Video 1.3: Terminología clave en gestión de obras",
        type: "video",
        duration: "15 min",
        description:
          "Repaso de términos técnicos necesarios: metrados, valorizaciones, partidas de control diario y su representación dentro del sistema.",
      },
      {
        id: "r1.1",
        title: "Actividad: Glosario de términos del Módulo 1",
        type: "reading",
        duration: "10 min",
        description:
          "Documentación teórica oficial con las definiciones clave tratadas en el módulo. Recomendado leer detenidamente antes del cuestionario.",
      },
      {
        id: "q1.1",
        title: "Actividad: Cuestionario rápido de fundamentos",
        type: "quiz",
        questions: 5,
        grade: 18,
        description:
          "Pequeño examen teórico de 5 preguntas diseñado para validar tu comprensión sobre conceptos básicos de Tukuy y gestión operativa.",
      },
      {
        id: "a1.1",
        title: "Evidencia 1: Fundamentos aplicados",
        type: "assignment",
        description:
          "Entrega en PDF una síntesis de los fundamentos y su aplicación en un caso de trabajo real o simulado.",
      },
    ],
  },
  {
    id: "m2",
    title: "Módulo 2: Herramientas y Metodología Aplicada",
    items: [
      {
        id: "v2.1",
        title: "Video 2.1: Configuración inicial del proyecto en Tukuy",
        type: "video",
        duration: "12 min",
        description:
          "Paso a paso para crear un nuevo proyecto de obra, cargar el presupuesto base y definir los roles de los ingenieros de producción.",
      },
      {
        id: "v2.2",
        title: "Video 2.2: Creación y asignación de partidas de obra",
        type: "video",
        duration: "18 min",
        description:
          "Aprende a estructurar el árbol de partidas, relacionarlas con las unidades de medida oficiales y asignar las tareas de producción diaria.",
      },
      {
        id: "v2.3",
        title: "Video 2.3: Control de avances diario en campo",
        type: "video",
        duration: "20 min",
        description:
          "Demostración práctica de cómo el personal de supervisión ingresa el avance de las partidas desde dispositivos móviles en el frente de trabajo.",
      },
      {
        id: "r2.1",
        title: "Actividad: Caso de estudio práctico",
        type: "reading",
        duration: "15 min",
        description:
          "Análisis de un proyecto de edificación real que logró una reducción del 15% en tiempos de reporte implementando la metodología Tukuy.",
      },
      {
        id: "q2.1",
        title: "Actividad: Cuestionario de metodología aplicada",
        type: "quiz",
        questions: 5,
        grade: 17,
        description:
          "Evaluación objetiva de 5 preguntas sobre la configuración de proyectos y captura de avances diarios de obra.",
      },
      {
        id: "a2.1",
        title: "Evidencia 2: Metodología y herramientas",
        type: "assignment",
        description:
          "Sube en PDF la matriz de metodología, herramientas elegidas y criterios de aplicación.",
      },
    ],
  },
  {
    id: "m3",
    title: "Módulo 3: Casos de Estudio y Análisis de Errores",
    items: [
      {
        id: "v3.1",
        title: "Video 3.1: Análisis de discrepancias en metrados",
        type: "video",
        duration: "15 min",
        description:
          "Cómo identificar y corregir diferencias entre los metrados contratados y los realmente ejecutados en campo usando el panel de alertas.",
      },
      {
        id: "v3.2",
        title: "Video 3.2: Errores comunes en reportes diarios y soluciones",
        type: "video",
        duration: "15 min",
        description:
          "Casos típicos: duplicación de personal, ingreso incorrecto de maquinaria o insumos y cómo solucionarlo en menos de 5 minutos.",
      },
      {
        id: "v3.3",
        title: "Video 3.3: Integración de presupuestos y reajustes",
        type: "video",
        duration: "20 min",
        description:
          "Uso de las fórmulas polinómicas y reajustes dentro del módulo de presupuestos para mantener la contabilidad exacta de la obra.",
      },
      {
        id: "r3.1",
        title: "Actividad: Plantilla Excel de corrección de errores",
        type: "reading",
        duration: "5 min",
        description:
          "Recurso descargable con plantillas de conciliación y control diario para cruzarlas con la base de datos de Tukuy.",
      },
      {
        id: "q3.1",
        title: "Actividad: Cuestionario de control de calidad",
        type: "quiz",
        questions: 5,
        grade: 16,
        description:
          "Cuestionario de 5 preguntas rápidas enfocado en la prevención y corrección de desvíos de metrado y conciliaciones de reportes.",
      },
      {
        id: "a3.1",
        title: "Evidencia 3: Análisis del caso práctico",
        type: "assignment",
        description:
          "Presenta en PDF el análisis del caso, los hallazgos y la propuesta de mejora sustentada.",
      },
    ],
  },
  {
    id: "m4",
    title: "Módulo 4: Evaluación Final y Certificación",
    items: [
      {
        id: "v4.1",
        title: "Video 4.1: Conclusiones y buenas prácticas",
        type: "video",
        duration: "15 min",
        description:
          "Resumen final del curso, consejos del instructor para aplicar Tukuy en tu día a día profesional y próximos pasos sugeridos.",
      },
      {
        id: "q4.1",
        title: "Actividad: Examen final de competencias Tukuy",
        type: "quiz",
        questions: 20,
        grade: 19,
        description:
          "Examen final de certificación de 20 preguntas que abarca todos los módulos del curso. Requiere nota mínima aprobatoria de 14 para obtener el certificado.",
      },
      {
        id: "a4.1",
        title: "Evidencia 4: Resultados y control",
        type: "assignment",
        description:
          "Documenta en PDF las evidencias de ejecución, indicadores obtenidos y controles aplicados.",
      },
    ],
  },
  {
    id: "m5",
    title: "Módulo 5: Proyecto Integrador y Cierre",
    items: [
      {
        id: "v5.1",
        title: "Video 5.1: Orientaciones para el proyecto integrador",
        type: "video",
        duration: "12 min",
        description:
          "Criterios de evaluación, estructura esperada y recomendaciones para presentar el proyecto final.",
      },
      {
        id: "a5.1",
        title: "Proyecto integrador final",
        type: "assignment",
        description:
          "Entrega en PDF el proyecto completo. Esta evidencia cierra el recorrido y forma parte del cálculo de certificación.",
      },
    ],
  },
];

export const QUIZZES_APRENDIZAJE_SEMILLA: Record<string, PreguntaQuiz[]> = {
  "q1.1": [
    {
      question:
        "¿Cuál es la función principal de Tukuy Obra en un proyecto de construcción?",
      options: [
        "Calcular los costos de licitación de manera automática.",
        "Facilitar la comunicación en tiempo real y el control de avances entre el campo y la oficina técnica.",
        "Reemplazar por completo el diseño de AutoCAD del proyecto.",
        "Contratar operarios de forma directa.",
      ],
      correctIndex: 1,
    },
    {
      question: '¿Qué es una "partida de control diario" en la plataforma?',
      options: [
        "Una reunión semanal de ingenieros.",
        "La unidad de avance operativo que se reporta desde el frente de trabajo.",
        "El reporte contable consolidado de fin de año.",
        "Un documento impreso firmado por el cliente.",
      ],
      correctIndex: 1,
    },
    {
      question:
        "¿Quiénes ingresan el avance diario en la plataforma desde el campo?",
      options: [
        "El equipo de contabilidad corporativo.",
        "El personal de supervisión o ingenieros de producción asignados al frente.",
        "Únicamente el gerente general del proyecto.",
        "El cliente final desde su domicilio.",
      ],
      correctIndex: 1,
    },
  ],
  "q2.1": [
    {
      question:
        "¿Cuál es el primer paso recomendado para configurar un proyecto en Tukuy?",
      options: [
        "Cargar el presupuesto base y estructurar el árbol de partidas.",
        "Invitar a todos los contratistas externos sin asignar roles.",
        "Generar el PDF de cierre de obra.",
        "Exportar el reporte mensual.",
      ],
      correctIndex: 0,
    },
    {
      question:
        "Al relacionar partidas, ¿por qué es importante usar unidades de medida oficiales?",
      options: [
        "No es importante, se puede escribir cualquier texto libre.",
        "Para asegurar la consistencia en los reportes de metrados y evitar discrepancias de cálculo.",
        "Para cumplir con las normas de diseño arquitectónico.",
        "Para cambiar el formato del logo de la empresa.",
      ],
      correctIndex: 1,
    },
    {
      question:
        "¿Qué ventaja tiene reportar avances desde dispositivos móviles en el frente de trabajo?",
      options: [
        "Permite a los supervisores jugar videojuegos en obra.",
        "Elimina el papeleo y captura el avance en el momento exacto, acelerando la toma de decisiones.",
        "Aumenta el consumo de datos de forma innecesaria.",
        "Evita que se realicen las reuniones físicas.",
      ],
      correctIndex: 1,
    },
  ],
  "q3.1": [
    {
      question:
        "¿Qué se debe hacer si se detecta una alerta de discrepancia en los metrados reportados?",
      options: [
        "Ignorar la alerta y proceder a valorizar directamente.",
        "Conciliar el reporte diario confrontándolo con la planilla física y los planos del frente.",
        "Eliminar todo el historial de la base de datos.",
        "Reiniciar el servidor del software.",
      ],
      correctIndex: 1,
    },
    {
      question:
        "¿Cuál es un error común al ingresar información de insumos y equipos diario?",
      options: [
        "Usar el sistema en español.",
        "Duplicar el registro de operarios o meter un código erróneo de maquinaria.",
        "Reportar antes del mediodía.",
        "Escribir notas de felicitación.",
      ],
      correctIndex: 1,
    },
    {
      question: "¿Para qué sirve el panel de alertas de control de calidad?",
      options: [
        "Para enviar correos de marketing.",
        "Para detectar desviaciones críticas de avance y consumo antes de que afecten el presupuesto final.",
        "Para cambiar la contraseña del usuario.",
        "Para ver el pronóstico del clima.",
      ],
      correctIndex: 1,
    },
  ],
  "q4.1": [
    {
      question:
        "¿Cómo ayuda la metodología de reporte dinámico de Tukuy a la oficina técnica?",
      options: [
        "Automatiza la redacción de correos electrónicos de los ingenieros.",
        "Provee una sola fuente de verdad verificable que agiliza la aprobación de valorizaciones mensuales.",
        "Evita que los ingenieros tengan que ir a la obra físicamente.",
        "Reduce el costo de los materiales de acero.",
      ],
      correctIndex: 1,
    },
    {
      question:
        "¿Qué nota mínima se requiere en la evaluación final para simular la obtención del certificado?",
      options: ["11 sobre 20.", "14 sobre 20.", "18 sobre 20.", "20 sobre 20."],
      correctIndex: 1,
    },
    {
      question:
        "¿Cuál es el flujo ideal para una conciliación de fin de mes exitosa?",
      options: [
        "Reporte de campo -> Verificación en oficina técnica -> Generación de reporte consolidado sin discrepancias.",
        "Ignorar datos de campo y usar valores estimados.",
        "Generar valorizaciones al azar.",
        "Esperar que el cliente calcule los montos por su cuenta.",
      ],
      correctIndex: 0,
    },
  ],
};

export function crearContenidoCursoSemilla(
  cursoId: string,
): ContenidoCursoAprendizaje {
  return {
    id: cursoId,
    modulos: structuredClone(MODULOS_APRENDIZAJE_SEMILLA),
    quizzes: structuredClone(QUIZZES_APRENDIZAJE_SEMILLA),
  };
}

export function primerItemId(contenido: ContenidoCursoAprendizaje): string {
  return contenido.modulos[0]?.items[0]?.id ?? "v1.1";
}

export function totalItemsContenido(
  contenido: ContenidoCursoAprendizaje,
): number {
  return contenido.modulos.reduce((sum, m) => sum + m.items.length, 0);
}

export function idsItemsContenido(
  contenido: ContenidoCursoAprendizaje,
): string[] {
  return contenido.modulos.flatMap((m) => m.items.map((i) => i.id));
}
