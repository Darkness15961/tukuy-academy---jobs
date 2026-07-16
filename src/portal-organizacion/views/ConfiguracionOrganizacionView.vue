<script setup lang="ts">
import { Building2, Link2, Save, ShieldCheck } from "lucide-vue-next";
import Dialog from "primevue/dialog";
import Skeleton from "primevue/skeleton";
import ToggleSwitch from "primevue/toggleswitch";
import { onMounted, reactive, ref } from "vue";
import {
  organizacionService,
  type IntegracionOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
const cargando = ref(true);
const guardado = ref(false);
const error = ref("");
const mostrarIntegraciones = ref(false);
const integraciones = ref<IntegracionOrganizacion[]>([]);
const { actualizarNombreOrganizacion } = useContextoSesion();
const configuracion = reactive({
  nombre: "",
  ruc: "",
  dominio: "",
  zonaHoraria: "America/Lima",
  restringirDominio: true,
});

onMounted(async () => {
  try {
    const [datos, conexiones] = await Promise.all([
      organizacionService.obtenerConfiguracion(),
      organizacionService.obtenerIntegraciones(),
    ]);
    Object.assign(configuracion, datos);
    integraciones.value = conexiones;
  } finally {
    cargando.value = false;
  }
});

async function guardar() {
  error.value = "";
  if (!configuracion.nombre.trim()) {
    error.value = "El nombre de la organización es obligatorio.";
    return;
  }
  if (!/^\d{11}$/.test(configuracion.ruc)) {
    error.value = "El RUC debe contener 11 dígitos.";
    return;
  }
  await organizacionService.guardarConfiguracion({ ...configuracion });
  actualizarNombreOrganizacion(configuracion.nombre);
  guardado.value = true;
  setTimeout(() => (guardado.value = false), 2000);
}

async function guardarIntegraciones() {
  const endpointInvalido = integraciones.value.some(
    (item) => item.activa && item.endpoint && !/^https?:\/\//.test(item.endpoint),
  );
  if (endpointInvalido) {
    error.value = "Las direcciones activas deben comenzar con http:// o https://.";
    return;
  }
  await organizacionService.guardarIntegraciones(
    integraciones.value.map((item) => ({ ...item })),
  );
  mostrarIntegraciones.value = false;
  guardado.value = true;
  setTimeout(() => (guardado.value = false), 2000);
}
</script>
<template>
  <section class="mx-auto grid max-w-4xl gap-6">
    <div>
      <h1 class="text-2xl font-black">Configuración de la organización</h1>
      <p class="mt-1 text-sm text-[#64748B]">
        Personaliza la identidad, acceso e integraciones de tu organización.
      </p>
    </div>
    <div v-if="cargando" class="grid gap-4">
      <Skeleton v-for="item in 3" :key="item" class="h-44 w-full" />
    </div>
    <template v-else>
    <Card class="border-border bg-card"
      ><CardContent class="p-6"
        ><div class="flex gap-3">
          <Building2 class="h-6 w-6 text-blue-700" />
          <div>
            <h2 class="font-black">Información general</h2>
            <p class="text-xs text-[#64748B]">
              Datos visibles para colaboradores y docentes.
            </p>
          </div>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold"
            >Nombre<Input v-model="configuracion.nombre" /></label
          ><label class="grid gap-2 text-sm font-bold"
            >RUC<Input v-model="configuracion.ruc" /></label
          ><label class="grid gap-2 text-sm font-bold"
            >Dominio corporativo<Input v-model="configuracion.dominio" /></label
          ><label class="grid gap-2 text-sm font-bold"
            >Zona horaria<select
              v-model="configuracion.zonaHoraria"
              class="h-10 border border-input bg-background px-3 font-normal"
            >
              <option value="America/Lima">Lima (UTC-5)</option>
              <option value="America/Bogota">Bogotá (UTC-5)</option>
              <option value="America/Santiago">Santiago</option>
              <option value="America/Mexico_City">Ciudad de México</option>
            </select></label
          >
        </div></CardContent
      ></Card
    ><Card class="border-border bg-card"
      ><CardContent class="flex gap-4 p-6"
        ><ShieldCheck class="h-6 w-6 text-emerald-700" />
        <div class="flex-1">
          <h2 class="font-black">Acceso y seguridad</h2>
          <p class="text-sm text-[#64748B]">
            Restringir invitaciones a correos del dominio {{ configuracion.dominio }}.
          </p>
        </div>
        <ToggleSwitch v-model="configuracion.restringirDominio" /></CardContent></Card
    ><Card class="border-border bg-card"
      ><CardContent class="flex gap-4 p-6"
        ><Link2 class="h-6 w-6 text-violet-700" />
        <div class="flex-1">
          <h2 class="font-black">Integraciones</h2>
          <p class="text-sm text-[#64748B]">
            Tukuy Obra · SIADEG · API empresarial.
          </p>
        </div>
        <Button variant="outline" @click="mostrarIntegraciones = true">Gestionar</Button></CardContent
      ></Card
    >
    <div class="flex justify-end gap-3">
      <span v-if="error" class="self-center text-sm text-red-600">{{ error }}</span>
      <span v-if="guardado" class="self-center text-sm text-emerald-700"
        >Cambios guardados</span
      ><Button @click="guardar"><Save class="h-4 w-4" />Guardar cambios</Button>
    </div>
    </template>

    <Dialog
      v-model:visible="mostrarIntegraciones"
      modal
      header="Integraciones empresariales"
      :style="{ width: 'min(92vw, 680px)' }"
    >
      <div class="grid gap-4">
        <article
          v-for="integracion in integraciones"
          :key="integracion.id"
          class="border border-border bg-muted/40 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-black">{{ integracion.nombre }}</h3>
              <p class="mt-1 text-xs text-muted-foreground">{{ integracion.descripcion }}</p>
            </div>
            <ToggleSwitch v-model="integracion.activa" />
          </div>
          <label v-if="integracion.activa" class="mt-4 grid gap-2 text-sm font-bold">
            Endpoint
            <Input
              v-model="integracion.endpoint"
              placeholder="https://api.empresa.pe/v1"
            />
          </label>
        </article>
      </div>
      <template #footer>
        <Button variant="outline" @click="mostrarIntegraciones = false">Cancelar</Button>
        <Button @click="guardarIntegraciones">Guardar integraciones</Button>
      </template>
    </Dialog>
  </section>
</template>
