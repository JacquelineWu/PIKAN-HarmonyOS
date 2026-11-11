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

// ---------------------------------------------------------------------------
// 恢复模式：名单恢复了，但那批 URI 的读取授权是否被证实（2026-11-11 实机反馈）
// ---------------------------------------------------------------------------

/** 完整恢复：探测证实 uri 现在仍能打开 → 预载 / 补体积 / 解码 / 对开照常跑。 */
export const RESTORE_FULL: number = 0;
/** 只读名单态：探测打不开 → **只列名单，切断一切批量同步磁盘 IO**。
 *
 *  为什么必须分这两态（本次实机反馈的三个症状其实是同一条因果链）：
 *  快照里的 uri 是上次会话 `openFolder` 拼出来的子项路径，
 *  `DocumentViewPicker` 的逐 URI 授权默认**不跨进程持久**（本轮之前工程没有
 *  `persistPermission`；现已用 PersistPlan + fileShare 补上，但旧快照、
 *  被平台拒绝持久化的 uri 仍会失效）。重开后这些 uri 一个都打不开 ——
 *  名单（纯字符串）照样能显示，图片却全白。
 *
 *  更糟的是 `setItems → applyItems` 会像正常换源那样启动全套后台任务：
 *  预载最多 201 张 `decodePx`、补体积最多 600 次 `statSync`、对开元数据
 *  `createImageSource`，加上 `viewFailed` 后交给系统 `Image(uri)` 反复重试。
 *  每一次对失效授权 uri 的调用都是**同步跨进程**的，累积几百次就把主线程
 *  占满 —— 表现正是「名单在、图片白、往上层按了没反应、档案列表点不动」，
 *  与历史 appfreeze（启动路径同步 IO 卡死）同源。
 *
 *  只读态只保留名单与交互，把这条 IO 链整条切断，并给一句可操作的指引
 *  （点「选择文件夹」重新授权）。按钮与列表**不禁用、不置灰**，点了有反馈。 */
export const RESTORE_READONLY: number = 1;

/** 探测结果 → 恢复模式。探测对象只有一张，纯决策、无 IO。 */
export function restoreModeOf(probeOk: boolean): number {
  return probeOk ? RESTORE_FULL : RESTORE_READONLY;
}

/** 该模式是否允许「批量同步磁盘 IO」（预载 / 补体积 / 对开探测 / 主视图解码）。
 *  只读态恒 false —— 这是防冻结的总闸门，所有会碰 uri 的批量入口都过它。 */
export function bulkIoAllowed(mode: number): boolean {
  return mode === RESTORE_FULL;
}

/** 生成「授权探测」的候选 uri（去重、最多 limit 张、恒不含空串）。
 *  顺序：最后一次成功显示的 okUri → 位置里记的 savedUri → 快照开头若干条。
 *  只探前几张就够了：授权是整批一起失效的，任一能打开即证明这批还能用；
 *  多给几个候选只是为了避免「恰好那一张被删了」误判整批失效。 */
export function restoreProbeUris(uris: Array<string>, okUri: string, savedUri: string,
  limit: number): Array<string> {
  const out: Array<string> = [];
  if (limit <= 0) {
    return out;
  }
  // 先把三个来源按优先级拼成一条序列，再一次去重取前 limit 个 ——
  // 不写局部 lambda / 函数类型变量（ArkTS 的 arkts-no-func-type 不允许）。
  const seq: Array<string> = [];
  seq.push(okUri);
  seq.push(savedUri);
  for (let i: number = 0; i < uris.length; i++) {
    seq.push(uris[i]);
  }
  for (let j: number = 0; j < seq.length && out.length < limit; j++) {
    const u: string = seq[j];
    if (u.length > 0 && out.indexOf(u) < 0) {
      out.push(u);
    }
  }
  return out;
}

/** 只读名单态的主提示。dir 是上次来源名，tag 是实机辨认用的诊断标记。 */
export function readonlyHint(count: number, dir: string, tag: string): string {
  const where: string = dir.length > 0 ? '「' + dir + '」' : '上次那个目录';
  return '已恢复上次名单（' + count + ' 张）· 图片读取授权在重启后已失效，' +
    '点「选择文件夹」重新打开 ' + where + ' 即可看图 · ' + tag;
}

/** 只读态点档案行 / 翻页的提示：不解码，但列表与按钮「点了必须看得见反应」。 */
export function readonlyTapHint(name: string): string {
  return '「' + name + '」暂不能预览（授权已失效）· 点「选择文件夹」重新打开该目录即可';
}

/** 只读态点「往上层」的提示：恢复出来是图片列表态，本来就没有目录层级。 */
export function readonlyUpHint(): string {
  return '当前是上次的图片名单，没有目录层级 · 点「选择文件夹」重新进入目录后即可逐级往上层';
}
