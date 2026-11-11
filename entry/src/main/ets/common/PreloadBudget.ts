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
 */

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
