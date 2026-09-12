import { describe, expect } from "bun:test"
import { Effect, Exit } from "effect"
import { PluginV2 } from "@opencode-ai/core/plugin"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

describe("PluginV2 invoke", () => {
  it.effect("registers, lists, and calls invoke handlers", () =>
    Effect.gen(function* () {
      const plugins = yield* PluginV2.Service
      const id = PluginV2.ID.make("invoke-test")
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.invoke.register("echo", (input) => Effect.succeed({ input }))
        }),
      )
      expect(yield* plugins.invoke.list()).toEqual([{ id: "invoke-test", invokes: ["echo"] }])
      expect(yield* plugins.invoke.call("invoke-test", "echo", { a: 1 })).toEqual({ input: { a: 1 } })
      yield* plugins.remove(id)
    }),
  )

  it.effect("fails unknown plugin and invoke names with tagged errors", () =>
    Effect.gen(function* () {
      const plugins = yield* PluginV2.Service
      const id = PluginV2.ID.make("invoke-missing")
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.invoke.register("echo", (input) => Effect.succeed(input))
        }),
      )
      const pluginExit = yield* plugins.invoke.call("nope", "echo", {}).pipe(Effect.exit)
      expect(Exit.isFailure(pluginExit)).toBe(true)
      const invokeExit = yield* plugins.invoke.call("invoke-missing", "nope", {}).pipe(Effect.exit)
      expect(Exit.isFailure(invokeExit)).toBe(true)
      yield* plugins.remove(id)
    }),
  )

  it.effect("disposes registrations when the plugin is removed", () =>
    Effect.gen(function* () {
      const plugins = yield* PluginV2.Service
      const id = PluginV2.ID.make("invoke-dispose")
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.invoke.register("echo", (input) => Effect.succeed(input))
        }),
      )
      expect(yield* plugins.invoke.list()).toEqual([{ id: "invoke-dispose", invokes: ["echo"] }])
      yield* plugins.remove(id)
      expect(yield* plugins.invoke.list()).toEqual([])
    }),
  )

  it.effect("replaces registrations when the plugin reloads", () =>
    Effect.gen(function* () {
      const plugins = yield* PluginV2.Service
      const id = PluginV2.ID.make("invoke-reload")
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.invoke.register("echo", () => Effect.succeed("one"))
        }),
      )
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.invoke.register("echo", () => Effect.succeed("two"))
        }),
      )
      expect(yield* plugins.invoke.call("invoke-reload", "echo", {})).toBe("two")
      yield* plugins.remove(id)
    }),
  )
})
