import { computed, ref } from "vue";

import {
  CONTEXTO_SESION_KEY,
  MEMBRESIAS_KEY,
  ULTIMAS_FUNCIONES_ENTIDAD_KEY,
} from "@/lib/constants";
import type {
  ContextoSesion,
  FuncionMembresia,
  MembresiaEntrada,
  MembresiaMultiRol,
  MembresiaOrganizacion,
  Rol,
  TipoPortal,
} from "@/types/membresia.types";

const etiquetasRol: Record<Rol, string> = {
  SUPER_ADMIN: "Superadministración Tukuy",
  PLATFORM_ADMIN: "Administración Tukuy",
  PLATFORM_SUPPORT: "Soporte Tukuy",
  COURSE_REVIEWER: "Revisión de cursos",
  OWNER: "Dirección",
  ADMIN: "Administración",
  ORGANIZATION_OWNER: "Dirección",
  ORGANIZATION_ADMIN: "Administración",
  TRAINING_MANAGER: "Gestión de capacitación",
  INSTRUCTOR: "Docencia",
  SUPERVISOR: "Supervisión",
  LEARNER: "Aprendizaje",
  STUDENT: "Aprendizaje",
};

type IdentidadEntidad = { nombre?: string; logo?: string };

function claveIdentidadEntidad(organizacionId: string) {
  return `tukuy_identidad_entidad_${organizacionId}`;
}

function aplicarIdentidadGuardada(membresia: MembresiaOrganizacion) {
  if (!membresia.organizacion) return membresia;
  const identidad = leerJson<IdentidadEntidad>(
    claveIdentidadEntidad(membresia.organizacion.id),
  );
  if (!identidad) return membresia;
  return {
    ...membresia,
    organizacion: {
      ...membresia.organizacion,
      nombre: identidad.nombre?.trim() || membresia.organizacion.nombre,
      logo: identidad.logo || membresia.organizacion.logo,
    },
  };
}

export function etiquetaRol(rol: Rol) {
  return etiquetasRol[rol];
}

function leerJson<T>(clave: string): T | null {
  const valor = localStorage.getItem(clave);
  if (!valor) return null;

  try {
    return JSON.parse(valor) as T;
  } catch {
    localStorage.removeItem(clave);
    return null;
  }
}

const membresias = ref<MembresiaOrganizacion[]>(
  leerJson<MembresiaOrganizacion[]>(MEMBRESIAS_KEY) ?? [],
);
const contextoActivo = ref<ContextoSesion | null>(
  leerJson<ContextoSesion>(CONTEXTO_SESION_KEY),
);

// Migra contextos guardados por versiones anteriores (una membresía = un rol).
if (contextoActivo.value && !contextoActivo.value.funcionId) {
  contextoActivo.value = {
    ...contextoActivo.value,
    funcionId: contextoActivo.value.membresiaId,
    rolId: contextoActivo.value.rol,
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

function esMembresiaMultiRol(
  membresia: MembresiaEntrada,
): membresia is MembresiaMultiRol {
  return Array.isArray((membresia as MembresiaMultiRol).roles);
}

/**
 * Proyecta el contrato multirol a funciones seleccionables. Así los portales
 * actuales siguen trabajando con un objeto plano, pero el contexto conserva
 * membresiaId y rolId canónicos para el backend.
 */
function expandirMembresia(
  membresia: MembresiaEntrada,
): MembresiaOrganizacion[] {
  if (!esMembresiaMultiRol(membresia)) {
    return [
      {
        ...membresia,
        membresiaOrigenId: membresia.membresiaOrigenId ?? membresia.id,
        rolId: membresia.rolId ?? membresia.rol,
      },
    ];
  }

  return membresia.roles.map((funcion: FuncionMembresia) => ({
    id: `${membresia.id}::${funcion.id}`,
    membresiaOrigenId: membresia.id,
    rolId: funcion.id,
    usuarioId: membresia.usuarioId,
    personaEntidadId: membresia.personaEntidadId,
    organizacion: membresia.organizacion,
    rol: funcion.codigo,
    permisos: funcion.permisos,
    alcance: funcion.alcance,
    estado: membresia.estado,
    portal: funcion.portal,
    ambitoDocencia: funcion.ambitoDocencia,
  }));
}

function expandirMembresias(
  entradas: MembresiaEntrada[],
): MembresiaOrganizacion[] {
  return entradas.flatMap(expandirMembresia);
}

function normalizarPermisosOrganizacion(
  membresia: MembresiaOrganizacion,
): MembresiaOrganizacion {
  return {
    ...membresia,
    permisos: [...new Set(membresia.permisos)],
  };
}

// Normalizar membresías al arrancar (solo permisos; nunca muta IDs ni nombres).
membresias.value = membresias.value
  .map(aplicarIdentidadGuardada)
  .map(normalizarPermisosOrganizacion);
if (membresias.value.length) {
  localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(membresias.value));
}

// Deduplicar el contexto activo sin conceder permisos en el cliente.
if (contextoActivo.value?.portal === "organizacion") {
  const ctx = contextoActivo.value;
  contextoActivo.value = {
    ...ctx,
    permisos: [...new Set(ctx.permisos)],
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

function crearMembresiaPersonal(
  usuarioId = "usuario-actual",
): MembresiaOrganizacion {
  return {
    id: `mem-personal-${usuarioId}`,
    usuarioId,
    organizacion: {
      id: `org-personal-${usuarioId}`,
      nombre: "Tukuy Personal",
      tipo: "PERSONAL",
      estado: "ACTIVA",
    },
    rol: "STUDENT",
    permisos: [
      "cursos.ver",
      "aprendizaje.consumir",
      "certificados.ver",
      "perfil.editar",
      "bolsa.ver",
      "bolsa.postular",
      "bolsa.guardar",
      "comunidad.ver",
      "comunidad.publicar",
      "comunidad.comentar",
      "comunidad.reaccionar",
    ],
    estado: "ACTIVA",
    portal: "estudiante",
  };
}

export function rutaInicioPortal(portal: TipoPortal) {
  if (portal === "estudiante") return "/tukuy-academy/cursos";
  return `/${portal}/inicio`;
}

export function useContextoSesion() {
  const membresiasActivas = computed(() =>
    membresias.value.filter(
      (membresia) =>
        membresia.estado === "ACTIVA" &&
        membresia.organizacion?.estado !== "SUSPENDIDA",
    ),
  );

  const funcionesEntidadActiva = computed(() => {
    const organizacionId = contextoActivo.value?.organizacionId;
    if (!organizacionId) return [];
    return membresiasActivas.value.filter(
      (membresia) => membresia.organizacion?.id === organizacionId,
    );
  });

  function configurarMembresias(nuevasMembresias?: MembresiaEntrada[]) {
    const base = nuevasMembresias?.length
      ? nuevasMembresias
      : [crearMembresiaPersonal()];
    const normalizadas = expandirMembresias(base)
      .map(aplicarIdentidadGuardada)
      .map(normalizarPermisosOrganizacion);
    membresias.value = normalizadas;
    localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(normalizadas));

    if (
      contextoActivo.value &&
      !normalizadas.some(
        (membresia) =>
          (membresia.membresiaOrigenId ?? membresia.id) ===
            contextoActivo.value?.membresiaId &&
          (membresia.rolId ?? membresia.rol) === contextoActivo.value?.rolId,
      )
    ) {
      limpiarContexto();
    }
  }

  function seleccionarContexto(membresia: MembresiaOrganizacion) {
    const contexto: ContextoSesion = {
      membresiaId: membresia.membresiaOrigenId ?? membresia.id,
      funcionId: membresia.id,
      rolId: membresia.rolId ?? membresia.rol,
      usuarioId: membresia.usuarioId,
      personaEntidadId: membresia.personaEntidadId,
      organizacionId: membresia.organizacion?.id ?? null,
      organizacionNombre:
        membresia.organizacion?.nombre ??
        (membresia.ambitoDocencia === "INDEPENDIENTE"
          ? "Docencia independiente"
          : "Tukuy Academy"),
      rol: membresia.rol,
      permisos: membresia.permisos,
      alcance: membresia.alcance,
      portal: membresia.portal,
      ambitoDocencia: membresia.ambitoDocencia,
    };

    contextoActivo.value = contexto;
    localStorage.setItem(CONTEXTO_SESION_KEY, JSON.stringify(contexto));
    if (
      membresia.organizacion &&
      membresia.organizacion.tipo !== "PERSONAL"
    ) {
      const guardadas =
        leerJson<Record<string, string>>(ULTIMAS_FUNCIONES_ENTIDAD_KEY) ?? {};
      guardadas[membresia.organizacion.id] = membresia.id;
      localStorage.setItem(
        ULTIMAS_FUNCIONES_ENTIDAD_KEY,
        JSON.stringify(guardadas),
      );
    }
    return contexto;
  }

  function cambiarFuncion(membresiaId: string) {
    const membresia = funcionesEntidadActiva.value.find(
      (item) => item.id === membresiaId,
    );
    if (!membresia) return null;
    return seleccionarContexto(membresia);
  }

  function tienePermiso(permiso: string) {
    return contextoActivo.value?.permisos.includes(permiso) ?? false;
  }

  function actualizarNombreOrganizacion(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio || !contextoActivo.value?.organizacionId) return;
    const organizacionId = contextoActivo.value.organizacionId;
    contextoActivo.value = {
      ...contextoActivo.value,
      organizacionNombre: limpio,
    };
    localStorage.setItem(CONTEXTO_SESION_KEY, JSON.stringify(contextoActivo.value));
    membresias.value = membresias.value.map((membresia) =>
      membresia.organizacion?.id === organizacionId
        ? {
            ...membresia,
            organizacion: { ...membresia.organizacion, nombre: limpio },
          }
        : membresia,
    );
    localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(membresias.value));
  }

  function actualizarIdentidadOrganizacion(identidad: IdentidadEntidad) {
    const organizacionId = contextoActivo.value?.organizacionId;
    if (!organizacionId) return;
    const actual =
      leerJson<IdentidadEntidad>(claveIdentidadEntidad(organizacionId)) ?? {};
    const nueva = { ...actual, ...identidad };
    localStorage.setItem(claveIdentidadEntidad(organizacionId), JSON.stringify(nueva));
    if (nueva.nombre?.trim()) actualizarNombreOrganizacion(nueva.nombre);
    membresias.value = membresias.value.map((membresia) =>
      membresia.organizacion?.id === organizacionId
        ? {
            ...membresia,
            organizacion: {
              ...membresia.organizacion,
              logo: nueva.logo || membresia.organizacion.logo,
            },
          }
        : membresia,
    );
    localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(membresias.value));
  }

  function limpiarContexto() {
    contextoActivo.value = null;
    localStorage.removeItem(CONTEXTO_SESION_KEY);
  }

  function limpiarSesionMultiempresa() {
    limpiarContexto();
    membresias.value = [];
    localStorage.removeItem(MEMBRESIAS_KEY);
    localStorage.removeItem(ULTIMAS_FUNCIONES_ENTIDAD_KEY);
  }

  return {
    membresias,
    membresiasActivas,
    funcionesEntidadActiva,
    contextoActivo,
    configurarMembresias,
    seleccionarContexto,
    cambiarFuncion,
    tienePermiso,
    actualizarNombreOrganizacion,
    actualizarIdentidadOrganizacion,
    limpiarContexto,
    limpiarSesionMultiempresa,
  };
}
