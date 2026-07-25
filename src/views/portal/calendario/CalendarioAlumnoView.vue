<script setup lang="ts">
import { Link2, Video, XCircle } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import CalendarioSesionesEnVivo from "@/components/shared/CalendarioSesionesEnVivo.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";
import { usePortalContext } from "../composables/usePortalContext";

const { contextoActivo } = useContextoSesion();
const portal = usePortalContext();
const cargando = ref(true);
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);
const sesionDetalle = ref<SesionEnVivoOrganizacion>();

const cursos = computed(() => {
  const mapa = new Map<string, string>();
  for (const sesion of sesiones.value) {
    mapa.set(sesion.cursoId, sesion.cursoTitulo);
  }
  return [...mapa.entries()].map(([id, titulo]) => ({ id, titulo }));
});

async function cargar() {
  if (!contextoActivo.value) {
    sesiones.value = [];
    return;
  }
  sesiones.value = await sesionesEnVivoCompartidas.listarParaContexto(
    contextoActivo.value,
    portal.enrolledCourses.value,
  );
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

watch(
  () =>
    portal.enrolledCourses.value
      .map((c) => `${c.id}:${c.status}:${c.progress}`)
      .join("|"),
  () => {
    void cargar();
  },
);

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
  <div class="flex h-full max-h-full w-full min-w-0 flex-col overflow-hidden">
    <CalendarioSesionesEnVivo
      titulo="Calendario de clases"
      descripcion="Solo clases en vivo de tus cursos matriculados (Mixto/Presencial o de entidad). El contenido virtual asíncrono no aparece aquí."
      :cargando="cargando"
      :sesiones="sesiones"
      :cursos="cursos"
      :puede-programar="false"
      :sangrado="false"
      @detalle="sesionDetalle = $event"
      @unirse="unirse"
    />

    <div
      v-if="sesionDetalle"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      @click.self="sesionDetalle = undefined"
    >
      <Card class="w-full max-w-lg bg-card">
        <CardContent class="p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <Badge>{{ etiquetaEstado(sesionDetalle.estado) }}</Badge>
              <h2 class="mt-2 text-xl font-black">
                {{ sesionDetalle.titulo }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{ sesionDetalle.cursoTitulo }} ·
                {{ sesionDetalle.docenteNombre }}
              </p>
              <p
                v-if="sesionDetalle.notas"
                class="mt-1 text-xs text-muted-foreground"
              >
                {{ sesionDetalle.notas }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="shrink-0"
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
              Unirme a Meet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
