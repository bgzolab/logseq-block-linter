# AGENTS.md

给 AI / 自动化协作者的项目说明（人类读者请看 [README.md](./README.md)）。

## 项目是什么

Logseq 插件 **Block Linter**：格式化当前 block / 选中的 blocks 的中英文空格（CJK 与拉丁字母、数字之间补一个空格）。

- 技术栈：TypeScript + Vite（构建）+ Vitest（测试）
- 运行时依赖：`@logseq/libs`（会被打进产物）
- 产物：`dist/`；Logseq 通过 `package.json` 的 `main`（`dist/index.html`）加载

## 常用命令

```shell
npm ci          # 安装依赖（CI 用这个）
npm test        # vitest run，必须全绿
npm run build   # tsc --noEmit + vite build
npm run dev     # vite build --watch（改完在 Logseq 里重新加载插件）
```

Node 22（见 `.github/workflows/test.yml`）。**改完代码必须 `npm test` 和 `npm run build` 都通过。**

## 代码结构与职责

| 文件 | 职责 |
| --- | --- |
| `src/format-spacing.ts` | 唯一格式化逻辑：纯函数 `formatSpacing(text)`，不依赖 logseq API |
| `src/settings.ts` | 设置 schema + 快捷键解析/校验，纯函数 |
| `src/main.ts` | 插件入口：注册设置页、快捷键、斜杠命令、右键菜单；设置热更新 |
| `vite.config.ts` | 构建配置 + 往 `dist/` 生成 `package.json` / `logo.svg` |
| `.github/workflows/` | `test.yml`（构建 + 测试）、`opencode-review.yaml`（PR 自动评审） |

## 硬性约束（动手前先读）

1. `vite.config.ts` 里的 `base: './'` 不能去掉——Logseq 以 `file://` 加载插件产物，绝对路径会加载失败。
2. `dist/` 里必须有一份 `package.json`（由 `vite.config.ts` 的 `distPluginManifest()` 生成），否则直接加载 `dist/` 会报 `Illegal Logseq plugin package`；Logseq 是读「所选文件夹」里的 package.json 的。
3. `package.json` 的 `logseq.id` 必须保留：外部（unpacked）插件缺少 id 时，Logseq 会**改写**这个文件。
4. 快捷键以 `mode: 'global'` 注册（编辑 block 时也要能触发），所以任何「裸键 / 纯 Shift」绑定都会在用户打字时劫持输入。`src/settings.ts` 里的校验规则（必须有一个非 Shift 修饰键，或单独 `f1`~`f12`；拒绝只有修饰键、分段重复）是有意为之，**不要放宽**，改动请同步更新 `src/settings.test.ts`。
5. `formatSpacing` 必须保持**幂等**（已有空格不动、不合并连续空格），且受保护片段（代码块 / 行内代码 / 双链 / 块引用 / Markdown 链接 / URL / 标签 / 属性名 / 公式 / 内联 HTML 标签）内部永不改写。注意：HTML 标签只保证标签本身不被改写，标签**元素内部**的边界会补空格（`<u> 下划线 </u>`）；相邻的受保护片段之间不补空格。改规则时同时补 `src/format-spacing.test.ts` 用例。
6. 快捷键热更新依赖 Logseq 宿主**内部** API：`unregister_plugin_simple_command`（经 `logseq._execCallableAPIAsync`）。公开 API 没有 unregister，所以保留 try/catch 和「失败就降级为重新加载插件后生效」的行为，不要改成硬依赖。
7. 设置变更必须保留**去抖 + 串行**（见 `src/main.ts` 的 `scheduleShortcutUpdate` / `queueShortcutUpdate`）：Logseq 的字符串设置每敲一个字符都会触发 `onSettingsChanged`，并发处理会重复注册同一个命令。
8. 「英文 token」的符号集合（`src/format-spacing.ts` 的 `TOKEN_BODY_SYMBOLS` / `TOKEN_PREFIX_SYMBOLS` / `OPERATOR_SYMBOLS`）是刻意收窄的启发式：token 必须**含至少一个字母/数字**（或整段都是 `+ - = / & @` 这类运算 / 连接符号），纯标点串（`...`、`!!!`）不算；`,` `.` `:` `!` `?` 这类标点、`#`（标签）、`|`（表格）和 `~` `^` `*`（强调符）不能作为 token 的触发符号。强调符包住**英文**时两侧会补空格（`详见~~NOTE~~说明` → `详见 ~~NOTE~~ 说明`），包住中文时不会（`**加粗**中文` 保持原样）。内联 HTML 标签（含引号没闭合的写法）是受保护片段；单 `$...$` 走「货币 / 正文」启发式（见 `looksLikePlainDollarText`）。改这块前先看 `src/format-spacing.test.ts` 里「符号不会误伤」「受保护片段与英文 token 相邻」「内联 HTML 标签」「相邻的受保护片段」几组用例。

## 测试约定

- 纯逻辑（`format-spacing` / `settings`）直接单测，覆盖边界与幂等。
- `src/main.ts` 用「mock 全局 `logseq`」的方式测试：mock 里按需实现用到的方法，用 `vi.resetModules()` + 动态 `import('./main')` 重载插件（见 `src/main.test.ts`）。
- 断言用户可见行为（消息、注册参数、block 内容），不要断言内部实现细节。
- 新增行为要补用例；修 bug 时要有一条能复现的回归用例。

## CI 与机器人

- `.github/workflows/test.yml`：push 到 main / 所有 PR 跑 `npm ci && npm run build && npm test`。
- `.github/workflows/opencode-review.yaml`：PR 上的自动评审（只评论、不改代码）。**改它之前先看这段**：
  - opencode action 在结束时会把**脏工作区** `git add/commit/push` 到 PR 分支，用的是它自己的 App token——`permissions: contents: read` 拦不住，`permission.bash` 里的 `git commit/push` deny 规则也拦不住（commit 是 action 的代码干的，不走 agent 的 shell）。
  - 因此：权限配置写到全局路径 `~/.config/opencode/opencode.json`，**不要**写进仓库目录（否则它把配置文件本身提交上去）；`use_github_token: true` + `contents: read`，只给 `pull-requests: write` / `issues: write` 用于发评论。
  - 这两条是刻意的，改动 workflow 时请保留。
  - 评审依赖 PR 分支：**PR 合并并删除分支后就无法重跑评审**（`gh run rerun` 会因为取不到分支而失败）。想保留重跑能力，合并时就不要删分支；另外 opencode 服务偶发超时（评论里是 `upstream service timeout` / `UnknownError`），那种评论不是评审结论，不能当作通过。
  - **合并 PR 后不要删除分支**：`gh pr merge` 一律不加 `--delete-branch`，远端和本地分支都留着当备份（也是评审能否重跑的前提）。

## 约定

- Commit message：Conventional Commits，英文（`feat: ...`、`fix(scope): ...`、`ci: ...`）。
- 注释、README、用户可见文案（toast / 设置项 / 命令标签）用中文；标识符、文件名用英文。
- 不提交 `dist/`、`node_modules/`（`.gitignore` 已覆盖）。
- 面向用户的提示信息保持简短、带 `Block Linter:` 前缀，风格与现有实现一致。
