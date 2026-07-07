<script setup lang="ts">
import { Search, Sparkles } from 'lucide-vue-next'

import JobBoardCard from '@/components/shared/JobBoardCard.vue'
import JobCardSkeleton from '@/components/shared/JobCardSkeleton.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection wide :centered="false">
    <div class="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div class="relative max-w-xl">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="portal.jobSearchTerm.value"
          class="h-11 bg-background pl-10"
          type="search"
          placeholder="Buscar por cargo, empresa, ubicación o etiqueta..."
        />
      </div>

      <div class="grid gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mostrar</span>
          <Button
            :variant="portal.scopeFilter.value === 'all' ? 'default' : 'outline'"
            size="sm"
            @click="portal.scopeFilter.value = 'all'"
          >
            Todas
          </Button>
          <Button
            :variant="portal.scopeFilter.value === 'for-you' ? 'default' : 'outline'"
            size="sm"
            @click="portal.scopeFilter.value = 'for-you'"
          >
            <Sparkles class="h-3.5 w-3.5" />
            Hecho para ti
          </Button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</span>
          <Button
            :variant="portal.dateFilter.value === 'all' ? 'default' : 'outline'"
            size="sm"
            @click="portal.dateFilter.value = 'all'"
          >
            Todas
          </Button>
          <Button
            :variant="portal.dateFilter.value === 'recent' ? 'default' : 'outline'"
            size="sm"
            @click="portal.dateFilter.value = 'recent'"
          >
            Recientes
          </Button>
          <Button
            :variant="portal.dateFilter.value === 'closing-soon' ? 'default' : 'outline'"
            size="sm"
            @click="portal.dateFilter.value = 'closing-soon'"
          >
            Cierran pronto
          </Button>
          <Button
            :variant="portal.dateFilter.value === 'this-month' ? 'default' : 'outline'"
            size="sm"
            @click="portal.dateFilter.value = 'this-month'"
          >
            Cierran este mes
          </Button>
        </div>
      </div>
    </div>

    <section v-if="portal.scopeFilter.value === 'all' && portal.forYouJobs.value.length" class="grid gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase text-secondary">Hecho para ti</p>
          <h2 class="text-xl font-bold">Vacantes alineadas con tu perfil</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Según tu CV, certificados y experiencia en Tukuy Obra / SIADEG.
          </p>
        </div>
        <Button variant="outline" size="sm" @click="portal.scopeFilter.value = 'for-you'">
          Ver solo para ti ({{ portal.forYouJobs.value.length }})
        </Button>
      </div>

      <div class="grid gap-3">
        <JobBoardCard
          v-for="job in portal.forYouJobs.value.slice(0, 3)"
          :key="job.id"
          :job="job"
          featured
        />
      </div>
    </section>

    <section class="grid gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold">
            {{ portal.scopeFilter.value === 'for-you' ? 'Oportunidades para tu perfil' : 'Todas las oportunidades' }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ portal.filteredJobs.value.length }} vacante{{ portal.filteredJobs.value.length === 1 ? '' : 's' }}
            disponible{{ portal.filteredJobs.value.length === 1 ? '' : 's' }}
            {{ portal.scopeFilter.value === 'for-you' ? ' con alto match para ti' : ' en la bolsa Tukuy' }}.
          </p>
        </div>
      </div>

      <div class="grid gap-3">
        <template v-if="portal.jobsLoading.value">
          <JobCardSkeleton v-for="i in 4" :key="i" />
        </template>
        <template v-else-if="portal.filteredJobs.value.length">
          <JobBoardCard v-for="job in portal.filteredJobs.value" :key="job.id" :job="job" />
        </template>
        <Card v-else class="shadow-none">
          <CardContent class="py-10 text-center text-sm text-muted-foreground">
            No hay vacantes con estos filtros. Prueba otra fecha o quita el filtro "Hecho para ti".
          </CardContent>
        </Card>
      </div>
    </section>
  </PortalSection>
</template>
