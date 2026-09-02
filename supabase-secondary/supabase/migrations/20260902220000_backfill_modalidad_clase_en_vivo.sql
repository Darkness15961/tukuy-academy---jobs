-- Cursos de «Clase en vivo» (sesión rápida) que quedaron VIRTUAL → EN_VIVO.

begin;

do $$
declare
  v_cast text;
  v_label text;
begin
  select public._servicio_sql_tipo_cast('curso', 'modalidad') into v_cast;
  if v_cast is null then
    raise notice 'Sin cast de modalidad; skip backfill';
    return;
  end if;

  v_label := public._servicio_resolver_enum_curso(
    'modalidad',
    array['EN_VIVO', 'PRESENCIAL', 'VIRTUAL']
  );
  if v_label is null or upper(v_label) = 'VIRTUAL' then
    raise notice 'Enum modalidad sin EN_VIVO/PRESENCIAL; skip backfill';
    return;
  end if;

  execute format(
    'update public.curso
     set modalidad = $1::%s,
         actualizado_en = now()
     where upper(coalesce(categoria, '''')) like ''%%CLASE%%EN%%VIVO%%''
       and upper(modalidad::text) in (''VIRTUAL'', ''ASINCRONO'')',
    v_cast
  )
  using v_label;
end;
$$;

commit;
