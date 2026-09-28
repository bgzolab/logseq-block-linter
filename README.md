# Logseq Block Linter

[![Contributors](https://img.shields.io/github/contributors/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/graphs/contributors)
[![Stargazers](https://img.shields.io/github/stars/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/stargazers)
[![Issues](https://img.shields.io/github/issues/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/issues)
[![Licence](https://img.shields.io/github/license/bgzolab/logseq-block-linter.svg?style=for-the-badge)](https://github.com/bgzolab/logseq-block-linter/blob/main/LICENCE)

给 Logseq 的中英文混排补空格的小插件：把「中文和英文/数字之间」插一个空格，避免手动敲空格。

```
使用API获取v2版本的数据  →  使用 API 获取 v2 版本的数据
运行`npm run test`命令    →  运行 `npm run test` 命令
参考[[Logseq插件]]使用    →  参考 [[Logseq插件]] 使用
```

## 功能

- **补空格**：CJK（中文 / 日文假名 / 韩文）与拉丁字母、数字、`%` 之间补一个空格
- **不改动其他内容**：已有的空格、标点、多余的连续空格都保持原样（可以反复执行，结果幂等）
- **保护语法片段**，不会破坏 block 里的 Logseq / Markdown 语法：
  - 代码块 ` ``` `、行内代码 `` ` ``
  - 双链 `[[页面]]`、块引用 `((uuid))`
  - Markdown 链接 `[文字](url)`、裸 URL（含中文路径，如 `https://zh.wikipedia.org/wiki/中文`）
  - 行内公式 `$...$`
  - 标签 `#标签`、行首属性名 `key::`
- **三种触发方式**：快捷键 `Ctrl+S`、斜杠命令、右键 block 小圆点
- 支持多选多个 block 批量格式化

## 使用

| 方式 | 操作 |
| --- | --- |
| 快捷键 | 在编辑或选中 block 时按 `Ctrl+S`（macOS 上也是 `Ctrl`，不是 `Cmd`） |
| 斜杠命令 | 在 block 中输入 `/格式化中英文空格` |
| 右键菜单 | 右键 block 前面的小圆点 → `格式化中英文空格` |
| 命令面板 | `Ctrl+K` 搜索「格式化中英文空格」 |

> 想把快捷键改成 `Cmd+S` / `Ctrl+Shift+S`，修改 `src/main.ts` 里的 `keybinding.binding`
> （`mod+s` 在 macOS 上是 `Cmd+S`、其他平台是 `Ctrl+S`），重新构建即可。

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
  main.ts                  # 插件入口：注册快捷键 / 斜杠命令 / 右键菜单
  main.test.ts             # 插件逻辑单测（mock logseq API）
index.html                 # vite 入口
vite.config.ts             # base: './'（Logseq 以 file:// 加载插件）
```

## 已知限制

- 只格式化**整个 block**，不支持只格式化光标选中的一段文字
- 只处理当前 block / 选中的 blocks，不会递归处理子 block
- 中文标点和英文之间不补空格（`你好,hello` 保持原样）
- `#标签` 和代码块内部完全不动，避免破坏标签名和代码

## Contributing

欢迎提 issue 和 PR。

## License

All code is licensed under the AGPL-3.0 license. See `LICENCE` for more information.
