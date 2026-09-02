-- Imagen de referencia en cuestionarios.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO (no el principal).
--
-- Las preguntas viven en actividad_curso.banco_preguntas (jsonb), p.ej.:
--   [{"question":"...","options":["A","B"],"correctIndex":0,"imagenReferencia":"https://..."}]
-- El constructor ya guarda ese JSON al salvar el curso.
-- Este script:
--   1) agrega columna texto imagen_referencia (fallback del quiz entero)
--   2) hace que el alumno reciba la URL (hoy _servicio_quiz_sin_respuestas la recorta)

begin;

alter table public.actividad_curso
  add column if not exists imagen_referencia text;

comment on column public.actividad_curso.imagen_referencia is
  'URL o clave S3 de imagen de referencia del cuestionario. Cada pregunta puede traer la suya en banco_preguntas[].imagenReferencia.';

create or replace function public._servicio_quiz_imagen_pregunta(p_pregunta jsonb)
returns text
language sql
immutable
as $$
  select nullif(trim(coalesce(
    p_pregunta->>'imagenReferencia',
    p_pregunta->>'imagen_referencia',
    p_pregunta->>'imagen',
    p_pregunta->>'imageUrl',
    ''
  )), '');
$$;

create or replace function public._servicio_quiz_sin_respuestas(p_banco jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'question', coalesce(q->>'question', ''),
            'options', coalesce(q->'options', '[]'::jsonb),
            'imagenReferencia', public._servicio_quiz_imagen_pregunta(q)
          )
        )
        order by ordinality
      )
      from jsonb_array_elements(coalesce(p_banco, '[]'::jsonb))
        with ordinality as t(q, ordinality)
    ),
    '[]'::jsonb
  );
$$;

-- Si el quiz no tiene imagen a nivel actividad, copia la primera del banco.
create or replace function public._trg_actividad_imagen_desde_banco()
returns trigger
language plpgsql
as $$
declare
  v_url text;
begin
  if new.imagen_referencia is not null and trim(new.imagen_referencia) <> '' then
    return new;
  end if;
  if new.banco_preguntas is null
    or jsonb_typeof(new.banco_preguntas) <> 'array'
  then
    return new;
  end if;

  select public._servicio_quiz_imagen_pregunta(q)
  into v_url
  from jsonb_array_elements(new.banco_preguntas) as q
  where public._servicio_quiz_imagen_pregunta(q) is not null
  limit 1;

  new.imagen_referencia := v_url;
  return new;
end;
$$;

drop trigger if exists trg_actividad_imagen_desde_banco on public.actividad_curso;
create trigger trg_actividad_imagen_desde_banco
before insert or update of banco_preguntas, imagen_referencia
on public.actividad_curso
for each row
execute function public._trg_actividad_imagen_desde_banco();

-- Backfill: rellena la columna con la primera imagen ya guardada en el JSON.
update public.actividad_curso a
set imagen_referencia = sub.url
from (
  select
    id,
    (
      select public._servicio_quiz_imagen_pregunta(q)
      from jsonb_array_elements(banco_preguntas) as q
      where public._servicio_quiz_imagen_pregunta(q) is not null
      limit 1
    ) as url
  from public.actividad_curso
  where banco_preguntas is not null
    and jsonb_typeof(banco_preguntas) = 'array'
) sub
where a.id = sub.id
  and (a.imagen_referencia is null or trim(a.imagen_referencia) = '')
  and sub.url is not null;

revoke all on function public._servicio_quiz_imagen_pregunta(jsonb)
  from public, anon, authenticated;
revoke all on function public._servicio_quiz_sin_respuestas(jsonb)
  from public, anon, authenticated;
grant execute on function public._servicio_quiz_imagen_pregunta(jsonb) to service_role;
grant execute on function public._servicio_quiz_sin_respuestas(jsonb) to service_role;

commit;
