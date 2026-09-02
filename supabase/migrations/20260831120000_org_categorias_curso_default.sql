-- Categorías de curso por defecto (catálogo profesional construcción / CIP).
-- Siembra en todas las instalaciones existentes; idempotente por nombre (case-insensitive).
-- Ejecutar en el proyecto PRINCIPAL.
--
-- Nota: no depende de es_super_admin_actual() (puede faltar en algunos entornos).
-- - SQL Editor / service_role (sin JWT): siembra todas o una instalación.
-- - Usuario autenticado: solo su instalación, con categorias.gestionar o cursos.editar.

begin;

create or replace function public.org_sembrar_categorias_curso_default(
  p_instalacion_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instalaciones uuid[];
  v_inst uuid;
  v_insertadas integer := 0;
  v_omitidas integer := 0;
  v_cat record;
  v_uid uuid := auth.uid();
begin
  if p_instalacion_id is not null then
    if v_uid is not null
      and not (
        public.org_tiene_permiso(p_instalacion_id, 'categorias.gestionar')
        or public.org_tiene_permiso(p_instalacion_id, 'cursos.editar')
      )
    then
      raise exception 'No autorizado' using errcode = '42501';
    end if;
    v_instalaciones := array[p_instalacion_id];
  else
    -- Sembrar todas solo desde migraciones / SQL Editor (sin sesión de usuario).
    if v_uid is not null then
      raise exception
        'Indica p_instalacion_id para sembrar categorías en tu organización.'
        using errcode = '22023';
    end if;
    select coalesce(array_agg(i.id), '{}'::uuid[])
      into v_instalaciones
    from public.instalacion_organizacion i;
  end if;

  for v_inst in select unnest(v_instalaciones)
  loop
    for v_cat in
      select *
      from (
        values
          (
            'cat-gestion-obra',
            'Gestión de obra',
            'Planificación, valorizaciones y control de proyectos.',
            '#0B3A78',
            true,
            true,
            1
          ),
          (
            'cat-construccion-civil',
            'Construcción civil',
            'Ejecución, supervisión y métodos constructivos.',
            '#9A3412',
            true,
            true,
            2
          ),
          (
            'cat-bim-modelado',
            'BIM / Modelado',
            'Revit, Navisworks y coordinación BIM.',
            '#6D28D9',
            true,
            true,
            3
          ),
          (
            'cat-costos-presupuestos',
            'Costos y presupuestos',
            'Metrados, presupuestos, valorizaciones y control de costos.',
            '#0E7490',
            true,
            true,
            4
          ),
          (
            'cat-seguridad-obra',
            'Seguridad en obra',
            'Prevención, normativas SSOMA y protocolos de campo.',
            '#B91C1C',
            true,
            true,
            5
          ),
          (
            'cat-calidad',
            'Calidad',
            'Control de calidad, evidencias y mejora de procesos.',
            '#166534',
            true,
            true,
            6
          ),
          (
            'cat-tecnologia-digital',
            'Tecnología / digital',
            'Excel, Power BI y herramientas digitales aplicadas.',
            '#7C3AED',
            true,
            true,
            7
          ),
          (
            'cat-gestion-liderazgo',
            'Gestión y liderazgo',
            'Equipos, operaciones, administración y soft skills.',
            '#334155',
            true,
            true,
            8
          ),
          (
            'cat-estructuras',
            'Estructuras',
            'Análisis y diseño estructural.',
            '#1E3A8A',
            true,
            true,
            9
          ),
          (
            'cat-logistica',
            'Logística',
            'Almacén, Kardex y abastecimiento de obra.',
            '#B87A00',
            true,
            true,
            10
          ),
          (
            'cat-certificacion-profesional',
            'Certificación profesional',
            'Cursos orientados a diploma o certificación formal.',
            '#0369A1',
            true,
            true,
            11
          ),
          (
            'cat-empleabilidad',
            'Empleabilidad',
            'Perfil profesional, CV, entrevistas y oportunidades.',
            '#0F766E',
            true,
            true,
            12
          ),
          (
            'cat-operaciones-internas',
            'Operaciones internas',
            'Formación exclusiva para equipos y capítulos internos.',
            '#64748B',
            true,
            false,
            13
          )
      ) as t(
        id,
        nombre,
        descripcion,
        color,
        visible_en_catalogo,
        seleccionable_como_interes,
        orden
      )
    loop
      if exists (
        select 1
        from public.org_categoria_curso c
        where c.instalacion_organizacion_id = v_inst
          and (
            c.id = v_cat.id
            or lower(c.nombre) = lower(v_cat.nombre)
          )
      ) then
        v_omitidas := v_omitidas + 1;
        continue;
      end if;

      insert into public.org_categoria_curso (
        instalacion_organizacion_id,
        id,
        nombre,
        descripcion,
        color,
        visible_en_catalogo,
        seleccionable_como_interes,
        orden,
        estado,
        actualizado_en
      ) values (
        v_inst,
        v_cat.id,
        v_cat.nombre,
        v_cat.descripcion,
        v_cat.color,
        v_cat.visible_en_catalogo,
        v_cat.seleccionable_como_interes,
        v_cat.orden,
        'ACTIVA',
        now()
      );
      v_insertadas := v_insertadas + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'instalaciones', coalesce(array_length(v_instalaciones, 1), 0),
    'insertadas', v_insertadas,
    'omitidas', v_omitidas
  );
end;
$$;

comment on function public.org_sembrar_categorias_curso_default(uuid) is
  'Siembra el catálogo profesional de categorías de curso. Idempotente. '
  'Sin argumento (null) solo desde SQL Editor / service_role.';

revoke all on function public.org_sembrar_categorias_curso_default(uuid) from public;
grant execute on function public.org_sembrar_categorias_curso_default(uuid) to authenticated;
grant execute on function public.org_sembrar_categorias_curso_default(uuid) to service_role;

-- Backfill inmediato (SQL Editor no tiene auth.uid()).
select public.org_sembrar_categorias_curso_default(null);

commit;
