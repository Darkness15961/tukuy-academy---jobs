<script setup lang="ts">
import { cn } from "@/lib/utils";

withDefaults(defineProps<{ modelValue?: number; class?: string }>(), {
  modelValue: 0,
});
</script>

<template>
  <div
    :class="
      cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-slate-200',
        $props.class,
      )
    "
  >
    <div
      class="h-full rounded-full bg-primary transition-all"
      :style="{ width: `${Math.min(100, Math.max(0, modelValue))}%` }"
    />
  </div>
</template>
