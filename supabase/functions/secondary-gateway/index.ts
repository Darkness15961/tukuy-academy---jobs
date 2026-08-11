import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const INSTALACION_TUKUY = "30000000-0000-4000-8000-000000000001";

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const desdeSecret = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
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

type Contexto = Record<string, unknown>;

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
    const secundariaUrl = Deno.env.get("SECONDARY_TUKUY_URL");
    const secundariaServiceRole = Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY");
    if (!secundariaUrl || !secundariaServiceRole) {
      return json(
        { error: "La conexion secundaria no tiene secretos configurados" },
        503,
        corsHeaders,
      );
    }

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
    const secundaria = createClient(secundariaUrl, secundariaServiceRole, {
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
        (contexto) => contexto.instalacion_organizacion_ref === INSTALACION_TUKUY,
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
      const instalacionId =
        typeof entrada.instalacionId === "string" && entrada.instalacionId
          ? entrada.instalacionId
          : INSTALACION_TUKUY;
      if (instalacionId !== INSTALACION_TUKUY) {
        return json(
          {
            error:
              "Este gateway solo verifica la secundaria de Tukuy Academy por ahora",
          },
          400,
          corsHeaders,
        );
      }

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
      entrada.action === "get-borrador" || entrada.action === "guardar-curso") {
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
            { error: "El usuario no pertenece a Tukuy Academy" },
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
        const borrador =
          entrada.borrador && typeof entrada.borrador === "object"
            ? entrada.borrador
            : {};
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
        return json(
          {
            ok: true,
            curso: guardado.data.curso,
            borrador: guardado.data.borrador,
            versionId: guardado.data.versionId,
          },
          200,
          corsHeaders,
        );
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
            { error: "El usuario no pertenece a Tukuy Academy" },
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
        p_estado: estadoPublicacion === "PUBLICADO" ? "PUBLICADO" : "BORRADOR",
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
      const horas = Number(versionActual?.horas ?? 1);
      const duracionMinutos = Math.max(1, Math.round(horas * 60));
      const versionNumero = Number(
        versionActual?.numero ?? cursoSec.totalVersiones ?? 1,
      );

      const catalogo = await principal.rpc(
        "admin_upsert_curso_catalogo_secundaria",
        {
          p_instalacion_id: INSTALACION_TUKUY,
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
        },
      );
      if (catalogo.error) {
        return json(
          {
            ok: false,
            error:
              "Falta ejecutar en la principal 20260805244000_publicar_curso_catalogo.sql",
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
      entrada.action === "guardar-apuntes"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a Tukuy Academy" },
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
                "Si el error menciona read-only/cast: 20260805258300 o 20260805252200 en secundaria.",
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
                ? "Ejecuta en la secundaria 20260805258300_contenido_aprendizaje_volatile.sql (obtener contenido no puede ser STABLE)"
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
                "Falta ejecutar en la secundaria 20260805255000_quizzes_notas_aprendizaje.sql (o 20260805245000)",
              details: progreso.error.message,
            },
            200,
            corsHeaders,
          );
        }
        return json({ ok: true, ...progreso.data }, 200, corsHeaders);
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
      entrada.action === "actualizar-estado-curso"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a Tukuy Academy" },
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
        const actualizada = await secundaria.rpc(
          "servicio_actualizar_estado_sesion",
          { p_sesion_id: sesionId, p_estado: estado },
        );
        if (actualizada.error) {
          return json(
            {
              ok: false,
              error:
                "Falta ejecutar en la secundaria 20260805249000_academia_sin_mock_estudiantes_sesiones.sql",
              details: actualizada.error.message,
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
                "Falta ejecutar en la secundaria 20260805249000_academia_sin_mock_estudiantes_sesiones.sql",
              details: actualizado.error.message,
            },
            200,
            corsHeaders,
          );
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
      return json({ ok: true, ...creada.data }, 200, corsHeaders);
    }

    if (
      entrada.action === "list-certificados" ||
      entrada.action === "list-certificados-pendientes" ||
      entrada.action === "list-mis-certificados" ||
      entrada.action === "emitir-certificado"
    ) {
      const resolucion = await resolverContextosSincronizables();
      const { data: esAdmin } = await principal.rpc("es_super_admin_actual");
      if (esAdmin !== true && (resolucion.error || !resolucion.propios.length)) {
        return json(
          { error: "El usuario no pertenece a Tukuy Academy" },
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

      let indicePublico: unknown = null;
      let advertenciaIndice: string | null = null;
      if (
        emitido.data?.certificadoId &&
        emitido.data?.documentoId &&
        emitido.data?.codigoVerificacion
      ) {
        const indice = await principal.rpc(
          "admin_upsert_indice_certificado_publico",
          {
            p_instalacion_id: INSTALACION_TUKUY,
            p_codigo_verificacion: emitido.data.codigoVerificacion,
            p_certificado_secundario_ref: emitido.data.certificadoId,
            p_documento_secundario_ref: emitido.data.documentoId,
            p_huella_documento: emitido.data.huellaDocumento ?? "",
            p_titular_historico: emitido.data.titular ?? "Titular",
            p_curso_historico: emitido.data.curso ?? "Curso",
            p_organizacion_historica:
              emitido.data.organizacion ?? "Tukuy Academy",
            p_emitido_en: emitido.data.emitidoEn ?? new Date().toISOString(),
            p_estado_publico: "VIGENTE",
          },
        );
        if (indice.error) {
          advertenciaIndice =
            `Certificado emitido en secundaria, pero falta 20260805248000_indice_certificado_publico.sql en la principal: ${indice.error.message}`;
        } else {
          indicePublico = indice.data;
        }
      }

      return json(
        {
          ok: true,
          ...emitido.data,
          indicePublico,
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
          { error: "El usuario no pertenece a Tukuy Academy" },
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
          { error: "El usuario no pertenece a Tukuy Academy" },
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
          { error: "El usuario no pertenece a Tukuy Academy" },
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
          { error: "El usuario no pertenece a Tukuy Academy" },
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
