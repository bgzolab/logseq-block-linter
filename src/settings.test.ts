import { describe, expect, it } from 'vitest'

import { DEFAULT_SHORTCUT, isValidShortcut, resolveShortcut } from './settings'

describe('resolveShortcut', () => {
  it('默认是 mod+s：Windows / Linux = Ctrl+S，macOS = Cmd+S', () => {
    expect(resolveShortcut(undefined)).toEqual({ binding: DEFAULT_SHORTCUT })
    expect(resolveShortcut({})).toEqual({ binding: 'mod+s' })
    expect(resolveShortcut({ shortcut: '   ' })).toEqual({ binding: 'mod+s' })
  })

  it('使用设置里的自定义快捷键', () => {
    expect(resolveShortcut({ shortcut: 'ctrl+shift+s' })).toEqual({ binding: 'ctrl+shift+s' })
    expect(resolveShortcut({ shortcut: ' Ctrl+Alt+S ' })).toEqual({ binding: 'ctrl+alt+s' })
    expect(resolveShortcut({ shortcut: 'meta+enter' })).toEqual({ binding: 'meta+enter' })
    expect(resolveShortcut({ shortcut: 'f5' })).toEqual({ binding: 'f5' })
  })

  it('enableShortcut=false 时不注册快捷键', () => {
    expect(resolveShortcut({ enableShortcut: false })).toEqual({ binding: null })
    expect(resolveShortcut({ enableShortcut: false, shortcut: 'ctrl+s' })).toEqual({ binding: null })
  })

  it('非法快捷键回退到默认值并带上原值', () => {
    expect(resolveShortcut({ shortcut: 'ctrl++s' })).toEqual({ binding: 'mod+s', invalid: 'ctrl++s' })
    expect(resolveShortcut({ shortcut: '+s' })).toEqual({ binding: 'mod+s', invalid: '+s' })
    expect(resolveShortcut({ shortcut: 'ctrl 空格' })).toEqual({ binding: 'mod+s', invalid: 'ctrl 空格' })
  })

  it('没有修饰键的快捷键会劫持正常输入，按非法处理', () => {
    expect(resolveShortcut({ shortcut: 'space' })).toEqual({ binding: 'mod+s', invalid: 'space' })
    expect(resolveShortcut({ shortcut: 'enter' })).toEqual({ binding: 'mod+s', invalid: 'enter' })
    expect(resolveShortcut({ shortcut: 's' })).toEqual({ binding: 'mod+s', invalid: 's' })
  })

  it('只有 Shift 的快捷键同样会劫持输入（大写字母 / 符号）', () => {
    expect(resolveShortcut({ shortcut: 'shift+s' })).toEqual({ binding: 'mod+s', invalid: 'shift+s' })
    expect(resolveShortcut({ shortcut: 'shift+/' })).toEqual({ binding: 'mod+s', invalid: 'shift+/' })
    expect(resolveShortcut({ shortcut: 'shift+space' })).toEqual({
      binding: 'mod+s',
      invalid: 'shift+space',
    })
  })

  it('无效组合（只有修饰键 / 重复分段）也按非法处理', () => {
    for (const value of ['ctrl', 'alt+option', 'mod+mod+s', 'ctrl+s+s']) {
      expect(resolveShortcut({ shortcut: value }), value).toEqual({ binding: 'mod+s', invalid: value })
    }
  })
})

describe('isValidShortcut', () => {
  it('强修饰键 + 按键的写法合法', () => {
    for (const value of [
      'mod+s',
      'ctrl+shift+s',
      'meta+enter',
      'alt+space',
      'cmd+shift+k',
      'shift+f5',
    ]) {
      expect(isValidShortcut(value), value).toBe(true)
    }
  })

  it('单独的功能键合法（不会劫持普通输入）', () => {
    for (const value of ['f1', 'f5', 'f12']) {
      expect(isValidShortcut(value), value).toBe(true)
    }
  })

  it('没有修饰键的普通按键不合法', () => {
    for (const value of ['space', 'enter', 's', '1', 'f13']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })

  it('只有 Shift 的组合不合法', () => {
    for (const value of ['shift+s', 'shift+1', 'shift+/', 'shift+space', 'shift+enter']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })

  it('只有修饰键或分段重复的写法不合法', () => {
    for (const value of ['ctrl', 'alt+option', 'shift', 'mod+mod+s', 'ctrl+s+s', 'ctrl+ctrl']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })

  it('奇怪写法不合法', () => {
    for (const value of ['', 'ctrl+', '+', 'ctrl++s', 'ctrl s', '中文', 'ctrl+中']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })
})
