import { z } from "zod"
import { eq } from "drizzle-orm"
import { fn } from "./util/fn"
import { Actor } from "./actor"
import { Database } from "./drizzle"
import { Identifier } from "./identifier"
import { PresetTable } from "./schema/preset.sql"

export namespace Preset {
  const Capabilities = z.object({
    plugins: z.array(z.string().min(1)).optional(),
    skills: z.array(z.string().min(1)).optional(),
    mcp: z.record(z.string(), z.object({ url: z.string().min(1) })).optional(),
  })

  const Input = z.object({
    model: z.string().min(1).optional(),
    key_ref: z.string().min(1).optional(),
    allowed_folders: z.array(z.string().min(1)).optional(),
    auto_update: z.boolean().optional(),
    capabilities: Capabilities.optional(),
  })

  export const get = fn(z.void(), () =>
    Database.use((tx) =>
      tx
        .select()
        .from(PresetTable)
        .where(eq(PresetTable.workspaceID, Actor.workspace()))
        .then((rows) => rows[0] ?? null),
    ),
  )

  export const set = fn(Input, (input) => {
    Actor.assertAdmin()
    return Database.use((tx) =>
      tx
        .insert(PresetTable)
        .values({
          id: Identifier.create("preset"),
          workspaceID: Actor.workspace(),
          ...input,
        })
        .onDuplicateKeyUpdate({
          set: { ...input },
        }),
    )
  })
}
