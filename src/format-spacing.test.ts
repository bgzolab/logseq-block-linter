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

describe('formatSpacing: 中文与英文符号之间', () => {
  it('英文 token 以符号结尾（. + _ # %）', () => {
    expect(formatSpacing('使用Node.js开发')).toBe('使用 Node.js 开发')
    expect(formatSpacing('C++版本')).toBe('C++ 版本')
    expect(formatSpacing('x86_64架构')).toBe('x86_64 架构')
    expect(formatSpacing('C#语言')).toBe('C# 语言')
    expect(formatSpacing('完成度100%啦')).toBe('完成度 100% 啦')
  })

  it('英文 token 以符号开头（( [ $ - +）', () => {
    expect(formatSpacing('主键(id)')).toBe('主键 (id)')
    expect(formatSpacing('见[1]说明')).toBe('见 [1] 说明')
    expect(formatSpacing('价格$100')).toBe('价格 $100')
    expect(formatSpacing('温度-5度')).toBe('温度 -5 度')
    expect(formatSpacing('选项+A参数')).toBe('选项 +A 参数')
  })

  it('括号里的英文两侧都补', () => {
    expect(formatSpacing('中文(English)混排')).toBe('中文 (English) 混排')
  })

  it('符号两侧已有空格时不重复补', () => {
    expect(formatSpacing('使用 Node.js 开发')).toBe('使用 Node.js 开发')
    expect(formatSpacing('主键 (id)')).toBe('主键 (id)')
  })

  it('= / @ / _ 前缀', () => {
    expect(formatSpacing('结果=value值')).toBe('结果 =value 值')
    expect(formatSpacing('联系@someone吧')).toBe('联系 @someone 吧')
    expect(formatSpacing('中文__bold__中文')).toBe('中文 __bold__ 中文')
  })

  it('运算 / 连接符号单独出现在中文之间时补空格', () => {
    expect(formatSpacing('焖面+烙饼+炒鸡蛋')).toBe('焖面 + 烙饼 + 炒鸡蛋')
    expect(formatSpacing('读/写')).toBe('读 / 写')
    expect(formatSpacing('中文-中文')).toBe('中文 - 中文')
    expect(formatSpacing('中文--中文')).toBe('中文 -- 中文')
    expect(formatSpacing('结果=答案')).toBe('结果 = 答案')
    expect(formatSpacing('烟&酒')).toBe('烟 & 酒')
    expect(formatSpacing('左|右')).toBe('左 | 右')
    expect(formatSpacing('小明@小红')).toBe('小明 @ 小红')
  })
})

describe('formatSpacing: 受保护片段与英文 token 相邻', () => {
  it('片段两侧的 token 都会补空格（对称）', () => {
    expect(formatSpacing('运行`cmd`$100脚本')).toBe('运行 `cmd` $100 脚本')
    expect(formatSpacing('中文`x`$100中文')).toBe('中文 `x` $100 中文')
    expect(formatSpacing('中文[[Link]]English')).toBe('中文 [[Link]] English')
  })

  it('括号里全是中文时不当成 token', () => {
    expect(formatSpacing('中文`x`(备注)')).toBe('中文 `x`(备注)')
  })
})

describe('formatSpacing: 内联 HTML 标签', () => {
  it('标签内部（含属性值）永不改写', () => {
    expect(formatSpacing('<div title="中文说明">内容</div>')).toBe('<div title="中文说明"> 内容 </div>')
    expect(formatSpacing('见<a href="https://example.com">链接</a>说明')).toBe(
      '见 <a href="https://example.com"> 链接 </a> 说明'
    )
  })

  it('标签与文字之间补空格，标签外不受影响', () => {
    expect(formatSpacing('看<u>下划线</u>文字')).toBe('看 <u> 下划线 </u> 文字')
    expect(formatSpacing('中文<strong>加粗</strong>结束')).toBe('中文 <strong> 加粗 </strong> 结束')
    expect(formatSpacing('第一行<br>第二行')).toBe('第一行 <br> 第二行')
  })

  it('比较表达式不会被当成标签', () => {
    expect(formatSpacing('若a<b且c>d')).toBe('若 a<b 且 c>d')
  })

  it('属性值里的 > 不会截断标签', () => {
    expect(formatSpacing('<span title="a>b">中文</span>')).toBe('<span title="a>b"> 中文 </span>')
    expect(formatSpacing("<span title='a>b'>中文</span>")).toBe("<span title='a>b'> 中文 </span>")
  })
})

describe('formatSpacing: 相邻的受保护片段', () => {
  it('紧邻的片段之间不补空格（和 [[a]][[b]] 保持一致）', () => {
    expect(formatSpacing('中文`a``b`中文')).toBe('中文 `a``b` 中文')
    expect(formatSpacing('嵌套<b>加粗<i>斜体</i></b>文字')).toBe(
      '嵌套 <b> 加粗 <i> 斜体 </i></b> 文字'
    )
  })
})

describe('formatSpacing: 符号不会误伤（保持原样）', () => {
  it('中文里常用的半角标点 / 省略号 / 感叹号', () => {
    for (const input of ['中文,English', '中文.内容', '他说...然后', '说明:内容', '中文!!!', '(中文)']) {
      expect(formatSpacing(input), input).toBe(input)
    }
  })

  it('斜杠连接英文、范围符号不动', () => {
    for (const input of ['中文/English混排', '第一~五章']) {
      expect(formatSpacing(input), input).toBe(input)
    }
  })

  it('Markdown / Logseq 强调符与标签', () => {
    for (const input of ['**加粗**中文', '*斜体*文字', '~~删除~~中文', '^^高亮^^中文', '中文#话题']) {
      expect(formatSpacing(input), input).toBe(input)
    }
  })

  it('强调符里包英文时两侧会补空格（这是有意的）', () => {
    expect(formatSpacing('详见~~NOTE~~说明')).toBe('详见 ~~NOTE~~ 说明')
    expect(formatSpacing('中文**bold**中文')).toBe('中文 **bold** 中文')
    expect(formatSpacing('中文^^hl^^中文')).toBe('中文 ^^hl^^ 中文')
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

  it('显示公式 $$...$$ 内部不改写（含中文也是）', () => {
    expect(formatSpacing('$$若x>0则y=f(x)成立$$')).toBe('$$若x>0则y=f(x)成立$$')
    expect(formatSpacing('$$\\text{其中}x为正整数$$')).toBe('$$\\text{其中}x为正整数$$')
    expect(formatSpacing('公式$$\\text{其中}x为正整数$$成立')).toBe(
      '公式 $$\\text{其中}x为正整数$$ 成立'
    )
  })

  it('货币符号不会被配成公式，但会按英文 token 补空格', () => {
    expect(formatSpacing('花费$100，后来$50买了个新的')).toBe('花费 $100，后来 $50 买了个新的')
    expect(formatSpacing('价格是$5到$10之间')).toBe('价格是 $5 到 $10 之间')
  })

  it('被标点隔开的相邻货币不会被配成公式', () => {
    expect(formatSpacing('花费$5，$10和更多')).toBe('花费 $5，$10 和更多')
    expect(formatSpacing('花费$5,$10和更多')).toBe('花费 $5,$10 和更多')
  })

  it('TeX 公式（含中文）照常保护', () => {
    expect(formatSpacing('公式$\\text{中文是一个隐藏的公式}$结束')).toBe(
      '公式 $\\text{中文是一个隐藏的公式}$ 结束'
    )
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
      '使用Node.js开发',
      '中文(English)混排',
      '读/写与中文,English',
      '**加粗**中文',
      '看<u>下划线</u>文字',
      '<div title="中文说明">内容</div>',
      '<span title="a>b">中文</span>',
      '运行`cmd`$100脚本',
      '焖面+烙饼+炒鸡蛋',
      '读/写',
      '花费$5，$10和更多',
      '公式$\\text{中文}$结束',
      '中文`a``b`中文',
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
