/**
 * 会话状态持久化纯函数（2026-11-12 第六轮）。
 *
 * 用户要求：「退出 APP 后重新打开，左侧档案列表继续显示每个档案的日期」、
 * 「启动时恢复退出前的窗口大小与位置」，且「重启前后显示内容与界面状态一致」。
 *
 * 这里全部是无 IO / 无鸿蒙 SDK 依赖的纯函数，Node 24 可直接 import 回归
 * （`node --experimental-strip-types tests/dirname.test.mjs`）。
 * 真正的 SDK 调用（preferences / getWindowProperties / resize / moveWindowTo）
 * 一律留在 Index.ets，本文件只负责「存什么、读成什么、能不能用」的判断。
 *
 * 设计要点：
 *  · 档案元数据（体积 size + 修改时间 mtime）按「与 uri 快照块一一对应的行」存，
 *    不改既有 `snap_N` 格式 —— 老版本存档读不出 meta 时日期/体积回退为未知，
 *    绝不会破坏原来「只读名单态」的恢复链；
 *  · 窗口 rect 用 4 个 px 整数打包成 1 个小 key，启动恢复前先做可用范围校验，
 *    防止把一次异常的全屏/离屏尺寸写死成「用户调好的窗口」；
 *  · 全屏 / 非自由窗口态不更新 rect 记忆（那是临时形态，不是用户调好的窗口）；
 *  · 第七轮新增：窗口形态（最大化 / 自由窗口）单独一个小 key，与 rect 分开存，
 *    最大化过再重启也不会回退成普通尺寸，同时保留「上一次自由窗口」的 rect 供取消最大化用。
 */

/** 有限数判断：刻意不依赖 Number 命名空间的静态成员
 *  （ArkTS 严格模式下支持程度不一致），这里用最朴素的算术判断。
 *  NaN / ±Infinity 都会让 `v - v` 变成 NaN，因此只有有限数才等于 0。 */
function finiteOf(v: number): boolean {
  return v - v === 0;
}

/** 一条档案的左栏显示元数据。 */
export interface ArchiveMeta {
  size: number;   // 字节；-1 = 未知（左栏显示 '--'）
  mtime: number;  // 修改时间（ms）；0 = 未知（左栏显示 '--'）
}

/** 窗口大小与位置（px，与 SDK `WindowProperties.windowRect` 同口径）。 */
export interface WindowRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 单条元数据 → 一行文本 `size,mtime`。
 *  非有限数一律写成「未知」，绝不把 NaN / Infinity 落进 preferences。 */
export function metaLineOf(size: number, mtime: number): string {
  const s: number = finiteOf(size) && size >= 0 ? Math.trunc(size) : -1;
  const t: number = finiteOf(mtime) && mtime > 0 ? Math.trunc(mtime) : 0;
  return s + ',' + t;
}

/** 一行文本 → 元数据。空行 / 缺列 / 非法数字都不能抛异常，一律回退未知。 */
export function parseMetaLine(line: string): ArchiveMeta {
  const s: string = line === undefined || line === null ? '' : String(line);
  const p: Array<string> = s.split(',');
  const size: number = Number.parseInt(p.length > 0 ? p[0] : '', 10);
  const mtime: number = Number.parseInt(p.length > 1 ? p[1] : '', 10);
  return {
    size: finiteOf(size) && size >= 0 ? size : -1,
    mtime: finiteOf(mtime) && mtime > 0 ? mtime : 0
  };
}

/** 一批元数据 → 换行分隔的字符串（与 `snap_N` 的 uri 行一一对应）。 */
export function encodeMeta(items: Array<ArchiveMeta>): string {
  const lines: Array<string> = [];
  for (let i = 0; i < items.length; i++) {
    lines.push(metaLineOf(items[i].size, items[i].mtime));
  }
  return lines.join('\n');
}

/** 换行分隔的字符串 → 元数据数组。空串 / 旧存档没有这个 key 时返回空数组。 */
export function decodeMeta(raw: string): Array<ArchiveMeta> {
  const s: string = raw === undefined || raw === null ? '' : String(raw);
  if (s.length === 0) {
    return [];
  }
  const lines: Array<string> = s.split('\n');
  const out: Array<ArchiveMeta> = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 0) {
      out.push(parseMetaLine(lines[i]));
    }
  }
  return out;
}

/** 按 uri 找元数据：单张兜底恢复也能拿到日期（快照块与 meta 块顺序同源）。
 *  找不到就回退「未知」，恢复链绝不因此失败。 */
export function metaForUri(uris: Array<string>, metas: Array<ArchiveMeta>, uri: string): ArchiveMeta {
  for (let i = 0; i < uris.length && i < metas.length; i++) {
    if (uris[i] === uri) {
      return metas[i];
    }
  }
  return { size: -1, mtime: 0 };
}

// --------------------------------------------------------------------
// 第七十七轮：重启后「size / 日期资料丢失」的根治件
//
// 真实根因（按源码逐字判读）：
//  · 只读名单态下 fillSizes() 被 IO 闸门挡住，items[i].size 一直是 -1 / mtime 是 0；
//  · flushSnap() 原样把 `-1,0` 写回 snapMeta_N，**覆盖掉上次会话的有效值**；
//  · 下次重启 readSnapMeta 读回的全是未知值 → 左栏 size / 日期永远显示 '--'，
//    而且 snapDirty 自我强化，之后每一轮重启都读不回来。
//  · 另外 readSnapMeta 遇到缺块 / 旧存档没有 meta key 时直接跳过该块，
//    后续块前移 ⇒ uri 与 meta 错位，尾部条目张冠李戴或全丢。
// --------------------------------------------------------------------

/** 写快照前合并新旧元数据：新值有效就用新值；新值「未知」则保留上次的有效值。
 *  按 uri 配对（见 Index.flushSnap），换源 / 重排也不会张冠李戴。零 IO / 零 SDK。 */
export function metaMergeOf(oldSize: number, oldMtime: number,
  newSize: number, newMtime: number): ArchiveMeta {
  const size: number = finiteOf(newSize) && newSize > 0 ? Math.trunc(newSize)
    : (finiteOf(oldSize) && oldSize > 0 ? Math.trunc(oldSize) : -1);
  const mtime: number = finiteOf(newMtime) && newMtime > 0 ? Math.trunc(newMtime)
    : (finiteOf(oldMtime) && oldMtime > 0 ? Math.trunc(oldMtime) : 0);
  return { size: size, mtime: mtime };
}

/** 把稀疏 / 缺块的 meta 数组按 uri 条数补齐到等长，杜绝后续块前移错位。
 *  多出来的部分截断；不足部分补「未知」。零 IO / 零 SDK。 */
export function metasPaddedOf(count: number, metas: Array<ArchiveMeta>): Array<ArchiveMeta> {
  const n: number = finiteOf(count) && count > 0 ? Math.trunc(count) : 0;
  const out: Array<ArchiveMeta> = [];
  for (let i = 0; i < n; i++) {
    const m: ArchiveMeta | undefined = i < metas.length ? metas[i] : undefined;
    if (m !== undefined && finiteOf(m.size) && finiteOf(m.mtime)) {
      out.push({ size: m.size, mtime: m.mtime });
    } else {
      out.push({ size: -1, mtime: 0 });
    }
  }
  return out;
}

/** 单块 meta 的行数必须与该块 uri 行数严格相等；缺块按整块补未知，绝不前移。 */
export function metaChunkPaddedOf(want: number, part: Array<ArchiveMeta>): Array<ArchiveMeta> {
  const n: number = finiteOf(want) && want > 0 ? Math.trunc(want) : 0;
  const out: Array<ArchiveMeta> = [];
  for (let i = 0; i < n; i++) {
    const m: ArchiveMeta | undefined = i < part.length ? part[i] : undefined;
    if (m !== undefined && finiteOf(m.size) && finiteOf(m.mtime)) {
      out.push({ size: m.size, mtime: m.mtime });
    } else {
      out.push({ size: -1, mtime: 0 });
    }
  }
  return out;
}

/** rect → 一个小 key 的值 `left,top,width,height`。 */
export function packWindowRect(r: WindowRect): string {
  return Math.trunc(r.left) + ',' + Math.trunc(r.top) + ',' +
    Math.trunc(r.width) + ',' + Math.trunc(r.height);
}

/** 文本 → rect。格式不对 / 非有限数 / 负数宽高都返回 undefined，让调用方跳过恢复。 */
export function parseWindowRect(raw: string): WindowRect | undefined {
  const s: string = raw === undefined || raw === null ? '' : String(raw).trim();
  if (s.length === 0) {
    return undefined;
  }
  const p: Array<string> = s.split(',');
  if (p.length !== 4) {
    return undefined;
  }
  const l: number = Number(p[0]);
  const t: number = Number(p[1]);
  const w: number = Number(p[2]);
  const h: number = Number(p[3]);
  if (!finiteOf(l) || !finiteOf(t) || !finiteOf(w) || !finiteOf(h)) {
    return undefined;
  }
  return { left: Math.trunc(l), top: Math.trunc(t), width: Math.trunc(w), height: Math.trunc(h) };
}

/** 恢复前校验 rect：太小的窗口会把布局挤坏，异常大的多半是某次全屏/多屏状态，
 *  坐标离谱（窗口被挪到屏幕外）也不该照搬。 */
export function windowRectUsable(r: WindowRect | undefined,
  minW: number, minH: number, maxW: number, maxH: number): boolean {
  if (r === undefined) {
    return false;
  }
  if (!finiteOf(r.left) || !finiteOf(r.top) ||
    !finiteOf(r.width) || !finiteOf(r.height)) {
    return false;
  }
  if (r.width < minW || r.height < minH || r.width > maxW || r.height > maxH) {
    return false;
  }
  if (Math.abs(r.left) > 100000 || Math.abs(r.top) > 100000) {
    return false;
  }
  return true;
}

/** 退出时是否更新窗口 rect 记忆。
 *  只有「非全屏 + 自由窗口（FLOATING）」才算用户调好的常规窗口；
 *  全屏 / 最大化是临时形态，覆盖掉记忆会导致下次启动恢复成一个铺满屏幕的窗口。 */
export function shouldSaveWindowRect(fullscreen: boolean, floating: boolean): boolean {
  return !fullscreen && floating;
}

/** preferences 读回的收起态（number）→ boolean。缺失 / 异常一律 false（默认展开，
 *  保证左栏的字节 / 日期两列在重启后照常显示，不会被意外隐藏）。 */
export function collapsedOf(raw: number): boolean {
  return finiteOf(raw) && raw === 1;
}

/** 窗口形态记忆（2026-11-12 第七轮：最大化状态重启后不回退到普通尺寸）。
 *
 *  返回写进 preferences 的小整数：1 = 最大化（含系统 FULL_SCREEN 形态）、
 *  0 = 自由窗口、-1 = 当前形态未知（UNDEFINED / MINIMIZE / SPLIT_SCREEN）→ **不覆写**记忆。
 *
 *  · appFullscreen 是 APP 自己用 ENTER_IMMERSIVE 进入的「真全屏」临时形态，
 *    绝不能写成最大化，否则下次启动会把全屏当常规窗口恢复；
 *  · 最小化 / 未定义态也不覆写：那多半是切后台 / 启动瞬间的瞬时状态，
 *    用户上一次「调好的窗口形态」应继续沿用（否则最小化一次就丢掉最大化记忆）。 */
export function windowModeFlagOf(appFullscreen: boolean, maximized: boolean,
  floating: boolean, known: boolean): number {
  if (appFullscreen) {
    return 0;
  }
  if (!known || (!maximized && !floating)) {
    return -1;
  }
  return maximized ? 1 : 0;
}

/** 启动是否要把窗口恢复成最大化：记忆里是 1、当前是自由窗口、且不在 APP 真全屏。
 *  启动若已是最大化 / 全屏，applySavedWindowRect 会直接保持现状，不再调任何窗口 API。 */
export function shouldRestoreMaximized(flag: number, floating: boolean, appFullscreen: boolean): boolean {
  return finiteOf(flag) && flag === 1 && floating && !appFullscreen;
}

/** 是否要给「窗口状态恢复」排程：有 rect 记忆 **或** 有最大化记忆都要跑一次。
 *  仅最大化过、从未存下自由窗口 rect 的用户也必须恢复最大化，不能因 rect 为空就短路。 */
export function shouldScheduleWindowRestore(rectText: string, flag: number): boolean {
  const s: string = rectText === undefined || rectText === null ? '' : String(rectText);
  return s.length > 0 || (finiteOf(flag) && flag === 1);
}
