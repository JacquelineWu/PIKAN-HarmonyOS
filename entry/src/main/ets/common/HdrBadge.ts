/**
 * common/HdrBadge.ts — 第七十轮：仅 HDR 相片在预览图左上角叠加清晰可辨的 HDR 标识
 * （显隐严格判据 / 固定左上边距 / 全屏提示避让 / 深浅背景对比度数值模型 / 遮挡护栏）
 *
 * 背景（真实判读 R55 / decodePx / SDK 26 得出）：
 *   · model/Preview.ets 的 decodePx 已用 image.ImageSource.getImageInfo() 读出
 *     ImageInfo.isHdr（SDK @since 12，官方语义「For ImageSource, specifies whether the
 *     source image is in HDR format」），写入 PreviewEntry.isHdr；Index.ets 的 setViewMeta()
 *     再落到 @State viewIsHdr，showPreviewOf() 切图清零 —— 本轮不新增任何解码、探测、
 *     读字节或 SDK 调用，只把这条现成的真值链接到显示层。
 *   · 严格使用 viewIsHdr，**绝不能用 viewHdrWanted**：后者是
 *     `isHdr || isWideGamutOf(colorSpace)`，广色域 SDR 相片会被它误判成 HDR。
 *   · R55 起「平时预览区不再有任何常显角标」，全屏时 (12,12) 仍有一行退出提示。
 *     故徽标全屏时须下移避让，且必须 HitTestMode.Transparent 不吞任何点击/滚轮/放大镜交互。
 *
 * 「深浅背景都清晰可读」的正解：徽标自带**近不透明深色底板 + 纯白粗体文字 + 半透明描边**，
 *   对比度由徽标自身决定，与底下的相片内容（纯白 / 纯黑 / 任意灰）几乎无关。
 *   下方 hbBadgeContrastOf() 用 WCAG 相对亮度 + alpha 合成逐点验证：背景灰度取
 *   0 / 64 / 128 / 192 / 255 全域，白字对合成底板的对比度恒 ≥ 12（远超 AAA 7:1）。
 *
 * 「不同预览图尺寸和常见屏幕密度下稳定一致」：徽标尺寸 / 边距全部是固定 vp 常量，
 *   不读 canvasW / canvasH / zoom / density，hbFixedSizeOf() 明确表达「恒定不缩放」；
 *   hbSafeMarginOf() 只在极小画布做防溢出收缩，hbOcclusionOf() 核算面积占比护栏。
 *
 * 本模块是唯一真值源：零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise /
 * 零全局可变状态，可被 tests/dirname.test.mjs 直接加载回归。运行时只用决策函数；
 * 相对亮度 / 合成 / 对比度函数是一维亮度数值模型，仅供回归用例，不参与 UI 渲染。
 */

// ==================== 标识内容与几何（固定 vp，不吃画布 / zoom / density） ====================

/** 标识文字：短、粗、全大写，任意缩放下都可辨。 */
export const HB_LABEL: string = 'HDR';
/** 左上角固定边距，与既有全屏退出提示的 padding(12) 同一口径。 */
export const HB_MARGIN_VP: number = 12;
/** 全屏退出提示行占高（fontSize 10 + 上下 padding 4 + 行距余量），用于下移避让。 */
export const HB_HINT_H_VP: number = 24;
/** 避让退出提示后额外留的间隙，保证两枚浮层不贴合、不重叠。 */
export const HB_HINT_GAP_VP: number = 6;
export const HB_FONT_VP: number = 11;
export const HB_PAD_H_VP: number = 7;
export const HB_PAD_V_VP: number = 3;
export const HB_RADIUS_VP: number = 4;
export const HB_BORDER_VP: number = 1;
/** 徽标标称尺寸（用于面积 / 遮挡占比核算，非运行时 layout 输入）。 */
export const HB_BADGE_W_VP: number = 40;
export const HB_BADGE_H_VP: number = 20;
/** 徽标面积占预览区面积上限：2%，超过即视为可能遮挡主要内容。 */
export const HB_OCCLUSION_MAX: number = 0.02;
/** 极小画布阈值：小于此值才允许 hbSafeMarginOf 收缩边距，常规尺寸一律固定 12vp。 */
export const HB_MIN_CANVAS_VP: number = 200;

// ==================== 配色（自带对比，与相片内容解耦） ====================

/** 近不透明深色底板：#AARRGGBB，AA=0xdb=219 ⇒ alpha ≈ 0.859。 */
export const HB_BG_COLOR: string = '#db10141a';
/** 纯白文字。 */
export const HB_FG_COLOR: string = '#ffffff';
/** 半透明白描边：深色相片上勾出徽标边界，浅色相片上由深色底板直接提供对比。 */
export const HB_BORDER_COLOR: string = '#66ffffff';
/** 数值模型用的底板不透明度（与 HB_BG_COLOR 的 0xdb/255 在 0.01 内一致）。 */
export const HB_BG_ALPHA: number = 0.86;
/** 底板 RGB（与 HB_BG_COLOR 的 0x10/0x14/0x1a 逐值对应）。 */
export const HB_PLATE_R: number = 16;
export const HB_PLATE_G: number = 20;
export const HB_PLATE_B: number = 26;
/** 文字 RGB（纯白）。 */
export const HB_FG_R: number = 255;
export const HB_FG_G: number = 255;
export const HB_FG_B: number = 255;
/** WCAG AAA 阈值；实测全域最低约 12，留足余量。 */
export const HB_MIN_CONTRAST: number = 7;

// ==================== 基础数值工具 ====================

/** 有限数判定（NaN / ±Infinity 一律脏值）。 */
export function hbFiniteOf(v: number): boolean {
  return v === v && v !== Infinity && v !== -Infinity;
}

/** 夹到 [0,1]，脏值按 1（完全不透明，最保守）处理。 */
export function hbClamp01Of(v: number): number {
  if (!hbFiniteOf(v)) {
    return 1;
  }
  if (v <= 0) {
    return 0;
  }
  if (v >= 1) {
    return 1;
  }
  return v;
}

/** sRGB 单通道（0..255）→ 线性亮度分量（WCAG 2.1 定义）。 */
export function hbSrgbLinearOf(c: number): number {
  const x: number = hbClamp01Of(c / 255);
  if (x <= 0.04045) {
    return x / 12.92;
  }
  return Math.pow((x + 0.055) / 1.055, 2.4);
}

/** 三通道 → WCAG 相对亮度 L。 */
export function hbRelLumOf(r: number, g: number, b: number): number {
  return 0.2126 * hbSrgbLinearOf(r) +
    0.7152 * hbSrgbLinearOf(g) +
    0.0722 * hbSrgbLinearOf(b);
}

/** alpha 合成：把底板单通道 plateC 盖在灰度 bgGray 上，返回合成后的通道值。 */
export function hbCompositeOf(plateC: number, bgGray: number, alpha: number): number {
  const a: number = hbClamp01Of(alpha);
  return plateC * a + bgGray * (1 - a);
}

/** WCAG 对比度 (Lmax+0.05)/(Lmin+0.05)。 */
export function hbContrastOf(l1: number, l2: number): number {
  const hi: number = Math.max(l1, l2);
  const lo: number = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// ==================== 深浅背景对比度数值模型 ====================

/** 给定相片背景灰度（0=纯黑 … 255=纯白），合成底板的相对亮度。 */
export function hbBadgePlateLumOf(bgGray: number, alpha: number): number {
  const g: number = hbFiniteOf(bgGray) ? bgGray : 128;
  const r: number = hbCompositeOf(HB_PLATE_R, g, alpha);
  const gg: number = hbCompositeOf(HB_PLATE_G, g, alpha);
  const b: number = hbCompositeOf(HB_PLATE_B, g, alpha);
  return hbRelLumOf(r, gg, b);
}

/** 纯白文字 对 合成底板 的对比度 —— 这就是「深浅背景都清晰」的量化指标。 */
export function hbBadgeContrastOf(bgGray: number, alpha: number): number {
  const plate: number = hbBadgePlateLumOf(bgGray, alpha);
  const fg: number = hbRelLumOf(HB_FG_R, HB_FG_G, HB_FG_B);
  return hbContrastOf(fg, plate);
}

/** 对比度是否达到阈值（AAA）。 */
export function hbReadableOf(contrast: number, minContrast: number): boolean {
  const cap: number = hbFiniteOf(minContrast) && minContrast > 0
    ? minContrast : HB_MIN_CONTRAST;
  return hbFiniteOf(contrast) && contrast >= cap;
}

// ==================== 显隐 / 位置 / 尺寸 / 遮挡决策 ====================

/** 显隐严格判据：仅「当前图确为 HDR」且「已有上屏图源」且「非文本预览」时显示。
 *  三个参数全部用 === 显式判等，杜绝任何脏值被当作 true（非 HDR 相片恒不显示）。 */
export function hbVisibleOf(isHdr: boolean, hasImage: boolean, textMode: boolean): boolean {
  return isHdr === true && hasImage === true && textMode === false;
}

/** 左边距：固定值，脏值回退到默认边距。 */
export function hbLeftOf(margin: number): number {
  return hbFiniteOf(margin) && margin >= 0 ? margin : HB_MARGIN_VP;
}

/** 上边距：普通态固定；全屏时下移「提示行高 + 间隙」避开退出提示，杜绝重叠。 */
export function hbTopOf(fullscreen: boolean, margin: number,
  hintH: number, gap: number): number {
  const m: number = hbFiniteOf(margin) && margin >= 0 ? margin : HB_MARGIN_VP;
  const h: number = hbFiniteOf(hintH) && hintH > 0 ? hintH : HB_HINT_H_VP;
  const g: number = hbFiniteOf(gap) && gap >= 0 ? gap : HB_HINT_GAP_VP;
  if (fullscreen === true) {
    return m + h + g;
  }
  return m;
}

/** 避让校验：全屏时徽标顶部必须落在退出提示行之下；普通态只需 ≥ 边距。 */
export function hbClearsHintOf(fullscreen: boolean, top: number,
  margin: number, hintH: number): boolean {
  const m: number = hbFiniteOf(margin) && margin >= 0 ? margin : HB_MARGIN_VP;
  const h: number = hbFiniteOf(hintH) && hintH > 0 ? hintH : HB_HINT_H_VP;
  if (fullscreen === true) {
    return top >= m + h;
  }
  return top >= m;
}

/** 尺寸恒定：徽标不随画布尺寸 / 缩放倍率变化，脏输入也返回同一标称值。 */
export function hbFixedSizeOf(base: number, canvasW: number, zoom: number): number {
  if (!hbFiniteOf(canvasW) || !hbFiniteOf(zoom) || !hbFiniteOf(base)) {
    return HB_BADGE_W_VP;
  }
  return base;
}

/** 极小画布防溢出收缩；常规画布（≥ HB_MIN_CANVAS_VP）一律保持固定边距，跨尺寸稳定。 */
export function hbSafeMarginOf(base: number, canvasW: number, canvasH: number): number {
  if (!hbFiniteOf(base) || !hbFiniteOf(canvasW) || !hbFiniteOf(canvasH)) {
    return HB_MARGIN_VP;
  }
  const shortEdge: number = Math.min(canvasW, canvasH);
  if (shortEdge >= HB_MIN_CANVAS_VP) {
    return base;
  }
  const lim: number = shortEdge / 4;
  if (lim > 0 && base > lim) {
    return lim;
  }
  return base;
}

/** 徽标面积占预览区面积比例；脏值 / 非法画布保守返回 1（视为遮挡，不通过护栏）。 */
export function hbOcclusionOf(badgeW: number, badgeH: number,
  canvasW: number, canvasH: number): number {
  if (!hbFiniteOf(badgeW) || !hbFiniteOf(badgeH) ||
      !hbFiniteOf(canvasW) || !hbFiniteOf(canvasH) ||
      canvasW <= 0 || canvasH <= 0) {
    return 1;
  }
  return (badgeW * badgeH) / (canvasW * canvasH);
}

/** 面积占比是否足够小（不遮挡主要内容）。 */
export function hbUnobtrusiveOf(ratio: number, maxRatio: number): boolean {
  const cap: number = hbFiniteOf(maxRatio) && maxRatio > 0
    ? maxRatio : HB_OCCLUSION_MAX;
  return hbFiniteOf(ratio) && ratio > 0 && ratio <= cap;
}
