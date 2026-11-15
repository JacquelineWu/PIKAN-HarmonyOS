/**
 * 原始档案数据（未解码 bytes）的内存缓存策略（2026-11-12 第八轮）——纯函数，
 * 无 IO / 无鸿蒙 SDK 依赖，Node 24 可直接 import 回归
 * （`node --experimental-strip-types tests/dirname.test.mjs`）。
 *
 * 用户要求：「档案数据完全载入内存同时解码以提高图片档案载入速度」。
 *
 * 背景：第七轮只缓存了**解码后**的 PixelMap，但 decodePx() 仍对每个 uri 做
 * `fs.openSync` + `image.createImageSource(fd)`。NAS / 网络目录上这两步都是跨进程 /
 * 跨网络往返，载入整库时被重复放大；全屏放大、EXIF/HDR/ICC 重解时还要再读一遍文件。
 * 第八轮把「原始档案数据」也纳入内存：载入链按受控并发把每个文件的完整 bytes
 * 读进 RawStore（ArrayBuffer LRU），decodePx 直接 `image.createImageSource(ArrayBuffer)`，
 * 同一 uri 的在途读取合并成一次。
 *
 * 为什么仍要预算而不是无条件全量：PixelMap 缓存已有 1GB 上限，原始 bytes 若无限堆积，
 * 两者相加会直接把设备打爆（历史 appfreeze 的根因就是无节制批量 IO / 内存）。
 * 这里只负责「单文件能不能进内存 / 为了插入要淘汰几条 / 一次读取是否完整 / 是否启动预取」，
 * 真正的 ArrayBuffer 生命周期、LRU 顺序与 IO 仍留在 Index.ets 的 RawStore。
 */

/** 有限数判断：刻意不依赖 Number 命名空间的静态成员（ArkTS 严格模式支持程度不一致）。 */
function finiteOf(v: number): boolean {
  return v - v === 0;
}

function nonNegOf(v: number): number {
  return finiteOf(v) && v > 0 ? Math.trunc(v) : 0;
}

/** 一次「插入 LRU」的准入与淘汰计划。 */
export interface RawFit {
  /** 这份数据能否驻留缓存。false 时调用方**仍可**用刚读到的 bytes 完成本次解码，只是不入缓存。 */
  keep: boolean;
  /** 为了让「插入后张数 / 字节都不超预算」，需要从 LRU 队头淘汰的条数。 */
  evict: number;
}

/** 计算把 incoming 字节的档案数据插入缓存前，需要从队头淘汰多少条。
 *
 *  `sizes` 是队头（最旧）到队尾（最新）各条的 byteLength。判据同 PixelMap 缓存：
 *  张数 <= maxCount 且总字节 <= maxBytes。全淘汰后只剩 incoming 一条，只要
 *  incoming <= maxBytes 就一定能放下，故 keep=true 时 evict 必然够用，不会出现
 *  「淘汰完还超预算」的死循环。
 *  · incoming 非正 / 单条就超过 maxBytes / maxCount 非正 → keep=false（不入缓存）；
 *  · 非有限数一律按 0 处理，绝不把 NaN 传进预算比较。 */
export function rawFitOf(sizes: number[], incoming: number,
  maxBytes: number, maxCount: number): RawFit {
  const inc: number = nonNegOf(incoming);
  const mb: number = nonNegOf(maxBytes);
  const mc: number = nonNegOf(maxCount);
  if (inc <= 0 || mb <= 0 || mc <= 0 || inc > mb) {
    return { keep: false, evict: 0 };
  }
  let bytes: number = inc;
  let count: number = 1;
  for (let i = 0; i < sizes.length; i++) {
    bytes += nonNegOf(sizes[i]);
    count++;
  }
  let evict: number = 0;
  while (evict < sizes.length && (count > mc || bytes > mb)) {
    bytes -= nonNegOf(sizes[evict]);
    count--;
    evict++;
  }
  return { keep: true, evict: evict };
}

/** 单个文件是否允许进内存缓存。
 *  size <= 0（stat 失败 / 空文件）一律拒绝；maxSingle <= 0 表示不限制单文件上限。
 *  超大 RAW / 视频截帧不进缓存，避免一张把整份预算吃光 —— 它们仍走 decodePx 的
 *  fd 兜底路径，功能不受影响。 */
export function rawSingleAllowed(size: number, maxSingle: number): boolean {
  const s: number = nonNegOf(size);
  if (s <= 0) {
    return false;
  }
  const m: number = nonNegOf(maxSingle);
  return m === 0 || s <= m;
}

/** 一次 fs.read（第二十七轮前是 readSync）是否把整个文件读满。
 *  图片容器（HEIC/JPEG/PNG）截断一字节都可能让 ImageSource 解析失败或只出半张，
 *  所以**没读满就绝不能把这块 ArrayBuffer 交给 createImageSource** —— 调用方降级回 fd 解码。 */
export function rawReadComplete(readBytes: number, size: number): boolean {
  const r: number = nonNegOf(readBytes);
  const s: number = nonNegOf(size);
  return s > 0 && r === s;
}

/** 全量预取的目标张数：整库与硬上限取小，非正数按 0 处理。 */
export function rawCacheTargetOf(total: number, cap: number): number {
  const t: number = nonNegOf(total);
  if (t === 0) {
    return 0;
  }
  const c: number = nonNegOf(cap);
  return c === 0 ? t : Math.min(t, c);
}

/** 是否启动原始档案数据预取链。
 *  ioAllowed 直接对应 ro1 只读名单态的 bulkIoAllowed()：恢复出来的一批死 uri
 *  绝不允许批量 open / read（历史整机卡死根因；第二十七轮起已真异步，闸门仍保留）。 */
export function rawPrefetchWanted(ioAllowed: boolean, total: number, cap: number): boolean {
  return ioAllowed && rawCacheTargetOf(total, cap) > 0;
}

// --------------------------------------------------------------------
// 第二十七轮：NAS 路径 THREAD_BLOCK_6S —— 真异步读取的「到点即放弃」判据
// --------------------------------------------------------------------
// 2026-11-16 实机 appfreeze：Current Running 是 fs.listFile，栈顶
//   read(Index.ets:1062) = fs.readSync → ensure(1035) 的 Promise.resolve(...)
//   → preloadOne → pumpAll → startAllPreload → schedulePreload → applyItems
//   → openFolder。ensure() 名义返回 Promise，实际 read() 在 Promise.resolve
//   的参数里就同步跑完了 4 个 fs.*Sync + new ArrayBuffer(size)；pumpAll 一批
//   4 张连续同步调用，NAS 网络往返叠加直接占满 UI 主线程 6 秒。
// 修复：read() 改 async + fs.stat/open/read/close 的 Promise 版，主线程在每个
//   await 处让出。异步化之后应用才**有可能**自己设超时（同步 IO 的超时由平台
//   决定、应用无法缩短，见 FailFast.ts 的边界声明），故补两个纯函数判据。

/** 单次原始档案读取的超时上限（ms）。
 *  · baseMs：固定基线，覆盖 open / close 的跨进程开销；
 *  · perMbMs：按文件体积追加，NAS 上的大文件给更宽容的窗口，避免误杀；
 *  · capMs：硬上限。死 NAS 路径上 fs.read 的 Promise 可能永不 settle，
 *    没有上限就会让 inflight / allActive 永久挂住，整条预载链假死。
 *  · 非有限数 / 负值一律按 0 归零；capMs>0 时结果夹在 [0, capMs]。
 *  · 返回有限整数，绝不把 NaN / Infinity 传进 setTimeout。 */
export function rawIoTimeoutMs(size: number, baseMs: number, perMbMs: number,
  capMs: number): number {
  const base: number = nonNegOf(baseMs);
  const per: number = nonNegOf(perMbMs);
  const cap: number = nonNegOf(capMs);
  const s: number = nonNegOf(size);
  const want: number = base + per * (s / (1024 * 1024));
  const bounded: number = cap > 0 ? Math.min(want, cap) : want;
  return Math.floor(bounded);
}

/** 读取失败 / 超时后，是否把该 uri 记入 denied（不再重试）。
 *  · genChanged（换数据源）不是这个 uri 本身的问题：绝不拉黑，
 *    否则新图库里同一个 uri 会被永久误判，正常图片再也进不了缓存；
 *  · ioFailed / timedOut：立即放弃（第十轮「遇到问题立即放弃」），
 *    本次解码仍可降级到 fd 路径，功能绝不受损。 */
export function rawDenyAfterFailure(genChanged: boolean, ioFailed: boolean,
  timedOut: boolean): boolean {
  if (genChanged) {
    return false;
  }
  return ioFailed || timedOut;
}
