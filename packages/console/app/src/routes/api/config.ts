import type { APIEvent } from "@solidjs/start/server"
import { and, Database, eq, isNull } from "@opencode-ai/console-core/drizzle/index.js"
import { KeyTable } from "@opencode-ai/console-core/schema/key.sql.js"
import { PresetTable } from "@opencode-ai/console-core/schema/preset.sql.js"
import { WorkspaceTable } from "@opencode-ai/console-core/schema/workspace.sql.js"

export async function GET(input: APIEvent) {
  const apiKey = input.request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1]
  if (!apiKey) return Response.json({ error: "Missing API key." }, { status: 401 })

  const auth = await Database.use((tx) =>
    tx
      .select({ workspaceID: KeyTable.workspaceID })
      .from(KeyTable)
      .innerJoin(WorkspaceTable, and(eq(WorkspaceTable.id, KeyTable.workspaceID), isNull(WorkspaceTable.timeDeleted)))
      .where(and(eq(KeyTable.key, apiKey), isNull(KeyTable.timeDeleted)))
      .then((rows) => rows[0]),
  )
  if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 })

  // ponytail: x-org-id must match the key workspace; mismatch is 404 so devices treat it as no remote config.
  const orgID = input.request.headers.get("x-org-id")
  if (orgID && orgID !== auth.workspaceID) return Response.json({ error: "Not found." }, { status: 404 })

  const preset = await Database.use((tx) =>
    tx
      .select()
      .from(PresetTable)
      .where(eq(PresetTable.workspaceID, auth.workspaceID))
      .then((rows) => rows[0]),
  )
  if (!preset) return Response.json({ error: "Not found." }, { status: 404 })

  const config: Record<string, unknown> = {}
  if (preset.model) config.model = preset.model
  const plugins = preset.capabilities?.plugins?.filter((spec) => spec.trim() !== "")
  if (plugins?.length) config.plugin = plugins
  const mcp = preset.capabilities?.mcp
  if (mcp && Object.keys(mcp).length > 0) {
    config.mcp = {
      servers: Object.fromEntries(
        Object.entries(mcp)
          .filter(([, server]) => server.url.trim() !== "")
          .map(([name, server]) => [name, { type: "remote", url: server.url }]),
      ),
    }
  }
  const skills = preset.capabilities?.skills?.filter((name) => name.trim() !== "")
  if (skills?.length) config.skills = { allowlist: skills }
  return Response.json({ config })
}
