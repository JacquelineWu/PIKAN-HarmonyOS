/**
 * common/ResizeQuality.ts — 第六十二轮：主预览 resize 画质（插值档 / AA / 边缘信号评价）
 *
 * 背景（按 SDK 26 component/image.d.ts L190-236 的官方枚举语义，第十七轮已证实）：
 *   · None   = 最近邻，锯齿之源；
 *   · Low    = 双线性（SDK 默认），无负 lobe，缩小不过冲；
 *   · Medium = MipMap，**缩小专用**的低分辨率金字塔（预滤波消混叠）；
 *   · High   = Cubic，官方放大「highest possible quality」档，核带负 lobe。
 *
 * 主预览此前三个清晰图源无条件 High(Cubic)，且四个图源一个都没开 PixelMap 边缘 AA。
 * 而 viewEdge() 是 1.5×（普通）/ 2.0×（全屏）oversampling 解码档位，GPU 实际在
 * **缩小** 0.67× / 0.50×：Cubic 的负 lobe 在缩小采样时产生过冲 / 振铃（波纹），
 * 非整数比例下相位漂移再叠加无 AA 的 PixelMap 边缘，细线与曲线边缘就出现锯齿。
 *
 * 本模块是唯一真值源：零 SDK 依赖、零文件 IO、零异步调用、零异常抛出、零全局可变状态，
 * 可被 tests/dirname.test.mjs 直接加载回归。运行时只用「决策」四个函数；
 * 「核 / 重采样 / 指标」四个函数纯粹用于数值验证用例，不参与 UI 渲染。
 */

/** 插值档位码（内部码；由 Index.previewInterpolation() 映射到 ArkUI 枚举）。 */
export const RQ_MIPMAP: number = 0;   // → ImageInterpolation.Medium
export const RQ_LOW: number = 1;      // → ImageInterpolation.Low
export const RQ_HIGH: number = 2;     // → ImageInterpolation.High

/** 有效缩放比的分档阈值（都是 vp/px 无量纲比值）。 */
export const RQ_NEAR_ONE_TOL: number = 0.06;  // |k-1| ≤ 0.06 视为 1:1，保持 High
export const RQ_MIPMAP_FLOOR: number = 0.4;   // k < 0.4（极端缩小）才启用 MipMap 预滤波
export const RQ_INTEGER_TOL: number = 0.04;   // 整数倍判定容差

/** 有限数判断：刻意不用 Number 命名空间静态成员（ArkTS 严格模式支持程度不一致）。 */
export function rqFiniteOf(v: number): boolean {
  return v - v === 0;
}

function rqPosOf(v: number, fallback: number): number {
  return rqFiniteOf(v) && v > 0 ? v : fallback;
}

/**
 * 有效 GPU 缩放比 = (画布长边 / 解码长边) × 用户 zoom。
 * decodedLong 取 viewEdge()（desiredSize 的长边档位）；canvasLong 取 @State canvasW/H 的长边。
 * 尺寸尚未就绪 / 脏值一律返回 1（保守按 1:1，画质回退到原有 High，绝不劣化）。
 */
export function rqScaleOf(decodedLong: number, canvasW: number, canvasH: number,
  zoom: number): number {
  const d: number = rqPosOf(decodedLong, 0);
  const cw: number = rqPosOf(canvasW, 0);
  const ch: number = rqPosOf(canvasH, 0);
  const z: number = rqPosOf(zoom, 1);
  const c: number = Math.max(cw, ch);
  if (d <= 0 || c <= 0) {
    return 1;
  }
  return (c / d) * z;
}

/** 是否整数倍缩放（1× / 2× / 3×…）；非整数比例是相位漂移 / 波纹的高发区。 */
export function rqIntegerScaleOf(scale: number, tol: number): boolean {
  const s: number = rqPosOf(scale, 1);
  const t: number = rqPosOf(tol, RQ_INTEGER_TOL);
  const r: number = Math.round(s);
  return r > 0 && Math.abs(s - r) <= t;
}

/** 非整数比例：供诊断与验证用例分组，不改变插值决策。 */
export function rqFractionalOf(scale: number, tol: number): boolean {
  return !rqIntegerScaleOf(scale, tol);
}

/**
 * 插值决策（核心）：
 *   · k ≥ 1-tol（放大 / 1:1）      → High(Cubic)：Cubic 放大无混叠，细节最佳；
 *   · floor ≤ k < 1-tol（轻微缩小） → Low(双线性)：无负 lobe，从根上消掉 Cubic 振铃波纹，
 *                                      且不像 MipMap 那样取低一级金字塔而引入明显模糊；
 *   · k < floor（极端缩小，<0.4×）  → Medium(MipMap)：预滤波金字塔消细线 / 曲线混叠；
 *                                      正常 1.5×~2× oversampling 的 0.5~0.67 比例
 *                                      都落在 Low 档，细线不会被 MipMap 抹宽变糊；
 *   · 脏值 → High（回退到原有画质）。
 * 整数 / 非整数比例**不另设分支**：放大一律 Cubic、缩小一律无负 lobe，
 * 非整数比例的相位问题由「无负 lobe + 全源 AA」统一解决，避免阈值附近档位横跳。
 */
export function rqInterpolationOf(scale: number, nearOneTol: number,
  mipmapFloor: number): number {
  const s: number = rqPosOf(scale, 1);
  const t: number = rqPosOf(nearOneTol, RQ_NEAR_ONE_TOL);
  const f: number = rqPosOf(mipmapFloor, RQ_MIPMAP_FLOOR);
  if (s >= 1 - t) {
    return RQ_HIGH;
  }
  if (s >= f) {
    return RQ_LOW;
  }
  return RQ_MIPMAP;
}

/** PixelMap 边缘 AA 默认关闭（since 23）；有效比例恒开，脏值保守关。 */
export function rqAntialiasOf(scale: number): boolean {
  return rqFiniteOf(scale) && scale > 0;
}

/** 档位名：只供验证用例输出表格，不参与渲染。 */
export function rqModeNameOf(mode: number): string {
  if (mode === RQ_HIGH) {
    return 'High/Cubic';
  }
  if (mode === RQ_LOW) {
    return 'Low/Bilinear';
  }
  return 'Medium/MipMap';
}

// ==================== 数值验证模型（不参与 UI） ====================

/** Catmull-Rom / Mitchell 双三次核（a = -0.5）：1<|x|<2 区间为负，正是振铃来源。 */
export function rqCubicWeightOf(x: number): number {
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
export function rqLinearWeightOf(x: number): number {
  const t: number = Math.abs(x);
  return t < 1 ? 1 - t : 0;
}

/** MipMap 档的盒式预低通：按目标比例把 1/s 个源像素先平均，再交给双线性采样。 */
function rqPrefilterOf(signal: Array<number>, scale: number): Array<number> {
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
 * 一维信号重采样：输出 length = round(n × scale)，输出像素中心映射回源坐标后按核卷积。
 * mode = RQ_HIGH 用 Cubic 4-tap；RQ_LOW 用线性 2-tap；
 * RQ_MIPMAP 先做盒式预低通再用线性核（等价于取一级 mip level）。
 * 边界用 clamp（重复边缘像素），不做零填充，避免制造假的边界过冲。
 */
export function rqResampleOf(signal: Array<number>, scale: number,
  mode: number): Array<number> {
  const n: number = signal.length;
  const out: Array<number> = [];
  if (n <= 0) {
    return out;
  }
  const s: number = rqPosOf(scale, 1);
  const count: number = Math.max(1, Math.round(n * s));
  const base: Array<number> = mode === RQ_MIPMAP ? rqPrefilterOf(signal, s) : signal;
  const cubic: boolean = mode === RQ_HIGH;
  for (let i = 0; i < count; i++) {
    const pos: number = (i + 0.5) / s - 0.5;
    const c: number = Math.floor(pos);
    const from: number = cubic ? c - 1 : c;
    const to: number = cubic ? c + 2 : c + 1;
    let sum: number = 0;
    for (let j = from; j <= to; j++) {
      const w: number = cubic ? rqCubicWeightOf(pos - j) : rqLinearWeightOf(pos - j);
      const k: number = j < 0 ? 0 : (j >= n ? n - 1 : j);
      sum += base[k] * w;
    }
    out.push(sum);
  }
  return out;
}

/** 过冲 / 振铃量：输出超出输入动态范围 [lo,hi] 的总偏离，Cubic 负 lobe 的直接度量。 */
export function rqOvershootOf(out: Array<number>, lo: number, hi: number): number {
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

/** 边缘抖动 / 锯齿：二阶差分总量，衡量波纹与阶梯振荡（越小越平滑）。 */
export function rqEdgeJitterOf(out: Array<number>): number {
  let v: number = 0;
  for (let i = 1; i < out.length - 1; i++) {
    v += Math.abs(out[i - 1] - 2 * out[i] + out[i + 1]);
  }
  return Math.round(v * 10000) / 10000;
}
