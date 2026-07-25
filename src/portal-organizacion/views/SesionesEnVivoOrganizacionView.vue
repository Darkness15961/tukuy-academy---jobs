<script setup lang="ts">
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link2,
  Mail,
  Plus,
  UsersRound,
  Video,
  XCircle,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";

import { organizacionService } from "@/api/services/organizacion.service";
import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type {
  SesionEnVivoOrganizacion,
} from "@/portal-organizacion/types/sesiones-en-vivo.types";

const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);
const cursos = ref<{ id: string; titulo: string }[]>([]);
const mesVisible = ref(new Date());
const diaSeleccionado = ref<string>(claveDia(new Date()));
const modalProgramar = ref(false);
const sesionDetalle = ref<SesionEnVivoOrganizacion>();
const aviso = ref("");
const procesando = ref(false);

const formulario = reactive({
  titulo: "",
  cursoId: "",
  docenteNombre: "Ing. Diana Chávez",
  docenteEmail: "diana.chavez@cipcusco.org.pe",
  fechaHora: "",
  duracionMinutos: 60,
  emailsInvitados: "",
  notas: "",
});

function claveDia(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseClave(clave: string) {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

async function refrescarSesiones() {
  sesiones.value = await organizacionService.sesionesEnVivo.listar();
}

onMounted(async () => {
  try {
    const cursosCal = contextoActivo.value
      ? sesionesEnVivoCompartidas.listarCursosParaCalendario(
          contextoActivo.value,
        )
      : [];
    const lista = await organizacionService.sesionesEnVivo.listar();
    sesiones.value = lista.sort(
      (a, b) =>
        new Date(a.fechaHoraInicio).getTime() -
        new Date(b.fechaHoraInicio).getTime(),
    );
    cursos.value = cursosCal.map((c) => ({ id: c.id, titulo: c.titulo }));
    if (cursos.value[0]) formulario.cursoId = cursos.value[0].id;
  } finally {
    cargando.value = false;
  }
  window.addEventListener(
    sesionesEnVivoCompartidas.EVENTO,
    refrescarSesiones,
  );
});

onUnmounted(() => {
  window.removeEventListener(
    sesionesEnVivoCompartidas.EVENTO,
    refrescarSesiones,
  );
});

const etiquetaMes = computed(() =>
  new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(mesVisible.value),
);

const celdasCalendario = computed(() => {
  const anio = mesVisible.value.getFullYear();
  const mes = mesVisible.value.getMonth();
  const primero = new Date(anio, mes, 1);
  const inicio = (primero.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: Array<{
    clave: string;
    dia: number;
    fuera: boolean;
    sesiones: SesionEnVivoOrganizacion[];
  }> = [];

  for (let i = 0; i < inicio; i++) {
    const fecha = new Date(anio, mes, -inicio + i + 1);
    const clave = claveDia(fecha);
    celdas.push({
      clave,
      dia: fecha.getDate(),
      fuera: true,
      sesiones: sesionesDelDia(clave),
    });
  }
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const clave = claveDia(new Date(anio, mes, dia));
    celdas.push({
      clave,
      dia,
      fuera: false,
      sesiones: sesionesDelDia(clave),
    });
  }
  while (celdas.length % 7 !== 0) {
    const ultimo = parseClave(celdas[celdas.length - 1]!.clave);
    ultimo.setDate(ultimo.getDate() + 1);
    const clave = claveDia(ultimo);
    celdas.push({
      clave,
      dia: ultimo.getDate(),
      fuera: true,
      sesiones: sesionesDelDia(clave),
    });
  }
  return celdas;
});

function sesionesDelDia(clave: string) {
  return sesiones.value.filter(
    (sesion) => claveDia(new Date(sesion.fechaHoraInicio)) === clave,
  );
}

const sesionesDelDiaSeleccionado = computed(() =>
  sesionesDelDia(diaSeleccionado.value),
);

const proximaSesion = computed(
  () =>
    sesiones.value.find(
      (s) =>
        s.estado === "HOY" ||
        s.estado === "EN_VIVO" ||
        s.estado === "PROGRAMADA",
    ) ?? null,
);

function mesAnterior() {
  const actual = mesVisible.value;
  mesVisible.value = new Date(actual.getFullYear(), actual.getMonth() - 1, 1);
}

function mesSiguiente() {
  const actual = mesVisible.value;
  mesVisible.value = new Date(actual.getFullYear(), actual.getMonth() + 1, 1);
}

function formatoHora(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatoFechaLarga(clave: string) {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseClave(clave));
}

function etiquetaEstado(estado: SesionEnVivoOrganizacion["estado"]) {
  return (
    {
      PROGRAMADA: "Programada",
      HOY: "Hoy",
      EN_VIVO: "En vivo",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    }[estado] ?? estado
  );
}

function claseEstado(estado: SesionEnVivoOrganizacion["estado"]) {
  if (estado === "EN_VIVO" || estado === "HOY") {
    return "border-transparent bg-red-600 text-white";
  }
  if (estado === "FINALIZADA") {
    return "border-transparent bg-emerald-600 text-white";
  }
  if (estado === "CANCELADA") {
    return "border-transparent bg-slate-500 text-white";
  }
  return "border-transparent bg-sky-600 text-white";
}

function abrirProgramar() {
  const base = parseClave(diaSeleccionado.value);
  base.setHours(16, 0, 0, 0);
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  formulario.fechaHora = local;
  formulario.titulo = "";
  formulario.emailsInvitados = "";
  formulario.notas = "";
  if (cursos.value[0]) formulario.cursoId = cursos.value[0].id;
  modalProgramar.value = true;
}

async function programar() {
  if (
    !formulario.titulo.trim() ||
    !formulario.cursoId ||
    !formulario.fechaHora ||
    !formulario.docenteEmail.includes("@")
  ) {
    return;
  }
  const curso = cursos.value.find((c) => c.id === formulario.cursoId);
  if (!curso) return;

  procesando.value = true;
  try {
    const creada = await organizacionService.sesionesEnVivo.programar({
      titulo: formulario.titulo.trim(),
      cursoId: curso.id,
      cursoTitulo: curso.titulo,
      docenteNombre: formulario.docenteNombre.trim(),
      docenteEmail: formulario.docenteEmail.trim(),
      fechaHoraInicio: new Date(formulario.fechaHora).toISOString(),
      duracionMinutos: Number(formulario.duracionMinutos) || 60,
      emailsInvitados: formulario.emailsInvitados
        .split(/[,;\n]+/)
        .map((e) => e.trim())
        .filter(Boolean),
      notas: formulario.notas,
    });
    sesiones.value = [...sesiones.value, creada].sort(
      (a, b) =>
        new Date(a.fechaHoraInicio).getTime() -
        new Date(b.fechaHoraInicio).getTime(),
    );
    diaSeleccionado.value = claveDia(new Date(creada.fechaHoraInicio));
    modalProgramar.value = false;
    sesionDetalle.value = creada;
    aviso.value =
      "Evento compartido creado: visible para admin, docente del curso y alumnos matriculados (Meet + invitaciones).";
  } finally {
    procesando.value = false;
  }
}

async function iniciar(sesion: SesionEnVivoOrganizacion) {
  const actualizada = await organizacionService.sesionesEnVivo.iniciar(
    sesion.id,
  );
  reemplazar(actualizada);
  sesionDetalle.value = actualizada;
}

async function cancelar(sesion: SesionEnVivoOrganizacion) {
  const actualizada = await organizacionService.sesionesEnVivo.cancelar(
    sesion.id,
  );
  reemplazar(actualizada);
  sesionDetalle.value = actualizada;
}

async function reenviar(sesion: SesionEnVivoOrganizacion) {
  const actualizada =
    await organizacionService.sesionesEnVivo.reenviarInvitaciones(sesion.id);
  reemplazar(actualizada);
  sesionDetalle.value = actualizada;
  aviso.value = "Invitaciones reenviadas a correos pendientes (simulado).";
}

function reemplazar(sesion: SesionEnVivoOrganizacion) {
  const indice = sesiones.value.findIndex((item) => item.id === sesion.id);
  if (indice >= 0) sesiones.value[indice] = sesion;
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <TituloConAyuda
          titulo="Sesiones en vivo"
          clase-titulo="text-2xl font-black"
          ayuda="Apartado distinto al catálogo asíncrono. Al programar se crea un evento compartido (Calendar + Meet): lo ven administración, el docente del curso y los alumnos matriculados. Classroom no aplica."
        />
        <p class="mt-1 text-sm text-muted-foreground">
          Fuente única sincronizada ·
          <strong class="text-foreground">Google Calendar + Meet</strong>
          ·
          <RouterLink
            class="font-bold text-primary underline-offset-2 hover:underline"
            to="/organizacion/calendario"
            >abrir calendario a pantalla completa</RouterLink
          >
        </p>
      </div>
      <Button class="bg-primary" @click="abrirProgramar">
        <Plus class="h-4 w-4" />
        Programar sesión
      </Button>
    </div>

    <p
      v-if="aviso"
      class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
    >
      {{ aviso }}
    </p>

    <div v-if="cargando" class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Skeleton class="h-[28rem] w-full" />
      <Skeleton class="h-[28rem] w-full" />
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
      <Card class="border-border bg-card">
        <CardContent class="p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <CalendarDays class="h-5 w-5 text-primary" />
              <h2 class="text-lg font-black capitalize">{{ etiquetaMes }}</h2>
            </div>
            <div class="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                aria-label="Mes anterior"
                @click="mesAnterior"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Mes siguiente"
                @click="mesSiguiente"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            class="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            <span v-for="dia in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="dia">
              {{ dia }}
            </span>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <button
              v-for="celda in celdasCalendario"
              :key="celda.clave"
              type="button"
              class="min-h-18 rounded-md border p-1.5 text-left transition"
              :class="[
                celda.fuera
                  ? 'border-transparent bg-muted/30 text-muted-foreground'
                  : 'border-border bg-card hover:border-primary/40',
                diaSeleccionado === celda.clave
                  ? 'ring-2 ring-primary/50'
                  : '',
                claveDia(new Date()) === celda.clave
                  ? 'bg-primary/5'
                  : '',
              ]"
              @click="diaSeleccionado = celda.clave"
            >
              <span class="text-xs font-bold">{{ celda.dia }}</span>
              <div class="mt-1 space-y-0.5">
                <span
                  v-for="sesion in celda.sesiones.slice(0, 2)"
                  :key="sesion.id"
                  class="block truncate rounded-sm px-1 py-0.5 text-[9px] font-semibold"
                  :class="
                    sesion.estado === 'CANCELADA'
                      ? 'bg-muted text-muted-foreground'
                      : sesion.estado === 'EN_VIVO' || sesion.estado === 'HOY'
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                        : 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                  "
                >
                  {{ formatoHora(sesion.fechaHoraInicio) }}
                  {{ sesion.titulo }}
                </span>
                <span
                  v-if="celda.sesiones.length > 2"
                  class="block text-[9px] text-muted-foreground"
                >
                  +{{ celda.sesiones.length - 2 }} más
                </span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4 content-start">
        <Card
          v-if="proximaSesion"
          class="border-border border-t-4 border-t-accent bg-card"
        >
          <CardContent class="p-5">
            <p class="text-[10px] font-black uppercase tracking-wide text-accent">
              Próxima / activa
            </p>
            <h3 class="mt-1 text-lg font-black">{{ proximaSesion.titulo }}</h3>
            <p class="text-sm text-muted-foreground">
              {{ proximaSesion.cursoTitulo }}
            </p>
            <div class="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Clock3 class="h-3.5 w-3.5" />
                {{ formatoHora(proximaSesion.fechaHoraInicio) }} ·
                {{ proximaSesion.duracionMinutos }} min
              </span>
              <span class="flex items-center gap-1">
                <UsersRound class="h-3.5 w-3.5" />
                {{ proximaSesion.invitados.length }} invitados
              </span>
            </div>
            <Button
              class="mt-4 w-full"
              variant="outline"
              @click="sesionDetalle = proximaSesion"
            >
              <Video class="h-4 w-4" />
              Ver Meet y invitados
            </Button>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-5">
            <h3 class="font-black capitalize">
              {{ formatoFechaLarga(diaSeleccionado) }}
            </h3>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ sesionesDelDiaSeleccionado.length }} sesión(es) este día
            </p>

            <div
              v-if="!sesionesDelDiaSeleccionado.length"
              class="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground"
            >
              Sin sesiones. Programa una para crear el evento Calendar + Meet.
            </div>

            <div v-else class="mt-4 grid gap-3">
              <button
                v-for="sesion in sesionesDelDiaSeleccionado"
                :key="sesion.id"
                type="button"
                class="rounded-md border border-border p-3 text-left hover:border-primary/40"
                @click="sesionDetalle = sesion"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-bold">{{ sesion.titulo }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatoHora(sesion.fechaHoraInicio) }} ·
                      {{ sesion.cursoTitulo }}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    :class="claseEstado(sesion.estado)"
                  >
                    {{ etiquetaEstado(sesion.estado) }}
                  </Badge>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Modal programar -->
    <div
      v-if="modalProgramar"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="modalProgramar = false"
    >
      <Card class="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-card">
        <CardContent class="p-6">
          <h2 class="text-xl font-black">Programar sesión en vivo</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Simula
            <code class="text-xs">calendar.events.insert</code>
            con
            <code class="text-xs">conferenceData</code>
            (Meet) y
            <code class="text-xs">attendees</code>
            por correo.
          </p>

          <div class="mt-5 grid gap-3">
            <input
              v-model="formulario.titulo"
              class="h-11 rounded-md border border-border bg-background px-3"
              placeholder="Título de la sesión"
            />
            <select
              v-model="formulario.cursoId"
              class="h-11 rounded-md border border-border bg-background px-3"
            >
              <option
                v-for="curso in cursos"
                :key="curso.id"
                :value="curso.id"
              >
                {{ curso.titulo }}
              </option>
            </select>
            <div class="grid gap-3 sm:grid-cols-2">
              <input
                v-model="formulario.docenteNombre"
                class="h-11 rounded-md border border-border bg-background px-3"
                placeholder="Docente"
              />
              <input
                v-model="formulario.docenteEmail"
                class="h-11 rounded-md border border-border bg-background px-3"
                type="email"
                placeholder="Correo del docente (organizador)"
              />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <input
                v-model="formulario.fechaHora"
                class="h-11 rounded-md border border-border bg-background px-3"
                type="datetime-local"
              />
              <select
                v-model.number="formulario.duracionMinutos"
                class="h-11 rounded-md border border-border bg-background px-3"
              >
                <option :value="30">30 min</option>
                <option :value="45">45 min</option>
                <option :value="60">60 min</option>
                <option :value="90">90 min</option>
                <option :value="120">120 min</option>
              </select>
            </div>
            <textarea
              v-model="formulario.emailsInvitados"
              class="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Correos extra (opcional). Los alumnos matriculados del curso se invitan solos."
            />
            <textarea
              v-model="formulario.notas"
              class="min-h-16 rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Notas opcionales (agenda, materiales…)"
            />
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <Button variant="outline" @click="modalProgramar = false">
              Cancelar
            </Button>
            <Button :disabled="procesando" @click="programar">
              <Mail class="h-4 w-4" />
              Crear evento e invitar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Detalle -->
    <div
      v-if="sesionDetalle"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="sesionDetalle = undefined"
    >
      <Card class="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-card">
        <CardContent class="p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge
                variant="outline"
                :class="claseEstado(sesionDetalle.estado)"
              >
                {{ etiquetaEstado(sesionDetalle.estado) }}
              </Badge>
              <h2 class="mt-2 text-2xl font-black">
                {{ sesionDetalle.titulo }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{ sesionDetalle.cursoTitulo }} ·
                {{ sesionDetalle.docenteNombre }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar"
              @click="sesionDetalle = undefined"
            >
              <XCircle class="h-5 w-5" />
            </Button>
          </div>

          <div class="mt-5 grid gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
            <p class="flex items-center gap-2">
              <Clock3 class="h-4 w-4 text-primary" />
              {{ formatoHora(sesionDetalle.fechaHoraInicio) }} ·
              {{ sesionDetalle.duracionMinutos }} min
            </p>
            <p class="flex items-center gap-2 break-all">
              <Link2 class="h-4 w-4 text-primary" />
              <a
                :href="sesionDetalle.meetUrl"
                target="_blank"
                rel="noreferrer"
                class="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {{ sesionDetalle.meetUrl }}
              </a>
            </p>
            <p class="text-xs text-muted-foreground">
              Calendar event:
              <code>{{ sesionDetalle.calendarEventId }}</code>
              · proveedor {{ sesionDetalle.proveedor }}
            </p>
          </div>

          <div class="mt-5">
            <h3 class="flex items-center gap-2 font-black">
              <Mail class="h-4 w-4" />
              Invitados ({{ sesionDetalle.invitados.length }})
            </h3>
            <ul class="mt-3 grid gap-2">
              <li
                v-for="invitado in sesionDetalle.invitados"
                :key="invitado.email"
                class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p class="font-semibold">
                    {{ invitado.nombre || invitado.email }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ invitado.email }}
                  </p>
                </div>
                <Badge variant="outline" class="text-[10px]">
                  {{ invitado.estado }}
                </Badge>
              </li>
            </ul>
            <p
              v-if="!sesionDetalle.invitados.length"
              class="mt-2 text-sm text-muted-foreground"
            >
              Sin invitados registrados en el evento.
            </p>
          </div>

          <div class="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              v-if="
                sesionDetalle.estado !== 'CANCELADA' &&
                sesionDetalle.estado !== 'FINALIZADA'
              "
              variant="outline"
              @click="reenviar(sesionDetalle)"
            >
              Reenviar invitaciones
            </Button>
            <Button
              v-if="
                sesionDetalle.estado === 'HOY' ||
                sesionDetalle.estado === 'PROGRAMADA'
              "
              @click="iniciar(sesionDetalle)"
            >
              <Video class="h-4 w-4" />
              Iniciar (EN_VIVO)
            </Button>
            <Button
              v-if="
                sesionDetalle.estado !== 'CANCELADA' &&
                sesionDetalle.estado !== 'FINALIZADA'
              "
              variant="destructive"
              @click="cancelar(sesionDetalle)"
            >
              Cancelar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
