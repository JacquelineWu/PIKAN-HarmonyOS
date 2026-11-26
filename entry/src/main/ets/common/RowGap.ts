/**
 * common/RowGap.ts —— 第七十六轮：档案列表「名称栏 → 大小 / 内容数目栏」间距的真值源
 *
 *  用户要求：档案名栏与档案大小栏之间、文件夹名栏与内容数目栏之间，两处间距
 *  均为 5mm 且保持一致。
 *
 *  口径：项目 README「关于 1mm」与 R69 行高留白沿用 **1mm ↔ 1vp**（ArkUI 只有 vp，
 *  没有 mm 单位）。故 5mm = 5vp。ArchiveRow.build() 在 fmtBytes（档案大小）与
 *  countText（文件夹内容数目）两个分支共用一个 ROW_GAP_VP 常量，天然保证两处相等；
 *  名称列 layoutWeight(1) 弹性吸收，日期列既有 .margin({ left: 6 }) 逐字不动，
 *  列顺序 / 字段 / 数据展示 / 点击 / 双击 / hover / 条纹零改动。
 *
 *  严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零全局可变状态。
 */

/** 用户要求的间距（毫米）。 */
export const ROW_GAP_MM: number = 5;
/** 项目口径：1mm ↔ 1vp。 */
export const MM_TO_VP: number = 1;
/** 名称栏与大小 / 内容数目栏之间的唯一间距常量（vp）。两个分支共用，保证一致。 */
export const ROW_GAP_VP: number = ROW_GAP_MM * MM_TO_VP;

/** mm → vp；脏值（NaN / <=0 / 非有限）一律回退到项目口径的 5vp。 */
export function rowGapVpOf(mm: number, mmToVp: number): number {
  if (!(mm > 0) || !(mmToVp > 0) || mm !== mm || mmToVp !== mmToVp) {
    return ROW_GAP_VP;
  }
  return mm * mmToVp;
}

/** 两处间距是否一致：都必须等于 ROW_GAP_VP 且为正。 */
export function rowGapSameOf(fileGapVp: number, folderGapVp: number): boolean {
  return fileGapVp === folderGapVp && fileGapVp === ROW_GAP_VP && ROW_GAP_VP > 0;
}

/** 间距是否合法（正数、有限、不超过一个上限，防止撑破三栏）。 */
export function rowGapValidOf(vp: number, maxVp: number): boolean {
  if (!(vp > 0) || vp !== vp) {
    return false;
  }
  const cap: number = maxVp > 0 && maxVp === maxVp ? maxVp : ROW_GAP_VP;
  return vp <= cap;
}
