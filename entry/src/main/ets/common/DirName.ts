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

/** 把 `file://docs/...` 这类文档 URI 还原成真实文件系统路径。
 *  与 Index.ets 的 dirCandidates() 手工兜底同一口径：
 *  `file://docs/storage/a/b` → `/storage/a/b`；非 file:// 原样返回（已去尾斜杠 / query）。 */
export function realPathOf(p: string): string {
  let s: string = stripTrailingSlash(p);
  if (s.indexOf('file://') === 0) {
    const rest: string = s.substring('file://'.length);
    const slash: number = rest.indexOf('/');
    if (slash < 0) {
      return '';         // `file://docs` 这种碎片不是路径，别拿它算父级
    }
    s = rest.substring(slash);
  }
  return safeDecode(s);
}

/** 取父目录（真实路径口径）。
 *
 *  与旧版 `dirOf()` 的关键差别：**先去 `?` 参数与尾斜杠，再取父级**。
 *  picker 返回的目录标识常带尾斜杠，旧实现 `lastIndexOf('/')` 落在最后一个字符上，
 *  `substring(0, i)` 得到的还是自己（只少了一个斜杠）—— 于是「回上层」重新列同一个
 *  目录，界面看起来完全没反应（2026-11-10 现场：`人像/编号202601 模特 猫/`）。
 *  已是根 / 解析不出时返回空串，绝不返回自身。 */
export function parentDirOf(path: string): string {
  const s: string = realPathOf(path);
  if (s.length === 0 || s === '/') {
    return '';         // 已是根，没有父级
  }
  const i: number = s.lastIndexOf('/');
  if (i < 0) {
    return '';
  }
  let parent: string = s.substring(0, i);
  if (parent.length === 0) {
    parent = '/';
  }
  return stripTrailingSlash(parent);
}

/** 回上层时逐个尝试的父目录候选（按优先级，去重）：
 *   ① 保留原始 scheme / 编码的父 URI —— picker 授权是按 URI 发的，这一形态最可能仍有效；
 *   ② 解码后的父 URI —— 中文与 `%20` 空格目录名能读；
 *   ③ 真实文件系统路径的父 —— 落到 `/storage/...` 形态。
 *  每个候选还会被 openFolder() 里的 dirCandidates() 再展开一次，命中哪个用哪个。
 *  绝不包含「自身」（尾斜杠造成的假父级），避免点了回上层却原地不动。 */
/** 给 DocumentViewPicker.defaultFilePathUri 挑一个安全起点。
 *
 *  逐 URI 授权模型下，picker 只认「已经拿到授权、且带 scheme 的 URI」：
 *   · 传父目录（没授权）→ select() 直接 reject 或忽略定位；
 *   · 传纯文件系统路径 `/storage/...` → 不是 URI，同样不生效。
 *  旧版 chooseFolderAt() 把 parents[0]（常是纯路径）当起点，是「回上层仍然失败」的最后一环。
 *  正确做法：用**当前目录**的 picker 原始 uri 作起点（一定已授权），picker 打开停在这一层，
 *  用户点一次「上层」再确认即可。找不到带 scheme 的 uri 时返回空串 —— 调用方就不设起点。 */
export function pickerStartOf(browseDir: string, pickRootUri: string): string {
  const tries: string[] = [browseDir, pickRootUri];
  for (let i = 0; i < tries.length; i++) {
    const s: string = stripTrailingSlash(tries[i]);
    if (s.indexOf('://') >= 0) {
      return s;
    }
  }
  return '';
}

export function parentDirCandidates(path: string): string[] {
  const out: string[] = [];
  const seen: Set<string> = new Set<string>();
  const add = (s: string): void => {
    if (s.length > 0 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  const s: string = stripTrailingSlash(path);
  const i: number = s.lastIndexOf('/');
  if (i >= 0) {
    const p: string = s.substring(0, i).length > 0 ? s.substring(0, i) : '/';
    add(p);
    add(safeDecode(p));
  }
  add(parentDirOf(path));
  return out;
}
