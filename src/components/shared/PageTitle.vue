<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
  centered?: boolean
}>()
</script>

<template>
  <div class="grid w-full gap-1" :class="centered ? 'mx-auto max-w-3xl text-center' : ''">
    <p class="text-xs font-bold uppercase text-secondary">{{ eyebrow }}</p>
    <h1 class="text-3xl font-bold tracking-normal sm:text-4xl">{{ title }}</h1>
    <p class="text-muted-foreground" :class="centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'">{{ description }}</p>
  </div>
</template>
