/**
 * common/HighlightVisible.ts —— 第六十轮：左栏「高亮项恒定完整可见」的纯函数真值源。
 *
 *  背景（R60）：左栏由 SidebarView 的 List + LazyForEach 渲染；BarState.Auto 的原生
 *  滚动条、容器尺寸变化、目录换源 / 展开折叠都会改变「当前可见范围」。既有链只在
 *  换源 / 点选 / 翻页时用 scrollToIndex(row, false)（默认 START 对齐）定位，且
 *  stepScrollAction 把「目标行 == 可见首 / 末行」视为已在范围内而不滚 —— 于是刚好
 *  卡在视区边缘、只露出半行的高亮不会被校正；APP 内上层清单 cur=-1 时唯一高亮是
 *  第五十九轮的反色行，更是完全没有定位入口。
 *
 *  本模块只做数值 / 布尔判定：零 SDK 依赖、零文件 IO、零 await / throw、
 *  零全局可变状态，可被 tests/dirname.test.mjs 以 --experimental-strip-types 直接加载。
 *  UI 侧（Index.ets）负责把它给出的动作码映射为 Scroller.scrollToIndex 的
 *  ScrollAlign.AUTO ——「滚动最小距离使该行完整显示」，因此不引入任何额外
 *  padding / margin / offset，也不会产生布局跳动；高亮态、选中交互、列表顺序
 *  与滚动体验全部沿用既有链。
 */

/** 无需校正：挂起未置位 / 可见范围未知 / 同一态已校正 / 高亮已在安全可见区。 */
export const HV_NONE: number = 0;
/** 需要一次「最小位移完整显示」校正。 */
export const HV_REVEAL: number = 1;
/** 无效自锁 key / 无效对齐码。 */
export const HV_KEY_INVALID: number = -1;
/** ScrollAlign.AUTO 的语义值：滚动最小距离使指定项完整显示（已完整可见时不产生位移）。 */
export const HV_ALIGN_AUTO: number = 3;

/** 当前主高亮行：常规选中行优先；无选中（APP 内上层清单 cur=-1）时退回反色行。
 *  越界下标一律夹掉；没有任何高亮时返回 -1，调用方直接跳过护栏。 */
export function highlightRowOf(selectedRow: number, invertedRow: number,
  totalRows: number): number {
  if (totalRows <= 0) {
    return -1;
  }
  const s: number = (selectedRow >= 0 && selectedRow < totalRows) ? selectedRow : -1;
  if (s >= 0) {
    return s;
  }
  const i: number = (invertedRow >= 0 && invertedRow < totalRows) ? invertedRow : -1;
  return i;
}

/** 高亮行是否已完整落在「安全可见区」。
 *  安全区取可见范围的开区间 (firstRow, lastRow)：List 的 onScrollIndex 上报的
 *  first / last 包含仅部分可见的边缘行，边缘行随时可能被滚动条遮挡或被裁掉，
 *  因此 row == firstRow 或 row == lastRow 一律不算完整可见。 */
export function highlightSafeOf(row: number, firstRow: number, lastRow: number,
  totalRows: number): boolean {
  if (row < 0 || totalRows <= 0 || firstRow < 0 || lastRow < firstRow) {
    return false;
  }
  return row > firstRow && row < lastRow;
}

/** 自锁 key：把 (row, first, last, total) 编成一个数。
 *  同一组数值重复上报时返回相同 key，护栏据此只校正一次，避免 onScrollIndex
 *  高频回调里反复 scrollToIndex 造成布局跳动。 */
export function highlightGuardKeyOf(row: number, firstRow: number, lastRow: number,
  totalRows: number): number {
  if (row < 0 || totalRows <= 0 || firstRow < 0 || lastRow < firstRow) {
    return HV_KEY_INVALID;
  }
  return (((row * 31) + firstRow) * 31 + lastRow) * 31 + totalRows;
}

/** 是否需要校正 —— 唯一真值来源。
 *  · pending=false（纯滚动过程）恒 HV_NONE：绝不打断用户滚动、绝不改变滚动体验；
 *  · 可见范围尚未上报 / 下标非法 → HV_NONE，且**不消费挂起**，等下一次上报；
 *  · 与上次校正同一 key → HV_NONE（防抖）；
 *  · 已在安全可见区 → HV_NONE；
 *  · 其余（边缘半可见 / 被挤出视区 / 换源后行位置变化）→ HV_REVEAL。 */
export function highlightGuardActionOf(row: number, firstRow: number, lastRow: number,
  totalRows: number, lastKey: number, pending: boolean): number {
  if (!pending) {
    return HV_NONE;
  }
  if (row < 0 || totalRows <= 0 || firstRow < 0 || lastRow < firstRow) {
    return HV_NONE;
  }
  const key: number = highlightGuardKeyOf(row, firstRow, lastRow, totalRows);
  if (key === lastKey) {
    return HV_NONE;
  }
  if (highlightSafeOf(row, firstRow, lastRow, totalRows)) {
    return HV_NONE;
  }
  return HV_REVEAL;
}

/** 校正对齐码：只有 HV_REVEAL 才给 HV_ALIGN_AUTO（映射 ScrollAlign.AUTO）。 */
export function highlightScrollAlignOf(action: number): number {
  return action === HV_REVEAL ? HV_ALIGN_AUTO : HV_KEY_INVALID;
}

/** 根容器尺寸是否发生有效变化：宽或高任一有 ≥1vp 变化且新值合法才返回 true。
 *  首次拿到有效尺寸也算变化；脏值（<=0 / NaN）一律不挂起，避免布局抖动误触发。 */
export function highlightResizeOf(prevW: number, prevH: number,
  w: number, h: number): boolean {
  if (!(w > 0) || !(h > 0) || !(w === w) || !(h === h)) {
    return false;
  }
  if (!(prevW > 0) || !(prevH > 0)) {
    return true;
  }
  return Math.abs(w - prevW) >= 1 || Math.abs(h - prevH) >= 1;
}
