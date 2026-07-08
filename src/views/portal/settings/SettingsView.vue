<script setup lang="ts">
import {
  Bell,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  Moon,
  Palette,
  Phone,
  Shield,
  Sun,
  UserRound,
} from 'lucide-vue-next'
import { ref } from 'vue'

import PortalSection from '@/components/shared/PortalSection.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()

// Simulated form state
const email = ref('carlos.quispe@email.com')
const phone = ref('+51 987 654 321')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const language = ref('es')
const theme = ref<'light' | 'dark' | 'system'>('system')
const notifications = ref({
  courses: true,
  jobs: true,
  certificates: true,
  marketing: false,
})
const twoFactor = ref(false)

const savedMessage = ref('')
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function simulateSave(section: string) {
  if (saveTimeout) clearTimeout(saveTimeout)
  savedMessage.value = section
  saveTimeout = setTimeout(() => {
    savedMessage.value = ''
  }, 2500)
}
</script>

<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <section class="grid gap-7">
      <!-- Hero header -->
      <div class="rounded-xl border border-[#DDE7F4] bg-[#F7F9FE] p-6 shadow-sm lg:p-8">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge class="border-slate-200/60 bg-slate-100 text-slate-700" variant="outline">
              Configuración
            </Badge>
            <h1 class="mt-4 text-3xl font-black tracking-normal text-[#07152B] sm:text-4xl">
              Ajustes de tu cuenta
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-[#41516A] sm:text-base">
              Gestiona tu correo, contraseña, notificaciones y preferencias de seguridad para mantener tu cuenta protegida.
            </p>
          </div>

          <div class="flex items-center gap-3 rounded-lg border border-blue-100 bg-white px-4 py-3 shadow-sm">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0B3A78] text-white">
              <UserRound class="h-5 w-5" />
            </div>
            <div class="text-sm">
              <strong class="block text-slate-950">{{ portal.user.value.name }}</strong>
              <span class="text-muted-foreground">{{ email }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Transition for saved message -->
      <Transition name="fade">
        <div
          v-if="savedMessage"
          class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ savedMessage }} actualizado correctamente
        </div>
      </Transition>

      <div class="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        <!-- Left column: Main settings -->
        <div class="grid gap-6">
          <!-- Email -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Mail class="h-5 w-5 text-primary" />
                Correo electrónico
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground" for="settings-email">
                  Dirección de correo
                </label>
                <Input id="settings-email" v-model="email" type="email" class="h-11" />
                <p class="mt-1.5 text-xs text-muted-foreground">
                  Se usa para iniciar sesión y recibir notificaciones.
                </p>
              </div>
              <div class="flex justify-end">
                <Button size="sm" @click="simulateSave('Correo')">
                  Guardar correo
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Phone -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Phone class="h-5 w-5 text-primary" />
                Teléfono
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground" for="settings-phone">
                  Número de celular
                </label>
                <Input id="settings-phone" v-model="phone" type="tel" class="h-11" />
                <p class="mt-1.5 text-xs text-muted-foreground">
                  Usado para verificación y alertas de seguridad.
                </p>
              </div>
              <div class="flex justify-end">
                <Button size="sm" @click="simulateSave('Teléfono')">
                  Guardar teléfono
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Password -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <KeyRound class="h-5 w-5 text-primary" />
                Cambiar contraseña
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground" for="current-password">
                  Contraseña actual
                </label>
                <div class="relative">
                  <Input
                    id="current-password"
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    class="h-11 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <Eye v-if="!showCurrentPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground" for="new-password">
                    Nueva contraseña
                  </label>
                  <div class="relative">
                    <Input
                      id="new-password"
                      v-model="newPassword"
                      :type="showNewPassword ? 'text' : 'password'"
                      class="h-11 pr-10"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      @click="showNewPassword = !showNewPassword"
                    >
                      <Eye v-if="!showNewPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground" for="confirm-password">
                    Confirmar contraseña
                  </label>
                  <Input
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    class="h-11"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <div class="flex justify-end">
                <Button size="sm" @click="simulateSave('Contraseña')">
                  Actualizar contraseña
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Notifications -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Bell class="h-5 w-5 text-primary" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-1">
              <label
                v-for="(value, key) in notifications"
                :key="key"
                class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 transition hover:bg-slate-50"
              >
                <div>
                  <strong class="block text-sm text-slate-950 capitalize">
                    {{ key === 'courses' ? 'Nuevos cursos y contenidos' : key === 'jobs' ? 'Oportunidades laborales' : key === 'certificates' ? 'Certificados y logros' : 'Novedades y promociones' }}
                  </strong>
                  <span class="text-xs text-muted-foreground">
                    {{ key === 'courses' ? 'Recibir avisos de nuevas publicaciones' : key === 'jobs' ? 'Alertas de vacantes afines a tu perfil' : key === 'certificates' ? 'Confirmaciones de constancias emitidas' : 'Ofertas, descuentos y noticias de Tukuy' }}
                  </span>
                </div>
                <div class="relative ml-3">
                  <input
                    :checked="notifications[key]"
                    type="checkbox"
                    class="peer sr-only"
                    @change="notifications[key] = !notifications[key]; simulateSave('Notificaciones')"
                  />
                  <div class="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#0B3A78]" />
                  <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </CardContent>
          </Card>
        </div>

        <!-- Right column: Sidebar settings -->
        <div class="grid content-start gap-6">
          <!-- Security -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Shield class="h-5 w-5 text-primary" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-3">
              <button
                type="button"
                class="flex items-center justify-between rounded-lg border border-border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                @click="twoFactor = !twoFactor; simulateSave('Autenticación en dos pasos')"
              >
                <div>
                  <strong class="block text-sm text-slate-950">Autenticación en dos pasos</strong>
                  <span class="text-xs text-muted-foreground">Agrega una capa extra de protección</span>
                </div>
                <Badge :variant="twoFactor ? 'success' : 'outline'">
                  {{ twoFactor ? 'Activo' : 'Desactivado' }}
                </Badge>
              </button>

              <button
                type="button"
                class="flex items-center justify-between rounded-lg border border-border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div>
                  <strong class="block text-sm text-slate-950">Sesiones activas</strong>
                  <span class="text-xs text-muted-foreground">Revisa los dispositivos conectados</span>
                </div>
                <div class="flex items-center gap-1 text-muted-foreground">
                  <Laptop class="h-4 w-4" />
                  <ChevronRight class="h-4 w-4" />
                </div>
              </button>

              <button
                type="button"
                class="flex items-center justify-between rounded-lg border border-border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div>
                  <strong class="block text-sm text-slate-950">Historial de accesos</strong>
                  <span class="text-xs text-muted-foreground">Últimos inicios de sesión</span>
                </div>
                <div class="flex items-center gap-1 text-muted-foreground">
                  <Lock class="h-4 w-4" />
                  <ChevronRight class="h-4 w-4" />
                </div>
              </button>
            </CardContent>
          </Card>

          <!-- Preferences -->
          <Card class="shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg">
                <Palette class="h-5 w-5 text-primary" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div>
                <label class="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                  Idioma
                </label>
                <div class="flex gap-2">
                  <Button
                    :variant="language === 'es' ? 'default' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="language = 'es'; simulateSave('Idioma')"
                  >
                    <Globe class="h-3.5 w-3.5" />
                    Español
                  </Button>
                  <Button
                    :variant="language === 'en' ? 'default' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="language = 'en'; simulateSave('Idioma')"
                  >
                    <Globe class="h-3.5 w-3.5" />
                    English
                  </Button>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                  Tema visual
                </label>
                <div class="flex gap-2">
                  <Button
                    :variant="theme === 'light' ? 'default' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="theme = 'light'; simulateSave('Tema')"
                  >
                    <Sun class="h-3.5 w-3.5" />
                    Claro
                  </Button>
                  <Button
                    :variant="theme === 'dark' ? 'default' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="theme = 'dark'; simulateSave('Tema')"
                  >
                    <Moon class="h-3.5 w-3.5" />
                    Oscuro
                  </Button>
                  <Button
                    :variant="theme === 'system' ? 'default' : 'outline'"
                    size="sm"
                    class="gap-1.5"
                    @click="theme = 'system'; simulateSave('Tema')"
                  >
                    <Laptop class="h-3.5 w-3.5" />
                    Sistema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Danger zone -->
          <Card class="border-red-200 shadow-sm">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-lg text-red-700">
                <Shield class="h-5 w-5" />
                Zona sensible
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-3">
              <p class="text-sm text-muted-foreground">
                Estas acciones son irreversibles. Asegúrate antes de proceder.
              </p>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" class="border-red-200 text-red-600 hover:bg-red-50">
                  Desactivar cuenta
                </Button>
                <Button variant="outline" size="sm" class="border-red-200 text-red-600 hover:bg-red-50">
                  Eliminar cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  </PortalSection>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
