import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  cancelarEventoCalendar,
  crearEventoCalendarMeet,
  googleCalendarConfigurado,
} from "./google-calendar.ts";

const INSTALACION_TUKUY = "30000000-0000-4000-8000-000000000001";

const CANTIDAD_FIRMAS_CERT_MAX = 5;

/** Minutos reales del curso tipado (suma de actividades); fallback a horas de versión. */
function duracionMinutosDesdeCursoSec(
  cursoSec: Record<string, unknown> | null | undefined,
): number {
  const total = Number(cursoSec?.duracionMinutosTotal ?? 0);
  if (Number.isFinite(total) && total > 0) return Math.round(total);
  const versionActual =
    (cursoSec?.versionActual as Record<string, unknown> | null) ?? null;
  const horas = Number(versionActual?.horas ?? 0);
  if (Number.isFinite(horas) && horas > 0) {
    return Math.max(1, Math.round(horas * 60));
  }
  return 1;
}

async function sincronizarCatalogoRetirado(entrada: {
  principal: SupabaseClient;
  secundaria: SupabaseClient;
  instalacionId: string;
  cursoId: string;
  cursoSec?: Record<string, unknown> | null;
  permanente?: boolean;
  esSuperAdmin?: boolean;
}) {
  const {
    principal,
    secundaria,
    instalacionId,
    cursoId,
    permanente = false,
    esSuperAdmin = false,
  } = entrada;

  if (permanente) {
    const borrado = await principal.rpc(
      "org_eliminar_curso_catalogo_permanente",
      {
        p_instalacion_id: instalacionId,
        p_curso_secundario_ref: cursoId,
      },
    );
    if (borrado.error) {
      console.warn(
        "org_eliminar_curso_catalogo_permanente:",
        borrado.error.message,
      );
    }
    return;
  }

  let curso = entrada.cursoSec ?? null;
  if (!curso) {
    const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
      p_curso_id: cursoId,
    });
    if (detalle.data?.ok && detalle.data?.curso) {
      curso = detalle.data.curso as Record<string, unknown>;
    }
  }

  const oculto = await principal.rpc("org_ocultar_curso_catalogo", {
    p_instalacion_id: instalacionId,
    p_curso_secundario_ref: cursoId,
    p_datos_historicos: {
      origen: "ocultar_curso",
      titulo: curso?.titulo ?? null,
      ocultoEn: new Date().toISOString(),
    },
  });
  if (oculto.error) {
    console.warn("sincronizarCatalogoRetirado:", oculto.error.message);
  }
}

/** Docente → 1 firma; Administración → 1..5 + plantillaCertificadoId. */
function normalizarCertificadoDocumentoGateway(
  documento: Record<string, unknown>,
): Record<string, unknown> {
  const origen = String(documento.origenCarga ?? "DOCENTE")
    .trim()
    .toUpperCase();
  const esAdmin = origen === "ADMINISTRACION";
  const certificadoActivo = documento.certificado !== false;
  const plantillaCertificadoId = String(
    documento.plantillaCertificadoId ?? "",
  ).trim();

  const firmasRaw = Array.isArray(documento.firmasCertificado)
    ? (documento.firmasCertificado as Record<string, unknown>[])
    : [];

  const firmas = firmasRaw
    .map((f) => ({
      id: String(f.id ?? "").trim() || crypto.randomUUID(),
      personaId: f.personaId ? String(f.personaId) : undefined,
      nombre: String(f.nombre ?? "").trim(),
      cargo: String(f.cargo ?? "").trim(),
      tipo:
        String(f.tipo ?? "DIGITAL").toUpperCase() === "ELECTRONICA"
          ? "ELECTRONICA"
          : "DIGITAL",
      imagen: f.imagen ? String(f.imagen) : undefined,
      origen:
        String(f.origen ?? "").toUpperCase() === "PROPIA"
          ? "PROPIA"
          : "INSTITUCIONAL",
    }))
    .filter((f) => f.nombre);

  if (!certificadoActivo) {
    return {
      ...documento,
      plantillaCertificadoId,
      cantidadFirmas: 1,
      firmasCertificado: [],
    };
  }

  if (!esAdmin) {
    const propia = firmas.find((f) => f.origen === "PROPIA");
    return {
      ...documento,
      plantillaCertificadoId,
      cantidadFirmas: 1,
      firmasCertificado: propia
        ? [propia]
        : firmas.slice(0, 1).map((f) => ({ ...f, origen: "PROPIA" })),
    };
  }

  const nRaw = Number(documento.cantidadFirmas);
  const cantidadFirmas = Number.isFinite(nRaw)
    ? Math.min(CANTIDAD_FIRMAS_CERT_MAX, Math.max(1, Math.round(nRaw)))
    : 1;

  return {
    ...documento,
    plantillaCertificadoId,
    cantidadFirmas,
    firmasCertificado: firmas.slice(0, cantidadFirmas),
  };
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function idVideoYoutubeDesdeEnlace(entrada: string): string | null {
  const raw = String(entrada ?? "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const partes = url.pathname.split("/").filter(Boolean);
      if (
        (partes[0] === "embed" ||
          partes[0] === "shorts" ||
          partes[0] === "live" ||
          partes[0] === "v") &&
        partes[1] &&
        /^[\w-]{11}$/.test(partes[1])
      ) {
        return partes[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

function segundosDesdeIso8601Youtube(iso: string): number | null {
  const valor = String(iso ?? "").trim();
  if (!valor.startsWith("PT")) return null;
  const horas = valor.match(/(\d+)H/i)?.[1];
  const minutos = valor.match(/(\d+)M/i)?.[1];
  const segundos = valor.match(/(\d+)S/i)?.[1];
  const total =
    (horas ? Number(horas) * 3600 : 0) +
    (minutos ? Number(minutos) * 60 : 0) +
    (segundos ? Number(segundos) : 0);
  return total > 0 ? total : null;
}

async function consultarDuracionYoutubeApi(
  videoId: string,
): Promise<number | null> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY")?.trim();
  if (!apiKey) return null;
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("id", videoId);
  endpoint.searchParams.set("part", "contentDetails");
  endpoint.searchParams.set("key", apiKey);
  const respuesta = await fetch(endpoint.toString());
  if (!respuesta.ok) return null;
  const cuerpo = (await respuesta.json()) as {
    items?: Array<{ contentDetails?: { duration?: string } }>;
  };
  const iso = cuerpo.items?.[0]?.contentDetails?.duration;
  return iso ? segundosDesdeIso8601Youtube(iso) : null;
}

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const desdeSecret = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item: string) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const locales = [
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const permitidos = new Set([...desdeSecret, ...locales]);
  const originPermitido = permitidos.has(origin) ? origin : "";
  const requestedHeaders = req.headers.get("access-control-request-headers");

  return {
    ...(originPermitido
      ? { "access-control-allow-origin": originPermitido }
      : {}),
    "access-control-allow-headers":
      requestedHeaders ||
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/** Firmas + índice público tras emitir (manual o auto-cert 100%). */
async function postProcesarCertificadoEmitido(entrada: {
  secundaria: SupabaseClient;
  principal: SupabaseClient;
  instalacionId: string;
  emisorId: string;
  emisorNombre: string | null;
  cert: Record<string, unknown> | null | undefined;
}) {
  const cert = entrada.cert;
  const certificadoId =
    typeof cert?.certificadoId === "string" ? cert.certificadoId : "";
  const documentoId =
    typeof cert?.documentoId === "string" ? cert.documentoId : "";
  if (!certificadoId || !documentoId) {
    return null;
  }

  let firmas: unknown = null;
  let advertenciaFirmas: string | null = null;
  let listoParaIndice = true;

  const registro = await entrada.secundaria.rpc(
    "servicio_registrar_firmas_certificado",
    {
      p_certificado_id: certificadoId,
      p_documento_id: documentoId,
      p_emisor_identidad_ref: entrada.emisorId,
      p_emisor_nombre: entrada.emisorNombre,
    },
  );
  if (registro.error) {
    advertenciaFirmas =
      `Emitido, pero falta 20260810195000_firma_certificado.sql: ${registro.error.message}`;
  } else {
    firmas = registro.data;
    listoParaIndice = registro.data?.listoParaIndice === true;
  }

  let indicePublico: unknown = null;
  let advertenciaIndice: string | null = null;
  const codigo =
    typeof cert?.codigoVerificacion === "string"
      ? cert.codigoVerificacion
      : typeof cert?.codigo === "string"
        ? cert.codigo
        : "";
  if (listoParaIndice && codigo) {
    const indice = await entrada.principal.rpc(
      "admin_upsert_indice_certificado_publico",
      {
        p_instalacion_id: entrada.instalacionId,
        p_codigo_verificacion: codigo,
        p_certificado_secundario_ref: certificadoId,
        p_documento_secundario_ref: documentoId,
        p_huella_documento:
          typeof cert?.huellaDocumento === "string" ? cert.huellaDocumento : "",
        p_titular_historico:
          typeof cert?.titular === "string" ? cert.titular : "Titular",
        p_curso_historico:
          typeof cert?.curso === "string" ? cert.curso : "Curso",
        p_organizacion_historica:
          typeof cert?.organizacion === "string"
            ? cert.organizacion
            : "Tukuy Academy",
        p_emitido_en:
          typeof cert?.emitidoEn === "string"
            ? cert.emitidoEn
            : new Date().toISOString(),
        p_estado_publico: "VIGENTE",
      },
    );
    if (indice.error) {
      advertenciaIndice =
        `Certificado emitido en secundaria, pero falta índice en principal: ${indice.error.message}`;
    } else {
      indicePublico = indice.data;
    }
  }

  return {
    firmas,
    listoParaIndice,
    indicePublico,
    advertenciaFirmas,
    advertenciaIndice,
    requiereFirmaInstitucional: listoParaIndice !== true,
    certificadoId,
    documentoId,
  };
}

type Contexto = Record<string, unknown>;

function nombreSecreto(ref: string) {
  return ref
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function resolverConexionSecundaria(
  instalacionId: string,
  principalUrl: string,
  principalServiceRole: string | undefined,
): Promise<{ url: string; key: string } | { error: string }> {
  // Compatibilidad: la instalacion Tukuy puede seguir usando los secretos fijos.
  if (instalacionId === INSTALACION_TUKUY) {
    const url = Deno.env.get("SECONDARY_TUKUY_URL");
    const key = Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY");
    if (url && key) return { url, key };
  }

  if (!principalServiceRole) {
    return {
      error:
        "El gateway no tiene SUPABASE_SERVICE_ROLE_KEY para resolver conexiones dinamicas",
    };
  }

  const admin = createClient(principalUrl, principalServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: conexion, error } = await admin
    .from("conexion_organizacion")
    .select("servidor_ref, secreto_ref, estado")
    .eq("instalacion_organizacion_id", instalacionId)
    .maybeSingle();
  if (error) {
    return {
      error: `No se pudo leer la conexion de la organizacion: ${error.message}`,
    };
  }
  if (!conexion) {
    return {
      error: "La organizacion no tiene una conexion secundaria configurada",
    };
  }

  const ref = nombreSecreto(String(conexion.secreto_ref ?? ""));
  const key = ref
    ? Deno.env.get(`${ref}_SERVICE_ROLE_KEY`) ?? Deno.env.get(ref) ?? null
    : null;
  const url = (ref ? Deno.env.get(`${ref}_URL`) : null) ??
    (conexion.servidor_ref
      ? `https://${conexion.servidor_ref}.supabase.co`
      : null);
  if (!url || !key) {
    return {
      error:
        `Faltan secretos de la conexion secundaria (${ref}_URL / ${ref}_SERVICE_ROLE_KEY) en las Edge Functions`,
    };
  }
  return { url, key };
}

async function sincronizarContextos(
  secundaria: SupabaseClient,
  usuario: { email?: string | null; user_metadata?: Record<string, unknown> },
  contextos: Contexto[],
) {
  const porMembresia = new Map<string, Contexto[]>();
  for (const contexto of contextos) {
    const clave = String(contexto.membresia_id);
    porMembresia.set(clave, [...(porMembresia.get(clave) ?? []), contexto]);
  }

  let membresiasOrganizacion = 0;
  for (const [membresiaId, funciones] of porMembresia) {
    const perfiles = [
      ...new Set(funciones.map((item) => String(item.rol_codigo))),
    ];
    const permisos = [
      ...new Set(
        funciones.flatMap((item) =>
          Array.isArray(item.permisos) ? item.permisos.map(String) : [],
        ),
      ),
    ];
    const version = Math.max(
      ...funciones.map((item) => Number(item.version_autorizacion ?? 1)),
    );
    const identidadId = String(funciones[0]!.usuario_id);
    const cargo =
      perfiles.find((perfil) => perfil && perfil !== "null") ?? null;
    const { error } = await secundaria.rpc("servicio_sincronizar_acceso", {
      p_identidad_principal_ref: identidadId,
      p_membresia_principal_ref: membresiaId,
      p_correo: usuario.email ?? null,
      p_nombre_mostrar:
        (typeof usuario.user_metadata?.full_name === "string"
          ? usuario.user_metadata.full_name
          : null) ??
        (typeof usuario.user_metadata?.name === "string"
          ? usuario.user_metadata.name
          : null) ??
        usuario.email ??
        null,
      p_perfiles: perfiles,
      p_permisos: permisos,
      p_version_autorizacion: version,
      p_estado: "ACTIVO",
    });
    if (error) {
      return {
        error: error.message,
        membresiasSincronizadas: 0,
        membresiasOrganizacion: 0,
      };
    }

    const membresiaOrg = await secundaria.rpc(
      "servicio_sincronizar_membresia_organizacion",
      {
        p_identidad_principal_ref: identidadId,
        p_membresia_principal_ref: membresiaId,
        p_perfiles: perfiles,
        p_version_autorizacion: version,
        p_estado: "ACTIVO",
        p_cargo: cargo,
      },
    );
    if (membresiaOrg.error) {
      return {
        error:
          `Acceso sincronizado, pero falta la migracion 20260805241000_sincronizar_membresia_organizacion.sql en la secundaria: ${membresiaOrg.error.message}`,
        membresiasSincronizadas: porMembresia.size,
        membresiasOrganizacion: 0,
      };
    }
    membresiasOrganizacion += 1;
  }

  return {
    error: null,
    membresiasSincronizadas: porMembresia.size,
    membresiasOrganizacion,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido" }, 405, corsHeaders);
  }

  try {
    const principalUrl = Deno.env.get("SUPABASE_URL")!;
    const principalAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const principalServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sesion requerida" }, 401, corsHeaders);

    const principal = createClient(principalUrl, principalAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: usuario, error: errorUsuario } = await principal.auth.getUser(
      token,
    );
    if (errorUsuario || !usuario.user) {
      return json({ error: "Sesion invalida" }, 401, corsHeaders);
    }

    const entrada = await req.json().catch(() => ({}));

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const instalacionId =
      typeof entrada.instalacionId === "string" &&
        UUID_RE.test(entrada.instalacionId.trim())
        ? entrada.instalacionId.trim()
        : INSTALACION_TUKUY;

    const conexion = await resolverConexionSecundaria(
      instalacionId,
      principalUrl,
      principalServiceRole,
    );
    if ("error" in conexion) {
      return json({ error: conexion.error }, 503, corsHeaders);
    }
    const secundaria = createClient(conexion.url, conexion.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resolverContextosSincronizables = async () => {
      const { data: contextos, error: errorContextos } = await principal.rpc(
        "obtener_mis_contextos",
      );
      if (errorContextos) {
        return {
          error: errorContextos.message,
          propios: [] as Contexto[],
        };
      }
      const lista = (contextos ?? []) as Contexto[];
      const deInstalacion = lista.filter(
        (contexto) => contexto.instalacion_organizacion_ref === instalacionId,
      );
      if (deInstalacion.length) return { error: null, propios: deInstalacion };

      const { data: esAdmin, error: errorAdmin } = await principal.rpc(
        "es_super_admin_actual",
      );
      if (errorAdmin) return { error: errorAdmin.message, propios: [] };
      if (esAdmin === true) {
        const dePlataforma = lista.filter(
          (contexto) =>
            contexto.instalacion_organizacion_ref == null ||
            contexto.portal === "admin",
        );
        return { error: null, propios: dePlataforma };
      }
      return { error: null, propios: [] };
    };

    if (entrada.action === "health") {
      const { data: esAdmin, error: errorAdmin } = await principal.rpc(
        "es_super_admin_actual",
      );
      if (errorAdmin || esAdmin !== true) {
        return json({ error: "No autorizado" }, 403, corsHeaders);
      }

      const saludInicial = await secundaria.rpc("servicio_salud_secundaria");
      if (saludInicial.error) {
        return json(
          {
            error: "No se pudo verificar la secundaria",
            details: saludInicial.error.message,
          },
          502,
          corsHeaders,
        );
      }

      const habilitacion = await secundaria.rpc(
        "servicio_habilitar_instalacion_secundaria",
      );
      if (habilitacion.error) {
        return json(
          {
            ok: false,
            error:
              "La secundaria responde, pero falta ejecutar la migracion 20260805233000_habilitar_instalacion_secundaria.sql en el SQL Editor secundario.",
            details: habilitacion.error.message,
            secundaria: saludInicial.data,
          },
          200,
          corsHeaders,
        );
      }

      const resolucion = await resolverContextosSincronizables();
      let syncError: string | null = null;
      let membresiasSincronizadas = 0;
      let membresiasOrganizacion = 0;
      if (resolucion.error) {
        syncError = resolucion.error;
      } else if (resolucion.propios.length) {
        const sync = await sincronizarContextos(
          secundaria,
          usuario.user,
          resolucion.propios,
        );
        syncError = sync.error;
        membresiasSincronizadas = sync.membresiasSincronizadas;
        membresiasOrganizacion = sync.membresiasOrganizacion;
      }

      const confirmacion = await principal.rpc(
        "admin_confirmar_conexion_secundaria",
        {
          p_instalacion_id: instalacionId,
          p_version_esquema: Number(
            habilitacion.data?.versionEsquema ??
              saludInicial.data?.versionEsquema ??
              1,
          ),
          p_detalle: {
            tablasPublicas: saludInicial.data?.tablasPublicas ?? null,
            membresiasSincronizadas,
            membresiasOrganizacion,
          },
        },
      );
      if (confirmacion.error) {
        return json(
          {
            ok: false,
            error:
              "La secundaria ya responde, pero falta ejecutar en la principal 20260805234000_confirmar_conexion_secundaria.sql",
            details: confirmacion.error.message,
            secundaria: {
              ...(typeof saludInicial.data === "object" && saludInicial.data
                ? saludInicial.data
                : {}),
              estado: habilitacion.data?.estado ?? "HABILITADA",
            },
          },
          200,
          corsHeaders,
        );
      }

      const saludFinal = await secundaria.rpc("servicio_salud_secundaria");
      if (saludFinal.error) {
        return json(
          {
            error: "No se pudo releer la secundaria tras habilitarla",
            details: saludFinal.error.message,
          },
          502,
          corsHeaders,
        );
      }

      return json(
        {
          ok: true,
          secundaria: saludFinal.data,
          confirmacion: confirmacion.data,
          membresiasSincronizadas,
          membresiasOrganizacion,
          advertenciaSync: syncError,
          verificadaPor: usuario.user.id,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "youtube-duracion") {
      const urlEntrada =
        typeof entrada.url === "string" ? entrada.url.trim() : "";
      const videoIdEntrada =
        typeof entrada.videoId === "string" ? entrada.videoId.trim() : "";
      const videoId =
        (videoIdEntrada && /^[\w-]{11}$/.test(videoIdEntrada)
          ? videoIdEntrada
          : null) ?? idVideoYoutubeDesdeEnlace(urlEntrada);
      if (!videoId) {
        return json(
          { ok: false, error: "Enlace o videoId de YouTube no válido" },
          400,
          corsHeaders,
        );
      }
      const segundos = await consultarDuracionYoutubeApi(videoId);
      if (segundos == null) {
        return json(
          {
            ok: false,
            code: "SIN_DURACION",
            error:
              "No se pudo leer la duración. Configura el secreto YOUTUBE_API_KEY en el gateway (YouTube Data API v3).",
          },
          200,
          corsHeaders,
        );
      }
      return json(
        {
          ok: true,
          videoId,
          segundos,
          minutos: Math.max(1, Math.ceil(segundos / 60)),
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "probe-google-calendar") {
      const configurado = googleCalendarConfigurado();
      if (!configurado) {
        return json(
          {
            ok: false,
            configurado: false,
            error:
              "Faltan secretos GOOGLE_CALENDAR_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN",
          },
          200,
          corsHeaders,
        );
      }
      const prueba = await crearEventoCalendarMeet({
        titulo: "Tukuy · prueba Meet (borrar)",
        descripcion: "Evento de verificación. Puedes eliminarlo.",
        iniciaEn: new Date(Date.now() + 60 * 60_000).toISOString(),
        terminaEn: new Date(Date.now() + 90 * 60_000).toISOString(),
      });
      if (!prueba.simulado) {
        await cancelarEventoCalendar(prueba.calendarEventId);
      }
      return json(
        {
          ok: !prueba.simulado,
          configurado: true,
          simulado: prueba.simulado,
          meetUrl: prueba.meetUrl,
          calendarEventId: prueba.calendarEventId,
          motivo: "motivo" in prueba ? prueba.motivo : undefined,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "inventory") {
      const { data: esAdmin, error: errorAdmin } = await principal.rpc(
        "es_super_admin_actual",
      );
      if (errorAdmin || esAdmin !== true) {
        return json({ error: "No autorizado" }, 403, corsHeaders);
      }

      const inventario = await secundaria.rpc("servicio_inventario_esquema");
      if (inventario.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805240000_inventario_y_lectura_cursos.sql",
            details: inventario.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return json({ ok: true, inventario: inventario.data }, 200, corsHeaders);
    }

    if (entrada.action === "list-cursos" || entrada.action === "get-curso" ||
      entrada.action === "get-borrador" || entrada.action === "guardar-curso" ||
      entrada.action === "eliminar-curso" ||
      entrada.action === "eliminar-curso-permanente") {
      const { data: esAdmin, error: errorAdmin } = await principal.rpc(
        "es_super_admin_actual",
      );
      if (errorAdmin) {
        return json({ error: errorAdmin.message }, 502, corsHeaders);
      }

      if (esAdmin !== true) {
        const resolucion = await resolverContextosSincronizables();
        if (resolucion.error) {
          return json(
            {
              error: "No se pudieron resolver los contextos",
              details: resolucion.error,
            },
            502,
            corsHeaders,
          );
        }
        if (!resolucion.propios.length) {
          return json(
            { error: "El usuario no pertenece a esta organizacion" },
            403,
            corsHeaders,
          );
        }
      }

      if (entrada.action === "get-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
          p_curso_id: cursoId,
        });
        if (detalle.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805242000_listado_tipado_cursos.sql",
              details: detalle.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (!detalle.data?.ok || !detalle.data?.curso) {
          return json(
            {
              ok: false,
              error: detalle.data?.error || "Curso no encontrado",
            },
            404,
            corsHeaders,
          );
        }
        return json({ ok: true, curso: detalle.data.curso }, 200, corsHeaders);
      }

      if (entrada.action === "get-borrador") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const detalle = await secundaria.rpc("servicio_obtener_curso_borrador", {
          p_curso_id: cursoId,
        });
        if (detalle.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805243000_guardar_curso_borrador.sql",
              details: detalle.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (!detalle.data?.ok) {
          return json(
            {
              ok: false,
              error: detalle.data?.error || "Curso no encontrado",
            },
            404,
            corsHeaders,
          );
        }
        return json(
          {
            ok: true,
            curso: detalle.data.curso,
            borrador: detalle.data.borrador,
          },
          200,
          corsHeaders,
        );
      }

      if (entrada.action === "guardar-curso") {
        const cursoIdRaw =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const cursoId =
          cursoIdRaw &&
          cursoIdRaw !== "nuevo" &&
          !cursoIdRaw.startsWith("borrador-") &&
          !cursoIdRaw.startsWith("curso-institucional-")
            ? cursoIdRaw
            : null;
        const borradorCrudo =
          entrada.borrador && typeof entrada.borrador === "object"
            ? (entrada.borrador as Record<string, unknown>)
            : {};
        // Reglas de certificado en gateway (docente=1 firma; admin=1..5 + plantillaId).
        const borrador = normalizarCertificadoDocumentoGateway(borradorCrudo);
        const estado =
          typeof entrada.estado === "string" && entrada.estado.trim()
            ? entrada.estado.trim()
            : null;

        const guardado = await secundaria.rpc("servicio_guardar_curso_borrador", {
          p_autor_identidad_ref: usuario.user.id,
          p_curso_id: cursoId,
          p_documento: borrador,
          p_estado: estado,
        });
        if (guardado.error) {
          return json(
            {
              ok: false,
              error:
                "Error al guardar el curso (si dice estado_curso: ejecuta 20260805258200_guardar_curso_cast_seguro.sql; si falta quiz/YouTube: 57000/56000/55000)",
              details: guardado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (!guardado.data?.ok || !guardado.data?.curso) {
          return json(
            {
              ok: false,
              error: "No se pudo guardar el curso en la secundaria",
              details: guardado.data,
            },
            502,
            corsHeaders,
          );
        }

        // Proyecta requisitos enlazados a tabla (si existe la migración 13140000).
        const cursoIdSync = String(
          (guardado.data.curso as Record<string, unknown>).id ?? "",
        );
        if (cursoIdSync) {
          try {
            await secundaria.rpc("servicio_sincronizar_requisitos_acceso", {
              p_curso_id: cursoIdSync,
              p_documento: borrador,
            });
          } catch {
            // La RPC puede no existir aún; el JSON del borrador sigue siendo la fuente.
          }
        }

        // Al enviar a revisión, indexa la propuesta en el catálogo de la principal.
        let catalogo: unknown = null;
        let advertenciaCatalogo: string | null = null;
        const cursoGuardado = guardado.data.curso as Record<string, unknown>;
        const cursoGuardadoId = String(cursoGuardado.id ?? "");
        const estadoGuardado = String(
          estado ?? cursoGuardado.estado ?? "",
        ).toUpperCase();
        if (cursoGuardadoId && estadoGuardado === "EN_REVISION") {
          const versionActual =
            (cursoGuardado.versionActual as Record<string, unknown> | null) ??
            null;
          const horas = Number(versionActual?.horas ?? 1);
          const upsert = await principal.rpc("org_upsert_curso_catalogo", {
            p_instalacion_id: instalacionId,
            p_curso_secundario_ref: cursoGuardadoId,
            p_codigo: String(cursoGuardado.codigo ?? ""),
            p_titulo: String(cursoGuardado.titulo ?? "Curso sin título"),
            p_resumen:
              typeof cursoGuardado.resumen === "string"
                ? cursoGuardado.resumen
                : null,
            p_modalidad: String(cursoGuardado.modalidad ?? "VIRTUAL"),
            p_duracion_minutos: duracionMinutosDesdeCursoSec(cursoGuardado),
            p_imagen_publica_ref:
              typeof cursoGuardado.portadaClave === "string"
                ? cursoGuardado.portadaClave
                : typeof (borrador as Record<string, unknown>).imagen ===
                    "string"
                ? (borrador as Record<string, unknown>).imagen
                : null,
            p_version_publicada: Number(
              versionActual?.numero ?? cursoGuardado.totalVersiones ?? 1,
            ),
            p_estado_publicacion: "EN_REVISION",
            p_datos_historicos: {
              origen: "envio_revision",
              docenteId: usuario.user.id,
              precio: Number(
                (borrador as Record<string, unknown>).precio ?? 0,
              ),
              gratuito:
                String(
                  (borrador as Record<string, unknown>).acceso ?? "",
                ).toUpperCase() === "GRATUITO" ||
                !(Number((borrador as Record<string, unknown>).precio ?? 0) >
                  0),
              precioPropuestoPorDocente:
                String(
                  (borrador as Record<string, unknown>).acceso ?? "",
                ).toUpperCase() === "GRATUITO" ||
                Number((borrador as Record<string, unknown>).precio ?? 0) > 0,
              accesoBorrador: (borrador as Record<string, unknown>).acceso ??
                null,
              borradorResumen: {
                categoria: (borrador as Record<string, unknown>).categoria ??
                  null,
                docenteResponsableNombre:
                  (borrador as Record<string, unknown>)
                    .docenteResponsableNombre ?? null,
                lecciones: Array.isArray(
                    (borrador as Record<string, unknown>).secciones,
                  )
                  ? (
                    (borrador as Record<string, unknown>).secciones as Array<
                      { clases?: unknown[] }
                    >
                  ).reduce(
                    (total, seccion) =>
                      total +
                      (Array.isArray(seccion.clases) ? seccion.clases.length : 0),
                    0,
                  )
                  : 0,
              },
            },
          });
          if (upsert.error) {
            advertenciaCatalogo =
              `Curso guardado, pero falta 20260810191000_org_revision_catalogo.sql en la principal: ${upsert.error.message}`;
          } else {
            catalogo = upsert.data;
          }
        }

        return json(
          {
            ok: true,
            curso: guardado.data.curso,
            borrador: guardado.data.borrador,
            versionId: guardado.data.versionId,
            catalogo,
            advertenciaCatalogo,
          },
          200,
          corsHeaders,
        );
      }

      if (entrada.action === "eliminar-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const eliminado = await secundaria.rpc(
          "servicio_eliminar_curso_docente",
          {
            p_curso_id: cursoId,
            p_docente_identidad_ref: usuario.user.id,
          },
        );
        if (eliminado.error) {
          return json(
            {
              ok: false,
              error:
                "No se pudo ocultar el curso. Ejecuta 20260817200000_ocultar_curso_docente.sql en la secundaria.",
              details: eliminado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        await sincronizarCatalogoRetirado({
          principal,
          secundaria,
          instalacionId,
          cursoId,
          cursoSec: (eliminado.data?.curso as Record<string, unknown>) ?? null,
          esSuperAdmin: esAdmin === true,
        });
        return json({ ok: true, ...eliminado.data }, 200, corsHeaders);
      }

      if (entrada.action === "eliminar-curso-permanente") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        if (esAdmin !== true) {
          const { data: puede } = await principal.rpc("org_tiene_permiso", {
            p_instalacion_id: instalacionId,
            p_permiso: "cursos.aprobar",
          });
          if (puede !== true) {
            const { data: puedeAdmin } = await principal.rpc(
              "org_tiene_permiso",
              {
                p_instalacion_id: instalacionId,
                p_permiso: "cursos.administrar",
              },
            );
            if (puedeAdmin !== true) {
              return json(
                { error: "Solo Administración puede eliminar el material." },
                403,
                corsHeaders,
              );
            }
          }
        }
        const eliminado = await secundaria.rpc(
          "servicio_eliminar_curso_permanente",
          { p_curso_id: cursoId },
        );
        if (eliminado.error) {
          return json(
            {
              ok: false,
              error:
                "No se pudo eliminar el curso. Ejecuta 20260820160000_duracion_ocultar_eliminar_curso.sql en la secundaria.",
              details: eliminado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        await sincronizarCatalogoRetirado({
          principal,
          secundaria,
          instalacionId,
          cursoId,
          permanente: true,
          esSuperAdmin: esAdmin === true,
        });
        return json({ ok: true, ...eliminado.data }, 200, corsHeaders);
      }

      const limite =
        typeof entrada.limite === "number" && Number.isFinite(entrada.limite)
          ? entrada.limite
          : 100;
      const cursos = await secundaria.rpc("servicio_listar_cursos_tipados", {
        p_limite: limite,
      });
      if (cursos.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805242000_listado_tipado_cursos.sql",
            details: cursos.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return json({ ok: true, cursos: cursos.data }, 200, corsHeaders);
    }

    if (entrada.action === "publicar-curso") {
      const { data: esAdmin, error: errorAdmin } = await principal.rpc(
        "es_super_admin_actual",
      );
      if (errorAdmin) {
        return json({ error: errorAdmin.message }, 502, corsHeaders);
      }

      const estadoPublicacion =
        typeof entrada.estadoPublicacion === "string" &&
          entrada.estadoPublicacion.trim()
          ? entrada.estadoPublicacion.trim().toUpperCase()
          : "PUBLICADO";

      if (esAdmin !== true) {
        const resolucion = await resolverContextosSincronizables();
        if (resolucion.error || !resolucion.propios.length) {
          return json(
            { error: "El usuario no pertenece a esta organizacion" },
            403,
            corsHeaders,
          );
        }
        // Org/docentes con contexto Academy pueden publicar al catálogo.
      }

      const cursoId =
        typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
      if (!cursoId) {
        return json({ error: "cursoId requerido" }, 400, corsHeaders);
      }

      const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
        p_curso_id: cursoId,
      });
      if (detalle.error || !detalle.data?.ok || !detalle.data?.curso) {
        return json(
          {
            ok: false,
            error: "No se pudo leer el curso en la secundaria",
            details: detalle.error?.message ?? detalle.data?.error,
          },
          200,
          corsHeaders,
        );
      }

      const cursoSec = detalle.data.curso as Record<string, unknown>;
      const marcado = await secundaria.rpc("servicio_marcar_curso_publicado", {
        p_curso_id: cursoId,
        p_estado: estadoPublicacion === "PUBLICADO"
          ? "PUBLICADO"
          : estadoPublicacion === "APROBADO"
          ? "APROBADO"
          : estadoPublicacion === "EN_REVISION" ||
              estadoPublicacion === "CONTENIDO_REVISADO"
          ? "EN_REVISION"
          : estadoPublicacion === "OBSERVADO"
          ? "BORRADOR"
          : "BORRADOR",
      });
      if (marcado.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805244000_marcar_curso_publicado.sql",
            details: marcado.error.message,
          },
          200,
          corsHeaders,
        );
      }

      const versionActual =
        (cursoSec.versionActual as Record<string, unknown> | null) ?? null;
      const duracionMinutos = duracionMinutosDesdeCursoSec(cursoSec);
      const versionNumero = Number(
        versionActual?.numero ?? cursoSec.totalVersiones ?? 1,
      );

      const payloadCatalogo = {
        p_instalacion_id: instalacionId,
        p_curso_secundario_ref: cursoId,
        p_codigo: String(cursoSec.codigo ?? ""),
        p_titulo: String(cursoSec.titulo ?? "Curso sin título"),
        p_resumen:
          typeof cursoSec.resumen === "string" ? cursoSec.resumen : null,
        p_modalidad: String(cursoSec.modalidad ?? "VIRTUAL"),
        p_duracion_minutos: duracionMinutos,
        p_imagen_publica_ref:
          typeof cursoSec.portadaClave === "string"
            ? cursoSec.portadaClave
            : null,
        p_version_publicada: versionNumero,
        p_estado_publicacion: estadoPublicacion,
        p_datos_historicos: {
          origen: "secundaria",
          curso: marcado.data?.curso ?? cursoSec,
          publicadoPor: usuario.user.id,
          publicadoEnGateway: new Date().toISOString(),
        },
      };
      const catalogo = esAdmin === true
        ? await principal.rpc(
          "admin_upsert_curso_catalogo_secundaria",
          payloadCatalogo,
        )
        : await principal.rpc("org_upsert_curso_catalogo", payloadCatalogo);
      if (catalogo.error) {
        return json(
          {
            ok: false,
            error: esAdmin === true
              ? "Falta ejecutar en la principal 20260805244000_publicar_curso_catalogo.sql"
              : "Falta ejecutar en la principal 20260810191000_org_revision_catalogo.sql",
            details: catalogo.error.message,
          },
          200,
          corsHeaders,
        );
      }

      return json(
        {
          ok: true,
          catalogo: catalogo.data,
          curso: marcado.data?.curso ?? cursoSec,
        },
        200,
        corsHeaders,
      );
    }

    if (
      entrada.action === "matricular-curso" ||
      entrada.action === "mis-cursos" ||
      entrada.action === "contenido-curso" ||
      entrada.action === "completar-actividad" ||
      entrada.action === "calificar-quiz" ||
      entrada.action === "guardar-apuntes" ||
      entrada.action === "guardar-item-activo"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const estudianteId = usuario.user.id;

      if (entrada.action === "mis-cursos") {
        const mis = await secundaria.rpc("servicio_listar_mis_cursos", {
          p_estudiante_identidad_ref: estudianteId,
        });
        if (mis.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805245000_edicion_matricula_progreso.sql",
              details: mis.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...mis.data }, 200, corsHeaders);
      }

      if (entrada.action === "matricular-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }

        // Cursos de pago: solo matrícula directa si ya hay compra PAGADA
        // (o el curso es gratuito). Evita saltarse el checkout.
        if (UUID_RE.test(cursoId)) {
          const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
            p_curso_id: cursoId,
          });
          const curso = detalle.data?.curso as Record<string, unknown> | undefined;
          const estadoCurso = String(curso?.estado ?? "").trim().toUpperCase();
          const publicado = [
            "PUBLICADO",
            "PUBLICADA",
            "ACTIVO",
            "ACTIVA",
            "APROBADO",
            "APROBADA",
          ].includes(estadoCurso);
          if (curso && !publicado) {
            return json(
              {
                ok: false,
                error:
                  "Este curso aún no está publicado. Cuando la entidad lo publique podrás inscribirte.",
                code: "NO_PUBLICADO",
              },
              409,
              corsHeaders,
            );
          }
          const precio = Number(curso?.precio ?? 0);
          const gratuito = curso?.gratuito === true || !(precio > 0);
          const pasarelaCursosHabilitada =
            (Deno.env.get("PASARELA_CURSOS_HABILITADA") ?? "false").toLowerCase() ===
            "true";
          if (!gratuito && pasarelaCursosHabilitada) {
            const compra = await secundaria.rpc(
              "servicio_estudiante_tiene_compra_pagada",
              {
                p_estudiante_identidad_ref: estudianteId,
                p_curso_id: cursoId,
              },
            );
            if (compra.error) {
              return json(
                {
                  ok: false,
                  error:
                    "Falta ejecutar en la secundaria 20260811161000_checkout_idempotencia_acceso.sql",
                  details: compra.error.message,
                },
                200,
                corsHeaders,
              );
            }
            if (compra.data !== true) {
              return json(
                {
                  ok: false,
                  error:
                    "Este curso requiere pago. Completa la compra en el carrito antes de matricularte.",
                  code: "REQUIERE_PAGO",
                },
                402,
                corsHeaders,
              );
            }
          }
        }

        const mat = await secundaria.rpc("servicio_matricular_estudiante", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: estudianteId,
          p_origen: "INSCRIPCION_DIRECTA",
        });
        if (mat.error) {
          const detalle = mat.error.message ?? "";
          return json(
            {
              ok: false,
              error: detalle,
              details:
                "Si el error menciona read-only/cast: 20260812190000 (o 05258300) / 20260805252200 en secundaria.",
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...mat.data }, 200, corsHeaders);
      }

      if (entrada.action === "contenido-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const contenido = await secundaria.rpc(
          "servicio_obtener_contenido_aprendizaje",
          {
            p_curso_id: cursoId,
            p_estudiante_identidad_ref: estudianteId,
          },
        );
        if (contenido.error) {
          const detalle = contenido.error.message ?? "";
          const esReadOnly = /read-only transaction/i.test(detalle);
          return json(
            {
              ok: false,
              error: esReadOnly
                ? "Ejecuta en la secundaria 20260812190000_contenido_aprendizaje_volatile_again.sql (obtener contenido no puede ser STABLE; las 121x lo revirtieron)"
                : "Error al obtener contenido de aprendizaje",
              details: detalle,
            },
            200,
            corsHeaders,
          );
        }
        if (!contenido.data?.ok) {
          return json(
            {
              ok: false,
              error: contenido.data?.error || "Curso no encontrado",
            },
            404,
            corsHeaders,
          );
        }
        return json({ ok: true, ...contenido.data }, 200, corsHeaders);
      }

      if (entrada.action === "guardar-apuntes") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const apuntes = await secundaria.rpc("servicio_guardar_apuntes_curso", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: estudianteId,
          p_texto: typeof entrada.apuntes === "string" ? entrada.apuntes : "",
        });
        if (apuntes.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805255000_quizzes_notas_aprendizaje.sql",
              details: apuntes.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...apuntes.data }, 200, corsHeaders);
      }

      if (entrada.action === "guardar-item-activo") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const actividadId =
          typeof entrada.actividadId === "string"
            ? entrada.actividadId.trim()
            : "";
        if (!cursoId || !actividadId) {
          return json(
            { error: "cursoId y actividadId requeridos" },
            400,
            corsHeaders,
          );
        }
        const guardado = await secundaria.rpc("servicio_guardar_item_activo", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: estudianteId,
          p_actividad_id: actividadId,
        });
        if (guardado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260812140000_p2_item_activo_cola.sql",
              details: guardado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...guardado.data }, 200, corsHeaders);
      }

      if (entrada.action === "completar-actividad") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const actividadId =
          typeof entrada.actividadId === "string"
            ? entrada.actividadId.trim()
            : "";
        if (!cursoId || !actividadId) {
          return json(
            { error: "cursoId y actividadId requeridos" },
            400,
            corsHeaders,
          );
        }
        const notaRaw = entrada.nota;
        const nota =
          typeof notaRaw === "number"
            ? notaRaw
            : typeof notaRaw === "string" && notaRaw.trim()
              ? Number(notaRaw)
              : null;
        const marcarCompletada = entrada.marcarCompletada !== false;
        const progreso = await secundaria.rpc("servicio_completar_actividad", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: estudianteId,
          p_actividad_id: actividadId,
          p_nota: Number.isFinite(nota as number) ? nota : null,
          p_marcar_completada: marcarCompletada,
        });
        if (progreso.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260812110000_quiz_server_cert_auto_version.sql (o 20260812100000)",
              details: progreso.error.message,
            },
            200,
            corsHeaders,
          );
        }
        const certAuto =
          progreso.data?.certificado &&
            typeof progreso.data.certificado === "object"
            ? (progreso.data.certificado as Record<string, unknown>)
            : null;
        const postCert =
          certAuto && certAuto.ok !== false && certAuto.certificadoId
            ? await postProcesarCertificadoEmitido({
              secundaria,
              principal,
              instalacionId,
              emisorId: usuario.user.id,
              emisorNombre:
                typeof usuario.user.user_metadata?.full_name === "string"
                  ? usuario.user.user_metadata.full_name
                  : usuario.user.email ?? null,
              cert: certAuto,
            })
            : null;
        return json(
          {
            ok: true,
            ...progreso.data,
            postProcesoCertificado: postCert,
            requiereFirmaInstitucional:
              postCert?.requiereFirmaInstitucional === true,
          },
          200,
          corsHeaders,
        );
      }

      if (entrada.action === "calificar-quiz") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const actividadId =
          typeof entrada.actividadId === "string"
            ? entrada.actividadId.trim()
            : "";
        if (!cursoId || !actividadId) {
          return json(
            { error: "cursoId y actividadId requeridos" },
            400,
            corsHeaders,
          );
        }
        const respuestas = Array.isArray(entrada.respuestas)
          ? entrada.respuestas
          : [];
        const calificado = await secundaria.rpc("servicio_calificar_quiz", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: estudianteId,
          p_actividad_id: actividadId,
          p_respuestas: respuestas,
        });
        if (calificado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260812110000_quiz_server_cert_auto_version.sql",
              details: calificado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        const certQuiz =
          calificado.data?.certificado &&
            typeof calificado.data.certificado === "object"
            ? (calificado.data.certificado as Record<string, unknown>)
            : null;
        const postCertQuiz =
          certQuiz && certQuiz.ok !== false && certQuiz.certificadoId
            ? await postProcesarCertificadoEmitido({
              secundaria,
              principal,
              instalacionId,
              emisorId: usuario.user.id,
              emisorNombre:
                typeof usuario.user.user_metadata?.full_name === "string"
                  ? usuario.user.user_metadata.full_name
                  : usuario.user.email ?? null,
              cert: certQuiz,
            })
            : null;
        return json(
          {
            ok: true,
            ...calificado.data,
            postProcesoCertificado: postCertQuiz,
            requiereFirmaInstitucional:
              postCertQuiz?.requiereFirmaInstitucional === true,
          },
          200,
          corsHeaders,
        );
      }

      return json({ error: "Accion de aprendizaje no soportada" }, 400, corsHeaders);
    }

    if (
      entrada.action === "list-sesiones" ||
      entrada.action === "crear-sesion" ||
      entrada.action === "actualizar-sesion" ||
      entrada.action === "eliminar-sesion" ||
      entrada.action === "actualizar-estado-sesion" ||
      entrada.action === "list-estudiantes" ||
      entrada.action === "list-alumnos-resumen" ||
      entrada.action === "actualizar-estado-curso"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      if (entrada.action === "list-sesiones") {
        const cursoId =
          typeof entrada.cursoId === "string" && entrada.cursoId.trim()
            ? entrada.cursoId.trim()
            : null;
        const listado = await secundaria.rpc("servicio_listar_sesiones_en_vivo", {
          p_curso_id: cursoId,
          p_limite: 100,
        });
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805246000_sesiones_en_vivo.sql (o 20260805249000)",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "actualizar-sesion") {
        const sesionId =
          typeof entrada.sesionId === "string" ? entrada.sesionId.trim() : "";
        if (!sesionId) {
          return json({ error: "sesionId requerido" }, 400, corsHeaders);
        }
        const actualizada = await secundaria.rpc(
          "servicio_actualizar_sesion_en_vivo",
          {
            p_sesion_id: sesionId,
            p_titulo:
              typeof entrada.titulo === "string" ? entrada.titulo : null,
            p_inicia_en:
              typeof entrada.iniciaEn === "string" ? entrada.iniciaEn : null,
            p_termina_en:
              typeof entrada.terminaEn === "string" ? entrada.terminaEn : null,
            p_url_acceso:
              typeof entrada.urlAcceso === "string"
                ? entrada.urlAcceso
                : entrada.urlAcceso === null
                ? ""
                : null,
          },
        );
        if (actualizada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805254000_actualizar_eliminar_sesion.sql",
              details: actualizada.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...actualizada.data }, 200, corsHeaders);
      }

      if (entrada.action === "eliminar-sesion") {
        const sesionId =
          typeof entrada.sesionId === "string" ? entrada.sesionId.trim() : "";
        if (!sesionId) {
          return json({ error: "sesionId requerido" }, 400, corsHeaders);
        }
        const { data: fila } = await secundaria
          .from("sesion_en_vivo")
          .select("calendar_event_id")
          .eq("id", sesionId)
          .maybeSingle();
        const eventId =
          typeof fila?.calendar_event_id === "string"
            ? fila.calendar_event_id
            : "";
        if (eventId) await cancelarEventoCalendar(eventId);

        const eliminada = await secundaria.rpc(
          "servicio_eliminar_sesion_en_vivo",
          { p_sesion_id: sesionId },
        );
        if (eliminada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805254000_actualizar_eliminar_sesion.sql",
              details: eliminada.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...eliminada.data }, 200, corsHeaders);
      }

      if (entrada.action === "actualizar-estado-sesion") {
        const sesionId =
          typeof entrada.sesionId === "string" ? entrada.sesionId.trim() : "";
        const estado =
          typeof entrada.estado === "string" ? entrada.estado.trim() : "";
        if (!sesionId || !estado) {
          return json(
            { error: "sesionId y estado son requeridos" },
            400,
            corsHeaders,
          );
        }

        if (estado.toUpperCase() === "CANCELADA") {
          const { data: fila } = await secundaria
            .from("sesion_en_vivo")
            .select("calendar_event_id")
            .eq("id", sesionId)
            .maybeSingle();
          const eventId =
            typeof fila?.calendar_event_id === "string"
              ? fila.calendar_event_id
              : "";
          if (eventId) await cancelarEventoCalendar(eventId);
        }

        const actualizada = await secundaria.rpc(
          "servicio_actualizar_estado_sesion",
          { p_sesion_id: sesionId, p_estado: estado },
        );
        if (actualizada.error) {
          const msg = actualizada.error.message ?? "";
          const faltaFn =
            /function|does not exist|schema cache/i.test(msg);
          return json(
            {
              ok: false,
              error: faltaFn
                ? "Falta ejecutar en la secundaria 20260805249000_academia_sin_mock_estudiantes_sesiones.sql (o 20260811122000_fix_asistencia_matricula_ref_cancelar.sql)"
                : msg,
              details: msg,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...actualizada.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-estudiantes") {
        const cursoId =
          typeof entrada.cursoId === "string" && entrada.cursoId.trim()
            ? entrada.cursoId.trim()
            : null;
        const listado = await secundaria.rpc(
          "servicio_listar_estudiantes_matriculas",
          { p_curso_id: cursoId },
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805249000_academia_sin_mock_estudiantes_sesiones.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-alumnos-resumen") {
        const cursoId =
          typeof entrada.cursoId === "string" && entrada.cursoId.trim()
            ? entrada.cursoId.trim()
            : null;
        const busqueda =
          typeof entrada.busqueda === "string" ? entrada.busqueda : null;
        const limite =
          typeof entrada.limite === "number" ? entrada.limite : 50;
        const offset =
          typeof entrada.offset === "number" ? entrada.offset : 0;
        const listado = await secundaria.rpc(
          "servicio_listar_alumnos_resumen",
          {
            p_busqueda: busqueda,
            p_curso_id: cursoId,
            p_limite: limite,
            p_offset: offset,
          },
        );
        if (listado.error) {
          const mensaje = listado.error.message ?? "";
          const faltaFuncion =
            mensaje.includes("Could not find the function") ||
            listado.error.code === "PGRST202";
          return json(
            {
              ok: false,
              error: faltaFuncion
                ? "Falta ejecutar en la secundaria 20260818160000_fix_listar_alumnos_resumen_cte.sql"
                : mensaje.includes("filtrado")
                  ? "Falta ejecutar en la secundaria 20260818160000_fix_listar_alumnos_resumen_cte.sql"
                  : mensaje,
              details: mensaje,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "actualizar-estado-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const estado =
          typeof entrada.estado === "string" ? entrada.estado.trim() : "";
        if (!cursoId || !estado) {
          return json(
            { error: "cursoId y estado son requeridos" },
            400,
            corsHeaders,
          );
        }
        const actualizado = await secundaria.rpc(
          "servicio_actualizar_estado_curso",
          { p_curso_id: cursoId, p_estado: estado },
        );
        if (actualizado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260813170000_actualizar_estado_curso_cast.sql (cast de estado_curso)",
              details: actualizado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (estado.toUpperCase() === "ARCHIVADO") {
          const { data: esAdminEstado } = await principal.rpc(
            "es_super_admin_actual",
          );
          await sincronizarCatalogoRetirado({
            principal,
            secundaria,
            instalacionId,
            cursoId,
            cursoSec:
              (actualizado.data?.curso as Record<string, unknown>) ?? null,
            esSuperAdmin: esAdminEstado === true,
          });
        }
        return json({ ok: true, ...actualizado.data }, 200, corsHeaders);
      }

      const cursoId =
        typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
      const titulo =
        typeof entrada.titulo === "string" ? entrada.titulo.trim() : "";
      const iniciaEn =
        typeof entrada.iniciaEn === "string" ? entrada.iniciaEn : "";
      const terminaEn =
        typeof entrada.terminaEn === "string" ? entrada.terminaEn : "";
      if (!cursoId || !titulo || !iniciaEn || !terminaEn) {
        return json(
          { error: "cursoId, titulo, iniciaEn y terminaEn son requeridos" },
          400,
          corsHeaders,
        );
      }
      const creada = await secundaria.rpc("servicio_crear_sesion_en_vivo", {
        p_curso_id: cursoId,
        p_titulo: titulo,
        p_inicia_en: iniciaEn,
        p_termina_en: terminaEn,
        p_url_acceso:
          typeof entrada.urlAcceso === "string" ? entrada.urlAcceso : null,
        p_docente_identidad_ref: usuario.user.id,
      });
      if (creada.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805246000_sesiones_en_vivo.sql",
            details: creada.error.message,
          },
          200,
          corsHeaders,
        );
      }

      const sesionCreada = creada.data?.sesion ?? null;
      const sesionId =
        typeof sesionCreada?.id === "string" ? sesionCreada.id : "";

      const attendees = Array.isArray(entrada.attendees)
        ? entrada.attendees.filter((e: unknown) => typeof e === "string")
        : [];

      const meet = await crearEventoCalendarMeet({
        titulo,
        descripcion: `Curso: ${sesionCreada?.cursoTitulo ?? cursoId}`,
        iniciaEn,
        terminaEn,
        attendees,
      });

      if (sesionId && meet.meetUrl) {
        const patch: Record<string, unknown> = {
          url_acceso: meet.meetUrl,
        };
        if (!meet.simulado) {
          patch.calendar_event_id = meet.calendarEventId;
        }
        const { error: patchError } = await secundaria
          .from("sesion_en_vivo")
          .update(patch)
          .eq("id", sesionId);
        if (!patchError && sesionCreada) {
          sesionCreada.urlAcceso = meet.meetUrl;
          sesionCreada.calendarEventId = meet.calendarEventId;
        }
      }

      return json(
        {
          ok: true,
          ...creada.data,
          sesion: sesionCreada ?? creada.data?.sesion,
          googleMeet: {
            simulado: meet.simulado,
            meetUrl: meet.meetUrl,
            calendarEventId: meet.calendarEventId,
            motivo: "motivo" in meet ? meet.motivo : undefined,
          },
        },
        200,
        corsHeaders,
      );
    }

    if (
      entrada.action === "list-asistencia-sesion" ||
      entrada.action === "marcar-asistencia-sesion"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const sesionId =
        typeof entrada.sesionId === "string" ? entrada.sesionId.trim() : "";
      if (!sesionId || !UUID_RE.test(sesionId)) {
        return json({ error: "sesionId (uuid) requerido" }, 400, corsHeaders);
      }

      if (entrada.action === "list-asistencia-sesion") {
        const listado = await secundaria.rpc("servicio_listar_asistencia_sesion", {
          p_sesion_id: sesionId,
        });
        if (listado.error) {
          const msg = listado.error.message ?? "";
          const faltaFn =
            /function|does not exist|schema cache/i.test(msg);
          return json(
            {
              ok: false,
              error: faltaFn
                ? "Falta ejecutar en la secundaria 20260810194000_asistencia_sesion.sql (o 20260811122000_fix_asistencia_matricula_ref_cancelar.sql)"
                : msg,
              details: msg,
            },
            200,
            corsHeaders,
          );
        }
        if (!listado.data?.ok) {
          return json(
            {
              ok: false,
              error: listado.data?.error ?? "Sesion no encontrada",
            },
            404,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      const items = Array.isArray(entrada.items) ? entrada.items : [];
      if (!items.length) {
        return json({ error: "items de asistencia requeridos" }, 400, corsHeaders);
      }
      const marcado = await secundaria.rpc("servicio_marcar_asistencia_sesion", {
        p_sesion_id: sesionId,
        p_marcador_identidad_ref: usuario.user.id,
        p_items: items,
      });
      if (marcado.error) {
        const msg = marcado.error.message ?? "";
        const faltaFn =
          /function|does not exist|schema cache/i.test(msg);
        return json(
          {
            ok: false,
            error: faltaFn
              ? "Falta ejecutar en la secundaria 20260810194000_asistencia_sesion.sql (o 20260811122000_fix_asistencia_matricula_ref_cancelar.sql)"
              : msg,
            details: msg,
          },
          200,
          corsHeaders,
        );
      }
      if (!marcado.data?.ok) {
        return json(
          {
            ok: false,
            error: marcado.data?.error ?? "No se pudo marcar la asistencia",
          },
          200,
          corsHeaders,
        );
      }
      return json({ ok: true, ...marcado.data }, 200, corsHeaders);
    }

    if (
      entrada.action === "list-certificados" ||
      entrada.action === "list-certificados-pendientes" ||
      entrada.action === "list-mis-certificados" ||
      entrada.action === "list-certificados-pendientes-firma" ||
      entrada.action === "firmar-certificado" ||
      entrada.action === "emitir-certificado" ||
      entrada.action === "revocar-certificado" ||
      entrada.action === "actualizar-documento-certificado"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      if (entrada.action === "list-mis-certificados") {
        const listado = await secundaria.rpc(
          "servicio_listar_mis_certificados",
          { p_estudiante_identidad_ref: usuario.user.id },
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805258100_listar_mis_certificados.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-certificados") {
        const listado = await secundaria.rpc(
          "servicio_listar_certificados_emitidos",
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805247000_certificados_minimos.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-certificados-pendientes") {
        const progresoMinimo =
          typeof entrada.progresoMinimo === "number" &&
            Number.isFinite(entrada.progresoMinimo)
            ? entrada.progresoMinimo
            : 100;
        const listado = await secundaria.rpc(
          "servicio_listar_certificados_pendientes",
          { p_progreso_minimo: progresoMinimo },
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805247000_certificados_minimos.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-certificados-pendientes-firma") {
        const listado = await secundaria.rpc(
          "servicio_listar_certificados_pendientes_firma",
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260810195000_firma_certificado.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "actualizar-documento-certificado") {
        const certificadoId =
          typeof entrada.certificadoId === "string"
            ? entrada.certificadoId.trim()
            : "";
        const clave =
          typeof entrada.claveAlmacenamiento === "string"
            ? entrada.claveAlmacenamiento.trim()
            : "";
        if (!certificadoId || !UUID_RE.test(certificadoId)) {
          return json(
            { error: "certificadoId (uuid) requerido" },
            400,
            corsHeaders,
          );
        }
        if (!clave || clave.includes("..") || !clave.startsWith("certificados/")) {
          return json(
            { error: "claveAlmacenamiento debe estar bajo certificados/" },
            400,
            corsHeaders,
          );
        }
        const tamano =
          typeof entrada.tamanoBytes === "number" &&
            Number.isFinite(entrada.tamanoBytes)
            ? Math.max(0, Math.floor(entrada.tamanoBytes))
            : null;
        const huella =
          typeof entrada.huellaDocumento === "string"
            ? entrada.huellaDocumento.trim()
            : null;
        const datosPlantilla =
          entrada.datosPlantilla &&
            typeof entrada.datosPlantilla === "object" &&
            !Array.isArray(entrada.datosPlantilla)
            ? entrada.datosPlantilla
            : null;
        const actualizado = await secundaria.rpc(
          "servicio_actualizar_documento_certificado",
          {
            p_certificado_id: certificadoId,
            p_clave_almacenamiento: clave,
            p_tamano_bytes: tamano,
            p_huella_documento: huella,
            p_datos_plantilla: datosPlantilla,
          },
        );
        if (actualizado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260811160000_certificado_pdf_revocar.sql",
              details: actualizado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...actualizado.data }, 200, corsHeaders);
      }

      if (entrada.action === "revocar-certificado") {
        const certificadoId =
          typeof entrada.certificadoId === "string"
            ? entrada.certificadoId.trim()
            : "";
        if (!certificadoId || !UUID_RE.test(certificadoId)) {
          return json(
            { error: "certificadoId (uuid) requerido" },
            400,
            corsHeaders,
          );
        }
        const motivo =
          typeof entrada.motivo === "string" ? entrada.motivo.trim() : null;
        const revocado = await secundaria.rpc("servicio_revocar_certificado", {
          p_certificado_id: certificadoId,
          p_actor_identidad_ref: usuario.user.id,
          p_motivo: motivo,
        });
        if (revocado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260811160000_certificado_pdf_revocar.sql",
              details: revocado.error.message,
            },
            200,
            corsHeaders,
          );
        }

        let indicePublico: unknown = null;
        let advertenciaIndice: string | null = null;
        const indice = await principal.rpc(
          "admin_revocar_indice_certificado_publico",
          {
            p_certificado_secundario_ref: certificadoId,
            p_motivo: motivo,
          },
        );
        if (indice.error) {
          advertenciaIndice =
            `Revocado en secundaria, pero falta 20260811160000_admin_revocar_indice_certificado.sql en la principal: ${indice.error.message}`;
        } else {
          indicePublico = indice.data;
        }

        return json(
          {
            ok: true,
            ...revocado.data,
            indicePublico,
            advertenciaIndice,
          },
          200,
          corsHeaders,
        );
      }

      if (entrada.action === "firmar-certificado") {
        const certificadoId =
          typeof entrada.certificadoId === "string"
            ? entrada.certificadoId.trim()
            : "";
        if (!certificadoId || !UUID_RE.test(certificadoId)) {
          return json(
            { error: "certificadoId (uuid) requerido" },
            400,
            corsHeaders,
          );
        }
        const firmaId =
          typeof entrada.firmaId === "string" && UUID_RE.test(entrada.firmaId)
            ? entrada.firmaId.trim()
            : null;
        const firmado = await secundaria.rpc("servicio_firmar_certificado", {
          p_certificado_id: certificadoId,
          p_firmante_identidad_ref: usuario.user.id,
          p_firmante_nombre:
            typeof usuario.user.user_metadata?.full_name === "string"
              ? usuario.user.user_metadata.full_name
              : usuario.user.email ?? null,
          p_firma_id: firmaId,
        });
        if (firmado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260810195000_firma_certificado.sql",
              details: firmado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (!firmado.data?.ok) {
          return json(
            {
              ok: false,
              error: firmado.data?.error ?? "No se pudo firmar el certificado",
            },
            200,
            corsHeaders,
          );
        }

        let indicePublico: unknown = null;
        let advertenciaIndice: string | null = null;
        if (
          firmado.data.listoParaIndice === true &&
          firmado.data.certificadoId &&
          firmado.data.documentoId &&
          firmado.data.codigoVerificacion
        ) {
          const indice = await principal.rpc(
            "admin_upsert_indice_certificado_publico",
            {
              p_instalacion_id: instalacionId,
              p_codigo_verificacion: firmado.data.codigoVerificacion,
              p_certificado_secundario_ref: firmado.data.certificadoId,
              p_documento_secundario_ref: firmado.data.documentoId,
              p_huella_documento: firmado.data.huellaDocumento ?? "",
              p_titular_historico: firmado.data.titular ?? "Titular",
              p_curso_historico: firmado.data.curso ?? "Curso",
              p_organizacion_historica:
                firmado.data.organizacion ?? "Tukuy Academy",
              p_emitido_en: firmado.data.emitidoEn ?? new Date().toISOString(),
              p_estado_publico: "VIGENTE",
            },
          );
          if (indice.error) {
            advertenciaIndice =
              `Firmado, pero falta índice público: ${indice.error.message}`;
          } else {
            indicePublico = indice.data;
          }
        }

        return json(
          {
            ok: true,
            ...firmado.data,
            indicePublico,
            advertenciaIndice,
          },
          200,
          corsHeaders,
        );
      }

      const matriculaId =
        typeof entrada.matriculaId === "string"
          ? entrada.matriculaId.trim()
          : "";
      if (!matriculaId) {
        return json({ error: "matriculaId requerido" }, 400, corsHeaders);
      }
      const emitido = await secundaria.rpc("servicio_emitir_certificado", {
        p_matricula_id: matriculaId,
        p_emisor_identidad_ref: usuario.user.id,
      });
      if (emitido.error) {
        const detalle = emitido.error.message ?? "";
        const esCastEnum = /estado_certificado|type ".*does not exist/i.test(
          detalle,
        );
        return json(
          {
            ok: false,
            error: esCastEnum
              ? "Falta ejecutar en la secundaria 20260805254100_emitir_certificado_cast_seguro.sql (y antes 20260805252200 si aún no está)"
              : "Falta ejecutar en la secundaria 20260805247000_certificados_minimos.sql (o 20260805248100 / 20260805254100)",
            details: detalle,
          },
          200,
          corsHeaders,
        );
      }

      let firmas: unknown = null;
      let advertenciaFirmas: string | null = null;
      let listoParaIndice = true;
      let indicePublico: unknown = null;
      let advertenciaIndice: string | null = null;
      if (emitido.data?.certificadoId && emitido.data?.documentoId) {
        const post = await postProcesarCertificadoEmitido({
          secundaria,
          principal,
          instalacionId,
          emisorId: usuario.user.id,
          emisorNombre:
            typeof usuario.user.user_metadata?.full_name === "string"
              ? usuario.user.user_metadata.full_name
              : usuario.user.email ?? null,
          cert: emitido.data as Record<string, unknown>,
        });
        if (post) {
          firmas = post.firmas;
          advertenciaFirmas = post.advertenciaFirmas;
          listoParaIndice = post.listoParaIndice;
          indicePublico = post.indicePublico;
          advertenciaIndice = post.advertenciaIndice;
        }
      }

      return json(
        {
          ok: true,
          ...emitido.data,
          firmas,
          requiereFirmaInstitucional: listoParaIndice !== true,
          indicePublico,
          advertenciaFirmas,
          advertenciaIndice,
        },
        200,
        corsHeaders,
      );
    }

    if (
      entrada.action === "list-entregas" ||
      entrada.action === "get-entrega" ||
      entrada.action === "enviar-entrega" ||
      entrada.action === "calificar-entrega" ||
      entrada.action === "solicitar-correccion-entrega" ||
      entrada.action === "list-modulos-curso"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      if (entrada.action === "list-entregas") {
        const cursoId =
          typeof entrada.cursoId === "string" && entrada.cursoId.trim()
            ? entrada.cursoId.trim()
            : null;
        const soloPropias = entrada.soloPropias === true;
        const listado = await secundaria.rpc("servicio_listar_entregas", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: soloPropias ? usuario.user.id : null,
          p_incluir_archivo: entrada.incluirArchivo === true,
        });
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805251000_entregas_calificaciones.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "get-entrega") {
        const entregaId =
          typeof entrada.entregaId === "string" ? entrada.entregaId.trim() : "";
        if (!entregaId) {
          return json({ error: "entregaId requerido" }, 400, corsHeaders);
        }
        const detalle = await secundaria.rpc("servicio_obtener_entrega", {
          p_entrega_id: entregaId,
          p_incluir_archivo: entrada.incluirArchivo !== false,
        });
        if (detalle.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805251000_entregas_calificaciones.sql",
              details: detalle.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...detalle.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-modulos-curso") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const listado = await secundaria.rpc("servicio_listar_modulos_curso", {
          p_curso_id: cursoId,
        });
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805251000_entregas_calificaciones.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "enviar-entrega") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        const actividadId =
          typeof entrada.actividadId === "string"
            ? entrada.actividadId.trim()
            : "";
        const archivoNombre =
          typeof entrada.archivoNombre === "string"
            ? entrada.archivoNombre.trim()
            : "";
        if (!cursoId || !actividadId || !archivoNombre) {
          return json(
            { error: "cursoId, actividadId y archivoNombre son requeridos" },
            400,
            corsHeaders,
          );
        }
        const enviada = await secundaria.rpc("servicio_enviar_entrega", {
          p_curso_id: cursoId,
          p_actividad_id: actividadId,
          p_estudiante_identidad_ref: usuario.user.id,
          p_archivo_nombre: archivoNombre,
          p_archivo_tipo:
            typeof entrada.archivoTipo === "string"
              ? entrada.archivoTipo
              : "application/pdf",
          p_archivo_tamanio:
            typeof entrada.archivoTamanio === "number"
              ? entrada.archivoTamanio
              : 0,
          p_archivo_contenido:
            typeof entrada.archivoContenido === "string"
              ? entrada.archivoContenido
              : null,
          p_archivo_referencia:
            typeof entrada.archivoReferencia === "string"
              ? entrada.archivoReferencia
              : null,
        });
        if (enviada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805258000_portada_s3_entregas_ref.sql (o 20260805251000)",
              details: enviada.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...enviada.data }, 200, corsHeaders);
      }

      if (entrada.action === "calificar-entrega") {
        const entregaId =
          typeof entrada.entregaId === "string" ? entrada.entregaId.trim() : "";
        const nota =
          typeof entrada.nota === "number" ? entrada.nota : Number(entrada.nota);
        if (!entregaId || !Number.isFinite(nota)) {
          return json(
            { error: "entregaId y nota son requeridos" },
            400,
            corsHeaders,
          );
        }
        const calificada = await secundaria.rpc("servicio_calificar_entrega", {
          p_entrega_id: entregaId,
          p_nota: nota,
          p_retroalimentacion:
            typeof entrada.retroalimentacion === "string"
              ? entrada.retroalimentacion
              : null,
          p_docente_identidad_ref: usuario.user.id,
        });
        if (calificada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805251000_entregas_calificaciones.sql",
              details: calificada.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...calificada.data }, 200, corsHeaders);
      }

      const entregaId =
        typeof entrada.entregaId === "string" ? entrada.entregaId.trim() : "";
      const retroalimentacion =
        typeof entrada.retroalimentacion === "string"
          ? entrada.retroalimentacion.trim()
          : "";
      if (!entregaId || !retroalimentacion) {
        return json(
          { error: "entregaId y retroalimentacion son requeridos" },
          400,
          corsHeaders,
        );
      }
      const observada = await secundaria.rpc(
        "servicio_solicitar_correccion_entrega",
        {
          p_entrega_id: entregaId,
          p_retroalimentacion: retroalimentacion,
          p_docente_identidad_ref: usuario.user.id,
        },
      );
      if (observada.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805251000_entregas_calificaciones.sql",
            details: observada.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return json({ ok: true, ...observada.data }, 200, corsHeaders);
    }

    if (
      entrada.action === "bootstrap-docente" ||
      entrada.action === "bootstrap-alumno"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const vacioCursos = {
        ok: true,
        total: 0,
        cursos: [] as unknown[],
        generadoEn: new Date().toISOString(),
      };
      const advertencias: string[] = [];

      if (entrada.action === "bootstrap-docente") {
        const [cursos, entregas, sesiones, estudiantes] = await Promise.all([
          secundaria.rpc("servicio_listar_cursos_tipados", { p_limite: 100 }),
          secundaria.rpc("servicio_listar_entregas", {
            p_curso_id: null,
            p_estudiante_identidad_ref: null,
            p_incluir_archivo: false,
          }),
          secundaria.rpc("servicio_listar_sesiones_en_vivo", {
            p_curso_id: null,
            p_limite: 100,
          }),
          secundaria.rpc("servicio_listar_estudiantes_matriculas", {
            p_curso_id: null,
          }),
        ]);

        if (cursos.error) {
          advertencias.push(`cursos: ${cursos.error.message}`);
        }
        if (entregas.error) {
          advertencias.push(`entregas: ${entregas.error.message}`);
        }
        if (sesiones.error) {
          advertencias.push(`sesiones: ${sesiones.error.message}`);
        }
        if (estudiantes.error) {
          advertencias.push(`estudiantes: ${estudiantes.error.message}`);
        }

        return json(
          {
            ok: true,
            cursos: cursos.error ? vacioCursos : cursos.data,
            entregas: entregas.error
              ? { ok: true, total: 0, entregas: [] }
              : entregas.data,
            sesiones: sesiones.error
              ? { ok: true, total: 0, sesiones: [] }
              : sesiones.data,
            estudiantes: estudiantes.error
              ? { ok: true, total: 0, estudiantes: [] }
              : estudiantes.data,
            advertencias: advertencias.length ? advertencias : undefined,
          },
          200,
          corsHeaders,
        );
      }

      const [cursos, mis] = await Promise.all([
        secundaria.rpc("servicio_listar_cursos_tipados", { p_limite: 100 }),
        secundaria.rpc("servicio_listar_mis_cursos", {
          p_estudiante_identidad_ref: usuario.user.id,
        }),
      ]);
      if (cursos.error) {
        advertencias.push(`cursos: ${cursos.error.message}`);
      }
      if (mis.error) {
        advertencias.push(`mis-cursos: ${mis.error.message}`);
      }
      return json(
        {
          ok: true,
          cursos: cursos.error ? vacioCursos : cursos.data,
          misCursos: mis.error
            ? { ok: true, total: 0, cursos: [] }
            : mis.data,
          advertencias: advertencias.length ? advertencias : undefined,
        },
        200,
        corsHeaders,
      );
    }

    if (
      entrada.action === "list-conversaciones" ||
      entrada.action === "get-mensajes" ||
      entrada.action === "enviar-mensaje" ||
      entrada.action === "marcar-conversacion-leida" ||
      entrada.action === "list-ingresos" ||
      entrada.action === "chat-curso-alumno"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const identidadId = usuario.user.id;

      if (entrada.action === "chat-curso-alumno") {
        const cursoId =
          typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
        if (!cursoId) {
          return json({ error: "cursoId requerido" }, 400, corsHeaders);
        }
        const chat = await secundaria.rpc("servicio_abrir_chat_curso_alumno", {
          p_curso_id: cursoId,
          p_estudiante_identidad_ref: identidadId,
        });
        if (chat.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805258600_chat_alumno_docente_curso.sql",
              details: chat.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...chat.data }, 200, corsHeaders);
      }

      if (entrada.action === "list-conversaciones") {
        const listado = await secundaria.rpc(
          "servicio_listar_conversaciones_docente",
          { p_docente_identidad_ref: identidadId },
        );
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805258500_mensajes_e_ingresos_docente.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      if (entrada.action === "get-mensajes") {
        const conversacionId =
          typeof entrada.conversacionId === "string"
            ? entrada.conversacionId.trim()
            : "";
        if (!conversacionId) {
          return json({ error: "conversacionId requerido" }, 400, corsHeaders);
        }
        const mensajes = await secundaria.rpc(
          "servicio_obtener_mensajes_conversacion",
          {
            p_conversacion_id: conversacionId,
            p_identidad_ref: identidadId,
          },
        );
        if (mensajes.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805258500_mensajes_e_ingresos_docente.sql",
              details: mensajes.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...mensajes.data }, 200, corsHeaders);
      }

      if (entrada.action === "enviar-mensaje") {
        const conversacionId =
          typeof entrada.conversacionId === "string"
            ? entrada.conversacionId.trim()
            : "";
        const contenido =
          typeof entrada.contenido === "string" ? entrada.contenido : "";
        if (!conversacionId) {
          return json({ error: "conversacionId requerido" }, 400, corsHeaders);
        }
        const adjunto =
          entrada.adjunto && typeof entrada.adjunto === "object"
            ? (entrada.adjunto as Record<string, unknown>)
            : null;
        const enviado = await secundaria.rpc(
          "servicio_enviar_mensaje_conversacion",
          {
            p_conversacion_id: conversacionId,
            p_autor_identidad_ref: identidadId,
            p_contenido: contenido,
            p_adjunto_nombre:
              typeof adjunto?.nombre === "string" ? adjunto.nombre : null,
            p_adjunto_tipo:
              typeof adjunto?.tipo === "string" ? adjunto.tipo : null,
            p_adjunto_tamano:
              typeof adjunto?.tamanio === "number" ? adjunto.tamanio : null,
          },
        );
        if (enviado.error) {
          return json(
            {
              ok: false,
              error: "No se pudo enviar el mensaje",
              details: enviado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...enviado.data }, 200, corsHeaders);
      }

      if (entrada.action === "marcar-conversacion-leida") {
        const conversacionId =
          typeof entrada.conversacionId === "string"
            ? entrada.conversacionId.trim()
            : "";
        if (!conversacionId) {
          return json({ error: "conversacionId requerido" }, 400, corsHeaders);
        }
        const leida = await secundaria.rpc(
          "servicio_marcar_conversacion_leida",
          {
            p_conversacion_id: conversacionId,
            p_identidad_ref: identidadId,
          },
        );
        if (leida.error) {
          return json(
            {
              ok: false,
              error: "No se pudo marcar como leída",
              details: leida.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...leida.data }, 200, corsHeaders);
      }

      const ingresos = await secundaria.rpc("servicio_listar_ingresos_docente", {
        p_docente_identidad_ref: identidadId,
      });
      if (ingresos.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260805258500_mensajes_e_ingresos_docente.sql",
            details: ingresos.error.message,
          },
          200,
          corsHeaders,
        );
      }
      return json({ ok: true, ...ingresos.data }, 200, corsHeaders);
    }

    if (
      entrada.action === "list-cursos-revision" ||
      entrada.action === "revisar-contenido" ||
      entrada.action === "observar-curso" ||
      entrada.action === "aprobar-curso"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      if (entrada.action === "list-cursos-revision") {
        const listado = await principal.rpc("org_listar_cursos_catalogo", {
          p_instalacion_id: instalacionId,
        });
        if (listado.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la principal 20260810191000_org_revision_catalogo.sql",
              details: listado.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...listado.data }, 200, corsHeaders);
      }

      const cursoId =
        typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
      if (!cursoId || !UUID_RE.test(cursoId)) {
        return json({ error: "cursoId (uuid) requerido" }, 400, corsHeaders);
      }

      const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
        p_curso_id: cursoId,
      });
      if (detalle.error || !detalle.data?.ok || !detalle.data?.curso) {
        return json(
          {
            ok: false,
            error: "No se pudo leer el curso en la secundaria",
            details: detalle.error?.message ?? detalle.data?.error,
          },
          200,
          corsHeaders,
        );
      }
      const cursoSec = detalle.data.curso as Record<string, unknown>;
      const versionActual =
        (cursoSec.versionActual as Record<string, unknown> | null) ?? null;
      const horas = Number(versionActual?.horas ?? 1);

      let estadoWorkflow = "EN_REVISION";
      let estadoSecundaria = "EN_REVISION";
      const historicos: Record<string, unknown> = {
        origen: "revision_org",
        revisadoPor: usuario.user.id,
      };

      if (entrada.action === "revisar-contenido") {
        estadoWorkflow = "CONTENIDO_REVISADO";
        estadoSecundaria = "CONTENIDO_REVISADO";
        historicos.revisionAcademica = {
          confirmadaEn: new Date().toISOString(),
        };
      } else if (entrada.action === "observar-curso") {
        const observacion =
          typeof entrada.observacion === "string"
            ? entrada.observacion.trim()
            : "";
        if (!observacion) {
          return json({ error: "observacion requerida" }, 400, corsHeaders);
        }
        estadoWorkflow = "OBSERVADO";
        estadoSecundaria = "OBSERVADO";
        historicos.observacion = observacion;
        historicos.observadoEn = new Date().toISOString();
      } else {
        // aprobar-curso
        const publicar = entrada.publicar === true;
        estadoWorkflow = publicar ? "PUBLICADO" : "APROBADO";
        estadoSecundaria = publicar ? "PUBLICADO" : "APROBADO";
        historicos.configuracionPublicacion =
          entrada.configuracion && typeof entrada.configuracion === "object"
            ? entrada.configuracion
            : {};
        historicos.aprobadoEn = new Date().toISOString();
        historicos.publicar = publicar;
      }

      const estadoSec = await secundaria.rpc("servicio_actualizar_estado_curso", {
        p_curso_id: cursoId,
        p_estado: estadoSecundaria,
      });
      if (estadoSec.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260813170000_actualizar_estado_curso_cast.sql (cast de estado_curso)",
            details: estadoSec.error.message,
          },
          200,
          corsHeaders,
        );
      }

      // Persistir observación en borrador (docente la ve en su listado).
      const observacionTexto =
        typeof historicos.observacion === "string"
          ? historicos.observacion
          : null;
      const obsRpc = await secundaria.rpc("servicio_guardar_observacion_curso", {
        p_curso_id: cursoId,
        p_observacion:
          estadoWorkflow === "OBSERVADO" ? observacionTexto : null,
      });
      if (obsRpc.error) {
        // No bloquea el flujo; el catálogo principal ya guarda la observación.
        console.warn(
          "servicio_guardar_observacion_curso:",
          obsRpc.error.message,
        );
      }

      if (estadoWorkflow === "PUBLICADO") {
        const marcado = await secundaria.rpc("servicio_marcar_curso_publicado", {
          p_curso_id: cursoId,
          p_estado: "PUBLICADO",
        });
        if (marcado.error) {
          return json(
            {
              ok: false,
              error:
                "No se pudo marcar PUBLICADO en la secundaria",
              details: marcado.error.message,
            },
            200,
            corsHeaders,
          );
        }
      }

      // Persistir precio comercial al aprobar/publicar (no al observar).
      if (
        estadoWorkflow === "APROBADO" ||
        estadoWorkflow === "PUBLICADO"
      ) {
        const cfg =
          historicos.configuracionPublicacion &&
          typeof historicos.configuracionPublicacion === "object"
            ? (historicos.configuracionPublicacion as Record<string, unknown>)
            : {};
        const precioCfg =
          cfg.precio && typeof cfg.precio === "object"
            ? (cfg.precio as Record<string, unknown>)
            : cfg;
        const modalidadPrecio = String(
          precioCfg.modalidad ?? "",
        ).toUpperCase();
        const precioNum = Number(
          precioCfg.precioCompleto ?? precioCfg.precio ?? 0,
        );
        const gratuito =
          modalidadPrecio === "GRATUITO" ||
          historicos.gratuito === true ||
          !(precioNum > 0);
        const moneda = String(
          precioCfg.moneda ?? historicos.moneda ?? "PEN",
        );
        const comRpc = await secundaria.rpc(
          "servicio_guardar_comercializacion_curso",
          {
            p_curso_id: cursoId,
            p_precio: gratuito ? 0 : Math.max(0, precioNum),
            p_gratuito: gratuito,
            p_moneda: moneda,
          },
        );
        if (comRpc.error) {
          console.warn(
            "servicio_guardar_comercializacion_curso:",
            comRpc.error.message,
          );
        }
      }

      const catalogo = await principal.rpc("org_upsert_curso_catalogo", {
        p_instalacion_id: instalacionId,
        p_curso_secundario_ref: cursoId,
        p_codigo: String(cursoSec.codigo ?? ""),
        p_titulo: String(cursoSec.titulo ?? "Curso sin título"),
        p_resumen: typeof cursoSec.resumen === "string" ? cursoSec.resumen : null,
        p_modalidad: String(cursoSec.modalidad ?? "VIRTUAL"),
        p_duracion_minutos: duracionMinutosDesdeCursoSec(cursoSec),
        p_imagen_publica_ref:
          typeof cursoSec.portadaClave === "string"
            ? cursoSec.portadaClave
            : null,
        p_version_publicada: Number(
          versionActual?.numero ?? cursoSec.totalVersiones ?? 1,
        ),
        p_estado_publicacion: estadoWorkflow,
        p_datos_historicos: historicos,
      });
      if (catalogo.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la principal 20260810191000_org_revision_catalogo.sql",
            details: catalogo.error.message,
          },
          200,
          corsHeaders,
        );
      }

      return json(
        {
          ok: true,
          estado: estadoWorkflow,
          curso: estadoSec.data?.curso ?? cursoSec,
          catalogo: catalogo.data,
        },
        200,
        corsHeaders,
      );
    }

    if (
      entrada.action === "crear-orden-compra" ||
      entrada.action === "obtener-orden-compra" ||
      entrada.action === "confirmar-pago-orden"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const compradorId = usuario.user.id;

      if (entrada.action === "crear-orden-compra") {
        const itemsEntrada = Array.isArray(entrada.items) ? entrada.items : [];
        const cursoIds = Array.isArray(entrada.cursoIds)
          ? entrada.cursoIds.map(String)
          : itemsEntrada
            .map((item: unknown) =>
              item && typeof item === "object"
                ? String((item as Record<string, unknown>).cursoId ?? "")
                : "",
            )
            .filter(Boolean);

        if (!cursoIds.length && !itemsEntrada.length) {
          return json(
            { error: "cursoIds o items requeridos" },
            400,
            corsHeaders,
          );
        }

        const items: Array<Record<string, unknown>> = [];
        const idsParaPrecio = itemsEntrada.length
          ? itemsEntrada
            .map((raw: unknown) => {
              if (!raw || typeof raw !== "object") return "";
              return String((raw as Record<string, unknown>).cursoId ?? "").trim();
            })
            .filter((id: string) => UUID_RE.test(id))
          : cursoIds.filter((id: string) => UUID_RE.test(String(id))).map(String);

        // Precio siempre desde secundaria (ignora importe del cliente).
        for (const cursoId of idsParaPrecio) {
          const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
            p_curso_id: cursoId,
          });
          if (detalle.error || !detalle.data?.curso) {
            return json(
              {
                ok: false,
                error: `No se pudo resolver el precio del curso ${cursoId}`,
                details: detalle.error?.message,
              },
              200,
              corsHeaders,
            );
          }
          const curso = detalle.data.curso as Record<string, unknown>;
          const precio = Number(curso.precio ?? 0);
          const gratuito = curso.gratuito === true || !(precio > 0);
          if (gratuito) {
            // Los gratuitos no van por checkout de pago.
            continue;
          }
          const tituloCliente =
            itemsEntrada.find((raw: unknown) =>
              raw &&
              typeof raw === "object" &&
              String((raw as Record<string, unknown>).cursoId ?? "") === cursoId,
            ) as Record<string, unknown> | undefined;
          items.push({
            cursoId,
            titulo:
              (typeof tituloCliente?.titulo === "string" && tituloCliente.titulo) ||
              curso.titulo ||
              "Curso",
            totalCentavos: Math.max(0, Math.round(precio * 100)),
          });
        }

        if (!items.length) {
          return json(
            {
              error:
                "No hay cursos de pago válidos para la orden. Los gratuitos se matriculan sin checkout.",
            },
            400,
            corsHeaders,
          );
        }

        const creada = await secundaria.rpc("servicio_crear_orden_compra", {
          p_comprador_identidad_ref: compradorId,
          p_items: items,
          p_moneda: typeof entrada.moneda === "string" ? entrada.moneda : "PEN",
        });
        if (creada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260810193000_orden_compra_checkout.sql",
              details: creada.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json(
          {
            ok: true,
            ...creada.data,
            precioAutorizadoServidor: true,
            pagoModo: (Deno.env.get("PAYMENT_MODE") ?? "simulacion").toLowerCase(),
          },
          200,
          corsHeaders,
        );
      }

      const ordenId =
        typeof entrada.ordenId === "string" ? entrada.ordenId.trim() : "";
      if (!ordenId || !UUID_RE.test(ordenId)) {
        return json({ error: "ordenId (uuid) requerido" }, 400, corsHeaders);
      }

      if (entrada.action === "obtener-orden-compra") {
        const orden = await secundaria.rpc("servicio_obtener_orden_compra", {
          p_orden_id: ordenId,
          p_comprador_identidad_ref: compradorId,
        });
        if (orden.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260810193000_orden_compra_checkout.sql",
              details: orden.error.message,
            },
            200,
            corsHeaders,
          );
        }
        if (!orden.data?.ok) {
          return json(
            {
              ok: false,
              error: orden.data?.error ?? "Orden no encontrada",
            },
            404,
            corsHeaders,
          );
        }
        return json({ ok: true, ...orden.data }, 200, corsHeaders);
      }

      // confirmar-pago-orden
      const pagoModo = (
        Deno.env.get("PAYMENT_MODE") ??
        Deno.env.get("IZIPAY_MODO") ??
        "simulacion"
      ).toLowerCase();
      const simulado =
        pagoModo === "simulacion" ||
        pagoModo === "simulation" ||
        pagoModo === "demo";
      const desdeWebhook = entrada.fromWebhook === true;
      const webhookSecret = Deno.env.get("IZIPAY_WEBHOOK_SECRET") ?? "";
      const headerSecret =
        req.headers.get("x-tukuy-webhook-secret") ??
        req.headers.get("x-izipay-webhook-secret") ??
        "";

      if (!simulado) {
        if (!desdeWebhook || !webhookSecret || headerSecret !== webhookSecret) {
          return json(
            {
              ok: false,
              error:
                "PAYMENT_MODE no es simulacion: confirma solo vía izipay-webhook (o pon PAYMENT_MODE=simulacion).",
              code: "CONFIRMACION_REQUIERE_WEBHOOK",
            },
            403,
            corsHeaders,
          );
        }
      }

      const confirmada = await secundaria.rpc("servicio_confirmar_pago_orden", {
        p_orden_id: ordenId,
        p_comprador_identidad_ref: compradorId,
        p_codigo_respuesta:
          typeof entrada.code === "string" ? entrada.code : "00",
        p_referencia_externa:
          typeof entrada.transactionId === "string"
            ? entrada.transactionId
            : null,
        p_proveedor: "izipay",
      });
      if (confirmada.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la secundaria 20260810193000_orden_compra_checkout.sql",
            details: confirmada.error.message,
          },
          200,
          corsHeaders,
        );
      }
      if (!confirmada.data?.ok) {
        return json(
          {
            ok: false,
            error: confirmada.data?.error ?? "No se pudo confirmar el pago",
          },
          200,
          corsHeaders,
        );
      }
      return json(
        {
          ok: true,
          ...confirmada.data,
          pagoModo,
          confirmacionSimulada: simulado && !desdeWebhook,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "matricular-estudiante") {
      const cursoId =
        typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
      const estudianteId =
        typeof entrada.estudianteId === "string"
          ? entrada.estudianteId.trim()
          : "";
      if (!cursoId || !UUID_RE.test(estudianteId)) {
        return json(
          { error: "cursoId y estudianteId (uuid) requeridos" },
          400,
          corsHeaders,
        );
      }

      // La autorización (permiso usuarios.administrar en la instalación) y la
      // pertenencia del estudiante se validan en la principal con el JWT del gestor.
      const resuelto = await principal.rpc(
        "org_resolver_estudiante_secundaria",
        {
          p_instalacion_id: instalacionId,
          p_identidad_id: estudianteId,
        },
      );
      if (resuelto.error) {
        const noAutorizado = /No autorizado/i.test(resuelto.error.message ?? "");
        return json(
          {
            ok: false,
            error: noAutorizado
              ? "No autorizado para matricular en esta organizacion"
              : "Falta ejecutar en la principal 20260810190000_org_matricula_secundaria.sql",
            details: resuelto.error.message,
          },
          noAutorizado ? 403 : 200,
          corsHeaders,
        );
      }
      if (!resuelto.data?.ok) {
        return json(
          {
            ok: false,
            error: resuelto.data?.error ??
              "La persona no es miembro activo de la organizacion",
          },
          403,
          corsHeaders,
        );
      }

      const alumno = resuelto.data as Record<string, unknown>;
      const authRef = String(alumno.authRef);

      // Upsert de la identidad/acceso del alumno en la secundaria para que
      // aparezca con nombre en listados aunque aún no haya iniciado sesión.
      let advertenciaSync: string | null = null;
      const sync = await secundaria.rpc("servicio_sincronizar_acceso", {
        p_identidad_principal_ref: authRef,
        p_membresia_principal_ref: String(alumno.membresiaId),
        p_correo: alumno.correo ?? null,
        p_nombre_mostrar: alumno.nombre ?? alumno.correo ?? null,
        p_perfiles: Array.isArray(alumno.perfiles) ? alumno.perfiles : [],
        p_permisos: Array.isArray(alumno.permisos) ? alumno.permisos : [],
        p_version_autorizacion: Number(alumno.versionAutorizacion ?? 1),
        p_estado: "ACTIVO",
      });
      if (sync.error) {
        advertenciaSync =
          `No se pudo sincronizar la identidad del alumno en la secundaria: ${sync.error.message}`;
      }

      const mat = await secundaria.rpc("servicio_matricular_estudiante", {
        p_curso_id: cursoId,
        p_estudiante_identidad_ref: authRef,
        p_origen: "ASIGNACION_ORGANIZACION",
      });
      if (mat.error) {
        return json(
          {
            ok: false,
            error: mat.error.message,
            details:
              "Si el error menciona read-only/cast: 20260812190000 (o 05258300) / 20260805252200 en secundaria.",
          },
          200,
          corsHeaders,
        );
      }
      return json(
        {
          ok: true,
          ...mat.data,
          estudianteIdentidadRef: authRef,
          advertenciaSync,
          matriculadoPor: usuario.user.id,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "solicitar-matricula") {
      const cursoId =
        typeof entrada.cursoId === "string" ? entrada.cursoId.trim() : "";
      const estudianteId =
        typeof entrada.estudianteId === "string"
          ? entrada.estudianteId.trim()
          : usuario.user.id;
      if (!cursoId || !UUID_RE.test(estudianteId)) {
        return json(
          { error: "cursoId y estudianteId (uuid) requeridos" },
          400,
          corsHeaders,
        );
      }

      const resuelto = await principal.rpc(
        "org_resolver_estudiante_secundaria",
        {
          p_instalacion_id: instalacionId,
          p_identidad_id: estudianteId,
        },
      );
      if (resuelto.error) {
        const noAutorizado = /No autorizado/i.test(
          resuelto.error.message ?? "",
        );
        return json(
          {
            ok: false,
            error: noAutorizado
              ? "No autorizado para solicitar matrícula en esta organizacion"
              : "Falta ejecutar en la principal 20260810190000_org_matricula_secundaria.sql",
            details: resuelto.error.message,
          },
          noAutorizado ? 403 : 200,
          corsHeaders,
        );
      }
      if (!resuelto.data?.ok) {
        return json(
          {
            ok: false,
            error: resuelto.data?.error ??
              "La persona no es miembro activo de la organizacion",
          },
          403,
          corsHeaders,
        );
      }

      const alumno = resuelto.data as Record<string, unknown>;
      const authRef = String(alumno.authRef);

      const sync = await secundaria.rpc("servicio_sincronizar_acceso", {
        p_identidad_principal_ref: authRef,
        p_membresia_principal_ref: String(alumno.membresiaId),
        p_correo: alumno.correo ?? null,
        p_nombre_mostrar: alumno.nombre ?? alumno.correo ?? null,
        p_perfiles: Array.isArray(alumno.perfiles) ? alumno.perfiles : [],
        p_permisos: Array.isArray(alumno.permisos) ? alumno.permisos : [],
        p_version_autorizacion: Number(alumno.versionAutorizacion ?? 1),
        p_estado: "ACTIVO",
      });
      if (sync.error) {
        // Continuar: la matrícula pendiente igual se crea.
      }

      const mat = await secundaria.rpc("servicio_matricular_con_estado", {
        p_curso_id: cursoId,
        p_estudiante_identidad_ref: authRef,
        p_origen: "SOLICITUD",
        p_estados_preferidos: ["PENDIENTE", "SOLICITADA", "EN_REVISION"],
      });
      if (mat.error) {
        return json(
          {
            ok: false,
            error: mat.error.message,
            details:
              "Ejecutar en secundaria 20260811162000_activar_matricula.sql",
          },
          200,
          corsHeaders,
        );
      }
      return json(
        {
          ok: true,
          ...mat.data,
          estudianteIdentidadRef: authRef,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "activar-matricula") {
      const matriculaId =
        typeof entrada.matriculaId === "string" ? entrada.matriculaId.trim() : "";
      const estudianteIdEntrada =
        typeof entrada.estudianteId === "string"
          ? entrada.estudianteId.trim()
          : "";
      if (!matriculaId || !UUID_RE.test(matriculaId)) {
        return json(
          { error: "matriculaId (uuid) requerido" },
          400,
          corsHeaders,
        );
      }

      // Si el cliente ya conoce al alumno, validar membresía antes de activar.
      if (estudianteIdEntrada && UUID_RE.test(estudianteIdEntrada)) {
        const resuelto = await principal.rpc(
          "org_resolver_estudiante_secundaria",
          {
            p_instalacion_id: instalacionId,
            p_identidad_id: estudianteIdEntrada,
          },
        );
        if (resuelto.error) {
          const noAutorizado = /No autorizado/i.test(
            resuelto.error.message ?? "",
          );
          return json(
            {
              ok: false,
              error: noAutorizado
                ? "No autorizado para aprobar matrículas en esta organizacion"
                : "Falta ejecutar en la principal 20260810190000_org_matricula_secundaria.sql",
              details: resuelto.error.message,
            },
            noAutorizado ? 403 : 200,
            corsHeaders,
          );
        }
        if (!resuelto.data?.ok) {
          return json(
            {
              ok: false,
              error: resuelto.data?.error ??
                "La persona no es miembro activo de la organizacion",
            },
            403,
            corsHeaders,
          );
        }
      }

      const act = await secundaria.rpc("servicio_activar_matricula", {
        p_matricula_id: matriculaId,
        p_actor_identidad_ref: usuario.user.id,
      });
      if (act.error) {
        return json(
          {
            ok: false,
            error: act.error.message,
            details:
              "Ejecutar en secundaria 20260811162000_activar_matricula.sql",
          },
          200,
          corsHeaders,
        );
      }

      const data = (act.data ?? {}) as Record<string, unknown>;
      return json(
        {
          ok: true,
          ...data,
          aprobadoPor: usuario.user.id,
        },
        200,
        corsHeaders,
      );
    }

    if (entrada.action === "sync-access") {
      const resolucion = await resolverContextosSincronizables();
      if (resolucion.error) {
        return json(
          {
            error: "No se pudieron resolver los contextos",
            details: resolucion.error,
          },
          502,
          corsHeaders,
        );
      }
      if (!resolucion.propios.length) {
        return json(
          { error: "El usuario no pertenece a esta organizacion" },
          403,
          corsHeaders,
        );
      }

      const sync = await sincronizarContextos(
        secundaria,
        usuario.user,
        resolucion.propios,
      );
      if (sync.error) {
        return json(
          { error: "No se pudo sincronizar el acceso", details: sync.error },
          502,
          corsHeaders,
        );
      }
      return json(
        {
          ok: true,
          membresiasSincronizadas: sync.membresiasSincronizadas,
          membresiasOrganizacion: sync.membresiasOrganizacion,
        },
        200,
        corsHeaders,
      );
    }

    return json({ error: "Accion no soportada" }, 400, corsHeaders);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Error interno" },
      500,
      corsHeaders,
    );
  }
});
