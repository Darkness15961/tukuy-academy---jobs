<script setup lang="ts">
import {
  Award,
  BriefcaseBusiness,
  CircleDollarSign,
  Radio,
  ShoppingBag,
  UsersRound,
  Video,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  administracionService,
  type CertificadoOperacionAdmin,
  type OrdenMarketplaceAdmin,
  type ResumenEcosistemaAdmin,
  type SesionGlobalAdmin,
} from "@/api/services/administracion.service";

const router = useRouter();
const cargando = ref(true);
const resumen = ref<ResumenEcosistemaAdmin | null>(null);
const certificados = ref<CertificadoOperacionAdmin[]>([]);
const ordenes = ref<OrdenMarketplaceAdmin[]>([]);
const sesiones = ref<SesionGlobalAdmin[]>([]);

const formatoMoneda = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

onMounted(async () => {
  try {
    const operacion = await administracionService.obtenerOperacionEcosistema();
    resumen.value = operacion.resumen;
    certificados.value = operacion.certificados;
    ordenes.value = operacion.ordenes;
    sesiones.value = operacion.sesiones;
  } finally {
    cargando.value = false;
  }
});

const indicadores = computed(() => {
  if (!resumen.value) return [];
  const { sesionesEnVivo, certificados: cert, marketplace, comunidadBolsa } =
    resumen.value;
  return [
    {
      etiqueta: "Sesiones programadas",
      valor: sesionesEnVivo.programadas,
      detalle: `${sesionesEnVivo.hoy} hoy · ${sesionesEnVivo.enVivo} en vivo`,
      icono: Video,
      fondo: "bg-primary/10 text-primary",
    },
    {
      etiqueta: "Certificados del mes",
      valor: cert.emitidosMes,
      detalle: `${cert.pendientesEmision} pendientes · ${cert.verificacionesPublicas} verificaciones`,
      icono: Award,
      fondo: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    },
    {
      etiqueta: "Ingresos B2C (Izipay)",
      valor: formatoMoneda.format(marketplace.ingresosCursosPen),
      detalle: `${marketplace.ordenesMes} órdenes · ${marketplace.pagosIzipayFallidos} fallidas`,
      icono: ShoppingBag,
      fondo: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    },
    {
      etiqueta: "Bolsa y comunidad",
      valor: comunidadBolsa.vacantesActivas,
      detalle: `${comunidadBolsa.postulacionesMes} postulaciones · ${comunidadBolsa.publicacionesReportadas} reportes`,
      icono: BriefcaseBusiness,
      fondo: "bg-muted text-foreground",
    },
  ];
});

function textoModalidadSesion(estado: SesionGlobalAdmin["estado"]) {
  return {
    HOY: "Hoy",
    PROGRAMADA: "Programada",
    EN_VIVO: "En vivo",
    FINALIZADA: "Finalizada",
  }[estado];
}

function severidadSesion(estado: SesionGlobalAdmin["estado"]) {
  if (estado === "EN_VIVO") return "danger";
  if (estado === "HOY") return "warn";
  if (estado === "FINALIZADA") return "secondary";
  return "info";
}

function severidadOrden(estado: OrdenMarketplaceAdmin["estado"]) {
  if (estado === "PAGADA") return "success";
  if (estado === "FALLIDA") return "danger";
  return "warn";
}

function severidadCertificado(estado: CertificadoOperacionAdmin["estado"]) {
  return estado === "VALIDO" ? "success" : "danger";
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        eyebrow="Operación del producto"
        titulo="Ecosistema Tukuy"
        ayuda="Supervisa clases en vivo, certificados verificables, compras B2C con Izipay, comunidad y bolsa laboral en un solo panel."
      />
      <Button variant="outline" size="sm" @click="router.push('/admin/auditoria')">
        Ver auditoría
      </Button>
    </div>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="indicador in indicadores"
        :key="indicador.etiqueta"
        class="border-border bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-12 w-12 shrink-0 place-items-center"
            :class="indicador.fondo"
          >
            <component :is="indicador.icono" class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <strong class="block text-2xl font-black">{{ indicador.valor }}</strong>
            <p class="truncate text-xs text-muted-foreground">
              {{ indicador.etiqueta }}
            </p>
            <p class="mt-1 text-[11px] font-semibold text-muted-foreground">
              {{ indicador.detalle }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div class="flex items-center gap-3">
              <Radio class="h-5 w-5 text-primary" />
              <div>
                <h2 class="font-black">Sesiones en vivo</h2>
                <p class="text-xs text-muted-foreground">
                  Calendario global de organizaciones y Academy
                </p>
              </div>
            </div>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 4" :key="item" class="h-12 w-full" />
          </div>
          <DataTable
            v-else
            class="tabla-administracion"
            :value="sesiones"
            size="small"
            data-key="id"
            scrollable
            table-style="min-width: 40rem"
          >
            <Column field="titulo" header="Sesión" style="min-width: 14rem">
              <template #body="{ data }">
                <strong>{{ data.titulo }}</strong>
                <p class="text-xs text-muted-foreground">{{ data.curso }}</p>
              </template>
            </Column>
            <Column
              field="organizacion"
              header="Organización"
              style="min-width: 12rem"
            />
            <Column field="inicio" header="Inicio" style="min-width: 8rem" />
            <Column field="estado" header="Estado" style="min-width: 7rem">
              <template #body="{ data }">
                <Tag
                  :severity="severidadSesion(data.estado)"
                  :value="textoModalidadSesion(data.estado)"
                />
              </template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>

      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div class="flex items-center gap-3">
              <Award class="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <div>
                <h2 class="font-black">Certificados emitidos</h2>
                <p class="text-xs text-muted-foreground">
                  Validación pública y emisión por organización
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/certificados/verificar/TUK-2026-0B3A78')"
            >
              Verificador
            </Button>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 4" :key="item" class="h-12 w-full" />
          </div>
          <DataTable
            v-else
            class="tabla-administracion"
            :value="certificados"
            size="small"
            data-key="id"
            scrollable
            table-style="min-width: 40rem"
          >
            <Column field="codigo" header="Código" style="min-width: 10rem">
              <template #body="{ data }">
                <strong class="font-mono text-xs">{{ data.codigo }}</strong>
              </template>
            </Column>
            <Column field="titular" header="Titular" style="min-width: 10rem" />
            <Column field="curso" header="Curso" style="min-width: 14rem" />
            <Column field="estado" header="Estado" style="min-width: 7rem">
              <template #body="{ data }">
                <Tag
                  :severity="severidadCertificado(data.estado)"
                  :value="data.estado === 'VALIDO' ? 'Válido' : 'Revocado'"
                />
              </template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div class="flex items-center gap-3">
              <CircleDollarSign class="h-5 w-5 text-amber-700 dark:text-amber-300" />
              <div>
                <h2 class="font-black">Órdenes marketplace (B2C)</h2>
                <p class="text-xs text-muted-foreground">
                  Compras individuales vía Izipay
                </p>
              </div>
            </div>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 4" :key="item" class="h-12 w-full" />
          </div>
          <DataTable
            v-else
            class="tabla-administracion"
            :value="ordenes"
            size="small"
            data-key="id"
            scrollable
            table-style="min-width: 42rem"
          >
            <Column field="id" header="Orden" style="min-width: 9rem">
              <template #body="{ data }">
                <strong class="font-mono text-xs">{{ data.id }}</strong>
              </template>
            </Column>
            <Column field="alumno" header="Alumno" style="min-width: 10rem" />
            <Column field="cursos" header="Cursos" style="min-width: 14rem" />
            <Column field="total" header="Total" style="min-width: 7rem">
              <template #body="{ data }">
                {{ formatoMoneda.format(data.total) }}
              </template>
            </Column>
            <Column field="estado" header="Estado" style="min-width: 7rem">
              <template #body="{ data }">
                <Tag
                  :severity="severidadOrden(data.estado)"
                  :value="data.estado"
                />
              </template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>

      <Card class="border-border bg-card">
        <CardContent class="space-y-5 p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <UsersRound class="h-5 w-5 text-primary" />
            <div>
              <h2 class="text-lg font-black">Comunidad y Bolsa Tukuy</h2>
              <p class="text-xs text-muted-foreground">
                Moderación y mercado laboral del ecosistema
              </p>
            </div>
          </div>
          <div v-if="cargando" class="space-y-3">
            <Skeleton v-for="item in 4" :key="item" class="h-12 w-full" />
          </div>
          <ul v-else-if="resumen" class="space-y-3 text-sm">
            <li
              class="flex items-center justify-between border border-border bg-muted/40 px-4 py-3"
            >
              <span class="text-muted-foreground">Vacantes activas</span>
              <strong>{{ resumen.comunidadBolsa.vacantesActivas }}</strong>
            </li>
            <li
              class="flex items-center justify-between border border-border bg-muted/40 px-4 py-3"
            >
              <span class="text-muted-foreground">Postulaciones del mes</span>
              <strong>{{ resumen.comunidadBolsa.postulacionesMes }}</strong>
            </li>
            <li
              class="flex items-center justify-between border border-border bg-muted/40 px-4 py-3"
            >
              <span class="text-muted-foreground">Publicaciones reportadas</span>
              <strong class="text-amber-700 dark:text-amber-300">
                {{ resumen.comunidadBolsa.publicacionesReportadas }}
              </strong>
            </li>
            <li
              class="flex items-center justify-between border border-border bg-muted/40 px-4 py-3"
            >
              <span class="text-muted-foreground">Entidades con perfil público</span>
              <strong>{{ resumen.comunidadBolsa.entidadesPublicas }}</strong>
            </li>
          </ul>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/comunidad')"
            >
              Abrir comunidad
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/bolsa-tukuy')"
            >
              Abrir bolsa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
