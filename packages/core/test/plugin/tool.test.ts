import { describe, expect, test } from "bun:test"
import { PluginV2 } from "@opencode-ai/core/plugin"
import { PluginTool } from "@opencode-ai/core/plugin/tool"
import { AgentV2 } from "@opencode-ai/core/agent"
import { SessionV2 } from "@opencode-ai/core/session"
import { SessionMessage } from "@opencode-ai/core/session/message"
import { ToolRegistry } from "@opencode-ai/core/tool/registry"
import { Tool } from "@opencode-ai/core/tool/tool"
import { Effect, Schema } from "effect"
import { testEffect } from "../lib/effect"
import { executeTool, toolDefinitions } from "../lib/tool"
import { PluginTestLayer } from "./fixture"

const officeLike = {
  name: "officecli-test",
  description: "Test office tool",
  input: Schema.Struct({ filePath: Schema.String }),
  output: Schema.String,
  execute: (input: { readonly filePath: string }) => Effect.succeed({ output: `read:${input.filePath}` }),
}

describe("PluginTool.adapt", () => {
  test("adapts foreign schema tools to canonical tools", () => {
    expect(PluginTool.adapt(officeLike)).toMatchObject({ name: "officecli-test" })
  })

  test("rejects malformed tools with RegistrationError", () => {
    expect(() => PluginTool.adapt({})).toThrow(Tool.RegistrationError)
    expect(() => PluginTool.adapt({ ...officeLike, input: "nope" })).toThrow(Tool.RegistrationError)
  })
})

const it = testEffect(PluginTestLayer)

const sessionID = SessionV2.ID.make("ses_plugin_tool")
const agent = AgentV2.ID.make("build")
const assistantMessageID = SessionMessage.ID.make("msg_plugin_tool")
const call = (name: string, input: unknown, id: string) => ({
  sessionID,
  agent,
  assistantMessageID,
  call: { type: "tool-call" as const, id, name, input },
})

describe("ctx.tool", () => {
  it.effect("registers plugin tools and enforces execute.before guards", () =>
    Effect.gen(function* () {
      const plugins = yield* PluginV2.Service
      const registry = yield* ToolRegistry.Service
      const id = PluginV2.ID.make("tool-test")
      yield* plugins.add(id, (ctx) =>
        Effect.gen(function* () {
          yield* ctx.tool.transform((editor) => {
            editor.add(officeLike)
            editor.add({ ...officeLike, name: "dup", execute: () => Promise.resolve({ output: "one" }) })
            editor.add({ ...officeLike, name: "dup", execute: () => Promise.resolve({ output: "two" }) })
            editor.add({ ...officeLike, name: "raw", execute: () => ({ output: "raw-value" }) })
          })
          yield* ctx.tool.hook("execute.before", (event) => {
            if (event.tool === "blocked") throw { _tag: "Tool.Error", message: "blocked by test guard" }
          })
        }),
      )

      const names = yield* toolDefinitions(registry).pipe(
        Effect.map((definitions) => definitions.map((definition) => definition.name)),
      )
      expect(names).toContain("officecli-test")

      expect(yield* executeTool(registry, call("officecli-test", { filePath: "a.docx" }, "call-allow"))).toEqual({
        type: "text",
        value: "read:a.docx",
      })

      expect(yield* executeTool(registry, call("blocked", {}, "call-deny"))).toEqual({
        type: "error",
        value: "blocked by test guard",
      })

      expect(yield* executeTool(registry, call("dup", { filePath: "b.docx" }, "call-dup"))).toEqual({
        type: "text",
        value: "two",
      })

      expect(yield* executeTool(registry, call("raw", { filePath: "c.docx" }, "call-raw"))).toEqual({
        type: "text",
        value: "raw-value",
      })

      yield* plugins.remove(id)
      const after = yield* toolDefinitions(registry).pipe(
        Effect.map((definitions) => definitions.map((definition) => definition.name)),
      )
      expect(after).not.toContain("officecli-test")
    }),
  )
})
