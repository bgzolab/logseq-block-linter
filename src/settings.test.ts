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
    expect(resolveShortcut({ shortcut: 'space' })).toEqual({ binding: 'space' })
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
})

describe('isValidShortcut', () => {
  it('常见写法合法', () => {
    for (const value of ['mod+s', 'ctrl+shift+s', 'meta+enter', 'shift+/', 'f5']) {
      expect(isValidShortcut(value), value).toBe(true)
    }
  })

  it('奇怪写法不合法', () => {
    for (const value of ['', 'ctrl+', '+', 'ctrl++s', 'ctrl s', '中文', 'ctrl+中']) {
      expect(isValidShortcut(value), value).toBe(false)
    }
  })
})
