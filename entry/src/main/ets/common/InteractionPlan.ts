/**
 * 第十三轮 UI 交互策略（纯函数，脱离 ArkUI 可直接单测）。
 *
 *  ① 档案列表「点选零自动滚动」：默认不动列表，仅边界档案例外；
 *  ② 顶部栏「贴顶唤出」：滞回判定，默认完全隐藏、浮层不占布局，切换稳定不闪烁；
 *  ③ 预览图「放大镜」：圆形 / 3 倍局部，cm→vp 换算、圆心与内图偏移几何；
 *  ④ 第十四轮放大镜增强：6cm 直径、左右并排双页独立、全屏切换复位；
 *  ⑤ 第十五轮放大镜总开关：预设关闭、鼠标右键 toggle；
 *  ⑥ 第十六轮窗口模式：ESC 按当前窗口状态分派、全屏往返窗口几何保存 / 恢复；
 *  ⑦ 第十六轮放大镜重采样：>1:1 才分档插值 + 按放大倍率重解码补足真实像素、
 *    整数像素对齐、1:1 旁路；≤1:1 完全不触碰既有显示路径。
 *  ⑧ 第十七轮放大镜边缘抗锯齿：修正 SDK 插值档语义错配（放大一律 Cubic，
 *    绝不用 MipMap / 最近邻）、接入真实设备像素密度比、重解码按原图上限夹界 +
 *    无增益跳过、PixelMap 边缘 AA。
 *  ⑨ 第十八轮窗口模式重做：ESC 严格按 fullscreen 两态分派（去掉 400ms 时间冷却
 *    对主动二次 ESC 的误吞）、系统被动退出沉浸改用「一次性补发标志」+ 绝对像素
 *    缩小自愈、几何快照放宽到所有普通窗口态并记录进入前形态。
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
 *  左键 / 抬起 / 移动 / 悬停 / 拖拽一律保持原状，不误触、不重复翻转。
 *  第七十六轮起 Index 不再用右键触发放大镜，本函数保留供第十五轮历史回归断言。 */
export function loupeEnabledAfterRightPress(wasEnabled: boolean,
  rightPress: boolean): boolean {
  return rightPress ? !wasEnabled : wasEnabled;
}

/** 第七十六轮：放大镜改由【预览区相片上左键单击】切换 ——
 *  首次左键开启、开启态再次左键还原为原始显示、可无限重复切换。
 *  右键 / 抬起 / 移动 / 悬停 / 拖拽 / 左栏点选档案一律保持原状。
 *  纯条件翻转，只依赖入参，零 SDK / 零 IO / 零全局可变状态。 */
export function loupeEnabledAfterLeftClick(wasEnabled: boolean,
  leftClick: boolean): boolean {
  return leftClick ? !wasEnabled : wasEnabled;
}

/** 放大镜最终是否绘制：总开关 + 双页独立激活 + 悬停 + 该页有图，四者缺一不可。
 *  总开关关闭时 loupeHover / loupePane / 坐标仍照常由鼠标事件维护（不复位），
 *  所以右键一开启就能立即显示当前页的放大内容，不必先移出再移入。 */
export function loupeVisibleOf(enabled: boolean, activePane: number, pane: number,
  hover: boolean, hasImage: boolean): boolean {
  return enabled && loupePaneActiveOf(activePane, pane, hover, hasImage);
}

// ==================================================================
// ⑥ 第十六轮：窗口模式 ESC 分派 / 全屏往返窗口几何保存与恢复
// ==================================================================

/** ESC 动作码（脱离 ArkUI 的语义常量，供 onKey 分派）。 */
export const ESC_ACT_NONE: number = 0;        // 忽略（刚退出全屏冷却期内的补发 / 迟到按键）
export const ESC_ACT_EXIT_FULL: number = 1;   // 退出全屏、返回普通模式、恢复窗口尺寸与位置
export const ESC_ACT_QUIT_APP: number = 2;    // 退出 APP

/** ESC 动作的唯一真值来源：**按当前窗口状态区分**。
 *  · 全屏态 → 恒 EXIT_FULL：全屏首次 ESC 只退出全屏并恢复进入前的窗口尺寸/位置，
 *    绝不退出 APP —— 这是「避免首次 ESC 直接退出 APP」的核心；
 *  · 非全屏且刚退出全屏的冷却期内（sinceExitMs 落在 [0, guardMs)）→ NONE：
 *    真全屏下 ESC 常被窗口管理器先消费，系统自行退出沉浸后由画布缩小触发
 *    自愈 setFull(false)，随后补发 / 迟到的那一次 ESC 会落到「非全屏」，
 *    若不拦截就会被当成「普通模式再次 ESC」而直接退出 APP；
 *  · 其余非全屏态 → QUIT_APP：返回普通模式后再次按 ESC 才退出 APP。
 *  sinceExitMs < 0 表示从未退出过全屏（无冷却）；guardMs <= 0 表示关闭冷却。
 *  冷却只吞「刚退出全屏这一瞬」的按键，不改变正常模式 ESC 退出 APP 的行为。 */
export function escActionOf(fullscreen: boolean, sinceExitMs: number,
  guardMs: number): number {
  if (fullscreen) {
    return ESC_ACT_EXIT_FULL;
  }
  if (guardMs > 0 && sinceExitMs >= 0 && sinceExitMs < guardMs) {
    return ESC_ACT_NONE;
  }
  return ESC_ACT_QUIT_APP;
}

/** 进入全屏时是否该保存「普通模式窗口尺寸与位置」快照：
 *  仅在 非全屏→全屏 的上升沿、且窗口是自由窗口（floating，有可精确恢复的 rect）时保存。
 *  已是最大化 / 系统全屏形态没有「普通模式几何」可存，交给既有 maximize(EXIT_IMMERSIVE)
 *  处理即可，不保存也不会误缩。 */
export function shouldCaptureWindowRect(prevFull: boolean, nextFull: boolean,
  floating: boolean): boolean {
  return !prevFull && nextFull && floating;
}

/** 退出全屏时是否该按快照精确恢复窗口尺寸与位置：
 *  仅在 全屏→普通 的下降沿、且确有可用快照（hasSnapshot + rectUsable）时恢复。
 *  没有快照（例如窗口未就绪 / 进入前是最大化）就保持既有 recover()/EXIT_IMMERSIVE 结果，
 *  绝不拿空 rect 去 resize / moveWindowTo。 */
export function shouldRestoreWindowRect(prevFull: boolean, nextFull: boolean,
  hasSnapshot: boolean, rectUsable: boolean): boolean {
  return prevFull && !nextFull && hasSnapshot && rectUsable;
}

/** 从上次退出全屏到现在的毫秒差：lastExitAt<=0（从未退出）返回 -1（无冷却）。
 *  纯数值，调用方传当前时刻，便于静态契约测试注入任意时间。 */
export function msSinceFullExitOf(now: number, lastExitAt: number): number {
  if (lastExitAt <= 0 || !(now === now) || !(lastExitAt === lastExitAt)) {
    return -1;
  }
  return now - lastExitAt;
}

// ==================================================================
// ⑦ 第十六轮：放大镜 >1:1 重采样（分档插值 / 整数对齐 / 1:1 旁路）
// ==================================================================

/** 1:1（100%）基准：显示倍率不超过它时不做任何额外重采样。 */
export const LOUPE_RESAMPLE_1X: number = 1;
/** Cubic(High) 锐利档的最大有效倍率：不超过它用 High 保线条清晰，超过它改用 Medium 平滑档，
 *  避免高倍放大欠采样源时 Cubic 锐化核放大振铃 / 过冲（光晕、边缘粗糙、伪影）。 */
export const LOUPE_CUBIC_MAX_SCALE: number = 2;

/** 图像插值档（脱离 SDK 的语义常量，Index.ets 映射到 ImageInterpolation）。
 *  按 HarmonyOS ArkUI 官方枚举：None=最近邻、Low=双线性、Medium=MipMap、High=Cubic。
 *
 *  ⚠️ 第十六轮注释曾断言「`.interpolation()` 对 PixelMap 不生效」，这是把
 *  `sourceSize()` 的限制张冠李戴了：SDK 26 `component/image.d.ts` L1088 明确
 *  `sourceSize` 不适用于 SVG / **PixelMap**；而 L1070 的 `interpolation()` 只排除
 *  SVG / AnimatedDrawableDescriptor，**对 PixelMap 正常生效**，官方注释就是
 *  "mitigates aliasing during image scaling"。第十七轮 ⑧ 节据此修正：插值档选错
 *  （放大镜恒 3× 却恒落 Medium/MipMap，缩小专用档用于放大）才是锯齿的直接主因。
 *
 *  下列 ⑦ 节常量 / 函数保留供第十六轮回归断言使用，第十七轮起 Index.ets 的放大镜
 *  **实际画质决策改用 ⑧ 节**，不再调用 loupeInterpolationTierOf。 */
export const LOUPE_IP_NONE: number = 0;      // ≤1:1：最近邻 / 不插值（旁路，1:1 显示不受影响）
export const LOUPE_IP_HIGH: number = 1;      // 1~2×：High(Cubic) 锐利重采样，补足像素、线条清晰
export const LOUPE_IP_MEDIUM: number = 2;    // >2×：Medium(MipMap)，第十六轮方案（已证语义错配）

/** 放大镜「有效放大倍率」= 局部放大倍率 × 主视图缩放 × 设备像素密度比。
 *  三者任一非法（<=0 / NaN）都按 1 处理，绝不把脏值传进档位判定。
 *  这是「当图案放大倍率超过原图 1:1 时」的判定真值来源。 */
export function loupeEffectiveScaleOf(loupeZoom: number, viewZoom: number,
  densityRatio: number): number {
  const z: number = loupeZoom > 0 && loupeZoom === loupeZoom ? loupeZoom : 1;
  const v: number = viewZoom > 0 && viewZoom === viewZoom ? viewZoom : 1;
  const d: number = densityRatio > 0 && densityRatio === densityRatio ? densityRatio : 1;
  return z * v * d;
}

/** 是否需要重采样补足像素：仅当有效放大倍率严格 > 1:1（100%）。
 *  ≤1:1（未缩放 / 正好 1:1 / 缩小）一律 false —— 保持原样、不引入任何模糊 / 光晕 / 伪影。 */
export function loupeNeedsResampleOf(scale: number): boolean {
  return scale === scale && scale > LOUPE_RESAMPLE_1X;
}

/** 按有效放大倍率分档选插值算法（消除锯齿 + 边缘平滑 + 清晰 + 不失真 + 不模糊不光晕）：
 *  · scale <= 1:1 → NONE：逐像素对应，未缩放 / 1:1 显示完全不受影响（绝不触碰）；
 *  · 1:1 < scale <= 2 → HIGH：Cubic 高质量重采样补足像素，线条清晰、形状颜色不失真；
 *    此倍率放大温和，Cubic 的锐化核不过冲，无明显光晕 / 伪影；
 *  · scale > 2 → MEDIUM：3 倍放大镜这类高倍放大改用平滑重采样 —— 高倍下把
 *    欠采样源（1:1 显示框分辨率 PixelMap）拉大时，Cubic 锐化核会放大振铃 / 过冲，
 *    产生光晕、边缘粗糙与伪影；Medium 平滑插值消锯齿、边缘平滑、不过冲。
 *  配合 objectFit(Contain) 等比不变形 + 整数像素对齐消除子像素错位导致的边缘粗糙。
 *  分档让不同倍率各取所需，1:1 及以下绝不改动画质。 */
export function loupeInterpolationTierOf(scale: number): number {
  if (!loupeNeedsResampleOf(scale)) {
    return LOUPE_IP_NONE;
  }
  return scale <= LOUPE_CUBIC_MAX_SCALE ? LOUPE_IP_HIGH : LOUPE_IP_MEDIUM;
}

/** 像素对齐：把浮点尺寸 / 坐标收敛到整像素，消除子像素采样带来的边缘粗糙与错位。
 *  尺寸、圆心、负向偏移（放大镜偏移常为负）一律取整；仅 NaN 原样返回由调用方兜底。 */
export function loupePixelAlignOf(px: number): number {
  if (!(px === px)) {
    return px;
  }
  return Math.round(px);
}

/** 重采样目标解码边：>1:1 时按倍率把解码边放大到「放大后显示像素需求」，并夹到 cap，
 *  让放大镜拿到足量**真实像素**（而不是把 1:1 显示框的 PixelMap 硬拉大）。
 *  ≤1:1 时原样返回 baseEdge（不改变既有 1:1 / 缩小显示路径）。
 *  cap <= 0 视为无上限；baseEdge 非法返回 0，绝不让调用方 resize 到非法尺寸。 */
export function loupeResampleEdgeOf(baseEdge: number, scale: number,
  cap: number): number {
  const base: number = baseEdge > 0 && baseEdge === baseEdge ? baseEdge : 0;
  if (base <= 0 || !loupeNeedsResampleOf(scale)) {
    return base;
  }
  const want: number = Math.ceil(base * scale);
  const c: number = cap > 0 && cap === cap ? cap : 0;
  return c > 0 ? Math.min(want, c) : want;
}

/** 重采样目标是否「稳定」：目标解码边相对上一档变化 < minDelta 时返回 true，
 *  表示沿用上一张高分辨率图、不重新解码 —— 鼠标在放大镜内高频微动也不会反复重解码 /
 *  重建 PixelMap，性能稳定。prevEdge<=0（首帧 / 还没有上一档）返回 false，必须解一次。 */
export function loupeResampleStableOf(prevEdge: number, nextEdge: number,
  minDelta: number): boolean {
  if (prevEdge <= 0) {
    return false;
  }
  const d: number = minDelta > 0 ? minDelta : 1;
  return Math.abs(nextEdge - prevEdge) < d;
}

// ==================================================================
// ⑧ 第十七轮：放大镜边缘抗锯齿（SDK 语义修正 / 真实密度 / 真实像素增益）
// ==================================================================

/** 设备逻辑像素密度比的合法区间：SDK 26 `@ohos.display` Display.densityPixels
 *  明确为 [0.5, 4.0]，常见 1.0 / 3.0。高 DPI 屏 1vp 对应 2~3 物理像素，
 *  放大镜写死 density=1 会低估倍率与所需真实像素 —— 这是「常见屏幕显示条件」的缺口。 */
export const LOUPE_DENSITY_MIN: number = 0.5;
export const LOUPE_DENSITY_MAX: number = 4.0;
/** 读不到 / 非法密度时回退：1vp = 1px，与屏幕 dpi 解耦的保守值（第十六轮口径）。 */
export const LOUPE_DENSITY_FALLBACK: number = 1;

/** PixelMap 边缘抗锯齿开关。SDK 26 `component/image.d.ts` L1723 `antialiased`
 *  （since 23，@stagemodelonly）明确 "enable anti-aliasing for the edges of a pixel
 *  map image"，且 **"If the attribute is not set, anti-aliasing is disabled by default"**。
 *  放大镜正是「把 PixelMap 放大后裁成圆」的典型场景，恒开启；未用 resizable / 未设
 *  backgroundColor，官方两个失效条件都不触发。 */
export const LOUPE_AA_ENABLED: boolean = true;

/** 归一化设备像素密度比：NaN / 非有限 / <=0 一律回退 1，越界夹到 [0.5, 4.0]，
 *  绝不把脏值传进倍率判定与解码边计算。 */
export function loupeDensityRatioOf(raw: number): number {
  if (!(raw === raw) || raw <= 0) {
    return LOUPE_DENSITY_FALLBACK;
  }
  if (raw < LOUPE_DENSITY_MIN) {
    return LOUPE_DENSITY_MIN;
  }
  if (raw > LOUPE_DENSITY_MAX) {
    return LOUPE_DENSITY_MAX;
  }
  return raw;
}

/** 第十七轮画质档（SDK 官方枚举语义修正版）。
 *  依据 `component/image.d.ts` L190-236：
 *    · High   = Cubic，官方 "produces scaled images of the **highest possible
 *      quality**"，是**放大**该用的档；
 *    · Medium = MipMap，预生成低分辨率金字塔，是**缩小**(minification) 专用档，
 *      放大时只会退化 / 发糊 —— 第十六轮把放大镜恒 3× 判成它，是锯齿 / 模糊的直接主因；
 *    · None   = 最近邻，锯齿 / 像素化之源，绝不用于放大镜；
 *    · Low    = 双线性，1:1 逐像素对应不受影响、缩小时比最近邻平滑。
 *  · scale > 1:1 → HIGH：任意放大倍率都走 Cubic，边缘平滑 + 线条清晰 + 不失真；
 *  · scale <= 1:1 → LOW：1:1 显示不受影响，缩小也比最近邻平滑；
 *  · 脏值(NaN) → LOW 安全兜底，绝不让放大镜落到最近邻。 */
export const LOUPE_QA_HIGH: number = 1;
export const LOUPE_QA_LOW: number = 0;

export function loupeQualityTierOf(scale: number): number {
  if (!(scale === scale)) {
    return LOUPE_QA_LOW;
  }
  return scale > LOUPE_RESAMPLE_1X ? LOUPE_QA_HIGH : LOUPE_QA_LOW;
}

/** 第十七轮目标解码边：按「放大后真实像素需求 = base × scale」算（scale 已含
 *  真实密度比），夹到 cap 后**再夹到原图长边 srcLong**。
 *  ⚠️ `decodePx` 的 desiredSize 只能降采样、不能升采样（SDK L1088 "works only when
 *  the target size is smaller than the source size"）：请求超过原图边毫无意义，
 *  只会白解码一次 + 白占一张大 PixelMap。小图 / 原图尺寸未知时由本函数与
 *  loupeResampleGainOf 一起把画质交回 Cubic + AA，性能稳定。
 *  · <=1:1 返回 base（1:1 旁路，不额外解码）；base 非法返回 0。 */
export function loupeResampleEdge2Of(baseEdge: number, scale: number,
  srcLong: number, cap: number): number {
  const base: number = baseEdge > 0 && baseEdge === baseEdge ? baseEdge : 0;
  if (base <= 0 || !loupeNeedsResampleOf(scale)) {
    return base;
  }
  const want: number = Math.ceil(base * scale);
  const c: number = cap > 0 && cap === cap ? cap : 0;
  let edge: number = c > 0 ? Math.min(want, c) : want;
  if (srcLong > 0 && srcLong === srcLong) {
    edge = Math.min(edge, Math.floor(srcLong));
  }
  return edge;
}

/** 重解码是否有「真实像素增益」：desiredSize 不升采样，实际最多只能拿到
 *  min(目标边, 原图长边)。只有当它明显超过主视图当前解码边时，重解码才补得出像素；
 *  否则（小图 / 原图分辨率不足 / 已按原图满分辨率解过）**跳过重解码**，直接靠
 *  Cubic + antialiased 保证边缘平滑 —— 省一次解码、省一张大图内存，性能稳定。
 *  srcLong <= 0（尺寸未知 / 缓存未命中）保守返回 true，交给 stable 阈值与 token 兜底。 */
export function loupeResampleGainOf(targetEdge: number, srcLong: number,
  currentEdge: number, minGain: number): boolean {
  if (!(targetEdge === targetEdge) || targetEdge <= 0) {
    return false;
  }
  const avail: number = srcLong > 0 && srcLong === srcLong
    ? Math.min(targetEdge, srcLong) : targetEdge;
  const cur: number = currentEdge > 0 && currentEdge === currentEdge ? currentEdge : 0;
  const g: number = minGain > 0 && minGain === minGain ? minGain : 1;
  return avail > cur + g;
}

// ==================================================================
// ⑨ 第十八轮：窗口模式 ESC 严格两态分派 / 系统被动退出补发吞键 /
//    全窗口态几何快照 / 绝对像素缩小自愈
// ==================================================================

/**
 * ESC 动作的**唯一真值来源（第十九轮定稿）**：严格只按当前窗口状态两态分派。
 *
 * 复现 / 根因（用户第十九轮实机反馈「第二次 ESC 无任何响应」）：真全屏下首次 ESC
 * 由系统窗口管理器消费、自行退出沉浸，APP 收不到该按键，只能靠画布缩小触发
 * onAreaChange 的「自愈」把 fullscreen 同步回普通态。第十八轮据此经 shouldArmSystemEcho
 * 置位 pendingSystemEcho，并让本函数在 (false, true) 时返回 ESC_ACT_NONE「吞一次补发 ESC」。
 * 但**系统消费首次 ESC 后并不把它补发给 APP**：那个标志没有任何补发事件来消费，
 * 于是用户主动按下的「第二次 ESC」到达时仍挂着该标志 → 被判 NONE 吞掉 → 无任何响应。
 * 第十六轮 400ms 时间冷却、第十八轮一次性补发标志，本质都是对「系统补发 ESC」
 * 的错误猜测：既无法区分补发与主动按键，又会挂住一个永不消费的标志。
 *
 * 定稿：ESC 只看 fullscreen 当前状态，绝不依赖任何瞬时标志 / 时间窗：
 *  · 全屏 → EXIT_FULL：首次 ESC（若到达 APP）只退全屏并恢复几何，绝不退出 APP；
 *  · 普通 → QUIT_APP：返回普通模式后再次 ESC 立刻退出 APP（无论此前是否发生过系统自愈）。
 * 第二参数保留仅为兼容既有调用点与回归断言，**刻意不参与判定**（下划线前缀即标记）；
 * 系统补发在实机不存在，NONE 吞键分支有害，故彻底废除。
 *
 * 第十六轮旧 `escActionOf(fullscreen, sinceExitMs, guardMs)` 保留供回归断言，
 * 第十八轮 `shouldArmSystemEcho` 保留导出但恒返回 false（永不置位）。
 */
export function escActionByState(fullscreen: boolean,
  _pendingSystemEcho: boolean): number {
  return fullscreen ? ESC_ACT_EXIT_FULL : ESC_ACT_QUIT_APP;
}

/**
 * 是否置「待吞补发 ESC」标志 —— **第十九轮起恒 false，该机制彻底废除**。
 *  · 第十八轮在「系统被动退出沉浸」的下降沿置位，想吞掉一次紧随的补发 ESC；
 *    但实机系统消费首次 ESC 后并不补发，标志不会被任何事件消费，反而把用户
 *    主动的第二次 ESC 误吞 → 「第二次 ESC 无响应」（本轮修复的直接病根）。
 *  · 现在 ESC 由 escActionByState 严格按窗口状态两态分派，无需任何补发标志；
 *    setFull(false, true) 仍保留来源参数供诊断，但本函数恒不置位，
 *    pendingSystemEcho 恒为 false，杜绝一切吞键可能。
 */
export function shouldArmSystemEcho(_bySystemHeal: boolean,
  _prevFull: boolean, _nextFull: boolean): boolean {
  return false;
}

/**
 * 几何快照判据（第十八轮放宽）：非全屏→全屏上升沿，只要能拿到合法 rect 就抓。
 * 第十六轮 `shouldCaptureWindowRect` 额外要求 `getWindowStatus()===FLOATING`，
 * 但 PC / 2in1 上自由窗口的状态值不总是 FLOATING（也可能 MAXIMIZE / UNDEFINED），
 * 于是快照常常不抓 → 退出时 hasPreFullRect=false → 「恢复进入前尺寸位置」不执行。
 * 这里放宽后仍由调用方记录「进入前是否自由窗口」，恢复时据此决定是否 resize /
 * moveWindowTo（最大化态交给 maximize(EXIT_IMMERSIVE) 保持，绝不误缩）。
 */
export function shouldCaptureRectAll(prevFull: boolean, nextFull: boolean,
  rectUsable: boolean): boolean {
  return !prevFull && nextFull && rectUsable;
}

/**
 * 恢复几何时是否真的 resize + moveWindowTo：仅「进入前是自由窗口」才精确还原，
 * 最大化 / 系统全屏态交给 applyWindowFullScreen 的 maximize(EXIT_IMMERSIVE) / recover
 * 维持形态，绝不拿快照把一个最大化窗口 resize 成自由窗口（否则形态被破坏）。
 */
export function shouldApplyRectRestore(wasFloating: boolean, rectUsable: boolean): boolean {
  return wasFloating && rectUsable;
}

/**
 * 系统自行退出沉浸的「自愈」判据（第十八轮放宽）：全屏态 + 已过进全屏稳定期 +
 * 画布出现「≥ minShrinkPx 的可见缩小」即判定系统替用户退出了全屏，APP 需把
 * fullscreen 同步回普通模式并恢复几何。
 *
 * 第十六轮 `shouldExitFullOnResize` 要求缩到 `fullW*0.92` 以下（比例阈值）；但真全屏
 * ESC 被窗口管理器消费后，系统往往只是把 title / dock / 系统栏恢复，画布仅缩小
 * 几十 px（常见 ~0.95），远达不到 0.92 → 自愈从不触发 → `fullscreen` 与真实窗口
 * 长期脱节 → 「ESC 按当前窗口状态区分」整体失效。改用**绝对像素**判据即可捕获
 * 这种小幅缩小，同时用 minShrinkPx（默认 8）挡住 1~3px 的正常布局抖动。
 * stable 由调用方按「进全屏已过 guard」传入，避免刚进全屏的画布变化被误判。
 */
export function shouldSelfHealOnResize(fullscreen: boolean, stable: boolean,
  fullW: number, fullH: number, newW: number, newH: number,
  minShrinkPx: number): boolean {
  if (!fullscreen || !stable || fullW <= 0 || fullH <= 0 || newW <= 0 || newH <= 0) {
    return false;
  }
  const m: number = minShrinkPx > 0 && minShrinkPx === minShrinkPx ? minShrinkPx : 8;
  return (fullW - newW) >= m || (fullH - newH) >= m;
}

// ==================== ⑩ 第二十一轮：窗口真实状态同步（ESC 链路的权威真值） ====================
/**
 * 系统窗口状态是否算「全屏」：`window.WindowStatusType` 中只有
 * FULL_SCREEN(1) / MAXIMIZE(2) 两种是 APP 进真全屏时的形态（本项目走
 * maximize(ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER)）；系统消费首次 ESC
 * 退出沉浸后通常是 FLOATING(4) / UNDEFINED(0) / MINIMIZE(3)。
 *
 * 只认 1/2，其余一律判「非全屏」：宁可早一点判普通，也不能让 fullscreen
 * 卡在 true —— 那会让用户主动的第二次 ESC 又被 escActionByState 判成 EXIT_FULL。
 */
export function windowStatusIsFullscreen(status: number): boolean {
  return status === 1 || status === 2;
}

/**
 * 是否需要把 APP 内部 `fullscreen` 同步为 false（第二十一轮唯一真值来源）。
 *
 * 用户实机截图（2026-11-15）证据：系统已退出沉浸最大化、窗口变回带标题栏的
 * 自由窗口，但 APP 界面仍是无左栏 / 无顶栏 / 无状态栏的全屏布局 —— 说明
 * `this.fullscreen` 卡在 true。原因是首次 ESC 由系统窗口管理器消费，APP 只能靠
 * onAreaChange 画布缩小「猜」系统退出；若画布没缩到阈值 / 事件没派发，
 * setFull(false) 就永不执行，连带第二十轮挂在 setFull 里的重聚焦也不执行，
 * 于是第二次 ESC 既到不了 onKey、到了也会被判 EXIT_FULL。
 *
 * 现在改由 `win.on('windowStatusChange')` 直接读系统状态（该回调整窗口管理器
 * 派发，不经过 ESC 按键通道、不依赖焦点），并在每次 ESC 到达时再主动读一次
 * getWindowStatus() 兜底。仅「APP 自认全屏 + 系统实际已非全屏」才同步，
 * APP 自己进 / 退全屏的过程不触发，避免递归 setFull。
 */
export function shouldSyncFullFromWindow(appFull: boolean, winStatusFull: boolean): boolean {
  return appFull && !winStatusFull;
}

// ==================================================================
// 第九十五轮：F 键切换全屏 —— 三道闸门（可编辑区 / 修饰键 / 连按去抖）
// ==================================================================

/**
 * F 键这一下**是否应该切换全屏**。
 *
 * 为什么需要它而不是直接 `toggleFull()`：
 *  · 根容器用的是 `onKeyEventDispatch`（**分发阶段**，先于目标组件），
 *    输入框 / 可编辑区域里敲的 `f` 也会先经过它 —— 若不判 `blocked`，
 *    用户在任何可编辑区域打一个 f 就会整屏切走（本条正是用户明确要求避免的）；
 *  · `Ctrl+F` 是「查找」的通用习惯，不能顺手把界面切全屏；
 *  · 大小写 F 走的是**同一个** `KeyCode.KEYCODE_F`（Shift 只改 `shiftDown`），
 *    所以这里**不看** shift —— F 与 Shift+F 都必须生效。
 *
 * @param ctrlDown Ctrl 是否按下（true = 属于组合键，不接管）
 * @param blocked  可编辑区域 / 文本预览 / 浮层打开等「此刻不该动布局」的场景
 */
export function fullKeyEligibleOf(ctrlDown: boolean, blocked: boolean): boolean {
  if (ctrlDown === true) {
    return false;
  }
  return blocked !== true;
}

/**
 * 连按去抖：两次「真正生效的 F」之间至少间隔 `minIntervalMs`。
 *
 * 为什么必须有：按住 F 不松时系统会连发 Down（每次都是**新的 KeyEvent 对象**，
 * 跨通道的「同对象去重」拦不住），没有这层会把全屏开关刷成频闪；
 * 而 `setFull()` 里的窗口 API 是异步的（maximize / 沉浸 / resize），
 * 高频重入必然出现「状态位是 on、窗口还在过渡」的错位。
 *
 * 首按放行（`lastMs <= 0`）；`minIntervalMs <= 0` 视为不设限；
 * 任一侧是 NaN 时放行 —— 宁可多切一次，也不要因为脏时间戳把功能锁死。
 */
export function fullToggleAllowedOf(nowMs: number, lastMs: number,
  minIntervalMs: number): boolean {
  if (minIntervalMs <= 0) {
    return true;
  }
  if (nowMs !== nowMs || lastMs !== lastMs) {
    return true;
  }
  if (lastMs <= 0) {
    return true;
  }
  return (nowMs - lastMs) >= minIntervalMs;
}
