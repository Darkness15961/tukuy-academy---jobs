-- WP8 · Facturación/comprobantes org + licencia (consumo cursos) + alertas operativas.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

-- ---------------------------------------------------------------------------
-- Facturación de la instalación (suscripción + plan + último pago)
-- ---------------------------------------------------------------------------

create or replace function public.org_obtener_facturacion(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_instalacion public.instalacion_organizacion;
  v_suscripcion public.suscripcion_organizacion;
  v_plan public.plan_saas;
  v_pago public.pago_saas;
  v_periodicidad text;
  v_proximo text;
  v_importe numeric;
  v_moneda text;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'facturacion.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'licencias.ver')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion
  where id = p_instalacion_id;
  if not found then
    raise exception 'La instalación indicada no existe.';
  end if;

  select s.*
  into v_suscripcion
  from public.suscripcion_organizacion s
  where s.instalacion_organizacion_id = p_instalacion_id
  order by s.creada_en desc
  limit 1;

  if v_suscripcion.plan_saas_ref is not null then
    select * into v_plan
    from public.plan_saas
    where id = v_suscripcion.plan_saas_ref;
  end if;

  select p.*
  into v_pago
  from public.pago_saas p
  join public.orden_saas o on o.id = p.orden_saas_id
  join public.suscripcion_organizacion s on s.id = o.suscripcion_organizacion_id
  where s.instalacion_organizacion_id = p_instalacion_id
  order by coalesce(p.confirmado_en, p.iniciado_en) desc nulls last
  limit 1;

  v_periodicidad := upper(coalesce(v_plan.periodicidad::text, 'MENSUAL'));
  if v_periodicidad not in ('MENSUAL', 'ANUAL') then
    v_periodicidad := 'MENSUAL';
  end if;

  v_moneda := upper(coalesce(nullif(trim(v_plan.moneda), ''), 'PEN'));
  if v_moneda not in ('PEN', 'USD') then
    v_moneda := 'PEN';
  end if;

  v_importe := coalesce(v_plan.precio_centavos, 0)::numeric / 100.0;

  if coalesce(v_instalacion.vigencia_indefinida, false)
    or v_instalacion.clasificacion = 'INTERNA'
  then
    v_proximo := '—';
  elsif v_suscripcion.vigente_hasta is not null then
    v_proximo := to_char(v_suscripcion.vigente_hasta, 'YYYY-MM-DD');
  else
    v_proximo := '—';
  end if;

  return jsonb_build_object(
    'plan', coalesce(
      v_plan.nombre,
      case
        when v_instalacion.clasificacion = 'INTERNA' then 'Operación interna'
        else 'Sin plan comercial'
      end
    ),
    'periodicidad', v_periodicidad,
    'proximoCobro', v_proximo,
    'importe', v_importe,
    'moneda', v_moneda,
    'tarjetaMarca', coalesce(nullif(trim(v_pago.proveedor), ''), '—'),
    'tarjetaUltimos4', '—',
    'tarjetaVencimiento', '—',
    'soloLectura', true,
    'mensajeGestion',
      'Los cambios de plan y medio de pago los gestiona administración Tukuy.'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Comprobantes = órdenes SaaS de la suscripción de la instalación
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_comprobantes(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'facturacion.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'licencias.ver')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item->>'fecha' desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', o.id,
      'numero', o.numero,
      'fecha', to_char(coalesce(o.pagada_en, o.creada_en), 'YYYY-MM-DD'),
      'concepto', coalesce(nullif(trim(o.concepto), ''), 'Suscripción SaaS'),
      'importe', round(coalesce(o.total_centavos, 0)::numeric / 100.0, 2),
      'moneda', upper(coalesce(nullif(trim(o.moneda), ''), 'PEN')),
      'estado', case
        when upper(coalesce(p.estado::text, o.estado::text, '')) in (
          'PAGADA', 'PAGADO', 'CONFIRMADO', 'APROBADO'
        ) then 'PAGADO'
        when upper(coalesce(p.estado::text, o.estado::text, '')) in (
          'ANULADA', 'ANULADO', 'CANCELADO', 'FALLIDA'
        ) then 'ANULADO'
        else 'PENDIENTE'
      end
    ) as item
    from public.orden_saas o
    join public.suscripcion_organizacion s
      on s.id = o.suscripcion_organizacion_id
    left join lateral (
      select pg.*
      from public.pago_saas pg
      where pg.orden_saas_id = o.id
      order by coalesce(pg.confirmado_en, pg.iniciado_en) desc nulls last
      limit 1
    ) p on true
    where s.instalacion_organizacion_id = p_instalacion_id
  ) listado;

  return jsonb_build_object('ok', true, 'comprobantes', v_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- Licencia: consumo real de cursos (+ límites de plan)
-- ---------------------------------------------------------------------------

create or replace function public.org_obtener_licencia(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_instalacion public.instalacion_organizacion;
  v_suscripcion public.suscripcion_organizacion;
  v_plan public.plan_saas;
  v_estado text;
  v_usuarios bigint;
  v_docentes bigint;
  v_cursos bigint;
  v_limite_usuarios bigint;
  v_limite_docentes bigint;
  v_limite_cursos bigint;
  v_limite_almacenamiento bigint;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'licencias.ver')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion
  where id = p_instalacion_id;
  if not found then
    raise exception 'La instalación indicada no existe.';
  end if;

  select s.*
  into v_suscripcion
  from public.suscripcion_organizacion s
  where s.instalacion_organizacion_id = p_instalacion_id
  order by s.creada_en desc
  limit 1;

  if v_suscripcion.plan_saas_ref is not null then
    select * into v_plan
    from public.plan_saas
    where id = v_suscripcion.plan_saas_ref;
  end if;

  select count(*) into v_usuarios
  from public.membresia_principal m
  where m.instalacion_organizacion_ref = p_instalacion_id
    and m.estado = 'ACTIVA';

  select count(distinct m.identidad_principal_id) into v_docentes
  from public.membresia_principal m
  join public.funcion_principal f on f.membresia_principal_id = m.id
  join public.perfil_principal p on p.id = f.perfil_principal_id
  where m.instalacion_organizacion_ref = p_instalacion_id
    and m.estado = 'ACTIVA'
    and f.estado = 'ACTIVA'
    and p.codigo = 'INSTRUCTOR';

  select count(*) into v_cursos
  from public.curso_catalogo c
  where c.instalacion_proveedora_id = p_instalacion_id
    and c.estado_publicacion::text <> 'RETIRADO';

  select coalesce((
    select l.limite
    from public.limite_plan l
    where v_plan.id is not null
      and l.plan_saas_id = v_plan.id
      and l.codigo_recurso in ('USUARIOS', 'ESTUDIANTES')
    order by case when l.codigo_recurso = 'USUARIOS' then 0 else 1 end
    limit 1
  ), 0) into v_limite_usuarios;

  select coalesce((
    select l.limite
    from public.limite_plan l
    where v_plan.id is not null
      and l.plan_saas_id = v_plan.id
      and l.codigo_recurso in ('DOCENTES', 'INSTRUCTORES')
    limit 1
  ), 0) into v_limite_docentes;

  select coalesce((
    select l.limite
    from public.limite_plan l
    where v_plan.id is not null
      and l.plan_saas_id = v_plan.id
      and l.codigo_recurso = 'CURSOS'
    limit 1
  ), 0) into v_limite_cursos;

  select coalesce((
    select l.limite
    from public.limite_plan l
    where v_plan.id is not null
      and l.plan_saas_id = v_plan.id
      and l.codigo_recurso in ('ALMACENAMIENTO', 'STORAGE', 'GB')
    limit 1
  ), 0) into v_limite_almacenamiento;

  if v_instalacion.clasificacion = 'INTERNA'
    or coalesce(v_instalacion.vigencia_indefinida, false)
  then
    v_estado := 'ACTIVA';
  elsif v_suscripcion.id is null then
    v_estado := 'VENCIDA';
  elsif v_suscripcion.estado::text in ('ACTIVA', 'PRUEBA') then
    if v_suscripcion.vigente_hasta is not null
      and v_suscripcion.vigente_hasta < now() + interval '30 days'
      and v_suscripcion.vigente_hasta >= now()
    then
      v_estado := 'POR_VENCER';
    elsif v_suscripcion.vigente_hasta is not null
      and v_suscripcion.vigente_hasta < now()
    then
      v_estado := 'VENCIDA';
    else
      v_estado := 'ACTIVA';
    end if;
  else
    v_estado := 'VENCIDA';
  end if;

  return jsonb_build_object(
    'plan', coalesce(
      v_plan.nombre,
      case
        when v_instalacion.clasificacion = 'INTERNA' then 'Operación interna'
        else 'Sin plan'
      end
    ),
    'descripcion', coalesce(
      v_plan.descripcion,
      v_instalacion.nombre_organizacion
    ),
    'inicio', coalesce(
      to_char(v_suscripcion.vigente_desde, 'YYYY-MM-DD'),
      to_char(v_instalacion.creada_en, 'YYYY-MM-DD')
    ),
    'fin', case
      when coalesce(v_instalacion.vigencia_indefinida, false) then 'Indefinida'
      when v_suscripcion.vigente_hasta is null then 'Sin vencimiento'
      else to_char(v_suscripcion.vigente_hasta, 'YYYY-MM-DD')
    end,
    'estado', v_estado,
    'soloLectura', true,
    'consumos', jsonb_build_array(
      jsonb_build_object(
        'id', 'usuarios',
        'etiqueta', 'Usuarios activos',
        'utilizado', v_usuarios,
        'limite', greatest(v_limite_usuarios, v_usuarios),
        'unidad', 'usuarios'
      ),
      jsonb_build_object(
        'id', 'docentes',
        'etiqueta', 'Docentes',
        'utilizado', v_docentes,
        'limite', greatest(v_limite_docentes, v_docentes),
        'unidad', 'docentes'
      ),
      jsonb_build_object(
        'id', 'cursos',
        'etiqueta', 'Cursos en catálogo',
        'utilizado', v_cursos,
        'limite', greatest(v_limite_cursos, v_cursos),
        'unidad', 'cursos'
      ),
      jsonb_build_object(
        'id', 'almacenamiento',
        'etiqueta', 'Almacenamiento (cupo plan)',
        'utilizado', 0,
        'limite', v_limite_almacenamiento,
        'unidad', 'GB'
      )
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Alertas operativas (notificaciones sintetizadas, sin tabla de inbox)
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_alertas_operativas(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_licencia jsonb;
  v_usuarios jsonb;
  v_revision bigint;
  v_asignaciones bigint;
begin
  if p_instalacion_id is null
    or not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  begin
    v_licencia := public.org_obtener_licencia(p_instalacion_id);
  exception
    when others then
      v_licencia := null;
  end;

  if v_licencia is not null then
    if v_licencia->>'estado' = 'POR_VENCER' then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', 'alerta-licencia-por-vencer',
        'titulo', 'Licencia por vencer',
        'detalle', format(
          'El plan %s vence el %s. Coordina la renovación con administración Tukuy.',
          coalesce(v_licencia->>'plan', 'actual'),
          coalesce(v_licencia->>'fin', 'próximamente')
        ),
        'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'leida', false,
        'ruta', '/organizacion/licencia'
      ));
    elsif v_licencia->>'estado' = 'VENCIDA' then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', 'alerta-licencia-vencida',
        'titulo', 'Licencia vencida',
        'detalle', 'La suscripción no está vigente. Revisa facturación o contacta a Tukuy.',
        'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'leida', false,
        'ruta', '/organizacion/facturacion'
      ));
    end if;

    select item
    into v_usuarios
    from jsonb_array_elements(coalesce(v_licencia->'consumos', '[]'::jsonb)) item
    where item->>'id' = 'usuarios'
    limit 1;

    if v_usuarios is not null
      and nullif(v_usuarios->>'limite', '')::numeric > 0
      and (nullif(v_usuarios->>'utilizado', '')::numeric
        / nullif(v_usuarios->>'limite', '')::numeric) >= 0.85
    then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', 'alerta-consumo-usuarios',
        'titulo', 'Consumo alto de licencias',
        'detalle', format(
          'Usas %s de %s usuarios del plan (%s%%).',
          v_usuarios->>'utilizado',
          v_usuarios->>'limite',
          round(
            100 * nullif(v_usuarios->>'utilizado', '')::numeric
              / nullif(v_usuarios->>'limite', '')::numeric
          )::text
        ),
        'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'leida', false,
        'ruta', '/organizacion/licencia'
      ));
    end if;
  end if;

  if to_regclass('public.curso_catalogo') is not null then
    select count(*) into v_revision
    from public.curso_catalogo c
    where c.instalacion_proveedora_id = p_instalacion_id
      and c.estado_publicacion::text in ('EN_REVISION', 'CONTENIDO_REVISADO');
    if coalesce(v_revision, 0) > 0 then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', 'alerta-cursos-revision',
        'titulo', 'Cursos por revisar',
        'detalle', format(
          'Hay %s propuesta(s) de curso esperando revisión o aprobación.',
          v_revision
        ),
        'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'leida', false,
        'ruta', '/organizacion/cursos'
      ));
    end if;
  end if;

  if to_regclass('public.org_asignacion') is not null then
    select count(*) into v_asignaciones
    from public.org_asignacion a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.estado = 'ACTIVA'
      and a.asignados > a.completados;
    if coalesce(v_asignaciones, 0) > 0 then
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', 'alerta-asignaciones-pendientes',
        'titulo', 'Asignaciones con avance pendiente',
        'detalle', format(
          '%s asignación(es) activa(s) aún no completaron a todos los destinatarios.',
          v_asignaciones
        ),
        'fecha', to_char(now() at time zone 'America/Lima', 'YYYY-MM-DD"T"HH24:MI:SS'),
        'leida', false,
        'ruta', '/organizacion/asignaciones'
      ));
    end if;
  end if;

  return jsonb_build_object('ok', true, 'alertas', v_items);
end;
$$;

revoke all on function public.org_obtener_facturacion(uuid) from public;
revoke all on function public.org_listar_comprobantes(uuid) from public;
revoke all on function public.org_obtener_licencia(uuid) from public;
revoke all on function public.org_listar_alertas_operativas(uuid) from public;

grant execute on function public.org_obtener_facturacion(uuid) to authenticated;
grant execute on function public.org_listar_comprobantes(uuid) to authenticated;
grant execute on function public.org_obtener_licencia(uuid) to authenticated;
grant execute on function public.org_listar_alertas_operativas(uuid) to authenticated;

commit;
