-- Portal organización · Fase 1
-- Miembros y licencia de la instalación actual (scoped, no admin_*).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

-- ---------------------------------------------------------------------------
-- Guardias de autorización por instalación
-- ---------------------------------------------------------------------------

create or replace function public.org_es_miembro_instalacion(
  p_instalacion_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.es_super_admin_actual()
    or exists (
      select 1
      from public.identidad_principal identidad
      join public.membresia_principal membresia
        on membresia.identidad_principal_id = identidad.id
      join public.funcion_principal funcion
        on funcion.membresia_principal_id = membresia.id
      where identidad.auth_usuario_ref = (select auth.uid())
        and identidad.estado = 'ACTIVO'
        and membresia.estado = 'ACTIVA'
        and membresia.alcance_tipo = 'ORGANIZACION'
        and membresia.instalacion_organizacion_ref = p_instalacion_id
        and funcion.estado = 'ACTIVA'
        and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
        and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
    );
$$;

create or replace function public.org_tiene_permiso(
  p_instalacion_id uuid,
  p_permiso text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.es_super_admin_actual()
    or exists (
      select 1
      from public.identidad_principal identidad
      join public.membresia_principal membresia
        on membresia.identidad_principal_id = identidad.id
      join public.funcion_principal funcion
        on funcion.membresia_principal_id = membresia.id
      where identidad.auth_usuario_ref = (select auth.uid())
        and identidad.estado = 'ACTIVO'
        and membresia.estado = 'ACTIVA'
        and membresia.alcance_tipo = 'ORGANIZACION'
        and membresia.instalacion_organizacion_ref = p_instalacion_id
        and funcion.estado = 'ACTIVA'
        and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
        and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
        and p_permiso = any (public.permisos_efectivos_funcion(funcion.id))
    );
$$;

revoke all on function public.org_es_miembro_instalacion(uuid) from public;
revoke all on function public.org_tiene_permiso(uuid, text) from public;
grant execute on function public.org_es_miembro_instalacion(uuid) to authenticated;
grant execute on function public.org_tiene_permiso(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Catálogo de perfiles asignables por la org
-- ---------------------------------------------------------------------------

create or replace function public.org_catalogo_perfiles(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'usuarios.ver')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', perfil.id,
    'codigo', perfil.codigo,
    'nombre', perfil.nombre,
    'descripcion', perfil.descripcion,
    'portal', perfil.portal,
    'nivel', perfil.nivel,
    'permisos', coalesce((
      select jsonb_agg(permiso.codigo order by permiso.codigo)
      from public.perfil_permiso_principal pp
      join public.permiso_principal permiso on permiso.id = pp.permiso_principal_id
      where pp.perfil_principal_id = perfil.id
        and permiso.estado = 'ACTIVO'
    ), '[]'::jsonb)
  ) order by perfil.nombre), '[]'::jsonb)
  into v_resultado
  from public.perfil_principal perfil
  where perfil.estado = 'ACTIVO'
    and perfil.nivel = 'ORGANIZACION'
    and perfil.codigo in (
      'ORGANIZATION_OWNER',
      'ORGANIZATION_ADMIN',
      'TRAINING_MANAGER',
      'INSTRUCTOR',
      'STUDENT'
    );

  return v_resultado;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar miembros de la instalación
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_miembros(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'usuarios.ver')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item->>'nombre'), '[]'::jsonb)
  into v_resultado
  from (
    select jsonb_build_object(
      'identidadId', identidad.id,
      'membresiaId', membresia.id,
      'funcionId', (
        select f.id
        from public.funcion_principal f
        where f.membresia_principal_id = membresia.id
          and f.estado = 'ACTIVA'
        order by f.es_principal desc, f.creada_en
        limit 1
      ),
      'nombre', coalesce(
        nullif(identidad.nombre_mostrar, ''),
        nullif(trim(concat_ws(' ', identidad.nombres, identidad.apellidos)), ''),
        identidad.correo,
        'Usuario'
      ),
      'correo', identidad.correo,
      'avatarUrl', identidad.avatar_url,
      'estadoIdentidad', identidad.estado,
      'estadoMembresia', membresia.estado,
      'roles', coalesce((
        select jsonb_agg(jsonb_build_object(
          'funcionId', f.id,
          'codigo', p.codigo,
          'nombre', p.nombre,
          'portal', p.portal,
          'estado', f.estado
        ) order by p.nombre)
        from public.funcion_principal f
        join public.perfil_principal p on p.id = f.perfil_principal_id
        where f.membresia_principal_id = membresia.id
          and f.estado in ('ACTIVA', 'SUSPENDIDA')
      ), '[]'::jsonb),
      'permisos', coalesce((
        select jsonb_agg(perm order by perm)
        from (
          select distinct unnest(public.permisos_efectivos_funcion(f.id)) as perm
          from public.funcion_principal f
          where f.membresia_principal_id = membresia.id
            and f.estado = 'ACTIVA'
        ) perms
      ), '[]'::jsonb)
    ) as item
    from public.membresia_principal membresia
    join public.identidad_principal identidad
      on identidad.id = membresia.identidad_principal_id
    where membresia.instalacion_organizacion_ref = p_instalacion_id
      and membresia.alcance_tipo = 'ORGANIZACION'
      and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
      and identidad.estado = 'ACTIVO'
  ) listado;

  return v_resultado;
end;
$$;

-- ---------------------------------------------------------------------------
-- Asignar / cambiar acceso dentro de la org
-- ---------------------------------------------------------------------------

create or replace function public.org_asignar_acceso(
  p_instalacion_id uuid,
  p_correo text,
  p_perfil_codigo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad public.identidad_principal;
  v_perfil public.perfil_principal;
  v_instalacion public.instalacion_organizacion;
  v_membresia_id uuid;
  v_funcion_id uuid;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion
  where id = p_instalacion_id;
  if not found then
    raise exception 'La instalación indicada no existe.';
  end if;

  select * into v_identidad
  from public.identidad_principal
  where lower(correo) = lower(trim(p_correo));
  if not found then
    raise exception
      'La cuenta aún no existe en Supabase Auth. Debe registrarse o iniciar sesión primero.';
  end if;

  select * into v_perfil
  from public.perfil_principal
  where codigo = p_perfil_codigo
    and estado = 'ACTIVO'
    and nivel = 'ORGANIZACION'
    and codigo in (
      'ORGANIZATION_OWNER',
      'ORGANIZATION_ADMIN',
      'TRAINING_MANAGER',
      'INSTRUCTOR',
      'STUDENT'
    );
  if not found then
    raise exception 'Perfil no asignable desde el portal de organización.';
  end if;

  select id into v_membresia_id
  from public.membresia_principal
  where identidad_principal_id = v_identidad.id
    and alcance_tipo = 'ORGANIZACION'
    and tenant_ref = v_instalacion.tenant_ref
    and estado in ('PENDIENTE', 'ACTIVA')
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
      v_identidad.id,
      v_instalacion.empresa_principal_ref,
      v_instalacion.empresa_sistema_ref,
      v_instalacion.tenant_ref,
      v_instalacion.id,
      'ORGANIZACION',
      'ACTIVA'
    )
    returning id into v_membresia_id;
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
    false,
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
    actualizada_en = now(),
    estado = 'ACTIVA'
  where id = v_membresia_id;

  return v_funcion_id;
end;
$$;

create or replace function public.org_cambiar_estado_acceso(
  p_instalacion_id uuid,
  p_funcion_id uuid,
  p_estado text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membresia_id uuid;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_estado not in ('ACTIVA', 'SUSPENDIDA', 'REVOCADA') then
    raise exception 'Estado inválido.';
  end if;

  select f.membresia_principal_id
  into v_membresia_id
  from public.funcion_principal f
  join public.membresia_principal m on m.id = f.membresia_principal_id
  where f.id = p_funcion_id
    and m.instalacion_organizacion_ref = p_instalacion_id;

  if v_membresia_id is null then
    raise exception 'Acceso no encontrado en esta organización.';
  end if;

  update public.funcion_principal
  set
    estado = p_estado,
    actualizada_en = now(),
    version_registro = version_registro + 1
  where id = p_funcion_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Licencia / consumo de la instalación
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
  v_limite_usuarios bigint;
  v_limite_docentes bigint;
  v_limite_cursos bigint;
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
        'etiqueta', 'Cursos (cupo plan)',
        'utilizado', 0,
        'limite', v_limite_cursos,
        'unidad', 'cursos'
      )
    )
  );
end;
$$;

revoke all on function public.org_catalogo_perfiles(uuid) from public;
revoke all on function public.org_listar_miembros(uuid) from public;
revoke all on function public.org_asignar_acceso(uuid, text, text) from public;
revoke all on function public.org_cambiar_estado_acceso(uuid, uuid, text) from public;
revoke all on function public.org_obtener_licencia(uuid) from public;

grant execute on function public.org_catalogo_perfiles(uuid) to authenticated;
grant execute on function public.org_listar_miembros(uuid) to authenticated;
grant execute on function public.org_asignar_acceso(uuid, text, text) to authenticated;
grant execute on function public.org_cambiar_estado_acceso(uuid, uuid, text) to authenticated;
grant execute on function public.org_obtener_licencia(uuid) to authenticated;

-- SUPER_ADMIN de plataforma también puede operar el portal org de Tukuy Academy.
do $$
declare
  v_instalacion public.instalacion_organizacion;
  v_perfil uuid;
  r record;
  v_membresia uuid;
begin
  select * into v_instalacion
  from public.instalacion_organizacion
  where id = '30000000-0000-4000-8000-000000000001'::uuid;
  if not found then
    raise notice 'Sin instalación Tukuy Academy; se omite alta OWNER plataforma';
    return;
  end if;

  select id into v_perfil
  from public.perfil_principal
  where codigo = 'ORGANIZATION_OWNER' and estado = 'ACTIVO';
  if v_perfil is null then
    raise notice 'Sin perfil ORGANIZATION_OWNER; se omite alta';
    return;
  end if;

  for r in
    select identidad.id as identidad_id
    from public.identidad_principal identidad
    join public.membresia_principal membresia
      on membresia.identidad_principal_id = identidad.id
    join public.funcion_principal funcion
      on funcion.membresia_principal_id = membresia.id
    join public.perfil_principal perfil
      on perfil.id = funcion.perfil_principal_id
    where identidad.estado = 'ACTIVO'
      and membresia.estado = 'ACTIVA'
      and membresia.alcance_tipo = 'PLATAFORMA'
      and funcion.estado = 'ACTIVA'
      and perfil.codigo = 'SUPER_ADMIN'
  loop
    select m.id into v_membresia
    from public.membresia_principal m
    where m.identidad_principal_id = r.identidad_id
      and m.alcance_tipo = 'ORGANIZACION'
      and m.tenant_ref = v_instalacion.tenant_ref
      and m.estado in ('PENDIENTE', 'ACTIVA')
    limit 1;

    if v_membresia is null then
      insert into public.membresia_principal (
        identidad_principal_id,
        empresa_principal_ref,
        empresa_sistema_ref,
        tenant_ref,
        instalacion_organizacion_ref,
        alcance_tipo,
        estado
      ) values (
        r.identidad_id,
        v_instalacion.empresa_principal_ref,
        v_instalacion.empresa_sistema_ref,
        v_instalacion.tenant_ref,
        v_instalacion.id,
        'ORGANIZACION',
        'ACTIVA'
      )
      returning id into v_membresia;
    end if;

    insert into public.funcion_principal (
      membresia_principal_id,
      perfil_principal_id,
      codigo,
      alcance,
      es_principal,
      estado
    ) values (
      v_membresia,
      v_perfil,
      'ORGANIZATION_OWNER',
      jsonb_build_object('tipo', 'ENTIDAD'),
      true,
      'ACTIVA'
    )
    on conflict (membresia_principal_id, codigo) do update set
      estado = 'ACTIVA',
      vigente_hasta = null,
      actualizada_en = now();
  end loop;
end;
$$;

commit;
