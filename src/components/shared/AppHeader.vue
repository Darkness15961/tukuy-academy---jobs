<script setup lang="ts">
import {
  Award,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  Heart,
  LogOut,
  Settings,
  ShoppingCart,
  UserRound,
} from 'lucide-vue-next'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { portalPathByView } from '@/lib/portal-routes'
import { cn } from '@/lib/utils'
import type { Course, UserProfile, ViewId } from '@/types/academy'

const props = withDefaults(
  defineProps<{
    mode: 'public' | 'portal'
    user?: UserProfile
    navItems?: { id: ViewId; label: string }[]
    activeView?: ViewId
    enrolledCourses?: Course[]
    favoriteCourses?: Course[]
    cartCount?: number
    favoritesCount?: number
    contentLoading?: boolean
  }>(),
  {
    navItems: () => [],
    enrolledCourses: () => [],
    favoriteCourses: () => [],
    cartCount: 0,
    favoritesCount: 0,
    contentLoading: false,
  },
)

const emit = defineEmits<{
  navigate: [view: ViewId]
  logout: []
  scrollTo: [sectionId: string]
}>()

const router = useRouter()

const isPortal = computed(() => props.mode === 'portal')
const profilePhotoSrc = '/img/vistasimg/perfilfoto.png'
const profilePhotoFailed = ref(false)

const mainNavItems = computed(() =>
  props.navItems.filter((item) => item.id !== 'learning'),
)

const publicNavItems = [
  { id: '#cursos', label: 'Cursos' },
  { id: '#modulos', label: 'Módulos' },
  { id: '#beneficios', label: 'Beneficios' },
  { id: '#contacto', label: 'Contacto' },
]

function favoriteLabel(course: Course) {
  if (course.progress > 0 || course.status === 'En curso') return 'En curso'
  if (course.pricing === 'paid') return 'Pendiente de compra'
  return 'Pendiente de inscripción'
}

async function goHome() {
  if (isPortal.value) {
    emit('navigate', 'courses')
    await router.push(portalPathByView.courses)
    return
  }
  await router.push('/')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <header
    :class="
      cn(
        'sticky top-0 z-30 border-b backdrop-blur',
        isPortal
          ? 'border-border bg-card/95'
          : 'border-[#D6E2EF] bg-[#EAF1F8]/95 text-[#07152B] shadow-sm',
      )
    "
  >
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-4 lg:px-5">
      <Button
        class="h-auto shrink-0 gap-2.5 p-0 hover:bg-transparent"
        variant="ghost"
        type="button"
        @click="goHome"
      >
        <img class="h-10 w-auto object-contain sm:h-11" src="/img/iconoTukuyAcademy.png" alt="Tukuy Academy" />
        <div class="text-left">
          <strong
            class="block text-lg leading-none tracking-normal sm:text-xl"
            :class="isPortal ? '' : 'text-[#07152B]'"
          >
            <span class="font-black">Tukuy</span>
            <span class="font-light"> Academy</span>
          </strong>
          <span v-if="!isPortal" class="mt-1 block text-sm text-[#52657A]">Formación y empleabilidad</span>
        </div>
      </Button>

      <nav
        v-if="isPortal"
        class="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex"
      >
        <template v-if="contentLoading">
          <Skeleton v-for="i in 3" :key="i" class="h-9 w-24 shrink-0" />
        </template>
        <template v-else>
          <Button
            v-for="item in mainNavItems"
            :key="item.id"
            class="shrink-0 font-semibold text-muted-foreground hover:text-foreground"
            :class="activeView === item.id ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : ''"
            variant="ghost"
            type="button"
            @click="emit('navigate', item.id)"
          >
            {{ item.label }}
          </Button>

          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button
                class="shrink-0 gap-1 font-semibold text-muted-foreground hover:text-foreground"
                :class="activeView === 'learning' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : ''"
                variant="ghost"
                type="button"
              >
                Mi aprendizaje
                <ChevronDown class="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              :class="cn('z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-2 shadow-lg')"
              :side-offset="8"
              align="center"
            >
              <div class="grid gap-1">
                <button
                  v-for="course in enrolledCourses.slice(0, 4)"
                  :key="course.id"
                  type="button"
                  class="grid grid-cols-[56px_1fr] gap-3 rounded-md p-2 text-left transition hover:bg-muted"
                  @click="emit('navigate', 'learning')"
                >
                  <img :src="course.image" :alt="course.title" class="h-14 w-14 rounded-md object-cover" />
                  <div class="min-w-0 grid gap-1.5">
                    <span class="line-clamp-2 text-sm font-semibold leading-snug">{{ course.title }}</span>
                    <Progress :model-value="course.progress" class="h-1.5" />
                  </div>
                </button>
              </div>
              <Button class="mt-2 w-full" size="sm" @click="emit('navigate', 'learning')">
                Ir a Mi aprendizaje
              </Button>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </template>
      </nav>

      <nav v-else class="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
        <Button
          v-for="item in publicNavItems"
          :key="item.id"
          class="text-[#52657A] hover:bg-[#DDEAF7] hover:text-[#07152B]"
          variant="ghost"
          type="button"
          @click="emit('scrollTo', item.id)"
        >
          {{ item.label }}
        </Button>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <template v-if="isPortal && user">
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button
                class="relative"
                :class="activeView === 'favorites' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : ''"
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Favoritos"
              >
                <Heart class="h-5 w-5" :class="favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''" />
                <Badge
                  v-if="favoritesCount > 0"
                  class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
                  variant="default"
                >
                  {{ favoritesCount }}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              :class="cn('z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-2 shadow-lg')"
              :side-offset="8"
              align="end"
            >
              <p class="px-2 pb-2 text-sm font-semibold">Mis favoritos</p>
              <p class="px-2 pb-2 text-xs text-muted-foreground">Cursos de tu interés, comprados o pendientes.</p>
              <div v-if="favoriteCourses.length" class="grid gap-1">
                <button
                  v-for="course in favoriteCourses.slice(0, 4)"
                  :key="course.id"
                  type="button"
                  class="grid grid-cols-[56px_1fr] gap-3 rounded-md p-2 text-left transition hover:bg-muted"
                  @click="emit('navigate', 'favorites')"
                >
                  <img :src="course.image" :alt="course.title" class="h-14 w-14 rounded-md object-cover" />
                  <div class="min-w-0 grid gap-1">
                    <span class="line-clamp-2 text-sm font-semibold leading-snug">{{ course.title }}</span>
                    <span class="text-xs text-muted-foreground">{{ favoriteLabel(course) }}</span>
                  </div>
                </button>
              </div>
              <p v-else class="px-2 py-4 text-center text-sm text-muted-foreground">Aún no tienes favoritos.</p>
              <Button class="mt-2 w-full" size="sm" variant="outline" @click="emit('navigate', 'favorites')">
                Ver todos mis favoritos
              </Button>
            </DropdownMenuContent>
          </DropdownMenuRoot>

          <Button class="relative" variant="ghost" size="icon" type="button" aria-label="Carrito">
            <ShoppingCart class="h-5 w-5" />
            <Badge
              v-if="cartCount > 0"
              class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
              variant="default"
            >
              {{ cartCount }}
            </Badge>
          </Button>

          <Button class="hidden sm:inline-flex" variant="ghost" size="icon" type="button" aria-label="Notificaciones">
            <Bell class="h-5 w-5" />
          </Button>

          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button class="h-auto rounded-full p-1" variant="ghost" type="button" aria-label="Menú de usuario">
                <Avatar class="h-9 w-9 rounded-full border border-border bg-white shadow-sm">
                  <img
                    v-if="!profilePhotoFailed"
                    class="h-full w-full object-cover"
                    :src="profilePhotoSrc"
                    :alt="`Foto de ${user.name}`"
                    @error="profilePhotoFailed = true"
                  />
                  <AvatarFallback v-else class="text-xs">{{ user.initials }}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              :class="cn('z-50 min-w-56 rounded-lg border border-border bg-card p-1 shadow-lg')"
              :side-offset="8"
              align="end"
            >
              <DropdownMenuLabel class="px-2 py-2">
                <p class="text-sm font-semibold">{{ user.name }}</p>
                <p class="text-xs font-normal text-muted-foreground">{{ user.trade }}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'profile')"
              >
                <UserRound class="h-4 w-4" />
                Mi perfil laboral
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'jobs')"
              >
                <BriefcaseBusiness class="h-4 w-4" />
                Bolsa Tukuy
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'certificates')"
              >
                <Award class="h-4 w-4" />
                Mis certificados
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'settings')"
              >
                <Settings class="h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
                @select="emit('logout')"
              >
                <LogOut class="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </template>

        <Button v-else @click="goToLogin">Acceder</Button>
      </div>
    </div>
  </header>
</template>
