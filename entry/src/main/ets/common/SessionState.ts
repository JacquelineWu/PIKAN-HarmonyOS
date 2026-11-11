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
 *  · 全屏 / 非自由窗口态不更新 rect 记忆（那是临时形态，不是用户调好的窗口）。
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
