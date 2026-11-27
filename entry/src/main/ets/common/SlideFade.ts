/**
 * common/SlideFade.ts — 第九十六轮：幻灯片「交叉淡化」的唯一真值源（纯函数）
 *
 * 需求（用户原话）：
 *   · 单张播放：每次只展示一张；
 *   · 淡出 + 淡入过场；
 *   · 过场期间**前后两张同时存在并重叠显示**，不出现空白画面；
 *   · 淡出与淡入衔接自然。
 *
 * 本文件只回答两个问题，不碰 UI、不碰解码、不碰计时器：
 *   ① 这一步两张图各自的不透明度是多少（`crossFadeStepOf`）；
 *   ② 新图到什么条件才算「可以开始淡入」（`slideFadeReadyOf`）。
 *
 * 为什么用「分步」而不是 ArkUI 的 `animateTo`：
 *   本文件所在的工程在预览链上有一条硬结论（见 Index.finishFocus 注释）——
 *   `animateTo` **一旦启动就无法取消**。幻灯片虽然 3 秒才走一张，但「停止播放 / 手动翻页 /
 *   退出页面」都可能发生在淡化的 400ms 里，撤销不掉的动画会把新图的不透明度重新拉回 0，
 *   观感就是「闪一下再跳出来」。分步 + 代号（seq）可以随时作废，状态完全可控。
 */

/** 交叉淡化的分步数：越多越平滑，但每步一次状态写入。12 步 ≈ 每 35ms 一帧，肉眼连续。 */
export const SLIDE_FADE_STEPS: number = 12;

/** 一步结束时两张图的不透明度。 */
export interface CrossFade {
  /** 上一张（淡出那张）的不透明度：1 → 0 */
  out: number;
  /** 当前张（淡入那张）的不透明度：0 → 1 */
  in: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : (v > 1 ? 1 : v));

/**
 * 第 `step` 步的淡出 / 淡入不透明度（0 ≤ step ≤ steps）。
 *
 * 用 smoothstep（`t²(3−2t)`）而不是线性 `t`：
 *   · 线性淡化在起点 / 终点的不透明度变化率是突变的，人眼会看到「起步一顿、收尾一顿」；
 *   · smoothstep 两端导数为 0，淡出与淡入**同一条曲线互补**（`out = 1 − s`、`in = s`），
 *     任意时刻 `out + in === 1`，两图叠加的总覆盖恒为「不透明」——
 *     这正是「过场期间没有空白」的数学保证（不是靠调参数碰运气）。
 *
 * 非法入参一律夹到合法区间：`steps <= 0` 直接返回终态 `{out: 0, in: 1}`（不做过场，
 * 但画面一定要出来）；`step` 超出范围按端点处理，绝不返回 NaN / 越界值
 * （越界不透明度会让 ArkUI 把整层画成透明 → 那就是用户最怕的空白）。
 */
export function crossFadeStepOf(step: number, steps: number = SLIDE_FADE_STEPS): CrossFade {
  if (steps !== steps || steps <= 0) {
    return { out: 0, in: 1 };
  }
  if (step !== step) {
    return { out: 0, in: 1 };
  }
  const s: number = clamp01(step / steps);
  const eased: number = s * s * (3 - 2 * s);
  return { out: 1 - eased, in: eased };
}

/**
 * 是否已经可以开始淡入。
 *
 * @param nextReady    新图是否已经有可画的图源（`viewPixelMap !== undefined`）
 * @param nextIsSameAsOut 新图源是否就是上一张那个对象（同一张图 / 切图没生效）
 *
 * 两个条件缺一不可：新图没准备好就开始淡化 ⇒ 中间那帧只有淡出的旧图在变透明，
 * 底下什么都没有 ⇒ **露中灰底（空白）**；新图还是旧图那个对象 ⇒ 两张一样，
 * 淡了也看不出变化（重复条目的边界情况），不如直接停在这张上。
 */
export function slideFadeReadyOf(nextReady: boolean, nextIsSameAsOut: boolean): boolean {
  return nextReady === true && nextIsSameAsOut !== true;
}

/** 分步淡化的每步间隔（ms），由总时长与步数推出，避免两处魔数各自漂移。 */
export function slideFadeTickMsOf(totalMs: number, steps: number = SLIDE_FADE_STEPS): number {
  if (totalMs !== totalMs || totalMs <= 0 || steps !== steps || steps <= 0) {
    return 1;
  }
  const ms: number = Math.round(totalMs / steps);
  return ms < 1 ? 1 : ms;
}
