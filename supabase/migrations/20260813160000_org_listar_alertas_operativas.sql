-- Alertas operativas para portal organización.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL (no secundaria).
-- Corrige PGRST202: Could not find the function public.org_listar_alertas_operativas(p_instalacion_id)

begin;

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

  -- Licencia / consumo (si la RPC existe)
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

revoke all on function public.org_listar_alertas_operativas(uuid) from public;
grant execute on function public.org_listar_alertas_operativas(uuid) to authenticated;
grant execute on function public.org_listar_alertas_operativas(uuid) to service_role;

notify pgrst, 'reload schema';

commit;
