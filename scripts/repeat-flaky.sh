#!/usr/bin/env bash
# Exercise 3. Starts the app, runs the rename spec N times in one Cypress run,
# and stops the app again. Reads SEED_PASSWORD from .env.
# Usage: scripts/repeat-flaky.sh [times]   (default 20)
set -euo pipefail
times="${1:-20}"
spec="${SPEC:-cypress/flaky/rename.cy.js}"

npm start >/tmp/ci-playground-server.log 2>&1 &
server_pid=$!
trap 'kill $server_pid 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl --silent --fail http://localhost:3000/api/version >/dev/null && break
  sleep 0.5
done

REPEAT="$times" npx cypress run \
  --spec "$spec" \
  --config "specPattern=$spec" \
  --reporter dot
