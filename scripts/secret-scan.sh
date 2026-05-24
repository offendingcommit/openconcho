#!/usr/bin/env bash
# Secret scan for staged files.
#
# Pre-commit hook calls this against staged additions. Fast (no external
# tool; just regex over the staged diff). Designed to catch the common
# accidents — API keys committed alongside code — not to replace a full
# secret-scanning service.
#
# Exits non-zero with a clear message if a likely secret is found.

set -euo pipefail

# Only scan added/modified content (the `+` lines in the staged diff).
# This avoids false positives from existing committed strings.
STAGED_DIFF=$(git diff --cached --diff-filter=ACMR --unified=0 -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' '*.toml' '*.env*' '*.sh' '*.md' 2>/dev/null || true)

if [ -z "$STAGED_DIFF" ]; then
  exit 0
fi

# Only look at added lines (starting with `+`, excluding diff headers `+++`).
ADDED=$(printf '%s\n' "$STAGED_DIFF" | grep -E '^\+[^+]' || true)

if [ -z "$ADDED" ]; then
  exit 0
fi

FOUND=0
FINDINGS=""

check_pattern() {
  local name="$1"
  local pattern="$2"
  # Use `-e` to safely pass patterns that begin with `-` (e.g. PEM headers).
  if printf '%s\n' "$ADDED" | grep -qE -e "$pattern"; then
    FOUND=1
    FINDINGS="${FINDINGS}  - ${name}\n"
  fi
}

check_pattern "AWS access key" 'AKIA[0-9A-Z]{16}'
check_pattern "AWS secret key (high-entropy)"  'aws_secret_access_key[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{40}'
check_pattern "Anthropic API key" 'sk-ant-[a-zA-Z0-9_-]{32,}'
check_pattern "OpenAI API key" 'sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}'
check_pattern "OpenAI project key (newer)" 'sk-proj-[a-zA-Z0-9_-]{40,}'
check_pattern "GitHub personal access token" 'gh[psoru]_[A-Za-z0-9_]{36,}'
check_pattern "GitHub fine-grained PAT" 'github_pat_[A-Za-z0-9_]{82,}'
check_pattern "Slack token" 'xox[abprs]-[A-Za-z0-9-]{10,}'
check_pattern "Google API key" 'AIza[0-9A-Za-z_-]{35}'
check_pattern "Stripe live key" 'sk_live_[A-Za-z0-9]{24,}'
check_pattern "Honcho-style JWT (likely)" 'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
check_pattern "RSA/EC/DSA/OpenSSH private key block" '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
check_pattern "Generic hardcoded password" '(password|passwd|pwd)[[:space:]]*[:=][[:space:]]*["'\'']\w{8,}["'\'']'

if [ $FOUND -eq 1 ]; then
  printf '\n\033[31m✗ Secret scan: potential secrets in staged changes\033[0m\n' >&2
  printf '%b' "$FINDINGS" >&2
  printf '\n' >&2
  printf 'If this is a false positive, bypass with:  \033[33mgit commit --no-verify\033[0m\n' >&2
  printf 'Otherwise: remove the secret, rotate the credential, and re-stage.\n\n' >&2
  exit 1
fi

exit 0
