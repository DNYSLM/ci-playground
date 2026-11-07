#!/usr/bin/env bash
# Exercise 8. Fails if any .env file (other than .env.example) is tracked by git.
set -euo pipefail

tracked="$(git ls-files | grep -E '(^|/)\.env(\..+)?$' | grep -vE '\.env\.example$' || true)"
if [ -n "$tracked" ]; then
  echo "::error::These .env files are tracked by git. Remove them and rotate what was in them:"
  echo "$tracked"
  exit 1
fi
echo "No .env files tracked."
