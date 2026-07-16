<script setup lang="ts">
import {
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-vue-next";
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import type { PublicacionComunidad } from "../types/comunidad.types";

const props = defineProps<{
  publicacion: PublicacionComunidad;
}>();

const emit = defineEmits<{
  reaccionar: [publicacion: PublicacionComunidad];
  comentar: [publicacion: PublicacionComunidad, contenido: string];
  abrir: [publicacionId: string];
}>();

const comentariosAbiertos = ref(props.publicacion.comentarios.length > 0);
const comentario = ref("");

function enviarComentario() {
  const contenido = comentario.value.trim();
  if (!contenido) return;
  emit("comentar", props.publicacion, contenido);
  comentario.value = "";
  comentariosAbiertos.value = true;
}

const nombresTipo: Record<PublicacionComunidad["tipo"], string> = {
  pregunta: "Pregunta",
  experiencia: "Experiencia",
  recurso: "Recurso",
  oportunidad: "Oportunidad",
  evento: "Evento",
  logro: "Logro",
};
</script>

<template>
  <article class="border border-border bg-card">
    <div class="flex items-start gap-4 p-5 sm:p-6">
      <img
        :src="publicacion.autor.avatar"
        :alt="publicacion.autor.nombre"
        class="h-12 w-12 shrink-0 object-cover"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-black">{{ publicacion.autor.nombre }}</h2>
          <CheckCircle2
            v-if="publicacion.autor.verificado"
            class="h-4 w-4 fill-primary text-white"
          />
          <span class="bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
            {{ nombresTipo[publicacion.tipo] }}
          </span>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ publicacion.autor.cargo }} · {{ publicacion.fecha }}
        </p>
      </div>
      <Button variant="ghost" size="icon" aria-label="Más opciones">
        <MoreHorizontal class="h-5 w-5" />
      </Button>
    </div>

    <button
      type="button"
      class="block w-full px-5 pb-5 text-left sm:px-6"
      @click="emit('abrir', publicacion.id)"
    >
      <p class="whitespace-pre-line text-[15px] leading-7 text-foreground">
        {{ publicacion.contenido }}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="etiqueta in publicacion.etiquetas"
          :key="etiqueta"
          class="text-xs font-bold text-primary"
        >
          #{{ etiqueta.replaceAll(" ", "") }}
        </span>
      </div>
    </button>

    <button
      v-if="publicacion.imagen"
      type="button"
      class="block aspect-[16/8] w-full overflow-hidden bg-muted"
      @click="emit('abrir', publicacion.id)"
    >
      <img
        :src="publicacion.imagen"
        :alt="`Imagen compartida por ${publicacion.autor.nombre}`"
        class="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
      />
    </button>

    <div class="flex items-center border-t border-border px-3 py-2 sm:px-5">
      <Button
        class="gap-2"
        :class="publicacion.reaccionada ? 'text-red-600' : 'text-muted-foreground'"
        variant="ghost"
        @click="emit('reaccionar', publicacion)"
      >
        <Heart
          class="h-4 w-4"
          :class="publicacion.reaccionada ? 'fill-current' : ''"
        />
        {{ publicacion.reacciones }}
      </Button>
      <Button
        class="gap-2 text-muted-foreground"
        variant="ghost"
        @click="comentariosAbiertos = !comentariosAbiertos"
      >
        <MessageCircle class="h-4 w-4" />
        {{ publicacion.comentarios.length }} comentarios
      </Button>
    </div>

    <div v-if="comentariosAbiertos" class="border-t border-border bg-muted p-5">
      <div
        v-for="item in publicacion.comentarios"
        :key="item.id"
        class="mb-4 flex items-start gap-3 last:mb-0"
      >
        <img :src="item.autor.avatar" :alt="item.autor.nombre" class="h-9 w-9 object-cover" />
        <div class="flex-1 bg-card p-3">
          <p class="text-xs font-black">{{ item.autor.nombre }}</p>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">{{ item.contenido }}</p>
        </div>
      </div>

      <form class="mt-4 flex gap-2" @submit.prevent="enviarComentario">
        <input
          v-model="comentario"
          class="h-10 min-w-0 flex-1 border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          placeholder="Aporta a la conversación..."
        />
        <Button size="icon" type="submit" :disabled="!comentario.trim()">
          <Send class="h-4 w-4" />
        </Button>
      </form>
    </div>
  </article>
</template>

