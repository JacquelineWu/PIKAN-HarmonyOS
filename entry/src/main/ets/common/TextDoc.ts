/** common/TextDoc.ts —— 第三十七轮：纯文本 / 源码文件预览的**纯函数真值源**。
 *
 * 设计约束（与 DirName.ts / ResumePlan.ts 同一口径）：
 *  · 零 SDK 依赖、零文件 IO、零 await、零 throw、零全局可变状态；
 *  · 所有输入都是 string / number / Uint8Array / Array，输出可预测，可直接被
 *    tests/dirname.test.mjs 用 `node --experimental-strip-types` 加载回归；
 *  · 绝不修改文件，也绝不修改传给它的原始字节 —— 「保留原始内容」由
 *    「解码后只做行切分 + 行内 token 切分，且 token 文本拼回去 === 原行」保证。
 *
 * 覆盖：
 *  · 文件类型自动识别（后缀白名单 + 无后缀乐观判定）；
 *  · 语言映射：C / C-like、Python、ASM、Verilog，以及未命中高亮规则的纯文本；
 *  · 编码兼容：UTF-8 / UTF-16LE / UTF-16BE BOM、UTF-8 合法性校验、
 *    GB18030 / Big5 / Windows-1252 回退候选、NUL / 控制字符二进位嗅探；
 *  · 行处理：CRLF / CR / LF 统一切成行、行尾不丢内容、Tab 按制表位展开（仅显示层）、
 *    行号宽度、大文件字节 / 行数上限；
 *  · 语法高亮：逐行 tokenizer（携多行注释状态），输出等宽 Span 可直接消费的 token 列表。
 */

// --------------------------------------------------------------------
// 一、文件类型 / 语言
// --------------------------------------------------------------------

/** 非文本文件（不进文本预览，左栏仍是「不支持预览」灰行）。 */
export const LANG_NONE: number = -1;
/** 纯文本（.log / .txt / .md / .json …）：不做语法着色，完整原样展示。 */
export const LANG_PLAIN: number = 0;
/** C 家族：C/C++/ObjC/Java/JS/TS/Go/Rust/C#/Kotlin/Swift/PHP/Ruby/Shell/SQL 共用一套 C-like 规则。 */
export const LANG_C: number = 1;
export const LANG_PYTHON: number = 2;
export const LANG_ASM: number = 3;
export const LANG_VERILOG: number = 4;

/** 不做高亮、但完整按文本展示的常见后缀。 */
export const TEXT_SUFFIX_PLAIN: Array<string> = [
  '.txt', '.text', '.log', '.md', '.markdown', '.rst', '.csv', '.tsv',
  '.json', '.jsonc', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.conf', '.properties', '.env', '.diff', '.patch', '.gitignore',
  '.gitattributes', '.editorconfig', '.srt', '.vtt', '.sub', '.cue',
  '.def', '.rc', '.reg', '.lst', '.map', '.sym', '.dox', '.tex', '.bib'
];

/** C-like 家族后缀（共用 C 关键字表 / // /* 注释规则）。 */
export const TEXT_SUFFIX_C: Array<string> = [
  '.c', '.h', '.cc', '.cpp', '.cxx', '.c++', '.hpp', '.hh', '.hxx', '.inl',
  '.m', '.mm', '.ino', '.cu', '.cuh',
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.java', '.kt', '.kts',
  '.go', '.rs', '.cs', '.swift', '.php', '.rb', '.pl', '.lua',
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1',
  '.css', '.scss', '.less', '.html', '.htm', '.gradle', '.mk', '.cmake',
  '.sql', '.proto', '.dart', '.r', '.groovy', '.scala', '.vue', '.svelte'
];

export const TEXT_SUFFIX_PYTHON: Array<string> = ['.py', '.pyw', '.pyi', '.pyx', '.pxd'];
export const TEXT_SUFFIX_ASM: Array<string> = ['.asm', '.s', '.nasm', '.nas', '.inc', '.a51'];
export const TEXT_SUFFIX_VERILOG: Array<string> = ['.v', '.sv', '.vh', '.svh', '.vlog', '.vhd', '.vhdl', '.vho'];

function suffixIn(ext: string, list: Array<string>): boolean {
  if (ext.length === 0) {
    return false;
  }
  for (let i = 0; i < list.length; i++) {
    if (ext === list[i]) {
      return true;
    }
  }
  return false;
}

/** 取小写后缀（无后缀返回空串）。 */
export function textExtOf(name: string): string {
  const dot: number = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) {
    return '';
  }
  return name.substring(dot).toLowerCase();
}

/** 自动识别文件类型：白名单一等，无后缀 / 点开头文件名乐观判为纯文本，
 *  有未知后缀则判为非文本（避免把 .zip / .exe 当文本读进来）。 */
export function textLangOf(name: string): number {
  const ext: string = textExtOf(name);
  if (suffixIn(ext, TEXT_SUFFIX_C)) {
    return LANG_C;
  }
  if (suffixIn(ext, TEXT_SUFFIX_PYTHON)) {
    return LANG_PYTHON;
  }
  if (suffixIn(ext, TEXT_SUFFIX_ASM)) {
    return LANG_ASM;
  }
  if (suffixIn(ext, TEXT_SUFFIX_VERILOG)) {
    return LANG_VERILOG;
  }
  if (suffixIn(ext, TEXT_SUFFIX_PLAIN)) {
    return LANG_PLAIN;
  }
  // 无后缀（Makefile / README / LICENSE / Dockerfile）与 .gitignore 这类点文件：
  // 名字本身没有「二进制后缀」，乐观按纯文本列出，读到字节后再由 looksBinary 兜底。
  const dot: number = name.lastIndexOf('.');
  if (dot <= 0) {
    return LANG_PLAIN;
  }
  return LANG_NONE;
}

export function isTextFileName(name: string): boolean {
  return textLangOf(name) !== LANG_NONE;
}

export function textLangLabelOf(lang: number): string {
  if (lang === LANG_C) {
    return 'C / C-like';
  }
  if (lang === LANG_PYTHON) {
    return 'Python';
  }
  if (lang === LANG_ASM) {
    return 'ASM';
  }
  if (lang === LANG_VERILOG) {
    return 'Verilog';
  }
  if (lang === LANG_PLAIN) {
    return '纯文本';
  }
  return '未知';
}

/** 高亮开关：无规则的文件仍要按普通文本完整展示，只是不启用语法着色。 */
export function highlightWanted(lang: number): boolean {
  return lang === LANG_C || lang === LANG_PYTHON || lang === LANG_ASM || lang === LANG_VERILOG;
}

/** 文件选择器「格式」下拉项用：所有可预览文本后缀（不含点号）。 */
export function textSuffixListOf(): Array<string> {
  const out: Array<string> = [];
  const groups: Array<Array<string>> = [
    TEXT_SUFFIX_PLAIN, TEXT_SUFFIX_C, TEXT_SUFFIX_PYTHON, TEXT_SUFFIX_ASM, TEXT_SUFFIX_VERILOG
  ];
  for (let g = 0; g < groups.length; g++) {
    const list: Array<string> = groups[g];
    for (let i = 0; i < list.length; i++) {
      const s: string = list[i].substring(1);
      if (s.length > 0 && out.indexOf(s) < 0) {
        out.push(s);
      }
    }
  }
  return out;
}

// --------------------------------------------------------------------
// 二、编码识别 / 二进制嗅探
// --------------------------------------------------------------------

export const ENC_UTF8: string = 'utf-8';
export const ENC_UTF16LE: string = 'utf-16le';
export const ENC_UTF16BE: string = 'utf-16be';
export const ENC_GB18030: string = 'gb18030';
export const ENC_BIG5: string = 'big5';
export const ENC_WIN1252: string = 'windows-1252';

/** BOM 判定：返回编码名，无 BOM 返回空串。 */
export function textBomEncodingOf(bytes: Uint8Array): string {
  const n: number = bytes.length;
  if (n >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return ENC_UTF8;
  }
  if (n >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return ENC_UTF16LE;
  }
  if (n >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return ENC_UTF16BE;
  }
  return '';
}

/** 需要跳过的 BOM 字节数（我们自行 slice，避免 util.TextDecoder 把 U+FEFF 留在正文里）。 */
export function textBomSkipOf(bytes: Uint8Array): number {
  const enc: string = textBomEncodingOf(bytes);
  if (enc === ENC_UTF8) {
    return 3;
  }
  if (enc === ENC_UTF16LE || enc === ENC_UTF16BE) {
    return 2;
  }
  return 0;
}

/** 严格 UTF-8 合法性校验（拒绝 overlong / 代理区 / > U+10FFFF / 断裂续字节）。 */
export function isValidUtf8(bytes: Uint8Array): boolean {
  const n: number = bytes.length;
  let i: number = 0;
  while (i < n) {
    const b0: number = bytes[i];
    if (b0 < 0x80) {
      i++;
      continue;
    }
    let need: number = 0;
    let b1Lo: number = 0x80;
    let b1Hi: number = 0xbf;
    if (b0 >= 0xc2 && b0 <= 0xdf) {
      need = 1;
    } else if (b0 >= 0xe0 && b0 <= 0xef) {
      need = 2;
      if (b0 === 0xe0) {
        b1Lo = 0xa0;           // 拒绝 overlong
      }
      if (b0 === 0xed) {
        b1Hi = 0x9f;           // 拒绝 UTF-16 代理区
      }
    } else if (b0 >= 0xf0 && b0 <= 0xf4) {
      need = 3;
      if (b0 === 0xf0) {
        b1Lo = 0x90;
      }
      if (b0 === 0xf4) {
        b1Hi = 0x8f;           // 拒绝 > U+10FFFF
      }
    } else {
      return false;
    }
    if (i + need >= n) {
      return false;
    }
    const b1: number = bytes[i + 1];
    if (b1 < b1Lo || b1 > b1Hi) {
      return false;
    }
    for (let k = 2; k <= need; k++) {
      const bk: number = bytes[i + k];
      if (bk < 0x80 || bk > 0xbf) {
        return false;
      }
    }
    i += need + 1;
  }
  return true;
}

/** 二进制嗅探：NUL / 高比例 C0 控制字符。UTF-16 文本的 0x00 不当成二进制。 */
export function looksBinary(bytes: Uint8Array): boolean {
  const bom: string = textBomEncodingOf(bytes);
  const utf16: boolean = bom === ENC_UTF16LE || bom === ENC_UTF16BE;
  const n: number = bytes.length < 4096 ? bytes.length : 4096;
  let bad: number = 0;
  for (let i = 0; i < n; i++) {
    const b: number = bytes[i];
    if (b === 0x00 && !utf16) {
      return true;
    }
    if (b < 0x20 && b !== 9 && b !== 10 && b !== 13 && !(b === 0x00 && utf16)) {
      bad++;
    }
  }
  // 超过 2% 的不可打印控制字符 → 按二进制处理，避免把随机字节刷成满屏乱码。
  return n > 0 && bad * 50 > n;
}

/** 去掉 BOM 后的正文（返回新 Uint8Array，不用 subarray，避免各 SDK 版 TypedArray 差异）。 */
export function textBodyOf(bytes: Uint8Array): Uint8Array {
  const skip: number = textBomSkipOf(bytes);
  const n: number = bytes.length - skip;
  if (n <= 0) {
    return new Uint8Array(0);
  }
  const out: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = bytes[i + skip];
  }
  return out;
}

/** 解码候选顺序。Index.ets 逐个用 util.TextDecoder 试，再由 pickDecodedIndexOf 选最佳。 */
export function encodingCandidatesOf(bytes: Uint8Array): Array<string> {
  const bom: string = textBomEncodingOf(bytes);
  if (bom === ENC_UTF8) {
    return [ENC_UTF8];
  }
  if (bom === ENC_UTF16LE) {
    return [ENC_UTF16LE];
  }
  if (bom === ENC_UTF16BE) {
    return [ENC_UTF16BE];
  }
  if (isValidUtf8(textBodyOf(bytes))) {
    return [ENC_UTF8, ENC_GB18030];
  }
  return [ENC_GB18030, ENC_BIG5, ENC_WIN1252, ENC_UTF8];
}

/** 从多个已解码结果里挑最佳：U+FFFD 替换字符最少者优先，同分取更长的（信息更全）。 */
export function pickDecodedIndexOf(texts: Array<string>): number {
  let best: number = -1;
  let bestBad: number = 2147483647;
  let bestLen: number = -1;
  for (let i = 0; i < texts.length; i++) {
    const s: string = texts[i];
    let bad: number = 0;
    for (let j = 0; j < s.length; j++) {
      if (s.charCodeAt(j) === 0xfffd) {
        bad++;
      }
    }
    if (best < 0 || bad < bestBad || (bad === bestBad && s.length > bestLen)) {
      best = i;
      bestBad = bad;
      bestLen = s.length;
    }
  }
  return best;
}

/** 编码显示名（状态栏 / 文本预览抬头用）。 */
export function encodingLabelOf(enc: string): string {
  if (enc === ENC_UTF8) {
    return 'UTF-8';
  }
  if (enc === ENC_UTF16LE) {
    return 'UTF-16LE';
  }
  if (enc === ENC_UTF16BE) {
    return 'UTF-16BE';
  }
  if (enc === ENC_GB18030) {
    return 'GB18030';
  }
  if (enc === ENC_BIG5) {
    return 'Big5';
  }
  if (enc === ENC_WIN1252) {
    return 'Windows-1252';
  }
  if (enc.length > 0) {
    return enc.toUpperCase();
  }
  return '未知';
}

// --------------------------------------------------------------------
// 三、行处理 / 大文件上限
// --------------------------------------------------------------------

/** 单次最多读 8 MB：足够覆盖几十万行日志，又不会把 NAS 往返塞进 UI 线程。 */
export const TEXT_MAX_BYTES: number = 8 * 1024 * 1024;
/** 最多建 12 万行：LazyForEach 按需创建节点，行数多也不卡。 */
export const TEXT_MAX_LINES: number = 120000;
/** Tab 展开宽度（仅显示层，原行内容不变）。 */
export const TEXT_TAB_WIDTH: number = 4;
/** 每行固定高度（vp），等宽排版、行号与正文严格对齐。 */
export const TEXT_ROW_H_VP: number = 20;
/** 文本预览时滚轮每格滚动几行。 */
export const TEXT_WHEEL_LINES: number = 3;

export interface TextSplit {
  lines: Array<string>;
  truncated: boolean;
}

/** 实际要读的字节数：size 未知（<0）时退回探针上限，绝不分配超大 buffer。 */
export function textReadCapOf(size: number, maxBytes: number): number {
  if (size < 0) {
    return maxBytes;
  }
  if (size === 0) {
    return 0;
  }
  return size < maxBytes ? size : maxBytes;
}

/** 是否因字节上限被截断（用于状态栏提示，不误导成「文件只有这么多」）。 */
export function textByteTruncatedOf(size: number, maxBytes: number): boolean {
  return size > maxBytes && maxBytes > 0;
}

/** CRLF / CR / LF 统一切行；行内容保留原始字符（含缩进、特殊字符、Tab），
 *  只把行终止符本身作为分隔。末尾换行不产生多余的空行。 */
export function splitTextLines(text: string, cap: number): TextSplit {
  const out: Array<string> = [];
  const limit: number = cap > 0 ? cap : TEXT_MAX_LINES;
  let start: number = 0;
  let truncated: boolean = false;
  const n: number = text.length;
  let i: number = 0;
  while (i < n) {
    const c: number = text.charCodeAt(i);
    if (c === 10 || c === 13) {
      out.push(text.substring(start, i));
      if (out.length >= limit) {
        truncated = true;
        return { lines: out, truncated: truncated };
      }
      if (c === 13 && i + 1 < n && text.charCodeAt(i + 1) === 10) {
        i++;
      }
      start = i + 1;
    }
    i++;
  }
  if (start < n) {
    out.push(text.substring(start));
  }
  return { lines: out, truncated: truncated };
}

/** Tab 按制表位展开成空格（仅显示层）。其余字符原样返回。 */
export function expandTabsOf(line: string, tabWidth: number): string {
  const w: number = tabWidth > 0 ? tabWidth : TEXT_TAB_WIDTH;
  if (line.indexOf('\t') < 0) {
    return line;
  }
  let out: string = '';
  let col: number = 0;
  for (let i = 0; i < line.length; i++) {
    const ch: string = line.charAt(i);
    if (ch === '\t') {
      const add: number = w - (col % w);
      for (let k = 0; k < add; k++) {
        out += ' ';
      }
      col += add;
    } else {
      out += ch;
      col++;
    }
  }
  return out;
}

/** 行号栏宽度（vp）：按最大行号位数给足，右对齐不跳动。 */
export function lineNoWidthOf(count: number): number {
  let digits: number = 1;
  let v: number = count > 0 ? count : 1;
  while (v >= 10) {
    v = Math.floor(v / 10);
    digits++;
  }
  return digits * 9 + 18;
}

/** 状态栏文案（纯函数，便于断言「行号 / 编码 / 截断提示」都在）。 */
export function textStatusOf(name: string, lang: number, enc: string,
  lineCount: number, truncated: boolean): string {
  const tail: string = truncated ? ' · 已显示前 ' + TEXT_MAX_BYTES / 1024 / 1024 + ' MB / ' +
    TEXT_MAX_LINES + ' 行' : '';
  return '文本预览 ' + name + ' · ' + textLangLabelOf(lang) + ' · ' +
    encodingLabelOf(enc) + ' · ' + lineCount + ' 行' + tail;
}

// --------------------------------------------------------------------
// 四、语法高亮 tokenizer
// --------------------------------------------------------------------

export const TOK_PLAIN: number = 0;
export const TOK_KEYWORD: number = 1;
export const TOK_COMMENT: number = 2;
export const TOK_STRING: number = 3;
export const TOK_NUMBER: number = 4;
export const TOK_PREPROC: number = 5;
export const TOK_LABEL: number = 6;

export interface TextToken {
  text: string;
  kind: number;
}

export interface LineTokens {
  tokens: Array<TextToken>;
  inBlock: boolean;
}

/** token 配色（深色预览底色上的高对比色；纯文本全为 TOK_PLAIN）。 */
export function tokenColorOf(kind: number): string {
  if (kind === TOK_KEYWORD) {
    return '#c792ea';
  }
  if (kind === TOK_COMMENT) {
    return '#7f9c6a';
  }
  if (kind === TOK_STRING) {
    return '#e5b567';
  }
  if (kind === TOK_NUMBER) {
    return '#82b3e0';
  }
  if (kind === TOK_PREPROC) {
    return '#e08e9b';
  }
  if (kind === TOK_LABEL) {
    return '#6fc7c7';
  }
  return '#d7dce5';
}

/** 关键字表用 `|word|` 形式存成字符串：省内存、零 SDK Map 依赖、纯函数可测。 */
const KW_C: string = '|alignas|alignof|and|as|asm|async|auto|await|base|bool|break|byte|case|catch|' +
  'char|class|const|constexpr|continue|crate|def|default|delegate|delete|do|double|dyn|elif|else|' +
  'enum|event|except|explicit|export|extends|extern|false|final|finally|float|for|foreach|from|' +
  'func|function|global|go|goto|if|implements|import|in|inline|instanceof|int|interface|internal|' +
  'is|lambda|let|lock|long|match|module|mut|namespace|native|new|nil|noexcept|none|not|null|' +
  'nullptr|object|operator|or|override|package|params|pass|private|protected|pub|public|raise|' +
  'readonly|ref|register|return|sbyte|sealed|self|short|signed|sizeof|static|strictfp|struct|' +
  'super|switch|synchronized|template|this|throw|throws|trait|transient|true|try|type|typedef|' +
  'typename|typeof|uint|union|unsafe|unsigned|use|using|var|virtual|void|volatile|where|while|' +
  'with|yield|select|insert|update|delete|create|table|from|where|group|order|by|join|having|' +
  'echo|print|printf|include|define|ifdef|ifndef|endif|elif|undef|pragma|error|warning|' +
  'function|local|require|end|then|repeat|until|elif|fi|done|esac|BEGIN|END|';

const KW_PYTHON: string = '|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|' +
  'False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|' +
  'True|try|while|with|yield|self|cls|print|len|range|str|int|float|list|dict|set|tuple|' +
  'super|object|type|isinstance|enumerate|zip|map|filter|open|bool|bytes|Exception|';

const KW_ASM: string = '|mov|movq|movl|movb|movw|lea|push|pop|pushf|popf|call|ret|retq|jmp|je|jne|' +
  'jz|jnz|jg|jge|jl|jle|ja|jae|jb|jbe|jc|jnc|jo|jno|js|jns|loop|loope|loopne|nop|hlt|' +
  'add|adc|sub|sbb|imul|mul|idiv|div|inc|dec|neg|cmp|test|and|or|xor|not|shl|shr|sal|sar|' +
  'rol|ror|rcl|rcr|bt|bts|btr|bswap|cdq|cqo|leave|syscall|sysenter|int|int3|iret|' +
  'db|dw|dd|dq|resb|resw|resd|resq|equ|times|section|segment|global|extern|bits|org|align|' +
  'byte|word|dword|qword|ptr|offset|near|far|rax|rbx|rcx|rdx|rsi|rdi|rbp|rsp|rip|r8|r9|' +
  'eax|ebx|ecx|edx|esi|edi|ebp|esp|ax|bx|cx|dx|si|di|al|bl|cl|dl|ah|bh|ch|dh|' +
  'xmm0|ymm0|zmm0|cr0|st0|ds|cs|ss|es|fs|gs|';

const KW_VERILOG: string = '|module|endmodule|input|output|inout|wire|reg|logic|bit|integer|real|time|' +
  'parameter|localparam|assign|always|always_comb|always_ff|always_latch|initial|final|begin|end|' +
  'if|else|case|casex|casez|endcase|default|for|while|repeat|forever|disable|fork|join|join_any|' +
  'posedge|negedge|edge|task|endtask|function|endfunction|generate|endgenerate|genvar|' +
  'typedef|enum|struct|union|packed|signed|unsigned|import|export|package|endpackage|interface|' +
  'endinterface|modport|program|endprogram|class|endclass|virtual|static|automatic|' +
  'and|or|not|nand|nor|xor|xnor|buf|bufif0|bufif1|nmos|pmos|cmos|tran|' +
  'supply0|supply1|tri|tri0|tri1|wand|wor|pulldown|pullup|specify|endspecify|' +
  'assert|assume|cover|property|endproperty|sequence|endsequence|expect|';

function keywordSetOf(lang: number): string {
  if (lang === LANG_PYTHON) {
    return KW_PYTHON;
  }
  if (lang === LANG_ASM) {
    return KW_ASM;
  }
  if (lang === LANG_VERILOG) {
    return KW_VERILOG;
  }
  return KW_C;
}

function isKeyword(word: string, lang: number): boolean {
  const set: string = keywordSetOf(lang);
  return set.indexOf('|' + word + '|') >= 0;
}

function isIdentStart(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36;
}

function isIdentPart(c: number): boolean {
  return isIdentStart(c) || (c >= 48 && c <= 57);
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

/** 单行注释前缀。 */
function lineCommentOf(lang: number): string {
  if (lang === LANG_PYTHON || lang === LANG_ASM) {
    // Python 用 #，NASM 用 ;；两者都是单字符，scanner 用首字符区分。
    return lang === LANG_PYTHON ? '#' : ';';
  }
  return '//';
}

/** 多行块起始标记（空串 = 该位置不是块起始）。
 *  · C / Verilog：`/*`
 *  · Python：`"""` 或 `'''`（三引号 docstring 也按块处理）
 *  · ASM：无多行块
 * 长度直接由 mark.length 得到，绝不把布尔状态误当标记字符串。 */
function blockOpenAt(line: string, at: number, lang: number): string {
  if (lang === LANG_C || lang === LANG_VERILOG) {
    return line.substring(at, at + 2) === '/*' ? '/*' : '';
  }
  if (lang === LANG_PYTHON) {
    if (line.substring(at, at + 3) === '"""') {
      return '"""';
    }
    if (line.substring(at, at + 3) === "'''") {
      return "'''";
    }
    return '';
  }
  return '';
}

/** 从 from 起找本行内的块结束标记，返回 [索引, 标记长度]；找不到索引为 -1。
 *  · C / Verilog：星号 + 斜杠（C 风格块注释收尾）
 *  · Python：优先与开标记相同的三引号，其次另一种三引号（两者都可收尾）。
 *  注释里刻意不写出那两个连续字符，避免提前闭合本段文档注释。
 */
function blockCloseAt(line: string, from: number, lang: number, openMark: string): Array<number> {
  if (lang === LANG_C || lang === LANG_VERILOG) {
    const i: number = line.indexOf('*/', from);
    return i < 0 ? [-1, 0] : [i, 2];
  }
  if (lang === LANG_PYTHON) {
    const preferred: string = openMark.length > 0 ? openMark : '"""';
    const a: number = line.indexOf(preferred, from);
    const other: string = preferred === '"""' ? "'''" : '"""';
    const b: number = line.indexOf(other, from);
    if (a >= 0 && (b < 0 || a <= b)) {
      return [a, 3];
    }
    if (b >= 0) {
      return [b, 3];
    }
    return [-1, 0];
  }
  return [-1, 0];
}

/** 行首的预处理 / 指令 / 装饰器前缀（整行着色为 TOK_PREPROC）。 */
function preprocCharOf(lang: number): string {
  if (lang === LANG_C) {
    return '#';
  }
  if (lang === LANG_VERILOG) {
    return '`';
  }
  if (lang === LANG_ASM) {
    return '.';
  }
  if (lang === LANG_PYTHON) {
    return '@';
  }
  return '';
}

/**
 * 逐行 tokenize。
 *  · emitTokens=false 时只计算「本行结束后是否仍在多行注释里」，不建 token 数组 ——
 *    blockStartsOf 扫十几万行时零额外分配、与 true 版本共用同一套状态机（绝不 divergence）。
 *  · 不变式：emitTokens=true 时，把 tokens 的 text 拼起来 === expandTabsOf(line)。
 */
export function tokenizeLine(line: string, lang: number, inBlock: boolean,
  emitTokens: boolean): LineTokens {
  const tokens: Array<TextToken> = [];
  const shown: string = expandTabsOf(line, TEXT_TAB_WIDTH);
  if (!highlightWanted(lang)) {
    if (emitTokens) {
      tokens.push({ text: shown, kind: TOK_PLAIN });
    }
    return { tokens: tokens, inBlock: false };
  }
  return scanLine(shown, lang, inBlock, emitTokens);
}

function pushPlain(tokens: Array<TextToken>, line: string, from: number, to: number,
  emit: boolean): void {
  if (emit && to > from) {
    tokens.push({ text: line.substring(from, to), kind: TOK_PLAIN });
  }
}

function scanLine(line: string, lang: number, inBlock: boolean, emit: boolean): LineTokens {
  const tokens: Array<TextToken> = [];
  const lineMark: string = lineCommentOf(lang);
  const preChar: string = preprocCharOf(lang);
  const n: number = line.length;
  let block: boolean = inBlock;
  let seg: number = 0;
  let i: number = 0;

  // 行首（跳过缩进）若是预处理 / 指令 / 装饰器，整行按 TOK_PREPROC 输出。
  let first: number = 0;
  while (first < n && (line.charAt(first) === ' ' || line.charAt(first) === '\t')) {
    first++;
  }
  if (preChar.length > 0 && first < n && line.charAt(first) === preChar) {
    if (emit) {
      tokens.push({ text: line, kind: TOK_PREPROC });
    }
    return { tokens: tokens, inBlock: block };
  }

  while (i < n) {
    const ch: string = line.charAt(i);

    // ① 多行注释中：先找本行的结束标记；找不到就整行都是注释、状态保持 true。
    if (block) {
      const end: Array<number> = blockCloseAt(line, i, lang, '');
      const at: number = end[0];
      const stop: number = at < 0 ? n : at + end[1];
      pushPlain(tokens, line, seg, i, emit);   // 段首到块起点（通常为空）
      if (emit) {
        tokens.push({ text: line.substring(i, stop), kind: TOK_COMMENT });
      }
      i = stop;
      seg = i;
      if (at >= 0) {
        block = false;
      } else {
        return { tokens: finish(tokens, line, seg, n, emit), inBlock: true };
      }
      continue;
    }

    // ② 多行注释开始（Python 三引号需先于普通引号判断）
    const mark: string = blockOpenAt(line, i, lang);
    if (mark.length > 0) {
      const openLen: number = mark.length;
      const end: Array<number> = blockCloseAt(line, i + openLen, lang, mark);
      const at: number = end[0];
      const stop: number = at < 0 ? n : at + end[1];
      pushPlain(tokens, line, seg, i, emit);
      if (emit) {
        tokens.push({ text: line.substring(i, stop), kind: TOK_COMMENT });
      }
      i = stop;
      seg = i;
      if (at < 0) {
        return { tokens: finish(tokens, line, seg, n, emit), inBlock: true };
      }
      continue;
    }

    // ③ 行注释：整行剩余都是注释
    if ((lineMark === '//' && ch === '/' && i + 1 < n && line.charAt(i + 1) === '/') ||
      (lineMark === '#' && ch === '#') || (lineMark === ';' && ch === ';')) {
      pushPlain(tokens, line, seg, i, emit);
      if (emit) {
        tokens.push({ text: line.substring(i, n), kind: TOK_COMMENT });
      }
      return { tokens: tokens, inBlock: block };
    }

    // ④ 字符串（含 \ 转义），单双引号都吃
    if (ch === '"' || ch === "'") {
      const quote: string = ch;
      let j: number = i + 1;
      while (j < n) {
        if (line.charAt(j) === '\\') {
          j += 2;
          continue;
        }
        if (line.charAt(j) === quote) {
          j++;
          break;
        }
        j++;
      }
      pushPlain(tokens, line, seg, i, emit);
      if (emit) {
        tokens.push({ text: line.substring(i, j < n ? j : n), kind: TOK_STRING });
      }
      i = j < n ? j : n;
      seg = i;
      continue;
    }

    // ⑤ 数字（0x / 十进制 / 带 . 的小数 / Verilog 4'b1010 简化为数字）
    if (isDigit(line.charCodeAt(i))) {
      let j: number = i + 1;
      while (j < n) {
        const c: number = line.charCodeAt(j);
        if (isIdentPart(c) || c === 46 || c === 39) {
          j++;
        } else {
          break;
        }
      }
      pushPlain(tokens, line, seg, i, emit);
      if (emit) {
        tokens.push({ text: line.substring(i, j), kind: TOK_NUMBER });
      }
      i = j;
      seg = i;
      continue;
    }

    // ⑥ 标识符：命中关键字表才切成 TOK_KEYWORD，其余留在 plain 段里（零额外 token）
    if (isIdentStart(line.charCodeAt(i))) {
      let j: number = i + 1;
      while (j < n && isIdentPart(line.charCodeAt(j))) {
        j++;
      }
      const word: string = line.substring(i, j);
      if (isKeyword(word, lang)) {
        pushPlain(tokens, line, seg, i, emit);
        if (emit) {
          tokens.push({ text: word, kind: TOK_KEYWORD });
        }
        seg = j;
      } else if (lang === LANG_ASM && j < n && line.charAt(j) === ':') {
        // 汇编标签 label:
        pushPlain(tokens, line, seg, i, emit);
        if (emit) {
          tokens.push({ text: line.substring(i, j + 1), kind: TOK_LABEL });
        }
        seg = j + 1;
        j++;
      }
      i = j;
      continue;
    }

    i++;
  }
  return { tokens: finish(tokens, line, seg, n, emit), inBlock: block };
}

function finish(tokens: Array<TextToken>, line: string, seg: number, n: number,
  emit: boolean): Array<TextToken> {
  pushPlain(tokens, line, seg, n, emit);
  return tokens;
}

/** 每行「起始是否处于多行注释中」：一次 O(n) 轻量扫描，供 LazyForEach 的可见行按需着色。
 *  与 tokenizeLine(..., true) 共用 scanLine，绝不出现两套状态机不一致。 */
export function blockStartsOf(lines: Array<string>, lang: number): Array<boolean> {
  const out: Array<boolean> = [];
  let state: boolean = false;
  for (let i = 0; i < lines.length; i++) {
    out.push(state);
    const r: LineTokens = tokenizeLine(lines[i], lang, state, false);
    state = r.inBlock;
  }
  return out;
}

/** 不变式辅助：token 文本拼回应等于显示层文本（防止高亮丢字 / 吞特殊字符）。 */
export function joinTokensOf(tokens: Array<TextToken>): string {
  let s: string = '';
  for (let i = 0; i < tokens.length; i++) {
    s += tokens[i].text;
  }
  return s;
}

// --------------------------------------------------------------------
// 五、显示宽度（第三十七轮 Index.ets 文本预览用）
// --------------------------------------------------------------------

/** 12fp 等宽字体的单字符近似宽度（vp）。只用于反推横向可滚动宽度，不参与文本变换。 */
export const TEXT_CHAR_W_VP: number = 7.2;
/** 横向滚动内容宽度上限（vp）：单行几百万字符时不把布局宽度撑成天文数字。 */
export const TEXT_CONTENT_MAX_VP: number = 12000;

/** 一行展开 Tab 后的显示列数（不分配字符串，十几万行也只做一次线性扫描）。 */
function displayLenOf(line: string, tabWidth: number): number {
  const w: number = tabWidth > 0 ? tabWidth : TEXT_TAB_WIDTH;
  let col: number = 0;
  for (let i = 0; i < line.length; i++) {
    if (line.charAt(i) === '\t') {
      col += w - (col % w);
    } else {
      col++;
    }
  }
  return col;
}

/** 横向滚动内容宽度：最长显示行 × 单字符宽 + 行号栏 + 内边距，再夹一个上限。
 *  纯字符串 / 纯数值运算，零 SDK 依赖、零 IO，Node 侧可直接回归。 */
export function textContentWidthOf(lines: Array<string>, tabWidth: number, charW: number,
  lineNoW: number, maxW: number): number {
  let maxLen: number = 0;
  for (let i = 0; i < lines.length; i++) {
    const n: number = displayLenOf(lines[i], tabWidth);
    if (n > maxLen) {
      maxLen = n;
    }
  }
  const cw: number = charW > 0 ? charW : TEXT_CHAR_W_VP;
  const lim: number = maxW > 0 ? maxW : TEXT_CONTENT_MAX_VP;
  const w: number = maxLen * cw + lineNoW + 24;
  return w > lim ? lim : w;
}
