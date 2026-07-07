<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'

import PageTitle from '@/components/shared/PageTitle.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import ProfileRow from '@/components/shared/ProfileRow.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <PageTitle
      eyebrow="CV inteligente"
      title="Tu CV listo para postular"
      description="Genera un CV claro usando cursos, certificados y experiencia importada desde Tukuy Obra/SIADEG."
    />
    <div class="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Datos disponibles</CardTitle>
          <CardDescription>La IA simulada detecta lo que falta antes de exportar.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 text-sm">
          <ProfileRow label="Especialidad" :value="portal.user.value.specialty" />
          <ProfileRow label="Experiencias" :value="`${portal.workExperiences.value.length}`" />
          <ProfileRow label="Fuentes conectadas" value="Tukuy Obra / SIADEG" />
          <ProfileRow label="Certificados" :value="`${portal.user.value.certificates}`" />
          <ProfileRow label="Postulaciones" :value="`${portal.user.value.applications}`" />
          <ProfileRow label="Pendiente" value="Validar experiencia manual" />
          <Button><Sparkles class="h-4 w-4" /> Mejorar resumen</Button>
        </CardContent>
      </Card>

      <Card class="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>{{ portal.user.value.name }}</CardTitle>
          <CardDescription>{{ portal.user.value.trade }} · {{ portal.user.value.location }}</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div>
            <h3 class="font-semibold">Resumen profesional</h3>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Profesional con experiencia en almacén y logística de obra, control de materiales, seguimiento de
              requerimientos y uso de módulos operativos de Tukuy Obra. Ha participado en
              {{ portal.workExperiences.value.length }} experiencias registradas entre proyectos de Lima y Cusco.
            </p>
          </div>

          <div class="grid w-full gap-3">
            <h3 class="font-semibold">Experiencia usada para este CV</h3>
            <Card v-for="experience in portal.workExperiences.value.slice(0, 2)" :key="experience.id" class="shadow-none">
              <CardContent class="p-3 text-sm">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <strong>{{ experience.role }}</strong>
                  <Badge :variant="experience.status === 'Verificado' ? 'success' : 'default'">{{ experience.source }}</Badge>
                </div>
                <p class="mt-1 text-muted-foreground">{{ experience.project }} · {{ experience.period }}</p>
              </CardContent>
            </Card>
          </div>

          <div class="flex flex-wrap gap-2">
            <Badge variant="outline">Kardex</Badge>
            <Badge variant="outline">Control de materiales</Badge>
            <Badge variant="outline">Seguridad en obra</Badge>
            <Badge variant="outline">Excel operativo</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  </PortalSection>
</template>
