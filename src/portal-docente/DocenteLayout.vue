<script setup lang="ts">
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckSquare,
  ChevronDown,
  DollarSign,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UsersRound,
  Video,
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import SelectorTema from "@/components/shared/SelectorTema.vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import {
  etiquetaRol,
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import {
  docenteService,
  type NotificacionDocente,
} from "@/api/services/docente.service";
import { academicoService } from "@/api/services/academico.service";

const route = useRoute();
const router = useRouter();
const { logout, currentUser, restaurarUsuario } = useAuth();
const {
  contextoActivo,
  funcionesEntidadActiva,
  cambiarFuncion,
  tienePermiso,
} = useContextoSesion();
const menuAbierto = ref(false);
const evaluacionesPendientes = ref(0);
const notificaciones = ref<NotificacionDocente[]>([]);
const panelNotificaciones = ref(false);
const notificacionesNoLeidas = computed(
  () => notificaciones.value.filter((item) => !item.leida).length,
);
const nombreUsuario = computed(
  () => currentUser.value?.name ?? "Docente Tukuy",
);
const inicialesUsuario = computed(() => currentUser.value?.initials ?? "DT");

async function cargarIndicadores() {
  const [evaluaciones, avisos] = await Promise.all([
    academicoService.listarEntregasDocente(),
    docenteService.notificaciones.listar(),
  ]);
  evaluacionesPendientes.value = evaluaciones.filter((item) =>
    ["ENTREGADA", "EN_REVISION", "OBSERVADA"].includes(item.estado),
  ).length;
  notificaciones.value = avisos;
}

const alCambiarDatos = () => void cargarIndicadores();

onMounted(() => {
  void restaurarUsuario();
  void cargarIndicadores();
  window.addEventListener("tukuy:docente-datos", alCambiarDatos);
  window.addEventListener("tukuy:academico-datos", alCambiarDatos);
});

onBeforeUnmount(() => {
  window.removeEventListener("tukuy:docente-datos", alCambiarDatos);
  window.removeEventListener("tukuy:academico-datos", alCambiarDatos);
});

const esDocenciaIndependiente = computed(
  () =>
    contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
    !contextoActivo.value?.organizacionId,
);
const nombreContextoDocente = computed(() =>
  esDocenciaIndependiente.value
    ? "Docencia independiente"
    : contextoActivo.value?.organizacionNombre,
);
const detalleContextoDocente = computed(() =>
  esDocenciaIndependiente.value
    ? "Cursos propios · Contexto activo"
    : "Docente institucional · Contexto activo",
);
const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo ?? "/img/LogoColegioING.png",
);

const navegacion = computed(() => [
  { etiqueta: "Inicio", ruta: "/docente/inicio", icono: Home },
  { etiqueta: "Mis cursos", ruta: "/docente/cursos", icono: BookOpen, permiso: "cursos.ver" },
  { etiqueta: "Estudiantes", ruta: "/docente/estudiantes", icono: UsersRound, permiso: "estudiantes.ver" },
  {
    etiqueta: "Evaluaciones",
    ruta: "/docente/evaluaciones",
    icono: CheckSquare,
    permiso: "evaluaciones.calificar",
    contador: evaluacionesPendientes.value,
  },
  {
    etiqueta: "Calificaciones",
    ruta: "/docente/calificaciones",
    icono: GraduationCap,
    permiso: "calificaciones.gestionar",
  },
  { etiqueta: "Certificados", ruta: "/docente/certificados", icono: Award, permiso: "certificados.emitir" },
  { etiqueta: "Sesiones en vivo", ruta: "/docente/sesiones", icono: Video, permiso: "sesiones.gestionar" },
  { etiqueta: "Mensajes", ruta: "/docente/mensajes", icono: MessageSquare, permiso: "mensajes.enviar" },
  { etiqueta: "Analítica", ruta: "/docente/analitica", icono: BarChart3, permiso: "analitica.ver" },
  { etiqueta: "Ingresos", ruta: "/docente/ingresos", icono: DollarSign, permiso: "ingresos.ver" },
].filter((item) => !item.permiso || tienePermiso(item.permiso)));

const otrasFunciones = computed(() =>
  esDocenciaIndependiente.value
    ? []
    : funcionesEntidadActiva.value.filter(
        (item) => item.id !== contextoActivo.value?.membresiaId,
      ),
);

const tituloPagina = computed(() =>
  String(route.meta.titulo ?? "Portal docente"),
);

function estaActiva(ruta: string) {
  return (
    route.path === ruta ||
    (ruta !== "/docente/inicio" && route.path.startsWith(`${ruta}/`))
  );
}

async function navegar(ruta: string) {
  menuAbierto.value = false;
  await router.push(ruta);
}

async function activarFuncion(membresiaId: string) {
  const contexto = cambiarFuncion(membresiaId);
  if (contexto) await router.replace(rutaInicioPortal(contexto.portal));
}

async function marcarAvisosLeidos() {
  await docenteService.marcarNotificacionesLeidas();
  notificaciones.value = notificaciones.value.map((item) => ({
    ...item,
    leida: true,
  }));
}

async function abrirAviso(aviso: NotificacionDocente) {
  panelNotificaciones.value = false;
  if (aviso.ruta) await router.push(aviso.ruta);
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
          @click="navegar('/docente/inicio')"
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
              <span class="font-black text-primary dark:text-white">Tukuy</span>
              <span class="font-normal text-accent"> Academy</span>
            </strong>
            <span
              class="mt-1 inline-flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary dark:bg-white/10 dark:text-white"
            >
              <GraduationCap class="h-3 w-3" />
              Portal docente
            </span>
          </div>
        </button>
        <Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="menuAbierto = false"
          ><X class="h-5 w-5"
        /></Button>
      </div>

      <div
        class="mx-4 mt-5 flex items-center gap-3 border border-border border-l-4 border-l-primary bg-primary/10 p-3"
      >
        <span
          v-if="!esDocenciaIndependiente"
          class="grid h-14 w-14 shrink-0 place-items-center bg-white p-1"
        >
          <img
            :src="logoEntidad"
            :alt="`Logo de ${nombreContextoDocente || 'la entidad'}`"
            class="h-full w-full object-contain"
          />
        </span>
        <div class="min-w-0">
          <p class="text-[11px] font-black uppercase leading-4 tracking-wide text-primary">
            {{ nombreContextoDocente }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ detalleContextoDocente }}
          </p>
        </div>
      </div>

      <nav class="mt-5 flex-1 space-y-1 overflow-y-auto px-3">
        <button
          v-for="item in navegacion"
          :key="item.ruta"
          type="button"
          class="flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-semibold transition"
          :class="
            estaActiva(item.ruta)
              ? 'border-l-accent bg-primary/10 text-primary'
              : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
          "
          @click="navegar(item.ruta)"
        >
          <component :is="item.icono" class="h-[18px] w-[18px]" />
          <span class="flex-1 text-left">{{ item.etiqueta }}</span>
          <span
            v-if="item.contador"
            class="rounded-full px-2 py-0.5 text-[10px]"
            :class="
              estaActiva(item.ruta)
                ? 'bg-primary text-white'
                : 'bg-accent/20 text-[#B87A00] dark:text-accent'
            "
            >{{ item.contador }}</span
          >
        </button>
      </nav>

      <div class="border-t border-border p-3">
        <button
          class="flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:border-l-border hover:bg-muted"
          @click="navegar('/docente/configuracion')"
        >
          <Settings class="h-[18px] w-[18px]" /> Configuración
        </button>
        <button
          class="mt-1 flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-semibold text-red-600 hover:border-l-red-500 hover:bg-red-500/10 dark:text-red-400"
          @click="logout"
        >
          <LogOut class="h-[18px] w-[18px]" /> Cerrar sesión
        </button>
      </div>
    </aside>

    <div
      v-if="menuAbierto"
      class="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
      @click="menuAbierto = false"
    />

    <div class="lg:pl-72">
      <header
        class="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-7"
      >
        <Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="menuAbierto = true"
          ><Menu class="h-5 w-5"
        /></Button>
        <div class="min-w-0 flex-1">
          <p class="truncate text-lg font-black">{{ tituloPagina }}</p>
          <p class="hidden text-xs text-muted-foreground sm:block">
            Gestiona tu experiencia académica
          </p>
        </div>
        <SelectorTema />
        <div class="relative">
          <Button
            class="relative"
            variant="ghost"
            size="icon"
            aria-label="Abrir notificaciones"
            @click="panelNotificaciones = !panelNotificaciones"
            ><Bell class="h-5 w-5" /><span
              v-if="notificacionesNoLeidas"
              class="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-black text-slate-950 ring-2 ring-card"
              >{{ notificacionesNoLeidas }}</span
            ></Button
          >
          <div
            v-if="panelNotificaciones"
            class="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] border border-border bg-card shadow-2xl"
          >
            <div
              class="flex items-center justify-between border-b border-border px-4 py-3"
            >
              <strong class="text-sm">Notificaciones</strong>
              <button
                class="text-xs font-bold text-primary"
                @click="marcarAvisosLeidos"
              >
                Marcar leídas
              </button>
            </div>
            <div class="max-h-96 overflow-y-auto">
              <button
                v-for="aviso in notificaciones"
                :key="aviso.id"
                class="block w-full border-b border-border px-4 py-3 text-left hover:bg-muted"
                :class="
                  !aviso.leida ? 'border-l-4 border-l-accent bg-primary/5' : ''
                "
                @click="abrirAviso(aviso)"
              >
                <span class="block text-sm font-bold">{{ aviso.titulo }}</span>
                <span
                  class="mt-1 block text-xs leading-5 text-muted-foreground"
                  >{{ aviso.detalle }}</span
                >
              </button>
              <p
                v-if="!notificaciones.length"
                class="p-5 text-center text-sm text-muted-foreground"
              >
                No tienes notificaciones.
              </p>
            </div>
          </div>
        </div>
        <DropdownMenuRoot>
          <DropdownMenuTrigger as-child>
            <button
              class="flex items-center gap-2 border border-transparent p-1.5 text-left hover:border-border hover:bg-muted"
              type="button"
              aria-label="Abrir menú de usuario"
            >
              <Avatar class="h-9 w-9 bg-primary text-white"
                ><AvatarFallback class="bg-primary text-xs text-white">{{
                  inicialesUsuario
                }}</AvatarFallback></Avatar
              >
              <span class="hidden sm:block"
                ><strong class="block max-w-36 truncate text-xs">{{
                  nombreUsuario
                }}</strong
                ><span class="block text-[10px] text-muted-foreground"
                  >Docente</span
                ></span
              >
              <ChevronDown
                class="hidden h-4 w-4 text-muted-foreground sm:block"
              />
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
                {{ detalleContextoDocente }}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <template v-if="otrasFunciones.length">
              <DropdownMenuLabel
                class="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[.16em] text-muted-foreground"
              >
                Cambiar función en esta entidad
              </DropdownMenuLabel>
              <DropdownMenuItem
                v-for="funcion in otrasFunciones"
                :key="funcion.id"
                class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
                @select="activarFuncion(funcion.id)"
              >
                <ArrowLeftRight class="h-4 w-4" />
                {{ etiquetaRol(funcion.rol) }}
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1 h-px bg-border" />
            </template>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="router.push('/seleccionar-contexto')"
            >
              <ArrowLeftRight class="h-4 w-4" />
              Cambiar entidad o espacio
            </DropdownMenuItem>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="navegar('/bolsa-tukuy')"
            >
              <BriefcaseBusiness class="h-4 w-4" />
              Bolsa Tukuy
            </DropdownMenuItem>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="navegar('/comunidad')"
            >
              <MessageSquare class="h-4 w-4" />
              Comunidad Tukuy
            </DropdownMenuItem>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="navegar('/docente/configuracion')"
            >
              <Settings class="h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-500/10"
              @select="logout"
            >
              <LogOut class="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuRoot>
      </header>

      <main class="p-4 sm:p-7 xl:p-8"><RouterView /></main>
    </div>
  </div>
</template>
