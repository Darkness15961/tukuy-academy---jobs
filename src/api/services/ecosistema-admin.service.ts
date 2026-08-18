import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { env } from "@/lib/env";
import { apiConfig } from "@/api/config";
import { administracionService } from "@/api/services/administracion.service";
import {
  provisionamientoPrincipalService,
  type SaludSecundaria,
} from "@/api/services/provisionamiento-principal.service";
import { operacionPrincipalService } from "@/api/services/operacion-principal.service";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";

export type EstadoModuloEcosistema =
  | "operativo"
  | "parcial"
  | "pendiente"
  | "desconectado";

export type ModuloEcosistemaAdmin = {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoModuloEcosistema;
  detalle: string;
  ruta?: string;
};

export type SnapshotEcosistemaAdmin = {
  generadoEn: string;
  flags: {
    secundariaCursos: boolean;
    useMock: boolean;
    pagoModo: string;
    authProvider: string;
  };
  academy: {
    instalacionId: string;
    salud: SaludSecundaria | null;
    errorSalud: string | null;
    catalogo: {
      total: number;
      publicados: number;
      enRevision: number;
      observados: number;
    };
    errorCatalogo: string | null;
    sincronizacion: {
      totalSecundaria: number | null;
      error: string | null;
    };
  };
  saas: {
    organizaciones: number;
    identidadesActivas: number;
    cursosPublicados: number;
    suscripcionesActivas: number;
    error: string | null;
  };
  modulos: ModuloEcosistemaAdmin[];
};

function estadoCatalogo(curso: {
  estado?: string;
  estadoPublicacion?: string;
}): "publicado" | "revision" | "observado" {
  const raw = String(curso.estadoPublicacion ?? curso.estado ?? "").toUpperCase();
  if (raw.includes("PUBLIC") || raw === "APROBADO") return "publicado";
  if (raw.includes("RETIR") || raw.includes("OBSERV")) return "observado";
  return "revision";
}

/**
 * Snapshot real del ecosistema para superadmin.
 * No inventa KPIs de bolsa/comunidad/marketplace B2C (aún sin backend admin).
 */
export async function obtenerSnapshotEcosistemaAdmin(): Promise<SnapshotEcosistemaAdmin> {
  const instalacionId = INSTALACION_TUKUY_ACADEMY_ID;
  const flags = {
    secundariaCursos: apiConfig.secundariaCursos,
    useMock: apiConfig.useMock,
    pagoModo: String(apiConfig.pagoModo),
    authProvider: env.authProvider,
  };

  let salud: SaludSecundaria | null = null;
  let errorSalud: string | null = null;
  let catalogo = { total: 0, publicados: 0, enRevision: 0, observados: 0 };
  let errorCatalogo: string | null = null;
  let sincronizacion: SnapshotEcosistemaAdmin["academy"]["sincronizacion"] = {
    totalSecundaria: null,
    error: null,
  };
  let saas: SnapshotEcosistemaAdmin["saas"] = {
    organizaciones: 0,
    identidadesActivas: 0,
    cursosPublicados: 0,
    suscripcionesActivas: 0,
    error: null,
  };

  if (flags.secundariaCursos) {
    try {
      salud = await provisionamientoPrincipalService.verificar(instalacionId);
    } catch (err) {
      errorSalud =
        err instanceof Error ? err.message : "No se pudo verificar la secundaria";
    }

    try {
      const cursos = await administracionService.cursos.listar();
      catalogo = {
        total: cursos.length,
        publicados: cursos.filter((c) => estadoCatalogo(c) === "publicado")
          .length,
        enRevision: cursos.filter((c) => estadoCatalogo(c) === "revision")
          .length,
        observados: cursos.filter((c) => estadoCatalogo(c) === "observado")
          .length,
      };
    } catch (err) {
      errorCatalogo =
        err instanceof Error ? err.message : "No se pudo listar el catálogo";
    }

    try {
      const listado = await secundariaGatewayService.listarCursos();
      sincronizacion.totalSecundaria = listado.total ?? listado.cursos?.length ?? 0;
    } catch (err) {
      sincronizacion.error =
        err instanceof Error
          ? err.message
          : "No se pudo listar cursos en secundaria";
    }
  } else {
    errorSalud =
      "VITE_SECUNDARIA_CURSOS=false: Academy opera en modo demo / sin gateway.";
    errorCatalogo = errorSalud;
  }

  try {
    const panel = await operacionPrincipalService.panel();
    saas = {
      organizaciones: panel.organizaciones.total,
      identidadesActivas: panel.identidades.activas,
      cursosPublicados: panel.cursos.publicados,
      suscripcionesActivas: panel.suscripciones.activas,
      error: null,
    };
  } catch (err) {
    saas.error =
      err instanceof Error ? err.message : "No se pudo cargar el panel SaaS";
  }

  const secundariaOk = Boolean(salud?.ok) && !errorSalud;
  const catalogoOk = !errorCatalogo;

  const modulos: ModuloEcosistemaAdmin[] = [
    {
      id: "saas-principal",
      nombre: "SaaS principal",
      descripcion: "Organizaciones, identidades, planes, facturación B2B",
      estado: saas.error ? "desconectado" : "operativo",
      detalle: saas.error
        ? saas.error
        : `${saas.organizaciones} orgs · ${saas.identidadesActivas} identidades activas`,
      ruta: "/admin/inicio",
    },
    {
      id: "academy-secundaria",
      nombre: "Tukuy Academy (secundaria)",
      descripcion: "Cursos, matrículas, progreso, quizzes, entregas, sesiones",
      estado: !flags.secundariaCursos
        ? "pendiente"
        : secundariaOk
          ? "operativo"
          : "desconectado",
      detalle: !flags.secundariaCursos
        ? "Activa VITE_SECUNDARIA_CURSOS=true"
        : errorSalud
          ? errorSalud
          : `Esquema v${salud?.versionEsquema ?? "—"} · ${salud?.tablasPublicas ?? 0} tablas · sync ${salud?.accesosSincronizados ?? 0}`,
      ruta: "/admin/organizaciones",
    },
    {
      id: "catalogo",
      nombre: "Catálogo y revisión",
      descripcion: "curso_catalogo en principal + publicar-curso en gateway",
      estado: !flags.secundariaCursos
        ? "pendiente"
        : catalogoOk
          ? catalogo.enRevision > 0
            ? "parcial"
            : "operativo"
          : "desconectado",
      detalle: errorCatalogo
        ? errorCatalogo
        : `${catalogo.publicados} publicados · ${catalogo.enRevision} en revisión · ${catalogo.observados} observados`,
      ruta: "/admin/cursos",
    },
    {
      id: "pagos-b2c",
      nombre: "Pagos B2C (Izipay)",
      descripcion: "Carrito alumno · orden_compra · dankira / Token",
      estado:
        flags.pagoModo === "simulacion"
          ? "parcial"
          : flags.secundariaCursos
            ? "parcial"
            : "pendiente",
      detalle:
        flags.pagoModo === "simulacion"
          ? "Modo simulación (VITE_PAGO_MODO). Checkout real: dankira|sdk + Edge izipay-*."
          : `Modo ${flags.pagoModo}. No hay listado admin de órdenes aún (solo alumno/gateway).`,
      ruta: "/tukuy-academy/carrito",
    },
    {
      id: "certificados",
      nombre: "Certificados públicos",
      descripcion: "Emisión admin + índice principal + verificador",
      estado: flags.secundariaCursos ? "operativo" : "pendiente",
      detalle: flags.secundariaCursos
        ? "Superadmin puede emitir por matrícula en /admin/certificados"
        : "Activa secundaria para emitir",
      ruta: "/admin/certificados",
    },
    {
      id: "accesos",
      nombre: "Accesos y permisos",
      descripcion: "Funciones, perfiles y asignaciones en principal",
      estado: "operativo",
      detalle: "RPC admin_listar_accesos_* / actualizar acceso",
      ruta: "/admin/accesos",
    },
    {
      id: "comunidad",
      nombre: "Comunidad",
      descripcion: "Perfiles entidad, publicaciones, moderación",
      estado: "pendiente",
      detalle: "UI/mock local; sin panel de moderación real para superadmin.",
      ruta: "/comunidad",
    },
    {
      id: "bolsa",
      nombre: "Bolsa Tukuy",
      descripcion: "Vacantes y postulaciones",
      estado: "pendiente",
      detalle: "UI/mock; sin KPIs ni moderación en BD principal.",
      ruta: "/bolsa-tukuy",
    },
  ];

  return {
    generadoEn: new Date().toISOString(),
    flags,
    academy: {
      instalacionId,
      salud,
      errorSalud,
      catalogo,
      errorCatalogo,
      sincronizacion,
    },
    saas,
    modulos,
  };
}
