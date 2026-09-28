import type { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin'

/**
 * 默认快捷键。
 *
 * `mod` 由 Logseq 按平台解析：Windows / Linux 上是 Ctrl+S，macOS 上是 Cmd+S。
 */
export const DEFAULT_SHORTCUT = 'mod+s'

export type PluginSettings = {
  /** 是否注册快捷键 */
  enableShortcut?: boolean
  /** 快捷键，例如 mod+s / ctrl+alt+s */
  shortcut?: string
}

/** 插件设置页面的字段 */
export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: 'enableShortcut',
    type: 'boolean',
    default: true,
    title: '启用快捷键',
    description:
      '关闭后仍可以通过斜杠命令（/格式化中英文空格）、右键 block 菜单、命令面板触发。',
  },
  {
    key: 'shortcut',
    type: 'string',
    default: DEFAULT_SHORTCUT,
    title: '快捷键',
    description:
      'mod+s = Windows / Linux 的 Ctrl+S，macOS 的 Cmd+S（mod = ⌘ / Ctrl）。' +
      '也可以写 ctrl+alt+s、mod+shift+s 等组合键，修改后立即生效，无需重启 Logseq。',
  },
]

/** 允许的按键：字母、数字和常见符号，用 `+` 连接 */
const SHORTCUT_PATTERN = /^[a-z0-9+\-;=',./[\]]+$/i

/** 是否是一个能交给 Logseq 的快捷键写法 */
export function isValidShortcut(shortcut: string): boolean {
  return (
    SHORTCUT_PATTERN.test(shortcut) &&
    !shortcut.startsWith('+') &&
    !shortcut.endsWith('+') &&
    !shortcut.includes('++')
  )
}

export type ShortcutResolution = {
  /** 要注册的快捷键；null 表示不注册快捷键 */
  binding: string | null
  /** 设置里填了非法值时的原值（此时 binding 已回退到默认快捷键） */
  invalid?: string
}

/** 从插件设置里解析出要注册的快捷键 */
export function resolveShortcut(settings: PluginSettings | undefined): ShortcutResolution {
  if (settings?.enableShortcut === false) return { binding: null }

  const shortcut = settings?.shortcut?.trim() ?? ''
  if (!shortcut) return { binding: DEFAULT_SHORTCUT }
  if (!isValidShortcut(shortcut)) return { binding: DEFAULT_SHORTCUT, invalid: shortcut }

  return { binding: shortcut.toLowerCase() }
}
