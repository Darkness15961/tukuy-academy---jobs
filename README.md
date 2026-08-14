# Tukuy Academy & Jobs

SPA Vue 3 + Vite para capacitación, CV, bolsa laboral y comunidad. Multi-tenant: una persona entra, elige un **contexto** (membresía + rol) y abre uno de los portales.

El navegador **nunca** habla con el proyecto Supabase secundario. Auth, tenants y catálogo público viven en **principal**; academia (cursos, progreso, certificados, sesiones) vive en **secundaria** y se accede solo vía la Edge Function `secondary-gateway`.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Vue 3.5, Vite 8, TypeScript, Vue Router 5 |
| UI | Tailwind 4, PrimeVue 4 (Aura), reka-ui / shadcn-vue |
| Cliente HTTP | axios (REST legado) + `@supabase/supabase-js` |
| Auth / datos | Dos proyectos Supabase + Edge Functions |
| Pagos | Izipay (`@dankira/izipay` o SDK Token/Generate) |
| Media | AWS S3 (presign en Edge `media-presign`) |
| PDF / QR | jsPDF, qrcode |
| Runtime | Bun 1.3 (recomendado) o Node `^22.18.0` / `>=24.12.0` |

## Arquitectura

```
┌─────────────┐     JWT + anon key      ┌──────────────────────┐
│  SPA Vue 3  │ ───────────────────────►│  Supabase PRINCIPAL   │
│  :5178      │                         │  Auth, tenants, orgs, │
│             │  invoke (JWT)           │  catálogo, índice     │
│             │ ───────────────────────►│  certificados, SaaS   │
└─────────────┘                         └──────────┬───────────┘
                                                   │
                    secondary-gateway              │ service_role
                    (valida JWT, resuelve tenant)  │
                                                   ▼
                                        ┌──────────────────────┐
                                        │  Supabase SECUNDARIA │
                                        │  cursos, matrículas, │
                                        │  progreso, firmas,   │
                                        │  sesiones, checkout  │
                                        └──────────────────────┘
```

| Proyecto | Carpeta | Responsabilidad |
|----------|---------|-----------------|
| Principal | `supabase/` | Auth, identidad, membresías, organigrama, planes SaaS, `curso_catalogo`, `indice_certificado_publico`, webhooks Izipay |
| Secundaria | `supabase-secondary/` | Academia de cada instalación: cursos, versiones, matrículas, quizzes, entregas, sesiones, certificados, órdenes de compra |

El contrato de acciones del gateway está en `src/lib/contrato-secundaria.ts` (`ACCIONES_GATEWAY_SECUNDARIA`). El cliente Vue está en `src/api/services/secundaria-gateway.service.ts` (cache SWR ~45 s fresco / 5 min stale, por instalación).

### Edge Functions (proyecto principal)

| Función | Uso |
|---------|-----|
| `secondary-gateway` | Única puerta a la secundaria. Valida JWT, sincroniza acceso, ejecuta RPCs |
| `media-presign` | URLs firmadas S3 para portadas y materiales |
| `izipay-lyra-proxy` | `formToken` para checkout embebido (`VITE_PAGO_MODO=dankira`) |
| `izipay-session` | Token/Generate legado (`VITE_PAGO_MODO=sdk`) |
| `izipay-webhook` | Confirmación asíncrona de pagos |

Secretos de Edge **nunca** llevan prefijo `VITE_*`. La `service_role` no entra al navegador.

## Portales

| Ruta | Portal | Quién |
|------|--------|--------|
| `/` `/planes` `/cursos/:id` | Público | Landing, planes, ficha de curso, verificar certificado |
| `/tukuy-academy` | Estudiante | Catálogo, reproductor, certificados, carrito |
| `/docente` | Docente | Constructor, alumnos, calificaciones, sesiones, firma |
| `/organizacion` | Entidad | Organigrama, catálogo, licencias, aprobación comercial |
| `/admin` | Plataforma | Tenants, planes, accesos, auditoría |
| `/bolsa-tukuy` `/comunidad` `/perfil-profesional` | Ecosistema | Transversal; no exige contexto de portal |

Tras login, si hay varias membresías se abre `/seleccionar-contexto`. El router (`src/router/index.ts`) exige `requiresAuth`, portal coincidente y `requiredPermission` cuando la ruta lo declara.

`/app` redirige a `/tukuy-academy`.

## Origen de datos

Los servicios ramifican según flags. Con auth Supabase **no** se inyectan demos CIP/Andina (`apiConfig.sinDatosDemo`).

| Condición | Origen | Qué cubre |
|-----------|--------|-----------|
| `VITE_AUTH_PROVIDER=supabase` | Supabase Auth + RPCs principal | Login, contextos, organigrama, perfiles, planes |
| `VITE_SECUNDARIA_CURSOS=true` | `secondary-gateway` | Cursos, matrícula, progreso, quizzes, firmas, sesiones, checkout |
| `VITE_USE_MOCK=true` y auth `api` | `*.mock.ts` + localStorage | Demo local completa |
| Auth supabase + mock | Listas vacías en módulos sin BD | Bolsa, comunidad, CV |
| `VITE_USE_MOCK=false` sin secundaria | axios → `VITE_API_URL` | Contrato REST legado (`src/api/endpoints.ts`); no es la fuente de verdad actual |

`VITE_USE_MOCK=true` y `VITE_SECUNDARIA_CURSOS=true` pueden convivir: academia real, bolsa/comunidad aún locales.

### Madurez

| Módulo | Estado |
|--------|--------|
| Auth y contextos | Real (Supabase Auth) |
| Academia LMS | Real vía gateway (activar `VITE_SECUNDARIA_CURSOS`) |
| Organización (organigrama, perfiles, sedes) | Real vía RPCs principal; fallback a localStorage si la RPC no está desplegada |
| Pagos Izipay | Real o simulación según `VITE_PAGO_MODO` |
| Certificados / firmas / PDF | Real vía gateway + índice público en principal |
| Sesiones + Google Meet | Real si hay secretos Calendar; si no, Meet simulado |
| Admin SaaS (planes, orgs) | Parcial; provisionar un tenant nuevo de punta a punta no cierra |
| Bolsa laboral | Mock / vacío con auth real |
| Comunidad | Mock / vacío con auth real |
| CV inteligente | UI lista; persistencia local, sin backend |

## Requisitos

- Node.js `^22.18.0` o `>=24.12.0`
- [Bun](https://bun.sh) 1.3 (recomendado; `packageManager` del repo)
- Cuenta(s) Supabase: proyecto **principal** obligatorio; **secundario** si vas a usar academia real
- CLI Supabase (devDependency `supabase`) para migraciones y deploy de functions

## Desarrollo local

```sh
bun install
cp .env.example .env
# Completa VITE_SUPABASE_PRIMARY_URL y VITE_SUPABASE_PRIMARY_ANON_KEY
bun dev
```

El servidor Vite escucha en **http://localhost:5178**.

En consola (solo DEV) verás:

```
[Tukuy Academy] API: … · mock: … · sinDemo: … · secundaria: …
```

### Perfil recomendado (auth real + academia)

```env
VITE_AUTH_PROVIDER=supabase
VITE_USE_MOCK=true
VITE_SECUNDARIA_CURSOS=true
VITE_PAGO_MODO=simulacion
```

Así login y LMS usan BD; bolsa/comunidad no rompen (listas vacías). Pon `VITE_USE_MOCK=false` solo cuando **todos** los módulos tengan backend: hoy rompe bolsa, comunidad y CV.

## Variables de entorno

Plantilla: `.env.example`. Nunca commitees `.env`. Nunca pongas `SERVICE_ROLE` ni passwords Izipay/AWS en una variable `VITE_*`.

### Frontend (`VITE_*`)

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `VITE_API_URL` | URL del API HTTP legado (el build de prod la exige) | URL absoluta HTTPS **obligatoria** |
| `VITE_APP_URL` | `http://localhost:5178` | URL pública del SPA |
| `VITE_AUTH_PROVIDER` | `supabase` (recomendado) o `api` | `supabase` |
| `VITE_SUPABASE_PRIMARY_URL` | URL del proyecto principal | misma |
| `VITE_SUPABASE_PRIMARY_ANON_KEY` | anon key (pública, con RLS) | misma |
| `VITE_USE_MOCK` | `true` | **`false` obligatorio** (el script `build-only` lo fuerza) |
| `VITE_SECUNDARIA_CURSOS` | `true` para LMS real | `true` |
| `VITE_PAGO_MODO` | `simulacion` \| `dankira` \| `sdk` | `dankira` (recomendado) o `sdk` |
| `VITE_IZIPAY_*` | Solo modo `dankira`: merchant, public key, SHA256, endpoint | mismas (públicas) |
| `VITE_MEDIA_PUBLIC_BASE_URL` | Opcional; default `tukuy-academy-media` | URL del bucket de lectura |

### Secretos Edge (proyecto principal, `supabase secrets set`)

**Secundaria / gateway**

- `SECONDARY_TUKUY_URL` + `SECONDARY_TUKUY_SERVICE_ROLE_KEY` — instalación Tukuy por defecto
- `{REF}_URL` + `{REF}_SERVICE_ROLE_KEY` — otras orgs (`conexion_organizacion.secreto_ref`)
- `SUPABASE_SERVICE_ROLE_KEY` — para resolver conexiones dinámicas y escribir en principal (índice de certificados, catálogo)
- `APP_ALLOWED_ORIGINS` — orígenes CORS extra (coma-separados). Localhost 5173/5178 ya van incluidos

**Izipay (dankira)**

- `IZIPAY_LYRA_MERCHANT_CODE`
- `IZIPAY_LYRA_PASSWORD` — **nunca** `VITE_*`
- `IZIPAY_LYRA_ENV` (`sandbox` / producción)
- `IZIPAY_LYRA_ENDPOINT`

**Izipay (sdk legado)**

- `PAYMENT_MODE`, `IZIPAY_ENV`, `IZIPAY_MERCHANT_CODE`, `IZIPAY_PUBLIC_KEY`, `IZIPAY_RSA_PUBLIC_KEY`, `IZIPAY_WEBHOOK_SECRET`

**S3**

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_BASE_URL`

**Google Calendar / Meet** (opcional)

- `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`
- Opcional: `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_TIMEZONE` (default `America/Lima`)

Sin estos secretos, las sesiones en vivo crean Meet simulado. Tras cambiarlos: redeploy de `secondary-gateway`.

## Pagos (Izipay)

Tres modos (`VITE_PAGO_MODO`):

| Modo | Qué hace | Cuándo |
|------|----------|--------|
| `simulacion` | Confirma desde el browser (código 00). No cobra | Default local |
| `dankira` | Formulario embebido `@dankira/izipay` + `izipay-lyra-proxy` | Recomendado |
| `sdk` | Pop-up Token/Generate vía `izipay-session` | Legado |

Flujo dankira: crear orden (`crear-orden-compra` en secundaria) → `setup()` → `formToken` (proxy) → `#izipay-form` → confirmar → webhook `izipay-webhook` → `confirmar-pago-orden`.

La orden y el acceso al curso viven en secundaria (idempotencia en migración `20260811161000`). Redeploy: `izipay-lyra-proxy`, `izipay-webhook`, `secondary-gateway`.

## Ecosistema (bolsa y comunidad)

Rutas `/bolsa-tukuy` y `/comunidad` son transversales: cualquier usuario autenticado entra sin contexto de portal. Permisos extra (`vacantes.gestionar`, `comunidad.moderar`) sí exigen contexto.

Hoy **no hay tablas ni RPCs** de bolsa/comunidad. Con `VITE_AUTH_PROVIDER=supabase` las pantallas arrancan vacías. Los endpoints en `src/api/endpoints.ts` (`/bolsa/*`, `/comunidad/*`) son el contrato REST previsto, no un backend desplegado.

## Migraciones y functions

SQL de este repo se aplica en el **SQL Editor** o con CLI contra el proyecto remoto correspondiente. Hay dos árboles:

```
supabase/migrations/              → proyecto PRINCIPAL
supabase/functions/               → Edge Functions del PRINCIPAL
supabase-secondary/migrations/    → proyecto SECUNDARIO
```

Academia real (`VITE_SECUNDARIA_CURSOS=true`) espera, como mínimo:

- Principal: hasta `20260811171000` (categorías de cursos, organigrama, perfiles, presencia, sedes, asignaciones, revocar índice, facturación/licencia)
- Secundaria: hasta `20260812190000` (checkout, firma, asistencia, PDF, progreso, quizzes, soft-delete, gating de recursos)

Tras SQL nuevo: redeploy de `secondary-gateway` (y de `media-presign` / Izipay si toca esos flujos).

```sh
# Ejemplo: functions del principal (ajusta el project-ref)
supabase functions deploy secondary-gateway --project-ref <PRINCIPAL_REF>
```

## Estructura

```
src/
├── api/                    # axios, endpoints REST, servicios, gateway
├── composables/            # auth, contexto, carrito, cursos, tema
├── components/             # UI compartida + shadcn
├── router/                 # Vue Router + guards
├── types/                  # dominio + DTOs
├── views/                  # auth, estudiante, pagos
├── portal-publico/         # landing, planes, ficha, verificar certificado
├── portal-docente/         # portal instructor
├── portal-organizacion/    # portal entidad
├── administracion-tukuy/   # portal superadmin
├── modulos/
│   ├── bolsa-tukuy/
│   ├── comunidad/
│   ├── ecosistema/         # layout transversal
│   └── perfil-laboral/
└── lib/                    # env, supabase, contrato secundaria, PDF, flags
supabase/                   # principal: migraciones + Edge Functions
supabase-secondary/         # secundaria: solo migraciones SQL
tests/                      # bun test (acceso, precio, presentación de curso)
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `bun dev` | Vite en `:5178` |
| `bun run build` | `vue-tsc` + build de producción (`VITE_USE_MOCK=false`) |
| `bun run build-only` | Solo Vite; fuerza mock off |
| `bun run preview` | Sirve `dist/` |
| `bun run type-check` | TypeScript |
| `bun test` | Tests unitarios (Bun) |

CI (`.github/workflows/ci.yml`): install frozen, type-check, test y build en `main` / `master` / `edu` y PRs.

## Despliegue

SPA: el host debe reescribir todas las rutas a `index.html`.

- **Vercel** → `vercel.json`
- **Netlify** → `netlify.toml` + `public/_redirects`
- **Nginx** → ejemplo abajo

### Variables en la plataforma de deploy

```
VITE_API_URL=https://api.tudominio.com
VITE_APP_URL=https://tudominio.com
VITE_AUTH_PROVIDER=supabase
VITE_SUPABASE_PRIMARY_URL=https://xxxx.supabase.co
VITE_SUPABASE_PRIMARY_ANON_KEY=eyJ...
VITE_USE_MOCK=false
VITE_SECUNDARIA_CURSOS=true
VITE_PAGO_MODO=dankira
```

El plugin `vite-plugin-validate-env.ts` **falla el build** si en producción `VITE_USE_MOCK !== false` o falta `VITE_API_URL`.

### Nginx

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

## Seguridad

No subir a git: `.env`, `.env.local`, `*.pem` / `*.key`, `.vercel/`, `.netlify/`. El `.gitignore` ya los cubre.

Validaciones en build de producción:

1. `VITE_USE_MOCK=false`
2. `VITE_API_URL` definido

El access token se copia a `localStorage` (`auth_token`) para axios. Un XSS puede robar la sesión. Objetivo de producción: cookies `httpOnly` + `Secure` + `SameSite` (aún no implementado).

RLS y policies deben cubrir **todas** las tablas expuestas con la anon key. El gateway usa `service_role` solo en Deno, después de validar el JWT del usuario.

## Checklist antes de producción

- [ ] `VITE_USE_MOCK=false` y `VITE_SECUNDARIA_CURSOS=true` en el deploy
- [ ] `VITE_AUTH_PROVIDER=supabase` con URL + anon key del principal
- [ ] `VITE_API_URL` absoluto HTTPS (exigido por el build; puede apuntar a un stub si ya no hay API HTTP)
- [ ] Migraciones principal y secundaria aplicadas; functions redeployed
- [ ] Secretos Edge: secundaria, Izipay, S3; Calendar si hay Meet real
- [ ] CORS: `APP_ALLOWED_ORIGINS` incluye el dominio del SPA
- [ ] Recarga de `/login`, `/tukuy-academy`, `/docente` no da 404
- [ ] `.env` y service_role fuera del repo
- [ ] CI verde (`bun run build` con variables de prod)
- [ ] Imágenes en `public/img/` desplegadas
- [ ] Bolsa / comunidad / CV: o backend real, o aceptación de pantallas vacías

## Referencias rápidas en código

| Tema | Dónde |
|------|--------|
| Flags y validación env | `src/lib/env.ts`, `src/api/config.ts` |
| Cliente principal | `src/lib/supabase.ts` |
| Contrato gateway | `src/lib/contrato-secundaria.ts` |
| Permisos / plantillas | `src/lib/control-acceso.ts` |
| Checkout dankira | `src/lib/checkout-dankira.ts` |
| Guards de ruta | `src/router/index.ts` |
| Gateway Deno | `supabase/functions/secondary-gateway/index.ts` |
