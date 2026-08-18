<script setup lang="ts">
import { Bell, Plus, Save, ShieldCheck, Trash2, UserRound } from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import {
  docenteService,
  type ConfiguracionDocente,
} from "@/api/services/docente.service";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
import { inicialesNombre, urlFotoPerfilReal } from "@/lib/foto-perfil";
import { toast } from "@/lib/toast";

const cargando = ref(true);
const guardando = ref(false);
const errorFoto = ref("");
const configuracion = reactive<ConfiguracionDocente>({
  nombre: "",
  cargo: "",
  especialidad: "",
  biografia: "",
  experiencia: [""],
  fotoUrl: undefined,
  avisos: true,
  autenticacionDosPasos: false,
  alertasInicioSesion: true,
  zonaHoraria: "America/Lima",
});

const fotoVisible = computed(() => urlFotoPerfilReal(configuracion.fotoUrl));

onMounted(async () => {
  try {
    const data = await docenteService.obtenerConfiguracion();
    Object.assign(configuracion, data);
    if (!configuracion.experiencia?.length) {
      configuracion.experiencia = [""];
    }
  } finally {
    cargando.value = false;
  }
});

function seleccionarFoto(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  errorFoto.value = "";
  if (!archivo) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
    errorFoto.value = "Usa una fotografía JPG, PNG o WEBP.";
    entrada.value = "";
    return;
  }
  if (archivo.size > 1_000_000) {
    errorFoto.value = "La fotografía debe pesar menos de 1 MB.";
    entrada.value = "";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    configuracion.fotoUrl = String(lector.result ?? "");
  };
  lector.readAsDataURL(archivo);
}

function agregarExperiencia() {
  configuracion.experiencia.push("");
}

function quitarExperiencia(indice: number) {
  configuracion.experiencia.splice(indice, 1);
  if (!configuracion.experiencia.length) configuracion.experiencia.push("");
}

async function guardar() {
  if (guardando.value) return;
  guardando.value = true;
  try {
    const guardada = await docenteService.guardarConfiguracion({
      ...configuracion,
      experiencia: configuracion.experiencia.map((item) => item.trim()).filter(Boolean),
    });
    Object.assign(configuracion, guardada);
    if (!configuracion.experiencia.length) configuracion.experiencia = [""];
    toast.success("Perfil docente guardado.");
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo guardar el perfil.",
    );
  } finally {
    guardando.value = false;
  }
}
</script>
<template>
  <section class="mx-auto grid max-w-4xl gap-6">
    <div>
      <TituloConAyuda
        titulo="Configuración docente"
        clase-titulo="text-2xl font-black"
        ayuda="Este perfil es el que ven los alumnos en la ficha del curso: nombre, foto, cargo y experiencia."
      />
    </div>
    <div v-if="cargando" class="grid gap-4">
      <Skeleton v-for="item in 3" :key="item" class="h-44 w-full" />
    </div>
    <template v-else>
      <Card class="border-border bg-card">
        <CardContent class="p-6">
          <div class="flex gap-3">
            <UserRound class="h-6 w-6 text-primary" />
            <div>
              <h2 class="font-black">Perfil público</h2>
              <p class="text-xs text-muted-foreground">
                Visible en “más detalles” de tus cursos. Si no subes foto, se
                muestran las iniciales de tu nombre.
              </p>
            </div>
          </div>
          <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="grid shrink-0 justify-items-center gap-2">
              <img
                v-if="fotoVisible"
                :src="fotoVisible"
                alt="Foto del docente"
                class="h-24 w-24 rounded-full object-cover"
              />
              <div
                v-else
                class="grid h-24 w-24 place-items-center rounded-full bg-primary/10 text-xl font-black text-primary"
              >
                {{ inicialesNombre(configuracion.nombre) }}
              </div>
              <label class="text-xs font-bold text-primary">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="sr-only"
                  @change="seleccionarFoto"
                />
                Cambiar foto
              </label>
              <p v-if="errorFoto" class="text-xs text-red-600">{{ errorFoto }}</p>
            </div>
            <div class="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <label class="grid gap-2 text-sm font-bold"
                >Nombre
                <Input v-model="configuracion.nombre" placeholder="Tu nombre" />
              </label>
              <label class="grid gap-2 text-sm font-bold"
                >Cargo
                <Input
                  v-model="configuracion.cargo"
                  placeholder="Ej. Docente de seguridad en obra"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold sm:col-span-2"
                >Especialidad
                <Input
                  v-model="configuracion.especialidad"
                  placeholder="Ej. Gestión y control de obras"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold sm:col-span-2"
                >Biografía
                <textarea
                  v-model="configuracion.biografia"
                  class="min-h-28 rounded-md border border-border bg-card p-3 font-normal text-foreground"
                  placeholder="Quién eres y cómo enseñas."
                />
              </label>
            </div>
          </div>
          <div class="mt-6 grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-black">Experiencia profesional</h3>
              <Button type="button" size="sm" variant="ghost" @click="agregarExperiencia">
                <Plus class="h-4 w-4" />
                Añadir
              </Button>
            </div>
            <div
              v-for="(_, indice) in configuracion.experiencia"
              :key="indice"
              class="flex gap-2"
            >
              <Input
                v-model="configuracion.experiencia[indice]"
                placeholder="Ej. 12 años dirigiendo proyectos de infraestructura"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Quitar experiencia"
                @click="quitarExperiencia(indice)"
              >
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card
        class="overflow-hidden border border-border border-t-4 border-t-accent bg-card"
      >
        <CardContent class="flex items-center gap-4 p-6">
          <Bell class="h-6 w-6 text-accent" />
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
            type="button"
            @click="configuracion.avisos = !configuracion.avisos"
          >
            <span
              class="block h-4 w-4 rounded-full bg-white transition"
              :class="configuracion.avisos ? 'translate-x-5' : ''"
            />
          </button>
        </CardContent>
      </Card>
      <Card class="border-border bg-card">
        <CardContent class="flex gap-4 p-6">
          <ShieldCheck class="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
            </label>
          </div>
        </CardContent>
      </Card>
      <div class="flex justify-end">
        <Button :disabled="guardando" @click="guardar">
          <Save class="h-4 w-4" />
          {{ guardando ? "Guardando…" : "Guardar cambios" }}
        </Button>
      </div>
    </template>
  </section>
</template>
