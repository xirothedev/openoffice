import { describe, expect, test } from "bun:test"
import { lockedKeys, resolveEffectiveConfig } from "@/config/openoffice"

describe("resolveEffectiveConfig", () => {
  test("preset locks model, key, folders, updates; staff keeps theme, language, templates", () => {
    const effective = resolveEffectiveConfig(
      { model: "org/model", keyRef: "org/key", allowedFolders: ["/work"], autoUpdate: true },
      { theme: "dark", language: "vi", templates: ["report"], model: "staff/model", autoUpdate: false },
    )
    expect(effective.model).toBe("org/model")
    expect(effective.keyRef).toBe("org/key")
    expect(effective.allowedFolders).toEqual(["/work"])
    expect(effective.autoUpdate).toBe(true)
    expect(effective.theme).toBe("dark")
    expect(effective.language).toBe("vi")
    expect(effective.templates).toEqual(["report"])
  })

  test("falls back to local when preset omits a locked key", () => {
    const effective = resolveEffectiveConfig({}, { model: "staff/model", autoUpdate: false })
    expect(effective.model).toBe("staff/model")
    expect(effective.autoUpdate).toBe(false)
  })

  test("preset-closed capabilities win wholesale with no staff override", () => {
    const effective = resolveEffectiveConfig(
      {
        capabilities: {
          plugins: ["@xirothedev/openoffice-plugin-opencode@0.2.1"],
          skills: ["office-review"],
          mcp: { docs: { url: "https://mcp.internal/docs" } },
        },
      },
      {},
    )
    expect(effective.capabilities).toEqual({
      plugins: ["@xirothedev/openoffice-plugin-opencode@0.2.1"],
      skills: ["office-review"],
      mcp: { docs: { url: "https://mcp.internal/docs" } },
    })
  })

  test("empty preset and local yields empty effective config", () => {
    expect(resolveEffectiveConfig({}, {})).toEqual({
      model: undefined,
      keyRef: undefined,
      allowedFolders: undefined,
      autoUpdate: undefined,
      capabilities: undefined,
      theme: undefined,
      language: undefined,
      templates: undefined,
    })
  })
})

describe("lockedKeys", () => {
  test("reports only preset-provided keys as locked", () => {
    expect(lockedKeys({ model: "org/model", keyRef: "org/key", autoUpdate: true })).toEqual([
      "model",
      "keyRef",
      "autoUpdate",
    ])
    expect(lockedKeys({ capabilities: { skills: ["office-review"] } })).toEqual(["capabilities"])
    expect(lockedKeys({})).toEqual([])
  })
})
