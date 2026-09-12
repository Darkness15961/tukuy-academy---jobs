-- PRINCIPAL: org_listar_alumnos más rápido.
-- Antes: 3× org_tiene_permiso (cada uno llama permisos_efectivos_funcion),
-- materializa TODOS los STUDENT de la org + Tukuy y luego pagina.
-- Ahora: 1 chequeo de permiso, EXISTS en vez de JOINs pesados, COUNT en ventana.

begin;

create index if not exists funcion_principal_membresia_activa_idx
  on public.funcion_principal (membresia_principal_id)
  where estado = 'ACTIVA';

create index if not exists perfil_principal_codigo_idx
  on public.perfil_principal (codigo);

create or replace function public.org_listar_alumnos(
  p_instalacion_id uuid,
  p_busqueda text default null,
  p_limite integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tukuy uuid := '30000000-0000-4000-8000-000000000001';
  v_limite integer := greatest(1, least(coalesce(p_limite, 24), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_busqueda text := nullif(trim(coalesce(p_busqueda, '')), '');
  v_total integer := 0;
  v_alumnos jsonb := '[]'::jsonb;
  v_autorizado boolean := false;
begin
  if p_instalacion_id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- Un solo recorrido de membresías/funciones (evita 3× permisos_efectivos_funcion).
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
        and public.permisos_efectivos_funcion(funcion.id) && array[
          'estudiantes.ver',
          'alumnos.ver',
          'usuarios.ver'
        ]
    )
  into v_autorizado;

  if not coalesce(v_autorizado, false) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  with base as (
    select distinct on (identidad.id)
      identidad.id as alumno_id,
      coalesce(
        nullif(identidad.nombre_mostrar, ''),
        nullif(trim(concat_ws(' ', identidad.nombres, identidad.apellidos)), ''),
        identidad.correo,
        'Estudiante'
      ) as nombre,
      coalesce(identidad.correo, '') as correo,
      identidad.ultimo_acceso_en,
      membresia.creada_en as fecha_alta
    from public.membresia_principal membresia
    join public.identidad_principal identidad
      on identidad.id = membresia.identidad_principal_id
    where membresia.alcance_tipo = 'ORGANIZACION'
      and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
      and identidad.estado = 'ACTIVO'
      and membresia.instalacion_organizacion_ref in (p_instalacion_id, v_tukuy)
      and exists (
        select 1
        from public.funcion_principal funcion
        join public.perfil_principal perfil
          on perfil.id = funcion.perfil_principal_id
        where funcion.membresia_principal_id = membresia.id
          and funcion.estado = 'ACTIVA'
          and perfil.codigo = 'STUDENT'
      )
      and (
        v_busqueda is null
        or coalesce(identidad.correo, '') ilike '%' || v_busqueda || '%'
        or coalesce(identidad.nombre_mostrar, '') ilike '%' || v_busqueda || '%'
        or coalesce(identidad.nombres, '') ilike '%' || v_busqueda || '%'
        or coalesce(identidad.apellidos, '') ilike '%' || v_busqueda || '%'
      )
    order by identidad.id, membresia.creada_en
  ),
  ordenado as (
    select
      alumno_id,
      nombre,
      correo,
      upper(left(coalesce(nombre, 'ES'), 2)) as iniciales,
      ultimo_acceso_en,
      fecha_alta,
      count(*) over ()::integer as total
    from base
    order by nombre
    limit v_limite
    offset v_offset
  )
  select
    coalesce(max(o.total), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'alumnoId', o.alumno_id,
          'nombre', o.nombre,
          'iniciales', o.iniciales,
          'correo', o.correo,
          'cursos', 0,
          'cursosResumen', '',
          'progreso', 0,
          'estado', 'ACTIVO',
          'fechaInscripcion', o.fecha_alta,
          'ultimoAcceso', coalesce(o.ultimo_acceso_en::text, ''),
          'ultimoAccesoFecha', coalesce(o.ultimo_acceso_en::text, ''),
          'pendientes', 0,
          'matriculasPendientes', '[]'::jsonb
        )
        order by o.nombre
      ),
      '[]'::jsonb
    )
  into v_total, v_alumnos
  from ordenado o;

  return jsonb_build_object(
    'ok', true,
    'total', coalesce(v_total, 0),
    'limite', v_limite,
    'offset', v_offset,
    'alumnos', coalesce(v_alumnos, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.org_listar_alumnos(uuid, text, integer, integer)
  from public, anon;
grant execute on function public.org_listar_alumnos(uuid, text, integer, integer)
  to authenticated;

commit;
