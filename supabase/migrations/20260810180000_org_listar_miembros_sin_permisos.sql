-- El directorio de Personas no necesita permisos efectivos por miembro.
-- Calcular permisos_efectivos_funcion() por cada función activa hacía
-- org_listar_miembros lento sin aportar a la tabla.
--
-- NOTA: si ya corriste esta migración, ejecuta también
-- 20260810181000_org_listar_miembros_sin_alumnos.sql (excluye STUDENT).

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
        join public.perfil_principal p on p.id = f.perfil_principal_id
        where f.membresia_principal_id = membresia.id
          and f.estado = 'ACTIVA'
          and p.codigo <> 'STUDENT'
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
          and p.codigo <> 'STUDENT'
      ), '[]'::jsonb)
    ) as item
    from public.membresia_principal membresia
    join public.identidad_principal identidad
      on identidad.id = membresia.identidad_principal_id
    where membresia.instalacion_organizacion_ref = p_instalacion_id
      and membresia.alcance_tipo = 'ORGANIZACION'
      and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
      and identidad.estado = 'ACTIVO'
      and exists (
        select 1
        from public.funcion_principal f
        join public.perfil_principal p on p.id = f.perfil_principal_id
        where f.membresia_principal_id = membresia.id
          and f.estado in ('ACTIVA', 'SUSPENDIDA', 'PENDIENTE')
          and p.codigo <> 'STUDENT'
      )
  ) listado;

  return v_resultado;
end;
$$;
