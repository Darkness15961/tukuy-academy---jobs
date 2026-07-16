<script setup lang="ts">
import {
  ArrowLeftRight,
  Bell,
  BookOpenCheck,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
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
import { computed, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import SelectorTema from "@/components/shared/SelectorTema.vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import { administracionService } from "@/api/services/administracion.service";

const route = useRoute();
const router = useRouter();
const { logout, currentUser, restaurarUsuario } = useAuth();
const menuAbierto = ref(false);
const cursosPendientes = ref(0);
const nombreUsuario = computed(() => {
  const nombre = currentUser.value?.name ?? "Administrador Tukuy";
  return nombre === "Carlos Alberto Quispe" ? "Carlos Alberto" : nombre;
});
const inicialesUsuario = computed(() =>
  nombreUsuario.value
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase(),
);

onMounted(() => {
  void restaurarUsuario();
  void administracionService.cursos.listar().then((cursos) => {
    cursosPendientes.value = cursos.filter(
      (curso) => curso.estado !== "APROBADO",
    ).length;
  });
});

const navegacion = computed(() => [
  { etiqueta: "Panel global", ruta: "/admin/inicio", icono: Home },
  {
    etiqueta: "Organizaciones",
    ruta: "/admin/organizaciones",
    icono: Building2,
  },
  { etiqueta: "Usuarios", ruta: "/admin/usuarios", icono: UsersRound },
  {
    etiqueta: "Cursos y revisión",
    ruta: "/admin/cursos",
    icono: BookOpenCheck,
    contador: cursosPendientes.value,
  },
  {
    etiqueta: "Planes y licencias",
    ruta: "/admin/planes-licencias",
    icono: CreditCard,
  },
  {
    etiqueta: "Facturación",
    ruta: "/admin/facturacion",
    icono: CircleDollarSign,
  },
  {
    etiqueta: "Auditoría",
    ruta: "/admin/auditoria",
    icono: ClipboardList,
  },
]);

const tituloPagina = computed(() =>
  String(route.meta.titulo ?? "Administración Tukuy"),
);

function estaActiva(ruta: string) {
  return route.path === ruta || route.path.startsWith(`${ruta}/`);
}

async function navegar(ruta: string) {
  menuAbierto.value = false;
  await router.push(ruta);
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0"
      :class="menuAbierto ? 'translate-x-0' : '-translate-x-full'"
    >
      <div
        class="flex h-[76px] items-center justify-between border-b border-border px-5"
      >
        <button
          class="flex items-center gap-3 text-left"
          type="button"
          @click="navegar('/admin/inicio')"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full dark:bg-white dark:p-1.5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
          >
            <img
              class="h-full w-full object-contain"
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
            />
          </span>
          <div class="leading-tight">
            <strong class="block text-base tracking-tight">
              <span class="font-black text-primary">Tukuy</span>
              <span class="font-normal text-[#F5B400]"> Academy</span>
            </strong>
            <span
              class="mt-1 inline-flex items-center gap-1 bg-[#4338CA]/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#4338CA] dark:bg-white/10 dark:text-white"
            >
              <ShieldCheck class="h-3 w-3" />
              Administración global
            </span>
          </div>
        </button>
        <Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="menuAbierto = false"
        >
          <X class="h-5 w-5" />
        </Button>
      </div>

      <div
        class="mx-4 mt-5 border border-violet-100 border-l-4 border-l-violet-700 bg-violet-50/70 p-3"
      >
        <div class="flex items-center gap-2">
          <ShieldCheck class="h-4 w-4 text-violet-700" />
          <p class="text-xs font-black uppercase tracking-wide text-violet-800">
            Operación global
          </p>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          Todas las organizaciones y servicios
        </p>
      </div>

      <nav class="mt-5 flex-1 space-y-1 overflow-y-auto px-3">
        <button
          v-for="item in navegacion"
          :key="item.ruta"
          type="button"
          class="flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-semibold transition"
          :class="
            estaActiva(item.ruta)
              ? 'border-l-violet-700 bg-violet-50 text-violet-800'
              : 'border-l-transparent text-muted-foreground hover:border-l-border hover:bg-muted hover:text-foreground'
          "
          @click="navegar(item.ruta)"
        >
          <component :is="item.icono" class="h-[18px] w-[18px]" />
          <span class="flex-1 text-left">{{ item.etiqueta }}</span>
          <span
            v-if="item.contador"
            class="min-w-6 bg-amber-100 px-2 py-0.5 text-center text-[10px] font-black text-amber-800"
          >
            {{ item.contador }}
          </span>
        </button>
      </nav>

      <div class="border-t border-border p-3">
        <button
          class="flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:border-l-border hover:bg-muted hover:text-foreground"
          type="button"
          @click="navegar('/admin/configuracion')"
        >
          <Settings class="h-[18px] w-[18px]" /> Configuración
        </button>
        <button
          class="mt-1 flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-semibold text-red-600 hover:border-l-red-500 hover:bg-red-50"
          type="button"
          @click="logout"
        >
          <LogOut class="h-[18px] w-[18px]" /> Cerrar sesión
        </button>
      </div>
    </aside>

    <div
      v-if="menuAbierto"
      class="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
      @click="menuAbierto = false"
    />

    <div class="lg:pl-72">
      <header
        class="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-border bg-card/92 px-4 backdrop-blur-xl sm:px-7"
      >
        <Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="menuAbierto = true"
        >
          <Menu class="h-5 w-5" />
        </Button>
        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-black">{{ tituloPagina }}</p>
          <p class="hidden text-xs text-muted-foreground sm:block">
            Control operativo de Tukuy Academy
          </p>
        </div>
        <SelectorTema />
        <Button class="relative" variant="ghost" size="icon">
          <Bell class="h-5 w-5" />
          <span
            class="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card"
          />
        </Button>

        <DropdownMenuRoot>
          <DropdownMenuTrigger as-child>
            <button
              class="flex items-center gap-2 border border-transparent p-1.5 text-left hover:border-border hover:bg-muted"
              type="button"
              aria-label="Abrir menú de usuario"
            >
              <Avatar class="h-9 w-9">
                <AvatarFallback class="bg-violet-800 text-xs text-white">
                  {{ inicialesUsuario }}
                </AvatarFallback>
              </Avatar>
              <span class="hidden sm:block">
                <strong class="block text-xs">{{ nombreUsuario }}</strong>
                <span class="block text-[10px] text-muted-foreground"
                  >Administrador Tukuy</span
                >
              </span>
              <ChevronDown class="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="z-50 min-w-64 border border-border bg-card p-1 shadow-xl"
            :side-offset="8"
            align="end"
          >
            <DropdownMenuLabel class="px-3 py-2.5">
              <p class="text-sm font-bold text-foreground">
                {{ nombreUsuario }}
              </p>
              <p class="mt-0.5 text-xs font-normal text-muted-foreground">
                Administración global de Tukuy Academy
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="router.push('/seleccionar-contexto')"
            >
              <ArrowLeftRight class="h-4 w-4" /> Cambiar organización o perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="navegar('/admin/configuracion')"
            >
              <Settings class="h-4 w-4" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-50"
              @select="logout"
            >
              <LogOut class="h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuRoot>
      </header>

      <main class="p-4 sm:p-7 xl:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
