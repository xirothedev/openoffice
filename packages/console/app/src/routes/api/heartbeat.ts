import type { APIEvent } from "@solidjs/start/server"
import { and, Database, eq, isNull } from "@opencode-ai/console-core/drizzle/index.js"
import { Device } from "@opencode-ai/console-core/device.js"
import { KeyTable } from "@opencode-ai/console-core/schema/key.sql.js"
import { UserTable } from "@opencode-ai/console-core/schema/user.sql.js"
import { WorkspaceTable } from "@opencode-ai/console-core/schema/workspace.sql.js"

export async function POST(input: APIEvent) {
  const apiKey = input.request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1]
  if (!apiKey) return Response.json({ error: "Missing API key." }, { status: 401 })

  const auth = await Database.use((tx) =>
    tx
      .select({ userID: KeyTable.userID, workspaceID: KeyTable.workspaceID })
      .from(KeyTable)
      .innerJoin(
        UserTable,
        and(
          eq(UserTable.workspaceID, KeyTable.workspaceID),
          eq(UserTable.id, KeyTable.userID),
          isNull(UserTable.timeDeleted),
        ),
      )
      .innerJoin(WorkspaceTable, and(eq(WorkspaceTable.id, KeyTable.workspaceID), isNull(WorkspaceTable.timeDeleted)))
      .where(and(eq(KeyTable.key, apiKey), isNull(KeyTable.timeDeleted)))
      .then((rows) => rows[0]),
  )
  if (!auth) return Response.json({ error: "Unauthorized." }, { status: 401 })

  const body = (await input.request.json().catch(() => undefined)) as
    { device_id?: unknown; app_version?: unknown } | undefined
  const deviceID = typeof body?.device_id === "string" ? body.device_id.trim() : ""
  if (!deviceID || deviceID.length > 64) {
    return Response.json({ error: "device_id is required (max 64 chars)." }, { status: 400 })
  }
  const appVersion = typeof body?.app_version === "string" ? body.app_version.slice(0, 32) : undefined

  await Device.heartbeat({ workspaceID: auth.workspaceID, userID: auth.userID, deviceID, appVersion })
  return Response.json({ ok: true })
}
