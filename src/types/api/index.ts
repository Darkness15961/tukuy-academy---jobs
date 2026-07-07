import type { Course, Job, UserProfile, WorkExperience } from '@/types/academy'

export type CourseDto = Course
export type JobDto = Job
export type UserProfileDto = UserProfile
export type WorkExperienceDto = WorkExperience

export type LoginRequestDto = {
  dni: string
  password: string
}

export type LoginResponseDto = {
  token: string
  user: UserProfileDto
}

export type CarouselSlideDto = {
  title: string
  description: string
  image: string
  label: string
}

export type TukuyModuleDto = {
  icon: string
  title: string
  description: string
  tags: string[]
}

export type NavItemDto = {
  id: string
  label: string
}
