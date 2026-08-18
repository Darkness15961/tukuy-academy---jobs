<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Loader2 } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    /** Mensajes que rotan mientras carga. */
    mensajes?: string[];
    /** Intervalo entre mensajes (ms). */
    intervaloMs?: number;
    /** Ocupa toda la altura de la vista. */
    pantallaCompleta?: boolean;
  }>(),
  {
    mensajes: () => [
      "Cargando curso…",
      "Alistando recursos…",
      "Preparando materiales…",
      "Organizando módulos…",
      "Cargando avance…",
      "Casi listo…",
    ],
    intervaloMs: 1800,
    pantallaCompleta: false,
  },
);

const indice = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (props.mensajes.length <= 1) return;
  timer = setInterval(() => {
    indice.value = (indice.value + 1) % props.mensajes.length;
  }, props.intervaloMs);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="grid place-items-center bg-background px-6 py-16 text-center"
    :class="pantallaCompleta ? 'min-h-[70vh] sm:min-h-screen' : 'min-h-[28rem]'"
    aria-busy="true"
    aria-live="polite"
    :aria-label="mensajes[indice] || 'Cargando'"
  >
    <div class="flex max-w-sm flex-col items-center gap-5">
      <div class="relative grid h-16 w-16 place-items-center">
        <span
          class="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
        />
        <Loader2 class="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      </div>

      <div class="space-y-2">
        <p
          :key="indice"
          class="animate-in fade-in text-base font-bold text-foreground duration-300"
        >
          {{ mensajes[indice] }}
        </p>
        <p class="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <span class="inline-flex gap-0.5" aria-hidden="true">
            <span
              class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]"
            />
            <span
              class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]"
            />
            <span
              class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]"
            />
          </span>
          <span class="sr-only">Cargando</span>
        </p>
      </div>
    </div>
  </div>
</template>
