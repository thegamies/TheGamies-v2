#!/usr/bin/env bash
# Print the Neon branch id for a branch name (default: develop).
# Usage: neon-branch-id.sh [branch_name]
set -euo pipefail

NAME="${1:-develop}"

if [ -z "${NEON_API_KEY:-}" ] || [ -z "${NEON_PROJECT_ID:-}" ]; then
  echo "NEON_API_KEY and NEON_PROJECT_ID are required." >&2
  exit 1
fi

API_HOST="${NEON_API_HOST:-https://console.neon.tech/api/v2}"
curl -sS \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Accept: application/json" \
  "${API_HOST}/projects/${NEON_PROJECT_ID}/branches" \
  | node -e "
    const name = process.argv[1];
    let raw = '';
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => {
      const body = JSON.parse(raw);
      const branches = body.branches || body;
      const list = Array.isArray(branches) ? branches : [];
      const match = list.find((b) => b && b.name === name);
      if (!match || !match.id) {
        console.error('No Neon branch named ' + JSON.stringify(name));
        process.exit(1);
      }
      process.stdout.write(match.id);
    });
  " "${NAME}"
