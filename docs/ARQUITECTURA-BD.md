# Arquitectura de BD — índice

La base de datos de Tukuy Academy se documenta en **varios archivos por dominio**, no en un solo monolito. Cada uno describe tablas, relaciones, permisos y diagramas de su contexto.

## Mapa de documentos

| # | Documento | Orientado a |
|---|---|---|
| 0 | [Este índice](./ARQUITECTURA-BD.md) | Principios globales y cómo leer el resto |
| 1 | [`bd/01-plataforma-identidad-pagos.md`](./bd/01-plataforma-identidad-pagos.md) | Login, usuarios, membresías, pagos B2C, planes SaaS, auditoría |
| 2 | [`bd/02-organizacion-estructura-permisos.md`](./bd/02-organizacion-estructura-permisos.md) | Portal organización: directorio interno, unidades, perfiles y **el mismo sistema de permisos** |
| 3 | [`bd/03-catalogo-aprendizaje.md`](./bd/03-catalogo-aprendizaje.md) | Cursos, versiones, matrículas, entregas, progreso |
| 4 | [`bd/04-vivo-certificados.md`](./bd/04-vivo-certificados.md) | Sesiones en vivo / Meet y certificados verificables |
| 5 | [`bd/05-comunidad-bolsa.md`](./bd/05-comunidad-bolsa.md) | Comunidad, perfiles públicos, vacantes y postulaciones |
| 6 | [`DIAGRAMA-BD-POR-ORGANIZACION.md`](./DIAGRAMA-BD-POR-ORGANIZACION.md) | Topología física: plataforma vs BD/schema por entidad |
| 7 | [`bd/tukuy-plataforma.dbml`](./bd/tukuy-plataforma.dbml) | Diagrama BD **plataforma** (login, perfiles, pagos) |
| 8 | [`bd/tukuy-cliente-personal.dbml`](./bd/tukuy-cliente-personal.dbml) | Diagrama **cliente sin organización** (alumno / docente independiente) |
| 9 | [`bd/tukuy-bd-organizacion.dbml`](./bd/tukuy-bd-organizacion.dbml) | Diagrama BD **por organización** (colegio/empresa) |
| 10 | [`bd/06-cliente-personal.md`](./bd/06-cliente-personal.md) | Explicación del cliente personal (español) |
| 11 | [`bd/tukuy-academy.dbml`](./bd/tukuy-academy.dbml) | Vista lógica unificada (solo referencia) |

## Glosario (español, para el cliente)

| Decimos | Evitamos | Significado |
|---|---|---|
| **BD plataforma** | — | Base compartida de Tukuy: login, perfiles, pagos |
| **BD de la organización** | “tenant” | Base (o schema) de un colegio/empresa concreto |
| **registro_bd_organizacion** | “registro_tenant” | Indica dónde viven los datos de cada org |
| **Entidad / organización** | “tenant” | CIP, Andina, Academia Horizonte, etc. |
| **Cliente personal** | — | Alumno o docente independiente, sin colegio/empresa |

## Principios que aplican a todos

| Principio | Decisión |
|---|---|
| Multiempresa | El acceso no es “tipo de usuario”: es **membresía** (usuario + organización + rol + permisos). |
| ID canónico | UUID en todas las tablas. |
| Soft delete | `eliminado_en` en entidades editables; auditoría append-only. |
| Dinero | Céntimos + moneda ISO; el cliente no define el total. |
| Archivos | Metadata en BD; binarios en object storage. |
| Motor | PostgreSQL 16+. |

## Cómo se conectan los dominios

```text
[1 Plataforma]
  usuario ── membresia ── organizacion ── registro_bd_organizacion
       │                      │
       │                      ├── [2 Organización] estructura, personas, perfiles
       │                      ├── [3 Catálogo] cursos / matrículas de la entidad
       │                      ├── [4 Vivo + certificados]
       │                      └── [5] vacantes de la org
       │
       ├── orden_pago (B2C marketplace)
       ├── comunidad / bolsa (persona)
       └── plan_saas / factura_saas / auditoria
```

## Permisos (regla única)

Hay **un solo modelo de autorización** en toda la plataforma:

1. La persona inicia sesión → `usuario` (doc 01).
2. Elige un contexto → `membresia` con `permisos[]` y `portal`.
3. Si el portal es organización, además puede tener **perfil de entidad** y **vinculación a unidades** (doc 02), que **refinan** el alcance (qué sedes/áreas ve), pero no inventan otro sistema de login.

```text
membresia.permisos          → ¿puede hacer X?  (cursos.crear, usuarios.invitar…)
perfil_entidad + unidades   → ¿sobre qué nodos? (alcance)
```

Detalle en [`bd/02-organizacion-estructura-permisos.md`](./bd/02-organizacion-estructura-permisos.md).

## Almacenamiento por entidad

No toda organización necesita su propia base desde el día 1. Ver [DIAGRAMA-BD-POR-ORGANIZACION.md](./DIAGRAMA-BD-POR-ORGANIZACION.md):

- Personal / Básica → compartido en plataforma  
- Pro → schema dedicado  
- Enterprise → BD dedicada  

## Orden de lectura sugerido

1. Doc **01** (login y pagos)  
2. Doc **02** (organización e internos)  
3. Doc **03** (cursos y aprendizaje)  
4. Docs **04** y **05** según el módulo  
5. BD por organización cuando se diseñe el deploy  

## Relacionado (fuera de BD)

- [`ARQUITECTURA-MODULAR.md`](./ARQUITECTURA-MODULAR.md) — módulos frontend  
- [`INTEGRACION-BACKEND.md`](./INTEGRACION-BACKEND.md) — contratos API  
- [`INTEGRACION-PAGOS-IZIPAY.md`](./INTEGRACION-PAGOS-IZIPAY.md) — checkout  
- [`ECOSISTEMA-BOLSA-COMUNIDAD.md`](./ECOSISTEMA-BOLSA-COMUNIDAD.md) — capacidades transversales  
