/**
 * common/AstroImage.ts —— 第六十五轮：FITS / XISF 天文图像预览的**纯函数真值源**。
 *
 * 设计约束（与 TextDoc.ts / DirCount.ts / ResizeQuality.ts 同一口径）：
 *  · 零 SDK 依赖、零文件 IO、零 await、零 throw、零全局可变状态；
 *  · 输入只有 string / number / Uint8Array / boolean，输出可预测，可直接被
 *    tests/dirname.test.mjs 用 `node --experimental-strip-types` 加载回归；
 *  · 全部字节解析用整数运算手写（不用 DataView / TextDecoder / DOM），避免
 *    ArkTS 与 Node 的运行时差异；IEEE754 float32/64 也是纯位分解，Node 可验证；
 *  · 系统 codec 不认 FITS / XISF，本文件负责「格式识别 → 头解析决策 → 样本解码
 *    → min-max 拉伸 → RGBA 组装」的全部决策与数值，真正的读文件 / zlib 解压 /
 *    createPixelMap 在 model/Preview.ets（唯一碰 SDK 的地方）。
 *
 * 格式口径（按公开规范 + 实测实现，不臆造）：
 *  · FITS：2880 字节块头，每块 36 张 80 字节 ASCII 卡片；SIMPLE=T 主 HDU；
 *    BITPIX 8/16/32/-32/-64；NAXIS 2 灰度 / 3 且第三维 3 为 RGB 平面；
 *    数据**大端**，物理值 = BZERO + BSCALE * raw；数据在 END 卡片后补齐到 2880 边界。
 *  · XISF 1.0：单文件签名 `XISF0100`(8B) + headerLength(u32 LE) + reserved(4B) +
 *    XML 头；<Image geometry="W:H:C" sampleFormat="…" colorSpace="…"
 *    pixelStorage="…" location="attachment:pos:size" compression="…"/>；
 *    数据**小端**（byteOrder="big" 才大端）；attachment position 从文件开头算。
 *  · 压缩：仅支持无压缩与 zlib（含 +sh 字节重排）；lz4 / lz4hc / zstd / inline
 *    base64 / 扩展 HDU / Complex 样本一律给明确失败码，绝不静默白屏。
 */

// --------------------------------------------------------------------
// 一、格式 / 状态 / 布局常量
// --------------------------------------------------------------------

/** 非天文图像（走系统 codec）。 */
export const AI_FMT_NONE: number = 0;
export const AI_FMT_FITS: number = 1;
export const AI_FMT_XISF: number = 2;

/** 后缀白名单（小写，带点）。Index.ets 的 IMAGE_SUFFIXES 追加这四项即可获得
 *  左栏列出 / 进翻页序列 / hover 缩略图 / 文件选择器 / R64 计数的全部既有行为。 */
export const AI_FITS_SUFFIXES: Array<string> = ['.fits', '.fit', '.fts'];
export const AI_XISF_SUFFIXES: Array<string> = ['.xisf'];

/** 解析结果状态码。AI_OK 之外都是失败码，由 aiFailHintOf 给出中文原因。 */
export const AI_OK: number = 0;
export const AI_FAIL_TOO_SHORT: number = 1;   // 文件太短，连签名 / 一张卡片都不够
export const AI_FAIL_BAD_MAGIC: number = 2;   // FITS 缺 SIMPLE=T / XISF 签名不对
export const AI_FAIL_NO_END: number = 3;      // FITS 头找不到 END 卡片
export const AI_FAIL_BAD_BITPIX: number = 4;  // BITPIX 不支持 / 缺失
export const AI_FAIL_BAD_NAXIS: number = 5;   // NAXIS / 维度非法
export const AI_FAIL_DATA_SHORT: number = 6;  // 像素数据不足 w*h*c*bps
export const AI_FAIL_UNSUPPORTED: number = 7; // 扩展 HDU / Complex / inline / lz4 等
export const AI_FAIL_NO_IMAGE: number = 8;    // XISF XML 里没有 <Image>
export const AI_FAIL_BAD_GEOMETRY: number = 9;// geometry / sampleFormat 非法
export const AI_FAIL_TOO_LARGE: number = 10;  // 超过像素 / 边长硬上限（防 OOM）

/** 样本格式码。 */
export const AI_SAMPLE_U8: number = 0;
export const AI_SAMPLE_I16: number = 1;
export const AI_SAMPLE_I32: number = 2;
export const AI_SAMPLE_U16: number = 3;
export const AI_SAMPLE_U32: number = 4;
export const AI_SAMPLE_F32: number = 5;
export const AI_SAMPLE_F64: number = 6;
export const AI_SAMPLE_I8: number = 7;
export const AI_SAMPLE_UNKNOWN: number = -1;

/** 字节序。 */
export const AI_LE: number = 0;
export const AI_BE: number = 1;

/** 通道在数据流里的排布：planar（通道平面分离，CCC…）/ normal（像素交错，RGBRGB…）。
 *  FITS 3D 恒为 planar（每个 NAXIS3 一整幅）；XISF 由 pixelStorage 决定，默认 normal。 */
export const AI_LAYOUT_PLANAR: number = 0;
export const AI_LAYOUT_NORMAL: number = 1;

/** 压缩方式。 */
export const AI_COMP_NONE: number = 0;
export const AI_COMP_ZLIB: number = 1;
export const AI_COMP_UNSUPPORTED: number = 2;

/** FITS 头结构常量。 */
export const AI_FITS_CARD: number = 80;
export const AI_FITS_BLOCK: number = 2880;
export const AI_FITS_MAX_CARDS: number = 720;   // 最多 20 个头块，覆盖超长头
export const AI_XISF_SIGNATURE: string = 'XISF0100';
export const AI_XISF_PREAMBLE: number = 16;     // 8 签名 + 4 头长 + 4 保留
export const AI_XISF_MAX_HEADER: number = 4 * 1024 * 1024; // XML 头最大 4MB

/** 防 OOM 硬上限：源图像素总数 / 目标 RGBA 边长。天文图动辄 8K×8K，
 *  这里只限制「生成的目标 bitmap」，读字节仍由 RawStore 的 64MB 上限把关。 */
export const AI_MAX_SOURCE_PIXELS: number = 256 * 1024 * 1024; // 2.56 亿像素
export const AI_MAX_TARGET_EDGE: number = 8192;

/** 灰度拉伸：天文线性数据动态范围极大，直接除以满量程几乎全黑。
 *  gamma < 1 提亮暗部；用 min-max 归一化后再 pow。默认 0.5（sqrt 型）。 */
export const AI_STRETCH_GAMMA: number = 0.5;
/** bounds 采样步长上限：最多采样这么多个像素估 lo/hi，避免 O(n) 全扫两遍。 */
export const AI_BOUNDS_SAMPLES: number = 65536;

/** createPixelMap 通道顺序开关。华为官方 drawing guide（2024）示例是
 *  `RGBA_8888` + 内存 R,G,B,A；但开发者论坛有个别机型报「按 BGRA 处理」。
 *  默认 0 = 按 R,G,B,A 填充（与官方 guide 一致）；真机若 R/B 互换，把本常量
 *  改为 1 即按 B,G,R,A 填充。属真机验证项，见 R65 真机步骤。 */
export const AI_OUTPUT_BGRA: number = 0;

// --------------------------------------------------------------------
// 二、解析结果结构（全部字段显式，ArkTS 对象字面量必须写全）
// --------------------------------------------------------------------

/** 头解析 + 解码决策。pixels 段由调用方按 dataOffset/dataLength 从文件字节里
 *  切出（若为压缩则先解压 + 反 shuffle），再喂给 aiRgbaOf。 */
export interface AstroHeader {
  ok: number;              // AI_OK 或失败码
  fmt: number;             // AI_FMT_FITS / AI_FMT_XISF
  width: number;
  height: number;
  channels: number;        // 1 灰 / 3 RGB
  sample: number;          // AI_SAMPLE_*
  bytesPerSample: number;
  endian: number;          // AI_LE / AI_BE
  layout: number;          // AI_LAYOUT_*
  bzero: number;
  bscale: number;
  compressed: number;      // AI_COMP_*
  uncompressedSize: number;// 解压后字节数（无压缩时 = dataLength）
  shuffleItemSize: number; // +sh 的 item 字节数，0 表示不 shuffle
  dataOffset: number;      // 像素数据在原文件字节里的起始偏移（attachment position）
  dataLength: number;      // 像素数据（压缩后）字节数
  flipY: number;           // 1 = FITS 上下翻转（默认 0，见 aiFlipYOf）
}

/** min-max 统计结果。 */
export interface AstroBounds {
  lo: number;
  hi: number;
}

/** 目标显示尺寸。 */
export interface AstroSize {
  w: number;
  h: number;
}

/** 生成一个「全失败」的 header，字段全部填齐，避免调用方读到未定义。 */
export function aiFailHeader(fmt: number, code: number): AstroHeader {
  const h: AstroHeader = {
    ok: code, fmt: fmt, width: 0, height: 0, channels: 1,
    sample: AI_SAMPLE_UNKNOWN, bytesPerSample: 0, endian: AI_BE,
    layout: AI_LAYOUT_PLANAR, bzero: 0, bscale: 1,
    compressed: AI_COMP_NONE, uncompressedSize: 0, shuffleItemSize: 0,
    dataOffset: 0, dataLength: 0, flipY: 0
  };
  return h;
}

// --------------------------------------------------------------------
// 三、格式识别
// --------------------------------------------------------------------

/** 取小写后缀（无后缀返回空串）。 */
export function aiSuffixOf(name: string): string {
  const dot: number = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) {
    return '';
  }
  return name.substring(dot).toLowerCase();
}

function aiInList(ext: string, list: Array<string>): boolean {
  for (let i = 0; i < list.length; i++) {
    if (ext === list[i]) {
      return true;
    }
  }
  return false;
}

/** 后缀 → 格式码。 */
export function aiFormatOf(name: string): number {
  const ext: string = aiSuffixOf(name);
  if (aiInList(ext, AI_FITS_SUFFIXES)) {
    return AI_FMT_FITS;
  }
  if (aiInList(ext, AI_XISF_SUFFIXES)) {
    return AI_FMT_XISF;
  }
  return AI_FMT_NONE;
}

export function aiIsAstroName(name: string): boolean {
  return aiFormatOf(name) !== AI_FMT_NONE;
}

/** 失败码 → 中文原因（hilog / 状态栏可见，避免静默白屏）。 */
export function aiFailHintOf(code: number, name: string): string {
  if (code === AI_OK) {
    return '';
  }
  let why: string = '无法解析';
  if (code === AI_FAIL_TOO_SHORT) { why = '文件太短'; }
  else if (code === AI_FAIL_BAD_MAGIC) { why = '不是有效的 FITS/XISF 头'; }
  else if (code === AI_FAIL_NO_END) { why = 'FITS 头缺少 END'; }
  else if (code === AI_FAIL_BAD_BITPIX) { why = '不支持的 BITPIX'; }
  else if (code === AI_FAIL_BAD_NAXIS) { why = '不支持的图像维度'; }
  else if (code === AI_FAIL_DATA_SHORT) { why = '像素数据不完整'; }
  else if (code === AI_FAIL_UNSUPPORTED) { why = '暂不支持的压缩/编码'; }
  else if (code === AI_FAIL_NO_IMAGE) { why = 'XISF 里没有图像'; }
  else if (code === AI_FAIL_BAD_GEOMETRY) { why = '几何/样本格式非法'; }
  else if (code === AI_FAIL_TOO_LARGE) { why = '图像过大'; }
  return '天文图像预览失败：' + why + ' · ' + name;
}

// --------------------------------------------------------------------
// 四、通用字节读取 / IEEE754 解码（纯整数运算，Node 与 ArkTS 等价）
// --------------------------------------------------------------------

/** 读一个无符号 16 位整数（按 endian），越界返回 0。 */
export function aiU16At(b: Uint8Array, off: number, endian: number): number {
  if (off < 0 || off + 2 > b.length) {
    return 0;
  }
  if (endian === AI_BE) {
    return b[off] * 256 + b[off + 1];
  }
  return b[off + 1] * 256 + b[off];
}

/** 读一个无符号 32 位整数（按 endian），用乘法不用位移避免符号问题。 */
export function aiU32At(b: Uint8Array, off: number, endian: number): number {
  if (off < 0 || off + 4 > b.length) {
    return 0;
  }
  if (endian === AI_BE) {
    return b[off] * 16777216 + b[off + 1] * 65536 + b[off + 2] * 256 + b[off + 3];
  }
  return b[off + 3] * 16777216 + b[off + 2] * 65536 + b[off + 1] * 256 + b[off];
}

/** 有符号 32 位（补码）。 */
export function aiI32At(b: Uint8Array, off: number, endian: number): number {
  const u: number = aiU32At(b, off, endian);
  return u >= 2147483648 ? u - 4294967296 : u;
}

/** 有符号 16 位（补码）。 */
export function aiI16At(b: Uint8Array, off: number, endian: number): number {
  const u: number = aiU16At(b, off, endian);
  return u >= 32768 ? u - 65536 : u;
}

/** 由 32 位无符号位模式解 IEEE754 float32。纯位分解，不用 DataView。 */
export function aiF32FromBits(bits: number): number {
  const neg: boolean = bits >= 2147483648;
  let u: number = neg ? bits - 2147483648 : bits;
  const exp: number = Math.floor(u / 8388608);      // 2^23
  const frac: number = u - exp * 8388608;
  if (exp === 255) {
    return frac === 0 ? (neg ? -3.4e38 : 3.4e38) : 0; // Inf 用有限大数代替，NaN 归 0
  }
  let val: number;
  if (exp === 0) {
    val = frac * Math.pow(2, -149);                  // 次正规
  } else {
    val = (1 + frac / 8388608) * Math.pow(2, exp - 127);
  }
  return neg ? -val : val;
}

/** 由高/低两个 32 位无符号字解 IEEE754 float64。 */
export function aiF64FromBits(hi: number, lo: number): number {
  const neg: boolean = hi >= 2147483648;
  const hiM: number = neg ? hi - 2147483648 : hi;   // 去掉符号位后 [0, 2^31)
  const exp: number = Math.floor(hiM / 1048576);     // 2^20 → 11 位指数
  const fracHi: number = hiM - exp * 1048576;        // 20 位
  if (exp === 2047) {
    return (fracHi === 0 && lo === 0) ? (neg ? -1.7e308 : 1.7e308) : 0;
  }
  // 尾数 = fracHi * 2^32 + lo （最多 52 位，double 可精确表示）
  const mantInt: number = fracHi * 4294967296 + lo;
  let val: number;
  if (exp === 0) {
    val = mantInt * Math.pow(2, -1074);
  } else {
    val = (1 + mantInt / 4503599627370496) * Math.pow(2, exp - 1023);
  }
  return neg ? -val : val;
}

/** 按样本格式 + 字节序读一个原始样本值（未乘 BSCALE / 加 BZERO）。 */
export function aiSampleAt(b: Uint8Array, off: number, sample: number,
  endian: number): number {
  if (sample === AI_SAMPLE_U8) {
    return (off >= 0 && off < b.length) ? b[off] : 0;
  }
  if (sample === AI_SAMPLE_I8) {
    if (off < 0 || off >= b.length) { return 0; }
    return b[off] >= 128 ? b[off] - 256 : b[off];
  }
  if (sample === AI_SAMPLE_U16) {
    return aiU16At(b, off, endian);
  }
  if (sample === AI_SAMPLE_I16) {
    return aiI16At(b, off, endian);
  }
  if (sample === AI_SAMPLE_U32) {
    return aiU32At(b, off, endian);
  }
  if (sample === AI_SAMPLE_I32) {
    return aiI32At(b, off, endian);
  }
  if (sample === AI_SAMPLE_F32) {
    return aiF32FromBits(aiU32At(b, off, endian));
  }
  if (sample === AI_SAMPLE_F64) {
    // 高/低字的先后随字节序：BE 时高字在前 4 字节，LE 时高字在后 4 字节。
    let hi: number;
    let lo: number;
    if (endian === AI_BE) {
      hi = aiU32At(b, off, AI_BE);
      lo = aiU32At(b, off + 4, AI_BE);
    } else {
      lo = aiU32At(b, off, AI_LE);
      hi = aiU32At(b, off + 4, AI_LE);
    }
    return aiF64FromBits(hi, lo);
  }
  return 0;
}

/** BITPIX → 样本格式码。 */
export function aiBitpixSampleOf(bitpix: number): number {
  if (bitpix === 8) { return AI_SAMPLE_U8; }
  if (bitpix === 16) { return AI_SAMPLE_I16; }
  if (bitpix === 32) { return AI_SAMPLE_I32; }
  if (bitpix === -32) { return AI_SAMPLE_F32; }
  if (bitpix === -64) { return AI_SAMPLE_F64; }
  return AI_SAMPLE_UNKNOWN;
}

/** XISF sampleFormat 字符串 → 样本格式码。 */
export function aiXisfSampleOf(s: string): number {
  if (s === 'UInt8') { return AI_SAMPLE_U8; }
  if (s === 'Int8') { return AI_SAMPLE_I8; }
  if (s === 'UInt16') { return AI_SAMPLE_U16; }
  if (s === 'Int16') { return AI_SAMPLE_I16; }
  if (s === 'UInt32') { return AI_SAMPLE_U32; }
  if (s === 'Int32') { return AI_SAMPLE_I32; }
  if (s === 'Float32') { return AI_SAMPLE_F32; }
  if (s === 'Float64') { return AI_SAMPLE_F64; }
  return AI_SAMPLE_UNKNOWN;
}

/** 样本格式码 → 每样本字节数。 */
export function aiBytesPerSampleOf(sample: number): number {
  if (sample === AI_SAMPLE_U8 || sample === AI_SAMPLE_I8) { return 1; }
  if (sample === AI_SAMPLE_U16 || sample === AI_SAMPLE_I16) { return 2; }
  if (sample === AI_SAMPLE_U32 || sample === AI_SAMPLE_I32 ||
      sample === AI_SAMPLE_F32) { return 4; }
  if (sample === AI_SAMPLE_F64) { return 8; }
  return 0;
}

// --------------------------------------------------------------------
// 五、FITS 头解析
// --------------------------------------------------------------------

/** 从 80 字节卡片还原 ASCII 文本（非可打印字符归空格，越界补空格）。 */
export function aiCardTextOf(b: Uint8Array, cardIdx: number): string {
  const base: number = cardIdx * AI_FITS_CARD;
  const chars: Array<string> = [];
  for (let i = 0; i < AI_FITS_CARD; i++) {
    const p: number = base + i;
    const v: number = (p >= 0 && p < b.length) ? b[p] : 32;
    chars.push(v >= 32 && v < 127 ? String.fromCharCode(v) : ' ');
  }
  return chars.join('');
}

/** 卡片关键字（前 8 字符去空白，大写）。 */
export function aiCardKeyOf(card: string): string {
  let s: string = card.substring(0, 8).toUpperCase();
  // 手写 trim（避免依赖平台 trim 差异）
  let a: number = 0;
  let z: number = s.length;
  while (a < z && s.charCodeAt(a) === 32) { a++; }
  while (z > a && s.charCodeAt(z - 1) === 32) { z--; }
  return s.substring(a, z);
}

/** 卡片值：`=` 之后、`/` 注释之前，去首尾空白。无 `=` 返回空串。 */
export function aiCardValOf(card: string): string {
  if (card.length < 10 || card.charAt(8) !== '=') {
    return '';
  }
  let v: string = card.substring(9);
  const slash: number = v.indexOf('/');
  if (slash >= 0) {
    v = v.substring(0, slash);
  }
  let a: number = 0;
  let z: number = v.length;
  while (a < z && v.charCodeAt(a) === 32) { a++; }
  while (z > a && v.charCodeAt(z - 1) === 32) { z--; }
  return v.substring(a, z);
}

/** 值串里取第一个 token（去掉引号 / T/F 之外的尾巴）。 */
function aiTokenOf(v: string): string {
  if (v.length === 0) { return ''; }
  if (v.charAt(0) === '\'') {
    const end: number = v.indexOf('\'', 1);
    return end > 0 ? v.substring(1, end) : v.substring(1);
  }
  let z: number = 0;
  while (z < v.length && v.charCodeAt(z) !== 32) { z++; }
  return v.substring(0, z);
}

/** 解析十进制整数 / 浮点（支持指数），非法返回 def。纯手写，不靠 Number 的平台差异。 */
export function aiNumOf(v: string, def: number, integer: boolean): number {
  // 独立调用也容忍前导空白（FITS 卡片值常带对齐空格；aiCardValOf 已 trim 但纯函数应自容错）
  let a: number = 0;
  while (a < v.length && v.charCodeAt(a) === 32) { a++; }
  const t: string = aiTokenOf(v.substring(a));
  if (t.length === 0) { return def; }
  // 只允许 [+-]?digits[.digits][eE[+-]?digits]
  let i: number = 0;
  let sign: number = 1;
  if (t.charAt(0) === '+') { i = 1; }
  else if (t.charAt(0) === '-') { sign = -1; i = 1; }
  let intPart: number = 0;
  let any: boolean = false;
  while (i < t.length) {
    const c: number = t.charCodeAt(i);
    if (c < 48 || c > 57) { break; }
    intPart = intPart * 10 + (c - 48);
    any = true;
    i++;
  }
  if (!any) { return def; }
  let fracPart: number = 0;
  let fracScale: number = 1;
  if (!integer && i < t.length && t.charAt(i) === '.') {
    i++;
    while (i < t.length) {
      const c: number = t.charCodeAt(i);
      if (c < 48 || c > 57) { break; }
      fracPart = fracPart * 10 + (c - 48);
      fracScale *= 10;
      i++;
    }
  }
  let val: number = sign * (intPart + fracPart / fracScale);
  if (i < t.length && (t.charAt(i) === 'e' || t.charAt(i) === 'E')) {
    const expStr: string = t.substring(i + 1);
    const exp: number = aiNumOf(expStr, 0, true);
    val = val * Math.pow(10, exp);
  }
  return val;
}

/** 主 HDU 头解析。bytes = 整个文件字节（RawStore.ensure 的完整 ArrayBuffer）。 */
export function aiFitsPlanOf(b: Uint8Array): AstroHeader {
  if (b.length < AI_FITS_BLOCK) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_TOO_SHORT);
  }
  const first: string = aiCardTextOf(b, 0);
  if (aiCardKeyOf(first) !== 'SIMPLE' || aiCardValOf(first).charAt(0) !== 'T') {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_BAD_MAGIC);
  }
  let bitpix: number = 0;
  let bitpixSeen: boolean = false;
  let naxis: number = 0;
  let naxisSeen: boolean = false;
  const dims: Array<number> = [0, 0, 0, 0];
  let bzero: number = 0;
  let bscale: number = 1;
  let endCard: number = -1;
  const maxCards: number = Math.floor(b.length / AI_FITS_CARD);
  const scan: number = maxCards < AI_FITS_MAX_CARDS ? maxCards : AI_FITS_MAX_CARDS;
  for (let i = 0; i < scan; i++) {
    const card: string = aiCardTextOf(b, i);
    const key: string = aiCardKeyOf(card);
    if (key === 'END') { endCard = i; break; }
    const val: string = aiCardValOf(card);
    if (key === 'BITPIX') { bitpix = aiNumOf(val, 0, true); bitpixSeen = true; }
    else if (key === 'NAXIS') { naxis = aiNumOf(val, 0, true); naxisSeen = true; }
    else if (key === 'NAXIS1') { dims[0] = aiNumOf(val, 0, true); }
    else if (key === 'NAXIS2') { dims[1] = aiNumOf(val, 0, true); }
    else if (key === 'NAXIS3') { dims[2] = aiNumOf(val, 0, true); }
    else if (key === 'BSCALE') { bscale = aiNumOf(val, 1, false); }
    else if (key === 'BZERO') { bzero = aiNumOf(val, 0, false); }
    else if (key === 'XTENSION') {
      return aiFailHeader(AI_FMT_FITS, AI_FAIL_UNSUPPORTED); // 扩展 HDU 不做
    }
  }
  if (endCard < 0) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_NO_END);
  }
  if (!bitpixSeen || !naxisSeen) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_BAD_BITPIX);
  }
  const sample: number = aiBitpixSampleOf(bitpix);
  if (sample === AI_SAMPLE_UNKNOWN) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_BAD_BITPIX);
  }
  if (naxis < 2 || naxis > 3 || dims[0] <= 0 || dims[1] <= 0) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_BAD_NAXIS);
  }
  let channels: number = 1;
  if (naxis === 3) {
    // FITS 3D：第三维 3 视作 RGB 平面，1 视作灰度，其它取第一平面
    const third: number = dims[2];
    if (third === 3) { channels = 3; }
    else if (third <= 1) { channels = 1; }
    else { channels = 1; }
  }
  const w: number = dims[0];
  const h: number = dims[1];
  const bps: number = aiBytesPerSampleOf(sample);
  const pxCount: number = w * h * channels;
  if (pxCount <= 0 || pxCount > AI_MAX_SOURCE_PIXELS) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_TOO_LARGE);
  }
  // END 卡片之后补齐到 2880 的整数倍即数据起点
  const cardsUsed: number = endCard + 1;
  const headerBytes: number = Math.ceil(cardsUsed / 36) * AI_FITS_BLOCK;
  const need: number = pxCount * bps;
  if (headerBytes + need > b.length) {
    return aiFailHeader(AI_FMT_FITS, AI_FAIL_DATA_SHORT);
  }
  const head: AstroHeader = {
    ok: AI_OK, fmt: AI_FMT_FITS, width: w, height: h, channels: channels,
    sample: sample, bytesPerSample: bps, endian: AI_BE, layout: AI_LAYOUT_PLANAR,
    bzero: bzero, bscale: bscale, compressed: AI_COMP_NONE,
    uncompressedSize: need, shuffleItemSize: 0,
    dataOffset: headerBytes, dataLength: need, flipY: 0
  };
  return head;
}

// --------------------------------------------------------------------
// 六、XISF 头解析（手写 XML 属性扫描，零 DOM / 零 SDK）
// --------------------------------------------------------------------

/** 校验 XISF 签名。 */
export function aiXisfMagicOf(b: Uint8Array): boolean {
  if (b.length < AI_XISF_PREAMBLE) { return false; }
  for (let i = 0; i < 8; i++) {
    if (b[i] !== AI_XISF_SIGNATURE.charCodeAt(i)) { return false; }
  }
  return true;
}

/** u32 LE 头长（XML 字节数，从 offset 16 起）。 */
export function aiXisfHeaderLenOf(b: Uint8Array): number {
  if (b.length < AI_XISF_PREAMBLE) { return 0; }
  return b[8] + b[9] * 256 + b[10] * 65536 + b[11] * 16777216;
}

/** 从 offset 16 取 headerLen 字节还原 XML 文本（Latin-1 逐字节，属性值均为 ASCII）。 */
export function aiXisfXmlOf(b: Uint8Array, headerLen: number): string {
  const end: number = AI_XISF_PREAMBLE + headerLen;
  const cap: number = end < b.length ? end : b.length;
  const chars: Array<string> = [];
  for (let p = AI_XISF_PREAMBLE; p < cap; p++) {
    chars.push(String.fromCharCode(b[p]));
  }
  return chars.join('');
}

/** 取 `<Image …>` 开标签（含属性）文本；找不到返回空串。 */
export function aiImageTagOf(xml: string): string {
  const s: number = xml.indexOf('<Image');
  if (s < 0) { return ''; }
  const e: number = xml.indexOf('>', s);
  if (e < 0) { return ''; }
  return xml.substring(s, e + 1);
}

/** 从标签文本里取属性值 `name="value"` / `name='value'`，找不到返回空串。 */
export function aiAttrOf(tag: string, name: string): string {
  // 用「name=」定位，且要求前一字符是空白或 '<'，避免命中 sampleFormat 里的 Format
  let from: number = 0;
  while (from < tag.length) {
    const p: number = tag.indexOf(name + '=', from);
    if (p < 0) { return ''; }
    const prev: string = p === 0 ? '<' : tag.charAt(p - 1);
    if (prev === ' ' || prev === '<' || prev === '\n' || prev === '\t' || prev === '\r') {
      let q: number = p + name.length + 1;
      if (q >= tag.length) { return ''; }
      const quote: string = tag.charAt(q);
      if (quote === '"' || quote === '\'') {
        const e: number = tag.indexOf(quote, q + 1);
        if (e > q) { return tag.substring(q + 1, e); }
      }
      return '';
    }
    from = p + 1;
  }
  return '';
}

/** geometry="W:H:C" 取第 idx 段（0 宽 / 1 高 / 2 通道）。 */
export function aiGeometryOf(geo: string, idx: number): number {
  let start: number = 0;
  let part: number = 0;
  for (let i = 0; i <= geo.length; i++) {
    if (i === geo.length || geo.charAt(i) === ':') {
      if (part === idx) {
        return aiNumOf(geo.substring(start, i), 0, true);
      }
      part++;
      start = i + 1;
    }
  }
  return 0;
}

/** location="attachment:pos:size" 解析：返回 [kind, pos, size]。
 *  kind: 0 附件（有 pos/size）/ 1 embedded（数据紧跟头）/ 2 inline / 3 未知。 */
export function aiLocationOf(loc: string): Array<number> {
  const out: Array<number> = [3, 0, 0];
  if (loc.indexOf('attachment:') === 0) {
    const rest: string = loc.substring(11);
    const c1: number = rest.indexOf(':');
    if (c1 > 0) {
      out[0] = 0;
      out[1] = aiNumOf(rest.substring(0, c1), 0, true);
      out[2] = aiNumOf(rest.substring(c1 + 1), 0, true);
    }
  } else if (loc === 'embedded') {
    out[0] = 1;
  } else if (loc.indexOf('inline:') === 0) {
    out[0] = 2;
  }
  return out;
}

/** compression 属性 → [压缩码, shuffleItemSize]。
 *  无 / '' → NONE；'zlib' → ZLIB；'zlib+sh:N' → ZLIB + itemSize=N；
 *  lz4/lz4hc/zstd 等 → UNSUPPORTED。 */
export function aiCompressionOf(comp: string): Array<number> {
  const out: Array<number> = [AI_COMP_NONE, 0];
  if (comp.length === 0) { return out; }
  const lower: string = comp.toLowerCase();
  // 无压缩：属性省略（''）或显式写 none / uncompressed / 空值都算，绝不误判为不支持
  if (lower === 'none' || lower === 'uncompressed') { return out; }
  if (lower.indexOf('zlib') === 0) {
    out[0] = AI_COMP_ZLIB;
    const sh: number = lower.indexOf('+sh');
    if (sh >= 0) {
      const tail: string = lower.substring(sh + 3);
      if (tail.indexOf(':') === 0) {
        out[1] = aiNumOf(tail.substring(1), 0, true);
      } else {
        out[1] = -1; // 需要按 bytesPerSample 推断
      }
    }
    return out;
  }
  out[0] = AI_COMP_UNSUPPORTED;
  return out;
}

/** XISF 头解析。b = 整个文件字节。 */
export function aiXisfPlanOf(b: Uint8Array): AstroHeader {
  if (!aiXisfMagicOf(b)) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_BAD_MAGIC);
  }
  const headerLen: number = aiXisfHeaderLenOf(b);
  if (headerLen < 1 || headerLen > AI_XISF_MAX_HEADER ||
      AI_XISF_PREAMBLE + headerLen > b.length) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_TOO_SHORT);
  }
  const xml: string = aiXisfXmlOf(b, headerLen);
  const tag: string = aiImageTagOf(xml);
  if (tag.length === 0) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_NO_IMAGE);
  }
  const geo: string = aiAttrOf(tag, 'geometry');
  const w: number = aiGeometryOf(geo, 0);
  const h: number = aiGeometryOf(geo, 1);
  let channels: number = aiGeometryOf(geo, 2);
  if (channels <= 0) { channels = 1; }
  if (channels > 3) { channels = 3; }
  const sf: string = aiAttrOf(tag, 'sampleFormat');
  const typeAttr: string = aiAttrOf(tag, 'type');
  let sample: number = aiXisfSampleOf(sf.length > 0 ? sf : typeAttr);
  if (sample === AI_SAMPLE_UNKNOWN) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_BAD_GEOMETRY);
  }
  if (w <= 0 || h <= 0) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_BAD_GEOMETRY);
  }
  const bps: number = aiBytesPerSampleOf(sample);
  const pxCount: number = w * h * channels;
  if (pxCount <= 0 || pxCount > AI_MAX_SOURCE_PIXELS) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_TOO_LARGE);
  }
  const storage: string = aiAttrOf(tag, 'pixelStorage');
  const layout: number = (storage === 'Planar' || storage === 'planar')
    ? AI_LAYOUT_PLANAR : AI_LAYOUT_NORMAL;
  const byteOrder: string = aiAttrOf(tag, 'byteOrder');
  const endian: number = (byteOrder === 'big' || byteOrder === 'Big')
    ? AI_BE : AI_LE;
  const compAttr: string = aiAttrOf(tag, 'compression');
  const comp: Array<number> = aiCompressionOf(compAttr);
  if (comp[0] === AI_COMP_UNSUPPORTED) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_UNSUPPORTED);
  }
  const locArr: Array<number> = aiLocationOf(aiAttrOf(tag, 'location'));
  let dataOffset: number = 0;
  let dataLength: number = 0;
  if (locArr[0] === 0) {
    dataOffset = locArr[1];
    dataLength = locArr[2];
  } else if (locArr[0] === 1) {
    // embedded：数据紧跟 XML 头（对齐到 16 字节），长度取剩余
    dataOffset = AI_XISF_PREAMBLE + headerLen;
    const rem: number = b.length - dataOffset;
    dataLength = rem > 0 ? rem : 0;
  } else {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_UNSUPPORTED); // inline base64 不做
  }
  if (dataOffset < AI_XISF_PREAMBLE + headerLen || dataOffset > b.length ||
      dataLength <= 0 || dataOffset + dataLength > b.length) {
    return aiFailHeader(AI_FMT_XISF, AI_FAIL_DATA_SHORT);
  }
  let uncompressedSize: number = pxCount * bps;
  const declared: number = aiNumOf(aiAttrOf(tag, 'uncompressedSize'), 0, true);
  if (comp[0] === AI_COMP_ZLIB && declared > 0) {
    uncompressedSize = declared;
  }
  let shuffleItem: number = comp[1];
  if (shuffleItem < 0) { shuffleItem = bps; } // +sh 未给 itemSize → 按样本字节
  const head: AstroHeader = {
    ok: AI_OK, fmt: AI_FMT_XISF, width: w, height: h, channels: channels,
    sample: sample, bytesPerSample: bps, endian: endian, layout: layout,
    bzero: 0, bscale: 1, compressed: comp[0],
    uncompressedSize: uncompressedSize, shuffleItemSize: shuffleItem,
    dataOffset: dataOffset, dataLength: dataLength, flipY: 0
  };
  return head;
}

/** 统一入口：按文件名后缀选 FITS / XISF 解析器。 */
export function aiHeaderOf(name: string, b: Uint8Array): AstroHeader {
  const fmt: number = aiFormatOf(name);
  if (fmt === AI_FMT_FITS) { return aiFitsPlanOf(b); }
  if (fmt === AI_FMT_XISF) { return aiXisfPlanOf(b); }
  return aiFailHeader(AI_FMT_NONE, AI_FAIL_BAD_MAGIC);
}

// --------------------------------------------------------------------
// 七、反 byte-shuffle / 显示尺寸 / min-max 拉伸 / RGBA 组装
// --------------------------------------------------------------------

/** 反 XISF byte-shuffle：shuffle 后布局是「所有 item 的第 0 字节、所有第 1 字节…」。
 *  itemSize = N，item 数 = len / N；还原为交错 [item0 byte0..N-1, item1 …]。
 *  非 shuffle 或参数非法时原样返回（新数组，绝不改入参）。 */
export function aiUnshuffleOf(src: Uint8Array, itemSize: number): Uint8Array {
  const n: number = src.length;
  if (itemSize <= 1 || n === 0) { return aiCopyOf(src); }
  const count: number = Math.floor(n / itemSize);
  const out: Uint8Array = new Uint8Array(count * itemSize);
  for (let plane = 0; plane < itemSize; plane++) {
    const base: number = plane * count;
    for (let i = 0; i < count; i++) {
      out[i * itemSize + plane] = src[base + i];
    }
  }
  return out;
}

function aiCopyOf(src: Uint8Array): Uint8Array {
  const out: Uint8Array = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) { out[i] = src[i]; }
  return out;
}

/** 按 edge（长边档位）算目标尺寸，与 decodePx 的 desiredSize 同口径；
 *  并夹到 AI_MAX_TARGET_EDGE，且不小于 1。 */
export function aiDisplaySizeOf(w: number, h: number, edge: number): AstroSize {
  let dw: number = w;
  let dh: number = h;
  const cap: number = edge > 0 && edge < AI_MAX_TARGET_EDGE ? edge : AI_MAX_TARGET_EDGE;
  const mx: number = w > h ? w : h;
  if (mx > cap) {
    const k: number = cap / mx;
    dw = Math.max(1, Math.floor(w * k));
    dh = Math.max(1, Math.floor(h * k));
  }
  const size: AstroSize = { w: dw, h: dh };
  return size;
}

/** 采样估 min/max。step 由 aiBoundsStepOf 给出，最多 AI_BOUNDS_SAMPLES 个样本。
 *  pixels 必须是「已解压 + 已反 shuffle」的纯像素段。 */
export function aiBoundsOf(pixels: Uint8Array, h: AstroHeader): AstroBounds {
  const total: number = h.width * h.height * h.channels;
  const step: number = aiBoundsStepOf(total);
  const bps: number = h.bytesPerSample;
  let lo: number = 0;
  let hi: number = 1;
  let first: boolean = true;
  for (let idx = 0; idx < total; idx += step) {
    const off: number = idx * bps;
    if (off + bps > pixels.length) { break; }
    const phys: number = h.bzero + h.bscale * aiSampleAt(pixels, off, h.sample, h.endian);
    if (first) { lo = phys; hi = phys; first = false; }
    else if (phys < lo) { lo = phys; }
    else if (phys > hi) { hi = phys; }
  }
  if (first) { lo = 0; hi = 1; }
  if (hi <= lo) { hi = lo + 1; }
  const b: AstroBounds = { lo: lo, hi: hi };
  return b;
}

/** bounds 采样步长：总像素 / AI_BOUNDS_SAMPLES，至少 1。 */
export function aiBoundsStepOf(total: number): number {
  if (total <= AI_BOUNDS_SAMPLES) { return 1; }
  return Math.max(1, Math.floor(total / AI_BOUNDS_SAMPLES));
}

/** min-max 归一化 + gamma 拉伸到 0..255，夹界防越界。 */
export function aiStretchByteOf(v: number, lo: number, hi: number, gamma: number): number {
  let t: number = (v - lo) / (hi - lo);
  if (t < 0) { t = 0; }
  if (t > 1) { t = 1; }
  if (t > 0 && gamma !== 1) {
    t = Math.pow(t, gamma);
  }
  const out: number = Math.floor(t * 255 + 0.5);
  return out < 0 ? 0 : (out > 255 ? 255 : out);
}

/** 从纯像素段取一个「显示像素」的 R/G/B 物理值。
 *  planar：(ch * w*h + y*w + x)；normal：((y*w + x)*channels + ch)。
 *  灰度时 c1/c2 复用 c0。flipY=1 时 y 取自底部。 */
export function aiPixelAt(pixels: Uint8Array, h: AstroHeader, x: number, y: number,
  channel: number): number {
  const yy: number = h.flipY === 1 ? (h.height - 1 - y) : y;
  let idx: number;
  if (h.layout === AI_LAYOUT_NORMAL) {
    idx = (yy * h.width + x) * h.channels + channel;
  } else {
    idx = channel * h.width * h.height + yy * h.width + x;
  }
  const off: number = idx * h.bytesPerSample;
  return h.bzero + h.bscale * aiSampleAt(pixels, off, h.sample, h.endian);
}

/** 生成目标尺寸 RGBA（长度 dw*dh*4）。源像素按最近邻映射到目标网格。
 *  bgra=1 时按 B,G,R,A 填充（真机偏色 R/B 互换时切换）。 */
export function aiRgbaOf(pixels: Uint8Array, h: AstroHeader, dw: number, dh: number,
  bounds: AstroBounds, gamma: number, bgra: number): Uint8Array {
  const out: Uint8Array = new Uint8Array(dw * dh * 4);
  if (h.ok !== AI_OK || dw <= 0 || dh <= 0) { return out; }
  const c1: number = h.channels >= 2 ? 1 : 0;
  const c2: number = h.channels >= 3 ? 2 : 0;
  for (let dy = 0; dy < dh; dy++) {
    const sy: number = Math.min(h.height - 1, Math.floor(dy * h.height / dh));
    for (let dx = 0; dx < dw; dx++) {
      const sx: number = Math.min(h.width - 1, Math.floor(dx * h.width / dw));
      const r: number = aiStretchByteOf(aiPixelAt(pixels, h, sx, sy, 0),
        bounds.lo, bounds.hi, gamma);
      const g: number = aiStretchByteOf(aiPixelAt(pixels, h, sx, sy, c1),
        bounds.lo, bounds.hi, gamma);
      const b: number = aiStretchByteOf(aiPixelAt(pixels, h, sx, sy, c2),
        bounds.lo, bounds.hi, gamma);
      const p: number = (dy * dw + dx) * 4;
      if (bgra === 1) {
        out[p] = b; out[p + 1] = g; out[p + 2] = r; out[p + 3] = 255;
      } else {
        out[p] = r; out[p + 1] = g; out[p + 2] = b; out[p + 3] = 255;
      }
    }
  }
  return out;
}

/** 一个像素段是否够长（供 SDK 层解码前快速判定）。 */
export function aiPixelsLongEnough(pixels: Uint8Array, h: AstroHeader): boolean {
  return pixels.length >= h.width * h.height * h.channels * h.bytesPerSample;
}
