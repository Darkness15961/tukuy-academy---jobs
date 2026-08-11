<script setup lang="ts">
import { Link2, Mail, Video, XCircle } from "lucide-vue-next";
import { onMounted, onUnmounted, reactive, ref } from "vue";

import { organizacionService } from "@/api/services/organizacion.service";
import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import AsistenciaSesionPanel from "@/components/shared/AsistenciaSesionPanel.vue";
import CalendarioSesionesEnVivo from "@/components/shared/CalendarioSesionesEnVivo.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);
const cursos = ref<{ id: string; titulo: string }[]>([]);
const cursoInicial = ref("TODOS");
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

async function cargar() {
  if (!contextoActivo.value) return;
  const [lista, cursosCal] = await Promise.all([
    organizacionService.sesionesEnVivo.listar(),
    sesionesEnVivoCompartidas.listarCursosParaCalendario(contextoActivo.value),
  ]);
  sesiones.value = lista;
  cursos.value = cursosCal.map((c) => ({ id: c.id, titulo: c.titulo }));
}

onMounted(async () => {
  try {
    await cargar();
  } finally {
    cargando.value = false;
  }
  window.addEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
});

onUnmounted(() => {
  window.removeEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
});

function abrirProgramar(cursoId: string) {
  cursoInicial.value = cursoId || "TODOS";
  formulario.cursoId = cursoId || cursos.value[0]?.id || "";
  formulario.titulo = "";
  formulario.emailsInvitados = "";
  formulario.notas = "";
  const base = new Date();
  base.setMinutes(0, 0, 0);
  base.setHours(16, 0, 0, 0);
  formulario.fechaHora = new Date(
    base.getTime() - base.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  modalProgramar.value = true;
}

async function programar() {
  if (
    !formulario.titulo.trim() ||
    !formulario.cursoId ||
    !formulario.fechaHora
  ) {
    aviso.value =
      "Completa título, curso y fecha/hora para programar la sesión.";
    return;
  }
  if (!cursos.value.length) {
    aviso.value =
      "No hay cursos en la academia. Crea o publica un curso antes de programar.";
    return;
  }
  const curso = cursos.value.find((c) => c.id === formulario.cursoId);
  if (!curso) {
    aviso.value = "Selecciona un curso válido.";
    return;
  }

  procesando.value = true;
  try {
    const creada = await organizacionService.sesionesEnVivo.programar({
      titulo: formulario.titulo.trim(),
      cursoId: curso.id,
      cursoTitulo: curso.titulo,
      docenteNombre: formulario.docenteNombre.trim(),
      docenteEmail: formulario.docenteEmail.trim(),
      fechaHoraInicio: new Date(formulario.fechaHora).toISOString(),
      duracionMinutos: formulario.duracionMinutos,
      emailsInvitados: formulario.emailsInvitados
        .split(/[,;\n]+/)
        .map((e) => e.trim())
        .filter(Boolean),
      notas: formulario.notas,
    });
    await cargar();
    modalProgramar.value = false;
    if (creada.meetSimulado) {
      aviso.value =
        `Sesión guardada, pero Meet sigue SIMULADO: ${creada.meetAviso ?? "revisa secrets GOOGLE_CALENDAR_* y redeploy."}`;
    } else {
      aviso.value = "Sesión guardada con Meet real de Google Calendar.";
    }
  } catch (err) {
    aviso.value =
      err instanceof Error
        ? err.message
        : "No se pudo guardar la sesión. Revisa la consola / gateway.";
  } finally {
    procesando.value = false;
  }
}

function unirse(sesion: SesionEnVivoOrganizacion) {
  window.open(sesion.meetUrl, "_blank", "noopener,noreferrer");
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
</script>

<template>
  <div>
    <p
      v-if="aviso"
      class="mb-3 rounded-md border px-4 py-3 text-sm"
      :class="
        aviso.toLowerCase().includes('no se pudo') ||
        aviso.toLowerCase().includes('completa') ||
        aviso.toLowerCase().includes('no hay') ||
        aviso.toLowerCase().includes('simulado')
          ? 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      "
    >
      {{ aviso }}
    </p>

    <CalendarioSesionesEnVivo
      :titulo="`Clases en vivo · ${contextoActivo?.organizacionNombre ?? 'Organización'}`"
      descripcion="Calendario exclusivo de sesiones sincrónicas (Meet simulado). Separado del catálogo de cursos virtuales asíncronos; misma lógica de vínculo por curso."
      :cargando="cargando"
      :sesiones="sesiones"
      :cursos="cursos"
      :puede-programar="true"
      :curso-inicial="cursoInicial"
      @programar="abrirProgramar"
      @detalle="sesionDetalle = $event"
      @unirse="unirse"
    />

    <div
      v-if="modalProgramar"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="modalProgramar = false"
    >
      <Card class="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-card">
        <CardContent class="p-6">
          <h2 class="text-xl font-black">Programar sesión institucional</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            La sesión se guarda en la academia. Meet simulado (Google Calendar
            OAuth pendiente).
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
              <option v-if="!cursos.length" value="" disabled>
                Sin cursos disponibles
              </option>
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
                placeholder="Correo del docente"
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
                <option :value="60">60 min</option>
                <option :value="90">90 min</option>
                <option :value="120">120 min</option>
              </select>
            </div>
            <textarea
              v-model="formulario.emailsInvitados"
              class="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Correos extra (opcional)"
            />
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="outline" @click="modalProgramar = false"
              >Cancelar</Button
            >
            <Button :disabled="procesando" @click="programar">
              <Mail class="h-4 w-4" />
              Crear e invitar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-if="sesionDetalle"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="sesionDetalle = undefined"
    >
      <Card class="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-card">
        <CardContent class="p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <Badge>{{ etiquetaEstado(sesionDetalle.estado) }}</Badge>
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
          <p class="mt-4 break-all text-sm">
            <Link2 class="mr-1 inline h-4 w-4" />
            <a
              :href="sesionDetalle.meetUrl"
              target="_blank"
              rel="noreferrer"
              class="text-primary underline-offset-2 hover:underline"
              >{{ sesionDetalle.meetUrl }}</a
            >
          </p>
          <div class="mt-5">
            <h3 class="font-black">
              Invitados ({{ sesionDetalle.invitados.length }})
            </h3>
            <ul class="mt-2 grid max-h-48 gap-2 overflow-y-auto">
              <li
                v-for="invitado in sesionDetalle.invitados"
                :key="invitado.email"
                class="flex justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>{{ invitado.nombre || invitado.email }}</span>
                <Badge variant="outline" class="text-[10px]">{{
                  invitado.estado
                }}</Badge>
              </li>
            </ul>
            <p
              v-if="!sesionDetalle.invitados.length"
              class="mt-2 text-sm text-muted-foreground"
            >
              Sin invitados por correo (usa la lista de asistencia abajo).
            </p>
          </div>

          <AsistenciaSesionPanel :sesion-id="sesionDetalle.id" />

          <div class="mt-5 flex justify-end gap-2">
            <Button variant="outline" @click="sesionDetalle = undefined"
              >Cerrar</Button
            >
            <Button @click="unirse(sesionDetalle)">
              <Video class="h-4 w-4" />
              Abrir Meet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
