/**
 * pages/Index.ets — 鸿蒙 PC 原生 HEIC/JPG 看图软件（ACDSee 风格）· R75 主线（R39 起组件化）· FITS/XISF 天文图像预览 · 档案列表右键菜单
 *
 * 布局（ACDSee 风格）：
 *   · 顶栏：**第九十四轮已整条移除**（原「贴顶唤出的自动隐藏栏」）。
 *           目录名改由系统窗口标题栏（window.setWindowTitle）独家显示，界面内不再有自绘标题栏。
 *   · 左侧：抬头下「排序 / 往上层 / 选择文件夹」同一行等宽排列；
 *            图像档案列表（悬停缩略图 + 文件名 + 体积 + 日期），列宽按最长名字自适应、行高紧凑
 *   · 右侧：大图预览（GPU 合成渲染），悬浮信息层 + 缩放角标
 *   · 底栏：状态栏
 *
 * 入口位置（第九十四轮起）：
 *   · 全屏：F11 / 双击画布 / ESC 退出（界面上不再有「全屏」按钮）
 *   · 幻灯片：**只在预览图片上右键**弹出的上下文菜单第四项「播放幻灯片 / 暂停幻灯片」
 *             （原顶栏按钮与其 doAction('play') 分发路径一并删除；键盘空格键作为快捷键保留）
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
 *   · 缩放 / 旋转 ±90° / 水平垂直镜像 / 拖拽平移 / 双指捏合；
 *     第七轮起**左键单击不再放大**，双击画布 = 进入 / 退出全屏
 *   · 全屏：F11 / 双击进入，Esc / F11 / 双击退出；隐藏应用两块栏 + 状态栏 +
 *     隐藏系统状态栏/导航栏，画布铺满屏幕（保留原行为，第九十四轮未改）
 *   · 键盘：← → 翻页，空格 幻灯片，R 旋转，**F 切换全屏**，1 = 1:1，0 复位，Esc 关闭应用
 *           （第九十五轮：F 从「1:1」改为「切换全屏」，1:1 移到数字键 1；F11 / 双击仍进全屏）
 *   · 快速：缩略图随 List 虚拟化懒加载，仅可见项参与解码
 *   · 后台预载：载入时把整库按「可直接显示」档位解码成 PixelMap 并缓存复用；
 *     解码数据按 uri 复用 + 在途合并（同一张不重复解），滚轮切图只查缓存、零解码
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
import pasteboard from '@ohos.pasteboard';  // 第五十一轮：文本态行段选择后复制到系统剪贴板
import window from '@ohos.window';
import display from '@ohos.display';
import pointer from '@ohos.multimodalInput.pointer';  // 第一百零九轮：分隔条悬停光标（WEST_EAST）
import util from '@ohos.util';
import { baseName, dirDisplayName, stripTrailingSlash, parentDirOf,
  volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, upParentCandidates, sameDirPath,
  UP_NAV_NONE, UP_NAV_TOP, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf,
  upContextBaseOf, upContextRawOf, pathChainOf,
  realPathOf, hierPathOf,
  isStrictParentOf, sameEntryNames,
  isUpListPseudoName, mergeUpListNames, rootFormParentOf,
  isSameOrUnderLevelOf, restoreBrowseLevelOf, rawBrowseFormOf,
  UpCacheLevel, encodeUpCacheText, decodeUpCacheText,
  prefsSafeEncode, prefsSafeDecode, prefsIsLegacyBadCache,
  FOLDER_PICK_OK, FOLDER_PICK_UNREADABLE,
  folderPickStartOf, pickedFolderKind, folderPickHint,
  UpParentIndex, cachedUpIndexOf, cachedUpLandsAt,
  cachedUpPreferredParentOf, cachedUpPreferredCandidates,
  mergeExploreNames, exploreBaseOf, exploreSiblingNamesOf } from '../common/DirName';
// 第三十六轮：用户主动「往上层」的真实全量列举决策（跨同层候选、不 early break）。
import { upFullExploreWanted, upExploreFormsOf, upExploreCapOf,
  upExploreNeedFallback } from '../common/DirName';
// 第三十八轮：用户主目录（用户卷根）重新可选择 / 可真实列举。
import { rootReenterWantedOf, rootReenterFormsOf } from '../common/DirName';
// 第五十九轮：往上层后「返回前所在子目录」反色标记的真值源。
// 纯视觉标记，与 cur / select() / 目录链完全隔离；只在 browseUp 落地时设置。
import { UPRET_NONE, upReturnMarkOf, upReturnRefreshOf,
  upReturnClearOf, upReturnInvertOf } from '../common/UpReturn';
// 第六十轮：左栏「高亮项恒定完整可见」的纯函数真值源（零 SDK / 零 IO / 纯数值判定）。
import { HV_NONE, HV_REVEAL, HV_KEY_INVALID, HV_ALIGN_AUTO,
  highlightRowOf, highlightSafeOf, highlightGuardKeyOf,
  highlightGuardActionOf, highlightScrollAlignOf,
  highlightResizeOf } from '../common/HighlightVisible';
import { preloadWindowSize, preloadOrder, preloadSaturated, PreloadBatch,
  fullPreloadIndex, preloadConcurrencyOf, preloadBatchOf,
  shouldResetPreloadChain, fullCacheTargetOf,
  preloadBatchBoundedOf } from '../common/PreloadBudget';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  RESTORE_FULL, RESTORE_READONLY, restoreModeOf, bulkIoAllowed, restoreProbeUris,
  readonlyHint, readonlyTapHint, readonlyUpHint, restoreUpEnabled, restoreUpHint,
  RELIST_SKIP, RELIST_TRY, readonlyRelistAction, relistProbeOkOf, relistOkHint } from '../common/ResumePlan';
// 第三十六轮：目录上下文与「有没有图片位置」解耦，空 / 无图片目录也能退出重开恢复。
import { DIR_RESUME_CONTEXT, DIRCTX_EMPTY,
  dirContextFlagOf, dirContextSaveWanted, dirOnlyResumeWanted } from '../common/ResumePlan';
import { PERSIST_SKIP, persistAction, persistPolicyUris,
  persistTimeoutSafe, persistOkHint, persistFailHint, persistLegacyHint } from '../common/PersistPlan';
import { Size2, viewEdgeOf, preloadEdgeOf,
  displayEdgeOf, shouldReloadOnResize, shouldExitFullOnResize, fullExitEdgeOf, canvasFromRootOf,
  isWideGamutOf, fullscreenStepsOf, spreadRightWantedOf,
  chromeSampleOf, canvasResizeAcceptOf,
  spreadPairIndexOf, spreadPairOkOf, spreadPageTextOf, stripZoomNoteOf } from '../common/ViewPlan';
// 第八十八轮：退出全屏恢复「进入前」缩放 / 平移的唯一真值源。
import { FullExitView, fullExitViewOf } from '../common/ViewPlan';
// 第八十六轮：并排（对开）等比适配的唯一真值源（统一高度 + 各自原始比例 + 中间零间隙）。
import { SpreadFit, spreadFitOf, spreadAspectOf } from '../common/SpreadFit';
import { ArchiveMeta, WindowRect, encodeMeta, decodeMeta, metaForUri,
  metaMergeOf, metasPaddedOf, metaChunkPaddedOf,
  packWindowRect, parseWindowRect, windowRectUsable,
  shouldSaveWindowRect, collapsedOf, windowModeFlagOf,
  shouldRestoreMaximized, shouldScheduleWindowRestore } from '../common/SessionState';
// 第七十七轮：adaptive column width 的唯一真值源（内容长度 + 容器尺寸，零固定宽度）。
import { AcLayout, acLayoutOf, acWidthSafeOf, acNeedWOf } from '../common/AdaptiveColumn';
// 第一百零八轮：左栏拖拽调宽的唯一真值源（夹取 / 拖动 / 恢复 / 写盘，全纯函数）。
// 第一百一十二轮：不再用 SPLIT_HIT_EXTRA_VP —— 超界命中区在部分设备上会让容器自身失效，
// 命中改由「铺满整条栏的命中层」提供。
import { SPLIT_DIVIDER_W,
  splitDragWOf, splitSidebarWOf, splitRestoreWOf, splitPersistOf,
  splitStatusOf, splitResetOf, splitActiveOf, splitHideMetaOf } from '../common/SidebarSplit';
import { decodeEdgeOf, reuseEdgeOf, shouldReuseDecoded,
  decodeKeyOf } from '../common/DecodeCache';
import { rawPrefetchWanted } from '../common/RawCache';
import { ENTER_ABORT, ENTER_TIMEOUT_MIN_MS, ENTER_TIMEOUT_MAX_MS,
  enterTimeoutSafe, enterWatchdogWanted, enterSettledOk,
  enterTimeoutAction, enterTimeoutHint } from '../common/RestoreTimeout';
import { FF_GIVEUP, deadTagOf, deadMemoryMatches,
  failFastAction, restoreIoHeld, probeTakeOf, elapsedSince,
  failFastHint } from '../common/FailFast';
import { SCROLL_NONE, tapScrollAction, stepScrollAction, scrollAllowed,
  loupeDiameterVp, loupeCircleOrigin, loupeClampedOffset,
  loupeInFrame, loupeEligibleOf, LOUPE_PANE_NONE, LOUPE_PANE_LEFT,
  LOUPE_PANE_RIGHT, LOUPE_CM_14, loupePaneActiveOf, loupePaneAfterHover,
  loupeResetOnModeChange, loupeHoverAfterModeChange,
  LOUPE_DEFAULT_ENABLED, loupeEnabledAfterLeftClick,
  loupeVisibleOf, ESC_ACT_NONE, ESC_ACT_EXIT_FULL, ESC_ACT_QUIT_APP,
  shouldCaptureWindowRect, shouldRestoreWindowRect,
  escActionByState, shouldArmSystemEcho, shouldCaptureRectAll,
  shouldApplyRectRestore, shouldSelfHealOnResize,
  loupeEffectiveScaleOf, loupeNeedsResampleOf,
  loupePixelAlignOf, loupeResampleStableOf,
  LOUPE_AA_ENABLED, LOUPE_QA_HIGH, loupeDensityRatioOf, loupeQualityTierOf,
  loupeResampleEdge2Of, loupeResampleGainOf,
  windowStatusIsFullscreen, shouldSyncFullFromWindow,
  fullKeyEligibleOf, fullToggleAllowedOf } from '../common/InteractionPlan';
import { KeyCode } from '@ohos.multimodalInput.keyCode';
// 第九十九轮：Core Vision Kit 图像超分 —— 判据在 common/SuperResPlan.ts（纯函数），
// 能力调用在 services/SuperResolutionService.ts（唯一 import Kit 的地方），本页只做接线。
import { SuperResPlan, SR_RUN, SR_MIN_GAIN,
  superResPlanOf, superResNeedEdgeOf, superResAcceptOf, superResKeyOf,
  superResReasonOf } from '../common/SuperResPlan';
import { SuperResolutionService, SuperResOutcome } from '../services/SuperResolutionService';
// 第一百轮：「AI超分辨率」标记 —— 文案 / 几何 / 配色 / 显隐判据都在 common/SrBadge.ts（零依赖纯函数）。
// 本页只负责把它摆到预览框左上角，数值一个都不在此处硬编码。
import { SR_BADGE_TEXT, SR_BADGE_INSET, SR_BADGE_H, SR_BADGE_PAD_X, SR_BADGE_FONT,
  SR_BADGE_RADIUS, SR_BADGE_BORDER_W, SR_BADGE_BG, SR_BADGE_FG, SR_BADGE_BORDER,
  srBadgeShownOf } from '../common/SrBadge';
import { CrossFade, SLIDE_FADE_STEPS, crossFadeStepOf, slideFadeReadyOf,
  slideFadeTickMsOf } from '../common/SlideFade';
// 第二十三轮：多模输入服务按键订阅（系统级通道，不经 ArkUI 焦点 / 组件分发）。
// InputKeyEvent 与 ArkUI 全局 KeyEvent 同名不同型，必须起别名，否则 Callback 类型不匹配。
import inputConsumer from '@ohos.multimodalInput.inputConsumer';
import { KeyEvent as InputKeyEvent } from '@ohos.multimodalInput.keyEvent';
import { BusinessError } from '@ohos.base';
// 第三十七轮：纯文本 / 源码文件预览的纯函数真值源（零 SDK 依赖、零文件 IO）。
// 文件类型识别 / 语言映射 / 编码候选 / 逐行 token 化全在 TextDoc.ts，Index 只做
// 「真异步读字节 → 解码 → 建行数据源 → 等宽行号 + token 着色渲染」，绝不修改磁盘文件。
import { LANG_NONE, textLangOf, isTextFileName,
  textSuffixListOf, looksBinary, textBodyOf, encodingCandidatesOf,
  pickDecodedIndexOf, encodingLabelOf, TEXT_MAX_BYTES, TEXT_MAX_LINES,
  TEXT_TAB_WIDTH, TEXT_ROW_H_VP, TEXT_WHEEL_LINES, TEXT_CHAR_W_VP,
  TEXT_CONTENT_MAX_VP, textReadCapOf, textByteTruncatedOf, splitTextLines,
  lineNoWidthOf, textStatusOf, textContentWidthOf, TextToken, TextSplit,
  tokenColorOf, tokenizeLine, blockStartsOf } from '../common/TextDoc';
// 第五十六轮：返回 APP 时左侧目录清单「单次、非侵入」刷新的决策真值源（零 SDK / 零 IO）。
// 真正的重列举仍复用既有 openFolder(isRescan=true) 链，本文件只判断「该不该刷、刷完怎么对账」。
import { RESUME_REFRESH_GO, resumeRefreshAction, resumeSelectedIndex,
  resumeDirKept, resumeRefreshHint,
  BOOT_REFRESH_GO, bootRefreshAction, bootRefreshHint } from '../common/ResumeRefresh';
// R39（Index.ets 拆分 Phase 1）：左栏行组件与解码服务迁出本文件 ——
//   · components/ArchiveRow.ets：ArchiveRow 行组件 + ThumbLoader 悬停缩略图 + ROW_* 行种类
//   · model/Preview.ets：PreviewEntry / RawStore / decodePx 解码链 + hilog TAG/DOMAIN
// 本文件只保留页面接线与业务逻辑，依赖方向单向（pages → components/model → common）。
import { ArchiveRow, ROW_IMAGE, ROW_UP, ROW_FOLDER, ROW_OTHER, ROW_TEXT,
  fmtBytes } from '../components/ArchiveRow';
import { PreviewEntry, decodePx, rawStore, RAW_CACHE_MAX_COUNT, TAG, DOMAIN,
  yieldMacroTask } from '../model/Preview';
// 第七十一轮：解码失败的明确原因（按 uri 粒度），单独一行 import 保持既有 import 逐字不变。
import { decodeFailCodeOf, decodeFailHintOf } from '../model/Preview';
// R40（Index.ets 拆分 Phase 3）：左栏迁出为独立组件；ImageItem / GalleryDataSource
// 一并迁至 model/GalleryData.ets（SidebarView 也要用，留在本文件会循环 import）。
import { SidebarView } from '../components/SidebarView';
import { ToolButton } from '../components/ToolButton';
import { ImageItem, GalleryDataSource } from '../model/GalleryData';
// 第六十二轮：主预览 resize 画质的纯函数真值源（零 SDK / 零 IO）。
import { RQ_MIPMAP, RQ_LOW, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR,
  rqScaleOf, rqInterpolationOf, rqAntialiasOf } from '../common/ResizeQuality';
// 第六十三轮：文本预览纵向滚动条「显示判定」的纯函数真值源（零 SDK / 零 IO）。
// 内容驱动写 @State，UI 的 if 只直读它；不再把非 @State 的 textLines 塞进条件。
import { TSB_CHROME_H_VP, textViewportHOf,
  textBarVisibleSafeOf } from '../common/TextScrollBar';
// 第六十四轮：左栏目录内容量的统计口径 / TTL / 空闲闸门 / 四态展示纯函数真值源。
// 真异步 fs.listFile、preferences 小 key、定时器与 LRU 全在本文件，模块零 SDK / 零 IO。
import { DC_PENDING, DC_FAIL, DC_LABEL_PENDING, DC_TTL_DEFAULT_MS,
  DC_IDLE_MS, DC_SCAN_PER_TICK, DC_SCAN_TIMEOUT_MS, DC_CACHE_MAX,
  DC_ENTRY_CAP, DC_SCAN_GO, DirCountEntry, dcTtlClampOf, dcRefreshTickOf,
  dcIdleOf, dcAppIdleOf, dcScanActionOf, dcCountOf, dcImageCountOf,
  dcStateOf, dcEntryLabelOf, dcNeedRescanOf, dcEvictCountOf,
  dcTtlHintOf, dcTtlLabelOf } from '../common/DirCount';
// 第六十七轮：放大镜高质量显示的关键参数 / 能力分级 / AA 档决策真值源（零 SDK / 零 IO）。
// 画质档位只由「逻辑倍率」（与设备密度解耦）决定，密度只进像素预算 ⇒ 跨 DPI 一致；
// 系统 native 级 AA 缩放的护栏（倍率 / 总像素 / 长边 / 稳定阈值 / 真实增益）全在这里。
import { LQ_CAP_COMPONENT, LQ_CAP_SYSTEM_AA, LQ_MAX_EDGE, LQ_MAX_FACTOR,
  LQ_STABLE_MIN_DELTA, LQ_MIN_GAIN,
  lqDensityOf, lqLogicalScaleOf, lqEffectiveScaleOf, lqConsistentTierOf,
  lqKindOf, lqAaLevelOf, lqInterpolationOf, lqFilterModeOf,
  lqFactorOf, lqTargetEdgeOf, lqShouldRebuildOf, lqHasGainOf } from '../common/LoupeQuality';
// 第六十七轮：系统 native 级抗锯齿缩放（唯一碰 SDK 的实现在 model/Preview.ets）。
import { loupeCapabilityOf, loupeSystemScaledPx } from '../model/Preview';
// 第六十八轮：右侧主预览 resize 最高质素的场景分档 / 内容自适应 AA / 资源护栏真值源。
// 画质档位只由逻辑缩放比决定，密度只进像素预算 ⇒ 跨 DPI 一致；精炼倍率不吃 zoom ⇒ 跨帧稳定。
import { VQ_CAP_COMPONENT, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR,
  VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE, VQ_MAX_FACTOR,
  VQ_STABLE_MIN_DELTA, VQ_MIN_GAIN,
  vqSceneOf, vqKindOf, vqAaLevelOf, vqSystemWantedOf, vqRefineFactorOf,
  vqConsistentTierOf, vqScaleAllowedOf, vqShouldRebuildOf, vqHasGainOf } from '../common/ViewQuality';
// 第六十八轮：右侧主预览系统 native 级 AA 精炼（唯一碰 SDK 的实现在 model/Preview.ets）。
import { viewSystemScaledPx } from '../model/Preview';
// 第七十轮：HDR 标识的显隐 / 固定边距 / 全屏避让 / 深浅背景对比度真值源（零 SDK / 零 IO）。
// 只把已有的 viewIsHdr（源图 ImageInfo.isHdr）接到显示层，不新增任何解码或探测。
import { HB_LABEL, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP,
  HB_FONT_VP, HB_PAD_H_VP, HB_PAD_V_VP, HB_RADIUS_VP, HB_BORDER_VP,
  HB_BG_COLOR, HB_FG_COLOR, HB_BORDER_COLOR,
  hbVisibleOf, hbLeftOf, hbTopOf } from '../common/HdrBadge';
// 第七十一轮：HDR 保真结果的原因码门控（正常态不显示任何提示）。
import { hpShowHintOf } from '../common/HdrPreview';
// 第七十二轮：左栏档案列表右键菜单的纯函数真值源（命中判定 / 菜单动作 / 详情字段 /
// 所在目录 / 复制文本 / 状态文案）。pasteboard、openFolder、菜单浮层与详情面板落在
// 本文件；common/ 层保持零 SDK / 零 IO。
// 第七十三轮：新增菜单浮层尺寸 / 定位 / 标题 / 显隐判定；触发层不再依赖系统右键手势。
// 第七十四轮：「打开档案所在目录」改由 startAbility 拉起 OS 文件管理器打开【目录】，
// 目标由 fcRevealDirUriOf 按行种类判定（文件→所在目录 / 目录→该目录自身）。
// 第七十五轮：文件行目标改以 browseBase（当前左栏展示清单的权威目录）为准，
// 不再优先剥 r.uri 文件名 —— 那是列举用拼接 URI，NAS / 缓存态会指向错误目录。
import Want from '@ohos.app.ability.Want';
import { FC_ACT_OPEN, FC_ACT_DETAIL, FC_ACT_REVEAL, FC_ACT_COPY_PATH, FC_ACT_COPY_NAME,
  fcHitOf, fcHasActOf, fcDetailFieldsOf, fcDetailTitleOf,
  fcRevealDirUriOf, fcRevealIsDirOf, fcRevealStatusOf,
  FC_OSFM_BUNDLE, FC_OSFM_ABILITY, FC_OSFM_PARAM_FILE_URI,
  FC_VIEW_DATA_ACTION, FC_DIR_UTD, FC_URI_READ_FLAG,
  fcCopyTextOf, fcStatusHintOf, FcDetailField,
  fcItemsOf, fcMenuHeightOf, fcMenuPosOf, fcMenuTitleOf, fcMenuVisibleOf,
  FC_MENU_W, FC_MENU_ITEM_H, FC_MENU_TITLE_H, FC_MENU_PAD_V,
  FcMenuItem, FcMenuPos } from '../common/FileContextMenu';
// 第七十六轮：预览区「相片右键菜单 / EXIF 图标 / EXIF 资料框 / 预览模式」唯一真值源。
// 第一百零七轮：菜单改为「1 个动作 + 4 个滑动开关」，本文件只负责渲染与接线。
import { PM_ACT_EXIF, PM_ACT_SPREAD, PM_ACT_SR, PM_ACT_SLIDE, PM_ACT_FULL,
  PM_EXIF_LABEL, PM_EXIF_MARGIN_VP, PM_EXIF_EMPTY,
  PM_MENU_W, PM_MENU_ITEM_H, PM_MENU_TITLE_H, PM_MENU_PAD_V, PM_MENU_PAD_H,
  PM_SWITCH_W, PM_SWITCH_H, PM_SWITCH_GAP,
  PM_MODE_AUTO, PM_MODE_SPREAD, PmMenuItem, PmMenuPos, PmExifField,
  pmItemsOf, pmHasActOf, pmSpreadWantedOf, pmSpreadModeOf,
  pmMenuWidthOf, pmSwitchStatusOf, pmSwitchDescOf,
  pmExifBadgeVisibleOf, pmPhotoReadyOf, pmExifPanelTitleOf, pmExifEmptyOf,
  pmRightHitOf, pmMenuHeightOf, pmMenuPosOf, pmMenuVisibleOf,
  pmMenuTitleOf, pmStatusOf } from '../common/PictureMenu';
// 第一百零六轮：底部状态栏「快捷键总表」唯一真值源（纯常量 + 拼串）。
import { shortcutHintsTextOf } from '../common/Shortcuts';

/** 第二十轮：根组件焦点 id。真全屏 / 退出全屏会重建布局，窗口管理器也可能收走焦点；
 *  .defaultFocus(true) 只在首次构建生效，焦点一丢，之后所有按键（含 ESC）都到不了 onKey。
 *  进出全屏后用 focusControl.requestFocus(ROOT_FOCUS_ID) 把焦点抢回来。 */
const ROOT_FOCUS_ID: string = 'heicRootKeys';
/** 第二十轮：全屏切换后重聚焦的延时（ms）。等 ArkUI 完成整块布局重建再请求焦点，
 *  太早时根组件还没挂上新 id，requestFocus 会静默失败。 */
const ESC_REFOCUS_DELAY_MS: number = 120;
/** 第二十一轮：常显在右下角缩放角标的构建标记 —— 从截图一眼确认装的是不是新包。 */
const ESC_BUILD_TAG: string = 'R112';
/** 第二十三轮订正：**恢复 true**。
 *  R22 实机关掉本开关后截图变成 `full=T · win=T · keys=0` —— 连「第一次 ESC
 *  返回普通模式」都消失了；对比 R21（本开关 true）的 `full=F` 可证：系统消费首次
 *  ESC 时会让窗口退出沉浸、产生 windowStatusChange，APP 才能同步回普通态。
 *  而 R22 关掉后 keys 依然为 0，说明「关闭系统沉浸能让 ESC 变普通按键」的推测
 *  不成立 —— ESC 被系统窗口管理器全局消费，与是否沉浸无关。故恢复 true 以保留
 *  首次 ESC 可返回的行为，退出问题改由 inputConsumer 通道 + 应用内退出按钮解决。
 *  改回 false 可复现 R22 的纯应用内全屏行为（可逆开关）。 */
const USE_SYSTEM_IMMERSIVE: boolean = true;
/** 抢焦点重试：PC 上窗口键盘焦点可能晚于页面首帧才到位，前几秒持续重试。 */
const FOCUS_RETRY_MS: number = 350;
const FOCUS_RETRY_MAX: number = 12;
/** 第二十一轮：天然可聚焦的 Button 锚点 id。Column / Stack 布局容器在 PC 上即使
 *  .focusable(true) 也未必真能拿到键盘焦点，Button 一定可以。 */
const KEY_FOCUS_ID: string = 'heicKeyFocusAnchor';
/** 窗口状态监听注册重试：mainWindow 由 EntryAbility 异步缓存，需要等就绪。 */
const WIN_STATUS_RETRY_MS: number = 200;
const WIN_STATUS_RETRY_MAX: number = 12;
/** terminateSelf 后窗口仍在时的 destroyWindow 兜底延时。 */
const QUIT_FALLBACK_DELAY_MS: number = 400;

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
/** 第四十四轮：NAS / 网络目录重启后首次访问可能 13900002（挂载 / 授权未就绪）。
 *  列举全败且末次错误是 ENOENT 时按此节奏重试（毫秒），重试前静默重推持久授权。 */
const NAS_RETRY_DELAYS: number[] = [600, 1800];
/** 上面这个超时的硬上限：防止以后有人把它调成几十秒，变相把恢复拖回启动关键路径。 */
const PERSIST_TIMEOUT_MAX_MS: number = 3000;
/** 「启动恢复进入上次目录」的总预算（ms）。从排程恢复那一刻起算：
 *  activatePermission(1500ms) + 读快照 + 探测 uri + 建列表都要在预算内完成并真正出图，
 *  否则（NAS 不可达 / 授权失效 / 系统服务挂住）不再继续尝试，直接打开选择文件夹。 */
const RESTORE_ENTER_TIMEOUT_MS: number = 3000;
/** 上述预算的诊断标记：状态栏/诊断串出现 et1 即表示装的是带超时收口的新包。 */
const ENTER_TAG: string = 'et1';
/** 第十轮诊断标记：状态栏 / 诊断串出现 ff1 即表示「遇到问题立即放弃」已生效。 */
const FF_TAG: string = 'ff1';
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
/** 第二十五轮：ESC 排查诊断层的**运行时**总开关（默认关闭 = 正式版干净界面）。
 *  与编译期的 SHOW_DIAG_BADGE 不同，此开关在 APP 内随时可切：
 *  `Ctrl+D` 或单击右下角缩放百分比。打开后一次性显示构建标记 /
 *  full win keys dsp hk wf / ESC# 链路 / 焦点结果 / 通道计数 /「退出 APP」按钮，
 *  供回归复查截图；关闭时右下角只剩缩放百分比。
 *  纯 UI 状态，不触碰 ESC 分派 / 焦点 / 窗口形态，零回归风险。 */
const DIAG_OVERLAY_DEFAULT: boolean = false;
/** 左栏是否隐藏以 . 开头的档案名 / 目录名（Win64 4600bcc） */
const HIDE_DOT_FILES: boolean = true;
/** 是否启用「竖图对开」（连续两张竖图左右并排）。对应 Win64 6347756。
 *  关掉它 = 永远单页显示，翻页 / 预载逻辑完全不变。 */
const SPREAD_PORTRAIT: boolean = true;
/** 当前目录的变动自检间隔（ms）。鸿蒙 SDK 26 没有 @ohos.file.fileObserver，
 *  没法挂 inotify 式的文件系统监听，只能退化为「定时比对目录 mtime」；
 *  检测到变化后去抖重扫，并保持当前张不闪（Win64 2bcbbb1 的变形实现）。 */
const DIR_POLL_MS: number = 1500;
/** 第四十六轮：mtime 探测的异步 stat 超时（毫秒）。NAS 中途掉线 / 休眠时一次
 *  stat 能挂很久 —— 异步化后用 race 兜底，超时按「本轮没探到」处理，绝不冻结 UI。 */
const MTIME_STAT_TIMEOUT_MS: number = 3000;
/** 第四十七轮：对开右页解码失败的重试节奏（毫秒）。大 JPG 目录**首次**打开时，
 *  右页解码与预载链并发争内存，可能一次性失败（OOM）/ IO 超时；旧版直接留空且
 *  uri 进 failed 黑名单 → 右页整个会话空白（右页刻意不做 uri 兜底，无任何自救）。
 *  这里按节奏补试：通常第一次重试就能命中预载链刚解好的缓存（decodeTo 复用路径，
 *  零解码）；真解不开的坏文件快速失败两次后放弃，不无限重试。 */
const RIGHT_PAGE_RETRY_DELAYS: number[] = [600, 1800];
const DIR_RESCAN_DEBOUNCE_MS: number = 900;
/** 第五十六轮：返回 APP 时若恰有在途操作，最多延后重试几次、每次间隔多久。
 *  既不抢占用户操作，也不让「返回后自动同步」被一次瞬时忙状态永久吞掉。 */
const RESUME_REFRESH_RETRY_MS: number = 400;
const RESUME_REFRESH_RETRY_MAX: number = 3;
/** 第五十七轮：冷启动补刷 —— 恢复链可能走满 900ms 定时器 + 3s 看门狗，
 *  重试窗口要盖得住；只在「恢复链尚未收口 / 在途操作」这类可恢复等待态重试，
 *  用户已动手 / 只读名单态 / 已消费资格一律不重试。 */
const BOOT_REFRESH_RETRY_MS: number = 400;
const BOOT_REFRESH_RETRY_MAX: number = 12;
/** 刷新来源：切后台返回（R56）/ 冷启动重启（R57）—— 只影响状态栏文案，
 *  两条链共用同一段真实列举与状态对账执行体。 */
const RESUME_SCENE_BACK: number = 0;
const RESUME_SCENE_BOOT: number = 1;

/** 第九十三轮：全屏切换后的「画布信任窗」——这段时间内禁止根容器反推覆盖实测画布。
 *  进出全屏时 root 与 preview 两个 onAreaChange 必然错帧，反推值会偏小（实测 1490×978 → 1470×941），
 *  而预览 Stack 的实测值才是真值。 */
const CANVAS_ROOT_TRUST_MS: number = 1500;
/** 第九十三轮：判「画布缩小是否与根同幅」的容差（vp）。小于它视为一致（像素取整 / 滚动条抖动）。 */
const CANVAS_SHRINK_TOL_VP: number = 2;
/** 第九十一轮：退出全屏后第二次画布采样的延迟（晚于 260ms 的落定、早于用户感知「稳定」）。 */
const FULL_EXIT_SAMPLE_MS: number = 1500;
/** 第九十五轮：F 键切换全屏的连按去抖窗口（ms）。
 *  按住 F 时系统会连发 Down（每次都是新 KeyEvent 对象，跨通道同对象去重拦不住），
 *  而 setFull 里的窗口 API 是异步的 —— 没有这层会把全屏刷成频闪、并出现
 *  「状态位已翻、窗口还在过渡」的错位。250ms 既能吃掉连发与同帧双通道回声，
 *  又不会挡掉用户有意的一下一按。注意：**只有 F 走这个去抖**，
 *  ESC / F11 / 双击仍立即响应（ESC 最忌讳被吞）。 */
const FULL_TOGGLE_GUARD_MS: number = 250;
/** 第十四轮：预览图放大镜 —— 直径由 3cm 翻倍到 6cm（1vp = 1/160 inch，故约 378vp）、
 *  局部放大仍是 3 倍。直径取 InteractionPlan.LOUPE_CM_14 单一真值来源，避免魔数漂移。
 *  左右并排两页各挂一层、按 pane 独立判定；全屏态同样保留；模式切换时统一复位。
 *  移入显示、移出立即隐藏、边缘夹界不空白。 */
const LOUPE_CM: number = LOUPE_CM_14;
const LOUPE_ZOOM: number = 3;
const LOUPE_D_VP: number = loupeDiameterVp(LOUPE_CM);
/** 第十七轮：密度比兜底基准（读不到 display 时 1vp ≈ 1px，与屏幕 dpi 解耦）。
 *  真实密度由 loupeDensityOf() 懒读 display.getDefaultDisplaySync().densityPixels
 *  并经 loupeDensityRatioOf 归一化；有效放大倍率 = LOUPE_ZOOM × 主视图 zoom × 真实密度。 */
const LOUPE_DENSITY_RATIO: number = 1;
/** 第十六轮：重采样目标解码边上限（防止超大画布 ×3 放大把解码分辨率推到失控）。
 *  第十七轮：作为 loupeResampleEdge2Of 的 cap，并额外夹到原图长边 ——
 *  decodePx 的 desiredSize 只能降采样不能升采样，请求超过原图边毫无意义。 */
const LOUPE_RESAMPLE_MAX_EDGE: number = 8192;
/** 第十六轮：解码边稳定阈值 —— 相邻两档目标边差小于该值就不重解，性能稳定。 */
const LOUPE_RESAMPLE_STABLE_MIN_DELTA: number = 64;
/** 第十七轮：重解码「真实像素增益」阈值 —— 目标边相对主视图解码边的提升不足该值时
 *  跳过重解码（小图 / 原图分辨率不足时补不出像素），省一次解码与一张大图内存。 */
const LOUPE_RESAMPLE_MIN_GAIN: number = 96;
// 第十六轮 400ms 时间冷却、第十八轮 pendingSystemEcho（一次性补发标志）均已废除：
// 两者本质都是对「系统补发 ESC」的错误猜测。实机真全屏首次 ESC 由系统消费后并不补发给
// APP，补发标志不会被任何事件消费，反而把用户主动的第二次 ESC 误吞 →「第二次 ESC 无响应」。
// 第十九轮定稿：escActionByState 严格只按 fullscreen 两态分派，不依赖任何时间窗 / 瞬时标志，
// shouldArmSystemEcho 恒不置位，pendingSystemEcho 恒 false。
/** 第七十七轮：左栏展开 / 收起宽度、三列宽度**全部改为 adaptive**。
 *  · 已移除 LIST_W=280 / LIST_MAX_W=900 / LIST_COLLAPSED_W=224 /
 *    listWidthForNames 固定开销 226 等一切预设 / 固定宽度限制；
 *  · 展开宽 / 收起宽 / 大小列 / 日期列都由 common/AdaptiveColumn.ts 的
 *    acLayoutOf(容器宽, 档案名内容, 大小列内容) 按「内容长度 + 容器尺寸」实时推出；
 *  · 窗口 resize（根 Stack 的 onAreaChange）会重算一次，列宽随容器动态伸缩。
 *  第一百零八轮：再叠一层「用户手工拖宽」—— 见 common/SidebarSplit.ts，
 *  用户没拖过（sidebarUserW = 0）时仍逐字走上面的自适应。 */
const SPLIT_W: number = SPLIT_DIVIDER_W;   // 分隔条宽度（不是档案列表列宽）
/** 第一百零九轮：拖拽手感参数。
 *  · CLICK_TOL：位移不超过它就算「点了一下」（不写盘、也不当成拖动）；
 *  · DOUBLE_TAP：两次按下的间隔上限，落在里面且上一次几乎没动 = 双击（复位自适应）。 */
const SPLIT_CLICK_TOL_PX: number = 3;
const SPLIT_DOUBLE_TAP_MS: number = 320;

const MIN_SCALE: number = 0.05;
const MAX_SCALE: number = 16.0;
const SLIDE_INTERVAL: number = 3000;
/** 第九十九轮：图像超分的调用超时（ms）。超分是 NPU 推理，正常几百毫秒；
 *  2.5s 还没回来就认定这拍不走超分，立刻用原图渲染（画面绝不等 AI）。 */
const SR_TIMEOUT_MS: number = 2500;
/** 第九十六轮：幻灯片交叉淡化的总时长与每步间隔（步数真值源在 common/SlideFade.ts）。
 *  420ms：短于 3s 间隔的 1/6，用户读完一张的时间不受影响；又足够长到「看得出是淡入淡出」
 *  而不是「跳一下」。 */
const SLIDE_FADE_MS: number = 420;
const SLIDE_FADE_TICK_MS: number = slideFadeTickMsOf(SLIDE_FADE_MS, SLIDE_FADE_STEPS);
/** 第九十六轮：等新图就绪的轮询间隔 / 上限（80ms × 16 ≈ 1.3s）。
 *  超时**不淡化**（宁可停在旧图上继续等），因为淡到一半底下没图就是空白。 */
const SLIDE_WAIT_POLL_MS: number = 80;
const SLIDE_WAIT_POLL_MAX: number = 16;

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

/** 鼠标键缩放倍率（旧配置，第七轮起**停用**）：左键放大 50%（×1.5）。
 *  用户要求「取消左 click 放大功能，仅保留双击进入全屏」→ onMouseButton 不再调用
 *  zoomAt(ZOOM_LEFT)。两个常量保留只为兼容旧配置与文档，当前路径均不使用。
 *  第十五轮起右键改为「toggle 放大镜总开关」（原「还原」按用户要求移除）。 */
const ZOOM_LEFT: number = 1.5;
const ZOOM_RIGHT: number = 2.0;
/** 按下到抬起若移动超过该距离（vp）就判定为「拖拽平移」，不触发点击 */
const CLICK_MOVE_TOL: number = 4;
/** 双击判定窗口（ms）：保留给「双击档案名 / 双击画布」时撤销残留单击快照用；
 *  第七轮起左键单击本身不放大，这个值只作防御性兼容。 */
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
/** 第七轮：预载解码档位的硬上限。预载不再只解「偏保守的低档位」，而是按
 *  decodeEdgeOf() 抬到「当前画布可直接显示」的档位 —— 同一张图只在载入时解一次，
 *  滚轮切到任意一张都直接复用已解码 PixelMap，不再当场补一次全清解码。
 *  2048 是「画质到位」与「1GB 缓存预算能多装几张」的折中：普通画布（约 1600vp）
 *  按 1.05 headroom 只需要约 1700 像素，2048 已满足，命中即上屏、无需再解；
 *  比直接按 displayEdge()(约 2400~3840) 解全库多驻留约一倍的张数，滚轮连翻更稳。
 *  全屏时仍用 FULLSCREEN_PRELOAD_MAX_EDGE=2560 放宽。 */
const PRELOAD_DECODE_MAX_EDGE: number = 2048;
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
/** 全量缓存模式（2026-11-11 第四轮，用户要求「全量缓存到内存、载入时同时预解码」）。
 *  true = 预载顺序铺满整个图库（fullPreloadIndex），不再按「当前位置前后各 100」滑动窗口，
 *         也不再 evictOutside() 淘汰窗口外的图；滚轮跳到任意一张都能命中缓存、瞬时上屏。
 *  false = 回退到旧窗口链（preloadOrder / evictOutside），实机内存吃紧时可一键切回。
 *  ⚠️ 全量是「尽力铺满」：PRELOAD_ALL_CAP / PRELOAD_MAX_BYTES 仍是防 OOM 的硬闸，
 *     只读名单态（ro1）的 bulkIoAllowed 闸门也绝不绕过 —— 历史 appfreeze 的教训。 */
const PRELOAD_ALL: boolean = true;
/** 全量缓存的张数上限（与 SCAN_CAP 同量级）。超过就触顶收工，不无限吃内存。 */
const PRELOAD_ALL_CAP: number = 20000;
/** 载入时「同时预解码」的受控并发路数。
 *  历史上 decodePx 的 fs.openSync 是同步跨进程调用，一次并发几百个会把主线程打满；
 *  第二十七轮起整条读链路已真异步，仍保留受控并发 —— 限制在途 IO 与内存峰值，
 *  不让一批几百个 fs.read / ArrayBuffer 同时压上来。整批落地后再灌下一批。 */
const PRELOAD_CONCURRENCY: number = 4;
/** 全量预载每批之间让出主线程的间隔（ms）。0 = 尽快但不堆叠在途异步 IO。 */
const PRELOAD_ALL_YIELD_MS: number = 0;
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
/** 第八十二轮：退出全屏后的「确认式重新适配」延时。
 *  等三块栏回来 + 窗口退出沉浸的布局动画基本落定（通常 < 200ms），
 *  又明显早于 800ms 的画质兜底 —— 不抢首次 onAreaChange，也不拖到用户可感知。 */
const FULL_EXIT_REFIT_MS: number = 260;
/** 普通拖窗口 resize 的重解**节流**间隔（ms）：拖动过程中每过这个间隔就按当前画布重解一次，
 *  停手后最后那次也会重解。不能用防抖 —— 每帧尺寸变化都重挂计时器的话，
 *  只要用户一直拖着，计时器永远不到点，重解一次都不会发生（第四轮实机失效原因之一）。
 *  布局层由 @State 直接驱动本来就实时；这里补的是「按新画布档位重新解码」。 */
const RESIZE_RELOAD_THROTTLE_MS: number = 140;
/** resize 重解的最小累积尺寸变化（vp）：相对「上次真正重解时的画布」比较，
 *  不能用相邻两帧之差（拖窗口每帧只变 1~3vp，永远够不到阈值）。 */
const RESIZE_MIN_DELTA_PX: number = 8;
/** 第五十八轮：固定栏偏移 chrome 自洽采样的容差（vp）与「固定栏占根尺寸」上限。
 *  chrome 是左栏 + 顶栏等固定占用，resize 时恒定；采样值超过基准 + 容差即判为
 *  跨帧污染（用旧根尺寸减新画布），保持原基准。maxRatio 兜住「chrome 吃掉大半个屏」。 */
const CHROME_SAMPLE_TOL: number = 2;
const CHROME_SAMPLE_MAX_RATIO: number = 0.6;
/** 第五十八轮：根容器反推画布覆盖 canvasW/canvasH 前的塌缩护栏 —— 画布至少占
 *  根尺寸的这个比例；低于它（或超过根尺寸）一律判为塌缩 / 越界反推值，拒绝覆盖，
 *  保留当前可信画布。真实画布通常占根 70%~100%，0.4 只挡极端塌缩，不误伤正常布局。 */
const CANVAS_MIN_ROOT_RATIO: number = 0.4;
/** 全屏态下画布缩到「全屏基准」的这个比例以下，判定系统已自行退出沉浸。
 *  真全屏下 ESC 常被窗口管理器消费，APP 收不到按键；此时窗口会缩小，
 *  据此自愈退出 APP 全屏态、恢复完整界面（与双击退出对齐）。
 *  第十六轮仅靠 0.92 比例阈值（要求缩小 8%），但「只回来标题栏 / dock」往往只
 *  缩小几十 px（~0.95），根本触发不了 —— 第十八轮补绝对像素判据见下方。
 *  误判由 FULL_SELF_HEAL_GUARD_MS 稳定期挡住。 */
const FULL_EXIT_SHRINK_RATIO: number = 0.92;
/** 第十八轮：系统退出沉浸自愈的「最小可见缩小」绝对像素阈值。
 *  真全屏 ESC 被系统消费后，常见表现只是 title / dock / 系统栏恢复，画布缩小几十 px；
 *  比例阈值(0.92)触发不了 → fullscreen 与真实窗口长期脱节、ESC 分状态整体失效。
 *  改用绝对像素即可捕获，同时用 8px 挡住 1~3px 的正常布局抖动。 */
const FULL_SELF_HEAL_MIN_SHRINK_PX: number = 8;
/** 进全屏后的自愈稳定期（ms）：真全屏的 maximize / layout 是一连串异步 await，
 *  过渡期画布尺寸会来回变，这段时间不做「缩小→退全屏」判定，避免刚进全屏就被误踢出来。
 *  用户按 ESC 通常发生在进全屏很久之后，不受影响。 */
const FULL_SELF_HEAL_GUARD_MS: number = 900;
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

/** 第二十九轮：会话内「某一层目录的真实清单快照」。
 *  只在 openFolder 真的 fs.listFile 成功、并且用本次真实 names 建好 rows 之后记录，
 *  **绝不**拿 this.rows（可能是上一屏 APP 内伪清单）来建。
 *  path 记当时真正能列的 base；names / uris 一一对应，uris 是同一 base 拼出的
 *  真实子项 URI —— 父目录列不出来时，兄弟目录用这个 URI 进去命中率最高。
 *  多层并存（上限 UP_DIR_CACHE_MAX），进入子目录不再覆盖父层那份完整清单。 */
interface UpDirSnapshot {
  path: string;
  names: Array<string>;
  uris: Array<string>;
  kinds: Array<number>;   // 当时 statSync 判出的真实行种类，避免靠名字猜文件夹
}
const UP_DIR_CACHE_MAX: number = 24;

/** 第四十二轮：目录整表缓存条目 —— 网盘 / NAS 列目录慢（listFile + 逐条 statSync
 *  全走网络），重进同一目录时先用上次真实列举的整表 rows **立即渲染**，真实列举
 *  继续在后台跑，完成后按需刷新：条目没变就完全不动视图，变了才按 uri 保位替换。
 *  只存内存（LRU，上限 DIR_ROWS_CACHE_MAX），不落盘 —— 跨重启的「秒开」由
 *  第三十六轮的目录上下文恢复（POS_KEY_UPCACHE）负责，两者互不替代。 */
interface DirRowsCacheEntry {
  path: string;       // 真实列举成功时解析出的 base（子项 URI 的拼接基准）
  label: string;      // 左栏抬头 / 状态栏用的目录显示名（dirDisplayName 的结果）
  rows: Array<ImageItem>;  // 上次真实列举的完整左栏行（含「..」行与图片 itemIndex）
  at: number;         // 写入时刻（调试 / 淘汰参考）
}
const DIR_ROWS_CACHE_MAX: number = 12;

/** 第六十七轮：一次放大镜重采样的完整画质决策（全由 LoupeQuality 纯函数产出）。
 *  tier / aa / interpolation / filter 只由**逻辑倍率**决定，density 只进 effective
 *  与像素预算 —— 不同 DPI 屏在同一倍率下落同一档，视觉稳定一致。 */
interface LoupeScalePlan {
  cap: number;              // 运行时能力档（0 组件级回退 / 1 系统 AA / 2 裁剪+缩放）
  logical: number;          // 逻辑倍率 = LOUPE_ZOOM × zoom（刻意不含密度）
  effective: number;        // 有效像素倍率 = 逻辑倍率 × 真实密度
  tier: number;             // 跨密度一致档 0/1/2
  kind: number;             // 内容种类：影像 / 图形 / 文字
  aa: number;               // 系统级 AA 档（LQ_AA_*）
  want: number;             // 期望系统级缩放倍率（再交给 lqSafeFactorOf 夹预算）
  target: number;           // 目标长边（夹到原图长边与 LQ_MAX_EDGE）
  interpolation: number;    // 回退路径用的组件插值档（LQ_IP_*）
  filter: number;           // 硬件采样 FilterMode（LQ_FILTER_*）
}

/** 受支持的图片后缀。第六十五轮追加 FITS / XISF 天文图像后缀 —— 系统 codec 不认，
 *  由 model/Preview.ets 的 decodeAstroPx 自解析；后缀进本表即自动获得左栏列出 /
 *  进 items 翻页序列 / hover 缩略图 / 文件选择器 / R64 内容量计数的全部既有行为。
 *  与 common/AstroImage.ts 的 AI_FITS_SUFFIXES + AI_XISF_SUFFIXES 逐项一致（R65 静态契约校验）。 */
const IMAGE_SUFFIXES: Array<string> = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif',
  '.fits', '.fit', '.fts', '.xisf'];

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
/** 第三十七轮：文本 / 源码后缀的「格式」下拉项。textSuffixListOf() 返回不带点号的
 *  后缀名，picker 过滤串要用带点号的写法，故逐项补 '.'；显示名与过滤串同源，
 *  不会两处各写一份后缀清单而渐渐分叉。 */
function textFileFilterOf(): string {
  const list: Array<string> = textSuffixListOf();
  const exts: Array<string> = [];
  for (let i = 0; i < list.length; i++) {
    exts.push('.' + list[i]);
  }
  return '文本/源码(' + exts.join(', ') + ')|' + exts.join(',');
}

const FILE_FILTERS: Array<string> = [
  '所有文件(*.*)|.*',
  '图片(' + IMAGE_SUFFIXES.join(', ') + ')|' + IMAGE_SUFFIXES.join(','),
  textFileFilterOf()
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
  // 手工兜底（第八轮改走 DirName 纯函数，与 realPathOf / volumeRootOf 同一口径）：
  //   file://docs/storage/...          → /storage/...（文档 provider 伪 authority 丢掉）
  //   file://192.168.100.61/图片档案/… → /192.168.100.61/图片档案/…（**保留 NAS 主机段**）
  //   \\192.168.100.61\图片档案\…      → /192.168.100.61/图片档案/…（UNC 折叠分隔符）
  // 旧写法把 file:// 后的第一段一律当 authority 吞掉，NAS 目录因此被列成错误目录表；
  // 往上层生成的父 URI 也走这里，所以修正必须落在 dirCandidates 而不能只改 DirName。
  const real: string = realPathOf(raw);
  if (real.length > 0) {
    add(real);
    add(hierPathOf(raw));
  }
  return out;
}

/** 第四十四轮：URI 是否「网络目录」形态（NAS scheme 授权形 / userExternal 挂载形 / UNC）。
 *  只有网络目录才做 13900002 重连重试 —— 本地目录 ENOENT 是真删了，快速失败；
 *  file://docs/ 与 file://media/ 是本机 provider，不算网络目录。 */
function isNetworkDirUri(u: string): boolean {
  return (u.indexOf('://') >= 0 && u.indexOf('file://docs/') !== 0 && u.indexOf('file://media/') !== 0)
    || u.indexOf('/storage/userExternal/') >= 0
    || u.indexOf('\\\\') >= 0;
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
/** 第十轮：上次恢复以失败告终的目录标记（小 key，只存一个短 uri）。
 *  重开时若与本次要恢复的目录吻合，说明又是同一个死路径 —— 零 IO、零等待直接放弃。
 *  用户重新选到目录后立即清空，绝不误伤正常恢复。 */
const POS_KEY_DEAD: string = 'deadDirUri';
/** 第三十轮：上次退出时的**实际浏览层级**（browseBase 的持久化形态）。
 *  只有当它与 lastDirUri（picker 授权根）同层或在其之下时才会被采纳 ——
 *  重启后「往上层」从用户真正所在的目录起算，而不是从授权根跳级。 */
const POS_KEY_BROWSE: string = 'lastBrowseBase';
/** 第三十轮：多层目录清单快照（R29 upDirCache 的持久化形态，行式文本）。
 *  重启后父目录仍列不出来时，APP 内清单能还原上次见过的全部兄弟目录。 */
const POS_KEY_UPCACHE: string = 'lastUpCache';
/** 第三十六轮：上次退出是否停在「目录浏览态且本层零图片」。
 *  只存一个字符 '1' / ''，绝不引入 XML 非法控制字符（R31 教训）。
 *  目录位置是独立于图片的纯字符串信息：整条落盘 / 恢复链都不该挂靠 LastPos。 */
const POS_KEY_DIRCTX: string = 'lastDirCtx';
/** 第六十四轮：目录「内容量」缓存有效期（ms）的独立小 key。
 *  读回后经 dcTtlClampOf 夹界；缺省 / 脏值一律用 DC_TTL_DEFAULT_MS。
 *  ⚠️ 只存一个整数，不碰既有位置记忆 / 快照 key，启动读 prefs 的量不变。 */
const POS_KEY_DC_TTL: string = 'dirCountTtlMs';
/** Ctrl+D 诊断层里循环切换的 TTL 预设档（毫秒）：1 分 / 5 分 / 15 分 / 1 小时。 */
const DC_TTL_PRESETS: number[] = [60000, 300000, 900000, 3600000];
/** 用户主动「往上层」时最多真实列举多少个同层 URI 写法。
 *  dirCandidates 每个父级约 6 种写法、同层候选通常数个，64 已远超实际规模；
 *  这里只是 NAS 上的无界放大护栏，绝不截掉真实存在的兄弟目录。 */
const UP_EXPLORE_MAX_FORMS: number = 64;
/** 快照持久化封顶：preferences 是轻量 KV，层 / 条目 / 总长都设上限，
 *  绝不把启动读 prefs 再拖出一次 appfreeze（历史教训：600 条 uri 就够卡 8 秒）。 */
const UP_CACHE_SAVE_LEVELS: number = 12;
const UP_CACHE_SAVE_NAMES: number = 64;
const UP_CACHE_SAVE_CHARS: number = 12000;
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
/** 第七十七轮：冷启动探测误判授权失效后的「延迟自愈重探」延时。
 *  DocumentsProvider / 目录持久授权常在首帧后几百毫秒才就绪，启动那一次
 *  fs.openSync 失败不代表整批 uri 都打不开；错开这段时间再探一次即可，
 *  不抢恢复关键路径，也不新增任何批量同步 IO。 */
const RESTORE_HEAL_DELAY_MS: number = 1200;
/** 第七十九轮：只读名单态「目录重列举兜底」的延时。
 *  比 RESTORE_HEAL_DELAY_MS 早 300ms —— 自愈只重探 okUri 一个候选（救不了
 *  「那张被移走」的误判），重列举才是真正能救回预览的那条路，先试它。
 *  仍然远在首帧之后，不抢恢复关键路径。 */
const READONLY_RELIST_DELAY_MS: number = 900;
/** 重列举最多试几个目录 URI 形态（picker FOLDER 模式返回的形态不统一）。 */
const RELIST_CAND_MAX: number = 2;
/** 「按目录授权重列举恢复」的诊断标记（不是版本号）。实机状态栏出现 rl1 即带此修复。 */
const RELIST_TAG: string = 'rl1';
/** 恢复延迟的硬下限（resumeDelaySafe 校验用）：低于这个值一律拒绝调度，
 *  防止以后有人把 RESUME_DELAY_MS 调太小，把恢复又塞回启动关键路径。 */
const RESUME_MIN_SAFE_MS: number = 600;
const SNAP_KEY_COUNT: string = 'snapCount';
const SNAP_KEY_PREFIX: string = 'snap_';   // snap_0 / snap_1 / …
/** 旧格式最多会留下多少块（3000 / 200 = 15）—— 用于首写时把历史残留清理掉 */
const OLD_SNAP_CHUNKS: number = 15;

/** 会话状态持久化（2026-11-12 第六轮）：档案元数据 / 窗口大小位置 / 左栏收起态。
 *  全部是**小 key**，与位置记忆共用同一份 preferences，绝不新增大 value、
 *  绝不把恢复动作塞回启动关键路径（历史 appfreeze 的根因）。 */
const META_KEY_PREFIX: string = 'snapMeta_';    // 与 snap_N 一一对应的「体积,日期」块
const WIN_KEY_RECT: string = 'winRect';          // 'left,top,width,height'（px）
const WIN_KEY_COLLAPSED: string = 'listCollapsed'; // 1 = 收起；0 / 缺失 = 展开
/** 第七轮：窗口形态小 key。1 = 退出前是最大化（含系统 FULL_SCREEN 形态）；
 *  0 / 缺失 = 自由窗口。与 winRect 分开存：最大化时不能被 rect 恢复打回普通尺寸。 */
const WIN_KEY_MAXIMIZED: string = 'winMaximized';
/** 第一百零八轮：用户拖拽设定的左栏展开宽（vp）。0 / 缺失 = 没拖过 → 走自适应。
 *  与 winRect / listCollapsed 同批同步落盘，重启后先读回再交给 SidebarSplit 夹取。 */
const WIN_KEY_SIDEBAR_W: string = 'sidebarW';
/** 第一百一十轮：收起态被拖出来的宽度（vp）。收起态也能拖，所以必须独立记忆 ——
 *  否则「展开 500 / 收起 140」会互相覆盖。0 = 没拖过 → 按可见内容自适应。 */
const WIN_KEY_SIDEBAR_CW: string = 'sidebarCollapsedW';
const WIN_MIN_W: number = 320;
const WIN_MIN_H: number = 240;
const WIN_MAX_W: number = 16384;
const WIN_MAX_H: number = 16384;
/** 拖窗口时窗口 rect 的防抖写盘间隔：不必每帧写 preferences。 */
const WIN_RECT_SAVE_MS: number = 600;
/** 启动恢复窗口 rect 的延迟：与 RESUME_DELAY_MS 同源，避开首帧 watchdog。
 *  官方 FAQ 明确 aboutToAppear 阶段拿到的 windowRect 可能不准，必须等窗口可见之后再取/设。 */
const WIN_RECT_RESTORE_MS: number = 900;
/** 窗口实例由 EntryAbility 异步放进 AppStorage：短延时重试次数 / 间隔。 */
const WIN_RECT_RETRY_MAX: number = 2;
const WIN_RECT_RETRY_MS: number = 120;

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

/** 第三十七轮：文本预览的行数据源。与 GalleryDataSource 同口径 —— 十几万行文本
 *  只把「原始行字符串」放在普通数组里，靠 LazyForEach 按需创建可见行节点；
 *  reload() 统一通知 onDataReloaded，换文件时不会残留旧节点。 */
class TextLineSource implements IDataSource {
  private lines: Array<string> = [];
  private listeners: DataChangeListener[] = [];

  totalCount(): number {
    return this.lines.length;
  }

  getData(index: number): string {
    return this.lines[index];
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

  reload(list: Array<string>): void {
    this.lines = list;
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
  // UI 只需要 itemCount（第一百零二/一百零三轮起左栏抬头已整块移除，此值仅作状态快照）与 LazyForEach 的数据源。
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
  /** 第二十九轮：多层真实目录清单快照。旧 lastUpNames 是单槽，进入任一层就覆盖，
   *  父层那份含全部兄弟目录的清单会丢 —— 上层清单于是只剩「恒列当前目录」一项。
   *  这里按层并存，sameDirPath 命中目标层的**全部**快照一起聚合，杜绝遗漏。 */
  private upDirCache: Array<UpDirSnapshot> = [];
  /** 第四十二轮：目录整表 LRU 缓存（网盘秒开）。键是解析出的 base 路径，
   *  sameDirPath 模糊匹配（file://docs 与 %XX 写法视为同一目录）。 */
  private dirRowsCache: Array<DirRowsCacheEntry> = [];
  /** 第三十三轮：初始化时从缓存目录结构预建的父子逻辑层级索引。
   *  第三十四轮订正：只作「往上层」同层候选的**优先佐证**，不是唯一真值源、
   *  更不是闸门；触发时只查不建，未命中时原有路径层级链照常上移。 */
  private upParentIndex: UpParentIndex = { edges: [], keys: [], minLevel: -1 };
  private upParentBuilt: boolean = false;
  /** 左栏当前是不是「APP 内自建清单态」。为真时点目录行绝不弹「目录内多选」兜底选择器。 */
  private inAppUpList: boolean = false;
  private dirMtime: number = 0;             // 当前目录 mtime，用于自检（SDK26 无 fileObserver）
  private dirPollTimer: number = -1;        // 目录轮询句柄
  private rescanTimer: number = -1;         // 变动后去抖重扫句柄
  private mtimeBusy: boolean = false;       // 第四十六轮：上一轮 mtime 异步 stat 未回来时不堆叠
  private folderBusy: boolean = false;      // 防止导航连点 / 重扫叠加重入
  /** 第四十三轮：目录列举的代际号。每次真正开始列目录 +1；在途列举完成后
   *  若发现自己的代际号已过期，说明被更新的用户导航抢占，结果整段丢弃。 */
  private openEpoch: number = 0;
  // 第六十四轮：目录内容量的会话内缓存 / TTL 设置 / 空闲闸门 / 心跳（全部普通字段，
  // 只有展示用的 dirCountLabels / dirCountVersion / dirCountTtlLabel 进状态系统）。
  private dirCountCache: Map<string, DirCountEntry> = new Map();
  private dirCountOrder: string[] = [];
  private dirCountTtlMs: number = DC_TTL_DEFAULT_MS;
  private dirCountTimer: number = -1;
  private dirCountScanBusy: boolean = false;
  private dirCountScanToken: number = 0;
  private lastInputAt: number = 0;
  @State itemCount: number = 0;
  /** 左栏实际行数（含「..」/ 子文件夹 / 灰行），与 itemCount（只算图片）分开。
   *  判空态必须用 rowCount：像「人像」这种全是子文件夹、零图片的目录，
   *  itemCount=0 但 rows 有内容，旧版会整块换成「还没有图片」空态 → 目录表全白。 */
  @State rowCount: number = 0;
  /** 目录态零图片时的一行说明，显示在列表上方，避免用户以为又是空白 / 出错。 */
  @State dirHint: string = '';
  /** 第六十四轮：与 this.rows 同下标的目录内容量文案（非目录行为空串）。
   *  每次整份换新引用，SidebarView 的 @Prop 才会重渲染可见行。 */
  @State dirCountLabels: string[] = [];
  /** 展示版本号：统计落地 / 失效时 +1，供 SidebarView 建立 V1 依赖。 */
  @State dirCountVersion: number = 0;
  /** Ctrl+D 诊断层显示的当前 TTL 文案（@State，设置变更即时刷新）。 */
  @State dirCountTtlLabel: string = dcTtlLabelOf(DC_TTL_DEFAULT_MS);
  /** 第八十四轮：`source` 一变就把目录名同步到**系统窗口标题栏**（见 syncWindowTitle）。
   *  用 @Watch 一处收口，5 个 source 赋值点（恢复 / applyItems ×2 / 文本态 / 上层清单）
   *  全部自动跟随，不需要在业务分支里手写调用。 */
  @State @Watch('syncWindowTitle') source: string = '尚未打开';
  @State cur: number = -1;          // 当前选中索引；-1 表示空
  /** 第五十九轮：往上层落地后「返回前所在子目录名」的反色标记（空串 = 无反色）。
   *  ⚠️ 与 cur / selected / dataSource 的常规选中链完全隔离：不参与点选、目录切换、
   *  翻页、预载；只由 browseUp() 成功落地时设置，由 applyItems / showUpListInApp 收口，
   *  再经 SidebarView → ArchiveRow 按「名字严格相等 + 目录类行」逐行判定反色。 */
  @State upReturnName: string = UPRET_NONE;
  /** 当前浏览目录的完整路径（Win64 07c1eee：搬到标题栏）。鸿蒙没有 setWindowTitle，
   *  就放在顶栏 PIKAN 右边，显示时中间省略保住末尾目录名。 */
  @State titlePath: string = '';
  /** 左栏收起态（Ctrl+B / « 按钮）= 第七十八轮「缩进按钮按下」态。
   *  紧凑显示：只留档案名 / 目录名，隐藏时间 / 大小 / 状态 / 辅助标签；
   *  栏宽由 acCollapsedContentOf() 按当前可见内容自适应（名称 + 三个图案按钮），
   *  不保留比例空白；取消按下即恢复完整三栏与默认 adaptive 宽度。 */
  @State listCollapsed: boolean = false;
  /** 第七十七轮：adaptive 布局的四个动态量，全部由 acLayoutOf 推出，无预设固定宽度。 */
  @State listW: number = acLayoutOf(0, ['选择文件夹'], ['12.34 MB']).sidebarW;
  @State collapsedW: number = acLayoutOf(0, ['选择文件夹'], ['12.34 MB']).collapsedW;
  @State colSizeW: number = acLayoutOf(0, ['选择文件夹'], ['12.34 MB']).sizeW;
  @State colDateW: number = acLayoutOf(0, ['选择文件夹'], ['12.34 MB']).dateW;
  /** 第七十九轮：名称列是否改多行换行 —— **第一百一十轮已废除**（名称严格单行 + 截断）。
   *  换行标志整条移除，改由下方 hideMeta 表达「宽度不够 → 先牺牲大小 / 日期」。 */
  /** 第一百零八轮：用户拖拽设定的左栏展开宽（vp）。0 = 没设过 → 走 acLayoutOf 自适应。
   *  这是**用户意图**，不随窗口大小改写：窗口变窄时只在算 listW 时临时夹取，
   *  窗口放大后能回到原来的宽度。 */
  @State sidebarUserW: number = 0;
  /** 第一百一十轮：收起态被拖出来的宽度（与展开宽分开记忆，互不覆盖）。 */
  @State sidebarCollapsedUserW: number = 0;
  /** 第一百一十轮：左栏当前宽度放不下「名称 + 大小 + 日期」时，隐藏后两列。
   *  由 SidebarSplit.splitHideMetaOf(当前宽, 内容所需宽) 判定，拖动中逐帧更新。 */
  @State hideMeta: boolean = false;
  /** 第一百零八轮：正在拖分隔条 —— 只驱动分隔条高亮与状态栏文案（不参与布局计算）。 */
  @State sidebarDragging: boolean = false;
  /** 第一百零八轮：鼠标悬停在分隔条上（提示「这里可以拖」）。 */
  @State sidebarHover: boolean = false;
  /** 左栏排序方向：true = 升序（自然序） */
  @State sortAsc: boolean = true;
  /** 「当前路径是否仍有父级」——只作状态栏文案、诊断串与 browseUp 的行为判据。
   *  ⚠️ 2026-11-11 用户明确要求「不要 grey out、不能禁用」：这个字段**绝不**参与
   *  按钮的 enabled / 颜色 / 透明度；「往上层」按钮任何时候都是亮的、可点的。
   *  到卷根 / 图片列表态为 false 时，点击由 browseUp() 给提示、不移动目录。 */
  @State canGoUp: boolean = false;
  /** 第十三轮：左栏可见范围（onScrollIndex 上报，-1 = 尚未上报）。
   *  只作点选 / 翻页的滚动判据，不参与 UI 渲染，故不用 @State。 */
  private listFirstRow: number = -1;
  private listLastRow: number = -1;
  /** 第六十轮：挂起的「最小位移完整显示」定位请求。只在状态落地 / 容器尺寸变化时
   *  置 true，纯滚动过程恒 false —— 护栏绝不在用户滚动时把高亮拉回，滚动体验不变。 */
  private highlightRevealPending: boolean = false;
  /** 第六十轮：上次校正的 (row, 可见范围, 总行数) 自锁 key；相同态不重复校正。 */
  private highlightGuardKey: number = HV_KEY_INVALID;
  /** 第六十轮：根容器上一次有效尺寸，供 highlightResizeOf 判定是否真变化。 */
  private highlightRootW: number = -1;
  private highlightRootH: number = -1;
  /** 第十五轮：放大镜总开关，预设关闭（鼠标右键 toggle 开启 / 关闭）。
   *  关闭时仍照常维护 loupePane / loupeHover / 坐标，只是不绘制浮层，
   *  因此右键开启后无需重新移入即可立即显示当前页放大内容。 */
  @State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;
  /** 第十四轮：预览图放大镜状态。loupePane = 当前鼠标所在预览页
   *  （NONE 无 / LEFT 单页或并排左页 / RIGHT 并排右页）；坐标是相对「该页显示框」
   *  的局部坐标，两页各自解释自己的坐标，故互不影响。
   *  loupeHover=false 或 pane 不命中时浮层完全不渲染（移出立即隐藏、零动画）。 */
  @State loupePane: number = LOUPE_PANE_NONE;
  @State loupeHover: boolean = false;
  @State loupeX: number = 0;
  @State loupeY: number = 0;

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
  // 第七十一轮：HDR 保真结果原因码 + 界面明确提示（正常态为空串）。
  @State hdrCode: number = 0;
  @State hdrHint: string = '';

  // ---- 画布尺寸（onAreaChange 得到）----
  @State canvasW: number = 800;
  @State canvasH: number = 600;

  // ---- 交互 ----
  @State playing: boolean = false;
  /** 第九十六轮 / 第九十七轮：幻灯片交叉淡化（**遮挡式单层淡出**）。
   *  · slideOutPx       —— 正在淡出的「上一张」（左页），与当前张同时存在、完全重叠；
   *  · slideOutRightPx  —— 同一时刻右页的「上一张」（只在并排模式下有值）；
   *  · slideOutOpacity  —— 唯一的动画量：1 → 0，同时驱动左右两张旧图；
   *  主图（新图）**不挂 opacity**（恒不透明）—— 这样任何一帧底下都有图垫着，
   *  结构上不可能出现「两层都半透明 / 一层都没有」的闪屏帧（R96 的根因）。
   *  透明度曲线仍是 common/SlideFade.ts 的 smoothstep，`out + in ≡ 1` 的互补关系保留在纯函数里
   *  （渲染只用 out，因为旧图在上层、完全不透明时已经遮住下面的新图）。 */
  @State slideOutPx: image.PixelMap | undefined = undefined;
  @State slideOutRightPx: image.PixelMap | undefined = undefined;
  @State slideOutOpacity: number = 0;
  /** 是否处于叠显期（纯逻辑标志，不参与渲染条件 → 不做 @State，少一次刷新）。 */
  private slideBlending: boolean = false;
  /** 第九十八轮：**进入幻灯片那一刻「是否并排」的快照**。
   *
   *  播放期间视图形态一律以它为准（`true` → 全程并排、`false` → 全程单张），
   *  这样「进入前什么样，播放中就什么样」——既不会被单片默认状态压掉，
   *  也不会在下一张是横图时又自己跳回单张（那是另一种「强制跳转」）。
   *  不播放时它完全不起作用（`spreadShown()` / `refreshSpread()` 只在 playing 分支读它），
   *  所以「单张模式单独使用」的行为一个字节都没变。 */
  private slideSpreadHold: boolean = false;
  /** 淡出那张是否是「我们自己解码 / 自己精炼」的（结束时必须 release）；
   *  命中预载缓存的那张归缓存所有，绝不能在这里释放。 */
  private slideOutOwned: boolean = false;
  private slideOutRightOwned: boolean = false;
  /** 淡化代号：任何一次新的淡化 / 停止 / 手动翻页都 ++，在途的分步 tick 立即作废。
   *  这是替代 animateTo 的关键 —— 可以「取消」。 */
  private slideFadeSeq: number = 0;
  private slideFadeTimer: number = -1;
  private slideWaitTimer: number = -1;
  /** 本次 go() 是否由幻灯片推进发起 —— 用于区分「自动推进」与「用户手动翻页」，
   *  后者要立刻作废正在跑的淡化（否则旧图会盖在用户刚选的新图上 400ms）。 */
  private slideAdvancing: boolean = false;
  @State status: string = '点左栏「选择文件夹」浏览目录';
  /** 第七十二轮：右键「详情」面板。只存面板自己要画的纯字符串字段，
   *  不碰 items / rows / cur / browseBase —— 关掉面板后一切浏览状态原样。 */
  @State ctxDetailOn: boolean = false;
  @State ctxDetailTitle: string = '';
  @State ctxDetailFields: Array<FcDetailField> = [];
  /** 第七十三轮：档案列表右键菜单浮层。由 ListItem.onMouse 右键 Press 上抛窗口坐标后
   *  条件渲染，不依赖 bindContextMenu / ResponseType.RightClick 的系统手势通道。
   *  idx + 菜单项快照在打开时一次写入，之后行数据变化也不会让浮层自己跳内容。 */
  @State ctxMenuOn: boolean = false;
  @State ctxMenuIdx: number = -1;
  @State ctxMenuX: number = 0;
  @State ctxMenuY: number = 0;
  @State ctxMenuName: string = '';
  @State ctxMenuItems: Array<FcMenuItem> = [];
  @State ctxMenuHover: string = '';
  // ---- 第七十六轮：预览区相片右键菜单 / EXIF 图标 / 资料框 / 预览模式 ----
  /** 相片右键菜单浮层：只在预览区相片上右键时置位，与左栏 ctxMenuOn 互不干扰。 */
  @State pmMenuOn: boolean = false;
  @State pmMenuX: number = 0;
  @State pmMenuY: number = 0;
  @State pmMenuName: string = '';
  @State pmMenuItems: Array<PmMenuItem> = [];
  @State pmMenuHover: string = '';
  /** 第一百零七轮：本次浮层的实际宽度（随根容器自适应，桌面 232vp / 窄屏收窄）。 */
  @State pmMenuW: number = PM_MENU_W;
  /** 第一百零七轮：当前获得键盘焦点的开关行（动作码）。只用于画焦点框 ——
   *  键盘 Tab 到某个开关时整行有可见描边，读屏软件另有原生 Toggle 语义兜底。 */
  @State pmFocusAct: string = '';
  /** 第一百零六轮：菜单目标下标 —— 右键按在**哪一页**就锁哪一页（并排时右页即 spreadB）；
   *  -1 = 未指定（落在图片间隙 / 空白，沿用「当前图」的既有口径）。 */
  @State pmTargetIdx: number = -1;
  /** 第一百零六轮：「超分辨模式」总开关。默认开（= R99 起的按需自动超分）；
   *  关掉即刻释放超分产物回原图，且后续不再触发。 */
  @State srMode: boolean = true;
  /** 第一百零六轮：EXIF 资料框当前展示的字段 —— 可能是右页那张，不一定是主视图那张。 */
  @State exifPanelFields: Array<PmExifField> = [];
  /** 第七十七轮：当前相片是否确有【有效 EXIF 数据】
   *  （= pmExifEffectiveOf(exifFields)，来自 PreviewEntry.hasExif；与资料框同源）。 */
  @State viewHasExif: boolean = false;
  @State viewExifFields: Array<PmExifField> = [];
  /** 「显示exif资料框」动作的独立浮层。 */
  @State exifPanelOn: boolean = false;
  @State exifPanelTitle: string = '';
  /** 预览形态：AUTO（初始值，既有竖图自动对开）/ SPREAD（并排开关「开」）/ SINGLE（「关」）。
   *  第一百零七轮起用户只有「并排」一个开关，AUTO 只是首次进入时的初值，
   *  一旦拨动开关就固定为 SPREAD 或 SINGLE，不再回到 AUTO。 */
  @State previewMode: number = PM_MODE_AUTO;
  /** 真全屏：应用内三块栏 + 系统标题栏 / dock / 状态栏 / 导航栏全部不显示，画面只剩图片。
   *  2026-11-11 起 applyWindowFullScreen() 会调 window 最大化沉浸接口，详见该方法注释。 */
  @State fullscreen: boolean = false;

  /** 第一百零八轮：本次拖拽是否真的在进行（按下 → 移动 → 松开的闸门）。
   *  非 @State：它不参与渲染，只防「没按下就收到 move / 收起态误拖 / 重复收尾」。 */
  private splitDragActive: boolean = false;
  /** 本次拖拽的起始宽：每帧都按 start + 绝对位移 算，绝不做增量累加（增量会随丢帧漂移）。 */
  private splitStartW: number = 0;
  /** 第一百零九轮：按下那一刻的**绝对横坐标**（窗口坐标）。拖动全程只比较
   *  「当前绝对 X − 起始绝对 X」，因此鼠标冲出 14vp 窄条后依然连续跟手。 */
  private splitStartX: number = 0;
  /** 本次按下累计的最大位移：区分「点一下」与「拖动」，也用于双击判据。 */
  private splitMovedPx: number = 0;
  /** 上一次按下的时刻（双击复位用）。 */
  private splitLastDownMs: number = 0;
  /** 第一百一十轮：名称完整显示 + 大小 / 日期两列都在，所需的内容口径总宽。
   *  非 @State —— 只给拖动过程中实时判 hideMeta 用（每帧都要算，不能等重排）。 */
  private autoNeedW: number = 0;
  /** 本次拖动改的是哪一态：true = 收起宽（collapsedW），false = 展开宽（listW）。
   *  两态各自记忆、互不覆盖。 */
  private splitDragCollapsed: boolean = false;
  /** 第一百一十一轮：最近一次按下是否落在中间 « 按钮上（由按钮的 onMouse/onTouch 置位）。
   *  只用于**跳过双击复位**判定：双击按钮本意是收起 / 展开，不该顺手改宽度。
   *  分隔条在本帧读走并清零，绝不留到下一次按下。 */
  private splitPressOnButton: boolean = false;
  /** 光标是否已被我们改成左右箭头 —— 只在自己改过时才 restoreDefault，
   *  避免把系统 / 其它控件正在用的光标状态冲掉。 */
  private splitCursorSet: boolean = false;

  private timerId: number = -1;
  private baseZoom: number = 1;
  private ctrlDown: boolean = false; // Ctrl + 滚轮 = 缩放，由键盘事件跟踪
  private shiftDown: boolean = false; // Shift + R/H/V/B 组合键（Win64 10-29 起）
  private baseTx: number = 0;
  private baseTy: number = 0;
  // 单击视图快照（第七轮起左键不放大，恒为 -1）：保留给双击档案名 / 双击画布做防御性兼容
  private clickSnapZoom: number = -1;
  private clickSnapTx: number = 0;
  private clickSnapTy: number = 0;
  private clickSnapAt: number = 0;

  /** 进出全屏后画布尺寸会变，需要在尺寸落地后按新尺寸重解一次大图，否则只是把旧分辨率拉大（发虚） */
  private pendingReload: boolean = false;
  /** pendingReload 的兜底计时器：窗口 API 没产生 onAreaChange 时也要重解一次 */
  private canvasReloadTimer: number = -1;
  /** 普通 resize 的节流计时器：拖动过程中每 RESIZE_RELOAD_THROTTLE_MS 重解一次 */
  private resizeReloadTimer: number = -1;
  /** 第八十二轮：退出全屏后的确认式重新适配计时器（页面销毁时一并清掉）。 */
  private fullExitRefitTimer: number = -1;
  /** 第九十一轮：退出后再多采一次画布（+1500ms），用来判定「画布是瞬态还是稳态变小」。 */
  private fullExitSampleTimer: number = -1;
  /** 第九十三轮：信任窗截止时刻。窗内只认预览 Stack 的实测画布，不许根容器反推改写。 */
  private canvasRootTrustUntil: number = 0;
  /** resize 累积判据：上次**真正触发重解**时的画布尺寸（0 = 首帧还没重解过）。
   *  ⚠️ 不能拿「上一帧尺寸」比：拖窗口每帧只变 1~3vp，永远够不到 8vp 阈值，
   *     重解就一次都不会发生 —— 第四轮实机「resize 没反应」的主因之一。 */
  private lastReloadW: number = 0;
  private lastReloadH: number = 0;
  /** 根 Stack（100%×100%，直接跟窗口）上一次的尺寸，以及由此测出的固定栏偏移
   *  chrome = 根尺寸 - 预览画布尺寸（左栏 + 顶栏 + 状态栏）。
   *  深层 layoutWeight(1) 的预览 Stack 在 PC 窗口 resize 时可能收不到 onAreaChange，
   *  用根尺寸 - chrome 就能精确反推新画布尺寸，不赌深层回调。chrome < 0 = 基准未就绪。 */
  private lastRootW: number = 0;
  private lastRootH: number = 0;
  private chromeW: number = -1;
  private chromeH: number = -1;
  /** 全屏期间的画布基准尺寸（取进入全屏后的最大值）。系统自行退出沉浸时画布会缩小，
   *  与这个基准比较即可判定「该自动切回完整界面」，不依赖 APP 是否收到 ESC 按键。 */
  private fullCanvasW: number = 0;
  private fullCanvasH: number = 0;
  /** 进全屏的时刻：稳定期内不做自愈判定，避开 maximize/layout 异步过渡期的尺寸抖动 */
  private fullEnterAt: number = 0;
  /** 全屏时是否由我们主动最大化过窗口 —— 退出时才知道要不要 recover 回自由窗口 */
  private maximizedByUs: boolean = false;
  /** 进入全屏前的视图 / 界面状态快照：ESC 退出时要「切回之前的完整界面」，
   *  包含缩放平移、手动旋转、状态栏文案，不能只翻 fullscreen 一个布尔。 */
  private hasFullSnapshot: boolean = false;
  private preFullZoom: number = 1;
  private preFullTx: number = 0;
  private preFullTy: number = 0;
  private preFullRot: number = 0;
  private preFullFlipH: boolean = false;
  private preFullFlipV: boolean = false;
  private preFullStatus: string = '';
  /** 第九十二轮：进入全屏前「系统窗口装饰（标题栏 / 边框）」是否可见。
   *
   *  退出时旧代码无条件 `setWindowDecorVisible(true)`，等于**强制**给窗口加回一条标题栏；
   *  若进入前本来是无装饰的（本机最大化态默认无标题栏，且 ENTER_IMMERSIVE 是持久形态），
   *  这一下会让窗口内容区永久少掉「标题栏 37vp 高 + 边框 20vp 宽」——
   *  实测 canvas 1490×978 → 1470×941，图与整个界面一起缩 3.7%。 */
  private preFullDecorVisible: boolean = true;
  /** 第八十九轮：视图快照的**独立有效性标志**。
   *
   *  `hasFullSnapshot` 管的是「界面还原」（rot / flip / status），退出时会被置 false。
   *  视图（zoom / tx / ty）恢复**不能**跟着它走：任何一条路径先把 `hasFullSnapshot` 清掉，
   *  退出就会落到「保持当前倍率」分支 —— 而当前倍率正是进入时 `fitToWindow()` 写下的 1×，
   *  实机表现就是「退出后比进入前小一点」（实测 1.000 → 0.965 这类差别）。
   *  所以视图单独用一个「进入时置真、永不中途清掉」的标志。 */
  private preFullViewValid: boolean = false;
  /** 第八十九轮：本次退出要恢复到的视图。布局落定后用它「再确认一次」，
   *  防止退出瞬间或落定前有迟到事件（捏合 / 轴事件 / 画布回调）把倍率改掉。 */
  private exitViewZoom: number = 1;
  private exitViewTx: number = 0;
  private exitViewTy: number = 0;
  private exitViewValid: boolean = false;
  private exitViewNoted: boolean = false;
  /** 第十六轮：进入全屏前的「普通模式窗口尺寸与位置」内存快照（packWindowRect 口径）。
   *  这是「本次全屏往返」专用，不落盘、不覆盖重启会话记忆 savedWindowRect；
   *  退出全屏、窗口形态恢复之后，用它精确 resize + moveWindowTo 还原尺寸位置。 */
  private preFullRect: string = '';
  private hasPreFullRect: boolean = false;
  /** 第十八轮：进入全屏前窗口是否为「自由窗口」(FLOATING)。
   *  只有自由窗口退出时才 resize + moveWindowTo 精确还原几何；最大化 / 系统全屏态
   *  交给 maximize(EXIT_IMMERSIVE) / recover 维持形态，绝不拿 rect 把窗口缩成自由窗口。 */
  private preFullFloating: boolean = false;
  /** 第十六轮：退出全屏时是否待执行精确 rect 恢复（幂等，用完即清）。 */
  private restoreRectPending: boolean = false;
  /** 第十八轮：是否「待吞一次系统补发 ESC」。仅当系统把 ESC 消费掉、自行退出沉浸
   *  （APP 靠自愈被动同步）时置位，由任意一次 ESC 消费后即清零。第十六轮用 400ms
   *  时间窗判「补发」会误吞用户主动的第二次 ESC，故改为按来源置位的一次性布尔。 */
  private pendingSystemEcho: boolean = false;
  /** 第九十五轮：上一次「真正生效的 F」的时间戳（0 = 还没按过）。仅 F 用，ESC / F11 不共用。 */
  private lastFullToggleAt: number = 0;
  /** 最近一次「全屏→普通」退出的时刻（仅日志 / 诊断；第十八轮起不再参与 ESC
   *  分派，避免时间冷却误吞用户主动按键），0 = 从未退出。 */
  private lastFullExitAt: number = 0;
  // ---- 第二十轮：ESC 真机链路诊断（界面状态栏 + hilog ESCDBG 双通道，可回传断点）----
  /** 收到的 ESC（含 Down/Up）累计次数，只在按 ESC 时递增。 */
  private escSeen: number = 0;
  /** 界面可见的链路诊断串，例如 `ESC#2 full=F act=3 → quitApp → terminateSelf()`。
   *  真机按两次 ESC 后若 APP 没退出，把状态栏这行截图回传即可定位断在事件 / 分派 / 退出哪一环。 */
  @State escDiag: string = '';
  /** 本次按键的 Down 是否已由 preIme 通道处理（防同一事件被两个通道各处理一次）。 */
  private escHandledByPreIme: boolean = false;
  /** 本轮 ESC 的 Down 是否已处理：用于兼容「只派发 KeyType.Up」的 2in1 键盘。 */
  private escDownHandled: boolean = false;
  /** 全屏切换后重聚焦的延时句柄（等 UI 重建完成）。 */
  private keyRefocusTimer: number = -1;
  // ---- 第二十一轮：窗口真实状态同步 + 焦点锚点 + 常显诊断 ----
  /** 系统窗口当前是否真的处于全屏形态（只用于常显角标诊断，不参与业务分派）。 */
  @State winFullBySystem: boolean = false;
  /** 第二十四轮：按键去重分两套，且**不依赖 `KeyEvent.timestamp`**
   *  （SDK 明确标注该字段 `unavailable to tablet, 2in1`，实机可能恒 0）。
   *  R23 的「永久对象引用去重」有致命缺陷：2in1 上 ArkUI 复用同一个 KeyEvent
   *  实例（只改字段），用户主动按下的第二次 ESC 因 `=== event` 被误判成「同一
   *  事件在另一通道重复派发」而吞掉 —— R23 截图 `keys=168` 却只有 `ESC#1` 即此症状。
   *  ① 非 ESC：沿用永久对象引用去重，翻页 / 缩放等既有行为完全不变；
   *  ② ESC：只在**当前事件分发链**内去重，setTimeout(0) 后立即失效，
   *     同一次物理按键的多通道派发仍合并，跨事件循环的第二次 ESC 必然放行。 */
  private lastKeyEvent: KeyEvent | undefined = undefined;
  private escDedupEvent: KeyEvent | undefined = undefined;
  private winStatusListenerOn: boolean = false;
  /** 系统是否**确实报告过**全屏形态（FULL_SCREEN / MAXIMIZE）。
   *  2in1 上部分窗口 API 不可用，getWindowStatus() 可能恒为 FLOATING；
   *  只有「先见过全屏、再见非全屏」才算系统替用户退出了全屏。
   *  没有这个前置证据，进全屏后第一次 ESC 就会被误同步成 QUIT_APP 直接退出 APP。 */
  private sawWindowFull: boolean = false;
  private pageAlive: boolean = true;
  /** 第五十六轮：返回 APP（onPageHide → onPageShow）时的「单次」目录刷新状态。
   *   · pageSuspended：确实经历过离开 APP。首次进入恒 false —— 启动恢复链绝不被这次刷新打断。
   *   · resumeRefreshHandled：本轮「离开→返回」是否已消费。窗口状态变化可能让
   *     onPageShow / 前台回调多次到达，用它保证同一返回事件只触发一次 refresh。
   *   · resumeRefreshTimer / Retry：在途操作时延后重试的句柄与次数（不抢占、有上限）。 */
  private pageSuspended: boolean = false;
  private resumeRefreshHandled: boolean = false;
  private resumeRefreshTimer: number = -1;
  private resumeRefreshRetry: number = 0;
  /** 第五十七轮：冷启动补刷状态，与 R56「切后台返回」资格完全独立。
   *  bootRefreshHandled 保证重启只刷一次；Timer / Retry 覆盖恢复链 3s 收口窗口。 */
  private bootRefreshHandled: boolean = false;
  private bootRefreshTimer: number = -1;
  /** 第七十七轮：只读名单态延迟自愈重探的定时器（页面销毁时一并清掉）。 */
  private restoreHealTimer: number = -1;
  /** 第七十九轮：只读名单态「目录重列举兜底」的定时器（页面销毁时一并清掉）。 */
  private readonlyRelistTimer: number = -1;
  private bootRefreshRetry: number = 0;
  // ---- 第二十二轮：按键到达可观测（零按键到达是本轮要解决的唯一断点）----
  /** 任意键（不只 ESC）进入 onKey() 的累计次数。常显在右下角角标：
   *  keys=0 = 键盘事件根本没到 APP（焦点 / 系统消费）；keys>0 = 事件链路通。 */
  @State keySeen: number = 0;
  /** 焦点请求结果，例如 `fc=Y f=N r3`（FocusController / 全局 focusControl / 重试次数）。 */
  @State focusDiag: string = 'fc=- f=- r0';
  private focusRetryCount: number = 0;
  /** 第二十三轮：系统级按键订阅结果 —— kp=keyPressed 单键通道成功 /
   *  hk=hotkeyChange 组合键通道成功 / N=两者都被拒（多半 4200002 ESC 被系统占用）/
   *  -=尚未执行。下一张截图即可判定平台是否允许应用接管 ESC。 */
  @State hkDiag: string = '-';
  /** 第二十三轮：窗口级焦点真值 wf=T/F/?（isFocused 失败时为 ?）。
   *  ArkUI 的 focusControl 只能抢应用内焦点；窗口本身不可聚焦时恒返回 false。 */
  @State winFocusDiag: string = 'wf=-';
  /** 分发通道 onKeyEventDispatch 被调用次数（不受 onKey 去重影响）：
   *  dsp>0 但 keys=0 = 去重有问题；dsp=0 = ArkUI 组件树完全没收到按键。 */
  @State dispatchSeen: number = 0;
  /** 第二十四轮：三个按键通道各自到达计数，常显在黄色诊断行。
   *  cap=onKeyPreIme / con=onKeyEvent / dsp=onKeyEventDispatch。
   *  第二次 ESC 若没进 onKey，这三个数能区分「压根没派发」与「落在某层被拦下」。 */
  @State capSeen: number = 0;
  @State conSeen: number = 0;
  /** 第二十五轮：诊断层是否展开（运行时开关，Ctrl+D / 单击角标切换）。 */
  @State diagOverlayOn: boolean = DIAG_OVERLAY_DEFAULT;
  private hkSeen: number = 0;
  private quitFallbackTimer: number = -1;

  // ---- 第十六轮：放大镜 >1:1 重采样专用高分辨率图源 ----
  /** 按放大后像素需求重新解码的一张 PixelMap，供放大镜圆内绘制（1:1 旁路时不生成）。
   *  自有、由本类 release；刻意不进 previews 缓存，避免污染 LRU 与解码档位复用判据。 */
  @State loupeHiPx: image.PixelMap | undefined = undefined;
  private loupeHiEntry: PreviewEntry | undefined = undefined;
  private loupeHiUri: string = '';
  private loupeHiPane: number = LOUPE_PANE_NONE;
  private loupeHiEdge: number = 0;
  private loupeHiToken: number = 0;
  /** 第十七轮：设备逻辑像素密度比（1vp = dpr px），懒读一次并缓存；0 = 尚未读取。
   *  SDK 26 @ohos.display: display.getDefaultDisplaySync().densityPixels ∈ [0.5, 4.0]。
   *  写在放大镜字段区，绝不进 aboutToAppear 启动路径（启动只打常量快照）。 */
  private loupeDensity: number = 0;

  // ---- 第六十七轮：系统 native 级 AA 缩放产物（放大镜专用，自有、由本类 release）----
  /** createScaledPixelMap 产出的一张「可直接 1:1 贴图」；undefined = 走 R17 组件级链。
   *  刻意不进 previews 缓存：它只是某张图在某个倍率档下的临时重采样结果。 */
  @State loupeSysPx: image.PixelMap | undefined = undefined;
  private loupeSysUri: string = '';
  private loupeSysPane: number = LOUPE_PANE_NONE;
  private loupeSysEdge: number = 0;
  private loupeSysToken: number = 0;
  /** 运行时能力档：懒探测一次（只在首次拿到放大镜图源时读方法存在性），绝不进启动路径。 */
  private loupeCap: number = LQ_CAP_COMPONENT;
  private loupeCapProbed: boolean = false;

  // ---- 第六十八轮：右侧主预览系统 native 级 AA 精炼产物（自有、由本类 release）----
  /** 一张比 viewPixelMap 更密、经系统 AA 预滤波的精炼图源；undefined = 走 R62 组件级链。
   *  刻意不进 previews 缓存：它只是某张图在某档画质下的临时重采样结果。 */
  @State viewSysPx: image.PixelMap | undefined = undefined;
  /** 第九十九轮：超分产物（比 viewPixelMap / viewSysPx 更大更清晰的那张）。
   *  三处图源的优先级：超分产物 > 系统 AA 精炼 > 自解码原图（见 viewDisplayPx）。
   *  用 uri 对账，绝不让上一张的超分结果画到新图上。 */
  @State viewSrPx: image.PixelMap | undefined = undefined;
  private viewSrUri: string = '';
  private viewSrEdge: number = 0;
  /** 作废在途超分的代号（切图 / 释放时自增）。 */
  private viewSrToken: number = 0;
  /** 已做过超分的「uri@目标档位」：同图同档不重复推理（缩放抖动会反复触发）。 */
  private viewSrKeyDone: string = '';
  /** 能力封装（懒初始化，页面销毁时 destroy）。 */
  private srService: SuperResolutionService | undefined = undefined;
  private viewSysUri: string = '';
  private viewSysEdge: number = 0;
  private viewSysToken: number = 0;
  /** 运行时能力档：懒探测一次（首次拿到主预览图源时读方法存在性），绝不进启动路径。 */
  private viewCap: number = VQ_CAP_COMPONENT;
  private viewCapProbed: boolean = false;

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
  /** 第七十六轮：右键 Press 时的窗口坐标，供 picture menu 浮层定位（根 Stack 与窗口同尺寸）。 */
  private pressDX: number = 0;
  private pressDY: number = 0;

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
  /** 启动恢复「3 秒内进入上次目录」的看门狗（见 RestoreTimeout.ts）。 */
  private enterWatchdogTimer: number = -1;
  private restoreStartedAt: number = 0;      // 计时起点：排程恢复的那一刻
  private hasRestoreMemory: boolean = false; // 有上次会话记忆才挂看门狗，首次启动绝不弹
  private restoreCancelled: boolean = false; // 超时作废：在飞的恢复链回来后不许再改视图
  private restoreSettled: boolean = false;   // 恢复链是否已收口（成功或失败）
  private restoreEntered: boolean = false;   // 是否真正「进入上次的目录」
  /** 第十轮 ff1：上次以失败告终的目录标记（preferences 小 key，命中即零 IO 立即放弃）。 */
  private deadMemory: string = '';
  /** 立即放弃只做一次：超时收口与错误收口可能几乎同时到达，绝不弹第二次选择器。 */
  private giveUpDone: boolean = false;
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
  /** 第三十轮：上次退出时持久化的**实际浏览层级**原文（恢复时经
   *  restoreBrowseLevelOf 校验：与授权根同层或在其之下才采纳）。 */
  private savedBrowseBase: string = '';
  /** 第三十轮：持久化的多层清单快照原文（行式文本，恢复时解码 + 校验）。 */
  private savedUpCacheRaw: string = '';
  /** 第三十六轮：读回的「上次退出停在无图片目录」标记（'1' = 是）。
   *  与图片 uri / 快照完全独立：空目录、无图片目录、只有子文件夹的目录都靠它恢复。 */
  private savedDirCtx: string = '';
  /** 第三十六轮：最近一次 openFolder 真实列举合并后的有效名字数。
   *  供 browseUp 判断「真实列举是否一无所获」，只有为 0 才允许零 IO 清单兜底。 */
  private lastUpExploreNames: number = 0;
  /** 第三十轮：upDirCache 有更新、尚未写进 preferences。
   *  flushPosSync（切后台 / 退出）只在脏时才同步写这个 key，毫秒级必达。 */
  private upCacheDirty: boolean = false;
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

  // ---- 会话界面状态（2026-11-12）：窗口大小 / 位置 与 左栏收起态 ----
  /** 启动时从 preferences 读回的窗口 rect 文本；空串 = 没有记忆 / 首次安装。 */
  private savedWindowRect: string = '';
  /** 启动时读回的窗口形态：1 = 退出前最大化 / 系统全屏，0 = 自由窗口。 */
  private savedWindowMaximized: number = 0;
  private winRectTimer: number = -1;         // 拖窗口 rect 的防抖写盘句柄
  private winRectApplied: boolean = false;  // 本次启动窗口 rect / 形态只恢复一次
  /** 空态区的一行提示（「上次看到 …」）。必须是 @State：它是异步读回来的，要靠它刷新 UI。
   *  而 lastPos 本身刻意不是 @State —— 切图时每帧都改它会导致整个界面反复重建。 */
  @State resumeHint: string = '';

  // ---- 后台预载缓存（不用 @State：靠 @State cur / viewPixelMap 变化触发重建即可）----
  /** 已解码图片数据的缓存：每条 PreviewEntry.px 就是一张可直接上屏的 PixelMap。
   *  第七轮起所有解码结果都从这里复用，同一 uri 只保留 edge 最大的那张。 */
  private previews: PreviewEntry[] = [];              // 简易 LRU：命中移到队尾，超容量从队头淘汰
  private preloadBytes: number = 0;                   // 当前缓存估算占用
  /** 在途解码：key = decodeKeyOf(uri, edge)，同一张 + 同一档位只解一次，
   *  并发的预载 / 主视图 / 右页 / 低清占位请求共用同一个 Promise（减少重复解码）。 */
  private decodeInflight: Map<string, Promise<PreviewEntry | undefined>> = new Map();
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
  // ---- 全量预载链（PRELOAD_ALL=true 时启用；与上面的窗口链互斥）----
  private allSeq: number = 0;                        // 换数据源时自增，作废旧批次的回调
  private allBusy: boolean = false;                  // 链是否在跑（位置变化不打断）
  private allOrder: number[] = [];                   // 整库绝对下标顺序（先近后远、前后交替）
  private allFrom: number = 0;                       // 下一批起点
  private allActive: number = 0;                     // 本批还没落地的解码数
  private allDone: Set<number> = new Set<number>();  // 已缓存 / 已失败的下标
  /** 整库已铺满：滚轮 / 翻页时 schedulePreload() 直接 O(1) 返回，不再重建顺序或扫缓存。
   *  只在换数据源（clearPreviews）时清零，resize 不清 —— 档位不足的条目由 showNeed 自动升级。 */
  private allComplete: boolean = false;
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
  private rightRetryTimer: number = -1;   // 第四十七轮：右页解码失败的重试句柄
  /** 第八十六轮：右页原图宽高（像素）。并排等比适配要按**各自**原始比例算，
   *  只靠左图尺寸会让「一页竖图 + 一页横图」被按同一比例摆放。
   *  与 `imgW/imgH`（左页）同一口径：都取自 PreviewEntry.w/h（原图像素，非解码后尺寸）。
   *  0 = 未知，纯函数会按另一页比例估算，真实值到达后派生布局自动重算。 */
  @State rightImgW: number = 0;
  @State rightImgH: number = 0;
  @State viewFailed: boolean = false;                 // 自解码确认失败 → 才回退到 Image(uri)
  @State curToken: number = 0;                        // 当前显示图的代号（每切换一次自增）

  // ---- 切图过渡：低清模糊层（盖在清晰图之上，就绪后淡出）----
  @State lowPixelMap: image.PixelMap | undefined = undefined; // 过渡期显示的那张低清图
  @State blurRadius: number = 0;                      // 当前模糊半径（BLUR_MAX → 0）
  @State lowOpacity: number = 0;                      // 低清层不透明度（1 → 0）
  private focusSeq: number = 0;                       // 对焦动画代号，切图时自增使旧动画作废

  // ---- 第三十七轮：纯文本 / 源码文件预览（与图片态互斥）----
  // ⚠️ textLines / textBlockStarts **刻意不加 @State**：十几万行进状态系统会被逐层建代理，
  //    纯属浪费；UI 只靠 textMode / textNoW / textContentW / textStatusText 这几个小状态 +
  //    TextLineSource.reload() 通知 LazyForEach 重取，与左栏 GalleryDataSource 同一口径。
  @State textMode: boolean = false;
  @State textName: string = '';
  @State textStatusText: string = '';
  @State textNoW: number = 54;
  @State textContentW: number = 800;
  @State textTruncated: boolean = false;
  /** 第五十一轮：文本态行段选择。点一条定起点、再点一条定终点（成段后新点击重选、
   *  再点同一条取消），抬头工具条「复制 / 清除」，Ctrl+C 同效。行高亮由这两个
   *  小状态驱动，LazyForEach 生成器里读它们即可按行重渲染，与左栏选中态同口径。 */
  @State textSelAnchor: number = -1;
  @State textSelFocus: number = -1;
  // R54：按住左键拖选期间为 true（普通字段：只做事件闸门，不驱动 UI）
  private textSelDragging: boolean = false;
  /** 第五十二轮：自绘纵向滚动条。R51 把 List 原生条设为常显后真机仍看不见 —— 原生条
   *  画在**全宽 List 的右缘**（x = textContentW），长行把横向 Scroll 撑宽后它永远在
   *  可视区外。改为在视口右缘自绘：视口高由 onAreaChange 回填，首行号由 List
   *  onScrollIndex 回填，滑块按「可见行 / 总行数」比例算高、按首行比例定位，
   *  PanGesture 拖动换算 scrollToIndex；原生条关掉（Off），免得横向滚到底时双条重叠。 */
  @State textVpH: number = 0;
  @State textFirstRow: number = 0;
  @State textLastRow: number = 0;
  /** 第六十三轮：自绘纵向滚动条是否显示的唯一 @State 门控。R53 的 if 条件里塞了
   *  非 @State 的 textLines.length，V1 依赖收集不追踪；textVpH 又只靠 onAreaChange
   *  尺寸事件回填，文本态从图片态切来时尺寸不变 → 事件不回调 → 条永久不显示。
   *  现在由 refreshTextBar() 在内容落地 / 尺寸到达时主动算好写入，if 只直读这一个状态。 */
  @State textBarShow: boolean = false;
  private textVBarDragTop: number = 0;
  private textLines: Array<string> = [];
  private textBlockStarts: Array<boolean> = [];
  private textLang: number = 0;
  private textSource: TextLineSource = new TextLineSource();
  private textScroller: Scroller = new Scroller();   // 纵向（List）滚动
  private textHScroller: Scroller = new Scroller();  // 横向（Scroll）滚动
  /** 每次打开 / 关闭文本都自增：迟到的异步读取回调据此作废，绝不覆盖新打开的文件。 */
  private textToken: number = 0;

  aboutToAppear(): void {
    // Win64「可观测」的鸿蒙变形：启动只打一条常量环境快照，绝不读 preferences / 不枚举磁盘。
    // 早期 appfreeze 的真根因正是启动路径上的 PreferencesGetValue，这里必须保持极轻。
    hilog.info(DOMAIN, TAG,
      'PIKAN %{public}s start · preload %{public}d fwd / %{public}d max · spread=%{public}d · dirPoll=%{public}d',
      APP_VERSION, PRELOAD_FWD, PRELOAD_COUNT, SPREAD_PORTRAIT ? 1 : 0, DIR_POLL_MS);
    // 第六十四轮：只登记空闲时间戳并起一个纯内存心跳（首个 tick 在数秒后，
    // 且被 resumeDone / idle / 在途闸门挡住）——启动关键路径零 IO 防线逐字保留。
    this.lastInputAt = Date.now();
    this.startDirCountScheduler();
    this.readLastPos(); // 异步读几个小 key，不阻塞首帧；恢复排到首帧之后（见 scheduleShowLast）
    // 第二十一轮：注册窗口状态监听（窗口管理器直发，不经 ESC 按键 / 焦点），
    // 并在首帧后抢一次键盘焦点 —— 不再等 setFull 被调用才抢。
    this.registerWindowStatusSync(0);
    this.scheduleKeyRefocus();
    this.registerEscHotkey();
    // 第八十四轮：首屏也先把系统窗口标题写成「尚未打开」；之后全靠 @Watch 跟随 source。
    this.syncWindowTitle('');
  }

  /** 切后台 / 锁屏 / 被别的应用盖住：这是「退出 APP」最常走的路径。
   *  ⚠️ 必须**同步**落盘：flushPos() 是 async 的 put + flush，进程随后被杀时
   *     Promise 可能根本没跑完，「上次的位置 / 相片」就丢了。
   *     putSync / flushSync 写的是几个小 key（毫秒级），不写大快照，不会卡住切后台。 */
  onPageHide(): void {
    this.flushPosSync();
    // 2026-11-12：窗口大小位置 + 左栏收起态也要同步落盘（进程被杀也不丢）。
    this.clearWinRectTimer();
    this.saveWindowRectSync();
    // 第五十六轮：标记「确实离开过 APP」，并开启新的一轮返回刷新资格。
    // 只在这里置位，首次进入 onPageShow 恒不刷 —— 启动恢复链绝不被打断。
    this.pageSuspended = true;
    this.resumeRefreshHandled = false;
    this.resumeRefreshRetry = 0;
    this.bootRefreshRetry = 0;
    if (this.bootRefreshTimer !== -1) {
      clearTimeout(this.bootRefreshTimer);
      this.bootRefreshTimer = -1;
    }
    if (this.resumeRefreshTimer !== -1) {
      clearTimeout(this.resumeRefreshTimer);
      this.resumeRefreshTimer = -1;
    }
  }

  /** 第五十六轮：从后台 / 锁屏 / 被别的应用盖住后恢复显示。
   *  只做一次「当前目录真实重列举」，把左侧清单同步回磁盘：新增 / 删除 / 改名 /
   *  层级变动都由既有 openFolder(isRescan=true) → sameDirEntries → applyItems(preserveView)
   *  链路覆盖。同一返回事件只刷一次；在途操作一律让路（不抢占、不中断）。 */
  onPageShow(): void {
    this.tryRefreshOnResume();
    this.tryBootRefresh(); // 第五十七轮：冷启动补刷兜底（主触发在 markRestoreEntered）
    // 第六十四轮：返回前台先重置空闲时钟，并让上一轮统计失效 —— 离开期间
    // 目录 / 内容可能被别的应用改过，展示必须与真实内容重新对账。
    // 刻意排在 R56/R57 双入口之后：既不改这两个既有入口的顺序与单次消费语义，
    // 也不抢恢复期 IO（本方法只改内存标记 + 文案数组，零磁盘 IO）。
    this.markUserActive();
    this.invalidateDirCounts();
    // 第八十四轮：回到前台时窗口对象必定已就绪，补一次系统标题同步
    // （冷启动首屏可能比 EntryAbility 的 mainWindow 存盘更早，那一次会被跳过）。
    this.syncWindowTitle('');
  }

  /** 返回刷新的唯一决策落点。真值源是 ResumeRefresh.ts 的纯函数，
   *  真正的磁盘列举 / 保位刷新全部复用既有链，本函数不另起一套 IO。 */
  private tryRefreshOnResume(): void {
    const busy: boolean = this.folderBusy || this.playing || this.mtimeBusy ||
      this.pickerBusy || !this.pageAlive;
    const hasDir: boolean = this.browseBase.length > 0;
    const ioOk: boolean = bulkIoAllowed(this.restoreMode);
    const act: number = resumeRefreshAction(this.pageSuspended,
      this.resumeRefreshHandled, busy, hasDir, ioOk);
    if (act !== RESUME_REFRESH_GO) {
      // 在途操作不抢占：短延时后再判，最多 RESUME_REFRESH_RETRY_MAX 次。
      // 这一轮「离开→返回」始终只算一次（handled 尚未消费）。
      if (busy && hasDir && ioOk && this.pageSuspended && !this.resumeRefreshHandled &&
          this.resumeRefreshRetry < RESUME_REFRESH_RETRY_MAX) {
        this.resumeRefreshRetry++;
        if (this.resumeRefreshTimer !== -1) {
          clearTimeout(this.resumeRefreshTimer);
        }
        this.resumeRefreshTimer = setTimeout(() => {
          this.resumeRefreshTimer = -1;
          this.tryRefreshOnResume();
        }, RESUME_REFRESH_RETRY_MS);
      }
      return;
    }
    if (this.resumeRefreshTimer !== -1) {
      clearTimeout(this.resumeRefreshTimer);
      this.resumeRefreshTimer = -1;
    }
    // 先消费资格：窗口状态变化可能让 onPageShow / 前台回调多次到达，绝不刷第二次。
    this.resumeRefreshHandled = true;
    this.pageSuspended = false;
    this.runRefreshOnce(RESUME_SCENE_BACK);
  }

  /** 第五十七轮：冷启动（杀进程后重开）恢复链收口后补一次真实目录列举。
   *  与 R56「切后台返回」资格完全独立 —— resumeRefreshAction 仍要求 suspended=true，
   *  冷启动恒 SKIP（启动恢复链不被打断的原语义保留）。本链只在 resumeDone=true
   *  后放行，绝不抢恢复期；主触发点是 markRestoreEntered()，onPageShow 兜底重试。 */
  private tryBootRefresh(): void {
    const busy: boolean = this.folderBusy || this.playing || this.mtimeBusy ||
      this.pickerBusy || !this.pageAlive;
    const hasDir: boolean = this.browseBase.length > 0;
    const ioOk: boolean = bulkIoAllowed(this.restoreMode);
    const act: number = bootRefreshAction(this.bootRefreshHandled, this.resumeDone,
      busy, hasDir, ioOk, this.hasRestoreMemory, this.userActed);
    if (act !== BOOT_REFRESH_GO) {
      // 恢复链尚未收口 / 在途操作时短延时再判；只读名单态、用户已动手、
      // 已消费过资格一律不重试（避免无意义定时器与抢占）。
      if ((busy || !this.resumeDone) && ioOk && this.hasRestoreMemory &&
          !this.userActed && !this.bootRefreshHandled && this.pageAlive &&
          this.bootRefreshRetry < BOOT_REFRESH_RETRY_MAX) {
        this.bootRefreshRetry++;
        if (this.bootRefreshTimer !== -1) {
          clearTimeout(this.bootRefreshTimer);
        }
        this.bootRefreshTimer = setTimeout(() => {
          this.bootRefreshTimer = -1;
          this.tryBootRefresh();
        }, BOOT_REFRESH_RETRY_MS);
      }
      return;
    }
    // 先消费资格：markRestoreEntered / onPageShow / 重试回调可能多次到达，只刷一次。
    this.bootRefreshHandled = true;
    this.runRefreshOnce(RESUME_SCENE_BOOT);
  }

  /** R56「切后台返回」与 R57「冷启动重启」共用的唯一真实列举 + 状态对账执行体。
   *  资格消费在两个决策入口各自完成；这里只做一次 openFolder(isRescan=true)，
   *  绝不另起一套列举、绝不改 openFolder / applyItems 主体。 */
  private runRefreshOnce(scene: number): void {
    if (this.resumeRefreshTimer !== -1) {
      clearTimeout(this.resumeRefreshTimer);
      this.resumeRefreshTimer = -1;
    }
    if (this.bootRefreshTimer !== -1) {
      clearTimeout(this.bootRefreshTimer);
      this.bootRefreshTimer = -1;
    }
    const prevUri: string = (this.cur >= 0 && this.cur < this.items.length)
      ? this.items[this.cur].uri : '';
    const prevDir: string = this.browseBase;
    const hadSelection: boolean = prevUri.length > 0;
    const base: string = this.browseBase;
    hilog.info(DOMAIN, TAG, 'resume refresh: relist %{public}s scene=%{public}d',
      base, scene);
    this.openFolder(base, false, false, true).then((ok: boolean) => {
      if (!this.pageAlive) {
        return;
      }
      // 第五十七轮：冷启动恢复走的是零 IO 快照，setItems() 清掉了 dirPollTimer，
      // dirMtime 也是 0 —— 若这次重扫命中 sameDirEntries 短路（内容未变），
      // openFolder 不会自己重启轮询。这里补一次（startDirPoll 幂等：先清再起），
      // 让重启之后目录变化仍能靠既有 1.5s mtime 轮询持续同步。
      if (ok && this.dirPollTimer === -1) {
        this.startDirPoll();
      }
      const uris: Array<string> = [];
      for (let i = 0; i < this.items.length; i++) {
        uris.push(this.items[i].uri);
      }
      const selIdx: number = resumeSelectedIndex(prevUri, uris);
      const selKept: boolean = selIdx >= 0;
      const dirKept: boolean = resumeDirKept(prevDir, ok && this.browseBase.length > 0);
      // 原选中档案已被删除 / 改名 / 移走：清掉失效选中引用，绝不让 keepView
      // 悄悄把它夹到另一张图上。仍存在的选中由 applyItems 按 uri 保位完成。
      // ⚠️ 只清运行时视图态，不动 posPending / 快照写盘链 —— 既有落盘语义零回归。
      if (hadSelection && !selKept) {
        this.cur = -1;
        this.refreshSpread(); // cur<0 → spreadB=-1 + 收右页
      }
      // 目录层级已失效：清掉「APP 内自建清单态」与 mtime 基准，避免继续拿过期
      // 快照当真值。⚠️ 不清 browseBase / browseDir —— 列举失败也可能是 NAS 未挂载 /
      // 授权暂时失效（R44），误清会破坏 R36 的目录恢复，用户主动导航会自然纠正。
      if (!dirKept) {
        this.inAppUpList = false;
        this.dirMtime = 0;
        hilog.warn(DOMAIN, TAG, 'resume refresh: listing failed, keep ctx %{public}s', prevDir);
      }
      if (ok) {
        this.status = scene === RESUME_SCENE_BOOT
          ? bootRefreshHint(dirKept, selKept, hadSelection)
          : resumeRefreshHint(true, dirKept, selKept, hadSelection);
      }
      // ok=false 时保留 openFolder 给出的明确错误串，不覆盖成泛泛提示。
    }).catch(() => {
      hilog.warn(DOMAIN, TAG, 'resume refresh: relist rejected');
    });
  }

  aboutToDisappear(): void {
    this.stopSlide();
    this.stopDirCountScheduler(); // 第六十四轮：页面销毁时停心跳、作废在途扫描
    this.clearKeyRefocusTimer();
    this.pageAlive = false;
    if (this.quitFallbackTimer !== -1) {
      clearTimeout(this.quitFallbackTimer);
      this.quitFallbackTimer = -1;
    }
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
      this.dirPollTimer = -1;
    }
    if (this.rescanTimer !== -1) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = -1;
    }
    if (this.rightRetryTimer !== -1) {
      clearTimeout(this.rightRetryTimer);   // 第四十七轮：页面销毁时 pending 的右页重试一并清掉
      this.rightRetryTimer = -1;
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
    this.clearLoupeHiRes(); // 第十六轮：页面销毁时释放放大镜专用高清 PixelMap
    this.clearViewSysPx();  // 第六十八轮：页面销毁时释放主预览系统级 AA 精炼产物
    this.endSlideFade(true); // 第九十六轮：页面销毁时清掉淡化计时器并释放叠显层那张图
    this.clearViewSrPx();    // 第九十九轮：释放超分产物
    if (this.srService !== undefined) {
      this.srService.destroy();  // 内部 catch，绝不因清理失败影响退出
      this.srService = undefined;
    }
    this.clearWheel();
    this.sizeSeq++; // 作废还在跑的体积补测任务
    if (this.resumeTimer !== -1) {
      clearTimeout(this.resumeTimer); // 别让恢复在页面已经销毁后还去改视图
      this.resumeTimer = -1;
    }
    if (this.resumeRefreshTimer !== -1) {
      clearTimeout(this.resumeRefreshTimer); // 第五十六轮：页面销毁后不许再排返回刷新
      this.resumeRefreshTimer = -1;
    }
    if (this.bootRefreshTimer !== -1) {
      clearTimeout(this.bootRefreshTimer); // 第五十七轮：页面销毁后不许再排冷启动补刷
      this.bootRefreshTimer = -1;
    }
    if (this.restoreHealTimer !== -1) {
      clearTimeout(this.restoreHealTimer); // 第七十七轮：页面销毁后不许再自愈重探
      this.restoreHealTimer = -1;
    }
    if (this.readonlyRelistTimer !== -1) {
      clearTimeout(this.readonlyRelistTimer); // 第七十九轮：页面销毁后不许再重列举
      this.readonlyRelistTimer = -1;
    }
    this.clearEnterWatchdog(); // 页面已销毁，超时也不该再弹选择文件夹
    this.giveUpDone = true;    // 页面已销毁：warm 回调也不许再对死路径发起同步 IO
    if (this.persistTimer !== -1) {
      clearTimeout(this.persistTimer); // activate 超时兜底也别在页面销毁后触发恢复
      this.persistTimer = -1;
    }
    this.flushPosSync(); // 退出前把最后一次位置**同步**落盘（进程被杀也不丢）
    this.clearWinRectTimer();
    this.saveWindowRectSync();
    if (this.fullscreen) {
      // 页面销毁时若还在全屏，把标题栏 / dock / 系统状态栏 / 导航栏都还回去
      this.applyWindowFullScreen(false, 0);
    }
    this.clearCanvasReloadFallback();
    this.clearResizeReload();
    if (this.fullExitRefitTimer !== -1) {
      clearTimeout(this.fullExitRefitTimer); // 第八十二轮：页面销毁后不许再确认式重适配
      if (this.fullExitSampleTimer !== -1) {
        clearTimeout(this.fullExitSampleTimer); // 第九十一轮：延迟采样一并作废
        this.fullExitSampleTimer = -1;
      }
      this.fullExitRefitTimer = -1;
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
      const rawDir = await p.get(POS_KEY_DIR, '');
      const rawDead = await p.get(POS_KEY_DEAD, '');
      const idx: number = typeof rawIdx === 'number' ? rawIdx : -1;
      const uri: string = typeof rawUri === 'string' ? rawUri : '';
      const ok: string = typeof rawOk === 'string' ? rawOk : '';
      // 必须在 scheduleShowLast() / 可能的提前 return 之前读到：恢复前要先激活它。
      this.savedDirUri = typeof rawDir === 'string' ? rawDir : '';
      this.okUri = ok;
      this.deadMemory = typeof rawDead === 'string' ? rawDead : '';
      // 第三十一轮：两个「增强」key 挪到完全独立的方法里读，绝不共用这个 try。
      // R30 把它们和核心位置 key 放在同一个 try，含控制字符的坏 value 一旦
      // 让 get 抛异常，整个 readLastPos 跳到 catch —— scheduleShowLast() 根本
      // 不排程（重开既不恢复图片，也不重建 browseBase，点往上层像没反应）。
      // 该方法契约「绝不抛异常」，失败一律降级空串（等价 R29 语义）。
      await this.readBrowseExtras(p);
      // 有「上次会话」记忆才给恢复链挂 3 秒看门狗；首次启动没有任何记忆，绝不弹选择器。
      this.hasRestoreMemory = idx >= 0 || uri.length > 0 || ok.length > 0 ||
        this.savedDirUri.length > 0 || this.savedDirCtx === DIRCTX_EMPTY;
      // 2026-11-12 第六轮：会话界面状态（窗口大小位置 / 左栏收起态）。
      // 都是小 key，和上面 4 个一起在首帧之后异步读，绝不碰大快照、绝不重扫。
      const rawRect = await p.get(WIN_KEY_RECT, '');
      const rawCollapsed = await p.get(WIN_KEY_COLLAPSED, 0);
      const rawMaximized = await p.get(WIN_KEY_MAXIMIZED, 0);
      // 第一百零八轮：上次拖出来的左栏宽（0 / 缺失 = 没拖过，继续走自适应）。
      const rawSidebarW = await p.get(WIN_KEY_SIDEBAR_W, 0);
      // 第一百一十轮：收起态宽独立读回。
      const rawSidebarCW = await p.get(WIN_KEY_SIDEBAR_CW, 0);
      this.savedWindowRect = typeof rawRect === 'string' ? rawRect : '';
      this.listCollapsed = collapsedOf(typeof rawCollapsed === 'number' ? rawCollapsed : 0);
      this.savedWindowMaximized = typeof rawMaximized === 'number' ? rawMaximized : 0;
      // 读回即生效：不等下一次布局。此刻 lastRootW 可能还是 0 —— splitRestoreWOf 对
      // 「根宽未知」只按绝对上下限夹取，真正的窗口夹取留给 refreshAdaptiveLayout。
      this.sidebarUserW = splitRestoreWOf(
        typeof rawSidebarW === 'number' ? rawSidebarW : 0, this.lastRootW);
      if (this.sidebarUserW > 0) {
        // 只重算左栏宽（不动三列宽，也不新增 refreshAdaptiveLayout 调用点）：
        // 首帧的 listW 是「根宽 0」时的内容宽，这里先按恢复值替换，布局回来后再精确夹一次。
        this.listW = splitSidebarWOf(this.sidebarUserW, this.listW, this.lastRootW);
        hilog.info(DOMAIN, TAG, 'sidebarW: restored %{public}d', this.sidebarUserW);
      }
      // 第一百一十轮：收起态宽同样读回并立即生效（重开时若上次停在收起态，宽度就是它）。
      this.sidebarCollapsedUserW = splitRestoreWOf(
        typeof rawSidebarCW === 'number' ? rawSidebarCW : 0, this.lastRootW);
      if (this.sidebarCollapsedUserW > 0) {
        this.collapsedW = splitSidebarWOf(this.sidebarCollapsedUserW, this.collapsedW, this.lastRootW);
      }
      // 排程放在所有提前 return 之前：即使没有完整 LastPos，窗口也要恢复。
      // 第七轮：只最大化过、从未存下自由窗口 rect 的用户也要排程（不能因 rect 为空短路）。
      this.scheduleRestoreWindowRect();
      // 第十轮 ff1：上次就栽在同一个死路径上 —— 连 900ms 恢复定时器和 3 秒看门狗都不排，
      // 更不预热 / 不探测 / 不 openSync，零 IO 零等待直接把控制权交回「选择文件夹」。
      // 第三十六轮：仅目录上下文恢复是零 IO 的纯字符串路径，不依赖 URI 授权。
      // 上一次图片会话留下的死路径记忆不该把「正常的空 / 无图片目录」判成失败，
      // 更不该弹选择器把用户踢回默认目录；交给 showLastOnStart 的目录态分支。
      const dirOnly: boolean = dirOnlyResumeWanted(this.savedDirCtx,
        AUTO_SHOW_LAST_ON_START, this.userActed, this.resumeDone) === DIR_RESUME_CONTEXT;
      if (!dirOnly && failFastAction(
          deadMemoryMatches(this.deadMemory, this.savedDirUri, ok),
          this.hasRestoreMemory, this.userActed, this.restoreSettled) === FF_GIVEUP) {
        this.giveUpNow('same dead dir as last time', 0);
        return;
      }
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

  /** 第三十一轮：读取 R30 引入的两个「增强」持久化 key，与核心恢复链完全隔离。
   *
   *  ⚠️ 契约：**本方法绝不抛异常**。readLastPos 在主 try 里 await 它，任何失败
   *     都必须就地降级为空串（等价 R29 语义），否则又会像 R30 那样把整条启动
   *     恢复链（scheduleShowLast / lastPos / 死路径判据）拖进 catch。
   *  · 内层 try 包住两次 get + prefsSafeDecode + 坏数据自愈；
   *  · R31 写入的快照是 P1: 转义文本，prefsSafeDecode 还原成 decodeUpCacheText
   *    认得的原始行式文本；R30 遗留裸文本 / 空串 / 脏数据原样或降级；
   *  · 检测到 R30 遗留的含控制字符坏数据时，丢弃这份快照并清掉可能被
   *    giveUpNow 写下的死路径标记 —— 打破「每次启动都直接放弃」的稳定失效。
   *  零文件 IO：只读 preferences 的小 key，绝不 listFile / stat / 弹选择器。 */
  private async readBrowseExtras(p: preferences.Preferences): Promise<void> {
    this.savedBrowseBase = '';
    this.savedUpCacheRaw = '';
    this.savedDirCtx = '';
    try {
      const rawBrowse = await p.get(POS_KEY_BROWSE, '');
      const rawUpCache = await p.get(POS_KEY_UPCACHE, '');
      const rawDirCtx = await p.get(POS_KEY_DIRCTX, '');
      this.savedBrowseBase = typeof rawBrowse === 'string' ? rawBrowse : '';
      this.savedUpCacheRaw = typeof rawUpCache === 'string' ? rawUpCache : '';
      this.savedDirCtx = typeof rawDirCtx === 'string' ? rawDirCtx : '';
      if (typeof rawUpCache === 'string' && prefsIsLegacyBadCache(rawUpCache)) {
        // R30 直接把含 U+0001/U+0002 的行式文本写进 preferences：这份数据
        // 既不能安全解码，也可能已经污染了上一次的恢复尝试。丢弃它，并
        // 自愈清掉死路径记忆，让本次恢复链重新获得一次完整机会。
        this.savedUpCacheRaw = '';
        this.saveDeadTag('');
        hilog.warn(DOMAIN, TAG, 'drop legacy R30 up-cache, clear dead memory');
        return;
      }
      this.savedUpCacheRaw = prefsSafeDecode(this.savedUpCacheRaw);
    } catch (e) {
      this.savedBrowseBase = '';
      this.savedUpCacheRaw = '';
      this.savedDirCtx = '';
      hilog.warn(DOMAIN, TAG, 'read browse extras failed (ignored): %{public}s', JSON.stringify(e));
    }
    // 第六十四轮：TTL 是新增的独立小 key，读失败只回默认值，绝不影响上面既有恢复链。
    try {
      const rawDcTtl = await p.get(POS_KEY_DC_TTL, 0);
      if (typeof rawDcTtl === 'number') {
        this.dirCountTtlMs = dcTtlClampOf(rawDcTtl);
        this.dirCountTtlLabel = dcTtlLabelOf(this.dirCountTtlMs);
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'read dirCount ttl failed, use default');
    }
    // 按读回的设定周期重建心跳（幂等：先清再起；这里仍无任何文件 IO）。
    this.startDirCountScheduler();
  }

  /** 只探最多 RESTORE_PROBE_LIMIT 张 uri 能否 open —— 判断快照授权在重启后是否还在。
   *
   *  ⚠️ 每次 fs.openSync 对失效授权的 `file://docs/...` uri 都是一次同步跨进程调用，
   *     **绝不能探整批**（几百次就足以把主线程打满，正是历史 appfreeze 的根因）。
   *     这里最多 3 张、且只在首帧后 900ms 的恢复链里跑一次。
   *  返回 true = 这批 uri 还能读，走完整恢复；false = 授权已失效，落只读名单态。 */
  private probeRestoreUris(uris: Array<string>, okUri: string, savedUri: string,
    fastProbe: boolean = false): boolean {
    const cand: Array<string> = restoreProbeUris(uris, okUri, savedUri, RESTORE_PROBE_LIMIT);
    // 第十轮 ff1：启动恢复期只探第一个候选，打不开就立即判死（不逐个候选重试 ——
    // 每个失效 uri 的 openSync 在 NAS 上都可能挂十几秒）。用户主动路径传 false 探全部。
    const fast: boolean = fastProbe && !this.giveUpDone;
    const take: number = probeTakeOf(fast, cand.length);
    for (let i: number = 0; i < take; i++) {
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
    // 第三十轮：优先采用持久化的「实际浏览层级」。退出前用户可能在授权根的
    // 子目录里看图（browseBase 比授权根深）；旧版一律重置到授权根，重开点
    // 「往上层」就会直接跳到授权根的父级 —— 越过实际目录的直接父级，
    // 而那个父级又没有授权，只能降级 APP 内清单且缓存全空（层级 + 内容双错）。
    // restoreBrowseLevelOf 校验持久化层级与授权根同层或在其之下，脏值回退授权根。
    const base: string = restoreBrowseLevelOf(this.savedBrowseBase, this.savedDirUri);
    if (base.length === 0) {
      return;
    }
    const pickBase: string = upContextBaseOf(this.savedDirUri);
    const deep: boolean = pickBase.length > 0 && !sameDirPath(pickBase, base);
    const raw: string = upContextRawOf(this.savedDirUri);
    // browseDir 用与授权同 scheme / 同编码习惯的**深层**形态（rawBrowseFormOf）：
    // browseUp 的 upParentCandidates ① 剥一层得到的父 URI 命中率最高 ——
    // 退出前在 `…/2026/编号202618` 的用户，重开点「往上层」时父候选里就有
    // 授权形态的 `…/2026`，listFile 成功即列出该层**全部**子目录。
    // 拼不出（授权根无 scheme / 层级对不上）就退纯路径，与旧版一致。
    const rawDeep: string = raw.length > 0 ? rawBrowseFormOf(raw, base) : '';
    this.browseBase = base;
    this.browseDir = rawDeep.length > 0 ? rawDeep : base;
    // pickRootUri 恒为授权根的原始形态（browseUp 的 extraRoots 用它推同形态父 URI）。
    this.pickRootUri = raw.length > 0 ? raw : base;
    this.titlePath = base;
    this.canGoUp = canGoUpFrom(base);
    // 第三十轮：多层清单快照解码回内存（纯字符串零 IO），重开后的 APP 内
    // 上层清单不再是「只剩当前目录一项」。
    const upLevels: number = this.restoreUpCache(base);
    this.diagLine = 'up CTX | ' + UP_CTX_TAG + ' | ' +
      (this.restoreMode === RESTORE_READONLY ? 'ro' : 'full') +
      (deep ? ' | deep' : '') +
      ' | L' + dirLevelOf(base) + ' | uc=' + upLevels +
      ' | ' + ellipsizeMiddle(base, 30) +
      ' | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'restore: up context rebuilt L%{public}d deep=%{public}d uc=%{public}d base=%{public}s',
      dirLevelOf(base), deep ? 1 : 0, upLevels, base);
  }

  /** 第三十轮：把持久化的多层清单快照解码回 upDirCache（纯字符串，零 IO）。
   *  只保留「与授权根同层或在其之下」或「恢复层级的祖先」的层 ——
   *  换过授权根之后的旧层直接丢弃；upListNamesOf 按 target 层键查询，
   *  留下的层正是「往上层」会逐级走过的那些。
   *  解码失败 / 空文本静默清空，绝不影响恢复链（容错优先）。
   *  返回还原的层数（诊断串用）。 */
  private restoreUpCache(base: string): number {
    this.upDirCache = [];
    this.lastUpPath = '';
    this.lastUpNames = [];
    if (this.savedUpCacheRaw.length === 0) {
      // 第三十三轮：空缓存也是一个确定的「初始化结果」—— 预建成空索引。
      // 第三十四轮订正：空索引只意味着「没有可优先的缓存父级」，
      // 绝不据此拦下「往上层」；触发时照常走路径层级链上移。
      this.rebuildUpParentIndex();
      return 0;
    }
    // 第三十一轮：解码的是外部持久化数据（可能残留 R30 的坏文本），整体兜底，
    // 绝不冒泡到 restoreFromSnapshot 的 catch 让整批恢复被误判为「读不出」，
    // 进而 giveUpNow 写死路径标记 —— 那会让往上层和图片恢复稳定失效。
    try {
      const levels: Array<UpCacheLevel> = decodeUpCacheText(this.savedUpCacheRaw,
        UP_CACHE_SAVE_LEVELS, UP_CACHE_SAVE_NAMES);
      for (let i = 0; i < levels.length; i++) {
        const lv: UpCacheLevel = levels[i];
        const inTree: boolean = isSameOrUnderLevelOf(this.savedDirUri, lv.path) ||
          isSameOrUnderLevelOf(lv.path, base);
        if (!inTree) {
          continue;
        }
        // uris 不持久化（重启后授权形态可能失效）：留空，upListUriOf 按 target 拼兜底。
        this.upDirCache.push({ path: lv.path, names: lv.names, uris: [], kinds: lv.kinds });
      }
      if (this.upDirCache.length > 0) {
        // 旧单槽指向最深层快照，历史链路（诊断 / cached 判定）保持有值。
        const last: UpDirSnapshot = this.upDirCache[this.upDirCache.length - 1];
        this.lastUpPath = last.path;
        this.lastUpNames = last.names;
      }
    } catch (e) {
      this.upDirCache = [];
      this.lastUpPath = '';
      this.lastUpNames = [];
      hilog.warn(DOMAIN, TAG, 'restore up cache failed (ignored): %{public}s', JSON.stringify(e));
    }
    this.savedUpCacheRaw = '';
    // 第三十三轮：初始化时预先检索已还原的缓存目录结构，建好父子逻辑层级。
    this.rebuildUpParentIndex();
    return this.upDirCache.length;
  }

  /** 第三十三轮：预检索缓存目录结构 → 预建父子逻辑层级索引。
   *  纯字符串、零 IO；只在初始化 / 缓存结构变化时跑一次，触发「往上层」时只查不建。
   *  第三十四轮订正：索引只用于「把缓存父级排到候选最前」，不决定能否上移。 */
  private rebuildUpParentIndex(): void {
    const levels: Array<UpCacheLevel> = [];
    for (let i = 0; i < this.upDirCache.length; i++) {
      const s: UpDirSnapshot = this.upDirCache[i];
      levels.push({ path: s.path, names: s.names, kinds: s.kinds });
    }
    this.upParentIndex = cachedUpIndexOf(levels);
    this.upParentBuilt = true;
    hilog.info(DOMAIN, TAG, 'up index built: levels=%{public}d keys=%{public}d edges=%{public}d',
      levels.length, this.upParentIndex.keys.length, this.upParentIndex.edges.length);
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
    if (this.restoreCancelled) {
      return; // 3 秒看门狗已作废这次尝试，别再启动激活 / 恢复
    }
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

  /** 第四十四轮：毫秒级等待（NAS 重连重试节奏用）。
   *  第六十六轮：等待用的 Promise 构造统一收敛到 model/Preview.ets 的 yieldMacroTask ——
   *  同一处定时器等待现在同时服务 NAS 重试与天文分片让出，工程全源码 Promise 构造
   *  仍恰 2 处（零新增），语义与 R44 逐字一致。 */
  private nasRetryWait(ms: number): Promise<void> {
    return yieldMacroTask(ms);
  }

  /** 第四十四轮：重试前的**静默**授权再激活 —— 只推 activatePermission，绝不走
   *  finishPersistActivate（那是启动恢复链的一次性收口，重入会重复触发
   *  showLastOnStart）。任何异常静默吞掉：重试本身才是主路径，激活只是顺手推一把。 */
  private async reactivatePersistQuiet(): Promise<void> {
    const rootUri: string = this.pickRootUri.length > 0 ? this.pickRootUri : this.savedDirUri;
    if (rootUri.length === 0) {
      return;
    }
    const uris: Array<string> = persistPolicyUris(rootUri, '', PERSIST_POLICY_LIMIT);
    if (uris.length === 0) {
      return;
    }
    const policies: Array<fileShare.PolicyInfo> = [];
    for (let i = 0; i < uris.length; i++) {
      const policy: fileShare.PolicyInfo = {
        uri: uris[i],
        operationMode: fileShare.OperationMode.READ_MODE
      };
      policies.push(policy);
    }
    try {
      await fileShare.activatePermission(policies);
      hilog.info(DOMAIN, TAG, 'persist: re-activated for NAS retry');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'persist: re-activate failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 第四十四轮：恢复态清单是零 IO 画出来的，NAS 挂载还冷着 —— 渲染完后对
   *  base 做后台静默预热（listFile 探测 + 失败重试），用户点资料夹时挂载已热。
   *  纯探测：不碰视图 / 状态栏 / folderBusy，成功即止，绝不触发任何导航。 */
  private async warmRestoreDirQuiet(base: string): Promise<void> {
    if (base.length === 0 || !isNetworkDirUri(base)) {
      return;
    }
    const cands: string[] = dirCandidates(base).slice(0, 4);
    for (let attempt = 0; attempt <= NAS_RETRY_DELAYS.length; attempt++) {
      for (let c = 0; c < cands.length; c++) {
        try {
          await fs.listFile(cands[c], { recursion: false, listNum: 1 });
          hilog.info(DOMAIN, TAG, 'warm: network dir ready (attempt %{public}d)', attempt);
          // 第四十五轮：目录已通 = 网络已恢复 → 顺手自愈只读态（重探条目 URI，
          // 能开就退出 READONLY 并补解当前张，见 healRestoreMode）。
          this.healRestoreMode();
          return;
        } catch (e) {
          // 该写法列不动：试下一个
        }
      }
      if (attempt < NAS_RETRY_DELAYS.length) {
        await this.reactivatePersistQuiet();
        await this.nasRetryWait(NAS_RETRY_DELAYS[attempt]);
      }
    }
    hilog.warn(DOMAIN, TAG, 'warm: network dir still cold after retries (user tap will retry again)');
  }

  /** 第四十五轮：授权自愈 —— 后台预热成功后重探条目 URI，能开就退出只读名单态。
   *  背景：重启后 NAS 挂载 / 授权未就绪时，启动探测（probeRestoreUris）会**误判**
   *  「授权失效」→ 整个会话锁进 READONLY（名单在、图片白，翻页只剩档案名 ——
   *  正是「右边预览图只显示档案名」的来源）。R44 已让目录列举可重试自愈；
   *  这里是同源补丁：目录预热成功 = 网络已通，再探一次文件 URI，通了就打开
   *  解码闸门并补解当前张。探不通则维持 READONLY（真授权失效，不硬闯）。 */
  private healRestoreMode(): void {
    if (bulkIoAllowed(this.restoreMode)) {
      return;   // 本来就是 FULL：无事可做
    }
    const uris: Array<string> = [];
    const n: number = Math.min(this.items.length, RESTORE_PROBE_LIMIT);
    for (let i = 0; i < n; i++) {
      uris.push(this.items[i].uri);
    }
    if (uris.length === 0) {
      // 纯目录上下文态（items 为空）：点任意行即真实重列，applyItems 自会退出只读态。
      return;
    }
    // fast=true：只探第一个候选（restoreProbeUris 优先给 okUri = 上次成功显示过的
    // 那张，最可能存在）。后台自愈不做多候选 sync open —— READONLY 设计本就是
    // 要把失效 uri 的同步跨进程 IO 挡在主线程外，自愈只做一次最轻的确认。
    const readable: boolean = this.probeRestoreUris(uris, this.okUri, this.savedDirUri, true);
    if (!readable) {
      hilog.warn(DOMAIN, TAG, 'heal: item uris still unreadable, stay READONLY');
      return;
    }
    this.restoreMode = RESTORE_FULL;
    this.restoreHintText = '';
    this.diagLine = 'restore HEALED | ' + RESTORE_TAG + ' | ' + this.items.length + ' 张 | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'heal: auth recovered, exit READONLY (%{public}d items)', this.items.length);
    if (this.cur >= 0 && this.cur < this.items.length) {
      this.loadMeta(this.cur);
      this.showPreviewOf(this.cur);
      this.refreshSpread();
      this.schedulePreload();
      // 第七十七轮：自愈成功后补齐逐条 size / mtime（此前 heal 漏了这一步，
      // 导致恢复会话里左栏体积／日期一直靠快照旧值，新加的档案显示 '--'）。
      this.fillSizes();
    }
    this.status = '目录授权已恢复，图片与档案资料可以正常预览了';
  }

  /** 第七十七轮：冷启动探测误判授权失效时，排一次延迟自愈重探。
   *  R44/R45 的 warmRestoreDirQuiet 只对网络目录生效（isNetworkDirUri），
   *  本地目录一旦被 probeRestoreUris 误判就整个会话锁死 READONLY —— 名单在、
   *  图全白、缩略图不出、size/日期不补，正是「重新进入 / 重启后资料与预览图丢失」。
   *  这里不依赖目录列举，直接错开启动期重探文件 uri（healRestoreMode 内部只
   *  1 次 sync open，量级极小），通了就切 FULL 并补齐解码 / 预载 / 尺寸。 */
  private scheduleRestoreHeal(): void {
    if (this.restoreHealTimer !== -1) {
      clearTimeout(this.restoreHealTimer);
    }
    this.restoreHealTimer = setTimeout(() => {
      this.restoreHealTimer = -1;
      if (this.restoreCancelled || !this.pageAlive || this.giveUpDone) {
        return;
      }
      if (!bulkIoAllowed(this.restoreMode)) {
        this.healRestoreMode();
      }
    }, RESTORE_HEAL_DELAY_MS);
  }

  /** 第七十九轮：只读名单态 → 排一次「目录重列举兜底」。
   *
   *  为什么必须有：启动探测 `probeRestoreUris(fast=true)` 只探 1 个候选，而候选
   *  第一位就是 `okUri`（退出前正在看的那张）。它被移走 / 改名 / 换 URI 形态，
   *  整批名单就被判成「授权失效」；`healRestoreMode` 又只重探同一个 uri，于是永久
   *  停在只读态。真实情况往往是「目录持久授权仍在、只是快照旧 uri 不可读」。
   *
   *  这里用持久授权目录重新真实列一遍：能列出且能读到图片 → 交给既有
   *  `openFolder` 重建（它会按 `restoreIndex` 回到上次那张）；否则保持只读名单。
   *  网络目录不在这里兜（交给 warmRestoreDirQuiet 的重试 + 自愈）。 */
  private scheduleReadonlyRelist(): void {
    if (this.readonlyRelistTimer !== -1) {
      clearTimeout(this.readonlyRelistTimer);
    }
    this.readonlyRelistTimer = setTimeout(() => {
      this.readonlyRelistTimer = -1;
      if (this.restoreCancelled || !this.pageAlive || this.giveUpDone) {
        return;
      }
      const base: string = this.browseBase.length > 0 ? this.browseBase : this.savedDirUri;
      const act: number = readonlyRelistAction(!bulkIoAllowed(this.restoreMode),
        base.length > 0, isNetworkDirUri(base), this.userActed, this.giveUpDone,
        this.items.length);
      if (act === RELIST_SKIP) {
        return;
      }
      this.tryReadonlyRelist(base).catch(() => {
        hilog.warn(DOMAIN, TAG, 'relist: rejected (ignored)');
      });
    }, READONLY_RELIST_DELAY_MS);
  }

  /** 第七十九轮：轻量确认 + 真实重建。
   *  ⚠️ 绝不直接 `openFolder`：它会对每个子项 `fs.statSync`（同步跨进程），
   *     在授权不可用的目录上可能挂住主线程（历史 appfreeze 同源）。
   *     先用 1 次 async `listFile` + 1 次 `openSync` 确认「列得出且读得动」，
   *     通过了才把目录交给 `openFolder`（此时逐项 stat 已是安全路径）。 */
  private async tryReadonlyRelist(base: string): Promise<void> {
    const cands: Array<string> = dirCandidates(base).slice(0, RELIST_CAND_MAX);
    for (let i: number = 0; i < cands.length; i++) {
      if (this.restoreCancelled || !this.pageAlive || this.userActed) {
        return;
      }
      const cand: string = cands[i];
      let names: Array<string> = [];
      try {
        names = await fs.listFile(cand, { recursion: false, listNum: 0 });
      } catch (e) {
        continue;
      }
      if (this.restoreCancelled || !this.pageAlive || this.userActed) {
        return;
      }
      let pic: string = '';
      for (let k: number = 0; k < names.length; k++) {
        if (isImageName(names[k])) {
          pic = names[k];
          break;
        }
      }
      if (pic.length === 0) {
        continue;   // 本层没有图片：不重建（避免把图片态换成目录态）
      }
      // 只做 1 次同步 open：确认子文件真能读，量级与启动探测同级。
      let openOk: boolean = false;
      let f: fs.File | undefined = undefined;
      try {
        f = fs.openSync(stripTrailingSlash(cand) + '/' + pic, fs.OpenMode.READ_ONLY);
        openOk = true;
      } catch (e) {
        openOk = false;
      } finally {
        if (f !== undefined) {
          try {
            fs.closeSync(f);
          } catch (e) {
            hilog.warn(DOMAIN, TAG, 'relist close skipped');
          }
        }
      }
      if (!relistProbeOkOf(names.length > 0, openOk)) {
        continue;
      }
      hilog.info(DOMAIN, TAG, 'relist: dir readable, rebuild list (%{public}d entries)',
        names.length);
      this.status = '正在按目录授权重新读取…';
      const ok: boolean = await this.openFolder(cand, false);
      if (!this.pageAlive || this.restoreCancelled) {
        return;
      }
      if (ok && this.items.length > 0) {
        this.status = relistOkHint(RELIST_TAG);
        this.diagLine = 'restore RELISTED | ' + RELIST_TAG + ' | ' +
          this.items.length + ' 张 | v' + APP_VERSION;
        hilog.info(DOMAIN, TAG, 'relist: recovered %{public}d images', this.items.length);
      } else {
        hilog.warn(DOMAIN, TAG, 'relist: list ok but no readable image, stay READONLY');
      }
      return;
    }
    hilog.warn(DOMAIN, TAG, 'relist: no candidate readable, stay READONLY');
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
    // 第十轮 ff1：授权激活失败 / 超时是明确的「问题信号」—— 不再往下读快照、不再等
    // 3 秒看门狗，立即停止尝试并打开选择文件夹。
    // 第三十六轮：目录态恢复零 IO，不需要 URI 授权；激活失败不该弹选择器 /
    // 写死路径标记把用户踢回默认目录。照常进入 showLastOnStart 的目录态分支。
    const dirOnly: boolean = dirOnlyResumeWanted(this.savedDirCtx,
      AUTO_SHOW_LAST_ON_START, this.userActed, this.resumeDone) === DIR_RESUME_CONTEXT;
    if (!ok && !dirOnly && failFastAction(true, this.hasRestoreMemory, this.userActed,
        this.restoreSettled || this.giveUpDone) === FF_GIVEUP) {
      this.giveUpNow('persist auth lost', elapsedSince(this.restoreStartedAt, Date.now()));
      return;
    }
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

  // ------------------------------------------------------------------
  // 会话界面状态：窗口大小 / 位置 与 左栏收起态（2026-11-12 第六轮）
  // ------------------------------------------------------------------

  /** 排一次「首帧之后恢复窗口大小与位置」。
   *  ⚠️ 绝不在这里动窗口 API：启动关键路径上取到的 windowRect 可能不准
   *     （官方 FAQ：aboutToAppear 阶段窗口尚未可见），统一推迟到窗口稳定后。 */
  private scheduleRestoreWindowRect(): void {
    if (this.winRectApplied ||
      !shouldScheduleWindowRestore(this.savedWindowRect, this.savedWindowMaximized)) {
      return;
    }
    setTimeout(() => {
      this.applySavedWindowRect(0);
    }, WIN_RECT_RESTORE_MS);
  }

  /** 把上次退出时的窗口**形态**与 rect 应用到主窗口（第七轮：最大化也要恢复）。
   *  · 启动已是最大化 / 全屏 → 保持现状，绝不改动用户窗口；
   *  · 上次是最大化 → maximize(EXIT_IMMERSIVE) 恢复最大化，且**不做 resize / moveWindowTo**
   *    （那两步会把刚恢复的最大化打回普通尺寸，正是「重启后回退」的根因）；
   *  · 否则按 rect 恢复自由窗口的大小与位置；
   *  · 每步独立 try/catch：某一步在该机型不支持时只记日志，不影响图片恢复链；
   *  · 窗口实例由 EntryAbility 异步放进 AppStorage，没就绪就短延时重试。 */
  private async applySavedWindowRect(retry: number): Promise<void> {
    if (this.winRectApplied) {
      return;
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (win === undefined) {
      if (retry < WIN_RECT_RETRY_MAX) {
        setTimeout(() => {
          this.applySavedWindowRect(retry + 1);
        }, WIN_RECT_RETRY_MS);
      }
      return;
    }
    let floating: boolean = false;
    try {
      const st = win.getWindowStatus();
      floating = st === window.WindowStatusType.FLOATING;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'winRect: getWindowStatus failed');
      return;
    }
    if (!floating) {
      // 启动就是最大化 / 全屏：保持现状，不改动用户的窗口形态。
      this.winRectApplied = true;
      return;
    }
    this.winRectApplied = true; // 只恢复一次，之后用户怎么拖 / resize 都不再干预
    // ① 上次退出是最大化 → 恢复最大化，绝不按 rect 缩回普通尺寸。
    //    EXIT_IMMERSIVE = 带标题栏 / dock 的常规最大化，正是用户手动最大化后的形态。
    if (shouldRestoreMaximized(this.savedWindowMaximized, true, this.fullscreen)) {
      try {
        await win.maximize(window.MaximizePresentation.EXIT_IMMERSIVE);
        hilog.info(DOMAIN, TAG, 'winRect: restored maximized window (no rect resize)');
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'winRect: maximize failed: %{public}s', JSON.stringify(e));
      }
      return;
    }
    // ② 自由窗口：按上次 rect 恢复大小与位置。
    const rect: WindowRect | undefined = parseWindowRect(this.savedWindowRect);
    if (rect === undefined ||
      !windowRectUsable(rect, WIN_MIN_W, WIN_MIN_H, WIN_MAX_W, WIN_MAX_H)) {
      hilog.info(DOMAIN, TAG, 'winRect: no usable saved rect, keep system default');
      return;
    }
    try {
      await win.resize(rect.width, rect.height);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'winRect: resize failed: %{public}s', JSON.stringify(e));
    }
    try {
      await win.moveWindowTo(rect.left, rect.top);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'winRect: moveWindowTo failed: %{public}s', JSON.stringify(e));
    }
    hilog.info(DOMAIN, TAG, 'winRect: restored %{public}d,%{public}d %{public}dx%{public}d',
      rect.left, rect.top, rect.width, rect.height);
  }

  /** 抓当前窗口形态 + rect（px）并**同步**落盘 —— 退出前必达，进程被杀也不丢。
   *  左栏收起态一并写下去，保证「重启前后界面状态一致」。
   *  第七轮：最大化形态单独写 winMaximized，与 winRect 互不覆盖：
   *  最大化时不更新自由窗口 rect，自由窗口时不把最大化标记留成 1。
   *  全屏 / 形态未知态不覆写记忆（那是临时形态或瞬时状态）。 */
  private saveWindowRectSync(): void {
    const store: preferences.Preferences | undefined = this.prefs;
    if (store === undefined) {
      return;
    }
    let wrote: boolean = false;
    try {
      store.putSync(WIN_KEY_COLLAPSED, this.listCollapsed ? 1 : 0);
      // 第一百零八轮：左栏拖拽宽同批落盘（0 = 没拖过 / 已复位为自适应）。
      // 它是「用户意图」而不是当前显示宽 —— 窗口临时变窄不该把记忆改小。
      // 第一百一十轮：展开态与收起态各一个 key。
      store.putSync(WIN_KEY_SIDEBAR_W, splitPersistOf(this.sidebarUserW));
      store.putSync(WIN_KEY_SIDEBAR_CW, splitPersistOf(this.sidebarCollapsedUserW));
      wrote = true;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'winRect: save collapsed failed');
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    let floating: boolean = false;
    let maximized: boolean = false;
    let statusKnown: boolean = false;
    if (win !== undefined) {
      try {
        const st = win.getWindowStatus();
        floating = st === window.WindowStatusType.FLOATING;
        // 用户点标题栏最大化按钮可能落到 MAXIMIZE，也可能落到 FULL_SCREEN（带/不带沉浸），
        // 两者重启后都按「常规最大化」恢复，标题栏 / dock 照常显示。
        maximized = st === window.WindowStatusType.MAXIMIZE ||
          st === window.WindowStatusType.FULL_SCREEN;
        statusKnown = floating || maximized;
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'winRect: getWindowStatus failed');
      }
    }
    // 形态小 key：MINIMIZE / UNDEFINED / SPLIT_SCREEN 一律不覆写，避免切一次后台就丢掉记忆。
    // APP 自持的真全屏也不写（那是临时形态，退出后回到原来的常规窗口）。
    if (win !== undefined && statusKnown && !this.fullscreen) {
      const flag: number = windowModeFlagOf(this.fullscreen, maximized, floating, statusKnown);
      if (flag >= 0) {
        try {
          store.putSync(WIN_KEY_MAXIMIZED, flag);
          wrote = true;
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'winRect: save maximized flag failed');
        }
      }
    }
    if (win !== undefined && shouldSaveWindowRect(this.fullscreen, floating)) {
      try {
        const props = win.getWindowProperties();
        const r = props.windowRect;
        const packed: string = packWindowRect({
          left: r.left, top: r.top, width: r.width, height: r.height
        });
        if (windowRectUsable(parseWindowRect(packed), WIN_MIN_W, WIN_MIN_H, WIN_MAX_W, WIN_MAX_H)) {
          store.putSync(WIN_KEY_RECT, packed);
          wrote = true;
        }
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'winRect: getWindowProperties failed: %{public}s', JSON.stringify(e));
      }
    }
    if (wrote) {
      try {
        store.flushSync();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'winRect: flushSync failed');
      }
    }
  }

  /** 拖窗口 / 切换左栏收起态时的防抖写盘：不必每帧都写 preferences。 */
  private markWindowRect(): void {
    if (this.winRectTimer !== -1) {
      return;
    }
    this.winRectTimer = setTimeout(() => {
      this.winRectTimer = -1;
      this.saveWindowRectSync();
    }, WIN_RECT_SAVE_MS);
  }

  private clearWinRectTimer(): void {
    if (this.winRectTimer !== -1) {
      clearTimeout(this.winRectTimer);
      this.winRectTimer = -1;
    }
  }

  // ------------------------------------------------------------------
  // 第一百零八轮：左栏拖拽调宽（记忆 / 夹取）
  // 第一百零九轮：修「拖不动」—— 输入通道改为显式 mouse + touch，不再依赖手势竞技场
  // ------------------------------------------------------------------

  /** 把当前「用户意图宽」同步写盘（拖完立刻写，不等 600ms 防抖 —— 拖完就退出也不丢）。
   *  只写一个小 key：putSync + flushSync 毫秒级，绝不写快照。 */
  private persistSidebarWNow(): void {
    const store: preferences.Preferences | undefined = this.prefs;
    if (store === undefined) {
      return;
    }
    try {
      store.putSync(WIN_KEY_SIDEBAR_W, splitPersistOf(this.sidebarUserW));
      // 第一百一十轮：收起态宽同批写（两态各自记忆，互不覆盖）。
      store.putSync(WIN_KEY_SIDEBAR_CW, splitPersistOf(this.sidebarCollapsedUserW));
      store.flushSync();
      hilog.info(DOMAIN, TAG, 'sidebarW: saved %{public}d / collapsed %{public}d',
        this.sidebarUserW, this.sidebarCollapsedUserW);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'sidebarW: save failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 鼠标事件的**绝对**横坐标（窗口坐标系）。拖拽只认绝对值之差，
   *  与「鼠标此刻在不在分隔条上」无关 —— 这是「连续跟手」的前提。 */
  private splitMouseAbsX(event: MouseEvent): number {
    const v: number = Number(event.displayX ?? event.x);
    return v === v ? v : this.splitStartX;
  }

  /** 触摸事件的绝对横坐标。打印 / 手写笔与手指走同一条通道；
   *  个别设备不给 displayX 时依次退 windowX / x（三者都是同一指头的同一次事件，退级别不会跳）。 */
  private splitTouchAbsX(event: TouchEvent): number {
    const list: Array<TouchObject> = event.touches;
    const t: TouchObject | undefined = (list !== undefined && list.length > 0) ? list[0] : undefined;
    if (t === undefined) {
      return this.splitStartX + this.splitMovedPx;
    }
    const v: number = Number(t.displayX ?? t.windowX ?? t.x);
    return v === v ? v : this.splitStartX;
  }

  /** 光标：悬停在分隔条上 / 正在拖动 → 左右双箭头；离开且没在拖 → 还原系统默认。
   *  CursorController 是 API 12 起的 UIContext 能力，2in1 上可用；任何异常只记日志，
   *  绝不让「设不了光标」把拖动本身带崩（拖动不依赖光标）。 */
  private applySplitCursor(): void {
    try {
      const cc = this.getUIContext().getCursorController();
      if (this.sidebarDragging || this.sidebarHover) {
        cc.setCursor(pointer.PointerStyle.WEST_EAST);
        this.splitCursorSet = true;
      } else if (this.splitCursorSet) {
        cc.restoreDefault();
        this.splitCursorSet = false;
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'sidebarSplit: setCursor failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 按下（鼠标左键 / 手指 / 笔）：
   *  · **整条分割栏任意位置**都能起拖（含中间 « 按钮）；收起态改 collapsedW，
   *    展开态改 listW，两态宽度分开记忆、互不覆盖；
   *  · `onButton` = 这次按下是否落在中间按钮上 → 只用来跳过双击复位
   *    （双击按钮的本意是收起 / 展开，不该顺带改宽度）；
   *  · 双击（两次按下间隔 < SPLIT_DOUBLE_TAP_MS 且上一次没怎么移动）→ 复位当前态自适应；
   *  · 否则进入拖动：记录起始宽 + 起始绝对 X，**此刻不改宽度**（用户可能只是点一下）。 */
  private onSplitPointerDown(absX: number, onButton: boolean = false): void {
    const now: number = Date.now();
    const dbl: boolean = !onButton && (now - this.splitLastDownMs) < SPLIT_DOUBLE_TAP_MS &&
      this.splitMovedPx <= SPLIT_CLICK_TOL_PX;
    this.splitLastDownMs = now;
    this.splitMovedPx = 0;
    if (dbl) {
      this.splitDragActive = false;
      this.resetSidebarW();
      return;
    }
    // 当前生效宽度：收起态就是 collapsedW（分隔条此刻紧贴它），展开态就是 listW。
    this.splitDragCollapsed = this.listCollapsed;
    this.splitDragActive = true;
    this.splitStartW = this.listCollapsed ? this.collapsedW : this.listW;
    this.splitStartX = absX;
    this.sidebarDragging = true;
    this.markUserActive();
    this.applySplitCursor();
    // 第一百一十一轮：按下**不写状态栏** —— 整条分割栏（含中间按钮）都能按，
    // 若按下就写「拖动中…」，点一下 « 会先闪一句「拖动中」再被「已收起左栏」覆盖。
    // 真正的文案从第一次真实位移开始写（onSplitDragUpdate）。
  }

  /** 移动：**每帧都按「起始宽 + 绝对位移」重算**（不做增量累加，丢帧也不会漂）。
   *  位移由 SidebarSplit.splitDragWOf 夹进 [MIN, max(rootW)]，所以拖不出合法区间。 */
  private onSplitPointerMove(absX: number): void {
    if (!this.splitDragActive) {
      return;
    }
    const dx: number = absX - this.splitStartX;
    this.splitMovedPx = Math.abs(dx) > this.splitMovedPx ? Math.abs(dx) : this.splitMovedPx;
    this.onSplitDragUpdate(dx);
  }

  /** 拖动中的唯一写宽口：按本次拖的是哪一态分别写。
   *  · 展开态：sidebarUserW + listW，并**逐帧**重判 hideMeta（名称放不下就立刻收起大小 / 日期）；
   *  · 收起态：sidebarCollapsedUserW + collapsedW（收起态本来就只显示名称，不涉及 hideMeta）。 */
  private onSplitDragUpdate(offsetX: number): void {
    if (!this.splitDragActive) {
      return;
    }
    const w: number = splitDragWOf(this.splitStartW, offsetX, this.lastRootW);
    if (this.splitDragCollapsed) {
      this.sidebarCollapsedUserW = w;
      this.collapsedW = w;
    } else {
      this.sidebarUserW = w;
      this.listW = w;
      this.hideMeta = splitHideMetaOf(w, this.autoNeedW);
    }
    this.status = splitStatusOf(w, true);
  }

  /** 松开（或触摸被打断）：落盘 + 复位 chrome 基准 + 重算一次自适应 + 还光标。
   *  · chromeW/H 置 -1：固定栏偏移（根宽 − 预览画布）已经变了，必须让预览回调重采一次，
   *    与「收起 / 展开左栏」完全同一套处理（否则根回调会拿旧偏移反推画布）；
   *  · 重算一次 refreshAdaptiveLayout：按新的左栏宽对齐两态宽度、hideMeta 与三列宽。 */
  private onSplitDragEnd(): void {
    const active: boolean = this.splitDragActive;
    const moved: boolean = this.splitMovedPx > SPLIT_CLICK_TOL_PX;
    this.splitDragActive = false;
    this.sidebarDragging = false;
    if (!active) {
      this.applySplitCursor();
      return;
    }
    // 纯点击（含点在中间 « 按钮上）：宽度一个像素都没变 —— 不写盘、不重排、不写状态栏，
    // 把「接下来发生什么」完全交回按钮自己的 onClick（收起 / 展开）。
    if (!moved) {
      this.applySplitCursor();
      return;
    }
    this.chromeW = -1;
    this.chromeH = -1;
    this.persistSidebarWNow();
    const rowNames: Array<string> = [];
    for (let i = 0; i < this.rows.length; i++) {
      rowNames.push(this.rows[i].name);
    }
    this.refreshAdaptiveLayout(rowNames);
    this.status = splitStatusOf(this.listCollapsed ? this.collapsedW : this.listW, false);
    this.applySplitCursor();
    hilog.info(DOMAIN, TAG, 'sidebarW: drag end collapsed=%{public}d w=%{public}d root=%{public}d moved=%{public}d',
      this.splitDragCollapsed ? 1 : 0, this.listCollapsed ? this.collapsedW : this.listW,
      this.lastRootW, this.splitMovedPx);
  }

  /** 双击分隔条：清掉**当前态**的记忆，回到 acLayoutOf 的自适应宽（写 0 = 没设过）。 */
  private resetSidebarW(): void {
    if (this.listCollapsed) {
      this.sidebarCollapsedUserW = splitResetOf();
    } else {
      this.sidebarUserW = splitResetOf();
    }
    this.persistSidebarWNow();
    const rowNames: Array<string> = [];
    for (let i = 0; i < this.rows.length; i++) {
      rowNames.push(this.rows[i].name);
    }
    this.refreshAdaptiveLayout(rowNames);
    this.status = '左栏宽度已恢复自适应 · 双击 / 拖动分隔条可再调整';
  }

  /** 第三十六轮：零 IO 恢复「仅目录上下文」—— 退出前停在空 / 无图片目录时，
   *  重开必须落在那个目录，而不是回默认目录、也不是弹选择器。
   *
   *  纯字符串：只用 readBrowseExtras 读回的 savedBrowseBase / savedDirUri /
   *  savedUpCacheRaw，绝不列目录 / stat / 解码 / 弹选择器（启动期零 IO 防线保留）。
   *  restoreBrowseContext() 回填 browseBase / browseDir / pickRootUri / titlePath /
   *  canGoUp 与多层 upDirCache；随后「往上层」、点目录名进子目录都照常可用。
   *  左栏用同一层的 upDirCache 快照画一份纯清单，让用户看得见「回到的是哪个目录」；
   *  真正重新真实列举发生在用户第一次点击时（用户主动路径允许 IO）。 */
  private restoreDirContextOnly(): void {
    this.resumeDone = true;
    // 极端旧数据：只存过 browseBase 没存过授权根时，也绝不退回默认目录。
    if (this.savedDirUri.length === 0 && this.savedBrowseBase.length > 0) {
      this.savedDirUri = this.savedBrowseBase;
    }
    this.restoreBrowseContext();
    if (this.browseBase.length === 0) {
      this.browseBase = this.savedBrowseBase;
      this.browseDir = this.savedBrowseBase;
      this.pickRootUri = '';
      this.titlePath = this.savedBrowseBase;
      this.canGoUp = canGoUpFrom(this.savedBrowseBase);
      this.restoreUpCache(this.savedBrowseBase);
    }
    const base: string = this.browseBase;
    const label: string = baseName(base);
    const rows: ImageItem[] = [];
    // 第一百零四轮：原来的「..」往上层伪行已按要求整行移除（含它占的那一行高度）。
    // 往上层仍有两个入口：工具行「←」按钮 与 键盘 Backspace（→ browseUp()）。
    for (let i = 0; i < this.upDirCache.length; i++) {
      const snap: UpDirSnapshot = this.upDirCache[i];
      if (!sameDirPath(snap.path, base)) {
        continue;
      }
      for (let j = 0; j < snap.names.length; j++) {
        const nm: string = snap.names[j];
        if (nm.length === 0 || isUpListPseudoName(nm)) {
          continue;
        }
        const rowUri: string = j < snap.uris.length && snap.uris[j].length > 0
          ? snap.uris[j] : stripTrailingSlash(base) + '/' + nm;
        // 第四十一轮：恢复态目录有持久授权，行种类按快照真实值直传（keepFileKinds），
        // .log 等文本行保持 ROW_TEXT，点了直接进文本预览；快照里没有的名字按后缀
        // 兜底，文本后缀也给 ROW_TEXT（openTextFile 内部还有 textLangOf 复核）。
        const rowKind: number = this.upListKindOf(base, nm,
          isTextFileName(nm) ? ROW_TEXT
            : (isImageName(nm) || nm.indexOf('.') > 0) ? ROW_OTHER : ROW_FOLDER, true);
        rows.push({ uri: rowUri, name: nm, size: -1, mtime: 0,
          kind: rowKind, itemIndex: -1 });
      }
    }
    // 第五十轮：重启恢复态不再自称「已恢复上次目录」——撤掉列表尾部的说明行伪条目，
    // 状态栏也按普通目录列表的样子呈现；旧快照里已存下的说明行由
    // isUpListPseudoName 过滤（DirName.ts 同轮加了识别），不会再漏进清单。
    this.items = [];
    this.rows = rows;
    this.source = label;
    this.itemCount = 0;
    this.rowCount = rows.length;
    // 第五十九轮：冷启动恢复是全新会话，绝不带入任何「往上层」反色标记。
    this.upReturnName = upReturnClearOf(this.upReturnName, false);
    const rowNames: string[] = [];
    for (let r = 0; r < rows.length; r++) {
      rowNames.push(rows[r].name);
    }
    this.refreshAdaptiveLayout(rowNames);
    this.dataSource.reload(this.rows);
    // 第六十四轮：APP 内清单态同样接入目录内容量统计链（零 IO，只建 PENDING 条目）。
    this.syncDirCountTargets();
    this.rebuildDirCountLabels();
    this.titlePath = base;
    this.canGoUp = canGoUpFrom(base);
    this.cur = -1;
    this.resetView();
    this.inAppUpList = true;
    this.dirHint = '';  // R78：「APP 内上层xxx」提醒移除，恢复态左栏不再显示提示条
    if (this.dirPollTimer !== -1) {
      clearInterval(this.dirPollTimer);
      this.dirPollTimer = -1;
    }
    if (this.rescanTimer !== -1) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = -1;
    }
    this.status = '「' + label + '」· 本层没有图片 · ' +
      rows.length + ' 个条目（点名称重新真实列举）· ' + ESC_BUILD_TAG;
    this.diagLine = 'up CTX | ' + UP_CTX_TAG + ' | dironly=1 | L' + dirLevelOf(base) +
      ' | rows=' + rows.length + ' | no-picker | v' + APP_VERSION;
    this.markRestoreEntered();
    // 第四十四轮：NAS 挂载 / 授权预热（静默探测 + 失败重试，见 warmRestoreDirQuiet）。
    this.warmRestoreDirQuiet(base).catch(() => {
    });
    hilog.info(DOMAIN, TAG,
      'restore: dir context only L%{public}d rows=%{public}d base=%{public}s',
      dirLevelOf(base), rows.length, base);
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
    this.restoreStartedAt = Date.now();
    // 3 秒总预算看门狗：与恢复链一起排程，谁先收口谁生效。
    // 只有「有上次会话记忆」才挂；首次启动绝不被动弹选择文件夹。
    if (enterTimeoutSafe(RESTORE_ENTER_TIMEOUT_MS, ENTER_TIMEOUT_MIN_MS,
        ENTER_TIMEOUT_MAX_MS) &&
        enterWatchdogWanted(AUTO_SHOW_LAST_ON_START, this.hasRestoreMemory,
          this.resumeDone, this.userActed)) {
      this.enterWatchdogTimer = setTimeout(() => {
        this.enterWatchdogTimer = -1;
        this.onEnterWatchdog();
      }, RESTORE_ENTER_TIMEOUT_MS);
    }
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = -1;
      // 先（有超时兜底地）激活持久授权，再进入原来的恢复链；
      // 没有持久记录时 beginRestore 会直接落到 showLastOnStart，行为与旧版一致。
      this.beginRestore();
    }, RESUME_DELAY_MS);
  }

  // ------------------------------------------------------------------
  // 启动恢复「3 秒内进入上次目录」看门狗（et1，见 RestoreTimeout.ts）
  // ------------------------------------------------------------------

  /** 清掉看门狗计时器：成功进入目录 / 用户自己动手 / 页面销毁都要调。 */
  private clearEnterWatchdog(): void {
    if (this.enterWatchdogTimer !== -1) {
      clearTimeout(this.enterWatchdogTimer);
      this.enterWatchdogTimer = -1;
    }
  }

  /** 恢复链真正进入上次的目录：记成功并撤掉看门狗，不再打扰用户。
   *  ⚠️ 只有整批恢复成功才调；单张兜底 / ro1 只读名单态都不算进入目录。 */
  private markRestoreEntered(): void {
    this.restoreEntered = true;
    this.restoreSettled = true;
    this.clearEnterWatchdog();
    hilog.info(DOMAIN, TAG, 'restore: entered last dir in %{public}d ms (et1)',
      Date.now() - this.restoreStartedAt);
    // 第五十七轮：恢复链已真正进入上次目录（resumeDone=true、browseBase 已回填），
    // 此时补一次真实列举，把零 IO 快照清单同步回磁盘（新增 / 删除 / 改名 / 层级变动）。
    // 若仍有在途操作，tryBootRefresh 自行有限延后；绝不在恢复期抢占 IO。
    this.tryBootRefresh();
  }

  /** 看门狗到期：由 RestoreTimeout 纯函数裁决，
   *  只有「到期仍未进入且没人抢先」才停止尝试并打开选择文件夹。 */
  private onEnterWatchdog(): void {
    const elapsed: number = this.restoreStartedAt > 0
      ? Date.now() - this.restoreStartedAt : RESTORE_ENTER_TIMEOUT_MS;
    const act: number = enterTimeoutAction(elapsed, RESTORE_ENTER_TIMEOUT_MS,
      this.restoreSettled, this.restoreEntered, this.userActed,
      this.pickerBusy, this.folderBusy);
    if (act !== ENTER_ABORT) {
      return;
    }
    this.abortRestoreForPicker(elapsed);
  }

  /** 停止尝试，直接打开选择文件夹。
   *  「停止」包含四件事：作废在飞的恢复链、清掉两个还在排的定时器、
   *  挡住 activate 竞速收口、把 resumeDone 置真防止恢复链再被调度。
   *  ⚠️ 不碰 ro1 只读闸门、不碰已有缓存：用户选完目录后 openFolder → applyItems
   *    会自然换源重建，这里只把控制权交还给「选择文件夹」。 */
  private abortRestoreForPicker(elapsed: number): void {
    this.restoreCancelled = true;
    this.restoreEntered = false;
    this.restoreSettled = true;
    this.resumeDone = true;
    this.persistSettled = true;
    if (this.resumeTimer !== -1) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = -1;
    }
    if (this.persistTimer !== -1) {
      clearTimeout(this.persistTimer);
      this.persistTimer = -1;
    }
    this.clearEnterWatchdog();
    // 作废启动恢复可能已经拉起的全量预载链：自增代号后 pumpAll / onAllDecoded 的
    // 旧批次回调全部失效，后台不再继续读这个（多半已不可达的）目录。
    this.allSeq++;
    this.allBusy = false;
    this.allActive = 0;
    this.status = enterTimeoutHint(RESTORE_ENTER_TIMEOUT_MS);
    this.diagLine = 'restore TIMEOUT | ' + ENTER_TAG + ' | ' + elapsed +
      'ms | v' + APP_VERSION;
    hilog.warn(DOMAIN, TAG,
      'restore: enter timeout %{public}d ms, stop and open folder picker', elapsed);
    // 第十轮 ff1：超时也是一次「栽在死路径上」—— 记下来，下次启动零 IO 立即放弃。
    this.giveUpDone = true;
    this.saveDeadTag(deadTagOf(this.savedDirUri, this.okUri));
    this.chooseFolder();
  }

  /** 第十轮 ff1：明确的「问题信号」一到就立即停止尝试并打开选择文件夹。
   *  与 et1 超时收口做的是同一件事，但不依赖任何定时器 —— 死路径上的同步 IO
   *  会把 setTimeout 回调饿死，所以「立即」必须由错误 / 失败信号直接驱动。
   *  ⚠️ 只跑一次：giveUpDone 挡住超时收口与错误收口几乎同时到达，绝不弹第二次选择器。 */
  private giveUpNow(reason: string, elapsed: number): void {
    if (this.giveUpDone || this.userActed || this.restoreEntered) {
      return;
    }
    this.giveUpDone = true;
    this.restoreCancelled = true;
    this.restoreEntered = false;
    this.restoreSettled = true;
    this.resumeDone = true;
    this.persistSettled = true;
    if (this.resumeTimer !== -1) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = -1;
    }
    if (this.persistTimer !== -1) {
      clearTimeout(this.persistTimer);
      this.persistTimer = -1;
    }
    this.clearEnterWatchdog();
    // 作废启动恢复可能已经拉起的全量预载链：后台不再读这个（多半已不可达的）目录。
    this.allSeq++;
    this.allBusy = false;
    this.allActive = 0;
    this.status = failFastHint(reason);
    this.diagLine = 'restore GIVEUP | ' + FF_TAG + ' | ' + reason +
      ' | ' + elapsed + 'ms | v' + APP_VERSION;
    this.saveDeadTag(deadTagOf(this.savedDirUri, this.okUri));
    hilog.warn(DOMAIN, TAG,
      'restore: give up immediately (%{public}s) %{public}d ms, open folder picker',
      reason, elapsed);
    this.chooseFolder();
  }

  /** 记住 / 清掉「上次栽在哪个目录」。只写一个小 key，同步落盘（进程被杀也不丢）。
   *  ⚠️ 用 this.prefs 而不是 await posStore()：giveUpNow 是同步方法，绝不能引入等待。
   *     readLastPos 已经建好 prefs；极端早退时 store 为 undefined，本次不记即可。 */
  private saveDeadTag(tag: string): void {
    this.deadMemory = tag;
    const store: preferences.Preferences | undefined = this.prefs;
    if (store === undefined) {
      return;
    }
    try {
      store.putSync(POS_KEY_DEAD, tag);
      store.flushSync();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'save dead tag failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 首帧之后真正执行恢复。只读「1 个小 key（snapCount）+ 分块 uri 快照」，
   *  绝不重扫图库、绝不弹权限框 —— 无交互、无 ANR。
   *  ⚠️ 第十轮 ff1 起，恢复链里一旦出现明确的问题信号（授权失效 / 快照读不出 /
   *    只读名单态 / 单张兜底）就由 giveUpNow() 立即停止尝试并打开选择文件夹，
   *    不再等 et1 看门狗的 3 秒；本函数体不直接调用选择器。
   *    et1 只保留为「完全没有任何信号」时的兜底。
   *
   *  两条路径最终都会经过 applyItems() → showPreviewOf()，所以
   *  「当前路径 / 目录展示 / 往上层按钮状态」与正常载入完全一致：
   *  恢复出来的是**图片列表态**（browseBase=''），此时 canGoUp=false，但按钮仍亮着可点，
   *  点了由 browseUp() 给「请用选择文件夹进入目录浏览」提示（2026-11-11：不再 grey out）。 */
  private async showLastOnStart(): Promise<void> {
    if (this.resumeDone || this.restoreCancelled) {
      return;
    }
    const userActed: boolean = this.userActed || this.items.length > 0 ||
      this.pickerBusy || this.folderBusy;
    // 第三十六轮：退出前停在「目录浏览态且本层零图片」→ 目录上下文恢复**优先**
    // 于图片恢复。目录位置是独立于相片的纯字符串信息，绝不能因为没有图片 uri /
    // 空快照就被 RESUME_SKIP、enterSettledOk(0) 或 giveUpNow 当成「恢复失败」。
    // 该分支零 IO、不弹选择器、不回默认目录，也不碰残留的旧图片快照。
    if (dirOnlyResumeWanted(this.savedDirCtx, AUTO_SHOW_LAST_ON_START,
        userActed, this.resumeDone) === DIR_RESUME_CONTEXT) {
      this.restoreDirContextOnly();
      return;
    }
    this.resumeDone = true; // 只跑一次：无论成功、失败还是用户已抢先操作
    const saved: LastPos | undefined = this.lastPos;
    const savedUri: string = saved !== undefined ? saved.uri : '';
    const single: string = resumeSingleUri(savedUri, this.okUri);
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
    if (this.restoreCancelled) {
      return; // 看门狗已收口：读小 key 期间超时，别再往下建列表
    }
    const act: number = resumeAction(userActed, false, AUTO_SHOW_LAST_ON_START,
      snapCount, savedUri, this.okUri, true);
    if (act === RESUME_SKIP) {
      hilog.info(DOMAIN, TAG, 'resume: skip (userActed=%{public}d snap=%{public}d uri=%{public}d)',
        userActed ? 1 : 0, snapCount, single.length > 0 ? 1 : 0);
      return;
    }
    if (act === RESUME_SNAPSHOT) {
      const ok: boolean = await this.restoreFromSnapshot(true); // setItems → applyItems → restoreIndex
      if (this.restoreCancelled) {
        return; // 看门狗已作废这次尝试；绝不再碰状态栏 / 视图
      }
      if (ok) {
        // 只有真正「进入上次的目录」（非只读名单态、列表有图）才撤掉看门狗。
        // 第十轮 ff1：只读名单态 / 空列表是明确的「问题信号」—— 不再留给 3 秒收口，
        // 立即停止尝试并打开选择文件夹让用户重新授权（名单仍在，取消选择器也看得到）。
        if (enterSettledOk(this.restoreMode !== RESTORE_READONLY &&
            this.restoreHintText.length === 0, this.items.length, this.restoreCancelled)) {
          this.markRestoreEntered();
        } else if (failFastAction(true, this.hasRestoreMemory, this.userActed,
            this.restoreSettled || this.giveUpDone) === FF_GIVEUP) {
          this.giveUpNow('readonly list or empty snapshot',
            elapsedSince(this.restoreStartedAt, Date.now()));
          return;
        }
        this.restoreSettled = true;
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
      // 第十轮 ff1：快照读不出 / 整批恢复失败是明确的「问题信号」—— 不再降级到
      // 单张兜底再等 3 秒看门狗，立即停止尝试并打开选择文件夹。
      hilog.warn(DOMAIN, TAG, 'resume: snapshot empty/unreadable → give up now (ff1)');
      if (failFastAction(true, this.hasRestoreMemory, this.userActed,
          this.restoreSettled || this.giveUpDone) === FF_GIVEUP) {
        this.giveUpNow('snapshot unreadable', elapsedSince(this.restoreStartedAt, Date.now()));
        return;
      }
    }
    // 最轻兜底：只显示上次那一张。列表只有 1 张也没关系，画面不会空白。
    // 第十轮 ff1：启动恢复期 warmLast 被按住（零文件 IO），首图由 applyItems 的
    // showPreviewOf 解码；act 走到这里只可能是 RESUME_SINGLE，或问题信号未触发
    // 立即放弃后的降级路径。
    if ((act === RESUME_SINGLE || act === RESUME_SNAPSHOT) && single.length > 0) {
      const src: string = saved !== undefined && saved.src.length > 0 ? saved.src : '上次会话';
      // 单张兜底同样先探授权：只有 1 张，探一次即可，不让 Image(uri) 兜底反复重试死 uri。
      const readable: boolean = this.probeRestoreUris([single], this.okUri, savedUri, true);
      this.pendingRestoreReadonly = !readable;
      this.pendingRestoreCount = 1;
      this.pendingRestoreSrc = src;
      const metaStore: preferences.Preferences | undefined = await this.posStore();
      const oneMeta: ArchiveMeta = metaStore !== undefined
        ? await this.readMetaForUri(metaStore, single) : { size: -1, mtime: 0 };
      if (this.restoreCancelled) {
        return; // 看门狗已收口：单张兜底也不许再建列表 / 启动预载
      }
      this.setItems([single], src, [oneMeta]);
      // 回填目录层级：单张兜底同样要让「往上层」能用，不能只给名单就锁死层级。
      this.restoreBrowseContext();
      // 第四十五轮：单张兜底落只读态时同样后台预热 + 自愈（同快照恢复路径）。
      if (!bulkIoAllowed(this.restoreMode)) {
        this.warmRestoreDirQuiet(this.browseBase).catch(() => {
        });
        // 第七十七轮：本地目录也排一次延迟自愈（warm 只对网络目录生效）。
        this.scheduleRestoreHeal();
        // 第七十九轮：本地目录再用持久授权目录做一次重列举兜底。
        this.scheduleReadonlyRelist();
      }
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
      // 单张兜底只是临时画面，没有进入上次的目录 —— 第十轮 ff1 改为立即放弃：
      // 不再等 3 秒看门狗，直接打开选择文件夹，用户可重新打开整批图片。
      hilog.info(DOMAIN, TAG, 'resume: single shown, snapshot preserved, ro=%{public}d',
        this.restoreHintText.length > 0 ? 1 : 0);
      if (failFastAction(true, this.hasRestoreMemory, this.userActed,
          this.restoreSettled || this.giveUpDone) === FF_GIVEUP) {
        this.giveUpNow('single fallback only',
          elapsedSince(this.restoreStartedAt, Date.now()));
      }
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
      // 第十轮 ff1：启动恢复期绝不碰文件。这里原本在 300ms 就 decodePx →
      // rawStore.ensure（当时是 statSync / openSync / readSync），死 NAS 路径一次
      // 能挂 20 秒，把 900ms 恢复定时器和 3 秒看门狗一起饿死。第二十七轮读链路
      // 已真异步、不再饿死定时器，但「恢复期零 IO」这条防线继续保留。
      // 恢复链判定完再决定是否出图。
      if (this.giveUpDone || this.restoreCancelled ||
          restoreIoHeld(this.restoreEntered, this.userActed, this.hasRestoreMemory)) {
        hilog.info(DOMAIN, TAG, 'warm held: restore decides first, zero file IO (ff1)');
        return;
      }
      const t0: number = Date.now();
      // allowReuse=false：warm 必须自有一张 PixelMap（aboutToDisappear 会 release），
      // 绝不能拿缓存里那张共用，否则换源 / 退出时会把缓存的图释放掉。
      this.decodeTo(uri, this.preloadEdge(), false)
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
      // 第三十六轮：没有「图片位置」不等于没有「目录位置」。
      // applyItems 在零图片时把 cur 置 -1；旧实现直接 return，既不生成 LastPos
      // 也不排写盘，空目录那次 openFolder 设好的 browseBase 从不落盘 ——
      // 退出重开就回默认目录。这里仍排一次防抖，由 flushPos 走独立落盘。
      if (dirContextSaveWanted(this.browseBase, this.items.length, false)) {
        this.scheduleFlush();
      }
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
      // 第三十六轮：空 / 无图片目录没有 LastPos，但目录上下文必须独立落盘。
      if (dirContextSaveWanted(this.browseBase, this.items.length, false)) {
        await this.flushDirContext();
      }
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
      // 第三十一轮：核心「位置 / 相片 / 授权根 / 列表快照」先独立 flush 落盘，
      // 绝不和两个增强 key 共用一次 flush。R30 把增强 key 的 put 排在
      // flushSnap / flush 之前且共用同一个 try：含 XML 非法控制字符的 value
      // 一旦让 put/flush 抛异常，核心状态全部没落盘 —— 退出重开就不恢复图片。
      await store.flush(); // 不 flush 只写到内存，进程被杀会丢
      // 增强 key 单独写 + 单独 flush，独立 try：失败只降级这两项（等价 R29），
      // 绝不回卷已落盘的核心数据，也不会跳到外层 catch 触发异步兜底。
      // encodeUpCacheForSave 已把控制字符编码掉，这一步正常情况下不会再抛。
      try {
        await store.put(POS_KEY_BROWSE, this.browseBase);
        // 第三十六轮：目录态标记与位置同批落盘；有图片时写 '' 清掉旧目录态。
        await store.put(POS_KEY_DIRCTX, dirContextFlagOf(this.browseBase, this.items.length));
        if (this.upCacheDirty) {
          await store.put(POS_KEY_UPCACHE, this.encodeUpCacheForSave());
          this.upCacheDirty = false;
        }
        await store.flush();
      } catch (extras) {
        hilog.warn(DOMAIN, TAG, 'save browse extras failed (ignored): %{public}s', JSON.stringify(extras));
      }
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
      // 第三十六轮：没有图片位置 ≠ 没有目录位置，独立同步落盘后照常返回。
      this.flushDirContextSync(store);
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
      // 第三十一轮：核心状态先同步 flush 落盘（进程被杀也必达），再单独写增强 key。
      // R30 把两个增强 key 的 putSync 排在 flushSync 之前且共用同一个 try：
      // 含控制字符的坏 value 抛异常时 flushSync 根本没执行，核心位置全丢，
      // catch 里的 flushPos() 异步兜底又来不及 —— 这正是「退出重开不恢复图片」。
      store.flushSync();
      this.posPending = undefined;
      // 增强 key 单独写 + 单独 flushSync，独立 try：失败只降级这两项，
      // 绝不回卷已落盘的核心数据、绝不触发外层 catch 的异步兜底。
      try {
        store.putSync(POS_KEY_BROWSE, this.browseBase);
        // 第三十六轮：目录态标记与位置同批同步落盘；有图片时写 '' 清掉旧目录态。
        store.putSync(POS_KEY_DIRCTX, dirContextFlagOf(this.browseBase, this.items.length));
        if (this.upCacheDirty) {
          store.putSync(POS_KEY_UPCACHE, this.encodeUpCacheForSave());
          this.upCacheDirty = false;
        }
        store.flushSync();
      } catch (extras) {
        hilog.warn(DOMAIN, TAG, 'save browse extras sync failed (ignored): %{public}s', JSON.stringify(extras));
      }
      hilog.info(DOMAIN, TAG, 'flushPosSync: idx=%{public}d uri=%{public}s',
        p.idx, p.uri.length > 0 ? 'yes' : 'no');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'flushPosSync failed: %{public}s', JSON.stringify(e));
      this.flushPos();
    }
  }

  /** 第三十六轮：目录上下文独立异步落盘 —— 完全不依赖 LastPos / posPending。
   *  空目录、无图片目录、只有子文件夹的目录都会走这里（markPos 排的防抖）。
   *  只写 4 个小 key + 可选清单快照，绝不写大图片快照、绝不碰解码。 */
  private async flushDirContext(): Promise<void> {
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store === undefined) {
        return;
      }
      await store.put(POS_KEY_DIR, this.savedDirUri);
      await store.put(POS_KEY_BROWSE, this.browseBase);
      await store.put(POS_KEY_DIRCTX, dirContextFlagOf(this.browseBase, this.items.length));
      if (this.upCacheDirty) {
        await store.put(POS_KEY_UPCACHE, this.encodeUpCacheForSave());
        this.upCacheDirty = false;
      }
      await store.flush();
      hilog.info(DOMAIN, TAG, 'flushDirContext: base=%{public}s items=%{public}d',
        this.browseBase.length > 0 ? 'yes' : 'no', this.items.length);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'save dir context failed (ignored): %{public}s', JSON.stringify(e));
    }
  }

  /** 第三十六轮：切后台 / ESC 退出时的同步版目录上下文落盘（毫秒级必达）。
   *  prefs 还没建好就退回异步尽力而为；非目录态直接让路，零回归。 */
  private flushDirContextSync(store: preferences.Preferences | undefined): void {
    if (!dirContextSaveWanted(this.browseBase, this.items.length, false)) {
      return;
    }
    if (store === undefined) {
      this.flushDirContext();
      return;
    }
    try {
      store.putSync(POS_KEY_DIR, this.savedDirUri);
      store.putSync(POS_KEY_BROWSE, this.browseBase);
      store.putSync(POS_KEY_DIRCTX, DIRCTX_EMPTY);
      if (this.upCacheDirty) {
        store.putSync(POS_KEY_UPCACHE, this.encodeUpCacheForSave());
        this.upCacheDirty = false;
      }
      store.flushSync();
      hilog.info(DOMAIN, TAG, 'flushDirContextSync: dir only saved');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'save dir context sync failed (ignored): %{public}s',
        JSON.stringify(e));
    }
  }

  /** 把当前图片列表分块写进 preferences（换行分隔，不用 JSON） */
  private async flushSnap(store: preferences.Preferences): Promise<void> {
    const cap: number = Math.min(this.items.length, SNAP_MAX);
    const chunks: number = Math.ceil(cap / SNAP_CHUNK);
    // 第七十七轮：先把上一份快照的「uri → 有效元数据」读回来。只读名单态下
    // fillSizes() 被 IO 闸门挡住，items[i].size 仍是 -1 / mtime 仍是 0；
    // 以前会原样写回 -1,0 **覆盖掉上次的有效值**，重启后 size / 日期永远显示 '--'，
    // 且 snapDirty 自我强化，之后每一轮重启都读不回来（用户反馈「重开后资料丢失」）。
    // 现在按 uri 合并（换源 / 重排也不会张冠李戴）：新值有效用新值，未知则保留旧值。
    const oldUris: Array<string> = await this.readSnapUris(store);
    const oldMetas: Array<ArchiveMeta> = metasPaddedOf(oldUris.length,
      await this.readSnapMeta(store, oldUris.length));
    const oldByUri: Map<string, ArchiveMeta> = new Map();
    for (let k = 0; k < oldUris.length; k++) {
      oldByUri.set(oldUris[k], oldMetas[k]);
    }
    for (let c: number = 0; c < chunks; c++) {
      const start: number = c * SNAP_CHUNK;
      const end: number = Math.min((c + 1) * SNAP_CHUNK, cap);
      const part: Array<string> = [];
      // 2026-11-12：与 uri 行一一对应的「体积,修改时间」，重开后日期列不丢。
      // 单独一个 meta 块，不动既有 snap_N 的格式（老存档照样读得出来）。
      const metaPart: Array<ArchiveMeta> = [];
      for (let i: number = start; i < end; i++) {
        const it: ImageItem = this.items[i];
        part.push(it.uri);
        const prev: ArchiveMeta | undefined = oldByUri.get(it.uri);
        metaPart.push(metaMergeOf(prev !== undefined ? prev.size : -1,
          prev !== undefined ? prev.mtime : 0, it.size, it.mtime ?? 0));
      }
      await store.put(SNAP_KEY_PREFIX + c, part.join('\n'));
      // 每块 meta 行数与 uri 行数严格相等（缺块补未知，绝不让后续块前移错位）。
      await store.put(META_KEY_PREFIX + c, encodeMeta(metaChunkPaddedOf(end - start, metaPart)));
    }
    // 这次比上次块数少 → 清掉多出来的旧块，否则下次恢复会读到上一批的尾巴
    for (let c: number = chunks; c < this.snapChunks; c++) {
      await store.delete(SNAP_KEY_PREFIX + c);
      await store.delete(META_KEY_PREFIX + c);
    }
    if (this.snapChunks === 0) {
      // 首次写：老版本 SNAP_MAX=3000 / SNAP_CHUNK=200 最多落过 15 块，文件里可能还留着
      // 十几块没人读的旧数据。既然已经不读它们了，趁这次写盘一并清掉。
      for (let c: number = chunks; c < OLD_SNAP_CHUNKS; c++) {
        try {
          await store.delete(SNAP_KEY_PREFIX + c);
          await store.delete(META_KEY_PREFIX + c);
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

  /** 读出与 uri 快照块一一对应的「体积 / 修改时间」。
   *  旧存档没有这个 key → 返回空数组，setItems 会退回未知值，恢复链照常工作。
   *  ⚠️ 只读名单态下也允许读：这是 preferences 的小 key，不是逐 URI 的磁盘 IO，
   *     不会触发 ro1 的「几百次同步跨进程调用」问题。 */
  private async readSnapMeta(store: preferences.Preferences,
    uriCount: number): Promise<Array<ArchiveMeta>> {
    const cap: number = Math.min(uriCount, SNAP_MAX);
    const chunks: number = Math.ceil(cap / SNAP_CHUNK);
    const out: Array<ArchiveMeta> = [];
    for (let c: number = 0; c < chunks; c++) {
      // 第七十七轮：按块严格补齐到「本块 uri 行数」。旧存档缺 meta key / 某块
      // 写盘失败时，以前直接跳过该块，后续块前移 ⇒ uri 与 size/日期张冠李戴，
      // 尾部条目资料全丢。现在缺块按整块补未知，位置关系逐字不变。
      const want: number = Math.min(SNAP_CHUNK, cap - c * SNAP_CHUNK);
      if (want <= 0) {
        break;
      }
      const raw = await store.get(META_KEY_PREFIX + c, '');
      const part: Array<ArchiveMeta> = decodeMeta(typeof raw === 'string' ? raw : '');
      const padded: Array<ArchiveMeta> = metaChunkPaddedOf(want, part);
      for (let i: number = 0; i < padded.length; i++) {
        out.push(padded[i]);
      }
    }
    return metasPaddedOf(cap, out);
  }

  /** 单张兜底也能拿到日期：只读第 0 块（最轻），按 uri 找对应元数据。 */
  private async readMetaForUri(store: preferences.Preferences,
    uri: string): Promise<ArchiveMeta> {
    try {
      const rawUris = await store.get(SNAP_KEY_PREFIX + 0, '');
      const rawMeta = await store.get(META_KEY_PREFIX + 0, '');
      const uris: Array<string> = (typeof rawUris === 'string' && rawUris.length > 0)
        ? rawUris.split('\n') : [];
      const metas: Array<ArchiveMeta> = decodeMeta(typeof rawMeta === 'string' ? rawMeta : '');
      return metaForUri(uris, metas, uri);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'snapshot: read meta for single failed');
      return { size: -1, mtime: 0 };
    }
  }

  /** 用上次会话的 uri 快照重建列表（顺序与上次一致，随后 restoreIndex 会精确落到上次那张）。
   *  返回 false 表示没有可用快照。不要求当前列表为空 —— 「回到上次」也复用它。 */
  private async restoreFromSnapshot(startupGuard: boolean = false): Promise<boolean> {
    // startupGuard 只由启动恢复链传入：看门狗超时作废后，每个 await 回来都要立刻停手，
    // 绝不能继续 probe / setItems / 启动预载去抢用户正在开的「选择文件夹」。
    // 「回到上次」等用户主动路径不传，行为完全不变。
    // 逐点内联判断而不用局部闭包：ArkTS 对方法内 lambda 捕获 this 的支持各版本不一。
    try {
      const store: preferences.Preferences | undefined = await this.posStore();
      if (store === undefined || (startupGuard && this.restoreCancelled)) {
        return false;
      }
      const uris: Array<string> = await this.readSnapUris(store);
      if (startupGuard && this.restoreCancelled) {
        return false;
      }
      // 2026-11-12：连同体积 / 日期一起还原（只读几个小 key，不新增 IO 闸门外的磁盘访问）。
      const metas: Array<ArchiveMeta> = await this.readSnapMeta(store, uris.length);
      if (startupGuard && this.restoreCancelled) {
        return false;
      }
      hilog.info(DOMAIN, TAG, 'snapshot: %{public}d uris / %{public}d meta', uris.length, metas.length);
      if (uris.length === 0) {
        return false;
      }
      const p: LastPos | undefined = this.lastPos;
      const src: string = (p !== undefined && p.src.length > 0) ? p.src : '系统图库';
      // ⚠️ 恢复前只探最多 3 张：重启后逐 URI 授权通常整体失效。
      //    证实可读才走完整恢复（预载 / 补体积 / 解码照常）；证伪则落只读名单态，
      //    绝不把几百次同步跨进程 IO 打到主线程上（那正是「名单在、界面全卡住」的根因）。
      if (startupGuard && this.restoreCancelled) {
        return false;
      }
      const readable: boolean = this.probeRestoreUris(uris, this.okUri,
        p !== undefined ? p.uri : '', startupGuard);
      if (startupGuard && this.restoreCancelled) {
        return false;
      }
      this.pendingRestoreReadonly = !readable;
      this.pendingRestoreCount = uris.length;
      this.pendingRestoreSrc = src;
      this.setItems(uris, src, metas); // 内部 applyItems → applyPendingRestore → restoreIndex
      // setItems 清空了 browseBase / browseDir / pickRootUri —— 这里把持久授权的
      // 原始目录 URI 还原回来，否则重开后「往上层」永远停在「没有上层目录」。
      this.restoreBrowseContext();
      // 第四十五轮：快照恢复若落只读态（NAS 冷启动时启动探测误判授权失效），
      // 同样后台预热 + 自愈 —— 否则整个会话「名单在、图片白」，翻页只剩档案名。
      if (!bulkIoAllowed(this.restoreMode)) {
        this.warmRestoreDirQuiet(this.browseBase).catch(() => {
        });
        // 第七十七轮：本地目录也排一次延迟自愈（warm 只对网络目录生效）。
        this.scheduleRestoreHeal();
        // 第七十九轮：本地目录再用持久授权目录做一次重列举兜底
        // （启动探测只探 okUri 一张，那张被移走就会误判整批失效）。
        this.scheduleReadonlyRelist();
      }
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
  private loadRightPage(uri: string, attempt: number = 0): void {
    this.rightToken++;
    const token: number = this.rightToken;
    this.releaseRightOwned();   // 上一张右页若是自解码的，先释放
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    const srcLong: number = hit !== undefined ? Math.max(hit.w, hit.h) : 0;
    const need: number = this.displayEdge(srcLong);
    const reuseNeed: number = this.reuseEdge(srcLong);
    // 第七轮：命中已解码数据且档位够当前显示 → 直接复用，不再为 oversampling 重解一次。
    if (hit !== undefined && shouldReuseDecoded(hit.edge, reuseNeed)) {
      this.rightOwned = undefined;
      this.rightPixelMap = hit.px;
      // 第八十六轮：并排适配需要右页原始宽高（缓存条目里就是原图像素尺寸）。
      this.rightImgW = hit.w;
      this.rightImgH = hit.h;
      return;
    }
    this.decodeTo(uri, need)
      .then((e: PreviewEntry | undefined) => {
        if (token !== this.rightToken) {
          // 第四十八轮：翻页 / 换对把在途解码作废 —— 留痕，用于分辨「解码失败」
          // 与「解码成功但被 token 竞态丢弃」这两种完全不同的右页空白成因。
          hilog.info(DOMAIN, TAG, 'loadRightPage: stale discard (page turned) uri=%{public}s', uri);
          this.releaseUncachedEntry(e);
          return;
        }
        if (e === undefined) {
          // 第四十七轮：右页解码失败不再「留空了事」。大 JPG 首开时这次失败多半是
          // 与预载链并发争内存的一次性抖动 —— 按 RIGHT_PAGE_RETRY_DELAYS 节奏补试，
          // 第一次重试往往已能命中预载链刚写进缓存的同图（复用路径，零解码）。
          // token 校验保证翻页 / 换对后旧重试自动作废；坏文件试完即止，不无限重试。
          hilog.warn(DOMAIN, TAG, 'loadRightPage: decode FAIL attempt=%{public}d/%{public}d uri=%{public}s',
            attempt, RIGHT_PAGE_RETRY_DELAYS.length, uri);
          if (attempt < RIGHT_PAGE_RETRY_DELAYS.length) {
            const delay: number = RIGHT_PAGE_RETRY_DELAYS[attempt];
            if (this.rightRetryTimer !== -1) {
              clearTimeout(this.rightRetryTimer);
            }
            hilog.info(DOMAIN, TAG, 'loadRightPage: retry in %{public}dms uri=%{public}s', delay, uri);
            this.rightRetryTimer = setTimeout(() => {
              this.rightRetryTimer = -1;
              if (token === this.rightToken) {
                this.loadRightPage(uri, attempt + 1);
              }
            }, delay);
          } else {
            hilog.warn(DOMAIN, TAG, 'loadRightPage: give up after %{public}d attempts uri=%{public}s',
              attempt + 1, uri);
          }
          return;
        }
        // 交给缓存持有（不再自持有，避免与缓存淘汰双重 release）
        this.rightOwned = undefined;
        this.rightPixelMap = undefined;  // 先撤旧引用，让 upgradePreview 安全 release
        const best: PreviewEntry = this.upgradePreview(e);
        this.rightPixelMap = best.px;
        // 第八十六轮：右页原始宽高随解码结果更新，并排适配据此重算（派生值自动生效）。
        this.rightImgW = best.w;
        this.rightImgH = best.h;
        if (attempt > 0) {
          hilog.info(DOMAIN, TAG, 'loadRightPage: decoded ok on retry %{public}d uri=%{public}s', attempt, uri);
        }
      })
      .catch(() => {
        // 右页解不开就留空，左页照常显示（不把整屏拖成失败态）
        hilog.warn(DOMAIN, TAG, 'loadRightPage: decode threw (exception) uri=%{public}s', uri);
      });
  }

  /** 单页 / 换源时收掉右页（不动左页） */
  private clearRightPage(): void {
    this.rightToken++;
    if (this.rightRetryTimer !== -1) {
      clearTimeout(this.rightRetryTimer);   // 第四十七轮：待重试的右页一并作废
      this.rightRetryTimer = -1;
    }
    this.releaseRightOwned();
    this.rightPixelMap = undefined;
    // 第八十六轮：右页尺寸一并收掉 —— 留着上一对的宽高会把并排布局算成上一对的形状。
    this.rightImgW = 0;
    this.rightImgH = 0;
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

  // 第五十五轮：spreadNames()（对开「左名 · 右名」拼接）随左上角信息浮层一并移除。

  /** 第八十三轮起暂无调用点：标题栏已改为「目录名 + 父路径」，不再用当前图片名兜底。
   *  保留实现（不删 `curItem()` 依赖）供后续诊断 / 降级复用，不是遗留笔误。 */
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

  /** 预览图可用宽度（对开时每页占一半）。
   *
   *  ⚠️ 2026-11-12 第五轮：这个值**必须**在 @Builder 内部读取，不能当参数传进去。
   *     ArkUI 的 @Builder 对普通参数按值传递，参数变化不会触发 builder 内部 UI 刷新；
   *     原来 `previewImage(uri, token, this.frameW())` 的第三个参数是数值快照，
   *     于是 canvasW 变了、宽度却还停在旧值 —— 拖窗口时「预览图大小不变」。
   *     改成在 builder 内直接 `this.viewBoxW(half)`，依赖就挂在 @State canvasW 上了。 */
  private viewBoxW(half: boolean): number {
    return this.frameW() * (half ? 0.5 : 1);
  }

  // ------------------------------------------------------------------
  // 第八十六轮：并排（对开）等比适配
  // ------------------------------------------------------------------

  /** 并排等比适配结果 —— **派生值，刻意不用 @State 缓存**。
   *
   *  每次读取都按当前 `frameW/H`（= canvasW/H + rot）、`imgW/H`、`rightImgW/H` 现算，
   *  所以①窗口缩放 ②面板分隔条拖动 ③换图 / 翻页 ④旋转 ⑤进出全屏
   *  全都会在下一次 build 中自动生效，**不需要任何「重算触发点」**，也就不可能出现
   *  「缓存值没跟上真实布局」这类漂移（第八十五轮把布局尺寸改成 @State 镜像后翻车的教训）。
   *
   *  规则见 `common/SpreadFit.ts`：统一高度 + 各自原始比例 + 中间零间隙 + 整组居中。 */
  private spreadFit(): SpreadFit {
    return spreadFitOf(this.frameW(), this.frameH(),
      spreadAspectOf(this.imgW, this.imgH, this.rot),
      spreadAspectOf(this.rightImgW, this.rightImgH, this.rot));
  }

  /** 该页渲染框宽。并排时左右可能不同（各自原始比例），单页时就是整幅画布宽。
   *  ⚠️ 渲染框一旦改动，**坐标基准必须同步改**：放大镜（loupeContentW / loupeOffX）
   *  与 fitFactor 已全部改用本组方法，禁止再拿 `viewBoxW(half)` 当坐标基准。 */
  private pageBoxW(pane: number, half: boolean): number {
    if (!half) {
      return this.viewBoxW(false);
    }
    return pane === LOUPE_PANE_RIGHT ? this.spreadFit().wR : this.spreadFit().wL;
  }

  private pageWLeft(half: boolean): number {
    return this.pageBoxW(LOUPE_PANE_LEFT, half);
  }

  private pageWRight(half: boolean): number {
    return this.pageBoxW(LOUPE_PANE_RIGHT, half);
  }

  /** 两页统一渲染框高（并排时为适配高度 h；单页时仍是整幅画布高） */
  private pageH(half: boolean): number {
    return half ? this.spreadFit().h : this.frameH();
  }

  /** objectFit=Contain 时图片相对**该页真实渲染框**的缩放比。
   *  第八十六轮：并排时渲染框不再是「半幅画布」，必须用 pageWLeft / pageH，
   *  否则「1:1」与缩放百分比都会按错误的框算（图明明铺满却显示 87%）。 */
  private fitFactor(): number {
    if (this.imgW <= 0 || this.imgH <= 0) {
      return 0;
    }
    const boxW: number = this.pageWLeft(this.spreadShown());
    const boxH: number = this.pageH(this.spreadShown());
    return Math.min(boxW / this.imgW, boxH / this.imgH);
  }

  /** 当前是否处于并排（对开）渲染：左页 builder 的 `half` 与它同义。
   *
   *  第九十八轮：**播放期间不再用 `playing` 去改视图形态**，而是用进入那一刻的快照
   *  `slideSpreadHold`（原因见字段注释）：
   *   · 进入前是并排 → 播放中一路并排（下一张是横图也不塌成单张）；
   *   · 进入前是单张（含 AUTO 下的横图）→ 播放中一路单张；
   *   · 不在播放 → 完全按 `previewMode` / 自动判据走，与本轮之前一模一样。
   *  R96 的「按播放态强推单张」正是「从其它状态进入就自动跳成单片」的病根，已删除。 */
  private spreadShown(): boolean {
    if (this.playing) {
      return this.slideSpreadHold && this.spreadB >= 0 && this.spreadB < this.items.length;
    }
    return this.spreadB >= 0 && this.spreadB < this.items.length;
  }

  /** 用 fileIo 取体积；图库 URI 不一定可读，失败返回 -1 */
  /** 第七十七轮：adaptive column width 的唯一收口点。
   *  三列宽 / 左栏展开宽 / 收起宽全部由「内容长度（最长档案名 / 大小文案 / 日期格式）
   *  + 容器尺寸（lastRootW）」实时推出，源码里不再有任何预设 / 固定宽度限制。
   *  换源 / 恢复 / 往上层 / 窗口 resize 都走这里，所有行共用同一套动态值 ⇒ 三栏仍对齐。
   *  第七十八轮：收起宽改由 acCollapsedContentOf(names) 按「最长名称 + 三个图标按钮」
   *  推导，容器比例只作上限保护，不再按 rootW 比例留下空白。 */
  private refreshAdaptiveLayout(rowNames: Array<string>): void {
    const sizeTexts: Array<string> = [];
    for (let i = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      const kind: number = r.kind ?? ROW_IMAGE;
      const isFolder: boolean = kind === ROW_FOLDER || kind === ROW_UP;
      const label: string = i < this.dirCountLabels.length ? this.dirCountLabels[i] : '';
      sizeTexts.push(isFolder ? (label.length > 0 ? label : '…') : fmtBytes(r.size));
    }
    const a: AcLayout = acLayoutOf(this.lastRootW, rowNames, sizeTexts);
    // 第一百零八轮：自适应宽是**默认值**；用户拖过就用他设定的宽（按当前窗口夹取）。
    // 两者都从 SidebarSplit 走同一套钳制，保证「拖动 / 重启恢复 / 窗口缩放」三个入口一致。
    const autoW: number = acWidthSafeOf(a.sidebarW, a.collapsedW);
    this.listW = splitSidebarWOf(this.sidebarUserW, autoW, this.lastRootW);
    // 第一百一十轮：收起态也支持拖动 → 收起宽同样先看「用户拖出来的值」。
    const autoCollapsedW: number = acWidthSafeOf(a.collapsedW, a.sidebarW);
    this.collapsedW = splitSidebarWOf(this.sidebarCollapsedUserW, autoCollapsedW, this.lastRootW);
    this.colSizeW = acWidthSafeOf(a.sizeW, a.dateW);
    this.colDateW = acWidthSafeOf(a.dateW, a.sizeW);
    // 第一百一十轮：名称严格单行（不再换行）。宽度放不下「名称 + 大小 + 日期」时，
    // 先自动隐藏大小 / 日期两列，把宽度全让给名称；名称仍超宽才截断。
    // 判据用**内容口径**的未夹取总宽（acNeedWOf）—— 拿 a.sidebarW 比会因窗口 cap 永远比不出差异。
    const needW: number = acNeedWOf(rowNames, sizeTexts);
    this.autoNeedW = needW;
    this.hideMeta = splitHideMetaOf(this.listW, needW);
  }

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
   *  对齐 Win64：过滤 . 开头的隐藏文件，并按自然序排序（IMG_2 排在 IMG_10 前）。
   *
   *  2026-11-12：可选 meta 是「上次会话快照里与 uri 一一对应的体积 / 修改时间」。
   *  快照恢复 / 单张兜底把它传进来，左栏的字节与日期列才能和退出前完全一致；
   *  不传则维持原来的行为（体积后台补、日期按既有口径显示），交互不变。 */
  private setItems(uris: Array<string>, src: string, meta?: Array<ArchiveMeta>): void {
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
    // 第七十七轮：把 meta 规整到与 uris 等长，setItems 里 meta[i] 永不越界 →
    // 重启后每一条档案的 size / 日期都能从快照完整恢复，不会只恢复前几条。
    const aligned: Array<ArchiveMeta> = meta !== undefined ? metasPaddedOf(uris.length, meta) : [];
    const list: ImageItem[] = [];
    for (let i = 0; i < uris.length; i++) {
      const u: string = uris[i];
      const raw: string = baseName(u);
      if (HIDE_DOT_FILES && raw.length > 0 && raw.charAt(0) === '.') {
        continue;
      }
      // 2026-11-12：快照恢复时把上次的体积 / 修改时间一起还原，
      // 否则 mtime 为 0 → 左栏日期列只有 '--'（用户反馈「重开后日期丢失」）。
      // 只读名单态下 fillSizes() 被 IO 闸门挡住，日期只能靠这里持久化恢复。
      const m: ArchiveMeta | undefined =
        meta !== undefined ? aligned[i] : undefined;
      const item: ImageItem = {
        uri: u, name: this.nameOf(u, i),
        size: m !== undefined ? m.size : -1,
        mtime: m !== undefined ? m.mtime : 0,
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
    // 第五十九轮：换源 / 进子目录 / 恢复（keepView=false）必须清掉「往上层」反色标记，
    // 否则上一层的名字会错误地染到新清单里同名的行；自动重扫 / 保位刷新（keepView=true）
    // 保留标记，避免 1.5s 轮询把刚显示出来的反色抹掉。browseUp 落地后会在本函数之外重设。
    this.upReturnName = upReturnClearOf(this.upReturnName, keepView);
    // ⚠️ 必须**先**落地恢复模式：下面 showPreviewOf / fillSizes / schedulePreload /
    //    refreshSpread 全都要读它。只读名单态时它们会被闸门挡住，主线程保持空闲。
    this.applyPendingRestore(list.length, src);
    const ioOk: boolean = bulkIoAllowed(this.restoreMode);
    const prevUri: string = (keepView && this.cur >= 0 && this.cur < this.items.length)
      ? this.items[this.cur].uri : '';
    // 第十二轮：items 即将被替换，先作废全量预载链的旧批次（含 keepView 自动重扫路径）。
    // allOrder 是建链时按旧 items 长度生成的绝对下标；onAllDecoded 排的下一批回调
    // 还在事件队列里，等它回来再判就晚了 —— 旧下标读新数组会拿到 undefined，
    // 取 .uri 直接抛 TypeError 崩掉 APP（2026-11-13 20:00:17 切换 NAS 目录时复现）。
    // 只动作废代号与顺序，不 release 任何 PixelMap：目录重扫要继续复用已解码缓存。
    this.resetAllPreloadChain();
    this.items = list;
    // 第三十七轮：换源（选文件夹 / 快照恢复 / 往上层 / 进子目录）必须收掉文本预览，
    // 否则右栏会一直挂着上一个目录里的文件；自动重扫 keepView 保持不动。
    if (!keepView) {
      this.closeTextMode();
    }
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
    this.refreshAdaptiveLayout(rowNames);
    this.dataSource.reload(this.rows);
    // 第六十四轮：清单落地后把目录行接进统计链。keepView=自动重扫且条目已变，
    // 说明本层内容真的动过 → 整层缓存失效；普通换源按 uri 保留命中缓存，
    // 新目录行先显示「…」，等空闲心跳补扫，展示始终与真实内容对账。
    this.syncDirCountTargets();
    if (keepView) {
      this.invalidateDirCounts();
    } else {
      this.rebuildDirCountLabels();
    }
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
    // 第十三轮：换源后旧可见范围作废，等新 List 的 onScrollIndex 重新上报；
    // 拿旧范围判点选边界会误滚（firstRow < 0 时退化为只认绝对首 / 末档案，保守不滚）。
    this.listFirstRow = -1;
    this.listLastRow = -1;
    if (!keepView) {
      this.clearPreviews();
      this.failed.clear();   // 换了图片源，上一批的「解不开」黑名单作废
      // 第六十轮：换源 / 恢复后挂起一次「高亮项完整可见」定位请求。此时可见范围已作废，
      // guard 返回 HV_NONE 并保留挂起，等新 List 的首个 onScrollIndex 上报再消费；
      // 自动重扫（keepView）走不到这里 —— 保持用户当前视图、不产生任何位移。
      this.armHighlightReveal('applyItems');
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
      // 第七十七轮：只读名单态不再清空主视图（用户反馈「重启后预览图丢失」）。
      // 只放行「当前这一张」的异步解码，让重进 / 重启后立刻能看到图；
      // 批量预载 / statSync 补体积 / 对开探测继续全部挡在闸门外，
      // 历史 appfreeze 防线逐字不变（单张 decodePx 是真异步 open + catch，失败即止）。
      this.spreadB = -1;
      this.clearRightPage();
      this.cacheCount = 0;
      this.cacheBytes = this.preloadBytes;
      this.showPreviewOf(this.cur);
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

  /** 第九十二轮：读当前窗口装饰（标题栏 / 边框）是否可见。
   *  取不到窗口 / 接口抛错时保守返回 true（与系统默认一致），绝不因此中断流程。 */
  private decorVisibleOf(): boolean {
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (!win) {
      return true;
    }
    try {
      return win.getWindowDecorVisible();
    } catch (e) {
      return true;
    }
  }

  /** 第九十二轮：退出后把「装饰可见性」再钉一次（只在进入前是无装饰时才干预）。
   *
   *  `maximize(EXIT_IMMERSIVE)` 由窗口管理器**异步**落地：它可能在我们的
   *  `setWindowDecorVisible(pre)` 之后又把标题栏加回来，于是内容区又被吃掉 37vp。
   *  所以在 260ms 落定与 1500ms 稳态各补一次「若被加回来就再关掉」，保证与进入前一致。 */
  private reassertDecor(): void {
    if (this.preFullDecorVisible) {
      return; // 进入前就有装饰：不需要干预，避免和系统状态打架
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (!win) {
      return;
    }
    try {
      if (win.getWindowDecorVisible()) {
        win.setWindowDecorVisible(false);
        hilog.info(DOMAIN, TAG, 'fullscreen: decor re-asserted hidden');
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'fullscreen: decor re-assert failed');
    }
  }

  /** 第九十轮：把视图数值拼成**字符串**再交给 hilog。
   *
   *  ⚠️ 本机 hilog 不支持 `%{public}f`：R88/R89 那两行实测被打成
   *  「canvas=}fx}f zoom=}f tx=}f ty=}f」—— 数值全丢，诊断等于没有。
   *  统一改成「先拼字符串 + `%{public}s`」，浮点收敛到 3 位小数，并顺带带上
   *  canvas / img / fit / p / pre，一条日志就能判定「是倍率还是画布」。 */
  private viewDiagOf(): string {
    const r3 = (v: number): string => (Math.round(v * 1000) / 1000).toString();
    return 'zoom=' + r3(this.zoom) +
      ' tx=' + Math.round(this.tx) + ' ty=' + Math.round(this.ty) +
      ' canvas=' + Math.round(this.canvasW) + 'x' + Math.round(this.canvasH) +
      ' img=' + Math.round(this.imgW) + 'x' + Math.round(this.imgH) +
      ' fit=' + r3(this.fitFactor()) +
      ' p=' + this.zoomPercentText() +
      ' pre=' + (this.preFullViewValid ? r3(this.preFullZoom) : 'none') +
      ' spread=' + (this.spreadShown() ? 'T' : 'F') +
      ' decor=' + (this.decorVisibleOf() ? 'T' : 'F') +
      ' preDecor=' + (this.preFullDecorVisible ? 'T' : 'F') +
      // 第九十九轮：超分是否已上屏 + 产物长边（一眼看出「这张有没有吃到超分」）
      ' sr=' + (this.viewSrPx !== undefined ? 'T' : 'F') + '/' + this.viewSrEdge;
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

  /** 鼠标按键（第七轮：取消左键放大；第七十六轮：右键不再触发放大镜，改由左键切换）：
   *  · 左键单击（仅预览区相片上）= toggle 放大镜总开关：首次开、再点还原、可无限重复；
   *  · 右键 Press（仅预览区相片上）= 触发 picture contact menu，绝不翻转放大镜；
   *  · 双击 = 切换全屏，由 TapGesture(count: 2) 收口，视图缩放仍恒不动。
   *  用「按下→抬起位移」区分点击与拖拽：拖拽是平移手势，不应顺带触发点击语义。 */
  private onMouseButton(event: MouseEvent): void {
    if (event.action === MouseAction.Press) {
      this.pressBtn = event.button;
      this.pressX = event.x;
      this.pressY = event.y;
      this.pressDX = Number(event.displayX ?? event.x);
      this.pressDY = Number(event.displayY ?? event.y);
      this.pressMoved = false;
      if (event.button === MouseButton.Right) {
        // 第七十六轮：右键不再 toggle 放大镜；改由本通道在相片上弹 picture contact menu。
        // 仍 stopPropagation：不弹系统右键菜单，也不冒泡到根容器触发别的行为。
        this.openPictureMenu(this.pressDX, this.pressDY);
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
        // 第七十六轮：菜单已在 Press 打开，Release 只清按键态，右键彻底不触发放大镜。
        return;
      }
      if (btn !== MouseButton.Left) {
        return;
      }
      // 第七十六轮：仅预览区相片上左键 = toggle 放大镜（空态 / 文本预览 / 左栏一律不触发）。
      if (pmPhotoReadyOf(this.viewPixelMap !== undefined, this.textMode)) {
        this.applyLoupeToggle(true);
      }
      // 左键单击仍不缩放：双击的 TapGesture 随后收口切全屏，
      // 双击第一下不会改变视图，onDoubleTapCanvas / undoLastClickZoom 也无需回退任何缩放。
      this.clickSnapZoom = -1;
      this.clickSnapAt = Date.now();
    }
  }

  /** 第七十六轮：预览区相片上左键 toggle 放大镜总开关（纯函数驱动，预设关闭）。
   *  非左键事件一律保持原状；只在真正翻转时写 @State，避免每次 Move 触发无效刷新。 */
  private applyLoupeToggle(leftClick: boolean): void {
    const next: boolean = loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick);
    if (next !== this.loupeEnabled) {
      this.loupeEnabled = next;
      // 第十六轮：关闭时立刻释放专用高清图源（不占内存）；开启时若鼠标已在某页上，
      // 立即按当前档位补解一次，右键一开就能看到最清晰效果，不必先移出再移入。
      if (!next) {
        this.clearLoupeHiRes();
      } else if (this.loupePane !== LOUPE_PANE_NONE && this.loupeHover) {
        this.ensureLoupeHiRes(this.loupePane);
      }
    }
  }

  /** 双击画布：切全屏（第七轮起左键单击不放大，这里只做防御性的旧快照回退）。
   *  仍是「双击进入 / 退出全屏」的唯一收口，滚轮 / 列表双击走的也都是 toggleFull()。 */
  private onDoubleTapCanvas(): void {
    if (this.clickSnapZoom >= 0 && Date.now() - this.clickSnapAt <= DBL_CLICK_UNDO_MS) {
      this.zoom = this.clickSnapZoom;
      this.tx = this.clickSnapTx;
      this.ty = this.clickSnapTy;
    }
    this.clickSnapZoom = -1;
    this.toggleFull();
  }

  /** 防御性兼容：若还残留「单击放大」快照就撤销（第七轮起恒无），供双击档案名复用。 */
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

  /** 第十三轮：鼠标点选档案的滚动收口。
   *  一般点选零自动滚动（保持当前滚动位置与可见范围）；仅当所选档案是
   *  列表最顶端 / 最底端（或可见范围最顶 / 最底行）时才允许列表上下移动。
   *  真值来源统一走 InteractionPlan.tapScrollAction，UI 不自作判定。 */
  private scrollOnTap(idx: number): void {
    const row: number = this.rowOfItem(idx);
    const action: number = tapScrollAction(row, this.listFirstRow, this.listLastRow,
      this.rows.length);
    if (scrollAllowed(action)) {
      this.scroller.scrollToIndex(row, false);
    }
  }

  /** 第十三轮：滚轮 / 键盘切图的滚动收口。
   *  目标仍在可见范围内就不动列表；只有跑出可见范围才跟随（保持既有翻页体验）。
   *  这不属于「鼠标点选档案」语义，故用 stepScrollAction 而非 tapScrollAction。 */
  private scrollOnStep(idx: number): void {
    const row: number = this.rowOfItem(idx);
    const action: number = stepScrollAction(row, this.listFirstRow, this.listLastRow);
    if (action !== SCROLL_NONE) {
      this.scroller.scrollToIndex(row, false);
    }
  }

  /** 第十三轮：放大镜是否有可显示的图（清晰图 / 过渡图 / 系统兜底 uri 任一）。
   *  第十四轮起这是「单页 / 并排左页」的判定，右页由 hasLoupeImage 分支处理。 */
  private hasPreviewImage(): boolean {
    return this.viewPixelMap !== undefined || this.lowPixelMap !== undefined || this.viewFailed;
  }

  /** 第六十轮：当前主高亮行。常规选中行优先；APP 内上层清单 cur=-1 时，
   *  按 upReturnName 在 rows 里找第五十九轮的反色行（名字严格相等 + 目录类行）。 */
  private highlightRowNow(): number {
    let sel: number = -1;
    if (this.cur >= 0 && this.cur < this.items.length) {
      sel = this.rowOfItem(this.cur);
    }
    let inv: number = -1;
    if (this.upReturnName.length > 0) {
      for (let i = 0; i < this.rows.length; i++) {
        if (upReturnInvertOf(this.rows[i].name, this.upReturnName,
          this.rows[i].kind ?? ROW_IMAGE, ROW_FOLDER, ROW_OTHER)) {
          inv = i;
          break;
        }
      }
    }
    return highlightRowOf(sel, inv, this.rows.length);
  }

  /** 第六十轮：状态落地 / 尺寸变化后挂起一次「最小位移完整显示」定位请求。
   *  不直接改滚动位置：换源时可见范围尚未上报，guard 会返回 HV_NONE 保留挂起，
   *  等首个有效 onScrollIndex 再消费，避免在布局回调里同步滚动造成跳动。 */
  private armHighlightReveal(scene: string): void {
    this.highlightRevealPending = true;
    this.highlightGuardKey = HV_KEY_INVALID;
    this.guardHighlightVisible(scene);
  }

  /** 第六十轮：高亮项恒定完整可见的唯一收口。
   *  只在 pending 且主高亮行不落在安全可见区时，用 ScrollAlign.AUTO 做一次
   *  「滚动最小距离使该行完整显示」；AUTO 在已完整可见时不产生位移，因此不引入
   *  额外偏移、padding 或布局跳动，也不改列表顺序 / 高亮态 / 选中交互。
   *  校正后立即清 pending —— onScrollIndex 回调递归回来时 guard 恒返回 HV_NONE。 */
  private guardHighlightVisible(scene: string): void {
    const row: number = this.highlightRowNow();
    const total: number = this.rows.length;
    const action: number = highlightGuardActionOf(row, this.listFirstRow, this.listLastRow,
      total, this.highlightGuardKey, this.highlightRevealPending);
    if (action === HV_NONE) {
      return;
    }
    const alignCode: number = highlightScrollAlignOf(action);
    if (alignCode === HV_KEY_INVALID) {
      return;
    }
    this.highlightGuardKey = highlightGuardKeyOf(row, this.listFirstRow, this.listLastRow, total);
    this.highlightRevealPending = false;
    const align: ScrollAlign = alignCode === HV_ALIGN_AUTO ? ScrollAlign.AUTO : ScrollAlign.START;
    this.scroller.scrollToIndex(row, false, align);
    hilog.info(DOMAIN, TAG,
      'highlight guard: %{public}s row=%{public}d first=%{public}d last=%{public}d total=%{public}d',
      scene, row, this.listFirstRow, this.listLastRow, total);
  }

  /** 第十四轮：按 pane 判定该页是否有可放大内容。
   *  · 并排右页只看 rightPixelMap（右页刻意不用 uri 兜底，见 rightPageImage）；
   *  · 单页 / 并排左页沿用 hasPreviewImage（清晰图 / 过渡图 / 系统兜底 uri）。
   *  两页各判各的，绝不拿左页的图去画右页的放大镜。 */
  private hasLoupeImage(pane: number): boolean {
    if (pane === LOUPE_PANE_RIGHT) {
      return this.rightPixelMap !== undefined;
    }
    return this.hasPreviewImage();
  }

  /** 第十四轮：某页的 hover 收口（移入激活本页 / 移出仅清本页）。
   *  两页各自挂自己的 onHover，走 loupePaneAfterHover 纯函数：从 A 页直接滑到 B 页时，
   *  A 迟到的 leave 不会把 B 刚置好的激活页误清 —— 这是双页互不影响的一环。 */
  private onLoupeHover(on: boolean, pane: number): void {
    const nextPane: number = loupePaneAfterHover(this.loupePane, pane, on);
    if (nextPane !== this.loupePane) {
      this.loupePane = nextPane;
    }
    if (!on && nextPane === LOUPE_PANE_NONE) {
      this.loupeHover = false;
    }
    if (on) {
      // 第十六轮：移入即按 >1:1 档位补解高清图源（1:1 及以下纯函数会直接旁路）。
      this.ensureLoupeHiRes(pane);
    }
  }

  /** 第十四轮：预览图放大镜的鼠标驱动（每页各自一份，pane 由调用方传入）。
   *  挂在对应预览页的 Stack 上，坐标天然相对「该页显示框」。
   *  Move 时按坐标兜底判定是否仍在框内（部分 2in1 只派发 Move、不给 enter / leave），
   *  并同步激活页；onHover(false) 另行同步立即隐藏。
   *  只认本页这一层，左栏 / 另一页 / 状态浮层一律不触发。 */
  private onLoupeMouse(event: MouseEvent, pane: number, half: boolean): void {
    if (event.action !== MouseAction.Move) {
      return;
    }
    const x: number = Number(event.x);
    const y: number = Number(event.y);
    // 第八十六轮：命中框 = **该页真实渲染框**（并排两页宽度可能不同）。
    const inside: boolean = x === x && y === y &&
      loupeInFrame(x, y, this.pageBoxW(pane, half), this.pageH(half));
    const on: boolean = loupeEligibleOf(inside, this.hasLoupeImage(pane));
    const nextPane: number = on ? pane : loupePaneAfterHover(this.loupePane, pane, false);
    if (nextPane !== this.loupePane) {
      this.loupePane = nextPane;
    }
    if (on !== this.loupeHover) {
      this.loupeHover = on;
    }
    if (on) {
      this.loupeX = x;
      this.loupeY = y;
      // 第十六轮：Move 兜底也检查一次目标档位（同图同档零重解，性能稳定）。
      this.ensureLoupeHiRes(pane);
    }
  }

  /** 放大镜圆内放大图的尺寸：主预览显示框整体等比放大 LOUPE_ZOOM 倍。
   *  第十六轮：全部收敛到整像素 —— 浮点尺寸会让 GPU 落在子像素上采样，
   *  产生边缘粗糙 / 错位；取整后每个显示像素与源像素严格对齐。
   *  第八十六轮：改成按 **该页的真实渲染框**（pageWLeft / pageWRight / pageH）取基准。
   *  并排两页宽度可能不同（各自原始比例），所以必须区分 pane —— 只用 half 会把
   *  右页按左页宽度放大，圆内取景与光标处不对应。 */
  private loupeContentW(pane: number, half: boolean): number {
    return loupePixelAlignOf(this.pageBoxW(pane, half) * LOUPE_ZOOM);
  }

  private loupeContentH(half: boolean): number {
    return loupePixelAlignOf(this.pageH(half) * LOUPE_ZOOM);
  }

  /** 圆内放大图偏移（夹界版）：把光标处的图像点对齐圆心，边缘不空白。
   *  取整至多带来 1px 误差，圆本身有 2vp 边框覆盖，圆内始终被放大图铺满。 */
  private loupeOffX(pane: number, half: boolean): number {
    return loupePixelAlignOf(loupeClampedOffset(this.loupeX, this.pageBoxW(pane, half), LOUPE_D_VP, LOUPE_ZOOM));
  }

  private loupeOffY(half: boolean): number {
    return loupePixelAlignOf(loupeClampedOffset(this.loupeY, this.pageH(half), LOUPE_D_VP, LOUPE_ZOOM));
  }

  /** 圆形放大镜左上角：圆心严格落在光标处（实时跟随）。 */
  private loupeLeft(): number {
    return loupeCircleOrigin(this.loupeX, LOUPE_D_VP);
  }

  private loupeTop(): number {
    return loupeCircleOrigin(this.loupeY, LOUPE_D_VP);
  }

  // ------------------------------------------------------------------
  // 第十六轮：放大镜 >1:1 重采样（分档插值 / 高分辨率图源 / 1:1 旁路）
  // ------------------------------------------------------------------

  /** 第十七轮：设备像素密度比，懒读一次并缓存（绝不进启动路径）。
   *  SDK 26 `@ohos.display` Display.densityPixels ∈ [0.5, 4.0]，常见 1.0 / 3.0；
   *  读失败 / 平台差异时经 loupeDensityRatioOf 回退 1，绝不让放大镜失效。
   *  第十六轮把密度写死 1，高 DPI 屏上 1vp = 2~3 物理像素，倍率与所需像素被
   *  严重低估 —— 这是「常见屏幕显示条件」下仍锯齿 / 发虚的根因之一。 */
  private loupeDensityOf(): number {
    if (this.loupeDensity > 0) {
      return this.loupeDensity;
    }
    let raw: number = LOUPE_DENSITY_RATIO;
    try {
      raw = display.getDefaultDisplaySync().densityPixels;
    } catch (e) {
      raw = LOUPE_DENSITY_RATIO;
    }
    this.loupeDensity = loupeDensityRatioOf(raw);
    return this.loupeDensity;
  }

  /** 有效放大倍率 = 局部 3× × 主视图缩放 × **真实**设备密度比。
   *  这是「是否严格超过原图 1:1（100%）」的唯一真值来源，不在 UI 里另算。 */
  private loupeScale(): number {
    return loupeEffectiveScaleOf(LOUPE_ZOOM, this.zoom, this.loupeDensityOf());
  }

  /** 第十七轮：按 SDK 官方枚举语义修正插值档（放大锯齿的直接主因就在这里）。
   *  SDK `component/image.d.ts` L190-236：High=Cubic 是官方「放大最高质量」档；
   *  Medium=MipMap 是**缩小专用**的低分辨率金字塔，放大时只会退化 / 发糊；
   *  None=最近邻是锯齿 / 像素化之源；Low=双线性是 SDK 默认值。
   *  · 任意 >1:1 放大 → High(Cubic)：边缘平滑 + 线条清晰 + 形状颜色不失真，
   *    绝不再用第十六轮误配的 Medium(MipMap)；
   *  · ≤1:1 → Low(双线性)：1:1 逐像素对应不受影响，缩小也比最近邻平滑，
   *    绝不再用 None(最近邻)。
   *  ⚠️ SDK L1070 明确 `.interpolation()` 只排除 SVG / AnimatedDrawableDescriptor，
   *  对 PixelMap **生效**（第十六轮把它与 L1088 sourceSize 的限制混淆了）；
   *  配合 loupeLayer 的 `.antialiased(LOUPE_AA_ENABLED)` 打开 PixelMap 边缘抗锯齿。 */
  private loupeInterpolation(): ImageInterpolation {
    const tier: number = loupeQualityTierOf(this.loupeScale());
    if (tier === LOUPE_QA_HIGH) {
      return ImageInterpolation.High;
    }
    return ImageInterpolation.Low;
  }

  /** 第十七轮：目标解码边 = 放大后真实像素需求（scale 已含真实密度），
   *  夹到 cap 后**再夹到原图长边**（decodePx 的 desiredSize 只能降采样、不能升采样，
   *  请求超过原图边毫无意义，只会白解码一次 + 白占一张大 PixelMap）。
   *  ≤1:1 返回 baseEdge（1:1 旁路，不额外解图）。 */
  private loupeResampleTargetEdge(uri: string): number {
    return loupeResampleEdge2Of(this.viewEdge(), this.loupeScale(),
      this.srcLongOf(uri), LOUPE_RESAMPLE_MAX_EDGE);
  }

  /** 当前 pane 对应的档案 uri：左页 = 当前张，右页 = 对开第二张。 */
  private loupeUriOf(pane: number): string {
    if (pane === LOUPE_PANE_RIGHT) {
      const b: number = this.spreadB;
      return b >= 0 && b < this.items.length ? this.items[b].uri : '';
    }
    const it: ImageItem | undefined = this.curItem();
    return it !== undefined ? it.uri : '';
  }

  /** 高分辨率图源是否可用于当前页：uri / pane 必须都对上。
   *  切图或换页时绝不会把上一张的高清图错画到新图上（自动回退既有图源）。 */
  private loupeHiUsable(uri: string, pane: number): boolean {
    return this.loupeHiPx !== undefined &&
      this.loupeHiUri === uri && this.loupeHiPane === pane &&
      loupeNeedsResampleOf(this.loupeScale());
  }

  // ---- 第六十七轮：系统 native 级 AA 缩放决策（纯函数真值源 → 一次重采样）----

  /** 一次算出本帧完整画质决策。档位（tier / aa / interpolation / filter）
   *  只认**逻辑倍率**，密度只进 effective 与像素预算 ⇒ 不同 DPI 屏同一档、同一视觉。
   *  · target = 圆内放大图所需的物理长边（画布长边 × 有效倍率，夹到 LQ_MAX_EDGE）；
   *  · current = R17 实际补解出的长边（desiredSize 只能降采样，小图会卡在原图边）；
   *  · want = 两者缺口，交给 lqFactorOf 按内容种类收敛、再交给 lqSafeFactorOf 夹预算。 */
  private loupeSystemPlan(uri: string): LoupeScalePlan {
    const logical: number = lqLogicalScaleOf(LOUPE_ZOOM, this.zoom);
    const density: number = lqDensityOf(this.loupeDensityOf());
    const effective: number = lqEffectiveScaleOf(logical, density);
    const kind: number = lqKindOf(uri);
    const base: number = Math.max(this.frameW(), this.frameH());
    // srcLong 传 0：系统级缩放**可以升采样**，不受 decodePx 的 desiredSize 限制。
    const target: number = lqTargetEdgeOf(base, effective, 0, LQ_MAX_EDGE);
    const current: number = this.loupeHiEdge > 0 ? this.loupeHiEdge : this.viewEdge();
    const deficit: number = target / Math.max(1, current);
    const plan: LoupeScalePlan = {
      cap: this.loupeCap,
      logical: logical,
      effective: effective,
      tier: lqConsistentTierOf(logical, density),
      kind: kind,
      aa: lqAaLevelOf(logical, kind, this.loupeCap),
      want: lqFactorOf(deficit, kind, LQ_MAX_FACTOR),
      target: target,
      interpolation: lqInterpolationOf(logical),
      filter: lqFilterModeOf(logical)
    };
    return plan;
  }

  /** 稳定阈值（鼠标在圆内高频微动不重算）+ 真实像素增益（补不出像素就不做）。 */
  private loupeSysRebuildWanted(target: number): boolean {
    return lqShouldRebuildOf(this.loupeSysEdge, target, LQ_STABLE_MIN_DELTA) &&
      lqHasGainOf(target, this.loupeHiEdge, LQ_MIN_GAIN);
  }

  /** 圆内统一图源出口：系统级 AA 产物优先，R17 高清重解码兜底，能力不足再退组件级链。
   *  uri / pane 双重对账 —— 切图换页绝不把上一张的系统级产物错画到新图上。 */
  private loupeDisplayPx(uri: string, pane: number): image.PixelMap {
    if (this.loupeSysPx !== undefined && this.loupeSysUri === uri &&
      this.loupeSysPane === pane) {
      return this.loupeSysPx!;
    }
    return this.loupeHiPx!;
  }

  /** 系统级产物是否与当前页匹配（诊断 / 未来扩展用，不改变绘制分支）。 */
  private loupeSysUsable(uri: string, pane: number): boolean {
    return this.loupeSysPx !== undefined &&
      this.loupeSysUri === uri && this.loupeSysPane === pane &&
      this.loupeCap >= LQ_CAP_SYSTEM_AA;
  }

  /** 释放系统级产物并作废旧代号（关闭 / 换图 / 模式切换 / 页面销毁 / 能力回退）。 */
  private clearLoupeSysPx(): void {
    this.loupeSysToken++;
    const oldSys: image.PixelMap | undefined = this.loupeSysPx;
    this.loupeSysPx = undefined;
    this.loupeSysUri = '';
    this.loupeSysPane = LOUPE_PANE_NONE;
    this.loupeSysEdge = 0;
    this.releaseLoupeSysPx(oldSys);
  }

  private releaseLoupeSysPx(px: image.PixelMap | undefined): void {
    if (px === undefined) {
      return;
    }
    try {
      px.release();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'loupe R67 release skipped');
    }
  }

  /** >1:1 时按放大后像素需求补解一张高分辨率 PixelMap 给放大镜 —— 画质修复核心。
   *  第十七轮修正：ArkUI `.interpolation()` 对 PixelMap **生效**（SDK 26
   *  `component/image.d.ts` L1070 只排除 SVG / AnimatedDrawableDescriptor；
   *  L1088 才是对 PixelMap 不生效的 `sourceSize`）。第十六轮把两者混淆，于是
   *  放大镜恒 3× 却恒落 Medium(MipMap，缩小专用) → 锯齿 / 发糊的直接主因。
   *  本轮：放大一律 High(Cubic) + 五个源统一 `.antialiased(true)` 开边缘 AA；
   *  同时仍按真实像素需求重解码补足像素（desiredSize 只能降采样，故目标边
   *  夹到原图长边，且无真实增益时直接跳过，靠 Cubic + AA 保证平滑）。
   *  性能稳定：同图同页 + 目标边变化小于阈值时直接复用，鼠标在圆内高频微动
   *  不反复重解码；代号作废的迟到结果立即释放，`1:1 及以下` 完全旁路。 */
  private ensureLoupeHiRes(pane: number): void {
    if (!this.loupeEnabled || !loupeNeedsResampleOf(this.loupeScale())) {
      return;
    }
    const uri: string = this.loupeUriOf(pane);
    if (uri.length === 0) {
      return;
    }
    const edge: number = this.loupeResampleTargetEdge(uri);
    if (edge <= 0) {
      return;
    }
    // 第十七轮：无真实像素增益 → 跳过重解码。desiredSize 只能降采样，小图 /
    // 原图分辨率不足时按目标边也补不出像素，白解码一次还白占一张大 PixelMap；
    // 此时直接靠 Cubic + antialiased 保证边缘平滑，并释放已有高清源让它回退。
    if (!loupeResampleGainOf(edge, this.srcLongOf(uri), this.viewEdge(),
      LOUPE_RESAMPLE_MIN_GAIN)) {
      if (this.loupeHiPx !== undefined) {
        this.clearLoupeHiRes();
      }
      return;
    }
    if (this.loupeHiPx !== undefined && this.loupeHiUri === uri &&
      this.loupeHiPane === pane &&
      loupeResampleStableOf(this.loupeHiEdge, edge, LOUPE_RESAMPLE_STABLE_MIN_DELTA)) {
      return;
    }
    this.loupeHiUri = uri;
    this.loupeHiPane = pane;
    this.loupeHiEdge = edge;
    const token: number = ++this.loupeHiToken;
    this.decodeTo(uri, edge, false).then((e: PreviewEntry | undefined) => {
      if (token !== this.loupeHiToken) {
        this.releaseUncachedEntry(e); // 迟到作废结果不接手、不泄漏
        return;
      }
      if (e === undefined) {
        return; // 解码失败：继续用既有图源兜底，放大镜不会空白
      }
      const old: PreviewEntry | undefined = this.loupeHiEntry;
      this.loupeHiEntry = e;
      this.loupeHiPx = e.px;
      this.releaseUncachedEntry(old);
      // 第六十七轮：能力探测（只读方法存在性）→ 画质决策 → 一次系统 native 级 AA 缩放。
      // 全链路异步、只在倍率档变化时重算；失败 / 能力不足 / 预算不足都留在 R17 组件级链。
      if (!this.loupeCapProbed) {
        this.loupeCap = loupeCapabilityOf(e.px);
        this.loupeCapProbed = true;
      }
      const plan: LoupeScalePlan = this.loupeSystemPlan(uri);
      if (plan.cap < LQ_CAP_SYSTEM_AA || !this.loupeSysRebuildWanted(plan.target)) {
        this.clearLoupeSysPx();
        return;
      }
      this.loupeSysUri = uri;
      this.loupeSysPane = pane;
      this.loupeSysEdge = plan.target;
      const sysToken: number = ++this.loupeSysToken;
      loupeSystemScaledPx(e.px, plan.want, plan.aa, plan.cap).then(
        (scaled: image.PixelMap | undefined): void => {
          if (sysToken !== this.loupeSysToken) {
            this.releaseLoupeSysPx(scaled); // 迟到作废结果不接手、不泄漏
            return;
          }
          if (scaled === undefined) {
            this.clearLoupeSysPx(); // SDK 缩放失败：静默回退 R17 高清图源
            return;
          }
          const oldSys: image.PixelMap | undefined = this.loupeSysPx;
          this.loupeSysPx = scaled;
          this.releaseLoupeSysPx(oldSys);
          hilog.info(DOMAIN, TAG,
            'loupe R67 cap=%{public}d tier=%{public}d aa=%{public}d ip=%{public}d fm=%{public}d',
            plan.cap, plan.tier, plan.aa, plan.interpolation, plan.filter);
        });
    });
  }

  /** 释放高分辨率放大镜图源（关闭开关 / 模式切换 / 页面销毁），并作废旧代号。 */
  private clearLoupeHiRes(): void {
    this.loupeHiToken++;
    const old: PreviewEntry | undefined = this.loupeHiEntry;
    this.loupeHiEntry = undefined;
    this.loupeHiPx = undefined;
    this.loupeHiUri = '';
    this.loupeHiPane = LOUPE_PANE_NONE;
    this.loupeHiEdge = 0;
    this.releaseUncachedEntry(old);
    this.clearLoupeSysPx(); // 第六十七轮：同步释放系统级 AA 产物并作废旧代号
  }

  /** fillSizes 补测到体积后同步到左栏行（rows 与 items 可能是不同对象） */
  private setRowSize(uri: string, size: number): void {
    for (let i = 0; i < this.rows.length; i++) {
      if (this.rows[i].uri === uri) {
        this.rows[i].size = size;
      }
    }
  }

  /** 状态栏页码：对开双页时「第 1–2 / N 张」，单页时「第 1 / N 张」。
   *  第八十七轮：首尾相接那一对显示「第 N–1 / N 张 · 首尾相接」——
   *  右页序号小于左页是正常现象（环形配对），必须显式标注，否则用户会误读成
   *  「翻页回退了」或「排序乱了」。文案收口在纯函数 `spreadPageTextOf`。 */
  private pageLabel(): string {
    return spreadPageTextOf(this.cur, this.spreadRight(), this.items.length);
  }

  /** 点左栏某一行：按行的种类分发（图片 / 上级 / 子文件夹 / 文本 / 不支持预览的文件）。
   *  对应 Win64 FsEntry 的 ItemIndex 单向挂钩。 */
  private onRowTap(rowIdx: number): void {
    this.markUserActive();   // 第六十四轮：点左栏档案行不算空闲
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
      // 第五十九轮：进入子目录是「换层」，反色标记必须作废。显式清一次，
      // 覆盖 openFolder 命中整表缓存 → applyItems(keepView=true) 会保留标记的分支；
      // 常规选中 / 目录切换逻辑本身一行未动。
      this.upReturnName = upReturnClearOf(this.upReturnName, false);
      // APP 内清单态：第三参 false 禁掉「目录内多选」兜底选择器 ——
      // 用户点清单里的目录名只应在 APP 内继续列目录，绝不弹任何系统 dialog。
      this.openFolder(r.uri, true, !this.inAppUpList);
      return;
    }
    if (kind === ROW_TEXT) {
      // 第三十七轮：文本 / 源码行走独立预览链，绝不进图片翻页序列 items。
      this.openTextFile(r.uri, r.name);
      return;
    }
    if (kind === ROW_OTHER) {
      this.status = '不支持预览：' + r.name + '（只列出，不进翻页序列）';
      return;
    }
    const idx: number = r.itemIndex ?? rowIdx;
    if (idx >= 0 && idx < this.items.length) {
      this.select(idx);
    } else if (kind === ROW_IMAGE) {
      // 第四十一轮：恢复态纯清单里的图片行不在翻页序列（items 为空、itemIndex=-1），
      // 旧版这里静默吞掉点击。点它 = 用户主动路径，允许 IO：直接真实重列当前目录
      // 重建翻页序列，列完再点即可预览。
      this.openFolder(this.browseBase, true, false);
    }
  }

  private select(idx: number): void {
    this.endSlideFade(true);   // 第九十六轮：用户点选新图 → 正在跑的淡化立即作废
    // 第三十七轮：点图片行即退出文本预览，图片态与文本态严格互斥。
    if (this.textMode) {
      this.closeTextMode();
    }
    if (idx < 0 || idx >= this.items.length) {
      return;
    }
    this.cur = idx;
    this.resetView();
    // 只读名单态：名单照常可选 / 高亮 / 记位置，只切断一切 uri IO。
    // 状态栏给一句明确指引 —— 按钮和列表「点了必须看得见反应」，不能像死了一样。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.scrollOnTap(idx);
      this.status = readonlyTapHint(this.items[idx].name);
      this.dataSource.reload(this.rows);
      this.markPos();
      return;
    }
    this.loadMeta(idx);
    this.showPreviewOf(idx);
    this.refreshSpread();
    this.scrollOnTap(idx);
    this.status = this.pageLabel();
    // LazyForEach 不会自动感知 selected 变化，通知数据源重取 @Prop（只重建可见的几行）
    this.dataSource.reload(this.rows);
    this.schedulePreload();
    this.markPos(); // 记住位置，下次启动自动回到这里
  }

  private go(delta: number): void {
    this.markUserActive();   // 第六十四轮：翻页 / 滚轮也算用户操作
    // 第九十六轮：用户手动翻页（键盘 / 滚轮 / 方向键）时立刻收掉正在跑的交叉淡化，
    // 免得「上一张还半透明盖在刚选中的那张上」。幻灯片自己的推进不算（否则刚建立的叠显层
    // 会在同一次 go() 里被自己清掉）。
    if (!this.slideAdvancing) {
      this.endSlideFade(true);
    }
    // 第三十七轮：文本预览态下方向键改为滚动文本，绝不偷偷翻动图片序列。
    if (this.textMode) {
      this.textScroller.scrollBy(0, delta * TEXT_WHEEL_LINES * TEXT_ROW_H_VP);
      return;
    }
    if (this.items.length === 0) {
      return;
    }
    const n = this.items.length;
    this.cur = ((this.cur + delta) % n + n) % n;
    // 第九十七轮：幻灯片自动推进**不再复位缩放**。复位会让新旧两张在淡化中途
    // 突然变成不同尺寸（叠显层与主图读的是同一个 zoom，但内容已经换了）= 视觉跳变。
    // 用户手动翻页 / 滚轮仍照旧 resetView（行为不变）。
    if (!this.slideAdvancing) {
      this.resetView();
    }
    // 只读名单态：滚轮 / 翻页照常走名单（位置、高亮、记忆都更新），
    // 只切断解码与元数据 IO，并给一句看得见的反馈。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.scrollOnStep(this.cur);
      this.status = readonlyTapHint(this.items[this.cur].name);
      this.dataSource.reload(this.rows);
      this.markPos();
      return;
    }
    this.loadMeta(this.cur);
    // 第七轮：滚轮 / 翻页切图只做「定位 → 查已解码缓存 → 复用上屏」，解码全部在
    // 载入时的后台全量预载链里完成，绝不在滚轮事件里才启动解码（详见 showPreviewOf）。
    this.showPreviewOf(this.cur);
    this.refreshSpread();
    // 第二个参数 smooth=false：快速翻页时不要播滚动动画，否则每次切换都重启一段动画，
    // 左侧列表会一直「追」不上当前项，观感上就是图片和列表错位。
    // 第十三轮：翻页只在目标跑出可见范围时才跟随（stepScrollAction 判定）。
    this.scrollOnStep(this.cur);
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
    // 第三十七轮：文本预览态下滚轮滚动文本行，不翻页、不缩放图片。
    if (this.textMode) {
      this.textScroller.scrollBy(0, dir * TEXT_WHEEL_LINES * TEXT_ROW_H_VP);
      return;
    }
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
    this.markUserActive();   // 第六十四轮：幻灯片开关也算用户操作
    if (this.playing) {
      this.stopSlide();
      return;
    }
    if (this.items.length === 0) {
      this.status = '先打开图片再播放幻灯片';
      return;
    }
    // 第九十八轮：从「文本 / 源码预览」页进来时先退回图片视图。
    // 否则 go() 在 textMode 下走的是「滚动文本」分支，幻灯片的 go(1) 只会滚文字、画面永远不动
    // —— 这正是「从其他页面进入幻灯片」时的另一种异常表现。
    if (this.textMode) {
      this.closeTextMode();
    }
    // 第九十八轮：**先把进入前的视图形态抓成快照**（并排 or 单张），再翻 playing。
    // 注意顺序：必须在 playing=true 之前读，否则读到的是「播放期」的判据而不是用户眼前的形态。
    // 依据是「当前真正显示出来的是什么」，所以直接看 spreadB（render 真实依据），
    // 不看 previewMode —— AUTO 下竖图对开时 spreadB 同样是有效下标。
    this.slideSpreadHold = this.spreadB >= 0 && this.spreadB < this.items.length;
    this.playing = true;
    // 快照已定，这里重算只是把配对/右页按快照对齐（不会再出现「一进播放就塌成单片」）。
    this.refreshSpread();
    this.status = '幻灯片播放中（每 ' + (SLIDE_INTERVAL / 1000) + ' 秒切换 · 淡入淡出 · ' +
      (this.slideSpreadHold ? '并排' : '单张') + '）';
    this.timerId = setInterval(() => {
      this.slideAdvance();
    }, SLIDE_INTERVAL);
  }

  private stopSlide(): void {
    if (this.timerId !== -1) {
      clearInterval(this.timerId);
      this.timerId = -1;
    }
    if (this.playing) {
      this.playing = false;
      // 第九十六轮：停播必须收掉叠显层 —— 否则上一张的残影会一直盖在新图上，
      // 而且那张若是自解码的还占着内存。收完再把并排判据恢复（还用户原来的视图偏好）。
      this.endSlideFade(true);
      this.refreshSpread();
      this.status = '幻灯片已暂停';
    }
  }

  // ------------------------------------------------------------------
  // 第九十六轮：幻灯片交叉淡化（单张 / 双层重叠 / 分步可取消）
  // ------------------------------------------------------------------

  /** 推进一张：**先把上一张的所有权交接好 → 再切图 → 等新图真能画了才开始淡化**。
   *
   *  为什么顺序这么严：
   *   · 切图（showPreviewOf）第一步就是 `releaseViewOwned()` + `viewPixelMap = undefined`
   *     + `clearViewSysPx()`；若不在切之前把上一张「接管」过来，它就当场被 release，
   *     我们再拿它去画叠显层 = 用已释放对象（黑块 / 花屏 / 崩溃）；
   *   · 新图没就绪就开始淡化 ⇒ 底下是空的 ⇒ 露中灰底，正是用户要求避免的「空白」。
   *     所以：新图未就绪时**旧图保持满不透明**顶在前面（画面仍是上一张），轮询等它就绪。 */
  private slideAdvance(): void {
    if (!this.playing || this.items.length === 0) {
      return;
    }
    // 上一拍的新图到现在还没解出来（屏幕此刻只有叠显层那张旧图）：**这一拍不推进**。
    // 若照常往下走，第一步 endSlideFade 就会把旧图撤掉 ⇒ 当前张又没有图 ⇒ 露中灰底。
    // 宁可晚一拍（用户只是看到这张多停 3 秒），也绝不出空白。
    if (this.slideOutPx !== undefined && this.viewPixelMap === undefined) {
      hilog.info(DOMAIN, TAG, 'slide advance skipped: current image pending');
      return;
    }
    // 第九十七轮：把上一张的低清模糊层先撤掉。它是「由糊到清」用的临时层，会盖在主图之上；
    // 淡化期间它若还在，就会被当成「旧图」的一部分闪一下糊图。
    this.clearBlur();
    // 上一轮若还没收尾（极端：解码超慢），先收掉再开新的，避免两层叠显互相打架。
    this.endSlideFade(true);
    // ① 交接：取「屏幕上真正显示的那一张」——系统 AA 精炼产物优先，其次自解码 PixelMap。
    const curUri: string = (this.cur >= 0 && this.cur < this.items.length) ? this.items[this.cur].uri : '';
    let shown: image.PixelMap | undefined = undefined;
    let owned: boolean = false;
    if (this.viewSysPx !== undefined && this.viewSysUri === curUri) {
      shown = this.viewSysPx;
      owned = true;
      // 手动接管系统产物：token 自增作废在途精炼回调，再把三个字段摘空，
      // 让随后的 clearViewSysPx() 找不到它、不会替我们释放。
      this.viewSysToken++;
      this.viewSysPx = undefined;
      this.viewSysUri = '';
      this.viewSysEdge = 0;
    } else if (this.viewPixelMap !== undefined) {
      shown = this.viewPixelMap;
      if (this.viewOwned !== undefined) {
        owned = true;
        this.viewOwned = undefined;   // 所有权移交给叠显层，结束淡化时由它 release
      }
    }
    if (shown === undefined) {
      // 连一张可画的旧图都没有（首次进入 / 刚清空）：无从淡化，直接切。
      this.go(1);
      return;
    }
    this.slideOutPx = shown;
    this.slideOutOwned = owned;
    // 第九十七轮：并排模式下右页也在换图，必须**同样**做叠显，否则左页在淡、右页已经跳成新图，
    // 观感就是「半边闪」。所有权规则与左页一致：自解的移交过来，缓存的只持引用不释放。
    if (this.spreadShown() && this.rightPixelMap !== undefined) {
      this.slideOutRightPx = this.rightPixelMap;
      this.slideOutRightOwned = this.rightOwned !== undefined;
      if (this.slideOutRightOwned) {
        this.rightOwned = undefined;
      }
    }
    this.slideOutOpacity = 1;
    this.slideBlending = true;
    // ② 切图（同步命中缓存时 viewPixelMap 立即就是新图）。
    //    置标志让 go() 知道「这次不是用户手动翻页」，别把刚建好的叠显层清掉。
    this.slideAdvancing = true;
    this.go(1);
    this.slideAdvancing = false;
    // ③ 就绪判据收口在纯函数里；就绪 → 立刻开始；未就绪 → 旧图顶着，轮询等。
    if (slideFadeReadyOf(this.viewPixelMap !== undefined, this.viewPixelMap === this.slideOutPx)) {
      this.startSlideFade();
    } else {
      this.armSlideFadeWait(0);
    }
  }

  /** 等新图就绪（最多 SLIDE_WAIT_POLL_MAX 轮）。
   *  超时**不做淡化**：宁可这一张停在旧图上（用户看到的是「这一张没换」），
   *  也不能淡到一半露出中灰底。下一轮 tick 会重新走一遍完整流程。 */
  private armSlideFadeWait(round: number): void {
    if (this.slideWaitTimer !== -1) {
      clearTimeout(this.slideWaitTimer);
      this.slideWaitTimer = -1;
    }
    const seq: number = this.slideFadeSeq;
    this.slideWaitTimer = setTimeout(() => {
      this.slideWaitTimer = -1;
      if (seq !== this.slideFadeSeq || !this.playing || !this.slideBlending) {
        return;   // 期间被停止 / 又推进了一张：这次等待作废
      }
      if (slideFadeReadyOf(this.viewPixelMap !== undefined, this.viewPixelMap === this.slideOutPx)) {
        this.startSlideFade();
        return;
      }
      if (round >= SLIDE_WAIT_POLL_MAX) {
        hilog.info(DOMAIN, TAG, 'slide fade skipped: next image not ready, keep previous');
        // 保持旧图可见（slideOutOpacity 仍为 1，它不透明地压在主图之上）——
        // 画面就是「还是上一张」，不是空白。下一轮 tick 从 endSlideFade 重新开始。
        return;
      }
      this.armSlideFadeWait(round + 1);
    }, SLIDE_WAIT_POLL_MS);
  }

  /** 分步交叉淡化：每 SLIDE_FADE_TICK_MS 走一步，`out + in === 1` 恒成立。
   *  用 setTimeout 分步而不是 animateTo：本工程的 animateTo 无法取消（见 finishFocus 注释），
   *  而淡化的 420ms 里完全可能「停止播放 / 手动翻页 / 退出页面」——
   *  分步链靠 slideFadeSeq 一 ++ 就整体作废，永不会把新图透明度再拉回去。 */
  private startSlideFade(): void {
    const seq: number = ++this.slideFadeSeq;
    let step: number = 0;
    const tick = (): void => {
      if (seq !== this.slideFadeSeq) {
        return;
      }
      step++;
      const f: CrossFade = crossFadeStepOf(step, SLIDE_FADE_STEPS);
      // 只用 out：旧图在上层，out=1 时完全不透明地遮住新图，out→0 自然露出新图，
      // 即「屏幕 = out·旧 + (1−out)·新」，等价于标准交叉淡化，但不需要动主图透明度。
      this.slideOutOpacity = f.out;
      if (step >= SLIDE_FADE_STEPS) {
        this.endSlideFade(true);
        return;
      }
      this.slideFadeTimer = setTimeout(tick, SLIDE_FADE_TICK_MS);
    };
    this.slideFadeTimer = setTimeout(tick, SLIDE_FADE_TICK_MS);
  }

  /** 收掉叠显层（幂等，任何时刻都能调）：
   *  · 代号 ++ 让在途 tick / 轮询全部作废，计时器清掉；
   *  · 先撤状态引用（`slideOutPx = undefined`）再 release —— 与 releaseViewOwned 同一口径，
   *    保证组件下一帧就不再引用它，不会出现「还在画就被释放」；
   *  · 只释放**自己拥有的**那张；缓存持有的那张归 LRU 管，碰它就等于把还在用的图废掉。 */
  private endSlideFade(releaseOut: boolean): void {
    this.slideFadeSeq++;
    if (this.slideFadeTimer !== -1) {
      clearTimeout(this.slideFadeTimer);
      this.slideFadeTimer = -1;
    }
    if (this.slideWaitTimer !== -1) {
      clearTimeout(this.slideWaitTimer);
      this.slideWaitTimer = -1;
    }
    const px: image.PixelMap | undefined = this.slideOutPx;
    const owned: boolean = this.slideOutOwned;
    const pxR: image.PixelMap | undefined = this.slideOutRightPx;
    const ownedR: boolean = this.slideOutRightOwned;
    this.slideOutPx = undefined;
    this.slideOutRightPx = undefined;
    this.slideOutOwned = false;
    this.slideOutRightOwned = false;
    this.slideBlending = false;
    this.slideOutOpacity = 0;
    // 极窄的窗口：若它此刻恰好就是主图（切图失败 / 同 uri），绝不能释放。
    if (releaseOut && owned && px !== undefined && px !== this.viewPixelMap) {
      try {
        px.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'slide fade release skipped');
      }
    }
    if (releaseOut && ownedR && pxR !== undefined && pxR !== this.rightPixelMap) {
      try {
        pxR.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'slide fade right release skipped');
      }
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
  //   · 档位不能按原图分辨率预载（几十张就是几个 GB），故由 preloadEdge() 夹在
  //     [1024, PRELOAD_DECODE_MAX_EDGE] 内；PRELOAD_MAX_BYTES 才是最终防 OOM 硬闸。
  //   · 第七轮：decodeEdgeOf() 把预载档位抬到「当前画布可直接显示」的档位，
  //     每张图只在载入时解一次，滚轮切图只复用已解码 PixelMap（不再补一次全清）；
  //     shouldReuseDecoded() / reuseEdge() 按实际显示像素判「够不够」，
  //     decodeKeyOf() 合并同一 (uri,edge) 的并发解码，杜绝重复解码。
  //
  //  ⚠️ 旧版把预载定为 768px「仅供模糊占位」，于是每张命中缓存的图都还要再解一次
  //  「画布长边×2」的全清 —— 大图那一次能解到 1 秒以上，切图卡顿就是这么来的。
  // ------------------------------------------------------------------

  /** 解码入口（第七轮：所有解码先查「已解码数据缓存」并复用，减少重复解码）。
   *  edge = QUICK_EDGE(768) 低清占位；edge = preloadEdge() 可显示档位预载；
   *  edge = displayEdge() 放大时的全清图。三种场景共用同一套系统 codec。
   *
   *  ① allowReuse=true 且缓存里已有档位足够的 PixelMap → **直接返回那条已解码数据，零解码**；
   *  ② 同一 (uri, edge) 已有在途解码 → 共用同一个 Promise，并发请求只解一次；
   *  ③ 都没有才真正 decodePx；失败 uri 记黑名单，避免无限重试。
   *  ⚠️ 预热 warm 必须自有一张 PixelMap（aboutToDisappear 会 release），故传 allowReuse=false。
   *  ⚠️ 复用 / 合并拿到的条目归缓存所有，调用方在「代号已作废」时要用
   *     releaseUncachedEntry() 判断后再释放，绝不能直接 px.release()（会花屏）。 */
  private decodeTo(uri: string, edge: number,
    allowReuse: boolean = true): Promise<PreviewEntry | undefined> {
    // ⚠️ 只读名单态总闸门：失效 uri 的预载 / 右页 / 预热一律在此短路（防 appfreeze）。
    // 第七十七轮：只额外放行【当前主视图这一张】的单次异步解码，让重进 / 重启后立刻出图。
    const curUri: string = (this.cur >= 0 && this.cur < this.items.length)
      ? this.items[this.cur].uri : '';
    if (!bulkIoAllowed(this.restoreMode)) {
      if (curUri.length === 0 || uri !== curUri) {
        return Promise.resolve<PreviewEntry | undefined>(undefined);
      }
    }
    if (!allowReuse) {
      return decodePx(uri, edge);
    }
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    if (hit !== undefined && shouldReuseDecoded(hit.edge, edge)) {
      return Promise.resolve<PreviewEntry | undefined>(hit); // 复用已解码数据，不再解一次
    }
    const key: string = decodeKeyOf(uri, edge);
    const inflight: Promise<PreviewEntry | undefined> | undefined = this.decodeInflight.get(key);
    if (inflight !== undefined) {
      return inflight; // 同一张 + 同一档位只解一次：预载 / 主视图 / 右页并发也不重复解
    }
    const job: Promise<PreviewEntry | undefined> = decodePx(uri, edge)
      .then((e: PreviewEntry | undefined): PreviewEntry | undefined => {
        this.decodeInflight.delete(key);
        if (e === undefined) {
          this.failed.add(uri);
          return undefined;
        }
        // 第四十九轮：在途合并的落点收口 —— 解好先入缓存，再交给消费者。
        // 冷缓存首开时，probeOne 完成回调 / 画布 resize / 预载链推进会在同一张的
        // 解码窗口内反复触发 loadRightPage：多代回调共享同一条 inflight Entry，
        // 旧代际 stale 丢弃时 releaseUncachedEntry 会把最新代际正要用的 PixelMap
        // 一起释放（右页空白，缓存里还可能躺着已释放的死条目）。入缓存后所有权
        // 归缓存：releaseUncachedEntry 查重跳过、upgradePreview / pushPreview 幂等，
        // 任何代际的迟到回调都不可能再释放掉别人正用的那张。
        this.pushPreview(e);
        return e;
      })
      .catch((): PreviewEntry | undefined => {
        this.decodeInflight.delete(key);
        this.failed.add(uri);
        return undefined;
      });
    this.decodeInflight.set(key, job);
    return job;
  }

  /** 只释放「还没被缓存接管」的解码结果。
   *  复用 / 在途合并拿到的 PixelMap 归 previews 所有，调用方代号作废时绝不能 release；
   *  判断依据就是缓存里是否已存在同一张 px。 */
  private releaseUncachedEntry(e: PreviewEntry | undefined): void {
    if (e === undefined) {
      return;
    }
    for (let i = 0; i < this.previews.length; i++) {
      if (this.previews[i].px === e.px) {
        return; // 缓存已接管：所有权归缓存，调用方不动
      }
    }
    try {
      e.px.release();
    } catch (err) {
      hilog.warn(DOMAIN, TAG, 'release uncached decode skipped');
    }
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

  /** 缓存条目上限：全量模式下扩到整个图库（夹在 PRELOAD_ALL_CAP 内），
   *  窗口模式沿用 PRELOAD_COUNT=216。PRELOAD_MAX_BYTES 始终是最终防 OOM 硬闸。 */
  private cacheCap(): number {
    return PRELOAD_ALL ? fullCacheTargetOf(this.items.length, PRELOAD_ALL_CAP) : PRELOAD_COUNT;
  }

  /** 入缓存，并按「张数 + 总字节」双重上限淘汰最旧的。
   *  第七轮：decodeTo 复用 / 在途合并会把「已在缓存里的那张」再交回来一次，
   *  这里必须先查重 —— 同一张 PixelMap 只保留一条，否则账目翻倍、淘汰时会双重 release。 */
  private pushPreview(e: PreviewEntry): void {
    for (let i = 0; i < this.previews.length; i++) {
      if (this.previews[i].px === e.px) {
        // 复用命中：只刷新 LRU 位置，不重复入列、不重复计字节。
        const same: PreviewEntry = this.previews[i];
        this.previews.splice(i, 1);
        this.previews.push(same);
        this.syncCacheStat();
        return;
      }
    }
    this.previews.push(e);
    this.preloadBytes += e.bytes;
    while ((this.previews.length > this.cacheCap() || this.preloadBytes > PRELOAD_MAX_BYTES) &&
      this.previews.length > 1) {
      const old: PreviewEntry = this.previews[0];
      // 正在显示的不能淘汰：主视图 / 过渡层 / 对开右页 / **幻灯片正在淡出的那两张**，
      // release 掉会让画面变黑 / 花屏（第九十七轮补上最后两项：淡化 420ms 内若被淘汰，
      // 上层还在画的就是已释放对象 —— 表现为「闪一下黑/花」）。
      if (old.px === this.viewPixelMap || old.px === this.lowPixelMap ||
        old.px === this.rightPixelMap || old.px === this.slideOutPx ||
        old.px === this.slideOutRightPx) {
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
      // 正在显示 / 正在做过渡 / 对开右页 / 幻灯片淡出中的那两张不能 release，
      // 否则画面变黑或花屏（第九十七轮补上 slideOutPx / slideOutRightPx）。
      if (e.px === this.viewPixelMap || e.px === this.lowPixelMap ||
        e.px === this.rightPixelMap || e.px === this.slideOutPx ||
        e.px === this.slideOutRightPx) {
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

  /** 第十二轮：全量预载链唯一的「旧源作废」收口点。
   *  allOrder / allDone / allFrom 都是建链那一刻按 this.items 长度生成的绝对下标；
   *  只要 items 被替换（选新目录 / 进子目录 / 往上层 / 自动重扫 / 快照恢复 /
   *  只读名单态），旧下标就可能落在新数组之外。onAllDecoded 的回调是异步的，
   *  仅靠 clearPreviews() 作废不够 —— keepView 自动重扫刻意不清缓存，那条路径
   *  会整个绕过它。故统一在 applyItems 最前面自增代号并清空顺序状态，
   *  让所有在途旧批次立刻失效。
   *  ⚠️ 只动作废代号与顺序，绝不 release PixelMap：目录重扫要继续复用已解码缓存。 */
  private resetAllPreloadChain(): void {
    this.allSeq++;
    this.allBusy = false;
    this.allComplete = false;
    this.allOrder = [];
    this.allFrom = 0;
    this.allActive = 0;
    this.allDone.clear();
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
    this.decodeInflight.clear(); // 换源：旧批次在途解码的合并键一并作废
    // 第八轮：原始档案数据也一并释放，否则换一次图库就漏一批 bytes 常驻内存。
    // gen 自增让在途读取的结果只用于本次解码，不再入新图库的缓存。
    rawStore.clear();
    this.syncCacheStat();
    // 缓存被清空后，当前显示的若正是缓存里的那张，就不能再指向它
    this.viewPixelMap = undefined;
    this.releaseViewOwned();
    // 对开右页也可能正指着缓存里那张：上面已把整批 px release，
    // 必须把引用一并撤掉，否则右页会留下一块已释放的 PixelMap（花屏 / 黑块）。
    this.rightToken++;        // 作废在途的右页解码回调，别让它把旧图盖回来
    this.rightPixelMap = undefined;
    this.releaseRightOwned(); // 自解码的右页不进缓存，单独释放
    // 全量预载链：换数据源必须作废旧批次（旧 uri 已失效），并允许新源重新铺满。
    // 第十二轮起统一走 resetAllPreloadChain()，与 applyItems 的换源收口同源。
    this.resetAllPreloadChain();
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
    // 第七十七轮：只读名单态只放行当前这一张；批量链路仍由 decodeTo 闸门挡住。
    const ioOk: boolean = bulkIoAllowed(this.restoreMode);
    if (!ioOk) {
      hilog.info(DOMAIN, TAG, 'restore readonly: single current view decode allowed');
    }
    this.releaseViewOwned();
    this.viewFailed = false;
    this.viewPixelMap = undefined;
    this.clearViewSysPx(); // 第六十八轮：切图即刻作废并释放系统级产物，杜绝上一张错画
    this.clearViewSrPx();  // 第九十九轮：超分产物同理 —— 切图即刻作废，绝不留上一张
    this.imgW = 0;
    this.imgH = 0;
    // 新张还没解码出来前，别把上一张的色彩 / HDR / EXIF 元数据挂在信息浮层上
    this.viewColorSpace = 0;
    this.viewIsHdr = false;
    this.viewExifDegrees = 0;
    this.viewHdrWanted = false;
    this.hdrCode = 0;
    this.hdrHint = '';
    // 第七十六轮：换图立即清掉上一张的 EXIF 徽标 / 资料框 / 相片菜单，杜绝错张残留。
    // 预览模式是用户显式选择的视图偏好，跨图保持，不在这里归零。
    this.viewHasExif = false;
    this.viewExifFields = [];
    this.exifPanelOn = false;
    this.pmMenuOn = false;
    // 第七十七轮：只读名单态不再一刀切 return（以前这里直接掐断主视图解码，
    // 重启后画面只剩中灰／档案名）。只放行「当前这一张」的异步解码：
    // decodePx → rawStore.ensure → 真异步 fs.open + catch，失败即止，最多一次
    // 跨进程往返；批量预载 / statSync / 对开探测仍由 bulkIoAllowed 闸门严控。
    // 这样即便冷启动探测误判授权，当前相片也能立刻正常显示。
    if (idx < 0 || idx >= this.items.length) {
      this.clearBlur();
      return;
    }
    const uri: string = this.items[idx].uri;
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    if (hit !== undefined) {
      // ① 命中缓存 → **直接复用已解码的 PixelMap 上屏**，滚轮切图路径零解码。
      //    全库在载入时就由后台预载链解到可显示档位（preloadEdge → decodeEdgeOf），
      //    所以「切到某张才开始解码」这件事在常规连续查看里根本不会发生。
      this.showDecoded(hit);
      // ② 只有「已解码数据连当前画布实际显示像素都不够」才后台补一张：
      //    判据用 reuseEdge()（按画布 × zoom 的实际像素），不再用含 oversampling 的
      //    displayEdge() 逼着每张命中缓存的图再解一次。补解走 UPGRADE_DELAY_MS 延迟，
      //    且结果写回缓存供下次复用 —— 同一张图最多解一次。
      const reuseNeed: number = this.reuseEdge(Math.max(hit.w, hit.h));
      const fullNeed: number = this.showNeed(hit);
      // 第七十七轮：只读名单态下缓存命中即直接上屏，不再排「升级补解」；
      // 这样恢复期只保留当前一张的解码，不给失效 uri 额外一次跨进程往返。
      if (!shouldReuseDecoded(hit.edge, reuseNeed) && fullNeed > hit.edge) {
        if (ioOk) {
          this.loadView(uri, token, UPGRADE_DELAY_MS);
        }
      }
    } else {
      // ③ 预算裁剪后极少数「后台链还没铺到」的图：低清占位 + 可显示档位解码。
      //    decodeTo 的复用 / 在途合并保证并发请求不重复解同一张；
      //    解完由 upgradePreview 写回缓存，之后滚轮再翻到它就是命中即上屏。
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
    // 第七十一轮：解码链给出的 HDR 保真结果与明确提示直接落到 UI。
    this.hdrCode = e.hdrCode;
    this.hdrHint = e.hdrHint;
    // 第七十七轮：EXIF 图标显隐与资料框字段唯一取自 PreviewEntry 的「有效字段」真值
    // （hasExif = pmExifEffectiveOf(exifFields)），两者同源：显示图标必能查到资料。
    this.viewHasExif = e.hasExif;
    this.viewExifFields = e.exifFields;
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
      // 复用 / 在途合并拿到的那张归缓存所有，不能直接 release（会花屏）。
      this.releaseUncachedEntry(q);
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
    // 解码期间又切了图 → 丢弃这次结果（只释放「还没被缓存接管」的那张），绝不能盖到新图上。
    // 复用 / 在途合并拿到的 PixelMap 归缓存所有，这里绝不能 release。
    if (token !== this.curToken) {
      this.releaseUncachedEntry(ret);
      return;
    }
    if (ret === undefined) {
      // 自己解码失败（例如某些 uri 打不开）→ 标记失败，让 UI 回退到 Image(uri) 由系统解码
      this.viewPixelMap = undefined;
      this.viewFailed = true;
      // 第七十一轮：自解码失败时不再只留白屏 / 日志，按 uri 取明确原因与中文提示。
      this.hdrCode = decodeFailCodeOf(uri);
      this.hdrHint = decodeFailHintOf(uri, 0, 0);
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
    // 第六十八轮：切图 / resize / 全屏 / 档位升级的共同落点 —— 一次系统 native AA 精炼。
    this.ensureViewSysPx(uri, best.px, token);
    // 第九十九轮：解码落地 → 判一次「图 vs 图框」，不够大就走 Core Vision Kit 超分。
    // 放在这里而不是渲染路径：低频、只跑一次、失败无副作用（画面继续用 best.px）。
    this.maybeSuperResolve(uri, best.px, token);
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

  /** 第六十二轮：主预览的有效 GPU 缩放比 = (画布长边 / 解码长边) × zoom。
   *  viewEdge() 是 1.5×（普通）/ 2.0×（全屏）oversampling 档位，所以 zoom=1 时
   *  实际比例约 0.67 / 0.50 —— GPU 一直在**缩小**，正是 Cubic 负 lobe 振铃的输入条件。 */
  private previewScale(): number {
    return rqScaleOf(this.viewEdge(), this.canvasW, this.canvasH, this.zoom);
  }

  /** 第六十二轮：按有效比例动态选插值档（三处清晰图源共用的唯一画质出口）。
   *  放大 / 1:1 → High(Cubic)；轻微缩小 → Low(双线性，无负 lobe，消波纹且不发糊)；
   *  极端缩小（<0.4×）→ Medium(MipMap 预滤波)。放大镜层的 loupeInterpolation() 逐字未动。 */
  private previewInterpolation(): ImageInterpolation {
    const tier: number = rqInterpolationOf(this.previewScale(),
      RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR);
    if (tier === RQ_MIPMAP) {
      return ImageInterpolation.Medium;
    }
    if (tier === RQ_LOW) {
      return ImageInterpolation.Low;
    }
    return ImageInterpolation.High;
  }

  /** 第六十二轮：PixelMap 边缘 AA 默认关闭（since 23），主预览四个图源统一开启。
   *  只改 GPU 采样属性，不改尺寸 / 位置 / 解码档位 / 缓存，无新增解码，无位置偏移。 */
  private previewAntialias(): boolean {
    return rqAntialiasOf(this.previewScale());
  }

  // ---- 第六十八轮：右侧主预览 resize 最高质素（系统 native 级 AA 精炼决策）----

  /** 本帧画质决策：AA 档只认「逻辑缩放比 + 内容种类 + 运行时能力」，
   *  密度只进像素预算 ⇒ 不同 DPI 屏在同一倍率下落同一档、视觉稳定一致。 */
  private viewSysAa(uri: string): number {
    return vqAaLevelOf(this.previewScale(), vqKindOf(uri), this.viewCap);
  }

  /** 主预览统一图源出口：系统级 AA 精炼产物优先（uri 对账），否则 R62 自解码图源。
   *  ⚠️ @Builder 内只做只读选择，不触发任何解码 / 缩放 / 状态写入。 */
  private viewDisplayPx(uri: string): image.PixelMap {
    // 第九十九轮：超分产物优先级最高 —— 它是唯一「按图框需求补出真实像素」的图源；
    // 系统 AA 精炼产物只是重采样，像素量并没有增加。两者都用 uri 对账，防止串图。
    if (this.viewSrPx !== undefined && this.viewSrUri === uri) {
      return this.viewSrPx!;
    }
    if (this.viewSysPx !== undefined && this.viewSysUri === uri) {
      return this.viewSysPx!;
    }
    return this.viewPixelMap!;
  }

  /** 释放系统级产物并作废旧代号（切图 / 退出 / 能力不足 / 预算不足 / SDK 失败）。 */
  private clearViewSysPx(): void {
    this.viewSysToken++;
    const oldSys: image.PixelMap | undefined = this.viewSysPx;
    this.viewSysPx = undefined;
    this.viewSysUri = '';
    this.viewSysEdge = 0;
    this.releaseViewSysPx(oldSys);
  }

  /** 第九十九轮：释放超分产物并作废在途请求。
   *  与 viewSysPx 同一口径：先撤 @State 引用（组件下一帧就不再引用它），再 release。 */
  private clearViewSrPx(): void {
    this.viewSrToken++;
    this.viewSrUri = '';
    this.viewSrEdge = 0;
    const oldSr: image.PixelMap | undefined = this.viewSrPx;
    this.viewSrPx = undefined;
    if (oldSr !== undefined) {
      try {
        oldSr.release();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'sr release skipped');
      }
    }
  }

  /** 第九十九轮：按需超分 —— **先比较「图 vs 图框」，再决定是否调用 Core Vision Kit**。
   *
   *  触发链路：loadViewNow() 解码落地 → 这里读解码产物尺寸 → superResPlanOf 出结论 →
   *  只有 `SR_RUN` 才把图交给 SuperResolutionService（能力封装）→ 成功后设为最高优先图源。
   *
   *  为什么在这里判、而不是在渲染里判：
   *   渲染是每帧都跑的，超分是几百毫秒的重活；必须在「解码落地」这种低频时机做一次决策，
   *   并把结论缓存成 `viewSrKeyDone`（uri@目标档位），否则窗口缩放抖动会反复触发推理。
   *
   *  刻意**不在**这些场景触发（都能被下一帧的普通路径覆盖，不影响正确性）：
   *   · `textMode`：显示的不是图片；
   *   · `playing` / `slideBlending`：幻灯片在换图与交叉淡化，不要和淡化抢 NPU/内存（R97 的教训）；
   *   · 只读名单态：连原图都可能打不开，不做额外推理。
   */
  private maybeSuperResolve(uri: string, px: image.PixelMap, token: number): void {
    if (this.textMode || this.playing || this.slideBlending) {
      return;
    }
    // 第一百零六轮：「超分辨模式」总开关关闭 → 一律不触发（已上屏的产物由切换动作释放）。
    if (!this.srMode) {
      return;
    }
    let info: image.ImageInfo | undefined = undefined;
    try {
      info = px.getImageInfoSync();
    } catch (e) {
      return;
    }
    if (info === undefined || info.size === undefined) {
      return;
    }
    const srcW: number = Number(info.size.width) || 0;
    const srcH: number = Number(info.size.height) || 0;
    // 「图框所需尺寸」用与解码同一套口径算，但**不夹源图上限**，否则永远算不出差多少。
    const needEdge: number = superResNeedEdgeOf(this.viewEdge(), this.canvasW, this.canvasH,
      this.zoom, DISPLAY_HEADROOM);
    const plan: SuperResPlan = superResPlanOf(srcW, srcH, needEdge);
    if (plan.action !== SR_RUN) {
      hilog.info(DOMAIN, TAG, 'sr plan %{public}s src=%{public}d need=%{public}d',
        superResReasonOf(plan.action), plan.srcEdge, plan.needEdge);
      return;
    }
    const key: string = superResKeyOf(uri, plan.targetEdge);
    if (this.viewSrKeyDone === key) {
      return;                                  // 同图同档做过一次就够，别重复推理
    }
    if (this.srService === undefined) {
      this.srService = new SuperResolutionService();
    }
    const svc: SuperResolutionService = this.srService;
    const myToken: number = ++this.viewSrToken;
    hilog.info(DOMAIN, TAG,
      'sr run src=%{public}d need=%{public}d target=%{public}d ratio=%{public}d/100',
      plan.srcEdge, plan.needEdge, plan.targetEdge, Math.round(plan.ratio * 100));
    svc.enhance(px, SR_TIMEOUT_MS).then((out: SuperResOutcome): void => {
      // 期间切了图 / 已释放 → 结果作废，**必须由这里负责释放**，否则每次迟到都漏一张大图
      if (myToken !== this.viewSrToken || token !== this.curToken) {
        if (out.pixelMap !== undefined) {
          try {
            out.pixelMap.release();
          } catch (e) {
            hilog.warn(DOMAIN, TAG, 'sr stale release skipped');
          }
        }
        return;
      }
      const op: image.PixelMap | undefined = out.pixelMap;
      if (op === undefined) {
        // 初始化失败 / 服务异常 / 超时：**静默降级**，画面继续用原图（GPU 放大），一行状态都不打扰用户
        hilog.info(DOMAIN, TAG, 'sr skip reason=%{public}s cost=%{public}dms',
          out.reason, out.elapsedMs);
        return;
      }
      let oi: image.ImageInfo | undefined = undefined;
      try {
        oi = op.getImageInfoSync();
      } catch (e) {
        oi = undefined;
      }
      const outW: number = oi !== undefined && oi.size !== undefined ? (Number(oi.size.width) || 0) : 0;
      const outH: number = oi !== undefined && oi.size !== undefined ? (Number(oi.size.height) || 0) : 0;
      if (!superResAcceptOf(outW, outH, plan.srcEdge, SR_MIN_GAIN)) {
        try {
          op.release();                        // 没有真实增益：不采用，也不占内存
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'sr weak release skipped');
        }
        hilog.info(DOMAIN, TAG, 'sr reject out=%{public}dx%{public}d src=%{public}d',
          outW, outH, plan.srcEdge);
        return;
      }
      const oldSr: image.PixelMap | undefined = this.viewSrPx;
      // 第一百轮：**先写 uri / 长边，最后写 @State 的 pixelMap**。
      // 标记的显隐读的是「px 存在 且 uri 对得上 且 长边 > 0」，三者在同一次赋值里必须一致；
      // 把 @State 放最后，重建时读到的永远是这套完整值，不会出现「有图但 uri 还是空」→ 标记闪一下才出。
      this.viewSrUri = uri;
      this.viewSrEdge = Math.max(outW, outH);
      this.viewSrKeyDone = key;
      this.viewSrPx = op;
      if (oldSr !== undefined && oldSr !== op) {
        try {
          oldSr.release();
        } catch (e) {
          hilog.warn(DOMAIN, TAG, 'sr old release skipped');
        }
      }
      hilog.info(DOMAIN, TAG,
        'sr applied %{public}dx%{public}d (src %{public}dx%{public}d need=%{public}d) cost=%{public}dms',
        outW, outH, srcW, srcH, plan.needEdge, out.elapsedMs);
    });
  }

  private releaseViewSysPx(px: image.PixelMap | undefined): void {
    if (px === undefined) {
      return;
    }
    try {
      px.release();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'view R68 release skipped');
    }
  }

  /** 切图 / resize / 全屏 / 档位升级的共同落点（loadViewNow 成功后调用）。
   *  能力懒探测一次 → 一次系统 native AA 精炼 → token 对账接手；
   *  失败 / 能力不足 / 预算不足 / 无真实增益都留在 R62 组件级链，绝不空白、绝不花屏。
   *  精炼倍率只由内容种类决定、不吃 zoom ⇒ resize 抖动时产物密度恒定、跨帧稳定。 */
  private ensureViewSysPx(uri: string, px: image.PixelMap, token: number): void {
    if (!this.viewCapProbed) {
      this.viewCap = loupeCapabilityOf(px) >= LQ_CAP_SYSTEM_AA
        ? VQ_CAP_SYSTEM_AA : VQ_CAP_COMPONENT;
      this.viewCapProbed = true;
    }
    const scale: number = this.previewScale();
    const kind: number = vqKindOf(uri);
    if (!vqSystemWantedOf(scale, kind, this.viewCap, VQ_NEAR_ONE_TOL)) {
      this.clearViewSysPx();
      return;
    }
    const factor: number = vqRefineFactorOf(kind, VQ_MAX_FACTOR);
    const srcW: number = this.imgW;
    const srcH: number = this.imgH;
    const srcLong: number = Math.max(srcW, srcH);
    const target: number = Math.round(srcLong * factor);
    const allowed: boolean = vqScaleAllowedOf(srcW, srcH, factor, this.viewCap,
      VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE);
    if (!allowed || !vqHasGainOf(target, srcLong, VQ_MIN_GAIN)) {
      this.clearViewSysPx();
      return;
    }
    if (!vqShouldRebuildOf(this.viewSysEdge, target, VQ_STABLE_MIN_DELTA) &&
      this.viewSysUri === uri) {
      return; // 同图同档：稳定阈值内不重算，跨帧一致、不引入卡顿
    }
    const aa: number = this.viewSysAa(uri);
    const scene: number = vqSceneOf(scale, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR);
    const tier: number = vqConsistentTierOf(scale, this.loupeDensityOf());
    this.viewSysUri = uri;
    this.viewSysEdge = target;
    const sysToken: number = ++this.viewSysToken;
    viewSystemScaledPx(px, factor, aa, this.viewCap).then(
      (scaled: image.PixelMap | undefined): void => {
        if (sysToken !== this.viewSysToken || token !== this.curToken) {
          this.releaseViewSysPx(scaled); // 迟到作废结果不接手、不泄漏
          return;
        }
        if (scaled === undefined) {
          this.clearViewSysPx(); // SDK 缩放失败：静默回退 R62 组件级链
          return;
        }
        const oldSys: image.PixelMap | undefined = this.viewSysPx;
        this.viewSysPx = scaled;
        this.releaseViewSysPx(oldSys);
        hilog.info(DOMAIN, TAG,
          'view R68 cap=%{public}d scene=%{public}d aa=%{public}d tier=%{public}d factor=%{public}d',
          this.viewCap, scene, aa, tier, Math.round(factor * 100));
      });
  }

  /** 左右页共用的显示档位判据（纯函数在 ViewPlan，可 Node 单测）。
   *  srcLong = 原图长边；<= 0 表示未知。左右页、全清升级、尺寸变化重解全部走这里，
   *  从根上杜绝「一边 1536、一边 1800」的档位差。 */
  private displayEdge(srcLong: number): number {
    return displayEdgeOf(this.viewEdge(), this.canvasW, this.canvasH,
      this.zoom, DISPLAY_HEADROOM, srcLong);
  }

  /** 「已解码数据够不够直接上屏」的判据（第七轮）。
   *  与 displayEdge() 的区别：后者是**解码目标**（含 1.5×~2× oversampling），
   *  前者只按当前画布 × zoom 实际要显示的像素算。命中缓存时用前者判断，
   *  已解码数据够清晰就直接上屏，不必为了 oversampling 再把同一张图重解一遍。 */
  private reuseEdge(srcLong: number): number {
    return reuseEdgeOf(this.canvasW, this.canvasH, this.zoom, DISPLAY_HEADROOM, srcLong);
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
    // 本次重解用的就是当前画布，记成下一次 resize 的**累积判据**基准。
    this.lastReloadW = this.canvasW;
    this.lastReloadH = this.canvasH;
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

  /** 普通拖窗口 resize 的**节流**重解：拖动过程中每 RESIZE_RELOAD_THROTTLE_MS 按当前画布重解一次。
   *
   *  2026-11-12 第五轮：原来用防抖（每次尺寸变化都 clearTimeout 重挂），
   *  用户只要一直拖着，计时器永远不到点，重解一次都不会发生 —— 实机「resize 没反应」。
   *  改成节流：已有计时器就不重挂，到点按**当时**的 canvasW/H 重解；拖动的最后一帧
   *  之后还会再来一次尺寸回调，自然补上最终尺寸（配合累积判据不会漏）。
   *  布局层由 @State 直接驱动本来就实时，这里补的是「按新画布档位重新解码」，
   *  不每帧解码是为了避免拖窗口时反复解码大图把 UI 卡死。 */
  private armResizeReload(): void {
    if (this.resizeReloadTimer !== -1) {
      return; // 节流：本轮已有重解排队，别重挂
    }
    this.lastReloadW = this.canvasW;
    this.lastReloadH = this.canvasH;
    this.resizeReloadTimer = setTimeout(() => {
      this.resizeReloadTimer = -1;
      this.refreshForCanvasResize();
    }, RESIZE_RELOAD_THROTTLE_MS);
  }

  private clearResizeReload(): void {
    if (this.resizeReloadTimer !== -1) {
      clearTimeout(this.resizeReloadTimer);
      this.resizeReloadTimer = -1;
    }
  }

  /** 第八十八轮：退出全屏后的「布局落定确认」。
   *
   *  ⚠️ 这里**绝不能再 `fitToWindow()`**（R82 的写法）：退出已经把 zoom/tx/ty 恢复成
   *  进入全屏前的值，再 fit 一次就等于「恢复完又缩回去」，正是本轮要修的现象，
   *  而且会表现为「先恢复、260ms 后再跳一下」的两段式缩放跳变。
   *
   *  只做两件事：
   *   · 画布与上次重解基准差 ≥ RESIZE_MIN_DELTA_PX 时，按**当前**画布与倍率重解码（保清晰度）；
   *   · 打一条恢复日志，真机核对「退出后是否真的保持倍率」时最直接的证据。
   *  zoom / tx / ty 一律不碰。 */
  private armFullExitRefit(): void {
    if (this.fullExitRefitTimer !== -1) {
      clearTimeout(this.fullExitRefitTimer);
    }
    this.fullExitRefitTimer = setTimeout(() => {
      this.fullExitRefitTimer = -1;
      if (!this.pageAlive || this.fullscreen) {
        return;
      }
      // 第九十二轮：先把被异步加回来的装饰关掉，再谈重解（否则按小画布解一遍白解）。
      this.reassertDecor();
      if (shouldReloadOnResize(this.lastReloadW, this.lastReloadH,
          this.canvasW, this.canvasH, RESIZE_MIN_DELTA_PX)) {
        this.pendingReload = false;
        this.clearCanvasReloadFallback();
        this.refreshForCanvasResize();
      }
      // 第八十九轮：落定后**再确认一次视图**。退出瞬间到布局落定之间可能夹着迟到事件
      //  （捏合残余 / 轴事件 / 画布回调后的重排），任何一次都会把刚恢复的倍率改掉；
      //  这里以「退出时记下的目标视图」为准再写一次（幂等：值相同不触发重绘）。
      if (this.exitViewValid) {
        const drift: boolean = (this.zoom !== this.exitViewZoom) ||
          (this.tx !== this.exitViewTx) || (this.ty !== this.exitViewTy);
        if (drift) {
          hilog.info(DOMAIN, TAG, 'full exit drift fixed: %{public}s', this.viewDiagOf());
          this.zoom = this.exitViewZoom;
          this.tx = this.exitViewTx;
          this.ty = this.exitViewTy;
        }
      }
      // 第八十九轮：把恢复后的缩放百分比补进状态栏（每次退出只补一次）。
      // 真机上不必再靠肉眼比大小 —— 状态栏直接给出与进入前相同的百分比即为一致。
      if (!this.exitViewNoted) {
        this.exitViewNoted = true;
        this.status = this.status + ' · 缩放 ' + this.zoomPercentText();
      }
      hilog.info(DOMAIN, TAG, 'full exit settle: %{public}s', this.viewDiagOf());
    }, FULL_EXIT_REFIT_MS);
  }

  /** 第九十一轮：退出 1.5s 后再采一次画布（纯诊断）。
   *
   *  为什么需要：`full exit settle` 在 ESC 后 260ms 打，此时 `applyWindowFullScreen(false)`
   *  那串异步窗口调用（recover / maximize / decor 恢复）未必走完；若画布此后还在变，
   *  260ms 读到的是**中间态**，不能当成稳态证据。这条延迟采样用来区分：
   *   · settle2 的 canvas 与 settle 相同 → 稳态就是小 37vp，要查窗口/装饰谁占了它；
   *   · settle2 的 canvas 回到 enter 的值 → 只是瞬态，修法是「等画布稳定再落定」。 */
  private armFullExitSample(): void {
    if (this.fullExitSampleTimer !== -1) {
      clearTimeout(this.fullExitSampleTimer);
    }
    this.fullExitSampleTimer = setTimeout(() => {
      this.fullExitSampleTimer = -1;
      if (!this.pageAlive || this.fullscreen) {
        return;
      }
      this.reassertDecor();
      hilog.info(DOMAIN, TAG, 'full exit settle2: %{public}s', this.viewDiagOf());
    }, FULL_EXIT_SAMPLE_MS);
  }

  /** 预载档位：按画布尺寸动态取，向上量化到 PRELOAD_QUANT 的倍数。
   *  全屏时上限放宽到 FULLSCREEN_PRELOAD_MAX_EDGE（普通态 1536），让前后 100 张也跟着画布放大。
   *  ⚠️ 必须是 ceil 不是 floor：向下量化会让档位小于屏幕实际像素，命中缓存还得再解一次全清。
   *
   *  第七轮：再用 decodeEdgeOf() 抬到「当前画布可直接显示」的档位（夹在
   *  PRELOAD_DECODE_MAX_EDGE / FULLSCREEN_PRELOAD_MAX_EDGE 内控内存）。
   *  这样每张图**只在载入时的后台预载链里解一次**，滚轮切到任意一张都直接复用
   *  已解码 PixelMap 上屏，切图路径不再启动解码 —— 这正是「不得在滚轮切换时才开始解码」。 */
  private preloadEdge(): number {
    const base: number = preloadEdgeOf(this.canvasW, this.canvasH, this.fullscreen,
      PRELOAD_EDGE_FACTOR, PRELOAD_QUANT, PRELOAD_MIN_EDGE, PRELOAD_MAX_EDGE,
      FULLSCREEN_PRELOAD_MAX_EDGE);
    const cap: number = this.fullscreen ? FULLSCREEN_PRELOAD_MAX_EDGE : PRELOAD_DECODE_MAX_EDGE;
    return decodeEdgeOf(base, this.displayEdge(0), cap);
  }

  /** 启动后台预载。已在跑就只自增代号，让现有链自动跟到最新位置，避免并发多条链。
   *
   *  2026-11-11 第四轮：PRELOAD_ALL=true 时改走**全量并发链**（startAllPreload），
   *  一次铺满整库、位置变化不打断；false 时保留旧「前后 100 张窗口链」作回退。 */
  private schedulePreload(): void {
    // 只读名单态：不启动预载链（逐张 decodePx 全是死 uri，会把主线程打满）。
    // ⚠️ 这是 ro1 防冻结的总闸门，全量缓存也绝不绕过。
    if (!bulkIoAllowed(this.restoreMode)) {
      this.preloadBusy = false;
      return;
    }
    if (PRELOAD_ALL) {
      this.startAllPreload();
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

  /** 全量预载：一次生成整库顺序，按受控并发一批批解码（载入时即开始，滚轮跳到哪都命中）。
   *  位置变化（滚轮 / 翻页）不重置链 —— 固定顺序与当前位置无关，链继续铺就是最快；
   *  只有换数据源由 clearPreviews() 自增 allSeq 作废旧批次。 */
  private startAllPreload(): void {
    // 链已在跑且只是位置变化 → 不打断、不重排（shouldResetPreloadChain 给出判据）。
    if (this.allBusy && !shouldResetPreloadChain(PRELOAD_ALL, false)) {
      return;
    }
    if (this.allComplete) {
      return; // 整库已铺满：翻页 O(1) 短路
    }
    const n: number = this.items.length;
    if (n <= 1) {
      return;
    }
    const cap: number = fullCacheTargetOf(n, PRELOAD_ALL_CAP);
    if (preloadSaturated(this.previews.length, this.preloadBytes, cap, PRELOAD_MAX_BYTES)) {
      return; // 预算触顶收工，防「解→淘汰→再解」死循环
    }
    this.allOrder = fullPreloadIndex(n, this.cur);
    this.allFrom = 0;
    this.allDone = new Set<number>();
    // 已经缓存 / 已判失败的先标 done，避免重复解码
    for (let i = 0; i < n; i++) {
      const u: string = this.items[i].uri;
      if (this.previewEntry(u) !== undefined || this.failed.has(u)) {
        this.allDone.add(i);
      }
    }
    this.allBusy = true;
    const seq: number = ++this.allSeq;
    this.pumpAll(seq);
  }

  /** 一批最多 PRELOAD_CONCURRENCY 张同时解码；整批落地后 setTimeout 让出主线程再灌下一批。
   *  受控并发仍关键：第二十七轮后读链路已真异步（不会再 THREAD_BLOCK_6S），
   *  但一次并发几百个在途 IO / ArrayBuffer 仍会打满内存与 IO 队列，故保留分批。 */
  private pumpAll(seq: number): void {
    if (seq !== this.allSeq) {
      this.allBusy = false;
      return; // 换数据源：旧批次作废
    }
    if (!bulkIoAllowed(this.restoreMode)) {
      this.allBusy = false;
      return;
    }
    const n: number = this.items.length;
    const cap: number = fullCacheTargetOf(n, PRELOAD_ALL_CAP);
    if (preloadSaturated(this.previews.length, this.preloadBytes, cap, PRELOAD_MAX_BYTES)) {
      this.allBusy = false;
      hilog.info(DOMAIN, TAG, 'all preload: budget reached, cached %{public}d', this.previews.length);
      return;
    }
    const conc: number = preloadConcurrencyOf(n, PRELOAD_CONCURRENCY);
    // 第十二轮：按当前 items 长度夹掉旧 order 里的越界下标（换源竞态第一道闸）。
    const batch: PreloadBatch = preloadBatchBoundedOf(this.allOrder, this.allFrom, conc,
      this.allDone, n);
    this.allFrom = batch.nextFrom;
    if (batch.picks.length === 0) {
      this.allBusy = false;
      this.allComplete = true;
      hilog.info(DOMAIN, TAG, 'all preload: complete, cached %{public}d/%{public}d',
        this.previews.length, n);
      return;
    }
    // 第十二轮：第二道闸 —— 下标合法也可能已被换源掏空。先逐个验完再定 allActive，
    // 否则漏调 preloadOne 会让这批永远等不到收齐，整条链假死。
    const valid: number[] = [];
    for (let i = 0; i < batch.picks.length; i++) {
      const idx: number = batch.picks[i];
      const it: ImageItem | undefined = this.items[idx];
      // uri 声明为必填 string，直接写 it.uri !== undefined 在 ArkTS 严格模式下会
      // 触发「类型无重叠」(TS2367)；先转成显式可空局部，类型与运行时防御都成立。
      const u: string | undefined = it !== undefined ? it.uri : undefined;
      if (u !== undefined && u.length > 0) {
        valid.push(idx);
      }
    }
    if (valid.length === 0) {
      this.allBusy = false;
      this.allComplete = true;
      return;
    }
    this.allActive = valid.length;
    const edge: number = this.preloadEdge();
    // 第八轮：解码前先把这一批的原始档案数据读进内存（rawPrefetchWanted 仍守 ro1 闸门）。
    // 读与解走同一条受控并发链，保证「刚读进来的立刻被解」的局部性；另起一条预取链
    // 会先把预算占满，解码链反而要回网络重读，得不偿失。
    const wantRaw: boolean = rawPrefetchWanted(bulkIoAllowed(this.restoreMode),
      n, RAW_CACHE_MAX_COUNT);
    for (let i = 0; i < valid.length; i++) {
      const idx: number = valid[i];
      const u: string = this.items[idx].uri;
      this.preloadOne(seq, idx, u, edge, wantRaw);
    }
  }

  /** 单张全量预载：档案数据载入内存 → 立即解码 → 入已解码 PixelMap 缓存。
   *
   *  · 已解码缓存命中且档位够 → 直接复用，既不读文件也不再解码（滚轮切图零解码）；
   *  · 否则先 ensure 把完整 bytes 读进内存，decodePx 再从 ArrayBuffer 解码；
   *  · ensure 失败也照常 decodeTo（内部降级 fd），绝不因缓存问题丢图；
   *  · 整条链由 applyItems() → schedulePreload() 在**载入时**启动，绝不等滚轮切换才开始。 */
  private preloadOne(seq: number, idx: number, uri: string, edge: number,
    wantRaw: boolean): void {
    const hit: PreviewEntry | undefined = this.previewEntry(uri);
    const needRaw: boolean = wantRaw &&
      (hit === undefined || !shouldReuseDecoded(hit.edge, edge));
    const job: Promise<PreviewEntry | undefined> = needRaw
      ? rawStore.ensure(uri)
        .then((): Promise<PreviewEntry | undefined> => this.decodeTo(uri, edge))
      : this.decodeTo(uri, edge);
    job.then((entry: PreviewEntry | undefined) => {
      this.onAllDecoded(seq, idx, uri, entry);
    }).catch(() => {
      this.onAllDecoded(seq, idx, uri, undefined);
    });
  }

  /** 全量链单张解码落地：入缓存 / 记黑名单，整批收齐后让出主线程继续下一批。 */
  private onAllDecoded(seq: number, idx: number, uri: string,
    entry: PreviewEntry | undefined): void {
    if (seq !== this.allSeq) {
      // 换源：旧结果丢弃；复用 / 合并来的那张归缓存，不能直接 release。
      this.releaseUncachedEntry(entry);
      return;
    }
    this.allDone.add(idx);
    if (entry !== undefined) {
      this.pushPreview(entry);
    } else {
      this.failed.add(uri);
      this.probeFail++;
    }
    this.allActive--;
    if (this.allActive <= 0) {
      setTimeout(() => {
        this.pumpAll(seq);
      }, PRELOAD_ALL_YIELD_MS);
    }
  }

  /** 一张一张解码，每张之间用 setTimeout 让出主线程，避免卡住 UI */
  private preloadNext(seq: number): void {
    if (seq !== this.preloadSeq) {
      this.preloadNext(this.preloadSeq); // 跟到最新位置继续跑
      return;
    }
    const n: number = this.items.length;
    if (n <= 0) {
      this.preloadBusy = false;
      return; // 第十二轮：空列表时 wrapIndex 会返回 NaN，别让窗口链读 undefined.uri
    }
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
  /** 第五十六轮：uri → 原始宽高。并排决策只看左图尺寸，右图尺寸不再参与；
   *  探测回来后由 probeOne → refreshSpread 重算，尺寸未知一律保守单页。 */
  private probeSize: Map<string, Size2> = new Map<string, Size2>();
  private spreadSeq: number = 0;

  /** 读回当前对开右页。pageLabel / UI 都从这里取，保证与 @State 一致。 */
  private spreadRight(): number {
    return this.spreadB;
  }

  /** 重算对开配对（第五十六轮）：**以左侧图片比例为准**。
   *   · 左图 portrait（h>w）→ 只要还有可配对的另一张，就保留右侧预览图并显示在右侧；
   *     右图是 landscape / portrait / square 一律不参与判断。
   *   · 左图 landscape / square / 尺寸未知 → 不显示右页，仅将左图置于中间（单页居中）。
   *
   *  第八十七轮：右页下标改为**环形配对**（`spreadPairIndexOf`）——
   *    · 最后一张与第一张配对（`cur = n-1` → 右页 `0`），边界处仍是完整并排，不空白、不塌成单页；
   *    · 与 `go()` 的环形翻页 `((cur+delta)%n+n)%n` 同口径，翻页方向一直向前，不会在末尾「卡住」；
   *    · 单张 / 两页同 uri（重复条目）/ 非法下标 ⇒ 判为无右页，退回单页（避免同一张图左右各画一次）。
   *
   *  真值源是 ViewPlan.spreadRightWantedOf()（签名刻意不接收右图形态参数）
   *  与第八十七轮新增的 spreadPairIndexOf / spreadPairOkOf。
   *  本函数只负责取左图尺寸、维护 spreadB 与右页解码链；既有翻页步长 go(±1)、
   *  右页解码 / 重试、放大镜、文本预览、目录恢复全部不动。 */
  private refreshSpread(): void {
    // 第九十八轮：播放期间**按进入时的快照**决定要不要配对，不再看 playing 一律收单页。
    //  · 快照为「并排」→ 继续走正常配对（下面把模式临时当 SPREAD 用，横图也保持并排）；
    //  · 快照为「单张」→ 收单页，连右页解码都不发起。
    // 之所以在这里判而不只靠 spreadShown()：右页要不要解码也必须一致，否则并排时会缺半页。
    if (this.playing && !this.slideSpreadHold) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
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
    // 第八十七轮：右页下标改为**环形配对** —— 最后一张与第一张配对（与 go() 的环形翻页同口径）。
    // 单张 / 同 uri 重复条目 / 非法下标由纯函数判为「没有可配对的右页」⇒ 退回单页，
    // 绝不让「同一张图左右各画一次」这种衔接异常出现。
    const pair: number = spreadPairIndexOf(this.cur, this.items.length);
    const sameUri: boolean = pair >= 0 && this.items[pair].uri === self;
    const paired: boolean = spreadPairOkOf(this.cur, pair, this.items.length, sameUri);
    const hasNext: boolean = paired;
    const sz: Size2 = this.leftImageSize(self, seq);
    // 第七十六轮：自动模式原样沿用 R56 判据（零回归）；单张强制关右页；
    // 并排只要有可配对的另一张就强制开右页（尺寸未知也能并排），三者由纯函数统一收口。
    // 第九十八轮：播放中且快照为并排 → 临时按 SPREAD 口径判（有下一张就并排），
    // 这样「横图紧随竖图」时也不会突然塌成单页；不播放时仍用用户真实模式，零改动。
    const pairMode: number = (this.playing && this.slideSpreadHold) ? PM_MODE_SPREAD : this.previewMode;
    const wanted: boolean = pmSpreadWantedOf(pairMode, hasNext,
      spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT));
    if (!wanted) {
      this.spreadB = -1;
      this.clearRightPage();
      return;
    }
    this.spreadB = pair;
    this.loadRightPage(this.items[this.spreadB].uri);
  }

  /** 左图原始宽高：优先已解码条目（PreviewEntry.w/h 是原图像素），其次元数据探测缓存；
   *  都没有时异步探一次，结果由 probeOne → refreshSpread 重算。本次返回 0×0，
   *  spreadRightWantedOf 会把「尺寸未知」保守判成单页，绝不误开右页。 */
  private leftImageSize(uri: string, seq: number): Size2 {
    const e: PreviewEntry | undefined = this.previewEntry(uri);
    if (e !== undefined && e.w > 0 && e.h > 0) {
      const hit: Size2 = { w: e.w, h: e.h };
      return hit;
    }
    const cached: Size2 | undefined = this.probeSize.get(uri);
    if (cached !== undefined) {
      return cached;
    }
    this.probeOne(uri, seq);
    const unknown: Size2 = { w: 0, h: 0 };
    return unknown;
  }

  /** 是否竖图（第五十六轮起**不参与并排决策**，仅保留作诊断 / 单张形态查询）。
   *  优先查缓存，再查已解码的预载缓存，都没有才异步探元数据。
   *  并排右页只由 refreshSpread → spreadRightWantedOf(左图尺寸) 决定，右图形态不再被查询。 */
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
      // 第八轮：原始档案数据已在内存就直接用它探元数据，NAS 上少一次跨网络建源。
      const raw: ArrayBuffer | undefined = rawStore.get(uri);
      const src: image.ImageSource = raw !== undefined
        ? image.createImageSource(raw) : image.createImageSource(uri);
      src.getImageInfo(0)
        .then((info: image.ImageInfo) => {
          const portrait: boolean = info.size.height > info.size.width;
          this.probeCache.set(uri, portrait);
          const dim: Size2 = { w: info.size.width, h: info.size.height };
          this.probeSize.set(uri, dim);
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
          const zeroDim: Size2 = { w: 0, h: 0 };
          this.probeSize.set(uri, zeroDim);
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
      const zeroDim2: Size2 = { w: 0, h: 0 };
      this.probeSize.set(uri, zeroDim2);
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
      // R32：只把带 scheme 的干净 picker URI 交给系统文件管理器。APP 内部拼出的
      // 纯路径 / 父 URI 会被系统当成「文件夹名」去查找，找不到就弹误报提示。
      const start: string = folderPickStartOf(dirUri, this.pickRootUri, this.savedDirUri);
      if (start.length > 0) {
        opt.defaultFilePathUri = start;
      }
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
    this.clearEnterWatchdog(); // 用户已接手（含超时自动打开），恢复看门狗不再需要
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
      // R32：显式给系统文件管理器一个有效起点。启动恢复失败自动弹窗时
      // browseDir / pickRootUri 都为空，savedDirUri（上次 picker 返回的原始 URI）
      // 会把系统从「失效的最近页面」拉回真实目录，底部「文件夹」名字框不再是空的
      // —— 那正是「不存在该名字的文件夹」误报的触发条件。纯路径 / 纯名字 /
      // 控制字符 / P1: 前缀一律不设起点，绝不把脏串塞给系统。
      const start: string = folderPickStartOf(this.browseDir, this.pickRootUri, this.savedDirUri);
      if (start.length > 0) {
        opt.defaultFilePathUri = start;
        hilog.info(DOMAIN, TAG, 'chooseFolder start=%{public}s', start);
      }
      dv.select(opt)
        .then((uris: Array<string>) => {
          const kind: number = pickedFolderKind(uris);
          if (kind !== FOLDER_PICK_OK) {
            // 未选择 / 系统只回了一个「名字」：给明确提示，绝不写持久授权、
            // 绝不清死路径记忆、也不动视图，让用户重新选一次。
            this.status = folderPickHint(kind);
            hilog.warn(DOMAIN, TAG, 'chooseFolder unusable pick, kind=%{public}d', kind);
            return;
          }
          const picked: string = uris[0];
          hilog.info(DOMAIN, TAG, 'chooseFolder picked uri=%{public}s', picked);
          // 第十轮 ff1：用户已经重新选到目录 → 死路径记忆立刻作废，
          // 下次启动正常恢复，绝不因为这个标记一直被动弹选择器。
          this.saveDeadTag('');
          // 这是 picker 授予的**原始目录 URI**：立刻建立持久授权，
          // 下次重开就能直接出图，不必再选一次文件夹。fire-and-forget，不挡列目录。
          this.persistFolderUri(picked);
          this.pickRootUri = picked; // 只作 picker 起点，不参与父级推算
          // R32：openFolder 返回 Promise<boolean>，不再丢弃结果。
          // false 时它自己已给出「无法列出该目录 · …；可点「选择文件夹」重新选择」，
          // 这里只补日志，绝不覆盖更具体的错误原因；只有抛异常才补统一提示。
          this.openFolder(picked, false)
            .then((ok: boolean) => {
              if (!ok) {
                hilog.warn(DOMAIN, TAG, 'chooseFolder picked folder not readable');
              }
            })
            .catch((e: Object) => {
              this.status = folderPickHint(FOLDER_PICK_UNREADABLE);
              hilog.error(DOMAIN, TAG, 'chooseFolder open rejected: %{public}s', JSON.stringify(e));
            });
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
    isRescan?: boolean, extraForms?: string[], fullExplore?: boolean): Promise<boolean> {
    // 第四十三轮（用户导航抢占）：在途列举不再吞掉用户点击。用户主动导航
    // （点资料夹 / 往上层 / 重选目录，isRescan !== true）直接抢占在途列举 ——
    // 旧调用按 openEpoch 作废，结果落地前整段丢弃；自动重扫（isRescan）不抢
    // 别人也不被抢，保持原「让路」语义。R42 缓存秒开让「列表已显示、后台还在
    // 核对」成为常态，NAS 上核对动辄数秒，不抢占 = 点资料夹像没反应。
    if (this.folderBusy && isRescan === true) {
      return false; // 自动重扫：用户操作在途，让路（原行为）
    }
    const myEpoch: number = ++this.openEpoch;
    if (this.folderBusy) {
      hilog.info(DOMAIN, TAG, 'openFolder: preempt in-flight listing, new=%{public}s', dirUri);
    }
    this.folderBusy = true;
    try {
      const keepUri: string = this.cur >= 0 ? this.items[this.cur].uri : '';
      // 第四十二轮（网盘秒开）：非重扫的进目录 / 往上层，若整表缓存里有这一层，
      // 先用缓存 rows 立即渲染（零 IO、零等待），真实列举继续在后台跑。
      // 自动重扫（isRescan）不走这里 —— 它本来就有活视图，缓存渲染只会闪一下。
      const cacheHit: DirRowsCacheEntry | undefined =
        isRescan === true ? undefined : this.findDirRowsCache(dirUri);
      const fromCache: boolean = cacheHit !== undefined;
      if (fromCache) {
        this.renderDirFromCache(cacheHit!, dirUri, resetView, keepUri);
      } else if (isRescan !== true) {
        // 点了必须看得见反应（2026-11-11 实机反馈原则）：NAS 列目录动辄数秒，
        // 先同步给一句「正在列出」，别让用户以为点击被吞了。
        this.status = '正在列出 ' + baseName(dirUri) + '…';
      }
      // picker 的 FOLDER 模式返回的 uri 形态不统一，且 URI 授权是**逐项**的：
      // 能 listFile 不代表能读子文件。逐个候选试，优先挑「子文件真能 open」的那个 base。
      let candidates: string[] = dirCandidates(dirUri);
      // 第三十六轮：用户主动「往上层」时把所有同层 parent 候选的 URI 写法
      // 一起并入探索集（upExploreFormsOf 按原名精确去重、首个优先父级排最前）。
      // 这样一次遍历就能拿到这一层全部资料夹目录；自动重扫 / 选文件夹 /
      // 点子目录都不传 extraForms，保持 R35 行为零回归。
      const wantFull: boolean = upFullExploreWanted(fullExplore === true, isRescan === true);
      if (extraForms !== undefined && extraForms.length > 0) {
        candidates = upExploreFormsOf([candidates, extraForms]);
      }
      const cap: number = wantFull
        ? upExploreCapOf(candidates.length, UP_EXPLORE_MAX_FORMS) : candidates.length;
      hilog.info(DOMAIN, TAG, 'openFolder raw=%{public}s candidates=%{public}d full=%{public}d',
        dirUri, candidates.length, wantFull ? 1 : 0);
      let base: string = '';
      let names: string[] = [];
      let childReadable: boolean = false;
      let lastErr: string = '';
      // 第三十五轮：同一目录的多个 URI 写法在逐 URI 授权下**各自只能看到一部分
      // 子目录**。旧版用覆盖式 `names = n` 只留第一份，其余候选真实列出来的兄弟
      // 目录全被丢弃 —— 表现就是「往上层只显示一个目录，没探索这一层其它目录」。
      // 这里把每次成功 listFile 的结果收集起来，循环末合并成完整清单（零新增 IO，
      // 这些 listFile 本来就会跑），再挑「看得最全」的写法做子项 URI 拼接基准。
      let exploreForms: Array<string> = [];
      let exploreGroups: Array<Array<string>> = [];
      let fallbackBase: string = '';
      // 第四十四轮（NAS 重连重试）：重启后首次访问网络目录，挂载 / 持久授权可能
      // 都还没就绪，fs.listFile 全部候选报 13900002（ENOENT）—— 实机表现就是
      // 「点资料夹 → 无法列出该目录 · 13900002」。会话内（挂载已热）不会走到这里。
      // 只对网络目录形态重试（本地 ENOENT 是真删了，快速失败），重试前静默重推
      // 一次持久授权；等待期间被新导航抢占（epoch 过期）则立即让位。
      const netRetry: boolean = isNetworkDirUri(dirUri);
      for (let attempt = 0; ; attempt++) {
        exploreForms = [];
        exploreGroups = [];
        fallbackBase = '';
        base = '';
        childReadable = false;
        for (let c = 0; c < cap; c++) {
          const cand: string = candidates[c];
          try {
            const n: string[] = await fs.listFile(cand, { recursion: false, listNum: 0 });
            hilog.info(DOMAIN, TAG, 'listFile OK [%{public}d] %{public}s → %{public}d entries',
              c, cand, n.length);
            exploreForms.push(cand);
            exploreGroups.push(n);
            if (fallbackBase.length === 0) {
              fallbackBase = cand;
            }
            if (n.length > 0 && this.probeChild(cand, n)) {
              base = cand;
              childReadable = true;
              hilog.info(DOMAIN, TAG, 'openFolder using candidate [%{public}d] %{public}s', c, cand);
              // 第三十六轮：用户主动导航绝不 early break —— 后面的 URI 写法
              // 往往还能看到别的兄弟资料夹。自动重扫保留早停，防止 NAS 放大 IO。
              if (!wantFull) {
                break;
              }
            }
          } catch (e) {
            lastErr = JSON.stringify(e);
            hilog.warn(DOMAIN, TAG, 'listFile FAIL [%{public}d] %{public}s → %{public}s',
              c, cand, lastErr);
          }
        }
        // 收口：列出来了 / 重试额度用完 / 不是 ENOENT / 不是网络目录 / 自动重扫 —— 都不再重试。
        if (base.length > 0 || exploreForms.length > 0 || attempt >= NAS_RETRY_DELAYS.length
          || lastErr.indexOf('13900002') < 0 || !netRetry || isRescan === true) {
          break;
        }
        if (myEpoch !== this.openEpoch) {
          return true;   // 重试等待期间被抢占：让位（视图已由抢占者接管）
        }
        this.status = '网络目录未就绪，正在重连（' + (attempt + 1) + '/' + NAS_RETRY_DELAYS.length + '）…';
        hilog.warn(DOMAIN, TAG, 'openFolder: ENOENT on network dir, retry %{public}d/%{public}d',
          attempt + 1, NAS_RETRY_DELAYS.length);
        await this.reactivatePersistQuiet();
        await this.nasRetryWait(NAS_RETRY_DELAYS[attempt]);
        if (myEpoch !== this.openEpoch) {
          return true;
        }
      }
      // 合并所有真实列举结果：兄弟目录一个不漏，伪行 / 隐藏点文件由纯函数过滤。
      names = mergeExploreNames(exploreGroups);
      // 第三十六轮：供 browseUp 判断「真实列举是否一无所获」，
      // 只有 0 项才允许零 IO 的 APP 内清单兜底，绝不拿缓存覆盖真实结果。
      this.lastUpExploreNames = names.length;
      if (base.length === 0) {
        // 没有「子文件可读」的命中形态：用列得最全的形态拼子项 URI，命中率最高。
        const best: string = exploreBaseOf(exploreForms, exploreGroups);
        base = best.length > 0 ? best : fallbackBase;
        if (base.length > 0) {
          // 目录能列、但子文件一个都打不开：列表照样显示，日志里说清楚是授权问题。
          hilog.error(DOMAIN, TAG,
            'openFolder: listed but NO child file can be opened (per-item URI authorization). ' +
            'base=%{public}s forms=%{public}d names=%{public}d',
            base, exploreForms.length, names.length);
        }
      }
      // 第四十三轮：列举期间被更新的用户导航抢占 —— 本调用结果整段作废，
      // 静默退出（视图已由抢占者接管），folderBusy 也归抢占者，finally 不释放。
      if (myEpoch !== this.openEpoch) {
        hilog.info(DOMAIN, TAG, 'openFolder: superseded by newer navigation, discard listing');
        return true;
      }
      if (base.length === 0) {
        // 第四十二轮：缓存已把这一层画出来了 —— 列举失败（网盘掉线 / 授权失效）
        // 也算「进来了」，保留缓存视图当离线快照用，绝不回退到上一层把它冲掉。
        if (fromCache) {
          this.status = '已显示缓存目录 · 刷新失败（' + lastErr + '）';
          hilog.warn(DOMAIN, TAG, 'openFolder: cache shown, refresh failed: %{public}s', lastErr);
          return true;
        }
        this.status = '无法列出该目录 · ' + lastErr +
          (netRetry && lastErr.indexOf('13900002') >= 0 ? '（网络目录未连接？稍候再点一次）' : '') +
          '；可点「选择文件夹」重新选择';
        hilog.error(DOMAIN, TAG, 'openFolder all candidates failed: %{public}s', lastErr);
        return false;
      }
      // 自动重扫：mtime 变了不代表条目变了（hover 缩略图解码会读文件，网盘同步目录
      // 还会写本地缓存）。条目名集合一致就只更新基准值，绝不重建列表 ——
      // 否则 applyItems 的 restoreIndex + scrollToIndex 会把用户视图拉回「上次位置」。
      if ((isRescan === true || fromCache) && this.sameDirEntries(names)) {
        // 第四十六轮：基准 mtime 改异步取（不阻塞短路返回）；被抢占的旧列举
        // 迟到的结果直接丢弃（epoch 守卫），不污染新目录的基准值。
        this.tryMtimeAsync(base).then((m0: number) => {
          if (myEpoch === this.openEpoch && m0 > 0) {
            this.dirMtime = m0;
          }
        });
        if (fromCache) {
          // 缓存视图已在线，后台核对完条目没变：视图一个像素都不动，只收掉提示。
          this.status = '目录已是最新（' + this.itemCount + ' 张）';
        }
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
      const texts: ImageItem[] = [];
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
        } else if (isTextFileName(raw)) {
          // 第三十七轮：纯文本 / 源码文件单独成行，只进 rows，**绝不进 items**。
          // 后缀白名单由 TextDoc.textLangOf() 判定；读到字节后还有 looksBinary 兜底。
          texts.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_TEXT, itemIndex: -1 });
        } else {
          others.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_OTHER, itemIndex: -1 });
        }
      }
      const cmp = (a: ImageItem, b: ImageItem): number => naturalCompare(a.name, b.name);
      dirs.sort(cmp);
      imgs.sort(cmp);
      texts.sort(cmp);
      others.sort(cmp);
      if (!this.sortAsc) {
        dirs.reverse();
        imgs.reverse();
        texts.reverse();
        others.reverse();
      }
      const rows: ImageItem[] = [];
      // 第一百零四轮：首行的「..」往上层伪行整行移除 —— 列表第一行就是真正的目录 / 图片，
      // 三按钮与列表之间不再有那两枚小点占着的空行。往上层入口保留：
      // 工具行「←」与键盘 Backspace 都走 browseUp()（到卷根给「没有父级了」提示）。
      for (let i = 0; i < dirs.length; i++) {
        rows.push(dirs[i]);
      }
      for (let i = 0; i < imgs.length; i++) {
        imgs[i].itemIndex = i;
        rows.push(imgs[i]);
      }
      for (let i = 0; i < texts.length; i++) {
        rows.push(texts[i]);
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
      // 第二十九轮：**改用本次真实列目录得到的局部 rows**，绝不再读 this.rows ——
      // this.rows 是上一屏 UI 行，APP 内清单态时里面混着「— 上层清单（APP 内）… —」
      // 说明行，旧版把它们当成真实目录名写进缓存，于是上层清单出现伪文件夹。
      // 同时按层并存快照：单槽 lastUpNames 会被下一次 openFolder 覆盖，
      // 父层那份含全部兄弟目录（2026 / 2025 / 2024 …）的清单就再也找不回来。
      this.cacheUpDirSnapshot(base, rows);
      // 第四十二轮：整表也存一份（网盘秒开缓存），条目变了的后台刷新会覆盖它。
      this.cacheDirRows(base, dirLabel, rows);
      this.inAppUpList = false;   // 这次是真列出来的目录态，不是 APP 内自建清单
      // 第十轮 ff1：任何一次「真的列目录成功」都证明路径可达 —— 死路径记忆作废。
      // 只在标记非空时写，自动重扫（每 1.5s）不会因此多写盘。
      if (this.deadMemory.length > 0) {
        this.saveDeadTag('');
      }
      this.browseDir = dirUri;
      this.browseBase = base;
      // 第四十六轮：基准 mtime 改异步取（不阻塞视图刷新）；epoch 守卫同上。
      this.tryMtimeAsync(base).then((m0: number) => {
        if (myEpoch === this.openEpoch && m0 > 0) {
          this.dirMtime = m0;
        }
      });
      this.startDirPoll();
      // 重扫时保持当前张：按 uri 找回落点，不让画面闪一下（Win64 2bcbbb1）。
      // 第四十二轮：缓存先渲染后的后台刷新同样保位 —— 用户可能已经在缓存视图里
      // 翻了几张，绝不能因为刷新完成把视图拉回第 1 张。
      this.applyItems(imgs, dirLabel, '', rows, isRescan === true || fromCache);
      if (fromCache) {
        this.status = '目录已刷新（' + imgs.length + ' 张 · ' + dirLabel + '）';
      }
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
        // 全是子文件夹、本层零图片（例如「人像」）：目录表照常列出。
        // 第七十八轮：左栏 dirHint 提示条已整体移除，这里的状态值只供状态栏 /
        // 右侧预览区空态判空使用（属另一界面区域，行为不变）。
        this.dirHint = '本层没有图片 · ' + dirs.length + ' 个子文件夹（点名称进入）' +
          (texts.length > 0 ? ' · ' + texts.length + ' 个文本文件（点名称预览）' : '');
        this.status = '目录 ' + dirLabel + '：本层没有图片 · ' + dirs.length +
          ' 个子文件夹（点文件夹进入）' +
          (texts.length > 0 ? ' · ' + texts.length + ' 个文本文件' : '') +
          ' · 支持后缀 ' + IMAGE_SUFFIXES.join(' ');
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
      // 第四十三轮：只有「当前代际」的持有者才能放锁 —— 被抢占的旧调用
      // 若在这里放锁，会把新调用正握着的 folderBusy 清掉，导致重入。
      if (myEpoch === this.openEpoch) {
        this.folderBusy = false;
      }
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

  /** 第四十六轮：mtime 探测改**异步** stat + 3s 超时。
   *  旧版 statSync 是主线程上的同步跨进程调用 —— NAS 中途掉线 / 休眠时一次
   *  statSync 能挂住主线程 6 秒以上（appfreeze THREAD_BLOCK_6S：进程跑了约 3 小时后
   *  命中，期间每 1.5s 轮询一次）。异步化后挂住的 stat 不再冻结 UI；race 超时按
   *  「本轮没探到」（0）处理。复用 nasRetryWait 做延时，不新增 Promise 构造。 */
  private async tryMtimeAsync(uri: string): Promise<number> {
    try {
      const st: fs.Stat | number = await Promise.race([
        fs.stat(uri),
        this.nasRetryWait(MTIME_STAT_TIMEOUT_MS).then((): number => 0)
      ]);
      if (typeof st === 'number') {
        hilog.warn(DOMAIN, TAG, 'tryMtime: stat timeout (>3s), skip this round');
        return 0;
      }
      return st.mtime;
    } catch (e) {
      return 0;
    }
  }

  /** 轮询单轮：mtime 变了 → 去抖重扫。逻辑与旧版逐行等价，只是 stat 换成异步。 */
  private async pollMtimeOnce(): Promise<void> {
    this.mtimeBusy = true;
    try {
      const m: number = await this.tryMtimeAsync(this.browseBase);
      if (m > 0 && this.dirMtime > 0 && m !== this.dirMtime) {
        this.dirMtime = m;
        // 第六十四轮：本层目录 mtime 变了 = 条目增删 / 改名，旧内容量立即失效。
        this.invalidateDirCounts();
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
    } finally {
      this.mtimeBusy = false;
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
      // 第四十六轮：mtime 探测异步化 —— 上一轮 stat 还没回来（网络挂起）时跳过本轮，
      // 绝不让慢 stat 在定时器里堆叠；folderBusy / playing 让路的原语义不变。
      if (this.browseBase.length === 0 || this.folderBusy || this.playing || this.mtimeBusy) {
        return;
      }
      this.pollMtimeOnce();
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
    this.markUserActive();   // 第六十四轮：任何工具动作都算用户输入，空闲闸门重新计时
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
      // 第九十四轮：'play' 分支随顶栏一起删除 —— 幻灯片入口已迁到图片右键菜单
      // （PM_ACT_SLIDE → toggleSlide()），这里不再保留第二条分发路径，
      // 杜绝「同一功能两个入口」以及旧控件残留。
      // 键盘空格（KEYCODE_SPACE）仍直接调 toggleSlide()：那是快捷键不是界面控件。
      // 11-10 起「选择图片」按钮取消，'files' 分支一并移除；
      // openFiles() 本体保留，仍被 openPicker() 的内部降级链调用。
      case 'folder':
        this.chooseFolder();
        break;
      case 'up':
        // 2026-11-11：按钮**永不禁用**，任何状态都能点进来。
        // 第一百零四轮起只剩两条入口：工具行「←」按钮 与 键盘退格（'..' 行已移除），
        // 两条都收口 browseUp()，由 upNavStateOf 分派（上移 / 到顶提示 / 图片列表提示 /
        // URI 层级判不出的兜底），结论一致。
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
        // 第五十八轮：左栏收起 / 展开会改变固定栏结构，chrome 基准失效。
        //  置 -1 让下一轮 onAreaChange 重新自洽采样；不置位的话展开时 chrome
        //  由小变大，会被 chromeSampleOf 当成跨帧污染拒绝，画布随之偏大。
        this.chromeW = -1;
        this.chromeH = -1;
        this.markWindowRect(); // 记住左栏收起态，重启前后界面状态一致
        break;
      // 11-10 起「回到上次」按钮取消，'resume' 分支一并移除；
      // resumeLast() / loadAllGallery() 本体保留（启动自动恢复与内部降级仍复用）。
      case 'full':
        this.toggleFull();
        break;
      // 第六十四轮：内容量缓存有效期设置入口（Ctrl+D 诊断层内循环切换）。
      // 正式界面三个工具按钮 / 三栏 / 行高逐字不变，不新增常显控件。
      case 'dcTtl':
        this.cycleDirCountTtl();
        break;
      default:
        break;
    }
  }

  /** 第二十九轮：记录某一层目录的**真实**清单快照。
   *  只在 openFolder 真的 fs.listFile 成功、并且用本次 names 建好局部 rows 之后调用。
   *  绝不再读 this.rows（APP 内清单态时里面混着说明行 / `..`），从源头杜绝伪目录。
   *  同层多次列目录按名字合并、不覆盖，兄弟目录一次都不会漏。 */
  private cacheUpDirSnapshot(base: string, rows: ImageItem[]): void {
    const keyPath: string = stripTrailingSlash(base);
    if (keyPath.length === 0) {
      return;
    }
    const names: Array<string> = [];
    const uris: Array<string> = [];
    const kinds: Array<number> = [];
    for (let i = 0; i < rows.length; i++) {
      const rn: ImageItem = rows[i];
      if ((rn.kind ?? ROW_IMAGE) === ROW_UP || isUpListPseudoName(rn.name)) {
        continue;
      }
      names.push(rn.name);
      uris.push(rn.uri);
      kinds.push(rn.kind ?? ROW_IMAGE);
    }
    if (names.length === 0) {
      this.rebuildUpParentIndex();
      return;
    }
    let hit: number = -1;
    for (let i = 0; i < this.upDirCache.length; i++) {
      if (sameDirPath(this.upDirCache[i].path, keyPath)) {
        hit = i;
        break;
      }
    }
    if (hit >= 0) {
      const old: UpDirSnapshot = this.upDirCache[hit];
      const merged: Array<string> = mergeUpListNames([old.names, names]);
      const mergedUris: Array<string> = [];
      const mergedKinds: Array<number> = [];
      for (let k = 0; k < merged.length; k++) {
        const nm: string = merged[k];
        let u: string = '';
        let kd: number = -1;
        for (let j = 0; j < old.names.length && j < old.uris.length; j++) {
          if (old.names[j] === nm) {
            u = old.uris[j];
            kd = j < old.kinds.length ? old.kinds[j] : -1;
            break;
          }
        }
        if (u.length === 0) {
          for (let j = 0; j < names.length; j++) {
            if (names[j] === nm) {
              u = uris[j];
              kd = kinds[j];
              break;
            }
          }
        }
        mergedUris.push(u.length > 0 ? u : stripTrailingSlash(keyPath) + '/' + nm);
        mergedKinds.push(kd);
      }
      this.upDirCache[hit] = { path: keyPath, names: merged, uris: mergedUris,
        kinds: mergedKinds };
    } else {
      this.upDirCache.push({ path: keyPath, names: names, uris: uris, kinds: kinds });
      if (this.upDirCache.length > UP_DIR_CACHE_MAX) {
        this.upDirCache.splice(0, 1);
      }
    }
    // 旧单槽缓存保留（历史链路仍读它），但同样只装真实条目名。
    this.lastUpPath = keyPath;
    this.lastUpNames = names;
    // 第三十轮：快照有更新，标记待持久化（flushPos / flushPosSync 落盘后清零）。
    this.upCacheDirty = true;
    // 第三十三轮：缓存结构变了，立即刷新父子索引（触发时复用的一定是最新结构）。
    // 第三十四轮订正：刷新只影响候选优先级，不影响「往上层」是否响应。
    this.rebuildUpParentIndex();
  }

  /** 第四十二轮（网盘秒开）：把一次真实列举的整表 rows 存进 LRU 缓存。
   *  sameDirPath 去重（file://docs / %XX / 尾斜杠写法视为同一目录），
   *  新的放队头，超上限裁尾。零 IO，纯内存。 */
  private cacheDirRows(base: string, label: string, rows: Array<ImageItem>): void {
    if (base.length === 0) {
      return;
    }
    for (let i = 0; i < this.dirRowsCache.length; i++) {
      if (sameDirPath(this.dirRowsCache[i].path, base)) {
        this.dirRowsCache.splice(i, 1);
        break;
      }
    }
    this.dirRowsCache.unshift({ path: base, label: label, rows: rows, at: Date.now() });
    if (this.dirRowsCache.length > DIR_ROWS_CACHE_MAX) {
      this.dirRowsCache.length = DIR_ROWS_CACHE_MAX;
    }
    hilog.info(DOMAIN, TAG, 'cacheDirRows: %{public}s rows=%{public}d total=%{public}d',
      base, rows.length, this.dirRowsCache.length);
  }

  /** 第四十二轮：按目录 URI 找整表缓存。dirUri 的全部候选写法逐一对
   *  sameDirPath 模糊匹配；命中即提到 LRU 队头。找不到返回 undefined。 */
  private findDirRowsCache(dirUri: string): DirRowsCacheEntry | undefined {
    if (dirUri.length === 0) {
      return undefined;
    }
    const cands: string[] = dirCandidates(dirUri);
    for (let i = 0; i < this.dirRowsCache.length; i++) {
      const e: DirRowsCacheEntry = this.dirRowsCache[i];
      for (let c = 0; c < cands.length; c++) {
        if (sameDirPath(e.path, cands[c])) {
          this.dirRowsCache.splice(i, 1);
          this.dirRowsCache.unshift(e);
          return e;
        }
      }
    }
    return undefined;
  }

  /** 第四十二轮：缓存行按当前排序方向重排（缓存时可能是另一个方向）。
   *  与 openFolder 真实列举的分组排序完全同构：'..' → 文件夹 → 图片（重编
   *  itemIndex）→ 文本 → 其它；纯内存操作，零 IO。 */
  private resortDirRows(rows: Array<ImageItem>, asc: boolean): Array<ImageItem> {
    const dirs: ImageItem[] = [];
    const imgs: ImageItem[] = [];
    const texts: ImageItem[] = [];
    const others: ImageItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r: ImageItem = rows[i];
      const k: number = r.kind ?? ROW_IMAGE;
      if (k === ROW_UP) {
        continue;
      }
      if (k === ROW_FOLDER) {
        dirs.push(r);
      } else if (k === ROW_IMAGE) {
        imgs.push(r);
      } else if (k === ROW_TEXT) {
        texts.push(r);
      } else {
        others.push(r);
      }
    }
    const cmp = (a: ImageItem, b: ImageItem): number => naturalCompare(a.name, b.name);
    dirs.sort(cmp);
    imgs.sort(cmp);
    texts.sort(cmp);
    others.sort(cmp);
    if (!asc) {
      dirs.reverse();
      imgs.reverse();
      texts.reverse();
      others.reverse();
    }
    const out: ImageItem[] = [];
    // 第一百零四轮：「..」伪行同样不再生成（与左侧列表保持同一口径）。
    for (let i = 0; i < dirs.length; i++) {
      out.push(dirs[i]);
    }
    for (let i = 0; i < imgs.length; i++) {
      imgs[i].itemIndex = i;
      out.push(imgs[i]);
    }
    for (let i = 0; i < texts.length; i++) {
      out.push(texts[i]);
    }
    for (let i = 0; i < others.length; i++) {
      out.push(others[i]);
    }
    return out;
  }

  /** 第四十二轮（网盘秒开）：用整表缓存立即渲染目录态 —— 零 IO、零等待。
   *  只做渲染与状态落地，不碰 dirMtime（保持 0，等真实列举 / 轮询补真值），
   *  不清死路径记忆（真实列举成功才清）。真实列举仍在同一 openFolder 调用里
   *  后台进行：条目没变 → sameDirEntries 短路，视图一个像素不动；
   *  条目变了 → applyItems 保位刷新；列举失败 → 保留缓存视图当离线快照。 */
  private renderDirFromCache(hit: DirRowsCacheEntry, dirUri: string, resetView: boolean,
    keepUri: string): void {
    const rows: Array<ImageItem> = this.resortDirRows(hit.rows, this.sortAsc);
    const imgs: ImageItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i].kind ?? ROW_IMAGE) === ROW_IMAGE) {
        imgs.push(rows[i]);
      }
    }
    this.inAppUpList = false;
    this.browseDir = dirUri;
    this.browseBase = hit.path;
    this.dirMtime = 0;
    this.startDirPoll();
    this.applyItems(imgs, hit.label, '', rows, false);
    // 与真实列举路径的 keepUri 块同构：重选同一目录（resetView=false）时保住
    // 当前那张，不因缓存先渲染跳回第 1 张（后台核对没变也不会再修正一次）。
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
    this.status = '已显示缓存目录（后台刷新中…）';
    hilog.info(DOMAIN, TAG, 'renderDirFromCache: %{public}s rows=%{public}d imgs=%{public}d',
      hit.path, rows.length, imgs.length);
  }

  /** 第三十一轮：行式快照文本含 SOH / STX 分隔符（XML 非法控制字符），
   *  直接写 preferences 会让 putSync / flushSync 抛异常并写坏 KV 文件。
   *  编码成纯可打印文本再落盘，从根上消除本回归；decode 侧在 readBrowseExtras。
   *  只存 path / names / kinds；uris 重启后授权形态可能失效，不持久化。 */
  private encodeUpCacheForSave(): string {
    const levels: Array<UpCacheLevel> = [];
    for (let i = 0; i < this.upDirCache.length; i++) {
      const s: UpDirSnapshot = this.upDirCache[i];
      levels.push({ path: s.path, names: s.names, kinds: s.kinds });
    }
    const raw: string = encodeUpCacheText(levels, UP_CACHE_SAVE_LEVELS, UP_CACHE_SAVE_NAMES,
      UP_CACHE_SAVE_CHARS);
    return prefsSafeEncode(raw);
  }

  /** 第二十九轮：聚合目标父层的**全部**真实子目录名。
   *  所有落在同一层的快照都参与合并，外加旧单槽缓存与当前目录名；
   *  伪行由 mergeUpListNames 剔除，绝不因为「只命中一个单槽」而只剩 2026。 */
  private upListNamesOf(target: string, currentName: string): Array<string> {
    const groups: Array<Array<string>> = [];
    for (let i = 0; i < this.upDirCache.length; i++) {
      if (sameDirPath(this.upDirCache[i].path, target)) {
        groups.push(this.upDirCache[i].names);
      }
    }
    if (this.lastUpNames.length > 0 && sameDirPath(this.lastUpPath, target)) {
      groups.push(this.lastUpNames);
    }
    groups.push([currentName]);
    // 第三十五轮：从缓存的**目录结构**反推这一层的其它兄弟目录。
    // 用户直接选深层目录进入时，upDirCache 里没有父层自己的清单快照，
    // 旧逻辑就只剩「恒列当前目录」一项 → 上层清单只显示一个目录。
    // 现在把「曾浏览过、以 target 为直接父级」的那些层也算作兄弟目录，
    // 纯字符串零 IO、绝不编造名字、绝不混入其它层级（R28 回归护栏）。
    const levels: Array<UpCacheLevel> = [];
    for (let i = 0; i < this.upDirCache.length; i++) {
      const s: UpDirSnapshot = this.upDirCache[i];
      levels.push({ path: s.path, names: s.names, kinds: s.kinds });
    }
    groups.push(exploreSiblingNamesOf(levels, target, currentName));
    return mergeUpListNames(groups);
  }

  /** 第二十九轮：找某个兄弟目录当时真实可访问的 URI（同一个能 listFile 的 base 拼出来的）。
   *  找不到就退回 target + 目录名，导航行为与旧版一致。 */
  private upListUriOf(target: string, name: string): string {
    for (let i = 0; i < this.upDirCache.length; i++) {
      const snap: UpDirSnapshot = this.upDirCache[i];
      if (!sameDirPath(snap.path, target)) {
        continue;
      }
      for (let j = 0; j < snap.names.length && j < snap.uris.length; j++) {
        if (snap.names[j] === name && snap.uris[j].length > 0) {
          return snap.uris[j];
        }
      }
    }
    return stripTrailingSlash(target) + '/' + name;
  }

  /** 第二十九轮：用快照里 statSync 判出的真实行种类，而不是「名字里有没有点」猜。
   *  兄弟目录名带点（`Vol.2`、`2026.备份`）时，旧名字启发式会判成 ROW_OTHER，
   *  而 ROW_OTHER 在 onRowTap 里不可点 —— 目录就「看得到但进不去」。
   *  没有快照时仍退回旧启发式，零回归。
   *
   *  第四十一轮：新增 keepFileKinds（默认 false = 上层清单原行为）。
   *  上层清单所在的父目录**没有 URI 授权**（showUpListInApp 只在 openFolder 列不出
   *  时才用），文件行点了也读不了，所以仍折叠成 ROW_OTHER 给「不支持预览」的
   *  明确反馈；而 restoreDirContextOnly 恢复的是**有持久授权**的上次目录
   *  （activatePersistedUri 已异步激活），文件行按快照真实种类直传 ——
   *  .log 等文本行保持 ROW_TEXT，点了直接进文本预览，不再被误报「不支持预览」。 */
  private upListKindOf(target: string, name: string, fallback: number,
    keepFileKinds?: boolean): number {
    for (let i = 0; i < this.upDirCache.length; i++) {
      const snap: UpDirSnapshot = this.upDirCache[i];
      if (!sameDirPath(snap.path, target)) {
        continue;
      }
      for (let j = 0; j < snap.names.length && j < snap.kinds.length; j++) {
        if (snap.names[j] === name && snap.kinds[j] >= 0) {
          if (keepFileKinds === true) {
            return snap.kinds[j];
          }
          return snap.kinds[j] === ROW_FOLDER ? ROW_FOLDER : ROW_OTHER;
        }
      }
    }
    return fallback;
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
    // 第五十九轮：一次「往上层」开始 —— 先清掉上一次的反色标记，保证失败 / 早退 /
    // 只读名单态 / 层级校验不过时绝不残留陈旧高亮；每个真正落地分支再按本次
    // 「返回前所在子目录名」重设。整体替换而非追加，连续返回不会叠加。
    this.upReturnName = upReturnClearOf(this.upReturnName, false);
    // 第三十七轮：往上层是目录导航，先把文本预览态收掉，别让右栏挂着旧文件。
    if (this.textMode) {
      this.closeTextMode();
    }
    // 第四十三轮：不再因 folderBusy 早退 —— 用户点「往上层」是主动导航，
    // openFolder 会抢占在途列举（epoch 作废旧结果），这里直接放行。
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
    // 第五十九轮：记下「返回前所在子目录」的显示名。与左栏 rows 里的 name 同源
    // （都是 baseName），因此落地后能按名字严格相等命中那一行；空 / '..' / 兜底名
    // 由 upReturnMarkOf 统一过滤，绝不产生误命中。
    const fromName: string = current.length > 0 ? baseName(current) : '';
    // 第三十四轮：缓存父子索引**只作优先候选佐证**，绝不再做 browseUp 的闸门。
    // R33 曾把它提升为唯一真值源：upParentBuilt 一旦置 true（恢复链 / 任一次
    // openFolder 成功后都会置，且全文没有复位路径）就恒真，闸门内 TOP / MISS /
    // BADLEVEL / FAIL / OK 五条路径全部 return，把下面 R28~R32 逐轮真机验证过的
    // 路径层级链整条短路成死代码；缓存只有当前一层时 cachedUpStateOf 判 TOP，
    // 点「往上层」只改一句状态栏就返回 —— 目录 / 清单 / 视图全不动，
    // 这正是用户反馈的「触发该操作没有任何响应」的根因。
    // 现在事件无条件流向既有层级链，缓存命中时仅把父级排到同层候选最前。
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
    // 2026-11-16 第二十八轮：父级真值校验 —— target 必须严格是 current 的
    // **直接父级**（恰好剥一层）。NAS 路径同时存在 scheme 授权形态、逻辑形态
    // `/<host>/...` 与挂载形态 `/storage/userExternal/<host>/...`，层级键一旦
    // 对不上就可能落到错误层级（原地不动 / 越级），最终把「其他层级的文件夹
    // 列表」当成上层清单显示。canonicalLevelKeyOf 已抹平形态差异，这里做硬校验。
    // 仅严格层级链（GO）启用；UNKNOWN 的宽松父级与判不出卷根的形态保持原行为，
    // 其它导航行为零改动。
    const strictParent: boolean = loose || root.length === 0 ||
      isStrictParentOf(target, current);
    if (target.length > 0 && !strictParent) {
      this.status = '往上层：父目录层级校验未通过（当前目录标识与目标层级不一致）· ' +
        '请用「选择文件夹」重新进入该目录后再试';
      this.diagLine = 'up BADLEVEL | ' + UP_NAV_TAG + ' | L' + level +
        '→L' + dirLevelOf(target) + ' | cur=' + ellipsizeMiddle(current, 30) +
        ' | target=' + ellipsizeMiddle(target, 30) + ' | v' + APP_VERSION;
      return;
    }
    const canUp: boolean = target.length > 0 && strictParent;
    // canGoUp 只是信息状态（状态栏 / 诊断串），按钮本身永不置灰 / 永不禁用。
    this.canGoUp = canUp;
    this.diagLine = 'up START | ' + UP_NAV_TAG + ' | st=' + state +
      ' | L' + level + '→' + (canUp ? 'L' + dirLevelOf(target) : 'TOP') +
      (loose ? ' | loose' : '') +
      ' | can=' + (canUp ? '1' : '0') +
      ' | cur=' + ellipsizeMiddle(current, 30) +
      ' | root=' + ellipsizeMiddle(root, 24) + ' | v' + APP_VERSION;
    if (!canUp) {
      // 第三十八轮：用户主目录（用户卷根）虽然是「往上层」的逻辑顶，但它自己
      // 必须能被选择 / 进入并真实列出该层全部顶层资料夹。旧链路在这里无条件按
      // TOP 早退，/storage/Users/<id> 就成了唯一一个「没有父级、没有同层候选、
      // 点 .. 永远只回一句提示」的死层 —— 正是「无法选择该路径」的根因。
      // 只放行「TOP + 恰好是用户卷根」这一种情况：原地重新真实列举本层，
      // 绝不越过卷根到 /storage、/；其它 TOP / NONE / GO / UNKNOWN 逐字不变。
      if (rootReenterWantedOf(current, state)) {
        const reenterRoots: Array<string> = [];
        if (this.pickRootUri.length > 0) {
          reenterRoots.push(this.pickRootUri);
        }
        if (this.browseDir.length > 0 && this.browseDir !== this.pickRootUri) {
          reenterRoots.push(this.browseDir);
        }
        if (this.savedDirUri.length > 0 && this.savedDirUri !== this.pickRootUri &&
            this.savedDirUri !== this.browseDir) {
          reenterRoots.push(this.savedDirUri);
        }
        const reenterRaw: string = this.browseDir.length > 0 ? this.browseDir : current;
        const reenterForms: Array<string> = rootReenterFormsOf(current, reenterRaw, reenterRoots);
        this.status = '重新进入用户主目录「' + baseName(current) + '」· 真实列举 ' +
          reenterForms.length + ' 个同层写法';
        this.diagLine = 'up ROOT | ' + UP_NAV_TAG + ' | st=' + state + ' | L' + level +
          ' | forms=' + reenterForms.length + ' | root=1 | v' + APP_VERSION;
        // 用户主动点击才发生的一次真实全量列举；不弹系统选择器、不动恢复态。
        const reenterOk: boolean = await this.openFolder(current, false, false, false,
          reenterForms, true);
        if (reenterOk) {
          // 第五十九轮：卷根原地重列举**不是**「从子目录上移一层」，canUp=false
          // 让 upReturnMarkOf 返回空标记；显式刷新一次，保证旧反色不残留、其余行
          // 默认样式不变。R28 越级护栏与 R38 重列举行为逐字不改。
          this.upReturnName = upReturnRefreshOf(this.upReturnName,
            upReturnMarkOf(fromName, true, false));
          this.dataSource.reload(this.rows);
          this.status = '已进入「' + baseName(this.browseBase) + '」· 真实列举 ' +
            this.lastUpExploreNames + ' 项 · 点目录名进入';
          this.diagLine = 'up ROOT OK | ' + UP_NAV_TAG + ' | L' +
            dirLevelOf(this.browseBase) + ' | rows=' + this.lastUpExploreNames +
            ' | forms=' + reenterForms.length + ' | v' + APP_VERSION;
          return;
        }
        // 真实列举失败不静默、不弹系统选择器：回落到下面原有的 TOP 明确提示。
        hilog.info(DOMAIN, TAG, 'browseUp root reenter list failed, current=%{public}s', current);
      }
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
    // 第二十九轮：把 picker 原始授权 URI 也交给候选生成。openFolder 每次成功都会
    // 把 browseDir 覆写成子目录路径，原始 file:// 授权形态容易丢；父目录只有用
    // 与授权同形态的 URI 才更可能被 fs.listFile 列出来 —— 真列出来就自然含
    // 该层全部子目录（2026 之外的兄弟目录），而不是靠缓存只拼出当前目录一个。
    const upRoots: Array<string> = [];
    if (this.pickRootUri.length > 0) {
      upRoots.push(this.pickRootUri);
    }
    if (this.browseDir.length > 0 && this.browseDir !== this.pickRootUri) {
      upRoots.push(this.browseDir);
    }
    if (this.savedDirUri.length > 0 && this.savedDirUri !== this.pickRootUri &&
        this.savedDirUri !== this.browseDir) {
      upRoots.push(this.savedDirUri);
    }
    // UNKNOWN 态 upLevelOf 为空，必须显式传入宽松父级，否则候选集为空、按钮又变成没反应。
    // 非 loose 用空串占位（函数内回退 upLevelOf），保持既有调用形态与层级校验不变。
    let parents: string[] = loose
      ? upParentCandidates(current, rawUri, target, upRoots)
      : upParentCandidates(current, rawUri, '', upRoots);
    // 第三十四轮：缓存父子索引在此**只作优先候选**，不作闸门。
    // 初始化时预建、触发时复用（R33 的合理部分保留）；命中且严格同层时把缓存
    // 父级排到候选最前，父子层级一致优先；TOP / MISS / 索引未建 / 层级不一致时
    // 原候选一个不少地照常遍历，列不出再由 showUpListInApp 出 APP 内清单。
    // 这样「往上层」永远有响应，缓存再也不会把事件吞掉。
    let preferred: string = '';
    if (this.upParentBuilt) {
      preferred = cachedUpPreferredParentOf(this.upParentIndex, current, target);
      parents = cachedUpPreferredCandidates(preferred, parents);
    }
    const targetName: string = baseName(target);
    this.status = '往上层 L' + level + '→L' + dirLevelOf(target) + ' → ' + targetName;
    this.diagLine = 'up | ' + UP_NAV_TAG + ' | L' + level + '→L' + dirLevelOf(target) +
      ' | ' + parents.length + ' 同层候选 | target=' + targetName +
      ' | root=' + ellipsizeMiddle(root, 24) + ' | v' + APP_VERSION;
    // 第三十六轮：所有同层 parent 候选都参与**真实**列举，一次合并出该层
    // 全部资料夹目录。R35 只修了单次 openFolder 内多个 URI 写法的合并，但这里
    // 仍是「首个 parent 成功即 return」，其余候选真实列出来的兄弟目录全被丢掉 ——
    // 这正是「往上层只显示一个资料夹、没列出其它目录」的剩余根因。
    // 每个形态都在 openFolder 里真异步 listFile（绝不早停），再统一落地一次；
    // 自动重扫（每 1.5s）不传 fullExplore，保留 R35 早停，绝不放大 NAS IO。
    const formGroups: Array<Array<string>> = [];
    for (let i = 0; i < parents.length; i++) {
      formGroups.push(dirCandidates(parents[i]));
    }
    const allForms: Array<string> = upExploreFormsOf(formGroups);
    const wantFull: boolean = upFullExploreWanted(true, false);
    const landUri: string = parents.length > 0 ? parents[0] : target;
    this.status = '往上层 全量探索 ' + allForms.length + ' 个同层写法 → ' + targetName;
    this.diagLine = 'up FULL | ' + UP_NAV_TAG + ' | L' + level + '→L' +
      dirLevelOf(target) + ' | forms=' + allForms.length +
      ' | target=' + targetName + ' | v' + APP_VERSION;
    // 第三参 false：不再弹「目录内多选」，否则 setItems 会把刚进去的目录态清掉
    const ok: boolean = await this.openFolder(landUri, false, false, false,
      allForms, wantFull);
    if (ok) {
      // 第五十九轮：真正落到父层后才把「返回前所在子目录名」交给左栏反色。
      // applyItems 已在 openFolder 内 reload 过一次（那时标记仍为空），这里按本次
      // 落地结果整体替换标记并再 reload 一遍，保证 LazyForEach 的可见行都用新标记
      // 重建 —— 不依赖 @Prop 对虚拟化节点的刷新时机，确定性更强。
      this.upReturnName = upReturnRefreshOf(this.upReturnName,
        upReturnMarkOf(fromName, true, canUp));
      this.dataSource.reload(this.rows);
      // 旧「最初选择」锚点作废：它指向好几层之前，留着会让下一次往上层越级。
      this.pickRootUri = '';
      // 第三十四轮：缓存父子关系在此只作**落地一致性诊断**，不再是闸门。
      // 命中缓存父级时核对实际 browseBase 是否落在同一规范层级键，结果写进
      // 诊断串；一致与否都不回滚、不误跳，也不影响上移结果。
      const cacheConsistent: boolean = preferred.length > 0 &&
        cachedUpLandsAt(preferred, current, this.browseBase);
      // applyItems 已把 browseBase / browseDir / source / titlePath / canGoUp 一起刷新到父层。
      this.status = '往上层 → ' + baseName(this.browseBase) +
        '（L' + dirLevelOf(this.browseBase) + '）· 真实列举 ' +
        this.lastUpExploreNames + ' 项 · ' +
        (this.canGoUp ? '还能继续往上层' : '已到卷 / 硬盘的逻辑最上层');
      this.diagLine = 'up OK | ' + UP_NAV_TAG + ' | L' + dirLevelOf(this.browseBase) +
        ' | can=' + (this.canGoUp ? '1' : '0') +
        ' | cache=' + (preferred.length > 0 ? (cacheConsistent ? '1' : '0') : '-') +
        ' | full=' + allForms.length +
        ' | v' + APP_VERSION;
      hilog.info(DOMAIN, TAG, 'browseUp OK → %{public}s L%{public}d',
        this.browseBase, dirLevelOf(this.browseBase));
      return;
    }
    hilog.warn(DOMAIN, TAG, 'browseUp full explore failed, current=%{public}s', current);
    if (loose) {
      // UNKNOWN 态（目录标识层级不可解析）：同样**不弹系统选择器**。
      // 真实列举一个名字都没拿到 → 才允许零 IO 的 APP 内清单兜底，
      // 保证按钮点了有可见反馈，而不是给一句让用户自己重选的死提示。
      if (upExploreNeedFallback(this.lastUpExploreNames)) {
        this.showUpListInApp(target, targetName, current, parents, state, level);
      }
      return;
    }
    // 2026-11-11 第四次实机反馈：上级目录没授权时**绝不弹系统选择目录 dialog**。
    // 只有真实全量列举一无所获才退回 APP 内清单，绝不拿缓存覆盖真实结果。
    if (upExploreNeedFallback(this.lastUpExploreNames)) {
      this.showUpListInApp(target, targetName, current, parents, state, level);
    }
  }

  /** 上级目录没有 URI 授权、openFolder 列不出来时：**绝不弹系统选择目录 dialog**，
   *  直接在 APP 内左栏显示上层的「档案目录 / 档案清单」（2026-11-11 第四次实机反馈）。
   *
   *  数据源全是纯字符串，零 IO：
   *   · upListNamesOf(target)：所有落在该层的真实目录清单快照（多层并存）+
   *     旧单槽 lastUpNames + 当前目录名，聚合出**完整**兄弟目录，不遗漏非 2026 目录；
   *   · upListUriOf(target)：快照里当时真正能 listFile 的 base 拼出的子项 URI；
   *   · pathChainOf(target)：只用于 diagLine 层级计数，**绝不**再当成目录项列出。
   *  rows 里的目录行点进去照常走 openFolder（用户主动点击才发生，不是启动期批量 IO）。
   *  ⚠️ 刻意**不调用 applyItems**：它会 applyPendingRestore 重设恢复模式 / 提示卡，
   *     还会触发 showPreviewOf / fillSizes / schedulePreload。这里只提交一份纯清单，
   *     恢复模式、防冻结闸门、只读提示卡一律原样保留。 */
  private showUpListInApp(target: string, targetName: string, current: string,
    parents: string[], state: number, level: number): void {
    const rows: ImageItem[] = [];
    // 第一百零四轮：「..」伪行已移除；本清单同样以真实子目录开头。
    // ① 第二十九轮：父层的**全部**真实子目录。多层会话快照 + 旧单槽缓存 +
    //    当前目录名一起聚合，伪说明行由 mergeUpListNames 剔除、按原名去重。
    //    旧版只认一个 lastUpNames 单槽：一旦被下一层覆盖或缓存里装的是伪清单，
    //    这里就只剩「恒列当前目录」一项 —— 正是截图里只有 2026 的原因。
    const curName: string = current.length > 0 ? baseName(current) : '';
    const cached: boolean = this.lastUpNames.length > 0 &&
      sameDirPath(this.lastUpPath, target);
    const upNames: Array<string> = this.upListNamesOf(target, curName);
    for (let i = 0; i < upNames.length; i++) {
      const nm: string = upNames[i];
      // 当前目录恒用已知可列的真实路径（点一下就能回去）；兄弟目录优先用
      // 快照里当时真正 listFile 成功的 base 拼出的 URI，保证「能访问」。
      const isCurrent: boolean = nm === curName;
      const rowUri: string = isCurrent && current.length > 0
        ? current : this.upListUriOf(target, nm);
      // 档案只列名字、不进翻页序列（授权失效时不解码）；文件夹可点进入。
      // 第二十九轮：优先用快照里的真实种类，带点的目录名（Vol.2）也能点进去。
      const isFile: boolean = isImageName(nm) || nm.indexOf('.') > 0;
      const rowKind: number = this.upListKindOf(target, nm,
        isFile ? ROW_OTHER : ROW_FOLDER);
      rows.push({ uri: rowUri, name: nm,
        size: -1, mtime: 0, kind: rowKind, itemIndex: -1 });
    }
    // ③ 路径层级链**只作诊断**，绝不再当成目录项列出来。
    //    旧版无条件 pathChainOf(target) 逐层 push ROW_FOLDER，把 `/`、`storage`、
    //    `userExternal`、`192.168.100.61`、`图片档案`、`Collection`、`4 中`
    //    这些**祖先层级**全画成「上层文件夹」—— 正是本轮用户截图里的错误画面。
    //    volumeRootOf 已修正 NAS 卷根，这里再彻底切断「层级链 → 目录清单」的映射：
    //    左栏只呈现父目录的真实子目录，不再显示任何其他层级的文件夹列表。
    const chain: string[] = pathChainOf(target);
    // ③ 第七十八轮：原「— 上层清单（APP 内）· 点目录名进入 · ul1 —」伪说明行整体移除。
    //    「往上层」进入 APP 内上层清单的功能本身不变，只不再出现该提醒文案；
    //    旧快照里若仍存有这条伪行，仍由 isUpListPseudoName() 过滤，绝不漏进清单。
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
    this.refreshAdaptiveLayout(rowNames);
    // 第五十九轮：APP 内上层清单同样是「往上层」落地 —— 把返回前所在子目录名
    // （curName）交给左栏反色。**必须在 dataSource.reload 之前**设好，让本次
    // LazyForEach 建出来的可见行就带上新标记；清单里该行名字与 curName 严格相等、
    // 种类优先取快照真实种类（带点目录名可能是 ROW_OTHER，upReturnInvertOf 同样认），
    // 其余行（'..' / 兄弟目录）逐字保持默认样式。
    this.upReturnName = upReturnRefreshOf(this.upReturnName,
      upReturnMarkOf(curName, true, true));
    this.dataSource.reload(this.rows);
    this.browseBase = target;
    this.browseDir = parents.length > 0 ? parents[0] : target;
    this.pickRootUri = '';
    this.titlePath = target;
    this.canGoUp = canGoUpFrom(target);
    this.dirHint = '';  // R78：「APP 内上层xxx」提醒及提示条整体移除
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
    // 第七十八轮：「APP 内上层xxx」提醒及状态栏拼接整体移除，只留中性目录态说明；
    //  第一百零四轮：「..」伪行也删了 ⇒ 条目数直接就是 rows.length（不再扣 1）。
    this.status = '「' + targetName + '」· ' + rows.length + ' 个条目 · ' + ESC_BUILD_TAG +
      (this.restoreMode === RESTORE_READONLY
        ? ' · 图片授权已失效，点「选择文件夹」重新打开该目录即可看图' : '');
    this.diagLine = 'up LIST | ' + UP_LIST_TAG + ' | st=' + state +
      ' | L' + level + '→L' + dirLevelOf(target) +
      ' | cached=' + (cached ? '1' : '0') + ' | rows=' + rows.length +
      ' | chain=' + chain.length + ' | no-picker | v' + APP_VERSION;
    hilog.info(DOMAIN, TAG, 'up list in app: %{public}d rows target=%{public}s cached=%{public}s',
      rows.length, target, cached ? '1' : '0');
    // 第六十轮：APP 内上层清单同样换源 —— 可见范围作废并挂起定位请求。
    // 这里 cur=-1，主高亮行由 upReturnName 反色行充当，护栏会把它滚到完整可见；
    // 长清单里反色行靠下时也不会再被藏在视区外。
    this.listFirstRow = -1;
    this.listLastRow = -1;
    this.armHighlightReveal('upList');
  }

  /** 切换全屏：只翻状态位，真正的重解码等 onAreaChange 把新画布尺寸报上来再做 */
  private toggleFull(): void {
    this.setFull(!this.fullscreen);
  }

  /** 退出应用。Esc（非全屏时）触发。
   *  第二十轮重大修正：**不再 `await flushPos()`**。它是 preferences 的 put / flush /
   *  大快照异步文件 I/O，历史上出现过死路径、慢速 NAS 导致 Promise 长期不 resolve；
   *  一旦挂住，`terminateSelf()` 永远执行不到 —— 实机表现正是「按 ESC 无任何响应」，
   *  而纯函数 / 源码静态契约测试完全测不到这一层。改用同步 `flushPosSync()`
   *  （putSync + flushSync，毫秒级、进程被杀也不丢），随后立即调用 terminateSelf。
   *  context 增加 AppStorage 兜底（避免 getHostContext 偶发为空导致静默 return）。 */
  private async quitApp(): Promise<void> {
    // 同步落盘：绝不 await 任何文件 I/O；保留 async 签名只为兼容既有调用点与静态契约。
    this.flushPosSync();
    await Promise.resolve();
    this.escDiag = this.escDiag + ' → quitApp';
    hilog.info(DOMAIN, TAG, 'ESCDBG quitApp enter');
    try {
      let ability: common.UIAbilityContext | undefined =
        AppStorage.get<common.UIAbilityContext>('abilityContext');
      const host: common.Context | undefined = this.getUIContext().getHostContext();
      if (host !== undefined) {
        ability = host as common.UIAbilityContext;
      }
      if (ability === undefined) {
        this.escDiag = this.escDiag + ' NO_CONTEXT';
        this.status = '[ESC诊断] 拿不到 UIAbilityContext（请回传此行）';
        hilog.warn(DOMAIN, TAG, 'ESCDBG no UIAbilityContext');
        return;
      }
      this.escDiag = this.escDiag + ' → terminateSelf()';
      this.status = '[ESC诊断] terminateSelf() 已调用（若未退出请回传此行）';
      hilog.info(DOMAIN, TAG, 'ESCDBG terminateSelf called');
      ability.terminateSelf()
        .then(() => {
          hilog.info(DOMAIN, TAG, 'ESCDBG terminateSelf resolved');
        })
        .catch(() => {
          this.escDiag = this.escDiag + ' REJECTED';
          this.status = '[ESC诊断] terminateSelf 被拒绝（请回传此行）';
          hilog.warn(DOMAIN, TAG, 'ESCDBG terminateSelf rejected');
        });
      // 第二十一轮：部分 PC 窗口形态下 terminateSelf() 只销毁 ability、不关窗口，
      // 用户看到的就是「APP 还在」。延时后若页面仍活着，直接 destroyWindow() 兜底。
      this.quitFallbackTimer = setTimeout(() => {
        this.quitFallbackTimer = -1;
        if (!this.pageAlive) {
          return;
        }
        try {
          const w: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
          if (w !== undefined) {
            w.destroyWindow().catch(() => {});
            this.escDiag = this.escDiag + ' → destroyWindow';
            hilog.info(DOMAIN, TAG, 'ESCDBG destroyWindow fallback');
          }
        } catch (e3) {
          hilog.warn(DOMAIN, TAG, 'ESCDBG destroyWindow fallback failed');
        }
      }, QUIT_FALLBACK_DELAY_MS);
    } catch (e) {
      this.escDiag = this.escDiag + ' EXCEPTION';
      this.status = '[ESC诊断] quitApp 异常（请回传此行）';
      hilog.warn(DOMAIN, TAG, 'ESCDBG quitApp failed: %{public}s', JSON.stringify(e));
    }
  }

  /** 第十八轮：进入全屏前抓「普通模式窗口尺寸与位置」快照。
   *  放宽到**所有普通窗口态**：第十六轮要求 getWindowStatus()===FLOATING 才抓，
   *  但 PC / 2in1 上自由窗口状态值不总是 FLOATING（也可能 MAXIMIZE / UNDEFINED），
   *  快照常常不抓 → 退出时 hasPreFullRect=false → 「恢复进入前尺寸位置」不执行。
   *  现在只要上升沿 + rect 合法就抓，并记下「进入前是否自由窗口」：自由窗口退出时
   *  精确 resize + moveWindowTo；最大化态交给 EXIT_IMMERSIVE 维持形态，绝不误缩。
   *  必须在任何 maximize / 沉浸窗口 API 之前调用 —— setFull 是本轮最早收口。 */
  private capturePreFullRect(prevFull: boolean, nextFull: boolean): void {
    if (!prevFull && nextFull) {
      // 每次进入全屏先清空上一轮残留，避免窗口未就绪时误用到旧快照
      this.preFullRect = '';
      this.hasPreFullRect = false;
      this.restoreRectPending = false;
      this.preFullFloating = false;
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    let floating: boolean = false;
    if (win !== undefined) {
      try {
        floating = win.getWindowStatus() === window.WindowStatusType.FLOATING;
      } catch (e) {
        floating = false;
      }
    }
    // 第十八轮：FLOATING 快路径(shouldCaptureWindowRect) 与「所有普通窗口态」宽路径取或，
    // 确保 getWindowStatus 不准 / 最大化态也能抓到几何。
    const rise: boolean = shouldCaptureWindowRect(prevFull, nextFull, floating) ||
      shouldCaptureRectAll(prevFull, nextFull, true);
    if (win === undefined || !rise) {
      return;
    }
    try {
      const r = win.getWindowProperties().windowRect;
      const packed: string = packWindowRect({
        left: r.left, top: r.top, width: r.width, height: r.height
      });
      if (shouldCaptureRectAll(prevFull, nextFull,
        windowRectUsable(parseWindowRect(packed), WIN_MIN_W, WIN_MIN_H, WIN_MAX_W, WIN_MAX_H))) {
        this.preFullRect = packed;
        this.hasPreFullRect = true;
        this.preFullFloating = floating;
      }
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'fullRect: capture failed');
    }
  }

  /** 第十八轮：退出全屏、窗口形态恢复之后，按快照精确还原普通模式的尺寸与位置。
   *  仅「进入前是自由窗口」才 resize + moveWindowTo；最大化 / 系统全屏态交给
   *  applyWindowFullScreen 的 maximize(EXIT_IMMERSIVE) / recover 维持形态，绝不拿
   *  rect 把最大化窗口缩成自由窗口。每步独立 try/catch，用完即清快照，保证幂等。 */
  private async restorePreFullRect(win: window.Window): Promise<void> {
    this.restoreRectPending = false;
    const rect: WindowRect | undefined = parseWindowRect(this.preFullRect);
    const wasFloating: boolean = this.preFullFloating;
    this.hasPreFullRect = false;
    this.preFullRect = '';
    if (rect === undefined ||
      !windowRectUsable(rect, WIN_MIN_W, WIN_MIN_H, WIN_MAX_W, WIN_MAX_H)) {
      return;
    }
    // rect 可用性已由上面 windowRectUsable 校验；这里只判「进入前形态」。
    if (!shouldApplyRectRestore(wasFloating, true)) {
      return;
    }
    try {
      await win.resize(rect.width, rect.height);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'fullRect: resize failed');
    }
    try {
      await win.moveWindowTo(rect.left, rect.top);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'fullRect: moveWindowTo failed');
    }
  }

  private setFull(on: boolean, bySystemHeal: boolean = false): void {
    if (on === this.fullscreen) {
      return;
    }
    const prevFull: boolean = this.fullscreen;
    // 第八十八轮：`onExit` 只表示「全屏 → 普通」这一个下降沿（纯判据）。
    // 语义已从 R82 的「退出重新适配」改为「退出恢复进入前视图 + 布局落定后再确认一次」。
    const onExit: boolean = fullExitEdgeOf(prevFull, on);
    // 第十六轮：上升沿抓「进入全屏前的窗口尺寸与位置」快照（须在任何窗口 API 之前）；
    //   下降沿标记「待精确恢复」。两者都由 InteractionPlan 纯函数判据收口。
    this.capturePreFullRect(prevFull, on);
    if (shouldRestoreWindowRect(prevFull, on, this.hasPreFullRect, this.preFullRect.length > 0)) {
      this.restoreRectPending = true;
    }
    // 第十四轮：全屏 / 正常模式切换会整块重建布局、画布尺寸与左右页划分，
    // 残留的放大镜 pane / 坐标 / 悬停态会与之不一致 —— 这正是「退出全屏后
    // 放大镜失效」的根因。所有切换都从本收口经过，这里统一复位为「无悬停」；
    // 只清瞬时状态、不设任何永久禁用标志，下一次 onHover(true) / onMouse(Move)
    // 就会重新激活，故进入全屏、全屏中使用、退出全屏后都能继续正常使用。
    const loupeModeChanged: boolean = loupeResetOnModeChange(this.fullscreen, on);
    if (loupeModeChanged) {
      this.loupePane = LOUPE_PANE_NONE;
      this.loupeHover = loupeHoverAfterModeChange(this.loupeHover, loupeModeChanged);
      this.loupeX = 0;
      this.loupeY = 0;
      // 第十六轮：画布尺寸变了，原目标解码边失效 → 释放高清图源，下次移入按新画布重解。
      this.clearLoupeHiRes();
    }
    // 第十九轮：下降沿记时刻（仅日志 / 诊断）。**不再按退出来源置任何补发标志**：
    // shouldArmSystemEcho 恒 false，pendingSystemEcho 恒为 false。第十六轮 400ms 时间冷却、
    // 第十八轮「系统自愈后置位吞一次补发 ESC」实机都会把用户主动的第二次 ESC 误吞。
    // 现在 escActionByState 严格只按 fullscreen 两态分派：普通态再次 ESC 恒 QUIT_APP，
    // 无论这次退出是主动（ESC/双击/F11/按钮）还是系统消费 ESC 后的自愈（bySystemHeal=true）。
    // bySystemHeal 参数保留供诊断，不参与 ESC 分派。
    if (prevFull && !on) {
      this.lastFullExitAt = Date.now();
      this.pendingSystemEcho = shouldArmSystemEcho(bySystemHeal, prevFull, on);
    }
    this.fullscreen = on;
    this.pendingReload = true; // 画布尺寸变了 → 落地后按新尺寸重解，避免把旧分辨率拉大发虚
    // 全屏切换会整块隐藏 / 恢复状态栏、左栏，固定栏偏移 chrome 已经失效，
    // 置 -1 让下一轮 onAreaChange 重新测量，别拿旧偏移去反推画布尺寸。
    this.chromeW = -1;
    this.chromeH = -1;
    // 第九十三轮：全屏切换必然引起 root / preview 回调错帧，开一个信任窗，
    // 窗内禁止根容器反推覆盖预览实测值（否则画布被改小 → 只有图片缩小）。
    this.canvasRootTrustUntil = Date.now() + CANVAS_ROOT_TRUST_MS;
    if (on) {
      // 进全屏：先把「之前的完整界面」逐项存档，ESC 退出时才能原样还原
      this.hasFullSnapshot = true;
      this.preFullZoom = this.zoom;
      this.preFullTx = this.tx;
      this.preFullTy = this.ty;
      // 第九十二轮：先存档「装饰可见性」，退出时按它还原（不再无条件 true）。
      this.preFullDecorVisible = this.decorVisibleOf();
      // 第八十九轮：视图快照单独标记（不随 hasFullSnapshot 中途清掉）。
      this.preFullViewValid = true;
      this.exitViewValid = false;
      this.exitViewNoted = false;
      // 第九十轮：进入时把「冻结下来的视图」打一次，退出时那条才有对照。
      hilog.info(DOMAIN, TAG, 'full enter snapshot: %{public}s', this.viewDiagOf());
      this.preFullRot = this.rot;
      this.preFullFlipH = this.flipH;
      this.preFullFlipV = this.flipV;
      // 第八十九轮：剥掉上一轮退出时补的「· 缩放 N%」，避免反复进出把状态栏越叠越长。
      this.preFullStatus = stripZoomNoteOf(this.status);
      // 全屏画布基准清零，交给 onAreaChange 记录进入全屏后的最大尺寸。
      // 系统自行退出沉浸时画布会缩小，据此自愈切回完整界面（ESC 常被系统消费）。
      this.fullCanvasW = 0;
      this.fullCanvasH = 0;
      this.fullEnterAt = Date.now();
      // 双击 / F11 进全屏：复位缩放与平移，objectFit(Contain) 会按放大后的画布
      // 把预览图铺满放大 —— 这就是「预览图案跟窗口大小一齐适配放大」。
      // 同时 refreshForCanvasResize() 按新画布重解（左右页都算），不发虚。
      // 第八十八轮：上面存档的 preFullZoom/Tx/Ty 会在退出时**原样恢复**（不再一律 fit），
      // 所以这里的 fit 只影响「全屏期间」的观感，不会改写用户进入前的倍率。
      this.fitToWindow();
      this.status = '全屏 · Esc / F11 / 双击退出';
      } else {
        // 第八十八轮：退出全屏**恢复进入前的缩放 / 平移**（R82 的「一律 fit」口径已被本轮推翻）。
        // 根因：R82 在下降沿无条件 `fitToWindow()`（zoom=1、tx=ty=0），用户进全屏前若放大到 2×，
        // 退出后立刻缩回 1×，观感就是「预览图被缩小」。
        // 现在：有视图快照 → 原样恢复 zoom/tx/ty；无快照 → 保持当前，**绝不擅自 fit**。
        // 第八十九轮：判断依据从 `hasFullSnapshot` 换成独立的 `preFullViewValid` ——
        // 前者会在退出时被置 false（它管界面还原），任何一条路径先清掉它就会让视图恢复落空。
        // 恢复与 `this.fullscreen = on` 在同一个同步块内完成 ⇒ 布局变化与倍率变化合成一帧，
        // 不会出现「先 fit 一次、260ms 后再跳回来」的两段式缩放跳变。
        this.fullCanvasW = 0;
        this.fullCanvasH = 0;
        this.fullEnterAt = 0;
        const hadSnapshot: boolean = this.hasFullSnapshot;
        if (hadSnapshot) {
          // rot / flip 是用户手动设置的，逐项还原；status 属界面形态，也必须还原。
          this.rot = this.preFullRot;
          this.flipH = this.preFullFlipH;
          this.flipV = this.preFullFlipV;
          this.status = this.preFullStatus;
        } else {
          this.status = '已退出全屏 · Esc 关闭应用';
        }
        // 视图恢复收口在纯函数里（含 clamp 与非法值兜底）。
        // 第八十九轮：判断依据换成**独立的视图标志** `preFullViewValid`，不再看 `hasFullSnapshot`。
        const hadView: boolean = this.preFullViewValid;
        const view: FullExitView = fullExitViewOf(hadView,
          this.preFullZoom, this.preFullTx, this.preFullTy,
          this.zoom, this.tx, this.ty, MIN_SCALE, MAX_SCALE);
        this.zoom = view.zoom;
        this.tx = view.tx;
        this.ty = view.ty;
        // 记下「本次退出要恢复到的视图」，供 260ms 后布局落定时再确认一次。
        this.exitViewZoom = view.zoom;
        this.exitViewTx = view.tx;
        this.exitViewTy = view.ty;
        this.exitViewValid = true;
        this.exitViewNoted = false;
        this.hasFullSnapshot = false;
        // 布局重建 / 窗口退出沉浸是异步的：等普通模式画布真正落定后再确认一次「视图未被改动 + 按新画布重解」。
        if (onExit) {
          // 第九十一轮：退出瞬间先记一条（画布可能还是全屏值），260ms 落定一条，1500ms 再一条。
          // 三条 canvas 一比，就能判定「画布是瞬态偏小还是稳态变小」。
          hilog.info(DOMAIN, TAG, 'full exit immediate: %{public}s', this.viewDiagOf());
          this.armFullExitRefit();
          this.armFullExitSample();
        }
    }
    this.applyWindowFullScreen(on, 0); // 标题栏 / dock / 状态栏 / 导航栏一起处理与还原
    this.armCanvasReloadFallback();    // 窗口 API 静默失败时也能按当前画布重解
    // 第二十轮：进出全屏后重抢焦点。整块布局重建 + 沉浸态切换会把根组件焦点弄丢，
    // 焦点一丢，返回普通模式后用户主动按的第二次 ESC 根本到不了 onKey —— 这正是
    // 前三轮改纯函数始终无效的运行时根因之一。
    this.scheduleKeyRefocus();
  }

  /** 根容器收到鼠标移动：只做「用户活跃」打点（第六十四轮空闲闸门，零 IO、零状态写入量）。
   *  · 第七十六轮：放大镜改由【预览区相片上左键】切换，根容器不再有任何 toggle 兜底 ——
   *    左栏档案行 / 按钮 / 空白区 / 右键一律不翻转。
   *  · 第九十四轮：原「非全屏贴顶唤出整条顶栏 + 全屏贴顶浮出工具条」这两套自动隐藏栏
   *    已按用户要求**整条移除**。鼠标移动不再读写任何显隐状态，
   *    也就不会再有任何界面元素因鼠标位置而出现或消失。 */
  private onRootMouse(event: MouseEvent): void {
    this.markUserActive();
    // 第一百零九轮：拖分隔条时鼠标很快会离开那条 14vp 的窄条 —— 一旦离开，
    // 分隔条自己收不到 Move（鼠标事件只投给指针所在的那条命中链），拖拽就会「断」。
    // 根 Stack 覆盖整个窗口，Move / Release 一定会冒泡到这里，于是位移由根容器接力：
    //   · Move   → 用同一个绝对 X 基准继续改宽（连续跟手）；
    //   · Release→ 收尾（松手时指针可能停在预览区 / 左栏 / 窗口外沿）。
    // 分隔条自己也挂了同一套处理，两条路径都调用同一个幂等入口，重复触发不会翻倍。
    if (this.splitDragActive) {
      if (event.action === MouseAction.Move) {
        this.onSplitPointerMove(this.splitMouseAbsX(event));
        return;
      }
      if (event.action === MouseAction.Release) {
        this.onSplitDragEnd();
        return;
      }
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
    // 第二十三轮：本开关已恢复 true（R22 关闭后连「首次 ESC 返回」都失效，且 keys
    // 仍为 0，证明 ESC 被系统全局消费与是否沉浸无关）。保留早返回分支作可逆开关：
    // 改成 false 即回到 R22 的纯应用内全屏行为。
    if (!USE_SYSTEM_IMMERSIVE) {
      hilog.info(DOMAIN, TAG, 'ESCDBG skip system immersive on=%{public}d', on ? 1 : 0);
      return;
    }
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
        // 第二十一轮：确认系统真的进过全屏形态，作为「之后系统退出需同步」的前置证据。
        // 不依赖 windowStatusChange 是否派发（2in1 上部分窗口事件可能不到应用）。
        if (windowStatusIsFullscreen(Number(win.getWindowStatus()))) {
          this.sawWindowFull = true;
        }
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
      // 第九十二轮：装饰可见性按**进入前的实际值**还原，绝不无条件 true。
      //  旧代码恒 setWindowDecorVisible(true)：进入前无标题栏的窗口，退出后被强行加回一条
      //  标题栏（37vp 高）+ 边框（20vp 宽），内容区永久变小 —— 这就是「退出全屏后整个界面/
      //  元素被缩小」的真正来源（canvas 1490×978 → 1470×941，−3.7%）。
      //  `preFullDecorVisible` 在进入时用 getWindowDecorVisible() 读真值，跨会话也不会错。
      try {
        win.setWindowDecorVisible(this.preFullDecorVisible);
        hilog.info(DOMAIN, TAG, 'fullscreen: decor restore -> %{public}d (pre=%{public}d)',
          this.decorVisibleOf() ? 1 : 0, this.preFullDecorVisible ? 1 : 0);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: decor restore failed');
      }
      try {
        await win.setTitleAndDockHoverShown(true, true);
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'fullscreen: title/dock hover restore failed');
      }
      // 第十六轮：窗口形态恢复之后，按进入全屏前的快照精确还原普通模式尺寸与位置。
      // 放在 recover()/EXIT_IMMERSIVE 之后，避免被最大化形态覆盖；快照用完即清。
      if (this.restoreRectPending) {
        await this.restorePreFullRect(win);
      }
    }
  }

  /** 第九十五轮：此刻是否处于「不该被 F 抢键」的可编辑 / 文本区域。
   *
   *  本页**没有输入控件**（全工程零 TextInput / TextArea），唯一有文本、可框选、
   *  可 Ctrl+C 复制的区域是「文本 / 源码预览态」，所以它在这里等价于「可编辑区域」。
   *  `textSelDragging` 覆盖「正在拖选文字」的瞬间 —— 拖到一半被切全屏会丢选区。
   *
   *  ⚠️ 扩展点：将来若真的加入输入框，只需在该组件的 `.onFocus` / `.onBlur` 里
   *  维护一个布尔（并入本方法的返回值）—— **按键分支本身不用改**。
   *  为什么必须判：根容器用的是 onKeyEventDispatch（分发阶段，先于目标组件），
   *  输入框里敲的 f 同样会先到这里，不判就会「打字打出全屏」。 */
  private editableAreaOf(): boolean {
    return this.textMode || this.textSelDragging;
  }

  /** 第九十五轮：是否有浮层 / 面板正开着。
   *  全屏切换会整块重建布局（左栏 / 状态栏显隐、画布尺寸、chrome 偏移清零），
   *  浮层里存的是旧坐标，切完会停在错位上 —— 与其事后纠正，不如这一刻不动。 */
  private modalOpenOf(): boolean {
    return this.exifPanelOn || this.ctxDetailOn || this.pmMenuOn;
  }

  private onKey(event: KeyEvent): void {
    // 第二十四轮：ESC 与非 ESC 分开去重（详见字段注释）。核心是 ESC 的去重
    // 只活一次事件循环，绝不跨越到用户主动按下的第二次 ESC。
    const isEscEarly: boolean = event.keyCode === KeyCode.KEYCODE_ESCAPE;
    if (isEscEarly) {
      if (this.escDedupEvent === event) {
        return;
      }
      this.escDedupEvent = event;
      setTimeout(() => {
        this.escDedupEvent = undefined;
      }, 0);
    } else {
      if (this.lastKeyEvent === event) {
        return;
      }
      this.lastKeyEvent = event;
    }
    // 第二十二轮：任意键到达计数（不只 ESC）。角标常显 keys=N。
    this.keySeen++;
    const code: number = event.keyCode;
    const rawDown: boolean = (event.type === KeyType.Down);
    const isEsc: boolean = code === KeyCode.KEYCODE_ESCAPE;
    // 第二十四轮：**修复 escDownHandled 永不复位**。旧实现只在 ESC 的 Down 分支
    // 把标志设 true，而配套 Up 在 `if (!down) return;` 就提前返回、从不清标志 →
    // 第一次 ESC 之后，所有「系统只派发 Up」的 ESC（2in1 常见）全部被吞，
    // 这正是用户主动按下的第二次 ESC 无响应的直接原因。
    // 现在：Up 到达时若存在待配对的 Down → 清标志并忽略（同一次物理按键）；
    // 若没有待配对 Down → 当作一次独立 ESC 继续走分派。
    if (isEsc && !rawDown && this.escDownHandled) {
      this.escDownHandled = false;
      return;
    }
    const down: boolean = rawDown || isEsc;
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
      // 第五十八轮：同上，左栏结构变化后固定栏偏移必须重新采样。
      this.chromeW = -1;
      this.chromeH = -1;
      this.markWindowRect();
      this.status = this.listCollapsed ? '已收起左栏（Ctrl+B 展开）' : '已展开左栏';
      return;
    }
    // 第五十一轮：Ctrl+C 在文本态且有行段选区时复制所选；无选区不吞键，交给系统。
    if (this.ctrlDown && code === KeyCode.KEYCODE_C && this.textMode && this.textSelAnchor >= 0) {
      this.copyTextSelection();
      return;
    }
    // 第二十五轮：诊断层开关 Ctrl+D（不占任何 UI 空间，回归复查一键展开）。
    if (this.ctrlDown && code === KeyCode.KEYCODE_D) {
      this.toggleDiagOverlay();
      return;
    }
    // 第二十四轮：**键盘确定解 Ctrl+Q**。R23 截图证明 ESC 在 2in1 上是系统特殊键
    // （hk=N = 应用级全局订阅被拒），但其它普通键全部能稳定到达（keys=168）。
    // Ctrl+Q 不依赖 ESC / 焦点重建 / 系统沉浸形态，是「退不出 APP」的可靠出口。
    if (this.ctrlDown && code === KeyCode.KEYCODE_Q) {
      this.quitApp();
      return;
    }
    switch (code) {
      case KeyCode.KEYCODE_DPAD_LEFT:
        this.go(-1);
        break;
      case KeyCode.KEYCODE_DPAD_RIGHT:
        this.go(1);
        break;
      // 第二十六轮：上下键改为与左右键**完全相同的切换方向**：
      //   ↑ = ← = 上一张（go(-1)）、↓ = → = 下一张（go(1)）。
      // 移除原有的 zoomBy(1.25) / zoomBy(0.8) 放大缩小，按上下键不再触发缩放。
      // 其它缩放入口（Ctrl+滚轮 / 双指捏合 / 左键 ×1.5 / 0 复位 / F 1:1）一律不动。
      case KeyCode.KEYCODE_DPAD_UP:
        this.go(-1);
        break;
      case KeyCode.KEYCODE_DPAD_DOWN:
        this.go(1);
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
      case KeyCode.KEYCODE_F: {
        // 第九十五轮：F / Shift+F 切换全屏。大小写走的是**同一个** KeyCode.KEYCODE_F
        // （Shift 只改 shiftDown），所以这里刻意不看 shiftDown —— 大小写都生效。
        // 三道闸门全过才动手，任一不过就跳出：绝不半途改状态、绝不「切一半」。
        //  ① Ctrl+F：组合键习惯（查找），不接管；
        //  ② 可编辑区域 / 文本预览 / 浮层打开：不抢键（否则在输入区打个 f 就整屏切走）；
        //  ③ 连按去抖：按住 F 的连发 Down 只算一次，避免频闪与异步窗口 API 错位。
        const blocked: boolean = this.editableAreaOf() || this.modalOpenOf();
        if (!fullKeyEligibleOf(this.ctrlDown, blocked)) {
          break;
        }
        const nowMs: number = Date.now();
        if (!fullToggleAllowedOf(nowMs, this.lastFullToggleAt, FULL_TOGGLE_GUARD_MS)) {
          break;
        }
        this.lastFullToggleAt = nowMs;
        // 与 F11 / 双击 / ESC 出口**完全同一个收口** toggleFull() → setFull()：
        // 进入沿存 zoom/tx/ty + 窗口矩形快照，退出沿由 fullExitViewOf 原样恢复缩放、
        // restorePreFullRect 还原窗口尺寸与位置 —— 所以「再按一次 F 回到进入前状态」是天然成立的。
        this.toggleFull();
        break;
      }
      case KeyCode.KEYCODE_1:
        // 第九十五轮：F 让位给全屏后，**1:1 像素级查看改到数字键 1**（"1 → 1:1" 同形好记）。
        // 原功能没有删除，只是换了按键；其余缩放入口（Ctrl+滚轮 / 双指捏合 / 0 复位）一律不动。
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
      case KeyCode.KEYCODE_ESCAPE: {
        // 第二十一轮：分派前先按**系统窗口真值**同步 fullscreen。
        // 实机截图证明首次 ESC 被系统消费后 APP 内部 fullscreen 会卡在 true，
        // 导致第二次 ESC 被判 EXIT_FULL 而「无响应」；这里是最直接的兜底。
        this.syncFullWithWindow();
        // 第二十轮：真机可观测诊断 —— 状态栏 + hilog ESCDBG 双通道。
        // 按两次 ESC 后若 APP 没退出，回传状态栏这行即可定位「事件 / 分派 / 退出」断点。
        this.escSeen++;
        // 第二十四轮：type 显示**真实 KeyType**（U = 系统只派发 Up 的 2in1 路径）。
        // 通道到达数不写进 escDiag 快照，改由黄色诊断行实时拼接（见 UI 段），
        // 这样第二次 ESC 到达任意通道时计数都会立刻变化，截图可判。
        this.escDiag = 'ESC#' + this.escSeen + ' full=' + (this.fullscreen ? 'T' : 'F') +
          ' type=' + (rawDown ? 'D' : 'U');
        hilog.info(DOMAIN, TAG, 'ESCDBG %{public}s', this.escDiag);
        // 第十九轮：**ESC 严格只按当前窗口状态两态区分**，唯一真值来源 escActionByState。
        //  · 全屏 → EXIT_FULL：首次 ESC 只退出全屏并恢复进入前几何，绝不退出 APP；
        //  · 普通 → QUIT_APP：返回普通模式后再次按 ESC 立即退出 APP。
        //  不再有任何「吞补发 ESC」分支：第十六轮 400ms 时间冷却、第十八轮
        //  pendingSystemEcho 一次性标志都基于「系统会补发 ESC」的错误假设，实机系统消费
        //  首次 ESC 后并不补发，标志永不消费 → 把用户主动的第二次 ESC 误吞成 NONE。
        //  现 pendingSystemEcho 恒 false 且不参与分派，第二次 ESC 必然落到 QUIT_APP。
        const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);
        this.escDiag = this.escDiag + ' act=' + escAct +
          (escAct === ESC_ACT_EXIT_FULL ? ' (EXIT_FULL)' : ' (QUIT_APP)');
        // 第二十四轮：Down 置 true 等配套 Up；只派发 Up 的独立 ESC 置 false。
        // 配套 Up 已在 onKey 入口的配对分支清标志，不会再永久卡住。
        this.escDownHandled = rawDown;
        if (escAct === ESC_ACT_EXIT_FULL) {
          this.toggleFull();
        } else if (escAct === ESC_ACT_QUIT_APP) {
          this.quitApp();
        } else {
          this.pendingSystemEcho = false; // 吞掉这一次补发 ESC，一次性标志随即结束
        }
        break;
      }
      default:
        break;
    }
  }

  /** 第二十轮：在 IME / 系统之前拦截 ESC（onKeyPreIme，SDK 12+）。
   *  真全屏沉浸态下 ESC 常被窗口管理器或输入法先拿走；这里对 ESC Down 返回 true
   *  主动消费，并复用原 onKey 的完整分派（唯一真值来源仍是 escActionByState）。
   *  其他键一律返回 false，照常分发给 onKeyEvent，不影响翻页 / 缩放 / 旋转等快捷键。 */
  private onKeyCapture(event: KeyEvent): boolean {
    this.capSeen++;
    if (event.keyCode === KeyCode.KEYCODE_ESCAPE && event.type === KeyType.Down) {
      this.escHandledByPreIme = true;
      this.onKey(event);
      // 事件分发链结束后立刻清标记：这只是「同一次事件」去重，不是按键冷却，
      // 用户紧接着主动按下的第二次 ESC 一定会被正常处理。
      setTimeout(() => {
        this.escHandledByPreIme = false;
      }, 0);
      return true;
    }
    return false;
  }

  /** 第二十轮：onKeyEvent 改用返回 boolean 的重载（SDK 15+），对 ESC 返回 true 消费。
   *  若同一次 ESC 已由 onKeyPreIme 走过 onKey，这里只消费、不重复执行动作，
   *  避免「一次按键被处理两遍」导致首次 ESC 就直接退出 APP。 */
  private onKeyConsumed(event: KeyEvent): boolean {
    this.conSeen++;
    if (event.keyCode === KeyCode.KEYCODE_ESCAPE && this.escHandledByPreIme) {
      this.escHandledByPreIme = false;
      return true;
    }
    this.onKey(event);
    return event.keyCode === KeyCode.KEYCODE_ESCAPE;
  }

  /** 第二十二轮：**分发阶段**按键通道（SDK 15+ onKeyEventDispatch）。
   *  onKeyPreIme / onKeyEvent 都要求「当前组件已获焦点」，而 2in1 实测零按键到达；
   *  onKeyEventDispatch 在按键**分发**阶段触发，挂在根组件上可收到窗口内按键，
   *  不依赖某个子组件是否拿到焦点。所有键都过 onKey（对象引用去重保证只处理一次），
   *  ESC 返回 true 主动消费。这是本轮最关键的新通道。 */
  private onKeyDispatch(event: KeyEvent): boolean {
    // 第二十三轮：分发通道到达计数（不受 onKey 去重影响），常显 dsp=N。
    this.dispatchSeen++;
    this.onKey(event);
    return event.keyCode === KeyCode.KEYCODE_ESCAPE;
  }

  /** 第二十三轮：系统级按键订阅（不经过 ArkUI 焦点 / 组件分发）。
   *  R22 截图 `keys=0 · fc=Y f=N r12` 证明组件级按键通道全部收不到键。
   *  按 SDK 能力上双通道，任一成功即把 ESC 接到同一套严格两态真值来源：
   *   ① `keyPressed`（API 16+）：订阅**单键**，SDK 明确「订阅成功后会拦截系统
   *      默认响应」—— 唯一能抢在窗口管理器消费 ESC 之前的应用级通道；要求应用
   *      处于前台焦点窗口（由 ensureWindowFocusable / 重抢焦点保障）。
   *   ② `hotkeyChange`（API 14+）：组合键订阅，preKeys 空数组尝试单键 ESC；
   *      ESC 常被系统注册为全局快捷键，多半抛 4200002，故作为第二顺位。
   *  两者互斥，避免一次 ESC 触发两次分派；hkDiag 常显 kp / hk / N。 */
  private registerEscHotkey(): void {
    let subscribed: boolean = false;
    // ① 单键通道优先：能拦截系统默认响应，也不撞组合键占用。
    try {
      const cfg: inputConsumer.KeyPressedConfig = {
        key: KeyCode.KEYCODE_ESCAPE,
        action: 1,
        isRepeat: false
      };
      inputConsumer.on('keyPressed', cfg, (ev: InputKeyEvent): void => {
        this.hkSeen++;
        hilog.info(DOMAIN, TAG, 'ESCDBG keyPressed fired #%{public}d', this.hkSeen);
        this.applyEscFromSystemChannel();
      });
      subscribed = true;
      this.hkDiag = 'kp';
      hilog.info(DOMAIN, TAG, 'ESCDBG keyPressed subscribed');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'ESCDBG keyPressed failed: %{public}s', JSON.stringify(e));
    }
    // ② 组合键通道兜底：① 成功时不再叠加，否则一次 ESC 会被分派两次。
    if (!subscribed) {
      try {
        const opts: inputConsumer.HotkeyOptions = {
          preKeys: [],
          finalKey: KeyCode.KEYCODE_ESCAPE,
          isRepeat: false
        };
        inputConsumer.on('hotkeyChange', opts, (o: inputConsumer.HotkeyOptions): void => {
          this.hkSeen++;
          hilog.info(DOMAIN, TAG, 'ESCDBG hotkeyChange fired #%{public}d', this.hkSeen);
          this.applyEscFromSystemChannel();
        });
        subscribed = true;
        this.hkDiag = 'hk';
        hilog.info(DOMAIN, TAG, 'ESCDBG hotkey subscribed');
      } catch (e) {
        this.hkDiag = 'N';
        hilog.warn(DOMAIN, TAG, 'ESCDBG hotkey subscribe failed: %{public}s', JSON.stringify(e));
      }
    }
  }

  /** 系统级通道与 onKey 共用的严格两态分派（第二十三轮抽出，避免多份重复）。
   *  setFull(false, true) 会顺带 applyWindowFullScreen(false) 主动退出系统沉浸，
   *  所以即便 keyPressed 拦截了系统默认 ESC 响应，窗口形态也不会卡在全屏。 */
  private applyEscFromSystemChannel(): void {
    const act: number = escActionByState(this.fullscreen, false);
    if (act === ESC_ACT_EXIT_FULL) {
      this.setFull(false, true);
    } else if (act === ESC_ACT_QUIT_APP) {
      this.quitApp();
    }
  }

  /** 第二十三轮：窗口级焦点保障。R22 `f=N r12` 若源于窗口本身 focusable=false，
   *  ArkUI 内部怎么 requestFocus 都会返回 false。这里显式把主窗口设为可聚焦，
   *  并把 isFocused() 真值常显在角标（wf=T/F/?）。2in1 上该 API 可能不支持，
   *  用 try + Promise catch 双重兜住，绝不影响其它链路。 */
  private ensureWindowFocusable(): void {
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (win === undefined) {
      return;
    }
    try {
      this.winFocusDiag = 'wf=' + (win.isFocused() ? 'T' : 'F');
    } catch (e) {
      this.winFocusDiag = 'wf=?';
    }
    try {
      win.setWindowFocusable(true).then(() => {
        hilog.info(DOMAIN, TAG, 'ESCDBG window focusable=true ok');
      }).catch((e: BusinessError) => {
        hilog.warn(DOMAIN, TAG, 'ESCDBG setWindowFocusable failed code=%{public}d', e.code);
      });
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'ESCDBG setWindowFocusable threw');
    }
  }

  /** 第二十五轮：诊断层开关（键盘 Ctrl+D / 单击右下角角标）。
   *  默认关闭 → 正式版右下角只显示缩放百分比；打开 → 展开全部排查诊断。
   *  纯 UI 状态切换，不触碰 ESC 分派 / 焦点 / 窗口形态，零回归风险。 */
  private toggleDiagOverlay(): void {
    this.diagOverlayOn = !this.diagOverlayOn;
    hilog.info(DOMAIN, TAG, 'DIAG overlay=%{public}d', this.diagOverlayOn ? 1 : 0);
  }

  /** 第二十轮：进出全屏后把键盘焦点抢回根组件。
   *  .defaultFocus(true) 只在首次构建生效；全屏切换会整块重建布局，窗口管理器
   *  也可能把焦点收走 —— 焦点一丢，之后所有按键（含第二次 ESC）都到不了 onKey。 */
  private scheduleKeyRefocus(): void {
    if (this.keyRefocusTimer !== -1) {
      clearTimeout(this.keyRefocusTimer);
    }
    this.keyRefocusTimer = setTimeout(() => {
      this.keyRefocusTimer = -1;
      this.requestKeyFocusOnce();
      // 第二十二轮：只要还没收到任何按键就持续重试。PC 上窗口键盘焦点可能
      // 晚于页面首帧 / 晚于全屏切换才到位，一次 120ms 的抢焦点很容易落空。
      // keySeen>0 立即停止，不会干扰正常操作（本应用也没有文本输入框）。
      if (this.keySeen === 0 && this.focusRetryCount < FOCUS_RETRY_MAX) {
        this.focusRetryCount++;
        this.keyRefocusTimer = setTimeout(() => {
          this.scheduleKeyRefocus();
        }, FOCUS_RETRY_MS);
      }
    }, ESC_REFOCUS_DELAY_MS);
  }

  /** 第二十二轮：用官方 `UIContext.getFocusController()` 抢焦点，并把两个 API 的
   *  结果写进常显诊断 —— 下一张截图就能看出焦点到底有没有抢成功。
   *  另设 `KeyProcessingMode.ANCESTOR_EVENT`：让「组件不处理」的按键向祖先冒泡，
   *  提高根组件收到按键的概率（默认 FOCUS_NAVIGATION 会把按键用于移动焦点）。 */
  private requestKeyFocusOnce(): void {
    let fcOk: boolean = false;
    try {
      const fc = this.getUIContext().getFocusController();
      fc.setKeyProcessingMode(KeyProcessingMode.ANCESTOR_EVENT);
      fc.requestFocus(KEY_FOCUS_ID);
      fcOk = true;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'ESCDBG FocusController failed');
    }
    let globalOk: boolean = false;
    try {
      // 全局 focusControl.requestFocus 返回 boolean（SDK 定义），第二十/二十一轮
      // 一直没接返回值，导致「抢焦点失败」完全不可见。R22 截图 f=N r12 = 全失败。
      globalOk = focusControl.requestFocus(KEY_FOCUS_ID);
    } catch (e2) {
      hilog.warn(DOMAIN, TAG, 'ESCDBG focus anchor request failed');
    }
    // 第二十三轮：锚点失败时也试根组件（旧实现只在抛异常时才试，漏掉返回 false）。
    if (!globalOk) {
      try {
        globalOk = focusControl.requestFocus(ROOT_FOCUS_ID);
      } catch (e3) {
        hilog.warn(DOMAIN, TAG, 'ESCDBG refocus root failed');
      }
    }
    this.focusDiag = 'fc=' + (fcOk ? 'Y' : 'N') + ' f=' + (globalOk ? 'Y' : 'N') +
      ' r' + this.focusRetryCount;
    hilog.info(DOMAIN, TAG, 'ESCDBG focus %{public}s', this.focusDiag);
  }

  /** 页面销毁时清掉重聚焦定时器，避免回调打到已释放的组件。 */
  private clearKeyRefocusTimer(): void {
    if (this.keyRefocusTimer !== -1) {
      clearTimeout(this.keyRefocusTimer);
      this.keyRefocusTimer = -1;
    }
  }

  /** 第二十一轮：注册窗口状态监听。mainWindow 由 EntryAbility 异步缓存，需重试等就绪。
   *  **关键**：windowStatusChange 由系统窗口管理器直接派发，既不经过 ESC 按键事件、
   *  也不依赖 ArkUI 焦点，因此是「系统消费首次 ESC 退出沉浸」最可靠的同步通道 ——
   *  前四轮全部卡在「等按键到达 APP」，这条链路根本不走按键。 */
  private registerWindowStatusSync(retry: number): void {
    if (this.winStatusListenerOn) {
      return;
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (win === undefined) {
      if (retry < WIN_STATUS_RETRY_MAX) {
        setTimeout(() => {
          this.registerWindowStatusSync(retry + 1);
        }, WIN_STATUS_RETRY_MS);
      }
      return;
    }
    try {
      win.on('windowStatusChange', (st: window.WindowStatusType): void => {
        this.onWindowStatusChanged(Number(st));
      });
      this.winStatusListenerOn = true;
      hilog.info(DOMAIN, TAG, 'ESCDBG windowStatusChange registered');
      this.ensureWindowFocusable(); // 第二十三轮：窗口级可聚焦 + wf 真值诊断
      this.syncFullWithWindow(); // 注册时先对齐一次，避免首帧状态就是脱节的
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'ESCDBG windowStatusChange register failed');
    }
  }

  /** 系统窗口状态变化：APP 自认全屏但系统已非全屏 → 立刻同步回普通态。
   *  setFull(false, true) 会顺带恢复界面三栏 / 几何快照并触发重聚焦，
   *  这正是第二十轮「重聚焦从未执行」的解锁点。APP 自己进 / 退全屏时
   *  shouldSyncFullFromWindow 为 false，不会递归。 */
  private onWindowStatusChanged(st: number): void {
    const sysFull: boolean = windowStatusIsFullscreen(st);
    this.winFullBySystem = sysFull;
    if (sysFull) {
      this.sawWindowFull = true;
    }
    // 第二十三轮：系统从全屏退回普通态的瞬间，窗口焦点才真正回到应用。
    // 旧实现 12 次焦点重试在启动后约 4.2s 就永久耗尽（R22 截图 r12），而
    // 「第二次 ESC」几乎总在那之后 —— 这里重置上限、重新保障窗口可聚焦并重抢焦点。
    if (!sysFull && this.sawWindowFull) {
      this.ensureWindowFocusable();
      this.focusRetryCount = 0;
      this.scheduleKeyRefocus();
    }
    // 只有「先见过全屏、再见非全屏」才同步，避免 2in1 上静态 FLOATING 误判。
    if (this.sawWindowFull && shouldSyncFullFromWindow(this.fullscreen, sysFull)) {
      hilog.info(DOMAIN, TAG, 'ESCDBG WIN→F sys=%{public}d', st);
      this.setFull(false, true);
    }
  }

  /** ESC 分派前主动读一次系统窗口真值兜底：即便 windowStatusChange 没派发，
   *  第二次 ESC 到达时也不会再被卡住的 fullscreen=true 误判成 EXIT_FULL。 */
  private syncFullWithWindow(): void {
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (win === undefined) {
      return;
    }
    let st: number = 0;
    try {
      st = Number(win.getWindowStatus());
    } catch (e) {
      return;
    }
    const sysFull: boolean = windowStatusIsFullscreen(st);
    this.winFullBySystem = sysFull;
    // 同样要求前置证据：系统确实进过全屏，才允许用「当前非全屏」同步。
    // 否则在 2in1（getWindowStatus 恒 FLOATING）上，进全屏后第一次 ESC 会直接退出 APP。
    if (this.sawWindowFull && shouldSyncFullFromWindow(this.fullscreen, sysFull)) {
      hilog.info(DOMAIN, TAG, 'ESCDBG KEY→F sys=%{public}d', st);
      this.setFull(false, true);
    }
  }

  // ------------------------------------------------------------------
  // UI 片段
  // ------------------------------------------------------------------

  /** 第十四轮：预览图放大镜浮层（6cm 圆形 / 3 倍局部 / 跟随光标 / 边缘夹界）。
   *  第十五轮：总开关 loupeEnabled 预设关闭，右键 toggle 后才绘制；关闭时
   *  loupePane / loupeHover / 坐标仍照常维护，开启即可立即显示，无需重新移入。
   *  左右并排两页各调用一次，按 loupeVisibleOf 命中当前激活的那一页：
   *  鼠标在哪页，哪页显示它自己那张图的局部放大，另一页完全不绘制（互不影响）。
   *  全屏 / 正常模式都用同一份 Builder —— 预览 Row 不因 fullscreen 被移除，
   *  故全屏态同样保留完整放大镜效果。
   *  圆内放大图 = 该页显示框整体等比放大 LOUPE_ZOOM 倍（objectFit 仍为 Contain →
   *  与主图逐点对应且不变形），用 loupeClampedOffset 把光标处的图像点对齐圆心，
   *  边缘 clamp 保证圆 (0..d) 始终被放大图覆盖，不空白、不错位。
   *  圆本身用 borderRadius(d/2) + clip(true) 裁出；Transparent 命中模式让浮层不吞鼠标事件，
   *  否则圆一出现就挡住光标、触发 leave → 闪烁。
   *  第十七轮：>1:1 时优先画「按放大后像素需求重解码」的高分辨率图源（loupeHiPx），
   *  五个源统一开 High(Cubic) / Low 插值 + `.antialiased(true)` 边缘 AA；
   *  圆内放大图的尺寸 / 偏移全部整像素对齐；≤1:1 完全旁路（不额外解码、
   *  不改主视图画质属性），未缩放 / 1:1 显示不受影响。 */
  @Builder
  loupeLayer(pane: number, uri: string, half: boolean) {
    if (loupeVisibleOf(this.loupeEnabled, this.loupePane, pane,
      this.loupeHover, this.hasLoupeImage(pane))) {
      Stack() {
        if (this.loupeHiUsable(uri, pane)) {
          // 第十七轮：>1:1 时优先用「按放大后像素需求重解码」的高分辨率图源。
          // 真实像素补足 → 无像素块 / 无锯齿；objectFit(Contain) 保证与主图逐点对应、不变形。
          // SDK 26 官方：.interpolation() 对 PixelMap 生效（High=Cubic 放大最高质量），
          // .antialiased(true) 再补 PixelMap 边缘 AA（默认关闭，since 23）。
          // 第六十七轮：系统 native 级 AA 缩放产物优先（一次 Cubic 重采样、跨帧稳定），
          // 失败 / 能力不足自动回落到 R17 高清重解码图源，五个图源分支与交互逐字不变。
          Image(this.loupeDisplayPx(uri, pane))
            .objectFit(ImageFit.Contain)
            .interpolation(this.loupeInterpolation())
            .antialiased(LOUPE_AA_ENABLED)
            .draggable(false)
            .width(this.loupeContentW(pane, half))
            .height(this.loupeContentH(half))
            .position({ x: this.loupeOffX(pane, half), y: this.loupeOffY(half) })
        } else if (pane === LOUPE_PANE_RIGHT) {
          // 并排右页：只认 rightPixelMap（与右页主图同源，逐点对应）。
          // 刻意不画 uri 兜底，也不加主画质属性 —— 那三处画质契约要求全源码恰好 3 处，
          // 放大镜是临时浮层，不参与计数。
          if (this.rightPixelMap !== undefined) {
            Image(this.rightPixelMap!)
              .objectFit(ImageFit.Contain)
              .interpolation(this.loupeInterpolation())
              .antialiased(LOUPE_AA_ENABLED)
              .draggable(false)
              .width(this.loupeContentW(pane, half))
              .height(this.loupeContentH(half))
              .position({ x: this.loupeOffX(pane, half), y: this.loupeOffY(half) })
          }
        } else if (this.viewPixelMap !== undefined) {
          Image(this.viewPixelMap!)
            .objectFit(ImageFit.Contain)
            // 放大镜是「放大显示」的临时浮层，不参与主视图 / 兜底 / 右页那三处
            // autoResize(false) 的画质契约计数；插值 High/Low 两档 + 边缘 AA。
            .interpolation(this.loupeInterpolation())
            .antialiased(LOUPE_AA_ENABLED)
            .draggable(false)
            .width(this.loupeContentW(pane, half))
            .height(this.loupeContentH(half))
            .position({ x: this.loupeOffX(pane, half), y: this.loupeOffY(half) })
        } else if (this.lowPixelMap !== undefined) {
          Image(this.lowPixelMap!)
            .objectFit(ImageFit.Contain)
            .interpolation(this.loupeInterpolation())
            .antialiased(LOUPE_AA_ENABLED)
            .draggable(false)
            .width(this.loupeContentW(pane, half))
            .height(this.loupeContentH(half))
            .position({ x: this.loupeOffX(pane, half), y: this.loupeOffY(half) })
        } else {
          Image(uri)
            .objectFit(ImageFit.Contain)
            .interpolation(this.loupeInterpolation())
            .antialiased(LOUPE_AA_ENABLED)
            .draggable(false)
            .width(this.loupeContentW(pane, half))
            .height(this.loupeContentH(half))
            .position({ x: this.loupeOffX(pane, half), y: this.loupeOffY(half) })
        }
      }
      .width(LOUPE_D_VP)
      .height(LOUPE_D_VP)
      .borderRadius(LOUPE_D_VP / 2)
      .clip(true)
      .border({ width: 2, color: '#e8ecf4' })
      .position({ x: this.loupeLeft(), y: this.loupeTop() })
      .hitTestBehavior(HitTestMode.Transparent)
    }
  }

  /** 第一百轮：这张图此刻是否吃到超分（真值源在 common/SrBadge.ts）。
   *  只用「屏幕上真正在画的那张超分产物」做判据 —— 产物被释放后画面回到原图，
   *  标记必须同时消失，绝不留下「标了却没超分」的假标签。 */
  private srBadgeShownFor(uri: string): boolean {
    return srBadgeShownOf(this.viewSrPx !== undefined, this.viewSrUri, uri, this.viewSrEdge);
  }

  /** 第一百轮：「AI超分辨率」标记。
   *
   *  位置：`.position({ x: 10, y: 10 })` —— **相对预览框**左上角，不是相对图片内容。
   *  所以无论 zoom / 平移 / 旋转 / 镜像，无论单张、并排、全屏、窗口拉大拉小，
   *  标记永远钉在同一个角落、同一尺寸（数值全是 vp 常量，不参与 layoutWeight 摊分）。
   *  若改成「贴在图片内容的左上角」，缩放时它会跟着跑，反而成了干扰。
   *
   *  交互：`HitTestMode.Transparent` —— 不阻塞任何兄弟节点 / 祖先节点的命中测试，
   *  事件照旧落到下面的图与预览 Stack 上。所以左键放大镜、右键相片菜单、拖拽平移、
   *  滚轮切图 / 缩放**完全不受影响**，悬停（放大镜 onHover）也不会被这枚标签截走。
   *  这里刻意沿用本文件「浮层一律 Transparent」的既有口径（信息层 / 角标 / 提示卡同款），
   *  不用 `None`：`None` 会让整棵子树退出命中链，个别机型上会让祖先的 onHover 断流，
   *  对一枚纯展示标签没有收益。
   *
   *  对比度：深底（#CC111318）+ 白字 + 0.35 白描边，压纯白画面 ≥10:1、压纯黑 ≥19:1
   *  （见 common/SrBadge.ts 的核算），不做亮/暗图双套样式 —— 那会随切换忽明忽暗。
   *
   *  未超分时整个 Row 都不渲染（`if` 条件渲染），不是 opacity 0 的透明占位：
   *  既不占位、也不可能被点到、更不会在无障碍树里留一个空标签。 */
  @Builder
  srBadgeLayer(uri: string) {
    if (this.srBadgeShownFor(uri)) {
      Row() {
        Text(SR_BADGE_TEXT)
          .fontSize(SR_BADGE_FONT)
          .fontColor(SR_BADGE_FG)
          .fontWeight(FontWeight.Medium)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .height(SR_BADGE_H)
      .padding({ left: SR_BADGE_PAD_X, right: SR_BADGE_PAD_X })
      .backgroundColor(SR_BADGE_BG)
      .borderRadius(SR_BADGE_RADIUS)
      .border({ width: SR_BADGE_BORDER_W, color: SR_BADGE_BORDER })
      .position({ x: SR_BADGE_INSET, y: SR_BADGE_INSET })
      .hitTestBehavior(HitTestMode.Transparent)
      .accessibilityText(SR_BADGE_TEXT)
    }
  }

  /** 主视图：优先画「我们自己解码的 PixelMap」（清晰，且一定是当前这张）；
   *  只有自解码失败（如某些 uri 打不开）时才回退到 Image(uri) 交给系统解码兜底。
   *
   *  注意：@Builder 的 UI 描述体内**只能写 UI 语法**，不能声明局部变量
   *  （`const pm = this.viewPixelMap` 会报 "Only UI component syntax can be written here"），
   *  因此这里直接读状态字段、用 `!` 做非空断言。 */
  @Builder
  previewImage(uri: string, token: number, half: boolean) {
    Stack() {
      if (this.viewPixelMap !== undefined) {
        Image(this.viewDisplayPx(uri))    // 第六十八轮：系统 native AA 精炼产物优先，失败回退 R62 自解码图源
          .objectFit(ImageFit.Contain)
          // 第六十二轮：不再无条件 High(Cubic)。viewEdge() 是 1.5×/2.0× oversampling，
          // zoom=1 时 GPU 实际在缩小 0.67×/0.50×，Cubic 负 lobe 产生过冲 / 振铃（波纹）；
          // 现在按有效缩放比动态选档 + 全源开 PixelMap 边缘 AA。
          // autoResize(false) 不让组件解码时再降采样损信息，配合全屏按新画布重解码。
          .interpolation(this.previewInterpolation())
          .antialiased(this.previewAntialias())
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
          .draggable(false)
          .width(this.pageWLeft(half))
          .height(this.pageH(half))
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
      } else if (this.viewFailed) {
        // 兜底：**只有自解码确认失败**才交给系统解码。
        // 不能在解码期间就画 Image(uri) —— 那正是「上一张还留在屏幕上」的来源。
        Image(uri)
          .objectFit(ImageFit.Contain)
          .interpolation(this.previewInterpolation())
          .antialiased(this.previewAntialias())
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
          .draggable(false)
          .width(this.pageWLeft(half))
          .height(this.pageH(half))
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
          .antialiased(this.previewAntialias())
          .draggable(false)
          .width(this.pageWLeft(half))
          .height(this.pageH(half))
          .scale({
            x: this.zoom * (this.flipH ? -1 : 1) * this.focusZoom(),
            y: this.zoom * (this.flipV ? -1 : 1) * this.focusZoom()
          })
          .blur(this.blurRadius)
          .opacity(this.lowOpacity)
      }

      // 第九十七轮：幻灯片交叉淡化（**遮挡式单层淡出**，专门用来消除闪屏）。
      //
      // 为什么不再让主图淡入：
      //   R96 是「主图 0→1、旧图 1→0」的双向淡化。两个 opacity 是两次独立 @State 写入，
      //   ArkUI 在跨帧 / 跨异步边界提交时可能出现「主图已经是 0、叠显层还没提交成 1」的一帧 ——
      //   那一帧底下什么都没有，就是用户看到的**闪屏（中灰一闪）**。
      //   现在主图**恒为不透明**（不写 opacity），只有上面这张旧图 1→0：
      //   屏幕 = out·旧 + (1−out)·新，数学上仍是标准交叉淡化，但**任何一帧都有主图垫底**，
      //   结构上不存在「两层都半透明」或「一层都没有」的中间帧。
      //
      // 位置也改了：排在**低清过渡层之后**。旧顺序里模糊层盖在叠显层上面，切图走了
      // loadQuick 时那层模糊会盖住整个交叉淡化（观感同样是闪一下糊图）。
      // 现在是：主图 → 低清层 → 旧图淡出层 → 放大镜，过渡期间不会被任何图层从上面压住。
      // 条件只依赖 slideOutPx 一个状态（不再叠加一个 blend 布尔），少一次状态翻转。
      if (this.slideOutPx !== undefined) {
        Image(this.slideOutPx!)
          .objectFit(ImageFit.Contain)
          .interpolation(this.previewInterpolation())
          .antialiased(this.previewAntialias())
          .draggable(false)
          .width(this.pageWLeft(half))
          .height(this.pageH(half))
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
          .opacity(this.slideOutOpacity)
      }

      // 第一百轮：超分标记压在**所有图片层之上**（主图 / 低清过渡 / 旧图淡出），
      // 但在放大镜之前 —— 放大镜是「用户正在用的工具」，不该被一枚标签挡住。
      // 标记不透明度恒为 1，不参与幻灯片淡化：它标的是「这一张是超分图」这个事实，
      // 若是跟着淡出层一起淡，反而会在过场里闪一下。
      this.srBadgeLayer(uri);

      // 第十四轮：放大镜浮层排在最后一层（z 序最高），按左页 pane 独立判定。
      this.loupeLayer(LOUPE_PANE_LEFT, uri, half);
    }
    .width(this.pageWLeft(half))
    .height(this.pageH(half))
    .onHover((on: boolean) => this.onLoupeHover(on, LOUPE_PANE_LEFT))
    // 第一百零六轮：右键先在这里判「按在哪一页」，锁定菜单目标；其余事件原样交给放大镜通道。
    .onMouse((event: MouseEvent) => this.onPaneMouse(event, LOUPE_PANE_LEFT, half))
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
  rightPageImage(uri: string, half: boolean) {
    Stack() {
      if (this.rightPixelMap !== undefined) {
        Image(this.rightPixelMap!)
          .objectFit(ImageFit.Contain)
          .interpolation(this.previewInterpolation())
          .antialiased(this.previewAntialias())
          .autoResize(false)
          .dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)
          .draggable(false)
          .width(this.pageWRight(half))
          .height(this.pageH(half))
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
      } else {
        // 右页还在解码：只占住这一半画布，不触发任何原图解码。
        // 底色与主预览区一致，视觉上就是「这一页还没到」，不会有上一对的残影。
        Column()
          .width(this.pageWRight(half))
          .height(this.pageH(half))
          .backgroundColor(CANVAS_BG)
      }

      // 第九十七轮：右页与左页**同步**做遮挡式淡出（同一个 slideOutOpacity）。
      // 只在并排播放时 slideOutRightPx 才非空；单张播放时整层不渲染。
      // 不做这层的话：左页在淡、右页已经跳成新图 —— 观感就是「半边闪一下」。
      if (this.slideOutRightPx !== undefined) {
        Image(this.slideOutRightPx!)
          .objectFit(ImageFit.Contain)
          .interpolation(this.previewInterpolation())
          .antialiased(this.previewAntialias())
          .draggable(false)
          .width(this.pageWRight(half))
          .height(this.pageH(half))
          .scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })
          .opacity(this.slideOutOpacity)
      }

      // 第十四轮：右页也挂自己的放大镜浮层（按 RIGHT pane 独立判定、取右页图源）。
      // 与左页各用各的局部坐标与图源，同一时刻只会命中被悬停的那一页。
      this.loupeLayer(LOUPE_PANE_RIGHT, uri, half);
    }
    .width(this.pageWRight(half))
    .height(this.pageH(half))
    .onHover((on: boolean) => this.onLoupeHover(on, LOUPE_PANE_RIGHT))
    // 第一百零六轮：右页右键 → 菜单锁到右页那张（左页仍锁 cur），互不串数据。
    .onMouse((event: MouseEvent) => this.onPaneMouse(event, LOUPE_PANE_RIGHT, half))
  }

  // ------------------------------------------------------------------
  // 主构建
  // ------------------------------------------------------------------

  /** 第八十四轮：把当前目录名写进**系统窗口标题栏**（带最小化 / 最大化 / 关闭按钮那条 decor）。
   *
   *  SDK 26 `@ohos.window.d.ts:7773` 的 `setWindowTitle(titleName)`（`@since 15`）注释明确：
   *  「标题显示区域不超出系统三按钮区左侧，超出部分以省略号呈现」—— 正是用户要的位置。
   *  （项目旧注释里「鸿蒙没有 setWindowTitle」是 R11 时期的结论，SDK 15 起已不成立。）
   *
   *  ⚠️ 应用内自绘顶栏（旧 `topBar()`）已在第九十四轮按要求整条移除：
   *   目录名从此**只有**系统 decor 标题这一个显示位（窗口管理器绘制，带三按钮，
   *   沉浸全屏时随 decor 一起隐藏），界面里不再有第二条重复的标题栏。
   *
   *  `@Watch('syncWindowTitle')` 挂在 `@State source` 上 ⇒ 换目录 / 往上层 / 恢复 / 上层清单
   *  全部自动同步。窗口对象未就绪时短延时重试；801（能力不支持）/ 窗口态异常只记日志。 */
  private syncWindowTitle(propName: string = ''): void {
    this.applyWindowTitle();
  }

  /** 真正写标题。**刻意不引入任何计时器**（本文件的「零动画 / 零延迟」静态契约切片
   *  盯着预览相关 builder，多一个 setTimeout 就会误报）：
   *  窗口对象未就绪时直接跳过，靠 `@Watch` 的下一次 source 变化或 `onPageShow` 重试。*/
  private applyWindowTitle(): void {
    if (!this.pageAlive) {
      return;
    }
    const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');
    if (!win) {
      hilog.info(DOMAIN, TAG, 'window title: window not ready, skip');
      return;
    }
    const name: string = this.source.length > 0 ? this.source : 'PIKAN';
    win.setWindowTitle(name).catch((e: Object) => {
      hilog.warn(DOMAIN, TAG, 'setWindowTitle failed: %{public}s', JSON.stringify(e));
    });
    hilog.info(DOMAIN, TAG, 'window title: %{public}s', name);
  }

  build() {
    Stack({ alignContent: Alignment.TopStart }) {
      Column() {
        // 第十三轮：顶栏不再放进主体 Column —— 默认整栏不渲染，完全不占布局空间，
        // 左侧文件列表与预览区从窗口顶端开始（最大化）。浮层见根 Stack 末尾。
        // ============================== 主体 ==============================
        Row() {
        // ---------- 左侧：图像档案列表 ----------
        if (!this.fullscreen) {
          // R40（Index.ets 拆分 Phase 3）：左栏整体迁至 components/SidebarView.ets；
          // 状态仍归 Index（@Prop 下传 / 回调上抛），UI 描述与拆分前逐行等价。
          SidebarView({
            itemCount: this.itemCount,
            sortAsc: this.sortAsc,
            rowCount: this.rowCount,
            resumeHint: this.resumeHint,
            cur: this.cur,
            // 第五十九轮：往上层落地后的反色标记（空串 = 无反色），与 cur 并列下传。
            upReturnName: this.upReturnName,
            listCollapsed: this.listCollapsed,
            listW: this.listW,
            // 第六十四轮：目录内容量文案 + 版本号下传（@Prop，统计落地即刷新可见行）。
            dirCountLabels: this.dirCountLabels,
            dirCountVersion: this.dirCountVersion,
            scroller: this.scroller,
            dataSource: this.dataSource,
            // 第七十七轮：悬停缩略图不再被恢复模式一刀切禁用（用户反馈「重启后缩略图丢失」）。
            // ThumbLoader 走 decodePx → 真异步 fs.open + 并发 1 + 失败即止，一次死 uri
            // 最多白等一次跨进程往返，绝不会累积成几百次同步 IO（历史 appfreeze 根因）；
            // 批量预载 / statSync / 对开探测仍由 bulkIoAllowed 闸门严控，防线不变。
            restoreReadonly: (): boolean => false,
            collapsedW: this.collapsedW,
            colSizeW: this.colSizeW,
            colDateW: this.colDateW,
            // 第一百一十轮：宽度不够时隐藏大小 / 日期两列（名称严格单行，超出截断）。
            hideMeta: this.hideMeta,
            onRowTap: (i: number): void => {
              this.onRowTap(i);
            },
            onDblTap: (i: number): void => {
              // Win64 7ff850d：双击档案名切换全屏（只对图片行生效）
              const r: ImageItem | undefined = this.rows[i];
              if (r !== undefined && (r.kind ?? ROW_IMAGE) === ROW_IMAGE) {
                this.undoLastClickZoom();
                this.toggleFull();
              }
            },
            onAction: (act: string): void => {
              this.doAction(act);
            },
            onScrollIndex: (first: number, last: number): void => {
              this.listFirstRow = first;
              this.listLastRow = last;
              // 第六十轮：可见范围重新上报（滚动 / scrollbar 出现消失 / 尺寸变化 / 换源）
              // 后消费挂起的定位请求；纯滚动过程 pending=false，护栏恒不动作，
              // 绝不把用户正在滚走的高亮拉回，也不改变既有滚动体验。
              this.guardHighlightVisible('onScrollIndex');
            },
            // 第七十三轮：档案行右键 Press → 上抛窗口坐标，由 Index 画应用内菜单浮层；
            // 全部真实行为（打开 / 详情 / 所在目录 / 复制）仍收口到 onFileContextAction。
            onContextMenu: (i: number, x: number, y: number): void => {
              this.onFileContextMenu(i, x, y);
            }
          })

          // 分隔条正中的 « / »（Win64 45~49 行）：与 Ctrl+B 同效。
          // 收起后按钮仍在原地，再点一下展回来；全屏时随左栏一起整条隐藏。
          // 第一百零八轮：整条分隔条 = 拖拽调宽手柄。
          // 第一百一十二轮：改为「Stack + 铺满整条的命中层 + 居中的按钮」——
          //   · 命中层是**真实绘制的子节点**（与本栏同色，视觉零变化），保证上 / 下空白处
          //     一定有可命中的目标；
          //   · 事件统一冒泡到外层 Stack，只有一套 mouse / touch 处理；
          //   · 删掉负偏移的 responseRegion（详见下方注释），它是「只有按钮能拖」的元凶。
          Stack({ alignContent: Alignment.Center }) {
            // 命中层：铺满整条栏。透明容器不保证参与命中，所以这里给**不透明**同色底，
            // 与父层同色 ⇒ 看起来仍是一条纯色竖条，但任何一点都有真实命中目标。
            Column()
              .width('100%')
              .height('100%')
              .backgroundColor(splitActiveOf(this.sidebarDragging, this.sidebarHover)
                ? '#2f4159' : '#1a1d23')
              // 悬停判定挂在**命中层**（指针真正落在的节点）：换左右双箭头光标 +
              // 栏体浅高亮。onHover 不保证沿祖先链上抛，所以不能只挂在外层 Stack。
              .onHover((on: boolean) => {
                this.sidebarHover = on;
                this.applySplitCursor();
              })

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
                // 第五十八轮：同上，左栏结构变化后固定栏偏移必须重新采样。
                this.chromeW = -1;
                this.chromeH = -1;
                this.markWindowRect();
                this.status = this.listCollapsed ? '已收起左栏（Ctrl+B / » 展开）' : '已展开左栏';
              })
              // 第一百一十一轮：按钮不拦冒泡，按下照样走整条栏的同一套拖动处理。
              // 这里只留一个瞬时标记：这次按下落在按钮上 → 跳过「双击复位」判定，
              // 否则双击 « 会顺手把宽度复位（用户只想收起 / 展开）。
              .onMouse((event: MouseEvent) => {
                if (event.action === MouseAction.Press) {
                  this.splitPressOnButton = true;
                }
              })
              .onTouch((event: TouchEvent) => {
                if (event.type === TouchType.Down) {
                  this.splitPressOnButton = true;
                }
              })
          }
          .width(SPLIT_W)
          .height('100%')
          // 父层同样给底色：命中层与父层同色，任何一帧都不会出现色差。
          .backgroundColor(splitActiveOf(this.sidebarDragging, this.sidebarHover)
            ? '#2f4159' : '#1a1d23')
          // 悬停已下沉到命中层（见上）：本层只处理 mouse / touch。
          // ⚠️ 第一百一十二轮**删除了** `.responseRegion({ x: -6, width: 26 })`：
          //   负偏移的超界命中区在部分设备上会让**容器自身**的可命中区域失效
          //   （子节点 Button 用自己的区域照常命中），表现就是「只有中间按钮能拖」。
          //   现在命中目标由「铺满整条的命中层」提供，不再依赖超界区域。
          // 鼠标：左键 Press 起拖，Move 实时改宽，Release 收尾。
          // Press 处 stopPropagation —— 否则这次按下还会被预览 / 根容器当成「点画布」。
          .onMouse((event: MouseEvent) => {
            if (event.action === MouseAction.Press && event.button === MouseButton.Left) {
              const onBtn: boolean = this.splitPressOnButton;
              this.splitPressOnButton = false;
              this.onSplitPointerDown(this.splitMouseAbsX(event), onBtn);
              event.stopPropagation();
              return;
            }
            if (event.action === MouseAction.Move) {
              this.onSplitPointerMove(this.splitMouseAbsX(event));
              return;
            }
            if (event.action === MouseAction.Release) {
              this.onSplitDragEnd();
            }
          })
          // 触摸 / 手写笔：Down 起拖，Move 实时改宽，Up / Cancel 收尾。
          // 手指按下后系统会把后续 Move 都投递给本组件（触摸捕获），因此窄条也能连续拖。
          .onTouch((event: TouchEvent) => {
            if (event.type === TouchType.Down) {
              const onBtn: boolean = this.splitPressOnButton;
              this.splitPressOnButton = false;
              this.onSplitPointerDown(this.splitTouchAbsX(event), onBtn);
              return;
            }
            if (event.type === TouchType.Move) {
              this.onSplitPointerMove(this.splitTouchAbsX(event));
              return;
            }
            if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
              this.onSplitDragEnd();
            }
          })
          .accessibilityText('左栏与预览区之间的分隔条，左右拖动可调整左栏宽度，双击恢复自适应')
          .accessibilityLevel('yes')
        }

        // ---------- 右侧：大图预览（GPU 合成渲染）----------
        Stack({ alignContent: Alignment.Center }) {
          if (this.textMode) {
            // 第三十七轮：文本 / 源码预览与图片预览互斥，走独立的行数据源。
            this.textPreview();
          } else if (this.cur >= 0) {
            // 外层 Column：拖拽 + 旋转；内层 Image：缩放 + 镜像。
            // 第八十六轮：对开两页改为**等比填满**（此前各占半幅画布、各自居中，
            // 两页之间会留下半幅空白的中缝）。规则由 SpreadFit 统一给出：
            //   · 统一高度 h：两页缩放到同一高度，再按各自原始宽高比取宽
            //     （wL = h×arL、wR = h×arR）⇒ 各自等比、绝不拉伸；
            //   · h = min(可用高, 可用宽 / (arL + arR)) ⇒ 两页尽可能大；
            //   · 两页左右相邻、**中间零间隙**，整组由外层 Column 居中；
            //   · 高度受限 → 只在左右留白；宽度受限 → 只在上下留白（只空一个轴）。
            // Row 不设宽度：让它按两页实际宽度收缩，居中交给外层 Column，
            // 这样「中间零间隙」不依赖任何空格 / padding 常量。
            Column() {
              if (this.spreadB >= 0 && this.spreadB < this.items.length) {
                Row() {
                  this.previewImage(this.curItem()!.uri, this.curToken, true)
                  this.rightPageImage(this.items[this.spreadB].uri, true)
                }
                .justifyContent(FlexAlign.Center)
                .alignItems(VerticalAlign.Center)
              } else {
                this.previewImage(this.curItem()!.uri, this.curToken, false)
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
              Text('双击或 F 进入全屏 · 左键放大镜 · 右键相片菜单 · 拖拽平移')
                .fontSize(11)
                .fontColor('#454c5a')
                .margin({ top: 6 })
              Text('滚轮切换图片 · Ctrl + 滚轮缩放')
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

          // 第五十五轮：左上角档案名 / 大小 / 色彩信息浮层按用户要求取消 —— 平时预览区
          // 不再有任何常显角标；全屏时保留一行退出提示（真全屏没有任何标题列 / 按钮，
          // 这是唯一指引，且只在全屏出现）。
          if (this.fullscreen) {
            Row() {
              Text('全屏 · Esc / F11 / 双击退出')
                .fontSize(10)
                .fontColor('#8b95a8')
                .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                .backgroundColor('#cc12161c')
                .borderRadius(6)
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.Start)
            .alignItems(VerticalAlign.Top)
            .padding(12)
            .hitTestBehavior(HitTestMode.Transparent)
          }

          // 第七十一轮：HDR 保真异常态的明确提示（缺 HDR 信息 / 格式不兼容 / 文件损坏 /
          // 动态范围被压缩 / 产物标记不可读 / 原图超保真护栏）。正常态 hpShowHintOf=false，
          // 界面零新增常显控件；与 R70 徽标同款深色底板 + 圆角 + 描边，底部居中不遮主体；
          // HitTestMode.Transparent 让滚轮 / 拖拽 / 放大镜 / 点击全部穿透，交互零回归。
          if (hpShowHintOf(this.hdrCode)) {
            Column() {
              Text(this.hdrHint)
                .fontSize(11)
                .fontColor('#ffd479')
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
                .constraintSize({ maxWidth: 520 })
                .padding({ left: HB_PAD_H_VP, right: HB_PAD_H_VP,
                  top: HB_PAD_V_VP, bottom: HB_PAD_V_VP })
                .backgroundColor(HB_BG_COLOR)
                .border({ width: HB_BORDER_VP, color: HB_BORDER_COLOR })
                .borderRadius(HB_RADIUS_VP)
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.End)
            .alignItems(HorizontalAlign.Center)
            .padding({ left: HB_MARGIN_VP, right: HB_MARGIN_VP, bottom: HB_MARGIN_VP })
            .hitTestBehavior(HitTestMode.Transparent)
          }

          // 第七十轮：仅 HDR 相片在预览区左上角叠加「HDR」标识（自带近不透明深色底板 + 白字 +
          // 半透明描边，深浅背景恒清晰）。挂在预览区 Stack 直接子项、与图片 Column 平级 ⇒
          // 不随图片旋转 / 缩放 / 拖拽平移移动，恒固定左上角 + 12vp 边距；全屏时下移一行
          // 避开「全屏 · Esc / F11 / 双击退出」提示。HitTestMode.Transparent 让滚轮切图 /
          // 拖拽 / 右键放大镜 / 点击全部穿透，交互零回归。严格取 viewIsHdr（源图
          // ImageInfo.isHdr），不用 viewHdrWanted（含广色域 SDR，会误标非 HDR 相片）。
          if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode)) {
            Row() {
              Text(HB_LABEL)
                .fontSize(HB_FONT_VP)
                .fontWeight(FontWeight.Bold)
                .fontColor(HB_FG_COLOR)
            }
            .padding({ left: HB_PAD_H_VP, right: HB_PAD_H_VP,
              top: HB_PAD_V_VP, bottom: HB_PAD_V_VP })
            .backgroundColor(HB_BG_COLOR)
            .border({ width: HB_BORDER_VP, color: HB_BORDER_COLOR })
            .borderRadius(HB_RADIUS_VP)
            .position({ x: hbLeftOf(HB_MARGIN_VP),
              y: hbTopOf(this.fullscreen, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP) })
            .hitTestBehavior(HitTestMode.Transparent)
          }

          // 第七十六轮：仅【含有 EXIF 资料】的相片在预览区右上角叠加 EXIF 图标。
          // 与左上角 HDR 徽标同一套自带对比度底板，深浅背景恒清晰；整层铺满但不占布局，
          // HitTestMode.Transparent 让滚轮切图 / 拖拽 / 左键放大镜 / 右键相片菜单 /
          // 双击全屏全部穿透。显隐严格取 viewHasExif（第七十七轮：SDK 实际读到的
          // 有效 EXIF 字段，与资料框同源），无有效 EXIF 数据 / 空态 / 文本预览一律不画。
          if (pmExifBadgeVisibleOf(this.viewHasExif,
            this.viewPixelMap !== undefined, this.textMode)) {
            Column() {
              Row() {
                Text(PM_EXIF_LABEL)
                  .fontSize(HB_FONT_VP)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(HB_FG_COLOR)
              }
              .padding({ left: HB_PAD_H_VP, right: HB_PAD_H_VP,
                top: HB_PAD_V_VP, bottom: HB_PAD_V_VP })
              .backgroundColor(HB_BG_COLOR)
              .border({ width: HB_BORDER_VP, color: HB_BORDER_COLOR })
              .borderRadius(HB_RADIUS_VP)
            }
            .width('100%')
            .height('100%')
            .justifyContent(FlexAlign.Start)
            .alignItems(HorizontalAlign.End)
            .padding({ top: PM_EXIF_MARGIN_VP, right: PM_EXIF_MARGIN_VP })
            .hitTestBehavior(HitTestMode.Transparent)
          }

          // 右下角角标：正式版不画任何常显项（第五十五轮按用户要求取消缩放百分比方块）。
          // 目录诊断串默认隐藏（SHOW_DIAG_BADGE=false）；诊断层由 Ctrl+D 展开，
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
            // 「缓存 N 张」文案 / 控件已移除：缓存账目仍由 syncCacheStat 维护（内部可观测），
            // 只是不再画在百分比上方，右下角只剩这一行缩放百分比。
            // 第二十一轮：按过 ESC 后才出现的黄色链路诊断行。放在右下角角标层，
            // **全屏 / 普通都可见** —— 第二十轮把诊断放在「全屏时整块隐藏」的状态栏，
            // 恰恰是截图看不到任何诊断的原因，属于上一轮的设计缺陷。
            // 第二十二轮：keys=0 时也常显红色提示（此时 escDiag 必为空），
            // 把焦点请求结果直接摊在截图里，不用再猜「按键到底有没有到 APP」。
            // 第二十五轮：黄色 ESC 链路诊断只在诊断层展开时显示；
            // 正式版默认关闭，右下角只剩缩放百分比。
            if (this.diagOverlayOn) {
              if (this.escDiag.length > 0 || this.keySeen === 0) {
                Text((this.escDiag.length > 0
                  ? this.escDiag + ' · ' + this.focusDiag
                  : 'keys=0 · ' + this.focusDiag + ' · 未收到任何按键') +
                  ' · cap=' + this.capSeen + ' con=' + this.conSeen + ' dsp=' + this.dispatchSeen)
                  .fontSize(10)
                  .fontColor(this.escDiag.length > 0 ? '#ffd479' : '#ff9a9a')
                  .maxLines(3)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .constraintSize({ maxWidth: 460 })
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .backgroundColor('#cc12161c')
                  .borderRadius(4)
                  .margin({ bottom: 6 })
              }
            }
            // 第五十五轮：正式版右下角不再常显「缩放百分比」角标（用户要求取消）；
            // 诊断层（Ctrl+D）展开时仍显示「退出 APP」+ 全字段角标，回归排查入口不变。
            if (this.diagOverlayOn) {
              // 第二十三轮：ESC 被系统全局消费时 **100% 可用** 的退出入口。
              // 鼠标点击不依赖任何键盘事件 / 焦点 / 窗口形态，全屏与普通模式都可见。
              Text('退出 APP')
                .fontSize(10)
                .fontColor('#ff9a9a')
                .padding({ left: 6, right: 6, top: 4, bottom: 4 })
                .backgroundColor('#cc12161c')
                .borderRadius(4)
                .margin({ right: 6 })
                .onClick(() => {
                  this.quitApp();
                })
              // 第六十四轮：内容量缓存有效期设置只在 Ctrl+D 诊断层出现。
              // 用既有 ToolButton 组件（同款式）循环切换 TTL，正式界面零新增控件。
              // 刻意排在「退出 APP」之后：不改诊断层 if 与既有角标的既有相对顺序。
              ToolButton({ label: '内容量 ' + this.dirCountTtlLabel, act: 'dcTtl', flex: false,
                onAction: (a: string): void => { this.doAction(a); } })
              Text(this.zoomPercentText() + ' · ' + ESC_BUILD_TAG +
                ' · full=' + (this.fullscreen ? 'T' : 'F') +
                ' · win=' + (this.winFullBySystem ? 'T' : 'F') +
                ' · keys=' + this.keySeen +
                ' · dsp=' + this.dispatchSeen + ' · hk=' + this.hkDiag +
                ' · ' + this.winFocusDiag)
                .fontSize(12)
                .fontColor('#dfe5ef')
                .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                .backgroundColor('#cc12161c')
                .borderRadius(4)
                .onClick(() => {
                  this.toggleDiagOverlay();
                })
            }
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
          // Area.width/height 是 Length：正常给 number(vp)，个别机型给 '123vp' 之类的字符串。
          // 用 Number() 归一化；NaN / 0 一律跳过（绝不把 0 设进画布，那会把图片压没）。
          const w: number = Number(newV.width);
          const h: number = Number(newV.height);
          if (w > 0 && h > 0 && w === w && h === h) {
            const changed: boolean = (w !== this.canvasW) || (h !== this.canvasH);
            // ① 系统自行退出沉浸（真全屏下 ESC 常被窗口管理器先消费，APP 收不到按键）：
            //    全屏态画布相对基准缩小 → 自动切回完整界面，与双击退出完全对齐。
            const healReady: boolean = this.fullEnterAt > 0 &&
              (Date.now() - this.fullEnterAt) > FULL_SELF_HEAL_GUARD_MS;
            // 第十八轮：两路判据取或。第十六轮比例阈值(0.92)保留作「明显缩小」快路径；
            // 再加「≥ minShrinkPx 的绝对像素缩小」捕获系统栏 / dock / 标题栏回来那种
            // 小幅缩小（真全屏 ESC 被系统消费后的典型表现，比例阈值根本触发不了）。
            const shrinkBig: boolean = shouldExitFullOnResize(this.fullscreen, this.fullCanvasW, this.fullCanvasH, w, h,
              FULL_EXIT_SHRINK_RATIO);
            const shrinkSmall: boolean = shouldSelfHealOnResize(this.fullscreen, healReady,
              this.fullCanvasW, this.fullCanvasH, w, h, FULL_SELF_HEAL_MIN_SHRINK_PX);
            if (changed && healReady && (shrinkBig || shrinkSmall)) {
              this.canvasW = w;
              this.canvasH = h;
              // 第十九轮：系统把 ESC 消费掉、自行退出沉浸 → APP 被动同步回普通模式。
              // bySystemHeal=true 仅作诊断来源；shouldArmSystemEcho 恒不置位，
              // pendingSystemEcho 恒 false。系统消费后并不补发 ESC，故无需吞任何按键：
              // 用户随后主动按下的第二次 ESC 由 escActionByState 直接判 QUIT_APP 退出 APP。
              this.setFull(false, true);
              return;
            }
            // 第九十三轮：预览 Stack 的实测值才是真值；若它报来的是「变小」，留痕一条，
            // 便于和根反推的两条日志一起定位到底是谁改小了画布。
            if (w < this.canvasW || h < this.canvasH) {
              hilog.info(DOMAIN, TAG, 'canvas from preview: %{public}dx%{public}d (was %{public}dx%{public}d)',
                w, h, this.canvasW, this.canvasH);
            }
            this.canvasW = w;
            this.canvasH = h;
            // ② 第五十八轮：固定栏偏移改走 chromeSampleOf 自洽采样。
            //    旧写法 `chrome = lastRootW - w` 用「上一帧根尺寸」减「本帧画布」，
            //    PC 拖窗口 / 缩小视窗时两个 onAreaChange 异步交错，会把窗口缩小量
            //    错算进 chrome（稳态 300 → 缩小瞬间 900），根回调随后反推出塌缩画布
            //    覆盖实测值，实机即「预览图只占预览框很小面积」。现在基准一旦建立，
            //    chrome 异常变大一律判污染、保持原值；全屏 / 收起左栏由外部置 -1 重建。
            const chrome: Size2 = chromeSampleOf(this.chromeW, this.chromeH,
              this.lastRootW, this.lastRootH, w, h,
              CHROME_SAMPLE_TOL, CHROME_SAMPLE_MAX_RATIO);
            this.chromeW = chrome.w;
            this.chromeH = chrome.h;
            // ③ 记录全屏期间的画布基准（取最大值），供 ① 判定「缩小」；纯比对，不触发解码。
            if (this.fullscreen && (w > this.fullCanvasW || h > this.fullCanvasH)) {
              this.fullCanvasW = Math.max(this.fullCanvasW, w);
              this.fullCanvasH = Math.max(this.fullCanvasH, h);
            }
            // ④ 进出全屏后画布尺寸变了：按新尺寸立刻重解（不走升级延迟），
            // 否则沿用旧档位的 PixelMap 只是把小图拉大 —— 全屏画质会明显发虚。
            if (changed && this.pendingReload) {
              this.pendingReload = false;
              this.clearCanvasReloadFallback();
              this.clearResizeReload();
              this.refreshForCanvasResize();
            } else if (changed &&
              shouldReloadOnResize(this.lastReloadW, this.lastReloadH, w, h, RESIZE_MIN_DELTA_PX)) {
              // ⑤ 普通拖窗口 resize：**累积差**判据 + 节流重解。
              //    跟「上次真正重解时的画布」比，而不是跟上一帧比 —— 每帧只变 1~3vp
              //    也能累积到阈值；防抖改成节流，拖动过程中就会持续按新画布重解。
              this.armResizeReload();
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
        // 第七十六轮：预览区相片上左键 toggle 放大镜 / 右键弹 picture menu / 双击切换全屏
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
        Column() {
        Row() {
          // 第二十轮：把 ESC 链路诊断直接拼在状态栏，真机按两下 ESC 即可截图回传断点。
          Text(this.status + (this.diagOverlayOn && this.escDiag.length > 0 ? '  ·  ' + this.escDiag : ''))
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

        // 第一百零六轮：快捷键总表 —— 独立第二行，**不覆盖**第一行的状态文案。
        // 多图并排 / 普通预览都在（都走这段状态栏）；全屏时整条状态栏按既有逻辑隐藏。
        // 真值源在 common/Shortcuts.ts，界面只负责渲染，不各拼一份。
        Row() {
          Text(shortcutHintsTextOf())
            .fontSize(10)
            .fontColor('#6b7484')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .width('100%')
        .height(18)
        .padding({ left: 16, right: 16 })
        .alignItems(VerticalAlign.Center)
        .backgroundColor('#12161c')
        }
        .width('100%')
        .backgroundColor('#12161c')
      }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#101216')
      .id(ROOT_FOCUS_ID)
      .focusable(true)
      // 第二十二轮：**移除这里的 defaultFocus 声明**。ArkUI 一页只能有一个
      // defaultFocus，根 Column 与下面的 Button 锚点同时声明会互相冲突、谁都拿不到
      // 焦点 —— 这正是「零按键到达 onKey」最可能的直接原因。焦点统一交给 Button 锚点。
      // 第二十轮：双通道按键 —— onKeyPreIme 在 IME / 系统之前拦下 ESC 并主动消费；
      // onKeyEvent 改用返回 boolean 的重载兜底并消费 ESC（原 void 重载会让事件继续冒泡，
      // 在真全屏下极易被系统窗口管理器拿走）。原 onKey 签名与 ESC 分派代码一字未动。
      .onKeyPreIme((event: KeyEvent): boolean => this.onKeyCapture(event))
      .onKeyEvent((event: KeyEvent): boolean => this.onKeyConsumed(event))
      // 第二十二轮：第三通道 —— 分发阶段，不依赖焦点（见 onKeyDispatch 注释）。
      .onKeyEventDispatch((event: KeyEvent): boolean => this.onKeyDispatch(event))

      // 第二十三轮：R22 截图 f=N r12 说明这个锚点 12 次都没进焦点树。两个原因：
      //  ① `Button() { }` 空 builder 可能不生成真实可聚焦节点 → 改 `Button('·')` 带内容；
      //  ② `.hitTestBehavior(HitTestMode.None)` 让组件完全不参与命中 / 焦点 → 移除。
      // 尺寸也从 1vp 放大到 4vp（opacity(0) 仍不挡视线），确保被布局系统注册。
      // 按键事件在焦点链上派发，这里与根 Column 复用同一组 onKeyCapture /
      // onKeyConsumed，靠 KeyEvent 对象引用在 onKey 入口去重（零时间窗）。
      Button('·')
        .width(4)
        .height(4)
        .fontSize(1)
        .opacity(0)
        .id(KEY_FOCUS_ID)
        .focusable(true)
        .defaultFocus(true)
        .position({ x: 0, y: 0 })
        .onKeyPreIme((event: KeyEvent): boolean => this.onKeyCapture(event))
        .onKeyEvent((event: KeyEvent): boolean => this.onKeyConsumed(event))

      // 第七十二轮：右键「详情」面板。根 Stack 直接子项、绝对定位铺满窗口，
      // zIndex 20（第九十四轮已删掉旧的 zIndex 10 贴顶唤出层，层级更干净）；
      // 点遮罩或「关闭」即收，纯显示层，
      // 不碰 items / rows / cur / browseBase / 放大镜 / 滚轮 / 任何既有交互。
      if (this.ctxDetailOn) {
        Stack({ alignContent: Alignment.Center }) {
          Column()
            .width('100%')
            .height('100%')
            .backgroundColor('#99000000')
            .onClick(() => {
              this.ctxDetailOn = false;
            })
          Column() {
            Text(this.ctxDetailTitle)
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor('#e8ecf4')
              .width('100%')
              .margin({ bottom: 12 })
            ForEach(this.ctxDetailFields, (f: FcDetailField) => {
              Row() {
                Text(f.label)
                  .fontSize(12)
                  .fontColor('#8b95a8')
                  .width(84)
                Text(f.value)
                  .fontSize(12)
                  .fontColor('#dfe5ef')
                  .layoutWeight(1)
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .padding({ top: 5, bottom: 5 })
            }, (f: FcDetailField) => f.label)
            Button('关闭')
              .type(ButtonType.Normal)
              .fontSize(12)
              .fontColor('#e8ecf4')
              .backgroundColor('#2a2f3a')
              .borderRadius(6)
              .height(30)
              .width('100%')
              .margin({ top: 14 })
              .onClick(() => {
                this.ctxDetailOn = false;
              })
          }
          .width(460)
          .padding(20)
          .backgroundColor('#1c212a')
          .border({ width: 1, color: '#3a4150' })
          .borderRadius(10)
        }
        .width('100%')
        .height('100%')
        .position({ x: 0, y: 0 })
        .zIndex(20)
      }

      // 第七十三轮：档案列表右键菜单（应用内条件浮层）。
      // R72 的 bindContextMenu(ResponseType.RightClick) 依赖系统右键手势，2in1 真机实测
      // 「右键完全没反应」；本轮改由 ListItem.onMouse 右键 Press 上抛窗口坐标，这里按坐标
      // 画浮层 —— 与 R72 详情面板同一套机制，零系统手势依赖、零子窗口依赖。
      // zIndex 21 高于详情面板（20）；点遮罩 / 点任一菜单项即收，不接管滚轮与拖拽。
      if (fcMenuVisibleOf(this.ctxMenuOn, this.ctxMenuItems.length)) {
        Stack({ alignContent: Alignment.TopStart }) {
          Column()
            .width('100%')
            .height('100%')
            .onClick(() => {
              this.ctxMenuOn = false;
              this.ctxMenuHover = '';
            })
          Column() {
            Text(this.ctxMenuName)
              .fontSize(11)
              .fontColor('#8b95a8')
              .width('100%')
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .height(FC_MENU_TITLE_H)
              .padding({ left: 12, right: 12 })
            ForEach(this.ctxMenuItems, (it: FcMenuItem) => {
              Row() {
                Text(it.label)
                  .fontSize(13)
                  .fontColor('#e8ecf4')
              }
              .width('100%')
              .height(FC_MENU_ITEM_H)
              .padding({ left: 12, right: 12 })
              .backgroundColor(this.ctxMenuHover === it.act ? '#333b4a' : '#00000000')
              .borderRadius(4)
              .onHover((on: boolean) => {
                this.ctxMenuHover = on ? it.act : '';
              })
              .onClick(() => {
                const act: string = it.act;
                const idx: number = this.ctxMenuIdx;
                this.ctxMenuOn = false;
                this.ctxMenuHover = '';
                this.onFileContextAction(act, idx);
              })
            }, (it: FcMenuItem) => it.act)
          }
          .width(FC_MENU_W)
          .padding({ top: FC_MENU_PAD_V, bottom: FC_MENU_PAD_V })
          .backgroundColor('#262b35')
          .border({ width: 1, color: '#3a4150' })
          .borderRadius(8)
          .position({ x: this.ctxMenuX, y: this.ctxMenuY })
        }
        .width('100%')
        .height('100%')
        .position({ x: 0, y: 0 })
        .zIndex(21)
      }

      // 第七十六轮：预览区「相片右键菜单」浮层。只由预览区相片上右键 Press 上抛窗口坐标，
      // 与左栏 R72–R75 五项菜单完全独立；第一百零七轮起恒 5 项（1 个动作 + 4 个滑动开关），
      // 共用同一套几何真值源。zIndex 21 与左栏菜单同级（两者不会同时打开）；
      // 点遮罩即收；动作行点整行即执行；开关行只认开关本体与文字（避免与 Toggle 双触发）。
      if (pmMenuVisibleOf(this.pmMenuOn, this.pmMenuItems.length)) {
        Stack({ alignContent: Alignment.TopStart }) {
          Column()
            .width('100%')
            .height('100%')
            .onClick(() => {
              this.pmMenuOn = false;
              this.pmMenuHover = '';
              this.pmFocusAct = '';
            })
          Column() {
            Text(this.pmMenuName)
              .fontSize(11)
              .fontColor('#8b95a8')
              .width('100%')
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .height(PM_MENU_TITLE_H)
              .padding({ left: PM_MENU_PAD_H, right: PM_MENU_PAD_H })
            ForEach(this.pmMenuItems, (it: PmMenuItem) => {
              Row() {
                if (it.sw) {
                  // 左：滑动开关。用原生 Toggle.Switch —— 滑块位移 + 轨道变色由系统绘制
                  // （点击必有明确视觉反馈），并自带键盘可达与「已选中 / 未选中」读屏语义。
                  // 状态读 pmSwitchOnOf（实时真值）：菜单项快照只决定顺序 / 文案 / 可用性，
                  // 开关本身永远显示「此刻真正生效」的状态，不复制第二份影子状态。
                  Toggle({ type: ToggleType.Switch, isOn: this.pmSwitchOnOf(it.act) })
                    .width(PM_SWITCH_W)
                    .height(PM_SWITCH_H)
                    .selectedColor('#3f7fd6')
                    .switchPointColor('#f2f5fa')
                    // 开关恒可操作：菜单只在「预览区确有相片」时打开，四个开关此刻必然可用。
                    // 刻意不写 .enabled(false) —— 全工程既有契约是「控件永不禁用」；
                    // 纯函数里的 enabled 只用来把文字置灰（不可达状态下的兜底样式）。
                    // 可点击区域：可视 44×26，热区扩到 60×44（= 整行高）。
                    // 桌面端鼠标好点，移动端也不会因为开关太细而点不中。
                    .responseRegion({ x: -8, y: -9, width: PM_SWITCH_W + 16, height: PM_MENU_ITEM_H })
                    .focusable(true)
                    .accessibilityText(it.label)
                    .accessibilityDescription(pmSwitchDescOf(it.act, this.pmSwitchOnOf(it.act)))
                    .accessibilityLevel('yes')
                    .onFocus(() => {
                      this.pmFocusAct = it.act;
                    })
                    .onBlur(() => {
                      if (this.pmFocusAct === it.act) {
                        this.pmFocusAct = '';
                      }
                    })
                    .onChange((on: boolean) => {
                      this.onPmSwitch(it.act, on);
                    })
                } else {
                  // 纯动作行：与开关同宽的留白列 —— 五个标签的左边缘严格对齐、不跳。
                  Row()
                    .width(PM_SWITCH_W)
                    .height(PM_SWITCH_H)
                }
                // 右：功能名称。点文字同样切换（第二处大热区），与开关本体不重叠、不双触发。
                Text(it.label)
                  .fontSize(13)
                  .fontColor(it.enabled
                    ? (it.sw && this.pmSwitchOnOf(it.act) ? '#d6e5fb' : '#e8ecf4')
                    : '#59616f')
                  .fontWeight(it.sw && this.pmSwitchOnOf(it.act) ? FontWeight.Medium : FontWeight.Normal)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .layoutWeight(1)
                  .height(PM_MENU_ITEM_H)
                  .textAlign(TextAlign.Start)
                  .margin({ left: PM_SWITCH_GAP })
                  .onClick(() => {
                    // 只有开关行由文字触发切换；动作行（EXIF）由整行 onClick 收口，
                    // 避免文字 → 行冒泡导致同一次点击被执行两遍。
                    if (!it.sw || !it.enabled) {
                      return;
                    }
                    this.onPmRowTap(it);
                  })
              }
              .width('100%')
              .height(PM_MENU_ITEM_H)
              .padding({ left: PM_MENU_PAD_H, right: PM_MENU_PAD_H })
              .backgroundColor(this.pmMenuHover === it.act ? '#333b4a' : '#00000000')
              .borderRadius(6)
              // 键盘焦点框：Tab 到开关时整行有可见描边（读屏之外的第二重可见反馈）。
              .border({ width: this.pmFocusAct === it.act ? 1 : 0, color: '#5a9bf0' })
              .onHover((on: boolean) => {
                // 禁用项不给悬停高亮（点了也没反应，高亮会骗人）
                this.pmMenuHover = (on && it.enabled) ? it.act : '';
              })
              .onClick(() => {
                // 开关行不接管整行点击：否则与 Toggle 自身的 onChange 叠加，一按翻两次。
                if (it.sw || !it.enabled) {
                  return;
                }
                const act: string = it.act;
                this.pmMenuOn = false;
                this.pmMenuHover = '';
                this.onPictureMenuAction(act);
              })
            }, (it: PmMenuItem) => it.act)
          }
          .width(this.pmMenuW)
          .padding({ top: PM_MENU_PAD_V, bottom: PM_MENU_PAD_V })
          .backgroundColor('#262b35')
          .border({ width: 1, color: '#3a4150' })
          .borderRadius(8)
          .position({ x: this.pmMenuX, y: this.pmMenuY })
        }
        .width('100%')
        .height('100%')
        .position({ x: 0, y: 0 })
        .zIndex(21)
      }

      // 第七十六轮：第一项「显示exif资料框」动作的独立浮层（zIndex 22 高于两套菜单）。
      // 纯显示层：字段来自 PreviewEntry.exifFields，无字段时给出明确兜底文案，不开天窗。
      if (this.exifPanelOn) {
        Stack({ alignContent: Alignment.Center }) {
          Column()
            .width('100%')
            .height('100%')
            .backgroundColor('#99000000')
            .onClick(() => {
              this.exifPanelOn = false;
            })
          Column() {
            Text(this.exifPanelTitle)
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor('#e8ecf4')
              .width('100%')
              .margin({ bottom: 12 })
            if (pmExifEmptyOf(this.exifPanelFields.length)) {
              Text(PM_EXIF_EMPTY)
                .fontSize(12)
                .fontColor('#8b95a8')
                .width('100%')
            } else {
              ForEach(this.exifPanelFields, (f: PmExifField) => {
                Row() {
                  Text(f.label)
                    .fontSize(12)
                    .fontColor('#8b95a8')
                    .width(84)
                  Text(f.value)
                    .fontSize(12)
                    .fontColor('#dfe5ef')
                    .layoutWeight(1)
                    .maxLines(2)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .width('100%')
                .padding({ top: 5, bottom: 5 })
              }, (f: PmExifField) => f.label)
            }
            Button('关闭')
              .type(ButtonType.Normal)
              .fontSize(12)
              .fontColor('#e8ecf4')
              .backgroundColor('#2a2f3a')
              .borderRadius(6)
              .height(30)
              .width('100%')
              .margin({ top: 14 })
              .onClick(() => {
                this.exifPanelOn = false;
              })
          }
          .width(460)
          .padding(20)
          .backgroundColor('#1c212a')
          .border({ width: 1, color: '#3a4150' })
          .borderRadius(10)
        }
        .width('100%')
        .height('100%')
        .position({ x: 0, y: 0 })
        .zIndex(22)
      }
    }
    .width('100%')
    .height('100%')
    .onAreaChange((o: Area, n: Area) => {
      // 根 Stack 是 100%×100%，直接跟窗口尺寸，PC 拖窗口时它**必然**变化；
      // 深层 layoutWeight(1) 的预览 Stack 却不一定收到 onAreaChange。
      // 用首帧测出的固定栏偏移 chrome 精确反推新画布，作为 resize 的第二数据源。
      const rw: number = Number(n.width);
      const rh: number = Number(n.height);
      if (rw <= 0 || rh <= 0 || rw !== rw || rh !== rh) {
        return;
      }
      const changed: boolean = (rw !== this.lastRootW) || (rh !== this.lastRootH);
      // 第九十三轮：先留下「上一次的根尺寸」，后面判「画布缩小是否与根同幅」时要用。
      const prevRootW: number = this.lastRootW;
      const prevRootH: number = this.lastRootH;
      this.lastRootW = rw;
      this.lastRootH = rh;
      if (changed) {
        this.markWindowRect(); // 拖窗口时也记住当前尺寸（防抖），强杀进程不丢
        // 第七十七轮：容器尺寸真变化 → 三列宽 / 左栏宽按新容器重新自适应。
        const acNames: Array<string> = [];
        for (let i = 0; i < this.rows.length; i++) {
          acNames.push(this.rows[i].name);
        }
        this.refreshAdaptiveLayout(acNames);
      }
      // 第六十轮：根容器尺寸真变化（含 scrollbar 出现 / 消失引起的布局变化）时，
      // 重新挂起一次「高亮项完整可见」定位请求；只翻状态位，不加 padding / offset。
      // 放在所有 early return 之前，保证基准未就绪 / 画布未变时也能挂起。
      if (highlightResizeOf(this.highlightRootW, this.highlightRootH, rw, rh)) {
        this.highlightRootW = rw;
        this.highlightRootH = rh;
        this.armHighlightReveal('resize');
      }
      // 两个回调谁先到不确定：根先到时也要能建基准，别等下一次预览回调。
      //  第五十八轮：只在「基准未就绪 且 根尺寸确实变化」时 seed，走 chromeSampleOf
      //  自洽采样，避免「新根尺寸 − 旧画布」跨帧错配污染基准。
      //  关键：收起 / 展开左栏时根尺寸不变（changed=false），此时绝不 seed —— 否则会用
      //  旧画布把小 chrome 写成基准，随后预览回调里「展开 → chrome 变大」被误判为污染。
      //  基准已就绪时根回调也绝不改写 chrome —— 固定栏的维护权只归预览回调。
      if (changed && (this.chromeW < 0 || this.chromeH < 0)) {
        const chromeSeed: Size2 = chromeSampleOf(this.chromeW, this.chromeH,
          rw, rh, this.canvasW, this.canvasH,
          CHROME_SAMPLE_TOL, CHROME_SAMPLE_MAX_RATIO);
        this.chromeW = chromeSeed.w;
        this.chromeH = chromeSeed.h;
      }
      if (!changed || this.chromeW < 0 || this.chromeH < 0) {
        return; // 基准未就绪（首帧 / 刚进出全屏），等预览 Stack 那边重建
      }
      // 第九十三轮：信任窗内一律不反推。预览 Stack 的 onAreaChange 才是实测真值；
      // 这段时间（进出全屏后 1.5s）正是 root / preview 错帧的高发期。
      if (Date.now() < this.canvasRootTrustUntil) {
        hilog.info(DOMAIN, TAG, 'canvas resize: trust window, skip root-derived');
        return;
      }
      const box: Size2 = canvasFromRootOf(rw, rh, this.chromeW, this.chromeH);
      if (box.w <= 0 || box.h <= 0 || (box.w === this.canvasW && box.h === this.canvasH)) {
        return; // 预览 Stack 已经报过同样的尺寸，别重复触发重解
      }
      // 第五十八轮：反推值只是 R5 兜底，绝不能把塌缩 / 越界值覆盖到画布上。
      //  缩小视窗时若 chrome 仍被跨帧污染，反推 box 会远小于真实预览框；这里保守拒绝，
      //  保留当前可信画布（通常是预览回调刚写的实测值），保证图片始终按预览框合理适配。
      if (!canvasResizeAcceptOf(rw, rh, box.w, box.h, CANVAS_MIN_ROOT_RATIO)) {
        hilog.info(DOMAIN, TAG, 'canvas resize: reject shrunk box %{public}d×%{public}d vs root %{public}d×%{public}d',
          box.w, box.h, rw, rh);
        return;
      }
      // 第九十三轮：**画布缩小必须与根容器同幅**，否则判为跨帧错配污染。
      //   · 合法场景：用户把窗口拖小 → 根与画布一起变小，两者差值 ≈ chrome，应该接受；
      //   · 污染场景：根尺寸没变（或只变一点），反推的画布却小了 20×37vp —— 这正是
      //     「只有预览图片变小、其余布局没动」的成因（容器由布局决定，图片尺寸却读画布）。
      const dRootW: number = rw - prevRootW;
      const dRootH: number = rh - prevRootH;
      const dBoxW: number = box.w - this.canvasW;
      const dBoxH: number = box.h - this.canvasH;
      const shrinkOkW: boolean = dBoxW >= 0 || Math.abs(dBoxW - dRootW) <= CANVAS_SHRINK_TOL_VP;
      const shrinkOkH: boolean = dBoxH >= 0 || Math.abs(dBoxH - dRootH) <= CANVAS_SHRINK_TOL_VP;
      if (!shrinkOkW || !shrinkOkH) {
        hilog.info(DOMAIN, TAG,
          'canvas resize: reject unmatched shrink box=%{public}dx%{public}d keep=%{public}dx%{public}d dRoot=%{public}dx%{public}d',
          box.w, box.h, this.canvasW, this.canvasH, dRootW, dRootH);
        return;
      }
      this.canvasW = box.w;
      this.canvasH = box.h;
      this.armResizeReload();
    })
    .onMouse((event: MouseEvent) => this.onRootMouse(event))
  }

  // ==================================================================
  // 第三十七轮：纯文本 / 源码文件预览
  // 真值源在 common/TextDoc.ts；本段只做「真异步读字节 → 解码 → 建行数据源 → 渲染」。
  // 放在 build() 之后：既有静态契约的切片全部以方法签名为锚点，落在这里不会
  // 把新方法混进 previewImage / rightPageImage / applyItems 等切片。
  // ==================================================================

  /** 收掉文本预览态并作废旧读取代号。绝不碰图片缓存 / 目录状态 / 位置记忆。 */
  private closeTextMode(): void {
    this.textMode = false;
    this.textToken++;
    this.textLines = [];
    this.textBlockStarts = [];
    this.textSource.reload([]);
    this.textBarShow = false;   // 第六十三轮：收掉文本态时同步清门控，开新文件重新算
    this.textName = '';
    this.textStatusText = '';
    this.textTruncated = false;
    this.clearTextSelection();
  }

  /** 解码结果落地：切行 / 算行号栏宽 / 算横向滚动宽 / 通知 LazyForEach 重取。
   *  token 不符（用户已切到别的文件或退回图片态）直接丢弃迟到结果。 */
  private applyTextDecoded(name: string, lang: number, text: string, encLabel: string,
    truncatedBytes: boolean, token: number): void {
    if (token !== this.textToken || !this.textMode) {
      return;
    }
    const split: TextSplit = splitTextLines(text, TEXT_MAX_LINES);
    const truncated: boolean = split.truncated || truncatedBytes;
    this.textLines = split.lines;
    this.textBlockStarts = blockStartsOf(split.lines, lang);
    this.textNoW = lineNoWidthOf(split.lines.length);
    this.textContentW = textContentWidthOf(split.lines, TEXT_TAB_WIDTH,
      TEXT_CHAR_W_VP, this.textNoW, TEXT_CONTENT_MAX_VP);
    this.textTruncated = truncated;
    this.textStatusText = textStatusOf(name, lang, encLabel, split.lines.length, truncated);
    this.status = this.textStatusText;
    this.textSource.reload(split.lines);
    this.textScroller.scrollToIndex(0, false);
    this.textHScroller.scrollTo({ xOffset: 0, yOffset: 0 });
    this.textFirstRow = 0;
    this.textLastRow = 0;
    this.refreshTextBar();   // 第六十三轮：内容落地即算一次，条不再等尺寸事件
    hilog.info(DOMAIN, TAG,
      'text open name=%{public}s lang=%{public}d enc=%{public}s lines=%{public}d trunc=%{public}d',
      name, lang, encLabel, split.lines.length, truncated ? 1 : 0);
  }

  /** 点左栏文本行后的完整读取链。
   *  · fs.stat / fs.open / fs.read / fs.close 全用 Promise 版并 await —— R27 教训：
   *    `Promise.resolve(同步读)` 是伪异步，同步跨进程 IO 会触发 THREAD_BLOCK_6S；
   *  · 只读不写，绝不修改磁盘文件；字节上限 8MB / 行数上限 12 万，超出明确提示；
   *  · 编码候选由 TextDoc.encodingCandidatesOf 给（BOM / 严格 UTF-8 / GB18030 / Big5 /
   *    Windows-1252），逐个用 util.TextDecoder 试，再由 pickDecodedIndexOf 选替换字符最少的；
   *  · 二进位文件（NUL / 高比例控制字符）按提示展示，不刷满屏乱码。 */
  private async openTextFile(uri: string, name: string): Promise<void> {
    const token: number = ++this.textToken;
    const lang: number = textLangOf(name);
    if (lang === LANG_NONE) {
      this.status = '不是可预览的文本文件：' + name;
      return;
    }
    this.textMode = true;
    this.textName = name;
    this.textLang = lang;
    this.textTruncated = false;
    this.textStatusText = '正在读取文本…';
    this.status = '正在读取文本：' + name;
    this.textLines = [];
    this.textBlockStarts = [];
    this.textSource.reload([]);
    this.clearTextSelection();
    let file: fs.File | undefined = undefined;
    try {
      const st: fs.Stat = await fs.stat(uri);
      const cap: number = textReadCapOf(st.size, TEXT_MAX_BYTES);
      const truncatedBytes: boolean = textByteTruncatedOf(st.size, TEXT_MAX_BYTES);
      if (cap <= 0) {
        this.applyTextDecoded(name, lang, '', encodingLabelOf('utf-8'), truncatedBytes, token);
        return;
      }
      file = await fs.open(uri, fs.OpenMode.READ_ONLY);
      const buf: ArrayBuffer = new ArrayBuffer(cap);
      // 两参重载：刚 open 时文件指针在 0，一次读满；刻意不传 options 避开各 SDK
      // 版本 ReadOptions.offset 语义差异（与 RawStore.read 同一口径）。
      const got: number = await fs.read(file.fd, buf);
      if (token !== this.textToken || !this.textMode) {
        return;
      }
      const view: Uint8Array = new Uint8Array(buf);
      const use: number = got > 0 ? (got < cap ? got : cap) : 0;
      const bytes: Uint8Array = new Uint8Array(use);
      for (let i = 0; i < use; i++) {
        bytes[i] = view[i];
      }
      if (use === 0) {
        this.applyTextDecoded(name, lang, '', encodingLabelOf('utf-8'), truncatedBytes, token);
        return;
      }
      if (looksBinary(bytes)) {
        const hint: Array<string> = ['（二进制内容，不按文本显示）'];
        this.textLines = hint;
        this.textBlockStarts = blockStartsOf(hint, lang);
        this.textNoW = lineNoWidthOf(hint.length);
        this.textContentW = textContentWidthOf(hint, TEXT_TAB_WIDTH,
          TEXT_CHAR_W_VP, this.textNoW, TEXT_CONTENT_MAX_VP);
        this.textStatusText = '二进制内容，不按文本显示：' + name;
        this.status = this.textStatusText;
        this.textSource.reload(hint);
        return;
      }
      // BOM 由 encodingCandidatesOf 识别、由 textBodyOf 自行剥掉，
      // 避免 util.TextDecoder 把 U+FEFF 留在正文第一行。
      const encs: Array<string> = encodingCandidatesOf(bytes);
      const body: Uint8Array = textBodyOf(bytes);
      const decoded: Array<string> = [];
      const usedEncs: Array<string> = [];
      for (let k = 0; k < encs.length; k++) {
        try {
          const dec: util.TextDecoder = util.TextDecoder.create(encs[k]);
          decoded.push(dec.decodeToString(body));
          usedEncs.push(encs[k]);
        } catch (e) {
          // 平台不认识该编码：跳过，其余候选照常参与挑选
        }
      }
      if (decoded.length === 0) {
        this.textStatusText = '没有可用的文本编码：' + name;
        this.status = this.textStatusText;
        return;
      }
      const pick: number = pickDecodedIndexOf(decoded);
      this.applyTextDecoded(name, lang, decoded[pick], encodingLabelOf(usedEncs[pick]),
        truncatedBytes, token);
    } catch (e) {
      if (token === this.textToken) {
        this.textStatusText = '读取文本失败：' + name + ' · ' + JSON.stringify(e);
        this.status = this.textStatusText;
        hilog.warn(DOMAIN, TAG, 'text read FAIL name=%{public}s err=%{public}s',
          name, JSON.stringify(e));
      }
    } finally {
      if (file !== undefined) {
        try {
          await fs.close(file.fd);
        } catch (e2) {
          // 关闭失败不影响已读到的内容
        }
      }
    }
  }

  /** 当前行按语言 + 多行注释起始状态切出的 token 列表（显示层只读，不改原行）。 */
  private textTokensOf(idx: number): Array<TextToken> {
    if (idx < 0 || idx >= this.textLines.length) {
      return [];
    }
    const inBlock: boolean = idx < this.textBlockStarts.length ? this.textBlockStarts[idx] : false;
    return tokenizeLine(this.textLines[idx], this.textLang, inBlock, true).tokens;
  }

  /** 第五十一轮：行段选择 —— 范围 / 高亮 / 点选交互 / 复制 / 清除。
   *  纯 onClick 实现点两条定范围（不依赖 Shift 键态跟踪，键态在窗口失焦时会丢 Up）；
   *  复制走系统剪贴板（pasteboard），状态栏回报行号范围。 */
  private textSelRange(): Array<number> {
    if (this.textSelAnchor < 0 || this.textSelFocus < 0) {
      return [];
    }
    const a: number = Math.min(this.textSelAnchor, this.textSelFocus);
    const b: number = Math.max(this.textSelAnchor, this.textSelFocus);
    return [a, b];
  }

  private isTextRowSelected(idx: number): boolean {
    const r: Array<number> = this.textSelRange();
    return r.length === 2 && idx >= r[0] && idx <= r[1];
  }

  private textSelLabel(): string {
    if (this.textSelAnchor < 0 || this.textSelFocus < 0) {
      return '';
    }
    const a: number = Math.min(this.textSelAnchor, this.textSelFocus);
    const b: number = Math.max(this.textSelAnchor, this.textSelFocus);
    const n: number = b - a + 1;
    const head: string = a === b ? '已选第 ' + (a + 1) + ' 行'
      : '已选第 ' + (a + 1) + '–' + (b + 1) + ' 行（' + n + ' 行）';
    return head + ' · 点两条定范围，再点重选';
  }

  /** 第五十四轮：选段交互改为「按住左键定起点 → 拖动实时扩展 → 松开定终点」
   *  （替换第五十一轮的两次点击定界）。按住期间滚轮仍可滚动列表（滚着选跨屏段落）；
   *  再按一次重新选；取消走抬头「清除」按钮。onMouse 挂在 List 上统一收口：
   *  行级事件全部冒泡到 List（ArkUI 按住后 Move/Release 也不离开本组件），坐标即列表系。 */
  private textRowAt(y: number): number {
    const total: number = this.textTotalRows();
    if (total <= 0) {
      return -1;
    }
    if (y !== y) { // NaN：某些机型 MouseEvent 不给坐标，保持现状
      return this.textSelFocus;
    }
    const off: number = Number(this.textScroller.currentOffset().yOffset ?? 0);
    let row: number = Math.floor((off + y) / TEXT_ROW_H_VP);
    // 可见范围夹取：指针在视口上下沿之外时贴到首 / 末可见行，
    // 不越界选到文档头尾（要跨屏选就按住 + 滚轮滚动）。
    const vRows: number = this.textVpH > 0 ? Math.max(1, Math.round(this.textVpH / TEXT_ROW_H_VP)) : total;
    const first: number = Math.max(0, Math.floor(off / TEXT_ROW_H_VP));
    const last: number = Math.min(total - 1, first + vRows - 1);
    if (row < first) {
      row = first;
    }
    if (row > last) {
      row = last;
    }
    return row;
  }

  private onTextMouse(event: MouseEvent): void {
    if (event.action === MouseAction.Press) {
      if (event.button !== MouseButton.Left) {
        return; // 只认左键选段；右键 / 中键不碰选区
      }
      this.textSelAnchor = this.textRowAt(Number(event.y));
      this.textSelFocus = this.textSelAnchor;
      this.textSelDragging = true;
      return;
    }
    if (event.action === MouseAction.Move && this.textSelDragging) {
      this.textSelFocus = this.textRowAt(Number(event.y));
      return;
    }
    if (event.action === MouseAction.Release && this.textSelDragging) {
      this.textSelFocus = this.textRowAt(Number(event.y));
      this.textSelDragging = false;
    }
  }

  private copyTextSelection(): void {
    const r: Array<number> = this.textSelRange();
    if (r.length !== 2) {
      return;
    }
    const last: number = Math.min(r[1], this.textLines.length - 1);
    const parts: Array<string> = [];
    for (let i = r[0]; i <= last; i++) {
      parts.push(this.textLines[i]);
    }
    if (parts.length === 0) {
      return;
    }
    const data: pasteboard.PasteData =
      pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, parts.join('\n'));
    pasteboard.getSystemPasteboard().setData(data)
      .then(() => {
        this.status = '已复制第 ' + (r[0] + 1) + '–' + (last + 1) + ' 行（' + parts.length +
          ' 行）到剪贴板 · ' + ESC_BUILD_TAG;
      })
      .catch(() => {
        this.status = '复制失败（剪贴板不可用）· ' + ESC_BUILD_TAG;
      });
  }

  private clearTextSelection(): void {
    this.textSelAnchor = -1;
    this.textSelFocus = -1;
    this.textSelDragging = false;  // R54：松键判定一并复位，防半路丢 Release 后误扩展
  }

  /** 第六十三轮：内容驱动的滚动条显示判定（不依赖 onAreaChange 尺寸事件）。
   *  在「解码落地」与「视口尺寸到达」两个时机主动算一次写进 @State textBarShow；
   *  尺寸事件未回填时用画布高减固定栏兜底，并写回 textVpH 让既有滑块几何有数可算，
   *  onAreaChange 实测值随后到达会自愈纠正。几何 / 滑块 / 拖动 / 滚轮全部逐字未动。 */
  private refreshTextBar(): void {
    const rows: number = this.textLines.length;
    const vpH: number = textViewportHOf(this.textVpH, this.canvasH, TSB_CHROME_H_VP);
    if (vpH > 0 && !(this.textVpH > 0)) {
      this.textVpH = vpH;
    }
    const show: boolean = textBarVisibleSafeOf(rows, this.textVpH,
      this.canvasH, TEXT_ROW_H_VP, TSB_CHROME_H_VP);
    if (show !== this.textBarShow) {
      this.textBarShow = show;
    }
  }

  /** 第五十二轮：自绘纵向滚动条的几何与拖动。 */
  private textTotalRows(): number {
    return this.textLines.length;
  }

  /** 视口能放下的行数（按行高估算；onScrollIndex 的 last 滞后半行，只做参考值）。 */
  private textVisibleRows(): number {
    if (this.textVpH <= 0) {
      return 1;
    }
    return Math.max(1, Math.round(this.textVpH / TEXT_ROW_H_VP));
  }

  /** 滑块高（0 = 内容没超一屏，不画条）；最小 32，长文件滑块也有可抓的目标。 */
  private textVBarThumbH(): number {
    const total: number = this.textTotalRows();
    const vRows: number = this.textVisibleRows();
    if (total <= 0 || this.textVpH <= 0 || vRows >= total) {
      return 0;
    }
    let h: number = this.textVpH * vRows / total;
    if (h < 32) {
      h = 32;
    }
    return h > this.textVpH ? this.textVpH : h;
  }

  /** 滑块顶端位置：首行 / (总行 - 可见行) 比例 × (视口高 - 滑块高)。 */
  private textVBarTopPos(): number {
    const thumb: number = this.textVBarThumbH();
    if (thumb <= 0) {
      return 0;
    }
    const denom: number = this.textTotalRows() - this.textVisibleRows();
    if (denom <= 0) {
      return 0;
    }
    const maxTop: number = this.textVpH - thumb;
    const frac: number = this.textFirstRow / denom;
    return Math.max(0, Math.min(maxTop, frac * maxTop));
  }

  /** 拖滑块：拖动量换算目标首行号，scrollToIndex 落位（onScrollIndex 再回填滑块）。 */
  private textVBarDragTo(top: number): void {
    const thumb: number = this.textVBarThumbH();
    const maxTop: number = this.textVpH - thumb;
    const denom: number = this.textTotalRows() - this.textVisibleRows();
    if (thumb <= 0 || maxTop <= 0 || denom <= 0) {
      return;
    }
    const t: number = Math.max(0, Math.min(maxTop, top));
    const idx: number = Math.round(t / maxTop * denom);
    this.textScroller.scrollToIndex(idx, false);
  }

  /** 一行：行号栏 + 等宽 token 片段。@Builder 里不声明局部变量，
   *  随窗口 / 文件变化的尺寸一律直接读 @State（第五轮 ArkUI 按值参数不刷新的教训）。
   *  每个 token 一个 Text（Row 内 ForEach）—— 规避 ArkUI `Text()` 内不能动态生成 Span
   *  的限制；token 文本拼回去恒等于 expandTabsOf(原行)，不丢缩进 / 特殊字符。 */
  @Builder
  textRow(line: string, idx: number) {
    Row() {
      Text((idx + 1).toString())
        .fontSize(12)
        .fontFamily('monospace')
        .fontColor('#5b6478')
        .width(this.textNoW)
        .textAlign(TextAlign.End)
        .maxLines(1)
      Row() {
        ForEach(this.textTokensOf(idx), (t: TextToken, k: number) => {
          Text(t.text)
            .fontSize(12)
            .fontFamily('monospace')
            .fontColor(tokenColorOf(t.kind))
            .maxLines(1)
        }, (t: TextToken, k: number) => idx.toString() + ':' + k.toString())
      }
      .margin({ left: 8 })
    }
    .width(this.textContentW)
    .height(TEXT_ROW_H_VP)
    .alignItems(VerticalAlign.Center)
    .backgroundColor(this.isTextRowSelected(idx) ? '#2a3550' : '#00000000')
    // R54：行级 onClick 移除 —— 选段改由 List 级 onMouse（按住→拖→松开）统一收口
  }

  /** 文本预览整块：抬头（文件名 / 语言 / 编码 / 行数 / 截断提示）+ 可滚动行表。
   *  外层 Scroll 负责横向（长行不裁切、不换行、不丢内容），内层 List + LazyForEach
   *  负责纵向虚拟化（十几万行也只创建可见节点）。两者滚动轴不同，互不抢手势。 */
  @Builder
  textPreview() {
    Column() {
      Row() {
        Text(this.textName)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#e8ecf4')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .constraintSize({ maxWidth: 320 })
        // 第五十一轮：有行段选区时，抬头右侧换成「选区信息 + 复制 / 清除」工具条；
        // 无选区保持原来的语言 / 编码 / 行数状态。复用抬头一行，不挤压正文、不跳动布局。
        if (this.textSelAnchor >= 0) {
          Text(this.textSelLabel())
            .fontSize(11)
            .fontColor('#9fb4e8')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .margin({ left: 12 })
          Button('复制')
            .type(ButtonType.Normal)
            .fontSize(12)
            .fontColor('#e8ecf4')
            .backgroundColor('#2a2f3a')
            .borderRadius(6)
            .height(24)
            .padding({ left: 10, right: 10 })
            .margin({ left: 6 })
            .onClick(() => {
              this.copyTextSelection();
            })
          Button('清除')
            .type(ButtonType.Normal)
            .fontSize(12)
            .fontColor('#e8ecf4')
            .backgroundColor('#2a2f3a')
            .borderRadius(6)
            .height(24)
            .padding({ left: 10, right: 10 })
            .margin({ left: 6 })
            .onClick(() => {
              this.clearTextSelection();
            })
        } else {
          Text(this.textStatusText)
            .fontSize(11)
            .fontColor('#8b95a8')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
            .margin({ left: 12 })
        }
      }
      .width(this.textContentW)
      .height(32)
      .padding({ left: 12, right: 12 })
      .alignItems(VerticalAlign.Center)
      .backgroundColor('#1a1d23')

      // 第五十二轮：原生纵向条挂在全宽 List 的右缘（x = textContentW），长行横向滚出
      // 视口后它永远看不见 —— 改为视口右缘自绘条（见状态区注释）。Stack TopEnd 叠放：
      // 左层 = 原有横向 Scroll + 纵向 List；右层 = 自绘轨道 + 滑块（不随横向滚动移动）。
      Stack({ alignContent: Alignment.TopEnd }) {
        Scroll(this.textHScroller) {
          List({ scroller: this.textScroller, space: 0 }) {
            LazyForEach(this.textSource, (line: string, idx: number) => {
              ListItem() {
                this.textRow(line, idx)
              }
            }, (line: string, idx: number) => idx.toString() + ':' + line)
          }
          .width(this.textContentW)
          .height('100%')
          .scrollBar(BarState.Off)  // 原生条在视口外看不见还占位，关掉只留自绘条
          .cachedCount(6)
          .backgroundColor('#12161c')
          .onScrollIndex((first: number, last: number, center: number) => {
            this.textFirstRow = first;
            this.textLastRow = last;
            // 第五十三轮兜底：个别路径 onAreaChange 没回填视口高时，
            // 用首屏可见行数 × 行高估算，保证滑块几何有数可算。
            if (this.textVpH <= 0 && last > first) {
              this.textVpH = (last - first + 1) * TEXT_ROW_H_VP;
              hilog.info(DOMAIN, TAG, 'text vpH fallback=%{public}d', Math.round(this.textVpH));
            }
          })
          // R54：选段统一在 List 级收口（行事件冒泡上来；按住期间 Move/Release 不丢）
          .onMouse((event: MouseEvent) => {
            this.onTextMouse(event);
          })
        }
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Auto)
        .width('100%')
        .height('100%')
        .align(Alignment.TopStart)
        .onAreaChange((_o: Area, n: Area) => {
          this.textVpH = Number(n.height);
          this.refreshTextBar();   // 第六十三轮：实测尺寸到达后自愈纠正兜底估计
          hilog.info(DOMAIN, TAG, 'text area h=%{public}d rows=%{public}d',
            Math.round(this.textVpH), this.textLines.length);
        })

        // 第五十三轮：R52 真机仍不见条 —— if 条件里藏方法调用（textVBarThumbH()）
        // 的话，V1 的 if 分支依赖收集可能认不出来，首评 textVpH=0 为 false 之后
        // 就再也不重评。第六十三轮进一步订正：R53 虽号称「全直读 @State」，条件里
        // 仍塞了非 @State 的 textLines.length，且 textVpH 只靠 onAreaChange 尺寸事件；
        // 文本态从图片态切来时尺寸不变 → 事件不回调 → 条永久不显示。现在 if 只直读
        // 唯一 @State textBarShow，由 refreshTextBar() 内容驱动算好写入。
        if (this.textBarShow) {
          // 轨道（10 宽、深色底）+ 滑块（6 宽、亮色、最小 32 高）—— R52 的 4 宽
          // 细条在深底色上太不显眼；Transparent 让点击落到行上（选段不受挡）。
          Column() {
            Column()
              .width(6)
              .height(this.textVBarThumbH())
              .borderRadius(3)
              .backgroundColor('#96a3c2')
              .margin({ top: this.textVBarTopPos() })
          }
          .width(10)
          .height('100%')
          .margin({ right: 3 })
          .borderRadius(5)
          .backgroundColor('#232b38')
          .hitTestBehavior(HitTestMode.Transparent)
          .gesture(
            PanGesture({ fingers: 1 })
              .onActionStart((e: GestureEvent) => {
                this.textVBarDragTop = this.textVBarTopPos();
              })
              .onActionUpdate((e: GestureEvent) => {
                this.textVBarDragTo(this.textVBarDragTop + e.offsetY);
              })
          )
        }
      }
      .layoutWeight(1)
      .width('100%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#12161c')
  }

  // ==================================================================
  // 第六十四轮：左栏目录内容量统计 / 展示 / 缓存 / 空闲调度
  //
  // 只在这里碰磁盘：真异步 fs.listFile（非递归、listNum:0），与 openFolder
  // 同一套 URI 候选 + mergeExploreNames 合并口径；绝不 statSync、绝不递归、
  // 绝不在主线程做批量 IO。真值源全部在 common/DirCount.ts。
  // ==================================================================

  /** 记一次用户输入。空闲闸门只认这个时刻，绝不让后台扫描抢正常操作。 */
  private markUserActive(): void {
    this.lastInputAt = Date.now();
  }

  /** 启动 / TTL 变更后重建心跳（幂等：先清再起）。只排一个定时器，不碰磁盘。 */
  private startDirCountScheduler(): void {
    if (this.dirCountTimer !== -1) {
      clearInterval(this.dirCountTimer);
    }
    this.dirCountTimer = setInterval(() => {
      this.tickDirCount();
    }, dcRefreshTickOf(this.dirCountTtlMs));
  }

  /** 页面销毁：停心跳、作废在途扫描的迟到结果。 */
  private stopDirCountScheduler(): void {
    if (this.dirCountTimer !== -1) {
      clearInterval(this.dirCountTimer);
      this.dirCountTimer = -1;
    }
    this.dirCountScanToken++;
    this.dirCountScanBusy = false;
  }

  /** 心跳：只在应用空闲时按预算扫描「缺失 / 过期 / 失败待重试」的目录行。
   *  一次最多 DC_SCAN_PER_TICK 个、串行真异步；任何在途操作一律让路。 */
  private tickDirCount(): void {
    if (!this.pageAlive || this.pageSuspended || this.dirCountScanBusy) {
      return;
    }
    const now: number = Date.now();
    const idle: boolean = dcIdleOf(this.lastInputAt, now, DC_IDLE_MS);
    const idleOk: boolean = dcAppIdleOf(this.folderBusy, this.playing,
      this.mtimeBusy, this.pickerBusy, this.pageAlive, this.resumeDone, idle,
      bulkIoAllowed(this.restoreMode), this.browseBase.length > 0);
    // 新目录行先建 PENDING：纯内存，零 IO；缓存命中的条目保留不动。
    this.syncDirCountTargets();
    if (!idleOk) {
      return;
    }
    const targets: string[] = this.pickDirCountTargets(now);
    if (targets.length === 0) {
      return;
    }
    if (dcScanActionOf(idleOk, this.dirCountScanBusy, true) !== DC_SCAN_GO) {
      return;
    }
    const token: number = ++this.dirCountScanToken;
    this.dirCountScanBusy = true;
    this.runDirCountBatch(targets, token, 0);
  }

  /** 串行跑完一批；代际号过期（换源 / 失效 / 销毁）就静默退出，不碰闸门。
   *  超时兜底用 setTimeout 推进代际号，不引入竞速等待 / 不占着 scanBusy。 */
  private runDirCountBatch(targets: string[], token: number, i: number): void {
    if (token !== this.dirCountScanToken || !this.pageAlive) {
      return;
    }
    if (i >= targets.length) {
      this.dirCountScanBusy = false;
      return;
    }
    const uri: string = targets[i];
    // 挂住的 listFile 到点按「失败」落地并放闸；迟到的真实结果因代际号已推进被丢弃。
    const watchdog: number = setTimeout(() => {
      if (token !== this.dirCountScanToken || !this.pageAlive) {
        return;
      }
      const fail: DirCountEntry = { state: DC_FAIL, count: 0, images: 0, at: Date.now() };
      this.settleDirCount(uri, fail);
      this.dirCountScanToken++;
      this.dirCountScanBusy = false;
      hilog.warn(DOMAIN, TAG, 'dirCount: listFile timeout, mark failed: %{public}s',
        baseName(uri));
    }, DC_SCAN_TIMEOUT_MS);
    this.listDirCount(uri).then((entry: DirCountEntry) => {
      if (token !== this.dirCountScanToken || !this.pageAlive) {
        return;   // 已被超时 / 换源 / 失效作废
      }
      clearTimeout(watchdog);
      this.applyDirCount(uri, token, entry);
      this.runDirCountBatch(targets, token, i + 1);
    }).catch(() => {
      if (token !== this.dirCountScanToken || !this.pageAlive) {
        return;
      }
      clearTimeout(watchdog);
      const fail: DirCountEntry = { state: DC_FAIL, count: 0, images: 0, at: Date.now() };
      this.applyDirCount(uri, token, fail);
      this.runDirCountBatch(targets, token, i + 1);
    });
  }

  /** 挑本层需要重扫的目录行（按左栏顺序，最多 DC_SCAN_PER_TICK 个）。 */
  private pickDirCountTargets(now: number): string[] {
    const out: string[] = [];
    for (let i: number = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      if ((r.kind ?? ROW_IMAGE) !== ROW_FOLDER || r.uri.length === 0) {
        continue;
      }
      const e: DirCountEntry | undefined = this.dirCountCache.get(r.uri);
      if (e !== undefined && dcNeedRescanOf(e, now, this.dirCountTtlMs)) {
        out.push(r.uri);
        if (out.length >= DC_SCAN_PER_TICK) {
          break;
        }
      }
    }
    return out;
  }

  /** 单个目录的真实列举：多个 URI 写法逐个试，成功结果按现有口径合并去重。
   *  首个非空列举即可代表这一层（与 openFolder 非全量探索同口径），
   *  全程 await fs.listFile，绝不 statSync / 绝不递归 / 绝不阻塞主线程。 */
  private async listDirCount(uri: string): Promise<DirCountEntry> {
    const candidates: string[] = dirCandidates(uri);
    const groups: Array<Array<string>> = [];
    let ok: boolean = false;
    for (let i: number = 0; i < candidates.length; i++) {
      try {
        const names: string[] = await fs.listFile(candidates[i],
          { recursion: false, listNum: 0 });
        groups.push(names);
        ok = true;
        if (names.length > 0) {
          break;
        }
      } catch (e) {
        // 逐 URI 授权下某个写法列不出是常态，继续试下一个
      }
    }
    const merged: string[] = mergeExploreNames(groups);
    const total: number = dcCountOf(merged, HIDE_DOT_FILES, DC_ENTRY_CAP);
    const images: number = dcImageCountOf(merged, HIDE_DOT_FILES, IMAGE_SUFFIXES);
    const entry: DirCountEntry = {
      state: dcStateOf(total, ok), count: total, images: images, at: Date.now()
    };
    return entry;
  }

  /** 保位落地：目录已切走 / 该行已不在本层 / 代际已过期 → 迟到结果整段丢弃。 */
  private applyDirCount(uri: string, token: number, entry: DirCountEntry): void {
    if (token !== this.dirCountScanToken || !this.pageAlive) {
      return;
    }
    this.settleDirCount(uri, entry);
  }

  /** 统计结果落地的唯一收口：写缓存 + 重算展示 + 只刷这一行。 */
  private settleDirCount(uri: string, entry: DirCountEntry): void {
    const idx: number = this.dirCountRowIndexOf(uri);
    if (idx < 0) {
      return;   // 目录已切走：迟到的旧结果绝不盖回新清单
    }
    this.putDirCountCache(uri, entry);
    this.rebuildDirCountLabels();
    this.dataSource.notifyRowChanged(idx);
    hilog.info(DOMAIN, TAG,
      'dirCount: %{public}s st=%{public}d n=%{public}d img=%{public}d ttl=%{public}d',
      baseName(uri), entry.state, entry.count, entry.images, this.dirCountTtlMs);
  }

  /** 目录行 uri → 当前行下标；-1 = 已不在本层清单。 */
  private dirCountRowIndexOf(uri: string): number {
    if (uri.length === 0) {
      return -1;
    }
    for (let i: number = 0; i < this.rows.length; i++) {
      if (this.rows[i].uri === uri && (this.rows[i].kind ?? ROW_IMAGE) === ROW_FOLDER) {
        return i;
      }
    }
    return -1;
  }

  /** 给本层每个目录行建 PENDING 条目（缓存命中则保留），并做 LRU 淘汰。 */
  private syncDirCountTargets(): void {
    for (let i: number = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      if ((r.kind ?? ROW_IMAGE) !== ROW_FOLDER || r.uri.length === 0) {
        continue;
      }
      if (!this.dirCountCache.has(r.uri)) {
        const pending: DirCountEntry = {
          state: DC_PENDING, count: 0, images: 0, at: 0
        };
        this.dirCountCache.set(r.uri, pending);
        this.dirCountTouch(r.uri);
      }
    }
    this.trimDirCountCache();
  }

  /** 目录 / 内容变化后让缓存与展示回到真实：本层全部标记失效，等空闲重扫。
   *  同时作废在途扫描的迟到结果，避免旧数字盖回新清单。 */
  private invalidateDirCounts(): void {
    for (let i: number = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      if ((r.kind ?? ROW_IMAGE) !== ROW_FOLDER || r.uri.length === 0) {
        continue;
      }
      const e: DirCountEntry | undefined = this.dirCountCache.get(r.uri);
      if (e !== undefined) {
        e.at = 0;
        e.state = DC_PENDING;
        e.count = 0;
        e.images = 0;
      }
    }
    this.dirCountScanToken++;
    this.dirCountScanBusy = false;
    this.rebuildDirCountLabels();
  }

  /** 重算与 this.rows 同下标的展示数组：新建引用 + 版本号 +1，触发左栏重绘。
   *  缓存缺失 / 过期显示「…」；空目录「空」；失败「失败」；正常「N 项」。 */
  private rebuildDirCountLabels(): void {
    const labels: string[] = [];
    const now: number = Date.now();
    for (let i: number = 0; i < this.rows.length; i++) {
      const r: ImageItem = this.rows[i];
      if ((r.kind ?? ROW_IMAGE) !== ROW_FOLDER || r.uri.length === 0) {
        labels.push('');
        continue;
      }
      const e: DirCountEntry | undefined = this.dirCountCache.get(r.uri);
      labels.push(e === undefined ? DC_LABEL_PENDING
        : dcEntryLabelOf(e, now, this.dirCountTtlMs));
    }
    this.dirCountLabels = labels;
    this.dirCountVersion = this.dirCountVersion + 1;
  }

  /** LRU 写入 / 提升最近使用。 */
  private putDirCountCache(uri: string, e: DirCountEntry): void {
    this.dirCountCache.set(uri, e);
    this.dirCountTouch(uri);
    this.trimDirCountCache();
  }

  private dirCountTouch(uri: string): void {
    const i: number = this.dirCountOrder.indexOf(uri);
    if (i >= 0) {
      this.dirCountOrder.splice(i, 1);
    }
    this.dirCountOrder.push(uri);
  }

  /** 超出 DC_CACHE_MAX 时按「最久没用」淘汰，淘汰量由 dcEvictCountOf 判定。 */
  private trimDirCountCache(): void {
    const drop: number = dcEvictCountOf(this.dirCountOrder.length, DC_CACHE_MAX);
    for (let k: number = 0; k < drop; k++) {
      const oldest: string = this.dirCountOrder[0];
      this.dirCountOrder.splice(0, 1);
      this.dirCountCache.delete(oldest);
    }
  }

  /** 缓存有效期设置：夹界 → 落 preferences 小 key → 重建心跳 → 立即失效重算。
   *  写盘失败只降级为「本次会话有效」，绝不抛到 UI。 */
  private setDirCountTtl(ms: number): void {
    const safe: number = dcTtlClampOf(ms);
    this.dirCountTtlMs = safe;
    this.dirCountTtlLabel = dcTtlLabelOf(safe);
    this.status = dcTtlHintOf(safe);
    const store: preferences.Preferences | undefined = this.prefs;
    if (store !== undefined) {
      try {
        store.putSync(POS_KEY_DC_TTL, safe);
        store.flushSync();
      } catch (e) {
        hilog.warn(DOMAIN, TAG, 'dirCount: ttl persist failed, keep in-memory setting');
      }
    }
    this.startDirCountScheduler();
    this.invalidateDirCounts();
  }

  /** Ctrl+D 诊断层单击循环切换预设档（1 分 / 5 分 / 15 分 / 1 小时）。 */
  private cycleDirCountTtl(): void {
    let next: number = DC_TTL_PRESETS[0];
    for (let i: number = 0; i < DC_TTL_PRESETS.length; i++) {
      if (DC_TTL_PRESETS[i] === this.dirCountTtlMs) {
        next = DC_TTL_PRESETS[(i + 1) % DC_TTL_PRESETS.length];
        break;
      }
    }
    this.setDirCountTtl(next);
  }

  // ==================================================================
  // 第七十二轮：档案列表右键菜单动作总收口
  // 真值源在 common/FileContextMenu.ts；本方法只做「读 rows → 真行为」。
  // 刻意放在文件末尾：既有静态契约的切片全部以注释 / 方法签名为锚点，
  // 落在这里不会把新方法混进 build / applyItems 等既有切片。
  // ==================================================================
  /** 右键菜单五个动作：打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称。
   *  · 二次复核 fcHitOf + fcHasActOf：「..」伪行、空白区、越权动作一律拒绝。
   *  · 「打开」完全复用 onRowTap（图片预览 / 进目录 / 文本预览 / 灰行提示逐字不变）。
   *  · 「详情」只写三个 @State 显示字段，绝不碰 items / rows / cur / browseBase。
   *  · 「打开所在目录」按原生「在文件夹中显示」语义：目标层不同才真实重列举，
   *    已在所在层则直接定位并高亮该档案；父级判不出给明确提示，不静默无反应。
   *  · 复制走既有 pasteboard 链（第五十一轮同款），失败有明确提示。 */
  private onFileContextAction(act: string, rowIdx: number): void {
    this.markUserActive();   // 第六十四轮：菜单动作也算用户输入，空闲闸门重新计时
    if (rowIdx < 0 || rowIdx >= this.rows.length) {
      return;
    }
    const r: ImageItem = this.rows[rowIdx];
    const kind: number = r.kind ?? ROW_IMAGE;
    if (!fcHitOf(kind) || !fcHasActOf(kind, act)) {
      return;
    }
    const path: string = realPathOf(r.uri);
    const parent: string = parentDirOf(path);
    const hint: string = fcStatusHintOf(act, r.name);

    if (act === FC_ACT_OPEN) {
      this.onRowTap(rowIdx);
      return;
    }
    if (act === FC_ACT_DETAIL) {
      this.ctxDetailTitle = fcDetailTitleOf(r.name);
      this.ctxDetailFields = fcDetailFieldsOf({
        name: r.name,
        bytes: r.size,
        mtime: r.mtime ?? 0,
        kind: kind,
        uri: r.uri,
        location: parent
      });
      this.ctxDetailOn = true;
      this.status = hint + ' · ' + ESC_BUILD_TAG;
      return;
    }
    if (act === FC_ACT_REVEAL) {
      // 第七十四轮：交给 OS 自带文件管理器打开【目录】，不再走应用内 openFolder / onRowTap。
      // 第七十五轮：文件行目标改以 browseBase（当前左栏展示清单的权威目录）为准：
      //   · 它是 openFolder 真实列举 / 缓存命中 / 上层清单态回填的目录 URI；
      //   · 不再优先剥 r.uri 文件名 —— 那是列举用拼接 URI，NAS / 缓存态会指向错误目录；
      //   · browseBase 为空才由纯函数退回剥文件名兜底；目录行仍是该目录自身；
      //   · 目标恒为「目录」，绝不把文件本身作为打开目标。
      // 菜单文案 / 其余四项动作 / 浮层 / 放大镜抑制 / 两级 Want 兜底逐字不变。
      const dirUri: string = fcRevealDirUriOf(kind, r.uri, this.browseBase);
      if (dirUri.length === 0) {
        this.status = fcRevealStatusOf(r.name, false, fcRevealIsDirOf(kind), ESC_BUILD_TAG);
        return;
      }
      this.openDirInSystemFileManager(dirUri, r.name, fcRevealIsDirOf(kind));
      return;
    }
    const text: string = fcCopyTextOf(act, path, r.name);
    if (text.length === 0) {
      return;
    }
    const data: pasteboard.PasteData =
      pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, text);
    pasteboard.getSystemPasteboard().setData(data)
      .then(() => {
        this.status = hint + ' · ' + ESC_BUILD_TAG;
      })
      .catch(() => {
        this.status = '复制失败（剪贴板不可用）· ' + ESC_BUILD_TAG;
      });
  }

  /** 第七十三轮：档案行右键 Press → 打开应用内菜单浮层。
   *  只负责「显示」：复核命中、快照菜单项、把鼠标窗口坐标裁进可视区。
   *  五项真实行为仍全部收口到 onFileContextAction，此处不执行任何动作。
   *  刻意放在文件末尾，避免既有静态契约按注释 / 方法签名切片时混入 build()。 */
  private onFileContextMenu(rowIdx: number, x: number, y: number): void {
    this.markUserActive();
    if (rowIdx < 0 || rowIdx >= this.rows.length) {
      return;
    }
    const r: ImageItem = this.rows[rowIdx];
    const kind: number = r.kind ?? ROW_IMAGE;
    if (!fcHitOf(kind)) {
      return;
    }
    const items: Array<FcMenuItem> = fcItemsOf(kind);
    const h: number = fcMenuHeightOf(items.length);
    const pos: FcMenuPos = fcMenuPosOf(x, y, this.lastRootW, this.lastRootH,
      FC_MENU_W, h);
    this.ctxMenuIdx = rowIdx;
    this.ctxMenuName = fcMenuTitleOf(r.name);
    this.ctxMenuItems = items;
    this.ctxMenuX = pos.x;
    this.ctxMenuY = pos.y;
    this.ctxMenuHover = '';
    this.ctxMenuOn = true;
  }

  /** 第七十四轮：用 OS 自带文件管理器打开目标【目录】。
   *  目标 dirUri 由 fcRevealDirUriOf 判定：文件行=所在目录，目录行=该目录自身，
   *  恒为「目录」而非文件本身 —— 这是本轮修复的核心（不再 onRowTap 打开文件、
   *  不再 openFolder 在应用内重列举、不再把目录行误开到它的父目录）。
   *
   *  两级 Want 依次兜底，每级都有明确状态反馈与 hilog，绝不静默无反应：
   *   ① 显式系统文件管理器（华为 HarmonyOS 2in1：com.huawei.hmos.filemanager /
   *      MainAbility），parameters.fileUri = 目标目录 URI（官方问答「打开当前文件
   *      位置，并显示资源管理器」口径）；
   *   ② 隐式 ohos.want.action.viewData + general.directory + 只读 URI 授权 flag
   *      （官方「拉起文件处理类应用」口径，交给系统匹配能打开目录的应用）。
   *
   *  context 复用 quitApp() 已真机验证过的双通道：AppStorage('abilityContext') +
   *  getUIContext().getHostContext()，零新增全局状态、零新增 SDK import（Want 除外）。
   *  ⚠️ 系统应用是否存在、是否接受该 URI 形态属真机事实，编译 / 静态契约证明不了；
   *     两级都失败会在状态栏明确提示，真机按 R75 步骤回传 hilog 即可继续定位。 */
  private openDirInSystemFileManager(dirUri: string, name: string, isDir: boolean): void {
    let ability: common.UIAbilityContext | undefined =
      AppStorage.get<common.UIAbilityContext>('abilityContext');
    const host: common.Context | undefined = this.getUIContext().getHostContext();
    if (host !== undefined) {
      ability = host as common.UIAbilityContext;
    }
    if (ability === undefined) {
      this.status = fcRevealStatusOf(name, false, isDir, ESC_BUILD_TAG);
      hilog.warn(DOMAIN, TAG, 'fcReveal: no UIAbilityContext, dir=%{public}s', dirUri);
      return;
    }
    const okHint: string = fcRevealStatusOf(name, true, isDir, ESC_BUILD_TAG);
    const failHint: string = fcRevealStatusOf(name, false, isDir, ESC_BUILD_TAG);

    // ① 显式系统文件管理器：parameters.fileUri 传【目录】URI（不是文件 URI）。
    const params: Record<string, Object> = {};
    params[FC_OSFM_PARAM_FILE_URI] = dirUri;
    const primary: Want = {
      bundleName: FC_OSFM_BUNDLE,
      abilityName: FC_OSFM_ABILITY,
      parameters: params
    };
    // ② 隐式兜底：让系统按 action + UTD 目录类型匹配能打开该目录的应用。
    const fallback: Want = {
      action: FC_VIEW_DATA_ACTION,
      uri: dirUri,
      type: FC_DIR_UTD,
      flags: FC_URI_READ_FLAG
    };
    const ctx: common.UIAbilityContext = ability;
    hilog.info(DOMAIN, TAG, 'fcReveal primary: dir=%{public}s', dirUri);
    ctx.startAbility(primary)
      .then(() => {
        this.status = okHint;
        hilog.info(DOMAIN, TAG, 'fcReveal primary ok: dir=%{public}s', dirUri);
      })
      .catch(() => {
        hilog.warn(DOMAIN, TAG, 'fcReveal primary failed, try viewData: dir=%{public}s', dirUri);
        ctx.startAbility(fallback)
          .then(() => {
            this.status = okHint;
            hilog.info(DOMAIN, TAG, 'fcReveal fallback ok: dir=%{public}s', dirUri);
          })
          .catch(() => {
            this.status = failHint;
            hilog.warn(DOMAIN, TAG, 'fcReveal both failed: dir=%{public}s', dirUri);
          });
      });
  }

  /** 第一百零六轮：某一页的右键 —— 按在**哪张图上**就把菜单锁到那张。
   *  只有落在相片本身才会走到这里（间隙 / 空白不会命中 pane），因此
   *  「在右图上右键却拿到左图资料」从结构上不可能发生。 */
  private onPaneMouse(event: MouseEvent, pane: number, half: boolean): void {
    if (event.action === MouseAction.Press && event.button === MouseButton.Right) {
      const idx: number = pane === LOUPE_PANE_RIGHT ? this.spreadB : this.cur;
      const dx: number = Number(event.displayX ?? event.x);
      const dy: number = Number(event.displayY ?? event.y);
      this.openPictureMenuAt(dx, dy, idx);
      event.stopPropagation();
      return;
    }
    this.onLoupeMouse(event, pane, half);
  }

  /** 预览区相片上右键 Press → 打开 picture contact menu 浮层。
   *  `targetIdx` 为右键命中的那一页的下标；越界 / -1 一律回落到当前图
   *  （指针在图片间隙 / 空白时父级通道调用的就是这条回落，与 R76 的既有行为逐字一致）。
   *  只负责「显示」：命中判定 / 目标锁定 / 菜单快照 / 坐标裁剪；行为全部收口到 onPictureMenuAction。 */
  private openPictureMenuAt(x: number, y: number, targetIdx: number): void {
    this.markUserActive();
    // 空态（没有图）/ 文本预览 / 只读指引卡一律不弹，绝不越界。
    if (!pmRightHitOf(this.viewPixelMap !== undefined, this.textMode)) {
      return;
    }
    let idx: number = targetIdx;
    if (idx < 0 || idx >= this.items.length) {
      idx = this.cur;
    }
    if (idx < 0 || idx >= this.items.length) {
      return;                                  // 连当前图都没有：不弹（绝不拿空数据凑菜单）
    }
    // 菜单状态与真实状态同源：并排 / 幻灯片 / 全屏 / 超分辨四个开关都取此刻的真值。
    // 并排传的是 spreadShown()（眼前是否真的并排），不是 previewMode 枚举 ——
    // AUTO 下竖图自动对开时开关同样显示「开」，用户看到的就是实际形态。
    const items: Array<PmMenuItem> = pmItemsOf(this.playing, this.spreadShown(),
      this.fullscreen, this.srMode, this.viewPixelMap !== undefined);
    const w: number = pmMenuWidthOf(this.lastRootW);
    const h: number = pmMenuHeightOf(items.length);
    const pos: PmMenuPos = pmMenuPosOf(x, y, this.lastRootW, this.lastRootH, w, h);
    this.pmMenuName = pmMenuTitleOf(this.items[idx].name);
    this.pmMenuItems = items;
    this.pmMenuW = w;
    this.pmMenuX = pos.x;
    this.pmMenuY = pos.y;
    this.pmMenuHover = '';
    this.pmFocusAct = '';
    this.pmTargetIdx = idx;
    this.pmMenuOn = true;
  }

  /** 第一百零七轮：开关的真实状态 —— 开关行渲染、无障碍描述、读屏朗读都取这里。
   *  全部读实时状态（@State），菜单项快照不参与，杜绝「勾着却没生效」。 */
  private pmSwitchOnOf(act: string): boolean {
    if (act === PM_ACT_SPREAD) {
      return this.spreadShown();
    }
    if (act === PM_ACT_SR) {
      return this.srMode;
    }
    if (act === PM_ACT_SLIDE) {
      return this.playing;
    }
    if (act === PM_ACT_FULL) {
      return this.fullscreen;
    }
    return false;
  }

  /** 第一百零七轮：开关被拨动 —— **每个分支都复用该功能原有的开启 / 关闭逻辑**，
   *  这里只做「显式状态 → 原有收口」的翻译，不重新实现一遍行为。
   *   · 并排：写 previewMode（原来的模式覆盖点）后 refreshSpread()；
   *   · 超分辨：setSuperResMode()（原 toggleSuperResMode 的显式版）；
   *   · 幻灯片：toggleSlide()（进入 / 唤出全流程、叠显、计时器都在里面）；
   *   · 全屏：setFull()（F / 双击 / F11 / Esc 共用的同一个收口）。
   *  拨完菜单**不关闭**：开关要有可见的状态变化，也方便连续拨几项。 */
  private onPmSwitch(act: string, on: boolean): void {
    this.markUserActive();
    if (act === PM_ACT_SPREAD) {
      this.previewMode = pmSpreadModeOf(on);
      // 播放中拨并排：把进入播放时抓的快照一起改掉，否则开关拨了、画面要等停播才变。
      this.slideSpreadHold = on;
      this.refreshSpread();
      this.status = pmSwitchStatusOf(PM_ACT_SPREAD, on, ESC_BUILD_TAG);
    } else if (act === PM_ACT_SR) {
      this.setSuperResMode(on, this.cur);
    } else if (act === PM_ACT_SLIDE) {
      // 已有状态与目标一致就不重复触发；失败（没有可播的图）时 toggleSlide 会自己写明确提示，
      // 所以这里不再覆盖状态文案 —— 开关会自己弹回「关」（状态读的是真实 playing）。
      if (on !== this.playing) {
        this.toggleSlide();
      }
    } else if (act === PM_ACT_FULL) {
      this.setFull(on);
      this.status = pmSwitchStatusOf(PM_ACT_FULL, on, ESC_BUILD_TAG);
    }
    this.clampPmMenu();
  }

  /** 第一百零七轮：点「功能名称」文字 = 拨同一个开关（第二处大热区）。 */
  private onPmRowTap(it: PmMenuItem): void {
    if (!it.sw) {
      this.pmMenuOn = false;
      this.pmMenuHover = '';
      this.onPictureMenuAction(it.act);
      return;
    }
    this.onPmSwitch(it.act, !this.pmSwitchOnOf(it.act));
  }

  /** 第一百零七轮：布局可能变了（全屏切换 / 画布变化）→ 把浮层收进可视区。
   *  只夹坐标，不重建菜单项：开关状态是实时读的，重建反而会打断滑块的过渡动画。 */
  private clampPmMenu(): void {
    if (!this.pmMenuOn) {
      return;
    }
    const h: number = pmMenuHeightOf(this.pmMenuItems.length);
    const pos: PmMenuPos = pmMenuPosOf(this.pmMenuX, this.pmMenuY,
      this.lastRootW, this.lastRootH, this.pmMenuW, h);
    this.pmMenuX = pos.x;
    this.pmMenuY = pos.y;
  }

  /** 父级兜底通道（图片间隙 / 空白处右键）：保持既有口径 —— 以当前图为目标。
   *  这也是「尚未确定目标图片时不误用别的页数据」的落点：它只认 cur，不去猜右页。 */
  private openPictureMenu(x: number, y: number): void {
    this.openPictureMenuAt(x, y, this.cur);
  }

  /** 目标图的 EXIF 字段：当前图用主视图那份（最新、最全），其它页取同 uri 的缓存条目。 */
  private exifFieldsAt(idx: number): Array<PmExifField> {
    if (idx === this.cur) {
      return this.viewExifFields;
    }
    if (idx < 0 || idx >= this.items.length) {
      return [];
    }
    const e: PreviewEntry | undefined = this.previewEntry(this.items[idx].uri);
    return e !== undefined ? e.exifFields : [];
  }

  /** 第一百零七轮：菜单里的**纯动作行**（只剩「显示exif资料框」一项）。
   *  开关项一律走 onPmSwitch —— 保持「改状态只有一条路径」，不会出现
   *  「菜单关掉后状态被改两次」这类隐蔽 bug。越权动作由 pmHasActOf 拒绝。 */
  private onPictureMenuAction(act: string): void {
    this.markUserActive();
    if (!pmHasActOf(act)) {
      return;
    }
    if (act !== PM_ACT_EXIF) {
      return;                                  // 开关项不从这里分发
    }
    let idx: number = this.pmTargetIdx;
    if (idx < 0 || idx >= this.items.length) {
      idx = this.cur;
    }
    const it: ImageItem | undefined = (idx >= 0 && idx < this.items.length)
      ? this.items[idx] : undefined;
    const name: string = it !== undefined ? it.name : '';
    // 字段取「目标那张」：并排时右键右页 → 展示右页的 EXIF，而不是主视图那张。
    this.exifPanelTitle = pmExifPanelTitleOf(name);
    this.exifPanelFields = this.exifFieldsAt(idx);
    this.exifPanelOn = true;
    this.status = pmStatusOf(act, name, this.previewMode, ESC_BUILD_TAG);
  }

  /** 第一百零七轮：超分辨模式开关（原 toggleSuperResMode 的**显式状态版**）。
   *  开 → 立刻对目标图补跑一次（只有主视图参与超分，右页不参与，故仅当目标是当前图才触发）；
   *  关 → 立刻释放产物回原图，并让后续 maybeSuperResolve 直接跳过。
   *  与「全屏模式」互不干扰：两者都是独立开关，状态各自取真值。 */
  private setSuperResMode(on: boolean, idx: number): void {
    if (on === this.srMode) {
      return;
    }
    this.srMode = on;
    if (!on) {
      this.clearViewSrPx();
      this.status = pmSwitchStatusOf(PM_ACT_SR, false, ESC_BUILD_TAG);
      return;
    }
    this.status = pmSwitchStatusOf(PM_ACT_SR, true, ESC_BUILD_TAG);
    if (idx === this.cur && this.viewPixelMap !== undefined) {
      const uri: string = this.items[this.cur].uri;
      this.viewSrKeyDone = '';                 // 允许同一张再算一次（刚被关掉过）
      this.maybeSuperResolve(uri, this.viewPixelMap, this.curToken);
    }
  }
}
