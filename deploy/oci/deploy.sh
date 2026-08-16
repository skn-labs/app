#!/usr/bin/env bash
set -Eeuo pipefail

release_sha=${1:-}
archive_file=${2:-}

if [[ ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'invalid release SHA\n' >&2
  exit 64
fi

if [[ ! -f "$archive_file" ]]; then
  printf 'release archive not found\n' >&2
  exit 66
fi

service_dir="$HOME/services/skn-api"
release_dir="$service_dir/releases/$release_sha"
data_dir="$service_dir/data"
backup_dir="$service_dir/backups"
env_file="$service_dir/.env"
compose_file="$release_dir/compose.yml"
lock_file="$service_dir/deploy.lock"

umask 077
mkdir -p "$service_dir/releases" "$data_dir" "$backup_dir"
exec 9>"$lock_file"
flock -n 9 || {
  printf 'another deployment is already running\n' >&2
  exit 75
}

[[ -f "$env_file" ]] || {
  printf 'server runtime environment is not configured\n' >&2
  exit 78
}

docker network inspect edge > /dev/null

rm -rf "$release_dir"
mkdir -p "$release_dir"
tar -xzf "$archive_file" -C "$release_dir"

for required_file in skn-api.jar schema.sql Dockerfile compose.yml backup_sqlite.py import_subagent_catalog.py catalog/products.jsonl; do
  [[ -f "$release_dir/$required_file" ]] || {
    printf 'release is missing %s\n' "$required_file" >&2
    exit 65
  }
done

[[ -d "$release_dir/migrations" ]] || {
  printf 'release is missing migrations directory\n' >&2
  exit 65
}

catalog_shard_count=$(find "$release_dir/catalog" -maxdepth 1 -type f -name 'catalog-*.jsonl' | wc -l)
if [[ "$catalog_shard_count" -ne 3 ]]; then
  printf 'release must contain exactly three catalog guide shards\n' >&2
  exit 65
fi

new_database=false
if [[ ! -s "$data_dir/skn.db" ]]; then
  python3 - "$data_dir/skn.db" "$release_dir/schema.sql" <<'PY'
import sqlite3
import sys
from pathlib import Path

database, schema = sys.argv[1:]
connection = sqlite3.connect(database)
try:
    connection.executescript(Path(schema).read_text(encoding="utf-8"))
finally:
    connection.close()
PY
  new_database=true
fi

if [[ -s "$data_dir/skn.db" ]]; then
  backup_stamp=$(date -u +%Y%m%dT%H%M%SZ)
  python3 "$release_dir/backup_sqlite.py" \
    "$data_dir/skn.db" "$backup_dir/skn-$backup_stamp.db"
fi

new_schema_hash=$(sha256sum "$release_dir/schema.sql" | awk '{print $1}')

# 새 DB에서는 어워드 migration이 전체 카탈로그를 참조할 수 있도록 제품을 먼저 넣는다.
# 기존 DB는 과거와 동일하게 schema migration을 먼저 적용해 importer 호환성을 보장한다.
if [[ "$new_database" == true ]]; then
  python3 "$release_dir/import_subagent_catalog.py" \
    --db "$data_dir/skn.db" \
    --input-dir "$release_dir/catalog" \
    --skip-backup
fi

applied_migration_count=$(python3 - "$data_dir/skn.db" "$release_dir/migrations" "$new_schema_hash" <<'PY'
import sqlite3
import sys
from pathlib import Path

database, migration_dir, target_hash = sys.argv[1:]
connection = sqlite3.connect(database)
connection.execute("PRAGMA foreign_keys = ON")
connection.execute("""
    CREATE TABLE IF NOT EXISTS schema_migration (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
""")
connection.execute("""
    CREATE TABLE IF NOT EXISTS schema_release (
        schema_hash TEXT PRIMARY KEY,
        prepared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
""")
applied = 0
try:
    for path in sorted(Path(migration_dir).glob("*.sql")):
        exists = connection.execute(
            "SELECT 1 FROM schema_migration WHERE name = ?", (path.name,)
        ).fetchone()
        if exists:
            continue
        escaped_name = path.name.replace("'", "''")
        script = "BEGIN IMMEDIATE;\n" + path.read_text(encoding="utf-8")
        script += f"\nINSERT INTO schema_migration(name) VALUES ('{escaped_name}');\nCOMMIT;"
        connection.executescript(script)
        applied += 1
    if applied > 0:
        connection.execute(
            "INSERT OR IGNORE INTO schema_release(schema_hash) VALUES (?)", (target_hash,)
        )
        connection.commit()
finally:
    connection.close()
print(applied)
PY
)

schema_hash_file="$service_dir/schema.sha256"
if [[ -s "$data_dir/skn.db" && -f "$schema_hash_file" ]]; then
  previous_schema_hash=$(<"$schema_hash_file")
  if [[ "$new_schema_hash" != "$previous_schema_hash" && "$applied_migration_count" -eq 0 ]]; then
    prepared_schema=$(python3 - "$data_dir/skn.db" "$new_schema_hash" <<'PY'
import sqlite3
import sys

database, target_hash = sys.argv[1:]
connection = sqlite3.connect(database)
try:
    found = connection.execute(
        "SELECT 1 FROM schema_release WHERE schema_hash = ?", (target_hash,)
    ).fetchone()
    print(1 if found else 0)
finally:
    connection.close()
PY
)
    if [[ "$prepared_schema" -ne 1 ]]; then
      printf 'schema.sql changed; add and verify an operational migration before deployment\n' >&2
      exit 78
    fi
  fi
fi

if [[ "$new_database" != true ]]; then
  python3 "$release_dir/import_subagent_catalog.py" \
    --db "$data_dir/skn.db" \
    --input-dir "$release_dir/catalog" \
    --skip-backup
fi

image_name="skn-api:$release_sha"
previous_image=$(docker inspect --format '{{.Config.Image}}' skn-api 2>/dev/null || true)

docker build --file "$release_dir/Dockerfile" --tag "$image_name" "$release_dir"

export SKN_IMAGE="$image_name"
export SKN_ENV_FILE="$env_file"
export SKN_DATA_DIR="$data_dir"
export SKN_RUNTIME_UID
export SKN_RUNTIME_GID
SKN_RUNTIME_UID=$(id -u)
SKN_RUNTIME_GID=$(id -g)

rollback() {
  printf 'deployment health check failed; rolling back\n' >&2
  if [[ -n "$previous_image" ]]; then
    SKN_IMAGE="$previous_image" docker compose \
      --project-name skn-api --file "$compose_file" \
      up --detach --force-recreate --no-deps skn-api
  else
    docker compose --project-name skn-api --file "$compose_file" down
  fi
}

docker compose --project-name skn-api --file "$compose_file" \
  up --detach --force-recreate --no-deps skn-api

healthy=false
for _ in $(seq 1 24); do
  health_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' skn-api 2>/dev/null || true)
  if [[ "$health_status" == healthy ]]; then
    healthy=true
    break
  fi
  if [[ "$health_status" == unhealthy ]]; then
    break
  fi
  sleep 5
done

if [[ "$healthy" != true ]]; then
  docker logs --tail 120 skn-api >&2 || true
  rollback
  exit 1
fi

printf '%s\n' "$new_schema_hash" > "$schema_hash_file"
ln -sfn "$release_dir" "$service_dir/current"
rm -f "$archive_file"
printf 'deployment healthy: %s\n' "$release_sha"
