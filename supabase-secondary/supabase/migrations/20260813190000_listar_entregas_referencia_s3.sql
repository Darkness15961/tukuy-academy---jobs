-- SECUNDARIA: el listado de entregas devolvía referencia placeholder
-- (`secundaria/<id>`) en lugar de archivo_referencia (S3).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

create or replace function public.servicio_listar_entregas(
  p_curso_id uuid default null,
  p_estudiante_identidad_ref uuid default null,
  p_incluir_archivo boolean default false
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
  select coalesce(jsonb_agg(item order by item->>'entregadaEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select case
      when p_incluir_archivo then public._servicio_mapear_entrega(e)
      else (public._servicio_mapear_entrega(e) - 'archivo')
        || jsonb_build_object(
          'archivo',
          case
            when e.archivo_nombre is null then null
            else jsonb_build_object(
              'id', e.id::text,
              'nombre', e.archivo_nombre,
              'tipo', coalesce(e.archivo_tipo, 'application/pdf'),
              'tamanio', coalesce(e.archivo_tamanio, 0),
              'referencia', coalesce(
                nullif(trim(e.archivo_referencia), ''),
                'secundaria/' || e.id::text
              )
            )
          end
        )
    end as item
    from public.entrega_actividad e
    join public.matricula_curso mat on mat.id = e.matricula_curso_id
    join public.edicion_curso ed on ed.id = mat.edicion_curso_id
    join public.version_curso v on v.id = ed.version_curso_id
    where (p_curso_id is null or v.curso_id = p_curso_id)
      and (
        p_estudiante_identidad_ref is null
        or mat.estudiante_identidad_ref = p_estudiante_identidad_ref
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'entregas', v_items
  );
end;
$$;

commit;
