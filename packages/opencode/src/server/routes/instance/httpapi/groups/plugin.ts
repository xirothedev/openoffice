import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { LocationMiddleware } from "@opencode-ai/server/location"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { described } from "./metadata"

export const PluginListItem = Schema.Struct({
  id: Schema.String,
  invokes: Schema.Array(Schema.String),
})
export const PluginList = Schema.Struct({
  data: Schema.Array(PluginListItem),
})
export const InvokePayload = Schema.Struct({
  name: Schema.String,
  input: Schema.Unknown,
})
export const InvokeResult = Schema.Struct({
  result: Schema.Unknown,
})

export class PluginNotFoundError extends Schema.TaggedErrorClass<PluginNotFoundError>()(
  "PluginNotFoundError",
  { pluginID: Schema.String },
  { httpApiStatus: 404 },
) {}

export class InvokeNotFoundError extends Schema.TaggedErrorClass<InvokeNotFoundError>()(
  "InvokeNotFoundError",
  { pluginID: Schema.String, name: Schema.String },
  { httpApiStatus: 404 },
) {}

export const PluginPaths = {
  list: "/plugin",
  invoke: "/plugin/:id/invoke",
} as const

export const PluginApi = HttpApi.make("plugin")
  .add(
    HttpApiGroup.make("plugin")
      .add(
        HttpApiEndpoint.get("list", PluginPaths.list, {
          query: WorkspaceRoutingQuery,
          success: described(PluginList, "Installed plugins with their invoke names"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "plugin.list",
            summary: "List plugins",
            description: "List installed plugins and the invoke handlers each one registered.",
          }),
        ),
        HttpApiEndpoint.post("invoke", PluginPaths.invoke, {
          params: { id: Schema.String },
          query: WorkspaceRoutingQuery,
          payload: InvokePayload,
          success: described(InvokeResult, "Invoke handler result"),
          error: [PluginNotFoundError, InvokeNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "plugin.invoke",
            summary: "Invoke plugin handler",
            description: "Call a handler a plugin registered through ctx.invoke.register.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "plugin",
          description: "Plugin invoke routes for desktop UI clients.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(LocationMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: "Experimental HttpApi surface for selected instance routes.",
    }),
  )
