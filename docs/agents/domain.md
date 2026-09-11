# Domain Docs (multi-context)

How the engineering skills consume this repo's domain documentation. Follows the `/grill-with-docs` context manager (`domain-modeling`): lazy files, glossary-only `CONTEXT.md`, ADRs only for hard trade-offs.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root: lists each context, where it lives, how they relate. Read the contexts relevant to the topic.
- **Per-context `CONTEXT.md`** (e.g. `packages/<area>/CONTEXT.md`): the glossary for that context only.
- **Root `CONTEXT.md`**: legacy single glossary, still authoritative until its terms split into per-context files. Fall back to it when no per-context file covers the topic.
- **`docs/adr/`**: system-wide decisions touching the area. Plus `packages/<area>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. Create lazily: a `CONTEXT.md` when its first term resolves, `docs/adr/` when its first ADR is needed, `CONTEXT-MAP.md` when the second context splits out.

## Layout

```
/
├── CONTEXT-MAP.md                   ← contexts, locations, relationships
├── CONTEXT.md                       ← legacy root glossary (splits lazily, see below)
├── docs/adr/                        ← system-wide decisions
└── packages/
    ├── core/                        ← Session Runtime + System Context
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── client/ protocol/ schema/ server/ sdk-next/  ← Client Contract
    │   ├── CONTEXT.md               ← one per context, colocated with its code
    │   └── docs/adr/
    └── opencode/ tui/ desktop/ app/ ← consumers, rarely own glossary terms
```

Target contexts (split out of the root glossary as terms settle):

- **Session Runtime**: durable prompts, promotion, drains, history, epochs, compaction. Lives in `packages/core` (+ `packages/opencode`, `packages/server` session surface).
- **System Context**: sources, registry, snapshots, safe boundaries, mid-conversation messages. Lives in `packages/core` system-context area.
- **Client Contract**: `Page`, OpenCode Client, Embedded host, SDK Contract IR, event streams, wire-vs-domain errors. Lives in `packages/schema`, `packages/protocol`, `packages/server`, `packages/client`, `packages/sdk-next`.

## `CONTEXT.md` rules

Glossary and nothing else. No implementation details, no specs, no scratch notes.

```md
# {Context Name}

{One or two sentences: what this context is, why it exists.}

## Language

**Order**:
A one or two sentence description of the term.
_Avoid_: Purchase, transaction
```

- **Opinionated.** One canonical term per concept; list rejected synonyms under `_Avoid_`.
- **Tight.** One or two sentences max. What it IS, not what it does.
- **Project-specific only.** General programming concepts (timeouts, error types) don't belong, even if used heavily.
- **Group under subheadings** when clusters emerge; flat list is fine for one cohesive area.

## During the session

- **Challenge against the glossary.** User language conflicts with `CONTEXT.md` → call it out immediately and resolve which is right.
- **Sharpen fuzzy language.** Vague/overloaded term → propose the precise canonical term.
- **Stress-test with scenarios.** Invent edge-case scenarios that force precise boundaries between concepts.
- **Cross-reference with code.** Claimed behavior contradicts the code → surface it and resolve.
- **Update inline.** When a term resolves, write it to its context's `CONTEXT.md` right there. Don't batch.

## ADRs

Offer one only when all three hold: **hard to reverse** + **surprising without context** + **result of a real trade-off**. Otherwise skip.

Format (`docs/adr/NNNN-slug.md`, next free number):

```md
# {Short title}

{1-3 sentences: context, decision, why.}
```

Optional sections only when they add value: Status, Considered Options, Consequences. Records decisions like monorepo shape, event-sourced vs projected models, inter-context integration (events vs sync HTTP), lock-in tech choices, ownership boundaries, deliberate deviations from the obvious path, invisible constraints.

## Vocabulary + conflicts

Name domain concepts with the glossary term, never a drifted synonym. Missing concept → either invented language (reconsider) or a real gap (note for `/domain-modeling`). Contradicting an ADR → surface explicitly: _Contradicts ADR-0007 (…), but worth reopening because…_
