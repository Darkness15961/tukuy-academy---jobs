<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import EsqueletoComunidad from "../components/EsqueletoComunidad.vue";
import TarjetaPublicacion from "../components/TarjetaPublicacion.vue";
import { useComunidad } from "../composables/useComunidad";

const route = useRoute();
const router = useRouter();
const { publicaciones, cargando, reaccionar, comentar } = useComunidad();
const publicacion = computed(() =>
  publicaciones.value.find((item) => item.id === String(route.params.publicacionId)),
);
</script>

<template>
  <main class="mx-auto max-w-3xl px-5 py-10 lg:py-14">
    <button
      type="button"
      class="inline-flex items-center gap-2 text-sm font-black text-muted-foreground"
      @click="router.push('/comunidad')"
    >
      <ArrowLeft class="h-4 w-4" />
      Volver a Comunidad
    </button>
    <EsqueletoComunidad v-if="cargando" class="mt-8" />
    <TarjetaPublicacion
      v-else-if="publicacion"
      class="mt-8"
      :publicacion="publicacion"
      @reaccionar="reaccionar"
      @comentar="comentar"
      @abrir="() => undefined"
    />
    <div v-else class="mt-8 border border-border bg-card p-10 text-center">
      <h1 class="text-2xl font-black">La publicación ya no está disponible</h1>
      <Button class="mt-6" @click="router.push('/comunidad')">Ver la comunidad</Button>
    </div>
  </main>
</template>

