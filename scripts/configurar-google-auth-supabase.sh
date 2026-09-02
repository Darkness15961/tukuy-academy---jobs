#!/usr/bin/env bash
# Configura Google Auth (login) en Supabase vía Management API.
#
# 1) Añade en scripts/google-org.secrets.local:
#      GOOGLE_AUTH_CLIENT_ID=....apps.googleusercontent.com
#      GOOGLE_AUTH_CLIENT_SECRET=GOCSPX-...
#
# 2) Token de acceso Supabase (Dashboard → Account → Access Tokens):
#      export SUPABASE_ACCESS_TOKEN="sbp_..."
#
# 3) Ejecuta:
#      bash scripts/configurar-google-auth-supabase.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/scripts/google-org.secrets.local}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-nidkyztqapeqdplzvnkc}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Falta SUPABASE_ACCESS_TOKEN (Personal Access Token de supabase.com/dashboard/account/tokens)"
  exit 1
fi

load_env_file() {
  local file="$1"
  while IFS= read -r raw || [[ -n "$raw" ]]; do
    local line="${raw#"${raw%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" != *=* ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    if [[ "$val" == \"*\" && "$val" == *\" ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    printf -v "$key" '%s' "$val"
    export "$key"
  done < "$file"
}

load_env_file "$ENV_FILE"

if [[ -z "${GOOGLE_AUTH_CLIENT_ID:-}" || -z "${GOOGLE_AUTH_CLIENT_SECRET:-}" ]]; then
  echo "Faltan GOOGLE_AUTH_CLIENT_ID y GOOGLE_AUTH_CLIENT_SECRET en $ENV_FILE"
  echo ""
  echo "En Google Cloud (cliente «Cliente web tukuy academy 1») la redirect debe ser:"
  echo "  https://${PROJECT_REF}.supabase.co/auth/v1/callback"
  exit 1
fi

payload=$(cat <<EOF
{
  "external_google_enabled": true,
  "external_google_client_id": "$GOOGLE_AUTH_CLIENT_ID",
  "external_google_secret": "$GOOGLE_AUTH_CLIENT_SECRET"
}
EOF
)

echo "→ PATCH auth config (Google) project-ref=$PROJECT_REF"
http_code=$(curl -sS -o /tmp/supabase-auth-patch.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" != "200" ]]; then
  echo "Error HTTP $http_code"
  cat /tmp/supabase-auth-patch.json
  echo ""
  echo "Si es 403: usa un token de cuenta Admin/Owner en Supabase."
  echo "Alternativa manual: Dashboard → Authentication → Providers → Google"
  exit 1
fi

echo "Google Auth configurado en Supabase."
echo "Prueba «Entrar con Google» en la app."
echo "Redirect en Google Cloud:"
echo "  https://${PROJECT_REF}.supabase.co/auth/v1/callback"
