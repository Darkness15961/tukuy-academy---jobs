import { computed, onMounted, ref } from 'vue'

import { coursesService } from '@/api/services/courses.service'
import type { Course } from '@/types/academy'

export function useCourses() {
  const courses = ref<Course[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCourses() {
    loading.value = true
    error.value = null
    try {
      courses.value = await coursesService.getAll()
    } catch {
      error.value = 'No se pudieron cargar los cursos'
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchCourses)

  const completedCourses = computed(() =>
    courses.value.filter((course) => course.progress === 100 || course.status === 'Completado'),
  )

  const activeCourses = computed(() => courses.value.filter((course) => course.status === 'En curso'))

  return {
    courses,
    loading,
    error,
    completedCourses,
    activeCourses,
    refetch: fetchCourses,
  }
}

export function useCourseFilter(courses: () => Course[]) {
  const searchTerm = ref('')

  const filteredCourses = computed(() => {
    const term = searchTerm.value.trim().toLowerCase()
    const list = courses()
    if (!term) return list
    return list.filter((course) =>
      [course.title, course.category, course.level, course.mode].some((value) => value.toLowerCase().includes(term)),
    )
  })

  return { searchTerm, filteredCourses }
}
