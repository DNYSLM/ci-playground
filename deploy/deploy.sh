#!/usr/bin/env bash
# Deploys this checkout as one environment on the VPS. Runs on the
# self-hosted runner as the `devplay` user. No root, no Docker.
#
# Usage: deploy/deploy.sh staging|production|pr-<n>
# Needs env: GIT_SHA, SEED_PASSWORD (from a CI secret). Optional: APP_VERSION.
#
# Layout under ~/apps/<name>/:
#   releases/<time>-<sha>/   one folder per deploy (last 3 kept, for rollback)
#   current -> releases/...  what the service runs
#   env                      port and secrets, mode 600, never in a release
set -euo pipefail

name="${1:?Usage: deploy.sh staging|production|pr-<n>}"
case "$name" in
  staging) port=4001 app_env=staging test_api=0 ;;
  production) port=4002 app_env=production test_api=0 ;;
  pr-*)
    n="${name#pr-}"
    [[ "$n" =~ ^[0-9]{1,3}$ ]] || { echo "PR number must be 1 to 3 digits: $n" >&2; exit 2; }
    port=$((5000 + 10#$n)) app_env=preview test_api=1
    ;;
  *) echo "Unknown environment: $name" >&2; exit 2 ;;
esac
: "${GIT_SHA:?GIT_SHA is not set}"
: "${SEED_PASSWORD:?SEED_PASSWORD is not set. Add the secret in GitHub settings.}"

apps="${PLAYGROUND_APPS:-$HOME/apps}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
short_sha="${GIT_SHA:0:7}"
env_dir="$apps/$name"
release="$env_dir/releases/$(date -u +%Y%m%dT%H%M%SZ)-$short_sha"

echo "Deploying $short_sha as $name on port $port"
mkdir -p "$release"
cp -R server.js package.json src public "$release/"

# What this release is. Lives in the release, so a rollback reports honestly.
printf 'GIT_SHA=%s\nAPP_VERSION=%s\n' "$GIT_SHA" "${APP_VERSION:-dev}" > "$release/release.env"

# Port and secrets. Rewritten on every deploy, readable by devplay only.
(
  umask 077
  printf 'PORT=%s\nHOST=127.0.0.1\nAPP_ENV=%s\nENABLE_TEST_API=%s\nSEED_USERS=%s\nSEED_PASSWORD=%s\n' \
    "$port" "$app_env" "$test_api" "${SEED_USERS:-tester1,tester2}" "$SEED_PASSWORD" > "$env_dir/env"
)

ln -sfn "$release" "$env_dir/current"

# Keep the router in step with the repo.
if ! cmp -s deploy/router.mjs "$apps/router/router.mjs"; then
  mkdir -p "$apps/router"
  cp deploy/router.mjs "$apps/router/router.mjs"
  systemctl --user restart todo-router.service
  echo "Router updated"
fi

systemctl --user enable "todo@$name.service" >/dev/null
systemctl --user restart "todo@$name.service"

for _ in $(seq 1 20); do
  if served="$(curl --silent --fail "http://127.0.0.1:$port/api/version")"; then
    echo "Live: $served"
    if [[ "$served" != *"\"commit\":\"$short_sha\""* ]]; then
      echo "::error::$name answered, but not with commit $short_sha" >&2
      exit 1
    fi
    # Keep the newest 3 releases.
    ls -1dt "$env_dir"/releases/* | tail -n +4 | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done

echo "::error::$name did not answer on port $port" >&2
journalctl --user -u "todo@$name.service" -n 30 --no-pager >&2 || true
exit 1
