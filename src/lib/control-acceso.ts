import type { PlantillaPerfilEntidad } from "@/portal-organizacion/types/estructura-organizacional.types";

export type ModuloAcceso = {
  id: string;
  nombre: string;
  descripcion: string;
  portal: "organizacion" | "admin";
  ruta: string;
  permisos: readonly string[];
};

export const MODULOS_ACCESO: readonly ModuloAcceso[] = [
  { id: "personas", nombre: "Personas", descripcion: "Usuarios, alumnos e invitaciones.", portal: "organizacion", ruta: "/organizacion/usuarios", permisos: ["usuarios.ver", "usuarios.invitar", "usuarios.administrar", "estudiantes.ver"] },
  { id: "formacion", nombre: "Formación", descripcion: "Cursos, categorías, asignaciones y rutas.", portal: "organizacion", ruta: "/organizacion/cursos", permisos: ["cursos.ver", "cursos.crear", "cursos.editar", "cursos.aprobar", "categorias.ver", "categorias.gestionar", "asignaciones.ver", "asignaciones.crear", "rutas.administrar"] },
  { id: "certificados", nombre: "Certificados y firmas", descripcion: "Consulta, preparación, emisión y firma institucional.", portal: "organizacion", ruta: "/organizacion/certificados", permisos: ["certificados.ver", "certificados.preparar", "certificados.emitir", "certificados.firmar", "certificados.verificar", "certificados.revocar", "certificados.configurar"] },
  { id: "sesiones", nombre: "Clases en vivo", descripcion: "Sesiones y calendario institucional.", portal: "organizacion", ruta: "/organizacion/sesiones", permisos: ["sesiones.gestionar"] },
  { id: "estructura", nombre: "Estructura y accesos", descripcion: "Nodos, equipos, perfiles y permisos.", portal: "organizacion", ruta: "/organizacion/equipos", permisos: ["equipos.administrar", "estructura.administrar", "perfiles.administrar"] },
  { id: "reportes", nombre: "Reportes", descripcion: "Indicadores y exportaciones.", portal: "organizacion", ruta: "/organizacion/reportes", permisos: ["reportes.ver", "reportes.exportar", "auditoria.ver"] },
  { id: "licencia", nombre: "Plan y facturación", descripcion: "Consumo de licencia y comprobantes de la entidad.", portal: "organizacion", ruta: "/organizacion/licencia", permisos: ["licencias.ver", "facturacion.ver"] },
  { id: "configuracion", nombre: "Configuración", descripcion: "Identidad y presencia pública de la entidad.", portal: "organizacion", ruta: "/organizacion/configuracion", permisos: ["configuracion.editar", "vacantes.gestionar", "vacantes.publicar", "postulaciones.gestionar"] },
  { id: "admin-organizaciones", nombre: "Organizaciones", descripcion: "Administración global de organizaciones.", portal: "admin", ruta: "/admin/organizaciones", permisos: ["organizaciones.ver", "organizaciones.administrar"] },
  { id: "admin-usuarios", nombre: "Usuarios globales", descripcion: "Consulta global de usuarios.", portal: "admin", ruta: "/admin/usuarios", permisos: ["usuarios.ver"] },
  { id: "admin-cursos", nombre: "Revisión global", descripcion: "Control editorial de cursos.", portal: "admin", ruta: "/admin/cursos", permisos: ["cursos.revisar"] },
  { id: "admin-licencias", nombre: "Planes y licencias", descripcion: "Oferta SaaS y licenciamiento global.", portal: "admin", ruta: "/admin/planes-licencias", permisos: ["planes.administrar", "licencias.administrar"] },
  { id: "admin-finanzas", nombre: "Facturación global", descripcion: "Facturación de la plataforma.", portal: "admin", ruta: "/admin/facturacion", permisos: ["facturacion.ver"] },
  { id: "admin-auditoria", nombre: "Auditoría global", descripcion: "Trazabilidad de la plataforma.", portal: "admin", ruta: "/admin/auditoria", permisos: ["auditoria.ver"] },
] as const;

export const PERMISOS_POR_PLANTILLA: Record<PlantillaPerfilEntidad, readonly string[]> = {
  DIRECCION: ["entidad.gobernar", "administradores.designar", "usuarios.ver", "estudiantes.ver", "cursos.ver", "certificados.ver", "certificados.firmar", "equipos.administrar", "estructura.administrar", "perfiles.administrar", "reportes.ver", "auditoria.ver", "licencias.ver", "facturacion.ver", "configuracion.editar"],
  ADMINISTRACION: ["usuarios.ver", "usuarios.invitar", "usuarios.administrar", "estudiantes.ver", "cursos.ver", "cursos.crear", "cursos.editar", "cursos.aprobar", "categorias.ver", "categorias.gestionar", "asignaciones.crear", "rutas.administrar", "certificados.ver", "certificados.preparar", "certificados.emitir", "sesiones.gestionar", "equipos.administrar", "estructura.administrar", "perfiles.administrar", "reportes.ver", "reportes.exportar", "licencias.ver", "configuracion.editar"],
  FIRMAS: ["certificados.ver", "certificados.firmar", "certificados.verificar"],
  GESTION: ["cursos.ver", "cursos.aprobar", "categorias.ver", "categorias.gestionar", "asignaciones.crear", "certificados.ver", "certificados.preparar", "reportes.ver"],
  SUPERVISION: ["estudiantes.ver", "asignaciones.ver", "reportes.ver"],
  DOCENCIA: ["cursos.ver", "cursos.crear", "estudiantes.ver", "evaluaciones.calificar"],
  APRENDIZAJE: ["cursos.ver", "aprendizaje.consumir", "certificados.ver"],
  PERSONALIZADO: ["cursos.ver"],
};

export const PERMISOS_SUPER_ADMIN = [...new Set(MODULOS_ACCESO.flatMap((modulo) => modulo.permisos))];

export function modulosDePermisos(permisos: readonly string[], portal: ModuloAcceso["portal"] = "organizacion") {
  const asignados = new Set(permisos);
  return MODULOS_ACCESO.filter(
    (modulo) => modulo.portal === portal && modulo.permisos.some((permiso) => asignados.has(permiso)),
  );
}
