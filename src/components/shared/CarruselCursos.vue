<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

defineProps<{
  title?: string;
  subtitle?: string;
  /** Sección de marketing sobre fondo oscuro (no confundir con tema .dark de la app) */
  dark?: boolean;
}>();

const scrollRef = ref<HTMLElement | null>(null);

function scrollBy(direction: -1 | 1) {
  const container = scrollRef.value;
  if (!container) return;

  const cardWidth = 280;
  const gap = 16;
  container.scrollBy({
    left: direction * (cardWidth + gap) * 2,
    behavior: "smooth",
  });
}
</script>

<template>
  <section class="grid w-full max-w-none gap-5 self-stretch">
    <div v-if="title" class="flex items-end justify-between gap-4">
      <div>
        <p
          v-if="subtitle"
          class="text-sm font-black uppercase tracking-[.25em]"
          :class="dark ? 'text-accent' : 'text-primary'"
        >
          {{ subtitle }}
        </p>
        <h2
          class="mt-2 text-3xl font-black tracking-normal sm:text-4xl"
          :class="dark ? 'text-white' : 'text-foreground'"
        >
          {{ title }}
        </h2>
      </div>

      <div class="hidden shrink-0 gap-2 sm:flex">
        <Button
          class="h-10 w-10 rounded-none"
          :class="
            dark
              ? 'border-white/20 bg-card/10 text-white hover:bg-card/15'
              : 'border-border bg-card text-foreground hover:bg-muted'
          "
          variant="outline"
          size="icon"
          type="button"
          aria-label="Ver cursos anteriores"
          @click="scrollBy(-1)"
        >
          <ChevronLeft class="h-5 w-5" />
        </Button>
        <Button
          class="h-10 w-10 rounded-none"
          :class="
            dark
              ? 'border-white/20 bg-card/10 text-white hover:bg-card/15'
              : 'border-border bg-card text-foreground hover:bg-muted'
          "
          variant="outline"
          size="icon"
          type="button"
          aria-label="Ver más cursos"
          @click="scrollBy(1)"
        >
          <ChevronRight class="h-5 w-5" />
        </Button>
      </div>
    </div>

    <div
      ref="scrollRef"
      :class="
        cn(
          'flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )
      "
    >
      <slot />
    </div>
  </section>
</template>
