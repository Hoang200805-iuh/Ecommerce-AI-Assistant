#!/usr/bin/env bash
set -e

hostport="$1"
shift || true

if [ -z "$hostport" ]; then
  echo "Usage: $0 host:port [-- command args]"
  exit 1
fi

host=${hostport%%:*}
port=${hostport##*:}

echo "Waiting for Postgres at $host:$port..."
while ! (</dev/tcp/$host/$port) >/dev/null 2>&1; do
  sleep 1
done

echo "Postgres is available"

if [ "${1:-}" = "--" ]; then
  shift
  exec "$@"
fi
