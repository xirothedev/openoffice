import { boolean, json, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core"
import { timestamps, workspaceColumns } from "../drizzle/types"
import { workspaceIndexes } from "./workspace.sql"

export interface PresetCapabilities {
  plugins?: string[]
  skills?: string[]
  mcp?: Record<string, { url: string }>
}

export const PresetTable = mysqlTable(
  "preset",
  {
    ...workspaceColumns,
    ...timestamps,
    model: varchar("model", { length: 255 }),
    key_ref: varchar("key_ref", { length: 255 }),
    allowed_folders: json("allowed_folders").$type<string[]>(),
    auto_update: boolean("auto_update"),
    capabilities: json("capabilities").$type<PresetCapabilities>(),
  },
  (table) => [...workspaceIndexes(table), uniqueIndex("preset_workspace").on(table.workspaceID)],
)
