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
 *    · 菜单浮层 / pasteboard / openFolder / 详情面板 → Index（唯一碰 SDK 的地方）。
 *
 *  第七十三轮（R73）真机修复：R72 用 bindContextMenu(ResponseType.RightClick) 依赖系统
 *  右键手势，真机实测「右键完全没反应」。同一 ListItem 又在右键 Press 调 stopPropagation
 *  掐断冒泡，与系统手势识别争抢同一个事件。R73 不再依赖任何系统手势通道：改由项目里
 *  已有多轮真机证据的 ListItem.onMouse 右键 Press 直接捕获窗口坐标并上抛，菜单改画成
 *  应用内条件浮层（与 R72 详情面板同一套机制）。文案 / 行为 / 命中 / 放大镜抑制全复用，
 *  新增的只有「浮层定位与尺寸」这一组纯数值判定，仍严格零 SDK / 零 IO。
 *
 *  第七十四轮（R74）真机修复：用户要求「打开档案所在目录」交给 **OS 自带文件管理器**
 *  打开【目录】，而不是把文件本身作为打开目标。R72/R73 该分支走的是应用内
 *  openFolder / onRowTap：同层时 onRowTap 直接把文件本身打开预览，且 fcRevealTargetOf
 *  对目录行也一律返回父目录 —— 两层都不对。R74 只改这一项的打开目标与渠道：
 *    · 文件行（图片 / 文本 / 其它）→ 剥掉文件名后的父目录（所在目录）；
 *    · 目录行（文件夹）→ 该行 URI 自身（目录本身）；
 *    · 目标恒为「目录」，绝不返回文件；判不出退回 browseBase，都空返回 ''；
 *    · Index 用 startAbility 拉起系统文件管理器（显式华为文件管理器 → 隐式
 *      viewData + general.directory 兜底），两级都有明确状态反馈与 hilog。
 *  菜单文案 / 其余四项动作 / 详情面板 / 复制 / 浮层 / 放大镜抑制逐字不变。
 *  本文件仍严格零 SDK / 零 IO / 零异步：只产出目标 URI 与 Want 契约常量（纯字符串 /
 *  纯数值），真正的 startAbility 落在 Index。
 *
 *  第七十五轮（R75）真机修复：R74 文件行目标取「剥 r.uri 文件名后的父目录」，但本项目
 *  r.uri 是 openFolder 用 joinBase + '/' + raw 拼出来的**列举用** URI，NAS 挂载前缀 /
 *  缓存秒开 / APP 内上层清单态下与用户当前看到的目录并不等价，于是系统文件管理器被
 *  指向错误目录、自然看不到应有的档案列表。R75 保留 R74 的 OS 文件管理器通道与两级
 *  Want 兜底，只把文件行目标改为**权威 browseBase**：
 *    · browseBase 是 openFolder 真实列举成功 / 缓存命中 / 上层清单态回填的当前目录，
 *      即左栏正在展示的那份档案列表所在目录，也是系统文件管理器该打开的目录；
 *    · browseBase 为空才退回 R74 的剥文件名兜底；两者皆空返回 ''；
 *    · 目录行仍返回该行 URI 自身；未命中行仍返回 ''。
 *  REVEAL 分支接线 / 菜单文案 / 其余四项动作 / 浮层 / 放大镜抑制逐字不变。
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

// --------------------------------------------------------------------
// 第七十三轮：应用内菜单浮层的尺寸与定位（纯数值，零 SDK / 零 IO）
// --------------------------------------------------------------------
/** 菜单宽（vp）。与原生档案管理员右键菜单接近的单列宽度。 */
export const FC_MENU_W: number = 200;
/** 单个菜单项行高（vp）。 */
export const FC_MENU_ITEM_H: number = 34;
/** 菜单顶部档案名标题行高（vp）。 */
export const FC_MENU_TITLE_H: number = 24;
/** 菜单上下内边距（vp），每项左右内边距另在 UI 里给 12。 */
export const FC_MENU_PAD_V: number = 6;
/** 菜单距窗口边缘的最小留白（vp），避免贴边 / 越界。 */
export const FC_MENU_EDGE_V: number = 8;
/** 标题名超过该长度就截断加省略号，绝不撑破菜单。 */
export const FC_MENU_NAME_MAX: number = 28;

/** 菜单浮层在根 Stack 中的绝对位置（vp）。 */
export interface FcMenuPos {
  x: number;
  y: number;
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

/** 第七十三轮：菜单浮层总高。项数非法 / 为 0 时返回 0，绝不返回负高或 NaN。 */
export function fcMenuHeightOf(count: number): number {
  if (count <= 0 || count !== count) {
    return 0;
  }
  return count * FC_MENU_ITEM_H + FC_MENU_TITLE_H + FC_MENU_PAD_V * 2;
}

/** 第七十三轮：把鼠标窗口坐标裁成菜单左上角坐标。
 *  右下越界时向内翻转，NaN / 负坐标一律收进安全区；窗口尺寸未测出（<= 0）时只做下限裁剪。
 *  纯数值：只依赖入参，返回新对象，不读任何全局状态。 */
export function fcMenuPosOf(x: number, y: number, rootW: number, rootH: number,
  menuW: number, menuH: number): FcMenuPos {
  const ax: number = x !== x ? 0 : x;
  const ay: number = y !== y ? 0 : y;
  const rw: number = rootW !== rootW ? 0 : rootW;
  const rh: number = rootH !== rootH ? 0 : rootH;
  let px: number = ax;
  let py: number = ay;
  if (rw > 0 && menuW > 0 && px + menuW > rw - FC_MENU_EDGE_V) {
    px = rw - menuW - FC_MENU_EDGE_V;
  }
  if (rh > 0 && menuH > 0 && py + menuH > rh - FC_MENU_EDGE_V) {
    py = rh - menuH - FC_MENU_EDGE_V;
  }
  if (px < FC_MENU_EDGE_V) {
    px = FC_MENU_EDGE_V;
  }
  if (py < FC_MENU_EDGE_V) {
    py = FC_MENU_EDGE_V;
  }
  return { x: px, y: py };
}

/** 第七十三轮：点击是否落在菜单矩形之外（决定点遮罩是否收起）。边界算在菜单内。 */
export function fcMenuOutsideOf(px: number, py: number, mx: number, my: number,
  mw: number, mh: number): boolean {
  return px < mx || py < my || px > mx + mw || py > my + mh;
}

/** 第七十三轮：菜单标题用档案名，空名兜底、超长截断，绝不开天窗或撑破布局。 */
export function fcMenuTitleOf(name: string): string {
  if (name.length === 0) {
    return '档案';
  }
  if (name.length <= FC_MENU_NAME_MAX) {
    return name;
  }
  return name.substring(0, FC_MENU_NAME_MAX - 1) + '…';
}

/** 第七十三轮：浮层是否真该显示 —— 开关为真且菜单项非空，避免出现空壳菜单。 */
export function fcMenuVisibleOf(on: boolean, count: number): boolean {
  return on && count > 0;
}

// --------------------------------------------------------------------
// 第七十四轮（R74）：「打开档案所在目录」→ 交给 OS 自带文件管理器打开【目录】
//
//  纯函数约束不变：零 SDK / 零 IO / 零异步 / 零 throw / 零全局可变状态。
//  这里只负责「目标目录 URI 是什么」与「Want 契约常量是什么」，
//  真正的 startAbility 调用落在 Index（唯一碰 SDK 的地方）。
// --------------------------------------------------------------------

/** 系统文件管理器（华为 HarmonyOS 2in1）的显式 Want 契约。
 *  来自华为开发者问答「鸿蒙如何打开当前文件位置，并显示资源管理器」：
 *  bundleName=com.huawei.hmos.filemanager / abilityName=MainAbility /
 *  parameters.fileUri=<目标 URI>。 */
export const FC_OSFM_BUNDLE: string = 'com.huawei.hmos.filemanager';
export const FC_OSFM_ABILITY: string = 'MainAbility';
export const FC_OSFM_PARAM_FILE_URI: string = 'fileUri';

/** 兜底的隐式 Want 契约：官方「拉起文件处理类应用」固定 action，
 *  UTD 目录类型 general.directory，以及只读 URI 授权 flag（0x00000001）。 */
export const FC_VIEW_DATA_ACTION: string = 'ohos.want.action.viewData';
export const FC_DIR_UTD: string = 'general.directory';
export const FC_URI_READ_FLAG: number = 0x00000001;

/**
 * 目标目录 URI —— R74 起恒返回【目录】；R75 起以 browseBase 为当前目录真值。
 *
 *   · 目录行（FC_KIND_FOLDER）→ 该行 URI 自身（打开该目录本身）；
 *   · 文件行（图片 / 文本 / 其它）→ 优先 browseBase（当前左栏展示清单的权威目录）；
 *     browseBase 为空才剥掉 itemUri 最后一段文件名作兜底；两者皆空返回 ''；
 *   · 未命中行（含 '..' 伪行 / 空白 / 未知 kind）→ ''，调用方短路。
 *
 *  为什么 R75 不能继续优先剥 itemUri：Index.openFolder 用 joinBase + '/' + raw 拼子项 URI，
 *  而 browseBase 是真实列举成功 / 缓存命中 / 上层清单态回填的当前目录；NAS 挂载前缀、
 *  picker 授权链、APP 内清单态下二者并不等价。剥出来的父段是「列举用路径」而非用户
 *  当前看到的目录，系统文件管理器打开后自然看不到应有的档案列表。
 *
 *  刻意**不用** parentDirOf(realPathOf(uri))：本项目 r.uri 是 picker 逐 URI 授权的
 *  `file://docs/...` / NAS `file://192.168.x/...` 形态，转成真实路径会丢掉授权段，
 *  系统文件管理器拿到裸路径反而打不开。这里在「URI 字符串」层处理，
 *  保留原 scheme / authority / 百分号编码，交给系统应用时授权链完整。
 */
export function fcRevealDirUriOf(kind: number, itemUri: string,
  browseBase: string): string {
  if (!fcHitOf(kind)) {
    // 「..」伪行 / 空白区 / 未知类型：根本不该有菜单，返回空串让调用方短路。
    return '';
  }
  const u: string = fcNormDirOf(itemUri);
  if (kind === FC_KIND_FOLDER) {
    // 目录行：目标就是它自己（不再取父目录 —— 这正是 R72/R73 的错）。
    if (u.length > 0) {
      return u;
    }
    return fcNormDirOf(browseBase);
  }
  // 文件行：当前展示清单的权威目录优先 —— 它是系统文件管理器该打开的那一个。
  const current: string = fcNormDirOf(browseBase);
  if (current.length > 0) {
    return current;
  }
  // browseBase 为空（图片列表态 / 恢复前）才退回 R74 的剥文件名兜底。
  const parent: string = fcParentUriOf(u);
  if (parent.length > 0) {
    return parent;
  }
  return '';
}

/**
 * 剥掉 URI 最后一段路径，返回父目录 URI；保留 scheme://authority 与分隔符。
 *
 *  `file://docs/storage/Users/x/a.HEIC` → `file://docs/storage/Users/x`
 *  `/storage/Users/x/a.HEIC`            → `/storage/Users/x`
 *  `file://docs` / `''` / 无父级         → `''`（绝不返回 '/..' 之类伪路径）
 *
 *  只做字符串处理：去 ? 参数与尾斜杠 → 找最后一个 '/' → 判 authority 边界。
 *  若切点之前没有第二个 '/'，说明切到的是 `file://authority` 本身，返回空串。
 */
export function fcParentUriOf(u: string): string {
  const s: string = fcNormDirOf(u);
  const i: number = s.lastIndexOf('/');
  if (i <= 0) {
    return '';
  }
  const head: string = s.substring(0, i);
  // 纯路径 `/a` → head=''；`file://docs` → head=`file:/`（切在 scheme 的 `//` 上）：
  // 两种都判不出父目录，返回空串交给 browseBase 兜底。
  if (head.length === 0 || head.charAt(head.length - 1) === '/') {
    return '';
  }
  // `file://docs/a` → head=`file://docs`，斜杠只剩 scheme 的 `//`：
  // authority 之后没有路径段，父目录同样判不出。
  const sch: number = head.indexOf('://');
  if (sch >= 0 && head.indexOf('/', sch + 3) < 0) {
    return '';
  }
  return head;
}

/** 目标是否「目录行」—— 供 Index 组装显式 Want 时选用（纯判定，零 SDK）。 */
export function fcRevealIsDirOf(kind: number): boolean {
  return kind === FC_KIND_FOLDER;
}

/** REVEAL 动作的状态栏反馈：把「打开的是目录」和「由系统文件管理器打开」说清楚。
 *  成功 / 失败两态都恒非空，点了必须看得见反应。 */
export function fcRevealStatusOf(name: string, ok: boolean, isDir: boolean,
  tag: string): string {
  const n: string = name.length > 0 ? name : FC_UNKNOWN;
  const tail: string = tag.length > 0 ? ' · ' + tag : '';
  if (!ok) {
    return '系统文件管理器未能打开「' + n + '」' + (isDir ? '目录' : '所在目录') + tail;
  }
  if (isDir) {
    return '已用系统文件管理器打开目录「' + n + '」' + tail;
  }
  return '已用系统文件管理器打开「' + n + '」所在目录' + tail;
}
