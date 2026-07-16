import { computed, ref } from "vue";

import { CONTEXTO_SESION_KEY, MEMBRESIAS_KEY } from "@/lib/constants";
import type {
  ContextoSesion,
  MembresiaOrganizacion,
  TipoPortal,
} from "@/types/membresia.types";

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
membresias.value = membresias.value.map((membresia) =>
  membresia.portal === "organizacion"
    ? {
        ...membresia,
        permisos: [
          ...new Set([
            ...membresia.permisos,
            ...permisosAcademicosOrganizacion,
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

  function configurarMembresias(nuevasMembresias?: MembresiaOrganizacion[]) {
    const normalizadas = nuevasMembresias?.length
      ? nuevasMembresias
      : [crearMembresiaPersonal()];
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
      organizacionId: membresia.organizacion?.id ?? null,
      organizacionNombre:
        membresia.organizacion?.nombre ??
        (membresia.ambitoDocencia === "INDEPENDIENTE"
          ? "Docencia independiente"
          : "Tukuy Academy"),
      rol: membresia.rol,
      permisos: membresia.permisos,
      portal: membresia.portal,
      ambitoDocencia: membresia.ambitoDocencia,
    };

    contextoActivo.value = contexto;
    localStorage.setItem(CONTEXTO_SESION_KEY, JSON.stringify(contexto));
    return contexto;
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

  function limpiarContexto() {
    contextoActivo.value = null;
    localStorage.removeItem(CONTEXTO_SESION_KEY);
  }

  function limpiarSesionMultiempresa() {
    limpiarContexto();
    membresias.value = [];
    localStorage.removeItem(MEMBRESIAS_KEY);
  }

  return {
    membresias,
    membresiasActivas,
    contextoActivo,
    configurarMembresias,
    seleccionarContexto,
    tienePermiso,
    actualizarNombreOrganizacion,
    limpiarContexto,
    limpiarSesionMultiempresa,
  };
}
