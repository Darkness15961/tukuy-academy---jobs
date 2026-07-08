<script setup lang="ts">
import { Award, BadgeCheck, CalendarCheck, Download, FileCheck2, QrCode, Search, ShieldCheck } from 'lucide-vue-next'
import { computed } from 'vue'

import PortalSection from '@/components/shared/PortalSection.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { Course } from '@/types/academy'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()

const simulatedCertificates = computed<Course[]>(() => [
  ...portal.completedCourses.value,
  {
    id: 'c-010',
    title: 'Tukuy Asistencia: control de personal y tareos',
    category: 'Tukuy Asistencia',
    duration: '12 horas',
    level: 'Intermedio',
    mode: 'Virtual',
    progress: 100,
    status: 'Completado',
    pricing: 'free',
    imageTone: 'from-blue-800 to-slate-900',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'c-011',
    title: 'Requerimientos, compras y trazabilidad en obra',
    category: 'Requerimientos',
    duration: '16 horas',
    level: 'Intermedio',
    mode: 'Mixto',
    progress: 100,
    status: 'Completado',
    pricing: 'paid',
    imageTone: 'from-teal-700 to-blue-900',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'c-012',
    title: 'Reportes ejecutivos y KPIs para seguimiento de obras',
    category: 'Reportes Avanzados',
    duration: '18 horas',
    level: 'Avanzado',
    mode: 'Virtual',
    progress: 100,
    status: 'Completado',
    pricing: 'paid',
    imageTone: 'from-slate-700 to-cyan-800',
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80',
  },
])

const featuredCertificate = computed(() => simulatedCertificates.value[0])

const metrics = computed(() => [
  {
    label: 'Certificados emitidos',
    value: `${simulatedCertificates.value.length}`,
    detail: 'constancias verificables',
    icon: Award,
    cardClass: 'border-blue-100 bg-blue-50/70',
    iconClass: 'bg-[#0B3A78] text-white',
  },
  {
    label: 'Horas certificadas',
    value: `${simulatedCertificates.value.reduce((total, course) => total + Number.parseInt(course.duration, 10), 0)}`,
    detail: 'horas acumuladas',
    icon: CalendarCheck,
    cardClass: 'border-slate-200 bg-white',
    iconClass: 'bg-slate-50 text-[#0B3A78]',
  },
  {
    label: 'Validados',
    value: '100%',
    detail: 'con código de verificación',
    icon: ShieldCheck,
    cardClass: 'border-teal-100 bg-teal-50/70',
    iconClass: 'bg-teal-600 text-white',
  },
  {
    label: 'Perfil laboral',
    value: `${portal.user.value?.profileProgress ?? 0}%`,
    detail: 'impacto en CV inteligente',
    icon: BadgeCheck,
    cardClass: 'border-amber-100 bg-amber-50/70',
    iconClass: 'bg-[#F5B400] text-[#07152B]',
  },
])

function certificateCode(course: Course) {
  return `TA-2026-${course.id.replace('c-', '').padStart(4, '0')}`
}

function issuedDate(course: Course, index: number) {
  const dates: Record<string, string> = {
    'c-001': '15 jun 2026',
    'c-003': '28 may 2026',
    'c-008': '02 jul 2026',
    'c-010': '06 jul 2026',
    'c-011': '18 jun 2026',
    'c-012': '03 jul 2026',
  }
  return dates[course.id] ?? `${10 + index} jul 2026`
}
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-7">
      <div class="relative overflow-hidden rounded-xl border border-[#DDE7F4] bg-[#F7F9FE] shadow-sm">
        <div class="absolute inset-y-0 right-0 hidden w-[35%] bg-[#071F52] lg:block" />
        <div class="absolute right-[28%] top-0 hidden h-full w-24 -skew-x-6 bg-[#F7F9FE] lg:block" />

        <div class="relative grid min-h-[520px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1fr)] lg:px-16 lg:py-14">
          <div class="grid content-center gap-7">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex -space-x-2">
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#0B3A78] text-[11px] font-black text-white">TA</span>
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#F5B400] text-[11px] font-black text-[#07152B]">OK</span>
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-black text-slate-700">PDF</span>
              </div>
              <p class="text-sm font-bold text-[#0B3A78]">
                certificados verificables para empleabilidad en obra
              </p>
            </div>

            <div>
              <h1 class="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#07152B] sm:text-5xl">
                Respalda tus habilidades con certificados verificables
              </h1>
              <p class="mt-5 max-w-2xl text-base leading-7 text-[#41516A]">
                Reúne constancias, códigos de validación y evidencia de aprendizaje para fortalecer tu CV inteligente y
                presentar un portafolio profesional ante empresas.
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button class="h-14 rounded-md bg-[#244DEB] px-8 text-base font-bold text-white shadow-sm hover:bg-[#173FD0]" type="button">
                <Download class="h-4 w-4" />
                Descargar portafolio
              </Button>
              <Button
                class="h-14 rounded-md border-[#B9C7FF] bg-white px-8 text-base font-bold text-[#244DEB] hover:bg-blue-50"
                variant="outline"
                type="button"
              >
                <QrCode class="h-4 w-4" />
                Verificar código
              </Button>
            </div>
          </div>

          <div v-if="featuredCertificate" class="relative min-h-[440px] lg:min-h-[500px]">
            <div class="absolute left-[9%] top-[13%] h-[66%] w-[48%] rotate-[-2deg] overflow-hidden rounded-lg border border-white/70 bg-white shadow-2xl">
              <img :src="featuredCertificate.image" :alt="featuredCertificate.title" class="h-full w-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-[#07152B]/55 to-transparent" />
            </div>

            <div class="absolute right-[6%] top-[17%] w-[57%] rotate-[2deg] rounded-lg border border-[#DDE7F4] bg-white p-5 shadow-2xl">
              <div class="border-4 border-[#0B3A78] p-4">
                <div class="border border-[#8FB5CE] p-4 text-center">
                  <img class="mx-auto h-8 w-auto object-contain" src="/img/iconoTukuyAcademy.png" alt="Tukuy Academy" />
                  <p class="mt-4 text-[10px] font-black uppercase tracking-wide text-[#0B3A78]">Certificado de reconocimiento</p>
                  <h2 class="mt-4 text-lg font-black text-[#07152B]">{{ portal.user.value?.name }}</h2>
                  <div class="mx-auto mt-2 h-px w-32 bg-slate-200" />
                  <p class="mt-3 text-[11px] text-slate-500">ha completado satisfactoriamente</p>
                  <p class="mt-2 line-clamp-2 text-sm font-black text-[#07152B]">{{ featuredCertificate.title }}</p>
                  <p class="mt-3 text-[10px] text-slate-500">{{ certificateCode(featuredCertificate) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card v-for="metric in metrics" :key="metric.label" class="shadow-sm" :class="metric.cardClass">
          <CardContent class="flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-md shadow-sm" :class="metric.iconClass">
              <component :is="metric.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ metric.label }}</p>
              <strong class="mt-1 block text-2xl font-black text-slate-950">{{ metric.value }}</strong>
              <span class="text-xs text-muted-foreground">{{ metric.detail }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase text-secondary">Biblioteca de certificados</p>
          <h2 class="mt-1 text-2xl font-black">Constancias disponibles</h2>
        </div>
        <div class="relative w-full lg:max-w-sm">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input class="h-11 pl-10" type="search" placeholder="Buscar certificado..." />
        </div>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="(course, index) in simulatedCertificates"
          :key="course.id"
          class="group overflow-hidden border-slate-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div class="relative h-36 overflow-hidden bg-slate-900">
            <img :src="course.image" :alt="course.title" class="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" />
            <div class="absolute inset-0 bg-gradient-to-br from-[#07152B]/90 via-[#0B3A78]/60 to-transparent" />
            <Badge class="absolute left-4 top-4 border-white/20 bg-white/15 text-white backdrop-blur" variant="outline">
              {{ course.category }}
            </Badge>
            <div class="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-md bg-white text-[#0B3A78] shadow">
              <FileCheck2 class="h-5 w-5" />
            </div>
          </div>

          <CardContent class="grid gap-4 p-5">
            <div>
              <h3 class="line-clamp-2 text-lg font-black leading-snug">{{ course.title }}</h3>
              <p class="mt-2 text-sm text-muted-foreground">
                Emitido el {{ issuedDate(course, index) }} · {{ course.duration }} · {{ course.mode }}
              </p>
            </div>

            <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-muted-foreground">Código</span>
                <strong>{{ certificateCode(course) }}</strong>
              </div>
              <div class="mt-3 flex items-center justify-between gap-3">
                <span class="text-xs font-semibold text-teal-700">Verificado</span>
                <Progress :model-value="100" class="h-2 w-28" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                :disabled="portal.openingCertificateId.value === course.id"
                @click="portal.handleViewCertificate(course)"
              >
                {{ portal.openingCertificateId.value === course.id ? 'Generando...' : 'Ver PDF' }}
              </Button>
              <Button
                variant="ghost"
                :disabled="portal.openingCertificateId.value === course.id"
                @click="portal.handleDownloadCertificate(course)"
              >
                <Download class="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <section class="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card class="border-slate-200 shadow-sm">
          <CardContent class="grid gap-4 p-5">
            <div>
              <p class="text-xs font-bold uppercase text-secondary">Trazabilidad</p>
              <h3 class="mt-1 text-xl font-black">Cómo se valida cada certificado</h3>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-md border border-slate-200 p-4">
                <QrCode class="h-5 w-5 text-[#0B3A78]" />
                <strong class="mt-3 block">Código único</strong>
                <p class="mt-2 text-sm text-muted-foreground">Cada constancia tiene un código TA verificable.</p>
              </div>
              <div class="rounded-md border border-slate-200 p-4">
                <ShieldCheck class="h-5 w-5 text-[#0B3A78]" />
                <strong class="mt-3 block">Validación online</strong>
                <p class="mt-2 text-sm text-muted-foreground">Empresas pueden confirmar autenticidad y vigencia.</p>
              </div>
              <div class="rounded-md border border-slate-200 p-4">
                <BadgeCheck class="h-5 w-5 text-[#0B3A78]" />
                <strong class="mt-3 block">Impacto en CV</strong>
                <p class="mt-2 text-sm text-muted-foreground">Los certificados alimentan el CV inteligente y el matching.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-blue-100 bg-blue-50/70 shadow-sm">
          <CardContent class="grid gap-4 p-5">
            <Award class="h-6 w-6 text-[#0B3A78]" />
            <div>
              <h3 class="text-xl font-black">Portafolio certificable</h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Agrupa tus constancias en un portafolio profesional para adjuntar en postulaciones.
              </p>
            </div>
            <Button type="button">
              <Download class="h-4 w-4" />
              Descargar resumen
            </Button>
          </CardContent>
        </Card>
      </section>
    </section>
  </PortalSection>
</template>
