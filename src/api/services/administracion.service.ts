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
