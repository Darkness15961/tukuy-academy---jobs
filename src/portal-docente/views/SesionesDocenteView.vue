<script setup lang="ts">
import {
  CalendarDays,
  Clock3,
  Link2,
  Plus,
  UsersRound,
  Video,
  XCircle,
} from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";
import {
  docenteService,
  type SesionDocente,
} from "@/api/services/docente.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";
const modal = ref(false);
const cargando = ref(true);
const sesiones = ref<SesionDocente[]>([]);
const cursos = ref<string[]>([]);
const sesionSeleccionada = ref<SesionDocente>();
const nuevaSesion = reactive({
  titulo: "",
  curso: "Gestión digital de obras",
  fechaHora: "",
  duracion: "60 min",
});

onMounted(async () => {
  try {
    const [listaSesiones, listaCursos] = await Promise.all([
      docenteService.sesiones.listar(),
      docenteService.cursos.listar(),
    ]);
    sesiones.value = listaSesiones;
    cursos.value = listaCursos.map((curso) => curso.titulo);
    if (cursos.value[0]) nuevaSesion.curso = cursos.value[0];
  } finally {
    cargando.value = false;
  }
});

async function programar() {
  if (!nuevaSesion.titulo.trim() || !nuevaSesion.fechaHora) return;
  const fecha = new Date(nuevaSesion.fechaHora);
  const sesion: SesionDocente = {
    id: `s-${Date.now()}`,
    titulo: nuevaSesion.titulo.trim(),
    curso: nuevaSesion.curso,
    fecha: new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
    })
      .format(fecha)
      .toUpperCase()
      .replace(".", ""),
    hora: new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(fecha),
    duracion: nuevaSesion.duracion,
    inscritos: 0,
    estado: "PROGRAMADA",
    fechaHoraIso: fecha.toISOString(),
  };
  await docenteService.sesiones.crear(sesion);
  sesiones.value.push(sesion);
  Object.assign(nuevaSesion, {
    titulo: "",
    curso: cursos.value[0] ?? "",
    fechaHora: "",
    duracion: "60 min",
  });
  modal.value = false;
}

async function iniciar(sesion: SesionDocente) {
  const actualizada = await docenteService.iniciarSesion(sesion.id);
  const indice = sesiones.value.findIndex((item) => item.id === sesion.id);
  if (indice >= 0) sesiones.value[indice] = actualizada;
  sesionSeleccionada.value = actualizada;
}

async function cancelar(sesion: SesionDocente) {
  const actualizada = await docenteService.cancelarSesion(sesion.id);
  const indice = sesiones.value.findIndex((item) => item.id === sesion.id);
  if (indice >= 0) sesiones.value[indice] = actualizada;
  sesionSeleccionada.value = undefined;
}

function accionSesion(sesion: SesionDocente) {
  if (sesion.estado === "HOY") void iniciar(sesion);
  else sesionSeleccionada.value = sesion;
}
</script>
<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Sesiones en vivo</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Programa encuentros, comparte el acceso y controla la asistencia.
        </p>
      </div>
      <Button class="bg-primary" @click="modal = true"
        ><Plus class="h-4 w-4" />Programar sesión</Button
      >
    </div>
    <div v-if="cargando" class="grid gap-4 md:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-72 w-full" />
    </div>
    <div v-else class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="s in sesiones"
        :key="s.id"
        class="overflow-hidden border-border bg-card"
        :class="
          s.estado === 'HOY'
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary/40'
        "
        ><CardContent class="p-5"
          ><div class="flex items-start justify-between">
            <div class="bg-primary/10 px-3 py-2 text-center text-primary">
              <strong class="block text-lg">{{ s.fecha.split(" ")[0] }}</strong
              ><span class="text-xs">{{ s.fecha.split(" ")[1] }}</span>
            </div>
            <Badge
              :class="
                s.estado === 'HOY' || s.estado === 'EN_VIVO'
                  ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                  : s.estado === 'CANCELADA'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              "
              >{{ s.estado }}</Badge
            >
          </div>
          <h2 class="mt-5 text-lg font-black">{{ s.titulo }}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{{ s.curso }}</p>
          <div class="mt-5 grid gap-2 text-sm text-muted-foreground">
            <span class="flex gap-2"
              ><Clock3 class="h-4 w-4" />{{ s.hora }} · {{ s.duracion }}</span
            ><span class="flex gap-2"
              ><UsersRound class="h-4 w-4" />{{ s.inscritos }} inscritos</span
            >
          </div>
          <Button
            class="mt-5 w-full"
            :variant="s.estado === 'HOY' ? 'default' : 'outline'"
            :disabled="s.estado === 'CANCELADA'"
            @click="accionSesion(s)"
            ><Video class="h-4 w-4" />{{
              s.estado === "HOY"
                ? "Iniciar sesión"
                : s.estado === "EN_VIVO"
                  ? "Sesión en vivo"
                  : "Ver detalles"
            }}</Button
          ></CardContent
        ></Card
      >
    </div>
    <Card class="border-border bg-card"
      ><CardContent class="flex items-center gap-4 p-5"
        ><CalendarDays class="h-10 w-10 text-primary" />
        <div>
          <h2 class="font-black">Calendario docente</h2>
          <p class="text-sm text-muted-foreground">
            {{ sesiones.length }} sesiones programadas y 1 grabación pendiente
            de publicar.
          </p>
        </div></CardContent
      ></Card
    >
    <div
      v-if="modal"
      class="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 p-5"
      @click.self="modal = false"
    >
      <Card class="w-full max-w-lg bg-card"
        ><CardContent class="p-6"
          ><h2 class="text-xl font-black">Programar nueva sesión</h2>
          <div class="mt-5 grid gap-4">
            <input
              v-model="nuevaSesion.titulo"
              class="h-11 rounded-md border border-border bg-card px-3 text-foreground"
              placeholder="Título de la sesión"
            /><select
              v-model="nuevaSesion.curso"
              class="h-11 rounded-md border border-border bg-card px-3 text-foreground"
            >
              <option v-for="curso in cursos" :key="curso" :value="curso">
                {{ curso }}
              </option></select
            ><input
              v-model="nuevaSesion.fechaHora"
              class="h-11 rounded-md border border-border bg-card px-3 text-foreground"
              type="datetime-local"
            />
            <div class="flex justify-end gap-2">
              <Button variant="outline" @click="modal = false">Cancelar</Button
              ><Button @click="programar">Programar</Button>
            </div>
          </div></CardContent
        ></Card
      >
    </div>
    <div
      v-if="sesionSeleccionada"
      class="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-5"
      @click.self="sesionSeleccionada = undefined"
    >
      <Card class="w-full max-w-lg border-border bg-card shadow-2xl">
        <CardContent class="p-6">
          <Badge>{{ sesionSeleccionada.estado }}</Badge>
          <h2 class="mt-3 text-xl font-black">
            {{ sesionSeleccionada.titulo }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ sesionSeleccionada.curso }}
          </p>
          <div class="mt-5 grid gap-3 border-y border-border py-4 text-sm">
            <span
              ><Clock3 class="mr-2 inline h-4 w-4" />{{
                sesionSeleccionada.fecha
              }}
              · {{ sesionSeleccionada.hora }} ·
              {{ sesionSeleccionada.duracion }}</span
            >
            <span
              ><UsersRound class="mr-2 inline h-4 w-4" />{{
                sesionSeleccionada.inscritos
              }}
              inscritos · {{ sesionSeleccionada.asistentes ?? 0 }} asistentes
              registrados</span
            >
            <span v-if="sesionSeleccionada.enlace"
              ><Link2 class="mr-2 inline h-4 w-4" />{{
                sesionSeleccionada.enlace
              }}</span
            >
          </div>
          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" @click="sesionSeleccionada = undefined"
              >Cerrar</Button
            >
            <Button
              v-if="
                !['FINALIZADA', 'CANCELADA'].includes(sesionSeleccionada.estado)
              "
              variant="outline"
              class="text-red-600"
              @click="cancelar(sesionSeleccionada)"
              ><XCircle class="h-4 w-4" />Cancelar sesión</Button
            >
            <Button
              v-if="['HOY', 'PROGRAMADA'].includes(sesionSeleccionada.estado)"
              @click="iniciar(sesionSeleccionada)"
              ><Video class="h-4 w-4" />Iniciar ahora</Button
            >
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
