-- Modelos de firmas 1/2/3 en layout de plantilla de certificado (JSONB).
-- El layout completo (incl. modelosFirmantes + cantidadFirmantesActiva) ya
-- se persiste vía org_upsert_plantilla_certificado → columna layout.
-- Esta migración alinea el default SQL y rellena plantillas antiguas.

create or replace function public._org_layout_certificado_default()
returns jsonb
language sql
immutable
as $$
  select '{
    "orientacion":"landscape",
    "formato":"a4",
    "anchoMm":297,
    "altoMm":210,
    "cantidadFirmantesActiva":1,
    "campos":{
      "tituloDocumento":{"xMm":148.5,"yMm":42,"fontSize":12,"align":"center","visible":true,"texto":"CERTIFICADO DE RECONOCIMIENTO","widthMm":220},
      "introduccion":{"xMm":148.5,"yMm":58,"fontSize":10,"align":"center","visible":true,"texto":"La institución certifica que","widthMm":200},
      "titular":{"xMm":148.5,"yMm":78,"fontSize":24,"align":"center","visible":true,"texto":"Nombre del alumno","widthMm":240},
      "curso":{"xMm":148.5,"yMm":106,"fontSize":15,"align":"center","visible":true,"texto":"Nombre del curso","widthMm":230},
      "detalle":{"xMm":148.5,"yMm":122,"fontSize":10,"align":"center","visible":true,"texto":"Categoría · horas · nivel · modalidad","widthMm":240},
      "fecha":{"xMm":70,"yMm":155,"fontSize":10,"align":"center","visible":true,"texto":"Fecha de emisión","widthMm":70},
      "codigo":{"xMm":148.5,"yMm":155,"fontSize":9,"align":"center","visible":true,"texto":"Código de verificación","widthMm":75},
      "logo":{"xMm":28,"yMm":18,"widthMm":28,"heightMm":18,"visible":true},
      "qr":{"xMm":250,"yMm":16,"widthMm":28,"heightMm":28,"visible":true}
    },
    "firmantes":[
      {
        "id":"firma-default-1",
        "etiqueta":"Firma 1",
        "nombreMostrar":"",
        "xMm":148.5,
        "yMm":172,
        "fontSize":10,
        "align":"center",
        "visible":true,
        "anchoLineaMm":58
      }
    ],
    "modelosFirmantes":{
      "1":[
        {
          "id":"firma-m1-1",
          "etiqueta":"Firma 1",
          "nombreMostrar":"",
          "xMm":148.5,
          "yMm":172,
          "fontSize":10,
          "align":"center",
          "visible":true,
          "anchoLineaMm":58
        }
      ],
      "2":[
        {
          "id":"firma-m2-1",
          "etiqueta":"Firma 1",
          "nombreMostrar":"",
          "xMm":85,
          "yMm":172,
          "fontSize":10,
          "align":"center",
          "visible":true,
          "anchoLineaMm":52
        },
        {
          "id":"firma-m2-2",
          "etiqueta":"Firma 2",
          "nombreMostrar":"",
          "xMm":212,
          "yMm":172,
          "fontSize":10,
          "align":"center",
          "visible":true,
          "anchoLineaMm":52
        }
      ],
      "3":[
        {
          "id":"firma-m3-1",
          "etiqueta":"Firma 1",
          "nombreMostrar":"",
          "xMm":55,
          "yMm":172,
          "fontSize":9,
          "align":"center",
          "visible":true,
          "anchoLineaMm":42
        },
        {
          "id":"firma-m3-2",
          "etiqueta":"Firma 2",
          "nombreMostrar":"",
          "xMm":148.5,
          "yMm":172,
          "fontSize":9,
          "align":"center",
          "visible":true,
          "anchoLineaMm":42
        },
        {
          "id":"firma-m3-3",
          "etiqueta":"Firma 3",
          "nombreMostrar":"",
          "xMm":242,
          "yMm":172,
          "fontSize":9,
          "align":"center",
          "visible":true,
          "anchoLineaMm":42
        }
      ]
    }
  }'::jsonb;
$$;

-- Rellena modelosFirmantes en plantillas que aún no los tienen,
-- partiendo de firmantes actuales + defaults 2/3.
create or replace function public._org_backfill_modelos_firmantes(p_layout jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_firmantes jsonb;
  v_n int;
  v_default jsonb := public._org_layout_certificado_default();
  v_modelos jsonb;
begin
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' then
    return v_default;
  end if;

  if p_layout ? 'modelosFirmantes'
     and jsonb_typeof(p_layout->'modelosFirmantes') = 'object'
     and (p_layout->'modelosFirmantes' ? '1')
     and (p_layout->'modelosFirmantes' ? '2')
     and (p_layout->'modelosFirmantes' ? '3')
  then
    return p_layout;
  end if;

  v_firmantes := coalesce(p_layout->'firmantes', '[]'::jsonb);
  if jsonb_typeof(v_firmantes) <> 'array' then
    v_firmantes := '[]'::jsonb;
  end if;
  v_n := jsonb_array_length(v_firmantes);

  v_modelos := coalesce(p_layout->'modelosFirmantes', '{}'::jsonb);
  if v_n = 1 then
    v_modelos := jsonb_set(v_modelos, '{1}', v_firmantes, true);
  elsif v_n = 2 then
    v_modelos := jsonb_set(v_modelos, '{2}', v_firmantes, true);
  elsif v_n >= 3 then
    v_modelos := jsonb_set(v_modelos, '{3}', v_firmantes, true);
  end if;

  if not (v_modelos ? '1') then
    v_modelos := jsonb_set(v_modelos, '{1}', v_default->'modelosFirmantes'->'1', true);
  end if;
  if not (v_modelos ? '2') then
    v_modelos := jsonb_set(v_modelos, '{2}', v_default->'modelosFirmantes'->'2', true);
  end if;
  if not (v_modelos ? '3') then
    v_modelos := jsonb_set(v_modelos, '{3}', v_default->'modelosFirmantes'->'3', true);
  end if;

  return p_layout
    || jsonb_build_object(
      'modelosFirmantes', v_modelos,
      'cantidadFirmantesActiva',
        coalesce(
          (p_layout->>'cantidadFirmantesActiva')::int,
          case when v_n >= 3 then 3 when v_n = 2 then 2 else 1 end
        )
    );
end;
$$;

update public.org_plantilla_certificado
set
  layout = public._org_backfill_modelos_firmantes(layout),
  actualizado_en = now()
where activa
  and (
    layout->'modelosFirmantes' is null
    or not (layout->'modelosFirmantes' ? '1')
    or not (layout->'modelosFirmantes' ? '2')
    or not (layout->'modelosFirmantes' ? '3')
  );

-- Asegura que el upsert siga guardando el layout completo (sin cambios de firma;
-- documentamos el contrato esperado en comentario).
comment on column public.org_plantilla_certificado.layout is
  'JSONB A4 landscape: campos, firmantes activos, modelosFirmantes{1,2,3}, cantidadFirmantesActiva. Persistido íntegro por org_upsert_plantilla_certificado.';
