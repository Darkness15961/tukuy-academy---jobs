<script setup lang="ts">
import { Link2, Mail, Video, XCircle } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";

import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import AsistenciaSesionPanel from "@/components/shared/AsistenciaSesionPanel.vue";
import CalendarioSesionesEnVivo from "@/components/shared/CalendarioSesionesEnVivo.vue";
import CompartirSesionRedes from "@/components/shared/CompartirSesionRedes.vue";
import CrearSesionEnVivoRapidaModal from "@/components/shared/CrearSesionEnVivoRapidaModal.vue";
import ModalEditarSesionEnVivo from "@/components/shared/ModalEditarSesionEnVivo.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { urlCompartirCursoConOpenGraph } from "@/lib/compartir-sesion-en-vivo";
import { toast } from "@/lib/toast";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const { contextoActivo } = useContextoSesion();
const { currentUser } = useAuth();

const cargando = ref(true);
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);
const cursos = ref<{ id: string; titulo: string }[]>([]);
const cursoInicial = ref("TODOS");
const modalProgramar = ref(false);
const modalRapida = ref(false);
const sesionDetalle = ref<SesionEnVivoOrganizacion>();
const sesionPendienteEliminar = ref<SesionEnVivoOrganizacion>();
const modalEditar = ref(false);
const aviso = ref("");
const procesando = ref(false);
const procesandoRapida = ref(false);
const procesandoEdicion = ref(false);
const procesandoEliminacion = ref(false);

const formulario = reactive({
  titulo: "",
  cursoId: "",
  fechaHora: "",
  duracionMinutos: 60,
  emailsInvitados: "",
  notas: "",
});

const esOrganizacion = computed(
  () =>
    Boolean(contextoActivo.value?.organizacionId) &&
    !contextoActivo.value?.organizacionId?.startsWith("org-personal-") &&
    contextoActivo.value?.ambitoDocencia !== "INDEPENDIENTE",
);

const tituloVista = computed(() =>
  esOrganizacion.value
    ? `Clases en vivo · ${contextoActivo.value?.organizacionNombre ?? "Organización"}`
    : "Clases en vivo · Docente",
);

async function cargar() {
  if (!contextoActivo.value) {
    sesiones.value = [];
    cursos.value = [];
    return;
  }
  const [lista, cursosCal] = await Promise.all([
    sesionesEnVivoCompartidas.listarParaContexto(contextoActivo.value),
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
  formulario.duracionMinutos = 60;
  const base = new Date();
  base.setMinutes(0, 0, 0);
  base.setHours(base.getHours() + 1);
  formulario.fechaHora = new Date(
    base.getTime() - base.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  modalProgramar.value = true;
}

function abrirRapida() {
  modalRapida.value = true;
}

async function crearSesionRapida(payload: {
  tituloCurso: string;
  descripcion?: string;
  tituloSesion?: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  alcance?: "PUBLICO" | "INTERNO";
  portadaUrl?: string | null;
  emailsInvitados?: string[];
  invitarMatriculados?: boolean;
  certificado?: boolean;
  exigirAsistencia?: boolean;
  porcentajeMinimoAsistencia?: number;
  exigirNota?: boolean;
  notaMinima?: number;
  docenteNombre: string;
  docenteEmail: string;
}) {
  if (!contextoActivo.value) return;
  procesandoRapida.value = true;
  try {
    const organizacionId = sesionesEnVivoCompartidas.claveSesionesContexto(
      contextoActivo.value,
    );
    const creada = await sesionesEnVivoCompartidas.programarRapida({
      ...payload,
      organizacionId,
      docenteNombre: currentUser.value?.name ?? payload.docenteNombre,
      docenteEmail: currentUser.value?.email ?? payload.docenteEmail,
      creadoPor: {
        portal: "docente",
        nombre: currentUser.value?.name ?? "Docente",
      },
    });
    await cargar();
    modalRapida.value = false;
    sesionDetalle.value = creada;
    aviso.value =
      "Sesión en vivo creada: curso mínimo + Meet. Comparte el enlace del curso o del Meet abajo.";
    toast.success("Sesión en vivo creada");
  } catch (err) {
    toast.error("No se pudo crear", {
      description: err instanceof Error ? err.message : undefined,
    });
  } finally {
    procesandoRapida.value = false;
  }
}

async function programar() {
  if (
    !formulario.titulo.trim() ||
    !formulario.cursoId ||
    !formulario.fechaHora ||
    !contextoActivo.value
  ) {
    return;
  }
  const curso = cursos.value.find((c) => c.id === formulario.cursoId);
  if (!curso) return;

  procesando.value = true;
  try {
    const organizacionId = sesionesEnVivoCompartidas.claveSesionesContexto(
      contextoActivo.value,
    );
    await sesionesEnVivoCompartidas.programar({
      organizacionId,
      titulo: formulario.titulo.trim(),
      cursoId: curso.id,
      cursoTitulo: curso.titulo,
      docenteNombre: currentUser.value?.name ?? "Docente",
      docenteEmail: currentUser.value?.email ?? "docente@tukuy.academy",
      fechaHoraInicio: new Date(formulario.fechaHora).toISOString(),
      duracionMinutos: formulario.duracionMinutos,
      emailsInvitados: formulario.emailsInvitados
        .split(/[,;\n]+/)
        .map((e) => e.trim())
        .filter(Boolean),
      notas: formulario.notas,
      creadoPor: {
        portal: "docente",
        nombre: currentUser.value?.name ?? "Docente",
      },
    });
    await cargar();
    modalProgramar.value = false;
    aviso.value =
      "Clase en vivo programada. Coordinada en calendario (admin / docente / alumno según vínculo).";
  } finally {
    procesando.value = false;
  }
}

function unirse(sesion: SesionEnVivoOrganizacion) {
  window.open(sesion.meetUrl, "_blank", "noopener,noreferrer");
}

function claveOrg() {
  if (!contextoActivo.value) return INSTALACION_TUKUY_ACADEMY_ID;
  return sesionesEnVivoCompartidas.claveSesionesContexto(contextoActivo.value);
}

function abrirEditar(sesion: SesionEnVivoOrganizacion) {
  sesionDetalle.value = sesion;
  modalEditar.value = true;
}

async function guardarEdicion(payload: {
  titulo: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  meetUrl?: string;
}) {
  const sesion = sesionDetalle.value;
  if (!sesion || procesandoEdicion.value) return;
  procesandoEdicion.value = true;
  try {
    const actualizada = await sesionesEnVivoCompartidas.actualizar(
      claveOrg(),
      sesion.id,
      payload,
    );
    sesiones.value = sesiones.value.map((item) =>
      item.id === actualizada.id ? actualizada : item,
    );
    sesionDetalle.value = actualizada;
    modalEditar.value = false;
    toast.success("Sesión actualizada");
  } catch (err) {
    toast.error("No se pudo editar", {
      description: err instanceof Error ? err.message : undefined,
    });
  } finally {
    procesandoEdicion.value = false;
  }
}

function solicitarEliminar(sesion: SesionEnVivoOrganizacion) {
  sesionPendienteEliminar.value = sesion;
}

async function confirmarEliminarSesion() {
  const sesion = sesionPendienteEliminar.value;
  if (!sesion || procesandoEliminacion.value) return;
  procesandoEliminacion.value = true;
  try {
    await sesionesEnVivoCompartidas.eliminar(claveOrg(), sesion.id);
    sesiones.value = sesiones.value.filter((item) => item.id !== sesion.id);
    if (sesionDetalle.value?.id === sesion.id) sesionDetalle.value = undefined;
    sesionPendienteEliminar.value = undefined;
    toast.success("Sesión eliminada");
  } catch (err) {
    toast.error("No se pudo eliminar", {
      description: err instanceof Error ? err.message : undefined,
    });
  } finally {
    procesandoEliminacion.value = false;
  }
}

async function cancelarSesion(sesion: SesionEnVivoOrganizacion) {
  try {
    const actualizada = await sesionesEnVivoCompartidas.cancelar(
      claveOrg(),
      sesion.id,
    );
    sesiones.value = sesiones.value.map((item) =>
      item.id === actualizada.id ? actualizada : item,
    );
    sesionDetalle.value = actualizada;
    toast.success("Sesión cancelada");
  } catch (err) {
    toast.error("No se pudo cancelar", {
      description: err instanceof Error ? err.message : undefined,
    });
  }
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
      class="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
    >
      {{ aviso }}
    </p>

    <CalendarioSesionesEnVivo
      :titulo="tituloVista"
      descripcion="Crea una sesión en vivo en un solo paso (curso mínimo + Meet) o programa otra clase sobre un curso ya existente."
      :cargando="cargando"
      :sesiones="sesiones"
      :cursos="cursos"
      :puede-programar="true"
      :curso-inicial="cursoInicial"
      @programar="abrirProgramar"
      @crear-rapida="abrirRapida"
      @detalle="sesionDetalle = $event"
      @unirse="unirse"
    />

    <CrearSesionEnVivoRapidaModal
      v-model:abierto="modalRapida"
      :procesando="procesandoRapida"
      :docente-nombre="currentUser?.name || ''"
      :docente-email="currentUser?.email || ''"
      :instalacion-id="contextoActivo?.organizacionId || INSTALACION_TUKUY_ACADEMY_ID"
      @crear="crearSesionRapida"
    />

    <div
      v-if="modalProgramar"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="modalProgramar = false"
    >
      <Card class="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-card">
        <CardContent class="p-6">
          <h2 class="text-xl font-black">Programar en curso existente</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Agrega otra clase a un curso ya creado. Para crear curso + sesión
            juntos usa «Crear sesión en vivo».
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
            <Button :disabled="procesando || !cursos.length" @click="programar">
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
              <h2 class="mt-2 text-xl font-black">
                {{ sesionDetalle.titulo }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{ sesionDetalle.cursoTitulo }}
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
            {{ sesionDetalle.meetUrl || "Sin enlace todavía" }}
          </p>
          <CompartirSesionRedes
            etiqueta="Compartir curso"
            :titulo="sesionDetalle.cursoTitulo || sesionDetalle.titulo"
            :url="urlCompartirCursoConOpenGraph(sesionDetalle.cursoId)"
            etiqueta-enlace="Ver curso e inscribirte"
          />
          <CompartirSesionRedes
            etiqueta="Compartir Meet"
            :titulo="sesionDetalle.titulo"
            :curso-titulo="sesionDetalle.cursoTitulo"
            :url-meet="sesionDetalle.meetUrl"
            :fecha-hora-inicio="sesionDetalle.fechaHoraInicio"
          />
          <div class="mt-4">
            <AsistenciaSesionPanel :sesion-id="sesionDetalle.id" />
          </div>
          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              v-if="
                sesionDetalle.estado !== 'CANCELADA' &&
                sesionDetalle.estado !== 'FINALIZADA'
              "
              variant="outline"
              @click="abrirEditar(sesionDetalle)"
            >
              Editar sesión
            </Button>
            <Button
              v-if="
                sesionDetalle.estado !== 'CANCELADA' &&
                sesionDetalle.estado !== 'FINALIZADA'
              "
              variant="outline"
              @click="cancelarSesion(sesionDetalle)"
            >
              Cancelar sesión
            </Button>
            <Button
              variant="destructive"
              @click="solicitarEliminar(sesionDetalle)"
            >
              Eliminar sesión
            </Button>
            <Button
              :disabled="!sesionDetalle.meetUrl"
              @click="unirse(sesionDetalle)"
            >
              <Video class="h-4 w-4" />
              Unirme a Meet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <ModalEditarSesionEnVivo
      v-model:abierto="modalEditar"
      :sesion="sesionDetalle"
      :procesando="procesandoEdicion"
      @guardar="guardarEdicion"
    />

    <div
      v-if="sesionPendienteEliminar"
      class="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4"
      @click.self="sesionPendienteEliminar = undefined"
    >
      <article class="w-full max-w-lg border border-border bg-card p-6 shadow-2xl">
        <h2 class="text-lg font-black">¿Eliminar esta sesión en vivo?</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          <strong class="text-foreground">{{
            sesionPendienteEliminar.titulo
          }}</strong>
          se borrará y se cancelará en Google Calendar si tenía evento.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            :disabled="procesandoEliminacion"
            @click="sesionPendienteEliminar = undefined"
          >
            No, volver
          </Button>
          <Button
            variant="destructive"
            :disabled="procesandoEliminacion"
            @click="confirmarEliminarSesion"
          >
            {{ procesandoEliminacion ? "Eliminando…" : "Sí, eliminar" }}
          </Button>
        </div>
      </article>
    </div>
  </div>
</template>
