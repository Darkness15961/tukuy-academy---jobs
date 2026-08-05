/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_URL?: string
  readonly VITE_AUTH_PROVIDER?: "api" | "supabase"
  readonly VITE_SUPABASE_PRIMARY_URL?: string
  readonly VITE_SUPABASE_PRIMARY_ANON_KEY?: string
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
