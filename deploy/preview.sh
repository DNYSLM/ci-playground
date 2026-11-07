#!/usr/bin/env bash
# Exercise 7. Starts or removes the preview environment for one pull request.
# Runs on the self-hosted runner as `devplay`.
#   deploy/preview.sh up <pr-number>     needs env GIT_SHA and SEED_PASSWORD
#   deploy/preview.sh down <pr-number>
# The preview is served at https://preview.<BASE_DOMAIN>/pr-<n>/
set -euo pipefail

action="${1:?Usage: preview.sh up|down <pr-number>}"
pr="${2:?Usage: preview.sh up|down <pr-number>}"
[[ "$pr" =~ ^[0-9]{1,3}$ ]] || { echo "PR number must be 1 to 3 digits: $pr" >&2; exit 2; }

apps="${PLAYGROUND_APPS:-$HOME/apps}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
name="pr-$pr"

case "$action" in
  up)
    APP_VERSION="$name" "$(dirname "$0")/deploy.sh" "$name"
    ;;
  down)
    systemctl --user disable --now "todo@$name.service" >/dev/null 2>&1 || true
    rm -rf "${apps:?}/$name"
    echo "Preview for PR $pr is gone."
    ;;
  *)
    echo "Unknown action: $action" >&2
    exit 2
    ;;
esac
