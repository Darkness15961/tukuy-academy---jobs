<script setup lang="ts">
import {
  ArrowRight,
  Check,
  LogOut,
  UsersRound,
} from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/composables/useAuth";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import { membresiasMock } from "@/data/contextos-sesion.mock";
import { env } from "@/lib/env";
import { ULTIMAS_FUNCIONES_ENTIDAD_KEY } from "@/lib/constants";
import type {
  MembresiaOrganizacion,
  TipoPortal,
} from "@/types/membresia.types";

const router = useRouter();
const { logout } = useAuth();
const {
  membresias,
  membresiasActivas,
  contextoActivo,
  configurarMembresias,
  seleccionarContexto,
} = useContextoSesion();

// En demostración siempre sincronizamos todos los perfiles mock. Esto también
// migra sesiones antiguas que solo conservaban el contexto personal.
if (env.useMock) {
  configurarMembresias(membresiasMock);
} else if (membresias.value.length === 0) {
  configurarMembresias();
}

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
  ORGANIZATION_OWNER: 60,
  ORGANIZATION_ADMIN: 50,
  TRAINING_MANAGER: 40,
  SUPERVISOR: 30,
  INSTRUCTOR: 20,
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
      (item) => item.id === contextoActivo.value?.membresiaId,
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
        class="grid gap-2 md:grid-cols-2 xl:min-h-[calc(100svh-190px)] xl:grid-cols-4"
      >
        <Card
          v-for="membresia in contextosDisponibles"
          :key="membresia.id"
          class="group relative min-h-[640px] overflow-hidden border-white/20 bg-[#07152B] text-white shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] transition duration-500 hover:z-10 hover:-translate-y-1 hover:shadow-[0_34px_80px_-34px_rgba(0,0,0,0.95)] xl:min-h-full"
          :class="presentacionPortal[membresia.portal].colorBorde"
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

      <Card v-else class="mx-auto max-w-lg border-[#DDE7F4] bg-white shadow-sm">
        <CardContent class="grid justify-items-center gap-3 p-8 text-center">
          <UsersRound class="h-10 w-10 text-[#94A3B8]" />
          <h2 class="font-bold">No tienes perfiles activos</h2>
          <p class="text-sm text-[#64748B]">
            Comunícate con el administrador de tu organización.
          </p>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
