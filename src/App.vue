<script setup lang="ts">
import { onMounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { Toaster } from "vue-sonner";
import "vue-sonner/style.css";

import { useAuth } from "@/composables/useAuth";
import { useTema } from "@/composables/useTema";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import { consumirToastDeRuta } from "@/lib/toast";

const route = useRoute();
const router = useRouter();
const { preferencia, esOscuroResuelto, rutaPermiteTemaOscuro } = useTema();
const { sincronizarSesion, isAuthenticated } = useAuth();

onMounted(() => {
  if (
    env.authProvider === "supabase" &&
    (isAuthenticated.value || localStorage.getItem(AUTH_TOKEN_KEY))
  ) {
    void sincronizarSesion(undefined, false).catch(() => undefined);
  }
  consumirToastDeRuta(router, route.query as Record<string, unknown>);
});

watch(
  () => [route.fullPath, route.query.mensaje, route.query.toastError] as const,
  () => {
    consumirToastDeRuta(router, route.query as Record<string, unknown>);
  },
);

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
    <Toaster
      position="top-right"
      rich-colors
      close-button
      class="!z-[200]"
      :theme="esOscuroResuelto && rutaPermiteTemaOscuro(route.path) ? 'dark' : 'light'"
      :toast-options="{
        class: 'border border-border shadow-none !z-[200]',
      }"
    />
    <RouterView />
  </div>
</template>
