export * as ToolRegistry from "./registry"

import { ToolOutput, ToolFailure, type ToolCall, type ToolDefinition, type ToolResultValue } from "@opencode-ai/llm"
import { Context, Effect, Layer, Scope } from "effect"
import { AgentV2 } from "../agent"
import { PermissionV2 } from "../permission"
import { SessionMessage } from "../session/message"
import { SessionSchema } from "../session/schema"
import { ToolOutputStore } from "../tool-output-store"
import { Wildcard } from "../util/wildcard"
import { ApplicationTools } from "./application-tools"
import {
  definition,
  denialMessage,
  permission,
  settle,
  validateName,
  type AnyTool,
  type RegistrationError,
} from "./tool"
import { Tools } from "./tools"
import { makeLocationNode } from "../effect/app-node"

export type ExecuteInput = {
  readonly sessionID: SessionSchema.ID
  readonly agent: AgentV2.ID
  readonly assistantMessageID: SessionMessage.ID
  readonly call: ToolCall
}

export interface Interface {
  readonly materialize: (permissions?: PermissionV2.Ruleset) => Effect.Effect<Materialization>
  /** Internal registration capability exposed publicly only through Tools.Service. */
  readonly register: (tools: Readonly<Record<string, AnyTool>>) => Effect.Effect<void, RegistrationError, Scope.Scope>
  readonly hook: (
    name: "execute.before",
    callback: (event: Tools.BeforeExecuteEvent) => Effect.Effect<void> | void,
  ) => Effect.Effect<void, never, Scope.Scope>
}

export interface Materialization {
  readonly definitions: ReadonlyArray<ToolDefinition>
  readonly settle: (input: ExecuteInput) => Effect.Effect<Settlement, ToolOutputStore.Error>
}

export interface Settlement {
  readonly result: ToolResultValue
  readonly output?: ToolOutput
  readonly outputPaths?: ReadonlyArray<string>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/ToolRegistry") {}

const registryLayer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const applications = yield* ApplicationTools.Service
    const resources = yield* ToolOutputStore.Service
    type Registration = { readonly identity: object; readonly tool: AnyTool }
    const local = new Map<string, Array<{ readonly token: object; readonly registration: Registration }>>()
    // ponytail: guards run in registration order before every settlement (both
    // direct and materialized paths funnel through settleWith); only denials
    // become error results, everything else stays loud.
    const beforeHooks: Array<(event: Tools.BeforeExecuteEvent) => Effect.Effect<void> | void> = []

    const runBeforeHooks = Effect.fn("ToolRegistry.beforeHooks")(function* (event: Tools.BeforeExecuteEvent) {
      for (const hook of [...beforeHooks]) {
        yield* runHook(hook, event)
      }
    })

    // ponytail: guards run once per settlement, before lookup, so they also
    // see calls to unknown tools. Only denials become error results.
    const checkGuards = (event: Tools.BeforeExecuteEvent) =>
      runBeforeHooks(event).pipe(
        Effect.map(() => undefined as Settlement | undefined),
        Effect.catch((error: unknown) => {
          const message = denialMessage(error)
          if (message === undefined) return Effect.die(error)
          return Effect.succeed({ result: { type: "error" as const, value: message } })
        }),
      )

    const settleWith = Effect.fn("ToolRegistry.settle")(function* (input: ExecuteInput, advertised?: object) {
      const registration =
        local.get(input.call.name)?.at(-1)?.registration ?? applications.entries().get(input.call.name)
      if (!registration)
        return {
          result: {
            type: "error" as const,
            value: advertised ? `Stale tool call: ${input.call.name}` : `Unknown tool: ${input.call.name}`,
          },
        }
      if (advertised && registration.identity !== advertised)
        return { result: { type: "error" as const, value: `Stale tool call: ${input.call.name}` } }
      const pending = yield* settle(registration.tool, input.call, {
        sessionID: input.sessionID,
        agent: input.agent,
        assistantMessageID: input.assistantMessageID,
        toolCallID: input.call.id,
      }).pipe(
        Effect.map((output) => ({ output })),
        Effect.catchTag("LLM.ToolFailure", (failure) =>
          Effect.succeed({ result: { type: "error" as const, value: failure.message } }),
        ),
      )
      if ("result" in pending) return pending
      const output = pending.output
      const bounded = yield* resources.bound({ sessionID: input.sessionID, toolCallID: input.call.id, output })
      const result = ToolOutput.toResultValue(bounded.output)
      if (result.type === "error")
        return bounded.outputPaths.length > 0 ? { result, outputPaths: bounded.outputPaths } : { result }
      return bounded.outputPaths.length > 0
        ? { result, output: bounded.output, outputPaths: bounded.outputPaths }
        : { result, output: bounded.output }
    })

    return Service.of({
      hook: (name, callback) => {
        if (name !== "execute.before") return Effect.die(`Unknown tool hook: ${name}`)
        return Effect.acquireRelease(
          Effect.sync(() => {
            beforeHooks.push(callback)
          }),
          () =>
            Effect.sync(() => {
              const index = beforeHooks.indexOf(callback)
              if (index !== -1) beforeHooks.splice(index, 1)
            }),
        )
      },
      register: Effect.fn("ToolRegistry.register")(function* (tools) {
        const entries = Object.entries(tools)
        if (entries.length === 0) return
        yield* Effect.forEach(entries, ([name]) => validateName(name), { discard: true })
        yield* Effect.uninterruptible(
          Effect.gen(function* () {
            const token = {}
            for (const [name, tool] of entries)
              local.set(name, [...(local.get(name) ?? []), { token, registration: { identity: {}, tool } }])
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                for (const [name] of entries) {
                  const registrations = local.get(name)?.filter((registration) => registration.token !== token) ?? []
                  if (registrations.length > 0) local.set(name, registrations)
                  else local.delete(name)
                }
              }),
            )
          }),
        )
      }),
      materialize: Effect.fn("ToolRegistry.materialize")(function* (permissions = []) {
        const registrations = new Map(applications.entries())
        for (const [name, entries] of local) {
          const registration = entries.at(-1)?.registration
          if (registration) registrations.set(name, registration)
        }
        for (const [name, registration] of registrations)
          if (whollyDisabled(permission(registration.tool, name), permissions)) registrations.delete(name)
        return {
          definitions: Array.from(registrations, ([name, registration]) => definition(name, registration.tool)),
          settle: (input) =>
            checkGuards({ tool: input.call.name, input: input.call.input }).pipe(
              Effect.flatMap((denied) => {
                if (denied !== undefined) return Effect.succeed(denied)
                const registration = registrations.get(input.call.name)
                if (registration) return settleWith(input, registration.identity)
                return Effect.succeed({ result: { type: "error", value: `Unknown tool: ${input.call.name}` } })
              }),
            ),
        }
      }),
    })
  }),
)

const layer = Layer.effect(
  Tools.Service,
  Service.use((registry) => Effect.succeed(Tools.Service.of({ register: registry.register, hook: registry.hook }))),
).pipe(Layer.provideMerge(registryLayer))

function runHook(
  hook: (event: Tools.BeforeExecuteEvent) => Effect.Effect<void> | void,
  event: Tools.BeforeExecuteEvent,
): Effect.Effect<void, ToolFailure> {
  try {
    const result = hook(event)
    return Effect.isEffect(result) ? (result as Effect.Effect<void, ToolFailure>) : Effect.void
  } catch (error) {
    const message = denialMessage(error)
    return message === undefined ? Effect.die(error) : Effect.fail(new ToolFailure({ message }))
  }
}

function whollyDisabled(action: string, rules: PermissionV2.Ruleset) {
  const rule = rules.findLast((rule) => Wildcard.match(action, rule.action))
  return rule?.resource === "*" && rule.effect === "deny"
}

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [ApplicationTools.node, ToolOutputStore.node],
})

export const toolsNode = makeLocationNode({
  service: Tools.Service,
  layer,
  deps: [ApplicationTools.node, ToolOutputStore.node],
})
