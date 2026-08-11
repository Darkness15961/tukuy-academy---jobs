-- Auto-alta de alumnos en Tukuy Academy.
-- Todo usuario autenticado (email o Google) recibe membresía ORGANIZACION
-- + función STUDENT en la instalación Tukuy Academy, de forma idempotente.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.asegurar_alumno_tukuy_academy(
  p_identidad_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instalacion public.instalacion_organizacion;
  v_perfil public.perfil_principal;
  v_membresia_id uuid;
  v_funcion_id uuid;
begin
  if p_identidad_id is null then
    raise exception 'Identidad requerida';
  end if;

  if not exists (
    select 1
    from public.identidad_principal i
    where i.id = p_identidad_id
      and i.estado = 'ACTIVO'
  ) then
    raise exception 'Identidad no encontrada o inactiva';
  end if;

  select *
  into v_instalacion
  from public.instalacion_organizacion
  where id = '30000000-0000-4000-8000-000000000001'::uuid;

  if not found then
    raise exception
      'Falta la instalación Tukuy Academy (30000000-0000-4000-8000-000000000001)';
  end if;

  select *
  into v_perfil
  from public.perfil_principal
  where codigo = 'STUDENT'
    and estado = 'ACTIVO';

  if not found then
    raise exception 'Falta el perfil STUDENT en perfil_principal';
  end if;

  select m.id
  into v_membresia_id
  from public.membresia_principal m
  where m.identidad_principal_id = p_identidad_id
    and m.alcance_tipo = 'ORGANIZACION'
    and m.tenant_ref = v_instalacion.tenant_ref
    and m.estado in ('PENDIENTE', 'ACTIVA')
  limit 1;

  if v_membresia_id is null then
    insert into public.membresia_principal (
      identidad_principal_id,
      empresa_principal_ref,
      empresa_sistema_ref,
      tenant_ref,
      instalacion_organizacion_ref,
      alcance_tipo,
      estado
    ) values (
      p_identidad_id,
      v_instalacion.empresa_principal_ref,
      v_instalacion.empresa_sistema_ref,
      v_instalacion.tenant_ref,
      v_instalacion.id,
      'ORGANIZACION',
      'ACTIVA'
    )
    returning id into v_membresia_id;
  else
    update public.membresia_principal
    set
      estado = 'ACTIVA',
      instalacion_organizacion_ref = coalesce(
        instalacion_organizacion_ref,
        v_instalacion.id
      ),
      empresa_principal_ref = coalesce(
        empresa_principal_ref,
        v_instalacion.empresa_principal_ref
      ),
      empresa_sistema_ref = coalesce(
        empresa_sistema_ref,
        v_instalacion.empresa_sistema_ref
      ),
      actualizada_en = now()
    where id = v_membresia_id;
  end if;

  insert into public.funcion_principal (
    membresia_principal_id,
    perfil_principal_id,
    codigo,
    alcance,
    es_principal,
    estado
  ) values (
    v_membresia_id,
    v_perfil.id,
    v_perfil.codigo,
    jsonb_build_object('tipo', 'ENTIDAD'),
    true,
    'ACTIVA'
  )
  on conflict (membresia_principal_id, codigo) do update set
    perfil_principal_id = excluded.perfil_principal_id,
    estado = 'ACTIVA',
    vigente_hasta = null,
    actualizada_en = now(),
    version_registro = public.funcion_principal.version_registro + 1
  returning id into v_funcion_id;

  update public.membresia_principal
  set
    version_autorizacion = version_autorizacion + 1,
    actualizada_en = now()
  where id = v_membresia_id;

  return v_funcion_id;
end;
$$;

comment on function public.asegurar_alumno_tukuy_academy(uuid) is
  'Garantiza membresía ORGANIZACION + función STUDENT en Tukuy Academy.';

-- Callable por el usuario autenticado (login / callback OAuth).
create or replace function public.asegurar_mi_acceso_alumno_tukuy()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad_id uuid;
  v_funcion_id uuid;
begin
  select i.id
  into v_identidad_id
  from public.identidad_principal i
  where i.auth_usuario_ref = (select auth.uid())
    and i.estado = 'ACTIVO'
  limit 1;

  if v_identidad_id is null then
    raise exception 'No hay identidad activa para la sesión actual';
  end if;

  v_funcion_id := public.asegurar_alumno_tukuy_academy(v_identidad_id);
  return v_funcion_id;
end;
$$;

-- Extiende el trigger Auth → identidad para auto-matricular alumnos.
create or replace function public.registrar_identidad_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nombre_completo text;
begin
  nombre_completo := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.identidad_principal (
    id,
    auth_usuario_ref,
    correo,
    nombres,
    apellidos,
    nombre_mostrar,
    avatar_url,
    proveedor,
    ultimo_acceso_en
  ) values (
    new.id,
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'nombres',
      new.raw_user_meta_data ->> 'first_name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data ->> 'apellidos',
      new.raw_user_meta_data ->> 'last_name',
      ''
    ),
    nombre_completo,
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.last_sign_in_at
  )
  on conflict (auth_usuario_ref) do update set
    correo = excluded.correo,
    nombre_mostrar = coalesce(
      nullif(public.identidad_principal.nombre_mostrar, ''),
      excluded.nombre_mostrar
    ),
    nombres = coalesce(
      nullif(public.identidad_principal.nombres, ''),
      excluded.nombres
    ),
    apellidos = coalesce(
      nullif(public.identidad_principal.apellidos, ''),
      excluded.apellidos
    ),
    avatar_url = coalesce(
      excluded.avatar_url,
      public.identidad_principal.avatar_url
    ),
    proveedor = excluded.proveedor,
    ultimo_acceso_en = excluded.ultimo_acceso_en,
    actualizada_en = now(),
    version_registro = public.identidad_principal.version_registro + 1;

  -- Todo usuario nuevo (o al actualizar auth) queda como alumno de Tukuy Academy.
  perform public.asegurar_alumno_tukuy_academy(new.id);

  return new;
end;
$$;

drop trigger if exists identidad_principal_despues_auth on auth.users;
create trigger identidad_principal_despues_auth
  after insert or update of email, raw_user_meta_data, raw_app_meta_data, last_sign_in_at
  on auth.users
  for each row execute function public.registrar_identidad_desde_auth();

-- Backfill: identidades activas sin función STUDENT en Tukuy Academy.
do $$
declare
  r record;
  v_ok integer := 0;
  v_err integer := 0;
begin
  for r in
    select i.id
    from public.identidad_principal i
    where i.estado = 'ACTIVO'
      and not exists (
        select 1
        from public.membresia_principal m
        join public.funcion_principal f
          on f.membresia_principal_id = m.id
        where m.identidad_principal_id = i.id
          and m.instalacion_organizacion_ref =
            '30000000-0000-4000-8000-000000000001'::uuid
          and m.estado in ('PENDIENTE', 'ACTIVA')
          and f.codigo = 'STUDENT'
          and f.estado = 'ACTIVA'
      )
  loop
    begin
      perform public.asegurar_alumno_tukuy_academy(r.id);
      v_ok := v_ok + 1;
    exception
      when others then
        v_err := v_err + 1;
        raise notice 'No se pudo auto-alta alumno %: %', r.id, sqlerrm;
    end;
  end loop;

  raise notice
    'Backfill alumno Tukuy Academy: % ok, % errores',
    v_ok,
    v_err;
end;
$$;

revoke all on function public.asegurar_alumno_tukuy_academy(uuid)
  from public, anon, authenticated;
revoke all on function public.asegurar_mi_acceso_alumno_tukuy()
  from public, anon;

grant execute on function public.asegurar_alumno_tukuy_academy(uuid)
  to service_role;
grant execute on function public.asegurar_mi_acceso_alumno_tukuy()
  to authenticated, service_role;

commit;
