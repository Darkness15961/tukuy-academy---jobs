-- Clasifica instalaciones internas sin crear suscripciones SaaS artificiales.

alter table public.instalacion_organizacion
  add column if not exists clasificacion text not null default 'CLIENTE'
    check (clasificacion in ('INTERNA', 'CLIENTE', 'DEMOSTRACION')),
  add column if not exists facturable boolean not null default true,
  add column if not exists vigencia_indefinida boolean not null default false;

comment on column public.instalacion_organizacion.clasificacion is
  'INTERNA para la operación propietaria de Tukuy; CLIENTE para tenants SaaS; DEMOSTRACION para pruebas.';
comment on column public.instalacion_organizacion.facturable is
  'Indica si la instalación participa en el ciclo comercial SaaS.';
comment on column public.instalacion_organizacion.vigencia_indefinida is
  'Evita exigir fecha de vencimiento comercial; no altera el estado técnico de provisionamiento.';

update public.instalacion_organizacion instalacion
set
  clasificacion = 'INTERNA',
  facturable = false,
  vigencia_indefinida = true,
  actualizada_en = now(),
  version_registro = instalacion.version_registro + 1
from public.empresa_principal empresa
where empresa.id = instalacion.empresa_principal_ref
  and empresa.codigo = 'TUKUY';

-- Conserva la consulta paginada previa como base y enriquece solamente el
-- bloque solicitado, sin cargar instalaciones fuera de la página actual.
alter function public.admin_listar_organizaciones_paginado(integer, integer, text, text, text)
  rename to admin_listar_organizaciones_paginado_base;

create function public.admin_listar_organizaciones_paginado(
  p_pagina integer default 1,
  p_por_pagina integer default 10,
  p_buscar text default null,
  p_estado text default null,
  p_plan text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
  v_datos jsonb;
begin
  v_resultado := public.admin_listar_organizaciones_paginado_base(
    p_pagina,
    p_por_pagina,
    p_buscar,
    p_estado,
    p_plan
  );

  select coalesce(jsonb_agg(
    item || jsonb_build_object(
      'clasificacion', instalacion.clasificacion,
      'facturable', instalacion.facturable,
      'vigencia_indefinida', instalacion.vigencia_indefinida,
      'plan', case
        when instalacion.clasificacion = 'INTERNA' then 'Operación interna'
        else item ->> 'plan'
      end,
      'estado_suscripcion', case
        when instalacion.clasificacion = 'INTERNA' then 'NO APLICA'
        else item ->> 'estado_suscripcion'
      end
    )
  ), '[]'::jsonb)
  into v_datos
  from jsonb_array_elements(coalesce(v_resultado -> 'datos', '[]'::jsonb)) item
  join public.instalacion_organizacion instalacion
    on instalacion.id = (item ->> 'id')::uuid;

  return jsonb_set(v_resultado, '{datos}', v_datos, true);
end;
$$;

revoke all on function public.admin_listar_organizaciones_paginado_base(integer, integer, text, text, text) from public;
revoke all on function public.admin_listar_organizaciones_paginado(integer, integer, text, text, text) from public;
grant execute on function public.admin_listar_organizaciones_paginado(integer, integer, text, text, text) to authenticated;
