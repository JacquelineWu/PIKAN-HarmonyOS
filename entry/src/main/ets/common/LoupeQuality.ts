/**
 * common/LoupeQuality.ts — 第六十七轮：高质量放大镜显示（关键参数设定 + 渲染决策真值源）
 *
 * 背景（按 SDK 26 真实声明判读，不凭缓存推断）：
 *   · 项目既有放大镜（R14–R17）走 ArkUI **组件级** `.interpolation(ImageInterpolation)`
 *     与 `.antialiased(bool)`，配 `loupeHiPx` 重解码补真实像素。这是每帧由 UI 合成层
 *     做的 GPU 采样，倍率档只有 High/Low 二值，且鼠标在圆内高频微动会反复重采样。
 *   · SDK 26 `@ohos.multimedia.image` 另提供 **系统 native 级**抗锯齿缩放算法：
 *       AntiAliasingLevel  NONE=0 / LOW=1 双线性 / MEDIUM=2 双线性+mipmap linear /
 *                          HIGH=3 Cubic（since 12/14）
 *       PixelMap.createScaledPixelMap(x, y, level?)               （since 18）
 *       PixelMap.createCroppedAndScaledPixelMap(region,x,y,level?)（since 22）
 *     以及 `@ohos.graphics.drawing` 的 SamplingOptions(FilterMode) 硬件采样（since 20）。
 *     这类接口把「一次高质量重采样」下沉到系统图像管线，产出可直接 1:1 贴图的结果：
 *     文字/图形边缘更平滑、无锯齿毛边、跨帧稳定一致，且只在档位变化时重算一次。
 *
 * 本模块是**唯一真值源**：零 SDK 依赖、零文件 IO、零异步调用、零异常抛出、
 * 零全局可变状态，可被 tests/dirname.test.mjs 直接用构造参数回归。
 * 运行时只用「决策」函数；「核 / 重采样 / 指标」函数纯粹用于数值验证用例，不参与渲染。
 *
 * 设计要点（对应用户的四项要求）：
 *   ① 文字 / 图形 / 影像清晰 —— 内容种类 LQ_KIND_* 分档选 AA 核与倍率；
 *   ② 边缘平滑无锯齿毛边 —— 放大一律 Cubic(HIGH)，高倍改用 mipmap-linear(MEDIUM)
 *      抑制 Cubic 负 lobe 振铃光晕；数值模型用「边缘抖动 / 过冲」量化验证；
 *   ③ 不同倍率 / 屏幕密度稳定一致 —— 画质档位只由**逻辑倍率**（与设备解耦）决定，
 *      密度只进入像素预算，绝不改变档位 ⇒ 不同 DPI 屏同一档、同一视觉；
 *   ④ 不卡顿 / 不延迟 / 不过度占用 —— 能力探测 + 相容门槛（since）+ 总像素/倍率
 *      双护栏 + 稳定阈值复用 + 失败即回退到 R17 组件级链（零回归）。
 */

// ==================== 一、关键参数设定：能力分级 ====================

/** 能力档 0：仅 ArkUI 组件级插值（R17 基线，任何设备都可用，作为回退）。 */
export const LQ_CAP_COMPONENT: number = 0;
/** 能力档 1：+ 系统 native 抗锯齿缩放 createScaledPixelMap（since 18）。 */
export const LQ_CAP_SYSTEM_AA: number = 1;
/** 能力档 2：+ 裁剪+缩放一次成型 createCroppedAndScaledPixelMap（since 22）。 */
export const LQ_CAP_HW_CROP: number = 2;
/** createScaledPixelMap 的最低相容 API 等级（SDK 26 官方 since 18）。 */
export const LQ_API_SYSTEM_MIN: number = 18;
/** createCroppedAndScaledPixelMap 的最低相容 API 等级（SDK 26 官方 since 22）。 */
export const LQ_API_CROP_MIN: number = 22;
/** 探测基准：编译所用 SDK 26。真正决定相容的是运行时方法存在性，
 *  低版本 ROM 上该方法不存在 ⇒ hasScaled=false ⇒ 能力档自动回退组件级。 */
export const LQ_API_PROBE_LEVEL: number = 26;

// ==================== 二、关键参数设定：内容种类 ====================

/** 连续色调影像（照片 / HEIC / FITS 天文图）——细节优先，放大用 Cubic。 */
export const LQ_KIND_IMAGE: number = 0;
/** 图形 / 线条 / 曲线 / 图表——边缘锐度优先，高倍防过冲。 */
export const LQ_KIND_GRAPHIC: number = 1;
/** 文字 / 细笔画 / 扫描件 / 截图——最高边缘保真，高倍必须抑制振铃与毛边。 */
export const LQ_KIND_TEXT: number = 2;

// ==================== 三、关键参数设定：系统级抗锯齿档 ====================
// 数值与 image.AntiAliasingLevel 一一对应，Index/Preview 直接映射，绝不另造语义。

export const LQ_AA_NONE: number = 0;    // 最近邻，锯齿之源，绝不用于放大镜
export const LQ_AA_LOW: number = 1;     // 双线性
export const LQ_AA_MEDIUM: number = 2;  // 双线性 + mipmap linear（高倍 / 缩小抗混叠）
export const LQ_AA_HIGH: number = 3;    // Cubic，官方放大最高质量档

// ==================== 四、关键参数设定：组件插值档 ====================
// 数值与 R62 ResizeQuality 的 RQ_* 保持同序，便于两处画质出口共用一套语义。

export const LQ_IP_LOW: number = 0;     // ImageInterpolation.Low / 双线性
export const LQ_IP_MEDIUM: number = 1;  // ImageInterpolation.Medium / MipMap 缩小专用
export const LQ_IP_HIGH: number = 2;    // ImageInterpolation.High / Cubic 放大最高质量

// ==================== 五、关键参数设定：采样 / 密度 / 阈值 ====================

/** drawing.FilterMode 映射：NEAREST=0（1:1 才用）/ LINEAR=1（双线性硬件采样）。 */
export const LQ_FILTER_NEAREST: number = 0;
export const LQ_FILTER_LINEAR: number = 1;

/** SDK 26 `@ohos.display` Display.densityPixels 合法区间，常见 1.0 / 2.0 / 3.0。 */
export const LQ_DENSITY_MIN: number = 0.5;
export const LQ_DENSITY_MAX: number = 4.0;
/** 参考密度：画质档位以 1vp=1px 为基准，保证跨设备一致。 */
export const LQ_DENSITY_REF: number = 1.0;
/** 读不到 / 脏密度时的保守回退（与 R17 LOUPE_DENSITY_RATIO 同值）。 */
export const LQ_DENSITY_FALLBACK: number = 1.0;

export const LQ_RESAMPLE_1X: number = 1;        // 1:1 基准
export const LQ_NEAR_ONE_TOL: number = 0.06;    // |k-1| ≤ 0.06 视为 1:1
export const LQ_MIPMAP_FLOOR: number = 0.4;     // k < 0.4 极端缩小才启用 mipmap 预滤波
export const LQ_CUBIC_MAX_SCALE: number = 2;    // 逻辑倍率 > 2 高倍段（Cubic 易振铃）

// ==================== 六、关键参数设定：资源护栏（避免卡顿 / 延迟 / 过度占用）====================

/** 系统级缩放产物的总像素上限（与 R66 AI_MAX_TARGET_PIXELS 同量级）。 */
export const LQ_MAX_TARGET_PIXELS: number = 4 * 1024 * 1024;
/** 单次系统级缩放倍率上限：再高就交给组件插值，避免一次分配超大 PixelMap。 */
export const LQ_MAX_FACTOR: number = 3.0;
/** 目标长边上限（与 R17 LOUPE_RESAMPLE_MAX_EDGE 同值）。 */
export const LQ_MAX_EDGE: number = 8192;
/** 重算稳定阈值：目标边变化小于它就直接复用上一张，鼠标微动不重算（R17 同值）。 */
export const LQ_STABLE_MIN_DELTA: number = 64;
/** 最小真实像素增益：补不出明显像素就不做系统级缩放（R17 同值）。 */
export const LQ_MIN_GAIN: number = 96;
/** PixelMap 边缘 AA 恒开（与 R17 LOUPE_AA_ENABLED 同义）。 */
export const LQ_EDGE_AA: boolean = true;

// ==================== 七、数值验证模型的模式码（不参与渲染）====================

export const LQ_MODE_NEAREST: number = 0;
export const LQ_MODE_LINEAR: number = 1;
export const LQ_MODE_CUBIC: number = 2;
export const LQ_MODE_MIPMAP: number = 3;

// ==================== 八、基础工具 ====================

/** 有限数判断：刻意不用 Number 命名空间静态成员（ArkTS 严格模式支持程度不一致）。 */
export function lqFiniteOf(v: number): boolean {
  return v - v === 0;
}

function lqPosOf(v: number, def: number): number {
  return lqFiniteOf(v) && v > 0 ? v : def;
}

// ==================== 九、决策函数（运行时唯一画质出口）====================

/** 归一化设备像素密度比：NaN / 非有限 / <=0 → 回退 1；越界夹到 [0.5, 4.0]。 */
export function lqDensityOf(raw: number): number {
  if (!lqFiniteOf(raw) || raw <= 0) {
    return LQ_DENSITY_FALLBACK;
  }
  if (raw < LQ_DENSITY_MIN) {
    return LQ_DENSITY_MIN;
  }
  if (raw > LQ_DENSITY_MAX) {
    return LQ_DENSITY_MAX;
  }
  return raw;
}

/**
 * 逻辑倍率 = 局部放大倍率 × 主视图缩放，**刻意不含设备密度**。
 * 这是「画质档位」的唯一输入：不同密度屏只要 loupeZoom / viewZoom 相同，
 * 就落到同一 AA 档 / 同一插值档 ⇒ 视觉稳定一致（用户要求③）。
 * 任一因子脏值按 1 处理，绝不把 NaN 传进档位判定。
 */
export function lqLogicalScaleOf(loupeZoom: number, viewZoom: number): number {
  const z: number = lqPosOf(loupeZoom, LQ_RESAMPLE_1X);
  const v: number = lqPosOf(viewZoom, LQ_RESAMPLE_1X);
  return z * v;
}

/** 有效像素倍率 = 逻辑倍率 × 真实密度；只用于像素预算 / 目标边，不参与档位。 */
export function lqEffectiveScaleOf(logical: number, density: number): number {
  const l: number = lqPosOf(logical, LQ_RESAMPLE_1X);
  const d: number = lqDensityOf(density);
  return l * d;
}

/**
 * 跨密度一致档：把逻辑倍率离散成 0 / 1 / 2 三档。
 *   · 0 = 1:1 及以下（旁路，不额外重采样）
 *   · 1 = 温和放大（1:1 < L ≤ 2），Cubic 锐利档
 *   · 2 = 高倍放大（L > 2），需要抑制振铃 / 毛边
 * 密度参数**不进入计算**，仅保留在签名里供调用方显式传入并验证「传不同密度结果相同」。
 */
export function lqConsistentTierOf(logical: number, density: number): number {
  const l: number = lqPosOf(logical, LQ_RESAMPLE_1X);
  if (l <= LQ_RESAMPLE_1X + LQ_NEAR_ONE_TOL) {
    return 0;
  }
  if (l <= LQ_CUBIC_MAX_SCALE) {
    return 1;
  }
  return 2;
}

/** 内容种类识别（可整合的策略入口）：按后缀 + 文件名关键字粗分三类，未知一律影像。 */
export function lqKindOf(name: string): number {
  const n: string = name.toLowerCase();
  if (n.indexOf('text') >= 0 || n.indexOf('doc') >= 0 || n.indexOf('scan') >= 0 ||
    n.indexOf('code') >= 0 || n.indexOf('文字') >= 0 || n.indexOf('文档') >= 0 ||
    n.indexOf('扫描') >= 0 || n.indexOf('截图') >= 0 || n.indexOf('报表') >= 0 ||
    n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.log') ||
    n.endsWith('.json') || n.endsWith('.xml') || n.endsWith('.csv') ||
    n.endsWith('.ini') || n.endsWith('.yaml') || n.endsWith('.yml') ||
    n.endsWith('.toml') || n.endsWith('.ts') || n.endsWith('.js') ||
    n.endsWith('.ets') || n.endsWith('.c') || n.endsWith('.h') ||
    n.endsWith('.cpp') || n.endsWith('.py') || n.endsWith('.sh') ||
    n.endsWith('.java') || n.endsWith('.cfg') || n.endsWith('.conf')) {
    return LQ_KIND_TEXT;
  }
  if (n.indexOf('chart') >= 0 || n.indexOf('diagram') >= 0 ||
    n.indexOf('graph') >= 0 || n.indexOf('schematic') >= 0 ||
    n.indexOf('图形') >= 0 || n.indexOf('图表') >= 0 ||
    n.endsWith('.svg')) {
    return LQ_KIND_GRAPHIC;
  }
  return LQ_KIND_IMAGE;
}

function lqKindSafeOf(kind: number): number {
  return kind === LQ_KIND_TEXT || kind === LQ_KIND_GRAPHIC ? kind : LQ_KIND_IMAGE;
}

/**
 * 系统级抗锯齿档（核心画质决策）：
 *   · 能力不足（组件级回退）→ NONE，表示不启用系统级缩放；
 *   · 1:1 及以下 → LOW（双线性，1:1 逐像素对应不受影响，缩小也比最近邻平滑）；
 *   · 温和放大 → HIGH(Cubic)：文字笔画 / 图形边缘 / 影像细节都最清晰；
 *   · 高倍放大：文字 / 图形 → MEDIUM(mipmap linear) 抑制 Cubic 负 lobe
 *     振铃光晕与毛边；影像仍 HIGH 保细节；
 *   · 脏值 → LOW 安全兜底，绝不落到 NONE(最近邻)。
 */
export function lqAaLevelOf(logical: number, kind: number, cap: number): number {
  if (cap < LQ_CAP_SYSTEM_AA) {
    return LQ_AA_NONE;
  }
  if (!lqFiniteOf(logical)) {
    return LQ_AA_LOW;
  }
  if (logical <= LQ_RESAMPLE_1X + LQ_NEAR_ONE_TOL) {
    return LQ_AA_LOW;
  }
  if (logical > LQ_CUBIC_MAX_SCALE) {
    const k: number = lqKindSafeOf(kind);
    return (k === LQ_KIND_TEXT || k === LQ_KIND_GRAPHIC) ? LQ_AA_MEDIUM : LQ_AA_HIGH;
  }
  return LQ_AA_HIGH;
}

/** 组件插值档（回退路径 / 主预览共用 R62 三档语义）：放大 High、轻缩 Low、极缩 Medium。 */
export function lqInterpolationOf(logical: number): number {
  const l: number = lqPosOf(logical, LQ_RESAMPLE_1X);
  if (l >= LQ_RESAMPLE_1X - LQ_NEAR_ONE_TOL) {
    return LQ_IP_HIGH;
  }
  if (l >= LQ_MIPMAP_FLOOR) {
    return LQ_IP_LOW;
  }
  return LQ_IP_MEDIUM;
}

/** 硬件采样 FilterMode：1:1 允许 NEAREST（无重采样），其余一律 LINEAR（绝不锯齿）。 */
export function lqFilterModeOf(logical: number): number {
  const l: number = lqPosOf(logical, LQ_RESAMPLE_1X);
  return Math.abs(l - LQ_RESAMPLE_1X) <= LQ_NEAR_ONE_TOL
    ? LQ_FILTER_NEAREST : LQ_FILTER_LINEAR;
}

/**
 * 能力分级：把「API 等级 + 运行时函数存在性」收敛成单一能力档。
 * 只有 API 达标**且**运行时确实探测到函数才升档 —— 对应「可用且相容时」。
 * 任一不满足即回退组件级，零回归。
 */
export function lqCapabilityOf(apiLevel: number, hasScaled: boolean,
  hasCropped: boolean): number {
  if (!lqFiniteOf(apiLevel) || apiLevel < LQ_API_SYSTEM_MIN || !hasScaled) {
    return LQ_CAP_COMPONENT;
  }
  if (apiLevel >= LQ_API_CROP_MIN && hasCropped) {
    return LQ_CAP_HW_CROP;
  }
  return LQ_CAP_SYSTEM_AA;
}

/**
 * 系统级缩放倍率：由**有效像素倍率**与内容种类共同决定，并夹到 [1, maxFactor]。
 * 文字 / 图形在高倍段收敛得更保守（细笔画更易被放大噪声破坏）；影像可放大到位。
 * factor ≤ 1 表示跳过系统级缩放（交给组件级，避免无意义的一次内存分配）。
 */
export function lqFactorOf(effective: number, kind: number, maxFactor: number): number {
  const e: number = lqPosOf(effective, LQ_RESAMPLE_1X);
  const m: number = maxFactor > 0 && lqFiniteOf(maxFactor) ? maxFactor : LQ_MAX_FACTOR;
  const k: number = lqKindSafeOf(kind);
  let want: number = e;
  if (e > LQ_CUBIC_MAX_SCALE && k !== LQ_KIND_IMAGE) {
    want = LQ_CUBIC_MAX_SCALE + (e - LQ_CUBIC_MAX_SCALE) * 0.5;
  }
  if (want > m) {
    want = m;
  }
  return want > LQ_RESAMPLE_1X ? want : LQ_RESAMPLE_1X;
}

/** 目标边：长边按有效倍率放大，夹到原图长边与 maxEdge，脏值返回 0 拒绝。 */
export function lqTargetEdgeOf(baseEdge: number, effective: number,
  srcLong: number, maxEdge: number): number {
  const base: number = lqPosOf(baseEdge, 0);
  if (base <= 0) {
    return 0;
  }
  const e: number = lqPosOf(effective, LQ_RESAMPLE_1X);
  let want: number = Math.ceil(base * e);
  const cap: number = maxEdge > 0 && lqFiniteOf(maxEdge) ? maxEdge : LQ_MAX_EDGE;
  if (want > cap) {
    want = cap;
  }
  if (srcLong > 0 && lqFiniteOf(srcLong) && want > Math.floor(srcLong)) {
    want = Math.floor(srcLong);
  }
  return want > 0 ? want : 0;
}

/** 资源护栏：系统级缩放产物是否允许分配（总像素 + 长边 + 能力三重夹界）。 */
export function lqScaleAllowedOf(srcW: number, srcH: number, factor: number,
  cap: number, maxPixels: number, maxEdge: number): boolean {
  if (cap < LQ_CAP_SYSTEM_AA) {
    return false;
  }
  if (!lqFiniteOf(srcW) || !lqFiniteOf(srcH) || srcW <= 0 || srcH <= 0) {
    return false;
  }
  if (!lqFiniteOf(factor) || factor <= LQ_RESAMPLE_1X) {
    return false;
  }
  const w: number = Math.ceil(srcW * factor);
  const h: number = Math.ceil(srcH * factor);
  const mp: number = maxPixels > 0 && lqFiniteOf(maxPixels) ? maxPixels : LQ_MAX_TARGET_PIXELS;
  const me: number = maxEdge > 0 && lqFiniteOf(maxEdge) ? maxEdge : LQ_MAX_EDGE;
  return w > 0 && h > 0 && w <= me && h <= me && w * h <= mp;
}

/** 候选倍率 f 下，实际分配尺寸（SDK 输出边会向上取整）是否仍在总像素 / 长边预算内。 */
function lqFitOf(w: number, h: number, f: number, mp: number, me: number): boolean {
  const ow: number = Math.ceil(w * f);
  const oh: number = Math.ceil(h * f);
  return ow > 0 && oh > 0 && ow <= me && oh <= me && ow * oh <= mp;
}

/**
 * 把「想要的倍率」夹到资源预算内的**实际可用倍率**（核心防 OOM 护栏）。
 * 同时受三个上界约束：总像素 sqrt(mp/(w*h))、长边 me/max(w,h)、调用方 maxFactor，
 * 且按 SDK 输出边**向上取整后**的真实尺寸复核：ceil 上浮会略微越过预算，
 * 因此逐步收缩到 ceil(w·f)·ceil(h·f) <= mp 为止（最多 64 步，纯数值无副作用）。
 * 返回 <= 1 表示预算根本放不下一次放大 ⇒ 调用方必须跳过系统级缩放、回退组件级。
 */
export function lqSafeFactorOf(srcW: number, srcH: number, want: number,
  maxPixels: number, maxEdge: number): number {
  if (!lqFiniteOf(srcW) || !lqFiniteOf(srcH) || srcW <= 0 || srcH <= 0) {
    return LQ_RESAMPLE_1X;
  }
  const w: number = srcW;
  const h: number = srcH;
  const mp: number = maxPixels > 0 && lqFiniteOf(maxPixels) ? maxPixels : LQ_MAX_TARGET_PIXELS;
  const me: number = maxEdge > 0 && lqFiniteOf(maxEdge) ? maxEdge : LQ_MAX_EDGE;
  const byPixels: number = Math.sqrt(mp / (w * h));
  const byEdge: number = me / Math.max(w, h);
  let cap: number = byPixels < byEdge ? byPixels : byEdge;
  if (cap > LQ_MAX_FACTOR) {
    cap = LQ_MAX_FACTOR;
  }
  const target: number = lqFiniteOf(want) && want > LQ_RESAMPLE_1X ? want : LQ_MAX_FACTOR;
  let f: number = target < cap ? target : cap;
  let guard: number = 0;
  while (guard < 64 && f > LQ_RESAMPLE_1X && !lqFitOf(w, h, f, mp, me)) {
    f = f * 0.98;
    guard++;
  }
  return f > LQ_RESAMPLE_1X && lqFitOf(w, h, f, mp, me) ? f : LQ_RESAMPLE_1X;
}

/** 稳定阈值：目标边相对上一档变化小于 minDelta 就复用，鼠标微动不重算（防卡顿）。 */
export function lqShouldRebuildOf(prevEdge: number, nextEdge: number,
  minDelta: number): boolean {
  if (prevEdge <= 0) {
    return true;
  }
  const d: number = minDelta > 0 && lqFiniteOf(minDelta) ? minDelta : LQ_STABLE_MIN_DELTA;
  return Math.abs(nextEdge - prevEdge) >= d;
}

/** 是否有真实像素增益：目标边未明显超过当前边就不值得重算（防无意义分配）。 */
export function lqHasGainOf(targetEdge: number, currentEdge: number,
  minGain: number): boolean {
  if (!lqFiniteOf(targetEdge) || targetEdge <= 0) {
    return false;
  }
  const cur: number = currentEdge > 0 && lqFiniteOf(currentEdge) ? currentEdge : 0;
  const g: number = minGain > 0 && lqFiniteOf(minGain) ? minGain : LQ_MIN_GAIN;
  return targetEdge > cur + g;
}

// ==================== 十、数值验证模型（不参与 UI，仅用于回归）====================

/** Catmull-Rom / Mitchell 双三次核（a=-0.5）：1<|x|<2 为负 lobe，正是振铃/光晕来源。 */
export function lqCubicWeightOf(x: number): number {
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
export function lqLinearWeightOf(x: number): number {
  const t: number = Math.abs(x);
  return t < 1 ? 1 - t : 0;
}

/** 盒式预低通：mipmap 档先按目标比例平均，再交给双线性采样（消混叠）。 */
function lqPrefilterOf(signal: Array<number>, scale: number): Array<number> {
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

/**
 * 一维信号重采样：输出 round(n*scale) 个点，按模式选核。
 * NEAREST 直接取最近点；LINEAR 2-tap；CUBIC 4-tap；MIPMAP 预低通后线性。
 * 边界 clamp 重复边缘像素，不零填充，避免制造假的边界过冲。
 */
export function lqResampleOf(signal: Array<number>, scale: number,
  mode: number): Array<number> {
  const n: number = signal.length;
  const out: Array<number> = [];
  if (n <= 0) {
    return out;
  }
  const s: number = lqPosOf(scale, 1);
  const count: number = Math.max(1, Math.round(n * s));
  const base: Array<number> = mode === LQ_MODE_MIPMAP ? lqPrefilterOf(signal, s) : signal;
  for (let i = 0; i < count; i++) {
    const pos: number = (i + 0.5) / s - 0.5;
    const c: number = Math.floor(pos);
    let v: number = 0;
    if (mode === LQ_MODE_NEAREST) {
      const k: number = c < 0 ? 0 : (c >= n ? n - 1 : c);
      v = base[k];
    } else if (mode === LQ_MODE_CUBIC) {
      for (let j = c - 1; j <= c + 2; j++) {
        const k: number = j < 0 ? 0 : (j >= n ? n - 1 : j);
        v += base[k] * lqCubicWeightOf(pos - j);
      }
    } else {
      for (let j = c; j <= c + 1; j++) {
        const k: number = j < 0 ? 0 : (j >= n ? n - 1 : j);
        v += base[k] * lqLinearWeightOf(pos - j);
      }
    }
    out.push(v);
  }
  return out;
}

/** 边缘抖动 / 锯齿：二阶差分总量，衡量阶梯振荡与毛边（越小越平滑）。 */
export function lqEdgeJitterOf(out: Array<number>): number {
  let v: number = 0;
  for (let i = 1; i < out.length - 1; i++) {
    v += Math.abs(out[i - 1] - 2 * out[i] + out[i + 1]);
  }
  return Math.round(v * 10000) / 10000;
}

/** 过冲 / 振铃：输出超出输入动态范围 [lo,hi] 的总偏离（Cubic 负 lobe 的直接度量）。 */
export function lqOvershootOf(out: Array<number>, lo: number, hi: number): number {
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
