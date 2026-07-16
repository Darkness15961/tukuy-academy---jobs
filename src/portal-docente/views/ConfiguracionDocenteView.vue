<script setup lang="ts">
import { Bell, Save, ShieldCheck, UserRound } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";
import {
  docenteService,
  type ConfiguracionDocente,
} from "@/api/services/docente.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
const cargando = ref(true);
const guardado = ref(false);
const configuracion = reactive<ConfiguracionDocente>({
  nombre: "",
  especialidad: "",
  biografia: "",
  avisos: true,
  autenticacionDosPasos: false,
  alertasInicioSesion: true,
  zonaHoraria: "America/Lima",
});

onMounted(async () => {
  try {
    Object.assign(configuracion, await docenteService.obtenerConfiguracion());
  } finally {
    cargando.value = false;
  }
});

async function guardar() {
  await docenteService.guardarConfiguracion({ ...configuracion });
  guardado.value = true;
  setTimeout(() => (guardado.value = false), 2000);
}
</script>
<template>
  <section class="mx-auto grid max-w-4xl gap-6">
    <div>
      <h1 class="text-2xl font-black">Configuración docente</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Administra tu identidad, preferencias y seguridad.
      </p>
    </div>
    <div v-if="cargando" class="grid gap-4">
      <Skeleton v-for="item in 3" :key="item" class="h-44 w-full" />
    </div>
    <template v-else>
      <Card class="border-border bg-card"
        ><CardContent class="p-6"
          ><div class="flex gap-3">
            <UserRound class="h-6 w-6 text-primary" />
            <div>
              <h2 class="font-black">Perfil público</h2>
              <p class="text-xs text-muted-foreground">
                Información visible para tus estudiantes.
              </p>
            </div>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold"
              >Nombre docente<Input v-model="configuracion.nombre" /></label
            ><label class="grid gap-2 text-sm font-bold"
              >Especialidad<Input v-model="configuracion.especialidad" /></label
            ><label class="grid gap-2 text-sm font-bold sm:col-span-2"
              >Biografía<textarea
                v-model="configuracion.biografia"
                class="min-h-28 rounded-md border border-border bg-card p-3 font-normal text-foreground"
              />
            </label></div></CardContent></Card
      ><Card
        class="overflow-hidden border-border border-t-4 border-t-accent bg-card"
        ><CardContent class="flex items-center gap-4 p-6"
          ><Bell class="h-6 w-6 text-accent" />
          <div class="flex-1">
            <h2 class="font-black">Notificaciones académicas</h2>
            <p class="text-xs text-muted-foreground">
              Recibir alertas de entregas, mensajes y sesiones.
            </p>
          </div>
          <button
            class="h-6 w-11 rounded-full p-1 transition"
            :class="
              configuracion.avisos ? 'bg-primary' : 'bg-muted-foreground/40'
            "
            @click="configuracion.avisos = !configuracion.avisos"
          >
            <span
              class="block h-4 w-4 rounded-full bg-white transition"
              :class="configuracion.avisos ? 'translate-x-5' : ''"
            /></button></CardContent></Card
      ><Card class="border-border bg-card"
        ><CardContent class="flex gap-4 p-6"
          ><ShieldCheck
            class="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 class="font-black">Seguridad</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Tu cuenta utiliza autenticación y permisos asociados a Academia
              Tukuy.
            </p>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                class="flex items-center justify-between gap-3 border border-border bg-muted/40 p-3 text-sm"
              >
                <span class="font-bold">Autenticación en dos pasos</span>
                <button
                  type="button"
                  class="h-6 w-11 rounded-full p-1 transition"
                  :class="
                    configuracion.autenticacionDosPasos
                      ? 'bg-primary'
                      : 'bg-muted-foreground/40'
                  "
                  @click="
                    configuracion.autenticacionDosPasos =
                      !configuracion.autenticacionDosPasos
                  "
                >
                  <span
                    class="block h-4 w-4 rounded-full bg-white transition"
                    :class="
                      configuracion.autenticacionDosPasos ? 'translate-x-5' : ''
                    "
                  />
                </button>
              </label>
              <label
                class="flex items-center justify-between gap-3 border border-border bg-muted/40 p-3 text-sm"
              >
                <span class="font-bold">Alertas de inicio de sesión</span>
                <button
                  type="button"
                  class="h-6 w-11 rounded-full p-1 transition"
                  :class="
                    configuracion.alertasInicioSesion
                      ? 'bg-primary'
                      : 'bg-muted-foreground/40'
                  "
                  @click="
                    configuracion.alertasInicioSesion =
                      !configuracion.alertasInicioSesion
                  "
                >
                  <span
                    class="block h-4 w-4 rounded-full bg-white transition"
                    :class="
                      configuracion.alertasInicioSesion ? 'translate-x-5' : ''
                    "
                  />
                </button>
              </label>
            </div>
            <label class="mt-3 grid gap-2 text-sm font-bold">
              Zona horaria
              <Input v-model="configuracion.zonaHoraria" />
            </label></div></CardContent
      ></Card>
      <div class="flex justify-end">
        <span
          v-if="guardado"
          class="mr-3 self-center text-sm text-emerald-700 dark:text-emerald-400"
          >Cambios guardados</span
        ><Button @click="guardar"
          ><Save class="h-4 w-4" />Guardar cambios</Button
        >
      </div>
    </template>
  </section>
</template>
