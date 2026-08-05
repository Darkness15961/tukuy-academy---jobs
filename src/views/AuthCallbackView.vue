<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";

const route = useRoute();
const router = useRouter();
const { completarOAuth, error } = useAuth();

const destino = computed(() =>
  typeof route.query.continuar === "string" ? route.query.continuar : undefined,
);

onMounted(async () => {
  try {
    await completarOAuth(destino.value);
  } catch {
    // La vista conserva el error y permite regresar al login.
  }
});
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#111317] px-6 text-white">
    <section class="grid max-w-md justify-items-center gap-5 text-center">
      <img
        class="h-14 w-auto"
        src="/img/iconoTukuyAcademy.png"
        alt="Tukuy Academy"
      />

      <template v-if="!error">
        <LoaderCircle class="h-8 w-8 animate-spin text-blue-400" />
        <div>
          <h1 class="text-xl font-bold">Completando acceso</h1>
          <p class="mt-2 text-sm text-slate-400">
            Estamos validando tu sesión de Google.
          </p>
        </div>
      </template>

      <template v-else>
        <div>
          <h1 class="text-xl font-bold">No se pudo completar el acceso</h1>
          <p class="mt-2 text-sm text-red-300">{{ error }}</p>
        </div>
        <Button @click="router.replace('/login')">Volver al inicio de sesión</Button>
      </template>
    </section>
  </main>
</template>
