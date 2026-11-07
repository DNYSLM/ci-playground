#!/usr/bin/env bash
# Exercise 5. Builds a stack of three pull requests:
#   main <- stack-a <- stack-b <- stack-c
# Needs: the GitHub CLI (gh), logged in, and a clean working tree on main.
set -euo pipefail

git switch main
git pull --ff-only

base=main
for part in a b c; do
  branch="stack-$part"
  git switch -c "$branch" "$base"
  mkdir -p stack
  echo "Stack part $part: $(date -u +%FT%TZ)" >> stack/notes.md
  git add stack/notes.md
  git commit -m "Stack part $part"
  git push -u origin "$branch"
  gh pr create --base "$base" --head "$branch" \
    --title "Stack part $part" \
    --body "Part $part of the exercise 5 stack. Based on \`$base\`."
  base="$branch"
done

git switch main
echo "Done. Three stacked PRs are open. Next: scripts/drift-main.sh"
