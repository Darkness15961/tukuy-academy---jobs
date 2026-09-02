<script setup lang="ts">
import { organizacionService } from "@/api/services/organizacion.service";
import {
  clonarPlantilla,
  plantillasCertificadoService,
} from "@/api/services/plantillas-certificado.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import VistaPreviaPlantillaCertificado from "@/components/shared/VistaPreviaPlantillaCertificado.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import type {
  LayoutPlantillaCertificado,
  LogoCertificadoOrganizacion,
  PlantillaCertificado,
} from "@/lib/plantilla-certificado";
import {
  aplicarModeloFirmantes,
  sincronizarModeloFirmantesActivo,
} from "@/lib/plantilla-certificado";
import {
  peekUrlMediaCacheada,
  storageAcademia,
  urlVisualizableMedia,
} from "@/lib/storage-academia";
import { toast } from "@/lib/toast";
import type { CertificadoEmitidoDocente } from "@/portal-docente/types/docente.types";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  Award,
  Check,
  Eye,
  FileDown,
  Loader2,
  Move,
  SlidersHorizontal,
  Trash2,
} from "lucide-vue-next";

type LogoSugerido = {
  id: string;
  nombre: string;
  logoUrl: string;
  origen: "entidad" | "galeria" | "plantilla";
};

const router = useRouter();
const { contextoActivo, funcionesEntidadActiva, tienePermiso } =
  useContextoSesion();

const instalacionId = computed(
  () =>
    String(contextoActivo.value?.organizacionId ?? "").trim() ||
    String(funcionesEntidadActiva.value[0]?.organizacion?.id ?? "").trim() ||
    INSTALACION_TUKUY_ACADEMY_ID,
);

const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo ?? "",
);

const plantillas = ref<PlantillaCertificado[]>([]);
const logosGaleria = ref<LogoCertificadoOrganizacion[]>([]);
const plantillaId = ref("");
const titularNombre = ref("");
const motivoTitulo = ref("");
const correoTitular = ref("");
const detalle = ref("");
const logoOverrideUrl = ref<string | null>(null);
const logoOverridePreview = ref("");
const firmanteNombre = ref("");
const firmanteCargo = ref("");
const firmaImagenUrl = ref<string | null>(null);
const firmaImagenPreview = ref("");
const subiendoLogo = ref(false);
const subiendoFirma = ref(false);
const eliminandoLogoId = ref("");
const cargando = ref(true);
const emitiendo = ref(false);
const error = ref("");
const emitido = ref<CertificadoEmitidoDocente | null>(null);
const previewPdfUrl = ref<string | null>(null);
const cargandoPdf = ref(false);
/** URLs listas para <img> (fondos / logos S3). */
const urlsMedia = ref<Record<string, string>>({});

const plantillaActiva = computed(
  () =>
    plantillas.value.find((p) => p.id === plantillaId.value) ??
    plantillas.value.find((p) => p.esDefault) ??
    plantillas.value[0] ??
    null,
);

const logosSugeridos = computed((): LogoSugerido[] => {
  const vistos = new Set<string>();
  const lista: LogoSugerido[] = [];

  const push = (item: LogoSugerido) => {
    const key = item.logoUrl.trim();
    if (!key || vistos.has(key)) return;
    vistos.add(key);
    lista.push(item);
  };

  if (logoEntidad.value.trim()) {
    push({
      id: "entidad",
      nombre: "Logo de la entidad",
      logoUrl: logoEntidad.value.trim(),
      origen: "entidad",
    });
  }

  for (const logo of logosGaleria.value) {
    push({
      id: logo.id,
      nombre: logo.nombre,
      logoUrl: logo.logoUrl,
      origen: "galeria",
    });
  }

  for (const plantilla of plantillas.value) {
    const url = String(plantilla.logoOverrideUrl ?? "").trim();
    if (!url) continue;
    push({
      id: `plantilla-${plantilla.id}`,
      nombre: plantilla.nombre,
      logoUrl: url,
      origen: "plantilla",
    });
  }

  return lista;
});

const logoPreviewUrl = computed(() => {
  if (logoOverridePreview.value) return logoOverridePreview.value;
  const override = String(plantillaActiva.value?.logoOverrideUrl ?? "").trim();
  if (override) return urlMostrada(override) || override;
  if (plantillaActiva.value?.usarLogoEntidad !== false) {
    return logoEntidad.value || "";
  }
  return "";
});

const firmasPreview = computed(() => {
  const nombre = firmanteNombre.value.trim();
  if (!nombre && !firmaImagenPreview.value) return [];
  return [
    {
      nombre: nombre || "Nombre del firmante",
      cargo: firmanteCargo.value.trim() || undefined,
      imagen: firmaImagenPreview.value || undefined,
    },
  ];
});

/** Layout local de esta emisión (posiciones ajustables sin tocar el diseño guardado). */
const layoutOverride = ref<LayoutPlantillaCertificado | null>(null);
const ajustarPosicion = ref(false);

function reiniciarLayoutDesdePlantilla(plantilla: PlantillaCertificado | null) {
  if (!plantilla) {
    layoutOverride.value = null;
    return;
  }
  layoutOverride.value = aplicarModeloFirmantes(
    clonarPlantilla(plantilla.layout),
    1,
  );
}

watch(
  () => plantillaActiva.value?.id,
  () => {
    reiniciarLayoutDesdePlantilla(plantillaActiva.value);
  },
);

/** Plantilla con layout de esta emisión (1 firma + ajustes de posición). */
const plantillaParaPreview = computed(() => {
  const base = plantillaActiva.value;
  if (!base) return null;
  return {
    ...base,
    layout: layoutOverride.value ?? {
      ...base.layout,
      cantidadFirmantesActiva: 1 as const,
    },
  };
});

function moverCampo(payload: {
  clave: keyof LayoutPlantillaCertificado["campos"];
  xMm: number;
  yMm: number;
}) {
  if (!layoutOverride.value || !ajustarPosicion.value) return;
  const layout = clonarPlantilla(layoutOverride.value);
  layout.campos = {
    ...layout.campos,
    [payload.clave]: {
      ...layout.campos[payload.clave],
      xMm: payload.xMm,
      yMm: payload.yMm,
    },
  };
  layout.cantidadFirmantesActiva = 1;
  layoutOverride.value = sincronizarModeloFirmantesActivo(layout);
}

function moverFirma(payload: { id: string; xMm: number; yMm: number }) {
  if (!layoutOverride.value || !ajustarPosicion.value) return;
  const layout = clonarPlantilla(layoutOverride.value);
  layout.firmantes = layout.firmantes.map((f) =>
    f.id === payload.id ? { ...f, xMm: payload.xMm, yMm: payload.yMm } : f,
  );
  layout.cantidadFirmantesActiva = 1;
  layoutOverride.value = sincronizarModeloFirmantesActivo(layout);
}

function redimensionarCampo(payload: {
  clave: keyof LayoutPlantillaCertificado["campos"];
  widthMm: number;
  heightMm: number;
}) {
  if (!layoutOverride.value || !ajustarPosicion.value) return;
  const layout = clonarPlantilla(layoutOverride.value);
  layout.campos = {
    ...layout.campos,
    [payload.clave]: {
      ...layout.campos[payload.clave],
      widthMm: payload.widthMm,
      heightMm: payload.heightMm,
    },
  };
  layout.cantidadFirmantesActiva = 1;
  layoutOverride.value = sincronizarModeloFirmantesActivo(layout);
}

function redimensionarFirma(payload: {
  id: string;
  anchoLineaMm: number;
  fontSize: number;
}) {
  if (!layoutOverride.value || !ajustarPosicion.value) return;
  const layout = clonarPlantilla(layoutOverride.value);
  layout.firmantes = layout.firmantes.map((f) =>
    f.id === payload.id
      ? {
          ...f,
          anchoLineaMm: payload.anchoLineaMm,
          fontSize: payload.fontSize,
        }
      : f,
  );
  layout.cantidadFirmantesActiva = 1;
  layoutOverride.value = sincronizarModeloFirmantesActivo(layout);
}

const fechaHoy = computed(() =>
  new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date()),
);

const puedeEmitir = computed(
  () =>
    tienePermiso("certificados.emitir") &&
    titularNombre.value.trim().length > 0 &&
    motivoTitulo.value.trim().length > 0 &&
    firmanteNombre.value.trim().length > 0 &&
    Boolean(firmaImagenUrl.value || firmaImagenPreview.value) &&
    !emitiendo.value,
);

function urlMostrada(raw: string | null | undefined) {
  const valor = String(raw ?? "").trim();
  if (!valor) return "";
  if (
    valor.startsWith("data:") ||
    valor.startsWith("blob:") ||
    /^https?:\/\//i.test(valor)
  ) {
    return valor;
  }
  return urlsMedia.value[valor] || peekUrlMediaCacheada(valor) || "";
}

async function resolverUrl(raw: string | null | undefined) {
  const valor = String(raw ?? "").trim();
  if (!valor || urlsMedia.value[valor]) return;
  if (
    valor.startsWith("data:") ||
    valor.startsWith("blob:") ||
    /^https?:\/\//i.test(valor)
  ) {
    urlsMedia.value = { ...urlsMedia.value, [valor]: valor };
    return;
  }
  const peek = peekUrlMediaCacheada(valor);
  if (peek) {
    urlsMedia.value = { ...urlsMedia.value, [valor]: peek };
    return;
  }
  try {
    const lista = await urlVisualizableMedia(valor, valor);
    urlsMedia.value = { ...urlsMedia.value, [valor]: lista };
  } catch {
    /* ignore */
  }
}

async function precargarMedias(urls: Array<string | null | undefined>) {
  await Promise.all(urls.map((u) => resolverUrl(u)));
}

function elegirPlantilla(id: string) {
  if (emitiendo.value) return;
  plantillaId.value = id;
}

function logoEstaSeleccionado(url: string) {
  const actual = String(
    logoOverrideUrl.value || logoOverridePreview.value || "",
  ).trim();
  return Boolean(actual) && actual === url.trim();
}

function elegirLogoSugerido(logo: LogoSugerido) {
  if (emitiendo.value) return;
  logoOverrideUrl.value = logo.logoUrl;
  logoOverridePreview.value = urlMostrada(logo.logoUrl) || logo.logoUrl;
  void resolverUrl(logo.logoUrl);
}

async function cargarDatos() {
  cargando.value = true;
  error.value = "";
  try {
    const [config, logos] = await Promise.all([
      plantillasCertificadoService.obtenerConfig(instalacionId.value),
      plantillasCertificadoService.listarLogos(instalacionId.value),
    ]);
    plantillas.value = config.plantillas ?? [];
    logosGaleria.value = logos;
    const defecto =
      plantillas.value.find((p) => p.esDefault) ?? plantillas.value[0];
    if (defecto) plantillaId.value = defecto.id;
    reiniciarLayoutDesdePlantilla(
      plantillas.value.find((p) => p.id === plantillaId.value) ??
        defecto ??
        null,
    );

    await precargarMedias([
      logoEntidad.value,
      ...plantillas.value.map((p) => p.fondoUrl),
      ...plantillas.value.map((p) => p.logoOverrideUrl),
      ...logos.map((l) => l.logoUrl),
    ]);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron cargar las plantillas.";
  } finally {
    cargando.value = false;
  }
}

async function subirLogoTemporal(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = "";
  if (!archivo) return;
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
    logoOverridePreview.value = dataUrl;
    logoOverrideUrl.value = dataUrl;
    let urlFinal = dataUrl;
    try {
      const subida = await storageAcademia.subirFondoCertificado(archivo);
      urlFinal = subida.url || `s3://${subida.objectKey}`;
      logoOverrideUrl.value = urlFinal;
      logoOverridePreview.value = urlFinal;
      await resolverUrl(urlFinal);
      logoOverridePreview.value = urlMostrada(urlFinal) || urlFinal;
    } catch {
      /* data URL local ok */
    }
    logosGaleria.value = await plantillasCertificadoService.registrarLogo(
      instalacionId.value,
      urlFinal,
      archivo.name.replace(/\.[^.]+$/, "") || undefined,
    );
    toast.success("Logo aplicado y guardado en sugeridos.");
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo subir el logo.";
  } finally {
    subiendoLogo.value = false;
  }
}

function quitarLogoTemporal() {
  logoOverrideUrl.value = null;
  logoOverridePreview.value = "";
}

async function subirFirmaImagen(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = "";
  if (!archivo) return;
  if (!archivo.type.startsWith("image/")) {
    error.value = "La firma debe ser PNG, JPG o WEBP (ideal fondo transparente).";
    return;
  }
  if (archivo.size > 3_000_000) {
    error.value = "Máximo 3 MB para la imagen de firma.";
    return;
  }
  subiendoFirma.value = true;
  error.value = "";
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(archivo);
    });
    firmaImagenPreview.value = dataUrl;
    firmaImagenUrl.value = dataUrl;
    try {
      const subida = await storageAcademia.subirFondoCertificado(archivo);
      const urlFinal = subida.url || `s3://${subida.objectKey}`;
      firmaImagenUrl.value = urlFinal;
      await resolverUrl(urlFinal);
      firmaImagenPreview.value = urlMostrada(urlFinal) || dataUrl;
    } catch {
      /* data URL local ok */
    }
    toast.success("Firma aplicada a esta emisión.");
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo subir la firma.";
  } finally {
    subiendoFirma.value = false;
  }
}

function quitarFirmaImagen() {
  firmaImagenUrl.value = null;
  firmaImagenPreview.value = "";
}

async function eliminarLogoGaleria(logo: LogoSugerido) {
  if (logo.origen !== "galeria" || emitiendo.value) return;
  eliminandoLogoId.value = logo.id;
  try {
    logosGaleria.value = await plantillasCertificadoService.eliminarLogo(
      instalacionId.value,
      logo.id,
    );
    if (logoEstaSeleccionado(logo.logoUrl)) quitarLogoTemporal();
    toast.success("Logo quitado de sugeridos.");
  } finally {
    eliminandoLogoId.value = "";
  }
}

function liberarPdfPreview() {
  if (previewPdfUrl.value?.startsWith("blob:")) {
    URL.revokeObjectURL(previewPdfUrl.value);
  }
  previewPdfUrl.value = null;
}

async function abrirPdfEmitido(cert: CertificadoEmitidoDocente) {
  liberarPdfPreview();
  cargandoPdf.value = true;
  try {
    const { blobCertificatePdf } = await import("@/lib/certificado-pdf");
    const plantilla = plantillaParaPreview.value
      ? {
          ...plantillaParaPreview.value,
          usarLogoEntidad: true,
          logoOverrideUrl:
            logoOverrideUrl.value ||
            plantillaParaPreview.value.logoOverrideUrl,
        }
      : null;
    const blob = await blobCertificatePdf({
      holderName: cert.nombre,
      courseTitle: cert.curso,
      category: "Certificación institucional",
      duration: detalle.value.trim() || "Certificación institucional",
      level: "Aprobado",
      mode: "Virtual",
      issuedAt: cert.fecha,
      certificateCode: cert.codigoVerificacion || cert.id,
      issuerName:
        cert.organizacionEmisora ||
        contextoActivo.value?.organizacionNombre ||
        "Tukuy Academy",
      issuerLogoUrl: logoEntidad.value || undefined,
      firmantes: [
        {
          nombre: firmanteNombre.value.trim() || "Firmante",
          cargo: firmanteCargo.value.trim() || undefined,
          imagen: firmaImagenUrl.value || firmaImagenPreview.value || undefined,
        },
      ],
      plantilla,
    });
    previewPdfUrl.value = URL.createObjectURL(blob);
  } catch {
    previewPdfUrl.value = null;
  } finally {
    cargandoPdf.value = false;
  }
}

async function emitir() {
  if (!puedeEmitir.value) {
    error.value =
      "Completa titular, motivo, nombre del firmante e imagen de firma.";
    return;
  }
  if (!tienePermiso("certificados.emitir")) {
    error.value = "Tu perfil no puede emitir certificados.";
    return;
  }
  emitiendo.value = true;
  error.value = "";
  try {
    const resultado = await organizacionService.emitirCertificadoManual({
      titularNombre: titularNombre.value.trim(),
      motivoTitulo: motivoTitulo.value.trim(),
      correoTitular: correoTitular.value.trim() || null,
      detalle: detalle.value.trim() || null,
      plantillaId: plantillaId.value || null,
      logoEntidadUrl: logoEntidad.value || null,
      logoOverrideUrl: logoOverrideUrl.value,
      firmanteNombre: firmanteNombre.value.trim(),
      firmanteCargo: firmanteCargo.value.trim() || null,
      firmaImagenUrl: firmaImagenUrl.value || firmaImagenPreview.value,
      layoutOverride: layoutOverride.value,
    });
    emitido.value = resultado;
    toast.success(
      resultado.requiereFirmaInstitucional
        ? "Certificado preparado. Falta firma institucional."
        : "Certificado emitido.",
    );
    await abrirPdfEmitido(resultado);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo emitir el certificado.";
  } finally {
    emitiendo.value = false;
  }
}

async function descargarEmitido() {
  if (!emitido.value) return;
  if (previewPdfUrl.value) {
    const a = document.createElement("a");
    a.href = previewPdfUrl.value;
    a.download = `certificado-${emitido.value.codigoVerificacion || emitido.value.id}.pdf`;
    a.click();
    return;
  }
  await abrirPdfEmitido(emitido.value);
}

function abrirPdfEnPestana() {
  if (!previewPdfUrl.value) return;
  window.open(previewPdfUrl.value, "_blank", "noopener,noreferrer");
}

function emitirOtro() {
  emitido.value = null;
  liberarPdfPreview();
}

function volver() {
  router.push({ name: "certificados-organizacion" });
}

onMounted(() => {
  void cargarDatos();
});

onBeforeUnmount(() => {
  liberarPdfPreview();
});
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6 pb-10">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="grid gap-2">
        <Button variant="ghost" class="w-fit px-0" @click="volver">
          <ArrowLeft class="h-4 w-4" />
          Volver a certificados
        </Button>
        <TituloConAyuda
          titulo="Emisión manual"
          ayuda="Configura los datos y revisa la vista previa antes de emitir. No usa matrícula ni progreso académico."
          clase-titulo="text-2xl font-black"
        />
      </div>
      <Button
        variant="outline"
        @click="router.push({ name: 'diseno-certificado-organizacion' })"
      >
        <SlidersHorizontal class="h-4 w-4" />
        Ajustar diseños
      </Button>
    </header>

    <div
      v-if="error"
      class="border border-red-500/30 border-l-4 border-l-red-600 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- Éxito post-emisión -->
    <div
      v-if="emitido"
      class="grid gap-4 border border-emerald-500/30 border-l-4 border-l-emerald-600 bg-card p-5"
    >
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-emerald-700">
          Certificado emitido
        </p>
        <h2 class="mt-1 text-xl font-black">
          {{ emitido.nombre }} · {{ emitido.curso }}
        </h2>
        <p class="mt-1 font-mono text-sm text-muted-foreground">
          {{ emitido.codigoVerificacion || emitido.id }}
        </p>
        <p
          v-if="emitido.requiereFirmaInstitucional"
          class="mt-2 text-sm text-amber-700 dark:text-amber-400"
        >
          Falta la firma institucional para publicarlo en el verificador.
        </p>
      </div>
      <div class="min-h-[50vh] overflow-hidden border border-border bg-muted/30">
        <div
          v-if="cargandoPdf"
          class="grid h-[50vh] place-items-center text-sm text-muted-foreground"
        >
          Generando PDF…
        </div>
        <iframe
          v-else-if="previewPdfUrl"
          :src="previewPdfUrl"
          title="PDF del certificado"
          class="h-[50vh] w-full bg-white"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="volver">Ir al listado</Button>
        <Button
          variant="outline"
          :disabled="!previewPdfUrl"
          @click="abrirPdfEnPestana"
        >
          <Eye class="h-4 w-4" />
          Abrir
        </Button>
        <Button @click="descargarEmitido">
          <FileDown class="h-4 w-4" />
          Descargar PDF
        </Button>
        <Button variant="outline" @click="emitirOtro">Emitir otro</Button>
      </div>
    </div>

    <!-- Configuración + preview -->
    <div
      v-else
      class="grid gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]"
    >
      <aside class="grid gap-4 self-start border border-border bg-card p-5">
        <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
          Datos del certificado
        </p>

        <div class="grid gap-2">
          <Label for="em-titular">Nombre del titular</Label>
          <Input
            id="em-titular"
            v-model="titularNombre"
            placeholder="Ej. Mg. Ana Pérez Quispe"
            :disabled="emitiendo"
          />
        </div>

        <div class="grid gap-2">
          <Label for="em-motivo">Motivo / título</Label>
          <Input
            id="em-motivo"
            v-model="motivoTitulo"
            placeholder="Ej. Reconocimiento por labor destacada"
            :disabled="emitiendo"
          />
        </div>

        <div class="grid gap-2">
          <Label for="em-correo">Correo (opcional)</Label>
          <Input
            id="em-correo"
            v-model="correoTitular"
            type="email"
            placeholder="para enviar aviso"
            :disabled="emitiendo"
          />
        </div>

        <div class="grid gap-2">
          <Label for="em-detalle">Detalle / horas (opcional)</Label>
          <textarea
            id="em-detalle"
            v-model="detalle"
            rows="3"
            class="flex min-h-20 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            placeholder="Texto adicional del campo detalle"
            :disabled="emitiendo"
          />
        </div>

        <div class="grid gap-2">
          <Label>Plantilla</Label>
          <p class="text-xs text-muted-foreground">
            Elige el diseño por su imagen (no solo por el nombre).
          </p>
          <div
            v-if="cargando"
            class="border border-dashed border-border p-4 text-sm text-muted-foreground"
          >
            Cargando diseños…
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="plantilla in plantillas"
              :key="plantilla.id"
              type="button"
              class="group relative overflow-hidden border border-border text-left transition hover:border-primary/50"
              :class="
                plantillaId === plantilla.id
                  ? 'border-primary ring-1 ring-primary'
                  : ''
              "
              :disabled="emitiendo"
              :title="plantilla.nombre"
              @click="elegirPlantilla(plantilla.id)"
            >
              <span
                class="relative block w-full bg-muted"
                style="aspect-ratio: 297 / 210"
              >
                <img
                  v-if="urlMostrada(plantilla.fondoUrl)"
                  :src="urlMostrada(plantilla.fondoUrl)"
                  :alt="plantilla.nombre"
                  class="absolute inset-0 h-full w-full object-cover"
                />
                <span
                  v-else
                  class="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground"
                >
                  Sin fondo
                </span>
                <Check
                  v-if="plantillaId === plantilla.id"
                  class="absolute right-1 top-1 h-4 w-4 rounded-full bg-primary p-0.5 text-primary-foreground"
                />
              </span>
              <span
                class="block truncate bg-background px-1.5 py-1 text-[11px] font-semibold"
              >
                {{ plantilla.nombre
                }}{{ plantilla.esDefault ? " · pred." : "" }}
              </span>
            </button>
          </div>
        </div>

        <div class="grid gap-2 border border-border p-3">
          <p class="text-sm font-bold">Logo de esta emisión</p>
          <p class="text-xs text-muted-foreground">
            Elige un logo sugerido o sube uno nuevo; los que subas quedan en la
            galería para reutilizarlos.
          </p>

          <template v-if="logosSugeridos.length">
            <p class="text-xs font-bold">Logos sugeridos</p>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="logo in logosSugeridos"
                :key="logo.id"
                class="overflow-hidden border border-border"
                :class="
                  logoEstaSeleccionado(logo.logoUrl)
                    ? 'border-primary ring-1 ring-primary'
                    : ''
                "
              >
                <button
                  type="button"
                  class="flex aspect-square w-full items-center justify-center bg-white p-1.5"
                  :disabled="emitiendo"
                  :title="logo.nombre"
                  @click="elegirLogoSugerido(logo)"
                >
                  <img
                    :src="urlMostrada(logo.logoUrl) || logo.logoUrl"
                    :alt="logo.nombre"
                    class="max-h-full max-w-full object-contain"
                  />
                </button>
                <div class="flex items-center gap-0.5 px-1 py-0.5">
                  <span
                    class="min-w-0 flex-1 truncate text-[9px] font-semibold leading-tight"
                  >
                    {{ logo.nombre }}
                  </span>
                  <button
                    v-if="logo.origen === 'galeria'"
                    type="button"
                    class="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
                    :disabled="emitiendo || eliminandoLogoId === logo.id"
                    title="Quitar de sugeridos"
                    @click="eliminarLogoGaleria(logo)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </template>
          <p
            v-else
            class="border border-dashed border-border p-2 text-[11px] text-muted-foreground"
          >
            Aún no hay logos guardados. Sube uno y quedará en sugeridos.
          </p>

          <div
            class="relative my-0.5 text-center text-[10px] font-bold uppercase text-muted-foreground"
          >
            o
          </div>

          <label
            class="inline-flex cursor-pointer items-center justify-center border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
            :class="
              emitiendo || subiendoLogo ? 'pointer-events-none opacity-50' : ''
            "
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              :disabled="emitiendo || subiendoLogo"
              @change="subirLogoTemporal"
            />
            {{
              subiendoLogo
                ? "Subiendo…"
                : logoOverridePreview
                  ? "Subir otro logo"
                  : "Subir logo nuevo"
            }}
          </label>

          <Button
            v-if="logoOverridePreview"
            type="button"
            variant="outline"
            size="sm"
            :disabled="emitiendo"
            @click="quitarLogoTemporal"
          >
            Usar logo del diseño (sin override)
          </Button>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <div>
            <p class="text-sm font-bold">Firma temporal (1)</p>
            <p class="text-xs text-muted-foreground">
              Solo para esta emisión: nombre de quien firma e imagen de la firma
              (PNG con fondo transparente recomendado).
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="em-firmante">Nombre de quien firma</Label>
            <Input
              id="em-firmante"
              v-model="firmanteNombre"
              placeholder="Ej. Dra. María López"
              :disabled="emitiendo"
            />
          </div>

          <div class="grid gap-2">
            <Label for="em-cargo-firma">Cargo (opcional)</Label>
            <Input
              id="em-cargo-firma"
              v-model="firmanteCargo"
              placeholder="Ej. Directora académica"
              :disabled="emitiendo"
            />
          </div>

          <div
            v-if="firmaImagenPreview"
            class="flex items-center gap-3 border border-border bg-white p-2"
          >
            <img
              :src="firmaImagenPreview"
              alt="Firma"
              class="h-14 max-w-[140px] object-contain"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="emitiendo"
              @click="quitarFirmaImagen"
            >
              Quitar
            </Button>
          </div>

          <label
            class="inline-flex cursor-pointer items-center justify-center border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
            :class="
              emitiendo || subiendoFirma ? 'pointer-events-none opacity-50' : ''
            "
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              :disabled="emitiendo || subiendoFirma"
              @change="subirFirmaImagen"
            />
            {{
              subiendoFirma
                ? "Subiendo firma…"
                : firmaImagenPreview
                  ? "Cambiar imagen de firma"
                  : "Subir imagen de firma"
            }}
          </label>
        </div>

        <Button
          class="mt-2 h-12 w-full"
          :disabled="!puedeEmitir"
          @click="emitir"
        >
          <Loader2 v-if="emitiendo" class="h-4 w-4 animate-spin" />
          <Award v-else class="h-4 w-4" />
          {{ emitiendo ? "Emitiendo…" : "Emitir certificado" }}
        </Button>
      </aside>

      <div class="min-w-0 border border-border bg-card p-4 sm:p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
              Vista previa
            </p>
            <p class="text-xs text-muted-foreground">
              Así se verá al emitir (diseño + tus datos)
            </p>
          </div>
          <div
            class="flex items-center gap-3 border border-border bg-muted/30 px-3 py-2"
          >
            <Move class="h-4 w-4 text-primary" />
            <div class="min-w-0">
              <p class="text-sm font-bold leading-tight">Ajustar posición</p>
              <p class="text-[11px] text-muted-foreground">
                {{
                  ajustarPosicion
                    ? "Arrastra los elementos"
                    : "Elementos fijos"
                }}
              </p>
            </div>
            <ToggleSwitch v-model="ajustarPosicion" :disabled="emitiendo" />
          </div>
        </div>
        <VistaPreviaPlantillaCertificado
          :plantilla="plantillaParaPreview"
          :nombre-titular="titularNombre || 'Nombre del titular'"
          :titulo-curso="motivoTitulo || 'Motivo o título del certificado'"
          :detalle-texto="detalle"
          :fecha-texto="fechaHoy"
          :codigo-texto="'TA-M-PREVIEW'"
          :logo-url="logoPreviewUrl"
          :firmas="firmasPreview"
          :cantidad-firmas="1"
          :editable="ajustarPosicion"
          :cargando="cargando"
          @mover-campo="moverCampo"
          @mover-firma="moverFirma"
          @redimensionar-campo="redimensionarCampo"
          @redimensionar-firma="redimensionarFirma"
        />
      </div>
    </div>
  </section>
</template>
