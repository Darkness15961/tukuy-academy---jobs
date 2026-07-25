import type {
  CategoriaCursoEntidad,
  CursoPerfilEntidad,
  EntidadPublicaComunidad,
  PublicacionEntidadResumen,
} from "../types/entidad-publica.types";

export const categoriasCursosEntidadesMock: CategoriaCursoEntidad[] = [
  { id: "cat-gestion-obra", organizacionId: "org-empresa-abc", nombre: "Gestión de obra", descripcion: "Planificación, valorizaciones y control de proyectos.", color: "#0B3A78", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 1, estado: "ACTIVA" },
  { id: "cat-construccion", organizacionId: "org-empresa-abc", nombre: "Construcción civil", descripcion: "Competencias técnicas para ejecución y supervisión.", color: "#B87A00", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 2, estado: "ACTIVA" },
  { id: "cat-calidad", organizacionId: "org-empresa-abc", nombre: "Calidad", descripcion: "Control, evidencias y mejora de procesos constructivos.", color: "#0E7490", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 3, estado: "ACTIVA" },
  { id: "cat-tecnologia", organizacionId: "org-empresa-abc", nombre: "Tecnología", descripcion: "Herramientas digitales aplicadas a la ingeniería.", color: "#6D28D9", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 4, estado: "ACTIVA" },
  { id: "cat-operaciones", organizacionId: "org-empresa-abc", nombre: "Operaciones internas", descripcion: "Formación exclusiva para equipos y capítulos internos.", color: "#166534", visibleEnCatalogo: true, seleccionableComoInteres: false, orden: 5, estado: "ACTIVA" },
  { id: "cat-seguridad-andina", organizacionId: "org-andina-constructora", nombre: "Seguridad en obra", descripcion: "Prevención y trabajo seguro en campo.", color: "#B91C1C", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 1, estado: "ACTIVA" },
  { id: "cat-abierta-tukuy", organizacionId: "org-academia-tukuy", nombre: "Formación abierta", descripcion: "Cursos introductorios disponibles para toda persona.", color: "#0B3A78", visibleEnCatalogo: true, seleccionableComoInteres: true, orden: 1, estado: "ACTIVA" },
];

export const cursosPerfilesEntidadesMock: CursoPerfilEntidad[] = [
  { id: "doc-1", organizacionId: "org-empresa-abc", titulo: "Gestión digital de obras con Tukuy", resumen: "Registra avances, evidencias y reportes para controlar una obra de principio a fin.", imagen: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80", docente: "Ing. Diana Chávez", duracion: "10 h", categoriaIds: ["cat-gestion-obra", "cat-tecnologia"], alcance: "PUBLICO", nodoIdsPermitidos: [], incluirDescendientes: false, modalidadAcceso: "LIBRE", gratuito: true, precio: 0, moneda: "PEN", estado: "PUBLICADO" },
  { id: "doc-7", organizacionId: "org-empresa-abc", titulo: "Lectura de planos para personal de campo", resumen: "Interpreta planos de especialidades y coordina su ejecución en campo.", imagen: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80", docente: "Arq. Luis Quispe", duracion: "5 h 20 min", categoriaIds: ["cat-construccion"], alcance: "PUBLICO", nodoIdsPermitidos: [], incluirDescendientes: false, modalidadAcceso: "LIBRE", gratuito: false, precio: 89, moneda: "PEN", estado: "PUBLICADO" },
  { id: "doc-11", organizacionId: "org-empresa-abc", titulo: "Control de calidad en obras civiles", resumen: "Aplica controles y evidencias de calidad durante la ejecución de obra.", imagen: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80", docente: "Ing. Patricia Soto", duracion: "9 h", categoriaIds: ["cat-calidad", "cat-construccion"], alcance: "PUBLICO", nodoIdsPermitidos: [], incluirDescendientes: false, modalidadAcceso: "LIBRE", gratuito: false, precio: 129, moneda: "PEN", estado: "PUBLICADO" },
  { id: "doc-5", organizacionId: "org-empresa-abc", titulo: "Supervisión de equipos de obra", resumen: "Curso interno para responsables y equipos vinculados al capítulo civil.", imagen: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80", docente: "Ing. Jorge Vargas", duracion: "5 h", categoriaIds: ["cat-operaciones", "cat-construccion"], alcance: "INTERNO", nodoIdsPermitidos: ["unidad-capitulo-civil"], incluirDescendientes: true, modalidadAcceso: "LIBRE", gratuito: true, precio: 0, moneda: "PEN", estado: "PUBLICADO" },
  { id: "doc-13", organizacionId: "org-empresa-abc", titulo: "Programación de obra con MS Project", resumen: "Planificación institucional reservada para Administración.", imagen: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80", docente: "Ing. Renato Salazar", duracion: "7 h", categoriaIds: ["cat-gestion-obra", "cat-operaciones"], alcance: "INTERNO", nodoIdsPermitidos: ["unidad-administracion"], incluirDescendientes: false, modalidadAcceso: "CON_APROBACION", gratuito: true, precio: 0, moneda: "PEN", estado: "PUBLICADO" },
  { id: "and-curso-sst", organizacionId: "org-andina-constructora", titulo: "Inducción de seguridad antes de ingresar a obra", resumen: "Principios esenciales para reconocer peligros y prevenir incidentes.", imagen: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80", docente: "Equipo SST Andina", duracion: "3 h", categoriaIds: ["cat-seguridad-andina"], alcance: "PUBLICO", nodoIdsPermitidos: [], incluirDescendientes: false, modalidadAcceso: "LIBRE", gratuito: true, precio: 0, moneda: "PEN", estado: "PUBLICADO" },
  { id: "tuk-curso-intro", organizacionId: "org-academia-tukuy", titulo: "Introducción a Tukuy Obra", resumen: "Conoce el flujo digital de gestión y control de proyectos.", imagen: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80", docente: "Tukuy Academy", duracion: "2 h", categoriaIds: ["cat-abierta-tukuy"], alcance: "PUBLICO", nodoIdsPermitidos: [], incluirDescendientes: false, modalidadAcceso: "LIBRE", gratuito: true, precio: 0, moneda: "PEN", estado: "PUBLICADO" },
];

export const entidadesPublicasMock: EntidadPublicaComunidad[] = [
  {
    id: "org-empresa-abc",
    nombre: "COLEGIO DE INGENIEROS CUSCO",
    slug: "cip-cusco",
    tipo: "COLEGIO",
    sector: "Ingeniería y colegiatura",
    ciudad: "Cusco",
    region: "Cusco",
    descripcionCorta:
      "Entidad colegiada que forma, certifica y conecta a profesionales de la ingeniería en el sur del Perú.",
    descripcion:
      "El Colegio de Ingenieros del Perú – Consejo Departamental Cusco impulsa la formación continua, la certificación profesional y la vinculación de sus colegiados con oportunidades laborales y académicas. En Tukuy publica convocatorias, cursos y espacios de comunidad para sus capítulos.",
    logo: "/img/LogoColegioING.png",
    portada:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
    verificada: true,
    miembros: 1840,
    publicaciones: 126,
    cursosActivos: 38,
    vacantesAbiertas: 7,
    sitioWeb: "https://cipcusco.org.pe",
    correoContacto: "comunidad@cipcusco.org.pe",
    etiquetas: ["Colegiatura", "Capítulos", "Certificación", "Cusco"],
    requiereDniEnrolamiento: true,
  },
  {
    id: "org-andina-constructora",
    nombre: "Andina Constructora",
    slug: "andina-constructora",
    tipo: "EMPRESA",
    sector: "Construcción e infraestructura",
    ciudad: "Lima",
    region: "Lima",
    descripcionCorta:
      "Empresa constructora que capacita a sus equipos y publica oportunidades de obra y control de proyectos.",
    descripcion:
      "Andina Constructora opera proyectos de infraestructura y edificación. Usa Tukuy para formar a su personal de campo y oficina, publicar vacantes técnicas y compartir buenas prácticas de seguridad y control de obra.",
    logo: "/img/logo-andina-constructora.png",
    portada:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80",
    verificada: true,
    miembros: 420,
    publicaciones: 54,
    cursosActivos: 12,
    vacantesAbiertas: 4,
    sitioWeb: "https://andinaconstructora.pe",
    correoContacto: "talento@andinaconstructora.pe",
    etiquetas: ["Obra", "Seguridad", "Talento", "Lima"],
    requiereDniEnrolamiento: false,
  },
  {
    id: "org-academia-tukuy",
    nombre: "Tukuy Academy",
    slug: "tukuy-academy",
    tipo: "ACADEMIA",
    sector: "Educación técnica",
    ciudad: "Lima",
    region: "Lima",
    descripcionCorta:
      "Academia del ecosistema Tukuy con cursos abiertos, rutas especializadas y comunidad de aprendizaje.",
    descripcion:
      "Tukuy Academy concentra la oferta formativa abierta del ecosistema: cursos técnicos, rutas por especialidad y espacios de práctica. Las entidades aliadas pueden complementar su capacitación interna con esta oferta.",
    logo: "/img/tukuyAcademia.png",
    portada:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    verificada: true,
    miembros: 9200,
    publicaciones: 310,
    cursosActivos: 86,
    vacantesAbiertas: 0,
    sitioWeb: "https://tukuy.academy",
    correoContacto: "hola@tukuy.academy",
    etiquetas: ["Cursos", "Rutas", "Comunidad", "Abierta"],
    requiereDniEnrolamiento: false,
  },
  {
    id: "org-camara-construccion",
    nombre: "Cámara Peruana de la Construcción",
    slug: "capeco-demo",
    tipo: "INSTITUCION",
    sector: "Gremio empresarial",
    ciudad: "Lima",
    region: "Lima",
    descripcionCorta:
      "Espacio gremial para difusión de estándares, eventos y oportunidades del sector construcción.",
    descripcion:
      "Publica eventos técnicos, lineamientos del sector y oportunidades de vinculación entre empresas, profesionales y centros de formación. Ideal para quienes buscan estar al día con la industria.",
    logo: "/img/portal-organizacion.png",
    portada:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
    verificada: true,
    miembros: 2600,
    publicaciones: 88,
    cursosActivos: 9,
    vacantesAbiertas: 11,
    correoContacto: "vinculacion@capeco.demo",
    etiquetas: ["Gremio", "Eventos", "Normativa"],
    requiereDniEnrolamiento: true,
  },
  {
    id: "org-ong-vivienda",
    nombre: "Fundación Hábitat Sur",
    slug: "habitat-sur",
    tipo: "ONG",
    sector: "Desarrollo social y vivienda",
    ciudad: "Arequipa",
    region: "Arequipa",
    descripcionCorta:
      "Organización que forma brigadas técnicas y publica convocatorias de voluntariado especializado.",
    descripcion:
      "Hábitat Sur articula voluntariado técnico, formación en vivienda segura y proyectos comunitarios. En Tukuy publica convocatorias, talleres y espacios de colaboración con profesionales del sur.",
    logo: "/img/portal-estudiante.png",
    portada:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80",
    verificada: false,
    miembros: 310,
    publicaciones: 41,
    cursosActivos: 5,
    vacantesAbiertas: 2,
    correoContacto: "hola@habitatsur.demo",
    etiquetas: ["Voluntariado", "Vivienda", "Arequipa"],
    requiereDniEnrolamiento: false,
  },
];

export const publicacionesPorEntidadMock: Record<
  string,
  PublicacionEntidadResumen[]
> = {
  "org-empresa-abc": [
    {
      id: "ent-pub-cip-1",
      titulo: "Convocatoria: Comisión de Certificación 2026",
      extracto:
        "Abrimos inscripción para colegiados interesados en apoyar procesos de certificación profesional.",
      fecha: "Hace 2 días",
      tipo: "Oportunidad",
    },
    {
      id: "ent-pub-cip-2",
      titulo: "Nuevos cursos del Capítulo de Ingeniería Civil",
      extracto:
        "Rutas de seguridad en obra, lectura de planos y control de proyectos ya disponibles para miembros.",
      fecha: "Hace 5 días",
      tipo: "Recurso",
    },
    {
      id: "ent-pub-cip-3",
      titulo: "Encuentro de capítulos en Cusco",
      extracto:
        "Agenda del encuentro presencial con paneles de especialidad y networking profesional.",
      fecha: "Hace 1 semana",
      tipo: "Evento",
    },
  ],
  "org-andina-constructora": [
    {
      id: "ent-pub-and-1",
      titulo: "Buscamos asistentes de control de obra en Lima",
      extracto:
        "Valoramos certificados verificables y experiencia registrando avances y evidencias en campo.",
      fecha: "Ayer",
      tipo: "Oportunidad",
    },
    {
      id: "ent-pub-and-2",
      titulo: "Charla interna: matriz de riesgos antes del turno",
      extracto:
        "Compartimos la práctica que usamos para convertir observaciones de campo en acciones preventivas.",
      fecha: "Hace 4 días",
      tipo: "Experiencia",
    },
  ],
  "org-academia-tukuy": [
    {
      id: "ent-pub-tuk-1",
      titulo: "Ruta abierta: Introducción a Tukuy Obra",
      extracto:
        "Curso gratuito para familiarizarte con gestión y control de proyectos en la plataforma.",
      fecha: "Hace 3 días",
      tipo: "Recurso",
    },
  ],
  "org-camara-construccion": [
    {
      id: "ent-pub-cap-1",
      titulo: "Foro técnico de normativa y productividad",
      extracto:
        "Cupos abiertos para profesionales y empresas afiliadas. Modalidad híbrida.",
      fecha: "Hace 6 días",
      tipo: "Evento",
    },
  ],
  "org-ong-vivienda": [
    {
      id: "ent-pub-hab-1",
      titulo: "Brigada técnica voluntaria — Arequipa",
      extracto:
        "Buscamos ingenieros y técnicos para diagnóstico de vivienda segura este trimestre.",
      fecha: "Hace 1 día",
      tipo: "Oportunidad",
    },
  ],
};
