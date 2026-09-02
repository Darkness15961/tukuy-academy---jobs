-- Recordatorios automáticos de sesiones en vivo (correo 24h y 1h antes).
begin;

alter table public.sesion_en_vivo
  add column if not exists recordatorio_24h_enviado_en timestamptz,
  add column if not exists recordatorio_1h_enviado_en timestamptz;

create or replace function public.servicio_listar_sesiones_pendientes_recordatorio(
  p_tipo text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_sesiones jsonb;
begin
  if v_tipo not in ('24h', '1h') then
    raise exception 'Tipo de recordatorio inválido: %', p_tipo;
  end if;

  select coalesce(jsonb_agg(item order by item->>'iniciaEn' asc), '[]'::jsonb)
  into v_sesiones
  from (
    select jsonb_build_object(
      'id', s.id,
      'cursoId', c.id,
      'cursoTitulo', c.titulo,
      'titulo', s.titulo,
      'urlAcceso', s.url_acceso,
      'iniciaEn', s.inicia_en,
      'destinatarios', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'correo', dest.correo,
            'nombre', dest.nombre
          )
          order by dest.correo
        )
        from (
          select distinct on (lower(trim(a.correo)))
            lower(trim(a.correo)) as correo,
            coalesce(a.nombre_mostrar, a.correo, 'Estudiante') as nombre
          from public.matricula_curso m
          join public.edicion_curso e2 on e2.id = m.edicion_curso_id
          join public.version_curso v2 on v2.id = e2.version_curso_id
          join public.acceso_identidad_principal a
            on a.identidad_principal_ref = m.estudiante_identidad_ref
          where v2.curso_id = c.id
            and coalesce(m.activo, true)
            and upper(trim(coalesce(m.estado::text, 'ACTIVA'))) not in (
              'PENDIENTE', 'CANCELADA', 'INACTIVA', 'RETIRADA'
            )
            and nullif(trim(coalesce(a.correo, '')), '') is not null
          order by lower(trim(a.correo))
        ) dest
      ), '[]'::jsonb)
    ) as item
    from public.sesion_en_vivo s
    join public.edicion_curso e on e.id = s.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where coalesce(s.estado, 'PROGRAMADA') not in ('CANCELADA', 'FINALIZADA')
      and s.inicia_en > now()
      and (
        (
          v_tipo = '24h'
          and s.recordatorio_24h_enviado_en is null
          and s.inicia_en > now() + interval '23 hours 45 minutes'
          and s.inicia_en <= now() + interval '24 hours 15 minutes'
        )
        or (
          v_tipo = '1h'
          and s.recordatorio_1h_enviado_en is null
          and s.inicia_en > now() + interval '50 minutes'
          and s.inicia_en <= now() + interval '70 minutes'
        )
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'tipo', v_tipo,
    'total', jsonb_array_length(v_sesiones),
    'sesiones', v_sesiones
  );
end;
$$;

create or replace function public.servicio_marcar_recordatorio_sesion_enviado(
  p_sesion_id uuid,
  p_tipo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
begin
  if p_sesion_id is null then
    raise exception 'Sesión requerida';
  end if;
  if v_tipo not in ('24h', '1h') then
    raise exception 'Tipo de recordatorio inválido: %', p_tipo;
  end if;

  if v_tipo = '24h' then
    update public.sesion_en_vivo
    set recordatorio_24h_enviado_en = now()
    where id = p_sesion_id;
  else
    update public.sesion_en_vivo
    set recordatorio_1h_enviado_en = now()
    where id = p_sesion_id;
  end if;

  if not found then
    raise exception 'Sesión no encontrada';
  end if;

  return jsonb_build_object('ok', true, 'sesionId', p_sesion_id, 'tipo', v_tipo);
end;
$$;

revoke all on function public.servicio_listar_sesiones_pendientes_recordatorio(text)
  from public, anon, authenticated;
revoke all on function public.servicio_marcar_recordatorio_sesion_enviado(uuid, text)
  from public, anon, authenticated;

grant execute on function public.servicio_listar_sesiones_pendientes_recordatorio(text)
  to service_role;
grant execute on function public.servicio_marcar_recordatorio_sesion_enviado(uuid, text)
  to service_role;

commit;
