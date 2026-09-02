-- Fix: orden_compra.estado es enum estado_orden; upper() requiere ::text.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO si ya corriste 20260811161000.

begin;

create or replace function public.servicio_estudiante_tiene_compra_pagada(
  p_estudiante_identidad_ref uuid,
  p_curso_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_estudiante_identidad_ref is null or p_curso_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.orden_compra o
    join public.item_orden i on i.orden_compra_id = o.id
    where o.comprador_identidad_ref = p_estudiante_identidad_ref
      and upper(o.estado::text) in ('PAGADA', 'PAGADO', 'CONFIRMADA', 'CONFIRMADO')
      and i.producto_ref = p_curso_id
  );
end;
$$;

revoke all on function public.servicio_estudiante_tiene_compra_pagada(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_estudiante_tiene_compra_pagada(uuid, uuid)
  to service_role;

commit;
