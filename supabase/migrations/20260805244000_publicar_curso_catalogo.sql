-- Fase 4 · catálogo principal: upsert + listado desde secundaria.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
begin;

create unique index if not exists curso_catalogo_instalacion_secundario_uq
  on public.curso_catalogo (instalacion_proveedora_id, curso_secundario_ref);

create or replace function public._admin_resolver_estado_publicacion(
  p_preferidos text[]
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_valor text;
begin
  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'curso_catalogo'
    and c.column_name = 'estado_publicacion';

  select e.enumlabel into v_valor
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = v_tipo
    and e.enumlabel = any (p_preferidos)
  order by array_position(p_preferidos, e.enumlabel)
  limit 1;

  if v_valor is null then
    select e.enumlabel into v_valor
    from pg_catalog.pg_type t
    join pg_catalog.pg_enum e on e.enumtypid = t.oid
    where t.typname = v_tipo
    order by e.enumsortorder
    limit 1;
  end if;

  return v_valor;
end;
$$;

create or replace function public.admin_upsert_curso_catalogo_secundaria(
  p_instalacion_id uuid,
  p_curso_secundario_ref uuid,
  p_codigo text,
  p_titulo text,
  p_resumen text default null,
  p_modalidad text default 'VIRTUAL',
  p_duracion_minutos integer default null,
  p_imagen_publica_ref text default null,
  p_version_publicada integer default 1,
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
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null or p_curso_secundario_ref is null then
    raise exception 'Instalacion y curso secundario requeridos';
  end if;
  if nullif(trim(coalesce(p_titulo, '')), '') is null then
    raise exception 'Titulo requerido';
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
    coalesce(nullif(trim(p_codigo), ''), 'CUR-' || substr(p_curso_secundario_ref::text, 1, 8)),
    trim(p_titulo),
    nullif(trim(coalesce(p_resumen, '')), ''),
    coalesce(nullif(trim(p_modalidad), ''), 'VIRTUAL'),
    case when p_duracion_minutos is null or p_duracion_minutos <= 0 then null else p_duracion_minutos end,
    nullif(trim(coalesce(p_imagen_publica_ref, '')), ''),
    v_estado::public.estado_publicacion_catalogo,
    greatest(coalesce(p_version_publicada, 1), 1),
    coalesce(p_datos_historicos, '{}'::jsonb),
    case when v_publicado then now() else null end,
    null,
    now(),
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
exception
  when others then
    -- Fallback si el cast tipado del enum falla: usar execute dinámico.
    if sqlstate = '22P02' or sqlerrm ilike '%estado_publicacion%' then
      execute format(
        'insert into public.curso_catalogo (
           instalacion_proveedora_id, curso_secundario_ref, codigo, titulo, resumen,
           modalidad, duracion_minutos, imagen_publica_ref, estado_publicacion,
           version_publicada, datos_historicos, publicado_en, creado_en, actualizado_en
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9::%I,$10,$11,
           case when upper($9) = ''PUBLICADO'' then now() else null end,
           now(), now()
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
           publicado_en = case when upper(excluded.estado_publicacion::text) = ''PUBLICADO''
             then coalesce(public.curso_catalogo.publicado_en, now())
             else public.curso_catalogo.publicado_en end,
           actualizado_en = now()
         returning id',
        v_tipo_estado
      )
      into v_id
      using
        p_instalacion_id,
        p_curso_secundario_ref,
        coalesce(nullif(trim(p_codigo), ''), 'CUR-' || substr(p_curso_secundario_ref::text, 1, 8)),
        trim(p_titulo),
        nullif(trim(coalesce(p_resumen, '')), ''),
        coalesce(nullif(trim(p_modalidad), ''), 'VIRTUAL'),
        case when p_duracion_minutos is null or p_duracion_minutos <= 0 then null else p_duracion_minutos end,
        nullif(trim(coalesce(p_imagen_publica_ref, '')), ''),
        v_estado,
        greatest(coalesce(p_version_publicada, 1), 1),
        coalesce(p_datos_historicos, '{}'::jsonb);

      return jsonb_build_object(
        'ok', true,
        'id', v_id,
        'instalacionId', p_instalacion_id,
        'cursoSecundarioRef', p_curso_secundario_ref,
        'estadoPublicacion', v_estado
      );
    end if;
    raise;
end;
$$;

create or replace function public.admin_listar_cursos_catalogo(
  p_instalacion_id uuid default null
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
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item->>'actualizadoEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', c.id,
      'cursoSecundarioRef', c.curso_secundario_ref,
      'instalacionId', c.instalacion_proveedora_id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', c.resumen,
      'modalidad', c.modalidad,
      'duracionMinutos', c.duracion_minutos,
      'imagenPublicaRef', c.imagen_publica_ref,
      'estadoPublicacion', c.estado_publicacion::text,
      'versionPublicada', c.version_publicada,
      'datosHistoricos', c.datos_historicos,
      'publicadoEn', c.publicado_en,
      'creadoEn', c.creado_en,
      'actualizadoEn', c.actualizado_en
    ) as item
    from public.curso_catalogo c
    where p_instalacion_id is null
       or c.instalacion_proveedora_id = p_instalacion_id
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'cursos', v_items
  );
end;
$$;

revoke all on function public._admin_resolver_estado_publicacion(text[]) from public;
revoke all on function public.admin_upsert_curso_catalogo_secundaria(uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb) from public;
revoke all on function public.admin_listar_cursos_catalogo(uuid) from public;

grant execute on function public._admin_resolver_estado_publicacion(text[]) to authenticated;
grant execute on function public.admin_upsert_curso_catalogo_secundaria(uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb) to authenticated;
grant execute on function public.admin_listar_cursos_catalogo(uuid) to authenticated;

commit;
