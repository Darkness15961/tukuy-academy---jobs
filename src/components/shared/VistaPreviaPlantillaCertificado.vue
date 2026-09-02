<script setup lang="ts">
import { Award, Eye, Loader2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import {
  CAMPOS_CERTIFICADO_DINAMICOS,
  TEXTOS_CAMPO_CERTIFICADO_DEFAULT,
  layoutDeModelo,
  nombreSimuladoFirmante,
  normalizarLayoutPlantilla,
  posicionesFirmantesVistaPrevia,
  textosEjemploVistaPreviaCertificado,
  type CampoPosicionCertificado,
  type CantidadFirmantesCertificado,
  type FirmantePlantillaCertificado,
  type PlantillaCertificado,
} from "@/lib/plantilla-certificado";
import { CANTIDAD_FIRMAS_CERTIFICADO_MAX } from "@/lib/certificado-curso";
import {
  peekUrlMediaCacheada,
  urlVisualizableMedia,
} from "@/lib/storage-academia";

type ClaveCampo = keyof PlantillaCertificado["layout"]["campos"];

type MetaCampo = {
  clave: ClaveCampo;
  etiqueta: string;
  tipo: "texto" | "logo" | "qr";
  negrita?: boolean;
  color?: string;
};

export type FirmaVistaPrevia = {
  nombre: string;
  cargo?: string;
  imagen?: string;
};

const props = withDefaults(
  defineProps<{
    plantilla: PlantillaCertificado | null;
    /** Título real del curso / motivo para el campo dinámico. */
    tituloCurso?: string;
    /** Nombre real del titular (emisión / preview). */
    nombreTitular?: string;
    /** Detalle / horas (emisión manual). */
    detalleTexto?: string;
    /** Fecha visible (si falta, usa ejemplo de plantilla). */
    fechaTexto?: string;
    /** Código de verificación (si falta, ejemplo). */
    codigoTexto?: string;
    /** Firmas del curso (si hay, se usan en los slots). */
    firmas?: FirmaVistaPrevia[];
    logoUrl?: string | null;
    cargando?: boolean;
    compacto?: boolean;
    /**
     * Cantidad de firmas del curso (1–5). Viene del backend.
     */
    cantidadFirmas?: number | null;
    /** Muestra el selector 1/2/3 (legado; preferir cantidadFirmas del curso). */
    mostrarSelectorFirmas?: boolean;
    /**
     * Permite arrastrar campos y firmas sobre la vista previa.
     * Emite `mover-campo` / `mover-firma` con coordenadas en mm.
     */
    editable?: boolean;
  }>(),
  {
    tituloCurso: "",
    nombreTitular: "",
    detalleTexto: "",
    fechaTexto: "",
    codigoTexto: "",
    firmas: () => [],
    logoUrl: null,
    cargando: false,
    compacto: false,
    cantidadFirmas: null,
    mostrarSelectorFirmas: false,
    editable: false,
  },
);

const emit = defineEmits<{
  "mover-campo": [payload: { clave: ClaveCampo; xMm: number; yMm: number }];
  "mover-firma": [payload: { id: string; xMm: number; yMm: number }];
  "redimensionar-campo": [
    payload: { clave: ClaveCampo; widthMm: number; heightMm: number },
  ];
  "redimensionar-firma": [
    payload: { id: string; anchoLineaMm: number; fontSize: number },
  ];
}>();

type EsquinaResize = "nw" | "ne" | "sw" | "se";
const ESQUINAS_RESIZE: EsquinaResize[] = ["nw", "ne", "sw", "se"];

const PT_A_MM = 0.352778;
const ANCHO_MM = 297;
const ALTO_MM = 210;

const CAMPOS: MetaCampo[] = [
  {
    clave: "tituloDocumento",
    etiqueta: "Título",
    tipo: "texto",
    negrita: true,
    color: "#07152b",
  },
  {
    clave: "introduccion",
    etiqueta: "Introducción",
    tipo: "texto",
    color: "#475569",
  },
  {
    clave: "titular",
    etiqueta: "Nombre del alumno",
    tipo: "texto",
    negrita: true,
    color: "#07152b",
  },
  {
    clave: "curso",
    etiqueta: "Curso",
    tipo: "texto",
    negrita: true,
    color: "#07152b",
  },
  {
    clave: "detalle",
    etiqueta: "Detalle",
    tipo: "texto",
    color: "#475569",
  },
  {
    clave: "fecha",
    etiqueta: "Fecha",
    tipo: "texto",
    color: "#475569",
  },
  {
    clave: "codigo",
    etiqueta: "Código",
    tipo: "texto",
    color: "#475569",
  },
  { clave: "logo", etiqueta: "Logo", tipo: "logo" },
  { clave: "qr", etiqueta: "QR", tipo: "qr" },
];

const firmasCount = ref(1);
const urlFondo = ref("");
const resolviendoFondo = ref(false);
const lienzoRef = ref<HTMLElement | null>(null);
const arrastrando = ref(false);
const redimensionando = ref(false);
/** Guía temporal al imantar (centro / otro elemento). */
const guiaAlineacion = ref<{ xMm?: number; yMm?: number } | null>(null);
/** Relación alto/ancho de imágenes (logo / firmas) para escalado proporcional. */
const ratioLogo = ref(18 / 28);
const ratiosFirma = ref<Record<string, number>>({});

watch(
  () => props.logoUrl,
  (url) => {
    const valor = String(url ?? "").trim();
    if (!valor) {
      ratioLogo.value = 18 / 28;
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        ratioLogo.value = img.naturalHeight / img.naturalWidth;
      }
    };
    img.src = valor;
  },
  { immediate: true },
);

watch(
  () => props.firmas.map((f) => f.imagen ?? "").join("|"),
  () => {
    props.firmas.forEach((firma, indice) => {
      const url = String(firma.imagen ?? "").trim();
      if (!url) return;
      const clave = `idx-${indice}`;
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          ratiosFirma.value = {
            ...ratiosFirma.value,
            [clave]: img.naturalHeight / img.naturalWidth,
          };
        }
      };
      img.src = url;
    });
  },
  { immediate: true },
);

const MARGEN_ENCUADRE_MM = 12;
const SNAP_UMBRAL_MM = 2.8;
const CENTRO_X_MM = ANCHO_MM / 2;
const CENTRO_Y_MM = ALTO_MM / 2;

const lineasEncuadreVerticales = [
  MARGEN_ENCUADRE_MM,
  ANCHO_MM / 3,
  CENTRO_X_MM,
  (ANCHO_MM * 2) / 3,
  ANCHO_MM - MARGEN_ENCUADRE_MM,
];
const lineasEncuadreHorizontales = [
  MARGEN_ENCUADRE_MM,
  ALTO_MM / 3,
  CENTRO_Y_MM,
  (ALTO_MM * 2) / 3,
  ALTO_MM - MARGEN_ENCUADRE_MM,
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function redondearMm(n: number) {
  return Math.round(n * 10) / 10;
}

function snapAReferencias(
  valor: number,
  referencias: number[],
  umbral = SNAP_UMBRAL_MM,
): number | null {
  let mejor: number | null = null;
  let mejorDist = umbral;
  for (const ref of referencias) {
    const d = Math.abs(valor - ref);
    if (d <= mejorDist) {
      mejorDist = d;
      mejor = ref;
    }
  }
  return mejor;
}

function referenciasSnapCampos(excluir?: ClaveCampo): number[] {
  const layout = layoutActivo.value;
  if (!layout) return [...lineasEncuadreHorizontales];
  const ys = [...lineasEncuadreHorizontales];
  for (const meta of CAMPOS) {
    if (meta.clave === excluir) continue;
    const c = layout.campos[meta.clave];
    if (c?.visible === false) continue;
    ys.push(c.yMm);
  }
  for (const f of layout.firmantes ?? []) {
    if (f.visible === false) continue;
    ys.push(f.yMm);
  }
  return ys;
}

function referenciasSnapX(excluirClave?: ClaveCampo, excluirFirmaId?: string) {
  const layout = layoutActivo.value;
  const xs = [...lineasEncuadreVerticales];
  if (!layout) return xs;
  for (const meta of CAMPOS) {
    if (meta.clave === excluirClave) continue;
    const c = layout.campos[meta.clave];
    if (c?.visible === false) continue;
    xs.push(c.xMm);
  }
  for (const f of layout.firmantes ?? []) {
    if (f.visible === false || f.id === excluirFirmaId) continue;
    xs.push(f.xMm);
  }
  return xs;
}

function aplicarSnapPosicion(opciones: {
  xMm: number;
  yMm: number;
  refsY: number[];
  refsX: number[];
}): { xMm: number; yMm: number } {
  const snapY = snapAReferencias(opciones.yMm, opciones.refsY);
  const snapX = snapAReferencias(opciones.xMm, opciones.refsX);
  const yMm = snapY ?? opciones.yMm;
  const xMm = snapX ?? opciones.xMm;
  guiaAlineacion.value =
    snapY != null || snapX != null
      ? {
          ...(snapY != null ? { yMm: snapY } : {}),
          ...(snapX != null ? { xMm: snapX } : {}),
        }
      : null;
  return { xMm: redondearMm(xMm), yMm: redondearMm(yMm) };
}

function esLineaCentro(valor: number, centro: number) {
  return Math.abs(valor - centro) < 0.05;
}

function esLineaMargen(valor: number) {
  return (
    Math.abs(valor - MARGEN_ENCUADRE_MM) < 0.05 ||
    Math.abs(valor - (ANCHO_MM - MARGEN_ENCUADRE_MM)) < 0.05 ||
    Math.abs(valor - (ALTO_MM - MARGEN_ENCUADRE_MM)) < 0.05
  );
}

function normalizarCantidadFirmasProp(valor: unknown): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 1;
  return Math.min(
    CANTIDAD_FIRMAS_CERTIFICADO_MAX,
    Math.max(1, Math.round(n)),
  );
}

const plantillaNormalizada = computed(() => {
  if (!props.plantilla) return null;
  return {
    ...props.plantilla,
    layout: normalizarLayoutPlantilla(props.plantilla.layout),
  };
});

watch(
  [plantillaNormalizada, () => props.cantidadFirmas],
  ([p]) => {
    if (!p) {
      urlFondo.value = "";
      return;
    }
    if (props.cantidadFirmas != null) {
      firmasCount.value = normalizarCantidadFirmasProp(props.cantidadFirmas);
    } else {
      firmasCount.value = Math.min(
        3,
        Math.max(1, p.layout.cantidadFirmantesActiva ?? 1),
      );
    }
    void resolverFondo(p.fondoUrl);
  },
  { immediate: true },
);

async function resolverFondo(raw: string) {
  const clave = raw.trim();
  if (!clave) {
    urlFondo.value = "";
    return;
  }
  if (clave.startsWith("data:") || clave.startsWith("blob:") || /^https?:\/\//i.test(clave)) {
    urlFondo.value = clave;
    return;
  }
  const peek = peekUrlMediaCacheada(clave);
  if (peek) {
    urlFondo.value = peek;
    return;
  }
  resolviendoFondo.value = true;
  try {
    urlFondo.value = await urlVisualizableMedia(clave, "");
  } catch {
    urlFondo.value = clave;
  } finally {
    resolviendoFondo.value = false;
  }
}

const layoutActivo = computed(() => {
  const p = plantillaNormalizada.value;
  if (!p) return null;
  const modelo = Math.min(3, firmasCount.value) as CantidadFirmantesCertificado;
  // En modo editable usamos el layout vivo (ya sincronizado por el padre).
  if (props.editable && firmasCount.value <= 3) {
    const firmantes = (p.layout.firmantes ?? [])
      .filter((f) => f.visible !== false)
      .slice(0, firmasCount.value);
    return {
      campos: p.layout.campos,
      firmantes:
        firmantes.length > 0
          ? firmantes
          : layoutDeModelo(p.layout, modelo).firmantes,
    };
  }
  return layoutDeModelo(p.layout, modelo);
});

function iniciarArrastreCampo(clave: ClaveCampo, evento: PointerEvent) {
  if (!props.editable || !lienzoRef.value || !layoutActivo.value) return;
  if (redimensionando.value) return;
  evento.preventDefault();
  evento.stopPropagation();
  arrastrando.value = true;
  const mover = (ev: PointerEvent) => {
    if (!lienzoRef.value) return;
    const r = lienzoRef.value.getBoundingClientRect();
    const crudoX = clamp(
      ((ev.clientX - r.left) / r.width) * ANCHO_MM,
      0,
      ANCHO_MM,
    );
    const crudoY = clamp(
      ((ev.clientY - r.top) / r.height) * ALTO_MM,
      0,
      ALTO_MM,
    );
    const snapeado = aplicarSnapPosicion({
      xMm: crudoX,
      yMm: crudoY,
      refsY: referenciasSnapCampos(clave),
      refsX: referenciasSnapX(clave),
    });
    emit("mover-campo", { clave, ...snapeado });
  };
  const soltar = () => {
    arrastrando.value = false;
    guiaAlineacion.value = null;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
  };
  mover(evento);
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function iniciarArrastreFirma(id: string, evento: PointerEvent) {
  if (!props.editable || !lienzoRef.value || redimensionando.value) return;
  evento.preventDefault();
  evento.stopPropagation();
  arrastrando.value = true;
  const mover = (ev: PointerEvent) => {
    if (!lienzoRef.value) return;
    const r = lienzoRef.value.getBoundingClientRect();
    const crudoX = clamp(
      ((ev.clientX - r.left) / r.width) * ANCHO_MM,
      0,
      ANCHO_MM,
    );
    const crudoY = clamp(
      ((ev.clientY - r.top) / r.height) * ALTO_MM,
      0,
      ALTO_MM,
    );
    const snapeado = aplicarSnapPosicion({
      xMm: crudoX,
      yMm: crudoY,
      refsY: referenciasSnapCampos(),
      refsX: referenciasSnapX(undefined, id),
    });
    emit("mover-firma", { id, ...snapeado });
  };
  const soltar = () => {
    arrastrando.value = false;
    guiaAlineacion.value = null;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
  };
  mover(evento);
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function iniciarResizeCampo(
  clave: ClaveCampo,
  esquina: EsquinaResize,
  evento: PointerEvent,
) {
  if (!props.editable || !lienzoRef.value || !layoutActivo.value) return;
  const meta = CAMPOS.find((c) => c.clave === clave);
  if (!meta || (meta.tipo !== "logo" && meta.tipo !== "qr")) return;
  evento.preventDefault();
  evento.stopPropagation();
  redimensionando.value = true;
  arrastrando.value = false;

  const campo0 = { ...layoutActivo.value.campos[clave] };
  const width0 = campo0.widthMm ?? 28;
  const height0 =
    campo0.heightMm ??
    (meta.tipo === "qr" ? width0 : width0 * ratioLogo.value);
  const ratio =
    meta.tipo === "qr"
      ? 1
      : height0 > 0 && width0 > 0
        ? height0 / width0
        : ratioLogo.value;

  const inicioX = evento.clientX;
  const inicioY = evento.clientY;

  const mover = (ev: PointerEvent) => {
    if (!lienzoRef.value) return;
    const r = lienzoRef.value.getBoundingClientRect();
    const dxMm = ((ev.clientX - inicioX) / r.width) * ANCHO_MM;
    const dyMm = ((ev.clientY - inicioY) / r.height) * ALTO_MM;
    const signX = esquina === "ne" || esquina === "se" ? 1 : -1;
    const signY = esquina === "sw" || esquina === "se" ? 1 : -1;

    // Escala única (proporcional): evita deformar la imagen.
    const scaleX = (width0 + signX * dxMm) / width0;
    const scaleY = (height0 + signY * dyMm) / height0;
    const scale = Math.abs(dxMm) >= Math.abs(dyMm) ? scaleX : scaleY;

    let nextW = clamp(width0 * scale, 8, 90);
    let nextH = nextW * ratio;
    if (nextH > 90) {
      nextH = 90;
      nextW = nextH / ratio;
    }
    if (nextW < 8) {
      nextW = 8;
      nextH = nextW * ratio;
    }

    emit("redimensionar-campo", {
      clave,
      widthMm: redondearMm(nextW),
      heightMm: redondearMm(nextH),
    });
  };

  const soltar = () => {
    redimensionando.value = false;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function iniciarResizeFirma(
  id: string,
  indice: number,
  esquina: EsquinaResize,
  evento: PointerEvent,
) {
  if (!props.editable || !lienzoRef.value || !layoutActivo.value) return;
  const firma0 = layoutActivo.value.firmantes.find((f) => f.id === id);
  if (!firma0) return;
  evento.preventDefault();
  evento.stopPropagation();
  redimensionando.value = true;
  arrastrando.value = false;

  const ancho0 = firma0.anchoLineaMm ?? 50;
  const font0 = firma0.fontSize ?? 10;
  const inicioX = evento.clientX;
  const inicioY = evento.clientY;
  const ratioImg = ratiosFirma.value[`idx-${indice}`] ?? 0.35;

  const mover = (ev: PointerEvent) => {
    if (!lienzoRef.value) return;
    const r = lienzoRef.value.getBoundingClientRect();
    const dxMm = ((ev.clientX - inicioX) / r.width) * ANCHO_MM;
    const dyMm = ((ev.clientY - inicioY) / r.height) * ALTO_MM;
    const signX = esquina === "ne" || esquina === "se" ? 1 : -1;
    const signY = esquina === "sw" || esquina === "se" ? 1 : -1;
    const alto0 = Math.max(8, ancho0 * ratioImg);
    const scaleX = (ancho0 + signX * dxMm) / ancho0;
    const scaleY = (alto0 + signY * dyMm) / alto0;
    const scale = Math.abs(dxMm) >= Math.abs(dyMm) ? scaleX : scaleY;
    const nextAncho = clamp(ancho0 * scale, 24, 100);
    const nextFont = clamp(font0 * (nextAncho / ancho0), 7, 18);

    emit("redimensionar-firma", {
      id,
      anchoLineaMm: redondearMm(nextAncho),
      fontSize: redondearMm(nextFont),
    });
  };

  const soltar = () => {
    redimensionando.value = false;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function claseEsquinaResize(esquina: EsquinaResize) {
  const base =
    "absolute z-20 h-3 w-3 border-2 border-white bg-primary shadow-sm";
  if (esquina === "nw") return `${base} -left-1.5 -top-1.5 cursor-nwse-resize`;
  if (esquina === "ne") return `${base} -right-1.5 -top-1.5 cursor-nesw-resize`;
  if (esquina === "sw") return `${base} -bottom-1.5 -left-1.5 cursor-nesw-resize`;
  return `${base} -bottom-1.5 -right-1.5 cursor-nwse-resize`;
}

const camposVisibles = computed(() => {
  const layout = layoutActivo.value;
  if (!layout) return [];
  return CAMPOS.filter((meta) => layout.campos[meta.clave]?.visible !== false);
});

const firmantesVisibles = computed(() => {
  const layout = layoutActivo.value;
  if (!layout) return [];
  const cantidad = firmasCount.value;
  const base = (layout.firmantes ?? []).filter((f) => f.visible !== false);
  if (cantidad <= base.length) return base.slice(0, cantidad);

  // 4–5 firmas: completa huecos con distribución automática.
  const extras = posicionesFirmantesVistaPrevia(
    Math.min(5, Math.max(1, cantidad)) as 1 | 2 | 3 | 4 | 5,
  );
  const resultado: FirmantePlantillaCertificado[] = [...base];
  for (let i = base.length; i < cantidad; i += 1) {
    const pos = extras[Math.min(i, extras.length - 1)] ?? extras[0]!;
    resultado.push({
      id: `firma-auto-${i}`,
      etiqueta: `Firma ${i + 1}`,
      nombreMostrar: "",
      xMm: pos.xMm,
      yMm: pos.yMm,
      align: pos.align,
      anchoLineaMm: pos.anchoLineaMm,
      fontSize: pos.fontSize,
      visible: true,
    });
  }
  return resultado.slice(0, cantidad);
});

function textoCampo(clave: ClaveCampo, campo: CampoPosicionCertificado) {
  if (clave === "curso" && props.tituloCurso.trim()) {
    return props.tituloCurso.trim();
  }
  if (clave === "titular" && props.nombreTitular.trim()) {
    return props.nombreTitular.trim();
  }
  if (clave === "detalle" && props.detalleTexto.trim()) {
    return props.detalleTexto.trim();
  }
  if (clave === "fecha" && props.fechaTexto.trim()) {
    return props.fechaTexto.trim();
  }
  if (clave === "codigo" && props.codigoTexto.trim()) {
    return props.codigoTexto.trim();
  }
  if (CAMPOS_CERTIFICADO_DINAMICOS.has(clave)) {
    const ejemplos = textosEjemploVistaPreviaCertificado();
    if (clave === "curso") {
      return (
        props.tituloCurso.trim() ||
        ejemplos.curso ||
        TEXTOS_CAMPO_CERTIFICADO_DEFAULT.curso
      );
    }
    if (clave === "titular" && props.nombreTitular.trim()) {
      return props.nombreTitular.trim();
    }
    return (
      ejemplos[clave as keyof typeof ejemplos] ||
      TEXTOS_CAMPO_CERTIFICADO_DEFAULT[
        clave as keyof typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT
      ] ||
      ""
    );
  }
  return (
    campo.texto?.trim() ||
    TEXTOS_CAMPO_CERTIFICADO_DEFAULT[
      clave as keyof typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT
    ] ||
    ""
  );
}

function estiloCampo(meta: MetaCampo, campo: CampoPosicionCertificado) {
  const left = `${(campo.xMm / ANCHO_MM) * 100}%`;
  const top = `${(campo.yMm / ALTO_MM) * 100}%`;
  if (meta.tipo === "logo" || meta.tipo === "qr") {
    const w = campo.widthMm ?? 28;
    const h =
      campo.heightMm ??
      (meta.tipo === "qr" ? w : Math.round(w * ratioLogo.value * 10) / 10);
    return {
      left,
      top,
      width: `${(w / ANCHO_MM) * 100}%`,
      height: `${(h / ALTO_MM) * 100}%`,
      transform: "none",
    };
  }
  const fontMm = (campo.fontSize ?? 11) * PT_A_MM;
  const align = campo.align ?? "center";
  const ancho = campo.widthMm ?? 180;
  return {
    left,
    top,
    width: `${(ancho / ANCHO_MM) * 100}%`,
    fontSize: `${(fontMm / ALTO_MM) * 100}cqh`,
    lineHeight: 1.15,
    color: meta.color ?? "#07152b",
    textAlign: align as "left" | "center" | "right",
    fontWeight: meta.negrita ? 800 : 500,
    transform:
      align === "left"
        ? "translate(0, -50%)"
        : align === "right"
          ? "translate(-100%, -50%)"
          : "translate(-50%, -50%)",
  };
}

function estiloFirma(firma: FirmantePlantillaCertificado, indice = 0) {
  const ancho = firma.anchoLineaMm ?? 50;
  const align = firma.align ?? "center";
  const fontMm = (firma.fontSize ?? 10) * PT_A_MM;
  const ratio = ratiosFirma.value[`idx-${indice}`] ?? 0.35;
  const altoImgMm = Math.min(28, Math.max(8, ancho * ratio));
  return {
    left: `${(firma.xMm / ANCHO_MM) * 100}%`,
    top: `${(firma.yMm / ALTO_MM) * 100}%`,
    width: `${(ancho / ANCHO_MM) * 100}%`,
    fontSize: `${(fontMm / ALTO_MM) * 100}cqh`,
    textAlign: align as "left" | "center" | "right",
    ["--firma-img-h" as string]: `${(altoImgMm / ALTO_MM) * 100}cqh`,
    transform:
      align === "left"
        ? "translate(0, -70%)"
        : align === "right"
          ? "translate(-100%, -70%)"
          : "translate(-50%, -70%)",
  };
}

function datosFirma(indice: number, firma: FirmantePlantillaCertificado) {
  const delCurso = props.firmas[indice];
  if (delCurso) {
    return {
      nombre: delCurso.nombre || firma.nombreMostrar || nombreSimuladoFirmante(indice).nombre,
      cargo:
        delCurso.cargo ||
        firma.etiqueta ||
        nombreSimuladoFirmante(indice).cargo,
      imagen: delCurso.imagen,
    };
  }
  if (firma.nombreMostrar?.trim()) {
    return {
      nombre: firma.nombreMostrar.trim(),
      cargo: firma.etiqueta || nombreSimuladoFirmante(indice).cargo,
      imagen: undefined as string | undefined,
    };
  }
  const sim = nombreSimuladoFirmante(indice);
  return { nombre: sim.nombre, cargo: firma.etiqueta || sim.cargo, imagen: undefined };
}
</script>

<template>
  <div class="grid gap-3">
    <div
      class="relative overflow-hidden border border-border bg-muted/40"
      :class="compacto ? 'mx-auto w-full max-w-lg' : 'mx-auto w-full max-w-3xl'"
    >
      <div
        class="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/65 to-transparent px-3 py-2"
      >
        <p class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
          <Eye class="h-3.5 w-3.5" />
          Vista previa en vivo
        </p>
        <div
          v-if="plantilla && mostrarSelectorFirmas"
          class="flex flex-wrap items-center gap-1"
        >
          <span class="text-[10px] font-semibold text-white/90">Firmas</span>
          <Button
            v-for="n in ([1, 2, 3] as const)"
            :key="n"
            type="button"
            size="sm"
            variant="ghost"
            class="h-7 min-w-7 px-2 text-[11px] font-bold text-white hover:bg-white/20"
            :class="
              firmasCount === n ? 'bg-white text-slate-900 hover:bg-white' : ''
            "
            @click="firmasCount = n"
          >
            {{ n }}
          </Button>
        </div>
        <p
          v-else-if="plantilla && !mostrarSelectorFirmas"
          class="text-[10px] font-semibold text-white/90"
        >
          Con tu firma
        </p>
      </div>

      <div
        v-if="cargando || resolviendoFondo"
        class="grid aspect-[297/210] place-items-center bg-muted"
      >
        <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <div
        v-else-if="!plantilla"
        class="grid aspect-[297/210] place-items-center bg-gradient-to-br from-[#071F52] to-[#0B3A78] p-6 text-white"
      >
        <div class="text-center">
          <Award class="mx-auto h-10 w-10 text-amber-300" />
          <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-200">
            Sin plantilla
          </p>
          <p class="mt-2 text-sm text-white/80">
            Elige una plantilla del catálogo para ver cómo quedará el certificado.
          </p>
        </div>
      </div>

      <div
        v-else
        ref="lienzoRef"
        class="relative aspect-[297/210] w-full overflow-hidden bg-[#f8fafc] touch-none"
        style="container-type: size"
        :class="arrastrando || redimensionando ? 'select-none' : ''"
      >
        <img
          v-if="urlFondo"
          :src="urlFondo"
          alt="Fondo del certificado"
          class="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          v-else
          class="absolute inset-0 grid place-items-center text-sm text-muted-foreground"
        >
          Plantilla sin fondo
        </div>

        <!-- Encuadre / distribución (solo al ajustar posición) -->
        <div
          v-if="editable"
          class="pointer-events-none absolute inset-0 z-[5]"
          aria-hidden="true"
        >
          <div
            class="absolute border-2 border-dashed border-sky-500/55"
            :style="{
              left: `${(MARGEN_ENCUADRE_MM / ANCHO_MM) * 100}%`,
              top: `${(MARGEN_ENCUADRE_MM / ALTO_MM) * 100}%`,
              width: `${((ANCHO_MM - MARGEN_ENCUADRE_MM * 2) / ANCHO_MM) * 100}%`,
              height: `${((ALTO_MM - MARGEN_ENCUADRE_MM * 2) / ALTO_MM) * 100}%`,
            }"
          />
          <div
            v-for="(xMm, idx) in lineasEncuadreVerticales"
            :key="`v-${idx}`"
            class="absolute bottom-0 top-0 border-l"
            :class="
              esLineaCentro(xMm, CENTRO_X_MM)
                ? 'border-sky-500/80'
                : esLineaMargen(xMm)
                  ? 'border-sky-400/40'
                  : 'border-sky-400/30 border-dashed'
            "
            :style="{ left: `${(xMm / ANCHO_MM) * 100}%` }"
          />
          <div
            v-for="(yMm, idx) in lineasEncuadreHorizontales"
            :key="`h-${idx}`"
            class="absolute left-0 right-0 border-t"
            :class="
              esLineaCentro(yMm, CENTRO_Y_MM)
                ? 'border-sky-500/80'
                : esLineaMargen(yMm)
                  ? 'border-sky-400/40'
                  : 'border-sky-400/30 border-dashed'
            "
            :style="{ top: `${(yMm / ALTO_MM) * 100}%` }"
          />
          <span
            class="absolute left-2 top-2 bg-sky-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
          >
            Encuadre
          </span>
        </div>

        <!-- Guías de imán al arrastrar -->
        <div
          v-if="editable && guiaAlineacion?.yMm != null"
          class="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-dashed border-amber-500"
          :style="{ top: `${(guiaAlineacion.yMm / ALTO_MM) * 100}%` }"
        >
          <span
            class="absolute left-1 top-0 -translate-y-full bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
          >
            Nivel alineado
          </span>
        </div>
        <div
          v-if="editable && guiaAlineacion?.xMm != null"
          class="pointer-events-none absolute bottom-0 top-0 z-30 border-l-2 border-dashed border-amber-500"
          :style="{ left: `${(guiaAlineacion.xMm / ANCHO_MM) * 100}%` }"
        />

        <div
          v-for="meta in camposVisibles"
          :key="meta.clave"
          class="absolute overflow-visible"
          :class="
            editable
              ? 'z-10 cursor-grab outline outline-2 outline-offset-1 outline-primary/70 active:cursor-grabbing'
              : 'pointer-events-none overflow-hidden'
          "
          :style="estiloCampo(meta, layoutActivo!.campos[meta.clave])"
          @pointerdown="iniciarArrastreCampo(meta.clave, $event)"
        >
          <span
            v-if="meta.tipo === 'texto'"
            class="block w-full overflow-hidden drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]"
            style="font-family: Georgia, 'Times New Roman', serif"
          >
            {{ textoCampo(meta.clave, layoutActivo!.campos[meta.clave]) }}
          </span>
          <span
            v-else-if="meta.tipo === 'logo'"
            class="flex h-full w-full items-center justify-center border border-dashed border-slate-400/60 bg-white/70"
          >
            <img
              v-if="logoUrl"
              :src="logoUrl"
              alt=""
              class="max-h-full max-w-full object-contain p-0.5"
            />
            <span v-else class="text-[10px] font-bold">LOGO</span>
          </span>
          <span
            v-else
            class="grid h-full w-full grid-cols-4 grid-rows-4 gap-px border border-slate-400/40 bg-white p-1"
          >
            <span
              v-for="celda in 16"
              :key="celda"
              class="bg-slate-800"
              :class="celda % 3 === 0 ? 'opacity-100' : 'opacity-25'"
            />
          </span>
          <template
            v-if="editable && (meta.tipo === 'logo' || meta.tipo === 'qr')"
          >
            <span
              v-for="esquina in ESQUINAS_RESIZE"
              :key="esquina"
              :class="claseEsquinaResize(esquina)"
              @pointerdown="iniciarResizeCampo(meta.clave, esquina, $event)"
            />
          </template>
        </div>

        <div
          v-for="(firma, indice) in firmantesVisibles"
          :key="firma.id"
          class="absolute"
          :class="
            editable
              ? 'z-10 cursor-grab outline outline-2 outline-offset-1 outline-amber-500/80 active:cursor-grabbing'
              : 'pointer-events-none'
          "
          :style="estiloFirma(firma, indice)"
          @pointerdown="iniciarArrastreFirma(firma.id, $event)"
        >
          <span class="flex w-full flex-col gap-0.5">
            <img
              v-if="datosFirma(indice, firma).imagen"
              :src="datosFirma(indice, firma).imagen"
              alt=""
              class="mb-0.5 mx-auto max-w-full object-contain"
              style="height: var(--firma-img-h, 1.6em)"
            />
            <span class="mb-1 block h-px w-full bg-[#07152b]" />
            <span
              class="font-extrabold text-[#07152b]"
              style="font-family: Georgia, serif"
            >
              {{ datosFirma(indice, firma).nombre }}
            </span>
            <span class="text-[0.75em] text-slate-600">
              {{ datosFirma(indice, firma).cargo }}
            </span>
          </span>
          <template v-if="editable">
            <span
              v-for="esquina in ESQUINAS_RESIZE"
              :key="esquina"
              :class="claseEsquinaResize(esquina)"
              @pointerdown="
                iniciarResizeFirma(firma.id, indice, esquina, $event)
              "
            />
          </template>
        </div>
      </div>
    </div>

    <p
      v-if="plantilla"
      class="text-center text-xs text-muted-foreground"
    >
      <template v-if="editable">
        Usa las líneas de encuadre para distribuir. Arrastra para mover; en logo
        y firma, usa las esquinas para cambiar el tamaño (siempre proporcional,
        sin deformar). Al desactivar el switch quedan fijos.
      </template>
      <template v-else-if="mostrarSelectorFirmas">
        Vista con datos de ejemplo. Al emitir se reemplazan por el alumno, la fecha y el código reales.
      </template>
      <template v-else>
        Vista con el nombre del curso y tu firma. El nombre del alumno y el código se completan al emitir.
      </template>
      <span v-if="plantilla.nombre" class="font-semibold text-foreground">
        · {{ plantilla.nombre }}
      </span>
    </p>
  </div>
</template>
