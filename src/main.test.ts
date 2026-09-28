import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => unknown

type Block = { uuid: string; content: string }

type StraightforwardCommand = {
  key: string
  label: string
  keybinding?: { binding: string; mode?: string }
}

const paletteCommands: Array<{ opts: StraightforwardCommand; handler: Handler }> = []
const slashCommands: Array<{ tag: string; handler: Handler }> = []
const contextMenuItems: Array<{ label: string; handler: Handler }> = []

const state = {
  blocks: new Map<string, Block>(),
  currentBlock: null as Block | null,
  selectedBlocks: null as Block[] | null,
  messages: [] as string[],
}

const logseq = {
  ready: (cb: () => void) => {
    cb()
    return Promise.resolve()
  },
  UI: {
    showMsg: async (content: string) => {
      state.messages.push(content)
      return 'msg'
    },
  },
  App: {
    registerCommandPalette: (opts: StraightforwardCommand, handler: Handler) => {
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

await import('./main')

const paletteCommand = paletteCommands[0]
const slashCommand = slashCommands[0]
const contextMenuItem = contextMenuItems[0]

beforeEach(() => {
  state.blocks.clear()
  state.currentBlock = null
  state.selectedBlocks = null
  state.messages.length = 0
})

describe('插件注册', () => {
  it('注册了 ctrl+s 的全局快捷键', () => {
    expect(paletteCommand?.opts.keybinding).toEqual({ binding: 'ctrl+s', mode: 'global' })
  })

  it('注册了斜杠命令和 block 右键菜单', () => {
    expect(slashCommand?.tag).toContain('格式化')
    expect(contextMenuItem?.label).toContain('格式化')
  })
})

describe('格式化当前 block', () => {
  it('光标所在 block 会被格式化', async () => {
    const block = { uuid: 'b1', content: '使用API获取v2版本的数据' }
    state.currentBlock = block
    state.blocks.set(block.uuid, block)

    await paletteCommand.handler()

    expect(state.blocks.get('b1')?.content).toBe('使用 API 获取 v2 版本的数据')
    expect(state.messages).toEqual([])
  })

  it('多选时格式化全部选中的 blocks', async () => {
    const blocks = [
      { uuid: 'b1', content: '第一test' },
      { uuid: 'b2', content: '第二test' },
    ]
    state.currentBlock = blocks[0]
    state.selectedBlocks = blocks
    blocks.forEach((b) => state.blocks.set(b.uuid, b))

    await slashCommand.handler()

    expect(state.blocks.get('b1')?.content).toBe('第一 test')
    expect(state.blocks.get('b2')?.content).toBe('第二 test')
  })

  it('已经规范时不会更新 block，并提示无需调整', async () => {
    const block = { uuid: 'b1', content: '已经是 规范的格式' }
    state.currentBlock = block
    state.blocks.set(block.uuid, block)

    await paletteCommand.handler()

    expect(state.blocks.get('b1')?.content).toBe('已经是 规范的格式')
    expect(state.messages).toHaveLength(1)
  })

  it('没有当前 block 时给出提示', async () => {
    await paletteCommand.handler()

    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toContain('没有找到')
  })

  it('右键菜单只格式化目标 block', async () => {
    state.blocks.set('b1', { uuid: 'b1', content: '第一test' })
    state.blocks.set('b2', { uuid: 'b2', content: '第二test' })

    await contextMenuItem.handler({ uuid: 'b2' })

    expect(state.blocks.get('b1')?.content).toBe('第一test')
    expect(state.blocks.get('b2')?.content).toBe('第二 test')
  })
})
