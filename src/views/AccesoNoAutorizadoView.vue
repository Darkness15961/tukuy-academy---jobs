<script setup lang="ts">
import { ShieldAlert } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import {
  useContextoSesion,
  rutaInicioPortal,
} from "@/composables/useContextoSesion";
import { env } from "@/lib/env";

const route = useRoute();
const router = useRouter();
const { sincronizarSesion } = useAuth();
const { contextoActivo, tienePermiso } = useContextoSesion();
const refrescando = ref(false);
const mensajeExtra = ref("");

const permiso = computed(() =>
  typeof route.query.permiso === "string" ? route.query.permiso : "desconocido",
);
const desde = computed(() =>
  typeof route.query.desde === "string" ? route.query.desde : "",
);

function volverInicio() {
  const portal = contextoActivo.value?.portal ?? "estudiante";
  void router.push(rutaInicioPortal(portal));
}

async function refrescarPermisos() {
  if (env.authProvider !== "supabase") return;
  refrescando.value = true;
  mensajeExtra.value = "";
  try {
    await sincronizarSesion(undefined, false);
    if (permiso.value !== "desconocido" && tienePermiso(permiso.value)) {
      if (desde.value.startsWith("/") && !desde.value.startsWith("//")) {
        await router.replace(desde.value);
        return;
      }
      volverInicio();
      return;
    }
    mensajeExtra.value =
      "Permisos actualizados, pero este perfil aún no incluye ese permiso. Confirma que corriste 20260805253000 en la principal y que estás en función Docente.";
  } catch (causa) {
    mensajeExtra.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron refrescar los permisos.";
  } finally {
    refrescando.value = false;
  }
}

onMounted(() => {
  void refrescarPermisos();
});
</script>

<template>
  <section class="mx-auto grid max-w-xl place-items-center gap-6 px-4 py-20 text-center">
    <span class="grid h-16 w-16 place-items-center bg-amber-500/15 text-amber-700 dark:text-amber-300">
      <ShieldAlert class="h-8 w-8" />
    </span>
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
        Seguridad de acceso
      </p>
      <h1 class="mt-2 text-3xl font-black">Acceso no autorizado</h1>
      <p class="mt-3 text-sm leading-6 text-muted-foreground">
        No tienes el permiso
        <strong class="text-foreground">{{ permiso }}</strong>
        para abrir esta sección.
        <template v-if="desde">
          Intentaste acceder a
          <code class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ desde }}</code>.
        </template>
        Si acabas de actualizar permisos en Administración, pulsa refrescar.
      </p>
      <p
        v-if="mensajeExtra"
        class="mt-3 border-l-4 border-l-amber-500 bg-amber-500/10 px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-100"
      >
        {{ mensajeExtra }}
      </p>
    </div>
    <div class="flex flex-wrap justify-center gap-2">
      <Button variant="outline" @click="router.back()">Volver</Button>
      <Button
        variant="outline"
        :disabled="refrescando"
        @click="refrescarPermisos"
      >
        {{ refrescando ? "Actualizando…" : "Actualizar permisos" }}
      </Button>
      <Button @click="volverInicio">Ir al inicio del portal</Button>
    </div>
  </section>
</template>
