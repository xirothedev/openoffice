import { json, action, useParams, useSubmission, createAsync, query } from "@solidjs/router"
import { createEffect, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { withActor } from "~/context/auth.withActor"
import { Preset } from "@opencode-ai/console-core/preset.js"
import styles from "./settings-section.module.css"
import { formError, localizeError } from "~/lib/form-error"
import { useI18n } from "~/context/i18n"

// ponytail: English strings hardcoded; i18n keys only when a second locale needs this section.
const lines = (value: string | null) =>
  (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")

const getPreset = query(async (workspaceID: string) => {
  "use server"
  return withActor(() => Preset.get(), workspaceID)
}, "preset.get")

const savePreset = action(async (form: FormData) => {
  "use server"
  const workspaceID = form.get("workspaceID") as string | null
  if (!workspaceID) return { error: formError.workspaceRequired }
  const text = (key: string) => {
    const value = (form.get(key) as string | null)?.trim()
    return value ? value : undefined
  }
  const mcp: Record<string, { url: string }> = {}
  for (const line of lines(form.get("mcp") as string | null)) {
    const cut = line.indexOf("=")
    if (cut <= 0) return { error: `MCP line must be name=url, got: ${line}` }
    mcp[line.slice(0, cut).trim()] = { url: line.slice(cut + 1).trim() }
  }
  const plugins = lines(form.get("plugins") as string | null)
  const skills = lines(form.get("skills") as string | null)
  const autoUpdate = form.get("autoUpdate") as string | null
  return json(
    await withActor(
      () =>
        Preset.set({
          model: text("model"),
          key_ref: text("keyRef"),
          allowed_folders: lines(form.get("allowedFolders") as string | null),
          auto_update: autoUpdate === "" ? undefined : autoUpdate === "on",
          capabilities:
            plugins.length + skills.length + Object.keys(mcp).length > 0
              ? {
                  plugins: plugins.length > 0 ? plugins : undefined,
                  skills: skills.length > 0 ? skills : undefined,
                  mcp: Object.keys(mcp).length > 0 ? mcp : undefined,
                }
              : undefined,
        })
          .then(() => ({ error: undefined }))
          .catch((e) => ({ error: e.message as string })),
      workspaceID,
    ),
    { revalidate: getPreset.key },
  )
}, "preset.save")

export function PresetSection() {
  const params = useParams()
  const i18n = useI18n()
  const preset = createAsync(() => getPreset(params.id!))
  const submission = useSubmission(savePreset)
  const [store, setStore] = createStore({ show: false })

  createEffect(() => {
    if (!submission.pending && submission.result && !submission.result.error) setStore("show", false)
  })

  const summary = () => {
    const p = preset()
    if (!p) return "No org preset. Staff devices use local config."
    const parts = [
      p.model ?? "any model",
      `${p.capabilities?.plugins?.length ?? 0} plugins`,
      `${p.capabilities?.skills?.length ?? 0} skills`,
      `${Object.keys(p.capabilities?.mcp ?? {}).length} MCP servers`,
    ]
    return `Preset: ${parts.join(" · ")}`
  }

  return (
    <section class={styles.root}>
      <div data-slot="section-title">
        <h2>Org preset</h2>
        <p>Pushed to staff devices. Preset fields lock the matching staff settings.</p>
      </div>
      <div data-slot="section-content">
        <div data-slot="setting">
          <Show
            when={store.show}
            fallback={
              <div data-slot="value-with-action">
                <p data-slot="current-value">{summary()}</p>
                <button data-color="primary" onClick={() => setStore("show", true)}>
                  Edit
                </button>
              </div>
            }
          >
            <form action={savePreset} method="post" data-slot="create-form">
              <input type="hidden" name="workspaceID" value={params.id} />
              <label>
                Model
                <input
                  name="model"
                  type="text"
                  placeholder="e.g. anthropic/claude-sonnet-4"
                  value={preset()?.model ?? ""}
                />
              </label>
              <label>
                Key reference
                <input name="keyRef" type="text" placeholder="e.g. org/prod-key" value={preset()?.key_ref ?? ""} />
              </label>
              <label>
                Allowed folders (one per line)
                <textarea name="allowedFolders" rows="3" data-component="input">
                  {(preset()?.allowed_folders ?? []).join("\n")}
                </textarea>
              </label>
              <label>
                Auto-update
                <select name="autoUpdate" data-component="input">
                  <option value="" selected={preset()?.auto_update === null || preset()?.auto_update === undefined}>
                    Staff setting
                  </option>
                  <option value="on" selected={preset()?.auto_update === true}>
                    On
                  </option>
                  <option value="off" selected={preset()?.auto_update === false}>
                    Off
                  </option>
                </select>
              </label>
              <label>
                Plugins (one spec per line)
                <textarea name="plugins" rows="3" data-component="input">
                  {(preset()?.capabilities?.plugins ?? []).join("\n")}
                </textarea>
              </label>
              <label>
                Skills (one name per line)
                <textarea name="skills" rows="3" data-component="input">
                  {(preset()?.capabilities?.skills ?? []).join("\n")}
                </textarea>
              </label>
              <label>
                MCP servers (one name=url per line, remote only)
                <textarea name="mcp" rows="3" data-component="input">
                  {Object.entries(preset()?.capabilities?.mcp ?? {})
                    .map(([name, server]) => `${name}=${server.url}`)
                    .join("\n")}
                </textarea>
              </label>
              <Show when={submission.result && submission.result.error}>
                {(err) => <div data-slot="form-error">{localizeError(i18n.t, err())}</div>}
              </Show>
              <div data-slot="input-container">
                <button type="submit" data-color="primary" disabled={submission.pending}>
                  Save preset
                </button>
                <button type="reset" data-color="ghost" onClick={() => setStore("show", false)}>
                  Cancel
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </section>
  )
}
