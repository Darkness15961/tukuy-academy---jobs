<script setup lang="ts">
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Database,
  Download,
  FileText,
  GraduationCap,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-vue-next'
import { computed } from 'vue'

import PortalSection from '@/components/shared/PortalSection.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()

const metrics = computed(() => [
  {
    label: 'Experiencia detectada',
    value: `${portal.workExperiences.value.length}`,
    detail: 'registros laborales',
    icon: BriefcaseBusiness,
    cardClass: 'border-slate-200 bg-white',
    iconClass: 'bg-slate-50 text-[#0B3A78]',
  },
  {
    label: 'Certificados',
    value: `${portal.completedCourses.value.length}`,
    detail: 'cursos completados',
    icon: GraduationCap,
    cardClass: 'border-slate-200 bg-white',
    iconClass: 'bg-slate-50 text-[#0B3A78]',
  },
  {
    label: 'Compatibilidad laboral',
    value: `${portal.forYouJobs.value[0]?.match ?? 91}%`,
    detail: 'match laboral detectado',
    icon: BadgeCheck,
    cardClass: 'border-blue-100 bg-blue-50/70',
    iconClass: 'bg-[#0B3A78] text-white',
  },
  {
    label: 'Perfil completado',
    value: `${portal.user.value?.profileProgress ?? 0}%`,
    detail: 'faltan 2 datos',
    icon: FileText,
    cardClass: 'border-amber-100 bg-amber-50/60',
    iconClass: 'bg-[#F5B400] text-[#07152B]',
  },
])

const dataSources = [
  {
    name: 'Tukuy Obra',
    state: 'Datos verificados',
    detail: 'Última sincronización: 12/07/2026',
    badge: 'Verificado',
    className: 'border-blue-100 bg-blue-50 text-blue-900',
  },
  {
    name: 'SIADEG',
    state: 'Experiencia importada',
    detail: '3 cargos detectados en obras conectadas',
    badge: 'Importado',
    className: 'border-teal-100 bg-teal-50 text-teal-900',
  },
  {
    name: 'Manual',
    state: 'Información agregada por el usuario',
    detail: 'Pendiente de validación laboral',
    badge: 'Pendiente',
    className: 'border-amber-100 bg-amber-50 text-amber-900',
  },
]

const technicalSkills = ['Kardex', 'Control de materiales', 'Valorizaciones', 'Requerimientos', 'Logística de obra']
const tools = ['Tukuy Obra', 'Excel operativo', 'SIADEG', 'Reportes de obra']
const softSkills = ['Responsabilidad', 'Organización', 'Seguimiento documentario']

const jobMatches = computed(() =>
  portal.forYouJobs.value.slice(0, 3).map((job) => ({
    title: job.title,
    match: job.match,
    company: job.company,
  })),
)

const recommendedCourses = computed(() =>
  portal.courses.value
    .filter((course) =>
      ['Almacen y logistica', 'Tukuy Obra', 'Gestión de obras', 'Control de obra'].includes(course.category),
    )
    .slice(0, 3)
    .map((course, index) => ({
      title: course.title,
      impact: [10, 8, 6][index] ?? 5,
      pricing: course.pricing,
    })),
)
</script>

<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <section class="grid gap-7">
      <div class="relative overflow-hidden rounded-xl border border-[#DDE7F4] bg-[#F7F9FE] shadow-sm">
        <div class="absolute inset-y-0 right-0 hidden w-[35%] bg-[#071F52] lg:block" />
        <div class="absolute right-[28%] top-0 hidden h-full w-24 -skew-x-6 bg-[#F7F9FE] lg:block" />

        <div class="relative grid min-h-[520px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1fr)] lg:px-16 lg:py-14">
          <div class="grid content-center gap-7">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex -space-x-2">
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#0B3A78] text-[11px] font-black text-white">TA</span>
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#F5B400] text-[11px] font-black text-[#07152B]">CV</span>
                <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-black text-slate-700">IA</span>
              </div>
              <p class="text-sm font-bold text-[#0B3A78]">
                + perfiles de obra listos para mejores oportunidades
              </p>
            </div>

            <div>
              <h1 class="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-[#07152B] sm:text-5xl">
                Crea un CV profesional con tu experiencia real de obra
              </h1>
              <p class="mt-5 max-w-2xl text-base leading-7 text-[#41516A]">
                Importa datos de Tukuy Obra y SIADEG, valida tu historial laboral y genera un CV orientado a empleabilidad,
                cursos y oportunidades compatibles.
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button class="h-14 rounded-md bg-[#244DEB] px-8 text-base font-bold text-white shadow-sm hover:bg-[#173FD0]" type="button">
                Crear mi CV
              </Button>
              <Button
                class="h-14 rounded-md border-[#B9C7FF] bg-white px-8 text-base font-bold text-[#244DEB] hover:bg-blue-50"
                variant="outline"
                type="button"
                @click="portal.navigate('profile')"
              >
                <Upload class="h-4 w-4" />
                Importar mi CV
              </Button>
            </div>
          </div>

          <div class="relative min-h-[440px] lg:min-h-[500px]">
            <div class="absolute left-[12%] top-[12%] h-[70%] w-[50%] rotate-[-1deg] overflow-hidden rounded-lg border border-white/70 bg-white shadow-2xl">
              <img
                src="/img/vistasimg/vistaPortadaCv.png"
                alt="Profesional preparando su CV"
                class="h-full w-full object-cover"
              />
            </div>

            <div class="absolute right-[8%] top-[20%] h-[68%] w-[54%] rotate-[2deg] overflow-hidden rounded-md border border-[#DDE7F4] bg-white shadow-2xl">
              <img
                src="/img/vistasimg/imgCV.png"
                alt="Vista previa de CV inteligente"
                class="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card v-for="metric in metrics" :key="metric.label" class="shadow-sm" :class="metric.cardClass">
          <CardContent class="flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-md" :class="metric.iconClass">
              <component :is="metric.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ metric.label }}</p>
              <strong class="mt-1 block text-2xl font-black text-slate-950">{{ metric.value }}</strong>
              <span class="text-xs text-muted-foreground">{{ metric.detail }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside class="grid content-start gap-5">
          <Card class="border-slate-200 shadow-sm">
            <CardContent class="grid gap-5 p-5">
              <div>
                <p class="text-xs font-bold uppercase text-secondary">Perfil detectado</p>
                <h2 class="mt-1 text-xl font-black">Perfil inteligente</h2>
              </div>

              <div class="grid gap-3 text-sm">
                <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <span class="text-muted-foreground">Especialidad principal</span>
                  <strong class="mt-1 block text-slate-950">{{ portal.user.value.specialty }}</strong>
                </div>
                <div class="rounded-md border border-slate-200 p-3">
                  <span class="text-muted-foreground">Nivel estimado</span>
                  <strong class="mt-1 block text-slate-950">Operativo / Asistente</strong>
                </div>
                <div class="rounded-md border border-slate-200 p-3">
                  <span class="text-muted-foreground">Experiencia validada</span>
                  <strong class="mt-1 block text-slate-950">2 años 4 meses</strong>
                </div>
                <div class="rounded-md border border-slate-200 p-3">
                  <span class="text-muted-foreground">Fuentes conectadas</span>
                  <strong class="mt-1 block text-slate-950">Tukuy Obra · SIADEG · Manual</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="border-slate-200 shadow-sm">
            <CardContent class="grid gap-4 p-5">
              <div class="flex items-center gap-2">
                <Database class="h-4 w-4 text-[#0B3A78]" />
                <h3 class="font-bold">Fuentes de datos</h3>
              </div>

              <div class="grid gap-3">
                <div
                  v-for="source in dataSources"
                  :key="source.name"
                  class="rounded-md border border-slate-200 p-3 transition hover:border-blue-100 hover:bg-blue-50/30"
                >
                  <div class="flex items-start justify-between gap-2">
                    <strong class="text-sm">{{ source.name }}</strong>
                    <Badge class="rounded-md border px-2 py-0.5 text-[11px]" :class="source.className" variant="outline">
                      {{ source.badge }}
                    </Badge>
                  </div>
                  <p class="mt-2 text-sm text-slate-700">{{ source.state }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{{ source.detail }}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div class="grid gap-6">
          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 bg-slate-50 px-5 py-4 lg:px-7">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-4">
                  <img
                    class="h-20 w-20 shrink-0 rounded-md border border-white bg-white object-cover shadow-sm ring-1 ring-slate-200"
                    src="/img/vistasimg/perfilfoto.png"
                    :alt="portal.user.value.name"
                  />
                  <div>
                    <p class="text-xs font-semibold uppercase text-muted-foreground">CV generado</p>
                    <h2 class="mt-1 text-2xl font-black text-slate-950">{{ portal.user.value.name }}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">{{ portal.user.value.trade }} · {{ portal.user.value.location }}</p>
                  </div>
                </div>

                <Badge class="w-fit border-blue-100 bg-blue-50 text-blue-900" variant="outline">
                  Perfil recomendado: {{ portal.user.value.specialty }}
                </Badge>
              </div>
            </div>

            <div class="grid gap-7 p-5 lg:p-7">
              <div class="rounded-lg border border-blue-100 bg-blue-50/50 p-5">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="font-bold text-slate-950">Resumen profesional generado</h3>
                    <p class="mt-3 text-sm leading-7 text-slate-600">
                      Profesional con experiencia en almacén y logística aplicada a proyectos de obra, control de materiales,
                      seguimiento de requerimientos y uso de módulos operativos en Tukuy Obra. Cuenta con experiencia registrada
                      en proyectos de Lima y Cusco, además de formación complementaria en gestión de obras.
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" type="button">
                      <Pencil class="h-4 w-4" />
                      Editar
                    </Button>
                    <Button size="sm" type="button">
                      <Sparkles class="h-4 w-4" />
                      IA
                    </Button>
                  </div>
                </div>
              </div>

              <div class="grid gap-4">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-bold text-slate-950">Experiencia usada para este CV</h3>
                  <Button size="sm" variant="ghost" type="button" @click="portal.navigate('profile')">
                    Validar datos
                    <ArrowRight class="h-4 w-4" />
                  </Button>
                </div>

                <div class="grid gap-4">
                  <div
                    v-for="experience in portal.workExperiences.value"
                    :key="experience.id"
                    class="relative rounded-lg border border-slate-200 bg-white p-4 pl-6 shadow-sm"
                  >
                    <span class="absolute left-0 top-5 h-8 w-1 rounded-r-full bg-[#0B3A78]" />
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span class="text-xs font-semibold uppercase text-muted-foreground">{{ experience.period }}</span>
                        <strong class="mt-1 block text-base text-slate-950">{{ experience.role }}</strong>
                        <p class="mt-1 text-sm text-muted-foreground">{{ experience.project }} · {{ experience.location }}</p>
                      </div>
                      <Badge :variant="experience.status === 'Verificado' ? 'success' : experience.status === 'Declarado' ? 'warning' : 'default'">
                        {{ experience.source }} · {{ experience.status }}
                      </Badge>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-slate-600">{{ experience.summary }}</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-4">
                <h3 class="font-bold text-slate-950">Competencias detectadas</h3>
                <div class="grid gap-3 md:grid-cols-3">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase text-muted-foreground">Técnicas</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge v-for="skill in technicalSkills" :key="skill" class="bg-white" variant="outline">{{ skill }}</Badge>
                    </div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase text-muted-foreground">Herramientas</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge v-for="tool in tools" :key="tool" class="bg-white" variant="outline">{{ tool }}</Badge>
                    </div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-bold uppercase text-muted-foreground">Blandas</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge v-for="skill in softSkills" :key="skill" class="bg-white" variant="outline">{{ skill }}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-5 lg:grid-cols-2">
            <Card class="border-slate-200 shadow-sm">
              <CardContent class="grid gap-5 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase text-secondary">Oportunidades</p>
                    <h3 class="mt-1 text-lg font-black">Compatibilidad laboral</h3>
                  </div>
                  <ShieldCheck class="h-5 w-5 text-[#0B3A78]" />
                </div>

                <div class="grid gap-4">
                  <div v-for="job in jobMatches" :key="job.title" class="grid gap-2">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <strong class="block text-sm">{{ job.title }}</strong>
                        <span class="text-xs text-muted-foreground">{{ job.company }}</span>
                      </div>
                      <span class="text-sm font-black text-[#0B3A78]">{{ job.match }}%</span>
                    </div>
                    <Progress :model-value="job.match" class="h-2" />
                  </div>
                </div>

                <Button class="w-full" variant="outline" type="button" @click="portal.navigate('jobs')">
                  Ver oportunidades
                </Button>
              </CardContent>
            </Card>

            <Card class="border-slate-200 shadow-sm">
              <CardContent class="grid gap-5 p-5">
                <div>
                  <p class="text-xs font-bold uppercase text-secondary">Cursos recomendados</p>
                  <h3 class="mt-1 text-lg font-black">Mejora tu perfil</h3>
                </div>

                <div class="grid gap-3">
                  <div
                    v-for="course in recommendedCourses"
                    :key="course.title"
                    class="rounded-md border border-slate-200 p-3 transition hover:border-blue-100 hover:bg-blue-50/30"
                  >
                    <strong class="line-clamp-2 text-sm">{{ course.title }}</strong>
                    <p class="mt-2 text-xs text-muted-foreground">Aumenta compatibilidad +{{ course.impact }}%</p>
                  </div>
                </div>

                <Button class="w-full" type="button" @click="portal.navigate('courses')">
                  Inscribirme
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </section>
  </PortalSection>
</template>
