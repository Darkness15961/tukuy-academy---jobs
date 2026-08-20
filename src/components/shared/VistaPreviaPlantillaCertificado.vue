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
    /** Título real del curso para el campo dinámico. */
    tituloCurso?: string;
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
  }>(),
  {
    tituloCurso: "",
    firmas: () => [],
    logoUrl: null,
    cargando: false,
    compacto: false,
    cantidadFirmas: null,
    mostrarSelectorFirmas: false,
  },
);

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
  return layoutDeModelo(p.layout, modelo);
});

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
  if (CAMPOS_CERTIFICADO_DINAMICOS.has(clave)) {
    const ejemplos = textosEjemploVistaPreviaCertificado();
    if (clave === "curso") {
      return (
        props.tituloCurso.trim() ||
        ejemplos.curso ||
        TEXTOS_CAMPO_CERTIFICADO_DEFAULT.curso
      );
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
        class="relative aspect-[297/210] w-full overflow-hidden bg-[#f8fafc]"
        style="container-type: size"
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

        <div
          v-for="meta in camposVisibles"
          :key="meta.clave"
          class="pointer-events-none absolute overflow-hidden"
          :style="estiloCampo(meta, layoutActivo!.campos[meta.clave])"
        >
          <span
            v-if="meta.tipo === 'texto'"
            class="block w-full drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]"
            style="font-family: Georgia, 'Times New Roman', serif"
          >
            {{ textoCampo(meta.clave, layoutActivo!.campos[meta.clave]) }}
          </span>
          <span
            v-else-if="meta.tipo === 'logo'"
            class="flex h-full w-full items-center justify-center border border-dashed border-slate-400/60 bg-white/70"
          >
            <img
              v-if="plantilla.usarLogoEntidad && logoUrl"
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
        </div>

        <div
          v-for="(firma, indice) in firmantesVisibles"
          :key="firma.id"
          class="pointer-events-none absolute"
          :style="estiloFirma(firma)"
        >
          <span class="flex w-full flex-col gap-0.5">
            <img
              v-if="datosFirma(indice, firma).imagen"
              :src="datosFirma(indice, firma).imagen"
              alt=""
              class="mb-0.5 mx-auto h-[1.6em] max-w-full object-contain"
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
        </div>
      </div>
    </div>

    <p
      v-if="plantilla"
      class="text-center text-xs text-muted-foreground"
    >
      <template v-if="mostrarSelectorFirmas">
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
