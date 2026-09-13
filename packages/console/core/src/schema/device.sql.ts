import { mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core"
import { timestamps, ulid, utc, workspaceColumns } from "../drizzle/types"
import { workspaceIndexes } from "./workspace.sql"

export const DeviceTable = mysqlTable(
  "device",
  {
    ...workspaceColumns,
    ...timestamps,
    device_id: varchar("device_id", { length: 64 }).notNull(),
    user_id: ulid("user_id").notNull(),
    last_seen: utc("last_seen").notNull().defaultNow(),
    app_version: varchar("app_version", { length: 32 }),
  },
  (table) => [
    ...workspaceIndexes(table),
    uniqueIndex("device_workspace_device").on(table.workspaceID, table.device_id),
  ],
)
