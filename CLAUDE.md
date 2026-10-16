# CLAUDE.md

Read `AGENTS.md` first. It holds the working rules for this repository: what
the product is, the stack, the commands, the folder layout, the model layer,
the caching rules and what never to do. Every AI coding tool that works here
(Claude Code, Codex, Cursor, Copilot) reads the same file, so keep the rules
there and keep this file short.

Claude Code specifics:

- The design lives in `docs/design.md`. When a change departs from it, update
  the design in the same pull request.
- Prefer small pull requests, one build step each (the order is in
  `docs/design.md`, "Build order").
- A cloud session installs dependencies through `.claude/hooks/session-start.sh`
  once a `package.json` exists. Until then there is nothing to install.
