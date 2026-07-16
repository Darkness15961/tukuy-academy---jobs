<script setup lang="ts">
import PrimeSkeleton from "primevue/skeleton";

import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    class?: string;
    shape?: "rectangle" | "circle";
    animation?: "wave" | "none";
  }>(),
  {
    shape: "rectangle",
    animation: "wave",
  },
);
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('tukuy-prime-skeleton overflow-hidden bg-[#E3EAF3]', props.class)"
  >
    <PrimeSkeleton
      width="100%"
      height="100%"
      border-radius="0"
      :shape="props.shape"
      :animation="props.animation"
    />
  </div>
</template>
