export * as ConfigOpenOffice from "./openoffice"

// ponytail: single pin for the bundled office plugin; bump with plugin releases.
export const officePluginSpec = "@xirothedev/openoffice-plugin-opencode@0.2.1"

export interface ManagedMCP {
  url: string
}

export interface ManagedCapability {
  plugins?: string[]
  skills?: string[]
  mcp?: Record<string, ManagedMCP>
}

export interface OrgPreset {
  model?: string
  keyRef?: string
  allowedFolders?: string[]
  autoUpdate?: boolean
  capabilities?: ManagedCapability
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
  capabilities?: ManagedCapability
  theme?: string
  language?: string
  templates?: string[]
}

// ponytail: preset wins wholesale on locked keys, per-item folder merge only if staff need it.
// ponytail: capabilities are preset-closed (no staff extras), remote-only MCP so no local commands.
export function resolveEffectiveConfig(preset: OrgPreset, local: LocalPrefs): EffectiveConfig {
  return {
    model: preset.model ?? local.model,
    keyRef: preset.keyRef,
    allowedFolders: preset.allowedFolders ?? local.allowedFolders,
    autoUpdate: preset.autoUpdate ?? local.autoUpdate,
    capabilities: preset.capabilities,
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
  if (preset.capabilities !== undefined) keys.push("capabilities")
  return keys
}
