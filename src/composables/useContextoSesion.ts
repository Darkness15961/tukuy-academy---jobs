import { computed, ref } from "vue";

import {
  CONTEXTO_SESION_KEY,
  MEMBRESIAS_KEY,
  ULTIMAS_FUNCIONES_ENTIDAD_KEY,
} from "@/lib/constants";
import type {
  ContextoSesion,
  MembresiaOrganizacion,
  Rol,
  TipoPortal,
} from "@/types/membresia.types";

const etiquetasRol: Record<Rol, string> = {
  SUPER_ADMIN: "Superadministración Tukuy",
  PLATFORM_ADMIN: "Administración Tukuy",
  PLATFORM_SUPPORT: "Soporte Tukuy",
  COURSE_REVIEWER: "Revisión de cursos",
  ORGANIZATION_OWNER: "Dirección",
  ORGANIZATION_ADMIN: "Administración",
  TRAINING_MANAGER: "Gestión de capacitación",
  INSTRUCTOR: "Docencia",
  SUPERVISOR: "Supervisión",
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

if (
  contextoActivo.value?.organizacionId === "org-empresa-abc" &&
  ["Empresa ABC", "Andina Constructora"].includes(
    contextoActivo.value.organizacionNombre,
  )
) {
  contextoActivo.value = {
    ...contextoActivo.value,
    organizacionNombre: "COLEGIO DE INGENIEROS CUSCO",
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

if (
  contextoActivo.value?.organizacionId === "org-empresa-abc" &&
  !contextoActivo.value.personaEntidadId
) {
  contextoActivo.value = {
    ...contextoActivo.value,
    personaEntidadId: "15",
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

const permisosAcademicosOrganizacion = [
  "estudiantes.ver",
  "certificados.ver",
  "certificados.emitir",
];

if (contextoActivo.value?.portal === "organizacion") {
  contextoActivo.value = {
    ...contextoActivo.value,
    permisos: [
      ...new Set([
        ...contextoActivo.value.permisos,
        ...permisosAcademicosOrganizacion,
        ...(["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(
          contextoActivo.value.rol,
        )
          ? ["configuracion.editar", "cursos.crear", "cursos.editar"]
          : []),
      ]),
    ],
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

if (
  contextoActivo.value?.portal === "docente" &&
  contextoActivo.value.organizacionId === "org-academia-tukuy"
) {
  contextoActivo.value = {
    ...contextoActivo.value,
    organizacionId: "org-empresa-abc",
    organizacionNombre: "COLEGIO DE INGENIEROS CUSCO",
  };
  localStorage.setItem(
    CONTEXTO_SESION_KEY,
    JSON.stringify(contextoActivo.value),
  );
}

membresias.value = membresias.value.map((membresia) => {
  if (
    membresia.organizacion?.id === "org-empresa-abc" &&
    !membresia.personaEntidadId
  ) {
    membresia = { ...membresia, personaEntidadId: "15" };
  }
  if (
    membresia.organizacion?.id === "org-empresa-abc" &&
    ["Empresa ABC", "Andina Constructora"].includes(
      membresia.organizacion.nombre,
    )
  ) {
    return {
      ...membresia,
      organizacion: {
        ...membresia.organizacion,
        nombre: "COLEGIO DE INGENIEROS CUSCO",
      },
    };
  }
  if (
    membresia.portal === "docente" &&
    membresia.organizacion?.id === "org-academia-tukuy"
  ) {
    return {
      ...membresia,
      organizacion: {
        ...membresia.organizacion,
        id: "org-empresa-abc",
        nombre: "COLEGIO DE INGENIEROS CUSCO",
        tipo: "EMPRESA",
      },
    };
  }
  return membresia;
});
membresias.value = membresias.value.map(aplicarIdentidadGuardada);
membresias.value = membresias.value.map((membresia) =>
  membresia.portal === "organizacion"
    ? {
        ...membresia,
        permisos: [
          ...new Set([
            ...membresia.permisos,
            ...permisosAcademicosOrganizacion,
            ...(["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(
              membresia.rol,
            )
              ? ["configuracion.editar", "cursos.crear", "cursos.editar"]
              : []),
          ]),
        ],
      }
    : membresia,
);
if (membresias.value.length) {
  localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(membresias.value));
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

  function configurarMembresias(nuevasMembresias?: MembresiaOrganizacion[]) {
    const base = nuevasMembresias?.length
      ? nuevasMembresias
      : [crearMembresiaPersonal()];
    const normalizadas = base.map(aplicarIdentidadGuardada).map((membresia) =>
      ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(membresia.rol)
        ? {
            ...membresia,
            permisos: [
              ...new Set([
                ...membresia.permisos,
                "configuracion.editar",
                "cursos.crear",
                "cursos.editar",
              ]),
            ],
          }
        : membresia,
    );
    membresias.value = normalizadas;
    localStorage.setItem(MEMBRESIAS_KEY, JSON.stringify(normalizadas));

    if (
      contextoActivo.value &&
      !normalizadas.some(
        (membresia) => membresia.id === contextoActivo.value?.membresiaId,
      )
    ) {
      limpiarContexto();
    }
  }

  function seleccionarContexto(membresia: MembresiaOrganizacion) {
    const contexto: ContextoSesion = {
      membresiaId: membresia.id,
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
