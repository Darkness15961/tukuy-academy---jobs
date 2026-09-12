-- SECUNDARIA: IDs de cursos visibles para un docente (autor o docente_edicion).
-- Usado por secondary-gateway para acotar listados del portal docente.

begin;

create or replace function public.servicio_ids_cursos_del_docente(
  p_docente_identidad_ref uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ids jsonb := '[]'::jsonb;
begin
  if p_docente_identidad_ref is null then
    return jsonb_build_object('ok', true, 'cursoIds', '[]'::jsonb, 'total', 0);
  end if;

  select coalesce(jsonb_agg(to_jsonb(x.id) order by x.id::text), '[]'::jsonb)
  into v_ids
  from (
    select c.id
    from public.curso c
    where c.autor_identidad_ref = p_docente_identidad_ref
    union
    select distinct vc.curso_id
    from public.docente_edicion de
    join public.edicion_curso ec on ec.id = de.edicion_curso_id
    join public.version_curso vc on vc.id = ec.version_curso_id
    where de.docente_identidad_ref = p_docente_identidad_ref
  ) x;

  return jsonb_build_object(
    'ok', true,
    'cursoIds', coalesce(v_ids, '[]'::jsonb),
    'total', jsonb_array_length(coalesce(v_ids, '[]'::jsonb))
  );
end;
$$;

revoke all on function public.servicio_ids_cursos_del_docente(uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_ids_cursos_del_docente(uuid)
  to service_role;

comment on function public.servicio_ids_cursos_del_docente(uuid) is
  'Cursos del docente: autor_identidad_ref o asignación en docente_edicion.';

commit;
