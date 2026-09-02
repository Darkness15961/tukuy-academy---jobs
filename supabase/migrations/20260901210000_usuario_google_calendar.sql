-- PRINCIPAL: tokens OAuth de Google Calendar por usuario (clases en vivo en su agenda).
begin;

create table if not exists public.usuario_google_calendar (
  identidad_id uuid primary key
    references public.identidad_principal(id) on delete cascade,
  google_email text not null,
  refresh_token text not null,
  scopes text[] not null default array[
    'https://www.googleapis.com/auth/calendar.events'
  ]::text[],
  conectado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists usuario_google_calendar_email_idx
  on public.usuario_google_calendar (lower(google_email));

alter table public.usuario_google_calendar enable row level security;

-- Sin políticas directas: solo RPCs security definer / service_role.

create or replace function public.google_calendar_estado_mio()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identidad_id uuid;
  v_row public.usuario_google_calendar%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select id into v_identidad_id
  from public.identidad_principal
  where auth_usuario_ref = auth.uid()
  limit 1;

  if v_identidad_id is null then
    return jsonb_build_object('ok', true, 'conectado', false);
  end if;

  select * into v_row
  from public.usuario_google_calendar
  where identidad_id = v_identidad_id;

  if not found then
    return jsonb_build_object('ok', true, 'conectado', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'conectado', true,
    'googleEmail', v_row.google_email,
    'conectadoEn', v_row.conectado_en,
    'scopes', to_jsonb(v_row.scopes)
  );
end;
$$;

create or replace function public.google_calendar_desconectar_mio()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_identidad_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select id into v_identidad_id
  from public.identidad_principal
  where auth_usuario_ref = auth.uid()
  limit 1;

  if v_identidad_id is null then
    return jsonb_build_object('ok', true, 'conectado', false);
  end if;

  delete from public.usuario_google_calendar
  where identidad_id = v_identidad_id;

  return jsonb_build_object('ok', true, 'conectado', false);
end;
$$;

create or replace function public.google_calendar_guardar_token(
  p_auth_usuario_ref uuid,
  p_google_email text,
  p_refresh_token text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_identidad_id uuid;
  v_email text := lower(trim(coalesce(p_google_email, '')));
  v_token text := trim(coalesce(p_refresh_token, ''));
begin
  if p_auth_usuario_ref is null then
    raise exception 'Usuario requerido';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Correo Google inválido';
  end if;
  if v_token = '' then
    raise exception 'Refresh token requerido';
  end if;

  select id into v_identidad_id
  from public.identidad_principal
  where auth_usuario_ref = p_auth_usuario_ref
  limit 1;

  if v_identidad_id is null then
    raise exception 'Identidad no encontrada para el usuario';
  end if;

  insert into public.usuario_google_calendar (
    identidad_id,
    google_email,
    refresh_token
  ) values (
    v_identidad_id,
    v_email,
    v_token
  )
  on conflict (identidad_id) do update set
    google_email = excluded.google_email,
    refresh_token = excluded.refresh_token,
    actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'conectado', true,
    'googleEmail', v_email,
    'identidadId', v_identidad_id
  );
end;
$$;

create or replace function public.google_calendar_tokens_por_correos(
  p_correos text[]
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
      'identidadId', i.id,
      'correo', lower(trim(i.correo)),
      'googleEmail', u.google_email,
      'refreshToken', u.refresh_token
    ) as item
    from public.usuario_google_calendar u
    join public.identidad_principal i on i.id = u.identidad_id
    where lower(trim(coalesce(i.correo, ''))) = any (
      select lower(trim(c)) from unnest(coalesce(p_correos, array[]::text[])) as c
      where trim(c) <> '' and position('@' in trim(c)) > 0
    )
       or lower(trim(u.google_email)) = any (
      select lower(trim(c)) from unnest(coalesce(p_correos, array[]::text[])) as c
      where trim(c) <> '' and position('@' in trim(c)) > 0
    )
  ) listado;

  return jsonb_build_object('ok', true, 'usuarios', v_items);
end;
$$;

revoke all on function public.google_calendar_estado_mio() from public;
revoke all on function public.google_calendar_desconectar_mio() from public;
revoke all on function public.google_calendar_guardar_token(uuid, text, text) from public;
revoke all on function public.google_calendar_tokens_por_correos(text[]) from public;

grant execute on function public.google_calendar_estado_mio() to authenticated;
grant execute on function public.google_calendar_desconectar_mio() to authenticated;
grant execute on function public.google_calendar_guardar_token(uuid, text, text) to service_role;
grant execute on function public.google_calendar_tokens_por_correos(text[]) to service_role;

commit;
