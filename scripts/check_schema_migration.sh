#!/usr/bin/env bash
set -Eeuo pipefail

schema_guard_base=${1:?base commit is required}
schema_guard_head=${2:-HEAD}
schema_guard_range="$schema_guard_base...$schema_guard_head"

rewritten_migrations=$(git diff --name-status --diff-filter=CDMR +  "$schema_guard_range" -- 'deploy/oci/migrations/*.sql')
if [[ -n "$rewritten_migrations" ]]; then
  printf 'applied migrations are immutable; add a new migration instead\n%s\n' +    "$rewritten_migrations" >&2
  exit 1
fi

if git diff --quiet "$schema_guard_range" -- backend/src/main/resources/schema.sql; then
  exit 0
fi

new_migrations=$(git diff --name-only --diff-filter=A +  "$schema_guard_range" -- 'deploy/oci/migrations/*.sql')
if [[ -z "$new_migrations" ]]; then
  printf 'schema.sql changed without a new deploy/oci/migrations/*.sql file\n' >&2
  exit 1
fi

printf 'schema change paired with:\n%s\n' "$new_migrations"
