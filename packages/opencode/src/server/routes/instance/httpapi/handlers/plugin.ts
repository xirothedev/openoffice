import { PluginV2 } from "@opencode-ai/core/plugin"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { InvokeNotFoundError, InvokePayload, PluginNotFoundError } from "../groups/plugin"

export const pluginHandlers = HttpApiBuilder.group(InstanceHttpApi, "plugin", (handlers) =>
  Effect.gen(function* () {
    // ponytail: PluginV2 is a per-location service, only available per request
    // through LocationMiddleware — never yield it at handler-build time.
    const list = Effect.fn("PluginHttpApi.list")(function* () {
      const plugins = yield* PluginV2.Service
      return { data: yield* plugins.invoke.list() }
    })

    const invoke = Effect.fn("PluginHttpApi.invoke")(function* (ctx: {
      params: { id: string }
      payload: typeof InvokePayload.Type
    }) {
      const plugins = yield* PluginV2.Service
      // ponytail: void results serialize as {} (client reads it as unmanaged
      // fallback); dedicated 204 emission waits for the first void producer.
      return yield* plugins.invoke.call(ctx.params.id, ctx.payload.name, ctx.payload.input).pipe(
        Effect.map((result) => ({ result })),
        Effect.catchTags({
          PluginInvokeUnknownPlugin: (error) => Effect.fail(new PluginNotFoundError({ pluginID: error.pluginID })),
          PluginInvokeUnknownInvoke: (error) =>
            Effect.fail(new InvokeNotFoundError({ pluginID: error.pluginID, name: error.name })),
        }),
      )
    })

    return handlers.handle("list", list).handle("invoke", invoke)
  }),
)
