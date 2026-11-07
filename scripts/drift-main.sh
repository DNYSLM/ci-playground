#!/usr/bin/env bash
# Exercise 5. Moves main far ahead of the stack: N empty commits plus one real
# change to stack/notes.md that will conflict with stack-a.
# Usage: scripts/drift-main.sh [commits]   (default 200)
# Run it before branch protection is on (exercise 9), as it pushes to main.
set -euo pipefail
count="${1:-200}"

git switch main
git pull --ff-only

for i in $(seq 1 "$count"); do
  git commit --quiet --allow-empty -m "Drift commit $i of $count"
done

mkdir -p stack
echo "Changed on main while the stack waited." > stack/notes.md
git add stack/notes.md
git commit --quiet -m "Change stack notes on main (will conflict)"

git push origin main
echo "main is now $((count + 1)) commits ahead of where the stack started."
