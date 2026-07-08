<script setup lang="ts">
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  FileText,
  HelpCircle,
  MessageSquare,
  Play,
  Star,
  Trophy,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getCourseSections } from '@/data/course-sections'
import type { Course, CourseSection } from '@/types/academy'
import { usePortalContext } from '../composables/usePortalContext'

const route = useRoute()
const router = useRouter()
const portal = usePortalContext()

const courseId = computed(() => route.params.courseId as string)
const course = computed(() => portal.courses.value.find((c) => c.id === courseId.value) ?? null)
const sections = computed<CourseSection[]>(() =>
  course.value ? getCourseSections(course.value.id, course.value.title, course.value.category) : [],
)

const totalLessons = computed(() => sections.value.reduce((sum, s) => sum + s.lessons.length, 0))
const totalDuration = computed(() => {
  let mins = 0
  sections.value.forEach((s) =>
    s.lessons.forEach((l) => {
      mins += Number.parseInt(l.duration, 10) || 0
    }),
  )
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}min` : `${m} min`
})

// Lesson completion state persisted per course
const STORAGE_KEY = 'tukuy_lesson_progress'
const completedLessons = ref<Set<string>>(new Set())

function loadLessonProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      completedLessons.value = new Set(data[courseId.value] ?? [])
    }
  } catch { /* ignore */ }
}

function saveLessonProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[courseId.value] = [...completedLessons.value]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

onMounted(loadLessonProgress)
watch(courseId, loadLessonProgress)

// Active lesson for "playing"
const activeLessonId = ref<string | null>(null)
const activeLesson = computed(() => {
  if (!activeLessonId.value) return null
  for (const s of sections.value) {
    const found = s.lessons.find((l) => l.id === activeLessonId.value)
    if (found) return found
  }
  return null
})

// Auto-select first incomplete lesson on mount
watch(sections, (newSections) => {
  if (!activeLessonId.value && newSections.length > 0) {
    for (const s of newSections) {
      for (const l of s.lessons) {
        if (!completedLessons.value.has(l.id)) {
          activeLessonId.value = l.id
          return
        }
      }
    }
    activeLessonId.value = newSections[0]?.lessons[0]?.id ?? null
  }
}, { immediate: true })

function toggleLesson(lessonId: string) {
  if (completedLessons.value.has(lessonId)) {
    completedLessons.value.delete(lessonId)
  } else {
    completedLessons.value.add(lessonId)
  }
  completedLessons.value = new Set(completedLessons.value) // trigger reactivity
  syncCourseProgress()
  saveLessonProgress()
}

function selectLesson(lessonId: string) {
  activeLessonId.value = lessonId
  if (!completedLessons.value.has(lessonId)) {
    completedLessons.value.add(lessonId)
    completedLessons.value = new Set(completedLessons.value)
    syncCourseProgress()
    saveLessonProgress()
  }
}

function syncCourseProgress() {
  if (!course.value) return
  const progress = totalLessons.value > 0
    ? Math.round((completedLessons.value.size / totalLessons.value) * 100)
    : 0
  const status: Course['status'] = progress >= 100 ? 'Completado' : progress > 0 ? 'En curso' : 'Disponible'

  const target = portal.courses.value.find((c) => c.id === courseId.value)
  if (target) {
    target.progress = progress
    target.status = status
    // Also persist to main progress storage
    const progressMap: Record<string, { progress: number; status: Course['status'] }> = {}
    portal.courses.value.forEach((c) => {
      progressMap[c.id] = { progress: c.progress, status: c.status }
    })
    localStorage.setItem('tukuy_academy_progress', JSON.stringify(progressMap))
  }
}

const progressPercent = computed(() =>
  totalLessons.value > 0 ? Math.round((completedLessons.value.size / totalLessons.value) * 100) : 0,
)

// Sidebar sections expand/collapse
const expandedSections = ref<Set<string>>(new Set())
onMounted(() => {
  // Auto-expand all sections initially
  sections.value.forEach((s) => expandedSections.value.add(s.id))
})
watch(sections, (newSections) => {
  newSections.forEach((s) => expandedSections.value.add(s.id))
})

function toggleSection(sectionId: string) {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId)
  } else {
    expandedSections.value.add(sectionId)
  }
  expandedSections.value = new Set(expandedSections.value)
}

function sectionProgress(section: CourseSection) {
  const done = section.lessons.filter((l) => completedLessons.value.has(l.id)).length
  return { done, total: section.lessons.length }
}

function sectionDuration(section: CourseSection) {
  let mins = 0
  section.lessons.forEach((l) => { mins += Number.parseInt(l.duration, 10) || 0 })
  return `${mins} min`
}

// Active tab
const activeTab = ref<'descripcion' | 'preguntas' | 'notas' | 'resenas'>('descripcion')

function goBack() {
  router.push('/tukuy-academy/cursos')
}

function completeAll() {
  sections.value.forEach((s) => s.lessons.forEach((l) => completedLessons.value.add(l.id)))
  completedLessons.value = new Set(completedLessons.value)
  syncCourseProgress()
  saveLessonProgress()
}

function resetAll() {
  completedLessons.value = new Set()
  syncCourseProgress()
  saveLessonProgress()
}

// Mobile sidebar toggle
const sidebarOpen = ref(false)
</script>

<template>
  <div v-if="course" class="flex h-screen flex-col bg-[#1c1d1f] text-white">
    <!-- Top bar -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-[#3e4143] bg-[#1c1d1f] px-3 sm:px-5">
      <div class="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
          @click="goBack"
        >
          <ChevronLeft class="h-5 w-5" />
        </Button>
        <div class="hidden h-7 w-px bg-[#3e4143] sm:block" />
        <img class="hidden h-6 w-auto sm:block" src="/img/iconoTukuyAcademy.png" alt="Tukuy Academy" />
        <h1 class="min-w-0 truncate text-sm font-bold">{{ course.title }}</h1>
      </div>

      <div class="flex items-center gap-2">
        <!-- Progress pill -->
        <div class="hidden items-center gap-2 rounded-full border border-[#3e4143] bg-[#2d2f31] px-3 py-1.5 sm:flex">
          <CirclePlay class="h-4 w-4 text-[#a435f0]" />
          <span class="text-xs font-medium">Tu progreso</span>
          <strong class="text-xs text-[#a435f0]">{{ progressPercent }}%</strong>
        </div>

        <!-- Quick actions -->
        <Button
          size="sm"
          class="hidden bg-[#a435f0] text-white hover:bg-[#8710d8] sm:flex"
          @click="completeAll"
        >
          <Trophy class="mr-1 h-3.5 w-3.5" />
          Completar todo
        </Button>

        <!-- Mobile sidebar toggle -->
        <Button
          variant="ghost"
          size="icon"
          class="text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          @click="sidebarOpen = !sidebarOpen"
        >
          <BookOpen class="h-5 w-5" />
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Player + tabs -->
      <div class="flex flex-1 flex-col overflow-y-auto">
        <!-- Video player area -->
        <div class="relative aspect-video w-full bg-black">
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <!-- Play button -->
            <button
              type="button"
              class="group grid h-20 w-20 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 hover:scale-105"
            >
              <Play class="h-8 w-8 text-white fill-white" />
            </button>
            <p class="text-sm font-medium text-white/80">
              {{ activeLesson ? activeLesson.title : 'Selecciona una clase' }}
            </p>
          </div>

          <!-- Fake progress bar at bottom of video -->
          <div class="absolute bottom-0 left-0 right-0">
            <div class="h-1 bg-[#3e4143]">
              <div class="h-full bg-[#a435f0] transition-all duration-500" :style="{ width: '32%' }" />
            </div>
          </div>
        </div>

        <!-- Tabs + content below -->
        <div class="border-b border-[#3e4143] bg-[#1c1d1f]">
          <nav class="flex gap-0 overflow-x-auto px-4">
            <button
              type="button"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-bold transition"
              :class="activeTab === 'descripcion' ? 'border-b-2 border-white text-white' : 'text-white/60 hover:text-white'"
              @click="activeTab = 'descripcion'"
            >
              Descripción general
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-bold transition"
              :class="activeTab === 'preguntas' ? 'border-b-2 border-white text-white' : 'text-white/60 hover:text-white'"
              @click="activeTab = 'preguntas'"
            >
              Preguntas y respuestas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-bold transition"
              :class="activeTab === 'notas' ? 'border-b-2 border-white text-white' : 'text-white/60 hover:text-white'"
              @click="activeTab = 'notas'"
            >
              Notas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-3.5 text-sm font-bold transition"
              :class="activeTab === 'resenas' ? 'border-b-2 border-white text-white' : 'text-white/60 hover:text-white'"
              @click="activeTab = 'resenas'"
            >
              Reseñas
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div class="bg-[#1c1d1f] p-5 sm:p-8">
          <template v-if="activeTab === 'descripcion'">
            <h2 class="text-xl font-black">{{ course.title }}</h2>

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div v-if="course.rating" class="flex items-center gap-1.5">
                <strong class="text-[#f3ca56]">{{ course.rating }}</strong>
                <div class="flex gap-0.5">
                  <Star v-for="i in 5" :key="i" class="h-3.5 w-3.5" :class="i <= Math.round(course.rating) ? 'fill-[#f3ca56] text-[#f3ca56]' : 'text-[#6a6f73]'" />
                </div>
                <span class="text-white/50">({{ course.reviewCount?.toLocaleString() }} calificaciones)</span>
              </div>

              <span class="text-white/50">{{ totalLessons }} clases</span>
              <span class="text-white/50">{{ totalDuration }} en total</span>
              <Badge v-if="course.bestseller" class="bg-[#eceb98] text-[#3d3c0a]">Más vendido</Badge>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span v-if="course.instructor">Creado por <strong class="text-[#c0c4fc]">{{ course.instructor }}</strong></span>
              <span>{{ course.mode }} · {{ course.level }}</span>
              <span>Última actualización julio de 2026</span>
            </div>

            <div class="mt-8 border-t border-[#3e4143] pt-6">
              <h3 class="text-lg font-bold">Lo que aprenderás</h3>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="flex gap-3 rounded border border-[#3e4143] p-3">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span class="text-sm text-white/80">Aplicar {{ course.category.toLowerCase() }} en flujos reales de obra y campo.</span>
                </div>
                <div class="flex gap-3 rounded border border-[#3e4143] p-3">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span class="text-sm text-white/80">Reforzar criterios para control operativo y oficina técnica.</span>
                </div>
                <div class="flex gap-3 rounded border border-[#3e4143] p-3">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span class="text-sm text-white/80">Generar evidencias válidas para tu CV inteligente Tukuy.</span>
                </div>
                <div class="flex gap-3 rounded border border-[#3e4143] p-3">
                  <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
                  <span class="text-sm text-white/80">Obtener certificado verificable al completar todas las lecciones.</span>
                </div>
              </div>
            </div>

            <!-- Quick simulation controls -->
            <div class="mt-8 rounded-lg border border-dashed border-[#a435f0]/40 bg-[#a435f0]/5 p-5">
              <h3 class="text-sm font-bold text-[#a435f0]">Panel de simulación</h3>
              <p class="mt-1 text-xs text-white/50">Usa estos controles para probar cómo se actualiza el progreso en tiempo real.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button size="sm" class="bg-[#a435f0] text-white hover:bg-[#8710d8]" @click="completeAll">
                  <Trophy class="mr-1.5 h-3.5 w-3.5" /> Completar 100%
                </Button>
                <Button size="sm" variant="outline" class="border-[#3e4143] text-white/70 hover:bg-white/10 hover:text-white" @click="resetAll">
                  Reiniciar avance
                </Button>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'preguntas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <MessageSquare class="h-12 w-12 text-white/20" />
              <h3 class="text-base font-bold">Preguntas y respuestas</h3>
              <p class="max-w-md text-sm text-white/50">Próximamente podrás hacer preguntas sobre las lecciones y el instructor responderá aquí.</p>
            </div>
          </template>

          <template v-else-if="activeTab === 'notas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <FileText class="h-12 w-12 text-white/20" />
              <h3 class="text-base font-bold">Tus notas</h3>
              <p class="max-w-md text-sm text-white/50">Guarda apuntes importantes durante las clases para repasarlos más adelante.</p>
            </div>
          </template>

          <template v-else-if="activeTab === 'resenas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <Star class="h-12 w-12 text-white/20" />
              <h3 class="text-base font-bold">Reseñas del curso</h3>
              <p class="max-w-md text-sm text-white/50">Al completar el curso podrás dejar tu valoración y ayudar a otros estudiantes.</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Right: Course content sidebar -->
      <aside
        class="shrink-0 flex-col border-l border-[#3e4143] bg-[#1c1d1f]"
        :class="[
          sidebarOpen
            ? 'fixed inset-y-14 right-0 z-40 flex w-80 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-96 lg:shadow-none'
            : 'hidden lg:flex lg:w-96',
        ]"
      >
        <!-- Sidebar header -->
        <div class="flex items-center justify-between border-b border-[#3e4143] px-4 py-3">
          <h2 class="text-sm font-bold">Contenido del curso</h2>
          <Button
            variant="ghost"
            size="icon"
            class="text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
            @click="sidebarOpen = false"
          >
            <ChevronRight class="h-5 w-5" />
          </Button>
        </div>

        <!-- Progress summary -->
        <div class="border-b border-[#3e4143] px-4 py-3">
          <div class="flex items-center justify-between text-xs">
            <span class="text-white/50">{{ completedLessons.size }} de {{ totalLessons }} completadas</span>
            <strong class="text-[#a435f0]">{{ progressPercent }}%</strong>
          </div>
          <Progress :model-value="progressPercent" class="mt-2 h-1.5 bg-[#3e4143]" />
        </div>

        <!-- Sections list -->
        <div class="flex-1 overflow-y-auto">
          <div v-for="section in sections" :key="section.id" class="border-b border-[#3e4143]">
            <!-- Section header -->
            <button
              type="button"
              class="flex w-full items-center justify-between bg-[#2d2f31] px-4 py-3 text-left transition hover:bg-[#3e4143]"
              @click="toggleSection(section.id)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold truncate">{{ section.title }}</p>
                <p class="mt-0.5 text-xs text-white/40">
                  {{ sectionProgress(section).done }}/{{ sectionProgress(section).total }} |
                  {{ sectionDuration(section) }}
                </p>
              </div>
              <ChevronDown
                class="h-4 w-4 shrink-0 text-white/40 transition-transform"
                :class="expandedSections.has(section.id) ? 'rotate-180' : ''"
              />
            </button>

            <!-- Lessons -->
            <div v-if="expandedSections.has(section.id)">
              <button
                v-for="lesson in section.lessons"
                :key="lesson.id"
                type="button"
                class="group flex w-full items-start gap-3 px-4 py-2.5 text-left transition"
                :class="[
                  activeLessonId === lesson.id
                    ? 'bg-[#3e4143]'
                    : 'hover:bg-[#2d2f31]',
                ]"
                @click="selectLesson(lesson.id)"
              >
                <!-- Checkbox -->
                <label class="mt-0.5 shrink-0 cursor-pointer" @click.stop>
                  <input
                    type="checkbox"
                    class="peer sr-only"
                    :checked="completedLessons.has(lesson.id)"
                    @change="toggleLesson(lesson.id)"
                  />
                  <span
                    class="grid h-[18px] w-[18px] place-items-center rounded border transition"
                    :class="
                      completedLessons.has(lesson.id)
                        ? 'border-[#a435f0] bg-[#a435f0]'
                        : 'border-[#6a6f73] bg-transparent'
                    "
                  >
                    <svg
                      v-if="completedLessons.has(lesson.id)"
                      class="h-3 w-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </label>

                <!-- Lesson info -->
                <div class="min-w-0 flex-1">
                  <p class="text-[13px] leading-snug" :class="completedLessons.has(lesson.id) ? 'text-white/50' : 'text-white/90'">
                    {{ lesson.title }}
                  </p>
                  <div class="mt-1 flex items-center gap-2 text-[11px] text-white/35">
                    <CirclePlay v-if="lesson.type === 'video'" class="h-3 w-3" />
                    <FileText v-else-if="lesson.type === 'lectura'" class="h-3 w-3" />
                    <HelpCircle v-else class="h-3 w-3" />
                    <span>{{ lesson.duration }}</span>
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
  <div v-else class="grid min-h-screen place-items-center bg-[#1c1d1f] text-center text-white">
    <div class="grid gap-4">
      <HelpCircle class="mx-auto h-16 w-16 text-white/20" />
      <h1 class="text-2xl font-black">Curso no encontrado</h1>
      <p class="text-sm text-white/50">El curso que buscas no existe o fue eliminado.</p>
      <Button class="mx-auto bg-[#a435f0] text-white hover:bg-[#8710d8]" @click="goBack">
        Volver a cursos
      </Button>
    </div>
  </div>
</template>
