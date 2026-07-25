<script setup lang="ts">
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import {
  organizacionService,
  type LicenciaOrganizacion,
} from "@/api/services/organizacion.service";
import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useContextoSesion } from "@/composables/useContextoSesion";

const router = useRouter();
const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const modal = ref(false);
const mensaje = ref("");
const licencia = ref<LicenciaOrganizacion | null>(null);
const ampliacion = reactive({
  recurso: "usuarios",
  cantidad: 100,
  renovar: true,
});

const recursos = [
  { label: "Usuarios activos", value: "usuarios" },
  { label: "Docentes", value: "docentes" },
  { label: "Cursos", value: "cursos" },
  { label: "Almacenamiento", value: "almacenamiento" },
];

const iconos = {
  usuarios: UsersRound,
  docentes: ShieldCheck,
  cursos: BookOpen,
  almacenamiento: HardDrive,
} as const;

const diapositivasPortada = [
  {
    imagen: "/img/portada-planes-empresariales.png",
    rotulo: "Tu plan corporativo define cupos, vigencia y capacidad de formación",
  },
  {
    imagen: "/img/portal-organizacion.png",
    rotulo: "Monitorea el consumo real de usuarios, docentes y cursos",
  },
  {
    imagen: "/img/portal-administracion.png",
    rotulo: "Renueva o amplía antes de quedarte sin licencias disponibles",
  },
  {
    imagen: "/img/tukuyAcademia.png",
    rotulo: "Licencia activa = operación continua en Tukuy Academy",
  },
];

onMounted(cargar);

async function cargar() {
  cargando.value = true;
  try {
    licencia.value = await organizacionService.obtenerLicencia();
  } finally {
    cargando.value = false;
  }
}

const nombreOrganizacion = computed(
  () =>
    contextoActivo.value?.organizacionNombre ??
    "COLEGIO DE INGENIEROS CUSCO",
);

const consumoUsuarios = computed(() =>
  licencia.value?.consumos.find((item) => item.id === "usuarios"),
);

const porcentajeUsuarios = computed(() => {
  const consumo = consumoUsuarios.value;
  return consumo ? Math.round((consumo.utilizado / consumo.limite) * 100) : 0;
});

const diasRestantes = computed(() => {
  if (!licencia.value?.fin) return 0;
  const fin = new Date(`${licencia.value.fin}T00:00:00Z`).getTime();
  const hoy = Date.now();
  return Math.max(0, Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24)));
});

const licenciasDisponibles = computed(
  () =>
    (consumoUsuarios.value?.limite ?? 0) -
    (consumoUsuarios.value?.utilizado ?? 0),
);

function fechaLegible(fecha?: string) {
  return fecha
    ? new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${fecha}T00:00:00Z`))
    : "—";
}

function tonoEstado(estado: LicenciaOrganizacion["estado"]) {
  if (estado === "ACTIVA") return "success" as const;
  if (estado === "POR_VENCER") return "warning" as const;
  return "danger" as const;
}

function porcentajeConsumo(utilizado: number, limite: number) {
  if (!limite) return 0;
  return Math.min(100, Math.round((utilizado / limite) * 100));
}

async function guardar() {
  if (!licencia.value) return;
  const actualizada: LicenciaOrganizacion = JSON.parse(
    JSON.stringify(licencia.value),
  );
  const consumo = actualizada.consumos.find(
    (item) => item.id === ampliacion.recurso,
  );
  if (consumo) consumo.limite += ampliacion.cantidad;
  if (ampliacion.renovar) {
    const fin = new Date(`${actualizada.fin}T00:00:00Z`);
    fin.setUTCFullYear(fin.getUTCFullYear() + 1);
    actualizada.fin = fin.toISOString().slice(0, 10);
    actualizada.estado = "ACTIVA";
  }
  await organizacionService.guardarLicencia(actualizada);
  licencia.value = actualizada;
  modal.value = false;
  mensaje.value = "La licencia fue actualizada en la simulación local.";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <PortadaPanel
      :diapositivas="diapositivasPortada"
      :etiqueta="nombreOrganizacion"
      titulo="Licencia y consumo"
      descripcion="Revisa vigencia, cupos y uso del plan. Renueva o amplía antes de que el consumo limite nuevas altas."
      texto-accion="Renovar o ampliar"
      texto-accion-secundaria="Facturación"
      :icono-accion="RefreshCw"
      :icono-accion-secundaria="CircleDollarSign"
      etiqueta-accesible="Portada de licencia corporativa"
      @accion="modal = true"
      @accion-secundaria="router.push('/organizacion/facturacion')"
    />

    <div v-if="cargando" class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <Skeleton v-for="item in 4" :key="`c-${item}`" class="h-36 w-full" />
      </div>
    </div>

    <template v-else-if="licencia">
      <p
        v-if="mensaje"
        class="border border-border border-l-4 border-l-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
      >
        {{ mensaje }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Plan actual</p>
            <strong class="mt-1 block text-xl font-black">{{
              licencia.plan
            }}</strong>
            <p class="mt-1 truncate text-[11px] text-muted-foreground">
              {{ licencia.descripcion }}
            </p>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="flex items-center gap-3 p-5">
            <div
              class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
            >
              <ShieldCheck class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-bold text-muted-foreground">Estado</p>
              <Badge
                variant="outline"
                class="mt-1"
                :class="
                  tonoEstado(licencia.estado) === 'success'
                    ? 'border-emerald-300 bg-emerald-500/10 text-emerald-700'
                    : tonoEstado(licencia.estado) === 'warning'
                      ? 'border-amber-300 bg-amber-500/10 text-amber-800'
                      : 'border-red-300 bg-red-500/10 text-red-700'
                "
              >
                {{ licencia.estado.replace("_", " ") }}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="flex items-center gap-3 p-5">
            <div
              class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
            >
              <CalendarDays class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-bold text-muted-foreground">Vigencia</p>
              <strong class="block text-sm font-black">
                {{ fechaLegible(licencia.inicio) }} —
                {{ fechaLegible(licencia.fin) }}
              </strong>
              <p class="text-[11px] text-muted-foreground">
                {{ diasRestantes }} días restantes
              </p>
            </div>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">
              Licencias usuario
            </p>
            <strong class="mt-1 block text-2xl font-black">
              {{ porcentajeUsuarios }}%
            </strong>
            <p class="text-[11px] text-muted-foreground">
              {{ licenciasDisponibles }} disponibles de
              {{ consumoUsuarios?.limite ?? 0 }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div
        v-if="porcentajeUsuarios >= 80"
        class="flex gap-3 border border-border border-l-4 border-l-accent bg-accent/10 p-4"
      >
        <AlertTriangle class="h-5 w-5 shrink-0 text-[#B87A00]" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-black text-foreground">
            Consumo alto de licencias ({{ porcentajeUsuarios }}%)
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Amplía el cupo de usuarios antes de invitar más colaboradores o
            actualizar el plan en facturación.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" @click="modal = true">Ampliar ahora</Button>
            <Button
              size="sm"
              variant="outline"
              @click="router.push('/organizacion/facturacion')"
            >
              Actualizar plan
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="text-lg font-black">Consumo por recurso</h2>
            <p class="text-xs text-muted-foreground">
              Límites del plan frente al uso real de la organización
            </p>
          </div>
          <Button variant="outline" size="sm" @click="modal = true">
            <RefreshCw class="h-4 w-4" />
            Renovar o ampliar
          </Button>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <Card
            v-for="consumo in licencia.consumos"
            :key="consumo.id"
            class="border-border bg-card"
            :class="
              porcentajeConsumo(consumo.utilizado, consumo.limite) >= 85
                ? 'border-t-4 border-t-accent'
                : 'border-t-4 border-t-primary'
            "
          >
            <CardContent class="p-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2">
                  <div
                    class="grid h-10 w-10 place-items-center bg-primary/10 text-primary"
                  >
                    <component
                      :is="
                        iconos[consumo.id as keyof typeof iconos] ?? Database
                      "
                      class="h-5 w-5"
                    />
                  </div>
                  <div>
                    <b class="text-sm">{{ consumo.etiqueta }}</b>
                    <p class="text-[11px] text-muted-foreground">
                      {{ consumo.unidad }}
                    </p>
                  </div>
                </div>
                <strong class="text-sm font-black text-primary">
                  {{ consumo.utilizado }} / {{ consumo.limite }}
                </strong>
              </div>
              <Progress
                :model-value="
                  porcentajeConsumo(consumo.utilizado, consumo.limite)
                "
                class="mt-4 h-2"
              />
              <p class="mt-2 text-xs text-muted-foreground">
                {{ consumo.limite - consumo.utilizado }}
                {{ consumo.unidad }} disponibles ·
                {{ porcentajeConsumo(consumo.utilizado, consumo.limite) }}% en
                uso
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <Dialog
      v-model:visible="modal"
      modal
      header="Renovar o ampliar licencia"
      :style="{ width: 'min(92vw, 520px)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-bold">
          Recurso
          <Select
            v-model="ampliacion.recurso"
            :options="recursos"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Aumentar límite en
          <InputNumber v-model="ampliacion.cantidad" :min="1" fluid />
        </label>
        <label
          class="flex items-center gap-3 border border-border border-l-4 border-l-accent p-3 text-sm font-bold"
        >
          <input v-model="ampliacion.renovar" type="checkbox" />
          Renovar la vigencia por un año
        </label>
        <p class="text-xs text-muted-foreground">
          Esta operación queda guardada localmente y conserva el mismo contrato
          esperado por el backend.
        </p>
      </div>
      <template #footer>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button @click="guardar">Confirmar cambios</Button>
      </template>
    </Dialog>
  </section>
</template>
