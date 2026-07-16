<script setup lang="ts">
import {
  Bell,
  Mail,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-vue-next";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { onMounted, reactive, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { administracionService } from "@/api/services/administracion.service";

const cargando = ref(true);
const guardado = ref(false);
const configuracion = reactive({
  nombre: "Tukuy Academy",
  correoSoporte: "soporte@tukuy.pe",
  moneda: "PEN",
  zonaHoraria: "America/Lima",
  revisionObligatoria: true,
  suspenderAlVencer: true,
  avisosVencimiento: true,
  avisosCursos: true,
  dobleFactor: true,
});

onMounted(async () => {
  try {
    Object.assign(
      configuracion,
      await administracionService.obtenerConfiguracion(),
    );
  } finally {
    cargando.value = false;
  }
});

async function guardar() {
  await administracionService.guardarConfiguracion({ ...configuracion });
  guardado.value = true;
  window.setTimeout(() => (guardado.value = false), 3000);
}
</script>

<template>
  <section class="mx-auto grid max-w-300 gap-6">
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
        Parámetros globales
      </p>
      <h1 class="mt-2 text-3xl font-black">Configuración</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Define reglas transversales de operación, revisión, seguridad y
        notificaciones.
      </p>
    </div>

    <div
      v-if="guardado"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      La configuración global fue guardada correctamente.
    </div>

    <div v-if="cargando" class="grid gap-6 lg:grid-cols-2">
      <Skeleton v-for="item in 4" :key="item" class="h-64 w-full" />
    </div>
    <div v-else class="grid gap-6 lg:grid-cols-2">
      <Card class="border-border bg-card"
        ><CardContent class="p-6"
          ><div class="flex items-center gap-3">
            <SlidersHorizontal class="h-5 w-5 text-violet-700" />
            <div>
              <h2 class="font-black">Datos de plataforma</h2>
              <p class="text-xs text-muted-foreground">
                Identidad y configuración regional
              </p>
            </div>
          </div>
          <div class="mt-6 grid gap-4">
            <label
              ><span
                class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
                >Nombre comercial</span
              ><InputText
                v-model="configuracion.nombre"
                class="filtro-control w-full" /></label
            ><label
              ><span
                class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
                >Correo de soporte</span
              ><InputText
                v-model="configuracion.correoSoporte"
                type="email"
                class="filtro-control w-full"
            /></label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label
                ><span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
                  >Moneda</span
                ><Select
                  v-model="configuracion.moneda"
                  :options="['PEN', 'USD']"
                  class="filtro-control w-full" /></label
              ><label
                ><span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
                  >Zona horaria</span
                ><Select
                  v-model="configuracion.zonaHoraria"
                  :options="[
                    'America/Lima',
                    'America/Bogota',
                    'America/Santiago',
                  ]"
                  class="filtro-control w-full"
              /></label>
            </div></div></CardContent
      ></Card>

      <Card class="border-border bg-card"
        ><CardContent class="p-6"
          ><div class="flex items-center gap-3">
            <ShieldCheck class="h-5 w-5 text-violet-700" />
            <div>
              <h2 class="font-black">Gobierno y seguridad</h2>
              <p class="text-xs text-muted-foreground">
                Reglas críticas de la operación
              </p>
            </div>
          </div>
          <div class="mt-6 divide-y divide-[#E8EDF5]">
            <label
              v-for="item in [
                {
                  clave: 'revisionObligatoria',
                  titulo: 'Revisión obligatoria',
                  detalle: 'Todo curso público necesita aprobación Tukuy.',
                },
                {
                  clave: 'suspenderAlVencer',
                  titulo: 'Suspensión por vencimiento',
                  detalle: 'Limita el acceso cuando una licencia ha vencido.',
                },
                {
                  clave: 'dobleFactor',
                  titulo: 'Doble factor administrativo',
                  detalle: 'Exige verificación adicional a administradores.',
                },
              ]"
              :key="item.clave"
              class="flex cursor-pointer items-center gap-4 py-4"
              ><div class="flex-1">
                <p class="text-sm font-bold">{{ item.titulo }}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ item.detalle }}
                </p>
              </div>
              <ToggleSwitch
                v-model="
                  configuracion[item.clave as keyof typeof configuracion]
                "
            /></label></div></CardContent
      ></Card>

      <Card class="border-border bg-card lg:col-span-2"
        ><CardContent class="p-6"
          ><div class="flex items-center gap-3">
            <Bell class="h-5 w-5 text-violet-700" />
            <div>
              <h2 class="font-black">Alertas operativas</h2>
              <p class="text-xs text-muted-foreground">
                Notificaciones para el equipo Tukuy
              </p>
            </div>
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label
              class="flex cursor-pointer items-center gap-4 border border-border p-4"
              ><Mail class="h-5 w-5 text-blue-700" />
              <div class="flex-1">
                <p class="text-sm font-bold">Vencimiento de licencias</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Avisar 30, 15 y 5 días antes.
                </p>
              </div>
              <ToggleSwitch v-model="configuracion.avisosVencimiento" /></label
            ><label
              class="flex cursor-pointer items-center gap-4 border border-border p-4"
              ><Mail class="h-5 w-5 text-blue-700" />
              <div class="flex-1">
                <p class="text-sm font-bold">Cursos enviados</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Avisar al equipo de revisión.
                </p>
              </div>
              <ToggleSwitch v-model="configuracion.avisosCursos"
            /></label></div></CardContent
      ></Card>
    </div>

    <div
      class="sticky bottom-4 flex justify-end border border-border bg-card/95 p-4 shadow-xl backdrop-blur"
    >
      <Button
        class="bg-violet-800 px-6 hover:bg-violet-900"
        :disabled="cargando"
        @click="guardar"
        ><Save class="h-4 w-4" /> Guardar configuración</Button
      >
    </div>
  </section>
</template>
