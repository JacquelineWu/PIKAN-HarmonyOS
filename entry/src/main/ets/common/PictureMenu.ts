/**
 * common/PictureMenu.ts —— 预览区「相片右键菜单」的唯一真值源
 *
 *  第一百零七轮（R107）改版：菜单从「一堆勾选项」变成「一个动作 + 四个滑动开关」。
 *    · 每一项都是「左侧滑动开关 + 右侧功能名称」的横向行，开关与文字垂直居中；
 *    · 恒 5 项，顺序固定：
 *        ① 显示exif资料框（纯动作，无开关）
 *        ② 左右并排预览（开关，默认关 = 单页；原「单张预览」项已移除）
 *        ③ 超分辨模式（开关，默认开）
 *        ④ 播放幻灯片（开关，默认关）
 *        ⑤ 全屏模式（开关，默认关）
 *    · 「单张预览」不再作为独立功能项存在：它就是并排开关的「关」。
 *    · 开关状态一律取**眼前真值**（并排是否真的显示、是否真的在播、是否真的全屏），
 *      不复制一份影子状态，避免「勾了却没生效」。
 *
 *  历史（保留，便于对照实机行为）：
 *    · 第七十六轮：仅对含 EXIF 的相片显示右上角 EXIF 图标；右键弹三项菜单；
 *    · 第九十四轮：幻灯片入口迁到这里；第一百零六轮：全屏 / 超分辨入口。
 *
 *  与 FileContextMenu.ts 的分工（两套菜单互不干扰）：
 *    · FileContextMenu.ts —— 左栏档案列表条目的五项菜单（R72–R75 已定稿，零改动）。
 *    · 本文件 —— 预览区当前相片的菜单、EXIF 图标显隐、EXIF 段探测、预览模式决策、
 *      菜单浮层几何、开关语义与状态文案。
 *
 *  严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零全局可变状态。
 */

// ==================================================================
// ① 菜单动作码与文案（顺序即用户指定顺序，恒 5 项）
// ==================================================================
/** 唯一一项「纯动作」：点一下弹 EXIF 资料框，不表示任何持续状态。 */
export const PM_ACT_EXIF: string = 'pmExif';
/** 以下四项都是「滑动开关」项：都表示一个持续状态，点一下翻转一次。 */
export const PM_ACT_SPREAD: string = 'pmSpread';
export const PM_ACT_SR: string = 'pmSr';
/** 第九十四轮：幻灯片播放入口从「自动隐藏顶栏」迁到相片右键菜单。 */
export const PM_ACT_SLIDE: string = 'pmSlide';
/** 第一百零六轮：全屏模式。 */
export const PM_ACT_FULL: string = 'pmFull';

export const PM_LABEL_EXIF: string = '显示exif资料框';
export const PM_LABEL_SPREAD: string = '左右并排预览';
export const PM_LABEL_SR: string = '超分辨模式';
/** 第一百零七轮：开关项的文案是**固定功能名**，不再随状态改名
 *  （开关本身就是状态表达；文案在「播放 / 暂停」之间跳会让读屏与视觉都不稳定）。 */
export const PM_LABEL_SLIDE: string = '播放幻灯片';
export const PM_LABEL_FULL: string = '全屏模式';

/** 一个菜单项：动作码 + 文案 + 状态。
 *  · `sw`      —— 是否以「左侧滑动开关 + 右侧功能名」的行式渲染（false = 纯动作行）；
 *  · `checked` —— 开关当前是否处于「开」（纯动作行恒 false）；
 *  · `enabled` —— false = 灰显且点不动。
 *  三者由同一套渲染读取，UI 不另开分支。 */
export interface PmMenuItem {
  act: string;
  label: string;
  /** 是否处于「已开启」态（纯动作项恒 false）。 */
  checked: boolean;
  /** 是否可用；false = 灰显且点击无响应。 */
  enabled: boolean;
  /** 是否为「滑动开关」项。 */
  sw: boolean;
}

/** 菜单项真值源：**顺序固定** —— ① EXIF 动作 ② 并排预览 ③ 超分辨 ④ 幻灯片 ⑤ 全屏。
 *
 *  参数说明（全部有默认值）：
 *   · playing    —— 幻灯片开关当前是否在播；
 *   · spreadOn   —— **当前是否真的在并排显示**（`spreadShown()` 的真值，
 *                   AUTO 下竖图自动对开时也是 true —— 开关显示的是眼前事实，不是内部枚举）；
 *   · fullscreen —— 全屏开关；
 *   · srMode     —— 超分辨开关；
 *   · srEnabled  —— 超分辨开关是否可用（无上屏图时为 false）。
 *  每次返回新数组（零共享可变状态）。 */
export function pmItemsOf(playing: boolean = false, spreadOn: boolean = false,
  fullscreen: boolean = false, srMode: boolean = true,
  srEnabled: boolean = true): Array<PmMenuItem> {
  return [
    { act: PM_ACT_EXIF, label: PM_LABEL_EXIF,
      checked: false, enabled: true, sw: false },
    { act: PM_ACT_SPREAD, label: PM_LABEL_SPREAD,
      checked: spreadOn === true, enabled: true, sw: true },
    { act: PM_ACT_SR, label: PM_LABEL_SR,
      checked: srMode === true, enabled: srEnabled === true, sw: true },
    { act: PM_ACT_SLIDE, label: PM_LABEL_SLIDE,
      checked: playing === true, enabled: true, sw: true },
    { act: PM_ACT_FULL, label: PM_LABEL_FULL,
      checked: fullscreen === true, enabled: true, sw: true }
  ];
}

/** 菜单项数（恒 5：1 个动作 + 4 个开关）。 */
export function pmItemCountOf(): number {
  return pmItemsOf().length;
}

/** 开关项的动作码（顺序即展示顺序）—— 「三个新功能 + 并排」共四项，全是开关。 */
export function pmSwitchActsOf(): Array<string> {
  return [PM_ACT_SPREAD, PM_ACT_SR, PM_ACT_SLIDE, PM_ACT_FULL];
}

/** 菜单顺序是否严格符合要求 —— 静态契约与 UI 共用的唯一判据。 */
export function pmMenuOrderOkOf(items: Array<PmMenuItem>): boolean {
  return items.length === 5 &&
    items[0].act === PM_ACT_EXIF && items[0].sw === false &&
    items[1].act === PM_ACT_SPREAD && items[1].sw === true &&
    items[2].act === PM_ACT_SR && items[2].sw === true &&
    items[3].act === PM_ACT_SLIDE && items[3].sw === true &&
    items[4].act === PM_ACT_FULL && items[4].sw === true;
}

/** 每个开关的默认状态（进入应用、未被用户拨动时的初始值）。
 *  这也是「实现说明」里那份默认态清单的唯一真值源，测试直接断言它。 */
export function pmSwitchDefaultOf(act: string): boolean {
  // 超分辨：默认开 —— R99 起的「按需自动超分」就是默认行为，开关只是给它一个总闸。
  if (act === PM_ACT_SR) {
    return true;
  }
  // 并排 / 幻灯片 / 全屏：默认关。并排关 ≠ 以前那个「单张预览」强制项：
  // 初始仍是 PM_MODE_AUTO（竖图自动对开），开关只显示「现在是否真的并排」。
  return false;
}

/** 开关动作码 → 固定功能名（无障碍标签与状态文案共用）。未知动作返回空串。 */
export function pmLabelOf(act: string): string {
  if (act === PM_ACT_EXIF) {
    return PM_LABEL_EXIF;
  }
  if (act === PM_ACT_SPREAD) {
    return PM_LABEL_SPREAD;
  }
  if (act === PM_ACT_SR) {
    return PM_LABEL_SR;
  }
  if (act === PM_ACT_SLIDE) {
    return PM_LABEL_SLIDE;
  }
  if (act === PM_ACT_FULL) {
    return PM_LABEL_FULL;
  }
  return '';
}

/** 某个动作是否属于该菜单；杜绝越权动作分发。 */
export function pmHasActOf(act: string): boolean {
  const list: Array<PmMenuItem> = pmItemsOf();
  for (let i = 0; i < list.length; i++) {
    if (list[i].act === act) {
      return true;
    }
  }
  return false;
}

// ==================================================================
// ② 预览模式（并排开关的两种落点；AUTO 只是初始值）
// ==================================================================
/** 自动：完全沿用 R56 的 spreadRightWantedOf(左图比例) 自动竖图对开，零回归。
 *  第一百零七轮起它**只是初始值**：用户一旦拨动并排开关，就固定为 SINGLE / SPREAD 之一。 */
export const PM_MODE_AUTO: number = 0;
/** 并排开关「关」：单页居中显示（spreadB = -1）。旧的「单张预览」菜单项已移除，
 *  这个值不再有独立的用户入口，只是开关关闭态的落点。 */
export const PM_MODE_SINGLE: number = 1;
/** 并排开关「开」：只要有可配对的下一张就并排，不再要求左图为竖图。 */
export const PM_MODE_SPREAD: number = 2;

/** 并排开关的状态 → 预览模式。开 = 强制并排，关 = 单页。
 *  纯布尔映射：UI 的开关与内部模式枚举之间只有这一条转换，不会再出现第三个用户态。 */
export function pmSpreadModeOf(on: boolean): number {
  return on === true ? PM_MODE_SPREAD : PM_MODE_SINGLE;
}

/** 是否真的要显示右页：
 *   · 单张 → 恒 false；
 *   · 并排 → 有下一张即 true（覆盖自动判据，尺寸未知也能并排）；
 *   · 自动 → 交回既有 spreadRightWantedOf 的结果（自动竖图对开逐字不变）。 */
export function pmSpreadWantedOf(mode: number, hasNext: boolean,
  autoWanted: boolean): boolean {
  if (mode === PM_MODE_SINGLE) {
    return false;
  }
  if (mode === PM_MODE_SPREAD) {
    return hasNext === true;
  }
  return autoWanted === true;
}

/** 模式名（状态栏反馈用）。 */
export function pmModeLabelOf(mode: number): string {
  if (mode === PM_MODE_SINGLE) {
    return '单页显示';
  }
  if (mode === PM_MODE_SPREAD) {
    return '左右并排预览';
  }
  return '自动预览';
}

// ==================================================================
// ③ EXIF 图标显隐 / EXIF 段探测 / EXIF 资料框文案
// ==================================================================
/** EXIF 图标文字（右上角，与 R70 左上角 HDR 徽标同一套自带对比度底板）。 */
export const PM_EXIF_LABEL: string = 'EXIF';

/** 图标显隐严格判据：仅「当前相片确有【有效 EXIF 数据】」+「已有上屏图源」+「非文本预览」。
 *  三个参数全部 === 显式判等，杜绝脏值把无 EXIF 相片误标。
 *
 *  第七十七轮：hasExif 的真值**改为 pmExifEffectiveOf(exifFields)** ——
 *  即「SDK 至少读到一个有效字段」，与 EXIF 资料框字段完全同源。
 *  R76 用「字节级含段」粗判，会出现「有段但字段全读不到 ⇒ 标了图标却看不了资料」，
 *  或「HEIC/PNG 头部随便四个 ASCII 字节 ⇒ 无 EXIF 却误标」；本轮两者一并根除：
 *  显示图标 ⇔ 有有效字段 ⇔ 资料框一定有内容。 */
export function pmExifBadgeVisibleOf(hasExif: boolean, hasImage: boolean,
  textMode: boolean): boolean {
  return hasExif === true && hasImage === true && textMode === false;
}

/** 第七十七轮：EXIF 是否「有效」的唯一判据 —— 至少一个真正可读的字段。
 *  空数组 / undefined / 全 '--' 一律 false。图标显隐、资料框、缓存全部共用它，
 *  三者同源，从结构上杜绝「标错且无法查看」。零 SDK / 零 IO。 */
export function pmExifEffectiveOf(fields: Array<PmExifField>): boolean {
  if (fields === undefined || fields === null) {
    return false;
  }
  for (let i: number = 0; i < fields.length; i++) {
    if (pmExifFieldWantedOf(fields[i])) {
      return true;
    }
  }
  return false;
}

/** 第七十七轮：是否要发 SDK getImageProperty 读 EXIF 字段。
 *  · 字节级段判据命中 → 读；
 *  · fd 兜底路径没有完整 bytes 可判 → **也要读一次**（R76 在这里恒 false，
 *    导致「相片明明有 EXIF 却不显示图标、资料框也空」）；
 *  · 明确有完整 bytes 且没扫到 EXIF 段 → 跳过，避免给每张普通相片加 8 次跨进程往返。
 *  纯条件判断，零 IO。 */
export function pmExifShouldReadOf(segPresent: boolean, bytesReadable: boolean): boolean {
  return segPresent === true || bytesReadable === false;
}

/** 第七十六轮：「预览区当前确实是相片」的唯一判据 —— 已有上屏图源且非文本预览态。
 *  EXIF 图标、相片右键菜单、放大镜左键切换三处共用，空态 / 指引卡 / 文本预览一律不命中。 */
export function pmPhotoReadyOf(hasImage: boolean, textMode: boolean): boolean {
  return hasImage === true && textMode === false;
}

/** EXIF 资料框的一行字段：中文标签 + 已归一的值。零 SDK / 零 IO，纯字符串对。 */
export interface PmExifField {
  label: string;
  value: string;
}

/** EXIF 资料框字段的中文标签（顺序固定，与 Preview.ets 读取的 PropertyKey 顺序一一对应）。 */
export const PM_EXIF_LABELS: Array<string> = [
  '拍摄时间', '曝光时间', '光圈', 'ISO', '焦距', '厂商', '机型', '白平衡'
];
/** 单字段值最大长度，防止超长 UserComment 之类撑破资料框。 */
export const PM_EXIF_VALUE_MAX: number = 48;
/** 资料框兜底文案（没有字段时也不开天窗）。 */
export const PM_EXIF_EMPTY: string = '这张相片未读取到可显示的 EXIF 字段';
/** 单个字段读不到时的占位符（该行不进资料框）。 */
export const PM_EXIF_UNKNOWN: string = '--';

/** 把 SDK getImageProperty 的原始字符串归一成一行字段：
 *  无效值（空 / Unknown… / none / null / 0/0 / --）统一显示 PM_EXIF_UNKNOWN，
 *  有效值去首尾空白并按 PM_EXIF_VALUE_MAX 截断。纯字符串，零 SDK。 */
export function pmExifFieldOf(label: string, raw: string): PmExifField {
  const val: string = pmExifValueOkOf(raw)
    ? pmExifValueOf(raw, PM_EXIF_VALUE_MAX) : PM_EXIF_UNKNOWN;
  return { label: label, value: val };
}

/** 该字段是否值得显示（无效值不占位，资料框只列真正读到的字段）。 */
export function pmExifFieldWantedOf(f: PmExifField): boolean {
  return f.value !== PM_EXIF_UNKNOWN && f.value.length > 0;
}

/** 图标右上角内边距（vp），与右下角角标层 padding(12) 同口径。 */
export const PM_EXIF_MARGIN_VP: number = 12;

/** SDK getImageProperty 返回值是否算「有效 EXIF 值」：
 *  去首尾空白后非空、不是 'Unknown …' / 'none' / 纯占位符。零 SDK，纯字符串判定。 */
export function pmExifValueOkOf(raw: string): boolean {
  if (raw.length === 0) {
    return false;
  }
  const s: string = raw.replace(/^\s+/, '').replace(/\s+$/, '');
  if (s.length === 0) {
    return false;
  }
  const low: string = s.toLowerCase();
  if (low.indexOf('unknown') === 0 || low === 'none' || low === 'null' ||
      low === '0/0' || low === '--') {
    return false;
  }
  return true;
}

/** 有效值归一（去首尾空白 + 截断，避免一串超长 UserComment 撑破资料框）。 */
export function pmExifValueOf(raw: string, maxLen: number): string {
  const s: string = raw.replace(/^\s+/, '').replace(/\s+$/, '');
  const cap: number = maxLen > 0 && maxLen === maxLen ? maxLen : 48;
  if (s.length <= cap) {
    return s;
  }
  return s.substring(0, cap - 1) + '…';
}

/** EXIF 段是否存在的【字节级粗筛】（零 SDK / 零跨进程 IO，直接用 hpProbeOf 已有的 raw bytes）：
 *   · JPEG（FF D8 起）：扫 APPn 段，找 APP1 的 'Exif\0\0' 六字节签名；
 *   · HEIC / HEIF（ftyp 容器）：'Exif' item type（iinf/infe）；
 *   · PNG：eXIf chunk。
 *  只在文件头 64KB 内扫，绝不整块大图线性扫，也不解码任何像素。
 *
 *  ⚠️ 第七十七轮起**它不再是图标显隐的真值**，只用来决定「要不要发 SDK 读取」
 *    （见 pmExifShouldReadOf / pmExifEffectiveOf）。四字节 ASCII 特征是保守近似，
 *    可能误命中压缩数据，也可能漏掉特殊容器 —— 但都不影响正确性：
 *    最终是否显示 EXIF 图标，一律以 SDK 实际读到的有效字段为准。 */
export function pmExifPresentOf(b: Uint8Array): boolean {
  if (b.length < 4) {
    return false;
  }
  // ① JPEG APP1
  if (b[0] === 0xFF && b[1] === 0xD8) {
    let i: number = 2;
    const end: number = b.length;
    while (i + 4 <= end) {
      if (b[i] !== 0xFF) {
        i++;
        continue;
      }
      const marker: number = b[i + 1];
      if (marker === 0xDA || marker === 0xD9 || marker === 0x01 ||
          (marker >= 0xD0 && marker <= 0xD7)) {
        break; // SOS / EOI / TEM / RST：段头到此为止
      }
      const len: number = (b[i + 2] << 8) | b[i + 3];
      if (len < 2 || i + 2 + len > end) {
        break;
      }
      if (marker === 0xE1 && i + 10 <= end &&
          b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 &&
          b[i + 7] === 0x66 && b[i + 8] === 0x00 && b[i + 9] === 0x00) {
        return true;
      }
      i += 2 + len;
    }
    return false;
  }
  // ② HEIC/HEIF 'Exif' item type、PNG 'eXIf' chunk：文件头窗口内找 ASCII 特征。
  //    第七十七轮：窗口由 256KB 收到 64KB（元数据 box 一定在头部），减少误命中；
  //    这里只是「是否值得读 SDK」的粗筛，误判不再影响图标显隐。
  const cap: number = b.length < 65536 ? b.length : 65536;
  for (let k = 0; k + 4 <= cap; k++) {
    if (b[k] === 0x65 && b[k + 1] === 0x58 && b[k + 2] === 0x49 && b[k + 3] === 0x66) {
      return true; // 'eXIf'
    }
    if (b[k] === 0x45 && b[k + 1] === 0x78 && b[k + 2] === 0x69 && b[k + 3] === 0x66) {
      return true; // 'Exif'
    }
  }
  return false;
}

/** 资料框标题：带相片名方便一眼确认是哪一张。 */
export function pmExifPanelTitleOf(name: string): string {
  return name.length > 0 ? 'EXIF 资料 · ' + name : 'EXIF 资料';
}

/** 资料框是否该显示「无可读取字段」兜底行。 */
export function pmExifEmptyOf(fieldCount: number): boolean {
  return !(fieldCount > 0) || fieldCount !== fieldCount;
}


// ==================================================================
// ④ 相片右键菜单命中 / 浮层几何 / 状态文案
// ==================================================================
/** 右键是否落在「相片上」：已有上屏图源且非文本预览态才弹相片菜单。
 *  空态（没有图）/ 文本预览 / 只读指引卡一律不弹，绝不越界。 */
export function pmRightHitOf(hasImage: boolean, textMode: boolean): boolean {
  return pmPhotoReadyOf(hasImage, textMode);
}

/** 菜单宽 / 项高 / 标题高 / 上下内边距（vp），与左栏菜单同口径但独立常量。
 *
 *  第一百零七轮：行高 34 → **44**。开关行的行高就是整行的可点击高度，
 *  44vp 是移动端 / 桌面端都够用的最小触控目标；标题行与内边距不动。 */
export const PM_MENU_W: number = 232;
export const PM_MENU_ITEM_H: number = 44;
export const PM_MENU_TITLE_H: number = 24;
export const PM_MENU_PAD_V: number = 6;
export const PM_MENU_EDGE_V: number = 8;
export const PM_MENU_NAME_MAX: number = 28;
/** 菜单左右内边距（vp）：开关与文字共用，保证两列视觉对齐。 */
export const PM_MENU_PAD_H: number = 10;
/** 开关可视尺寸（vp）：44×26 是 HarmonyOS 原生 Switch 的稳定观感尺寸；
 *  实际可点击区域由 responseRegion 扩到 44 高（= 整数行高），满足触控目标。 */
export const PM_SWITCH_W: number = 44;
export const PM_SWITCH_H: number = 26;
/** 开关与功能名之间的间距（vp）。 */
export const PM_SWITCH_GAP: number = 12;
/** 菜单最小可用宽度：再窄就放不下「开关 + 五个字」，宁可让浮层贴近屏幕边缘。 */
export const PM_MENU_W_MIN: number = 200;

/** 菜单实际宽度：随根容器自适应。
 *  桌面（宽屏）用 PM_MENU_W；移动端窄屏（如 360vp）按「留 16vp 边距」收窄，
 *  下限 PM_MENU_W_MIN，绝不超出可视区。rootW 非法（0 / NaN）时退回 PM_MENU_W。纯数值。 */
export function pmMenuWidthOf(rootW: number): number {
  if (!(rootW > 0)) {
    return PM_MENU_W;
  }
  const fit: number = rootW - 16;
  if (fit < PM_MENU_W_MIN) {
    return PM_MENU_W_MIN;
  }
  return fit < PM_MENU_W ? Math.floor(fit) : PM_MENU_W;
}

/** 菜单浮层在根 Stack 里的绝对位置。 */
export interface PmMenuPos {
  x: number;
  y: number;
}

/** 浮层总高；项数非法返回 0。 */
export function pmMenuHeightOf(count: number): number {
  if (count <= 0 || count !== count) {
    return 0;
  }
  return count * PM_MENU_ITEM_H + PM_MENU_TITLE_H + PM_MENU_PAD_V * 2;
}

/** 把鼠标窗口坐标裁成菜单左上角坐标（右下越界内翻，脏值收进安全区）。纯数值，零 IO。 */
export function pmMenuPosOf(x: number, y: number, rootW: number, rootH: number,
  menuW: number, menuH: number): PmMenuPos {
  const ax: number = x !== x ? 0 : x;
  const ay: number = y !== y ? 0 : y;
  const rw: number = rootW !== rootW ? 0 : rootW;
  const rh: number = rootH !== rootH ? 0 : rootH;
  let px: number = ax;
  let py: number = ay;
  if (rw > 0 && menuW > 0 && px + menuW > rw - PM_MENU_EDGE_V) {
    px = rw - menuW - PM_MENU_EDGE_V;
  }
  if (rh > 0 && menuH > 0 && py + menuH > rh - PM_MENU_EDGE_V) {
    py = rh - menuH - PM_MENU_EDGE_V;
  }
  if (px < PM_MENU_EDGE_V) {
    px = PM_MENU_EDGE_V;
  }
  if (py < PM_MENU_EDGE_V) {
    py = PM_MENU_EDGE_V;
  }
  return { x: px, y: py };
}

/** 浮层是否真该显示：开关为真且菜单项非空。 */
export function pmMenuVisibleOf(on: boolean, count: number): boolean {
  return on === true && count > 0;
}

/** 菜单标题用当前相片名，空名兜底、超长截断。 */
export function pmMenuTitleOf(name: string): string {
  if (name.length === 0) {
    return '相片';
  }
  if (name.length <= PM_MENU_NAME_MAX) {
    return name;
  }
  return name.substring(0, PM_MENU_NAME_MAX - 1) + '…';
}

/** 每个动作完成后的状态栏反馈：点了必须看得见反应，不静默吞掉。 */
export function pmStatusOf(act: string, name: string, mode: number, tag: string): string {
  const tail: string = tag.length > 0 ? ' · ' + tag : '';
  if (act === PM_ACT_EXIF) {
    return '已显示「' + (name.length > 0 ? name : '相片') + '」EXIF 资料框' + tail;
  }
  if (act === PM_ACT_SPREAD) {
    return pmSwitchStatusOf(PM_ACT_SPREAD, mode === PM_MODE_SPREAD, tag);
  }
  return '';
}

// ==================================================================
// ⑤ 滑动开关：状态文案 / 无障碍描述 / 键盘切换语义（第一百零七轮）
// ==================================================================
/** 开关拨到 `on` 之后状态栏那句话 —— 与「原有开启 / 关闭逻辑」的真实后果逐条对应：
 *   · 并排：开 = 有可配对的下一张就并排；关 = 单页居中；
 *   · 超分辨：开 = AI 超分按需生效；关 = 立刻回原图、后续不再触发；
 *   · 幻灯片：开 = 开始播放（沿用进入时的并排 / 单页形态）；关 = 暂停并收掉叠显层；
 *   · 全屏：开 = 隐藏左栏与状态栏、画面只剩图片；关 = 原样还原退出前的视图。
 *  纯字符串，零 IO。 */
export function pmSwitchStatusOf(act: string, on: boolean, tag: string): string {
  const tail: string = tag.length > 0 ? ' · ' + tag : '';
  if (act === PM_ACT_SPREAD) {
    return on === true
      ? '左右并排预览：已开启（有可配对的一张就并排）' + tail
      : '左右并排预览：已关闭（单页居中显示）' + tail;
  }
  if (act === PM_ACT_SR) {
    return on === true
      ? '超分辨模式：已开启（AI 超分按需生效）' + tail
      : '超分辨模式：已关闭 · 已回到原图' + tail;
  }
  if (act === PM_ACT_SLIDE) {
    return on === true
      ? '幻灯片：播放中（每 3 秒切换 · 淡入淡出）' + tail
      : '幻灯片：已暂停' + tail;
  }
  if (act === PM_ACT_FULL) {
    return on === true ? '全屏模式：已开启（Esc 退出）' + tail : '全屏模式：已关闭' + tail;
  }
  return '';
}

/** 无障碍描述（读屏 / 辅助技术读到的「这是什么 + 现在什么状态 + 怎么切」）。
 *  开关的「选中与否」本身由原生 Toggle 语义提供，这里补的是可读文案。 */
export function pmSwitchDescOf(act: string, on: boolean): string {
  const name: string = pmLabelOf(act);
  if (name.length === 0) {
    return '';
  }
  return name + '，当前' + (on === true ? '已开启' : '已关闭') + '，按空格或回车切换';
}
