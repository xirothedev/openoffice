export * as ConfigOpenOffice from "./openoffice"

export interface OrgPreset {
  model?: string
  keyRef?: string
  allowedFolders?: string[]
  autoUpdate?: boolean
}

export interface LocalPrefs {
  theme?: string
  language?: string
  templates?: string[]
  model?: string
  allowedFolders?: string[]
  autoUpdate?: boolean
}

export interface EffectiveConfig {
  model?: string
  keyRef?: string
  allowedFolders?: string[]
  autoUpdate?: boolean
  theme?: string
  language?: string
  templates?: string[]
}

// ponytail: preset wins wholesale on locked keys, per-item folder merge only if staff need it.
export function resolveEffectiveConfig(preset: OrgPreset, local: LocalPrefs): EffectiveConfig {
  return {
    model: preset.model ?? local.model,
    keyRef: preset.keyRef,
    allowedFolders: preset.allowedFolders ?? local.allowedFolders,
    autoUpdate: preset.autoUpdate ?? local.autoUpdate,
    theme: local.theme,
    language: local.language,
    templates: local.templates,
  }
}

export function lockedKeys(preset: OrgPreset): (keyof EffectiveConfig)[] {
  const keys: (keyof EffectiveConfig)[] = []
  if (preset.model !== undefined) keys.push("model")
  if (preset.keyRef !== undefined) keys.push("keyRef")
  if (preset.allowedFolders !== undefined) keys.push("allowedFolders")
  if (preset.autoUpdate !== undefined) keys.push("autoUpdate")
  return keys
}
