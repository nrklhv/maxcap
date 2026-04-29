#!/usr/bin/env bash
# Smoke test ÚNICO contra /cl/cmf/debt (Clave Única).
# Pensado para pruebas con TU PROPIO RUT y TU PROPIA Clave Única.
# En producción esto lo manejará el widget Floid; este script no es para uso recurrente.
#
# Seguridad:
#   - Password se pide por prompt sin eco (no queda en el historial del shell)
#   - El body se envía por stdin de curl (no visible en `ps`)
#   - No se escribe el password a ningún archivo
#
# Cuidado:
#   - Floid bloquea las credenciales 24h tras 2 fallos seguidos. Este script
#     hace UNA SOLA llamada y pide confirmación antes.
#
# Uso:
#   ./scripts/test-floid-cmf-debt.sh <RUT> [callbackUrl_webhook.site]
#
# Si pasás callbackUrl, Floid responde inmediato con un ack (HTTP 200 + caseid)
# y el reporte real llega a esa URL más tarde (recomendado para testing).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

if [[ -z "${FLOID_API_KEY:-}" && -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    case "$line" in
      FLOID_API_KEY=*|FLOID_API_URL=*)
        key="${line%%=*}"
        val="${line#*=}"
        val="${val%\"}"; val="${val#\"}"
        val="${val%\'}"; val="${val#\'}"
        export "$key=$val"
        ;;
    esac
  done < "$ENV_FILE"
fi

[[ -n "${FLOID_API_KEY:-}" ]] || { echo "❌ Falta FLOID_API_KEY (en entorno o .env.local)" >&2; exit 1; }

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <RUT> [callbackUrl_webhook.site]" >&2
  exit 2
fi

RUT_RAW="$1"
RUT="$(echo -n "$RUT_RAW" | tr -d '. ' | tr '[:lower:]' '[:upper:]')"
CALLBACK="${2:-}"

HOST="${FLOID_API_URL:-https://api.floid.app}"
HOST="${HOST%/}"
URL="${HOST}/cl/cmf/debt"

if command -v uuidgen >/dev/null 2>&1; then
  CASEID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
else
  CASEID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
fi

echo "─────────────────────────────────────────────"
echo "POST     ${URL}"
echo "RUT      ${RUT}"
echo "caseid   ${CASEID}"
if [[ -n "$CALLBACK" ]]; then
  echo "callback ${CALLBACK}   (modo asíncrono)"
else
  echo "callback (vacío) — modo síncrono, puede tardar > 60s"
fi
echo "─────────────────────────────────────────────"
echo
echo "⚠️  Esta llamada usará TU Clave Única. Tras 2 fallos seguidos, Floid"
echo "   bloquea preventivamente 24h."
echo

# Password por prompt sin eco
read -r -s -p "Clave Única (no se mostrará): " CU_PASS
echo
[[ -n "$CU_PASS" ]] || { echo "❌ Password vacío, aborto." >&2; exit 3; }

read -r -p "¿Confirmás enviar 1 llamada a Floid? [y/N]: " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  unset CU_PASS
  echo "Abortado."
  exit 0
fi

# Construyo el JSON con python3 para escape seguro (passwords pueden tener "/$\)
BODY="$(
  RUT_N="$RUT" CU_PASS_N="$CU_PASS" CASEID_N="$CASEID" CALLBACK_N="$CALLBACK" \
  python3 - <<'PY'
import json, os
body = {
    "id": os.environ["RUT_N"],
    "password": os.environ["CU_PASS_N"],
    "caseid": os.environ["CASEID_N"],
}
cb = os.environ.get("CALLBACK_N", "")
if cb:
    body["callbackUrl"] = cb
print(json.dumps(body))
PY
)"
unset CU_PASS  # ya no la necesitamos en el shell

HTTP_OUT=$(mktemp)
trap 'rm -f "$HTTP_OUT"' EXIT

# Body por stdin (--data-binary @-) → no aparece en `ps`
HTTP_CODE=$(printf '%s' "$BODY" | curl -sS -4 \
  -o "$HTTP_OUT" \
  -w "%{http_code}" \
  --connect-timeout 20 \
  -m 180 \
  -X POST "$URL" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @-) || {
    echo "❌ curl falló (exit $?)." >&2
    exit 4
  }

# Limpio el body en memoria de la variable
BODY="(scrubbed)"

echo
echo "← HTTP ${HTTP_CODE}"
echo "← body:"
if command -v jq >/dev/null 2>&1; then
  jq . < "$HTTP_OUT" 2>/dev/null || cat "$HTTP_OUT"
else
  cat "$HTTP_OUT"
fi
echo

case "$HTTP_CODE" in
  200)
    if [[ -n "$CALLBACK" ]]; then
      echo "✅ Ack recibido. Si trae 'caseid' y no datos, esperá el POST de Floid en:"
      echo "   ${CALLBACK}"
    else
      echo "✅ OK — response síncrona. Revisá el body para score/datos."
    fi
    ;;
  400) echo "⚠️  400 — revisá el JSON del body (probablemente 'error_code': INVALID_CREDENTIALS o LOCKED_CREDENTIALS)." ;;
  401|403) echo "⚠️  Auth — token inválido o sin permiso para /cl/cmf/debt." ;;
  000) echo "⚠️  Sin respuesta. Mismo síntoma que fondos → escalá a Floid con el caseid." ;;
  *) echo "⚠️  HTTP ${HTTP_CODE} — ver body arriba." ;;
esac

echo
echo "📌 caseid: ${CASEID}   (guardalo por si tenés que escribirle a soporte Floid)"
