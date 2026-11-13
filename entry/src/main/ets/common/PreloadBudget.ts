/** 后台预载的窗口 / 补齐顺序 / 预算纯计算。
 *
 *  单独抽成 .ts 模块：不依赖任何鸿蒙 SDK，可用 Node 24 的
 *  `node --experimental-strip-types` 直接回归（见 `tests/dirname.test.mjs`）。
 *
 *  2026-11-11：预载窗口由「前后各 50」扩到「前后各 100」后，窗口张数（201）
 *  常大于设备在字节上限内实际装得下的张数。若没有收工判据，预载链会陷入
 *  「解一张 → 触顶淘汰一张 → 又发现缺口 → 再解一张」的死循环（CPU 打满；
 *  历史上修过同一类问题：解码失败的图必须进 failed 黑名单）。
 *  用户要的是「**尽量**缓存前后 100 张」：窗口目标放宽，触到预算就收工，
 *  右下角角标显示真实驻留张数，不强行保证 201 张全驻留。
 *  2026-11-11 第四轮：用户要「全量缓存到内存、载入时同时预解码、加快滚轮跳转」。
 *  于是新增「全量顺序 / 受控并发批次 / 链是否重置」三件纯计算，供 Index.ets 的
 *  全量预载链使用；旧窗口链（前后各 100）保留为 PRELOAD_ALL=false 的回退路径。
 *  2026-11-13 第十二轮：新增「按当前 items 长度夹界」的批次挑选，修换源竞态崩溃。
 */

/** 全量预解码的遍历顺序（**绝对下标**，环绕，先近后远、前后交替，不含当前张）。
 *
 *  与 `preloadOrder`（相对 k，只覆盖窗口）不同：全量模式要把整个图库铺满，
 *  所以用绝对下标去重；`cur±k` 环绕到同一张时只留一次（total 为偶数、k=total/2 时会出现）。
 *  结果长度恒为 `total-1`，每个非当前下标恰好出现一次 —— 不会重复解码、不会漏图。 */
export function fullPreloadIndex(total: number, cur: number): number[] {
  const out: number[] = [];
  if (total <= 1) {
    return out;
  }
  const seen: Set<number> = new Set<number>();
  const c: number = ((cur % total) + total) % total;
  const span: number = total - 1;
  for (let k = 1; k <= span; k++) {
    const fwd: number = (c + k) % total;
    const back: number = ((c - k) % total + total) % total;
    if (!seen.has(fwd)) {
      seen.add(fwd);
      out.push(fwd);
    }
    if (!seen.has(back)) {
      seen.add(back);
      out.push(back);
    }
    if (out.length >= span) {
      break;
    }
  }
  return out;
}

/** 受控并发度：不是「无限同时解码」——`decodePx` 里的 `fs.openSync` 是同步跨进程调用，
 *  一次并发几百个会把主线程打满（历史 appfreeze 的成因）。
 *  图库小就自然降并发；cap 是硬上限，至少 1。 */
export function preloadConcurrencyOf(total: number, cap: number): number {
  if (total <= 1 || cap <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(cap, total - 1));
}

/** 从全量顺序里挑本批要解码的下标（跳过已缓存 / 已失败），并给出下一批起点。
 *  done = 已就绪（缓存命中或解码失败）的绝对下标集合，由调用方按当前快照构建。 */
export interface PreloadBatch {
  picks: number[];
  nextFrom: number;
}
export function preloadBatchOf(order: number[], from: number, conc: number,
  done: Set<number>): PreloadBatch {
  const picks: number[] = [];
  let i: number = from < 0 ? 0 : from;
  const n: number = conc > 0 ? conc : 1;
  while (i < order.length && picks.length < n) {
    if (!done.has(order[i])) {
      picks.push(order[i]);
    }
    i++;
  }
  return { picks: picks, nextFrom: i };
}

/** 换源竞态护栏：与 preloadBatchOf 相同，但按当前 items 长度夹掉越界的绝对下标。
 *
 *  全量预载的 order 是「建链那一刻」按旧 items 长度生成的绝对下标。若期间
 *  applyItems 换了数据源（新目录张数变少 / 顺序重排），旧批次回调仍可能带着
 *  旧 seq 活到这一刻；此时 order[i] 落在新 items 之外，`this.items[idx].uri`
 *  读到 undefined 会直接抛 TypeError 崩掉整个 APP（2026-11-13 实机 crash）。
 *  越界下标只跳过、不计入 picks，nextFrom 照常推进 —— 不卡住也不死循环。 */
export function preloadBatchBoundedOf(order: number[], from: number, conc: number,
  done: Set<number>, total: number): PreloadBatch {
  const picks: number[] = [];
  let i: number = from < 0 ? 0 : from;
  const n: number = conc > 0 ? conc : 1;
  while (i < order.length && picks.length < n) {
    const idx: number = order[i];
    if (idx >= 0 && idx < total && !done.has(idx)) {
      picks.push(idx);
    }
    i++;
  }
  return { picks: picks, nextFrom: i };
}

/** 位置变化（含滚轮连翻）时是否要重置预载链。
 *
 *  旧实现每次 `go()` / `schedulePreload()` 都 `preloadSeq++`，滚轮连翻时链被反复打断、
 *  每次都从「离最新位置最近的缺口」重新找起，前面解码白做 —— 这是滚轮跳读变慢的元凶。
 *  全量模式下顺序是**固定铺满整库**的，与当前位置无关，所以仅位置变化不该重置；
 *  只有「换数据源」必须作废旧链（旧 uri 已失效）。窗口模式维持原行为（窗口要跟着挪）。 */
export function shouldResetPreloadChain(allMode: boolean, sourceChanged: boolean): boolean {
  return sourceChanged || !allMode;
}

/** 全量缓存目标张数：整库，但夹在调用方给的容量上限内（内存 OOM 硬闸）。 */
export function fullCacheTargetOf(total: number, cap: number): number {
  if (total <= 0) {
    return 0;
  }
  return cap > 0 ? Math.min(total, cap) : total;
}

/** 期望窗口张数：前 back + 当前 1 + 后 fwd，环绕且不超过图库总数。
 *  与 Index.ets 的 wrapIndex / windowUris 口径一致：span 先夹到 total-1，
 *  避免图库比窗口小时绕整圈重复命中同一张。 */
export function preloadWindowSize(back: number, fwd: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const b: number = Math.min(back, total - 1);
  const f: number = Math.min(fwd, total - 1);
  return Math.min(total, b + f + 1);
}

/** 预载补齐顺序：相对当前位置的 k 序列，前后交替、先近后远。
 *  `[1, -1, 2, -2, …]`；前后 span 不等时，较长的一侧把剩余 k 补在后面。
 *
 *  交替而不是「先把前方 100 张全补完再补后方」：字节预算装不下整窗时，
 *  两个方向都能拿到相近的覆盖，不会变成「前方占满预算、后方一张都没有」——
 *  用户要的是「前后各 100 张」，往回滚也得能命中缓存。 */
export function preloadOrder(back: number, fwd: number): number[] {
  const out: number[] = [];
  const max: number = Math.max(back, fwd);
  for (let k = 1; k <= max; k++) {
    if (k <= fwd) {
      out.push(k);
    }
    if (k <= back) {
      out.push(-k);
    }
  }
  return out;
}

/** 预载是否该收工：张数或字节任一触顶（含「再加一张就会触顶」的提前量）。
 *
 *  · `cached = 0` → false：还没开始解，不能误判成预算已满。
 *  · 提前量按「当前平均每张占用」估算：只判 `bytes >= maxBytes` 的话，
 *    淘汰一张略大的旧图后 bytes 可能又跌回上限之下，链会继续「解→淘汰→解」，
 *    形成边界抖动；提前一张收工可彻底断掉这个循环。
 *  · `maxCount` / `maxBytes` 非正时视作该项不受限，避免配置写错把预载整个关掉。 */
export function preloadSaturated(cached: number, bytes: number, maxCount: number,
  maxBytes: number): boolean {
  if (cached <= 0) {
    return false;
  }
  if (maxCount > 0 && cached >= maxCount) {
    return true;
  }
  if (maxBytes <= 0) {
    return false;
  }
  if (bytes >= maxBytes) {
    return true;
  }
  const avg: number = bytes / cached;
  return bytes + avg >= maxBytes;
}
