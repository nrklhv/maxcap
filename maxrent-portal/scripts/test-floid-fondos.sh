#!/usr/bin/env bash
# Smoke test contra el endpoint productivo /cl/cmf/fondos de Floid.
# No toca el portal ni la base de datos. Costo: 0.5 puntos del contrato.
#
# Uso:
#   FLOID_API_KEY=xxx ./scripts/test-floid-fondos.sh <RUT> [fecha_inicio] [fecha_fin]
# o, si la clave ya está en .env.local:
#   ./scripts/test-floid-fondos.sh <RUT>
#
# RUT          Formato 12345678-9 (con o sin puntos; se normaliza).
# fecha_inicio Opcional, YYYYMMDD. Default: hoy - 30 días.
# fecha_fin    Opcional, YYYYMMDD. Default: hoy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

# Cargar FLOID_API_KEY / FLOID_API_URL desde .env.local si no están en el entorno
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

if [[ -z "${FLOID_API_KEY:-}" ]]; then
  echo "❌ Falta FLOID_API_KEY (en el entorno o en maxrent-portal/.env.local)" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Uso: FLOID_API_KEY=xxx $0 <RUT> [fecha_inicio YYYYMMDD] [fecha_fin YYYYMMDD]" >&2
  exit 2
fi

RUT_RAW="$1"
# Normaliza igual que normalizeRutForFloid: quita puntos/espacios, mayúsculas
RUT="$(echo -n "$RUT_RAW" | tr -d '. ' | tr '[:lower:]' '[:upper:]')"

# Fechas default: últimos 30 días
if date -v -30d +%Y%m%d >/dev/null 2>&1; then
  DEFAULT_START="$(date -v -30d +%Y%m%d)"   # macOS / BSD
  DEFAULT_END="$(date +%Y%m%d)"
else
  DEFAULT_START="$(date -d '30 days ago' +%Y%m%d)"  # GNU
  DEFAULT_END="$(date +%Y%m%d)"
fi

FECHA_INICIO="${2:-$DEFAULT_START}"
FECHA_FIN="${3:-$DEFAULT_END}"

HOST="${FLOID_API_URL:-https://api.floid.app}"
HOST="${HOST%/}"
URL="${HOST}/cl/cmf/fondos"

# caseid UUIDv4 (uuidgen viene en macOS y casi todas las distros)
if command -v uuidgen >/dev/null 2>&1; then
  CASEID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
else
  CASEID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
fi

BODY=$(cat <<JSON
{
  "fecha_inicio": "${FECHA_INICIO}",
  "fecha_fin": "${FECHA_FIN}",
  "lista_runs": "${RUT}",
  "caseid": "${CASEID}"
}
JSON
)

echo "→ POST  ${URL}"
echo "→ caseid ${CASEID}"
echo "→ body  ${BODY}"
echo

# -4 fuerza IPv4 (el setup doc menciona problemas IPv6).
# --connect-timeout 20: corta si no se pudo establecer TCP en 20s.
# -m 90: corta total a 90s (los productos CMF a veces tardan).
# -w escribe HTTP code y tiempo al final.
HTTP_OUT=$(mktemp)
HTTP_CODE=$(curl -sS -4 \
  -o "$HTTP_OUT" \
  -w "%{http_code}" \
  --connect-timeout 20 \
  -m 90 \
  -X POST "$URL" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary "$BODY") || {
    echo "❌ curl falló (exit $?). Probá -v en el script para ver fase, o revisá red/firewall." >&2
    rm -f "$HTTP_OUT"
    exit 3
  }

echo "← HTTP ${HTTP_CODE}"
echo "← body:"
if command -v jq >/dev/null 2>&1; then
  jq . < "$HTTP_OUT" 2>/dev/null || cat "$HTTP_OUT"
else
  cat "$HTTP_OUT"
fi
echo

rm -f "$HTTP_OUT"

case "$HTTP_CODE" in
  200) echo "✅ OK — token válido y endpoint contratado." ;;
  401|403) echo "⚠️  Auth: token inválido o sin permiso para /cl/cmf/fondos." ;;
  400) echo "⚠️  Body rechazado — revisá formato de fechas o lista_runs." ;;
  000) echo "⚠️  Sin respuesta (timeout/red). Probá '-v' adentro del curl." ;;
  *) echo "⚠️  HTTP ${HTTP_CODE} — ver body arriba." ;;
esac
