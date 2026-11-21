/**
 * common/UpReturn.ts —— 第五十九轮：往上层后「返回前所在子目录」反色标记的真值源
 *
 *  零 SDK 依赖、零文件 IO、零 await / throw、零全局可变状态，可被
 *  tests/dirname.test.mjs 用 `node --experimental-strip-types` 直接加载回归。
 *
 *  为什么单独一层：反色是**纯视觉标记**，绝不能挤进 cur / select() /
 *  dataSource.reload() 的常规选中链，否则点选、翻页、重扫都会把它带歪。
 *  这里只回答四件事：
 *   ① 一次「往上层」是否产生标记（只有真正上移落地、且能取到子目录名）；
 *   ② 连续返回时新标记整体覆盖旧标记，绝不叠加 / 绝不残留失败值；
 *   ③ 换源 / 进子目录 / 恢复清空，自动重扫与保位刷新保留；
 *   ④ 父层清单里哪一行该反色（名字严格相等 + 恰好是目录行）。
 *
 *  UI 侧（pages/Index.ets、components/SidebarView.ets、ArchiveRow.ets）只做接线，
 *  真值判断一律回到本文件；依赖方向 pages / components → common，无环。
 */

/** 空标记：没有任何行反色。 */
export const UPRET_NONE: string = '';

/** 反色（反白）配色：深色列表里的亮底深字，与常规条纹 / 选中态一眼可分。
 *  亮底沿用选中文字色 #e8ecf4，深字沿用奇数条纹底色 #161a21 —— 不引入新色系。 */
export const UPRET_INVERT_BG: string = '#e8ecf4';
export const UPRET_INVERT_FG: string = '#161a21';

/** 行种类按调用方的 ROW_* 传入，避免 common 反向依赖 components。
 *  目录行（ROW_FOLDER=2）与灰行（ROW_OTHER=3）都算「可反色的目录项」：
 *  APP 内上层清单里带点的真实目录名（如 Vol.2）会被判成 ROW_OTHER，但它仍是
 *  返回前所在子目录，必须同样反色；图片 / 文本 / 上级行则无论如何都不命中。 */
export const UPRET_KIND_FOLDER: number = 2;
export const UPRET_KIND_OTHER: number = 3;

/**
 * 一次「往上层」是否应该产生反色标记。
 *  · canUp=false（卷根 / 图片列表态 / 层级校验未过）一律不标记；
 *  · landed=false（列举失败、没真正落到父层）一律不标记；
 *  · 空名 / '..' / '.' / baseName 的未命名兜底都不算「子目录名」。
 *  返回的就是返回前所在子目录的显示名，与 rows 里的 name 同源（baseName）。
 */
export function upReturnMarkOf(currentName: string, landed: boolean,
  canUp: boolean): string {
  if (!canUp || !landed || currentName.length === 0) {
    return UPRET_NONE;
  }
  if (currentName === '..' || currentName === '.' || currentName === '（未命名）') {
    return UPRET_NONE;
  }
  return currentName;
}

/**
 * 每次返回都**整体替换**标记：连续返回 L4→L3→L2 时，标记依次变成
 * L4 名、L3 名，绝不叠加、绝不保留上一次的名字。
 */
export function upReturnRefreshOf(prev: string, next: string): string {
  return next;
}

/** 换源 / 进子目录 / 恢复清空；自动重扫与保位刷新（keepView）保留原标记。 */
export function upReturnClearOf(mark: string, keepView: boolean): string {
  return keepView ? mark : UPRET_NONE;
}

/**
 * 某一行是否反色：标记非空 + 名字严格相等 + 该行是目录类行。
 *  · folderKind / otherKind 由调用方按 ROW_FOLDER / ROW_OTHER 传入，
 *    兼容「APP 内清单里带点真实目录名被判成灰行」的情形；
 *  · 图片 / 文本 / '..' 行一律不反色（其 kind 既不是 folder 也不是 other）；
 *  · 名字严格相等而非包含，避免「2026」把「2026 备份」一起染色。
 *  其余行一律 false，逐字走原有的 rowBgColor / labelColor / iconColor 默认分支。
 */
export function upReturnInvertOf(rowName: string, mark: string, rowKind: number,
  folderKind: number, otherKind: number): boolean {
  if (mark.length === 0 || rowName.length === 0) {
    return false;
  }
  if (rowKind !== folderKind && rowKind !== otherKind) {
    return false;
  }
  return rowName === mark;
}

/** 反色背景：非命中行逐字返回原色，保证其他列表项默认样式零改动。 */
export function upReturnBgOf(inverted: boolean, normalBg: string): string {
  return inverted ? UPRET_INVERT_BG : normalBg;
}

/** 反色前景（名称 / 图标）：非命中行逐字返回原色。 */
export function upReturnFgOf(inverted: boolean, normalFg: string): string {
  return inverted ? UPRET_INVERT_FG : normalFg;
}
