<script setup lang="ts">
import {
  ArrowLeft,
  ArrowLeftRight,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  Settings,
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
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

import SelectorTema from "@/components/shared/SelectorTema.vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";

const route = useRoute();
const router = useRouter();
const { logout } = useAuth();
const { contextoActivo, tienePermiso } = useContextoSesion();
const menuAbierto = ref(false);

const enlaces = computed(() => {
  const base = [
    {
      etiqueta: "Perfil profesional",
      ruta: "/perfil-profesional",
      icono: FileText,
    },
    {
      etiqueta: "Bolsa Tukuy",
      ruta: "/bolsa-tukuy",
      icono: BriefcaseBusiness,
    },
    {
      etiqueta: "Comunidad",
      ruta: "/comunidad",
      icono: UsersRound,
    },
  ];

  if (tienePermiso("vacantes.gestionar")) {
    base.push({
      etiqueta: "Gestionar vacantes",
      ruta: "/bolsa-tukuy/gestion",
      icono: Settings,
    });
  }

  if (tienePermiso("comunidad.moderar")) {
    base.push({
      etiqueta: "Moderar comunidad",
      ruta: "/comunidad/moderacion",
      icono: Settings,
    });
  }

  return base;
});

const portalActivo = computed(() => contextoActivo.value?.portal ?? "personal");
const organizacionActiva = computed(
  () => contextoActivo.value?.organizacionNombre ?? "Tukuy Personal",
);
const logoOrganizacion = computed(() => {
  const id = contextoActivo.value?.organizacionId;
  if (id === "org-empresa-abc") return "/img/logo-andina-constructora.png";
  return null;
});
const iniciales = computed(() => {
  if (portalActivo.value === "docente") return "CQ";
  if (portalActivo.value === "organizacion") return "AC";
  if (portalActivo.value === "admin") return "TA";
  return "CQ";
});

function volverAlPortal() {
  if (!contextoActivo.value) {
    router.push("/seleccionar-contexto");
    return;
  }
  router.push(rutaInicioPortal(contextoActivo.value.portal));
}

function navegar(ruta: string) {
  menuAbierto.value = false;
  router.push(ruta);
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
      <div class="mx-auto flex h-20 max-w-360 items-center gap-6 px-5 lg:px-8">
        <button
          type="button"
          class="flex shrink-0 items-center gap-3"
          aria-label="Ir al inicio del portal"
          @click="volverAlPortal"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full dark:bg-white dark:p-1.5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
          >
            <img
              src="/img/iconoTukuyAcademy.png"
              class="h-full w-full object-contain"
              alt="Tukuy Academy"
            />
          </span>
          <span class="hidden text-lg tracking-tight text-foreground sm:block">
            <strong class="font-black dark:text-white">Tukuy</strong>
            <span> Ecosistema</span>
          </span>
        </button>

        <nav class="ml-6 hidden h-full items-center lg:flex" aria-label="Ecosistema Tukuy">
          <RouterLink
            v-for="enlace in enlaces"
            :key="enlace.ruta"
            :to="enlace.ruta"
            class="flex h-full items-center gap-2 border-b-[3px] px-5 text-sm font-bold transition"
            :class="
              route.path === enlace.ruta || route.path.startsWith(`${enlace.ruta}/`)
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            "
          >
            <component :is="enlace.icono" class="h-4 w-4" />
            {{ enlace.etiqueta }}
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <div
            class="hidden items-center gap-3 border-r border-border pr-4 md:flex"
          >
            <img
              v-if="logoOrganizacion"
              :src="logoOrganizacion"
              :alt="`Logo de ${organizacionActiva}`"
              class="h-10 w-10 shrink-0 object-contain"
            />
            <div class="text-right">
              <p
                class="max-w-48 truncate text-xs font-black uppercase tracking-wide text-primary"
              >
                {{ organizacionActiva }}
              </p>
              <p class="mt-0.5 text-[11px] capitalize text-muted-foreground">
                Perfil {{ portalActivo }}
              </p>
            </div>
          </div>

          <SelectorTema />

          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex items-center gap-2 border border-transparent p-1.5 hover:border-border hover:bg-muted"
                aria-label="Abrir menú de usuario"
              >
                <Avatar class="h-9 w-9">
                  <AvatarFallback class="bg-primary text-xs text-primary-foreground">
                    {{ iniciales }}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown class="hidden h-4 w-4 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="z-50 min-w-72 border border-border bg-card p-1 shadow-xl"
              :side-offset="8"
              align="end"
            >
              <DropdownMenuLabel class="px-3 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="logoOrganizacion"
                    :src="logoOrganizacion"
                    :alt="`Logo de ${organizacionActiva}`"
                    class="h-10 w-10 shrink-0 object-contain"
                  />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black">{{ organizacionActiva }}</p>
                    <p class="mt-1 text-xs font-normal capitalize text-muted-foreground">
                      Contexto {{ portalActivo }} activo
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm outline-none hover:bg-muted"
                @select="volverAlPortal"
              >
                <ArrowLeft class="h-4 w-4" />
                Volver a mi portal
              </DropdownMenuItem>
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm outline-none hover:bg-muted"
                @select="router.push('/seleccionar-contexto')"
              >
                <ArrowLeftRight class="h-4 w-4" />
                Cambiar organización o perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
              <DropdownMenuItem
                class="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-50 dark:hover:bg-red-950/40"
                @select="logout"
              >
                <LogOut class="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuRoot>

          <Button
            class="lg:hidden"
            variant="ghost"
            size="icon"
            :aria-label="menuAbierto ? 'Cerrar menú' : 'Abrir menú'"
            @click="menuAbierto = !menuAbierto"
          >
            <X v-if="menuAbierto" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav
        v-if="menuAbierto"
        class="grid border-t border-border bg-card p-4 lg:hidden"
        aria-label="Ecosistema Tukuy móvil"
      >
        <button
          v-for="enlace in enlaces"
          :key="enlace.ruta"
          type="button"
          class="flex items-center gap-3 border-l-[3px] px-4 py-3 text-left text-sm font-bold"
          :class="
            route.path.startsWith(enlace.ruta)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground'
          "
          @click="navegar(enlace.ruta)"
        >
          <component :is="enlace.icono" class="h-4 w-4" />
          {{ enlace.etiqueta }}
        </button>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
