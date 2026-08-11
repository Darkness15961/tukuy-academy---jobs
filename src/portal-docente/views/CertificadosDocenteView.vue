<script setup lang="ts">
import {
  Award,
  CheckCircle2,
  Download,
  Eye,
  FileDown,
  Search,
  Send,
  ShieldCheck,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import {
  docenteService,
  type CertificadoEmitidoDocente,
  type CertificadoPendienteDocente,
} from "@/api/services/docente.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { organizacionService } from "@/api/services/organizacion.service";
import { apiConfig } from "@/api/config";

const props = withDefaults(
  defineProps<{
    titulo?: string;
    descripcion?: string;
    nombreArchivo?: string;
    alcance?: "DOCENTE" | "ORGANIZACION";
  }>(),
  {
    titulo: "Certificados",
    descripcion: "Emite, consulta y verifica certificados de tus cursos.",
    nombreArchivo: "certificados-docente.csv",
    alcance: "DOCENTE",
  },
);
const { contextoActivo, funcionesEntidadActiva } = useContextoSesion();
const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo,
);
const cargando = ref(true);
const sincronizando = ref(false);
const descargandoId = ref("");
const firmandoId = ref("");
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
const tipoFiltro = ref<"AMBOS" | "EMITIDOS" | "PENDIENTES">("AMBOS");
const notaFiltro = ref<"TODAS" | "LISTOS" | "POR_MEJORAR">("TODAS");

const opcionesTipos = [
  { label: "Ambos", value: "AMBOS" },
  { label: "Emitidos", value: "EMITIDOS" },
  { label: "Pendientes", value: "PENDIENTES" },
];

const opcionesNotas = [
  { label: "Todas las notas", value: "TODAS" },
  { label: "Listos (>= 14)", value: "LISTOS" },
  { label: "Por refuerzo (< 14)", value: "POR_MEJORAR" },
];

const opcionesCursos = computed(() => {
  const cursos = new Set<string>([
    ...emitidos.value.map((e) => e.curso),
    ...pendientes.value.map((p) => p.curso),
  ]);
  return [
    { label: "Todos los cursos", value: "TODOS" },
    ...[...cursos].sort().map((curso) => ({ label: curso, value: curso })),
  ];
});

function coincideEnBusqueda(termino: string, valores: string[]) {
  return valores.some((v) => v.toLowerCase().includes(termino));
}

const emitidosVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return emitidos.value.filter((item) => {
    const coincideCurso =
      cursoFiltro.value === "TODOS" || item.curso === cursoFiltro.value;
    const matchesBusqueda =
      !termino ||
      coincideEnBusqueda(termino, [item.nombre, item.curso, item.id]);
    return coincideCurso && matchesBusqueda;
  });
});

const pendientesVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return pendientes.value.filter((item) => {
    const coincideCurso =
      cursoFiltro.value === "TODOS" || item.curso === cursoFiltro.value;
    const matchesBusqueda =
      !termino ||
      coincideEnBusqueda(termino, [item.nombre, item.curso, item.id]);
    const coincideNota =
      notaFiltro.value === "TODAS" ||
      (notaFiltro.value === "LISTOS" && item.nota >= 14) ||
      (notaFiltro.value === "POR_MEJORAR" && item.nota < 14);

    return coincideCurso && matchesBusqueda && coincideNota;
  });
});

const tasaAprobacion = computed(() => {
  const total = emitidosVisibles.value.length + pendientesVisibles.value.length;
  return total ? Math.round((emitidosVisibles.value.length / total) * 100) : 0;
});
onMounted(async () => {
  const usarOrgMock =
    props.alcance === "ORGANIZACION" && !apiConfig.secundariaCursos;
  if (usarOrgMock) {
    try {
      [emitidos.value, pendientes.value] = await Promise.all([
        organizacionService.certificados.listar(),
        organizacionService.certificadosPendientes.listar(),
      ]);
    } finally {
      cargando.value = false;
    }
    return;
  }

  sincronizando.value = true;
  error.value = "";
  try {
    if (!apiConfig.secundariaCursos) {
      // Mock/API: recalcula elegibilidad local antes de leer repos.
      await docenteService.sincronizarCertificadosElegibles();
    }
    const [listaEmitidos, listaPendientes, listaFirmas] = await Promise.all([
      docenteService.certificados.listar(),
      docenteService.certificadosPendientes.listar(),
      apiConfig.secundariaCursos
        ? docenteService.listarPendientesFirma()
        : Promise.resolve([]),
    ]);
    emitidos.value = listaEmitidos;
    pendientes.value = listaPendientes;
    pendientesFirma.value = listaFirmas;
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron cargar los certificados.";
  } finally {
    cargando.value = false;
    sincronizando.value = false;
  }
});

async function emitir(pendienteId: string) {
  const p = pendientes.value.find((x) => x.id === pendienteId);
  if (!p) return;
  error.value = "";
  try {
    const usarOrgMock =
      props.alcance === "ORGANIZACION" && !apiConfig.secundariaCursos;
    const emitido = usarOrgMock
      ? await organizacionService.emitirCertificado(pendienteId)
      : await docenteService.emitirCertificado(pendienteId);
    emitidos.value.unshift(emitido);
    pendientes.value = pendientes.value.filter((x) => x.id !== pendienteId);
    if (apiConfig.secundariaCursos) {
      pendientesFirma.value = await docenteService.listarPendientesFirma();
    }
    const requiereFirma =
      (emitido as CertificadoEmitidoDocente & {
        requiereFirmaInstitucional?: boolean;
      }).requiereFirmaInstitucional === true;
    mensaje.value = requiereFirma
      ? "Certificado preparado. Falta la firma institucional para publicarlo."
      : "Certificado emitido y enviado al estudiante.";
    setTimeout(() => (mensaje.value = ""), 3500);
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo emitir el certificado.";
  }
}

async function firmar(item: {
  firmaId: string;
  certificadoId: string;
  nombre: string;
  curso: string;
}) {
  firmandoId.value = item.firmaId;
  error.value = "";
  try {
    await docenteService.firmarCertificado(item.certificadoId, item.firmaId);
    pendientesFirma.value = pendientesFirma.value.filter(
      (fila) => fila.firmaId !== item.firmaId,
    );
    mensaje.value = `Firma institucional aplicada · ${item.nombre} · ${item.curso}`;
    setTimeout(() => (mensaje.value = ""), 3000);
    emitidos.value = await docenteService.certificados.listar();
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo firmar el certificado.";
  } finally {
    firmandoId.value = "";
  }
}

async function exportar() {
  error.value = "";
  const listaPdf = emitidosVisibles.value;
  if (listaPdf.length) {
    try {
      const { downloadCertificatePdf } = await import("@/lib/certificado-pdf");
      for (const certificado of listaPdf) {
        await downloadCertificatePdf(datosCertificado(certificado));
        // Evita que el navegador bloquee descargas en ráfaga.
        await new Promise((r) => setTimeout(r, 250));
      }
      mensaje.value =
        listaPdf.length === 1
          ? "PDF del certificado descargado."
          : `${listaPdf.length} PDFs de certificados descargados.`;
      setTimeout(() => (mensaje.value = ""), 2500);
    } catch {
      error.value = "No se pudieron generar los PDF de certificados.";
    }
    return;
  }

  // Sin emitidos visibles: listado CSV de pendientes (no es un certificado PDF).
  const filas: Array<Array<string | number>> = [
    ["Código", "Estudiante", "Curso", "Fecha", "Estado", "Nota"],
  ];
  filas.push(
    ...pendientesVisibles.value.map((item) => [
      item.id,
      item.nombre,
      item.curso,
      "-",
      "PENDIENTE",
      item.nota,
    ]),
  );
  const csv = "\uFEFF" + filas
    .map((fila) =>
      fila.map((dato) => `"${String(dato).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const base = props.nombreArchivo.replace(/\.(csv|txt)$/i, "");
  enlace.download = `${base || "certificados"}-pendientes.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function datosCertificado(certificado: CertificadoEmitidoDocente) {
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
    certificateCode: certificado.id,
    issuerName: certificado.organizacionEmisora ??
      contextoActivo.value?.organizacionNombre ?? "Tukuy Academy",
    issuerLogoUrl:
      props.alcance === "ORGANIZACION" || contextoActivo.value?.organizacionId
        ? logoEntidad.value
        : undefined,
  };
}

async function verCertificado(certificado: CertificadoEmitidoDocente) {
  const { openCertificatePdf } = await import("@/lib/certificado-pdf");
  await openCertificatePdf(datosCertificado(certificado));
}

async function descargarCertificado(certificado: CertificadoEmitidoDocente) {
  descargandoId.value = certificado.id;
  error.value = "";
  try {
    const { downloadCertificatePdf } = await import("@/lib/certificado-pdf");
    await downloadCertificatePdf(datosCertificado(certificado));
  } catch {
    error.value = "No se pudo generar el PDF del certificado.";
  } finally {
    descargandoId.value = "";
  }
}
</script>
<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div>
      <TituloConAyuda
        :titulo="props.titulo"
        :ayuda="props.descripcion"
        clase-titulo="text-2xl font-black"
      />
      <p
        v-if="sincronizando && !cargando"
        class="mt-2 text-xs font-medium text-primary"
      >
        Actualizando elegibilidad en segundo plano…
      </p>
    </div>
    <div
      v-if="mensaje"
      class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error"
      class="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>
    <div v-if="cargando" class="grid gap-4 sm:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-3">
      <Card
        v-for="(i, idx) in [
          { l: 'Emitidos', v: emitidosVisibles.length, gold: false },
          {
            l: 'Pendientes de emisión',
            v: pendientesVisibles.length,
            gold: true,
          },
          { l: 'Tasa de emisión', v: `${tasaAprobacion}%`, gold: true },
        ]"
        :key="i.l"
        class="overflow-hidden border-border bg-card"
        :class="
          i.gold ? 'border-t-4 border-t-accent' : 'border-t-4 border-t-primary'
        "
        ><CardContent class="flex items-center gap-4 p-5"
          ><div
            class="grid h-11 w-11 place-items-center"
            :class="
              i.gold
                ? 'bg-accent/20 text-[#B87A00] dark:text-accent'
                : 'bg-primary/10 text-primary'
            "
          >
            <Award class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl">{{ i.v }}</strong>
            <p class="text-xs text-muted-foreground">{{ i.l }}</p>
          </div></CardContent
        ></Card
      >
    </div>

    <Card
      v-if="
        (tipoFiltro === 'AMBOS' || tipoFiltro === 'PENDIENTES') &&
        pendientesVisibles.length
      "
      class="overflow-hidden border-accent/40 border-t-4 border-t-accent bg-card"
      ><CardContent class="p-5"
        ><div class="flex items-center gap-2">
          <CheckCircle2 class="h-5 w-5 text-[#B87A00] dark:text-accent" />
          <h2 class="font-black text-foreground">Listos para certificar</h2>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <div
            v-for="p in pendientesVisibles"
            :key="p.id"
            class="flex items-center gap-3 border border-border bg-muted/40 p-4"
          >
            <div class="min-w-0 flex-1">
              <b class="text-sm">{{ p.nombre }}</b>
              <p class="truncate text-xs text-muted-foreground">
                {{ p.curso }} · Nota {{ p.nota }}
              </p>
              <p
                v-if="p.horasRequeridas"
                class="mt-1 text-[11px] text-muted-foreground"
              >
                {{ p.horasCumplidas }} / {{ p.horasRequeridas }} horas ·
                {{ p.modulosCompletados }} / {{ p.modulosTotales }} módulos
              </p>
            </div>
            <Badge
              v-if="p.nota >= 14"
              class="ml-auto mr-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              Listo
            </Badge>
            <Badge
              v-else
              class="ml-auto mr-2 bg-accent/20 text-[#B87A00] dark:text-accent"
            >
              Refuerzo
            </Badge>
            <Button size="sm" :disabled="p.nota < 14" @click="emitir(p.id)"
              ><Send class="h-4 w-4" />Emitir</Button
            >
          </div>
        </div></CardContent
      ></Card
    >

    <Card
      v-if="pendientesFirma.length"
      class="overflow-hidden border-primary/40 border-t-4 border-t-primary bg-card"
    >
      <CardContent class="p-5">
        <div class="flex items-center gap-2">
          <ShieldCheck class="h-5 w-5 text-primary" />
          <h2 class="font-black text-foreground">
            Pendientes de firma institucional
          </h2>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          El índice público solo se publica cuando se completa esta firma.
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
              <p
                v-if="item.codigoVerificacion"
                class="mt-1 text-[11px] text-muted-foreground"
              >
                Código {{ item.codigoVerificacion }}
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

    <Card
      v-if="tipoFiltro === 'AMBOS' || tipoFiltro === 'EMITIDOS'"
      class="border-border bg-card"
      ><CardContent class="p-0"
        ><div class="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-5">
          <label class="xl:col-span-2">
            <span class="filtro-label">Buscar certificados</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="busqueda"
                class="filtro-control w-full pl-10"
                placeholder="Certificado, estudiante o código"
              />
            </span>
          </label>
          <label>
            <span class="filtro-label">Curso</span>
            <Select
              v-model="cursoFiltro"
              :options="opcionesCursos"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <label>
            <span class="filtro-label">Tipo de registro</span>
            <Select
              v-model="tipoFiltro"
              :options="opcionesTipos"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <label>
            <span class="filtro-label">Condición académica</span>
            <Select
              v-model="notaFiltro"
              :options="opcionesNotas"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <Button
            variant="outline"
            class="md:col-span-2 xl:col-span-5"
            @click="exportar"
            ><Download class="h-4 w-4" />{{
              emitidosVisibles.length ? "Exportar PDF" : "Exportar CSV"
            }}</Button
          >
        </div>
        <div class="divide-y">
          <div
            v-for="c in emitidosVisibles"
            :key="c.id"
            class="flex flex-wrap items-center gap-4 p-5"
          >
            <div
              class="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary"
            >
              <ShieldCheck class="h-5 w-5" />
            </div>
            <div class="min-w-60 flex-1">
              <b>{{ c.nombre }}</b>
              <p class="text-xs text-muted-foreground">{{ c.curso }}</p>
            </div>
            <div>
              <p class="text-xs font-bold">{{ c.id }}</p>
              <p class="text-xs text-muted-foreground">{{ c.fecha }}</p>
            </div>
            <Badge
              v-if="c.horasCertificadas"
              class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >Verificado</Badge
            >
            <Badge v-else variant="outline">Registro anterior</Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver certificado"
              :disabled="!c.horasCertificadas"
              :title="
                c.horasCertificadas
                  ? 'Ver certificado y QR'
                  : 'Este registro anterior aún no cuenta con evidencias migradas'
              "
              @click="verCertificado(c)"
              ><Eye class="h-4 w-4"
            /></Button>
            <Button
              variant="outline"
              size="sm"
              :aria-label="`Descargar certificado PDF de ${c.nombre}`"
              :title="`Descargar PDF de ${c.nombre}`"
              :disabled="descargandoId === c.id"
              @click="descargarCertificado(c)"
            >
              <FileDown class="h-4 w-4" />
              PDF
            </Button>
          </div></div></CardContent
    ></Card>
  </section>
</template>
