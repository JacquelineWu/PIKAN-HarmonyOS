/**
 * pages/Index.ets — 鸿蒙 PC 原生 HEIC/JPG 看图软件（ACDSee 风格）
 *
 * 布局（ACDSee 风格）：
 *   · 顶栏：标题 + 当前文件名 + 「全屏」+ 幻灯片
 *            （11-10 起依次取消「打开图库」「选择图片」「回到上次」三个按钮）
 *   · 左侧：抬头下「排序 / 往上层 / 选择文件夹」同一行等宽排列；
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
 *   · 后台预载：自动预先解码当前位置「前后各 100 张」（可直接显示的清晰度），
 *     窗口随位置滑动、触到内存预算就收工；切换时命中即上屏、不再补解码
 *   · 切图过渡：默认 FOCUS_BLUR = false，命中预载瞬时上屏、无动画；
 *     未命中才先用 768px 低清占位，清晰图就绪后瞬时替换
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
import fileShare from '@ohos.fileshare';
import fileUri from '@ohos.file.fileuri';
import hilog from '@ohos.hilog';
import photoAccessHelper from '@ohos.file.photoAccessHelper';
import image from '@ohos.multimedia.image';
import abilityAccessCtrl from '@ohos.abilityAccessCtrl';
import dataSharePredicates from '@ohos.data.dataSharePredicates';
import preferences from '@ohos.data.preferences';
import window from '@ohos.window';
import colorSpaceManager from '@ohos.graphics.colorSpaceManager';
import util from '@ohos.util';
import { baseName, dirDisplayName, stripTrailingSlash, parentDirOf,
  volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, upParentCandidates, sameDirPath,
  UP_NAV_NONE, UP_NAV_TOP, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf,
  upContextBaseOf, upContextRawOf, pathChainOf, inAppUpListHint,
  textWidthVp, listWidthForNames, sameEntryNames } from '../common/DirName';
import { HoverGuard } from '../common/HoverGuard';
import { preloadWindowSize, preloadOrder, preloadSaturated } from '../common/PreloadBudget';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  RESTORE_FULL, RESTORE_READONLY, restoreModeOf, bulkIoAllowed, restoreProbeUris,
  readonlyHint, readonlyTapHint, readonlyUpHint, restoreUpEnabled, restoreUpHint } from '../common/ResumePlan';
import { PERSIST_SKIP, persistAction, persistPolicyUris,
  persistTimeoutSafe, persistOkHint, persistFailHint, persistLegacyHint } from '../common/PersistPlan';
import { ExifTransform, Size2, exifTransformOf, exifSizeOf, viewEdgeOf, preloadEdgeOf,
  displayEdgeOf, colorSpaceNameOf, isWideGamutOf, viewHintOf, fullscreenStepsOf } from '../common/ViewPlan';
import { KeyCode } from '@ohos.multimodalInput.keyCode';
import { BusinessError } from '@ohos.base';

const TAG = 'HeicViewer';
const DOMAIN = 0x0000;

/** 版本号（与 AppScope/app.json5 的 versionName 保持一致），用于窗口标题栏。
 *  Win64 版 3ea7419 起标题栏带版本号；鸿蒙没有「读取程序集版本」的等价物，故用常量。 */
const APP_VERSION: string = '1.0.7';
/** 「往上层」目录层级导航的诊断标记（仅用于右下角诊断串截图辨认新旧包，
 *  不是版本号，不改 AppScope/app.json5）。旧包诊断串里是 anchors/stack，新包是 up4/L 层级。 */
const UP_NAV_TAG: string = 'up4';
/** 「启动恢复上次相片」的诊断标记（也不是版本号）。状态栏出现 rs1 即表示装的是新包。 */
const RESUME_TAG: string = 'rs1';
/** 「恢复名单降级为只读」的诊断标记（也不是版本号）。
 *  2026-11-11 实机反馈：重开后名单在、图片白、按钮与列表点不动。根因是快照 uri 的
 *  逐 URI 授权在重启后失效，恢复链却照常对这批死 uri 跑预载/补体积/对开探测，
 *  几百次同步跨进程调用把主线程打满。状态栏/提示卡片出现 ro1 即表示装的是带此修复的新包。 */
const RESTORE_TAG: string = 'ro1';
/** 恢复前最多探几张 uri 判断授权是否还在。⚠️ 必须保持很小：
 *  每次 fs.openSync 对失效授权 uri 都是一次同步跨进程调用，批量探测会把主线程打满。 */
const RESTORE_PROBE_LIMIT: number = 3;
/** 「目录 URI 持久授权」的诊断标记（也不是版本号）。实机诊断串出现 p1 即带此功能。 */
const PERSIST_TAG: string = 'p1';
/** 「恢复后重建往上层目录层级」的诊断标记（也不是版本号）。
 *  2026-11-11 第三次实机反馈：p1 后重开能出图了，但「往上层」仍按不动 ——
 *  因为恢复链只把原始目录 URI 拿去 activate，没回填 browseBase。出现 uc1 即带此修复。 */
const UP_CTX_TAG: string = 'uc1';
/** 「往上层改为 APP 内清单」的诊断标记（也不是版本号）。
 *  2026-11-11 第四次实机反馈：点「往上层」会弹出系统选择目录 dialog，不是原意；
 *  原意是在 APP 内显示上层档案目录 / 档案清单。出现 ul1 即带此修复。 */
const UP_LIST_TAG: string = 'ul1';
/** 启动激活持久授权最多等多久（ms）。activatePermission 是跨进程调用，
 *  必须有超时兜底，否则系统服务挂住时恢复链永远不往下走、界面停在空态。 */
const PERSIST_ACTIVATE_MS: number = 1500;
/** 上面这个超时的硬上限：防止以后有人把它调成几十秒，变相把恢复拖回启动关键路径。 */
const PERSIST_TIMEOUT_MAX_MS: number = 3000;
/** 一次 persist / activate 最多带几个 policy。**恒为 1**：只授权 picker 返回的原始
 *  目录 URI，绝不把快照里几百条拼出来的子文件 uri 塞进去（批量跨进程调用 = 冻结源）。 */
const PERSIST_POLICY_LIMIT: number = 1;
/** 预览区底色：Win64 版 c42d92b 起由近黑 #0a0b0d 改为中灰 #5F5F5F —— 看竖图 / 白底扫描件时
 *  更容易判断图片边界，也不至于把暗部细节和背景混在一起。想回深色改回 '#0a0b0d' 即可。 */
const CANVAS_BG: string = '#5F5F5F';
/** 缩放角标的口径：true = 相对「原图像素」的倍率（100% = 1:1，与 ACDSee / Photoshop 一致）；
 *  false = 相对「适应窗口」的倍率（旧行为，适应窗口时显示 100%）。 */
const ZOOM_PCT_RELATIVE_TO_PIXEL: boolean = true;
/** 右下角「目录诊断串」显示开关（2026-11-11 用户要求：预览右下角只显示
 *  「缓存数量」与「缩放百分比」两项）。默认 false = 完全不画诊断行。
 *  需要实机截图排查时临时改成 true 即可：diagLine 的赋值逻辑全部保留，
 *  不改任何业务流程、不用重新加代码。 */
const SHOW_DIAG_BADGE: boolean = false;
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
 *  LIST_W 是**下限**——刚好能让一行三个按钮（排序 / 往上层 / 选择文件夹）等宽并排且不重叠；
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
 *  2026-11-11 由 50 扩到 100（用户：「尽量缓存前后 100 张图」）——
 *  长图库连翻 / 快速跳读更容易命中，翻页不等解码。
 *  「尽量」= 窗口目标放宽到 100，实际驻留由 PRELOAD_COUNT / PRELOAD_MAX_BYTES 双重预算裁剪；
 *  右下角角标「缓存 N 张」显示真实值（不再显示内存占用 / 上限），不强行保证 201 张全驻留。 */
const PRELOAD_FWD: number = 100;
/** 预载窗口：当前位置「往前」的张数 —— 没有它的话，快速往回滚就一张都命中不了缓存。
 *  改这两个常量就等于改窗口大小；缓存是**跟着当前位置滑动**的（见 evictOutside），
 *  所以前后各 100 意味着最多同时驻留 201 张，而不是越翻越多。 */
const PRELOAD_BACK: number = 100;
/** 缓存条目上限（LRU 容量）。窗口 = 100+100+1 = 201 张，留 15 张余量：
 *  容量必须 > 窗口大小，否则每入一张就淘汰一张、又被预载链加回来，会来回抖动。 */
const PRELOAD_COUNT: number = 216;
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
 *  窗口 201 张 × 1536 档位（3:2 图约 6.3MB/张）≈ 1.27GB；方图（1536² 约 9.4MB/张）≈ 1.9GB。
 *  2026-11-11 由 512MB 提到 1GB：旧上限只够约 80 张，窗口扩到 100 后会被立刻挤掉，等于白扩。
 *  ⚠️ 鸿蒙设备内存普遍小于 PC，1GB 是「尽量」的安全天花板 —— 触顶即按 LRU 淘汰并收工
 *     （preloadSaturated 防止「解→淘汰→再解」死循环），实际驻留数看角标「N 张」。
 *  ⚠️ 内存吃紧的机器：把 PRELOAD_MAX_BYTES 调回 512MB，或把 PRELOAD_MAX_EDGE 调到 1280
 *     （单张约 4.4MB，1GB 反而能装下整窗 201 张）—— 不要调低 PRELOAD_MIN_EDGE，
 *     档位小于屏幕实际像素会让每张命中缓存的图都得再解一次全清（切图卡顿老问题）。 */
const PRELOAD_MAX_BYTES: number = 1024 * 1024 * 1024;
/** 主视图解码：长边 = 画布长边 × 该系数，并夹在 [VIEW_EDGE_MIN, VIEW_EDGE_MAX] 内。
 *  系数取 1.5 而不是 2（Win64 版实测）：×2 时一张大图能解到 1.5 秒，
 *  而屏幕实际只需要约 1.0 倍像素 —— 多出来的既不显示又拖慢切图。 */
const VIEW_EDGE_FACTOR: number = 1.5;
const VIEW_EDGE_MIN: number = 1200;
const VIEW_EDGE_MAX: number = 4096;
/** 显示需求余量：左右页共用 ViewPlan.displayEdgeOf 的 headroom（旧 showNeed 口径 1.05）。
 *  抽成常量是为了让「左页 / 右页 / 全清升级」三个调用点用同一个纯函数、同一组参数。 */
const DISPLAY_HEADROOM: number = 1.05;
/** 全屏时主视图解码倍率：画布变大后按新尺寸解到位，绝不把旧分辨率的 PixelMap 拉大。
 *  全屏用 2.0（普通态 1.5），上限仍是 VIEW_EDGE_MAX = 4096 控内存。 */
const FULLSCREEN_VIEW_EDGE_FACTOR: number = 2.0;
/** 全屏时预载档位上限：普通态封顶 1536，全屏大画布放宽到 2560，
 *  避免前后 100 张仍是旧的小档位。字节预算 PRELOAD_MAX_BYTES 仍是最终闸门。 */
const FULLSCREEN_PRELOAD_MAX_EDGE: number = 2560;
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
/** 全屏时是否仍画应用内的顶栏浮层 / 退出按钮。
 *  2026-11-11 用户要求「真正全屏、不会有标题列」→ false，全屏画面只剩图片；
 *  退出用 Esc / F11 / 双击画布，左上角信息浮层会写一行提示。 */
const SHOW_FULLSCREEN_CHROME: boolean = false;
/** 窗口实例可能还没被 EntryAbility 缓存好（getMainWindow 是异步的）：延时重试次数 / 间隔 */
const FULLSCREEN_WINDOW_RETRY_MAX: number = 2;
const FULLSCREEN_WINDOW_RETRY_MS: number = 120;
/** 画布尺寸变化后 pendingReload 的兜底超时（ms）：
 *  窗口 API 若不产生 onAreaChange，也要按当前画布重解一次，别让标志永远留着。 */
const CANVAS_RELOAD_FALLBACK_MS: number = 800;
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

/** 「梅花间竹」交替色格子（2026-11-11 用户要求）：档案列表奇偶行两种底色，
 *  形成一格一格的棋盘条纹；选中行用独立高亮色，优先级最高（见 ArchiveRow.rowBgColor）。
 *  两行之间的垂直缝按「继续压缩到约 1mm」取 1vp —— ArkUI 只有 vp / px，没有 mm 单位，
 *  1vp 在 2in1 高密度屏上就是极细的一线缝；实机觉得宽/窄只改 LIST_ROW_GAP_VP 一个常量即可。 */
const ROW_STRIPE_EVEN: string = '#1e242e';
const ROW_STRIPE_ODD: string = '#161a21';
const ROW_SELECTED_BG: string = '#1f2730';
const LIST_ROW_GAP_VP: number = 1;

/** 解码结果：uri + 已解码的 PixelMap + 显示宽高 + 解码档位 + 色彩/HDR/EXIF 元数据 */
interface PreviewEntry {
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

/** 父目录计算已统一迁到 common/DirName.ts：
 *  基础剥一层用 parentDirOf()，目录层级上行的唯一入口是 upLevelOf() / upParentCandidates()。
 *  旧 dirOf() 不去尾斜杠：picker 给的目录常带 `/`，lastIndexOf('/') 落在末尾，
 *  substring(0, i) 得到的还是自己 —— 这就是「往上层」原地不动的根因。
 *  本文件不再保留任何浏览历史栈，层级判断只读 browseBase 这个当前路径真值。 */

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
/** 上次用 picker 选过的**原始目录 URI**（持久授权的根）。
 *  重开时先 fileShare.activatePermission(它)，再恢复快照 → 直接出图。
 *  老版本没有这个 key → 没有持久授权，退回「探测 + 只读名单态」。 */
const POS_KEY_DIR: string = 'lastDirUri';
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
  /** 【护栏，永远保持 false】启动时是否走旧的「静默重扫图库 / 权限申请」路径。
 *
 *  早期 appfreeze 的真根因就是启动路径上的 PreferencesGetValue + 全量图库扫描：
 *  主线程被卡 8 秒，watchdog 判 APP_INPUT_BLOCK，整个机器冻住。
 *  这条路径**不再使用**，常量保留只是把「绝不能在启动时重扫 / 弹权限框」写死成代码事实。
 *  新的启动恢复走 AUTO_SHOW_LAST_ON_START（见下），只读小 key + 分块快照，绝不重扫。 */
const AUTO_RESUME_ON_START: boolean = false;

/** 启动时是否自动「显示上次那张相片」（2026-11-11 需求 1）。
 *
 *  保存链路（markPos → flushPos）一直是好的，断的是**启动恢复**：
 *  以前重开 APP 只在空态显示一行「上次看到 …」文字，用户还得自己重新选文件夹。
 *  现在默认 **true**：首帧之后自动把上次的图片显示出来，并尽量恢复整批列表 + 精确落位。
 *
 *  安全边界（每条都是历史踩过的坑，不要放宽）：
 *   · 首帧 / 窗口初始化期间绝不动 preferences —— 恢复排到 RESUME_DELAY_MS 之后；
 *   · 绝不 loadAllGallery() 全量重扫、绝不申请权限、绝不弹选择器（无交互、无 ANR）；
 *   · 只读 1 个小 key（snapCount）+ 分块快照，SNAP_MAX 已降到 600（原 3000 会卡死）；
 *   · 恢复失败 / 授权过期 → 退回「只显示那一张」，UI 不会空白也不会崩；
 *   · 只跑一次（resumeDone），用户已经自己选了东西就立刻让路（不抢视图）。
 *
 *  想关掉自动恢复把它设为 false 即可（回到「只显示提示文字」的旧行为）。 */
const AUTO_SHOW_LAST_ON_START: boolean = true;
/** 启动恢复推迟多久：必须 > WARM_DELAY_MS（300），让首帧渲染、窗口初始化和
 *  「上次那张」的单张预热都先完成，之后才轮到读快照 / 建列表。 */
const RESUME_DELAY_MS: number = 900;
/** 恢复延迟的硬下限（resumeDelaySafe 校验用）：低于这个值一律拒绝调度，
 *  防止以后有人把 RESUME_DELAY_MS 调太小，把恢复又塞回启动关键路径。 */
const RESUME_MIN_SAFE_MS: number = 600;
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

/** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
 *  edge = QUICK_EDGE 低清占位 / preloadEdge() 预载 / viewEdge() 全清 / HOVER_EDGE 悬停缩略图。
 *
 *  2026-11-11 增加三件事（共用一个 DecodingOptions，不再只有 desiredSize）：
 *    ① EXIF Orientation → 解码阶段旋转 + 镜像（`ViewPlan.exifTransformOf`）；
 *    ② desiredDynamicRange = AUTO → HDR 图按 HDR 解码，平台不支持时 SDK 自动降 SDR；
 *    ③ 内嵌 ICC 色彩空间：COLOR_MANAGE_MODE=0 保留源空间，1/2 才在解码时转换到 sRGB / Display P3；
 *       解码后读 PixelMap.getColorSpace() 记录系统识别到的空间，用于信息浮层。 */
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
  /** 只读名单态：快照 uri 的授权已失效，悬停时**绝不**发起 384px 缩略图解码
   *  （ThumbLoader 走 decodePx → fs.openSync，同样是同步跨进程调用）。 */
  @Prop thumbDisabled: boolean = false;
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

  /** 「梅花间竹」交替底色：选中态优先，其余按 idx 奇偶两色成格（2026-11-11）。 */
  private rowBgColor(): string {
    if (this.selected) {
      return ROW_SELECTED_BG;
    }
    return (this.idx % 2) === 0 ? ROW_STRIPE_EVEN : ROW_STRIPE_ODD;
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
    // 只读名单态：连浮层都不弹，彻底断掉 hover 解码链（预览区指引卡会说明原因）。
    if (this.kind !== ROW_IMAGE || this.thumbDisabled) {
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
      // 2026-11-11 用户要求：hover 缩略图里只放相片，不显示档案名。
      // 档案名本来就在左栏那一行上，浮层再写一遍既占空间又挡图。
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
    // 11-11 起继续压缩：上下 padding 2 → 1，配合 List space=1 把两行缝压到约 1mm。
    // 行背景改为「梅花间竹」交替色格子（奇偶两色），选中行仍是高亮色。
    .padding({ left: 6, right: 6, top: 1, bottom: 1 })
    .borderRadius(3)
    .backgroundColor(this.rowBgColor())
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
  // openFolder 实测「能 listFile 且子文件能 open」的真实路径 ——**当前路径的唯一真值**。
  // 「往上层」只按它的目录层级算父级，绝不看浏览历史 / 不回溯「最初选择的目录」。
  // 重扫 / mtime 自检也一律用它：原始 uri 可能是 file://docs/... 或 %XX 编码，statSync 认不出来。
  private browseBase: string = '';
  /** 最近一次「选择文件夹」拿到的原始 uri，仅用作 FOLDER picker 的已授权起点。
   *  ⚠️ 不再作为「往上层」的父级推算锚点：它可能指向好几层之前，混进来就会越级 / 绕圈。 */
  private pickRootUri: string = '';
  /** 会话内「进入子目录前那一份目录清单」的条目名（纯字符串，零 IO）。
   *  用户随后点「往上层」回到这一层、而上级授权已失效列不出真实内容时，
   *  showUpListInApp 就能在 APP 内还原档案清单，而不是弹系统选择目录 dialog。
   *  重启后为空 → 退化为 pathChainOf() 的目录层级清单。 */
  private lastUpPath: string = '';
  private lastUpNames: Array<string> = [];
  /** 左栏当前是不是「APP 内自建清单态」。为真时点目录行绝不弹「目录内多选」兜底选择器。 */
  private inAppUpList: boolean = false;
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
  /** 「当前路径是否仍有父级」——只作状态栏文案、诊断串与 browseUp 的行为判据。
   *  ⚠️ 2026-11-11 用户明确要求「不要 grey out、不能禁用」：这个字段**绝不**参与
   *  按钮的 enabled / 颜色 / 透明度；「往上层」按钮任何时候都是亮的、可点的。
   *  到卷根 / 图片列表态为 false 时，点击由 browseUp() 给提示、不移动目录。 */
  @State canGoUp: boolean = false;
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
  // 当前显示那张的色彩 / HDR / EXIF 元数据（来自 PreviewEntry，用于信息浮层与 HDR 显示模式）
  @State viewColorSpace: number = 0;
  @State viewIsHdr: boolean = false;
  @State viewExifDegrees: number = 0;
  @State viewHdrWanted: boolean = false;

  // ---- 画布尺寸（onAreaChange 得到）----
  @State canvasW: number = 800;
  @State canvasH: number = 600;

  // ---- 交互 ----
  @State playing: boolean = false;
  @State status: string = '点左栏「选择文件夹」浏览目录';
  /** 真全屏：应用内三块栏 + 系统标题栏 / dock / 状态栏 / 导航栏全部不显示，画面只剩图片。
   *  2026-11-11 起 applyWindowFullScreen() 会调 window 最大化沉浸接口，详见该方法注释。 */
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
  /** pendingReload 的兜底计时器：窗口 API 没产生 onAreaChange 时也要重解一次 */
  private canvasReloadTimer: number = -1;
  /** 全屏时是否由我们主动最大化过窗口 —— 退出时才知道要不要 recover 回自由窗口 */
  private maximizedByUs: boolean = false;
  /** 进入全屏前的视图 / 界面状态快照：ESC 退出时要「切回之前的完整界面」，
   *  包含缩放平移、手动旋转、状态栏文案、顶栏可见性，不能只翻 fullscreen 一个布尔。 */
  private hasFullSnapshot: boolean = false;
  private preFullZoom: number = 1;
  private preFullTx: number = 0;
  private preFullTy: number = 0;
  private preFullRot: number = 0;
  private preFullFlipH: boolean = false;
  private preFullFlipV: boolean = false;
  private preFullStatus: string = '';
  private preFullTopbar: boolean = true;

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
  /** 启动恢复：只跑一次，且用户已经自己选了东西就立刻让路。 */
  private resumeDone: boolean = false;
  private resumeTimer: number = -1;
  /** 恢复模式（见 ResumePlan）：默认 RESTORE_FULL（正常使用），
   *  只有启动恢复探测到「快照 uri 一个都打不开」才降为 RESTORE_READONLY。
   *  只读态只列名单，禁止一切批量同步磁盘 IO，保证主线程空闲、按钮与列表可操作。 */
  private restoreMode: number = RESTORE_FULL;
  /** 只读名单态的提示文案（@State，驱动预览区提示卡）。空串 = 非只读态。 */
  @State restoreHintText: string = '';
  /** 恢复链专用：探测结果先暂存，等真正建列表（setItems / openFolder）时才落地。
   *  这样「用户主动换源」不必逐个入口手写清除 —— pending 恒为 false，自动回到完整模式。 */
  private pendingRestoreReadonly: boolean = false;
  private pendingRestoreCount: number = 0;
  private pendingRestoreSrc: string = '';

  // ---- 目录 URI 持久授权（见 PersistPlan.ts）----
  /** 启动时从 preferences 读回的上次目录 URI；空串 = 旧数据 / 首次安装。 */
  private savedDirUri: string = '';
  /** activate 竞速是否已收口：超时定时器与 activate 回调谁先到都只生效一次。 */
  private persistSettled: boolean = false;
  private persistTimer: number = -1;
  /** 本次运行持久授权是否激活成功（仅用于状态栏 / 诊断串）。 */
  private persistActivated: boolean = false;
  /** 用户是否已经主动操作过（选文件夹 / 选图 / 往上层）。恢复绝不能抢用户当前的视图。 */
  private userActed: boolean = false;
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
   *  只在「入缓存 / 淘汰 / 清空」三个口子上 sync 一次给 UI —— 频率最多几十次/轮，够看又不抖。
   *  2026-11-11 起角标只画 cacheCount（「缓存 N 张」）；cacheBytes 保留为内部账目镜像，
   *  不再显示 MB / 上限，需要临时看内存占用时把它接回 Text 即可。 */
  @State cacheCount: number = 0;
  @State cacheBytes: number = 0;
  /** 目录浏览诊断行：把「装的是哪一版 + picker 实际返回的 uri 形态」记下来。
   *  之前四次修复共用 versionCode 4 / 1.0.4，实机无法分辨装的是旧包还是新包，
   *  所以这一行曾经画在右下角供截图。2026-11-11 起右下角只留两项信息，
   *  默认由 SHOW_DIAG_BADGE=false 隐藏；赋值逻辑全部保留，排查时把开关改 true 即可再截图。 */
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
    this.readLastPos(); // 异步读几个小 key，不阻塞首帧；恢复排到首帧之后（见 scheduleShowLast）
  }

  /** 切后台 / 锁屏 / 被别的应用盖住：这是「退出 APP」最常走的路径。
   *  ⚠️ 必须**同步**落盘：flushPos() 是 async 的 put + flush，进程随后被杀时
   *     Promise 可能根本没跑完，「上次的位置 / 相片」就丢了。
   *     putSync / flushSync 写的是几个小 key（毫秒级），不写大快照，不会卡住切后台。 */
  onPageHide(): void {
    this.flushPosSync();
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
    if (this.resumeTimer !== -1) {
      clearTimeout(this.resumeTimer); // 别让恢复在页面已经销毁后还去改视图
      this.resumeTimer = -1;
    }
    if (this.persistTimer !== -1) {
      clearTimeout(this.persistTimer); // activate 超时兜底也别在页面销毁后触发恢复
      this.persistTimer = -1;
    }
    this.flushPosSync(); // 退出前把最后一次位置**同步**落盘（进程被杀也不丢）
    if (this.fullscreen) {
      // 页面销毁时若还在全屏，把标题栏 / dock / 系统状态栏 / 导航栏都还回去
      this.applyWindowFullScreen(false, 0);
    }
    this.clearCanvasReloadFallback();
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
      const rawDir = await p.get(POS_KEY_DIR, '');
      const idx: number = typeof rawIdx === 'number' ? rawIdx : -1;
      const uri: string = typeof rawUri === 'string' ? rawUri : '';
      const ok: string = typeof rawOk === 'string' ? rawOk : '';
      // 必须在 scheduleShowLast() / 可能的提前 return 之前读到：恢复前要先激活它。
      this.savedDirUri = typeof rawDir === 'string' ? rawDir : '';
      this.okUri = ok;
      // 预热「上次成功显示的那张」：后台解 1 张，与下面读位置/恢复完全解耦，
      // 就算它失败也只是少一次缓存命中，不影响任何别的路径。
      if (ok.length > 0) {
        this.warmLast(ok);
      }
      // 2026-11-11 需求 1：首帧之后自动把上次的相片显示出来。
      // 排程放在「提前 return」之前：即使没有完整的 LastPos（只解出过一张图、
      // 只有 okUri），也能靠单张兜底显示画面，不会白屏。
      // 这里只排一个 setTimeout，读快照 / 建列表都推迟到 RESUME_DELAY_MS 之后。
      this.scheduleShowLast();
      if (idx < 0 && uri.length === 0) {
        return; // 首次启动，没有位置记忆（预热 + 恢复调度都已排上）
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
        // 不做「静默重扫 / 权限申请」那套重活（见 AUTO_RESUME_ON_START 护栏注释）。
        // 恢复动作已由 scheduleShowLast() 排到首帧之后，这里只给一句进行中提示。
        this.status = '正在恢复上次看到的「' + saved.name + '」第 ' +
          (saved.idx + 1) + ' 张 · ' + RESUME_TAG;
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'readLastPos failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 只探最多 RESTORE_PROBE_LIMIT 张 uri 能否 open —— 判断快照授权在重启后是否还在。
   *
   *  ⚠️ 每次 fs.openSync 对失效授权的 `file://docs/...` uri 都是一次同步跨进程调用，
   *     **绝不能探整批**（几百次就足以把主线程打满，正是历史 appfreeze 的根因）。
   *     这里最多 3 张、且只在首帧后 900ms 的恢复链里跑一次。
   *  返回 true = 这批 uri 还能读，走完整恢复；false = 授权已失效，落只读名单态。 */
  private probeRestoreUris(uris: Array<string>, okUri: string, savedUri: string): boolean {
    const cand: Array<string> = restoreProbeUris(uris, okUri, savedUri, RESTORE_PROBE_LIMIT);
    for (let i: number = 0; i < cand.length; i++) {
      let f: fs.File | undefined = undefined;
      try {
        f = fs.openSync(cand[i], fs.OpenMode.READ_ONLY);
        return true;
      } catch (e) {
        // 这一张打不开，继续试下一个候选
      } finally {
        if (f !== undefined) {
          try {
            fs.closeSync(f);
          } catch (e) {
            hilog.warn(DOMAIN, TAG, 'probe close skipped');
          }
        }
      }
    }
    return false;
  }

  /** 在建列表前统一落地恢复模式 —— applyItems 是唯一的收口点。
   *  pending 恒为 false（用户主动换源 / 正常启动）→ RESTORE_FULL，行为与旧版完全一致；
   *  pending=true（恢复链探测到授权失效）→ RESTORE_READONLY + 提示卡 + 诊断串。
   *  决策走纯函数 restoreModeOf()，便于 Node 回归覆盖。 */
  private applyPendingRestore(count: number, src: string): void {
    const mode: number = restoreModeOf(!this.pendingRestoreReadonly);
    this.restoreMode = mode;
    if (mode === RESTORE_READONLY) {
      const n: number = this.pendingRestoreCount > 0 ? this.pendingRestoreCount : count;
      const from: string = this.pendingRestoreSrc.length > 0 ? this.pendingRestoreSrc : src;
      this.restoreHintText = readonlyHint(n, from, RESTORE_TAG);
      // 旧数据（升级前保存的快照）没有建立过持久授权：明确说明只需重选一次，
      // 不是「以后每次都要重选」。
      if (this.savedDirUri.length === 0) {
        this.restoreHintText = this.restoreHintText + persistLegacyHint(PERSIST_TAG);
      }
      this.diagLine = 'restore READONLY | ' + RESTORE_TAG + ' | ' + n + ' 张 | p' +
        (this.persistActivated ? '1' : '0') + ' | v' + APP_VERSION;
      hilog.warn(DOMAIN, TAG, 'restore: READONLY %{public}d items (uri auth lost after restart)', n);
    } else {
      this.restoreHintText = '';
    }
    this.pendingRestoreReadonly = false;
    this.pendingRestoreCount = 0;
    this.pendingRestoreSrc = '';
  }

  /** 恢复链收口：把持久授权的 picker 原始目录 URI 还原成「往上层」的层级真值。
   *
   *  为什么必须有这一步：`setItems()` 无条件清空 `browseBase` / `browseDir` /
   *  `pickRootUri`，于是恢复出来一定是「图片列表态」，`browseUp()` 读到空 current
   *  → `UP_NAV_NONE` → 只给一句「当前是图片列表，没有上层目录」就 return。
   *  上一轮 p1 虽然把原始目录 URI 存进 preferences 并在启动时激活了授权，
   *  却只把它交给 `activatePermission`，从没回填给这三个锚点 —— 这正是
   *  2026-11-11「重开已能直接出图，往上层却还是按不动」的最后一环。
   *
   *  ⚠️ 纯字符串赋值：绝不 `listFile` / `statSync` / `openFolder` /
   *     `startDirPoll` / 弹权限框 / 弹选择器。恢复期新增任何 IO 都会把历史
   *     appfreeze 请回来。真正列父目录只发生在**用户主动点击「往上层」之后**
   *     （browseUp → openFolder）；父目录列不出来时由 showUpListInApp 在 APP 内
   *     出一份上层清单，绝不弹系统选择目录 dialog。
   *  ⚠️ 必须在 `setItems()` **之后**调用：setItems 会清空目录态并刷新
   *     titlePath / canGoUp，早于它会被覆盖掉。
   *  ⚠️ 只读名单态照样回填（层级是纯信息，零 IO）：browseUp 的 READONLY 早退
   *     分支保持不变，防冻结闸门一行不动，只是标题栏 / 诊断串更准确。 */
  private restoreBrowseContext(): void {
    if (!restoreUpEnabled(this.restoreMode, this.savedDirUri)) {
      return;
    }
    const base: string = upContextBaseOf(this.savedDirUri);
    if (base.length === 0) {
      return;
    }
    const raw: string = upContextRawOf(this.savedDirUri);
    // 三个锚点同层同源：base 是真实路径（层级运算 / statSync 认得），
    // raw 是 picker 原始 URI（逐 URI 授权只认带 scheme 这个形态）。
    this.browseBase = base;
    this.browseDir = raw.length > 0 ? raw : base;
    this.pickRootUri = this.browseDir;
    this.titlePath = base;
    this.canGoUp = canGoUpFrom(base);
    this.diagLine = 'up CTX | ' + UP_CTX_TAG + ' | ' +
      (this.restoreMode === RESTORE_READONLY ? 'ro' : 'full') +
      ' | L' + dirLevelOf(base) + ' | ' + ellipsizeMiddle(base, 30) +
      ' | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'restore: up context rebuilt L%{public}d base=%{public}s',
      dirLevelOf(base), base);
  }

  // ------------------------------------------------------------------------
  // 目录 URI 持久授权（2026-11-11）：让重开直接出图，不必每次重新选文件夹
  // ------------------------------------------------------------------------

  /** 恢复链入口：先决定要不要激活持久授权，再进入原来的 showLastOnStart()。
   *
   *  ⚠️ 这里仍然只在「首帧后 RESUME_DELAY_MS」的定时器里跑，绝不在 aboutToAppear
   *     调用栈上做跨进程调用。activatePermission 是异步的，本方法**不 await** 它，
   *     而是用 PERSIST_ACTIVATE_MS 超时兜底：哪怕系统服务挂住，恢复链也照样往下走。 */
  private beginRestore(): void {
    const act: number = persistAction(this.savedDirUri.length > 0,
      AUTO_SHOW_LAST_ON_START, this.userActed, this.resumeDone);
    if (act === PERSIST_SKIP || !persistTimeoutSafe(PERSIST_ACTIVATE_MS, PERSIST_TIMEOUT_MAX_MS)) {
      this.showLastOnStart();
      return;
    }
    this.persistSettled = false;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = -1;
      // 超时：不等系统服务了，按「授权没激活」继续恢复，靠探测 + 只读名单态兜底。
      this.finishPersistActivate(false);
    }, PERSIST_ACTIVATE_MS);
    // fire-and-forget：与超时定时器竞速，谁先到谁收口，finishPersistActivate 只跑一次。
    // 外层再兜一层 .catch：即便 SDK 入口本身抛同步异常，恢复链也不会被挂住。
    this.activatePersistedUri(this.savedDirUri).catch(() => {
      this.finishPersistActivate(false);
    });
  }

  /** 激活上次持久化的目录授权。**只传 picker 原始目录 URI 一个 policy**。
   *  ⚠️ 任何异常（权限未授予 / PERSISTENCE_FORBIDDEN / 服务不支持）都必须吞掉并降级，
   *     绝不抛出、绝不阻塞恢复链 —— 后面的 probeRestoreUris 会给出最终裁决。 */
  private async activatePersistedUri(dirUri: string): Promise<void> {
    const uris: Array<string> = persistPolicyUris(dirUri, '', PERSIST_POLICY_LIMIT);
    if (uris.length === 0) {
      this.finishPersistActivate(false);
      return;
    }
    const policies: Array<fileShare.PolicyInfo> = [];
    for (let i: number = 0; i < uris.length; i++) {
      const policy: fileShare.PolicyInfo = {
        uri: uris[i],
        operationMode: fileShare.OperationMode.READ_MODE
      };
      policies.push(policy);
    }
    try {
      await fileShare.activatePermission(policies);
      this.finishPersistActivate(true);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'persist: activate failed: %{public}s', JSON.stringify(e));
      this.finishPersistActivate(false);
    }
  }

  /** activate 收口点：只跑一次，清掉超时定时器，然后照常进入恢复链。
   *  ⚠️ 无论激活成功与否都**不改** probeRestoreUris / RESTORE_READONLY 的行为 ——
   *     那是上一轮修好的防冻结兜底，持久授权只是提高「探测通过」的概率。 */
  private finishPersistActivate(ok: boolean): void {
    if (this.persistSettled) {
      return;
    }
    this.persistSettled = true;
    if (this.persistTimer !== -1) {
      clearTimeout(this.persistTimer);
      this.persistTimer = -1;
    }
    this.persistActivated = ok;
    // 用户已经在这段时间里自己选了目录 → 别用恢复阶段的话覆盖他的状态栏。
    if (!this.userActed) {
      this.status = ok ? persistOkHint(PERSIST_TAG) : persistFailHint(PERSIST_TAG);
    }
    this.diagLine = 'persist ' + (ok ? 'OK' : 'FAIL') + ' | ' + PERSIST_TAG + ' | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'persist: activate=%{public}d tag=%{public}s', ok ? 1 : 0, PERSIST_TAG);
    this.showLastOnStart();
  }

  /** 用户用 picker 选过目录（或往上层补授权）后：把该目录 URI 持久授权并落盘。
   *
   *  ⚠️ 必须在拿到 `picker.select()` 返回的**原始 URI** 时调用 —— 那是用户授权的
   *     根节点；`openFolder` 里的 dirCandidates / 拼接子文件 uri 都不是。
   *  ⚠️ fire-and-forget：绝不让用户等一次跨进程调用才看到目录列表。 */
  private async persistFolderUri(dirUri: string): Promise<void> {
    const uris: Array<string> = persistPolicyUris(dirUri, '', PERSIST_POLICY_LIMIT);
    if (uris.length === 0) {
      return;
    }
    // 先更新内存：即使 persist 还没回来用户就切后台，flushPosSync 也会把授权根写下去。
    this.savedDirUri = uris[0];
    const policies: Array<fileShare.PolicyInfo> = [];
    for (let i: number = 0; i < uris.length; i++) {
      const policy: fileShare.PolicyInfo = {
        uri: uris[i],
        operationMode: fileShare.OperationMode.READ_MODE
      };
      policies.push(policy);
    }
    try {
      await fileShare.persistPermission(policies);
      await this.saveDirUri(uris[0]);
      this.persistActivated = true;
      hilog.info(DOMAIN, TAG, 'persist: folder uri persisted, len=%{public}d', uris[0].length);
    } catch (e) {
      // 某些 picker uri 不允许持久化（PERSISTENCE_FORBIDDEN），或权限尚未生效：
      // 记日志即可，启动恢复会靠探测 + 只读名单态兜底，绝不阻塞用户当前操作。
      this.persistActivated = false;
      hilog.warn(DOMAIN, TAG, 'persist: folder uri rejected: %{public}s', JSON.stringify(e));
    }
  }

  /** 把目录 URI 同步写进 preferences（下次启动 activate 要用）。
   *  选目录时立即写，不等 500ms 防抖；flushPos / flushPosSync 也会再补一次。 */
  private async saveDirUri(uri: string): Promise<void> {
    this.savedDirUri = uri;
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store === undefined) {
        return;
      }
      store.putSync(POS_KEY_DIR, uri);
      store.flushSync();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'persist: save dir uri failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 排一次「首帧后显示上次相片」。只排一个定时器，重复调用无副作用。
   *  ⚠️ 绝不在这里读 preferences / 读快照 / 建列表：这里还在启动调用栈上。 */
  private scheduleShowLast(): void {
    if (!AUTO_SHOW_LAST_ON_START || this.resumeDone || this.resumeTimer !== -1) {
      return;
    }
    if (!resumeDelaySafe(RESUME_DELAY_MS, WARM_DELAY_MS, RESUME_MIN_SAFE_MS)) {
      hilog.warn(DOMAIN, TAG, 'resume: unsafe delay %{public}d / warm %{public}d / min %{public}d, skip',
        RESUME_DELAY_MS, WARM_DELAY_MS, RESUME_MIN_SAFE_MS);
      return;
    }
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = -1;
      // 先（有超时兜底地）激活持久授权，再进入原来的恢复链；
      // 没有持久记录时 beginRestore 会直接落到 showLastOnStart，行为与旧版一致。
      this.beginRestore();
    }, RESUME_DELAY_MS);
  }

  /** 首帧之后真正执行恢复。只读「1 个小 key（snapCount）+ 分块 uri 快照」，
   *  绝不重扫图库、绝不弹权限框、绝不弹选择器 —— 无交互、无 ANR。
   *
   *  两条路径最终都会经过 applyItems() → showPreviewOf()，所以
   *  「当前路径 / 目录展示 / 往上层按钮状态」与正常载入完全一致：
   *  恢复出来的是**图片列表态**（browseBase=''），此时 canGoUp=false，但按钮仍亮着可点，
   *  点了由 browseUp() 给「请用选择文件夹进入目录浏览」提示（2026-11-11：不再 grey out）。 */
  private async showLastOnStart(): Promise<void> {
    if (this.resumeDone) {
      return;
    }
    this.resumeDone = true; // 只跑一次：无论成功、失败还是用户已抢先操作
    const saved: LastPos | undefined = this.lastPos;
    const savedUri: string = saved !== undefined ? saved.uri : '';
    const single: string = resumeSingleUri(savedUri, this.okUri);
    // 用户在这 900ms 里已经自己选了文件夹 / 图片，或列表已经有内容 → 立刻让路。
    const userActed: boolean = this.userActed || this.items.length > 0 ||
      this.pickerBusy || this.folderBusy;
    let snapCount: number = 0;
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store !== undefined) {
        const rawCount = await store.get(SNAP_KEY_COUNT, 0);
        snapCount = resumeSnapCap(typeof rawCount === 'number' ? rawCount : 0, SNAP_MAX);
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'resume: read snapCount failed: %{public}s', JSON.stringify(e));
    }
    const act: number = resumeAction(userActed, false, AUTO_SHOW_LAST_ON_START,
      snapCount, savedUri, this.okUri, true);
    if (act === RESUME_SKIP) {
      hilog.info(DOMAIN, TAG, 'resume: skip (userActed=%{public}d snap=%{public}d uri=%{public}d)',
        userActed ? 1 : 0, snapCount, single.length > 0 ? 1 : 0);
      return;
    }
    if (act === RESUME_SNAPSHOT) {
      const ok: boolean = await this.restoreFromSnapshot(); // setItems → applyItems → restoreIndex
      if (ok) {
        // 只读名单态（授权失效）时不说「已恢复图片」：名单在、图打不开，给明确指引。
        this.status = this.restoreHintText.length > 0
          ? this.restoreHintText
          : '已恢复上次会话 · ' + this.items.length + ' 张 · 第 ' +
            (this.cur + 1) + ' 张 · ' + RESUME_TAG +
            (this.persistActivated ? ' · ' + PERSIST_TAG + ' 目录授权已持久' : '') +
            (this.browseBase.length > 0
              ? ' · ' + restoreUpHint(baseName(this.browseBase), UP_CTX_TAG) : '');
        hilog.info(DOMAIN, TAG, 'resume: snapshot restored %{public}d items at %{public}d ro=%{public}d',
          this.items.length, this.cur, this.restoreHintText.length > 0 ? 1 : 0);
        return;
      }
      hilog.warn(DOMAIN, TAG, 'resume: snapshot empty/unreadable → fall back to single');
    }
    // 最轻兜底：只显示上次那一张。列表只有 1 张也没关系，画面不会空白；
    // warmLast() 已把它预解好，applyItems 会 adopt 进缓存 → 首屏立即命中。
    // act 走到这里只可能是 RESUME_SINGLE，或 RESUME_SNAPSHOT 读不出可用快照后的降级。
    if ((act === RESUME_SINGLE || act === RESUME_SNAPSHOT) && single.length > 0) {
      const src: string = saved !== undefined && saved.src.length > 0 ? saved.src : '上次会话';
      // 单张兜底同样先探授权：只有 1 张，探一次即可，不让 Image(uri) 兜底反复重试死 uri。
      const readable: boolean = this.probeRestoreUris([single], this.okUri, savedUri);
      this.pendingRestoreReadonly = !readable;
      this.pendingRestoreCount = 1;
      this.pendingRestoreSrc = src;
      this.setItems([single], src);
      // 回填目录层级：单张兜底同样要让「往上层」能用，不能只给名单就锁死层级。
      this.restoreBrowseContext();
      // ⚠️ setItems → applyItems 末尾会 markPos() + snapDirty=true，500ms 后 flushPos
      //    会把「只有 1 张」的列表写进快照，覆盖掉上次会话的整批 uri；位置记忆也会被
      //    改成 count=1 / idx=0。单张只是个临时兜底画面，**绝不能污染持久化数据**。
      //    这里撤销本次 setItems 的落盘副作用，保留原来的 lastPos / 快照。
      if (this.posTimer !== -1) {
        clearTimeout(this.posTimer);
        this.posTimer = -1;
      }
      this.posPending = undefined;
      this.snapDirty = false;
      if (saved !== undefined) {
        this.lastPos = saved;
      }
      this.status = this.restoreHintText.length > 0
        ? this.restoreHintText
        : '已显示上次看到的「' +
          (saved !== undefined && saved.name.length > 0 ? saved.name : baseName(single)) +
          '」· ' + RESUME_TAG + '（用「选择文件夹」可重新打开整批图片）' +
          (this.browseBase.length > 0
            ? ' · ' + restoreUpHint(baseName(this.browseBase), UP_CTX_TAG) : '');
      hilog.info(DOMAIN, TAG, 'resume: single shown, snapshot preserved, ro=%{public}d',
        this.restoreHintText.length > 0 ? 1 : 0);
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
      await store.put(POS_KEY_DIR, this.savedDirUri); // 下次启动 activate 的目录授权根
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

  /** 【同步】把「上次的位置 + 那张相片」落盘 —— 只给 onPageHide / aboutToDisappear 用。
   *
   *  为什么必须有它：flushPos() 的 `put` / `flush` 都是 Promise，切后台后进程随时被回收，
   *  那几个异步写常常一个都没完成 —— 表现就是「重开不记得上次看到哪张」。
   *  putSync + flushSync（API 10 / 14）同步写 6 个小 key，毫秒级、必达。
   *
   *  ⚠️ 这里**刻意不写大快照**：快照是几百条 uri，切后台同步写大 value 会拖慢页面隐藏，
   *     而且快照在换源时已由 flushPos() 的防抖写过；退出只需要补上「最后停在哪一张」。
   *     真正没写过的极端情况（刚换源 500ms 内就退出）由启动时的单张兜底覆盖。 */
  private flushPosSync(): void {
    let p: LastPos | undefined = this.posPending;
    if (p === undefined) {
      p = this.lastPos; // 防抖已经写过一轮，但 lastPos 始终是最新的
    }
    const store: preferences.Preferences | undefined = this.prefs;
    const act: number = exitFlushAction(p !== undefined, store !== undefined);
    if (act === FLUSH_SKIP) {
      return;
    }
    if (act === FLUSH_ASYNC || store === undefined || p === undefined) {
      this.flushPos(); // prefs 还没建好（极端早退），只能退回异步尽力而为
      return;
    }
    try {
      store.putSync(POS_KEY_IDX, p.idx);
      store.putSync(POS_KEY_URI, p.uri);
      store.putSync(POS_KEY_NAME, p.name);
      store.putSync(POS_KEY_COUNT, p.count);
      store.putSync(POS_KEY_SRC, p.src);
      store.putSync(POS_KEY_OK, this.okUri);
      store.putSync(POS_KEY_DIR, this.savedDirUri); // 切后台也补一次，进程被杀不丢授权根
      store.flushSync();
      this.posPending = undefined;
      hilog.info(DOMAIN, TAG, 'flushPosSync: idx=%{public}d uri=%{public}s',
        p.idx, p.uri.length > 0 ? 'yes' : 'no');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'flushPosSync failed: %{public}s', JSON.stringify(e));
      this.flushPos();
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
      // ⚠️ 恢复前只探最多 3 张：重启后逐 URI 授权通常整体失效。
      //    证实可读才走完整恢复（预载 / 补体积 / 解码照常）；证伪则落只读名单态，
      //    绝不把几百次同步跨进程 IO 打到主线程上（那正是「名单在、界面全卡住」的根因）。
      const readable: boolean = this.probeRestoreUris(uris, this.okUri,
        p !== undefined ? p.uri : '');
      this.pendingRestoreReadonly = !readable;
      this.pendingRestoreCount = uris.length;
      this.pendingRestoreSrc = src;
      this.setItems(uris, src);       // 内部 applyItems → applyPendingRestore → restoreIndex
      // setItems 清空了 browseBase / browseDir / pickRootUri —— 这里把持久授权的
      // 原始目录 URI 还原回来，否则重开后「往上层」永远停在「没有上层目录」。
      this.restoreBrowseContext();
      this.snapDirty = false;         // 列表本来就是从快照来的，没必要再写回去
      this.status = this.status + '（来自上次会话）';
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
   *  代号校验：切图后旧回调一律作废，避免右页显示成上一对的图。
   *
   *  2026-11-11：解码档位从 preloadEdge() 提到与左页相同的 viewEdge()；
   *  命中的预载缓存若档位不足也继续重解，避免「低清图被拉成半屏」的锯齿/发虚。
   *  第三轮：判据改成与左页**同一个** displayEdge()（ViewPlan.displayEdgeOf），
   *  两边不会再出现「一边用 1536、一边用 1800」的档位差；重解结果写回缓存，
   *  下一次翻回来直接命中，不重复解码。 */
  private loadRightPage(uri: string): void {
    this.rightToken++;
    const token: number = this.rightToken;
    this.releaseRightOwned();   // 上一张右页若是自解码的，先释放
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    const srcLong: number = hit !== undefined ? Math.max(hit.w, hit.h) : 0;
    const need: number = this.displayEdge(srcLong);
    if (hit !== undefined && hit.edge >= need) {
      this.rightOwned = undefined;
      this.rightPixelMap = hit.px;
      return;
    }
    this.decodeTo(uri, need)
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
        // 交给缓存持有（不再自持有，避免与缓存淘汰双重 release）
        this.rightOwned = undefined;
        this.rightPixelMap = undefined;  // 先撤旧引用，让 upgradePreview 安全 release
        const best: PreviewEntry = this.upgradePreview(e);
        this.rightPixelMap = best.px;
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
    this.inAppUpList = false;   // 回到图片列表态：APP 内清单标记作废
    // 没有浏览历史栈可清：往上层只认 browseBase；它在上面置空后，
    // applyItems() 会把 canGoUp 刷成 false（仅用于提示文案，按钮仍然亮着可点）。
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
    // ⚠️ 必须**先**落地恢复模式：下面 showPreviewOf / fillSizes / schedulePreload /
    //    refreshSpread 全都要读它。只读名单态时它们会被闸门挡住，主线程保持空闲。
    this.applyPendingRestore(list.length, src);
    const ioOk: boolean = bulkIoAllowed(this.restoreMode);
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
    // 「是否仍有父级」的**唯一**刷新点：与 titlePath 同源，都取自当前真实路径。
    // 任何换源 / 进子目录 / 往上层 / 重扫 / 快照恢复都会经过 applyItems，
    // 因此状态栏文案、诊断串、目录表与点击行为不可能各说各话。
    // ⚠️ 2026-11-11 用户要求「不要 grey out、不能禁用」：本字段**不驱动按钮外观**，
    // 「往上层」恒为可点；非目录浏览态点击只会得到「请用选择文件夹」提示。
    this.canGoUp = canGoUpFrom(this.browseBase);
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
    // ⚠️ 只读名单态（ioOk=false）：名单已建好、cur 已落位，但**绝不**碰 uri —— 解码 /
    //    补体积 / 预载 / 对开探测一律跳过。否则几百次失败的同步跨进程调用会把主线程打满，
    //    表现就是「名单在、图片白、按钮和列表全点不动」。UI 由 restoreHintText 提示卡接管。
    if (!keepView && ioOk) {
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
    if (ioOk) {
      this.refreshSpread();
      this.schedulePreload();
    } else {
      // 清掉可能残留的上一批视图，避免只读态还显示一张不属于这批的旧图。
      this.releaseViewOwned();
      this.viewPixelMap = undefined;
      this.viewFailed = false;
      this.clearBlur();
      this.spreadB = -1;
      this.clearRightPage();
      this.cacheCount = 0;
      this.cacheBytes = this.preloadBytes;
    }
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
    // 只读名单态：绝不逐个 statSync（最多 600 次同步跨进程调用会打满主线程）。
    if (!bulkIoAllowed(this.restoreMode)) {
      return;
    }
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
    // 只读名单态：绝不对失效授权 uri 做 statSync（同步跨进程调用）。
    // 已有体积就照实显示，没有就留 0，重新授权后由 fillSizes 补齐。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.bytes = it.size > 0 ? it.size : 0;
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

  /** 全屏切换：把缩放 / 平移复位到「适应窗口」，让 objectFit(Contain) 按放大后的
   *  画布把图片铺满放大。刻意不动 rot / flip —— 用户手动旋转不该因切全屏而丢失。
   *  配合 refreshForCanvasResize() 按新画布重解码，图片就是「跟窗口一齐适配放大」而不是拉大旧图。 */
  private fitToWindow(): void {
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
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
      // APP 内清单态：第三参 false 禁掉「目录内多选」兜底选择器 ——
      // 用户点清单里的目录名只应在 APP 内继续列目录，绝不弹任何系统 dialog。
      this.openFolder(r.uri, true, !this.inAppUpList);
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
    // 只读名单态：名单照常可选 / 高亮 / 记位置，只切断一切 uri IO。
    // 状态栏给一句明确指引 —— 按钮和列表「点了必须看得见反应」，不能像死了一样。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.scroller.scrollToIndex(this.rowOfItem(idx), false);
      this.status = readonlyTapHint(this.items[idx].name);
      this.dataSource.reload(this.rows);
      this.markPos();
      return;
    }
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
    // 只读名单态：滚轮 / 翻页照常走名单（位置、高亮、记忆都更新），
    // 只切断解码与元数据 IO，并给一句看得见的反馈。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.scroller.scrollToIndex(this.rowOfItem(this.cur), false);
      this.status = readonlyTapHint(this.items[this.cur].name);
      this.dataSource.reload(this.rows);
      this.markPos();
      return;
    }
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
  //   · 后台把当前位置「前后各 100 张」按**可直接显示的清晰度**解码并缓存（preloadEdge()）；
  //     窗口 201 张，实际驻留由张数 / 字节双重预算裁剪（2026-11-11「尽量缓存前后 100 张」）。
  //   · 切到某张时命中缓存 → **立刻上主视图，不再解码**；
  //     只有放大到缓存档位不够时才停手 250ms 补一张全清（连续翻页会被下一切图作废）。
  //   · 未命中 → 768 低清占位（只是不空白）+ 立刻解可显示清晰度。
  //   · 窗口**跟着当前位置滑动且环绕**（evictOutside / windowUris）：
  //     翻到哪缓存哪附近，跨首尾也不重解；翻一整个大图库内存不会一路涨上去。
  //   · 预算触顶就收工（preloadSaturated）：窗口比设备内存装得下的时候，
  //     再解一张只会把窗口里另一张挤掉，链会变成「解→淘汰→再解」的死循环。
  //     前后交替补齐（preloadOrder）保证预算不足时两个方向都有覆盖。
  //   · 档位不能按原图分辨率预载（几十张就是几个 GB），故夹在 [1024, 1536]。
  //
  //  ⚠️ 旧版把预载定为 768px「仅供模糊占位」，于是每张命中缓存的图都还要再解一次
  //  「画布长边×2」的全清 —— 大图那一次能解到 1 秒以上，切图卡顿就是这么来的。
  // ------------------------------------------------------------------

  /** 按给定长边上限解码一张图。失败返回 undefined（不影响正常显示路径）。
   *  edge = QUICK_EDGE(768) 得到低清占位；edge = preloadEdge() 得到「可显示清晰度」的预载；
   *  edge = viewEdge() 得到放大时用的全清图。三种场景共用同一套系统 codec。 */
  private decodeTo(uri: string, edge: number): Promise<PreviewEntry | undefined> {
    // ⚠️ 只读名单态的总闸门：所有主视图 / 预载 / 右页 / 预热解码都从这里过。
    //    恢复出来的是一批授权已失效的死 uri，任何一次 decodePx 都是同步跨进程 openSync；
    //    在这里集中短路，比在每个调用点各挡一次更可靠，也杜绝漏网。
    if (!bulkIoAllowed(this.restoreMode)) {
      return Promise.resolve<PreviewEntry | undefined>(undefined);
    }
    // 抽离到模块级 decodePx：列表缩略图也用同一份解码逻辑（同一套系统 codec）
    return decodePx(uri, edge);
  }

  /** 查缓存；命中则移到队尾（LRU）。返回整条 Entry（过渡层还要用它的原图宽高）。
   *
   *  2026-11-11 第三轮：同一个 uri 可能同时存在 768 低清占位 / 1536 预载 / 1800 全清
   *  （三条异步链并行），只取「从队尾数第一条」会在低清链慢到时把低档位图当命中。
   *  改为在同 uri 里挑 **edge 最大的那条**：左右页永远拿到最高画质那张。 */
  private previewEntry(uri: string): PreviewEntry | undefined {
    let bestIdx: number = -1;
    for (let i = this.previews.length - 1; i >= 0; i--) {
      if (this.previews[i].uri !== uri) {
        continue;
      }
      if (bestIdx < 0 || this.previews[i].edge > this.previews[bestIdx].edge) {
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      return undefined;
    }
    const e: PreviewEntry = this.previews[bestIdx];
    if (bestIdx !== this.previews.length - 1) {
      this.previews.splice(bestIdx, 1);
      this.previews.push(e);
    }
    return e;
  }

  /** 原图长边（decodePx 的 w/h 记的是原图尺寸，不是解码后尺寸）。
   *  查不到返回 0 → displayEdgeOf 不夹上限，desiredSize 本来也不会把图放大。 */
  private srcLongOf(uri: string): number {
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    return hit !== undefined ? Math.max(hit.w, hit.h) : 0;
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

  /** 把「按显示档位重解出来的全清图」写回缓存，返回**最终该上屏的那张**。
   *
   *  2026-11-11 第三轮：以前全清图是 viewOwned / rightOwned **自持有**、从不进缓存，
   *  于是 previews 里同一个 uri 可能留着 768 低清占位或 1536 预载图，
   *  左页命中它就判「够用」不再升级，而右页严格重解 —— 左边比右边糊。
   *  现在同 uri 只留 edge 最大的那张：左右页都命中同一张全清图，每张只解一次（不卡）。
   *  并发下若低清链慢到、或 zoom 变小导致新解档位更低，只会**升档不会降档**。
   *
   *  ⚠️ 调用方必须先撤掉 viewPixelMap / rightPixelMap 的旧引用再调本函数：
   *     这里会同步 release 被替换掉的 PixelMap，紧接着调用方在同一帧换上新引用，不会花屏。 */
  private upgradePreview(e: PreviewEntry): PreviewEntry {
    const removed: PreviewEntry[] = [];
    let best: PreviewEntry = e;
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const old: PreviewEntry = this.previews[i];
      if (old.uri !== e.uri || old.px === e.px) {
        continue;
      }
      if (old.edge > best.edge) {
        best = old;
      }
      this.previews.splice(i, 1);
      this.preloadBytes -= old.bytes;
      removed.push(old);
    }
    for (let j = 0; j < removed.length; j++) {
      const old: PreviewEntry = removed[j];
      if (old.px === best.px || old.px === this.lowPixelMap || old.px === this.rightPixelMap) {
        continue; // 仍被过渡层 / 右页引用，或就是选中的那张 → 不 release
      }
      try {
        old.px.release();
      } catch (err) {
        hilog.warn(DOMAIN, TAG, 'release replaced preview skipped');
      }
    }
    if (e.px !== best.px) {
      try {
        e.px.release(); // 缓存里已有更高档位 → 丢弃这次低档位解码结果
      } catch (err) {
        hilog.warn(DOMAIN, TAG, 'release lower-grade preview skipped');
      }
    }
    this.pushPreview(best);
    return best;
  }

  /** 把缓存账目同步给右下角角标（只显示张数）。改动落在三处口子上：pushPreview / evictOutside / clearPreviews。 */
  private syncCacheStat(): void {
    this.cacheCount = this.previews.length;
    this.cacheBytes = this.preloadBytes;
  }

  /** 释放「窗口外」的缓存 —— 让缓存真正跟着位置滑动。
   *  只靠 LRU 容量淘汰的话，跳转（回到上次 / 点列表跳很远）之后，远处那一批旧图还会赖着，
   *  把新窗口的位置挤掉；这里按位置主动清掉，翻多远内存都稳定在窗口大小。
   *  ⚠️ 窗口扩到前后各 100 后不能逐条调 inWindow()（O(缓存数 × 窗口数) ≈ 216×201）；
   *     先建一次窗口 uri 集合，复杂度降到 O(缓存数 + 窗口数)。 */
  private evictOutside(): void {
    if (this.cur < 0) {
      return;
    }
    const win: Set<string> = this.windowUris();
    for (let i = this.previews.length - 1; i >= 0; i--) {
      const e: PreviewEntry = this.previews[i];
      if (win.has(e.uri)) {
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

  /** 当前窗口内的所有 uri（环绕），一次建好给 evictOutside 查表用。
   *
   *  ⚠️ 窗口是**环绕**的（Win64 版 10-27 提交 8cde542）：go() 本来就按模运算循环，
   *  翻过最后一张就回到第一张，缓存窗口若还按线性截断，每次跨过首尾都要重新解码一批图 ——
   *  绕回第一张时会明显卡一下。图库比窗口小时取 min(span, n-1)，避免绕整圈重复。 */
  private windowUris(): Set<string> {
    const win: Set<string> = new Set<string>();
    const n: number = this.items.length;
    if (n === 0 || this.cur < 0) {
      return win;
    }
    const back: number = Math.min(PRELOAD_BACK, n - 1);
    const fwd: number = Math.min(PRELOAD_FWD, n - 1);
    for (let k: number = -back; k <= fwd; k++) {
      win.add(this.items[this.wrapIndex(k)].uri);
    }
    return win;
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
    // 新张还没解码出来前，别把上一张的色彩 / HDR / EXIF 元数据挂在信息浮层上
    this.viewColorSpace = 0;
    this.viewIsHdr = false;
    this.viewExifDegrees = 0;
    this.viewHdrWanted = false;
    // 只读名单态：不解码，也不让 viewFailed 变 true —— 否则 previewImage 会画
    // Image(uri) 交给系统对死 uri 反复重试。画面留中灰，由预览区指引卡接管。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.clearBlur();
      return;
    }
    if (idx < 0 || idx >= this.items.length) {
      this.clearBlur();
      return;
    }
    const uri: string = this.items[idx].uri;
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    if (hit !== undefined) {
      // ① 命中缓存 → 先上屏（翻页快的关键），再按左右页共用的判据看档位够不够
      this.showDecoded(hit);
      const need: number = this.showNeed(hit);
      // ② 档位不够才补一张全清；够就不必再解。
      //    升级结果由 upgradePreview() 写回缓存，所以每张只解一次，不会每次翻页都重解
      //    （早先不管够不够都解一次全清，每张多花几百毫秒，切图卡顿就是这么来的）。
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
    this.setViewMeta(e);
    this.clearBlur();      // FOCUS_BLUR 关掉后不再有过渡层，这里只是把状态归零
  }

  /** 把解码结果里的色彩 / HDR / EXIF 元数据同步给信息浮层与 HDR 显示模式。 */
  private setViewMeta(e: PreviewEntry): void {
    this.viewColorSpace = e.colorSpace;
    this.viewIsHdr = e.isHdr;
    this.viewExifDegrees = e.exifDegrees;
    this.viewHdrWanted = e.isHdr || isWideGamutOf(e.colorSpace);
  }

  /** 这张图按当前画布 / zoom 实际需要解到多少（长边）。
   *
   *  2026-11-11 第三轮：判据抽到 ViewPlan.displayEdgeOf，与并排右页**共用同一个函数**。
   *  旧口径只看「画布 × zoom × 1.05」（普通态约 1260），比右页的 viewEdge()（1800 /
   *  全屏 3840）宽松得多，左页因此长期停留在预载的 1536 档位 —— 这就是「左边比右边差」。
   *  srcLong 用条目里的原图宽高；原图小于需求时夹到原图长边，再解也不会更清楚。 */
  private showNeed(e: PreviewEntry): number {
    return this.displayEdge(Math.max(e.w, e.h));
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
    const edge: number = this.displayEdge(this.srcLongOf(uri));
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
    // 全清图交给缓存持有（viewOwned 留空），替换同 uri 的低档位 / 768 占位条目：
    // 左页与右页此后都能命中同一张最高档位图，且不会与缓存淘汰双重 release。
    this.viewPixelMap = undefined;   // 先撤旧引用，让 upgradePreview 安全 release
    const best: PreviewEntry = this.upgradePreview(ret);
    this.viewPixelMap = best.px;
    this.imgW = best.w;
    this.imgH = best.h;
    this.setViewMeta(best);
    if (FOCUS_BLUR) {
      this.finishFocus(); // 清晰图到位 → 低清模糊层淡出（这才是「动态模糊」的收尾）
    } else {
      this.clearBlur();
    }
  }

  /** 主视图解码的长边：画布长边 × 系数，夹在 [1200, 4096] 内控内存。
   *  全屏用更大的系数（FULLSCREEN_VIEW_EDGE_FACTOR = 2.0）：画布变大必须按新尺寸解到位，
   *  不能沿用旧分辨率的 PixelMap 让 GPU 拉大 —— 那是「发虚」与 resample 掉画质的根源。 */
  private viewEdge(): number {
    return viewEdgeOf(this.canvasW, this.canvasH, this.fullscreen,
      VIEW_EDGE_FACTOR, FULLSCREEN_VIEW_EDGE_FACTOR, VIEW_EDGE_MIN, VIEW_EDGE_MAX);
  }

  /** 左右页共用的显示档位判据（纯函数在 ViewPlan，可 Node 单测）。
   *  srcLong = 原图长边；<= 0 表示未知。左右页、全清升级、尺寸变化重解全部走这里，
   *  从根上杜绝「一边 1536、一边 1800」的档位差。 */
  private displayEdge(srcLong: number): number {
    return displayEdgeOf(this.viewEdge(), this.canvasW, this.canvasH,
      this.zoom, DISPLAY_HEADROOM, srcLong);
  }

  /** 画布尺寸变了（多半是进出全屏）：按新尺寸「立刻」重解当前这张，不走 UPGRADE_DELAY_MS。
   *  旧实现只调 showPreviewOf()，命中缓存时会被 showNeed() 判成「够用」而沿用旧档位图，
   *  等于把小图拉大。这里直接 curToken++ 后 loadViewNow(0 延迟) + 按新档位补预载。 */
  private refreshForCanvasResize(): void {
    if (this.cur < 0 || this.cur >= this.items.length) {
      return;
    }
    if (!bulkIoAllowed(this.restoreMode)) {
      return;
    }
    const uri: string = this.items[this.cur].uri;
    this.curToken++;
    const token: number = this.curToken;
    this.loadViewNow(uri, token);
    this.schedulePreload();
    // 并排对开时右页也要按新画布档位重解：否则左页跟着窗口放大了，右页仍是
    // 旧的小图被拉成半屏（发虚 / 锯齿）。用户要求「预览图案跟窗口一齐适配放大」含两页。
    if (this.spreadB >= 0 && this.spreadB < this.items.length) {
      this.loadRightPage(this.items[this.spreadB].uri);
    }
  }

  /** 进出全屏后的收口重解：无条件按「最终」画布尺寸再解一次。
   *  真全屏的 maximize / layout 是一连串异步 await：应用内三块栏隐藏会先触发一次
   *  onAreaChange 把 pendingReload 消费掉（那时窗口还是旧尺寸），等 maximize 真正完成、
   *  窗口变大了，pendingReload 已是 false，第二次尺寸变化就不会再重解 —— 图片停在旧档位。
   *  所以这里不去判断 pendingReload，到点总按最新 canvasW/H 重解一次（左右页都算），
   *  配合 setFull 里的 fitToWindow() 保证「预览图跟窗口大小一齐适配放大」。 */
  private armCanvasReloadFallback(): void {
    this.clearCanvasReloadFallback();
    this.canvasReloadTimer = setTimeout(() => {
      this.canvasReloadTimer = -1;
      this.pendingReload = false;
      this.refreshForCanvasResize();
    }, CANVAS_RELOAD_FALLBACK_MS);
  }

  private clearCanvasReloadFallback(): void {
    if (this.canvasReloadTimer !== -1) {
      clearTimeout(this.canvasReloadTimer);
      this.canvasReloadTimer = -1;
    }
  }

  /** 预载档位：按画布尺寸动态取，向上量化到 PRELOAD_QUANT 的倍数。
   *  全屏时上限放宽到 FULLSCREEN_PRELOAD_MAX_EDGE（普通态 1536），让前后 100 张也跟着画布放大。
   *  ⚠️ 必须是 ceil 不是 floor：向下量化会让档位小于屏幕实际像素，命中缓存还得再解一次全清。 */
  private preloadEdge(): number {
    return preloadEdgeOf(this.canvasW, this.canvasH, this.fullscreen,
      PRELOAD_EDGE_FACTOR, PRELOAD_QUANT, PRELOAD_MIN_EDGE, PRELOAD_MAX_EDGE,
      FULLSCREEN_PRELOAD_MAX_EDGE);
  }

  /** 启动后台预载。已在跑就只自增代号，让现有链自动跟到最新位置，避免并发多条链。 */
  private schedulePreload(): void {
    // 只读名单态：不启动预载链（窗口最多 201 张，逐张 decodePx 全是死 uri）。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.preloadBusy = false;
      return;
    }
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
    // 前后交替、先近后远地找第一张还没缓存的图：预算装不下整窗时两个方向都留有覆盖，
    // 不会变成「前方 100 张占满预算、后方一张都没有」（见 PreloadBudget.preloadOrder）。
    const order: number[] = preloadOrder(backSpan, fwdSpan);
    for (let i = 0; i < order.length; i++) {
      const u: string = this.items[this.wrapIndex(order[i])].uri;
      if (this.previewEntry(u) === undefined && !this.failed.has(u)) {
        target = u;
        break;
      }
    }
    if (target.length === 0) {
      this.preloadBusy = false; // 窗口内都预载好了
      // 窗口理论容量 = 前 span + 后 span + 当前张；不足说明有图解不开，或被字节上限挤掉。
      const want: number = preloadWindowSize(backSpan, fwdSpan, n);
      hilog.info(DOMAIN, TAG,
        'preload: window full, cached %{public}d/%{public}d, %{public}d MB, failed=%{public}d, tick %{public}d',
        this.previews.length, want, Math.round(this.preloadBytes / (1024 * 1024)), this.failed.size, this.probeTick);
      if (this.previews.length < want && this.previews.length > 0) {
        hilog.warn(DOMAIN, TAG, 'preload: window NOT full — 多为坏图黑名单，或 PRELOAD_MAX_BYTES 上限挤出');
      }
      return;
    }
    // 「尽量」的收工点：窗口 201 张可能装不进设备内存预算。此时再解一张只会把窗口里
    // 另一张挤掉，链会变成「解 → 淘汰 → 又发现缺口 → 再解」的死循环（CPU 打满）。
    // 触到预算就收工，实际驻留多少看角标；下次切图 evictOutside 释放窗口外旧图后会自动再补。
    if (preloadSaturated(this.previews.length, this.preloadBytes, PRELOAD_COUNT, PRELOAD_MAX_BYTES)) {
      this.preloadBusy = false;
      hilog.info(DOMAIN, TAG,
        'preload: budget reached, cached %{public}d/%{public}d, %{public}d/%{public}d MB — 窗口尽力填充',
        this.previews.length, preloadWindowSize(backSpan, fwdSpan, n),
        Math.round(this.preloadBytes / (1024 * 1024)),
        Math.round(PRELOAD_MAX_BYTES / (1024 * 1024)));
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
    // 只读名单态：不碰任何 uri（createImageSource / createPixelMap 都是跨进程 IO）。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
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
    // 只读名单态：即便被 isPortrait 间接调到，也绝不 createImageSource 死 uri。
    if (!bulkIoAllowed(this.restoreMode)) {
      return;
    }
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
          this.pickRootUri = dirUri; // 目录态被 setItems 清了，记住原始目录供「往上层」用
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
    this.userActed = true; // 用户一动手，启动恢复就不该再抢视图
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
          // 这是 picker 授予的**原始目录 URI**：立刻建立持久授权，
          // 下次重开就能直接出图，不必再选一次文件夹。fire-and-forget，不挡列目录。
          this.persistFolderUri(uris[0]);
          this.pickRootUri = uris[0]; // 只作 picker 起点，不参与父级推算
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
   *  resetView=true（进入子目录）时从第一张开始；false（重扫 / 排序 / 目录切换）时
   *  尽量按 uri 找回落点保持当前张不闪。
   *  ⚠️ 这里**没有任何浏览历史栈**：上级只由 browseUp() 按 browseBase 的目录层级算出，
   *     与「从哪条路径进来」无关，连续点击才会逐级上移而不是沿来路绕圈。
   *  ⚠️ 鸿蒙 DocumentViewPicker 授予的是 URI，fs.listFile / statSync 对它不一定有权限；
   *     失败时明确提示，不静默吞掉（Win64 走的是真实文件系统路径）。 */
  /** 返回是否真的进入了目录浏览态（失败时当前路径 / 按钮状态一律不动）。 */
  /** allowFileFallback：目录能列但子文件读不了时，是否弹「目录内多选」选择器。
   *  「往上层」传 false —— 那种兜底会调 setItems 把目录态清掉，反而让往上层白做。 */
  private async openFolder(dirUri: string, resetView: boolean, allowFileFallback?: boolean,
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
      // 对齐 Windows 文件管理器：只要还在目录浏览态就恒列「..」行，与「向上」按钮一样
      // 永不因内部路径判定而消失。到卷根时点了由 browseUp() 给「没有父级了」提示、不上移。
      // 2026-11-11：旧版用 canGoUpFrom(base) 控制这一行，遇到还原不出卷根的文档 URI
      // 会把深层目录的「..」行也一起藏掉 —— 那正是「按钮区莫名其妙变灰 / 少一行」的来源。
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
      // 不再压任何「来路」栈：旧实现往上层时 pop 的是浏览历史，不是当前路径的父级，
      // 连续点击会沿历史绕圈 / 越级。现在只把 base 记为唯一当前路径真值。
      // 进入新目录前，把「当前这份目录清单」按真实路径记下来（只存条目名，纯字符串）。
      // 用户随后点「往上层」回到这一层、而上级授权已失效列不出真实内容时，
      // showUpListInApp 就能在 APP 内还原档案清单，不必弹系统选择目录 dialog。
      if (this.browseBase.length > 0 && this.rows.length > 0) {
        const cacheNames: Array<string> = [];
        for (let i = 0; i < this.rows.length; i++) {
          const rn: ImageItem = this.rows[i];
          if ((rn.kind ?? ROW_IMAGE) !== ROW_UP) {
            cacheNames.push(rn.name);
          }
        }
        this.lastUpPath = stripTrailingSlash(this.browseBase);
        this.lastUpNames = cacheNames;
      }
      this.inAppUpList = false;   // 这次是真列出来的目录态，不是 APP 内自建清单
      this.browseDir = dirUri;
      this.browseBase = base;
      this.dirMtime = this.tryMtime(base);
      this.startDirPoll();
      // 重扫时保持当前张：按 uri 找回落点，不让画面闪一下（Win64 2bcbbb1）
      this.applyItems(imgs, dirLabel, '', rows, isRescan === true);
      if (keepUri.length > 0 && !resetView) {
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
    this.userActed = true; // 用户主动挑图：启动恢复让路
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
        // 2026-11-11：按钮**永不禁用**，任何状态都能点进来。
        // 按钮 / 键盘退格 / '..' 行三条入口全部收口 browseUp()，由 upNavStateOf
        // 分派（上移 / 到顶提示 / 图片列表提示 / URI 层级判不出的兜底），结论一致。
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

  /** 往上层：按**目录层级**进入当前路径的直接父级，对齐 Windows 文件管理器的「向上」。
   *
   *  2026-11-10 语义重写（本次需求）：旧实现是「按浏览历史回退」——
   *    · 优先弹出浏览历史栈，栈里存的是「进过子目录前的那个目录」，不是当前路径的父级，
   *      连续点击会沿历史绕圈、越级，而不是逐级上移；
   *    · 还把 browseBase / browseDir / pickRootUri 三个锚点（可能处在**不同层级**）
   *      各自算父级再混在一起试，命中哪个全看授权 —— 这就是「越级 / 状态不一致」的来源；
   *    · 没有「是否仍有父级」的按钮状态，到顶了还会继续弹选择器。
   *
   *  现在只认一个真值：browseBase（openFolder 实测能列目录的真实路径）。
   *    · upLevelOf() 严格只剥一层，volumeRootOf() 定出卷的逻辑最上层；
   *    · upNavStateOf() 区分「真到卷根」与「URI 层级判不出」；按钮永不置灰 / 永不禁用；
   *    · upParentCandidates() 只生成同一父层的不同 URI 写法供逐 URI 授权尝试，
   *      任何候选都用 sameDirPath 校验落在同一层，杜绝越级与绕圈；
   *    · 连续点击逐级 L4→L3→L2→L1→L0，到卷根后不再上移；
   *    · 成功后 openFolder → applyItems 统一刷新当前路径 / 目录展示 / 按钮状态，
   *      并清掉 pickRootUri 这个与层级无关的旧锚点，三者不可能各说各话。 */
  private async browseUp(): Promise<void> {
    if (this.folderBusy) {
      this.status = '往上层：上一批目录还在列，稍候再点';
      return;
    }
    // 只读名单态 + **没有**目录层级（老快照没存过 picker 原始目录 URI）：
    // 绝不禁用按钮 —— 点了必须给明确指引，不能像没反应一样（2026-11-11 实机反馈）。
    // 2026-11-11 第三次反馈：若 restoreBrowseContext 已从持久授权目录 URI 重建层级，
    // 就不要再早退 —— 继续走正常层级链，父目录列不出来时由 showUpListInApp
    // 在 APP 内出清单（用户主动点击才发生，不是启动期批量 IO，不违反防冻结底线）。
    if (this.restoreMode === RESTORE_READONLY && this.browseBase.length === 0) {
      this.status = readonlyUpHint();
      this.diagLine = 'up READONLY | ' + RESTORE_TAG + ' | 无目录层级 | v' + APP_VERSION;
      return;
    }
    // 唯一的当前路径：目录浏览态就是实测能列的真实路径；非目录浏览态为空。
    const current: string = this.browseBase;
    const state: number = upNavStateOf(current);
    const level: number = dirLevelOf(current);
    const root: string = volumeRootOf(current);
    // 严格层级链用 upLevelOf；UNKNOWN（卷根判不出的文档 / content URI）再退到
    // 「严格剥一层」的宽松父级，保证按钮点了确实能上移，而不是被误报成「已到最上层」。
    let target: string = upLevelOf(current);
    let loose: boolean = false;
    if (target.length === 0 && state === UP_NAV_UNKNOWN) {
      target = upLooseParentOf(current);
      loose = target.length > 0;
    }
    const canUp: boolean = target.length > 0;
    // canGoUp 只是信息状态（状态栏 / 诊断串），按钮本身永不置灰 / 永不禁用。
    this.canGoUp = canUp;
    this.diagLine = 'up START | ' + UP_NAV_TAG + ' | st=' + state +
      ' | L' + level + '→' + (canUp ? 'L' + dirLevelOf(target) : 'TOP') +
      (loose ? ' | loose' : '') +
      ' | can=' + (canUp ? '1' : '0') +
      ' | cur=' + ellipsizeMiddle(current, 30) +
      ' | root=' + ellipsizeMiddle(root, 24) + ' | v' + APP_VERSION;
    if (!canUp) {
      // 三种「不动」要分开说清楚，绝不把 URI 解析失败误报成「已到最上层」。
      if (state === UP_NAV_NONE || current.length === 0) {
        this.status = '当前是图片列表，没有上层目录（用「选择文件夹」进入目录浏览）';
      } else if (state === UP_NAV_TOP) {
        this.status = '已到卷 / 硬盘的逻辑最上层「' + baseName(current) + '」· 没有父级了';
      } else {
        this.status = '往上层：当前目录标识无法还原层级「' + baseName(current) +
          '」· 请用「选择文件夹」重新进入该目录后再试';
      }
      this.diagLine = 'up NOGO | ' + UP_NAV_TAG + ' | st=' + state + ' | L' + level +
        ' | root=' + ellipsizeMiddle(root, 24) + ' | can=0 | v' + APP_VERSION;
      return;
    }
    const rawUri: string = this.browseDir.length > 0 ? this.browseDir : current;
    // UNKNOWN 态 upLevelOf 为空，必须显式传入宽松父级，否则候选集为空、按钮又变成没反应。
    const parents: string[] = loose
      ? upParentCandidates(current, rawUri, target)
      : upParentCandidates(current, rawUri);
    const targetName: string = baseName(target);
    this.status = '往上层 L' + level + '→L' + dirLevelOf(target) + ' → ' + targetName;
    this.diagLine = 'up | ' + UP_NAV_TAG + ' | L' + level + '→L' + dirLevelOf(target) +
      ' | ' + parents.length + ' 同层候选 | target=' + targetName +
      ' | root=' + ellipsizeMiddle(root, 24) + ' | v' + APP_VERSION;
    for (let i = 0; i < parents.length; i++) {
      const parent: string = parents[i];
      hilog.info(DOMAIN, TAG, 'browseUp L%{public}d→L%{public}d try %{public}s (cand %{public}d/%{public}d)',
        level, dirLevelOf(target), parent, i + 1, parents.length);
      this.status = '往上层 ' + (i + 1) + '/' + parents.length + ' → ' + targetName;
      this.diagLine = 'up ' + (i + 1) + '/' + parents.length + ' | ' + UP_NAV_TAG +
        ' | try=' + ellipsizeMiddle(parent, 46) + ' | 失败原因见状态栏';
      // 第三参 false：不再弹「目录内多选」，否则 setItems 会把刚进去的目录态清掉
      const ok: boolean = await this.openFolder(parent, false, false);
      if (ok) {
        // 旧「最初选择」锚点作废：它指向好几层之前，留着会让下一次往上层越级。
        this.pickRootUri = '';
        // applyItems 已把 browseBase / browseDir / source / titlePath / canGoUp 一起刷新到父层。
        this.status = '往上层 → ' + baseName(this.browseBase) +
          '（L' + dirLevelOf(this.browseBase) + '）· ' +
          (this.canGoUp ? '还能继续往上层' : '已到卷 / 硬盘的逻辑最上层');
        this.diagLine = 'up OK | ' + UP_NAV_TAG + ' | L' + dirLevelOf(this.browseBase) +
          ' | can=' + (this.canGoUp ? '1' : '0') + ' | v' + APP_VERSION;
        hilog.info(DOMAIN, TAG, 'browseUp OK → %{public}s L%{public}d',
          this.browseBase, dirLevelOf(this.browseBase));
        return;
      }
    }
    hilog.warn(DOMAIN, TAG, 'browseUp all same-level cands failed, current=%{public}s', current);
    if (loose) {
      // UNKNOWN 态（目录标识层级不可解析）：同样**不弹系统选择器**。
      // 用宽松父级在 APP 内出一份清单（pathChainOf 可能为空，但至少列出当前目录 +
      // 说明行），保证按钮点了有可见反馈，而不是给一句让用户自己重选的死提示。
      this.showUpListInApp(target, targetName, current, parents, state, level);
      return;
    }
    // 2026-11-11 第四次实机反馈：上级目录没授权时**绝不弹系统选择目录 dialog**。
    // 用户原意是「在 APP 内显示上层档案目录或档案清单」—— 改成 APP 内自建清单视图：
    // 已知层级 + 会话内记下的真实条目名，全是纯字符串，零 IO、零选择器。
    this.showUpListInApp(target, targetName, current, parents, state, level);
  }

  /** 上级目录没有 URI 授权、openFolder 列不出来时：**绝不弹系统选择目录 dialog**，
   *  直接在 APP 内左栏显示上层的「档案目录 / 档案清单」（2026-11-11 第四次实机反馈）。
   *
   *  数据源全是纯字符串，零 IO：
   *   · pathChainOf(target)：从卷根到目标父级的每一级目录，逐条可点进入；
   *   · lastUpNames：会话内进入子目录前记下的那一层真实条目名（含档案名），
   *     命中时列出完整「档案清单」；重启后为空则至少列出当前目录这个已知子目录。
   *  rows 里的目录行点进去照常走 openFolder（用户主动点击才发生，不是启动期批量 IO）。
   *  ⚠️ 刻意**不调用 applyItems**：它会 applyPendingRestore 重设恢复模式 / 提示卡，
   *     还会触发 showPreviewOf / fillSizes / schedulePreload。这里只提交一份纯清单，
   *     恢复模式、防冻结闸门、只读提示卡一律原样保留。 */
  private showUpListInApp(target: string, targetName: string, current: string,
    parents: string[], state: number, level: number): void {
    const rows: ImageItem[] = [];
    rows.push({ uri: '', name: '..', size: -1, mtime: 0, kind: ROW_UP, itemIndex: -1 });
    // ① 路径层级：卷根 → … → 目标父级，每一级都是可点的目录行。
    const chain: string[] = pathChainOf(target);
    for (let i = 0; i < chain.length; i++) {
      const p: string = chain[i];
      rows.push({ uri: p, name: baseName(p), size: -1, mtime: 0,
        kind: ROW_FOLDER, itemIndex: -1 });
    }
    // ② 会话内缓存命中：把上一层真实的档案清单也列出来（这才是完整清单）。
    const cached: boolean = this.lastUpNames.length > 0 &&
      sameDirPath(this.lastUpPath, target);
    if (cached) {
      for (let i = 0; i < this.lastUpNames.length; i++) {
        const nm: string = this.lastUpNames[i];
        if (nm.length === 0) {
          continue;
        }
        // 档案只列名字、不进翻页序列（授权失效时不解码）；文件夹可点进入。
        const isFile: boolean = isImageName(nm) || nm.indexOf('.') > 0;
        rows.push({ uri: stripTrailingSlash(target) + '/' + nm, name: nm,
          size: -1, mtime: 0, kind: isFile ? ROW_OTHER : ROW_FOLDER, itemIndex: -1 });
      }
    } else if (current.length > 0) {
      // 至少把「当前目录」作为目标父级的已知子目录列出来，点一下就能回去。
      rows.push({ uri: current, name: baseName(current), size: -1, mtime: 0,
        kind: ROW_FOLDER, itemIndex: -1 });
    }
    // ③ 一行说明：明确告诉用户清单在 APP 内、不会弹系统选择器。
    rows.push({ uri: '', name: '— 上层清单（APP 内）· 点目录名进入 · ' + UP_LIST_TAG + ' —',
      size: -1, mtime: 0, kind: ROW_OTHER, itemIndex: -1 });
    // 提交纯清单态：不动 restoreMode / restoreHintText，不触发任何 uri IO。
    this.items = [];
    this.rows = rows;
    this.source = targetName;
    this.itemCount = 0;
    this.rowCount = rows.length;
    const rowNames: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      rowNames.push(rows[i].name);
    }
    this.listW = listWidthForNames(rowNames, LIST_W, LIST_MAX_W);
    this.dataSource.reload(this.rows);
    this.browseBase = target;
    this.browseDir = parents.length > 0 ? parents[0] : target;
    this.pickRootUri = '';
    this.titlePath = target;
    this.canGoUp = canGoUpFrom(target);
    this.dirHint = inAppUpListHint(targetName, rows.length - 2, UP_LIST_TAG);
    this.cur = -1;
    this.resetView();
    this.inAppUpList = true;
    // 旧目录的轮询 / 去抖重扫必须停掉：否则会拿新 browseBase 去 tryMtime，
    // 触发一次列不出来的 openFolder，把刚显示出来的清单又覆盖掉。
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
      this.dirPollTimer = -1;
    }
    if (this.rescanTimer !== -1) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = -1;
    }
    this.status = inAppUpListHint(targetName, rows.length - 2, UP_LIST_TAG) +
      (this.restoreMode === RESTORE_READONLY
        ? ' · 图片授权已失效，点「选择文件夹」重新打开该目录即可看图' : '');
    this.diagLine = 'up LIST | ' + UP_LIST_TAG + ' | st=' + state +
      ' | L' + level + '→L' + dirLevelOf(target) +
      ' | cached=' + (cached ? '1' : '0') + ' | rows=' + rows.length +
      ' | no-picker | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'up list in app: %{public}d rows target=%{public}s cached=%{public}s',
      rows.length, target, cached ? '1' : '0');
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
    this.clearTopbarTimer();
    if (on) {
      // 进全屏：先把「之前的完整界面」逐项存档，ESC 退出时才能原样还原
      this.hasFullSnapshot = true;
      this.preFullZoom = this.zoom;
      this.preFullTx = this.tx;
      this.preFullTy = this.ty;
      this.preFullRot = this.rot;
      this.preFullFlipH = this.flipH;
      this.preFullFlipV = this.flipV;
      this.preFullStatus = this.status;
      this.preFullTopbar = this.topbarVisible;
      // 双击 / F11 进全屏：复位缩放与平移，objectFit(Contain) 会按放大后的画布
      // 把预览图铺满放大 —— 这就是「预览图案跟窗口大小一齐适配放大」。
      // 同时 refreshForCanvasResize() 按新画布重解（左右页都算），不发虚。
      this.fitToWindow();
      this.topbarVisible = false;
      this.status = '全屏 · Esc / F11 / 双击退出';
    } else {
      // ESC 退出：把进全屏前的视图状态、状态栏文案、顶栏可见性全部还原，
      // 应用内三块栏本就由 if (!this.fullscreen) 恢复，窗口形态由 applyWindowFullScreen 还原。
      if (this.hasFullSnapshot) {
        this.zoom = this.preFullZoom;
        this.tx = this.preFullTx;
        this.ty = this.preFullTy;
        this.rot = this.preFullRot;
        this.flipH = this.preFullFlipH;
        this.flipV = this.preFullFlipV;
        this.status = this.preFullStatus;
        this.topbarVisible = this.preFullTopbar;
        this.hasFullSnapshot = false;
      } else {
        this.topbarVisible = true;
        this.status = '已退出全屏 · Esc 关闭应用';
      }
    }
    this.applyWindowFullScreen(on, 0); // 标题栏 / dock / 状态栏 / 导航栏一起处理与还原
    this.armCanvasReloadFallback();    // 窗口 API 静默失败时也能按当前画布重解
  }

  /** 根容器收到鼠标移动：真全屏下不再有「贴顶唤出工具顶栏」（2026-11-11 用户要求「不会有标题列」）。
   *  留着 SHOW_FULLSCREEN_CHROME 开关：改回 true 就能恢复旧的唤出式工具条，不用重新写代码。
   *  y 是相对根 Stack 的坐标；非全屏时顶栏常驻，不必算。 */
  private onRootMouse(event: MouseEvent): void {
    if (!SHOW_FULLSCREEN_CHROME || !this.fullscreen) {
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

  /** 窗口级真全屏（2026-11-11）：隐藏系统标题栏与 dock（PC 任务栏）、状态栏、导航栏。
   *
   *  关键一步：maximize(MaximizePresentation.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER)。
   *  SDK 26 `@ohos.window.d.ts` L3025 明确写着「window title bar and dock bar are NOT
   *  displayed when the cursor hovers over the hot zone」（since 14）。
   *  旧的 maximize() 无参 = FOLLOW_APP_IMMERSIVE_SETTING，鼠标一碰热区标题栏 / dock 就回来，
   *  那不是真全屏。即使窗口已经是最大化态也要再调一次，确保沉浸形态被设置上。
   *
   *  每步独立 try/catch：某一步在该机型不支持时只记日志，不把后续步骤全带走。
   *  AppStorage 里窗口还没就绪（getMainWindow 是异步）则短延时重试，不弹任何 UI。 */
  private async applyWindowFullScreen(on: boolean, retry: number): Promise<void> {
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (!win) {
      if (retry < FULLSCREEN_WINDOW_RETRY_MAX) {
        setTimeout(() => {
          this.applyWindowFullScreen(on, retry + 1);
        }, FULLSCREEN_WINDOW_RETRY_MS);
      }
      return;
    }
    hilog.info(DOMAIN, TAG, 'fullscreen: %{public}s plan=%{public}s',
      on ? 'enter' : 'exit', fullscreenStepsOf(on).join(','));
    if (on) {
      try {
        if (win.getWindowStatus() === window.WindowStatusType.FLOATING) {
          this.maximizedByUs = true;
        }
        await win.maximize(window.MaximizePresentation.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: maximize failed: %{public}s', JSON.stringify(e));
      }
      try {
        win.setImmersiveModeEnabledState(true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: immersive mode failed');
      }
      try {
        await win.setWindowLayoutFullScreen(true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: layout failed');
      }
      const noBars: Array<'status' | 'navigation'> = [];
      try {
        await win.setWindowSystemBarEnable(noBars);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: system bar failed');
      }
      // 显式三次调用：不用 for-of 传联合字面量，避开 ArkTS 严格类型推断的坑。
      try {
        await win.setSpecificSystemBarEnabled('status', false);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: status off failed');
      }
      try {
        await win.setSpecificSystemBarEnabled('navigation', false);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: navigation off failed');
      }
      try {
        await win.setSpecificSystemBarEnabled('navigationIndicator', false);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: indicator off failed');
      }
    } else {
      const allBars: Array<'status' | 'navigation'> = ['status', 'navigation'];
      try {
        await win.setWindowSystemBarEnable(allBars);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: system bar restore failed');
      }
      try {
        await win.setSpecificSystemBarEnabled('status', true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: status on failed');
      }
      try {
        await win.setSpecificSystemBarEnabled('navigation', true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: navigation on failed');
      }
      try {
        await win.setSpecificSystemBarEnabled('navigationIndicator', true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: indicator on failed');
      }
      try {
        await win.setWindowLayoutFullScreen(false);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: layout restore failed');
      }
      try {
        win.setImmersiveModeEnabledState(false);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: immersive mode restore failed');
      }
      // ★ 2026-11-11 ESC 修复：撤销「隐藏标题栏 / dock」的沉浸最大化形态。
      //   进入时 maximize(ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER) 是**持久形态设置**，
      //   上面恢复系统栏 / layout / immersiveMode 都管不到它；而旧版 recover() 只在
      //   「进入前是浮动窗口」才调用 —— 窗口本就最大化时（PC 最常见），ESC 后标题栏、
      //   dock、任务栏永远回不来，界面看着就是「没切回之前的完整界面」。
      if (this.maximizedByUs) {
        this.maximizedByUs = false;
        try {
          await win.recover(); // 还原成进入前的自由窗口（自带标题栏 / dock）
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'fullscreen: recover failed');
        }
      } else {
        try {
          // 进入前已是最大化 / 全屏：保持最大化但退出沉浸形态，标题栏 / dock 回来
          await win.maximize(window.MaximizePresentation.EXIT_IMMERSIVE);
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'fullscreen: exit immersive failed');
        }
      }
      // 双保险：显式恢复窗口装饰（标题栏）与 title / dock 热区悬停显示。
      // SDK 说明 setTitleAndDockHoverShown 与 maximize 同时调用时「最后一次生效」，
      // 这一步能把进入时设下的「dock 悬停也不显示」彻底覆盖掉。
      try {
        win.setWindowDecorVisible(true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: decor restore failed');
      }
      try {
        await win.setTitleAndDockHoverShown(true, true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: title/dock hover restore failed');
      }
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
        // 退格 = 往上层目录（Win64 77f7b6b）；不在目录浏览态时给一句提示
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

  /** 三个工具按钮共用的外观 —— **恒亮、恒可点，永不 grey out / 永不禁用**。
   *
   *  2026-11-11 用户澄清：上一版把「按钮 grey out」的反馈理解反了，那是**抱怨**按钮被灰掉、
   *  要求修正，不是要禁用。所以这里回到无条件外观：
   *   · 无 .enabled()、无 .opacity() 条件、无条件 fontColor / backgroundColor；
   *   · 签名回到三参，不再接受任何「是否可用」入参，从类型上杜绝再次被禁用；
   *   · 到卷根 / 图片列表态 / 启动恢复态点击都照常进 doAction('up') → browseUp()，
   *     由 upNavStateOf 给准确提示，不移动目录。诊断信息完整保留。 */
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
          // ImageInterpolation.High = Cubic，SDK 明确写「highest possible quality」——
          // 这是平台上最高画质的 resample 档；autoResize(false) 不让组件解码时再降采样损信息。
          // 配合全屏后按新画布尺寸重解码，全程不把小图拉大。
          .interpolation(ImageInterpolation.High)
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
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
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
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
   *  与左页「解码期间不画原图」是同一条约束（见 previewImage 的 viewFailed 分支）。
   *
   *  2026-11-11 用户反馈「右页明显带锯齿」：旧版这里只有 interpolation(High)，
   *  缺左页的 autoResize(false) / dynamicRangeMode，且解码档位是较低的 preloadEdge()。
   *  autoResize 默认为 true 时组件会按显示尺寸重新采样放大低分辨率图，正是锯齿来源。
   *  现在右页与左页用完全同一套画质属性 + 同一 viewEdge() 档位。 */
  @Builder
  rightPageImage(uri: string, w: number) {
    Stack() {
      if (this.rightPixelMap !== undefined) {
        Image(this.rightPixelMap!)
          .objectFit(ImageFit.Contain)
          .interpolation(ImageInterpolation.High)
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
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

            // 11-10 起：排序 / 往上层 / 选择文件夹 三个按钮水平排在同一行。
            // toolBtn 的 layoutWeight(1) 三等分宽度 → 水平间距由统一的 margin(3) 决定，一致；
            // 统一 height(30) + Row 垂直居中 → 垂直对齐整齐；
            // 合并掉原来的第二行后，按钮区不再有多余垂直空白，也不会重叠 / 错位。
            Row() {
              this.toolBtn(this.sortAsc ? '排序 ↑' : '排序 ↓', 'sort', true)
              // 「往上层」恒亮恒可点（2026-11-11：不要 grey out、不能禁用）。
              // canGoUp 只用于状态栏 / 诊断串 / browseUp 行为判据，不传进按钮。
              this.toolBtn('往上层', 'up', true)
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
              List({ scroller: this.scroller, space: LIST_ROW_GAP_VP }) {
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
                       thumbDisabled: this.restoreMode === RESTORE_READONLY,
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

          // 只读名单态：授权失效时一张图都不画，改给一张可操作的指引卡。
          // 外层 Row 用 Transparent：既不吞滚轮 / 拖拽，也不挡右栏浮层；卡片里的按钮照常可点。
          if (this.restoreHintText.length > 0) {
            Row() {
              Column() {
                Text('⚠ 上次名单已恢复，图片暂时不能预览')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#f6c85f')
                  .margin({ bottom: 10 })
                Text(this.restoreHintText)
                  .fontSize(13)
                  .fontColor('#dfe5ef')
                  .textAlign(TextAlign.Center)
                  .maxLines(4)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .constraintSize({ maxWidth: 440 })
                  .margin({ bottom: 14 })
                Button('选择文件夹重新打开')
                  .type(ButtonType.Normal)
                  .fontSize(13)
                  .fontColor('#101216')
                  .backgroundColor('#f6c85f')
                  .borderRadius(6)
                  .height(34)
                  .padding({ left: 16, right: 16 })
                  .onClick(() => {
                    this.chooseFolder();
                  })
              }
              .padding(20)
              .backgroundColor('#e61a1d23')
              .border({ width: 1, color: '#3a4150' })
              .borderRadius(10)
              .constraintSize({ maxWidth: 500 })
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
            .hitTestBehavior(HitTestMode.Transparent)
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
              // 内嵌 ICC 识别出来的色彩空间 / HDR / EXIF 摆正角度（ViewPlan.viewHintOf）
              Text(viewHintOf(colorSpaceNameOf(this.viewColorSpace), this.viewIsHdr, this.viewExifDegrees) +
                (isWideGamutOf(this.viewColorSpace) ? ' · 广色域' : ''))
                .fontSize(10)
                .fontColor('#8b95a8')
                .margin({ top: 2 })
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              // 全屏没有任何标题列 / 按钮，只能在这里告诉用户怎么退出
              if (this.fullscreen) {
                Text('全屏 · Esc / F11 / 双击退出')
                  .fontSize(10)
                  .fontColor('#8b95a8')
                  .margin({ top: 2 })
              }
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

          // 右下角角标：只显示「缓存数量」与「缩放百分比」两项（2026-11-11 用户要求）。
          // 目录诊断串默认隐藏（SHOW_DIAG_BADGE=false）；需要实机截图排查时把开关改 true，
          // diagLine 的赋值逻辑一直在，改一行常量即可恢复，不动任何业务流程。
          Column() {
            if (SHOW_DIAG_BADGE && this.diagLine.length > 0) {
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
            // 缓存：只显示驻留张数；内存占用 / 张数上限 / 字节上限都不再画
            Row() {
              Text('缓存 ' + this.cacheCount + ' 张')
                .fontSize(11)
                .fontColor('#9aa5b8')
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

          // 真全屏下不画任何按钮（SHOW_FULLSCREEN_CHROME=false）；
          // 把开关改回 true 可恢复旧的「右上角退出」入口，退出仍可用 Esc / F11 / 双击画布。
          if (SHOW_FULLSCREEN_CHROME && this.fullscreen) {
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
            // 进出全屏后画布尺寸变了：按新尺寸立刻重解（不走升级延迟），
            // 否则沿用旧档位的 PixelMap 只是把小图拉大 —— 全屏画质会明显发虚。
            if (changed && this.pendingReload) {
              this.pendingReload = false;
              this.clearCanvasReloadFallback();
              this.refreshForCanvasResize();
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
          // 可观测：预载 N 张，与右下角角标同源（2026-11-11 起不再显示 MB 占用）
          Text('预载 ' + this.cacheCount + ' 张')
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

      // 真全屏下不画工具顶栏（SHOW_FULLSCREEN_CHROME=false）：用户要求「不会有标题列」。
      // 开关改回 true 才恢复旧的「鼠标贴顶浮出、绝对定位不占布局」行为。
      if (SHOW_FULLSCREEN_CHROME && this.fullscreen && this.topbarVisible) {
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
