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
      '也可以写 ctrl+alt+s、mod+shift+s 等组合键（必须带 ⌘ / Ctrl / Alt，' +
      '避免劫持正常输入），修改后立即生效，无需重启 Logseq。',
  },
]

/** 允许的按键：字母、数字和常见符号，用 `+` 连接 */
const SHORTCUT_PATTERN = /^[a-z0-9+\-;=',./[\]]+$/i

/** 修饰键 */
const MODIFIER_KEYS = new Set([
  'mod',
  'ctrl',
  'control',
  'meta',
  'cmd',
  'command',
  'alt',
  'opt',
  'option',
  'shift',
])

/**
 * 可以和 `shift` 搭配、但单独使用仍会劫持输入的修饰键。
 *
 * Shift 是打字时唯一会一直按住的修饰键（大写字母、`?`、`!`、`@`……），
 * 所以 `shift+s` 这种「Shift + 可输入字符」和裸键一样危险。
 */
const STRONG_MODIFIER_KEYS = new Set([...MODIFIER_KEYS].filter((key) => key !== 'shift'))

/** 功能键（即使没有修饰键也不会劫持普通输入） */
const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-2])$/

/**
 * 是否是一个能交给 Logseq 的快捷键写法。
 *
 * 插件以 `mode: 'global'` 注册，所以要求：
 *  - 「非 Shift 修饰键 + 一个按键」，例如 `mod+s` / `ctrl+shift+s` / `alt+space`
 *  - 或者单独的功能键，例如 `f5`
 *
 * 裸键（`s` / `space`）、纯 Shift（`shift+s`）、只有修饰键（`ctrl`）、
 * 重复分段（`ctrl+s+s`）都会被拒绝，避免劫持正常输入或注册出无效快捷键。
 */
export function isValidShortcut(shortcut: string): boolean {
  if (!SHORTCUT_PATTERN.test(shortcut)) return false

  const keys = shortcut.toLowerCase().split('+')

  // `ctrl+`、`+s`、`ctrl++s` 会产生空分段
  if (keys.some((key) => key === '')) return false

  // `mod+mod+s`、`ctrl+s+s`
  if (new Set(keys).size !== keys.length) return false

  const modifiers = keys.filter((key) => MODIFIER_KEYS.has(key))
  const others = keys.filter((key) => !MODIFIER_KEYS.has(key))

  // 必须恰好有一个真正的按键
  if (others.length !== 1) return false

  const hasStrongModifier = modifiers.some((key) => STRONG_MODIFIER_KEYS.has(key))
  const isFunctionKey = FUNCTION_KEY_PATTERN.test(others[0] ?? '')

  return hasStrongModifier || isFunctionKey
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
