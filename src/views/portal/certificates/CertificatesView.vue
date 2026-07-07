<script setup lang="ts">
import { Award, Download } from 'lucide-vue-next'

import PageTitle from '@/components/shared/PageTitle.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection wide :centered="false">
    <PageTitle
      eyebrow="Certificados"
      title="Tus constancias verificables"
      description="Comparte tus certificados con empresas y reclutadores."
    />
    <div class="grid gap-4 md:grid-cols-3">
      <Card v-for="course in portal.completedCourses.value" :key="course.id">
        <CardHeader>
          <Award class="h-5 w-5 text-teal-700" />
          <CardTitle>{{ course.title }}</CardTitle>
          <CardDescription>
            Emitido por Tukuy Academy · Código TA-2026-{{ course.id.replace('c-', '').padStart(4, '0') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-2">
          <Button
            class="w-full"
            variant="outline"
            :disabled="portal.openingCertificateId.value === course.id"
            @click="portal.handleViewCertificate(course)"
          >
            {{ portal.openingCertificateId.value === course.id ? 'Generando PDF...' : 'Ver certificado PDF' }}
          </Button>
          <Button
            class="w-full"
            variant="ghost"
            :disabled="portal.openingCertificateId.value === course.id"
            @click="portal.handleDownloadCertificate(course)"
          >
            <Download class="h-4 w-4" />
            Descargar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  </PortalSection>
</template>
