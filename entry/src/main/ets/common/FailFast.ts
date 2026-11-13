/**
 * 第十轮：死路径「立即放弃」决策（ff1）——纯函数，零 SDK 依赖。
 *
 * 背景（2026-11-13 实机反馈）：第九轮的 3 秒看门狗本质是 setTimeout，而启动恢复链上
 * warmLast / probeRestoreUris 用的 openSync / statSync 是同步跨进程调用。NAS 死路径上
 * 一次调用能挂十几到二十秒，主线程被占住时定时器回调根本排不上队 —— 于是表现为
 * 「名义 3 秒、实际 20 秒才放弃」。
 *
 * 本模块把「放弃」从计时驱动改为**错误驱动**：任何明确的失败信号一到就收口，
 * 并把「这个目录上次就是死的」记成一个小 key，下次启动零 IO、零等待直接放弃。
 *
 * 边界（必须诚实）：
 *  · 系统对不可达网络路径的同步 IO 超时由平台决定，应用无法缩短；
 *    因此这里保证的是「不再额外等待」「不再逐个候选重试」「同一死路径复发 0 秒」，
 *    以及所有可先验识别的问题（授权失效 / 只读名单态 / 快照缺失 / 单张兜底）立即放弃；
 *  · 用户已抢先操作、首次启动无记忆、恢复已收口，一律不干预；
 *  · 判有限数统一用 `v - v === 0`，避开各版本兼容差异。
 */

/** 继续等待 / 不干预。 */
export const FF_WAIT: number = 0;
/** 停止恢复尝试，直接打开选择文件夹。 */
export const FF_GIVEUP: number = 1;

/** 死路径标记最大长度：preferences 小 key，绝不放大 value。 */
export const DEAD_TAG_MAX: number = 256;

/** 用「上次授权根 + 最后成功显示的那张」生成死路径标记。
 *  优先 dirUri（目录级更稳），没有再退到 okUri；两者都空 → ''（不记、不比对）。 */
export function deadTagOf(dirUri: string, okUri: string): string {
  const s: string = dirUri.length > 0 ? dirUri : okUri;
  if (s.length === 0) {
    return '';
  }
  return s.length <= DEAD_TAG_MAX ? s : s.substring(0, DEAD_TAG_MAX);
}

/** 上次记下的死路径是否与这次要恢复的目录 / 图吻合。
 *  吻合 = 同一个死路径复发 → 立即放弃；用户重选过目录 → 标记已清或不再吻合 → 正常恢复。 */
export function deadMemoryMatches(deadTag: string, dirUri: string, okUri: string): boolean {
  if (deadTag.length === 0) {
    return false;
  }
  return deadTag === deadTagOf(dirUri, okUri);
}

/** 明确的「问题」信号到来时是否立即放弃。
 *  problem：授权失效 / 快照读不出 / 探测打不开 / 只读名单态 / 单张兜底 / 死路径记忆命中；
 *  hasMemory：确实有上次会话记忆（首次启动没有记忆，不该被动弹选择器）；
 *  userActed / settled：用户已接手或恢复已收口 → 不干预、不弹第二次。 */
export function failFastAction(problem: boolean, hasMemory: boolean,
  userActed: boolean, settled: boolean): number {
  if (!problem || !hasMemory || userActed || settled) {
    return FF_WAIT;
  }
  return FF_GIVEUP;
}

/** 启动恢复期是否按住「预热 / 探测」这类同步文件 IO。
 *  有上次记忆、还没确认进入目录、用户没接手 → 这一阶段任何同步 IO 都可能挂在
 *  不可达的 NAS 上，把看门狗一起饿死。恢复成功（entered）或用户接手后自然放开。 */
export function restoreIoHeld(entered: boolean, userActed: boolean,
  hasMemory: boolean): boolean {
  return hasMemory && !entered && !userActed;
}

/** 探测候选的取用条数：启动恢复期 fail-fast 只探 1 个（第一个打不开就判死），
 *  用户主动路径仍按完整候选数逐个试。候选数非法一律返回 0。 */
export function probeTakeOf(fast: boolean, candCount: number): number {
  if (candCount - candCount !== 0 || candCount <= 0) {
    return 0;
  }
  const n: number = Math.floor(candCount);
  if (!fast) {
    return n;
  }
  return 1;
}

/** 诊断串用的耗时（ms）：起点无效 / 时间倒流一律 0，不让脏数据污染日志。 */
export function elapsedSince(startedAt: number, now: number): number {
  if (startedAt - startedAt !== 0 || now - now !== 0 ||
      startedAt <= 0 || now < startedAt) {
    return 0;
  }
  return Math.floor(now - startedAt);
}

/** 立即放弃后的状态栏文案：明确说明已停止恢复、接下来要重新选目录。 */
export function failFastHint(reason: string): string {
  return '上次目录无法打开（' + reason + '）· 已立即停止恢复 · 请重新选择文件夹';
}
