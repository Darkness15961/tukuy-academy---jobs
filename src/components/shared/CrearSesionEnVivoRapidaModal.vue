<script setup lang="ts">
import { Loader2, Video } from "lucide-vue-next";
import { computed, reactive, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ZonaSubidaImagen from "@/components/shared/ZonaSubidaImagen.vue";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { PORTADA_CURSO_AYUDA_BREVE } from "@/lib/portada-curso";
import { storageAcademia } from "@/lib/storage-academia";
import { toast } from "@/lib/toast";
import type { CrearSesionEnVivoRapidaInput } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const props = defineProps<{
  abierto: boolean;
  procesando?: boolean;
  docenteNombre?: string;
  docenteEmail?: string;
  fechaInicial?: string;
  instalacionId?: string | null;
}>();

const emit = defineEmits<{
  "update:abierto": [boolean];
  crear: [payload: Omit<CrearSesionEnVivoRapidaInput, "organizacionId" | "creadoPor" | "docenteNombre" | "docenteEmail"> & {
    docenteNombre: string;
    docenteEmail: string;
  }];
}>();

const subiendoPortada = ref(false);
const errorPortada = ref("");

const formulario = reactive({
  tituloCurso: "",
  descripcion: "",
  fechaHora: "",
  duracionMinutos: 90,
  alcance: "PUBLICO" as "PUBLICO" | "INTERNO",
  portadaUrl: "",
  emailsInvitados: "",
  invitarMatriculados: true,
  certificado: false,
  exigirAsistencia: true,
  porcentajeMinimoAsistencia: 50,
  exigirNota: false,
  notaMinima: 14,
  docenteNombre: "",
  docenteEmail: "",
});

const puedeEnviar = computed(
  () =>
    Boolean(formulario.tituloCurso.trim()) &&
    Boolean(formulario.fechaHora) &&
    !props.procesando &&
    !subiendoPortada.value,
);

watch(
  () => props.abierto,
  (abierto) => {
    if (!abierto) return;
    formulario.tituloCurso = "";
    formulario.descripcion = "";
    formulario.duracionMinutos = 90;
    formulario.alcance = "PUBLICO";
    formulario.portadaUrl = "";
    formulario.emailsInvitados = "";
    formulario.invitarMatriculados = true;
    formulario.certificado = false;
    formulario.exigirAsistencia = true;
    formulario.porcentajeMinimoAsistencia = 50;
    formulario.exigirNota = false;
    formulario.notaMinima = 14;
    formulario.docenteNombre = props.docenteNombre?.trim() || "";
    formulario.docenteEmail = props.docenteEmail?.trim() || "";
    errorPortada.value = "";

    if (props.fechaInicial) {
      formulario.fechaHora = props.fechaInicial;
    } else {
      const base = new Date();
      base.setMinutes(0, 0, 0);
      base.setHours(base.getHours() + 1);
      formulario.fechaHora = new Date(
        base.getTime() - base.getTimezoneOffset() * 60_000,
      )
        .toISOString()
        .slice(0, 16);
    }
  },
);

function cerrar() {
  if (props.procesando || subiendoPortada.value) return;
  emit("update:abierto", false);
}

async function onArchivoPortada(archivo: File) {
  subiendoPortada.value = true;
  errorPortada.value = "";
  try {
    const subida = await storageAcademia.subirPortada(
      archivo,
      props.instalacionId || INSTALACION_TUKUY_ACADEMY_ID,
    );
    formulario.portadaUrl = subida.publicUrl || subida.objectKey || "";
    if (!formulario.portadaUrl) {
      throw new Error("No se obtuvo URL de portada");
    }
    toast.success("Portada subida");
  } catch (err) {
    errorPortada.value =
      err instanceof Error ? err.message : "No se pudo subir la portada";
    toast.error("Portada", { description: errorPortada.value });
  } finally {
    subiendoPortada.value = false;
  }
}

function enviar() {
  if (!puedeEnviar.value) {
    toast.warning("Completa nombre del curso y fecha/hora");
    return;
  }
  emit("crear", {
    tituloCurso: formulario.tituloCurso.trim(),
    descripcion: formulario.descripcion.trim(),
    tituloSesion: formulario.tituloCurso.trim(),
    fechaHoraInicio: new Date(formulario.fechaHora).toISOString(),
    duracionMinutos: Number(formulario.duracionMinutos) || 90,
    alcance: formulario.alcance,
    portadaUrl: formulario.portadaUrl || null,
    emailsInvitados: formulario.emailsInvitados
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter(Boolean),
    invitarMatriculados: formulario.invitarMatriculados,
    certificado: formulario.certificado,
    exigirAsistencia: formulario.exigirAsistencia,
    porcentajeMinimoAsistencia: Number(formulario.porcentajeMinimoAsistencia) || 50,
    exigirNota: formulario.exigirNota,
    notaMinima: Number(formulario.notaMinima) || 14,
    docenteNombre: formulario.docenteNombre.trim() || "Docente",
    docenteEmail: formulario.docenteEmail.trim() || "docente@tukuy.academy",
  });
}
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
    @click.self="cerrar"
  >
    <Card class="max-h-[92vh] w-full max-w-xl overflow-y-auto bg-card">
      <CardContent class="p-6">
        <div class="flex items-start gap-3">
          <div
            class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
          >
            <Video class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-xl font-black">Crear sesión en vivo</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Formulario corto: crea el curso mínimo, publica y agenda Meet.
              Ideal para clases gratis sin armar el constructor completo.
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-3">
          <label class="grid gap-1 text-sm">
            <span class="font-semibold">Nombre del curso *</span>
            <input
              v-model="formulario.tituloCurso"
              class="h-11 rounded-md border border-border bg-background px-3"
              placeholder="Ej. Taller PLANITEC — control presupuestal"
              maxlength="120"
            />
          </label>

          <label class="grid gap-1 text-sm">
            <span class="font-semibold">Descripción</span>
            <textarea
              v-model="formulario.descripcion"
              rows="3"
              class="rounded-md border border-border bg-background px-3 py-2"
              placeholder="Qué verán, para quién es, requisitos breves…"
            />
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1 text-sm">
              <span class="font-semibold">Fecha y hora *</span>
              <input
                v-model="formulario.fechaHora"
                type="datetime-local"
                class="h-11 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label class="grid gap-1 text-sm">
              <span class="font-semibold">Duración</span>
              <select
                v-model.number="formulario.duracionMinutos"
                class="h-11 rounded-md border border-border bg-background px-3"
              >
                <option :value="60">60 min</option>
                <option :value="90">90 min</option>
                <option :value="120">120 min</option>
                <option :value="180">180 min</option>
              </select>
            </label>
          </div>

          <label class="grid gap-1 text-sm">
            <span class="font-semibold">Visibilidad</span>
            <select
              v-model="formulario.alcance"
              class="h-11 rounded-md border border-border bg-background px-3"
            >
              <option value="PUBLICO">Público (landing / todos)</option>
              <option value="INTERNO">Solo internos</option>
            </select>
          </label>

          <div class="grid gap-1 text-sm">
            <span class="font-semibold">Portada (recomendado)</span>
            <p class="text-xs text-muted-foreground">
              {{ PORTADA_CURSO_AYUDA_BREVE }}. También servirá para Open Graph al
              compartir el enlace.
            </p>
            <ZonaSubidaImagen
              :src="formulario.portadaUrl"
              :ayuda="PORTADA_CURSO_AYUDA_BREVE"
              :cargando="subiendoPortada"
              :error="errorPortada"
              compacto
              ajuste-preview="natural"
              @archivo="onArchivoPortada"
            />
          </div>

          <label class="grid gap-1 text-sm">
            <span class="font-semibold">Correos extra (manual, opcional)</span>
            <textarea
              v-model="formulario.emailsInvitados"
              rows="2"
              class="rounded-md border border-border bg-background px-3 py-2"
              placeholder="uno@correo.com, otro@correo.com"
            />
            <span class="text-xs text-muted-foreground">
              Se suman a los alumnos ya matriculados del curso.
            </span>
          </label>

          <label class="flex items-start gap-2 text-sm">
            <input
              v-model="formulario.invitarMatriculados"
              type="checkbox"
              class="mt-1"
            />
            <span>
              <span class="font-semibold">Agendar al matricularse</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">
                Quienes se inscriban después también se agregan al Google
                Calendar de esta sesión.
              </span>
            </span>
          </label>

          <div class="rounded-md border border-border p-3">
            <label class="flex items-start gap-2 text-sm">
              <input
                v-model="formulario.certificado"
                type="checkbox"
                class="mt-1"
              />
              <span>
                <span class="font-semibold">Emitir certificado</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">
                  Opcional. Puedes exigir asistencia (pases de lista) y/o nota.
                </span>
              </span>
            </label>

            <div
              v-if="formulario.certificado"
              class="mt-3 space-y-3 border-t border-border pt-3"
            >
              <label class="flex items-start gap-2 text-sm">
                <input
                  v-model="formulario.exigirAsistencia"
                  type="checkbox"
                  class="mt-1"
                />
                <span class="font-semibold">Exigir asistencia mínima</span>
              </label>
              <label
                v-if="formulario.exigirAsistencia"
                class="grid gap-1 text-sm sm:max-w-[12rem]"
              >
                <span class="font-semibold">% mínimo de pases</span>
                <input
                  v-model.number="formulario.porcentajeMinimoAsistencia"
                  type="number"
                  min="1"
                  max="100"
                  class="h-10 rounded-md border border-border bg-background px-3"
                />
                <span class="text-xs text-muted-foreground">
                  Presente en al menos este % de las llamadas de lista hechas.
                </span>
              </label>

              <label class="flex items-start gap-2 text-sm">
                <input
                  v-model="formulario.exigirNota"
                  type="checkbox"
                  class="mt-1"
                />
                <span class="font-semibold">Exigir nota mínima</span>
              </label>
              <label
                v-if="formulario.exigirNota"
                class="grid gap-1 text-sm sm:max-w-[12rem]"
              >
                <span class="font-semibold">Nota mínima (0–20)</span>
                <input
                  v-model.number="formulario.notaMinima"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  class="h-10 rounded-md border border-border bg-background px-3"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" :disabled="procesando" @click="cerrar">
            Cancelar
          </Button>
          <Button
            class="bg-primary"
            :disabled="!puedeEnviar"
            @click="enviar"
          >
            <Loader2 v-if="procesando" class="h-4 w-4 animate-spin" />
            {{ procesando ? "Creando…" : "Crear e invitar" }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
