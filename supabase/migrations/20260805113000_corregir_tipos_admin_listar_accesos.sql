-- Corrige la coincidencia estricta de tipos del RETURNS TABLE.
-- Las columnas varchar del modelo se convierten explícitamente a text.

create or replace function public.admin_listar_accesos()
returns table (
  funcion_id uuid,
  membresia_id uuid,
  identidad_id uuid,
  nombre text,
  correo text,
  avatar_url text,
  estado_identidad text,
  perfil_codigo text,
  perfil_nombre text,
  portal text,
  nivel text,
  organizacion_nombre text,
  instalacion_ref uuid,
  estado_funcion text,
  permisos text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select
    funcion.id,
    membresia.id,
    identidad.id,
    coalesce(nullif(identidad.nombre_mostrar, ''), identidad.correo, 'Usuario')::text,
    identidad.correo::text,
    identidad.avatar_url::text,
    identidad.estado::text,
    perfil.codigo::text,
    perfil.nombre::text,
    perfil.portal::text,
    perfil.nivel::text,
    (case
      when membresia.alcance_tipo = 'PLATAFORMA' then 'Tukuy · Plataforma'
      else coalesce(instalacion.nombre_organizacion, 'Organización')
    end)::text,
    membresia.instalacion_organizacion_ref,
    funcion.estado::text,
    public.permisos_efectivos_funcion(funcion.id)::text[]
  from public.funcion_principal funcion
  join public.membresia_principal membresia
    on membresia.id = funcion.membresia_principal_id
  join public.identidad_principal identidad
    on identidad.id = membresia.identidad_principal_id
  join public.perfil_principal perfil
    on perfil.id = funcion.perfil_principal_id
  left join public.instalacion_organizacion instalacion
    on instalacion.id = membresia.instalacion_organizacion_ref
  order by identidad.nombre_mostrar nulls last, perfil.nombre;
end;
$$;

revoke all on function public.admin_listar_accesos() from public;
grant execute on function public.admin_listar_accesos() to authenticated;
