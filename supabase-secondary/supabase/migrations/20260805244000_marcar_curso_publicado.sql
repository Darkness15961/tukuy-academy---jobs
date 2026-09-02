-- Fase 4b · marcar curso publicado en secundaria.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_marcar_curso_publicado(
  p_curso_id uuid,
  p_estado text default 'PUBLICADO'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_tipo text;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;
  if not exists (select 1 from public.curso where id = p_curso_id) then
    raise exception 'Curso no encontrado';
  end if;

  v_estado := public._servicio_resolver_enum_curso(
    'estado',
    array[
      upper(trim(coalesce(p_estado, 'PUBLICADO'))),
      'PUBLICADO',
      'APROBADO',
      'ACTIVO',
      'BORRADOR'
    ]
  );

  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'curso'
    and c.column_name = 'estado';

  execute format(
    'update public.curso
     set estado = $2::%I,
         actualizado_en = now(),
         version_registro = version_registro + 1
     where id = $1',
    v_tipo
  )
  using p_curso_id, v_estado;

  update public.version_curso
  set estado = v_estado
  where id = (
    select v.id
    from public.version_curso v
    where v.curso_id = p_curso_id
    order by v.numero desc
    limit 1
  );

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'estado', v_estado,
    'curso', (public.servicio_obtener_curso_tipado(p_curso_id))->'curso'
  );
end;
$$;

revoke all on function public.servicio_marcar_curso_publicado(uuid, text)
  from public, anon, authenticated;
grant execute on function public.servicio_marcar_curso_publicado(uuid, text)
  to service_role;

commit;
