/**
 * model/Preview.ets —— 解码与原始档案数据服务（R39：Index.ets 拆分 Phase 1 迁出）
 *
 *  从 pages/Index.ets **原样迁出**的顶层解码链（零逻辑改动，仅加 export）：
 *    · PreviewEntry —— 解码结果结构（uri + PixelMap + 显示宽高 + 档位 + 色彩/HDR/EXIF）
 *    · RawStore / rawStore —— 原始档案 bytes 的内存 LRU（第八轮引入、第二十七轮真异步化）
 *    · decodePx —— 按长边档位解码一张图（EXIF 摆正 / HDR / ICC，RawStore 未命中降级 fd）
 *  依赖方向：pages/Index.ets 与 components/ArchiveRow.ets 都只 import 本文件；
 *  本文件只依赖 common/ 纯函数层与 SDK，不回指任何页面 / 组件 —— 模块图无环。
 */

import fs from '@ohos.file.fs';
import image from '@ohos.multimedia.image';
import hilog from '@ohos.hilog';
import colorSpaceManager from '@ohos.graphics.colorSpaceManager';
import zlib from '@ohos.zlib';
import { ExifTransform, Size2, exifTransformOf, exifSizeOf } from '../common/ViewPlan';
import { RawFit, rawFitOf, rawSingleAllowed, rawReadComplete,
  rawIoTimeoutMs, rawDenyAfterFailure } from '../common/RawCache';
// 第六十五轮：FITS / XISF 天文图像预览的纯函数真值源（零 SDK / 零 IO）。
// 系统 codec 不认这两种格式：decodePx 判到天文后缀即分流到 decodeAstroPx，
// 由本模块（唯一碰 SDK 的地方）真异步读字节 → 纯函数解析 / 拉伸 → createPixelMap。
import { AI_OK, AI_COMP_ZLIB, AI_STRETCH_GAMMA, AI_OUTPUT_BGRA,
  AI_MAX_TARGET_PIXELS, AI_SLICE_ROWS, AI_SLICE_YIELD_MS,
  AI_MAX_UNCOMPRESSED_BYTES, AI_UNSHUFFLE_SLICE_LIMIT, AI_UNSHUFFLE_SLICE_ITEMS,
  AI_MAX_CONCURRENT_RENDER,
  AstroHeader, AstroBounds, AstroSize, aiIsAstroName, aiHeaderOf,
  aiFailHintOf, aiUnshuffleOf, aiBoundsOf, aiRgbaOf,
  aiPixelsLongEnough, aiTargetSizeSafeOf, aiSxTableOf, aiRgbaSliceOf,
  aiSliceCountOf, aiSliceI0Of, aiSliceI1Of, aiUnshuffleSliceOf,
  aiAllocAllowedOf, aiRenderSlotAllowedOf } from '../common/AstroImage';
// 第六十七轮：高质量放大镜显示的关键参数 / 能力分级 / 抗锯齿档决策真值源（零 SDK / 零 IO）。
import { LQ_CAP_SYSTEM_AA, LQ_AA_LOW, LQ_AA_MEDIUM, LQ_AA_HIGH,
  LQ_API_PROBE_LEVEL, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE,
  lqCapabilityOf, lqSafeFactorOf, lqScaleAllowedOf } from '../common/LoupeQuality';
// 第六十八轮：右侧主预览 resize 最高质素的护栏 / AA 档真值源（零 SDK / 零 IO）。
// 与放大镜各自独立判定，形成两层护栏；两边常量数值一致，静态契约会逐项对齐。
import { VQ_CAP_SYSTEM_AA, VQ_AA_LOW, VQ_AA_MEDIUM, VQ_AA_HIGH,
  VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE,
  vqSafeFactorOf, vqScaleAllowedOf } from '../common/ViewQuality';
// 第七十一轮：HEIC HDR 保真解码的容器探测 / 显式动态范围 / 产物校验 / 保真护栏真值源
// （零 SDK / 零 IO，本文件是唯一碰 SDK 的地方）。
import { HpProbe, HpDecodeSize,
  HP_FMT_CORRUPT, HP_FMT_INCOMPATIBLE, HP_RANGE_HDR, HP_OK_SDR,
  HP_COLORSPACE_PRESERVE, HP_HDR_UNVERIFIED, HP_SIZE_CAPPED,
  hpProbeOf, hpRequestOf, hpOutcomeOf, hpDecodeSizeOf, hpFailCodeOf,
  hpColorSpacePreservedOf, hpShowHintOf, hpHintOf } from '../common/HdrPreview';
// 第七十六轮：EXIF 段字节级粗筛 / 字段标签 / 值归一的纯函数真值源（零 SDK / 零 IO）。
// 第七十七轮：字节级结果只决定「要不要读 SDK」，图标显隐一律以实际读到的有效字段为准；
// fd 兜底路径（拿不到完整 bytes）也读一次，避免有 EXIF 的相片被漏标。
import { PmExifField, PM_EXIF_LABELS, PM_EXIF_UNKNOWN,
  pmExifPresentOf, pmExifShouldReadOf, pmExifEffectiveOf,
  pmExifFieldOf, pmExifFieldWantedOf } from '../common/PictureMenu';

// hilog 域（原 pages/Index.ets 顶部同值迁入；Index.ets 反向 import 本定义）。
export const TAG = 'HeicViewer';
export const DOMAIN = 0x0000;

/** 第六十六轮：让出主线程的**宏任务**等待（R65 天文长循环 appfreeze 的根治件）。
 *  · 这不是「新增 Promise 构造」：它把 R44 `Index.ets/nasRetryWait` 里那一处
 *    「定时器 + resolve」**原样搬过来共用**，工程全源码 Promise 构造仍恰 2 处
 *    （RawStore.readGuarded 超时闸门 + 本函数），Index.ets 的 nasRetryWait 改为委托。
 *  · 与 `await Promise.resolve()` 的微任务本质不同：setTimeout 回调由 EventHandler
 *    以独立宏任务派发，相邻两片计算之间 VIP 输入事件可以插队，UI 线程不再被连续独占。
 *  · ms 恒取有限整数常量（AI_SLICE_YIELD_MS=0 / NAS_RETRY_DELAYS），绝不把 NaN 传给
 *    定时器；非正数一律归零，语义是「尽快让出一次」而不是「不等待」。 */
export function yieldMacroTask(ms: number): Promise<void> {
  const delay: number = ms > 0 ? Math.floor(ms) : 0;
  return new Promise<void>((resolve: () => void): void => {
    setTimeout((): void => {
      resolve();
    }, delay);
  });
}

/** 第六十六轮：正在做 RGBA 重计算的解码条数（只计「重计算」这一段，不含 IO）。
 *  等待方靠宏任务让出排队，绝不丢弃任何一次解码；try/finally 保证异常也归还槽位。 */
let astroRenderActive: number = 0;

// ---- 第八轮（2026-11-12）：原始档案数据（未解码 bytes）的内存缓存 ----
/** 用户要求「档案数据完全载入内存同时解码」：载入链把每个图片文件的完整 bytes 读进
 *  RawStore（ArrayBuffer LRU），decodePx 直接 image.createImageSource(ArrayBuffer) 解码。
 *  NAS / 网络目录不再为每张图各做一次 openSync + codec 逐段读文件，重解全清 / 全屏放大
 *  也不必再回网络读一遍。
 *
 *  ⚠️ 与解码后 PixelMap 缓存（PRELOAD_MAX_BYTES=1GB）**分开计账**：两者相加是进程峰值，
 *     默认 768MB + 1GB ≈ 1.75GB。这是「尽力全量」的防 OOM 硬闸，不是容量承诺 ——
 *     触顶即按 LRU 淘汰最久没用的原始 bytes（那些图早已解码成 PixelMap，不需要原文件）。
 *     内存吃紧的机器把这里调回 256MB；想让超大图库更彻底地常驻内存可上调到 1GB。 */
const RAW_CACHE_MAX_BYTES: number = 768 * 1024 * 1024;
/** 单张原始档案数据的上限：超过就不进内存缓存，避免一张 4K RAW 把预算吃光。
 *  超大的仍走 decodePx 的 fd 兜底路径，功能完全不受影响。0 = 不限制单文件。 */
const RAW_SINGLE_MAX_BYTES: number = 64 * 1024 * 1024;
/** 原始档案数据缓存的张数上限（与 PRELOAD_ALL_CAP 同量级）。
 *  R39 拆分：Index 的预载链（rawPrefetchWanted 判据）也在用，故导出。 */
export const RAW_CACHE_MAX_COUNT: number = 20000;
// ---- 第二十七轮（2026-11-16）：NAS 路径 THREAD_BLOCK_6S 的异步 IO 超时 ----
/** 单次原始档案读取的超时基线（ms）：覆盖 open / close 的跨进程固定开销。 */
const RAW_IO_BASE_MS: number = 400;
/** 每 MB 追加的超时（ms）：NAS 上的大文件给更宽容的窗口，避免误杀。 */
const RAW_IO_PER_MB_MS: number = 120;
/** 硬上限（ms）：死 NAS 路径上 fs.read 的 Promise 可能永不 settle，
 *  没有上限就会让 inflight / allActive 永久挂住，整条预载链假死。
 *  ⚠️ 只有把同步 IO 改成真异步之后，应用才**有可能**自己设这个上限 ——
 *     同步 IO 的超时由平台决定、应用无法缩短（见 FailFast.ts 的边界声明）。 */
const RAW_IO_CAP_MS: number = 8000;

/** 色彩管理：0 = 保留源色彩空间（系统 codec 识别内嵌 ICC，原样交给渲染合成，默认）；
 *  1 = 解码时统一转换到 sRGB（兼容不支持广色域的显示器，颜色最稳）；
 *  2 = 转换到 Display P3（广色域优先，sRGB 屏可能偏色）。
 *  ⚠️ HarmonyOS 26 的 colorSpaceManager 只有 create(ColorSpace) / create(primaries,gamma)，
 *     **没有「从 ICC profile 字节流构造 ColorSpaceManager」的 API**，做不了完整 ICC CMS；
 *     这里做的是识别内嵌 ICC 映射到的标准空间 + 可选的标准空间转换。 */
const COLOR_MANAGE_MODE: number = 0;
/** 是否按 EXIF Orientation 自动摆正（含镜像）。
 *  若某机型系统 codec 已经自动摆正，实机会看到多转一次 —— 把本开关改 false 即可。 */
const EXIF_AUTO_ROTATE: boolean = true;
/** EXIF 旋转放在解码阶段（rotate 选项，少一次重采样、画质最好）。
 *  若某机型 codec 报「rotate 与 desiredSize 不能同时用」，改 false 走 PixelMap.rotate()。 */
const EXIF_ROTATE_AT_DECODE: boolean = true;
/** 是否让系统按图片格式自动选 HDR / SDR 解码（平台不支持 HDR 时 SDK 会自动降级 SDR）。 */
const HDR_AUTO_DECODE: boolean = true;

/** 解码结果：uri + 已解码的 PixelMap + 显示宽高 + 解码档位 + 色彩/HDR/EXIF 元数据 */
export interface PreviewEntry {
  uri: string;
  px: image.PixelMap;
  bytes: number;
  w: number;    // 按 EXIF 摆正后的显示宽（用于 1:1 与信息栏，非 PixelMap 宽）
  h: number;    // 按 EXIF 摆正后的显示高
  edge: number; // 解码时的长边档位 —— 用来判断「这张够不够直接上主视图」
  colorSpace: number; // 系统 codec 识别出的内嵌色彩空间（colorSpaceManager.ColorSpace 数值）
  isHdr: boolean;     // 源图是否 HDR（ImageInfo.isHdr）
  exifDegrees: number;// 本张按 EXIF 摆正的角度（0/90/180/270）
  /** 第七十一轮：源图原始尺寸（未缩放，用于 HDR 保真核验与信息栏）。 */
  srcW: number;
  srcH: number;
  /** 解码产物 PixelMap.getImageInfo().isHdr —— 真正上屏的高动态范围状态。 */
  isHdrDecoded: boolean;
  /** 本张 HDR 结果原因码（HP_OK_HDR / HP_NO_HDR_META / HP_HDR_DOWNGRADED …）。 */
  hdrCode: number;
  /** 界面要显示的明确提示（正常态为空串）。 */
  hdrHint: string;
  /** 第七十七轮：本张是否确有【有效 EXIF 数据】= pmExifEffectiveOf(exifFields)。
   *  右上角图标与资料框字段同源：显示图标 ⇔ 至少有一个可读字段 ⇔ 资料框一定有内容。
   *  不再用「字节级含段」粗判（会标错），也不再让 fd 兜底路径恒 false（会漏标）。 */
  hasExif: boolean;
  /** 第七十七轮：EXIF 资料框字段；无有效字段时为空数组（图标同时不显示）。 */
  exifFields: Array<PmExifField>;
}

// ---- 第七十一轮：解码失败原因（uri 粒度，供界面给明确提示） ----
/** 与 EXIF_CACHE 同口径的模块级小表；只记最近 256 个失败 uri，不参与正常链路。 */
const DECODE_FAIL_MAX: number = 256;
const decodeFailByUri: Map<string, number> = new Map();
function noteDecodeFail(uri: string, code: number): void {
  if (decodeFailByUri.size >= DECODE_FAIL_MAX) {
    decodeFailByUri.clear();
  }
  decodeFailByUri.set(uri, code);
}
function clearDecodeFail(uri: string): void {
  decodeFailByUri.delete(uri);
}
/** 供 pages/Index.ets 在自解码失败时取明确原因码。 */
export function decodeFailCodeOf(uri: string): number {
  const c: number | undefined = decodeFailByUri.get(uri);
  return c === undefined ? HP_OK_SDR : c;
}
/** 供 pages/Index.ets 直接取中文提示（正常态返回空串）。 */
export function decodeFailHintOf(uri: string, w: number, h: number): string {
  return hpHintOf(decodeFailCodeOf(uri), w, h);
}

/** EXIF 变换缓存：同一张图在预载 / 主视图 / 悬停缩略图之间只读一次元数据。
 *  getImageProperty 是跨进程调用，201 张窗口里逐张读会明显拖慢预载链。 */
const EXIF_CACHE: Map<string, ExifTransform> = new Map();
const EXIF_CACHE_MAX: number = 512;

async function readExifTransform(src: image.ImageSource, uri: string): Promise<ExifTransform> {
  const cached: ExifTransform | undefined = EXIF_CACHE.get(uri);
  if (cached !== undefined) {
    return cached;
  }
  let t: ExifTransform = { degrees: 0, flipH: false, flipV: false };
  try {
    // 没有 EXIF / 该格式不支持时 SDK 会抛；一律当成「不旋转」，绝不因此丢掉整张图。
    const raw: string = await src.getImageProperty(image.PropertyKey.ORIENTATION);
    t = exifTransformOf(raw);
  } catch (e) {
    // 元数据读取失败不影响解码主流程
  }
  if (EXIF_CACHE.size >= EXIF_CACHE_MAX) {
    EXIF_CACHE.clear();
  }
  EXIF_CACHE.set(uri, t);
  return t;
}

/** 第七十七轮：EXIF 字段按 uri 缓存（与 EXIF_CACHE 同口径）。
 *  预载低清档 / 主视图高清档 / 悬停缩略图会多次 decodePx 同一张图，
 *  缓存后每张只发一轮 SDK 读取，避免 8 × N 次跨进程往返。 */
const EXIF_FIELDS_CACHE: Map<string, Array<PmExifField>> = new Map();
const EXIF_FIELDS_CACHE_MAX: number = 512;

/** 第七十七轮：EXIF 资料框字段 —— 图标显隐与资料框的**共同真值源**。
 *  · shouldRead 由 pmExifShouldReadOf(段粗筛, 是否拿到完整 bytes) 给出：
 *    段命中 → 读；fd 兜底路径没有 bytes 可判 → **也读一次**（R76 在这里恒 false，
 *    导致有 EXIF 的相片既不显示图标、资料框也空）；明确无段的普通相片 → 跳过。
 *  · 只有真正读到字段才缓存；「无段」不缓存空结果，避免一次粗筛把后续读权限锁死。
 *  · 每个字段独立 try/catch：某机型不支持某个 PropertyKey 不影响其它字段与解码主流程；
 *  · 值归一 / 有效性判定的真值源在 common/PictureMenu.ts，本函数只负责「异步读 + 过滤无效行」。 */
async function readExifFields(src: image.ImageSource, uri: string,
  shouldRead: boolean): Promise<Array<PmExifField>> {
  const cached: Array<PmExifField> | undefined = EXIF_FIELDS_CACHE.get(uri);
  if (cached !== undefined) {
    return cached;
  }
  const out: Array<PmExifField> = [];
  if (!shouldRead) {
    return out;
  }
  const keys: Array<image.PropertyKey> = [
    image.PropertyKey.DATE_TIME_ORIGINAL,
    image.PropertyKey.EXPOSURE_TIME,
    image.PropertyKey.F_NUMBER,
    image.PropertyKey.ISO_SPEED_RATINGS,
    image.PropertyKey.FOCAL_LENGTH,
    image.PropertyKey.MAKE,
    image.PropertyKey.MODEL,
    image.PropertyKey.WHITE_BALANCE
  ];
  for (let i = 0; i < keys.length && i < PM_EXIF_LABELS.length; i++) {
    let raw: string = '';
    try {
      raw = await src.getImageProperty(keys[i]);
    } catch (e) {
      raw = '';
    }
    const f: PmExifField = pmExifFieldOf(PM_EXIF_LABELS[i], raw);
    if (f.value !== PM_EXIF_UNKNOWN && pmExifFieldWantedOf(f)) {
      out.push(f);
    }
  }
  if (EXIF_FIELDS_CACHE.size >= EXIF_FIELDS_CACHE_MAX) {
    EXIF_FIELDS_CACHE.clear();
  }
  EXIF_FIELDS_CACHE.set(uri, out);
  return out;
}

// --------------------------------------------------------------------
// 原始档案数据（未解码 bytes）的内存缓存（2026-11-12 第八轮）
//
// 用户要求：「档案数据完全载入内存同时解码以提高图片档案载入速度」。
// 载入链 pumpAll 每批先把这一批文件的完整 bytes 读进这里，decodePx 再直接从
// ArrayBuffer 建 ImageSource —— NAS / 网络目录只读一次，解码、重解全清、全屏放大
// 都不必再跨网络读一遍原文件。
//
// 三条硬约束（沿用历史 appfreeze 教训）：
//  · 受控并发：调用方 pumpAll 一批最多 PRELOAD_CONCURRENCY 路，绝不堆叠同步 IO；
//  · 在途合并：同一 uri 并发请求共用一个 Promise，绝不重复读同一文件；
//  · 防 OOM：LRU + rawFitOf 张数/字节预算；读不到 / 超预算时 decodePx 自动降级回 fd，
//    功能绝不因缓存未命中而受损。
// 第二十七轮（2026-11-16 NAS THREAD_BLOCK_6S）：read() 改为**真异步** ——
//   stat/open/read/close 全用 Promise 版并 await，主线程在每个 await 处让出，
//   NAS 网络往返不再占住 UI 线程；ensure() 再套一层「到点即放弃」超时闸门。
// 换数据源时 clear() 自增 gen：旧批次读回来的 bytes 只用于本次解码，不再污染新图库。
// --------------------------------------------------------------------
export class RawStore {
  private data: Map<string, ArrayBuffer> = new Map();
  private order: string[] = [];                 // LRU：队头最旧
  private bytes: number = 0;
  private inflight: Map<string, Promise<ArrayBuffer | undefined>> = new Map();
  private denied: Set<string> = new Set();     // 不适合内存缓存的 uri：别反复 fs.stat/fs.read
  private gen: number = 0;

  /** 同步查内存；命中刷新 LRU 位置。probeOne() 用它零 IO 探元数据。 */
  get(uri: string): ArrayBuffer | undefined {
    const buf: ArrayBuffer | undefined = this.data.get(uri);
    if (buf === undefined) {
      return undefined;
    }
    const i: number = this.order.indexOf(uri);
    if (i >= 0) {
      this.order.splice(i, 1);
      this.order.push(uri);
    }
    return buf;
  }

  /** 确保该 uri 的完整 bytes 已在内存（或已在途）。返回 undefined 表示「本次不缓存」，
   *  调用方 decodePx 会降级回 fd 解码 —— 功能绝不因缓存未命中而受损。
   *
   *  第二十七轮：read() 已改成**真异步**（stat / open / read / close 全是 Promise 版
   *  await，主线程在每个 await 处让出），再套一层「到点即放弃」闸门：死 NAS 路径上
   *  fs.read 的 Promise 可能永不 settle，没有上限就会让 inflight / allActive 永久
   *  挂住，整条预载链假死。 */
  ensure(uri: string): Promise<ArrayBuffer | undefined> {
    const hit: ArrayBuffer | undefined = this.get(uri);
    if (hit !== undefined) {
      return Promise.resolve<ArrayBuffer | undefined>(hit);
    }
    if (this.denied.has(uri)) {
      return Promise.resolve<ArrayBuffer | undefined>(undefined);
    }
    const running: Promise<ArrayBuffer | undefined> | undefined = this.inflight.get(uri);
    if (running !== undefined) {
      return running;
    }
    const gen: number = this.gen;
    const job: Promise<ArrayBuffer | undefined> = this.readGuarded(uri, gen)
      .then((buf: ArrayBuffer | undefined): ArrayBuffer | undefined => {
        this.inflight.delete(uri);
        return buf;
      })
      .catch((): ArrayBuffer | undefined => {
        this.inflight.delete(uri);
        return undefined;
      });
    this.inflight.set(uri, job);
    return job;
  }

  /** 第二十七轮：真异步读取 + 超时放弃闸门。
   *  · 上限用 rawIoTimeoutMs 以单文件上限作保守体积上界（stat 之前拿不到真实 size），
   *    capMs 是决定性硬上限；结果恒为有限整数，绝不把 NaN / Infinity 传给 setTimeout。
   *  · settled 单闸：定时器与 IO 回调只可能有一个生效，绝不二次 resolve。
   *  · 到点即放弃：rawDenyAfterFailure 判定后记 denied，本次解码降级 fd、功能不受损；
   *    换源（gen 变了）绝不拉黑，避免新图库里同一个 uri 被永久误判。
   *  · 底层 fs 的 Promise 应用无法真正取消；超时后它若在后台返回，read() 会因
   *    denied 已置位而跳过缓存插入 —— 但主线程从始至终空闲，不会再触发 appfreeze。 */
  private readGuarded(uri: string, gen: number): Promise<ArrayBuffer | undefined> {
    const limitMs: number = rawIoTimeoutMs(RAW_SINGLE_MAX_BYTES,
      RAW_IO_BASE_MS, RAW_IO_PER_MB_MS, RAW_IO_CAP_MS);
    let settled: boolean = false;
    let timer: number = -1;
    return new Promise<ArrayBuffer | undefined>(
      (resolve: (v: ArrayBuffer | undefined | PromiseLike<ArrayBuffer | undefined>) => void): void => {
        if (limitMs > 0) {
          timer = setTimeout((): void => {
            if (settled) {
              return;
            }
            settled = true;
            if (rawDenyAfterFailure(gen !== this.gen, false, true)) {
              this.denied.add(uri);
            }
            hilog.warn(DOMAIN, TAG,
              'rawCache read TIMEOUT uri=%{public}s limit=%{public}d', uri, limitMs);
            resolve(undefined);
          }, limitMs);
        }
        this.read(uri, gen).then((buf: ArrayBuffer | undefined): void => {
          if (settled) {
            return;
          }
          settled = true;
          if (timer >= 0) {
            clearTimeout(timer);
          }
          resolve(buf);
        }).catch((): void => {
          if (settled) {
            return;
          }
          settled = true;
          if (timer >= 0) {
            clearTimeout(timer);
          }
          resolve(undefined);
        });
      });
  }

  /** 真正的一次性读取（第二十七轮：全部改成 Promise 版异步 IO）。
   *  · fs.stat / fs.open / fs.read / fs.close 每个都 await，主线程在每个 await 处让出，
   *    NAS 网络往返不再占住 UI 线程 —— 这是 THREAD_BLOCK_6S 的根治。
   *  · 所有 await 集中在 IO 阶段；buf 到手后的预算计算与 LRU 插入是**同一段同步代码**
   *    （中间无 await），与改前一样原子，不会被同批其它读取插队。
   *  · 唯一仍在主线程的同步操作是 new ArrayBuffer(size) 清零：纯内存、无 IPC / 无网络，
   *    且被 RAW_SINGLE_MAX_BYTES=64MB 夹死，不可能挂 6 秒。
   *  · 读满校验 / 单文件上限 / 换源判定 / 预算淘汰 / LRU 账目全部保持原语义。 */
  private async read(uri: string, gen: number): Promise<ArrayBuffer | undefined> {
    let file: fs.File | undefined = undefined;
    try {
      const st: fs.Stat = await fs.stat(uri);
      const size: number = st.size;
      if (!rawSingleAllowed(size, RAW_SINGLE_MAX_BYTES)) {
        this.denied.add(uri);
        return undefined;
      }
      file = await fs.open(uri, fs.OpenMode.READ_ONLY);
      const buf: ArrayBuffer = new ArrayBuffer(size);
      // 两参重载：刚 open 的文件指针在 0，一次读满整个 buffer。刻意不传 options，
      // 避开各 SDK 版本 ReadOptions.offset 语义差异；没读满就绝不交给 ImageSource。
      const got: number = await fs.read(file.fd, buf);
      if (!rawReadComplete(got, size)) {
        // 网络 / 大文件一次读不满：别每次解码都重读一遍，直接降级 fd 路径更稳。
        this.denied.add(uri);
        return undefined;
      }
      // 换源了、或这张已被超时闸门放弃：本次解码仍可用，但不入新图库的缓存。
      if (gen !== this.gen || this.denied.has(uri)) {
        return buf;
      }
      const fit: RawFit = rawFitOf(this.sizesOf(), size,
        RAW_CACHE_MAX_BYTES, RAW_CACHE_MAX_COUNT);
      if (!fit.keep) {
        return buf;         // 预算装不下：仍用内存解这一次，只是不驻留
      }
      for (let i = 0; i < fit.evict; i++) {
        const oldest: string = this.order[0];
        this.order.splice(0, 1);
        const victim: ArrayBuffer | undefined = this.data.get(oldest);
        this.data.delete(oldest);
        if (victim !== undefined) {
          this.bytes -= victim.byteLength;
        }
      }
      this.data.set(uri, buf);
      this.order.push(uri);
      this.bytes += size;
      return buf;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'rawCache read FAIL uri=%{public}s err=%{public}s',
        uri, JSON.stringify(e));
      if (rawDenyAfterFailure(gen !== this.gen, true, false)) {
        this.denied.add(uri);
      }
      return undefined;
    } finally {
      if (file !== undefined) {
        try {
          await fs.close(file);
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'rawCache close skipped');
        }
      }
    }
  }

  /** 队头→队尾各条字节数，喂给 rawFitOf 算淘汰条数。 */
  private sizesOf(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.order.length; i++) {
      const b: ArrayBuffer | undefined = this.data.get(this.order[i]);
      out.push(b !== undefined ? b.byteLength : 0);
    }
    return out;
  }

  /** 换数据源 / 退出时清空。gen 自增让在途读取的结果不再入缓存。 */
  clear(): void {
    this.gen++;
    this.data.clear();
    this.order = [];
    this.bytes = 0;
    this.inflight.clear();
    this.denied.clear();
  }

  /** 排查用账目（hilog / 诊断串），不参与任何逻辑判断。 */
  stat(): string {
    return this.data.size + '/' + Math.round(this.bytes / (1024 * 1024)) + 'MB';
  }
}

export const rawStore: RawStore = new RawStore();

/** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
 *  edge = QUICK_EDGE 低清占位 / preloadEdge() 预载 / viewEdge() 全清 / HOVER_EDGE 悬停缩略图。
 *
 *  2026-11-11 增加三件事（共用一个 DecodingOptions，不再只有 desiredSize）：
 *    ① EXIF Orientation → 解码阶段旋转 + 镜像（`ViewPlan.exifTransformOf`）；
 *    ② desiredDynamicRange = AUTO → HDR 图按 HDR 解码，平台不支持时 SDK 自动降 SDR；
 *    ③ 内嵌 ICC 色彩空间：COLOR_MANAGE_MODE=0 保留源空间，1/2 才在解码时转换到 sRGB / Display P3；
 *       解码后读 PixelMap.getColorSpace() 记录系统识别到的空间，用于信息浮层。
 *  2026-11-12 第八轮 ④：优先用 RawStore 里已载入内存的**完整原始档案数据**建
 *  ImageSource（ArrayBuffer 重载），不再为每张图 openSync + 让 codec 逐段读文件。
 *  ensure 返回 undefined（超预算 / 单文件过大 / 读不满 / 超时 / 无权限）时降级回 fd 路径，
 *  功能绝不受缓存影响。EXIF / HDR / ICC 三件事在两种 ImageSource 上完全一致。
 *  2026-11-16 第二十七轮 ⑤：fd 兜底也从 fs.openSync 改为 await fs.open，
 *  NAS 死路径上这次跨进程 open 同样不再占住 UI 主线程。 */
/** 第六十五轮：天文图像专用真异步整文件读取。
 *  刻意不复用 rawStore.ensure —— 它按 RAW_SINGLE_MAX_BYTES=64MB 夹死单文件且会
 *  把大图塞进普通图片 LRU；FITS 动辄上百 MB。这里全程 await 现成的异步 IO，
 *  不自行构造 Promise、不引入竞速等待、不做同步 IO；一次性读满，读不满即明确失败。 */
const ASTRO_MAX_BYTES: number = 512 * 1024 * 1024; // 512MB 防 OOM 上限
async function readAstroBytes(uri: string): Promise<ArrayBuffer | undefined> {
  let file: fs.File | undefined = undefined;
  try {
    const st: fs.Stat = await fs.stat(uri);
    const size: number = st.size;
    // 第六十六轮：走纯函数尺寸护栏，0 / 负数 / NaN / 超限一律拒绝，不分配畸形缓冲区。
    if (!aiAllocAllowedOf(size, ASTRO_MAX_BYTES)) {
      return undefined;
    }
    file = await fs.open(uri, fs.OpenMode.READ_ONLY);
    const buf: ArrayBuffer = new ArrayBuffer(size);
    // 与 openTextFile / RawStore.read 同口径：两参重载，刚 open 文件指针在 0 一次读满。
    const got: number = await fs.read(file.fd, buf);
    await fs.close(file.fd);
    file = undefined;
    if (got !== size) {
      return undefined;
    }
    return buf;
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'astro read FAIL uri=%{public}s err=%{public}s',
      uri, JSON.stringify(e));
    if (file !== undefined) {
      try { await fs.close(file.fd); } catch (e2) { /* 关不掉不影响失败态 */ }
    }
    return undefined;
  }
}

/** 第六十六轮：大压缩块的反 shuffle 分片版。R65 的 aiUnshuffleOf 是
 *  一段 O(n) 同步长循环，挂在 await zip.uncompress 的续体上同样会饿死 EventHandler；
 *  超过 AI_UNSHUFFLE_SLICE_LIMIT 就按「字节平面 × 样本片」切开，片间宏任务让出。
 *  输出与一次性 aiUnshuffleOf 逐字节一致（同一个预分配 out，只是写入顺序分片）。 */
async function astroUnshuffleSliced(src: Uint8Array, itemSize: number): Promise<Uint8Array> {
  const count: number = Math.floor(src.length / itemSize);
  const out: Uint8Array = new Uint8Array(count * itemSize);
  const slices: number = aiSliceCountOf(count, AI_UNSHUFFLE_SLICE_ITEMS);
  for (let plane = 0; plane < itemSize; plane++) {
    for (let i = 0; i < slices; i++) {
      const i0: number = aiSliceI0Of(i, AI_UNSHUFFLE_SLICE_ITEMS);
      const i1: number = aiSliceI1Of(i, AI_UNSHUFFLE_SLICE_ITEMS, count);
      aiUnshuffleSliceOf(src, itemSize, count, out, plane, i0, i1);
      await yieldMacroTask(AI_SLICE_YIELD_MS);
    }
  }
  return out;
}

/** 从原始字节里切出「已解压 + 已反 shuffle」的纯像素段。
 *  无压缩直接切片；zlib（XISF 压缩块）用 SDK 内存级 uncompress，失败返回 undefined。
 *  第六十六轮：解压前后都走 aiAllocAllowedOf 纯函数尺寸护栏（256MB 上限），
 *  超限明确失败而不是先分配一大块再失败；大块反 shuffle 改走分片让出版。 */
async function astroPixelsOf(raw: ArrayBuffer, head: AstroHeader): Promise<Uint8Array | undefined> {
  const off: number = head.dataOffset;
  const len: number = head.dataLength;
  if (off < 0 || len <= 0 || off + len > raw.byteLength) {
    return undefined;
  }
  if (head.compressed === AI_COMP_ZLIB) {
    if (!aiAllocAllowedOf(head.uncompressedSize, AI_MAX_UNCOMPRESSED_BYTES)) {
      hilog.warn(DOMAIN, TAG, 'astro zlib size DENY bytes=%{public}d', head.uncompressedSize);
      return undefined;
    }
    try {
      const src: ArrayBuffer = raw.slice(off, off + len);
      const dest: ArrayBuffer = new ArrayBuffer(head.uncompressedSize);
      const zip: zlib.Zip = zlib.createZipSync();
      await zip.uncompress(dest, src);
      const decoded: Uint8Array = new Uint8Array(dest);
      if (head.shuffleItemSize > 1) {
        if (decoded.length <= AI_UNSHUFFLE_SLICE_LIMIT) {
          return aiUnshuffleOf(decoded, head.shuffleItemSize);
        }
        return await astroUnshuffleSliced(decoded, head.shuffleItemSize);
      }
      return decoded;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'astro zlib uncompress FAIL err=%{public}s', JSON.stringify(e));
      return undefined;
    }
  }
  if (!aiAllocAllowedOf(len, AI_MAX_UNCOMPRESSED_BYTES)) {
    hilog.warn(DOMAIN, TAG, 'astro segment size DENY bytes=%{public}d', len);
    return undefined;
  }
  const seg: Uint8Array = new Uint8Array(raw, off, len);
  if (head.shuffleItemSize > 1) {
    if (seg.length <= AI_UNSHUFFLE_SLICE_LIMIT) {
      return aiUnshuffleOf(seg, head.shuffleItemSize);
    }
    return await astroUnshuffleSliced(seg, head.shuffleItemSize);
  }
  return seg;
}

/** 第六十六轮：把 R65 的一整段 O(dw*dh) 同步循环切成 24 行一片，片间宏任务让出。
 *  · 先按 AI_MAX_CONCURRENT_RENDER 拿重计算槽位（等待期间也用宏任务让出，不丢弃解码）；
 *  · 目标总像素已由 aiTargetSizeSafeOf 夹到 4M，单片最多 24×2048 ≈ 5 万像素；
 *  · 小图（一片以内）仍走 R65 的 aiRgbaOf 一次性纯函数，数值模型逐字不变；
 *  · 结果数组与 aiRgbaOf 完全一致：列映射表预建、灰度只采样一次、alpha 恒 255。 */
async function astroRgbaOf(pixels: Uint8Array, head: AstroHeader, sz: AstroSize,
  bounds: AstroBounds): Promise<Uint8Array> {
  while (!aiRenderSlotAllowedOf(astroRenderActive, AI_MAX_CONCURRENT_RENDER)) {
    await yieldMacroTask(AI_SLICE_YIELD_MS);
  }
  astroRenderActive++;
  try {
    const slices: number = aiSliceCountOf(sz.h, AI_SLICE_ROWS);
    if (slices <= 1) {
      return aiRgbaOf(pixels, head, sz.w, sz.h, bounds, AI_STRETCH_GAMMA, AI_OUTPUT_BGRA);
    }
    const rgba: Uint8Array = new Uint8Array(sz.w * sz.h * 4);
    const sxTable: number[] = aiSxTableOf(head.width, sz.w);
    for (let i = 0; i < slices; i++) {
      const y0: number = aiSliceI0Of(i, AI_SLICE_ROWS);
      const y1: number = aiSliceI1Of(i, AI_SLICE_ROWS, sz.h);
      aiRgbaSliceOf(pixels, head, sz.w, sz.h, bounds, AI_STRETCH_GAMMA,
        AI_OUTPUT_BGRA, rgba, sxTable, y0, y1);
      if (i + 1 < slices) {
        await yieldMacroTask(AI_SLICE_YIELD_MS);
      }
    }
    return rgba;
  } finally {
    astroRenderActive--;
  }
}

/** 第六十五轮：FITS / XISF 自解析解码。系统 codec 不认这两种格式，
 *  由 AstroImage.ts 纯函数完成头解析 / 样本解码 / 拉伸，本函数只碰 SDK IO 与 PixelMap。
 *  全程真异步、不阻塞主线程；任何环节失败都 hilog 明确原因并返回 undefined（既有失败态）。
 *  第六十六轮：目标尺寸改走 aiTargetSizeSafeOf（长边夹界 + 总像素 4M 硬上限），
 *  RGBA 组装改走 astroRgbaOf（分片 + 片间宏任务让出 + 重计算槽位串行化），
 *  从根上消除 THREAD_BLOCK_6S 的 CPU 独占；createPixelMap 与既有失败态逐字不变。 */
async function decodeAstroPx(uri: string, edge: number): Promise<PreviewEntry | undefined> {
  const raw: ArrayBuffer | undefined = await readAstroBytes(uri);
  if (raw === undefined) {
    hilog.warn(DOMAIN, TAG, 'astro decode: read bytes FAIL uri=%{public}s', uri);
    return undefined;
  }
  const bytes: Uint8Array = new Uint8Array(raw);
  const head: AstroHeader = aiHeaderOf(uri, bytes);
  if (head.ok !== AI_OK) {
    hilog.warn(DOMAIN, TAG, 'astro header FAIL uri=%{public}s code=%{public}d hint=%{public}s',
      uri, head.ok, aiFailHintOf(head.ok, uri));
    return undefined;
  }
  const pixels: Uint8Array | undefined = await astroPixelsOf(raw, head);
  if (pixels === undefined || !aiPixelsLongEnough(pixels, head)) {
    hilog.warn(DOMAIN, TAG, 'astro pixels FAIL uri=%{public}s', uri);
    return undefined;
  }
  try {
    const bounds: AstroBounds = aiBoundsOf(pixels, head);
    const sz: AstroSize = aiTargetSizeSafeOf(head.width, head.height, edge, AI_MAX_TARGET_PIXELS);
    const rgba: Uint8Array = await astroRgbaOf(pixels, head, sz, bounds);
    const opts: image.InitializationOptions = {
      size: { height: sz.h, width: sz.w },
      pixelFormat: image.PixelMapFormat.RGBA_8888,
      alphaType: image.AlphaType.OPAQUE
    };
    // rgba 由 aiRgbaOf / astroRgbaOf 用 new Uint8Array(sz.w*sz.h*4) 生成，.buffer 长度正好。
    const px: image.PixelMap = await image.createPixelMap(rgba.buffer, opts);
    // 第七十六轮：FITS / XISF 是自解析的天文图，没有 EXIF 段 → 图标恒不显示、资料框恒空。
    const noExifFields: Array<PmExifField> = [];
    const entry: PreviewEntry = {
      uri: uri, px: px, bytes: sz.w * sz.h * 4,
      w: sz.w, h: sz.h, edge: edge,
      colorSpace: 0, isHdr: false, exifDegrees: 0,
      srcW: sz.w, srcH: sz.h, isHdrDecoded: false,
      hdrCode: HP_OK_SDR, hdrHint: '',
      hasExif: false, exifFields: noExifFields
    };
    return entry;
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'astro createPixelMap FAIL uri=%{public}s err=%{public}s',
      uri, JSON.stringify(e));
    return undefined;
  }
}

export async function decodePx(uri: string, edge: number): Promise<PreviewEntry | undefined> {
  // 第六十五轮：FITS / XISF 走自解析链（系统 codec 不认），其余格式逻辑逐字不变。
  if (aiIsAstroName(uri)) {
    return decodeAstroPx(uri, edge);
  }
  let file: fs.File | undefined = undefined;
  let src: image.ImageSource | undefined = undefined;
  let bytesReadable: boolean = false;
  // 第七十七轮：字节级只作「是否值得读 SDK 字段」的粗筛，不再是图标显隐真值；
  // fd 兜底路径没有字节可验时 exifSeg=false，但 pmExifShouldReadOf 会因为
  // bytesReadable=false 而放行一次 SDK 读取 —— 有 EXIF 的相片不会再被漏标。
  let exifSeg: boolean = false;
  // 第七十一轮：容器层探测只在拿到完整原始字节时做；fd 兜底路径没有字节可验，
  // 保持按扩展名分流，绝不把非 HEIC 文件误判成损坏。
  let probe: HpProbe = hpProbeOf(uri, new Uint8Array(0));
  try {
    const raw: ArrayBuffer | undefined = await rawStore.ensure(uri);
    bytesReadable = raw !== undefined;
    if (raw !== undefined) {
      // 第七十一轮容器预检逐字保留（new Uint8Array(raw) 形态不变）；EXIF 段另取同一批字节。
      probe = hpProbeOf(uri, new Uint8Array(raw));
      exifSeg = pmExifPresentOf(new Uint8Array(raw));
      src = image.createImageSource(raw);
    } else {
      // 第二十七轮：fd 兜底路径也改 await fs.open（同 RawStore.read 的真异步口径）。
      // 缓存未命中 / 超时放弃时，这次跨进程 open 同样不能占住 UI 主线程。
      file = await fs.open(uri, fs.OpenMode.READ_ONLY);
      src = image.createImageSource(file.fd);
    }
    // 容器层已明确判损坏 / 不兼容：不进 codec，直接给明确失败原因。
    if (probe.format === HP_FMT_CORRUPT || probe.format === HP_FMT_INCOMPATIBLE) {
      const bad: number = hpFailCodeOf(probe.format, false, true);
      noteDecodeFail(uri, bad);
      hilog.warn(DOMAIN, TAG, 'decodePx HEIC REJECT uri=%{public}s code=%{public}d hint=%{public}s',
        uri, bad, hpHintOf(bad, 0, 0));
      return undefined;
    }
    const info: image.ImageInfo = await src.getImageInfo();
    const w: number = info.size.width;
    const h: number = info.size.height;
    const isHdrSource: boolean = info.isHdr === true;
    const request: number = hpRequestOf(isHdrSource, probe.format, probe.hdrMeta.present);
    // 第七十一轮：HDR HEIC 在像素护栏内按原始尺寸解码；其余逐字沿用既有档位算法。
    const sz: HpDecodeSize = hpDecodeSizeOf(w, h, edge,
      isHdrSource || probe.hdrMeta.present, probe.format);
    const dw: number = sz.w;
    const dh: number = sz.h;
    if (dw <= 0 || dh <= 0) {
      return undefined;
    }

    let exif: ExifTransform = { degrees: 0, flipH: false, flipV: false };
    if (EXIF_AUTO_ROTATE) {
      exif = await readExifTransform(src, uri);
    }
    // 第七十七轮：字节级结果只决定「要不要读 SDK」；fd 兜底路径没有完整 bytes
    // 也读一次（R76 在这里恒判无 EXIF）。最终 hasExif 由实际读到的有效字段决定。
    const exifFields: Array<PmExifField> = await readExifFields(src, uri,
      pmExifShouldReadOf(exifSeg, bytesReadable));

    const opts: image.DecodingOptions = { desiredSize: { width: dw, height: dh } };
    if (EXIF_AUTO_ROTATE && exif.degrees !== 0 && EXIF_ROTATE_AT_DECODE) {
      opts.rotate = exif.degrees;
    }
    // 第七十一轮：源为 HDR（或容器带 HDR 元数据）时**显式请求 HDR 档**，
    // 不再让 AUTO 在平台不支持时静默压缩动态范围；非 HDR 图仍走既有 AUTO。
    if (request === HP_RANGE_HDR) {
      opts.desiredDynamicRange = image.DecodingDynamicRange.HDR;
    } else if (HDR_AUTO_DECODE) {
      opts.desiredDynamicRange = image.DecodingDynamicRange.AUTO;
    }
    // HDR 图禁止在解码时强制转 sRGB / Display P3（会造成色彩失真）。
    const colorMode: number = hpColorSpacePreservedOf(COLOR_MANAGE_MODE, isHdrSource)
      ? COLOR_MANAGE_MODE : HP_COLORSPACE_PRESERVE;
    if (colorMode === 1) {
      opts.desiredColorSpace = colorSpaceManager.create(colorSpaceManager.ColorSpace.SRGB);
    } else if (colorMode === 2) {
      opts.desiredColorSpace = colorSpaceManager.create(colorSpaceManager.ColorSpace.DISPLAY_P3);
    }

    const px: image.PixelMap = await src.createPixelMap(opts);
    if (EXIF_AUTO_ROTATE && exif.degrees !== 0 && !EXIF_ROTATE_AT_DECODE) {
      await px.rotate(exif.degrees);
    }
    if (exif.flipH || exif.flipV) {
      await px.flip(exif.flipH, exif.flipV);
    }
    let cs: number = 0;
    try {
      cs = Number(px.getColorSpace().getColorSpaceName());
    } catch (e) {
      // 某些机型 / 格式不支持 getColorSpace：按「未标注」处理，不影响显示
    }
    // 第七十一轮：请求 HDR ≠ 得到 HDR —— 必须校验**解码产物**才是真值。
    let isHdrDecoded: boolean = false;
    let hdrKnown: boolean = false;
    try {
      const pxInfo: image.ImageInfo = await px.getImageInfo();
      isHdrDecoded = pxInfo.isHdr === true;
      hdrKnown = true;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'decodePx getImageInfo(px) skipped uri=%{public}s', uri);
    }
    let outcome: number = hpOutcomeOf(request, isHdrSource, isHdrDecoded);
    if (!hdrKnown && (isHdrSource || request === HP_RANGE_HDR)) {
      outcome = HP_HDR_UNVERIFIED;
    }
    let hint: string = hpHintOf(outcome, w, h);
    if (sz.capped && hint.length === 0) {
      outcome = HP_SIZE_CAPPED;
      hint = hpHintOf(outcome, w, h);
    }
    if (hpShowHintOf(outcome)) {
      hilog.warn(DOMAIN, TAG, 'decodePx HDR hint uri=%{public}s code=%{public}d hint=%{public}s',
        uri, outcome, hint);
    }
    const shown: Size2 = exifSizeOf(w, h, exif.degrees);
    clearDecodeFail(uri);
    const entry: PreviewEntry = {
      uri: uri, px: px, bytes: dw * dh * 4,
      w: shown.w, h: shown.h, edge: edge,
      colorSpace: cs, isHdr: info.isHdr === true, exifDegrees: exif.degrees,
      srcW: w, srcH: h, isHdrDecoded: isHdrDecoded,
      hdrCode: outcome, hdrHint: hint,
      // 第七十七轮：显隐真值 = 有效字段，与资料框同源（不再用字节段粗判）。
      hasExif: pmExifEffectiveOf(exifFields), exifFields: exifFields
    };
    return entry;
  } catch (e) {
    // ⚠️ 以前这里静默吞掉：图打不开时屏幕全白、日志全无，排查只能靠猜。
    //    目录浏览的 uri 权限 / 编码问题全靠这一行定位。
    //    第七十一轮：额外把明确原因码按 uri 落表，供界面显示「损坏 / 不兼容 / 解码失败」。
    const fail: number = hpFailCodeOf(probe.format, true, bytesReadable);
    noteDecodeFail(uri, fail);
    hilog.warn(DOMAIN, TAG, 'decodePx FAIL uri=%{public}s code=%{public}d hint=%{public}s err=%{public}s',
      uri, fail, hpHintOf(fail, 0, 0), JSON.stringify(e));
    return undefined;
  } finally {
    if (src !== undefined) {
      try {
        src.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'release ImageSource skipped');
      }
    }
    if (file !== undefined) {
      try {
        await fs.close(file);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'close file skipped');
      }
    }
  }
}

// ====================================================================
// 第六十七轮：放大镜系统 native 级抗锯齿缩放（本模块是全工程唯一碰该 SDK 的地方）
//
//  · 组件级 `.interpolation(High)` 是每帧由 UI 合成层做的 GPU 采样，倍率档只有
//    High/Low 二值，鼠标在圆内高频微动就反复重采样（R14–R17 基线）。
//  · SDK 26 `PixelMap.createScaledPixelMap(x, y, AntiAliasingLevel)`（since 18）
//    把「一次高质量重采样」下沉到系统图像管线：LOW=双线性 / MEDIUM=mipmap linear /
//    HIGH=Cubic。产物可直接 1:1 贴图，跨帧稳定一致，且只在倍率档变化时重算一次。
//  · 能力探测只读「方法是否存在」：低版本 ROM 上方法不存在 → lqCapabilityOf 自动
//    回退到组件级链（零回归）；方法存在但该 PixelMap 格式不支持 → catch 同样回退。
//  · 全部护栏（倍率 / 总像素 / 长边 / 脏值）由 common/LoupeQuality.ts 纯函数判定；
//    getImageInfo / createScaledPixelMap 全是 await 异步版，绝不占住 UI 主线程。
// ====================================================================

/** SDK image.AntiAliasingLevel 映射：数值与 LQ_AA_* 一一对应，不另造语义。
 *  脏值 / NONE 一律落到 LOW（双线性），绝不落到最近邻这个锯齿之源。 */
function lqSdkAaLevelOf(level: number): image.AntiAliasingLevel {
  if (level === LQ_AA_HIGH) {
    return image.AntiAliasingLevel.HIGH;
  }
  if (level === LQ_AA_MEDIUM) {
    return image.AntiAliasingLevel.MEDIUM;
  }
  return image.AntiAliasingLevel.LOW;
}

/** 运行时能力探测：API 达标（编译 SDK 26）+ 运行时方法确实存在才升档。
 *  只读函数存在性，不调用、不分配、不进启动路径，探针失败恒回退组件级。 */
export function loupeCapabilityOf(px: image.PixelMap): number {
  const hasScaled: boolean = typeof px.createScaledPixelMap === 'function';
  const hasCropped: boolean = typeof px.createCroppedAndScaledPixelMap === 'function';
  return lqCapabilityOf(LQ_API_PROBE_LEVEL, hasScaled, hasCropped);
}

/** 一次系统级 AA 缩放。成功返回**新** PixelMap（调用方自有，必须 release），
 *  能力不足 / 尺寸脏值 / 预算放不下 / SDK 抛错一律返回 undefined —— 页面侧
 *  继续用 R17 的高清重解码图源，放大镜绝不空白、绝不花屏、绝不回归。 */
export async function loupeSystemScaledPx(src: image.PixelMap, want: number,
  aa: number, cap: number): Promise<image.PixelMap | undefined> {
  if (cap < LQ_CAP_SYSTEM_AA) {
    return undefined;
  }
  let w: number = 0;
  let h: number = 0;
  try {
    const info: image.ImageInfo = await src.getImageInfo();
    w = info.size.width;
    h = info.size.height;
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'loupe R67 getImageInfo FAIL err=%{public}s', JSON.stringify(e));
    return undefined;
  }
  // 先按总像素 / 长边预算把「想要的倍率」夹成实际可用倍率，再复核是否允许分配。
  const factor: number = lqSafeFactorOf(w, h, want, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE);
  if (!lqScaleAllowedOf(w, h, factor, cap, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE)) {
    return undefined;
  }
  try {
    return await src.createScaledPixelMap(factor, factor, lqSdkAaLevelOf(aa));
  } catch (e) {
    // HDR / 特殊 pixelFormat / 低版本 ROM 的方法缺失都会走到这里：静默回退组件级链。
    hilog.warn(DOMAIN, TAG, 'loupe R67 createScaledPixelMap FAIL err=%{public}s',
      JSON.stringify(e));
    return undefined;
  }
}

// ====================================================================
// 第六十八轮：右侧主预览 resize 的系统 native 级 AA 精炼
//
//  · 与 R67 放大镜共用同一 SDK 能力 `createScaledPixelMap`（since 18），但护栏与 AA 档
//    由 common/ViewQuality.ts 独立判定 —— 两个入口互不改写，R67 代码逐字未动。
//  · 成功返回**调用方自有**的新 PixelMap（页面侧必须 release）；能力不足 / 尺寸脏值 /
//    预算放不下 / SDK 抛错一律返回 undefined ⇒ 页面静默回退 R62 组件级三档链。
//  · getImageInfo / createScaledPixelMap 全是 await 异步版，绝不占住 UI 主线程；
//    不新增等待原语、不引入定时器与工作线程（R66 appfreeze 的硬约束延续）。
// ====================================================================

/** VQ_AA_* → image.AntiAliasingLevel；脏值落 LOW（双线性），绝不落 NONE 这个锯齿之源。 */
function vqSdkAaLevelOf(level: number): image.AntiAliasingLevel {
  if (level === VQ_AA_HIGH) {
    return image.AntiAliasingLevel.HIGH;
  }
  if (level === VQ_AA_MEDIUM) {
    return image.AntiAliasingLevel.MEDIUM;
  }
  return image.AntiAliasingLevel.LOW;
}

/** 一次系统级 AA 精炼：真异步读尺寸 → 双重护栏 → native 缩放。 */
export async function viewSystemScaledPx(src: image.PixelMap, want: number,
  aa: number, cap: number): Promise<image.PixelMap | undefined> {
  if (cap < VQ_CAP_SYSTEM_AA) {
    return undefined;
  }
  let w: number = 0;
  let h: number = 0;
  try {
    const info: image.ImageInfo = await src.getImageInfo();
    w = info.size.width;
    h = info.size.height;
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'view R68 getImageInfo FAIL err=%{public}s', JSON.stringify(e));
    return undefined;
  }
  // 先按总像素 / 长边预算把「想要的倍率」夹成实际可用倍率，再复核是否允许分配。
  const factor: number = vqSafeFactorOf(w, h, want, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE);
  if (!vqScaleAllowedOf(w, h, factor, cap, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE)) {
    return undefined;
  }
  try {
    return await src.createScaledPixelMap(factor, factor, vqSdkAaLevelOf(aa));
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'view R68 createScaledPixelMap FAIL err=%{public}s',
      JSON.stringify(e));
    return undefined;
  }
}
