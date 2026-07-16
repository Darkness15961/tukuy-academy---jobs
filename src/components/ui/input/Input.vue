<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{ class?: string }>();
const model = defineModel<string | number>();
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-10 w-full rounded-none border border-input bg-card px-3 py-2 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
        $props.class,
      )
    "
  />
</template>
