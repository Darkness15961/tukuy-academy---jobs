-- Catálogo principal: upsert vía service_role (gateway) sin revisión de permisos org.

begin;

create or replace function public.service_upsert_curso_catalogo_publico(
  p_instalacion_id uuid,
  p_curso_secundario_ref uuid,
  p_codigo text default null,
  p_titulo text default null,
  p_resumen text default null,
  p_modalidad text default 'VIRTUAL',
  p_duracion_minutos integer default null,
  p_imagen_publica_ref text default null,
  p_version_publicada integer default null,
  p_estado_publicacion text default 'PUBLICADO',
  p_datos_historicos jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_estado text;
  v_tipo_estado text;
  v_publicado boolean;
  v_existente public.curso_catalogo;
begin
  if p_instalacion_id is null or p_curso_secundario_ref is null then
    raise exception 'Instalacion y curso secundario requeridos';
  end if;

  v_estado := public._admin_resolver_estado_publicacion(
    array[
      upper(trim(coalesce(p_estado_publicacion, 'PUBLICADO'))),
      'PUBLICADO',
      'BORRADOR',
      'EN_REVISION',
      'RETIRADO'
    ]
  );
  v_publicado := upper(v_estado) = 'PUBLICADO';

  select * into v_existente
  from public.curso_catalogo
  where instalacion_proveedora_id = p_instalacion_id
    and curso_secundario_ref = p_curso_secundario_ref;

  select c.udt_name into v_tipo_estado
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'curso_catalogo'
    and c.column_name = 'estado_publicacion';

  insert into public.curso_catalogo (
    instalacion_proveedora_id,
    curso_secundario_ref,
    codigo,
    titulo,
    resumen,
    modalidad,
    duracion_minutos,
    imagen_publica_ref,
    estado_publicacion,
    version_publicada,
    datos_historicos,
    publicado_en,
    retirado_en,
    creado_en,
    actualizado_en
  )
  values (
    p_instalacion_id,
    p_curso_secundario_ref,
    coalesce(
      nullif(trim(p_codigo), ''),
      v_existente.codigo,
      'CUR-' || substr(p_curso_secundario_ref::text, 1, 8)
    ),
    coalesce(nullif(trim(p_titulo), ''), v_existente.titulo, 'Curso sin titulo'),
    coalesce(
      nullif(trim(coalesce(p_resumen, '')), ''),
      v_existente.resumen
    ),
    coalesce(nullif(trim(p_modalidad), ''), v_existente.modalidad, 'VIRTUAL'),
    case
      when p_duracion_minutos is null or p_duracion_minutos <= 0
        then v_existente.duracion_minutos
      else p_duracion_minutos
    end,
    coalesce(
      nullif(trim(coalesce(p_imagen_publica_ref, '')), ''),
      v_existente.imagen_publica_ref
    ),
    v_estado::public.estado_publicacion_catalogo,
    greatest(coalesce(p_version_publicada, v_existente.version_publicada, 1), 1),
    coalesce(v_existente.datos_historicos, '{}'::jsonb)
      || coalesce(p_datos_historicos, '{}'::jsonb),
    case when v_publicado then coalesce(v_existente.publicado_en, now()) else v_existente.publicado_en end,
    case when upper(v_estado) = 'RETIRADO' then now() else null end,
    coalesce(v_existente.creado_en, now()),
    now()
  )
  on conflict (instalacion_proveedora_id, curso_secundario_ref) do update set
    codigo = excluded.codigo,
    titulo = excluded.titulo,
    resumen = excluded.resumen,
    modalidad = excluded.modalidad,
    duracion_minutos = excluded.duracion_minutos,
    imagen_publica_ref = coalesce(excluded.imagen_publica_ref, public.curso_catalogo.imagen_publica_ref),
    estado_publicacion = excluded.estado_publicacion,
    version_publicada = excluded.version_publicada,
    datos_historicos = excluded.datos_historicos,
    publicado_en = case
      when upper(excluded.estado_publicacion::text) = 'PUBLICADO'
        then coalesce(public.curso_catalogo.publicado_en, now())
      else public.curso_catalogo.publicado_en
    end,
    retirado_en = case
      when upper(excluded.estado_publicacion::text) = 'RETIRADO' then now()
      else null
    end,
    actualizado_en = now()
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'instalacionId', p_instalacion_id,
    'cursoSecundarioRef', p_curso_secundario_ref,
    'estadoPublicacion', v_estado
  );
end;
$$;

revoke all on function public.service_upsert_curso_catalogo_publico(
  uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb
) from public, anon, authenticated;
grant execute on function public.service_upsert_curso_catalogo_publico(
  uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb
) to service_role;

commit;
