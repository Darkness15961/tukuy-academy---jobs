<script setup lang="ts">
import {
  Award,
  Ban,
  Download,
  Eye,
  FileDown,
  FilterX,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { organizacionService } from "@/api/services/organizacion.service";
import { apiConfig } from "@/api/config";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { toast } from "@/lib/toast";
import type {
  CertificadoEmitidoDocente,
  CertificadoPendienteDocente,
} from "@/portal-docente/types/docente.types";

const { contextoActivo, funcionesEntidadActiva, tienePermiso } = useContextoSesion();
const router = useRouter();

const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo,
);

const cargando = ref(true);
const descargandoId = ref("");
const emitiendoId = ref("");
const firmandoId = ref("");
const revocandoId = ref("");
const emitidos = ref<CertificadoEmitidoDocente[]>([]);
const pendientes = ref<CertificadoPendienteDocente[]>([]);
const pendientesFirma = ref<
  Array<{
    firmaId: string;
    certificadoId: string;
    nombre: string;
    curso: string;
    codigoVerificacion?: string;
  }>
>([]);
const mensaje = ref("");
const error = ref("");
const busqueda = ref("");
const cursoFiltro = ref("TODOS");
const vistaFiltro = ref<"AMBOS" | "EMITIDOS" | "PENDIENTES">("AMBOS");
const notaFiltro = ref<"TODAS" | "LISTOS" | "POR_MEJORAR">("TODAS");

const opcionesVista = [
  { etiqueta: "Ambos", valor: "AMBOS" as const },
  { etiqueta: "Emitidos", valor: "EMITIDOS" as const },
  { etiqueta: "Pendientes", valor: "PENDIENTES" as const },
];

const opcionesNotas = [
  { etiqueta: "Todas las notas", valor: "TODAS" as const },
  { etiqueta: "Listos (≥ 14)", valor: "LISTOS" as const },
  { etiqueta: "Por refuerzo (< 14)", valor: "POR_MEJORAR" as const },
];

const opcionesCursos = computed(() => {
  const cursos = new Set<string>([
    ...emitidos.value.map((item) => item.curso),
    ...pendientes.value.map((item) => item.curso),
  ]);
  return [
    { etiqueta: "Todos los cursos", valor: "TODOS" },
    ...[...cursos].sort().map((curso) => ({ etiqueta: curso, valor: curso })),
  ];
});

const hayFiltros = computed(
  () =>
    Boolean(busqueda.value.trim()) ||
    cursoFiltro.value !== "TODOS" ||
    vistaFiltro.value !== "AMBOS" ||
    notaFiltro.value !== "TODAS",
);

const cantidadFiltrosActivos = computed(() => {
  let n = 0;
  if (busqueda.value.trim()) n += 1;
  if (cursoFiltro.value !== "TODOS") n += 1;
  if (vistaFiltro.value !== "AMBOS") n += 1;
  if (notaFiltro.value !== "TODAS") n += 1;
  return n;
});

function coincideBusqueda(termino: string, valores: string[]) {
  return valores.some((valor) => valor.toLowerCase().includes(termino));
}

const emitidosVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return emitidos.value.filter((item) => {
    const coincideCurso =
      cursoFiltro.value === "TODOS" || item.curso === cursoFiltro.value;
    const coincideTexto =
      !termino ||
      coincideBusqueda(termino, [item.nombre, item.curso, item.id]);
    return coincideCurso && coincideTexto;
  });
});

const pendientesVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return pendientes.value.filter((item) => {
    const coincideCurso =
      cursoFiltro.value === "TODOS" || item.curso === cursoFiltro.value;
    const coincideTexto =
      !termino ||
      coincideBusqueda(termino, [item.nombre, item.curso, item.id]);
    const coincideNota =
      notaFiltro.value === "TODAS" ||
      (notaFiltro.value === "LISTOS" && item.nota >= 14) ||
      (notaFiltro.value === "POR_MEJORAR" && item.nota < 14);
    return coincideCurso && coincideTexto && coincideNota;
  });
});

const mostrarPendientes = computed(
  () => vistaFiltro.value === "AMBOS" || vistaFiltro.value === "PENDIENTES",
);
const mostrarEmitidos = computed(
  () => vistaFiltro.value === "AMBOS" || vistaFiltro.value === "EMITIDOS",
);

const tasaEmision = computed(() => {
  const total = emitidosVisibles.value.length + pendientesVisibles.value.length;
  return total
    ? Math.round((emitidosVisibles.value.length / total) * 100)
    : 0;
});

const indicadores = computed(() => [
  {
    etiqueta: "Emitidos",
    valor: emitidosVisibles.value.length,
    acento: "primary" as const,
  },
  {
    etiqueta: "Pendientes de emisión",
    valor: pendientesVisibles.value.length,
    acento: "accent" as const,
  },
  {
    etiqueta: "Tasa de emisión",
    valor: `${tasaEmision.value}%`,
    acento: "accent" as const,
  },
]);

onMounted(async () => {
  try {
    const [listaEmitidos, listaPendientes, listaFirmas] = await Promise.all([
      organizacionService.certificados.listar(),
      organizacionService.certificadosPendientes.listar(),
      apiConfig.secundariaCursos
        ? organizacionService.listarPendientesFirma()
        : Promise.resolve([]),
    ]);
    emitidos.value = listaEmitidos;
    pendientes.value = listaPendientes;
    pendientesFirma.value = listaFirmas;
  } finally {
    cargando.value = false;
  }
});

function limpiarFiltros() {
  busqueda.value = "";
  cursoFiltro.value = "TODOS";
  vistaFiltro.value = "AMBOS";
  notaFiltro.value = "TODAS";
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

async function emitir(pendienteId: string) {
  if (!tienePermiso("certificados.emitir")) {
    error.value = "Tu perfil puede consultar o firmar certificados, pero no emitirlos.";
    return;
  }
  const pendiente = pendientes.value.find((item) => item.id === pendienteId);
  if (!pendiente || pendiente.nota < 14) return;
  error.value = "";
  emitiendoId.value = pendienteId;
  try {
    const emitido = await organizacionService.emitirCertificado(pendienteId);
    emitidos.value.unshift(emitido);
    pendientes.value = pendientes.value.filter((item) => item.id !== pendienteId);
    if (apiConfig.secundariaCursos) {
      pendientesFirma.value = await organizacionService.listarPendientesFirma();
    }
    const requiereFirma = emitido.requiereFirmaInstitucional === true;
    toast.success(requiereFirma
      ? "Certificado preparado. Falta la firma institucional para publicarlo."
      : "Certificado emitido y enviado al estudiante.");
    setTimeout(() => {
          }, 3500);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo emitir el certificado.";
  } finally {
    emitiendoId.value = "";
  }
}

async function firmar(item: {
  firmaId: string;
  certificadoId: string;
  nombre: string;
  curso: string;
}) {
  if (
    !tienePermiso("certificados.firmar") &&
    !tienePermiso("certificados.emitir")
  ) {
    error.value = "Tu perfil no puede firmar certificados.";
    return;
  }
  firmandoId.value = item.firmaId;
  error.value = "";
  try {
    await organizacionService.firmarCertificado(
      item.certificadoId,
      item.firmaId,
    );
    pendientesFirma.value = pendientesFirma.value.filter(
      (fila) => fila.firmaId !== item.firmaId,
    );
    toast.success(`Firma institucional aplicada · ${item.nombre}`);
    setTimeout(() => {
          }, 3000);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo firmar el certificado.";
  } finally {
    firmandoId.value = "";
  }
}

async function revocar(certificado: CertificadoEmitidoDocente) {
  if (!tienePermiso("certificados.revocar")) {
    error.value = "Tu perfil no puede revocar certificados.";
    return;
  }
  if (certificado.estado === "REVOCADO" || certificado.revocadoEn) return;
  const id = certificado.certificadoId || certificado.id;
  if (!id) return;
  const confirmar = window.confirm(
    `¿Revocar el certificado de ${certificado.nombre} (${certificado.codigoVerificacion || id})?\nDejará de validarse en la verificación pública.`,
  );
  if (!confirmar) return;
  revocandoId.value = certificado.id;
  error.value = "";
  try {
    await organizacionService.revocarCertificado(id);
    emitidos.value = emitidos.value.map((item) =>
      item.id === certificado.id || item.certificadoId === id
        ? {
            ...item,
            estado: "REVOCADO",
            revocadoEn: new Date().toISOString(),
          }
        : item,
    );
    toast.success(`Certificado revocado · ${certificado.nombre}`);
    setTimeout(() => {
          }, 3500);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo revocar el certificado.";
  } finally {
    revocandoId.value = "";
  }
}

function exportar() {
  const filas: Array<Array<string | number>> = [
    ["Código", "Estudiante", "Curso", "Fecha", "Estado", "Nota", "Horas"],
  ];

  if (mostrarEmitidos.value) {
    filas.push(
      ...emitidosVisibles.value.map((item) => [
        item.id,
        item.nombre,
        item.curso,
        item.fecha,
        item.estado,
        item.notaFinal ?? "-",
        item.horasCertificadas ?? "-",
      ]),
    );
  }

  if (mostrarPendientes.value) {
    filas.push(
      ...pendientesVisibles.value.map((item) => [
        item.id,
        item.nombre,
        item.curso,
        "-",
        "PENDIENTE",
        item.nota,
        item.horasCumplidas != null && item.horasRequeridas != null
          ? `${item.horasCumplidas}/${item.horasRequeridas}`
          : "-",
      ]),
    );
  }

  const csv = filas
    .map((fila) =>
      fila.map((dato) => `"${String(dato).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  enlace.download = "certificados-colegio-ingenieros-cusco.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function codigoCertificado(certificado: CertificadoEmitidoDocente) {
  return certificado.codigoVerificacion?.trim() || certificado.id;
}

async function datosCertificado(certificado: CertificadoEmitidoDocente) {
  const codigo = codigoCertificado(certificado);
  const { plantillasCertificadoService } = await import(
    "@/api/services/plantillas-certificado.service"
  );
  const { INSTALACION_TUKUY_ACADEMY_ID } = await import("@/lib/constants");
  const instalacionId =
    contextoActivo.value?.organizacionId?.trim() || INSTALACION_TUKUY_ACADEMY_ID;
  const plantilla =
    await plantillasCertificadoService.obtenerDefault(instalacionId);
  return {
    holderName: certificado.nombre,
    courseTitle: certificado.curso,
    category: "Formación especializada",
    duration: certificado.horasCertificadas
      ? `${certificado.horasCertificadas} horas certificadas`
      : "Duración certificada",
    level: "Aprobado",
    mode: "Virtual",
    issuedAt: certificado.fecha,
    certificateCode: codigo,
    issuerName:
      certificado.organizacionEmisora ??
      contextoActivo.value?.organizacionNombre ??
      "Tukuy Academy",
    issuerLogoUrl: logoEntidad.value,
    plantilla,
  };
}

function clavePdfReal(certificado: CertificadoEmitidoDocente) {
  const clave = certificado.claveAlmacenamiento?.trim();
  if (!clave) return null;
  // Placeholder histórico sin objeto S3 real.
  if (/^certificados\/[0-9a-f-]{36}\.pdf$/i.test(clave)) return null;
  if (!clave.startsWith("certificados/")) return null;
  return clave.replace(/^s3:\/\//, "");
}

async function verCertificado(certificado: CertificadoEmitidoDocente) {
  if (certificado.estado === "REVOCADO" || certificado.revocadoEn) {
    error.value = "Este certificado está revocado.";
  } else if (certificado.requiereFirmaInstitucional) {
    error.value =
      "Este certificado aún no está publicado: falta la firma institucional. El QR no verificará hasta firmarlo.";
  }
  const clave = clavePdfReal(certificado);
  if (clave) {
    try {
      const { storageAcademia } = await import("@/lib/storage-academia");
      const url = await storageAcademia.urlDescargaCertificado(clave);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    } catch {
      // fallback local
    }
  }
  const { openCertificatePdf } = await import("@/lib/certificado-pdf");
  await openCertificatePdf(await datosCertificado(certificado));
}

async function descargarCertificado(certificado: CertificadoEmitidoDocente) {
  descargandoId.value = certificado.id;
  error.value = "";
  try {
    if (certificado.requiereFirmaInstitucional) {
      error.value =
        "Descarga generada, pero el certificado aún no verifica en público (falta firma institucional).";
    }
    const clave = clavePdfReal(certificado);
    if (clave) {
      const { storageAcademia } = await import("@/lib/storage-academia");
      const url = await storageAcademia.urlDescargaCertificado(clave);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${codigoCertificado(certificado)}.pdf`;
      a.rel = "noopener";
      a.target = "_blank";
      a.click();
      return;
    }
    const { downloadCertificatePdf } = await import("@/lib/certificado-pdf");
    await downloadCertificatePdf(await datosCertificado(certificado));
  } catch {
    error.value = "No se pudo generar el PDF del certificado.";
  } finally {
    descargandoId.value = "";
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <TituloConAyuda
        titulo="Certificados institucionales"
        ayuda="Emite, consulta y verifica los certificados otorgados por la entidad a los alumnos que cumplen los requisitos académicos."
        clase-titulo="text-2xl font-black"
      />
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          @click="router.push('/organizacion/certificados/diseno')"
        >
          <SlidersHorizontal class="h-4 w-4" />
          Definir / ajustar diseño
        </Button>
        <Button variant="outline" @click="exportar">
          <Download class="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
    </header>

    <div
      v-if="mensaje"
      class="border border-emerald-500/30 border-l-4 border-l-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error"
      class="border border-red-500/30 border-l-4 border-l-red-600 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <Card
      v-if="pendientesFirma.length"
      class="overflow-hidden border-primary/40 border-t-4 border-t-primary bg-card"
    >
      <CardContent class="p-5">
        <div class="flex items-center gap-2">
          <ShieldCheck class="h-5 w-5 text-primary" />
          <h2 class="font-black">Pendientes de firma institucional</h2>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          El certificado solo se publica en el índice público cuando firmas.
        </p>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div
            v-for="item in pendientesFirma"
            :key="item.firmaId"
            class="flex items-center gap-3 border border-border bg-muted/40 p-4"
          >
            <div class="min-w-0 flex-1">
              <b class="text-sm">{{ item.nombre }}</b>
              <p class="truncate text-xs text-muted-foreground">
                {{ item.curso }}
              </p>
            </div>
            <Button
              size="sm"
              :disabled="firmandoId === item.firmaId"
              @click="firmar(item)"
            >
              <ShieldCheck class="h-4 w-4" />
              {{ firmandoId === item.firmaId ? "Firmando…" : "Firmar" }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-3">
      <Card
        v-for="item in indicadores"
        :key="item.etiqueta"
        class="overflow-hidden border-border bg-card"
        :class="
          item.acento === 'accent'
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary'
        "
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-11 w-11 place-items-center"
            :class="
              item.acento === 'accent'
                ? 'bg-accent/20 text-[#B87A00] dark:text-accent'
                : 'bg-primary/10 text-primary'
            "
          >
            <Award class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl text-foreground">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <section
      class="overflow-hidden border border-border border-t-4 border-t-accent bg-card"
      aria-labelledby="titulo-filtros-certificados"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div class="flex items-center gap-3">
          <span
            class="grid h-9 w-9 place-items-center bg-primary/10 text-primary"
          >
            <SlidersHorizontal class="h-4 w-4" />
          </span>
          <div>
            <h2 id="titulo-filtros-certificados" class="text-sm font-black">
              Filtros
            </h2>
            <p class="text-xs text-muted-foreground">
              Filtra por estudiante, curso, estado de emisión o nota.
            </p>
          </div>
        </div>
        <Button
          v-if="hayFiltros"
          variant="ghost"
          size="sm"
          @click="limpiarFiltros"
        >
          <FilterX class="h-4 w-4" />
          Limpiar {{ cantidadFiltrosActivos }}
          {{ cantidadFiltrosActivos === 1 ? "filtro" : "filtros" }}
        </Button>
      </div>

      <div class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="xl:col-span-2">
          <span class="filtro-label">Buscar</span>
          <span class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busqueda"
              class="filtro-control w-full pl-10"
              placeholder="Estudiante, curso o código"
            />
          </span>
        </label>
        <label>
          <span class="filtro-label">Curso</span>
          <Select
            v-model="cursoFiltro"
            class="filtro-control"
            :options="opcionesCursos"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
        <label>
          <span class="filtro-label">Registro</span>
          <Select
            v-model="vistaFiltro"
            class="filtro-control"
            :options="opcionesVista"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
        <label v-if="mostrarPendientes">
          <span class="filtro-label">Condición académica</span>
          <Select
            v-model="notaFiltro"
            class="filtro-control"
            :options="opcionesNotas"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
      </div>
    </section>

    <!-- Tabla pendientes -->
    <section
      v-if="mostrarPendientes"
      class="overflow-hidden border border-border border-t-4 border-t-accent bg-card"
      aria-labelledby="titulo-pendientes"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div>
          <h2 id="titulo-pendientes" class="text-sm font-black">
            Pendientes de emisión
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ pendientesVisibles.length }}
            {{
              pendientesVisibles.length === 1
                ? "solicitud lista o en revisión"
                : "solicitudes listas o en revisión"
            }}
          </p>
        </div>
      </div>

      <div v-if="cargando" class="grid gap-1 p-4" aria-busy="true">
        <div
          v-for="fila in 4"
          :key="fila"
          class="grid grid-cols-5 gap-4 border-b border-border py-4"
        >
          <Skeleton v-for="celda in 5" :key="celda" class="h-8 w-full" />
        </div>
      </div>

      <DataTable
        v-else
        class="tabla-estudiantes"
        :value="pendientesVisibles"
        data-key="id"
        size="small"
        scrollable
        removable-sort
        :paginator="pendientesVisibles.length > 8"
        :rows="8"
        :rows-per-page-options="[8, 16, 24]"
        paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        current-page-report-template="{first}–{last} de {totalRecords}"
        :always-show-paginator="false"
        table-style="min-width: 72rem"
      >
        <template #empty>
          <div class="px-4 py-12 text-center">
            <Award class="mx-auto h-10 w-10 text-primary" />
            <h3 class="mt-4 text-lg font-black">Sin pendientes</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              No hay solicitudes con estos filtros.
            </p>
          </div>
        </template>

        <Column
          field="nombre"
          header="Estudiante"
          sortable
          style="min-width: 14rem"
        >
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
              >
                {{ iniciales(data.nombre) }}
              </span>
              <strong class="text-foreground">{{ data.nombre }}</strong>
            </div>
          </template>
        </Column>

        <Column
          field="curso"
          header="Curso"
          sortable
          style="min-width: 16rem"
        />

        <Column
          field="nota"
          header="Nota"
          sortable
          style="min-width: 7rem"
        >
          <template #body="{ data }">
            <span class="font-black">{{ data.nota }}</span>
          </template>
        </Column>

        <Column header="Avance" style="min-width: 14rem">
          <template #body="{ data }">
            <p class="text-xs text-muted-foreground">
              <template v-if="data.horasRequeridas != null">
                {{ data.horasCumplidas }} / {{ data.horasRequeridas }} h
              </template>
              <template v-else>—</template>
              <template v-if="data.modulosTotales != null">
                · {{ data.modulosCompletados }} / {{ data.modulosTotales }}
                módulos
              </template>
            </p>
          </template>
        </Column>

        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag
              class="w-fit"
              :severity="data.nota >= 14 ? 'success' : 'warn'"
              :value="data.nota >= 14 ? 'Listo' : 'Refuerzo'"
            />
          </template>
        </Column>

        <Column header="Acción" style="min-width: 9rem">
          <template #body="{ data }">
            <Button
              v-if="tienePermiso('certificados.emitir')"
              size="sm"
              :disabled="data.nota < 14 || emitiendoId === data.id"
              @click="emitir(data.id)"
            >
              <Send class="h-4 w-4" />
              Emitir
            </Button>
          </template>
        </Column>
      </DataTable>
    </section>

    <!-- Tabla emitidos -->
    <section
      v-if="mostrarEmitidos"
      class="overflow-hidden border border-border border-t-4 border-t-primary bg-card"
      aria-labelledby="titulo-emitidos"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div>
          <h2 id="titulo-emitidos" class="text-sm font-black">
            Certificados emitidos
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{ emitidosVisibles.length }}
            {{
              emitidosVisibles.length === 1
                ? "certificado registrado"
                : "certificados registrados"
            }}
          </p>
        </div>
      </div>

      <div v-if="cargando" class="grid gap-1 p-4" aria-busy="true">
        <div
          v-for="fila in 5"
          :key="fila"
          class="grid grid-cols-6 gap-4 border-b border-border py-4"
        >
          <Skeleton v-for="celda in 6" :key="celda" class="h-8 w-full" />
        </div>
      </div>

      <DataTable
        v-else
        class="tabla-estudiantes"
        :value="emitidosVisibles"
        data-key="id"
        size="small"
        scrollable
        removable-sort
        :paginator="emitidosVisibles.length > 8"
        :rows="8"
        :rows-per-page-options="[8, 16, 24]"
        paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        current-page-report-template="{first}–{last} de {totalRecords}"
        :always-show-paginator="false"
        table-style="min-width: 78rem"
      >
        <template #empty>
          <div class="px-4 py-12 text-center">
            <ShieldCheck class="mx-auto h-10 w-10 text-primary" />
            <h3 class="mt-4 text-lg font-black">Sin certificados emitidos</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Ajusta los filtros o emite desde la tabla de pendientes.
            </p>
          </div>
        </template>

        <Column
          field="id"
          header="Código"
          sortable
          style="min-width: 10rem"
        >
          <template #body="{ data }">
            <span class="font-black tracking-wide">{{
              data.codigoVerificacion || data.id
            }}</span>
          </template>
        </Column>

        <Column
          field="nombre"
          header="Estudiante"
          sortable
          style="min-width: 14rem"
        >
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
              >
                {{ iniciales(data.nombre) }}
              </span>
              <strong class="text-foreground">{{ data.nombre }}</strong>
            </div>
          </template>
        </Column>

        <Column
          field="curso"
          header="Curso"
          sortable
          style="min-width: 16rem"
        />

        <Column
          field="fecha"
          header="Fecha"
          sortable
          style="min-width: 8rem"
        />

        <Column
          field="notaFinal"
          header="Nota"
          sortable
          style="min-width: 6rem"
        >
          <template #body="{ data }">
            {{ data.notaFinal ?? "—" }}
          </template>
        </Column>

        <Column header="Horas" style="min-width: 6rem">
          <template #body="{ data }">
            {{ data.horasCertificadas ?? "—" }}
          </template>
        </Column>

        <Column header="Estado" style="min-width: 9rem">
          <template #body="{ data }">
            <Tag
              class="w-fit"
              :severity="
                data.estado === 'REVOCADO' || data.revocadoEn
                  ? 'danger'
                  : data.horasCertificadas
                    ? 'success'
                    : 'secondary'
              "
              :value="
                data.estado === 'REVOCADO' || data.revocadoEn
                  ? 'Revocado'
                  : data.horasCertificadas
                    ? 'Verificado'
                    : 'Registro anterior'
              "
            />
          </template>
        </Column>

        <Column header="Acciones" style="min-width: 14rem">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ver certificado"
                :disabled="!data.horasCertificadas"
                :title="
                  data.horasCertificadas
                    ? 'Ver certificado'
                    : 'Registro anterior sin evidencias migradas'
                "
                @click="verCertificado(data)"
              >
                <Eye class="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="descargandoId === data.id"
                @click="descargarCertificado(data)"
              >
                <FileDown class="h-4 w-4" />
                PDF
              </Button>
              <Button
                v-if="
                  tienePermiso('certificados.revocar') &&
                  data.estado !== 'REVOCADO' &&
                  !data.revocadoEn
                "
                variant="outline"
                size="sm"
                class="text-red-700"
                :disabled="revocandoId === data.id"
                @click="revocar(data)"
              >
                <Ban class="h-4 w-4" />
                Revocar
              </Button>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>
  </section>
</template>
