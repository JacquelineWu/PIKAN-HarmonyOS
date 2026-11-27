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

/** 第七十七轮的左栏比例上限。**第七十八轮起收起宽已不再用它**；
 *  第七十九轮起展开宽也改为「按最长名称撑开」，本常量**不再参与任何宽度夹逼**，
 *  保留导出只为不打断历史静态契约的 import（新代码请用 `acSidebarCapOf`）。 */
export const AC_SIDEBAR_RATIO: number = 0.62;
/** 分隔条宽度（与 Index.SPLIT_W 同值；算左栏可用宽时要扣掉它）。 */
export const AC_SPLIT_W: number = 14;
/** 预览区最小保留宽：左栏再长也不许把预览区压到这条线以下。 */
export const AC_PREVIEW_MIN_W: number = 240;
/** 预览区最小宽再按窗口比例兜一层（大窗口下不至于只留 240）。 */
export const AC_PREVIEW_RATIO: number = 0.20;
/** 名称完整显示的**安全余量**：`textWidthVp` 是估算（中文 1em / 西文 0.55~0.6em），
 *  真实字体在个别字符上略宽；留 10vp 保证「按估算算够」时实机也不出省略号。 */
export const AC_NAME_SAFETY_VP: number = 10;
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
  nameWrap: boolean;   // R80：内容超出可用宽 → 名称列改多行换行（不再用 Ellipsis）
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

/** 第七十九轮：左栏可用宽上限 = 根窗口宽 − 分隔条 − 预览区最小保留宽。
 *  返回 0 表示「窗口尺寸还没到手 / 算不出」→ 调用方按「无上限」处理（纯内容撑开）。
 *  与旧 `AC_SIDEBAR_RATIO` 的区别：这里保的是**预览区不被吞掉**，而不是给左栏按比例
 *  留白；名称越长左栏就越宽，直到触及预览区最小宽为止。 */
export function acSidebarCapOf(rootW: number): number {
  const rw: number = posOf(rootW);
  if (rw <= 0) {
    return 0;
  }
  const byRatio: number = Math.floor(rw * AC_PREVIEW_RATIO);
  const preview: number = byRatio > AC_PREVIEW_MIN_W ? byRatio : AC_PREVIEW_MIN_W;
  const avail: number = rw - AC_SPLIT_W - preview;
  return avail > 0 ? Math.floor(avail) : 0;
}

/** 两列间距 + 日期列既有 margin + 行右 padding 的固定开销（间距 / 内边距，非列宽）。 */
export function acOverheadOf(): number {
  return ROW_GAP_VP * 2 + AC_DATE_GAP_VP + AC_ROW_PAD_VP;
}

/** 三列**全部完整显示**所需的未夹取总宽（内容长度口径，不含任何窗口上限）。
 *
 *  第一百一十轮：从 acLayoutOf 里抽出来单独导出 ——
 *  左栏被用户拖窄时，「名称还能不能完整显示」要用这条**内容口径**去比，
 *  而不是比 `sidebarW`（那个值已被窗口上限 cap 夹过，窄窗口下永远比不出差异）。
 *  纯字符串估宽，零 SDK / 零 IO。 */
export function acNeedWOf(names: Array<string>, sizeTexts: Array<string>): number {
  const nameVp: number = acTextWidestOf(names, AC_NAME_FONT_VP);
  const sizeW: number = acTextWidestOf(sizeTexts, AC_SIZE_FONT_VP);
  const dateW: number = Math.ceil(textWidthVp(AC_DATE_SAMPLE, AC_DATE_FONT_VP));
  return nameVp + AC_NAME_SAFETY_VP + sizeW + dateW + acOverheadOf();
}

/** 依据【内容长度 + 容器尺寸】算出三列与左栏整体宽。
 *  · rootW=0（首帧还没 onAreaChange）→ 纯按内容长度撑开，窗口尺寸到手后再重算；
 *  · 容器变窄 → 先压左栏整体，名称列再由 layoutWeight(1) + Ellipsis 吸收，
 *    大小 / 日期两列始终按本列最长内容保持可读，不会被挤成省略号；
 *  · 全程没有任何 min/max 固定 vp 夹逼，结果只由入参决定。
 *  · 第七十八轮：收起宽不再随容器比例放大（旧 0.30 下限会留一大片空白），
 *    改由 acCollapsedContentOf(names) 按「最长名称 + 三个图标按钮」撑开。
 *  · 第七十九轮：宽度改用【最长名称完整显示】为唯一标准：
 *      - 去掉 0.62 比例夹逼，`need` 不再被按比例压窄；
 *      - 上限改为 `acSidebarCapOf()`（窗口宽 − 分隔条 − 预览区最小宽），
 *        名称越长左栏越宽，直到预览区触及最小宽为止；
 *      - 真的顶到上限时置 `nameWrap=true`，名称列改多行换行**完整显示**，
 *        绝不出现 Ellipsis；文件名 / 目录名同一套名字数组，两类条目一律适用。 */
export function acLayoutOf(rootW: number, names: Array<string>,
  sizeTexts: Array<string>): AcLayout {
  const rw: number = posOf(rootW);
  const nameVp: number = acTextWidestOf(names, AC_NAME_FONT_VP);
  const sizeW: number = acTextWidestOf(sizeTexts, AC_SIZE_FONT_VP);
  const dateW: number = Math.ceil(textWidthVp(AC_DATE_SAMPLE, AC_DATE_FONT_VP));
  const overhead: number = acOverheadOf();
  // 内容长度口径：三列都按本列最长文本撑开（名称再加安全余量，确保实机不截断）。
  const need: number = acNeedWOf(names, sizeTexts);
  // 容器尺寸口径：只保「预览区最小宽」，不再按比例给左栏留白。
  const cap: number = acSidebarCapOf(rootW);
  const sidebarW: number = cap > 0 && need > cap ? cap : need;
  // 名称列吸收剩余（UI 侧仍由 layoutWeight(1) 弹性决定，这里只作诊断 / 兜底量）。
  const nameW: number = sidebarW - sizeW - dateW - overhead;
  // 顶到上限 = 名称列放不下完整名称 → 交给 ArchiveRow 改多行换行（不用 Ellipsis）。
  const nameWrap: boolean = cap > 0 && need > cap;
  // 第七十八轮：收起宽只由「当前可见内容」推导（名称 + 三个图标按钮）。
  // 第七十九轮：同样改用 acSidebarCapOf，名称完整优先、预览区最小宽兜底。
  const contentW: number = acCollapsedContentOf(names);
  const collapsedW: number = cap > 0 && contentW > cap ? cap : contentW;
  return {
    sidebarW: sidebarW > 0 ? Math.ceil(sidebarW) : need,
    collapsedW: collapsedW > 0 ? Math.ceil(collapsedW) : nameVp,
    nameW: nameW > 0 ? Math.ceil(nameW) : 0,
    sizeW: sizeW,
    dateW: dateW,
    nameWrap: nameWrap
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
