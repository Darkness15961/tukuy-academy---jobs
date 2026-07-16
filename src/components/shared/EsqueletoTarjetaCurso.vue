<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

withDefaults(
  defineProps<{
    variant?: "light" | "dark";
    imageHeight?: string;
  }>(),
  {
    variant: "light",
    imageHeight: "h-36",
  },
);
</script>

<template>
  <Card
    :class="
      variant === 'dark'
        ? 'overflow-hidden border-white/10 bg-card/8 shadow-none'
        : 'overflow-hidden shadow-none'
    "
  >
    <Skeleton
      :class="
        cn(
          imageHeight,
          'w-full rounded-none',
          variant === 'dark' && 'bg-white/10',
        )
      "
    />
    <CardHeader class="grid gap-2">
      <Skeleton :class="cn('h-5 w-4/5', variant === 'dark' && 'bg-white/10')" />
      <Skeleton :class="cn('h-4 w-3/5', variant === 'dark' && 'bg-white/10')" />
    </CardHeader>
    <CardContent>
      <Skeleton
        :class="cn('h-10 w-full', variant === 'dark' && 'bg-white/10')"
      />
    </CardContent>
  </Card>
</template>
