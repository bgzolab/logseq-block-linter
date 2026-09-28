import { describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => unknown

type Block = { uuid: string; content: string }

type PaletteOptions = {
  key: string
  label: string
  keybinding?: { binding: string; mode?: string }
}

const paletteCommands: Array<{ opts: PaletteOptions; handler: Handler }> = []
const slashCommands: Array<{ tag: string; handler: Handler }> = []
const contextMenuItems: Array<{ label: string; handler: Handler }> = []
const settingsHandlers: Array<(next: Record<string, unknown>) => void> = []
const unregisterCalls: unknown[][] = []

const state = {
  settings: {} as Record<string, unknown>,
  blocks: new Map<string, Block>(),
  currentBlock: null as Block | null,
  selectedBlocks: null as Block[] | null,
  messages: [] as Array<{ content: string; status: string }>,
}

const logseq = {
  baseInfo: { id: 'logseq-block-linter' },
  get settings() {
    return state.settings
  },
  useSettingsSchema: vi.fn(),
  onSettingsChanged: (cb: (next: Record<string, unknown>) => void) => {
    settingsHandlers.push(cb)
  },
  _execCallableAPIAsync: async (method: string, ...args: unknown[]) => {
    unregisterCalls.push([method, ...args])
  },
  ready: (cb: () => void) => {
    cb()
    return Promise.resolve()
  },
  UI: {
    showMsg: async (content: string, status = 'success') => {
      state.messages.push({ content, status })
      return 'msg'
    },
  },
  App: {
    registerCommandPalette: (opts: PaletteOptions, handler: Handler) => {
      paletteCommands.push({ opts, handler })
    },
  },
  Editor: {
    registerSlashCommand: (tag: string, handler: Handler) => {
      slashCommands.push({ tag, handler })
    },
    registerBlockContextMenuItem: (label: string, handler: Handler) => {
      contextMenuItems.push({ label, handler })
    },
    getSelectedBlocks: async () => state.selectedBlocks,
    getCurrentBlock: async () => state.currentBlock,
    getBlock: async (uuid: string) => state.blocks.get(uuid) ?? null,
    updateBlock: async (uuid: string, content: string) => {
      state.blocks.set(uuid, { uuid, content })
    },
  },
}

vi.mock('@logseq/libs', () => ({}))
vi.stubGlobal('logseq', logseq)

/** 重新加载插件（重新执行 main.ts） */
async function loadPlugin(settings: Record<string, unknown> = {}): Promise<void> {
  state.settings = settings
  state.blocks.clear()
  state.currentBlock = null
  state.selectedBlocks = null
  state.messages.length = 0
  paletteCommands.length = 0
  slashCommands.length = 0
  contextMenuItems.length = 0
  settingsHandlers.length = 0
  unregisterCalls.length = 0

  vi.resetModules()
  await import('./main')
}

const lastPaletteCommand = () => paletteCommands[paletteCommands.length - 1]

describe('插件注册', () => {
  it('注册了设置页面', async () => {
    await loadPlugin()
    expect(logseq.useSettingsSchema).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ key: 'enableShortcut' }), expect.objectContaining({ key: 'shortcut' })])
    )
  })

  it('注册了斜杠命令和 block 右键菜单', async () => {
    await loadPlugin()
    expect(slashCommands[0]?.tag).toContain('格式化')
    expect(contextMenuItems[0]?.label).toContain('格式化')
  })
})

describe('快捷键设置', () => {
  it('默认是 mod+s 全局快捷键：Windows/Linux = Ctrl+S，macOS = Cmd+S', async () => {
    await loadPlugin()
    expect(lastPaletteCommand()?.opts.keybinding).toEqual({ binding: 'mod+s', mode: 'global' })
  })

  it('用设置里配置的快捷键注册', async () => {
    await loadPlugin({ shortcut: 'ctrl+alt+s' })
    expect(lastPaletteCommand()?.opts.keybinding).toEqual({ binding: 'ctrl+alt+s', mode: 'global' })
  })

  it('关闭快捷键后只保留命令面板入口', async () => {
    await loadPlugin({ enableShortcut: false })
    expect(lastPaletteCommand()?.opts.keybinding).toBeUndefined()
  })

  it('改设置后立即换绑：先撤销旧注册，再注册新快捷键', async () => {
    await loadPlugin()
    settingsHandlers[0]?.({ enableShortcut: true, shortcut: 'ctrl+shift+s' })
    await vi.waitFor(() => expect(paletteCommands).toHaveLength(2))

    expect(unregisterCalls[0]).toEqual([
      'unregister_plugin_simple_command',
      'logseq-block-linter',
      'block-linter-format-block-spacing',
    ])
    expect(lastPaletteCommand()?.opts.keybinding).toEqual({ binding: 'ctrl+shift+s', mode: 'global' })
    expect(state.messages.at(-1)?.content).toContain('ctrl+shift+s')
  })

  it('非法快捷键回退到默认值并给出 warning', async () => {
    await loadPlugin()
    settingsHandlers[0]?.({ shortcut: 'ctrl++s' })
    await vi.waitFor(() => expect(state.messages).toHaveLength(1))

    expect(lastPaletteCommand()?.opts.keybinding).toEqual({ binding: 'mod+s', mode: 'global' })
    expect(state.messages.at(-1)?.status).toBe('warning')
  })
})

describe('格式化当前 block', () => {
  it('光标所在 block 会被格式化', async () => {
    await loadPlugin()
    const block = { uuid: 'b1', content: '使用API获取v2版本的数据' }
    state.currentBlock = block
    state.blocks.set(block.uuid, block)

    await lastPaletteCommand()?.handler()

    expect(state.blocks.get('b1')?.content).toBe('使用 API 获取 v2 版本的数据')
    expect(state.messages).toEqual([])
  })

  it('多选时格式化全部选中的 blocks', async () => {
    await loadPlugin()
    const blocks = [
      { uuid: 'b1', content: '第一test' },
      { uuid: 'b2', content: '第二test' },
    ]
    state.currentBlock = blocks[0] ?? null
    state.selectedBlocks = blocks
    blocks.forEach((b) => state.blocks.set(b.uuid, b))

    await slashCommands[0]?.handler()

    expect(state.blocks.get('b1')?.content).toBe('第一 test')
    expect(state.blocks.get('b2')?.content).toBe('第二 test')
  })

  it('已经规范时不会更新 block，并提示无需调整', async () => {
    await loadPlugin()
    const block = { uuid: 'b1', content: '已经是 规范的格式' }
    state.currentBlock = block
    state.blocks.set(block.uuid, block)

    await lastPaletteCommand()?.handler()

    expect(state.blocks.get('b1')?.content).toBe('已经是 规范的格式')
    expect(state.messages).toHaveLength(1)
  })

  it('没有当前 block 时给出提示', async () => {
    await loadPlugin()

    await lastPaletteCommand()?.handler()

    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]?.content).toContain('没有找到')
  })

  it('右键菜单只格式化目标 block', async () => {
    await loadPlugin()
    state.blocks.set('b1', { uuid: 'b1', content: '第一test' })
    state.blocks.set('b2', { uuid: 'b2', content: '第二test' })

    await contextMenuItems[0]?.handler({ uuid: 'b2' })

    expect(state.blocks.get('b1')?.content).toBe('第一test')
    expect(state.blocks.get('b2')?.content).toBe('第二 test')
  })
})
