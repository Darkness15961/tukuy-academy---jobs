<script setup lang="ts">
import { ShieldAlert } from "lucide-vue-next";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { useContextoSesion, rutaInicioPortal } from "@/composables/useContextoSesion";

const route = useRoute();
const router = useRouter();
const { contextoActivo } = useContextoSesion();

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
        Solicita el permiso a Administración o cambia de función en la entidad.
      </p>
    </div>
    <div class="flex flex-wrap justify-center gap-2">
      <Button variant="outline" @click="router.back()">Volver</Button>
      <Button @click="volverInicio">Ir al inicio del portal</Button>
    </div>
  </section>
</template>
