<script setup lang="ts">
import {
  Award,
  BookOpenCheck,
  Building2,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Link2,
  Network,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Unplug,
  UsersRound,
} from "lucide-vue-next";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { administracionService } from "@/api/services/administracion.service";
import { toast } from "@/lib/toast";
import {
  obtenerSnapshotEcosistemaAdmin,
  type EstadoModuloEcosistema,
  type SnapshotEcosistemaAdmin,
} from "@/api/services/ecosistema-admin.service";

const router = useRouter();
const cargando = ref(true);
const sincronizando = ref(false);
const error = ref("");
const mensaje = ref("");
const snapshot = ref<SnapshotEcosistemaAdmin | null>(null);

async function cargar() {
  cargando.value = true;
  error.value = "";
    try {
    snapshot.value = await obtenerSnapshotEcosistemaAdmin();
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo cargar el ecosistema.";
    snapshot.value = null;
  } finally {
    cargando.value = false;
  }
}

async function sincronizarCatalogo() {
  sincronizando.value = true;
    try {
    const resultado =
      await administracionService.sincronizarCatalogoDesdeSecundaria();
    toast.success(`Catálogo sincronizado: ${resultado.publicadosAhora} nuevos de ${resultado.totalSecundaria} en secundaria.`);
    await cargar();
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo sincronizar el catálogo.";
  } finally {
    sincronizando.value = false;
  }
}

onMounted(() => {
  void cargar();
});

const indicadores = computed(() => {
  const s = snapshot.value;
  if (!s) return [];
  return [
    {
      etiqueta: "Organizaciones (SaaS)",
      valor: s.saas.error ? "—" : String(s.saas.organizaciones),
      detalle: s.saas.error ?? `${s.saas.suscripcionesActivas} suscripciones activas`,
      icono: Building2,
    },
    {
      etiqueta: "Identidades activas",
      valor: s.saas.error ? "—" : String(s.saas.identidadesActivas),
      detalle: s.saas.error ?? "Principal · auth + contextos",
      icono: UsersRound,
    },
    {
      etiqueta: "Catálogo Academy",
      valor: s.academy.errorCatalogo
        ? "—"
        : String(s.academy.catalogo.publicados),
      detalle: s.academy.errorCatalogo
        ? s.academy.errorCatalogo
        : `${s.academy.catalogo.enRevision} en revisión · ${s.academy.catalogo.total} total`,
      icono: BookOpenCheck,
    },
    {
      etiqueta: "Secundaria",
      valor: s.academy.salud?.ok ? "OK" : "—",
      detalle:
        s.academy.errorSalud ??
        `v${s.academy.salud?.versionEsquema ?? "—"} · ${s.academy.salud?.tablasPublicas ?? 0} tablas`,
      icono: Network,
    },
  ];
});

function severidadEstado(estado: EstadoModuloEcosistema) {
  if (estado === "operativo") return "success";
  if (estado === "parcial") return "warn";
  if (estado === "desconectado") return "danger";
  return "secondary";
}

function textoEstado(estado: EstadoModuloEcosistema) {
  return {
    operativo: "Operativo",
    parcial: "Parcial",
    pendiente: "Pendiente",
    desconectado: "Desconectado",
  }[estado];
}

function iconoEstado(estado: EstadoModuloEcosistema) {
  if (estado === "operativo") return CircleCheck;
  if (estado === "parcial") return CircleAlert;
  if (estado === "desconectado") return Unplug;
  return CircleDashed;
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        eyebrow="Gobierno del producto"
        titulo="Ecosistema Tukuy"
        ayuda="Estado real de lo que el superadmin opera hoy: SaaS principal, Academy (secundaria), catálogo, pagos B2C y módulos aún pendientes. Ya no muestra KPIs simulados de bolsa/comunidad/órdenes."
      />
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="cargando || sincronizando"
          @click="cargar"
        >
          <RefreshCw class="h-4 w-4" :class="cargando ? 'animate-spin' : ''" />
          Actualizar
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="
            cargando ||
            sincronizando ||
            !snapshot?.flags.secundariaCursos
          "
          @click="sincronizarCatalogo"
        >
          <Link2 class="h-4 w-4" />
          {{ sincronizando ? "Sincronizando…" : "Sync catálogo" }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="router.push('/admin/auditoria')"
        >
          Auditoría
        </Button>
      </div>
    </div>

    <div
      v-if="error"
      class="border-l-4 border-l-red-500 bg-red-500/10 p-4 text-sm font-semibold text-red-800 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div
      v-if="mensaje"
      class="border-l-4 border-l-emerald-500 bg-emerald-500/10 p-4 text-sm font-semibold"
    >
      {{ mensaje }}
    </div>

    <Card
      v-if="snapshot"
      class="border-border border-l-4 border-l-primary bg-card"
    >
      <CardContent class="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Auth
          </p>
          <p class="mt-1 font-black">{{ snapshot.flags.authProvider }}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Secundaria cursos
          </p>
          <p class="mt-1 font-black">
            {{ snapshot.flags.secundariaCursos ? "activa" : "apagada" }}
          </p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Mock / demos
          </p>
          <p class="mt-1 font-black">
            {{ snapshot.flags.useMock ? "híbrido (local vacío)" : "off" }}
          </p>
        </div>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Pagos
          </p>
          <p class="mt-1 font-black">{{ snapshot.flags.pagoModo }}</p>
        </div>
      </CardContent>
    </Card>

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
            class="grid h-12 w-12 shrink-0 place-items-center bg-primary/10 text-primary"
          >
            <component :is="indicador.icono" class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <strong class="block text-2xl font-black">{{ indicador.valor }}</strong>
            <p class="truncate text-xs font-bold">{{ indicador.etiqueta }}</p>
            <p class="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {{ indicador.detalle }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div class="border-b border-border px-5 py-4">
            <h2 class="font-black">Mapa de módulos</h2>
            <p class="text-xs text-muted-foreground">
              Qué está cableado de verdad frente a lo que sigue en mock / pendiente
            </p>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 6" :key="item" class="h-16 w-full" />
          </div>
          <ul v-else-if="snapshot" class="divide-y divide-border">
            <li
              v-for="modulo in snapshot.modulos"
              :key="modulo.id"
              class="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            >
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <span
                  class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center bg-muted"
                >
                  <component
                    :is="iconoEstado(modulo.estado)"
                    class="h-4 w-4"
                  />
                </span>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong>{{ modulo.nombre }}</strong>
                    <Tag
                      :severity="severidadEstado(modulo.estado)"
                      :value="textoEstado(modulo.estado)"
                    />
                  </div>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {{ modulo.descripcion }}
                  </p>
                  <p class="mt-1 text-xs font-medium text-foreground/80">
                    {{ modulo.detalle }}
                  </p>
                </div>
              </div>
              <Button
                v-if="modulo.ruta"
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="router.push(modulo.ruta)"
              >
                Abrir
              </Button>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div class="grid gap-6 self-start">
        <Card class="border-border bg-card">
          <CardContent class="space-y-4 p-5">
            <div class="flex items-center gap-3">
              <ShieldCheck class="h-5 w-5 text-primary" />
              <div>
                <h2 class="font-black">Rol del superadmin</h2>
                <p class="text-xs text-muted-foreground">
                  Acciones reales en esta fase
                </p>
              </div>
            </div>
            <ul class="space-y-2 text-sm leading-6 text-muted-foreground">
              <li>· Gobernar organizaciones, licencias y facturación B2B</li>
              <li>· Asignar accesos / perfiles en la principal</li>
              <li>· Revisar y publicar catálogo Academy (secundaria)</li>
              <li>· Verificar conexión secundaria y sync de membresías</li>
              <li>· Auditar configuración y eventos</li>
            </ul>
            <div class="flex flex-wrap gap-2">
              <Button size="sm" @click="router.push('/admin/organizaciones')">
                Organizaciones
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="router.push('/admin/cursos')"
              >
                Cursos
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="router.push('/admin/accesos')"
              >
                Accesos
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="space-y-4 p-5">
            <div class="flex items-center gap-3">
              <Award class="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <div>
                <h2 class="font-black">Certificados</h2>
                <p class="text-xs text-muted-foreground">
                  Verificación pública (sin listado global admin aún)
                </p>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              El alumno lista/emite desde Academy; el índice público vive en la
              principal. Aquí no inventamos filas demo.
            </p>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/admin/certificados')"
            >
              Emitir certificados
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/certificados/verificar/demo')"
            >
              Abrir verificador
            </Button>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="space-y-4 p-5">
            <div class="flex items-center gap-3">
              <ShoppingCart class="h-5 w-5 text-amber-700 dark:text-amber-300" />
              <div>
                <h2 class="font-black">Marketplace B2C</h2>
                <p class="text-xs text-muted-foreground">
                  Órdenes viven en secundaria (alumno)
                </p>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              No hay RPC/admin list de órdenes Izipay. El cobro se opera desde el
              carrito del estudiante + Edges
              <code class="text-xs">izipay-*</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>






