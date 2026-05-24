#!/usr/bin/env bash
# Draft a PR body for the current branch based on the diff vs origin/main.
#
# Writes to PR_BODY.md in the repo root (gitignored — see end of script).
# Pre-fills the structure required by .github/pull_request_template.md
# and flags whether screenshots are required based on touched paths.
#
# Usage:
#   ./scripts/pr-evidence.sh                    # writes ./PR_BODY.md
#   ./scripts/pr-evidence.sh > /tmp/body.md     # write to stdout

set -euo pipefail

OUTPUT="${1:-PR_BODY.md}"

# Find the base branch (default origin/main) the current branch diverged from.
BASE_REF="${BASE_REF:-origin/main}"
git fetch origin main --quiet 2>/dev/null || true

MERGE_BASE=$(git merge-base HEAD "$BASE_REF" 2>/dev/null || echo "$BASE_REF")
CHANGED=$(git diff --name-only "$MERGE_BASE"...HEAD)
ADDED=$(git diff --name-status --diff-filter=A "$MERGE_BASE"...HEAD | awk '{print $2}')
MODIFIED=$(git diff --name-status --diff-filter=M "$MERGE_BASE"...HEAD | awk '{print $2}')
DELETED=$(git diff --name-status --diff-filter=D "$MERGE_BASE"...HEAD | awk '{print $2}')

# Heuristic: any touched path under packages/web/src/{components,routes} or
# packages/desktop counts as a UI change and requires screenshots.
UI_CHANGED=0
if echo "$CHANGED" | grep -qE '^(packages/web/src/(components|routes)|packages/desktop)/'; then
  UI_CHANGED=1
fi

# Commits since base — useful for the "What" section.
COMMITS=$(git log --pretty=format:'- %s' "$MERGE_BASE"..HEAD)

# Tests touched?
TESTS_TOUCHED=$(echo "$CHANGED" | grep -E '(\.test\.|/test/|/e2e/)' || true)

BRANCH=$(git rev-parse --abbrev-ref HEAD)

draft() {
  cat <<EOF
<!--
Auto-drafted by scripts/pr-evidence.sh from the diff vs ${BASE_REF}.
Fill in the prose sections; the file lists and checklist are pre-populated.
-->

## Why

<!-- The problem this solves, in 1–3 sentences. What pain or gap does this close? -->

## What

$(if [ -n "$COMMITS" ]; then printf 'Commits on this branch:\n%s\n' "$COMMITS"; else echo '<!-- describe the change -->'; fi)

$(if [ -n "$ADDED" ]; then printf '\n**Added:**\n'; printf '%s\n' "$ADDED" | sed 's/^/- /'; fi)
$(if [ -n "$MODIFIED" ]; then printf '\n**Modified:**\n'; printf '%s\n' "$MODIFIED" | sed 's/^/- /'; fi)
$(if [ -n "$DELETED" ]; then printf '\n**Deleted:**\n'; printf '%s\n' "$DELETED" | sed 's/^/- /'; fi)

## Screenshots

EOF

  if [ $UI_CHANGED -eq 1 ]; then
    cat <<EOF
**Required** — this PR touches packages/web/src/{components,routes} or packages/desktop.
Commit screenshots under \`docs/screenshots/<feature-slug>/\` and reference here:

\`\`\`markdown
![Description](https://raw.githubusercontent.com/BenSheridanEdwards/openconcho/${BRANCH}/docs/screenshots/<feature-slug>/01-<state>.png)
\`\`\`

See \`.claude/rules/workflows.md\` → "Open a PR" for capture + commit guidance.

EOF
  else
    cat <<EOF
<!-- No packages/web/src/{components,routes} or packages/desktop paths touched —
     screenshots not strictly required. Delete this section if truly docs-only. -->

EOF
  fi

  cat <<EOF
## QA checklist

- [ ] \`pnpm typecheck\` clean locally
- [ ] \`pnpm lint\` clean locally
- [ ] \`pnpm test\` green locally
$(if [ -n "$TESTS_TOUCHED" ]; then echo '- [x] Tests touched on this branch:'; printf '%s\n' "$TESTS_TOUCHED" | sed 's/^/      - /'; else echo '- [ ] Tests added for new behaviour (or note why none are needed)'; fi)
- [ ] Manual verification: <!-- which Honcho instance, which workspace/peer, what you clicked, what you saw -->
$(if echo "$CHANGED" | grep -qE '^packages/desktop/'; then echo '- [ ] \`pnpm --filter @openconcho/desktop cargo-check\` passes'; fi)
- [x] Worked in a git worktree (current branch: \`${BRANCH}\`)

## Out-of-scope

<!-- What was intentionally left out and why. -->

## Notes

<!-- Caveats, follow-ups, anything reviewers should know. -->
EOF
}

if [ "$OUTPUT" = "-" ] || [ -t 1 ]; then
  # When piped or first arg is "-", write to stdout.
  if [ "${1:-}" = "-" ]; then
    draft
    exit 0
  fi
fi

draft > "$OUTPUT"

echo "✓ Drafted PR body → ${OUTPUT}"
echo "  Open it, fill in Why / Manual verification / Out-of-scope / Notes, then use as the PR body."
