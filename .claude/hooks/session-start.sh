#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# Installs what tests and linters need so a fresh session can run them.
# Idempotent and non-interactive. Runs only in remote (cloud) sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Web app and daily job share one root package.json (npm workspaces later).
if [ -f package.json ]; then
  # npm install (not ci) so the cached container keeps node_modules warm.
  npm install --no-audit --no-fund
else
  echo "session-start: no package.json yet, nothing to install"
fi

# Playwright is pre-installed in cloud sessions; stop npm from re-downloading it.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1' >> "$CLAUDE_ENV_FILE"
fi
