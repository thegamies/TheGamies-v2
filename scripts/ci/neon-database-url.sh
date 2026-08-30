#!/usr/bin/env bash
# Resolve a Neon branch DATABASE_URL via the management API.
# Job outputs cannot carry create-branch-action's db_url (GitHub strips
# secret-bearing outputs across jobs). Downstream jobs call this with branch_id.
#
# Usage: neon-database-url.sh <branch_id>
# Env: NEON_API_KEY, NEON_PROJECT_ID
# Optional: NEON_DATABASE (default neondb), NEON_ROLE (default neondb_owner),
#           NEON_POOLED=true|false (default true), NEON_API_HOST
set -euo pipefail

BRANCH_ID="${1:-}"
if [ -z "${BRANCH_ID}" ]; then
  echo "usage: neon-database-url.sh <branch_id>" >&2
  exit 2
fi

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ]; then
  echo "NEON_API_KEY and NEON_PROJECT_ID are required." >&2
  exit 1
fi

API_HOST="${NEON_API_HOST:-https://console.neon.tech/api/v2}"
DATABASE_NAME="${NEON_DATABASE:-neondb}"
ROLE_NAME="${NEON_ROLE:-neondb_owner}"
POOLED="${NEON_POOLED:-true}"

QUERY="branch_id=${BRANCH_ID}&database_name=${DATABASE_NAME}&role_name=${ROLE_NAME}&pooled=${POOLED}"
RESP=$(curl -sS -f \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Accept: application/json" \
  "${API_HOST}/projects/${NEON_PROJECT_ID}/connection_uri?${QUERY}")

URI=$(node -e 'const j=JSON.parse(process.argv[1]); if(!j.uri) process.exit(2); process.stdout.write(j.uri)' "$RESP")
if [ -z "$URI" ]; then
  echo "Neon connection_uri response missing uri." >&2
  exit 1
fi

echo "$URI"
