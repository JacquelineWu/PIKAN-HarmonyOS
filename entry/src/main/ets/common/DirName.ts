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

/** 一段 authority / 首级目录名是否是「网络主机」，而不是普通目录名或文档 URI 伪 authority。
 *
 *  2026-11-12 第八轮（NAS 回上层显示错误目录表）：`file://192.168.100.61/图片档案/...`
 *  的 authority 是 NAS 主机，旧 realPathOf() 把它当成 `file://docs` 之类的文档 provider 名
 *  一并吞掉，于是 `/192.168.100.61/图片档案/...` 被归一成 `/图片档案/...` —— 卷根、父级、
 *  APP 内清单三层全错。这里只认**明确的网络地址形态**，绝不把 `docs` / `content` /
 *  中文目录名 / 带空格的目录名误判成主机：
 *    · IPv4：192.168.100.61、10.0.0.1；
 *    · IPv6 字面量：fe80::1（可带方括号 [fe80::1]）；
 *    · 域名：nas.local、synology.me（至少两段，末段以字母开头，排除纯数字段）。 */
export function isNetworkHost(seg: string): boolean {
  if (seg.length === 0) {
    return false;
  }
  const s: string = seg.charAt(0) === '[' && seg.charAt(seg.length - 1) === ']'
    ? seg.substring(1, seg.length - 1) : seg;
  if (s.length === 0) {
    return false;
  }
  if (/^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(s)) {
    return true;                       // IPv4
  }
  if (s.indexOf(':') >= 0 && /^[0-9A-Fa-f:.]+$/.test(s)) {
    return true;                       // IPv6
  }
  if (s.indexOf('.') >= 0 && /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s)) {
    const last: string = s.substring(s.lastIndexOf('.') + 1);
    if (/^[A-Za-z]/.test(last)) {
      return true;                     // 域名（TLD 以字母开头）
    }
  }
  return false;
}

/** 在按 '/' 切好的路径段里找第一个网络主机段的下标；找不到返回 -1。
 *
 *  2026-11-16 第二十八轮：鸿蒙把网络卷**挂在系统目录之下**，真机实测形态是
 *  `/storage/userExternal/192.168.100.61/图片档案/...`，主机段在 parts[3]，
 *  旧版只看 parts[1]（= `storage`）所以完全认不出 NAS。这里从 1 起扫到前 4 段：
 *  既覆盖 `/<host>/...` 与 `/storage/userExternal/<host>/...`，又不会把深层里
 *  恰好长得像 IP / 域名的普通目录名误判成主机。parts[0] 是绝对路径的空串。 */
function nasHostIndexIn(parts: string[]): number {
  const limit: number = parts.length < 4 ? parts.length : 4;
  for (let i = 1; i < limit; i++) {
    if (isNetworkHost(parts[i])) {
      return i;
    }
  }
  return -1;
}

/** 从 NAS 路径 / URI 里抽出网络主机段（不含斜杠）；非 NAS 返回 ''。
 *  覆盖 `/192.168.100.61/图片档案/...`、`file://192.../...`、`smb://...`、
 *  UNC `\\192.168.100.61\图片档案\...`、`//192.168.100.61/图片档案/...`，
 *  以及第二十八轮新增的挂载形态 `/storage/userExternal/192.168.100.61/图片档案/...`。 */
export function nasHostOf(p: string): string {
  const s: string = stripTrailingSlash(p);
  const schemeAt: number = s.indexOf('://');
  let rest: string = '';
  if (schemeAt >= 0) {
    rest = s.substring(schemeAt + 3);
  } else {
    const t: string = s.split('\\').join('/');
    rest = t.indexOf('//') === 0 ? t.substring(2) : (t.charAt(0) === '/' ? t.substring(1) : t);
  }
  // 不再只认第一段：挂载形态的前几段是 storage / userExternal 这类系统目录。
  const parts: string[] = rest.split('/');
  const limit: number = parts.length < 4 ? parts.length : 4;
  for (let i = 0; i < limit; i++) {
    if (isNetworkHost(parts[i])) {
      return parts[i];
    }
  }
  return '';
}

/** 把 `file://docs/...` 文档 URI、NAS URI / UNC 还原成「层级计算用」的真实路径。
 *
 *  · `file://docs/storage/a/b` → `/storage/a/b`（docs 是文档 provider 伪 authority，丢掉）；
 *  · `file://192.168.100.61/图片档案/a` → `/192.168.100.61/图片档案/a`（**保留 NAS 主机段**，
 *    它是网络卷的第一级真实目录，丢掉会让 whole 目录层级错位）；
 *  · `smb://nas.local/share/a`、`\\192.168.100.61\share\a` 同样折成 `/<host>/share/a`；
 *  · 其余原样返回（已去尾斜杠 / query）。
 *  与 Index.ets 的 dirCandidates() 兜底同一口径 —— 那边直接复用本函数。 */
export function realPathOf(p: string): string {
  let s: string = stripTrailingSlash(p);
  const isFileUri: boolean = s.indexOf('file://') === 0;
  const isNasScheme: boolean = s.indexOf('smb://') === 0 || s.indexOf('nfs://') === 0;
  if (isFileUri || isNasScheme) {
    const rest: string = s.substring(s.indexOf('://') + 3);
    const slash: number = rest.indexOf('/');
    if (slash < 0) {
      return '';         // `file://docs` 这种碎片不是路径，别拿它算父级
    }
    const authority: string = rest.substring(0, slash);
    const tail: string = rest.substring(slash);
    s = isNetworkHost(authority) ? '/' + authority + tail : tail;
  } else {
    // UNC / 双斜杠网络路径：折叠成单斜杠的 /<host>/<share>/...
    const t: string = s.split('\\').join('/');
    if (t.indexOf('//') === 0) {
      const rest: string = t.substring(2);
      const slash: number = rest.indexOf('/');
      const host: string = slash >= 0 ? rest.substring(0, slash) : rest;
      const tail: string = slash >= 0 ? rest.substring(slash) : '';
      if (isNetworkHost(host)) {
        s = '/' + host + tail;
      }
    }
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

/** 「同层判定」用的规范层级键：剥掉 NAS 挂载前缀，只留从主机段开始的层级。
 *
 *  2026-11-16 第二十八轮。真机上同一个 NAS 目录会同时存在两种写法：
 *    · picker 逐 URI 授权的形态 `file://192.168.100.61/图片档案/.../2026`
 *      → hierPathOf 得 `/192.168.100.61/图片档案/.../2026`；
 *    · fs.listFile 实际用的挂载路径 `/storage/userExternal/192.168.100.61/.../2026`
 *      → hierPathOf 得 `/storage/userExternal/192.168.100.61/.../2026`。
 *  旧 sameDirPath() 直接比 hierPathOf 字符串，两者**永远不相等**，于是
 *  upParentCandidates() 把「最可能仍带授权」的 scheme 形态父 URI 全部过滤掉，
 *  只剩一条纯路径兜底；fs.listFile 对带空格 / 方括号 / 中文的未编码纯路径报
 *  `13900002`，最终降级成 APP 内伪清单 —— 这就是本轮 appfreeze 之外的另一半根因。
 *  非 NAS 路径原样返回 hierPathOf，行为与旧版逐字一致。 */
export function canonicalLevelKeyOf(p: string): string {
  const s: string = stripTrailingSlash(hierPathOf(p));
  if (s.length === 0) {
    return '';
  }
  const parts: string[] = s.split('/');
  const hostIdx: number = nasHostIndexIn(parts);
  if (hostIdx > 0) {
    return '/' + parts.slice(hostIdx).join('/');
  }
  return s;
}

/** 生成「百分号编码」的 URI 写法：空格 → %20、方括号 → %5B/%5D、中文 → UTF-8 %XX。
 *  保留 `scheme://` 与路径分隔符；已含 `%XX` 的串返回空串（绝不重复编码）。
 *
 *  NAS 上「中文 + 空格 + 方括号 + 英文 + 数字」混合目录名（例如
 *  `[青丘图鉴] Nine tail Photography`、`4 中`）在 fs.listFile 的某些 URI 形态下
 *  必须编码才认得，未编码写法直接 `13900002`。逐段 encodeURIComponent 不会
 *  把 `/` 编掉，也不会动 scheme，解码侧 realPathOf 的 safeDecode 能还原。 */
export function encodePathForm(p: string): string {
  if (p.length === 0 || p.indexOf('%') >= 0) {
    return '';
  }
  const at: number = p.indexOf('://');
  const head: string = at >= 0 ? p.substring(0, at + 3) : '';
  const rest: string = at >= 0 ? p.substring(at + 3) : p;
  const parts: string[] = rest.split('/');
  let out: string = head;
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      out += '/';
    }
    try {
      out += encodeURIComponent(parts[i]);
    } catch (e) {
      return '';
    }
  }
  return out;
}

/** 「往上层」父级真值校验：parent 必须严格是 current 的**直接父级**（恰好剥一层）。
 *
 *  用 canonicalLevelKeyOf 兼容 NAS 挂载前缀 / scheme / 编码形态差异后，再要求：
 *  current 以 parent + '/' 开头，且余下部分不再含 '/'（即只多一级）。
 *  任何「原地不动 / 越级 / 旁支 / 卷根之上」都会返回 false，调用方据此拒绝上移，
 *  绝不把错误层级当成父目录显示成清单。非 NAS 路径同样适用。 */
export function isStrictParentOf(parent: string, current: string): boolean {
  const p: string = canonicalLevelKeyOf(parent);
  const c: string = canonicalLevelKeyOf(current);
  if (p.length === 0 || c.length === 0 || p === c) {
    return false;
  }
  const prefix: string = p === '/' ? '/' : p + '/';
  if (c.indexOf(prefix) !== 0) {
    return false;
  }
  const tail: string = c.substring(prefix.length);
  return tail.length > 0 && tail.indexOf('/') < 0;
}

/** 逻辑卷根 —— 「往上层」能到达的最高层（Windows 的 C:\ 对应物）。
 *  · Windows 盘符路径 `C:/Users/...` → `C:`（盘符根，再往上是「此电脑」，不属于目录层级）；
 *  · 鸿蒙用户卷 `/storage/(Users|media|emulated)/<id>/...` → `/storage/<bucket>/<id>`，
 *    这是文件管理器里「内部存储 / 用户卷」的顶，上面 `/storage`、`/` 是系统目录，
 *    既没有逐 URI 授权也没有可浏览内容，不应作为「往上层」的一级；
 *  · NAS 网络卷 `/192.168.100.61/图片档案/...` → `/192.168.100.61`（设备根即卷根）。
 *    2026-11-12 第八轮：旧实现把 NAS 当普通 POSIX 路径返回 `/`，于是 pathChainOf()
 *    凭空冒出一行文件系统根 `/`、把 `192.168.100.61` 当成普通子目录列进清单 ——
 *    这就是「选 NAS 路径后回上层显示错误目录表」的直接成因。设备根再往上同样是
 *    系统目录，不该作为可浏览的一级，故与用户卷同级处理；
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
  // 2026-11-16 第二十八轮：NAS 主机段**未必在 parts[1]**。
  // 旧实现只认 `/192.168.100.61/...`，而真机把网络卷挂在
  // `/storage/userExternal/192.168.100.61/...` 之下，parts[1] 是 `storage`，
  // 于是卷根被判成 `/` —— pathChainOf() 凭空把 `/`、`storage`、`userExternal`、
  // `192.168.100.61` 全部当成可浏览目录列进「上层清单」，正是用户截图里
  // 「显示其他层级的文件夹列表」的直接成因。卷根一律取到主机段（含挂载前缀）。
  const hostIdx: number = nasHostIndexIn(parts);
  if (hostIdx > 0) {
    return '/' + parts.slice(1, hostIdx + 1).join('/');
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
 *  用于校验 picker 补授权时选中的确实是我们算出的那一层。
 *  2026-11-16 第二十八轮：改用 canonicalLevelKeyOf —— NAS 的 scheme 授权形态
 *  与 /storage/userExternal/<host> 挂载形态现在判为同层，父 URI 候选不会被误删；
 *  非 NAS 路径的键值与旧版 hierPathOf 完全相同，零回归。 */
export function sameDirPath(a: string, b: string): boolean {
  const ka: string = canonicalLevelKeyOf(a);
  const kb: string = canonicalLevelKeyOf(b);
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
 *  任何候选都必须通过 canonicalLevelKeyOf 校验落在同一层；层级不符、等于自身、
 *  等于当前目录的一律剔除 —— 从源头上杜绝越级与循环。
 *  explicitTarget：UNKNOWN 态（卷根判不出）时由调用方传入 upLooseParentOf 的结果，
 *  否则 upLevelOf 为空会直接返回 []，按钮点了永远没反应。
 *
 *  2026-11-16 第二十八轮：旧版用 hierPathOf 严格字符串相等过滤，把
 *  `file://<host>/...` 授权形态与 `/storage/userExternal/<host>/...` 挂载形态
 *  判成不同层，scheme 候选全被误删，只剩 1 条未编码纯路径 → fs.listFile
 *  `13900002` → 降级伪清单。现改用 canonicalLevelKeyOf，并额外补百分号编码形态。
 *
 *  2026-11-16 第二十九轮：extraRoots 传入「picker 原始授权 URI」，
 *  由 rootFormParentOf() 还原出与授权同形态的父层 URI。browseDir 会在每次
 *  openFolder 时被覆写成子目录路径，原始授权形态容易丢；补上这一路候选，
 *  父目录才真正有机会被 fs.listFile 列出来（列出即含该层全部子目录）。 */
export function upParentCandidates(currentPath: string, rawUri: string,
  explicitTarget?: string, extraRoots?: Array<string>): string[] {
  const target: string = explicitTarget !== undefined && explicitTarget.length > 0
    ? explicitTarget : upLevelOf(currentPath);
  if (target.length === 0) {
    return [];                          // 真的没有父级：没有候选
  }
  const curKey: string = canonicalLevelKeyOf(currentPath);
  const targetKey: string = canonicalLevelKeyOf(target);
  const out: string[] = [];
  const seen: Set<string> = new Set<string>();
  const add = (s: string): void => {
    if (s.length === 0 || seen.has(s)) {
      return;
    }
    const k: string = canonicalLevelKeyOf(s);
    if (k.length === 0 || k === curKey || k !== targetKey) {
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
    add(encodePathForm(p));             // ③ 百分号编码写法（空格 / 方括号 / 中文）
  }
  // ④ 其它已知写法，仍按「同一层」过滤
  const extra: string[] = parentDirCandidates(rawUri).concat(parentDirCandidates(currentPath));
  for (let i = 0; i < extra.length; i++) {
    add(extra[i]);
  }
  // ⑤ 真实路径目标永远兜底，保证至少有一个 fs.listFile 能认的形态
  add(target);
  add(encodePathForm(target));
  // ⑥ 第二十九轮：picker 原始授权 URI 的同形态父层写法。
  //    授权是按 URI 字符串发放的，纯路径 / 换过 scheme 的写法往往拿不到授权；
  //    这一路候选让 fs.listFile(父目录) 真正有机会成功 —— 一旦成功，
  //    openFolder 会列出该层**全部**子目录，而不是只靠缓存拼出当前目录一个。
  if (extraRoots !== undefined) {
    for (let i = 0; i < extraRoots.length; i++) {
      const rp: string = rootFormParentOf(extraRoots[i], target);
      if (rp.length > 0) {
        add(rp);
        add(safeDecode(rp));
        add(encodePathForm(rp));
      }
    }
  }
  return out;
}

// --------------------------------------------------------------------
// 启动恢复后「往上层」的层级重建（2026-11-11 第三次实机反馈）
//
// 恢复链 restoreFromSnapshot / 单张兜底都走 setItems()，它无条件清空
// browseBase / browseDir → 重开后是「图片列表态」，browseUp() 拿到空 current
// 直接给「没有上层目录」就返回，用户按了永远上不去。
//
// 但上一轮 p1 已把「picker 返回的**原始目录 URI**」存进 preferences 并在启动时
// 激活了持久授权。它是纯字符串，完全可以还原出目录层级，零 IO、零重扫、零选择器。
// 关键约束：绝不能拿快照里的**子文件 uri** 去推当前目录（那些是拼出来的路径，
// 重启后授权已失效，且层级可能与用户实际所处层不一致）；只认 picker 原始目录 URI。
// --------------------------------------------------------------------

/** 从持久授权的原始目录 URI 还原「当前目录的真实路径」，供 browseBase 使用。
 *
 *  · 用 hierPathOf 归一化：去 ? 参数 / 尾斜杠、还原 file://docs、百分号解码、统一分隔符；
 *  · 必须是能定出层级的路径（volumeRootOf 非空 / 至少能剥一层），
 *    否则返回 '' —— 解析不出的文档 URI 碎片不许冒充当前目录，避免越级；
 *  · 纯字符串运算：绝不 listFile / statSync / 弹选择器（启动防冻结底线）。 */
export function upContextBaseOf(dirUri: string): string {
  const s: string = hierPathOf(dirUri);
  if (s.length === 0) {
    return '';
  }
  // UP_NAV_NONE = 解析不出层级；UNKNOWN 态虽定不出卷根但 upLooseParentOf 仍可上移，
  // 与 browseUp() 的判定保持完全一致，绝不在这里另立一套标准。
  if (upNavStateOf(s) === UP_NAV_NONE) {
    return '';
  }
  return s;
}

/** 从持久授权的原始目录 URI 还原「当前目录的 picker 原始写法」，供 browseDir / pickRootUri。
 *
 *  · 带 scheme 的原始 URI 是 picker 逐 URI 授权唯一认得的形态：
 *    upParentCandidates 靠它生成父层候选，pickerStartOf 靠它定位已授权起点；
 *  · 只去 ? 参数与尾斜杠，不解码、不还原成纯路径（那会丢掉授权信息）。 */
export function upContextRawOf(dirUri: string): string {
  const s: string = stripTrailingSlash(dirUri);
  if (s.indexOf('://') < 0) {
    return '';
  }
  return s;
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

// --------------------------------------------------------------------
// 「往上层」在 APP 内自建清单（2026-11-11 第四次实机反馈）
//
// 用户明确：按「回上层」弹出系统选择目录 dialog 不是原意，原意是**在 APP 内**
// 显示上层的档案目录或档案清单。上级目录的逐 URI 授权失效时列不出真实内容，
// 但不能因此把界面交给系统选择器 —— 至少要把已知的目录层级 / 条目名画在左栏里。
// 下面两个函数全是纯字符串运算，绝不 listFile / statSync / 弹选择器。
// --------------------------------------------------------------------

/** 从卷根到 path 的**每一级**完整路径（含 path 自身），供左栏生成可点的目录清单行。
 *
 *  · 用 hierPathOf 归一化后按 volumeRootOf 定卷根，再逐段累加 —— 与 upLevelOf
 *    严格同一口径，保证清单层级与「往上层」的逐级上移判定一致，不会越级；
 *  · 返回的每一项都是可直接交给 openFolder 的真实路径；
 *  · 解析不出层级（文档 URI 碎片）时返回 []，调用方退化为「只列已知子目录」。
 *  · 纯字符串，零 IO：这是启动恢复后也能安全调用的关键（历史 appfreeze 底线）。 */
export function pathChainOf(path: string): string[] {
  const out: string[] = [];
  const s: string = hierPathOf(path);
  if (s.length === 0) {
    return out;
  }
  const root: string = volumeRootOf(s);
  if (root.length === 0) {
    return out;
  }
  out.push(root);
  if (s === root || s === '/') {
    return out;
  }
  let cur: string = root === '/' ? '' : root;
  const rest: string = s.substring(root.length);
  const parts: string[] = rest.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length === 0) {
      continue;
    }
    cur = cur + '/' + parts[i];
    out.push(cur);
  }
  return out;
}

/** APP 内上层清单的提示文案。**明确写「不会弹出系统选择器」**，
 *  避免用户以为按钮又没反应（按钮与列表恒可点，点了必须有可见反馈）。 */
export function inAppUpListHint(dirName: string, count: number, tag: string): string {
  return 'APP 内上层「' + dirName + '」清单（' + count +
    ' 项）· 点目录名进入 · 不弹系统选择器 · ' + tag;
}

// --------------------------------------------------------------------
// 第二十九轮：上层清单「完整性」纯函数（2026-11-16，R29）
//
// 真机截图（screenshot_20261116_045747）：父层 [青丘图鉴] Nine tail Photography
// 的 APP 内清单只有 2026 一个真实目录，另混进两条带文件夹图标的
// 「— 上层清单（APP 内）· 点目录名进入 · ul1 —」伪目录行。
// 根因不在目录名筛选（源码里没有任何 2026 字面量过滤），而在：
//   ① openFolder 缓存用的是 this.rows（上一屏 UI 行），APP 内清单态时里面
//      含说明行 → 伪行被当成真实目录写进缓存；
//   ② lastUpNames 是**单槽**，进入任一层就覆盖，父层那份完整清单丢失，
//      showUpListInApp 的 sameDirPath 命中不了就只剩「恒列当前目录」= 2026；
//   ③ showUpListInApp 渲染缓存时不辨真伪，把说明行画成可点文件夹。
// 下面三个纯函数分别负责：伪行识别、多源清单聚合、授权同形态父 URI 还原。
// --------------------------------------------------------------------

/** APP 内上层清单里的「伪条目名」：空的、`..`、以及清单自己追加的说明行。
 *  这些字符串来自清单视图本身，**不是**父目录的真实子目录，既不能写进
 *  目录快照缓存，也不能被渲染成可点击的文件夹行。
 *  ⚠️ 只按 APP 自己生成的说明行特征匹配，绝不用「含数字 / 含年份 / 含点号」
 *  这类会误伤真实目录名的规则（真机上 `2025`、`4 中`、`Vol.2` 都是合法目录名）。 */
export function isUpListPseudoName(name: string): boolean {
  const s: string = name.trim();
  if (s.length === 0 || s === '..' || s === '.') {
    return true;
  }
  // 说明行：'— 上层清单（APP 内）· 点目录名进入 · ul1 —'（tag 可能升级）
  if (s.indexOf('上层清单') >= 0 && s.indexOf('APP 内') >= 0) {
    return true;
  }
  return false;
}

/** 聚合「同一父层的全部真实子目录名」。
 *
 *  groups 是多份来源（多层会话快照、同一层不同 URI 形态的多次列目录、
 *  当前目录名…）。逐组按原顺序收纳、过滤伪行、按**原名**去重（不 trim 原名，
 *  真机目录名可能带首尾空格），绝不因为后一份来源覆盖前一份而漏掉条目。
 *  返回值可直接逐行渲染 —— 只要缓存里出现过，非 2026 的兄弟目录一定在。 */
export function mergeUpListNames(groups: Array<Array<string>>): Array<string> {
  const out: Array<string> = [];
  const seen: Set<string> = new Set<string>();
  for (let g = 0; g < groups.length; g++) {
    const list: Array<string> = groups[g];
    for (let i = 0; i < list.length; i++) {
      const nm: string = list[i];
      if (isUpListPseudoName(nm) || seen.has(nm)) {
        continue;
      }
      seen.add(nm);
      out.push(nm);
    }
  }
  return out;
}

/** 用「已授权的原始目录 URI」还原目标父层的**同形态** URI。
 *
 *  picker 的逐 URI 授权按 URI 字符串发放：`file://<host>/.../子目录` 被授权，
 *  换成纯路径 `/storage/userExternal/<host>/.../子目录` 去 listFile 往往就没授权。
 *  而 openFolder 每次成功都会把 browseDir 覆写成子目录路径，原始授权形态会丢。
 *  这里按规范层级键算出层级差，从 rootUri 字符串尾部剥掉多出的段数，
 *  得到与授权 URI 完全同 scheme / 同编码习惯的父层写法。
 *
 *  rootUri 必须落在 target 层或 target 的子层；越级 / 旁支 / 判不出层级
 *  一律返回空串，绝不凭空造路径。剥完再用 canonicalLevelKeyOf 复核落层。 */
export function rootFormParentOf(rootUri: string, target: string): string {
  const rootKey: string = canonicalLevelKeyOf(rootUri);
  const targetKey: string = canonicalLevelKeyOf(target);
  if (rootKey.length === 0 || targetKey.length === 0) {
    return '';
  }
  if (rootKey !== targetKey && rootKey.indexOf(targetKey + '/') !== 0) {
    return '';
  }
  let s: string = stripTrailingSlash(rootUri);
  const q: number = s.indexOf('?');
  if (q >= 0) {
    s = s.substring(0, q);
  }
  const extra: number = rootKey.split('/').length - targetKey.split('/').length;
  for (let i = 0; i < extra; i++) {
    const j: number = s.lastIndexOf('/');
    if (j < 0) {
      return '';
    }
    s = j === 0 ? '/' : s.substring(0, j);
  }
  if (s.length === 0 || canonicalLevelKeyOf(s) !== targetKey) {
    return '';
  }
  return s;
}

// --------------------------------------------------------------------
// 第三十轮：重启后「往上层」的层级与内容恢复（2026-11-18，R30）
//
// 实机复现：退出 APP 前在 picker 授权根的**子目录**里看图（例如
// `…/2026/编号202618 模特 奶茶`），重新打开后点「返回上层」—— 显示的
// 层级与内容都不对。根因：browseBase（用户实际所在的浏览层级）从不持久化，
// restoreBrowseContext 只用 savedDirUri（picker 授权根）重建层级。于是：
//   ① 层级跳级：返回上层从授权根（2026）起算，直接跳到它的父级
//      （Nine tail Photography），越过了用户实际所在目录的直接父级（2026）；
//   ② 内容缺失：那个父级没有逐 URI 授权，openFolder 全部失败降级成
//      APP 内清单；而重启后 upDirCache / lastUpNames 全空（纯内存态），
//      聚合结果只剩「恒列当前目录」一项。
// 修复：把「实际浏览层级」与「多层清单快照」一并持久化，恢复时校验后回填。
// 下面四个纯函数分别负责：层级从属校验、恢复层级裁决、授权同形态深层 URI、
// 快照文本编解码。全部零 IO，可被 node --experimental-strip-types 直接回归。
// --------------------------------------------------------------------

/** path 的层级是否等于 anchor、或在 anchor 之下（任意深度）。
 *  用规范层级键比较，NAS 的 scheme / 挂载前缀 / 百分号编码形态差异已被抹平。 */
export function isSameOrUnderLevelOf(anchor: string, path: string): boolean {
  const a: string = canonicalLevelKeyOf(anchor);
  const p: string = canonicalLevelKeyOf(path);
  if (a.length === 0 || p.length === 0) {
    return false;
  }
  return p === a || p.indexOf(a + '/') === 0;
}

/** 重启恢复时的浏览层级裁决：优先采用持久化的「实际浏览层级」，
 *  但仅当它与 picker 授权根同层、或位于授权根之下时才可信（防止老数据 /
 *  换过授权根之后的脏层级混进来）；否则回退 picker 根（R29 及之前的语义）。
 *  picker 根解析不出层级时同样回退 —— 与旧版 restoreBrowseContext 的
 *  早退条件保持一致，绝不因为 persisted 看起来可用就放宽闸门。 */
export function restoreBrowseLevelOf(persisted: string, pickerUri: string): string {
  const pick: string = upContextBaseOf(pickerUri);
  if (persisted.length === 0) {
    return pick;
  }
  const pb: string = upContextBaseOf(persisted);
  if (pb.length === 0 || pick.length === 0) {
    return pick;
  }
  return isSameOrUnderLevelOf(pick, pb) ? pb : pick;
}

/** 用 picker 原始授权 URI 的**同形态**拼出更深层目录的 URI。
 *
 *  逐 URI 授权按 URI 字符串发放：browseDir 只有保持与授权相同的
 *  scheme / 编码习惯，upParentCandidates ① 剥一层得到的父 URI 才最可能
 *  被 fs.listFile 认可（这正是 R29 extraRoots 同形态思路的深层版）。
 *  · base 与 picker 根同层 → 原样返回 pickerRaw；
 *  · base 在 picker 根之下 → 逐段追加（pickerRaw 含 % 时逐段编码，保持编码习惯）；
 *  · base 不在 picker 根之下 / 解析不出层级 → 空串，绝不凭空造路径。 */
export function rawBrowseFormOf(pickerRaw: string, base: string): string {
  const raw: string = stripTrailingSlash(pickerRaw);
  if (raw.length === 0 || base.length === 0) {
    return '';
  }
  const rawHier: string = stripTrailingSlash(hierPathOf(raw));
  const b: string = stripTrailingSlash(hierPathOf(base));
  if (rawHier.length === 0 || b.length === 0) {
    return '';
  }
  if (b === rawHier) {
    return raw;
  }
  if (b.indexOf(rawHier + '/') !== 0) {
    return '';
  }
  const suffix: string = b.substring(rawHier.length + 1);
  const parts: string[] = suffix.split('/');
  const encoded: boolean = raw.indexOf('%') >= 0;
  let out: string = raw;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length === 0) {
      continue;
    }
    let seg: string = parts[i];
    if (encoded) {
      try {
        seg = encodeURIComponent(seg);
      } catch (e) {
        return '';
      }
    }
    out = out + '/' + seg;
  }
  return out;
}

/** 多层目录清单快照的持久化载体。
 *  只存 path / names / kinds —— uris 在重启后授权形态可能已失效，
 *  恢复时留空，由调用方按层拼（upListUriOf 本来就有 target + 名字兜底）。 */
export interface UpCacheLevel {
  path: string;
  names: Array<string>;
  kinds: Array<number>;
}

/** 行内分隔符（SOH / STX）：文件名里不可能出现，比逗号 / 竖线安全。 */
const UP_CACHE_SEP: string = '\u0001';
const UP_CACHE_KIND_SEP: string = '\u0002';

/** 编码多层快照：每层一行 `path(\u0001name\u0002kind)*`，行间换行分隔。
 *  只收**尾部**（最近浏览的）maxLevels 层；每层只收前 maxNames 条；
 *  总长度超过 maxChars 就停止追加（preferences 是轻量 KV，绝不塞大 value）。
 *  编码侧不做伪行过滤 —— 缓存里本来就只有真实条目（R29 已从源头保证）。 */
export function encodeUpCacheText(levels: Array<UpCacheLevel>,
  maxLevels: number, maxNames: number, maxChars: number): string {
  if (levels.length === 0 || maxLevels <= 0 || maxNames <= 0 || maxChars <= 0) {
    return '';
  }
  const start: number = levels.length > maxLevels ? levels.length - maxLevels : 0;
  const lines: string[] = [];
  let total: number = 0;
  for (let i = start; i < levels.length; i++) {
    const lv: UpCacheLevel = levels[i];
    const p: string = stripTrailingSlash(lv.path);
    if (p.length === 0) {
      continue;
    }
    let line: string = p;
    const cap: number = lv.names.length > maxNames ? maxNames : lv.names.length;
    for (let j = 0; j < cap; j++) {
      const nm: string = lv.names[j];
      if (nm.length === 0) {
        continue;
      }
      const kd: number = j < lv.kinds.length ? lv.kinds[j] : -1;
      line = line + UP_CACHE_SEP + nm + UP_CACHE_KIND_SEP + kd;
    }
    if (line.length > maxChars) {
      continue;                          // 单行超长（异常脏数据）：整层丢弃
    }
    if (lines.length > 0 && total + line.length + 1 > maxChars) {
      break;                             // 再加就超总长：到此为止
    }
    lines.push(line);
    total = total + line.length + 1;
  }
  return lines.join('\n');
}

/** 解码多层快照并**逐项校验**：path 必须解析得出层级键；条目名剔除伪行
 *  （空 / `..` / APP 自己的说明行）；kind 解析失败按 -1（未知）处理；
 *  同层多次出现时保留最后一份；层与条目都按上限截断。
 *  任何脏数据（分隔符缺失 / 超界下标）都静默跳过，绝不抛出 ——
 *  这段代码跑在启动恢复链上，容错优先。 */
export function decodeUpCacheText(text: string,
  maxLevels: number, maxNames: number): Array<UpCacheLevel> {
  const out: Array<UpCacheLevel> = [];
  if (text.length === 0 || maxLevels <= 0 || maxNames <= 0) {
    return out;
  }
  const lines: string[] = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    if (line.length === 0) {
      continue;
    }
    const parts: string[] = line.split(UP_CACHE_SEP);
    if (parts.length < 1) {
      continue;
    }
    const p: string = stripTrailingSlash(parts[0]);
    if (p.length === 0 || canonicalLevelKeyOf(p).length === 0) {
      continue;
    }
    const names: Array<string> = [];
    const kinds: Array<number> = [];
    for (let j = 1; j < parts.length; j++) {
      const seg: string = parts[j];
      const k: number = seg.indexOf(UP_CACHE_KIND_SEP);
      if (k <= 0) {
        continue;
      }
      const nm: string = seg.substring(0, k);
      const kdRaw: string = seg.substring(k + 1);
      const kd: number = Number(kdRaw);
      if (isUpListPseudoName(nm) || names.length >= maxNames) {
        continue;
      }
      names.push(nm);
      kinds.push(Number.isNaN(kd) ? -1 : kd);
    }
    if (names.length === 0) {
      continue;
    }
    // 同层去重：保留最后一份（越靠后越新）。
    let hit: number = -1;
    for (let j = 0; j < out.length; j++) {
      if (sameDirPath(out[j].path, p)) {
        hit = j;
        break;
      }
    }
    const lv: UpCacheLevel = { path: p, names: names, kinds: kinds };
    if (hit >= 0) {
      out[hit] = lv;
    } else {
      out.push(lv);
    }
  }
  if (out.length > maxLevels) {
    return out.slice(out.length - maxLevels);
  }
  return out;
}

// --------------------------------------------------------------------
// 第三十一轮：preferences 安全编解码（2026-11-18，R31）
//
// 回归根因：R30 的 encodeUpCacheText 用 U+0001(SOH) / U+0002(STX) 作行内
// 分隔符，并把整段文本**直接**写进 preferences。HarmonyOS preferences 以
// XML 持久化，C0 控制字符是 XML 1.0 非法字符 —— putSync / flushSync 会抛
// 异常或写坏整个 KV 文件。R30 又把这个写入排在核心位置 key 的 flush 之前、
// 把读取与恢复排程共用同一个 try，于是：退出时核心「位置 / 相片 / 授权根」
// 没落盘、启动时 scheduleShowLast() 不排程 —— 重开既不恢复图片，
// browseBase 也重建不了，点「往上层」像没反应。
//
// 修复（治本）：持久化边界把 C0 控制字符 + '%' 百分号编码成纯可打印文本，
// 读回后反转义还原成 decodeUpCacheText 认得的原始行式文本。带版本前缀 P1:
// 做鉴别 —— 只有本轮写入的文本才反转义，R30 遗留的裸文本 / 含 %XX 编码的
// NAS 路径一律原样透传（decodeUpCacheText 本就按 SOH/STX 分割），零回归。
// 两个函数纯字符串、零 IO、零抛出，可被 Node 直接回归。
// --------------------------------------------------------------------

/** 编码前缀：带它的文本是本轮写入的转义文本，才需要反转义。
 *  路径不会以 `P1:` 开头（encodeUpCacheText 首行必是 / 或 scheme），不会误判。 */
const PREFS_SAFE_TAG: string = 'P1:';
const PREFS_HEX: string = '0123456789ABCDEF';

/** 把含控制字符的行式文本编码成 preferences(XML) 安全的可打印单行文本。
 *  · `%` → `%25`（先转义，避免与 %XX 歧义，保证可逆）；
 *  · C0 控制字符（`\n` / SOH / STX …，code < 0x20）与 DEL(0x7F) → `%` + 两位大写 hex；
 *  · 中文 / 常规可打印字符原样保留（UTF-8 在 XML 中合法，避免体积膨胀）；
 *  · 输出恒带 `P1:` 前缀供 prefsSafeDecode 鉴别；空串返回空串。 */
export function prefsSafeEncode(raw: string): string {
  if (raw.length === 0) {
    return '';
  }
  let out: string = PREFS_SAFE_TAG;
  for (let i = 0; i < raw.length; i++) {
    const c: number = raw.charCodeAt(i);
    if (c === 0x25) {
      out += '%25';
    } else if (c < 0x20 || c === 0x7F) {
      out += '%' + PREFS_HEX.charAt((c >> 4) & 0x0F) + PREFS_HEX.charAt(c & 0x0F);
    } else {
      out += raw.charAt(i);
    }
  }
  return out;
}

/** 还原 prefsSafeEncode 的文本；非本轮写入的文本（无 P1: 前缀：R30 裸文本 /
 *  空串 / 含 %XX 编码路径 / 脏数据）原样返回，兼容性零回归、绝不抛异常。 */
export function prefsSafeDecode(safe: string): string {
  if (safe.length <= PREFS_SAFE_TAG.length || safe.indexOf(PREFS_SAFE_TAG) !== 0) {
    return safe;
  }
  const body: string = safe.substring(PREFS_SAFE_TAG.length);
  let out: string = '';
  for (let i = 0; i < body.length; i++) {
    if (body.charAt(i) === '%' && i + 2 < body.length) {
      const h: number = prefsHexNib(body.charAt(i + 1));
      const l: number = prefsHexNib(body.charAt(i + 2));
      if (h >= 0 && l >= 0) {
        out += String.fromCharCode(h * 16 + l);
        i += 2;
        continue;
      }
    }
    out += body.charAt(i);
  }
  return out;
}

/** 是否为 R30 遗留的「坏」清单快照文本（含裸 SOH/STX 控制字符）。
 *  R31 写入的是 P1: 转义文本，不含裸控制字符；R30 直接写原始行式文本，
 *  必含 U+0001/U+0002。用于启动时一次性识别并自愈（清死路径标记 + 忽略坏数据）。 */
export function prefsIsLegacyBadCache(text: string): boolean {
  return text.indexOf('\u0001') >= 0 || text.indexOf('\u0002') >= 0;
}

/** 十六进制字符 → 数值；非十六进制返回 -1（用于残缺 %XX 容错）。 */
function prefsHexNib(ch: string): number {
  const c: number = ch.charCodeAt(0);
  if (c >= 0x30 && c <= 0x39) {
    return c - 0x30;
  }
  if (c >= 0x41 && c <= 0x46) {
    return c - 0x41 + 10;
  }
  if (c >= 0x61 && c <= 0x66) {
    return c - 0x61 + 10;
  }
  return -1;
}
