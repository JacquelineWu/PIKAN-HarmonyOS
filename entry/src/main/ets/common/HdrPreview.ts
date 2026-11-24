/**
 * common/HdrPreview.ts — 第七十一轮：HEIC / HEIF 的 HDR 保真解码与预览唯一真值源
 * （容器探测 / HDR 元数据 / 损坏分类 / 显式动态范围 / 产物校验 / 保真护栏 / 明确提示）
 *
 * 背景（真实判读 R55 / R70 / decodePx / OpenHarmony Image Kit 官方 API 得出）：
 *   · 本工程既有解码链已具备 EXIF 摆正、内嵌 ICC 保留（COLOR_MANAGE_MODE=0）、
 *     `desiredDynamicRange = DecodingDynamicRange.AUTO`、显示端 `DynamicRangeMode.HIGH`。
 *   · 但 AUTO 的官方语义是「按图片资源格式 + 设备支持情况自适应，平台不支持时自动降 SDR」，
 *     即**允许静默压缩动态范围**；且既有代码只校验源图 `ImageSource.getImageInfo().isHdr`，
 *     从未校验**解码产物** `PixelMap.getImageInfo().isHdr` —— 请求 HDR ≠ 得到 HDR。
 *   · 官方 `DecodingDynamicRange` 有 AUTO(0) / SDR(1) / HDR(2) 三档（native 头文件
 *     IMAGE_DYNAMIC_RANGE_AUTO/SDR/HDR = 0/1/2），故源为 HDR 时可显式请求 HDR 档。
 *   · 三类异常（缺 HDR 信息 / 格式不兼容 / 文件损坏）此前只有 hilog，界面无任何提示。
 *
 * 本轮的正解：
 *   ① 容器层：纯函数解析 ISOBMFF（ftyp / meta / iprp / ipco），取 major_brand、
 *      compatible_brands、ispe 原始尺寸、colr 的 BT.2020 + PQ/HLG 传递特性、
 *      clli/mdcv(HDR10)、auxC(gain map)、heix/hevx(10bit)，并做 box 越界 / 截断 /
 *      缺 ftyp·meta 的损坏判定；
 *   ② 解码层：`hpRequestOf` 对 HDR 源显式选 HDR 档（不再让 AUTO 静默降级），
 *      `hpOutcomeOf` 用**产物 isHdr** 反查是否被压缩，得到明确原因码；
 *   ③ 保真层：`hpDecodeSizeOf` 在安全像素护栏内让 HDR HEIC 按**原始尺寸**解码，
 *      `hpColorSpacePreservedOf` / `hpPixelFormatSafeOf` / `hpNoToneMapOf` 逐项守住
 *      色彩空间、位深、亮度，不做任何 tone mapping 或强制 sRGB 转换；
 *   ④ 提示层：`hpHintOf` 把全部原因码映射成中文明确提示，OK 态不打扰用户。
 *
 * 本模块是唯一真值源：零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise /
 * 零全局可变状态，可直接被 tests/dirname.test.mjs 与 tests/hdrprobe.mjs 加载运行。
 * 运行时只用决策函数；量化级数 / 动态范围比是一维数值模型，仅供回归，不参与 UI 渲染。
 */

// ==================== 原因码（0/1 为正常态，其余为需提示态） ====================

/** 源与产物均为 HDR：真正按高动态范围输出，无提示。 */
export const HP_OK_HDR: number = 0;
/** 普通 SDR 图按 SDR 正常输出，无提示。 */
export const HP_OK_SDR: number = 1;
/** 按 HDR 请求但源 / 容器均无 HDR 信息。 */
export const HP_NO_HDR_META: number = 2;
/** HEIC 容器 brand 不兼容，无法按 HDR 解码（原因码，注意与下方格式码分属不同命名空间）。 */
export const HP_CAUSE_FORMAT: number = 3;
/** box 越界 / 截断 / 缺 ftyp·meta：文件损坏或数据不完整。 */
export const HP_FILE_CORRUPT: number = 4;
/** 源为 HDR 但解码产物 isHdr=false：动态范围被压缩（最需要被看见的一类）。 */
export const HP_HDR_DOWNGRADED: number = 5;
/** 显示环境不支持 HDR，无法完整呈现。 */
export const HP_DISPLAY_NO_HDR: number = 6;
/** SDK 解码抛错 / 读字节失败。 */
export const HP_DECODE_FAILED: number = 7;
/** 原图超过保真像素护栏，已按显示档位缩放（信息型提示）。 */
export const HP_SIZE_CAPPED: number = 8;
/** SDK 未返回解码产物的 isHdr：无法校验是否真的保住了高动态范围（信息型提示）。 */
export const HP_HDR_UNVERIFIED: number = 9;

// ==================== 格式 / 档位 / 显示模式 ====================

export const HP_FMT_HEIC: number = 0;
export const HP_FMT_HEIF: number = 1;
export const HP_FMT_OTHER: number = 2;
/** 容器结构完整但 brand 不属 HEIC·HEIF 家族（与原因码 HP_CAUSE_FORMAT 对应）。 */
export const HP_FMT_CORRUPT: number = 3;
export const HP_FMT_INCOMPATIBLE: number = 4;

/** 与 image.DecodingDynamicRange 的官方数值一一对应，不另造语义。 */
export const HP_RANGE_AUTO: number = 0;
export const HP_RANGE_SDR: number = 1;
export const HP_RANGE_HDR: number = 2;

/** 与 ArkUI DynamicRangeMode 的官方顺序一致（HIGH / CONSTRAINT / STANDARD）。 */
export const HP_MODE_HIGH: number = 0;
export const HP_MODE_CONSTRAINT: number = 1;
export const HP_MODE_STANDARD: number = 2;

// ==================== 容器 / 元数据常量（ISOBMFF / HEIF） ====================

export const HP_MIN_BYTES: number = 12;
export const HP_BOX_HEADER: number = 8;
/** 畸形文件防护：最多遍历的 box 数与递归深度。 */
export const HP_MAX_BOXES: number = 256;
export const HP_MAX_DEPTH: number = 6;
export const HP_BRAND_HEIC: string = 'heic';
export const HP_BRAND_HEIX: string = 'heix';
export const HP_BRAND_HEVC: string = 'hevc';
export const HP_BRAND_HEVX: string = 'hevx';
export const HP_BRAND_MIF1: string = 'mif1';
export const HP_BRAND_MSF1: string = 'msf1';
/** nclx：BT.2020 原色 + PQ(16) / HLG(18) 传递特性 = HDR 的权威容器标记。 */
export const HP_PRIMARIES_BT2020: number = 9;
export const HP_TRANSFER_PQ: number = 16;
export const HP_TRANSFER_HLG: number = 18;
/** 8bit 量化格式（SDK PixelMapFormat.RGBA_8888 = 3）：10bit HDR 内容落到这里必丢高光。 */
export const HP_FMT_RGBA_8888: number = 3;

// ==================== 原始尺寸保真护栏 ====================

/** 允许按原始尺寸解码的总像素上限（12M ≈ 4000×3000），防 HDR 大图 OOM。 */
export const HP_MAX_ORIGINAL_PIXELS: number = 12000000;
/** 允许按原始尺寸解码的长边上限。 */
export const HP_MAX_ORIGINAL_EDGE: number = 4096;
/** COLOR_MANAGE_MODE=0 表示保留源色彩空间；HDR 图恒用此档。 */
export const HP_COLORSPACE_PRESERVE: number = 0;

// ==================== 明确提示文案（OK 态为空，不打扰） ====================

export const HP_HINT_NO_HDR: string = '此文件未包含 HDR 信息，已按 SDR 预览';
export const HP_HINT_FORMAT: string = 'HEIC 格式不兼容，无法按 HDR 解码';
export const HP_HINT_CORRUPT: string = 'HEIC 文件损坏或数据不完整，无法解码';
export const HP_HINT_DOWNGRADED: string = '源图为 HDR，但解码结果降为 SDR：动态范围已被压缩';
export const HP_HINT_DISPLAY: string = '当前显示环境不支持 HDR，无法完整呈现高动态范围';
export const HP_HINT_FAILED: string = 'HEIC 解码失败，请检查文件、格式与访问权限';
export const HP_HINT_CAPPED: string = '原图超过 HDR 保真上限，已按显示档位缩放（原尺寸 ';
export const HP_HINT_UNVERIFIED: string = '已请求 HDR 解码，但系统未提供产物的 HDR 标记，无法校验';

// ==================== 结构 ====================

export interface HpBox {
  type: string;
  off: number;
  size: number;
  payloadOff: number;
  payloadLen: number;
}

export interface HpHdrMeta {
  present: boolean;
  primaries: number;
  transfer: number;
  matrix: number;
  colrSeen: boolean;
  hdr10: boolean;
  gainMap: boolean;
  tenBit: boolean;
}

export interface HpSize {
  w: number;
  h: number;
}

export interface HpProbe {
  format: number;
  brand: string;
  width: number;
  height: number;
  hdrMeta: HpHdrMeta;
  corrupt: boolean;
}

export interface HpDecodeSize {
  w: number;
  h: number;
  original: boolean;
  capped: boolean;
}

// ==================== 基础字节工具（全部边界安全，绝不抛） ====================

/** 有限数判定（NaN / ±Infinity 一律脏值）。 */
export function hpFiniteOf(v: number): boolean {
  return v === v && v !== Infinity && v !== -Infinity;
}

/** 大端 32 位无符号读；越界返回 0。 */
export function hpU32Of(b: Uint8Array, off: number): number {
  if (off < 0 || off + 4 > b.length) {
    return 0;
  }
  return (b[off] * 0x1000000) + (b[off + 1] * 0x10000) +
    (b[off + 2] * 0x100) + b[off + 3];
}

/** 大端 16 位无符号读；越界返回 0。 */
export function hpU16Of(b: Uint8Array, off: number): number {
  if (off < 0 || off + 2 > b.length) {
    return 0;
  }
  return (b[off] * 0x100) + b[off + 1];
}

/** 固定长度 ASCII 读；越界返回已读到的部分。 */
export function hpAsciiOf(b: Uint8Array, off: number, len: number): string {
  let s: string = '';
  for (let i = 0; i < len; i++) {
    if (off + i < 0 || off + i >= b.length) {
      break;
    }
    s += String.fromCharCode(b[off + i]);
  }
  return s;
}

/** 读一个 box 头。size=1 走 64 位 largesize，size=0 表示到容器末尾。 */
export function hpBoxAt(b: Uint8Array, off: number, end: number): HpBox | undefined {
  const lim: number = Math.min(end, b.length);
  if (off < 0 || off + HP_BOX_HEADER > lim) {
    return undefined;
  }
  let size: number = hpU32Of(b, off);
  const type: string = hpAsciiOf(b, off + 4, 4);
  let header: number = HP_BOX_HEADER;
  if (size === 1) {
    if (off + 16 > lim) {
      return undefined;
    }
    size = hpU32Of(b, off + 8);
    header = 16;
  } else if (size === 0) {
    size = lim - off;
  }
  if (size < header || off + size > lim) {
    return undefined;
  }
  return {
    type: type, off: off, size: size,
    payloadOff: off + header, payloadLen: size - header
  };
}

/** 需要递归进入的容器 box（其余为叶子，只读其类型）。 */
export function hpContainerOf(type: string): boolean {
  return type === 'meta' || type === 'iprp' || type === 'ipco' ||
    type === 'moov' || type === 'trak' || type === 'mdia' || type === 'minf' ||
    type === 'stbl' || type === 'edts' || type === 'dinf' || type === 'udta' ||
    type === 'ipro' || type === 'iref';
}

/** FullBox 头长度：meta / iref / ipro 有 4 字节 version+flags，其余为 0。 */
export function hpFullBoxBytesOf(type: string): number {
  return (type === 'meta' || type === 'iref' || type === 'ipro') ? 4 : 0;
}

/** 递归收集 box 树；畸形处立即停止（损坏由 hpCorruptOf 判定）。 */
export function hpWalkOf(b: Uint8Array, start: number, end: number,
  depth: number, out: HpBox[]): void {
  if (depth > HP_MAX_DEPTH || out.length >= HP_MAX_BOXES) {
    return;
  }
  let off: number = start;
  while (off + HP_BOX_HEADER <= end && out.length < HP_MAX_BOXES) {
    const box: HpBox | undefined = hpBoxAt(b, off, end);
    if (box === undefined) {
      return;
    }
    out.push(box);
    if (hpContainerOf(box.type)) {
      const skip: number = hpFullBoxBytesOf(box.type);
      hpWalkOf(b, box.payloadOff + skip, box.off + box.size, depth + 1, out);
    }
    const next: number = box.off + box.size;
    if (next <= off) {
      return;
    }
    off = next;
  }
}

// ==================== 容器探测 / 损坏判定 ====================

/** 顶层 box 能否完整走完、ftyp 是否在首位：任一不满足即损坏。 */
export function hpCorruptOf(b: Uint8Array): boolean {
  if (b.length < HP_MIN_BYTES) {
    return true;
  }
  const first: HpBox | undefined = hpBoxAt(b, 0, b.length);
  if (first === undefined || first.type !== 'ftyp') {
    return true;
  }
  let off: number = 0;
  let count: number = 0;
  while (off < b.length && count < HP_MAX_BOXES) {
    const box: HpBox | undefined = hpBoxAt(b, off, b.length);
    if (box === undefined || box.size <= 0) {
      return true;
    }
    off = box.off + box.size;
    count++;
  }
  return off !== b.length;
}

/** ftyp 的 major_brand（4 字节 ASCII）。 */
export function hpFtypBrandOf(b: Uint8Array): string {
  const first: HpBox | undefined = hpBoxAt(b, 0, b.length);
  if (first === undefined || first.type !== 'ftyp' || first.payloadLen < 4) {
    return '';
  }
  return hpAsciiOf(b, first.payloadOff, 4);
}

/** ftyp 的 compatible_brands 列表（跳过 major_brand + minor_version）。 */
export function hpCompatibleOf(b: Uint8Array): string[] {
  const out: string[] = [];
  const first: HpBox | undefined = hpBoxAt(b, 0, b.length);
  if (first === undefined || first.type !== 'ftyp') {
    return out;
  }
  let off: number = first.payloadOff + 8;
  const end: number = first.payloadOff + first.payloadLen;
  while (off + 4 <= end && out.length < 64) {
    out.push(hpAsciiOf(b, off, 4));
    off += 4;
  }
  return out;
}

/** 扩展名口径（无字节数据时用，或用于区分 heic / heif）。 */
export function hpFormatByNameOf(uri: string): number {
  const lower: string = uri.toLowerCase();
  if (lower.endsWith('.heic') || lower.endsWith('.heics')) {
    return HP_FMT_HEIC;
  }
  if (lower.endsWith('.heif') || lower.endsWith('.hif')) {
    return HP_FMT_HEIF;
  }
  return HP_FMT_OTHER;
}

/** brand / compatible_brands 是否属于 HEIC·HEIF 家族。 */
export function hpHeicBrandOf(brand: string, compat: string[]): boolean {
  const families: string[] = [HP_BRAND_HEIC, HP_BRAND_HEIX, HP_BRAND_HEVC,
    HP_BRAND_HEVX, HP_BRAND_MIF1, HP_BRAND_MSF1, 'heim', 'heis', 'hevm', 'hevs'];
  if (families.indexOf(brand) >= 0) {
    return true;
  }
  for (let i = 0; i < compat.length; i++) {
    if (families.indexOf(compat[i]) >= 0) {
      return true;
    }
  }
  return false;
}

/** 格式判定：**先按扩展名分流**，HEIC·HEIF 才做容器判定，其余格式（JPG / PNG /
 *  FITS·XISF / 文本）一律 HP_FMT_OTHER —— 绝不把别的格式字节当 ISOBMFF 误报损坏。
 *  同时支持「纯数据输入」：无 .heic 扩展名但字节确实是 HEIC·HEIF 家族时仍按容器判。 */
export function hpFormatOf(uri: string, b: Uint8Array): number {
  const byName: number = hpFormatByNameOf(uri);
  if (b.length === 0) {
    return byName;
  }
  const first: HpBox | undefined = hpBoxAt(b, 0, b.length);
  const brand: string = hpFtypBrandOf(b);
  const compat: string[] = hpCompatibleOf(b);
  const looksHeif: boolean = first !== undefined && first.type === 'ftyp' &&
    hpHeicBrandOf(brand, compat);
  if (byName === HP_FMT_OTHER && !looksHeif) {
    return HP_FMT_OTHER;
  }
  if (hpCorruptOf(b)) {
    return HP_FMT_CORRUPT;
  }
  if (!looksHeif) {
    return HP_FMT_INCOMPATIBLE;
  }
  const boxes: HpBox[] = [];
  hpWalkOf(b, 0, b.length, 0, boxes);
  let hasMeta: boolean = false;
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].type === 'meta') {
      hasMeta = true;
    }
  }
  if (!hasMeta) {
    return HP_FMT_CORRUPT;
  }
  return byName === HP_FMT_OTHER ? HP_FMT_HEIC : byName;
}

// ==================== HDR 元数据 / 原始尺寸 ====================

/** nclx colr：原色 / 传递特性 / 矩阵系数。非 nclx 一律 0。 */
export function hpColrOf(b: Uint8Array, box: HpBox): number[] {
  if (box.payloadLen < 11 || hpAsciiOf(b, box.payloadOff, 4) !== 'nclx') {
    return [0, 0, 0];
  }
  return [hpU16Of(b, box.payloadOff + 4), hpU16Of(b, box.payloadOff + 6),
    hpU16Of(b, box.payloadOff + 8)];
}

/** ispe：条目的原始宽高（FullBox 4 字节 + w + h）。 */
export function hpIspeOf(b: Uint8Array, boxes: HpBox[]): HpSize {
  for (let i = 0; i < boxes.length; i++) {
    const box: HpBox = boxes[i];
    if (box.type === 'ispe' && box.payloadLen >= 12) {
      return { w: hpU32Of(b, box.payloadOff + 4), h: hpU32Of(b, box.payloadOff + 8) };
    }
  }
  return { w: 0, h: 0 };
}

/** auxC 的 URN 串里是否含 gain map / HDR 辅助图线索。 */
export function hpGainMapUrnOf(b: Uint8Array, box: HpBox): boolean {
  const s: string = hpAsciiOf(b, box.payloadOff, box.payloadLen);
  return s.indexOf('urn:') >= 0 &&
    (s.indexOf('hdr') >= 0 || s.indexOf('gain') >= 0 || s.indexOf('mpeg') >= 0);
}

/** 汇总 HDR 元数据：PQ/HLG + BT.2020 是权威判据，HDR10 / gain map / 10bit 为佐证。 */
export function hpHdrMetaOf(b: Uint8Array, boxes: HpBox[],
  brand: string, compat: string[]): HpHdrMeta {
  let primaries: number = 0;
  let transfer: number = 0;
  let matrix: number = 0;
  let colrSeen: boolean = false;
  let hdr10: boolean = false;
  let gainMap: boolean = false;
  let tenBit: boolean = false;
  if (brand === HP_BRAND_HEIX || brand === HP_BRAND_HEVX ||
      compat.indexOf(HP_BRAND_HEIX) >= 0 || compat.indexOf(HP_BRAND_HEVX) >= 0) {
    tenBit = true;
  }
  for (let i = 0; i < boxes.length; i++) {
    const box: HpBox = boxes[i];
    if (box.type === 'colr') {
      const nclx: number[] = hpColrOf(b, box);
      primaries = nclx[0];
      transfer = nclx[1];
      matrix = nclx[2];
      colrSeen = true;
    } else if (box.type === 'clli' || box.type === 'mdcv') {
      hdr10 = true;
    } else if (box.type === 'auxC' && hpGainMapUrnOf(b, box)) {
      gainMap = true;
    }
  }
  const pqOrHlg: boolean = primaries === HP_PRIMARIES_BT2020 &&
    (transfer === HP_TRANSFER_PQ || transfer === HP_TRANSFER_HLG);
  const present: boolean = pqOrHlg || hdr10 || gainMap || tenBit;
  return {
    present: present, primaries: primaries, transfer: transfer, matrix: matrix,
    colrSeen: colrSeen, hdr10: hdr10, gainMap: gainMap, tenBit: tenBit
  };
}

/** 一次完整探测：格式 / brand / 原始尺寸 / HDR 元数据 / 损坏标记。 */
export function hpProbeOf(uri: string, b: Uint8Array): HpProbe {
  const format: number = hpFormatOf(uri, b);
  const brand: string = b.length > 0 ? hpFtypBrandOf(b) : '';
  const compat: string[] = b.length > 0 ? hpCompatibleOf(b) : [];
  const boxes: HpBox[] = [];
  if (b.length > 0 && format !== HP_FMT_CORRUPT && format !== HP_FMT_OTHER) {
    hpWalkOf(b, 0, b.length, 0, boxes);
  }
  const size: HpSize = hpIspeOf(b, boxes);
  return {
    format: format, brand: brand, width: size.w, height: size.h,
    hdrMeta: hpHdrMetaOf(b, boxes, brand, compat),
    corrupt: format === HP_FMT_CORRUPT
  };
}

// ==================== 动态范围策略 / 产物校验 ====================

/** 显式解码档：源为 HDR 或容器带 HDR 元数据 → 请求 HDR 档，杜绝 AUTO 静默降 SDR。
 *  损坏 / 不兼容时回退 AUTO（由上层给明确提示，不冒险强解）。 */
export function hpRequestOf(isHdrSource: boolean, format: number,
  metaPresent: boolean): number {
  if (format === HP_FMT_CORRUPT || format === HP_FMT_INCOMPATIBLE) {
    return HP_RANGE_AUTO;
  }
  if (isHdrSource === true || metaPresent === true) {
    return HP_RANGE_HDR;
  }
  return HP_RANGE_AUTO;
}

/** 用**解码产物** isHdr 反查：请求 HDR 却得到 SDR ⇒ 动态范围被压缩。 */
export function hpOutcomeOf(request: number, isHdrSource: boolean,
  isHdrDecoded: boolean): number {
  if (request === HP_RANGE_HDR) {
    if (isHdrDecoded === true) {
      return HP_OK_HDR;
    }
    if (isHdrSource === true) {
      return HP_HDR_DOWNGRADED;
    }
    return HP_NO_HDR_META;
  }
  if (isHdrDecoded === true) {
    return HP_OK_HDR;
  }
  return HP_OK_SDR;
}

/** 是否发生了动态范围压缩（源 HDR / 产物 SDR）。 */
export function hpDowngradedOf(isHdrSource: boolean, isHdrDecoded: boolean): boolean {
  return isHdrSource === true && isHdrDecoded === false;
}

/** 显示模式：真 HDR 产物开 HIGH；设备不支持时用 CONSTRAINT 保住部分高光而非直接 STANDARD。 */
export function hpDisplayModeOf(isHdrDecoded: boolean, displayCapable: boolean): number {
  if (isHdrDecoded !== true) {
    return HP_MODE_STANDARD;
  }
  return displayCapable === true ? HP_MODE_HIGH : HP_MODE_CONSTRAINT;
}

// ==================== 尺寸 / 方向 / 色彩 / 亮度保真 ====================

/** 是否在安全护栏内允许按原始尺寸解码（脏值 / 超限一律拒绝）。 */
export function hpOriginalSizeAllowedOf(w: number, h: number,
  maxPixels: number, maxEdge: number): boolean {
  if (!hpFiniteOf(w) || !hpFiniteOf(h) || w <= 0 || h <= 0) {
    return false;
  }
  const capPixels: number = hpFiniteOf(maxPixels) && maxPixels > 0
    ? maxPixels : HP_MAX_ORIGINAL_PIXELS;
  const capEdge: number = hpFiniteOf(maxEdge) && maxEdge > 0
    ? maxEdge : HP_MAX_ORIGINAL_EDGE;
  return w <= capEdge && h <= capEdge && (w * h) <= capPixels;
}

/** 与既有 decodePx 完全同口径的等比档位缩放（非 HDR / 超限时逐字不变）。 */
export function hpScaledOf(w: number, h: number, edge: number): HpSize {
  if (w <= 0 || h <= 0 || !hpFiniteOf(edge) || edge <= 0) {
    return { w: 1, h: 1 };
  }
  if (w > edge || h > edge) {
    const k: number = Math.max(w, h) / edge;
    return { w: Math.max(1, Math.floor(w / k)), h: Math.max(1, Math.floor(h / k)) };
  }
  return { w: w, h: h };
}

/** HDR HEIC 在护栏内按原始尺寸解码；其余一律沿用既有档位，零回归。 */
export function hpDecodeSizeOf(srcW: number, srcH: number, edge: number,
  isHdr: boolean, format: number): HpDecodeSize {
  const heic: boolean = format === HP_FMT_HEIC || format === HP_FMT_HEIF;
  const scaled: HpSize = hpScaledOf(srcW, srcH, edge);
  if (isHdr === true && heic) {
    if (hpOriginalSizeAllowedOf(srcW, srcH,
      HP_MAX_ORIGINAL_PIXELS, HP_MAX_ORIGINAL_EDGE)) {
      return { w: srcW, h: srcH, original: true, capped: false };
    }
    return {
      w: scaled.w, h: scaled.h, original: false,
      capped: (scaled.w !== srcW || scaled.h !== srcH)
    };
  }
  return {
    w: scaled.w, h: scaled.h,
    original: (scaled.w === srcW && scaled.h === srcH), capped: false
  };
}

/** 等比性护栏：解码尺寸不得改变宽高比（方向由 EXIF 单独处理，不算失真）。 */
export function hpAspectPreservedOf(sw: number, sh: number,
  dw: number, dh: number): boolean {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) {
    return false;
  }
  return Math.abs((sw / sh) - (dw / dh)) <= 0.02;
}

/** 色彩空间保真：HDR 图必须保留源空间（mode 0），不得强制转 sRGB / P3。 */
export function hpColorSpacePreservedOf(mode: number, isHdr: boolean): boolean {
  if (mode !== HP_COLORSPACE_PRESERVE) {
    return false;
  }
  return isHdr === true || isHdr === false;
}

/** 位深保真：10bit 内容落到 8bit RGBA_8888 必丢高光，明确拒绝。 */
export function hpPixelFormatSafeOf(fmt: number, bitDepth: number): boolean {
  if (fmt < 0) {
    return true; // 未指定 desiredPixelFormat：由系统 codec 自选，最安全
  }
  if (fmt === HP_FMT_RGBA_8888 && bitDepth >= 10) {
    return false;
  }
  return true;
}

/** 亮度保真：不做 tone mapping（HIGH 动态范围由系统合成器按元数据呈现）。 */
export function hpNoToneMapOf(mode: number, toneMapped: boolean): boolean {
  return mode === HP_MODE_HIGH && toneMapped === false;
}

/** 量化级数：2^bits，一维数值模型（10bit = 1024 级 vs 8bit = 256 级）。 */
export function hpQuantLevelsOf(bits: number): number {
  if (!hpFiniteOf(bits) || bits <= 0 || bits > 32) {
    return 0;
  }
  return Math.pow(2, Math.floor(bits));
}

/** 动态范围比：10bit 相对 8bit 的可表达级数倍率（4×），用于回归护栏。 */
export function hpRangeRatioOf(hdrBits: number, sdrBits: number): number {
  const hi: number = hpQuantLevelsOf(hdrBits);
  const lo: number = hpQuantLevelsOf(sdrBits);
  if (hi <= 0 || lo <= 0) {
    return 0;
  }
  return hi / lo;
}

// ==================== 异常分类 / 明确提示 ====================

/** 把「容器判定 + 解码是否抛错 + 是否读到字节」归一到唯一原因码。 */
export function hpFailCodeOf(format: number, decodeFailed: boolean,
  bytesReadable: boolean): number {
  if (!bytesReadable) {
    return HP_DECODE_FAILED;
  }
  if (format === HP_FMT_CORRUPT) {
    return HP_FILE_CORRUPT;
  }
  if (format === HP_FMT_INCOMPATIBLE) {
    return HP_CAUSE_FORMAT;
  }
  if (decodeFailed) {
    return HP_DECODE_FAILED;
  }
  return HP_OK_SDR;
}

/** 提示级别：0=无 / 1=信息 / 2=警告 / 3=错误。 */
export function hpSeverityOf(code: number): number {
  if (code === HP_OK_HDR || code === HP_OK_SDR) {
    return 0;
  }
  if (code === HP_SIZE_CAPPED || code === HP_HDR_UNVERIFIED) {
    return 1;
  }
  if (code === HP_NO_HDR_META || code === HP_DISPLAY_NO_HDR ||
      code === HP_HDR_DOWNGRADED) {
    return 2;
  }
  return 3;
}

/** 需要在界面上显示明确提示（正常态不打扰）。 */
export function hpShowHintOf(code: number): boolean {
  return hpSeverityOf(code) > 0;
}

/** 原因码 → 中文明确提示；原图尺寸 capped 时附上真实原始尺寸。 */
export function hpHintOf(code: number, w: number, h: number): string {
  if (code === HP_NO_HDR_META) {
    return HP_HINT_NO_HDR;
  }
  if (code === HP_CAUSE_FORMAT) {
    return HP_HINT_FORMAT;
  }
  if (code === HP_FILE_CORRUPT) {
    return HP_HINT_CORRUPT;
  }
  if (code === HP_HDR_DOWNGRADED) {
    return HP_HINT_DOWNGRADED;
  }
  if (code === HP_DISPLAY_NO_HDR) {
    return HP_HINT_DISPLAY;
  }
  if (code === HP_DECODE_FAILED) {
    return HP_HINT_FAILED;
  }
  if (code === HP_SIZE_CAPPED) {
    return HP_HINT_CAPPED + w + ' × ' + h + '）';
  }
  if (code === HP_HDR_UNVERIFIED) {
    return HP_HINT_UNVERIFIED;
  }
  return '';
}
