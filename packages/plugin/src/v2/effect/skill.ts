import type { SkillV2Source } from "@opencode-ai/sdk/v2/types"
import type { Hooks } from "./registration.js"

export interface SkillDraft {
  source(source: SkillV2Source): void
  list(): readonly SkillV2Source[]
  // ponytail: org-closed skill list; undefined means open. Last writer wins.
  allowlist(names: readonly string[] | undefined): void
}

export type SkillHooks = Hooks<{
  transform: SkillDraft
}>
