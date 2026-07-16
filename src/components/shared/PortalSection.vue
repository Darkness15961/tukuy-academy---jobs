<script setup lang="ts">
withDefaults(
  defineProps<{
    wide?: boolean;
    centered?: boolean;
  }>(),
  {
    wide: false,
    centered: false,
  },
);
</script>

<template>
  <section
    class="mx-auto w-full px-5 py-8 lg:px-8 lg:py-10"
    :class="[wide ? 'max-w-360' : 'max-w-5xl', centered ? 'text-center' : '']"
  >
    <div class="grid gap-8" :class="centered ? 'justify-items-center' : ''">
      <slot />
    </div>
  </section>
</template>
