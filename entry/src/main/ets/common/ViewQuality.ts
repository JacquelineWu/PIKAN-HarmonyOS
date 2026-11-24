/**
 * common/ViewQuality.ts — 第六十八轮：右侧主预览 resize 最高质素
 * （缩放场景分档 / 内容自适应系统 AA 档 / 精炼倍率 / 跨密度一致 / 资源护栏 / 边缘信号评价）
 *
 * 背景（真实判读 R62 / R67 与 SDK 26 得出）：
 *   · R62 主预览画质全部落在「组件级」：`.interpolation()` / `.antialiased()` 每帧由 UI
 *     合成层做 GPU 采样，三档（High=Cubic / Low=双线性 / Medium=MipMap）+ 全源边缘 AA；
 *     `displayEdge()` 按画布 × zoom 重解码，`RESIZE_RELOAD_THROTTLE_MS` 节流重解。
 *     这解决了「选对档位」，但仍是每帧实时重采样，倍率 / 相位变化时边缘会抖。
 *   · R67 已落地并验证 SDK 26 `PixelMap.createScaledPixelMap(x, y, AntiAliasingLevel)`
 *     （since 18，x/y 官方语义为 scale factor）：LOW=双线性 / MEDIUM=mipmap linear /
 *     HIGH=Cubic，产物可直接 1:1 贴图，跨帧稳定一致，且只在档位变化时重算一次。
 *   · R68 把这套系统 native 级 AA 重采样下沉到右侧主预览：对已超采样解码的
 *     `viewPixelMap` 再做一次高密度 AA 精炼，产出 `viewSysPx` 作为优先图源；
 *     组件级 R62 三档继续逐帧采样这张更密的源（两者叠加），几何与画质属性逐字不变。
 *
 * 画质档位只由「逻辑缩放比」决定，屏幕密度只进入像素预算 ⇒ 不同 DPI 屏同一档、同一视觉。
 * 能力不足 / 预算放不下 / SDK 抛错一律静默回退 R62 组件级链，绝不空白、绝不花屏。
 *
 * 本模块是唯一真值源：零外部依赖、零文件 IO、零异步调用、零异常抛出、零全局可变状态，
 * 可被 tests/dirname.test.mjs 直接加载回归。运行时只用「决策」函数；
 * 「核 / 重采样 / 指标」函数纯粹用于一维边缘信号数值验证，不参与 UI 渲染。
 */

// ==================== 缩放场景档 ====================

/** 有效缩放比 k = rqScaleOf(viewEdge, canvasW, canvasH, zoom) 的分档。 */
export const VQ_SCENE_SHRINK_DEEP: number = 0;  // k < 0.4：极端缩小
export const VQ_SCENE_SHRINK: number = 1;       // 0.4 ≤ k < 1-tol：常规缩小（默认 zoom=1 的 0.67/0.50）
export const VQ_SCENE_ONE: number = 2;          // |k-1| ≤ tol：1:1，无真实增益
export const VQ_SCENE_ENLARGE: number = 3;      // 1+tol ≤ k ≤ 2：温和放大
export const VQ_SCENE_ENLARGE_HIGH: number = 4; // k > 2：高倍放大

// ==================== 内容种类 ====================

export const VQ_KIND_IMAGE: number = 0;    // 照片 / 影像：保细节优先
export const VQ_KIND_GRAPHIC: number = 1; // 图表 / 矢量图形 / 示意图：边缘干净优先
export const VQ_KIND_TEXT: number = 2;    // 文字 / 扫描件 / 截图 / 文档：抑制振铃毛边优先

// ==================== 运行时能力档 ====================

export const VQ_CAP_COMPONENT: number = 0;   // 仅 R62 组件级三档（回退基线）
export const VQ_CAP_SYSTEM_AA: number = 1;  // 系统 native 级 AA 缩放可用

// ==================== 系统级 AA 档（数值 = image.AntiAliasingLevel） ====================

export const VQ_AA_LOW: number = 1;     // 双线性，无负 lobe
export const VQ_AA_MEDIUM: number = 2;  // 双线性 + mipmap linear 预滤波（消混叠 / 抑制振铃）
export const VQ_AA_HIGH: number = 3;    // Cubic，官方放大最高质量档

// ==================== 关键参数设定 ====================

export const VQ_NEAR_ONE_TOL: number = 0.06;   // |k-1| ≤ 0.06 视为 1:1，跳过系统级精炼
export const VQ_MIPMAP_FLOOR: number = 0.4;    // k < 0.4 判极端缩小
export const VQ_CUBIC_MAX_SCALE: number = 2;   // k > 2 的高倍文字 / 图形改用 MEDIUM 抑制负 lobe

/** 精炼倍率：刻意**不随 zoom / resize 抖动**，只由内容种类决定 ⇒ 跨帧稳定、跨窗口一致。 */
export const VQ_REFINE_FACTOR_IMAGE: number = 1.5;   // 影像：最高密度，细节最佳
export const VQ_REFINE_FACTOR_DOC: number = 1.25;    // 文字 / 图形：够用且省资源，避免 Cubic 光晕

/** 资源护栏（与 R67 LoupeQuality 数值对齐，双保险：本源判定 + SDK 层再夹一次）。 */
export const VQ_MAX_TARGET_PIXELS: number = 4 * 1024 * 1024;
export const VQ_MAX_FACTOR: number = 3.0;
export const VQ_MAX_EDGE: number = 8192;
export const VQ_STABLE_MIN_DELTA: number = 64;   // 目标边变化不足 64 不重算，避免 resize 抖动时反复精炼
export const VQ_MIN_GAIN: number = 96;           // 真实像素增益不足 96 不做，避免无意义分配
export const VQ_RESAMPLE_1X: number = 1;         // 倍率 ≤ 1 的哨兵：跳过系统级、回退组件级

/** 屏幕密度：只进像素预算，不进画质档位。 */
export const VQ_DENSITY_MIN: number = 0.5;
export const VQ_DENSITY_MAX: number = 4.0;
export const VQ_DENSITY_REF: number = 1.0;
export const VQ_DENSITY_FALLBACK: number = 1.0;

/** 数值验证模式码（不参与 UI）。 */
export const VQ_MODE_NEAREST: number = 0;
export const VQ_MODE_LINEAR: number = 1;
export const VQ_MODE_CUBIC: number = 2;
export const VQ_MODE_MIPMAP: number = 3;

// ==================== 基础判据 ====================

/** 有限数判断：刻意不用 Number 命名空间静态成员（ArkTS 严格模式支持程度不一致）。 */
export function vqFiniteOf(v: number): boolean {
  return v - v === 0;
}

function vqPosOf(v: number, fallback: number): number {
  return vqFiniteOf(v) && v > 0 ? v : fallback;
}

/** 密度钳到 [0.5, 4.0]；脏值回退 1.0。 */
export function vqDensityOf(raw: number): number {
  if (!vqFiniteOf(raw) || raw <= 0) {
    return VQ_DENSITY_FALLBACK;
  }
  if (raw < VQ_DENSITY_MIN) {
    return VQ_DENSITY_MIN;
  }
  if (raw > VQ_DENSITY_MAX) {
    return VQ_DENSITY_MAX;
  }
  return raw;
}

/** 缩放比分档：脏值保守按 1:1 处理（不做系统级精炼，绝不劣化 R62 基线）。 */
export function vqSceneOf(scale: number, nearOneTol: number,
  mipmapFloor: number): number {
  const s: number = vqPosOf(scale, 1);
  const t: number = vqPosOf(nearOneTol, VQ_NEAR_ONE_TOL);
  const f: number = vqPosOf(mipmapFloor, VQ_MIPMAP_FLOOR);
  if (s > 1 + t) {
    return s > VQ_CUBIC_MAX_SCALE ? VQ_SCENE_ENLARGE_HIGH : VQ_SCENE_ENLARGE;
  }
  if (s >= 1 - t) {
    return VQ_SCENE_ONE;
  }
  if (s >= f) {
    return VQ_SCENE_SHRINK;
  }
  return VQ_SCENE_SHRINK_DEEP;
}

/** 内容种类：中文扫描件 / 截图 / 报表也归入文字类（R67 真值源踩过的分类缺口）。 */
export function vqKindOf(name: string): number {
  const n: string = name.toLowerCase();
  if (n.indexOf('scan') >= 0 || n.indexOf('扫描') >= 0 ||
    n.indexOf('screenshot') >= 0 || n.indexOf('截图') >= 0 ||
    n.indexOf('报表') >= 0 || n.indexOf('text') >= 0 ||
    n.indexOf('文字') >= 0 || n.indexOf('文档') >= 0 ||
    n.indexOf('.txt') >= 0 || n.indexOf('.pdf') >= 0 ||
    n.indexOf('code') >= 0 || n.indexOf('notes') >= 0) {
    return VQ_KIND_TEXT;
  }
  if (n.indexOf('chart') >= 0 || n.indexOf('diagram') >= 0 ||
    n.indexOf('schematic') >= 0 || n.indexOf('图表') >= 0 ||
    n.indexOf('.svg') >= 0) {
    return VQ_KIND_GRAPHIC;
  }
  return VQ_KIND_IMAGE;
}

// ==================== 系统级 AA 档决策（核心） ====================

/**
 * 按「缩放场景 + 内容种类 + 运行时能力」选系统 AA 档：
 *   · 能力不足        → LOW（哨兵；调用侧 vqSystemWantedOf 已判 false，不会真调 SDK）；
 *   · 缩小 / 极端缩小 → MEDIUM：mipmap 预滤波，让高密度源在后续 GPU 缩小采样时
 *                        细线 / 曲线不混叠、边缘平滑（R62 组件级 Low 的 native 增强版）；
 *   · 1:1             → LOW：无真实增益，最低代价；
 *   · 高倍文字 / 图形 → MEDIUM：抑制 Cubic 负 lobe 的振铃光晕与毛边；
 *   · 影像放大 / 温和放大 → HIGH：Cubic 保细节，官方放大最高质量档。
 */
export function vqAaLevelOf(scale: number, kind: number, cap: number): number {
  if (cap < VQ_CAP_SYSTEM_AA) {
    return VQ_AA_LOW;
  }
  const scene: number = vqSceneOf(scale, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR);
  if (scene === VQ_SCENE_SHRINK_DEEP || scene === VQ_SCENE_SHRINK) {
    return VQ_AA_MEDIUM;
  }
  if (scene === VQ_SCENE_ONE) {
    return VQ_AA_LOW;
  }
  if (scene === VQ_SCENE_ENLARGE_HIGH && kind !== VQ_KIND_IMAGE) {
    return VQ_AA_MEDIUM;
  }
  return VQ_AA_HIGH;
}

/** 是否启用系统级精炼：能力达标 + 比例有效 + 偏离 1:1 才做；1:1 与脏值一律跳过。 */
export function vqSystemWantedOf(scale: number, kind: number, cap: number,
  nearOneTol: number): boolean {
  if (cap < VQ_CAP_SYSTEM_AA) {
    return false;
  }
  if (!vqFiniteOf(scale) || scale <= 0) {
    return false;
  }
  const t: number = vqPosOf(nearOneTol, VQ_NEAR_ONE_TOL);
  if (Math.abs(scale - VQ_RESAMPLE_1X) <= t) {
    return false;
  }
  return kind === VQ_KIND_IMAGE || kind === VQ_KIND_GRAPHIC || kind === VQ_KIND_TEXT;
}

/** 精炼倍率只认内容种类，刻意不吃 scale ⇒ resize / zoom 抖动时产物密度恒定、跨帧稳定。 */
export function vqRefineFactorOf(kind: number, maxFactor: number): number {
  const cap: number = vqPosOf(maxFactor, VQ_MAX_FACTOR);
  const base: number = kind === VQ_KIND_IMAGE ? VQ_REFINE_FACTOR_IMAGE : VQ_REFINE_FACTOR_DOC;
  if (base > cap) {
    return cap;
  }
  return base;
}

/** 有效像素倍率 = 逻辑缩放比 × 真实密度（只用于像素预算，不用于画质档位）。 */
export function vqEffectiveScaleOf(scale: number, density: number): number {
  const s: number = vqPosOf(scale, 1);
  return s * vqDensityOf(density);
}

/** 跨密度一致档：档位恒由**逻辑缩放比**决定，密度只做有限性兜底 ⇒ 不同 DPI 同档。 */
export function vqConsistentTierOf(scale: number, density: number): number {
  const s: number = vqPosOf(scale, 1);
  const eff: number = vqEffectiveScaleOf(s, density);
  return vqSceneOf(vqFiniteOf(eff) ? s : VQ_RESAMPLE_1X,
    VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR);
}

// ==================== 资源护栏 ====================

/** 候选倍率 f 下，实际分配尺寸（SDK 输出边向上取整）是否仍在总像素 / 长边预算内。 */
function vqFitOf(w: number, h: number, f: number, mp: number, me: number): boolean {
  const ow: number = Math.ceil(w * f);
  const oh: number = Math.ceil(h * f);
  return ow > 0 && oh > 0 && ow <= me && oh <= me && ow * oh <= mp;
}

/** 把「想要的倍率」夹成实际可用倍率；预算放不下时逐步收缩，最终以 1 作为回退哨兵。
 *  与 R67 lqSafeFactorOf 同口径：ceil 上浮后二次复核，防 `ceil(w·f)·ceil(h·f)` 越界。 */
export function vqSafeFactorOf(srcW: number, srcH: number, want: number,
  maxPixels: number, maxEdge: number): number {
  if (!vqFiniteOf(srcW) || !vqFiniteOf(srcH) || srcW <= 0 || srcH <= 0) {
    return VQ_RESAMPLE_1X;
  }
  const w: number = srcW;
  const h: number = srcH;
  const mp: number = maxPixels > 0 && vqFiniteOf(maxPixels) ? maxPixels : VQ_MAX_TARGET_PIXELS;
  const me: number = maxEdge > 0 && vqFiniteOf(maxEdge) ? maxEdge : VQ_MAX_EDGE;
  const byPixels: number = Math.sqrt(mp / (w * h));
  const byEdge: number = me / Math.max(w, h);
  let cap: number = byPixels < byEdge ? byPixels : byEdge;
  if (cap > VQ_MAX_FACTOR) {
    cap = VQ_MAX_FACTOR;
  }
  const target: number = vqFiniteOf(want) && want > VQ_RESAMPLE_1X ? want : VQ_MAX_FACTOR;
  let f: number = target < cap ? target : cap;
  let guard: number = 0;
  while (guard < 64 && f > VQ_RESAMPLE_1X && !vqFitOf(w, h, f, mp, me)) {
    f = f * 0.98;
    guard++;
  }
  return f > VQ_RESAMPLE_1X && vqFitOf(w, h, f, mp, me) ? f : VQ_RESAMPLE_1X;
}

/** 是否允许真的发起一次系统级缩放：能力 + 倍率 + ceil 后尺寸三重判据。 */
export function vqScaleAllowedOf(srcW: number, srcH: number, factor: number,
  cap: number, maxPixels: number, maxEdge: number): boolean {
  if (cap < VQ_CAP_SYSTEM_AA || !vqFiniteOf(factor) || factor <= VQ_RESAMPLE_1X) {
    return false;
  }
  const mp: number = maxPixels > 0 && vqFiniteOf(maxPixels) ? maxPixels : VQ_MAX_TARGET_PIXELS;
  const me: number = maxEdge > 0 && vqFiniteOf(maxEdge) ? maxEdge : VQ_MAX_EDGE;
  return vqFitOf(srcW, srcH, factor, mp, me);
}

/** 稳定阈值：目标边变化不足 minDelta 不重算（resize 高频微动不反复精炼）。 */
export function vqShouldRebuildOf(prevEdge: number, nextEdge: number,
  minDelta: number): boolean {
  if (!vqFiniteOf(nextEdge) || nextEdge <= 0) {
    return false;
  }
  const p: number = vqFiniteOf(prevEdge) ? prevEdge : 0;
  return Math.abs(nextEdge - p) >= vqPosOf(minDelta, VQ_STABLE_MIN_DELTA);
}

/** 真实像素增益：补不出 minGain 个像素就不做，避免无意义分配。 */
export function vqHasGainOf(targetEdge: number, currentEdge: number,
  minGain: number): boolean {
  if (!vqFiniteOf(targetEdge) || !vqFiniteOf(currentEdge)) {
    return false;
  }
  return targetEdge - currentEdge >= vqPosOf(minGain, VQ_MIN_GAIN);
}

// ==================== 一维边缘信号数值验证模型（不参与 UI） ====================

/** Catmull-Rom / Mitchell 双三次核（a = -0.5）：1<|x|<2 区间为负，正是振铃来源。 */
export function vqCubicWeightOf(x: number): number {
  const a: number = -0.5;
  const t: number = Math.abs(x);
  if (t < 1) {
    return (a + 2) * t * t * t - (a + 3) * t * t + 1;
  }
  if (t < 2) {
    return a * t * t * t - 5 * a * t * t + 8 * a * t - 4 * a;
  }
  return 0;
}

/** 双线性（tent）核：恒非负，无过冲。 */
export function vqLinearWeightOf(x: number): number {
  const t: number = Math.abs(x);
  return t < 1 ? 1 - t : 0;
}

/** MipMap 档的盒式预低通：按目标比例把邻近源像素先平均，再做采样。 */
function vqPrefilterOf(signal: Array<number>, scale: number): Array<number> {
  const n: number = signal.length;
  const out: Array<number> = [];
  const r: number = Math.max(1, Math.round(1 / (2 * scale)));
  for (let i = 0; i < n; i++) {
    let sum: number = 0;
    let cnt: number = 0;
    for (let j = i - r + 1; j <= i + r; j++) {
      const k: number = j < 0 ? 0 : (j >= n ? n - 1 : j);
      sum += signal[k];
      cnt++;
    }
    out.push(cnt > 0 ? sum / cnt : 0);
  }
  return out;
}

/** 一维信号重采样：输出 length = round(n × scale)，像素中心映射回源坐标后按核卷积。
 *  mode = NEAREST 取最近 / LINEAR 用线性 2-tap / CUBIC 用 4-tap /
 *  MIPMAP 先盒式预低通再线性核。边界 clamp，不做零填充。 */
export function vqResampleOf(signal: Array<number>, scale: number,
  mode: number): Array<number> {
  const n: number = signal.length;
  const out: Array<number> = [];
  if (n <= 0) {
    return out;
  }
  const s: number = vqPosOf(scale, 1);
  const count: number = Math.max(1, Math.round(n * s));
  const base: Array<number> = mode === VQ_MODE_MIPMAP ? vqPrefilterOf(signal, s) : signal;
  const cubic: boolean = mode === VQ_MODE_CUBIC;
  for (let i = 0; i < count; i++) {
    const pos: number = (i + 0.5) / s - 0.5;
    const c: number = Math.floor(pos);
    if (mode === VQ_MODE_NEAREST) {
      const near: number = Math.round(pos);
      const k: number = near < 0 ? 0 : (near >= n ? n - 1 : near);
      out.push(base[k]);
    } else {
      const from: number = cubic ? c - 1 : c;
      const to: number = cubic ? c + 2 : c + 1;
      let sum: number = 0;
      for (let j = from; j <= to; j++) {
        const w: number = cubic ? vqCubicWeightOf(pos - j) : vqLinearWeightOf(pos - j);
        const k: number = j < 0 ? 0 : (j >= n ? n - 1 : j);
        sum += base[k] * w;
      }
      out.push(sum);
    }
  }
  return out;
}

/** 过冲 / 振铃量：输出超出输入动态范围 [lo,hi] 的总偏离。 */
export function vqOvershootOf(out: Array<number>, lo: number, hi: number): number {
  let v: number = 0;
  for (let i = 0; i < out.length; i++) {
    const x: number = out[i];
    if (x > hi) {
      v += x - hi;
    } else if (x < lo) {
      v += lo - x;
    }
  }
  return Math.round(v * 10000) / 10000;
}

/** 边缘抖动 / 锯齿：二阶差分总量（越小越平滑）。 */
export function vqEdgeJitterOf(out: Array<number>): number {
  let v: number = 0;
  for (let i = 1; i < out.length - 1; i++) {
    v += Math.abs(out[i - 1] - 2 * out[i] + out[i + 1]);
  }
  return Math.round(v * 10000) / 10000;
}
