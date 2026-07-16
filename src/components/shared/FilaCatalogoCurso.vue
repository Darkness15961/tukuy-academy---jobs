<script setup lang="ts">
import { Heart, ShoppingCart } from "lucide-vue-next";
import { computed } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Course } from "@/types/academia";

const props = defineProps<{
  course: Course;
  compact?: boolean;
  inCart?: boolean;
  isFavorite?: boolean;
}>();

const emit = defineEmits<{
  addToCart: [];
  continueCourse: [];
  toggleFavorite: [];
}>();

const priceLabel = computed(() => {
  if (props.course.pricing === "free") return "Gratis";
  return `S/ ${props.course.price ?? 0}`;
});

const pricingBadgeClass = computed(() => {
  if (props.course.pricing === "free")
    return "border-border bg-muted text-muted-foreground";
  return "border-border bg-card text-foreground";
});

const statusBadgeClass = computed(() => {
  if (props.course.status === "Completado")
    return "border-border bg-muted text-muted-foreground";
  return "border-border bg-primary/10 text-primary";
});
</script>

<template>
  <article
    class="grid w-full items-center gap-4 rounded-none border border-border bg-card p-4 transition hover:border-primary/25 hover:shadow-sm"
    :class="
      compact
        ? 'grid-cols-[56px_minmax(0,1fr)_auto] sm:grid-cols-[72px_minmax(0,1fr)_auto]'
        : 'grid-cols-[96px_minmax(0,1fr)_auto]'
    "
  >
    <div class="relative w-fit">
      <img
        :src="course.image"
        :alt="course.title"
        class="h-14 w-14 rounded-none object-cover sm:h-16 sm:w-16"
      />
      <Button
        class="absolute -right-1 -top-1 h-7 w-7 rounded-none bg-card shadow-sm"
        size="icon"
        variant="outline"
        type="button"
        aria-label="Agregar a favoritos"
        @click.stop="emit('toggleFavorite')"
      >
        <Heart
          class="h-3.5 w-3.5"
          :class="isFavorite ? 'fill-red-500 text-red-500' : ''"
        />
      </Button>
    </div>

    <div class="min-w-0 grid content-center gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <Badge
          class="rounded-none px-2.5 py-0.5 text-[11px] font-semibold shadow-none"
          :class="pricingBadgeClass"
          variant="outline"
        >
          {{ course.pricing === "free" ? "Gratis" : "De pago" }}
        </Badge>
        <Badge
          v-if="course.status !== 'Disponible'"
          class="rounded-none px-2.5 py-0.5 text-[11px] font-semibold shadow-none"
          :class="statusBadgeClass"
          variant="outline"
        >
          {{ course.status }}
        </Badge>
      </div>
      <h3 class="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
        {{ course.title }}
      </h3>
      <p class="text-xs text-muted-foreground">
        {{ course.category }} · {{ course.duration }} · {{ course.mode }}
      </p>
      <Progress
        v-if="course.progress > 0"
        :model-value="course.progress"
        class="h-1.5 max-w-xs"
      />
    </div>

    <div class="grid min-w-[96px] justify-items-end gap-2 self-center">
      <strong
        class="text-sm"
        :class="
          course.pricing === 'free' ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
        "
      >
        {{ priceLabel }}
      </strong>
      <Button
        v-if="course.progress > 0 || course.status === 'En curso'"
        size="sm"
        @click="emit('continueCourse')"
      >
        Continuar
      </Button>
      <Button
        v-else-if="course.pricing === 'paid'"
        size="sm"
        :variant="inCart ? 'outline' : 'default'"
        @click="emit('addToCart')"
      >
        <ShoppingCart class="h-4 w-4" />
        {{ inCart ? "En carrito" : "Comprar" }}
      </Button>
      <Button v-else size="sm" variant="outline" @click="emit('continueCourse')"
        >Inscribirme</Button
      >
    </div>
  </article>
</template>
