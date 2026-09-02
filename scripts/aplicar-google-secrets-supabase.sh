#!/usr/bin/env bash
# Aplica secretos de Google (org) en Supabase principal.
# Uso: copia scripts/google-org.secrets.example → google-org.secrets.local (gitignored),
#      rellena valores, luego: bash scripts/aplicar-google-secrets-supabase.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/scripts/google-org.secrets.local}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-nidkyztqapeqdplzvnkc}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No existe $ENV_FILE"
  echo "Copia scripts/google-org.secrets.example y rellena los valores."
  exit 1
fi

load_env_file() {
  local file="$1"
  while IFS= read -r raw || [[ -n "$raw" ]]; do
    local line="${raw#"${raw%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" != *=* ]]; then
      continue
    fi
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

missing=()
for var in YOUTUBE_API_KEY GOOGLE_CALENDAR_CLIENT_ID GOOGLE_CALENDAR_CLIENT_SECRET GOOGLE_CALENDAR_REFRESH_TOKEN; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done

if ((${#missing[@]})); then
  echo "Faltan variables en $ENV_FILE: ${missing[*]}"
  echo ""
  echo "Abre el archivo y pega cada clave DESPUÉS del =, por ejemplo:"
  echo '  YOUTUBE_API_KEY="AIzaSy..."'
  echo '  GOOGLE_CALENDAR_REFRESH_TOKEN="1//0g..."  ← usa comillas por el //'
  echo ""
  echo "Si pegaste en .env, copia también a scripts/google-org.secrets.local"
  exit 1
fi

ARGS=(
  "YOUTUBE_API_KEY=$YOUTUBE_API_KEY"
  "GOOGLE_CALENDAR_CLIENT_ID=$GOOGLE_CALENDAR_CLIENT_ID"
  "GOOGLE_CALENDAR_CLIENT_SECRET=$GOOGLE_CALENDAR_CLIENT_SECRET"
  "GOOGLE_CALENDAR_REFRESH_TOKEN=$GOOGLE_CALENDAR_REFRESH_TOKEN"
)

if [[ -n "${GOOGLE_CALENDAR_ID:-}" ]]; then
  ARGS+=("GOOGLE_CALENDAR_ID=$GOOGLE_CALENDAR_ID")
fi
if [[ -n "${GOOGLE_CALENDAR_TIMEZONE:-}" ]]; then
  ARGS+=("GOOGLE_CALENDAR_TIMEZONE=$GOOGLE_CALENDAR_TIMEZONE")
fi

echo "→ supabase secrets set (${#ARGS[@]} vars) project-ref=$PROJECT_REF"
bunx supabase secrets set "${ARGS[@]}" --project-ref "$PROJECT_REF"

echo "→ deploy secondary-gateway"
bunx supabase functions deploy secondary-gateway --project-ref "$PROJECT_REF"

echo ""
echo "Listo. Crea una sesión en vivo NUEVA y verifica meet.google.com"
echo "Login con Google (Supabase Auth): actualiza Client ID/Secret en Dashboard → Auth → Google"
