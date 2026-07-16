<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "destructive"
      | "outline";
    class?: string;
  }>(),
  {
    variant: "default",
  },
);

const classes = computed(() =>
  cn(
    "inline-flex items-center rounded-none px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors",
    {
      "bg-blue-100 text-blue-700": props.variant === "default",
      "bg-slate-100 text-slate-700": props.variant === "secondary",
      "bg-emerald-100 text-emerald-700": props.variant === "success",
      "bg-amber-100 text-amber-800": props.variant === "warning",
      "bg-red-100 text-red-700": props.variant === "destructive",
      "border border-input bg-card text-foreground":
        props.variant === "outline",
    },
    props.class,
  ),
);
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
