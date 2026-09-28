# Logseq Block Linter

[![Contributors](https://img.shields.io/github/contributors/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/graphs/contributors)
[![Stargazers](https://img.shields.io/github/stars/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/stargazers)
[![Issues](https://img.shields.io/github/issues/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/issues)
[![Licence](https://img.shields.io/github/license/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/blob/main/LICENCE)

给 Logseq 的中英文混排补空格的小插件：把「中文和英文/数字之间」插一个空格，避免手动敲空格。

```
使用API获取v2版本的数据  →  使用 API 获取 v2 版本的数据
使用Node.js开发           →  使用 Node.js 开发
主键(id)与价格$100        →  主键 (id) 与价格 $100
运行`npm test`命令        →  运行 `npm test` 命令
参考[[Logseq插件]]使用    →  参考 [[Logseq插件]] 使用
```

## 功能

- **补空格**：中文与「英文 token」之间补一个空格。
  - 英文 token = 一段连续的半角串：`API`、`v2`、`Node.js`、`C++`、`x86_64`、`README.md`、`(id)`、`$100`、`-5`……
  - 也就是字母 / 数字之外，**半角符号也会参与**：`C++版本` → `C++ 版本`、`使用Node.js开发` → `使用 Node.js 开发`、`主键(id)` → `主键 (id)`
- **不改动其他内容**：已有的空格、标点、多余的连续空格都保持原样（可以反复执行，结果幂等）
  - 纯符号串（`...`、`--`、`**`、`~~`）和连接符（`/`、`&`、`#`、`,`、`.`、`:`、`!`、`?`）不会触发补空格：`读/写`、`中文,English`、`中文.内容`、`**加粗**`、`中文#话题` 都保持原样
- **保护语法片段**，不会破坏 block 里的 Logseq / Markdown 语法：
  - 代码块 ` ``` `、行内代码 `` ` ``
  - 双链 `[[页面]]`、块引用 `((uuid))`
  - Markdown 链接 `[文字](url)`、内联 HTML 标签（`<u>下划线</u>`、`<div title="中文说明">`）、裸 URL（含中文路径，如 `https://zh.wikipedia.org/wiki/中文`）
  - 行内公式 `$...$`
  - 标签 `#标签`、行首属性名 `key::`
- **三种触发方式**：快捷键（默认 Windows/Linux `Ctrl+S`、macOS `Cmd+S`）、斜杠命令、右键 block 小圆点
- **可配置**：插件设置页面里可以改快捷键、关掉快捷键
- 支持多选多个 block 批量格式化

## 使用

| 方式 | 操作 |
| --- | --- |
| 快捷键 | 在编辑或选中 block 时按 `Ctrl+S`（macOS 上是 `Cmd+S`） |
| 斜杠命令 | 在 block 中输入 `/格式化中英文空格` |
| 右键菜单 | 右键 block 前面的小圆点 → `格式化中英文空格` |
| 命令面板 | 命令面板（默认 `mod+shift+p`）里搜索「格式化中英文空格」 |

## 设置

`Logseq 设置 → 插件（Plugins）→ Block Linter` 打开插件设置页面：

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| 启用快捷键 | 开 | 关掉后只能用斜杠命令 / 右键菜单 / 命令面板触发 |
| 快捷键 | `mod+s` | `mod` 按平台解析：Windows / Linux = `Ctrl`，macOS = `Cmd` |

`mod+s` 就是 Windows/Linux 的 `Ctrl+S`、macOS 的 `Cmd+S`。也可以填 `ctrl+alt+s`、
`mod+shift+s`、`meta+enter` 这类组合键（用 `+` 连接，只支持单步组合，不支持 `g d` 这种连按），
**改完立即生效**，不需要重载插件；填了无法识别的写法会回退到默认快捷键并弹提示。

> 出于安全考虑，快捷键必须带 `⌘` / `Ctrl` / `Alt` 这类修饰键（或单独使用 `f1`~`f12`）。
> 像 `space`、`enter`、`s`、`shift+s`（就是输入大写 `S`）这种会被拒绝——插件以 `global` 模式注册，单键会在你打字时劫持输入。

## 安装

### 从源码加载（开发者模式）

```shell
git clone git@github.com:bgzolab/logseq-block-linter.git
cd logseq-block-linter
npm install
npm run build
```

1. Logseq 中打开 `Settings → Features → Developer mode`
2. 打开插件面板，点击 `Load unpacked plugin`，选择**本项目根目录**，或者选择 `dist` 目录
   （构建时会自动往 `dist/` 生成一份 `package.json`，所以两个目录都能加载）
3. 插件入口是 `main` 字段，必须**先构建**才会有 `dist/index.html`

> 报 `Illegal Logseq plugin package` 通常是因为所选的文件夹里没有 `package.json`
> （例如选了一个还没构建过的 `dist/`）。`npm run build` 之后重新加载即可。

## 开发

```shell
npm run dev     # vite build --watch，改完代码重新加载插件即可
npm run build   # tsc 类型检查 + vite 构建到 dist/
npm test        # vitest 单测（格式化规则 + 插件注册逻辑）
```

目录结构：

```
src/
  format-spacing.ts        # 纯函数：中英文补空格（含语法片段保护）
  format-spacing.test.ts   # 格式化规则单测
  settings.ts              # 插件设置 schema + 快捷键解析/校验
  settings.test.ts         # 设置解析单测
  main.ts                  # 插件入口：设置页面 / 快捷键（含热更新）/ 斜杠命令 / 右键菜单
  main.test.ts             # 插件逻辑单测（mock logseq API）
index.html                 # vite 入口
vite.config.ts             # base: './'（Logseq 以 file:// 加载插件）+ 往 dist 写 package.json
```

> 快捷键热更新用到 Logseq 宿主内部的 `unregister_plugin_simple_command`（公开 API 里没有
> unregister），调用失败时会自动降级成「重新加载插件后生效」。

## 已知限制

- 只格式化**整个 block**，不支持只格式化光标选中的一段文字
- 只处理当前 block / 选中的 blocks，不会递归处理子 block
- 中文标点和英文之间不补空格（`你好,hello` 保持原样）；`读/写`、`第一~五章` 这类「符号连接中文」也不会被拆开
- `#标签` 和代码块内部完全不动，避免破坏标签名和代码
- 内联 HTML 标签只保证**标签本身**不被改写；标签与正文之间的空格落在标签元素内部（例如 `<u>下划线</u>` → `<u> 下划线 </u>`，渲染时下划线会覆盖空格），介意的话可以手动保留两侧空格
- 两个受保护片段紧邻时不补空格（`中文`a``b`中文`、`[[a]][[b]]` 保持原样）
- 行内 `$...$` 的「货币 / 公式」判定是启发式的：含中文、中文标点或 `,` 且不含 `\` 的被当成正文，其余当公式。极端写法（比如公式里出现 `,`）仍可能被判成正文
- Markdown 链接的 URL 里如果含 `)`（如 `https://en.wikipedia.org/wiki/Foo_(bar)`），只会匹配到第一个 `)`，链接后面的中文不会补空格（需要更完整的链接解析，尚未实现）

## Contributing

欢迎提 issue 和 PR。

## License

All code is licensed under the AGPL-3.0 license. See `LICENCE` for more information.
