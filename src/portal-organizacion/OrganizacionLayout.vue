<script setup lang="ts">
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Network,
  Route,
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
import {
  organizacionService,
  type NotificacionOrganizacion,
} from "@/api/services/organizacion.service";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";
import {
  etiquetaRol,
  rutaInicioPortal,
} from "@/composables/useContextoSesion";
const route = useRoute(),
  router = useRouter();
const { logout, currentUser, restaurarUsuario } = useAuth();
const {
  contextoActivo,
  funcionesEntidadActiva,
  cambiarFuncion,
  tienePermiso,
} = useContextoSesion();
const abierto = ref(false);
const panelAvisos = ref(false);
const avisos = ref<NotificacionOrganizacion[]>([]);
const nombreUsuario = computed(
  () => currentUser.value?.name ?? "Administrador de organización",
);
const inicialesUsuario = computed(
  () => currentUser.value?.initials ?? "AO",
);
const nombreFuncionActiva = computed(() =>
  contextoActivo.value ? etiquetaRol(contextoActivo.value.rol) : "Administración",
);
const logoEntidad = computed(
  () =>
    funcionesEntidadActiva.value.find((item) => item.organizacion?.logo)
      ?.organizacion?.logo ?? "/img/LogoColegioING.png",
);
onMounted(() => {
  void restaurarUsuario();
  void cargarAvisos();
});
const avisosPendientes = computed(
  () => avisos.value.filter((aviso) => !aviso.leida).length,
);
async function cargarAvisos() {
  avisos.value = await organizacionService.notificaciones.listar();
}
async function abrirAviso(aviso: NotificacionOrganizacion) {
  if (!aviso.leida) {
    await organizacionService.notificaciones.actualizar(aviso.id, { leida: true });
    aviso.leida = true;
  }
  panelAvisos.value = false;
  if (aviso.ruta) await router.push(aviso.ruta);
}
async function marcarLeidas() {
  await Promise.all(
    avisos.value
      .filter((aviso) => !aviso.leida)
      .map((aviso) => organizacionService.notificaciones.actualizar(aviso.id, { leida: true })),
  );
  avisos.value = avisos.value.map((aviso) => ({ ...aviso, leida: true }));
}
function fechaAviso(valor: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}
const itemsBase = [
  { e: "Inicio", r: "/organizacion/inicio", i: Home },
  { e: "Usuarios", r: "/organizacion/usuarios", i: UsersRound, p: "usuarios.ver" },
  { e: "Alumnos", r: "/organizacion/alumnos", i: GraduationCap, p: "estudiantes.ver" },
  { e: "Certificados", r: "/organizacion/certificados", i: Award, p: "certificados.ver" },
  { e: "Equipos y áreas", r: "/organizacion/equipos", i: Network, p: "equipos.administrar" },
  { e: "Cursos institucionales", r: "/organizacion/cursos/gestion", i: BookOpen, p: "cursos.crear" },
  { e: "Catálogo y revisión", r: "/organizacion/cursos", i: BookOpen, p: "cursos.ver" },
  { e: "Asignaciones", r: "/organizacion/asignaciones", i: ClipboardList, p: "asignaciones.crear" },
  { e: "Rutas de aprendizaje", r: "/organizacion/rutas", i: Route, p: "rutas.administrar" },
  { e: "Reportes", r: "/organizacion/reportes", i: BarChart3, p: "reportes.ver" },
  { e: "Licencia y consumo", r: "/organizacion/licencia", i: ShieldCheck, p: "licencias.ver" },
  { e: "Facturación", r: "/organizacion/facturacion", i: CreditCard, p: "facturacion.ver" },
];
const items = computed(() =>
  itemsBase.filter((item) => !item.p || tienePermiso(item.p)),
);
const itemsEcosistemaBase = [
  { e: "Bolsa Tukuy", r: "/bolsa-tukuy", i: BriefcaseBusiness, p: "bolsa.ver" },
  { e: "Comunidad", r: "/comunidad", i: UsersRound, p: "comunidad.ver" },
];
const itemsEcosistema = computed(() =>
  itemsEcosistemaBase.filter((item) => tienePermiso(item.p)),
);
const otrasFunciones = computed(() =>
  funcionesEntidadActiva.value.filter(
    (item) => item.id !== contextoActivo.value?.membresiaId,
  ),
);
const titulo = computed(() =>
  String(route.meta.titulo ?? "Portal de organización"),
);
const activa = (r: string) => route.path === r;
async function ir(r: string) {
  abierto.value = false;
  await router.push(r);
}
async function activarFuncion(membresiaId: string) {
  const contexto = cambiarFuncion(membresiaId);
  if (contexto) await router.replace(rutaInicioPortal(contexto.portal));
}
</script>
<template>
  <div class="min-h-screen bg-background text-foreground">
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform lg:translate-x-0"
      :class="abierto ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-[76px] items-center justify-between border-b px-5">
        <button
          class="flex items-center gap-3 text-left"
          @click="ir('/organizacion/inicio')"
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
              <span class="font-normal text-[#F5B400]"> Academy</span>
            </strong>
            <span
              class="mt-1 inline-flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-white/10 dark:text-emerald-400"
            >
              <Building2 class="h-3 w-3" />
              Portal organización
            </span>
          </div></button
        ><Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="abierto = false"
          ><X class="h-5 w-5"
        /></Button>
      </div>
      <div
        class="mx-4 mt-5 flex items-center gap-3 border border-border border-l-4 border-l-primary bg-primary/10 p-3"
      >
        <span class="grid h-14 w-14 shrink-0 place-items-center bg-white p-1">
          <img
            :src="logoEntidad"
            :alt="`Logo de ${contextoActivo?.organizacionNombre ?? 'la entidad'}`"
            class="h-full w-full object-contain"
          />
        </span>
        <div class="min-w-0">
          <p class="text-[11px] font-black uppercase leading-4 text-primary">
            {{ contextoActivo?.organizacionNombre ?? "COLEGIO DE INGENIEROS CUSCO" }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ nombreFuncionActiva }} · Contexto activo
          </p>
        </div>
      </div>
      <nav class="mt-5 flex-1 space-y-1 overflow-y-auto px-3">
        <button
          v-for="x in items"
          :key="x.r"
          class="flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-semibold transition"
          :class="
            activa(x.r)
              ? 'border-l-primary bg-primary/10 text-primary'
              : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
          "
          @click="ir(x.r)"
        >
          <component :is="x.i" class="h-[18px] w-[18px]" /><span>{{
            x.e
          }}</span>
        </button>
      </nav>
      <div class="border-t border-border px-3 py-3">
        <p
          class="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[.18em] text-muted-foreground"
        >
          Ecosistema Tukuy
        </p>
        <button
          v-for="x in itemsEcosistema"
          :key="x.r"
          class="flex w-full items-center gap-2 border-l-2 px-2 py-2 text-xs font-semibold transition"
          :class="
            activa(x.r)
              ? 'border-l-accent bg-primary/10 text-primary'
              : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
          "
          @click="ir(x.r)"
        >
          <component :is="x.i" class="h-4 w-4" />
          <span>{{ x.e }}</span>
        </button>
      </div>
      <div class="border-t border-border p-3">
        <button
          v-if="tienePermiso('configuracion.editar')"
          class="flex w-full gap-3 border-l-[3px] border-l-transparent p-3 text-sm font-semibold text-muted-foreground hover:border-l-border hover:bg-muted hover:text-foreground"
          @click="ir('/organizacion/configuracion')"
        >
          <Settings class="h-4 w-4" />Configuración</button
        ><button
          class="flex w-full gap-3 border-l-[3px] border-l-transparent p-3 text-sm font-semibold text-red-600 hover:border-l-red-500 hover:bg-red-500/10 dark:text-red-400"
          @click="logout"
        >
          <LogOut class="h-4 w-4" />Cerrar sesión
        </button>
      </div>
    </aside>
    <div
      v-if="abierto"
      class="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
      @click="abierto = false"
    />
    <div class="lg:pl-72">
      <header
        class="sticky top-0 z-30 flex h-[76px] items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-xl sm:px-7"
      >
        <Button
          class="lg:hidden"
          variant="ghost"
          size="icon"
          @click="abierto = true"
          ><Menu class="h-5 w-5"
        /></Button>
        <div class="flex-1">
          <b class="text-lg">{{ titulo }}</b>
          <p class="text-xs text-muted-foreground">
            Gestión de capacitación empresarial
          </p>
        </div>
        <SelectorTema />
        <div class="relative">
          <Button class="relative" variant="ghost" size="icon" aria-label="Abrir notificaciones" @click="panelAvisos = !panelAvisos">
            <Bell class="h-5 w-5" />
            <span v-if="avisosPendientes" class="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center bg-[#F5B400] px-1 text-[9px] font-black text-[#071F52]">{{ avisosPendientes }}</span>
          </Button>
          <div v-if="panelAvisos" class="absolute right-0 top-12 z-50 w-[min(90vw,360px)] border border-border bg-card shadow-2xl">
            <div class="flex items-center justify-between border-b border-border p-4"><div><b>Notificaciones</b><p class="text-xs text-muted-foreground">{{ avisosPendientes }} pendientes</p></div><Button v-if="avisosPendientes" variant="ghost" size="sm" @click="marcarLeidas">Marcar leídas</Button></div>
            <div class="max-h-96 divide-y divide-border overflow-y-auto">
              <button v-for="aviso in avisos" :key="aviso.id" class="block w-full p-4 text-left transition hover:bg-muted" :class="!aviso.leida && 'border-l-4 border-l-[#F5B400] bg-primary/5'" @click="abrirAviso(aviso)"><b class="text-sm">{{ aviso.titulo }}</b><p class="mt-1 text-xs leading-5 text-muted-foreground">{{ aviso.detalle }}</p><span class="mt-2 block text-[10px] text-muted-foreground">{{ fechaAviso(aviso.fecha) }}</span></button>
              <p v-if="!avisos.length" class="p-6 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>
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
              <Avatar class="h-9 w-9"
                ><AvatarFallback class="bg-primary text-xs text-primary-foreground"
                  >{{ inicialesUsuario }}</AvatarFallback
                ></Avatar
              >
              <span class="hidden sm:block"
                ><b class="block max-w-36 truncate text-xs">{{ nombreUsuario }}</b
                ><span class="text-[10px] text-muted-foreground"
                  >{{ nombreFuncionActiva }}</span
                ></span
              >
              <ChevronDown class="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            class="z-50 min-w-64 border border-border bg-card p-1 shadow-xl"
            :side-offset="8"
            align="end"
          >
            <DropdownMenuLabel class="px-3 py-2.5">
              <p class="text-sm font-bold text-foreground">
                {{ contextoActivo?.organizacionNombre ?? "COLEGIO DE INGENIEROS CUSCO" }}
              </p>
              <p class="mt-0.5 text-xs font-normal text-muted-foreground">
                {{ nombreFuncionActiva }} de organización
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
              v-if="tienePermiso('configuracion.editar')"
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="router.push('/seleccionar-contexto')"
            >
              <ArrowLeftRight class="h-4 w-4" />
              Cambiar entidad o espacio
            </DropdownMenuItem>
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm outline-none hover:bg-muted"
              @select="ir('/organizacion/configuracion')"
            >
              <Settings class="h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              class="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-500/10 dark:text-red-400"
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
