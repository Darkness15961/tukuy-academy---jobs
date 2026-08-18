-- Perfil público del docente (cargo, especialidad, bio, experiencia, foto).
-- Identidad ya tiene nombre y avatar; esto complementa lo que ve el alumno.
-- Ejecutar en SQL Editor del proyecto PRINCIPAL.
begin;

create table if not exists public.perfil_publico_docente (
  identidad_id uuid primary key
    references public.identidad_principal (id) on delete cascade,
  cargo text not null default '',
  especialidad text not null default '',
  biografia text not null default '',
  experiencia jsonb not null default '[]'::jsonb,
  foto_url text,
  actualizado_en timestamptz not null default now()
);

comment on table public.perfil_publico_docente is
  'Ficha pública del instructor: visible en el detalle del curso.';

alter table public.perfil_publico_docente enable row level security;

revoke all on table public.perfil_publico_docente
  from public, anon, authenticated;

create or replace function public.perfil_docente_publico(
  p_auth_usuario_ref uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identidad public.identidad_principal%rowtype;
  v_perfil public.perfil_publico_docente%rowtype;
  v_nombre text;
  v_foto text;
  v_experiencia jsonb;
begin
  if p_auth_usuario_ref is null then
    return jsonb_build_object('ok', false, 'error', 'Identidad requerida');
  end if;

  select * into v_identidad
  from public.identidad_principal
  where auth_usuario_ref = p_auth_usuario_ref
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'nombre', 'Docente',
      'cargo', '',
      'especialidad', '',
      'biografia', '',
      'experiencia', '[]'::jsonb,
      'fotoUrl', null
    );
  end if;

  select * into v_perfil
  from public.perfil_publico_docente
  where identidad_id = v_identidad.id;

  v_nombre := nullif(trim(coalesce(v_identidad.nombre_mostrar, '')), '');
  if v_nombre is null then
    v_nombre := nullif(trim(
      concat_ws(' ', v_identidad.nombres, v_identidad.apellidos)
    ), '');
  end if;
  v_nombre := coalesce(v_nombre, 'Docente');

  v_foto := nullif(trim(coalesce(v_perfil.foto_url, '')), '');
  if v_foto is null then
    v_foto := nullif(trim(coalesce(v_identidad.avatar_url, '')), '');
  end if;

  v_experiencia := coalesce(v_perfil.experiencia, '[]'::jsonb);
  if jsonb_typeof(v_experiencia) <> 'array' then
    v_experiencia := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'ok', true,
    'nombre', v_nombre,
    'cargo', coalesce(v_perfil.cargo, ''),
    'especialidad', coalesce(v_perfil.especialidad, ''),
    'biografia', coalesce(v_perfil.biografia, ''),
    'experiencia', v_experiencia,
    'fotoUrl', v_foto
  );
end;
$$;

create or replace function public.perfil_docente_mio()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.perfil_docente_publico(auth.uid());
end;
$$;

create or replace function public.perfil_docente_guardar(
  p_nombre text default null,
  p_cargo text default null,
  p_especialidad text default null,
  p_biografia text default null,
  p_experiencia jsonb default null,
  p_foto_url text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_identidad public.identidad_principal%rowtype;
  v_experiencia jsonb := coalesce(p_experiencia, '[]'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_identidad
  from public.identidad_principal
  where auth_usuario_ref = auth.uid()
  limit 1;

  if not found then
    raise exception 'Identidad no encontrada';
  end if;

  if jsonb_typeof(v_experiencia) <> 'array' then
    v_experiencia := '[]'::jsonb;
  end if;

  if p_nombre is not null and trim(p_nombre) <> '' then
    update public.identidad_principal
    set
      nombre_mostrar = trim(p_nombre),
      actualizada_en = now(),
      version_registro = version_registro + 1
    where id = v_identidad.id;
  end if;

  if p_foto_url is not null and trim(p_foto_url) <> '' then
    update public.identidad_principal
    set
      avatar_url = trim(p_foto_url),
      actualizada_en = now()
    where id = v_identidad.id
      and (
        avatar_url is null
        or avatar_url = ''
        or avatar_url not like 'http%'
      );
  end if;

  insert into public.perfil_publico_docente (
    identidad_id, cargo, especialidad, biografia, experiencia, foto_url, actualizado_en
  ) values (
    v_identidad.id,
    coalesce(trim(p_cargo), ''),
    coalesce(trim(p_especialidad), ''),
    coalesce(trim(p_biografia), ''),
    v_experiencia,
    nullif(trim(coalesce(p_foto_url, '')), ''),
    now()
  )
  on conflict (identidad_id) do update set
    cargo = excluded.cargo,
    especialidad = excluded.especialidad,
    biografia = excluded.biografia,
    experiencia = excluded.experiencia,
    foto_url = coalesce(excluded.foto_url, public.perfil_publico_docente.foto_url),
    actualizado_en = now();

  return public.perfil_docente_publico(auth.uid());
end;
$$;

revoke all on function public.perfil_docente_publico(uuid) from public;
grant execute on function public.perfil_docente_publico(uuid) to anon, authenticated;

revoke all on function public.perfil_docente_mio() from public, anon;
grant execute on function public.perfil_docente_mio() to authenticated;

revoke all on function public.perfil_docente_guardar(text, text, text, text, jsonb, text)
  from public, anon;
grant execute on function public.perfil_docente_guardar(text, text, text, text, jsonb, text)
  to authenticated;

commit;
