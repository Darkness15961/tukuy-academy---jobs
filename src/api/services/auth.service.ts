import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { user as userMock } from "@/data/academia.mock";
import {
  buscarCuentaDemo,
  CUENTAS_DEMO,
} from "@/data/cuentas-demo.mock";
import { USUARIO_SESION_KEY, USUARIOS_REGISTRADOS_KEY } from "@/lib/constants";
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegistroRequestDto,
  SesionApiDto,
  UserProfileDto,
  UsuarioApiDto,
  UsuarioRegistradoDto,
} from "@/types/api";
import type { MembresiaOrganizacion } from "@/types/membresia.types";

type RespuestaAuthApi = {
  token: string;
  user?: UsuarioApiDto;
  usuario?: UsuarioApiDto;
  memberships?: LoginResponseDto["memberships"];
  membresias?: LoginResponseDto["memberships"];
};

function perfilDesdeApi(usuario: UsuarioApiDto): UserProfileDto {
  return {
    name: `${usuario.nombres} ${usuario.apellidos}`.trim(),
    initials: inicialesDe(usuario.nombres, usuario.apellidos),
    trade: "Usuario Tukuy",
    specialty: "Perfil en construcción",
    location: "Perú",
    profileProgress: 28,
    employabilityScore: 40,
    certificates: 0,
    applications: 0,
  };
}

function normalizarRespuestaAuth(respuesta: RespuestaAuthApi): LoginResponseDto {
  const usuario = respuesta.user ?? respuesta.usuario;
  if (!respuesta.token || !usuario) {
    throw new Error("La respuesta de autenticación no contiene token y usuario");
  }
  return {
    token: respuesta.token,
    user: perfilDesdeApi(usuario),
    memberships: respuesta.memberships ?? respuesta.membresias,
  };
}

const PERMISOS_ESTUDIANTE_PERSONAL = [
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
] as const;

function leerUsuariosRegistrados(): UsuarioRegistradoDto[] {
  const raw = localStorage.getItem(USUARIOS_REGISTRADOS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UsuarioRegistradoDto[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(USUARIOS_REGISTRADOS_KEY);
    return [];
  }
}

function guardarUsuariosRegistrados(usuarios: UsuarioRegistradoDto[]) {
  localStorage.setItem(USUARIOS_REGISTRADOS_KEY, JSON.stringify(usuarios));
}

function inicialesDe(nombre: string, apellidos: string) {
  const a = nombre.trim().charAt(0);
  const b = apellidos.trim().charAt(0) || nombre.trim().charAt(1) || "";
  return `${a}${b}`.toUpperCase() || "TU";
}

function perfilDesdeRegistro(cuenta: UsuarioRegistradoDto): UserProfileDto {
  return {
    name: `${cuenta.nombre} ${cuenta.apellidos}`.trim(),
    initials: inicialesDe(cuenta.nombre, cuenta.apellidos),
    trade: "Estudiante Tukuy",
    specialty: "Perfil en construcción",
    location: "Perú",
    profileProgress: 28,
    employabilityScore: 40,
    certificates: 0,
    applications: 0,
  };
}

function membresiaPersonal(usuarioId: string): MembresiaOrganizacion[] {
  return [
    {
      id: `mem-personal-${usuarioId}`,
      usuarioId,
      organizacion: {
        id: `org-personal-${usuarioId}`,
        nombre: "Tukuy Personal",
        tipo: "PERSONAL",
        estado: "ACTIVA",
      },
      rol: "STUDENT",
      permisos: [...PERMISOS_ESTUDIANTE_PERSONAL],
      estado: "ACTIVA",
      portal: "estudiante",
      alcance: { tipo: "PROPIO" },
    },
  ];
}

function respuestaSesion(
  cuenta: UsuarioRegistradoDto,
): LoginResponseDto {
  return {
    token: `mock-token-${cuenta.id}`,
    user: perfilDesdeRegistro(cuenta),
    memberships: membresiaPersonal(cuenta.id),
  };
}

function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

function validarRegistro(datos: RegistroRequestDto) {
  const nombre = datos.nombre.trim();
  const apellidos = datos.apellidos.trim();
  const correo = normalizarCorreo(datos.correo);
  const password = datos.password;

  if (!nombre || !apellidos) {
    throw new Error("Ingresa tu nombre y apellidos");
  }
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error("Ingresa un correo válido");
  }
  if (password.length < 6) {
    throw new Error("La clave debe tener al menos 6 caracteres");
  }

  return { nombre, apellidos, correo, password };
}

export const authService = {
  listarUsuariosRegistrados: leerUsuariosRegistrados,

  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    if (apiConfig.useMock) {
      const username = credentials.dni.trim();
      const password = credentials.password.trim();

      if (!username || !password) {
        throw new Error("Ingresa tu correo y clave");
      }

      const cuentaDemo = buscarCuentaDemo(username, password);
      if (cuentaDemo) {
        return resolveMock({
          token: `mock-token-${cuentaDemo.alias}`,
          user: cuentaDemo.perfil,
          memberships: cuentaDemo.membresias,
        });
      }

      const cuenta = leerUsuariosRegistrados().find(
        (item) =>
          normalizarCorreo(item.correo) === normalizarCorreo(username) &&
          item.password === password,
      );

      if (!cuenta) {
        throw new Error("Correo o clave incorrectos");
      }

      return resolveMock(respuestaSesion(cuenta));
    }

    const { data } = await api.post<RespuestaAuthApi>(API.auth.login, {
      correo: credentials.dni.trim().toLowerCase(),
      password: credentials.password,
    });
    return normalizarRespuestaAuth(data);
  },

  async registrar(datos: RegistroRequestDto): Promise<LoginResponseDto> {
    if (apiConfig.useMock) {
      const validados = validarRegistro(datos);
      const existentes = leerUsuariosRegistrados();

      if (
        existentes.some(
          (item) => normalizarCorreo(item.correo) === validados.correo,
        )
      ) {
        throw new Error("Ya existe una cuenta con ese correo");
      }

      if (
        CUENTAS_DEMO.some(
          (cuenta) => normalizarCorreo(cuenta.correo) === validados.correo,
        )
      ) {
        throw new Error("Ese correo está reservado para una cuenta demo");
      }

      const cuenta: UsuarioRegistradoDto = {
        id: `usr-reg-${crypto.randomUUID().slice(0, 8)}`,
        correo: validados.correo,
        password: validados.password,
        nombre: validados.nombre,
        apellidos: validados.apellidos,
        telefono: datos.telefono?.trim() || undefined,
        proveedor: "email",
        creadoEn: new Date().toISOString(),
      };

      guardarUsuariosRegistrados([...existentes, cuenta]);
      return resolveMock(respuestaSesion(cuenta));
    }

    const { data } = await api.post<RespuestaAuthApi>(API.auth.registro, {
      correo: datos.correo.trim().toLowerCase(),
      nombres: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      password: datos.password,
      password_confirmation: datos.password,
    });
    return normalizarRespuestaAuth(data);
  },

  async loginConGoogle(): Promise<LoginResponseDto> {
    if (apiConfig.useMock) {
      await new Promise((r) => setTimeout(r, 700));

      const correoGoogle = "nuevo.usuario@gmail.com";
      const existentes = leerUsuariosRegistrados();
      let cuenta = existentes.find(
        (item) => normalizarCorreo(item.correo) === correoGoogle,
      );

      if (!cuenta) {
        cuenta = {
          id: `usr-google-${crypto.randomUUID().slice(0, 8)}`,
          correo: correoGoogle,
          password: `google-${crypto.randomUUID().slice(0, 10)}`,
          nombre: "Nuevo",
          apellidos: "Usuario Google",
          proveedor: "google",
          creadoEn: new Date().toISOString(),
        };
        guardarUsuariosRegistrados([...existentes, cuenta]);
      }

      return resolveMock(respuestaSesion(cuenta));
    }

    const { data } = await api.post<LoginResponseDto>(API.auth.google);
    return data;
  },

  async logout(): Promise<void> {
    if (apiConfig.useMock) return;
    await api.post(API.auth.logout);
  },

  async me(): Promise<UserProfileDto> {
    if (apiConfig.useMock) {
      const guardado = localStorage.getItem(USUARIO_SESION_KEY);
      if (guardado) {
        try {
          return JSON.parse(guardado) as UserProfileDto;
        } catch {
          localStorage.removeItem(USUARIO_SESION_KEY);
        }
      }
      return resolveMock(userMock);
    }
    const { data } = await api.get<UsuarioApiDto | { user: UsuarioApiDto }>(
      API.auth.me,
    );
    return perfilDesdeApi("user" in data ? data.user : data);
  },

  async cambiarPassword(
    passwordActual: string,
    passwordNuevo: string,
  ): Promise<void> {
    await api.put(API.auth.password, {
      password_actual: passwordActual,
      password: passwordNuevo,
      password_confirmation: passwordNuevo,
    });
  },

  async listarSesiones(): Promise<SesionApiDto[]> {
    const { data } = await api.get<SesionApiDto[] | { data: SesionApiDto[] }>(
      API.auth.sessions,
    );
    return Array.isArray(data) ? data : data.data;
  },

  async revocarSesion(id: string): Promise<void> {
    await api.delete(API.auth.sessionById(id));
  },
};
