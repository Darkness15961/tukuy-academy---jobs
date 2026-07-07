import { createApp } from 'vue'

import App from '@/App.vue'
import { env } from '@/lib/env'
import router from '@/router'
import '@/style.css'

if (import.meta.env.DEV) {
  console.info(`[Tukuy Academy] API: ${env.apiUrl} · mock: ${env.useMock}`)
}

createApp(App).use(router).mount('#app')
