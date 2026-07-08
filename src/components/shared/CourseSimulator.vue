<script setup lang="ts">
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Play,
  RefreshCw,
  Star,
  Trophy,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Course } from '@/types/academy'

const props = defineProps<{
  course: Course | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  updateProgress: [courseId: string, progress: number, status: Course['status']]
}>()

const lessons = [
  { id: 1, title: '1. Introducción y Conceptos Generales', duration: '15 min' },
  { id: 2, title: '2. Herramientas y Metodología Aplicada', duration: '30 min' },
  { id: 3, title: '3. Casos de Estudio y Análisis de Errores', duration: '45 min' },
  { id: 4, title: '4. Evaluación Final y Conclusiones', duration: '20 min' },
]

const assignments = [
  { id: 1, title: 'Tarea 1: Registro de avance y evidencias', due: 'Disponible', grade: 18 },
  { id: 2, title: 'Tarea 2: Caso práctico aplicado a obra', due: 'Disponible', grade: 17 },
]

const exams = [
  { id: 1, title: 'Examen parcial: conceptos del módulo', questions: 12, grade: 16 },
  { id: 2, title: 'Examen final: validación de competencias', questions: 20, grade: 19 },
]

const completedLessons = ref<number[]>([])
const completedAssignments = ref<number[]>([])
const completedExams = ref<number[]>([])

// Sync local completed lessons state when course changes
watch(
  () => props.course,
  (newCourse) => {
    if (newCourse) {
      const count = Math.round((newCourse.progress / 100) * lessons.length)
      completedLessons.value = lessons.slice(0, count).map((lesson) => lesson.id)
      completedAssignments.value = newCourse.progress >= 60 ? assignments.slice(0, 1).map((task) => task.id) : []
      completedExams.value = newCourse.progress >= 90 ? exams.slice(0, 1).map((exam) => exam.id) : []
    } else {
      completedLessons.value = []
      completedAssignments.value = []
      completedExams.value = []
    }
  },
  { immediate: true },
)

const totalActivities = computed(() => lessons.length + assignments.length + exams.length)
const completedActivities = computed(
  () => completedLessons.value.length + completedAssignments.value.length + completedExams.value.length,
)

const progressPercent = computed(() => {
  return Math.round((completedActivities.value / totalActivities.value) * 100)
})

const gradedActivities = computed(() => [
  ...assignments.filter((task) => completedAssignments.value.includes(task.id)).map((task) => task.grade),
  ...exams.filter((exam) => completedExams.value.includes(exam.id)).map((exam) => exam.grade),
])

const averageGrade = computed(() => {
  if (!gradedActivities.value.length) return 0
  const total = gradedActivities.value.reduce((sum, grade) => sum + grade, 0)
  return Math.round((total / gradedActivities.value.length) * 10) / 10
})

const gradeStatus = computed(() => {
  if (!gradedActivities.value.length) return 'Pendiente'
  return averageGrade.value >= 14 ? 'Aprobando' : 'En riesgo'
})

function toggleLesson(lessonId: number) {
  const index = completedLessons.value.indexOf(lessonId)
  if (index >= 0) {
    // Unchecking a lesson should also uncheck subsequent ones to keep sequential progress
    completedLessons.value = completedLessons.value.filter((id) => id < lessonId)
  } else {
    // Checking a lesson should also check previous ones
    const toAdd: number[] = []
    for (let i = 1; i <= lessonId; i++) {
      if (!completedLessons.value.includes(i)) {
        toAdd.push(i)
      }
    }
    completedLessons.value = [...completedLessons.value, ...toAdd].sort((a, b) => a - b)
  }

  triggerUpdate()
}

function toggleAssignment(taskId: number) {
  if (completedAssignments.value.includes(taskId)) {
    completedAssignments.value = completedAssignments.value.filter((id) => id !== taskId)
  } else {
    completedAssignments.value = [...completedAssignments.value, taskId].sort((a, b) => a - b)
  }

  triggerUpdate()
}

function toggleExam(examId: number) {
  if (completedExams.value.includes(examId)) {
    completedExams.value = completedExams.value.filter((id) => id !== examId)
  } else {
    completedExams.value = [...completedExams.value, examId].sort((a, b) => a - b)
  }

  triggerUpdate()
}

function triggerUpdate() {
  if (!props.course) return
  const progress = progressPercent.value
  let status: Course['status'] = 'Disponible'
  if (progress === 100) {
    status = 'Completado'
  } else if (progress > 0) {
    status = 'En curso'
  } else {
    status = 'En curso' // Once started, it remains active
  }
  emit('updateProgress', props.course.id, progress, status)
}

function simulateQuickComplete() {
  completedLessons.value = lessons.map((l) => l.id)
  completedAssignments.value = assignments.map((task) => task.id)
  completedExams.value = exams.map((exam) => exam.id)
  triggerUpdate()
}

function simulateReset() {
  completedLessons.value = []
  completedAssignments.value = []
  completedExams.value = []
  triggerUpdate()
}
</script>

<template>
  <Transition name="fade-overlay">
    <div
      v-if="open && course"
      class="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100"
    >
      <!-- Top header -->
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 backdrop-blur sm:px-6">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            class="text-slate-400 hover:bg-slate-800 hover:text-white"
            @click="emit('close')"
          >
            <ChevronLeft class="h-6 w-6" />
          </Button>
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400 sm:text-xs">
              Simulador de Aprendizaje
            </span>
            <h1 class="line-clamp-1 text-sm font-black sm:text-base">
              {{ course.title }}
            </h1>
          </div>
        </div>

        <!-- Exit button -->
        <Button
          variant="outline"
          size="sm"
          class="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
          @click="emit('close')"
        >
          Salir del curso
        </Button>
      </header>

      <!-- Main course workspace -->
      <div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <!-- Left: Player and course resources -->
        <div class="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          <!-- Video simulator placeholder -->
          <div class="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <!-- Simulated video background -->
            <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div class="rounded-full bg-blue-500/10 p-5 ring-4 ring-blue-500/20">
                <Play class="h-10 w-10 text-blue-400 fill-blue-400" />
              </div>
              <h3 class="mt-4 text-base font-bold sm:text-lg">
                Clase en reproducción automática
              </h3>
              <p class="mt-1 max-w-md text-xs text-slate-400 sm:text-sm">
                Interactúa con el temario en la columna derecha para marcar las clases como completadas y simular tu avance.
              </p>

              <!-- Quick action banner -->
              <div class="mt-6 flex flex-wrap gap-2.5">
                <Button
                  size="sm"
                  class="bg-blue-600 font-semibold text-white hover:bg-blue-500"
                  @click="simulateQuickComplete"
                >
                  <Trophy class="mr-1.5 h-4 w-4" />
                  Completar curso (100%)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                  @click="simulateReset"
                >
                  <RefreshCw class="mr-1.5 h-4 w-4" />
                  Reiniciar avance
                </Button>
              </div>
            </div>

            <!-- Fake control bar -->
            <div class="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-slate-950/80 px-4 py-2 text-xs text-slate-400">
              <span>02:14 / 15:00</span>
              <div class="h-1 flex-1 mx-4 rounded bg-slate-800 overflow-hidden">
                <div class="h-full bg-blue-500 w-[15%]" />
              </div>
              <span>Calidad HD</span>
            </div>
          </div>

          <!-- Description and details -->
          <div class="mt-6">
            <h2 class="text-lg font-black text-white">Acerca de esta sesión</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-400">
              Esta simulación interactiva te permite verificar cómo se actualiza la interfaz de Tukuy Academy en tiempo real. Al marcar los temas a la derecha, verás cómo tu progreso cambia, y al completar el 100% se generará automáticamente tu certificado digital verificable.
            </p>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <ClipboardCheck class="h-4 w-4 text-blue-400" />
                Actividades
              </div>
              <strong class="mt-2 block text-2xl text-white">{{ completedActivities }}/{{ totalActivities }}</strong>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <Star class="h-4 w-4 text-amber-300" />
                Promedio
              </div>
              <strong class="mt-2 block text-2xl text-white">
                {{ averageGrade || '--' }}
              </strong>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div class="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <GraduationCap class="h-4 w-4 text-emerald-300" />
                Estado
              </div>
              <strong class="mt-2 block text-2xl" :class="gradeStatus === 'En riesgo' ? 'text-amber-300' : 'text-white'">
                {{ gradeStatus }}
              </strong>
            </div>
          </div>
        </div>

        <!-- Right: Syllabus and progress status -->
        <div class="w-full shrink-0 border-t border-slate-800 bg-slate-900/30 backdrop-blur lg:w-96 lg:border-l lg:border-t-0 flex flex-col">
          <!-- Syllabus header with progress -->
          <div class="p-4 border-b border-slate-800 bg-slate-900/50">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Progreso general</span>
              <span class="text-sm font-black text-blue-400">{{ progressPercent }}%</span>
            </div>
            <Progress :model-value="progressPercent" class="h-2.5 bg-slate-800" />
          </div>

          <!-- Lesson list -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Contenido del curso</h3>

            <button
              v-for="lesson in lessons"
              :key="lesson.id"
              type="button"
              class="w-full flex items-start gap-3.5 p-3 rounded-lg border text-left transition duration-200"
              :class="[
                completedLessons.includes(lesson.id)
                  ? 'bg-blue-950/20 border-blue-500/30 hover:bg-blue-950/30'
                  : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'
              ]"
              @click="toggleLesson(lesson.id)"
            >
              <!-- Check icon -->
              <span class="shrink-0 mt-0.5">
                <CheckCircle2
                  class="h-5 w-5 transition duration-200"
                  :class="[
                    completedLessons.includes(lesson.id)
                      ? 'text-blue-500 fill-blue-500/20'
                      : 'text-slate-600'
                  ]"
                />
              </span>

              <!-- Lesson info -->
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-semibold transition duration-200"
                  :class="completedLessons.includes(lesson.id) ? 'text-white' : 'text-slate-300'"
                >
                  {{ lesson.title }}
                </p>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span class="flex items-center gap-1">
                    <BookOpen class="h-3 w-3" /> Clase
                  </span>
                  <span>·</span>
                  <span>{{ lesson.duration }}</span>
                </div>
              </div>
            </button>

            <h3 class="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Tareas calificadas</h3>

            <button
              v-for="task in assignments"
              :key="task.id"
              type="button"
              class="flex w-full items-start gap-3.5 rounded-lg border p-3 text-left transition duration-200"
              :class="[
                completedAssignments.includes(task.id)
                  ? 'border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50'
              ]"
              @click="toggleAssignment(task.id)"
            >
              <span class="mt-0.5 shrink-0">
                <FileCheck2
                  class="h-5 w-5 transition duration-200"
                  :class="completedAssignments.includes(task.id) ? 'text-emerald-400' : 'text-slate-600'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-semibold"
                  :class="completedAssignments.includes(task.id) ? 'text-white' : 'text-slate-300'"
                >
                  {{ task.title }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{{ task.due }}</span>
                  <span>·</span>
                  <span>Nota simulada: {{ task.grade }}/20</span>
                </div>
              </div>
            </button>

            <h3 class="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Exámenes</h3>

            <button
              v-for="exam in exams"
              :key="exam.id"
              type="button"
              class="flex w-full items-start gap-3.5 rounded-lg border p-3 text-left transition duration-200"
              :class="[
                completedExams.includes(exam.id)
                  ? 'border-amber-400/30 bg-amber-950/20 hover:bg-amber-950/30'
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50'
              ]"
              @click="toggleExam(exam.id)"
            >
              <span class="mt-0.5 shrink-0">
                <GraduationCap
                  class="h-5 w-5 transition duration-200"
                  :class="completedExams.includes(exam.id) ? 'text-amber-300' : 'text-slate-600'"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-semibold"
                  :class="completedExams.includes(exam.id) ? 'text-white' : 'text-slate-300'"
                >
                  {{ exam.title }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>{{ exam.questions }} preguntas</span>
                  <span>·</span>
                  <span>Nota simulada: {{ exam.grade }}/20</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
