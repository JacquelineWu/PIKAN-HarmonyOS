/**
 * common/SidebarSplit.ts —— 第一百零八轮：左栏「拖拽调宽」的唯一真值源
 *
 *  用户要求：
 *    · 在左栏与预览区之间的分割边界上可拖拽调宽，拖动时**实时**改变左栏宽度；
 *    · 有合理的**最小 / 最大**宽度限制（不能把预览区压没、也不能窄到看不清档案名）；
 *    · 调过的宽度**持久化**，退出重进自动恢复上次设定；
 *    · 分割线位置与拖拽交互状态正确对应。
 *
 *  为什么单独抽成纯函数模块：
 *    · 宽度钳制（min / max / 脏值 / 极窄窗口）全是纯算术，放在 UI 里只能用眼睛验证；
 *    · 「恢复」「拖动」「窗口 resize 后再夹」「写盘」四个入口必须用**同一套**钳制，
 *      任何一处自己写 if，都会出现「拖的时候能到 700、重启后变成 720」这类漂移；
 *    · 本文件零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零全局可变状态，Node 直接回归。
 *
 *  与 AdaptiveColumn 的分工：
 *    · `acLayoutOf` 负责「内容驱动的默认宽度」（名称越长越宽、顶到预览区最小宽为止）；
 *    · 本文件负责「用户在默认宽度之上手工设定的宽度」——只回答三件事：
 *      用户意图 w 合不合法（clamp）、拖动后应该是多少（drag）、最终该给 UI 多少（effective）。
 *    用户没设过（<=0）时一律回到 AdaptiveColumn 的默认宽度，零回归。
 */

import { AC_SPLIT_W, acSidebarCapOf } from './AdaptiveColumn.ts';

/** 左栏可拖到的最小宽（vp）：再窄档案名 / 三个按钮就挤不下了。
 *  与收起态宽度无关 —— 收起态仍由 acLayoutOf 的内容宽度决定。 */
export const SPLIT_MIN_W: number = 140;
/** 左栏可拖到的最大宽（vp）：超宽屏（3440vp）下没有这条线，用户能把预览区拖没。 */
export const SPLIT_MAX_W: number = 720;
/** 拖拽命中区在分隔条左右各外扩多少（vp）：14vp 的分隔条直接拖太考验手感。 */
export const SPLIT_HIT_EXTRA_VP: number = 6;
/** 窗口窄到「预览区最小宽都保不住」时的兜底比例：允许左栏占一半，拖动仍有意义。 */
export const SPLIT_NARROW_RATIO: number = 0.5;
/** 分隔条本身的宽度（vp）—— 与 AdaptiveColumn.AC_SPLIT_W 同值，这里只做转发，
 *  避免 UI 侧再写一个 14。 */
export const SPLIT_DIVIDER_W: number = AC_SPLIT_W;

function splitFiniteOf(v: number): boolean {
  return v - v === 0;
}

function splitPosOf(v: number): number {
  return splitFiniteOf(v) && v > 0 ? v : 0;
}

/** 当前窗口下左栏允许的最大宽（vp）。
 *  · 正常窗口：根宽 − 分隔条 − 预览区最小宽（沿用 acSidebarCapOf 的口径），
 *    再夹到绝对上限 SPLIT_MAX_W；
 *  · 极窄窗口（连预览区最小宽都保不住）：退成根宽的一半，保证「拖动」仍有区间；
 *  · 根宽未知（0 / NaN / 负数）：只给绝对上限，等布局落定后再夹。
 *  返回值恒 >= SPLIT_MIN_W（最小 / 最大永不自相矛盾）。 */
export function splitMaxWOf(rootW: number): number {
  const rw: number = splitPosOf(rootW);
  if (rw <= 0) {
    return SPLIT_MAX_W;
  }
  const cap: number = acSidebarCapOf(rw);
  const limit: number = cap > 0 ? cap : Math.floor(rw * SPLIT_NARROW_RATIO);
  const byAbs: number = limit > SPLIT_MAX_W ? SPLIT_MAX_W : limit;
  if (byAbs > SPLIT_MIN_W) {
    return Math.floor(byAbs);
  }
  // 极窄：上限取「根宽一半」与 MIN 的较大者（拖动区间可能为 0，此时 UI 表现为拖不动）
  const half: number = Math.floor(rw * SPLIT_NARROW_RATIO);
  return half > SPLIT_MIN_W ? half : SPLIT_MIN_W;
}

/** 把任意宽度夹进 [MIN, MAX(rootW)]。脏值按 MIN 处理，结果取整（vp 不用小数）。 */
export function splitClampWOf(w: number, rootW: number): number {
  const maxW: number = splitMaxWOf(rootW);
  const v: number = splitFiniteOf(w) ? w : SPLIT_MIN_W;
  const c: number = v < SPLIT_MIN_W ? SPLIT_MIN_W : (v > maxW ? maxW : v);
  return Math.round(c);
}

/** 拖动过程中的宽度：起始宽 + 手势累计位移，再夹进合法区间。
 *  · `offsetX` 是 PanGesture 的**累计**位移（相对按下那一刻），不是每帧增量；
 *  · 起始宽只抬下限、**不压上限**：当前宽可能来自自适应（长文件名撑到 900），
 *    若按下就先夹到 720，画面会在指头没动之前跳窄一截；
 *  · 所以上限取 `max(当前上限, 起始宽)` —— 起始更宽时只能往窄拖，拖不回去也不跳。
 *  纯数值，脏值一律当 0 位移。 */
export function splitDragWOf(startW: number, offsetX: number, rootW: number): number {
  const raw: number = splitPosOf(startW) > 0 ? startW : SPLIT_MIN_W;
  const start: number = raw < SPLIT_MIN_W ? SPLIT_MIN_W : raw;
  const dx: number = splitFiniteOf(offsetX) ? offsetX : 0;
  const maxW: number = splitMaxWOf(rootW);
  const hi: number = maxW > start ? maxW : start;
  const target: number = start + dx;
  if (target < SPLIT_MIN_W) {
    return SPLIT_MIN_W;
  }
  if (target > hi) {
    return Math.round(hi);
  }
  return Math.round(target);
}

/** 最终交给 SidebarView 的展开宽：
 *  · 用户设过（>0）→ 夹进合法区间后使用（窗口变小就临时压窄，但仍记住原值）；
 *  · 没设过（0）→ 用 acLayoutOf 的内容宽，只做「不低于 MIN」的兜底。
 *  永不返回 0 / NaN（那会把左栏画没）。 */
export function splitSidebarWOf(userW: number, autoW: number, rootW: number): number {
  const auto: number = splitPosOf(autoW);
  if (splitPosOf(userW) > 0) {
    return splitClampWOf(userW, rootW);
  }
  const base: number = auto > 0 ? auto : SPLIT_MIN_W;
  return base > SPLIT_MIN_W ? Math.round(base) : SPLIT_MIN_W;
}

/** 从 preferences 读回的原始值 → 内存里的「用户意图」。
 *  0 = 没设过 / 脏数据 / 小于最小宽（视为无效，回到自适应）。 */
export function splitRestoreWOf(raw: number, rootW: number): number {
  if (!splitFiniteOf(raw) || raw < SPLIT_MIN_W) {
    return 0;
  }
  return splitClampWOf(raw, rootW);
}

/** 写盘值：只有「确实由用户设定过」才写正数；否则写 0 表示「回到自适应」。
 *  写 0 而不是删 key —— preferences 删 key 要额外一次调用，写 0 语义等价且必达。 */
export function splitPersistOf(userW: number): number {
  return splitFiniteOf(userW) && userW >= SPLIT_MIN_W ? Math.round(userW) : 0;
}

/** 状态栏反馈：拖动中 / 松手已保存 / 已恢复自适应。 */
export function splitStatusOf(w: number, dragging: boolean): string {
  const n: string = String(Math.round(splitPosOf(w)));
  if (dragging) {
    return '拖动调整左栏宽度：' + n + '（范围 ' + SPLIT_MIN_W + '–' + SPLIT_MAX_W + '，松开即保存）';
  }
  return '左栏宽度已保存：' + n + '（双击分隔条恢复自适应）';
}

/** 复位后的「用户意图」：0 = 交给 acLayoutOf 的内容宽。 */
export function splitResetOf(): number {
  return 0;
}

/** 分割线是否该高亮：拖动中恒高亮；悬停时也给一层浅高亮做可拖拽提示。 */
export function splitActiveOf(dragging: boolean, hover: boolean): boolean {
  return dragging === true || hover === true;
}

/** 第一百一十轮：当前左栏宽放不下「名称 + 大小 + 日期」全部完整显示时，
 *  是否该把大小 / 日期两列**自动隐藏**，把整个宽度让给档案名 / 目录名。
 *
 *  `needW` 是内容口径的未夹取总宽（`acNeedWOf`）：只要当前宽比它小，
 *  名称列就一定会被两列挤到截断 —— 与其让三列一起糊，不如直接收起两列。
 *  纯比较，脏值一律 false（宁可三列都在，也不要凭脏数据把信息藏掉）。 */
export function splitHideMetaOf(w: number, needW: number): boolean {
  if (!splitFiniteOf(w) || !splitFiniteOf(needW) || w <= 0 || needW <= 0) {
    return false;
  }
  return w < needW;
}
