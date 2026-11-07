#!/usr/bin/env bash
# Exercise 8. Prints a fake playground key that the secrets scan will catch.
# It is not a real credential for anything.
set -euo pipefail
printf 'pgk_%s\n' "$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)"
