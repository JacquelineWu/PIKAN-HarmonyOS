/**
 * common/FolderGlyph.ts —— 第六十一轮：左栏「目录名称右侧符号列」的纯函数真值源。
 *
 *  需求：移除每个目录名称右侧的正方形方格及其占位，使所有层级的目录项都不再显示；
 *  目录名称 / 层级结构 / 列表布局 / 原有交互不变，「往上层」的 ↑ 与其余控件逐字保留。
 *
 *  设计：符号列原本是所有行共用的一个 Text —— ↑ 给「往上层」行、方格给目录行、
 *  其余行为空，且 .width(18) 占位、.height(26) 撑住行高。整列删除会连带删掉 ↑
 *  并塌掉行高；只把方格换成空串则会留下 18vp 空白。故改成按行种类分别决定
 *  「符号内容」与「列宽」：目录类行内容为空、宽度归零，其余行逐字不变。
 *  名称文字的 layoutWeight(1) 会弹性吸收归零的 18vp，字节 66 / 日期 88
 *  两列靠右固定宽度，三栏起始位置与 26vp 行高逐字不变，不新增任何空白或偏移。
 *
 *  零 SDK 依赖 / 零文件 IO / 零异步 / 零全局可变状态 —— 可被
 *  tests/dirname.test.mjs 用 node --experimental-strip-types 直接加载回归。
 */

/** 名称右侧符号列的常规宽度（vp）：「往上层」↑ 与图片 / 文本行沿用原值。 */
export const FG_COL_W: number = 18;
/** 目录类行不再显示方格，也不再占位 —— 由名称列的 layoutWeight(1) 吸收。 */
export const FG_COL_NONE: number = 0;
/** 「往上层」行的导航箭头 —— 本轮明确要求保留的其他图标。 */
export const FG_UP_ARROW: string = '↑';
/** 其余行（含所有目录项）一律不显示名称右侧符号。 */
export const FG_BLANK: string = '';

/** 名称右侧符号：只有「往上层」行保留 ↑；目录 / 图片 / 文本 / 其他一律为空。
 *  第六十一轮起源码不再产生正方形方格 —— 任何层级、任何行种类都不会再显示。 */
export function folderGlyphOf(kind: number, upKind: number): string {
  return kind === upKind ? FG_UP_ARROW : FG_BLANK;
}

/** 名称右侧符号列宽度：目录类行归零（方格及其占位一并移除），其余行沿用原宽。
 *  folderKind 是常规子目录行，otherKind 涵盖上层清单里被判为灰行的带点真实目录名，
 *  两者一并归零，才能覆盖「所有层级的目录项」。 */
export function folderGlyphWidthOf(kind: number, folderKind: number,
  otherKind: number, normalWidth: number): number {
  if (kind === folderKind || kind === otherKind) {
    return FG_COL_NONE;
  }
  return normalWidth > 0 ? normalWidth : FG_COL_W;
}

/** 该行是否属于「符号内容为空 + 列宽归零」的目录类行（供静态契约与诊断用）。 */
export function folderGlyphHiddenOf(kind: number, folderKind: number,
  otherKind: number): boolean {
  return folderGlyphWidthOf(kind, folderKind, otherKind, FG_COL_W) === FG_COL_NONE;
}
