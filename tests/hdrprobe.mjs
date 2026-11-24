#!/usr/bin/env node
/**
 * tests/hdrprobe.mjs — 第七十一轮：HEIC HDR 保真解码的「可直接运行」验证入口
 *
 *   node tests/hdrprobe.mjs                     # 无参数：跑内置 HEIC 样本自检（4 组）
 *   node tests/hdrprobe.mjs path/to/a.heic     # 传文件：读取真实 HEIC 头部并输出探测报告
 *   node tests/hdrprobe.mjs --json a.heic      # 只输出 JSON（便于脚本消费）
 *
 * 只依赖 Node 内置的 node:fs 与纯函数真值源 common/HdrPreview.ts，
 * 零 SDK / 零鸿蒙运行时 / 零网络 —— 在普通 PC 上即可直接运行验证。
 * 本报告是**容器层**判定：解码产物是否真为 HDR，仍以应用内
 * PixelMap.getImageInfo().isHdr 为准（见 hpOutcomeOf / README 第七十一轮）。
 */

import { readFileSync } from 'node:fs';
import {
  HP_FMT_HEIC, HP_FMT_HEIF, HP_FMT_OTHER, HP_FMT_CORRUPT, HP_FMT_INCOMPATIBLE,
  HP_RANGE_AUTO, HP_RANGE_HDR,
  hpProbeOf, hpRequestOf, hpOutcomeOf, hpDecodeSizeOf,
  hpOriginalSizeAllowedOf, hpQuantLevelsOf, hpRangeRatioOf,
  hpShowHintOf, hpHintOf, hpFailCodeOf,
  HP_OK_HDR, HP_NO_HDR_META, HP_CAUSE_FORMAT, HP_FILE_CORRUPT,
  HP_HDR_DOWNGRADED, HP_DECODE_FAILED
} from '../entry/src/main/ets/common/HdrPreview.ts';

// ==================== ISOBMFF / HEIF 样本构造（真实字节，非模拟返回值） ====================

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n >>> 0, 0);
  return b;
}
/** 普通 box：4 字节大端 size + 4 字节 type + payload。 */
export function box(type, payload = Buffer.alloc(0)) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + payload.length, 0);
  head.write(type, 4, 4, 'ascii');
  return Buffer.concat([head, payload]);
}
/** FullBox：4 字节 version+flags + payload。 */
export function fullBox(payload, version = 0) {
  const h = Buffer.alloc(4);
  h[0] = version;
  return Buffer.concat([h, payload]);
}
export function ftyp(major, compat = []) {
  const p = Buffer.alloc(8 + compat.length * 4);
  p.write(major, 0, 4, 'ascii');
  p.writeUInt32BE(0, 4);
  compat.forEach((c, i) => p.write(c, 8 + i * 4, 4, 'ascii'));
  return box('ftyp', p);
}
export function ispe(w, h) {
  return box('ispe', fullBox(Buffer.concat([u32(w), u32(h)])));
}
/** nclx：'nclx' + primaries + transfer + matrix + full-range flag。 */
export function colr(primaries, transfer, matrix) {
  return box('colr', Buffer.concat([
    Buffer.from('nclx', 'ascii'), u16(primaries), u16(transfer), u16(matrix),
    Buffer.from([0x80])
  ]));
}
export function hvcC() {
  return box('hvcC', Buffer.from([
    0x01, 0x22, 0x20, 0x00, 0x00, 0x00, 0x90, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x3c, 0xf0, 0x00, 0xfc, 0xfd, 0xf8, 0xf8, 0x00, 0x00, 0x0f, 0x03
  ]));
}
export function clli() {
  return box('clli', Buffer.concat([u16(1000), u16(400)]));
}
export function auxC(urn) {
  return box('auxC', fullBox(Buffer.concat([Buffer.from(urn, 'ascii'), Buffer.from([0])])));
}
export function metaBox(children) {
  return box('meta', fullBox(Buffer.concat([
    box('hdlr', fullBox(Buffer.concat([u32(0), u32(0x70696374), Buffer.alloc(12)]))),
    box('pitm', fullBox(u32(1))),
    ...children
  ])));
}
export function ipco(children) {
  return box('iprp', box('ipco', Buffer.concat(children)));
}
export function mdat(n = 64) {
  return box('mdat', Buffer.alloc(n, 0x5a));
}

/** ① 标准 HDR HEIC：BT.2020 + PQ + HDR10 clli + 10bit heix brand + 原始尺寸 3840×2160。 */
export function sampleHdrHeic() {
  return Buffer.concat([
    ftyp('heic', ['mif1', 'heic', 'heix']),
    metaBox([
      ipco([ispe(3840, 2160), hvcC(), colr(9, 16, 9), clli()]),
      ispe(3840, 2160)
    ]),
    mdat()
  ]);
}
/** ② 普通 SDR HEIC：BT.709 / sRGB 传递，无任何 HDR 标记。 */
export function sampleSdrHeic() {
  return Buffer.concat([
    ftyp('heic', ['mif1', 'heic']),
    metaBox([ipco([ispe(1920, 1080), hvcC(), colr(1, 1, 1)])]),
    mdat(32)
  ]);
}
/** ③ gain map HDR（ISO/Apple 双图层路线）：auxC 带 HDR URN。 */
export function sampleGainMapHeic() {
  return Buffer.concat([
    ftyp('heic', ['mif1', 'heic']),
    metaBox([
      ipco([ispe(2048, 1536), hvcC(), colr(1, 1, 1),
        auxC('urn:mpeg:mpegB:cicp:systems:features:hdr')]),
    ]),
    mdat(32)
  ]);
}
/** ④ 损坏：ftyp 声明的长度超出实际字节（截断）。 */
export function sampleCorruptHeic() {
  const good = ftyp('heic', ['mif1', 'heic']);
  good.writeUInt32BE(4096, 0);
  return good;
}
/** ⑤ 格式不兼容：容器是 jpeg brand。 */
export function sampleUnsupported() {
  return Buffer.concat([
    ftyp('jpeg', ['jpeg']),
    metaBox([ipco([ispe(640, 480)])]),
    mdat(16)
  ]);
}

// ==================== 探测报告 ====================

/** 对一份字节数据生成人类可读 + 机器可读的报告。 */
export function probeReport(uri, buf) {
  const bytes = new Uint8Array(buf);
  const p = hpProbeOf(uri, bytes);
  const request = hpRequestOf(false, p.format, p.hdrMeta.present);
  // 演示「产物校验」：容器判为 HDR 请求档时，分别给出真 HDR / 被降 SDR 两种结局。
  const outcomeHdr = hpOutcomeOf(request, true, true);
  const outcomeDown = hpOutcomeOf(request, true, false);
  const size = hpDecodeSizeOf(p.width || 0, p.height || 0, 1800,
    p.hdrMeta.present, p.format);
  const failCode = hpFailCodeOf(p.format, false, bytes.length > 0);
  const formatName = p.format === HP_FMT_HEIC ? 'HEIC'
    : p.format === HP_FMT_HEIF ? 'HEIF'
      : p.format === HP_FMT_CORRUPT ? 'CORRUPT'
        : p.format === HP_FMT_INCOMPATIBLE ? 'INCOMPATIBLE' : 'OTHER';
  return {
    file: uri,
    bytes: bytes.length,
    format: formatName,
    brand: p.brand,
    originalSize: p.width > 0 ? (p.width + ' × ' + p.height) : '(ispe 缺失)',
    hdrMeta: {
      present: p.hdrMeta.present,
      primaries: p.hdrMeta.primaries,
      transfer: p.hdrMeta.transfer,
      hdr10: p.hdrMeta.hdr10,
      gainMap: p.hdrMeta.gainMap,
      tenBit: p.hdrMeta.tenBit
    },
    corrupt: p.corrupt,
    requestDynamicRange: request === HP_RANGE_HDR ? 'HDR(显式)' : 'AUTO',
    outcomeIfDecodedHdr: outcomeHdr === HP_OK_HDR ? '真 HDR 输出'
      : hpHintOf(outcomeHdr, p.width, p.height),
    outcomeIfDowngraded: outcomeDown === HP_HDR_DOWNGRADED
      ? hpHintOf(outcomeDown, p.width, p.height) : '(不适用)',
    decodeSize: size.w + ' × ' + size.h,
    originalSizeKept: size.original,
    sizeCapped: size.capped,
    quantLevels: hpQuantLevelsOf(10) + ' 级（10bit） / ' + hpQuantLevelsOf(8) + ' 级（8bit）',
    rangeRatio: hpRangeRatioOf(10, 8) + '×',
    failCode,
    hint: hpShowHintOf(failCode) ? hpHintOf(failCode, p.width, p.height) : '(正常，无需提示)'
  };
}

// ==================== 自检（无参数时运行） ====================

function selfTest() {
  const cases = [
    ['HDR HEIC（BT.2020/PQ/HDR10/10bit）', 'a.heic', sampleHdrHeic(), true, 'HEIC'],
    ['普通 SDR HEIC', 'b.heic', sampleSdrHeic(), false, 'HEIC'],
    ['gain map HDR HEIC', 'c.heic', sampleGainMapHeic(), true, 'HEIC'],
    ['损坏 HEIC（截断）', 'd.heic', sampleCorruptHeic(), false, 'CORRUPT'],
    ['格式不兼容（jpeg brand）', 'e.heic', sampleUnsupported(), false, 'INCOMPATIBLE']
  ];
  let failed = 0;
  const rows = [];
  for (const [label, name, buf, wantHdr, wantFormat] of cases) {
    const r = probeReport(name, buf);
    const ok = r.hdrMeta.present === wantHdr && r.format === wantFormat;
    if (!ok) failed++;
    rows.push({ label, ok, format: r.format, hdr: r.hdrMeta.present,
      request: r.requestDynamicRange, hint: r.hint, size: r.decodeSize });
  }
  // 额外数值护栏
  const guards = {
    '10bit 量化级数 = 1024': hpQuantLevelsOf(10) === 1024,
    '8bit 量化级数 = 256': hpQuantLevelsOf(8) === 256,
    '10bit/8bit 动态范围比 = 4': hpRangeRatioOf(10, 8) === 4,
    '3840×2160 在原始尺寸护栏内': hpOriginalSizeAllowedOf(3840, 2160, 12000000, 4096),
    '7680×4320 超出护栏': hpOriginalSizeAllowedOf(7680, 4320, 12000000, 4096) === false,
    '损坏文件给明确提示': hpHintOf(HP_FILE_CORRUPT, 0, 0).indexOf('损坏') >= 0,
    '格式不兼容给明确提示': hpHintOf(HP_CAUSE_FORMAT, 0, 0).indexOf('不兼容') >= 0,
    '缺 HDR 信息给明确提示': hpHintOf(HP_NO_HDR_META, 0, 0).indexOf('未包含 HDR') >= 0,
    '动态范围压缩给明确提示': hpHintOf(HP_HDR_DOWNGRADED, 0, 0).indexOf('压缩') >= 0,
    '解码失败给明确提示': hpHintOf(HP_DECODE_FAILED, 0, 0).indexOf('失败') >= 0,
    '正常态不显示提示': hpShowHintOf(HP_OK_HDR) === false
  };
  for (const [k, v] of Object.entries(guards)) {
    if (!v) failed++;
    rows.push({ label: k, ok: v });
  }
  return { rows, failed };
}

// ==================== CLI ====================

const invokedDirectly = process.argv[1] &&
  (process.argv[1].endsWith('hdrprobe.mjs') || process.argv[1].endsWith('hdrprobe'));
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const jsonOnly = args[0] === '--json';
  const file = jsonOnly ? args[1] : args[0];
  if (file) {
    const buf = readFileSync(file);
    const r = probeReport(file, buf);
    if (jsonOnly) {
      console.log(JSON.stringify(r, null, 2));
    } else {
      console.log('=== HEIC HDR 探测报告 ===');
      for (const [k, v] of Object.entries(r)) {
        console.log(k.padEnd(22) + ': ' + (typeof v === 'object' ? JSON.stringify(v) : v));
      }
      console.log('\n⚠️ 本报告是容器层判定；解码产物是否真为 HDR，以应用内');
      console.log('   PixelMap.getImageInfo().isHdr 为准（见 README 第七十一轮）。');
    }
  } else {
    const { rows, failed } = selfTest();
    console.log('=== R71 HEIC HDR 真值源自检（内置真实构造字节样本）===');
    for (const r of rows) {
      const tail = r.ok === undefined ? '' :
        '  format=' + r.format + '  hdr=' + r.hdr + '  request=' + r.request +
        '  size=' + r.size + '  hint=' + r.hint;
      console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.label + tail);
    }
    console.log('\n' + (failed === 0
      ? 'ALL PASS  ' + rows.length + ' checks, 0 failed'
      : 'FAILED  ' + failed + ' check(s)'));
    console.log('⚠️ 纯函数 / 容器字节判定，不替代真机 HDR 显示验证；编译校验 ≠ 真机验证。');
    if (failed > 0) process.exitCode = 1;
  }
}
