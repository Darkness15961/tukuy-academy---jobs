import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { user as userMock } from "@/data/academia.mock";
import {
  INSTALACION_TUKUY_ACADEMY_ID,
  USUARIO_SESION_KEY,
  USUARIOS_REGISTRADOS_KEY,
} from "@/lib/constants";
import { env } from "@/lib/env";
import { inicialesNombre, urlFotoPerfilReal } from "@/lib/foto-perfil";
import { invalidarCacheMedia } from "@/lib/storage-academia";
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

  return {
    name: nombre,
    initials: inicialesNombre(nombre),
    avatarUrl: urlFotoPerfilReal(
      textoMetadata(metadata, "avatar_url", "picture"),
    ),
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
  // Garantiza portal estudiante en Tukuy Academy (idempotente en principal).
  const { error: errorAlumno } = await supabasePrincipal().rpc(
    "asegurar_mi_acceso_alumno_tukuy",
  );
  if (errorAlumno) {
    console.warn(
      "No se pudo asegurar el acceso de alumno en Tukuy Academy:",
      errorAlumno.message,
    );
  }

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
          logo:
            contexto.instalacion_organizacion_ref === INSTALACION_TUKUY_ACADEMY_ID
              ? "/img/iconoTukuyAcademy.png"
              : undefined,
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

  // Sincroniza el acceso en la secundaria de cada organización del usuario.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const instalaciones = [
    ...new Set(
      memberships
        .map((membresia) => membresia.organizacion?.id ?? "")
        .filter((id) => UUID_RE.test(id)),
    ),
  ];
  const esAdminPlataforma = memberships.some((membresia) => {
    if ("rol" in membresia) {
      return membresia.portal === "admin" || membresia.rol === "SUPER_ADMIN";
    }
    return membresia.roles.some(
      (funcion) => funcion.portal === "admin" || funcion.codigo === "SUPER_ADMIN",
    );
  });
  if (esAdminPlataforma && !instalaciones.includes(INSTALACION_TUKUY_ACADEMY_ID)) {
    instalaciones.push(INSTALACION_TUKUY_ACADEMY_ID);
  }

  const SYNC_TTL_MS = 5 * 60_000;
  for (const instalacionId of instalaciones) {
    const syncKey = `tukuy_sync_secundaria_at_${instalacionId}`;
    const ultima = Number(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(syncKey) || 0
        : 0,
    );
    if (Date.now() - ultima < SYNC_TTL_MS) continue;
    try {
      localStorage.setItem(syncKey, String(Date.now()));
    } catch {
      // ignore quota / private mode
    }
    void supabasePrincipal()
      .functions.invoke("secondary-gateway", {
        body: { action: "sync-access", instalacionId },
      })
      .then(({ error }) => {
        if (error) {
          console.warn(
            `No se pudo sincronizar el acceso secundario (${instalacionId}):`,
            error.message,
          );
        }
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

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esCorreoValido(correo: string) {
  return CORREO_VALIDO.test(correo);
}

function validarCredencialesLogin(correoRaw: string, password: string) {
  const correo = normalizarCorreo(correoRaw);
  if (!correo || !password.trim()) {
    throw new Error("Ingresa tu correo y clave");
  }
  if (!esCorreoValido(correo)) {
    throw new Error("Ingresa un correo válido (ejemplo: nombre@empresa.com)");
  }
  return { correo, password };
}

/** Traduce mensajes frecuentes de Supabase Auth al español. */
function mensajeAuthSupabase(mensaje: string): string {
  const texto = mensaje.trim();
  const lower = texto.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "Correo o clave incorrectos";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  }
  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo";
  }
  if (lower.includes("password should be at least")) {
    return "La clave debe tener al menos 6 caracteres";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("email rate limit")
  ) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }
  if (lower.includes("signup is disabled")) {
    return "El registro está deshabilitado. Contacta al administrador.";
  }
  if (
    lower.includes("unable to validate email") ||
    lower.includes("invalid email")
  ) {
    return "Ingresa un correo válido";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "No se pudo conectar con el servidor de autenticación. Revisa tu conexión.";
  }
  return texto;
}

function errorAuthSupabase(error: { message?: string } | null | undefined): Error {
  return new Error(
    mensajeAuthSupabase(error?.message || "No se pudo completar la autenticación"),
  );
}

async function esperarSesionSupabase(intentos = 8, esperaMs = 150) {
  const cliente = supabasePrincipal();

  for (let i = 0; i < intentos; i += 1) {
    const { data, error } = await cliente.auth.getSession();
    if (error) throw errorAuthSupabase(error);
    if (data.session) return data.session;

    // Solo canjea si aún no hay sesión (evita doble exchange con detectSessionInUrl).
    if (i === 0) {
      const codigo = new URL(window.location.href).searchParams.get("code");
      if (codigo) {
        const { data: canje, error: errorCanje } =
          await cliente.auth.exchangeCodeForSession(codigo);
        if (errorCanje) throw errorAuthSupabase(errorCanje);
        if (canje.session) return canje.session;
      }
    }

    await new Promise((r) => setTimeout(r, esperaMs));
  }

  throw new Error(
    "No se encontró una sesión activa. Vuelve a iniciar sesión.",
  );
}

function validarRegistro(datos: RegistroRequestDto) {
  const nombre = datos.nombre.trim();
  const apellidos = datos.apellidos.trim();
  const correo = normalizarCorreo(datos.correo);
  const password = datos.password;

  if (!nombre || !apellidos) {
    throw new Error("Ingresa tu nombre y apellidos");
  }
  if (!correo || !esCorreoValido(correo)) {
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
    const { correo, password } = validarCredencialesLogin(
      credentials.dni,
      credentials.password,
    );

    if (usarAuthMock()) {
      const cuenta = leerUsuariosRegistrados().find(
        (item) =>
          normalizarCorreo(item.correo) === correo &&
          item.password === password,
      );

      if (!cuenta) {
        throw new Error("Correo o clave incorrectos");
      }

      return resolveMock(respuestaSesion(cuenta));
    }

    if (env.authProvider === "supabase") {
      const { data, error } = await supabasePrincipal().auth.signInWithPassword({
        email: correo,
        password,
      });
      if (error) throw errorAuthSupabase(error);
      if (!data.session) {
        throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
      try {
        return await respuestaDesdeSesionSupabase(data.session);
      } catch (err) {
        const detalle =
          err instanceof Error ? err.message : "Error al cargar tus accesos";
        throw new Error(
          `Sesión iniciada, pero no se pudieron cargar tus perfiles: ${detalle}`,
        );
      }
    }

    const { data } = await api.post<RespuestaAuthApi>(API.auth.login, {
      correo,
      password,
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
      if (error) throw errorAuthSupabase(error);
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

  async solicitarRecuperacionClave(correoRaw: string): Promise<void> {
    const correo = normalizarCorreo(correoRaw);
    if (!correo || !esCorreoValido(correo)) {
      throw new Error("Ingresa un correo válido para recuperar tu clave");
    }

    if (usarAuthMock()) {
      const existe = leerUsuariosRegistrados().some(
        (item) => normalizarCorreo(item.correo) === correo,
      );
      if (!existe) {
        throw new Error("No hay una cuenta registrada con ese correo");
      }
      return;
    }

    if (env.authProvider !== "supabase") {
      throw new Error(
        "La recuperación de clave solo está disponible con Supabase Auth",
      );
    }

    const redirectTo = `${env.appUrl.replace(/\/$/, "")}/auth/callback`;
    const { error } = await supabasePrincipal().auth.resetPasswordForEmail(
      correo,
      { redirectTo },
    );
    if (error) throw errorAuthSupabase(error);
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
      if (error) throw errorAuthSupabase(error);
      return null;
    }

    const { data } = await api.post<LoginResponseDto>(API.auth.google);
    return data;
  },

  async logout(): Promise<void> {
    try {
      invalidarCacheMedia();
    } catch {
      /* ignore */
    }
    if (usarAuthMock()) return;
    if (env.authProvider === "supabase") {
      const { error } = await supabasePrincipal().auth.signOut();
      if (error) throw errorAuthSupabase(error);
      return;
    }
    await api.post(API.auth.logout);
  },

  async sesionActual(): Promise<LoginResponseDto> {
    if (env.authProvider !== "supabase") {
      throw new Error("La recuperación OAuth solo está disponible con Supabase Auth");
    }
    const sesion = await esperarSesionSupabase();
    try {
      return await respuestaDesdeSesionSupabase(sesion);
    } catch (err) {
      const detalle =
        err instanceof Error ? err.message : "Error al cargar tus accesos";
      throw new Error(
        `Sesión iniciada, pero no se pudieron cargar tus perfiles: ${detalle}`,
      );
    }
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
      if (error) throw errorAuthSupabase(error);
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

  /** Recarga membresías/permisos desde obtener_mis_contextos (post sync perfiles). */
  async refrescarMembresias(): Promise<MembresiaEntrada[]> {
    if (env.authProvider !== "supabase") return [];
    return membresiasDesdeSupabase();
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
