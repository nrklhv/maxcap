#!/usr/bin/env bash
# Flujo COMPLETO de /cl/cmf/debt en una sola sesión: POST inicial + POST de continue (2FA)
# minimizando el tiempo entre que llega el código al correo y se envía a Floid.
#
# Uso:
#   ./scripts/test-floid-cmf-debt-full.sh <RUT> <webhook_url>
#
# Ejemplo:
#   ./scripts/test-floid-cmf-debt-full.sh 15782800-2 https://webhook.site/abc-123
#
# Tras el POST inicial, queda esperando el código 2FA en stdin. Apenas lo pegues + Enter,
# manda el segundo POST. Después hace poll del webhook hasta 5 min para mostrar el reporte.

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

[[ -n "${FLOID_API_KEY:-}" ]] || { echo "Falta FLOID_API_KEY" >&2; exit 1; }
[[ $# -eq 2 ]] || { echo "Uso: $0 <RUT> <webhook_url>" >&2; exit 2; }

RUT_RAW="$1"
WEBHOOK="$2"
RUT="$(echo -n "$RUT_RAW" | tr -d '. ' | tr '[:lower:]' '[:upper:]')"

HOST="${FLOID_API_URL:-https://api.floid.app}"
HOST="${HOST%/}"
URL="${HOST}/cl/cmf/debt"

if command -v uuidgen >/dev/null 2>&1; then
  CASEID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
else
  CASEID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
fi

# Extrae token del webhook URL para poll posterior
WEBHOOK_TOKEN="$(echo "$WEBHOOK" | sed -E 's|.*/([0-9a-f-]+)/?$|\1|')"

cat <<EOF
─────────────────────────────────────────────
POST     ${URL}
RUT      ${RUT}
caseid   ${CASEID}
callback ${WEBHOOK}
─────────────────────────────────────────────

Antes de seguir, ten LISTO en otra ventana:
  - Tu correo (con auto-refresh) para captar el código rápido
  - Esta terminal en primer plano para pegar el código apenas llegue

EOF

# === Password ===
read -r -s -p "Clave Única (no se mostrará): " CU_PASS
echo
[[ -n "$CU_PASS" ]] || { echo "Password vacío, aborto." >&2; exit 3; }

read -r -p "Confirmas iniciar el flujo? [y/N]: " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  unset CU_PASS
  echo "Abortado."
  exit 0
fi

# === POST 1: arranque ===
BODY1="$(
  RUT_N="$RUT" CU_N="$CU_PASS" CASEID_N="$CASEID" CB_N="$WEBHOOK" \
  python3 - <<'PY'
import json, os
print(json.dumps({
    "id": os.environ["RUT_N"],
    "password": os.environ["CU_N"],
    "caseid": os.environ["CASEID_N"],
    "callbackUrl": os.environ["CB_N"],
}))
PY
)"
unset CU_PASS

OUT1=$(mktemp)
trap 'rm -f "$OUT1" "${OUT2:-}" 2>/dev/null' EXIT

echo
echo "→ Enviando POST inicial..."
START_TS=$(date +%s)
HTTP1=$(printf '%s' "$BODY1" | curl -sS -4 \
  -o "$OUT1" -w "%{http_code}" \
  --connect-timeout 20 -m 60 \
  -X POST "$URL" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @-) || { echo "curl POST 1 falló" >&2; exit 4; }
BODY1="(scrubbed)"
ELAPSED1=$(( $(date +%s) - START_TS ))

echo "← HTTP ${HTTP1} en ${ELAPSED1}s"
if command -v jq >/dev/null 2>&1; then jq . < "$OUT1" 2>/dev/null || cat "$OUT1"; else cat "$OUT1"; fi
echo

if [[ "$HTTP1" != "200" ]]; then
  echo "POST inicial no devolvió 200. Aborto antes de pedir 2FA."
  exit 5
fi

# === Poll del webhook hasta detectar el ack 2fa_required ===
echo "→ Esperando que Floid POSTee al webhook el ack 2fa_required..."
TFA_DETECTED=""
for i in $(seq 1 30); do  # hasta 60s
  RESP=$(curl -sS "https://webhook.site/token/${WEBHOOK_TOKEN}/requests?sorting=newest&per_page=5" 2>/dev/null || echo '{}')
  if echo "$RESP" | grep -q "$CASEID" && echo "$RESP" | grep -qi '2fa_required'; then
    TFA_DETECTED="yes"
    echo "  ✓ ack 2fa_required recibido en webhook"
    break
  fi
  sleep 2
done
[[ -z "$TFA_DETECTED" ]] && echo "  (no detecté 2fa_required en 60s — puede que el reporte ya haya llegado sin 2FA, revisa abajo)"

# === Prompt del código 2FA — sin timeout, depende de qué tan rápido lo pegues ===
echo
echo "──────────────────────────────────────────"
echo "📬 Pega el código 2FA del correo y Enter:"
echo "   (Floid suele dar ~120s tras el ack)"
echo "──────────────────────────────────────────"
TFA_START=$(date +%s)
read -r TFA_TOKEN
TFA_ELAPSED=$(( $(date +%s) - TFA_START ))
echo "(tardaste ${TFA_ELAPSED}s en pegar)"
[[ -n "$TFA_TOKEN" ]] || { echo "Token vacío, aborto." >&2; exit 6; }

# === POST 2: continue ===
BODY2="$(
  CASEID_N="$CASEID" TFA_N="$TFA_TOKEN" python3 - <<'PY'
import json, os
print(json.dumps({
    "caseid": os.environ["CASEID_N"],
    "continue": True,
    "2fa_token": os.environ["TFA_N"],
}))
PY
)"

OUT2=$(mktemp)
echo "→ Enviando POST de continue..."
SEND2_TS=$(date +%s)
HTTP2=$(printf '%s' "$BODY2" | curl -sS -4 \
  -o "$OUT2" -w "%{http_code}" \
  --connect-timeout 20 -m 60 \
  -X POST "$URL" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @-) || { echo "curl POST 2 falló" >&2; exit 7; }
SEND2_ELAPSED=$(( $(date +%s) - SEND2_TS ))

echo "← HTTP ${HTTP2} en ${SEND2_ELAPSED}s"
if command -v jq >/dev/null 2>&1; then jq . < "$OUT2" 2>/dev/null || cat "$OUT2"; else cat "$OUT2"; fi
echo

case "$HTTP2" in
  200) echo "✅ Token 2FA aceptado. Esperando reporte real en webhook..." ;;
  400) echo "⚠️  400 — token incorrecto o expirado. Revisa el body."; exit 0 ;;
  *) echo "⚠️  HTTP ${HTTP2}"; exit 0 ;;
esac

# === Poll del webhook por el reporte final ===
echo
echo "→ Polleando webhook por el reporte final (hasta 5 min)..."
FOUND_REPORT=""
LAST_COUNT=$(curl -sS "https://webhook.site/token/${WEBHOOK_TOKEN}/requests?per_page=1" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)

for i in $(seq 1 100); do  # hasta 5 min
  CURRENT=$(curl -sS "https://webhook.site/token/${WEBHOOK_TOKEN}/requests?per_page=1" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)
  if [[ "$CURRENT" -gt "$LAST_COUNT" ]]; then
    echo
    echo "📨 Nuevo POST detectado en webhook:"
    curl -sS "https://webhook.site/token/${WEBHOOK_TOKEN}/requests?sorting=newest&per_page=3" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d.get('data', [])[:3]:
    if r.get('method') == 'POST':
        body = r.get('content','')
        try:
            parsed = json.loads(body)
            if '$CASEID' in body:
                print(f\"[{r.get('created_at')}]\")
                print(json.dumps(parsed, indent=2, ensure_ascii=False))
                print('---')
                break
        except: pass
"
    FOUND_REPORT="yes"
    break
  fi
  sleep 3
done
[[ -z "$FOUND_REPORT" ]] && echo "  (no llegó nuevo POST en 5 min — revisa webhook.site manualmente)"

echo
echo "📌 caseid de esta sesión: ${CASEID}"
