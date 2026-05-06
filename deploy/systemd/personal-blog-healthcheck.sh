#!/bin/bash
set -euo pipefail

port="${1:-__APP_PORT__}"
service_name="${2:-__SERVICE_NAME__}"
health_url="http://127.0.0.1:${port}/api/v1/health"

if curl --fail --silent --show-error --max-time 5 "$health_url" >/dev/null; then
  exit 0
fi

echo "[watchdog] health check failed for ${health_url}, restarting ${service_name}" >&2
systemctl restart "${service_name}"
