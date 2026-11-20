/**
 * 第五十六轮：返回 APP（切后台 / 锁屏 / 被别的应用盖住后再恢复显示）时，
 * 左侧目录清单的「单次、非侵入」刷新决策。
 *
 * 这里全部是零 IO 的纯函数，Node 侧可直接 import 做回归测试
 * （`node --experimental-strip-types tests/dirname.test.mjs`），不依赖任何鸿蒙 SDK。
 * 真正的重列举 / 保位刷新留在 Index.ets 复用既有 `openFolder(isRescan=true)` 链路，
 * 本文件只负责「该不该刷、刷完状态怎么对账」的判断。
 */

export const RESUME_REFRESH_SKIP: number = 0;
export const RESUME_REFRESH_GO: number = 1;

/**
 * 是否触发一次目录重扫。
 *
 *  · `suspended`：确实经历过「离开 APP」（onPageHide 置位）。首次进入恒 false，
 *    故启动恢复链绝不会被这次刷新打断 —— 这是「不得中断当前正在进行的操作」的一环。
 *  · `handled`：本次「离开→返回」周期是否已经刷过。窗口状态变化可能让
 *    onPageShow / 前台回调多次到达，用它保证「同一返回事件只触发一次 refresh」。
 *  · `busy`：存在在途操作（列举 / 幻灯片 / mtime 探测 / 启动恢复未完成）。
 *    有任何在途操作一律 SKIP，绝不抢占；目录同步交回既有 1.5s 轮询兜底。
 *  · `hasDir`：有当前目录上下文（browseBase 非空）才谈得上重扫。
 *  · `ioOk`：restoreMode 允许批量 IO（只读名单态不刷，避免跨进程 IO 打满主线程）。
 *
 * 五个条件全部满足才放行一次；任一不满足都是 SKIP（保守、零副作用）。
 */
export function resumeRefreshAction(suspended: boolean, handled: boolean,
  busy: boolean, hasDir: boolean, ioOk: boolean): number {
  if (!suspended || handled || busy || !hasDir || !ioOk) {
    return RESUME_REFRESH_SKIP;
  }
  return RESUME_REFRESH_GO;
}

/**
 * 刷新后选中档案的对账：仍存在（按 uri 精确命中）→ 返回其在新清单中的下标（保留选中）；
 * 已不存在（被删除 / 改名 / 层级变动移走）→ 返回 -1（清除失效选中引用）。
 *
 * 与 `applyItems(preserveView)` 的 keepView 按 uri 保位同源；这里作为纯函数真值源，
 * 供静态契约与返回刷新的诊断对账使用，绝不改动 applyItems 主体。
 */
export function resumeSelectedIndex(prevUri: string, newUris: Array<string>): number {
  if (prevUri.length === 0) {
    return -1;
  }
  for (let i = 0; i < newUris.length; i++) {
    if (newUris[i] === prevUri) {
      return i;
    }
  }
  return -1;
}

/**
 * 已展开目录（当前目录层级）在刷新后是否仍然有效。
 * 目录仍存在 → 保留层级状态；目录被删 / 改名（层级变动）导致列举失败 → 清除失效状态。
 */
export function resumeDirKept(prevDir: string, dirExists: boolean): boolean {
  return prevDir.length > 0 && dirExists;
}

/** 返回刷新完成后的状态栏文案（供诊断与 UI，纯字符串拼接、零 IO）。
 *  `ok`：真实重列举是否成功；`dirKept`：目录层级是否仍有效；`selKept`：选中档案是否仍存在。 */
export function resumeRefreshHint(ok: boolean, dirKept: boolean, selKept: boolean,
  hadSelection: boolean): string {
  if (!ok) {
    return '返回 APP · 目录清单同步未完成（可稍后重试或重新选择文件夹）';
  }
  let s: string = '返回 APP · 目录清单已与磁盘同步';
  if (!dirKept) {
    s += ' · 原目录已失效';
  }
  if (hadSelection && !selKept) {
    s += ' · 原选中档案已不在目录，失效选中已清除';
  }
  return s;
}
