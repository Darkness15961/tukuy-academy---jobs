<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="
      cn(
        'flex h-full w-full items-center justify-center rounded-md bg-blue-100 font-bold text-blue-700 dark:bg-primary/20 dark:text-blue-300',
        $props.class,
      )
    "
  >
    <slot />
  </div>
</template>
