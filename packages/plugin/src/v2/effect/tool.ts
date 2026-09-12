import type { Effect, Scope } from "effect"

export interface ToolEditor {
  readonly add: (tool: unknown) => void
}

export interface BeforeExecuteEvent {
  readonly tool: string
  readonly input?: unknown
}

export interface ToolHooks {
  readonly transform: (
    callback: (editor: ToolEditor) => Effect.Effect<void> | void,
  ) => Effect.Effect<void, never, Scope.Scope>
  readonly hook: (
    name: "execute.before",
    callback: (event: BeforeExecuteEvent) => Effect.Effect<void> | void,
  ) => Effect.Effect<void, never, Scope.Scope>
}
