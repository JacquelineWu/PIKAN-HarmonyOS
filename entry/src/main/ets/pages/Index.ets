/**
 * pages/Index.ets — 鸿蒙 PC 原生 HEIC/JPG 看图软件（ACDSee 风格）
 *
 * 布局（ACDSee 风格）：
 *   · 顶栏：标题 + 当前文件名 + 「打开图库 / 选择图片 / 回到上次」+ 幻灯片
 *   · 左侧：图像档案列表（缩略图 + 文件名 + 体积），可滚动、点击切换
 *   · 右侧：大图预览（GPU 合成渲染），悬浮信息层 + 缩放角标
 *   · 底栏：状态栏
 *
 * 图片来源：
 *   · 打开图库 —— 默认载入「图库内全部图片」，不用逐张勾选。
 *                  优先 getAssets 全量扫描（零交互）→ 失败用上次会话 uri 快照（零交互）
 *                  → 再失败才回退系统选择器 PhotoViewPicker（免权限，但上限 500 张）
 *   · 选择图片 —— DocumentViewPicker，任意文件 / 文件夹
 *
 * 关键能力：
 *   · HEIC / JPG / PNG / WEBP / BMP / GIF 解码 —— 走鸿蒙系统 Image 解码器（系统 codec）
 *   · GPU 加速 —— ArkUI Image 组件由平台渲染服务做纹理上传 + 合成缩放/旋转，已硬件加速
 *   · 鼠标滚轮控制上一张 / 下一张（Ctrl + 滚轮 = 缩放，互不冲突）
 *   · 缩放 / 旋转 ±90° / 水平垂直镜像 / 拖拽平移 / 双指捏合 / 双击复位
 *   · 全屏：F11 或顶栏「全屏」按钮进入，Esc / F11 / 右上角「退出全屏」退出；
 *     隐藏应用三块栏 + 隐藏系统状态栏/导航栏，画布铺满屏幕
 *   · 键盘：← → 翻页，↑ ↓ 缩放，空格 幻灯片，R 旋转，F 1:1，0 复位，Esc 关闭应用
 *   · 快速：缩略图随 List 虚拟化懒加载，仅可见项参与解码
 *   · 后台预载：自动预先解码当前位置「前后各 20 张」（低清预览），窗口随位置滑动，
 *     切换时先出预览再被原图覆盖
 *   · 切图过渡：新图先以「低清 + 大模糊」出现，分档对焦、清晰图就绪后整层淡出（动态模糊）
 *
 * 变换分层（与旧版一致的设计）：
 *   外层 Column —— translate（拖拽）与 rotate（旋转），尺寸即画布
 *   内层 Image   —— scale（缩放 + 镜像），尺寸为「旋转自适应框」
 *   旋转 90°/270° 时把 Image 的可用框宽高互换，保证旋转后仍完整落在画布内。
 *
 * 命名注意：自定义状态不能叫 scale / rotate —— CustomComponent 基类上已有同名
 * 通用属性方法。故本文件用 zoom 表示缩放、rotateBy() 表示旋转动作。
 */
import common from '@ohos.app.ability.common';
import picker from '@ohos.file.picker';
import fs from '@ohos.file.fs';
import hilog from '@ohos.hilog';
import photoAccessHelper from '@ohos.file.photoAccessHelper';
import image from '@ohos.multimedia.image';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
import dataSharePredicates from '@ohos.data.dataSharePredicates';
import preferences from '@ohos.data.preferences';
import window from '@ohos.window';
import { KeyCode } from '@ohos.multimodalInput.keyCode';
import { BusinessError } from '@ohos.base';

const TAG = 'HeicViewer';
const DOMAIN = 0x0000;

const MIN_SCALE: number = 0.05;
const MAX_SCALE: number = 16.0;
const SLIDE_INTERVAL: number = 3000;

/** 图库选择器 maxSelectNumber 的系统上限（官方：最大 500，默认 50） */
const PICKER_MAX: number = 500;
/** 「打开图库」每次都弹系统选择器让用户重新挑（true），还是先试免交互的全量扫描（false）。
 *
 *  默认 **true**：用户要的就是「点一下就能重新挑要走哪些图」。原来那套「先静默全量扫描 →
 *  再用快照恢复 → 再申请受限权限 → 最后才弹选择器」的降级链，实际效果常常是**根本弹不出
 *  选择器**（快照一命中就直接用旧列表顶替了），而且中间夹着一次 requestPermissionsFromUser，
 *  紧接着拉起选择器容易互相干扰。
 *
 *  改成 true 之后：点「打开图库」= 直接进图库界面勾选，行为可预期。
 *  想回到「零交互载入全部」那套（需先在 AGC 申请到 READ_IMAGEVIDEO 并配置正式签名），
 *  把它改回 false。 */
const GALLERY_ALWAYS_PICK: boolean = true;
/** 弹哪个选择器当「打开图库」：
 *  true  = 系统图库选择器 PhotoViewPicker（界面就是图库，免权限、可多选、上限 500）
 *  false = 文件选择器 DocumentViewPicker + 图片后缀过滤（PC/2in1 上更稳，但要自己走到图片目录）
 *  若你机器上 PhotoViewPicker 打开后**图片选不了**，把它改成 false 立刻可用，其余逻辑不变。 */
const GALLERY_USE_PHOTO_PICKER: boolean = true;
/** 直接扫描图库时的安全上限，避免超大图库一次性吃满内存 */
const SCAN_CAP: number = 20000;

/** 鼠标键缩放倍率（相对步进）：左键放大 50%（×1.5），右键放大 100%（×2.0）。
 *  若想要「绝对档位」（左键直接到 50%、右键直接到 100%），把 zoomAt 换成 setZoomTo 即可。 */
const ZOOM_LEFT: number = 1.5;
const ZOOM_RIGHT: number = 2.0;
/** 按下到抬起若移动超过该距离（vp）就判定为「拖拽平移」，不触发点击缩放 */
const CLICK_MOVE_TOL: number = 4;

/** 预载窗口：当前位置「往后」的张数（主要浏览方向） */
const PRELOAD_FWD: number = 20;
/** 预载窗口：当前位置「往前」的张数 —— 没有它的话，快速往回滚就一张都命中不了缓存。
 *  改这两个常量就等于改窗口大小；缓存是**跟着当前位置滑动**的（见 evictOutside），
 *  所以前后各 20 意味着最多同时驻留 41 张，而不是越翻越多。 */
const PRELOAD_BACK: number = 20;
/** 缓存条目上限（LRU 容量）。窗口 41 张，留 7 张余量：
 *  容量必须 > 窗口大小，否则每入一张就淘汰一张、又被预载链加回来，会来回抖动。 */
const PRELOAD_COUNT: number = 48;
/** 预载预览图的长边上限（像素）。768px 时单张约 1.7MB（768×576×4），
 *  41 张 ≈ 70MB；若提到 1024 则 41 张约 127MB —— 内存允许的话可提，预览会更细。 */
const PRELOAD_EDGE: number = 768;
/** 预载缓存的总字节上限（双重保险，防 OOM）。窗口内 41 张约 70MB，给到 96MB 留些余量 */
const PRELOAD_MAX_BYTES: number = 96 * 1024 * 1024;
/** 主视图解码的长边下限 / 上限（像素）。按「画布长边 × 2」取，放大到 200% 仍清晰 */
const VIEW_EDGE_MIN: number = 1600;
const VIEW_EDGE_MAX: number = 4096;

/** 切图过渡（动态模糊 → 对焦 → 清晰）：
 *  切到新图时先盖一层「低清预览 + 大模糊」，然后分几档把模糊半径收下来（对焦感），
 *  清晰图就绪后整层淡出，露出下面的清晰图。
 *  ⚠️ 模糊只加在 768px 的低清层上（GPU 开销极小），绝不加在清晰大图上。 */
const BLUR_MAX: number = 14;     // 过渡起始的模糊半径（够大才有「糊」的观感，再大就看不出是什么了）
/** 过渡层附加的轻微放大：模糊最大时 +2%，随对焦回到 1.0 —— 让过渡有「推近对焦」的动感 */
const BLUR_ZOOM: number = 0.02;
/** 过渡总时长已按「加快 2 倍」调过：对焦 + 淡出各约 88ms。
 *  ⚠️ 每档间隔别低于一帧（16.7ms）：再快也只是让几档挤进同一帧，观感不会更顺滑，
 *  反而白白多几次重绘 —— 所以这里是「减半时长」而不是「无脑缩间隔」。 */
const BLUR_STEPS: number = 4;    // 分几档收敛（档数越多越顺滑，代价是重绘次数）
const BLUR_STEP_MS: number = 22; // 每档间隔 → 对焦阶段约 88ms（原 180ms 的一半）
const BLUR_FADE_STEPS: number = 4;    // 清晰图到达后分几档淡出
const BLUR_FADE_STEP_MS: number = 22; // 每档间隔 → 淡出约 88ms（原 176ms 的一半）

/** 滚轮：一个物理刻度会连发多个轴事件，该窗口内「同方向」的事件只算一步（去抖）。
 *  若实机上一个刻度仍被算成两步，把这个值调大（如 100）。 */
const WHEEL_NOTCH_MS: number = 60;
/** 收到轴事件后多久内「不接受拖拽平移」（ms）。
 *
 *  这是修「快速滚动时大图整体上下跑」的关键：在 PC / 2in1 上，滚轮与触控板滚动会被 ArkUI
 *  一并派发给 PanGesture（当作一次拖拽），于是画布被当成在拖 —— 向下滚 = offsetY 为负 = 大图上移，
 *  向上滚 = 大图下移，与实测现象完全吻合。滚轮期间屏蔽平移即可，手指/鼠标真实拖拽不受影响
 *  （它们不会产生轴事件）。 */
const WHEEL_PAN_GUARD_MS: number = 300;
/** 滚轮：两次「实际切换」的最小间隔。窗口内攒下的步数合并成一次跳转，
 *  只渲染最终落点那一张 —— 中间张根本不解码，避免解码队列堆积导致的闪烁 / 图片错位 */
const WHEEL_STEP_MS: number = 120;

/** 左侧档案列表中的一项 */
interface ImageItem {
  uri: string;   // 文件 / 图库 URI（可直接喂给 Image 组件）
  name: string;  // 显示文件名
  size: number;  // 字节数（未知为 -1）
}

/** 解码结果：uri + 已解码的 PixelMap + 原图宽高 + 估算占用字节 */
interface PreviewEntry {
  uri: string;
  px: image.PixelMap;
  bytes: number;
  w: number;   // 原图宽（用于 1:1 与信息栏，非 PixelMap 宽）
  h: number;   // 原图高
}

/** 受支持的图片后缀 */
const IMAGE_SUFFIXES: Array<string> = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];

/** 文件选择器「格式」下拉项。写法是系统约定的 `'显示名|后缀1,后缀2,…'`：
 *  竖线左边是下拉里给人看的文字，右边是实际过滤的后缀（多个用英文逗号分隔）；
 *  `'所有文件(*.*)|.*'` 里的 `.*` 是通配符 = 不过滤（2in1 设备支持，API 17 起手机也支持）。
 *
 *  ⚠️ **数组第一项就是选择器打开时默认选中的格式**，所以「所有文件(*.*)」必须排在最前 ——
 *  排到后面会让选择器默认只显示图片，想选别的格式还得手动切一次下拉。
 *  若只想要一个「所有文件」，把第二项删掉即可。 */
const FILE_FILTERS: Array<string> = [
  '所有文件(*.*)|.*',
  '图片(' + IMAGE_SUFFIXES.join(', ') + ')|' + IMAGE_SUFFIXES.join(',')
];

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) {
    return lo;
  }
  if (v > hi) {
    return hi;
  }
  return v;
}

function fmtBytes(n: number): string {
  if (n <= 0) {
    return '--';
  }
  if (n < 1024) {
    return n + ' B';
  }
  if (n < 1024 * 1024) {
    return (n / 1024).toFixed(1) + ' KB';
  }
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/** 从 uri / 路径里抠出文件名 */
function baseName(path: string): string {
  let s = path;
  const q = s.indexOf('?');
  if (q >= 0) {
    s = s.substring(0, q);
  }
  const i = s.lastIndexOf('/');
  return i >= 0 ? s.substring(i + 1) : s;
}

/** 取扩展名（大写），无扩展名返回 RAW */
function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  if (i < 0 || i === name.length - 1) {
    return 'RAW';
  }
  return name.substring(i + 1).toUpperCase();
}


// --------------------------------------------------------------------
// 缩略图基础设施
//
// 为什么必须有它（这是「图片一多就崩」的主因）：
//   左侧档案列表原本是 Image(item.uri) —— 组件会按**原图分辨率**解码。
//   一张 4000×3000 的照片解码后是 4000×3000×4 ≈ 48MB；列表里有几十个
//   可见/缓存项时就是好几个 GB，必然 OOM 崩溃。列表只有 56×42，
//   为显示它而把整张原图解码进内存是纯粹的浪费。
//
//   所以这里统一先解出「小图 PixelMap」再交给 Image 显示：128px 长边时
//   单张约 60KB，缓存 600 张也不过 36MB —— 比解一张原图还小。
// --------------------------------------------------------------------

/** 缩略图长边（像素）。列表显示区是 56×42，取 128 在高分屏下依然清晰 */
const THUMB_EDGE: number = 128;
/** 缩略图 LRU 缓存条目上限：128px 时单张约 60KB，600 张 ≈ 36MB */
const THUMB_MAX_COUNT: number = 600;
/** 缩略图解码并发上限。HEIC 解码较重，同时开太多会瞬间吃满内存 —— 必须限流 */
const THUMB_CONCURRENCY: number = 3;
/** 待处理队列上限。快速滑动列表会堆积大量「已划走」的请求，超了就丢最旧的，
 *  否则一次甩动可能排进上千个任务 */
const THUMB_QUEUE_MAX: number = 240;

/** 后台补体积时：每批处理条数 + 批间让出时间（ms）。
 *  不能在主线程里对几百个文件逐个 statSync —— 那会卡死 UI 直到 ANR */
const SIZE_CHUNK: number = 60;
const SIZE_YIELD_MS: number = 12;

// --------------------------------------------------------------------
// 上次浏览位置（跨启动记忆）
//
// 存什么：不存图片本身，只存「上次停在第几张 + 那张的 uri / 文件名 / 总数 / 图片来源」。
// 为什么两个都要存：图库会新增照片，纯靠序号会指错图；纯靠 uri 又在换了图片源时找不到。
//   · uri 命中  → 精确定位到同一张（最可靠）
//   · uri 没命中 → 仅在「总数一致」时按序号回退（大概率是同一批、顺序未变）
//   · 都没有    → 老老实实从第 1 张开始，不做无根据的猜测
// --------------------------------------------------------------------

/** preferences 文件名（位置记忆） */
const POS_STORE: string = 'heicviewer_pos';
const POS_KEY_IDX: string = 'lastIdx';
const POS_KEY_URI: string = 'lastUri';
const POS_KEY_NAME: string = 'lastName';
const POS_KEY_COUNT: string = 'lastCount';
const POS_KEY_SRC: string = 'lastSrc';
/** 「最后一次**成功显示**」的那张图的 uri —— 启动时预热的就是它（见 warmLast）。
 *  与 POS_KEY_URI 的区别：那个记的是「停在第几张」（切过去就记，哪怕没解出来），
 *  这个只在真的解出画面后才记，预热解不开的图毫无意义。 */
const POS_KEY_OK: string = 'lastOkUri';
/** 写盘防抖间隔：滚轮连翻时没必要每张都落盘，停手后再存 */
const POS_SAVE_MS: number = 500;
/** 启动预热推迟多少毫秒再开始解码。首帧渲染 + 窗口初始化那几十毫秒最金贵，
 *  让开这一段再动 decode —— 只解 1 张，也不读快照，不会有 APP_INPUT_BLOCK 风险。 */
const WARM_DELAY_MS: number = 300;

/** 「上次会话」的图片列表快照：最多存多少条 uri。
 *
 *  ⚠️ 原来 3000 条（15 个 key × 约 10KB）。实测会把**启动**拖死：appfreeze 日志里
 *  主线程卡在 `PreferencesGetValue`（第 7 个，即快照第一块）超过 8 秒 —— 前面 6 个读
 *  小数目的 get 都是毫秒级完成的，只有读快照这一下卡住。preferences 是轻量 KV，
 *  塞几百 KB 进去，光把文件反序列化出来就够让首帧起不来。
 *  600 条对「回到上次」完全够用（它只是兜底，主力路径是重新扫描图库）。 */
const SNAP_MAX: number = 600;
/** 快照分块大小：preferences 是轻量 KV，不要把几千条塞进一个 key。
 *  分块存成「换行分隔的字符串」，既避开单值过大，也免去 JSON.parse 的类型麻烦。
 *  现在 SNAP_MAX 已降到 600，一块就装得下 —— 启动要把快照读回来时只需 1 次 get。 */
const SNAP_CHUNK: number = 600;
  /** 启动时是否自动「静默重扫图库 / 读快照恢复」。
 *
 *  默认 **false**：启动阶段主线程要忙首帧渲染、窗口初始化，此时再去读快照、甚至跑一次
 *  全量图库扫描，极易被 watchdog 判定为 APP_INPUT_BLOCK（实测就是这么冻住的 8 秒）。
 *  关掉之后启动只读几个小 key（毫秒级），恢复动作留给用户主动点「打开图库」/「回到上次」——
 *  那时 applyItems → restoreIndex 依然会自动落回上次那张，功能没丢，只是不在启动时抢主线程。
 *
 *  另外：关掉它**不等于**启动时什么都不干 —— 见 warmLast()，那张「上次成功显示的图」
 *  会在后台单独解好等着，用户点开图库时首屏直接命中缓存。
 *  想要「一打开就自动回到上次图」就把它改回 true（大图库下有 ANR 风险）。 */
const AUTO_RESUME_ON_START: boolean = false;
const SNAP_KEY_COUNT: string = 'snapCount';
const SNAP_KEY_PREFIX: string = 'snap_';   // snap_0 / snap_1 / …
/** 旧格式最多会留下多少块（3000 / 200 = 15）—— 用于首写时把历史残留清理掉 */
const OLD_SNAP_CHUNKS: number = 15;

/** 图片来源名（用于判断能否自动恢复：「图库全部」可以静默重扫，选择器类必须用户操作） */
const SRC_ALL: string = '图库全部';

/** 上次浏览位置 */
interface LastPos {
  idx: number;    // 上次停在第几张（0 基）
  uri: string;    // 那张图的 uri（优先用它定位）
  name: string;   // 文件名（仅用于提示文案）
  count: number;  // 当时列表总数（用于判断是不是同一批）
  src: string;    // 当时的图片来源
}

/** 一个缩略图请求任务 */
interface ThumbTask {
  uri: string;
  alive: () => boolean;                          // 请求方还活着吗（离屏的行会被跳过）
  cb: (p: image.PixelMap | undefined) => void;
}

/** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
 *  edge = PRELOAD_EDGE 得到低清预览；edge = 画布长边×2 得到主视图用的清晰图；
 *  edge = THUMB_EDGE 得到列表用的缩略图。三种场景共用同一套系统 codec。 */
async function decodePx(uri: string, edge: number): Promise<PreviewEntry | undefined> {
  let file: fs.File | undefined = undefined;
  let src: image.ImageSource | undefined = undefined;
  try {
    file = fs.openSync(uri, fs.OpenMode.READ_ONLY);
    src = image.createImageSource(file.fd);
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
    const px: image.PixelMap = await src.createPixelMap({ desiredSize: { width: dw, height: dh } });
    const entry: PreviewEntry = { uri: uri, px: px, bytes: dw * dh * 4, w: w, h: h };
    return entry;
  } catch (e) {
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
        fs.closeSync(file);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'close file skipped');
      }
    }
  }
}

/** 列表缩略图加载器（模块级单例：跨数据源切换保留缓存，靠 LRU 自然淘汰）。
 *
 *  刻意**不做**整体清空：被释放的 PixelMap 若正被某个列表行显示着会导致花屏崩溃，
 *  而 LRU 总是淘汰「最久没人用」的条目 —— 那时对应的行早已离开屏幕。
 *  上限 36MB 对常驻内存完全无所谓，没必要为此冒险。 */
class ThumbLoader {
  private static inst: ThumbLoader = new ThumbLoader();
  private cache: Map<string, PreviewEntry> = new Map();
  private order: string[] = [];   // 最近使用顺序，队头最旧
  private pending: ThumbTask[] = [];
  private active: number = 0;

  static get(): ThumbLoader {
    return ThumbLoader.inst;
  }

  /** 同步查缓存；命中则刷新最近使用位置 */
  peek(uri: string): image.PixelMap | undefined {
    const e: PreviewEntry | undefined = this.cache.get(uri);
    if (e === undefined) {
      return undefined;
    }
    this.touch(uri);
    return e.px;
  }

  /** 请求一张缩略图：命中立刻回调，否则排进限流队列 */
  request(uri: string, alive: () => boolean, cb: (p: image.PixelMap | undefined) => void): void {
    const hit: image.PixelMap | undefined = this.peek(uri);
    if (hit !== undefined) {
      cb(hit);
      return;
    }
    this.pending.push({ uri: uri, alive: alive, cb: cb });
    if (this.pending.length > THUMB_QUEUE_MAX) {
      this.pending.splice(0, this.pending.length - THUMB_QUEUE_MAX);
    }
    this.pump();
  }

  /** 按并发上限取任务执行 */
  private pump(): void {
    while (this.active < THUMB_CONCURRENCY && this.pending.length > 0) {
      const t: ThumbTask | undefined = this.pending.shift();
      if (t === undefined) {
        break;
      }
      if (!t.alive()) {
        continue; // 行已经划出屏幕了，这个请求作废
      }
      this.active++;
      decodePx(t.uri, THUMB_EDGE)
        .then((e: PreviewEntry | undefined) => {
          this.active--;
          if (e !== undefined) {
            this.put(t.uri, e);
          }
          if (t.alive()) {
            t.cb(e !== undefined ? e.px : undefined);
          }
          this.pump();
        })
        .catch(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private put(uri: string, e: PreviewEntry): void {
    this.cache.set(uri, e);
    this.touch(uri);
    while (this.order.length > THUMB_MAX_COUNT) {
      const oldest: string = this.order[0];
      this.order.splice(0, 1);
      const victim: PreviewEntry | undefined = this.cache.get(oldest);
      if (victim === undefined) {
        continue;
      }
      this.cache.delete(oldest);
      try {
        victim.px.release();
      } catch (err) {
        hilog.warn(DOMAIN, TAG, 'release thumb skipped');
      }
    }
  }

  /** 把 uri 提到「最近使用」队尾 */
  private touch(uri: string): void {
    const i: number = this.order.indexOf(uri);
    if (i >= 0) {
      this.order.splice(i, 1);
    }
    this.order.push(uri);
  }
}

/** 左侧档案列表的一行。
 *
 *  拆成独立组件是为了让「缩略图加载成功」只重渲染**这一行** ——
 *  若由父组件维护一个全局 map，每张图加载完都要刷新整个列表，几百次不足为惧的
 *  全列表重排会直接拖垮滚动流畅度。 */
@Component
struct ArchiveRow {
  @Prop uri: string = '';
  @Prop name: string = '';
  // ⚠️ 不能叫 `size`：CustomComponent 基类上已有同名通用属性方法
  //    （'.size({ ... })'），会报 "not assignable to ... (value: SizeOptions) => CommonAttribute"。
  //    同类雷区还有 width / height / scale / rotate / translate（本文件因此用 zoom 表示缩放）。
  @Prop bytes: number = -1;
  @Prop idx: number = 0;
  @Prop selected: boolean = false;
  // ⚠️ 回调也不能加 private：ArkTS 会报
  //    "Property 'onTap' is private and can not be initialized through the component constructor"。
  onTap: (idx: number) => void = () => {};
  @State thumb: image.PixelMap | undefined = undefined;
  private alive: boolean = true;

  aboutToAppear(): void {
    this.alive = true;
    this.load();
  }

  aboutToDisappear(): void {
    this.alive = false; // 离屏后即使队列轮到自己，也不再回调
  }

  private load(): void {
    const hit: image.PixelMap | undefined = ThumbLoader.get().peek(this.uri);
    if (hit !== undefined) {
      this.thumb = hit;
      return;
    }
    this.thumb = undefined;
    ThumbLoader.get().request(this.uri, () => this.alive, (p: image.PixelMap | undefined) => {
      if (p !== undefined) {
        this.thumb = p;
      }
    });
  }

  build() {
    Row() {
      // 命中缓存时用缩略图；未命中先占位灰底，避免按原图分辨率解码（OOM 主因）
      // 未命中缓存时留深灰占位，绝不退化成 Image(uri) 按原图分辨率解码
      Stack() {
        if (this.thumb !== undefined) {
          Image(this.thumb!)
            .objectFit(ImageFit.Cover)
            .interpolation(ImageInterpolation.Low)
            .width(56)
            .height(42)
            .borderRadius(4)
        }
      }
      .width(56)
      .height(42)
      .borderRadius(4)
      .backgroundColor('#262b34')
      .border({
        width: this.selected ? 2 : 0,
        color: '#4fd1c5'
      })

      Column() {
        Text(this.name)
          .fontSize(12)
          .fontColor(this.selected ? '#e8ecf4' : '#9fb0c8')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
        Row() {
          Text(extOf(this.name))
            .fontSize(10)
            .fontColor('#5a6272')
            .margin({ right: 8 })
          Text(fmtBytes(this.bytes))
            .fontSize(10)
            .fontColor('#7f88a8')
        }
        .margin({ top: 3 })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .padding({ left: 8 })
    }
    .width('100%')
    .padding(6)
    .borderRadius(6)
    .backgroundColor(this.selected ? '#1f2730' : 'transparent')
    .onClick(() => this.onTap(this.idx))
  }
}

/** LazyForEach 要求的数据源：只有实现了它，列表才会**真正按需**创建节点。
 *  ForEach 会为数组中每一项都创建组件，几百张图就是几百个 ListItem —— 这是
 *  图片一多就崩的另一半原因。 */
class GalleryDataSource implements IDataSource {
  private items: ImageItem[] = [];
  private listeners: DataChangeListener[] = [];

  totalCount(): number {
    return this.items.length;
  }

  getData(index: number): ImageItem {
    return this.items[index];
  }

  registerDataChangeListener(listener: DataChangeListener): void {
    const i: number = this.listeners.indexOf(listener);
    if (i < 0) {
      this.listeners.push(listener);
    }
  }

  unregisterDataChangeListener(listener: DataChangeListener): void {
    const i: number = this.listeners.indexOf(listener);
    if (i >= 0) {
      this.listeners.splice(i, 1);
    }
  }

  reload(list: ImageItem[]): void {
    this.items = list;
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i].onDataReloaded();
    }
  }
}

@Entry
@Component
struct Index {
  private scroller: Scroller = new Scroller();

  // ---- 图像档案 ----
  // items 刻意**不加 @State**：几千个元素进状态系统会被逐层建代理，纯属浪费；
  // UI 只需要 itemCount（负责空态与「N 张」文案）和 LazyForEach 的数据源。
  private items: ImageItem[] = [];
  private dataSource: GalleryDataSource = new GalleryDataSource();
  @State itemCount: number = 0;
  @State source: string = '尚未打开';
  @State cur: number = -1;          // 当前选中索引；-1 表示空

  // ---- 视图变换状态 ----
  @State zoom: number = 1;
  @State tx: number = 0;
  @State ty: number = 0;
  @State rot: number = 0;
  @State flipH: boolean = false;
  @State flipV: boolean = false;

  // ---- 图片元信息 ----
  @State imgW: number = 0;
  @State imgH: number = 0;
  @State bytes: number = 0;

  // ---- 画布尺寸（onAreaChange 得到）----
  @State canvasW: number = 800;
  @State canvasH: number = 600;

  // ---- 交互 ----
  @State playing: boolean = false;
  @State status: string = '点顶栏「打开图库」在图库里挑图，或「选择图片」挑文件';
  /** 全屏（沉浸）模式：隐藏顶栏 / 左侧档案栏 / 状态栏，画布铺满整个窗口。
   *  做的是「应用内隐藏 UI」，不调 window 全屏接口 —— 不依赖窗口权限，也不会踩系统 API 差异。 */
  @State fullscreen: boolean = false;

  private timerId: number = -1;
  private baseZoom: number = 1;
  private ctrlDown: boolean = false; // Ctrl + 滚轮 = 缩放，由键盘事件跟踪
  private baseTx: number = 0;
  private baseTy: number = 0;

  /** 进出全屏后画布尺寸会变，需要在尺寸落地后按新尺寸重解一次大图，否则只是把旧分辨率拉大（发虚） */
  private pendingReload: boolean = false;
  /** 全屏时是否由我们主动最大化过窗口 —— 退出时才知道要不要 recover 回自由窗口 */
  private maximizedByUs: boolean = false;

  // ---- 滚轮翻页：去抖 + 合并（见 onWheel / flushWheel 注释）----
  private lastAxisMs: number = 0;     // 最近一次轴事件（滚轮/触控板）的时刻，用于屏蔽「被当成拖拽」的伪平移
  private lastWheelMs: number = 0;    // 上一次计入的轴事件时间戳
  private lastWheelSign: number = 0;  // 上一次计入的方向（+1 / -1）
  private pendingDelta: number = 0;   // 已计入、还没落到渲染上的步数
  private wheelTimer: number = -1;    // 合并后的延迟执行句柄
  private lastSwitchMs: number = 0;   // 上一次真正切换的时刻
  // 「滚轮正在滚」标记：比 lastAxisMs 更可靠（与手势的到达顺序无关），用于屏蔽伪拖拽
  private wheelActive: boolean = false;
  private wheelActiveTimer: number = -1;
  private sizeSeq: number = 0;        // 体积补测批次代号，换数据源时作废旧任务

  // ---- 鼠标键缩放：按下/移动/抬起三态，用来区分「点击」与「拖拽平移」----
  private pressBtn: number = -1;      // MouseButton，-1 表示未按下
  private pressX: number = 0;
  private pressY: number = 0;
  private pressMoved: boolean = false;

  // ---- 上次浏览位置（preferences 持久化）----
  private prefs: preferences.Preferences | undefined = undefined;
  private lastPos: LastPos | undefined = undefined;     // 启动时读回的上次位置
  private posPending: LastPos | undefined = undefined;  // 待落盘的位置
  private posTimer: number = -1;                        // 写盘防抖句柄
  private snapDirty: boolean = false;                   // 图片列表变了（换源）→ 下次写盘时顺带存快照
  private okUri: string = '';                           // 最后一次「成功显示」的 uri（下次启动预热它）
  /** 本次运行是否已经弹过「读取图库」权限申请。
   *  只弹一次：权限一旦被拒，再点「打开图库」不该反复弹同一个框。 */
  private permAsked: boolean = false;
  /** 系统选择器是否正开着。连点「打开图库」会叠出两个选择器，后开的那个常常就是点不动的那个 */
  private pickerBusy: boolean = false;
  private snapChunks: number = 0;                       // 已写入快照的块数（换源后块数变少时清旧块）
  /** 空态区的一行提示（「上次看到 …」）。必须是 @State：它是异步读回来的，要靠它刷新 UI。
   *  而 lastPos 本身刻意不是 @State —— 切图时每帧都改它会导致整个界面反复重建。 */
  @State resumeHint: string = '';

  // ---- 后台预载缓存（不用 @State：靠 @State cur / viewPixelMap 变化触发重建即可）----
  private previews: PreviewEntry[] = [];              // 简易 LRU：命中移到队尾，超容量从队头淘汰
  private preloadBytes: number = 0;                   // 当前缓存估算占用
  private preloadSeq: number = 0;                     // 预载任务代号，切换图片时自增使旧链作废
  private preloadBusy: boolean = false;
  // ↓↓ 排查用计数器：只喂给 hilog，不参与任何逻辑判断。定位完可整块删掉。
  private probeTick: number = 0;   // 预载链跑过的轮数（一直涨 = 死循环）
  private probeFail: number = 0;   // 预载链累计解码失败次数
  /** 解码失败过的 uri。不记下来会导致 preloadNext 反复挑同一张解不开的图 → 主线程无限自转。
   *  注意：只排除「已缓存」是不够的，失败的图永远进不了缓存，必须单独记。 */
  private failed: Set<string> = new Set<string>();
  /** 启动预热的那一张（上次成功显示的最后一张），先解好放在这里，等列表载入时交给缓存。
   *  不直接塞进 previews：那时 cur 还是 -1、列表是空的，放进缓存会被 evictOutside 判为「窗口外」。 */
  private warm: PreviewEntry | undefined = undefined;
  // ---- 主视图 ----
  // 关键设计：**主视图不再用 Image(uri) 让系统自己换源**，而是自己解码成 PixelMap 再整体替换。
  // 原因：Image(uri) 换源时，解码完成前组件可能仍显示上一张（快速翻页时表现为「图片移位」）；
  // 而「上一张的 onComplete 迟到」又会把预览层的撤除标志置错，导致低清预览一直盖在上面（变模糊）。
  // 自己解码 + 代号校验后，显示哪一张、什么时候换，完全由我们原子控制，没有竞态。
  @State viewPixelMap: image.PixelMap | undefined = undefined; // 当前实际显示的清晰图像素
  private viewOwned: image.PixelMap | undefined = undefined;   // 自己解码的那张（需 release）
  @State viewFailed: boolean = false;                 // 自解码确认失败 → 才回退到 Image(uri)
  @State curToken: number = 0;                        // 当前显示图的代号（每切换一次自增）

  // ---- 切图过渡：低清模糊层（盖在清晰图之上，就绪后淡出）----
  @State lowPixelMap: image.PixelMap | undefined = undefined; // 过渡期显示的那张低清图
  @State blurRadius: number = 0;                      // 当前模糊半径（BLUR_MAX → 0）
  @State lowOpacity: number = 0;                      // 低清层不透明度（1 → 0）
  private focusSeq: number = 0;                       // 对焦动画代号，切图时自增使旧动画作废

  aboutToAppear(): void {
    this.readLastPos(); // 异步读，不阻塞首帧
  }

  aboutToDisappear(): void {
    this.stopSlide();
    if (this.warm !== undefined) {
      // 预热的那张还没被接进缓存（用户没打开任何图），别留着 PixelMap 泄漏
      try {
        this.warm.px.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'release warm skipped');
      }
      this.warm = undefined;
    }
    this.clearPreviews();
    this.releaseViewOwned();
    this.clearWheel();
    this.sizeSeq++; // 作废还在跑的体积补测任务
    this.flushPos(); // 退出前把最后一次位置落盘（async，尽力而为）
    if (this.fullscreen) {
      // 页面销毁时若还在全屏，把系统状态栏 / 导航栏还回去，别把窗口状态留在隐藏态
      this.applyWindowFullScreen(false);
    }
  }

  // ------------------------------------------------------------------
  // 上次浏览位置：读取 / 恢复 / 保存
  // ------------------------------------------------------------------

  /** 拿到 preferences 实例（惰性创建并缓存） */
  private async posStore(): Promise<preferences.Preferences | undefined> {
    const cached: preferences.Preferences | undefined = this.prefs;
    if (cached !== undefined) {
      return cached;
    }
    try {
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        return undefined;
      }
      const p: preferences.Preferences = await preferences.getPreferences(ctx, POS_STORE);
      this.prefs = p;
      return p;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'open preferences failed: %{public}s', JSON.stringify(e));
      return undefined;
    }
  }

  /** 启动时读回上次位置。
   *
   *  只有「上次来自图库全部」才会自动重新扫描并跳回原处 —— 因为全量扫描不需要用户交互；
   *  而「打开图库 / 选择图片」都是系统选择器，程序无权替用户操作，只能提示用户点一下。
   *  静默扫描失败（多半是没有受控权限）时不弹任何窗，只留一句状态栏提示。
   *
   *  值类型说明：preferences.get 返回的是 ValueType 联合类型，ArkTS 下必须逐个
   *  typeof 收窄，不能直接 Number()/String() 强转。 */
  private async readLastPos(): Promise<void> {
    const t0: number = Date.now();
    try {
      const p: preferences.Preferences | undefined = await this.posStore();
      if (p === undefined) {
        return;
      }
      const rawIdx = await p.get(POS_KEY_IDX, -1);
      const rawUri = await p.get(POS_KEY_URI, '');
      const rawOk = await p.get(POS_KEY_OK, '');
      const idx: number = typeof rawIdx === 'number' ? rawIdx : -1;
      const uri: string = typeof rawUri === 'string' ? rawUri : '';
      const ok: string = typeof rawOk === 'string' ? rawOk : '';
      this.okUri = ok;
      // 预热「上次成功显示的那张」：后台解 1 张，与下面读位置/恢复完全解耦，
      // 就算它失败也只是少一次缓存命中，不影响任何别的路径。
      if (ok.length > 0) {
        this.warmLast(ok);
      }
      if (idx < 0 && uri.length === 0) {
        return; // 首次启动，没有记忆（预热已经排上了，可以正常返回）
      }
      const rawName = await p.get(POS_KEY_NAME, '');
      const rawCount = await p.get(POS_KEY_COUNT, 0);
      const rawSrc = await p.get(POS_KEY_SRC, '');
      const saved: LastPos = {
        idx: idx,
        uri: uri,
        name: typeof rawName === 'string' ? rawName : '',
        count: typeof rawCount === 'number' ? rawCount : 0,
        src: typeof rawSrc === 'string' ? rawSrc : ''
      };
      this.lastPos = saved;
      this.resumeHint = '上次看到「' + saved.name + '」（第 ' + (saved.idx + 1) + ' 张 · ' + saved.src + '）';
      hilog.info(DOMAIN, TAG, 'readLastPos: got pos in %{public}d ms', Date.now() - t0);
      if (AUTO_RESUME_ON_START) {
        this.status = '正在回到上次位置：第 ' + (saved.idx + 1) + ' 张 · ' + saved.name;
        if (saved.src === SRC_ALL) {
          // 上次来自「图库全部」→ 优先静默重扫（能拿到最新的全量列表）；
          // 扫不到（多半是没权限）时 queryAllPhotos 内部会自己退到快照恢复。
          this.loadAllGallery(); // silent：成功就恢复，失败绝不弹窗
        } else {
          // 上次来自系统选择器 → 程序无权替用户点选择器，直接用上次会话的快照恢复
          this.trySnapRestore();
        }
      } else {
        // 启动时只记位置、不做重活。用户点「打开图库」/「回到上次」时才真正恢复
        // （见 AUTO_RESUME_ON_START 注释：启动时读快照 + 重扫会触发 APP_INPUT_BLOCK）。
        this.status = '上次看到「' + saved.name + '」第 ' + (saved.idx + 1) + ' 张 · 点「打开图库」或「回到上次」自动跳回';
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'readLastPos failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 启动预热：把「上次成功显示的最后一张」先在后台解成低清图放着。
   *
   *  为什么这是安全的（对比把它做成「启动时自动恢复」）：
   *  只读 1 个小 key、只解 1 张 768px 的图、且推迟 WARM_DELAY_MS 让开首帧 ——
   *  不做全量重扫、不读快照，也就不会触发此前那种 PreferencesGetValue 卡死。
   *  用户点「打开图库」时 applyItems 会把它接进缓存，showPreviewOf 命中 → 首屏立刻出图，
   *  不必再等一次低清解码（这是打开大图库时「先黑一下」的主要来源）。 */
  private warmLast(uri: string): void {
    setTimeout(() => {
      const t0: number = Date.now();
      this.decodeTo(uri, PRELOAD_EDGE)
        .then((e: PreviewEntry | undefined) => {
          if (e === undefined) {
            hilog.warn(DOMAIN, TAG, 'warm: decode failed');
            return;
          }
          if (this.warm !== undefined && this.warm !== e) {
            try {
              this.warm.px.release();
            } catch (err) {
              hilog.warn(DOMAIN, TAG, 'release stale warm skipped');
            }
          }
          this.warm = e;
          hilog.info(DOMAIN, TAG, 'warm: ready in %{public}d ms', Date.now() - t0);
          if (this.items.length === 0 && this.resumeHint.length > 0 && this.resumeHint.indexOf('预热') < 0) {
            this.resumeHint = this.resumeHint + ' · 已预热，打开后立即显示';
          }
        })
        .catch(() => {
          hilog.warn(DOMAIN, TAG, 'warm: rejected');
        });
    }, WARM_DELAY_MS);
  }

  /** 记下「这张成功显示过了」：只有真的解出画面才记（低清过渡层或清晰图任一到位即可）。
   *  切过去但没解出来的不算 —— 预热一张打不开的图没有任何意义。 */
  private noteShown(uri: string): void {
    if (uri.length === 0 || uri === this.okUri) {
      return;
    }
    this.okUri = uri;
    this.scheduleFlush();
  }

  /** 载入一批图片后，算出「应该从第几张开始」。返回 -1 表示没有可恢复的位置。 */
  private restoreIndex(list: ImageItem[]): number {
    const p: LastPos | undefined = this.lastPos;
    if (p === undefined || list.length === 0) {
      return -1;
    }
    // ① 最可靠：uri 命中就是同一张图
    if (p.uri.length > 0) {
      for (let i: number = 0; i < list.length; i++) {
        if (list[i].uri === p.uri) {
          return i;
        }
      }
    }
    // ② 退一步：总数一致说明多半还是同一批（顺序未变），按序号回退
    if (p.count === list.length && p.idx >= 0 && p.idx < list.length) {
      return p.idx;
    }
    return -1;
  }

  /** 记住当前位置（防抖写盘）。切图很频繁（滚轮连翻），没必要每张都落一次盘。 */
  private markPos(): void {
    if (this.cur < 0 || this.cur >= this.items.length) {
      return;
    }
    const it: ImageItem = this.items[this.cur];
    const pos: LastPos = {
      idx: this.cur,
      uri: it.uri,
      name: it.name,
      count: this.items.length,
      src: this.source
    };
    this.posPending = pos;
    this.lastPos = pos; // 内存里同步更新，「回到上次」按钮立刻可用
    this.scheduleFlush();
  }

  /** 排一次防抖写盘。已排过就不管 —— 到点会把最新的一次写下去 */
  private scheduleFlush(): void {
    if (this.posTimer !== -1) {
      return;
    }
    this.posTimer = setTimeout(() => {
      this.posTimer = -1;
      this.flushPos();
    }, POS_SAVE_MS);
  }

  /** 真正落盘 */
  private async flushPos(): Promise<void> {
    const p: LastPos | undefined = this.posPending;
    if (p === undefined) {
      return;
    }
    this.posPending = undefined;
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store === undefined) {
        return;
      }
      await store.put(POS_KEY_IDX, p.idx);
      await store.put(POS_KEY_URI, p.uri);
      await store.put(POS_KEY_NAME, p.name);
      await store.put(POS_KEY_COUNT, p.count);
      await store.put(POS_KEY_SRC, p.src);
      await store.put(POS_KEY_OK, this.okUri); // 下次启动预热的那一张
      // 换了图片源才需要重写快照（切图时列表没变，不必每次都写这几千个 uri）
      if (this.snapDirty) {
        this.snapDirty = false;
        await this.flushSnap(store);
      }
      await store.flush(); // 不 flush 只写到内存，进程被杀会丢
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'save last pos failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 把当前图片列表分块写进 preferences（换行分隔，不用 JSON） */
  private async flushSnap(store: preferences.Preferences): Promise<void> {
    const cap: number = Math.min(this.items.length, SNAP_MAX);
    const chunks: number = Math.ceil(cap / SNAP_CHUNK);
    for (let c: number = 0; c < chunks; c++) {
      const end: number = Math.min((c + 1) * SNAP_CHUNK, cap);
      const part: Array<string> = [];
      for (let i: number = c * SNAP_CHUNK; i < end; i++) {
        part.push(this.items[i].uri);
      }
      await store.put(SNAP_KEY_PREFIX + c, part.join('\n'));
    }
    // 这次比上次块数少 → 清掉多出来的旧块，否则下次恢复会读到上一批的尾巴
    for (let c: number = chunks; c < this.snapChunks; c++) {
      await store.delete(SNAP_KEY_PREFIX + c);
    }
    if (this.snapChunks === 0) {
      // 首次写：老版本 SNAP_MAX=3000 / SNAP_CHUNK=200 最多落过 15 块，文件里可能还留着
      // 十几块没人读的旧数据。既然已经不读它们了，趁这次写盘一并清掉。
      for (let c: number = chunks; c < OLD_SNAP_CHUNKS; c++) {
        try {
          await store.delete(SNAP_KEY_PREFIX + c);
        } catch (e) {
          // 删不掉无所谓，反正读的时候只按 SNAP_KEY_COUNT 取前几块
        }
      }
    }
    this.snapChunks = chunks;
    await store.put(SNAP_KEY_COUNT, cap);
  }

  /** 读出上次会话的 uri 快照（顺序与上次一致）。空数组表示没有快照。 */
  private async readSnapUris(store: preferences.Preferences): Promise<Array<string>> {
    const t0: number = Date.now();
    const rawCount = await store.get(SNAP_KEY_COUNT, 0);
    const count: number = typeof rawCount === 'number' ? rawCount : 0;
    if (count <= 0) {
      return [];
    }
    const uris: Array<string> = [];
    const chunks: number = Math.ceil(Math.min(count, SNAP_MAX) / SNAP_CHUNK);
    for (let c: number = 0; c < chunks; c++) {
      const raw = await store.get(SNAP_KEY_PREFIX + c, '');
      if (typeof raw !== 'string' || raw.length === 0) {
        break;
      }
      const part: Array<string> = raw.split('\n');
      for (let i: number = 0; i < part.length; i++) {
        if (part[i].length > 0) {
          uris.push(part[i]);
        }
      }
    }
    hilog.info(DOMAIN, TAG, 'snapshot: read %{public}d uris in %{public}d ms', uris.length, Date.now() - t0);
    return uris;
  }

  /** 用上次会话的 uri 快照重建列表（顺序与上次一致，随后 restoreIndex 会精确落到上次那张）。
   *  返回 false 表示没有可用快照。不要求当前列表为空 —— 「打开图库」也复用它。 */
  private async restoreFromSnapshot(): Promise<boolean> {
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store === undefined) {
        return false;
      }
      const uris: Array<string> = await this.readSnapUris(store);
      hilog.info(DOMAIN, TAG, 'snapshot: %{public}d uris', uris.length);
      if (uris.length === 0) {
        return false;
      }
      const p: LastPos | undefined = this.lastPos;
      const src: string = (p !== undefined && p.src.length > 0) ? p.src : '系统图库';
      this.setItems(uris, src);       // 内部 applyItems → restoreIndex → 自动落回上次那张
      this.snapDirty = false;         // 列表本来就是从快照来的，没必要再写回去
      this.status = this.status + '（来自上次会话；若图片打不开请重新选择）';
      return true;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'restore snapshot failed: %{public}s', JSON.stringify(e));
      return false;
    }
  }

  /** 静默重扫失败 / 上次不是「图库全部」时，退而用快照恢复。返回是否恢复成功。 */
  private async trySnapRestore(): Promise<boolean> {
    const saved: LastPos | undefined = this.lastPos;
    if (saved === undefined || this.items.length > 0) {
      return false;
    }
    const ok: boolean = await this.restoreFromSnapshot();
    if (!ok) {
      this.status = '上次看到「' + saved.name + '」（第 ' + (saved.idx + 1) + ' 张，来自' +
        saved.src + '）· 重新打开同一批图片会自动回到这里';
    }
    return ok;
  }

  /** 顶栏「回到上次」：当前有列表就在列表里定位；列表为空则先尝试「图库全部」重扫、再用快照恢复 */
  private resumeLast(): void {
    const p: LastPos | undefined = this.lastPos;
    if (p === undefined) {
      this.status = '还没有记录过浏览位置';
      return;
    }
    if (this.items.length > 0) {
      const i: number = this.restoreIndex(this.items);
      if (i >= 0) {
        this.select(i);
        this.status = '已回到上次位置：第 ' + (i + 1) + ' / ' + this.items.length + ' 张 · ' +
          this.items[i].name;
        return;
      }
      this.status = '当前这批图片里没有上次的「' + p.name + '」（上次来自' + p.src + '）';
      return;
    }
    if (p.src === SRC_ALL) {
      this.status = '正在重新打开图库…';
      this.loadAllGallery(); // 失败时内部会退到快照恢复
      return;
    }
    this.status = '正在回到上次位置…';
    this.trySnapRestore();
  }

  /** 只释放「我们自己解码」的那张；缓存里的预览由 LRU 负责，不能碰 */
  private releaseViewOwned(): void {
    const px: image.PixelMap | undefined = this.viewOwned;
    this.viewOwned = undefined;
    if (px !== undefined) {
      try {
        px.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'release view pixelmap skipped');
      }
    }
  }

  /** 丢弃尚未执行的合并跳转，并把滚轮状态复位 */
  private clearWheel(): void {
    if (this.wheelTimer !== -1) {
      clearTimeout(this.wheelTimer);
      this.wheelTimer = -1;
    }
    this.pendingDelta = 0;
    this.lastWheelSign = 0;
    this.lastSwitchMs = 0;
    if (this.wheelActiveTimer !== -1) {
      clearTimeout(this.wheelActiveTimer);
      this.wheelActiveTimer = -1;
    }
    this.wheelActive = false;
  }

  // ------------------------------------------------------------------
  // 数据
  // ------------------------------------------------------------------

  private curItem(): ImageItem | undefined {
    return this.cur >= 0 && this.cur < this.items.length ? this.items[this.cur] : undefined;
  }

  private curName(): string {
    const it = this.curItem();
    return it ? it.name : '未打开';
  }

  /** 图片可用框：旋转 90°/270° 时宽高互换，保证旋转后仍完整落在画布内 */
  private frameW(): number {
    return (this.rot % 180) !== 0 ? this.canvasH : this.canvasW;
  }

  private frameH(): number {
    return (this.rot % 180) !== 0 ? this.canvasW : this.canvasH;
  }

  /** objectFit=Contain 时图片相对可用框的缩放比 */
  private fitFactor(): number {
    if (this.imgW <= 0 || this.imgH <= 0) {
      return 0;
    }
    return Math.min(this.frameW() / this.imgW, this.frameH() / this.imgH);
  }

  /** 用 fileIo 取体积；图库 URI 不一定可读，失败返回 -1 */
  private trySize(uri: string): number {
    try {
      const st = fs.statSync(uri);
      return st.size;
    } catch (e) {
      return -1;
    }
  }

  private nameOf(uri: string, idx: number): string {
    const b = baseName(uri);
    return b && b.length > 0 ? b : ('图片 ' + (idx + 1));
  }

  /** 载入一组 URI，构建档案列表并默认选中第一张。
   *  体积刻意留成 -1 交给后台 fillSizes() 补 —— 见那里的注释。 */
  private setItems(uris: Array<string>, src: string): void {
    hilog.info(DOMAIN, TAG, 'setItems: %{public}d uris from %{public}s', uris.length, src);
    this.source = src;
    const list: ImageItem[] = [];
    for (let i = 0; i < uris.length; i++) {
      const u: string = uris[i];
      const item: ImageItem = { uri: u, name: this.nameOf(u, i), size: -1 };
      list.push(item);
    }
    this.applyItems(list, src, '');
  }

  /** 统一入口：提交档案列表、刷新计数与数据源、重建预览与预载。
   *  起始位置：优先恢复到上次浏览的那张（见 restoreIndex），否则从第 1 张开始。 */
  private applyItems(list: ImageItem[], src: string, capped: string): void {
    this.items = list;
    this.source = src;
    this.itemCount = list.length;
    this.dataSource.reload(list);
    // 先算出落点再解码：否则会先按第 1 张解一遍、恢复时又解一遍，白白多一次大图解码
    const start: number = this.restoreIndex(list);
    this.cur = list.length > 0 ? (start >= 0 ? start : 0) : -1;
    this.resetView();
    if (this.cur >= 0) {
      this.loadMeta(this.cur);
      this.scroller.scrollToIndex(this.cur, false);
    }
    if (start >= 0) {
      this.resumeHint = ''; // 已经回到上次位置，空态提示不再需要
    }
    const where: string = start >= 0 ? (' · 已回到上次位置（第 ' + (start + 1) + ' 张）') : '';
    this.status = '已载入 ' + list.length + ' 张（' + src + '）' + capped + where;
    hilog.info(DOMAIN, TAG, 'applyItems: %{public}d items, start at %{public}d', list.length, this.cur);
    this.clearWheel();     // 换了图片源，攒着的滚轮步数必须作废
    this.clearPreviews();
    this.failed.clear();   // 换了图片源，上一批的「解不开」黑名单作废
    // 接上启动预热的那张：此刻列表已有、cur 已定，交给缓存后 showPreviewOf 会直接命中。
    // 若它不属于这一批（用户换了别的来源），schedulePreload → evictOutside 会顺手释放掉。
    if (this.warm !== undefined) {
      const w: PreviewEntry = this.warm;
      this.warm = undefined;
      this.pushPreview(w);
      const at: string = this.cur >= 0 ? this.items[this.cur].uri : '';
      hilog.info(DOMAIN, TAG, 'warm: adopted %{public}s', w.uri === at ? 'on current' : 'not current');
    }
    this.showPreviewOf(this.cur);
    this.schedulePreload();
    this.fillSizes();
    this.snapDirty = true; // 列表换了 → 下次写盘时把这一批 uri 存成快照
    this.markPos();        // 顺带把「起始位置」也记下来（含快照在内一起落盘）
  }

  /** 后台分批补测体积。
   *
   *  为什么不能在主线程里逐个 fs.statSync：那是一次同步系统调用，几百张图就是几百次，
   *  会把 UI 线程卡死直至 ANR（这本身就是「图片一多就崩」的成因之一）。
   *  这里切成小批，批与批之间 setTimeout 让出主线程 ——
   *  用户会看到列表里的体积陆续从 '--' 变成实际值，界面始终可操作。 */
  private fillSizes(): void {
    this.sizeSeq++;
    const seq: number = this.sizeSeq;
    let i: number = 0;
    let batch: number = 0;
    const step = (): void => {
      if (seq !== this.sizeSeq || i >= this.items.length) {
        hilog.info(DOMAIN, TAG, 'fillSizes: end at %{public}d / %{public}d', i, this.items.length);
        return; // 换了数据源，这批作废
      }
      batch++;
      if (batch % 10 === 0) {
        hilog.info(DOMAIN, TAG, 'fillSizes: %{public}d / %{public}d', i, this.items.length);
      }
      const end: number = Math.min(i + SIZE_CHUNK, this.items.length);
      let changed: boolean = false;
      for (let k: number = i; k < end; k++) {
        if (this.items[k].size < 0) {
          const s: number = this.trySize(this.items[k].uri);
          if (s > 0) {
            this.items[k].size = s;
            changed = true;
          }
        }
      }
      i = end;
      if (changed) {
        this.dataSource.reload(this.items); // 通知 LazyForEach 重取 @Prop
      }
      if (i < this.items.length) {
        setTimeout(() => {
          step();
        }, SIZE_YIELD_MS);
      }
    };
    step();
  }

  private loadMeta(idx: number): void {
    this.imgW = 0;
    this.imgH = 0;
    const it = this.items[idx];
    if (!it) {
      this.bytes = 0;
      return;
    }
    this.bytes = it.size > 0 ? it.size : this.trySize(it.uri);
  }

  // ------------------------------------------------------------------
  // 视图操作
  // ------------------------------------------------------------------

  private resetView(): void {
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
    this.rot = 0;
    this.flipH = false;
    this.flipV = false;
  }

  private zoomBy(factor: number): void {
    this.zoom = clamp(this.zoom * factor, MIN_SCALE, MAX_SCALE);
    this.status = '缩放 ' + Math.round(this.zoom * 100) + '%';
  }

  private setZoomTo(v: number): void {
    this.zoom = clamp(v, MIN_SCALE, MAX_SCALE);
  }

  /** 以某个点为锚缩放：factor 为相对当前倍率的比例（1.5 = 放大 50%，2.0 = 放大 100%）。
   *  ax / ay 为锚点相对组件左上角的坐标；< 0 或处于旋转态时退化为「以画面中心缩放」。
   *
   *  锚点推导：设 d 为光标相对画面中心的偏移、t 为平移量、z 为缩放，
   *  则光标下的内容点满足 d = t + z·p。要让它缩放后仍在原位：
   *      d = t' + z'·p = t' + (z'/z)(d − t)   ⇒   t' = d − (z'/z)(d − t)
   *  好处是放大时光标下的那个点不会跑掉，符合 ACDSee / Photoshop 的习惯。 */
  private zoomAt(factor: number, ax: number, ay: number): void {
    const old: number = this.zoom;
    const next: number = clamp(old * factor, MIN_SCALE, MAX_SCALE);
    if (next === old) {
      this.status = '已达缩放极限 ' + Math.round(old * 100) + '%';
      return;
    }
    const k: number = next / old;
    if (this.rot === 0 && ax >= 0 && ay >= 0) {
      const dx: number = ax - this.canvasW / 2;
      const dy: number = ay - this.canvasH / 2;
      this.tx = dx - k * (dx - this.tx);
      this.ty = dy - k * (dy - this.ty);
    } else {
      // 旋转态下懒得做坐标旋转，直接以中心缩放并复位平移，行为最可预期
      this.tx = 0;
      this.ty = 0;
    }
    this.zoom = next;
    this.status = '缩放 ' + Math.round(this.zoom * 100) + '%';
  }

  /** 鼠标按键：左键放大 50% / 右键放大 100%，均以光标为锚点。
   *  用「按下→抬起位移」区分点击与拖拽：拖拽是平移手势，不应顺带触发缩放。 */
  private onMouseButton(event: MouseEvent): void {
    if (event.action === MouseAction.Press) {
      this.pressBtn = event.button;
      this.pressX = event.x;
      this.pressY = event.y;
      this.pressMoved = false;
      // 右键别让系统弹菜单
      if (event.button === MouseButton.Right) {
        event.stopPropagation();
      }
      return;
    }
    if (event.action === MouseAction.Move) {
      if (this.pressBtn >= 0 &&
        (Math.abs(event.x - this.pressX) > CLICK_MOVE_TOL ||
          Math.abs(event.y - this.pressY) > CLICK_MOVE_TOL)) {
        this.pressMoved = true;
      }
      return;
    }
    if (event.action === MouseAction.Release && this.pressBtn >= 0) {
      const btn: number = this.pressBtn;
      const moved: boolean = this.pressMoved;
      this.pressBtn = -1;
      if (moved) {
        return; // 拖拽平移，不算点击
      }
      if (btn !== MouseButton.Left && btn !== MouseButton.Right) {
        return;
      }
      // 立即执行，不做任何延迟 —— 单击放大是最高频操作，延迟会明显发滞
      this.zoomAt((btn === MouseButton.Left) ? ZOOM_LEFT : ZOOM_RIGHT, event.x, event.y);
    }
  }

  /** 1:1 —— 一个图片像素对应一个 vp 像素 */
  private zoomPixelPerfect(): void {
    this.tx = 0;
    this.ty = 0;
    const f = this.fitFactor();
    if (f <= 0) {
      this.zoom = 1;
      this.status = '尺寸未就绪，先按适应窗口显示';
      return;
    }
    this.zoom = clamp(1 / f, MIN_SCALE, MAX_SCALE);
    this.status = '1:1 原始像素（' + this.imgW + ' × ' + this.imgH + '）';
  }

  private rotateBy(delta: number): void {
    this.rot = (this.rot + delta + 360) % 360;
    this.status = '旋转 ' + this.rot + '°';
  }

  private toggleFlipH(): void {
    this.flipH = !this.flipH;
    this.status = this.flipH ? '已水平镜像' : '已取消水平镜像';
  }

  private toggleFlipV(): void {
    this.flipV = !this.flipV;
    this.status = this.flipV ? '已垂直镜像' : '已取消垂直镜像';
  }

  private select(idx: number): void {
    if (idx < 0 || idx >= this.items.length) {
      return;
    }
    this.cur = idx;
    this.resetView();
    this.loadMeta(idx);
    this.showPreviewOf(idx);
    this.scroller.scrollToIndex(idx, false);
    this.status = '第 ' + (idx + 1) + ' / ' + this.items.length + ' 张';
    // LazyForEach 不会自动感知 selected 变化，通知数据源重取 @Prop（只重建可见的几行）
    this.dataSource.reload(this.items);
    this.schedulePreload();
    this.markPos(); // 记住位置，下次启动自动回到这里
  }

  private go(delta: number): void {
    if (this.items.length === 0) {
      return;
    }
    const n = this.items.length;
    this.cur = ((this.cur + delta) % n + n) % n;
    this.resetView();
    this.loadMeta(this.cur);
    this.showPreviewOf(this.cur);
    // 第二个参数 smooth=false：快速翻页时不要播滚动动画，否则每次切换都重启一段动画，
    // 左侧列表会一直「追」不上当前项，观感上就是图片和列表错位。
    this.scroller.scrollToIndex(this.cur, false);
    this.status = '第 ' + (this.cur + 1) + ' / ' + n + ' 张';
    this.dataSource.reload(this.items); // 同步左侧高亮（只重建可见的几行）
    this.schedulePreload();
    this.markPos(); // 记住位置，下次启动自动回到这里
  }

  /** 滚轮翻页：去抖 + 合并。
   *
   *  为什么不能「来一个轴事件就翻一张」（这正是快速滚动时图片错位的根源）：
   *   1) 一个物理滚轮刻度会连发多个轴事件 —— 同一短窗口内同方向的事件只算一步；
   *   2) 快速滚动时事件频率远高于解码速度。逐张切换会让解码队列堆积，
   *      预览层 / 原图层来回交替、原图可能还停留在上一张，看起来就是「图片移位」。
   *
   *  所以这里把窗口内攒下的步数**合并成一次跳转**，只渲染最终落点那一张：
   *  中间张根本不解码（这是关键收益），既不会丢滚动量，也不会出现解码跟不上导致的错位。 */
  private onWheel(dir: number): void {
    const now: number = Date.now();
    // 翻页用的滚轮一动就把画布拉回正中：万一此前被「伪拖拽」带偏了，立刻纠正，不必等 go()。
    // Ctrl + 滚轮是缩放，不复位 —— 那时平移量是要保留的锚点。
    if (!this.ctrlDown) {
      this.tx = 0;
      this.ty = 0;
    }
    // ① 同一刻度的连发事件（以及同方向的高频事件）合并成一步
    if (dir === this.lastWheelSign && now - this.lastWheelMs < WHEEL_NOTCH_MS) {
      return;
    }
    this.lastWheelSign = dir;
    this.lastWheelMs = now;
    // 标记「滚轮正在滚」并延后解除：PanGesture 据此判断这次是不是真拖拽
    this.wheelActive = true;
    if (this.wheelActiveTimer !== -1) {
      clearTimeout(this.wheelActiveTimer);
    }
    this.wheelActiveTimer = setTimeout(() => {
      this.wheelActiveTimer = -1;
      this.wheelActive = false;
    }, WHEEL_PAN_GUARD_MS);
    // ② 攒起来，交给 flushWheel 按固定节奏落到渲染上
    this.pendingDelta += dir;
    this.flushWheel();
  }

  /** 合并后的跳转至少间隔 WHEEL_STEP_MS，给解码留出时间 */
  private flushWheel(): void {
    if (this.pendingDelta === 0 || this.wheelTimer !== -1) {
      return; // 没有待消费的步数，或已经排了一个定时任务
    }
    const wait: number = Math.max(0, WHEEL_STEP_MS - (Date.now() - this.lastSwitchMs));
    if (wait > 0) {
      this.wheelTimer = setTimeout(() => {
        this.wheelTimer = -1;
        this.flushWheel();
      }, wait);
      return;
    }
    const d: number = this.pendingDelta;
    this.pendingDelta = 0;
    this.lastSwitchMs = Date.now();
    if (this.ctrlDown) {
      this.zoomBy(d > 0 ? 0.9 : 1.1);
      return;
    }
    this.go(d);
  }

  private toggleSlide(): void {
    if (this.playing) {
      this.stopSlide();
      return;
    }
    if (this.items.length === 0) {
      this.status = '先打开图片再播放幻灯片';
      return;
    }
    this.playing = true;
    this.status = '幻灯片播放中（每 ' + (SLIDE_INTERVAL / 1000) + ' 秒切换）';
    this.timerId = setInterval(() => {
      this.go(1);
    }, SLIDE_INTERVAL);
  }

  private stopSlide(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
    if (this.playing) {
      this.playing = false;
      this.status = '幻灯片已暂停';
    }
  }

  // ------------------------------------------------------------------
  // 打开图片来源
  // ------------------------------------------------------------------

  /** 顶栏「打开图库」：默认即「图库内全部图片」，不要求用户逐张勾选。
   *
   *  为什么不能直接拉起系统选择器：选择器的语义就是「让用户挑几张」，
   *  没有「全选」接口，而且官方把 maxSelectNumber 卡在 500 —— 图库上千张时选不全。
   *  「打开图库」想要的其实是「把图库里的图都给我」，故优先走免交互的全量扫描。
   *
   *  三级降级（根源是 ohos.permission.READ_IMAGEVIDEO 属受限权限，三方应用默认拿不到）：
   *   ① 静默全量扫描 getAssets —— 已授权就直接拿到图库全部，零交互；
   *   ② 未授权但上次留有 uri 快照 → 用它重建列表，同样零交互；
   *   ③ 连快照都没有（首次使用）→ 申请一次权限，成功则全量扫描；
   *   ④ 仍不行 → 才回退系统图库选择器（免权限，但需手动勾选，上限 500 张）。
   *
   *  ② 是关键：只要上次成功载入过（来自全量扫描或选择器都行），uri 快照就已落盘，
   *  于是「打开图库」从第二次起完全不必手动挑选 —— 这正是本次改动的目的。
   *  它也刻意排在「申请权限」之前：没权限时优先用快照，不打扰用户。 */
  private async openGallery(): Promise<void> {
    if (GALLERY_ALWAYS_PICK) {
      // 直接进图库界面勾选：不扫描、不读快照、不申请权限 —— 点一下就是「重新挑」
      this.status = '正在打开图库选择器…（可多选，上限 ' + PICKER_MAX + ' 张）';
      await this.openPicker();
      return;
    }
    const ctx: common.Context | undefined = this.getUIContext().getHostContext();
    if (!ctx) {
      this.status = '无法获取应用上下文';
      return;
    }
    this.status = '正在读取图库…';
    hilog.info(DOMAIN, TAG, 'openGallery: step1 scanAll');
    if (await this.scanAll(ctx)) {
      return; // ① 有权限：全量载入，一张都不用点
    }
    hilog.info(DOMAIN, TAG, 'openGallery: step2 snapshot');
    if (await this.restoreFromSnapshot()) {
      return; // ② 用上次会话的列表，零交互
    }
    if (!this.permAsked) {
      this.permAsked = true;
      hilog.info(DOMAIN, TAG, 'openGallery: step3 requestPermission');
      const code: number = await this.ensureGalleryPermission(ctx);
      hilog.info(DOMAIN, TAG, 'openGallery: permission code %{public}d', code);
      if (code === 0 && await this.scanAll(ctx)) {
        return; // ③ 刚拿到授权
      }
    }
    hilog.info(DOMAIN, TAG, 'openGallery: step4 openPicker');
    this.status = '无法全量读取图库（受限权限）→ 已打开系统选择器，上限 500 张';
    this.openPicker(); // ④ 兜底
  }

  /** 系统图库选择器（PhotoViewPicker）：兜底用 —— 免权限，但需要用户自己勾选。
   *  注：@ohos.file.picker 下的 PhotoViewPicker / PhotoSelectOptions / MIMEType / select / photoUris
   *  在 API 26 均已废弃，改用 photoAccessHelper 的同名能力（且不需要 context）。
   *  另外 MIMEType 必须与 PhotoSelectOptions 取自同一模块，否则会因两个同名枚举而类型不匹配。 */
  private async openPicker(): Promise<void> {
    if (!GALLERY_USE_PHOTO_PICKER) {
      this.openFiles(); // 改用文件选择器（图片后缀已过滤），见该常量注释
      return;
    }
    if (this.pickerBusy) {
      return; // 上一个还开着：连点会叠出两个选择器，后面那个往往就是「点不动」的那个
    }
    this.pickerBusy = true;
    try {
      const opt = new photoAccessHelper.PhotoSelectOptions();
      opt.maxSelectNumber = PICKER_MAX; // 系统上限即 500
      try {
        opt.MIMEType = photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE;
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'set MIMEType skipped: %{public}s', JSON.stringify(e));
      }
      const pv = new photoAccessHelper.PhotoViewPicker();
      hilog.info(DOMAIN, TAG, 'openPicker: select begin');
      const res: photoAccessHelper.PhotoSelectResult = await pv.select(opt);
      const uris = res.photoUris;
      hilog.info(DOMAIN, TAG, 'openPicker: got %{public}d uris', uris ? uris.length : -1);
      if (!uris || uris.length === 0) {
        this.status = '已取消选择';
        return;
      }
      this.setItems(uris, '系统图库');
    } catch (e) {
      const err = e as BusinessError;
      const code: number = err && err.code !== undefined ? err.code : -1;
      hilog.error(DOMAIN, TAG, 'openPicker failed: code=%{public}d %{public}s', code, JSON.stringify(e));
      // 兜底：图库选择器起不来（部分 2in1/PC 上会这样）→ 直接转文件选择器，别让用户卡在空状态
      this.status = '图库选择器不可用（code ' + code + '）→ 已改开文件选择器';
      this.openFiles();
    } finally {
      this.pickerBusy = false;
    }
  }

  /** 不经选择器，直接扫描图库中「全部」图片（启动自动恢复 / 「回到上次」用）。
   *  静默：拿不到就静默降级到快照恢复，绝不弹窗、绝不打断用户。
   *
   *  两条路线的取舍（重要）：
   *   1) 图库选择器 PhotoViewPicker —— 免权限，但官方限制 maxSelectNumber 最大 500，
   *      图库里有几千张时选不到全部，且需要用户逐张勾选。
   *   2) PhotoAccessHelper.getAssets —— 能拿到全部，零交互，但需要受控权限
   *      ohos.permission.READ_IMAGEVIDEO。该权限属「受限开放权限」，
   *      三方应用默认申请不到，需在 AGC 提交场景材料申请权限证书、
   *      并配置正式签名后才会真正授予。
   *
   *  故：优先 2（零交互），失败退回 1（需交互，但至少能用）。 */
  private async loadAllGallery(): Promise<void> {
    const ctx: common.Context | undefined = this.getUIContext().getHostContext();
    if (!ctx) {
      this.status = '无法获取应用上下文';
      return;
    }
    await this.queryAllPhotos(ctx);
  }

  /** 动态申请读取图库权限，返回 authResults[0]：
   *   0 = 已授权；-1 = 未授权（需去「设置」里改）；2 = 请求无效
   *      （未在 module.json5 声明 / 权限名非法 / 该权限有特殊申请条件）；-1 也用作异常兜底。
   *
   *  这里刻意用 `await` 而不是 `.then((res: Xxx) => …)` 再手写类型：
   *  `PermissionRequestResult` 并非 `abilityAccessCtrl` 命名空间的成员（写成
   *  `abilityAccessCtrl.PermissionRequestResult` 会报 "no exported member"），
   *  而 await 能直接由 Promise 推导出该类型，不必显式写出类型名。 */
  private async ensureGalleryPermission(ctx: common.Context): Promise<number> {
    try {
      const atManager: abilityAccessCtrl.AtManager = abilityAccessCtrl.createAtManager();
      const res = await atManager.requestPermissionsFromUser(ctx, ['ohos.permission.READ_IMAGEVIDEO']);
      const results: Array<number> = res.authResults;
      return results.length > 0 ? results[0] : 2;
    } catch (e) {
      hilog.error(DOMAIN, TAG, 'requestPermissionsFromUser failed: %{public}s', JSON.stringify(e));
      return -1;
    }
  }

  /** 试着全量扫描图库。成功返回 true（列表已载入）；失败返回 false —— 不弹窗、不改状态栏。
   *
   *  单独抽出来，是为了让「打开图库」能先静默试一次：拿到了就用（零交互），
   *  拿不到再决定要不要申请权限、要不要退到选择器。
   *
   *  用 DataShare 谓词在「数据库层」完成过滤与排序，避免把全量数据拉进内存再筛。
   *  同理用 await 而不是 `.then((result: Xxx) => …)`：`FetchResult` 的类型参数
   *  在不同版本 SDK 上写法不一，靠 await 推导就不必写出类型名。 */
  private async scanAll(ctx: common.Context): Promise<boolean> {
    try {
      const helper: photoAccessHelper.PhotoAccessHelper = photoAccessHelper.getPhotoAccessHelper(ctx);
      const predicates: dataSharePredicates.DataSharePredicates = new dataSharePredicates.DataSharePredicates();
      // 只要图片，排除视频；按加入时间倒序（最新在前）
      // 这里直接写媒体库的列名字符串而非 PhotoKeys 枚举：各版本 SDK 里该成员名
      // 有 PHOTO_TYPE / MEDIA_TYPE 两种写法，用列名 'media_type' / 'date_added' 最稳。
      predicates.equalTo('media_type', photoAccessHelper.PhotoType.IMAGE);
      predicates.orderByDesc('date_added'); // 注意是 orderByDesc，不是 orderDesc
      const fetchOptions: photoAccessHelper.FetchOptions = {
        fetchColumns: [], // 空数组 = 取默认列（含 uri / displayName / size）
        predicates: predicates
      };
      // ⚠️ 这一行会报 ArkTS WARN「需要申请 ohos.permission.READ_IMAGEVIDEO」—— 是预期的，不必修。
      //    一旦在 module.json5 里声明该权限，debug 签名安装会直接失败（code: 9568289）。
      //    当前策略：不声明 → 该函数正常编译，运行时未授权会自动降级（见 openGallery 注释）。
      // 不用 getCount()：它在部分版本是同步返回值、在另一部分是 Promise，签名不一致；
      // getAllObjects() 一次性取回结果集即可。
      hilog.info(DOMAIN, TAG, 'scanAll: getAssets begin');
      const result = await helper.getAssets(fetchOptions);
      hilog.info(DOMAIN, TAG, 'scanAll: getAssets ok');
      hilog.info(DOMAIN, TAG, 'scanAll: getAllObjects begin');
      const assets = await result.getAllObjects();
      hilog.info(DOMAIN, TAG, 'scanAll: getAllObjects got %{public}d', assets ? assets.length : -1);
      if (!assets || assets.length === 0) {
        return false;
      }
      hilog.info(DOMAIN, TAG, 'scanAll: setAssets begin');
      this.setAssets(assets, SRC_ALL);
      hilog.info(DOMAIN, TAG, 'scanAll: done');
      return true;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'scanAll failed: %{public}s', JSON.stringify(e));
      return false;
    }
  }

  /** 把 PhotoAsset 数组落成档案列表（直接取元信息，比逐个 stat 文件快得多） */
  private setAssets(assets: Array<photoAccessHelper.PhotoAsset>, src: string): void {
    this.source = src;
    const list: ImageItem[] = [];
    const n: number = Math.min(assets.length, SCAN_CAP);
    hilog.info(DOMAIN, TAG, 'setAssets: %{public}d assets, cap %{public}d', assets.length, n);
    for (let i = 0; i < n; i++) {
      const a: photoAccessHelper.PhotoAsset = assets[i];
      let uri: string = '';
      try {
        uri = a.uri;
      } catch (e) {
        uri = '';
      }
      if (uri.length === 0) {
        continue;
      }
      let name: string = '';
      try {
        name = a.displayName;
      } catch (e) {
        name = '';
      }
      // PhotoAsset 上既没有 size 也没有 width/height 属性，统一用 get('列名') 取。
      // 注意 get() 的返回类型是 MemberType（string | number | boolean 等），
      // 不能窄注成 string | number，必须逐个 typeof 收窄。
      let size: number = -1;
      try {
        const raw = a.get('size');
        if (typeof raw === 'number') {
          size = raw;
        } else if (typeof raw === 'string') {
          size = parseInt(raw, 10);
        }
        if (isNaN(size) || size <= 0) {
          size = -1;
        }
      } catch (e) {
        size = -1;
      }
      const item: ImageItem = {
        uri: uri,
        name: name.length > 0 ? name : this.nameOf(uri, i),
        // 取不到就交后台 fillSizes() 补，这里不做同步 stat
        size: size
      };
      list.push(item);
    }
    const capped: string = assets.length > n ? ('（已按 ' + n + ' 张截断）') : '';
    this.applyItems(list, src, capped);
  }

  /** 静默全量扫描；失败则退到快照恢复（启动自动恢复 / 「回到上次」走这条）。 */
  private async queryAllPhotos(ctx: common.Context): Promise<void> {
    if (await this.scanAll(ctx)) {
      return;
    }
    this.trySnapRestore();
  }

  // ------------------------------------------------------------------
  // 后台预载（低清预览缓存）
  //
  // 思路（与 ACDSee 的「先出缩略预览再 sharpen」一致）：
  //   · 后台把当前位置「前后各 20 张」解码成「低清预览 PixelMap」并缓存；
  //   · 切到某张时，若缓存命中就立刻把预览画上去，原图解码完成后再覆盖掉预览。
  //   · 窗口是**跟着当前位置滑动**的（evictOutside）：翻到哪就缓存哪附近，
  //     远处那些立刻释放 —— 翻一整个大图库内存也不会一路涨上去。
  //   · 预载图长边压到 PRELOAD_EDGE（768px）—— 多张同时驻留内存的前提，
  //     若按原图分辨率预载，几十张就是几个 GB，必然 OOM。
  // ------------------------------------------------------------------

  /** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
   *  edge = PRELOAD_EDGE 时得到低清预览；edge = 画布长边×2 时得到主视图用的清晰图。 */
  private decodeTo(uri: string, edge: number): Promise<PreviewEntry | undefined> {
    // 抽离到模块级 decodePx：列表缩略图也用同一份解码逻辑（同一套系统 codec）
    return decodePx(uri, edge);
  }

  /** 查缓存；命中则移到队尾（LRU）。返回整条 Entry（过渡层还要用它的原图宽高） */
  private previewEntry(uri: string): PreviewEntry | undefined {
    for (let i = this.previews.length - 1; i >= 0; i--) {
      if (this.previews[i].uri === uri) {
        const e: PreviewEntry = this.previews[i];
        if (i !== this.previews.length - 1) {
          this.previews.splice(i, 1);
          this.previews.push(e);
        }
        return e;
      }
    }
    return undefined;
  }

  /** 入缓存，并按「张数 + 总字节」双重上限淘汰最旧的 */
  private pushPreview(e: PreviewEntry): void {
    this.previews.push(e);
    this.preloadBytes += e.bytes;
    while ((this.previews.length > PRELOAD_COUNT || this.preloadBytes > PRELOAD_MAX_BYTES) &&
      this.previews.length > 1) {
      const old: PreviewEntry = this.previews[0];
      // 正在显示的不能淘汰：它是主视图 / 过渡层的图，release 掉会让画面变黑/花屏
      if (old.px === this.viewPixelMap || old.px === this.lowPixelMap) {
        break;
      }
      this.previews.splice(0, 1);
      this.preloadBytes -= old.bytes;
      try {
        old.px.release();
      } catch (err) {
        hilog.warn(DOMAIN, TAG, 'release preview skipped');
      }
    }
  }

  /** 释放「窗口外」的缓存 —— 让缓存真正跟着位置滑动。
   *  只靠 LRU 容量淘汰的话，跳转（回到上次 / 点列表跳很远）之后，远处那一批旧图还会赖着，
   *  把新窗口的位置挤掉；这里按位置主动清掉，翻多远内存都稳定在窗口大小。 */
  private evictOutside(): void {
    if (this.cur < 0) {
      return;
    }
    const lo: number = this.cur - PRELOAD_BACK;
    const hi: number = this.cur + PRELOAD_FWD;
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const e: PreviewEntry = this.previews[i];
      if (this.inWindow(e.uri, lo, hi)) {
        continue;
      }
      // 正在显示 / 正在做过渡的那张不能 release，否则画面变黑或花屏
      if (e.px === this.viewPixelMap || e.px === this.lowPixelMap) {
        continue;
      }
      this.previews.splice(i, 1);
      this.preloadBytes -= e.bytes;
      try {
        e.px.release();
      } catch (err) {
        hilog.warn(DOMAIN, TAG, 'release preview skipped');
      }
    }
  }

  /** uri 是否落在 [lo, hi] 这段位置上（端点按列表范围裁剪） */
  private inWindow(uri: string, lo: number, hi: number): boolean {
    const n: number = this.items.length;
    const from: number = lo < 0 ? 0 : lo;
    const to: number = hi > n - 1 ? n - 1 : hi;
    for (let i = from; i <= to; i++) {
      if (this.items[i].uri === uri) {
        return true;
      }
    }
    return false;
  }

  private clearPreviews(): void {
    this.clearBlur(); // 过渡层用的正是缓存里那张，必须先撤掉再 release，否则会花屏
    for (let i = 0; i < this.previews.length; i++) {
      try {
        this.previews[i].px.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'release preview skipped');
      }
    }
    this.previews = [];
    this.preloadBytes = 0;
    // 缓存被清空后，当前显示的若正是缓存里的那张，就不能再指向它
    this.viewPixelMap = undefined;
    this.releaseViewOwned();
  }

  /** 切到第 idx 张时调用。
   *  ① 先把代号 +1，作废一切在途的异步回调（含过渡动画）；
   *  ② 命中预载缓存就把那张低清图盖到「过渡层」上做**大模糊**，再分档收敛（对焦感）；
   *  ③ 同时异步解码「画布长边 ×2」的清晰图，回来校验代号后放到底层，并让过渡层淡出。
   *
   *  分层的意义（这是本版的关键结构）：
   *    底层 = 清晰图（不带任何模糊，最终画面一定锐利）
   *    上层 = 低清图 + blur（只存在于过渡的这几百毫秒）
   *  于是「模糊 → 清晰」是**两层交叉**出来的，而不是对清晰图反复做模糊 ——
   *  后者每帧都要重算大图模糊，代价极高，还会把最终画面也弄糊。
   *  依然是「代号校验」那一套：任何迟到的回调都盖不到新图上，不会串图、不会残留。 */
  private showPreviewOf(idx: number): void {
    this.curToken++;
    const token: number = this.curToken;
    this.releaseViewOwned();
    this.viewFailed = false;
    this.viewPixelMap = undefined;
    this.imgW = 0;
    this.imgH = 0;
    if (idx < 0 || idx >= this.items.length) {
      this.clearBlur();
      return;
    }
    const uri: string = this.items[idx].uri;
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    if (hit !== undefined) {
      this.startFocus(hit); // 缓存命中：立刻出现模糊层，随后逐档对焦
    } else {
      this.clearBlur();     // 没有低清可过渡：先空着，等 loadQuick 解回来再对焦
      this.loadQuick(uri, token);
    }
    this.loadView(uri, token);
  }

  // ---- 过渡动画 ----

  /** 盖上低清模糊层并开始对焦：blur 从 BLUR_MAX 分档降到 ~0。
   *  分档而不是逐帧：每改一次 blur 就要重绘一次这一层，档数少一点更省，
   *  而因为它只是一张 768px 的小图，重绘成本本来就极低。 */
  private startFocus(e: PreviewEntry): void {
    this.focusSeq++;
    const seq: number = this.focusSeq;
    this.noteShown(e.uri); // 画面已经出来了（哪怕是低清过渡层）→ 这张算「成功显示过」
    this.lowPixelMap = e.px;
    this.blurRadius = BLUR_MAX;
    this.lowOpacity = 1;
    if (this.imgW <= 0) {
      this.imgW = e.w; // 先让用户看到尺寸，清晰图到了再校正
      this.imgH = e.h;
    }
    let step: number = BLUR_STEPS;
    const tick = (): void => {
      if (seq !== this.focusSeq) {
        return; // 又切了图：这次对焦作废
      }
      step--;
      if (step <= 0) {
        return;
      }
      this.blurRadius = Math.round(BLUR_MAX * step / BLUR_STEPS);
      setTimeout(() => {
        tick();
      }, BLUR_STEP_MS);
    };
    setTimeout(() => {
      tick();
    }, BLUR_STEP_MS);
  }

  /** 清晰图就绪（或确认失败）→ 低清层淡出，露出底下的清晰图。
   *
   *  刻意**不用 animateTo**：ArkUI 的 animateTo 一旦启动就无法取消，
   *  而滚轮连翻时上一张的淡出往往还没跑完（约 88ms，与 WHEEL_STEP_MS 120ms 同量级），
   *  它会继续把新图的 opacity 往 0 拉，新图的过渡就没了。
   *  改用与对焦阶段同一套「分档 + 代号」：切图时 focusSeq++ 立即作废，状态完全可控。 */
  private finishFocus(): void {
    if (this.lowPixelMap === undefined) {
      return;
    }
    this.focusSeq++; // 停掉还在跑的分档对焦，改由淡出链收尾
    const seq: number = this.focusSeq;
    const startBlur: number = this.blurRadius;
    let i: number = BLUR_FADE_STEPS;
    const tick = (): void => {
      if (seq !== this.focusSeq) {
        return; // 又切了图：这次淡出作废（新图的过渡由它自己做）
      }
      i--;
      if (i <= 0) {
        this.clearBlur();
        return;
      }
      const k: number = i / BLUR_FADE_STEPS;
      this.lowOpacity = k;
      this.blurRadius = Math.round(startBlur * k);
      setTimeout(() => {
        tick();
      }, BLUR_FADE_STEP_MS);
    };
    setTimeout(() => {
      tick();
    }, BLUR_FADE_STEP_MS);
  }

  /** 过渡层的附加缩放系数：模糊越大越「推近」（最多 +2%），对焦完成恰好回到 1.0，
   *  与底层清晰图完全重合，不会留下错位。 */
  private focusZoom(): number {
    return 1 + BLUR_ZOOM * (this.blurRadius / BLUR_MAX);
  }

  /** 立刻撤掉过渡层（不播动画） */
  private clearBlur(): void {
    this.focusSeq++;
    this.lowPixelMap = undefined;
    this.blurRadius = 0;
    this.lowOpacity = 0;
  }

  /** 低清占位：与主视图解码并行，谁先回来谁先顶上（都是「当前这张」，不会串图） */
  private async loadQuick(uri: string, token: number): Promise<void> {
    const q: PreviewEntry | undefined = await this.decodeTo(uri, PRELOAD_EDGE);
    if (token !== this.curToken) {
      if (q !== undefined) {
        try {
          q.px.release();
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'release stale quick skipped');
        }
      }
      return;
    }
    if (q === undefined) {
      return;
    }
    // 清晰图还没就绪 → 用它起一段「模糊 → 对焦」过渡（同一张图，只是分辨率低）
    if (this.viewOwned === undefined) {
      this.startFocus(q);
    }
    this.pushPreview(q);
  }

  /** 主视图解码：按画布尺寸决定目标分辨率，解码完成后校验代号再替换 */
  private async loadView(uri: string, token: number): Promise<void> {
    const edge: number = this.viewEdge();
    hilog.info(DOMAIN, TAG, 'loadView: begin edge=%{public}d', edge);
    const ret: PreviewEntry | undefined = await this.decodeTo(uri, edge);
    hilog.info(DOMAIN, TAG, 'loadView: decoded %{public}s', ret === undefined ? 'FAILED' : 'ok');
    // 解码期间又切了图 → 丢弃这次结果（并释放我们自己刚解出来的那张），绝不能盖到新图上
    if (token !== this.curToken) {
      if (ret !== undefined) {
        try {
          ret.px.release();
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'release stale view skipped');
        }
      }
      return;
    }
    if (ret === undefined) {
      // 自己解码失败（例如某些 uri 打不开）→ 标记失败，让 UI 回退到 Image(uri) 由系统解码
      this.viewPixelMap = undefined;
      this.viewFailed = true;
      this.finishFocus(); // 兜底图由系统解码，过渡层照常淡出
      return;
    }
    this.noteShown(uri); // 清晰图到位 → 这张确实显示成功，下次启动预热它
    this.releaseViewOwned();
    this.viewOwned = ret.px;
    this.viewPixelMap = ret.px;
    this.imgW = ret.w;
    this.imgH = ret.h;
    this.finishFocus(); // 清晰图到位 → 低清模糊层淡出（这才是「动态模糊」的收尾）
  }

  /** 主视图解码的长边：画布长边 × 2（放大到 200% 仍清晰），并夹在 [1600, 4096] 内控制内存 */
  private viewEdge(): number {
    const base: number = Math.max(this.canvasW, this.canvasH);
    const e: number = Math.round(base * 2);
    return Math.max(VIEW_EDGE_MIN, Math.min(VIEW_EDGE_MAX, e));
  }

  /** 启动后台预载。已在跑就只自增代号，让现有链自动跟到最新位置，避免并发多条链。 */
  private schedulePreload(): void {
    this.evictOutside(); // 先把窗口外的释放掉，位置一变就跟着挪，内存不随翻页累积
    this.preloadSeq++;
    if (this.preloadBusy) {
      return;
    }
    this.preloadBusy = true;
    this.preloadNext(this.preloadSeq);
  }

  /** 一张一张解码，每张之间用 setTimeout 让出主线程，避免卡住 UI */
  private preloadNext(seq: number): void {
    if (seq !== this.preloadSeq) {
      this.preloadNext(this.preloadSeq); // 跟到最新位置继续跑
      return;
    }
    let target: string = '';
    // 先补「前方」（主要浏览方向）
    for (let k = 1; k <= PRELOAD_FWD; k++) {
      const i: number = this.cur + k;
      if (i >= this.items.length) {
        break;
      }
      const u: string = this.items[i].uri;
      if (this.previewEntry(u) === undefined && !this.failed.has(u)) {
        target = u;
        break;
      }
    }
    // 再补「后方」：否则快速往回滚时一张都命中不了缓存，退化成全靠原图解码
    if (target.length === 0) {
      for (let k = 1; k <= PRELOAD_BACK; k++) {
        const i: number = this.cur - k;
        if (i < 0) {
          break;
        }
        const u: string = this.items[i].uri;
        if (this.previewEntry(u) === undefined && !this.failed.has(u)) {
          target = u;
          break;
        }
      }
    }
    if (target.length === 0) {
      this.preloadBusy = false; // 窗口内都预载好了
      hilog.info(DOMAIN, TAG, 'preload: window full, stopped at tick %{public}d', this.probeTick);
      return;
    }
    this.probeTick++;
    if (this.probeTick % 20 === 0) {
      hilog.info(DOMAIN, TAG, 'preload: tick %{public}d, target=%{public}s', this.probeTick, target);
    }
    this.decodeTo(target, PRELOAD_EDGE)
      .then((entry: PreviewEntry | undefined) => {
        if (seq !== this.preloadSeq) {
          this.preloadNext(this.preloadSeq); // 期间又切了图 → 跟到最新位置继续，别把链断掉
          return;
        }
        if (entry) {
          this.pushPreview(entry);
        } else {
          this.failed.add(target); // 记黑名单：否则下一轮还会选中它，无限重试
          this.probeFail++;
          if (this.probeFail % 10 === 0) {
            hilog.warn(DOMAIN, TAG, 'preload: %{public}d decodes failed, last=%{public}s', this.probeFail, target);
          }
        }
        setTimeout(() => {
          this.preloadNext(seq);
        }, 0);
      })
      .catch(() => {
        if (seq !== this.preloadSeq) {
          this.preloadNext(this.preloadSeq);
          return;
        }
        this.failed.add(target); // 同上：解不开 / 读不出来的，不再反复尝试
        this.probeFail++;
        if (this.probeFail % 10 === 0) {
          hilog.warn(DOMAIN, TAG, 'preload: %{public}d rejects, last=%{public}s', this.probeFail, target);
        }
        setTimeout(() => {
          this.preloadNext(seq);
        }, 0);
      });
  }

  /** 任意文件（DocumentViewPicker）：多选文件，默认格式 `*.*`（不过滤）*/
  private openFiles(): void {
    try {
      // getContext(this) 已废弃，改用 getUIContext().getHostContext()
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        this.status = '无法获取应用上下文';
        return;
      }
      const dv = new picker.DocumentViewPicker(ctx);
      const opt = new picker.DocumentSelectOptions();
      opt.maxSelectNumber = PICKER_MAX;
      // FILE_FILTERS[0] = 「所有文件(*.*)」→ 选择器打开时默认就是 *.*
      opt.fileSuffixFilters = FILE_FILTERS;
      dv.select(opt)
        .then((uris: Array<string>) => {
          if (!uris || uris.length === 0) {
            this.status = '已取消选择';
            return;
          }
          this.setItems(uris, '本地文件');
        })
        .catch((e: Object) => {
          this.status = '文件选择器失败：' + JSON.stringify(e);
          hilog.error(DOMAIN, TAG, 'openFiles rejected: %{public}s', JSON.stringify(e));
        });
    } catch (e) {
      this.status = '文件选择器不可用：' + JSON.stringify(e);
      hilog.error(DOMAIN, TAG, 'openFiles failed: %{public}s', JSON.stringify(e));
    }
  }

  // ------------------------------------------------------------------
  // 交互分发
  // ------------------------------------------------------------------

  private doAction(act: string): void {
    switch (act) {
      case 'zin':
        this.zoomBy(1.25);
        break;
      case 'zout':
        this.zoomBy(0.8);
        break;
      case 'fit':
        this.resetView();
        this.status = '已适应窗口';
        break;
      case 'one':
        this.zoomPixelPerfect();
        break;
      case 'rotl':
        this.rotateBy(-90);
        break;
      case 'rotr':
        this.rotateBy(90);
        break;
      case 'fliph':
        this.toggleFlipH();
        break;
      case 'flipv':
        this.toggleFlipV();
        break;
      case 'prev':
        this.go(-1);
        break;
      case 'next':
        this.go(1);
        break;
      case 'play':
        this.toggleSlide();
        break;
      case 'gallery':
        this.openGallery();
        break;
      case 'files':
        this.openFiles();
        break;
      case 'resume':
        this.resumeLast();
        break;
      case 'full':
        this.toggleFull();
        break;
      default:
        break;
    }
  }

  /** 切换全屏：只翻状态位，真正的重解码等 onAreaChange 把新画布尺寸报上来再做 */
  private toggleFull(): void {
    this.setFull(!this.fullscreen);
  }

  /** 退出应用。Esc（非全屏时）触发。
   *  `terminateSelf()` 是 UIAbility 的能力，故要把 UI 上下文转回 UIAbilityContext 才能调；
   *  它返回 Promise 且可能失败（例如进程正在被系统回收），失败只记日志，不做任何 UI 提示。
   *  注意：必须 `await flushPos()` 之后再退出 —— 落盘是异步文件 I/O，不等就退会丢最后一次位置。 */
  private async quitApp(): Promise<void> {
    try {
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        this.status = '无法获取上下文，退出失败';
        return;
      }
      // 必须先等落盘完成再退出：flushPos 是异步文件 I/O，不等的话进程先死，最后一次位置就丢了
      await this.flushPos();
      const ability: common.UIAbilityContext = ctx as common.UIAbilityContext;
      ability.terminateSelf()
        .catch(() => {
          hilog.warn(DOMAIN, TAG, 'terminateSelf failed');
        });
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'quitApp failed: %{public}s', JSON.stringify(e));
    }
  }

  private setFull(on: boolean): void {
    if (on === this.fullscreen) {
      return;
    }
    this.fullscreen = on;
    this.pendingReload = true; // 画布尺寸变了 → 落地后按新尺寸重解，避免把旧分辨率拉大发虚
    this.status = on ? '全屏模式 · Esc 退出全屏 / F11 切换' : '已退出全屏 · Esc 关闭应用';
    this.applyWindowFullScreen(on); // 连系统状态栏 / 导航栏一起处理（失败静默降级）
  }

  /** 窗口级沉浸：这才是「上方那条边」消失的关键 —— 应用内隐藏 UI 只管得到自己的三块栏，
   *  管不到系统状态栏。三步有依赖顺序：
   *    ① maximize()       自由窗口 → 最大化 + 沉浸式布局（maximize 默认 ENTER_IMMERSIVE）
   *    ② setWindowLayoutFullScreen(true)  布局不避让系统栏
   *    ③ setWindowSystemBarEnable([])     隐藏状态栏 / 导航栏（**只有已进入全屏才生效**）
   *  任一步失败都只记日志：退化成「仅隐藏应用内 UI」，按钮与快捷键照常可用。 */
  private async applyWindowFullScreen(on: boolean): Promise<void> {
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (!win) {
      return;
    }
    try {
      const bars: Array<'status' | 'navigation'> = on ? [] : ['status', 'navigation'];
      if (on) {
        if (win.getWindowStatus() === window.WindowStatusType.FLOATING) {
          await win.maximize();
          this.maximizedByUs = true;
        }
        await win.setWindowLayoutFullScreen(true);
      }
      await win.setWindowSystemBarEnable(bars);
      if (!on) {
        await win.setWindowLayoutFullScreen(false);
        if (this.maximizedByUs) {
          this.maximizedByUs = false;
          await win.recover(); // 还原成进入前的自由窗口大小与位置
        }
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'window fullscreen failed: %{public}s', JSON.stringify(e));
    }
  }

  private onKey(event: KeyEvent): void {
    const code: number = event.keyCode;
    // 单独跟踪 Ctrl 键值（供 Ctrl + 滚轮缩放使用），不参与功能快捷键分支
    if (code === KeyCode.KEYCODE_CTRL_LEFT || code === KeyCode.KEYCODE_CTRL_RIGHT) {
      this.ctrlDown = (event.type === KeyType.Down);
      return;
    }
    if (event.type !== KeyType.Down) {
      return;
    }
    switch (code) {
      case KeyCode.KEYCODE_DPAD_LEFT:
        this.go(-1);
        break;
      case KeyCode.KEYCODE_DPAD_RIGHT:
        this.go(1);
        break;
      case KeyCode.KEYCODE_DPAD_UP:
        this.zoomBy(1.25);
        break;
      case KeyCode.KEYCODE_DPAD_DOWN:
        this.zoomBy(0.8);
        break;
      case KeyCode.KEYCODE_SPACE:
        this.toggleSlide();
        break;
      case KeyCode.KEYCODE_R:
        this.rotateBy(90);
        break;
      case KeyCode.KEYCODE_F:
        this.zoomPixelPerfect();
        break;
      case KeyCode.KEYCODE_0:
        this.resetView();
        this.status = '已复位视图';
        break;
      case KeyCode.KEYCODE_F11:
        this.toggleFull();
        break;
      case KeyCode.KEYCODE_ESCAPE:
        if (this.fullscreen) {
          this.setFull(false); // 全屏时 Esc 先退全屏（第一优先，避免误触直接退出）
        } else {
          this.quitApp();
        }
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // UI 片段
  // ------------------------------------------------------------------

  @Builder
  toolBtn(label: string, act: string, flex: boolean) {
    Button(label)
      .type(ButtonType.Normal)
      .fontSize(12)
      .fontColor('#e8ecf4')
      .backgroundColor('#2a2f3a')
      .borderRadius(6)
      .height(30)
      .padding({ left: 10, right: 10 })
      .margin(3)
      .layoutWeight(flex ? 1 : 0)
      .onClick(() => this.doAction(act))
  }

  /** 主视图：优先画「我们自己解码的 PixelMap」（清晰，且一定是当前这张）；
   *  只有自解码失败（如某些 uri 打不开）时才回退到 Image(uri) 交给系统解码兜底。
   *
   *  注意：@Builder 的 UI 描述体内**只能写 UI 语法**，不能声明局部变量
   *  （`const pm = this.viewPixelMap` 会报 "Only UI component syntax can be written here"），
   *  因此这里直接读状态字段、用 `!` 做非空断言。 */
  @Builder
  previewImage(uri: string, token: number) {
    Stack() {
      if (this.viewPixelMap !== undefined) {
        Image(this.viewPixelMap!)          // 自解码结果：清晰，且一定是当前这张
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .draggable(false)
          .width(this.frameW())
          .height(this.frameH())
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
      } else if (this.viewFailed) {
        // 兜底：**只有自解码确认失败**才交给系统解码。
        // 不能在解码期间就画 Image(uri) —— 那正是「上一张还留在屏幕上」的来源。
        Image(uri)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .draggable(false)
          .width(this.frameW())
          .height(this.frameH())
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
          .onComplete((ev) => {
            if (ev && token === this.curToken) {
              this.imgW = ev.width;
              this.imgH = ev.height;
            }
          })
          .onError(() => {
            if (token === this.curToken) {
              this.status = '图片加载失败，当前镜像可能不支持该格式（HEIC 需系统 codec 支持）';
            }
          })
      }

      // 过渡层：低清图 + 动态模糊，盖在清晰图之上，就绪后整层淡出 → 观感就是「由糊到清」。
      // 它必须排在底层之后才会盖在上面；scale 与底层完全一致，否则放大/镜像时会错位。
      if (this.lowPixelMap !== undefined) {
        Image(this.lowPixelMap!)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.Medium)
          .draggable(false)
          .width(this.frameW())
          .height(this.frameH())
          .scale({
            x: this.zoom * (this.flipH ? -1 : 1) * this.focusZoom(),
            y: this.zoom * (this.flipV ? -1 : 1) * this.focusZoom()
          })
          .blur(this.blurRadius)
          .opacity(this.lowOpacity)
      }
    }
    .width(this.frameW())
    .height(this.frameH())
  }

  // ------------------------------------------------------------------
  // 主构建
  // ------------------------------------------------------------------

  build() {
    Column() {
      // ============================== 顶栏（全屏时整条隐藏）==============================
      if (!this.fullscreen) {
        Row() {
          Text('PIKAN')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#f2f5fa')
          Text('·')
            .fontSize(14)
            .fontColor('#4a5262')
            .margin({ left: 8, right: 8 })
          Text(this.curName())
            .fontSize(13)
            .fontColor('#9fb0c8')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)

          this.toolBtn('打开图库', 'gallery', false)
          this.toolBtn('选择图片', 'files', false)
          this.toolBtn('回到上次', 'resume', false)
          this.toolBtn('全屏', 'full', false)
          Button(this.playing ? '暂停' : '幻灯片')
            .type(ButtonType.Normal)
            .fontSize(13)
            .fontColor(this.playing ? '#101216' : '#e8ecf4')
            .backgroundColor(this.playing ? '#f6c85f' : '#2a2f3a')
            .borderRadius(6)
            .height(32)
            .padding({ left: 12, right: 12 })
            .margin({ left: 4 })
            .onClick(() => this.doAction('play'))
        }
        .width('100%')
        .height(52)
        .padding({ left: 16, right: 12 })
        .backgroundColor('#1a1d23')
        .border({ width: { bottom: 1 }, color: '#2a2f3a' })
      }

      // ============================== 主体 ==============================
      Row() {
        // ---------- 左侧：图像档案列表 ----------
        if (!this.fullscreen) {
          Column() {
            Row() {
              Text(this.source)
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor('#dfe5ef')
                .layoutWeight(1)
              Text(this.itemCount > 0 ? (this.itemCount + ' 张') : '')
                .fontSize(12)
                .fontColor('#7f88a3')
            }
            .width('100%')
            .padding({ left: 12, right: 12, top: 10, bottom: 8 })
  
            if (this.itemCount === 0) {
              Column() {
                Text('还没有图片')
                  .fontSize(13)
                  .fontColor('#7f88a3')
                  .margin({ bottom: 6 })
                if (this.resumeHint.length > 0) {
                  Text(this.resumeHint)
                    .fontSize(11)
                    .fontColor('#7f88a3')
                    .textAlign(TextAlign.Center)
                    .margin({ bottom: 6 })
                }
                Text('点顶栏「打开图库」在图库里挑图，或「选择图片」挑文件')
                  .fontSize(11)
                  .fontColor('#5a6272')
                  .textAlign(TextAlign.Center)
              }
              .width('100%')
              .layoutWeight(1)
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
            } else {
              // LazyForEach + cachedCount：只为「屏幕上这几行 + 少量缓存」创建节点。
              // 用 ForEach 的话会为数组中每一项都建组件，几百张图就是几百个 ListItem，
              // 内存与节点数随图片数线性增长 —— 这是图片一多就崩的原因之一。
              List({ scroller: this.scroller, space: 4 }) {
                LazyForEach(this.dataSource, (item: ImageItem, idx: number) => {
                  ListItem() {
                    ArchiveRow({
                      uri: item.uri,
                      name: item.name,
                      bytes: item.size,
                      idx: idx,
                      selected: idx === this.cur,
                      onTap: (i: number) => {
                        this.select(i);
                      }
                    })
                  }
                }, (item: ImageItem) => item.uri)
              }
              .layoutWeight(1)
              .width('100%')
              .scrollBar(BarState.Auto)
              .padding({ left: 8, right: 8 })
              .cachedCount(6)
            }
  
            // 底部视图控制条：与顶栏同一套 toolBtn（纯文字，紧凑、无歧义）
            Column() {
              Row() {
                this.toolBtn('适应', 'fit', true)
                this.toolBtn('1:1', 'one', true)
              }
              .width('100%')
              Row() {
                this.toolBtn('－', 'zout', true)
                this.toolBtn('＋', 'zin', true)
              }
              .width('100%')
              Row() {
                this.toolBtn('左旋', 'rotl', true)
                this.toolBtn('右旋', 'rotr', true)
              }
              .width('100%')
              Row() {
                this.toolBtn('镜像H', 'fliph', true)
                this.toolBtn('镜像V', 'flipv', true)
              }
              .width('100%')
            }
            .width('100%')
            .padding({ left: 8, right: 8, top: 6, bottom: 10 })
            .border({ width: { top: 1 }, color: '#2a2f3a' })
          }
          .width(280)
          .height('100%')
          .backgroundColor('#161a21')
        }

        // ---------- 右侧：大图预览（GPU 合成渲染）----------
        Stack({ alignContent: Alignment.Center }) {
          if (this.cur >= 0) {
            // 外层 Column：拖拽 + 旋转；内层 Image：缩放 + 镜像
            Column() {
              this.previewImage(this.curItem()!.uri, this.curToken)
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
            .rotate({ angle: this.rot })
            .translate({ x: this.tx, y: this.ty })
          } else {
            Column() {
              Text('🖼')
                .fontSize(64)
                .fontColor('#2a2f3a')
              Text('滚轮切换上一张 / 下一张')
                .fontSize(13)
                .fontColor('#5a6272')
                .margin({ top: 12 })
              Text('左键放大 50% · 右键放大 100% · 拖拽平移')
                .fontSize(11)
                .fontColor('#454c5a')
                .margin({ top: 6 })
              Text('双击复位 · Ctrl + 滚轮缩放')
                .fontSize(11)
                .fontColor('#454c5a')
                .margin({ top: 2 })
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
          }

          // 左上角信息浮层
          Row() {
            Column() {
              Text(this.curName())
                .fontSize(12)
                .fontColor('#e8ecf4')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              Text(extOf(this.curName()) + ' · ' + fmtBytes(this.bytes) +
                (this.imgW > 0 ? (' · ' + this.imgW + '×' + this.imgH) : ''))
                .fontSize(11)
                .fontColor('#8b95a8')
                .margin({ top: 2 })
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .alignItems(HorizontalAlign.Start)
            .padding(8)
            .backgroundColor('#cc12161c')
            .borderRadius(6)
            .constraintSize({ maxWidth: 360 })
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.Start)
          .alignItems(VerticalAlign.Top)
          .padding(12)
          .hitTestBehavior(HitTestMode.Transparent)

          // 右下角缩放角标
          Row() {
            Text(Math.round(this.zoom * 100) + ' %')
              .fontSize(12)
              .fontColor('#dfe5ef')
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .backgroundColor('#cc12161c')
              .borderRadius(4)
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.End)
          .alignItems(VerticalAlign.Bottom)
          .padding(12)
          .hitTestBehavior(HitTestMode.Transparent)

          // 全屏时右上角浮出「退出」按钮：顶栏被隐藏了，必须留一个鼠标可点的出口（键盘还有 Esc / F11）
          if (this.fullscreen) {
            Row() {
              Button('退出全屏')
                .type(ButtonType.Normal)
                .fontSize(12)
                .fontColor('#e8ecf4')
                .backgroundColor('#cc2a2f3a')
                .borderRadius(6)
                .height(30)
                .padding({ left: 12, right: 12 })
                .onClick(() => this.setFull(false))
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.End)
            .alignItems(VerticalAlign.Top)
            .padding(12)
            .hitTestBehavior(HitTestMode.Transparent)
          }
        }
        .layoutWeight(1)
        .height('100%')
        .backgroundColor('#0a0b0d')
        .clip(true)
        .onAreaChange((oldV: Area, newV: Area) => {
          const w = newV.width as number;
          const h = newV.height as number;
          if (w > 0 && h > 0) {
            const changed: boolean = (w !== this.canvasW) || (h !== this.canvasH);
            this.canvasW = w;
            this.canvasH = h;
            // 进出全屏后画布尺寸变了：按新尺寸重解一次大图，否则只是把旧分辨率拉大（发虚）
            if (changed && this.pendingReload && this.cur >= 0) {
              this.pendingReload = false;
              this.showPreviewOf(this.cur);
            }
          }
        })
        // 鼠标滚轮：默认上一张 / 下一张；Ctrl + 滚轮 = 缩放
        // API 26 起 MouseEvent 不再提供 scrollY / ctrlKey，滚轮统一走「轴事件」onAxisEvent（API 17+）。
        .onAxisEvent((event: AxisEvent) => {
          const v: number = event.getVerticalAxisValue();
          if (v === 0) {
            return;
          }
          this.lastAxisMs = Date.now(); // 供 PanGesture 判断「这次拖拽其实是滚轮」
          // 约定：向上滚（负值）＝ 上一张；若实机方向相反，把下面的 v < 0 改成 v > 0
          this.onWheel(v < 0 ? -1 : 1);
        })
        // 鼠标左键放大 50% / 右键放大 100%（均以光标为锚点）
        .onMouse((event: MouseEvent) => {
          this.onMouseButton(event);
        })
        .gesture(
          PinchGesture({ fingers: 2 })
            .onActionStart(() => {
              this.baseZoom = this.zoom;
            })
            .onActionUpdate((event: GestureEvent) => {
              this.zoom = clamp(this.baseZoom * event.scale, MIN_SCALE, MAX_SCALE);
            })
            .onActionEnd(() => {
              this.status = '缩放 ' + Math.round(this.zoom * 100) + '%';
            })
        )
        .gesture(
          PanGesture({ fingers: 1 })
            .onActionStart(() => {
              this.baseTx = this.tx;
              this.baseTy = this.ty;
            })
            .onActionUpdate((event: GestureEvent) => {
              // 刚滚过滚轮 → 这次「拖拽」其实是滚轮被派发成了 PanGesture，必须忽略，
              // 否则快速翻页时画布会被滚得上移/下移（表象就是大图不在正中）。
              // 两个条件任一成立都算「滚轮刚滚过」：wheelActive 与手势到达顺序无关，
              // lastAxisMs 则兜住事件顺序相反的情况。
              if (this.wheelActive || Date.now() - this.lastAxisMs < WHEEL_PAN_GUARD_MS) {
                // 屏蔽期间同步基准：等窗口一过就能从「此刻的偏移」接着走，不会突然跳一大段
                this.baseTx = this.tx - event.offsetX;
                this.baseTy = this.ty - event.offsetY;
                return;
              }
              this.tx = this.baseTx + event.offsetX;
              this.ty = this.baseTy + event.offsetY;
            })
        )
        .gesture(
          TapGesture({ count: 2 })
            .onAction(() => {
              // 双击 = 复位视图（全屏走 F11 / 顶栏按钮 / 右上角退出按钮，不占双击）
              this.resetView();
              this.status = '已适应窗口';
            })
        )
      }
      .width('100%')
      .layoutWeight(1)

      // ============================== 状态栏（全屏时隐藏）==============================
      if (!this.fullscreen) {
        Row() {
          Text(this.status)
            .fontSize(11)
            .fontColor('#8b95a8')
            .layoutWeight(1)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          // 注：这里只标注「GPU 合成」——它是平台 RenderService 默认行为，本工程没有写 GPU 代码，
          //     也没有任何 NPU / AI 推理，故不要在此声称 NPU 加速。runtimeOS 已为 HarmonyOS。
          Text('AArch64 · HarmonyOS · ArkUI GPU 合成')
            .fontSize(11)
            .fontColor('#5a6272')
        }
        .width('100%')
        .height(26)
        .padding({ left: 16, right: 16 })
        .backgroundColor('#12161c')
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#101216')
    .focusable(true)
    .defaultFocus(true)
    .onKeyEvent((event: KeyEvent) => this.onKey(event))
  }
}
