/**
 * common/PictureMenu.ts —— 第七十六轮：预览区「相片右键菜单」的唯一真值源
 *
 *  用户要求（四项里的第 3 / 4 项）：
 *    · 仅对【含有 EXIF 资料】的相片，在【右上角】显示 EXIF 图标；不含的不显示；
 *    · 相片上方【右键】触发 picture contact menu（与左栏档案列表五项右键菜单互不影响）；
 *    · 菜单【前三项按顺序固定】：① 显示exif资料框 ② 单张预览 ③ 左右并排预览；
 *    · 选择各项分别：显示 EXIF 资料框 / 进入单张预览 / 进入左右并排预览。
 *
 *  与 FileContextMenu.ts 的分工（两套菜单互不干扰）：
 *    · FileContextMenu.ts —— 左栏档案列表条目的五项菜单（R72–R75 已定稿，本轮零改动）。
 *    · 本文件 —— 预览区当前相片的三项菜单、EXIF 图标显隐、EXIF 段探测、预览模式决策、
 *      菜单浮层几何与状态文案。
 *
 *  放大镜检查点：本轮把放大镜触发从「右键」改为「预览区相片上左键」，
 *  纯函数 loupeEnabledAfterLeftClick 落在 InteractionPlan.ts；这里只提供
 *  「右键是否该弹相片菜单」的命中判定 pmRightHitOf（零 SDK、零 IO）。
 *
 *  严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零全局可变状态。
 */

// ==================================================================
// ① 菜单动作码与文案（顺序即用户指定顺序，恒三项）
// ==================================================================
export const PM_ACT_EXIF: string = 'pmExif';
export const PM_ACT_SINGLE: string = 'pmSingle';
export const PM_ACT_SPREAD: string = 'pmSpread';

export const PM_LABEL_EXIF: string = '显示exif资料框';
export const PM_LABEL_SINGLE: string = '单张预览';
export const PM_LABEL_SPREAD: string = '左右并排预览';

/** 一个菜单项：动作码 + 显示文案。 */
export interface PmMenuItem {
  act: string;
  label: string;
}

/** 菜单项真值源：恒 3 项、顺序固定，每次返回新数组（零共享可变状态）。 */
export function pmItemsOf(): Array<PmMenuItem> {
  return [
    { act: PM_ACT_EXIF, label: PM_LABEL_EXIF },
    { act: PM_ACT_SINGLE, label: PM_LABEL_SINGLE },
    { act: PM_ACT_SPREAD, label: PM_LABEL_SPREAD }
  ];
}

/** 菜单项数（恒 3，供 UI / 测试快速判定）。 */
export function pmItemCountOf(): number {
  return pmItemsOf().length;
}

/** 前三项顺序是否严格符合要求 —— 静态契约与 UI 共用的唯一判据。 */
export function pmFirstThreeOrderedOf(items: Array<PmMenuItem>): boolean {
  return items.length >= 3 &&
    items[0].act === PM_ACT_EXIF && items[0].label === PM_LABEL_EXIF &&
    items[1].act === PM_ACT_SINGLE && items[1].label === PM_LABEL_SINGLE &&
    items[2].act === PM_ACT_SPREAD && items[2].label === PM_LABEL_SPREAD;
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
// ② 预览模式（用户选择「三项 + 模式覆盖」：不选时保持既有自动竖图对开）
// ==================================================================
/** 自动：完全沿用 R56 的 spreadRightWantedOf(左图比例) 自动竖图对开，零回归。 */
export const PM_MODE_AUTO: number = 0;
/** 单张预览：强制单页（spreadB = -1）。 */
export const PM_MODE_SINGLE: number = 1;
/** 左右并排预览：只要有下一张就强制并排，不再要求左图为竖图。 */
export const PM_MODE_SPREAD: number = 2;

/** 菜单动作 → 预览模式；非模式类动作（EXIF 资料框）保持当前模式不变。 */
export function pmModeAfterAct(current: number, act: string): number {
  if (act === PM_ACT_SINGLE) {
    return PM_MODE_SINGLE;
  }
  if (act === PM_ACT_SPREAD) {
    return PM_MODE_SPREAD;
  }
  return current;
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
    return '单张预览';
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

/** 图标显隐严格判据：仅「当前相片确含 EXIF 资料」+「已有上屏图源」+「非文本预览」。
 *  三个参数全部 === 显式判等，杜绝脏值把无 EXIF 相片误标。 */
export function pmExifBadgeVisibleOf(hasExif: boolean, hasImage: boolean,
  textMode: boolean): boolean {
  return hasExif === true && hasImage === true && textMode === false;
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

/** EXIF 段是否存在的【字节级】判据（零 SDK / 零跨进程 IO，直接用 hpProbeOf 已有的 raw bytes）：
 *   · JPEG（FF D8 起）：扫 APPn 段，找 APP1 的 'Exif\0\0' 六字节签名；
 *   · HEIC / HEIF（ftyp 容器）：'Exif' item type（iinf/infe）；
 *   · PNG：eXIf chunk。
 *  只在文件头 256KB 内扫，绝不整块大图线性扫，也不解码任何像素。 */
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
  const cap: number = b.length < 262144 ? b.length : 262144;
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

/** 菜单宽 / 项高 / 标题高 / 上下内边距（vp），与左栏菜单同口径但独立常量。 */
export const PM_MENU_W: number = 200;
export const PM_MENU_ITEM_H: number = 34;
export const PM_MENU_TITLE_H: number = 24;
export const PM_MENU_PAD_V: number = 6;
export const PM_MENU_EDGE_V: number = 8;
export const PM_MENU_NAME_MAX: number = 28;

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
  if (act === PM_ACT_SINGLE || act === PM_ACT_SPREAD) {
    return '已进入' + pmModeLabelOf(mode) + tail;
  }
  return '';
}
