#!/usr/bin/env bash
# One-off VPS setup, run as `devplay` from a copy of this repo's deploy/ folder.
# Installs the user services and starts the router.
#   deploy/install-user-services.sh            install
#   deploy/install-user-services.sh uninstall  stop and remove everything it added
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
units="$HOME/.config/systemd/user"
apps="$HOME/apps"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

if [ "${1:-install}" = "uninstall" ]; then
  for dir in "$apps"/*/; do
    name="$(basename "$dir")"
    [ "$name" = router ] && continue
    systemctl --user disable --now "todo@$name.service" 2>/dev/null || true
  done
  systemctl --user disable --now todo-router.service github-runner.service 2>/dev/null || true
  rm -f "$units/todo@.service" "$units/todo-router.service" "$units/github-runner.service"
  systemctl --user daemon-reload
  echo "Services removed. App folders in $apps are left alone; delete them by hand if you want."
  exit 0
fi

mkdir -p "$units" "$apps/router"
cp "$here/systemd/todo@.service" "$here/systemd/todo-router.service" "$here/systemd/github-runner.service" "$units/"
cp "$here/router.mjs" "$apps/router/router.mjs"
systemctl --user daemon-reload
systemctl --user enable --now todo-router.service

sleep 1
curl --silent --show-error -H 'Host: staging.example' http://127.0.0.1:4000/ || true
echo
echo "Router is up. Expect 'Nothing is running' above until the first deploy."
