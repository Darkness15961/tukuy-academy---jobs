<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";

defineProps<{
  label: string;
  value: string;
}>();
</script>

<template>
  <Card class="shadow-none">
    <CardContent class="flex justify-between gap-4 p-3">
      <span class="text-muted-foreground">{{ label }}</span>
      <strong class="text-right">{{ value }}</strong>
    </CardContent>
  </Card>
</template>
