# 0001: Remove TUI

Status: accepted

## Context

Two terminal UIs (`packages/tui/` full TUI ~27k LoC + `src/cli/cmd/run/` mini UI ~18k LoC) cost more maintenance than their use justifies. Headless `opencode run` plus the API server cover the workflows we keep.

## Decision

- Delete `packages/tui/`, the `run/` mini UI (keep headless `run.ts` + `run/tool.ts` + `run/types.ts`), `cli/cmd/tui.ts`, `cli/cmd/attach.ts`, `cli/tui/`, `config/tui*.ts`, `plugin/tui/`, server `/tui` routes + `tui-control` + `tui-event`, `schema/tui-event`, `plugin/tui` API, TUI docs/specs/tests/fixtures.
- Vendor the 5 shared non-UI utils (`util/error`, `util/record`, `util/locale`, `cli/logo`, `cli/cmd/prompt-display`) into `opencode`.
- Bare `opencode` / `lildax` with no command print help and exit non-zero. `opencode run` stays headless-only (`--mini`, `--interactive`, `--replay*`, `--demo` removed).

## Consequences

- No terminal UI ships. `attach` (TUI-over-server) is gone; `run --attach` (headless remote) stays.
- External plugins lose the `TuiPlugin` API and `/tui` HTTP routes. Revisit if a headless plugin UI is ever needed.
