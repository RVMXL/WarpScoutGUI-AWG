#!/usr/bin/env bash
# WARPScoutGUI — корневая обёртка над каноническим sync-demo (v2.6.2, аудит INFRA-L:
# раньше здесь жил второй РАСХОДЯЩИЙСЯ копипаст — правка одного не попадала в другой.
# Источник теперь один: desktop-app/tools/sync-demo.sh).
# Использование: bash scripts/sync-demo.sh [cache-buster]
set -euo pipefail
exec bash "$(cd "$(dirname "$0")/.." && pwd)/desktop-app/tools/sync-demo.sh" "$@"
