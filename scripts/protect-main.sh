#!/usr/bin/env bash
# Exercise 9. Turns on branch protection for main:
#   - changes go through a pull request
#   - unit, e2e-summary and secrets-scan must pass
#   - the branch must be up to date with main before merging
#   - admins (you) get no bypass
# Undo: scripts/protect-main.sh off
set -euo pipefail
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

if [ "${1:-on}" = "off" ]; then
  gh api -X DELETE "repos/$repo/branches/main/protection"
  echo "Branch protection removed from main on $repo."
  exit 0
fi

gh api -X PUT "repos/$repo/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["unit", "e2e-summary", "secrets-scan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
echo "main on $repo is protected. Undo with: scripts/protect-main.sh off"
