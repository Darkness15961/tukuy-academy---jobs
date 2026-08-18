<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-vue-next";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, ref, watch } from "vue";

import {
  portalBannersService,
  type BannerPortalAlumno,
  type CatalogoTipoBannerPortal,
  type ImagenBannerPortal,
} from "@/api/services/portal-banners.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import CapaFiltroBanner from "@/components/shared/CapaFiltroBanner.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { storageAcademia, urlVisualizableMedia } from "@/lib/storage-academia";
import {
  ESTILOS_FILTRO_BANNER,
  FILTRO_BANNER_DEFAULT,
  FILTRO_BANNER_NINGUNO,
  normalizarFiltroBanner,
} from "@/lib/filtro-banner";
import { toast } from "@/lib/toast";

type ModoVista = "inicio" | "asistente";
type IdPaso =
  | "tipo"
  | "textos"
  | "accion"
  | "vigencia"
  | "guardar";

type DefPaso = {
  id: IdPaso;
  numero: number;
  titulo: string;
  ayuda: string;
};

const { contextoActivo } = useContextoSesion();
const instalacionId = computed(
  () => contextoActivo.value?.organizacionId?.trim() || "",
);

/** Pack base ya sembrado en S3: anuncios-portal/{org}/catalogo/{slug}.jpg */
const PACK_BASE_ANUNCIOS = [
  { slug: "gestion-obra", nombre: "Gestión de obra" },
  { slug: "empleabilidad", nombre: "Empleabilidad" },
  { slug: "operaciones", nombre: "Operaciones" },
  { slug: "oportunidades", nombre: "Oportunidades" },
  { slug: "datos-ia", nombre: "Datos e IA" },
  { slug: "certificacion", nombre: "Certificación" },
] as const;

const MAX_BYTES_IMAGEN_ANUNCIO = 1024 * 1024;

const cargando = ref(true);
const guardando = ref(false);
const subiendo = ref(false);
const modo = ref<ModoVista>("inicio");
const pasoIndex = ref(0);
const banners = ref<BannerPortalAlumno[]>([]);
const tipos = ref<CatalogoTipoBannerPortal[]>([]);
const imagenesDisponibles = ref<ImagenBannerPortal[]>([]);
const imagenesPack = ref<ImagenBannerPortal[]>([]);
const ultimoFiltro = ref(FILTRO_BANNER_DEFAULT);
const editando = ref<BannerPortalAlumno | null>(null);
const previewUrls = ref<Record<string, string>>({});
const inputImagen = ref<HTMLInputElement | null>(null);

function objectKeyPack(instalacion: string, slug: string) {
  return `anuncios-portal/${instalacion}/catalogo/${slug}.jpg`;
}

function slugDesdeObjectKey(clave: string): string | null {
  const m = clave.match(/\/catalogo\/([^/]+)\.(jpe?g|png|webp|gif)$/i);
  return m?.[1] ?? null;
}

function previewLocalPack(clave: string): string | null {
  const slug = slugDesdeObjectKey(clave);
  if (!slug) return null;
  if (!PACK_BASE_ANUNCIOS.some((p) => p.slug === slug)) return null;
  return `/img/anuncios-portal/${slug}.jpg`;
}

function imagenesPackBase(instalacion: string): ImagenBannerPortal[] {
  return PACK_BASE_ANUNCIOS.map((p) => ({
    id: `pack-${p.slug}`,
    instalacionId: instalacion,
    imagenUrl: objectKeyPack(instalacion, p.slug),
    nombre: p.nombre,
  }));
}

const formulario = ref({
  id: "" as string,
  tipo: "" as string,
  activo: true,
  etiqueta: "",
  titulo: "",
  subtitulo: "",
  imagenUrl: "",
  filtroImagen: FILTRO_BANNER_DEFAULT,
  badgesTexto: "",
  ctaTexto: "",
  ctaUrl: "",
  cursoRef: "",
  vigenciaDesde: "",
  vigenciaHasta: "",
});

const puedeAgregar = computed(() => banners.value.length < 8);
const esEdicion = computed(() => Boolean(editando.value?.id || formulario.value.id));
const tipoSeleccionado = computed(
  () => tipos.value.find((t) => t.codigo === formulario.value.tipo) ?? null,
);
const esquema = computed(() => tipoSeleccionado.value?.esquemaCampos ?? {});

function campo(clave: string) {
  return esquema.value[clave];
}
function campoVisible(clave: string) {
  return campo(clave)?.visible === true;
}
function campoRequerido(clave: string) {
  return campo(clave)?.requerido === true;
}
function campoLabel(clave: string, fallback: string) {
  return campo(clave)?.label || fallback;
}
function campoPlaceholder(clave: string, fallback = "") {
  return campo(clave)?.placeholder || fallback;
}

function aplicarDefaultsDeTipo(codigo: string) {
  const tipo = tipos.value.find((t) => t.codigo === codigo);
  if (!tipo) return;
  const ctaDefault = tipo.esquemaCampos.ctaTexto?.default;
  if (!tipo.esquemaCampos.badges?.visible) formulario.value.badgesTexto = "";
  if (!tipo.esquemaCampos.ctaUrl?.visible) formulario.value.ctaUrl = "";
  if (!tipo.esquemaCampos.ctaTexto?.visible) {
    formulario.value.ctaTexto = "";
  } else if (ctaDefault) {
    formulario.value.ctaTexto = ctaDefault;
  }
  if (!tipo.esquemaCampos.cursoRef?.visible) formulario.value.cursoRef = "";
  if (!tipo.esquemaCampos.vigenciaDesde?.visible) {
    formulario.value.vigenciaDesde = "";
  }
  if (!tipo.esquemaCampos.vigenciaHasta?.visible) {
    formulario.value.vigenciaHasta = "";
  }
}

/** Pasos dinámicos: tras elegir tipo, solo aparecen los que el esquema usa. */
const pasos = computed((): DefPaso[] => {
  const lista: Omit<DefPaso, "numero">[] = [
    {
      id: "tipo",
      titulo: "Tipo e imagen",
      ayuda:
        "Elige el tipo de anuncio y una imagen de tu galería. Los pasos siguientes cambian según el tipo.",
    },
  ];

  if (formulario.value.tipo) {
    if (
      campoVisible("etiqueta") ||
      campoVisible("titulo") ||
      campoVisible("subtitulo") ||
      campoVisible("badges")
    ) {
      lista.push({
        id: "textos",
        titulo: "Textos",
        ayuda: "Mensaje que aparece sobre la imagen en el portal del alumno.",
      });
    }
    if (
      campoVisible("ctaTexto") ||
      campoVisible("ctaUrl") ||
      campoVisible("cursoRef")
    ) {
      lista.push({
        id: "accion",
        titulo: "Acción",
        ayuda: "Botón o enlace según el tipo de anuncio.",
      });
    }
    if (campoVisible("vigenciaDesde") || campoVisible("vigenciaHasta")) {
      lista.push({
        id: "vigencia",
        titulo: "Vigencia",
        ayuda: "Desde cuándo y hasta cuándo se muestra este anuncio.",
      });
    }
    lista.push({
      id: "guardar",
      titulo: "Revisar y guardar",
      ayuda: "Confirma la vista previa y publica el anuncio en el portal.",
    });
  }

  return lista.map((p, i) => ({ ...p, numero: i + 1 }));
});

const pasoActual = computed(() => pasos.value[pasoIndex.value] ?? pasos.value[0]!);
const esUltimoPaso = computed(() => pasoActual.value?.id === "guardar");
const progresoPct = computed(() =>
  pasos.value.length
    ? ((pasoIndex.value + 1) / pasos.value.length) * 100
    : 0,
);

watch(
  pasos,
  (lista) => {
    if (pasoIndex.value >= lista.length) {
      pasoIndex.value = Math.max(lista.length - 1, 0);
    }
  },
  { deep: true },
);

async function resolverPreview(clave: string) {
  if (!clave.trim()) return "";
  if (
    clave.startsWith("http") ||
    clave.startsWith("data:") ||
    clave.startsWith("blob:")
  ) {
    return clave;
  }
  if (previewUrls.value[clave]) return previewUrls.value[clave]!;
  const local = previewLocalPack(clave);
  if (local) {
    previewUrls.value = { ...previewUrls.value, [clave]: local };
  }
  try {
    const url = await urlVisualizableMedia(clave, local || "");
    if (url) {
      previewUrls.value = { ...previewUrls.value, [clave]: url };
      return url;
    }
  } catch (err) {
    console.warn("[anuncios] firma preview:", clave, err);
  }
  return previewUrls.value[clave] || local || "";
}

async function cargarTipos() {
  tipos.value = await portalBannersService.listarTipos();
}

async function cargarImagenesDisponibles() {
  const id = instalacionId.value;
  if (!id) {
    imagenesDisponibles.value = [];
    imagenesPack.value = [];
    return;
  }

  const pack = imagenesPackBase(id);
  imagenesPack.value = pack;
  await Promise.all(pack.map((img) => resolverPreview(img.imagenUrl).catch(() => "")));

  let propias: ImagenBannerPortal[] = [];
  try {
    propias = await portalBannersService.listarImagenes(id);
  } catch (causa) {
    console.warn("[anuncios] listar galería:", causa);
  }

  imagenesDisponibles.value = propias.filter((img) => img.imagenUrl.trim());
  await Promise.all(
    imagenesDisponibles.value.map(async (img) => {
      try {
        await resolverPreview(img.imagenUrl);
      } catch (err) {
        console.warn("[anuncios] preview imagen:", img.imagenUrl, err);
      }
    }),
  );
}

async function cargar() {
  const id = instalacionId.value;
  if (!id) {
    banners.value = [];
    imagenesDisponibles.value = [];
    imagenesPack.value = [];
    cargando.value = false;
    return;
  }
  cargando.value = true;
  try {
    await cargarTipos();
    banners.value = await portalBannersService.listarOrg(id);
    await Promise.all(
      banners.value.map(async (b) => {
        if (b.imagenUrl) await resolverPreview(b.imagenUrl);
      }),
    );
    await cargarImagenesDisponibles();
  } catch (causa) {
    toast.error("No se pudieron cargar los anuncios", {
      description: causa instanceof Error ? causa.message : undefined,
    });
    banners.value = [];
  } finally {
    cargando.value = false;
  }
}

function formularioVacio() {
  return {
    id: "",
    tipo: "",
    activo: true,
    etiqueta: "",
    titulo: "",
    subtitulo: "",
    imagenUrl: "",
    filtroImagen: FILTRO_BANNER_DEFAULT,
    badgesTexto: "",
    ctaTexto: "",
    ctaUrl: "",
    cursoRef: "",
    vigenciaDesde: "",
    vigenciaHasta: "",
  };
}

function salirAsistente() {
  modo.value = "inicio";
  pasoIndex.value = 0;
  editando.value = null;
  formulario.value = formularioVacio();
}

function iniciarNuevo() {
  if (!puedeAgregar.value) {
    toast.warning("Máximo 8 anuncios en el portal.");
    return;
  }
  if (!tipos.value.length) {
    toast.error("No hay tipos de anuncio disponibles. Contacta a soporte.");
    return;
  }
  editando.value = null;
  formulario.value = formularioVacio();
  pasoIndex.value = 0;
  modo.value = "asistente";
}

function aInputDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function deInputDatetimeLocal(valor: string) {
  if (!valor.trim()) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function editar(banner: BannerPortalAlumno) {
  editando.value = banner;
  formulario.value = {
    id: banner.id,
    tipo: banner.tipo,
    activo: banner.activo,
    etiqueta: banner.etiqueta,
    titulo: banner.titulo,
    subtitulo: banner.subtitulo ?? "",
    imagenUrl: banner.imagenUrl,
    filtroImagen: normalizarFiltroBanner(banner.filtroImagen),
    badgesTexto: (banner.badges ?? []).join(", "),
    ctaTexto: banner.ctaTexto || "",
    ctaUrl: banner.ctaUrl ?? "",
    cursoRef: banner.cursoRef ?? "",
    vigenciaDesde: aInputDatetimeLocal(banner.vigenciaDesde),
    vigenciaHasta: aInputDatetimeLocal(banner.vigenciaHasta),
  };
  void resolverPreview(banner.imagenUrl);
  if (formulario.value.filtroImagen !== FILTRO_BANNER_NINGUNO) {
    ultimoFiltro.value = formulario.value.filtroImagen;
  }
  pasoIndex.value = 0;
  modo.value = "asistente";
}

function elegirTipo(codigo: string) {
  const prev = formulario.value.tipo;
  formulario.value.tipo = codigo;
  if (prev !== codigo) aplicarDefaultsDeTipo(codigo);
}

function valorCampo(clave: string): string {
  if (clave === "etiqueta") return formulario.value.etiqueta;
  if (clave === "titulo") return formulario.value.titulo;
  if (clave === "subtitulo") return formulario.value.subtitulo;
  if (clave === "ctaTexto") return formulario.value.ctaTexto;
  if (clave === "ctaUrl") return formulario.value.ctaUrl;
  if (clave === "cursoRef") return formulario.value.cursoRef;
  if (clave === "vigenciaDesde") return formulario.value.vigenciaDesde;
  if (clave === "vigenciaHasta") return formulario.value.vigenciaHasta;
  if (clave === "imagen") return formulario.value.imagenUrl;
  if (clave === "badges") return formulario.value.badgesTexto;
  return "";
}

function validarCampos(claves: string[]): string | null {
  for (const clave of claves) {
    if (!campoVisible(clave)) continue;
    if (campoRequerido(clave) && !valorCampo(clave).trim()) {
      return `${campoLabel(clave, clave)} es obligatorio.`;
    }
  }
  return null;
}

function validarPasoActual(): string | null {
  const id = pasoActual.value?.id;
  if (id === "tipo") {
    if (!formulario.value.tipo.trim()) return "Elige un tipo de anuncio.";
    if (!formulario.value.imagenUrl.trim()) {
      return "Elige una imagen de la galería o sube una nueva.";
    }
    return null;
  }
  if (id === "textos") {
    return validarCampos(["etiqueta", "titulo", "subtitulo", "badges"]);
  }
  if (id === "accion") {
    return validarCampos(["ctaTexto", "ctaUrl", "cursoRef"]);
  }
  if (id === "vigencia") {
    return validarCampos(["vigenciaDesde", "vigenciaHasta"]);
  }
  if (id === "guardar") {
    return (
      validarCampos([
        "etiqueta",
        "titulo",
        "subtitulo",
        "ctaTexto",
        "ctaUrl",
        "cursoRef",
        "vigenciaDesde",
        "vigenciaHasta",
        "imagen",
      ]) ||
      (!formulario.value.imagenUrl.trim()
        ? "Falta la imagen del anuncio."
        : null)
    );
  }
  return null;
}

function irAnterior() {
  if (pasoIndex.value <= 0) return;
  pasoIndex.value -= 1;
}

function irSiguiente() {
  const error = validarPasoActual();
  if (error) {
    toast.error(error);
    return;
  }
  if (pasoIndex.value < pasos.value.length - 1) {
    pasoIndex.value += 1;
  }
}

async function guardar() {
  const id = instalacionId.value;
  if (!id) {
    toast.error("No hay organización activa en el contexto.");
    return;
  }
  const error = validarPasoActual();
  if (error) {
    toast.error(error);
    return;
  }
  guardando.value = true;
  try {
    const badges = campoVisible("badges")
      ? formulario.value.badgesTexto
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];
    await portalBannersService.upsert(id, {
      id: formulario.value.id || undefined,
      orden: editando.value?.orden ?? banners.value.length,
      activo: formulario.value.activo,
      tipo: formulario.value.tipo.trim(),
      etiqueta: campoVisible("etiqueta")
        ? formulario.value.etiqueta.trim()
        : "",
      titulo: formulario.value.titulo.trim(),
      subtitulo: campoVisible("subtitulo")
        ? formulario.value.subtitulo.trim() || null
        : null,
      imagenUrl: formulario.value.imagenUrl.trim(),
      filtroImagen: normalizarFiltroBanner(formulario.value.filtroImagen),
      badges,
      ctaTexto: campoVisible("ctaTexto")
        ? formulario.value.ctaTexto.trim() || "Ver más"
        : "",
      ctaUrl: campoVisible("ctaUrl")
        ? formulario.value.ctaUrl.trim() || null
        : null,
      cursoRef: campoVisible("cursoRef")
        ? formulario.value.cursoRef.trim() || null
        : null,
      vigenciaDesde: campoVisible("vigenciaDesde")
        ? deInputDatetimeLocal(formulario.value.vigenciaDesde)
        : null,
      vigenciaHasta: campoVisible("vigenciaHasta")
        ? deInputDatetimeLocal(formulario.value.vigenciaHasta)
        : null,
    });
    toast.success(esEdicion.value ? "Anuncio actualizado." : "Anuncio creado.");
    await cargar();
    salirAsistente();
  } catch (causa) {
    toast.error("No se pudo guardar", {
      description: causa instanceof Error ? causa.message : undefined,
    });
  } finally {
    guardando.value = false;
  }
}

async function eliminar(banner: BannerPortalAlumno) {
  const id = instalacionId.value;
  if (!id) return;
  if (!confirm(`¿Eliminar «${banner.titulo}»?`)) return;
  try {
    await portalBannersService.eliminar(id, banner.id);
    toast.success("Anuncio eliminado.");
    if (editando.value?.id === banner.id) salirAsistente();
    await cargar();
  } catch (causa) {
    toast.error("No se pudo eliminar", {
      description: causa instanceof Error ? causa.message : undefined,
    });
  }
}

async function mover(banner: BannerPortalAlumno, delta: number) {
  const id = instalacionId.value;
  if (!id) return;
  const ordenados = [...banners.value].sort((a, b) => a.orden - b.orden);
  const idx = ordenados.findIndex((b) => b.id === banner.id);
  const destino = idx + delta;
  if (idx < 0 || destino < 0 || destino >= ordenados.length) return;
  const copia = [...ordenados];
  const [item] = copia.splice(idx, 1);
  if (!item) return;
  copia.splice(destino, 0, item);
  banners.value = await portalBannersService.reordenar(
    id,
    copia.map((b) => b.id),
  );
}

async function onElegirImagen(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0];
  input.value = "";
  if (!archivo) return;
  if (!archivo.type.startsWith("image/")) {
    toast.error("Solo imágenes (JPG/PNG/WebP).");
    return;
  }
  if (archivo.size > MAX_BYTES_IMAGEN_ANUNCIO) {
    toast.error("La imagen no puede pesar más de 1 MB.");
    return;
  }
  subiendo.value = true;
  try {
    const subida = await storageAcademia.subirAnuncioPortal(
      archivo,
      instalacionId.value,
    );
    const objectKey = subida.objectKey || subida.publicUrl || "";
    formulario.value.imagenUrl = objectKey;
    if (objectKey) {
      const preview = subida.publicUrl || URL.createObjectURL(archivo);
      previewUrls.value = { ...previewUrls.value, [objectKey]: preview };
      try {
        const registrada = await portalBannersService.registrarImagen(
          instalacionId.value,
          objectKey,
          archivo.name.replace(/\.[^.]+$/, "") || "Imagen",
        );
        const ya = imagenesDisponibles.value.some(
          (i) => i.imagenUrl === registrada.imagenUrl,
        );
        if (!ya) {
          imagenesDisponibles.value = [
            registrada,
            ...imagenesDisponibles.value,
          ];
        }
      } catch {
        /* ignore */
      }
    }
    toast.success("Imagen subida.");
  } catch (causa) {
    toast.error("No se pudo subir la imagen", {
      description: causa instanceof Error ? causa.message : undefined,
    });
  } finally {
    subiendo.value = false;
  }
}

async function usarImagenDisponible(img: ImagenBannerPortal) {
  formulario.value.imagenUrl = img.imagenUrl;
  await resolverPreview(img.imagenUrl);
}

const filtroActivo = computed(
  () => formulario.value.filtroImagen !== FILTRO_BANNER_NINGUNO,
);

function alternarFiltro(activo: boolean | number | string) {
  const encendido = activo === true || activo === 1 || activo === "true";
  if (activo) {
    formulario.value.filtroImagen =
      ultimoFiltro.value === FILTRO_BANNER_NINGUNO
        ? FILTRO_BANNER_DEFAULT
        : ultimoFiltro.value;
    return;
  }
  if (formulario.value.filtroImagen !== FILTRO_BANNER_NINGUNO) {
    ultimoFiltro.value = formulario.value.filtroImagen;
  }
  formulario.value.filtroImagen = FILTRO_BANNER_NINGUNO;
}

function elegirFiltro(id: string) {
  formulario.value.filtroImagen = normalizarFiltroBanner(id);
  if (formulario.value.filtroImagen !== FILTRO_BANNER_NINGUNO) {
    ultimoFiltro.value = formulario.value.filtroImagen;
  }
}

watch(instalacionId, () => {
  salirAsistente();
  void cargar();
});

onMounted(() => {
  void cargar();
});
</script>

<template>
  <div class="space-y-6 p-5 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <TituloConAyuda
        :titulo="
          modo === 'asistente' ? 'Asistente de anuncio' : 'Anuncios del portal'
        "
        ayuda="Configura el carrusel del portal alumno: elige el tipo y completa solo los pasos que correspondan."
      />
      <div class="flex flex-wrap gap-2">
        <template v-if="modo === 'inicio'">
          <Button type="button" variant="outline" @click="cargar">
            <RefreshCw class="h-4 w-4" />
            Recargar
          </Button>
          <Button
            type="button"
            :disabled="!puedeAgregar || !instalacionId"
            @click="iniciarNuevo"
          >
            <Plus class="h-4 w-4" />
            Nuevo anuncio
          </Button>
        </template>
        <Button
          v-else
          type="button"
          variant="outline"
          @click="salirAsistente"
        >
          <X class="h-4 w-4" />
          Salir
        </Button>
      </div>
    </div>

    <!-- ========== BIBLIOTECA ========== -->
    <template v-if="modo === 'inicio'">
      <p class="text-sm text-muted-foreground">
        {{ banners.length }} / 8 anuncios · Solo los activos con imagen aparecen
        en el portal del alumno.
      </p>

      <div v-if="cargando" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton v-for="i in 3" :key="i" class="h-36 w-full" />
      </div>
      <p
        v-else-if="!instalacionId"
        class="border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
      >
        No hay organización activa en el contexto.
      </p>
      <p
        v-else-if="!banners.length"
        class="border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
      >
        Aún no hay anuncios. Crea el primero paso a paso.
      </p>
      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="banner in banners"
          :key="banner.id"
          class="border-border overflow-hidden"
        >
          <button
            type="button"
            class="block w-full text-left"
            @click="editar(banner)"
          >
            <div class="relative aspect-video bg-muted">
              <img
                v-if="previewUrls[banner.imagenUrl]"
                :src="previewUrls[banner.imagenUrl]"
                alt=""
                class="h-full w-full object-cover"
              />
              <CapaFiltroBanner :estilo="banner.filtroImagen" />
              <div class="absolute inset-x-0 bottom-0 p-3">
                <p class="text-[10px] font-bold uppercase tracking-wide text-[#F5B400]">
                  {{ banner.tipo }}
                  <span v-if="!banner.activo"> · inactivo</span>
                </p>
                <p class="truncate text-sm font-black text-white">
                  {{ banner.titulo }}
                </p>
              </div>
            </div>
          </button>
          <CardContent class="flex items-center justify-between gap-2 p-3">
            <p class="truncate text-xs text-muted-foreground">
              {{ banner.etiqueta || "Sin etiqueta" }}
            </p>
            <div class="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="mover(banner, -1)"
              >
                <ArrowUp class="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="mover(banner, 1)"
              >
                <ArrowDown class="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="eliminar(banner)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- ========== ASISTENTE ========== -->
    <template v-else>
      <div class="space-y-3">
        <div
          class="flex items-center justify-between text-xs font-bold uppercase text-muted-foreground"
        >
          <span>
            {{ esEdicion ? "Editando" : "Creando" }}
            · paso {{ pasoActual.numero }} de {{ pasos.length }}
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
        <!-- Vista previa -->
        <Card class="border-border">
          <CardContent class="space-y-3 p-5">
            <div>
              <p class="text-sm font-black">Vista previa del anuncio</p>
              <p class="text-[11px] text-muted-foreground">
                Así se verá en el carrusel del portal alumno.
              </p>
            </div>
            <div
              class="relative aspect-video overflow-hidden border border-border bg-[#07152B]"
            >
              <img
                v-if="previewUrls[formulario.imagenUrl]"
                :src="previewUrls[formulario.imagenUrl]"
                alt="Vista previa"
                class="absolute inset-0 h-full w-full object-cover"
              />
              <template v-if="previewUrls[formulario.imagenUrl]">
                <CapaFiltroBanner :estilo="formulario.filtroImagen" />
              </template>
              <p
                v-else
                class="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground"
              >
                {{
                  formulario.imagenUrl
                    ? "Cargando imagen…"
                    : "Elige tipo e imagen en el paso 1"
                }}
              </p>
              <div class="relative z-[1] flex h-full items-end p-4">
                <div class="max-w-[92%] space-y-1">
                  <p
                    v-if="formulario.etiqueta"
                    class="text-[10px] font-black uppercase tracking-[.2em] text-[#F5B400]"
                  >
                    {{ formulario.etiqueta }}
                  </p>
                  <p
                    v-if="formulario.titulo"
                    class="text-lg font-black leading-tight text-white md:text-xl"
                  >
                    {{ formulario.titulo }}
                  </p>
                  <p
                    v-if="formulario.subtitulo"
                    class="text-xs text-white/80 line-clamp-2"
                  >
                    {{ formulario.subtitulo }}
                  </p>
                  <p
                    v-if="formulario.ctaTexto && campoVisible('ctaTexto')"
                    class="pt-1 text-[11px] font-bold uppercase tracking-wide text-white"
                  >
                    {{ formulario.ctaTexto }} →
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Panel del paso -->
        <Card class="border-border">
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

            <!-- Paso: tipo + imágenes reutilizables -->
            <div v-if="pasoActual.id === 'tipo'" class="grid gap-4">
              <div class="grid gap-2">
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  Tipo
                </p>
                <button
                  v-for="t in tipos"
                  :key="t.codigo"
                  type="button"
                  class="border border-border p-3 text-left transition hover:border-primary"
                  :class="
                    formulario.tipo === t.codigo
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : ''
                  "
                  @click="elegirTipo(t.codigo)"
                >
                  <p class="text-sm font-black">{{ t.nombre }}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    {{ t.descripcion || t.codigo }}
                  </p>
                </button>
                <p
                  v-if="!tipos.length"
                  class="text-sm text-muted-foreground"
                >
                  No hay tipos cargados. Recarga o aplica las migraciones.
                </p>
              </div>

              <div class="space-y-2 border-t border-border pt-4">
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  Mi galería
                </p>
                <p class="text-[11px] text-muted-foreground">
                  Solo ves las fotos que tú subiste. Máximo 1 MB por imagen.
                </p>
                <div
                  v-if="imagenesDisponibles.length"
                  class="grid grid-cols-3 gap-1.5"
                >
                  <button
                    v-for="img in imagenesDisponibles"
                    :key="img.id || img.imagenUrl"
                    type="button"
                    class="group relative aspect-video overflow-hidden border border-border bg-muted"
                    :class="
                      formulario.imagenUrl === img.imagenUrl
                        ? 'ring-2 ring-primary'
                        : 'hover:border-primary'
                    "
                    :title="img.nombre"
                    @click="usarImagenDisponible(img)"
                  >
                    <img
                      v-if="previewUrls[img.imagenUrl]"
                      :src="previewUrls[img.imagenUrl]"
                      :alt="img.nombre"
                      class="h-full w-full object-cover"
                    />
                    <span
                      v-else
                      class="grid h-full place-items-center text-[9px] text-muted-foreground"
                    >
                      …
                    </span>
                    <span
                      class="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] text-white"
                    >
                      {{ img.nombre }}
                    </span>
                  </button>
                </div>
                <p
                  v-else
                  class="border border-dashed border-border p-4 text-center text-xs text-muted-foreground"
                >
                  Aún no hay fotos en tu galería. Sube la primera abajo.
                </p>
                <input
                  ref="inputImagen"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onElegirImagen"
                />
                <Button
                  type="button"
                  variant="outline"
                  class="w-full"
                  :disabled="subiendo || !instalacionId"
                  @click="inputImagen?.click()"
                >
                  <ImageUp class="h-4 w-4" />
                  {{ subiendo ? "Subiendo…" : "Subir a mi galería" }}
                </Button>
              </div>

              <div
                v-if="imagenesPack.length"
                class="space-y-2 border-t border-border pt-4"
              >
                <p class="text-xs font-bold uppercase text-muted-foreground">
                  Plantillas
                </p>
                <p class="text-[11px] text-muted-foreground">
                  Imágenes base de Tukuy, opcionales.
                </p>
                <div class="grid grid-cols-3 gap-1.5">
                  <button
                    v-for="img in imagenesPack"
                    :key="img.id"
                    type="button"
                    class="relative aspect-video overflow-hidden border border-border bg-muted"
                    :class="
                      formulario.imagenUrl === img.imagenUrl
                        ? 'ring-2 ring-primary'
                        : 'hover:border-primary'
                    "
                    :title="img.nombre"
                    @click="usarImagenDisponible(img)"
                  >
                    <img
                      v-if="previewUrls[img.imagenUrl]"
                      :src="previewUrls[img.imagenUrl]"
                      :alt="img.nombre"
                      class="h-full w-full object-cover"
                    />
                    <span
                      class="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] text-white"
                    >
                      {{ img.nombre }}
                    </span>
                  </button>
                </div>
              </div>

              <div class="space-y-3 border-t border-border pt-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground">
                      Filtro sobre la imagen
                    </p>
                    <p class="text-[11px] text-muted-foreground">
                      Oscurece o colorea la foto para que el texto se lea.
                    </p>
                  </div>
                  <ToggleSwitch
                    :model-value="filtroActivo"
                    @update:model-value="alternarFiltro"
                  />
                </div>
                <div
                  v-if="filtroActivo"
                  class="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
                >
                  <button
                    v-for="estilo in ESTILOS_FILTRO_BANNER.filter(
                      (item) => item.id !== FILTRO_BANNER_NINGUNO,
                    )"
                    :key="estilo.id"
                    type="button"
                    class="border border-border px-2 py-1.5 text-left text-[11px] font-semibold"
                    :class="
                      formulario.filtroImagen === estilo.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:border-primary'
                    "
                    @click="elegirFiltro(estilo.id)"
                  >
                    {{ estilo.nombre }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Paso: textos -->
            <div v-else-if="pasoActual.id === 'textos'" class="grid gap-3">
              <label
                v-if="campoVisible('etiqueta')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("etiqueta", "Etiqueta") }}
                <span
                  v-if="campoRequerido('etiqueta')"
                  class="text-destructive"
                >*</span>
                <InputText
                  v-model="formulario.etiqueta"
                  class="w-full"
                  :placeholder="campoPlaceholder('etiqueta')"
                />
              </label>
              <label
                v-if="campoVisible('titulo')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("titulo", "Título") }}
                <span
                  v-if="campoRequerido('titulo')"
                  class="text-destructive"
                >*</span>
                <InputText
                  v-model="formulario.titulo"
                  class="w-full"
                  :placeholder="campoPlaceholder('titulo')"
                />
              </label>
              <label
                v-if="campoVisible('subtitulo')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("subtitulo", "Detalle") }}
                <span
                  v-if="campoRequerido('subtitulo')"
                  class="text-destructive"
                >*</span>
                <Textarea
                  v-model="formulario.subtitulo"
                  rows="3"
                  class="w-full"
                  :placeholder="campoPlaceholder('subtitulo')"
                />
              </label>
              <label
                v-if="campoVisible('badges')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("badges", "Badges") }}
                <InputText
                  v-model="formulario.badgesTexto"
                  class="w-full"
                  :placeholder="
                    campoPlaceholder('badges', 'Separados por coma')
                  "
                />
              </label>
            </div>

            <!-- Paso: acción -->
            <div v-else-if="pasoActual.id === 'accion'" class="grid gap-3">
              <label
                v-if="campoVisible('ctaTexto')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("ctaTexto", "Texto del botón") }}
                <span
                  v-if="campoRequerido('ctaTexto')"
                  class="text-destructive"
                >*</span>
                <InputText v-model="formulario.ctaTexto" class="w-full" />
              </label>
              <label
                v-if="campoVisible('ctaUrl')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("ctaUrl", "URL del botón") }}
                <span
                  v-if="campoRequerido('ctaUrl')"
                  class="text-destructive"
                >*</span>
                <InputText
                  v-model="formulario.ctaUrl"
                  class="w-full"
                  :placeholder="campoPlaceholder('ctaUrl')"
                />
              </label>
              <label
                v-if="campoVisible('cursoRef')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("cursoRef", "ID del curso") }}
                <span
                  v-if="campoRequerido('cursoRef')"
                  class="text-destructive"
                >*</span>
                <InputText
                  v-model="formulario.cursoRef"
                  class="w-full"
                  :placeholder="campoPlaceholder('cursoRef')"
                />
              </label>
            </div>

            <!-- Paso: vigencia -->
            <div v-else-if="pasoActual.id === 'vigencia'" class="grid gap-3">
              <label
                v-if="campoVisible('vigenciaDesde')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("vigenciaDesde", "Vigente desde") }}
                <input
                  v-model="formulario.vigenciaDesde"
                  type="datetime-local"
                  class="h-10 w-full border border-border bg-background px-3 text-sm"
                />
              </label>
              <label
                v-if="campoVisible('vigenciaHasta')"
                class="grid gap-1 text-xs font-bold uppercase text-muted-foreground"
              >
                {{ campoLabel("vigenciaHasta", "Vigente hasta") }}
                <span
                  v-if="campoRequerido('vigenciaHasta')"
                  class="text-destructive"
                >*</span>
                <input
                  v-model="formulario.vigenciaHasta"
                  type="datetime-local"
                  class="h-10 w-full border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>

            <!-- Paso: guardar -->
            <div v-else-if="pasoActual.id === 'guardar'" class="grid gap-3">
              <div
                class="flex items-center justify-between border border-border p-3"
              >
                <span class="text-sm font-bold">Visible en el portal</span>
                <ToggleSwitch v-model="formulario.activo" />
              </div>
              <ul class="space-y-1 text-sm text-muted-foreground">
                <li>
                  <span class="font-bold text-foreground">Tipo:</span>
                  {{ tipoSeleccionado?.nombre || formulario.tipo }}
                </li>
                <li>
                  <span class="font-bold text-foreground">Título:</span>
                  {{ formulario.titulo || "—" }}
                </li>
                <li v-if="campoVisible('ctaTexto')">
                  <span class="font-bold text-foreground">Botón:</span>
                  {{ formulario.ctaTexto || "—" }}
                </li>
              </ul>
              <Button
                type="button"
                class="w-full"
                :disabled="guardando || !instalacionId"
                @click="guardar"
              >
                {{
                  guardando
                    ? "Guardando…"
                    : esEdicion
                      ? "Guardar cambios"
                      : "Guardar anuncio"
                }}
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
    </template>
  </div>
</template>
