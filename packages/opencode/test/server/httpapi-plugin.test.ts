import { afterEach, describe, expect } from "bun:test"
import { Server } from "../../src/server/server"
import { Effect } from "effect"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
import { it } from "../lib/effect"

function app() {
  return Server.Default().app
}

const tmpdirEffect = (options: Parameters<typeof tmpdir>[0]) =>
  Effect.acquireRelease(
    Effect.promise(() => tmpdir(options)),
    (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
  )

afterEach(async () => {
  await disposeAllInstances()
  await resetDatabase()
})

describe("plugin HttpApi", () => {
  // ponytail: read-only endpoints never mark instances for disposal, so unlike
  // mutating-endpoint tests there is nothing to wait for beyond the response.
  it.live("lists installed plugins with invoke names", () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({ config: { formatter: false, lsp: false } })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/plugin", {
            headers: { "x-opencode-directory": tmp.path },
          }),
        ),
      )

      expect(response.status).toBe(200)
      expect(yield* Effect.promise(() => response.json())).toEqual({ data: [] })
    }),
  )

  it.live("returns 404 for unknown plugin invoke", () =>
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({ config: { formatter: false, lsp: false } })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/plugin/missing/invoke", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-opencode-directory": tmp.path,
            },
            body: JSON.stringify({ name: "office.preview", input: {} }),
          }),
        ),
      )

      expect(response.status).toBe(404)
      expect(yield* Effect.promise(() => response.json())).toMatchObject({ pluginID: "missing" })
    }),
  )
})
