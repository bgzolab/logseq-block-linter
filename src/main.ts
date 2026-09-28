import '@logseq/libs'
import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { formatSpacing } from './format-spacing'
import { resolveShortcut, settingsSchema, type PluginSettings } from './settings'

/** 命令面板 / 快捷键的唯一标识 */
const FORMAT_COMMAND_KEY = 'block-linter-format-block-spacing'
const LABEL = '格式化中英文空格'
/** 兜底用的插件 id，正常情况下从 logseq.baseInfo 读取 */
const FALLBACK_PLUGIN_ID = 'logseq-block-linter'

/** 已经注册的快捷键（null = 只注册了命令面板入口） */
let registered: { binding: string | null } | null = null

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

/** 注册命令面板命令（快捷键为 null 时只出现在命令面板里） */
function registerCommand(binding: string | null): void {
  logseq.App.registerCommandPalette(
    {
      key: FORMAT_COMMAND_KEY,
      label: `${LABEL}（当前 block）`,
      ...(binding ? { keybinding: { binding, mode: 'global' as const } } : {}),
    },
    async () => {
      await formatSelectionOrCurrentBlock()
    }
  )

  registered = { binding }
}

/**
 * 撤销上一次注册，让旧快捷键立即失效。
 *
 * Logseq 没有公开的 unregister API，这里调用宿主内部的
 * `unregister_plugin_simple_command`；万一将来失效，也只是旧快捷键多留一会儿，
 * 重新加载插件就会清理干净。
 */
async function unregisterCommand(): Promise<void> {
  const internal = logseq as unknown as {
    _execCallableAPIAsync?: (method: string, ...args: unknown[]) => Promise<unknown>
  }
  if (!internal._execCallableAPIAsync) return

  const pluginId = logseq.baseInfo?.id ?? FALLBACK_PLUGIN_ID

  try {
    await internal._execCallableAPIAsync(
      'unregister_plugin_simple_command',
      pluginId,
      FORMAT_COMMAND_KEY
    )
  } catch (error) {
    console.warn('[block-linter] 撤销旧快捷键失败', error)
  }
}

/** 按当前设置注册快捷键；设置变化时调用，立即生效 */
async function applyShortcut(settings: PluginSettings | undefined, notify = false): Promise<void> {
  const { binding, invalid } = resolveShortcut(settings)
  const changed = registered === null || registered.binding !== binding

  if (changed) {
    if (registered) await unregisterCommand()
    registerCommand(binding)
    console.debug(`[block-linter] shortcut: ${binding ?? 'disabled'}`)
  }

  if (invalid) {
    await logseq.UI.showMsg(
      `Block Linter: 快捷键「${invalid}」无法识别，已回退到 ${binding}`,
      'warning'
    )
  } else if (notify && changed) {
    await logseq.UI.showMsg(
      binding ? `Block Linter: 快捷键已更新为 ${binding}` : 'Block Linter: 快捷键已关闭',
      'success'
    )
  }
}

function main(): void {
  // 1. 快捷键（跟随插件设置）
  void applyShortcut(logseq.settings as PluginSettings | undefined)
  logseq.onSettingsChanged((next: PluginSettings) => {
    void applyShortcut(next, true)
  })

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

// 设置要在 ready 之前注册，这样 logseq.settings 里会带上默认值
logseq.useSettingsSchema(settingsSchema)
logseq.ready(main).catch(console.error)
