/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_URL?: string
  readonly VITE_AUTH_PROVIDER?: "api" | "supabase"
  readonly VITE_SUPABASE_PRIMARY_URL?: string
  readonly VITE_SUPABASE_PRIMARY_ANON_KEY?: string
  readonly VITE_USE_MOCK: string
  readonly VITE_SECUNDARIA_CURSOS?: string
  readonly VITE_MEDIA_PUBLIC_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
