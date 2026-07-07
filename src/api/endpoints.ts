export const API = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  courses: {
    list: '/courses',
    byId: (id: string) => `/courses/${id}` as const,
    progress: (id: string) => `/courses/${id}/progress` as const,
  },
  jobs: {
    list: '/jobs',
    apply: (id: string) => `/jobs/${id}/apply` as const,
  },
  user: {
    profile: '/user/profile',
    experiences: '/user/experiences',
  },
  content: {
    carousel: '/content/carousel',
    modules: '/content/modules',
    hero: '/content/hero',
    nav: '/content/nav',
  },
} as const
