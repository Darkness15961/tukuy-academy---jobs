-- Extiende preferencias de estado de curso para el workflow org.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- No inventa columnas nuevas: solo prioriza CONTENIDO_REVISADO / OBSERVADO /
-- APROBADO si el enum ya los tiene; si no, cae a EN_REVISION / BORRADOR / PUBLICADO.

begin;

create or replace function public.servicio_actualizar_estado_curso(
  p_curso_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_tipo text;
  v_solicitado text := upper(trim(coalesce(p_estado, 'BORRADOR')));
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_estado := public._servicio_resolver_enum_curso(
    'estado',
    array[
      v_solicitado,
      case
        when v_solicitado = 'CONTENIDO_REVISADO' then 'EN_REVISION'
        when v_solicitado = 'OBSERVADO' then 'BORRADOR'
        when v_solicitado = 'APROBADO' then 'PUBLICADO'
        else v_solicitado
      end,
      'EN_REVISION',
      'BORRADOR',
      'PUBLICADO',
      'APROBADO',
      'ARCHIVADO',
      'ACTIVO'
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

  return jsonb_build_object(
    'ok', true,
    'estadoSolicitado', v_solicitado,
    'estadoAplicado', v_estado,
    'curso', (public.servicio_obtener_curso_tipado(p_curso_id))->'curso'
  );
end;
$$;

revoke all on function public.servicio_actualizar_estado_curso(uuid, text)
  from public, anon, authenticated;
grant execute on function public.servicio_actualizar_estado_curso(uuid, text)
  to service_role;

commit;
