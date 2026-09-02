-- Mensajería docente↔estudiante + listado de ingresos desde órdenes pagadas.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create table if not exists public.conversacion_docente (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.curso(id) on delete cascade,
  docente_identidad_ref uuid not null,
  estudiante_identidad_ref uuid not null,
  docente_visto_en timestamptz,
  estudiante_visto_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (curso_id, docente_identidad_ref, estudiante_identidad_ref)
);

create index if not exists idx_conversacion_docente_docente
  on public.conversacion_docente (docente_identidad_ref, actualizado_en desc);

create table if not exists public.mensaje_conversacion (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null
    references public.conversacion_docente(id) on delete cascade,
  autor_identidad_ref uuid not null,
  autor_rol text not null check (autor_rol in ('DOCENTE', 'ESTUDIANTE')),
  contenido text not null,
  adjunto_nombre text,
  adjunto_tipo text,
  adjunto_tamano bigint,
  creado_en timestamptz not null default now()
);

create index if not exists idx_mensaje_conversacion_conv
  on public.mensaje_conversacion (conversacion_id, creado_en);

revoke all on table public.conversacion_docente from public, anon, authenticated;
revoke all on table public.mensaje_conversacion from public, anon, authenticated;

-- Asegura conversaciones vacías para cada matrícula de cursos del docente.
create or replace function public.servicio_asegurar_conversaciones_docente(
  p_docente_identidad_ref uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_docente_identidad_ref is null then
    raise exception 'Docente requerido';
  end if;

  insert into public.conversacion_docente (
    curso_id,
    docente_identidad_ref,
    estudiante_identidad_ref
  )
  select distinct
    c.id,
    p_docente_identidad_ref,
    m.estudiante_identidad_ref
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  join public.version_curso v on v.id = e.version_curso_id
  join public.curso c on c.id = v.curso_id
  where c.autor_identidad_ref = p_docente_identidad_ref
    and m.estudiante_identidad_ref is not null
    and m.estudiante_identidad_ref <> p_docente_identidad_ref
  on conflict (curso_id, docente_identidad_ref, estudiante_identidad_ref)
  do nothing;
end;
$$;

create or replace function public.servicio_listar_conversaciones_docente(
  p_docente_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_docente_identidad_ref is null then
    raise exception 'Docente requerido';
  end if;

  perform public.servicio_asegurar_conversaciones_docente(p_docente_identidad_ref);

  select coalesce(jsonb_agg(item order by item->>'orden' desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', conv.id,
      'cursoId', conv.curso_id,
      'curso', c.titulo,
      'estudianteId', conv.estudiante_identidad_ref,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
      'mensaje', coalesce(
        (
          select left(msg.contenido, 140)
          from public.mensaje_conversacion msg
          where msg.conversacion_id = conv.id
          order by msg.creado_en desc
          limit 1
        ),
        'Sin mensajes aún'
      ),
      'hora', to_char(
        coalesce(
          (
            select msg.creado_en
            from public.mensaje_conversacion msg
            where msg.conversacion_id = conv.id
            order by msg.creado_en desc
            limit 1
          ),
          conv.actualizado_en
        ) at time zone 'America/Lima',
        'HH24:MI'
      ),
      'noLeidos', (
        select count(*)::int
        from public.mensaje_conversacion msg
        where msg.conversacion_id = conv.id
          and msg.autor_rol = 'ESTUDIANTE'
          and (
            conv.docente_visto_en is null
            or msg.creado_en > conv.docente_visto_en
          )
      ),
      'orden', extract(epoch from coalesce(
        (
          select msg.creado_en
          from public.mensaje_conversacion msg
          where msg.conversacion_id = conv.id
          order by msg.creado_en desc
          limit 1
        ),
        conv.actualizado_en
      ))
    ) as item
    from public.conversacion_docente conv
    join public.curso c on c.id = conv.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = conv.estudiante_identidad_ref
    where conv.docente_identidad_ref = p_docente_identidad_ref
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'conversaciones', v_items
  );
end;
$$;

create or replace function public.servicio_obtener_mensajes_conversacion(
  p_conversacion_id uuid,
  p_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversacion_docente%rowtype;
  v_mensajes jsonb;
  v_es_docente boolean;
begin
  if p_conversacion_id is null or p_identidad_ref is null then
    raise exception 'Conversacion e identidad requeridas';
  end if;

  select * into v_conv
  from public.conversacion_docente
  where id = p_conversacion_id;

  if not found then
    raise exception 'Conversacion no encontrada';
  end if;

  v_es_docente := v_conv.docente_identidad_ref = p_identidad_ref;
  if not v_es_docente and v_conv.estudiante_identidad_ref <> p_identidad_ref then
    raise exception 'No autorizado';
  end if;

  if v_es_docente then
    update public.conversacion_docente
    set docente_visto_en = now()
    where id = v_conv.id;
  else
    update public.conversacion_docente
    set estudiante_visto_en = now()
    where id = v_conv.id;
  end if;

  select coalesce(jsonb_agg(item order by item->>'creadoEn'), '[]'::jsonb)
  into v_mensajes
  from (
    select jsonb_build_object(
      'id', m.id,
      'contenido', m.contenido,
      'hora', to_char(m.creado_en at time zone 'America/Lima', 'HH24:MI'),
      'autor', m.autor_rol,
      'creadoEn', m.creado_en,
      'adjunto', case
        when m.adjunto_nombre is null then null
        else jsonb_build_object(
          'nombre', m.adjunto_nombre,
          'tipo', coalesce(m.adjunto_tipo, 'application/octet-stream'),
          'tamanio', coalesce(m.adjunto_tamano, 0)
        )
      end
    ) as item
    from public.mensaje_conversacion m
    where m.conversacion_id = v_conv.id
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'conversacionId', v_conv.id,
    'mensajes', v_mensajes
  );
end;
$$;

create or replace function public.servicio_enviar_mensaje_conversacion(
  p_conversacion_id uuid,
  p_autor_identidad_ref uuid,
  p_contenido text,
  p_adjunto_nombre text default null,
  p_adjunto_tipo text default null,
  p_adjunto_tamano bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversacion_docente%rowtype;
  v_rol text;
  v_msg public.mensaje_conversacion%rowtype;
  v_texto text := trim(coalesce(p_contenido, ''));
begin
  if p_conversacion_id is null or p_autor_identidad_ref is null then
    raise exception 'Conversacion y autor requeridos';
  end if;
  if v_texto = '' and nullif(trim(coalesce(p_adjunto_nombre, '')), '') is null then
    raise exception 'Mensaje vacio';
  end if;
  if v_texto = '' then
    v_texto := '(archivo adjunto)';
  end if;

  select * into v_conv
  from public.conversacion_docente
  where id = p_conversacion_id;

  if not found then
    raise exception 'Conversacion no encontrada';
  end if;

  if v_conv.docente_identidad_ref = p_autor_identidad_ref then
    v_rol := 'DOCENTE';
  elsif v_conv.estudiante_identidad_ref = p_autor_identidad_ref then
    v_rol := 'ESTUDIANTE';
  else
    raise exception 'No autorizado';
  end if;

  insert into public.mensaje_conversacion (
    conversacion_id,
    autor_identidad_ref,
    autor_rol,
    contenido,
    adjunto_nombre,
    adjunto_tipo,
    adjunto_tamano
  ) values (
    v_conv.id,
    p_autor_identidad_ref,
    v_rol,
    v_texto,
    nullif(trim(coalesce(p_adjunto_nombre, '')), ''),
    nullif(trim(coalesce(p_adjunto_tipo, '')), ''),
    p_adjunto_tamano
  )
  returning * into v_msg;

  update public.conversacion_docente
  set
    actualizado_en = now(),
    docente_visto_en = case
      when v_rol = 'DOCENTE' then now()
      else docente_visto_en
    end,
    estudiante_visto_en = case
      when v_rol = 'ESTUDIANTE' then now()
      else estudiante_visto_en
    end
  where id = v_conv.id;

  return jsonb_build_object(
    'ok', true,
    'mensaje', jsonb_build_object(
      'id', v_msg.id,
      'contenido', v_msg.contenido,
      'hora', to_char(v_msg.creado_en at time zone 'America/Lima', 'HH24:MI'),
      'autor', v_msg.autor_rol,
      'adjunto', case
        when v_msg.adjunto_nombre is null then null
        else jsonb_build_object(
          'nombre', v_msg.adjunto_nombre,
          'tipo', coalesce(v_msg.adjunto_tipo, 'application/octet-stream'),
          'tamanio', coalesce(v_msg.adjunto_tamano, 0)
        )
      end
    )
  );
end;
$$;

create or replace function public.servicio_marcar_conversacion_leida(
  p_conversacion_id uuid,
  p_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversacion_docente%rowtype;
begin
  select * into v_conv
  from public.conversacion_docente
  where id = p_conversacion_id;

  if not found then
    raise exception 'Conversacion no encontrada';
  end if;

  if v_conv.docente_identidad_ref = p_identidad_ref then
    update public.conversacion_docente
    set docente_visto_en = now()
    where id = v_conv.id;
  elsif v_conv.estudiante_identidad_ref = p_identidad_ref then
    update public.conversacion_docente
    set estudiante_visto_en = now()
    where id = v_conv.id;
  else
    raise exception 'No autorizado';
  end if;

  return jsonb_build_object('ok', true, 'conversacionId', p_conversacion_id);
end;
$$;

-- Ingresos del docente a partir de ítems de órdenes de sus cursos.
create or replace function public.servicio_listar_ingresos_docente(
  p_docente_identidad_ref uuid
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
  if p_docente_identidad_ref is null then
    raise exception 'Docente requerido';
  end if;

  select coalesce(jsonb_agg(item order by item->>'fecha' desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', i.id,
      'curso', coalesce(c.titulo, i.descripcion_historica, 'Curso'),
      'fecha', to_char(
        coalesce(p.confirmado_en, o.creada_en) at time zone 'America/Lima',
        'YYYY-MM-DD'
      ),
      'concepto', case
        when upper(coalesce(p.estado::text, o.estado::text, '')) ~ 'CONFIRM|PAGAD|COMPLET'
          then 'Venta individual'
        else 'Orden pendiente'
      end,
      'importe', round(i.total_centavos::numeric / 100.0, 2),
      'estado', case
        when upper(coalesce(p.estado::text, '')) ~ 'CONFIRM|PAGAD|COMPLET'
          then 'DISPONIBLE'
        when upper(coalesce(o.estado::text, '')) ~ 'PEND'
          then 'POR_LIQUIDAR'
        when upper(coalesce(o.estado::text, '')) ~ 'PAGAD|COMPLET|CERRAD'
          then 'PAGADO'
        else 'POR_LIQUIDAR'
      end
    ) as item
    from public.item_orden i
    join public.orden_compra o on o.id = i.orden_compra_id
    left join lateral (
      select po.*
      from public.pago_orden po
      where po.orden_compra_id = o.id
      order by coalesce(po.confirmado_en, po.creado_en) desc nulls last
      limit 1
    ) p on true
    left join public.curso c on c.id = i.producto_ref
    where c.autor_identidad_ref = p_docente_identidad_ref
       or (
         i.producto_tipo ilike '%curso%'
         and exists (
           select 1 from public.curso cx
           where cx.id = i.producto_ref
             and cx.autor_identidad_ref = p_docente_identidad_ref
         )
       )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'movimientos', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.servicio_asegurar_conversaciones_docente(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_conversaciones_docente(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_mensajes_conversacion(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_enviar_mensaje_conversacion(uuid, uuid, text, text, text, bigint)
  from public, anon, authenticated;
revoke all on function public.servicio_marcar_conversacion_leida(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_ingresos_docente(uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_asegurar_conversaciones_docente(uuid) to service_role;
grant execute on function public.servicio_listar_conversaciones_docente(uuid) to service_role;
grant execute on function public.servicio_obtener_mensajes_conversacion(uuid, uuid) to service_role;
grant execute on function public.servicio_enviar_mensaje_conversacion(uuid, uuid, text, text, text, bigint) to service_role;
grant execute on function public.servicio_marcar_conversacion_leida(uuid, uuid) to service_role;
grant execute on function public.servicio_listar_ingresos_docente(uuid) to service_role;

commit;
