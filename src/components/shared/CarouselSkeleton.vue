<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

withDefaults(defineProps<{ variant?: 'light' | 'dark' }>(), { variant: 'light' })
</script>

<template>
  <div class="grid gap-4">
    <Skeleton
      :class="cn('min-h-[440px] w-full rounded-lg', variant === 'dark' && 'bg-white/10')"
    />
    <div class="grid grid-cols-3 gap-2">
      <Skeleton
        v-for="i in 3"
        :key="i"
        :class="cn('h-1.5 rounded-full', variant === 'dark' && 'bg-white/10')"
      />
    </div>
  </div>
</template>
