/** 文件名 / 目录名显示的纯字符串工具。
 *
 *  单独抽成 .ts 模块有两个原因：
 *   1. `baseName()` 同时被文件名、目录名、状态栏、多选兜底共用，
 *      一处算错就到处空白，必须集中修、集中测；
 *   2. 纯函数不依赖任何鸿蒙 SDK，可以直接用 Node 24 的
 *      `node --experimental-strip-types` 加载并跑用例（见 `tests/dirname.test.mjs`），
 *      不必装 HAP 实机就能覆盖各种 URI 形态。
 *
 *  2026-11-10 修复：`DocumentViewPicker(FOLDER)` 返回目录标识时**常带尾部斜杠**，
 *  旧 `baseName()` 的 `lastIndexOf('/')` 落在最后一个字符上，`substring(i+1)` 返回空串，
 *  于是左栏抬头 `Text(this.source)` 直接空白 —— 这就是「人像」目录报出来的现象。
 *  中文目录名还可能被 `%XX` 编码、前面套 `file://docs` 文档 URI、后面带 `?` 参数，
 *  这里一并处理，并保证任何时候都不返回空串。
 */

/** 去掉查询参数与路径尾部的斜杠（保留根 `/` 和 scheme 里的 `//`）。 */
export function stripTrailingSlash(p: string): string {
  let s: string = p;
  const q: number = s.indexOf('?');
  if (q >= 0) {
    s = s.substring(0, q);
  }
  while (s.length > 1 && (s.charAt(s.length - 1) === '/' || s.charAt(s.length - 1) === '\\')) {
    s = s.substring(0, s.length - 1);
  }
  return s;
}

/** 安全百分号解码：非法 `%` 序列、解码出替换字符时都保持原串。
 *  目录名里的字面 `%` 不会被误伤（decodeURIComponent 抛异常时走 catch）。 */
function safeDecode(s: string): string {
  try {
    const d: string = decodeURIComponent(s);
    return d.indexOf('\uFFFD') >= 0 ? s : d;
  } catch (e) {
    return s;
  }
}

/** 抠出 uri / 路径的末段名字；目录 URI 的尾斜杠不会再让它返回空串。
 *  末段确实取不到时退回净化后的整串，最后兜底「（未命名）」—— 绝不返回空串。 */
export function baseName(path: string): string {
  const s: string = safeDecode(stripTrailingSlash(path));
  const i: number = s.lastIndexOf('/');
  const name: string = i >= 0 ? s.substring(i + 1) : s;
  if (name.length > 0) {
    return name;
  }
  return s.length > 0 ? s : '（未命名）';
}

/** 左栏抬头 / 状态栏统一用的目录显示名，绝不返回空串。
 *
 *  `base`（实测能列目录的路径）、`raw`（picker 原始 uri）、`candidates`（其它候选写法）
 *  形态各异，逐个取末段，挑第一个「像目录名」的；文档 URI 碎片（`docs` / `file:` 等）
 *  与仍是 `%XX` 的串都跳过，让后面的候选有机会给出正确中文名。 */
export function dirDisplayName(base: string, raw: string, candidates: string[]): string {
  const seen: Set<string> = new Set<string>();
  const tries: string[] = [];
  const add = (s: string): void => {
    if (s.length > 0 && !seen.has(s)) {
      seen.add(s);
      tries.push(s);
    }
  };
  add(base);
  add(raw);
  for (let i = 0; i < candidates.length; i++) {
    add(candidates[i]);
  }
  for (let i = 0; i < tries.length; i++) {
    const n: string = baseName(tries[i]);
    if (n.length === 0) {
      continue;
    }
    // `file://docs` 这类文档 URI 的碎片不是目录名
    if (n === '/' || n === ':' || n === 'file:' || n === 'docs' || n === 'content' ||
        n === 'storage' || n === 'media' || n.indexOf('://') >= 0) {
      continue;
    }
    // 仍是百分号编码串：换下一种写法再试
    if (n.indexOf('%') >= 0 && /%[0-9A-Fa-f]{2}/.test(n)) {
      continue;
    }
    return n;
  }
  return '目录';
}
