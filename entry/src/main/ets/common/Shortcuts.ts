/**
 * common/Shortcuts.ts —— 第一百零六轮：底部状态栏「快捷键总表」的唯一真值源
 *
 * 为什么单独抽一个模块：
 *   · 快捷键散落在 onKey / onMouseButton / 手势里，界面上的提示必须**一次列全**，
 *     不能各处自己拼字符串（拼漏、拼错、两处不一致都是这么来的）；
 *   · 纯常量 + 一个取值函数 = 零 SDK / 零 IO / 零状态，测试可以直接断言
 *     「每一条可用快捷键都在里面」，而不是靠人眼看截图。
 *
 * 列的规则（与实现逐条对应，改键位时同步改这里）：
 *   ← / →            翻页（go(-1) / go(1)）
 *   ↑ / ↓            翻页（与 ← → 同向；上下键不再缩放）
 *   滚轮              翻页；Ctrl + 滚轮 = 缩放
 *   空格              幻灯片播放 / 暂停
 *   R                 旋转 90°
 *   F                 切换全屏（Shift+F 同效）
 *   双击画布 / 档案名  切换全屏
 *   1                 1:1 原尺寸
 *   0                 复位（适应窗口）
 *   ⌫（退格）         返回上一层目录
 *   Ctrl+B            折叠 / 展开左栏
 *   Esc               全屏中退出全屏；普通态关闭应用
 *
 * 排版约束：单行、极简分隔符，长度控制在常见窗口宽度内（10vp 字号约 700–800vp），
 * 由状态栏第二行整行承载 —— 不覆盖、不遮挡第一行的状态文案。
 */

/** 分隔符：中点，比竖线轻、比空格清楚。 */
const SEP: string = '  ·  ';

/** 一条快捷键提示（键位 + 含义），顺序即展示顺序。 */
export interface ShortcutHint {
  key: string;
  what: string;
}

/** 全量快捷键（唯一真值，界面与测试共用）。每次返回新数组，零共享可变状态。 */
export function shortcutHintsOf(): Array<ShortcutHint> {
  return [
    { key: '← →', what: '翻页' },
    { key: '↑ ↓', what: '翻页' },
    { key: '滚轮', what: '翻页' },
    { key: 'Ctrl+滚轮', what: '缩放' },
    { key: '空格', what: '幻灯片' },
    { key: 'R', what: '旋转' },
    { key: 'F', what: '全屏' },
    { key: '双击', what: '全屏' },
    { key: '1', what: '1:1' },
    { key: '0', what: '复位' },
    { key: '⌫', what: '上层' },
    { key: 'Ctrl+B', what: '折叠左栏' },
    { key: 'Esc', what: '退出' }
  ];
}

/** 拼成状态栏那一行：`← → 翻页 · ↑ ↓ 翻页 · … · Esc 退出`。纯字符串，零 IO。 */
export function shortcutHintsTextOf(): string {
  const list: Array<ShortcutHint> = shortcutHintsOf();
  const parts: Array<string> = [];
  for (let i: number = 0; i < list.length; i++) {
    parts.push(list[i].key + ' ' + list[i].what);
  }
  return parts.join(SEP);
}

/** 该键位是否已被列进总表（测试断言用，避免「新增快捷键忘了写提示」）。 */
export function shortcutListedOf(key: string): boolean {
  const list: Array<ShortcutHint> = shortcutHintsOf();
  for (let i: number = 0; i < list.length; i++) {
    if (list[i].key === key) {
      return true;
    }
  }
  return false;
}
