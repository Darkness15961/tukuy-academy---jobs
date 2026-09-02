-- SECUNDARIA: vínculo sesión ↔ evento en Google Calendar personal del usuario.
begin;

create table if not exists public.sesion_calendario_usuario (
  id uuid primary key default gen_random_uuid(),
  sesion_en_vivo_id uuid not null
    references public.sesion_en_vivo(id) on delete cascade,
  estudiante_identidad_ref uuid not null,
  google_event_id text not null,
  google_email text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint sesion_calendario_usuario_unica
    unique (sesion_en_vivo_id, estudiante_identidad_ref)
);

create index if not exists sesion_calendario_usuario_sesion_idx
  on public.sesion_calendario_usuario (sesion_en_vivo_id);

create or replace function public.servicio_upsert_sesion_calendario_usuario(
  p_sesion_id uuid,
  p_identidad_ref uuid,
  p_google_event_id text,
  p_google_email text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_sesion_id is null or p_identidad_ref is null then
    raise exception 'Sesión e identidad requeridas';
  end if;
  if nullif(trim(coalesce(p_google_event_id, '')), '') is null then
    raise exception 'google_event_id requerido';
  end if;

  insert into public.sesion_calendario_usuario (
    sesion_en_vivo_id,
    estudiante_identidad_ref,
    google_event_id,
    google_email
  ) values (
    p_sesion_id,
    p_identidad_ref,
    trim(p_google_event_id),
    lower(trim(coalesce(p_google_email, '')))
  )
  on conflict on constraint sesion_calendario_usuario_unica do update set
    google_event_id = excluded.google_event_id,
    google_email = excluded.google_email,
    actualizado_en = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.servicio_listar_sesion_calendario_usuario(
  p_sesion_id uuid
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
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'identidadId', sc.estudiante_identidad_ref,
      'googleEventId', sc.google_event_id,
      'googleEmail', sc.google_email
    ) as item
    from public.sesion_calendario_usuario sc
    where sc.sesion_en_vivo_id = p_sesion_id
  ) listado;

  return jsonb_build_object('ok', true, 'eventos', v_items);
end;
$$;

create or replace function public.servicio_eliminar_sesion_calendario_usuario(
  p_sesion_id uuid,
  p_identidad_ref uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_sesion_id is null then
    raise exception 'Sesión requerida';
  end if;

  if p_identidad_ref is null then
    delete from public.sesion_calendario_usuario
    where sesion_en_vivo_id = p_sesion_id;
  else
    delete from public.sesion_calendario_usuario
    where sesion_en_vivo_id = p_sesion_id
      and estudiante_identidad_ref = p_identidad_ref;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.servicio_upsert_sesion_calendario_usuario(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_sesion_calendario_usuario(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_eliminar_sesion_calendario_usuario(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_upsert_sesion_calendario_usuario(uuid, uuid, text, text)
  to service_role;
grant execute on function public.servicio_listar_sesion_calendario_usuario(uuid)
  to service_role;
grant execute on function public.servicio_eliminar_sesion_calendario_usuario(uuid, uuid)
  to service_role;

commit;
