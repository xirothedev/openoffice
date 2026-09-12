export * as PluginTool from "./tool"

import { Tool } from "../tool/tool"
import { Effect, Schema } from "effect"

// Adapts foreign schema-shaped tools (the shape plugins author against) into
// canonical registry tools. Foreign Result envelopes unwrap to their output;
// foreign content payloads have no canonical equivalent yet and are dropped.
export function adapt(raw: unknown): { readonly name: string; readonly tool: Tool.AnyTool } {
  const record = isRecord(raw) ? raw : {}
  const name = record.name
  if (typeof name !== "string" || !name) {
    throw new Tool.RegistrationError({ name: "unknown", message: "Plugin tool must have a string name" })
  }
  const description = record.description
  if (typeof description !== "string") {
    throw new Tool.RegistrationError({ name, message: "Plugin tool must have a string description" })
  }
  const input = record.input
  if (!Schema.isSchema(input)) {
    throw new Tool.RegistrationError({ name, message: "Plugin tool input must be an Effect Schema" })
  }
  const output = record.output === undefined ? Schema.Unknown : record.output
  if (!Schema.isSchema(output)) {
    throw new Tool.RegistrationError({ name, message: "Plugin tool output must be an Effect Schema" })
  }
  const execute = record.execute
  if (typeof execute !== "function") {
    throw new Tool.RegistrationError({ name, message: "Plugin tool execute must be a function" })
  }
  const tool = Tool.make({
    description,
    input: input as Tool.SchemaType<any>,
    output: output as Tool.SchemaType<any>,
    execute: (input, context) =>
      invokeForeign(() =>
        execute(input, {
          sessionID: context.sessionID,
          agent: context.agent,
          messageID: context.assistantMessageID,
          id: context.toolCallID,
          progress: () => Effect.void,
        }),
      ).pipe(Effect.map((result) => unwrapOutput(result))),
  })
  return { name, tool }
}

function unwrapOutput(result: unknown): unknown {
  if (isRecord(result) && "output" in result) return result.output
  return result
}

// Foreign executors may throw synchronously, fail with foreign denial errors,
// or return Effects, Promises, or raw values. Denials become ToolFailure;
// anything else uninterpretable stays loud instead of silently allowing.
function invokeForeign(fn: () => unknown): Effect.Effect<unknown, Tool.Failure> {
  let result: unknown
  try {
    result = fn()
  } catch (error) {
    return deny(error)
  }
  let settled: Effect.Effect<unknown, unknown>
  if (Effect.isEffect(result)) settled = result as Effect.Effect<unknown, unknown>
  else if (result instanceof Promise) settled = Effect.promise(() => result)
  else settled = Effect.succeed(result)
  return settled.pipe(Effect.catch((error: unknown) => deny(error)))
}

function deny(error: unknown): Effect.Effect<unknown, Tool.Failure> {
  const message = Tool.denialMessage(error)
  return message === undefined ? Effect.die(error) : Effect.fail(new Tool.Failure({ message }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
