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
 *  `substring(0, i)` 得到的还是自己（只少了一个斜杠）—— 于是「往上层」重新列同一个
 *  目录，界面看起来完全没反应（2026-11-10 现场：`人像/编号202601 模特 猫/`）。
 *  已是根 / 解析不出时返回空串，绝不返回自身。 */
export function parentDirOf(path: string): string {
  const s: string = realPathOf(path);
  if (s.length === 0 || s === '/') {
    return '';         // 已是根，没有父级
  }
  // 往上层（2026-11-10）语义：严格按目录层级，只取一级父目录，不用浏览历史。
  // 卷根判定交给 volumeRootOf()/upLevelOf()，此处 parentDirOf() 只做「剥一级」的基础运算。
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

/** 估算一段文本在给定字号下占的宽度（vp），用于「按档案名长度自适应列宽」。
 *  ArkUI 的 Text 在 layoutWeight(1) 下拿不到内容宽度，只能自己估：
 *    · CJK / 全角（>= U+2E80）按 1 个字宽；
 *    · 数字 / 大写字母按 0.6，其余半角按 0.55，空格按 0.3。
 *  宁可略微偏大（多一点余量），也不要偏小导致名字被省略号截断。 */
export function textWidthVp(text: string, fontSize: number): number {
  let w: number = 0;
  for (let i = 0; i < text.length; i++) {
    const c: number = text.charCodeAt(i);
    if (c >= 0x2E80) {
      w += fontSize;                       // 中文 / 日文 / 全角符号
    } else if (c === 0x20) {
      w += fontSize * 0.3;                 // 空格
    } else if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A)) {
      w += fontSize * 0.6;                 // 数字 / 大写
    } else {
      w += fontSize * 0.55;                // 小写 / 半角标点
    }
  }
  return Math.ceil(w);
}

/** 左栏 Column 的目标宽度：按当前列表里**最长档案名**自适应。
 *  名字短 → 收到 minWidth（不留多余空白、也保证一行三个按钮不挤）；
 *  名字长 → 放宽到能完整显示（不再出现省略号）；超过 maxWidth 才截断，
 *  避免个别超长名字把右侧预览区压没。
 *
 *  固定开销（vp）= 行首图标 18 + 名字左 padding 8 + 体积列 66 + 日期列 88
 *    + 日期列 margin 6 + 行 padding 12 + 列表 padding 16 + 度量余量 12 = 226。 */
export function listWidthForNames(names: string[], minWidth: number, maxWidth: number): number {
  let maxText: number = 0;
  for (let i = 0; i < names.length; i++) {
    const w: number = textWidthVp(names[i], 12);
    if (w > maxText) {
      maxText = w;
    }
  }
  const need: number = Math.ceil(maxText + 226);
  if (need <= minWidth) {
    return minWidth;
  }
  return need >= maxWidth ? maxWidth : need;
}

/** 给 DocumentViewPicker.defaultFilePathUri 挑一个安全起点。
 *
 *  逐 URI 授权模型下，picker 只认「已经拿到授权、且带 scheme 的 URI」：
 *   · 传父目录（没授权）→ select() 直接 reject 或忽略定位；
 *   · 传纯文件系统路径 `/storage/...` → 不是 URI，同样不生效。
 *  旧版 chooseFolderAt() 把 parents[0]（常是纯路径）当起点，是「往上层仍然失败」的最后一环。
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

/** 旧「往上层」逐候选探测遗留工具，Index.ets 已不再用（改走 upParentCandidates()）。
 *  保留供回归测试与历史兼容：它只从**单一路径**求父级写法，不像新逻辑还要校验卷根。 */
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

// --------------------------------------------------------------------
// 「往上层」目录层级导航（2026-11-10）
//
// 语义对齐 Windows 文件管理器的「向上 / Up」按钮：
//   · 目标只由**当前路径**算出，与浏览历史无关；
//   · 每次只剥掉一层，连续点击逐级逼近卷的逻辑最上层；
//   · 到卷根后没有父级，upLevelOf 返回 ''，不再上移（只给提示）；
//   · 2026-11-11 修正：按钮**永不 grey out / 永不禁用**。canGoUpFrom / upNavStateOf
//     只用于「是否上移」的行为判定、状态栏文案与诊断串，**绝不**驱动按钮外观或可交互性。
// 全部是纯函数，可用 Node 24 直接回归，不必装 HAP。
// --------------------------------------------------------------------

/** 统一分隔符：Windows 反斜杠 → 正斜杠，只用于层级计算（不改文件名显示）。 */
function hierSlashes(s: string): string {
  return s.split('\\').join('/');
}

/** 把任意 uri / 路径归一成「层级计算用」的真实路径：
 *  去 ? 参数与尾斜杠、还原 file://docs 文档 URI、百分号解码、统一分隔符。 */
export function hierPathOf(path: string): string {
  return hierSlashes(realPathOf(path));
}

/** 逻辑卷根 —— 「往上层」能到达的最高层（Windows 的 C:\ 对应物）。
 *  · Windows 盘符路径 `C:/Users/...` → `C:`（盘符根，再往上是「此电脑」，不属于目录层级）；
 *  · 鸿蒙用户卷 `/storage/(Users|media|emulated)/<id>/...` → `/storage/<bucket>/<id>`，
 *    这是文件管理器里「内部存储 / 用户卷」的顶，上面 `/storage`、`/` 是系统目录，
 *    既没有逐 URI 授权也没有可浏览内容，不应作为「往上层」的一级；
 *  · 其它绝对路径 → `/`（文件系统根）；
 *  · 解析不出真实路径（如 `file://docs` 碎片）→ `''`，表示无法判定层级。 */
export function volumeRootOf(path: string): string {
  const s: string = hierPathOf(path);
  if (s.length === 0) {
    return '';
  }
  // 注意要同时认 `C:/Users/...` 和卷根自身 `C:`（尾斜杠已被 stripTrailingSlash 去掉），
  // 否则到达盘符根时 volumeRootOf 会突然返回 ''，导致按钮状态与层级判定不一致。
  if (/^[A-Za-z]:($|\/)/.test(s)) {
    return s.substring(0, 2);           // 'C:'
  }
  if (s.charAt(0) !== '/') {
    return '';
  }
  const parts: string[] = s.split('/');
  // parts[0] 是空串；识别 /storage/<bucket>/<id>
  if (parts.length >= 4 && parts[1] === 'storage' &&
      (parts[2] === 'Users' || parts[2] === 'media' || parts[2] === 'emulated')) {
    return '/' + parts[1] + '/' + parts[2] + '/' + parts[3];
  }
  return '/';
}

/** 目录层级深度（卷根 = 0）。用于诊断串与「逐级、不越级」回归断言：
 *  upLevelOf 每调用一次，dirLevelOf 必须严格减 1，直到 0 停止。 */
export function dirLevelOf(path: string): number {
  const s: string = hierPathOf(path);
  if (s.length === 0) {
    return 0;
  }
  const root: string = volumeRootOf(s);
  let rest: string = s;
  if (root.length > 0 && root !== '/' && s.indexOf(root) === 0) {
    rest = s.substring(root.length);
  }
  let n: number = 0;
  const parts: string[] = rest.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) {
      n++;
    }
  }
  return n;
}

/** 「往上层」的目标：当前路径的**直接父目录**，严格只剥一层，绝不越级。
 *  已在卷根 / 越过卷根 / 解析不出路径时返回 '' —— 调用方据此置灰按钮并停止上移。
 *  绝不返回自身（尾斜杠造成的假父级），因此连续点击不可能绕圈。 */
export function upLevelOf(path: string): string {
  const s: string = hierPathOf(path);
  if (s.length === 0) {
    return '';
  }
  const root: string = volumeRootOf(s);
  if (root.length === 0 || s === root || s === '/') {
    return '';                          // 已到卷的逻辑最上层
  }
  if (root !== '/' && s.indexOf(root + '/') !== 0) {
    return '';                          // 不在该卷之下（异常路径），不再上移
  }
  const i: number = s.lastIndexOf('/');
  if (i < 0) {
    return '';
  }
  let parent: string = i === 0 ? '/' : s.substring(0, i);
  if (parent.length === 0) {
    parent = '/';
  }
  if (parent === s) {
    return '';                          // 绝不返回自身
  }
  // 不得越过卷根（root='C:' / '/storage/Users/<id>' 时尤其要挡住）
  if (parent !== root && parent.length < root.length) {
    return '';
  }
  return parent;
}

/** 是否仍有父级 —— 只作「能否上移」的行为判据与诊断信息。
 *  ⚠️ 2026-11-11 用户明确要求「往上层」**不要 grey out、不能禁用**：
 *  本函数**不参与**按钮的 enabled / 颜色 / 透明度，按钮任何时候都可点。
 *  直接复用 upLevelOf，保证「点击落点」与「是否有父级」不会打架。 */
export function canGoUpFrom(path: string): boolean {
  return upLevelOf(path).length > 0;
}

/** 「往上层」点击时的四种状态（数值常量，便于 ArkTS 与 hilog 打印）。
 *
 *  为什么要分开 TOP 和 UNKNOWN：DocumentViewPicker 给的目录标识未必能还原成绝对路径
 *  （`content://...`、`file://docs` 碎片）。这种时候 volumeRootOf 返回 ''、upLevelOf 也返回 ''，
 *  旧代码一律当成「已到卷 / 硬盘的逻辑最上层」，于是**明明在深层目录却按钮发灰 / 点了没反应**——
 *  正是 2026-11-11 用户报的「不知道为什么 grey out」。现在两种情况分开：
 *    · TOP：确实到顶 → 给提示，不再上移；
 *    · UNKNOWN：只是层级判不出 → 按「严格剥一层」的宽松父级再试一次，绝不假装到顶。 */
export const UP_NAV_NONE: number = 0;      // 非目录浏览态（browseBase 为空，如启动恢复出的图片列表）
export const UP_NAV_TOP: number = 1;       // 真到卷 / 盘符根
export const UP_NAV_GO: number = 2;        // 有直接父级，正常上移
export const UP_NAV_UNKNOWN: number = 3;   // 路径非空、但卷根判不出（文档 / content URI）

export function upNavStateOf(path: string): number {
  const s: string = hierPathOf(path);
  if (s.length === 0) {
    return UP_NAV_NONE;
  }
  if (upLevelOf(s).length > 0) {
    return UP_NAV_GO;
  }
  if (volumeRootOf(s).length > 0) {
    return UP_NAV_TOP;                     // 能定出卷根却剥不动 = 真的到顶了
  }
  return UP_NAV_UNKNOWN;                   // 连卷根都定不出 = URI 形态问题，不是到顶
}

/** UNKNOWN 态用的「宽松父级」：不依赖卷根判定，只按 parentDirOf 严格剥一层。
 *  绝不返回自身、绝不返回 scheme 碎片；没有可剥的层级就返回 ''。
 *  ⚠️ 能定出卷根的路径一律返回 ''：那些情况必须走 upLevelOf 的严格层级链
 *  （GO 会逐级上移、TOP 会停在盘符根），用宽松父级会越过 /storage/Users/<id> 卷根
 *  跑到 /storage/Users 这类系统目录，等于越级。 */
export function upLooseParentOf(path: string): string {
  if (volumeRootOf(path).length > 0) {
    return '';
  }
  const p: string = parentDirOf(path);
  if (p.length === 0 || stripTrailingSlash(p) === stripTrailingSlash(path)) {
    return '';
  }
  if (p.indexOf('/') < 0) {
    return '';
  }
  return p;
}

/** 两个 uri / 路径是否指向同一个目录（同一层级、同一位置）。
 *  用于校验 picker 补授权时选中的确实是我们算出的那一层。 */
export function sameDirPath(a: string, b: string): boolean {
  const ka: string = stripTrailingSlash(hierPathOf(a));
  const kb: string = stripTrailingSlash(hierPathOf(b));
  return ka.length > 0 && ka === kb;
}

/** picker 补授权时：选中的目录是否**正好**是当前路径的直接父级。
 *  不接受祖父级（越级）、旁支目录、或当前目录自身；解析不出真实路径时
 *  退回按目录名比对（且排除与当前目录同名）。到卷根后一律返回 false。 */
export function isUpTargetOf(picked: string, current: string): boolean {
  const target: string = upLevelOf(current);
  if (target.length === 0) {
    return false;
  }
  const pickedReal: string = hierPathOf(picked);
  if (pickedReal.length === 0) {
    const n: string = baseName(picked);
    return n.length > 0 && n === baseName(target) && n !== baseName(current);
  }
  return stripTrailingSlash(pickedReal) === target;
}

/** 「往上层」时逐个尝试的候选：全部是目标父层（默认 upLevelOf(currentPath)）的不同 URI 写法
 *  （保留 scheme / 编码的形态最可能仍带 picker 逐 URI 授权）。
 *  任何候选都必须通过 sameDirPath 校验落在同一层；层级不符、等于自身、
 *  等于当前目录的一律剔除 —— 从源头上杜绝越级与循环。
 *  explicitTarget：UNKNOWN 态（卷根判不出）时由调用方传入 upLooseParentOf 的结果，
 *  否则 upLevelOf 为空会直接返回 []，按钮点了永远没反应。 */
export function upParentCandidates(currentPath: string, rawUri: string,
  explicitTarget?: string): string[] {
  const target: string = explicitTarget !== undefined && explicitTarget.length > 0
    ? explicitTarget : upLevelOf(currentPath);
  if (target.length === 0) {
    return [];                          // 真的没有父级：没有候选
  }
  const curKey: string = stripTrailingSlash(hierPathOf(currentPath));
  const out: string[] = [];
  const seen: Set<string> = new Set<string>();
  const add = (s: string): void => {
    if (s.length === 0 || seen.has(s)) {
      return;
    }
    const k: string = stripTrailingSlash(hierPathOf(s));
    if (k.length === 0 || k === curKey || !sameDirPath(s, target)) {
      return;
    }
    seen.add(s);
    out.push(s);
  };
  // ① 保留 rawUri 的 scheme / 编码形态的父 URI（授权按 URI 发，命中率最高）
  const r: string = stripTrailingSlash(rawUri);
  const j: number = r.lastIndexOf('/');
  if (j >= 0) {
    const p: string = j === 0 ? '/' : r.substring(0, j);
    add(p);
    add(safeDecode(p));                 // ② 解码写法（中文 / %20 目录名）
  }
  // ③ 其它已知写法，仍按「同一层」过滤
  const extra: string[] = parentDirCandidates(rawUri).concat(parentDirCandidates(currentPath));
  for (let i = 0; i < extra.length; i++) {
    add(extra[i]);
  }
  // ④ 真实路径目标永远兜底，保证至少有一个 fs.listFile 能认的形态
  add(target);
  return out;
}

/** 目录条目名集合是否一致（顺序无关）。
 *  自动重扫时用它判断 mtime 抖动是否只是「hover 解码读文件 / 网盘写缓存」造成的假变化：
 *  没变就别重建列表，否则 applyItems 会把用户视图拉回上次位置。 */
export function sameEntryNames(want: string[], current: string[]): boolean {
  if (want.length !== current.length) {
    return false;
  }
  for (let i = 0; i < want.length; i++) {
    if (current.indexOf(want[i]) < 0) {
      return false;
    }
  }
  return true;
}
