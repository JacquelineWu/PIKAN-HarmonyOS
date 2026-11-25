/**
 * common/FileContextMenu.ts —— 第七十二轮：左栏档案列表右键菜单的纯函数真值源
 *
 *  「与原生鸿蒙 OS 档案管理员一致」的右键菜单，文案与判定全部收在这里：
 *    · 鸿蒙电脑档案管理员官方用词：「打开」「详情」「打开所在文件夹 / 在文件夹中显示」
 *      「复制」等；本轮按用户原话把第三项定为「打开档案所在目录」。
 *    · 本 APP 是**只读看图器**（仅 READ_IMAGEVIDEO），不具备写入 / 删除 / 重命名权限。
 *      故只落地「打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称」五项
 *      真实可执行动作，不摆出做不到的「重命名 / 删除 / 剪切 / 分享 / 压缩」假选项
 *      —— 沿用本项目「不假装支持、失败态明确」的一贯口径。
 *
 *  纯函数约束（与 common/ 其它模块逐字一致）：
 *    零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零 Date.now /
 *    零全局可变状态。所有函数只依赖入参，返回新对象 / 新数组，绝不读写模块级变量。
 *
 *  真值源与 UI 的分工：
 *    · 命中判定 / 菜单项 / 详情字段 / 复制文本 / 状态文案 / 放大镜抑制 → 本文件。
 *    · bindContextMenu / Menu / MenuItem / pasteboard / openFolder / 对话框 → Index
 *      与 SidebarView（唯一碰 SDK 的地方）。
 */

// --------------------------------------------------------------------
// 行种类（与 components/ArchiveRow.ets 的 ROW_* 数值严格一致，此处只做数值常量，
// 不 import 组件，保持 common/ 层零 SDK、零 UI 依赖、模块图无环）。
// --------------------------------------------------------------------
export const FC_KIND_IMAGE: number = 0;
export const FC_KIND_UP: number = 1;
export const FC_KIND_FOLDER: number = 2;
export const FC_KIND_OTHER: number = 3;
export const FC_KIND_TEXT: number = 4;
/** 列表空白区 / 空态 / 标题栏 / 按钮行：不是一个档案项目。 */
export const FC_KIND_BLANK: number = -1;

// --------------------------------------------------------------------
// 动作码与菜单文案（原生鸿蒙档案管理员用词）
// --------------------------------------------------------------------
export const FC_ACT_NONE: string = '';
export const FC_ACT_OPEN: string = 'fcOpen';
export const FC_ACT_DETAIL: string = 'fcDetail';
export const FC_ACT_REVEAL: string = 'fcReveal';
export const FC_ACT_COPY_PATH: string = 'fcCopyPath';
export const FC_ACT_COPY_NAME: string = 'fcCopyName';

export const FC_LABEL_OPEN: string = '打开';
/** 官方用词「详情」，对应用户所说的「档案 detail」；Alt+Enter 同义。 */
export const FC_LABEL_DETAIL: string = '详情';
/** 用户原话；原生对应「打开所在文件夹」/「在文件夹中显示」。 */
export const FC_LABEL_REVEAL: string = '打开档案所在目录';
export const FC_LABEL_COPY_PATH: string = '复制路径';
export const FC_LABEL_COPY_NAME: string = '复制档案名称';

/** 详情面板字段标签（原生「详情」面板：名称 / 类型 / 大小 / 修改时间 / 位置 / 路径）。 */
export const FC_FIELD_NAME: string = '名称';
export const FC_FIELD_TYPE: string = '类型';
export const FC_FIELD_SIZE: string = '大小';
export const FC_FIELD_MTIME: string = '修改时间';
export const FC_FIELD_LOCATION: string = '所在位置';
export const FC_FIELD_PATH: string = '完整路径';
/** 值缺失时的一律兜底文案，绝不返回空串让面板开天窗。 */
export const FC_UNKNOWN: string = '--';

/** 一个菜单项：动作码 + 显示文案。 */
export interface FcMenuItem {
  act: string;
  label: string;
}

/** 详情面板的一行字段。 */
export interface FcDetailField {
  label: string;
  value: string;
}

/** 详情面板入参：全部是纯数据，location 由 Index 用 parentDirOf(realPathOf(uri)) 算好传入。 */
export interface FcDetailInput {
  name: string;
  bytes: number;
  mtime: number;
  kind: number;
  uri: string;
  location: string;
}

/**
 * 菜单**只在档案项目上触发**：图片 / 文本 / 其它档案 / 文件夹都是列表里的真实项目；
 * 「..」往上层是导航伪行、空白区不是项目 —— 两者一律不命中。
 * 未知 / 负数 / NaN 也不命中（宁可不弹，绝不在不该弹的地方弹）。
 */
export function fcHitOf(kind: number): boolean {
  return kind === FC_KIND_IMAGE || kind === FC_KIND_TEXT ||
    kind === FC_KIND_OTHER || kind === FC_KIND_FOLDER;
}

/**
 * 菜单项真值源。命中行恒为 5 项（顺序即原生菜单顺序：打开 → 详情 → 所在目录 → 复制两式）；
 * 未命中行返回空数组 —— 调用方据此**根本不绑定** bindContextMenu，空白区零菜单。
 * 每次返回新数组，零共享可变状态。
 */
export function fcItemsOf(kind: number): Array<FcMenuItem> {
  if (!fcHitOf(kind)) {
    return [];
  }
  return [
    { act: FC_ACT_OPEN, label: FC_LABEL_OPEN },
    { act: FC_ACT_DETAIL, label: FC_LABEL_DETAIL },
    { act: FC_ACT_REVEAL, label: FC_LABEL_REVEAL },
    { act: FC_ACT_COPY_PATH, label: FC_LABEL_COPY_PATH },
    { act: FC_ACT_COPY_NAME, label: FC_LABEL_COPY_NAME }
  ];
}

/** 菜单项数（未命中为 0，供 UI / 测试快速判定）。 */
export function fcItemCountOf(kind: number): number {
  return fcItemsOf(kind).length;
}

/** 某个动作是否在该行的菜单里；用于 Index 的防御式分发，杜绝越权动作。 */
export function fcHasActOf(kind: number, act: string): boolean {
  if (!fcHitOf(kind) || act.length === 0) {
    return false;
  }
  const list: Array<FcMenuItem> = fcItemsOf(kind);
  for (let i = 0; i < list.length; i++) {
    if (list[i].act === act) {
      return true;
    }
  }
  return false;
}

/** 至少包含用户点名的两项：「档案 detail」与「打开档案所在目录」。 */
export function fcHasRequiredOf(items: Array<FcMenuItem>): boolean {
  let hasDetail: boolean = false;
  let hasReveal: boolean = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].act === FC_ACT_DETAIL) {
      hasDetail = true;
    }
    if (items[i].act === FC_ACT_REVEAL) {
      hasReveal = true;
    }
  }
  return hasDetail && hasReveal;
}

/**
 * 右键落在档案行上时，是否要 stopPropagation 阻断冒泡到根 .onMouse。
 *
 * 背景：根 onRootMouse 在**任何**右键 Press 上 toggle 放大镜（第十五轮既有行为）。
 * 档案行右键现在要给菜单，不能顺带翻转放大镜；而预览区 / 空白区的右键 toggle
 * 必须原样保留（零回归）。三者都满足时才拦，且**只拦 Press** —— Release 不拦，
 * 系统菜单自己收口，根容器也只认 Press。
 *
 * 参数全是布尔，纯函数不 import ArkUI 的 MouseAction / MouseButton 枚举。
 */
export function fcStopPropagationOf(isPress: boolean, isRight: boolean, hit: boolean): boolean {
  return isPress && isRight && hit;
}

/** 行种类的中文类型名，详情面板「类型」字段用。 */
export function fcKindLabelOf(kind: number): string {
  switch (kind) {
    case FC_KIND_IMAGE:
      return '图片档案';
    case FC_KIND_FOLDER:
      return '文件夹';
    case FC_KIND_TEXT:
      return '文字档案';
    case FC_KIND_OTHER:
      return '其他档案';
    default:
      return FC_UNKNOWN;
  }
}

/** 字节数 → 'B / KB / MB'，与左栏 fmtBytes 同口径；未知 / NaN 一律兜底。 */
export function fcBytesLabelOf(n: number): string {
  if (!(n > 0) || n !== n) {
    return FC_UNKNOWN;
  }
  if (n < 1024) {
    return n + ' B';
  }
  if (n < 1048576) {
    return (n / 1024).toFixed(1) + ' KB';
  }
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/** 毫秒时间戳 → 'YY-MM-DD HH:mm'；无效 / 零值兜底。只用入参构造 Date，零 Date.now。 */
export function fcTimeLabelOf(ms: number): string {
  if (!(ms > 0) || ms !== ms) {
    return FC_UNKNOWN;
  }
  const d: Date = new Date(ms);
  const p = (v: number): string => (v < 10 ? '0' + v : '' + v);
  return (d.getFullYear() % 100).toString().padStart(2, '0') + '-' + p(d.getMonth() + 1) + '-' +
    p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/** 详情面板标题：恒非空，带档案名方便一眼确认右键的是哪一项。 */
export function fcDetailTitleOf(name: string): string {
  return name.length > 0 ? '档案详情 · ' + name : '档案详情';
}

/** 详情面板字段装配：原生「详情」六项，值缺失逐项兜底，绝不抛错。 */
export function fcDetailFieldsOf(i: FcDetailInput): Array<FcDetailField> {
  return [
    { label: FC_FIELD_NAME, value: i.name.length > 0 ? i.name : FC_UNKNOWN },
    { label: FC_FIELD_TYPE, value: fcKindLabelOf(i.kind) },
    { label: FC_FIELD_SIZE, value: fcBytesLabelOf(i.bytes) },
    { label: FC_FIELD_MTIME, value: fcTimeLabelOf(i.mtime) },
    { label: FC_FIELD_LOCATION, value: i.location.length > 0 ? i.location : FC_UNKNOWN },
    { label: FC_FIELD_PATH, value: i.uri.length > 0 ? i.uri : FC_UNKNOWN }
  ];
}

/**
 * 目录路径归一：去 ? 参数、去尾部斜杠（保留根 '/'）。
 * 只做字符串处理，不做 URI 解码 / 不判卷根 —— 那是 DirName.ts 的职责。
 */
export function fcNormDirOf(p: string): string {
  let s: string = p;
  const q: number = s.indexOf('?');
  if (q >= 0) {
    s = s.slice(0, q);
  }
  while (s.length > 1 && s.charAt(s.length - 1) === '/') {
    s = s.slice(0, s.length - 1);
  }
  return s;
}

/**
 * 「打开档案所在目录」的目标目录：优先真实父目录，父级判不出时退回当前浏览目录，
 * 两者都空才返回空串（Index 据此给出明确提示，不静默无反应）。
 */
export function fcRevealTargetOf(parentDir: string, browseBase: string): string {
  if (parentDir.length > 0) {
    return parentDir;
  }
  if (browseBase.length > 0) {
    return browseBase;
  }
  return '';
}

/** 目标目录与当前目录不同才需要真正重新列举；相同只需在当前列表里定位并高亮。 */
export function fcRevealWantedOf(target: string, browseBase: string): boolean {
  if (target.length === 0) {
    return false;
  }
  return fcNormDirOf(target) !== fcNormDirOf(browseBase);
}

/** 复制到剪贴板的文本；非复制类动作返回空串（调用方据此短路，不写剪贴板）。 */
export function fcCopyTextOf(act: string, path: string, name: string): string {
  if (act === FC_ACT_COPY_PATH) {
    return path.length > 0 ? path : name;
  }
  if (act === FC_ACT_COPY_NAME) {
    return name;
  }
  return '';
}

/** 每个动作完成后的状态栏反馈：点了必须看得见反应，不静默吞掉。 */
export function fcStatusHintOf(act: string, name: string): string {
  const n: string = name.length > 0 ? name : FC_UNKNOWN;
  switch (act) {
    case FC_ACT_OPEN:
      return '已打开「' + n + '」';
    case FC_ACT_DETAIL:
      return '已显示「' + n + '」详情';
    case FC_ACT_REVEAL:
      return '已定位到「' + n + '」所在目录';
    case FC_ACT_COPY_PATH:
      return '已复制「' + n + '」路径';
    case FC_ACT_COPY_NAME:
      return '已复制档案名称「' + n + '」';
    default:
      return '';
  }
}
