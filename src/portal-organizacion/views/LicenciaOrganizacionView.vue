<script setup lang="ts">
import { AlertTriangle, CalendarDays, Database, RefreshCw, ShieldCheck, UsersRound } from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, reactive, ref } from "vue";
import {
  organizacionService,
  type LicenciaOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const cargando = ref(true);
const modal = ref(false);
const mensaje = ref("");
const licencia = ref<LicenciaOrganizacion | null>(null);
const ampliacion = reactive({ recurso: "usuarios", cantidad: 100, renovar: true });
const recursos = [
  { label: "Usuarios activos", value: "usuarios" },
  { label: "Docentes", value: "docentes" },
  { label: "Cursos", value: "cursos" },
  { label: "Almacenamiento", value: "almacenamiento" },
];
const iconos = { usuarios: UsersRound, docentes: ShieldCheck, cursos: Database, almacenamiento: Database };

onMounted(cargar);
async function cargar() {
  cargando.value = true;
  try { licencia.value = await organizacionService.obtenerLicencia(); }
  finally { cargando.value = false; }
}
const consumoUsuarios = computed(() => licencia.value?.consumos.find((item) => item.id === "usuarios"));
const porcentajeUsuarios = computed(() => {
  const consumo = consumoUsuarios.value;
  return consumo ? Math.round((consumo.utilizado / consumo.limite) * 100) : 0;
});
function fechaLegible(fecha?: string) {
  return fecha ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`)) : "—";
}
async function guardar() {
  if (!licencia.value) return;
  const actualizada: LicenciaOrganizacion = JSON.parse(JSON.stringify(licencia.value));
  const consumo = actualizada.consumos.find((item) => item.id === ampliacion.recurso);
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
  <section class="mx-auto grid max-w-300 gap-6">
    <div><h1 class="text-2xl font-black">Licencia y consumo</h1><p class="mt-1 text-sm text-muted-foreground">Controla los límites y vigencia de tu plan empresarial.</p></div>
    <div v-if="cargando" class="grid gap-4"><Skeleton height="15rem" /><div class="grid gap-4 sm:grid-cols-2"><Skeleton v-for="item in 4" :key="item" height="10rem" /></div></div>
    <template v-else-if="licencia">
      <p v-if="mensaje" class="border-l-4 border-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{{ mensaje }}</p>
      <Card class="overflow-hidden border-border bg-card">
        <div class="bg-linear-to-r from-[#071F52] to-[#0B3A78] p-7 text-white">
          <div class="flex flex-wrap justify-between gap-4"><div><p class="text-xs uppercase tracking-wider text-blue-200">Plan actual</p><h2 class="mt-2 text-3xl font-black">{{ licencia.plan }}</h2><p class="mt-2 text-sm text-blue-100">{{ licencia.descripcion }}</p></div><Button class="self-center bg-white text-primary hover:bg-white/90" @click="modal = true"><RefreshCw class="h-4 w-4" />Renovar o ampliar</Button></div>
        </div>
        <CardContent class="grid gap-5 p-6 sm:grid-cols-2"><div class="flex gap-3"><CalendarDays class="h-5 w-5 text-primary" /><div><b>Vigencia</b><p class="text-sm text-muted-foreground">{{ fechaLegible(licencia.inicio) }} — {{ fechaLegible(licencia.fin) }}</p></div></div><div class="flex gap-3"><ShieldCheck class="h-5 w-5 text-emerald-700 dark:text-emerald-400" /><div><b>Estado {{ licencia.estado.toLowerCase() }}</b><p class="text-sm text-muted-foreground">Servicios configurados para la organización</p></div></div></CardContent>
      </Card>
      <div class="grid gap-4 sm:grid-cols-2">
        <Card v-for="consumo in licencia.consumos" :key="consumo.id" class="border-border bg-card"><CardContent class="p-5"><div class="flex justify-between gap-3"><div class="flex gap-2"><component :is="iconos[consumo.id as keyof typeof iconos] ?? Database" class="h-5 w-5 text-primary" /><b>{{ consumo.etiqueta }}</b></div><strong>{{ consumo.utilizado }} / {{ consumo.limite }}</strong></div><Progress :model-value="(consumo.utilizado / consumo.limite) * 100" class="mt-4 h-2" /><p class="mt-2 text-xs text-muted-foreground">{{ consumo.limite - consumo.utilizado }} {{ consumo.unidad }} disponibles</p></CardContent></Card>
      </div>
      <div v-if="porcentajeUsuarios >= 80" class="flex gap-3 border border-amber-300 bg-amber-500/10 p-4"><AlertTriangle class="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" /><p class="text-sm text-amber-900 dark:text-amber-200">Tu organización utiliza el {{ porcentajeUsuarios }}% de las licencias de usuario. Considera ampliar el plan antes de invitar más colaboradores.</p></div>
    </template>

    <Dialog v-model:visible="modal" modal header="Renovar o ampliar licencia" :style="{ width: 'min(92vw, 520px)' }"><div class="grid gap-4"><label class="grid gap-2 text-sm font-bold">Recurso<Select v-model="ampliacion.recurso" :options="recursos" option-label="label" option-value="value" fluid /></label><label class="grid gap-2 text-sm font-bold">Aumentar límite en<InputNumber v-model="ampliacion.cantidad" :min="1" fluid /></label><label class="flex items-center gap-3 border border-border p-3 text-sm font-bold"><input v-model="ampliacion.renovar" type="checkbox" />Renovar la vigencia por un año</label><p class="text-xs text-muted-foreground">Esta operación queda guardada localmente y conserva el mismo contrato esperado por el backend.</p></div><template #footer><Button variant="outline" @click="modal = false">Cancelar</Button><Button @click="guardar">Confirmar cambios</Button></template></Dialog>
  </section>
</template>
