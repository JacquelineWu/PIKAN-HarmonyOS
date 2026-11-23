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
  AstroHeader, AstroBounds, AstroSize, aiIsAstroName, aiHeaderOf,
  aiFailHintOf, aiUnshuffleOf, aiBoundsOf, aiDisplaySizeOf, aiRgbaOf,
  aiPixelsLongEnough } from '../common/AstroImage';

// hilog 域（原 pages/Index.ets 顶部同值迁入；Index.ets 反向 import 本定义）。
export const TAG = 'HeicViewer';
export const DOMAIN = 0x0000;

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
    if (size <= 0 || size > ASTRO_MAX_BYTES) {
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

/** 从原始字节里切出「已解压 + 已反 shuffle」的纯像素段。
 *  无压缩直接切片；zlib（XISF 压缩块）用 SDK 内存级 uncompress，失败返回 undefined。 */
async function astroPixelsOf(raw: ArrayBuffer, head: AstroHeader): Promise<Uint8Array | undefined> {
  const off: number = head.dataOffset;
  const len: number = head.dataLength;
  if (off < 0 || len <= 0 || off + len > raw.byteLength) {
    return undefined;
  }
  if (head.compressed === AI_COMP_ZLIB) {
    try {
      const src: ArrayBuffer = raw.slice(off, off + len);
      const dest: ArrayBuffer = new ArrayBuffer(head.uncompressedSize);
      const zip: zlib.Zip = zlib.createZipSync();
      await zip.uncompress(dest, src);
      const decoded: Uint8Array = new Uint8Array(dest);
      if (head.shuffleItemSize > 1) {
        return aiUnshuffleOf(decoded, head.shuffleItemSize);
      }
      return decoded;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'astro zlib uncompress FAIL err=%{public}s', JSON.stringify(e));
      return undefined;
    }
  }
  const seg: Uint8Array = new Uint8Array(raw, off, len);
  if (head.shuffleItemSize > 1) {
    return aiUnshuffleOf(seg, head.shuffleItemSize);
  }
  return seg;
}

/** 第六十五轮：FITS / XISF 自解析解码。系统 codec 不认这两种格式，
 *  由 AstroImage.ts 纯函数完成头解析 / 样本解码 / 拉伸，本函数只碰 SDK IO 与 PixelMap。
 *  全程真异步、不阻塞主线程；任何环节失败都 hilog 明确原因并返回 undefined（既有失败态）。 */
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
    const sz: AstroSize = aiDisplaySizeOf(head.width, head.height, edge);
    const rgba: Uint8Array = aiRgbaOf(pixels, head, sz.w, sz.h,
      bounds, AI_STRETCH_GAMMA, AI_OUTPUT_BGRA);
    const opts: image.InitializationOptions = {
      size: { height: sz.h, width: sz.w },
      pixelFormat: image.PixelMapFormat.RGBA_8888,
      alphaType: image.AlphaType.OPAQUE
    };
    // rgba 由 aiRgbaOf 用 new Uint8Array(sz.w*sz.h*4) 生成，.buffer 长度正好，直接交给 codec。
    const px: image.PixelMap = await image.createPixelMap(rgba.buffer, opts);
    const entry: PreviewEntry = {
      uri: uri, px: px, bytes: sz.w * sz.h * 4,
      w: sz.w, h: sz.h, edge: edge,
      colorSpace: 0, isHdr: false, exifDegrees: 0
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
  try {
    const raw: ArrayBuffer | undefined = await rawStore.ensure(uri);
    if (raw !== undefined) {
      src = image.createImageSource(raw);
    } else {
      // 第二十七轮：fd 兜底路径也改 await fs.open（同 RawStore.read 的真异步口径）。
      // 缓存未命中 / 超时放弃时，这次跨进程 open 同样不能占住 UI 主线程。
      file = await fs.open(uri, fs.OpenMode.READ_ONLY);
      src = image.createImageSource(file.fd);
    }
    const info: image.ImageInfo = await src.getImageInfo();
    const w: number = info.size.width;
    const h: number = info.size.height;
    let dw: number = w;
    let dh: number = h;
    if (w > edge || h > edge) {
      const k: number = Math.max(w, h) / edge;
      dw = Math.max(1, Math.floor(w / k));
      dh = Math.max(1, Math.floor(h / k));
    }
    if (dw <= 0 || dh <= 0) {
      return undefined;
    }

    let exif: ExifTransform = { degrees: 0, flipH: false, flipV: false };
    if (EXIF_AUTO_ROTATE) {
      exif = await readExifTransform(src, uri);
    }

    const opts: image.DecodingOptions = { desiredSize: { width: dw, height: dh } };
    if (EXIF_AUTO_ROTATE && exif.degrees !== 0 && EXIF_ROTATE_AT_DECODE) {
      opts.rotate = exif.degrees;
    }
    if (HDR_AUTO_DECODE) {
      opts.desiredDynamicRange = image.DecodingDynamicRange.AUTO;
    }
    if (COLOR_MANAGE_MODE === 1) {
      opts.desiredColorSpace = colorSpaceManager.create(colorSpaceManager.ColorSpace.SRGB);
    } else if (COLOR_MANAGE_MODE === 2) {
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
    const shown: Size2 = exifSizeOf(w, h, exif.degrees);
    const entry: PreviewEntry = {
      uri: uri, px: px, bytes: dw * dh * 4,
      w: shown.w, h: shown.h, edge: edge,
      colorSpace: cs, isHdr: info.isHdr === true, exifDegrees: exif.degrees
    };
    return entry;
  } catch (e) {
    // ⚠️ 以前这里静默吞掉：图打不开时屏幕全白、日志全无，排查只能靠猜。
    //    目录浏览的 uri 权限 / 编码问题全靠这一行定位。
    hilog.warn(DOMAIN, TAG, 'decodePx FAIL uri=%{public}s err=%{public}s', uri, JSON.stringify(e));
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
