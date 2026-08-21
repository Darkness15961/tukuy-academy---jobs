#!/usr/bin/env bash
# Regenera src/types/database.types.ts desde el proyecto Supabase principal.
# Requiere: sesión CLI (`supabase login`) y VITE_SUPABASE_PRIMARY_URL en .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Falta .env (copia .env.example y completa VITE_SUPABASE_PRIMARY_URL)." >&2
  exit 1
fi

REF="$(grep -E '^VITE_SUPABASE_PRIMARY_URL=' .env | head -1 | sed -E 's|.*=https?://([^.]+)\.supabase\.co.*|\1|')"
if [[ -z "$REF" || "$REF" == *"TU_PROJECT"* ]]; then
  echo "No pude leer el project-ref desde VITE_SUPABASE_PRIMARY_URL." >&2
  exit 1
fi

OUT="src/types/database.types.ts"
mkdir -p src/types

echo "Generando tipos desde project-id=$REF …"
./node_modules/.bin/supabase gen types typescript \
  --project-id "$REF" \
  --schema public \
  > "$OUT"

echo "Listo: $OUT ($(wc -l < "$OUT") líneas)"
