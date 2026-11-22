/**
 * 第六十四轮：左栏目录「内容量」统计与展示的决策真值源（零 SDK / 零文件 IO）。
 *
 *  单独抽成 .ts 模块：不依赖任何鸿蒙 SDK，可用 Node 24 的
 *  `node --experimental-strip-types` 直接回归（见 `tests/dirname.test.mjs`）。
 *
 *  「按项目现有口径统计」的准确含义：内容量 = 该目录**下一层**按 `fs.listFile`
 *  非递归列出来的**可见条目数** —— 与 `pages/Index.ets` 的 `openFolder()` 建
 *  `rows` 时用的同一套口径（`HIDE_DOT_FILES` 过滤隐藏点文件 / 空名 / `.` / `..`，
 *  多个 URI 写法的结果由 `mergeExploreNames` 合并去重）。也就是 `openFolder`
 *  最终画出来的左栏行数减去恒列的「..」行；图片 / 子文件夹 / 文本 / 其它文件
 *  各算一项，绝不递归进子目录、绝不逐个 statSync（后台扫描必须非阻塞）。
 *  `dcImageCountOf` 另按 `IMAGE_SUFFIXES` 数出其中「可预览图片张数」，只作
 *  hilog 诊断与后续扩展用，不改变展示的主口径。
 *
 *  真正的 `fs.listFile` / preferences / 定时器全在 Index.ets；本模块只做：
 *    · 统计口径（计数 / 分类 / 四态 / 文案）
 *    · 缓存有效期（TTL 夹界、过期判定、周期心跳、LRU 淘汰量）
 *    · 空闲扫描闸门（应用空闲判定、是否放行一次扫描）
 *  与工程既有 ResumeRefresh / TextScrollBar / ResizeQuality 同一条边界：
 *  **静态契约 + 纯函数 ≠ 真机验证，编译校验 ≠ 真机验证**。
 */

// --------------------------------------------------------------------
// 统计结果四态。数字常量而非 enum：ArkTS 对纯数值常量最稳，也便于 hilog 打印。
// --------------------------------------------------------------------
export const DC_PENDING: number = 0;   // 缓存缺失 / 已过期 / 已失效，等空闲重扫
export const DC_OK: number = 1;        // 真实列举成功且有可见内容
export const DC_EMPTY: number = 2;     // 真实列举成功但 0 个可见条目（空目录）
export const DC_FAIL: number = 3;      // 列举失败（逐 URI 授权 / 网络 / 路径失效）

/** 四态在左栏目录行既有「字节」列位上的展示文案：同字号 10 / 同色 #7f88a8 /
 *  同宽 66 / 同右对齐，不新增列、不改行高、不改交互。 */
export const DC_LABEL_PENDING: string = '…';
export const DC_LABEL_FAIL: string = '失败';
export const DC_LABEL_EMPTY: string = '空';

// --------------------------------------------------------------------
// 缓存有效期（可由 preferences 小 key 设置）与按设定周期自动刷新
// --------------------------------------------------------------------
export const DC_TTL_DEFAULT_MS: number = 300000;   // 默认 5 分钟
export const DC_TTL_MIN_MS: number = 30000;        // 30 秒下限：再短会退化成频繁列目录
export const DC_TTL_MAX_MS: number = 86400000;     // 24 小时上限
/** 空闲心跳周期上下界：即使 TTL 设到 24 小时，也保持这个节奏检查失效请求，
 *  刚进目录 / 目录被改动后最多几秒内就能开始补扫，不会让用户盯着「…」。 */
export const DC_TICK_MIN_MS: number = 1500;
export const DC_TICK_CAP_MS: number = 3000;

// --------------------------------------------------------------------
// 空闲触发与扫描预算：只在应用空闲时动手，一次心跳最多解几个目录
// --------------------------------------------------------------------
export const DC_IDLE_MS: number = 1500;      // 最后一次用户输入后的空闲阈值
export const DC_SCAN_PER_TICK: number = 2;  // 每次心跳最多扫 2 个目录（全异步）
export const DC_SCAN_TIMEOUT_MS: number = 4000; // 单次扫描挂起兜底，超时按失败处理
export const DC_CACHE_MAX: number = 256;     // 会话内缓存 LRU 上限
export const DC_ENTRY_CAP: number = 4000;    // 单目录计数封顶，防御异常大目录
export const DC_SCAN_SKIP: number = 0;
export const DC_SCAN_GO: number = 1;

/** 一条目录内容量缓存。at = 写入时刻（ms），0 = 缺失 / 已失效。 */
export interface DirCountEntry {
  state: number;   // DC_PENDING / DC_OK / DC_EMPTY / DC_FAIL
  count: number;   // 可见条目数（PENDING / FAIL 时为 0）
  images: number;  // 其中可预览图片张数（现有口径的「张」，诊断用）
  at: number;      // 统计落地时刻
}

/** TTL 夹界：未设置 / 0 / 负数 / NaN / 脏值一律回默认；越界夹到 [min, max]。
 *  `!(ms > 0)` 同时挡住 NaN 与 0，避免依赖 ArkTS 上不保证存在的 Number.isFinite。 */
export function dcTtlClampOf(ms: number): number {
  if (!(ms > 0)) {
    return DC_TTL_DEFAULT_MS;
  }
  if (ms < DC_TTL_MIN_MS) {
    return DC_TTL_MIN_MS;
  }
  if (ms > DC_TTL_MAX_MS) {
    return DC_TTL_MAX_MS;
  }
  return ms;
}

/** 设置值是否落在合法区间（写入 preferences 前校验，脏值不落盘）。 */
export function dcTtlSafeOf(ms: number): boolean {
  return ms >= DC_TTL_MIN_MS && ms <= DC_TTL_MAX_MS;
}

/** 心跳周期：按设定的 TTL 缩放，但恒夹在 [1.5s, 3s]。
 *  TTL 真正决定是否重扫由 dcExpiredOf 负责；心跳只决定「多久检查一次」。 */
export function dcRefreshTickOf(ttlMs: number): number {
  const ttl: number = dcTtlClampOf(ttlMs);
  const v: number = Math.min(ttl, DC_TICK_CAP_MS);
  return Math.max(v, DC_TICK_MIN_MS);
}

/** 缓存是否缺失 / 过期：缺失、时钟未就绪、时钟回拨、TTL 非法一律视为过期。
 *  「过期」= 不再把缓存里的旧数字当权威展示，也不再跳过重扫。 */
export function dcExpiredOf(at: number, now: number, ttlMs: number): boolean {
  if (!(ttlMs > 0)) {
    return true;
  }
  if (!(at > 0) || !(now > 0)) {
    return true;
  }
  if (now < at) {
    return true; // 系统时钟回拨：旧值不可信，重扫一次
  }
  return now - at >= ttlMs;
}

/** 应用是否「空闲」：距最后一次用户输入达到阈值，且时间戳干净。
 *  lastInputAt=0（还没记过输入）一律不算空闲 —— 启动恢复期绝不抢 IO。 */
export function dcIdleOf(lastInputAt: number, now: number, idleMs: number): boolean {
  if (!(idleMs > 0) || !(lastInputAt > 0) || !(now > 0)) {
    return false;
  }
  if (now < lastInputAt) {
    return false;
  }
  return now - lastInputAt >= idleMs;
}

/** 应用级空闲闸门：九个条件全满足才算「可以动磁盘」。
 *  与既有 1.5s mtime 轮询 / R56 返回刷新 / R57 冷启动补刷的让路条件同源：
 *  在途列举 / 幻灯片 / mtime 探测 / picker 一律让路；页面已销毁、恢复链未收口、
 *  只读名单态、非目录浏览态一律不扫。 */
export function dcAppIdleOf(folderBusy: boolean, playing: boolean,
  mtimeBusy: boolean, pickerBusy: boolean, pageAlive: boolean,
  resumeDone: boolean, idle: boolean, ioOk: boolean, hasDir: boolean): boolean {
  return !folderBusy && !playing && !mtimeBusy && !pickerBusy &&
    pageAlive && resumeDone && idle && ioOk && hasDir;
}

/** 是否放行一次扫描：空闲 + 没有在途扫描 + 该条目确实需要重扫。 */
export function dcScanActionOf(idleOk: boolean, scanBusy: boolean,
  needRescan: boolean): number {
  return (idleOk && !scanBusy && needRescan) ? DC_SCAN_GO : DC_SCAN_SKIP;
}

// --------------------------------------------------------------------
// 统计口径（与 openFolder 的可见行过滤逐条对齐）
// --------------------------------------------------------------------

/** 按现有口径过滤出可见条目名：空名 / `.` / `..` / 点隐藏文件一律不计。
 *  cap>0 时计数封顶（防御性，避免异常大目录生成超长数组）。 */
export function dcVisibleNamesOf(names: Array<string>, hideDotFiles: boolean,
  cap: number): Array<string> {
  const out: Array<string> = [];
  for (let i: number = 0; i < names.length; i++) {
    const nm: string = names[i];
    if (nm.length === 0 || nm === '.' || nm === '..') {
      continue;
    }
    if (hideDotFiles && nm.charAt(0) === '.') {
      continue;
    }
    out.push(nm);
    if (cap > 0 && out.length >= cap) {
      break;
    }
  }
  return out;
}

/** 内容量主口径：可见条目数（不递归、不 stat）。 */
export function dcCountOf(names: Array<string>, hideDotFiles: boolean,
  cap: number): number {
  return dcVisibleNamesOf(names, hideDotFiles, cap).length;
}

/** 取小写后缀（带点）；无后缀返回空串。与 Index.ets 的 isImageName 同形。 */
export function dcSuffixOf(name: string): string {
  const dot: number = name.lastIndexOf('.');
  return dot < 0 ? '' : name.substring(dot).toLowerCase();
}

/** 其中「可预览图片」张数：按工程现有 IMAGE_SUFFIXES 口径，大小写不敏感。
 *  只作诊断 / 后续扩展，展示仍以 dcCountOf 的总条目数为准。 */
export function dcImageCountOf(names: Array<string>, hideDotFiles: boolean,
  imageSuffixes: Array<string>): number {
  const visible: Array<string> = dcVisibleNamesOf(names, hideDotFiles, 0);
  let n: number = 0;
  for (let i: number = 0; i < visible.length; i++) {
    const ext: string = dcSuffixOf(visible[i]);
    for (let j: number = 0; j < imageSuffixes.length; j++) {
      if (ext === imageSuffixes[j].toLowerCase()) {
        n++;
        break;
      }
    }
  }
  return n;
}

/** 一次扫描落地后的状态判定：列举失败优先；成功但 0 项 = 空目录。 */
export function dcStateOf(count: number, scanOk: boolean): number {
  if (!scanOk) {
    return DC_FAIL;
  }
  if (count <= 0) {
    return DC_EMPTY;
  }
  return DC_OK;
}

/** 四态 → 展示文案。OK 显示「N 项」，与既有「N 张 / N 个子文件夹」同一紧凑风格。 */
export function dcLabelOf(state: number, count: number): string {
  if (state === DC_FAIL) {
    return DC_LABEL_FAIL;
  }
  if (state === DC_EMPTY) {
    return DC_LABEL_EMPTY;
  }
  if (state === DC_OK && count > 0) {
    return count + ' 项';
  }
  return DC_LABEL_PENDING;
}

/** 缓存条目 → 展示文案（端到端）：缓存缺失或已过期时，成功/空目录的旧数字
 *  都不再当作权威展示，统一回到「…」等待空闲重扫；失败态保留「失败」直到重试。 */
export function dcEntryLabelOf(entry: DirCountEntry, now: number,
  ttlMs: number): string {
  if (entry.state !== DC_FAIL && dcExpiredOf(entry.at, now, ttlMs)) {
    return DC_LABEL_PENDING;
  }
  return dcLabelOf(entry.state, entry.count);
}

/** 该条目是否需要重扫：待统计恒需要；成功 / 空目录 / 失败按 TTL 到期重扫，
 *  这就是「按设定周期自动刷新」——周期由 TTL 设置决定。 */
export function dcNeedRescanOf(entry: DirCountEntry, now: number,
  ttlMs: number): boolean {
  return entry.state === DC_PENDING || dcExpiredOf(entry.at, now, ttlMs);
}

/** LRU 超出上限时应淘汰的条数（纯数值，淘汰动作在 Index.ets）。 */
export function dcEvictCountOf(size: number, max: number): number {
  if (!(max > 0) || !(size > max)) {
    return 0;
  }
  return size - max;
}

/** TTL 设置变更后的状态栏文案（纯字符串拼接、零 IO）。 */
export function dcTtlLabelOf(ttlMs: number): string {
  const ms: number = dcTtlClampOf(ttlMs);
  if (ms < 60000) {
    return Math.round(ms / 1000) + ' 秒';
  }
  if (ms < 3600000) {
    return Math.round(ms / 60000) + ' 分钟';
  }
  return Math.round(ms / 3600000) + ' 小时';
}

export function dcTtlHintOf(ttlMs: number): string {
  return '目录内容量缓存有效期：' + dcTtlLabelOf(ttlMs) + ' · 空闲时按此周期自动刷新';
}
