import { describe, expect, it } from 'vitest'

import { formatSpacing } from './format-spacing'

describe('formatSpacing: 中英文之间补空格', () => {
  it('中 + 英', () => {
    expect(formatSpacing('这是一个test')).toBe('这是一个 test')
  })

  it('英 + 中', () => {
    expect(formatSpacing('test这是一个例子')).toBe('test 这是一个例子')
  })

  it('中 + 数字', () => {
    expect(formatSpacing('第2章')).toBe('第 2 章')
  })

  it('多段混合', () => {
    expect(formatSpacing('使用API获取v2版本的数据')).toBe('使用 API 获取 v2 版本的数据')
  })

  it('百分号', () => {
    expect(formatSpacing('完成度100%啦')).toBe('完成度 100% 啦')
  })

  it('日文假名', () => {
    expect(formatSpacing('これはtestです')).toBe('これは test です')
  })
})

describe('formatSpacing: 不该动的地方', () => {
  it('已有的空格保持不变（不合并连续空格）', () => {
    expect(formatSpacing('这是  test')).toBe('这是  test')
  })

  it('幂等', () => {
    const input = '使用 API 获取 v2 版本的数据'
    expect(formatSpacing(input)).toBe(input)
    expect(formatSpacing(formatSpacing(input))).toBe(input)
  })

  it('纯英文 / 纯中文 / 空串', () => {
    expect(formatSpacing('hello world')).toBe('hello world')
    expect(formatSpacing('中文内容')).toBe('中文内容')
    expect(formatSpacing('')).toBe('')
  })

  it('中文标点不参与补空格', () => {
    expect(formatSpacing('你好,hello')).toBe('你好,hello')
    expect(formatSpacing('好的。hello')).toBe('好的。hello')
  })

  it('标签不被拆开', () => {
    expect(formatSpacing('这是 #标签 和 #tag')).toBe('这是 #标签 和 #tag')
  })

  it('URL 内部不被改写', () => {
    expect(formatSpacing('https://example.com/中文路径')).toBe('https://example.com/中文路径')
    expect(formatSpacing('https://example.com/a?q=中文&x=1')).toBe('https://example.com/a?q=中文&x=1')
  })
})

describe('formatSpacing: 受保护的语法片段', () => {
  it('行内代码：和中文相邻时补空格，内部不改写', () => {
    expect(formatSpacing('运行`npm run test`命令')).toBe('运行 `npm run test` 命令')
    expect(formatSpacing('执行`git commit`吧')).toBe('执行 `git commit` 吧')
  })

  it('代码块内部不改写', () => {
    const input = '说明\n```js\nconst a = "中文abc"\n```\n结束'
    expect(formatSpacing(input)).toBe(input)
  })

  it('双链：边界补空格，链接名不改写', () => {
    expect(formatSpacing('参考[[Logseq插件]]使用')).toBe('参考 [[Logseq插件]] 使用')
  })

  it('块引用：边界补空格', () => {
    expect(formatSpacing('见((1234-5678))说明')).toBe('见 ((1234-5678)) 说明')
  })

  it('Markdown 链接：边界补空格，链接内容不改写', () => {
    expect(formatSpacing('查看[官方文档](https://docs.example.com/中文)吧')).toBe(
      '查看 [官方文档](https://docs.example.com/中文) 吧'
    )
  })

  it('裸 URL：边界补空格', () => {
    expect(formatSpacing('参考https://github.com/logseq/logseq文档')).toBe(
      '参考 https://github.com/logseq/logseq 文档'
    )
  })

  it('行内公式：边界补空格，公式内部不改写', () => {
    expect(formatSpacing('公式$x_1 + y_1$计算')).toBe('公式 $x_1 + y_1$ 计算')
  })

  it('货币符号不会被配成公式', () => {
    expect(formatSpacing('花费$100，后来$50买了个新的')).toBe('花费$100，后来$50 买了个新的')
    expect(formatSpacing('价格是$5到$10之间')).toBe('价格是$5 到$10 之间')
  })

  it('受保护片段的输出是幂等的', () => {
    const inputs = [
      '参考[[Logseq插件]]使用',
      '运行`npm run test`命令',
      '见((1234-5678))说明',
      '查看[官方文档](https://docs.example.com/中文)吧',
      '访问https://example.com/中文路径试试',
      '公式$x_1 + y_1$计算',
      'title:: 中文English',
      '这是 #标签 和 #tag',
    ]

    for (const input of inputs) {
      const once = formatSpacing(input)
      expect(formatSpacing(once), input).toBe(once)
    }
  })

  it('行首属性名不改写，属性值正常格式化', () => {
    expect(formatSpacing('title:: 中文English')).toBe('title:: 中文 English')
    expect(formatSpacing('作者:: 张三ZhangSan')).toBe('作者:: 张三 ZhangSan')
  })
})
