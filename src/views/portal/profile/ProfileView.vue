<script setup lang="ts">
import PageTitle from '@/components/shared/PageTitle.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import ProfileRow from '@/components/shared/ProfileRow.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <PageTitle
      eyebrow="Perfil"
      title="Tu información laboral"
      description="Mientras más completo esté tu perfil, mejores recomendaciones recibirás."
    />

    <div class="grid gap-5 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{{ portal.user.value.name }}</CardTitle>
          <CardDescription>{{ portal.user.value.trade }}</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-2 text-sm">
            <ProfileRow label="Especialidad" :value="portal.user.value.specialty" />
            <ProfileRow label="Ubicación" :value="portal.user.value.location" />
          </div>
          <div>
            <div class="mb-2 flex justify-between text-sm">
              <span class="text-muted-foreground">Completitud del perfil</span>
              <strong>{{ portal.user.value.profileProgress }}%</strong>
            </div>
            <Progress :model-value="portal.user.value.profileProgress" class="h-3" />
          </div>
          <Button>Completar perfil laboral</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos principales</CardTitle>
          <CardDescription>Información visible para oportunidades laborales.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 text-sm md:grid-cols-2">
          <ProfileRow label="Oficio" :value="portal.user.value.trade" />
          <ProfileRow label="Especialidad" :value="portal.user.value.specialty" />
          <ProfileRow label="Ubicación" :value="portal.user.value.location" />
          <ProfileRow label="Disponibilidad" value="Inmediata" />
          <ProfileRow label="Pretensión" value="S/ 1,800" />
          <ProfileRow label="Estado" value="Perfil verificado" />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <Badge class="w-fit" variant="default">Completar perfil</Badge>
          <CardTitle>Importa o registra tu experiencia</CardTitle>
          <CardDescription>
            Si trabajaste usando Tukuy Obra o SIADEG, Academy puede simular la extracción de cargos, obras y módulos
            usados para alimentar tu CV.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3">
          <Button class="h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left" variant="outline" type="button">
            <div class="flex w-full items-center justify-between gap-3">
              <strong>Importar desde Tukuy Obra / SIADEG</strong>
              <Badge variant="success">Recomendado</Badge>
            </div>
            <p class="text-sm font-normal text-muted-foreground">
              Extrae obras donde participaste, cargo desempeñado, fechas, módulos utilizados y evidencias disponibles.
            </p>
          </Button>

          <Button class="h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left" variant="outline" type="button">
            <div class="flex w-full items-center justify-between gap-3">
              <strong>Registrar experiencia manual</strong>
              <Badge variant="outline">Usuario</Badge>
            </div>
            <p class="text-sm font-normal text-muted-foreground">
              Agrega experiencias que no estén conectadas al sistema para que también se consideren en tu CV y matching laboral.
            </p>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experiencia laboral detectada</CardTitle>
          <CardDescription>Simulación de historial importado y declarado por el usuario.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <Card v-for="experience in portal.workExperiences.value" :key="experience.id" class="shadow-none">
            <CardContent class="p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong class="block">{{ experience.role }}</strong>
                  <span class="text-sm text-muted-foreground">{{ experience.project }} · {{ experience.location }}</span>
                </div>
                <Badge :variant="experience.status === 'Verificado' ? 'success' : experience.status === 'Declarado' ? 'warning' : 'default'">
                  {{ experience.status }}
                </Badge>
              </div>
              <p class="mt-3 text-sm text-muted-foreground">{{ experience.summary }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{{ experience.source }}</Badge>
                <Badge variant="outline">{{ experience.period }}</Badge>
                <Badge v-for="module in experience.modules" :key="module" variant="outline">{{ module }}</Badge>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  </PortalSection>
</template>
