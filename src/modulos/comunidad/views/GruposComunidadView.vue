<script setup lang="ts">
import { ArrowLeft, UsersRound } from "lucide-vue-next";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComunidad } from "../composables/useComunidad";

const router = useRouter();
const { grupos, cargando } = useComunidad();
const unidos = ref(new Set<string>());

function alternar(grupoId: string) {
  const siguientes = new Set(unidos.value);
  if (siguientes.has(grupoId)) siguientes.delete(grupoId);
  else siguientes.add(grupoId);
  unidos.value = siguientes;
}
</script>

<template>
  <main class="mx-auto max-w-320 px-5 py-10 lg:px-8 lg:py-14">
    <button
      type="button"
      class="inline-flex items-center gap-2 text-sm font-black text-muted-foreground"
      @click="router.push('/comunidad')"
    >
      <ArrowLeft class="h-4 w-4" />
      Volver a Comunidad
    </button>
    <p class="mt-10 text-xs font-black uppercase tracking-[.22em] text-primary">
      Especialidades conectadas
    </p>
    <h1 class="mt-3 text-4xl font-black sm:text-5xl">Grupos de la comunidad</h1>
    <p class="mt-4 max-w-2xl leading-7 text-muted-foreground">
      Conversaciones enfocadas en problemas, herramientas y aprendizajes de cada especialidad.
    </p>

    <div v-if="cargando" class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="item in 6" :key="item" class="h-96 w-full" />
    </div>
    <div v-else class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="grupo in grupos" :key="grupo.id" class="border border-border bg-card">
        <img :src="grupo.imagen" :alt="grupo.nombre" class="aspect-[16/9] w-full object-cover" />
        <div class="p-6">
          <p class="text-xs font-black uppercase tracking-wide text-primary">{{ grupo.categoria }}</p>
          <h2 class="mt-2 text-xl font-black">{{ grupo.nombre }}</h2>
          <p class="mt-3 min-h-18 text-sm leading-6 text-muted-foreground">{{ grupo.descripcion }}</p>
          <p class="mt-5 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <UsersRound class="h-4 w-4 text-primary" />
            {{ grupo.integrantes }} integrantes
          </p>
          <Button
            class="mt-5 w-full"
            :variant="unidos.has(grupo.id) ? 'outline' : 'default'"
            @click="alternar(grupo.id)"
          >
            {{ unidos.has(grupo.id) ? "Salir del grupo" : "Unirme al grupo" }}
          </Button>
        </div>
      </article>
    </div>
  </main>
</template>

