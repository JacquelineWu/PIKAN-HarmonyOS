/**
 * pages/Index.ets — 鸿蒙 PC 原生 HEIC/JPG 看图软件（ACDSee 风格）
 *
 * 布局（ACDSee 风格）：
 *   · 顶栏：标题 + 当前文件名 + 「全屏」+ 幻灯片
 *            （11-10 起依次取消「打开图库」「选择图片」「回到上次」三个按钮）
 *   · 左侧：抬头下「排序 / 回上层 / 选择文件夹」同一行等宽排列；
 *            图像档案列表（悬停缩略图 + 文件名 + 体积 + 日期），列宽按最长名字自适应、行高紧凑
 *   · 右侧：大图预览（GPU 合成渲染），悬浮信息层 + 缩放角标
 *   · 底栏：状态栏
 *
 * 图片来源：
 *   · 选择文件夹 —— DocumentViewPicker FOLDER，浏览目录（含中文 / 多级路径）；
 *                    现在界面上唯一的目录 / 挑图入口
 *   · 目录内多选 —— 子文件无授权时自动弹出，每个选中文件单独授权
 *   · 内部能力（无独立 UI 入口，保留供降级链复用）：openFiles() 文件选择器、
 *     resumeLast() / loadAllGallery() 全量扫描与 uri 快照恢复、openGallery() 旧图库链
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
import fileUri from '@ohos.file.fileuri';
import hilog from '@ohos.hilog';
import photoAccessHelper from '@ohos.file.photoAccessHelper';
import image from '@ohos.multimedia.image';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
import dataSharePredicates from '@ohos.data.dataSharePredicates';
import preferences from '@ohos.data.preferences';
import window from '@ohos.window';
import util from '@ohos.util';
import { baseName, dirDisplayName, stripTrailingSlash, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames } from '../common/DirName';
import { HoverGuard } from '../common/HoverGuard';
import { KeyCode } from '@ohos.multimodalInput.keyCode';
import { BusinessError } from '@ohos.base';

const TAG = 'HeicViewer';
const DOMAIN = 0x0000;

/** 版本号（与 AppScope/app.json5 的 versionName 保持一致），用于窗口标题栏。
 *  Win64 版 3ea7419 起标题栏带版本号；鸿蒙没有「读取程序集版本」的等价物，故用常量。 */
const APP_VERSION: string = '1.0.7';
/** 预览区底色：Win64 版 c42d92b 起由近黑 #0a0b0d 改为中灰 #5F5F5F —— 看竖图 / 白底扫描件时
 *  更容易判断图片边界，也不至于把暗部细节和背景混在一起。想回深色改回 '#0a0b0d' 即可。 */
const CANVAS_BG: string = '#5F5F5F';
/** 缩放角标的口径：true = 相对「原图像素」的倍率（100% = 1:1，与 ACDSee / Photoshop 一致）；
 *  false = 相对「适应窗口」的倍率（旧行为，适应窗口时显示 100%）。 */
const ZOOM_PCT_RELATIVE_TO_PIXEL: boolean = true;
/** 左栏是否隐藏以 . 开头的档案名 / 目录名（Win64 4600bcc） */
const HIDE_DOT_FILES: boolean = true;
/** 是否启用「竖图对开」（连续两张竖图左右并排）。对应 Win64 6347756。
 *  关掉它 = 永远单页显示，翻页 / 预载逻辑完全不变。 */
const SPREAD_PORTRAIT: boolean = true;
/** 当前目录的变动自检间隔（ms）。鸿蒙 SDK 26 没有 @ohos.file.fileObserver，
 *  没法挂 inotify 式的文件系统监听，只能退化为「定时比对目录 mtime」；
 *  检测到变化后去抖重扫，并保持当前张不闪（Win64 2bcbbb1 的变形实现）。 */
const DIR_POLL_MS: number = 1500;
const DIR_RESCAN_DEBOUNCE_MS: number = 900;

/** 全屏时顶栏自动隐藏（Win64 4666 / 4670）：鼠标压到窗口最上面 TOPBAR_EDGE_PX 个像素
 *  才把顶栏浮出来，顶栏高度 52 + 下方 TOPBAR_KEEP_PX 之内保持显示。
 *  鸿蒙收不到「鼠标移出窗口」事件，故另加一个「停手 2s 自动收起」的兜底。
 *  顶栏用 Stack + position 浮在画布上，不占布局，出现/消失都不会把预览区挤一下。 */
const TOPBAR_EDGE_PX: number = 10;
const TOPBAR_KEEP_PX: number = 8;
const TOPBAR_H: number = 52;
const TOPBAR_HIDE_MS: number = 2000;
/** 左栏宽度：展开 / 收起。
 *  LIST_W 是**下限**——刚好能让一行三个按钮（排序 / 回上层 / 选择文件夹）等宽并排且不重叠；
 *  LIST_MAX_W 是上限，避免个别超长档案名把右侧预览区压没。
 *  实际展开宽度由 listWidthForNames() 按当前列表最长名字在 [LIST_W, LIST_MAX_W] 内自适应。
 *  收起态仍固定 LIST_COLLAPSED_W（只留档案名一列），保持原有交互不变。 */
const LIST_W: number = 280;
const LIST_MAX_W: number = 900;
const LIST_COLLAPSED_W: number = 224;
const SPLIT_W: number = 14;

const MIN_SCALE: number = 0.05;
const MAX_SCALE: number = 16.0;
const SLIDE_INTERVAL: number = 3000;

/** 图库选择器 maxSelectNumber 的系统上限（官方：最大 500，默认 50）。
 *  仅供已停用的 openPicker() 使用；「打开图库」按钮取消后不会再触发。 */
const PICKER_MAX: number = 500;
/** 【已停用入口】原「打开图库」每次都弹系统选择器让用户重新挑（true），还是先试免交互的全量扫描（false）。
 *
 *  默认 **true**：用户要的就是「点一下就能重新挑要走哪些图」。原来那套「先静默全量扫描 →
 *  再用快照恢复 → 再申请受限权限 → 最后才弹选择器」的降级链，实际效果常常是**根本弹不出
 *  选择器**（快照一命中就直接用旧列表顶替了），而且中间夹着一次 requestPermissionsFromUser，
 *  紧接着拉起选择器容易互相干扰。
 *
 *  改成 true 之后：点原「打开图库」= 直接进图库界面勾选，行为可预期。
 *  想回到「零交互载入全部」那套（需先在 AGC 申请到 READ_IMAGEVIDEO 并配置正式签名），
 *  把它改回 false。 */
const GALLERY_ALWAYS_PICK: boolean = true;
/** 【已停用入口】原「打开图库」弹哪个选择器：
 *  true  = 系统图库选择器 PhotoViewPicker（界面就是图库，免权限、可多选、上限 500）
 *  false = 文件选择器 DocumentViewPicker + 图片后缀过滤（PC/2in1 上更稳，但要自己走到图片目录）
 *  若你机器上 PhotoViewPicker 打开后**图片选不了**，把它改成 false 立刻可用，其余逻辑不变。
 *  该入口现已取消，此常量只影响停用的 openPicker()；现在唯一入口是「选择文件夹」。 */
const GALLERY_USE_PHOTO_PICKER: boolean = true;
/** 直接扫描图库时的安全上限，避免超大图库一次性吃满内存 */
const SCAN_CAP: number = 20000;

/** 鼠标键缩放倍率（相对步进）：左键放大 50%（×1.5）。
 *  Win64 84adb7a 起右键改为「还原」（回到适应窗口并归位），不再放大 —— 与 ACDSee 一致。
 *  ZOOM_RIGHT 保留仅为兼容旧配置，当前路径不使用。 */
const ZOOM_LEFT: number = 1.5;
const ZOOM_RIGHT: number = 2.0;
/** 按下到抬起若移动超过该距离（vp）就判定为「拖拽平移」，不触发点击缩放 */
const CLICK_MOVE_TOL: number = 4;
/** 双击判定窗口（ms）：在这个时间内的单击放大，会被随后的双击「撤销」掉，
 *  保证「双击进出全屏，画面保持原样」（Win64 84adb7a）。 */
const DBL_CLICK_UNDO_MS: number = 400;

/** 预载窗口：当前位置「往后」的张数（主要浏览方向）。
 *  Win64 版 c111e2c 起由 20 扩到 50 张 —— 悬停缩略图要能立刻命中，长图库连翻也更稳。 */
const PRELOAD_FWD: number = 50;
/** 预载窗口：当前位置「往前」的张数 —— 没有它的话，快速往回滚就一张都命中不了缓存。
 *  改这两个常量就等于改窗口大小；缓存是**跟着当前位置滑动**的（见 evictOutside），
 *  所以前后各 50 意味着最多同时驻留 101 张，而不是越翻越多。 */
const PRELOAD_BACK: number = 50;
/** 缓存条目上限（LRU 容量）。窗口 101 张，留 11 张余量：
 *  容量必须 > 窗口大小，否则每入一张就淘汰一张、又被预载链加回来，会来回抖动。 */
const PRELOAD_COUNT: number = 112;
/** 未命中缓存时的低清占位档位（单张约 1.7MB）—— 只为「不空白」，不是拿来显示的 */
const QUICK_EDGE: number = 768;
/** 预载档位（长边像素）的下限 / 上限，实际取值由 preloadEdge() 按画布尺寸动态算。
 *
 *  ⚠️ 关键教训（Win64 版实测，10-27 提交 51ac4d3）：**必须向上量化**。
 *  早先把 1133 向下量化成 1024，结果档位反而小于屏幕实际要显示的 1196 像素，
 *  于是每张命中缓存的图都还得再解一次全清才能看 —— 大图那一次能解到 1.5 秒，
 *  切图卡顿就是这么来的。缓存要存「可直接显示」的清晰度，命中就上屏，不再补解码。 */
const PRELOAD_MIN_EDGE: number = 1024;
const PRELOAD_MAX_EDGE: number = 1536;
/** 预载档位 = 画布长边 × 该系数，再向上量化到 PRELOAD_QUANT 的倍数（留一点放大余量） */
const PRELOAD_EDGE_FACTOR: number = 1.15;
const PRELOAD_QUANT: number = 256;
/** 预载缓存的总字节上限（双重保险，防 OOM）。
 *  窗口 101 张 × 1536 档位（约 7MB/张）≈ 700MB，与 Win64 版（768MB）同一量级。
 *  ⚠️ 鸿蒙设备内存普遍小于 PC，这里给 512MB：一旦触顶会按 LRU 淘汰，
 *     窗口实际驻留张数会小于 101，右下角角标的「N / 112 张」能直接看出来。 */
const PRELOAD_MAX_BYTES: number = 512 * 1024 * 1024;
/** 主视图解码：长边 = 画布长边 × 该系数，并夹在 [VIEW_EDGE_MIN, VIEW_EDGE_MAX] 内。
 *  系数取 1.5 而不是 2（Win64 版实测）：×2 时一张大图能解到 1.5 秒，
 *  而屏幕实际只需要约 1.0 倍像素 —— 多出来的既不显示又拖慢切图。 */
const VIEW_EDGE_FACTOR: number = 1.5;
const VIEW_EDGE_MIN: number = 1200;
const VIEW_EDGE_MAX: number = 4096;
/** 预载命中后，停手多久才补一张全清（ms）。
 *  连续翻页时这一步会被下一切图作废，所以延迟执行能省掉大量无用解码。 */
const UPGRADE_DELAY_MS: number = 250;
/** 是否还播「低清 + 大模糊 → 分档对焦 → 淡出」的切图动画。
 *
 *  默认 **false**（与 Win64 版 10-27 提交 042d2fe 一致）：命中缓存即刻上屏、瞬时替换最跟手，
 *  而早期加模糊是为了掩盖「切图要等解码」—— 如今解码已在后台预载完成，掩盖对象不存在了。
 *  想看回老效果把它改回 true 即可，代码都在（startFocus / finishFocus / BLUR_* 常量）。 */
const FOCUS_BLUR: boolean = false;

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
/** ⚠️ 已废弃（不再做定时节流），保留常量仅为说明历史做法。
 *
 *  旧实现：攒下的步数要等一个 120ms 的定时器才落到渲染上。那是早期防
 *  「滚动快过解码 → 队列堆积 → 图片错位」加的。Win64 版实测（10-27 提交 649a79c）：
 *  快速连滚时每次切换被推迟 40~125ms，还会攒成一次跳 2~3 张，明显比键盘慢。
 *  现在预载存的已是「可直接显示」的清晰度、命中即刻上屏，
 *  防堆积交给「代号校验作废在途回调」，不再靠翻页节流兜底。 */
/** 收到轴事件后多久内「不接受拖拽平移」（ms）。
 *
 *  这是修「快速滚动时大图整体上下跑」的关键：在 PC / 2in1 上，滚轮与触控板滚动会被 ArkUI
 *  一并派发给 PanGesture（当作一次拖拽），于是画布被当成在拖 —— 向下滚 = offsetY 为负 = 大图上移，
 *  向上滚 = 大图下移，与实测现象完全吻合。滚轮期间屏蔽平移即可，手指/鼠标真实拖拽不受影响
 *  （它们不会产生轴事件）。 */
const WHEEL_PAN_GUARD_MS: number = 300;
/** @deprecated 见 WHEEL_NOTCH_MS 上方注释：滚轮翻页已去掉定时节流。 */

/** 左侧档案列表中的一项。
 *  对齐 Win64 的双集合设计：`items` 是纯图片翻页序列，`rows` 是左栏显示行
 *  （可能多出「..」、子文件夹、不支持预览的文件），靠 itemIndex 单向挂钩。 */
interface ImageItem {
  uri: string;   // 文件 / 图库 URI（可直接喂给 Image 组件）
  name: string;  // 显示文件名（已做乱码修复，仅显示用）
  size: number;  // 字节数（未知为 -1）
  mtime?: number;      // 修改时间（ms），左栏「日期」列用
  kind?: number;       // 0=图片 1=上级「..」 2=子文件夹 3=不支持预览的文件
  itemIndex?: number;  // 图片行对应 items 的下标；非图片行 = -1
}

/** 左栏行种类 */
const ROW_IMAGE: number = 0;
const ROW_UP: number = 1;
const ROW_FOLDER: number = 2;
const ROW_OTHER: number = 3;

/** 解码结果：uri + 已解码的 PixelMap + 原图宽高 + 解码档位 + 估算占用字节 */
interface PreviewEntry {
  uri: string;
  px: image.PixelMap;
  bytes: number;
  w: number;    // 原图宽（用于 1:1 与信息栏，非 PixelMap 宽）
  h: number;    // 原图高
  edge: number; // 解码时的长边档位 —— 用来判断「这张够不够直接上主视图」
}

/** 受支持的图片后缀 */
const IMAGE_SUFFIXES: Array<string> = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];

/** 文件名是否是可预览图片（大小写不敏感）。 */
function isImageName(name: string): boolean {
  const dot: number = name.lastIndexOf('.');
  if (dot < 0) {
    return false;
  }
  const ext: string = name.substring(dot).toLowerCase();
  for (let i = 0; i < IMAGE_SUFFIXES.length; i++) {
    if (ext === IMAGE_SUFFIXES[i]) {
      return true;
    }
  }
  return false;
}

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

/* baseName / dirDisplayName / stripTrailingSlash 统一放在 common/DirName.ts。
 * 旧 baseName 遇到「带尾部斜杠的目录 URI」会返回空串，让左栏抬头整条空白；
 * 抽成不依赖 SDK 的纯函数后，也能用 tests/dirname.test.mjs 直接跑回归。 */

/** DocumentViewPicker(FOLDER) 返回的目录标识，在不同设备 / 系统版本上形态并不统一：
 *    · `file://docs/...` 这类「文档 URI」——`fs.listFile` 往往不接受；
 *    · 带百分号编码的 `file://` URI（中文目录名、空格会被编码）；
 *    · 直接的沙箱 / 绝对路径。
 *  而且 picker 的授权是**逐 URI**的：能列出目录 ≠ 能读子文件，
 *  所以拼子文件路径时必须用「最终真正能读」的那个 base，不能用原始 uri 硬拼。
 *  这里把所有可能写法都生成出来，交给 openFolder 逐个试。 */
function dirCandidates(raw: string): string[] {
  const out: string[] = [];
  const seen: Set<string> = new Set<string>();
  const add = (s: string): void => {
    if (s.length > 0 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  add(raw);
  try {
    add(decodeURIComponent(raw));
  } catch (e) {
    // 含非法 % 序列时 decodeURIComponent 会抛，忽略即可
  }
  try {
    const u: fileUri.FileUri = new fileUri.FileUri(raw);
    add(u.path);           // 解码后的真实路径
    add(u.toString());     // 规范化后的 uri
  } catch (e) {
    hilog.warn(DOMAIN, TAG, 'FileUri parse failed: %{public}s', JSON.stringify(e));
  }
  // 手工兜底：file://docs/storage/... → /storage/...
  if (raw.indexOf('file://') === 0) {
    const rest: string = raw.substring('file://'.length);
    const slash: number = rest.indexOf('/');
    if (slash >= 0) {
      const p: string = rest.substring(slash);
      add(p);
      try {
        add(decodeURIComponent(p));
      } catch (e) {
        // ignore
      }
    }
  }
  return out;
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
// 文件名显示层工具（对齐 PIKAN-Win64 11-04）
// --------------------------------------------------------------------

/** 自然序比较：把连续数字当成一个整数比大小，而不是逐字符比。
 *  IMG_2 会排在 IMG_10 前面（逐字符比会把 10 排到 2 前）。
 *  对应 Win64 的 StrCmpLogicalW（FsEntry.cs），鸿蒙无等价 API，自己实现。 */
function naturalCompare(a: string, b: string): number {
  const la: string = a.toLowerCase();
  const lb: string = b.toLowerCase();
  let i: number = 0;
  let j: number = 0;
  while (i < la.length && j < lb.length) {
    const ca: number = la.charCodeAt(i);
    const cb: number = lb.charCodeAt(j);
    const da: boolean = ca >= 48 && ca <= 57;
    const db: boolean = cb >= 48 && cb <= 57;
    if (da && db) {
      // 跳过前导零后取数字段，按「数值 + 段长」比较（2 < 10；02 与 2 相等时 02 靠前）
      let ia: number = i;
      while (ia < la.length && la.charCodeAt(ia) >= 48 && la.charCodeAt(ia) <= 57) {
        ia++;
      }
      let jb: number = j;
      while (jb < lb.length && lb.charCodeAt(jb) >= 48 && lb.charCodeAt(jb) <= 57) {
        jb++;
      }
      const na: number = parseInt(la.substring(i, ia), 10);
      const nb: number = parseInt(lb.substring(j, jb), 10);
      if (na !== nb) {
        return na < nb ? -1 : 1;
      }
      if ((ia - i) !== (jb - j)) {
        return (ia - i) < (jb - j) ? -1 : 1;
      }
      i = ia;
      j = jb;
      continue;
    }
    if (ca !== cb) {
      return ca < cb ? -1 : 1;
    }
    i++;
    j++;
  }
  if (i >= la.length && j >= lb.length) {
    return 0;
  }
  return i >= la.length ? -1 : 1;
}

/** 判一个字符是否为「表意文字 / 假名 /  Hangul」——用来给解码结果打分。 */
function isIdeograph(c: number): boolean {
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x3040 && c <= 0x30ff) || (c >= 0xac00 && c <= 0xd7af);
}

/** 解码结果打分：连续表意文字加分，替换字符 / 控制字符 / 私用区直接判负。 */
function readableScore(s: string): number {
  let score: number = 0;
  let run: number = 0;
  for (let i = 0; i < s.length; i++) {
    const c: number = s.charCodeAt(i);
    if (c === 0xfffd || c < 0x20 || (c >= 0xe000 && c <= 0xf8ff)) {
      return -1; // 解坏了，直接淘汰
    }
    if (isIdeograph(c)) {
      run++;
      score += 2 + Math.min(run, 4); // 连续汉字更像正常词
    } else {
      run = 0;
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) ||
        c === 32 || c === 46 || c === 45 || c === 95 || c === 40 || c === 41) {
        score += 1;
      } else if (c >= 0x00c0 && c <= 0x024f) {
        score -= 2; // 又冒出一批拉丁扩展字符，多半没解对
      }
    }
  }
  return score;
}

/** 文件名乱码还原（Win64 AnsiCodec.cs 的鸿蒙变形版）。
 *
 *  成因：某环节把 GBK / Big5 / Shift-JIS / UTF-8 字节用 Latin-1（或 cp1252）解成了 Unicode，
 *  于是磁盘上存的是一串「拉丁扩展字符」。还原 = 先按「字节值 = 码位」回推成字节，
 *  再用候选编码重新解码，取「最像人话」且优于原样的那个。
 *
 *  安全边界（与 Win64 一致）：**只影响显示**，读文件、拼路径、位置记忆一律用原始 name/uri。
 *  探测很保守：含正常 CJK / 假名 / Hangul 的名字直接原样返回，不会误伤。
 *  鸿蒙用 util.TextDecoder（支持 gbk / gb18030 / big5 / euc-jp / utf-8），无需第三方码表。 */
const MOJIBAKE_ENCODINGS: Array<string> = ['gb18030', 'gbk', 'big5', 'euc-jp', 'utf-8'];

function repairMojibake(name: string): string {
  // 前置筛选：至少要有一批「拉丁扩展 / 希腊 / 西里尔」这类典型的乱码码位
  let odd: number = 0;
  for (let i = 0; i < name.length; i++) {
    const c: number = name.charCodeAt(i);
    if (isIdeograph(c)) {
      return name; // 已有正常汉字 → 不是乱码，别动
    }
    if (c >= 0x0080) {
      odd++;
      if (c > 0xffff) {
        return name; // 代理对，回推会丢信息
      }
    }
  }
  if (odd < 2) {
    return name;
  }
  const raw: number = readableScore(name);
  const bytes: Uint8Array = new Uint8Array(name.length);
  for (let i = 0; i < name.length; i++) {
    const c: number = name.charCodeAt(i);
    if (c > 0xff) {
      return name; // 回推不回去（例如 cp1252 的 0x80→U+20AC），放弃
    }
    bytes[i] = c;
  }
  let best: string = name;
  let bestScore: number = raw;
  for (let k = 0; k < MOJIBAKE_ENCODINGS.length; k++) {
    try {
      const dec: util.TextDecoder = util.TextDecoder.create(MOJIBAKE_ENCODINGS[k]);
      const s: string = dec.decodeToString(bytes);
      const sc: number = readableScore(s);
      // 必须明显优于原样才采纳，且解出来的长度不能缩得离谱
      if (sc > bestScore + 3 && s.length >= 1) {
        bestScore = sc;
        best = s;
      }
    } catch (e) {
      // 该编码不认识这串字节，跳过
    }
  }
  return best;
}

/** 路径中间省略：保住开头的盘符/根目录与末尾的目录名（Win64 3f92173）。 */
function ellipsizeMiddle(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  const tail: number = Math.floor(max * 0.55);
  const head: number = max - tail - 1;
  return s.substring(0, head) + '…' + s.substring(s.length - tail);
}

/** 父目录计算已统一迁到 common/DirName.ts 的 parentDirOf() / parentDirCandidates()。
 *  旧 dirOf() 不去尾斜杠：picker 给的目录常带 `/`，lastIndexOf('/') 落在末尾，
 *  substring(0, i) 得到的还是自己 —— 这就是「回上层」原地不动的根因。 */

/** 时间戳 → 'YY-MM-DD HH:mm'，用于左栏「日期」列（Win64 三栏档案列表）。 */
function fmtDate(ms: number): string {
  if (ms <= 0) {
    return '--';
  }
  const d: Date = new Date(ms);
  const p = (v: number): string => (v < 10 ? '0' + v : '' + v);
  return (d.getFullYear() % 100).toString().padStart(2, '0') + '-' + p(d.getMonth() + 1) + '-' +
    p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}


// --------------------------------------------------------------------
// 缩略图基础设施
//
// 为什么必须有它（这是「图片一多就崩」的主因）：
//   左侧档案列表原本是 Image(item.uri) —— 组件会按**原图分辨率**解码。
//   一张 4000×3000 的照片解码后是 4000×3000×4 ≈ 48MB；列表里有几十个
//   可见/缓存项时就是好几个 GB，必然 OOM 崩溃。
//
//   所以这里统一先解出「小图 PixelMap」再交给 Image 显示：384px 长边时
//   单张约 600KB，24 张 LRU 也不过 15MB —— 比解一张原图还小。
//
//   2026-11-09：左栏不再常驻缩略图（用户要求「要 mouse over 才显示」）。
//   现在整套缩略图只在鼠标悬停某行时才解码，滚动列表时一张都不解，
//   既省内存也省 CPU，大图库滚动更跟手。
// --------------------------------------------------------------------

/** 悬停缩略图（Win64 51 行）：220 DIP 浮层，用 384px 档解码，
 *  自己的 24 张 LRU、同时只解一个，不挤占主预载缓存。 */
const HOVER_EDGE: number = 384;
const HOVER_MAX_COUNT: number = 24;
/** 悬停浮层关闭去抖（ms）：鼠标跨过行 / 子元素边界时不立刻收起。
 *  注意：这只能抹平「正常进出」的抖动，**治不了不停闪** —— 闪烁真正的根因是
 *  bindPopup 默认的 mask / autoCancel（见下方 bindPopup 选项上的说明）。 */
const HOVER_CLOSE_DELAY_MS: number = 120;
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
 *  关掉之后启动只读几个小 key（毫秒级），恢复动作留给用户主动点「回到上次」——
 *  那时 applyItems → restoreIndex 依然会自动落回上次那张，功能没丢，只是不在启动时抢主线程。
 *
 *  另外：关掉它**不等于**启动时什么都不干 —— 见 warmLast()，那张「上次成功显示的图」
 *  会在后台单独解好等着，用户挑图 / 回到上次时首屏直接命中缓存。
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
 *  edge = QUICK_EDGE 得到低清占位；edge = preloadEdge() 得到「可显示清晰度」的预载；
 *  edge = viewEdge() 得到全清图；edge = HOVER_EDGE 得到悬停缩略图。共用同一套系统 codec。 */
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
    const entry: PreviewEntry = { uri: uri, px: px, bytes: dw * dh * 4, w: w, h: h, edge: edge };
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
  /** 左栏常驻缩略图已取消，只保留悬停这一套：384px 档 / 24 张 LRU / 并发 1。
   *  Win64 51 行：悬停用自己的小缓存，且解码同时最多一个在跑。 */
  private static hoverInst: ThumbLoader = new ThumbLoader(HOVER_EDGE, HOVER_MAX_COUNT, 1);
  private cache: Map<string, PreviewEntry> = new Map();
  private order: string[] = [];   // 最近使用顺序，队头最旧
  private pending: ThumbTask[] = [];
  private active: number = 0;
  private edge: number;
  private maxCount: number;
  private concurrency: number;

  constructor(edge: number, maxCount: number, concurrency: number) {
    this.edge = edge;
    this.maxCount = maxCount;
    this.concurrency = concurrency;
  }

  static hover(): ThumbLoader {
    return ThumbLoader.hoverInst;
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
    while (this.active < this.concurrency && this.pending.length > 0) {
      const t: ThumbTask | undefined = this.pending.shift();
      if (t === undefined) {
        break;
      }
      if (!t.alive()) {
        continue; // 行已经划出屏幕了，这个请求作废
      }
      this.active++;
      decodePx(t.uri, this.edge)
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
    while (this.order.length > this.maxCount) {
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

/** 左侧档案列表的一行（文件浏览器三栏：档案名 / 字节 / 日期）。
 *
 *  拆成独立组件是为了让「悬停缩略图解码完成」只重渲染**这一行** ——
 *  若由父组件维护一个全局 map，每张图加载完都要刷新整个列表，几百次不足为惧的
 *  全列表重排会直接拖垮滚动流畅度。
 *  2026-11-09：行内不再常驻缩略图，只有 mouse over 整行时才解码并浮出小图。 */
@Component
struct ArchiveRow {
  @Prop uri: string = '';
  @Prop name: string = '';
  // ⚠️ 不能叫 `size`：CustomComponent 基类上已有同名通用属性方法
  //    （'.size({ ... })'），会报 "not assignable to ... (value: SizeOptions) => CommonAttribute"。
  //    同类雷区还有 width / height / scale / rotate / translate（本文件因此用 zoom 表示缩放）。
  @Prop bytes: number = -1;
  @Prop mtime: number = 0;      // 修改时间，日期列用
  @Prop kind: number = 0;       // 0=图片 1=上级 2=目录 3=不支持预览
  @Prop idx: number = 0;
  @Prop selected: boolean = false;
  @Prop collapsed: boolean = false;  // 收起左栏时只留档案名一列
  // ⚠️ 回调也不能加 private：ArkTS 会报
  //    "Property 'onTap' is private and can not be initialized through the component constructor"。
  onTap: (idx: number) => void = () => {};
  onDblTap: (idx: number) => void = () => {};
  @State showHover: boolean = false;                       // 悬停浮层是否展开
  @State hoverPx: image.PixelMap | undefined = undefined;  // 悬停大图（384px 档）
  private alive: boolean = true;
  /** 悬停关闭去抖代号 / 计时器：hover 只碰这两个字段和上面两个 @State，
   *  绝不调用父组件的 onTap / 列表 / 目录方法（否则退出 hover 会把当前档案 / 目录带走）。 */
  private hoverSeq: number = 0;
  private hoverCloseTimer: number = -1;

  /** 行标识：同一目录里 uri 唯一，排序 / 重扫改变 idx 也不会串位。 */
  private rowKey(): string {
    return this.uri;
  }

  private cancelCloseTimer(): void {
    if (this.hoverCloseTimer !== -1) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = -1;
    }
  }

  /** 被 HoverGuard 同步收起（另一行接手浮层）：立刻关，不走延迟，
   *  否则「旧行还在等 120ms、新行已经弹出」会看到两个浮层重叠闪一下。
   *  只碰 hover 自己的状态，绝不调用 onTap / 列表 / 目录方法。 */
  private forceHide(): void {
    this.hoverSeq++;
    this.cancelCloseTimer();
    this.showHover = false;
    this.hoverPx = undefined;
  }

  /** Win64 bac9ff9：图片粉、目录粉蓝、不支持预览的文件灰；上级行用中性色 */
  /** 行首类型标记的颜色（不是缩略图，只是 18vp 的小符号）。 */
  private iconColor(): string {
    if (this.kind === ROW_OTHER) {
      return '#4b5260';
    }
    if (this.kind === ROW_IMAGE) {
      return this.selected ? '#e8ecf4' : '#e2a8cf';
    }
    return '#8fb8e8';
  }

  private labelColor(): string {
    if (this.selected) {
      return '#e8ecf4';
    }
    if (this.kind === ROW_FOLDER || this.kind === ROW_UP) {
      return '#8fb8e8';
    }
    if (this.kind === ROW_OTHER) {
      return '#6b7280';
    }
    return '#e2a8cf';
  }

  aboutToAppear(): void {
    this.alive = true;
    // 刻意不在这里解码任何缩略图：只有 onHover 才触发（见 onHoverChange）
  }

  aboutToDisappear(): void {
    this.alive = false; // 离屏后即使队列轮到自己，也不再回调
    this.hoverSeq++;    // 作废待执行的延迟关闭
    this.cancelCloseTimer();
    HoverGuard.shared().release(this.rowKey());
    this.showHover = false; // 行划出屏幕 / 滚动列表：浮层立刻收起
    this.hoverPx = undefined;
  }

  /** Win64 51 行：鼠标停在档案行任意位置，右侧浮出小图（左栏本身不常驻缩略图）。
   *  先查悬停自己的 LRU，命中即同步出图；没命中才后台解一张 384px（同时最多一个）。
   *  目录行 / 不支持预览的灰行不弹；离屏、点击、划走由 alive / showHover 收起。 */
  private onHoverChange(on: boolean): void {
    if (this.kind !== ROW_IMAGE) {
      return;
    }
    const key: string = this.rowKey();
    if (!on) {
      // 已被 HoverGuard 同步收起（换到另一行 / 点击 / 离屏）就别再排一次关闭
      if (!this.showHover) {
        return;
      }
      // 延迟收起 + 代号作废：鼠标跨过行内子元素 / 行边界的一瞬间会连着派发
      // onHover(false) 与 onHover(true)，120ms 缓冲只用来抹平这种正常抖动。
      // ⚠️ 它治不了「不停闪」：那是 popup 的 mask / autoCancel 默认值造成的
      //    自激循环，已在 bindPopup 选项里关掉（见下方）。
      const seq: number = ++this.hoverSeq;
      this.cancelCloseTimer();
      this.hoverCloseTimer = setTimeout(() => {
        this.hoverCloseTimer = -1;
        if (!this.alive || seq !== this.hoverSeq) {
          return; // 期间又 hover 回来了 / 行已离屏
        }
        this.showHover = false;
        this.hoverPx = undefined;
        HoverGuard.shared().release(key);
      }, HOVER_CLOSE_DELAY_MS);
      return;
    }
    // on === true：先作废待收起的计时器（鼠标又回来了）
    this.hoverSeq++;
    this.cancelCloseTimer();
    if (this.showHover) {
      return; // 连续派发别重复排队 384px 解码
    }
    // 全局唯一浮层：新行接手时同步收起旧行，避免两个 popup 重叠闪一下
    HoverGuard.shared().take(key, () => this.forceHide());
    this.showHover = true;
    const hit: image.PixelMap | undefined = ThumbLoader.hover().peek(this.uri);
    if (hit !== undefined) {
      this.hoverPx = hit;
      return;
    }
    this.hoverPx = undefined;
    ThumbLoader.hover().request(this.uri, () => this.alive && this.showHover,
      (p: image.PixelMap | undefined) => {
        if (this.alive && this.showHover && p !== undefined) {
          this.hoverPx = p;
        }
      });
  }

  @Builder
  hoverThumb() {
    Column() {
      if (this.hoverPx !== undefined) {
        Image(this.hoverPx!)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.Medium)
          .width(220)
          .height(165)
          .borderRadius(4)
      } else {
        // 384px 还在解码：给个「读取预览…」占位，不用行内图顶，也不触发原图解码
        Column() {
          Text('读取预览…')
            .fontSize(11)
            .fontColor('#7f88a8')
        }
        .width(220)
        .height(165)
        .justifyContent(FlexAlign.Center)
        .borderRadius(4)
        .backgroundColor('#262b34')
      }
      Text(this.name)
        .fontSize(11)
        .fontColor('#dfe5ef')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width(220)
        .margin({ top: 6 })
    }
    .padding(8)
    .backgroundColor('#1a1d23')
    .border({ width: 1, color: '#3a4150' })
    .borderRadius(6)
  }

  build() {
    Row() {
      // 左栏不再常驻缩略图：统一只给一个 18vp 的类型标记，档案名多出 38vp。
      // 缩略图只在 mouse over 整行时由 bindPopup 浮出（见 hoverThumb）。
      Text(this.kind === ROW_UP ? '↑' : (this.kind === ROW_FOLDER ? '▣' : '·'))
        .fontSize(this.kind === ROW_IMAGE ? 14 : 18)
        .fontColor(this.iconColor())
        .width(18)
        .height(26)   // 11-10 起压缩行高：42 → 26，配合下方 padding 把每行从 54vp 收到 30vp
        .textAlign(TextAlign.Center)

      Text(this.name)
        .fontSize(12)
        .fontColor(this.labelColor())
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        // 左栏已按最长档案名自适应（listWidthForNames），这里再兜一层：
        // layoutWeight 分配宽度时至少给到名字内容宽，长名字不会被压出省略号；
        // 极少数超过 LIST_MAX_W 的超长名才由 Ellipsis 截断。
        .constraintSize({ minWidth: textWidthVp(this.name, 12) + 8 })
        .layoutWeight(1)
        .padding({ left: 8 })

      // 三栏的另外两栏：字节 / 日期（Win64 30599ac）。收起时隐藏。
      if (!this.collapsed) {
        Text(fmtBytes(this.bytes))
          .fontSize(10)
          .fontColor('#7f88a8')
          .width(66)
          .textAlign(TextAlign.End)
          .maxLines(1)
        Text(this.mtime > 0 ? fmtDate(this.mtime) : '--')
          .fontSize(10)
          .fontColor('#6b7385')
          .width(88)
          .textAlign(TextAlign.End)
          .maxLines(1)
          .margin({ left: 6 })
      }
    }
    .width('100%')
    // 11-10 起压缩每一横行的垂直占用：上下 6 → 2，字号保持不变以维持可读性
    .padding({ left: 6, right: 6, top: 2, bottom: 2 })
    .borderRadius(6)
    .backgroundColor(this.selected ? '#1f2730' : 'transparent')
    // hover 绑在整行而不是档案名 Text 上：鼠标划过图标 / 字节 / 日期列也能出图，
    // 触发面积大得多，PC 上更好按（用户反馈「要 mouse over 才显示」）。
    .onHover((isHover: boolean) => {
      // 记下「本机 onHover 通道可用」，据此关掉下面 onMouse 的兜底自动打开。
      // 若放在 onHoverChange 里，兜底自己调用时会把自己禁掉（只派发 onMouse 的设备
      // 就永远弹不出浮层），所以必须留在 .onHover 回调内。
      HoverGuard.shared().noteHover();
      this.onHoverChange(isHover);
    })
    // 2in1 兜底：SDK 26 明确 MouseAction.Hover「has no effect」，这里只认 Move。
    .onMouse((event: MouseEvent) => {
      if (event.action !== MouseAction.Move) {
        return;
      }
      if (this.showHover) {
        // 鼠标仍在本行移动：续命、取消待收起。菜单 / 浮层抢焦点会造成一次
        // 假的 onHover(false)，靠这条把它压住，浮层不会「刚出来就消失」。
        this.hoverSeq++;
        this.cancelCloseTimer();
        return;
      }
      // ⚠️ 绝不能无条件自动打开：正常设备收到 onHover(false) 后会延迟收起，
      // 紧接着一次 Move 就又把浮层打开 —— 「收起→打开→收起」自激成不停闪。
      // 只有在「整台设备从未派发过 onHover」时才启用兜底。
      if (!HoverGuard.shared().hoverSupported) {
        this.onHoverChange(true);
      }
    })
    .bindPopup(this.showHover, {
      builder: () => { this.hoverThumb(); },
      placement: Placement.Right,
      popupColor: '#1a1d23',
      // ===== 不停闪的真正根因（SDK 26 CustomPopupOptions 的两个默认值）=====
      // mask 默认 true：popup 一显示就铺一层覆盖全窗口的透明遮罩，吞掉鼠标事件，
      //   宿主行立刻收到 onHover(false) → 我们收起 popup → 遮罩消失 → hover 恢复
      //   → 又弹出 → 无限循环。上一轮加的 120ms 去抖只是把闪烁周期拉长而已。
      // autoCancel 默认 true：页面上任何操作（含鼠标移动）系统都会自行收起 popup，
      //   而 showHover 仍为 true 又把它拉回来，两边打架 → 高频闪烁。
      // 关掉这两项后，popup 显隐完全由 showHover 决定，onHover(false) 也重新可信。
      mask: false,
      autoCancel: false,
      enableArrow: false // 少一次箭头位置计算，弹出的位置更稳定
    })
    .onClick(() => {
      // 鼠标按下选图：浮层立刻收起；顺手作废延迟关闭，别让计时器在组件重建后又跑一次
      this.hoverSeq++;
      this.cancelCloseTimer();
      this.showHover = false;
      this.hoverPx = undefined;
      HoverGuard.shared().release(this.rowKey());
      this.onTap(this.idx);
    })
    .gesture(
      TapGesture({ count: 2 })
        .onAction(() => this.onDblTap(this.idx))
    )
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
  /** 左栏实际显示的行（Win64 FsEntry）。目录浏览态下会多出「..」、子文件夹、
   *  不支持预览的文件；非目录态就是 items 的镜像。dataSource 用 rows，不用 items。 */
  private rows: ImageItem[] = [];
  // ---- 目录浏览（对齐 Win64 文件浏览器，鸿蒙变形实现）----
  private browseDir: string = '';          // 当前目录 uri（picker 原始返回值）；空 = 非目录浏览态
  // openFolder 实测「能 listFile 且子文件能 open」的真实路径。回上层 / 重扫 / mtime 自检
  // 一律用它：原始 uri 可能是 file://docs/... 或百分号编码，fs.statSync 认不出来。
  private browseBase: string = '';
  /** 最近一次「选择文件夹」拿到的原始 uri。目录态若被「目录内多选」清掉，
   *  仍可靠它推算出上层目录，不至于让「回上层」变成没反应。 */
  private pickRootUri: string = '';
  private dirStack: string[] = [];          // 上层目录栈，存真实路径，供「..」/退格回退
  private dirMtime: number = 0;             // 当前目录 mtime，用于自检（SDK26 无 fileObserver）
  private dirPollTimer: number = -1;        // 目录轮询句柄
  private rescanTimer: number = -1;         // 变动后去抖重扫句柄
  private folderBusy: boolean = false;      // 防止导航连点 / 重扫叠加重入
  @State itemCount: number = 0;
  /** 左栏实际行数（含「..」/ 子文件夹 / 灰行），与 itemCount（只算图片）分开。
   *  判空态必须用 rowCount：像「人像」这种全是子文件夹、零图片的目录，
   *  itemCount=0 但 rows 有内容，旧版会整块换成「还没有图片」空态 → 目录表全白。 */
  @State rowCount: number = 0;
  /** 目录态零图片时的一行说明，显示在列表上方，避免用户以为又是空白 / 出错。 */
  @State dirHint: string = '';
  @State source: string = '尚未打开';
  @State cur: number = -1;          // 当前选中索引；-1 表示空
  /** 当前浏览目录的完整路径（Win64 07c1eee：搬到标题栏）。鸿蒙没有 setWindowTitle，
   *  就放在顶栏 PIKAN 右边，显示时中间省略保住末尾目录名。 */
  @State titlePath: string = '';
  /** 左栏收起态（Ctrl+B / « 按钮）。收起后只留档案名一列，抬头与三个按钮仍保留。 */
  @State listCollapsed: boolean = false;
  /** 左栏展开宽度：按当前列表最长档案名自适应（见 listWidthForNames）。 */
  @State listW: number = LIST_W;
  /** 左栏排序方向：true = 升序（自然序） */
  @State sortAsc: boolean = true;
  /** 顶栏自动隐藏（Win64 0cfabb2）：鼠标贴近窗口顶端才浮出，默认不占画面 */
  @State topbarVisible: boolean = true;
  private topbarTimer: number = -1;   // 「停手 N 秒自动收起」的兜底计时器

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
  @State status: string = '点左栏「选择文件夹」浏览目录';
  /** 全屏（沉浸）模式：隐藏顶栏 / 左侧档案栏 / 状态栏，画布铺满整个窗口。
   *  做的是「应用内隐藏 UI」，不调 window 全屏接口 —— 不依赖窗口权限，也不会踩系统 API 差异。 */
  @State fullscreen: boolean = false;

  private timerId: number = -1;
  private baseZoom: number = 1;
  private ctrlDown: boolean = false; // Ctrl + 滚轮 = 缩放，由键盘事件跟踪
  private shiftDown: boolean = false; // Shift + R/H/V/B 组合键（Win64 10-29 起）
  private baseTx: number = 0;
  private baseTy: number = 0;
  // 单击放大前的视图快照：双击来临时用它撤销「第一下单击」，保证进出全屏画面不变
  private clickSnapZoom: number = -1;
  private clickSnapTx: number = 0;
  private clickSnapTy: number = 0;
  private clickSnapAt: number = 0;

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
   *  只弹一次：权限一旦被拒，恢复列表时不该反复弹同一个框。 */
  private permAsked: boolean = false;
  /** 系统选择器是否正开着。连点会叠出两个选择器，后开的那个常常就是点不动的那个 */
  private pickerBusy: boolean = false;
  private snapChunks: number = 0;                       // 已写入快照的块数（换源后块数变少时清旧块）
  /** 空态区的一行提示（「上次看到 …」）。必须是 @State：它是异步读回来的，要靠它刷新 UI。
   *  而 lastPos 本身刻意不是 @State —— 切图时每帧都改它会导致整个界面反复重建。 */
  @State resumeHint: string = '';

  // ---- 后台预载缓存（不用 @State：靠 @State cur / viewPixelMap 变化触发重建即可）----
  private previews: PreviewEntry[] = [];              // 简易 LRU：命中移到队尾，超容量从队头淘汰
  private preloadBytes: number = 0;                   // 当前缓存估算占用
  /** 右下角角标要显示的缓存账目（镜像）。
   *  真正的账本是上面两个普通字段（预载每解一张就动一次，做成 @State 会让整棵树反复重建），
   *  只在「入缓存 / 淘汰 / 清空」三个口子上 sync 一次给 UI —— 频率最多几十次/轮，够看又不抖。 */
  @State cacheCount: number = 0;
  @State cacheBytes: number = 0;
  /** 目录浏览诊断行：把「装的是哪一版 + picker 实际返回的 uri 形态」画在屏幕上。
   *  之前四次修复共用 versionCode 4 / 1.0.4，实机无法分辨装的是旧包还是新包；
   *  而 agent 侧截不到屏、读不到 hilog，只能靠这一行让用户截图带回来。 */
  @State diagLine: string = '';
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
  /** 对开时的右页：命中预载缓存就直接引用缓存的 PixelMap（所有权仍归缓存），
   *  否则自己解一张并记在 rightOwned 里。切图 / 换源时按所有权分别释放。 */
  @State rightPixelMap: image.PixelMap | undefined = undefined;
  private rightOwned: image.PixelMap | undefined = undefined;
  private rightToken: number = 0;
  @State viewFailed: boolean = false;                 // 自解码确认失败 → 才回退到 Image(uri)
  @State curToken: number = 0;                        // 当前显示图的代号（每切换一次自增）

  // ---- 切图过渡：低清模糊层（盖在清晰图之上，就绪后淡出）----
  @State lowPixelMap: image.PixelMap | undefined = undefined; // 过渡期显示的那张低清图
  @State blurRadius: number = 0;                      // 当前模糊半径（BLUR_MAX → 0）
  @State lowOpacity: number = 0;                      // 低清层不透明度（1 → 0）
  private focusSeq: number = 0;                       // 对焦动画代号，切图时自增使旧动画作废

  aboutToAppear(): void {
    // Win64「可观测」的鸿蒙变形：启动只打一条常量环境快照，绝不读 preferences / 不枚举磁盘。
    // 早期 appfreeze 的真根因正是启动路径上的 PreferencesGetValue，这里必须保持极轻。
    hilog.info(DOMAIN, TAG,
      'PIKAN %{public}s start · preload %{public}d fwd / %{public}d max · spread=%{public}d · dirPoll=%{public}d',
      APP_VERSION, PRELOAD_FWD, PRELOAD_COUNT, SPREAD_PORTRAIT ? 1 : 0, DIR_POLL_MS);
    this.readLastPos(); // 异步读，不阻塞首帧
  }

  aboutToDisappear(): void {
    this.stopSlide();
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
      this.dirPollTimer = -1;
    }
    if (this.rescanTimer !== -1) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = -1;
    }
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
    this.clearTopbarTimer();
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
   *  而系统选择器程序无权替用户操作，只能提示用户点一下。
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
        this.status = '正在恢复上次位置：第 ' + (saved.idx + 1) + ' 张 · ' + saved.name;
        if (saved.src === SRC_ALL) {
          // 上次来自「图库全部」→ 优先静默重扫（能拿到最新的全量列表）；
          // 扫不到（多半是没权限）时 queryAllPhotos 内部会自己退到快照恢复。
          this.loadAllGallery(); // silent：成功就恢复，失败绝不弹窗
        } else {
          // 上次来自系统选择器 → 程序无权替用户点选择器，直接用上次会话的快照恢复
          this.trySnapRestore();
        }
      } else {
        // 启动时只记位置、不做重活（恢复动作不再有独立按钮入口）
        // （见 AUTO_RESUME_ON_START 注释：启动时读快照 + 重扫会触发 APP_INPUT_BLOCK）。
        this.status = '上次看到「' + saved.name + '」第 ' + (saved.idx + 1) + ' 张 · 可用「选择文件夹」重新打开目录';
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
   *  用户点「选择图片」/「回到上次」时 applyItems 会把它接进缓存，showPreviewOf 命中 → 首屏立刻出图，
   *  不必再等一次低清解码（这是打开大图库时「先黑一下」的主要来源）。 */
  private warmLast(uri: string): void {
    setTimeout(() => {
      const t0: number = Date.now();
      this.decodeTo(uri, this.preloadEdge())
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
    this.lastPos = pos; // 内存里同步更新，内部恢复逻辑可直接取用
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
   *  返回 false 表示没有可用快照。不要求当前列表为空 —— 「回到上次」也复用它。 */
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

  /** 【已停用】原顶栏「回到上次」的处理（11-10 起按钮与 doAction 分支已移除，本体保留供降级链复用）：
   *  当前有列表就在列表里定位；列表为空则先尝试「图库全部」重扫、再用快照恢复 */
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
        this.status = '已恢复上次位置：第 ' + (i + 1) + ' / ' + this.items.length + ' 张 · ' +
          this.items[i].name;
        return;
      }
      this.status = '当前这批图片里没有上次的「' + p.name + '」（上次来自' + p.src + '）';
      return;
    }
    if (p.src === SRC_ALL) {
      this.status = '正在恢复上次列表…';
      this.loadAllGallery(); // 失败时内部会退到快照恢复
      return;
    }
    this.status = '正在恢复上次位置…';
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

  /** 右页：只有「自己解的」才 release；命中缓存的那张归缓存管（缓存淘汰会跳过它）。 */
  private releaseRightOwned(): void {
    const rb: image.PixelMap | undefined = this.rightOwned;
    this.rightOwned = undefined;
    if (rb !== undefined) {
      try {
        rb.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'release right pixelmap skipped');
      }
    }
  }

  /** 载入对开右页：优先命中预载缓存（同步、零等待），否则后台解一张可显示清晰度。
   *  代号校验：切图后旧回调一律作废，避免右页显示成上一对的图。 */
  private loadRightPage(uri: string): void {
    this.rightToken++;
    const token: number = this.rightToken;
    this.releaseRightOwned();   // 上一张右页若是自解码的，先释放
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    if (hit !== undefined) {
      this.rightOwned = undefined;
      this.rightPixelMap = hit.px;
      return;
    }
    this.decodeTo(uri, this.preloadEdge())
      .then((e: PreviewEntry | undefined) => {
        if (token !== this.rightToken || e === undefined) {
          if (e !== undefined) {
            try {
              e.px.release();
            } catch (err) {
              // ignore
            }
          }
          return;
        }
        this.rightOwned = e.px;
        this.rightPixelMap = e.px;
      })
      .catch(() => {
        // 右页解不开就留空，左页照常显示（不把整屏拖成失败态）
      });
  }

  /** 单页 / 换源时收掉右页（不动左页） */
  private clearRightPage(): void {
    this.rightToken++;
    this.releaseRightOwned();
    this.rightPixelMap = undefined;
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

  /** 信息浮层的档案名：对开时「左名 · 右名」，单页时只有当前名。 */
  private spreadNames(): string {
    const a: string = this.curName();
    const b: number = this.spreadB;
    if (b >= 0 && b < this.items.length) {
      return a + '  ·  ' + this.items[b].name;
    }
    return a;
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
    // 乱码修复只作用于显示名：uri 本身保持磁盘原样，IO / 位置记忆一律用原始值
    const shown: string = repairMojibake(b);
    return shown && shown.length > 0 ? shown : ('图片 ' + (idx + 1));
  }

  /** 载入一组 URI，构建档案列表并默认选中第一张。
   *  体积刻意留成 -1 交给后台 fillSizes() 补 —— 见那里的注释。
   *  对齐 Win64：过滤 . 开头的隐藏文件，并按自然序排序（IMG_2 排在 IMG_10 前）。 */
  private setItems(uris: Array<string>, src: string): void {
    hilog.info(DOMAIN, TAG, 'setItems: %{public}d uris from %{public}s', uris.length, src);
    // 从目录浏览切回文件多选 / 快照恢复：必须清掉目录态。
    // 否则 startDirPoll 每 1.5s 还在盯旧目录，一旦 mtime 变化就会把用户刚选的图
    // 重新覆盖掉；标题栏也会继续挂着上一个目录的路径。
    this.browseDir = '';
    this.browseBase = '';
    this.dirStack = [];
    this.diagLine = ''; // 回到图库 / 多选态，别再挂旧目录的诊断串
    this.dirHint = '';  // 非目录态不显示「本层没有图片」提示条
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
      this.dirPollTimer = -1;
    }
    if (this.rescanTimer !== -1) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = -1;
    }
    this.source = src;
    const list: ImageItem[] = [];
    for (let i = 0; i < uris.length; i++) {
      const u: string = uris[i];
      const raw: string = baseName(u);
      if (HIDE_DOT_FILES && raw.length > 0 && raw.charAt(0) === '.') {
        continue;
      }
      const item: ImageItem = {
        uri: u, name: this.nameOf(u, i), size: -1,
        kind: ROW_IMAGE, itemIndex: i
      };
      list.push(item);
    }
    list.sort((a: ImageItem, b: ImageItem) => naturalCompare(a.name, b.name));
    this.applyItems(list, src, '');
  }

  /** 统一入口：提交档案列表、刷新计数与数据源、重建预览与预载。
   *  起始位置：优先恢复到上次浏览的那张（见 restoreIndex），否则从第 1 张开始。
   *  目录浏览态会传入 rows（含 .. / 子文件夹 / 灰行），此时 items 仍只含可翻页图片。 */
  private applyItems(list: ImageItem[], src: string, capped: string, rows?: ImageItem[],
    preserveView?: boolean): void {
    // 目录自动重扫（isRescan）走 preserveView：只换 rows / items，绝不恢复上次位置、
    // 不滚动列表、不清预览缓存、不重解大图。否则 hover 解码让目录 mtime 抖动后，
    // 一次自动重扫就会把用户视图整个拉回「上次档案 / 目录」。
    const keepView: boolean = preserveView === true;
    const prevUri: string = (keepView && this.cur >= 0 && this.cur < this.items.length)
      ? this.items[this.cur].uri : '';
    this.items = list;
    if (rows !== undefined) {
      this.rows = rows;
    } else {
      this.rows = list; // 非目录态：左栏行就是图片序列本身
      // 有路径直接调 applyItems() 而不经 setItems()（如快照恢复），
      // 这里兜底清掉目录提示条，避免图库态还挂着「本层没有图片」。
      this.dirHint = '';
    }
    this.source = src;
    this.itemCount = list.length;
    this.rowCount = this.rows.length;
    // 依据当前列表里最长的档案名调整左栏宽度：短名字收窄少留白，长名字放宽不截断。
    const rowNames: string[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      rowNames.push(this.rows[i].name);
    }
    this.listW = listWidthForNames(rowNames, LIST_W, LIST_MAX_W);
    this.dataSource.reload(this.rows);
    // 标题栏路径：目录浏览态用当前目录；否则取首批 uri 的父目录
    // 目录态优先显示真实路径（原始 uri 常是 file://docs/... 或 %XX 编码，读起来像乱码）
    this.titlePath = this.browseBase.length > 0 ? this.browseBase :
      (this.browseDir.length > 0 ? this.browseDir :
        (list.length > 0 ? parentDirOf(list[0].uri) : ''));
    // 先算出落点再解码：否则会先按第 1 张解一遍、恢复时又解一遍，白白多一次大图解码
    const start: number = keepView ? -1 : this.restoreIndex(list);
    if (keepView) {
      // 保持当前显示的那张：列表可能重排，按 uri 重新对齐；找不到就夹在原下标附近。
      let keptIdx: number = -1;
      if (prevUri.length > 0) {
        for (let i = 0; i < list.length; i++) {
          if (list[i].uri === prevUri) {
            keptIdx = i;
            break;
          }
        }
      }
      this.cur = keptIdx >= 0 ? keptIdx :
        (list.length > 0 ? Math.min(this.cur < 0 ? 0 : this.cur, list.length - 1) : -1);
      hilog.info(DOMAIN, TAG, 'applyItems: rescan kept view at %{public}d', this.cur);
    } else {
      this.cur = list.length > 0 ? (start >= 0 ? start : 0) : -1;
      this.resetView();
      if (this.cur >= 0) {
        this.loadMeta(this.cur);
        this.scroller.scrollToIndex(this.rowOfItem(this.cur), false);
      }
    }
    if (start >= 0) {
      this.resumeHint = ''; // 已经回到上次位置，空态提示不再需要
    }
    const where: string = start >= 0 ? (' · 已恢复上次位置（第 ' + (start + 1) + ' 张）') : '';
    if (!keepView) {
      this.status = '已载入 ' + list.length + ' 张（' + src + '）' + capped + where;
    }
    hilog.info(DOMAIN, TAG, 'applyItems: %{public}d items, cur=%{public}d keepView=%{public}d',
      list.length, this.cur, keepView ? 1 : 0);
    this.clearWheel();     // 换了图片源，攒着的滚轮步数必须作废
    if (!keepView) {
      this.clearPreviews();
      this.failed.clear();   // 换了图片源，上一批的「解不开」黑名单作废
    }
    // 接上启动预热的那张：此刻列表已有、cur 已定，交给缓存后 showPreviewOf 会直接命中。
    // 若它不属于这一批（用户换了别的来源），schedulePreload → evictOutside 会顺手释放掉。
    if (!keepView) {
      if (this.warm !== undefined) {
        const w: PreviewEntry = this.warm;
        this.warm = undefined;
        this.pushPreview(w);
        const at: string = this.cur >= 0 ? this.items[this.cur].uri : '';
        hilog.info(DOMAIN, TAG, 'warm: adopted %{public}s', w.uri === at ? 'on current' : 'not current');
      }
      this.showPreviewOf(this.cur);
      this.fillSizes();
    }
    this.refreshSpread();
    this.schedulePreload();
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
    let yielded: number = 0;
    const step = (): void => {
      if (seq !== this.sizeSeq || i >= this.items.length) {
        hilog.info(DOMAIN, TAG, 'fillSizes: end at %{public}d / %{public}d', i, this.items.length);
        return; // 换了数据源，这批作废
      }
      // Win64 2bcbbb1「只在你没翻图 / 没滚动 / 没导航的时候才动磁盘」：
      // 鸿蒙没有空闲调度器，用 wheelActive / folderBusy / playing 近似，翻页与换目录期间一律让路。
      // 让路只是把这一批推后重试（序列 i 不变，不会漏算）；设上限避免开着幻灯片时永远不补测。
      if ((this.wheelActive || this.folderBusy || this.playing) && yielded < 40) {
        yielded++;
        setTimeout(() => {
          step();
        }, SIZE_YIELD_MS * 4);
        return;
      }
      yielded = 0;
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
            this.setRowSize(this.items[k].uri, s);
            changed = true;
          }
        }
      }
      i = end;
      if (changed) {
        this.dataSource.reload(this.rows); // 通知 LazyForEach 重取 @Prop
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

  /** 对外显示的缩放百分比（Win64 a1d7bca / 38f2093 口径）。
   *  `100 %` = 一个原图像素对应一个屏幕 vp 像素（1:1），与 ACDSee / Photoshop 一致；
   *  「适应窗口」通常是 13%~30% 这类小数。内部 zoom 仍是相对适应窗口的倍率，不对外显示。
   *  不足 10% 给一位小数，否则整数。尺寸未就绪时回退到内部倍率，避免显示 0%。 */
  private zoomPercentText(): string {
    if (!ZOOM_PCT_RELATIVE_TO_PIXEL) {
      return Math.round(this.zoom * 100) + ' %';
    }
    const f: number = this.fitFactor();
    if (f <= 0) {
      return Math.round(this.zoom * 100) + ' %';
    }
    const pct: number = this.zoom * f * 100;
    return (pct < 10 ? pct.toFixed(1) : Math.round(pct).toString()) + ' %';
  }

  private zoomBy(factor: number): void {
    this.zoom = clamp(this.zoom * factor, MIN_SCALE, MAX_SCALE);
    this.status = '缩放 ' + this.zoomPercentText();
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
    this.status = '缩放 ' + this.zoomPercentText();
  }

  /** 鼠标按键（对齐 Win64 84adb7a）：
   *  左键 = 放大 50%（以光标为锚点，连点累积）；右键 = 还原（适应窗口并归位）；
   *  双击 = 切换全屏，且会**撤销第一下单击的放大**，让进出全屏画面保持原样。
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
      if (btn === MouseButton.Right) {
        // 右键 = 还原（Win64：复位视图 + 归位）
        this.resetView();
        this.status = '已还原（适应窗口）';
        this.clickSnapZoom = -1; // 不需要给双击撤销
        return;
      }
      if (btn !== MouseButton.Left) {
        return;
      }
      // 记下放大前的状态：若这是「双击的第一下」，随后的双击手势会把它恢复回去
      this.clickSnapZoom = this.zoom;
      this.clickSnapTx = this.tx;
      this.clickSnapTy = this.ty;
      this.clickSnapAt = Date.now();
      // 立即执行，不做任何延迟 —— 单击放大是最高频操作，延迟会明显发滞
      this.zoomAt(ZOOM_LEFT, event.x, event.y);
    }
  }

  /** 双击画布：撤销第一下单击的放大 → 切换全屏（Win64 84adb7a / 7ff850d）。 */
  private onDoubleTapCanvas(): void {
    if (this.clickSnapZoom >= 0 && Date.now() - this.clickSnapAt <= DBL_CLICK_UNDO_MS) {
      this.zoom = this.clickSnapZoom;
      this.tx = this.clickSnapTx;
      this.ty = this.clickSnapTy;
    }
    this.clickSnapZoom = -1;
    this.toggleFull();
  }

  /** 撤销最近一次单击放大（供双击档案名复用），不影响其它视图状态。 */
  private undoLastClickZoom(): void {
    if (this.clickSnapZoom >= 0 && Date.now() - this.clickSnapAt <= DBL_CLICK_UNDO_MS) {
      this.zoom = this.clickSnapZoom;
      this.tx = this.clickSnapTx;
      this.ty = this.clickSnapTy;
    }
    this.clickSnapZoom = -1;
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

  /** 图片序列下标 → 左栏行下标。目录浏览态下 rows 前面会多出 .. / 子文件夹 / 灰行，
   *  直接拿 cur 去 scrollToIndex 会滚错行。找不到（理论上不会）就退回原下标。 */
  private rowOfItem(idx: number): number {
    if (this.rows === this.items) {
      return idx;
    }
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i].itemIndex === idx) {
        return i;
      }
    }
    return idx;
  }

  /** fillSizes 补测到体积后同步到左栏行（rows 与 items 可能是不同对象） */
  private setRowSize(uri: string, size: number): void {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i].uri === uri) {
        this.rows[i].size = size;
      }
    }
  }

  /** 状态栏页码：对开双页时显示「第 1–2 / N 张」，单页时「第 1 / N 张」 */
  private pageLabel(): string {
    const n: number = this.items.length;
    if (n <= 0 || this.cur < 0) {
      return '还没有图片';
    }
    const b: number = this.spreadRight();
    if (b >= 0) {
      return '第 ' + (this.cur + 1) + '–' + (b + 1) + ' / ' + n + ' 张';
    }
    return '第 ' + (this.cur + 1) + ' / ' + n + ' 张';
  }

  /** 点左栏某一行：按行的种类分发（图片 / 上级 / 子文件夹 / 不支持预览的文件）。
   *  对应 Win64 FsEntry 的 ItemIndex 单向挂钩。 */
  private onRowTap(rowIdx: number): void {
    if (rowIdx < 0 || rowIdx >= this.rows.length) {
      return;
    }
    const r: ImageItem = this.rows[rowIdx];
    const kind: number = r.kind ?? ROW_IMAGE;
    if (kind === ROW_UP) {
      this.browseUp();
      return;
    }
    if (kind === ROW_FOLDER) {
      this.openFolder(r.uri, true);
      return;
    }
    if (kind === ROW_OTHER) {
      this.status = '不支持预览：' + r.name + '（只列出，不进翻页序列）';
      return;
    }
    const idx: number = r.itemIndex ?? rowIdx;
    if (idx >= 0 && idx < this.items.length) {
      this.select(idx);
    }
  }

  private select(idx: number): void {
    if (idx < 0 || idx >= this.items.length) {
      return;
    }
    this.cur = idx;
    this.resetView();
    this.loadMeta(idx);
    this.showPreviewOf(idx);
    this.refreshSpread();
    this.scroller.scrollToIndex(this.rowOfItem(idx), false);
    this.status = this.pageLabel();
    // LazyForEach 不会自动感知 selected 变化，通知数据源重取 @Prop（只重建可见的几行）
    this.dataSource.reload(this.rows);
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
    this.refreshSpread();
    // 第二个参数 smooth=false：快速翻页时不要播滚动动画，否则每次切换都重启一段动画，
    // 左侧列表会一直「追」不上当前项，观感上就是图片和列表错位。
    this.scroller.scrollToIndex(this.rowOfItem(this.cur), false);
    this.status = this.pageLabel();
    this.dataSource.reload(this.rows); // 同步左侧高亮（只重建可见的几行）
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

  /** 攒够一步就**立刻**翻，不做任何定时节流（Win64 版 10-27 提交 649a79c）。
   *
   *  早先是「每 120ms 最多翻一张」，实测快速连滚时每次切换被推迟 40~125ms，
   *  还会攒成一次跳 2~3 张，滚轮明显比键盘慢（键盘是直接 go()）。
   *  现在预载存的已是「可直接显示」的清晰度、命中即刻上屏，切图不再等解码，
   *  「怕解码堆积」就交给代号校验（在途回调一律作废）兜底，不必牺牲跟手感。 */
  private flushWheel(): void {
    if (this.pendingDelta === 0) {
      return; // 没有待消费的步数
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

  /** 【已停用】原顶栏「打开图库」的处理链。
   *  11-10 起按用户要求取消该按钮，doAction 的 'gallery' 分支与 toolBtn 一并移除。
   *  方法本体保留但不再接任何 UI 入口：它内部的 scanAll / restoreFromSnapshot /
   *  选择器兜底，与「回到上次」(loadAllGallery → queryAllPhotos → scanAll) 是同一套能力，
   *  若以后要恢复入口，把 toolBtn 和 doAction 分支加回来即可，不必重写。
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
      this.status = '正在打开图片选择器…（可多选，上限 ' + PICKER_MAX + ' 张）';
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
   *  单独抽出来，是为了让原「打开图库」能先静默试一次（现由「回到上次」复用）：拿到了就用（零交互），
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
  // 思路（2026-10-27 参照 Win64 版实测重写，旧版是「预载低清 + 切图再解全清」）：
  //   · 后台把当前位置「前后各 20 张」按**可直接显示的清晰度**解码并缓存（preloadEdge()）；
  //   · 切到某张时命中缓存 → **立刻上主视图，不再解码**；
  //     只有放大到缓存档位不够时才停手 250ms 补一张全清（连续翻页会被下一切图作废）。
  //   · 未命中 → 768 低清占位（只是不空白）+ 立刻解可显示清晰度。
  //   · 窗口**跟着当前位置滑动且环绕**（evictOutside / inWindow）：
  //     翻到哪缓存哪附近，跨首尾也不重解；翻一整个大图库内存不会一路涨上去。
  //   · 档位不能按原图分辨率预载（几十张就是几个 GB），故夹在 [1024, 1536]。
  //
  //  ⚠️ 旧版把预载定为 768px「仅供模糊占位」，于是每张命中缓存的图都还要再解一次
  //  「画布长边×2」的全清 —— 大图那一次能解到 1 秒以上，切图卡顿就是这么来的。
  // ------------------------------------------------------------------

  /** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
   *  edge = QUICK_EDGE(768) 得到低清占位；edge = preloadEdge() 得到「可显示清晰度」的预载；
   *  edge = viewEdge() 得到放大时用的全清图。三种场景共用同一套系统 codec。 */
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
      // 正在显示的不能淘汰：主视图 / 过渡层 / 对开右页，release 掉会让画面变黑/花屏
      if (old.px === this.viewPixelMap || old.px === this.lowPixelMap || old.px === this.rightPixelMap) {
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
    this.syncCacheStat();
  }

  /** 把缓存账目同步给右下角角标。改动落在三处口子上：pushPreview / evictOutside / clearPreviews。 */
  private syncCacheStat(): void {
    this.cacheCount = this.previews.length;
    this.cacheBytes = this.preloadBytes;
  }

  /** 释放「窗口外」的缓存 —— 让缓存真正跟着位置滑动。
   *  只靠 LRU 容量淘汰的话，跳转（回到上次 / 点列表跳很远）之后，远处那一批旧图还会赖着，
   *  把新窗口的位置挤掉；这里按位置主动清掉，翻多远内存都稳定在窗口大小。 */
  private evictOutside(): void {
    if (this.cur < 0) {
      return;
    }
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const e: PreviewEntry = this.previews[i];
      if (this.inWindow(e.uri)) {
        continue;
      }
      // 正在显示 / 正在做过渡 / 对开右页的那张不能 release，否则画面变黑或花屏
      if (e.px === this.viewPixelMap || e.px === this.lowPixelMap || e.px === this.rightPixelMap) {
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
    this.syncCacheStat();
  }

  /** uri 是否落在「当前位置前后各 PRELOAD_BACK / PRELOAD_FWD 张」这个窗口里。
   *
   *  ⚠️ 窗口是**环绕**的（Win64 版 10-27 提交 8cde542）：go() 本来就按模运算循环，
   *  翻过最后一张就回到第一张，缓存窗口若还按线性截断，每次跨过首尾都要重新解码一批图 ——
   *  绕回第一张时会明显卡一下。图库比窗口小时取 min(span, n-1)，避免绕整圈重复。 */
  private inWindow(uri: string): boolean {
    const n: number = this.items.length;
    if (n === 0 || this.cur < 0) {
      return false;
    }
    const back: number = Math.min(PRELOAD_BACK, n - 1);
    const fwd: number = Math.min(PRELOAD_FWD, n - 1);
    for (let k: number = -back; k <= fwd; k++) {
      const i: number = ((this.cur + k) % n + n) % n;
      if (this.items[i].uri === uri) {
        return true;
      }
    }
    return false;
  }

  /** 环绕取第 cur+k 张的下标（k 可负、可越界） */
  private wrapIndex(k: number): number {
    const n: number = this.items.length;
    return ((this.cur + k) % n + n) % n;
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
    this.syncCacheStat();
    // 缓存被清空后，当前显示的若正是缓存里的那张，就不能再指向它
    this.viewPixelMap = undefined;
    this.releaseViewOwned();
    // 对开右页也可能正指着缓存里那张：上面已把整批 px release，
    // 必须把引用一并撤掉，否则右页会留下一块已释放的 PixelMap（花屏 / 黑块）。
    this.rightToken++;        // 作废在途的右页解码回调，别让它把旧图盖回来
    this.rightPixelMap = undefined;
    this.releaseRightOwned(); // 自解码的右页不进缓存，单独释放
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
   *  依然是「代号校验」那一套：任何迟到的回调都盖不到新图上，不会串图、不会残留。
   *
   *  对开右页刻意不在这里清：所有改变 cur 的路径（select / go / applyItems / 目录重扫）
   *  都在本函数之后紧跟 refreshSpread() 同步重算右页，ArkUI 状态批量在下一帧生效，
   *  不会出现「上一对右页残留一帧」。而 onAreaChange 只是进出全屏后按新尺寸重解大图，
   *  cur 没变，若在这里清右页反而会把好端端的右页抹掉。 */
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
      // ① 命中缓存 → 那张已经是「可显示清晰度」，直接上主视图，不等解码（翻页快的关键）
      this.showDecoded(hit);
      const need: number = this.showNeed(hit);
      // ② 档位不够（多半是放大了）才停手后补一张全清；够就不必再解
      //    ——早先不管够不够都解一次全清，每张多花几百毫秒，切图卡顿就是这么来的
      if (need <= 0 || hit.edge < need) {
        this.loadView(uri, token, UPGRADE_DELAY_MS);
      }
    } else {
      // ③ 未命中 → 768 低清占位（避免空白）+ 立刻解可显示清晰度
      this.clearBlur();
      this.loadQuick(uri, token);
      this.loadView(uri, token, 0);
    }
  }

  /** 把一张已解码的图放上主视图（预载命中走这里）。
   *
   *  注意所有权：这张 PixelMap 归缓存所有，不能交给 viewOwned（那是「自己解的、要自己 release」）；
   *  缓存侧已有保护（pushPreview / evictOutside 都不会淘汰正被显示的这张），不会花屏。 */
  private showDecoded(e: PreviewEntry): void {
    this.noteShown(e.uri); // 画面已经出来了 → 这张算「成功显示过」
    this.viewPixelMap = e.px;
    this.imgW = e.w;
    this.imgH = e.h;
    this.clearBlur();      // FOCUS_BLUR 关掉后不再有过渡层，这里只是把状态归零
  }

  /** 这张图按当前 zoom 实际要占多少像素（长边），再留 5% 余量。
   *  用来判断「缓存里这张够不够看」，够就不必再解全清。
   *  原图本身就小于需求时按原图长边算 —— 再解也不会更清楚。 */
  private showNeed(e: PreviewEntry): number {
    const canvasLong: number = Math.max(this.canvasW, this.canvasH);
    const long: number = Math.max(e.w, e.h);
    if (canvasLong <= 0 || long <= 0) {
      return 0;
    }
    const z: number = this.zoom > 0 ? this.zoom : 1;
    const need: number = Math.ceil(canvasLong * z * 1.05);
    return Math.min(need, long);
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
    const q: PreviewEntry | undefined = await this.decodeTo(uri, QUICK_EDGE);
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
    // 清晰图还没就绪 → 先把它放上去（同一张图，只是分辨率低）
    if (this.viewPixelMap === undefined) {
      if (FOCUS_BLUR) {
        this.startFocus(q);
      } else {
        this.showDecoded(q); // 不做动画：直接顶上，瞬时替换
      }
    }
    this.pushPreview(q);
  }

  /** 主视图解码：按画布尺寸决定目标分辨率，解码完成后校验代号再替换。
   *  delay > 0 时先等一会儿再解 —— 连续翻页时这次解码会被下一切图作废，
   *  延迟执行能省掉大量「解完就丢」的无效工作（Win64 版 UpgradeDelayMs 同思路）。 */
  private loadView(uri: string, token: number, delay: number): void {
    if (delay > 0) {
      setTimeout(() => {
        this.loadViewNow(uri, token);
      }, delay);
      return;
    }
    this.loadViewNow(uri, token);
  }

  private async loadViewNow(uri: string, token: number): Promise<void> {
    if (token !== this.curToken) {
      return; // 排队期间又切了图 → 这次升级没必要了
    }
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
      if (FOCUS_BLUR) {
        this.finishFocus(); // 兜底图由系统解码，过渡层照常淡出
      } else {
        this.clearBlur();
      }
      return;
    }
    this.noteShown(uri); // 清晰图到位 → 这张确实显示成功，下次启动预热它
    this.releaseViewOwned();
    this.viewOwned = ret.px;
    this.viewPixelMap = ret.px;
    this.imgW = ret.w;
    this.imgH = ret.h;
    if (FOCUS_BLUR) {
      this.finishFocus(); // 清晰图到位 → 低清模糊层淡出（这才是「动态模糊」的收尾）
    } else {
      this.clearBlur();
    }
  }

  /** 主视图解码的长边：画布长边 × VIEW_EDGE_FACTOR，并夹在 [1200, 4096] 内控制内存。
   *  系数从 2 降到 1.5：×2 时一张大图能解 1 秒多，而屏幕实际只需要约 1 倍像素。 */
  private viewEdge(): number {
    const base: number = Math.max(this.canvasW, this.canvasH);
    const e: number = Math.round(base * VIEW_EDGE_FACTOR);
    return Math.max(VIEW_EDGE_MIN, Math.min(VIEW_EDGE_MAX, e));
  }

  /** 预载档位：按画布尺寸动态取，向上量化到 PRELOAD_QUANT 的倍数。
   *
   *  ⚠️ 必须是 ceil 不是 floor：向下量化会让档位小于屏幕实际要显示的像素，
   *  于是每张命中缓存的图都还要再解一次全清 —— 那正是切图卡顿的真正来源。
   *  缓存存的是「可直接显示」的清晰度，命中即上屏（见 showPreviewOf）。 */
  private preloadEdge(): number {
    const base: number = Math.max(this.canvasW, this.canvasH);
    if (base <= 0) {
      return PRELOAD_MIN_EDGE;
    }
    const v: number = Math.ceil(base * PRELOAD_EDGE_FACTOR / PRELOAD_QUANT) * PRELOAD_QUANT;
    return Math.max(PRELOAD_MIN_EDGE, Math.min(PRELOAD_MAX_EDGE, Math.round(v)));
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
    const n: number = this.items.length;
    let target: string = '';
    // 窗口环绕：末尾的「前方」绕回开头，与 go() 的模运算一致（否则跨首尾要重解一批）
    const fwdSpan: number = Math.min(PRELOAD_FWD, n - 1);
    const backSpan: number = Math.min(PRELOAD_BACK, n - 1);
    // 先补「前方」（主要浏览方向）
    for (let k = 1; k <= fwdSpan; k++) {
      const u: string = this.items[this.wrapIndex(k)].uri;
      if (this.previewEntry(u) === undefined && !this.failed.has(u)) {
        target = u;
        break;
      }
    }
    // 再补「后方」：否则快速往回滚时一张都命中不了缓存，退化成全靠原图解码
    if (target.length === 0) {
      for (let k = 1; k <= backSpan; k++) {
        const u: string = this.items[this.wrapIndex(-k)].uri;
        if (this.previewEntry(u) === undefined && !this.failed.has(u)) {
          target = u;
          break;
        }
      }
    }
    if (target.length === 0) {
      this.preloadBusy = false; // 窗口内都预载好了
      // 窗口理论容量 = 前 span + 后 span + 当前张；不足说明有图解不开，或被字节上限挤掉。
      const want: number = Math.min(n, fwdSpan + backSpan + 1);
      hilog.info(DOMAIN, TAG,
        'preload: window full, cached %{public}d/%{public}d, %{public}d MB, failed=%{public}d, tick %{public}d',
        this.previews.length, want, Math.round(this.preloadBytes / (1024 * 1024)), this.failed.size, this.probeTick);
      if (this.previews.length < want && this.previews.length > 0) {
        hilog.warn(DOMAIN, TAG, 'preload: window NOT full — 多为坏图黑名单，或 PRELOAD_MAX_BYTES 上限挤出');
      }
      return;
    }
    this.probeTick++;
    if (this.probeTick % 20 === 0) {
      hilog.info(DOMAIN, TAG, 'preload: tick %{public}d, target=%{public}s', this.probeTick, target);
    }
    this.decodeTo(target, this.preloadEdge())
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
  /** 当前对开的右页下标（-1 = 单页）。必须是 @State：探测到竖图后才重算，要驱动 UI 重建。 */
  @State spreadB: number = -1;
  /** 竖图探测缓存：uri → 是否竖图。只读元数据，不解像素（Win64 ProbeOf 的对应物）。 */
  private probeCache: Map<string, boolean> = new Map<string, boolean>();
  private spreadSeq: number = 0;

  /** 读回当前对开右页。pageLabel / UI 都从这里取，保证与 @State 一致。 */
  private spreadRight(): number {
    return this.spreadB;
  }

  /** 重算对开配对（Win64 PairFor / bd5c73a）：
   *  「点到 / 翻到哪张，哪张就在左边」—— 固定按 [0,1][2,3] 分组会让第 2 张永远选不中，
   *  所以以当前落点为基准，下一张同为竖图才并排。翻页步长恒为一格（go(±1)）。 */
  private refreshSpread(): void {
    if (!SPREAD_PORTRAIT || this.items.length === 0 || this.cur < 0) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
    const seq: number = ++this.spreadSeq;
    const self: string = this.items[this.cur].uri;
    const next: number = this.cur + 1;
    if (next >= this.items.length || !this.isPortrait(self)) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
    const b: string = this.items[next].uri;
    const known: boolean | undefined = this.probeCache.get(b);
    if (known === undefined) {
      // 还没探到 → 先单页，后台探测完成后再重算（不阻塞切图）
      this.spreadB = -1;
      this.clearRightPage();
      this.probeOne(b, seq);
      return;
    }
    if (!known) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
    this.spreadB = next;
    this.loadRightPage(b);
  }

  /** 是否竖图：优先查缓存，再查已解码的预载缓存，都没有才异步探元数据。 */
  private isPortrait(uri: string): boolean {
    const hit: boolean | undefined = this.probeCache.get(uri);
    if (hit !== undefined) {
      return hit;
    }
    const e: PreviewEntry | undefined = this.previewEntry(uri);
    if (e !== undefined && e.w > 0 && e.h > 0) {
      const v: boolean = e.h > e.w;
      this.probeCache.set(uri, v);
      return v;
    }
    this.probeOne(uri, this.spreadSeq);
    return false; // 探测回来后由 refreshSpread 重算
  }

  /** 异步探一张图的原始宽高（只读 ImageInfo，不解码像素），结果进缓存并触发一次重算。 */
  private probeOne(uri: string, seq: number): void {
    if (this.probeCache.has(uri)) {
      return;
    }
    try {
      const src: image.ImageSource = image.createImageSource(uri);
      src.getImageInfo(0)
        .then((info: image.ImageInfo) => {
          const portrait: boolean = info.size.height > info.size.width;
          this.probeCache.set(uri, portrait);
          try {
            src.release();
          } catch (e) {
            // ignore
          }
          if (seq === this.spreadSeq) {
            this.refreshSpread();
          }
        })
        .catch(() => {
          this.probeCache.set(uri, false);
          try {
            src.release();
          } catch (e) {
            // ignore
          }
          if (seq === this.spreadSeq) {
            this.refreshSpread();
          }
        });
    } catch (e) {
      this.probeCache.set(uri, false);
    }
  }

  // ------------------------------------------------------------------
  // 目录浏览（Win64 文件浏览器在鸿蒙上的变形实现）
  // ------------------------------------------------------------------

  /** 「选择文件夹」：DocumentViewPicker 的 FOLDER 模式（API 11+ / 2in1 可用）。 */
  /** 目录 URI 授权不覆盖子项时的兜底：开一个以该目录为起点的文件多选选择器。
   *  每个被选中的文件都会单独拿到 URI 授权，解码一定成功（= 「选择图片」那条通道）。 */
  private chooseFilesInDir(dirUri: string): void {
    try {
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        this.status = '无法获取应用上下文';
        return;
      }
      const dv = new picker.DocumentViewPicker(ctx);
      const opt = new picker.DocumentSelectOptions();
      opt.maxSelectNumber = PICKER_MAX;
      opt.fileSuffixFilters = FILE_FILTERS;
      opt.defaultFilePathUri = dirUri;
      dv.select(opt)
        .then((uris: Array<string>) => {
          if (!uris || uris.length === 0) {
            this.status = '已取消多选（可点左栏「选择文件夹」重试）';
            return;
          }
          hilog.info(DOMAIN, TAG, 'folder fallback picked %{public}d files', uris.length);
          this.setItems(uris, baseName(dirUri) + '（多选）');
          this.pickRootUri = dirUri; // 目录态被 setItems 清了，记住原始目录供「回上层」用
        })
        .catch((e: Object) => {
          this.status = '目录内多选失败：' + JSON.stringify(e);
          hilog.error(DOMAIN, TAG, 'chooseFilesInDir rejected: %{public}s', JSON.stringify(e));
        });
    } catch (e) {
      this.status = '目录内多选不可用：' + JSON.stringify(e);
      hilog.error(DOMAIN, TAG, 'chooseFilesInDir failed: %{public}s', JSON.stringify(e));
    }
  }

  private chooseFolder(): void {
    try {
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        this.status = '无法获取应用上下文';
        return;
      }
      const dv = new picker.DocumentViewPicker(ctx);
      const opt = new picker.DocumentSelectOptions();
      opt.selectMode = picker.DocumentSelectMode.FOLDER;
      opt.maxSelectNumber = 1;
      dv.select(opt)
        .then((uris: Array<string>) => {
          if (!uris || uris.length === 0) {
            this.status = '已取消选择文件夹';
            return;
          }
          hilog.info(DOMAIN, TAG, 'chooseFolder picked uri=%{public}s', uris[0]);
          this.pickRootUri = uris[0];
          this.dirStack = [];
          this.openFolder(uris[0], false);
        })
        .catch((e: Object) => {
          this.status = '选择文件夹失败：' + JSON.stringify(e);
          hilog.error(DOMAIN, TAG, 'chooseFolder rejected: %{public}s', JSON.stringify(e));
        });
    } catch (e) {
      this.status = '选择文件夹不可用：' + JSON.stringify(e);
    }
  }

  /** 列一个目录：构造左栏 rows（.. / 子文件夹 / 灰行 / 图片）与可翻页 items（只含图片）。
   *  push=true 时把当前目录压栈，供「..」回退；重扫（push=false）保持当前张不闪。
   *  ⚠️ 鸿蒙 DocumentViewPicker 授予的是 URI，fs.listFile / statSync 对它不一定有权限；
   *     失败时明确提示，不静默吞掉（Win64 走的是真实文件系统路径）。 */
  /** 返回是否真的进入了目录浏览态（失败时调用方不该改动目录栈）。 */
  /** allowFileFallback：目录能列但子文件读不了时，是否弹「目录内多选」选择器。
   *  「回上层」传 false —— 那种兜底会调 setItems 把目录态清掉，反而让回上层白做。 */
  private async openFolder(dirUri: string, push: boolean, allowFileFallback?: boolean,
    isRescan?: boolean): Promise<boolean> {
    if (this.folderBusy) {
      return false; // 上一批还在列，别叠
    }
    this.folderBusy = true;
    const keepUri: string = this.cur >= 0 ? this.items[this.cur].uri : '';
    try {
      // picker 的 FOLDER 模式返回的 uri 形态不统一，且 URI 授权是**逐项**的：
      // 能 listFile 不代表能读子文件。逐个候选试，优先挑「子文件真能 open」的那个 base。
      const candidates: string[] = dirCandidates(dirUri);
      hilog.info(DOMAIN, TAG, 'openFolder raw=%{public}s candidates=%{public}d',
        dirUri, candidates.length);
      let base: string = '';
      let names: string[] = [];
      let childReadable: boolean = false;
      let fallbackBase: string = '';
      let lastErr: string = '';
      for (let c = 0; c < candidates.length; c++) {
        const cand: string = candidates[c];
        try {
          const n: string[] = await fs.listFile(cand, { recursion: false, listNum: 0 });
          hilog.info(DOMAIN, TAG, 'listFile OK [%{public}d] %{public}s → %{public}d entries',
            c, cand, n.length);
          if (fallbackBase.length === 0) {
            fallbackBase = cand;
            names = n;
          }
          if (n.length > 0 && this.probeChild(cand, n)) {
            base = cand;
            names = n;
            childReadable = true;
            hilog.info(DOMAIN, TAG, 'openFolder using candidate [%{public}d] %{public}s', c, cand);
            break;
          }
        } catch (e) {
          lastErr = JSON.stringify(e);
          hilog.warn(DOMAIN, TAG, 'listFile FAIL [%{public}d] %{public}s → %{public}s',
            c, cand, lastErr);
        }
      }
      if (base.length === 0 && fallbackBase.length > 0) {
        // 目录能列、但子文件一个都打不开：列表照样显示，日志里说清楚是授权问题
        base = fallbackBase;
        hilog.error(DOMAIN, TAG,
          'openFolder: listed but NO child file can be opened (per-item URI authorization). base=%{public}s',
          base);
      }
      if (base.length === 0) {
        this.status = '无法列出该目录 · ' + lastErr + '；可点「选择文件夹」重新选择';
        hilog.error(DOMAIN, TAG, 'openFolder all candidates failed: %{public}s', lastErr);
        return false;
      }
      // 自动重扫：mtime 变了不代表条目变了（hover 缩略图解码会读文件，网盘同步目录
      // 还会写本地缓存）。条目名集合一致就只更新基准值，绝不重建列表 ——
      // 否则 applyItems 的 restoreIndex + scrollToIndex 会把用户视图拉回「上次位置」。
      if (isRescan === true && this.sameDirEntries(names)) {
        this.dirMtime = this.tryMtime(base);
        hilog.info(DOMAIN, TAG, 'rescan: entries unchanged, keep view');
        return true;
      }
      if (names.length > 0) {
        hilog.info(DOMAIN, TAG, 'openFolder base=%{public}s first=%{public}s', base, names[0]);
      }
      // 左栏抬头 / 状态栏统一用的目录名。base 可能是带尾斜杠的文档 URI 或 %XX 编码串，
      // 旧 baseName(base) 会返回空 → Text(this.source) 整条空白（「人像」目录实测）。
      // dirDisplayName 在 base / 原始 uri / 其它候选里挑可读且非空的那个，恒不为空。
      const dirLabel: string = dirDisplayName(base, dirUri, candidates);
      // 拼接 child 前先去掉尾斜杠：base 自带 '/' 时会拼出 '.../人像//xxx'，
      // statSync 认不出来，子目录会被误列成「不支持预览」灰行。
      const joinBase: string = stripTrailingSlash(base);
      hilog.info(DOMAIN, TAG, 'openFolder dirLabel=%{public}s base=%{public}s raw=%{public}s',
        dirLabel, base, dirUri);
      // 屏幕上留一份可截图的诊断快照：版本号用来分辨新旧包，raw/base 用来核对
      // picker 到底给了什么形态（file://docs / %XX / 尾斜杠），dirLabel 是最终显示名。
      // 只在目录浏览态显示，不挤状态栏（状态栏是单行 Ellipsis，末尾会被截掉）。
      this.diagLine = 'v' + APP_VERSION + ' | dir=' + dirLabel +
        ' | raw=' + ellipsizeMiddle(dirUri, 42) +
        ' | base=' + ellipsizeMiddle(base, 42) + ' | hv=3';
      const imgs: ImageItem[] = [];
      const dirs: ImageItem[] = [];
      const others: ImageItem[] = [];
      for (let i = 0; i < names.length; i++) {
        const raw: string = names[i];
        if (raw.length === 0 || (HIDE_DOT_FILES && raw.charAt(0) === '.')) {
          continue;
        }
        // names 里通常只是文件名；某些实现直接给完整路径 / URI，就别再拼一次
        const child: string = raw.indexOf('/') >= 0 ? raw : joinBase + '/' + raw;
        let size: number = -1;
        let mtime: number = 0;
        let isDir: boolean = false;
        let statOk: boolean = false;
        try {
          const st: fs.Stat = fs.statSync(child);
          size = st.size;
          mtime = st.mtime;
          isDir = st.isDirectory();
          statOk = true;
        } catch (e) {
          // 单条 stat 失败不拖垮整批：逐 URI 授权下这是常态，见下方分类
        }
        const shown: string = repairMojibake(raw);
        if (isDir) {
          dirs.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_FOLDER, itemIndex: -1 });
        } else if (isImageName(raw)) {
          imgs.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_IMAGE, itemIndex: -1 });
        } else if (!statOk) {
          // statSync 拿不到（子项没授权）且名字不带图片后缀：「人像」目录下的
          // 「编号202601 模特 猫」这类子文件夹全落在这里。按文件夹列出，
          // 目录表才不会变成一排点不进去的灰行（点名称即可继续进入）。
          dirs.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_FOLDER, itemIndex: -1 });
        } else {
          others.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_OTHER, itemIndex: -1 });
        }
      }
      const cmp = (a: ImageItem, b: ImageItem): number => naturalCompare(a.name, b.name);
      dirs.sort(cmp);
      imgs.sort(cmp);
      others.sort(cmp);
      if (!this.sortAsc) {
        dirs.reverse();
        imgs.reverse();
        others.reverse();
      }
      const rows: ImageItem[] = [];
      rows.push({ uri: '', name: '..', size: -1, mtime: 0, kind: ROW_UP, itemIndex: -1 });
      for (let i = 0; i < dirs.length; i++) {
        rows.push(dirs[i]);
      }
      for (let i = 0; i < imgs.length; i++) {
        imgs[i].itemIndex = i;
        rows.push(imgs[i]);
      }
      for (let i = 0; i < others.length; i++) {
        rows.push(others[i]);
      }
      // 兜底：目录能列、图片也在，但子文件一个都打不开 —— picker 的目录授权是逐 URI 的。
      // ⚠️ 这里**绝不能 return false / 提前退出**：那会让目录表根本不渲染，用户看到一屏空白。
      // 改成先照常建立目录态并列出 rows，末尾再弹「以该目录为起点」的文件多选选择器；
      // 用户取消多选时目录表仍在，全选确认则换成图片列表（两个需求都能满足）。
      const needFileFallback: boolean = imgs.length > 0 && !childReadable && allowFileFallback !== false;
      if (needFileFallback) {
        hilog.warn(DOMAIN, TAG, 'openFolder: will offer multi-select, imgs=%{public}d', imgs.length);
      }
      // 压栈存「真实可列路径」而非原始 uri：回上层时 pop 出来直接能列，
      // 不必再对 file://docs/... 猜形态。这也是「回上层」以前失效的关键。
      if (push && this.browseBase.length > 0 && this.browseBase !== base) {
        this.dirStack.push(this.browseBase);
      }
      this.browseDir = dirUri;
      this.browseBase = base;
      this.dirMtime = this.tryMtime(base);
      this.startDirPoll();
      // 重扫时保持当前张：按 uri 找回落点，不让画面闪一下（Win64 2bcbbb1）
      this.applyItems(imgs, dirLabel, '', rows, isRescan === true);
      if (keepUri.length > 0 && !push) {
        for (let i = 0; i < imgs.length; i++) {
          if (imgs[i].uri === keepUri) {
            this.cur = i;
            this.dataSource.reload(this.rows);
            break;
          }
        }
      }
      this.refreshSpread();
      if (imgs.length === 0) {
        // 全是子文件夹、本层零图片（例如「人像」）：目录表照常列出，
        // 左栏再加一条提示条，别让用户以为又白屏了。
        this.dirHint = '本层没有图片 · ' + dirs.length + ' 个子文件夹（点名称进入）';
        this.status = '目录 ' + dirLabel + '：本层没有图片 · ' + dirs.length +
          ' 个子文件夹（点文件夹进入）· 支持后缀 ' + IMAGE_SUFFIXES.join(' ');
        hilog.warn(DOMAIN, TAG, 'openFolder: 0 images among %{public}d entries, rows=%{public}d',
          names.length, rows.length);
      } else if (!childReadable) {
        this.dirHint = '';
        this.status = '目录 ' + dirLabel + '：' + imgs.length + ' 张（子文件无读取授权，仅列目录）· ' +
          dirs.length + ' 个子文件夹';
      } else {
        this.dirHint = '';
        this.status = '目录 ' + dirLabel + '：' + imgs.length + ' 张可预览 · ' +
          dirs.length + ' 个子文件夹';
      }
      if (needFileFallback) {
        // 目录表已经显示出来了，再弹多选：取消 → 目录表还在；全选 → 换成图片列表
        this.status = '目录 ' + dirLabel + '：子文件无读取授权 · 目录表已列出，另开选择器全选图片可看图';
        this.chooseFilesInDir(dirUri);
      }
      hilog.info(DOMAIN, TAG, 'openFolder done: %{public}d imgs, %{public}d rows, base=%{public}s',
        imgs.length, rows.length, base);
      return true;
    } finally {
      this.folderBusy = false;
    }
  }

  /** 抽查目录里第一张图片能否真的 open —— FOLDER 授权是逐 URI 的，
   *  「能列目录」和「能读子文件」是两回事，这一步用来挑出真正可用的 base。 */
  private probeChild(base: string, names: string[]): boolean {
    let tried: number = 0;
    for (let i = 0; i < names.length && i < 12; i++) {
      const n: string = names[i];
      if (n.length === 0 || n.charAt(0) === '.' || !isImageName(n)) {
        continue;
      }
      const child: string = n.indexOf('/') >= 0 ? n : stripTrailingSlash(base) + '/' + n;
      try {
        const f: fs.File = fs.openSync(child, fs.OpenMode.READ_ONLY);
        fs.closeSync(f);
        return true;
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'probeChild FAIL %{public}s → %{public}s', child, JSON.stringify(e));
        // 别一张坏图就判死刑：连试 3 张都打不开才认定这个 base 不可用
        tried++;
        if (tried >= 3) {
          return false;
        }
      }
    }
    return false;
  }

  private tryMtime(uri: string): number {
    try {
      return fs.statSync(uri).mtime;
    } catch (e) {
      return 0;
    }
  }

  /** 目录条目名集合是否没变。mtime 抖动（hover 解码读文件 / 网盘同步写缓存）
   *  不该触发列表重建；只有真正增删 / 改名才需要重扫。rows[0] 是「..」行，不计入。 */
  private sameDirEntries(names: string[]): boolean {
    const want: string[] = [];
    for (let i = 0; i < names.length; i++) {
      const raw: string = names[i];
      if (raw.length === 0 || (HIDE_DOT_FILES && raw.charAt(0) === '.')) {
        continue;
      }
      want.push(repairMojibake(raw));
    }
    const cur: string[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      if ((r.kind ?? ROW_IMAGE) === ROW_UP) {
        continue;
      }
      cur.push(r.name);
    }
    return sameEntryNames(want, cur);
  }

  /** SDK 26 没有 fileObserver，只能定时比对目录 mtime。变化后去抖重扫，
   *  且只在「用户没在翻页」时动手，避免和切图抢主线程。 */
  private startDirPoll(): void {
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
    }
    this.dirPollTimer = setInterval(() => {
      if (this.browseBase.length === 0 || this.folderBusy || this.playing) {
        return;
      }
      const m: number = this.tryMtime(this.browseBase);
      if (m > 0 && this.dirMtime > 0 && m !== this.dirMtime) {
        this.dirMtime = m;
        if (this.rescanTimer !== -1) {
          clearTimeout(this.rescanTimer);
        }
        this.rescanTimer = setTimeout(() => {
          this.rescanTimer = -1;
          // 第 4 参 true = 自动重扫：内容没变就跳过，内容变了也保持当前视图，
          // 绝不把用户拉回「上次位置」。第 3 参 false = 重扫不弹文件多选。
          this.openFolder(this.browseBase, false, false, true);
        }, DIR_RESCAN_DEBOUNCE_MS);
      }
    }, DIR_POLL_MS);
  }

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
          this.pickRootUri = ''; // 「选择图片」是新的文件源，脱离上次目录上下文
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
      // 11-10 起左下角 4×2 共 8 个视图按钮已按用户要求取消，对应分支一并移除。
      // zoomBy / resetView / zoomPixelPerfect / rotateBy / toggleFlipH / toggleFlipV
      // 仍由键盘、滚轮、鼠标键直接调用（不经过 doAction），功能没有删。
      case 'prev':
        this.go(-1);
        break;
      case 'next':
        this.go(1);
        break;
      case 'play':
        this.toggleSlide();
        break;
      // 11-10 起「选择图片」按钮取消，'files' 分支一并移除；
      // openFiles() 本体保留，仍被 openPicker() 的内部降级链调用。
      case 'folder':
        this.chooseFolder();
        break;
      case 'up':
        this.browseUp();
        break;
      case 'sort':
        this.sortAsc = !this.sortAsc;
        this.status = '排序：' + (this.sortAsc ? '升序 ↑' : '降序 ↓');
        if (this.browseBase.length > 0) {
          this.openFolder(this.browseBase, false);
        } else {
          const copy: ImageItem[] = this.items.slice();
          copy.sort((a: ImageItem, b: ImageItem) => naturalCompare(a.name, b.name));
          if (!this.sortAsc) {
            copy.reverse();
          }
          for (let i = 0; i < copy.length; i++) {
            copy[i].itemIndex = i;
          }
          this.rows = copy;
          this.dataSource.reload(this.rows);
        }
        break;
      case 'collapse':
        this.listCollapsed = !this.listCollapsed;
        break;
      // 11-10 起「回到上次」按钮取消，'resume' 分支一并移除；
      // resumeLast() / loadAllGallery() 本体保留（启动自动恢复与内部降级仍复用）。
      case 'full':
        this.toggleFull();
        break;
      default:
        break;
    }
  }

  /** 回上层目录（Win64 77f7b6b）。
   *
   *  2026-11-10 现场：`人像/编号202601 模特 猫/` 点「回上层」完全没反应。两个叠加原因：
   *   ① 旧 dirOf() 不去尾斜杠，picker 给的目录标识常带 `/`，算出来的「父级」其实是
   *      自己，openFolder 又列了一遍同一个目录 —— 界面看起来原地不动；
   *   ② picker 的授权是逐 URI 的，祖先目录（人像）常常没授权，单一候选列不出来。
   *
   *  现在用 parentDirCandidates() 生成「URI 父 / 解码父 / 真实路径父」逐个试，
   *  命中哪个用哪个；全部失败才拉起定位到父目录的 FOLDER picker 补授权。
   *  进过子目录时仍优先 pop dirStack，且成功之后才 pop（失败可重试）。 */
  private async browseUp(): Promise<void> {
    if (this.folderBusy) {
      this.status = '回上层：上一批目录还在列，稍候再点';
      return;
    }
    // 三种锚点都拿来推父目录：browseBase 是实测能列的路径，browseDir 保留 picker
    // 原始 scheme，pickRootUri 在目录态被「目录内多选」清掉后仍记得最初选的目录。
    const anchors: string[] = [];
    const seenAnchor: Set<string> = new Set<string>();
    const addAnchor = (s: string): void => {
      if (s.length > 0 && !seenAnchor.has(s)) {
        seenAnchor.add(s);
        anchors.push(s);
      }
    };
    addAnchor(this.browseBase);
    addAnchor(this.browseDir);
    addAnchor(this.pickRootUri);
    // 一点就把状态写进右下角诊断串：点一下有没有反应、跑的是不是新代码，
    // 截图即可判断（历史上多次「改了没生效」最后都是装了旧包）。
    this.diagLine = 'up START | v' + APP_VERSION + ' | anchors=' + anchors.length +
      ' | base=' + ellipsizeMiddle(this.browseBase, 30) +
      ' | raw=' + ellipsizeMiddle(this.browseDir, 30);
    if (anchors.length === 0) {
      this.status = '当前是文件选择结果，没有上层目录（用「选择文件夹」进入目录浏览）';
      this.diagLine = 'up | no anchor（非目录浏览态）| v' + APP_VERSION;
      return;
    }
    const primary: string = anchors[0];
    const norm = (s: string): string => stripTrailingSlash(s);
    const fromStack: boolean = this.dirStack.length > 0;
    const parents: string[] = [];
    const seenParent: Set<string> = new Set<string>();
    const addParent = (s: string): void => {
      if (s.length > 0 && !seenParent.has(s)) {
        seenParent.add(s);
        parents.push(s);
      }
    };
    if (fromStack) {
      addParent(this.dirStack[this.dirStack.length - 1]); // 进过子目录：栈里的真实路径最可靠
    }
    for (let a = 0; a < anchors.length; a++) {
      const cands: string[] = parentDirCandidates(anchors[a]);
      for (let j = 0; j < cands.length; j++) {
        const p: string = cands[j];
        if (norm(p) !== norm(anchors[a])) {
          addParent(p); // 过滤尾斜杠造成的「假父级 = 自己」
        }
      }
    }
    this.diagLine = 'up | ' + parents.length + ' cands | target=' +
      (parents.length > 0 ? baseName(parents[0]) : '?') +
      ' | stack=' + (fromStack ? '1' : '0') + ' | v' + APP_VERSION;
    let tried: number = 0;
    let lastTried: string = '';
    for (let i = 0; i < parents.length; i++) {
      const parent: string = parents[i];
      if (parent.length === 0 || norm(parent) === norm(primary)) {
        continue; // 已到最上层 / 尾斜杠造成的「假父级」= 自己
      }
      tried++;
      lastTried = parent;
      hilog.info(DOMAIN, TAG, 'browseUp try %{public}s → %{public}s (cand %{public}d/%{public}d)',
        primary, parent, i + 1, parents.length);
      this.status = '回上层 ' + (i + 1) + '/' + parents.length + ' → ' + baseName(parent);
      // openFolder 失败不会覆盖 diagLine，成功会换成新目录的诊断串 —— 正好当进度/结果看
      this.diagLine = 'up ' + (i + 1) + '/' + parents.length + ' | try=' +
        ellipsizeMiddle(parent, 46) + ' | 失败原因见状态栏';
      // 第三参 false：不再弹「目录内多选」，否则 setItems 会把刚进去的目录态清掉
      const ok: boolean = await this.openFolder(parent, false, false);
      if (ok) {
        if (fromStack) {
          this.dirStack.pop();
        }
        // 已经真正进入上层目录，旧的「最初选择」锚点作废 —— 否则连续回上层时
        // 它算出来的父级会指回刚离开的目录，造成「又退回去」的假象。
        this.pickRootUri = '';
        hilog.info(DOMAIN, TAG, 'browseUp OK → %{public}s', this.browseBase);
        return;
      }
    }
    if (tried === 0) {
      this.status = '已经是最上层目录 · 可用「选择文件夹」换一个目录';
      this.diagLine = 'up | no valid parent（候选全等于自身）| v' + APP_VERSION;
      return;
    }
    const targetName: string = baseName(lastTried);
    this.status = '回上层失败：上级「' + targetName + '」无读取授权 · 已打开目录选择器，请进到「' +
      targetName + '」确认一次';
    this.diagLine = 'up FAIL | ' + tried + '/' + parents.length +
      ' cands all denied | target=' + targetName + ' | need picker auth | v' + APP_VERSION;
    hilog.warn(DOMAIN, TAG, 'browseUp all parents failed, anchor=%{public}s', primary);
    // 逐 URI 授权模型下，祖先目录没授权时唯一可靠的补权方式：让用户确认一次。
    this.chooseFolderAt(targetName);
  }

  /** 回上层时祖先目录没有 URI 授权：拉起 FOLDER picker 补授权。
   *
   *  ⚠️ 关键修正（2026-11-10 第二次）：`defaultFilePathUri` 必须是**已授权且带 scheme** 的 URI。
   *  旧版把 parents[0] 传进来，而它常是纯文件系统路径 `/storage/.../人像`，或是压根没授权
   *  的父 URI —— DocumentViewPicker 会直接 reject / 忽略定位，兜底选择器等于没弹，
   *  用户看到的就是「回上层仍然失败」。
   *  现在改用**当前目录**的 picker 原始 uri 作起点（一定已授权）：picker 打开就停在当前层，
   *  用户点一次「上层」进到目标目录再确认，即可拿到授权并真正进入。 */
  private chooseFolderAt(targetName: string): void {
    try {
      const ctx: common.Context | undefined = this.getUIContext().getHostContext();
      if (!ctx) {
        this.status = '无法获取应用上下文';
        return;
      }
      const start: string = pickerStartOf(this.browseDir, this.pickRootUri);
      const dv = new picker.DocumentViewPicker(ctx);
      const opt = new picker.DocumentSelectOptions();
      opt.selectMode = picker.DocumentSelectMode.FOLDER;
      opt.maxSelectNumber = 1;
      if (start.length > 0) {
        opt.defaultFilePathUri = start;  // 已授权，picker 一定能打开并停在当前目录
      }
      this.status = '请在选择器里点「上层」进入「' + targetName + '」并确认 · 用于补该目录读取授权';
      hilog.info(DOMAIN, TAG, 'chooseFolderAt start=%{public}s target=%{public}s', start, targetName);
      const handle = (uris: Array<string>): void => {
        if (!uris || uris.length === 0) {
          this.status = '已取消（仍停在原目录）· 「回上层」需要一次目录授权';
          return;
        }
        // 用户可能直接点了「确定」而没进上层：那还是当前目录，别再列一遍造成「没反应」
        const pickedName: string = baseName(uris[0]);
        const curName: string = baseName(this.browseBase.length > 0 ? this.browseBase : this.browseDir);
        if (pickedName.length > 0 && pickedName === curName) {
          this.status = '选中的还是「' + pickedName + '」· 请在选择器里点「上层」进到「' +
            targetName + '」再确认';
          hilog.warn(DOMAIN, TAG, 'chooseFolderAt picked current dir again: %{public}s', uris[0]);
          return;
        }
        this.pickRootUri = uris[0];
        this.dirStack = [];
        this.openFolder(uris[0], false, false).then((ok: boolean) => {
          if (!ok) {
            this.status = '已选择「' + pickedName + '」但列目录失败 · 可再点「选择文件夹」重试';
          }
        });
      };
      dv.select(opt)
        .then((uris: Array<string>) => { handle(uris); })
        .catch((e: Object) => {
          hilog.warn(DOMAIN, TAG, 'chooseFolderAt with start rejected: %{public}s', JSON.stringify(e));
          if (start.length > 0) {
            // FOLDER 模式下 defaultFilePathUri 未必被接受：去掉起点再试一次，
            // 至少保证选择器能弹出来，用户手动导航到目标目录即可。
            const retry = new picker.DocumentSelectOptions();
            retry.selectMode = picker.DocumentSelectMode.FOLDER;
            retry.maxSelectNumber = 1;
            this.status = '起点定位不被支持 · 已重开选择器，请手动进到「' + targetName + '」确认';
            dv.select(retry)
              .then((uris: Array<string>) => { handle(uris); })
              .catch((e2: Object) => {
                this.status = '回上层授权失败：' + JSON.stringify(e2) + ' · 可点「选择文件夹」手动选上级目录';
                hilog.error(DOMAIN, TAG, 'chooseFolderAt retry rejected: %{public}s', JSON.stringify(e2));
              });
          } else {
            this.status = '回上层授权失败：' + JSON.stringify(e) + ' · 可点「选择文件夹」手动选上级目录';
            hilog.error(DOMAIN, TAG, 'chooseFolderAt rejected: %{public}s', JSON.stringify(e));
          }
        });
    } catch (e) {
      this.status = '回上层授权不可用：' + JSON.stringify(e);
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
    // 进全屏顶栏立即收起，只有鼠标贴到窗口顶端才浮出；退全屏恢复常驻并撤掉兜底计时
    this.clearTopbarTimer();
    this.topbarVisible = !on;
    this.status = on ? '全屏模式 · 鼠标移到顶端唤出顶栏 · Esc 退出全屏' : '已退出全屏 · Esc 关闭应用';
    this.applyWindowFullScreen(on); // 连系统状态栏 / 导航栏一起处理（失败静默降级）
  }

  /** 根容器收到鼠标移动：只有全屏态才需要判断顶栏浮出。
   *  y 是相对根 Stack 的坐标；非全屏时顶栏常驻，不必算。 */
  private onRootMouse(event: MouseEvent): void {
    if (!this.fullscreen) {
      return;
    }
    const y: number = Number(event.y);
    if (y !== y) { // NaN：某些机型 MouseEvent 不给坐标，直接忽略
      return;
    }
    // Win64 TopBarShouldShow：贴顶端才唤出，顶栏内 + 下方 8px 保持
    const show: boolean = y <= TOPBAR_EDGE_PX + TOPBAR_H + TOPBAR_KEEP_PX;
    if (show !== this.topbarVisible) {
      this.topbarVisible = show;
    }
    this.armTopbarTimer();
  }

  /** 每次鼠标移动都重挂计时器：只有「停在顶栏上不动」才会到点收起。
   *  这是为了补鸿蒙没有 onMouseLeaveWindow 的缺口。 */
  private armTopbarTimer(): void {
    if (this.topbarTimer !== -1) {
      clearTimeout(this.topbarTimer);
      this.topbarTimer = -1;
    }
    if (!this.fullscreen || !this.topbarVisible) {
      return;
    }
    this.topbarTimer = setTimeout(() => {
      this.topbarTimer = -1;
      this.topbarVisible = false;
    }, TOPBAR_HIDE_MS);
  }

  private clearTopbarTimer(): void {
    if (this.topbarTimer !== -1) {
      clearTimeout(this.topbarTimer);
      this.topbarTimer = -1;
    }
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
    const down: boolean = (event.type === KeyType.Down);
    // 单独跟踪 Ctrl / Shift 键值：供 Ctrl+滚轮缩放、Ctrl+B 收栏、Shift+R/H/V 使用
    if (code === KeyCode.KEYCODE_CTRL_LEFT || code === KeyCode.KEYCODE_CTRL_RIGHT) {
      this.ctrlDown = down;
      return;
    }
    if (code === KeyCode.KEYCODE_SHIFT_LEFT || code === KeyCode.KEYCODE_SHIFT_RIGHT) {
      this.shiftDown = down;
      return;
    }
    if (!down) {
      return;
    }
    // Ctrl+B：收起 / 展开左栏（Win64 c38318f）。必须放在通用分支之前，避免 B 被吞掉。
    if (this.ctrlDown && code === KeyCode.KEYCODE_B) {
      this.listCollapsed = !this.listCollapsed;
      this.status = this.listCollapsed ? '已收起左栏（Ctrl+B 展开）' : '已展开左栏';
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
        // Win64 a1d7bca：R 右旋、Shift+R 左旋
        this.rotateBy(this.shiftDown ? -90 : 90);
        break;
      case KeyCode.KEYCODE_H:
        if (this.shiftDown) {
          this.toggleFlipH();
        }
        break;
      case KeyCode.KEYCODE_V:
        if (this.shiftDown) {
          this.toggleFlipV();
        }
        break;
      case KeyCode.KEYCODE_F:
        this.zoomPixelPerfect();
        break;
      case KeyCode.KEYCODE_0:
        this.resetView();
        this.status = '已复位视图';
        break;
      case KeyCode.KEYCODE_DEL:
      case KeyCode.KEYCODE_BACK:
        // 退格 = 回上层目录（Win64 77f7b6b）；不在目录浏览态时给一句提示
        this.browseUp();
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
  previewImage(uri: string, token: number, w: number) {
    Stack() {
      if (this.viewPixelMap !== undefined) {
        Image(this.viewPixelMap!)          // 自解码结果：清晰，且一定是当前这张
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .draggable(false)
          .width(w)
          .height(this.frameH())
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
      } else if (this.viewFailed) {
        // 兜底：**只有自解码确认失败**才交给系统解码。
        // 不能在解码期间就画 Image(uri) —— 那正是「上一张还留在屏幕上」的来源。
        Image(uri)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .draggable(false)
          .width(w)
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
          .width(w)
          .height(this.frameH())
          .scale({
            x: this.zoom * (this.flipH ? -1 : 1) * this.focusZoom(),
            y: this.zoom * (this.flipV ? -1 : 1) * this.focusZoom()
          })
          .blur(this.blurRadius)
          .opacity(this.lowOpacity)
      }
    }
    .width(w)
    .height(this.frameH())
  }

  /** 对开右页：优先用命中缓存的 PixelMap；未就绪时留中灰占位，不阻塞左页。
   *  刻意不用 Image(uri) 兜底 —— 那会让系统按原图尺寸再解一遍大图（HEIC 尤其慢），
   *  与左页「解码期间不画原图」是同一条约束（见 previewImage 的 viewFailed 分支）。 */
  @Builder
  rightPageImage(uri: string, w: number) {
    Stack() {
      if (this.rightPixelMap !== undefined) {
        Image(this.rightPixelMap!)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .draggable(false)
          .width(w)
          .height(this.frameH())
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
      } else {
        // 右页还在解码：只占住这一半画布，不触发任何原图解码。
        // 底色与主预览区一致，视觉上就是「这一页还没到」，不会有上一对的残影。
        Column()
          .width(w)
          .height(this.frameH())
          .backgroundColor(CANVAS_BG)
      }
    }
    .width(w)
    .height(this.frameH())
  }

  // ------------------------------------------------------------------
  // 主构建
  // ------------------------------------------------------------------

  /** 顶栏：非全屏时常驻；全屏时由 Stack 以绝对定位浮层复用同一份 Builder（见 build）。
   *  11-10 起「打开图库」「选择图片」「回到上次」三个按钮均已按用户要求取消，
   *  顶栏只剩「全屏 / 幻灯片」，其余按钮与事件保持不变。 */
  @Builder
  topBar() {
    Row() {
      Text('PIKAN ' + APP_VERSION)
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor('#f2f5fa')
      Text('·')
        .fontSize(14)
        .fontColor('#4a5262')
        .margin({ left: 8, right: 8 })
      // Win64 07c1eee / 3f92173：完整路径放标题栏，放不下时中间省略、保住末尾目录名
      Text(ellipsizeMiddle(this.titlePath.length > 0 ? this.titlePath : this.curName(), 52))
        .fontSize(13)
        .fontColor('#9fb0c8')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .layoutWeight(1)

      // 11-10 起按用户要求彻底移除「选择图片」与「回到上次」两个按钮及其入口；
      // 顶栏其余按钮（全屏 / 幻灯片）与事件保持不变。
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
    .height(TOPBAR_H)
    .padding({ left: 16, right: 12 })
    .backgroundColor('#1a1d23')
    .border({ width: { bottom: 1 }, color: '#2a2f3a' })
  }

  build() {
    Stack({ alignContent: Alignment.TopStart }) {
      Column() {
        // ============================== 顶栏（非全屏时常驻）==============================
        if (!this.fullscreen) {
          this.topBar();
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
              // 版本标记常驻左栏抬头：即使顶栏被自动隐藏，截图也能一眼分辨新旧包
              Text('v' + APP_VERSION + (this.itemCount > 0 ? ' · ' + this.itemCount + ' 张' : ''))
                .fontSize(12)
                .fontColor('#7f88a3')
            }
            .width('100%')
            .padding({ left: 12, right: 12, top: 10, bottom: 8 })

            // 11-10 起：排序 / 回上层 / 选择文件夹 三个按钮水平排在同一行。
            // toolBtn 的 layoutWeight(1) 三等分宽度 → 水平间距由统一的 margin(3) 决定，一致；
            // 统一 height(30) + Row 垂直居中 → 垂直对齐整齐；
            // 合并掉原来的第二行后，按钮区不再有多余垂直空白，也不会重叠 / 错位。
            Row() {
              this.toolBtn(this.sortAsc ? '排序 ↑' : '排序 ↓', 'sort', true)
              this.toolBtn('回上层', 'up', true)
              this.toolBtn('选择文件夹', 'folder', true)
            }
            .width('100%')
            .alignItems(VerticalAlign.Center)
            .padding({ left: 6, right: 6, bottom: 6 })
            .border({ width: { bottom: 1 }, color: '#2a2f3a' })

            // 目录里零图片但有一堆子文件夹时，列表照常渲染，只是在上面补一行说明，
            // 别让用户把「本层没有图片」误看成「又空白了」。
            if (this.dirHint.length > 0 && this.rowCount > 0) {
              Text(this.dirHint)
                .fontSize(11)
                .fontColor('#8b95a8')
                .width('100%')
                .padding({ left: 12, right: 12, top: 5, bottom: 5 })
                .backgroundColor('#1c212a')
            }

            // ⚠️ 判空态用 rowCount（左栏实际行数），不能用 itemCount（只算图片）：
            // 「人像」这类全是子文件夹、零图片的目录 itemCount=0 但 rows 有内容，
            // 旧版会整块换成「还没有图片」空态，目录表一行都不显示。
            if (this.rowCount === 0) {
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
                Text('点左栏「选择文件夹」浏览目录')
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
              List({ scroller: this.scroller, space: 2 }) {
                LazyForEach(this.dataSource, (item: ImageItem, idx: number) => {
                  ListItem() {
                    ArchiveRow({
                      uri: item.uri,
                      name: item.name,
                      bytes: item.size,
                      mtime: item.mtime ?? 0,
                      kind: item.kind ?? ROW_IMAGE,
                      idx: idx,
                      selected: (item.itemIndex ?? idx) === this.cur,
                      collapsed: this.listCollapsed,
                      onTap: (i: number) => {
                        this.onRowTap(i);
                      },
                      onDblTap: (i: number) => {
                        // Win64 7ff850d：双击档案名切换全屏（只对图片行生效）
                        const r: ImageItem | undefined = this.rows[i];
                        if (r !== undefined && (r.kind ?? ROW_IMAGE) === ROW_IMAGE) {
                          this.undoLastClickZoom();
                          this.toggleFull();
                        }
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
  
            // 11-10 起按用户要求取消左下角 4 行 × 2 列共 8 个视图控制按钮。
            // 缩放 / 旋转 / 镜像 / 复位能力仍由键盘与鼠标提供（见 README 快捷键表）。
          }
          .width(this.listCollapsed ? LIST_COLLAPSED_W : this.listW)
          .height('100%')
          .backgroundColor('#161a21')

          // 分隔条正中的 « / »（Win64 45~49 行）：与 Ctrl+B 同效。
          // 收起后按钮仍在原地，再点一下展回来；全屏时随左栏一起整条隐藏。
          Column() {
            Button(this.listCollapsed ? '»' : '«')
              .type(ButtonType.Normal)
              .fontSize(13)
              .fontColor('#8b95a8')
              .backgroundColor('#2a2f3a')
              .borderRadius(4)
              .width(SPLIT_W - 2)
              .height(40)
              .padding(0)
              .onClick(() => {
                this.listCollapsed = !this.listCollapsed;
                this.status = this.listCollapsed ? '已收起左栏（Ctrl+B / » 展开）' : '已展开左栏';
              })
          }
          .width(SPLIT_W)
          .height('100%')
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .backgroundColor('#1a1d23')
        }

        // ---------- 右侧：大图预览（GPU 合成渲染）----------
        Stack({ alignContent: Alignment.Center }) {
          if (this.cur >= 0) {
            // 外层 Column：拖拽 + 旋转；内层 Image：缩放 + 镜像。
            // 对开时两页各占一半宽、等高并排（Win64 6347756）；翻页步长仍恒为一格。
            Column() {
              if (this.spreadB >= 0 && this.spreadB < this.items.length) {
                Row() {
                  this.previewImage(this.curItem()!.uri, this.curToken, this.frameW() / 2)
                  this.rightPageImage(this.items[this.spreadB].uri, this.frameW() / 2)
                }
                .justifyContent(FlexAlign.Center)
                .alignItems(VerticalAlign.Center)
              } else {
                this.previewImage(this.curItem()!.uri, this.curToken, this.frameW())
              }
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
              if (this.dirHint.length > 0) {
                // 目录表已在左栏列出，右侧别让用户以为程序没读到东西
                Text('本层没有图片 · 点左侧文件夹进入子目录')
                  .fontSize(13)
                  .fontColor('#8b95a8')
                  .margin({ top: 12 })
              }
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

          // 左上角信息浮层（Win64 015464f：只留档案名；对开时两个数并列）
          Row() {
            Column() {
              Text(this.spreadNames())
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

          // 右下角角标：目录诊断 + 缓存账目 + 缩放倍率
          Column() {
            // 目录浏览态的诊断快照（非目录态为空，完全不显示）。
            // 用户实机反馈「左栏修复没生效」时，截一张图就能带上这三组信息。
            if (this.diagLine.length > 0) {
              Text(this.diagLine)
                .fontSize(10)
                .fontColor('#9aa5b8')
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
                .constraintSize({ maxWidth: 420 })
                .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                .backgroundColor('#cc12161c')
                .borderRadius(4)
                .margin({ bottom: 6 })
            }
            // 缓存：驻留张数 / 估算占用（圆括号里是张数上限与字节上限，便于看窗口是否填满）
            Row() {
              Text('缓存 ' + this.cacheCount + ' / ' + PRELOAD_COUNT + ' 张')
                .fontSize(11)
                .fontColor('#9aa5b8')
              Text(fmtBytes(this.cacheBytes))
                .fontSize(12)
                .fontColor('#dfe5ef')
                .margin({ left: 8 })
              Text('/ ' + fmtBytes(PRELOAD_MAX_BYTES))
                .fontSize(10)
                .fontColor('#5a6272')
                .margin({ left: 4 })
            }
            .padding({ left: 8, right: 8, top: 4, bottom: 4 })
            .backgroundColor('#cc12161c')
            .borderRadius(4)

            Row() {
              Text(this.zoomPercentText())
                .fontSize(12)
                .fontColor('#dfe5ef')
                .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                .backgroundColor('#cc12161c')
                .borderRadius(4)
            }
            .margin({ top: 6 })
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.End)
          .alignItems(HorizontalAlign.End)
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
        .backgroundColor(CANVAS_BG)
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
        // 左键放大 50%（锚点）/ 右键还原 / 双击切换全屏
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
              this.status = '缩放 ' + this.zoomPercentText();
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
              // Win64 84adb7a：双击 = 切换全屏（并撤销第一下单击的放大）
              this.onDoubleTapCanvas();
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
          // 可观测（Win64 015464f）：预载 N 张 · xx MB，与右下角角标同源
          Text('预载 ' + this.cacheCount + ' 张 · ' + fmtBytes(this.cacheBytes))
            .fontSize(11)
            .fontColor('#8b95a8')
            .margin({ right: 12 })
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

      // 全屏时顶栏浮在画布之上（Win64 0cfabb2）：绝对定位、不占布局，
      // 鼠标贴到窗口顶端才出现，出现/消失都不会把预览区挤一下。
      if (this.fullscreen && this.topbarVisible) {
        Column() {
          this.topBar();
        }
        .width('100%')
        .position({ x: 0, y: 0 })
        .zIndex(10)
      }
    }
    .width('100%')
    .height('100%')
    .onMouse((event: MouseEvent) => this.onRootMouse(event))
  }
}
