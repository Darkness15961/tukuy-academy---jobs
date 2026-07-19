<script setup lang="ts">
import {
  Award,
  ArrowLeftRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  GraduationCap,
  Heart,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  UserRound,
  UsersRound,
  X,
} from "lucide-vue-next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "reka-ui";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import SelectorTema from "@/components/shared/SelectorTema.vue";
import { portalPathByView } from "@/lib/portal-routes";
import {
  etiquetaRol,
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import { cn } from "@/lib/utils";
import type { Course, UserProfile, ViewId } from "@/types/academia";

const props = withDefaults(
  defineProps<{
    mode: "public" | "portal";
    user?: UserProfile;
    navItems?: { id: ViewId; label: string }[];
    activeView?: ViewId;
    enrolledCourses?: Course[];
    favoriteCourses?: Course[];
    cartCount?: number;
    favoritesCount?: number;
    contentLoading?: boolean;
  }>(),
  {
    navItems: () => [],
    enrolledCourses: () => [],
    favoriteCourses: () => [],
    cartCount: 0,
    favoritesCount: 0,
    contentLoading: false,
  },
);

const emit = defineEmits<{
  navigate: [view: ViewId];
  logout: [];
  scrollTo: [sectionId: string];
}>();

const route = useRoute();
const router = useRouter();
const {
  contextoActivo,
  funcionesEntidadActiva,
  cambiarFuncion,
} = useContextoSesion();
const isDropdownOpen = ref(false);
const mobileMenuOpen = ref(false);

const isPortal = computed(() => props.mode === "portal");
const profilePhotoSrc = "/img/vistasimg/perfilfoto.png";
const profilePhotoFailed = ref(false);
const otrasFunciones = computed(() =>
  contextoActivo.value?.organizacionId &&
  !contextoActivo.value.organizacionId.startsWith("org-personal-")
    ? funcionesEntidadActiva.value.filter(
        (item) => item.id !== contextoActivo.value?.membresiaId,
      )
    : [],
);

/** Portal: colapsa bajo lg (1024px). Público: bajo md (768px). */
const navBreakpoint = computed(() => (isPortal.value ? "lg" : "md"));

const mainNavItems = computed(() =>
  props.navItems.filter((item) => item.id !== "learning"),
);

const publicNavItems = [
  { id: "#cursos", label: "Cursos" },
  { id: "#modulos", label: "Módulos" },
  { id: "#beneficios", label: "Beneficios" },
  { id: "#contacto", label: "Contacto" },
];

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
    isDropdownOpen.value = false;
  },
);

function favoriteLabel(course: Course) {
  if (course.progress > 0 || course.status === "En curso") return "En curso";
  if (course.pricing === "paid") return "Pendiente de compra";
  return "Pendiente de inscripción";
}

function getNavIcon(id: ViewId) {
  if (id === "courses") return GraduationCap;
  if (id === "learning") return BookOpen;
  if (id === "favorites") return Heart;
  if (id === "jobs") return BriefcaseBusiness;
  if (id === "cv") return FileText;
  if (id === "certificates") return Award;
  if (id === "profile") return UserRound;
  if (id === "settings") return Settings;
  return GraduationCap;
}

function navigateToCourse(courseId: string) {
  isDropdownOpen.value = false;
  router.push(`/tukuy-academy/aprendizaje/${courseId}`);
}

function navigateToLearning() {
  isDropdownOpen.value = false;
  emit("navigate", "learning");
}

function handleMobileNavigate(view: ViewId) {
  mobileMenuOpen.value = false;
  emit("navigate", view);
}

function handleMobileScroll(sectionId: string) {
  mobileMenuOpen.value = false;
  emit("scrollTo", sectionId);
}

async function goHome() {
  if (isPortal.value) {
    emit("navigate", "courses");
    await router.push(portalPathByView.courses);
    return;
  }
  await router.push("/");
}

function goToLogin() {
  router.push("/login");
}

async function activarFuncion(membresiaId: string) {
  const contexto = cambiarFuncion(membresiaId);
  if (contexto) await router.replace(rutaInicioPortal(contexto.portal));
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
    <div
      class="mx-auto flex max-w-360 items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 lg:px-8"
    >
      <!-- Hamburguesa: solo en móvil / tablet según breakpoint estándar -->
      <Button
        class="shrink-0"
        :class="navBreakpoint === 'lg' ? 'lg:hidden' : 'md:hidden'"
        variant="ghost"
        size="icon"
        type="button"
        @click="mobileMenuOpen = !mobileMenuOpen"
        :aria-label="mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="mobileMenuOpen"
      >
        <X v-if="mobileMenuOpen" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </Button>

      <Button
        class="h-auto min-w-0 shrink-0 gap-2 p-0 hover:bg-transparent sm:gap-2.5"
        variant="ghost"
        type="button"
        @click="goHome"
      >
        <span
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-11 sm:w-11 dark:bg-white dark:p-1.5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
        >
          <img
            class="h-full w-full object-contain"
            src="/img/iconoTukuyAcademy.png"
            alt="Tukuy Academy"
          />
        </span>
        <div class="hidden text-left min-[400px]:block">
          <strong
            class="block text-base leading-none tracking-normal sm:text-lg"
            :class="isPortal ? '' : 'text-[#07152B]'"
          >
            <span class="font-black text-[#0B3A78] dark:text-white">Tukuy</span>
            <span class="font-light text-[#F5B400]"> Academy</span>
          </strong>
          <span v-if="!isPortal" class="mt-1 hidden text-sm text-[#52657A] sm:block"
            >Formación y empleabilidad</span
          >
          <span
            v-else
            class="mt-1 inline-flex items-center gap-1 bg-[#F5B400]/15 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#B87A00] dark:bg-white/10 dark:text-white"
          >
            <BookOpen class="h-3 w-3" />
            Portal estudiante
          </span>
        </div>
      </Button>

      <!-- Nav desktop: sin overflow-x-auto (evita scrollbar fantasma junto a favoritos) -->
      <nav
        v-if="isPortal"
        class="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1"
        aria-label="Navegación principal"
      >
        <template v-if="contentLoading">
          <Skeleton v-for="i in 3" :key="i" class="h-9 w-24 shrink-0" />
        </template>
        <template v-else>
          <Button
            v-for="item in mainNavItems"
            :key="item.id"
            class="shrink-0 px-2.5 font-semibold text-muted-foreground hover:text-foreground xl:px-3"
            :class="
              activeView === item.id
                ? 'bg-primary text-primary-foreground hover:bg-primary'
                : ''
            "
            variant="ghost"
            type="button"
            @click="emit('navigate', item.id)"
          >
            {{ item.label }}
          </Button>

          <DropdownMenuRoot v-model:open="isDropdownOpen">
            <DropdownMenuTrigger as-child>
              <Button
                class="shrink-0 gap-1 px-2.5 font-semibold text-muted-foreground hover:text-foreground xl:px-3"
                :class="
                  activeView === 'learning'
                    ? 'bg-primary text-primary-foreground hover:bg-primary'
                    : ''
                "
                variant="ghost"
                type="button"
              >
                Mi aprendizaje
                <ChevronDown class="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="z-50 w-[min(24rem,calc(100vw-2rem))] rounded-none border border-border bg-card p-2 shadow-lg"
              :side-offset="8"
              align="center"
            >
              <div class="grid gap-1">
                <div
                  v-for="course in enrolledCourses.slice(0, 4)"
                  :key="course.id"
                  class="flex items-center justify-between gap-3 p-2 transition hover:bg-muted/70"
                >
                  <div
                    class="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                    @click="navigateToCourse(course.id)"
                  >
                    <img
                      :src="course.image"
                      :alt="course.title"
                      class="h-12 w-12 shrink-0 object-cover"
                    />
                    <div class="grid min-w-0 flex-1 gap-1">
                      <span class="line-clamp-1 text-sm font-semibold leading-snug">
                        {{ course.title }}
                      </span>
                      <div class="flex items-center gap-2">
                        <Progress
                          :model-value="course.progress"
                          class="h-1.5 flex-1"
                        />
                        <span class="text-[10px] font-bold text-muted-foreground">
                          {{ course.progress }}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button class="mt-2 w-full" size="sm" @click="navigateToLearning">
                Ir a Mi aprendizaje
              </Button>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </template>
      </nav>

      <nav
        v-else
        class="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
        aria-label="Navegación pública"
      >
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

      <div class="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <template v-if="isPortal && user">
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button
                class="relative"
                variant="ghost"
                size="icon"
                type="button"
                aria-label="Favoritos"
              >
                <Heart
                  class="h-5 w-5"
                  :class="favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''"
                />
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
              class="z-50 w-[min(24rem,calc(100vw-2rem))] rounded-none border border-border bg-card p-2 shadow-lg"
              :side-offset="8"
              align="end"
            >
              <p class="px-2 pb-2 text-sm font-semibold">Mis favoritos</p>
              <p class="px-2 pb-2 text-xs text-muted-foreground">
                Cursos de tu interés, comprados o pendientes.
              </p>
              <div v-if="favoriteCourses.length" class="grid gap-1">
                <button
                  v-for="course in favoriteCourses.slice(0, 4)"
                  :key="course.id"
                  type="button"
                  class="grid grid-cols-[56px_1fr] gap-3 p-2 text-left transition hover:bg-muted"
                  @click="emit('navigate', 'favorites')"
                >
                  <img
                    :src="course.image"
                    :alt="course.title"
                    class="h-14 w-14 object-cover"
                  />
                  <div class="grid min-w-0 gap-1">
                    <span class="line-clamp-2 text-sm font-semibold leading-snug">
                      {{ course.title }}
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {{ favoriteLabel(course) }}
                    </span>
                  </div>
                </button>
              </div>
              <p
                v-else
                class="px-2 py-4 text-center text-sm text-muted-foreground"
              >
                Aún no tienes favoritos.
              </p>
              <Button
                class="mt-2 w-full"
                size="sm"
                variant="outline"
                @click="emit('navigate', 'favorites')"
              >
                Ver todos mis favoritos
              </Button>
            </DropdownMenuContent>
          </DropdownMenuRoot>

          <Button
            class="relative"
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Carrito"
            @click="router.push('/tukuy-academy/carrito')"
          >
            <ShoppingCart class="h-5 w-5" />
            <Badge
              v-if="cartCount > 0"
              class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
              variant="default"
            >
              {{ cartCount }}
            </Badge>
          </Button>

          <SelectorTema v-if="isPortal" />

          <Button
            class="hidden sm:inline-flex"
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Notificaciones"
          >
            <Bell class="h-5 w-5" />
          </Button>

          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <Button
                class="h-auto rounded-full p-1"
                variant="ghost"
                type="button"
                aria-label="Menú de usuario"
              >
                <Avatar
                  class="h-9 w-9 rounded-full border border-border bg-card shadow-sm"
                >
                  <img
                    v-if="!profilePhotoFailed"
                    class="h-full w-full object-cover"
                    :src="profilePhotoSrc"
                    :alt="`Foto de ${user.name}`"
                    @error="profilePhotoFailed = true"
                  />
                  <AvatarFallback v-else class="text-xs">
                    {{ user.initials }}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="z-50 min-w-56 rounded-none border border-border bg-card p-1 shadow-lg"
              :side-offset="8"
              align="end"
            >
              <DropdownMenuLabel class="px-2 py-2">
                <p class="text-sm font-semibold">{{ user.name }}</p>
                <p class="text-xs font-normal text-muted-foreground">
                  {{ user.trade }}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <template v-if="otrasFunciones.length">
                <DropdownMenuLabel
                  class="px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground"
                >
                  Cambiar función en esta entidad
                </DropdownMenuLabel>
                <DropdownMenuItem
                  v-for="funcion in otrasFunciones"
                  :key="funcion.id"
                  class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                  @select="activarFuncion(funcion.id)"
                >
                  <ArrowLeftRight class="h-4 w-4 shrink-0" />
                  {{ etiquetaRol(funcion.rol) }}
                </DropdownMenuItem>
                <DropdownMenuSeparator class="my-1 h-px bg-border" />
              </template>
              <DropdownMenuItem
                v-if="contextoActivo"
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="router.push('/seleccionar-contexto')"
              >
                <ArrowLeftRight class="h-4 w-4 shrink-0" />
                <span class="min-w-0">
                  <span class="block font-semibold"
                    >Cambiar entidad o espacio</span
                  >
                  <span
                    class="block truncate text-[11px] font-normal text-muted-foreground"
                  >
                    {{ contextoActivo.organizacionNombre }} ·
                    {{ contextoActivo.portal }}
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator
                v-if="contextoActivo"
                class="my-1 h-px bg-border"
              />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="router.push('/bolsa-tukuy')"
              >
                <BriefcaseBusiness class="h-4 w-4" />
                Bolsa Tukuy
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="router.push('/comunidad')"
              >
                <UsersRound class="h-4 w-4" />
                Comunidad Tukuy
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'certificates')"
              >
                <Award class="h-4 w-4" />
                Mis certificados
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm outline-none hover:bg-muted"
                @select="emit('navigate', 'settings')"
              >
                <Settings class="h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-2 px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
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

    <!-- Panel móvil -->
    <div
      v-if="mobileMenuOpen"
      class="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-card/98 px-4 py-3 shadow-md"
      :class="navBreakpoint === 'lg' ? 'lg:hidden' : 'md:hidden'"
    >
      <template v-if="isPortal">
        <Button
          v-for="item in props.navItems"
          :key="item.id"
          class="h-11 w-full justify-start px-3 font-semibold text-muted-foreground hover:text-foreground"
          :class="
            activeView === item.id
              ? 'bg-primary text-primary-foreground hover:bg-primary'
              : ''
          "
          variant="ghost"
          type="button"
          @click="handleMobileNavigate(item.id)"
        >
          <component :is="getNavIcon(item.id)" class="mr-2 h-4 w-4 shrink-0" />
          {{ item.label }}
        </Button>
      </template>
      <template v-else>
        <Button
          v-for="item in publicNavItems"
          :key="item.id"
          class="h-11 w-full justify-start px-3 text-[#52657A] hover:bg-[#DDEAF7] hover:text-[#07152B]"
          variant="ghost"
          type="button"
          @click="handleMobileScroll(item.id)"
        >
          {{ item.label }}
        </Button>
      </template>
    </div>
  </header>
</template>
