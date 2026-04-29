#!/usr/bin/env bash
# Continúa una sesión 2fa_required de /cl/cmf/debt enviando el token recibido por correo.
# Uso:
#   ./scripts/test-floid-cmf-debt-2fa.sh <caseid> <2fa_token>
# Ejemplo:
#   ./scripts/test-floid-cmf-debt-2fa.sh fe0a3992-dbf5-44e0-8227-ad0e82bf1061 M4UOBD
#
# El reporte real va a llegar al callbackUrl que mandaste en la primera request
# (no se vuelve a configurar acá — Floid lo recuerda por caseid).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

if [[ -z "${FLOID_API_KEY:-}" && -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    case "$line" in
      FLOID_API_KEY=*|FLOID_API_URL=*)
        key="${line%%=*}"; val="${line#*=}"
        val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
        export "$key=$val"
        ;;
    esac
  done < "$ENV_FILE"
fi

[[ -n "${FLOID_API_KEY:-}" ]] || { echo "❌ Falta FLOID_API_KEY" >&2; exit 1; }
[[ $# -eq 2 ]] || { echo "Uso: $0 <caseid> <2fa_token>" >&2; exit 2; }

CASEID="$1"
TFA_TOKEN="$2"

HOST="${FLOID_API_URL:-https://api.floid.app}"
HOST="${HOST%/}"
URL="${HOST}/cl/cmf/debt"

# JSON con escape seguro (el token suele ser alfanumérico, pero por las dudas)
BODY="$(
  CASEID_N="$CASEID" TFA_N="$TFA_TOKEN" python3 - <<'PY'
import json, os
print(json.dumps({
    "caseid": os.environ["CASEID_N"],
    "continue": True,
    "2fa_token": os.environ["TFA_N"],
}))
PY
)"

echo "→ POST  ${URL}"
echo "→ body  ${BODY}"
echo

HTTP_OUT=$(mktemp)
trap 'rm -f "$HTTP_OUT"' EXIT

HTTP_CODE=$(printf '%s' "$BODY" | curl -sS -4 \
  -o "$HTTP_OUT" \
  -w "%{http_code}" \
  --connect-timeout 20 \
  -m 60 \
  -X POST "$URL" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @-) || { echo "❌ curl falló (exit $?)" >&2; exit 4; }

echo "← HTTP ${HTTP_CODE}"
echo "← body:"
if command -v jq >/dev/null 2>&1; then
  jq . < "$HTTP_OUT" 2>/dev/null || cat "$HTTP_OUT"
else
  cat "$HTTP_OUT"
fi
echo

case "$HTTP_CODE" in
  200) echo "✅ Token aceptado. El reporte real llega al callbackUrl original. Revisalo en webhook.site." ;;
  400) echo "⚠️  400 — token incorrecto/expirado o caseid inválido." ;;
  401|403) echo "⚠️  Auth — revisá API key." ;;
  *) echo "⚠️  HTTP ${HTTP_CODE}" ;;
esac
