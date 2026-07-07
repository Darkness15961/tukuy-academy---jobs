<script setup lang="ts">
withDefaults(
  defineProps<{
    wide?: boolean
    centered?: boolean
  }>(),
  {
    wide: false,
    centered: true,
  },
)
</script>

<template>
  <section
    class="mx-auto w-full px-4 py-6 lg:px-5"
    :class="[
      wide ? 'max-w-7xl' : 'max-w-5xl',
      centered ? 'text-center' : '',
    ]"
  >
    <div class="grid gap-5" :class="centered ? 'justify-items-center' : ''">
      <slot />
    </div>
  </section>
</template>
