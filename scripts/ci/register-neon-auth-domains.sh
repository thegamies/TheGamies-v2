#!/usr/bin/env bash
# Register preview/deploy origins on a Neon Auth branch so sign-in redirects work.
# Usage: register-neon-auth-domains.sh <branch_id> <origin> [<origin>...]
set -euo pipefail

BRANCH_ID="${1:-}"
shift || true

if [ -z "${BRANCH_ID}" ] || [ "$#" -lt 1 ]; then
  echo "usage: register-neon-auth-domains.sh <branch_id> <origin> [<origin>...]" >&2
  exit 2
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ]; then
  echo "NEON_API_KEY and NEON_PROJECT_ID are required." >&2
  exit 1
fi

API_HOST="${NEON_API_HOST:-https://console.neon.tech/api/v2}"

for raw in "$@"; do
  origin="${raw%%/}"
  if [ -z "${origin}" ] || [[ "${origin}" != http* ]]; then
    echo "skip invalid origin: ${raw}"
    continue
  fi

  echo "Registering Neon Auth trusted domain: ${origin}"
  code=$(curl -sS -o /tmp/neon-auth-domain.json -w "%{http_code}" \
    -X POST "${API_HOST}/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}/auth/domains" \
    -H "Authorization: Bearer ${NEON_API_KEY}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{\"domain\":\"${origin}\",\"auth_provider\":\"better_auth\"}" || true)

  if [ "${code}" = "201" ] || [ "${code}" = "200" ]; then
    echo "  ok (${code})"
  elif [ "${code}" = "409" ]; then
    echo "  already present (409)"
  else
    echo "  warning: HTTP ${code} — $(tr '\n' ' ' </tmp/neon-auth-domain.json)"
  fi
done
