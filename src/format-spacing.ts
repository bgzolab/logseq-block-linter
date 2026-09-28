/**
 * 中英文空格格式化（纯函数，无副作用，方便单测）
 *
 * 规则：
 *  - CJK 字符 + 拉丁字母 / 数字 / `%` → 补一个空格
 *  - 拉丁字母 / 数字 / `%` + CJK 字符 → 补一个空格
 *  - 已有的空格保持不变（不会合并连续空格，函数是幂等的）
 *
 * 受保护的区域（内部文本永远不会被改写）：
 *  - 代码块 ```...```、行内代码 `...`
 *  - 双链 [[...]]、块引用 ((...))
 *  - Markdown 链接 / 图片 [text](url)
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

/** 会被补空格的拉丁字符 */
const LATIN_CHARS = 'A-Za-z0-9%'

/** 标签 `#tag` 中 `#` 之后允许出现的字符 */
const TAG_CHARS = `${LATIN_CHARS.replace('%', '')}_${CJK_CHARS}/-`

/** URL 中允许出现的 ASCII 字符 */
const URL_CHARS = 'A-Za-z0-9\\-._~:/?#\\[\\]@!$&\'()*+,;=%'

/** URL 里的分隔符：中文只有紧跟在这些字符后面时才算 URL 的一部分 */
const URL_SEP_CHARS = '/?&=#'

const CJK_TO_LATIN = new RegExp(`([${CJK_CHARS}])([${LATIN_CHARS}])`, 'g')
const LATIN_TO_CJK = new RegExp(`([${LATIN_CHARS}])([${CJK_CHARS}])`, 'g')

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

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    let matched: Token | null = null

    for (const rule of RULES) {
      rule.pattern.lastIndex = i
      const m = rule.pattern.exec(input)
      if (!m || m[0].length === 0) continue

      // 含中文的行内 $...$ 更可能是货币符号或正文（`花费$100，后来$50`），
      // 别当公式吞掉；`$$...$$` 是显示公式，含中文也照常保护
      if (rule.kind === 'math' && !m[0].startsWith('$$') && HAS_CJK.test(m[0])) continue

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

/** 只做「中英文之间补空格」，不碰其他任何字符 */
function spacify(text: string): string {
  return text.replace(CJK_TO_LATIN, '$1 $2').replace(LATIN_TO_CJK, '$1 $2')
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

    // 上一个受保护片段是“英文单词”时，它和后面的中文之间也要补空格
    if (prevWordLike && STARTS_WITH_CJK.test(segment)) out += ' '

    out += spacify(segment)

    // 中文和“英文单词”之间补空格
    if (WORD_LIKE.has(token.kind) && ENDS_WITH_CJK.test(out)) out += ' '

    out += token.text
    prevWordLike = WORD_LIKE.has(token.kind)
    pos = token.end
  }

  const tail = input.slice(pos)
  if (prevWordLike && STARTS_WITH_CJK.test(tail)) out += ' '
  out += spacify(tail)

  return out
}
