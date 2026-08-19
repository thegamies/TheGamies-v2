#!/usr/bin/env bash
# Point this Neon Auth branch's email webhooks at a Cloudflare Worker origin.
# Usage: register-neon-auth-email-webhook.sh <branch_id> <https-origin>
set -euo pipefail

BRANCH_ID="${1:-}"
ORIGIN="${2:-}"
ORIGIN="${ORIGIN%%/}"

if [ -z "${BRANCH_ID}" ] || [ -z "${ORIGIN}" ]; then
  echo "usage: register-neon-auth-email-webhook.sh <branch_id> <https-origin>" >&2
  exit 2
fi

if [[ "${ORIGIN}" != https://* ]]; then
  echo "skip webhook: origin must be https (${ORIGIN})" >&2
  exit 0
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ]; then
  echo "NEON_API_KEY and NEON_PROJECT_ID are required." >&2
  exit 1
fi

API_HOST="${NEON_API_HOST:-https://console.neon.tech/api/v2}"
WEBHOOK_URL="${ORIGIN}/api/webhooks/neon-auth-email"

echo "Registering Neon Auth email webhook: ${WEBHOOK_URL}"
code=$(curl -sS -o /tmp/neon-auth-webhook.json -w "%{http_code}" \
  -X PUT "${API_HOST}/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}/auth/webhooks" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"enabled\":true,\"webhook_url\":\"${WEBHOOK_URL}\",\"enabled_events\":[\"send.magic_link\",\"send.otp\"],\"timeout_seconds\":10}" || true)

if [ "${code}" = "200" ] || [ "${code}" = "201" ]; then
  echo "  ok (${code})"
else
  echo "  warning: HTTP ${code} — $(tr '\n' ' ' </tmp/neon-auth-webhook.json)"
fi
