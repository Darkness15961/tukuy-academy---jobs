-- Checkout de cursos: crear orden, confirmar pago simulado y matricular.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- Si las tablas comerciales ya existen, CREATE IF NOT EXISTS no las toca.
-- Las RPCs usan solo columnas que ya consume servicio_listar_ingresos_docente.

begin;

create table if not exists public.orden_compra (
  id uuid primary key default gen_random_uuid(),
  comprador_identidad_ref uuid not null,
  estado text not null default 'PENDIENTE',
  moneda text not null default 'PEN',
  total_centavos integer not null default 0,
  creada_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.item_orden (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.orden_compra (id) on delete cascade,
  producto_ref uuid,
  producto_tipo text not null default 'CURSO',
  descripcion_historica text,
  total_centavos integer not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists public.pago_orden (
  id uuid primary key default gen_random_uuid(),
  orden_compra_id uuid not null references public.orden_compra (id) on delete cascade,
  estado text not null default 'PENDIENTE',
  monto_centavos integer not null default 0,
  proveedor text,
  referencia_externa text,
  confirmado_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists item_orden_orden_idx on public.item_orden (orden_compra_id);
create index if not exists pago_orden_orden_idx on public.pago_orden (orden_compra_id);
create index if not exists orden_compra_comprador_idx
  on public.orden_compra (comprador_identidad_ref);

-- Completa columnas si las tablas ya existían con un esquema parcial.
alter table public.orden_compra
  add column if not exists comprador_identidad_ref uuid,
  add column if not exists moneda text default 'PEN',
  add column if not exists total_centavos integer default 0,
  add column if not exists actualizado_en timestamptz default now();

alter table public.item_orden
  add column if not exists producto_ref uuid,
  add column if not exists producto_tipo text default 'CURSO',
  add column if not exists descripcion_historica text,
  add column if not exists total_centavos integer default 0,
  add column if not exists creado_en timestamptz default now();

alter table public.pago_orden
  add column if not exists monto_centavos integer default 0,
  add column if not exists proveedor text,
  add column if not exists referencia_externa text,
  add column if not exists confirmado_en timestamptz,
  add column if not exists creado_en timestamptz default now();

-- ---------------------------------------------------------------------------
-- Crear orden pendiente con N cursos
-- p_items: [{ "cursoId": uuid, "titulo": text, "totalCentavos": int }]
-- ---------------------------------------------------------------------------

create or replace function public.servicio_crear_orden_compra(
  p_comprador_identidad_ref uuid,
  p_items jsonb,
  p_moneda text default 'PEN'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orden_id uuid := gen_random_uuid();
  v_total integer := 0;
  v_item jsonb;
  v_curso_id uuid;
  v_titulo text;
  v_centavos integer;
  v_curso_titulo text;
  v_items_out jsonb := '[]'::jsonb;
begin
  if p_comprador_identidad_ref is null then
    raise exception 'Comprador requerido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Se requiere al menos un item de curso';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_curso_id := nullif(trim(coalesce(v_item->>'cursoId', '')), '')::uuid;
    exception
      when others then
        raise exception 'cursoId invalido en items';
    end;
    if v_curso_id is null then
      raise exception 'cursoId requerido en cada item';
    end if;

    select c.titulo into v_curso_titulo
    from public.curso c
    where c.id = v_curso_id;
    if v_curso_titulo is null then
      raise exception 'Curso % no existe en la secundaria', v_curso_id;
    end if;

    v_titulo := coalesce(
      nullif(trim(coalesce(v_item->>'titulo', '')), ''),
      v_curso_titulo
    );
    v_centavos := greatest(coalesce((v_item->>'totalCentavos')::integer, 0), 0);
    v_total := v_total + v_centavos;

    v_items_out := v_items_out || jsonb_build_array(jsonb_build_object(
      'cursoId', v_curso_id,
      'titulo', v_titulo,
      'totalCentavos', v_centavos
    ));
  end loop;

  insert into public.orden_compra (
    id, comprador_identidad_ref, estado, moneda, total_centavos, creada_en, actualizado_en
  ) values (
    v_orden_id,
    p_comprador_identidad_ref,
    'PENDIENTE',
    coalesce(nullif(trim(p_moneda), ''), 'PEN'),
    v_total,
    now(),
    now()
  );

  for v_item in select value from jsonb_array_elements(v_items_out)
  loop
    insert into public.item_orden (
      id,
      orden_compra_id,
      producto_ref,
      producto_tipo,
      descripcion_historica,
      total_centavos,
      creado_en
    ) values (
      gen_random_uuid(),
      v_orden_id,
      (v_item->>'cursoId')::uuid,
      'CURSO',
      v_item->>'titulo',
      (v_item->>'totalCentavos')::integer,
      now()
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'ordenId', v_orden_id,
    'estado', 'PENDIENTE',
    'moneda', coalesce(nullif(trim(p_moneda), ''), 'PEN'),
    'totalCentavos', v_total,
    'importe', round(v_total::numeric / 100.0, 2),
    'cursoIds', (
      select coalesce(jsonb_agg(value->>'cursoId'), '[]'::jsonb)
      from jsonb_array_elements(v_items_out)
    ),
    'items', v_items_out
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Obtener orden (polling / rehidratación)
-- ---------------------------------------------------------------------------

create or replace function public.servicio_obtener_orden_compra(
  p_orden_id uuid,
  p_comprador_identidad_ref uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_orden public.orden_compra;
  v_items jsonb;
  v_pago jsonb;
begin
  if p_orden_id is null then
    raise exception 'Orden requerida';
  end if;

  select * into v_orden
  from public.orden_compra
  where id = p_orden_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Orden no encontrada');
  end if;

  if p_comprador_identidad_ref is not null
    and v_orden.comprador_identidad_ref is distinct from p_comprador_identidad_ref
  then
    return jsonb_build_object('ok', false, 'error', 'No autorizado para esta orden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'cursoId', i.producto_ref,
    'titulo', coalesce(i.descripcion_historica, c.titulo, 'Curso'),
    'totalCentavos', i.total_centavos
  ) order by i.creado_en), '[]'::jsonb)
  into v_items
  from public.item_orden i
  left join public.curso c on c.id = i.producto_ref
  where i.orden_compra_id = v_orden.id;

  select jsonb_build_object(
    'id', p.id,
    'estado', p.estado,
    'montoCentavos', p.monto_centavos,
    'proveedor', p.proveedor,
    'referenciaExterna', p.referencia_externa,
    'confirmadoEn', p.confirmado_en
  )
  into v_pago
  from public.pago_orden p
  where p.orden_compra_id = v_orden.id
  order by coalesce(p.confirmado_en, p.creado_en) desc nulls last
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'ordenId', v_orden.id,
    'estado', v_orden.estado,
    'moneda', v_orden.moneda,
    'totalCentavos', v_orden.total_centavos,
    'importe', round(v_orden.total_centavos::numeric / 100.0, 2),
    'cursoIds', (
      select coalesce(jsonb_agg(i.producto_ref), '[]'::jsonb)
      from public.item_orden i
      where i.orden_compra_id = v_orden.id
    ),
    'items', v_items,
    'pago', v_pago
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmar pago (simulado / code 00) + matricular cada curso
-- ---------------------------------------------------------------------------

create or replace function public.servicio_confirmar_pago_orden(
  p_orden_id uuid,
  p_comprador_identidad_ref uuid,
  p_codigo_respuesta text default '00',
  p_referencia_externa text default null,
  p_proveedor text default 'izipay'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orden public.orden_compra;
  v_item record;
  v_matriculas jsonb := '[]'::jsonb;
  v_mat jsonb;
  v_pago_id uuid;
  v_aprobado boolean := upper(trim(coalesce(p_codigo_respuesta, ''))) in ('00', 'OK', 'APPROVED');
  v_estado_orden text;
begin
  if p_orden_id is null or p_comprador_identidad_ref is null then
    raise exception 'Orden y comprador requeridos';
  end if;

  select * into v_orden
  from public.orden_compra
  where id = p_orden_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Orden no encontrada');
  end if;

  if v_orden.comprador_identidad_ref is distinct from p_comprador_identidad_ref then
    return jsonb_build_object('ok', false, 'error', 'No autorizado para esta orden');
  end if;

  if upper(coalesce(v_orden.estado, '')) ~ 'PAGAD|CONFIRM|COMPLET' then
    return public.servicio_obtener_orden_compra(p_orden_id, p_comprador_identidad_ref)
      || jsonb_build_object('yaPagada', true, 'mensaje', 'La orden ya estaba pagada');
  end if;

  if not v_aprobado then
    update public.orden_compra
    set estado = 'RECHAZADA', actualizado_en = now()
    where id = v_orden.id;

    insert into public.pago_orden (
      id, orden_compra_id, estado, monto_centavos, proveedor, referencia_externa, creado_en
    ) values (
      gen_random_uuid(),
      v_orden.id,
      'RECHAZADO',
      v_orden.total_centavos,
      coalesce(nullif(trim(p_proveedor), ''), 'izipay'),
      nullif(trim(coalesce(p_referencia_externa, '')), ''),
      now()
    );

    return jsonb_build_object(
      'ok', true,
      'ordenId', v_orden.id,
      'estado', 'RECHAZADA',
      'mensaje', 'Pago rechazado'
    );
  end if;

  v_pago_id := gen_random_uuid();
  insert into public.pago_orden (
    id,
    orden_compra_id,
    estado,
    monto_centavos,
    proveedor,
    referencia_externa,
    confirmado_en,
    creado_en
  ) values (
    v_pago_id,
    v_orden.id,
    'CONFIRMADO',
    v_orden.total_centavos,
    coalesce(nullif(trim(p_proveedor), ''), 'izipay'),
    nullif(trim(coalesce(p_referencia_externa, '')), ''),
    now(),
    now()
  );

  update public.orden_compra
  set estado = 'PAGADA', actualizado_en = now()
  where id = v_orden.id
  returning estado into v_estado_orden;

  for v_item in
    select i.*
    from public.item_orden i
    where i.orden_compra_id = v_orden.id
      and i.producto_ref is not null
  loop
    v_mat := public.servicio_matricular_estudiante(
      v_item.producto_ref,
      p_comprador_identidad_ref,
      'COMPRA'
    );
    v_matriculas := v_matriculas || jsonb_build_array(
      coalesce(v_mat, jsonb_build_object('ok', false, 'cursoId', v_item.producto_ref))
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'ordenId', v_orden.id,
    'estado', coalesce(v_estado_orden, 'PAGADA'),
    'pagoId', v_pago_id,
    'mensaje', 'Pago confirmado y matrículas aplicadas',
    'matriculas', v_matriculas,
    'cursoIds', (
      select coalesce(jsonb_agg(i.producto_ref), '[]'::jsonb)
      from public.item_orden i
      where i.orden_compra_id = v_orden.id
    ),
    'importe', round(v_orden.total_centavos::numeric / 100.0, 2)
  );
end;
$$;

revoke all on function public.servicio_crear_orden_compra(uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_orden_compra(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_confirmar_pago_orden(uuid, uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.servicio_crear_orden_compra(uuid, jsonb, text) to service_role;
grant execute on function public.servicio_obtener_orden_compra(uuid, uuid) to service_role;
grant execute on function public.servicio_confirmar_pago_orden(uuid, uuid, text, text, text) to service_role;

commit;
