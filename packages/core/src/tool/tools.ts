export * as Tools from "./tools"

import { Context, Effect, Scope } from "effect"
import { Tool } from "./tool"

export interface BeforeExecuteEvent {
  readonly tool: string
  readonly input?: unknown
}

export interface Interface {
  readonly register: (
    tools: Readonly<Record<string, Tool.AnyTool>>,
  ) => Effect.Effect<void, Tool.RegistrationError, Scope.Scope>
  readonly hook: (
    name: "execute.before",
    callback: (event: BeforeExecuteEvent) => Effect.Effect<void> | void,
  ) => Effect.Effect<void, never, Scope.Scope>
}

/** Narrow registration-only Location capability. */
export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Tools") {}
