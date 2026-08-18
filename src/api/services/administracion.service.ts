import { API } from "@/api/endpoints";
import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
import {
  certificadosOperacionAdmin,
  cursosRevisionAdministracion,
  eventosAuditoria,
  facturasAdministracion,
  ordenesMarketplaceAdmin,
  organizacionesAdministracion,
  planesAdministracion,
  resumenEcosistemaAdmin,
  sesionesGlobalesAdmin,
  usuariosAdministracion,
} from "@/administracion-tukuy/data/administracion.mock";
import type { OrganizacionAdministrada } from "@/administracion-tukuy/data/administracion.mock";
import type { ModalidadCursoAdmin } from "@/administracion-tukuy/data/administracion.mock";
import type { EstadoRevisionCurso } from "@/administracion-tukuy/data/administracion.mock";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import type { CursoCatalogoPrincipal } from "@/lib/contrato-secundaria";
import { supabasePrincipal } from "@/lib/supabase";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";

export type UsuarioAdministrado = (typeof usuariosAdministracion)[number];
export type CursoAdministrado = (typeof cursosRevisionAdministracion)[number] & {
  cursoSecundarioRef?: string;
  estadoPublicacion?: string;
};
export type FacturaAdministrada = (typeof facturasAdministracion)[number];
export type PlanAdministrado = (typeof planesAdministracion)[number];
export type EventoAuditoria = (typeof eventosAuditoria)[number];
export type ResumenEcosistemaAdmin = typeof resumenEcosistemaAdmin;
export type CertificadoOperacionAdmin =
  (typeof certificadosOperacionAdmin)[number];
export type OrdenMarketplaceAdmin = (typeof ordenesMarketplaceAdmin)[number];
export type SesionGlobalAdmin = (typeof sesionesGlobalesAdmin)[number];

const organizaciones = crearRepositorioLocal({
  clave: "tukuy_demo_admin_organizaciones_v2",
  ruta: API.administracion.organizaciones,
  semilla: organizacionesAdministracion,
});

const usuarios = crearRepositorioLocal({
  clave: "tukuy_demo_admin_usuarios_v2",
  ruta: API.administracion.usuarios,
  semilla: usuariosAdministracion,
});

const cursosRepositorio = crearRepositorioLocal({
  clave: "tukuy_demo_admin_cursos_v2",
  ruta: API.administracion.cursos,
  semilla: cursosRevisionAdministracion,
});

function mapearEstadoCatalogo(estadoPublicacion: string): EstadoRevisionCurso {
  const valor = estadoPublicacion.toUpperCase();
  if (valor === "PUBLICADO" || valor === "APROBADO") return "APROBADO";
  if (valor === "RETIRADO" || valor === "OBSERVADO") return "OBSERVADO";
  return "EN_REVISION";
}

function mapearModalidadCatalogo(modalidad: string): ModalidadCursoAdmin {
  const valor = modalidad.toUpperCase();
  if (valor === "EN_VIVO" || valor === "PRESENCIAL") return "EN_VIVO";
  if (valor === "HIBRIDA" || valor === "HIBRIDO") return "HIBRIDA";
  if (valor === "MIXTO") return "MIXTO";
  return "VIRTUAL";
}

function mapearCursoCatalogo(item: CursoCatalogoPrincipal): CursoAdministrado {
  const historicos = item.datosHistoricos ?? {};
  const minutos = item.duracionMinutos ?? 60;
  const horas = Math.max(1, Math.round(minutos / 60));
  return {
    id: item.id,
    titulo: item.titulo,
    docente: String(historicos.docente ?? historicos.autorNombre ?? "—"),
    organizacion: "Tukuy Academy",
    organizacionId: item.instalacionId,
    categoria: String(historicos.categoria ?? "Catálogo"),
    enviado: (item.publicadoEn ?? item.creadoEn ?? "").slice(0, 10),
    lecciones: Number(historicos.totalModulos ?? historicos.lecciones ?? 0),
    duracion: `${horas} h`,
    version: String(item.versionPublicada),
    modalidad: mapearModalidadCatalogo(item.modalidad),
    precio: Number(historicos.precio ?? 0),
    certificado: true,
    estado: mapearEstadoCatalogo(item.estadoPublicacion),
    cursoSecundarioRef: item.cursoSecundarioRef,
    estadoPublicacion: item.estadoPublicacion,
  };
}

const cursos = {
  ...cursosRepositorio,
  async listar(): Promise<CursoAdministrado[]> {
    if (apiConfig.secundariaCursos) {
      const { data, error } = await supabasePrincipal().rpc(
        "admin_listar_cursos_catalogo" as never,
        { p_instalacion_id: INSTALACION_TUKUY_ACADEMY_ID } as never,
      );
      if (error) throw new Error(error.message);
      const cursosCatalogo = ((data as { cursos?: CursoCatalogoPrincipal[] } | null)
        ?.cursos ?? []) as CursoCatalogoPrincipal[];
      return cursosCatalogo.map(mapearCursoCatalogo);
    }
    return cursosRepositorio.listar();
  },
  async actualizar(id: string, cambios: Partial<CursoAdministrado>) {
    if (apiConfig.secundariaCursos) {
      const lista = await this.listar();
      const actual = lista.find((curso) => curso.id === id);
      if (!actual?.cursoSecundarioRef) {
        throw new Error("El curso de catálogo no tiene referencia secundaria");
      }
      if (cambios.estado === "APROBADO") {
        await secundariaGatewayService.publicarCurso({
          cursoId: actual.cursoSecundarioRef,
          estadoPublicacion: "PUBLICADO",
        });
      }
      const refresco = await this.listar();
      return refresco.find((curso) => curso.id === id) ?? {
        ...actual,
        ...cambios,
      };
    }
    return cursosRepositorio.actualizar(id, cambios);
  },
};

const planes = crearRepositorioLocal({
  clave: "tukuy_demo_admin_planes",
  ruta: API.administracion.planes,
  semilla: planesAdministracion,
});

const facturas = crearRepositorioLocal({
  clave: "tukuy_demo_admin_facturas",
  ruta: API.administracion.facturas,
  semilla: facturasAdministracion,
});

const auditoria = crearRepositorioLocal({
  clave: "tukuy_demo_admin_auditoria_v2",
  ruta: API.administracion.auditoria,
  semilla: eventosAuditoria,
});

export interface ResponsableInicialOrganizacion {
  nombre: string;
  correo: string;
}

export interface AltaOrganizacion {
  organizacion: OrganizacionAdministrada;
  direccion: ResponsableInicialOrganizacion;
  administracion: ResponsableInicialOrganizacion;
}

interface InvitacionInicialOrganizacion {
  id: string;
  organizacionId: string;
  organizacionNombre: string;
  nombre: string;
  correo: string;
  perfil: "DIRECCION" | "ADMINISTRACION";
  contrasenaTemporal: string;
  debeCambiarContrasena: true;
  estadoCorreo: "ENVIADO";
  enviadoEn: string;
}

const invitacionesIniciales = crearRepositorioLocal<InvitacionInicialOrganizacion>({
  clave: "tukuy_demo_admin_invitaciones_iniciales",
  ruta: `${API.administracion.organizaciones}/invitaciones-iniciales`,
  semilla: [],
});

function generarContrasenaTemporal() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const valores = new Uint32Array(14);
  crypto.getRandomValues(valores);
  return Array.from(valores, (valor) => caracteres[valor % caracteres.length]).join("");
}

async function registrarOrganizacionConResponsables(alta: AltaOrganizacion) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<{
      organizacion: OrganizacionAdministrada;
      invitacionesEnviadas: number;
    }>(API.administracion.organizaciones, alta);
    return data;
  }

  const [organizacionesActuales, usuariosActuales] = await Promise.all([
    organizaciones.listar(),
    usuarios.listar(),
  ]);
  if (organizacionesActuales.some((item) => item.ruc === alta.organizacion.ruc)) {
    throw new Error("Ya existe una organización registrada con este RUC.");
  }
  const correosNuevos = [alta.direccion.correo, alta.administracion.correo].map(
    (correo) => correo.trim().toLowerCase(),
  );
  if (new Set(correosNuevos).size !== 2) {
    throw new Error("Dirección y Administración deben tener correos diferentes.");
  }
  if (
    usuariosActuales.some((usuario) =>
      correosNuevos.includes(usuario.correo.trim().toLowerCase()),
    )
  ) {
    throw new Error("Uno de los correos ya pertenece a una cuenta registrada.");
  }

  const organizacionCreada = await organizaciones.crear(alta.organizacion);
  const ahora = new Date().toISOString();
  const responsables = [
    { ...alta.direccion, perfil: "DIRECCION" as const },
    { ...alta.administracion, perfil: "ADMINISTRACION" as const },
  ];

  await Promise.all(
    responsables.flatMap((responsable, indice) => [
      usuarios.crear({
        id: `usr-${alta.organizacion.id}-${indice + 1}`,
        nombre: responsable.nombre,
        correo: responsable.correo,
        organizacion: alta.organizacion.nombre,
        perfiles: [
          responsable.perfil === "DIRECCION"
            ? "Dirección"
            : "Administración de organización",
        ],
        ultimoAcceso: "Invitación enviada",
        estado: "INVITADO",
      }),
      invitacionesIniciales.crear({
        id: `inv-${alta.organizacion.id}-${responsable.perfil.toLowerCase()}`,
        organizacionId: alta.organizacion.id,
        organizacionNombre: alta.organizacion.nombre,
        nombre: responsable.nombre,
        correo: responsable.correo,
        perfil: responsable.perfil,
        contrasenaTemporal: generarContrasenaTemporal(),
        debeCambiarContrasena: true,
        estadoCorreo: "ENVIADO",
        enviadoEn: ahora,
      }),
    ]),
  );

  return { organizacion: organizacionCreada, invitacionesEnviadas: 2 };
}

const configuracionLocal = crearAlmacenDocumento("tukuy_demo_admin_config", {
  nombre: "Tukuy Academy",
  correoSoporte: "soporte@tukuy.pe",
  moneda: "PEN",
  zonaHoraria: "America/Lima",
  revisionObligatoria: true,
  suspenderAlVencer: true,
  avisosVencimiento: true,
  avisosCursos: true,
  dobleFactor: true,
});

const certificados = crearRepositorioLocal({
  clave: "tukuy_demo_admin_certificados",
  ruta: API.administracion.certificados,
  semilla: certificadosOperacionAdmin,
});

const ordenesMarketplace = crearRepositorioLocal({
  clave: "tukuy_demo_admin_ordenes_marketplace",
  ruta: API.administracion.ordenesMarketplace,
  semilla: ordenesMarketplaceAdmin,
});

const sesiones = crearRepositorioLocal({
  clave: "tukuy_demo_admin_sesiones",
  ruta: API.administracion.sesiones,
  semilla: sesionesGlobalesAdmin,
});

export const administracionService = {
  organizaciones,
  usuarios,
  cursos,
  planes,
  facturas,
  auditoria,
  invitacionesIniciales,
  certificados,
  ordenesMarketplace,
  sesiones,

  registrarOrganizacionConResponsables,

  async publicarCursoSecundario(
    cursoSecundarioId: string,
    estadoPublicacion: "PUBLICADO" | "EN_REVISION" = "PUBLICADO",
  ) {
    return secundariaGatewayService.publicarCurso({
      cursoId: cursoSecundarioId,
      estadoPublicacion,
    });
  },

  async sincronizarCatalogoDesdeSecundaria() {
    const listado = await secundariaGatewayService.listarCursos();
    const existentes = await this.cursos.listar();
    const refs = new Set(
      existentes
        .map((curso) => curso.cursoSecundarioRef)
        .filter((ref): ref is string => Boolean(ref)),
    );
    const resultados = [];
    for (const curso of listado.cursos) {
      if (refs.has(curso.id)) continue;
      const estado =
        curso.estado.toUpperCase() === "PUBLICADO"
          ? "PUBLICADO"
          : "EN_REVISION";
      resultados.push(
        await this.publicarCursoSecundario(curso.id, estado),
      );
    }
    return {
      totalSecundaria: listado.total,
      publicadosAhora: resultados.length,
      catalogo: await this.cursos.listar(),
    };
  },

  async obtenerConfiguracion() {
    if (apiConfig.useMock) return configuracionLocal.leer();
    const { data } = await api.get(API.administracion.configuracion);
    return data as ReturnType<typeof configuracionLocal.leer>;
  },

  async guardarConfiguracion(
    configuracion: ReturnType<typeof configuracionLocal.leer>,
  ) {
    if (apiConfig.useMock) return configuracionLocal.guardar(configuracion);
    const { data } = await api.put(
      API.administracion.configuracion,
      configuracion,
    );
    return data as ReturnType<typeof configuracionLocal.leer>;
  },

  async obtenerResumenEcosistema() {
    const snap = await (
      await import("@/api/services/ecosistema-admin.service")
    ).obtenerSnapshotEcosistemaAdmin();
    // Compat: ya no devolvemos KPIs inventados de bolsa/comunidad.
    return {
      sesionesEnVivo: {
        programadas: 0,
        hoy: 0,
        enVivo: 0,
        finalizadasMes: 0,
        organizacionesConCalendario: 0,
      },
      certificados: {
        emitidosMes: 0,
        verificacionesPublicas: 0,
        pendientesEmision: 0,
        revocados: 0,
      },
      marketplace: {
        ordenesMes: 0,
        ingresosCursosPen: 0,
        carritosAbiertos: 0,
        pagosIzipayOk: 0,
        pagosIzipayFallidos: 0,
      },
      comunidadBolsa: {
        publicacionesReportadas: 0,
        vacantesActivas: 0,
        postulacionesMes: 0,
        entidadesPublicas: 0,
      },
      _snapshot: snap,
    } as ResumenEcosistemaAdmin & { _snapshot?: unknown };
  },

  async obtenerPanel() {
    const [
      listaOrganizaciones,
      listaUsuarios,
      listaCursos,
      listaFacturas,
      ecosistema,
    ] = await Promise.all([
      organizaciones.listar(),
      usuarios.listar(),
      cursos.listar(),
      facturas.listar(),
      this.obtenerResumenEcosistema(),
    ]);

    return {
      organizaciones: listaOrganizaciones,
      usuarios: listaUsuarios,
      cursos: listaCursos,
      facturas: listaFacturas,
      ecosistema,
    };
  },

  async obtenerOperacionEcosistema() {
    const snap = await (
      await import("@/api/services/ecosistema-admin.service")
    ).obtenerSnapshotEcosistemaAdmin();
    return {
      resumen: await this.obtenerResumenEcosistema(),
      certificados: [] as CertificadoOperacionAdmin[],
      ordenes: [] as OrdenMarketplaceAdmin[],
      sesiones: [] as SesionGlobalAdmin[],
      snapshot: snap,
    };
  },
};
