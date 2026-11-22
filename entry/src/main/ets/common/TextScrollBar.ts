/*
 * common/TextScrollBar.ts — 第六十三轮：文本预览纵向滚动条「显示判定」的唯一真值源。
 *
 * 背景（R37 → R52 → R53 → R63）：
 *   · R37 初版：内层 List 用原生 scrollBar(BarState.Auto)，外层横向 Scroll 也 Auto。
 *   · R52：原生条画在**全宽 List 的右缘**（x = textContentW），长行把横向 Scroll 撑宽后
 *     它永远在可视区外；于是关掉原生条（Off），改在 Stack 视口右缘自绘轨道 + 滑块。
 *   · R53：自绘条真机不显示 —— if 条件里藏方法调用，V1 依赖收集认不出来；改成
 *     「textVpH > 0 && textLines.length > 视口行数」全直读。但 textLines 是**刻意不加
 *     @State 的普通字段**（十几万行进状态系统会逐层建代理），V1 只追踪 textVpH；而
 *     textVpH 又只靠 Scroll.onAreaChange 尺寸事件回填 —— 文本态从图片态切过来时预览区
 *     尺寸不变、onAreaChange 可能不回调，textVpH 保持 0，if 恒 false，条永久不显示。
 *
 * 本模块把「该不该显示」从「尺寸事件 + 非状态数组」里彻底抽出来：
 *   1. 解码落地时用**内容行数**主动算一次，结果写进 @State（内容驱动，不依赖任何事件）；
 *   2. 视口高优先用 onAreaChange 实测值，未回填时用画布高减固定栏做保守兜底，
 *      保证「尺寸事件没来」也不会让条消失；实测值随后到达会自愈纠正；
 *   3. UI 的 if 只直读那一个 @State boolean，符合 R53 总结的 V1 教训。
 *
 * 几何（滑块高 / 滑块位置 / 拖动换算）、PanGesture、onScrollIndex、onMouse、滚轮、
 * 选段、复制、横向 Scroll 全部保留在 Index.ets 原实现，本模块不接线、不改动。
 *
 * 零 SDK 依赖、零文件 IO、零 await / throw、零全局可变状态，
 * 可被 tests/dirname.test.mjs 用 node --experimental-strip-types 直接加载回归。
 */

/** 兜底估计里「预览画布除文本行表外的固定栏高度」：抬头 32vp + 16vp 余量。
 *  取偏小值是为了让估计尽量贴近真实视口，减少「内容没超一屏却误显示」的概率；
 *  且 onAreaChange 一旦回填实测值就会覆盖它，最终自动纠正。 */
export const TSB_CHROME_H_VP: number = 48;

/** 视口行数下限：视口高 / 行高不足 1 行时至少算 1 行，避免除零 / 逻辑反了。 */
export const TSB_MIN_VISIBLE_ROWS: number = 1;

/**
 * 视口高（vp）：onAreaChange 实测面积高优先；未回填（<=0 / NaN / 脏值）时用
 * 「画布高 - 固定栏高」保守兜底；连画布高都无效时返回 0（可见判定自然返回 false）。
 * 恒返回有限非负数，绝不把 NaN / Infinity / 负数传给几何计算。
 */
export function textViewportHOf(areaH: number, canvasH: number,
  chromeH: number): number {
  const a: number = areaH;
  if (a > 0 && a < 100000) {
    return a;
  }
  const c: number = canvasH;
  if (!(c > 0) || c >= 100000) {
    return 0;
  }
  const ch: number = (chromeH > 0 && chromeH < c) ? chromeH : TSB_CHROME_H_VP;
  const est: number = c - ch;
  return est > 0 ? est : 0;
}

/** 视口能放下的行数（按行高估算，四舍五入；恒 >= 1）。 */
export function textVisibleRowsOf(viewportH: number, rowH: number): number {
  if (!(viewportH > 0) || !(rowH > 0)) {
    return TSB_MIN_VISIBLE_ROWS;
  }
  const rows: number = Math.round(viewportH / rowH);
  return rows > TSB_MIN_VISIBLE_ROWS ? rows : TSB_MIN_VISIBLE_ROWS;
}

/** 滚动条是否可见：**内容行数严格超过视口行数**才显示。
 *  内容未超一屏（<=）→ false（短文件不该有滚动条）；脏值 / 视口未知 → false。 */
export function textBarVisibleOf(totalRows: number, viewportH: number,
  rowH: number): boolean {
  if (!(totalRows > 0) || !(viewportH > 0) || !(rowH > 0)) {
    return false;
  }
  return totalRows > textVisibleRowsOf(viewportH, rowH);
}

/**
 * 端到端判定：把「onAreaChange 没回填视口高」这条最容易丢条的路径一并算进去。
 * UI 侧 refreshTextBar() 直接用它，一次拿到 boolean 写进 @State。
 */
export function textBarVisibleSafeOf(totalRows: number, areaH: number,
  canvasH: number, rowH: number, chromeH: number): boolean {
  return textBarVisibleOf(totalRows, textViewportHOf(areaH, canvasH, chromeH), rowH);
}
