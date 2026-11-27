/**
 * common/SuperResPlan.ts — 第九十九轮：Core Vision Kit 图像超分的「判据层」（纯函数，零 SDK / 零 IO）
 *
 * 官方能力：**Core Vision Kit · 图像超分（imageSuperResolution）**
 *   指南：https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/core-vision-image-super-resolution
 *   声明（本机 SDK 26.0.0 实测，权威来源）：
 *     `@hms.ai.vision.imageSuperResolution.d.ts` → `ImageSRAnalyzer.create()` /
 *     `process(visionBase.Request): Promise<ISPResponse>` / `destroy()`；错误码 `1018700001 服务异常`。
 *
 * 本文件只回答「要不要超分 / 超分到多大 / 产出算不算数」这三件事，
 * 不 import 任何 Kit、不碰 PixelMap、不碰计时器 —— 这样判据可以用 Node 直接回归，
 * 而真正调 kit 的部分全部收在 `services/SuperResolutionService.ts` 里（模块边界清晰）。
 *
 * 为什么需要「判据层」而不是拿到图就跑超分：
 *   ① 超分是重活（NPU/GPU 推理，百毫秒到秒级）。图片本来就跟图框一样大、甚至更大时，
 *      跑一遍只会白白吃电、拖慢切图，最后还被 GPU 缩回去；
 *   ② 倍率过小（如 1.05×）时，双线性放大与超分肉眼无差；
 *   ③ 倍率过大（原图只有几十像素）时，超分只会把压缩噪点也放大成「塑料块」；
 *   ④ 源图已经足够大（> SR_MAX_SRC_EDGE）时，瓶颈不在像素量，而在 GPU 采样。
 *   所以先算一次「图 vs 框」的关系，再决定是否触发 —— 这正是需求里要求的比较逻辑。
 */

/** 低于此倍率不跑超分：系统双线性足够，AI 推理的收益看不见。 */
export const SR_MIN_RATIO: number = 1.15;
/** 高于此倍率不跑：原图太小，超分也会把噪点放大，观感反而更差。 */
export const SR_MAX_RATIO: number = 3.2;
/** 源图长边超过这个值就不跑：像素量已经不是瓶颈（省一次推理）。 */
export const SR_MAX_SRC_EDGE: number = 2048;
/** 输出长边上限：显存 / 耗时的硬保护（超分产物是 RGBA，4096 已是 64MB 量级）。 */
export const SR_MAX_OUT_EDGE: number = 4096;
/** 产出没有「真的多出像素」就不采用（防止服务端返回原尺寸 / 反向缩放）。 */
export const SR_MIN_GAIN: number = 1.05;

/** 一个宽高（刻意不复用 ViewPlan 的 Size2：本模块要保持**零依赖**，
 *  这样 tests 里可以直接 `import` 它做回归，不会被跨文件解析拦住）。 */
export interface SuperResSize {
  w: number;
  h: number;
}

/** 判据结果：输入非法（尺寸为 0 / NaN）。 */
export const SR_SKIP_INVALID: number = 0;
/** 判据结果：图已经够大，不需要超分。 */
export const SR_SKIP_ENOUGH: number = 1;
/** 判据结果：倍率过小，收益不可见。 */
export const SR_SKIP_SMALL_GAIN: number = 2;
/** 判据结果：倍率过大，原图太小。 */
export const SR_SKIP_TOO_TINY: number = 3;
/** 判据结果：源图本身已经够大。 */
export const SR_SKIP_SRC_LARGE: number = 4;
/** 判据结果：**可以超分**。 */
export const SR_RUN: number = 5;

/** 一次判据的完整结论（全部可打印，便于日志核对）。 */
export interface SuperResPlan {
  action: number;
  /** 源图长边（像素）。 */
  srcEdge: number;
  /** 图框所需长边（像素，**不夹源图**，所以能真实反映「差多少」）。 */
  needEdge: number;
  /** 本次超分的目标长边（已夹 SR_MAX_OUT_EDGE）。 */
  targetEdge: number;
  /** needEdge / srcEdge，> 1 表示需要放大。 */
  ratio: number;
}

/**
 * 图框所需的长边（**不含源图上限夹逼**）。
 *
 * 为什么不直接用 `displayEdgeOf()`：那个函数最后会 `min(need, srcLong)`，
 * 结果永远是「源图够不够」的答案本身，用来判「差多少」会恒等于 1。
 * 这里按同一套口径（画布长边 × zoom × headroom，且不低于解码档位 viewEdge）**只算需求**，
 * 让调用方拿它与 srcEdge 相除，得到真实的放大倍率。
 *
 * @param viewEdge 当前解码档位（Index.viewEdge()，画布 × 1.5/2.0）
 * @param canvasW/canvasH 预览画布尺寸（vp）
 * @param zoom 用户缩放倍率（1 = 适应画布）
 * @param headroom 显示余量（与 DISPLAY_HEADROOM 同源，1.05）
 */
export function superResNeedEdgeOf(viewEdge: number, canvasW: number, canvasH: number,
  zoom: number, headroom: number): number {
  const canvasLong: number = Math.max(Number(canvasW) || 0, Number(canvasH) || 0);
  const ve: number = Number(viewEdge) || 0;
  if (canvasLong <= 0) {
    return ve > 0 ? Math.round(ve) : 0;
  }
  const z: number = (Number(zoom) > 0) ? Number(zoom) : 1;
  const h: number = (Number(headroom) > 0) ? Number(headroom) : 1;
  const byZoom: number = Math.ceil(canvasLong * z * h);
  return Math.max(Math.round(ve), byZoom);
}

/**
 * 核心判据：这张图要不要超分、超分到多大。
 *
 * 判断顺序（任一不满足即返回，`action` 说明原因，调用方据此决定「跑 / 不跑」）：
 *   1. 尺寸非法 → SR_SKIP_INVALID
 *   2. 源图长边 >= 需求（含 1 像素级容差）→ SR_SKIP_ENOUGH（图比框大，GPU 缩即可）
 *   3. 源图长边 > SR_MAX_SRC_EDGE → SR_SKIP_SRC_LARGE
 *   4. 倍率 < SR_MIN_RATIO → SR_SKIP_SMALL_GAIN
 *   5. 倍率 > SR_MAX_RATIO → SR_SKIP_TOO_TINY
 *   6. 否则 → SR_RUN，targetEdge = min(needEdge, SR_MAX_OUT_EDGE)
 *
 * @param srcW/srcH 源图像素尺寸（decodePx 回来的 PixelMap 的原始宽高）
 * @param needEdge  图框所需长边（一般由 superResNeedEdgeOf 算）
 */
export function superResPlanOf(srcW: number, srcH: number, needEdge: number): SuperResPlan {
  const w: number = Number(srcW);
  const h: number = Number(srcH);
  const need: number = Number(needEdge);
  // 宽高任一不是正数（0 / 负数 / NaN / Infinity）都视为非法：
  // 一张图必然宽高皆 > 0，残缺值说明上游拿错了对象，此时**绝不触发**推理。
  const srcEdge: number = Math.max(w > 0 ? w : 0, h > 0 ? h : 0);
  const none: SuperResPlan = {
    action: SR_SKIP_INVALID, srcEdge: srcEdge, needEdge: 0, targetEdge: 0, ratio: 0
  };
  if (!(w > 0) || !(h > 0) || !(need > 0) || !Number.isFinite(w) ||
    !Number.isFinite(h) || !Number.isFinite(need)) {
    return none;
  }
  const target: number = Math.min(Math.round(need), SR_MAX_OUT_EDGE);
  const base: SuperResPlan = {
    action: SR_SKIP_ENOUGH, srcEdge: srcEdge, needEdge: Math.round(need), targetEdge: target, ratio: 1
  };
  if (srcEdge >= need) {
    return base;                       // ② 图已经够大：GPU 缩小即可，不跑 AI
  }
  if (srcEdge > SR_MAX_SRC_EDGE) {
    return { action: SR_SKIP_SRC_LARGE, srcEdge: srcEdge,
      needEdge: Math.round(need), targetEdge: target, ratio: need / srcEdge };
  }
  const ratio: number = need / srcEdge;
  if (ratio < SR_MIN_RATIO) {
    return { action: SR_SKIP_SMALL_GAIN, srcEdge: srcEdge,
      needEdge: Math.round(need), targetEdge: target, ratio: ratio };
  }
  if (ratio > SR_MAX_RATIO) {
    return { action: SR_SKIP_TOO_TINY, srcEdge: srcEdge,
      needEdge: Math.round(need), targetEdge: target, ratio: ratio };
  }
  return { action: SR_RUN, srcEdge: srcEdge,
    needEdge: Math.round(need), targetEdge: target, ratio: ratio };
}

/**
 * 超分产物是否值得采用。
 *
 * 服务端理论上给出 2× 左右的真实像素，但也可能（能力不足 / 降级实现）返回原尺寸甚至更小。
 * 没有真实增益就直接丢掉、继续用原图 —— 「渲染放大」交给 GPU，至少不会更差。
 */
export function superResAcceptOf(outW: number, outH: number, srcEdge: number,
  minGain: number = SR_MIN_GAIN): boolean {
  const outEdge: number = Math.max(Number(outW) || 0, Number(outH) || 0);
  const src: number = Number(srcEdge) || 0;
  if (!(outEdge > 0) || !(src > 0)) {
    return false;
  }
  const gain: number = (minGain > 0) ? minGain : SR_MIN_GAIN;
  return outEdge >= src * gain;
}

/**
 * 超分产物在图框里的「等比填充尺寸」（Contain 口径）。
 *
 * 需求里的「自适应填充图框」——超分只改像素密度、不改长宽比，
 * 所以外部框仍按 Contain 算：取两边缩放比的较小值，保证不变形、不裁切。
 * 数值与 ArkUI `ImageFit.Contain` 的算法一致，这里显式算一份是为了可测、可日志核对。
 */
export function superResFillSizeOf(outW: number, outH: number, boxW: number, boxH: number): SuperResSize {
  const w: number = Number(outW) || 0;
  const h: number = Number(outH) || 0;
  const bw: number = Number(boxW) || 0;
  const bh: number = Number(boxH) || 0;
  if (!(w > 0) || !(h > 0) || !(bw > 0) || !(bh > 0)) {
    return { w: 0, h: 0 };
  }
  const k: number = Math.min(bw / w, bh / h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** 超分结果的对账 key：同一张图 + 同一目标档位只做一次，避免缩放抖动反复推理。 */
export function superResKeyOf(uri: string, targetEdge: number): string {
  const u: string = (uri === undefined || uri === null) ? '' : String(uri);
  const e: number = Math.round(Number(targetEdge) || 0);
  return u + '@' + e;
}

/** 判据 → 一行可读文案（日志 / 诊断层用，避免各处自己拼字符串）。 */
export function superResReasonOf(action: number): string {
  switch (action) {
    case SR_RUN: return 'run';
    case SR_SKIP_ENOUGH: return 'skip:enough';
    case SR_SKIP_SMALL_GAIN: return 'skip:small-gain';
    case SR_SKIP_TOO_TINY: return 'skip:too-tiny';
    case SR_SKIP_SRC_LARGE: return 'skip:src-large';
    default: return 'skip:invalid';
  }
}
