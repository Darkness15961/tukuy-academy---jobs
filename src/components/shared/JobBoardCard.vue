<script setup lang="ts">
import { CalendarDays, MapPin, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { isJobForYou } from '@/composables/useJobFilter'
import type { Job } from '@/types/academy'

const props = defineProps<{
  job: Job
  featured?: boolean
}>()

const emit = defineEmits<{
  apply: []
}>()

const forYou = computed(() => isJobForYou(props.job))
</script>

<template>
  <Card :class="featured ? 'border-primary/30 bg-primary/5 shadow-none' : 'shadow-none'">
    <CardContent class="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div class="grid min-w-0 gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge v-if="forYou" variant="default" class="gap-1">
            <Sparkles class="h-3 w-3" />
            Hecho para ti · {{ job.match }}%
          </Badge>
          <Badge v-else variant="secondary">{{ job.match }}% compatible</Badge>
          <Badge v-if="featured" variant="outline">Recomendada</Badge>
        </div>

        <div>
          <h3 class="text-lg font-bold leading-snug sm:text-xl">{{ job.title }}</h3>
          <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{{ job.company }}</span>
            <span class="inline-flex items-center gap-1">
              <MapPin class="h-3.5 w-3.5" />
              {{ job.location }}
            </span>
            <span class="inline-flex items-center gap-1">
              <CalendarDays class="h-3.5 w-3.5" />
              Cierra {{ job.deadline }}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge v-for="tag in job.tags" :key="tag" variant="outline">{{ tag }}</Badge>
        </div>
      </div>

      <Button class="shrink-0" @click="emit('apply')">Postular ahora</Button>
    </CardContent>
  </Card>
</template>
