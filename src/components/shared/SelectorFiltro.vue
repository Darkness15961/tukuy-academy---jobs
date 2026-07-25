<script setup lang="ts" generic="T extends string">
import { Check, ChevronDown } from "lucide-vue-next";
import { computed } from "vue";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";

export type OpcionFiltro<T extends string = string> = {
  valor: T;
  etiqueta: string;
};

const props = defineProps<{
  modelValue: T;
  opciones: OpcionFiltro<T>[];
  ariaLabel: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [valor: T];
}>();

const etiquetaActiva = computed(
  () =>
    props.opciones.find((item) => item.valor === props.modelValue)?.etiqueta ??
    props.opciones[0]?.etiqueta ??
    "",
);
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex h-11 w-full items-center justify-between gap-2 border border-border bg-background px-3 text-left text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="ariaLabel"
      >
        <span class="min-w-0 truncate">{{ etiquetaActiva }}</span>
        <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="z-50 w-[var(--reka-dropdown-menu-trigger-width)] min-w-48 rounded-none border border-border bg-card p-1 shadow-lg"
      :side-offset="6"
      align="start"
      :collision-padding="12"
    >
      <DropdownMenuItem
        v-for="opcion in opciones"
        :key="opcion.valor"
        class="flex cursor-pointer items-center justify-between gap-3 rounded-none px-3 py-2.5 text-sm text-foreground outline-none data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground"
        @select="emit('update:modelValue', opcion.valor)"
      >
        <span class="font-semibold">{{ opcion.etiqueta }}</span>
        <Check
          v-if="opcion.valor === modelValue"
          class="h-4 w-4 shrink-0 opacity-90"
        />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenuRoot>
</template>
