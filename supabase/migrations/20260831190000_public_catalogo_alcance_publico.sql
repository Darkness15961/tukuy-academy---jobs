-- Catálogo landing: solo alcance público (PUBLICO / TODOS) y no ocultos.

begin;

create or replace function public.public_listar_cursos_catalogo(
  p_instalacion_id uuid default '30000000-0000-4000-8000-000000000001'::uuid
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
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  select coalesce(jsonb_agg(item order by item->>'titulo'), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', c.id,
      'cursoSecundarioRef', c.curso_secundario_ref,
      'instalacionId', c.instalacion_proveedora_id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', coalesce(c.resumen, ''),
      'modalidad', coalesce(c.modalidad, 'VIRTUAL'),
      'categoria', coalesce(c.datos_historicos->>'categoria', ''),
      'imagenPublicaRef', c.imagen_publica_ref,
      'duracionMinutos', c.duracion_minutos,
      'estadoPublicacion', c.estado_publicacion::text,
      'datosHistoricos', coalesce(c.datos_historicos, '{}'::jsonb),
      'publicadoEn', c.publicado_en
    ) as item
    from public.curso_catalogo c
    where c.instalacion_proveedora_id = p_instalacion_id
      and c.estado_publicacion::text = 'PUBLICADO'
      and coalesce((c.datos_historicos->>'eliminadoPermanente')::boolean, false) is not true
      and coalesce((c.datos_historicos->>'oculto')::boolean, false) is not true
      and coalesce(c.datos_historicos->'configuracionPublicacion'->>'alcance', 'TODOS')
        in ('PUBLICO', 'TODOS', '')
      and coalesce(
        (c.datos_historicos->'configuracionPublicacion'->>'visibleParaExternos')::boolean,
        true
      ) is not false
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', coalesce(jsonb_array_length(v_items), 0),
    'cursos', v_items
  );
end;
$$;

revoke all on function public.public_listar_cursos_catalogo(uuid) from public;
grant execute on function public.public_listar_cursos_catalogo(uuid) to anon, authenticated, service_role;

commit;
