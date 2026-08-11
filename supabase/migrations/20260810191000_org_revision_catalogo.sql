-- Portal organización · Revisión / aprobación de cursos vía curso_catalogo.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
--
-- Extiende el enum de publicación (si aplica) y expone RPCs org-scoped
-- para listar y actualizar el catálogo sin ser super admin.

begin;

-- ---------------------------------------------------------------------------
-- Enum: agregar estados del workflow org si aún no existen
-- ---------------------------------------------------------------------------

do $$
declare
  v_tipo text;
  v_label text;
begin
  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'curso_catalogo'
    and c.column_name = 'estado_publicacion';

  if v_tipo is null then
    raise notice 'curso_catalogo.estado_publicacion no encontrado; se omite alter enum';
    return;
  end if;

  foreach v_label in array array[
    'EN_REVISION',
    'CONTENIDO_REVISADO',
    'OBSERVADO',
    'APROBADO',
    'PUBLICADO',
    'BORRADOR',
    'RETIRADO'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_type t
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where t.typname = v_tipo
        and e.enumlabel = v_label
    ) then
      execute format('alter type public.%I add value %L', v_tipo, v_label);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar catálogo de la instalación (para /organizacion/cursos)
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_cursos_catalogo(
  p_instalacion_id uuid
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
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'cursos.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    )
  then
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
    where c.instalacion_proveedora_id = p_instalacion_id
      and c.estado_publicacion::text <> 'RETIRADO'
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'cursos', v_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Upsert / transición de estado del catálogo (org)
-- ---------------------------------------------------------------------------

create or replace function public.org_upsert_curso_catalogo(
  p_instalacion_id uuid,
  p_curso_secundario_ref uuid,
  p_codigo text default null,
  p_titulo text default null,
  p_resumen text default null,
  p_modalidad text default 'VIRTUAL',
  p_duracion_minutos integer default null,
  p_imagen_publica_ref text default null,
  p_version_publicada integer default null,
  p_estado_publicacion text default 'EN_REVISION',
  p_datos_historicos jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado_solicitado text := upper(trim(coalesce(p_estado_publicacion, 'EN_REVISION')));
  v_estado text;
  v_id uuid;
  v_tipo_estado text;
  v_publicado boolean;
  v_existente public.curso_catalogo;
  v_datos jsonb;
  v_puede_enviar boolean;
  v_puede_revisar boolean;
  v_puede_aprobar boolean;
begin
  if p_instalacion_id is null or p_curso_secundario_ref is null then
    raise exception 'Instalacion y curso secundario requeridos';
  end if;

  v_puede_enviar :=
    public.es_super_admin_actual()
    or public.org_es_miembro_instalacion(p_instalacion_id);
  v_puede_revisar :=
    public.es_super_admin_actual()
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar');
  v_puede_aprobar :=
    public.es_super_admin_actual()
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar');

  if v_estado_solicitado in ('EN_REVISION', 'BORRADOR') and not v_puede_enviar then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_estado_solicitado in ('CONTENIDO_REVISADO', 'OBSERVADO') and not v_puede_revisar then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_estado_solicitado in ('APROBADO', 'PUBLICADO', 'RETIRADO') and not v_puede_aprobar then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_estado := public._admin_resolver_estado_publicacion(
    array[
      v_estado_solicitado,
      'EN_REVISION',
      'CONTENIDO_REVISADO',
      'OBSERVADO',
      'APROBADO',
      'PUBLICADO',
      'BORRADOR',
      'RETIRADO'
    ]
  );
  v_publicado := upper(v_estado) = 'PUBLICADO';

  select * into v_existente
  from public.curso_catalogo
  where instalacion_proveedora_id = p_instalacion_id
    and curso_secundario_ref = p_curso_secundario_ref;

  v_datos := coalesce(v_existente.datos_historicos, '{}'::jsonb)
    || coalesce(p_datos_historicos, '{}'::jsonb);
  -- Preserva workflowEstado lógico aunque el enum no tenga el label exacto.
  v_datos := v_datos || jsonb_build_object(
    'workflowEstado', v_estado_solicitado,
    'actualizadoPor', auth.uid(),
    'actualizadoEnGateway', now()
  );

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
    coalesce(
      nullif(trim(p_titulo), ''),
      v_existente.titulo,
      'Curso sin titulo'
    ),
    coalesce(
      nullif(trim(coalesce(p_resumen, '')), ''),
      v_existente.resumen
    ),
    coalesce(
      nullif(trim(p_modalidad), ''),
      v_existente.modalidad,
      'VIRTUAL'
    ),
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
    greatest(
      coalesce(p_version_publicada, v_existente.version_publicada, 1),
      1
    ),
    v_datos,
    case
      when v_publicado then coalesce(v_existente.publicado_en, now())
      else v_existente.publicado_en
    end,
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
    'estadoPublicacion', v_estado,
    'workflowEstado', v_estado_solicitado,
    'datosHistoricos', v_datos
  );
exception
  when others then
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
        coalesce(nullif(trim(p_titulo), ''), 'Curso sin titulo'),
        nullif(trim(coalesce(p_resumen, '')), ''),
        coalesce(nullif(trim(p_modalidad), ''), 'VIRTUAL'),
        case when p_duracion_minutos is null or p_duracion_minutos <= 0 then null else p_duracion_minutos end,
        nullif(trim(coalesce(p_imagen_publica_ref, '')), ''),
        v_estado,
        greatest(coalesce(p_version_publicada, 1), 1),
        v_datos;

      return jsonb_build_object(
        'ok', true,
        'id', v_id,
        'instalacionId', p_instalacion_id,
        'cursoSecundarioRef', p_curso_secundario_ref,
        'estadoPublicacion', v_estado,
        'workflowEstado', v_estado_solicitado,
        'datosHistoricos', v_datos
      );
    end if;
    raise;
end;
$$;

revoke all on function public.org_listar_cursos_catalogo(uuid) from public;
revoke all on function public.org_upsert_curso_catalogo(uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb) from public;
grant execute on function public.org_listar_cursos_catalogo(uuid) to authenticated;
grant execute on function public.org_upsert_curso_catalogo(uuid, uuid, text, text, text, text, integer, text, integer, text, jsonb) to authenticated;

commit;
