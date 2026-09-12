export interface ToolEditor {
  readonly add: (tool: unknown) => void
}

export interface BeforeExecuteEvent {
  readonly tool: string
  readonly input?: unknown
}

export interface ToolHooks {
  readonly transform: (callback: (editor: ToolEditor) => Promise<void> | void) => Promise<void>
  readonly hook: (
    name: "execute.before",
    callback: (event: BeforeExecuteEvent) => Promise<void> | void,
  ) => Promise<void>
}
