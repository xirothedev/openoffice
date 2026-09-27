import { z } from "zod"
import { and, eq, isNull, sql } from "drizzle-orm"
import { fn } from "./util/fn"
import { Actor } from "./actor"
import { Database } from "./drizzle"
import { Identifier } from "./identifier"
import { DeviceTable } from "./schema/device.sql"

export namespace Device {
  // ponytail: heartbeat carries explicit IDs because devices authenticate with
  // API keys, not console sessions, so there is no Actor to scope from.
  export const heartbeat = fn(
    z.object({
      workspaceID: Identifier.schema("workspace"),
      userID: Identifier.schema("user"),
      deviceID: z.string().min(1).max(64),
      appVersion: z.string().max(32).optional(),
    }),
    (input) =>
      Database.use((tx) =>
        tx
          .insert(DeviceTable)
          .values({
            id: Identifier.create("device"),
            workspaceID: input.workspaceID,
            device_id: input.deviceID,
            user_id: input.userID,
            last_seen: sql`now()`,
            app_version: input.appVersion,
          })
          .onDuplicateKeyUpdate({
            set: {
              user_id: input.userID,
              last_seen: sql`now()`,
              app_version: input.appVersion,
              timeDeleted: null,
            },
          }),
      ),
  )

  export const list = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select({
          userID: DeviceTable.user_id,
          deviceID: DeviceTable.device_id,
          lastSeen: DeviceTable.last_seen,
          appVersion: DeviceTable.app_version,
        })
        .from(DeviceTable)
        .where(and(eq(DeviceTable.workspaceID, Actor.workspace()), isNull(DeviceTable.timeDeleted))),
    ),
  )
}
