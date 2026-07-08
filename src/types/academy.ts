import type { Component } from 'vue'

export type ViewId = 'courses' | 'learning' | 'favorites' | 'jobs' | 'cv' | 'certificates' | 'profile' | 'settings'

export type CoursePricing = 'free' | 'paid'

export type Course = {
  id: string
  title: string
  category: string
  duration: string
  level: 'Basico' | 'Intermedio' | 'Avanzado'
  mode: 'Virtual' | 'Presencial' | 'Mixto'
  progress: number
  status: 'Disponible' | 'En curso' | 'Completado'
  pricing: CoursePricing
  price?: number
  imageTone: string
  image: string
  instructor?: string
  rating?: number
  reviewCount?: number
  bestseller?: boolean
}

export type CourseLesson = {
  id: string
  title: string
  duration: string
  type: 'video' | 'lectura' | 'quiz'
}

export type CourseSection = {
  id: string
  title: string
  lessons: CourseLesson[]
}

export type Job = {
  id: string
  title: string
  company: string
  location: string
  match: number
  postedAt: string
  deadlineAt: string
  deadline: string
  tags: string[]
}

export type WorkExperience = {
  id: string
  source: 'Tukuy Obra' | 'SIADEG' | 'Manual'
  project: string
  role: string
  location: string
  period: string
  modules: string[]
  status: 'Importado' | 'Declarado' | 'Verificado'
  summary: string
}

export type UserProfile = {
  name: string
  initials: string
  trade: string
  specialty: string
  location: string
  profileProgress: number
  employabilityScore: number
  certificates: number
  applications: number
}

export type CarouselSlide = {
  title: string
  description: string
  image: string
  label: string
}

export type SystemCourse = {
  title: string
  description: string
  icon: Component
  badge: string
}

export type TukuyModule = {
  icon: string
  title: string
  description: string
  tags: string[]
}
