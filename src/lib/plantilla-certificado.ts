/** Plantillas / diseño de certificado configurables por organización (v1). */

export type AlineacionCampoCertificado = "left" | "center" | "right";

export type CampoPosicionCertificado = {
  xMm: number;
  yMm: number;
  fontSize?: number;
  align?: AlineacionCampoCertificado;
  /** Texto del diseño (fijo se imprime; en campos dinámicos es vista previa). */
  texto?: string;
  /** Ancho del bloque (texto / logo / QR) en mm — redimensionable. */
  widthMm?: number;
  heightMm?: number;
  visible?: boolean;
};

/** Campos cuyo valor final sale de la emisión (alumno, curso, etc.). */
export const CAMPOS_CERTIFICADO_DINAMICOS = new Set([
  "titular",
  "curso",
  "detalle",
  "fecha",
  "codigo",
]);

export const TEXTOS_CAMPO_CERTIFICADO_DEFAULT: Record<
  | "tituloDocumento"
  | "introduccion"
  | "titular"
  | "curso"
  | "detalle"
  | "fecha"
  | "codigo",
  string
> = {
  tituloDocumento: "CERTIFICADO DE RECONOCIMIENTO",
  introduccion: "La institución certifica que",
  titular: "Nombre del alumno",
  curso: "Nombre del curso",
  detalle: "Categoría · horas · nivel · modalidad",
  fecha: "Fecha de emisión",
  codigo: "Código de verificación",
};

/** Datos de ejemplo para miniaturas / vista previa (no se imprimen al emitir). */
export function textosEjemploVistaPreviaCertificado(): Pick<
  typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT,
  "titular" | "curso" | "detalle" | "fecha" | "codigo"
> {
  const hoy = new Date().toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    titular: "María Fernanda XXXXXXX XXXX",
    curso: "Gestión de Obras Civiles (curso simulado)",
    detalle: "Curso · 40 h · Nivel intermedio · Virtual",
    fecha: hoy,
    codigo: "TUK-XXXX-0042",
  };
}

/** Nombres simulados para espacios de firma en vista previa. */
export function nombreSimuladoFirmante(indice: number): {
  nombre: string;
  cargo: string;
} {
  const lista = [
    { nombre: "Carlos Alberto XXXXXXX XXXX", cargo: "Dirección académica" },
    { nombre: "Ana Lucía XXXXXXX XXXX", cargo: "Coordinación" },
    { nombre: "José Luis XXXXXXX XXXX", cargo: "Registro / Secretaría" },
    { nombre: "Patricia XXXXXXX XXXX", cargo: "Visto bueno" },
  ];
  return lista[indice] ?? {
    nombre: `Firmante ${indice + 1} XXXXXXX XXXX`,
    cargo: "Cargo simulado",
  };
}

/** Bloque de firma (línea + nombre + cargo). Hasta 3 por diseño. */
export type FirmantePlantillaCertificado = {
  id: string;
  /** Cargo / rol bajo la firma (ej. Director académico). */
  etiqueta: string;
  /** Nombre fijo en el diseño; si vacío, al emitir se usa el emisor u otro dato. */
  nombreMostrar: string;
  xMm: number;
  yMm: number;
  fontSize?: number;
  align?: AlineacionCampoCertificado;
  visible?: boolean;
  /** Ancho de la línea de firma en mm. */
  anchoLineaMm?: number;
};

export type CantidadFirmantesCertificado = 1 | 2 | 3;

export type CamposLayoutCertificado = {
  tituloDocumento: CampoPosicionCertificado;
  introduccion: CampoPosicionCertificado;
  titular: CampoPosicionCertificado;
  curso: CampoPosicionCertificado;
  detalle: CampoPosicionCertificado;
  fecha: CampoPosicionCertificado;
  codigo: CampoPosicionCertificado;
  logo: CampoPosicionCertificado;
  qr: CampoPosicionCertificado;
};

/** Solo firmas (legado). Preferir `modelosDerivados`. */
export type ModelosFirmantesCertificado = {
  1: FirmantePlantillaCertificado[];
  2: FirmantePlantillaCertificado[];
  3: FirmantePlantillaCertificado[];
};

/**
 * Certificado derivado por cantidad de firmas:
 * guarda campos + firmas (posiciones distintas para 1, 2 o 3).
 */
export type ModeloDerivadoPorFirmas = {
  campos: CamposLayoutCertificado;
  firmantes: FirmantePlantillaCertificado[];
};

export type ModelosDerivadosCertificado = {
  1: ModeloDerivadoPorFirmas;
  2: ModeloDerivadoPorFirmas;
  3: ModeloDerivadoPorFirmas;
};

export type LayoutPlantillaCertificado = {
  orientacion: "landscape";
  formato: "a4";
  /** Ancho/alto A4 landscape en mm (referencia). */
  anchoMm: 297;
  altoMm: 210;
  campos: CamposLayoutCertificado;
  /** Firmas del modelo activo. */
  firmantes: FirmantePlantillaCertificado[];
  /** @deprecated Usar modelosDerivados. Se mantiene por compatibilidad. */
  modelosFirmantes?: ModelosFirmantesCertificado;
  /**
   * Layout completo derivado por cantidad de firmas (1 / 2 / 3).
   * Al cambiar el modelo se cargan campos+firmas de ese derivado.
   */
  modelosDerivados?: ModelosDerivadosCertificado;
  /** Cantidad del modelo activo en el editor. */
  cantidadFirmantesActiva?: CantidadFirmantesCertificado;
};

export type AlcancePlantillaCertificado = "ORGANIZACION" | "DOCENTE";

export type PlantillaCertificado = {
  id: string;
  instalacionId: string;
  nombre: string;
  esDefault: boolean;
  alcance: AlcancePlantillaCertificado;
  /** Identidad del docente autor (solo alcance DOCENTE). */
  autorIdentidadRef?: string | null;
  /** URL pública o data URL del fondo (imagen landscape). */
  fondoUrl: string;
  /** Specs recomendadas mostradas al usuario. */
  fondoEspecificacion: string;
  /** Usa el logo institucional de la entidad si no hay override. */
  usarLogoEntidad: boolean;
  logoOverrideUrl?: string | null;
  layout: LayoutPlantillaCertificado;
  creadoEn: string;
  actualizadoEn: string;
};

export type ConfigCertificadosOrganizacion = {
  instalacionId: string;
  /** Si true, docentes pueden crear/editar plantillas propias. */
  docentesPuedenConfigurar: boolean;
  plantillas: PlantillaCertificado[];
  actualizadoEn: string;
};

/** Fondo reutilizable subido por la entidad. */
export type FondoCertificadoOrganizacion = {
  id: string;
  instalacionId: string;
  nombre: string;
  fondoUrl: string;
  creadoEn: string;
  /** Identidad que subió el fondo (si la BD lo envía). */
  creadoPor?: string | null;
};

/** Logos reutilizables (galería local por instalación), mismo patrón que fondos. */
export type LogoCertificadoOrganizacion = {
  id: string;
  instalacionId: string;
  nombre: string;
  logoUrl: string;
  creadoEn: string;
};

/** Specs de imagen de fondo para A4 horizontal ~300 dpi. */
export const FONDO_CERTIFICADO_ESPECIFICACION =
  "Imagen horizontal PNG/JPG · recomendado 3508×2480 px (A4 300 dpi) · máx. 8 MB";

const Y_FIRMAS_DEFAULT = 172;

/** Distribución horizontal según 1, 2 o 3 firmas (A4 landscape). */
export function posicionesFirmantesAutomaticas(
  cantidad: CantidadFirmantesCertificado,
  yMm = Y_FIRMAS_DEFAULT,
): Array<
  Pick<
    FirmantePlantillaCertificado,
    "xMm" | "yMm" | "align" | "anchoLineaMm" | "fontSize"
  >
> {
  if (cantidad === 1) {
    return [
      {
        xMm: 148.5,
        yMm,
        align: "center",
        anchoLineaMm: 58,
        fontSize: 10,
      },
    ];
  }
  if (cantidad === 2) {
    return [
      {
        xMm: 85,
        yMm,
        align: "center",
        anchoLineaMm: 52,
        fontSize: 10,
      },
      {
        xMm: 212,
        yMm,
        align: "center",
        anchoLineaMm: 52,
        fontSize: 10,
      },
    ];
  }
  return [
    {
      xMm: 55,
      yMm,
      align: "center",
      anchoLineaMm: 42,
      fontSize: 9,
    },
    {
      xMm: 148.5,
      yMm,
      align: "center",
      anchoLineaMm: 42,
      fontSize: 9,
    },
    {
      xMm: 242,
      yMm,
      align: "center",
      anchoLineaMm: 42,
      fontSize: 9,
    },
  ];
}

/** Distribución 1–5 firmas (vista previa / cursos institucionales). */
export function posicionesFirmantesVistaPrevia(
  cantidad: 1 | 2 | 3 | 4 | 5,
  yMm = Y_FIRMAS_DEFAULT,
): Array<
  Pick<
    FirmantePlantillaCertificado,
    "xMm" | "yMm" | "align" | "anchoLineaMm" | "fontSize"
  >
> {
  if (cantidad <= 3) {
    return posicionesFirmantesAutomaticas(
      cantidad as CantidadFirmantesCertificado,
      yMm,
    );
  }
  if (cantidad === 4) {
    return [
      { xMm: 42, yMm, align: "center", anchoLineaMm: 34, fontSize: 8 },
      { xMm: 110, yMm, align: "center", anchoLineaMm: 34, fontSize: 8 },
      { xMm: 187, yMm, align: "center", anchoLineaMm: 34, fontSize: 8 },
      { xMm: 255, yMm, align: "center", anchoLineaMm: 34, fontSize: 8 },
    ];
  }
  return [
    { xMm: 36, yMm, align: "center", anchoLineaMm: 28, fontSize: 8 },
    { xMm: 92, yMm, align: "center", anchoLineaMm: 28, fontSize: 8 },
    { xMm: 148.5, yMm, align: "center", anchoLineaMm: 28, fontSize: 8 },
    { xMm: 205, yMm, align: "center", anchoLineaMm: 28, fontSize: 8 },
    { xMm: 261, yMm, align: "center", anchoLineaMm: 28, fontSize: 8 },
  ];
}

const ETIQUETAS_FIRMA_DEFAULT = [
  "Firma 1",
  "Firma 2",
  "Firma 3",
];

export function crearFirmanteBase(
  indice: number,
  posicion: ReturnType<typeof posicionesFirmantesAutomaticas>[number],
): FirmantePlantillaCertificado {
  return {
    id: crypto.randomUUID(),
    etiqueta: ETIQUETAS_FIRMA_DEFAULT[indice] ?? `Firma ${indice + 1}`,
    nombreMostrar: "",
    xMm: posicion.xMm,
    yMm: posicion.yMm,
    align: posicion.align ?? "center",
    anchoLineaMm: posicion.anchoLineaMm ?? 50,
    fontSize: posicion.fontSize ?? 10,
    visible: true,
  };
}

/** Ajusta a N firmas (1–3). Si `conservarPosiciones`, no pisa x/y ya configurados. */
export function ajustarCantidadFirmantes(
  firmantesActuales: FirmantePlantillaCertificado[],
  cantidad: CantidadFirmantesCertificado,
  opciones?: { conservarPosiciones?: boolean },
): FirmantePlantillaCertificado[] {
  const n = Math.min(3, Math.max(1, cantidad)) as CantidadFirmantesCertificado;
  const posiciones = posicionesFirmantesAutomaticas(n);
  const conservar = opciones?.conservarPosiciones === true;
  const existentes: FirmantePlantillaCertificado[] = firmantesActuales
    .slice(0, n)
    .map((f, i) => ({
      ...f,
      ...(conservar
        ? {}
        : {
            xMm: posiciones[i]!.xMm,
            yMm: posiciones[i]!.yMm,
            align: posiciones[i]!.align,
            anchoLineaMm: posiciones[i]!.anchoLineaMm,
            fontSize: posiciones[i]!.fontSize,
          }),
      visible: f.visible !== false,
    }));
  while (existentes.length < n) {
    const i = existentes.length;
    existentes.push(crearFirmanteBase(i, posiciones[i]!));
  }
  return existentes;
}

function clonarListaFirmantes(
  lista: FirmantePlantillaCertificado[],
): FirmantePlantillaCertificado[] {
  return lista.map((f) => ({ ...f }));
}

function clonarCamposLayout(
  campos: LayoutPlantillaCertificado["campos"],
): LayoutPlantillaCertificado["campos"] {
  return JSON.parse(JSON.stringify(campos)) as LayoutPlantillaCertificado["campos"];
}

function normalizarListaModelo(
  lista: FirmantePlantillaCertificado[] | undefined,
  cantidad: CantidadFirmantesCertificado,
): FirmantePlantillaCertificado[] {
  if (Array.isArray(lista) && lista.length > 0) {
    return ajustarCantidadFirmantes(lista, cantidad, {
      conservarPosiciones: true,
    });
  }
  return ajustarCantidadFirmantes([], cantidad);
}

function cantidadActivaDe(
  layout: Pick<
    LayoutPlantillaCertificado,
    "firmantes" | "cantidadFirmantesActiva"
  >,
): CantidadFirmantesCertificado {
  const cruda = Number(layout.cantidadFirmantesActiva);
  if (cruda === 1 || cruda === 2 || cruda === 3) {
    return cruda;
  }
  const n = Array.isArray(layout.firmantes) ? layout.firmantes.length : 1;
  if (n >= 3) return 3;
  if (n === 2) return 2;
  return 1;
}

/** Lee modelo 1|2|3 aunque JSONB traiga claves string. */
function leerParcialModeloDerivado(
  parcial: Partial<ModelosDerivadosCertificado> | Record<string, unknown> | null | undefined,
  n: CantidadFirmantesCertificado,
): ModeloDerivadoPorFirmas | undefined {
  if (!parcial || typeof parcial !== "object") return undefined;
  const raw =
    (parcial as Record<string | number, unknown>)[n] ??
    (parcial as Record<string, unknown>)[String(n)];
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { campos?: unknown; firmantes?: unknown };
  if (!obj.campos || typeof obj.campos !== "object") return undefined;
  if (!Array.isArray(obj.firmantes)) return undefined;
  return raw as ModeloDerivadoPorFirmas;
}

function leerParcialModeloFirmantes(
  parcial: Partial<ModelosFirmantesCertificado> | Record<string, unknown> | null | undefined,
  n: CantidadFirmantesCertificado,
): FirmantePlantillaCertificado[] | undefined {
  if (!parcial || typeof parcial !== "object") return undefined;
  const raw =
    (parcial as Record<string | number, unknown>)[n] ??
    (parcial as Record<string, unknown>)[String(n)];
  return Array.isArray(raw) ? (raw as FirmantePlantillaCertificado[]) : undefined;
}

/** Garantiza modelos 1/2/3 solo-firmas (legado). */
export function asegurarModelosFirmantes(
  layout: Pick<
    LayoutPlantillaCertificado,
    "firmantes" | "modelosFirmantes" | "cantidadFirmantesActiva" | "modelosDerivados"
  >,
): ModelosFirmantesCertificado {
  const derivados = layout.modelosDerivados;
  const d1 = leerParcialModeloDerivado(derivados, 1);
  const d2 = leerParcialModeloDerivado(derivados, 2);
  const d3 = leerParcialModeloDerivado(derivados, 3);
  if (d1 && d2 && d3) {
    return {
      1: normalizarListaModelo(d1.firmantes, 1),
      2: normalizarListaModelo(d2.firmantes, 2),
      3: normalizarListaModelo(d3.firmantes, 3),
    };
  }
  const parcial =
    layout.modelosFirmantes ?? ({} as Partial<ModelosFirmantesCertificado>);
  const activos = Array.isArray(layout.firmantes) ? layout.firmantes : [];
  const nActiva = cantidadActivaDe(layout);

  const modelos: ModelosFirmantesCertificado = {
    1: normalizarListaModelo(leerParcialModeloFirmantes(parcial, 1), 1),
    2: normalizarListaModelo(leerParcialModeloFirmantes(parcial, 2), 2),
    3: normalizarListaModelo(leerParcialModeloFirmantes(parcial, 3), 3),
  };

  if (activos.length > 0) {
    modelos[nActiva] = ajustarCantidadFirmantes(activos, nActiva, {
      conservarPosiciones: true,
    });
  }
  return modelos;
}

/** Garantiza certificados derivados completos (campos + firmas) por 1/2/3. */
export function asegurarModelosDerivados(
  layout: LayoutPlantillaCertificado,
): ModelosDerivadosCertificado {
  const camposBase = clonarCamposLayout(layout.campos);
  const firmasLegado = asegurarModelosFirmantes(layout);
  const parcial = (layout.modelosDerivados ??
    {}) as Partial<ModelosDerivadosCertificado>;
  const nActiva = cantidadActivaDe(layout);

  const build = (
    n: CantidadFirmantesCertificado,
  ): ModeloDerivadoPorFirmas => {
    const prev = leerParcialModeloDerivado(parcial, n);
    if (prev?.campos && Array.isArray(prev.firmantes) && prev.firmantes.length > 0) {
      return {
        campos: clonarCamposLayout(prev.campos as LayoutPlantillaCertificado["campos"]),
        firmantes: normalizarListaModelo(prev.firmantes, n),
      };
    }
    return {
      campos: clonarCamposLayout(camposBase),
      firmantes: normalizarListaModelo(firmasLegado[n], n),
    };
  };

  const modelos: ModelosDerivadosCertificado = {
    1: build(1),
    2: build(2),
    3: build(3),
  };

  // El activo refleja lo que hay en el editor ahora (siempre con N firmas exactas).
  modelos[nActiva] = {
    campos: clonarCamposLayout(layout.campos),
    firmantes: ajustarCantidadFirmantes(layout.firmantes, nActiva, {
      conservarPosiciones: true,
    }),
  };

  return modelos;
}

/** Guarda el derivado actual y activa otro (1/2/3) con su layout completo. */
export function aplicarModeloFirmantes(
  layout: LayoutPlantillaCertificado,
  cantidad: CantidadFirmantesCertificado,
): LayoutPlantillaCertificado {
  const n = (
    cantidad === 1 || cantidad === 2 || cantidad === 3 ? cantidad : 1
  ) as CantidadFirmantesCertificado;
  const nActual = cantidadActivaDe(layout);
  const modelos = asegurarModelosDerivados(layout);

  // Conservar lo editado del modelo que se abandona.
  modelos[nActual] = {
    campos: clonarCamposLayout(layout.campos),
    firmantes: ajustarCantidadFirmantes(layout.firmantes, nActual, {
      conservarPosiciones: true,
    }),
  };

  const destino = modelos[n];
  // Forzar exactamente N firmas (evita quedarse en el layout de 3).
  const firmantes = ajustarCantidadFirmantes(destino.firmantes, n, {
    conservarPosiciones: true,
  }).map((f) => ({
    ...f,
    visible: true,
  }));
  const modelosFirmantes: ModelosFirmantesCertificado = {
    1: clonarListaFirmantes(modelos[1].firmantes),
    2: clonarListaFirmantes(modelos[2].firmantes),
    3: clonarListaFirmantes(modelos[3].firmantes),
  };
  // Mantener destino sincronizado tras el ajuste.
  modelos[n] = {
    campos: clonarCamposLayout(destino.campos),
    firmantes: clonarListaFirmantes(firmantes),
  };

  return {
    ...layout,
    campos: clonarCamposLayout(destino.campos),
    firmantes,
    modelosDerivados: modelos,
    modelosFirmantes,
    cantidadFirmantesActiva: n,
  };
}

/** Persiste campos+firmas del modelo activo tras arrastrar. */
export function sincronizarModeloFirmantesActivo(
  layout: LayoutPlantillaCertificado,
): LayoutPlantillaCertificado {
  const n = cantidadActivaDe(layout);
  const modelos = asegurarModelosDerivados(layout);
  modelos[n] = {
    campos: clonarCamposLayout(layout.campos),
    firmantes: ajustarCantidadFirmantes(layout.firmantes, n, {
      conservarPosiciones: true,
    }),
  };
  return {
    ...layout,
    cantidadFirmantesActiva: n,
    modelosDerivados: modelos,
    modelosFirmantes: {
      1: clonarListaFirmantes(modelos[1].firmantes),
      2: clonarListaFirmantes(modelos[2].firmantes),
      3: clonarListaFirmantes(modelos[3].firmantes),
    },
    campos: clonarCamposLayout(modelos[n].campos),
    firmantes: clonarListaFirmantes(modelos[n].firmantes),
  };
}

/** Firmas de un modelo guardado (vista previa / PDF). */
export function firmantesDeModelo(
  layout: LayoutPlantillaCertificado,
  cantidad: CantidadFirmantesCertificado,
): FirmantePlantillaCertificado[] {
  const modelos = asegurarModelosDerivados(layout);
  return clonarListaFirmantes(modelos[cantidad].firmantes).map((f) => ({
    ...f,
    visible: true,
  }));
}

/** Layout completo de un certificado derivado (campos + firmas). */
export function layoutDeModelo(
  layout: LayoutPlantillaCertificado,
  cantidad: CantidadFirmantesCertificado,
): Pick<LayoutPlantillaCertificado, "campos" | "firmantes"> {
  const modelos = asegurarModelosDerivados(layout);
  return {
    campos: clonarCamposLayout(modelos[cantidad].campos),
    firmantes: clonarListaFirmantes(modelos[cantidad].firmantes).map((f) => ({
      ...f,
      visible: true,
    })),
  };
}

export const LAYOUT_CERTIFICADO_DEFAULT: LayoutPlantillaCertificado = {
  orientacion: "landscape",
  formato: "a4",
  anchoMm: 297,
  altoMm: 210,
  campos: {
    tituloDocumento: {
      xMm: 148.5,
      yMm: 42,
      fontSize: 12,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.tituloDocumento,
      widthMm: 220,
    },
    introduccion: {
      xMm: 148.5,
      yMm: 58,
      fontSize: 10,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.introduccion,
      widthMm: 200,
    },
    titular: {
      xMm: 148.5,
      yMm: 78,
      fontSize: 24,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.titular,
      widthMm: 240,
    },
    curso: {
      xMm: 148.5,
      yMm: 106,
      fontSize: 15,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.curso,
      widthMm: 230,
    },
    detalle: {
      xMm: 148.5,
      yMm: 122,
      fontSize: 10,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.detalle,
      widthMm: 240,
    },
    fecha: {
      xMm: 70,
      yMm: 155,
      fontSize: 10,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.fecha,
      widthMm: 70,
    },
    codigo: {
      xMm: 148.5,
      yMm: 155,
      fontSize: 9,
      align: "center",
      visible: true,
      texto: TEXTOS_CAMPO_CERTIFICADO_DEFAULT.codigo,
      widthMm: 75,
    },
    logo: {
      xMm: 28,
      yMm: 18,
      widthMm: 28,
      heightMm: 18,
      visible: true,
    },
    qr: {
      xMm: 250,
      yMm: 16,
      widthMm: 28,
      heightMm: 28,
      visible: true,
    },
  },
  firmantes: ajustarCantidadFirmantes([], 1),
  modelosFirmantes: {
    1: ajustarCantidadFirmantes([], 1),
    2: ajustarCantidadFirmantes([], 2),
    3: ajustarCantidadFirmantes([], 3),
  },
  modelosDerivados: undefined,
  cantidadFirmantesActiva: 1,
};

export function clonarLayoutDefault(): LayoutPlantillaCertificado {
  // JSON clone: structuredClone falla con Proxies reactivos de Vue.
  return JSON.parse(
    JSON.stringify(LAYOUT_CERTIFICADO_DEFAULT),
  ) as LayoutPlantillaCertificado;
}

/** Completa layout incompleto desde BD / cache (incluye legado `campos.firmante`). */
export function normalizarLayoutPlantilla(
  layout: Partial<LayoutPlantillaCertificado> & {
    campos?: Partial<LayoutPlantillaCertificado["campos"]> & {
      firmante?: CampoPosicionCertificado;
    };
  } | null | undefined,
): LayoutPlantillaCertificado {
  const base = clonarLayoutDefault();
  if (!layout || typeof layout !== "object") return base;

  const camposEntrada =
    layout.campos && typeof layout.campos === "object" ? layout.campos : {};
  const campos = { ...base.campos };
  for (const clave of Object.keys(base.campos) as Array<
    keyof LayoutPlantillaCertificado["campos"]
  >) {
    const parcial = (
      camposEntrada as Record<string, CampoPosicionCertificado | undefined>
    )[clave];
    if (parcial && typeof parcial === "object") {
      const baseCampo = base.campos[clave];
      campos[clave] = {
        ...baseCampo,
        ...parcial,
        texto:
          parcial.texto ??
          baseCampo.texto ??
          TEXTOS_CAMPO_CERTIFICADO_DEFAULT[
            clave as keyof typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT
          ],
      };
    }
  }

  let firmantes: FirmantePlantillaCertificado[] = [];
  if (Array.isArray(layout.firmantes) && layout.firmantes.length > 0) {
    firmantes = layout.firmantes
      .slice(0, 3)
      .map((f, i) => ({
        id: String(f.id || crypto.randomUUID()),
        etiqueta: String(f.etiqueta || ETIQUETAS_FIRMA_DEFAULT[i] || `Firma ${i + 1}`),
        nombreMostrar: String(f.nombreMostrar ?? ""),
        xMm: Number(f.xMm ?? 148.5),
        yMm: Number(f.yMm ?? Y_FIRMAS_DEFAULT),
        fontSize: f.fontSize ?? 10,
        align: f.align ?? "center",
        visible: f.visible !== false,
        anchoLineaMm: f.anchoLineaMm ?? 50,
      }));
  } else {
    const legadoRaw = (camposEntrada as Record<string, unknown>).firmante;
    if (legadoRaw && typeof legadoRaw === "object") {
      // Migración desde un solo `firmante`.
      const legado = legadoRaw as Partial<CampoPosicionCertificado>;
      firmantes = [
        {
          id: crypto.randomUUID(),
          etiqueta: "Emisor / Dirección",
          nombreMostrar: "",
          xMm: legado.xMm ?? 220,
          yMm: legado.yMm ?? Y_FIRMAS_DEFAULT,
          fontSize: legado.fontSize ?? 10,
          align: legado.align ?? "center",
          visible: legado.visible !== false,
          anchoLineaMm: 55,
        },
      ];
    }
  }

  if (!firmantes.length) {
    firmantes = ajustarCantidadFirmantes([], 1);
  } else if (firmantes.length > 3) {
    firmantes = firmantes.slice(0, 3);
  }

  const cantidadFirmantesActiva = (() => {
    const cruda = Number(layout.cantidadFirmantesActiva);
    if (cruda === 1 || cruda === 2 || cruda === 3) return cruda;
    if (firmantes.length >= 3) return 3;
    if (firmantes.length === 2) return 2;
    return 1;
  })() as CantidadFirmantesCertificado;

  const parcial: LayoutPlantillaCertificado = {
    orientacion: "landscape",
    formato: "a4",
    anchoMm: 297,
    altoMm: 210,
    campos,
    firmantes,
    modelosFirmantes: layout.modelosFirmantes,
    modelosDerivados: layout.modelosDerivados,
    cantidadFirmantesActiva,
  };
  const modelosDerivados = asegurarModelosDerivados(parcial);
  const activo = modelosDerivados[cantidadFirmantesActiva];
  const modelosFirmantes: ModelosFirmantesCertificado = {
    1: clonarListaFirmantes(modelosDerivados[1].firmantes),
    2: clonarListaFirmantes(modelosDerivados[2].firmantes),
    3: clonarListaFirmantes(modelosDerivados[3].firmantes),
  };

  return {
    orientacion: "landscape",
    formato: "a4",
    anchoMm: 297,
    altoMm: 210,
    campos: clonarCamposLayout(activo.campos),
    firmantes: clonarListaFirmantes(activo.firmantes),
    modelosFirmantes,
    modelosDerivados,
    cantidadFirmantesActiva,
  };
}

export function crearPlantillaCertificadoBase(entrada: {
  instalacionId: string;
  nombre: string;
  alcance: AlcancePlantillaCertificado;
  autorIdentidadRef?: string | null;
  esDefault?: boolean;
}): PlantillaCertificado {
  const ahora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    instalacionId: entrada.instalacionId,
    nombre: entrada.nombre.trim() || "Diseño de certificado",
    esDefault: entrada.esDefault === true,
    alcance: entrada.alcance,
    autorIdentidadRef: entrada.autorIdentidadRef ?? null,
    fondoUrl: "",
    fondoEspecificacion: FONDO_CERTIFICADO_ESPECIFICACION,
    usarLogoEntidad: true,
    logoOverrideUrl: null,
    layout: clonarLayoutDefault(),
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}
