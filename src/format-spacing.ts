/**
 * 中英文空格格式化（纯函数，无副作用，方便单测）
 *
 * 规则：
 *  - 中文与「英文 token」之间补一个空格
 *    - token = 连续的半角串（字母、数字、`+ - . _ / = ~` 等符号），以字母/数字或
 *      `(` `[` `{` `$` `+` `-` 这类前缀符号开头，且至少含一个字母/数字
 *    - 例：`使用API` → `使用 API`、`C++版本` → `C++ 版本`、`使用Node.js开发` → `使用 Node.js 开发`、
 *      `主键(id)` → `主键 (id)`、`价格$100` → `价格 $100`
 *  - 已有空格保持不变（不会合并连续空格，函数是幂等的）
 *  - 纯符号（`--`、`...`、`**`、`~~`）和 `/` `&` `#` 这类连接符不会触发补空格，
 *    所以 `读/写`、`中文,English`、`中文.内容`、`**加粗**`、`#标签` 都保持原样
 *
 * 受保护的区域（内部文本永远不会被改写）：
 *  - 代码块 ```...```、行内代码 `...`
 *  - 双链 [[...]]、块引用 ((...))
 *  - Markdown 链接 / 图片 [text](url)、内联 HTML 标签 <u> / <div title="...">
 *  - 裸 URL（http/https）
 *  - 公式 `$$...$$` / `$...$`（行内公式里含中文时不视为公式，避免把货币符号配成对）
 *  - 标签 #tag
 *  - 行首属性 key::
 *
 * 行内代码 / 双链 / 块引用 / 链接 / URL / 公式在紧挨着中文时会被当成一个
 * “英文单词”参与补空格，例如 `参考[[页面]]` → `参考 [[页面]]`；
 * 而标签和属性名是不透明的，既不算中文也不算英文，避免破坏语法。
 */

/** CJK 字符：汉字（含扩展 A、兼容区）、日文假名、韩文、々、〇 */
const CJK_CHARS =
  '\\u3005\\u3007\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af\\uf900-\\ufaff'

/** 单词字符：字母和数字 */
const WORD_CHARS = 'A-Za-z0-9'

/**
 * 「英文 token」里允许出现的半角符号。
 *
 * 逗号、句号、冒号、问号这些中文里也常用的标点放在这里，是因为它们
 * 可以出现在 token 中间 / 结尾（`Node.js`、`C++`、`100%`、`README.md`），
 * 但不能作为 token 开头——所以 `中文,English`、`中文.内容` 不会被误加空格。
 */
const TOKEN_BODY_SYMBOLS = '\\-_.+/=~^|&@$#%*<>(){}\\[\\]!?;:,\'"'

/**
 * 可以作为 token 开头的半角符号：中文紧跟「符号 + 英文」时也补空格，
 * 例如 `主键(id)`、`价格$100`、`温度-5度`。
 *
 * 故意不含 `/`、`&`、`#` 这类连接符：`读/写`、`中文#话题`、`A&B` 不应该被拆开。
 */
const TOKEN_PREFIX_SYMBOLS = '([{<>=+\\-*_^~$@'

/** 「英文 token」允许出现的任意字符 */
const TOKEN_CHAR = new RegExp(`[${WORD_CHARS}${TOKEN_BODY_SYMBOLS}]`)
/** 「英文 token」允许的开头字符 */
const TOKEN_START = new RegExp(`[${WORD_CHARS}${TOKEN_PREFIX_SYMBOLS}]`)
const HAS_WORD_CHAR = new RegExp(`[${WORD_CHARS}]`)

/** 标签 `#tag` 中 `#` 之后允许出现的字符 */
const TAG_CHARS = `${WORD_CHARS}_${CJK_CHARS}/-`

/** URL 中允许出现的 ASCII 字符 */
const URL_CHARS = 'A-Za-z0-9\\-._~:/?#\\[\\]@!$&\'()*+,;=%'

/** URL 里的分隔符：中文只有紧跟在这些字符后面时才算 URL 的一部分 */
const URL_SEP_CHARS = '/?&=#'

/** 单 `$...$` 里出现这些标点时，更像货币 / 正文而不是公式（`花费$5，$10`） */
const MATH_TEXT_PUNCTUATION = /[，。；：！？、,]/

const HAS_CJK = new RegExp(`[${CJK_CHARS}]`)
const ENDS_WITH_CJK = new RegExp(`[${CJK_CHARS}]$`)
const STARTS_WITH_CJK = new RegExp(`^[${CJK_CHARS}]`)

const IS_URL_CHAR = new RegExp(`[${URL_CHARS}]`)
const IS_URL_SEP_CHAR = new RegExp(`[${URL_SEP_CHARS}]`)

type TokenKind =
  | 'code-block'
  | 'inline-code'
  | 'wiki-link'
  | 'block-ref'
  | 'md-link'
  | 'html-tag'
  | 'url'
  | 'math'
  | 'tag'
  | 'property'

/** 这些片段被视作一个“英文单词”，和中文相邻时会补空格 */
const WORD_LIKE = new Set<TokenKind>([
  'inline-code',
  'wiki-link',
  'block-ref',
  'md-link',
  'html-tag',
  'url',
  'math',
])

type Token = {
  kind: TokenKind
  text: string
  start: number
  end: number
}

/**
 * 按优先级匹配受保护的片段。全部使用 sticky 正则，必须从当前位置开始匹配。
 * 顺序很重要：代码块要在行内代码之前，双链要在 Markdown 链接之前。
 */
const RULES: ReadonlyArray<{ kind: TokenKind; pattern: RegExp }> = [
  { kind: 'code-block', pattern: /```[\s\S]*?```/y },
  { kind: 'inline-code', pattern: /`[^`\n]*`/y },
  { kind: 'wiki-link', pattern: /\[\[[^\]\n]*\]\]/y },
  { kind: 'block-ref', pattern: /\(\([^)\n]*\)\)/y },
  { kind: 'md-link', pattern: /!?\[[^\]\n]*\]\([^)\n]*\)/y },
  {
    kind: 'html-tag',
    // 内联 HTML 标签（Logseq 会渲染）：`<u>`、`<br/>`、`<div title="中文">`。
    // 标签名后必须是 `>` / `/` / 空白 + 属性名；属性值按引号成对解析，
    // 所以 `<span title="a>b">` 不会被第一个 `>` 截断
    pattern: /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:](?:"[^"\n]*"|'[^'\n]*'|[^>"\n])*)?\/?>/y,
  },
  {
    kind: 'url',
    // 先匹配纯 ASCII 的 URL，再通过 extendUrlToken 把 /wiki/中文 这类中文路径吞进来
    pattern: new RegExp(`https?://[${URL_CHARS}]+`, 'y'),
  },
  { kind: 'math', pattern: /\$\$[^$]*\$\$|\$[^$\n]+\$/y },
  {
    kind: 'tag',
    // 行首或空白之后的 `#xxx`
    pattern: new RegExp(`(?<=^|\\s)#[${TAG_CHARS}]+`, 'y'),
  },
  {
    kind: 'property',
    // 行首的 `key::`
    pattern: /(?<=^|\n)[^\s:]+::/y,
  },
]

/**
 * 把 URL 里的中文部分也吞进来：`https://zh.wikipedia.org/wiki/中文` 整个都算 URL。
 * 中文只有紧跟在 URL 分隔符后面才会被当成 URL 的一部分，
 * 这样 `https://example.com说明` 里的 `说明` 仍然会被当作正文补空格。
 */
function extendUrlToken(input: string, end: number): number {
  let i = end

  while (i < input.length) {
    const ch = input[i]

    if (IS_URL_CHAR.test(ch)) {
      i += 1
      continue
    }

    if (HAS_CJK.test(ch) && IS_URL_SEP_CHAR.test(input[i - 1] ?? '')) {
      while (i < input.length && HAS_CJK.test(input[i])) i += 1
      continue
    }

    break
  }

  return i
}

/** 单 `$...$` 更像货币 / 正文而不是公式的情况 */
function looksLikePlainDollarText(candidate: string): boolean {
  if (candidate.startsWith('$$')) return false // 显示公式始终保护
  if (candidate.includes('\\')) return false // `$\text{中文}$` 这类 TeX 命令

  return HAS_CJK.test(candidate) || MATH_TEXT_PUNCTUATION.test(candidate)
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    let matched: Token | null = null

    for (const rule of RULES) {
      rule.pattern.lastIndex = i
      const m = rule.pattern.exec(input)
      if (!m || m[0].length === 0) continue

      // 单 $ 之间夹着中文或中文标点时（`花费$100，后来$50`），更像货币 / 正文，
      // 不当公式吞掉；含 `\` 的（如 `$\text{中文}$`）是明确的 TeX 公式，照常保护
      if (rule.kind === 'math' && looksLikePlainDollarText(m[0])) continue

      const end =
        rule.kind === 'url' ? extendUrlToken(input, i + m[0].length) : i + m[0].length
      matched = { kind: rule.kind, text: input.slice(i, end), start: i, end }
      break
    }

    if (matched) {
      tokens.push(matched)
      i = matched.end
    } else {
      i += 1
    }
  }

  return tokens
}

/** 一段半角串是否算「英文 token」：以字母/数字（或 `(` `$` `+` 这类前缀符号）开头，且至少含一个字母/数字 */
function isLatinToken(run: string): boolean {
  const first = run[0]
  return first !== undefined && TOKEN_START.test(first) && HAS_WORD_CHAR.test(run)
}

/**
 * 这段文本开头是不是「英文 token」（字母/数字或前缀符号开头，且含字母/数字）。
 *
 * `(备注)` 这种括号里全是中文的不算，避免 `中文`x`(备注)` 被补出多余空格。
 */
function startsWithLatinToken(text: string): boolean {
  let i = 0
  while (i < text.length && TOKEN_CHAR.test(text[i] as string)) i += 1
  return isLatinToken(text.slice(0, i))
}

/** 受保护片段后面是否要紧跟中文或英文 token（决定要不要补空格） */
function startsWithCjkOrToken(text: string): boolean {
  return STARTS_WITH_CJK.test(text) || startsWithLatinToken(text)
}

/**
 * 在中文和「英文 token」之间补空格，不碰其他任何字符。
 *
 * 「英文 token」= 一段连续的半角串，以字母/数字（或前缀符号）开头、至少含一个字母/数字：
 * `Node.js`、`C++`、`README.md`、`(id)`、`$100`、`x86_64`……
 *
 * 纯符号（`--`、`...`、`**`、`~~`）不算 token，所以中文标点、Markdown 强调符、
 * 以及 `读/写` 这种「斜杠连接」都不会被拆开。函数是幂等的。
 */
function spacify(text: string): string {
  let out = ''
  let i = 0

  while (i < text.length) {
    const char = text[i] as string

    if (!TOKEN_CHAR.test(char)) {
      out += char
      i += 1
      continue
    }

    const start = i
    while (i < text.length && TOKEN_CHAR.test(text[i] as string)) i += 1

    const run = text.slice(start, i)

    if (!isLatinToken(run)) {
      out += run
      continue
    }

    // 中文和英文 token 之间补空格
    if (ENDS_WITH_CJK.test(out)) out += ' '

    out += run

    const next = text[i]
    if (next !== undefined && HAS_CJK.test(next)) out += ' '
  }

  return out
}

/**
 * 格式化一段 block 内容。
 *
 * @example
 * formatSpacing('使用API获取数据')  // => '使用 API 获取数据'
 * formatSpacing('运行`npm test`命令') // => '运行 `npm test` 命令'
 */
export function formatSpacing(input: string): string {
  if (!input || !HAS_CJK.test(input)) return input

  const tokens = tokenize(input)
  if (tokens.length === 0) return spacify(input)

  let out = ''
  let pos = 0
  let prevWordLike = false

  for (const token of tokens) {
    const segment = input.slice(pos, token.start)

    // 上一个受保护片段是“英文单词”时，它和后面的中文 / 英文 token 之间也要补空格
    if (prevWordLike && startsWithCjkOrToken(segment)) out += ' '

    out += spacify(segment)

    // 中文和“英文单词”之间补空格
    if (WORD_LIKE.has(token.kind) && ENDS_WITH_CJK.test(out)) out += ' '

    out += token.text
    prevWordLike = WORD_LIKE.has(token.kind)
    pos = token.end
  }

  const tail = input.slice(pos)
  if (prevWordLike && startsWithCjkOrToken(tail)) out += ' '
  out += spacify(tail)

  return out
}
