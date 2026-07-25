<script setup lang="ts">
import IconoAyuda from "@/components/shared/IconoAyuda.vue";

withDefaults(
  defineProps<{
    /** Título estático. Si usas el slot por defecto, puedes omitirlo. */
    titulo?: string;
    ayuda: string;
    eyebrow?: string;
    claseTitulo?: string;
    claseEyebrow?: string;
    nivel?: "h1" | "h2" | "h3";
    /** Icono claro sobre fondos oscuros (p. ej. portadas). */
    variante?: "normal" | "claro";
  }>(),
  {
    claseTitulo: "text-3xl font-black",
    claseEyebrow: "text-primary",
    nivel: "h1",
    variante: "normal",
  },
);
</script>

<template>
  <div>
    <p
      v-if="eyebrow"
      class="text-xs font-black uppercase tracking-[.2em]"
      :class="variante === 'claro' ? 'text-accent' : claseEyebrow"
    >
      {{ eyebrow }}
    </p>
    <div
      class="flex items-center gap-2"
      :class="eyebrow ? 'mt-2' : ''"
    >
      <component :is="nivel" :class="claseTitulo">
        <slot>{{ titulo }}</slot>
      </component>
      <IconoAyuda :texto="ayuda" :class="variante === 'claro' ? 'icono-ayuda--claro' : ''" />
    </div>
  </div>
</template>
