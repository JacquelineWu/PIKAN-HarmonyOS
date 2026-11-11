/** 启动自动恢复 / 退出落盘的**决策**纯函数。
 *
 *  单独抽成 .ts 模块：不依赖任何鸿蒙 SDK，可用 Node 24 的
 *  `node --experimental-strip-types` 直接回归（见 `tests/dirname.test.mjs`）。
 *
 *  2026-11-11 需求 1：「退出 APP 会记下上次的位置、相片，再次打开 APP 会显示之前的图片」。
 *  保存链路（markPos → flushPos → preferences）一直是好的，断的是**启动恢复**：
 *  `AUTO_RESUME_ON_START = false` 让重开只显示一行提示文字。历史原因是早期
 *  「启动读大快照 + 全量重扫图库」触发过 PreferencesGetValue 卡死 8 秒（appfreeze），
 *  于是把整个恢复动作关掉了。
 *
 *  本模块把「要不要恢复 / 恢复什么 / 什么时候恢复 / 退出要不要同步落盘」这些
 *  容易写错的判断抽成纯函数；Index.ets 只负责执行，且执行时**绝不**重扫图库、
 *  绝不弹权限框、绝不弹选择器 —— 恢复只走「小 key + 单张预热图 / 已分块的 uri 快照」，
 *  并推迟到首帧之后（RESUME_DELAY_MS），避开启动 watchdog 最敏感的窗口。
 */

/** 恢复动作（用数字常量而非 enum：ArkTS 对纯数值常量最稳，也便于 hilog 打印）。 */
export const RESUME_SKIP: number = 0;      // 不恢复（用户已操作 / 已恢复过 / 开关关闭 / 没有记忆）
export const RESUME_SINGLE: number = 1;    // 只恢复「上次那一张」（最轻，一定不卡启动）
export const RESUME_SNAPSHOT: number = 2;  // 从分块 uri 快照恢复整批列表（延后执行）

/** 退出落盘动作。 */
export const FLUSH_SKIP: number = 0;       // 没有任何位置可写
export const FLUSH_SYNC: number = 1;       // prefs 已就绪 → putSync + flushSync（进程被杀也来得及）
export const FLUSH_ASYNC: number = 2;      // prefs 还没建好 → 只能退回异步尽力而为

/**
 * 启动该走哪条恢复路径。
 *
 *  · `userActed` / `alreadyDone`：用户已经自己选了文件夹 / 图片，或本轮已恢复过 → SKIP。
 *    绝不能抢用户当前的视图，这是「状态一致」的底线。
 *  · `autoEnabled`：总开关（AUTO_SHOW_LAST_ON_START）。
 *  · 有快照且未在启动关键路径 → SNAPSHOT；否则只要有「上次那张」就 SINGLE。
 *  · SINGLE 是**保底**：哪怕快照读失败、URI 授权过期，也先显示那一张图，
 *    用户至少看到「之前的图片」；打不开时 showPreviewOf 自己会走 Image(uri) 兜底。
 */
export function resumeAction(userActed: boolean, alreadyDone: boolean, autoEnabled: boolean,
  snapCount: number, savedUri: string, okUri: string, startupSafe: boolean): number {
  if (!autoEnabled || userActed || alreadyDone) {
    return RESUME_SKIP;
  }
  const lastUri: string = resumeSingleUri(savedUri, okUri);
  if (lastUri.length === 0) {
    return RESUME_SKIP;                       // 只记了 idx 没有 uri：无从显示
  }
  // 启动关键路径（首帧 / 窗口初始化）里一律只做单张，读快照推迟到首帧之后。
  if (snapCount > 0 && startupSafe) {
    return RESUME_SNAPSHOT;
  }
  return RESUME_SINGLE;
}

/** 单张恢复用哪个 uri：优先「最后一次**成功显示**」的那张（POS_KEY_OK），
 *  它一定解过、预热也已按它排好；退化时才用「停在第几张」记的 uri。 */
export function resumeSingleUri(savedUri: string, okUri: string): string {
  if (okUri.length > 0) {
    return okUri;
  }
  return savedUri;
}

/** 恢复延迟是否安全：必须严格大于「首帧预热」的延迟，且不小于最小让路时间。
 *  这样读快照 / 建列表绝不会和首帧渲染、窗口初始化抢主线程。 */
export function resumeDelaySafe(delayMs: number, warmDelayMs: number, minSafeMs: number): boolean {
  if (delayMs < 0 || warmDelayMs < 0 || minSafeMs < 0) {
    return false;
  }
  return delayMs > warmDelayMs && delayMs >= minSafeMs;
}

/** 退出 / 切后台该怎样落盘。
 *
 *  `flushPos()` 是 async 的 `put` + `flush`，在 `aboutToDisappear` 里只是「尽力而为」——
 *  进程被杀时那几个 Promise 可能根本没跑完，于是「上次位置」丢失。
 *  prefs 实例已经在启动时惰性建好（readLastPos 会建），这时改用同步
 *  `putSync` + `flushSync`，写的是几个小 key + 1 块快照，毫秒级、必达。
 *  只有 prefs 真的还没建好（极端早退）才退回异步。 */
export function exitFlushAction(hasPosition: boolean, storeCached: boolean): number {
  if (!hasPosition) {
    return FLUSH_SKIP;
  }
  if (!storeCached) {
    return FLUSH_ASYNC;
  }
  return FLUSH_SYNC;
}

/** 快照恢复时最多取多少条 uri。
 *  历史教训：SNAP_MAX 从 3000 降到 600 才解决启动 PreferencesGetValue 卡死。
 *  恢复端再夹一道，防止旧残留 / 手工改过的 snapCount 把大列表拉进启动路径。 */
export function resumeSnapCap(rawCount: number, max: number): number {
  if (rawCount <= 0 || max <= 0) {
    return 0;
  }
  return Math.min(rawCount, max);
}

/** 「往上层」按钮状态：**恒为可点，永不 grey out / 永不禁用**。
 *
 *  2026-11-11 用户澄清：上一版把需求 2「回上层 grey out」理解反了 ——
 *  用户是**抱怨**按钮被灰掉、要求修正，不是要禁用。恢复出来是图片列表态
 *  （`browseBase = ''`）时按钮也照样亮着可点；点了由 browseUp() 给
 *  「当前是图片列表，请用选择文件夹进入目录浏览」的提示，而不是把按钮藏起来。
 *
 *  保留这个纯函数是为了让「按钮永不禁用」成为一条可回归的显式契约，
 *  而不是散落在 UI 代码里的隐含约定。 */
export function upButtonEnabled(): boolean {
  return true;
}
