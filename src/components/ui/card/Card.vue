<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="
      cn(
        'rounded-none border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(7,31,82,0.04)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-px hover:border-primary/25 hover:shadow-[0_16px_36px_-28px_rgba(7,31,82,0.6)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)] dark:hover:border-primary/40 dark:hover:shadow-[0_22px_44px_-28px_rgba(0,0,0,0.85)]',
        $props.class,
      )
    "
  >
    <slot />
  </div>
</template>
