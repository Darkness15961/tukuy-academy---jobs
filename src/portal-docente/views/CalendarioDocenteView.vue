<script setup lang="ts">
import { Link2, Mail, Video, XCircle } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";

import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import CalendarioSesionesEnVivo from "@/components/shared/CalendarioSesionesEnVivo.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const { contextoActivo } = useContextoSesion();
const { currentUser } = useAuth();

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
    Promise.resolve(
      sesionesEnVivoCompartidas.listarCursosParaCalendario(
        contextoActivo.value,
      ),
    ),
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
      docenteEmail: "docente@cipcusco.org.pe",
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
      descripcion="Solo sesiones en vivo (Meet). Los cursos virtuales asíncronos no aparecen aquí: filtra por curso EN_VIVO/HIBRIDA."
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
          <h2 class="text-xl font-black">Programar clase en vivo</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Solo cursos con modalidad EN_VIVO o HIBRIDA. No afecta el contenido
            virtual asíncrono.
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
      <Card class="w-full max-w-lg bg-card">
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
            {{ sesionDetalle.meetUrl }}
          </p>
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
