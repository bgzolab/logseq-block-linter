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
})

describe('isValidShortcut', () => {
  it('带修饰键的写法合法', () => {
    for (const value of ['mod+s', 'ctrl+shift+s', 'meta+enter', 'shift+/', 'alt+space', 'cmd+shift+k']) {
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

  it('奇怪写法不合法', () => {
    for (const value of ['', 'ctrl+', '+', 'ctrl++s', 'ctrl s', '中文', 'ctrl+中']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })
})
