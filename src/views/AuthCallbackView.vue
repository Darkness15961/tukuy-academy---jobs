<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { authService } from "@/api/services/auth.service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { env } from "@/lib/env";
import {
  detectarYMarcarRecuperacionClave,
  hayRecuperacionClave,
  marcarRecuperacionClave,
} from "@/lib/recuperacion-clave";
import { supabasePrincipal } from "@/lib/supabase";

const route = useRoute();
const router = useRouter();
const { completarOAuth, error } = useAuth();
const recuperando = ref(false);

const destino = computed(() =>
  typeof route.query.continuar === "string" ? route.query.continuar : undefined,
);

onMounted(async () => {
  try {
    detectarYMarcarRecuperacionClave();
    if (env.authProvider === "supabase") {
      const { data: listener } = supabasePrincipal().auth.onAuthStateChange(
        (evento) => {
          if (evento === "PASSWORD_RECOVERY") marcarRecuperacionClave();
        },
      );
      try {
        await authService.capturarSesionDesdeUrl();
      } finally {
        listener.subscription.unsubscribe();
      }
      if (hayRecuperacionClave()) {
        recuperando.value = true;
        await router.replace({ name: "restablecer-clave" });
        return;
      }
    }
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
          <h1 class="text-xl font-bold">
            {{ recuperando ? "Preparando restablecimiento" : "Completando acceso" }}
          </h1>
          <p class="mt-2 text-sm text-slate-400">
            {{
              recuperando
                ? "Te llevamos a elegir una clave nueva."
                : "Estamos validando tu sesión."
            }}
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
