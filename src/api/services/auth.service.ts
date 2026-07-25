import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { user as userMock } from "@/data/academia.mock";
import { membresiasMock } from "@/data/contextos-sesion.mock";
import { USUARIO_SESION_KEY, USUARIOS_REGISTRADOS_KEY } from "@/lib/constants";
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegistroRequestDto,
  UserProfileDto,
  UsuarioRegistradoDto,
} from "@/types/api";
import type { MembresiaOrganizacion } from "@/types/membresia.types";

const MOCK_USER = "admin";
const MOCK_PASS = "123456";

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

      if (username === MOCK_USER && password === MOCK_PASS) {
        return resolveMock({
          token: "mock-token",
          user: userMock,
          memberships: membresiasMock,
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

    const { data } = await api.post<LoginResponseDto>(
      API.auth.login,
      credentials,
    );
    return data;
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

      if (validados.correo === "admin@tukuy.pe") {
        throw new Error("Ese correo está reservado para la demo");
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

    const { data } = await api.post<LoginResponseDto>(API.auth.registro, datos);
    return data;
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
    const { data } = await api.get<UserProfileDto>(API.auth.me);
    return data;
  },
};
