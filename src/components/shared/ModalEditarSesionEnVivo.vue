<script setup lang="ts">
import { reactive, watch } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const props = defineProps<{
  abierto: boolean;
  sesion?: SesionEnVivoOrganizacion;
  procesando?: boolean;
}>();

const emit = defineEmits<{
  "update:abierto": [valor: boolean];
  guardar: [
    payload: {
      titulo: string;
      fechaHoraInicio: string;
      duracionMinutos: number;
      meetUrl?: string;
    },
  ];
}>();

const formulario = reactive({
  titulo: "",
  fechaHora: "",
  duracionMinutos: 60,
  meetUrl: "",
});

function fechaLocalDesdeIso(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function normalizarMeetUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!/meet\.google\.com$/i.test(u.hostname)) return url;
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

watch(
  () => [props.abierto, props.sesion] as const,
  ([abierto, sesion]) => {
    if (!abierto || !sesion) return;
    formulario.titulo = sesion.titulo;
    formulario.fechaHora = fechaLocalDesdeIso(sesion.fechaHoraInicio);
    formulario.duracionMinutos = sesion.duracionMinutos || 60;
    formulario.meetUrl = sesion.meetUrl || "";
  },
  { immediate: true },
);

function cerrar() {
  emit("update:abierto", false);
}

function guardar() {
  if (!formulario.titulo.trim() || !formulario.fechaHora) return;
  emit("guardar", {
    titulo: formulario.titulo.trim(),
    fechaHoraInicio: new Date(formulario.fechaHora).toISOString(),
    duracionMinutos: Number(formulario.duracionMinutos) || 60,
    meetUrl: normalizarMeetUrl(formulario.meetUrl) || undefined,
  });
}
</script>

<template>
  <div
    v-if="abierto && sesion"
    class="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4"
    @click.self="cerrar"
  >
    <Card class="w-full max-w-lg bg-card">
      <CardContent class="p-6">
        <h2 class="text-xl font-black">Editar sesión en vivo</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ sesion.cursoTitulo }}
        </p>

        <div class="mt-5 grid gap-3">
          <input
            v-model="formulario.titulo"
            class="h-11 rounded-md border border-border bg-background px-3"
            placeholder="Título de la sesión"
          />
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
          <div>
            <label class="mb-1 block text-xs font-semibold text-muted-foreground">
              Enlace de Google Meet
            </label>
            <input
              v-model="formulario.meetUrl"
              class="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              type="url"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Puedes pegar un Meet ya existente si la sala se creó fuera de la
              plataforma.
            </p>
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <Button variant="outline" :disabled="procesando" @click="cerrar">
            Cancelar
          </Button>
          <Button
            :disabled="procesando || !formulario.titulo.trim() || !formulario.fechaHora"
            @click="guardar"
          >
            {{ procesando ? "Guardando…" : "Guardar cambios" }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
