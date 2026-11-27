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

// ---------------------------------------------------------------------------
// 恢复后重建「往上层」的目录层级上下文（2026-11-11 第三次实机反馈）
// ---------------------------------------------------------------------------

/** 重开恢复后，是否要用「持久授权的 picker 原始目录 URI」重建 browseBase / browseDir。
 *
 *  为什么需要单独的开关：`setItems()` 无条件清空目录态（防目录自动重扫把恢复出的
 *  名单覆盖掉），于是恢复出来是「图片列表态」，browseUp() 拿到空 current 就直接给
 *  「没有上层目录」返回 —— 用户按了永远上不去。上一轮 p1 把原始目录 URI 存了下来
 *  并在启动时激活授权，但只拿它去 activatePermission，从没回填给层级真值。
 *  这就是 2026-11-11「重开直接出图已修好，往上层却还是不能用」的最后一环。
 *
 *  · **两种恢复模式都回填**：目录层级是纯字符串信息，与那批图片 uri 的授权是否有效
 *    无关。只读名单态的 IO 闸门只管「批量预载 / 补体积 / 解码」，不该把用户主动点
 *    「往上层」也一起锁死 —— 那正是这次反馈的死路。显式列出两种合法 mode，
 *    脏数据（非法 mode 值）一律不回填。
 *  · 必须有持久授权目录 URI：升级前保存的老快照没有这个 key，无从还原，维持旧提示。
 *  · 纯字符串运算：绝不 listFile / statSync / 弹选择器 / 启动目录轮询，
 *    不新增任何启动关键路径的 IO（历史 appfreeze 底线）。真正列目录只发生在
 *    用户点击「往上层」之后，且父目录列不出来时只会有几次失败的 listFile，量级极小。
 *  · 目录 URI 能否解析出层级，由 DirName.upContextBaseOf() 再校验一次。 */
export function restoreUpEnabled(mode: number, dirUri: string): boolean {
  if (dirUri.length === 0) {
    return false;
  }
  return mode === RESTORE_FULL || mode === RESTORE_READONLY;
}

/** 层级重建成功的状态栏提示（简短，状态栏是单行 Ellipsis 会被截尾）。 */
export function restoreUpHint(dirName: string, tag: string): string {
  return '已恢复上次目录「' + dirName + '」· 可继续往上层 · ' + tag;
}

// ---------------------------------------------------------------------------
// 第三十六轮（2026-11-19）：目录上下文与「有没有图片位置」彻底解耦（R36）
// ---------------------------------------------------------------------------
// 用户报障：退出前停留在任一目录（空目录 / 无图片目录 / 只有子文件夹的目录），
// 重开却回到默认目录。根因是整条持久化 + 恢复链都以「有图片位置」为前提：
//   · applyItems 在零图片时把 cur 置 -1，markPos() 直接 return，既不生成 LastPos
//     也不 scheduleFlush() —— 空目录那次 openFolder 设好的 browseBase 从不落盘；
//   · flushPos() / flushPosSync() 依赖 posPending / lastPos，退出走 FLUSH_SKIP，
//     连 POS_KEY_BROWSE（实际浏览层级）都不写；
//   · showLastOnStart() 用 resumeAction 判恢复，空目录没有 savedUri / okUri →
//     RESUME_SKIP，enterSettledOk(itemCount=0) 恒 false，只读 / 空快照 / 单张兜底
//     一律 giveUpNow 弹选择器 —— 把「正常的无图片目录」当成恢复失败。
// R36：目录位置是独立于图片的纯字符串信息，落盘与恢复都不该挂靠 LastPos。

/** 「仅目录上下文恢复」动作（用数值常量，ArkTS 最稳）。 */
export const DIR_RESUME_NONE: number = 0;     // 走原图片恢复链
export const DIR_RESUME_CONTEXT: number = 1;  // 走零 IO 目录上下文恢复
/** 目录态持久化标记值：'1' = 退出前停在「目录浏览态且本层零图片」。
 *  只用一个字符，绝不引入 XML 非法控制字符（R31 教训）。 */
export const DIRCTX_EMPTY: string = '1';

/** 计算目录态持久化标记：只有「在目录浏览态」且「本层零图片」才是空目录态。
 *  · 空目录 / 无图片目录 / 只有子文件夹的目录 → '1'（R36 要走目录上下文恢复）；
 *  · 有图片的目录 → ''（交回原图片恢复链，R30 的 restoreBrowseContext 会回填目录，
 *    R36 绝不破坏「退出重开直接出图」这一历史能力）；
 *  · 图片列表态 / 多选 / 图库（browseBase 为空）→ ''。
 *  落盘与恢复共用这一个判据，纯决策、零 IO、零抛出。 */
export function dirContextFlagOf(browseBase: string, itemCount: number): string {
  if (browseBase.length > 0 && itemCount === 0) {
    return DIRCTX_EMPTY;
  }
  return '';
}

/** 无图片位置时，是否仍要把「目录上下文」独立落盘。
 *  · hasPosition=true（有图片位置）：flushPos 主体已写 POS_KEY_BROWSE，无需独立；
 *  · hasPosition=false 且是空目录态：必须独立落盘，否则退出重开回默认目录。
 *  纯决策、零 IO。 */
export function dirContextSaveWanted(browseBase: string, itemCount: number,
  hasPosition: boolean): boolean {
  if (hasPosition) {
    return false;
  }
  return dirContextFlagOf(browseBase, itemCount) === DIRCTX_EMPTY;
}

/** 启动恢复是否走「仅目录上下文恢复」（零 IO、不弹选择器、不回默认目录）。
 *  · dirCtx==='1'（上次退出停在无图片目录）→ 目录上下文恢复**优先于**图片恢复，
 *    忽略残留的旧图片 uri / 快照：用户退出前看的本来就是目录，不是图；
 *  · autoEnabled / userActed / alreadyDone：与 resumeAction 同款让路护栏，
 *    用户已自己动手 / 本轮已恢复过，绝不抢视图。
 *  返回 DIR_RESUME_CONTEXT / DIR_RESUME_NONE，纯决策、零 IO、零抛出。 */
export function dirOnlyResumeWanted(dirCtx: string, autoEnabled: boolean,
  userActed: boolean, alreadyDone: boolean): number {
  if (!autoEnabled || userActed || alreadyDone) {
    return DIR_RESUME_NONE;
  }
  if (dirCtx !== DIRCTX_EMPTY) {
    return DIR_RESUME_NONE;
  }
  return DIR_RESUME_CONTEXT;
}

// ---------------------------------------------------------------------------
// 第七十九轮：只读名单态的「目录重列举兜底」（2026-11-27）
//
// 实机现象（用户截图）：退出后重开，左栏 42 张名单都在、当前行也高亮，但预览区
// 停在「图片读取授权在重启后已失效」卡片，点行只得到「暂不能预览」。
//
// 根因（按真实源码判读）：
//  · 启动探测只探 1 个候选 —— `probeTakeOf(fast=true)` 恒返回 1，而
//    `restoreProbeUris` 把 `okUri`（最后一次成功显示的那张）排在第一位。
//    只要「退出前正在看的那张」被移走 / 改名 / 换了 URI 形态，整批 42 张就被
//    一起判成「授权失效」。
//  · 判死之后只有 `healRestoreMode` 再探同一个 `okUri`（仍然 1 个），于是整个
//    会话永久停在只读名单态。
//  · 而 picker 的**目录持久授权其实可能仍在**：目录列得出来、子文件读得动，
//    只是快照里那批旧 URI 形态不再有效。
//
// 修法：只读态后用持久授权的目录做一次**轻量**确认（1 次 async listFile +
// 1 次 openSync），确认可读才交给既有 `openFolder` 真实重建 —— 那时才允许它逐项
// statSync；确认不通过就保持只读名单。真授权失效时现有提示仍然正确，且绝不把
// 同步 statSync 循环重新引回主线程（历史 appfreeze 防线不动）。
// ---------------------------------------------------------------------------

export const RELIST_SKIP: number = 0;
export const RELIST_TRY: number = 1;

/** 只读名单态是否值得做一次「目录重列举兜底」。
 *  · `readonlyMode`：只在只读态试；FULL 态本来就正常，不必多一次 IO。
 *  · `hasDirUri`：没有持久授权目录就无从重列（老数据 / 从未选过目录）。
 *  · `networkDir`：网络目录交给既有 `warmRestoreDirQuiet` 的重试 + 自愈；
 *    这里只兜本地目录（本地 listFile 失败是秒级，NAS 可能挂十几秒）。
 *  · `userActed` / `giveUp` / `count`：用户已接手、已放弃、名单为空 → 不试。 */
export function readonlyRelistAction(readonlyMode: boolean, hasDirUri: boolean,
  networkDir: boolean, userActed: boolean, giveUp: boolean, count: number): number {
  if (!readonlyMode || !hasDirUri || networkDir || userActed || giveUp || count <= 0) {
    return RELIST_SKIP;
  }
  return RELIST_TRY;
}

/** 轻量确认是否通过：目录**列得出来**且**至少一个图片子项真能 open**。
 *  只列出目录（本层没有图片）不算恢复 —— 否则会把「图片列表态」换成「目录表态」，
 *  用户看到的仍然不是退出前那张图。 */
export function relistProbeOkOf(listed: boolean, openOk: boolean): boolean {
  return listed && openOk;
}

/** 重列举成功后的状态栏提示（带诊断标记，便于实机辨认新包）。 */
export function relistOkHint(tag: string): string {
  return '已按目录授权重新读取，图片可以正常预览了 · ' + tag;
}
