#!/usr/bin/env bash
# Trigger a manual Cloudflare branch deploy (or destroy) via GitHub Actions.
#
# Usage:
#   pnpm deploy:branch
#   pnpm deploy:branch -- cursor/my-feature-53d7
#   pnpm deploy:branch -- my-feature --slug my-feature
#   pnpm deploy:branch -- my-feature --destroy
set -euo pipefail

REF=""
SLUG=""
ACTION="deploy"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --destroy)
      ACTION="destroy"
      shift
      ;;
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --help|-h)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    --)
      shift
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      exit 2
      ;;
    *)
      if [ -z "${REF}" ]; then
        REF="$1"
      elif [ -z "${SLUG}" ]; then
        SLUG="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 2
      fi
      shift
      ;;
  esac
done

if [ -z "${REF}" ]; then
  REF="$(git rev-parse --abbrev-ref HEAD)"
fi

if [ -z "${SLUG}" ]; then
  SLUG="$(echo "${REF}" | tr '[:upper:]' '[:lower:]' | sed -E 's#^.*/##; s/[^a-z0-9-]+/-/g; s/^-+//; s/-+$//; s/-53d7$//' | cut -c1-40)"
fi

if [ -z "${SLUG}" ]; then
  echo "Could not derive a slug from ref '${REF}'. Pass --slug." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

echo "Dispatching Manual branch deploy"
echo "  ref:    ${REF}"
echo "  slug:   ${SLUG}"
echo "  action: ${ACTION}"

gh workflow run "Manual branch deploy" \
  --ref "$(git rev-parse --abbrev-ref HEAD)" \
  -f ref="${REF}" \
  -f slug="${SLUG}" \
  -f action="${ACTION}"

echo
echo "Queued. Watch runs with:"
echo "  gh run list --workflow \"Manual branch deploy\" --limit 5"
echo "  gh run watch"
