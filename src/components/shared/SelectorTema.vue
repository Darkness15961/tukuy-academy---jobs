<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import { useTema } from "@/composables/useTema";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    /** compact = un botón que alterna; full = dos botones */
    variante?: "compact" | "full";
    class?: string;
  }>(),
  { variante: "compact" },
);

const { esOscuroResuelto, setPreferencia } = useTema();

/** La UI solo muestra claro/oscuro; el estado visual sigue al tema resuelto
 *  (incluye el default "system" del SO hasta que el usuario elija). */
const modoVisible = computed<"light" | "dark">(() =>
  esOscuroResuelto.value ? "dark" : "light",
);

function elegirClaro() {
  setPreferencia("light");
}

function elegirOscuro() {
  setPreferencia("dark");
}

function alternar() {
  setPreferencia(esOscuroResuelto.value ? "light" : "dark");
}
</script>

<template>
  <div v-if="variante === 'full'" class="flex flex-wrap gap-2">
    <Button
      :variant="modoVisible === 'light' ? 'default' : 'outline'"
      size="sm"
      class="gap-1.5"
      type="button"
      @click="elegirClaro"
    >
      <Sun class="h-3.5 w-3.5" />
      Claro
    </Button>
    <Button
      :variant="modoVisible === 'dark' ? 'default' : 'outline'"
      size="sm"
      class="gap-1.5"
      type="button"
      @click="elegirOscuro"
    >
      <Moon class="h-3.5 w-3.5" />
      Oscuro
    </Button>
  </div>

  <Button
    v-else
    variant="ghost"
    size="icon"
    type="button"
    :class="cn(props.class)"
    :aria-label="
      modoVisible === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
    "
    :title="modoVisible === 'dark' ? 'Tema oscuro' : 'Tema claro'"
    @click="alternar"
  >
    <Moon v-if="modoVisible === 'dark'" class="h-5 w-5" />
    <Sun v-else class="h-5 w-5" />
  </Button>
</template>
