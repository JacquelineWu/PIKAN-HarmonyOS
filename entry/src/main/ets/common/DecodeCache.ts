/**
 * 解码后图片数据的复用策略（2026-11-12 第七轮）——纯函数，无 IO / 无鸿蒙 SDK 依赖，
 * Node 24 可直接 import 回归（`node --experimental-strip-types tests/dirname.test.mjs`）。
 *
 * 用户要求：「缓存解码后的图片数据并复用，减少重复解码并提升连续查看时的解码与切换速度，
 * 不得在鼠标滚轮切换图片时才开始解码」。
 *
 * 背景：`previews` 缓存里存的就是**已解码的 PixelMap**（PreviewEntry.px），但旧链路里
 *  · 预载按「偏保守的低档位」解一次，滚轮切到那张时又按「显示档位」再解一次（同一张解两遍）；
 *  · 预载 / 主视图 / 右页 / 低清占位可能同时向同一个 uri 发起解码（并发重复解码）；
 *  · 缺一个「已有解码数据够不够直接上屏」的统一判据，于是切图路径里总带着一次解码。
 *
 * 这里只负责「该解到哪一档 / 已有数据能不能直接复用 / 同一解码要不要合并」，
 * 真正的 PixelMap 生命周期与 LRU 仍留在 Index.ets。
 */

/** 有限数判断：刻意不依赖 Number 命名空间的静态成员（ArkTS 严格模式支持程度不一致）。 */
function finiteOf(v: number): boolean {
  return v - v === 0;
}

function nonNegOf(v: number): number {
  return finiteOf(v) && v > 0 ? Math.trunc(v) : 0;
}

/** 预载解码档位：把「可直接显示」的档位一次解到位，命中缓存即刻上屏，不再补解码。
 *
 *  取 max(按画布算出的预载档位, 当前画布的显示需求)，再夹到 cap 上限控内存；
 *  cap 小于原预载档位时也不会把档位往下压（降级会让命中缓存的图反而更糊）。
 *  非有限数 / 非正数一律按 0 处理，绝不把 NaN 传进 desiredSize。 */
export function decodeEdgeOf(preloadEdge: number, displayNeed: number, cap: number): number {
  const p: number = nonNegOf(preloadEdge);
  const d: number = nonNegOf(displayNeed);
  const c: number = nonNegOf(cap);
  const want: number = Math.max(p, d);
  if (c <= 0) {
    return want;
  }
  return Math.max(p, Math.min(want, c));
}

/** 「已解码数据够不够直接上屏」的判据：按**当前画布实际显示的像素需求**，
 *  而不是按解码目标档位（后者含 1.5×~2× oversampling，会逼着每张命中缓存的图再解一次）。
 *
 *  返回 0 表示画布尺寸还没就绪（首帧），调用方应直接复用已有解码数据。 */
export function reuseEdgeOf(canvasW: number, canvasH: number, zoom: number,
  headroom: number, srcLong: number): number {
  const w: number = nonNegOf(canvasW);
  const h: number = nonNegOf(canvasH);
  const long: number = Math.max(w, h);
  if (long <= 0) {
    return 0;
  }
  const z: number = finiteOf(zoom) && zoom > 0 ? zoom : 1;
  const hr: number = finiteOf(headroom) && headroom > 0 ? headroom : 1;
  let need: number = Math.ceil(long * z * hr);
  const src: number = nonNegOf(srcLong);
  if (src > 0) {
    need = Math.min(need, src);
  }
  return need;
}

/** 缓存里的解码档位满足本次需求 → 直接复用已解码的 PixelMap，绝不再解一次。 */
export function shouldReuseDecoded(cachedEdge: number, needEdge: number): boolean {
  const c: number = nonNegOf(cachedEdge);
  const n: number = nonNegOf(needEdge);
  return c > 0 && c >= n;
}

/** 在途解码合并键：同一个 uri + 同一个档位只解一次，并发请求共用同一个 Promise。
 *  档位必须进 key —— 低清占位 768 与显示档位 2048 是两次不同用途的解码，不能误合并。 */
export function decodeKeyOf(uri: string, edge: number): string {
  const u: string = uri === undefined || uri === null ? '' : String(uri);
  return u + '@' + nonNegOf(edge);
}
