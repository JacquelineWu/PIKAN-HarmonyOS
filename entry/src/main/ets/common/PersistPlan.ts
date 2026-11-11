/** 目录 URI 持久授权的**决策**纯函数。
 *
 *  单独抽成 .ts 模块：不依赖任何鸿蒙 SDK，可用 Node 24 的
 *  `node --experimental-strip-types` 直接回归（见 `tests/dirname.test.mjs`）。
 *
 *  2026-11-11 实机反馈：重开 APP 后名单在、图片白、按钮与列表全卡住。根因是
 *  `DocumentViewPicker` 返回的逐 URI 授权**默认不跨进程持久** —— 快照里那批
 *  子文件 uri 重启后一个都读不了。上一轮先加了「探测 + 只读名单态」把冻结挡住
 *  （见 ResumePlan.ts），这一轮补上根治：
 *
 *    选目录时  fileShare.persistPermission(目录 URI)  → 授权写进系统
 *    重开时    fileShare.activatePermission(目录 URI) → 照常恢复快照 → 直接出图
 *
 *  ⚠️ 安全底线（历史 appfreeze 教训，不要放宽）：
 *   · activate 是跨进程异步调用，**绝不**放在 aboutToAppear / 启动关键路径上同步等待；
 *   · 必须有超时兜底：activate 挂起时恢复链照样往下走，界面不会停在空态；
 *   · activate 失败、平台返回 PERSISTENCE_FORBIDDEN、或旧数据没有持久记录 →
 *     原「探测 + 只读名单态」兜底**完整保留**，绝不因为加了持久授权就拆掉防冻结闸门。
 *
 *  本模块只做「要不要激活 / 用哪些 uri / 超时是否安全 / 提示文案」的判断，
 *  真正调用 fileShare SDK 的代码全在 Index.ets。
 */

/** 启动恢复前的动作。用数字常量而非 enum：ArkTS 对纯数值常量最稳，也便于 hilog 打印。 */
export const PERSIST_SKIP: number = 0;      // 不激活（老数据 / 已操作 / 开关关闭）→ 直接恢复
export const PERSIST_ACTIVATE: number = 1;  // 先 activatePermission，再恢复

/**
 * 启动要不要先激活持久授权。
 *
 *  · `userActed` / `alreadyDone`：用户已自己选了目录，或本轮已恢复过 → SKIP。
 *    绝不抢视图，也不做无谓的跨进程调用（与 resumeAction 同一条底线）。
 *  · `autoEnabled`：总开关（AUTO_SHOW_LAST_ON_START）。关掉自动恢复就一并关掉激活。
 *  · `hasDirUri`：上次会话是否存过「picker 原始目录 URI」。
 *    老版本 / 首次安装没有这个 key → SKIP，走原来的探测 + 只读名单态兜底。
 *    用户重新选一次目录后才会建立持久授权（这一步无法省，picker 授权只能用户给）。
 */
export function persistAction(hasDirUri: boolean, autoEnabled: boolean,
  userActed: boolean, alreadyDone: boolean): number {
  if (!autoEnabled || userActed || alreadyDone || !hasDirUri) {
    return PERSIST_SKIP;
  }
  return PERSIST_ACTIVATE;
}

/**
 * 生成要交给 `fileShare.PolicyInfo` 的 uri 列表（目录优先、去重、非空、限量）。
 *
 *  ⚠️ 只放 **picker 返回的原始目录 URI**（或它的等价兜底），绝不把 `openFolder`
 *     拼出来的子文件 uri 放进去：那些不是用户授权的根节点，平台会返回
 *     `PERSISTENCE_FORBIDDEN` / `INVALID_PATH`，一次失败就让整个
 *     persistPermission Promise reject，等于把有效目录授权也一起拖垮。
 *
 *  目录授权本身对其下整棵子树生效，一个 uri 就够了；limit 是防御性上限，
 *  避免以后有人把整批快照 uri 塞进来（那会变成启动期的批量跨进程调用）。
 */
export function persistPolicyUris(dirUri: string, fallbackUri: string,
  limit: number): Array<string> {
  const out: Array<string> = [];
  if (limit <= 0) {
    return out;
  }
  // 拼成一条序列再统一去重：不写局部 lambda / 函数类型变量
  // （ArkTS 的 arkts-no-func-type 不允许）。
  const seq: Array<string> = [];
  seq.push(dirUri);
  seq.push(fallbackUri);
  for (let i: number = 0; i < seq.length && out.length < limit; i++) {
    const u: string = seq[i];
    if (u.length > 0 && out.indexOf(u) < 0) {
      out.push(u);
    }
  }
  return out;
}

/** activate 的超时是否安全：必须为正且不超过上限。
 *  超时兜底是「恢复链不被跨进程调用挂住」的唯一保险，这个值本身也要可回归。 */
export function persistTimeoutSafe(ms: number, maxMs: number): boolean {
  if (ms <= 0 || maxMs <= 0) {
    return false;
  }
  return ms <= maxMs;
}

/** 持久授权激活成功的状态栏提示（带实机诊断标记，不是版本号）。 */
export function persistOkHint(tag: string): string {
  return '已激活上次的目录读取授权 · 正在恢复上次的相片 · ' + tag;
}

/** 激活失败：明确说明会退回只读名单态，不假装成功。 */
export function persistFailHint(tag: string): string {
  return '上次的目录授权未能激活 · 将只显示名单，可点「选择文件夹」重新打开 · ' + tag;
}

/** 旧数据迁移提示：老版本没有建立过持久授权，重新选一次目录后以后重开即可直接出图。
 *  只读名单态时拼在 readonlyHint 后面，让用户知道「只需一次，不是每次」。 */
export function persistLegacyHint(tag: string): string {
  return ' · 这是升级后的首次恢复：重新选一次该目录后，以后重开即可直接出图 · ' + tag;
}
