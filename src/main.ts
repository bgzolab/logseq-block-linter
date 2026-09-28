import '@logseq/libs'
import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { formatSpacing } from './format-spacing'

/** 命令的唯一标识，用于命令面板 / 快捷键注册 */
const FORMAT_COMMAND_KEY = 'block-linter-format-block-spacing'

const LABEL = '格式化中英文空格'

/** 优先取多选状态下的 blocks，否则取光标所在的当前 block */
async function resolveTargetBlocks(): Promise<BlockEntity[]> {
  const selected = await logseq.Editor.getSelectedBlocks()
  if (selected && selected.length > 0) return selected

  const current = await logseq.Editor.getCurrentBlock()
  return current ? [current] : []
}

/** 格式化给定的 blocks，返回实际被修改的数量 */
async function formatBlocks(blocks: readonly BlockEntity[]): Promise<number> {
  let changed = 0

  for (const block of blocks) {
    const content = block.content ?? ''
    const formatted = formatSpacing(content)
    if (formatted === content) continue

    await logseq.Editor.updateBlock(block.uuid, formatted)
    changed += 1
  }

  return changed
}

/** 主入口：格式化选中的 blocks（或光标所在的 block） */
async function formatSelectionOrCurrentBlock(): Promise<void> {
  const blocks = await resolveTargetBlocks()
  if (blocks.length === 0) {
    await logseq.UI.showMsg('Block Linter: 没有找到可格式化的 block', 'warning')
    return
  }

  const changed = await formatBlocks(blocks)
  if (changed === 0) {
    await logseq.UI.showMsg('Block Linter: 已经是规范的格式', 'success', { timeout: 1500 })
  } else {
    console.debug(`[block-linter] formatted ${changed} block(s)`)
  }
}

function main(): void {
  // 1. Ctrl+S / 命令面板
  logseq.App.registerCommandPalette(
    {
      key: FORMAT_COMMAND_KEY,
      label: `${LABEL}（当前 block）`,
      keybinding: { binding: 'ctrl+s', mode: 'global' },
    },
    async () => {
      await formatSelectionOrCurrentBlock()
    }
  )

  // 2. 斜杠命令
  logseq.Editor.registerSlashCommand(LABEL, () => formatSelectionOrCurrentBlock())

  // 3. 右键 block 前的小圆点
  logseq.Editor.registerBlockContextMenuItem(LABEL, async ({ uuid }) => {
    const block = await logseq.Editor.getBlock(uuid)
    if (!block) return
    await formatBlocks([block])
  })

  console.log('[block-linter] plugin ready')
}

logseq.ready(main).catch(console.error)
