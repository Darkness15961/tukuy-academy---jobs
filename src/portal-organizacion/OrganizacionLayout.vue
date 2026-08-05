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
  CalendarDays,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Network,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from "lucide-vue-next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "reka-ui";
import { computed, onMounted, ref, watch } from "vue";
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

type ItemNav = {
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
  permiso?: string;
};

type GrupoNav = {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Ítem suelto (sin submenú), p. ej. Inicio o Reportes. */
  ruta?: string;
  permiso?: string;
  hijos?: ItemNav[];
};

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
const gruposAbiertos = ref<Record<string, boolean>>({});
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

/** Menú agrupado: globales + subpuntos relacionados. */
const gruposBase: GrupoNav[] = [
  {
    id: "inicio",
    etiqueta: "Inicio",
    icono: Home,
    ruta: "/organizacion/inicio",
  },
  {
    id: "personas",
    etiqueta: "Personas",
    icono: UsersRound,
    hijos: [
      {
        etiqueta: "Usuarios",
        ruta: "/organizacion/usuarios",
        icono: UsersRound,
        permiso: "usuarios.ver",
      },
      {
        etiqueta: "Alumnos",
        ruta: "/organizacion/alumnos",
        icono: GraduationCap,
        permiso: "estudiantes.ver",
      },
    ],
  },
  {
    id: "formacion",
    etiqueta: "Formación",
    icono: BookOpen,
    hijos: [
      {
        etiqueta: "Cursos",
        ruta: "/organizacion/cursos",
        icono: BookOpen,
        permiso: "cursos.ver",
      },
      {
        etiqueta: "Categorías",
        ruta: "/organizacion/cursos/categorias",
        icono: Tags,
        permiso: "categorias.ver",
      },
      {
        etiqueta: "Asignaciones",
        ruta: "/organizacion/asignaciones",
        icono: ClipboardList,
        permiso: "asignaciones.crear",
      },
      {
        etiqueta: "Rutas de aprendizaje",
        ruta: "/organizacion/rutas",
        icono: Route,
        permiso: "rutas.administrar",
      },
      {
        etiqueta: "Certificados",
        ruta: "/organizacion/certificados",
        icono: Award,
        permiso: "certificados.ver",
      },
    ],
  },
  {
    id: "clases-vivo",
    etiqueta: "Clases en vivo",
    icono: Video,
    hijos: [
      {
        etiqueta: "Calendario",
        ruta: "/organizacion/calendario",
        icono: CalendarDays,
        permiso: "sesiones.gestionar",
      },
      {
        etiqueta: "Sesiones",
        ruta: "/organizacion/sesiones",
        icono: Video,
        permiso: "sesiones.gestionar",
      },
    ],
  },
  {
    id: "estructura",
    etiqueta: "Estructura",
    icono: Network,
    hijos: [
      {
        etiqueta: "Estructura y nodos",
        ruta: "/organizacion/equipos",
        icono: Network,
        permiso: "equipos.administrar",
      },
    ],
  },
  {
    id: "reportes",
    etiqueta: "Reportes",
    icono: BarChart3,
    ruta: "/organizacion/reportes",
    permiso: "reportes.ver",
  },
  {
    id: "plan",
    etiqueta: "Plan y facturación",
    icono: CreditCard,
    hijos: [
      {
        etiqueta: "Licencia y consumo",
        ruta: "/organizacion/licencia",
        icono: ShieldCheck,
        permiso: "licencias.ver",
      },
      {
        etiqueta: "Facturación y actualización",
        ruta: "/organizacion/facturacion",
        icono: CreditCard,
        permiso: "facturacion.ver",
      },
    ],
  },
];

const grupos = computed(() =>
  gruposBase
    .map((grupo) => {
      if (grupo.ruta) {
        if (grupo.permiso && !tienePermiso(grupo.permiso)) return null;
        return grupo;
      }
      const hijos = (grupo.hijos ?? []).filter(
        (hijo) => !hijo.permiso || tienePermiso(hijo.permiso),
      );
      if (!hijos.length) return null;
      // Un solo hijo visible: mostrar como ítem directo con la etiqueta del hijo.
      if (hijos.length === 1) {
        const unico = hijos[0]!;
        return {
          id: grupo.id,
          etiqueta: unico.etiqueta,
          icono: unico.icono,
          ruta: unico.ruta,
        } satisfies GrupoNav;
      }
      return { ...grupo, hijos };
    })
    .filter((grupo): grupo is GrupoNav => Boolean(grupo)),
);

const itemsEcosistemaBase = [
  {
    e: "Presencia pública",
    r: "/organizacion/ecosistema",
    i: Sparkles,
    p: "configuracion.editar",
  },
  {
    e: "Gestionar vacantes",
    r: "/bolsa-tukuy/gestion",
    i: BriefcaseBusiness,
    p: "vacantes.gestionar",
  },
];
const itemsEcosistema = computed(() =>
  itemsEcosistemaBase.filter((item) => !item.p || tienePermiso(item.p)),
);
const otrasFunciones = computed(() =>
  funcionesEntidadActiva.value.filter(
    (item) => item.id !== contextoActivo.value?.funcionId,
  ),
);
const titulo = computed(() =>
  String(route.meta.titulo ?? "Portal de organización"),
);

function rutaActiva(ruta: string) {
  if (ruta === "/organizacion/cursos") {
    return (
      route.path === ruta ||
      (route.path.startsWith(`${ruta}/`) &&
        !route.path.startsWith("/organizacion/cursos/categorias"))
    );
  }
  if (ruta === "/comunidad") {
    return (
      route.path === "/comunidad" ||
      route.path.startsWith("/comunidad/publicaciones")
    );
  }
  if (ruta === "/bolsa-tukuy") {
    return (
      route.path === "/bolsa-tukuy" ||
      route.path.startsWith("/bolsa-tukuy/vacantes")
    );
  }
  return route.path === ruta || route.path.startsWith(`${ruta}/`);
}

function grupoActivo(grupo: GrupoNav) {
  if (grupo.ruta) return rutaActiva(grupo.ruta);
  return (grupo.hijos ?? []).some((hijo) => rutaActiva(hijo.ruta));
}

function grupoExpandido(grupo: GrupoNav) {
  if (!grupo.hijos?.length) return false;
  return gruposAbiertos.value[grupo.id] ?? grupoActivo(grupo);
}

function alternarGrupo(grupo: GrupoNav) {
  const abiertoAhora = grupoExpandido(grupo);
  gruposAbiertos.value = {
    ...gruposAbiertos.value,
    [grupo.id]: !abiertoAhora,
  };
}

watch(
  () => route.path,
  () => {
    for (const grupo of grupos.value) {
      if (grupo.hijos?.length && grupoActivo(grupo)) {
        gruposAbiertos.value = {
          ...gruposAbiertos.value,
          [grupo.id]: true,
        };
      }
    }
  },
  { immediate: true },
);

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
      <nav class="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-2">
        <div v-for="grupo in grupos" :key="grupo.id" class="space-y-0.5">
          <!-- Ítem global sin hijos -->
          <button
            v-if="grupo.ruta && !grupo.hijos?.length"
            class="flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-semibold transition"
            :class="
              rutaActiva(grupo.ruta)
                ? 'border-l-primary bg-primary/10 text-primary'
                : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
            "
            @click="ir(grupo.ruta)"
          >
            <component :is="grupo.icono" class="h-[18px] w-[18px] shrink-0" />
            <span>{{ grupo.etiqueta }}</span>
          </button>

          <!-- Grupo con subpuntos -->
          <template v-else-if="grupo.hijos?.length">
            <button
              type="button"
              class="flex w-full items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-semibold transition"
              :class="
                grupoActivo(grupo)
                  ? 'border-l-primary bg-primary/10 text-primary'
                  : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
              "
              :aria-expanded="grupoExpandido(grupo)"
              @click="alternarGrupo(grupo)"
            >
              <component :is="grupo.icono" class="h-[18px] w-[18px] shrink-0" />
              <span class="flex-1 text-left">{{ grupo.etiqueta }}</span>
              <ChevronDown
                class="h-4 w-4 shrink-0 transition-transform duration-300 ease-out"
                :class="grupoExpandido(grupo) ? 'rotate-0' : '-rotate-90'"
              />
            </button>
            <div
              class="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
              :class="
                grupoExpandido(grupo)
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'pointer-events-none grid-rows-[0fr] opacity-0'
              "
            >
              <div class="min-h-0 overflow-hidden">
                <div class="ml-2 space-y-0.5 border-l border-border py-0.5 pl-2">
                  <button
                    v-for="hijo in grupo.hijos"
                    :key="hijo.ruta"
                    class="flex w-full items-center gap-2.5 border-l-[3px] px-2.5 py-2 text-xs font-semibold transition-colors duration-200"
                    :class="
                      rutaActiva(hijo.ruta)
                        ? 'border-l-accent bg-primary/10 text-primary'
                        : 'border-l-transparent text-muted-foreground hover:border-l-accent/50 hover:bg-muted hover:text-foreground'
                    "
                    :tabindex="grupoExpandido(grupo) ? 0 : -1"
                    @click="ir(hijo.ruta)"
                  >
                    <component :is="hijo.icono" class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ hijo.etiqueta }}</span>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </nav>
      <div class="border-t border-border px-3 py-3">
        <p
          class="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[.18em] text-muted-foreground"
        >
          Ecosistema · configuración
        </p>
        <button
          v-for="x in itemsEcosistema"
          :key="x.r"
          class="flex w-full items-center gap-2 border-l-2 px-2 py-2 text-xs font-semibold transition"
          :class="
            rutaActiva(x.r)
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
