import { API } from "@/api/endpoints";
import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
import {
  cursosRevisionAdministracion,
  eventosAuditoria,
  facturasAdministracion,
  organizacionesAdministracion,
  planesAdministracion,
  usuariosAdministracion,
} from "@/administracion-tukuy/data/administracion.mock";
import type { OrganizacionAdministrada } from "@/administracion-tukuy/data/administracion.mock";

export type UsuarioAdministrado = (typeof usuariosAdministracion)[number];
export type CursoAdministrado = (typeof cursosRevisionAdministracion)[number];
export type FacturaAdministrada = (typeof facturasAdministracion)[number];
export type PlanAdministrado = (typeof planesAdministracion)[number];
export type EventoAuditoria = (typeof eventosAuditoria)[number];

const organizaciones = crearRepositorioLocal({
  clave: "tukuy_demo_admin_organizaciones",
  ruta: API.administracion.organizaciones,
  semilla: organizacionesAdministracion,
});

const usuarios = crearRepositorioLocal({
  clave: "tukuy_demo_admin_usuarios",
  ruta: API.administracion.usuarios,
  semilla: usuariosAdministracion,
});

const cursos = crearRepositorioLocal({
  clave: "tukuy_demo_admin_cursos",
  ruta: API.administracion.cursos,
  semilla: cursosRevisionAdministracion,
});

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
  clave: "tukuy_demo_admin_auditoria",
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

export const administracionService = {
  organizaciones,
  usuarios,
  cursos,
  planes,
  facturas,
  auditoria,
  invitacionesIniciales,

  registrarOrganizacionConResponsables,

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

  async obtenerPanel() {
    const [listaOrganizaciones, listaUsuarios, listaCursos, listaFacturas] =
      await Promise.all([
        organizaciones.listar(),
        usuarios.listar(),
        cursos.listar(),
        facturas.listar(),
      ]);

    return {
      organizaciones: listaOrganizaciones,
      usuarios: listaUsuarios,
      cursos: listaCursos,
      facturas: listaFacturas,
    };
  },
};
