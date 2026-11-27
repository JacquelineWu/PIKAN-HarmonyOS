/**
 * 第八十六轮：并排（对开）预览的等比适配 —— 纯函数真值源。
 *
 * ── 规则（唯一口径，UI 只消费结果，不再自己算） ────────────────────
 * 1) **统一高度**：两页缩放到同一个高度 h，再按各自原始宽高比取宽
 *    （`wL = h × arL`、`wR = h × arR`）⇒ 各自等比、绝对不拉伸。
 * 2) **取满**：先按「宽度放得下两页」求 `hByWidth = availW / (arL + arR)`，
 *    再与 `availH` 取较小值 ⇒ h 用尽可能大的值，两页合计宽尽可能大。
 * 3) **对齐**：两页左右相邻、中间零间隙；整组在可用框内居中。
 *    · 高度受限（h = availH）⇒ 上下零留白，左右两侧各留 (availW − totalW)/2
 *    · 宽度受限（h = hByWidth < availH）⇒ 左右零留白，上下两侧各留 (availH − h)/2
 *    两种情形都**只在一个轴上留白，中间永远为 0** —— 这是「留白最小」的可证明口径：
 *    不能再放大，否则必然溢出可用框；也不会出现「左右各半框各自居中」造成的中缝。
 * 4) 尺寸未知（解码未回）时按「另一页的比例」估，两页都未知才按 1:1 估，
 *    结果标记 `estimated`，等真实尺寸到达后派生值自动重算（无需触发点）。
 *
 * 约束：零 SDK / 零 IO / 零异步 / 零 throw / 零定时器，可 Node 直接回归。
 */

/** 适配结果。所有长度单位与入参一致（vp）。 */
export interface SpreadFit {
  /** 可用框是否有效（框宽/高 > 0）；false 时其余字段无意义 */
  ok: boolean;
  /** 两页统一渲染高度 */
  h: number;
  /** 左页宽 = h × arL */
  wL: number;
  /** 右页宽 = h × arR */
  wR: number;
  /** 两页合计宽 = wL + wR（中间零间隙） */
  totalW: number;
  /** 左右两侧各留白宽度（居中后） */
  padX: number;
  /** 上下两侧各留白高度（居中后） */
  padY: number;
  /** 受限轴：LIMIT_HEIGHT / LIMIT_WIDTH */
  limitedBy: number;
  /** 是否有任一页宽高比是估算的（尺寸未就绪） */
  estimated: boolean;
}

/** 高度受限：h 顶到 availH，左右两侧留白 */
export const LIMIT_HEIGHT: number = 0;
/** 宽度受限：合计宽顶到 availW，上下两侧留白 */
export const LIMIT_WIDTH: number = 1;

/** 一页的显示宽高比（宽 / 高）。
 *
 *  `rot` 为 90 / 270 时**必须取倒数**：旋转后图片的显示包围盒是「高变宽、宽变高」，
 *  而 `frameW/frameH` 已按同一规则互换 —— 两者必须同口径，否则并排会算出一半的宽度。
 *  `w/h` 任一 ≤ 0（尺寸未知）返回 0，交由调用方估算。
 */
export function spreadAspectOf(w: number, h: number, rot: number): number {
  if (!(w > 0) || !(h > 0)) {
    return 0;
  }
  const odd: boolean = (rot % 180) !== 0;
  return odd ? (h / w) : (w / h);
}

/** 并排等比适配。boxW / boxH 是**旋转后**的可用框（= frameW / frameH）。 */
export function spreadFitOf(boxW: number, boxH: number, arL: number, arR: number): SpreadFit {
  const empty: SpreadFit = {
    ok: false, h: 0, wL: 0, wR: 0, totalW: 0, padX: 0, padY: 0,
    limitedBy: LIMIT_HEIGHT, estimated: true,
  };
  if (!(boxW > 0) || !(boxH > 0)) {
    return empty;
  }
  // 比例缺失时的估算：一缺补另一页，两缺按 1:1。绝不返回 0（那会把页面压成一条线）。
  let aL: number = arL;
  let aR: number = arR;
  let estimated: boolean = false;
  if (!(aL > 0) && !(aR > 0)) {
    aL = 1;
    aR = 1;
    estimated = true;
  } else if (!(aL > 0)) {
    aL = aR;
    estimated = true;
  } else if (!(aR > 0)) {
    aR = aL;
    estimated = true;
  }

  const sumAr: number = aL + aR;
  // 宽度受限时的统一高度；再与可用高度取较小 ⇒ 两页必然都放得下且尽可能大。
  const hByWidth: number = boxW / sumAr;
  const limitedByWidth: boolean = hByWidth < boxH;
  const h: number = limitedByWidth ? hByWidth : boxH;
  const wL: number = h * aL;
  const wR: number = h * aR;
  const totalW: number = wL + wR;

  // 留白只出现在「没被顶满」的那个轴上，且左右/上下对称。
  const padX: number = limitedByWidth ? 0 : Math.max(0, (boxW - totalW) / 2);
  const padY: number = limitedByWidth ? Math.max(0, (boxH - h) / 2) : 0;

  return {
    ok: true,
    h: h,
    wL: wL,
    wR: wR,
    totalW: totalW,
    padX: padX,
    padY: padY,
    limitedBy: limitedByWidth ? LIMIT_WIDTH : LIMIT_HEIGHT,
    estimated: estimated,
  };
}
