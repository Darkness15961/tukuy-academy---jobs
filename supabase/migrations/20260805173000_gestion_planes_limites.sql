-- Escritura administrativa de planes y limites, sin exponer tablas al cliente.

create unique index if not exists uq_limite_plan_recurso
  on public.limite_plan(plan_saas_id, codigo_recurso);

create or replace function public.admin_guardar_plan(p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_datos->>'id', '')::uuid;
  v_codigo text := upper(trim(coalesce(p_datos->>'codigo', '')));
  v_nombre text := trim(coalesce(p_datos->>'nombre', ''));
  v_tipado public.plan_saas;
  v_limite record;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_codigo = '' or v_nombre = '' then
    raise exception 'Codigo y nombre son obligatorios';
  end if;
  if coalesce((p_datos->>'precioCentavos')::bigint, -1) < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  select * into v_tipado
  from jsonb_populate_record(null::public.plan_saas, jsonb_build_object(
    'periodicidad', upper(coalesce(p_datos->>'periodicidad', 'MENSUAL')),
    'estado', upper(coalesce(p_datos->>'estado', 'ACTIVO'))
  ));

  if v_id is null then
    insert into public.plan_saas(codigo, nombre, descripcion, moneda, precio_centavos, periodicidad, estado)
    values(v_codigo, v_nombre, nullif(trim(p_datos->>'descripcion'), ''), upper(coalesce(p_datos->>'moneda','PEN')),
      (p_datos->>'precioCentavos')::bigint, v_tipado.periodicidad, v_tipado.estado)
    returning id into v_id;
  else
    update public.plan_saas set
      codigo = v_codigo, nombre = v_nombre, descripcion = nullif(trim(p_datos->>'descripcion'), ''),
      moneda = upper(coalesce(p_datos->>'moneda','PEN')), precio_centavos = (p_datos->>'precioCentavos')::bigint,
      periodicidad = v_tipado.periodicidad, estado = v_tipado.estado,
      actualizado_en = now(), version_registro = version_registro + 1
    where id = v_id;
    if not found then raise exception 'Plan inexistente'; end if;
  end if;

  for v_limite in
    select upper(trim(codigo)) codigo, limite, trim(unidad) unidad
    from jsonb_to_recordset(coalesce(p_datos->'limites', '[]'::jsonb)) as x(codigo text, limite bigint, unidad text)
  loop
    if v_limite.codigo = '' or v_limite.limite < 0 or v_limite.unidad = '' then
      raise exception 'Limite invalido para %', v_limite.codigo;
    end if;
    insert into public.limite_plan(plan_saas_id, codigo_recurso, limite, unidad)
    values(v_id, v_limite.codigo, v_limite.limite, v_limite.unidad)
    on conflict (plan_saas_id, codigo_recurso) do update set limite = excluded.limite, unidad = excluded.unidad;
  end loop;
  return v_id;
end;
$$;

revoke all on function public.admin_guardar_plan(jsonb) from public;
grant execute on function public.admin_guardar_plan(jsonb) to authenticated;
