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
import { env } from "@/lib/env";
import { supabasePrincipal } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegistroRequestDto,
  SesionApiDto,
  UserProfileDto,
  UsuarioApiDto,
  UsuarioRegistradoDto,
} from "@/types/api";
import type {
  AlcanceMembresia,
  AmbitoDocencia,
  MembresiaEntrada,
  MembresiaOrganizacion,
  Rol,
  TipoPortal,
} from "@/types/membresia.types";

type RespuestaAuthApi = {
  token: string;
  user?: UsuarioApiDto;
  usuario?: UsuarioApiDto;
  memberships?: LoginResponseDto["memberships"];
  membresias?: LoginResponseDto["memberships"];
};

/** El mock de datos puede convivir con Supabase Auth durante la migración. */
function usarAuthMock() {
  return apiConfig.useMock && env.authProvider !== "supabase";
}

function textoMetadata(
  metadata: Record<string, unknown>,
  ...claves: string[]
): string {
  for (const clave of claves) {
    const valor = metadata[clave];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
  }
  return "";
}

function perfilDesdeSupabase(usuario: User): UserProfileDto {
  const metadata = usuario.user_metadata ?? {};
  const nombreCompleto = textoMetadata(metadata, "full_name", "name");
  const nombres = textoMetadata(metadata, "nombres", "first_name");
  const apellidos = textoMetadata(metadata, "apellidos", "last_name");
  const nombre =
    `${nombres} ${apellidos}`.trim() ||
    nombreCompleto ||
    usuario.email?.split("@")[0] ||
    "Usuario Tukuy";
  const partes = nombre.split(/\s+/).filter(Boolean);

  return {
    name: nombre,
    initials: `${partes[0]?.[0] ?? "T"}${partes[1]?.[0] ?? "U"}`.toUpperCase(),
    avatarUrl:
      textoMetadata(metadata, "avatar_url", "picture") || undefined,
    trade: "Usuario Tukuy",
    specialty: "Perfil en construcción",
    location: "Perú",
    profileProgress: 28,
    employabilityScore: 40,
    certificates: 0,
    applications: 0,
  };
}

type ContextoSupabase = {
  membresia_id: string;
  funcion_id: string;
  rol_id: string;
  usuario_id: string;
  instalacion_organizacion_ref: string | null;
  organizacion_nombre: string;
  rol_codigo: string;
  portal: string;
  permisos: string[] | null;
  alcance: AlcanceMembresia | null;
  ambito_docencia: string | null;
};

async function membresiasDesdeSupabase(): Promise<MembresiaEntrada[]> {
  const { data, error } = await supabasePrincipal().rpc(
    "obtener_mis_contextos",
  );
  if (error) throw new Error(error.message);

  return ((data ?? []) as ContextoSupabase[]).map((contexto) => ({
    id: contexto.funcion_id,
    membresiaOrigenId: contexto.membresia_id,
    rolId: contexto.rol_id,
    usuarioId: contexto.usuario_id,
    organizacion: contexto.instalacion_organizacion_ref
      ? {
          id: contexto.instalacion_organizacion_ref,
          nombre: contexto.organizacion_nombre,
          tipo: "EMPRESA" as const,
          estado: "ACTIVA" as const,
        }
      : null,
    rol: contexto.rol_codigo as Rol,
    permisos: contexto.permisos ?? [],
    alcance: contexto.alcance ?? undefined,
    estado: "ACTIVA" as const,
    portal: contexto.portal as TipoPortal,
    ambitoDocencia:
      (contexto.ambito_docencia as AmbitoDocencia | null) ?? undefined,
  }));
}

async function respuestaDesdeSesionSupabase(
  sesion: Session,
): Promise<LoginResponseDto> {
  const memberships = await membresiasDesdeSupabase();
  if (memberships.some((membresia) => membresia.organizacion?.id === "30000000-0000-4000-8000-000000000001")) {
    void supabasePrincipal().functions.invoke("secondary-gateway", {
      body: { action: "sync-access" },
    }).then(({ error }) => {
      if (error) console.warn("No se pudo sincronizar el acceso secundario:", error.message);
    });
  }
  return {
    token: sesion.access_token,
    user: perfilDesdeSupabase(sesion.user),
    memberships,
  };
}

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
    if (usarAuthMock()) {
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

    if (env.authProvider === "supabase") {
      const { data, error } = await supabasePrincipal().auth.signInWithPassword({
        email: credentials.dni.trim().toLowerCase(),
        password: credentials.password,
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error("Supabase no devolvió una sesión activa");
      return respuestaDesdeSesionSupabase(data.session);
    }

    const { data } = await api.post<RespuestaAuthApi>(API.auth.login, {
      correo: credentials.dni.trim().toLowerCase(),
      password: credentials.password,
    });
    return normalizarRespuestaAuth(data);
  },

  async registrar(datos: RegistroRequestDto): Promise<LoginResponseDto> {
    if (usarAuthMock()) {
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

    if (env.authProvider === "supabase") {
      const validados = validarRegistro(datos);
      const { data, error } = await supabasePrincipal().auth.signUp({
        email: validados.correo,
        password: validados.password,
        options: {
          data: {
            nombres: validados.nombre,
            apellidos: validados.apellidos,
            telefono: datos.telefono?.trim() || null,
            full_name: `${validados.nombre} ${validados.apellidos}`.trim(),
          },
          emailRedirectTo: `${env.appUrl.replace(/\/$/, "")}/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
      if (!data.session) {
        throw new Error(
          "Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.",
        );
      }
      return respuestaDesdeSesionSupabase(data.session);
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

  async loginConGoogle(destinoDespues?: string): Promise<LoginResponseDto | null> {
    if (usarAuthMock()) {
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

    if (env.authProvider === "supabase") {
      const callback = new URL("/auth/callback", env.appUrl);
      if (
        destinoDespues?.startsWith("/") &&
        !destinoDespues.startsWith("//")
      ) {
        callback.searchParams.set("continuar", destinoDespues);
      }
      const { error } = await supabasePrincipal().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (error) throw new Error(error.message);
      return null;
    }

    const { data } = await api.post<LoginResponseDto>(API.auth.google);
    return data;
  },

  async logout(): Promise<void> {
    if (usarAuthMock()) return;
    if (env.authProvider === "supabase") {
      const { error } = await supabasePrincipal().auth.signOut();
      if (error) throw new Error(error.message);
      return;
    }
    await api.post(API.auth.logout);
  },

  async sesionActual(): Promise<LoginResponseDto> {
    if (env.authProvider !== "supabase") {
      throw new Error("La recuperación OAuth solo está disponible con Supabase Auth");
    }
    const { data, error } = await supabasePrincipal().auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("No se encontró una sesión de Supabase");
    return respuestaDesdeSesionSupabase(data.session);
  },

  async me(): Promise<UserProfileDto> {
    if (usarAuthMock()) {
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
    if (env.authProvider === "supabase") {
      const { data, error } = await supabasePrincipal().auth.getUser();
      if (error) throw new Error(error.message);
      return perfilDesdeSupabase(data.user);
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
