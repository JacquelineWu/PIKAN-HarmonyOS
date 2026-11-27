/**
 * 预览视图策略纯函数（2026-11-11）：真全屏 / 最高画质重采样 / ICC 色彩 / HDR / EXIF 旋转。
 *
 * 这里全部是无 IO 的纯函数，Node 侧可直接 import 做回归测试
 * （`node --experimental-strip-types tests/dirname.test.mjs`），不依赖任何鸿蒙 SDK。
 * 真正的 SDK 调用留在 Index.ets，本文件只负责「该用哪个值」的判断。
 */

/** EXIF Orientation(0x0112) 解析出来的显示变换。 */
export interface ExifTransform {
  degrees: number;  // 顺时针角度：0 / 90 / 180 / 270
  flipH: boolean;   // 是否还要水平镜像
  flipV: boolean;   // 是否还要垂直镜像
}

export interface Size2 {
  w: number;
  h: number;
}

export const EXIF_TOP_LEFT: number = 1;
export const EXIF_TOP_RIGHT: number = 2;
export const EXIF_BOTTOM_RIGHT: number = 3;
export const EXIF_BOTTOM_LEFT: number = 4;
export const EXIF_LEFT_TOP: number = 5;
export const EXIF_RIGHT_TOP: number = 6;
export const EXIF_RIGHT_BOTTOM: number = 7;
export const EXIF_LEFT_BOTTOM: number = 8;

/** EXIF Orientation 字符串 → 解码时该做的变换。
 *  口径来自 SDK 26 `@ohos.multimedia.image.d.ts` 的 `PropertyKey.ORIENTATION` 注释：
 *    1 不转 / 2 水平镜像 / 3 转 180° / 4 垂直镜像 /
 *    5 水平镜像后顺时针 270° / 6 顺时针 90° /
 *    7 垂直镜像后顺时针 90° / 8 顺时针 270°。
 *  空串、非法值、未知值一律当作 1（不转）—— decodePx 对每张图都会调，绝不能抛异常。 */
export function exifTransformOf(raw: string): ExifTransform {
  const t: ExifTransform = { degrees: 0, flipH: false, flipV: false };
  const s: string = raw === undefined || raw === null ? '' : String(raw).trim();
  const v: number = Number.parseInt(s, 10);
  switch (v) {
    case EXIF_TOP_RIGHT:
      t.flipH = true;
      break;
    case EXIF_BOTTOM_RIGHT:
      t.degrees = 180;
      break;
    case EXIF_BOTTOM_LEFT:
      t.flipV = true;
      break;
    case EXIF_LEFT_TOP:
      t.degrees = 270;
      t.flipH = true;
      break;
    case EXIF_RIGHT_TOP:
      t.degrees = 90;
      break;
    case EXIF_RIGHT_BOTTOM:
      t.degrees = 90;
      t.flipV = true;
      break;
    case EXIF_LEFT_BOTTOM:
      t.degrees = 270;
      break;
    default:
      break;
  }
  return t;
}

/** 旋转 90°/270° 后宽高互换；0°/180° 不变。
 *  用于信息栏的「显示尺寸」、1:1 与 fitFactor —— 注意 EXIF 摆正是在**解码阶段**做的，
 *  用户手动的 `.rotate({ angle: this.rot })` 与它互不相干。 */
export function exifSizeOf(w: number, h: number, degrees: number): Size2 {
  const quarter: boolean = degrees === 90 || degrees === 270;
  return quarter ? { w: h, h: w } : { w: w, h: h };
}

/** 主视图解码长边：全屏时用更大的倍率 —— 画布变大必须按新尺寸解到位，
 *  不能把旧分辨率的 PixelMap 交给 GPU 拉大（那就是「发虚」的来源）。 */
export function viewEdgeOf(canvasW: number, canvasH: number, fullscreen: boolean,
  factor: number, fullscreenFactor: number, minEdge: number, maxEdge: number): number {
  const base: number = Math.max(canvasW, canvasH);
  const f: number = fullscreen ? fullscreenFactor : factor;
  return Math.max(minEdge, Math.min(maxEdge, Math.round(base * f)));
}

/** 预载档位：全屏时放宽上限，避免窗口变大后前后 100 张仍是旧的小档位。
 *  量化必须 ceil（向下量化会让档位小于屏幕实际像素，命中缓存还得再解一次全清）。
 *  字节预算 PRELOAD_MAX_BYTES 仍是最终闸门，放宽档位不等于无限吃内存。 */
export function preloadEdgeOf(canvasW: number, canvasH: number, fullscreen: boolean,
  factor: number, quant: number, minEdge: number, maxEdge: number,
  fullscreenMaxEdge: number): number {
  const base: number = Math.max(canvasW, canvasH);
  if (base <= 0 || quant <= 0) {
    return minEdge;
  }
  const cap: number = fullscreen ? Math.max(maxEdge, fullscreenMaxEdge) : maxEdge;
  const v: number = Math.ceil(base * factor / quant) * quant;
  return Math.max(minEdge, Math.min(cap, Math.round(v)));
}

/** 并排两页共用的「显示所需解码档位」（2026-11-11 第三轮修正：左边比右边糊）。
 *
 *  背景：左页 `showNeed()` 旧口径是「画布长边 × zoom × 1.05，再夹到原图长边」，
 *  而右页判据是「缓存档位 >= viewEdge()」。两条判据不一致 → 左页常停留在预载
 *  低档位（普通态 1536 / 全屏 2304），右页却已重解到 viewEdge()（1800 / 3840），
 *  实机表现就是「左边明显不如右边清楚」。现在左右页一律调用本函数：
 *    取 max(主视图解码档位, 按 zoom 放大后的实际像素需求)，再夹到原图长边。
 *
 *  `srcLong` = 原图长边（decodePx 的 w/h 记的就是原图尺寸）；<= 0 表示未知
 *  （右页未命中缓存时），此时不夹上限。decodePx 的 desiredSize 本就不会把图放大，
 *  且 `PreviewEntry.edge` 记的是**请求档位**，所以判据自洽、不会反复重解。 */
export function displayEdgeOf(viewEdgeValue: number, canvasW: number, canvasH: number,
  zoom: number, headroom: number, srcLong: number): number {
  const canvasLong: number = Math.max(canvasW, canvasH);
  if (canvasLong <= 0) {
    return viewEdgeValue;
  }
  const z: number = zoom > 0 ? zoom : 1;
  const byZoom: number = Math.ceil(canvasLong * z * headroom);
  let need: number = Math.max(viewEdgeValue, byZoom);
  if (srcLong > 0) {
    need = Math.min(need, srcLong);
  }
  return need;
}

/** 普通拖窗口 resize 时是否值得按新画布重解码一张。
 *
 *  2026-11-11 第四轮：旧 `onAreaChange` 只有 `pendingReload`（仅进出全屏时置位）才重解，
 *  用户拖窗口改变大小后图片只是被 `objectFit(Contain)` 拉大旧档位 PixelMap（发虚 / 锯齿）。
 *  这里给一个「变化够大」的判据：任一维变化 ≥ minDelta 才重解，滤掉状态栏动画那种 1~2vp 抖动。
 *  首次拿到有效尺寸（旧值为 0）也要重解一次；新尺寸非正一律不重解。 */
export function shouldReloadOnResize(oldW: number, oldH: number, newW: number,
  newH: number, minDelta: number): boolean {
  if (newW <= 0 || newH <= 0) {
    return false;
  }
  if (oldW <= 0 || oldH <= 0) {
    return true;
  }
  const d: number = minDelta > 0 ? minDelta : 1;
  return Math.abs(newW - oldW) >= d || Math.abs(newH - oldH) >= d;
}

/** 第八十二轮：退出全屏时是否要「重新适配普通容器 + 居中」。
 *
 *  用户口径（2026-11-27 确认）：从全屏切回普通模式，图片**再次按普通模式的容器尺寸
 *  自动缩放并居中**。即进全屏 `fitToWindow()`、退出全屏也 `fitToWindow()`，
 *  切换前后都呈「按容器铺满 + 居中」，不会因为恢复旧倍率而出现
 *  「退出后图片尺寸没跟上普通窗口」的观感。
 *
 *  纯判据，便于回归：只有「全屏 → 普通」这一个下降沿为 true。
 *  刻意不做「是否曾手动缩放」的分支 —— 用户要的是稳定的适配态，不是历史位置。 */
export function fitOnFullExit(prevFull: boolean, on: boolean): boolean {
  return prevFull && !on;
}

/** 全屏态下画布相对「全屏基准尺寸」明显缩小 → 判定系统已自行退出沉浸。
 *
 *  真全屏（ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER）下 ESC 常被窗口管理器先消费，
 *  APP 的 `onKeyEvent` 收不到；系统自己退出沉浸后窗口 / 画布会缩小，此时若 APP 仍把
 *  `fullscreen` 当 true，应用内三块栏就永远不回来 —— 实机现象就是「按 ESC 没切回完整界面」。
 *  据此自愈退出 APP 全屏态，效果与双击退出完全对齐。
 *
 *  真全屏态下用户无法自己拖小窗口，所以「宽或高任一维明显缩小」就足以判定系统已退出沉浸；
 *  用 OR 而非 AND —— 系统常常只恢复标题栏 / dock（只缩高度），要求两维同时缩小会漏判。
 *  ratio 非法时回退 0.85。 */
export function shouldExitFullOnResize(fullscreen: boolean, fullW: number, fullH: number,
  newW: number, newH: number, shrinkRatio: number): boolean {
  if (!fullscreen || fullW <= 0 || fullH <= 0 || newW <= 0 || newH <= 0) {
    return false;
  }
  const r: number = (shrinkRatio > 0 && shrinkRatio < 1) ? shrinkRatio : 0.85;
  return newW < fullW * r || newH < fullH * r;
}

/** 由「根容器尺寸 + 固定栏偏移」反推预览画布尺寸。
 *
 *  2026-11-12 第五轮：真机拖窗口 resize 时，深层 `layoutWeight(1)` 的预览 Stack
 *  **不一定**收到 onAreaChange，而根 Stack 是 100%×100% 直接跟窗口，尺寸必然变化。
 *  首帧测出 chrome = 根尺寸 - 画布尺寸（左栏 + 顶栏 + 状态栏等固定占用），
 *  之后任一次根尺寸变化都能精确换算出新画布尺寸，不再赌深层回调是否触发。
 *  返回 {w:0,h:0} 表示「基准未就绪 / 结果不可用」，调用方必须跳过，
 *  绝不能拿 0 去设 .width()/.height()（会把图片压没）。 */
export function canvasFromRootOf(rootW: number, rootH: number,
  chromeW: number, chromeH: number): Size2 {
  if (rootW <= 0 || rootH <= 0 || chromeW < 0 || chromeH < 0) {
    return { w: 0, h: 0 };
  }
  const w: number = rootW - chromeW;
  const h: number = rootH - chromeH;
  return (w > 0 && h > 0) ? { w: w, h: h } : { w: 0, h: 0 };
}

/** SDK `colorSpaceManager.ColorSpace` 的数值 → 中文短名。
 *
 *  ⚠️ 平台边界：HarmonyOS 26 的 colorSpaceManager 只有
 *     `create(ColorSpace)` 和 `create(primaries, gamma)`，
 *     **没有「从 ICC profile 字节流构造 ColorSpaceManager」的 API**。
 *  所以做不到完整 ICC CMS；能做的是：系统 codec 把内嵌 ICC 识别并映射成标准空间，
 *  我们读 `PixelMap.getColorSpace()` 拿出来、原样保留（或按常量转换到 sRGB / Display P3），
 *  再把名字显示给用户。数值取自 SDK d.ts 的 ColorSpace 枚举。 */
export function colorSpaceNameOf(code: number): string {
  switch (code) {
    case 0: return '未标注色彩空间';
    case 1: return 'Adobe RGB';
    case 2: return 'DCI-P3';
    case 3: return 'Display P3';
    case 4: return 'sRGB';
    case 9: return 'BT.2020 HLG';
    case 10: return 'BT.2020 PQ';
    case 11: return 'P3 HLG';
    case 12: return 'P3 PQ';
    default: return code > 0 ? ('色彩空间 ' + code) : '未标注色彩空间';
  }
}

/** 是否广色域 / HDR 传递函数色彩空间：用于判断要不要走 HDR 显示路径。 */
export function isWideGamutOf(code: number): boolean {
  return code === 2 || code === 3 || code === 9 || code === 10 || code === 11 || code === 12;
}

/** 左上角信息浮层的「色彩 / HDR / EXIF」一行。
 *  只显示确实发生的事：没标 ICC、不是 HDR、没 EXIF 旋转时就只写色彩空间。 */
export function viewHintOf(colorSpaceName: string, isHdr: boolean, exifDegrees: number): string {
  let s: string = colorSpaceName;
  if (isHdr) {
    s += ' · HDR';
  }
  if (exifDegrees === 90 || exifDegrees === 180 || exifDegrees === 270) {
    s += ' · EXIF ' + exifDegrees + '°';
  }
  return s;
}

/** 第五十六轮：图片显示形态三分类（按原始宽高比）。
 *  portrait（竖图）h>w / landscape（横图）w>h / square（方形）w==h。
 *  宽或高非正（尺寸未知 / 探测失败）一律按 landscape 处理，绝不当竖图去开右页。 */
export const ORIENT_PORTRAIT: number = 1;
export const ORIENT_LANDSCAPE: number = 2;
export const ORIENT_SQUARE: number = 3;

export function imageOrientationOf(w: number, h: number): number {
  if (w <= 0 || h <= 0) {
    return ORIENT_LANDSCAPE;
  }
  if (h > w) {
    return ORIENT_PORTRAIT;
  }
  if (w > h) {
    return ORIENT_LANDSCAPE;
  }
  return ORIENT_SQUARE;
}

/**
 * 第五十六轮：并排预览「是否保留右页」的唯一决策 —— 只看左图比例。
 *
 *  用户规格：以左侧图片比例为准；
 *    · 左图 portrait → 无论右图是 landscape / portrait / square，都保留右侧预览图并显示在右侧；
 *    · 左图 landscape 或 square → 不显示右侧图片，仅将左图置于中间（单页居中）。
 *
 *  注意此函数**刻意不接收右图形态参数**：从签名上就杜绝「右图不竖就不并排」的旧逻辑，
 *  右图比例完全不参与决策。`hasNext` 只保证右侧确实还有一张可显示，
 *  `enabled` 是全局并排开关（SPREAD_PORTRAIT）。
 */
export function spreadRightWantedOf(leftW: number, leftH: number,
  hasNext: boolean, enabled: boolean): boolean {
  if (!enabled || !hasNext) {
    return false;
  }
  return imageOrientationOf(leftW, leftH) === ORIENT_PORTRAIT;
}

// ==================== 第八十七轮：并排边界「首尾相接」====================

/** 没有可配对的右页（单张 / 下标非法）。 */
export const SPREAD_PAIR_NONE: number = -1;

/**
 * 第八十七轮：并排右页的下标 —— **环形配对**。
 *
 *  用户规格：翻到最后一张时，把它与**第一张**配对，边界处仍要能看到完整并排，
 *  不出现空白 / 错位 / 衔接异常。
 *
 *  预期行为（与既有环形翻页 `go()` 的口径一致：`((cur+delta)%n+n)%n`）：
 *    · n ≥ 2 → 右页 = `(cur + 1) % n`；因此 `cur = n-1` 时右页 = `0`（首尾相接）；
 *    · n = 1 → 返回 `SPREAD_PAIR_NONE`：**绝不与自身配对**（否则同一张图左右各画一次，
 *      既是明显的错位，也会让放大镜 / 缩放百分比拿到两份互不同步的同一图源）；
 *    · cur 非法（<0 或 ≥n）→ NONE。
 *
 *  注意：本函数只回答「下标是谁」，**是否真的并排**仍由 `spreadRightWantedOf`
 *  （左图竖图 + 全局开关）与 `pmSpreadWantedOf`（预览模式）决定，两者语义不变。
 */
export function spreadPairIndexOf(cur: number, n: number): number {
  if (!(n >= 2) || cur < 0 || cur >= n) {
    return SPREAD_PAIR_NONE;
  }
  return (cur + 1) % n;
}

/**
 * 第八十七轮：该配对是否可用 —— 最后一道去重护栏。
 *
 *  `n ≥ 2` 仍可能是「两个条目指向同一个 uri」（重复条目 / 同一文件被列两次）。
 *  此时若照常并排，屏幕上会出现**左右两张一模一样的图**，用户看到的就是「循环衔接异常」。
 *  故：下标非法 / 等于左页 / 同 uri 一律判不可用 ⇒ 退回单页。
 */
export function spreadPairOkOf(cur: number, right: number,
  n: number, sameUri: boolean): boolean {
  if (right === SPREAD_PAIR_NONE || right < 0 || right >= n) {
    return false;
  }
  if (right === cur) {
    return false;
  }
  return sameUri !== true;
}

/** 第八十七轮：该配对是否为「首尾相接」。
 *  严格判据：**最后一张（cur = n-1）配第一张（right = 0）** —— 不用「right < cur」这种宽松比较，
 *  那只会在非法配对下也误报，进而把普通页码错标成「首尾相接」。 */
export function spreadIsWrappedOf(cur: number, right: number, n: number): boolean {
  return n >= 2 && cur === (n - 1) && right === 0;
}

/**
 * 第八十七轮：状态栏页码文案 —— 首尾相接时显式标注，避免用户把「第 N–1 张」
 * 误读成翻页回退或排序错乱。纯函数，便于 Node 回归（含 n=1 / 非法下标）。
 */
export function spreadPageTextOf(cur: number, right: number, n: number): string {
  if (n <= 0 || cur < 0 || cur >= n) {
    return '还没有图片';
  }
  if (right < 0 || right >= n || right === cur) {
    return '第 ' + (cur + 1) + ' / ' + n + ' 张';
  }
  const pair: string = '第 ' + (cur + 1) + '–' + (right + 1) + ' / ' + n + ' 张';
  return spreadIsWrappedOf(cur, right, n) ? (pair + ' · 首尾相接') : pair;
}


/** 窗口级真全屏的步骤名（只喂 hilog 与静态契约测试，方便实机对照跑到哪一步）。
 *
 *  2026-11-11 ESC 修复：退出时不只要「恢复系统栏」，还得**撤销进入时设下的沉浸最大化形态**，
 *  否则窗口本就最大化时（PC 最常见）标题栏 / dock / 任务栏永远回不来。
 *  `recover` 与 `exit-immersive` 实机二选一：进入前是浮动窗口走 `recover()`，
 *  进入前已最大化则 `maximize(EXIT_IMMERSIVE)`；`decor-on` / `title-dock-hover-on` 是双保险。 */
export function fullscreenStepsOf(on: boolean): Array<string> {
  return on
    ? ['maximize-no-title-dock', 'immersive-mode-on', 'layout-fullscreen-on',
      'system-bars-off', 'status-off', 'navigation-off', 'indicator-off']
    : ['system-bars-on', 'status-on', 'navigation-on', 'indicator-on',
      'layout-fullscreen-off', 'immersive-mode-off', 'recover',
      'exit-immersive', 'decor-on', 'title-dock-hover-on'];
}

// ==================== 第五十八轮：resize 画布尺寸护栏 ====================

/**
 * 第五十八轮：resize 期间「固定栏偏移 chrome」的自洽采样（零 IO，可 Node 单测）。
 *
 * 根因（数值可复现）：`chrome = 根尺寸 − 预览画布尺寸`，是左栏 + 顶栏等固定占用，
 * 正常 resize 时是**常量**。但根 Stack 与深层预览 Stack 的两个 onAreaChange 异步交错，
 * 若用「上一帧的根尺寸 lastRootW」减「本帧的画布 w」就会把「窗口缩小量」错算进 chrome：
 *   稳态 根1600×900 / 画布1300×820 / chrome300×80；
 *   缩到 根1000×600 时，预览回调先到（w=700）而 lastRoot 还是旧1600 → chrome=900×380；
 *   根回调再用脏 chrome 反推 1000−900=100，覆盖实测 700 → objectFit(Contain) 的图片框
 *   塌缩到真实预览框的 6% 面积，实机即「缩小视窗 / 尺寸变化中预览图被过度缩小，
 *   只占预览框很小面积比例」。
 *
 * 契约：
 *  · 自洽性：root / canvas 必须为正、canvas 不得超过 root、chrome=root−canvas 必须落在
 *    [0, root*maxRatio] 内（像固定栏，不会吃掉大半个屏）；不自洽 → 判跨帧错配，保持 prev。
 *  · 基准未就绪（prev<0）：自洽即采信，建立基准。
 *  · 基准已就绪（prev>=0）：chrome **异常变大**（> prev+tol）判为污染，保持原基准；
 *    一致 / 合法变小 / 向更合理值收敛则采信。固定栏不随窗口大小变大，只在全屏切换 /
 *    收起或展开左栏时变化 —— 这些布局结构变化由调用方先把 chrome 置 -1 来合法重建。
 *
 * 返回 Size2：本次应写入的固定栏偏移（w=宽偏移，h=高偏移）。
 */
export function chromeSampleOf(prevW: number, prevH: number,
  rootW: number, rootH: number, canvasW: number, canvasH: number,
  tol: number, maxRatio: number): Size2 {
  // 数据不全 / 画布比根还大（跨帧错配的典型表现）→ 绝不改写基准
  if (rootW <= 0 || rootH <= 0 || canvasW <= 0 || canvasH <= 0 ||
      canvasW > rootW || canvasH > rootH) {
    return { w: prevW, h: prevH };
  }
  const cw: number = rootW - canvasW;
  const ch: number = rootH - canvasH;
  const ratio: number = (maxRatio > 0 && maxRatio <= 1) ? maxRatio : 0.6;
  if (cw < 0 || ch < 0 || cw > rootW * ratio || ch > rootH * ratio) {
    return { w: prevW, h: prevH };
  }
  // 基准未就绪：自洽即建立
  if (prevW < 0 || prevH < 0) {
    return { w: cw, h: ch };
  }
  // 基准已就绪：只挡「异常变大」的污染值，允许一致 / 变小 / 收敛
  const t: number = tol > 0 ? tol : 2;
  if (cw > prevW + t || ch > prevH + t) {
    return { w: prevW, h: prevH };
  }
  return { w: cw, h: ch };
}

/**
 * 第五十八轮：根回调「反推画布」覆盖 canvasW/canvasH 之前的塌缩护栏。
 *
 * 反推值 box 只是 R5「深层预览 Stack 收不到 onAreaChange」时的兜底，绝不能把一个
 * 远小于真实预览框的值覆盖上去。真实画布 = 根尺寸 − 固定栏，通常占根尺寸 70%~100%
 * （全屏时 100%）。若 box 塌缩到 root 的 minRatio 以下，或超过 root（画布是根的子区域，
 * 不可能更大），一律判为脏 chrome 反推出的塌缩 / 越界值，**拒绝覆盖**，保留当前可信
 * 画布（通常是预览回调刚写的实测值）。保守拒绝而非猜测改写，所以永不写错值。
 *
 * 返回 true = 允许覆盖；false = 保留当前 canvasW/canvasH。
 */
export function canvasResizeAcceptOf(rootW: number, rootH: number,
  boxW: number, boxH: number, minRatio: number): boolean {
  if (rootW <= 0 || rootH <= 0 || boxW <= 0 || boxH <= 0) {
    return false;
  }
  if (boxW > rootW || boxH > rootH) {
    return false; // 画布不可能比根容器还大
  }
  const r: number = (minRatio > 0 && minRatio < 1) ? minRatio : 0.4;
  return boxW >= rootW * r && boxH >= rootH * r;
}
