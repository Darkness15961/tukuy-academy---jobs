<script setup lang="ts">
import {
  ArrowRight,
  Check,
  LogOut,
} from "lucide-vue-next";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/composables/useAuth";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import { ULTIMAS_FUNCIONES_ENTIDAD_KEY } from "@/lib/constants";
import type {
  MembresiaOrganizacion,
  TipoPortal,
} from "@/types/membresia.types";

const router = useRouter();
const { logout, currentUser, restaurarUsuario, sincronizarSesion } = useAuth();
const {
  membresiasActivas,
  contextoActivo,
  seleccionarContexto,
} = useContextoSesion();

onMounted(() => {
  void restaurarUsuario();
  void sincronizarSesion(undefined, false);
});


const presentacionPortal: Record<
  TipoPortal,
  {
    etiqueta: string;
    descripcion: string;
    imagen: string;
    imagenAlt: string;
    colorBorde: string;
    funciones: string[];
  }
> = {
  estudiante: {
    etiqueta: "Portal del estudiante",
    descripcion:
      "Continúa tus cursos, revisa tu avance y potencia tu perfil profesional.",
    imagen: "/img/portal-estudiante.png",
    imagenAlt: "Estudiante desarrollando sus competencias en línea",
    colorBorde: "group-hover:border-blue-300",
    funciones: [
      "Mi aprendizaje",
      "Certificados y logros",
      "CV y oportunidades",
    ],
  },
  docente: {
    etiqueta: "Portal del docente",
    descripcion:
      "Diseña experiencias formativas y acompaña el progreso de tus estudiantes.",
    imagen: "/img/portal-docente.png",
    imagenAlt: "Docente facilitando una experiencia de aprendizaje",
    colorBorde: "group-hover:border-teal-300",
    funciones: [
      "Crear y gestionar cursos",
      "Estudiantes y evaluaciones",
      "Analítica académica",
    ],
  },
  organizacion: {
    etiqueta: "Portal de organización",
    descripcion:
      "Administra usuarios, capacitación, asignaciones y resultados de tu equipo.",
    imagen: "/img/portal-organizacion.png",
    imagenAlt: "Equipo gestionando su estrategia de capacitación",
    colorBorde: "group-hover:border-amber-300",
    funciones: [
      "Usuarios y equipos",
      "Asignación de cursos",
      "Reportes y licencias",
    ],
  },
  admin: {
    etiqueta: "Administración Tukuy",
    descripcion: "Gestiona la operación global de Tukuy Academy.",
    imagen: "/img/portal-administracion.png",
    imagenAlt: "Equipo administrando la operación de la plataforma",
    colorBorde: "group-hover:border-violet-300",
    funciones: ["Organizaciones", "Planes y licencias", "Auditoría global"],
  },
};

const prioridadRol: Record<string, number> = {
  OWNER: 60,
  ADMIN: 50,
  ORGANIZATION_OWNER: 60,
  ORGANIZATION_ADMIN: 50,
  TRAINING_MANAGER: 40,
  SUPERVISOR: 30,
  INSTRUCTOR: 20,
  LEARNER: 10,
  STUDENT: 10,
};

function ultimasFuncionesGuardadas() {
  try {
    return JSON.parse(
      localStorage.getItem(ULTIMAS_FUNCIONES_ENTIDAD_KEY) ?? "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

function esAccesoInstitucional(membresia: MembresiaOrganizacion) {
  return Boolean(
    membresia.organizacion &&
      membresia.organizacion.tipo !== "PERSONAL" &&
      membresia.portal !== "admin" &&
      !esDocenciaIndependiente(membresia),
  );
}

const contextosDisponibles = computed(() => {
  const personales = membresiasActivas.value.filter(
    (membresia) =>
      !esAccesoInstitucional(membresia) && membresia.portal !== "admin",
  );
  const administracionTukuy = membresiasActivas.value.filter(
    (membresia) => membresia.portal === "admin",
  );
  const porEntidad = new Map<string, MembresiaOrganizacion[]>();

  membresiasActivas.value
    .filter(esAccesoInstitucional)
    .forEach((membresia) => {
      const id = membresia.organizacion!.id;
      porEntidad.set(id, [...(porEntidad.get(id) ?? []), membresia]);
    });

  const entidades = [...porEntidad.values()].flatMap((funciones) => {
    const organizacionId = funciones[0]?.organizacion?.id ?? "";
    const membresiaPreferida = ultimasFuncionesGuardadas()[organizacionId];
    const activa = funciones.find(
      (item) => item.id === contextoActivo.value?.funcionId,
    );
    const guardada = funciones.find(
      (item) => item.id === membresiaPreferida,
    );
    const principal =
      activa ??
      guardada ??
      [...funciones].sort(
        (a, b) =>
          (prioridadRol[b.rol] ?? 0) - (prioridadRol[a.rol] ?? 0),
      )[0];
    return principal ? [principal] : [];
  });

  return [...personales, ...entidades, ...administracionTukuy];
});

async function ingresar(membresia: MembresiaOrganizacion) {
  const contexto = seleccionarContexto(membresia);
  await router.replace(rutaInicioPortal(contexto.portal));
}

function esDocenciaIndependiente(membresia: MembresiaOrganizacion) {
  return (
    membresia.portal === "docente" &&
    membresia.ambitoDocencia === "INDEPENDIENTE"
  );
}

function nombreContexto(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) return "Espacio profesional propio";
  if (esAccesoInstitucional(membresia)) return "Entidad vinculada";
  return membresia.organizacion?.nombre ?? "Tukuy Academy";
}

function claseTarjetaContexto(membresia: MembresiaOrganizacion) {
  const ancho =
    contextosDisponibles.value.length === 1
      ? "xl:max-w-md xl:flex-none"
      : contextosDisponibles.value.length === 2
        ? "xl:max-w-lg"
        : contextosDisponibles.value.length === 3
          ? "xl:max-w-md"
          : "xl:max-w-sm";
  return [
    "group relative min-h-[640px] w-full overflow-hidden border-white/20 bg-[#07152B] text-white shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition duration-500 hover:z-10 hover:-translate-y-1 hover:shadow-[0_34px_80px_-34px_rgba(0,0,0,0.95)] sm:max-w-md md:max-w-[calc(50%-0.25rem)] xl:min-h-full xl:flex-1",
    presentacionPortal[membresia.portal].colorBorde,
    ancho,
  ].join(" ");
}

function tituloContexto(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) return "Portal docente";
  if (esAccesoInstitucional(membresia)) {
    return membresia.organizacion?.nombre ?? "Organización";
  }
  return presentacionPortal[membresia.portal].etiqueta;
}

function imagenContexto(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) {
    return "/img/portal-docente-independiente.png";
  }
  if (esAccesoInstitucional(membresia)) {
    return "/img/portal-organizacion.png";
  }
  return presentacionPortal[membresia.portal].imagen;
}

function textoAlternativoImagen(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) {
    return "Docente independiente preparando un curso desde su espacio profesional";
  }
  if (esAccesoInstitucional(membresia)) {
    return `Espacio institucional de ${membresia.organizacion?.nombre}`;
  }
  return presentacionPortal[membresia.portal].imagenAlt;
}

function descripcionContexto(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) {
    return "Crea y comercializa cursos propios, administra tus estudiantes y controla tus ingresos personales.";
  }
  if (esAccesoInstitucional(membresia)) {
    return "Ingresa a tu espacio institucional. Tus módulos y datos se adaptarán automáticamente a la función que tengas autorizada.";
  }
  return presentacionPortal[membresia.portal].descripcion;
}

function funcionesContexto(membresia: MembresiaOrganizacion) {
  if (esDocenciaIndependiente(membresia)) {
    return [
      "Cursos propios y catálogo público",
      "Estudiantes de matrícula individual",
      "Ventas e ingresos personales",
    ];
  }
  if (esAccesoInstitucional(membresia)) {
    return [
      "Una sola entrada para toda la entidad",
      "Funciones internas según tus permisos",
      "Información aislada de otras organizaciones",
    ];
  }
  return presentacionPortal[membresia.portal].funciones;
}
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden bg-[#07152B] text-white"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-linear-to-br from-[#0B3A78] via-[#07152B] to-[#020817]"
    />
    <div
      class="pointer-events-none absolute inset-0 opacity-25"
      style="background-image: linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px); background-size: 96px 96px"
    />
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-blue-400/10 to-transparent"
    />
    <div
      v-if="!contextosDisponibles.length"
      class="pointer-events-none absolute inset-0"
    >
      <img
        src="/img/portal-organizacion.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover object-center opacity-65"
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-[#020817] via-[#06152b]/95 to-[#06152b]/15"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-[#020817] via-transparent to-black/40"
      />
    </div>

    <Button
      variant="ghost"
      class="absolute right-5 top-5 z-20 border border-white/15 bg-black/10 text-white/70 backdrop-blur-md hover:bg-white hover:text-[#07152B] sm:right-8 sm:top-7"
      @click="logout"
    >
      <LogOut class="h-4 w-4" />
      <span class="hidden sm:inline">Cerrar sesión</span>
    </Button>

    <section
      class="relative mx-auto grid min-h-screen max-w-420 gap-6 px-5 py-7 sm:px-8 sm:py-9 xl:grid-rows-[auto_minmax(0,1fr)]"
    >
      <div
        v-if="contextosDisponibles.length"
        class="flex min-h-24 items-end border-b border-white/15 pb-5 pr-36"
      >
        <div>
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-[#F5B400]"
          >
            Espacios de trabajo
          </p>
          <h1
            class="mt-3 text-4xl font-black tracking-normal text-white sm:text-5xl"
          >
            Selecciona tu espacio
          </h1>
        </div>
      </div>

      <div
        v-if="contextosDisponibles.length"
        class="flex flex-wrap justify-center gap-2 xl:min-h-[calc(100svh-190px)] xl:items-stretch"
      >
        <Card
          v-for="membresia in contextosDisponibles"
          :key="membresia.id"
          :class="claseTarjetaContexto(membresia)"
        >
          <div
            v-if="esAccesoInstitucional(membresia)"
            class="absolute left-6 top-6 z-10 grid h-20 w-20 place-items-center bg-white p-2 shadow-xl"
          >
            <img
              :src="membresia.organizacion?.logo ?? '/img/iconoTukuyAcademy.png'"
              :alt="`Logo de ${membresia.organizacion?.nombre}`"
              class="h-full w-full object-contain"
            />
          </div>
          <img
            :src="imagenContexto(membresia)"
            :alt="textoAlternativoImagen(membresia)"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08] group-focus-within:scale-[1.08]"
          />
          <div
            class="absolute inset-0 bg-linear-to-b from-[#07152B]/20 via-[#07152B]/15 to-[#020817]/95 transition duration-500 group-hover:from-[#07152B]/35 group-hover:via-[#07152B]/45 group-hover:to-[#020817] group-focus-within:from-[#07152B]/35 group-focus-within:via-[#07152B]/45 group-focus-within:to-[#020817]"
          />

          <CardContent
            class="relative flex min-h-[640px] flex-col p-0 xl:min-h-full"
          >
            <div class="mt-auto p-7 xl:p-8">
              <p
                class="text-xs font-bold uppercase tracking-[0.16em] text-[#F5B400]"
              >
                {{ nombreContexto(membresia) }}
              </p>
              <h2 class="mt-2 max-w-xs text-3xl font-black leading-tight 2xl:text-4xl">
                {{ tituloContexto(membresia) }}
              </h2>

              <div
                class="grid max-h-[340px] translate-y-0 grid-rows-[1fr] overflow-hidden opacity-100 transition-all duration-500 ease-out xl:max-h-0 xl:translate-y-5 xl:grid-rows-[0fr] xl:opacity-0 xl:group-hover:max-h-[340px] xl:group-hover:translate-y-0 xl:group-hover:grid-rows-[1fr] xl:group-hover:opacity-100 xl:group-focus-within:max-h-[340px] xl:group-focus-within:translate-y-0 xl:group-focus-within:grid-rows-[1fr] xl:group-focus-within:opacity-100"
              >
                <div class="min-h-0 overflow-hidden">
                  <p class="mt-4 text-sm leading-6 text-white/80">
                    {{ descripcionContexto(membresia) }}
                  </p>

                  <ul class="mt-4 grid gap-2.5 border-t border-white/20 pt-4">
                    <li
                      v-for="funcion in funcionesContexto(membresia)"
                      :key="funcion"
                      class="flex items-center gap-2.5 text-sm font-medium text-white/90"
                    >
                      <span
                        class="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"
                      >
                        <Check class="h-3 w-3" />
                      </span>
                      {{ funcion }}
                    </li>
                  </ul>

                  <Button
                    class="mt-5 h-12 w-full border border-white bg-white font-bold text-[#07152B] hover:bg-[#F5B400]"
                    @click="ingresar(membresia)"
                  >
                    Ingresar al espacio
                    <ArrowRight
                      class="h-4 w-4 transition group-hover:translate-x-1"
                    />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section
        v-else
        class="relative flex min-h-[calc(100svh-4rem)] items-center py-20 sm:py-24"
      >
        <div class="w-full max-w-3xl">
          <div class="flex items-center gap-4">
            <div
              class="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#F5B400] bg-[#123768] p-0.5 shadow-xl"
            >
              <img
                v-if="currentUser?.avatarUrl"
                :src="currentUser.avatarUrl"
                :alt="`Foto de ${currentUser.name}`"
                referrerpolicy="no-referrer"
                class="h-full w-full rounded-full object-cover"
              />
              <div
                v-else
                class="grid h-full w-full place-items-center rounded-full text-sm font-black text-white"
              >
                {{ currentUser?.initials ?? "TU" }}
              </div>
            </div>
            <div>
              <p
                class="text-xs font-black uppercase tracking-[0.24em] text-emerald-300"
              >
                Identidad verificada
              </p>
              <p class="mt-1 text-sm font-semibold text-white/70">
                {{ currentUser?.name ?? "Usuario Tukuy" }}
              </p>
            </div>
          </div>

          <div class="mt-9">
            <span
              class="inline-block bg-[#174B88] px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white sm:text-base"
            >
              Acceso pendiente
            </span>
            <h1
              class="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              Aún no tienes un perfil asignado
            </h1>
          </div>

          <div class="mt-8 flex max-w-xl items-start gap-4 border-l-4 border-[#F5B400] bg-black/30 px-5 py-4 backdrop-blur-sm">
            <div>
              <p class="font-black text-white">
                Comunícate con el administrador de tu organización.
              </p>
              <p class="mt-1 text-sm leading-6 text-white/60">
                Cuando recibas tu asignación, tus espacios aparecerán
                automáticamente en esta pantalla.
              </p>
            </div>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <Button
              class="h-12 rounded-none bg-[#F5B400] px-7 font-black text-[#07152B] hover:bg-amber-300"
              @click="router.push('/')"
            >
              Volver al inicio
              <ArrowRight class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              class="h-12 rounded-none border-white/50 bg-black/20 px-7 font-bold text-white backdrop-blur-sm hover:bg-white hover:text-[#07152B]"
              @click="logout"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
