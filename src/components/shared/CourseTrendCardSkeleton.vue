<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    variant?: 'light' | 'dark'
  }>(),
  {
    variant: 'light',
  },
)
</script>

<template>
  <article class="flex w-[280px] shrink-0 snap-start flex-col gap-3">
    <Skeleton :class="cn('aspect-video w-full rounded-lg', variant === 'dark' && 'bg-white/10')" />
    <Skeleton :class="cn('h-5 w-full', variant === 'dark' && 'bg-white/10')" />
    <Skeleton :class="cn('h-5 w-4/5', variant === 'dark' && 'bg-white/10')" />
    <Skeleton :class="cn('h-4 w-3/5', variant === 'dark' && 'bg-white/10')" />
    <div class="flex gap-2">
      <Skeleton :class="cn('h-6 w-24 rounded-sm', variant === 'dark' && 'bg-white/10')" />
      <Skeleton :class="cn('h-6 w-16', variant === 'dark' && 'bg-white/10')" />
    </div>
    <Skeleton :class="cn('h-7 w-24', variant === 'dark' && 'bg-white/10')" />
  </article>
</template>
