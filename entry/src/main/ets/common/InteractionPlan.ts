/**
 * 第十三轮 UI 交互策略（纯函数，脱离 ArkUI 可直接单测）。
 *
 *  ① 档案列表「点选零自动滚动」：默认不动列表，仅边界档案例外；
 *  ② 顶部栏「贴顶唤出」：滞回判定，默认完全隐藏、浮层不占布局，切换稳定不闪烁；
 *  ③ 预览图「放大镜」：圆形 / 3 倍局部，cm→vp 换算、圆心与内图偏移几何；
 *  ④ 第十四轮放大镜增强：6cm 直径、左右并排双页独立、全屏切换复位；
 *  ⑤ 第十五轮放大镜总开关：预设关闭、鼠标右键 toggle。
 *
 * 只做数值判定，不碰任何 SDK / IO / 状态，便于静态契约测试直接 import。
 */

// ==================================================================
// ① 档案列表点选滚动策略
// ==================================================================

/** 不滚动：保持当前滚动位置与可见范围（一般点选的唯一结果）。 */
export const SCROLL_NONE: number = 0;
/** 允许列表向上移动（所选档案是列表最顶端 / 可见范围最顶行）。 */
export const SCROLL_UP: number = 1;
/** 允许列表向下移动（所选档案是列表最底端 / 可见范围最底行）。 */
export const SCROLL_DOWN: number = 2;
/** 可见范围未知时保持既有跟随（仅滚轮 / 键盘切图用，避免翻页后选中项跑出视野）。 */
export const SCROLL_FOLLOW: number = 3;

/** 所选行是否属于「仅此情形才允许列表上下移动」的边界档案例外。
 *  边界 = 整个列表的最顶端档案（首行）/ 最底端档案（末行），
 *         或当前可见范围的最顶行 / 最底行（onScrollIndex 上报）。
 *  一般点选（非边界）一律返回 false → 绝不触发自动滚动。
 *  totalRows 传左栏实际行数；firstRow < 0 表示可见范围尚未上报，
 *  此时只认「绝对首 / 末档案」，其余保守不滚。 */
export function isListEdgeRow(targetRow: number, firstRow: number,
  lastRow: number, totalRows: number): boolean {
  if (targetRow < 0 || totalRows <= 0) {
    return false;
  }
  if (targetRow === 0 || targetRow === totalRows - 1) {
    return true;
  }
  if (firstRow < 0 || lastRow < firstRow) {
    return false;
  }
  return targetRow === firstRow || targetRow === lastRow;
}

/** 鼠标点选档案：默认零自动滚动；仅顶 / 底边界档案例外允许上下移动。
 *  这是「一般点选始终不触发自动滚动」的唯一真值来源，UI 只认它的返回值。 */
export function tapScrollAction(targetRow: number, firstRow: number,
  lastRow: number, totalRows: number): number {
  if (!isListEdgeRow(targetRow, firstRow, lastRow, totalRows)) {
    return SCROLL_NONE;
  }
  if (targetRow === 0 || (firstRow >= 0 && targetRow <= firstRow)) {
    return SCROLL_UP;
  }
  return SCROLL_DOWN;
}

/** 滚轮 / 键盘切图：目标仍在可见范围内就不动列表；只有跑出可见范围才跟随。
 *  可见范围未知时保守跟随，保持既有翻页体验（不属「鼠标点选档案」语义）。 */
export function stepScrollAction(targetRow: number, firstRow: number,
  lastRow: number): number {
  if (firstRow < 0 || lastRow < firstRow) {
    return SCROLL_FOLLOW;
  }
  if (targetRow < firstRow) {
    return SCROLL_UP;
  }
  if (targetRow > lastRow) {
    return SCROLL_DOWN;
  }
  return SCROLL_NONE;
}

/** 该动作是否允许真正调用 Scroller.scrollToIndex。 */
export function scrollAllowed(action: number): boolean {
  return action !== SCROLL_NONE;
}

// ==================================================================
// ② 顶部栏贴顶唤出（滞回，稳定不闪烁）
// ==================================================================

/** 顶部栏是否应显示。
 *  · 全屏态恒隐藏；
 *  · 鼠标压进页面顶部触发区（y <= triggerEdge）→ 显示；
 *  · 已经显示且鼠标还在顶栏区域（y <= keepEdge）→ 保持（滞回，边界微抖不闪）；
 *  · 离开该栏 / 触发区（y > keepEdge）→ 隐藏；
 *  · 坐标无效（负 / NaN）→ 保持现状，绝不因脏数据翻转。
 *  triggerEdge < keepEdge 形成滞回带：显示阈值窄、隐藏阈值宽，是「不闪烁」的关键。
 *  顶栏是 Stack 绝对定位浮层，显隐都不改主体布局尺寸 → 不触发 resize / 重解码。 */
export function topBarPeekOf(wasVisible: boolean, y: number,
  triggerEdge: number, keepEdge: number, fullscreen: boolean): boolean {
  if (fullscreen) {
    return false;
  }
  if (!(y >= 0)) {
    return wasVisible;
  }
  if (y <= triggerEdge) {
    return true;
  }
  if (wasVisible && y <= keepEdge) {
    return true;
  }
  return false;
}

// ==================================================================
// ③ 预览图放大镜几何
// ==================================================================

/** ArkUI 的 vp 是密度无关像素：1vp = 1/160 inch，故 cm→vp 与屏幕 dpi 无关。
 *  3cm → 3 * 160 / 2.54 ≈ 188.98vp。 */
export function cmToVp(cm: number): number {
  return cm * 160 / 2.54;
}

/** 放大镜直径（vp），四舍五入到整 vp，避免小数尺寸带来的抗锯齿边缘。 */
export function loupeDiameterVp(cm: number): number {
  return Math.round(cmToVp(cm));
}

/** 圆形放大镜左上角坐标：圆心严格落在光标处，实现「在光标位置显示 / 实时跟随」。 */
export function loupeCircleOrigin(cursor: number, diameter: number): number {
  return cursor - diameter / 2;
}

/** 圆内放大图的「理想」左上角偏移。
 *  放大图 = 主预览图整体等比放大 zoom 倍，原图点 cursor 对应放大图点 zoom*cursor；
 *  把该点对齐到圆心 diameter/2，即 offset = diameter/2 - zoom*cursor。
 *  这是等比放大（不变形）、内容线性对应（不错位）的基础式。 */
export function loupeImageOffset(cursor: number, diameter: number,
  zoom: number): number {
  return diameter / 2 - cursor * zoom;
}

/** 圆内放大图的「实际」左上角偏移（夹界版，边缘不空白）。
 *  放大图尺寸 = contentSize*zoom，远大于圆直径。夹界把偏移限制在
 *  [diameter - contentSize*zoom, 0] 内，保证圆 (0..diameter) 始终被放大图覆盖：
 *  · 光标贴左 / 上边缘 → 理想偏移为正会露出圆左侧空白 → 夹到 0；
 *  · 光标贴右 / 下边缘 → 理想偏移过负会露出圆右侧空白 → 夹到下界。
 *  放大图比圆还小时（极端）居中，同样不空白。 */
export function loupeClampedOffset(cursor: number, contentSize: number,
  diameter: number, zoom: number): number {
  const scaled: number = contentSize * zoom;
  if (scaled <= diameter) {
    return (diameter - scaled) / 2;
  }
  const ideal: number = loupeImageOffset(cursor, diameter, zoom);
  const min: number = diameter - scaled; // <= 0
  if (ideal > 0) {
    return 0;
  }
  if (ideal < min) {
    return min;
  }
  return ideal;
}

/** 光标是否落在预览画框内（无 onHover 能力的 2in1 机型按坐标兜底显隐）。 */
export function loupeInFrame(x: number, y: number, w: number, h: number): boolean {
  return w > 0 && h > 0 && x >= 0 && y >= 0 && x <= w && y <= h;
}

/** 放大镜是否显示：仅悬停于预览图片且确有可显示的解码图时生效（移出立即隐藏）。 */
export function loupeEligibleOf(hover: boolean, hasImage: boolean): boolean {
  return hover && hasImage;
}

// ==================================================================
// ④ 第十四轮：放大镜双页独立 / 全屏切换复位
// ==================================================================

/** 放大镜作用的预览页标识。单页与并排左页都归 LEFT，并排右页归 RIGHT；
 *  NONE = 当前没有任何页被悬停（放大镜完全不绘制）。 */
export const LOUPE_PANE_NONE: number = -1;
export const LOUPE_PANE_LEFT: number = 0;
export const LOUPE_PANE_RIGHT: number = 1;

/** 第十四轮：直径由 3cm 翻倍到 6cm，局部放大倍率仍是 3 倍。
 *  1vp = 1/160 inch → 6cm = 6 * 160 / 2.54 ≈ 377.95 → 378vp，正好是 189 的两倍。 */
export const LOUPE_CM_14: number = 6;
export const LOUPE_D_VP_14: number = loupeDiameterVp(LOUPE_CM_14);

/** 某页放大镜是否应当绘制（双页互不影响的真值来源）：
 *  · 只有「当前激活页 == 本页」+ 悬停 + 该页确有可显示图时才画；
 *  · 左右并排时两页各挂一层，但同一时刻只会命中一层 —— 鼠标在哪页，
 *    哪页显示它自己那张图的局部放大，另一页绝不被同一份状态误触发。 */
export function loupePaneActiveOf(activePane: number, pane: number,
  hover: boolean, hasImage: boolean): boolean {
  return activePane === pane && hover && hasImage;
}

/** hover 事件后的激活页：
 *  · 移入（on=true）→ 激活页切到本页；
 *  · 移出（on=false）→ 仅当当前激活页就是本页时才清成 NONE，避免「从 A 页
 *    直接滑到 B 页」时 A 迟到的 leave 把 B 刚置好的激活页误清（互不影响）。 */
export function loupePaneAfterHover(activePane: number, pane: number,
  on: boolean): number {
  if (on) {
    return pane;
  }
  return activePane === pane ? LOUPE_PANE_NONE : activePane;
}

/** 全屏 / 正常模式切换后放大镜是否必须复位。
 *  只要 fullscreen 变化就复位（进入全屏、退出全屏都算）：切换会整块重建
 *  布局 / 画布尺寸 / pane 划分，残留的旧 pane / 坐标 / 悬停态会与之不一致。
 *  所有切换都从 setFull 收口经过，复位只清瞬时状态、不设永久禁用标志，
 *  下一次 onHover(true) / onMouse(Move) 会重新激活 —— 这正是修复
 *  「退出全屏后放大镜失效」并保持「进入全屏 / 全屏中使用 / 退出全屏」全程可用的关键。 */
export function loupeResetOnModeChange(prevFull: boolean,
  nextFull: boolean): boolean {
  return prevFull !== nextFull;
}

/** 模式切换复位后的悬停态：恒为 false（等待下一次真实 hover 重新激活）。 */
export function loupeHoverAfterModeChange(wasHover: boolean,
  modeChanged: boolean): boolean {
  return modeChanged ? false : wasHover;
}

// ==================================================================
// ⑤ 第十五轮：放大镜总开关（预设关闭 / 鼠标右键 toggle）
// ==================================================================

/** 放大镜总开关预设值：默认关闭，须由鼠标右键显式开启。
 *  UI 侧 @State 取它作初值，避免两处写死布尔字面量。 */
export const LOUPE_DEFAULT_ENABLED: boolean = false;

/** 右键 toggle 后的总开关：仅「右键点击」翻转一次；
 *  左键 / 抬起 / 移动 / 悬停 / 拖拽一律保持原状，不误触、不重复翻转。 */
export function loupeEnabledAfterRightPress(wasEnabled: boolean,
  rightPress: boolean): boolean {
  return rightPress ? !wasEnabled : wasEnabled;
}

/** 放大镜最终是否绘制：总开关 + 双页独立激活 + 悬停 + 该页有图，四者缺一不可。
 *  总开关关闭时 loupeHover / loupePane / 坐标仍照常由鼠标事件维护（不复位），
 *  所以右键一开启就能立即显示当前页的放大内容，不必先移出再移入。 */
export function loupeVisibleOf(enabled: boolean, activePane: number, pane: number,
  hover: boolean, hasImage: boolean): boolean {
  return enabled && loupePaneActiveOf(activePane, pane, hover, hasImage);
}
