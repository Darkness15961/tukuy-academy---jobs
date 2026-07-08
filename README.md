# Tukuy Academy & Jobs

Plataforma Vue 3 + Vite para capacitación, CV inteligente y bolsa laboral.

## Requisitos

- Node.js `^22.18.0` o `>=24.12.0`
- [Bun](https://bun.sh) (recomendado)

## Desarrollo local

```sh
bun install
cp .env.example .env
bun dev
```

Variables en `.env` (ver `.env.example`):

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `VITE_API_URL` | `/api` o URL del backend | URL absoluta del API **obligatoria** |
| `VITE_USE_MOCK` | `true` | **`false` obligatorio** |

## Build

```sh
bun run build
```

El script de build fuerza `VITE_USE_MOCK=false` para evitar datos mock en producción. Para desarrollo local, `bun dev` sigue usando el valor de `.env`.

```sh
bun run preview   # sirve dist/ localmente
```

## Despliegue

El proyecto es una SPA. El servidor debe redirigir todas las rutas a `index.html`.

Configuración incluida para:

- **Vercel** → `vercel.json`
- **Netlify** → `netlify.toml` + `public/_redirects`
- **Nginx** → ejemplo abajo

### Variables en la plataforma de deploy

Configura en Vercel / Netlify / CI (nunca en el repositorio):

```
VITE_API_URL=https://api.tudominio.com
VITE_USE_MOCK=false
```

### Nginx (ejemplo)

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

### Archivos que NO deben subirse a git

- `.env`, `.env.local` (secretos y URLs reales)
- Certificados `*.pem`, `*.key`
- Carpetas `.vercel/`, `.netlify/` (pueden contener IDs de proyecto)

El `.gitignore` ya cubre estos casos. Usa `.env.example` como plantilla.

### Validaciones en producción

Al compilar/ejecutar en modo producción, la app valida:

1. `VITE_USE_MOCK=false` — evita datos falsos en prod
2. `VITE_API_URL` definido — evita builds sin backend

### Token de autenticación

El token se guarda en `localStorage`. Para máxima seguridad en producción, el backend debería usar cookies `httpOnly` + `Secure` + `SameSite` (requiere cambios en API y cliente).

## Checklist antes de producción

- [ ] `VITE_USE_MOCK=false` en el entorno de deploy
- [ ] `VITE_API_URL` apunta al API real con HTTPS
- [ ] Backend con CORS configurado para tu dominio frontend
- [ ] Rutas SPA (`/login`, `/app`) funcionan al recargar la página
- [ ] `.env` y secretos fuera del repositorio
- [ ] CI pasa (`bun run build` con variables de prod)
- [ ] Imágenes en `public/img/` desplegadas
- [ ] Backend de autenticación real conectado (no mock)

## Estructura del proyecto

```
src/
├── api/           # axios, endpoints, servicios
├── composables/   # lógica reutilizable
├── components/    # UI shadcn + shared
├── router/        # rutas Vue Router
├── types/         # tipos dominio + DTOs API
└── views/         # páginas
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `bun dev` | Servidor de desarrollo |
| `bun run build` | Type-check + build producción |
| `bun run build-only` | Solo build Vite |
| `bun run preview` | Preview del build |
| `bun run type-check` | Verificación TypeScript |
