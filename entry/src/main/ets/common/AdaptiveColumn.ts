/**
 * common/AdaptiveColumn.ts —— 第七十七轮：档案列表 adaptive column width 唯一真值源
 *
 * 用户要求：「档案列表改为 adaptive column width，依据内容长度或容器尺寸动态伸缩，
 * 移除所有预设/固定宽度限制」。
 *
 * 与旧实现的差别（按真实源码判读）：
 *  · 旧：名称列 `.constraintSize({ minWidth: textWidthVp(name, 12) })`、
 *    大小 / 内容数目列 `.width(66)`、日期列 `.width(88)`；左栏整体被
 *    `LIST_W=280` / `LIST_MAX_W=900` 与 `listWidthForNames` 里写死的固定开销 226 夹逼，
 *    收起态写死 `LIST_COLLAPSED_W=224` —— 全是预设 / 固定宽度限制。
 *  · 新：三列宽与左栏整体宽**全部由入参推导**：
 *      - 内容长度：各列最长显示文本经 `textWidthVp()` 估算；
 *      - 容器尺寸：根窗口宽 rootW 经比例系数给出可用上限（resize 后重算）；
 *    同一套动态值逐层下传给每一行 ⇒ 三栏仍然整齐对齐，但不再有任何写死的列宽 vp 数字。
 *
 * 保留项（不是「列宽限制」，属 R76 已确认的间距 / 既有内边距）：
 *  名称→大小、名称→内容数目两处 `ROW_GAP_VP`、日期列 `.margin({ left: 6 })`、
 *  行 `.padding({ right: 6 })`。间距随内容 / 容器不参与伸缩。
 *
 * 严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零全局可变状态。
 */
import { textWidthVp } from './DirName.ts';
import { ROW_GAP_VP } from './RowGap.ts';

/** 左栏占根窗口宽的比例上限：相对量而非固定宽度，窗口越大上限越大。 */
export const AC_SIDEBAR_RATIO: number = 0.62;
/** 第七十八轮：收起态只作「上限保护」的比例 —— **不再是下限留白**。
 *  旧实现 collapsedW = floor(rootW * 0.30)，1440 窗口会给出 432vp 的空白栏；
 *  R78 起收起宽由 acCollapsedContentOf() 按名称 + 图标按钮的可见内容撑开，
 *  仅当内容宽超过本比例时才被压窄，绝不再凭容器比例凭空留白。 */
export const AC_COLLAPSED_RATIO: number = 0.30;
/** 日期列既有 margin（间距，不是列宽）。 */
export const AC_DATE_GAP_VP: number = 6;
/** 行既有右 padding（内边距，不是列宽）。 */
export const AC_ROW_PAD_VP: number = 6;
/** 左栏 List 既有右 padding（内边距，不是列宽）。 */
export const AC_LIST_PAD_VP: number = 8;
/** 第七十八轮：三个图标按钮并排所需的最小可读宽（按内容推导，不是固定栏宽）。
 *  单个按钮 = padding 左右各 10 + margin 左右各 3 + 图案本身约 16vp。 */
export const AC_ICON_BTN_MIN_VP: number = 42;
export const AC_ICON_BTN_COUNT: number = 3;
export const AC_ICON_ROW_PAD_VP: number = 12;
/** 日期列显示格式（按这个内容长度估宽，而不是写死列宽）。 */
export const AC_DATE_SAMPLE: string = 'YY-MM-DD HH:mm';
/** 三列字号，与 ArchiveRow 的 fontSize 逐字一致。 */
export const AC_NAME_FONT_VP: number = 12;
export const AC_SIZE_FONT_VP: number = 10;
export const AC_DATE_FONT_VP: number = 10;

/** 一次自适应测量的全部结果，逐层下传给 SidebarView / ArchiveRow。 */
export interface AcLayout {
  sidebarW: number;    // 左栏展开宽（按内容 / 容器动态）
  collapsedW: number;  // 左栏收起宽（R78：按当前可见内容推导，不再按容器比例留白）
  nameW: number;       // 名称列动态宽（供诊断 / 兜底，UI 仍用 layoutWeight 吸收）
  sizeW: number;       // 大小 / 内容数目列动态宽（按本列最长内容）
  dateW: number;       // 日期列动态宽（按日期格式内容长度）
}

function finiteOf(v: number): boolean {
  return v - v === 0;
}

function posOf(v: number): number {
  return finiteOf(v) && v > 0 ? v : 0;
}

/** 一批显示文本里最长的估宽（内容长度口径）。脏值 / 空数组一律 0。 */
export function acTextWidestOf(texts: Array<string>, fontVp: number): number {
  let w: number = 0;
  const f: number = posOf(fontVp) > 0 ? fontVp : 12;
  for (let i: number = 0; i < texts.length; i++) {
    const t: string = texts[i] === undefined || texts[i] === null ? '' : String(texts[i]);
    const v: number = textWidthVp(t, f);
    if (v > w) {
      w = v;
    }
  }
  return Math.ceil(w);
}

/** 第七十八轮：紧凑（缩进按钮按下）态左栏的「当前可见内容宽」。
 *  按下态只显示档案名 / 目录名 + 左栏上方三个图标按钮，时间 / 大小 / 状态 /
 *  辅助标签全部隐藏，所以宽度只由两样可见内容决定：
 *    · 名称列最长文本估宽 + 行右 padding + List 右 padding；
 *    · 三个图标按钮并排的最小可读宽 + 按钮行 padding（保证点击区域不被压扁）；
 *  两者取大 ⇒ 既贴合内容、不留多余空白，又不会把按钮挤到看不清 / 点不中。
 *  严格零 SDK / 零 IO / 零异步，入参脏值一律按空数组处理。 */
export function acCollapsedContentOf(names: Array<string>): number {
  const nameVp: number = acTextWidestOf(names, AC_NAME_FONT_VP);
  const nameNeed: number = nameVp + AC_ROW_PAD_VP + AC_LIST_PAD_VP;
  const btnNeed: number = AC_ICON_BTN_COUNT * AC_ICON_BTN_MIN_VP + AC_ICON_ROW_PAD_VP;
  return nameNeed > btnNeed ? nameNeed : btnNeed;
}

/** 两列间距 + 日期列既有 margin + 行右 padding 的固定开销（间距 / 内边距，非列宽）。 */
export function acOverheadOf(): number {
  return ROW_GAP_VP * 2 + AC_DATE_GAP_VP + AC_ROW_PAD_VP;
}

/** 依据【内容长度 + 容器尺寸】算出三列与左栏整体宽。
 *  · rootW=0（首帧还没 onAreaChange）→ 纯按内容长度撑开，窗口尺寸到手后再重算；
 *  · 容器变窄 → 先压左栏整体，名称列再由 layoutWeight(1) + Ellipsis 吸收，
 *    大小 / 日期两列始终按本列最长内容保持可读，不会被挤成省略号；
 *  · 全程没有任何 min/max 固定 vp 夹逼，结果只由入参决定。
 *  · 第七十八轮：收起宽不再随容器比例放大（旧 0.30 下限会留一大片空白），
 *    改由 acCollapsedContentOf(names) 按「最长名称 + 三个图标按钮」撑开，
 *    比例只在内容宽超过根窗口承载时作上限保护。 */
export function acLayoutOf(rootW: number, names: Array<string>,
  sizeTexts: Array<string>): AcLayout {
  const rw: number = posOf(rootW);
  const nameVp: number = acTextWidestOf(names, AC_NAME_FONT_VP);
  const sizeW: number = acTextWidestOf(sizeTexts, AC_SIZE_FONT_VP);
  const dateW: number = Math.ceil(textWidthVp(AC_DATE_SAMPLE, AC_DATE_FONT_VP));
  const overhead: number = acOverheadOf();
  // 内容长度口径：三列都按本列最长文本撑开。
  const need: number = nameVp + sizeW + dateW + overhead;
  // 容器尺寸口径：左栏最多占根窗口的比例；窗口未知时纯按内容长度。
  const cap: number = rw > 0 ? Math.floor(rw * AC_SIDEBAR_RATIO) : need;
  const sidebarW: number = cap > 0 && need > cap ? cap : need;
  // 名称列吸收剩余（UI 侧仍由 layoutWeight(1) 弹性决定，这里只作诊断 / 兜底量）。
  const nameW: number = sidebarW - sizeW - dateW - overhead;
  // 第七十八轮：收起宽只由「当前可见内容」推导（名称 + 三个图标按钮），
  //  AC_COLLAPSED_RATIO 仅作上限保护（只可能收窄，绝不再制造比例留白）。
  const contentW: number = acCollapsedContentOf(names);
  const capW: number = rw > 0 ? Math.floor(rw * AC_COLLAPSED_RATIO) : 0;
  const collapsedW: number = capW > 0 && contentW > capW ? capW : contentW;
  return {
    sidebarW: sidebarW > 0 ? Math.ceil(sidebarW) : need,
    collapsedW: collapsedW > 0 ? Math.ceil(collapsedW) : nameVp,
    nameW: nameW > 0 ? Math.ceil(nameW) : 0,
    sizeW: sizeW,
    dateW: dateW
  };
}

/** 下传给 ArkUI 之前的脏值护栏：NaN / 非正数不能进 .width()（会崩布局）。 */
export function acWidthSafeOf(w: number, fallback: number): number {
  if (finiteOf(w) && w > 0) {
    return Math.ceil(w);
  }
  return finiteOf(fallback) && fallback > 0 ? Math.ceil(fallback) : 0;
}

/** 是否确实做到「没有任何预设 / 固定宽度」：布局全由 acLayoutOf 的入参推出。 */
export function acAdaptiveOf(rootW: number, names: Array<string>,
  sizeTexts: Array<string>): boolean {
  const a: AcLayout = acLayoutOf(rootW, names, sizeTexts);
  const b: AcLayout = acLayoutOf(rootW, [], []);
  return a.sizeW > 0 && a.dateW > 0 && a.sidebarW >= b.sidebarW &&
    a.nameW >= 0 && finiteOf(a.sidebarW) && finiteOf(a.collapsedW);
}
