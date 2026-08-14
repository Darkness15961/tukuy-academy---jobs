<script setup lang="ts">
import { onMounted, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import Toast from "primevue/toast";

import { useAuth } from "@/composables/useAuth";
import { useTema } from "@/composables/useTema";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import { env } from "@/lib/env";

const route = useRoute();
const { preferencia, esOscuroResuelto, rutaPermiteTemaOscuro } = useTema();
const { sincronizarSesion, isAuthenticated } = useAuth();

onMounted(() => {
  if (
    env.authProvider === "supabase" &&
    (isAuthenticated.value || localStorage.getItem(AUTH_TOKEN_KEY))
  ) {
    void sincronizarSesion(undefined, false).catch(() => undefined);
  }
});

watch(
  () => [route.path, preferencia.value, esOscuroResuelto.value] as const,
  ([ruta]) => {
    const activo =
      rutaPermiteTemaOscuro(ruta) && esOscuroResuelto.value;
    document.documentElement.classList.toggle("dark", activo);
  },
  { immediate: true },
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Toast position="top-right" />
    <RouterView />
  </div>
</template>
