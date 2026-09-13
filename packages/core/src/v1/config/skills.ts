export * as ConfigSkillsV1 from "./skills"

import { Schema } from "effect"

export const Info = Schema.Struct({
  paths: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Additional paths to skill folders",
  }),
  urls: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "URLs to fetch skills from (e.g., https://example.com/.well-known/skills/)",
  }),
  allowlist: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "When set, ONLY these skills are available. All other skills are hidden and cannot be loaded",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>
