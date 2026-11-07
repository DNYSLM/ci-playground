#!/usr/bin/env bash
# Exercise 2. Compares what main and the latest tag point at with what
# staging and production are actually serving.
# Usage: BASE_DOMAIN=ci.example.com scripts/whats-live.sh
set -euo pipefail
: "${BASE_DOMAIN:?Set BASE_DOMAIN first, for example: BASE_DOMAIN=ci.example.com}"

git fetch --quiet --tags origin main
main_sha="$(git rev-parse --short=7 origin/main)"
latest_tag="$(git describe --tags --abbrev=0 origin/main 2>/dev/null || echo none)"
tag_sha="$( [ "$latest_tag" = none ] && echo none || git rev-parse --short=7 "$latest_tag^{commit}")"

served() {
  curl --fail --silent --max-time 10 "https://$1.$BASE_DOMAIN/api/version" |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s);console.log(v.commit+" "+v.version)})' ||
    echo "unreachable -"
}

read -r staging_sha staging_ver <<<"$(served staging)"
read -r prod_sha prod_ver <<<"$(served prod)"

verdict() { [ "$1" = "$2" ] && echo "MATCH" || echo "DIFFERENT"; }

printf '%-12s %-9s %s\n' "main" "$main_sha" ""
printf '%-12s %-9s %s\n' "staging" "$staging_sha" "$(verdict "$staging_sha" "$main_sha") vs main"
printf '%-12s %-9s %s\n' "latest tag" "$tag_sha" "$latest_tag"
printf '%-12s %-9s %s\n' "production" "$prod_sha" "$(verdict "$prod_sha" "$tag_sha") vs $latest_tag (serving $prod_ver)"
