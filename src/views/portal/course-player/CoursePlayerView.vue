<script setup lang="ts">
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Star,
  Trophy,
  Upload,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Course } from '@/types/academy'
import { usePortalContext } from '../composables/usePortalContext'

const route = useRoute()
const router = useRouter()
const portal = usePortalContext()

const courseId = computed(() => route.params.courseId as string)
const course = computed(() => portal.courses.value.find((c) => c.id === courseId.value) ?? null)

interface SyllabusItem {
  id: string
  title: string
  type: 'video' | 'quiz' | 'reading' | 'assignment'
  duration?: string
  questions?: number
  grade?: number
  description: string
}

interface SyllabusSection {
  id: string
  title: string
  items: SyllabusItem[]
}

const syllabusSections: SyllabusSection[] = [
  {
    id: 'm1',
    title: 'Módulo 1: Fundamentos y Conceptos Generales',
    items: [
      {
        id: 'v1.1',
        title: 'Video 1.1: Introducción a la plataforma y objetivos',
        type: 'video',
        duration: '5 min',
        description: 'Explicación del contenido general del curso, dinámicas de estudio y cómo usar el portal de Tukuy Academy para maximizar tu aprendizaje.',
      },
      {
        id: 'v1.2',
        title: 'Video 1.2: Conceptos fundamentales de Tukuy Obra',
        type: 'video',
        duration: '10 min',
        description: 'Introducción a la arquitectura de Tukuy Obra, estructura de datos y cómo interactúa el equipo de oficina técnica con la información diaria de campo.',
      },
      {
        id: 'v1.3',
        title: 'Video 1.3: Terminología clave en gestión de obras',
        type: 'video',
        duration: '15 min',
        description: 'Repaso de términos técnicos necesarios: metrados, valorizaciones, partidas de control diario y su representación dentro del sistema.',
      },
      {
        id: 'r1.1',
        title: 'Actividad: Glosario de términos del Módulo 1',
        type: 'reading',
        duration: '10 min',
        description: 'Documentación teórica oficial con las definiciones clave tratadas en el módulo. Recomendado leer detenidamente antes del cuestionario.',
      },
      {
        id: 'q1.1',
        title: 'Actividad: Cuestionario rápido de fundamentos',
        type: 'quiz',
        questions: 5,
        grade: 18,
        description: 'Pequeño examen teórico de 5 preguntas diseñado para validar tu comprensión sobre conceptos básicos de Tukuy y gestión operativa.',
      },
    ],
  },
  {
    id: 'm2',
    title: 'Módulo 2: Herramientas y Metodología Aplicada',
    items: [
      {
        id: 'v2.1',
        title: 'Video 2.1: Configuración inicial del proyecto en Tukuy',
        type: 'video',
        duration: '12 min',
        description: 'Paso a paso para crear un nuevo proyecto de obra, cargar el presupuesto base y definir los roles de los ingenieros de producción.',
      },
      {
        id: 'v2.2',
        title: 'Video 2.2: Creación y asignación de partidas de obra',
        type: 'video',
        duration: '18 min',
        description: 'Aprende a estructurar el árbol de partidas, relacionarlas con las unidades de medida oficiales y asignar las tareas de producción diaria.',
      },
      {
        id: 'v2.3',
        title: 'Video 2.3: Control de avances diario en campo',
        type: 'video',
        duration: '20 min',
        description: 'Demostración práctica de cómo el personal de supervisión ingresa el avance de las partidas desde dispositivos móviles en el frente de trabajo.',
      },
      {
        id: 'r2.1',
        title: 'Actividad: Caso de estudio práctico',
        type: 'reading',
        duration: '15 min',
        description: 'Análisis de un proyecto de edificación real que logró una reducción del 15% en tiempos de reporte implementando la metodología Tukuy.',
      },
      {
        id: 'q2.1',
        title: 'Actividad: Cuestionario de metodología aplicada',
        type: 'quiz',
        questions: 5,
        grade: 17,
        description: 'Evaluación objetiva de 5 preguntas sobre la configuración de proyectos y captura de avances diarios de obra.',
      },
    ],
  },
  {
    id: 'm3',
    title: 'Módulo 3: Casos de Estudio y Análisis de Errores',
    items: [
      {
        id: 'v3.1',
        title: 'Video 3.1: Análisis de discrepancias en metrados',
        type: 'video',
        duration: '15 min',
        description: 'Cómo identificar y corregir diferencias entre los metrados contratados y los realmente ejecutados en campo usando el panel de alertas.',
      },
      {
        id: 'v3.2',
        title: 'Video 3.2: Errores comunes en reportes diarios y soluciones',
        type: 'video',
        duration: '15 min',
        description: 'Casos típicos: duplicación de personal, ingreso incorrecto de maquinaria o insumos y cómo solucionarlo en menos de 5 minutos.',
      },
      {
        id: 'v3.3',
        title: 'Video 3.3: Integración de presupuestos y reajustes',
        type: 'video',
        duration: '20 min',
        description: 'Uso de las fórmulas polinómicas y reajustes dentro del módulo de presupuestos para mantener la contabilidad exacta de la obra.',
      },
      {
        id: 'r3.1',
        title: 'Actividad: Plantilla Excel de corrección de errores',
        type: 'reading',
        duration: '5 min',
        description: 'Recurso descargable con plantillas de conciliación y control diario para cruzarlas con la base de datos de Tukuy.',
      },
      {
        id: 'q3.1',
        title: 'Actividad: Cuestionario de control de calidad',
        type: 'quiz',
        questions: 5,
        grade: 16,
        description: 'Cuestionario de 5 preguntas rápidas enfocado en la prevención y corrección de desvíos de metrado y conciliaciones de reportes.',
      },
    ],
  },
  {
    id: 'm4',
    title: 'Módulo 4: Evaluación Final y Certificación',
    items: [
      {
        id: 'v4.1',
        title: 'Video 4.1: Conclusiones y buenas prácticas',
        type: 'video',
        duration: '15 min',
        description: 'Resumen final del curso, consejos del instructor para aplicar Tukuy en tu día a día profesional y próximos pasos sugeridos.',
      },
      {
        id: 'q4.1',
        title: 'Actividad: Examen final de competencias Tukuy',
        type: 'quiz',
        questions: 20,
        grade: 19,
        description: 'Examen final de certificación de 20 preguntas que abarca todos los módulos del curso. Requiere nota mínima aprobatoria de 14 para obtener el certificado.',
      },
      {
        id: 'a4.1',
        title: 'Actividad: Entrega de Tarea integradora de fin de curso',
        type: 'assignment',
        grade: 18,
        description: 'Presenta un caso de estudio simulado donde configuras un proyecto, registras 3 días de avance y solucionas una alerta de discrepancia. Sube tu respuesta en PDF.',
      },
    ],
  },
]

// Current active item ID
const activeItemId = ref('v1.1')

const activeItem = computed<SyllabusItem>(() => {
  for (const s of syllabusSections) {
    const found = s.items.find((item) => item.id === activeItemId.value)
    if (found) return found
  }
  const fallbackSection = syllabusSections[0]
  if (fallbackSection) {
    const fallbackItem = fallbackSection.items[0]
    if (fallbackItem) return fallbackItem
  }
  return {
    id: 'fallback',
    title: 'Clase',
    type: 'video',
    description: '',
  }
})

// Completed items array
const completedItems = ref<string[]>([])

// Sync local completed state when course/route changes or loads
function syncLocalProgress() {
  if (course.value) {
    const totalCount = syllabusSections.reduce((sum, s) => sum + s.items.length, 0)
    const count = Math.round((course.value.progress / 100) * totalCount)
    
    // Collect all items in order
    const allItems: string[] = []
    syllabusSections.forEach((s) => s.items.forEach((i) => allItems.push(i.id)))
    completedItems.value = allItems.slice(0, count)
  } else {
    completedItems.value = []
  }
}

onMounted(syncLocalProgress)
watch(courseId, syncLocalProgress)

const totalItemsCount = computed(() =>
  syllabusSections.reduce((sum, s) => sum + s.items.length, 0),
)

const completedItemsCount = computed(() => completedItems.value.length)

const progressPercent = computed(() => {
  if (totalItemsCount.value === 0) return 0
  return Math.round((completedItemsCount.value / totalItemsCount.value) * 100)
})

const gradedActivities = computed(() => {
  return syllabusSections
    .flatMap((s) => s.items)
    .filter((item) => completedItems.value.includes(item.id) && item.grade !== undefined)
})

const averageGrade = computed(() => {
  if (!gradedActivities.value.length) return 0
  const total = gradedActivities.value.reduce((sum, item) => sum + (item.grade ?? 0), 0)
  return Math.round((total / gradedActivities.value.length) * 10) / 10
})

const gradeStatus = computed(() => {
  if (!gradedActivities.value.length) return 'Pendiente'
  return averageGrade.value >= 14 ? 'Aprobando' : 'En riesgo'
})

function toggleItem(itemId: string) {
  const index = completedItems.value.indexOf(itemId)
  if (index >= 0) {
    // Unchecking an item
    completedItems.value = completedItems.value.filter((id) => id !== itemId)
  } else {
    // Checking an item
    completedItems.value.push(itemId)
  }
  triggerUpdate()
}

function triggerUpdate() {
  if (!course.value) return
  const progress = progressPercent.value
  let status: Course['status'] = 'Disponible'
  if (progress === 100) {
    status = 'Completado'
  } else if (progress > 0) {
    status = 'En curso'
  } else {
    status = 'En curso'
  }

  // Update in context state
  const target = portal.courses.value.find((c) => c.id === courseId.value)
  if (target) {
    target.progress = progress
    target.status = status
    // Persist globally
    const progressMap: Record<string, { progress: number; status: Course['status'] }> = {}
    portal.courses.value.forEach((c) => {
      progressMap[c.id] = { progress: c.progress, status: c.status }
    })
    localStorage.setItem('tukuy_academy_progress', JSON.stringify(progressMap))
  }
}

function simulateQuickComplete() {
  const all: string[] = []
  syllabusSections.forEach((s) => s.items.forEach((i) => all.push(i.id)))
  completedItems.value = all
  triggerUpdate()
}

function simulateReset() {
  completedItems.value = []
  triggerUpdate()
}

function goBack() {
  router.push('/tukuy-academy/cursos')
}

// Active tab
const activeTab = ref<'descripcion' | 'preguntas' | 'notas' | 'resenas'>('descripcion')

// Mobile sidebar toggle
const sidebarOpen = ref(false)

// Collapsed sections tracking
const collapsedSections = ref<Record<string, boolean>>({
  m1: false,
  m2: false,
  m3: false,
  m4: false,
})

function toggleSection(sectionId: string) {
  collapsedSections.value[sectionId] = !collapsedSections.value[sectionId]
}

function selectItem(itemId: string) {
  activeItemId.value = itemId
  // On mobile, close sidebar after selecting an item
  sidebarOpen.value = false
}

// Helper to determine icon for each item type
function getItemIcon(type: SyllabusItem['type']) {
  switch (type) {
    case 'video':
      return CirclePlay
    case 'quiz':
      return HelpCircle
    case 'reading':
      return FileText
    case 'assignment':
      return ClipboardCheck
  }
}
</script>

<template>
  <div v-if="course" class="flex h-screen flex-col bg-slate-50 text-slate-900 font-sans">
    <!-- Top bar -->
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 z-10">
      <div class="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          @click="goBack"
        >
          <ChevronLeft class="h-5 w-5" />
        </Button>
        <div class="hidden h-8 w-px bg-slate-200 sm:block" />
        <img class="hidden h-7 w-auto sm:block" src="/img/iconoTukuyAcademy.png" alt="Tukuy Academy" />
        <div class="min-w-0">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0B3A78] block">
            Simulador de Aprendizaje
          </span>
          <h1 class="min-w-0 truncate text-sm font-bold text-slate-900">{{ course.title }}</h1>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Progress pill -->
        <div class="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3.5 py-1.5 sm:flex">
          <CirclePlay class="h-4 w-4 text-[#0B3A78]" />
          <span class="text-xs font-semibold text-slate-700">Progreso General</span>
          <strong class="text-xs text-[#0B3A78]">{{ progressPercent }}%</strong>
        </div>

        <!-- Exit button -->
        <Button
          variant="outline"
          size="sm"
          class="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          @click="goBack"
        >
          Salir del curso
        </Button>

        <!-- Mobile sidebar toggle -->
        <Button
          variant="ghost"
          size="icon"
          class="text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          @click="sidebarOpen = !sidebarOpen"
        >
          <BookOpen class="h-5 w-5" />
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Player + details -->
      <div class="flex flex-1 flex-col overflow-y-auto bg-white">
        <!-- Main player workspace depending on type -->
        <div class="relative aspect-video w-full bg-slate-950 border-b border-slate-200">
          
          <!-- Video Player State -->
          <template v-if="activeItem.type === 'video'">
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
              <button
                type="button"
                class="group grid h-16 w-16 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 hover:scale-105"
              >
                <Play class="h-7 w-7 text-white fill-white" />
              </button>
              <div class="space-y-1.5">
                <span class="text-xs font-bold text-blue-400 tracking-wider uppercase">Reproduciendo clase en video</span>
                <h3 class="text-base font-bold text-white max-w-xl mx-auto truncate">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Interactúa con las lecciones y cuestionarios para simular tu avance del curso.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  class="bg-[#0B3A78] text-white hover:bg-[#072a56] font-semibold"
                  @click="simulateQuickComplete"
                >
                  <Trophy class="mr-1.5 h-3.5 w-3.5" /> Completar curso (100%)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-white/10 text-white hover:bg-white/25 hover:text-white"
                  @click="simulateReset"
                >
                  <RefreshCw class="mr-1.5 h-3.5 w-3.5" /> Reiniciar avance
                </Button>
              </div>
            </div>
          </template>

          <!-- Quiz State -->
          <template v-else-if="activeItem.type === 'quiz'">
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900 text-white">
              <div class="rounded-full bg-amber-500/10 p-4 ring-4 ring-amber-500/20">
                <HelpCircle class="h-8 w-8 text-amber-400" />
              </div>
              <div class="space-y-1.5">
                <span class="text-xs font-bold text-amber-400 tracking-wider uppercase">Actividad: Cuestionario de evaluación</span>
                <h3 class="text-lg font-bold text-white max-w-xl mx-auto">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-300">
                Esta evaluación consta de <strong>{{ activeItem.questions || 5 }} preguntas</strong> basadas en los videos del módulo.
              </p>

              <div class="mt-4 flex gap-3">
                <Button
                  size="sm"
                  :class="completedItems.includes(activeItem.id) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'"
                  class="text-white font-semibold"
                  @click="toggleItem(activeItem.id)"
                >
                  <CheckCircle2 class="mr-1.5 h-4 w-4" />
                  {{ completedItems.includes(activeItem.id) ? 'Cuestionario Completado (Calificación: ' + activeItem.grade + '/20)' : 'Marcar como Completado' }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Reading State -->
          <template v-else-if="activeItem.type === 'reading'">
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900 text-white">
              <div class="rounded-full bg-blue-500/10 p-4 ring-4 ring-blue-500/20">
                <FileText class="h-8 w-8 text-blue-400" />
              </div>
              <div class="space-y-1.5">
                <span class="text-xs font-bold text-blue-400 tracking-wider uppercase">Material complementario / Lectura</span>
                <h3 class="text-lg font-bold text-white max-w-xl mx-auto">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-300">
                Revisa el documento o plantilla Excel para afianzar los conceptos prácticos.
              </p>

              <div class="mt-4 flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-white/10 text-white hover:bg-white/25"
                >
                  <Download class="mr-1.5 h-4 w-4" /> Descargar Material
                </Button>
                <Button
                  size="sm"
                  :class="completedItems.includes(activeItem.id) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'"
                  class="text-white font-semibold"
                  @click="toggleItem(activeItem.id)"
                >
                  <CheckCircle2 class="mr-1.5 h-4 w-4" />
                  {{ completedItems.includes(activeItem.id) ? 'Lectura Completada' : 'Marcar como Leído' }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Assignment State -->
          <template v-else-if="activeItem.type === 'assignment'">
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900 text-white">
              <div class="rounded-full bg-purple-500/10 p-4 ring-4 ring-purple-500/20">
                <FileCheck2 class="h-8 w-8 text-purple-400" />
              </div>
              <div class="space-y-1.5">
                <span class="text-xs font-bold text-purple-400 tracking-wider uppercase">Actividad: Entrega de Proyecto final</span>
                <h3 class="text-lg font-bold text-white max-w-xl mx-auto">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-300">
                Sube la resolución del caso práctico en formato PDF. Nota simulada una vez enviado: <strong>{{ activeItem.grade }}/20</strong>.
              </p>

              <div class="mt-4 flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-white/10 text-white hover:bg-white/25"
                >
                  <Upload class="mr-1.5 h-4 w-4" /> Subir archivo PDF
                </Button>
                <Button
                  size="sm"
                  :class="completedItems.includes(activeItem.id) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-550'"
                  class="text-white font-semibold"
                  @click="toggleItem(activeItem.id)"
                >
                  <CheckCircle2 class="mr-1.5 h-4 w-4" />
                  {{ completedItems.includes(activeItem.id) ? 'Proyecto Entregado' : 'Entregar y Finalizar' }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Fake control bar at bottom of player -->
          <div class="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-slate-950/85 px-4 py-2.5 text-[11px] text-slate-400">
            <span>02:14 / 15:00</span>
            <div class="h-1 flex-1 mx-4 rounded bg-slate-800 overflow-hidden">
              <div class="h-full bg-[#0B3A78] transition-all duration-500" :style="{ width: `${progressPercent}%` }" />
            </div>
            <span>Calidad HD</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="border-b border-slate-200 bg-white">
          <nav class="flex gap-0 overflow-x-auto px-6">
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="activeTab === 'descripcion' ? 'border-[#0B3A78] text-[#0B3A78]' : 'border-transparent text-slate-500 hover:text-slate-900'"
              @click="activeTab = 'descripcion'"
            >
              Descripción general
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="activeTab === 'preguntas' ? 'border-[#0B3A78] text-[#0B3A78]' : 'border-transparent text-slate-500 hover:text-slate-900'"
              @click="activeTab = 'preguntas'"
            >
              Preguntas y respuestas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="activeTab === 'notas' ? 'border-[#0B3A78] text-[#0B3A78]' : 'border-transparent text-slate-500 hover:text-slate-900'"
              @click="activeTab = 'notas'"
            >
              Notas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="activeTab === 'resenas' ? 'border-[#0B3A78] text-[#0B3A78]' : 'border-transparent text-slate-500 hover:text-slate-900'"
              @click="activeTab = 'resenas'"
            >
              Reseñas
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div class="p-6 sm:p-8 bg-white">
          <template v-if="activeTab === 'descripcion'">
            <h2 class="text-xl font-black text-slate-950">{{ activeItem.title }}</h2>
            <p class="mt-2.5 text-sm leading-relaxed text-slate-600">
              {{ activeItem.description }}
            </p>

            <!-- Cards section -->
            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <ClipboardCheck class="h-4 w-4 text-[#0B3A78]" />
                  Avance simulado
                </div>
                <strong class="mt-2 block text-3xl font-black text-slate-900">{{ completedItemsCount }}/{{ totalItemsCount }}</strong>
              </div>

              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <Star class="h-4 w-4 text-[#F5B400]" />
                  Promedio de notas
                </div>
                <strong class="mt-2 block text-3xl font-black text-slate-900">
                  {{ averageGrade || '--' }}
                </strong>
              </div>

              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <GraduationCap class="h-4 w-4 text-emerald-600" />
                  Estado
                </div>
                <strong class="mt-2 block text-3xl font-black text-slate-900" :class="gradeStatus === 'En riesgo' ? 'text-amber-500' : 'text-slate-900'">
                  {{ gradeStatus }}
                </strong>
              </div>
            </div>

            <!-- What you will learn -->
            <div class="mt-8 border-t border-slate-200 pt-6">
              <h3 class="text-base font-bold text-slate-900">Lo que aprenderás en esta sesión</h3>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="flex gap-3 rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <CheckCircle2 class="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#0B3A78]" />
                  <span class="text-sm text-slate-700 leading-snug">Aplicar {{ course.category.toLowerCase() }} en flujos reales de obra y campo.</span>
                </div>
                <div class="flex gap-3 rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <CheckCircle2 class="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#0B3A78]" />
                  <span class="text-sm text-slate-700 leading-snug">Reforzar criterios para control operativo y oficina técnica.</span>
                </div>
                <div class="flex gap-3 rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <CheckCircle2 class="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#0B3A78]" />
                  <span class="text-sm text-slate-700 leading-snug">Generar evidencias válidas para tu CV inteligente Tukuy.</span>
                </div>
                <div class="flex gap-3 rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                  <CheckCircle2 class="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#0B3A78]" />
                  <span class="text-sm text-slate-700 leading-snug">Obtener certificado verificable al completar todas las lecciones.</span>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'preguntas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <MessageSquare class="h-12 w-12 text-slate-300" />
              <h3 class="text-base font-bold text-slate-900">Preguntas y respuestas</h3>
              <p class="max-w-md text-sm text-slate-500">Próximamente podrás hacer preguntas sobre las lecciones y el instructor responderá aquí.</p>
            </div>
          </template>

          <template v-else-if="activeTab === 'notas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <FileText class="h-12 w-12 text-slate-300" />
              <h3 class="text-base font-bold text-slate-900">Tus notas</h3>
              <p class="max-w-md text-sm text-slate-500">Guarda apuntes importantes durante las clases para repasarlos más adelante.</p>
            </div>
          </template>

          <template v-else-if="activeTab === 'resenas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <Star class="h-12 w-12 text-slate-300" />
              <h3 class="text-base font-bold text-slate-900">Reseñas del curso</h3>
              <p class="max-w-md text-sm text-slate-500">Al completar el curso podrás dejar tu valoración y ayudar a otros estudiantes.</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Right: Course content sidebar -->
      <aside
        class="shrink-0 flex-col border-l border-slate-200 bg-white"
        :class="[
          sidebarOpen
            ? 'fixed inset-y-16 right-0 z-40 flex w-80 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-96 lg:shadow-none'
            : 'hidden lg:flex lg:w-96',
        ]"
      >
        <!-- Sidebar header -->
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <h2 class="text-sm font-bold text-slate-950 uppercase tracking-wider">Temario del Curso</h2>
          <Button
            variant="ghost"
            size="icon"
            class="text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            @click="sidebarOpen = false"
          >
            <ChevronRight class="h-5 w-5" />
          </Button>
        </div>

        <!-- Progress bar -->
        <div class="border-b border-slate-200 px-4 py-4 bg-slate-50/50">
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="text-slate-500 font-semibold">{{ completedItemsCount }} de {{ totalItemsCount }} completadas</span>
            <strong class="text-[#0B3A78] font-bold">{{ progressPercent }}%</strong>
          </div>
          <Progress :model-value="progressPercent" class="h-2 bg-slate-200 [&>div]:bg-[#0B3A78]" />
        </div>

        <!-- Sections list -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="section in syllabusSections"
            :key="section.id"
            class="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white"
          >
            <!-- Collapsible header -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-200 text-left transition hover:bg-slate-100/70"
              @click="toggleSection(section.id)"
            >
              <span class="text-xs font-bold text-slate-800 uppercase tracking-wide truncate pr-2">
                {{ section.title }}
              </span>
              <ChevronDown
                class="h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': !collapsedSections[section.id] }"
              />
            </button>

            <!-- Collapsible body -->
            <div v-show="!collapsedSections[section.id]" class="divide-y divide-slate-100">
              <button
                v-for="item in section.items"
                :key="item.id"
                type="button"
                class="w-full flex items-start gap-3 p-3 text-left transition duration-150"
                :class="[
                  activeItemId === item.id
                    ? 'bg-blue-50/30 font-medium'
                    : 'hover:bg-slate-50/50',
                ]"
                @click="selectItem(item.id)"
              >
                <!-- Checkbox -->
                <span class="shrink-0 mt-0.5 z-10" @click.stop="toggleItem(item.id)">
                  <CheckCircle2
                    class="h-5 w-5 transition duration-150"
                    :class="[
                      completedItems.includes(item.id)
                        ? 'text-[#0B3A78] fill-[#0B3A78]/10'
                        : 'text-slate-300 hover:text-slate-400'
                    ]"
                  />
                </span>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <p
                    class="text-xs font-semibold leading-normal"
                    :class="activeItemId === item.id ? 'text-[#0B3A78]' : 'text-slate-700'"
                  >
                    {{ item.title }}
                  </p>
                  <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                    <span class="flex items-center gap-1">
                      <component :is="getItemIcon(item.type)" class="h-3 w-3 text-slate-400" />
                      <span class="capitalize">{{ item.type === 'quiz' ? 'Cuestionario' : item.type === 'reading' ? 'Lectura' : item.type === 'assignment' ? 'Tarea' : 'Video' }}</span>
                    </span>
                    <span v-if="item.duration || item.questions">·</span>
                    <span v-if="item.duration">{{ item.duration }}</span>
                    <span v-else-if="item.questions">{{ item.questions }} preguntas</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- Course not found -->
  <div v-else class="grid min-h-screen place-items-center bg-slate-50 text-center text-slate-900">
    <div class="grid gap-4 p-8">
      <HelpCircle class="mx-auto h-16 w-16 text-slate-300" />
      <h1 class="text-2xl font-black text-slate-900">Curso no encontrado</h1>
      <p class="text-sm text-slate-500">El curso que buscas no existe o fue eliminado.</p>
      <Button class="mx-auto bg-[#0B3A78] text-white hover:bg-[#072a56]" @click="goBack">
        Volver a cursos
      </Button>
    </div>
  </div>
</template>
