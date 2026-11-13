/**
 * 启动恢复「进入上次目录」的超时决策（et1）——纯函数，零 SDK 依赖。
 *
 * 背景（2026-11-12 实机反馈）：上次目录在 NAS / 网络卷上时，重开后的恢复链
 * （activatePermission → 读快照 → 探测 uri → 建列表）可能长时间挂住，或最终只落到
 * ro1 只读名单态「名单在、图打不开」。与其让用户盯着一个半死界面，不如给整次尝试
 * 一个总预算：预算内成功进入上次目录就取消看门狗；到期仍未进入则**停止尝试**，
 * 直接打开「选择文件夹」让用户重新授权。
 *
 * 设计约束：
 *  · 不引入任何同步等待原语 —— 启动关键路径严禁阻塞，本模块只做判定，
 *    计时与作废由 Index.ets 的 setTimeout + 标志位完成；
 *  · 「进入上次目录」= 探测通过（非只读名单态）且列表有图，单张兜底 / 只读名单态
 *    都算没进入，留给看门狗收口；
 *  · 用户已抢先操作（选了文件夹 / 正在选 / 目录载入中）一律不干预；
 *  · 预算有上下限校验，防止误配把正常恢复掐掉，或把卡死又拖回启动路径。
 *
 * 判有限数统一用 `v - v === 0`，避开各版本对 ES 有限数判定 API 的兼容差异。
 */

/** 继续等待 / 不干预。 */
export const ENTER_WAIT: number = 0;
/** 停止恢复尝试，直接打开选择文件夹。 */
export const ENTER_ABORT: number = 1;

/** 允许配置的最小 / 最大预算（ms）。低于下限会误伤正常恢复，高于上限等于没有超时。 */
export const ENTER_TIMEOUT_MIN_MS: number = 1000;
export const ENTER_TIMEOUT_MAX_MS: number = 10000;

/** 预算是否可用：必须是有限数、落在 [min, max] 内，且 min <= max。 */
export function enterTimeoutSafe(budgetMs: number, minMs: number, maxMs: number): boolean {
  if (budgetMs - budgetMs !== 0 || minMs - minMs !== 0 || maxMs - maxMs !== 0) {
    return false;
  }
  return minMs <= maxMs && budgetMs >= minMs && budgetMs <= maxMs;
}

/** 这次启动要不要挂看门狗：
 *  有「上次会话」记忆 + 自动恢复开着 + 恢复还没跑过 + 用户没抢先，四个条件同时满足。
 *  首次启动（无任何记忆）绝不挂 —— 新用户不该一开 APP 就被动弹选择文件夹。 */
export function enterWatchdogWanted(autoEnabled: boolean, hasMemory: boolean,
  alreadyDone: boolean, userActed: boolean): boolean {
  return autoEnabled && hasMemory && !alreadyDone && !userActed;
}

/** 是否算「已经进入上次的目录」：
 *  probeOk（非 ro1 只读名单态）+ 列表确实有图 + 本次恢复没被作废。
 *  单张兜底虽然能出一张图，但没有进入目录，调用方不应拿它取消看门狗。 */
export function enterSettledOk(probeOk: boolean, itemCount: number,
  cancelled: boolean): boolean {
  if (!probeOk || cancelled || itemCount - itemCount !== 0) {
    return false;
  }
  return itemCount > 0;
}

/** 看门狗到期时的决策。
 *  · 已成功进入 → 不再干预；
 *  · 用户已操作 / picker 正忙 / 目录载入中 → 绝不抢视图、绝不弹第二次；
 *  · elapsed 或 budget 非有限数、或还没到预算 → 继续等；
 *  · 其余（到期仍未进入）→ 停止尝试并打开选择文件夹。 */
export function enterTimeoutAction(elapsedMs: number, budgetMs: number,
  settled: boolean, entered: boolean, userActed: boolean,
  pickerBusy: boolean, folderBusy: boolean): number {
  if (settled && entered) {
    return ENTER_WAIT;
  }
  if (userActed || pickerBusy || folderBusy) {
    return ENTER_WAIT;
  }
  if (elapsedMs - elapsedMs !== 0 || budgetMs - budgetMs !== 0) {
    return ENTER_WAIT;
  }
  if (elapsedMs < budgetMs) {
    return ENTER_WAIT;
  }
  return ENTER_ABORT;
}

/** 超时后状态栏文案：告诉用户已经停止恢复、接下来要重新选目录。 */
export function enterTimeoutHint(budgetMs: number): string {
  const sec: number = budgetMs - budgetMs === 0 ? Math.floor(budgetMs / 1000) : 3;
  return '上次目录 ' + sec + ' 秒内未能打开 · 已停止恢复 · 请重新选择文件夹';
}
