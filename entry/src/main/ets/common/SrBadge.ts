/**
 * common/SrBadge.ts — 「AI超分辨率」标记的真值源（第九十九轮 / 第一百轮）
 *
 * 为什么单独抽一个文件：
 *  · 「这张图要不要显示标记」是**纯逻辑**（拿三个值比一下），不该埋进 builder 的条件里 ——
 *    埋在 UI 里就只能靠人眼验，抽出来可以直接跑 Node 回归；
 *  · 几何 / 配色是常量表，界面只引用、不写字面量 —— 单张 / 并排 / 全屏 / 换窗口尺寸
 *    都读同一份数值，位置与大小不可能各处不一样。
 *
 * 本模块**零依赖**（不 import 任何 SDK / 其它模块），可直接被测试 import。
 */

/** 标记文案：与需求原话一致，不带倍率、不带括号后缀 —— 一行固定文字最不容易读错。 */
export const SR_BADGE_TEXT: string = 'AI超分辨率';

// ------------------------------------------------------------------
// 几何：全部是 vp 常量，**与图片像素尺寸、zoom、并排/单张/全屏无关**
// ------------------------------------------------------------------

/** 距预览框左上角的内缩（vp）。10vp 在 22vp 高的胶囊上不显局促，又足够贴边。 */
export const SR_BADGE_INSET: number = 10;
/** 胶囊高度（vp）。低于 20 时 12fp 的字上下会顶到边。 */
export const SR_BADGE_H: number = 22;
/** 左右内边距（vp）。 */
export const SR_BADGE_PAD_X: number = 7;
/** 字号（fp）。12fp 在 1x 屏幕上清晰可读；再小（10/11）中文笔画会糊。 */
export const SR_BADGE_FONT: number = 12;
/** 圆角（vp）。 */
export const SR_BADGE_RADIUS: number = 5;
/** 描边宽度（vp）。1vp 只做「与亮部脱开」的分隔，不做装饰。 */
export const SR_BADGE_BORDER_W: number = 1;

// ------------------------------------------------------------------
// 配色：深底 + 白字 + 浅描边（对比度按「最坏情况」算过）
// ------------------------------------------------------------------

/**
 * 底色 `#CC111318`（ARGB：alpha 0xCC ≈ 0.8）。
 *
 * 对比度核算（WCAG 相对亮度）：
 *  · 压在纯白画面上 → 有效底 ≈ RGB(65,66,68)，白字对比 ≈ 10.3 : 1；
 *  · 压在纯黑画面上 → 有效底 ≈ RGB(14,15,17)，白字对比 ≈ 19 : 1。
 *  两种极端都远超 AA 的 4.5 : 1，所以**任何图片内容下文字都读得清**，
 *  不需要为亮/暗图切换两套样式（切换会闪、也会让标记看起来忽明忽暗）。
 */
export const SR_BADGE_BG: string = '#CC111318';
/** 文字色：纯白，不掺灰。 */
export const SR_BADGE_FG: string = '#FFFFFFFF';
/** 描边 `#59FFFFFF`（alpha 0x59 ≈ 0.35）：只在深色图上看得出，浅色图上几乎不可见，不会形成硬边。 */
export const SR_BADGE_BORDER: string = '#59FFFFFF';

/**
 * 这张图此刻**是否应该显示「AI超分辨率」标记**。
 *
 * 判据刻意绑在「屏幕上真正显示的那张超分产物」上，而不是「历史上有没有超分过」：
 *  · `hasSrPx`  —— 当前是否持有超分产物（`viewSrPx !== undefined`）；
 *  · `srUri`    —— 该产物属于哪张图（`viewSrUri`）；
 *  · `uri`      —— 这个图框此刻要画的图；
 *  · `srEdge`   —— 产物长边，必须 > 0 才算有效产物。
 *
 * 为什么不维护一个「超分过的 uri 集合」然后见到就显示：产物在切图 / 淘汰时会被 release，
 * 那时画面用的是原图（GPU 放大），再挂「AI超分辨率」就是**假标记**。宁可少显示，
 * 也不能把没吃到超分的图标成超分 —— 这正是「未触发超分的图片不显示任何标记」。
 *
 * 任一侧是脏值（空串、0、NaN）一律不显示：宁可不标，绝不误标。
 */
export function srBadgeShownOf(hasSrPx: boolean, srUri: string, uri: string,
  srEdge: number): boolean {
  if (hasSrPx !== true) {
    return false;
  }
  if (!(srEdge > 0) || !Number.isFinite(srEdge)) {
    return false;
  }
  if (srUri.length === 0 || uri.length === 0) {
    return false;
  }
  return srUri === uri;
}
