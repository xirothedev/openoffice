export * as PluginInvoke from "./invoke"

import type { Registration } from "@opencode-ai/plugin/v2/effect"
import { Data, Effect, Scope } from "effect"

export type Handler = (input: unknown) => Effect.Effect<unknown>

export class UnknownPluginError extends Data.TaggedError("PluginInvokeUnknownPlugin")<{
  readonly pluginID: string
}> {}

export class UnknownInvokeError extends Data.TaggedError("PluginInvokeUnknownInvoke")<{
  readonly pluginID: string
  readonly name: string
}> {}

export interface Entry {
  readonly id: string
  readonly invokes: ReadonlyArray<string>
}

export interface Store {
  readonly register: (
    pluginID: string,
    name: string,
    handle: Handler,
  ) => Effect.Effect<Registration, never, Scope.Scope>
  readonly list: () => Effect.Effect<ReadonlyArray<Entry>>
  readonly call: (
    pluginID: string,
    name: string,
    input: unknown,
  ) => Effect.Effect<unknown, UnknownPluginError | UnknownInvokeError>
}

// ponytail: keyed by string, not branded IDs — the HTTP boundary only ever carries strings.
export function makeStore(): Store {
  const invokes = new Map<string, Map<string, Handler>>()

  const remove = (pluginID: string, name: string, handle: Handler) => {
    const existing = invokes.get(pluginID)
    if (!existing || existing.get(name) !== handle) return
    existing.delete(name)
    if (existing.size === 0) invokes.delete(pluginID)
  }

  return {
    register: (pluginID, name, handle) =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.sync(() => remove(pluginID, name, handle)))
        yield* Effect.sync(() => {
          const existing = invokes.get(pluginID) ?? new Map<string, Handler>()
          existing.set(name, handle)
          invokes.set(pluginID, existing)
        })
        return { dispose: Effect.sync(() => remove(pluginID, name, handle)) }
      }),
    list: () => Effect.sync(() => [...invokes].map(([id, handlers]) => ({ id, invokes: [...handlers.keys()] }))),
    call: (pluginID, name, input) =>
      Effect.gen(function* () {
        const existing = invokes.get(pluginID)
        if (!existing) return yield* new UnknownPluginError({ pluginID })
        const handle = existing.get(name)
        if (!handle) return yield* new UnknownInvokeError({ pluginID, name })
        return yield* handle(input)
      }),
  }
}
