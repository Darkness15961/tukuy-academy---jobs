<script setup lang="ts">
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageUp,
  LayoutTemplate,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-vue-next";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  clonarPlantilla,
  plantillasCertificadoService,
} from "@/api/services/plantillas-certificado.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";
import {
  FONDO_CERTIFICADO_ESPECIFICACION,
  CAMPOS_CERTIFICADO_DINAMICOS,
  TEXTOS_CAMPO_CERTIFICADO_DEFAULT,
  textosEjemploVistaPreviaCertificado,
  nombreSimuladoFirmante,
  aplicarModeloFirmantes,
  sincronizarModeloFirmantesActivo,
  layoutDeModelo,
  ajustarCantidadFirmantes,
  crearPlantillaCertificadoBase,
  normalizarLayoutPlantilla,
  type CampoPosicionCertificado,
  type CantidadFirmantesCertificado,
  type ConfigCertificadosOrganizacion,
  type FirmantePlantillaCertificado,
  type FondoCertificadoOrganizacion,
  type LogoCertificadoOrganizacion,
  type PlantillaCertificado,
} from "@/lib/plantilla-certificado";
import { toast } from "@/lib/toast";
import {
  peekUrlMediaCacheada,
  storageAcademia,
  urlVisualizableMedia,
} from "@/lib/storage-academia";

type ClaveCampo = keyof PlantillaCertificado["layout"]["campos"];
type IdPaso =
  | "fondo"
  | "titulo"
  | "introduccion"
  | "titular"
  | "curso"
  | "detalle"
  | "fecha"
  | "codigo"
  | "firmas"
  | "logo"
  | "qr"
  | "guardar";
type ModoVista = "inicio" | "asistente";
type EsquinaResize = "nw" | "ne" | "sw" | "se";

type MetaCampo = {
  clave: ClaveCampo;
  etiqueta: string;
  tipo: "texto" | "logo" | "qr";
  negrita?: boolean;
  color?: string;
};

type DefPaso = {
  id: IdPaso;
  numero: number;
  titulo: string;
  ayuda: string;
  campo?: ClaveCampo;
};

const PT_A_MM = 0.352778;
const ANCHO_MM = 297;
const ALTO_MM = 210;

/** Fondos SVG embebidos (A4 landscape) para plantillas por defecto. */
const FONDO_CLASICA =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="2970" height="2100" viewBox="0 0 297 210">
  <rect width="297" height="210" fill="#fbfaf7"/>
  <rect x="8" y="8" width="281" height="194" fill="none" stroke="#0b3a6e" stroke-width="1.2"/>
  <rect x="11" y="11" width="275" height="188" fill="none" stroke="#c4a35a" stroke-width="0.6"/>
</svg>`);

const FONDO_MODERNA =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="2970" height="2100" viewBox="0 0 297 210">
  <rect width="297" height="210" fill="#ffffff"/>
  <rect width="297" height="28" fill="#071F52"/>
  <rect y="182" width="297" height="28" fill="#071F52"/>
  <rect x="0" y="28" width="10" height="154" fill="#c4a35a"/>
</svg>`);

const PLANTILLAS_DEFECTO = [
  {
    id: "clasica",
    nombre: "Clásica con marco",
    descripcion: "Fondo claro con doble marco. Ideal para textos centrados.",
    fondoUrl: FONDO_CLASICA,
  },
  {
    id: "moderna",
    nombre: "Moderna institucional",
    descripcion: "Bandas superior e inferior. Deja espacio al centro para el contenido.",
    fondoUrl: FONDO_MODERNA,
  },
] as const;

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

const PASOS: DefPaso[] = [
  {
    id: "fondo",
    numero: 1,
    titulo: "Fondo del certificado",
    ayuda: "Elige una plantilla lista, reutiliza un fondo guardado o sube tu propia imagen horizontal.",
  },
  {
    id: "titulo",
    numero: 2,
    titulo: "Título",
    ayuda: "¿Quieres un título escrito encima del fondo? Si tu imagen ya lo trae, omítelo.",
    campo: "tituloDocumento",
  },
  {
    id: "introduccion",
    numero: 3,
    titulo: "Introducción",
    ayuda: "Texto corto tipo «La entidad certifica que…».",
    campo: "introduccion",
  },
  {
    id: "titular",
    numero: 4,
    titulo: "Nombre del alumno",
    ayuda:
      "Solo defines posición y tamaño. El nombre real del alumno se coloca al emitir.",
    campo: "titular",
  },
  {
    id: "curso",
    numero: 5,
    titulo: "Nombre del curso",
    ayuda:
      "Solo defines posición y tamaño. El curso real se coloca al emitir.",
    campo: "curso",
  },
  {
    id: "detalle",
    numero: 6,
    titulo: "Detalle",
    ayuda:
      "Solo defines posición y tamaño. Categoría, horas, nivel y modalidad salen al emitir.",
    campo: "detalle",
  },
  {
    id: "fecha",
    numero: 7,
    titulo: "Fecha",
    ayuda:
      "Solo defines posición y tamaño. La fecha de emisión se coloca al emitir.",
    campo: "fecha",
  },
  {
    id: "codigo",
    numero: 8,
    titulo: "Código",
    ayuda:
      "Solo defines posición y tamaño. El código de verificación se genera al emitir.",
    campo: "codigo",
  },
  {
    id: "firmas",
    numero: 9,
    titulo: "Firmas",
    ayuda:
      "Configura un certificado derivado para 1, 2 y 3 firmas: mueve textos, logo, QR y espacios. Cada cantidad guarda su propio layout.",
  },
  {
    id: "logo",
    numero: 10,
    titulo: "Logo",
    ayuda:
      "Logo de la entidad o una imagen temporal (p. ej. campaña / temporada).",
    campo: "logo",
  },
  {
    id: "qr",
    numero: 11,
    titulo: "Código QR",
    ayuda: "QR para verificar el certificado en línea.",
    campo: "qr",
  },
  {
    id: "guardar",
    numero: 12,
    titulo: "Guardar diseño",
    ayuda: "Revisa y guarda. Puedes marcarlo como oficial para nuevas emisiones.",
  },
];

const OPCIONES_FIRMAS = [
  { label: "1 firma", value: 1 },
  { label: "2 firmas", value: 2 },
  { label: "3 firmas", value: 3 },
];

const ESQUINAS_RESIZE: EsquinaResize[] = ["nw", "ne", "sw", "se"];

const router = useRouter();
const { contextoActivo, funcionesEntidadActiva, tienePermiso } =
  useContextoSesion();

const instalacionId = computed(
  () => contextoActivo.value?.organizacionId?.trim() || "",
);
const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo ?? "",
);

const esDireccionOAdmin = computed(() => {
  const rol = String(contextoActivo.value?.rol ?? "").toUpperCase();
  return (
    ["OWNER", "ADMIN", "ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(
      rol,
    ) ||
    tienePermiso("certificados.configurar") ||
    tienePermiso("equipos.administrar") ||
    tienePermiso("entidad.gobernar") ||
    tienePermiso("certificados.emitir")
  );
});

const puedeEditar = computed(
  () =>
    esDireccionOAdmin.value || config.value?.docentesPuedenConfigurar === true,
);

const modo = ref<ModoVista>("inicio");
const cargando = ref(true);
const guardando = ref(false);
const subiendoFondo = ref(false);
const subiendoLogo = ref(false);
const error = ref("");
const mensaje = ref("");
const config = ref<ConfigCertificadosOrganizacion | null>(null);
const fondos = ref<FondoCertificadoOrganizacion[]>([]);
const logos = ref<LogoCertificadoOrganizacion[]>([]);
/** Lightbox para ver un fondo a tamaño grande. */
const fondoEnVista = ref<FondoCertificadoOrganizacion | null>(null);
/** Dialog de vista previa completa con datos simulados. */
const plantillaEnVista = ref<PlantillaCertificado | null>(null);
/** Cantidad de firmas a simular en el dialog (modelos 1–3 guardados). */
const firmasVistaPreviaCount = ref<1 | 2 | 3>(1);
const eliminandoFondoId = ref("");
const eliminandoLogoId = ref("");
const disenoId = ref<string | null>(null);
const borrador = ref<PlantillaCertificado | null>(null);
const pasoIndex = ref(0);
const inputFondoRef = ref<HTMLInputElement | null>(null);
const lienzoRef = ref<HTMLElement | null>(null);
const arrastrando = ref(false);
const redimensionando = ref(false);
/** Guía visual de imán al arrastrar (alineación horizontal/vertical). */
const guiaAlineacion = ref<{
  yMm?: number;
  xMm?: number;
} | null>(null);
/** Umbral en mm para auto-alinear cuando el cursor está cerca. */
const SNAP_UMBRAL_MM = 2.8;
const firmaSeleccionId = ref<string | null>(null);
const plantillaDefectoElegida = ref<string | null>(null);
/** true = editando un diseño guardado (misma revelación paso a paso). */
const esEdicion = ref(false);
/**
 * Cache de URLs firmadas/listas para <img> (fondos S3 privados).
 * Clave = fondoUrl cruda guardada en BD.
 */
const urlsFondoListas = ref<Record<string, string>>({});
let generacionFondoPreview = 0;

const pasoActual = computed(() => PASOS[pasoIndex.value] ?? PASOS[0]!);
const esUltimoPaso = computed(() => pasoIndex.value >= PASOS.length - 1);
const progresoPct = computed(
  () => ((pasoIndex.value + 1) / PASOS.length) * 100,
);

const metaCampoPaso = computed(() => {
  const clave = pasoActual.value.campo;
  if (!clave) return null;
  return CAMPOS.find((c) => c.clave === clave) ?? null;
});

const firmantes = computed(() => borrador.value?.layout.firmantes ?? []);
const cantidadFirmas = computed<CantidadFirmantesCertificado>(() => {
  if (!borrador.value) return 1;
  const cruda = Number(borrador.value.layout.cantidadFirmantesActiva);
  if (cruda === 1 || cruda === 2 || cruda === 3) return cruda;
  const n = firmantes.value.length;
  if (n >= 3) return 3;
  if (n === 2) return 2;
  return 1;
});

/** En el paso firmas (con firmas incluidas) se pueden mover todos los campos del certificado derivado. */
const editandoModeloDerivado = computed(() => {
  if (!borrador.value || pasoActual.value.id !== "firmas") return false;
  return firmantes.value.some((f) => f.visible !== false);
});

const previewFondo = computed(() => {
  const raw = borrador.value?.fondoUrl?.trim() || "";
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  return urlsFondoListas.value[raw] || "";
});

const previewLogo = computed(() => {
  if (!borrador.value) return "";
  if (borrador.value.layout.campos.logo.visible === false) return "";
  const override = String(borrador.value.logoOverrideUrl ?? "").trim();
  const raw =
    override ||
    (borrador.value.usarLogoEntidad ? logoEntidad.value : "") ||
    "";
  if (!raw) return "";
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    /^https?:\/\//i.test(raw)
  ) {
    return raw;
  }
  return urlsFondoListas.value[raw] || raw;
});

function urlLogoPlantilla(plantilla: PlantillaCertificado) {
  if (plantilla.layout.campos.logo.visible === false) return "";
  const override = String(plantilla.logoOverrideUrl ?? "").trim();
  const raw =
    override ||
    (plantilla.usarLogoEntidad ? logoEntidad.value : "") ||
    "";
  if (!raw) return "";
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    /^https?:\/\//i.test(raw)
  ) {
    return raw;
  }
  return urlsFondoListas.value[raw] || raw;
}

const plantillasGuardadas = computed(() => config.value?.plantillas ?? []);

/** Solo lo desbloqueado hasta el paso actual (creación y edición). */
const camposVisiblesEnLienzo = computed(() => {
  if (!borrador.value) return [];
  // En certificados derivados (paso firmas) se muestran todos los campos visibles
  // para poder reacomodar el layout completo.
  if (editandoModeloDerivado.value) {
    return CAMPOS.filter(
      (meta) =>
        borrador.value!.layout.campos[meta.clave].visible !== false,
    );
  }
  const idsHastaAqui = new Set(
    PASOS.slice(0, pasoIndex.value + 1)
      .map((p) => p.campo)
      .filter(Boolean) as ClaveCampo[],
  );
  return CAMPOS.filter((meta) => {
    if (!idsHastaAqui.has(meta.clave)) return false;
    return borrador.value!.layout.campos[meta.clave].visible !== false;
  });
});

const mostrarFirmasEnLienzo = computed(() => {
  if (!borrador.value) return false;
  const idxFirmas = PASOS.findIndex((p) => p.id === "firmas");
  return pasoIndex.value >= idxFirmas;
});

async function resolverUrlFondo(raw: string): Promise<string> {
  const clave = raw.trim();
  if (!clave) return "";
  if (clave.startsWith("data:") || clave.startsWith("blob:")) return clave;
  const enMemoria = peekUrlMediaCacheada(clave);
  if (enMemoria) {
    if (urlsFondoListas.value[clave] !== enMemoria) {
      urlsFondoListas.value = { ...urlsFondoListas.value, [clave]: enMemoria };
    }
    return enMemoria;
  }
  if (urlsFondoListas.value[clave]) return urlsFondoListas.value[clave]!;
  const lista = await urlVisualizableMedia(clave, "");
  if (lista) {
    urlsFondoListas.value = { ...urlsFondoListas.value, [clave]: lista };
  }
  return lista;
}

function urlFondoMostrada(raw: string | null | undefined): string {
  const clave = String(raw ?? "").trim();
  if (!clave) return "";
  if (clave.startsWith("data:") || clave.startsWith("blob:")) return clave;
  return (
    urlsFondoListas.value[clave] || peekUrlMediaCacheada(clave) || ""
  );
}

async function precargarUrlsFondos(urls: string[]) {
  const unicas = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  const pendientes = unicas.filter((u) => {
    if (u.startsWith("data:") || u.startsWith("blob:")) return false;
    if (urlsFondoListas.value[u] || peekUrlMediaCacheada(u)) {
      const peek = peekUrlMediaCacheada(u);
      if (peek && !urlsFondoListas.value[u]) {
        urlsFondoListas.value = { ...urlsFondoListas.value, [u]: peek };
      }
      return false;
    }
    return true;
  });
  if (!pendientes.length) return;
  await Promise.all(pendientes.map((u) => resolverUrlFondo(u)));
}

const campoTextoPasoEsDinamico = computed(() => {
  const clave = pasoActual.value.campo;
  return clave ? CAMPOS_CERTIFICADO_DINAMICOS.has(clave) : false;
});

function textoCampoLienzo(clave: ClaveCampo, campo: CampoPosicionCertificado) {
  if (CAMPOS_CERTIFICADO_DINAMICOS.has(clave)) {
    const ejemplos = textosEjemploVistaPreviaCertificado();
    return (
      ejemplos[clave as keyof typeof ejemplos] ||
      TEXTOS_CAMPO_CERTIFICADO_DEFAULT[
        clave as keyof typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT
      ] ||
      ""
    );
  }
  const propio = campo.texto?.trim();
  if (propio) return propio;
  const def =
    TEXTOS_CAMPO_CERTIFICADO_DEFAULT[
      clave as keyof typeof TEXTOS_CAMPO_CERTIFICADO_DEFAULT
    ];
  return def ?? "";
}

function etiquetaEspacioFirma(indice: number) {
  return `Firma ${indice + 1}`;
}

function abrirVistaPrevia(plantilla: PlantillaCertificado) {
  const layout = normalizarLayoutPlantilla(plantilla.layout);
  const nGuardadas = layout.cantidadFirmantesActiva ?? 1;
  firmasVistaPreviaCount.value = nGuardadas;
  plantillaEnVista.value = {
    ...plantilla,
    layout,
  };
  void resolverUrlFondo(plantilla.fondoUrl);
}

function cerrarVistaPreviaPlantilla() {
  plantillaEnVista.value = null;
}

function editarDesdeVistaPrevia() {
  const p = plantillaEnVista.value;
  cerrarVistaPreviaPlantilla();
  if (p) editarPlantilla(p);
}

function textoFirmaVistaPrevia(indice: number) {
  return nombreSimuladoFirmante(indice);
}

/** Usa el certificado derivado 1/2/3 guardado (campos + firmas). */
function firmantesParaVistaPrevia(plantilla: PlantillaCertificado) {
  const cantidad = Math.min(
    3,
    Math.max(1, firmasVistaPreviaCount.value),
  ) as CantidadFirmantesCertificado;
  return layoutDeModelo(plantilla.layout, cantidad).firmantes;
}

function camposParaVistaPrevia(plantilla: PlantillaCertificado) {
  const cantidad = Math.min(
    3,
    Math.max(1, firmasVistaPreviaCount.value),
  ) as CantidadFirmantesCertificado;
  return layoutDeModelo(plantilla.layout, cantidad).campos;
}

/** Helpers tipados para el dialog (vue-tsc no estrecha el v-if en callbacks). */
const camposDialogVistaPrevia = computed(() => {
  const p = plantillaEnVista.value;
  if (!p) return null;
  return camposParaVistaPrevia(p);
});

const firmantesDialogVistaPrevia = computed(() => {
  const p = plantillaEnVista.value;
  if (!p) return [];
  return firmantesParaVistaPrevia(p);
});

const OPCIONES_FIRMAS_PREVIEW: Array<{
  label: string;
  value: 1 | 2 | 3;
}> = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
];

/** Campos visibles de un diseño guardado (miniatura de biblioteca). */
function camposMiniatura(plantilla: PlantillaCertificado) {
  return CAMPOS.filter(
    (meta) => plantilla.layout.campos[meta.clave]?.visible !== false,
  );
}

function firmantesMiniatura(plantilla: PlantillaCertificado) {
  return (plantilla.layout.firmantes ?? []).filter((f) => f.visible !== false);
}

function asegurarBorrador(plantilla: PlantillaCertificado): PlantillaCertificado {
  const copia = clonarPlantilla(plantilla);
  copia.layout = normalizarLayoutPlantilla(copia.layout);
  return copia;
}

/** Al crear diseño nuevo: oculta todos los campos hasta que el usuario los active por paso. */
function prepararDisenoNuevo(plantilla: PlantillaCertificado): PlantillaCertificado {
  const copia = asegurarBorrador(plantilla);
  for (const clave of Object.keys(copia.layout.campos) as ClaveCampo[]) {
    copia.layout.campos[clave] = {
      ...copia.layout.campos[clave],
      visible: false,
    };
  }
  copia.layout.firmantes = ajustarCantidadFirmantes([], 1).map((f) => ({
    ...f,
    visible: false,
  }));
  return copia;
}

function estiloCampo(meta: MetaCampo, campo: CampoPosicionCertificado) {
  const left = `${(campo.xMm / ANCHO_MM) * 100}%`;
  const top = `${(campo.yMm / ALTO_MM) * 100}%`;
  if (meta.tipo === "logo" || meta.tipo === "qr") {
    const w = campo.widthMm ?? 28;
    const h = campo.heightMm ?? (meta.tipo === "qr" ? w : Math.round(w * 0.65));
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

function estiloFirma(firma: FirmantePlantillaCertificado) {
  const ancho = firma.anchoLineaMm ?? 50;
  const align = firma.align ?? "center";
  const fontMm = (firma.fontSize ?? 10) * PT_A_MM;
  return {
    left: `${(firma.xMm / ANCHO_MM) * 100}%`,
    top: `${(firma.yMm / ALTO_MM) * 100}%`,
    width: `${(ancho / ANCHO_MM) * 100}%`,
    fontSize: `${(fontMm / ALTO_MM) * 100}cqh`,
    textAlign: align as "left" | "center" | "right",
    transform:
      align === "left"
        ? "translate(0, -70%)"
        : align === "right"
          ? "translate(-100%, -70%)"
          : "translate(-50%, -70%)",
    opacity: firma.visible === false ? 0.35 : 1,
  };
}

function claseHandle(esquina: EsquinaResize) {
  const base =
    "absolute z-30 h-2.5 w-2.5 border border-white bg-primary shadow-sm";
  switch (esquina) {
    case "nw":
      return `${base} -left-1 -top-1 cursor-nwse-resize`;
    case "ne":
      return `${base} -right-1 -top-1 cursor-nesw-resize`;
    case "sw":
      return `${base} -bottom-1 -left-1 cursor-nesw-resize`;
    case "se":
      return `${base} -bottom-1 -right-1 cursor-nwse-resize`;
  }
}

function campoPasoVisible(): boolean {
  const clave = pasoActual.value.campo;
  if (!clave || !borrador.value) return false;
  return borrador.value.layout.campos[clave].visible !== false;
}

function setCampoPasoVisible(visible: boolean) {
  const clave = pasoActual.value.campo;
  if (!clave || !borrador.value || !puedeEditar.value) return;
  borrador.value.layout.campos[clave] = {
    ...borrador.value.layout.campos[clave],
    visible,
  };
}

function actualizarCampoPaso(
  patch: Partial<CampoPosicionCertificado>,
  claveForzada?: ClaveCampo,
) {
  const clave = claveForzada ?? pasoActual.value.campo;
  if (!clave || !borrador.value || !puedeEditar.value) return;
  const actual = borrador.value.layout.campos[clave];
  const next = { ...actual, ...patch };
  if (patch.widthMm != null && (clave === "qr" || clave === "logo")) {
    if (clave === "qr" && patch.heightMm == null) next.heightMm = patch.widthMm;
    else if (clave === "logo" && next.heightMm == null) {
      next.heightMm = Math.round(patch.widthMm * 0.65);
    }
  }
  borrador.value.layout.campos[clave] = next;
  if (editandoModeloDerivado.value) {
    borrador.value.layout = sincronizarModeloFirmantesActivo(
      borrador.value.layout,
    );
  }
}

function actualizarTextoCampoPaso(texto: string) {
  actualizarCampoPaso({ texto });
}

function actualizarFirma(
  id: string,
  patch: Partial<FirmantePlantillaCertificado>,
) {
  if (!borrador.value || !puedeEditar.value) return;
  const idx = borrador.value.layout.firmantes.findIndex((f) => f.id === id);
  if (idx < 0) return;
  const actual = borrador.value.layout.firmantes[idx];
  if (!actual) return;
  borrador.value.layout.firmantes[idx] = { ...actual, ...patch };
  borrador.value.layout = sincronizarModeloFirmantesActivo(borrador.value.layout);
}

function parseCantidadFirmas(raw: unknown): CantidadFirmantesCertificado | null {
  let valor: unknown = raw;
  if (valor && typeof valor === "object" && "value" in valor) {
    valor = (valor as { value: unknown }).value;
  }
  const n = Number(valor);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

function definirCantidadFirmas(cantidad: unknown) {
  if (!borrador.value || !puedeEditar.value) return;
  const n = parseCantidadFirmas(cantidad);
  if (!n) return;
  const layoutNuevo = aplicarModeloFirmantes(borrador.value.layout, n);
  // Reemplazo del borrador completo para forzar reactividad del lienzo.
  borrador.value = {
    ...borrador.value,
    layout: layoutNuevo,
  };
  firmaSeleccionId.value = layoutNuevo.firmantes[0]?.id ?? null;
  toast.success(
    `Certificado derivado de ${n} firma${n > 1 ? "s" : ""} activo. Puedes mover textos, logo, QR y firmas; al guardar queda este layout.`,
  );
}

function detectarPlantillaDefecto(fondoUrl: string) {
  const match = PLANTILLAS_DEFECTO.find((p) => p.fondoUrl === fondoUrl);
  if (match) {
    plantillaDefectoElegida.value = match.id;
    return;
  }
  plantillaDefectoElegida.value = fondoUrl?.trim() ? "propia" : null;
}

async function cargar() {
  if (!instalacionId.value) {
    error.value = "No hay organización activa en el contexto.";
    cargando.value = false;
    return;
  }
  cargando.value = true;
  error.value = "";
  try {
    const [cfg, listaFondos, listaLogos] = await Promise.all([
      plantillasCertificadoService.obtenerConfig(instalacionId.value),
      plantillasCertificadoService.listarFondos(instalacionId.value),
      plantillasCertificadoService.listarLogos(instalacionId.value),
    ]);
    config.value = cfg;
    fondos.value = listaFondos;
    logos.value = listaLogos;
    modo.value = "inicio";
    borrador.value = null;
    disenoId.value = null;
    pasoIndex.value = 0;
    await precargarUrlsFondos([
      ...listaFondos.map((f) => f.fondoUrl),
      ...cfg.plantillas.map((p) => p.fondoUrl),
      ...listaLogos.map((l) => l.logoUrl),
      ...cfg.plantillas.map((p) => p.logoOverrideUrl ?? ""),
      logoEntidad.value,
    ]);
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo cargar el diseño.";
  } finally {
    cargando.value = false;
  }
}

function abrirAsistente(plantilla: PlantillaCertificado, paso = 0) {
  const copia = asegurarBorrador(plantilla);
  borrador.value = copia;
  disenoId.value = copia.id;
  pasoIndex.value = paso;
  detectarPlantillaDefecto(copia.fondoUrl);
  firmaSeleccionId.value = copia.layout.firmantes[0]?.id ?? null;
  modo.value = "asistente";
    error.value = "";
  void resolverUrlFondo(copia.fondoUrl);
}

function iniciarDisenoNuevo() {
  if (!instalacionId.value || !puedeEditar.value) return;
  const base = prepararDisenoNuevo(
    crearPlantillaCertificadoBase({
      instalacionId: instalacionId.value,
      nombre: `Diseño ${(config.value?.plantillas.length ?? 0) + 1}`,
      alcance: esDireccionOAdmin.value ? "ORGANIZACION" : "DOCENTE",
      esDefault: !(config.value?.plantillas.length),
    }),
  );
  esEdicion.value = false;
  abrirAsistente(base, 0);
  toast.success("Empieza por el fondo del certificado.");
}

function editarPlantilla(plantilla: PlantillaCertificado) {
  if (!puedeEditar.value) return;
  esEdicion.value = true;
  // Misma revelación paso a paso: en cada paso aparece lo que ya configuraste.
  abrirAsistente(sanearVisibilidadAlEditar(plantilla), 0);
  toast.success(`Editando «${plantilla.nombre}». Avanza paso a paso: en cada uno verás lo que ya tenías.`);
}

function volverAInicio(mensajeSalida?: string) {
  modo.value = "inicio";
  borrador.value = null;
  disenoId.value = null;
  pasoIndex.value = 0;
  plantillaDefectoElegida.value = null;
  esEdicion.value = false;
  mensaje.value = mensajeSalida?.trim() || "";
  error.value = "";
  void precargarUrlsFondos([
    ...(config.value?.plantillas.map((p) => p.fondoUrl) ?? []),
    ...fondos.value.map((f) => f.fondoUrl),
  ]);
}

function salirDelAsistente() {
  volverAInicio(
    modo.value === "asistente" && borrador.value
      ? "Saliste del asistente. Si no guardaste, los cambios de esta sesión no se conservaron."
      : "",
  );
}

function elegirPlantillaDefecto(id: string) {
  if (!borrador.value || !puedeEditar.value) return;
  const plantilla = PLANTILLAS_DEFECTO.find((p) => p.id === id);
  if (!plantilla) return;
  plantillaDefectoElegida.value = id;
  borrador.value.fondoUrl = plantilla.fondoUrl;
  void resolverUrlFondo(plantilla.fondoUrl);
  toast.success(`Plantilla «${plantilla.nombre}» aplicada. Continúa con el título.`);
}

function elegirFondoGuardado(fondo: FondoCertificadoOrganizacion) {
  if (!borrador.value || !puedeEditar.value) return;
  borrador.value.fondoUrl = fondo.fondoUrl;
  plantillaDefectoElegida.value = "propia";
  void resolverUrlFondo(fondo.fondoUrl);
  toast.success(`Fondo «${fondo.nombre}» aplicado.`);
}

function verFondoGrande(fondo: FondoCertificadoOrganizacion) {
  fondoEnVista.value = fondo;
}

function cerrarVistaFondo() {
  fondoEnVista.value = null;
}

async function eliminarFondoSubido(fondo: FondoCertificadoOrganizacion) {
  if (!instalacionId.value || !puedeEditar.value) return;
  const ok = window.confirm(
    `¿Eliminar el fondo «${fondo.nombre}»?\nDejará de aparecer en la galería. Los diseños que ya lo usan no se borran automáticamente.`,
  );
  if (!ok) return;
  eliminandoFondoId.value = fondo.id;
  error.value = "";
  try {
    fondos.value = await plantillasCertificadoService.eliminarFondo(
      instalacionId.value,
      fondo.id,
    );
    if (fondoEnVista.value?.id === fondo.id) fondoEnVista.value = null;
    if (borrador.value?.fondoUrl === fondo.fondoUrl) {
      borrador.value.fondoUrl = "";
      plantillaDefectoElegida.value = null;
    }
    toast.success(`Fondo «${fondo.nombre}» eliminado.`);
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo eliminar el fondo.";
  } finally {
    eliminandoFondoId.value = "";
  }
}

function abrirSelectorFondo() {
  if (!puedeEditar.value || subiendoFondo.value) return;
  inputFondoRef.value?.click();
}

async function subirFondo(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = "";
  if (!archivo || !borrador.value || !puedeEditar.value) return;
  if (!archivo.type.startsWith("image/")) {
    error.value = "El fondo debe ser PNG, JPG o WEBP.";
    return;
  }
  if (archivo.size > 8_000_000) {
    error.value = "Máximo 8 MB.";
    return;
  }
  subiendoFondo.value = true;
  error.value = "";
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(archivo);
    });

    let urlFinal = dataUrl;
    borrador.value.fondoUrl = dataUrl;
    plantillaDefectoElegida.value = "propia";
    const gen = ++generacionFondoPreview;

    try {
      const subida = await storageAcademia.subirFondoCertificado(archivo);
      // Guardamos la clave S3; la vista usa URL firmada (el objeto no es público).
      urlFinal = subida.url || `s3://${subida.objectKey}`;
      if (gen === generacionFondoPreview && borrador.value) {
        borrador.value.fondoUrl = urlFinal;
        await resolverUrlFondo(urlFinal);
      }
    } catch {
      /* data URL local ok */
    }

    if (instalacionId.value) {
      try {
        fondos.value = await plantillasCertificadoService.registrarFondo(
          instalacionId.value,
          urlFinal,
          archivo.name.replace(/\.[^.]+$/, "") || "Fondo subido",
        );
        await precargarUrlsFondos(fondos.value.map((f) => f.fondoUrl));
      } catch {
        /* registro opcional */
      }
    }

    toast.success(urlFinal.startsWith("s3://") || urlFinal.startsWith("http")
      ? "Fondo subido y guardado en tu galería."
      : "Fondo cargado en este navegador (S3 no disponible). Quedó en tu galería local.");
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo subir el fondo.";
  } finally {
    subiendoFondo.value = false;
  }
}

async function subirLogoOverride(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = "";
  if (!archivo || !borrador.value || !puedeEditar.value) return;
  if (!archivo.type.startsWith("image/")) {
    error.value = "El logo debe ser PNG, JPG o WEBP.";
    return;
  }
  if (archivo.size > 4_000_000) {
    error.value = "Máximo 4 MB para el logo.";
    return;
  }
  subiendoLogo.value = true;
  error.value = "";
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(archivo);
    });

    borrador.value.usarLogoEntidad = true;
    borrador.value.logoOverrideUrl = dataUrl;
    borrador.value.layout.campos.logo.visible = true;

    try {
      const subida = await storageAcademia.subirFondoCertificado(archivo);
      const urlFinal = subida.url || `s3://${subida.objectKey}`;
      if (borrador.value) {
        borrador.value.logoOverrideUrl = urlFinal;
        await resolverUrlFondo(urlFinal);
      }
      logos.value = await plantillasCertificadoService.registrarLogo(
        instalacionId.value,
        urlFinal,
        archivo.name.replace(/\.[^.]+$/, "") || undefined,
      );
      toast.success(
        "Logo temporal subido. Quedó en logos sugeridos para reutilizarlo.",
      );
    } catch {
      logos.value = await plantillasCertificadoService.registrarLogo(
        instalacionId.value,
        dataUrl,
        archivo.name.replace(/\.[^.]+$/, "") || undefined,
      );
      toast.success(
        "Logo temporal cargado en este navegador (S3 no disponible). Quedó en sugeridos.",
      );
    }
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo subir el logo.";
  } finally {
    subiendoLogo.value = false;
  }
}

function elegirLogoGuardado(logo: LogoCertificadoOrganizacion) {
  if (!borrador.value || !puedeEditar.value) return;
  borrador.value.usarLogoEntidad = true;
  borrador.value.logoOverrideUrl = logo.logoUrl;
  borrador.value.layout.campos.logo.visible = true;
  void resolverUrlFondo(logo.logoUrl);
  toast.success(`Logo «${logo.nombre}» aplicado.`);
}

function elegirLogoEntidadEnPaso() {
  if (!borrador.value || !puedeEditar.value || !logoEntidad.value.trim()) return;
  borrador.value.usarLogoEntidad = true;
  borrador.value.logoOverrideUrl = null;
  borrador.value.layout.campos.logo.visible = true;
  toast.success("Se usará el logo de la entidad.");
}

async function eliminarLogoSubido(logo: LogoCertificadoOrganizacion) {
  if (!puedeEditar.value) return;
  eliminandoLogoId.value = logo.id;
  try {
    logos.value = await plantillasCertificadoService.eliminarLogo(
      instalacionId.value,
      logo.id,
    );
    if (borrador.value?.logoOverrideUrl === logo.logoUrl) {
      borrador.value.logoOverrideUrl = null;
    }
    toast.success(`Logo «${logo.nombre}» eliminado de sugeridos.`);
  } finally {
    eliminandoLogoId.value = "";
  }
}

function quitarLogoOverride() {
  if (!borrador.value || !puedeEditar.value) return;
  borrador.value.logoOverrideUrl = null;
  toast.success("Se usará de nuevo el logo de la entidad (si está activo).");
}

function puedeAvanzar(): boolean {
  if (!borrador.value) return false;
  if (pasoActual.value.id === "fondo") {
    return Boolean(borrador.value.fondoUrl?.trim());
  }
  return true;
}

function irAnterior() {
  if (pasoIndex.value <= 0) return;
  pasoIndex.value -= 1;
}

function irSiguiente() {
  if (!puedeAvanzar()) {
    error.value = "Elige una plantilla, un fondo guardado o sube tu propia imagen.";
    return;
  }
  error.value = "";
  if (pasoIndex.value < PASOS.length - 1) {
    pasoIndex.value += 1;
  }
  // Solo en creación nueva: al llegar a un elemento, lo incluimos para verlo.
  // En edición se respeta Incluir/Omitir ya guardado.
  if (!esEdicion.value && borrador.value) {
    const clave = pasoActual.value.campo;
    if (clave) {
      borrador.value.layout.campos[clave] = {
        ...borrador.value.layout.campos[clave],
        visible: true,
      };
    }
    if (pasoActual.value.id === "firmas") {
      if (!borrador.value.layout.firmantes.some((f) => f.visible !== false)) {
        definirCantidadFirmas(1);
      }
      firmaSeleccionId.value = borrador.value.layout.firmantes[0]?.id ?? null;
    }
  } else if (esEdicion.value && borrador.value && pasoActual.value.id === "firmas") {
    firmaSeleccionId.value = borrador.value.layout.firmantes[0]?.id ?? null;
  }
}

/** Si el diseño se guardó sin «Incluir», recupera visibilidad al editar. */
function sanearVisibilidadAlEditar(
  plantilla: PlantillaCertificado,
): PlantillaCertificado {
  const copia = asegurarBorrador(plantilla);
  const algunCampo = (
    Object.keys(copia.layout.campos) as ClaveCampo[]
  ).some((k) => copia.layout.campos[k].visible !== false);
  const algunaFirma = copia.layout.firmantes.some((f) => f.visible !== false);
  if (algunCampo || algunaFirma) return copia;
  for (const clave of Object.keys(copia.layout.campos) as ClaveCampo[]) {
    copia.layout.campos[clave] = {
      ...copia.layout.campos[clave],
      visible: true,
    };
  }
  copia.layout.firmantes = copia.layout.firmantes.map((f) => ({
    ...f,
    visible: true,
  }));
  return copia;
}

function incluirElementoActual() {
  if (pasoActual.value.id === "firmas") {
    definirCantidadFirmas(cantidadFirmas.value || 1);
    toast.success("Firmas incluidas. Puedes ajustar cantidad y nombres.");
    return;
  }
  setCampoPasoVisible(true);
  toast.success(`«${pasoActual.value.titulo}» incluido en el certificado.`);
}

function omitirElementoActual() {
  if (pasoActual.value.id === "firmas" && borrador.value) {
    borrador.value.layout.firmantes = borrador.value.layout.firmantes.map(
      (f) => ({ ...f, visible: false }),
    );
    toast.success("Firmas omitidas.");
    return;
  }
  setCampoPasoVisible(false);
  toast.success(`«${pasoActual.value.titulo}» omitido (útil si ya está en el fondo).`);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function redondearMm(n: number) {
  return Math.round(n * 10) / 10;
}

/** Imán: si está cerca de otra referencia, pega al mismo valor. */
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

function referenciasYFirmas(excluirFirmaId?: string): number[] {
  return firmantes.value
    .filter((f) => f.visible !== false && f.id !== excluirFirmaId)
    .map((f) => f.yMm);
}

function referenciasXFirmas(excluirFirmaId?: string): number[] {
  return firmantes.value
    .filter((f) => f.visible !== false && f.id !== excluirFirmaId)
    .map((f) => f.xMm);
}

function referenciasYCampos(excluirClave?: ClaveCampo): number[] {
  if (!borrador.value) return [];
  const ys: number[] = [];
  for (const meta of CAMPOS) {
    if (meta.clave === excluirClave) continue;
    const c = borrador.value.layout.campos[meta.clave];
    if (c.visible === false) continue;
    ys.push(c.yMm);
  }
  return ys;
}

function aplicarSnapPosicion(opciones: {
  xMm: number;
  yMm: number;
  refsY: number[];
  refsX?: number[];
}): { xMm: number; yMm: number } {
  const snapY = snapAReferencias(opciones.yMm, opciones.refsY);
  const snapX = opciones.refsX
    ? snapAReferencias(opciones.xMm, opciones.refsX)
    : null;
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

/** Pone todas las firmas visibles al mismo Y (nivel de la seleccionada o la 1.ª). */
function alinearFirmasMismoNivel() {
  if (!borrador.value || !puedeEditar.value) return;
  const visibles = borrador.value.layout.firmantes.filter(
    (f) => f.visible !== false,
  );
  if (visibles.length < 2) return;
  const ancla =
    visibles.find((f) => f.id === firmaSeleccionId.value) ?? visibles[0]!;
  const y = ancla.yMm;
  borrador.value.layout.firmantes = borrador.value.layout.firmantes.map(
    (f) => (f.visible === false ? f : { ...f, yMm: y }),
  );
  borrador.value.layout = sincronizarModeloFirmantesActivo(
    borrador.value.layout,
  );
  guiaAlineacion.value = { yMm: y };
  window.setTimeout(() => {
    if (guiaAlineacion.value?.yMm === y) guiaAlineacion.value = null;
  }, 700);
  toast.success("Firmas alineadas al mismo nivel.");
}

function iniciarArrastreCampo(clave: ClaveCampo, evento: PointerEvent) {
  if (!puedeEditar.value || !borrador.value || !lienzoRef.value) return;
  if (pasoActual.value.campo !== clave && !editandoModeloDerivado.value) return;
  if (redimensionando.value) return;
  evento.preventDefault();
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
    const refsY = [
      ...referenciasYCampos(clave),
      ...(editandoModeloDerivado.value ? referenciasYFirmas() : []),
    ];
    const snapeado = aplicarSnapPosicion({
      xMm: crudoX,
      yMm: crudoY,
      refsY,
    });
    actualizarCampoPaso(snapeado, clave);
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
  if (!puedeEditar.value || !borrador.value || !lienzoRef.value) return;
  if (pasoActual.value.campo !== clave && !editandoModeloDerivado.value) return;
  evento.preventDefault();
  evento.stopPropagation();
  redimensionando.value = true;
  arrastrando.value = false;

  const meta = CAMPOS.find((c) => c.clave === clave);
  if (!meta) return;

  const inicioX = evento.clientX;
  const inicioY = evento.clientY;
  const campo0 = { ...borrador.value.layout.campos[clave] };
  const font0 = campo0.fontSize ?? 11;
  const width0 = campo0.widthMm ?? (meta.tipo === "texto" ? 180 : 28);
  const height0 =
    campo0.heightMm ??
    (meta.tipo === "qr" ? width0 : Math.round(width0 * 0.65));

  const mover = (ev: PointerEvent) => {
    if (!lienzoRef.value) return;
    const r = lienzoRef.value.getBoundingClientRect();
    const dxPx = ev.clientX - inicioX;
    const dyPx = ev.clientY - inicioY;
    const dxMm = (dxPx / r.width) * ANCHO_MM;
    const dyMm = (dyPx / r.height) * ALTO_MM;

    const signX = esquina === "ne" || esquina === "se" ? 1 : -1;
    const signY = esquina === "sw" || esquina === "se" ? 1 : -1;

    if (meta.tipo === "texto") {
      const nextWidth = clamp(width0 + signX * dxMm, 20, 280);
      const nextFont = clamp(
        Math.round((font0 + signY * dyMm * 0.55) * 10) / 10,
        6,
        48,
      );
      actualizarCampoPaso(
        {
          widthMm: Math.round(nextWidth * 10) / 10,
          fontSize: nextFont,
        },
        clave,
      );
      return;
    }

    const nextW = clamp(width0 + signX * dxMm, 8, 90);
    const nextH = clamp(height0 + signY * dyMm, 8, 90);
    if (meta.tipo === "qr") {
      const side = Math.round(Math.max(nextW, nextH) * 10) / 10;
      actualizarCampoPaso({ widthMm: side, heightMm: side }, clave);
    } else {
      actualizarCampoPaso(
        {
          widthMm: Math.round(nextW * 10) / 10,
          heightMm: Math.round(nextH * 10) / 10,
        },
        clave,
      );
    }
  };

  const soltar = () => {
    redimensionando.value = false;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
  };
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
}

function iniciarArrastreFirma(id: string, evento: PointerEvent) {
  if (!puedeEditar.value || !borrador.value || !lienzoRef.value) return;
  if (pasoActual.value.id !== "firmas") return;
  evento.preventDefault();
  firmaSeleccionId.value = id;
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
    // Prioridad: mismo nivel (Y) que otras firmas; también X si coincide columna.
    const snapeado = aplicarSnapPosicion({
      xMm: crudoX,
      yMm: crudoY,
      refsY: referenciasYFirmas(id),
      refsX: referenciasXFirmas(id),
    });
    actualizarFirma(id, snapeado);
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

async function guardarDiseno(opciones: {
  marcarOficial?: boolean;
  salir?: boolean;
} = {}) {
  const marcarOficial = opciones.marcarOficial === true;
  const salir = opciones.salir === true;
  if (!borrador.value || !instalacionId.value || !puedeEditar.value) return;
  guardando.value = true;
  error.value = "";
  try {
    borrador.value.layout = sincronizarModeloFirmantesActivo(
      borrador.value.layout,
    );
    config.value = await plantillasCertificadoService.upsertPlantilla(
      instalacionId.value,
      {
        ...clonarPlantilla(borrador.value),
        nombre: borrador.value.nombre.trim() || "Diseño de certificado",
        layout: normalizarLayoutPlantilla(borrador.value.layout),
        esDefault: marcarOficial || borrador.value.esDefault,
      },
    );
    const guardada =
      config.value.plantillas.find((p) => p.id === borrador.value!.id) ??
      config.value.plantillas.find((p) => p.esDefault) ??
      config.value.plantillas[0];
    if (guardada) {
      disenoId.value = guardada.id;
      borrador.value = asegurarBorrador(guardada);
    }
    if (marcarOficial && guardada) {
      config.value = await plantillasCertificadoService.marcarDefault(
        instalacionId.value,
        guardada.id,
      );
      const oficial = config.value.plantillas.find((p) => p.id === guardada.id);
      if (oficial) borrador.value = asegurarBorrador(oficial);
    }
    const msg = marcarOficial
      ? "Diseño guardado y marcado como oficial al emitir."
      : "Diseño guardado.";
    if (salir) {
      volverAInicio(msg);
    } else {
      toast.success(msg);
    }
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo guardar.";
  } finally {
    guardando.value = false;
  }
}

async function marcarOficialDesdeLista(plantilla: PlantillaCertificado) {
  if (!instalacionId.value || !puedeEditar.value || !esDireccionOAdmin.value) {
    return;
  }
  guardando.value = true;
  error.value = "";
  try {
    config.value = await plantillasCertificadoService.marcarDefault(
      instalacionId.value,
      plantilla.id,
    );
    toast.success(`«${plantilla.nombre}» es ahora el diseño oficial al emitir.`);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo marcar como oficial.";
  } finally {
    guardando.value = false;
  }
}

async function eliminarPlantilla(plantilla: PlantillaCertificado) {
  if (!instalacionId.value || !puedeEditar.value) return;
  if (
    !window.confirm(
      `¿Eliminar el diseño «${plantilla.nombre}»? Esta acción no se puede deshacer.`,
    )
  ) {
    return;
  }
  guardando.value = true;
  error.value = "";
  try {
    config.value = await plantillasCertificadoService.eliminarPlantilla(
      instalacionId.value,
      plantilla.id,
    );
    toast.success(`Diseño «${plantilla.nombre}» eliminado.`);
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo eliminar.";
  } finally {
    guardando.value = false;
  }
}

async function alCambiarPermisoDocentes(permitir: boolean) {
  if (!instalacionId.value || !esDireccionOAdmin.value || !config.value) return;
  const anterior = config.value.docentesPuedenConfigurar;
  config.value = { ...config.value, docentesPuedenConfigurar: permitir };
  try {
    config.value = await plantillasCertificadoService.setDocentesPuedenConfigurar(
      instalacionId.value,
      permitir,
    );
    toast.success(
      permitir
        ? "Los docentes podrán crear y usar plantillas propias."
        : "Solo se usarán plantillas institucionales.",
    );
  } catch (causa) {
    config.value = { ...config.value, docentesPuedenConfigurar: anterior };
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo actualizar el permiso.",
    );
  }
}

watch(pasoIndex, () => {
  // Feedback de paso se maneja al avanzar / incluir elementos.
});

watch(
  () => borrador.value?.fondoUrl,
  (url) => {
    if (url) void resolverUrlFondo(url);
  },
);

watch(
  fondos,
  (lista) => {
    void precargarUrlsFondos(lista.map((f) => f.fondoUrl));
  },
  { deep: false },
);

onMounted(() => {
  void cargar();
});

onUnmounted(() => {
  generacionFondoPreview += 1;
});
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        :eyebrow="
          modo === 'asistente' ? 'Asistente paso a paso' : 'Biblioteca de diseños'
        "
        titulo="Diseño del certificado"
        :ayuda="
          modo === 'asistente'
            ? 'Te guiamos elemento por elemento: primero el fondo, luego el título, y así sucesivamente.'
            : 'Crea y administra diseños de certificado. El oficial se usa al emitir.'
        "
      />
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="modo === 'asistente'"
          variant="outline"
          size="sm"
          @click="salirDelAsistente"
        >
          Salir
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="router.push('/organizacion/certificados')"
        >
          Volver
        </Button>
        <Button variant="outline" size="sm" :disabled="cargando" @click="cargar">
          <RefreshCw class="h-4 w-4" :class="cargando ? 'animate-spin' : ''" />
          Recargar
        </Button>
      </div>
    </div>

    <div
      v-if="error"
      class="border-l-4 border-l-red-500 bg-red-500/10 p-4 text-sm font-semibold"
    >
      {{ error }}
    </div>
    <div
      v-if="mensaje"
      class="border-l-4 border-l-emerald-500 bg-emerald-500/10 p-4 text-sm font-semibold"
    >
      {{ mensaje }}
    </div>

    <div v-if="cargando" class="grid gap-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-80 w-full" />
    </div>

    <!-- ========== INICIO / BIBLIOTECA ========== -->
    <template v-else-if="modo === 'inicio'">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          {{ plantillasGuardadas.length }}
          {{
            plantillasGuardadas.length === 1
              ? "diseño guardado"
              : "diseños guardados"
          }}
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <label
            v-if="esDireccionOAdmin && config"
            class="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <div class="min-w-0">
              <p class="text-xs font-bold text-foreground">
                Permitir plantillas de docentes
              </p>
              <p class="text-[11px] text-muted-foreground">
                Podrán crear y usar sus propios diseños en el curso
              </p>
            </div>
            <ToggleSwitch
              :model-value="config.docentesPuedenConfigurar"
              @update:model-value="alCambiarPermisoDocentes"
            />
          </label>
          <Button :disabled="!puedeEditar" @click="iniciarDisenoNuevo">
            <Plus class="h-4 w-4" />
            Nuevo diseño
          </Button>
        </div>
      </div>

      <Card
        v-if="!plantillasGuardadas.length"
        class="border-border bg-card"
      >
        <CardContent class="grid gap-4 p-8 text-center">
          <p class="text-lg font-black">Aún no hay diseños</p>
          <p class="text-sm text-muted-foreground">
            Crea el primero: fondo, textos, firmas, logo y QR, paso a paso.
          </p>
          <div class="flex justify-center">
            <Button :disabled="!puedeEditar" @click="iniciarDisenoNuevo">
              Nuevo diseño
            </Button>
          </div>
        </CardContent>
      </Card>

      <div v-else class="grid gap-3">
        <Card
          v-for="plantilla in plantillasGuardadas"
          :key="plantilla.id"
          class="border-border bg-card transition hover:border-primary/40"
        >
          <CardContent
            class="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
          >
            <!-- Miniatura: clic pide vista previa -->
            <button
              type="button"
              class="group relative w-40 shrink-0 cursor-pointer overflow-hidden border border-border bg-[#f8fafc] text-left [container-type:size] transition hover:ring-2 hover:ring-primary sm:w-48"
              style="aspect-ratio: 297 / 210"
              :title="`Vista previa de «${plantilla.nombre}»`"
              @click="abrirVistaPrevia(plantilla)"
            >
              <img
                v-if="urlFondoMostrada(plantilla.fondoUrl)"
                :src="urlFondoMostrada(plantilla.fondoUrl)"
                alt=""
                class="absolute inset-0 h-full w-full object-cover"
              />
              <div
                v-else
                class="absolute inset-0 grid place-items-center text-[9px] text-muted-foreground"
              >
                Sin fondo
              </div>

              <div
                v-for="meta in camposMiniatura(plantilla)"
                :key="meta.clave"
                class="pointer-events-none absolute overflow-hidden"
                :style="estiloCampo(meta, plantilla.layout.campos[meta.clave])"
              >
                <span
                  v-if="meta.tipo === 'texto'"
                  class="block w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]"
                  style="font-family: Georgia, 'Times New Roman', serif"
                >
                  {{
                    textoCampoLienzo(
                      meta.clave,
                      plantilla.layout.campos[meta.clave],
                    )
                  }}
                </span>
                <span
                  v-else-if="meta.tipo === 'logo'"
                  class="flex h-full w-full items-center justify-center border border-dashed border-slate-400/60 bg-white/70"
                >
                  <img
                    v-if="urlLogoPlantilla(plantilla)"
                    :src="urlLogoPlantilla(plantilla)"
                    alt=""
                    class="max-h-full max-w-full object-contain p-0.5"
                  />
                  <span v-else class="text-[7px] font-bold">LOGO</span>
                </span>
                <span
                  v-else
                  class="grid h-full w-full grid-cols-3 grid-rows-3 gap-px border border-slate-400/40 bg-white p-0.5"
                >
                  <span
                    v-for="n in 9"
                    :key="n"
                    class="bg-slate-800"
                    :class="n % 2 === 0 ? 'opacity-100' : 'opacity-25'"
                  />
                </span>
              </div>

              <div
                v-for="(firma, indice) in firmantesMiniatura(plantilla)"
                :key="firma.id"
                class="pointer-events-none absolute"
                :style="estiloFirma(firma)"
              >
                <span class="flex w-full flex-col gap-px">
                  <span class="mb-0.5 block h-px w-full bg-[#07152b]" />
                  <span
                    class="truncate font-extrabold leading-none text-[#07152b]"
                    style="font-family: Georgia, serif"
                  >
                    {{ textoFirmaVistaPrevia(indice).nombre }}
                  </span>
                  <span class="truncate text-[0.7em] leading-none text-slate-500">
                    {{ textoFirmaVistaPrevia(indice).cargo }}
                  </span>
                </span>
              </div>

              <span
                class="absolute inset-0 z-20 flex items-end justify-center bg-gradient-to-t from-black/55 via-transparent to-transparent pb-2 opacity-100 transition sm:items-center sm:bg-black/0 sm:pb-0 sm:opacity-0 sm:group-hover:bg-black/45 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
              >
                <span
                  class="inline-flex items-center gap-1.5 border border-white/40 bg-black/60 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow"
                >
                  <Eye class="h-3.5 w-3.5" />
                  Abrir vista previa
                </span>
              </span>
            </button>

            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="abrirVistaPrevia(plantilla)"
            >
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-base font-black">{{ plantilla.nombre }}</p>
                <span
                  v-if="plantilla.esDefault"
                  class="inline-flex items-center gap-1 border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800"
                >
                  <Star class="h-3 w-3" />
                  Oficial
                </span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                Actualizado
                {{
                  new Date(plantilla.actualizadoEn).toLocaleString("es-PE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                }}
              </p>
            </button>
            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="abrirVistaPrevia(plantilla)"
              >
                <Eye class="h-4 w-4" />
                Vista previa
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!puedeEditar"
                @click="editarPlantilla(plantilla)"
              >
                <Pencil class="h-4 w-4" />
                Editar
              </Button>
              <Button
                v-if="esDireccionOAdmin && !plantilla.esDefault"
                variant="outline"
                size="sm"
                :disabled="guardando || !puedeEditar"
                @click="marcarOficialDesdeLista(plantilla)"
              >
                <Star class="h-4 w-4" />
                Usar como oficial
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="guardando || !puedeEditar"
                @click="eliminarPlantilla(plantilla)"
              >
                <Trash2 class="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- ========== ASISTENTE ========== -->
    <template v-else-if="borrador">
      <div class="space-y-3">
        <label class="grid max-w-xl gap-1">
          <span class="text-xs font-bold uppercase text-muted-foreground">
            Nombre del diseño
          </span>
          <InputText
            v-model="borrador.nombre"
            class="w-full"
            placeholder="Ej. Certificado institucional 2026"
            :disabled="!puedeEditar"
          />
        </label>
        <div
          class="flex items-center justify-between text-xs font-bold uppercase text-muted-foreground"
        >
          <span>
            {{ esEdicion ? "Editando" : "Creando" }}
            · paso {{ pasoActual.numero }} de {{ PASOS.length }}
          </span>
          <span>{{ pasoActual.titulo }}</span>
        </div>
        <div class="h-2 w-full bg-muted">
          <div
            class="h-full bg-primary transition-all duration-300"
            :style="{ width: `${progresoPct}%` }"
          />
        </div>
      </div>

      <div
        class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]"
      >
        <!-- Lienzo -->
        <Card class="border-border bg-card">
          <CardContent class="space-y-3 p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-black">Vista previa del certificado</p>
                <p class="text-[11px] text-muted-foreground">
                  {{
                    esEdicion
                      ? "En cada paso aparece lo que ya configuraste. El resto se suma al avanzar."
                      : "Solo se muestra lo del paso actual y los anteriores."
                  }}
                </p>
              </div>
            </div>
            <div
              ref="lienzoRef"
              class="relative w-full touch-none overflow-hidden border border-border bg-[#f8fafc] [container-type:size]"
              style="aspect-ratio: 297 / 210"
              :class="arrastrando || redimensionando ? 'select-none' : ''"
            >
              <img
                v-if="previewFondo"
                :src="previewFondo"
                alt="Fondo"
                class="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
              <div
                v-else-if="borrador.fondoUrl?.trim()"
                class="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground"
              >
                Cargando fondo…
              </div>
              <div
                v-else
                class="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground"
              >
                Aún sin fondo · elige plantilla o sube tu imagen (paso 1)
              </div>

              <div
                v-for="meta in camposVisiblesEnLienzo"
                :key="meta.clave"
                class="absolute z-10 select-none"
                :class="
                  pasoActual.campo === meta.clave || editandoModeloDerivado
                    ? 'cursor-grab outline outline-2 outline-offset-1 outline-primary active:cursor-grabbing'
                    : 'pointer-events-none outline outline-1 outline-black/10'
                "
                :style="estiloCampo(meta, borrador.layout.campos[meta.clave])"
                @pointerdown="iniciarArrastreCampo(meta.clave, $event)"
              >
                <span
                  v-if="meta.tipo === 'texto'"
                  class="block w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]"
                  style="font-family: Georgia, 'Times New Roman', serif"
                >
                  {{
                    textoCampoLienzo(
                      meta.clave,
                      borrador.layout.campos[meta.clave],
                    )
                  }}
                </span>
                <span
                  v-else-if="meta.tipo === 'logo'"
                  class="flex h-full w-full items-center justify-center border border-dashed border-slate-400/70 bg-white/70"
                >
                  <img
                    v-if="previewLogo"
                    :src="previewLogo"
                    alt="Logo"
                    class="max-h-full max-w-full object-contain p-0.5"
                  />
                  <span v-else class="text-[10px] font-bold">LOGO</span>
                </span>
                <span
                  v-else
                  class="flex h-full w-full flex-col border border-slate-400/50 bg-white"
                >
                  <span
                    class="grid flex-1 grid-cols-4 grid-rows-4 gap-px bg-slate-200 p-1"
                  >
                    <span
                      v-for="n in 16"
                      :key="n"
                      class="bg-slate-800"
                      :class="n % 3 === 0 ? 'opacity-100' : 'opacity-25'"
                    />
                  </span>
                </span>

                <template
                  v-if="
                    puedeEditar &&
                    (pasoActual.campo === meta.clave || editandoModeloDerivado)
                  "
                >
                  <span
                    v-for="esquina in ESQUINAS_RESIZE"
                    :key="esquina"
                    :class="claseHandle(esquina)"
                    @pointerdown="iniciarResizeCampo(meta.clave, esquina, $event)"
                  />
                </template>
              </div>

              <!-- Guías de alineación (imán) -->
              <div
                v-if="guiaAlineacion?.yMm != null"
                class="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-dashed border-sky-500/90"
                :style="{ top: `${(guiaAlineacion.yMm / ALTO_MM) * 100}%` }"
              >
                <span
                  class="absolute left-1 top-0 -translate-y-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                >
                  Nivel alineado
                </span>
              </div>
              <div
                v-if="guiaAlineacion?.xMm != null"
                class="pointer-events-none absolute bottom-0 top-0 z-30 border-l-2 border-dashed border-sky-500/90"
                :style="{ left: `${(guiaAlineacion.xMm / ANCHO_MM) * 100}%` }"
              />

              <button
                v-for="(firma, indice) in mostrarFirmasEnLienzo
                  ? firmantes.filter((f) => f.visible !== false)
                  : []"
                :key="firma.id"
                type="button"
                class="absolute z-20 cursor-grab select-none active:cursor-grabbing"
                :class="
                  pasoActual.id === 'firmas' && firmaSeleccionId === firma.id
                    ? 'outline outline-2 outline-primary'
                    : ''
                "
                :style="estiloFirma(firma)"
                :disabled="pasoActual.id !== 'firmas'"
                @pointerdown="iniciarArrastreFirma(firma.id, $event)"
              >
                <span class="flex w-full flex-col gap-0.5">
                  <span class="mb-1 block h-px w-full bg-[#07152b]" />
                  <span
                    class="font-extrabold text-[#07152b]"
                    style="font-family: Georgia, serif"
                  >
                    {{ etiquetaEspacioFirma(indice) }}
                  </span>
                  <span class="text-[0.75em] text-slate-500">Espacio</span>
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        <!-- Panel del paso -->
        <Card class="border-border bg-card">
          <CardContent class="flex h-full flex-col gap-4 p-5">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-primary">
                {{
                  esEdicion
                    ? `Editar · paso ${pasoActual.numero}`
                    : `Paso ${pasoActual.numero}`
                }}
              </p>
              <h2 class="text-xl font-black">{{ pasoActual.titulo }}</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ pasoActual.ayuda }}
              </p>
            </div>

            <!-- PASO FONDO -->
            <div v-if="pasoActual.id === 'fondo'" class="grid gap-3">
              <p class="text-sm font-bold">Plantillas por defecto</p>
              <button
                v-for="p in PLANTILLAS_DEFECTO"
                :key="p.id"
                type="button"
                class="flex gap-3 border border-border p-3 text-left transition hover:bg-muted/50"
                :class="
                  plantillaDefectoElegida === p.id
                    ? 'border-primary bg-primary/5'
                    : ''
                "
                :disabled="!puedeEditar"
                @click="elegirPlantillaDefecto(p.id)"
              >
                <span class="mt-0.5 shrink-0 overflow-hidden border border-border">
                  <img
                    :src="p.fondoUrl"
                    :alt="p.nombre"
                    class="h-12 w-16 object-cover"
                  />
                </span>
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <LayoutTemplate class="h-4 w-4 shrink-0 text-primary" />
                    <span class="block font-bold">{{ p.nombre }}</span>
                  </span>
                  <span class="text-xs text-muted-foreground">{{
                    p.descripcion
                  }}</span>
                </span>
                <Check
                  v-if="plantillaDefectoElegida === p.id"
                  class="ml-auto h-5 w-5 shrink-0 text-primary"
                />
              </button>

              <template v-if="fondos.length">
                <p class="mt-1 text-sm font-bold">Mis fondos subidos</p>
                <p class="text-xs text-muted-foreground">
                  Elige uno para usarlo, ábrelo para verlo completo o elimínalo.
                </p>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div
                    v-for="fondo in fondos"
                    :key="fondo.id"
                    class="overflow-hidden border border-border"
                    :class="
                      borrador.fondoUrl === fondo.fondoUrl
                        ? 'border-primary ring-1 ring-primary'
                        : ''
                    "
                  >
                    <button
                      type="button"
                      class="relative block w-full"
                      :disabled="!puedeEditar"
                      :title="fondo.nombre"
                      @click="elegirFondoGuardado(fondo)"
                    >
                      <img
                        :src="urlFondoMostrada(fondo.fondoUrl)"
                        :alt="fondo.nombre"
                        class="aspect-[297/210] w-full object-cover bg-muted"
                      />
                      <span
                        class="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white"
                      >
                        {{ fondo.nombre }}
                      </span>
                    </button>
                    <div class="flex gap-1 p-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-7 flex-1 px-1 text-[10px]"
                        @click="verFondoGrande(fondo)"
                      >
                        <Eye class="h-3 w-3" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-7 flex-1 px-1 text-[10px]"
                        :disabled="
                          !puedeEditar || eliminandoFondoId === fondo.id
                        "
                        @click="eliminarFondoSubido(fondo)"
                      >
                        <Trash2 class="h-3 w-3" />
                        {{
                          eliminandoFondoId === fondo.id ? "…" : "Quitar"
                        }}
                      </Button>
                    </div>
                  </div>
                </div>
              </template>
              <p
                v-else
                class="border border-dashed border-border p-3 text-xs text-muted-foreground"
              >
                Todavía no hay fondos guardados. Sube uno abajo y quedará en tu
                galería.
              </p>

              <div
                class="relative my-1 text-center text-xs font-bold uppercase text-muted-foreground"
              >
                o
              </div>

              <input
                ref="inputFondoRef"
                type="file"
                class="sr-only"
                accept="image/png,image/jpeg,image/webp"
                @change="subirFondo"
              />
              <Button
                type="button"
                variant="outline"
                class="w-full justify-start"
                :disabled="!puedeEditar || subiendoFondo"
                @click="abrirSelectorFondo"
              >
                <Upload class="h-4 w-4" />
                {{
                  subiendoFondo
                    ? "Subiendo…"
                    : plantillaDefectoElegida === "propia"
                      ? "Cambiar mi imagen"
                      : "Subir mi propia plantilla"
                }}
              </Button>
              <p class="text-xs text-muted-foreground">
                {{ FONDO_CERTIFICADO_ESPECIFICACION }}
              </p>
              <p
                v-if="previewFondo"
                class="flex items-center gap-2 text-xs font-semibold text-emerald-700"
              >
                <ImageUp class="h-4 w-4" />
                Fondo listo en la vista previa
              </p>
            </div>

            <!-- PASOS DE CAMPO -->
            <div v-else-if="pasoActual.campo && metaCampoPaso" class="grid gap-4">
              <div class="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  :variant="campoPasoVisible() ? 'default' : 'outline'"
                  @click="incluirElementoActual"
                >
                  Incluir
                </Button>
                <Button
                  type="button"
                  :variant="!campoPasoVisible() ? 'default' : 'outline'"
                  @click="omitirElementoActual"
                >
                  Omitir
                </Button>
              </div>

              <template v-if="campoPasoVisible()">
                <label
                  v-if="metaCampoPaso.tipo === 'texto' && !campoTextoPasoEsDinamico"
                  class="grid gap-1 text-xs font-bold"
                >
                  Escribe el texto
                  <textarea
                    class="min-h-20 w-full resize-y border border-border bg-background px-3 py-2 text-sm font-normal"
                    :value="borrador.layout.campos[pasoActual.campo].texto ?? ''"
                    :disabled="!puedeEditar"
                    rows="3"
                    @input="
                      actualizarTextoCampoPaso(
                        ($event.target as HTMLTextAreaElement).value,
                      )
                    "
                  />
                </label>

                <div
                  v-else-if="
                    metaCampoPaso.tipo === 'texto' && campoTextoPasoEsDinamico
                  "
                  class="border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                >
                  Este dato viene del alumno / curso / emisión. En la vista previa
                  ves un ejemplo; tú solo colocas y dimensionas el bloque.
                </div>

                <p class="text-xs text-muted-foreground">
                  Arrastra el elemento en la vista previa. Usa las esquinas para
                  redimensionar
                  {{
                    metaCampoPaso.tipo === "texto"
                      ? "(ancho y tamaño de letra)"
                      : "(ancho y alto)"
                  }}.
                </p>

                <div
                  v-if="pasoActual.id === 'logo'"
                  class="grid gap-3"
                >
                  <div
                    class="flex items-center justify-between gap-3 border border-border p-3"
                  >
                    <div>
                      <p class="text-sm font-bold">Usar logo de la entidad</p>
                      <p class="text-xs text-muted-foreground">
                        Logo institucional por defecto
                      </p>
                    </div>
                    <ToggleSwitch
                      v-model="borrador.usarLogoEntidad"
                      :disabled="!puedeEditar || Boolean(borrador.logoOverrideUrl)"
                    />
                  </div>

                  <div class="grid gap-2">
                    <p class="text-sm font-bold">Logos sugeridos</p>
                    <p class="text-xs text-muted-foreground">
                      Elige uno guardado o el de la entidad. Los que subas quedan
                      aquí para no volver a cargarlos.
                    </p>
                    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <button
                        v-if="logoEntidad"
                        type="button"
                        class="overflow-hidden border border-border text-left"
                        :class="
                          borrador.usarLogoEntidad && !borrador.logoOverrideUrl
                            ? 'border-primary ring-1 ring-primary'
                            : ''
                        "
                        :disabled="!puedeEditar"
                        title="Logo de la entidad"
                        @click="elegirLogoEntidadEnPaso"
                      >
                        <span
                          class="flex aspect-square items-center justify-center bg-white p-2"
                        >
                          <img
                            :src="urlFondoMostrada(logoEntidad) || logoEntidad"
                            alt="Entidad"
                            class="max-h-full max-w-full object-contain"
                          />
                        </span>
                        <span
                          class="block truncate px-1 py-0.5 text-[9px] font-semibold"
                          >Entidad</span
                        >
                      </button>
                      <div
                        v-for="logo in logos"
                        :key="logo.id"
                        class="overflow-hidden border border-border"
                        :class="
                          borrador.logoOverrideUrl === logo.logoUrl
                            ? 'border-primary ring-1 ring-primary'
                            : ''
                        "
                      >
                        <button
                          type="button"
                          class="flex aspect-square w-full items-center justify-center bg-white p-2"
                          :disabled="!puedeEditar"
                          :title="logo.nombre"
                          @click="elegirLogoGuardado(logo)"
                        >
                          <img
                            :src="urlFondoMostrada(logo.logoUrl)"
                            :alt="logo.nombre"
                            class="max-h-full max-w-full object-contain"
                          />
                        </button>
                        <div class="flex items-center gap-0.5 px-1 py-0.5">
                          <span
                            class="min-w-0 flex-1 truncate text-[9px] font-semibold"
                            >{{ logo.nombre }}</span
                          >
                          <button
                            type="button"
                            class="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
                            :disabled="
                              !puedeEditar || eliminandoLogoId === logo.id
                            "
                            title="Quitar"
                            @click="eliminarLogoSubido(logo)"
                          >
                            <Trash2 class="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p
                      v-if="!logoEntidad && !logos.length"
                      class="border border-dashed border-border p-2 text-xs text-muted-foreground"
                    >
                      Todavía no hay logos guardados. Sube uno abajo.
                    </p>
                  </div>

                  <div class="grid gap-2 border border-border p-3">
                    <p class="text-sm font-bold">Logo temporal / personalizado</p>
                    <p class="text-xs text-muted-foreground">
                      Sube una imagen (p. ej. logo navideño o campaña). Reemplaza
                      al logo de la entidad solo en este diseño y se guarda en
                      sugeridos.
                    </p>
                    <div
                      v-if="previewLogo && borrador.logoOverrideUrl"
                      class="flex items-center gap-3 border border-border bg-muted/30 p-2"
                    >
                      <img
                        :src="previewLogo"
                        alt="Logo temporal"
                        class="h-14 w-14 object-contain bg-white"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold">Logo personalizado activo</p>
                        <p class="truncate text-[11px] text-muted-foreground">
                          Se usa en lugar del logo de la entidad
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        :disabled="!puedeEditar"
                        @click="quitarLogoOverride"
                      >
                        Quitar
                      </Button>
                    </div>
                    <label
                      class="inline-flex cursor-pointer items-center justify-center gap-2 border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                      :class="
                        !puedeEditar || subiendoLogo
                          ? 'pointer-events-none opacity-50'
                          : ''
                      "
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        class="sr-only"
                        :disabled="!puedeEditar || subiendoLogo"
                        @change="subirLogoOverride"
                      />
                      {{
                        subiendoLogo
                          ? "Subiendo…"
                          : borrador.logoOverrideUrl
                            ? "Cambiar imagen"
                            : "Subir imagen de logo"
                      }}
                    </label>
                  </div>
                </div>
              </template>
              <p v-else class="text-sm text-muted-foreground">
                Este elemento no se imprimirá. Ideal si ya viene en tu imagen de
                fondo.
              </p>
            </div>

            <!-- FIRMAS -->
            <div v-else-if="pasoActual.id === 'firmas'" class="grid gap-3">
              <div class="grid grid-cols-2 gap-2">
                <Button type="button" @click="incluirElementoActual">
                  Incluir firmas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  @click="omitirElementoActual"
                >
                  Omitir
                </Button>
              </div>
              <template v-if="firmantes.some((f) => f.visible !== false)">
                <p class="text-sm text-muted-foreground">
                  Cada cantidad (1, 2 o 3) guarda un certificado derivado: puedes
                  mover textos, logo, QR y firmas. Al cambiar de modelo se
                  conserva el layout de cada uno.
                </p>
                <label
                  class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
                >
                  Modelo a configurar
                  <Select
                    :model-value="cantidadFirmas"
                    :options="OPCIONES_FIRMAS"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                    :disabled="!puedeEditar"
                    @update:model-value="definirCantidadFirmas($event)"
                  />
                </label>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="n in [1, 2, 3] as const"
                    :key="n"
                    type="button"
                    class="border px-2 py-0.5 text-[10px] font-bold uppercase transition"
                    :disabled="!puedeEditar"
                    :class="
                      cantidadFirmas === n
                        ? 'border-primary bg-primary/10 text-primary'
                        : borrador.layout.modelosDerivados?.[n]?.firmantes
                              ?.length === n ||
                            borrador.layout.modelosFirmantes?.[n]?.length === n
                          ? 'border-emerald-600/40 text-emerald-700 hover:border-primary'
                          : 'border-border text-muted-foreground hover:border-primary'
                    "
                    @click="definirCantidadFirmas(n)"
                  >
                    {{ n }} firma{{ n > 1 ? "s" : "" }}
                    {{
                      cantidadFirmas === n
                        ? "· editando"
                        : borrador.layout.modelosDerivados?.[n]?.firmantes
                              ?.length === n ||
                            borrador.layout.modelosFirmantes?.[n]?.length === n
                          ? "· listo"
                          : ""
                    }}
                  </button>
                </div>
                <div
                  v-for="(firma, indice) in firmantes"
                  :key="firma.id"
                  class="flex items-center justify-between gap-2 border border-border p-3"
                  :class="
                    firmaSeleccionId === firma.id ? 'border-primary' : ''
                  "
                  @click="firmaSeleccionId = firma.id"
                >
                  <div>
                    <p class="text-sm font-bold">
                      {{ etiquetaEspacioFirma(indice) }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      Solo posición. Las personas firman en el flujo de emisión
                      (docente + firma institucional).
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    @click.stop="firmaSeleccionId = firma.id"
                  >
                    Mover
                  </Button>
                </div>
                <Button
                  v-if="firmantes.filter((f) => f.visible !== false).length > 1"
                  type="button"
                  variant="outline"
                  class="w-full"
                  :disabled="!puedeEditar"
                  @click="alinearFirmasMismoNivel"
                >
                  Alinear firmas al mismo nivel
                </Button>
                <p class="text-xs text-muted-foreground">
                  Usa las pestañas <b>1 / 2 / 3 firmas</b> (no las filas «Firma 1»
                  de abajo) para cambiar de certificado derivado. Al arrastrar,
                  las firmas se pegan al mismo nivel cuando están cerca. Al
                  cambiar de modelo se guarda el layout de cada uno.
                </p>
              </template>
            </div>

            <!-- GUARDAR -->
            <div v-else-if="pasoActual.id === 'guardar'" class="grid gap-3">
              <p class="text-sm text-muted-foreground">
                A la izquierda ves la vista previa completa con datos de
                ejemplo (alumno, curso, fecha de hoy…). Al emitir se reemplazan
                por los reales. Las firmas son solo espacios.
              </p>
              <p class="text-sm text-muted-foreground">
                Elementos activos en este diseño:
              </p>
              <ul class="space-y-1 text-sm">
                <li
                  v-for="meta in CAMPOS"
                  :key="meta.clave"
                  class="flex justify-between border-b border-border/60 py-1"
                >
                  <span>{{ meta.etiqueta }}</span>
                  <span
                    class="font-bold"
                    :class="
                      borrador.layout.campos[meta.clave].visible !== false
                        ? 'text-emerald-600'
                        : 'text-muted-foreground'
                    "
                  >
                    {{
                      borrador.layout.campos[meta.clave].visible !== false
                        ? "Sí"
                        : "No"
                    }}
                  </span>
                </li>
                <li class="flex justify-between py-1">
                  <span>Firmas</span>
                  <span class="font-bold">
                    {{
                      firmantes.filter((f) => f.visible !== false).length ||
                      "Ninguna"
                    }}
                  </span>
                </li>
              </ul>
              <Button
                class="w-full"
                :disabled="guardando || !puedeEditar"
                @click="guardarDiseno({ salir: true })"
              >
                <Save class="h-4 w-4" />
                {{ guardando ? "Guardando…" : "Guardar y salir" }}
              </Button>
              <Button
                v-if="esDireccionOAdmin"
                variant="outline"
                class="w-full"
                :disabled="guardando"
                @click="guardarDiseno({ marcarOficial: true, salir: true })"
              >
                Guardar, usar al emitir y salir
              </Button>
            </div>

            <div class="mt-auto flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                class="flex-1"
                :disabled="pasoIndex === 0"
                @click="irAnterior"
              >
                <ChevronLeft class="h-4 w-4" />
                Atrás
              </Button>
              <Button
                v-if="!esUltimoPaso"
                type="button"
                class="flex-1"
                @click="irSiguiente"
              >
                Siguiente
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex justify-end">
        <Button
          v-if="puedeEditar && !esUltimoPaso"
          variant="outline"
          size="sm"
          :disabled="guardando"
          @click="guardarDiseno({ salir: false })"
        >
          Guardar avance
        </Button>
      </div>
    </template>

    <!-- Lightbox ver fondo -->
    <div
      v-if="fondoEnVista"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vista del fondo"
      @click.self="cerrarVistaFondo"
    >
      <div class="relative w-full max-w-4xl border border-border bg-card shadow-xl">
        <div class="flex items-center justify-between gap-3 border-b border-border p-3">
          <div class="min-w-0">
            <p class="truncate font-black">{{ fondoEnVista.nombre }}</p>
            <p class="text-xs text-muted-foreground">
              {{
                new Date(fondoEnVista.creadoEn).toLocaleString("es-PE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="!puedeEditar || eliminandoFondoId === fondoEnVista.id"
              @click="eliminarFondoSubido(fondoEnVista)"
            >
              <Trash2 class="h-4 w-4" />
              Eliminar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="cerrarVistaFondo"
            >
              <X class="h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
        <img
          :src="urlFondoMostrada(fondoEnVista.fondoUrl)"
          :alt="fondoEnVista.nombre"
          class="max-h-[75vh] w-full object-contain bg-muted"
        />
      </div>
    </div>

    <!-- Dialog vista previa del diseño (datos simulados) -->
    <div
      v-if="plantillaEnVista"
      class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del certificado"
      @click.self="cerrarVistaPreviaPlantilla"
    >
      <div
        class="relative flex max-h-[95vh] w-full max-w-5xl flex-col border border-border bg-card shadow-xl"
      >
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-3"
        >
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wide text-primary">
              Vista previa simulada
            </p>
            <p class="truncate text-lg font-black">
              {{ plantillaEnVista.nombre }}
            </p>
            <p class="text-xs text-muted-foreground">
              Datos de ejemplo (apellidos XXXXXXX XXXX). Al emitir se usan los
              reales.
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button
              v-if="puedeEditar"
              type="button"
              size="sm"
              @click="editarDesdeVistaPrevia"
            >
              <Pencil class="h-4 w-4" />
              Editar diseño
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="cerrarVistaPreviaPlantilla"
            >
              <X class="h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>

        <div class="overflow-auto p-3 sm:p-5">
          <div
            class="relative mx-auto w-full max-w-4xl overflow-hidden border border-border bg-[#f8fafc] [container-type:size]"
            style="aspect-ratio: 297 / 210"
          >
            <!-- Controles encima de la imagen -->
            <div
              class="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5"
            >
              <p class="text-[11px] font-bold uppercase tracking-wide text-white">
                Vista previa
              </p>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] font-semibold text-white/90">
                  Modelo de firmas
                </span>
                <button
                  v-for="op in OPCIONES_FIRMAS_PREVIEW"
                  :key="op.value"
                  type="button"
                  class="min-w-8 border px-2 py-0.5 text-[11px] font-bold transition"
                  :class="
                    firmasVistaPreviaCount === op.value
                      ? 'border-white bg-white text-slate-900'
                      : 'border-white/50 bg-black/40 text-white hover:bg-black/60'
                  "
                  @click.stop="firmasVistaPreviaCount = op.value"
                >
                  {{ op.label }}
                </button>
              </div>
            </div>

            <img
              v-if="urlFondoMostrada(plantillaEnVista.fondoUrl)"
              :src="urlFondoMostrada(plantillaEnVista.fondoUrl)"
              alt="Fondo del certificado"
              class="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div
              v-else
              class="absolute inset-0 grid place-items-center text-sm text-muted-foreground"
            >
              Sin fondo
            </div>

            <div
              v-for="meta in CAMPOS.filter(
                (m) => camposDialogVistaPrevia?.[m.clave]?.visible !== false,
              )"
              :key="meta.clave"
              class="pointer-events-none absolute overflow-hidden"
              :style="
                estiloCampo(meta, camposDialogVistaPrevia?.[meta.clave]!)
              "
            >
              <span
                v-if="meta.tipo === 'texto'"
                class="block w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]"
                style="font-family: Georgia, 'Times New Roman', serif"
              >
                {{
                  textoCampoLienzo(
                    meta.clave,
                    camposDialogVistaPrevia?.[meta.clave]!,
                  )
                }}
              </span>
              <span
                v-else-if="meta.tipo === 'logo'"
                class="flex h-full w-full items-center justify-center border border-dashed border-slate-400/60 bg-white/70"
              >
                <img
                  v-if="urlLogoPlantilla(plantillaEnVista)"
                  :src="urlLogoPlantilla(plantillaEnVista)"
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
                  v-for="n in 16"
                  :key="n"
                  class="bg-slate-800"
                  :class="n % 3 === 0 ? 'opacity-100' : 'opacity-25'"
                />
              </span>
            </div>

            <div
              v-for="(firma, indice) in firmantesDialogVistaPrevia"
              :key="firma.id"
              class="pointer-events-none absolute"
              :style="estiloFirma(firma)"
            >
              <span class="flex w-full flex-col gap-0.5">
                <span class="mb-1 block h-px w-full bg-[#07152b]" />
                <span
                  class="font-extrabold text-[#07152b]"
                  style="font-family: Georgia, serif"
                >
                  {{ textoFirmaVistaPrevia(indice).nombre }}
                </span>
                <span class="text-[0.75em] text-slate-600">
                  {{ textoFirmaVistaPrevia(indice).cargo }}
                </span>
              </span>
            </div>
          </div>
          <p class="mt-2 text-center text-[11px] text-muted-foreground">
            1 / 2 / 3 muestran el certificado derivado guardado (textos + firmas).
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
