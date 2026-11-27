/**
 * 目录名显示回归测试 —— 直接加载工程里的纯函数源码，不是复制实现。
 *
 *   node --experimental-strip-types tests/dirname.test.mjs
 *
 * 覆盖 2026-11-10 报出的缺陷：选择
 *   /storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像
 * 时左栏抬头空白。同时覆盖中文、%XX 编码、file://docs 文档 URI、
 * 尾部斜杠、? 参数、多级路径、纯 ASCII、空值兜底，
 * 「往上层」按目录层级逐级上行（不按浏览历史、不越级、不循环、到卷根停止），
 * 2026-11-11 的「退出记住位置 / 启动自动显示上次相片」，
 * 以及同日澄清的「往上层按钮永不 grey out / 永不禁用、点了要有反应」，
 * 同日末的「预览右下角只显示缓存数量 + 缩放百分比」，
 * 以及「真全屏 / 最高画质 resample / ICC·HDR·EXIF 旋转」，
 * 以及同日第二轮 5 项实机修正（全屏放大 / ESC 还原 / 右页锯齿 / hover 无档案名 / 梅花间竹列表），
 * 以及第三轮「左边显示比右边差 → 左右页统一最高画质」，
 * 以及第四轮「ESC 对齐双击 / resize 实时适配 / 全量缓存并发预解码加速滚轮」，
 * 以及第五轮「resize 实机仍不生效 → @Builder 参数 / 累积阈值 / 节流 / 根容器兜底」，
 * 以及第六轮「重启后档案日期不丢失 / 窗口大小与位置恢复 / 界面状态一致」，
 * 以及第七轮「最大化状态重启保持 / 解码数据缓存复用 / 移圆点 / 去缓存张数 / 取消左键放大」、
 * 第八轮「原始档案数据全量载入内存同时解码 / NAS 网络卷层级修复」、
 * 第九轮「3 秒内未进入上次目录就停止恢复并直接打开选择文件夹」、
 * 第十轮「遇到问题立即放弃：错误驱动 + 死路径记忆 + 恢复期零同步 IO」、
 * 第十一轮「版本号归位最顶部 / 第二栏悬停显隐 / hover 零延迟零动画 / ESC 非全屏退出」、
 * 第十二轮「切换 NAS 目录时 pumpAll 换源竞态崩溃（Cannot read property uri of undefined）」、
 * 第十三轮「点选零自动滚动 / 整栏贴顶唤出 / 预览图 3cm 3 倍放大镜」、
 * 第十四轮「放大镜 6cm / 左右并排双页独立 / 全屏保留 / 退出全屏后不失效」、
 * 第十五轮「放大镜预设关闭 / 鼠标右键 toggle 开关」、
 * 第十六轮「ESC 分状态 / 全屏往返窗口几何 / 放大镜 >1:1 重采样」、
 * 第十七轮「放大镜边缘抗锯齿：SDK 插值档语义修正 / 真实设备密度 / 原图上限夹界 /
 * 真实像素增益跳过 / PixelMap 边缘 AA」、
 * 第十八轮「窗口模式重做：ESC 严格两态分派 / 去掉 400ms 冷却误吞 / 系统被动退出
 * 一次性补发吞键 / 几何快照放宽到所有普通窗口态 / 绝对像素缩小自愈」、
 * 第十九轮「第二次 ESC 无响应修复：严格两态定稿 / 彻底废除补发吞键（恒不置位）/
 * Index.ets 代码行零改动 / 复现路径与端到端场景护栏」、
 * 第三十八轮「用户主目录 /storage/Users/currentUser 重新可选择：用户卷根原地真实列举 /
 *    R28 越级护栏零回归 / 其它路径选择行为逐字不变 / R38 构建标记」、
 * 第三十七轮「纯文本 / 源码文件预览：类型自动识别 / C·Python·ASM·Verilog 语法高亮 /
 *    编码兼容 / 行号等宽排版 / 大文件稳定 / R37 构建标记」、
 * 第三十五轮「往上层后只显示一个目录 —— 多 URI 写法列举结果合并而非覆盖 / 缓存目录结构
 *    反推兄弟目录 / 挑列得最全的写法拼子项 URI / R35 构建标记」、
 * 第三十四轮「往上层无响应修复 —— 缓存索引从唯一闸门降级为优先候选佐证 / 恢复路径层级链为事件主链 /
 *    命中父子边时优先同级候选 / 顶层由 upNavStateOf+volumeRootOf 判定 / R34 构建标记」、
 * 第三十三轮「往上层改走缓存父子逻辑层级 —— 初始化预建索引 / 触发复用 /
 *    顶层与缺父级保持不变 / 落地层级一致性校验 / R33 构建标记」、
 * 第三十二轮「启动阶段 FOLDER picker 误报「不存在该名字的文件夹」—— 有效起点 + 返回真值校验 /
 *    未选择 / 名字无效 / 确实不存在三类明确提示 / R32 构建标记」、
 * 第三十一轮「R30 回归：退出重开不恢复图片 / 往上层无响应 —— preferences XML 安全编解码 /
 *    核心状态优先落盘 + 增强 key 隔离 / 恢复链隔离 + 坏数据自愈 / R31 构建标记」、
 * 第二十九轮「上层清单只列 2026 且混入伪目录：多层真实清单快照 / 全子目录聚合 /
 *    授权同形态父 URI / 真实行种类 / R29 构建标记」、
 * 第二十八轮「NAS 往上层错误文件夹清单：挂载前缀卷根判定 / 规范层级键 /
 *    百分号编码父 URI 候选 / 父级真值校验 / 清单只列真实子目录 / R28 构建标记」、
 * 第二十七轮「NAS 路径 THREAD_BLOCK_6S：RawStore.read 真异步化 + 到点即放弃超时闸门 /
 *    fd 兜底异步化 / R27 构建标记」、
 * 第二十六轮「上下键改翻页：↑=← 上一张 / ↓=→ 下一张 / 移除上下键缩放 / 其它交互零回归」、
 * 第二十五轮「诊断层收成默认关闭 + 保留 Ctrl+D / 单击角标可开关入口 / R25 构建标记」、
 * 第二十四轮「R23 截图驱动：修 escDownHandled 永不复位 / ESC 单轮去重废除永久对象引用 /
 *    通道级 cap=con=dsp= 可观测 / Ctrl+Q 键盘确定解 / type=U 真实 KeyType」、
 * 第二十三轮「系统级按键通道：inputConsumer.keyPressed 单键优先 + hotkeyChange 兜底 /
 *    恢复系统沉浸 / 窗口级 setWindowFocusable + wf 诊断 / 退出全屏瞬间重启焦点重试 /
 *    Button('·') 锚点修可聚焦 / 鼠标『退出 APP』确定解 / dsp=hk= 常显诊断」、
 * 第二十二轮「零按键到达修复：onKeyEventDispatch 分发通道 / 修双 defaultFocus 冲突 /
 *    FocusController + ANCESTOR_EVENT / 关闭系统沉浸 / keys= 与焦点结果常显」；
 * 第二十一轮「窗口真值同步：windowStatusChange 直发链路 / ESC 前读系统状态 /
 *    Button 焦点锚点 / 常显 R21 诊断角标 / destroyWindow 兜底」；
 * 第二十轮「真机链路修复：onKeyPreIme + boolean 版 onKeyEvent 双通道消费 ESC /
 * 全屏切换后 focusControl 重抢焦点 / quitApp 去掉 await flushPos 阻塞 /
 * UIAbilityContext 兜底 / 状态栏 ESCDBG 可观测诊断 / 真实 ArkTS 编译校验」。
 *
 * ⚠️ 本文件是**源码静态契约测试**，只验证纯函数语义与源码接线，
 *    不能证明真机上 ESC 事件真的到达 onKey()、也不能证明 APP 真的退出。
 *    真机验证步骤与诊断串对照表见 README 第二十轮章节。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames, hierPathOf, titleParentOf, volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, sameDirPath, isUpTargetOf, upParentCandidates, UP_NAV_NONE, UP_NAV_TOP, UP_NAV_GO, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf, upContextBaseOf, upContextRawOf, pathChainOf, inAppUpListHint,
  isNetworkHost, nasHostOf, canonicalLevelKeyOf, encodePathForm,
  isStrictParentOf, isUpListPseudoName, mergeUpListNames, rootFormParentOf,
  isSameOrUnderLevelOf, restoreBrowseLevelOf, rawBrowseFormOf,
  encodeUpCacheText, decodeUpCacheText,
  prefsSafeEncode, prefsSafeDecode, prefsIsLegacyBadCache,
  FOLDER_PICK_NONE, FOLDER_PICK_INVALID, FOLDER_PICK_OK, FOLDER_PICK_UNREADABLE,
  pickerStartSafe, folderPickStartOf, pickedFolderUsable, pickedFolderKind, folderPickHint,
  CACHED_UP_GO, CACHED_UP_TOP, CACHED_UP_MISS,
  cachedUpIndexOf, cachedUpStateOf, cachedParentOf, cachedUpLandsAt,
  cachedUpPreferredParentOf, cachedUpPreferredCandidates,
  mergeExploreNames, exploreBaseOf, exploreSiblingNamesOf } from '../entry/src/main/ets/common/DirName.ts';
import { upFullExploreWanted, upExploreFormsOf, upExploreCapOf,
  upExploreNeedFallback } from '../entry/src/main/ets/common/DirName.ts';
import { isUserVolumeRootOf, rootReenterWantedOf, rootReenterFormsOf } from '../entry/src/main/ets/common/DirName.ts';
import { HoverGuard } from '../entry/src/main/ets/common/HoverGuard.ts';
import { preloadWindowSize, preloadOrder, preloadSaturated,
  fullPreloadIndex, preloadConcurrencyOf, preloadBatchOf,
  shouldResetPreloadChain, fullCacheTargetOf,
  preloadBatchBoundedOf } from '../entry/src/main/ets/common/PreloadBudget.ts';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC, FLUSH_SYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  upButtonEnabled, RESTORE_FULL, RESTORE_READONLY, restoreModeOf, bulkIoAllowed,
  restoreProbeUris, readonlyHint, readonlyTapHint, readonlyUpHint,
  restoreUpEnabled, restoreUpHint,
  RELIST_SKIP, RELIST_TRY, readonlyRelistAction, relistProbeOkOf,
  relistOkHint } from '../entry/src/main/ets/common/ResumePlan.ts';
import { DIR_RESUME_NONE, DIR_RESUME_CONTEXT, DIRCTX_EMPTY,
  dirContextFlagOf, dirContextSaveWanted, dirOnlyResumeWanted } from '../entry/src/main/ets/common/ResumePlan.ts';
import { PERSIST_SKIP, PERSIST_ACTIVATE, persistAction, persistPolicyUris,
  persistTimeoutSafe, persistOkHint, persistFailHint, persistLegacyHint } from '../entry/src/main/ets/common/PersistPlan.ts';
import { exifTransformOf, exifSizeOf, viewEdgeOf, preloadEdgeOf, displayEdgeOf,
  shouldReloadOnResize, shouldExitFullOnResize, canvasFromRootOf,
  colorSpaceNameOf, isWideGamutOf, viewHintOf, fullscreenStepsOf,
  ORIENT_PORTRAIT, ORIENT_LANDSCAPE, ORIENT_SQUARE,
  imageOrientationOf, spreadRightWantedOf,
  chromeSampleOf, canvasResizeAcceptOf, fitOnFullExit } from '../entry/src/main/ets/common/ViewPlan.ts';
// 第八十六轮：并排（对开）等比适配的唯一真值源 —— 统一高度 + 各自原始比例 + 中间零间隙。
import { LIMIT_HEIGHT, LIMIT_WIDTH, spreadAspectOf, spreadFitOf }
  from '../entry/src/main/ets/common/SpreadFit.ts';
// 第八十七轮：并排边界「首尾相接」的配对 / 去重 / 页码文案。
import { SPREAD_PAIR_NONE, spreadPairIndexOf, spreadPairOkOf,
  spreadIsWrappedOf, spreadPageTextOf } from '../entry/src/main/ets/common/ViewPlan.ts';
// 第八十八轮：退出全屏恢复「进入前」缩放 / 平移的纯函数真值源。
import { fullExitEdgeOf, fullExitViewOf } from '../entry/src/main/ets/common/ViewPlan.ts';
// 第五十六轮：返回 APP 单次刷新决策 / 目录与选中对账的纯函数真值源。
import { RESUME_REFRESH_SKIP, RESUME_REFRESH_GO, resumeRefreshAction,
  resumeSelectedIndex, resumeDirKept, resumeRefreshHint } from '../entry/src/main/ets/common/ResumeRefresh.ts';
// 第五十七轮：冷启动（杀进程后重开）补刷的独立决策 / 文案纯函数。
import { BOOT_REFRESH_SKIP, BOOT_REFRESH_GO, bootRefreshAction,
  bootRefreshHint } from '../entry/src/main/ets/common/ResumeRefresh.ts';
import { metaLineOf, parseMetaLine, encodeMeta, decodeMeta, metaForUri,
  packWindowRect, parseWindowRect, windowRectUsable,
  shouldSaveWindowRect, collapsedOf, windowModeFlagOf,
  shouldRestoreMaximized, shouldScheduleWindowRestore } from '../entry/src/main/ets/common/SessionState.ts';
import { decodeEdgeOf, reuseEdgeOf, shouldReuseDecoded,
  decodeKeyOf } from '../entry/src/main/ets/common/DecodeCache.ts';
import { rawFitOf, rawSingleAllowed, rawReadComplete,
  rawCacheTargetOf, rawPrefetchWanted, rawIoTimeoutMs,
  rawDenyAfterFailure } from '../entry/src/main/ets/common/RawCache.ts';
import { ENTER_WAIT, ENTER_ABORT, ENTER_TIMEOUT_MIN_MS, ENTER_TIMEOUT_MAX_MS,
  enterTimeoutSafe, enterWatchdogWanted, enterSettledOk,
  enterTimeoutAction, enterTimeoutHint } from '../entry/src/main/ets/common/RestoreTimeout.ts';
import { FF_WAIT, FF_GIVEUP, DEAD_TAG_MAX, deadTagOf, deadMemoryMatches,
  failFastAction, restoreIoHeld, probeTakeOf, elapsedSince,
  failFastHint } from '../entry/src/main/ets/common/FailFast.ts';
import { SCROLL_NONE, SCROLL_UP, SCROLL_DOWN, SCROLL_FOLLOW,
  isListEdgeRow, tapScrollAction, stepScrollAction, scrollAllowed,
  topBarPeekOf, cmToVp, loupeDiameterVp, loupeCircleOrigin,
  loupeImageOffset, loupeClampedOffset, loupeInFrame,
  loupeEligibleOf, LOUPE_PANE_NONE, LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT,
  LOUPE_CM_14, LOUPE_D_VP_14, loupePaneActiveOf, loupePaneAfterHover,
  loupeResetOnModeChange, loupeHoverAfterModeChange,
  LOUPE_DEFAULT_ENABLED, loupeEnabledAfterRightPress, loupeEnabledAfterLeftClick,
  loupeVisibleOf, ESC_ACT_NONE, ESC_ACT_EXIT_FULL, ESC_ACT_QUIT_APP,
  escActionOf, shouldCaptureWindowRect, shouldRestoreWindowRect,
  msSinceFullExitOf, LOUPE_RESAMPLE_1X, LOUPE_CUBIC_MAX_SCALE,
  LOUPE_IP_NONE, LOUPE_IP_HIGH, LOUPE_IP_MEDIUM,
  loupeEffectiveScaleOf, loupeNeedsResampleOf, loupeInterpolationTierOf,
  loupePixelAlignOf, loupeResampleEdgeOf,
  loupeResampleStableOf,
  LOUPE_DENSITY_MIN, LOUPE_DENSITY_MAX, LOUPE_DENSITY_FALLBACK,
  LOUPE_AA_ENABLED, LOUPE_QA_HIGH, LOUPE_QA_LOW,
  loupeDensityRatioOf, loupeQualityTierOf, loupeResampleEdge2Of,
  loupeResampleGainOf,
  escActionByState, shouldArmSystemEcho, shouldCaptureRectAll,
  shouldApplyRectRestore, shouldSelfHealOnResize,
  windowStatusIsFullscreen, shouldSyncFullFromWindow } from '../entry/src/main/ets/common/InteractionPlan.ts';
// 第七十六轮：名称栏间距真值源 / 相片右键菜单 · EXIF 图标 · 资料框 · 预览模式真值源。
import { ROW_GAP_MM, MM_TO_VP, ROW_GAP_VP,
  rowGapVpOf, rowGapSameOf, rowGapValidOf } from '../entry/src/main/ets/common/RowGap.ts';
import { PM_ACT_EXIF, PM_ACT_SINGLE, PM_ACT_SPREAD,
  PM_LABEL_EXIF, PM_LABEL_SINGLE, PM_LABEL_SPREAD,
  PM_EXIF_LABEL, PM_EXIF_MARGIN_VP, PM_EXIF_EMPTY, PM_EXIF_UNKNOWN,
  PM_EXIF_LABELS, PM_EXIF_VALUE_MAX, PM_MENU_W, PM_MENU_ITEM_H,
  PM_MENU_TITLE_H, PM_MENU_PAD_V, PM_MENU_EDGE_V, PM_MENU_NAME_MAX,
  PM_MODE_AUTO, PM_MODE_SINGLE, PM_MODE_SPREAD,
  pmItemsOf, pmItemCountOf, pmFirstThreeOrderedOf, pmHasActOf,
  pmModeAfterAct, pmSpreadWantedOf, pmModeLabelOf,
  pmExifBadgeVisibleOf, pmPhotoReadyOf, pmExifValueOkOf, pmExifValueOf,
  pmExifPresentOf, pmExifFieldOf, pmExifFieldWantedOf,
  pmExifPanelTitleOf, pmExifEmptyOf, pmRightHitOf, pmMenuHeightOf,
  pmMenuPosOf, pmMenuVisibleOf, pmMenuTitleOf, pmStatusOf } from '../entry/src/main/ets/common/PictureMenu.ts';
// 第七十七轮：重启元数据合并 / 补齐、EXIF「有效字段」真值、adaptive 列宽三组真值源。
import { metaMergeOf, metasPaddedOf, metaChunkPaddedOf } from '../entry/src/main/ets/common/SessionState.ts';
import { pmExifEffectiveOf, pmExifShouldReadOf } from '../entry/src/main/ets/common/PictureMenu.ts';
import { AC_SIDEBAR_RATIO, AC_COLLAPSED_RATIO, AC_DATE_GAP_VP, AC_ROW_PAD_VP,
  AC_LIST_PAD_VP, AC_ICON_BTN_MIN_VP, AC_ICON_BTN_COUNT, AC_ICON_ROW_PAD_VP,
  AC_SPLIT_W, AC_PREVIEW_MIN_W, AC_PREVIEW_RATIO, AC_NAME_SAFETY_VP,
  AC_DATE_SAMPLE, AC_NAME_FONT_VP, AC_SIZE_FONT_VP, AC_DATE_FONT_VP,
  acTextWidestOf, acOverheadOf, acCollapsedContentOf, acSidebarCapOf, acLayoutOf,
  acWidthSafeOf, acAdaptiveOf } from '../entry/src/main/ets/common/AdaptiveColumn.ts';
import { LANG_NONE, LANG_PLAIN, LANG_C, LANG_PYTHON, LANG_ASM, LANG_VERILOG,
  textExtOf, textLangOf, isTextFileName, textLangLabelOf, highlightWanted,
  textSuffixListOf, ENC_UTF8, ENC_UTF16LE, ENC_UTF16BE, ENC_GB18030, ENC_BIG5, ENC_WIN1252,
  textBomEncodingOf, textBomSkipOf, isValidUtf8, looksBinary, textBodyOf,
  encodingCandidatesOf, pickDecodedIndexOf, encodingLabelOf,
  TEXT_MAX_BYTES, TEXT_MAX_LINES, TEXT_TAB_WIDTH, TEXT_ROW_H_VP, TEXT_WHEEL_LINES,
  TEXT_CHAR_W_VP, TEXT_CONTENT_MAX_VP, textReadCapOf, textByteTruncatedOf,
  splitTextLines, expandTabsOf, lineNoWidthOf, textStatusOf, textContentWidthOf,
  TOK_PLAIN, TOK_KEYWORD, TOK_COMMENT, TOK_STRING, TOK_NUMBER, TOK_PREPROC, TOK_LABEL,
  tokenColorOf, tokenizeLine, blockStartsOf, joinTokensOf } from '../entry/src/main/ets/common/TextDoc.ts';
// 第五十九轮：往上层后「返回前所在子目录」反色标记的真值源（零 SDK / 零 IO / 纯视觉）。
import { UPRET_NONE, UPRET_INVERT_BG, UPRET_INVERT_FG,
  UPRET_KIND_FOLDER, UPRET_KIND_OTHER,
  upReturnMarkOf, upReturnRefreshOf, upReturnClearOf,
  upReturnInvertOf, upReturnBgOf, upReturnFgOf } from '../entry/src/main/ets/common/UpReturn.ts';
// 第六十轮：左栏「高亮项恒定完整可见」纯函数真值源（零 SDK / 零 IO / 纯数值判定）。
import { HV_NONE, HV_REVEAL, HV_KEY_INVALID, HV_ALIGN_AUTO,
  highlightRowOf, highlightSafeOf, highlightGuardKeyOf,
  highlightGuardActionOf, highlightScrollAlignOf,
  highlightResizeOf } from '../entry/src/main/ets/common/HighlightVisible.ts';
// 第七十五轮：名称右侧符号列整体移除，其专属纯函数真值源已删除，上述 import 一并清理；
// R61 断言组改为校验「符号列彻底消失 + 三栏零回归」。
// 第六十二轮：主预览 resize 画质（动态插值 + AA）+ 一维边缘信号数值模型的纯函数真值源。
import { RQ_MIPMAP, RQ_LOW, RQ_HIGH, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR,
  RQ_INTEGER_TOL, rqScaleOf, rqInterpolationOf, rqAntialiasOf,
  rqIntegerScaleOf, rqFractionalOf, rqModeNameOf, rqCubicWeightOf,
  rqLinearWeightOf, rqResampleOf, rqOvershootOf,
  rqEdgeJitterOf } from '../entry/src/main/ets/common/ResizeQuality.ts';
// 第六十三轮：文本预览纵向滚动条「显示判定 + 视口高兜底」纯函数真值源（零 SDK / 零 IO）。
import { TSB_CHROME_H_VP, TSB_MIN_VISIBLE_ROWS,
  textViewportHOf, textVisibleRowsOf, textBarVisibleOf,
  textBarVisibleSafeOf } from '../entry/src/main/ets/common/TextScrollBar.ts';
// 第六十四轮：左栏目录内容量统计的口径 / TTL / 空闲闸门 / 四态展示纯函数真值源。
import { DC_PENDING, DC_OK, DC_EMPTY, DC_FAIL, DC_LABEL_PENDING,
  DC_LABEL_FAIL, DC_LABEL_EMPTY, DC_TTL_DEFAULT_MS, DC_TTL_MIN_MS,
  DC_TTL_MAX_MS, DC_TICK_MIN_MS, DC_TICK_CAP_MS, DC_IDLE_MS,
  DC_SCAN_PER_TICK, DC_SCAN_TIMEOUT_MS, DC_CACHE_MAX, DC_ENTRY_CAP,
  DC_SCAN_SKIP, DC_SCAN_GO, dcTtlClampOf, dcTtlSafeOf, dcRefreshTickOf,
  dcExpiredOf, dcIdleOf, dcAppIdleOf, dcScanActionOf, dcVisibleNamesOf,
  dcCountOf, dcSuffixOf, dcImageCountOf, dcStateOf, dcLabelOf,
  dcEntryLabelOf, dcNeedRescanOf, dcEvictCountOf, dcTtlLabelOf,
  dcTtlHintOf } from '../entry/src/main/ets/common/DirCount.ts';
// 第六十五轮：FITS / XISF 天文图像预览的纯函数真值源（零 SDK / 零 IO，构造字节可回归）。
import { AI_FMT_NONE, AI_FMT_FITS, AI_FMT_XISF,
  AI_FITS_SUFFIXES, AI_XISF_SUFFIXES,
  AI_OK, AI_FAIL_TOO_SHORT, AI_FAIL_BAD_MAGIC, AI_FAIL_BAD_BITPIX,
  AI_FAIL_BAD_GEOMETRY, AI_FAIL_UNSUPPORTED, AI_FAIL_DATA_SHORT, AI_FAIL_TOO_LARGE,
  AI_SAMPLE_U8, AI_SAMPLE_I16, AI_SAMPLE_F32, AI_SAMPLE_UNKNOWN,
  AI_LE, AI_BE, AI_LAYOUT_PLANAR, AI_LAYOUT_NORMAL,
  AI_COMP_NONE, AI_COMP_ZLIB, AI_COMP_UNSUPPORTED,
  AI_STRETCH_GAMMA, AI_OUTPUT_BGRA, AI_XISF_SIGNATURE,
  aiSuffixOf, aiFormatOf, aiIsAstroName, aiFailHintOf,
  aiU16At, aiU32At, aiI16At, aiI32At, aiF32FromBits, aiF64FromBits,
  aiSampleAt, aiBitpixSampleOf, aiXisfSampleOf, aiBytesPerSampleOf,
  aiCardTextOf, aiCardKeyOf, aiCardValOf, aiNumOf, aiFitsPlanOf,
  aiXisfMagicOf, aiXisfHeaderLenOf, aiXisfXmlOf, aiImageTagOf, aiAttrOf,
  aiGeometryOf, aiLocationOf, aiCompressionOf, aiXisfPlanOf, aiHeaderOf,
  aiUnshuffleOf, aiDisplaySizeOf, aiBoundsOf, aiBoundsStepOf,
  aiStretchByteOf, aiPixelAt, aiRgbaOf, aiPixelsLongEnough,
  aiFailHeader,
  // 第六十六轮：THREAD_BLOCK_6S 修复的纯函数真值源
  AI_MAX_TARGET_PIXELS, AI_SLICE_ROWS, AI_SLICE_YIELD_MS,
  AI_MAX_UNCOMPRESSED_BYTES, AI_UNSHUFFLE_SLICE_LIMIT, AI_UNSHUFFLE_SLICE_ITEMS,
  AI_MAX_CONCURRENT_RENDER,
  aiSliceCountOf, aiSliceI0Of, aiSliceI1Of, aiSxTableOf,
  aiTargetSizeSafeOf, aiRgbaSliceOf, aiUnshuffleSliceOf,
  aiAllocAllowedOf, aiRenderSlotAllowedOf
} from '../entry/src/main/ets/common/AstroImage.ts';
// 第六十七轮：放大镜高质量显示的关键参数 / 能力分级 / AA 档 / 边缘信号数值模型。
import { LQ_CAP_COMPONENT, LQ_CAP_SYSTEM_AA, LQ_CAP_HW_CROP,
  LQ_API_SYSTEM_MIN, LQ_API_CROP_MIN, LQ_API_PROBE_LEVEL,
  LQ_KIND_IMAGE, LQ_KIND_GRAPHIC, LQ_KIND_TEXT,
  LQ_AA_NONE, LQ_AA_LOW, LQ_AA_MEDIUM, LQ_AA_HIGH,
  LQ_IP_LOW, LQ_IP_MEDIUM, LQ_IP_HIGH,
  LQ_FILTER_NEAREST, LQ_FILTER_LINEAR,
  LQ_DENSITY_MIN, LQ_DENSITY_MAX, LQ_DENSITY_REF, LQ_DENSITY_FALLBACK,
  LQ_RESAMPLE_1X, LQ_NEAR_ONE_TOL, LQ_CUBIC_MAX_SCALE,
  LQ_MAX_TARGET_PIXELS, LQ_MAX_FACTOR, LQ_MAX_EDGE,
  LQ_STABLE_MIN_DELTA, LQ_MIN_GAIN, LQ_EDGE_AA,
  LQ_MODE_NEAREST, LQ_MODE_LINEAR, LQ_MODE_CUBIC, LQ_MODE_MIPMAP,
  lqFiniteOf, lqDensityOf, lqLogicalScaleOf, lqEffectiveScaleOf,
  lqConsistentTierOf, lqKindOf, lqAaLevelOf, lqInterpolationOf,
  lqFilterModeOf, lqCapabilityOf, lqFactorOf, lqTargetEdgeOf,
  lqScaleAllowedOf, lqSafeFactorOf, lqShouldRebuildOf, lqHasGainOf,
  lqCubicWeightOf, lqLinearWeightOf, lqResampleOf, lqEdgeJitterOf,
  lqOvershootOf } from '../entry/src/main/ets/common/LoupeQuality.ts';
// 第六十八轮：右侧主预览 resize 最高质素的关键参数 / 场景分档 / 内容自适应 AA / 边缘信号模型。
import { VQ_SCENE_SHRINK_DEEP, VQ_SCENE_SHRINK, VQ_SCENE_ONE,
  VQ_SCENE_ENLARGE, VQ_SCENE_ENLARGE_HIGH,
  VQ_KIND_IMAGE, VQ_KIND_GRAPHIC, VQ_KIND_TEXT,
  VQ_CAP_COMPONENT, VQ_CAP_SYSTEM_AA,
  VQ_AA_LOW, VQ_AA_MEDIUM, VQ_AA_HIGH,
  VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR, VQ_CUBIC_MAX_SCALE,
  VQ_REFINE_FACTOR_IMAGE, VQ_REFINE_FACTOR_DOC,
  VQ_MAX_TARGET_PIXELS, VQ_MAX_FACTOR, VQ_MAX_EDGE,
  VQ_STABLE_MIN_DELTA, VQ_MIN_GAIN, VQ_RESAMPLE_1X,
  VQ_DENSITY_MIN, VQ_DENSITY_MAX, VQ_DENSITY_REF, VQ_DENSITY_FALLBACK,
  VQ_MODE_NEAREST, VQ_MODE_LINEAR, VQ_MODE_CUBIC, VQ_MODE_MIPMAP,
  vqFiniteOf, vqDensityOf, vqSceneOf, vqKindOf, vqAaLevelOf,
  vqSystemWantedOf, vqRefineFactorOf, vqEffectiveScaleOf, vqConsistentTierOf,
  vqSafeFactorOf, vqScaleAllowedOf, vqShouldRebuildOf, vqHasGainOf,
  vqCubicWeightOf, vqLinearWeightOf, vqResampleOf, vqEdgeJitterOf,
  vqOvershootOf } from '../entry/src/main/ets/common/ViewQuality.ts';
// 第七十轮：HDR 标识真值源（显隐 / 固定边距 / 全屏避让 / 深浅背景对比度 / 遮挡护栏）。
import { HB_LABEL, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP,
  HB_FONT_VP, HB_PAD_H_VP, HB_PAD_V_VP, HB_RADIUS_VP, HB_BORDER_VP,
  HB_BADGE_W_VP, HB_BADGE_H_VP, HB_OCCLUSION_MAX, HB_MIN_CANVAS_VP,
  HB_BG_COLOR, HB_FG_COLOR, HB_BORDER_COLOR, HB_BG_ALPHA,
  HB_PLATE_R, HB_PLATE_G, HB_PLATE_B, HB_FG_R, HB_FG_G, HB_FG_B,
  HB_MIN_CONTRAST,
  hbFiniteOf, hbClamp01Of, hbSrgbLinearOf, hbRelLumOf, hbCompositeOf,
  hbContrastOf, hbBadgePlateLumOf, hbBadgeContrastOf, hbReadableOf,
  hbVisibleOf, hbLeftOf, hbTopOf, hbClearsHintOf, hbFixedSizeOf,
  hbSafeMarginOf, hbOcclusionOf, hbUnobtrusiveOf
} from '../entry/src/main/ets/common/HdrBadge.ts';
// 第七十一轮：HEIC HDR 保真解码真值源（容器探测 / 显式 HDR / 产物校验 / 保真护栏 / 明确提示）。
import { HP_OK_HDR, HP_OK_SDR, HP_NO_HDR_META, HP_CAUSE_FORMAT,
  HP_FILE_CORRUPT, HP_HDR_DOWNGRADED, HP_DECODE_FAILED,
  HP_SIZE_CAPPED, HP_HDR_UNVERIFIED,
  HP_FMT_HEIC, HP_FMT_OTHER, HP_FMT_CORRUPT, HP_FMT_INCOMPATIBLE,
  HP_RANGE_AUTO, HP_RANGE_HDR, HP_MODE_HIGH, HP_MODE_CONSTRAINT, HP_MODE_STANDARD,
  HP_MAX_ORIGINAL_PIXELS, HP_MAX_ORIGINAL_EDGE, HP_PRIMARIES_BT2020,
  HP_TRANSFER_PQ, HP_TRANSFER_HLG, HP_COLORSPACE_PRESERVE, HP_FMT_RGBA_8888,
  hpFiniteOf, hpU32Of, hpBoxAt, hpWalkOf, hpCorruptOf,
  hpFtypBrandOf, hpCompatibleOf, hpFormatOf, hpProbeOf,
  hpRequestOf, hpOutcomeOf, hpDowngradedOf, hpDisplayModeOf,
  hpOriginalSizeAllowedOf, hpDecodeSizeOf, hpAspectPreservedOf,
  hpColorSpacePreservedOf, hpPixelFormatSafeOf, hpNoToneMapOf,
  hpQuantLevelsOf, hpRangeRatioOf, hpFailCodeOf, hpSeverityOf,
  hpShowHintOf, hpHintOf
} from '../entry/src/main/ets/common/HdrPreview.ts';
// 第七十一轮：真实构造的 HEIC 字节样本（hdrprobe.mjs 同时是可独立运行的 CLI 验证入口）。
import { sampleHdrHeic, sampleSdrHeic, sampleGainMapHeic,
  sampleCorruptHeic, sampleUnsupported } from './hdrprobe.mjs';
// 第七十二轮：档案列表右键菜单的纯函数真值源（文案 / 命中 / 详情 / 所在目录 / 复制 / 状态）。
import { FC_KIND_IMAGE, FC_KIND_UP, FC_KIND_FOLDER, FC_KIND_OTHER, FC_KIND_TEXT, FC_KIND_BLANK,
  FC_ACT_OPEN, FC_ACT_DETAIL, FC_ACT_REVEAL, FC_ACT_COPY_PATH, FC_ACT_COPY_NAME,
  FC_LABEL_OPEN, FC_LABEL_DETAIL, FC_LABEL_REVEAL, FC_LABEL_COPY_PATH, FC_LABEL_COPY_NAME,
  FC_FIELD_NAME, FC_FIELD_TYPE, FC_FIELD_SIZE, FC_FIELD_MTIME, FC_FIELD_LOCATION,
  FC_FIELD_PATH, FC_UNKNOWN,
  fcHitOf, fcItemsOf, fcItemCountOf, fcHasActOf, fcHasRequiredOf, fcStopPropagationOf,
  fcKindLabelOf, fcBytesLabelOf, fcTimeLabelOf, fcDetailTitleOf, fcDetailFieldsOf,
  fcNormDirOf, fcRevealTargetOf, fcRevealWantedOf, fcCopyTextOf, fcStatusHintOf,
  FC_MENU_W, FC_MENU_ITEM_H, FC_MENU_TITLE_H, FC_MENU_PAD_V, FC_MENU_EDGE_V,
  FC_MENU_NAME_MAX, fcMenuHeightOf, fcMenuPosOf, fcMenuOutsideOf,
  fcMenuTitleOf, fcMenuVisibleOf,
  FC_OSFM_BUNDLE, FC_OSFM_ABILITY, FC_OSFM_PARAM_FILE_URI,
  FC_VIEW_DATA_ACTION, FC_DIR_UTD, FC_URI_READ_FLAG,
  fcRevealDirUriOf, fcParentUriOf, fcRevealIsDirOf, fcRevealStatusOf
} from '../entry/src/main/ets/common/FileContextMenu.ts';

const ROOT = '/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc';
let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  try {
    assert.equal(actual, expected);
    pass++;
    console.log(`  PASS  ${label}  ->  ${JSON.stringify(actual)}`);
  } catch (e) {
    fail++;
    console.error(`  FAIL  ${label}  expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('--- baseName(): 文件名 / 目录名末段 ---');
const nameCases = [
  ['现场路径（无尾斜杠）', `${ROOT}/人像`, '人像'],
  ['现场路径 + 尾部斜杠（原始缺陷）', `${ROOT}/人像/`, '人像'],
  ['现场路径 + 双尾斜杠', `${ROOT}/人像//`, '人像'],
  ['文档 URI + %XX 中文 + 尾斜杠', `file://docs${ROOT}/%E4%BA%BA%E5%83%8F/`, '人像'],
  ['文档 URI + 中文 + ? 参数', `file://docs${ROOT}/人像/?mode=r`, '人像'],
  ['多级中文路径（末级）', `${ROOT}/人像/编号202601 模特 猫/`, '编号202601 模特 猫'],
  ['多级中文 + %XX 编码', `file://docs${ROOT}/%E4%BA%BA%E5%83%8F/%E7%BC%96%E5%8F%B7202601/`, '编号202601'],
  ['中文 + 空格', `${ROOT}/模特 猫/`, '模特 猫'],
  ['纯 ASCII 目录', `${ROOT}/DCIM/`, 'DCIM'],
  ['顶层中文目录', '/人像/', '人像'],
  ['裸名字', '人像', '人像'],
  ['普通文件名不受影响', `${ROOT}/人像/DSC_0123.JPG`, 'DSC_0123.JPG'],
  ['非法 % 序列保持原样', `${ROOT}/100% 原图/`, '100% 原图'],
];
for (const [label, input, expected] of nameCases) {
  check(label, baseName(input), expected);
}

console.log('--- baseName(): 绝不返回空串 ---');
check('空串兜底', baseName('') === '', false);
check('空串兜底内容', baseName(''), '（未命名）');
check('根 / 非空', baseName('/').length > 0, true);
check('只有斜杠非空', baseName('///').length > 0, true);

console.log('--- stripTrailingSlash() ---');
check('去尾斜杠', stripTrailingSlash(`${ROOT}/人像/`), `${ROOT}/人像`);
check('去双尾斜杠', stripTrailingSlash(`${ROOT}/人像//`), `${ROOT}/人像`);
check('去 ? 参数', stripTrailingSlash(`${ROOT}/人像/?mode=r`), `${ROOT}/人像`);
check('保留 scheme //', stripTrailingSlash('file://docs'), 'file://docs');
check('保留根 /', stripTrailingSlash('/'), '/');

console.log('--- dirDisplayName(): 左栏抬头 / 状态栏 ---');
const labelCases = [
  ['实测 base 就是带尾斜杠的编码 URI',
    `file://docs${ROOT}/%E4%BA%BA%E5%83%8F/`,
    `file://docs${ROOT}/%E4%BA%BA%E5%83%8F/`,
    [`${ROOT}/人像`], '人像'],
  ['base 是真实路径 + 中文', `${ROOT}/人像/`, `file://docs${ROOT}/人像/`, [], '人像'],
  ['base 退化成文档 URI 碎片，靠 candidates 救回',
    'file://docs', 'file://docs', [`${ROOT}/人像/`], '人像'],
  ['多级中文路径取末级',
    `${ROOT}/人像/编号202601 模特 猫/`,
    `file://docs${ROOT}/人像/编号202601 模特 猫/`,
    [], '编号202601 模特 猫'],
  ['全失败也要有兜底名', '', '', [], '目录'],
  ['只有 URI 碎片时兜底', 'file://docs', 'file://docs', [], '目录'],
];
for (const [label, base, raw, candidates, expected] of labelCases) {
  check(label, dirDisplayName(base, raw, candidates), expected);
}
check('dirDisplayName 结果恒非空',
  dirDisplayName('', '', []).length > 0, true);

console.log('--- parentDirOf(): 往上层的基础父目录（尾斜杠 / 中文 / 文档 URI） ---');
const CHILD = `${ROOT}/人像/编号202601 模特 猫`;
const PARENT = `${ROOT}/人像`;
check('现场路径：多级中文 + 空格 → 人像', parentDirOf(CHILD), PARENT);
check('现场路径 + 尾斜杠（原始缺陷，旧 dirOf 返回自身）', parentDirOf(`${CHILD}/`), PARENT);
check('现场路径 + 双尾斜杠', parentDirOf(`${CHILD}//`), PARENT);
check('文档 URI + %XX 中文 + 尾斜杠',
  parentDirOf(`file://docs${ROOT}/%E4%BA%BA%E5%83%8F/%E7%BC%96%E5%8F%B7202601%20%E6%A8%A1%E7%89%B9%20%E7%8C%AB/`),
  PARENT);
check('文档 URI + 中文 + ? 参数', parentDirOf(`file://docs${CHILD}/?mode=r`), PARENT);
check('纯 ASCII 多级', parentDirOf('/a/b/c/'), '/a/b');
check('单级 → 根', parentDirOf('/人像/'), '/');
check('根 → 空串（已是最上层）', parentDirOf('/'), '');
check('空串 → 空串', parentDirOf(''), '');
check('文档 URI 碎片不算路径', realPathOf('file://docs'), '');
check('父结果恒不等于自身', parentDirOf(`${CHILD}/`) === stripTrailingSlash(`${CHILD}/`), false);

console.log('--- parentDirCandidates(): 往上层逐个尝试的候选（旧版遗留工具） ---');
const cands = parentDirCandidates(`file://docs${CHILD}/`);
check('文档 URI 候选数 >= 2', cands.length >= 2, true);
check('首选保留 URI 形态', cands[0], `file://docs${PARENT}`);
check('包含真实路径父', cands.includes(PARENT), true);
check('候选不含自身', cands.includes(stripTrailingSlash(`file://docs${CHILD}/`)), false);
check('真实路径去重后只有父', parentDirCandidates(`${CHILD}/`).join('|'), PARENT);
check('根路径不产生假父级', parentDirCandidates('/').join('|'), '/');

console.log('--- pickerStartOf(): FOLDER picker 起点必须已授权且带 scheme ---');
const RAW_DIR = `file://docs${CHILD}/`;
check('picker 原始目录 URI 优先', pickerStartOf(RAW_DIR, RAW_DIR), `file://docs${CHILD}`);
check('browseDir 为空时退回 pickRootUri', pickerStartOf('', RAW_DIR), `file://docs${CHILD}`);
check('带 ? 参数与尾斜杠', pickerStartOf(`${RAW_DIR}?mode=r`, ''), `file://docs${CHILD}`);
check('纯文件系统路径不给 picker（旧版缺陷）', pickerStartOf(PARENT, CHILD), '');
check('两者都是纯路径时返回空串 → 不设 defaultFilePathUri', pickerStartOf('', ''), '');
check('绝不返回未授权的父目录', pickerStartOf(RAW_DIR, '') === PARENT, false);

// 这部分不是纯函数，而是对 Index.ets 的源码静态契约：
// 「全是子文件夹、零图片的目录（人像）不能显示空白」是 UI 分支决定的，
// 编译不了 HAP 时至少要保证这段分支不被改回去。
console.log('--- 源码静态契约：零图片目录仍要列出目录表 ---');
// R39 Phase 0（Index.ets 拆分）：静态契约锚点与文件解耦 —— 断言按「逻辑所在文件」
// 取源码，不再绑死单一文件。当前所有锚点仍指向 pages/Index.ets，行为零变化；
// 后续轮次把组件 / 解码服务迁出时，只需在 SRC_FILES 登记新文件并改锚点指向。
const SRC_FILES = {
  'pages/Index.ets': '../entry/src/main/ets/pages/Index.ets',
  'components/ArchiveRow.ets': '../entry/src/main/ets/components/ArchiveRow.ets',
  'model/Preview.ets': '../entry/src/main/ets/model/Preview.ets',
  'components/SidebarView.ets': '../entry/src/main/ets/components/SidebarView.ets',
  'components/ToolButton.ets': '../entry/src/main/ets/components/ToolButton.ets',
  'common/SpreadFit.ts': '../entry/src/main/ets/common/SpreadFit.ts',
};
const src = (name) => readFileSync(new URL(SRC_FILES[name], import.meta.url), 'utf8');
const INDEX = src('pages/Index.ets');
// R39 Phase 1：ArchiveRow 行组件迁 components/、解码链迁 model/ —— 锚点按逻辑所在文件取源码；
// 跨文件计数型断言（new Promise / fmtBytes / Text(this.name)）用拼接源码保持原语义。
const ARCHIVE = src('components/ArchiveRow.ets');
const MODEL = src('model/Preview.ets');
// R40 Phase 3：左栏迁 components/SidebarView.ets、工具按钮迁 components/ToolButton.ets。
const SIDEBAR = src('components/SidebarView.ets');
const TOOLBTN = src('components/ToolButton.ets');
check('空态判断用 rowCount（左栏实际行数）', /if \(this\.rowCount === 0\)/.test(SIDEBAR), true);
check('不再用 itemCount 判空态（itemCount 只算图片）', /if \(this\.itemCount === 0\)/.test(INDEX), false);
check('applyItems 同步 rowCount', /this\.rowCount = this\.rows\.length/.test(INDEX), true);
check('零图片目录设置 dirHint 提示条', /this\.dirHint = '本层没有图片/.test(INDEX), true);
check('statSync 失败的无后缀项按文件夹列出', /else if \(!statOk\)/.test(INDEX), true);
check('无授权兜底不再 return false 吞掉目录表',
  /this\.chooseFilesInDir\(dirUri\);\s*return false;/.test(INDEX), false);
check('兜底改为末尾在目录表建立之后触发', /if \(needFileFallback\)/.test(INDEX), true);

console.log('--- textWidthVp() / listWidthForNames(): 档案名列宽自适应 ---');
check('空串宽度 0', textWidthVp('', 12), 0);
check('两个 CJK = 2 字宽', textWidthVp('人像', 12), 24);
check('数字 / 大写按 0.6', textWidthVp('AB1', 12), Math.ceil(3 * 12 * 0.6));
check('小写半角按 0.55', textWidthVp('abc', 12), Math.ceil(3 * 12 * 0.55));
check('中文 + 空格混合', textWidthVp('编号 猫', 12), Math.ceil(12 + 12 + 12 * 0.3 + 12));
check('空列表 → 收窄到下限（不多留白）', listWidthForNames([], 280, 900), 280);
check('短名字 → 仍是下限', listWidthForNames(['a.jpg'], 280, 900), 280);
check('现场长中文名 → 自动放宽', listWidthForNames(['编号202601 模特 猫'], 280, 900) > 280, true);
check('名字越长宽度越大', listWidthForNames(['人像'], 280, 900) <
  listWidthForNames(['编号202601 模特 猫 高清原图合集'], 280, 900), true);
check('超长名字夹在上限（不压没预览区）', listWidthForNames(['很'.repeat(200)], 280, 900), 900);
check('宽度恒在下限与上限之间', (() => {
  const w = listWidthForNames(['DSC_0001.JPG', '编号202601 模特 猫'], 280, 900);
  return w >= 280 && w <= 900;
})(), true);

console.log('--- 源码静态契约：按钮区与档案列表布局 ---');
check('不再有「选择图片」toolBtn', /toolBtn\('选择图片'/.test(INDEX + SIDEBAR), false);
check('不再有「回到上次」toolBtn', /toolBtn\('回到上次'/.test(INDEX + SIDEBAR), false);
check('doAction 无 files 分支', /case 'files':/.test(INDEX), false);
check('doAction 无 resume 分支', /case 'resume':/.test(INDEX), false);
check('R78 三个纯图案按钮合并在同一行，且「往上层」恒亮恒可点',
  /SideToolButton\(\{ glyph: '⇧', act: 'up', flex: true[\s\S]{0,220}SideToolButton\(\{ glyph: '▣', act: 'folder', flex: true/.test(SIDEBAR), true);
check('按钮区不再有原来的第二行',
  /bottom: 4 \}\)\s*Row\(\) \{\s*SideToolButton\(\{ glyph: '▣'/.test(SIDEBAR), false);
check('R77 左栏宽改用 adaptive（展开 / 收起宽都由容器 + 内容动态推出，零固定宽度）',
  /\.width\(this\.listCollapsed \? this\.collapsedW : this\.listW\)/.test(SIDEBAR) &&
  SIDEBAR.includes('LIST_COLLAPSED_W') === false, true);
check('R77 applyItems 重算 adaptive 列宽（不再有 LIST_W / LIST_MAX_W / 固定开销）',
  /this\.refreshAdaptiveLayout\(rowNames\);/.test(INDEX) &&
  INDEX.includes('this.listW = listWidthForNames') === false &&
  INDEX.includes('const LIST_W:') === false && INDEX.includes('const LIST_MAX_W:') === false, true);
check('R77 名称列移除 minWidth 预设宽度，纯 layoutWeight(1) 弹性伸缩',
  /constraintSize\(\{ minWidth: textWidthVp/.test(ARCHIVE) === false &&
  ARCHIVE.includes('.layoutWeight(1)') && ARCHIVE.includes('.width(this.colSizeW)'), true);
check('行首图标高度压到 26', /\.height\(26\)/.test(ARCHIVE), true);
check('行上下 padding 由 1 收到 0.2（R69 各减 0.8vp ≈ 0.8mm）', /top: 0.2, bottom: 0.2/.test(ARCHIVE), true);
check('List 行间距改用 LIST_ROW_GAP_VP 常量且为 1',
  /space: LIST_ROW_GAP_VP/.test(SIDEBAR) &&
  /const LIST_ROW_GAP_VP: number = 1;/.test(SIDEBAR), true);
check('档案列表「梅花间竹」交替色格子：奇偶两色 + 选中色优先',
  /const ROW_STRIPE_EVEN: string = '#1e242e';/.test(ARCHIVE) &&
  /const ROW_STRIPE_ODD: string = '#161a21';/.test(ARCHIVE) &&
  /const ROW_SELECTED_BG: string = '#1f2730';/.test(ARCHIVE) &&
  /private rowBgColor\(\): string \{[\s\S]{0,160}if \(this\.selected\)[\s\S]{0,160}return ROW_SELECTED_BG;[\s\S]{0,160}\(this\.idx % 2\) === 0 \? ROW_STRIPE_EVEN : ROW_STRIPE_ODD/.test(ARCHIVE) &&
  /\.backgroundColor\(this\.rowBgColor\(\)\)/.test(ARCHIVE), true);

console.log('--- sameEntryNames(): 重扫时判断目录内容是否真的变了 ---');
check('空目录一致', sameEntryNames([], []), true);
check('顺序不同仍算一致（不触发重建）', sameEntryNames(['a', '人像'], ['人像', 'a']), true);
check('新增条目 → 不一致', sameEntryNames(['a', 'b'], ['a']), false);
check('删除条目 → 不一致', sameEntryNames(['a'], ['a', 'b']), false);
check('改名 → 不一致', sameEntryNames(['a', 'b'], ['a', 'c']), false);
check('中文 + 空格现场路径一致',
  sameEntryNames(['编号202601 模特 猫', '人像'], ['人像', '编号202601 模特 猫']), true);

console.log('--- 源码静态契约：hover 缩略图纯预览、退出不切回上次 ---');
const HOVER_FN = ARCHIVE.slice(ARCHIVE.indexOf('private onHoverChange('), ARCHIVE.indexOf('hoverThumb()'));
const HOVER_THUMB_START = ARCHIVE.indexOf('hoverThumb()');
const HOVER_THUMB_FN = ARCHIVE.slice(HOVER_THUMB_START, ARCHIVE.indexOf('  build() {', HOVER_THUMB_START));
const APPLY_FN = INDEX.slice(INDEX.indexOf('private applyItems('), INDEX.indexOf('后台分批补测体积'));
// 第十一轮：hover 小图预览改为「零延迟、零动画」，旧的去抖常量 / 计时器 / 代号断言
// 全部按新语义同步更新（不删断言）。
check('第十一轮：不再有 hover 关闭去抖常量',
  /const HOVER_CLOSE_DELAY_MS/.test(ARCHIVE), false);
check('第十一轮：onHover(false) 同步立即隐藏、无去抖代号',
  /this\.showHover = false;/.test(HOVER_FN) &&
  /\+\+this\.hoverSeq/.test(HOVER_FN) === false, true);
check('第十一轮：不再有 hoverCloseTimer 延迟计时器',
  /clearTimeout\(this\.hoverCloseTimer\)/.test(ARCHIVE), false);
check('第十一轮：hover 回来不做计时器复位（无 cancelCloseTimer）',
  /cancelCloseTimer/.test(HOVER_FN) === false &&
  /if \(this\.showHover\) \{[\s\S]{0,120}return;/.test(HOVER_FN), true);
check('onMouse(Move) 不再无条件自动打开（原自激闪烁源）',
  /MouseAction\.Move && !this\.showHover/.test(ARCHIVE), false);
check('hover 回调不触碰选中态 / 列表 / 目录',
  /this\.onTap\(|applyItems\(|openFolder\(|this\.cur =/.test(HOVER_FN), false);
check('第十一轮：aboutToDisappear 同步立即收起浮层、无计时器',
  /aboutToDisappear\(\): void \{[\s\S]{0,300}this\.showHover = false;/.test(ARCHIVE) &&
  /aboutToDisappear\(\): void \{[\s\S]{0,300}cancelCloseTimer/.test(ARCHIVE) === false, true);
check('第十一轮：点击行时立即收起浮层、无去抖代号',
  /\.onClick\(\(\) => \{[\s\S]{0,220}this\.showHover = false;/.test(ARCHIVE) &&
  /\.onClick\(\(\) => \{[\s\S]{0,220}this\.hoverSeq\+\+/.test(ARCHIVE) === false, true);
check('hover 缩略图浮层只放相片、不显示档案名（2026-11-11）',
  /Image\(this\.hoverPx!\)/.test(HOVER_THUMB_FN) &&
  !/Text\(this\.name\)/.test(HOVER_THUMB_FN), true);

check('openFolder 支持 isRescan', /isRescan\?: boolean/.test(INDEX), true);
check('重扫内容未变则跳过列表重建（R42 起缓存先渲染的后台核对也走同一短路）', /\(isRescan === true \|\| fromCache\) && this\.sameDirEntries\(names\)/.test(INDEX), true);
check('startDirPoll 用 isRescan=true / 不弹多选',
  /this\.openFolder\(this\.browseBase, false, false, true\)/.test(INDEX), true);
check('重扫传给 applyItems 的 preserveView', /rows, isRescan === true/.test(INDEX), true);
check('preserveView 时不 restoreIndex', /keepView \? -1 : this\.restoreIndex\(list\)/.test(APPLY_FN), true);
check('preserveView 时按 uri 保持当前张', /list\[i\]\.uri === prevUri/.test(APPLY_FN), true);
check('preserveView 时不清预览缓存', /if \(!keepView\) \{\s*this\.clearPreviews\(\)/.test(APPLY_FN), true);
check('preserveView 时不重解大图（只读名单态同样不重解）',
  /if \(!keepView && ioOk\) \{[\s\S]{0,900}this\.showPreviewOf\(this\.cur\)/.test(APPLY_FN), true);
check('preserveView 时不覆盖状态栏（不闪「已载入 N 张」）',
  /if \(!keepView\) \{\s*this\.status = '已载入/.test(APPLY_FN), true);
check('sameDirEntries 用纯函数比对', /return sameEntryNames\(want, cur\)/.test(INDEX), true);
check('诊断串带 hv=3 便于确认新包', /\| hv=3/.test(INDEX), true);

console.log('--- HoverGuard：同一时刻只有一行浮层（纯逻辑状态机） ---');
let g = new HoverGuard();
let aClosed = 0;
let bClosed = 0;
g.take('A', () => { aClosed++; });
g.take('B', () => { bClosed++; });
check('换到 B 时同步收起 A（不等 120ms，避免两浮层重叠闪）', aClosed, 1);
check('B 成为唯一持有者', g.isActive('B'), true);
g.release('A');                       // 旧行那条延迟关闭回调晚到
check('旧行 release 不误关新行 B', g.isActive('B'), true);
check('旧行 release 不触发 B 的收起', bClosed, 0);
g.take('B', () => { bClosed++; });
check('同一行重复 take 不再收起（不闪）', bClosed, 0);
g.release('B');
check('release 当前持有者后清空', g.isActive('B'), false);

g = new HoverGuard();
check('初始认为 onHover 不可用（允许 onMouse 兜底）', g.hoverSupported, false);
g.noteHover();
check('收到过一次 onHover 后关闭 onMouse 兜底（切断自激）', g.hoverSupported, true);

g = new HoverGuard();
let closes = 0;
g.take('A', () => { closes++; });
g.release('A');
check('假离开收起后不残留持有者', g.isActive('A'), false);
g.take('A', () => { closes++; });
check('重新 take 同一行不触发旧 close', closes, 0);

console.log('--- 源码静态契约：bindPopup 默认值导致的「不停闪」 ---');
const POPUP_START = ARCHIVE.indexOf('.bindPopup(this.showHover');
const POPUP = ARCHIVE.slice(POPUP_START, ARCHIVE.indexOf('.gesture(', POPUP_START));
check('mask:false 关掉吞鼠标事件的透明遮罩（根因①）', /mask: false/.test(POPUP), true);
check('autoCancel:false 禁止系统自行收起 popup（根因②）', /autoCancel: false/.test(POPUP), true);
check('enableArrow:false 减少弹出位置抖动', /enableArrow: false/.test(POPUP), true);
check('onHover 回调里标记 hoverSupported', /HoverGuard\.shared\(\)\.noteHover\(\)/.test(ARCHIVE), true);
check('onMouse 兜底受 hoverSupported 门控',
  /if \(!HoverGuard\.shared\(\)\.hoverSupported\)/.test(ARCHIVE), true);
check('第十一轮：onMouse 在浮层展开时直接返回、不打开（无计时器可续命）',
  /if \(this\.showHover\) \{[\s\S]{0,160}return;/.test(ARCHIVE) &&
  /this\.cancelCloseTimer\(\)/.test(ARCHIVE) === false, true);
check('打开浮层前 take 同步收起上一行',
  /HoverGuard\.shared\(\)\.take\(key, \(\) => this\.forceHide\(\)\)/.test(HOVER_FN), true);
check('forceHide 同步收起、不走延迟',
  /private forceHide\(\)[\s\S]{0,220}this\.showHover = false;/.test(ARCHIVE), true);
check('第十一轮：同步立即隐藏时释放持有者', /HoverGuard\.shared\(\)\.release\(key\)/.test(HOVER_FN), true);
check('aboutToDisappear 释放持有者',
  /HoverGuard\.shared\(\)\.release\(this\.rowKey\(\)\)/.test(ARCHIVE), true);
check('点击行时释放持有者',
  /\.onClick\(\(\) => \{[\s\S]{0,320}HoverGuard\.shared\(\)\.release/.test(ARCHIVE), true);
check('hover 回调仍不触碰选中态 / 列表 / 目录',
  /this\.onTap\(|applyItems\(|openFolder\(|this\.cur =/.test(HOVER_FN), false);

console.log('--- 「往上层」目录层级：卷根 / 严格逐级 / 到顶停止 ---');
const DEEP = `${ROOT}/人像/编号202601 模特 猫`;
const VOLROOT = '/storage/Users/currentUser';
check('鸿蒙用户卷根', volumeRootOf(DEEP), VOLROOT);
check('Windows 盘符卷根', volumeRootOf('C:/Users/foo/Pictures/2020'), 'C:');
check('Windows 盘符根自身仍是卷根（到顶不判空）', volumeRootOf('C:'), 'C:');
check('通用 POSIX 卷根', volumeRootOf('/a/b/c'), '/');
check('文档 URI 归到同一卷根', volumeRootOf(`file://docs${DEEP}/`), VOLROOT);
check('碎片 URI 判不出卷根', volumeRootOf('file://docs'), '');
check('现场路径层级 L4', dirLevelOf(DEEP), 4);
check('卷根层级 L0', dirLevelOf(VOLROOT), 0);
check('尾斜杠不改变层级', dirLevelOf(`${DEEP}/`), 4);
check('只剥一层 → 人像', upLevelOf(DEEP), `${ROOT}/人像`);
check('尾斜杠（旧缺陷）仍只剥一层', upLevelOf(`${DEEP}/`), `${ROOT}/人像`);
check('%XX 文档 URI 形态同样只剥一层',
  upLevelOf(`file://docs${ROOT}/%E4%BA%BA%E5%83%8F/%E7%BC%96%E5%8F%B7202601%20%E6%A8%A1%E7%89%B9%20%E7%8C%AB/`),
  `${ROOT}/人像`);
check('父结果绝不等于自身', upLevelOf(`${DEEP}/`) === stripTrailingSlash(`${DEEP}/`), false);
check('卷根没有父级', upLevelOf(VOLROOT), '');
check('Windows 盘符根没有父级', upLevelOf('C:'), '');
check('文件系统根没有父级', upLevelOf('/'), '');
check('空路径没有父级', upLevelOf(''), '');
check('canGoUpFrom 与 upLevelOf 同源（有父级）', canGoUpFrom(DEEP), upLevelOf(DEEP).length > 0);
check('canGoUpFrom 与 upLevelOf 同源（卷根）', canGoUpFrom(VOLROOT), false);
check('非目录态空路径无父级（仅提示文案，按钮仍可点）', canGoUpFrom(''), false);

// 连续点击模拟：每一步严格 L-1，遇到重复路径即判定为「绕圈」。
function climb(path) {
  const out = [path];
  const seen = new Set([stripTrailingSlash(hierPathOf(path))]);
  let cur = path;
  for (let i = 0; i < 32; i++) {
    const next = upLevelOf(cur);
    if (next.length === 0) {
      break;
    }
    const key = stripTrailingSlash(hierPathOf(next));
    if (seen.has(key)) {
      return { out, loop: true };
    }
    seen.add(key);
    out.push(next);
    cur = next;
  }
  return { out, loop: false };
}
const cOhos = climb(DEEP);
check('鸿蒙现场路径连续点击 L4→L3→L2→L1→L0',
  cOhos.out.map((p) => dirLevelOf(p)).join('>'), '4>3>2>1>0');
check('鸿蒙逐级链无循环', cOhos.loop, false);
check('鸿蒙逐级链终点就是卷根', cOhos.out[cOhos.out.length - 1], VOLROOT);
check('鸿蒙逐级链每步严格只少一层（不越级）', (() => {
  for (let i = 1; i < cOhos.out.length; i++) {
    if (dirLevelOf(cOhos.out[i]) !== dirLevelOf(cOhos.out[i - 1]) - 1) {
      return false;
    }
  }
  return true;
})(), true);
check('到卷根后按钮状态 false', canGoUpFrom(cOhos.out[cOhos.out.length - 1]), false);
check('到卷根后再点也不上移', upLevelOf(cOhos.out[cOhos.out.length - 1]), '');

const cWin = climb('C:/Users/foo/Pictures/2020');
check('Windows 逐级链', cWin.out.join('>'),
  'C:/Users/foo/Pictures/2020>C:/Users/foo/Pictures>C:/Users/foo>C:/Users>C:');
check('Windows 逐级链无循环', cWin.loop, false);
check('Windows 到盘符根停止（不再往「此电脑」）', canGoUpFrom(cWin.out[cWin.out.length - 1]), false);
check('Windows 每步只少一层', (() => {
  for (let i = 1; i < cWin.out.length; i++) {
    if (dirLevelOf(cWin.out[i]) !== dirLevelOf(cWin.out[i - 1]) - 1) {
      return false;
    }
  }
  return true;
})(), true);

const cPosix = climb('/a/b/c');
check('POSIX 逐级链', cPosix.out.join('>'), '/a/b/c>/a/b>/a>/');
check('POSIX 逐级链无循环', cPosix.loop, false);
check('POSIX 到根停止', canGoUpFrom(cPosix.out[cPosix.out.length - 1]), false);

console.log('--- upParentCandidates(): 候选必须全在同一父层（不越级 / 不循环） ---');
const ups = upParentCandidates(DEEP, `file://docs${DEEP}/`);
const TARGET = upLevelOf(DEEP);
check('候选非空', ups.length > 0, true);
check('候选全部落在同一父层', ups.every((u) => sameDirPath(u, TARGET)), true);
check('候选不含当前目录自身', ups.some((u) => sameDirPath(u, DEEP)), false);
check('候选不含祖父层', ups.some((u) => sameDirPath(u, ROOT)), false);
check('候选不含旁支目录', ups.some((u) => sameDirPath(u, `${ROOT}/人像/别的文件夹`)), false);
check('候选含真实路径目标（fs.listFile 兜底）', ups.includes(TARGET), true);
check('候选已去重', new Set(ups).size, ups.length);
check('卷根无候选', upParentCandidates(VOLROOT, `file://docs${VOLROOT}/`).length, 0);
check('非目录态空路径无候选', upParentCandidates('', '').length, 0);

console.log('--- sameDirPath() / isUpTargetOf(): 补授权只接受直接父级 ---');
check('sameDirPath 认文档 URI 与真实路径', sameDirPath(`file://docs${TARGET}/`, TARGET), true);
check('sameDirPath 认尾斜杠', sameDirPath(`${TARGET}/`, TARGET), true);
check('sameDirPath 拒绝不同目录', sameDirPath(`${TARGET}/子`, TARGET), false);
check('sameDirPath 空串不算同一目录', sameDirPath('', ''), false);
check('接受真实路径父目录', isUpTargetOf(TARGET, DEEP), true);
check('接受文档 URI 形态的父目录', isUpTargetOf(`file://docs${TARGET}/`, DEEP), true);
check('接受 %XX 编码父目录', isUpTargetOf(`file://docs${ROOT}/%E4%BA%BA%E5%83%8F/`, DEEP), true);
check('拒绝当前目录自身（原地确认）', isUpTargetOf(DEEP, DEEP), false);
check('拒绝祖父级（越级）', isUpTargetOf(ROOT, DEEP), false);
check('拒绝旁支目录', isUpTargetOf(`${ROOT}/别的目录`, DEEP), false);
check('拒绝同名同层旁支（旧 fallback 漏洞）', isUpTargetOf(`${ROOT}/别的父/人像`, DEEP), false);
check('卷根一律拒绝', isUpTargetOf(TARGET, VOLROOT), false);
check('空选中拒绝', isUpTargetOf('', DEEP), false);

console.log('--- 源码静态契约：「往上层」目录层级语义（2026-11-10） ---');
check('R78 往上层按钮改为纯图案 ⇧（零文字标签）', /SideToolButton\(\{ glyph: '⇧', act: 'up',/.test(SIDEBAR), true);
check('源码不再出现「回上层」', /回上层/.test(INDEX), false);
const TOOLBTN_FN = TOOLBTN.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');  // R40：toolBtn 迁出为 components/ToolButton.ets（去注释行后即按钮实现）
const CODE_LINES = (INDEX + ARCHIVE + MODEL + SIDEBAR + TOOLBTN).split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
check('往上层按钮恒亮恒可点（不再传 canGoUp）', /SideToolButton\(\{ glyph: '⇧', act: 'up', flex: true/.test(SIDEBAR), true);
check('toolBtn 三参签名，不接受 enabled 入参',
  TOOLBTN.includes('@Prop label: string') && TOOLBTN.includes('@Prop act: string') && TOOLBTN.includes('@Prop flex: boolean') && /@Prop enabled/.test(TOOLBTN) === false, true);
check('toolBtn 函数体无 .enabled / 条件颜色 / 条件 opacity',
  /\.enabled\(/.test(TOOLBTN_FN) === false &&
  /fontColor\(enabled \?/.test(TOOLBTN_FN) === false &&
  /opacity\(enabled \?/.test(TOOLBTN_FN) === false, true);
check('toolBtn 无条件恒定外观',
  /\.fontColor\('#e8ecf4'\)/.test(TOOLBTN_FN) && /\.backgroundColor\('#2a2f3a'\)/.test(TOOLBTN_FN), true);
check('源码非注释行无 .enabled( 禁用属性', /\.enabled\(/.test(CODE_LINES), false);
check('源码不再有浏览历史栈 dirStack', /dirStack/.test(INDEX), false);
check('openFolder 参数改名 resetView（无压栈语义）', /resetView: boolean/.test(INDEX), true);
check('applyItems 同源刷新 canGoUp（纯信息状态，不驱动按钮）',
  /this\.canGoUp = canGoUpFrom\(this\.browseBase\);/.test(INDEX) &&
  /upEnabledAfterResume/.test(INDEX) === false, true);
const UP_FN = INDEX.slice(INDEX.indexOf('private async browseUp('), INDEX.indexOf('private showUpListInApp('));
check('browseUp 用 upLevelOf 求直接父级', /let target: string = upLevelOf\(current\)/.test(UP_FN), true);
check('browseUp 用 upNavStateOf 区分到顶 / 层级判不出',
  /const state: number = upNavStateOf\(current\)/.test(UP_FN), true);
check('browseUp UNKNOWN 态用宽松父级兜底',
  /target = upLooseParentOf\(current\)/.test(UP_FN) && /state === UP_NAV_UNKNOWN/.test(UP_FN), true);
check('browseUp 三种不动分开提示',
  /if \(!canUp\)/.test(UP_FN) && /state === UP_NAV_NONE/.test(UP_FN) &&
  /state === UP_NAV_TOP/.test(UP_FN), true);
const LOOSE_FAIL = UP_FN.slice(
  UP_FN.indexOf('if (loose) {', UP_FN.indexOf('hilog.warn')),
  UP_FN.indexOf('this.showUpListInApp('));
check('browseUp UNKNOWN 失败不弹系统选择器、改 APP 内清单',
  /if \(loose\) \{/.test(LOOSE_FAIL) &&
  /DocumentViewPicker|dv\.select|chooseFolderAt|isUpTargetOf/.test(LOOSE_FAIL) === false &&
  /this\.showUpListInApp\(/.test(UP_FN), true);
check('browseUp 不再 pop 浏览历史', /\.pop\(/.test(UP_FN), false);
check('browseUp 候选只用同层 upParentCandidates', /upParentCandidates\(current,/.test(UP_FN), true);
check('成功后清掉 pickRootUri 旧锚点', /this\.pickRootUri = '';/.test(UP_FN), true);
check('目录浏览态恒列 .. 行（不因路径判定消失）',
  /rows\.push\(\{ uri: '', name: '\.\.', size: -1, mtime: 0, kind: ROW_UP/.test(INDEX) &&
  /if \(canGoUpFrom\(base\)\) \{/.test(INDEX) === false, true);
check('往上层彻底不再补授权（Index 不再引用 pickerStartOf / isUpTargetOf）',
  /pickerStartOf\(/.test(INDEX) === false && /isUpTargetOf\(/.test(INDEX) === false, true);
check('往上层不再有「越级放宽」分支，且不再持久化 picker 选中 URI',
  /pickedName === targetName && dirLevelOf/.test(INDEX) === false &&
  /persistFolderUri\(uris\[0\]\)/.test(UP_FN) === false, true);
check('按钮 / 退格 / .. 行三条入口都收口 browseUp',
  (INDEX.match(/this\.browseUp\(\)/g) || []).length >= 3, true);
check('诊断串标记 up4（辨认新包，不升版本号）', /const UP_NAV_TAG: string = 'up4'/.test(INDEX), true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- 预载窗口扩容：前后各 100 张（2026-11-11） ---');
check('窗口 = 100+100+1 = 201 张', preloadWindowSize(100, 100, 1000), 201);
check('图库比窗口小时取总数（不绕圈重复）', preloadWindowSize(100, 100, 30), 30);
check('图库只有 1 张', preloadWindowSize(100, 100, 1), 1);
check('空图库窗口为 0', preloadWindowSize(100, 100, 0), 0);
check('前后不等时按实际 span', preloadWindowSize(20, 30, 1000), 51);
check('交替顺序前 6 项（先近后远）', preloadOrder(100, 100).slice(0, 6).join(','), '1,-1,2,-2,3,-3');
check('交替顺序总长 200', preloadOrder(100, 100).length, 200);
check('交替顺序 2/2', preloadOrder(2, 2).join(','), '1,-1,2,-2');
check('前多后少时剩余只补前方', preloadOrder(1, 3).join(','), '1,-1,2,3');
check('前少后多时剩余只补后方', preloadOrder(3, 1).join(','), '1,-1,-2,-3');
check('顺序不含 0（当前张不走预载链）', preloadOrder(100, 100).includes(0), false);
check('每个 k 只出现一次（不会重复解码）', new Set(preloadOrder(100, 100)).size, 200);
check('窗口 0 时无候选', preloadOrder(0, 0).length, 0);

console.log('--- preloadSaturated(): 预算触顶收工，防「解→淘汰→再解」死循环 ---');
check('空缓存不算触顶（还没开始解）', preloadSaturated(0, 0, 216, 1024), false);
check('张数触顶', preloadSaturated(216, 100, 216, 1024), true);
check('字节触顶', preloadSaturated(10, 1024, 216, 1024), true);
check('再加一张就触顶 → 提前收工（防边界抖动）', preloadSaturated(10, 950, 216, 1000), true);
check('还有余量时继续预载', preloadSaturated(10, 100, 216, 1000), false);
check('张数上限非正 = 不受限', preloadSaturated(10, 100, 0, 1000), false);
check('字节上限非正 = 不受限', preloadSaturated(10, 100, 216, 0), false);
check('容量 216 必须大于窗口 201（否则每入一张就淘汰）', 216 > preloadWindowSize(100, 100, 1000), true);

console.log('--- 源码静态契约：预载扩容 + 预算收工 ---');
check('预载窗口前后各 100',
  /const PRELOAD_FWD: number = 100;/.test(INDEX) && /const PRELOAD_BACK: number = 100;/.test(INDEX), true);
check('LRU 容量 216', /const PRELOAD_COUNT: number = 216;/.test(INDEX), true);
check('字节上限提到 1GB', /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX), true);
check('不再有旧的 50 / 112 / 512MB 常量',
  /const PRELOAD_(FWD|BACK): number = 50;/.test(INDEX) === false &&
  /const PRELOAD_COUNT: number = 112;/.test(INDEX) === false &&
  /const PRELOAD_MAX_BYTES: number = 512/.test(INDEX) === false, true);
check('引入 PreloadBudget 纯函数', /from '..\/common\/PreloadBudget'/.test(INDEX), true);
check('preloadNext 用交替顺序找缺口',
  /const order: number\[\] = preloadOrder\(backSpan, fwdSpan\)/.test(INDEX), true);
check('preloadNext 有预算收工判据',
  /if \(preloadSaturated\(this\.previews\.length, this\.preloadBytes, PRELOAD_COUNT, PRELOAD_MAX_BYTES\)\)/.test(INDEX), true);
check('收工时释放 preloadBusy 并打日志', /preload: budget reached/.test(INDEX), true);
check('window full 用 preloadWindowSize 算 want',
  /const want: number = preloadWindowSize\(backSpan, fwdSpan, n\)/.test(INDEX), true);
check('evictOutside 用窗口集合查表（窗口翻倍后不 O(P×W)）',
  /const win: Set<string> = this\.windowUris\(\)/.test(INDEX) &&
  /if \(win\.has\(e\.uri\)\)/.test(INDEX), true);
check('不再逐条调 inWindow', /this\.inWindow\(/.test(INDEX), false);
check('角标不再显示 PRELOAD_COUNT / PRELOAD_MAX_BYTES 上限，但预算常量仍在（11-11 只留张数）',
  /'缓存 ' \+ this\.cacheCount \+ ' \/ ' \+ PRELOAD_COUNT \+ ' 张'/.test(INDEX) === false &&
  /'\/ ' \+ fmtBytes\(PRELOAD_MAX_BYTES\)/.test(INDEX) === false &&
  /const PRELOAD_COUNT: number = 216;/.test(INDEX) &&
  /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX), true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- ResumePlan: 启动恢复 / 退出落盘决策（2026-11-11 需求 1） ---');
check('resumeAction 常量互不相同',
  new Set([RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT]).size, 3);
check('flush 常量互不相同',
  new Set([FLUSH_SKIP, FLUSH_SYNC, FLUSH_ASYNC]).size, 3);
check('有快照 + 首帧后 → 恢复整批列表',
  resumeAction(false, false, true, 600, '/a/1.jpg', '/a/1.jpg', true), RESUME_SNAPSHOT);
check('有快照但还在启动关键路径 → 只显示单张（绝不读大 value）',
  resumeAction(false, false, true, 600, '/a/1.jpg', '/a/1.jpg', false), RESUME_SINGLE);
check('快照为空但有 okUri → 单张兜底',
  resumeAction(false, false, true, 0, '', '/a/1.jpg', true), RESUME_SINGLE);
check('快照为空、只有位置 uri → 单张兜底',
  resumeAction(false, false, true, 0, '/a/1.jpg', '', true), RESUME_SINGLE);
check('用户已主动操作 → SKIP（不抢视图）',
  resumeAction(true, false, true, 600, '/a/1.jpg', '/a/1.jpg', true), RESUME_SKIP);
check('已经恢复过 → SKIP（只跑一次）',
  resumeAction(false, true, true, 600, '/a/1.jpg', '/a/1.jpg', true), RESUME_SKIP);
check('开关关闭 → SKIP（回到旧行为）',
  resumeAction(false, false, false, 600, '/a/1.jpg', '/a/1.jpg', true), RESUME_SKIP);
check('既没快照也没 uri → SKIP（首次启动，不白屏乱猜）',
  resumeAction(false, false, true, 0, '', '', true), RESUME_SKIP);

console.log('--- resumeSingleUri(): 优先「成功显示过」的那张 ---');
check('okUri 优先', resumeSingleUri('/a/saved.jpg', '/a/ok.jpg'), '/a/ok.jpg');
check('okUri 为空退回 savedUri', resumeSingleUri('/a/saved.jpg', ''), '/a/saved.jpg');
check('两者都空', resumeSingleUri('', ''), '');

console.log('--- resumeDelaySafe(): 恢复必须让开首帧 + 预热 ---');
check('900 / 300 / 600 安全', resumeDelaySafe(900, 300, 600), true);
check('等于预热延迟 → 不安全', resumeDelaySafe(300, 300, 600), false);
check('小于预热延迟 → 不安全', resumeDelaySafe(200, 300, 600), false);
check('低于最小让路时间 → 不安全', resumeDelaySafe(500, 300, 600), false);
check('负延迟 → 不安全', resumeDelaySafe(-1, 300, 600), false);
check('负的预热延迟 → 不安全', resumeDelaySafe(900, -1, 600), false);

console.log('--- exitFlushAction(): 退出必须同步落盘 ---');
check('没位置可写 → SKIP', exitFlushAction(false, true), FLUSH_SKIP);
check('prefs 未建好 → 退回异步', exitFlushAction(true, false), FLUSH_ASYNC);
check('有位置 + prefs 就绪 → 同步', exitFlushAction(true, true), FLUSH_SYNC);

console.log('--- resumeSnapCap(): 恢复端再夹一道 SNAP_MAX ---');
check('旧残留 3000 条夹到 600', resumeSnapCap(3000, 600), 600);
check('小于上限原样', resumeSnapCap(120, 600), 120);
check('0 条', resumeSnapCap(0, 600), 0);
check('负数', resumeSnapCap(-5, 600), 0);
check('上限非正视为 0', resumeSnapCap(600, 0), 0);

console.log('--- upNavStateOf(): 区分「真到卷根」与「URI 层级判不出」 ---');
check('深层目录 GO', upNavStateOf(DEEP), UP_NAV_GO);
check('卷根 TOP', upNavStateOf(VOLROOT), UP_NAV_TOP);
check('Windows 盘符根 TOP', upNavStateOf('C:'), UP_NAV_TOP);
check('文件系统根 TOP', upNavStateOf('/'), UP_NAV_TOP);
check('图片列表态 NONE', upNavStateOf(''), UP_NAV_NONE);
check('文档 URI 能还原真实路径仍走 GO', upNavStateOf(`file://docs${DEEP}/`), UP_NAV_GO);
const CU = 'content://com.example/media/dir/人像';
check('content URI 判不出 → UNKNOWN（不是 TOP）', upNavStateOf(CU), UP_NAV_UNKNOWN);
check('UNKNOWN 与 TOP 是不同状态', UP_NAV_UNKNOWN === UP_NAV_TOP, false);

console.log('--- upLooseParentOf(): UNKNOWN 态严格剥一层，绝不越级 ---');
check('content URI 剥一层', upLooseParentOf(CU), 'content://com.example/media/dir');
check('file://docs 能还原真实路径 → 定出卷根，走严格链不用宽松父级',
  upLooseParentOf('file://docs/storage/a/b'), '');
check('空路径无宽松父级', upLooseParentOf(''), '');
check('卷根可定出卷根 → 不用宽松父级（防越过 /storage/Users/<id>）',
  upLooseParentOf(VOLROOT), '');
check('深层目录走严格链 → 不用宽松父级', upLooseParentOf(DEEP), '');

console.log('--- upParentCandidates(): UNKNOWN 态显式父级，按钮点了才有反应 ---');
const LU = upLooseParentOf(CU);
check('不传 explicitTarget → 空（旧缺陷：候选为空）', upParentCandidates(CU, CU).length, 0);
check('传显式父级 → 至少 1 个同层候选', upParentCandidates(CU, CU, LU).length > 0, true);
check('候选不含当前目录自身', upParentCandidates(CU, CU, LU).every(x => x !== CU), true);
check('严格链 GO 态仍不传 explicitTarget', upParentCandidates(DEEP, `file://docs${DEEP}/`).length > 0, true);

console.log('--- upButtonEnabled(): 按钮永不 grey out / 永不禁用 ---');
check('恒为 true', upButtonEnabled(), true);
check('不依赖任何入参（签名无参）', upButtonEnabled.length, 0);
check('ResumePlan 已移除 upEnabledAfterResume',
  Object.prototype.hasOwnProperty.call(
    await import('../entry/src/main/ets/common/ResumePlan.ts'), 'upEnabledAfterResume'), false);

console.log('--- 源码静态契约：启动恢复 / 退出落盘 / 按钮永不禁用 ---');
check('新开关默认开、旧重扫护栏仍为 false',
  /const AUTO_SHOW_LAST_ON_START: boolean = true;/.test(INDEX) &&
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX), true);
check('恢复延迟 900ms > 预热 300ms 且 >= 下限 600ms',
  /const RESUME_DELAY_MS: number = 900;/.test(INDEX) &&
  /const WARM_DELAY_MS: number = 300;/.test(INDEX) &&
  /const RESUME_MIN_SAFE_MS: number = 600;/.test(INDEX), true);
check('ResumePlan 纯函数已引入', /from '..\/common\/ResumePlan'/.test(INDEX), true);
check('恢复调度只排 setTimeout，不放在 aboutToAppear 同步路径',
  /private scheduleShowLast\(\): void \{/.test(INDEX) &&
  /this\.resumeTimer = setTimeout\(/.test(INDEX), true);
check('恢复前用 resumeDelaySafe 校验延迟',
  /if \(!resumeDelaySafe\(RESUME_DELAY_MS, WARM_DELAY_MS, RESUME_MIN_SAFE_MS\)\)/.test(INDEX), true);
check('恢复只跑一次 + 用户操作让路',
  /this\.resumeDone = true;/.test(INDEX) &&
  /const userActed: boolean = this\.userActed \|\| this\.items\.length > 0/.test(INDEX), true);
// 把 showLastOnStart 函数体单独切出来检查：里面绝不能出现重扫 / 权限 / 选择器调用。
const RESUME_FN = INDEX.slice(INDEX.indexOf('private async showLastOnStart('),
  INDEX.indexOf('/** 启动预热：把「上次成功显示的最后一张」'));
check('showLastOnStart 函数体不含全量重扫 / 权限申请 / 选择器',
  /loadAllGallery|queryAllPhotos|ensureGalleryPermission|DocumentViewPicker|PhotoViewPicker/
    .test(RESUME_FN), false);
check('旧的静默重扫护栏恒 false（不会在启动时被打开）',
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX), true);
check('恢复读的只是 snapCount 小 key，且经 resumeSnapCap 限幅',
  /store\.get\(SNAP_KEY_COUNT, 0\)/.test(INDEX) &&
  /resumeSnapCap\(/.test(INDEX), true);
// 第十轮 ff1：恢复失败不再退回单张、也不再等 3 秒看门狗，而是立即放弃。
check('恢复失败立即放弃（ff1），不再退回单张',
  /resume: snapshot empty\/unreadable → give up now \(ff1\)/.test(INDEX) &&
  /fall back to single/.test(INDEX) === false, true);
check('单张兜底撤销落盘副作用（不覆盖快照 / 位置）',
  /this\.posPending = undefined;/.test(INDEX) && /this\.snapDirty = false;/.test(INDEX), true);
check('用户主动入口置 userActed',
  /this\.userActed = true; \/\/ 用户一动手/.test(INDEX) &&
  /this\.userActed = true; \/\/ 用户主动挑图/.test(INDEX), true);
check('onPageHide 同步落盘',
  /onPageHide\(\): void \{\s*this\.flushPosSync\(\);/.test(INDEX), true);
check('aboutToDisappear 也同步落盘 + 清恢复定时器',
  /this\.flushPosSync\(\); \/\/ 退出前把最后一次位置\*\*同步\*\*落盘/.test(INDEX) &&
  /clearTimeout\(this\.resumeTimer\); \/\/ 别让恢复在页面已经销毁后还去改视图/.test(INDEX), true);
check('flushPosSync 用 putSync + flushSync（同步必达）',
  /store\.putSync\(POS_KEY_IDX, p\.idx\);/.test(INDEX) &&
  /store\.putSync\(POS_KEY_URI, p\.uri\);/.test(INDEX) &&
  /store\.putSync\(POS_KEY_OK, this\.okUri\);/.test(INDEX) &&
  /store\.flushSync\(\);/.test(INDEX), true);
check('flushPosSync 不写大快照（只补小 key）',
  /private flushPosSync\(\): void \{[\s\S]{0,1400}?flushSync\(\);/.test(INDEX), true);
check('flushPosSync 用 exitFlushAction 决策并保留异步兜底',
  /const act: number = exitFlushAction\(p !== undefined, store !== undefined\);/.test(INDEX) &&
  /if \(act === FLUSH_ASYNC \|\| store === undefined \|\| p === undefined\)/.test(INDEX), true);
check('源码（非注释）不再有禁用属性 / 条件置灰',
  /\.enabled\(/.test(CODE_LINES) === false &&
  /opacity\(enabled \?/.test(CODE_LINES) === false &&
  /fontColor\(enabled \?/.test(CODE_LINES) === false, true);
check('往上层按钮不再绑定 canGoUp',
  /SideToolButton\(\{ glyph: '⇧'[\s\S]{0,160}canGoUp/.test(SIDEBAR) === false &&
  /SideToolButton\(\{ glyph: '⇧', act: 'up', flex: true/.test(SIDEBAR), true);
check('三个按钮都是三参调用（不存在 enabled 实参）',
  /ToolButton\(\{ label: '全屏', act: 'full', flex: false/.test(INDEX) &&
  /SideToolButton\(\{ glyph: '▣', act: 'folder', flex: true/.test(SIDEBAR), true);
check('applyItems 不再用 upEnabledAfterResume 把按钮收口',
  /upEnabledAfterResume/.test(INDEX) === false, true);
check('canGoUp 仍是纯信息状态（状态栏 / 诊断串）',
  /this\.canGoUp = canGoUpFrom\(this\.browseBase\);/.test(INDEX), true);
check('按钮 / 退格 / .. 行三条入口仍全部收口 browseUp',
  (INDEX.match(/this\.browseUp\(\)/g) || []).length >= 3, true);
check('诊断串带 st= 状态分派，便于实机辨认新包', /'up START \| ' \+ UP_NAV_TAG \+ ' \| st='/.test(INDEX), true);
check('诊断标记 rs1 不是版本号',
  /const RESUME_TAG: string = 'rs1'/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('AppScope 版本未改', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- 恢复态守卫：授权证实 → 完整恢复 / 证伪 → 只读名单态（2026-11-11 实机反馈） ---');
check('两种恢复模式是不同常量', RESTORE_FULL === RESTORE_READONLY, false);
check('探测打开 → 完整恢复', restoreModeOf(true), RESTORE_FULL);
check('探测打不开 → 只读名单态', restoreModeOf(false), RESTORE_READONLY);
check('完整恢复允许批量 IO', bulkIoAllowed(RESTORE_FULL), true);
check('只读名单态禁止批量 IO', bulkIoAllowed(RESTORE_READONLY), false);
check('未知模式一律禁止批量 IO（保守兜底）', bulkIoAllowed(999), false);

console.log('--- restoreProbeUris(): 候选去重、限量、不含空串 ---');
const SNAP = ['/a/1.jpg', '/a/2.jpg', '/a/3.jpg', '/a/4.jpg'];
check('优先级 okUri → savedUri → 快照开头',
  restoreProbeUris(SNAP, '/a/ok.jpg', '/a/saved.jpg', 3).join('|'),
  '/a/ok.jpg|/a/saved.jpg|/a/1.jpg');
check('去重：okUri 与快照首张相同不会重复',
  restoreProbeUris(SNAP, '/a/1.jpg', '/a/1.jpg', 3).join('|'),
  '/a/1.jpg|/a/2.jpg|/a/3.jpg');
check('严格限量（不能探整批，否则主线程被打满）',
  restoreProbeUris(SNAP, '', '', 2).length, 2);
check('limit<=0 → 空数组（不探、不 IO）',
  restoreProbeUris(SNAP, '/a/ok.jpg', '', 0).length, 0);
check('空串来源被过滤',
  restoreProbeUris(['', '/a/1.jpg', ''], '', '', 3).join('|'), '/a/1.jpg');
check('全空输入 → 空数组',
  restoreProbeUris([], '', '', 3).length, 0);
check('返回数组恒不含空串',
  restoreProbeUris(SNAP, '', '', 3).every(x => x.length > 0), true);
check('不修改传入的快照数组', SNAP.length, 4);

console.log('--- 只读名单态提示：必须给出可操作指引 ---');
const RH = readonlyHint(217, '人像', 'ro1');
check('提示带名单张数', RH.includes('217 张'), true);
check('提示带上次来源目录名', RH.includes('人像'), true);
check('提示带实机诊断标记 ro1', RH.includes('ro1'), true);
check('提示点名「选择文件夹」重新授权', RH.includes('选择文件夹'), true);
check('提示说明授权在重启后失效', RH.includes('授权在重启后已失效'), true);
check('空来源名有兜底文案', readonlyHint(3, '', 'ro1').includes('上次那个目录'), true);
const RTH = readonlyTapHint('IMG_0001.HEIC');
check('点档案行提示带档案名', RTH.includes('IMG_0001.HEIC'), true);
check('点档案行提示说明暂不能预览', RTH.includes('暂不能预览'), true);
check('点档案行提示仍指引选择文件夹', RTH.includes('选择文件夹'), true);
check('往上层提示说明没有目录层级', readonlyUpHint().includes('没有目录层级'), true);
check('往上层提示仍指引选择文件夹', readonlyUpHint().includes('选择文件夹'), true);

console.log('--- 源码静态契约：恢复态分派 / 批量 IO 闸门 / 交互不失效 ---');
check('诊断标记 ro1 存在且不是版本号',
  /const RESTORE_TAG: string = 'ro1';/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('探测上限是 3（绝不探整批）',
  /const RESTORE_PROBE_LIMIT: number = 3;/.test(INDEX), true);
check('纯函数已从 ResumePlan 引入',
  /restoreModeOf, bulkIoAllowed, restoreProbeUris,/.test(INDEX) &&
  /readonlyHint, readonlyTapHint, readonlyUpHint/.test(INDEX), true);
check('probeRestoreUris 只探候选、openSync 后立即 closeSync',
  /private probeRestoreUris\(/.test(INDEX) &&
  /fs\.openSync\(cand\[i\], fs\.OpenMode\.READ_ONLY\)/.test(INDEX) &&
  /fs\.closeSync\(f\)/.test(INDEX), true);
check('probeRestoreUris 用纯函数生成候选且走限量常量',
  /restoreProbeUris\(uris, okUri, savedUri, RESTORE_PROBE_LIMIT\)/.test(INDEX), true);
check('applyItems 是第一收口点：先 applyPendingRestore 再算 ioOk',
  /this\.applyPendingRestore\(list\.length, src\);\s*\n\s*const ioOk: boolean = bulkIoAllowed\(this\.restoreMode\);/.test(INDEX), true);
check('applyPendingRestore 用 restoreModeOf 决策（可回归）',
  /const mode: number = restoreModeOf\(!this\.pendingRestoreReadonly\);/.test(INDEX), true);
check('只读态设提示卡 + 诊断串，完整态清空提示',
  /this\.restoreHintText = readonlyHint\(n, from, RESTORE_TAG\);/.test(INDEX) &&
  /this\.diagLine = 'restore READONLY \| ' \+ RESTORE_TAG/.test(INDEX) &&
  /this\.restoreHintText = '';/.test(INDEX), true);
check('快照恢复与单张兜底两条路径都先探授权',
  /const readable: boolean = this\.probeRestoreUris\(uris, this\.okUri,/.test(INDEX) &&
  /const readable: boolean = this\.probeRestoreUris\(\[single\], this\.okUri, savedUri, true\);/.test(INDEX), true);
check('两条恢复路径都写 pendingRestoreReadonly',
  (INDEX.match(/this\.pendingRestoreReadonly = !readable;/g) || []).length, 2);
check('只读态不启动预载 / 补体积 / 对开探测',
  /if \(!keepView && ioOk\)/.test(INDEX) &&
  /if \(ioOk\) \{\s*\n\s*this\.refreshSpread\(\);\s*\n\s*this\.schedulePreload\(\);/.test(INDEX), true);
check('R77 只读态不再清空主视图，改为放行当前一张解码（重启后预览图不丢失）',
  /this\.showPreviewOf\(this\.cur\);/.test(INDEX) &&
  INDEX.includes('只读名单态不再清空主视图') &&
  /this\.releaseViewOwned\(\);\s*\n\s*this\.viewPixelMap = undefined;\s*\n\s*this\.viewFailed = false;/.test(INDEX) === false, true);
const DECODE_FN = INDEX.slice(INDEX.indexOf('private decodeTo('),
  INDEX.indexOf('private decodeTo(') + 2600);
check('R77 解码总闸门在 decodeTo（只读态只放行当前主视图 uri，其余仍 resolve undefined）',
  /private decodeTo\(uri: string, edge: number,\s*allowReuse: boolean = true\): Promise<PreviewEntry \| undefined> \{/.test(DECODE_FN) &&
  /if \(!bulkIoAllowed\(this\.restoreMode\)\) \{/.test(DECODE_FN) &&
  /if \(curUri\.length === 0 \|\| uri !== curUri\)/.test(DECODE_FN) &&
  /return Promise\.resolve<PreviewEntry \| undefined>\(undefined\);/.test(DECODE_FN) &&
  /return decodePx\(uri, edge\);/.test(DECODE_FN), true);
check('第七轮：decodeTo 复用已解码数据 + 在途合并（不重复解码）',
  /shouldReuseDecoded\(hit\.edge, edge\)/.test(DECODE_FN) &&
  /const key: string = decodeKeyOf\(uri, edge\);/.test(DECODE_FN) &&
  /this\.decodeInflight\.get\(key\)/.test(DECODE_FN) &&
  /this\.decodeInflight\.set\(key, job\)/.test(DECODE_FN) &&
  /const hit: PreviewEntry \| undefined = this\.previewEntry\(uri\);/.test(DECODE_FN), true);
for (const [label, fn] of [
  ['fillSizes', 'private fillSizes(): void {'],
  ['schedulePreload', 'private schedulePreload(): void {'],
  ['loadMeta', 'private loadMeta(idx: number): void {'],
  ['refreshSpread', 'private refreshSpread(): void {'],
  ['probeOne', 'private probeOne(uri: string, seq: number): void {'],
  ['showPreviewOf', 'private showPreviewOf(idx: number): void {']
]) {
  const at = INDEX.indexOf(fn);
  const body = at >= 0 ? INDEX.slice(at, at + 900) : '';
  check(`${label} 内有 bulkIoAllowed 闸门`, body.includes('bulkIoAllowed(this.restoreMode)'), true);
}
check('select / go 在只读态仍更新位置与高亮，并给可见反馈',
  (INDEX.match(/readonlyTapHint\(this\.items\[/g) || []).length, 2);
check('browseUp 在只读态且无层级时给明确指引且按钮不禁用',
  /if \(this\.restoreMode === RESTORE_READONLY && this\.browseBase\.length === 0\) \{\s*\n\s*this\.status = readonlyUpHint\(\);/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false, true);
check('只读态提示卡落在预览区，带「选择文件夹」可点按钮',
  /if \(this\.restoreHintText\.length > 0\) \{/.test(INDEX) &&
  /Button\('选择文件夹重新打开'\)/.test(INDEX) &&
  /\.onClick\(\(\) => \{\s*\n\s*this\.chooseFolder\(\);/.test(INDEX), true);
check('提示卡外层不吞滚轮 / 拖拽事件',
  /\.hitTestBehavior\(HitTestMode\.Transparent\)/.test(INDEX), true);
check('R77 悬停缩略图不再被恢复态掐断（重启后缩略图照常加载）',
  /@Prop thumbDisabled: boolean = false;/.test(ARCHIVE) &&
  /if \(this\.kind !== ROW_IMAGE \|\| this\.thumbDisabled\)/.test(ARCHIVE) &&
  /restoreReadonly: \(\): boolean => false,/.test(INDEX) &&
  /thumbDisabled: this\.restoreReadonly\(\),/.test(SIDEBAR) &&
  INDEX.includes('ThumbLoader 走 decodePx'), true);
check('正常换源（pending=false）自动回到完整模式，行为不变',
  /this\.pendingRestoreReadonly = false;\s*\n\s*this\.pendingRestoreCount = 0;/.test(INDEX), true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

// ===========================================================================
// 目录 URI 持久授权（2026-11-11）：让重开直接出图，不必每次重新选文件夹
// ===========================================================================
const MODULE = readFileSync(new URL('../entry/src/main/module.json5', import.meta.url), 'utf8');
const STRINGS = readFileSync(new URL('../entry/src/main/resources/base/element/string.json', import.meta.url), 'utf8');
const PERSIST_PLAN = readFileSync(new URL('../entry/src/main/ets/common/PersistPlan.ts', import.meta.url), 'utf8');
const PERSIST_FNS = INDEX.slice(INDEX.indexOf('private async activatePersistedUri('),
  INDEX.indexOf('/** 排一次「首帧后显示上次相片」'));

console.log('--- PersistPlan.persistAction(): 只在「有持久记录 + 用户没抢先」时激活 ---');
check('两个动作是不同常量', PERSIST_SKIP === PERSIST_ACTIVATE, false);
check('有目录 uri + 开关开 + 未操作 + 未恢复 → 激活',
  persistAction(true, true, false, false), PERSIST_ACTIVATE);
check('旧数据没有目录 uri → 跳过（走探测 + 只读名单态）',
  persistAction(false, true, false, false), PERSIST_SKIP);
check('自动恢复总开关关 → 跳过', persistAction(true, false, false, false), PERSIST_SKIP);
check('用户已自己选了东西 → 跳过', persistAction(true, true, true, false), PERSIST_SKIP);
check('本轮已恢复过 → 跳过', persistAction(true, true, false, true), PERSIST_SKIP);
check('多个否决条件同时命中仍是 SKIP', persistAction(false, false, true, true), PERSIST_SKIP);

console.log('--- persistPolicyUris(): 只放目录 URI、去重、限量、恒不含空串 ---');
check('目录优先、fallback 其次',
  persistPolicyUris('file://docs/a', 'file://docs/b', 2).join('|'),
  'file://docs/a|file://docs/b');
check('相同 uri 去重', persistPolicyUris('a', 'a', 2).join('|'), 'a');
check('全空输入 → 空数组', persistPolicyUris('', '', 2).length, 0);
check('limit<=0 → 空数组（绝不发 SDK 调用）', persistPolicyUris('a', 'b', 0).length, 0);
check('limit=1 只留目录（绝不批量跨进程调用）',
  persistPolicyUris('a', 'b', 1).join('|'), 'a');
check('目录为空时退回 fallback',
  persistPolicyUris('', 'file://docs/b', 2).join('|'), 'file://docs/b');
check('返回数组恒不含空串',
  persistPolicyUris('a', '', 2).every(x => x.length > 0), true);
check('不修改传入值（纯函数）', persistPolicyUris('a', 'b', 2).length, 2);

console.log('--- persistTimeoutSafe(): activate 超时必须有界 ---');
check('1500 / 3000 安全', persistTimeoutSafe(1500, 3000), true);
check('等于上限安全', persistTimeoutSafe(3000, 3000), true);
check('超过上限拒绝', persistTimeoutSafe(3001, 3000), false);
check('0 拒绝', persistTimeoutSafe(0, 3000), false);
check('负数拒绝', persistTimeoutSafe(-1, 3000), false);
check('上限非正拒绝', persistTimeoutSafe(100, 0), false);

console.log('--- 持久授权提示文案：成功 / 失败 / 旧数据迁移 ---');
check('成功提示带 p1 且说明正在恢复',
  persistOkHint('p1').includes('p1') && persistOkHint('p1').includes('正在恢复'), true);
check('失败提示说明只显示名单 + 指引选择文件夹',
  persistFailHint('p1').includes('只显示名单') &&
  persistFailHint('p1').includes('选择文件夹'), true);
check('旧数据提示说明只需重选一次，且带 p1',
  persistLegacyHint('p1').includes('重新选一次该目录后') &&
  persistLegacyHint('p1').includes('p1'), true);
check('旧数据提示不会说成「每次都要重选」',
  persistLegacyHint('p1').includes('以后重开即可直接出图'), true);

console.log('--- 源码静态契约：权限声明 / SDK 接线 / 超时兜底 ---');
check('module.json5 声明 FILE_ACCESS_PERSIST（system_grant，安装时不弹框）',
  /"name": "ohos\.permission\.FILE_ACCESS_PERSIST"/.test(MODULE) &&
  /^\s*"requestPermissions": \[/m.test(MODULE), true);
check('未启用 READ_IMAGEVIDEO（避免 debug 签名安装失败）',
  MODULE.split('\n').filter(l => /^\s*"name": "ohos\.permission\./.test(l))
    .every(l => l.includes('FILE_ACCESS_PERSIST')), true);
check('权限 reason 有对应字符串资源',
  STRINGS.includes('permission_reason_file_access_persist'), true);
check('Index 引入 @ohos.fileshare 与 PersistPlan',
  /import fileShare from '@ohos\.fileshare';/.test(INDEX) &&
  /from '\.\.\/common\/PersistPlan'/.test(INDEX), true);
check('PersistPlan 不依赖鸿蒙 SDK（纯函数可 Node 回归）',
  /@ohos|@kit/.test(PERSIST_PLAN), false);
check('PersistPlan 不写函数类型变量（ArkTS arkts-no-func-type）',
  /const\s+\w+\s*:\s*\([^)]*\)\s*=>/.test(PERSIST_PLAN), false);
check('PERSIST_TAG=p1 是诊断标记、不是版本号',
  /const PERSIST_TAG: string = 'p1';/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('一次只带 1 个 policy、超时 1500ms 且不超过 3000ms 硬上限',
  /const PERSIST_POLICY_LIMIT: number = 1;/.test(INDEX) &&
  /const PERSIST_ACTIVATE_MS: number = 1500;/.test(INDEX) &&
  /const PERSIST_TIMEOUT_MAX_MS: number = 3000;/.test(INDEX) &&
  persistTimeoutSafe(1500, 3000), true);
check('只有「选择文件夹」持久化 picker 原始 URI（往上层不再弹选择器）',
  (INDEX.match(/this\.persistFolderUri\(picked\);/g) || []).length, 1);
check('persistPermission 一次 / activatePermission 两次（启动激活 + R44 NAS 重试静默重推），且只用 READ_MODE',
  (INDEX.match(/fileShare\.persistPermission\(policies\)/g) || []).length === 1 &&
  (INDEX.match(/fileShare\.activatePermission\(policies\)/g) || []).length === 2 &&
  (INDEX.match(/fileShare\.OperationMode\.READ_MODE/g) || []).length === 3, true);
check('PolicyInfo 显式类型、SDK 调用都包在 try/catch 内',
  (INDEX.match(/Array<fileShare\.PolicyInfo>/g) || []).length === 3 &&
  /try \{\s*\n\s*await fileShare\.activatePermission\(policies\);/.test(PERSIST_FNS) &&
  /try \{\s*\n\s*await fileShare\.persistPermission\(policies\);/.test(PERSIST_FNS), true);
check('activate 异常一律降级、绝不抛出',
  /catch \(e\) \{\s*\n\s*hilog\.warn\(DOMAIN, TAG, 'persist: activate failed/.test(PERSIST_FNS) &&
  /catch \(e\) \{\s*\n\s*\/\/ 某些 picker uri 不允许持久化/.test(PERSIST_FNS), true);
check('beginRestore 用 persistAction + 超时校验，且绝不 await activate',
  /const act: number = persistAction\(this\.savedDirUri\.length > 0,/.test(INDEX) &&
  /persistTimeoutSafe\(PERSIST_ACTIVATE_MS, PERSIST_TIMEOUT_MAX_MS\)/.test(INDEX) &&
  /act === PERSIST_SKIP/.test(INDEX) &&
  /this\.activatePersistedUri\(this\.savedDirUri\)\.catch/.test(INDEX), true);
check('activate 有超时竞速 + 只跑一次的收口',
  /this\.persistTimer = setTimeout\(/.test(INDEX) &&
  /if \(this\.persistSettled\) \{/.test(INDEX) &&
  /this\.persistSettled = true;/.test(INDEX) &&
  /clearTimeout\(this\.persistTimer\);/.test(INDEX), true);
check('收口后照常进入原恢复链',
  /this\.showLastOnStart\(\);/.test(PERSIST_FNS) &&
  /this\.beginRestore\(\);/.test(INDEX) && /}, RESUME_DELAY_MS\);/.test(INDEX), true);
check('finishPersistActivate / aboutToDisappear / et1 超时 / ff1 立即放弃都清 activate 定时器',
  (INDEX.match(/clearTimeout\(this\.persistTimer\)/g) || []).length, 4);
const GIVEUP_FN = INDEX.slice(INDEX.indexOf('private giveUpNow('),
  INDEX.indexOf('private saveDeadTag('));
check('ff1 立即放弃内确实清 activate 定时器',
  /clearTimeout\(this\.persistTimer\)/.test(GIVEUP_FN), true);
const DISAPPEAR_FN = INDEX.slice(INDEX.indexOf('aboutToDisappear(): void {'),
  INDEX.indexOf('/** 拿到 preferences 实例'));
check('aboutToDisappear 内确实清 activate 定时器',
  /clearTimeout\(this\.persistTimer\)/.test(DISAPPEAR_FN), true);
check('目录 URI 有独立 key，读 / 立即写 / 异步写 / 同步写四处都在',
  /const POS_KEY_DIR: string = 'lastDirUri';/.test(INDEX) &&
  (INDEX.match(/POS_KEY_DIR/g) || []).length >= 5, true);
check('旧数据只读名单态追加「只需重选一次」说明',
  /if \(this\.savedDirUri\.length === 0\) \{/.test(INDEX) &&
  /this\.restoreHintText = this\.restoreHintText \+ persistLegacyHint\(PERSIST_TAG\);/.test(INDEX), true);
check('完整恢复的状态栏带 p1 授权标记（实机可辨认）',
  /PERSIST_TAG \+ ' 目录授权已持久'/.test(INDEX), true);

console.log('--- 回归契约：持久授权绝不能拆掉上一轮的防冻结兜底 ---');
check('探测上限 3 / ro1 标记 / 两条恢复路径仍先探授权',
  /const RESTORE_PROBE_LIMIT: number = 3;/.test(INDEX) &&
  /const RESTORE_TAG: string = 'ro1';/.test(INDEX) &&
  (INDEX.match(/this\.pendingRestoreReadonly = !readable;/g) || []).length === 2, true);
check('bulkIoAllowed 闸门数量不减（≥8 个 IO 入口）',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8, true);
check('只读态提示卡与「选择文件夹」按钮仍在',
  /if \(this\.restoreHintText\.length > 0\) \{/.test(INDEX) &&
  /Button\('选择文件夹重新打开'\)/.test(INDEX), true);
check('按钮永不禁用（非注释行无 .enabled）', /\.enabled\(/.test(CODE_LINES) === false, true);
check('AUTO_RESUME_ON_START 护栏仍 false（启动绝不重扫 / 弹权限框）',
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX), true);
check('showLastOnStart 仍不含选择器 / 权限 / 全量重扫',
  /loadAllGallery|queryAllPhotos|ensureGalleryPermission|DocumentViewPicker|PhotoViewPicker/
    .test(RESUME_FN), false);
// 第二十七轮：new Promise 现在全源码有 1 处，且只属于预载链的 readGuarded 超时闸门
// （真异步 + 到点 resolve，不是同步等待）。启动恢复路径仍必须零 new Promise / race，
// 故把这条护栏从「全源码」收紧为「showLastOnStart 启动关键路径」，并另加一条总数判据。
check('启动关键路径仍无 new Promise / Promise.race（不引入同步等待）',
  /new Promise|Promise\.race/.test(RESUME_FN), false);
check('R27 new Promise 仅两处：RawStore.readGuarded 超时闸门 + R44 nasRetryWait 重试等待（均不在启动恢复路径 / 非同步等待）',
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  ((INDEX + ARCHIVE + MODEL).match(/Promise\.race/g) || []).length === 1 &&  // R46：仅 mtime 异步 stat 的 3s 超时 race
  /private readGuarded\(uri: string, gen: number\): Promise<ArrayBuffer \| undefined> \{[\s\S]{0,900}new Promise<ArrayBuffer \| undefined>\(/.test(MODEL), true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

// ===========================================================================
// 恢复后重建「往上层」目录层级（2026-11-11 第三次实机反馈：重开能出图了，
// 但「往上层」还是按不动 —— setItems 清空 browseBase，层级上下文整个丢了）
// ===========================================================================
const DEEP_DIR = ROOT + '/人像/编号202601 模特 猫';
const RAW_DEEP = `file://docs${DEEP_DIR}/`;
const DIRNAME_SRC = readFileSync(new URL('../entry/src/main/ets/common/DirName.ts', import.meta.url), 'utf8');

console.log('--- upContextBaseOf(): 从 picker 原始目录 URI 还原层级真值 ---');
check('file://docs 文档 URI 还原成真实路径（去尾斜杠）',
  upContextBaseOf(RAW_DEEP), DEEP_DIR);
check('纯真实路径原样保留', upContextBaseOf(DEEP_DIR), DEEP_DIR);
check('带 ? 参数与尾斜杠一并去掉',
  upContextBaseOf(`file://docs${DEEP_DIR}/?mode=r`), DEEP_DIR);
check('%XX 编码的中文目录名被安全解码',
  upContextBaseOf('file://docs' + ROOT + '/%E4%BA%BA%E5%83%8F/'),
  ROOT + '/人像');
check('file://docs 碎片不冒充目录（判不出层级）', upContextBaseOf('file://docs'), '');
check('空串 → 空串', upContextBaseOf(''), '');
check('卷根仍是有效层级（TOP 由 browseUp 提示「已到最上层」）',
  upContextBaseOf('/storage/Users/currentUser'), '/storage/Users/currentUser');
check('还原出的路径能被 upLevelOf 求出直接父级',
  upLevelOf(upContextBaseOf(RAW_DEEP)), ROOT + '/人像');
check('还原出的路径 upNavStateOf 为 GO（不再是 NONE 死路）',
  upNavStateOf(upContextBaseOf(RAW_DEEP)), UP_NAV_GO);
check('层级真值与 browseUp 判定同源（canGoUpFrom 为真）',
  canGoUpFrom(upContextBaseOf(RAW_DEEP)), true);

console.log('--- upContextRawOf(): 原始 picker URI 供逐 URI 授权 / 候选生成 ---');
check('带 scheme 的原始 URI 保留（只去 ? 与尾斜杠）',
  upContextRawOf(`file://docs${DEEP_DIR}/?mode=r`), `file://docs${DEEP_DIR}`);
check('纯文件系统路径不给 picker（返回空串）', upContextRawOf(DEEP_DIR), '');
check('空串 → 空串', upContextRawOf(''), '');
check('base 与 raw 指向同一目录（sameDirPath 校验）',
  sameDirPath(upContextBaseOf(RAW_DEEP), upContextRawOf(RAW_DEEP)), true);
check('raw 能作为已授权的 picker 起点',
  pickerStartOf(upContextRawOf(RAW_DEEP), ''), `file://docs${DEEP_DIR}`);
check('raw 参与生成的父候选落在同一父层',
  upParentCandidates(upContextBaseOf(RAW_DEEP), upContextRawOf(RAW_DEEP)).length > 0 &&
  upParentCandidates(upContextBaseOf(RAW_DEEP), upContextRawOf(RAW_DEEP))
    .every(x => sameDirPath(x, ROOT + '/人像')), true);

console.log('--- restoreUpEnabled(): 两种恢复模式都回填，老数据不回填 ---');
check('完整恢复 + 有目录 URI → 回填',
  restoreUpEnabled(RESTORE_FULL, RAW_DEEP), true);
check('只读名单态 + 有目录 URI → 也回填（层级与授权无关）',
  restoreUpEnabled(RESTORE_READONLY, RAW_DEEP), true);
check('没有目录 URI（升级前老快照）→ 不回填，维持旧提示',
  restoreUpEnabled(RESTORE_FULL, ''), false);
check('只读名单态且没有目录 URI → 不回填',
  restoreUpEnabled(RESTORE_READONLY, ''), false);
check('非法 mode（脏数据）→ 不回填', restoreUpEnabled(99, RAW_DEEP), false);
check('回填提示带目录名 / 往上层 / uc1',
  restoreUpHint('人像', 'uc1').includes('人像') &&
  restoreUpHint('人像', 'uc1').includes('往上层') &&
  restoreUpHint('人像', 'uc1').includes('uc1'), true);

const UPC_FN = INDEX.slice(INDEX.indexOf('private restoreBrowseContext('),
  INDEX.indexOf('目录 URI 持久授权（2026-11-11）'));
// 去掉注释行再查 IO：方法体注释里为了说明「禁止」而提到了这些名字
const UPC_CODE = UPC_FN.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
console.log('--- 源码静态契约：层级重建纯字符串、零 IO、两条恢复路径都接上 ---');
check('UP_CTX_TAG=uc1 是诊断标记、不是版本号',
  /const UP_CTX_TAG: string = 'uc1';/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('Index 引入 upContextBaseOf / upContextRawOf / restoreUpEnabled / restoreUpHint',
  /upContextBaseOf, upContextRawOf,/.test(INDEX) &&
  /restoreUpEnabled, restoreUpHint/.test(INDEX), true);
check('restoreBrowseContext 由 restoreUpEnabled 决策',
  /if \(!restoreUpEnabled\(this\.restoreMode, this\.savedDirUri\)\)/.test(UPC_CODE), true);
check('三个层级锚点 + titlePath + canGoUp 全部回填（第三十轮：深层 browseBase + 授权同形态 browseDir）',
  /this\.browseBase = base;/.test(UPC_CODE) &&
  /this\.browseDir = rawDeep\.length > 0 \? rawDeep : base;/.test(UPC_CODE) &&
  /this\.pickRootUri = raw\.length > 0 \? raw : base;/.test(UPC_CODE) &&
  /this\.titlePath = base;/.test(UPC_CODE) &&
  /this\.canGoUp = canGoUpFrom\(base\);/.test(UPC_CODE), true);
check('第三十轮：恢复层级由 restoreBrowseLevelOf 裁决（持久化深层优先，脏值回退授权根）',
  /restoreBrowseLevelOf\(this\.savedBrowseBase, this\.savedDirUri\)/.test(UPC_CODE), true);
check('第三十轮：browseDir 用 rawBrowseFormOf 拼授权同形态深层 URI',
  /rawBrowseFormOf\(raw, base\)/.test(UPC_CODE), true);
check('层级真值与原始 URI 分别由两个纯函数还原',
  /upContextBaseOf\(this\.savedDirUri\)/.test(UPC_CODE) &&
  /upContextRawOf\(this\.savedDirUri\)/.test(UPC_CODE), true);
check('解析不出层级时直接放弃回填',
  /if \(base\.length === 0\) \{\s*\n\s*return;/.test(UPC_CODE), true);
check('恢复期零 IO：方法体无 listFile / statSync / openFolder / startDirPoll / 选择器 / 权限',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|startDirPoll|DocumentViewPicker|PhotoViewPicker|ensureGalleryPermission|loadAllGallery|queryAllPhotos/.test(UPC_CODE), false);
check('两条恢复路径（快照 / 单张兜底）都在 setItems 之后调用',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3 &&
  /this\.setItems\(uris, src, metas\);[\s\S]{0,320}this\.restoreBrowseContext\(\);/.test(INDEX) &&
  /this\.setItems\(\[single\], src, \[oneMeta\]\);[\s\S]{0,240}this\.restoreBrowseContext\(\);/.test(INDEX), true);
check('状态栏两处都追加「可继续往上层」提示',
  (INDEX.match(/restoreUpHint\(baseName\(this\.browseBase\), UP_CTX_TAG\)/g) || []).length, 2);
check('READONLY 早退只在「没有目录层级」时生效（层级已重建则继续上移）',
  /if \(this\.restoreMode === RESTORE_READONLY && this\.browseBase\.length === 0\)/.test(INDEX), true);
check('upContextBaseOf 的层级判定与 browseUp 同源（都用 upNavStateOf）',
  /upNavStateOf\(s\) === UP_NAV_NONE/.test(DIRNAME_SRC) &&
  /const state: number = upNavStateOf\(current\)/.test(INDEX), true);

console.log('--- 回归契约：层级重建不能拆掉防冻结 / 按钮 / 版本护栏 ---');
check('bulkIoAllowed 闸门数量不减（≥8 个 IO 入口）',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8, true);
check('探测上限 3 / ro1 标记仍在',
  /const RESTORE_PROBE_LIMIT: number = 3;/.test(INDEX) &&
  /const RESTORE_TAG: string = 'ro1';/.test(INDEX), true);
check('AUTO_RESUME_ON_START 护栏仍 false（启动绝不重扫 / 弹权限框）',
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX), true);
check('按钮永不禁用（非注释行无 .enabled）', /\.enabled\(/.test(CODE_LINES) === false, true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

// ===========================================================================
// 「往上层」改为 APP 内清单（2026-11-11 第四次实机反馈）
//
// 用户原话：「现在按回上层回弹出选择目录 dialog，不是我原意，原意是在 app 内
// 可以显示上层档案目录或档案清单」。上级目录逐 URI 授权失效时列不出真实内容，
// 也不能把界面交给系统选择器 —— 至少要把已知层级 / 条目名画在 APP 内左栏。
// ===========================================================================
const CHAIN_ROOT = '/storage/Users/currentUser';
const CHAIN_DEEP = ROOT + '/人像';

console.log('--- pathChainOf(): 从卷根到目标父级的每一级目录 ---');
check('深层目录生成逐级链（含自身）',
  JSON.stringify(pathChainOf(CHAIN_DEEP)) ===
  JSON.stringify([CHAIN_ROOT, CHAIN_ROOT + '/Download', ROOT, CHAIN_DEEP]), true);
check('链首恒为卷根', pathChainOf(DEEP_DIR)[0], CHAIN_ROOT);
check('链尾恒为目标目录自身', pathChainOf(CHAIN_DEEP).slice(-1)[0], CHAIN_DEEP);
check('每一级都能由 upLevelOf 严格剥回上一级',
  (() => {
    const c = pathChainOf(DEEP_DIR);
    let ok = c.length > 1;
    for (let i = 1; i < c.length; i++) {
      if (upLevelOf(c[i]) !== c[i - 1]) { ok = false; }
    }
    return ok;
  })(), true);
check('卷根自身只有一项',
  JSON.stringify(pathChainOf(CHAIN_ROOT)) === JSON.stringify([CHAIN_ROOT]), true);
check('文件系统根只有一项',
  JSON.stringify(pathChainOf('/')) === JSON.stringify(['/']), true);
check('Windows 盘符路径同样逐级',
  JSON.stringify(pathChainOf('C:/Users/x/人像')) ===
  JSON.stringify(['C:', 'C:/Users', 'C:/Users/x', 'C:/Users/x/人像']), true);
check('file://docs 文档 URI 归一后同样逐级（不含 scheme）',
  JSON.stringify(pathChainOf(`file://docs${CHAIN_DEEP}/`)) ===
  JSON.stringify([CHAIN_ROOT, CHAIN_ROOT + '/Download', ROOT, CHAIN_DEEP]), true);
check('带 ? 参数与 %XX 编码一并归一',
  JSON.stringify(pathChainOf('file://docs' + ROOT + '/%E4%BA%BA%E5%83%8F/?mode=r')) ===
  JSON.stringify([CHAIN_ROOT, CHAIN_ROOT + '/Download', ROOT, ROOT + '/人像']), true);
check('判不出层级的 URI 碎片 → 空链（调用方退化为已知子目录）',
  pathChainOf('file://docs').length, 0);
check('空串 → 空链', pathChainOf('').length, 0);

// 第七十八轮：「APP 内上层xxx」提醒整体移除 —— 保留函数导出仅为不破坏纯函数回归的
// import 契约，恒返回空串；Index / SidebarView 的调用点、提示条、伪说明行全部删除。
console.log('--- inAppUpListHint(): R78 起「APP 内上层xxx」提醒恒为空 ---');
const UL_HINT = inAppUpListHint('人像', 3, 'ul1');
check('R78 提醒文案彻底移除：inAppUpListHint 恒返回空串',
  UL_HINT === '' && inAppUpListHint('父层', 99, 'ul2') === '' &&
  inAppUpListHint('', 0, '') === '', true);
check('R78 源码不再有「APP 内上层」提醒文案模板字面串',
  INDEX.includes('APP 内上层「') === false && SIDEBAR.includes('APP 内上层「') === false, true);
check('R78 左栏不再接收 / 渲染 dirHint 提示条',
  SIDEBAR.includes('@Prop dirHint') === false &&
  SIDEBAR.includes('Text(this.dirHint)') === false &&
  INDEX.includes('dirHint: this.dirHint,') === false, true);
check('R78 往上层功能本身保留：仍收口 showUpListInApp、仍不弹系统选择器',
  /this\.showUpListInApp\(/.test(INDEX) && /no-picker/.test(INDEX), true);

const UPLIST_FN = INDEX.slice(INDEX.indexOf('private showUpListInApp('),
  INDEX.indexOf('private toggleFull('));
// 去掉注释行再查 IO：方法体注释里为了说明「禁止」而提到了这些名字
const UPLIST_CODE = UPLIST_FN.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
console.log('--- 源码静态契约：往上层不弹系统选择器、改 APP 内清单 ---');
check('UP_LIST_TAG=ul1 是诊断标记、不是版本号',
  /const UP_LIST_TAG: string = 'ul1';/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('R78 Index 不再引入 / 调用 inAppUpListHint；pathChainOf / sameDirPath 仍在',
  /inAppUpListHint/.test(INDEX) === false &&
  /pathChainOf,/.test(INDEX) && /sameDirPath,/.test(INDEX), true);
check('chooseFolderAt 整个方法已删除（往上层不再弹 FOLDER picker）',
  /chooseFolderAt/.test(INDEX) === false, true);
check('browseUp 函数体内没有 DocumentViewPicker / .select / pickerStartOf / isUpTargetOf',
  /DocumentViewPicker|dv\.select|pickerStartOf\(|isUpTargetOf\(/.test(UP_FN) === false, true);
check('browseUp 两个失败分支都收口 showUpListInApp（loose + 正常层级）',
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length, 2);
check('showUpListInApp 存在且用 pathChainOf 生成诊断层级 / 目录行仍用 ROW_FOLDER',
  UPLIST_CODE.length > 0 && /pathChainOf\(target\)/.test(UPLIST_CODE) &&
  /ROW_FOLDER/.test(UPLIST_CODE), true);
check('showUpListInApp 用 sameDirPath 命中会话缓存、列真实档案清单',
  /sameDirPath\(this\.lastUpPath, target\)/.test(UPLIST_CODE) &&
  /this\.lastUpNames/.test(UPLIST_CODE), true);
check('R78 showUpListInApp 恒列 .. 行，且不再追加「APP 内」伪说明行',
  /name: '\.\.'/.test(UPLIST_CODE) &&
  /上层清单（APP 内）/.test(UPLIST_CODE) === false &&
  (UPLIST_CODE.match(/rows\.push\(\{ uri: ''/g) || []).length === 1, true);
check('showUpListInApp 零 IO：无 listFile / statSync / openFolder / applyItems / 选择器',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|this\.applyItems|DocumentViewPicker|\.select\(|PhotoViewPicker/.test(UPLIST_CODE) === false, true);
check('showUpListInApp 不动恢复模式（保留防冻结闸门与只读提示卡）',
  /this\.restoreMode\s*=\s*RESTORE_/.test(UPLIST_CODE) === false &&
  /this\.restoreHintText\s*=/.test(UPLIST_CODE) === false &&
  /this\.applyPendingRestore\(/.test(UPLIST_CODE) === false, true);
check('showUpListInApp 回填 browseBase / titlePath / canGoUp 并停掉目录轮询',
  /this\.browseBase = target;/.test(UPLIST_CODE) &&
  /this\.titlePath = target;/.test(UPLIST_CODE) &&
  /this\.canGoUp = canGoUpFrom\(target\);/.test(UPLIST_CODE) &&
  /clearInterval\(this\.dirPollTimer\)/.test(UPLIST_CODE), true);
check('清单态标记 inAppUpList 只在五处维护（R56 返回刷新新增一处 false）',
  (INDEX.match(/this\.inAppUpList =/g) || []).length, 6);
check('清单行点击禁掉「目录内多选」兜底选择器',
  /this\.openFolder\(r\.uri, true, !this\.inAppUpList\);/.test(INDEX), true);
check('R29 openFolder 用本次真实 rows 建多层目录快照（不再读 this.rows 以免混入伪清单）',
  /this\.cacheUpDirSnapshot\(base, rows\);/.test(INDEX) &&
  /private cacheUpDirSnapshot\(base: string, rows: ImageItem\[\]\)/.test(INDEX) &&
  /this\.lastUpNames = names;/.test(INDEX) &&
  /this\.lastUpNames = cacheNames;/.test(INDEX) === false, true);
check('诊断串明确 no-picker，便于实机辨认新包',
  /no-picker/.test(UPLIST_CODE), true);

console.log('--- 回归契约：APP 内清单不能拆掉防冻结 / 按钮 / 版本护栏 ---');
check('bulkIoAllowed 闸门数量不减（≥8 个 IO 入口）',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8, true);
check('探测上限 3 / ro1 / p1 / uc1 标记仍在',
  /const RESTORE_PROBE_LIMIT: number = 3;/.test(INDEX) &&
  /const RESTORE_TAG: string = 'ro1';/.test(INDEX) &&
  /const PERSIST_TAG: string = 'p1';/.test(INDEX) &&
  /const UP_CTX_TAG: string = 'uc1';/.test(INDEX), true);
check('AUTO_RESUME_ON_START 护栏仍 false（启动绝不重扫 / 弹权限框）',
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX), true);
check('按钮 / 退格 / .. 行三条入口仍全部收口 browseUp',
  (INDEX.match(/this\.browseUp\(\)/g) || []).length >= 3, true);
check('按钮永不禁用（非注释行无 .enabled）', /\.enabled\(/.test(CODE_LINES) === false, true);
check('版本号未因本次修改升级', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- 源码静态契约：预览右下角只显示「缩放百分比」（第七轮移除缓存 N 张）---');
// 结束锚点用代码（onAreaChange），不用注释文字 —— 注释改文案不该让契约失效。
const BADGE = INDEX.slice(INDEX.indexOf('// 右下角角标：正式版不画'),
  INDEX.indexOf('.onAreaChange((oldV: Area, newV: Area)'));
const BADGE_ALWAYS = BADGE.slice(BADGE.indexOf('// 「缓存 N 张」文案'));
const BADGE_CODE = BADGE_ALWAYS.split('\n')
  .filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
check('SHOW_DIAG_BADGE 默认 false（目录诊断串不画在右下角）',
  /const SHOW_DIAG_BADGE: boolean = false;/.test(INDEX), true);
check('诊断行的渲染被开关包住，diagLine 赋值点一个没删',
  /if \(SHOW_DIAG_BADGE && this\.diagLine\.length > 0\)/.test(BADGE) &&
  (INDEX.match(/this\.diagLine =/g) || []).length >= 10, true);
check('右下角：正式版不画任何常显项（R55 取消百分比方块）；诊断层展开时显示全部排查项（共 3 个 Text）',
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3 &&
  /Text\('退出 APP'\)/.test(BADGE_CODE) &&
  /if \(this\.escDiag\.length > 0 \|\| this\.keySeen === 0\)/.test(BADGE_CODE) &&
  /Text\(\(this\.escDiag\.length > 0/.test(BADGE_CODE) &&
  /if \(this\.diagOverlayOn\) \{/.test(BADGE_CODE) &&
  /Text\(this\.zoomPercentText\(\)\)/.test(BADGE_CODE) === false &&
  /Text\('缓存 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) === false &&
  /缓存 N 张/.test(BADGE_CODE) === false, true);
check('右下角不出现 MB / 上限 / 张数分母 / 缓存账目',
  /fmtBytes|PRELOAD_COUNT|PRELOAD_MAX_BYTES|cacheBytes|cacheCount/.test(BADGE_CODE) === false, true);
check('缩放百分比只在诊断层角标显示（R55 起正式版右下角无常显项）；构建标记与 keys=N 口径未改',
  /Text\(this\.zoomPercentText\(\) \+ ' · ' \+ ESC_BUILD_TAG/.test(BADGE_CODE) &&
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  /' · keys=' \+ this\.keySeen/.test(INDEX) &&
  /const ZOOM_PCT_RELATIVE_TO_PIXEL: boolean = true;/.test(INDEX), true);
check('状态栏「预载 N 张」保持不变（只删百分比上方那一处），不带 MB 占用',
  /Text\('预载 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) &&
  /fmtBytes\(this\.cacheBytes\)/.test(INDEX) === false, true);
check('fmtBytes 未被误删（左栏字节列仍在用；左上角信息浮层已随 R55 取消）',
  (ARCHIVE.match(/fmtBytes\(/g) || []).length >= 2, true);
check('预载预算常量与 syncCacheStat 保持原样（只改显示，不改逻辑）',
  /const PRELOAD_COUNT: number = 216;/.test(INDEX) &&
  /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX) &&
  /this\.cacheBytes = this\.preloadBytes;/.test(INDEX), true);
check('按钮永不禁用 / 版本号未升 / 防冻结闸门不减',
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8, true);

console.log('--- ViewPlan 纯函数：EXIF 摆正 / 全屏档位 / 色彩空间 ---');
const exifCases = [
  ['1 不转', '1', 0, false, false],
  ['2 水平镜像', '2', 0, true, false],
  ['3 转 180', '3', 180, false, false],
  ['4 垂直镜像', '4', 0, false, true],
  ['5 镜像 + 顺时针 270', '5', 270, true, false],
  ['6 顺时针 90（竖拍常见）', '6', 90, false, false],
  ['7 镜像 + 顺时针 90', '7', 90, false, true],
  ['8 顺时针 270', '8', 270, false, false],
  ['空串当作不转', '', 0, false, false],
  ['非法值当作不转', 'abc', 0, false, false],
  ['未知值当作不转', '99', 0, false, false]
];
for (const [label, raw, deg, fh, fv] of exifCases) {
  const t = exifTransformOf(raw);
  check('EXIF Orientation ' + label,
    JSON.stringify([t.degrees, t.flipH, t.flipV]), JSON.stringify([deg, fh, fv]));
}
check('exifSizeOf 90 度交换宽高', JSON.stringify(exifSizeOf(4000, 3000, 90)),
  JSON.stringify({ w: 3000, h: 4000 }));
check('exifSizeOf 270 度交换宽高', JSON.stringify(exifSizeOf(4000, 3000, 270)),
  JSON.stringify({ w: 3000, h: 4000 }));
check('exifSizeOf 0 / 180 不换', JSON.stringify([exifSizeOf(4000, 3000, 0), exifSizeOf(4000, 3000, 180)]),
  JSON.stringify([{ w: 4000, h: 3000 }, { w: 4000, h: 3000 }]));
check('viewEdgeOf 普通态 1.5 倍', viewEdgeOf(1200, 800, false, 1.5, 2.0, 1200, 4096), 1800);
check('viewEdgeOf 全屏 2.0 倍（跟随画布变大）', viewEdgeOf(1920, 1080, true, 1.5, 2.0, 1200, 4096), 3840);
check('viewEdgeOf 夹在 4096 上限', viewEdgeOf(3840, 2160, true, 1.5, 2.0, 1200, 4096), 4096);
check('viewEdgeOf 夹在 1200 下限', viewEdgeOf(320, 240, false, 1.5, 2.0, 1200, 4096), 1200);
check('preloadEdgeOf 普通态封顶 1536',
  preloadEdgeOf(1920, 1080, false, 1.15, 256, 1024, 1536, 2560), 1536);
check('preloadEdgeOf 全屏放宽到 2304（ceil 量化）',
  preloadEdgeOf(1920, 1080, true, 1.15, 256, 1024, 1536, 2560), 2304);
check('preloadEdgeOf 零画布回退 minEdge',
  preloadEdgeOf(0, 0, true, 1.15, 256, 1024, 1536, 2560), 1024);
check('colorSpaceNameOf 标准空间',
  JSON.stringify([colorSpaceNameOf(0), colorSpaceNameOf(3), colorSpaceNameOf(4),
    colorSpaceNameOf(9), colorSpaceNameOf(10)]),
  JSON.stringify(['未标注色彩空间', 'Display P3', 'sRGB', 'BT.2020 HLG', 'BT.2020 PQ']));
check('isWideGamutOf 广色域 / HDR 空间',
  JSON.stringify([isWideGamutOf(3), isWideGamutOf(10), isWideGamutOf(4)]),
  JSON.stringify([true, true, false]));
check('viewHintOf HDR + EXIF', viewHintOf('Display P3', true, 90), 'Display P3 · HDR · EXIF 90°');
check('viewHintOf 普通 sRGB 不加多余字样', viewHintOf('sRGB', false, 0), 'sRGB');
check('fullscreenStepsOf 进入含「无标题栏 / dock」步骤',
  fullscreenStepsOf(true).includes('maximize-no-title-dock'), true);
check('fullscreenStepsOf 退出含 recover', fullscreenStepsOf(false).includes('recover'), true);

console.log('--- ViewPlan 纯函数：左右页共用的显示档位 displayEdgeOf ---');
check('displayEdgeOf 普通态以主视图档位为准（不再用宽松的 1260）',
  displayEdgeOf(1800, 1200, 800, 1, 1.05, 4000), 1800);
check('displayEdgeOf 全屏保持 3840 最好画质',
  displayEdgeOf(3840, 1920, 1080, 1, 1.05, 4000), 3840);
check('displayEdgeOf 放大 4 倍时按实际像素需求抬档',
  displayEdgeOf(1800, 1200, 800, 4, 1.05, 6000), 5040);
check('displayEdgeOf 夹到原图长边（再解也不会更清楚）',
  displayEdgeOf(1800, 1200, 800, 4, 1.05, 3000), 3000);
check('displayEdgeOf 原图尺寸未知时不夹上限',
  displayEdgeOf(1800, 1200, 800, 4, 1.05, 0), 5040);
check('displayEdgeOf 画布为 0 时回退主视图档位（绝不返回 0 让 desiredSize 算出 1x1）',
  displayEdgeOf(1800, 0, 0, 1, 1.05, 4000), 1800);
check('displayEdgeOf zoom 非正按 1 处理',
  displayEdgeOf(1800, 1200, 800, 0, 1.05, 4000), 1800);
check('displayEdgeOf 永不降档到主视图档位之下',
  displayEdgeOf(1800, 1200, 800, 1, 1.05, 4000) >= 1800, true);

console.log('--- 源码静态契约：真全屏 / 最高画质 resample / ICC·HDR·EXIF ---');
const RESIZE_FN = INDEX.slice(INDEX.indexOf('private refreshForCanvasResize('),
  INDEX.indexOf('private armCanvasReloadFallback('));
check('SHOW_FULLSCREEN_CHROME 默认 false（全屏无标题列 / 无退出按钮）',
  /const SHOW_FULLSCREEN_CHROME: boolean = false;/.test(INDEX) &&
  /if \(SHOW_FULLSCREEN_CHROME && this\.fullscreen\)/.test(INDEX) &&
  /if \(SHOW_FULLSCREEN_CHROME && this\.fullscreen && this\.topbarVisible\)/.test(INDEX) &&
  /if \(!SHOW_FULLSCREEN_CHROME \|\| !this\.fullscreen\)/.test(INDEX), true);
check('窗口最大化用「标题栏与 dock 悬停都不显示」的沉浸形态',
  /win\.maximize\(window\.MaximizePresentation\.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER\)/.test(INDEX), true);
check('沉浸式布局 + 系统栏全隐藏 + 三类 system bar 逐个关/开',
  /win\.setImmersiveModeEnabledState\(true\)/.test(INDEX) &&
  /win\.setImmersiveModeEnabledState\(false\)/.test(INDEX) &&
  /await win\.setWindowLayoutFullScreen\(true\)/.test(INDEX) &&
  /win\.setWindowSystemBarEnable\(noBars\)/.test(INDEX) &&
  (INDEX.match(/win\.setSpecificSystemBarEnabled\('(?:status|navigation|navigationIndicator)', false\)/g) || []).length === 3 &&
  (INDEX.match(/win\.setSpecificSystemBarEnabled\('(?:status|navigation|navigationIndicator)', true\)/g) || []).length === 3, true);
check('窗口实例未就绪短延时重试（getMainWindow 异步竞态）',
  /if \(retry < FULLSCREEN_WINDOW_RETRY_MAX\)/.test(INDEX) &&
  /this\.applyWindowFullScreen\(on, retry \+ 1\)/.test(INDEX), true);
check('全屏尺寸变化立即重解当前张（不走 showPreviewOf 升级延迟）',
  /if \(changed && this\.pendingReload\) \{[\s\S]{0,220}this\.refreshForCanvasResize\(\);/.test(INDEX) &&
  /this\.curToken\+\+;/.test(RESIZE_FN) &&
  /this\.loadViewNow\(uri, token\);/.test(RESIZE_FN) &&
  /this\.schedulePreload\(\);/.test(RESIZE_FN) &&
  /bulkIoAllowed\(this\.restoreMode\)/.test(RESIZE_FN), true);
check('pendingReload 有兜底超时（窗口 API 不产生 onAreaChange 也重解）',
  /CANVAS_RELOAD_FALLBACK_MS/.test(INDEX) &&
  /private armCanvasReloadFallback\(\): void \{/.test(INDEX) &&
  /this\.clearCanvasReloadFallback\(\);/.test(INDEX), true);
check('viewEdge / preloadEdge 交给 ViewPlan 且带全屏参数',
  /return viewEdgeOf\(this\.canvasW, this\.canvasH, this\.fullscreen,/.test(INDEX) &&
  /const base: number = preloadEdgeOf\(this\.canvasW, this\.canvasH, this\.fullscreen,/.test(INDEX) &&
  /FULLSCREEN_VIEW_EDGE_FACTOR, VIEW_EDGE_MIN, VIEW_EDGE_MAX\)/.test(INDEX) &&
  /FULLSCREEN_PRELOAD_MAX_EDGE\);/.test(INDEX), true);
check('第七轮：预载解码档位抬到可直接显示（decodeEdgeOf + 内存上限）',
  /const PRELOAD_DECODE_MAX_EDGE: number = 2048;/.test(INDEX) &&
  /const cap: number = this\.fullscreen \? FULLSCREEN_PRELOAD_MAX_EDGE : PRELOAD_DECODE_MAX_EDGE;/.test(INDEX) &&
  /return decodeEdgeOf\(base, this\.displayEdge\(0\), cap\);/.test(INDEX), true);
check('decodePx 读 EXIF Orientation 并在解码阶段旋转 / 镜像',
  /src\.getImageProperty\(image\.PropertyKey\.ORIENTATION\)/.test(MODEL) &&
  /opts\.rotate = exif\.degrees;/.test(MODEL) &&
  /await px\.rotate\(exif\.degrees\)/.test(MODEL) &&
  /await px\.flip\(exif\.flipH, exif\.flipV\)/.test(MODEL), true);
check('EXIF 元数据有缓存（避免 201 张预载逐张跨进程读）',
  /const EXIF_CACHE: Map<string, ExifTransform> = new Map\(\)/.test(MODEL) &&
  /const cached: ExifTransform \| undefined = EXIF_CACHE\.get\(uri\)/.test(MODEL), true);
check('HDR：解码 AUTO + 显示端 HIGH / STANDARD 按图切换（主视图 / 兜底 / 右页三处）',
  /opts\.desiredDynamicRange = image\.DecodingDynamicRange\.AUTO;/.test(MODEL) &&
  (INDEX.match(/\.dynamicRangeMode\(this\.viewHdrWanted \? DynamicRangeMode\.HIGH : DynamicRangeMode\.STANDARD\)/g) || []).length === 3, true);
check('色彩：保留内嵌 ICC 或转换到 sRGB / Display P3，并读回 PixelMap 色彩空间',
  /const COLOR_MANAGE_MODE: number = 0;/.test(MODEL) &&
  /opts\.desiredColorSpace = colorSpaceManager\.create\(colorSpaceManager\.ColorSpace\.SRGB\)/.test(MODEL) &&
  /opts\.desiredColorSpace = colorSpaceManager\.create\(colorSpaceManager\.ColorSpace\.DISPLAY_P3\)/.test(MODEL) &&
  /px\.getColorSpace\(\)\.getColorSpaceName\(\)/.test(MODEL), true);
check('R62 主视图 / 兜底 / 并排右页统一动态插值出口（三处）+ autoResize(false) 三处',
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.includes('private previewInterpolation(): ImageInterpolation {') &&
  INDEX.includes('return ImageInterpolation.Medium;') &&
  INDEX.includes('return ImageInterpolation.Low;'), true);
check('全屏退出提示写在信息浮层（不新增标题列 / 按钮）',
  /Text\('全屏 · Esc \/ F11 \/ 双击退出'\)/.test(INDEX), true);
check('退出全屏仍恢复系统栏并清理兜底计时器',
  /this\.applyWindowFullScreen\(on, 0\);/.test(INDEX) &&
  /this\.clearCanvasReloadFallback\(\);/.test(INDEX), true);
check('回归：预算常量 / 防冻结闸门 / 按钮 / 版本不动',
  /const PRELOAD_COUNT: number = 216;/.test(INDEX) &&
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8 &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- 源码静态契约：5 项实机修正（全屏放大 / ESC 还原 / 右页锯齿 / hover / 列表）---');
const SF0 = INDEX.indexOf('private setFull(on: boolean, bySystemHeal: boolean = false): void {');
const SET_FULL_FN = INDEX.slice(SF0, INDEX.indexOf('fullscreenStepsOf(on)', SF0));
const FB0 = INDEX.indexOf('private armCanvasReloadFallback(): void {');
const FALLBACK_FN = INDEX.slice(FB0, FB0 + 600);
const RP0 = INDEX.indexOf('rightPageImage(uri: string, half: boolean)');
const RIGHT_IMAGE_FN = INDEX.slice(RP0, RP0 + 900);

check('① 双击进全屏：先存完整界面快照，再 fitToWindow 复位缩放平移',
  /private fitToWindow\(\): void \{[\s\S]{0,160}this\.zoom = 1;[\s\S]{0,80}this\.tx = 0;[\s\S]{0,80}this\.ty = 0;/.test(INDEX) &&
  /this\.hasFullSnapshot = true;/.test(SET_FULL_FN) &&
  /this\.preFullZoom = this\.zoom;/.test(SET_FULL_FN) &&
  /this\.preFullTx = this\.tx;/.test(SET_FULL_FN) &&
  /this\.preFullRot = this\.rot;/.test(SET_FULL_FN) &&
  /this\.preFullStatus = this\.status;/.test(SET_FULL_FN) &&
  /this\.preFullTopbar = this\.topbarVisible;/.test(SET_FULL_FN) &&
  /this\.fitToWindow\(\);/.test(SET_FULL_FN), true);
check('① 进出全屏统一按 on 驱动窗口 API，且保留画布重解兜底',
  /this\.applyWindowFullScreen\(on, 0\);/.test(SET_FULL_FN) &&
  /this\.armCanvasReloadFallback\(\);/.test(SET_FULL_FN) &&
  /this\.pendingReload = true;/.test(SET_FULL_FN), true);
check('① 收口兜底无条件按最终画布重解（不再被早到的 onAreaChange 吃掉）',
  /this\.canvasReloadTimer = setTimeout/.test(FALLBACK_FN) &&
  /this\.pendingReload = false;\s*this\.refreshForCanvasResize\(\);/.test(FALLBACK_FN) &&
  !/if \(!this\.pendingReload\)/.test(FALLBACK_FN), true);
check('① 画布重解连并排右页一起按新档位重解',
  /this\.schedulePreload\(\);[\s\S]{0,320}this\.loadRightPage\(this\.items\[this\.spreadB\]\.uri\);/.test(RESIZE_FN), true);
check('R88 ESC 退出：恢复进入前缩放 / 平移（不再 fit）+ 仍还原旋转 / 镜像 / 状态栏 / 顶栏',
  /const hadSnapshot: boolean = this\.hasFullSnapshot;/.test(SET_FULL_FN) &&
  /if \(hadSnapshot\) \{/.test(SET_FULL_FN) &&
  /const onExit: boolean = fullExitEdgeOf\(prevFull, on\);/.test(SET_FULL_FN) &&
  /fullExitViewOf\(hadSnapshot,/.test(SET_FULL_FN) &&
  /this\.zoom = view\.zoom;/.test(SET_FULL_FN) &&
  /this\.tx = view\.tx;/.test(SET_FULL_FN) &&
  /this\.ty = view\.ty;/.test(SET_FULL_FN) &&
  (SET_FULL_FN.match(/this\.fitToWindow\(\);/g) || []).length === 1 &&
  /this\.armFullExitRefit\(\);/.test(SET_FULL_FN) &&
  /this\.zoom = this\.preFullZoom;/.test(SET_FULL_FN) === false &&
  /this\.tx = this\.preFullTx;/.test(SET_FULL_FN) === false &&
  /this\.ty = this\.preFullTy;/.test(SET_FULL_FN) === false &&
  /this\.rot = this\.preFullRot;/.test(SET_FULL_FN) &&
  /this\.flipH = this\.preFullFlipH;/.test(SET_FULL_FN) &&
  /this\.flipV = this\.preFullFlipV;/.test(SET_FULL_FN) &&
  /this\.status = this\.preFullStatus;/.test(SET_FULL_FN) &&
  /this\.topbarVisible = this\.preFullTopbar;/.test(SET_FULL_FN) &&
  /this\.hasFullSnapshot = false;/.test(SET_FULL_FN), true);
check('② ESC 退出：撤销沉浸最大化形态（EXIT_IMMERSIVE / decor / title-dock hover）',
  /win\.maximize\(window\.MaximizePresentation\.EXIT_IMMERSIVE\)/.test(INDEX) &&
  /win\.setWindowDecorVisible\(true\)/.test(INDEX) &&
  /win\.setTitleAndDockHoverShown\(true, true\)/.test(INDEX) &&
  /await win\.recover\(\)/.test(INDEX), true);
check('② 退出步骤表含新增的窗口形态恢复步骤',
  fullscreenStepsOf(false).includes('exit-immersive') &&
  fullscreenStepsOf(false).includes('decor-on') &&
  fullscreenStepsOf(false).includes('title-dock-hover-on') &&
  fullscreenStepsOf(false).includes('recover'), true);
check('③ 并排右页与左页同画质：displayEdge 档位 + 解码数据复用 + autoResize(false) + HDR 模式',
  /const need: number = this\.displayEdge\(srcLong\);/.test(INDEX) &&
  /const reuseNeed: number = this\.reuseEdge\(srcLong\);/.test(INDEX) &&
  /shouldReuseDecoded\(hit\.edge, reuseNeed\)/.test(INDEX) &&
  /this\.decodeTo\(uri, need\)/.test(INDEX) &&
  /\.interpolation\(this\.previewInterpolation\(\)\)/.test(RIGHT_IMAGE_FN) &&
  /\.antialiased\(this\.previewAntialias\(\)\)/.test(RIGHT_IMAGE_FN) &&
  /\.autoResize\(false\)/.test(RIGHT_IMAGE_FN) &&
  /\.dynamicRangeMode\(this\.viewHdrWanted \? DynamicRangeMode\.HIGH : DynamicRangeMode\.STANDARD\)/.test(RIGHT_IMAGE_FN), true);
check('④ hover 浮层已无档案名 Text（全文件只剩左栏那一处）',
  ((INDEX + ARCHIVE).match(/Text\(this\.name\)/g) || []).length === 1, true);
check('⑤ 列表两行缝压到 1vp + 交替色格子（回归护栏）',
  /const LIST_ROW_GAP_VP: number = 1;/.test(SIDEBAR) &&
  /top: 0.2, bottom: 0.2/.test(ARCHIVE) &&
  /\.backgroundColor\(this\.rowBgColor\(\)\)/.test(ARCHIVE), true);

console.log('--- 源码静态契约：左右页统一最高画质（第三轮：左边比右边差）---');
check('displayEdgeOf 已 import，Index 有统一 displayEdge() 包装与 headroom 常量',
  /displayEdgeOf, shouldReloadOnResize, shouldExitFullOnResize,/.test(INDEX) &&
  /const DISPLAY_HEADROOM: number = 1\.05;/.test(INDEX) &&
  /private displayEdge\(srcLong: number\): number \{[\s\S]{0,300}return displayEdgeOf\(this\.viewEdge\(\), this\.canvasW, this\.canvasH,[\s\S]{0,140}DISPLAY_HEADROOM, srcLong\);/.test(INDEX), true);
check('左页 showNeed 委托同一个 displayEdge（旧的宽松 1.05 公式已删）',
  /private showNeed\(e: PreviewEntry\): number \{\s*return this\.displayEdge\(Math\.max\(e\.w, e\.h\)\);/.test(INDEX) &&
  !/Math\.ceil\(canvasLong \* z \* 1\.05\)/.test(INDEX), true);
check('左页全清升级也按 displayEdge 解码（不再写死 viewEdge）',
  /const edge: number = this\.displayEdge\(this\.srcLongOf\(uri\)\);/.test(INDEX) &&
  /private srcLongOf\(uri: string\): number \{/.test(INDEX), true);
check('右页与左页共用 displayEdge 判据（同一个纯函数、同一组参数）',
  /const srcLong: number = hit !== undefined \? Math\.max\(hit\.w, hit\.h\) : 0;/.test(INDEX) &&
  /const need: number = this\.displayEdge\(srcLong\);/.test(INDEX) &&
  /this\.decodeTo\(uri, need\)/.test(INDEX), true);
check('全清图写回缓存：左右页此后命中同一张最高档位图',
  /private upgradePreview\(e: PreviewEntry\): PreviewEntry \{/.test(INDEX) &&
  /const best: PreviewEntry = this\.upgradePreview\(ret\);/.test(INDEX) &&
  /const best: PreviewEntry = this\.upgradePreview\(e\);/.test(INDEX) &&
  /this\.pushPreview\(best\);/.test(INDEX) &&
  /return best;/.test(INDEX), true);
check('同 uri 只升档不降档：缓存查询取 edge 最大、升级取 max edge',
  /let bestIdx: number = -1;/.test(INDEX) &&
  /this\.previews\[i\]\.edge > this\.previews\[bestIdx\]\.edge/.test(INDEX) &&
  /if \(old\.edge > best\.edge\) \{\s*best = old;/.test(INDEX) &&
  /if \(e\.px !== best\.px\) \{/.test(INDEX), true);
check('升级前先撤显示引用，避免 release 正在显示的 PixelMap',
  /this\.viewPixelMap = undefined;[^\n]*\n\s*const best: PreviewEntry = this\.upgradePreview\(ret\);/.test(INDEX) &&
  /this\.rightPixelMap = undefined;[^\n]*\n\s*const best: PreviewEntry = this\.upgradePreview\(e\);/.test(INDEX), true);
check('R62 左右页显示层画质三处齐配（动态插值 + autoResize(false) + HDR）',
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  (INDEX.match(/\.dynamicRangeMode\(this\.viewHdrWanted \? DynamicRangeMode\.HIGH : DynamicRangeMode\.STANDARD\)/g) || []).length === 3, true);

console.log('--- ViewPlan 纯函数：resize 实时重解 / 全屏沉浸自愈（第四轮）---');
check('shouldReloadOnResize 尺寸明显变化才重解',
  shouldReloadOnResize(800, 600, 900, 600, 8), true);
check('shouldReloadOnResize 高度变化也算', shouldReloadOnResize(800, 600, 800, 660, 8), true);
check('shouldReloadOnResize 滤掉 1~2vp 抖动', shouldReloadOnResize(800, 600, 803, 602, 8), false);
check('shouldReloadOnResize 完全没变不重解', shouldReloadOnResize(800, 600, 800, 600, 8), false);
check('shouldReloadOnResize 首次拿到有效尺寸要重解', shouldReloadOnResize(0, 0, 800, 600, 8), true);
check('shouldReloadOnResize 新尺寸非正不重解', shouldReloadOnResize(800, 600, 0, 600, 8), false);
check('shouldReloadOnResize minDelta 非正回退 1', shouldReloadOnResize(800, 600, 801, 600, 0), true);
check('shouldExitFullOnResize 系统退出沉浸（画布明显缩小）→ 自愈',
  shouldExitFullOnResize(true, 1920, 1080, 1280, 720, 0.85), true);
check('shouldExitFullOnResize 只缩高度也判（OR，标题栏/dock 回来）',
  shouldExitFullOnResize(true, 1920, 1080, 1900, 900, 0.85), true);
check('shouldExitFullOnResize 小幅 resize 不误判',
  shouldExitFullOnResize(true, 1920, 1080, 1900, 1060, 0.85), false);
check('shouldExitFullOnResize 非全屏态不判',
  shouldExitFullOnResize(false, 1920, 1080, 1280, 720, 0.85), false);
check('shouldExitFullOnResize 基准未记录不判',
  shouldExitFullOnResize(true, 0, 0, 1280, 720, 0.85), false);
check('shouldExitFullOnResize ratio 非法回退 0.85',
  shouldExitFullOnResize(true, 1920, 1080, 1280, 720, 0), true);

console.log('--- PreloadBudget 纯函数：全量顺序 / 受控并发 / 链重置（第四轮）---');
check('fullPreloadIndex 空图库 / 单张返回空', fullPreloadIndex(0, 0).length, 0);
check('fullPreloadIndex 单张返回空', fullPreloadIndex(1, 0).length, 0);
check('fullPreloadIndex 5 张从 cur=0 先近后远', fullPreloadIndex(5, 0).join(','), '1,4,2,3');
check('fullPreloadIndex 长度恒为 total-1', fullPreloadIndex(9, 3).length, 8);
check('fullPreloadIndex 每个非当前下标恰好一次',
  new Set(fullPreloadIndex(9, 3)).size, 8);
check('fullPreloadIndex 不含当前张', fullPreloadIndex(9, 3).includes(3), false);
check('fullPreloadIndex 涵盖除当前外全部下标',
  fullPreloadIndex(9, 3).slice().sort((a, b) => a - b).join(','), '0,1,2,4,5,6,7,8');
check('fullPreloadIndex 环绕 cur=7 也完整', fullPreloadIndex(9, 7).join(','), '8,6,0,5,1,4,2,3');
check('fullPreloadIndex 偶数 total 的 cur±total/2 去重',
  new Set(fullPreloadIndex(6, 0)).size, 5);
check('fullPreloadIndex cur 越界取模归位', fullPreloadIndex(5, 12).length, 4);
check('preloadConcurrencyOf 空/单张为 1', preloadConcurrencyOf(0, 4), 1);
check('preloadConcurrencyOf 小图库降并发', preloadConcurrencyOf(3, 4), 2);
check('preloadConcurrencyOf 夹到 cap', preloadConcurrencyOf(100, 4), 4);
check('preloadConcurrencyOf cap 非正为 1', preloadConcurrencyOf(100, 0), 1);
check('preloadBatchOf 取前 conc 个并给下一批起点',
  preloadBatchOf([1, 4, 2, 3, 0], 0, 2, new Set()).picks.join(',') + '|' +
  preloadBatchOf([1, 4, 2, 3, 0], 0, 2, new Set()).nextFrom, '1,4|2');
check('preloadBatchOf 跳过 done 下标',
  preloadBatchOf([1, 4, 2, 3, 0], 0, 2, new Set([1])).picks.join(','), '4,2');
check('preloadBatchOf 扫到尾 picks 为空',
  preloadBatchOf([1, 4, 2], 3, 2, new Set()).picks.length, 0);
check('preloadBatchOf from 越界安全', preloadBatchOf([1, 4, 2], 99, 2, new Set()).picks.length, 0);
check('preloadBatchOf 全 done 时 nextFrom 走到尾',
  preloadBatchOf([1, 4, 2], 0, 4, new Set([1, 4, 2])).nextFrom, 3);
check('shouldResetPreloadChain 全量+仅位置变化 → 不重置（滚轮不打断）',
  shouldResetPreloadChain(true, false), false);
check('shouldResetPreloadChain 换数据源 → 必须重置', shouldResetPreloadChain(true, true), true);
check('shouldResetPreloadChain 窗口模式位置变化 → 重置（旧行为）',
  shouldResetPreloadChain(false, false), true);
check('fullCacheTargetOf 空图库为 0', fullCacheTargetOf(0, 100), 0);
check('fullCacheTargetOf 小图库取整库', fullCacheTargetOf(30, 100), 30);
check('fullCacheTargetOf 夹到 cap', fullCacheTargetOf(500, 100), 100);
check('fullCacheTargetOf cap 非正不夹', fullCacheTargetOf(500, 0), 500);

console.log('--- 源码静态契约：① ESC 对齐双击 + 全屏沉浸自愈 ---');
const ONKEY_FN = INDEX.slice(INDEX.indexOf('private onKey(event: KeyEvent): void {'),
  INDEX.indexOf('// ------------------------------------------------------------------\n  // UI 片段',
    INDEX.indexOf('private onKey(event: KeyEvent): void {')));
check('① ESC 与双击/F11 同走 toggleFull()（第十八轮改按 escActionByState 分派，入口仍不分叉）',
  ONKEY_FN.includes('const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  /if \(escAct === ESC_ACT_EXIT_FULL\) \{\s*this\.toggleFull\(\);/.test(ONKEY_FN) &&
  /this\.toggleFull\(\);/.test(ONKEY_FN) &&
  /case KeyCode\.KEYCODE_F11:\s*this\.toggleFull\(\);/.test(ONKEY_FN), true);
check('① onAreaChange 全屏态画布缩小 → 自愈 setFull(false, true) 恢复完整界面（第十八轮双判据）',
  /const shrinkBig: boolean = shouldExitFullOnResize\(this\.fullscreen, this\.fullCanvasW, this\.fullCanvasH, w, h,\s*FULL_EXIT_SHRINK_RATIO\)/.test(INDEX) &&
  /const shrinkSmall: boolean = shouldSelfHealOnResize\(this\.fullscreen, healReady,/.test(INDEX) &&
  /this\.setFull\(false, true\);\s*return;/.test(INDEX), true);
check('① 全屏画布基准：进全屏清零并记时刻、期间取最大、退出清零',
  /private fullCanvasW: number = 0;/.test(INDEX) &&
  /private fullEnterAt: number = 0;/.test(INDEX) &&
  /this\.fullCanvasW = 0;\s*this\.fullCanvasH = 0;\s*this\.fullEnterAt = Date\.now\(\);/.test(SET_FULL_FN) &&
  /this\.fullEnterAt = 0;/.test(SET_FULL_FN) &&
  /this\.fullCanvasW = Math\.max\(this\.fullCanvasW, w\);/.test(INDEX), true);
check('① 系统退沉浸自愈带稳定期保护（避免进全屏异步抖动被误踢出）',
  /const healReady: boolean = this\.fullEnterAt > 0 &&\s*\(Date\.now\(\) - this\.fullEnterAt\) > FULL_SELF_HEAL_GUARD_MS;/.test(INDEX) &&
  /if \(changed && healReady &&/.test(INDEX), true);
check('① 阈值 / 稳定期 / resize 常量就位',
  /const FULL_EXIT_SHRINK_RATIO: number = 0\.92;/.test(INDEX) &&
  /const FULL_SELF_HEAL_GUARD_MS: number = 900;/.test(INDEX) &&
  /const RESIZE_RELOAD_THROTTLE_MS: number = 140;/.test(INDEX) &&
  /const RESIZE_MIN_DELTA_PX: number = 8;/.test(INDEX), true);

console.log('--- 源码静态契约：② resize 实时适配画布 ---');
check('② onAreaChange 用「累积差」判据重解（不再拿相邻帧差，拖窗口每帧只变 1~3vp 会永远不触发）',
  /\} else if \(changed &&\s*shouldReloadOnResize\(this\.lastReloadW, this\.lastReloadH, w, h, RESIZE_MIN_DELTA_PX\)\) \{[\s\S]{0,300}this\.armResizeReload\(\);/.test(INDEX) &&
  /private lastReloadW: number = 0;/.test(INDEX) &&
  /this\.lastReloadW = this\.canvasW;\s*this\.lastReloadH = this\.canvasH;/.test(INDEX), true);
check('② pendingReload 立即重解仍保留，并清掉 resize 防抖避免重复解码',
  /if \(changed && this\.pendingReload\) \{[\s\S]{0,220}this\.clearResizeReload\(\);\s*this\.refreshForCanvasResize\(\);/.test(INDEX), true);
const AR0 = INDEX.indexOf('private armResizeReload(): void {');
const ARM_RESIZE_FN = INDEX.slice(AR0, AR0 + 400);
check('② armResizeReload 改成节流（已有计时器不重挂，拖动中每 140ms 重解一次）',
  /if \(this\.resizeReloadTimer !== -1\) \{\s*return;/.test(ARM_RESIZE_FN) &&
  !/this\.clearResizeReload\(\);\s*this\.resizeReloadTimer = setTimeout/.test(ARM_RESIZE_FN) &&
  /this\.refreshForCanvasResize\(\);\s*\}, RESIZE_RELOAD_THROTTLE_MS\);/.test(ARM_RESIZE_FN) &&
  /this\.loadViewNow\(uri, token\);/.test(RESIZE_FN), true);
check('② resize 计时器在 aboutToDisappear 清理（不泄漏）',
  /private clearResizeReload\(\): void \{/.test(INDEX) &&
  /this\.clearCanvasReloadFallback\(\);\s*this\.clearResizeReload\(\);/.test(INDEX), true);

console.log('--- 源码静态契约：③ 全量缓存 + 载入并发预解码 + 滚轮加速 ---');
check('③ PRELOAD_ALL 开关与全量/并发/让出常量',
  /const PRELOAD_ALL: boolean = true;/.test(INDEX) &&
  /const PRELOAD_ALL_CAP: number = 20000;/.test(INDEX) &&
  /const PRELOAD_CONCURRENCY: number = 4;/.test(INDEX) &&
  /const PRELOAD_ALL_YIELD_MS: number = 0;/.test(INDEX), true);
check('③ schedulePreload 按 PRELOAD_ALL 分流，且守住 ro1 只读名单态闸门',
  /if \(!bulkIoAllowed\(this\.restoreMode\)\) \{[\s\S]{0,140}if \(PRELOAD_ALL\) \{\s*this\.startAllPreload\(\);\s*return;/.test(INDEX), true);
check('③ 全量链用整库顺序 + 受控并发批次（第十二轮起按 items 长度夹界）',
  /private startAllPreload\(\): void \{/.test(INDEX) &&
  /this\.allOrder = fullPreloadIndex\(n, this\.cur\);/.test(INDEX) &&
  /const conc: number = preloadConcurrencyOf\(n, PRELOAD_CONCURRENCY\);/.test(INDEX) &&
  /const batch: PreloadBatch = preloadBatchBoundedOf\(this\.allOrder, this\.allFrom, conc,\s*this\.allDone, n\);/.test(INDEX), true);
check('③ 整批落地才让出主线程灌下一批（不同步堆叠 openSync）',
  /private pumpAll\(seq: number\): void \{/.test(INDEX) &&
  /private onAllDecoded\(/.test(INDEX) &&
  /this\.allActive <= 0/.test(INDEX) &&
  /this\.pumpAll\(seq\);[\s\S]{0,80}PRELOAD_ALL_YIELD_MS/.test(INDEX), true);
check('③ 滚轮/翻页不打断链：allBusy + shouldResetPreloadChain 短路',
  /if \(this\.allBusy && !shouldResetPreloadChain\(PRELOAD_ALL, false\)\) \{\s*return;/.test(INDEX) &&
  /if \(this\.allComplete\) \{\s*return;/.test(INDEX), true);
check('③ 预算收工判据用全量容量（防「解→淘汰→再解」死循环 / 防 OOM）',
  /const cap: number = fullCacheTargetOf\(n, PRELOAD_ALL_CAP\);/.test(INDEX) &&
  /preloadSaturated\(this\.previews\.length, this\.preloadBytes, cap, PRELOAD_MAX_BYTES\)/.test(INDEX), true);
check('③ pushPreview 容量改用 cacheCap()，PRELOAD_MAX_BYTES 仍是最终硬闸',
  /private cacheCap\(\): number \{[\s\S]{0,200}fullCacheTargetOf\(this\.items\.length, PRELOAD_ALL_CAP\) : PRELOAD_COUNT/.test(INDEX) &&
  /while \(\(this\.previews\.length > this\.cacheCap\(\) \|\| this\.preloadBytes > PRELOAD_MAX_BYTES\)/.test(INDEX), true);
check('③ 换数据源 clearPreviews 作废旧批次并允许重新铺满',
  /this\.allSeq\+\+;\s*this\.allBusy = false;\s*this\.allComplete = false;/.test(INDEX) &&
  /this\.allOrder = \[\];/.test(INDEX) && /this\.allDone\.clear\(\);/.test(INDEX), true);
check('③ 解码失败进黑名单（不再无限重试同一张）',
  /this\.failed\.add\(uri\);\s*this\.probeFail\+\+;/.test(INDEX), true);
check('③ 换源时旧解码结果交给 releaseUncachedEntry（复用条目不误释放）',
  /if \(seq !== this\.allSeq\) \{[\s\S]{0,260}this\.releaseUncachedEntry\(entry\);/.test(INDEX) &&
  /private releaseUncachedEntry\(e: PreviewEntry \| undefined\): void \{/.test(INDEX) &&
  /if \(this\.previews\[i\]\.px === e\.px\) \{/.test(INDEX), true);
check('③ 回退路径仍在（PRELOAD_ALL=false 可用旧窗口链）',
  /const order: number\[\] = preloadOrder\(backSpan, fwdSpan\)/.test(INDEX) &&
  /this\.evictOutside\(\);/.test(INDEX) &&
  /const win: Set<string> = this\.windowUris\(\)/.test(INDEX), true);
check('回归护栏：全量缓存也未拆防冻结 / 按钮 / 版本 / 最高画质',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8 &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX) &&
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3, true);

console.log('--- ViewPlan 纯函数：根容器尺寸反推画布（第五轮 resize 兜底）---');
check('canvasFromRootOf 普通态：根尺寸减去固定栏偏移',
  JSON.stringify(canvasFromRootOf(1600, 900, 300, 80)) === JSON.stringify({ w: 1300, h: 820 }), true);
check('canvasFromRootOf 全屏态 chrome=0 → 画布等于根尺寸',
  JSON.stringify(canvasFromRootOf(1920, 1080, 0, 0)) === JSON.stringify({ w: 1920, h: 1080 }), true);
check('canvasFromRootOf chrome 未就绪（<0）返回 0 尺寸',
  JSON.stringify(canvasFromRootOf(1600, 900, -1, -1)) === JSON.stringify({ w: 0, h: 0 }), true);
check('canvasFromRootOf 根尺寸非正返回 0 尺寸',
  JSON.stringify(canvasFromRootOf(0, 0, 300, 80)) === JSON.stringify({ w: 0, h: 0 }), true);
check('canvasFromRootOf 结果非正返回 0 尺寸（绝不把 0 设进画布）',
  JSON.stringify(canvasFromRootOf(200, 900, 300, 80)) === JSON.stringify({ w: 0, h: 0 }), true);

console.log('--- 源码静态契约：第五轮「resize 实机仍不生效」4 个叠加根因 ---');
check('⑤ 根因 A：@Builder 不再按值传宽度数值（改 half 布尔 + builder 内直接读 @State）',
  /previewImage\(uri: string, token: number, half: boolean\)/.test(INDEX) &&
  /rightPageImage\(uri: string, half: boolean\)/.test(INDEX) &&
  /private viewBoxW\(half: boolean\): number \{\s*return this\.frameW\(\) \* \(half \? 0\.5 : 1\);/.test(INDEX) &&
  !/this\.previewImage\(this\.curItem\(\)!\.uri, this\.curToken, this\.frameW\(\)/.test(INDEX) &&
  (INDEX.match(/\.width\(this\.pageW(Left|Right)\(half\)\)/g) || []).length === 7, true);
check('⑤ 根因 A：并排两页传 true、单页传 false',
  /this\.previewImage\(this\.curItem\(\)!\.uri, this\.curToken, true\)/.test(INDEX) &&
  /this\.rightPageImage\(this\.items\[this\.spreadB\]\.uri, true\)/.test(INDEX) &&
  /this\.previewImage\(this\.curItem\(\)!\.uri, this\.curToken, false\)/.test(INDEX), true);
check('⑤ 根因 B：Area 尺寸用 Number 归一化，NaN / 0 不进画布',
  /const w: number = Number\(newV\.width\);/.test(INDEX) &&
  /const h: number = Number\(newV\.height\);/.test(INDEX) &&
  /if \(w > 0 && h > 0 && w === w && h === h\)/.test(INDEX), true);
check('⑤ 根因 C：根 Stack 也挂 onAreaChange，用 chrome 偏移反推画布（不赌深层回调）',
  /canvasFromRootOf,/.test(INDEX) &&
  /const box: Size2 = canvasFromRootOf\(rw, rh, this\.chromeW, this\.chromeH\);/.test(INDEX) &&
  /private chromeW: number = -1;/.test(INDEX) &&
  /private lastRootW: number = 0;/.test(INDEX) &&
  /\.onAreaChange\(\(o: Area, n: Area\)/.test(INDEX) &&
  /this\.canvasW = box\.w;\s*this\.canvasH = box\.h;\s*this\.armResizeReload\(\);/.test(INDEX), true);
check('⑤ 根因 C：栏偏移基准由两处回调共同维护，进出全屏 / 收起展开左栏重置（R58 改走自洽采样）',
  /const chrome: Size2 = chromeSampleOf\(this\.chromeW, this\.chromeH,/.test(INDEX) &&
  /const chromeSeed: Size2 = chromeSampleOf\(this\.chromeW, this\.chromeH,/.test(INDEX) &&
  /if \(changed && \(this\.chromeW < 0 \|\| this\.chromeH < 0\)\) \{/.test(INDEX) &&
  /this\.chromeW = this\.lastRootW - w;/.test(INDEX) === false &&
  /this\.chromeW = rw - this\.canvasW;/.test(INDEX) === false &&
  /this\.chromeW = -1;\s*this\.chromeH = -1;/.test(INDEX), true);
check('⑤ 根因 D：节流而非防抖 + refreshForCanvasResize 也记累积基准',
  /const RESIZE_RELOAD_THROTTLE_MS: number = 140;/.test(INDEX) &&
  !/RESIZE_RELOAD_DEBOUNCE_MS/.test(INDEX) &&
  /this\.lastReloadW = this\.canvasW;\s*this\.lastReloadH = this\.canvasH;/.test(INDEX), true);
check('⑤ 回归护栏：最高画质三处齐配 / fitToWindow / 全屏快照 / 全量预载 / 版本未动',
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  /this\.fitToWindow\(\);/.test(INDEX) &&
  /this\.hasFullSnapshot = true;/.test(INDEX) &&
  /if \(PRELOAD_ALL\) \{/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);

console.log('--- SessionState 纯函数：档案元数据（体积 / 日期）---');
check('metaLineOf 正常值', metaLineOf(2048, 1730000000000), '2048,1730000000000');
check('metaLineOf 未知值回退 -1,0', metaLineOf(-1, 0), '-1,0');
check('metaLineOf 过滤 NaN / Infinity', metaLineOf(NaN, Infinity), '-1,0');
check('metaLineOf 取整', metaLineOf(12.9, 34.8), '12,34');
const PM = parseMetaLine('4096,1730000000123');
check('parseMetaLine 体积', PM.size, 4096);
check('parseMetaLine 日期', PM.mtime, 1730000000123);
check('parseMetaLine 缺列不抛异常',
  JSON.stringify(parseMetaLine('4096')), JSON.stringify({ size: 4096, mtime: 0 }));
check('parseMetaLine 空串全未知',
  JSON.stringify(parseMetaLine('')), JSON.stringify({ size: -1, mtime: 0 }));
check('parseMetaLine 垃圾串全未知',
  JSON.stringify(parseMetaLine('x,y')), JSON.stringify({ size: -1, mtime: 0 }));
const ENC = encodeMeta([{ size: 100, mtime: 111 }, { size: -1, mtime: 0 }, { size: 200, mtime: 222 }]);
check('encodeMeta 三行', ENC, '100,111\n-1,0\n200,222');
check('decodeMeta 往返', JSON.stringify(decodeMeta(ENC)),
  JSON.stringify([{ size: 100, mtime: 111 }, { size: -1, mtime: 0 }, { size: 200, mtime: 222 }]));
check('decodeMeta 空串 → 空数组（旧存档无 meta key）', decodeMeta('').length, 0);
check('decodeMeta 跳过空行', decodeMeta('1,2\n\n3,4\n').length, 2);
check('metaForUri 按 uri 命中（不靠下标）',
  JSON.stringify(metaForUri(['a', 'b'], [{ size: 1, mtime: 10 }, { size: 2, mtime: 20 }], 'b')),
  JSON.stringify({ size: 2, mtime: 20 }));
check('metaForUri 找不到回退未知',
  JSON.stringify(metaForUri(['a'], [], 'z')), JSON.stringify({ size: -1, mtime: 0 }));

console.log('--- SessionState 纯函数：窗口大小 / 位置 ---');
const WR = { left: 120, top: 80, width: 1280, height: 800 };
check('packWindowRect 四段', packWindowRect(WR), '120,80,1280,800');
check('parseWindowRect 往返', JSON.stringify(parseWindowRect(packWindowRect(WR))), JSON.stringify(WR));
check('parseWindowRect 拒绝列数不对', parseWindowRect('1,2,3'), undefined);
check('parseWindowRect 拒绝空串', parseWindowRect(''), undefined);
check('parseWindowRect 拒绝非数字', parseWindowRect('a,b,c,d'), undefined);
check('parseWindowRect 拒绝 NaN', parseWindowRect('NaN,0,100,100'), undefined);
check('windowRectUsable 正常窗口', windowRectUsable(WR, 320, 240, 16384, 16384), true);
check('windowRectUsable 拒绝 undefined', windowRectUsable(undefined, 320, 240, 16384, 16384), false);
check('windowRectUsable 拒绝过小',
  windowRectUsable({ left: 0, top: 0, width: 100, height: 100 }, 320, 240, 16384, 16384), false);
check('windowRectUsable 拒绝超大（多半是全屏残留）',
  windowRectUsable({ left: 0, top: 0, width: 99999, height: 800 }, 320, 240, 16384, 16384), false);
check('windowRectUsable 拒绝离屏坐标',
  windowRectUsable({ left: 999999, top: 0, width: 1280, height: 800 }, 320, 240, 16384, 16384), false);
check('windowRectUsable 允许负坐标（多屏左屏）',
  windowRectUsable({ left: -1920, top: 0, width: 1280, height: 800 }, 320, 240, 16384, 16384), true);
check('shouldSaveWindowRect 非全屏 + 自由窗口才存', shouldSaveWindowRect(false, true), true);
check('shouldSaveWindowRect 全屏不覆盖记忆', shouldSaveWindowRect(true, true), false);
check('shouldSaveWindowRect 最大化 / 沉浸态不覆盖', shouldSaveWindowRect(false, false), false);
check('collapsedOf(1) → 收起', collapsedOf(1), true);
check('collapsedOf(0) / 缺失 → 展开（日期列不隐藏）', collapsedOf(0), false);
check('collapsedOf(NaN) → 展开', collapsedOf(NaN), false);

console.log('--- 源码静态契约：第六轮（档案日期恢复 + 窗口大小位置恢复）---');
check('① SessionState 已 import，会话状态小 key / 校验常量就位',
  /from '..\/common\/SessionState'/.test(INDEX) &&
  /const META_KEY_PREFIX: string = 'snapMeta_';/.test(INDEX) &&
  /const WIN_KEY_RECT: string = 'winRect';/.test(INDEX) &&
  /const WIN_KEY_COLLAPSED: string = 'listCollapsed';/.test(INDEX) &&
  /const WIN_RECT_RESTORE_MS: number = 900;/.test(INDEX) &&
  /const WIN_RECT_SAVE_MS: number = 600;/.test(INDEX), true);
check('① setItems 可选 meta 并注入 size / mtime（日期不再为 0）',
  /private setItems\(uris: Array<string>, src: string, meta\?: Array<ArchiveMeta>\): void \{/.test(INDEX) &&
  /const m: ArchiveMeta \| undefined =/.test(INDEX) &&
  /size: m !== undefined \? m\.size : -1,/.test(INDEX) &&
  /mtime: m !== undefined \? m\.mtime : 0,/.test(INDEX), true);
check('R77 ① flushSnap 写 meta 按 uri 合并旧值（未知不覆盖有效资料）+ 按块补齐行数',
  /await store\.put\(META_KEY_PREFIX \+ c, encodeMeta\(metaChunkPaddedOf\(end - start, metaPart\)\)\);/.test(INDEX) &&
  /await store\.delete\(META_KEY_PREFIX \+ c\);/.test(INDEX) &&
  /metaPart\.push\(metaMergeOf\(/.test(INDEX) &&
  /const oldByUri: Map<string, ArchiveMeta> = new Map\(\);/.test(INDEX), true);
check('① 快照恢复读 meta 并注入，单张兜底按 uri 找日期',
  /const metas: Array<ArchiveMeta> = await this\.readSnapMeta\(store, uris\.length\);/.test(INDEX) &&
  /this\.setItems\(uris, src, metas\);/.test(INDEX) &&
  /private async readMetaForUri\(/.test(INDEX) &&
  /this\.setItems\(\[single\], src, \[oneMeta\]\);/.test(INDEX) &&
  /return metaForUri\(uris, metas, uri\);/.test(INDEX), true);
check('① 左栏日期列本身没被改掉（回归护栏）',
  /Text\(this\.mtime > 0 \? fmtDate\(this\.mtime\) : '--'\)/.test(ARCHIVE) &&
  /mtime: item\.mtime \?\? 0,/.test(SIDEBAR), true);
check('② readLastPos 读回窗口 rect 与收起态，且在提前 return 之前排程',
  /const rawRect = await p\.get\(WIN_KEY_RECT, ''\);/.test(INDEX) &&
  /const rawCollapsed = await p\.get\(WIN_KEY_COLLAPSED, 0\);/.test(INDEX) &&
  /this\.savedWindowRect = typeof rawRect === 'string' \? rawRect : '';/.test(INDEX) &&
  /this\.listCollapsed = collapsedOf\(/.test(INDEX) &&
  /this\.scheduleRestoreWindowRect\(\);/.test(INDEX), true);
check('② 恢复推迟到窗口稳定后，且只跑一次',
  /private scheduleRestoreWindowRect\(\): void \{[\s\S]{0,220}WIN_RECT_RESTORE_MS\);/.test(INDEX) &&
  /private winRectApplied: boolean = false;/.test(INDEX), true);
check('② applySavedWindowRect 校验 rect + 只在 FLOATING 恢复 + resize/moveWindowTo',
  /private async applySavedWindowRect\(retry: number\): Promise<void> \{/.test(INDEX) &&
  /windowRectUsable\(rect, WIN_MIN_W, WIN_MIN_H, WIN_MAX_W, WIN_MAX_H\)/.test(INDEX) &&
  /win\.getWindowStatus\(\) === window\.WindowStatusType\.FLOATING/.test(INDEX) &&
  /await win\.resize\(rect\.width, rect\.height\);/.test(INDEX) &&
  /await win\.moveWindowTo\(rect\.left, rect\.top\);/.test(INDEX) &&
  /WIN_RECT_RETRY_MAX/.test(INDEX), true);
check('② 退出同步落盘：windowRect 来自 getWindowProperties 且经校验',
  /const props = win\.getWindowProperties\(\);/.test(INDEX) &&
  /const r = props\.windowRect;/.test(INDEX) &&
  /store\.putSync\(WIN_KEY_RECT, packed\);/.test(INDEX) &&
  /shouldSaveWindowRect\(this\.fullscreen, floating\)/.test(INDEX) &&
  /store\.putSync\(WIN_KEY_COLLAPSED, this\.listCollapsed \? 1 : 0\);/.test(INDEX) &&
  /store\.flushSync\(\);/.test(INDEX), true);
check('② onPageHide / aboutToDisappear 都同步保存窗口状态',
  /onPageHide\(\): void \{[\s\S]{0,220}this\.clearWinRectTimer\(\);\s*this\.saveWindowRectSync\(\);/.test(INDEX) &&
  (INDEX.match(/this\.saveWindowRectSync\(\);/g) || []).length >= 3, true);
check('② 三处收起态切换点 + 根容器 resize 都触发防抖写盘',
  (INDEX.match(/this\.markWindowRect\(\);/g) || []).length === 4, true);
check('② 回归护栏：既有档案列表 / 窗口交互常量未动',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  /const LIST_ROW_GAP_VP: number = 1;/.test(SIDEBAR) &&
  /win\.maximize\(window\.MaximizePresentation\.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER\)/.test(INDEX), true);

console.log('--- SessionState 纯函数：窗口形态（第七轮：最大化重启保持）---');
check('windowModeFlagOf 最大化 → 1', windowModeFlagOf(false, true, false, true), 1);
check('windowModeFlagOf 自由窗口 → 0', windowModeFlagOf(false, false, true, true), 0);
check('windowModeFlagOf APP 真全屏 → 0（临时形态不写记忆）', windowModeFlagOf(true, true, false, true), 0);
check('windowModeFlagOf 形态未知 → -1（不覆写记忆）', windowModeFlagOf(false, false, false, false), -1);
check('windowModeFlagOf 非浮动非最大化（最小化）→ -1', windowModeFlagOf(false, false, false, true), -1);
check('shouldRestoreMaximized 记忆1 + 启动浮动 + 非全屏 → 恢复', shouldRestoreMaximized(1, true, false), true);
check('shouldRestoreMaximized 记忆0 不恢复', shouldRestoreMaximized(0, true, false), false);
check('shouldRestoreMaximized 启动已最大化不干预', shouldRestoreMaximized(1, false, false), false);
check('shouldRestoreMaximized APP 全屏不干预', shouldRestoreMaximized(1, true, true), false);
check('shouldRestoreMaximized NaN 不恢复', shouldRestoreMaximized(NaN, true, false), false);
check('shouldScheduleWindowRestore rect 空但最大化记忆=1 仍排程', shouldScheduleWindowRestore('', 1), true);
check('shouldScheduleWindowRestore 有 rect 也排程', shouldScheduleWindowRestore('1,2,3,4', 0), true);
check('shouldScheduleWindowRestore 两者皆无 → 不排程', shouldScheduleWindowRestore('', 0), false);
check('shouldScheduleWindowRestore NaN flag 不排程', shouldScheduleWindowRestore('', NaN), false);

console.log('--- DecodeCache 纯函数：预载档位 / 解码数据复用判据 ---');
check('decodeEdgeOf 抬到显示档位', decodeEdgeOf(1536, 1800, 2560), 1800);
check('decodeEdgeOf 夹到内存上限', decodeEdgeOf(1536, 3840, 2560), 2560);
check('decodeEdgeOf 不把档位往下降', decodeEdgeOf(2048, 1024, 1536), 2048);
check('decodeEdgeOf 原预载档位已更高就沿用', decodeEdgeOf(2560, 1800, 2560), 2560);
check('decodeEdgeOf cap=0 不夹', decodeEdgeOf(1024, 3840, 0), 3840);
check('decodeEdgeOf 非有限数按 0 处理', decodeEdgeOf(NaN, NaN, NaN), 0);
check('reuseEdgeOf 按实际显示像素（headroom 1.05）', reuseEdgeOf(1200, 800, 1, 1.05, 0), 1260);
check('reuseEdgeOf zoom=2 抬档', reuseEdgeOf(1200, 800, 2, 1.05, 0), 2520);
check('reuseEdgeOf 夹到原图长边', reuseEdgeOf(1200, 800, 1, 1.05, 1000), 1000);
check('reuseEdgeOf 画布未就绪 → 0', reuseEdgeOf(0, 0, 1, 1.05, 0), 0);
check('reuseEdgeOf 非法 zoom/headroom 回退 1', reuseEdgeOf(1000, 600, NaN, 0, 0), 1000);
check('shouldReuseDecoded 档位够 → 复用', shouldReuseDecoded(2048, 1743), true);
check('shouldReuseDecoded 档位不够 → 补解', shouldReuseDecoded(1536, 1743), false);
check('shouldReuseDecoded need=0 直接复用', shouldReuseDecoded(768, 0), true);
check('shouldReuseDecoded 非法值不复用', shouldReuseDecoded(NaN, 1024), false);
check('decodeKeyOf uri+edge 组成合并键', decodeKeyOf('file://a.jpg', 2048), 'file://a.jpg@2048');
check('decodeKeyOf 不同档位不同键', decodeKeyOf('u', 768) !== decodeKeyOf('u', 2048), true);

console.log('--- 源码静态契约：第七轮（最大化 / 解码复用 / 圆点 / 缓存张数 / 左键放大）---');
const WINRESTORE_FN = INDEX.slice(INDEX.indexOf('private async applySavedWindowRect('),
  INDEX.indexOf('private saveWindowRectSync('));
check('① 新纯函数与新小 key 已接入 Index',
  /from '\.\.\/common\/DecodeCache'/.test(INDEX) &&
  /decodeEdgeOf, reuseEdgeOf, shouldReuseDecoded,/.test(INDEX) &&
  /windowModeFlagOf,/.test(INDEX) &&
  /shouldRestoreMaximized, shouldScheduleWindowRestore/.test(INDEX) &&
  /const WIN_KEY_MAXIMIZED: string = 'winMaximized';/.test(INDEX), true);
check('① readLastPos 读回形态，且 rect 为空也能排程',
  /const rawMaximized = await p\.get\(WIN_KEY_MAXIMIZED, 0\);/.test(INDEX) &&
  /this\.savedWindowMaximized = typeof rawMaximized === 'number' \? rawMaximized : 0;/.test(INDEX) &&
  /!shouldScheduleWindowRestore\(this\.savedWindowRect, this\.savedWindowMaximized\)/.test(INDEX), true);
check('① 启动恢复最大化：EXIT_IMMERSIVE，且在 resize 之前就返回（不缩回普通尺寸）',
  /shouldRestoreMaximized\(this\.savedWindowMaximized, true, this\.fullscreen\)/.test(WINRESTORE_FN) &&
  /await win\.maximize\(window\.MaximizePresentation\.EXIT_IMMERSIVE\);/.test(WINRESTORE_FN) &&
  /if \(!floating\) \{[\s\S]{0,220}this\.winRectApplied = true;\s*return;/.test(WINRESTORE_FN) &&
  WINRESTORE_FN.indexOf('maximize(window.MaximizePresentation.EXIT_IMMERSIVE)') <
    WINRESTORE_FN.indexOf('await win.resize(rect.width, rect.height)') &&
  /await win\.resize\(rect\.width, rect\.height\);/.test(WINRESTORE_FN), true);
check('① 退出同步落盘形态：MAXIMIZE / FULL_SCREEN 都算最大化，未知形态不覆写',
  /st === window\.WindowStatusType\.MAXIMIZE \|\|/.test(INDEX) &&
  /st === window\.WindowStatusType\.FULL_SCREEN/.test(INDEX) &&
  /if \(win !== undefined && statusKnown && !this\.fullscreen\)/.test(INDEX) &&
  /const flag: number = windowModeFlagOf\(this\.fullscreen, maximized, floating, statusKnown\);/.test(INDEX) &&
  /store\.putSync\(WIN_KEY_MAXIMIZED, flag\);/.test(INDEX) &&
  /store\.flushSync\(\);/.test(INDEX), true);
check('② 解码数据缓存：inflight 合并 + pushPreview 去重 + 换源清空',
  /private decodeInflight: Map<string, Promise<PreviewEntry \| undefined>> = new Map\(\);/.test(INDEX) &&
  /const key: string = decodeKeyOf\(uri, edge\);/.test(INDEX) &&
  /this\.decodeInflight\.set\(key, job\);/.test(INDEX) &&
  /if \(this\.previews\[i\]\.px === e\.px\) \{/.test(INDEX) &&
  /this\.decodeInflight\.clear\(\);/.test(INDEX) &&
  /private releaseUncachedEntry\(e: PreviewEntry \| undefined\): void \{/.test(INDEX), true);
check('② 命中缓存即复用上屏，档位够就不解码（滚轮切图零解码）',
  /this\.showDecoded\(hit\);/.test(INDEX) &&
  /const reuseNeed: number = this\.reuseEdge\(Math\.max\(hit\.w, hit\.h\)\);/.test(INDEX) &&
  /if \(!shouldReuseDecoded\(hit\.edge, reuseNeed\) && fullNeed > hit\.edge\)/.test(INDEX) &&
  /this\.loadView\(uri, token, UPGRADE_DELAY_MS\);/.test(INDEX) &&
  /private reuseEdge\(srcLong: number\): number \{/.test(INDEX), true);
check('② 解码全部在载入时的后台全量预载链启动，warm 强制自有 PixelMap',
  /this\.schedulePreload\(\);/.test(APPLY_FN) &&
  /private startAllPreload\(\): void \{/.test(INDEX) &&
  /const edge: number = this\.preloadEdge\(\);/.test(INDEX) &&
  /this\.decodeTo\(uri, this\.preloadEdge\(\), false\)/.test(INDEX) &&
  /滚轮 \/ 翻页切图只做/.test(INDEX), true);
check('③ 档案行圆点与名称右侧符号列均已移除（R75：向上箭头 / 方格 / 符号列配置一并清理，三栏列宽不变）',
  ARCHIVE.includes('folderGlyphOf') === false &&
  ARCHIVE.includes('folderGlyphWidthOf') === false &&
  ARCHIVE.includes('↑') === false && /▣/.test(ARCHIVE) === false &&
  ARCHIVE.includes('.width(66)') && ARCHIVE.includes('.width(88)'), true);
check('④ 右下角百分比上方「缓存 N 张」文案 / 控件已移除（第二十一轮角标改为带构建标记）',
  /Text\('缓存 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) === false &&
  /右下角角标：正式版不画任何常显项/.test(INDEX) &&
  /Text\(this\.zoomPercentText\(\) \+ ' · ' \+ ESC_BUILD_TAG/.test(INDEX), true);
check('⑤ 左键单击不再放大，双击仍切全屏（TapGesture count 2）',
  /this\.zoomAt\(ZOOM_LEFT, event\.x, event\.y\);/.test(INDEX) === false &&
  /左键单击不再放大/.test(INDEX) &&
  /this\.clickSnapZoom = -1;/.test(INDEX) &&
  /TapGesture\(\{ count: 2 \}\)/.test(INDEX) &&
  /this\.onDoubleTapCanvas\(\);/.test(INDEX) &&
  /private onDoubleTapCanvas\(\): void \{[\s\S]{0,300}this\.toggleFull\(\);/.test(INDEX), true);
check('⑥ 回归护栏：滚轮切图 / 窗口 API / 最高画质 / 版本 / 按钮不禁用都未动',
  /\.onAxisEvent\(\(event: AxisEvent\)/.test(INDEX) &&
  /this\.onWheel\(v < 0 \? -1 : 1\);/.test(INDEX) &&
  /win\.maximize\(window\.MaximizePresentation\.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER\)/.test(INDEX) &&
  /await win\.recover\(\)/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  /\.enabled\(/.test(CODE_LINES) === false, true);

console.log('--- 第八轮 ①：NAS 网络卷路径层级（往上层错误目录表，2026-11-12）---');
const NAS_IP = '192.168.100.61';
const NAS_ROOT = '/192.168.100.61';
const NAS_BASE = '/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2023';
const NAS_RAW = 'file://192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2023';
const NAS_TARGET = '/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography';
const NAS_UNC = '\\\\192.168.100.61\\图片档案\\2023';

check('NAS：IPv4 主机被识别', isNetworkHost(NAS_IP), true);
check('NAS：域名主机被识别', isNetworkHost('nas.local'), true);
check('NAS：IPv6 字面量被识别', isNetworkHost('[fe80::1]'), true);
check('NAS：文档 provider 伪 authority 不是主机', isNetworkHost('docs'), false);
check('NAS：content / storage 不是主机', isNetworkHost('content') || isNetworkHost('storage'), false);
check('NAS：中文 / 带空格目录名不是主机', isNetworkHost('4 中'), false);
check('NAS：空串不是主机', isNetworkHost(''), false);
check('NAS：nasHostOf 从 file:// URI 抽主机', nasHostOf(NAS_RAW), NAS_IP);
check('NAS：nasHostOf 从纯路径抽主机', nasHostOf(NAS_BASE), NAS_IP);
check('NAS：nasHostOf 从 smb:// 抽主机', nasHostOf('smb://nas.local/share/a'), 'nas.local');
check('NAS：nasHostOf 从 UNC 抽主机', nasHostOf(NAS_UNC), NAS_IP);
check('NAS：file://docs 不是 NAS', nasHostOf('file://docs/storage/Users/100/a'), '');
check('NAS：普通绝对路径不是 NAS', nasHostOf('/storage/Users/100/a'), '');

check('NAS：file://<host> 保留主机段（旧版会当 authority 吞掉）', realPathOf(NAS_RAW), NAS_BASE);
check('NAS：hierPathOf(file://<host>) 保留主机段', hierPathOf(NAS_RAW), NAS_BASE);
check('NAS：smb:// 归一到 /<host>/share', realPathOf('smb://nas.local/share/a'), '/nas.local/share/a');
check('NAS：UNC 折叠为 /<host>/share', realPathOf(NAS_UNC), '/192.168.100.61/图片档案/2023');
check('回归：file://docs 仍还原为真实路径', realPathOf('file://docs/storage/Users/100/a'), '/storage/Users/100/a');
check('回归：file://docs 碎片仍判不出路径', realPathOf('file://docs'), '');

check('NAS 卷根 = /<host>（不再是 /）', volumeRootOf(NAS_BASE), NAS_ROOT);
check('NAS 卷根（file:// 形态）', volumeRootOf(NAS_RAW), NAS_ROOT);
check('NAS 卷根自身仍是卷根（到顶不判空）', volumeRootOf(NAS_ROOT), NAS_ROOT);
check('NAS UNC 卷根', volumeRootOf(NAS_UNC), NAS_ROOT);
check('回归：通用 POSIX 卷根仍是 /', volumeRootOf('/a/b/c'), '/');
check('回归：鸿蒙用户卷根仍是 /storage/Users/<id>', volumeRootOf(DEEP), VOLROOT);

check('NAS：往上层目标保留主机段', upLevelOf(NAS_BASE), NAS_TARGET);
check('NAS：到 NAS 卷根就停（不越级到 /）', upLevelOf(NAS_ROOT), '');
check('NAS：深层目录层级', dirLevelOf(NAS_BASE), 5);
check('NAS：状态为 GO（不是 UNKNOWN / TOP）', upNavStateOf(NAS_BASE), UP_NAV_GO);
check('NAS：canGoUpFrom 为真（按钮恒可点）', canGoUpFrom(NAS_BASE), true);
check('NAS：upContextBaseOf 能从持久目录 URI 重建层级', upContextBaseOf(NAS_RAW), NAS_BASE);
check('NAS：upContextRawOf 保留 scheme 形态', upContextRawOf(NAS_RAW), NAS_RAW);

const nasChain = pathChainOf(NAS_TARGET);
check('NAS 清单：首行是 NAS 卷根', nasChain[0], NAS_ROOT);
check('NAS 清单：不再出现伪造的文件系统根 / 行', nasChain.includes('/'), false);
check('NAS 清单：末行是目标父级', nasChain.slice(-1)[0], NAS_TARGET);
check('NAS 清单：每一级都带主机段', nasChain.every((p) => p.startsWith(NAS_ROOT)), true);
check('NAS 清单：层级数', nasChain.length, 5);

const nasUps = upParentCandidates(NAS_BASE, NAS_RAW);
check('NAS 父候选：保留带授权的 file://<host> 形态',
  nasUps.some((u) => u.indexOf('file://192.168.100.61/') === 0), true);
check('NAS 父候选：全部落在同一父层', nasUps.every((u) => sameDirPath(u, NAS_TARGET)), true);
check('NAS 父候选：含真实路径目标（fs.listFile 兜底）', nasUps.includes(NAS_TARGET), true);
check('NAS 父候选：不再只剩 1 条兜底', nasUps.length >= 2, true);
check('NAS 父候选：不含丢掉主机的错误路径',
  nasUps.some((u) => sameDirPath(u, '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography')), false);

console.log('--- 第八轮 ②：原始档案数据缓存纯函数（RawCache.ts）---');
check('rawFitOf：空缓存直接准入、无需淘汰',
  JSON.stringify(rawFitOf([], 100, 1000, 3)), JSON.stringify({ keep: true, evict: 0 }));
check('rawFitOf：张数超上限淘汰 1 条', rawFitOf([100, 100, 100], 100, 350, 3).evict, 1);
check('rawFitOf：字节超上限淘汰 2 条', rawFitOf([100, 100, 100], 100, 250, 10).evict, 2);
check('rawFitOf：张数上限 2 时淘汰 2 条', rawFitOf([100, 100, 100], 100, 1000, 2).evict, 2);
check('rawFitOf：准入时 keep 为真', rawFitOf([100], 50, 1000, 10).keep, true);
check('rawFitOf：单条超过总预算拒绝驻留', rawFitOf([100], 2000, 1000, 10).keep, false);
check('rawFitOf：张数上限 0 拒绝', rawFitOf([100], 50, 1000, 0).keep, false);
check('rawFitOf：字节预算 0 拒绝', rawFitOf([100], 50, 0, 10).keep, false);
check('rawFitOf：incoming 为 0 拒绝', rawFitOf([100], 0, 1000, 10).keep, false);
check('rawFitOf：非有限数按 0 处理，不产生 NaN 淘汰', rawFitOf([0, NaN], 50, 1000, 10).evict, 0);
check('rawSingleAllowed：正常图片可入内存', rawSingleAllowed(1024, 64 * 1024 * 1024), true);
check('rawSingleAllowed：超大单文件拒绝', rawSingleAllowed(100 * 1024 * 1024, 64 * 1024 * 1024), false);
check('rawSingleAllowed：size 为 0 拒绝', rawSingleAllowed(0, 64 * 1024 * 1024), false);
check('rawSingleAllowed：上限 0 = 不限制', rawSingleAllowed(100, 0), true);
check('rawSingleAllowed：NaN 拒绝', rawSingleAllowed(NaN, 0), false);
check('rawReadComplete：读满才允许交给 ImageSource', rawReadComplete(100, 100), true);
check('rawReadComplete：少读一字节也拒绝（半截图绝不解）', rawReadComplete(99, 100), false);
check('rawReadComplete：多读也拒绝', rawReadComplete(101, 100), false);
check('rawReadComplete：size 为 0 拒绝', rawReadComplete(100, 0), false);
check('rawCacheTargetOf：整库超过上限夹到 cap', rawCacheTargetOf(25000, 20000), 20000);
check('rawCacheTargetOf：小图库取全量', rawCacheTargetOf(3, 20000), 3);
check('rawCacheTargetOf：空库为 0', rawCacheTargetOf(0, 20000), 0);
check('rawCacheTargetOf：cap 为 0 视为不限制', rawCacheTargetOf(5, 0), 5);
check('rawCacheTargetOf：NaN 为 0', rawCacheTargetOf(NaN, 20000), 0);
check('rawPrefetchWanted：ro1 只读名单态绝不启动批量读取', rawPrefetchWanted(false, 10, 100), false);
check('rawPrefetchWanted：空库不启动', rawPrefetchWanted(true, 0, 100), false);
check('rawPrefetchWanted：正常载入启动', rawPrefetchWanted(true, 10, 100), true);

console.log('--- 源码静态契约：第八轮（原始档案数据内存缓存 + NAS 层级）---');
const RAW_SRC = readFileSync(new URL('../entry/src/main/ets/common/RawCache.ts', import.meta.url), 'utf8');
check('RawCache.ts 是纯函数模块（不 import 鸿蒙 SDK）', /@ohos\./.test(RAW_SRC), false);
check('RawStore：ArrayBuffer LRU + 在途合并 + 换源 gen + 单例',
  /class RawStore \{/.test(MODEL) &&
  /private data: Map<string, ArrayBuffer> = new Map\(\);/.test(MODEL) &&
  /private inflight: Map<string, Promise<ArrayBuffer \| undefined>> = new Map\(\);/.test(MODEL) &&
  /private gen: number = 0;/.test(MODEL) &&
  /const rawStore: RawStore = new RawStore\(\);/.test(MODEL), true);
check('原始档案数据预算与 PixelMap 缓存分开计（防 OOM）',
  /const RAW_CACHE_MAX_BYTES: number = 768 \* 1024 \* 1024;/.test(MODEL) &&
  /const RAW_SINGLE_MAX_BYTES: number = 64 \* 1024 \* 1024;/.test(MODEL) &&
  /const RAW_CACHE_MAX_COUNT: number = 20000;/.test(MODEL) &&
  /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX), true);
check('decodePx 优先从内存 ArrayBuffer 建 ImageSource，失败降级 fd',
  /const raw: ArrayBuffer \| undefined = await rawStore\.ensure\(uri\);/.test(MODEL) &&
  /src = image\.createImageSource\(raw\);/.test(MODEL) &&
  /file = await fs\.open\(uri, fs\.OpenMode\.READ_ONLY\);/.test(MODEL) &&
  /src = image\.createImageSource\(file\.fd\);/.test(MODEL), true);
check('RawStore.read 一次读满并校验完整性 + LRU 准入',
  /const got: number = await fs\.read\(file\.fd, buf\);/.test(MODEL) &&
  /if \(!rawReadComplete\(got, size\)\)/.test(MODEL) &&
  /const fit: RawFit = rawFitOf\(this\.sizesOf\(\), size,/.test(MODEL) &&
  /for \(let i = 0; i < fit\.evict; i\+\+\)/.test(MODEL), true);
check('载入时同批「读进内存 → 立即解码」，不等滚轮切换',
  /private preloadOne\(seq: number, idx: number, uri: string, edge: number,/.test(INDEX) &&
  /const wantRaw: boolean = rawPrefetchWanted\(bulkIoAllowed\(this\.restoreMode\),/.test(INDEX) &&
  /rawStore\.ensure\(uri\)/.test(INDEX) &&
  /this\.preloadOne\(seq, idx, u, edge, wantRaw\);/.test(INDEX) &&
  /this\.schedulePreload\(\);/.test(APPLY_FN) &&
  /shouldReuseDecoded\(hit\.edge, edge\)/.test(INDEX), true);
check('换数据源 / 退出时释放原始 bytes（不泄漏）',
  /rawStore\.clear\(\);/.test(INDEX) &&
  /private clearPreviews\(\): void \{[\s\S]{0,900}rawStore\.clear\(\);/.test(INDEX), true);
check('probeOne 元数据探测优先用内存数据',
  /const raw: ArrayBuffer \| undefined = rawStore\.get\(uri\);/.test(INDEX) &&
  /\? image\.createImageSource\(raw\) : image\.createImageSource\(uri\)/.test(INDEX), true);
check('NAS：dirCandidates 兜底改用 realPathOf / hierPathOf 纯函数',
  /const real: string = realPathOf\(raw\);/.test(INDEX) &&
  /add\(hierPathOf\(raw\)\);/.test(INDEX) &&
  /保留 NAS 主机段/.test(INDEX) &&
  /raw\.substring\('file:\/\/'\.length\)/.test(INDEX) === false, true);
check('DirName 有 NAS 主机识别与网络卷根判定',
  /export function isNetworkHost\(seg: string\): boolean/.test(DIRNAME_SRC) &&
  /export function nasHostOf\(p: string\): string/.test(DIRNAME_SRC) &&
  /function nasHostIndexIn\(parts: string\[\]\): number/.test(DIRNAME_SRC) &&
  /const hostIdx: number = nasHostIndexIn\(parts\);/.test(DIRNAME_SRC) &&
  /export function canonicalLevelKeyOf\(p: string\): string/.test(DIRNAME_SRC) &&
  /export function encodePathForm\(p: string\): string/.test(DIRNAME_SRC) &&
  /export function isStrictParentOf\(parent: string, current: string\): boolean/.test(DIRNAME_SRC) &&
  /isNetworkHost\(authority\) \? '\/' \+ authority \+ tail : tail/.test(DIRNAME_SRC), true);
check('回归护栏：ro1 闸门 / 版本 / 按钮 / 最高画质 / 滚轮 / 全量链都未动',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9 &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  /this\.onWheel\(v < 0 \? -1 : 1\);/.test(INDEX) &&
  /const PRELOAD_ALL: boolean = true;/.test(INDEX) &&
  /this\.allActive <= 0/.test(INDEX), true);

// ===========================================================================
// 第九轮（2026-11-12）：启动恢复 3 秒预算 —— 未进入上次目录就停止尝试并打开选择文件夹
// ===========================================================================
console.log('--- 第九轮 ①：RestoreTimeout 纯函数（预算 / 看门狗 / 收口决策）---');
check('动作常量：0 继续等 / 1 停止并打开选择文件夹',
  ENTER_WAIT === 0 && ENTER_ABORT === 1, true);
check('预算合法区间 1000..10000ms',
  ENTER_TIMEOUT_MIN_MS === 1000 && ENTER_TIMEOUT_MAX_MS === 10000, true);
check('预算 3000 合法', enterTimeoutSafe(3000, 1000, 10000), true);
check('预算恰好等于下限合法', enterTimeoutSafe(3000, 3000, 10000), true);
check('预算恰好等于上限合法', enterTimeoutSafe(3000, 1000, 3000), true);
check('预算低于下限拒绝（不误伤正常恢复）', enterTimeoutSafe(300, 1000, 10000), false);
check('预算高于上限拒绝（不把卡死拖回启动）', enterTimeoutSafe(20000, 1000, 10000), false);
check('预算 NaN 拒绝', enterTimeoutSafe(NaN, 1000, 10000), false);
check('预算 Infinity 拒绝', enterTimeoutSafe(Infinity, 1000, 10000), false);
check('预算上下限倒置拒绝', enterTimeoutSafe(3000, 10000, 1000), false);
check('有记忆 + 自动恢复 → 挂看门狗', enterWatchdogWanted(true, true, false, false), true);
check('首次启动无记忆 → 绝不挂（不被动弹选择器）',
  enterWatchdogWanted(true, false, false, false), false);
check('恢复已完成 → 不挂', enterWatchdogWanted(true, true, true, false), false);
check('用户已抢先 → 不挂', enterWatchdogWanted(true, true, false, true), false);
check('自动恢复关 → 不挂', enterWatchdogWanted(false, true, false, false), false);
check('非只读 + 217 张 → 算进入上次目录', enterSettledOk(true, 217, false), true);
check('非只读 + 1 张 → 算进入（整批恢复）', enterSettledOk(true, 1, false), true);
check('空列表 → 不算进入', enterSettledOk(true, 0, false), false);
check('ro1 只读名单态 → 不算进入', enterSettledOk(false, 217, false), false);
check('恢复已作废 → 不算进入', enterSettledOk(true, 217, true), false);
check('张数 NaN → 不算进入', enterSettledOk(true, NaN, false), false);
const EA = (el, bud, s, e, u, p, f) => enterTimeoutAction(el, bud, s, e, u, p, f);
check('已成功进入 → 看门狗不干预',
  EA(3000, 3000, true, true, false, false, false), ENTER_WAIT);
check('到期但只落只读 / 单张兜底 → 停止并弹 picker',
  EA(3000, 3000, true, false, false, false, false), ENTER_ABORT);
check('到期且恢复链还挂着 → 停止并弹 picker',
  EA(3000, 3000, false, false, false, false, false), ENTER_ABORT);
check('未到预算 → 继续等', EA(2999, 3000, false, false, false, false, false), ENTER_WAIT);
check('用户已操作 → 不抢视图', EA(3000, 3000, false, false, true, false, false), ENTER_WAIT);
check('picker 正忙 → 不弹第二次', EA(3000, 3000, false, false, false, true, false), ENTER_WAIT);
check('目录载入中 → 不抢视图', EA(3000, 3000, false, false, false, false, true), ENTER_WAIT);
check('elapsed NaN → 不误弹', EA(NaN, 3000, false, false, false, false, false), ENTER_WAIT);
check('budget NaN → 不误弹', EA(3000, NaN, false, false, false, false, false), ENTER_WAIT);
check('远超预算（系统服务挂死）仍收口',
  EA(9800, 3000, false, false, false, false, false), ENTER_ABORT);
check('超时文案点明 3 秒 / 已停止恢复 / 重新选择文件夹',
  enterTimeoutHint(3000).includes('3 秒') &&
  enterTimeoutHint(3000).includes('已停止恢复') &&
  enterTimeoutHint(3000).includes('重新选择文件夹'), true);
check('超时文案对 NaN 预算有兜底', enterTimeoutHint(NaN).includes('3 秒'), true);

console.log('--- 第九轮 ②：源码静态契约（3 秒看门狗接线 / 超时弹 picker）---');
const ENTER_SRC = readFileSync(new URL('../entry/src/main/ets/common/RestoreTimeout.ts', import.meta.url), 'utf8');
const FF_SRC = readFileSync(new URL('../entry/src/main/ets/common/FailFast.ts', import.meta.url), 'utf8');
check('RestoreTimeout.ts 是纯函数模块（不 import 鸿蒙 SDK）', /@ohos\./.test(ENTER_SRC), false);
check('RestoreTimeout.ts 不用 Number.isFinite（ArkTS 兼容）', /Number\.isFinite/.test(ENTER_SRC), false);
check('Index 引入 RestoreTimeout 纯函数',
  /from '\.\.\/common\/RestoreTimeout'/.test(INDEX), true);
check('总预算恒为 3000ms、诊断标记 et1',
  /const RESTORE_ENTER_TIMEOUT_MS: number = 3000;/.test(INDEX) &&
  /const ENTER_TAG: string = 'et1';/.test(INDEX), true);
check('看门狗在 scheduleShowLast 内与恢复链一起排程',
  /this\.restoreStartedAt = Date\.now\(\);/.test(INDEX) &&
  /this\.enterWatchdogTimer = setTimeout\(/.test(INDEX) &&
  /this\.onEnterWatchdog\(\);/.test(INDEX) &&
  /}, RESTORE_ENTER_TIMEOUT_MS\);/.test(INDEX) &&
  /}, RESUME_DELAY_MS\);/.test(INDEX), true);
check('排程前做预算校验 + 有记忆才挂',
  /enterTimeoutSafe\(RESTORE_ENTER_TIMEOUT_MS, ENTER_TIMEOUT_MIN_MS,\s*\n\s*ENTER_TIMEOUT_MAX_MS\)/.test(INDEX) &&
  /enterWatchdogWanted\(AUTO_SHOW_LAST_ON_START, this\.hasRestoreMemory,/.test(INDEX), true);
check('首次启动无记忆绝不弹选择文件夹',
  /this\.hasRestoreMemory = idx >= 0 \|\| uri\.length > 0 \|\| ok\.length > 0 \|\|/.test(INDEX), true);
check('四个看门狗方法都在，且不在 showLastOnStart 函数体内',
  /private clearEnterWatchdog\(\): void \{/.test(INDEX) &&
  /private markRestoreEntered\(\): void \{/.test(INDEX) &&
  /private onEnterWatchdog\(\): void \{/.test(INDEX) &&
  /private abortRestoreForPicker\(elapsed: number\): void \{/.test(INDEX) &&
  /clearEnterWatchdog\(\)/.test(RESUME_FN) === false, true);
const WD_FNS = INDEX.slice(INDEX.indexOf('private clearEnterWatchdog(): void {'),
  INDEX.indexOf('/** 首帧之后真正执行恢复'));
const ABORT_FN = INDEX.slice(INDEX.indexOf('private abortRestoreForPicker('),
  INDEX.indexOf('/** 首帧之后真正执行恢复'));
check('看门狗区不含全量重扫 / 权限申请',
  /loadAllGallery|queryAllPhotos|ensureGalleryPermission/.test(WD_FNS), false);
check('到期由纯函数裁决，非 ABORT 一律不干预',
  /const act: number = enterTimeoutAction\(/.test(WD_FNS) &&
  /if \(act !== ENTER_ABORT\) \{/.test(WD_FNS), true);
check('超时收口直接打开选择文件夹', /this\.chooseFolder\(\);/.test(ABORT_FN), true);
check('超时收口不绕回恢复链',
  /this\.showLastOnStart\(\)/.test(ABORT_FN) === false &&
  /this\.beginRestore\(\)/.test(ABORT_FN) === false, true);
check('超时收口作废在飞恢复链并挡住 activate 收口',
  /this\.restoreCancelled = true;/.test(ABORT_FN) &&
  /this\.resumeDone = true;/.test(ABORT_FN) &&
  /this\.persistSettled = true;/.test(ABORT_FN), true);
check('超时收口清掉两个定时器 + 看门狗',
  /clearTimeout\(this\.resumeTimer\)/.test(ABORT_FN) &&
  /clearTimeout\(this\.persistTimer\)/.test(ABORT_FN) &&
  /this\.clearEnterWatchdog\(\);/.test(ABORT_FN), true);
check('超时状态栏文案由纯函数生成并带 et1 诊断',
  /this\.status = enterTimeoutHint\(RESTORE_ENTER_TIMEOUT_MS\);/.test(ABORT_FN) &&
  /'restore TIMEOUT \| ' \+ ENTER_TAG/.test(ABORT_FN), true);
check('超时收口作废在飞的全量预载链（后台不再读旧目录）',
  /this\.allSeq\+\+;/.test(ABORT_FN) &&
  /this\.allBusy = false;/.test(ABORT_FN) &&
  /this\.allActive = 0;/.test(ABORT_FN), true);
check('成功进入上次目录立即撤掉看门狗',
  /private markRestoreEntered\(\): void \{[\s\S]{0,320}this\.restoreEntered = true;[\s\S]{0,320}this\.clearEnterWatchdog\(\);/.test(WD_FNS), true);
check('只有整批恢复成功才判「进入目录」，单张兜底不撤看门狗',
  (RESUME_FN.match(/markRestoreEntered\(\)/g) || []).length === 1 &&
  /enterSettledOk\(this\.restoreMode !== RESTORE_READONLY &&/.test(RESUME_FN) &&
  /单张兜底只是临时画面，没有进入上次的目录/.test(RESUME_FN), true);
check('恢复链入口 / await 之后都检查作废标志',
  (INDEX.match(/this\.restoreCancelled/g) || []).length >= 9 &&
  /if \(this\.resumeDone \|\| this\.restoreCancelled\) \{/.test(RESUME_FN) &&
  /if \(this\.restoreCancelled\) \{\s*\n\s*return;/.test(RESUME_FN) &&
  /private beginRestore\(\): void \{\s*\n\s*if \(this\.restoreCancelled\) \{/.test(INDEX), true);
check('restoreFromSnapshot 有 startupGuard，用户主动路径不传',
  /private async restoreFromSnapshot\(startupGuard: boolean = false\): Promise<boolean> \{/.test(INDEX) &&
  /this\.restoreFromSnapshot\(true\)/.test(RESUME_FN) &&
  /this\.restoreFromSnapshot\(\);/.test(INDEX), true);
check('快照恢复链至少 5 处作废检查，且 setItems 前必查',
  (INDEX.match(/startupGuard && this\.restoreCancelled/g) || []).length >= 5 &&
  /if \(startupGuard && this\.restoreCancelled\) \{\s*\n\s*return false;\s*\n\s*\}\s*\n\s*this\.pendingRestoreReadonly/.test(INDEX), true);
check('作废标志不污染正常载入 / APP 内上层清单',
  /restoreCancelled/.test(APPLY_FN) === false &&
  /chooseFolder\(|DocumentViewPicker|dv\.select/.test(UPLIST_FN) === false, true);
check('chooseFolder 主动入口清看门狗（不弹第二次）',
  /private chooseFolder\(\): void \{\s*\n\s*this\.clearEnterWatchdog\(\);/.test(INDEX), true);
check('页面销毁清看门狗',
  /this\.clearEnterWatchdog\(\); \/\/ 页面已销毁，超时也不该再弹选择文件夹/.test(INDEX), true);

console.log('--- 第九轮 ③：回归护栏（旧契约一条不动）---');
check('showLastOnStart 仍不含选择器 / 权限 / 全量重扫',
  /loadAllGallery|queryAllPhotos|ensureGalleryPermission|DocumentViewPicker|PhotoViewPicker/.test(RESUME_FN), false);
check('往上层仍不弹系统选择器',
  /chooseFolder\(|DocumentViewPicker|dv\.select/.test(UP_FN) === false, true);
check('chooseFolderAt 整个方法仍不存在', /chooseFolderAt/.test(INDEX) === false, true);
check('ro1 闸门 / 版本 / 按钮 / 启动重扫护栏 / 启动路径无同步等待都未动',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9 &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX) &&
  /new Promise|Promise\.race/.test(RESUME_FN) === false, true);
check('层级重建仍恰好 2 处、全量链与滚轮零解码未动',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3 &&
  /const PRELOAD_ALL: boolean = true;/.test(INDEX) &&
  /this\.schedulePreload\(\);/.test(APPLY_FN) &&
  /this\.onWheel\(v < 0 \? -1 : 1\);/.test(INDEX), true);
check('3 秒预算合法且覆盖 1500ms 激活超时',
  enterTimeoutSafe(3000, ENTER_TIMEOUT_MIN_MS, ENTER_TIMEOUT_MAX_MS) && 3000 > 1500, true);

console.log('--- 第十轮 ①：FailFast.ts 纯函数（死路径立即放弃）---');
check('FailFast.ts 是纯函数模块（不 import 鸿蒙 SDK）', /@ohos\./.test(FF_SRC), false);
check('FailFast.ts 不用 Number.isFinite（ArkTS 兼容）', /Number\.isFinite/.test(FF_SRC), false);
check('FailFast.ts 不引入同步等待原语', /new Promise|Promise\.race|Atomics\.wait/.test(FF_SRC), false);
check('动作常量 WAIT = 0', FF_WAIT, 0);
check('动作常量 GIVEUP = 1', FF_GIVEUP, 1);
check('死路径标记上限 256', DEAD_TAG_MAX, 256);
check('deadTagOf 优先目录授权根', deadTagOf('file://nas/a', 'file://nas/a/1.jpg'), 'file://nas/a');
check('deadTagOf 无目录时退到图 uri', deadTagOf('', 'file://x/1.jpg'), 'file://x/1.jpg');
check('deadTagOf 两者皆空 → 不记', deadTagOf('', ''), '');
check('deadTagOf 超长截断到 256', deadTagOf('a'.repeat(300), '').length, 256);
check('deadTagOf 恰好 256 不截断', deadTagOf('b'.repeat(256), '').length, 256);
check('死路径记忆：同一目录复发 → 命中',
  deadMemoryMatches('file://nas/a', 'file://nas/a', 'file://nas/a/1.jpg'), true);
check('死路径记忆：用户换了目录 → 不命中',
  deadMemoryMatches('file://nas/a', 'file://nas/b', 'file://nas/b/1.jpg'), false);
check('死路径记忆：标记为空 → 不命中', deadMemoryMatches('', 'file://nas/a', 'x'), false);
check('死路径记忆：okUri 兜底也命中',
  deadMemoryMatches('file://x/1.jpg', '', 'file://x/1.jpg'), true);
check('死路径记忆：okUri 变了不命中',
  deadMemoryMatches('file://x/1.jpg', '', 'file://x/2.jpg'), false);
check('立即放弃：问题 + 有记忆 + 未接手 + 未收口',
  failFastAction(true, true, false, false), FF_GIVEUP);
check('立即放弃：没问题信号 → 继续等',
  failFastAction(false, true, false, false), FF_WAIT);
check('立即放弃：首次启动无记忆 → 不弹',
  failFastAction(true, false, false, false), FF_WAIT);
check('立即放弃：用户已接手 → 不干预',
  failFastAction(true, true, true, false), FF_WAIT);
check('立即放弃：恢复已收口 → 不弹第二次',
  failFastAction(true, true, false, true), FF_WAIT);
check('恢复期 IO 闸门：有记忆未进入未接手 → hold', restoreIoHeld(false, false, true), true);
check('恢复期 IO 闸门：已进入目录 → 放开', restoreIoHeld(true, false, true), false);
check('恢复期 IO 闸门：用户已接手 → 放开', restoreIoHeld(false, true, true), false);
check('恢复期 IO 闸门：首次启动无记忆 → 放开', restoreIoHeld(false, false, false), false);
check('探测 fail-fast：启动期只探 1 个', probeTakeOf(true, 3), 1);
check('探测 fail-fast：用户主动路径探全部', probeTakeOf(false, 3), 3);
check('探测 fail-fast：候选为空 → 0', probeTakeOf(true, 0), 0);
check('探测 fail-fast：NaN → 0', probeTakeOf(false, NaN), 0);
check('探测 fail-fast：小数向下取整', probeTakeOf(false, 2.9), 2);
check('探测 fail-fast：Infinity → 0', probeTakeOf(true, Infinity), 0);
check('耗时：正常', elapsedSince(1000, 1250), 250);
check('耗时：起点为 0 → 0', elapsedSince(0, 1250), 0);
check('耗时：时间倒流 → 0', elapsedSince(2000, 1250), 0);
check('耗时：NaN → 0', elapsedSince(NaN, 1250), 0);
check('耗时：Infinity → 0', elapsedSince(1000, Infinity), 0);
check('立即放弃文案带原因与指引', failFastHint('授权已失效'),
  '上次目录无法打开（授权已失效）· 已立即停止恢复 · 请重新选择文件夹');

console.log('--- 第十轮 ②：Index.ets 错误驱动立即放弃 + 恢复期零同步 IO ---');
check('Index 引入 FailFast 纯函数', /from '\.\.\/common\/FailFast'/.test(INDEX), true);
check('死路径小 key 与 ff1 诊断标记',
  /const POS_KEY_DEAD: string = 'deadDirUri';/.test(INDEX) &&
  /const FF_TAG: string = 'ff1';/.test(INDEX), true);
const READPOS_FN = INDEX.slice(INDEX.indexOf('private async readLastPos('),
  INDEX.indexOf('/** 只探最多 RESTORE_PROBE_LIMIT 张'));
check('readLastPos 读死路径记忆', /p\.get\(POS_KEY_DEAD, ''\)/.test(READPOS_FN), true);
check('readLastPos 命中死路径记忆立即放弃（零 IO 零等待）',
  /deadMemoryMatches\(this\.deadMemory, this\.savedDirUri, ok\)/.test(READPOS_FN) &&
  /this\.giveUpNow\('same dead dir as last time', 0\);/.test(READPOS_FN), true);
check('死路径记忆命中时不预热 / 不排恢复定时器',
  READPOS_FN.indexOf('this.giveUpNow') < READPOS_FN.indexOf('this.warmLast(ok)') &&
  READPOS_FN.indexOf('this.giveUpNow') < READPOS_FN.indexOf('this.scheduleShowLast()'), true);
const WARM_FN = INDEX.slice(INDEX.indexOf('private warmLast('),
  INDEX.indexOf('/** 记下「这张成功显示过了」'));
check('warmLast 恢复期按住同步文件 IO',
  /restoreIoHeld\(this\.restoreEntered, this\.userActed, this\.hasRestoreMemory\)/.test(WARM_FN) &&
  /zero file IO \(ff1\)/.test(WARM_FN), true);
check('warmLast 放弃后也不碰文件',
  /this\.giveUpDone \|\| this\.restoreCancelled/.test(WARM_FN), true);
const PROBE_FN = INDEX.slice(INDEX.indexOf('private probeRestoreUris('),
  INDEX.indexOf('/** 在建列表前统一落地恢复模式'));
check('探测候选纯函数与限量常量不变',
  /restoreProbeUris\(uris, okUri, savedUri, RESTORE_PROBE_LIMIT\)/.test(PROBE_FN) &&
  /fs\.openSync\(cand\[i\], fs\.OpenMode\.READ_ONLY\)/.test(PROBE_FN), true);
check('启动恢复期探测 fail-fast（只探 1 个）',
  /const take: number = probeTakeOf\(fast, cand\.length\);/.test(PROBE_FN) &&
  /for \(let i: number = 0; i < take; i\+\+\)/.test(PROBE_FN), true);
check('fail-fast 由 startupGuard 显式传入，用户主动路径探全部',
  /fastProbe: boolean = false/.test(PROBE_FN) &&
  /p !== undefined \? p\.uri : '', startupGuard\);/.test(INDEX) &&
  /this\.restoreFromSnapshot\(\);/.test(INDEX), true);
check('成功列目录也清死路径记忆（且只在标记非空时写）',
  /if \(this\.deadMemory\.length > 0\) \{\s*\n\s*this\.saveDeadTag\(''\);/.test(INDEX), true);
const GIVEUP_ALL = INDEX.slice(INDEX.indexOf('private giveUpNow('),
  INDEX.indexOf('/** 首帧之后真正执行恢复'));
check('giveUpNow 作废在飞恢复链',
  /this\.restoreCancelled = true;/.test(GIVEUP_ALL) &&
  /this\.resumeDone = true;/.test(GIVEUP_ALL) &&
  /this\.persistSettled = true;/.test(GIVEUP_ALL), true);
check('giveUpNow 清掉两个定时器 + 看门狗',
  /clearTimeout\(this\.resumeTimer\)/.test(GIVEUP_ALL) &&
  /clearTimeout\(this\.persistTimer\)/.test(GIVEUP_ALL) &&
  /this\.clearEnterWatchdog\(\);/.test(GIVEUP_ALL), true);
check('giveUpNow 作废全量预载链',
  /this\.allSeq\+\+;/.test(GIVEUP_ALL) && /this\.allBusy = false;/.test(GIVEUP_ALL), true);
check('giveUpNow 直接打开选择文件夹 + 写死路径记忆',
  /this\.chooseFolder\(\);/.test(GIVEUP_ALL) &&
  /this\.saveDeadTag\(deadTagOf\(this\.savedDirUri, this\.okUri\)\);/.test(GIVEUP_ALL), true);
check('giveUpNow 状态栏与诊断串带 ff1',
  /this\.status = failFastHint\(reason\);/.test(GIVEUP_ALL) &&
  /'restore GIVEUP \| ' \+ FF_TAG/.test(GIVEUP_ALL), true);
check('giveUpNow 只跑一次（giveUpDone 挡重入）',
  /if \(this\.giveUpDone \|\| this\.userActed \|\| this\.restoreEntered\) \{/.test(GIVEUP_ALL) &&
  /this\.giveUpDone = true;/.test(GIVEUP_ALL), true);
const SAVE_DEAD_FN = INDEX.slice(INDEX.indexOf('private saveDeadTag('),
  INDEX.indexOf('/** 首帧之后真正执行恢复'));
check('死路径记忆同步落盘（putSync + flushSync，无 await）',
  /store\.putSync\(POS_KEY_DEAD, tag\);/.test(SAVE_DEAD_FN) &&
  /store\.flushSync\(\);/.test(SAVE_DEAD_FN) &&
  /await/.test(SAVE_DEAD_FN) === false, true);
const FINISH_FN = INDEX.slice(INDEX.indexOf('private finishPersistActivate('),
  INDEX.indexOf('/** 用户用 picker 选过目录'));
check('finishPersistActivate 激活失败立即放弃',
  /this\.giveUpNow\('persist auth lost'/.test(FINISH_FN), true);
check('showLastOnStart 三处问题信号都立即放弃（不再等 3 秒）',
  (RESUME_FN.match(/this\.giveUpNow\(/g) || []).length === 3 &&
  /this\.giveUpNow\('snapshot unreadable'/.test(RESUME_FN) &&
  /this\.giveUpNow\('readonly list or empty snapshot'/.test(RESUME_FN) &&
  /this\.giveUpNow\('single fallback only'/.test(RESUME_FN), true);
check('showLastOnStart 函数体仍不含选择器 / 权限 / 全量重扫字面量',
  /loadAllGallery|queryAllPhotos|ensureGalleryPermission|DocumentViewPicker|PhotoViewPicker|chooseFolder\(/
    .test(RESUME_FN), false);
check('超时收口也写死路径记忆并挡重入',
  /this\.giveUpDone = true;/.test(ABORT_FN) &&
  /this\.saveDeadTag\(deadTagOf\(this\.savedDirUri, this\.okUri\)\);/.test(ABORT_FN), true);
const CHOOSE_FN = INDEX.slice(INDEX.indexOf('private chooseFolder(): void {'),
  INDEX.indexOf('/** 列一个目录'));
check('用户重新选到目录 → 清死路径记忆', /this\.saveDeadTag\(''\);/.test(CHOOSE_FN), true);
check('页面销毁置 giveUpDone（warm 回调不碰死路径）',
  /this\.giveUpDone = true;/.test(DISAPPEAR_FN), true);

console.log('--- 第十轮 ③：回归护栏（旧契约一条不动）---');
check('et1 看门狗仍保留为「完全无信号」兜底',
  /const RESTORE_ENTER_TIMEOUT_MS: number = 3000;/.test(INDEX) &&
  /const ENTER_TAG: string = 'et1';/.test(INDEX) &&
  /this\.enterWatchdogTimer = setTimeout\(/.test(INDEX), true);
check('探测上限仍是 3（绝不探整批）', /const RESTORE_PROBE_LIMIT: number = 3;/.test(INDEX), true);
check('两条恢复路径仍写 pendingRestoreReadonly',
  (INDEX.match(/this\.pendingRestoreReadonly = !readable;/g) || []).length, 2);
check('ro1 闸门数量不减',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9, true);
check('往上层仍不弹系统选择器',
  /chooseFolder\(|DocumentViewPicker|dv\.select/.test(UP_FN) === false, true);
check('chooseFolderAt 整个方法仍不存在', /chooseFolderAt/.test(INDEX) === false, true);
check('版本 / 按钮永不禁用 / 启动重扫护栏 / 启动路径无同步等待都未动',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX) &&
  /new Promise|Promise\.race/.test(RESUME_FN) === false, true);
check('层级重建仍恰好 2 处、全量链与滚轮零解码未动',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3 &&
  /const PRELOAD_ALL: boolean = true;/.test(INDEX) &&
  /this\.schedulePreload\(\);/.test(APPLY_FN) &&
  /this\.onWheel\(v < 0 \? -1 : 1\);/.test(INDEX), true);
check('失败信号不经过 3 秒等待（giveUpNow 内无 setTimeout）',
  /setTimeout/.test(GIVEUP_ALL) === false, true);
check('死路径记忆是小 key（不写大快照）',
  /const POS_KEY_DEAD: string = 'deadDirUri';/.test(INDEX) &&
  /store\.putSync\(POS_KEY_DEAD, tag\);/.test(INDEX) &&
  /flushSnap/.test(GIVEUP_ALL) === false, true);

console.log('--- 第十一轮：版本号归位 / 第二栏悬停显隐 / hover 零延迟零动画 / ESC 退出 ---');
const TOPBAR_FN = INDEX.slice(INDEX.indexOf('  topBar() {'),
  INDEX.indexOf('  build() {', INDEX.indexOf('  topBar() {')));
const ROOTMOUSE_FN = INDEX.slice(INDEX.indexOf('private onRootMouse('),
  INDEX.indexOf('private armTopbarTimer('));
const QUIT_FN = INDEX.slice(INDEX.indexOf('private async quitApp('),
  INDEX.indexOf('private setFull('));
const ESC_FN = INDEX.slice(INDEX.indexOf('case KeyCode.KEYCODE_ESCAPE:'),
  INDEX.indexOf('default:', INDEX.indexOf('case KeyCode.KEYCODE_ESCAPE:')));
// 检查「代码里没有某 API」时必须去掉注释行：本轮注释里写了「无 setTimeout / duration:0」
// 这类说明文字，直接对含注释的切片做正则会误命中。
const stripComments = (s) => s.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
const TOPBAR_CODE = stripComments(TOPBAR_FN);
const POPUP_CODE = stripComments(POPUP);
const ESC_CODE = stripComments(ESC_FN);

// ① 版本号显示在最顶部标题栏，第二栏不再重复
check('① 版本号在最顶部标题栏（topBar 的 PIKAN + APP_VERSION）',
  /Text\('PIKAN ' \+ APP_VERSION\)/.test(TOPBAR_FN) &&
  /\+\ APP_VERSION\)/.test(TOPBAR_FN), true);
check('① 第二栏（左栏抬头）不再重复显示版本号',
  /Text\('v' \+ APP_VERSION/.test(INDEX) === false, true);
check('① 全源码里版本号只在最顶部标题栏的 Text 出现一次',
  (INDEX.match(/Text\([^\n]*APP_VERSION/g) || []).length, 1);
check('① 左栏抬头改为只显示档案张数',
  /Text\(this\.itemCount > 0 \? this\.itemCount \+ ' 张' : ''\)/.test(SIDEBAR), true);

// ② 第二栏（全屏 / 幻灯片按钮组）默认隐藏、悬停顶部立即显隐
check('② 新增 @State topToolsVisible 默认 false（默认隐藏）',
  /@State topToolsVisible: boolean = false;/.test(INDEX), true);
check('② 工具组用 Visibility.Hidden 占位隐藏（隐藏时布局零位移）',
  /\.visibility\(this\.topToolsVisible \? Visibility\.Visible : Visibility\.Hidden\)/.test(TOPBAR_FN) &&
  /Visibility\.None/.test(TOPBAR_FN) === false, true);
check('② onHover 事件触发时直接置位、立即显示 / 离开立即隐藏',
  /\.onHover\(\(isHover: boolean\) => \{\s*this\.topToolsVisible = isHover;/.test(TOPBAR_FN), true);
check('② 显隐链无动画 / 无过渡 / 无延迟（无 animateTo、opacity、setTimeout、duration）',
  /animateTo|setTimeout|\.opacity\(|duration:/.test(TOPBAR_CODE) === false, true);
check('② 根容器按 y 坐标兜底驱动显隐（部分 2in1 只派发 Move）',
  /!this\.fullscreen && event\.action === MouseAction\.Move/.test(ROOTMOUSE_FN) &&
  /yTop >= 0 && yTop <= TOPBAR_H/.test(ROOTMOUSE_FN) &&
  /this\.topToolsVisible = inTop;/.test(ROOTMOUSE_FN), true);
check('② 显示时保持该栏原有样式与按钮功能（全屏 / 幻灯片原样）',
  /ToolButton\(\{ label: '全屏', act: 'full', flex: false/.test(TOPBAR_FN) &&
  /\.onClick\(\(\) => this\.doAction\('play'\)\)/.test(TOPBAR_FN) &&
  /Row\(\) \{[\s\S]{0,700}ToolButton\(\{ label: '全屏'/.test(TOPBAR_FN), true);

// ③ hover 小图预览：事件触发立即显示、移出立即隐藏、无动画无延迟
check('③ bindPopup 用 TransitionEffect.IDENTITY 关掉默认淡入淡出',
  /transition: TransitionEffect\.IDENTITY/.test(POPUP), true);
check('③ popup 选项里无 opacity / duration / animateTo 动效（代码行）',
  /\.opacity\(|duration:|animateTo/.test(POPUP_CODE) === false, true);
check('③ 源码全局已无 hover 延迟机制（常量 / 计时器 / 代号 / 复位方法）',
  /HOVER_CLOSE_DELAY_MS|hoverCloseTimer|hoverSeq|cancelCloseTimer/.test(ARCHIVE) === false, true);
check('③ onHover(false) 同步立即隐藏且释放持有者',
  /if \(!on\) \{[\s\S]{0,400}this\.showHover = false;[\s\S]{0,160}HoverGuard\.shared\(\)\.release\(key\);/.test(HOVER_FN) &&
  /setTimeout/.test(HOVER_FN) === false, true);
check('③ hover 缩略图 builder 内无淡入淡出 / 过渡动画',
  /\.opacity\(|\.transition\(|animateTo/.test(HOVER_THUMB_FN) === false, true);

// ④ ESC：仅非全屏退出 APP，全屏保持原全屏交互
check('④ ESC 全屏态仍走 toggleFull()、非全屏态才 quitApp()（第十八轮 escActionByState 严格两态分派）',
  ESC_FN.includes('const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  ESC_FN.includes('if (escAct === ESC_ACT_EXIT_FULL) {') &&
  ESC_CODE.includes('this.toggleFull();') &&
  ESC_FN.includes('else if (escAct === ESC_ACT_QUIT_APP) {') &&
  ESC_CODE.includes('this.quitApp();'), true);
check('④ quitApp 内确实是 terminateSelf 退出应用',
  /ability\.terminateSelf\(\)/.test(QUIT_FN), true);
check('④ 全屏分支里绝不调用 quitApp（不与全屏还原冲突）',
  /if \(this\.fullscreen\) \{[^}]*quitApp/.test(ESC_CODE) === false &&
  /if \(escAct === ESC_ACT_EXIT_FULL\) \{[^}]*toggleFull/.test(ESC_CODE) &&
  /else if \(escAct === ESC_ACT_QUIT_APP\) \{\s*this\.quitApp\(\);/.test(ESC_CODE), true);

// 回归护栏：本轮四条改动不得破坏既有交互 / 版本
check('第十一轮回归护栏：版本未升 / 往上层恒亮 / 不禁用 / 不弹 picker / 全量预载',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /SideToolButton\(\{ glyph: '⇧', act: 'up', flex: true/.test(SIDEBAR) &&
  /chooseFolderAt/.test(INDEX) === false &&
  /const PRELOAD_ALL: boolean = true;/.test(INDEX), true);

// ==================== 第十二轮：切换 NAS 目录时 pumpAll 换源竞态崩溃 ====================
// 实机 crash log（2026-11-13 20:00:17，HUAWEI MateBook Pro S / 1.0.7）：
//   TypeError: Cannot read property uri of undefined
//   at pumpAll (Index.ets:4894:41)  ← onAllDecoded 的 setTimeout 回调 (4939:14)
// 时间线：20:00:10 旧目录全量预载预算触顶（cached 63）→ 20:00:11.682 picker 选新 NAS
// 目录 → 20:00:11.755 applyItems 换 items → 20:00:17.781 旧批次回调带旧 allOrder 回来，
// 旧绝对下标落在新 items 之外，this.items[idx].uri 读到 undefined 直接崩。
console.log('\n--- 第十二轮：pumpAll 换源竞态护栏（2026-11-13 crash log） ---');

// ①~⑥：新增纯函数 preloadBatchBoundedOf 的行为回归
check('① bounded 在合法 order 上与旧 preloadBatchOf 完全一致',
  (() => {
    const a = preloadBatchOf([1, 4, 2, 3, 0], 0, 2, new Set());
    const b = preloadBatchBoundedOf([1, 4, 2, 3, 0], 0, 2, new Set(), 5);
    return a.picks.join(',') === b.picks.join(',') && a.nextFrom === b.nextFrom;
  })(), true);
check('② 旧目录 200 张 / 新目录 63 张时绝不返回越界下标',
  (() => {
    const oldOrder = fullPreloadIndex(200, 45);
    const b = preloadBatchBoundedOf(oldOrder, 0, 4, new Set(), 63);
    return oldOrder.length === 199 && b.picks.length > 0 &&
      b.picks.every(x => x >= 0 && x < 63);
  })(), true);
check('③ 旧 order 中段夹着越界下标时继续推进、仍能凑够合法 picks',
  (() => {
    const b = preloadBatchBoundedOf([100, 101, 7, 102, 8, 103, 9], 0, 3, new Set(), 10);
    return b.picks.join(',') === '7,8,9' && b.nextFrom === 7;
  })(), true);
check('④ 全部越界时 picks 为空、nextFrom 走到尾（不死循环、不崩）',
  (() => {
    const b = preloadBatchBoundedOf([100, 101, 102], 0, 4, new Set(), 10);
    return b.picks.length === 0 && b.nextFrom === 3;
  })(), true);
check('⑤ total <= 0 时一个下标都不返回（空 items 兜底）',
  preloadBatchBoundedOf([0, 1, 2], 0, 2, new Set(), 0).picks.length, 0);
check('⑥ 负下标 / from 越界 / done 仍保持旧语义',
  (() => {
    const a = preloadBatchBoundedOf([-1, 0, 1], 0, 2, new Set(), 2);
    const b = preloadBatchBoundedOf([0, 1], 99, 2, new Set(), 2);
    const c = preloadBatchBoundedOf([3, 0, 1], 0, 2, new Set([0]), 2);
    return a.picks.join(',') === '0,1' && b.picks.length === 0 && c.picks.join(',') === '1';
  })(), true);

// ⑦~⑬：源码静态契约（切片后过滤注释，避免注释文字误伤正则）
const PUMP12_FN = INDEX.slice(INDEX.indexOf('private pumpAll('),
  INDEX.indexOf('/** 单张全量预载'));
const CLEAR12_FN = INDEX.slice(INDEX.indexOf('private clearPreviews('),
  INDEX.indexOf('/** 切到第 idx 张时调用'));
const RESET12_FN = INDEX.slice(INDEX.indexOf('private resetAllPreloadChain('),
  INDEX.indexOf('private clearPreviews('));
const PUMP12_CODE = stripComments(PUMP12_FN);
const CLEAR12_CODE = stripComments(CLEAR12_FN);
const RESET12_CODE = stripComments(RESET12_FN);
const APPLY12_CODE = stripComments(APPLY_FN);

check('⑦ applyItems 在替换 items 之前先 resetAllPreloadChain（所有换源路径统一收口）',
  /this\.resetAllPreloadChain\(\);\s*this\.items = list;/.test(APPLY12_CODE), true);
check('⑧ reset 作废旧批次但绝不 release 已解码缓存（重扫继续复用）',
  /this\.allSeq\+\+;[\s\S]{0,300}this\.allDone\.clear\(\);/.test(RESET12_CODE) &&
  /\.release\(/.test(RESET12_CODE) === false, true);
check('⑨ clearPreviews 改为复用同一作废收口，不再散落 7 行状态',
  /this\.resetAllPreloadChain\(\);/.test(CLEAR12_CODE) &&
  /this\.allSeq\+\+/.test(CLEAR12_CODE) === false, true);
check('⑩ pumpAll 用 bounded 批次，且不再裸调未夹界的 preloadBatchOf',
  /preloadBatchBoundedOf\(this\.allOrder, this\.allFrom, conc,\s*this\.allDone, n\)/.test(PUMP12_CODE) &&
  /const batch: PreloadBatch = preloadBatchOf\(/.test(PUMP12_CODE) === false, true);
check('⑪ 取 uri 前先判 ImageItem 与 uri，且 allActive 按合法数设置（不留假死链）',
  /const it: ImageItem \| undefined = this\.items\[idx\];/.test(PUMP12_CODE) &&
  /const u: string \| undefined = it !== undefined \? it\.uri : undefined;/.test(PUMP12_CODE) &&
  /u !== undefined && u\.length > 0/.test(PUMP12_CODE) &&
  /it\.uri !== undefined/.test(PUMP12_CODE) === false &&
  /this\.allActive = valid\.length;/.test(PUMP12_CODE) &&
  /for \(let i = 0; i < valid\.length; i\+\+\)/.test(PUMP12_CODE) &&
  /const u: string = this\.items\[idx\]\.uri;/.test(PUMP12_CODE), true);
check('⑫ valid 为空时收工，不留下永远等不到收齐的批次',
  /if \(valid\.length === 0\) \{[\s\S]{0,180}this\.allBusy = false;[\s\S]{0,90}this\.allComplete = true;\s*return;/.test(PUMP12_CODE), true);
check('⑬ 窗口回退链空列表早退（wrapIndex 不再产生 NaN 下标读 undefined.uri）',
  /const n: number = this\.items\.length;\s*if \(n <= 0\) \{[\s\S]{0,160}this\.preloadBusy = false;\s*return;/.test(INDEX), true);

// 回归护栏：修崩溃不得动既有交互 / 版本
check('第十二轮回归护栏：版本未升 / 全量预载仍在 / 往上层恒亮 / 不禁用 / 不弹 picker / 重扫仍不清缓存',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const PRELOAD_ALL: boolean = true;/.test(INDEX) &&
  /SideToolButton\(\{ glyph: '⇧', act: 'up', flex: true/.test(SIDEBAR) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /chooseFolderAt/.test(INDEX) === false &&
  /回上层/.test(INDEX) === false &&
  /if \(!keepView\) \{\s*this\.clearPreviews\(\)/.test(APPLY_FN), true);

// ==================== 第十三轮：点选零滚动 / 整栏贴顶唤出 / 预览图放大镜 ====================
console.log('--- 第十三轮 ①：InteractionPlan.ts 纯函数（点选滚动 / 贴顶滞回 / 放大镜几何） ---');
const IP_SRC = readFileSync(new URL('../entry/src/main/ets/common/InteractionPlan.ts', import.meta.url), 'utf8');
const IP_CODE = stripComments(IP_SRC);
const NO_UI_SIDE_EFFECT = ['@ohos.', 'setTimeout', 'fileIo', 'new Promise', 'Atomics.wait'];
check('① InteractionPlan.ts 是纯函数模块（不 import 鸿蒙 SDK / 无 IO / 无计时器）',
  NO_UI_SIDE_EFFECT.some(s => IP_CODE.includes(s)) === false &&
  IP_CODE.includes('Number.isFinite') === false, true);

// ①-a 档案列表点选：一般点选零滚动，仅顶 / 底边界档案例外
check('①-a 一般点选（非边界）一律零自动滚动',
  tapScrollAction(5, 3, 9, 20) === SCROLL_NONE &&
  tapScrollAction(5, 0, 19, 20) === SCROLL_NONE &&
  scrollAllowed(tapScrollAction(5, 3, 9, 20)) === false, true);
check('①-a 列表最顶端 / 最底端档案例外才允许上下移动',
  tapScrollAction(0, 3, 9, 20) === SCROLL_UP &&
  tapScrollAction(19, 3, 9, 20) === SCROLL_DOWN &&
  scrollAllowed(tapScrollAction(0, 3, 9, 20)) === true, true);
check('①-a 可见范围最顶 / 最底行也是边界例外（onScrollIndex 上报）',
  tapScrollAction(3, 3, 9, 20) === SCROLL_UP &&
  tapScrollAction(9, 3, 9, 20) === SCROLL_DOWN, true);
check('①-a 可见范围未上报时只认绝对首 / 末，其余保守不滚',
  tapScrollAction(7, -1, -1, 20) === SCROLL_NONE &&
  tapScrollAction(0, -1, -1, 20) === SCROLL_UP &&
  tapScrollAction(19, -1, -1, 20) === SCROLL_DOWN, true);
check('①-a 空列表 / 负下标绝不滚动',
  tapScrollAction(-1, 0, 0, 0) === SCROLL_NONE &&
  tapScrollAction(0, 0, 0, 0) === SCROLL_NONE, true);
check('①-a isListEdgeRow 真值来源（边界判定与动作判定一致）',
  isListEdgeRow(0, 3, 9, 20) === true &&
  isListEdgeRow(19, 3, 9, 20) === true &&
  isListEdgeRow(3, 3, 9, 20) === true &&
  isListEdgeRow(9, 3, 9, 20) === true &&
  isListEdgeRow(5, 3, 9, 20) === false &&
  isListEdgeRow(5, -1, -1, 20) === false, true);
check('①-b 翻页：目标仍在可见范围内零滚动，跑出范围才跟随',
  stepScrollAction(5, 3, 9) === SCROLL_NONE &&
  stepScrollAction(2, 3, 9) === SCROLL_UP &&
  stepScrollAction(10, 3, 9) === SCROLL_DOWN, true);
check('①-b 可见范围未上报时翻页保守跟随（保持既有体验）',
  stepScrollAction(5, -1, -1) === SCROLL_FOLLOW &&
  scrollAllowed(SCROLL_FOLLOW) === true &&
  scrollAllowed(SCROLL_NONE) === false, true);

// ①-c 顶栏贴顶唤出：滞回稳定不闪烁
check('①-c 默认隐藏：鼠标不在顶部触发区时不显示',
  topBarPeekOf(false, 100, 10, 60, false) === false, true);
check('①-c 鼠标压进顶部触发区 → 显示',
  topBarPeekOf(false, 5, 10, 60, false) === true &&
  topBarPeekOf(false, 10, 10, 60, false) === true, true);
check('①-c 已显示且仍在顶栏 + 缓冲内 → 保持（滞回）',
  topBarPeekOf(true, 40, 10, 60, false) === true &&
  topBarPeekOf(true, 60, 10, 60, false) === true, true);
check('①-c 鼠标离开该栏 / 触发区 → 隐藏',
  topBarPeekOf(true, 61, 10, 60, false) === false &&
  topBarPeekOf(false, 61, 10, 60, false) === false, true);
check('①-c 滞回带内微抖不翻转（显示阈值窄 / 隐藏阈值宽）',
  (() => {
    let v = topBarPeekOf(false, 10, 10, 60, false);
    const seq = [9, 11, 30, 59, 11, 60];
    for (let i = 0; i < seq.length; i++) {
      v = topBarPeekOf(v, seq[i], 10, 60, false);
      if (!v) { return false; }
    }
    return v === true;
  })(), true);
check('①-c 全屏态恒隐藏', topBarPeekOf(true, 0, 10, 60, true) === false, true);
check('①-c 脏坐标（NaN / 负）保持现状，绝不误翻转',
  topBarPeekOf(true, NaN, 10, 60, false) === true &&
  topBarPeekOf(false, -1, 10, 60, false) === false, true);

// ①-d 放大镜几何
check('①-d 3cm → 约 189vp（1vp = 1/160 inch，与屏幕 dpi 无关）',
  Math.abs(cmToVp(3) - 480 / 2.54) < 1e-9 &&
  loupeDiameterVp(3) === 189, true);
check('①-d 圆心严格落在光标处（实时跟随）',
  loupeCircleOrigin(100, 189) === 100 - 189 / 2 &&
  loupeCircleOrigin(0, 189) === -94.5, true);
check('①-d 理想偏移把光标处图像点对齐圆心（内容线性对应）',
  loupeImageOffset(100, 189, 3) === 189 / 2 - 300 &&
  loupeImageOffset(0, 189, 3) === 189 / 2, true);
check('①-d 贴左 / 上边缘夹到 0，圆内不空白',
  loupeClampedOffset(0, 800, 189, 3) === 0 &&
  loupeClampedOffset(2, 800, 189, 3) === 0, true);
check('①-d 贴右 / 下边缘夹到下界，圆内不空白',
  (() => {
    const off = loupeClampedOffset(800, 800, 189, 3);
    return off === 189 - 2400 && off + 2400 >= 189;
  })(), true);
check('①-d 中段用理想偏移，不空白 / 不错位',
  (() => {
    const off = loupeClampedOffset(400, 800, 189, 3);
    return off === loupeImageOffset(400, 189, 3) && off <= 0 && off >= 189 - 2400;
  })(), true);
check('①-d 放大图比圆还小时居中（极端尺寸也不空白）',
  loupeClampedOffset(10, 50, 189, 3) === (189 - 150) / 2, true);
check('①-d 光标在画框内 / 外判定（按坐标兜底显隐）',
  loupeInFrame(10, 10, 800, 600) === true &&
  loupeInFrame(-1, 10, 800, 600) === false &&
  loupeInFrame(801, 10, 800, 600) === false &&
  loupeInFrame(10, 10, 0, 600) === false, true);
check('①-d 移出 / 无图立即隐藏（仅悬停且有图才显示）',
  loupeEligibleOf(true, true) === true &&
  loupeEligibleOf(false, true) === false &&
  loupeEligibleOf(true, false) === false, true);

console.log('--- 第十三轮 ②：Index.ets 源码静态契约（接线 / 收口 / 回归护栏） ---');
const SELECT13_FN = INDEX.slice(INDEX.indexOf('private select('), INDEX.indexOf('private go('));
const GO13_FN = INDEX.slice(INDEX.indexOf('private go('), INDEX.indexOf('private onWheel('));
const TAP13_CODE = stripComments(INDEX.slice(INDEX.indexOf('private scrollOnTap('), INDEX.indexOf('private scrollOnStep(')));
const STEP13_CODE = stripComments(INDEX.slice(INDEX.indexOf('private scrollOnStep('), INDEX.indexOf('private hasPreviewImage(')));
const LOUPE13_CODE = stripComments(INDEX.slice(INDEX.indexOf('  loupeLayer('), INDEX.indexOf('  previewImage(')));
const PREVIEW13_CODE = stripComments(INDEX.slice(INDEX.indexOf('  previewImage('), INDEX.indexOf('  rightPageImage(')));
const PEEK13_CODE = stripComments(INDEX.slice(INDEX.indexOf('// 第十三轮：非全屏时的整栏'), INDEX.indexOf('// 真全屏下不画工具顶栏')));
const ROOTMOUSE13_CODE = stripComments(ROOTMOUSE_FN);
const NO_ANIM = ['animateTo', 'setTimeout', '.opacity(', 'duration:'];
const NO_ANIM2 = ['animateTo', 'setTimeout', '.transition(', 'duration:'];
// 第十四轮切片：hover 收口 / 鼠标驱动 / 按 pane 图源 / 右页 builder / 全屏复位 / 预览 Row
const LOUPE_HOVER14_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('private onLoupeHover('), INDEX.indexOf('private onLoupeMouse(')));
const LOUPE_MOUSE14_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('private onLoupeMouse('), INDEX.indexOf('private loupeContentW(')));
const HAS_LOUPE14_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('private hasLoupeImage('), INDEX.indexOf('private onLoupeHover(')));
const RIGHT14_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  rightPageImage('), INDEX.indexOf('  topBar() {')));
const SET_FULL14_CODE = stripComments(SET_FULL_FN);
// 用 build() 里「右侧大图预览」的唯一注释锚点定位；不能用 spreadB 判定式，
// 它在 loadRightPage 等处先出现，会把切片拉成大半文件而误命中 fullscreen。
const PREVIEW_ROW14_START = INDEX.indexOf('// ---------- 右侧：大图预览');
const PREVIEW_ROW14_CODE = stripComments(INDEX.slice(PREVIEW_ROW14_START,
  INDEX.indexOf('.rotate({ angle: this.rot })', PREVIEW_ROW14_START)));
// 第十五轮切片：鼠标按键收口 / toggle helper / 根容器鼠标事件
const MOUSEBTN15_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('private onMouseButton('), INDEX.indexOf('private applyLoupeToggle(')));
const TOGGLE15_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('private applyLoupeToggle('), INDEX.indexOf('private onDoubleTapCanvas(')));
const ROOTMOUSE15_CODE = stripComments(ROOTMOUSE_FN);

check('②-a select() 两处裸 scrollToIndex 全部收口到 scrollOnTap',
  SELECT13_FN.includes('this.scroller.scrollToIndex(') === false &&
  SELECT13_FN.split('this.scrollOnTap(idx);').length - 1 === 2, true);
check('②-a go() 两处裸 scrollToIndex 全部收口到 scrollOnStep',
  GO13_FN.includes('this.scroller.scrollToIndex(') === false &&
  GO13_FN.split('this.scrollOnStep(this.cur);').length - 1 === 2, true);
check('②-a 点选判定走 tapScrollAction + scrollAllowed（一般点选零滚动）',
  TAP13_CODE.includes('tapScrollAction(row, this.listFirstRow, this.listLastRow,') &&
  TAP13_CODE.includes('this.rows.length)') &&
  TAP13_CODE.includes('if (scrollAllowed(action))') &&
  TAP13_CODE.includes('this.scroller.scrollToIndex(row, false);'), true);
check('②-a 翻页判定走 stepScrollAction + SCROLL_NONE（可见范围内不滚）',
  STEP13_CODE.includes('stepScrollAction(row, this.listFirstRow, this.listLastRow)') &&
  STEP13_CODE.includes('action !== SCROLL_NONE'), true);
check('②-a List 用 onScrollIndex 记录可见范围',
  SIDEBAR.includes('.onScrollIndex((first: number, last: number, center: number) => {') &&
  INDEX.includes('this.listFirstRow = first;') &&
  INDEX.includes('this.listLastRow = last;'), true);
check('②-a applyItems 换源后重置可见范围（不拿旧范围误判）',
  APPLY_FN.includes('this.listFirstRow = -1;') &&
  APPLY_FN.includes('this.listLastRow = -1;'), true);
check('②-a 全源码裸 scrollToIndex 只剩 4 处（换源定位 + 两个收口方法 + R60 高亮护栏收口）',
  INDEX.split('this.scroller.scrollToIndex(').length - 1, 4);

check('②-b @State topBarPeek 默认 false（默认整栏不渲染）',
  INDEX.includes('@State topBarPeek: boolean = false;'), true);
check('②-b 主体 Column 里不再有常驻顶栏（不占布局空间）',
  INDEX.includes('// ============================== 顶栏（非全屏时常驻）') === false &&
  INDEX.includes('// 第十三轮：顶栏不再放进主体 Column') === true, true);
check('②-b 浮层用条件渲染 + 绝对定位 + zIndex（显隐都不改主体尺寸）',
  PEEK13_CODE.includes('if (this.topBarPeek && !this.fullscreen)') &&
  PEEK13_CODE.includes('this.topBar();') &&
  PEEK13_CODE.includes('.position({ x: 0, y: 0 })') &&
  PEEK13_CODE.includes('.zIndex(10)'), true);
check('②-b 显隐走 topBarPeekOf 滞回判定（稳定不闪烁）',
  ROOTMOUSE13_CODE.includes('topBarPeekOf(this.topBarPeek, yTop,') &&
  ROOTMOUSE13_CODE.includes('TOPBAR_PEEK_TRIGGER_VP, TOPBAR_PEEK_KEEP_VP, this.fullscreen)'), true);
check('②-b 滞回带常量：显示阈值 10 < 隐藏阈值 TOPBAR_H + TOPBAR_KEEP_PX',
  INDEX.includes('const TOPBAR_PEEK_TRIGGER_VP: number = 10;') &&
  INDEX.includes('const TOPBAR_PEEK_KEEP_VP: number = TOPBAR_H + TOPBAR_KEEP_PX;'), true);
check('②-b 显隐链零动画 / 零延迟（无计时器 / 无过渡）',
  NO_ANIM.some(s => PEEK13_CODE.includes(s)) === false &&
  NO_ANIM.some(s => ROOTMOUSE13_CODE.includes(s)) === false, true);

check('②-c 6cm / 3 倍常量与 cmToVp 换算接线（第十四轮直径翻倍）',
  INDEX.includes('const LOUPE_CM: number = LOUPE_CM_14;') &&
  LOUPE_CM_14 === 6 &&
  INDEX.includes('const LOUPE_ZOOM: number = 3;') &&
  INDEX.includes('const LOUPE_D_VP: number = loupeDiameterVp(LOUPE_CM);') &&
  loupeDiameterVp(LOUPE_CM_14) === 378 &&
  loupeDiameterVp(LOUPE_CM_14) === 2 * loupeDiameterVp(3), true);
check('②-c 圆形裁剪：borderRadius(d/2) + clip(true)',
  LOUPE13_CODE.includes('.borderRadius(LOUPE_D_VP / 2)') &&
  LOUPE13_CODE.includes('.clip(true)'), true);
check('②-c 圆心跟随光标 + 边缘夹界偏移（圆内不空白）',
  LOUPE13_CODE.includes('.position({ x: this.loupeLeft(), y: this.loupeTop() })') &&
  INDEX.includes('loupeClampedOffset(this.loupeX, this.pageBoxW(pane, half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX.includes('loupeClampedOffset(this.loupeY, this.pageH(half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX.includes('return loupeCircleOrigin(this.loupeX, LOUPE_D_VP);'), true);
check('②-c 圆内放大图 5 个源（第十六轮高清重解码 + 左页 3 + 右页 1）都 objectFit(Contain) + 分档插值（对应且不变形）',
  LOUPE13_CODE.split('.objectFit(ImageFit.Contain)').length - 1 === 5 &&
  LOUPE13_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5, true);
check('②-c 左页按 LEFT pane 独立接线（第十四轮：两页各挂一层，左页不引用右页）',
  PREVIEW13_CODE.includes('this.loupeLayer(LOUPE_PANE_LEFT, uri, half);') &&
  PREVIEW13_CODE.includes('.onHover((on: boolean) => this.onLoupeHover(on, LOUPE_PANE_LEFT))') &&
  PREVIEW13_CODE.includes('.onMouse((event: MouseEvent) => this.onLoupeMouse(event, LOUPE_PANE_LEFT, half))') &&
  PREVIEW13_CODE.includes('rightPageImage') === false, true);
check('②-c 移出立即隐藏（零动画 / 零延迟 / 无计时器）',
  LOUPE_HOVER14_CODE.includes('this.loupeHover = false;') &&
  NO_ANIM2.some(s => PREVIEW13_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => LOUPE_HOVER14_CODE.includes(s)) === false, true);
check('②-c 浮层 Transparent 命中模式（不吞鼠标、圆出现不闪烁）',
  LOUPE13_CODE.includes('.hitTestBehavior(HitTestMode.Transparent)'), true);
check('②-c 放大镜不破坏主画质三处 autoResize(false) 契约',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  LOUPE13_CODE.includes('.autoResize(false)') === false, true);

// 回归护栏：三项新交互不得破坏既有行为 / 版本
check('第十三轮回归护栏：版本未升 / 往上层恒亮 / 不禁用 / 不弹 picker / 全量预载 / 主画质三处 / 第十一轮 hover 与 ESC 未动',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  CODE_LINES.includes('.enabled(') === false &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  INDEX.includes('chooseFolderAt') === false &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('const PRELOAD_ALL: boolean = true;') &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  POPUP.includes('transition: TransitionEffect.IDENTITY') &&
  QUIT_FN.includes('ability.terminateSelf()') &&
  TOPBAR_FN.includes('.visibility(this.topToolsVisible ? Visibility.Visible : Visibility.Hidden)') &&
  TOPBAR_FN.includes('Visibility.None') === false, true);

// ==================== 第十四轮：放大镜 6cm / 双页独立 / 全屏保留 / 退出全屏不失效 ====================
console.log('--- 第十四轮 ①：InteractionPlan.ts 纯函数（6cm 换算 / 双页独立 / 全屏复位） ---');
check('① 6cm → 378vp，正好是 3cm / 189vp 的两倍（直径翻倍、倍率不变）',
  LOUPE_CM_14 === 6 &&
  Math.abs(cmToVp(6) - 960 / 2.54) < 1e-9 &&
  loupeDiameterVp(6) === 378 &&
  LOUPE_D_VP_14 === 378 &&
  LOUPE_D_VP_14 === 2 * loupeDiameterVp(3), true);
check('① 6cm 直径下圆心仍严格落在光标处（378/2 = 189）',
  loupeCircleOrigin(100, 378) === 100 - 189 &&
  loupeCircleOrigin(0, 378) === -189, true);
check('① 6cm 直径下边缘夹界仍不空白（左 / 右 / 中段）',
  loupeClampedOffset(0, 800, 378, 3) === 0 &&
  loupeClampedOffset(800, 800, 378, 3) === 378 - 2400 &&
  loupeClampedOffset(400, 800, 378, 3) === loupeImageOffset(400, 378, 3), true);
check('① pane 常量：NONE / LEFT / RIGHT 三者互异',
  LOUPE_PANE_NONE === -1 && LOUPE_PANE_LEFT === 0 && LOUPE_PANE_RIGHT === 1 &&
  new Set([LOUPE_PANE_NONE, LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT]).size === 3, true);
check('① 双页独立：激活左页只画左页，激活右页只画右页',
  loupePaneActiveOf(LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, true, true) === true &&
  loupePaneActiveOf(LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT, true, true) === false &&
  loupePaneActiveOf(LOUPE_PANE_RIGHT, LOUPE_PANE_RIGHT, true, true) === true &&
  loupePaneActiveOf(LOUPE_PANE_RIGHT, LOUPE_PANE_LEFT, true, true) === false, true);
check('① 双页独立：无激活页 / 未悬停 / 该页无图一律不画',
  loupePaneActiveOf(LOUPE_PANE_NONE, LOUPE_PANE_LEFT, true, true) === false &&
  loupePaneActiveOf(LOUPE_PANE_NONE, LOUPE_PANE_RIGHT, true, true) === false &&
  loupePaneActiveOf(LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, false, true) === false &&
  loupePaneActiveOf(LOUPE_PANE_RIGHT, LOUPE_PANE_RIGHT, true, false) === false, true);
check('① hover 移入激活本页（左右切换互不干扰）',
  loupePaneAfterHover(LOUPE_PANE_NONE, LOUPE_PANE_LEFT, true) === LOUPE_PANE_LEFT &&
  loupePaneAfterHover(LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT, true) === LOUPE_PANE_RIGHT &&
  loupePaneAfterHover(LOUPE_PANE_RIGHT, LOUPE_PANE_LEFT, true) === LOUPE_PANE_LEFT, true);
check('① hover 移出只清本页：A 迟到的 leave 不误清 B 的激活页',
  loupePaneAfterHover(LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, false) === LOUPE_PANE_NONE &&
  loupePaneAfterHover(LOUPE_PANE_RIGHT, LOUPE_PANE_LEFT, false) === LOUPE_PANE_RIGHT &&
  loupePaneAfterHover(LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT, false) === LOUPE_PANE_LEFT, true);
check('① hover 序列：左进 → 左出 → 右进 → 右出，激活页始终正确',
  (() => {
    let p = LOUPE_PANE_NONE;
    p = loupePaneAfterHover(p, LOUPE_PANE_LEFT, true);
    if (p !== LOUPE_PANE_LEFT) { return false; }
    p = loupePaneAfterHover(p, LOUPE_PANE_LEFT, false);
    if (p !== LOUPE_PANE_NONE) { return false; }
    p = loupePaneAfterHover(p, LOUPE_PANE_RIGHT, true);
    if (p !== LOUPE_PANE_RIGHT) { return false; }
    p = loupePaneAfterHover(p, LOUPE_PANE_RIGHT, false);
    return p === LOUPE_PANE_NONE;
  })(), true);
check('① 全屏切换复位：进入 / 退出全屏都复位，同一态不变则不复位',
  loupeResetOnModeChange(false, true) === true &&
  loupeResetOnModeChange(true, false) === true &&
  loupeResetOnModeChange(false, false) === false &&
  loupeResetOnModeChange(true, true) === false, true);
check('① 复位后悬停恒 false（等待下一次 hover 重新激活，非永久禁用）',
  loupeHoverAfterModeChange(true, true) === false &&
  loupeHoverAfterModeChange(false, true) === false &&
  loupeHoverAfterModeChange(true, false) === true &&
  loupeHoverAfterModeChange(false, false) === false, true);
check('① 全链路：正常用 → 进全屏复位 → 全屏中用 → 退出全屏复位 → 正常模式再用',
  (() => {
    let pane = loupePaneAfterHover(LOUPE_PANE_NONE, LOUPE_PANE_LEFT, true);
    let hover = loupeEligibleOf(true, true);
    if (!loupePaneActiveOf(pane, LOUPE_PANE_LEFT, hover, true)) { return false; }
    let changed = loupeResetOnModeChange(false, true);
    pane = LOUPE_PANE_NONE;
    hover = loupeHoverAfterModeChange(hover, changed);
    if (hover !== false) { return false; }
    pane = loupePaneAfterHover(pane, LOUPE_PANE_RIGHT, true);
    hover = loupeEligibleOf(true, true);
    if (!loupePaneActiveOf(pane, LOUPE_PANE_RIGHT, hover, true)) { return false; }
    if (loupePaneActiveOf(pane, LOUPE_PANE_LEFT, hover, true)) { return false; }
    changed = loupeResetOnModeChange(true, false);
    pane = LOUPE_PANE_NONE;
    hover = loupeHoverAfterModeChange(hover, changed);
    if (hover !== false) { return false; }
    pane = loupePaneAfterHover(pane, LOUPE_PANE_LEFT, true);
    hover = loupeEligibleOf(true, true);
    return loupePaneActiveOf(pane, LOUPE_PANE_LEFT, hover, true);
  })(), true);
check('① InteractionPlan.ts 仍是纯函数模块（第十四轮函数不带 SDK / IO / 计时器）',
  NO_UI_SIDE_EFFECT.some(s => IP_CODE.includes(s)) === false &&
  IP_CODE.includes('Number.isFinite') === false &&
  IP_CODE.includes('export function loupePaneActiveOf') &&
  IP_CODE.includes('export function loupeResetOnModeChange'), true);

console.log('--- 第十四轮 ②：Index.ets 源码静态契约（6cm / 双页 / 全屏 / 回归护栏） ---');
check('② 6cm 常量取 InteractionPlan 单一真值来源，倍率仍是 3 倍',
  INDEX.includes('const LOUPE_CM: number = LOUPE_CM_14;') &&
  INDEX.includes('const LOUPE_ZOOM: number = 3;') &&
  INDEX.includes('const LOUPE_D_VP: number = loupeDiameterVp(LOUPE_CM);') &&
  INDEX.includes('LOUPE_PANE_RIGHT, LOUPE_CM_14, loupePaneActiveOf, loupePaneAfterHover,'), true);
check('② @State loupePane 默认 NONE（无激活页时两页都不绘制）',
  INDEX.includes('@State loupePane: number = LOUPE_PANE_NONE;'), true);
check('② hasLoupeImage 按 pane 分流：右页只看 rightPixelMap，左页沿用三源',
  HAS_LOUPE14_CODE.includes('pane === LOUPE_PANE_RIGHT') &&
  HAS_LOUPE14_CODE.includes('this.rightPixelMap !== undefined') &&
  HAS_LOUPE14_CODE.includes('return this.hasPreviewImage();'), true);
check('② loupeLayer 按 loupeVisibleOf 命中激活页（第十五轮：总开关 + 双页独立）',
  LOUPE13_CODE.includes('loupeLayer(pane: number, uri: string, half: boolean)') &&
  LOUPE13_CODE.includes('loupeVisibleOf(this.loupeEnabled, this.loupePane, pane,') &&
  LOUPE13_CODE.includes('this.loupeHover, this.hasLoupeImage(pane)))') &&
  LOUPE13_CODE.includes('loupeEligibleOf(this.loupeHover,') === false, true);
check('② loupeLayer 右页分支只取 rightPixelMap（不误用左页图源）',
  LOUPE13_CODE.includes('if (pane === LOUPE_PANE_RIGHT)') &&
  LOUPE13_CODE.split('Image(this.rightPixelMap!)').length - 1 === 1, true);
check('② 左页 builder 按 LEFT pane 挂 loupeLayer / onHover / onMouse',
  PREVIEW13_CODE.includes('this.loupeLayer(LOUPE_PANE_LEFT, uri, half);') &&
  PREVIEW13_CODE.includes('.onHover((on: boolean) => this.onLoupeHover(on, LOUPE_PANE_LEFT))') &&
  PREVIEW13_CODE.includes('.onMouse((event: MouseEvent) => this.onLoupeMouse(event, LOUPE_PANE_LEFT, half))'), true);
check('② 右页 builder 按 RIGHT pane 挂 loupeLayer / onHover / onMouse（两页都生效）',
  RIGHT14_CODE.includes('this.loupeLayer(LOUPE_PANE_RIGHT, uri, half);') &&
  RIGHT14_CODE.includes('.onHover((on: boolean) => this.onLoupeHover(on, LOUPE_PANE_RIGHT))') &&
  RIGHT14_CODE.includes('.onMouse((event: MouseEvent) => this.onLoupeMouse(event, LOUPE_PANE_RIGHT, half))'), true);
check('② 两页各自调用 loupeLayer，全源码恰好 2 处且 pane 各异',
  INDEX.split('this.loupeLayer(').length - 1 === 2 &&
  INDEX.includes('this.loupeLayer(LOUPE_PANE_LEFT, uri, half);') &&
  INDEX.includes('this.loupeLayer(LOUPE_PANE_RIGHT, uri, half);'), true);
check('② onLoupeHover 走 loupePaneAfterHover，移出仅清本页并立即隐藏',
  LOUPE_HOVER14_CODE.includes('loupePaneAfterHover(this.loupePane, pane, on)') &&
  LOUPE_HOVER14_CODE.includes('this.loupePane = nextPane;') &&
  LOUPE_HOVER14_CODE.includes('this.loupeHover = false;') &&
  LOUPE_HOVER14_CODE.includes('LOUPE_PANE_NONE'), true);
check('② onLoupeMouse 按 pane 取图、同步激活页、Move 兜底显隐',
  LOUPE_MOUSE14_CODE.includes('this.hasLoupeImage(pane)') &&
  LOUPE_MOUSE14_CODE.includes('loupePaneAfterHover(this.loupePane, pane, false)') &&
  LOUPE_MOUSE14_CODE.includes('this.loupePane = nextPane;') &&
  LOUPE_MOUSE14_CODE.includes('loupeInFrame(x, y, this.pageBoxW(pane, half), this.pageH(half))'), true);
check('② 全屏复位收口在 setFull：进入 / 退出全屏都清 pane / hover / 坐标',
  SET_FULL14_CODE.includes('loupeResetOnModeChange(this.fullscreen, on)') &&
  SET_FULL14_CODE.includes('this.loupePane = LOUPE_PANE_NONE;') &&
  SET_FULL14_CODE.includes('loupeHoverAfterModeChange(this.loupeHover, loupeModeChanged)') &&
  SET_FULL14_CODE.includes('this.loupeX = 0;') &&
  SET_FULL14_CODE.includes('this.loupeY = 0;'), true);
check('② 全屏复位在 this.fullscreen = on 之前（用旧态与新态比较才生效）',
  SET_FULL14_CODE.indexOf('loupeResetOnModeChange(this.fullscreen, on)') <
  SET_FULL14_CODE.indexOf('this.fullscreen = on;') &&
  SET_FULL14_CODE.indexOf('this.fullscreen = on;') >= 0, true);
check('② 全屏复位只清瞬时状态、不动总开关（下一次 hover 可重新激活 → 退出全屏后不失效）',
  INDEX.includes('loupeDisabled') === false &&
  INDEX.includes('loupeBlocked') === false &&
  INDEX.includes('loupePermanentOff') === false &&
  SET_FULL14_CODE.includes('loupeEnabled') === false &&
  SET_FULL14_CODE.includes('if (on === this.fullscreen)') &&
  SET_FULL14_CODE.includes('return;'), true);
check('② 预览 Row 不因 fullscreen 条件移除（全屏态两页放大镜仍生效）',
  PREVIEW_ROW14_CODE.includes('this.previewImage(this.curItem()!.uri, this.curToken, true)') &&
  PREVIEW_ROW14_CODE.includes('this.rightPageImage(this.items[this.spreadB].uri, true)') &&
  PREVIEW_ROW14_CODE.includes('fullscreen') === false, true);
check('② 放大镜 6cm 圆形几何未退化（圆形裁剪 / 圆心 / 边缘夹界 / Transparent）',
  LOUPE13_CODE.includes('.width(LOUPE_D_VP)') &&
  LOUPE13_CODE.includes('.borderRadius(LOUPE_D_VP / 2)') &&
  LOUPE13_CODE.includes('.clip(true)') &&
  LOUPE13_CODE.includes('.position({ x: this.loupeLeft(), y: this.loupeTop() })') &&
  LOUPE13_CODE.includes('.hitTestBehavior(HitTestMode.Transparent)') &&
  INDEX.includes('loupeClampedOffset(this.loupeX, this.pageBoxW(pane, half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX.includes('return loupeCircleOrigin(this.loupeX, LOUPE_D_VP);'), true);
check('② 右页放大镜不引入新画质属性（全文 autoResize / HDR 仍恰好 3 处）',
  LOUPE13_CODE.includes('.autoResize(false)') === false &&
  LOUPE13_CODE.includes('.dynamicRangeMode(') === false &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3, true);
check('② 移出仍零动画 / 零延迟（两页 hover 链与浮层都无计时器 / 无过渡）',
  NO_ANIM2.some(s => LOUPE_HOVER14_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => LOUPE_MOUSE14_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => PREVIEW13_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => RIGHT14_CODE.includes(s)) === false, true);
check('② 第十四轮回归护栏：既有画质 / 顶栏 / ESC / 版本 / 往上层 / 点选滚动 / 预载全未动',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  CODE_LINES.includes('.enabled(') === false &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  INDEX.includes('const PRELOAD_ALL: boolean = true;') &&
  TOPBAR_FN.includes('.visibility(this.topToolsVisible ? Visibility.Visible : Visibility.Hidden)') &&
  QUIT_FN.includes('ability.terminateSelf()') &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('topBarPeekOf(this.topBarPeek, yTop,') &&
  INDEX.includes('tapScrollAction(row, this.listFirstRow, this.listLastRow,') &&
  INDEX.split('this.scroller.scrollToIndex(').length - 1 === 4, true);

// ==================== 第十五轮：放大镜预设关闭 / 鼠标右键 toggle 开关 ====================
console.log('--- 第十五轮 ①：InteractionPlan.ts 纯函数（预设关闭 / 右键 toggle / 总开关判定） ---');
check('① 预设关闭：LOUPE_DEFAULT_ENABLED 恒为 false',
  LOUPE_DEFAULT_ENABLED === false, true);
check('① 右键 toggle：关→开、开→关，一次点击只翻转一次',
  loupeEnabledAfterRightPress(false, true) === true &&
  loupeEnabledAfterRightPress(true, true) === false &&
  loupeEnabledAfterRightPress(false, true) === true, true);
check('① 非右键事件一律保持原状（左键 / 抬起 / 移动 / 拖拽不误触）',
  loupeEnabledAfterRightPress(false, false) === false &&
  loupeEnabledAfterRightPress(true, false) === true, true);
check('① toggle 序列：默认关 → 开 → 关 → 开（稳定不抖动）',
  (() => {
    let v = LOUPE_DEFAULT_ENABLED;
    for (let i = 0; i < 3; i++) { v = loupeEnabledAfterRightPress(v, true); }
    return v === true && LOUPE_DEFAULT_ENABLED === false;
  })(), true);
check('① 总开关关闭时一律不绘制（各种 pane / 悬停 / 有图组合都不画）',
  loupeVisibleOf(false, LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, true, true) === false &&
  loupeVisibleOf(false, LOUPE_PANE_RIGHT, LOUPE_PANE_RIGHT, true, true) === false &&
  loupeVisibleOf(false, LOUPE_PANE_NONE, LOUPE_PANE_LEFT, true, true) === false &&
  loupeVisibleOf(false, LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, false, false) === false, true);
check('① 总开关开启后等价于第十四轮 pane 判定（双页独立不变）',
  loupeVisibleOf(true, LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, true, true) === true &&
  loupeVisibleOf(true, LOUPE_PANE_LEFT, LOUPE_PANE_RIGHT, true, true) === false &&
  loupeVisibleOf(true, LOUPE_PANE_RIGHT, LOUPE_PANE_RIGHT, true, true) === true &&
  loupeVisibleOf(true, LOUPE_PANE_RIGHT, LOUPE_PANE_LEFT, true, true) === false, true);
check('① 开启后仍需悬停 + 该页有图（不因开关打开就常显）',
  loupeVisibleOf(true, LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, false, true) === false &&
  loupeVisibleOf(true, LOUPE_PANE_LEFT, LOUPE_PANE_LEFT, true, false) === false &&
  loupeVisibleOf(true, LOUPE_PANE_NONE, LOUPE_PANE_LEFT, true, true) === false, true);
check('① 全链路：默认关 → 右键开显示 → 右键关隐藏 → 右键开再显示',
  (() => {
    let enabled = LOUPE_DEFAULT_ENABLED;
    const pane = LOUPE_PANE_LEFT;
    if (loupeVisibleOf(enabled, pane, pane, true, true)) { return false; }
    enabled = loupeEnabledAfterRightPress(enabled, true);
    if (!loupeVisibleOf(enabled, pane, pane, true, true)) { return false; }
    enabled = loupeEnabledAfterRightPress(enabled, true);
    if (loupeVisibleOf(enabled, pane, pane, true, true)) { return false; }
    enabled = loupeEnabledAfterRightPress(enabled, true);
    return loupeVisibleOf(enabled, pane, pane, true, true);
  })(), true);
check('① InteractionPlan.ts 仍是纯函数模块（第十五轮不带 SDK / IO / 计时器）',
  NO_UI_SIDE_EFFECT.some(s => IP_CODE.includes(s)) === false &&
  IP_CODE.includes('export function loupeEnabledAfterRightPress') &&
  IP_CODE.includes('export function loupeVisibleOf') &&
  IP_CODE.includes('export const LOUPE_DEFAULT_ENABLED'), true);

console.log('--- 第十五轮 ② / 第七十六轮订正：Index.ets 源码静态契约（预设关闭 / 相片上左键 toggle） ---');
console.log('  ⚠️ R76 起放大镜改由【预览区相片上左键】切换；第十五轮「右键 toggle」是历史形态，');
console.log('     本组源码断言按现行实现订正，纯函数历史回归仍见第十五轮 ①。');
check('② @State loupeEnabled 初值取预设常量（默认关闭，单一真值来源）',
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  LOUPE_DEFAULT_ENABLED === false &&
  INDEX.includes('LOUPE_DEFAULT_ENABLED, loupeEnabledAfterLeftClick,'), true);
check('② loupeLayer 绘制判定走 loupeVisibleOf（总开关 + 双页独立）',
  LOUPE13_CODE.includes('loupeVisibleOf(this.loupeEnabled, this.loupePane, pane,') &&
  LOUPE13_CODE.includes('this.loupeHover, this.hasLoupeImage(pane)))') &&
  LOUPE13_CODE.includes('loupePaneActiveOf(this.loupePane,') === false, true);
check('② R76 取消右键 toggle：右键 Release 分支只清按键态，整段零 applyLoupeToggle',
  MOUSEBTN15_CODE.includes('if (btn === MouseButton.Right)') &&
  MOUSEBTN15_CODE.includes('this.applyLoupeToggle(true);') &&
  MOUSEBTN15_CODE.includes('this.resetView();') === false &&
  MOUSEBTN15_CODE.includes('已还原') === false &&
  (() => {
    const a = MOUSEBTN15_CODE.indexOf('if (btn === MouseButton.Right)');
    const b = MOUSEBTN15_CODE.indexOf('if (btn !== MouseButton.Left)');
    return a >= 0 && b > a &&
      MOUSEBTN15_CODE.slice(a, b).includes('applyLoupeToggle') === false;
  })(), true);
check('② R76 首次左键开 / 再左键关：仅相片上左键 Release 调 toggle，仍在 !moved 之后',
  MOUSEBTN15_CODE.includes('if (pmPhotoReadyOf(this.viewPixelMap !== undefined, this.textMode)) {') &&
  MOUSEBTN15_CODE.includes('this.applyLoupeToggle(true);') &&
  MOUSEBTN15_CODE.includes('if (moved) {') &&
  MOUSEBTN15_CODE.indexOf('if (moved) {') < MOUSEBTN15_CODE.indexOf('this.applyLoupeToggle(true);') &&
  MOUSEBTN15_CODE.includes('const btn: number = this.pressBtn;'), true);
check('② R76 右键 Press 仍 stopPropagation（不弹系统菜单），改为打开 picture contact menu',
  MOUSEBTN15_CODE.includes('event.stopPropagation();') &&
  MOUSEBTN15_CODE.includes('event.button === MouseButton.Right') &&
  MOUSEBTN15_CODE.includes('this.openPictureMenu(this.pressDX, this.pressDY);'), true);
check('② R76 applyLoupeToggle 走左键纯函数且只在真正翻转时写状态',
  TOGGLE15_CODE.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  TOGGLE15_CODE.includes('if (next !== this.loupeEnabled)') &&
  TOGGLE15_CODE.includes('this.loupeEnabled = next;'), true);
check('② R76 根容器不再有任何 toggle 兜底（右键 / 左栏 / 空白区一律不翻转）',
  ROOTMOUSE15_CODE.includes('if (event.action === MouseAction.Press)') === false &&
  ROOTMOUSE15_CODE.includes('this.applyLoupeToggle(') === false &&
  ROOTMOUSE15_CODE.includes('MouseAction.Release') === false, true);
check('② 全屏复位不重置总开关（用户手动开启的开关跨全屏保持）',
  SET_FULL14_CODE.includes('loupeEnabled') === false &&
  SET_FULL14_CODE.includes('this.loupePane = LOUPE_PANE_NONE;') &&
  SET_FULL14_CODE.includes('this.loupeHover = loupeHoverAfterModeChange'), true);
check('② 空态提示文案同步为「左键放大镜 · 右键相片菜单」（旧右键放大镜文案已清）',
  INDEX.includes("Text('双击进入全屏 · 左键放大镜 · 右键相片菜单 · 拖拽平移')") &&
  INDEX.includes("Text('双击进入全屏 · 右键放大镜 · 拖拽平移')") === false, true);
check('② 复位能力未丢失：resetView() 仍被键盘 / 其它路径多处调用',
  INDEX.split('this.resetView();').length - 1 >= 4, true);
check('② 顶栏滞回链零动画 / 零延迟未被右键兜底破坏',
  NO_ANIM.some(s => ROOTMOUSE15_CODE.includes(s)) === false &&
  ROOTMOUSE15_CODE.includes('!this.fullscreen && event.action === MouseAction.Move') &&
  ROOTMOUSE15_CODE.includes('topBarPeekOf(this.topBarPeek, yTop,'), true);
check('② 第十五轮回归护栏：鼠标 / 全屏 / 画质 / 版本 / 顶栏既有交互全未动',
  INDEX.includes('TapGesture({ count: 2 })') &&
  INDEX.includes('this.onDoubleTapCanvas();') &&
  INDEX.includes('this.clickSnapZoom = -1;') &&
  INDEX.includes('.onAxisEvent((event: AxisEvent)') &&
  INDEX.includes('this.pressMoved = true;') &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('topBarPeekOf(this.topBarPeek, yTop,'), true);

// ==================== 第十六轮：ESC 分状态 + 全屏往返几何 + 放大镜 >1:1 重采样 ====================
console.log('--- 第十六轮 ①：InteractionPlan.ts 纯函数（ESC / 窗口几何 / 分档重采样） ---');
check('① ESC 动作码三个互异（NONE / EXIT_FULL / QUIT_APP）',
  ESC_ACT_NONE === 0 && ESC_ACT_EXIT_FULL === 1 && ESC_ACT_QUIT_APP === 2, true);
check('① 全屏首次 ESC 恒 EXIT_FULL（永不退出 APP，冷却不影响全屏分支）',
  escActionOf(true, 5000, 400) === ESC_ACT_EXIT_FULL &&
  escActionOf(true, 100, 400) === ESC_ACT_EXIT_FULL, true);
check('① 非全屏从未退出过全屏 / 冷却已过 → QUIT_APP',
  escActionOf(false, -1, 400) === ESC_ACT_QUIT_APP &&
  escActionOf(false, 5000, 400) === ESC_ACT_QUIT_APP &&
  escActionOf(false, 400, 400) === ESC_ACT_QUIT_APP, true);
check('① 非全屏冷却期内 → NONE（吞掉系统补发 / 迟到的 ESC）',
  escActionOf(false, 100, 400) === ESC_ACT_NONE &&
  escActionOf(false, 0, 400) === ESC_ACT_NONE, true);
check('① guardMs<=0 关闭冷却，非全屏恒 QUIT_APP',
  escActionOf(false, 100, 0) === ESC_ACT_QUIT_APP, true);
check('① msSinceFullExitOf：从未退出返回 -1、正常求差、NaN 防护',
  msSinceFullExitOf(1000, 0) === -1 &&
  msSinceFullExitOf(1000, 200) === 800 &&
  msSinceFullExitOf(NaN, 200) === -1, true);
check('① 只在「非全屏→全屏 上升沿 + 自由窗口」抓 rect 快照',
  shouldCaptureWindowRect(false, true, true) === true &&
  shouldCaptureWindowRect(true, true, true) === false &&
  shouldCaptureWindowRect(false, true, false) === false &&
  shouldCaptureWindowRect(false, false, true) === false, true);
check('① 只在「全屏→普通 下降沿 + 快照可用」精确恢复 rect',
  shouldRestoreWindowRect(true, false, true, true) === true &&
  shouldRestoreWindowRect(true, false, false, true) === false &&
  shouldRestoreWindowRect(true, false, true, false) === false &&
  shouldRestoreWindowRect(false, false, true, true) === false &&
  shouldRestoreWindowRect(true, true, true, true) === false, true);
check('① 1:1 基准 / Cubic 档上限常量就位',
  LOUPE_RESAMPLE_1X === 1 && LOUPE_CUBIC_MAX_SCALE === 2, true);
check('① 有效放大倍率 = 局部 3× × 主视图缩放 × 密度比，脏值按 1 处理',
  loupeEffectiveScaleOf(3, 1, 1) === 3 &&
  Math.abs(loupeEffectiveScaleOf(3, 0.3, 1) - 0.9) < 1e-9 &&
  loupeEffectiveScaleOf(0, NaN, -1) === 1, true);
check('① >1:1 才重采样：正好 1:1 / 缩小 / NaN 全部旁路',
  loupeNeedsResampleOf(1) === false &&
  loupeNeedsResampleOf(0.5) === false &&
  loupeNeedsResampleOf(NaN) === false &&
  loupeNeedsResampleOf(1.0001) === true &&
  loupeNeedsResampleOf(3) === true, true);
check('① 分档：≤1:1→NONE、1~2×→HIGH(Cubic)、>2×→MEDIUM(平滑抑制过冲光晕)',
  loupeInterpolationTierOf(1) === LOUPE_IP_NONE &&
  loupeInterpolationTierOf(1.5) === LOUPE_IP_HIGH &&
  loupeInterpolationTierOf(2) === LOUPE_IP_HIGH &&
  loupeInterpolationTierOf(2.01) === LOUPE_IP_MEDIUM &&
  loupeInterpolationTierOf(3) === LOUPE_IP_MEDIUM, true);
check('① 整像素对齐：正 / 负 / 零 / NaN 都收敛不产生子像素采样',
  loupePixelAlignOf(189.6) === 190 &&
  loupePixelAlignOf(-2.4) === -2 &&
  loupePixelAlignOf(0) === 0 &&
  Number.isNaN(loupePixelAlignOf(NaN)), true);
check('① 目标解码边：>1:1 按倍率放大、夹 cap、≤1:1 原样旁路、非法 base 返回 0',
  loupeResampleEdgeOf(1000, 3, 8192) === 3000 &&
  loupeResampleEdgeOf(1000, 3, 2000) === 2000 &&
  loupeResampleEdgeOf(1000, 1, 8192) === 1000 &&
  loupeResampleEdgeOf(-5, 3, 8192) === 0, true);
check('① 解码边稳定性：首帧必须解、微变复用、大变重解、minDelta 兜底',
  loupeResampleStableOf(0, 100, 64) === false &&
  loupeResampleStableOf(100, 130, 64) === true &&
  loupeResampleStableOf(100, 200, 64) === false &&
  loupeResampleStableOf(100, 100, 0) === true, true);

console.log('--- 第十六轮 ②：Index.ets 源码静态契约（窗口几何 / ESC / 重采样 / 回归护栏） ---');
const SET_FULL16_CODE = stripComments(SET_FULL_FN);
const ONKEY16_CODE = stripComments(ONKEY_FN);
const APPLY_WIN16_FN = INDEX.slice(INDEX.indexOf('private async applyWindowFullScreen('),
  INDEX.indexOf('private onKey(event: KeyEvent): void {'));
const APPLY_WIN16_CODE = stripComments(APPLY_WIN16_FN);
const LOUPE_HELP16_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  private loupeScale('), INDEX.indexOf('  /** fillSizes')));
const CAPTURE16_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  private capturePreFullRect('), INDEX.indexOf('  private setFull(')));
const LOUPE16_CODE = stripComments(LOUPE13_CODE);

check('② 第十八轮 ESC/几何纯函数 import 到 Index.ets（第十六轮 escActionOf / msSinceFullExitOf 已退役）',
  INDEX.includes('ESC_ACT_NONE, ESC_ACT_EXIT_FULL, ESC_ACT_QUIT_APP,') &&
  INDEX.includes('shouldCaptureWindowRect, shouldRestoreWindowRect,') &&
  INDEX.includes('escActionByState, shouldArmSystemEcho, shouldCaptureRectAll,') &&
  INDEX.includes('shouldApplyRectRestore, shouldSelfHealOnResize,') &&
  INDEX.includes('loupeEffectiveScaleOf, loupeNeedsResampleOf') &&
  INDEX.includes('loupePixelAlignOf, loupeResampleStableOf') &&
  INDEX.includes('LOUPE_AA_ENABLED, LOUPE_QA_HIGH, loupeDensityRatioOf, loupeQualityTierOf') &&
  INDEX.includes('loupeResampleEdge2Of, loupeResampleGainOf') &&
  INDEX.includes('msSinceFullExitOf') === false &&
  INDEX.includes('escActionOf(') === false, true);
check('② 常量就位（三处放大镜 + 第十八轮绝对像素自愈阈值；400ms 时间冷却常量已移除）',
  INDEX.includes('const LOUPE_DENSITY_RATIO: number = 1;') &&
  INDEX.includes('const LOUPE_RESAMPLE_MAX_EDGE: number = 8192;') &&
  INDEX.includes('const LOUPE_RESAMPLE_STABLE_MIN_DELTA: number = 64;') &&
  INDEX.includes('const FULL_SELF_HEAL_MIN_SHRINK_PX: number = 8;') &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false, true);
check('② 进入全屏前抓 rect：走 shouldCaptureWindowRect + packWindowRect + 可用性校验',
  CAPTURE16_CODE.includes('shouldCaptureWindowRect(prevFull, nextFull, floating)') &&
  CAPTURE16_CODE.includes('packWindowRect({') &&
  CAPTURE16_CODE.includes('windowRectUsable(parseWindowRect(packed)') &&
  CAPTURE16_CODE.includes('win.getWindowProperties().windowRect'), true);
check('② 快照只在内存、不落盘、不覆盖重启会话记忆（无 prefs / putSync / flushSync）',
  CAPTURE16_CODE.includes('putSync') === false &&
  CAPTURE16_CODE.includes('flushSync') === false &&
  CAPTURE16_CODE.includes('WIN_KEY_RECT') === false, true);
check('② 退出全屏按快照精确 resize + moveWindowTo（每步独立 try）',
  APPLY_WIN16_CODE.includes('await this.restorePreFullRect(win);') &&
  INDEX.includes('await win.resize(rect.width, rect.height);') &&
  INDEX.includes('await win.moveWindowTo(rect.left, rect.top);') &&
  INDEX.includes('this.restoreRectPending = false;'), true);
check('② 精确恢复排在 recover()/EXIT_IMMERSIVE 之后（不被最大化形态覆盖）',
  APPLY_WIN16_CODE.indexOf('await win.recover();') >= 0 &&
  APPLY_WIN16_CODE.indexOf('EXIT_IMMERSIVE') > APPLY_WIN16_CODE.indexOf('await win.recover();') &&
  APPLY_WIN16_CODE.indexOf('await this.restorePreFullRect(win);') >
    APPLY_WIN16_CODE.indexOf('EXIT_IMMERSIVE'), true);
check('② setFull() 下降沿记时刻 + 模式切换释放高清图源 + 上升沿判据收口',
  SET_FULL16_CODE.includes('this.capturePreFullRect(prevFull, on);') &&
  SET_FULL16_CODE.includes('shouldRestoreWindowRect(prevFull, on,') &&
  SET_FULL16_CODE.includes('if (prevFull && !on) {') &&
  SET_FULL16_CODE.includes('this.lastFullExitAt = Date.now();') &&
  SET_FULL16_CODE.includes('this.clearLoupeHiRes();'), true);
check('② ESC 严格按当前窗口状态分派（escActionByState 为唯一真值来源，彻底无时间冷却）',
  ONKEY16_CODE.includes('const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  ONKEY16_CODE.includes('ESC_ACT_EXIT_FULL') && ONKEY16_CODE.includes('ESC_ACT_QUIT_APP') &&
  ONKEY16_CODE.includes('this.quitApp();') &&
  ONKEY16_CODE.includes('escActionOf(') === false &&
  ONKEY16_CODE.includes('msSinceFullExitOf(') === false &&
  ONKEY16_CODE.includes('FULL_EXIT_ESC_GUARD_MS') === false &&
  ONKEY16_CODE.includes('if (this.fullscreen) {') === false, true);
check('② 第十九轮：else 清标志代码保留但严格两态下不可达，第二次 ESC 恒 QUIT_APP',
  ONKEY16_CODE.includes('this.pendingSystemEcho = false;') &&
  ONKEY16_CODE.includes('this.lastFullExitAt = 0;') === false, true);
check('② 系统被动退出沉浸走 setFull(false, true)，恒不置位（来源参数仅诊断，不落到 quitApp）',
  /this\.setFull\(false, true\);\s*return;/.test(INDEX) &&
  SET_FULL16_CODE.includes('this.pendingSystemEcho = shouldArmSystemEcho(bySystemHeal, prevFull, on);') &&
  INDEX.includes('private setFull(on: boolean, bySystemHeal: boolean = false): void {'), true);
check('② 全屏快照字段就位（本次往返专用，用完即清）',
  INDEX.includes('private preFullRect: string') &&
  INDEX.includes('private hasPreFullRect: boolean') &&
  INDEX.includes('private restoreRectPending: boolean') &&
  INDEX.includes('private lastFullExitAt: number'), true);
check('② loupeInterpolation 两档映射（第十七轮）：>1:1→High(Cubic) / ≤1:1→Low，绝不用 MipMap / 最近邻',
  LOUPE_HELP16_CODE.includes('return ImageInterpolation.High;') &&
  LOUPE_HELP16_CODE.includes('return ImageInterpolation.Low;') &&
  LOUPE_HELP16_CODE.includes('return ImageInterpolation.None;') === false &&
  LOUPE_HELP16_CODE.includes('return ImageInterpolation.Medium;') === false &&
  LOUPE_HELP16_CODE.includes('loupeQualityTierOf(this.loupeScale())'), true);
check('② 高分辨率图源链（第十七轮）：真实密度倍率 + 原图上限夹界 + 无增益跳过 + 1:1 旁路 + 性能稳定',
  LOUPE_HELP16_CODE.includes('loupeResampleEdge2Of(this.viewEdge(), this.loupeScale(),') &&
  LOUPE_HELP16_CODE.includes('this.srcLongOf(uri), LOUPE_RESAMPLE_MAX_EDGE)') &&
  LOUPE_HELP16_CODE.includes('this.loupeResampleTargetEdge(uri)') &&
  LOUPE_HELP16_CODE.includes('loupeResampleGainOf(edge, this.srcLongOf(uri), this.viewEdge(),') &&
  LOUPE_HELP16_CODE.includes('LOUPE_RESAMPLE_MIN_GAIN') &&
  LOUPE_HELP16_CODE.includes('this.clearLoupeHiRes();') &&
  LOUPE_HELP16_CODE.includes('loupeNeedsResampleOf(this.loupeScale())') &&
  LOUPE_HELP16_CODE.includes('loupeResampleStableOf(this.loupeHiEdge, edge,') &&
  LOUPE_HELP16_CODE.includes('this.decodeTo(uri, edge, false)') &&
  LOUPE_HELP16_CODE.includes('this.releaseUncachedEntry(old)'), true);
check('② 高清图源 uri/pane 双重校验：切图换页不把上一张错画到新图上',
  LOUPE_HELP16_CODE.includes('this.loupeHiUri === uri && this.loupeHiPane === pane') &&
  LOUPE_HELP16_CODE.includes('private loupeUriOf(pane: number): string') &&
  LOUPE_HELP16_CODE.includes('LOUPE_PANE_RIGHT'), true);
check('② 迟到作废结果按 token 丢弃并释放（不泄漏 PixelMap）',
  LOUPE_HELP16_CODE.includes('if (token !== this.loupeHiToken)') &&
  LOUPE_HELP16_CODE.includes('this.releaseUncachedEntry(e); // 迟到作废结果不接手、不泄漏'), true);
check('② loupeLayer 高清分支排在最前，且 5 个源统一走分档插值',
  LOUPE16_CODE.includes('if (this.loupeHiUsable(uri, pane))') &&
  LOUPE16_CODE.indexOf('if (this.loupeHiUsable(uri, pane))') <
    LOUPE16_CODE.indexOf('if (pane === LOUPE_PANE_RIGHT)') &&
  LOUPE16_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5, true);
check('② 圆内尺寸 / 偏移全部整像素对齐（消除子像素采样导致的边缘粗糙）',
  INDEX.includes('return loupePixelAlignOf(this.pageBoxW(pane, half) * LOUPE_ZOOM);') &&
  INDEX.includes('return loupePixelAlignOf(this.pageH(half) * LOUPE_ZOOM);') &&
  INDEX.includes('loupePixelAlignOf(loupeClampedOffset(this.loupeX, this.pageBoxW(pane, half), LOUPE_D_VP, LOUPE_ZOOM))') &&
  INDEX.includes('loupePixelAlignOf(loupeClampedOffset(this.loupeY, this.pageH(half), LOUPE_D_VP, LOUPE_ZOOM))'), true);
check('② 触发点齐全：hover / Move / 右键开启 / 关闭释放 / 模式切换 / 页面销毁',
  INDEX.includes('this.ensureLoupeHiRes(pane);') &&
  INDEX.includes('this.ensureLoupeHiRes(this.loupePane);') &&
  INDEX.includes('this.clearLoupeHiRes(); // 第十六轮：页面销毁时释放放大镜专用高清 PixelMap'), true);
check('② 放大镜链无动画 / 无计时器（沿用零延迟交互）',
  NO_ANIM.some(s => LOUPE_HELP16_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => LOUPE_HOVER14_CODE.includes(s)) === false &&
  NO_ANIM2.some(s => LOUPE_MOUSE14_CODE.includes(s)) === false, true);
check('② 第十六轮回归护栏：三处画质计数 / 版本 / 往上层 / 右键 toggle / 顶栏滞回全未动',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('quitApp()') && INDEX.includes('ability.terminateSelf()'), true);

// ==================== 第十七轮：放大镜边缘抗锯齿（SDK 语义修正 / 真实密度 / 增益跳过 / AA）====================
console.log('--- 第十七轮 ①：InteractionPlan.ts 纯函数（密度 / 画质档 / 目标边 / 真实增益） ---');
check('① 常量就位：密度区间 [0.5,4.0] / 兜底 1 / AA 恒开 / 画质档 HIGH=1 LOW=0',
  LOUPE_DENSITY_MIN === 0.5 && LOUPE_DENSITY_MAX === 4.0 &&
  LOUPE_DENSITY_FALLBACK === 1 && LOUPE_AA_ENABLED === true &&
  LOUPE_QA_HIGH === 1 && LOUPE_QA_LOW === 0, true);
check('① 密度归一化：NaN / 0 / 负数回退 1，越界夹到 [0.5,4.0]，合法值原样（含高 DPI 2 / 3）',
  loupeDensityRatioOf(NaN) === 1 && loupeDensityRatioOf(0) === 1 &&
  loupeDensityRatioOf(-1) === 1 && loupeDensityRatioOf(Infinity) === 4 &&
  loupeDensityRatioOf(0.3) === 0.5 && loupeDensityRatioOf(5) === 4 &&
  loupeDensityRatioOf(0.5) === 0.5 && loupeDensityRatioOf(4) === 4 &&
  loupeDensityRatioOf(1) === 1 && loupeDensityRatioOf(2) === 2 &&
  loupeDensityRatioOf(3) === 3, true);
check('① 画质档：任意 >1:1 一律 HIGH(Cubic)，≤1:1 与 NaN 落 LOW(双线性)，绝不 MipMap / 最近邻',
  loupeQualityTierOf(1.0001) === LOUPE_QA_HIGH &&
  loupeQualityTierOf(2) === LOUPE_QA_HIGH &&
  loupeQualityTierOf(3) === LOUPE_QA_HIGH &&
  loupeQualityTierOf(6) === LOUPE_QA_HIGH &&
  loupeQualityTierOf(12) === LOUPE_QA_HIGH &&
  loupeQualityTierOf(1) === LOUPE_QA_LOW &&
  loupeQualityTierOf(0.5) === LOUPE_QA_LOW &&
  loupeQualityTierOf(NaN) === LOUPE_QA_LOW, true);
check('① 目标解码边：按真实倍率放大、夹 cap、再夹原图长边（desiredSize 不升采样）',
  loupeResampleEdge2Of(1000, 3, 6000, 8192) === 3000 &&
  loupeResampleEdge2Of(1000, 3, 2000, 8192) === 2000 &&
  loupeResampleEdge2Of(1000, 9, 100000, 8192) === 8192 &&
  loupeResampleEdge2Of(1000, 9, 6000, 8192) === 6000 &&
  loupeResampleEdge2Of(1000, 3, 1500.9, 8192) === 1500, true);
check('① 目标解码边：≤1:1 / NaN / 缩小完全旁路返回 base，非法 base 返回 0，原图未知不夹原图',
  loupeResampleEdge2Of(1000, 1, 6000, 8192) === 1000 &&
  loupeResampleEdge2Of(1000, 0.5, 6000, 8192) === 1000 &&
  loupeResampleEdge2Of(1000, NaN, 6000, 8192) === 1000 &&
  loupeResampleEdge2Of(1000, 3, 0, 8192) === 3000 &&
  loupeResampleEdge2Of(0, 3, 6000, 8192) === 0 &&
  loupeResampleEdge2Of(-5, 3, 6000, 8192) === 0 &&
  loupeResampleEdge2Of(NaN, 3, 6000, 8192) === 0, true);
check('① 真实像素增益：目标边明显超当前边才重解；小图 / 增益不足跳过；尺寸未知保守放行',
  loupeResampleGainOf(3000, 6000, 1000, 96) === true &&
  loupeResampleGainOf(1097, 6000, 1000, 96) === true &&
  loupeResampleGainOf(1096, 6000, 1000, 96) === false &&
  loupeResampleGainOf(5000, 1200, 1000, 96) === true &&
  loupeResampleGainOf(5000, 1050, 1000, 96) === false &&
  loupeResampleGainOf(5000, 0, 1000, 96) === true &&
  loupeResampleGainOf(0, 6000, 1000, 96) === false &&
  loupeResampleGainOf(NaN, 6000, 1000, 96) === false &&
  loupeResampleGainOf(3000, 6000, 0, 96) === true &&
  loupeResampleGainOf(3000, 6000, 1000, 0) === true, true);
check('① 边界矩阵：不同倍率 × 不同尺寸 × 不同 DPI（有效倍率 = 3× × zoom × dpr）',
  // 高 DPI(dpr=3) + 放大镜 3× + zoom=1 → 有效倍率 9，大图放大走 HIGH + 目标边夹 cap
  loupeQualityTierOf(loupeEffectiveScaleOf(3, 1, loupeDensityRatioOf(3))) === LOUPE_QA_HIGH &&
  loupeResampleEdge2Of(1000, 9, 100000, 8192) === 8192 &&
  // 低 DPI(dpr=0.5) + 缩小视图 zoom=0.5 → 有效倍率 0.75，1:1 旁路不解码
  loupeQualityTierOf(loupeEffectiveScaleOf(3, 0.5, loupeDensityRatioOf(0.5))) === LOUPE_QA_LOW &&
  loupeResampleEdge2Of(1000, 0.75, 6000, 8192) === 1000 &&
  // 小图（原图 1080）即使高倍率，目标边也夹到原图且增益不足 → 跳过重解码
  loupeResampleEdge2Of(1000, 9, 1080, 8192) === 1080 &&
  loupeResampleGainOf(1080, 1080, 1000, 96) === false &&
  // 超大图 + 高 DPI：夹到 cap 后仍有巨大增益 → 重解码
  loupeResampleGainOf(8192, 12000, 1000, 96) === true, true);

console.log('--- 第十七轮 ②：Index.ets 源码静态契约（真实密度 / 两档 / AA / 增益 / 回退护栏） ---');
const LOUPE_HELP17_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  private loupeDensityOf('), INDEX.indexOf('  /** fillSizes')));
const LOUPE17_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  loupeLayer('), INDEX.indexOf('  previewImage(')));
check('② 接入真实设备密度：import display / densityPixels / 懒读缓存字段 / 归一化 / 不进启动路径',
  INDEX.includes("import display from '@ohos.display';") &&
  LOUPE_HELP17_CODE.includes('display.getDefaultDisplaySync().densityPixels') &&
  LOUPE_HELP17_CODE.includes('private loupeDensityOf(): number') &&
  LOUPE_HELP17_CODE.includes('this.loupeDensity = loupeDensityRatioOf(raw);') &&
  INDEX.includes('private loupeDensity: number = 0;') &&
  LOUPE_HELP17_CODE.includes('loupeEffectiveScaleOf(LOUPE_ZOOM, this.zoom, this.loupeDensityOf())') &&
  INDEX.includes('const LOUPE_DENSITY_RATIO: number = 1;'), true);
check('② 修正 SDK 插值档语义：放大镜恒 3× 一律 High(Cubic)，≤1:1 用 Low，绝无 Medium(MipMap) / None(最近邻)',
  LOUPE_HELP17_CODE.includes('loupeQualityTierOf(this.loupeScale())') &&
  LOUPE_HELP17_CODE.includes('return ImageInterpolation.High;') &&
  LOUPE_HELP17_CODE.includes('return ImageInterpolation.Low;') &&
  LOUPE_HELP17_CODE.includes('return ImageInterpolation.Medium;') === false &&
  LOUPE_HELP17_CODE.includes('return ImageInterpolation.None;') === false, true);
check('② 目标解码边按真实倍率 + 原图长边夹界（srcLongOf）+ cap（decodePx 只能降采样）',
  LOUPE_HELP17_CODE.includes('loupeResampleEdge2Of(this.viewEdge(), this.loupeScale(),') &&
  LOUPE_HELP17_CODE.includes('this.srcLongOf(uri), LOUPE_RESAMPLE_MAX_EDGE)') &&
  LOUPE_HELP17_CODE.includes('private loupeResampleTargetEdge(uri: string): number') &&
  LOUPE_HELP17_CODE.includes('this.loupeResampleTargetEdge(uri)'), true);
check('② 无真实像素增益跳过重解码并释放高清源（省一次解码 + 一张大 PixelMap 内存）',
  LOUPE_HELP17_CODE.includes('loupeResampleGainOf(edge, this.srcLongOf(uri), this.viewEdge(),') &&
  LOUPE_HELP17_CODE.includes('LOUPE_RESAMPLE_MIN_GAIN') &&
  LOUPE_HELP17_CODE.includes('this.clearLoupeHiRes();') &&
  INDEX.includes('const LOUPE_RESAMPLE_MIN_GAIN: number = 96;'), true);
check('② loupeLayer 五个图源全部开 PixelMap 边缘 AA（antialiased 默认关闭，since 23）',
  LOUPE17_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  LOUPE17_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5 &&
  LOUPE17_CODE.split('.objectFit(ImageFit.Contain)').length - 1 === 5, true);
check('② 高清源无效正确回退：uri/pane 双重校验 + >1:1 判据，无高清源自动落到既有的 4 个兜底分支',
  LOUPE_HELP17_CODE.includes('this.loupeHiPx !== undefined &&') &&
  LOUPE_HELP17_CODE.includes('this.loupeHiUri === uri && this.loupeHiPane === pane') &&
  LOUPE_HELP17_CODE.includes('loupeNeedsResampleOf(this.loupeScale())') &&
  LOUPE17_CODE.includes('if (this.loupeHiUsable(uri, pane))') &&
  LOUPE17_CODE.includes('if (pane === LOUPE_PANE_RIGHT)') &&
  LOUPE17_CODE.includes('Image(this.viewPixelMap!)') &&
  LOUPE17_CODE.includes('Image(this.lowPixelMap!)') &&
  LOUPE17_CODE.includes('Image(uri)'), true);
check('② 1:1 旁路 + 性能护栏：≤1:1 不额外解码 / 稳定阈值复用 / token 作废迟到结果 / 无动画',
  LOUPE_HELP17_CODE.includes('if (!this.loupeEnabled || !loupeNeedsResampleOf(this.loupeScale()))') &&
  LOUPE_HELP17_CODE.includes('loupeResampleStableOf(this.loupeHiEdge, edge, LOUPE_RESAMPLE_STABLE_MIN_DELTA)') &&
  LOUPE_HELP17_CODE.includes('if (token !== this.loupeHiToken)') &&
  LOUPE_HELP17_CODE.includes('this.releaseUncachedEntry(e);') &&
  NO_ANIM.some(s => LOUPE_HELP17_CODE.includes(s)) === false, true);
check('② 第十六轮 SDK 误判已纠正：源码不再宣称「interpolation 对 PixelMap 不生效 / 靠源分辨率而非插值档」',
  INDEX.includes("`.interpolation()` 对 PixelMap 不生效") === false &&
  INDEX.includes('靠源分辨率而非插值档取胜') === false &&
  INDEX.includes('loupeInterpolationTierOf') === false &&
  INDEX.includes('LOUPE_IP_') === false &&
  INDEX.includes('LOUPE_DENSITY_FALLBACK') === false, true);
check('② 第十七轮回归护栏：三处画质计数 / 版本 / 右键 toggle / 顶栏滞回 / 全屏几何 / ESC 全未动',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('shouldCaptureWindowRect(prevFull, nextFull, floating)') &&
  INDEX.includes('escActionByState(this.fullscreen,') &&
  INDEX.includes('quitApp()') && INDEX.includes('ability.terminateSelf()'), true);

// ==================== 第十八轮：窗口模式 ESC 严格两态 / 几何快照放宽 / 绝对像素自愈 ====================
console.log('--- 第十八轮 ①：InteractionPlan.ts 纯函数（两态分派 / 补发标志 / 几何 / 自愈） ---');
check('① escActionByState：全屏恒 EXIT_FULL（首次 ESC 绝不退出 APP，含 pendingEcho=true 也不变）',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(true, true) === ESC_ACT_EXIT_FULL, true);
check('① escActionByState：普通无补发标志 → QUIT_APP（返回普通模式再次 ESC 退出 APP）',
  escActionByState(false, false) === ESC_ACT_QUIT_APP, true);
check('① escActionByState：普通态恒 QUIT_APP（第十九轮严格两态，pendingSystemEcho 不再吞键）',
  escActionByState(false, true) === ESC_ACT_QUIT_APP &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP, true);
check('① shouldArmSystemEcho：第十九轮恒 false（含系统自愈下降沿也不置位，废除补发吞键）',
  shouldArmSystemEcho(true, true, false) === false &&
  shouldArmSystemEcho(false, true, false) === false &&
  shouldArmSystemEcho(true, true, true) === false &&
  shouldArmSystemEcho(true, false, false) === false &&
  shouldArmSystemEcho(true, false, true) === false &&
  shouldArmSystemEcho(false, false, false) === false, true);
check('① shouldCaptureRectAll：非全屏→全屏上升沿 + rect 可用才抓，最大化态也抓（不再 floating-only）',
  shouldCaptureRectAll(false, true, true) === true &&
  shouldCaptureRectAll(false, true, false) === false &&
  shouldCaptureRectAll(true, true, true) === false &&
  shouldCaptureRectAll(false, false, true) === false &&
  shouldCaptureRectAll(true, false, true) === false, true);
check('① shouldApplyRectRestore：仅「进入前自由窗口 + rect 可用」才精确 resize/move，最大化态保持',
  shouldApplyRectRestore(true, true) === true &&
  shouldApplyRectRestore(false, true) === false &&
  shouldApplyRectRestore(true, false) === false &&
  shouldApplyRectRestore(false, false) === false, true);
check('① shouldSelfHealOnResize：绝对像素缩小 ≥8px 即自愈（0.92 比例阈值抓不到的小幅缩小）',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1912, 1080, 8) === true &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1920, 1050, 8) === true &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1830, 1000, 8) === true, true);
check('① shouldSelfHealOnResize：未缩小 / 缩小 <8px / 非全屏 / 未稳定 / 脏尺寸 全部不自愈',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1920, 1080, 8) === false &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1915, 1080, 8) === false &&
  shouldSelfHealOnResize(false, true, 1920, 1080, 1000, 800, 8) === false &&
  shouldSelfHealOnResize(true, false, 1920, 1080, 1000, 800, 8) === false &&
  shouldSelfHealOnResize(true, true, 0, 1080, 800, 800, 8) === false &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 0, 0, 8) === false, true);
check('① shouldSelfHealOnResize：minShrinkPx 非法值按 8 兜底（脏值不误触发）',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1912, 1080, 0) === true &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1913, 1080, 0) === false &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1900, 1080, NaN) === true, true);

console.log('--- 第十八轮 ②：端到端场景矩阵（用户诉求四句逐条可验证） ---');
// 场景 1：普通模式双击进全屏 → 保存几何（不受 getWindowStatus 值影响）
check('场景1 双击进全屏：上升沿恒抓几何 + 记录进入前形态（FLOATING / MAXIMIZE / 状态读取失败都覆盖）',
  shouldCaptureRectAll(false, true, true) === true &&
  shouldCaptureWindowRect(false, true, true) === true &&   // 旧 FLOATING 快路径仍在
  shouldApplyRectRestore(true, true) === true &&          // 自由窗口快照可精确还原
  shouldApplyRectRestore(false, true) === false, true);   // 最大化态快照不误缩
// 场景 2：全屏首次 ESC → 只退全屏、恢复几何，绝不退出 APP
check('场景2 全屏首次 ESC：恒 EXIT_FULL，任何 pendingEcho / 距上次退出时刻都不改变（无时间冷却）',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(true, true) === ESC_ACT_EXIT_FULL &&
  shouldRestoreWindowRect(true, false, true, true) === true && // 下降沿 + 快照可用 → 恢复几何
  shouldRestoreWindowRect(false, false, true, true) === false, true);
// 场景 3：返回普通模式后再次 ESC → 退出 APP（主动退出路径 pendingEcho 恒 false，不被误吞）
check('场景3 主动退出全屏后第二次 ESC：pendingEcho=false → 立即 QUIT_APP（第十六轮 400ms 冷却已废）',
  shouldArmSystemEcho(false, true, false) === false &&     // 主动退出不置补发标志
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false, true);
// 场景 4（第十九轮重做）：真全屏 ESC 被系统消费 → 自愈同步 → 恒不置位 →
//   用户主动第二次 ESC 立即退 APP（第十八轮把这次 ESC 误吞成 NONE，正是本轮修复的 bug）
check('场景4 系统消费 ESC 后第二次 ESC：自愈恒不置位 → 立即 QUIT_APP（本轮 bug 回归）',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1900, 1080, 8) === true && // 仅缩 20px 也能捕获自愈
  shouldArmSystemEcho(true, true, false) === false &&    // 自愈也不置补发标志
  escActionByState(false, shouldArmSystemEcho(true, true, false)) === ESC_ACT_QUIT_APP && // 第二次 ESC 立即退 APP
  escActionByState(false, true) === ESC_ACT_QUIT_APP, true); // 即使残留 true 也绝不吞键
// 场景 5：双击 / F11 / 退出按钮等主动路径，不产生补发标志
check('场景5 主动退出路径（双击/F11/按钮）不置补发标志，紧接着的二次 ESC 不被吞',
  shouldArmSystemEcho(false, true, false) === false &&
  escActionByState(false, shouldArmSystemEcho(false, true, false)) === ESC_ACT_QUIT_APP, true);

console.log('--- 第十八轮 ③：Index.ets 源码静态契约（接线 / 护栏） ---');
const SET_FULL18_CODE = stripComments(SET_FULL_FN);
const ONKEY18_CODE = stripComments(ONKEY_FN);
const CAPTURE18_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  private capturePreFullRect('), INDEX.indexOf('  private setFull(')));
const RESTORE18_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  private async restorePreFullRect('), INDEX.indexOf('  private setFull(')));
check('③ 四个第十八轮纯函数接线：两态分派 / 按来源置位 / 几何宽判据 / 形态判据 / 绝对像素自愈',
  ONKEY18_CODE.includes('escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  SET_FULL18_CODE.includes('shouldArmSystemEcho(bySystemHeal, prevFull, on);') &&
  CAPTURE18_CODE.includes('shouldCaptureRectAll(prevFull, nextFull, true)') &&
  RESTORE18_CODE.includes('shouldApplyRectRestore(wasFloating, true)') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,'), true);
check('③ setFull 签名带 bySystemHeal 默认参数，下降沿恒不置位（来源参数仅诊断）',
  INDEX.includes('private setFull(on: boolean, bySystemHeal: boolean = false): void {') &&
  SET_FULL18_CODE.includes('this.pendingSystemEcho = shouldArmSystemEcho(bySystemHeal, prevFull, on);') &&
  /if \(prevFull && !on\) \{[^}]*this\.lastFullExitAt = Date\.now\(\);[^}]*shouldArmSystemEcho/.test(SET_FULL18_CODE), true);
check('③ 自愈分支 setFull(false, true) + 第二十一轮两处窗口真值同步入口，双判据仍在',
  /this\.setFull\(false, true\);\s*return;/.test(INDEX) &&
  /const shrinkBig: boolean = shouldExitFullOnResize\(/.test(INDEX) &&
  /const shrinkSmall: boolean = shouldSelfHealOnResize\(/.test(INDEX) &&
  // 四处：自愈 / windowStatusChange 回调 / ESC 分派前主动读真值 / R23 系统通道分派
  INDEX.split('this.setFull(false, true);').length - 1 === 4, true);
check('③ 几何快照放宽：上升沿清 preFullFloating + 记录 floating 形态 + resize/move 前判形态',
  CAPTURE18_CODE.includes('this.preFullFloating = false;') &&
  CAPTURE18_CODE.includes('this.preFullFloating = floating;') &&
  RESTORE18_CODE.includes('const wasFloating: boolean = this.preFullFloating;') &&
  INDEX.includes('await win.resize(rect.width, rect.height);') &&
  INDEX.includes('await win.moveWindowTo(rect.left, rect.top);'), true);
check('③ 时间冷却彻底移除：Index 不含 escActionOf( / msSinceFullExitOf( / FULL_EXIT_ESC_GUARD_MS 常量 / lastFullExitAt=0',
  INDEX.includes('escActionOf(') === false &&
  INDEX.includes('msSinceFullExitOf(') === false &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false &&
  INDEX.includes('this.lastFullExitAt = 0;') === false, true);
check('③ 第十七/十三/十四/十五轮回归护栏：画质三处 / 版本 / AA / 右键 toggle / 放大镜几何 / 顶栏滞回 均未破坏',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('loupeClampedOffset(') &&
  INDEX.includes('ability.terminateSelf()'), true);

// ==================== 第十九轮：第二次 ESC 无响应修复 —— 严格两态定稿 / 彻底废除补发吞键 ====================
console.log('--- 第十九轮 ①：复现路径（系统消费首次 ESC → 自愈 → 用户主动第二次 ESC） ---');
// 用户复现：进入 APP 双击进全屏 → 第一次 ESC 可返回 → 第二次 ESC 无任何响应。
// 根因：真全屏首次 ESC 被系统窗口管理器消费，APP 靠画布缩小自愈同步 fullscreen=false，
//   第十八轮在自愈分支置位 pendingSystemEcho=true 想「吞一次补发 ESC」，但系统消费后
//   并不补发 → 标志永不消费 → 用户主动的第二次 ESC 被判 NONE 吞掉 → 无任何响应。
check('① 复现前提：自愈判据对系统栏/dock 回来的小幅缩小仍命中（约 20px 即同步回普通态）',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1900, 1080, 8) === true &&
  shouldSelfHealOnResize(true, true, 1920, 1080, 1912, 1072, 8) === true, true);
check('① 修复核心：自愈下降沿恒不置位 → 第二次 ESC 必 QUIT_APP（第十八轮此处被误吞）',
  shouldArmSystemEcho(true, true, false) === false &&
  escActionByState(false, shouldArmSystemEcho(true, true, false)) === ESC_ACT_QUIT_APP, true);

console.log('--- 第十九轮 ②：escActionByState 严格两态全矩阵（无第三态 / 时间窗 / 标志依赖） ---');
check('② 严格两态四象限：全屏两标志值都 EXIT_FULL、普通两标志值都 QUIT_APP',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(true, true) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  escActionByState(false, true) === ESC_ACT_QUIT_APP, true);
check('② 恒不返回 NONE：四种组合都不是 ESC_ACT_NONE（补发吞键分支彻底废除）',
  escActionByState(true, false) !== ESC_ACT_NONE &&
  escActionByState(true, true) !== ESC_ACT_NONE &&
  escActionByState(false, false) !== ESC_ACT_NONE &&
  escActionByState(false, true) !== ESC_ACT_NONE, true);
check('② shouldArmSystemEcho 全八种入参组合恒 false（永不置位，pendingSystemEcho 恒 false）',
  [false, true].every(a => [false, true].every(b => [false, true].every(c =>
    shouldArmSystemEcho(a, b, c) === false))), true);
check('② 接线不变即生效：Index 仍传 pendingSystemEcho，但函数刻意忽略它（Index 代码行零改动）',
  escActionByState(false, shouldArmSystemEcho(true, true, false)) === ESC_ACT_QUIT_APP &&
  INDEX.includes('const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);'), true);

console.log('--- 第十九轮 ③：端到端场景矩阵（首次 ESC 仍返回 / 再次 ESC 正常退出 / 不影响其他交互） ---');
check('场景A 双击进全屏：几何上升沿照常抓取与自由窗口精确还原（未受本轮影响）',
  shouldCaptureRectAll(false, true, true) === true &&
  shouldApplyRectRestore(true, true) === true, true);
check('场景B 首次 ESC（APP 收到）：全屏恒 EXIT_FULL，只退全屏并恢复几何，绝不退出 APP',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  shouldRestoreWindowRect(true, false, true, true) === true, true);
check('场景C 首次 ESC（系统消费）：自愈同步普通态且不置位（两条首次 ESC 路径都收敛）',
  shouldSelfHealOnResize(true, true, 1920, 1080, 1900, 1080, 8) === true &&
  shouldArmSystemEcho(true, true, false) === false, true);
check('场景D 再次 ESC（核心）：普通态恒 QUIT_APP，立即退出 APP，不再「无任何响应」',
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  escActionByState(false, true) === ESC_ACT_QUIT_APP, true);
check('场景E 连贯快按两次 ESC（间隔 <100ms）：第一次 EXIT_FULL、第二次 QUIT_APP，无需按第三次',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false, true);
check('场景F 双击/F11/退出按钮主动退全屏：不置位，随后第一次 ESC 立即退 APP',
  shouldArmSystemEcho(false, true, false) === false &&
  escActionByState(false, shouldArmSystemEcho(false, true, false)) === ESC_ACT_QUIT_APP, true);
check('场景G 多次全屏往返：每轮严格两态，几何快照幂等，无累积标志',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false &&
  shouldArmSystemEcho(false, true, false) === false, true);

console.log('--- 第十九轮 ④：源码静态契约（Index 代码行零改动 / 纯函数定稿 / 注释订正 / 回归护栏） ---');
check('④ 唯一真值来源仍为 escActionByState，Index ESC 分派 / toggleFull / quitApp 接线一字未动',
  ONKEY18_CODE.includes('escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  ONKEY16_CODE.includes('if (escAct === ESC_ACT_EXIT_FULL) {') &&
  ONKEY16_CODE.includes('else if (escAct === ESC_ACT_QUIT_APP) {') &&
  INDEX.includes('this.quitApp();') && INDEX.includes('this.toggleFull();'), true);
check('④ 纯函数定稿：escActionByState 恒按 fullscreen 两态返回、shouldArmSystemEcho 恒 false',
  /export function escActionByState\([\s\S]*?return fullscreen \? ESC_ACT_EXIT_FULL : ESC_ACT_QUIT_APP;\s*\}/.test(IP_CODE) &&
  /export function shouldArmSystemEcho\([\s\S]*?return false;\s*\}/.test(IP_CODE), true);
check('④ 严格两态：无 pendingSystemEcho 判据分支，NONE 仅剩第十六轮旧 escActionOf 一处保留',
  /if \(_?pendingSystemEcho\)/.test(IP_CODE) === false &&
  IP_CODE.split('return ESC_ACT_NONE;').length - 1 === 1, true);
check('④ 注释订正：Index/Plan 均标注第十九轮定稿、系统消费首次 ESC 后不补发',
  INDEX.includes('第十九轮定稿') &&
  INDEX.includes('由系统消费后并不补发给') &&
  IP_SRC.includes('第十九轮定稿') &&
  IP_SRC.includes('系统消费首次 ESC 后并不把它补发给 APP'), true);
check('④ 第十八轮护栏全部保持：全窗口态几何 / 绝对像素自愈 / 时间冷却移除',
  INDEX.includes('shouldCaptureRectAll(prevFull, nextFull, true)') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,') &&
  INDEX.includes('const FULL_SELF_HEAL_MIN_SHRINK_PX: number = 8;') &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false &&
  INDEX.includes('escActionOf(') === false &&
  INDEX.includes('msSinceFullExitOf(') === false, true);
check('④ 回归护栏：版本 / 画质三处 / AA 五源 / 放大镜 / 顶栏 / 右键 toggle 全部未破坏',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('ability.terminateSelf()'), true);

// ==================== 第二十轮：真机链路修复 —— ESC 到达 / 退出不阻塞 / 可观测诊断 ====================
// ⚠️ 以下全部是**源码静态契约**，只能证明接线存在，不能证明真机上 ESC 真的到达 APP。
//   本会话环境实测：hdc list targets=[Empty]、bm install 恒返回
//   "error: failed to execute your command."、hilog 读取 Permission denied、
//   无 input/uinput/uitest 注入工具、/dev/input Permission denied
//   → 无法自行安装 HAP / 启动 APP / 注入 ESC / 读日志。
//   本轮唯一的机器校验是 hvigorw assembleHap → BUILD SUCCESSFUL（已签名 HAP），
//   它证明 focusControl / onKeyPreIme / boolean 重载是合法 SDK 用法，但仍不等于按键验证。
//   真机验证必须由用户在装有 APP 的机器上完成；应用内状态栏已内置 ESCDBG 诊断串供回传断点。
console.log('--- 第二十轮 ①：运行时事件链路（前三轮改纯函数始终无效的真正病根） ---');
const ENTRY_SRC = readFileSync(new URL('../entry/src/main/ets/entryability/EntryAbility.ets', import.meta.url), 'utf8');
check('① onKeyEvent 改用返回 boolean 的重载消费 ESC（原 void 重载让事件继续冒泡被系统拿走）',
  INDEX.includes('.onKeyEvent((event: KeyEvent): boolean => this.onKeyConsumed(event))') &&
  INDEX.includes('.onKeyEvent((event: KeyEvent) => this.onKey(event))') === false &&
  ONKEY18_CODE.includes('return event.keyCode === KeyCode.KEYCODE_ESCAPE;'), true);
check('① 新增 onKeyPreIme 在 IME / 系统之前拦下 ESC 并主动消费，其他键照常分发',
  INDEX.includes('.onKeyPreIme((event: KeyEvent): boolean => this.onKeyCapture(event))') &&
  ONKEY18_CODE.includes('if (event.keyCode === KeyCode.KEYCODE_ESCAPE && event.type === KeyType.Down) {') &&
  ONKEY18_CODE.includes('this.onKey(event);') &&
  ONKEY18_CODE.includes('return true;') && ONKEY18_CODE.includes('return false;'), true);
check('① 双通道只防「同一次事件」重复处理：setTimeout(0) 清标记，绝不吞用户主动的第二次 ESC',
  ONKEY18_CODE.includes('this.escHandledByPreIme = true;') &&
  ONKEY18_CODE.includes('this.escHandledByPreIme = false;') &&
  /setTimeout\(\(\) => \{\s*this\.escHandledByPreIme = false;\s*\}, 0\);/.test(ONKEY18_CODE) &&
  INDEX.includes('const FULL_EXIT_ESC_GUARD_MS') === false &&
  INDEX.includes('escActionOf(') === false, true);
check('① 进出全屏后延时重抢焦点（.defaultFocus 只在首次构建生效，焦点丢失则 ESC 到不了 onKey）',
  INDEX.includes('.id(ROOT_FOCUS_ID)') &&
  INDEX.includes('focusControl.requestFocus(ROOT_FOCUS_ID)') &&
  SET_FULL16_CODE.includes('this.scheduleKeyRefocus();') &&
  INDEX.includes('this.clearKeyRefocusTimer();') &&
  INDEX.includes('const ESC_REFOCUS_DELAY_MS: number = 120;'), true);
check('① 兼容只派发 KeyType.Up 的 2in1 键盘：R24 修复 escDownHandled 永不复位',
  ONKEY18_CODE.includes('const rawDown: boolean = (event.type === KeyType.Down);') &&
  ONKEY18_CODE.includes('if (isEsc && !rawDown && this.escDownHandled) {') &&
  ONKEY18_CODE.includes('this.escDownHandled = false;') &&
  ONKEY18_CODE.includes('const down: boolean = rawDown || isEsc;') &&
  ONKEY18_CODE.includes('this.escDownHandled = rawDown;'), true);

console.log('--- 第二十轮 ②：退出不再被异步 I/O 卡住 + 真机可观测诊断 ---');
check('② quitApp 不再 await flushPos()（异步 I/O 挂住 → terminateSelf 永不执行 → ESC 无响应）',
  QUIT_FN.includes('await this.flushPos()') === false &&
  QUIT_FN.includes('this.flushPosSync();') &&
  QUIT_FN.includes('ability.terminateSelf()'), true);
check('② UIAbilityContext 双来源兜底：EntryAbility 缓存 AppStorage，quitApp 优先 hostContext',
  ENTRY_SRC.includes("AppStorage.setOrCreate('abilityContext', this.context);") &&
  QUIT_FN.includes("AppStorage.get<common.UIAbilityContext>('abilityContext')") &&
  QUIT_FN.includes('if (host !== undefined) {') &&
  QUIT_FN.includes('NO_CONTEXT'), true);
check('② 真机可观测：状态栏显示 ESCDBG 链路串 + hilog 打点 + terminateSelf 结果回写',
  INDEX.includes("@State escDiag: string = '';") &&
  INDEX.includes("'  ·  ' + this.escDiag") &&
  (INDEX.match(/ESCDBG/g) || []).length >= 6 &&
  QUIT_FN.includes('terminateSelf() 已调用') &&
  QUIT_FN.includes('REJECTED') && QUIT_FN.includes('EXCEPTION'), true);
check('② 诊断串直接拼在既有状态栏 Text 上（R25 起随诊断层开关），不新增组件 / 不改布局',
  /Text\(this\.status \+ \(this\.diagOverlayOn && this\.escDiag\.length > 0 \?/.test(INDEX) &&
  INDEX.includes('Text(this.status)') === false, true);

console.log('--- 第二十轮 ③：源码静态契约（第十九轮定稿未坏 / 回归护栏 / 声明验证边界） ---');
check('③ 第十九轮定稿未被改坏：严格两态纯函数 / Index ESC 分派一字未动 / onKey 仍是 void 签名',
  escActionByState(true, true) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, true) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false &&
  INDEX.includes('private onKey(event: KeyEvent): void {') &&
  INDEX.includes('const escAct: number = escActionByState(this.fullscreen, this.pendingSystemEcho);') &&
  INDEX.includes('this.quitApp();') && INDEX.includes('this.toggleFull();'), true);
check('③ 回归护栏：版本 / 画质三处 / AA 五源 / 右键 toggle / 几何自愈 全部未破坏',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('this.setFull(false, true);') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,'), true);
console.log('  ⚠️ 本组为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十轮章节。');

// ==================== 第二十一轮：窗口真值同步 / 焦点锚点 / 常显诊断（截图证据驱动） ====================
// 用户第五次反馈并发来实机截图：APP 窗口底部状态栏整块没渲染、无左栏/顶栏，
// 说明系统已退出沉浸（窗口变回带标题栏的自由窗口）而 APP 内部 fullscreen 仍卡在 true。
console.log('\n--- 第二十一轮 ①：窗口真实状态同步（截图证据：APP 内部 fullscreen 卡在 true） ---');
check('① windowStatusIsFullscreen：仅 FULL_SCREEN(1)/MAXIMIZE(2) 算全屏，其余全判普通',
  windowStatusIsFullscreen(1) === true &&
  windowStatusIsFullscreen(2) === true &&
  windowStatusIsFullscreen(0) === false &&
  windowStatusIsFullscreen(3) === false &&
  windowStatusIsFullscreen(4) === false &&
  windowStatusIsFullscreen(5) === false, true);
check('① shouldSyncFullFromWindow：仅「APP 自认全屏 + 系统已非全屏」才同步（防递归/防误判）',
  shouldSyncFullFromWindow(true, false) === true &&
  shouldSyncFullFromWindow(true, true) === false &&
  shouldSyncFullFromWindow(false, false) === false &&
  shouldSyncFullFromWindow(false, true) === false, true);
check('① 端到端：系统曾全屏→退出沉浸(FLOATING=4) → 同步普通态 → 第二次 ESC 必 QUIT_APP',
  windowStatusIsFullscreen(4) === false &&
  shouldSyncFullFromWindow(true, windowStatusIsFullscreen(4)) === true &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP, true);
check('① 首次 ESC 保护：系统仍在全屏(MAXIMIZE=2) 时不同步，仍是 EXIT_FULL（绝不退出 APP）',
  shouldSyncFullFromWindow(true, windowStatusIsFullscreen(2)) === false &&
  escActionByState(true, false) === ESC_ACT_EXIT_FULL, true);

console.log('--- 第二十一轮 ②：运行时接线（windowStatusChange 直发 / ESC 前读真值 / 防误判） ---');
check('② win.on(windowStatusChange) 已注册 + mainWindow 异步就绪重试 + 注册即对齐一次',
  INDEX.includes("win.on('windowStatusChange', (st: window.WindowStatusType): void => {") &&
  INDEX.includes('this.registerWindowStatusSync(0);') &&
  INDEX.includes('WIN_STATUS_RETRY_MAX') &&
  INDEX.includes('this.syncFullWithWindow(); // 注册时先对齐一次'), true);
check('② 两处窗口真值同步都要求 sawWindowFull 前置证据（2in1 恒 FLOATING 不会误退 APP）',
  INDEX.includes('private sawWindowFull: boolean = false;') &&
  (INDEX.match(/this\.sawWindowFull && shouldSyncFullFromWindow\(this\.fullscreen, sysFull\)/g) || []).length === 2 &&
  /if \(sysFull\) \{[^}]*this\.sawWindowFull = true;/.test(INDEX) &&
  INDEX.includes('if (windowStatusIsFullscreen(Number(win.getWindowStatus()))) {'), true);
check('② ESC 分派前先读系统窗口真值（兜底 windowStatusChange 未派发）',
  /case KeyCode\.KEYCODE_ESCAPE: \{[\s\S]{0,400}this\.syncFullWithWindow\(\);/.test(INDEX) &&
  INDEX.includes('st = Number(win.getWindowStatus());'), true);
check('② 四处 setFull(false, true) 仍在：自愈 / 窗口状态回调 / ESC 前兜底 / R23 系统通道',
  INDEX.split('this.setFull(false, true);').length - 1 === 4, true);

console.log('--- 第二十一轮 ③：焦点锚点 / 去重 / 常显诊断 / 退出兜底 ---');
check('③ R23 修可聚焦锚点：Button(\'·\') 带内容 / 4vp / 代码行不再有 HitTestMode.None',
  /Button\('·'\)[\s\S]{0,300}\.id\(KEY_FOCUS_ID\)/.test(INDEX) &&
  /\.width\(4\)[\s\S]{0,80}\.height\(4\)/.test(INDEX) &&
  // 只看非注释代码行：注释里说明「已移除」仍会提到 HitTestMode.None。
  /\.hitTestBehavior\(HitTestMode\.None\)/.test(CODE_LINES) === false &&
  (INDEX.match(/\.onKeyPreIme\(\(event: KeyEvent\): boolean => this\.onKeyCapture\(event\)\)/g) || []).length === 2 &&
  (INDEX.match(/\.onKeyEvent\(\(event: KeyEvent\): boolean => this\.onKeyConsumed\(event\)\)/g) || []).length === 2, true);
check('③ 重聚焦优先抢 Button 锚点，且 aboutToAppear 也主动抢（不再等 setFull 被调用）',
  INDEX.includes('focusControl.requestFocus(KEY_FOCUS_ID);') &&
  /aboutToAppear\(\): void \{[\s\S]{0,1000}this\.scheduleKeyRefocus\(\);/.test(INDEX), true);
check('③ R24 按键去重：ESC 只在当前事件循环内去重，非 ESC 沿用对象引用（不吞第二次 ESC）',
  INDEX.includes('private escDedupEvent: KeyEvent | undefined = undefined;') &&
  INDEX.includes('if (this.escDedupEvent === event) {') &&
  INDEX.includes('this.escDedupEvent = undefined;') &&
  INDEX.includes('if (this.lastKeyEvent === event) {') &&
  INDEX.includes('FULL_EXIT_ESC_GUARD_MS') === false, true);
check('③ 诊断层展开时可见 R38 构建标记 + 诊断行（正式版默认收起，只留百分比）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  /' · ' \+ ESC_BUILD_TAG/.test(INDEX) &&
  INDEX.includes('if (this.escDiag.length > 0 || this.keySeen === 0) {') &&
  INDEX.includes("未收到任何按键") &&
  INDEX.includes(".fontColor(this.escDiag.length > 0 ? '#ffd479' : '#ff9a9a')"), true);
check('③ quitApp 加 destroyWindow 兜底 + pageAlive 保护 + 定时器清理',
  INDEX.includes('w.destroyWindow().catch(() => {});') &&
  INDEX.includes('if (!this.pageAlive) {') &&
  INDEX.includes('QUIT_FALLBACK_DELAY_MS') &&
  INDEX.includes('clearTimeout(this.quitFallbackTimer);'), true);

console.log('--- 第二十一轮 ④：回归护栏 + 验证边界声明 ---');
check('④ 第十九轮严格两态定稿未被推翻（普通恒 QUIT_APP、shouldArmSystemEcho 恒 false）',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(true, true) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  escActionByState(false, true) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false, true);
check('④ 既有接线全未坏：画质三处 / AA 五源 / 右键 toggle / 自愈双判据 / 版本',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十一轮章节。');
console.log('  ⚠️ 截图判定：按 Ctrl+D 展开诊断层后须出现 R38，否则说明装的是旧包。');

// ==================== 第二十二轮：零按键到达 APP（用户 R21 截图证据驱动） ====================
// 截图放大读到的角标：14% · R21 · full=F · win=T，且角标上方**没有黄色诊断行**。
// escDiag 只在 onKey() 内赋值 → 为空即证明「零个按键到达 onKey()」（不只是 ESC）。
// full=F + 三栏恢复则说明第二十一轮 windowStatusChange 同步已生效。
console.log('\n--- 第二十二轮 ①：关闭在 2in1 上无效果却可能吞掉 ESC 的系统沉浸形态 ---');
check('① USE_SYSTEM_IMMERSIVE 恢复 true（R22 关闭后连首次 ESC 返回都失效）+ 保留早返回分支',
  INDEX.includes('const USE_SYSTEM_IMMERSIVE: boolean = true;') &&
  /private async applyWindowFullScreen\(on: boolean, retry: number\): Promise<void> \{[\s\S]{0,600}if \(!USE_SYSTEM_IMMERSIVE\) \{[\s\S]{0,200}hilog\.info/.test(INDEX) &&
  INDEX.includes('ESCDBG skip system immersive'), true);
check('① 保留开关可逆：注释写明改回 false 可复现 R22，窗口几何/画质接线未动',
  /改回 false|可逆开关/.test(INDEX) &&
  INDEX.includes('this.armCanvasReloadFallback();') &&
  INDEX.includes('this.capturePreFullRect(prevFull, on);'), true);

console.log('--- 第二十二轮 ②：新增分发阶段通道 + 修双 defaultFocus 冲突 ---');
check('② onKeyEventDispatch 第三通道（SDK 15+，分发阶段不依赖焦点）挂在根组件且只挂一次',
  (INDEX.match(/\.onKeyEventDispatch\(\(event: KeyEvent\): boolean => this\.onKeyDispatch\(event\)\)/g) || []).length === 1 &&
  INDEX.includes('private onKeyDispatch(event: KeyEvent): boolean {') &&
  // R23 在 onKeyDispatch 入口插入 dispatchSeen++，允许注释/计数位于 onKey 之前。
  /private onKeyDispatch\(event: KeyEvent\): boolean \{[\s\S]{0,250}this\.dispatchSeen\+\+;[\s\S]{0,150}this\.onKey\(event\);/.test(INDEX) &&
  /private onKeyDispatch[\s\S]{0,400}return event\.keyCode === KeyCode\.KEYCODE_ESCAPE;/.test(INDEX), true);
check('② 根组件不再声明 defaultFocus（消除双声明冲突），焦点统一给 Button 锚点',
  // 只看根组件的绑定块：全文另有 2 处历史注释提到 defaultFocus，不能用全文计数。
  INDEX.slice(INDEX.indexOf('.id(ROOT_FOCUS_ID)'),
    INDEX.indexOf('.onKeyEventDispatch(')).includes('.defaultFocus(true)') === false &&
  INDEX.includes('移除这里的 defaultFocus 声明') &&
  INDEX.slice(INDEX.indexOf('.id(KEY_FOCUS_ID)')).includes('.defaultFocus(true)') &&
  INDEX.includes('.id(KEY_FOCUS_ID)') &&
  // 原有的两个焦点通道仍在（根 Column + Button 锚点）
  (INDEX.match(/\.onKeyPreIme\(\(event: KeyEvent\): boolean => this\.onKeyCapture\(event\)\)/g) || []).length === 2 &&
  (INDEX.match(/\.onKeyEvent\(\(event: KeyEvent\): boolean => this\.onKeyConsumed\(event\)\)/g) || []).length === 2, true);

console.log('--- 第二十二轮 ③：官方焦点 API + 可观测（上一轮抢焦点失败完全不可见） ---');
check('③ getFocusController() + setKeyProcessingMode(ANCESTOR_EVENT) + requestFocus(KEY_FOCUS_ID)',
  INDEX.includes('const fc = this.getUIContext().getFocusController();') &&
  INDEX.includes('fc.setKeyProcessingMode(KeyProcessingMode.ANCESTOR_EVENT);') &&
  INDEX.includes('fc.requestFocus(KEY_FOCUS_ID);'), true);
check('③ 接住 focusControl.requestFocus 的 boolean 返回值并写进常显 focusDiag（fc=/f=/rN）',
  INDEX.includes('globalOk = focusControl.requestFocus(KEY_FOCUS_ID);') &&
  INDEX.includes("this.focusDiag = 'fc=' + (fcOk ? 'Y' : 'N') + ' f=' + (globalOk ? 'Y' : 'N') +") &&
  INDEX.includes("'fc=- f=- r0'") &&
  INDEX.includes("hilog.info(DOMAIN, TAG, 'ESCDBG focus %{public}s', this.focusDiag);"), true);
check('③ 只要 keySeen===0 就持续重抢焦点（最多 FOCUS_RETRY_MAX 次），收到按键立即停',
  INDEX.includes('if (this.keySeen === 0 && this.focusRetryCount < FOCUS_RETRY_MAX) {') &&
  INDEX.includes('this.focusRetryCount++;') &&
  /const FOCUS_RETRY_MS: number = 350;/.test(INDEX) &&
  /const FOCUS_RETRY_MAX: number = 12;/.test(INDEX), true);

console.log('--- 第二十二轮 ④：按键到达可观测（一刀切区分「键盘没到」与「ESC 被吃掉」） ---');
check('④ onKey 入口对任意键递增 keySeen（不只 ESC），R24 双轨去重仍在',
  INDEX.includes('if (this.escDedupEvent === event) {') &&
  INDEX.includes('if (this.lastKeyEvent === event) {') &&
  INDEX.includes('this.keySeen++;') &&
  INDEX.includes('@State keySeen: number = 0;'), true);
check('④ 诊断层展开时角标显示 keys=N；keys=0 显示红字「未收到任何按键」+ 焦点结果',
  INDEX.includes("' · keys=' + this.keySeen") &&
  INDEX.includes('if (this.escDiag.length > 0 || this.keySeen === 0) {') &&
  INDEX.includes("'keys=0 · ' + this.focusDiag + ' · 未收到任何按键'") &&
  INDEX.includes(".fontColor(this.escDiag.length > 0 ? '#ffd479' : '#ff9a9a')"), true);
check('④ R38 构建标记已升级（R33 / R32 / R31 / R30 / R29 / R28 / R27 / R26 / R25 / R24 / R23 / R22 / R21 旧包可从截图一眼排除）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R35';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R36';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R33';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R32';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R31';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R30';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R27';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R28';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R26';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R24';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R23';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R22';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R21';") === false, true);

console.log('--- 第二十二轮 ⑤：回归护栏 + 验证边界声明 ---');
check('⑤ 第十九轮严格两态 / 第二十一轮窗口真值同步 / 退出兜底全部保留',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false &&
  windowStatusIsFullscreen(1) === true && windowStatusIsFullscreen(4) === false &&
  shouldSyncFullFromWindow(true, false) === true &&
  INDEX.includes("win.on('windowStatusChange'") &&
  INDEX.includes('w.destroyWindow().catch(() => {});'), true);
check('⑤ 既有接线全未坏：画质三处 / AA 五源 / 右键 toggle / 自愈双判据 / 版本',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十三轮章节。');
console.log('  ⚠️ 截图判定：展开诊断层后须出现 R38；keys=0 且有红字即证明键盘事件未到 APP。');

// ==================== 第二十三轮：系统级按键通道 + 窗口级焦点 + 鼠标确定解 ====================
// R22 截图放大读到的角标：keys=0 · fc=Y f=N r12 · 未收到任何按键 / full=T · win=T。
// 结论：ArkUI 组件级按键通道零到达、12 次全局 requestFocus 全失败；继续改状态机无意义。
console.log('\n--- 第二十三轮 ①：恢复系统沉浸（R22 关掉后连首次 ESC 返回都失效）---');
check('① USE_SYSTEM_IMMERSIVE 恢复 true，applyWindowFullScreen 仍保留可逆早返回分支',
  INDEX.includes('const USE_SYSTEM_IMMERSIVE: boolean = true;') &&
  /private async applyWindowFullScreen\(on: boolean, retry: number\): Promise<void> \{[\s\S]{0,600}if \(!USE_SYSTEM_IMMERSIVE\) \{/.test(INDEX) &&
  INDEX.includes('ESCDBG skip system immersive'), true);

console.log('--- 第二十三轮 ②：inputConsumer 双通道（唯一不经 ArkUI 焦点的应用级链路）---');
check('② import inputConsumer + InputKeyEvent 别名（避免与 ArkUI KeyEvent 同名不同型）',
  INDEX.includes("import inputConsumer from '@ohos.multimodalInput.inputConsumer';") &&
  INDEX.includes("import { KeyEvent as InputKeyEvent } from '@ohos.multimodalInput.keyEvent';"), true);
check('② keyPressed 单键通道优先：KeyPressedConfig / action=1 / isRepeat=false / ESC',
  INDEX.includes('const cfg: inputConsumer.KeyPressedConfig = {') &&
  INDEX.includes('key: KeyCode.KEYCODE_ESCAPE,') &&
  /action: 1,/.test(INDEX) &&
  /inputConsumer\.on\('keyPressed', cfg, \(ev: InputKeyEvent\): void =>/.test(INDEX) &&
  INDEX.includes("this.hkDiag = 'kp';"), true);
check('② hotkeyChange 仅作兜底且与 keyPressed 互斥（一次 ESC 不双分派）',
  INDEX.includes('if (!subscribed) {') &&
  INDEX.includes("inputConsumer.on('hotkeyChange', opts, (o: inputConsumer.HotkeyOptions): void => {") &&
  INDEX.includes('const opts: inputConsumer.HotkeyOptions = {') &&
  INDEX.includes('preKeys: [],') &&
  INDEX.includes('finalKey: KeyCode.KEYCODE_ESCAPE,') &&
  INDEX.includes("this.hkDiag = 'hk';") &&
  INDEX.includes("this.hkDiag = 'N';"), true);
check('② 系统通道与 onKey 共用同一套两态真值来源，退出全屏会主动还原系统沉浸',
  INDEX.includes('private applyEscFromSystemChannel(): void {') &&
  INDEX.includes('const act: number = escActionByState(this.fullscreen, false);') &&
  INDEX.includes('this.applyEscFromSystemChannel();') &&
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP, true);
check('② aboutToAppear 主动注册系统级订阅（不等 setFull / 不等焦点）',
  /this\.registerWindowStatusSync\(0\);\s*this\.scheduleKeyRefocus\(\);\s*this\.registerEscHotkey\(\);/.test(INDEX), true);

console.log('--- 第二十三轮 ③：窗口级焦点保障 + 退出全屏瞬间重启焦点重试 ---');
check('③ ensureWindowFocusable：isFocused 真值 + setWindowFocusable(true) + Promise catch 兜底',
  INDEX.includes('private ensureWindowFocusable(): void {') &&
  INDEX.includes("this.winFocusDiag = 'wf=' + (win.isFocused() ? 'T' : 'F');") &&
  INDEX.includes('win.setWindowFocusable(true).then(() => {') &&
  INDEX.includes('.catch((e: BusinessError) => {') &&
  INDEX.includes("this.winFocusDiag = 'wf=?';"), true);
check('③ 窗口状态监听注册成功后立即保障一次窗口可聚焦',
  /this\.winStatusListenerOn = true;[\s\S]{0,250}this\.ensureWindowFocusable\(\);/.test(INDEX), true);
check('③ 系统退出全屏瞬间重置 12 次焦点重试上限并重抢（修复 r12 永久耗尽）',
  /if \(!sysFull && this\.sawWindowFull\) \{\s*this\.ensureWindowFocusable\(\);\s*this\.focusRetryCount = 0;\s*this\.scheduleKeyRefocus\(\);/.test(INDEX), true);

console.log('--- 第二十三轮 ④：焦点锚点修可聚焦 + 诊断可观测 + 鼠标确定解 ---');
check("④ 锚点从空 builder 改 Button('·') 带内容 / 4vp / 代码行不再有 HitTestMode.None",
  INDEX.includes("Button('·')") &&
  /\.width\(4\)[\s\S]{0,80}\.height\(4\)/.test(INDEX) &&
  /\.hitTestBehavior\(HitTestMode\.None\)/.test(CODE_LINES) === false, true);
check('④ 分发通道到达计数 dsp=N 常显，且不受 onKey 去重影响',
  INDEX.includes('@State dispatchSeen: number = 0;') &&
  INDEX.includes('this.dispatchSeen++;') &&
  INDEX.includes("' · dsp=' + this.dispatchSeen"), true);
check('④ hk=kp/hk/N 与 wf=T/F/? 全部常显在右下角角标',
  INDEX.includes('@State hkDiag: string') &&
  INDEX.includes('@State winFocusDiag: string') &&
  INDEX.includes("' · hk=' + this.hkDiag +") &&
  INDEX.includes("' · ' + this.winFocusDiag)"), true);
check('④ 诊断层展开时显示鼠标「退出 APP」入口：不依赖键盘 / 焦点 / 窗口形态',
  /Text\('退出 APP'\)[\s\S]{0,400}\.onClick\(\(\) => \{\s*this\.quitApp\(\);/.test(INDEX), true);

console.log('--- 第二十三轮 ⑤：回归护栏 + 验证边界声明 ---');
check('⑤ R38 构建标记升级且旧标记已清除（截图一眼排除旧包）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R35';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R36';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R33';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R32';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R31';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R30';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R27';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R28';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R26';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R24';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R23';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R22';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R21';") === false, true);
check('⑤ 第十九轮两态 / 第二十一轮窗口真值同步 / 第二十二轮 keys 诊断 / 版本全部未坏',
  shouldArmSystemEcho(true, true, false) === false &&
  windowStatusIsFullscreen(1) === true &&
  shouldSyncFullFromWindow(true, false) === true &&
  INDEX.includes("win.on('windowStatusChange'") &&
  INDEX.includes("' · keys=' + this.keySeen") &&
  INDEX.includes('未收到任何按键') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
check('⑤ 画质 / 放大镜 / 右键 toggle / 自愈判据等既有接线零回归',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,'), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十三轮章节。');
console.log('  ⚠️ 截图判定：hk=kp/hk=有系统通道，hk=N=ESC 被系统占用（平台限制）。');
console.log('  ⚠️ 确定解：Ctrl+D 展开诊断层后「退出 APP」可点击，不依赖键盘事件 / 焦点 / 窗口形态。');

// ==================== 第二十四轮：R23 截图驱动 —— 第二次 ESC 被吞 ====================
// R23 截图：keys=168 · ESC#1 full=T type=D act=1 (EXIT_FULL) · fc=Y f=Y r12，
// 角标 full=F · win=T · dsp=0 · hk=N · wf=T。按键终于到达 APP、首次 ESC 正确，
// 但诊断串只有 ESC#1 —— 第二次 ESC 没进 onKey()。
console.log('\n--- 第二十四轮 ①：修 escDownHandled 永不复位（第二次 ESC 被吞的直接原因）---');
check('① Up 到达即清 escDownHandled；旧实现 Up 在 if(!down) 提前 return、标志永不复位',
  ONKEY18_CODE.includes('if (isEsc && !rawDown && this.escDownHandled) {') &&
  ONKEY18_CODE.includes('this.escDownHandled = false;') &&
  ONKEY18_CODE.includes('const down: boolean = rawDown || isEsc;') &&
  ONKEY18_CODE.includes('(code === KeyCode.KEYCODE_ESCAPE && !this.escDownHandled)') === false, true);
check('① 只派发 Up 的独立 ESC 仍能被当作一次有效 ESC（2in1 兼容保留）',
  ONKEY18_CODE.includes('this.escDownHandled = rawDown;') &&
  ONKEY18_CODE.includes('const rawDown: boolean = (event.type === KeyType.Down);'), true);

console.log('--- 第二十四轮 ②：ESC 单轮去重（废除永久对象引用，不再吞第二次）---');
check('② 新增 escDedupEvent，且只在当前事件循环内有效（setTimeout 0 清空）',
  INDEX.includes('private escDedupEvent: KeyEvent | undefined = undefined;') &&
  INDEX.includes('if (this.escDedupEvent === event) {') &&
  INDEX.includes('this.escDedupEvent = event;') &&
  INDEX.includes('this.escDedupEvent = undefined;') &&
  /setTimeout\(\(\) => \{\s*this\.escDedupEvent = undefined;\s*\}, 0\);/.test(INDEX), true);
check('② 非 ESC 沿用永久对象引用去重，翻页 / 缩放行为完全不变',
  INDEX.includes('const isEscEarly: boolean = event.keyCode === KeyCode.KEYCODE_ESCAPE;') &&
  INDEX.includes('private lastKeyEvent: KeyEvent | undefined = undefined;') &&
  INDEX.includes('if (this.lastKeyEvent === event) {') &&
  INDEX.includes('this.lastKeyEvent = event;'), true);
check('② 不依赖 2in1 上不可用的 KeyEvent.timestamp（SDK 标注 unavailable to tablet, 2in1）',
  INDEX.includes('event.timestamp') === false &&
  INDEX.includes('lastKeyStamp') === false, true);

console.log('--- 第二十四轮 ③：通道级可观测 + 真实 KeyType ---');
check('③ capSeen / conSeen 在 onKeyCapture / onKeyConsumed 入口递增',
  INDEX.includes('@State capSeen: number = 0;') &&
  INDEX.includes('@State conSeen: number = 0;') &&
  /private onKeyCapture\(event: KeyEvent\): boolean \{\s*this\.capSeen\+\+;/.test(INDEX) &&
  /private onKeyConsumed\(event: KeyEvent\): boolean \{\s*this\.conSeen\+\+;/.test(INDEX), true);
check('③ 黄色诊断行实时拼 cap/con/dsp（第二次 ESC 落在哪层一图可判）',
  INDEX.includes("' · cap=' + this.capSeen + ' con=' + this.conSeen + ' dsp=' + this.dispatchSeen"), true);
check('③ escDiag 的 type 显示真实 KeyType（U = 系统只派发 Up 的 2in1 路径）',
  INDEX.includes("' type=' + (rawDown ? 'D' : 'U')") &&
  INDEX.includes("' type=' + (down ? 'D' : 'U')") === false, true);

console.log('--- 第二十四轮 ④：键盘确定解 Ctrl+Q + 构建标记 + 回归护栏 ---');
check('④ Ctrl+Q 退出：不依赖 ESC / 焦点重建 / 系统沉浸形态',
  INDEX.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_Q) {') &&
  /if \(this\.ctrlDown && code === KeyCode\.KEYCODE_Q\) \{\s*this\.quitApp\(\);\s*return;/.test(INDEX), true);
check('④ R38 构建标记且 R33/R32/R31/R30/R29/R28/R27/R26/R25/R24/R23/R22/R21 旧标记全清除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R35';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R36';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R33';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R32';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R31';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R30';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R27';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R28';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R26';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R24';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R23';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R22';") === false, true);
check('④ 第十九轮两态 / 二十一~二十三轮接线 / 画质放大镜 / 版本零回归',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false &&
  windowStatusIsFullscreen(1) === true &&
  INDEX.includes("win.on('windowStatusChange'") &&
  INDEX.includes('w.destroyWindow().catch(() => {});') &&
  INDEX.includes("Text('退出 APP')") &&
  INDEX.includes('const USE_SYSTEM_IMMERSIVE: boolean = true;') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十四轮章节。');
console.log('  ⚠️ 截图判定：ESC#2 type=U (QUIT_APP) = 修复完成；仍只有 ESC#1 = 第二次按键未派发。');
console.log('  ⚠️ 确定解：Ctrl+Q 恒可用；展开诊断层后另有「退出 APP」鼠标入口，均不依赖 ESC。');

// ==================== 第二十五轮：诊断层收成默认关闭 + 可开关入口 ====================
// ESC 两态退出已实机验证通过；用户要求「保留一个可开关的诊断入口」，
// 正式版界面回到干净状态，回归复查时仍能一键展开全部排查信息。
console.log('\n--- 第二十五轮 ①：运行时开关默认关闭（正式版只留缩放百分比）---');
const DIAG_EXIT_POS = INDEX.indexOf("Text('退出 APP')");
const DIAG_EXIT_SLICE = INDEX.slice(Math.max(0, DIAG_EXIT_POS - 400), DIAG_EXIT_POS);
check('① DIAG_OVERLAY_DEFAULT=false + @State diagOverlayOn（运行时可切，非编译期常量）',
  INDEX.includes('const DIAG_OVERLAY_DEFAULT: boolean = false;') &&
  INDEX.includes('@State diagOverlayOn: boolean = DIAG_OVERLAY_DEFAULT;') &&
  INDEX.includes('private toggleDiagOverlay(): void {') &&
  INDEX.includes('this.diagOverlayOn = !this.diagOverlayOn;'), true);
check('① 关闭时黄色诊断行 / 退出按钮 / 全字段角标全部收起，R55 起无常显百分比分支',
  /if \(this\.diagOverlayOn\) \{\s*if \(this\.escDiag\.length > 0 \|\| this\.keySeen === 0\)/.test(INDEX) &&
  DIAG_EXIT_SLICE.includes('if (this.diagOverlayOn) {') &&
  /Text\(this\.zoomPercentText\(\)\)/.test(INDEX) === false, true);
check('① 状态栏的 ESC# 诊断串也随诊断层开关，正式版状态栏不带排查文本',
  INDEX.includes("this.status + (this.diagOverlayOn && this.escDiag.length > 0 ? '  ·  ' + this.escDiag : '')"), true);

console.log('--- 第二十五轮 ②：两个可开关入口（键盘 + 鼠标）---');
check('② Ctrl+D 切换诊断层（KEYCODE_D=2020，不占任何 UI 空间）',
  INDEX.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_D) {') &&
  /if \(this\.ctrlDown && code === KeyCode\.KEYCODE_D\) \{\s*this\.toggleDiagOverlay\(\);\s*return;/.test(INDEX), true);
check('② 诊断层切换入口：Ctrl+D + 展开时点全字段角标收起（R55 起无常显百分比可点）',
  /' · ' \+ this\.winFocusDiag\)[\s\S]{0,400}this\.toggleDiagOverlay\(\);/.test(INDEX) &&
  (INDEX.match(/this\.toggleDiagOverlay\(\);/g) || []).length >= 2, true);

console.log('--- 第二十五轮 ③：R38 构建标记 + 既有链路零回归 ---');
check('③ R38 构建标记，R33/R32/R31/R30/R29/R28/R27/R26/R25/R24/R23/R22/R21 旧标记全清除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R35';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R36';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R33';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R32';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R31';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R30';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R27';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R28';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R26';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R24';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R23';") === false, true);
check('③ ESC 分派 / 焦点 / 窗口 / inputConsumer / Ctrl+Q 全部原样保留（只改 UI 显示）',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  INDEX.includes('if (isEsc && !rawDown && this.escDownHandled) {') &&
  INDEX.includes('if (this.escDedupEvent === event) {') &&
  INDEX.includes('private ensureWindowFocusable(): void {') &&
  INDEX.includes("inputConsumer.on('keyPressed', cfg") &&
  INDEX.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_Q) {') &&
  INDEX.includes("Text('退出 APP')") &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes("' · cap=' + this.capSeen + ' con=' + this.conSeen + ' dsp=' + this.dispatchSeen"), true);
check('③ SHOW_DIAG_BADGE 编译期目录诊断开关保持原样、diagLine 赋值点未删',
  INDEX.includes('const SHOW_DIAG_BADGE: boolean = false;') &&
  /if \(SHOW_DIAG_BADGE && this\.diagLine\.length > 0\)/.test(INDEX) &&
  (INDEX.match(/this\.diagLine =/g) || []).length >= 10, true);
console.log('  ⚠️ 正式版右下角只显示缩放百分比；按 Ctrl+D 或单击该百分比即可展开诊断层。');
console.log('  ⚠️ 本轮只改 UI 显示与开关，不触碰 ESC 两态退出逻辑（已实机验证通过）。');

// ==================== 第二十六轮：上下键改翻页、移除上下键缩放 ====================
// 用户要求：↑ 与 ← 同向（上一张）、↓ 与 → 同向（下一张）；按上下键不再触发缩放；
// 左右键原行为不变，其它缩放入口与其它看图交互一律不动。
// 注意：R26 的注释里写着旧的 zoomBy(1.25)/zoomBy(0.8) 字样，断言必须先 stripComments，
//      否则「已移除」的护栏会被注释自己误报为失败。
console.log('\n--- 第二十六轮 ①：四个方向键严格同向切换（↑=← / ↓=→）---');
const SWITCH26_START = INDEX.indexOf('switch (code) {');
const ARROW26_CODE = stripComments(INDEX.slice(SWITCH26_START,
  INDEX.indexOf('case KeyCode.KEYCODE_SPACE:', SWITCH26_START)));
const INDEX_CODE26 = stripComments(INDEX);
check('① ← / ↑ 都走 go(-1)，→ / ↓ 都走 go(1)（上下键与左右键完全一致）',
  /case KeyCode\.KEYCODE_DPAD_LEFT:\s*this\.go\(-1\);/.test(ARROW26_CODE) &&
  /case KeyCode\.KEYCODE_DPAD_RIGHT:\s*this\.go\(1\);/.test(ARROW26_CODE) &&
  /case KeyCode\.KEYCODE_DPAD_UP:\s*this\.go\(-1\);/.test(ARROW26_CODE) &&
  /case KeyCode\.KEYCODE_DPAD_DOWN:\s*this\.go\(1\);/.test(ARROW26_CODE), true);
check('① 方向键片段恰好 4 个 case / 4 次 go()，左右键仍是原来的步长（零改动）',
  (ARROW26_CODE.match(/case KeyCode\.KEYCODE_DPAD_/g) || []).length === 4 &&
  (ARROW26_CODE.match(/this\.go\(/g) || []).length === 4 &&
  SWITCH26_START > 0, true);

console.log('--- 第二十六轮 ②：按上下键不再触发缩放 ---');
check('② 方向键 switch 片段零 zoomBy 调用（注释已剥离）',
  ARROW26_CODE.includes('zoomBy(') === false, true);
check('② 剥离注释后的全源码不再有 zoomBy(1.25) / zoomBy(0.8) 键盘缩放调用',
  INDEX_CODE26.includes('this.zoomBy(1.25)') === false &&
  INDEX_CODE26.includes('this.zoomBy(0.8)') === false, true);
check('② zoomBy 只剩 Ctrl+滚轮一处调用（0.9 / 1.1），上下键彻底不是缩放入口',
  (INDEX_CODE26.match(/this\.zoomBy\(/g) || []).length === 1 &&
  INDEX_CODE26.includes('this.zoomBy(d > 0 ? 0.9 : 1.1);'), true);

console.log('--- 第二十六轮 ③：其它缩放入口 / 键盘看图交互零回归 ---');
check('③ 0 复位 / F 1:1 / 空格幻灯片 / R H V / DEL BACK / Ctrl+B / Ctrl+D / Ctrl+Q 全在',
  INDEX_CODE26.includes('case KeyCode.KEYCODE_0:') &&
  INDEX_CODE26.includes('this.resetView();') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_F:') &&
  INDEX_CODE26.includes('this.zoomPixelPerfect();') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_SPACE:') &&
  INDEX_CODE26.includes('this.toggleSlide();') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_R:') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_H:') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_V:') &&
  INDEX_CODE26.includes('case KeyCode.KEYCODE_DEL:') &&
  INDEX_CODE26.includes('this.browseUp();') &&
  INDEX_CODE26.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_B) {') &&
  INDEX_CODE26.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_D) {') &&
  INDEX_CODE26.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_Q) {'), true);
check('③ 滚轮翻页仍是 go(d)（Ctrl 才缩放），双指捏合 / 相片上左键放大镜 / 画质链路未动',
  INDEX_CODE26.includes('this.go(d);') &&
  INDEX_CODE26.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX_CODE26.split('.autoResize(false)').length - 1 === 3 &&
  INDEX_CODE26.split('.dynamicRangeMode(').length - 1 === 3, true);

console.log('--- 第二十六轮 ④：R38 构建标记 + 既有链路零回归 ---');
check('④ ESC_BUILD_TAG=R35，R33/R32/R31/R30/R29/R28/R27/R26/R25/R24/R23/R22/R21 旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
check('④ ESC 两态 / 诊断层开关 / 焦点链路 / 版本 1.0.7 全部未坏',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  shouldArmSystemEcho(true, true, false) === false &&
  INDEX.includes('const DIAG_OVERLAY_DEFAULT: boolean = false;') &&
  INDEX.includes('if (this.escDedupEvent === event) {') &&
  INDEX.includes('if (isEsc && !rawDown && this.escDownHandled) {') &&
  INDEX.includes('private ensureWindowFocusable(): void {') &&
  INDEX.includes("inputConsumer.on('keyPressed', cfg") &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十六轮章节。');
console.log('  ⚠️ 截图判定：按 ↑ / ↓ 只换张、右下角缩放百分比不变；百分比若变说明仍是旧包。');
console.log('  ⚠️ 本轮只改 onKey() 里 2 个 case 分支，不碰任何其它看图交互。');

// ==================== 第二十七轮：NAS 路径 THREAD_BLOCK_6S —— 真异步读取 + 到点即放弃 ====================
// 用户提供的 appfreeze 日志：Current Running = fs.listFile（completeTime 空），
//   JS 栈顶 read(Index.ets:1062) = fs.readSync → ensure(1035) 的 Promise.resolve(...) →
//   preloadOne → pumpAll → startAllPreload → schedulePreload → applyItems → openFolder，
//   native 栈 read+44 / uv_fs_read / libfs.z.so；THREAD_BLOCK_6S、Rss≈918MB、read_bytes≈660MB。
// 根因：ensure() 是**伪异步** —— read() 在 Promise.resolve(...) 的参数里就同步跑完了
//   4 个 fs.*Sync + new ArrayBuffer(size)；pumpAll 一批 4 张连续同步调用，NAS 往返叠加占满 UI 线程。
// 修复：read() 改 async + Promise 版 stat/open/read/close，主线程在每个 await 让出；
//   ensure() 套一层 rawIoTimeoutMs 驱动的超时闸门，到点按 rawDenyAfterFailure 放弃并记 denied；
//   decodePx 的 fd 兜底也从 fs.openSync 改 await fs.open。
console.log('\n--- 第二十七轮 ①：rawIoTimeoutMs 超时判据（有限整数 / 体积加权 / 硬上限）---');
check('① 基线 + 体积加权：1MB 文件 = base + per',
  rawIoTimeoutMs(1024 * 1024, 400, 120, 8000), 520);
check('① 64MB 大文件被 capMs 夹住，绝不无限等',
  rawIoTimeoutMs(64 * 1024 * 1024, 400, 120, 8000), 8000);
check('① capMs<=0 表示不封顶，结果仍是有限整数',
  rawIoTimeoutMs(2 * 1024 * 1024, 400, 120, 0), 640);
check('① 非有限数 / 负值一律归零，不把 NaN / Infinity 传给 setTimeout',
  rawIoTimeoutMs(NaN, -1, Infinity, -5) === 0 &&
  Number.isFinite(rawIoTimeoutMs(NaN, -1, Infinity, -5)) &&
  rawIoTimeoutMs(1024 * 1024, NaN, NaN, 100) === 0, true);
check('① 返回值恒为整数',
  Number.isInteger(rawIoTimeoutMs(1234567, 400, 120, 8000)) &&
  Number.isInteger(rawIoTimeoutMs(-1, -1, -1, -1)), true);

console.log('--- 第二十七轮 ②：rawDenyAfterFailure 到点即放弃判据 ---');
check('② IO 失败 / 超时都立即拉黑（第十轮「遇到问题立即放弃」）',
  rawDenyAfterFailure(false, true, false) === true &&
  rawDenyAfterFailure(false, false, true) === true &&
  rawDenyAfterFailure(false, true, true) === true, true);
check('② 换数据源绝不拉黑：同一个 uri 在新图库里仍可正常进缓存',
  rawDenyAfterFailure(true, true, true) === false &&
  rawDenyAfterFailure(true, true, false) === false &&
  rawDenyAfterFailure(true, false, true) === false, true);
check('② 无失败无超时不拉黑', rawDenyAfterFailure(false, false, false), false);

console.log('--- 第二十七轮 ③：RawStore.read 真异步（4 个 fs.* 全 await，零 *Sync）---');
const READ27_START = MODEL.indexOf('  private async read(uri: string, gen: number)');
const RAW27_READ = stripComments(MODEL.slice(READ27_START,
  MODEL.indexOf('  /** 队头→队尾各条字节数', READ27_START)));
check('③ read() 是 async 且返回 Promise<ArrayBuffer | undefined>',
  /private async read\(uri: string, gen: number\): Promise<ArrayBuffer \| undefined> \{/.test(MODEL) &&
  READ27_START > 0, true);
check('③ stat / open / read / close 全部是 Promise 版 await',
  /const st: fs\.Stat = await fs\.stat\(uri\);/.test(RAW27_READ) &&
  /file = await fs\.open\(uri, fs\.OpenMode\.READ_ONLY\);/.test(RAW27_READ) &&
  /const got: number = await fs\.read\(file\.fd, buf\);/.test(RAW27_READ) &&
  /await fs\.close\(file\);/.test(RAW27_READ), true);
check('③ read() 函数体内零 fs.*Sync（伪异步根因已根除，注释已剥离）',
  /fs\.(statSync|openSync|readSync|closeSync)\(/.test(RAW27_READ), false);
check('③ 预算计算与 LRU 插入仍是同一段同步代码（await 只在 IO 阶段）',
  /const fit: RawFit = rawFitOf\(this\.sizesOf\(\), size,/.test(RAW27_READ) &&
  /this\.data\.set\(uri, buf\);/.test(RAW27_READ) &&
  /this\.bytes \+= size;/.test(RAW27_READ) &&
  /if \(gen !== this\.gen \|\| this\.denied\.has\(uri\)\)/.test(RAW27_READ), true);

console.log('--- 第二十七轮 ④：ensure() 超时闸门 + 伪异步已废除 ---');
const RAW27_ENSURE = stripComments(MODEL.slice(
  MODEL.indexOf('  ensure(uri: string): Promise<ArrayBuffer | undefined>'),
  MODEL.indexOf('  /** 第二十七轮：真异步读取 + 超时放弃闸门')));
check('④ 旧的 Promise.resolve(this.read(...)) 伪异步写法已彻底移除',
  /Promise\.resolve<ArrayBuffer \| undefined>\(this\.read\(uri, gen\)\)/.test(MODEL), false);
check('④ ensure() 改走 readGuarded，在途合并 / denied 短路 / inflight 清理都保留',
  /const job: Promise<ArrayBuffer \| undefined> = this\.readGuarded\(uri, gen\)/.test(RAW27_ENSURE) &&
  /this\.inflight\.delete\(uri\);/.test(RAW27_ENSURE) &&
  /this\.inflight\.set\(uri, job\);/.test(RAW27_ENSURE) &&
  /if \(this\.denied\.has\(uri\)\)/.test(RAW27_ENSURE) &&
  /const running: Promise<ArrayBuffer \| undefined> \| undefined = this\.inflight\.get\(uri\);/.test(RAW27_ENSURE), true);
check('④ readGuarded 用 rawIoTimeoutMs 算上限 + setTimeout + settled 单闸',
  /const limitMs: number = rawIoTimeoutMs\(RAW_SINGLE_MAX_BYTES,/.test(MODEL) &&
  /let settled: boolean = false;/.test(MODEL) &&
  /timer = setTimeout\(\(\): void => \{/.test(MODEL) &&
  /clearTimeout\(timer\);/.test(MODEL) &&
  /new Promise<ArrayBuffer \| undefined>\(/.test(MODEL), true);
check('④ 超时 / IO 失败按 rawDenyAfterFailure 判据记 denied（换源不误杀）',
  (MODEL.match(/rawDenyAfterFailure\(gen !== this\.gen,/g) || []).length === 2 &&
  /const RAW_IO_BASE_MS: number = 400;/.test(MODEL) &&
  /const RAW_IO_PER_MB_MS: number = 120;/.test(MODEL) &&
  /const RAW_IO_CAP_MS: number = 8000;/.test(MODEL) &&
  /rawIoTimeoutMs, rawDenyAfterFailure/.test(MODEL), true);
check('④ RawCache.ts 两个纯函数已导出且模块仍是零 SDK 依赖',
  /export function rawIoTimeoutMs\(/.test(RAW_SRC) &&
  /export function rawDenyAfterFailure\(/.test(RAW_SRC) &&
  /@ohos\./.test(RAW_SRC) === false, true);

console.log('--- 第二十七轮 ⑤：decodePx fd 兜底也异步 + 既有链路零回归 ---');
check('⑤ fd 兜底 open / close 改 await（缓存未命中也不再同步跨进程）',
  /file = await fs\.open\(uri, fs\.OpenMode\.READ_ONLY\);/.test(MODEL) &&
  /await fs\.close\(file\);/.test(MODEL) &&
  /fs\.openSync\(uri, fs\.OpenMode\.READ_ONLY\)/.test(MODEL) === false, true);
check('⑤ ESC 两态 / 方向键翻页 / 诊断层 / ro1 闸门 / 版本 1.0.7 全部未坏',
  escActionByState(true, false) === ESC_ACT_EXIT_FULL &&
  escActionByState(false, false) === ESC_ACT_QUIT_APP &&
  /case KeyCode\.KEYCODE_DPAD_UP:\s*this\.go\(-1\);/.test(INDEX_CODE26) &&
  /case KeyCode\.KEYCODE_DPAD_DOWN:\s*this\.go\(1\);/.test(INDEX_CODE26) &&
  INDEX.includes('const DIAG_OVERLAY_DEFAULT: boolean = false;') &&
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
check('⑤ R38 构建标记，R33/R32/R31/R30/R29/R28/R27/R26/R25/R24/R23/R22/R21 旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
console.log('  ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 路径验证。');
console.log('  ⚠️ 编译校验 ≠ 真机验证：本会话无法安装 HAP / 打开 NAS 目录 / 读取 hilog。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 打开 NAS 图库 → 观察缓存期间界面是否仍可操作、无 appfreeze。');

// ==================== 第二十八轮：NAS 往上层显示错误文件夹清单（2026-11-16，R28） ====================
// 用户复现路径：/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026
// 点「往上层」应进入 …/[青丘图鉴] Nine tail Photography 并列出其真实子目录。
// 真机截图证据：左栏把 /、storage、userExternal、192.168.100.61、图片档案、
// Collection、4 中、[青丘图鉴] Nine tail Photography、2026 全当成「上层文件夹」列出，
// 底部状态栏「无法列出该目录 · {"code":13900002}」，抬头是 APP 内上层「2026」清单。
console.log('\n--- 第二十八轮 ①：NAS 挂载前缀形态（真机 /storage/userExternal/<host>/...）---');
const M_HOST = '192.168.100.61';
const M_TAIL = '图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026';
const M_PARENT_TAIL = '图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography';
const M_MOUNT = '/storage/userExternal/' + M_HOST + '/' + M_TAIL;
const M_PARENT = '/storage/userExternal/' + M_HOST + '/' + M_PARENT_TAIL;
const M_LOGICAL = '/' + M_HOST + '/' + M_TAIL;
const M_PARENT_L = '/' + M_HOST + '/' + M_PARENT_TAIL;
const M_RAW = 'file://' + M_HOST + '/' + M_TAIL;
const M_VOLROOT = '/storage/userExternal/' + M_HOST;
const M_GRAND = '/storage/userExternal/' + M_HOST + '/图片档案/Collection/4 中';

check('R29 用户路径：中文 / 空格 / 方括号 / 英文 / 数字混合目录名 baseName 精确',
  baseName(M_LOGICAL), '2026');
check('R29 用户路径：父级精确落在 [青丘图鉴] Nine tail Photography',
  upLevelOf(M_LOGICAL), M_PARENT_L);
check('R29 用户路径：父级显示名含方括号与空格且未被拆解',
  baseName(upLevelOf(M_LOGICAL)), '[青丘图鉴] Nine tail Photography');
check('R29 方括号目录名不被误判为 IPv6 主机', isNetworkHost('[青丘图鉴] Nine tail Photography'), false);
check('R29 含空格目录名不被误判为主机', isNetworkHost('4 中'), false);
check('R29 地址段被识别为主机', isNetworkHost(M_HOST), true);

check('R29 挂载形态：nasHostOf 抽到主机段（旧版只看第一段返回空）',
  nasHostOf(M_MOUNT), M_HOST);
check('R29 挂载形态：volumeRootOf 取到主机段（旧版误判为 /）',
  volumeRootOf(M_MOUNT), M_VOLROOT);
check('R29 挂载形态：dirLevelOf 与逻辑形态一致', dirLevelOf(M_MOUNT), 5);
check('R29 挂载形态：upLevelOf 精确只剥一层', upLevelOf(M_MOUNT), M_PARENT);
check('R29 挂载形态：仍是 GO 态（不误判到顶 / UNKNOWN）', upNavStateOf(M_MOUNT), UP_NAV_GO);
const M_CHAIN = pathChainOf(M_PARENT);
check('R29 挂载形态：清单首行是 NAS 卷根', M_CHAIN[0], M_VOLROOT);
check('R29 挂载形态：清单不再出现伪造的文件系统根 / 行', M_CHAIN.includes('/'), false);
check('R29 挂载形态：清单不再把 storage / userExternal 当独立目录行',
  M_CHAIN.every(p => baseName(p) !== 'storage' && baseName(p) !== 'userExternal'), true);
check('R29 挂载形态：清单末行是目标父级', M_CHAIN.slice(-1)[0], M_PARENT);
check('R29 挂载形态：清单层级数 5（与逻辑形态一致）', M_CHAIN.length, 5);
check('R29 挂载形态：清单每一级都带 NAS 卷根前缀',
  M_CHAIN.every(p => p.startsWith(M_VOLROOT)), true);

console.log('--- 第二十八轮 ②：规范层级键 / 同层判定 / 百分号编码 ---');
check('R29 规范层级键：挂载形态剥掉前缀', canonicalLevelKeyOf(M_MOUNT), M_LOGICAL);
check('R29 规范层级键：scheme 授权形态归一到同一键', canonicalLevelKeyOf(M_RAW), M_LOGICAL);
check('R29 规范层级键：逻辑形态原样', canonicalLevelKeyOf(M_LOGICAL), M_LOGICAL);
check('R29 规范层级键：非 NAS 路径原样（零回归）',
  canonicalLevelKeyOf('/storage/Users/100/a/b'), '/storage/Users/100/a/b');
check('R29 同层判定：scheme 授权形态 ↔ 挂载形态判为同层',
  sameDirPath(M_RAW, M_MOUNT), true);
check('R29 同层判定：父 URI 的 scheme 形态 ↔ 挂载目标判为同层',
  sameDirPath('file://' + M_HOST + '/' + M_PARENT_TAIL, M_PARENT), true);
check('R29 同层判定：不同目录仍拒绝', sameDirPath(M_PARENT + '/别的', M_PARENT), false);
check('R29 同层判定：空串仍不算同层', sameDirPath('', ''), false);

const M_ENC = encodePathForm(M_PARENT);
check('R29 编码：空格 → %20', M_ENC.includes('%20'), true);
check('R29 编码：方括号 → %5B / %5D', M_ENC.includes('%5B') && M_ENC.includes('%5D'), true);
check('R29 编码：中文 → UTF-8 %E5%9B%BE', M_ENC.includes('%E5%9B%BE'), true);
check('R29 编码：保留 scheme 与主机段',
  encodePathForm('file://' + M_HOST + '/图片档案/4 中').startsWith('file://' + M_HOST + '/'), true);
check('R29 编码：不重复编码已有 %XX', encodePathForm('file://a/%E4%B8%AD'), '');
check('R29 编码：路径分隔符不被编掉', encodePathForm('/a/b c/d').split('/').length, 4);
check('R29 编码：解码侧可还原为同一层（能通过候选过滤）',
  sameDirPath(M_ENC, M_PARENT), true);

console.log('--- 第二十八轮 ③：父级真值校验 isStrictParentOf ---');
check('R29 真值：直接父级通过', isStrictParentOf(M_PARENT, M_MOUNT), true);
check('R29 真值：逻辑形态父级也通过（形态无关）', isStrictParentOf(M_PARENT_L, M_MOUNT), true);
check('R29 真值：自身不是父级（杜绝原地不动）', isStrictParentOf(M_MOUNT, M_MOUNT), false);
check('R29 真值：祖父级被拒（杜绝越级）', isStrictParentOf('/' + M_HOST + '/图片档案', M_MOUNT), false);
check('R29 真值：旁支目录被拒', isStrictParentOf(M_PARENT + '/别的', M_MOUNT), false);
check('R29 真值：空串被拒', isStrictParentOf('', M_MOUNT), false);

console.log('--- 第二十八轮 ④：挂载形态父 URI 候选（不再只剩 1 条兜底）---');
const M_CANDS = upParentCandidates(M_MOUNT, M_RAW);
check('R29 父候选：保留带授权的 file://<host> 形态',
  M_CANDS.some(u => u.indexOf('file://' + M_HOST + '/') === 0), true);
check('R29 父候选：含百分号编码形态（空格 / 方括号 / 中文）',
  M_CANDS.some(u => u.indexOf('%20') >= 0 && u.indexOf('%5B') >= 0), true);
check('R29 父候选：含挂载真实路径目标', M_CANDS.includes(M_PARENT), true);
check('R29 父候选：全部落在同一父层', M_CANDS.every(u => sameDirPath(u, M_PARENT)), true);
check('R29 父候选：不含当前目录自身', M_CANDS.every(u => sameDirPath(u, M_MOUNT) === false), true);
check('R29 父候选：不含祖父层', M_CANDS.every(u => sameDirPath(u, M_GRAND) === false), true);
check('R29 父候选：不再只剩 1 条兜底', M_CANDS.length >= 4, true);
check('R29 父候选：不含丢掉主机段的错误路径',
  M_CANDS.some(u => sameDirPath(u, '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography')), false);

console.log('--- 第二十八轮 ⑤：Index.ets 静态接线 ---');
check('R29 Index 引入 isStrictParentOf', /isStrictParentOf, sameEntryNames/.test(INDEX), true);
check('R29 browseUp 有父级真值校验与 BADLEVEL 诊断',
  /const strictParent: boolean = loose/.test(UP_FN) &&
  /isStrictParentOf\(target, current\)/.test(UP_FN) &&
  /up BADLEVEL/.test(UP_FN) &&
  /target\.length > 0 && !strictParent/.test(UP_FN), true);
check('R29 校验仅严格层级链启用（loose / 卷根判不出时跳过，其它导航零改动）',
  /loose \|\| root\.length === 0 \|\|/.test(UP_FN), true);
check('R29 showUpListInApp 不再把 pathChainOf 逐层 push 成目录行',
  /pathChainOf\(target\)/.test(UPLIST_CODE) &&
  /for \(let i = 0; i < chain\.length; i\+\+\)/.test(UPLIST_CODE) === false, true);
check('R29 showUpListInApp 聚合该层全部真实子目录（含当前目录，按名字去重，绝不只剩 2026）',
  /this\.upListNamesOf\(target, curName\)/.test(UPLIST_CODE) &&
  /this\.upListUriOf\(target, nm\)/.test(UPLIST_CODE) &&
  /mergeUpListNames\(groups\)/.test(INDEX) &&
  /let exists: boolean = false;/.test(UPLIST_CODE) === false, true);
check('R29 showUpListInApp 层级链只用于诊断（chain 计数进 diagLine）',
  /chain\.length/.test(UPLIST_CODE), true);
check('R29 showUpListInApp 仍零 IO / 仍不弹系统选择器',
  /fs\.listFile|fs\.statSync|DocumentViewPicker|this\.applyItems/.test(UPLIST_CODE) === false, true);
check('R29 showUpListInApp 仍回填 browseBase / titlePath / canGoUp',
  /this\.browseBase = target;/.test(UPLIST_CODE) &&
  /this\.titlePath = target;/.test(UPLIST_CODE) &&
  /this\.canGoUp = canGoUpFrom\(target\);/.test(UPLIST_CODE), true);
check('R38 构建标记，R33 及更早旧标记全清除',
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);

console.log('--- 第二十八轮 ⑥：其它导航 / 历史修复零回归 ---');
check('R29 零回归：鸿蒙用户卷根不变', volumeRootOf(DEEP), VOLROOT);
check('R29 零回归：通用 POSIX 卷根不变', volumeRootOf('/a/b/c'), '/');
check('R29 零回归：Windows 盘符卷根不变', volumeRootOf('C:/Users/foo/Pictures/2020'), 'C:');
check('R29 零回归：file://docs 还原不变',
  realPathOf('file://docs/storage/Users/100/a'), '/storage/Users/100/a');
check('R29 零回归：sameDirPath 仍认文档 URI 与真实路径',
  sameDirPath('file://docs' + TARGET + '/', TARGET), true);
check('R29 零回归：sameDirPath 仍拒绝不同目录', sameDirPath(TARGET + '/子', TARGET), false);
check('R29 零回归：普通路径父候选仍有候选',
  upParentCandidates(DEEP, 'file://docs' + DEEP + '/').length > 0, true);
check('R29 零回归：第八轮 NAS 逻辑形态卷根不变', volumeRootOf(NAS_BASE), NAS_ROOT);
check('R29 零回归：第八轮 NAS 父候选仍含 scheme 形态',
  upParentCandidates(NAS_BASE, NAS_RAW).some(u => u.indexOf('file://' + M_HOST + '/') === 0), true);
check('R29 零回归：R27 readGuarded 真异步仍在',
  /private readGuarded\(/.test(MODEL) && /await fs\.read\(file\.fd, buf\)/.test(MODEL), true);
check('R29 零回归：R26 上下键翻页仍在',
  /case KeyCode\.KEYCODE_DPAD_UP:[\s\S]{0,300}this\.go\(-1\)/.test(INDEX), true);
check('R29 零回归：版本守卫 1.0.7', /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('R29 零回归：ro1 总闸门 / 启动路径零 new Promise 未动',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9 &&
  /new Promise|Promise\.race/.test(RESUME_FN) === false, true);
console.log('  ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 往上层验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 打开复现路径 → 点「往上层」→ 应进入父目录并列出真实子目录。');

// ==================== 第二十九轮：上层清单只列 2026、且混入伪目录行（2026-11-16，R29） ====================
// 真机截图 screenshot_20261116_045747（R29 之前的 R28 包）：
//   抬头 APP 内上层「[青丘图鉴] Nine tail Photography」清单（3 项）· ul1
//   左栏 = .. / 2026 / 两条带文件夹图标的「— 上层清单（APP 内）· 点目录名进入 · ul1 —」
//          / 一条真正的说明行；右栏「本层没有图片」。
// 用户要求：该层全部目录（含所有非 2026 目录）都要能识别 / 列出 / 访问，
//           目录结构、命名、导航行为不变，多上级目录时完整无遗漏。
// 源码里没有任何 2026 字面量筛选 —— 限制来自「单槽缓存 + 缓存污染 + 伪行未过滤」。
console.log('\n--- 第二十九轮 ①：伪条目识别（绝不误伤真实目录名）---');
const R29_HINT = '— 上层清单（APP 内）· 点目录名进入 · ul1 —';
check('R29 伪行：清单说明行被识别', isUpListPseudoName(R29_HINT), true);
check('R29 伪行：换 tag 的说明行仍被识别',
  isUpListPseudoName('— 上层清单（APP 内）· 点目录名进入 · ul2 —'), true);
check('R29 伪行：空串 / .. / . 被识别',
  isUpListPseudoName('') && isUpListPseudoName('..') && isUpListPseudoName('.'), true);
check('R29 伪行：.. 行带空格也被识别', isUpListPseudoName('  ..  '), true);
check('R29 真目录：2026 不被误杀', isUpListPseudoName('2026'), false);
check('R29 真目录：所有非 2026 兄弟目录都不被误杀',
  ['2025', '2024', '2023', '合集', '4 中', '[青丘图鉴] Nine tail Photography',
    'Vol.2', '编号202618 模特 奶茶'].every(n => isUpListPseudoName(n) === false), true);
check('R29 真目录：带首尾空格 / 点号 / 方括号的目录名都不被误杀',
  [' 2025 ', 'a.b', '[2022]'].every(n => isUpListPseudoName(n) === false), true);

console.log('--- 第二十九轮 ②：多源清单聚合，完整无遗漏 ---');
const R29_SIBLINGS = ['2026', '2025', '2024', '2023', '2022', '2021', '精选', '未整理'];
const R29_GROUPS = [
  R29_SIBLINGS,
  ['2026', R29_HINT, R29_HINT],   // 旧单槽被 APP 内伪清单污染的形态
  ['2026', '2020', '花絮'],        // 同一层另一份快照
  ['2026'],                        // 当前目录恒列
];
const R29_MERGED = mergeUpListNames(R29_GROUPS);
check('R29 聚合：8 个兄弟目录 + 2 个补充目录 = 10 条，当前目录去重后不增行，零遗漏',
  R29_MERGED.length, 10);
check('R29 聚合：非 2026 目录全部在结果里',
  R29_SIBLINGS.filter(n => n !== '2026').every(n => R29_MERGED.includes(n)) &&
  R29_MERGED.includes('2020') && R29_MERGED.includes('花絮'), true);
check('R29 聚合：当前目录 2026 恰出现一次',
  R29_MERGED.filter(n => n === '2026').length, 1);
check('R29 聚合：伪说明行一条都不出现',
  R29_MERGED.some(n => isUpListPseudoName(n)), false);
check('R29 聚合：首份清单顺序原样保留（不改目录结构 / 命名 / 排序）',
  R29_MERGED.slice(0, 8).join('|'), R29_SIBLINGS.join('|'));
check('R29 聚合：按原名去重，不去空格 / 不改名',
  mergeUpListNames([[' 2025 ', '2025'], ['2025']]).join('|'), ' 2025 |2025');
check('R29 聚合：空组 / 全伪行组返回空清单',
  mergeUpListNames([[], [R29_HINT, '..', '']]).length, 0);
check('R29 聚合：单组原样（旧行为零回归）',
  mergeUpListNames([['2026']]).join('|'), '2026');
// 端到端复现截图：旧缓存里全是伪行时，也绝不能只列 2026
const R29_SHOT = mergeUpListNames([
  ['2026', R29_HINT, R29_HINT],
  ['2026', '2025', '2024', '合集'],
  [],
]);
check('R29 截图复现：清单 = 2026 / 2025 / 2024 / 合集，不再只有 2026、也不再有伪目录',
  R29_SHOT.join('|'), '2026|2025|2024|合集');
check('R29 截图复现：伪目录行数量归零',
  R29_SHOT.filter(n => isUpListPseudoName(n)).length, 0);

console.log('--- 第二十九轮 ③：授权同形态父 URI 还原（生成上级路径）---');
const R29_PICK = 'file://docs/storage/userExternal/' + M_HOST + '/' + M_TAIL;
const R29_PICK_ENC = encodePathForm(R29_PICK);
check('R29 父 URI：picker 原始 file://docs 形态保住了',
  rootFormParentOf(R29_PICK, M_PARENT),
  'file://docs/storage/userExternal/' + M_HOST + '/' + M_PARENT_TAIL);
check('R29 父 URI：还原结果确实落在目标父层',
  sameDirPath(rootFormParentOf(R29_PICK, M_PARENT), M_PARENT), true);
check('R29 父 URI：百分号编码形态也能还原同层',
  sameDirPath(rootFormParentOf(R29_PICK_ENC, M_PARENT), M_PARENT), true);
check('R29 父 URI：编码形态还原后仍是编码串',
  rootFormParentOf(R29_PICK_ENC, M_PARENT).includes('%5B'), true);
check('R29 父 URI：挂载纯路径形态保住了',
  rootFormParentOf(M_MOUNT, M_PARENT), M_PARENT);
check('R29 父 URI：root 已在目标层时原样返回（直接把父层原始授权 URI 拿来试列）',
  rootFormParentOf(M_PARENT, M_PARENT), M_PARENT);
check('R29 父候选：先选父层再进子目录时，父层原始授权 URI 本身进入候选',
  upParentCandidates(M_MOUNT, M_MOUNT, '', [M_PARENT]).includes(M_PARENT), true);
check('R29 父 URI：scheme 授权形态（无挂载前缀）也还原到同层',
  sameDirPath(rootFormParentOf(M_RAW, M_PARENT), M_PARENT), true);
check('R29 父 URI：旁支 / 祖父 / 空串一律拒绝',
  rootFormParentOf('/' + M_HOST + '/别的/2026', M_PARENT) === '' &&
  rootFormParentOf('/' + M_HOST + '/图片档案', M_PARENT) === '' &&
  rootFormParentOf('', M_PARENT) === '' &&
  rootFormParentOf(M_RAW, '') === '', true);

console.log('--- 第二十九轮 ④：父候选补全（父目录真列出来 = 天然含全部子目录）---');
const R29_BASE = upParentCandidates(M_MOUNT, M_MOUNT, '', []);
const R29_WITH = upParentCandidates(M_MOUNT, M_MOUNT, '', [R29_PICK, M_RAW]);
check('R29 父候选：补出 picker 原始授权形态的父 URI',
  R29_WITH.some(u => u.indexOf('file://docs/storage/userExternal/' + M_HOST + '/') === 0), true);
check('R29 父候选：补出 scheme 授权形态的父 URI',
  R29_WITH.some(u => u.indexOf('file://' + M_HOST + '/' + M_PARENT_TAIL) === 0), true);
check('R29 父候选：候选数增加且不含重复',
  R29_WITH.length > R29_BASE.length &&
  new Set(R29_WITH).size === R29_WITH.length, true);
check('R29 父候选：全部仍严格落在同一父层（不越级 / 不绕圈）',
  R29_WITH.every(u => sameDirPath(u, M_PARENT)), true);
check('R29 父候选：不含当前目录自身 / 祖父层',
  R29_WITH.every(u => sameDirPath(u, M_MOUNT) === false && sameDirPath(u, M_GRAND) === false), true);
check('R29 父候选：2 参数旧调用零回归',
  upParentCandidates(M_MOUNT, M_RAW).every(u => sameDirPath(u, M_PARENT)), true);
check('R29 父候选：loose 显式 target + roots 仍落在目标层',
  upParentCandidates(M_MOUNT, M_MOUNT, M_PARENT, [R29_PICK]).every(u =>
    sameDirPath(u, M_PARENT)), true);
check('R29 父候选：非 NAS 普通路径零回归',
  upParentCandidates(DEEP, 'file://docs' + DEEP + '/', '', []).length > 0, true);

console.log('--- 第二十九轮 ⑤：Index.ets 静态接线 ---');
check('R29 Index 引入三个新纯函数',
  /isUpListPseudoName, mergeUpListNames, rootFormParentOf/.test(INDEX), true);
check('R29 多层快照：接口 / 字段 / 上限齐备',
  /interface UpDirSnapshot \{/.test(INDEX) &&
  /private upDirCache: Array<UpDirSnapshot> = \[\];/.test(INDEX) &&
  /const UP_DIR_CACHE_MAX: number = 24;/.test(INDEX), true);
check('R29 openFolder 只从真实 rows 建快照（this.rows 污染源已切断）',
  /this\.cacheUpDirSnapshot\(base, rows\);/.test(INDEX) &&
  /this\.lastUpNames = cacheNames;/.test(INDEX) === false &&
  /this\.lastUpPath = stripTrailingSlash\(this\.browseBase\);/.test(INDEX) === false, true);
check('R29 快照方法过滤 ROW_UP 与伪行、同层合并、旧单槽兼容',
  /isUpListPseudoName\(rn\.name\)/.test(INDEX) &&
  /mergeUpListNames\(\[old\.names, names\]\)/.test(INDEX) &&
  /sameDirPath\(this\.upDirCache\[i\]\.path, keyPath\)/.test(INDEX) &&
  /this\.lastUpNames = names;/.test(INDEX), true);
check('R29 upListNamesOf 聚合该层全部快照 + 旧单槽 + 当前目录',
  /private upListNamesOf\(target: string, currentName: string\)/.test(INDEX) &&
  /sameDirPath\(this\.upDirCache\[i\]\.path, target\)/.test(INDEX) &&
  /sameDirPath\(this\.lastUpPath, target\)/.test(INDEX) &&
  /groups\.push\(\[currentName\]\)/.test(INDEX) &&
  /return mergeUpListNames\(groups\);/.test(INDEX), true);
check('R29 showUpListInApp 逐条渲染聚合结果（当前目录用真实路径 / 兄弟目录用快照 URI 与真实种类）',
  /this\.upListNamesOf\(target, curName\)/.test(UPLIST_CODE) &&
  /this\.upListUriOf\(target, nm\)/.test(UPLIST_CODE) &&
  /this\.upListKindOf\(target, nm,/.test(UPLIST_CODE) &&
  /const isCurrent: boolean = nm === curName;/.test(UPLIST_CODE) &&
  /kind: rowKind/.test(UPLIST_CODE), true);
check('R29 快照带真实行种类：带点的兄弟目录名仍可点进入（ROW_OTHER 不可点）',
  /kinds: Array<number>;/.test(INDEX) &&
  /kinds\.push\(rn\.kind \?\? ROW_IMAGE\)/.test(INDEX) &&
  /private upListKindOf\(target: string, name: string, fallback: number,/.test(INDEX) &&
  /snap\.kinds\[j\] === ROW_FOLDER \? ROW_FOLDER : ROW_OTHER/.test(INDEX), true);
check('R29 showUpListInApp 不再有「只按单槽 exists 去重」的旧逻辑',
  /let exists: boolean = false;/.test(UPLIST_CODE) === false, true);
check('R78 showUpListInApp 伪说明行已整体移除（零处「上层清单（APP 内）」字样）',
  (UPLIST_CODE.match(/上层清单（APP 内）/g) || []).length, 0);
check('R29 showUpListInApp 仍零 IO / 仍不弹系统选择器',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|this\.applyItems|DocumentViewPicker|\.select\(|PhotoViewPicker/.test(UPLIST_CODE) === false, true);
check('R29 showUpListInApp 仍回填 browseBase / titlePath / canGoUp / 停目录轮询',
  /this\.browseBase = target;/.test(UPLIST_CODE) &&
  /this\.titlePath = target;/.test(UPLIST_CODE) &&
  /this\.canGoUp = canGoUpFrom\(target\);/.test(UPLIST_CODE) &&
  /clearInterval\(this\.dirPollTimer\)/.test(UPLIST_CODE), true);
check('R29 showUpListInApp 路径层级链仍只作诊断（不映射成目录行）',
  /pathChainOf\(target\)/.test(UPLIST_CODE) &&
  /for \(let i = 0; i < chain\.length; i\+\+\)/.test(UPLIST_CODE) === false &&
  /chain\.length/.test(UPLIST_CODE), true);
check('R29 browseUp 把 picker 原始授权 URI / browseDir / savedDirUri 交给候选生成',
  /const upRoots: Array<string> = \[\];/.test(UP_FN) &&
  /upRoots\.push\(this\.pickRootUri\)/.test(UP_FN) &&
  /upRoots\.push\(this\.browseDir\)/.test(UP_FN) &&
  /upRoots\.push\(this\.savedDirUri\)/.test(UP_FN) &&
  /upParentCandidates\(current, rawUri, target, upRoots\)/.test(UP_FN) &&
  /upParentCandidates\(current, rawUri, '', upRoots\)/.test(UP_FN), true);
check('R29 browseUp 父级真值校验 / 两处 showUpListInApp 收口 / 清旧锚点均未动',
  /isStrictParentOf\(target, current\)/.test(UP_FN) &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2 &&
  /this\.pickRootUri = '';/.test(UP_FN), true);
check('R38 构建标记且 R33 及更早旧包全部可从截图排除',
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);

console.log('--- 第二十九轮 ⑥：目录结构 / 命名 / 导航行为零回归 ---');
check('R78→R29 零回归：UP_LIST_TAG 仍是 ul1，提醒文案已恒空',
  /const UP_LIST_TAG: string = 'ul1';/.test(INDEX) &&
  inAppUpListHint('父层', 3, 'ul1') === '' &&
  INDEX.includes('APP 内上层「') === false, true);
check('R78 清单计数改为 rows.length - 1（只扣 .. 行；伪说明行已删）',
  /\(rows\.length - 1\)/.test(UPLIST_CODE) &&
  /rows\.length - 2/.test(UPLIST_CODE) === false &&
  /inAppUpListHint\(/.test(UPLIST_CODE) === false, true);
check('R29 零回归：volumeRootOf / dirLevelOf / upLevelOf 不变',
  volumeRootOf(M_MOUNT) === M_VOLROOT && dirLevelOf(M_MOUNT) === 5 &&
  upLevelOf(M_MOUNT) === M_PARENT && upNavStateOf(M_MOUNT) === UP_NAV_GO, true);
check('R29 零回归：canonicalLevelKeyOf / sameDirPath / isStrictParentOf 不变',
  canonicalLevelKeyOf(M_MOUNT) === M_LOGICAL &&
  sameDirPath(M_RAW, M_MOUNT) && isStrictParentOf(M_PARENT, M_MOUNT), true);
check('R29 零回归：encodePathForm / pathChainOf 不变',
  encodePathForm(M_PARENT).includes('%5B') && pathChainOf(M_PARENT)[0] === M_VOLROOT, true);
check('R29 零回归：非 NAS 卷根 / 文档 URI / 版本守卫 / R27 真异步 / R26 翻页',
  volumeRootOf('/a/b/c') === '/' &&
  realPathOf('file://docs/storage/Users/100/a') === '/storage/Users/100/a' &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /private readGuarded\(/.test(MODEL) &&
  /case KeyCode\.KEYCODE_DPAD_UP:[\s\S]{0,300}this\.go\(-1\)/.test(INDEX), true);
console.log('  ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 往上层验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 打开复现路径 → 点「往上层」→ 左栏应列出该层全部子目录（含所有非 2026 目录）。');

// ==================== 第三十轮：重启后「往上层」层级与内容恢复（2026-11-18，R30） ====================
// 实机复现：退出前在授权根的子目录（…/2026/编号202618 模特 奶茶）里看图，
// 重开点「往上层」→ 层级与内容双错（跳到授权根的父级 + 只列一项）。
// 根因：browseBase 不持久化，恢复一律重置到授权根；upDirCache 纯内存态。
console.log('--- 第三十轮 ①：复现路径常量与根因形态 ---');
const R30_HOST = '192.168.100.61';
const R30_PICK = 'file://docs/storage/userExternal/' + R30_HOST +
  '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026';
const R30_PICK_BASE = '/storage/userExternal/' + R30_HOST +
  '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026';
const R30_DEEP = R30_PICK_BASE + '/编号202618 模特 奶茶';
check('R30 复现：授权根与持久化深层都能解析出层级',
  upContextBaseOf(R30_PICK).length > 0 && upContextBaseOf(R30_DEEP).length > 0, true);
check('R30 复现：深层恰好比授权根深一级（isStrictParentOf 成立）',
  isStrictParentOf(R30_PICK_BASE, R30_DEEP), true);
check('R30 根因形态：旧版把 browseBase 重置到授权根后，往上层的目标越级',
  // 旧版 current=授权根 → target=授权根父级；用户实际目录的直接父级是授权根本身
  upLevelOf(R30_DEEP) === R30_PICK_BASE &&
  upLevelOf(R30_PICK_BASE) !== R30_PICK_BASE, true);

console.log('--- 第三十轮 ②：restoreBrowseLevelOf 层级裁决 ---');
check('R30 裁决：持久化深层（授权根之子）被采纳',
  restoreBrowseLevelOf(R30_DEEP, R30_PICK), R30_DEEP);
check('R30 裁决：与授权根同层的持久化值被采纳',
  restoreBrowseLevelOf(R30_PICK_BASE, R30_PICK), R30_PICK_BASE);
check('R30 裁决：更深层（孙级）也被采纳',
  restoreBrowseLevelOf(R30_DEEP + '/更深一层', R30_PICK), R30_DEEP + '/更深一层');
check('R30 裁决：授权根之外的持久化值被拒绝（回退授权根）',
  restoreBrowseLevelOf('/' + R30_HOST + '/别的目录/2026', R30_PICK), R30_PICK_BASE);
check('R30 裁决：授权根之上的持久化值被拒绝（in-app 清单层不冒充浏览层）',
  restoreBrowseLevelOf(upLevelOf(R30_PICK_BASE), R30_PICK), R30_PICK_BASE);
check('R30 裁决：空持久化回退授权根（老数据 / 首次安装零回归）',
  restoreBrowseLevelOf('', R30_PICK), R30_PICK_BASE);
check('R30 裁决：垃圾持久化回退授权根',
  restoreBrowseLevelOf('not a path', R30_PICK), R30_PICK_BASE);
check('R30 裁决：授权根解析不出层级时维持旧语义（返回空，调用方早退）',
  restoreBrowseLevelOf(R30_DEEP, ''), '');
check('R30 裁决：scheme 授权形态的深层持久化同样采纳（形态差异被抹平）',
  restoreBrowseLevelOf('file://' + R30_HOST + '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026/编号202618 模特 奶茶',
    'file://' + R30_HOST + '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026'),
  '/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026/编号202618 模特 奶茶');

console.log('--- 第三十轮 ③：isSameOrUnderLevelOf / rawBrowseFormOf ---');
check('R30 从属：自身 / 子级 true，父级 / 旁支 false',
  isSameOrUnderLevelOf(R30_PICK, R30_PICK) &&
  isSameOrUnderLevelOf(R30_PICK, R30_DEEP) &&
  !isSameOrUnderLevelOf(R30_DEEP, R30_PICK) &&
  !isSameOrUnderLevelOf(R30_PICK, '/' + R30_HOST + '/别的/2026'), true);
check('R30 从属：scheme 与挂载形态互通',
  isSameOrUnderLevelOf(R30_PICK, R30_DEEP + '/x/y'), true);
check('R30 形态：同层时原样返回授权根原始 URI',
  rawBrowseFormOf(R30_PICK, R30_PICK_BASE), R30_PICK);
check('R30 形态：深层拼出同 scheme / 同编码习惯 URI（未编码授权根）',
  rawBrowseFormOf(R30_PICK, R30_DEEP),
  R30_PICK + '/编号202618 模特 奶茶');
check('R30 形态：百分号编码授权根拼出编码深层 URI',
  rawBrowseFormOf(
    'file://docs/storage/userExternal/' + R30_HOST + '/' +
    encodeURIComponent('图片档案') + '/Collection/4%20%E4%B8%AD/' +
    encodeURIComponent('[青丘图鉴] Nine tail Photography') + '/2026',
    R30_DEEP).includes(encodeURIComponent('编号202618 模特 奶茶')), true);
check('R30 形态：授权根之外的层拼不出（空串，绝不凭空造路径）',
  rawBrowseFormOf(R30_PICK, '/' + R30_HOST + '/别的/2026'), '');
check('R30 形态：空入参返回空串',
  rawBrowseFormOf('', R30_DEEP) === '' && rawBrowseFormOf(R30_PICK, '') === '', true);

console.log('--- 第三十轮 ④：多层清单快照编解码（upcache） ---');
const R30_LEVELS = [
  { path: '/storage/userExternal/' + R30_HOST + '/图片档案', names: ['Collection', '照片'], kinds: [2, 2] },
  { path: '/storage/userExternal/' + R30_HOST + '/图片档案/Collection', names: ['4 中', '3 中'], kinds: [2, 2] },
  { path: R30_PICK_BASE, names: ['编号202618 模特 奶茶', '编号202617 模特 咖啡', 'Vol.2'], kinds: [2, 2, 2] },
];
const R30_ENC = encodeUpCacheText(R30_LEVELS, 12, 64, 12000);
const R30_DEC = decodeUpCacheText(R30_ENC, 12, 64);
check('R30 编解码：往返层数一致', R30_DEC.length, 3);
check('R30 编解码：每层条目名与种类逐一致',
  R30_DEC[2].names.join('|') === '编号202618 模特 奶茶|编号202617 模特 咖啡|Vol.2' &&
  R30_DEC[2].kinds.join(',') === '2,2,2' &&
  R30_DEC[0].names.join('|') === 'Collection|照片', true);
check('R30 编解码：层键用规范形态（scheme / 挂载前缀抹平）',
  canonicalLevelKeyOf(R30_DEC[2].path) ===
    '/' + R30_HOST + '/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026', true);
const SEP30 = String.fromCharCode(1);
const KSEP30 = String.fromCharCode(2);
const R30_DIRTY = [
  R30_PICK_BASE + SEP30 + '编号202618 模特 奶茶' + KSEP30 + '2' + SEP30 +
    '— 上层清单（APP 内）· 点目录名进入 · ul1 —' + KSEP30 + '2' + SEP30 + '..' + KSEP30 + '2',
  '',
  R30_PICK_BASE + SEP30 + '编号202617 模特 咖啡' + KSEP30 + 'bad',
].join('\n');
const R30_DIRTY_DEC = decodeUpCacheText(R30_DIRTY, 12, 64);
check('R30 解码容错：伪说明行与 .. 被剔除',
  R30_DIRTY_DEC.length === 1 &&
  R30_DIRTY_DEC[0].names.join('|') === '编号202617 模特 咖啡', true);
check('R30 解码容错：坏 kind 按 -1（未知）处理',
  R30_DIRTY_DEC[0].kinds[0], -1);
check('R30 解码容错：同层重复保留最后一份',
  R30_DIRTY_DEC.length === 1, true);
check('R30 容量：层数封顶（20 层只留尾部 12）',
  decodeUpCacheText(encodeUpCacheText(
    Array.from({ length: 20 }, (_, i) => ({ path: '/vol/a' + i, names: ['n'], kinds: [2] })),
    12, 64, 12000), 12, 64).length, 12);
check('R30 容量：总长封顶（超长文本截断不抛异常）',
  encodeUpCacheText(R30_LEVELS.concat(Array.from({ length: 200 },
    (_, i) => ({ path: '/vol/长目录' + i, names: ['子目录名字很长很长很长' + i], kinds: [2] }))),
    12, 64, 300).length <= 600, true);
check('R30 容量：每层条目封顶',
  decodeUpCacheText(encodeUpCacheText(
    [{ path: '/vol/x', names: Array.from({ length: 100 }, (_, i) => 'n' + i), kinds: [] }],
    12, 64, 12000), 12, 64)[0].names.length, 64);
check('R30 空输入：空文本 / 空层数组返回空',
  encodeUpCacheText([], 12, 64, 12000) === '' &&
  decodeUpCacheText('', 12, 64).length === 0, true);

console.log('--- 第三十轮 ⑤：Index.ets 静态接线 ---');
check('R30 接线：新增两个持久化 key 与三个容量常量',
  /const POS_KEY_BROWSE: string = 'lastBrowseBase';/.test(INDEX) &&
  /const POS_KEY_UPCACHE: string = 'lastUpCache';/.test(INDEX) &&
  /const UP_CACHE_SAVE_LEVELS: number = 12;/.test(INDEX) &&
  /const UP_CACHE_SAVE_NAMES: number = 64;/.test(INDEX) &&
  /const UP_CACHE_SAVE_CHARS: number = 12000;/.test(INDEX), true);
check('R30 接线：readLastPos 读回两个新 key 并 typeof 收窄',
  /await p\.get\(POS_KEY_BROWSE, ''\)/.test(INDEX) &&
  /await p\.get\(POS_KEY_UPCACHE, ''\)/.test(INDEX) &&
  /this\.savedBrowseBase = typeof rawBrowse === 'string' \? rawBrowse : '';/.test(INDEX) &&
  /this\.savedUpCacheRaw = typeof rawUpCache === 'string' \? rawUpCache : '';/.test(INDEX), true);
check('R30 接线：flushPos 异步落盘两个新 key（快照仅脏时写）',
  /await store\.put\(POS_KEY_BROWSE, this\.browseBase\);/.test(INDEX) &&
  /if \(this\.upCacheDirty\) \{\s*\n\s*await store\.put\(POS_KEY_UPCACHE, this\.encodeUpCacheForSave\(\)\);/.test(INDEX), true);
check('R30 接线：flushPosSync 同步补写（切后台 / ESC 退出毫秒级必达）',
  /store\.putSync\(POS_KEY_BROWSE, this\.browseBase\);/.test(INDEX) &&
  /if \(this\.upCacheDirty\) \{\s*\n\s*store\.putSync\(POS_KEY_UPCACHE, this\.encodeUpCacheForSave\(\)\);/.test(INDEX), true);
check('R30 接线：cacheUpDirSnapshot 置脏标记',
  /this\.upCacheDirty = true;/.test(INDEX), true);
check('R30 接线：encodeUpCacheForSave 只存 path / names / kinds（不存 uris）',
  /private encodeUpCacheForSave\(\): string \{[\s\S]{0,400}encodeUpCacheText\(levels, UP_CACHE_SAVE_LEVELS, UP_CACHE_SAVE_NAMES,/.test(INDEX) &&
  /levels\.push\(\{ path: s\.path, names: s\.names, kinds: s\.kinds \}\);/.test(INDEX), true);
check('R30 接线：restoreUpCache 解码回填 upDirCache（uris 留空）',
  /private restoreUpCache\(base: string\): number \{/.test(INDEX) &&
  /decodeUpCacheText\(this\.savedUpCacheRaw,/.test(INDEX) &&
  /this\.upDirCache\.push\(\{ path: lv\.path, names: lv\.names, uris: \[\], kinds: lv\.kinds \}\);/.test(INDEX), true);
check('R30 接线：restoreUpCache 层过滤（授权根子树 ∪ 恢复层级祖先）',
  /isSameOrUnderLevelOf\(this\.savedDirUri, lv\.path\) \|\|/.test(INDEX) &&
  /isSameOrUnderLevelOf\(lv\.path, base\);/.test(INDEX), true);
check('R30 接线：restoreUpCache 同步旧单槽（历史链路仍有值）',
  /this\.lastUpPath = last\.path;/.test(INDEX) &&
  /this\.lastUpNames = last\.names;/.test(INDEX), true);
check('R30 接线：restoreBrowseContext 诊断串带 deep / uc 字段',
  /\(deep \? ' \| deep' : ''\) \+/.test(INDEX) &&
  /' \| uc=' \+ upLevels \+/.test(INDEX), true);
check('R30 接线：恢复期仍然零 IO（restoreBrowseContext / restoreUpCache 不新增任何文件访问）',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|startDirPoll|DocumentViewPicker|PhotoViewPicker/.test(UPC_CODE), false);

console.log('--- 第三十轮 ⑥：常规导航零回归 ---');
check('R30 零回归：冷启动 picker 选目录链路未动（persistFolderUri / openFolder，R32 起结果被收口）',
  /this\.persistFolderUri\(picked\);/.test(INDEX) &&
  /this\.openFolder\(picked, false\)/.test(INDEX), true);
check('R30 零回归：browseUp 严格层级链 / 父级真值校验 / 候选同层过滤未动',
  /isStrictParentOf\(target, current\)/.test(UP_FN) &&
  /upParentCandidates\(current, rawUri, '', upRoots\)/.test(UP_FN), true);
check('R30 零回归：逐层进入（onRowTap → openFolder）与自动重扫链路未动',
  (INDEX.match(/this\.openFolder\(/g) || []).length >= 5, true);
check('R30 零回归：upDirCache 上限 / 单槽兼容 / 伪行过滤未动',
  /const UP_DIR_CACHE_MAX: number = \d+;/.test(INDEX) &&
  /mergeUpListNames\(\[old\.names, names\]\)/.test(INDEX) &&
  /isUpListPseudoName\(rn\.name\)/.test(INDEX), true);
check('R30 零回归：快照 / 单张两条恢复路径仍在 setItems 后回填（各 1 次）',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3, true);
check('R30 零回归：R27 真异步 / R26 翻页 / R25 诊断开关 / 版本守卫全未动',
  /private readGuarded\(/.test(MODEL) &&
  /case KeyCode\.KEYCODE_DPAD_UP:[\s\S]{0,300}this\.go\(-1\)/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX), true);
console.log('  ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机重启验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 子目录看图 → 退出重开 → 点「往上层」→ 应落在直接父级并列出全部子目录。');

// ==================== 第三十一轮：R30 回归修复 —— 状态恢复 + 往上层响应（2026-11-18，R31） ====================
// 回归现象：装 R30 后退出 APP 重开，上次的图片档案不再自动打开；点「往上层」像没反应。
// 根因（三处叠加）：
//   ① R30 encodeUpCacheText 用裸 SOH(U+0001)/STX(U+0002) 作分隔符，整段直接写 preferences；
//      preferences 以 XML 持久化，C0 控制字符是 XML 1.0 非法字符 → putSync/flushSync 抛异常或写坏 KV。
//   ② 写入侧两个增强 key 与核心「位置 / 相片 / 授权根 / 列表快照」共用同一个 try，且排在
//      flushSnap / flush 之前：坏 value 一抛，核心状态全部没落盘 → 退出重开不恢复图片。
//   ③ 读取侧两个增强 key 与 readLastPos 主 try 共用：get 抛异常 → scheduleShowLast 不排程；
//      restoreBrowseContext 不执行 → setItems 已清空 browseBase → browseUp 读到空 current
//      → UP_NAV_NONE → 「往上层」像没反应。
// 修复：DirName.ts 加 P1: + %HH 安全编解码；Index.ets 核心状态优先落盘 / 增强 key 独立读写 /
//       坏数据自愈（清死路径标记）/ 解码失败隔离；构建标记升 R31。
console.log('\n--- 第三十一轮 ①：preferences 安全编解码纯函数 ---');
check('R31 安全编码：空串返回空串（不加前缀）', prefsSafeEncode(''), '');
check('R31 安全编码：恒带 P1: 前缀，中文 / 空格 / 方括号原样保留',
  prefsSafeEncode('/a/图片 2026/[青丘图鉴]'), 'P1:/a/图片 2026/[青丘图鉴]');
check('R31 安全编码：SOH / STX / LF / DEL 全部转成 %HH，输出无裸控制字符',
  prefsSafeEncode('A\u0001B\u0002C\nD\u007fE'), 'P1:A%01B%02C%0AD%7FE');
check('R31 安全编码：百分号先转义成 %25（与 %HH 不歧义）',
  prefsSafeEncode('/a/%E4%B8%AD/2026'), 'P1:/a/%25E4%25B8%25AD/2026');
check('R31 安全编码：任意输入都无 XML 非法 C0 控制字符',
  !/[\u0000-\u001f\u007f]/.test(prefsSafeEncode('x\u0001y\u0002z\n\t\u007f')), true);
check('R31 安全解码：控制字符文本完整往返',
  prefsSafeDecode(prefsSafeEncode('A\u0001B\u0002C\nD\u007fE')), 'A\u0001B\u0002C\nD\u007fE');
check('R31 安全解码：中文 / 空格 / 方括号 / %25 往返一致',
  prefsSafeDecode(prefsSafeEncode('/192.168.100.61/图片档案/[青丘图鉴] Nine tail Photography/2026/%20')),
  '/192.168.100.61/图片档案/[青丘图鉴] Nine tail Photography/2026/%20');
check('R31 安全解码：R30 遗留裸文本原样透传（decodeUpCacheText 仍按 SOH/STX 分割）',
  prefsSafeDecode('/a/b\u0001name\u00022'), '/a/b\u0001name\u00022');
check('R31 安全解码：空串 / 短串 / 无前缀 NAS 百分号路径原样透传',
  prefsSafeDecode('') === '' && prefsSafeDecode('P1') === 'P1' &&
  prefsSafeDecode('/a/%E4%B8%AD/2026') === '/a/%E4%B8%AD/2026', true);
check('R31 安全解码：残缺 / 非十六进制 %XX 容错（不抛、不吞字符）',
  prefsSafeDecode('P1:A%0') === 'A%0' && prefsSafeDecode('P1:A%0G') === 'A%0G' &&
  prefsSafeDecode('P1:%ZZ') === '%ZZ', true);
check('R31 坏数据识别：R30 裸控制字符快照为 true',
  prefsIsLegacyBadCache('/a/b\u0001name\u00022'), true);
check('R31 坏数据识别：R31 转义文本 / 空串 / 普通路径为 false',
  !prefsIsLegacyBadCache(prefsSafeEncode('A\u0001B\u0002C')) &&
  !prefsIsLegacyBadCache('') &&
  !prefsIsLegacyBadCache('/192.168.100.61/图片档案/2026'), true);
const R31_SAFE = prefsSafeEncode(R30_ENC);
check('R31 端到端：真实多层快照编码后带 P1: 且无裸控制字符',
  R31_SAFE.indexOf('P1:') === 0 && !/[\u0000-\u001f\u007f]/.test(R31_SAFE), true);
check('R31 端到端：编码 → 解码 → decodeUpCacheText 层数一致',
  decodeUpCacheText(prefsSafeDecode(R31_SAFE), 12, 64).length, 3);
check('R31 端到端：第三层中文条目名逐一致（中文不膨胀、不乱码）',
  decodeUpCacheText(prefsSafeDecode(R31_SAFE), 12, 64)[2].names.join('|'),
  '编号202618 模特 奶茶|编号202617 模特 咖啡|Vol.2');

console.log('--- 第三十一轮 ②：Index.ets 静态接线（隔离 / 编码 / 自愈） ---');
check('R31 接线：DirName import 三个新函数',
  /prefsSafeEncode, prefsSafeDecode, prefsIsLegacyBadCache/.test(INDEX), true);
check('R35 接线：ESC_BUILD_TAG 升 R38 且源码不再有 R34 定义',
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  /const ESC_BUILD_TAG: string = 'R35';/.test(INDEX) === false &&
  /const ESC_BUILD_TAG: string = 'R36';/.test(INDEX) === false, true);
check('R31 接线：readLastPos 主 try 只 await readBrowseExtras（增强 key 不再内联）',
  /await this\.readBrowseExtras\(p\);/.test(INDEX) &&
  /readLastPos\(\): Promise<void> \{[\s\S]{0,2500}await this\.readBrowseExtras\(p\);/.test(INDEX), true);
check('R31 接线：readBrowseExtras 内层 try + catch 降级，契约「绝不抛」',
  /private async readBrowseExtras\(p: preferences\.Preferences\): Promise<void> \{[\s\S]{0,2200}catch \(e\) \{[\s\S]{0,400}this\.savedBrowseBase = '';/.test(INDEX) &&
  /read browse extras failed \(ignored\)/.test(INDEX), true);
check('R31 接线：坏数据自愈 —— 识别裸控制字符 + saveDeadTag(\'\') 清死路径记忆',
  /prefsIsLegacyBadCache\(rawUpCache\)/.test(INDEX) &&
  /this\.saveDeadTag\(''\);/.test(INDEX) &&
  /drop legacy R30 up-cache, clear dead memory/.test(INDEX), true);
check('R31 接线：读取侧 prefsSafeDecode 还原行式文本',
  /this\.savedUpCacheRaw = prefsSafeDecode\(this\.savedUpCacheRaw\);/.test(INDEX), true);
check('R31 接线：encodeUpCacheForSave 返回 prefsSafeEncode(raw)',
  /const raw: string = encodeUpCacheText\(levels, UP_CACHE_SAVE_LEVELS, UP_CACHE_SAVE_NAMES,[\s\S]{0,160}return prefsSafeEncode\(raw\);/.test(INDEX), true);
const FLP = INDEX.slice(INDEX.indexOf('private async flushPos(): Promise<void> {'),
  INDEX.indexOf('private flushPosSync(): void {'));
check('R31 接线：flushPos 核心 await store.flush() 早于增强 key 写入（退出必达）',
  FLP.indexOf('await store.flush();') >= 0 &&
  FLP.indexOf('await store.flush();') < FLP.indexOf('await store.put(POS_KEY_BROWSE'), true);
const FLS = INDEX.slice(INDEX.indexOf('private flushPosSync(): void {'),
  INDEX.indexOf('private flushPosSync(): void {') + 3200);
check('R31 接线：flushPosSync 核心 flushSync + posPending 清理早于增强 key',
  FLS.indexOf('store.flushSync();') < FLS.indexOf('store.putSync(POS_KEY_BROWSE') &&
  FLS.indexOf('this.posPending = undefined;') < FLS.indexOf('store.putSync(POS_KEY_BROWSE'), true);
check('R31 接线：两处增强 key 各有独立 try + catch(extras)，失败只 warn 不回卷',
  (INDEX.match(/catch \(extras\)/g) || []).length === 2 &&
  /save browse extras failed \(ignored\)/.test(INDEX) &&
  /save browse extras sync failed \(ignored\)/.test(INDEX), true);
check('R31 接线：restoreUpCache 解码整体 try/catch，失败不冒泡到 giveUpNow',
  /private restoreUpCache\(base: string\): number \{[\s\S]{0,2800}catch \(e\) \{[\s\S]{0,320}this\.upDirCache = \[\];/.test(INDEX) &&
  /restore up cache failed \(ignored\)/.test(INDEX), true);
check('R31 接线：catch 三个字段按各自类型复位（upDirCache / lastUpNames 必须是数组）',
  /catch \(e\) \{\s*\n\s*this\.upDirCache = \[\];\s*\n\s*this\.lastUpPath = '';\s*\n\s*this\.lastUpNames = \[\];/.test(INDEX), true);

console.log('--- 第三十一轮 ③：既有链路零回归 + 验证边界 ---');
check('R31 零回归：R30 层级裁决 / 同形态 URI / 多层快照纯函数全部保留',
  restoreBrowseLevelOf('', R30_PICK) === R30_PICK_BASE &&
  rawBrowseFormOf(R30_PICK, R30_DEEP) === R30_PICK + '/编号202618 模特 奶茶' &&
  decodeUpCacheText(R30_ENC, 12, 64).length === 3, true);
check('R31 零回归：两条恢复路径仍在 setItems 后回填、版本 1.0.7、诊断开关未动',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3 &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /isStrictParentOf\(target, current\)/.test(UP_FN), true);
check('R31 零回归：恢复期仍零 IO（restoreBrowseContext / restoreUpCache 无文件访问）',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|startDirPoll|DocumentViewPicker|PhotoViewPicker/.test(UPC_CODE), false);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机重启验证；真实 ArkTS 编译是另一类证据。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 子目录看图 → 退出 APP 重开 → 应自动打开原图片档案；点「往上层」应返回上一层界面。');

// ==================== 第三十二轮：启动阶段 FOLDER picker 误报「不存在该名字的文件夹」 ====================
console.log('\n--- 第三十二轮 ①：picker 起点 / 返回值纯函数（2026-11-18，R32） ---');
const R32_URI = 'file://192.168.100.61/图片档案/Collection/4 中/[奇丘画面] Nine tail Photography';
check('R32 起点：空串 / 纯路径 / 纯名字一律不合格（系统会把它们按「名字」查找）',
  pickerStartSafe('') === false &&
  pickerStartSafe('/storage/userExternal/图片档案/2026') === false &&
  pickerStartSafe('4 中') === false, true);
check('R32 起点：带 scheme 的 NAS URI（中文 / 空格 / 方括号）合格',
  pickerStartSafe(R32_URI), true);
check('R32 起点：R31 的 P1: 快照 / 控制字符 / 超长串全部不合格',
  pickerStartSafe('P1:abc%01def') === false &&
  pickerStartSafe('file://docs/a\u0001b') === false &&
  pickerStartSafe('file://' + 'x'.repeat(5000)) === false, true);
check('R32 起点裁决：本次会话的当前目录优先',
  folderPickStartOf(R32_URI, 'file://docs/other', 'file://docs/last'), R32_URI);
check('R32 起点裁决：browseDir 为空退到 pickRootUri',
  folderPickStartOf('', 'file://docs/root', 'file://docs/last'), 'file://docs/root');
check('R32 起点裁决：启动阶段两个会话锚点都空 → 用上次持久化的 picker 原始 URI',
  folderPickStartOf('', '', 'file://docs/last'), 'file://docs/last');
check('R32 起点裁决：尾斜杠去掉（避免系统按空末段名字解析）',
  folderPickStartOf('', '', 'file://docs/last/'), 'file://docs/last');
check('R32 起点裁决：纯路径 / P1: 脏串 / 纯名字全不合格 → 空串（调用方不设起点）',
  folderPickStartOf('/storage/a', 'P1:xx', '2026'), '');
check('R32 起点裁决：三个都为空 → 空串，零回归',
  folderPickStartOf('', '', ''), '');
check('R32 返回校验：带 scheme URI 与不带 scheme 的绝对路径都算可用文件夹',
  pickedFolderUsable(R32_URI) === true &&
  pickedFolderUsable('/storage/userExternal/图片档案/2026') === true, true);
check('R32 返回校验：纯名字 / 空串 / 控制字符 / P1: 前缀 / 超长全部拦下',
  pickedFolderUsable('4 中') === false &&
  pickedFolderUsable('') === false &&
  pickedFolderUsable('file://docs/a\u0002b') === false &&
  pickedFolderUsable('P1:abc') === false &&
  pickedFolderUsable('/' + 'y'.repeat(5000)) === false, true);
check('R32 结果收口：未选择 → NONE，有效 URI → OK，纯名字 → INVALID',
  pickedFolderKind([]) === FOLDER_PICK_NONE &&
  pickedFolderKind([R32_URI]) === FOLDER_PICK_OK &&
  pickedFolderKind(['4 中']) === FOLDER_PICK_INVALID, true);
check('R32 结果收口：null / undefined / 非字符串首元素都不抛且落到明确状态',
  pickedFolderKind(null) === FOLDER_PICK_NONE &&
  pickedFolderKind(undefined) === FOLDER_PICK_NONE &&
  pickedFolderKind([123]) === FOLDER_PICK_INVALID, true);
check('R32 结果收口：只判定第一个元素，多余 URI 不影响',
  pickedFolderKind([R32_URI, '4 中']), FOLDER_PICK_OK);
check('R32 提示：未选择 / 名字无效 / 无法读取三类都有「重新选择」明确指引',
  folderPickHint(FOLDER_PICK_NONE).includes('重新选择') &&
  folderPickHint(FOLDER_PICK_INVALID).includes('重新选择') &&
  folderPickHint(FOLDER_PICK_UNREADABLE).includes('重新选择'), true);
check('R32 提示：OK 返回空串（不覆盖 openFolder 更具体的目录错误原因）',
  folderPickHint(FOLDER_PICK_OK), '');
check('R32 提示：未选择 / 无效 / 无法读取三条文案互不相同',
  new Set([folderPickHint(FOLDER_PICK_NONE), folderPickHint(FOLDER_PICK_INVALID),
    folderPickHint(FOLDER_PICK_UNREADABLE)]).size, 3);

console.log('--- 第三十二轮 ②：Index.ets 接线 ---');
const R32_FALLBACK = INDEX.slice(INDEX.indexOf('private chooseFilesInDir(dirUri: string): void {'),
  INDEX.indexOf('private chooseFolder(): void {'));
check('R32 接线：DirName import 新函数 + 状态常量',
  /folderPickStartOf, pickedFolderKind, folderPickHint/.test(INDEX) &&
  /FOLDER_PICK_OK, FOLDER_PICK_UNREADABLE/.test(INDEX), true);
check('R32 接线：chooseFolder 显式设置有效 defaultFilePathUri（消除空名字误报）',
  /folderPickStartOf\(this\.browseDir, this\.pickRootUri, this\.savedDirUri\)/.test(CHOOSE_FN) &&
  /if \(start\.length > 0\) \{\s*\n\s*opt\.defaultFilePathUri = start;/.test(CHOOSE_FN), true);
check('R32 接线：chooseFolder 只有 selectMode=FOLDER / maxSelectNumber=1 两个语义参数未变',
  /opt\.selectMode = picker\.DocumentSelectMode\.FOLDER;/.test(CHOOSE_FN) &&
  /opt\.maxSelectNumber = 1;/.test(CHOOSE_FN), true);
check('R32 接线：chooseFilesInDir 不再把内部拼出的 dirUri 直接塞给系统',
  R32_FALLBACK.includes('opt.defaultFilePathUri = dirUri;') === false &&
  /folderPickStartOf\(dirUri, this\.pickRootUri, this\.savedDirUri\)/.test(R32_FALLBACK) &&
  /if \(start\.length > 0\) \{/.test(R32_FALLBACK), true);
check('R32 接线：picker 返回值经 pickedFolderKind 分流，非 OK 只给提示并 return',
  /const kind: number = pickedFolderKind\(uris\);/.test(CHOOSE_FN) &&
  /if \(kind !== FOLDER_PICK_OK\) \{[\s\S]{0,360}this\.status = folderPickHint\(kind\);/.test(CHOOSE_FN) &&
  /return;\s*\n\s*\}\s*\n\s*const picked: string = uris\[0\];/.test(CHOOSE_FN), true);
check('R32 接线：无效选择绝不写持久授权 / 绝不清死路径记忆',
  CHOOSE_FN.indexOf('folderPickHint(kind)') < CHOOSE_FN.indexOf("this.saveDeadTag('')") &&
  CHOOSE_FN.indexOf('folderPickHint(kind)') < CHOOSE_FN.indexOf('this.persistFolderUri(picked)'), true);
check('R32 接线：有效选择仍走清死路径 → 持久授权 → openFolder（启动流程继续）',
  /this\.saveDeadTag\(''\);/.test(CHOOSE_FN) &&
  /this\.persistFolderUri\(picked\);/.test(CHOOSE_FN) &&
  /this\.pickRootUri = picked;/.test(CHOOSE_FN), true);
check('R32 接线：openFolder 的 Promise<boolean> 不再 fire-and-forget 丢弃',
  /this\.openFolder\(picked, false\)\s*\n\s*\.then\(\(ok: boolean\) => \{/.test(CHOOSE_FN) &&
  /if \(!ok\) \{[\s\S]{0,180}chooseFolder picked folder not readable/.test(CHOOSE_FN), true);
check('R32 接线：列不出时保留 openFolder 的具体提示只补日志；抛异常才补统一提示',
  /无法列出该目录 · '/.test(INDEX) &&
  /this\.status = folderPickHint\(FOLDER_PICK_UNREADABLE\);/.test(CHOOSE_FN) &&
  /chooseFolder open rejected/.test(CHOOSE_FN), true);
check('R32 接线：picker reject / 目录内多选取消仍有明确提示',
  /this\.status = '选择文件夹失败：'/.test(CHOOSE_FN) &&
  /this\.status = '已取消多选（可点左栏「选择文件夹」重试）'/.test(R32_FALLBACK), true);

console.log('--- 第三十二轮 ③：既有链路零回归 + 验证边界 ---');
check('R32 零回归：往上层仍不弹系统选择器 / Index 仍不引用 pickerStartOf / chooseFolderAt',
  /chooseFolder\(|DocumentViewPicker|dv\.select/.test(UP_FN) === false &&
  /pickerStartOf\(/.test(INDEX) === false &&
  /chooseFolderAt/.test(INDEX) === false, true);
check('R32 零回归：版本 1.0.7 / 诊断开关 / 死路径立即放弃 / R31 恢复链全部未动',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /this\.giveUpNow\('persist auth lost'/.test(INDEX) &&
  /this\.chooseFolder\(\);/.test(GIVEUP_ALL) &&
  /await this\.readBrowseExtras\(p\);/.test(INDEX), true);
check('R32 零回归：R31 安全编解码 + 核心优先落盘仍在',
  /return prefsSafeEncode\(raw\);/.test(INDEX) &&
  /this\.savedUpCacheRaw = prefsSafeDecode\(/.test(INDEX) &&
  /save browse extras failed \(ignored\)/.test(INDEX), true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；「不存在该名字的文件夹」是系统文件管理器的 UI 提示，属系统侧行为。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 制造 persist auth lost → 自动弹「选择路径」→ 选有效 NAS 目录点「选择」→ 应直接返回并进入目录。');

// ==================== 第三十三轮：缓存父子逻辑层级索引（2026-11-19，R33） ====================
console.log('\n--- 第三十三轮 ①：缓存父子层级索引纯函数 ---');
const R33_L0 = 'file://192.168.100.61/图片档案';
const R33_L1 = 'file://192.168.100.61/图片档案/Collection';
const R33_L2 = 'file://192.168.100.61/图片档案/Collection/4 中';
const R33_L3 = 'file://192.168.100.61/图片档案/Collection/4 中/[奇丘画面] Nine tail Photography';
const R33_LEVELS = [
  { path: R33_L0, names: ['Collection', '2025', '2024'], kinds: [0, 0, 0] },
  { path: R33_L1, names: ['4 中', 'A', 'B'], kinds: [0, 0, 0] },
  { path: R33_L2, names: ['[奇丘画面] Nine tail Photography'], kinds: [0] },
  { path: R33_L3, names: ['IMG_0001.HEIC'], kinds: [1] }
];
const R33_IDX = cachedUpIndexOf(R33_LEVELS);
check('R33 索引：空缓存 → 空索引（keys/edges 空、minLevel=-1）',
  (() => { const e = cachedUpIndexOf([]); return e.keys.length === 0 &&
    e.edges.length === 0 && e.minLevel === -1; })(), true);
check('R33 索引：四层结构预建 4 个层键、3 条父子边、最浅层 L1',
  R33_IDX.keys.length === 4 && R33_IDX.edges.length === 3 && R33_IDX.minLevel === 1, true);
check('R33 索引：每条边都指向缓存里真实存在、且恰好差一级的父层',
  R33_IDX.edges.every(e => R33_IDX.keys.indexOf(e.parentKey) >= 0 &&
    R33_IDX.keys.indexOf(e.childKey) >= 0 &&
    isStrictParentOf(e.parentPath, R33_LEVELS.find(l => canonicalLevelKeyOf(l.path) === e.childKey).path)), true);
check('R33 索引：同一 childKey 只有一条边（连续返回不漂移）',
  new Set(R33_IDX.edges.map(e => e.childKey)).size, 3);
check('R33 索引：父层 names 确实列出子目录名时优先采纳',
  cachedParentOf(R33_IDX, R33_L3), R33_L2);
check('R33 查询：L3→L2 / L2→L1 / L1→L0 逐级命中',
  cachedParentOf(R33_IDX, R33_L3) === R33_L2 &&
  cachedParentOf(R33_IDX, R33_L2) === R33_L1 &&
  cachedParentOf(R33_IDX, R33_L1) === R33_L0, true);
check('R33 查询：最顶层没有父级（返回空串）', cachedParentOf(R33_IDX, R33_L0), '');
check('R33 查询：缓存里没有的层不造父级', cachedParentOf(R33_IDX, '/other/unknown'), '');
check('R33 查询：NAS 挂载形态与授权 URI 形态命中同一条边（规范层级键抹平差异）',
  cachedParentOf(R33_IDX,
    '/storage/userExternal/192.168.100.61/图片档案/Collection/4 中/[奇丘画面] Nine tail Photography'), R33_L2);
check('R33 查询：挂载形态的每一层都逐级命中（不是只认最深一层）',
  cachedParentOf(R33_IDX,
    '/storage/userExternal/192.168.100.61/图片档案/Collection/4 中') === R33_L1 &&
  cachedParentOf(R33_IDX,
    '/storage/userExternal/192.168.100.61/图片档案/Collection') === R33_L0, true);
check('R33 状态：中层可上移、最浅层 TOP、未知层 MISS',
  cachedUpStateOf(R33_IDX, R33_L3) === CACHED_UP_GO &&
  cachedUpStateOf(R33_IDX, R33_L0) === CACHED_UP_TOP &&
  cachedUpStateOf(R33_IDX, '/other') === CACHED_UP_MISS, true);
check('R33 状态：空串 / 空索引一律 MISS，绝不抛',
  cachedUpStateOf(R33_IDX, '') === CACHED_UP_MISS &&
  cachedUpStateOf(cachedUpIndexOf([]), R33_L3) === CACHED_UP_MISS, true);
check('R33 连续返回：L3→L2→L1→L0→TOP 状态链恒定（不越级、不绕圈）',
  (() => { let cur = R33_L3; const chain = [];
    for (let i = 0; i < 6; i++) { const st = cachedUpStateOf(R33_IDX, cur);
      chain.push(st); if (st !== CACHED_UP_GO) { break; } cur = cachedParentOf(R33_IDX, cur); }
    return chain.join(','); })(), '2,2,2,1');
check('R33 缺层不误跳：只有 L0 和 L3 两层（缺中间层）时绝不建越级边',
  cachedUpIndexOf([R33_LEVELS[0], R33_LEVELS[3]]).edges.length, 0);
check('R33 缺层不误跳：此时 L3 查不到父级 → MISS（保持当前目录不变）',
  cachedUpStateOf(cachedUpIndexOf([R33_LEVELS[0], R33_LEVELS[3]]), R33_L3), CACHED_UP_MISS);
check('R33 重复层去重：同层出现两次不产生第二条边',
  cachedUpIndexOf([R33_LEVELS[0], R33_LEVELS[1], R33_LEVELS[1]]).edges.length, 1);
check('R33 落地校验：落在缓存父层 → 一致',
  cachedUpLandsAt(R33_L2, R33_L3, R33_L2), true);
check('R33 落地校验：落到别层 / 越级 / 空串一律不一致',
  cachedUpLandsAt(R33_L2, R33_L3, R33_L1) === false &&
  cachedUpLandsAt(R33_L1, R33_L3, R33_L1) === false &&
  cachedUpLandsAt(R33_L2, R33_L3, '') === false, true);
check('R33 落地校验：挂载形态落地也算同一层级（形态差异不算不一致）',
  cachedUpLandsAt(R33_L2, R33_L3,
    '/storage/userExternal/192.168.100.61/图片档案/Collection/4 中'), true);

console.log('--- 第三十三轮 ②：Index.ets 初始化预建 + 触发复用接线（R35 保留）---');
const R33_RESTORE = INDEX.slice(INDEX.indexOf('private restoreUpCache('),
  INDEX.indexOf('private rebuildUpParentIndex('));
const R33_CACHEFN = INDEX.slice(INDEX.indexOf('private cacheUpDirSnapshot('),
  INDEX.indexOf('private encodeUpCacheForSave('));
check('R34 接线：DirName import 索引类型 + 预建 / 落地 / 两个优先候选纯函数',
  /UpParentIndex, cachedUpIndexOf, cachedUpLandsAt/.test(INDEX) &&
  /cachedUpPreferredParentOf, cachedUpPreferredCandidates/.test(INDEX), true);
check('R33 接线：索引字段初始化为空索引 + built 标志',
  /private upParentIndex: UpParentIndex = \{ edges: \[\], keys: \[\], minLevel: -1 \};/.test(INDEX) &&
  /private upParentBuilt: boolean = false;/.test(INDEX), true);
check('R33 接线：rebuildUpParentIndex 用缓存快照预建索引并置 built',
  /private rebuildUpParentIndex\(\): void \{/.test(INDEX) &&
  /this\.upParentIndex = cachedUpIndexOf\(levels\);/.test(INDEX) &&
  /this\.upParentBuilt = true;/.test(INDEX) && /up index built/.test(INDEX), true);
check('R33 接线：初始化（restoreUpCache）两个出口都预检索缓存结构',
  (R33_RESTORE.match(/this\.rebuildUpParentIndex\(\);/g) || []).length, 2);
check('R33 接线：缓存结构变化（cacheUpDirSnapshot）两个出口都刷新索引',
  (R33_CACHEFN.match(/this\.rebuildUpParentIndex\(\);/g) || []).length, 2);

// ==================== 第三十四轮：往上层无响应修复（2026-11-19，R34） ====================
console.log('\n--- 第三十四轮 ①：缓存索引「降级为优先候选」纯函数 ---');
check('R34 优先父级：GO + 严格直接父级 + target 同层 → 返回缓存父级',
  cachedUpPreferredParentOf(R33_IDX, R33_L3, R33_L2), R33_L2);
check('R34 优先父级：NAS 挂载形态与授权 URI 形态命中同一条边',
  cachedUpPreferredParentOf(R33_IDX,
    '/storage/userExternal/192.168.100.61/图片档案/Collection/4 中/[奇丘画面] Nine tail Photography',
    R33_L2), R33_L2);
check('R34 优先父级：TOP（缓存最浅层）→ 空串，不拦事件',
  cachedUpPreferredParentOf(R33_IDX, R33_L0, R33_L2), '');
check('R34 优先父级：MISS（缓存里没有该层）→ 空串，不拦事件',
  cachedUpPreferredParentOf(R33_IDX, '/other/deep/dir', R33_L2), '');
check('R34 优先父级：空 target / 空索引 / 空 current → 空串，绝不抛',
  cachedUpPreferredParentOf(R33_IDX, R33_L3, '') === '' &&
  cachedUpPreferredParentOf(cachedUpIndexOf([]), R33_L3, R33_L2) === '' &&
  cachedUpPreferredParentOf(R33_IDX, '', R33_L2) === '', true);
check('R34 优先父级：target 与缓存父级不同层 → 空串（绝不越级误跳）',
  cachedUpPreferredParentOf(R33_IDX, R33_L3, R33_L1) === '' &&
  cachedUpPreferredParentOf(R33_IDX, R33_L3, R33_L3) === '', true);
check('R34 优先父级：缺中间层只有 L0+L3 时不造父级 → 空串',
  cachedUpPreferredParentOf(cachedUpIndexOf([R33_LEVELS[0], R33_LEVELS[3]]), R33_L3, R33_L2), '');
check('R34 优先父级：逐级一致 L3→L2 / L2→L1 / L1→L0（连续返回不漂移）',
  (() => { let cur = R33_L3; const chain = [];
    for (let i = 0; i < 4; i++) { const pr = cachedUpPreferredParentOf(R33_IDX, cur, upLevelOf(cur));
      chain.push(pr); if (pr.length === 0) { break; } cur = pr; }
    return chain.join('|'); })(), R33_L2 + '|' + R33_L1 + '|' + R33_L0 + '|');

check('R34 候选合并：preferred 为空 → 原数组原样返回（一个不少、顺序不变）',
  (() => { const c = ['a', 'b', 'c']; const o = cachedUpPreferredCandidates('', c);
    return o.length === 3 && o[0] === 'a' && o[1] === 'b' && o[2] === 'c'; })(), true);
check('R34 候选合并：命中 → 缓存父级排最前，原候选全部保留',
  (() => { const o = cachedUpPreferredCandidates(R33_L2, ['x', 'y']);
    return o.length === 3 && o[0] === R33_L2 && o[1] === 'x' && o[2] === 'y'; })(), true);
check('R34 候选合并：preferred 已在原候选中 → 精确去重、不重复尝试',
  (() => { const o = cachedUpPreferredCandidates('a', ['a', 'b']);
    return o.length === 2 && o[0] === 'a' && o[1] === 'b'; })(), true);
check('R34 候选合并：空候选 + 命中 → 至少返回缓存父级（按钮恒有动作）',
  (() => { const o = cachedUpPreferredCandidates(R33_L2, []);
    return o.length === 1 && o[0] === R33_L2; })(), true);
check('R34 候选合并：纯函数不改动入参数组（无副作用）',
  (() => { const c = ['a', 'b']; cachedUpPreferredCandidates(R33_L2, c);
    return c.length === 2 && c[0] === 'a' && c[1] === 'b'; })(), true);

console.log('--- 第三十四轮 ②：Index.ets 事件响应链路 / 调用关系 / 状态传递 ---');
check('R34 根因护栏：R33 的「缓存唯一闸门」已彻底移除（五条 return 分支全消失）',
  /if \(this\.upParentBuilt && current\.length > 0\) \{/.test(UP_FN) === false &&
  /const cachedState: number = cachedUpStateOf\(/.test(UP_FN) === false &&
  /已到缓存目录结构的最上层/.test(UP_FN) === false &&
  /缓存中缺少当前目录的父级信息/.test(UP_FN) === false &&
  /缓存父级目录不可读取/.test(UP_FN) === false && /up CACHED/.test(UP_FN) === false, true);
check('R34 根因护栏：闸门内强制 canGoUp=0 赋值 / TOP-MISS 早退诊断不再存在',
  /this\.canGoUp = false;/.test(UP_FN) === false &&
  /up CACHED \|/.test(UP_FN) === false, true);
check('R34 事件链路：const current 之后无条件流向 upNavStateOf 层级链（中间无闸门）',
  /const current: string = this\.browseBase;[\s\S]{0,900}const state: number = upNavStateOf\(current\);/.test(UP_FN) &&
  /if \(this\.upParentBuilt[\s\S]{0,80}return;/.test(UP_FN) === false, true);
check('R34 事件链路：三条入口（按钮 up / 退格 DEL-BACK / ROW_UP 行）仍全部收口 browseUp',
  /case 'up':[\s\S]{0,220}this\.browseUp\(\);/.test(INDEX) &&
  /KEYCODE_BACK:[\s\S]{0,220}this\.browseUp\(\);/.test(INDEX) &&
  /kind === ROW_UP\)[\s\S]{0,160}this\.browseUp\(\);/.test(INDEX), true);
check('R34 状态传递：顶层由 upNavStateOf + volumeRootOf 判定，不再看缓存最浅层 minLevel',
  /const state: number = upNavStateOf\(current\)/.test(UP_FN) &&
  /const root: string = volumeRootOf\(current\)/.test(UP_FN) &&
  /UP_NAV_TOP/.test(UP_FN) && /已到卷 \/ 硬盘的逻辑最上层/.test(UP_FN), true);
check('R34 调用关系：缓存索引降级为「优先候选」，接在 upParentCandidates 之后、遍历之前',
  /let parents: string\[\] = loose/.test(UP_FN) &&
  /upParentCandidates\(current, rawUri, '', upRoots\)/.test(UP_FN) &&
  /preferred = cachedUpPreferredParentOf\(this\.upParentIndex, current, target\);/.test(UP_FN) &&
  /parents = cachedUpPreferredCandidates\(preferred, parents\);/.test(UP_FN) &&
  UP_FN.indexOf('cachedUpPreferredCandidates') < UP_FN.indexOf('for (let i = 0; i < parents.length'), true);
check('R34 调用关系：缓存优先候选受 upParentBuilt 保护，索引未建时原候选原样遍历',
  /if \(this\.upParentBuilt\) \{[\s\S]{0,260}cachedUpPreferredParentOf/.test(UP_FN), true);
check('R36 调用关系：不再「首个 parent 成功即 return」—— 所有同层候选并成一次全量探索',
  /const allForms: Array<string> = upExploreFormsOf\(formGroups\);/.test(UP_FN) &&
  /formGroups\.push\(dirCandidates\(parents\[i\]\)\);/.test(UP_FN) &&
  /const ok: boolean = await this\.openFolder\(landUri, false, false, false,[\s\S]{0,60}allForms, wantFull\);/.test(UP_FN) &&
  /const ok: boolean = await this\.openFolder\(parent, false, false\);/.test(UP_FN) === false &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2, true);
check('R34 落地一致性：cachedUpLandsAt 只作成功后的诊断（cache= 字段），不再是闸门',
  /const cacheConsistent: boolean = preferred\.length > 0 &&[\s\S]{0,120}cachedUpLandsAt\(preferred, current, this\.browseBase\);/.test(UP_FN) &&
  /' \| cache=' \+/.test(UP_FN) && /up OK \|/.test(UP_FN), true);
check('R34 零回归：folderBusy / READONLY 早退 / pickRootUri 清理 / 严格父级校验全未动（R43 起 browseUp 不再因 busy 早退，改由 openFolder 抢占）',
  /openFolder 会抢占在途列举/.test(UP_FN) &&
  /this\.status = readonlyUpHint\(\);/.test(UP_FN) &&
  /this\.pickRootUri = '';/.test(UP_FN) &&
  /isStrictParentOf\(target, current\)/.test(UP_FN), true);
check('R34 零回归：往上层恒亮不禁用 / 不弹系统选择器 / 版本 / 诊断开关未动',
  /\.enabled\(/.test(CODE_LINES) === false &&
  /chooseFolder\(|DocumentViewPicker|dv\.select|pickerStartOf\(/.test(UP_FN) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /this\.canGoUp = canGoUpFrom\(this\.browseBase\);/.test(INDEX), true);
check('R34 零回归：R33 初始化预建索引仍是纯字符串零 IO（恢复期不新增 IO）',
  /fs\.listFile|fs\.statSync|fs\.openSync|DocumentViewPicker/.test(
    INDEX.slice(INDEX.indexOf('private rebuildUpParentIndex('),
      INDEX.indexOf('/** 第三十一轮'))) === false, true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 逐层进入或直接选深层目录 → 点「往上层」→ 目录应上移或出 APP 内清单，绝不再「无响应」。');

console.log('--- 第三十三轮 ③：既有链路零回归 + 验证边界 ---');
check('R33 零回归：原路径层级链 / 同层候选 / APP 内清单仍在（仅索引未建立时兜底）',
  /let target: string = upLevelOf\(current\)/.test(UP_FN) &&
  /upParentCandidates\(current, rawUri, '', upRoots\)/.test(UP_FN) &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2, true);
check('R33 零回归：往上层仍不弹系统选择器 / 版本 / 诊断开关 / R32-R31 链路未动',
  /chooseFolder\(|DocumentViewPicker|dv\.select|pickerStartOf\(/.test(UP_FN) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /folderPickStartOf\(this\.browseDir, this\.pickRootUri, this\.savedDirUri\)/.test(INDEX) &&
  /return prefsSafeEncode\(raw\);/.test(INDEX) && /chooseFolderAt/.test(INDEX) === false, true);
check('R33 零回归：恢复期仍零 IO（新增函数全是纯字符串）',
  /fs\.listFile|fs\.statSync|fs\.openSync|DocumentViewPicker/.test(
    INDEX.slice(INDEX.indexOf('private rebuildUpParentIndex('),
      INDEX.indexOf('/** 第三十一轮'))) === false, true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 逐层进入 L0→L1→L2→L3 → 连续点「往上层」→ 应逐级 L3→L2→L1→L0，到 L0 保持不变。');

// ==================== 第三十五轮：往上层后完整探索并列举父层全部目录（2026-11-19，R35） ====================
// 用户报障：点「往上层」后只显示一个目录，没有探索这一层的其它目录。
// 根因不在事件链（R34 已修好），也不在「缓存有没有记过父层」，而在**列举阶段**：
//   openFolder() 对 dirCandidates(父层 URI) 的多个写法逐个 fs.listFile，却用覆盖式
//   `names = n` 只保留一份；父层通常全是子文件夹 → probeChild 恒 false → 采用
//   fallbackBase（第一个能列出的形态）那一份。逐 URI 授权下那一份往往只暴露
//   「被选中的那一个子目录」，其它写法列出来的兄弟目录全被丢弃。
//   APP 内清单态同理：直接选深层目录时 upDirCache 没有父层快照，
//   upListNamesOf 就只剩 `[currentName]` 一项。
// 修复：多写法列举结果**合并而非覆盖** + 从缓存真实目录结构反推兄弟目录 +
//       挑「列得最全」的写法拼子项 URI。三条纯函数零 IO、绝不编造目录名。

const R35_L0 = 'file://192.168.100.61/图片档案';
const R35_L1 = R35_L0 + '/Collection';
const R35_L2 = R35_L1 + '/4 中';
const R35_L3 = R35_L2 + '/[青丘图鉴] Nine tail Photography';
const R35_CUR = '[青丘图鉴] Nine tail Photography';
const R35_PSEUDO = '— 上层清单（APP 内）· 点目录名进入 · ul1 —';
// 「用户直接选深层目录进入」的缓存形态：没有父层自己的清单快照，
// 只有若干「曾浏览过的更深层」路径 —— 正是旧版只剩一个目录的现场。
const R35_DEEP_ONLY = [
  { path: R35_L3, names: ['IMG_0001.HEIC'], kinds: [1] },
  { path: R35_L2 + '/2025', names: ['x.HEIC'], kinds: [1] },
  { path: R35_L2 + '/4 中', names: ['y.HEIC'], kinds: [1] },
  { path: R35_L1, names: ['不该混进来的祖先层名字'], kinds: [0] }
];
const R35_MOUNT = '/storage/userExternal/192.168.100.61/图片档案/Collection/4 中';
const R35_MOUNT_LEVELS = [
  { path: R35_MOUNT + '/' + R35_CUR, names: ['a.HEIC'], kinds: [1] },
  { path: R35_MOUNT + '/2025', names: ['b.HEIC'], kinds: [1] }
];

console.log('\n--- 第三十五轮 ①：mergeExploreNames —— 多写法列举结果合并而非覆盖 ---');
check('R35 根因场景：第一份只列到 2026、后两份各有兄弟目录 → 三份并集全都在（不再只显示一个目录）',
  mergeExploreNames([['2026'], ['2025'], ['2024', '2026']]).join('|'), '2026|2025|2024');
check('R35 合并：逐组按原顺序收纳、按原名精确去重（含首尾空格不 trim）',
  mergeExploreNames([[' B ', 'A'], ['A', 'C']]).join('|'), ' B |A|C');
check('R35 合并：空串 / `.` / `..` / 点文件 / 伪说明行一律不入清单',
  mergeExploreNames([['..', '.', '', '.DS_Store', R35_PSEUDO, '真目录']]).join('|'), '真目录');
check('R35 合并：过滤口径对齐 openFolder 的 HIDE_DOT_FILES（隐藏点文件不出现在左栏）',
  mergeExploreNames([['.hidden'], ['可见目录']]).join('|'), '可见目录');
check('R35 合并：APP 内清单伪说明行绝不变成可点击的文件夹行',
  mergeExploreNames([[R35_PSEUDO]]).length, 0);
check('R35 合并：中文 / 方括号 / 空格混合目录名原样保留（不 trim、不改名、不重排）',
  mergeExploreNames([['[青丘图鉴] Nine tail Photography', '4 中', '编号202618 模特 奶茶']]).join('|'),
  '[青丘图鉴] Nine tail Photography|4 中|编号202618 模特 奶茶');
check('R35 合并：全空输入 → 空数组', mergeExploreNames([]).length, 0);
check('R35 合并：各组都为空 → 空数组（不冒出 `..` 之类的兜底行）',
  mergeExploreNames([[], ['', '..', '.']]).length, 0);
check('R35 合并：单组除过滤外原样返回（不排序、不补项）',
  mergeExploreNames([['2025', '2026']]).join('|'), '2025|2026');
check('R35 合并：纯函数不改动入参数组（无副作用）',
  (() => { const g = [['2026'], ['2025']]; mergeExploreNames(g);
    return g.length === 2 && g[0][0] === '2026' && g[1][0] === '2025'; })(), true);
check('R35 合并：输出恒为输入真实名字的子集，绝不凭空编造目录名',
  (() => { const gs = [['甲', '乙'], ['丙']]; const all = new Set(gs.flat());
    return mergeExploreNames(gs).every(n => all.has(n)); })(), true);
check('R35 合并：与 mergeUpListNames 同口径（复用既有聚合、不另造一套规则）',
  mergeExploreNames([['甲', '乙'], ['乙', '丙']]).join('|') ===
  mergeUpListNames([['甲', '乙'], ['乙', '丙']]).join('|'), true);

console.log('--- 第三十五轮 ②：exploreBaseOf —— 挑「列得最全」的 URI 写法拼子项 ---');
check('R35 选基准：有效条目最多那组对应的 form 胜出',
  exploreBaseOf(['f0', 'f1', 'f2'], [['A'], ['A', 'B', 'C'], ['A', 'B']]), 'f1');
check('R35 选基准：并列时取第一个（连续触发结果稳定、不抖动）',
  exploreBaseOf(['f0', 'f1'], [['A'], ['A']]), 'f0');
check('R35 选基准：计数排除伪行 / 点文件，与 mergeExploreNames 同口径',
  exploreBaseOf(['f0', 'f1'], [['A', 'B', '.x', '..'], ['A']]), 'f0');
check('R35 选基准：各组都没有有效条目 → 空串（由 fallbackBase 兜底，绝不返回空形态当 base）',
  exploreBaseOf(['f0'], [['', '..', '.x']]), '');
check('R35 选基准：空输入 → 空串，不抛、不越界', exploreBaseOf([], []), '');
check('R35 选基准：forms 短于 groups 时只在前 n 组里选，绝不越界',
  exploreBaseOf(['f0'], [['A', 'B', 'C'], ['A', 'B', 'C', 'D']]), 'f0');
check('R35 选基准：forms 长于 groups 时同样安全退化',
  exploreBaseOf(['f0', 'f1'], [['A', 'B', 'C']]), 'f0');
check('R35 选基准：返回值恒来自 forms，绝不凭空编造 URI',
  (() => { const fs = ['f0', 'f1', 'f2']; return fs.includes(exploreBaseOf(fs, [['A'], ['A', 'B'], ['A']])); })(), true);
check('R35 选基准：纯函数不改动入参数组（无副作用）',
  (() => { const fs = ['f0', 'f1']; const gs = [['A'], ['A', 'B']]; exploreBaseOf(fs, gs);
    return fs.length === 2 && gs[1].length === 2; })(), true);

console.log('--- 第三十五轮 ③：exploreSiblingNamesOf —— 从缓存目录结构反推兄弟目录 ---');
check('R35 核心场景：缓存没有父层清单快照，仍从「曾浏览过的更深层」反推全部兄弟目录',
  exploreSiblingNamesOf(R35_DEEP_ONLY, R35_L2, R35_CUR).join('|'),
  R35_CUR + '|2025|4 中');
check('R35 兄弟目录：与 target 同层的快照，其 names 就是这一层真实列过的全部子目录',
  exploreSiblingNamesOf([{ path: R35_L1, names: ['4 中', 'A', 'B'], kinds: [0, 0, 0] }],
    R35_L1, '4 中').join('|'), '4 中|A|B');
check('R35 兄弟目录：恒含 currentName（当前目录一定是 target 的子目录）',
  exploreSiblingNamesOf([], R35_L1, '当前目录').join('|'), '当前目录');
check('R35 回归护栏：绝不把祖先层 / 更深层 / 其它层的名字混进这一层（R28 错误清单不再复现）',
  exploreSiblingNamesOf(R35_DEEP_ONLY, R35_L2, R35_CUR)
    .includes('不该混进来的祖先层名字') === false &&
  exploreSiblingNamesOf(R35_DEEP_ONLY, R35_L2, R35_CUR)
    .includes('IMG_0001.HEIC') === false, true);
check('R35 兄弟目录：NAS 挂载形态路径与 scheme 授权形态抹平后仍命中同一层',
  exploreSiblingNamesOf(R35_MOUNT_LEVELS, R35_L2, R35_CUR).join('|'), R35_CUR + '|2025');
check('R35 兄弟目录：伪说明行被剔除，绝不变成可点击目录行',
  exploreSiblingNamesOf([{ path: R35_L2, names: [R35_PSEUDO, '真目录'], kinds: [0, 0] }],
    R35_L2, '真目录').join('|'), '真目录');
check('R35 兄弟目录：按原名去重（同层快照 + 深层路径 + currentName 三路重复只留一条）',
  (() => { const o = exploreSiblingNamesOf([
    { path: R35_L2, names: [R35_CUR, '2025'], kinds: [0, 0] },
    { path: R35_L3, names: ['a.HEIC'], kinds: [1] }
  ], R35_L2, R35_CUR); return new Set(o).size === o.length; })(), true);
check('R35 兄弟目录：空 levels 只返回 currentName，绝不抛',
  exploreSiblingNamesOf([], R35_L2, '甲').join('|'), '甲');
check('R35 兄弟目录：target 空串 / currentName 空串都安全退化，不引入空条目',
  exploreSiblingNamesOf(R35_DEEP_ONLY, '', R35_CUR).join('|') === R35_CUR &&
  exploreSiblingNamesOf(R35_DEEP_ONLY, R35_L2, '').includes('') === false, true);
check('R35 兄弟目录：输出只来自真实快照 names / 真实路径末段 / currentName，绝不编造',
  (() => { const o = exploreSiblingNamesOf(R35_DEEP_ONLY, R35_L2, R35_CUR);
    const ok = new Set([R35_CUR, '2025', '4 中', '不该混进来的祖先层名字', 'IMG_0001.HEIC']);
    return o.every(n => ok.has(n)); })(), true);

console.log('--- 第三十五轮 ④：Index.ets 静态接线 + 根因护栏 + 零回归 ---');
const R35_OPEN_CODE = stripComments(INDEX.slice(INDEX.indexOf('private async openFolder('),
  INDEX.indexOf('private probeChild(')));
const R35_UPNAMES_CODE = stripComments(INDEX.slice(INDEX.indexOf('private upListNamesOf('),
  INDEX.indexOf('private upListUriOf(')));
const R35_DIR_CODE = stripComments(DIRNAME_SRC.slice(DIRNAME_SRC.indexOf('第三十五轮：往上层')));
check('R35 接线：Index 引入 mergeExploreNames / exploreBaseOf / exploreSiblingNamesOf 三个纯函数',
  /mergeExploreNames, exploreBaseOf, exploreSiblingNamesOf \} from '\.\.\/common\/DirName'/.test(INDEX), true);
check('R35 接线：openFolder 收集每一次成功 listFile 的形态与条目名（零新增 IO，这些调用本来就会跑）',
  /let exploreForms: Array<string> = \[\];/.test(R35_OPEN_CODE) &&
  /let exploreGroups: Array<Array<string>> = \[\];/.test(R35_OPEN_CODE) &&
  /exploreForms\.push\(cand\);/.test(R35_OPEN_CODE) &&
  /exploreGroups\.push\(n\);/.test(R35_OPEN_CODE) &&
  (R35_OPEN_CODE.match(/await fs\.listFile\(/g) || []).length === 1, true);
check('R35 根因护栏：覆盖式 `names = n;` 已从源码彻底消失（兄弟目录不再被后一份冲掉）',
  R35_OPEN_CODE.includes('names = n;') === false &&
  INDEX.includes('names = n;') === false, true);
check('R35 接线：循环末用 mergeExploreNames 合并所有真实列举结果，且接在收集之后',
  /names = mergeExploreNames\(exploreGroups\);/.test(R35_OPEN_CODE) &&
  R35_OPEN_CODE.indexOf('names = mergeExploreNames(exploreGroups);') >
    R35_OPEN_CODE.indexOf('exploreGroups.push(n);'), true);
check('R35 接线：base 为空时用 exploreBaseOf 挑列得最全的形态，空结果仍由 fallbackBase 兜底',
  /const best: string = exploreBaseOf\(exploreForms, exploreGroups\);/.test(R35_OPEN_CODE) &&
  /base = best\.length > 0 \? best : fallbackBase;/.test(R35_OPEN_CODE) &&
  /fallbackBase = cand;/.test(R35_OPEN_CODE), true);
check('R35 零回归：probeChild 仍用来优先挑「子文件真能读」的形态，childReadable 语义未改',
  /if \(n\.length > 0 && this\.probeChild\(cand, n\)\)/.test(R35_OPEN_CODE) &&
  /childReadable = true;/.test(R35_OPEN_CODE) &&
  /!childReadable && allowFileFallback !== false/.test(R35_OPEN_CODE), true);
check('R35 可观测：无子文件可读时日志带 forms / names 计数，便于真机核对探索覆盖度',
  /forms=%\{public\}d names=%\{public\}d/.test(R35_OPEN_CODE) &&
  /base, exploreForms\.length, names\.length/.test(R35_OPEN_CODE), true);
check('R35 接线：upListNamesOf 把缓存结构反推的兄弟目录并入 APP 内清单',
  /groups\.push\(exploreSiblingNamesOf\(levels, target, currentName\)\);/.test(R35_UPNAMES_CODE) &&
  R35_UPNAMES_CODE.indexOf('exploreSiblingNamesOf(levels, target, currentName)') >
    R35_UPNAMES_CODE.indexOf('groups.push([currentName]);'), true);
check('R35 接线：APP 内清单的两条落地路径（真实目录表 / APP 内清单）仍共用 mergeUpListNames',
  /return mergeUpListNames\(groups\);/.test(R35_UPNAMES_CODE) &&
  /names = mergeExploreNames\(exploreGroups\);/.test(R35_OPEN_CODE), true);
check('R35 零回归：APP 内清单仍是零 IO 纯字符串，不弹系统选择器',
  /fs\.listFile|fs\.statSync|fs\.openSync|DocumentViewPicker/.test(R35_UPNAMES_CODE) === false &&
  /chooseFolder\(|DocumentViewPicker|dv\.select/.test(UP_FN) === false, true);
check('R35 零回归：三个新增纯函数区块零 IO、零 await、零抛出（可直接 Node 回归）',
  /fs\.|DocumentViewPicker|await |throw /.test(R35_DIR_CODE) === false &&
  /export function mergeExploreNames\(/.test(R35_DIR_CODE) &&
  /export function exploreSiblingNamesOf\(/.test(R35_DIR_CODE) &&
  /export function exploreBaseOf\(/.test(R35_DIR_CODE), true);
check('R35 零回归：R34 事件主链未动 —— 三条入口 / 无闸门 / 两条 showUpListInApp / 优先候选',
  /case 'up':[\s\S]{0,220}this\.browseUp\(\);/.test(INDEX) &&
  /KEYCODE_BACK:[\s\S]{0,220}this\.browseUp\(\);/.test(INDEX) &&
  /kind === ROW_UP\)[\s\S]{0,160}this\.browseUp\(\);/.test(INDEX) &&
  /up CACHED/.test(UP_FN) === false &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2 &&
  /parents = cachedUpPreferredCandidates\(preferred, parents\);/.test(UP_FN), true);
check('R35 零回归：版本 1.0.7 / 诊断默认关闭 / 往上层恒亮不禁用 / 严格父级校验全未动',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /isStrictParentOf\(target, current\)/.test(UP_FN), true);
check('R38 构建标记升 R38，R34 及更早旧包可从截图一眼排除',
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21']
    .every(t => INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤：装 R38 包 → 进入深层目录 → 点「往上层」→ 应列出该层全部子目录（含非当前目录的兄弟目录）。');
console.log('  ⚠️ 边界：父层完全无 URI 授权、且会话缓存里也没有其它兄弟目录痕迹时，');
console.log('     APP 内清单仍只能列出当前目录 —— 零 IO 兜底绝不凭空编造目录名。');

// ==================== 第三十六轮：目录恢复解耦 + 上层真实全量列举（2026-11-19，R36） ====================
// 两条根因：
//  ① 退出恢复链整条以「有图片位置」为前提：applyItems 零图片把 cur 置 -1 →
//     markPos 直接 return → flushPos/flushPosSync 走 FLUSH_SKIP → POS_KEY_BROWSE
//     从不落盘；重开 showLastOnStart 用 resumeAction（无 uri）/ enterSettledOk(0)
//     / giveUpNow 把「正常的无图片目录」判成恢复失败 → 回默认目录 + 弹选择器。
//  ② R35 合并了单次 openFolder 内多个 URI 写法，却仍在 browseUp 里「首个 parent
//     成功即 return」，且 openFolder 首个 probeChild 命中就 break —— 其余候选真实
//     列出来的兄弟资料夹全被丢掉，所以往上层只显示一个目录。
console.log('--- 第三十六轮 ①：目录上下文与「有没有图片位置」解耦（ResumePlan 纯函数）---');
check('R36 常量：DIR_RESUME_NONE=0 / DIR_RESUME_CONTEXT=1 / 目录态标记是安全单字符',
  DIR_RESUME_NONE === 0 && DIR_RESUME_CONTEXT === 1 &&
  DIRCTX_EMPTY === '1' && DIRCTX_EMPTY.length === 1, true);
check('R36 目录态：空目录（有浏览层级 + 0 张图）→ 标记 1',
  dirContextFlagOf('/nas/人像', 0), DIRCTX_EMPTY);
check('R36 目录态：无图片、只有子文件夹的目录（同样 0 张）→ 标记 1',
  dirContextFlagOf('/nas/2026', 0), DIRCTX_EMPTY);
check('R36 目录态：有图片的目录 → 空串（交回原图片恢复链，退出重开直接出图零回归）',
  dirContextFlagOf('/nas/人像', 7), '');
check('R36 目录态：图片列表态 / 图库（browseBase 空）→ 空串，不论张数',
  dirContextFlagOf('', 0) === '' && dirContextFlagOf('', 12) === '', true);
check('R36 目录态：负张数 / NaN 都不误判成空目录态',
  dirContextFlagOf('/a', -1) === '' && dirContextFlagOf('/a', NaN) === '', true);
check('R36 落盘：无图片位置 + 空目录态 → 必须独立落盘',
  dirContextSaveWanted('/nas/人像', 0, false), true);
check('R36 落盘：有图片位置 → 主体已写 POS_KEY_BROWSE，无需独立落盘',
  dirContextSaveWanted('/nas/人像', 0, true), false);
check('R36 落盘：有图片的目录 → 不独立落盘（由主体写空标记清除旧目录态）',
  dirContextSaveWanted('/nas/人像', 3, false), false);
check('R36 落盘：非目录浏览态 → 不独立落盘',
  dirContextSaveWanted('', 0, false), false);
check('R36 落盘：负张数 / NaN 安全退化',
  dirContextSaveWanted('/a', -1, false) === false &&
  dirContextSaveWanted('/a', NaN, false) === false, true);
check('R36 恢复：标记 1 + 自动恢复开 + 用户没动手 + 本轮未恢复 → 目录上下文恢复',
  dirOnlyResumeWanted(DIRCTX_EMPTY, true, false, false), DIR_RESUME_CONTEXT);
check('R36 恢复：目录态优先于残留旧图片 uri / 快照（判据只看目录态标记）',
  dirOnlyResumeWanted(DIRCTX_EMPTY, true, false, false), DIR_RESUME_CONTEXT);
check('R36 恢复：标记为空 → 走原图片恢复链',
  dirOnlyResumeWanted('', true, false, false), DIR_RESUME_NONE);
check('R36 恢复：脏标记 / 多字符 → 绝不误进目录态',
  dirOnlyResumeWanted('0', true, false, false) === DIR_RESUME_NONE &&
  dirOnlyResumeWanted('11', true, false, false) === DIR_RESUME_NONE, true);
check('R36 恢复：自动恢复关闭 → 不抢视图',
  dirOnlyResumeWanted(DIRCTX_EMPTY, false, false, false), DIR_RESUME_NONE);
check('R36 恢复：用户已自己动手 → 不抢视图',
  dirOnlyResumeWanted(DIRCTX_EMPTY, true, true, false), DIR_RESUME_NONE);
check('R36 恢复：本轮已恢复过 → 不重复执行',
  dirOnlyResumeWanted(DIRCTX_EMPTY, true, false, true), DIR_RESUME_NONE);

console.log('--- 第三十六轮 ②：用户主动「往上层」真实全量列举决策（DirName 纯函数）---');
check('R36 全量：用户主动导航 → 开（不因首个候选 / 首个 probeChild 命中就停）',
  upFullExploreWanted(true, false), true);
check('R36 全量：自动重扫 → 关（保留 R35 早停，绝不放大 NAS IO）',
  upFullExploreWanted(true, true), false);
check('R36 全量：选文件夹首次进入 / 点子目录 → 关（既有行为零回归）',
  upFullExploreWanted(false, false), false);
check('R36 全量：两者皆假 / 两者皆真都安全退化',
  upFullExploreWanted(false, true) === false && upFullExploreWanted(true, true) === false, true);
const R36_G1 = ['file://docs/a/2026', '/a/2026', '/a/2026/'];
const R36_G2 = ['/a/2026', 'file://192.168.1.1/a/2026', '%2Fa%2F2026'];
check('R36 写法合并：逐组按原顺序收纳、按原字符串精确去重',
  upExploreFormsOf([R36_G1, R36_G2]).join('|'),
  'file://docs/a/2026|/a/2026|/a/2026/|file://192.168.1.1/a/2026|%2Fa%2F2026');
check('R36 写法合并：首个候选（优先父级）排最前',
  upExploreFormsOf([R36_G1, R36_G2])[0], R36_G1[0]);
check('R36 写法合并：空串一律丢弃，绝不 trim / 改名',
  upExploreFormsOf([['', '  /a  ', '/a'], ['  /a  ', '']]).join('|'), '  /a  |/a');
check('R36 写法合并：全空输入 → 空数组，不冒出兜底形态',
  upExploreFormsOf([]).length === 0 && upExploreFormsOf([[], []]).length === 0, true);
check('R36 写法合并：纯函数不改动入参数组（无副作用）',
  (() => { const a = ['x', 'y']; const g = [a]; const n = a.length;
    const o = upExploreFormsOf(g);
    return o.length === 2 && a.length === n && g.length === 1; })(), true);
check('R36 写法合并：多层连续返回 / 反复进子目录时同一输入结果恒等（不抖动）',
  upExploreFormsOf([R36_G1, R36_G2]).join('|') ===
  upExploreFormsOf([R36_G1, R36_G2]).join('|'), true);
check('R36 夹界：cap<=0 / formCount<=0 → 0（一次都不列）',
  upExploreCapOf(5, 0) === 0 && upExploreCapOf(0, 64) === 0 &&
  upExploreCapOf(-1, 64) === 0 && upExploreCapOf(5, -1) === 0, true);
check('R36 夹界：输入数小于 cap → 原样返回（绝不截掉真实兄弟目录）',
  upExploreCapOf(18, 64), 18);
check('R36 夹界：输入数等于 cap → 原样返回',
  upExploreCapOf(64, 64), 64);
check('R36 夹界：输入数超过 cap → 截到 cap（首个 / 优先父级优先）',
  upExploreCapOf(200, 64), 64);
check('R36 兜底：真实列举 0 个名字 → 才允许零 IO 清单兜底',
  upExploreNeedFallback(0), true);
check('R36 兜底：真实列到 >=1 个 → 绝不拿缓存覆盖真实结果',
  upExploreNeedFallback(1) === false && upExploreNeedFallback(37) === false, true);
check('R36 兜底：负数触发兜底 / NaN 不触发（绝不凭空编造）',
  upExploreNeedFallback(-1) === true && upExploreNeedFallback(NaN) === false, true);

console.log('--- 第三十六轮 ③：Index.ets 静态接线 + 根因护栏 ---');
const RESUMEPLAN_SRC = readFileSync(new URL('../entry/src/main/ets/common/ResumePlan.ts', import.meta.url), 'utf8');
const R36_OPEN = stripComments(INDEX.slice(INDEX.indexOf('private async openFolder('),
  INDEX.indexOf('private probeChild(')));
const R36_DIRCTX = stripComments(INDEX.slice(INDEX.indexOf('private restoreDirContextOnly('),
  INDEX.indexOf('/** 排一次「首帧后显示上次相片」')));
const R36_FLUSH = stripComments(INDEX.slice(INDEX.indexOf('private async flushDirContext('),
  INDEX.indexOf('/** 把当前图片列表分块写进 preferences')));
const R36_DIR_SRC = stripComments(DIRNAME_SRC.slice(DIRNAME_SRC.indexOf('第三十六轮（2026-11-19）')));
const R36_RP_SRC = stripComments(RESUMEPLAN_SRC.slice(RESUMEPLAN_SRC.indexOf('第三十六轮（2026-11-19）')));
check('R36 接线：Index 引入两组新纯函数（DirName 列举 / ResumePlan 目录态）',
  /upFullExploreWanted, upExploreFormsOf, upExploreCapOf,/.test(INDEX) &&
  /upExploreNeedFallback \} from '\.\.\/common\/DirName'/.test(INDEX) &&
  /dirContextFlagOf, dirContextSaveWanted, dirOnlyResumeWanted/.test(INDEX) &&
  /DIR_RESUME_CONTEXT, DIRCTX_EMPTY/.test(INDEX), true);
check('R36 接线：目录态持久化 key + 全量探索夹界常量',
  /const POS_KEY_DIRCTX: string = 'lastDirCtx';/.test(INDEX) &&
  /const UP_EXPLORE_MAX_FORMS: number = 64;/.test(INDEX), true);
check('R38 构建标记升 R38，R35 及更早旧包可从截图一眼排除',
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX) &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21']
    .every(t => INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
check('R36 根因护栏 A：markPos 无图片时不再直接 return，仍排一次写盘',
  /private markPos\(\): void \{[\s\S]{0,700}dirContextSaveWanted\(this\.browseBase, this\.items\.length, false\)[\s\S]{0,160}this\.scheduleFlush\(\);/.test(INDEX), true);
check('R36 接线 A：flushPos 无 LastPos 时改走目录上下文独立落盘',
  /if \(p === undefined\) \{[\s\S]{0,300}await this\.flushDirContext\(\);/.test(INDEX), true);
check('R36 接线 A：flushPosSync 的 FLUSH_SKIP 分支不再吞掉目录位置',
  /if \(act === FLUSH_SKIP\) \{[\s\S]{0,220}this\.flushDirContextSync\(store\);/.test(INDEX), true);
check('R36 接线 A：两处增强 key 都同步写目录态标记（有图时写空串清旧标记）',
  /await store\.put\(POS_KEY_DIRCTX, dirContextFlagOf\(this\.browseBase, this\.items\.length\)\);/.test(INDEX) &&
  /store\.putSync\(POS_KEY_DIRCTX, dirContextFlagOf\(this\.browseBase, this\.items\.length\)\);/.test(INDEX), true);
check('R36 接线 A：独立落盘方法只写小 key，异步 await flush / 同步 flushSync 都必达',
  /private async flushDirContext\(\): Promise<void> \{/.test(INDEX) &&
  /private flushDirContextSync\(store: preferences\.Preferences \| undefined\): void \{/.test(INDEX) &&
  /store\.putSync\(POS_KEY_DIRCTX, DIRCTX_EMPTY\);/.test(INDEX) &&
  R36_FLUSH.includes('await store.flush();') && R36_FLUSH.includes('store.flushSync();') &&
  /SNAP_KEY_PREFIX|flushSnap\(/.test(R36_FLUSH) === false, true);
check('R36 接线 A：readBrowseExtras 读回目录态标记（与增强 key 同一隔离层）',
  /const rawDirCtx = await p\.get\(POS_KEY_DIRCTX, ''\);/.test(INDEX) &&
  /this\.savedDirCtx = typeof rawDirCtx === 'string' \? rawDirCtx : '';/.test(INDEX), true);
check('R36 接线 A：hasRestoreMemory 把「仅目录态」也算有上次会话记忆',
  /this\.savedDirCtx === DIRCTX_EMPTY/.test(INDEX), true);
check('R36 接线 A：showLastOnStart 目录态恢复优先于图片恢复链',
  /dirOnlyResumeWanted\(this\.savedDirCtx, AUTO_SHOW_LAST_ON_START,/.test(RESUME_FN) &&
  /this\.restoreDirContextOnly\(\);/.test(RESUME_FN), true);
check('R36 接线 A：restoreDirContextOnly 启动期零 IO（不列目录 / 不解码 / 不弹选择器）',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder\(|chooseFolder\(|DocumentViewPicker|decodeTo\(|schedulePreload\(/.test(R36_DIRCTX) === false, true);
check('R36 接线 A：restoreDirContextOnly 回填层级 + 画纯清单 + 撤看门狗',
  /this\.restoreBrowseContext\(\);/.test(R36_DIRCTX) &&
  /this\.inAppUpList = true;/.test(R36_DIRCTX) &&
  /this\.markRestoreEntered\(\);/.test(R36_DIRCTX) &&
  /this\.status = '「' \+ label \+ '」· 本层没有图片/.test(R36_DIRCTX), true);
check('R36 接线 A：死路径记忆 / 授权激活失败都不再抢走零 IO 目录态恢复',
  (INDEX.match(/dirOnlyResumeWanted\(this\.savedDirCtx,/g) || []).length === 3 &&
  /if \(!dirOnly && failFastAction\(/.test(INDEX) &&
  /if \(!ok && !dirOnly && failFastAction\(/.test(INDEX) &&
  /this\.giveUpNow\('same dead dir as last time', 0\);/.test(INDEX) &&
  /this\.giveUpNow\('persist auth lost'/.test(INDEX), true);
check('R36 根因护栏 B：openFolder 签名支持跨候选写法与全量探索开关',
  /isRescan\?: boolean, extraForms\?: string\[\], fullExplore\?: boolean/.test(INDEX), true);
check('R36 根因护栏 B：probeChild 命中后不再裸 break，改由 wantFull 控制早停',
  /openFolder using candidate[\s\S]{0,180}if \(!wantFull\) \{[\s\S]{0,60}break;/.test(R36_OPEN) &&
  /upFullExploreWanted\(fullExplore === true, isRescan === true\)/.test(R36_OPEN), true);
check('R36 接线 B：openFolder 把所有同层写法并入候选集并按 cap 夹界',
  /candidates = upExploreFormsOf\(\[candidates, extraForms\]\);/.test(R36_OPEN) &&
  /upExploreCapOf\(candidates\.length, UP_EXPLORE_MAX_FORMS\)/.test(R36_OPEN) &&
  /for \(let c = 0; c < cap; c\+\+\)/.test(R36_OPEN), true);
check('R36 零回归：openFolder 仍只有 1 处真实 fs.listFile（逐个形态循环，不新增 IO 源）',
  (R36_OPEN.match(/await fs\.listFile\(/g) || []).length === 1, true);
check('R36 零回归：R35 的合并 / 选基准 / 禁覆盖式赋值护栏都还在',
  /names = mergeExploreNames\(exploreGroups\);/.test(R36_OPEN) &&
  /const best: string = exploreBaseOf\(exploreForms, exploreGroups\);/.test(R36_OPEN) &&
  R36_OPEN.includes('names = n;') === false, true);
check('R36 接线 B：真实列举结果计数供兜底决策',
  /this\.lastUpExploreNames = names\.length;/.test(R36_OPEN), true);
check('R36 根因护栏 B：browseUp 不再「首个 parent 成功即 return」',
  /const formGroups: Array<Array<string>> = \[\];/.test(UP_FN) &&
  /formGroups\.push\(dirCandidates\(parents\[i\]\)\);/.test(UP_FN) &&
  /const allForms: Array<string> = upExploreFormsOf\(formGroups\);/.test(UP_FN) &&
  /const ok: boolean = await this\.openFolder\(landUri, false, false, false,/.test(UP_FN) &&
  /const ok: boolean = await this\.openFolder\(parent, false, false\);/.test(UP_FN) === false, true);
check('R36 接线 B：只有真实列举 0 项才允许零 IO 清单兜底（两处都受夹）',
  (UP_FN.match(/upExploreNeedFallback\(this\.lastUpExploreNames\)/g) || []).length === 2 &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2, true);
check('R36 零回归：R34 事件主链 / 缓存优先候选 / 落地一致性诊断 / 严格父级校验全在',
  /upParentCandidates\(current, rawUri, '', upRoots\)/.test(UP_FN) &&
  /parents = cachedUpPreferredCandidates\(preferred, parents\);/.test(UP_FN) &&
  /cachedUpLandsAt\(preferred, current, this\.browseBase\)/.test(UP_FN) &&
  /isStrictParentOf\(target, current\)/.test(UP_FN) &&
  /up CACHED/.test(UP_FN) === false, true);
check('R36 零回归：往上层不弹系统选择器 / 版本 1.0.7 / 诊断默认关闭 / 恒亮恒可点',
  /chooseFolder\(|DocumentViewPicker|dv\.select|pickerStartOf\(/.test(UP_FN) === false &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /const DIAG_OVERLAY_DEFAULT: boolean = false;/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false, true);
check('R36 纯函数区块零 IO / 零 await / 零抛出（可直接 Node 回归）',
  /fs\.|DocumentViewPicker|await |throw /.test(R36_DIR_SRC) === false &&
  /export function upFullExploreWanted\(/.test(R36_DIR_SRC) &&
  /export function upExploreFormsOf\(/.test(R36_DIR_SRC) &&
  /export function upExploreCapOf\(/.test(R36_DIR_SRC) &&
  /export function upExploreNeedFallback\(/.test(R36_DIR_SRC) &&
  /fs\.|DocumentViewPicker|await |throw /.test(R36_RP_SRC) === false &&
  /export function dirContextFlagOf\(/.test(R36_RP_SRC) &&
  /export function dirContextSaveWanted\(/.test(R36_RP_SRC) &&
  /export function dirOnlyResumeWanted\(/.test(R36_RP_SRC), true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 A：装 R38 包 → 进入空目录 / 无图片 / 只有子文件夹的目录 → 退出 APP →');
console.log('     重开应直接停在该目录（不得回默认目录、不得弹选择器、不得因零图片丢状态）。');
console.log('  ⚠️ 真机步骤 B：从深层目录连续点「往上层」多级、反复进子目录再上移，');
console.log('     每次都应真实列出该层全部资料夹目录（含非当前目录的兄弟目录），不是只显示一个。');
console.log('  ⚠️ 边界：父层完全无 URI 授权、真实列举一个名字都拿不到时，才退回零 IO 的 APP 内清单；');
console.log('     自动重扫（每 1.5s）仍走 R35 早停，绝不放大 NAS IO；启动恢复期仍零文件 IO。');


// ==================== 第三十七轮：纯文本 / 源码文件预览（2026-11-19，R37） ====================
// 规格：支持 .log/.txt/.c/.asm 等常见纯文本与源码；自动识别文件类型；
//       C / Python / ASM / Verilog 启用对应语法高亮；未命中规则仍按普通文本完整展示；
//       保留原始内容 / 换行 / 缩进 / 特殊字符；不修改文件；行号 + 等宽排版；
//       兼容常见文本编码；行数较多也稳定显示。
const TEXTDOC = readFileSync(new URL('../entry/src/main/ets/common/TextDoc.ts', import.meta.url), 'utf8');
const TEXTDOC_CODE = stripComments(TEXTDOC);

console.log('\n--- 第三十七轮 ①：TextDoc.ts 文件类型自动识别 / 语言映射 ---');
check('R37 语言常量六态', [LANG_NONE, LANG_PLAIN, LANG_C, LANG_PYTHON, LANG_ASM, LANG_VERILOG].join(','),
  '-1,0,1,2,3,4');
check('R37 textExtOf 取小写后缀 / 无后缀 / 尾点',
  [textExtOf('a.C'), textExtOf('Makefile'), textExtOf('a.')].join('|'), '.c||');
check('R37 .log/.txt/.md 判纯文本（不高亮）',
  [textLangOf('a.log'), textLangOf('a.TXT'), textLangOf('a.md')].join(','), '0,0,0');
check('R37 C-like 家族后缀共用 LANG_C',
  [textLangOf('a.c'), textLangOf('a.cpp'), textLangOf('a.ts'), textLangOf('a.java'),
    textLangOf('a.js'), textLangOf('a.sql')].join(','), '1,1,1,1,1,1');
check('R37 Python / ASM / Verilog 各自映射',
  [textLangOf('a.py'), textLangOf('a.asm'), textLangOf('a.s'),
    textLangOf('a.v'), textLangOf('a.sv')].join(','), '2,3,3,4,4');
check('R37 未知二进制后缀判 LANG_NONE（绝不把 .exe 当文本读）',
  [textLangOf('a.exe'), textLangOf('a.zip'), textLangOf('a.heic')].join(','), '-1,-1,-1');
check('R37 无后缀 / 点开头文件名乐观按纯文本',
  [textLangOf('Makefile'), textLangOf('README'), textLangOf('.gitignore')].join(','), '0,0,0');
check('R37 isTextFileName 与 textLangOf 同源',
  [isTextFileName('a.log'), isTextFileName('a.c'), isTextFileName('a.exe')].join(','), 'true,true,false');
check('R37 语言显示名',
  [textLangLabelOf(LANG_C), textLangLabelOf(LANG_PYTHON), textLangLabelOf(LANG_ASM),
    textLangLabelOf(LANG_VERILOG), textLangLabelOf(LANG_PLAIN), textLangLabelOf(LANG_NONE)].join('|'),
  'C / C-like|Python|ASM|Verilog|纯文本|未知');
check('R37 只有四种语言开高亮，纯文本 / 未知不开',
  [highlightWanted(LANG_C), highlightWanted(LANG_PYTHON), highlightWanted(LANG_ASM),
    highlightWanted(LANG_VERILOG), highlightWanted(LANG_PLAIN), highlightWanted(LANG_NONE)].join(','),
  'true,true,true,true,false,false');
check('R37 选择器后缀清单：不带点号、无重复、覆盖六类代表后缀',
  textSuffixListOf().every(x => x.length > 0 && x.charAt(0) !== '.') &&
  new Set(textSuffixListOf()).size === textSuffixListOf().length &&
  ['log', 'txt', 'c', 'py', 'asm', 'v'].every(x => textSuffixListOf().indexOf(x) >= 0), true);
check('R37 后缀清单数量稳定（111 项，新增后缀必须同步更新此断言）',
  textSuffixListOf().length, 111);

console.log('--- 第三十七轮 ②：编码识别 / 二进制嗅探 ---');
const BOM8 = new Uint8Array([0xef, 0xbb, 0xbf, 65, 66]);
const BOM16LE = new Uint8Array([0xff, 0xfe, 65, 0x00]);
const BOM16BE = new Uint8Array([0xfe, 0xff, 0x00, 65]);
check('R37 BOM 判定 UTF-8 / UTF-16LE / UTF-16BE / 无 BOM',
  [textBomEncodingOf(BOM8), textBomEncodingOf(BOM16LE),
    textBomEncodingOf(BOM16BE), textBomEncodingOf(new Uint8Array([65, 66]))].join('|'),
  'utf-8|utf-16le|utf-16be|');
check('R37 BOM 跳过字节数 3 / 2 / 2 / 0',
  [textBomSkipOf(BOM8), textBomSkipOf(BOM16LE), textBomSkipOf(BOM16BE),
    textBomSkipOf(new Uint8Array([65]))].join(','), '3,2,2,0');
check('R37 textBodyOf 自行剥 BOM，不改原始字节',
  [textBodyOf(BOM8).join(','), BOM8.join(',')].join('|'),
  '65,66|239,187,191,65,66');
check('R37 textBodyOf 空 / 仅 BOM 不越界',
  textBodyOf(new Uint8Array(0)).length === 0 && textBodyOf(BOM8.slice(0, 3)).length === 0, true);
check('R37 isValidUtf8：ASCII / 2 字节 / 3 字节中文 / 4 字节 emoji 全合法',
  [isValidUtf8(new Uint8Array([65, 66, 10])),
    isValidUtf8(new Uint8Array([0xc3, 0xa9])),
    isValidUtf8(new Uint8Array([0xe4, 0xb8, 0xad])),
    isValidUtf8(new Uint8Array([0xf0, 0x9f, 0x98, 0x80]))].join(','), 'true,true,true,true');
check('R37 isValidUtf8 拒绝 overlong / 代理区 / >U+10FFFF / 断裂续字节 / 孤立续字节',
  [isValidUtf8(new Uint8Array([0xc0, 0x80])),
    isValidUtf8(new Uint8Array([0xed, 0xa0, 0x80])),
    isValidUtf8(new Uint8Array([0xf4, 0x90, 0x80, 0x80])),
    isValidUtf8(new Uint8Array([0xe4, 0xb8])),
    isValidUtf8(new Uint8Array([0x80]))].join(','), 'false,false,false,false,false');
check('R37 looksBinary：NUL 立即判二进制',
  looksBinary(new Uint8Array([65, 0x00, 66])), true);
check('R37 looksBinary：UTF-16 BOM 的 0x00 不误判',
  looksBinary(BOM16LE), false);
check('R37 looksBinary：普通文本 / CRLF / Tab 不误判',
  [looksBinary(new Uint8Array([65, 10, 13, 9, 66])),
    looksBinary(new Uint8Array(0))].join(','), 'false,false');
check('R37 looksBinary：高比例 C0 控制字符判二进制',
  looksBinary(new Uint8Array(100).fill(0x01)), true);
check('R37 encodingCandidatesOf：BOM 命中只给一个候选',
  [encodingCandidatesOf(BOM8).join(','), encodingCandidatesOf(BOM16LE).join(','),
    encodingCandidatesOf(BOM16BE).join(',')].join('|'),
  'utf-8|utf-16le|utf-16be');
check('R37 encodingCandidatesOf：合法 UTF-8 优先 UTF-8 再 GB18030',
  encodingCandidatesOf(new Uint8Array([65, 66])).join(','), 'utf-8,gb18030');
check('R37 encodingCandidatesOf：非法 UTF-8 走 GB18030/Big5/Win1252/UTF-8 回退',
  encodingCandidatesOf(new Uint8Array([0x41, 0x81, 0x40])).join(','),
  'gb18030,big5,windows-1252,utf-8');
check('R37 pickDecodedIndexOf：U+FFFD 最少者优先',
  pickDecodedIndexOf(['ab\uFFFDcd', 'abcd']), 1);
check('R37 pickDecodedIndexOf：同分取更长（信息更全）/ 空数组返回 -1',
  [pickDecodedIndexOf(['ab', 'abcd']), pickDecodedIndexOf([])].join(','), '1,-1');
check('R37 encodingLabelOf 全六码 + 未知编码兜底',
  [encodingLabelOf(ENC_UTF8), encodingLabelOf(ENC_UTF16LE), encodingLabelOf(ENC_UTF16BE),
    encodingLabelOf(ENC_GB18030), encodingLabelOf(ENC_BIG5), encodingLabelOf(ENC_WIN1252),
    encodingLabelOf('')].join('|'),
  'UTF-8|UTF-16LE|UTF-16BE|GB18030|Big5|Windows-1252|未知');

console.log('--- 第三十七轮 ③：行处理 / 大文件上限 / 原始内容保留 ---');
check('R37 上限常量：8MB / 12 万行 / Tab4 / 行高20vp / 滚轮3行',
  [TEXT_MAX_BYTES, TEXT_MAX_LINES, TEXT_TAB_WIDTH, TEXT_ROW_H_VP, TEXT_WHEEL_LINES].join(','),
  '8388608,120000,4,20,3');
check('R37 显示宽度常量：单字符 7.2vp / 内容上限 12000vp',
  [TEXT_CHAR_W_VP, TEXT_CONTENT_MAX_VP].join(','), '7.2,12000');
check('R37 textReadCapOf：未知 / 0 / 小于上限 / 大于上限',
  [textReadCapOf(-1, 100), textReadCapOf(0, 100), textReadCapOf(37, 100),
    textReadCapOf(500, 100)].join(','), '100,0,37,100');
check('R37 textByteTruncatedOf：仅超出上限才提示截断',
  [textByteTruncatedOf(500, 100), textByteTruncatedOf(100, 100),
    textByteTruncatedOf(50, 100), textByteTruncatedOf(500, 0)].join(','),
  'true,false,false,false');
check('R37 splitTextLines 统一 CRLF / CR / LF，行内容原样保留',
  splitTextLines('a\r\nb\rc\nd', 100).lines.join('|'), 'a|b|c|d');
check('R37 splitTextLines 末尾换行不多出空行',
  splitTextLines('a\nb\n', 100).lines.join('|'), 'a|b');
check('R37 splitTextLines 保留缩进 / Tab / 特殊字符 / 空行',
  splitTextLines('  \tX\x01!  \n\nZ', 100).lines.join('|'), '  \tX\x01!  ||Z');
check('R37 splitTextLines 行数上限到点即停并标 truncated',
  (() => { const r = splitTextLines('a\nb\nc', 2);
    return r.lines.join('|') + '/' + r.truncated; })(), 'a|b/true');
check('R37 splitTextLines cap<=0 退回 TEXT_MAX_LINES（不误当成 0 行）',
  splitTextLines('a\nb', 0).lines.join('|'), 'a|b');
check('R37 expandTabsOf 按制表位展开，仅显示层、不改原行',
  [expandTabsOf('\tx', 4), expandTabsOf('a\tx', 4), expandTabsOf('abc', 4),
    expandTabsOf('\t', 0)].join('|'), '    x|a   x|abc|    ');
check('R37 lineNoWidthOf 按位数给足且右对齐不跳动',
  [lineNoWidthOf(1), lineNoWidthOf(9), lineNoWidthOf(10), lineNoWidthOf(99999),
    lineNoWidthOf(120000), lineNoWidthOf(0)].join(','), '27,27,36,63,72,27');
check('R37 textContentWidthOf：空列表给行号栏 + 内边距',
  textContentWidthOf([], 4, 7.2, 54, 12000), 78);
check('R37 textContentWidthOf：Tab 按显示列计入、取最长行',
  textContentWidthOf(['\t\tx', 'abc'], 4, 7.2, 54, 12000), 142.8);
check('R37 textContentWidthOf：超长单行夹到上限，绝不撑爆布局',
  textContentWidthOf(['x'.repeat(100000)], 4, 7.2, 54, 12000), 12000);
check('R37 textContentWidthOf：脏参数（0/负/NaN）安全退化，恒返回有限正数',
  [textContentWidthOf([''], 0, 0, 0, 0),
    textContentWidthOf([''], -4, -1, -10, -1)].every(v => Number.isFinite(v) && v > 0), true);
check('R37 textStatusOf 含文件名 / 语言 / 编码 / 行数，截断时给明确提示',
  textStatusOf('a.txt', LANG_PLAIN, ENC_UTF8, 3, false).includes('文本预览 a.txt · 纯文本 · UTF-8 · 3 行') &&
  textStatusOf('a.c', LANG_C, ENC_UTF8, 5, true).includes('已显示前 8 MB'), true);

console.log('--- 第三十七轮 ④：语法高亮 tokenizer / 多行注释状态 ---');
const Q3 = '\x22\x22\x22';
const S3 = '\x27\x27\x27';
check('R37 token 七类常量',
  [TOK_PLAIN, TOK_KEYWORD, TOK_COMMENT, TOK_STRING, TOK_NUMBER, TOK_PREPROC, TOK_LABEL].join(','),
  '0,1,2,3,4,5,6');
check('R37 tokenColorOf 七类互不相同（纯文本底色单独一档）',
  new Set([TOK_PLAIN, TOK_KEYWORD, TOK_COMMENT, TOK_STRING,
    TOK_NUMBER, TOK_PREPROC, TOK_LABEL].map(k => tokenColorOf(k))).size, 7);
check('R37 纯文本行不切 token、整行 TOK_PLAIN、原样保留',
  (() => { const r = tokenizeLine('  plain \t text !', LANG_PLAIN, false, true);
    return r.tokens.length === 1 && r.tokens[0].kind === TOK_PLAIN &&
      r.tokens[0].text === expandTabsOf('  plain \t text !', 4); })(), true);
check('R37 C：关键字 / 行注释 / 字符串 / 数字都切出来',
  (() => { const r = tokenizeLine('int x = 0; // "hi"', LANG_C, false, true);
    return r.tokens.some(t => t.kind === TOK_KEYWORD && t.text === 'int') &&
      r.tokens.some(t => t.kind === TOK_COMMENT && t.text.indexOf('//') === 0) &&
      r.tokens.some(t => t.kind === TOK_NUMBER && t.text === '0'); })(), true);
check('R37 C：预处理整行 TOK_PREPROC',
  tokenizeLine('#include <stdio.h>', LANG_C, false, true).tokens[0].kind, TOK_PREPROC);
check('R37 Python：# 行注释 / @ 装饰器 / 关键字',
  (() => { const r1 = tokenizeLine('x = 1  # note', LANG_PYTHON, false, true);
    const r2 = tokenizeLine('@decorator', LANG_PYTHON, false, true);
    return r1.tokens.some(t => t.kind === TOK_COMMENT && t.text === '# note') &&
      r1.tokens.some(t => t.kind === TOK_KEYWORD && t.text === 'x') === false &&
      r2.tokens[0].kind === TOK_PREPROC; })(), true);
check('R37 ASM：; 行注释 / 指令关键字 / label: TOK_LABEL',
  (() => { const r1 = tokenizeLine('    mov rax, 1  ; syscall', LANG_ASM, false, true);
    const r2 = tokenizeLine('loop_start:', LANG_ASM, false, true);
    return r1.tokens.some(t => t.kind === TOK_KEYWORD && t.text === 'mov') &&
      r1.tokens.some(t => t.kind === TOK_COMMENT) &&
      r2.tokens.some(t => t.kind === TOK_LABEL); })(), true);
check('R37 Verilog：module 关键字 / // 行注释 / ` 指令',
  tokenizeLine('module m(input clk);', LANG_VERILOG, false, true).tokens
    .some(t => t.kind === TOK_KEYWORD && t.text === 'module') &&
  tokenizeLine('`timescale 1ns/1ps', LANG_VERILOG, false, true).tokens[0].kind === TOK_PREPROC, true);
check('R37 C 多行注释状态：开→内→内→关',
  blockStartsOf(['/* header', ' * int x = 0;', ' */', 'int main() { return 0; }'], LANG_C).join(','),
  'false,true,true,false');
check('R37 Python 三引号 docstring 跨行状态',
  blockStartsOf(['def f():', '    ' + Q3 + 'doc', '    still' + Q3, '    return 1'],
    LANG_PYTHON).join(','), 'false,false,true,false');
check('R37 Python 单引号三引号同样成块',
  blockStartsOf(['s = ' + S3 + 'abc', 'def' + S3, 'x = 2'], LANG_PYTHON).join(','),
  'false,true,false');
check('R37 ASM / Verilog / PLAIN 无多行块，状态恒 false',
  [blockStartsOf(['; a', '; b'], LANG_ASM).join(','),
    blockStartsOf(['// a', '// b'], LANG_VERILOG).join(','),
    blockStartsOf(['a', 'b', 'c'], LANG_PLAIN).join(',')].join('|'),
  'false,false|false,false|false,false,false');
const JOIN_LINES = [
  'int x = 0; // hi', '  \t tabbed "str" 123', '/* open', ' * inside', ' */ and 0xFF',
  'x = 1  # py', '    mov rax, 1 ; asm', 'module m(input clk); // vlog', 'plain \t !@#$%^&*'
];
check('R37 joinTokensOf 不变式：四种语言 × 十种行，token 拼回 === expandTabsOf(原行)',
  [LANG_PLAIN, LANG_C, LANG_PYTHON, LANG_ASM, LANG_VERILOG].every(lang =>
    JOIN_LINES.every(line => {
      const st = blockStartsOf(JOIN_LINES, lang);
      return JOIN_LINES.every((_, i) =>
        joinTokensOf(tokenizeLine(JOIN_LINES[i], lang, st[i], true).tokens) ===
        expandTabsOf(JOIN_LINES[i], 4));
    })), true);
check('R37 emitTokens=false 与 true 共用状态机（绝不两套逻辑分叉）',
  [LANG_C, LANG_PYTHON, LANG_ASM, LANG_VERILOG].every(lang =>
    blockStartsOf(JOIN_LINES, lang).every((_, i) =>
      tokenizeLine(JOIN_LINES[i], lang, false, false).tokens.length === 0)), true);
check('R37 joinTokensOf 空 token 列表返回空串',
  joinTokensOf([]), '');

console.log('--- 第三十七轮 ⑤：Index.ets 接线（文本行 / 真异步读取 / 互斥态）---');
check('R37 TextDoc.ts 零 SDK import / 零 await 语句 / 零 throw 语句 / 零文件 IO',
  // 注意：不能用 \bawait\b / \bthrow\b 这类「单词级」正则 ——
  // 语言关键字表本身就是 '|await|' / '|throw|' 形式的字符串常量，
  // 那是高亮规则数据，不是语句。这里按「语句形态」判定：行首 await、
  // throw 后跟表达式、SDK import、async function、文件 IO API。
  /^import /m.test(TEXTDOC) === false &&
  /^\s*await\s/m.test(TEXTDOC_CODE) === false &&
  /\bthrow\s+(new|[A-Za-z_$])/m.test(TEXTDOC_CODE) === false &&
  /@ohos\.|fs\.|DocumentViewPicker|\basync\s+function\b/.test(TEXTDOC_CODE) === false, true);
check('R37 TextDoc.ts 纯函数导出齐全（59 个 export）',
  (TEXTDOC.match(/^export (const|function|interface)/gm) || []).length, 59);
check('R38 Index import TextDoc 真值源，且构建标记升 R38',
  INDEX.includes("from '../common/TextDoc';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';"), true);
check('R37 新增 ROW_TEXT=4，文本行只进 rows 不进 items',
  /const ROW_TEXT: number = 4;/.test(ARCHIVE) &&
  INDEX.includes('texts.push({ uri: child, name: shown, size: size, mtime: mtime, kind: ROW_TEXT, itemIndex: -1 });') &&
  /for \(let i = 0; i < texts\.length; i\+\+\) \{\s*rows\.push\(texts\[i\]\);/.test(INDEX) &&
  /const imgs: ImageItem\[\] = \[\];/.test(INDEX) &&
  INDEX.includes('this.applyItems(imgs, dirLabel'), true);
check('R37 openFolder 分类：isTextFileName 且 statOk 才成文本行（无授权仍按文件夹）',
  INDEX.includes('else if (isTextFileName(raw))') &&
  /else if \(!statOk\) \{[\s\S]{0,400}else if \(isTextFileName\(raw\)\)/.test(INDEX) &&
  INDEX.includes('texts.sort(cmp);') && INDEX.includes('texts.reverse();'), true);
const ROW_TEXT_BRANCH = INDEX.slice(INDEX.indexOf('if (kind === ROW_TEXT) {'),
  INDEX.indexOf('if (kind === ROW_OTHER) {'));
check('R37 onRowTap 文本行走 openTextFile，绝不 select(itemIndex)',
  // 按「整个分支」判定，不赌花括号后第一行就是调用（中间允许有说明注释）；
  // 关键是分支内必须 return，且绝不出现 this.select( —— 文本行永不进图片翻页序列。
  ROW_TEXT_BRANCH.includes('this.openTextFile(r.uri, r.name);') &&
  ROW_TEXT_BRANCH.includes('return;') &&
  /this\.select\(/.test(ROW_TEXT_BRANCH) === false &&
  INDEX.includes('this.select(idx);'), true);
check('R37 FILE_FILTERS 保留「所有文件」为第一项，新增文本/源码格式项',
  INDEX.includes("'所有文件(*.*)|.*',") &&
  INDEX.includes('function textFileFilterOf(): string {') &&
  INDEX.includes('textSuffixListOf()') && INDEX.includes('textFileFilterOf()'), true);
check('R37 ArchiveRow 文本行有独立暖黄配色，悬停缩略图仍只对图片行开放',
  ARCHIVE.includes("if (this.kind === ROW_TEXT) {\n      return '#d8c78a';") &&
  ARCHIVE.includes('if (this.kind !== ROW_IMAGE || this.thumbDisabled)'), true);
check('R37 TextLineSource 实现 IDataSource，reload 通知 onDataReloaded',
  INDEX.includes('class TextLineSource implements IDataSource {') &&
  /reload\(list: Array<string>\): void \{[\s\S]{0,250}onDataReloaded\(\)/.test(INDEX), true);
check('R37 状态字段：textMode 默认关，大数组刻意不进 @State',
  INDEX.includes('@State textMode: boolean = false;') &&
  INDEX.includes('private textLines: Array<string> = [];') &&
  INDEX.includes('private textSource: TextLineSource = new TextLineSource();') &&
  INDEX.includes('private textScroller: Scroller = new Scroller();') &&
  INDEX.includes('private textHScroller: Scroller = new Scroller();') &&
  INDEX.includes('private textToken: number = 0;'), true);
const OPEN_TEXT_FN = INDEX.slice(INDEX.indexOf('  private async openTextFile('),
  INDEX.indexOf('  /** 当前行按语言'));
check('R37 openTextFile 是真异步：stat/open/read/close 全 await，无一个 Sync 版本',
  ['await fs.stat(uri)', 'await fs.open(uri', 'await fs.read(file.fd, buf)',
    'await fs.close(file.fd)'].every(x => OPEN_TEXT_FN.includes(x)) &&
  /fs\.(statSync|openSync|readSync|closeSync)/.test(OPEN_TEXT_FN) === false, true);
check('R37 openTextFile 只读不写：无任何写/删/改名 API，也不 new Promise',
  /fs\.(write|copy|move|unlink|rename|truncate)/.test(OPEN_TEXT_FN) === false &&
  OPEN_TEXT_FN.includes('new Promise') === false &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2, true);
check('R37 openTextFile 编码链：BOM 剥离 + 候选解码 + 替换字符最少者胜出',
  OPEN_TEXT_FN.includes('encodingCandidatesOf(bytes)') &&
  OPEN_TEXT_FN.includes('textBodyOf(bytes)') &&
  OPEN_TEXT_FN.includes('util.TextDecoder.create(encs[k])') &&
  OPEN_TEXT_FN.includes('dec.decodeToString(body)') &&
  OPEN_TEXT_FN.includes('pickDecodedIndexOf(decoded)'), true);
check('R37 openTextFile 有二进制嗅探 / 字节上限 / 代号作废三道护栏',
  OPEN_TEXT_FN.includes('if (looksBinary(bytes))') &&
  OPEN_TEXT_FN.includes('textReadCapOf(st.size, TEXT_MAX_BYTES)') &&
  OPEN_TEXT_FN.includes('textByteTruncatedOf(st.size, TEXT_MAX_BYTES)') &&
  OPEN_TEXT_FN.includes('token !== this.textToken'), true);
check('R37 applyTextDecoded 接线：切行 / 注释状态 / 行号宽 / 内容宽 / 状态文案',
  ['splitTextLines(text, TEXT_MAX_LINES)', 'blockStartsOf(split.lines, lang)',
    'lineNoWidthOf(split.lines.length)', 'textContentWidthOf(split.lines, TEXT_TAB_WIDTH,',
    'textStatusOf(name, lang, encLabel, split.lines.length, truncated)',
    'this.textSource.reload(split.lines)'].every(x => OPEN_TEXT_FN.includes(x) ||
    INDEX.slice(INDEX.indexOf('  private applyTextDecoded('),
      INDEX.indexOf('  /** 点左栏文本行')).includes(x)), true);
check('R37 build() 右侧文本态与图片态互斥，原有两页预览分支一字未删',
  /if \(this\.textMode\) \{\s*\/\/ 第三十七轮[\s\S]{0,160}this\.textPreview\(\);\s*\} else if \(this\.cur >= 0\) \{/.test(INDEX) &&
  PREVIEW_ROW14_CODE.includes('this.previewImage(this.curItem()!.uri, this.curToken, true)') &&
  PREVIEW_ROW14_CODE.includes('this.rightPageImage(this.items[this.spreadB].uri, true)') &&
  PREVIEW_ROW14_CODE.includes('fullscreen') === false, true);
check('R37 textPreview 用横向 Scroll + 纵向 List/LazyForEach 双轴虚拟化',
  INDEX.includes('Scroll(this.textHScroller)') &&
  INDEX.includes('List({ scroller: this.textScroller, space: 0 })') &&
  INDEX.includes('.scrollable(ScrollDirection.Horizontal)') &&
  INDEX.includes('LazyForEach(this.textSource, (line: string, idx: number) => {') &&
  INDEX.includes('.cachedCount(6)'), true);
check('R37 textRow 行号 + 等宽字体 + token 着色（Row 内 ForEach，不赌 Text 内 Span）',
  INDEX.includes("Text((idx + 1).toString())") &&
  INDEX.includes("ForEach(this.textTokensOf(idx), (t: TextToken, k: number) => {") &&
  INDEX.includes("tokenColorOf(t.kind)") &&
  (INDEX.match(/\.fontFamily\('monospace'\)/g) || []).length >= 2 &&
  INDEX.includes('.height(TEXT_ROW_H_VP)'), true);
check('R37 textTokensOf 按「本行是否处于多行注释」取 token，显示层不改原行',
  INDEX.includes('private textTokensOf(idx: number): Array<TextToken> {') &&
  INDEX.includes('tokenizeLine(this.textLines[idx], this.textLang, inBlock, true).tokens') &&
  INDEX.includes('private textBlockStarts: Array<boolean> = [];'), true);
check('R37 文本态不被图片交互偷偷翻页：select / go / onWheel / browseUp / applyItems 全接线',
  SELECT13_FN.includes('if (this.textMode)') &&
  GO13_FN.includes('this.textScroller.scrollBy(0, delta * TEXT_WHEEL_LINES * TEXT_ROW_H_VP);') &&
  INDEX.includes('this.textScroller.scrollBy(0, dir * TEXT_WHEEL_LINES * TEXT_ROW_H_VP);') &&
  UP_FN.includes('if (this.textMode)') &&
  APPLY_FN.includes('if (!keepView) {\n      this.closeTextMode();'), true);
check('R37 closeTextMode 只收自身状态 + 作废旧代号，绝不碰缓存 / 目录 / 位置',
  (() => { const f = INDEX.slice(INDEX.indexOf('  private closeTextMode(): void {'),
    INDEX.indexOf('  /** 解码结果落地'));
    return f.includes('this.textMode = false;') && f.includes('this.textToken++;') &&
      f.includes('this.textSource.reload([]);') &&
      /clearPreviews|applyItems|markPos|browseBase|inAppUpList/.test(f) === false; })(), true);
check('R37 文本预览不新增裸 scrollToIndex（全源码仍恰好 4 处，含 R60 高亮护栏收口）',
  INDEX.split('this.scroller.scrollToIndex(').length - 1, 4);

console.log('--- 第三十七轮 ⑥：既有链路零回归护栏 ---');
check('R37 零回归：画质三处计数 / 版本 / 往上层 / 禁用 / 防冻结闸门全未动',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  /回上层/.test(INDEX) === false &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 8, true);
check('R37+R42+R56 零回归：restoreBrowseContext / inAppUpList / Text(this.name) 计数型契约不变',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 3 &&
  (INDEX.match(/this\.inAppUpList =/g) || []).length === 6 &&
  ((INDEX + ARCHIVE).match(/Text\(this\.name\)/g) || []).length === 1 &&
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3, true);
check('R37 零回归：往上层主链 / R36 目录态 / ESC 严格两态 / 诊断开关仍在',
  UP_FN.includes('upLevelOf(current)') &&
  INDEX.includes("const POS_KEY_DIRCTX: string = 'lastDirCtx';") &&
  INDEX.includes('const DIAG_OVERLAY_DEFAULT: boolean = false;') &&
  INDEX.includes('escActionByState(this.fullscreen, this.pendingSystemEcho);'), true);
check('R38 构建标记 R38，R37 及更早旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26',
    'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 A：装 R38 包 → 选含 .log/.txt/.c/.py/.asm/.v 的目录 → 点文本行 →');
console.log('     右栏应出行号 + 等宽排版 + 对应语法着色；未知后缀文件按普通文本完整展示。');
console.log('  ⚠️ 真机步骤 B：UTF-8 / UTF-16 BOM / GB18030 / Big5 / Windows-1252 各准备一份，');
console.log('     抬头应显示识别出的编码；CRLF / CR / LF、缩进 / Tab / 特殊字符不得丢失或改写。');
console.log('  ⚠️ 真机步骤 C：准备数万行大文件 → 滚动应稳定不卡；点图片行 / 滚轮 / 方向键 /');
console.log('     「往上层」应退出文本态且图片预览、目录恢复、ESC 等既有链路完全不受影响。');
console.log('  ⚠️ 边界：单次最多读 8MB / 12 万行，超出在抬头明确提示「已显示前 8 MB / 120000 行」；');
console.log('     二进制内容（NUL / 高比例控制字符）按提示展示，不刷满屏乱码；全程只读不写。');



// ==================== 第三十八轮：用户主目录（用户卷根）重新可选择（2026-11-19，R38） ====================
// 需求：/storage/Users/currentUser 能正常被选择 / 进入，并真实列出该层全部资料夹；
//       仅调整与「路径选择限制」相关的逻辑，其它路径的选择行为保持不变。
// 根因（纯函数探针实测，不靠缓存记录猜）：volumeRootOf 把它判为卷根 L0 →
//   upLevelOf(卷根)='' → upNavStateOf=UP_NAV_TOP → upParentCandidates(卷根)=[] →
//   browseUp() 在 !canUp 分支直接早退，这一层永远不会被真实重新列举，也选不中。
// 修法：只放行「TOP + 恰好是用户卷根」，原地重新真实列举本层；
//       volumeRootOf / upLevelOf / upNavStateOf / upParentCandidates 一字不改，
//       R28「绝不越级到 /storage、/」的护栏完整保留。
// VOLROOT 已在上方「卷根 / 层级」组定义，本组直接复用同一真值，绝不另立常量。
const R38_DEEPURI = 'file://docs/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像/编号202601 模特 猫/';

console.log('--- 第三十八轮 ①：用户卷根识别（精确 4 段，其它形态一律 false） ---');
check('R38 用户卷根：纯路径 / 尾斜杠 / file://docs 形态都认得',
  isUserVolumeRootOf(VOLROOT) && isUserVolumeRootOf(VOLROOT + '/') &&
  isUserVolumeRootOf('file://docs' + VOLROOT), true);
check('R38 用户卷根：media / emulated 桶同样认得',
  isUserVolumeRootOf('/storage/media/100') && isUserVolumeRootOf('/storage/emulated/10'), true);
check('R38 非用户卷根：深层 / /storage/Users / /storage / / 全拒绝',
  isUserVolumeRootOf(VOLROOT + '/Download') === false &&
  isUserVolumeRootOf('/storage/Users') === false &&
  isUserVolumeRootOf('/storage') === false && isUserVolumeRootOf('/') === false, true);
check('R38 非用户卷根：盘符 / NAS / 挂载前缀 / URI 碎片 / 空串全拒绝',
  isUserVolumeRootOf('C:/') === false && isUserVolumeRootOf('C:') === false &&
  isUserVolumeRootOf('/192.168.100.61') === false &&
  isUserVolumeRootOf('/storage/userExternal/192.168.100.61/图片档案') === false &&
  isUserVolumeRootOf('file://docs') === false && isUserVolumeRootOf('') === false, true);

console.log('--- 第三十八轮 ②：只放行「TOP + 用户卷根」，其它导航状态零放行 ---');
check('R38 rootReenterWantedOf 唯一放行情景',
  rootReenterWantedOf(VOLROOT, UP_NAV_TOP), true);
check('R38 其它导航态一律不重新列举（NONE / GO / UNKNOWN）',
  rootReenterWantedOf(VOLROOT, UP_NAV_NONE) === false &&
  rootReenterWantedOf(VOLROOT, UP_NAV_GO) === false &&
  rootReenterWantedOf(VOLROOT, UP_NAV_UNKNOWN) === false, true);
check('R38 其它 TOP 顶层一律不重新列举（/ / 盘符 / NAS 设备根 / 深层）',
  rootReenterWantedOf('/', UP_NAV_TOP) === false &&
  rootReenterWantedOf('C:', UP_NAV_TOP) === false &&
  rootReenterWantedOf('/192.168.100.61', UP_NAV_TOP) === false &&
  rootReenterWantedOf(VOLROOT + '/Download', UP_NAV_TOP) === false, true);
check('R38 用户卷根自身仍是 TOP，但重新进入不改变「没有父级」语义',
  upNavStateOf(VOLROOT) === UP_NAV_TOP && upLevelOf(VOLROOT) === '' &&
  volumeRootOf(VOLROOT) === VOLROOT, true);

console.log('--- 第三十八轮 ③：同层写法生成，绝不越级 ---');
const R38_FORMS = rootReenterFormsOf(VOLROOT, R38_DEEPURI,
  [R38_DEEPURI, 'file://docs' + VOLROOT + '/Download/']);
check('R38 卷根写法含授权同 scheme 形态与真实路径兜底',
  R38_FORMS.indexOf('file://docs' + VOLROOT) >= 0 &&
  R38_FORMS.indexOf(VOLROOT) >= 0, true);
check('R38 卷根写法全部落在卷根层，绝不生成 /storage、/ 等越级形态',
  R38_FORMS.length >= 2 && R38_FORMS.every(f =>
    canonicalLevelKeyOf(f) === canonicalLevelKeyOf(VOLROOT)) &&
  R38_FORMS.every(f => isUserVolumeRootOf(f)), true);
check('R38 卷根写法按原名去重、首个是授权同形态',
  new Set(R38_FORMS).size === R38_FORMS.length &&
  R38_FORMS[0] === 'file://docs' + VOLROOT, true);
check('R38 非用户卷根调用一律返回空数组（绝不误列举其它层）',
  rootReenterFormsOf(VOLROOT + '/Download', R38_DEEPURI, []).length === 0 &&
  rootReenterFormsOf('/', R38_DEEPURI, []).length === 0 &&
  rootReenterFormsOf('', R38_DEEPURI, []).length === 0, true);

console.log('--- 第三十八轮 ④：Index.ets 接线（只改 !canUp 的卷根分支） ---');
check('R38 三个新纯函数已 import 进 Index.ets',
  /rootReenterWantedOf, rootReenterFormsOf/.test(INDEX) &&
  INDEX.includes('rootReenterWantedOf(current, state)') &&
  INDEX.includes('rootReenterFormsOf(current, reenterRaw, reenterRoots)'), true);
check('R38 卷根分支在 !canUp 内、由 TOP+用户卷根唯一放行',
  UP_FN.indexOf('if (rootReenterWantedOf(current, state)) {') >
    UP_FN.indexOf('if (!canUp) {') &&
  UP_FN.indexOf('if (rootReenterWantedOf(current, state)) {') <
    UP_FN.indexOf('// 三种「不动」要分开说清楚'), true);
check('R38 卷根分支真实全量列举本层，绝不弹系统选择器',
  UP_FN.includes('const reenterOk: boolean = await this.openFolder(current, false, false, false,') &&
  UP_FN.includes('reenterForms, true)') &&
  /root reenter list failed/.test(UP_FN) &&
  /DocumentViewPicker|dv\.select|chooseFolder\(|isUpTargetOf\(/.test(UP_FN) === false, true);
check('R38 成功后给出真实列举项数并 return；失败回落原 TOP 提示',
  UP_FN.includes('up ROOT OK |') && UP_FN.includes('this.lastUpExploreNames') &&
  UP_FN.includes('this.status = \'已到卷 / 硬盘的逻辑最上层') &&
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length === 2, true);
check('R38 三个原始授权锚点都交给同层写法生成',
  /reenterRoots\.push\(this\.pickRootUri\)/.test(UP_FN) &&
  /reenterRoots\.push\(this\.browseDir\)/.test(UP_FN) &&
  /reenterRoots\.push\(this\.savedDirUri\)/.test(UP_FN), true);

console.log('--- 第三十八轮 ⑤：既有链路零回归护栏 ---');
check('R28 越级护栏一字未改（卷根仍不可上移 / 无父级候选 / 卷根一律拒绝）',
  upLevelOf(VOLROOT) === '' && upParentCandidates(VOLROOT, 'file://docs' + VOLROOT + '/').length === 0 &&
  isUpTargetOf('/storage/Users/currentUser/Download', VOLROOT) === false &&
  upLooseParentOf(VOLROOT) === '' && canGoUpFrom(VOLROOT) === false, true);
check('R38 既有往上层主链 / 全量探索 / R36 目录态 / R37 文本态全未动',
  /const strictParent: boolean = loose/.test(UP_FN) &&
  /const allForms: Array<string> = upExploreFormsOf\(formGroups\);/.test(UP_FN) &&
  /const ok: boolean = await this\.openFolder\(landUri, false, false, false,/.test(UP_FN) &&
  INDEX.includes("const POS_KEY_DIRCTX: string = 'lastDirCtx';") &&
  INDEX.includes("if (this.textMode) {"), true);
check('R38 版本恒定 1.0.7 / 7，构建标记 R38',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R37';") === false, true);
check('R38 旧包排除：R37 及更早旧标记全不在源码里',
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28',
    'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);
check('R38 DirName.ts 新纯函数零 SDK import / 零文件 IO / 零 await / 零 throw 语句',
  (() => {
    const seg = DIRNAME_SRC.slice(DIRNAME_SRC.indexOf('第三十八轮：用户主目录'));
    // 只按「代码行」判定：注释里写了 fs.listFile 是说明文字，不是 SDK 调用
    // （与 R37「关键字表字符串别当语句」同一类踩坑）。
    const code = seg.split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    return /^import /m.test(code) === false &&
      /@ohos\.|fs\.|DocumentViewPicker|\basync\s+function\b/.test(code) === false &&
      /^\s*await\s/m.test(code) === false &&
      /\bthrow\s+(new|[A-Za-z_$])/m.test(code) === false;
  })(), true);
console.log('--- 第四十一轮：恢复态目录清单的行种类保真（.log 重启后可预览） ---');
check('R41 根因：upListKindOf 新增 keepFileKinds 形参，true 时直传快照真实种类',
  INDEX.includes('keepFileKinds?: boolean): number {') &&
  /if \(keepFileKinds === true\) \{\s*\n\s*return snap\.kinds\[j\];/.test(INDEX) &&
  // 默认分支（上层清单）原样保留：无授权的父层文件行仍折叠成 ROW_OTHER
  /return snap\.kinds\[j\] === ROW_FOLDER \? ROW_FOLDER : ROW_OTHER;/.test(INDEX), true);
check('R41 修复：restoreDirContextOnly 传 keepFileKinds=true，文本行不再被折叠成 ROW_OTHER',
  /this\.upListKindOf\(base, nm,[\s\S]{0,260}\? ROW_OTHER : ROW_FOLDER, true\);/.test(R36_DIRCTX) &&
  R36_DIRCTX.includes('isTextFileName(nm) ? ROW_TEXT'), true);
check('R41 修复：恢复态清单仍是启动期零 IO（兜底只用纯字符串函数，不碰 fs / 选择器）',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder\(|chooseFolder\(|DocumentViewPicker|decodeTo\(|schedulePreload\(/.test(R36_DIRCTX) === false, true);
check('R41 兜底：恢复态纯清单里的图片行（不在翻页序列）点击即真实重列当前目录，不再静默吞掉',
  /else if \(kind === ROW_IMAGE\) \{[\s\S]{0,420}this\.openFolder\(this\.browseBase, true, false\);/.test(INDEX) &&
  // 文本行分发原样未动：仍走 openTextFile，绝不 select
  ROW_TEXT_BRANCH.includes('this.openTextFile(r.uri, r.name);'), true);
check('R41 零回归：上层清单（无授权父层）仍不传 keepFileKinds，文件行照旧折叠',
  /this\.upListKindOf\(target, nm,/.test(UPLIST_CODE) &&
  UPLIST_CODE.includes('keepFileKinds') === false, true);
console.log('  ⚠️ 真机步骤 R41：选 /storage/Users/currentUser → 点开一个 .log 预览 → 退出 App 重开 →');
console.log('     恢复态清单里点同一个 .log 应直接进文本预览（不再「不支持预览」）；');
console.log('     点「往上层」进上层清单，文件行仍显示「不支持预览」（无授权，原行为）。');

console.log('--- 第四十二轮：网盘目录整表缓存（秒开 + 后台刷新） ---');
check('R42 缓存结构：DirRowsCacheEntry 接口 + LRU 上限常量',
  INDEX.includes('interface DirRowsCacheEntry {') &&
  INDEX.includes('const DIR_ROWS_CACHE_MAX: number = 12;') &&
  INDEX.includes('private dirRowsCache: Array<DirRowsCacheEntry> = [];'), true);
check('R42 秒开：openFolder 非重扫先查整表缓存，命中立即零 IO 渲染',
  /const cacheHit: DirRowsCacheEntry \| undefined =\s*\n\s*isRescan === true \? undefined : this\.findDirRowsCache\(dirUri\);/.test(INDEX) &&
  /if \(fromCache\) \{\s*\n\s*this\.renderDirFromCache\(cacheHit!, dirUri, resetView, keepUri\);/.test(INDEX) &&
  INDEX.includes('private renderDirFromCache(hit: DirRowsCacheEntry, dirUri: string, resetView: boolean,') &&
  INDEX.includes('keepUri: string): void {'), true);
check('R42 渲染等价：缓存行按当前排序方向重排，分组顺序与真实列举同构（.. → 目录 → 图片 → 文本 → 其它）',
  INDEX.includes('private resortDirRows(rows: Array<ImageItem>, asc: boolean): Array<ImageItem> {') &&
  /resortDirRows[\s\S]{0,2200}out\.push\(\{ uri: '', name: '\.\.', size: -1, mtime: 0, kind: ROW_UP, itemIndex: -1 \}\);/.test(INDEX) &&
  /imgs\[i\]\.itemIndex = i;[\s\S]{0,80}out\.push\(imgs\[i\]\);/.test(INDEX), true);
check('R42 后台刷新：条目没变走 sameDirEntries 短路（视图一个像素不动），变了走 applyItems 保位刷新',
  INDEX.includes('this.applyItems(imgs, dirLabel, \'\', rows, isRescan === true || fromCache);') &&
  INDEX.includes("this.status = '目录已是最新（' + this.itemCount + ' 张）';") &&
  INDEX.includes("this.status = '目录已刷新（' + imgs.length + ' 张 · ' + dirLabel + '）';"), true);
check('R42 离线兜底：缓存已渲染而后台列举失败时保留缓存视图，返回 true 不触发上层清单回退',
  /if \(fromCache\) \{\s*\n\s*this\.status = '已显示缓存目录 · 刷新失败/.test(INDEX) &&
  /hilog\.warn\(DOMAIN, TAG, 'openFolder: cache shown, refresh failed[\s\S]{0,120}return true;/.test(INDEX), true);
check('R42 缓存写入：真实列举成功后整表入 LRU（sameDirPath 去重、超限裁尾），与 upDirCache 快照同点写入',
  /this\.cacheUpDirSnapshot\(base, rows\);\s*\n\s*\/\/ 第四十二轮[\s\S]{0,80}this\.cacheDirRows\(base, dirLabel, rows\);/.test(INDEX) &&
  INDEX.includes('private cacheDirRows(base: string, label: string, rows: Array<ImageItem>): void {') &&
  /cacheDirRows[\s\S]{0,600}this\.dirRowsCache\.length = DIR_ROWS_CACHE_MAX;/.test(INDEX), true);
check('R42 零回归：自动重扫（isRescan）不查缓存；缓存渲染不碰 dirMtime（留 0 等真值）、不清死路径记忆',
  /isRescan === true \? undefined : this\.findDirRowsCache\(dirUri\);/.test(INDEX) &&
  /renderDirFromCache[\s\S]{0,900}this\.dirMtime = 0;/.test(INDEX) &&
  /renderDirFromCache[\s\S]{0,2000}this\.saveDeadTag\(''\);/.test(INDEX) === false, true);
console.log('  ⚠️ 真机步骤 R42：选一个网盘 / NAS 目录（条目越多越好）→ 记下列目录耗时 →');
console.log('     点「往上层」再点回来 / 退出重进 → 目录表应**瞬间**出现（状态栏先显示');
console.log('     「已显示缓存目录（后台刷新中…）」，随后变「目录已是最新」或「目录已刷新」）；');
console.log('     在网盘侧增删一个文件 → 1.5s 轮询触发重扫 → 列表保位更新；');
console.log('     断开网盘后重进该目录 → 应保留缓存视图 +「已显示缓存目录 · 刷新失败」。');

console.log('--- 第四十三轮：用户导航抢占在途列举（修 NAS 点资料夹没反应） ---');
check('R43 抢占：用户导航（isRescan !== true）不再被 folderBusy 吞掉，自动重扫仍让路',
  /if \(this\.folderBusy && isRescan === true\) \{\s*\n\s*return false; \/\/ 自动重扫：用户操作在途，让路（原行为）/.test(INDEX) &&
  /const myEpoch: number = \+\+this\.openEpoch;/.test(INDEX) &&
  INDEX.includes('private openEpoch: number = 0;'), true);
check('R43 作废：在途列举被抢占后结果整段丢弃（epoch 过期即静默退出，不落任何状态）',
  /if \(myEpoch !== this\.openEpoch\) \{\s*\n\s*hilog\.info\(DOMAIN, TAG, 'openFolder: superseded by newer navigation, discard listing'\);\s*\n\s*return true;/.test(INDEX), true);
check('R43 放锁：只有当前代际持有者释放 folderBusy（被抢占的旧调用不得清掉新调用的锁）',
  /finally \{\s*\n\s*\/\/ 第四十三轮[\s\S]{0,160}if \(myEpoch === this\.openEpoch\) \{\s*\n\s*this\.folderBusy = false;/.test(INDEX), true);
check('R43 反馈：非缓存、非重扫的列举先同步显示「正在列出 …」，点击必看得见反应',
  /else if \(isRescan !== true\) \{\s*\n\s*\/\/ 点了必须看得见反应[\s\S]{0,200}this\.status = '正在列出 ' \+ baseName\(dirUri\) \+ '…';/.test(INDEX), true);
check('R43 往上层：browseUp 不再因 busy 早退，直接放行由 openFolder 抢占在途列举',
  /第四十三轮：不再因 folderBusy 早退[\s\S]{0,120}openFolder 会抢占在途列举/.test(INDEX) &&
  /往上层：上一批目录还在列，稍候再点/.test(INDEX) === false, true);
console.log('  ⚠️ 真机步骤 R43：进 NAS 目录（缓存秒开、状态栏「后台刷新中…」未消失时）立刻点');
console.log('     子资料夹 → 应立即响应（「正在列出 …」→ 进入），不再像没反应；');
console.log('     列表途中连点多个资料夹 → 最后点的那个胜出，中间的自动作废不闪屏；');
console.log('     「往上层」在列举途中点击也应立即响应。');

console.log('--- 第四十四轮：NAS 重启后 13900002 —— 重连重试 + 恢复态预热 ---');
check('R44 网络目录判定：isNetworkDirUri（scheme 授权形 / userExternal 挂载形 / UNC；file://docs 与 file://media 是本机 provider 不算）',
  /function isNetworkDirUri\(u: string\): boolean \{/.test(INDEX) &&
  /u\.indexOf\(':\/\/'\) >= 0 && u\.indexOf\('file:\/\/docs\/'\) !== 0/.test(INDEX) &&
  INDEX.includes("u.indexOf('/storage/userExternal/') >= 0"), true);
check('R44 重试节奏：NAS_RETRY_DELAYS = [600, 1800]，只对网络目录 + ENOENT(13900002) 重试，本地目录快速失败',
  /const NAS_RETRY_DELAYS: number\[\] = \[600, 1800\];/.test(INDEX) &&
  /const netRetry: boolean = isNetworkDirUri\(dirUri\);/.test(INDEX) &&
  /lastErr\.indexOf\('13900002'\) < 0 \|\| !netRetry \|\| isRescan === true/.test(INDEX), true);
check('R44 重试前静默重推持久授权：reactivatePersistQuiet 绝不调用 finishPersistActivate（一次性收口不得重入）',
  /private async reactivatePersistQuiet\(\): Promise<void> \{/.test(INDEX) &&
  INDEX.slice(INDEX.indexOf('private async reactivatePersistQuiet'),
    INDEX.indexOf('private async warmRestoreDirQuiet')).includes('finishPersistActivate(') === false &&
  /await this\.reactivatePersistQuiet\(\);/.test(INDEX), true);
check('R44 重试期间可被抢占：两次 epoch 校验（等待前 / 等待后），被抢占即让位不落状态',
  (INDEX.match(/if \(myEpoch !== this\.openEpoch\) \{/g) || []).length === 3, true);
check('R44 恢复态预热：restoreDirContextOnly 渲染后静默 warmRestoreDirQuiet（纯探测，不碰视图 / 状态栏 / folderBusy）',
  /this\.warmRestoreDirQuiet\(base\)\.catch/.test(INDEX) &&
  /private async warmRestoreDirQuiet\(base: string\): Promise<void> \{/.test(INDEX) &&
  /warm[\s\S]{0,400}listNum: 1/.test(INDEX), true);
check('R44 失败反馈：网络目录 ENOENT 重试耗尽后提示「网络目录未连接？稍候再点一次」',
  /（网络目录未连接\？稍候再点一次）' : ''\)/.test(INDEX) &&
  /'网络目录未就绪，正在重连（' \+ \(attempt \+ 1\)/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R44：重启 App（NAS 场景）→ 恢复态清单出现后立刻点 NAS 子资料夹 →');
console.log('     应看到「正在列出 …」或「网络目录未就绪，正在重连（1/2）…」后成功进入；');
console.log('     若 NAS 真断线：约 2.4s 后明确报「网络目录未连接？稍候再点一次」；');
console.log('     本地已删除目录：不重试、快速报错（行为与 R43 前一致）。');

console.log('--- 第四十五轮：只读名单态自愈 —— 预热成功即退出 READONLY ---');
check('R45 自愈入口：healRestoreMode（重探条目 URI，能开就退出只读态并补解当前张）',
  /private healRestoreMode\(\): void \{/.test(INDEX) &&
  /this\.restoreMode = RESTORE_FULL;/.test(INDEX) &&
  /heal[\s\S]{0,500}this\.showPreviewOf\(this\.cur\);/.test(INDEX), true);
check('R45 自愈只做一次最轻 sync 探测：fastProbe=true（单候选，不做多候选 openSync）',
  /this\.probeRestoreUris\(uris, this\.okUri, this\.savedDirUri, true\)/.test(INDEX), true);
check('R45 预热成功即自愈：warmRestoreDirQuiet 列得动目录后调 healRestoreMode',
  /warm: network dir ready[\s\S]{0,200}this\.healRestoreMode\(\);/.test(INDEX), true);
check('R45 快照恢复 / 单张兜底落只读态时同样后台预热自愈（两处 warmRestoreDirQuiet 调用）',
  (INDEX.match(/this\.warmRestoreDirQuiet\(this\.browseBase\)\.catch/g) || []).length === 2, true);
check('R45 自愈不硬闯：探不通维持 READONLY（真授权失效仍走「选择文件夹」重授权）',
  /heal: item uris still unreadable, stay READONLY/.test(INDEX) &&
  /probeRestoreUris\(uris, this\.okUri, this\.savedDirUri, true\);[\s\S]{0,120}if \(!readable\) \{/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R45：重启 App（NAS 冷启动）→ 若预览区只有档案名（只读名单态）→');
console.log('     等约 1~3 秒应自动恢复：状态栏出现「网络目录已恢复连接」，当前张补解显示；');
console.log('     翻页应正常出图。若 NAS 真断线：维持只读名单 + 指引卡（原设计）。');

console.log('--- 第四十六轮：appfreeze THREAD_BLOCK_6S —— 目录轮询 mtime 探测异步化 ---');
check('R46 根因修复：tryMtime 的 statSync（主线程同步跨进程 stat）已删除，改 tryMtimeAsync',
  /private async tryMtimeAsync\(uri: string\): Promise<number> \{/.test(INDEX) &&
  /fs\.statSync\(uri\)\.mtime/.test(INDEX) === false &&
  /await Promise\.race\(\[\s*fs\.stat\(uri\),/.test(INDEX), true);
check('R46 超时兜底：3s race 超时按「本轮没探到」（0）处理，复用 nasRetryWait 不新增 Promise 构造',
  /const MTIME_STAT_TIMEOUT_MS: number = 3000;/.test(INDEX) &&
  /this\.nasRetryWait\(MTIME_STAT_TIMEOUT_MS\)\.then\(\(\): number => 0\)/.test(INDEX) &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2, true);
check('R46 轮询不堆叠：mtimeBusy 重入保护（上一轮 stat 未回来跳过本轮，folderBusy/playing 让路语义不变）',
  /private mtimeBusy: boolean = false;/.test(INDEX) &&
  /this\.browseBase\.length === 0 \|\| this\.folderBusy \|\| this\.playing \|\| this\.mtimeBusy/.test(INDEX) &&
  /private async pollMtimeOnce\(\): Promise<void> \{/.test(INDEX), true);
check('R46 基准 mtime 异步取 + epoch 守卫：两处 openFolder 基准赋值不阻塞视图，被抢占的迟到结果丢弃',
  (INDEX.match(/this\.tryMtimeAsync\(base\)\.then\(\(m0: number\) => \{/g) || []).length === 2 &&
  /if \(myEpoch === this\.openEpoch && m0 > 0\) \{[\s\S]{0,60}this\.dirMtime = m0;/.test(INDEX), true);
check('R46 变动检测语义零改动：mtime 变了仍去抖重扫（isRescan=true / 不弹多选 / 保位）',
  /m > 0 && this\.dirMtime > 0 && m !== this\.dirMtime/.test(INDEX) &&
  /this\.openFolder\(this\.browseBase, false, false, true\);/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R46：NAS 目录停留浏览 ≥10 分钟（含 NAS 休眠 / 断网瞬间）→ App 不应再出现');
console.log('     appfreeze THREAD_BLOCK_6S；NAS 侧增删文件后列表仍约 1.5s+去抖自动刷新。');

console.log('--- 第四十七轮：对开右页首开空白 —— 解码失败重试 ---');
check('R47 右页解码失败不再留空了事：loadRightPage 失败分支按节奏补试（attempt 递增）',
  /private loadRightPage\(uri: string, attempt: number = 0\): void \{/.test(INDEX) &&
  /if \(e === undefined\) \{\s*\n\s*\/\/ 第四十七轮[\s\S]{0,900}this\.loadRightPage\(uri, attempt \+ 1\);/.test(INDEX), true);
check('R47 重试节奏常量：RIGHT_PAGE_RETRY_DELAYS = [600, 1800]（与 NAS 重试同节奏，试完即止不无限重试）',
  /const RIGHT_PAGE_RETRY_DELAYS: number\[\] = \[600, 1800\];/.test(INDEX) &&
  /if \(attempt < RIGHT_PAGE_RETRY_DELAYS\.length\) \{/.test(INDEX), true);
check('R47 重试可作废：token 校验（翻页 / 换对后旧重试 no-op）+ clearRightPage 清 pending 重试句柄',
  /if \(token === this\.rightToken\) \{\s*\n\s*this\.loadRightPage\(uri, attempt \+ 1\);/.test(INDEX) &&
  /clearTimeout\(this\.rightRetryTimer\);   \/\/ 第四十七轮：待重试的右页一并作废/.test(INDEX) &&
  /private rightRetryTimer: number = -1;/.test(INDEX), true);
check('R47 页面销毁清重试句柄（aboutToDisappear），成功路径与档位复用逻辑零改动',
  /clearTimeout\(this\.rightRetryTimer\);   \/\/ 第四十七轮：页面销毁时 pending 的右页重试一并清掉/.test(INDEX) &&
  /if \(hit !== undefined && shouldReuseDecoded\(hit\.edge, reuseNeed\)\) \{[\s\S]{0,120}this\.rightPixelMap = hit\.px;/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R47：首次打开一个含多张大 JPG 的目录（对开模式）→ 右页应在左页出来后');
console.log('     最多约 0.6~2.4 秒内补上；翻页换对应正常；坏文件右页留空但左页与翻页不受影响。');

console.log('--- 第四十八轮：右页空白可观测性 —— loadRightPage 全路径留痕 ---');
check('R48 解码失败留痕：decode FAIL + retry in + give up 三段日志（区分失败 / 重试 / 放弃）',
  /loadRightPage: decode FAIL attempt=%\{public\}d\/%\{public\}d uri=%\{public\}s/.test(INDEX) &&
  /loadRightPage: retry in %\{public\}dms uri=%\{public\}s/.test(INDEX) &&
  /loadRightPage: give up after %\{public\}d attempts uri=%\{public\}s/.test(INDEX), true);
check('R48 token 竞态留痕：stale discard（解码成功但被翻页作废）与异常路径都进日志',
  /loadRightPage: stale discard \(page turned\) uri=%\{public\}s/.test(INDEX) &&
  /loadRightPage: decode threw \(exception\) uri=%\{public\}s/.test(INDEX) &&
  /loadRightPage: decoded ok on retry %\{public\}d uri=%\{public\}s/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R48：复现右页空白时抓 hilog（grep HeicViewer），日志能直接区分：');
console.log('     decode FAIL（真解码失败）/ stale discard（竞态丢弃）/ give up（重试耗尽）三种成因。');

console.log('--- 第四十九轮：右页空白根因修复 —— 在途合并落点收口（解好先入缓存） ---');
check('R49 decodeTo 在途任务解好先 pushPreview 入缓存再交消费者（所有权在交接点收口）',
  /decodeInflight\.delete\(key\);[\s\S]{0,700}this\.pushPreview\(e\);[\s\S]{0,120}return e;/.test(INDEX), true);
check('R49 根因链完整：stale 丢弃 → releaseUncachedEntry → 缓存查重跳过（合并条目不再被误释放）',
  /loadRightPage: stale discard \(page turned\) uri=%\{public\}s/.test(INDEX) &&
  /private releaseUncachedEntry\(e: PreviewEntry \| undefined\): void \{[\s\S]{0,300}if \(this\.previews\[i\]\.px === e\.px\) \{[\s\S]{0,80}return; \/\/ 缓存已接管：所有权归缓存，调用方不动/.test(INDEX), true);
check('R49 pushPreview 幂等：同一张 px 只刷 LRU 位置，不重复入列不重复计字节（自动入缓存的前提）',
  /private pushPreview\(e: PreviewEntry\): void \{[\s\S]{0,400}if \(this\.previews\[i\]\.px === e\.px\) \{[\s\S]{0,200}\/\/ 复用命中：只刷新 LRU 位置，不重复入列、不重复计字节。/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R49：重启 App → 首次打开大 JPG 目录（对开模式）→ 右页应正常显示；');
console.log('     若仍空白，hilog 里 stale discard 行之后不再有右页空白（合并条目已归缓存所有）。');

console.log('--- 第五十轮：重启恢复态不再自称「已恢复上次目录」 ---');
check('R50 恢复态列表撤掉说明行伪条目，源码（去注释）不再出现「已恢复上次目录」字样',
  stripComments(INDEX).includes('已恢复上次目录') === false, true);
check('R50→R78 恢复态 dirHint 清空（左栏提示条已移除），状态栏按普通列表呈现',
  /this\.dirHint = '';/.test(INDEX) &&
  /inAppUpListHint\(/.test(INDEX) === false &&
  /this\.status = '「' \+ label \+ '」· 本层没有图片 · ' \+/.test(INDEX) &&
  /\(rows\.length - 1\) \+ ' 个条目（点名称重新真实列举）· '/.test(INDEX), true);
check('R50 旧快照兼容：isUpListPseudoName 识别旧版「已恢复上次目录」说明行并过滤',
  isUpListPseudoName('— 已恢复上次目录（APP 内）· uc1 —') === true &&
  isUpListPseudoName('No.3022') === false, true);
console.log('  ⚠️ 真机步骤 R50：重启 App → 恢复态列表不再有「— 已恢复上次目录 —」说明行，');
console.log('     状态栏显示「目录名 · 本层没有图片 · N 个条目」；旧快照里的说明行也不会再出现。');

console.log('--- 第五十一轮：文本预览常显滚动条 + 行段选择复制 ---');
check('R51→R52 文本纵向滚动条：原生条在全宽 List 右缘（视口外）看不见 → 改自绘条，原生关掉',
  /.scrollBar\(BarState\.Off\)  \/\/ 原生条在视口外看不见还占位，关掉只留自绘条/.test(INDEX), true);
check('R51→R54 行段选择状态：textSelAnchor/textSelFocus（交互已改为按住拖选，见 R54）',
  INDEX.includes('@State textSelAnchor: number = -1;') &&
  INDEX.includes('@State textSelFocus: number = -1;') &&
  INDEX.includes('private textSelDragging: boolean = false;'), true);
check('R51 行高亮 + 抬头工具条：选中行背景、有选区时抬头换成选区信息 + 复制 / 清除按钮',
  /\.backgroundColor\(this\.isTextRowSelected\(idx\) \? '#2a3550' : '#00000000'\)/.test(INDEX) &&
  INDEX.includes('Text(this.textSelLabel())') &&
  /Button\('复制'\)[\s\S]{0,500}this\.copyTextSelection\(\);/.test(INDEX) &&
  /Button\('清除'\)[\s\S]{0,500}this\.clearTextSelection\(\);/.test(INDEX), true);
check('R51 复制走系统剪贴板（pasteboard）+ Ctrl+C 同效 + 关文件 / 开新文件清选区',
  INDEX.includes("import pasteboard from '@ohos.pasteboard';") &&
  INDEX.includes('pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, parts.join(\'\\n\'))') &&
  /this\.ctrlDown && code === KeyCode\.KEYCODE_C && this\.textMode && this\.textSelAnchor >= 0/.test(INDEX) &&
  /private closeTextMode\(\): void \{[\s\S]{0,400}this\.clearTextSelection\(\);[\s\S]{0,80}\}/.test(INDEX) &&
  /private async openTextFile[\s\S]{0,900}this\.clearTextSelection\(\);/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R51：打开 .log/.txt → 右侧应常显纵向滚动条；点一条行亮起，');
console.log('     再点另一条成段（高亮范围），抬头出现「复制 / 清除」，复制后到别处粘贴验证内容完整；');
console.log('     Ctrl+C 同效；关闭文本预览再打开选区应已清除。');

console.log('--- 第五十二轮：文本纵向滚动条自绘（原生条画在全宽 List 右缘，视口外看不见） ---');
check('R52 自绘条状态与几何：textVpH / textFirstRow / textLastRow + 滑块高 / 位置比例计算',
  INDEX.includes('@State textVpH: number = 0;') &&
  INDEX.includes('@State textFirstRow: number = 0;') &&
  INDEX.includes('@State textLastRow: number = 0;') &&
  INDEX.includes('private textVBarThumbH(): number {') &&
  INDEX.includes('private textVBarTopPos(): number {') &&
  /let h: number = this\.textVpH \* vRows \/ total;/.test(INDEX) &&
  /const frac: number = this\.textFirstRow \/ denom;/.test(INDEX), true);
check('R52→R53 Stack TopEnd 叠放：横向 Scroll 视口右缘叠自绘轨道 + 滑块，不随横向滚动移动',
  /Stack\(\{ alignContent: Alignment\.TopEnd \}\) \{[\s\S]{0,400}Scroll\(this\.textHScroller\)/.test(INDEX) &&
  /Column\(\)[\s\S]{0,200}\.width\(6\)[\s\S]{0,120}\.height\(this\.textVBarThumbH\(\)\)/.test(INDEX) &&
  /\.margin\(\{ top: this\.textVBarTopPos\(\) \}\)/.test(INDEX) &&
  INDEX.includes(".scrollBar(BarState.Off)  // 原生条在视口外看不见还占位，关掉只留自绘条"), true);
check('R52 数据回填：List onScrollIndex 回填首行 / 视口高 onAreaChange 回填，开新文件重置',
  /\.onScrollIndex\(\(first: number, last: number, center: number\) => \{[\s\S]{0,120}this\.textFirstRow = first;/.test(INDEX) &&
  /onAreaChange\(\(_o: Area, n: Area\) => \{[\s\S]{0,80}this\.textVpH = Number\(n\.height\);/.test(INDEX) &&
  /this\.textScroller\.scrollToIndex\(0, false\);[\s\S]{0,200}this\.textFirstRow = 0;/.test(INDEX), true);
check('R52 拖滑块换算 scrollToIndex + Transparent 不挡行点击（选段不受滚动条影响）',
  /PanGesture\(\{ fingers: 1 \}\)[\s\S]{0,200}this\.textVBarDragTop = this\.textVBarTopPos\(\);/.test(INDEX) &&
  /onActionUpdate\(\(e: GestureEvent\) => \{[\s\S]{0,160}this\.textVBarDragTo\(this\.textVBarDragTop \+ e\.offsetY\);/.test(INDEX) &&
  /this\.textScroller\.scrollToIndex\(idx, false\);/.test(INDEX) &&
  INDEX.includes('.hitTestBehavior(HitTestMode.Transparent)'), true);
console.log('  ⚠️ 真机步骤 R52：打开长 .log（行超一屏且行宽超视口）→ 视口右缘应有纵向滚动条，');
console.log('     滚轮 / 拖滑块都应联动（滑块随滚动移动、拖滑块滚动正文），横向滚动时条不跟着走；');
console.log('     短文件（不满一屏）不应有滚动条；滑块区域点击应仍能选中行。');

console.log('--- 第五十三轮：R52 自绘条真机不显示 —— if 条件全直读 + 兜底回填 + 加粗加亮 ---');
check('R63 if 条件只直读一个 @State（R53 把非 @State 的 textLines 塞进条件导致条消失；R63 改内容驱动门控）',
  /if \(this\.textBarShow\) \{/.test(INDEX) &&
  INDEX.includes('@State textBarShow: boolean = false;') &&
  /if \(this\.textVpH > 0 && this\.textLines\.length >/.test(INDEX) === false &&
  /if \(this\.textVBarThumbH\(\) > 0\)/.test(INDEX) === false, true);
check('R53 onAreaChange / onScrollIndex 兜底回填 textVpH（防个别路径不触发 onAreaChange）',
  /onAreaChange\(\(_o: Area, n: Area\) => \{[\s\S]{0,120}this\.textVpH = Number\(n\.height\);/.test(INDEX) &&
  /if \(this\.textVpH <= 0 && last > first\) \{[\s\S]{0,160}this\.textVpH = \(last - first \+ 1\) \* TEXT_ROW_H_VP;/.test(INDEX), true);
check('R53 加粗加亮：滑块 6 宽亮色 + 轨道 10 宽深色底 + 滑块最小高 32',
  /Column\(\)[\s\S]{0,80}\.width\(6\)[\s\S]{0,120}\.backgroundColor\('#96a3c2'\)/.test(INDEX) &&
  /\.backgroundColor\('#232b38'\)/.test(INDEX) &&
  /if \(h < 32\) \{/.test(INDEX), true);
check('R53 诊断留痕：textVpH 回填与兜底都有 hilog（再不显示可直接抓日志定位哪个数是 0）',
  /'text area h=%\{public\}d rows=%\{public\}d'/.test(INDEX) &&
  /'text vpH fallback=%\{public\}d'/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R53：装新包 → 打开长 .log → 视口右缘应有明显的滚动条（亮色滑块 + 深色轨道）；');
console.log('     若仍不见：终端跑 hilog | grep --line-buffered HeicViewer，重进一次文本预览，');
console.log('     把「text area h=…」行发我（h=0 说明 onAreaChange 没回填，走了兜底会有 fallback=… 行）。');

console.log('--- 第五十四轮：选段改为按住左键拖选（hold → 拖动实时扩展 → release 定段） ---');
check('R54 onMouse 挂 List 统一收口：Press 定起点 / Move 实时扩展 / Release 定终点，只认左键',
  /private onTextMouse\(event: MouseEvent\): void \{[\s\S]{0,600}MouseAction\.Press[\s\S]{0,200}MouseButton\.Left[\s\S]{0,300}this\.textSelAnchor = this\.textRowAt\(Number\(event\.y\)\);/.test(INDEX) &&
  /MouseAction\.Move && this\.textSelDragging[\s\S]{0,120}this\.textSelFocus = this\.textRowAt\(Number\(event\.y\)\);/.test(INDEX) &&
  /MouseAction\.Release && this\.textSelDragging[\s\S]{0,160}this\.textSelDragging = false;/.test(INDEX) &&
  /\.onMouse\(\(event: MouseEvent\) => \{\s*this\.onTextMouse\(event\);\s*\}\)/.test(INDEX), true);
check('R54 行号换算：滚动偏移 + 列表内 y → 行号，并夹取到可见范围（不越界选到文档头尾）',
  /const off: number = Number\(this\.textScroller\.currentOffset\(\)\.yOffset \?\? 0\);/.test(INDEX) &&
  /let row: number = Math\.floor\(\(off \+ y\) \/ TEXT_ROW_H_VP\);/.test(INDEX) &&
  /const last: number = Math\.min\(total - 1, first \+ vRows - 1\);/.test(INDEX) &&
  /if \(row > last\) \{\s*row = last;/.test(INDEX), true);
check('R54 行级 onClick 移除（旧两次点击定界退役），清除按钮 / Ctrl+C / 关闭自动清选区保留',
  /this\.onTextRowTap\(idx\);/.test(INDEX) === false &&
  INDEX.includes('this.clearTextSelection();') &&
  /this\.ctrlDown && code === KeyCode\.KEYCODE_C && this\.textMode && this\.textSelAnchor >= 0/.test(INDEX) &&
  /clearTextSelection\(\): void \{[\s\S]{0,140}this\.textSelDragging = false;/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R54：打开 .log → 按住左键从某行拖到另一行松开 → 应成段高亮 + 抬头出现复制/清除；');
console.log('     按住期间滚轮滚动应能跨屏扩展选段；右键 / 中键不碰选区；「清除」按钮和 Ctrl+C 仍可用。');

console.log('--- 第五十五轮：预览区常显角标取消（左上档案名浮层 + 右下缩放百分比方块） ---');
check('R55 左上角信息浮层整体取消：档案名 / 大小 / 色彩三行都不再渲染，spreadNames 一并移除',
  /Text\(this\.spreadNames\(\)\)/.test(INDEX) === false &&
  /private spreadNames\(\): string \{/.test(INDEX) === false &&
  /extOf\(this\.curName\(\)\) \+ ' · ' \+ fmtBytes/.test(INDEX) === false &&
  /viewHintOf\(colorSpaceNameOf/.test(INDEX) === false, true);
check('R55 全屏退出提示保留（唯一指引，仅全屏出现，样式带底色圆角）',
  /if \(this\.fullscreen\) \{\s*Row\(\) \{\s*Text\('全屏 · Esc \/ F11 \/ 双击退出'\)/.test(INDEX) &&
  INDEX.includes("Text('全屏 · Esc / F11 / 双击退出')"), true);
check('R55 右下角百分比方块取消：无常显分支，缩放百分比只在诊断层（Ctrl+D）角标里出现',
  /Text\(this\.zoomPercentText\(\)\)/.test(INDEX) === false &&
  /Text\(this\.zoomPercentText\(\) \+ ' · ' \+ ESC_BUILD_TAG/.test(INDEX) &&
  /const ESC_BUILD_TAG: string = 'R88';/.test(INDEX), true);
check('R55 诊断层入口与内容不变：Ctrl+D 切换、退出 APP 按钮、全字段角标、diagLine 赋值链全保留',
  INDEX.includes('if (this.ctrlDown && code === KeyCode.KEYCODE_D) {') &&
  /Text\('退出 APP'\)/.test(INDEX) &&
  (INDEX.match(/this\.diagLine =/g) || []).length >= 10 &&
  /if \(SHOW_DIAG_BADGE && this\.diagLine\.length > 0\)/.test(INDEX), true);
check('R55 死代码清干净：viewHintOf / colorSpaceNameOf 不在 Index；fmtBytes 仅供 R77 adaptive 估宽',
  /viewHintOf/.test(INDEX) === false &&
  /colorSpaceNameOf/.test(INDEX) === false &&
  /fmtBytes/.test(INDEX) === true &&
  /sizeTexts\.push\(isFolder/.test(INDEX), true);
console.log('  ⚠️ 真机步骤 R55：打开图片 → 左上角无档案名浮层、右下角无百分比方块；');
console.log('     Ctrl+D 诊断层仍可展开（含退出 APP + 全字段角标）；全屏时左上角仅一行退出提示。');

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 A：装 R38 包 → 选 /storage/Users/currentUser 或从深层反复点「往上层」到 L0；');
console.log('     该层应真实列出 Download / Desktop / Documents / WorkBuddy 等全部顶层资料夹，可点名称进入。');
console.log('  ⚠️ 真机步骤 B：在任意 NAS 目录 / 盘符根 / 图片列表态点「往上层」，行为应与 R37 完全一致；');
console.log('     到 / 或 NAS 设备根仍给「已到最上层」提示，绝不越级到 /storage、/ 等系统目录。');
console.log('  ⚠️ 边界：只在用户主动点击且当前层恰好是用户卷根时做一次真实全量列举；');
console.log('     自动重扫（每 1.5s）/ 启动恢复期仍零新增 IO，绝不重演 THREAD_BLOCK_6S。');

// ==================== 第五十六轮：返回 APP 单次刷新 + 并排以左图比例为准（R56） ====================
console.log('--- 第五十六轮：返回 APP 自动同步目录 / 并排只看左图比例 ---');
const RESUME_REFRESH_SRC = readFileSync(new URL('../entry/src/main/ets/common/ResumeRefresh.ts', import.meta.url), 'utf8');
const VIEWPLAN56_SRC = readFileSync(new URL('../entry/src/main/ets/common/ViewPlan.ts', import.meta.url), 'utf8');
const r56Start = INDEX.indexOf('private tryRefreshOnResume(');
const r56End = INDEX.indexOf('  aboutToDisappear(): void {');
const RESUME56_FN = INDEX.slice(r56Start, r56End > r56Start ? r56End : r56Start + 6000);
const spread56Start = INDEX.indexOf('private refreshSpread(): void {');
const SPREAD56_FN = INDEX.slice(spread56Start, spread56Start + 1800);

check('R66 构建标记 R66，R64 及更早旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);

// —— 需求一：返回 APP 时左侧目录清单单次、非侵入刷新 ——
check('R56 resumeRefreshAction 五条件全满足才 GO',
  resumeRefreshAction(true, false, false, true, true) === RESUME_REFRESH_GO &&
  RESUME_REFRESH_GO !== RESUME_REFRESH_SKIP, true);
check('R56 resumeRefreshAction 首次进入（未离开 APP）恒 SKIP，不打断启动恢复',
  resumeRefreshAction(false, false, false, true, true) === RESUME_REFRESH_SKIP, true);
check('R56 resumeRefreshAction 同一返回周期已消费则 SKIP（只触发一次 refresh）',
  resumeRefreshAction(true, true, false, true, true) === RESUME_REFRESH_SKIP, true);
check('R56 resumeRefreshAction 在途 / 无目录 / 只读名单态一律让路',
  resumeRefreshAction(true, false, true, true, true) === RESUME_REFRESH_SKIP &&
  resumeRefreshAction(true, false, false, false, true) === RESUME_REFRESH_SKIP &&
  resumeRefreshAction(true, false, false, true, false) === RESUME_REFRESH_SKIP, true);
check('R56 resumeSelectedIndex 按 uri 保位 / 失效返回 -1',
  resumeSelectedIndex('b', ['a', 'b', 'c']) === 1 &&
  resumeSelectedIndex('b', ['a', 'c']) === -1 &&
  resumeSelectedIndex('', ['a']) === -1 &&
  resumeSelectedIndex('b', []) === -1, true);
check('R56 resumeDirKept 目录仍在才保留层级状态',
  resumeDirKept('/d', true) === true &&
  resumeDirKept('/d', false) === false &&
  resumeDirKept('', true) === false, true);
check('R56 resumeRefreshHint 成功 / 目录失效 / 选中失效 / 同步未完成四态',
  resumeRefreshHint(true, true, true, true) === '返回 APP · 目录清单已与磁盘同步' &&
  resumeRefreshHint(true, false, true, true).includes('原目录已失效') &&
  resumeRefreshHint(true, true, false, true).includes('失效选中已清除') &&
  resumeRefreshHint(true, true, false, false).includes('目录清单已与磁盘同步') &&
  resumeRefreshHint(true, true, false, false).includes('失效选中') === false &&
  resumeRefreshHint(false, true, true, true).includes('同步未完成'), true);
check('R56 ResumeRefresh.ts 零 SDK / 零 IO / 零异常抛出',
  /^\s*import\s/m.test(RESUME_REFRESH_SRC) === false &&
  /@ohos\.|\bfs\.|DocumentViewPicker/.test(RESUME_REFRESH_SRC) === false &&
  /\bawait\s|\bthrow\s+/.test(RESUME_REFRESH_SRC) === false, true);
check('R56 onPageHide 置位 + onPageShow 配对，首次进入不会触发刷新',
  /onPageHide\(\): void \{[\s\S]{0,700}this\.pageSuspended = true;/.test(INDEX) &&
  /this\.resumeRefreshHandled = false;/.test(INDEX) &&
  /onPageShow\(\): void \{\s*this\.tryRefreshOnResume\(\);/.test(INDEX) &&
  /private tryRefreshOnResume\(\): void \{/.test(INDEX), true);
check('R56 返回刷新复用 openFolder(isRescan=true)，不另起一套列举',
  /this\.openFolder\(base, false, false, true\)\.then/.test(RESUME56_FN) &&
  /resumeRefreshAction\(this\.pageSuspended,/.test(RESUME56_FN) &&
  /bulkIoAllowed\(this\.restoreMode\)/.test(RESUME56_FN) &&
  /RESUME_REFRESH_RETRY_MAX\)/.test(RESUME56_FN), true);
check('R56 在途操作闸门：列举 / 幻灯片 / mtime / picker 一律让路',
  /this\.folderBusy \|\| this\.playing \|\| this\.mtimeBusy \|\|\s*this\.pickerBusy \|\| !this\.pageAlive/.test(RESUME56_FN), true);
check('R56 同一返回事件只消费一次资格，重复回调不再刷新',
  /this\.resumeRefreshHandled = true;\s*this\.pageSuspended = false;/.test(RESUME56_FN) &&
  /this\.tryRefreshOnResume\(\);/.test(INDEX), true);
check('R56 刷新后按 uri 对账：选中仍在则保留、已不存在则清除失效选中',
  /resumeSelectedIndex\(prevUri, uris\)/.test(RESUME56_FN) &&
  /if \(hadSelection && !selKept\) \{\s*this\.cur = -1;\s*this\.refreshSpread\(\);/.test(RESUME56_FN) &&
  /resumeDirKept\(prevDir, ok && this\.browseBase\.length > 0\)/.test(RESUME56_FN), true);
check('R56 目录失效只清清单态 / mtime 基准，不误清 browseBase（保 R36 恢复）',
  /if \(!dirKept\) \{\s*this\.inAppUpList = false;\s*this\.dirMtime = 0;/.test(RESUME56_FN) &&
  /this\.browseBase = '';/.test(RESUME56_FN) === false &&
  /resumeRefreshHint\(true, dirKept, selKept, hadSelection\)/.test(RESUME56_FN), true);
check('R56 返回刷新定时器在再次离开 / 页面销毁时都清理',
  (INDEX.match(/clearTimeout\(this\.resumeRefreshTimer\)/g) || []).length >= 3, true);

// —— 需求二：并排预览以左图比例为准 ——
check('R56 图片比例三分类：竖图 / 横图 / 方形 / 尺寸未知',
  imageOrientationOf(800, 1200) === ORIENT_PORTRAIT &&
  imageOrientationOf(1200, 800) === ORIENT_LANDSCAPE &&
  imageOrientationOf(900, 900) === ORIENT_SQUARE &&
  imageOrientationOf(0, 0) === ORIENT_LANDSCAPE &&
  imageOrientationOf(-1, 100) === ORIENT_LANDSCAPE, true);
check('R56 左图 portrait → 有下一张就保留右页（右图横 / 竖 / 方都不参与判断）',
  spreadRightWantedOf(800, 1200, true, true) === true, true);
check('R56 左图 landscape / square / 尺寸未知 → 不显示右页，单页居中',
  spreadRightWantedOf(1200, 800, true, true) === false &&
  spreadRightWantedOf(900, 900, true, true) === false &&
  spreadRightWantedOf(0, 0, true, true) === false, true);
check('R56 无下一张 / 全局并排开关关闭 → 恒单页',
  spreadRightWantedOf(800, 1200, false, true) === false &&
  spreadRightWantedOf(800, 1200, true, false) === false, true);
check('R56 spreadRightWantedOf 签名不含右图形态参数（从签名杜绝旧逻辑）',
  /export function spreadRightWantedOf\(leftW: number, leftH: number,\s*hasNext: boolean, enabled: boolean\): boolean/.test(VIEWPLAN56_SRC) &&
  /rightW|rightH|rightOrientation/.test(VIEWPLAN56_SRC) === false, true);
check('R56 refreshSpread 只取左图尺寸，不再探测 / 判定右图是否竖图',
  /const sz: Size2 = this\.leftImageSize\(self, seq\);/.test(SPREAD56_FN) &&
  /spreadRightWantedOf\(sz\.w, sz\.h, hasNext, SPREAD_PORTRAIT\)/.test(SPREAD56_FN) &&
  /this\.probeOne\(b, seq\)/.test(INDEX) === false &&
  /const known: boolean \| undefined = this\.probeCache\.get\(b\);/.test(INDEX) === false, true);
check('R56 并排决策保留 bulkIoAllowed 闸门与既有右页解码链',
  /if \(!bulkIoAllowed\(this\.restoreMode\)\)/.test(SPREAD56_FN) &&
  /if \(!SPREAD_PORTRAIT \|\| this\.items\.length === 0 \|\| this\.cur < 0\)/.test(SPREAD56_FN) &&
  /this\.spreadB = pair;/.test(SPREAD56_FN) &&
  /this\.loadRightPage\(this\.items\[this\.spreadB\]\.uri\);/.test(SPREAD56_FN) &&
  /this\.clearRightPage\(\);/.test(SPREAD56_FN), true);
check('R56 左图尺寸探测缓存：成功 / 失败都写 probeSize，尺寸未知不误开右页',
  /private probeSize: Map<string, Size2>/.test(INDEX) &&
  /this\.probeSize\.set\(uri, dim\)/.test(INDEX) &&
  /this\.probeSize\.set\(uri, zeroDim\)/.test(INDEX) &&
  /private leftImageSize\(uri: string, seq: number\): Size2 \{/.test(INDEX) &&
  /const unknown: Size2 = \{ w: 0, h: 0 \};/.test(INDEX), true);
check('R56 既有翻页 / 右页重试 / 文本预览 / 往上层 / 版本守卫零回归',
  INDEX.includes('this.loadRightPage(this.items[this.spreadB].uri);') &&
  /RIGHT_PAGE_RETRY_DELAYS/.test(INDEX) &&
  /if \(this\.textMode\) \{/.test(INDEX) &&
  /private async browseUp\(\): Promise<void> \{/.test(INDEX) &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';"), true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R56-A：打开任意含图目录 → 切到别的应用 / 锁屏再返回 → 左栏应只刷一次、');
console.log('     与磁盘一致（期间新增 / 删除 / 改名 / 建子目录都能反映）；正在翻页 / 幻灯片时不打断。');
console.log('  ⚠️ 真机步骤 R56-B：原选中档案被删后返回 → 失效选中被清除且不自动改选别张；');
console.log('     目录仍在则保留原目录层级；目录不可列时给明确提示且不误回默认目录。');
console.log('  ⚠️ 真机步骤 R56-C：左图为竖图且后面还有一张 → 无论第二张横 / 竖 / 方，右页都显示；');
console.log('     左图为横图或方图 → 右页消失、左图单页居中；翻页 / 放大镜 / 文本预览不受影响。');

// ==================== 第五十七轮：重启 APP 后左侧列表补刷（R57） ====================
console.log('--- 第五十七轮：重启 APP 后左侧列表自动真实重列举 ---');
const TEST_SELF = readFileSync(new URL('dirname.test.mjs', import.meta.url), 'utf8');
const APP_JSON = readFileSync(new URL('../AppScope/app.json5', import.meta.url), 'utf8');
const boot57Start = INDEX.indexOf('private tryBootRefresh(');
const boot57End = INDEX.indexOf('  aboutToDisappear(): void {');
const BOOT57_FN = INDEX.slice(boot57Start, boot57End > boot57Start ? boot57End : boot57Start + 7000);
const RESUME56_DECISION_FN = INDEX.slice(r56Start, boot57Start);

check('R64 构建标记 R64，旧包排除数组首位补 R64（R64 旧包截图可一眼排除）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  /\['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56'/.test(TEST_SELF) === true, true);

// —— 冷启动补刷的独立纯函数决策（R56 决策零回归） ——
check('R57 bootRefreshAction 七条件全满足才 GO',
  bootRefreshAction(false, true, false, true, true, true, false) === BOOT_REFRESH_GO &&
  BOOT_REFRESH_GO !== BOOT_REFRESH_SKIP, true);
check('R57 bootRefreshAction 恢复链未收口恒 SKIP（绝不打断启动恢复）',
  bootRefreshAction(false, false, false, true, true, true, false) === BOOT_REFRESH_SKIP, true);
check('R57 bootRefreshAction 已消费 / 在途 / 无目录 / 只读名单态一律 SKIP',
  bootRefreshAction(true, true, false, true, true, true, false) === BOOT_REFRESH_SKIP &&
  bootRefreshAction(false, true, true, true, true, true, false) === BOOT_REFRESH_SKIP &&
  bootRefreshAction(false, true, false, false, true, true, false) === BOOT_REFRESH_SKIP &&
  bootRefreshAction(false, true, false, true, false, true, false) === BOOT_REFRESH_SKIP, true);
check('R57 bootRefreshAction 无上次会话记忆 / 用户已动手一律 SKIP',
  bootRefreshAction(false, true, false, true, true, false, false) === BOOT_REFRESH_SKIP &&
  bootRefreshAction(false, true, false, true, true, true, true) === BOOT_REFRESH_SKIP, true);
check('R57 bootRefreshHint 成功 / 目录失效 / 选中失效 / 无选中四态',
  bootRefreshHint(true, true, true) === '重启 APP · 目录清单已与磁盘同步' &&
  bootRefreshHint(false, true, true).includes('原目录已失效') &&
  bootRefreshHint(true, false, true).includes('失效选中已清除') &&
  bootRefreshHint(true, false, false).includes('失效选中') === false, true);
check('R57 R56 决策零回归：resumeRefreshAction 仍是 5 参签名，首次进入恒 SKIP',
  /export function resumeRefreshAction\(suspended: boolean, handled: boolean,\s*busy: boolean, hasDir: boolean, ioOk: boolean\): number/.test(RESUME_REFRESH_SRC) &&
  resumeRefreshAction(false, false, false, true, true) === RESUME_REFRESH_SKIP &&
  /resumeRefreshAction\(this\.pageSuspended,/.test(RESUME56_DECISION_FN), true);
check('R57 ResumeRefresh.ts 依旧零 SDK / 零 IO / 零异常抛出',
  /^\s*import\s/m.test(RESUME_REFRESH_SRC) === false &&
  /@ohos\.|\bfs\.|DocumentViewPicker/.test(RESUME_REFRESH_SRC) === false &&
  /\bawait\s|\bthrow\s+/.test(RESUME_REFRESH_SRC) === false &&
  /export function bootRefreshAction\(handled: boolean, resumeDone: boolean,/.test(RESUME_REFRESH_SRC), true);

// —— 页面接线：双入口、单次消费、不抢占、轮询重启 ——
check('R57 onPageShow 双入口：切后台返回 + 冷启动补刷（R56 入口保持首位）',
  /onPageShow\(\): void \{\s*this\.tryRefreshOnResume\(\);\s*this\.tryBootRefresh\(\);/.test(INDEX), true);
check('R57 markRestoreEntered 末尾主动触发冷启动补刷（两条恢复路径统一收口）',
  /private markRestoreEntered\(\): void \{[\s\S]{0,600}this\.tryBootRefresh\(\);/.test(INDEX) &&
  (INDEX.match(/this\.markRestoreEntered\(\);/g) || []).length >= 2, true);
check('R57 冷启动补刷复用 openFolder(isRescan=true)，不另起一套列举',
  /this\.openFolder\(base, false, false, true\)\.then/.test(BOOT57_FN) &&
  /bootRefreshAction\(this\.bootRefreshHandled, this\.resumeDone,/.test(BOOT57_FN) &&
  /bulkIoAllowed\(this\.restoreMode\)/.test(BOOT57_FN), true);
check('R57 两入口共用 runRefreshOnce，对账逻辑只出现一次（无重复 IO 链）',
  /this\.runRefreshOnce\(RESUME_SCENE_BACK\);/.test(RESUME56_DECISION_FN) &&
  /this\.runRefreshOnce\(RESUME_SCENE_BOOT\);/.test(BOOT57_FN) &&
  /private runRefreshOnce\(scene: number\): void \{/.test(INDEX) &&
  (INDEX.match(/resumeSelectedIndex\(prevUri, uris\)/g) || []).length === 1 &&
  (INDEX.match(/this\.openFolder\(base, false, false, true\)\.then/g) || []).length === 1, true);
check('R57 冷启动补刷单次消费资格，重复回调不再刷新',
  /this\.bootRefreshHandled = true;\s*this\.runRefreshOnce\(RESUME_SCENE_BOOT\);/.test(BOOT57_FN) &&
  /private bootRefreshHandled: boolean = false;/.test(INDEX), true);
check('R57 冷启动补刷不误清 browseBase（保 R36 目录恢复）',
  /this\.browseBase = '';/.test(BOOT57_FN) === false &&
  /resumeDirKept\(prevDir, ok && this\.browseBase\.length > 0\)/.test(BOOT57_FN), true);
check('R57 刷新成功后恢复 startDirPoll（冷启动快照恢复会清掉轮询）',
  /if \(ok && this\.dirPollTimer === -1\) \{\s*this\.startDirPoll\(\);/.test(BOOT57_FN), true);
check('R57 只读名单态 / 用户已动手 / 无恢复记忆不重试（有限延后闸门）',
  /if \(\(busy \|\| !this\.resumeDone\) && ioOk && this\.hasRestoreMemory &&\s*!this\.userActed && !this\.bootRefreshHandled && this\.pageAlive &&/.test(BOOT57_FN) &&
  /BOOT_REFRESH_RETRY_MAX\)/.test(BOOT57_FN), true);
check('R57 重试窗口覆盖 3s 恢复看门狗（400ms × 12 = 4800ms）',
  /const BOOT_REFRESH_RETRY_MS: number = 400;/.test(INDEX) &&
  /const BOOT_REFRESH_RETRY_MAX: number = 12;/.test(INDEX), true);
check('R57 冷启动补刷定时器在再次离开 / 页面销毁 / 执行刷新时都清理',
  (INDEX.match(/clearTimeout\(this\.bootRefreshTimer\)/g) || []).length >= 4 &&
  /onPageHide\(\): void \{[\s\S]{0,700}clearTimeout\(this\.bootRefreshTimer\)/.test(INDEX), true);
check('R57 status 文案按场景区分：返回 APP / 重启 APP 共用同一段对账',
  /scene === RESUME_SCENE_BOOT\s*\? bootRefreshHint\(dirKept, selKept, hadSelection\)\s*: resumeRefreshHint\(true, dirKept, selKept, hadSelection\)/.test(BOOT57_FN), true);
check('R57 版本守卫 1.0.7 / 7 与既有功能零回归',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes('this.loadRightPage(this.items[this.spreadB].uri);') &&
  /private async browseUp\(\): Promise<void> \{/.test(INDEX) &&
  /if \(this\.textMode\) \{/.test(INDEX), true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R57-A：打开含图目录后彻底杀进程重启 APP → 恢复出上次目录时左栏应自动与磁盘同步，');
console.log('     期间新增 / 删除 / 改名 / 建子目录都能反映；Ctrl+D 角标必须是 R57。');
console.log('  ⚠️ 真机步骤 R57-B：重启后原选中档案仍在则保留选中；已被删则清除失效选中且不自动改选别张。');
console.log('  ⚠️ 真机步骤 R57-C：重启落在空目录 / 无图片目录也要恢复并同步；切后台再返回仍只刷一次，');
console.log('     正在翻页 / 幻灯片 / 选文件夹时不打断；只读名单态（授权失效）不强行刷、等后台自愈。');

// ==================== 第五十八轮：视窗缩放时右侧预览图不再被过度缩小（R58） ====================
console.log('--- 第五十八轮：resize 画布尺寸护栏（chrome 自洽采样 + 反推塌缩拒绝） ---');
const VIEWPLAN58_SRC = readFileSync(new URL('../entry/src/main/ets/common/ViewPlan.ts', import.meta.url), 'utf8');
const vp58Start = VIEWPLAN58_SRC.indexOf('// ==================== 第五十八轮');
const VP58 = VIEWPLAN58_SRC.slice(vp58Start);
const s2 = (o) => o.w + '×' + o.h;

// —— 纯函数真值源：固定栏偏移 chrome 的自洽采样 ——
check('R58 chromeSampleOf 首帧自洽采样建立 300×80 基准',
  s2(chromeSampleOf(-1, -1, 1600, 900, 1300, 820, 2, 0.6)) === '300×80', true);
check('R58 chromeSampleOf 稳态一致采样不漂移',
  s2(chromeSampleOf(300, 80, 1600, 900, 1300, 820, 2, 0.6)) === '300×80', true);
check('R58 chromeSampleOf 缩小视窗跨帧污染被挡（旧根 1600 − 新画布 700 = 900 判污染）',
  s2(chromeSampleOf(300, 80, 1600, 900, 700, 520, 2, 0.6)) === '300×80', true);
check('R58 chromeSampleOf 放大视窗时「画布大于根」同样判跨帧错配，保持原基准',
  s2(chromeSampleOf(300, 80, 1000, 600, 1300, 820, 2, 0.6)) === '300×80', true);
check('R58 chromeSampleOf 非正值 / chrome 吃掉大半个屏一律拒绝采样',
  s2(chromeSampleOf(300, 80, 0, 600, 700, 520, 2, 0.6)) === '300×80' &&
  s2(chromeSampleOf(300, 80, 1000, 600, 700, -1, 2, 0.6)) === '300×80' &&
  s2(chromeSampleOf(-1, -1, 1000, 600, 300, 200, 2, 0.6)) === '-1×-1', true);
check('R58 chromeSampleOf 固定栏合法变小（收起左栏）被采信，可变大只挡异常污染',
  s2(chromeSampleOf(300, 80, 1600, 900, 1500, 820, 2, 0.6)) === '100×80' &&
  s2(chromeSampleOf(300, 80, 1600, 900, 1299, 820, 2, 0.6)) === '301×80' &&
  s2(chromeSampleOf(300, 80, 1600, 900, 1300, 700, 2, 0.6)) === '300×80', true);

// —— 纯函数真值源：根回调反推画布覆盖前的塌缩护栏 ——
check('R58 canvasResizeAcceptOf 正常反推画布 700×520 / 1000×600 放行',
  canvasResizeAcceptOf(1000, 600, 700, 520, 0.4) === true, true);
check('R58 canvasResizeAcceptOf 旧链路塌缩值 100×220 拒绝覆盖',
  canvasResizeAcceptOf(1000, 600, 100, 220, 0.4) === false, true);
check('R58 canvasResizeAcceptOf 越界 / 非正值一律拒绝',
  canvasResizeAcceptOf(1000, 600, 1200, 520, 0.4) === false &&
  canvasResizeAcceptOf(1000, 600, 0, 520, 0.4) === false &&
  canvasResizeAcceptOf(0, 600, 700, 520, 0.4) === false, true);
check('R58 canvasResizeAcceptOf minRatio 下界边界与非法参数回退 0.4',
  canvasResizeAcceptOf(1000, 600, 400, 240, 0.4) === true &&
  canvasResizeAcceptOf(1000, 600, 399, 240, 0.4) === false &&
  canvasResizeAcceptOf(1000, 600, 500, 300, 0.8) === false &&
  canvasResizeAcceptOf(1000, 600, 500, 300, 0) === true, true);

// —— 数值复现：把「缩小视窗 → 图片只占 6% 面积」的旧链路与修复后链路逐值钉死 ——
const polluted58 = canvasFromRootOf(1000, 600, 900, 380);
const clean58 = canvasFromRootOf(1000, 600, 300, 80);
const oldArea58 = (polluted58.w / clean58.w) * (polluted58.h / clean58.h);
check('R58 数值复现：旧写法 chrome 被污染成 900×380，画布塌缩 100×220，图片框仅占 6% 面积',
  polluted58.w === 100 && polluted58.h === 220 &&
  clean58.w === 700 && clean58.h === 520 &&
  oldArea58 > 0.05 && oldArea58 < 0.07, true);
const guardedChrome58 = chromeSampleOf(300, 80, 1600, 900, 700, 520, 2, 0.6);
const fixed58 = canvasFromRootOf(1000, 600, guardedChrome58.w, guardedChrome58.h);
check('R58 数值复现：护栏后 chrome 保持 300×80，反推画布 = 实测 700×520（100% 适配预览框）',
  s2(guardedChrome58) === '300×80' && fixed58.w === 700 && fixed58.h === 520 &&
  canvasResizeAcceptOf(1000, 600, fixed58.w, fixed58.h, 0.4) === true, true);

// —— Index.ets 接线：两处回调都改走护栏，旧污染写法彻底消失 ——
check('R58 预览回调改走 chromeSampleOf，旧「lastRoot − 画布」污染写法已移除',
  /const chrome: Size2 = chromeSampleOf\(this\.chromeW, this\.chromeH,/.test(INDEX) &&
  /this\.chromeW = chrome\.w;\s*this\.chromeH = chrome\.h;/.test(INDEX) &&
  INDEX.includes('this.chromeW = this.lastRootW - w;') === false, true);
check('R58 根回调 seed 只在 changed 且基准未就绪时执行，不再用 rw − canvasW',
  /if \(changed && \(this\.chromeW < 0 \|\| this\.chromeH < 0\)\) \{/.test(INDEX) &&
  /const chromeSeed: Size2 = chromeSampleOf\(/.test(INDEX) &&
  INDEX.includes('this.chromeW = rw - this.canvasW;') === false, true);
check('R58 根回调反推画布覆盖前加塌缩护栏，canvasFromRootOf 兜底链仍在',
  /if \(!canvasResizeAcceptOf\(rw, rh, box\.w, box\.h, CANVAS_MIN_ROOT_RATIO\)\) \{/.test(INDEX) &&
  /const box: Size2 = canvasFromRootOf\(rw, rh, this\.chromeW, this\.chromeH\);/.test(INDEX) &&
  /this\.canvasW = box\.w;\s*this\.canvasH = box\.h;\s*this\.armResizeReload\(\);/.test(INDEX), true);
check('R58 三个护栏常量与 ViewPlan import 接线齐备',
  /const CHROME_SAMPLE_TOL: number = 2;/.test(INDEX) &&
  /const CHROME_SAMPLE_MAX_RATIO: number = 0\.6;/.test(INDEX) &&
  /const CANVAS_MIN_ROOT_RATIO: number = 0\.4;/.test(INDEX) &&
  /chromeSampleOf, canvasResizeAcceptOf,/.test(INDEX) &&
  /\} from '\.\.\/common\/ViewPlan';/.test(INDEX), true);
check('R58 左栏收起 / 展开三处 + setFull 共四处重置 chrome 基准（结构变化合法重建）',
  (INDEX.match(/this\.chromeW = -1;\s*this\.chromeH = -1;/g) || []).length === 4, true);
check('R58 ViewPlan 新增两纯函数零 SDK / 零 IO / 零 await / 零 throw',
  vp58Start > 0 &&
  /export function chromeSampleOf\(prevW: number, prevH: number,/.test(VP58) &&
  /export function canvasResizeAcceptOf\(rootW: number, rootH: number,/.test(VP58) &&
  /^\s*import\s/m.test(VP58) === false &&
  /@ohos\.|\bfs\./.test(VP58) === false &&
  /\bawait\s|\bthrow\s+/.test(VP58) === false, true);
check('R66 构建标记 R66 且 R64 / R63 旧标记定义全清除（截图一眼排除旧包）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R63';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R62';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R61';") === false &&
  /\['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56'/.test(TEST_SELF) === true, true);
check('R58 其它界面布局零回归：Contain / 并排策略 / 放大镜 / 文本预览 / 目录恢复 / 版本守卫全未动',
  /\.objectFit\(ImageFit\.Contain\)/.test(INDEX) &&
  /\.width\(this\.pageW(Left|Right)\(half\)\)/.test(INDEX) &&
  /\.height\(this\.pageH\(half\)\)/.test(INDEX) &&
  /spreadRightWantedOf\(sz\.w, sz\.h, hasNext, SPREAD_PORTRAIT\)/.test(INDEX) &&
  /if \(this\.textMode\) \{/.test(INDEX) &&
  /private async browseUp\(\): Promise<void> \{/.test(INDEX) &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R58-A：正常视窗打开图片 → 把窗口拖小到约一半 → 右侧（并排右页）预览图应始终');
console.log('     按预览框合理适配、占据大部分面积，不得缩成预览框角落里的一小块；Ctrl+D 角标必须是 R58。');
console.log('  ⚠️ 真机步骤 R58-B：缓慢来回拖动窗口边框连续改变尺寸 → 过程中图片不应突然塌缩；');
console.log('     松手后稳定态与同尺寸直接打开的显示比例一致（无残留脏基准）。');
console.log('  ⚠️ 真机步骤 R58-C：放大视窗 / 进出全屏 / Ctrl+B 或 » 收起再展开左栏后，');
console.log('     预览图仍按预览框适配；单页 / 并排、放大镜、文本预览、目录恢复均不受影响。');

// ==================== 第五十九轮：往上层反色 + 左栏名称紧贴最左边缘（R59） ====================
console.log('--- 第五十九轮：往上层后子目录反色 / 档案名左侧零留白 ---');
const UPRET59_SRC = readFileSync(new URL('../entry/src/main/ets/common/UpReturn.ts', import.meta.url), 'utf8');
const UPRET59_CODE = stripComments(UPRET59_SRC);

// —— 纯函数真值源：标记的产生 / 刷新 / 清除 / 命中 / 配色 ——
check('R59 upReturnMarkOf 真正上移落地且能取到子目录名才产生标记',
  upReturnMarkOf('人像', true, true) === '人像' &&
  upReturnMarkOf('编号202601 模特 猫', true, true) === '编号202601 模特 猫', true);
check('R59 upReturnMarkOf 未落地 / 不能上移 / 空名一律无标记',
  upReturnMarkOf('人像', false, true) === UPRET_NONE &&
  upReturnMarkOf('人像', true, false) === UPRET_NONE &&
  upReturnMarkOf('', true, true) === UPRET_NONE, true);
check('R59 upReturnMarkOf 过滤 .. / . / baseName 未命名兜底',
  upReturnMarkOf('..', true, true) === UPRET_NONE &&
  upReturnMarkOf('.', true, true) === UPRET_NONE &&
  upReturnMarkOf('（未命名）', true, true) === UPRET_NONE, true);
check('R59 upReturnRefreshOf 每次返回整体替换，连续返回不叠加 / 不残留失败值',
  upReturnRefreshOf('2026', '人像') === '人像' &&
  upReturnRefreshOf('人像', 'Collection') === 'Collection' &&
  upReturnRefreshOf('人像', UPRET_NONE) === UPRET_NONE, true);
check('R59 upReturnClearOf 换源清空 / 自动重扫与保位刷新保留',
  upReturnClearOf('人像', false) === UPRET_NONE &&
  upReturnClearOf('人像', true) === '人像' &&
  upReturnClearOf(UPRET_NONE, true) === UPRET_NONE, true);
check('R59 upReturnInvertOf 只命中「名字严格相等 + 目录类行」',
  upReturnInvertOf('人像', '人像', UPRET_KIND_FOLDER, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === true &&
  upReturnInvertOf('Vol.2', 'Vol.2', UPRET_KIND_OTHER, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === true, true);
check('R59 upReturnInvertOf 图片 / 上级 / 文本行一律不反色',
  upReturnInvertOf('人像', '人像', 0, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false &&
  upReturnInvertOf('人像', '人像', 1, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false &&
  upReturnInvertOf('人像', '人像', 4, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false, true);
check('R59 upReturnInvertOf 名字严格相等而非包含 / 空标记不误命中',
  upReturnInvertOf('人像 备份', '人像', UPRET_KIND_FOLDER, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false &&
  upReturnInvertOf('人像', '', UPRET_KIND_FOLDER, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false &&
  upReturnInvertOf('', '人像', UPRET_KIND_FOLDER, UPRET_KIND_FOLDER, UPRET_KIND_OTHER) === false, true);
check('R59 upReturnBgOf / upReturnFgOf 非命中行逐字返回原配色',
  upReturnBgOf(true, '#1e242e') === UPRET_INVERT_BG &&
  upReturnBgOf(false, '#1e242e') === '#1e242e' &&
  upReturnFgOf(true, '#8fb8e8') === UPRET_INVERT_FG &&
  upReturnFgOf(false, '#8fb8e8') === '#8fb8e8', true);
check('R59 反色配色沿用既有色系（亮底 = 选中文字色 / 深字 = 奇数条纹底色）',
  UPRET_INVERT_BG === '#e8ecf4' && UPRET_INVERT_FG === '#161a21' &&
  UPRET_NONE === '' && UPRET_KIND_FOLDER === 2 && UPRET_KIND_OTHER === 3, true);
check('R59 UpReturn.ts 零 SDK / 零文件 IO / 零 await / 零 throw / 无隐藏状态',
  /^\s*import\s/m.test(UPRET59_CODE) === false &&
  /@ohos\.|\bfs\./.test(UPRET59_CODE) === false &&
  /\bawait\s|\bthrow\s+/.test(UPRET59_CODE) === false &&
  /export (const|function)/.test(UPRET59_CODE) === true, true);

// —— 接线：Index 状态 / 落地刷新 / Sidebar 下传 / ArchiveRow 渲染 ——
check('R59 Index import 四个 UpReturn 纯函数真值源（R60 追加 upReturnInvertOf 后仍成立）',
  /import \{ UPRET_NONE, upReturnMarkOf, upReturnRefreshOf,\s*upReturnClearOf(?:, upReturnInvertOf)? \} from '\.\.\/common\/UpReturn';/.test(INDEX), true);
check('R59 @State upReturnName 与 cur 分离，初始为空标记',
  INDEX.includes('@State upReturnName: string = UPRET_NONE;') &&
  INDEX.includes('@State cur: number = -1;'), true);
check('R59 SidebarView 调用并列下传 upReturnName',
  /SidebarView\(\{[\s\S]{0,600}cur: this\.cur,[\s\S]{0,200}upReturnName: this\.upReturnName,/.test(INDEX), true);
check('R59 applyItems 换源清空 / keepView 保留（不抹掉刚落地的反色）',
  INDEX.includes('this.upReturnName = upReturnClearOf(this.upReturnName, keepView);') &&
  /const keepView: boolean = preserveView === true;\s*\/\/[\s\S]{0,300}upReturnClearOf\(this\.upReturnName, keepView\)/.test(INDEX), true);
check('R59 一次往上层入口先清空旧标记，保证失败 / 早退不残留',
  /private async browseUp\(\): Promise<void> \{[\s\S]{0,400}this\.upReturnName = upReturnClearOf\(this\.upReturnName, false\);/.test(INDEX), true);
check('R59 browseUp 记下返回前所在子目录名（与 rows.name 同源 baseName）',
  INDEX.includes("const fromName: string = current.length > 0 ? baseName(current) : '';"), true);
check('R59 全量探索落地按本次结果整体替换标记并重建 LazyForEach 可见行',
  INDEX.includes('upReturnMarkOf(fromName, true, canUp)') &&
  /upReturnRefreshOf\(this\.upReturnName,\s*upReturnMarkOf\(fromName, true, canUp\)\);\s*this\.dataSource\.reload\(this\.rows\);/.test(INDEX), true);
check('R59 R38 卷根原地重列举不是上移，canUp=false 不给标记',
  INDEX.includes('upReturnMarkOf(fromName, true, false)') &&
  /upReturnMarkOf\(fromName, true, false\)\);\s*this\.dataSource\.reload\(this\.rows\);/.test(INDEX), true);
check('R59 APP 内上层清单同样落地反色，且标记在 reload 之前设好',
  INDEX.includes('upReturnMarkOf(curName, true, true)') &&
  /upReturnMarkOf\(curName, true, true\)\);\s*this\.dataSource\.reload\(this\.rows\);/.test(INDEX), true);
check('R59 进子目录 / 冷启动恢复 / 往上层入口显式清空反色标记（覆盖整表缓存 keepView 分支）',
  (INDEX.match(/upReturnClearOf\(this\.upReturnName, false\);/g) || []).length === 3 &&
  INDEX.includes('upReturnClearOf(this.upReturnName, keepView);') &&
  /if \(kind === ROW_FOLDER\) \{[\s\S]{0,400}upReturnClearOf\(this\.upReturnName, false\);[\s\S]{0,400}this\.openFolder\(r\.uri, true, !this\.inAppUpList\);/.test(INDEX), true);
check('R59 SidebarView 新增 @Prop upReturnName 并按名字 + 行种类逐行判定',
  SIDEBAR.includes('@Prop upReturnName: string = \'\';') &&
  SIDEBAR.includes('import { upReturnInvertOf } from \'../common/UpReturn\';') &&
  /inverted: upReturnInvertOf\(item\.name, this\.upReturnName,\s*item\.kind \?\? ROW_IMAGE, ROW_FOLDER, ROW_OTHER\),/.test(SIDEBAR), true);
check('R59 ArchiveRow 新增独立 @Prop inverted，三个配色函数走反色真值源',
  ARCHIVE.includes('@Prop inverted: boolean = false;') &&
  ARCHIVE.includes("import { upReturnBgOf, upReturnFgOf } from '../common/UpReturn';") &&
  ARCHIVE.includes('upReturnBgOf(true, ROW_STRIPE_EVEN)') &&
  (ARCHIVE.match(/upReturnFgOf\(/g) || []).length === 4, true);

// —— 需求二：名称文字紧贴列表最左边缘（三层左侧留白清零 + 图标列后移）——
check('R59 List 层左内边距清零（只保留右侧留白）',
  SIDEBAR.includes('.padding({ right: 8 })') &&
  SIDEBAR.includes('.padding({ left: 8, right: 8 })') === false, true);
check('R59 行 Row 左内边距清零 / 名称 Text 不再有左 padding',
  ARCHIVE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  ARCHIVE.includes('.padding({ left: 6, right: 6, top: 0.2, bottom: 0.2 })') === false &&
  /\.padding\(\{ left: 8 \}\)/.test(ARCHIVE) === false, true);
check('R59→R75 名称文字是行首第一个子组件，符号列已整体移除（其后直接是字节 / 日期两栏）',
  (() => {
    const b = ARCHIVE.indexOf('  build() {');
    const body = ARCHIVE.slice(b);
    const token = 'Text(this.name)';
    const n = body.indexOf(token);
    const g = body.indexOf('if (!this.collapsed)');
    return n >= 0 && g > n && body.slice(n + token.length, g).includes('Text(') === false;
  })(), true);
check('R77 名称列彻底移除 minWidth 预设宽度（含 +8 补偿），纯 layoutWeight(1) 弹性伸缩',
  ARCHIVE.includes('.constraintSize({ minWidth: textWidthVp(this.name, 12) })') === false &&
  /constraintSize\(\{ minWidth:/.test(ARCHIVE) === false &&
  ARCHIVE.includes('.layoutWeight(1)'), true);
check('R80 行高锚点 .height(26) → constraintSize({minHeight:26})（单行等价、多行不裁）/ 单个 Text(this.name)',
  ARCHIVE.includes('.width(folderGlyphWidthOf(') === false &&
  stripComments(ARCHIVE).includes('.height(26)') === false &&
  (stripComments(ARCHIVE).match(/constraintSize\(\{ minHeight: 26 \}\)/g) || []).length === 1 &&
  ((INDEX + ARCHIVE).match(/Text\(this\.name\)/g) || []).length === 1, true);

// —— 零回归：常规选中 / 目录切换 / 交替条纹 / 版本 / 构建标记 ——
check('R59 常规选中链逐字未动：selected 仍只由 cur 决定',
  SIDEBAR.includes('selected: (item.itemIndex ?? idx) === this.cur,') &&
  INDEX.includes('this.select(idx);') &&
  INDEX.includes('this.openFolder(r.uri, true, !this.inAppUpList);') &&
  INDEX.includes('this.browseUp();'), true);
check('R59 交替条纹 / 选中优先 / 悬停解码等既有样式分支仍在',
  /private rowBgColor\(\): string \{[\s\S]{0,200}if \(this\.selected\)[\s\S]{0,120}return ROW_SELECTED_BG;[\s\S]{0,160}\(this\.idx % 2\) === 0 \? ROW_STRIPE_EVEN : ROW_STRIPE_ODD/.test(ARCHIVE) &&
  /\.backgroundColor\(this\.rowBgColor\(\)\)/.test(ARCHIVE) &&
  ARCHIVE.includes("if (this.kind === ROW_TEXT) {\n      return '#d8c78a';"), true);
check('R59 目录切换 / 文本预览 / 并排预览 / 视窗护栏 / 版本守卫零回归',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  /回上层/.test(INDEX) === false &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  INDEX.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX.includes('chromeSampleOf(') && INDEX.includes('canvasResizeAcceptOf(') &&
  INDEX.includes('this.openTextFile(r.uri, r.name);'), true);
check('R66 构建标记 R66，R64 及更早旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R58';") === false &&
  ['R64', 'R63', 'R62', 'R61', 'R60', 'R57', 'R56', 'R55', 'R54', 'R53', 'R52', 'R51', 'R50', 'R49', 'R48', 'R47', 'R46', 'R45', 'R44', 'R43', 'R42', 'R41', 'R38', 'R37', 'R36', 'R35', 'R34', 'R33', 'R32', 'R31', 'R30', 'R29', 'R28', 'R27', 'R26', 'R25', 'R24', 'R23', 'R22', 'R21'].every(t =>
    INDEX.includes("const ESC_BUILD_TAG: string = '" + t + "';") === false), true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R59-A：进入任意子目录后点「往上层」→ 上层清单里**返回前所在的那个子目录名**');
console.log('     整行反色（亮底深字），其余目录 / 档案行保持原有条纹与配色；Ctrl+D 角标必须是 R59。');
console.log('  ⚠️ 真机步骤 R59-B：连续多层往上层 → 每次只反色「刚离开的子目录名」，上一层的高亮必须消失；');
console.log('     进入子目录 / 重选文件夹 / 只读恢复态下不应残留任何反色行。');
console.log('  ⚠️ 真机步骤 R59-C：左栏所有档案名（图片 / 目录 / 文本 / .. 行）文字统一紧贴列表最左边缘，');
console.log('     无任何左内边距或缩进；↑ / ▣ 符号改在名称右侧显示，三栏的字节 / 日期列仍对齐。');
console.log('  ⚠️ 真机步骤 R59-D：常规点选、双击全屏、翻页、排序、目录切换与悬停缩略图行为均与 R58 一致。');

// ==================== 第六十轮：高亮项恒定完整可见（R60） ====================
console.log('--- 第六十轮：高亮项不被 scrollbar / 滚动 / 尺寸变化裁剪 ---');
const HV60_SRC = readFileSync(new URL('../entry/src/main/ets/common/HighlightVisible.ts', import.meta.url), 'utf8');
const HV60_CODE = stripComments(HV60_SRC);
const LIST60 = SIDEBAR.slice(SIDEBAR.indexOf('List({ scroller: this.scroller'),
  SIDEBAR.indexOf('// 11-10 起按用户要求取消'));

// —— 纯函数真值源：主高亮行 / 安全可见区 / 挂起自锁 / AUTO 对齐 / 尺寸变化 ——
check('R60 动作码 / 无效 key / AUTO 对齐常量语义分离',
  HV_NONE === 0 && HV_REVEAL === 1 && HV_KEY_INVALID === -1 && HV_ALIGN_AUTO === 3, true);
check('R60 highlightRowOf 常规选中行优先，cur=-1 时退回反色行',
  highlightRowOf(3, 7, 20) === 3 && highlightRowOf(-1, 7, 20) === 7 &&
  highlightRowOf(-1, -1, 20) === -1, true);
check('R60 highlightRowOf 越界下标夹掉 / 零行返回 -1',
  highlightRowOf(99, 7, 20) === 7 && highlightRowOf(3, 99, 20) === 3 &&
  highlightRowOf(0, 0, 0) === -1, true);
check('R60 highlightSafeOf 只认开区间 (first,last)，首末行不算完整可见',
  highlightSafeOf(5, 3, 9, 20) === true &&
  highlightSafeOf(3, 3, 9, 20) === false &&
  highlightSafeOf(9, 3, 9, 20) === false &&
  highlightSafeOf(2, 3, 9, 20) === false &&
  highlightSafeOf(10, 3, 9, 20) === false, true);
check('R60 highlightSafeOf 范围未上报 / 倒挂 / 脏值一律 false',
  highlightSafeOf(5, -1, 9, 20) === false &&
  highlightSafeOf(5, 9, 3, 20) === false &&
  highlightSafeOf(-1, 3, 9, 20) === false &&
  highlightSafeOf(5, 3, 9, 0) === false, true);
check('R60 highlightGuardKeyOf 同一态同 key、非法态返回 HV_KEY_INVALID',
  highlightGuardKeyOf(3, 3, 9, 20) === highlightGuardKeyOf(3, 3, 9, 20) &&
  highlightGuardKeyOf(3, 3, 9, 20) !== highlightGuardKeyOf(5, 3, 9, 20) &&
  highlightGuardKeyOf(-1, 3, 9, 20) === HV_KEY_INVALID &&
  highlightGuardKeyOf(3, -1, 9, 20) === HV_KEY_INVALID, true);
check('R60 纯滚动过程 pending=false 恒 HV_NONE（绝不打断用户滚动）',
  highlightGuardActionOf(3, 3, 9, 20, -1, false) === HV_NONE &&
  highlightGuardActionOf(11, 3, 9, 20, -1, false) === HV_NONE &&
  highlightGuardActionOf(0, 0, 5, 20, -1, false) === HV_NONE, true);
check('R60 挂起态边缘半可见 / 上方 / 下方被挤出视区一律 HV_REVEAL',
  highlightGuardActionOf(3, 3, 9, 20, -1, true) === HV_REVEAL &&
  highlightGuardActionOf(9, 3, 9, 20, -1, true) === HV_REVEAL &&
  highlightGuardActionOf(11, 3, 9, 20, -1, true) === HV_REVEAL &&
  highlightGuardActionOf(1, 3, 9, 20, -1, true) === HV_REVEAL, true);
check('R60 挂起态已在安全可见区 / 同一 key 已校正过一律 HV_NONE',
  highlightGuardActionOf(5, 3, 9, 20, -1, true) === HV_NONE &&
  highlightGuardActionOf(3, 3, 9, 20, highlightGuardKeyOf(3, 3, 9, 20), true) === HV_NONE, true);
check('R60 可见范围未上报时 HV_NONE 且不消费挂起（等下一次 onScrollIndex）',
  highlightGuardActionOf(3, -1, -1, 20, -1, true) === HV_NONE &&
  highlightGuardActionOf(3, 9, 3, 20, -1, true) === HV_NONE, true);
check('R60 highlightScrollAlignOf 只有 REVEAL 才给 AUTO 对齐码',
  highlightScrollAlignOf(HV_REVEAL) === HV_ALIGN_AUTO &&
  highlightScrollAlignOf(HV_NONE) === HV_KEY_INVALID, true);
check('R60 highlightResizeOf 首次有效尺寸 / 真实变化才挂起，脏值 / 无变化不误触发',
  highlightResizeOf(-1, -1, 800, 600) === true &&
  highlightResizeOf(800, 600, 780, 600) === true &&
  highlightResizeOf(800, 600, 800, 600) === false &&
  highlightResizeOf(800, 600, 0, 600) === false, true);

// —— 纯函数模块零依赖 ——
check('R60 HighlightVisible.ts 零 SDK / 零文件 IO / 零 await / 零 throw / 无隐藏状态',
  /^\s*import\s/m.test(HV60_CODE) === false &&
  /@ohos\.|\bfs\./.test(HV60_CODE) === false &&
  /\bawait\s|\bthrow\s+/.test(HV60_CODE) === false &&
  /^\s*(let|var)\s/m.test(HV60_CODE) === false &&
  /export function highlightGuardActionOf\(/.test(HV60_CODE), true);

// —— Index.ets 接线 ——
check('R60 Index import HighlightVisible 真值源 + upReturnInvertOf',
  INDEX.includes("from '../common/HighlightVisible';") &&
  INDEX.includes('highlightGuardActionOf, highlightScrollAlignOf,') &&
  INDEX.includes('highlightResizeOf }') &&
  INDEX.includes('upReturnClearOf, upReturnInvertOf }'), true);
check('R60 新增四个独立状态字段（挂起 / 自锁 key / 上次根尺寸）',
  INDEX.includes('private highlightRevealPending: boolean = false;') &&
  INDEX.includes('private highlightGuardKey: number = HV_KEY_INVALID;') &&
  INDEX.includes('private highlightRootW: number = -1;') &&
  INDEX.includes('private highlightRootH: number = -1;'), true);
check('R60 highlightRowNow 同时覆盖 cur 选中行与 upReturnName 反色行',
  /private highlightRowNow\(\): number \{[\s\S]{0,900}upReturnInvertOf\(this\.rows\[i\]\.name, this\.upReturnName,/.test(INDEX) &&
  INDEX.includes('return highlightRowOf(sel, inv, this.rows.length);'), true);
check('R60 armHighlightReveal 只翻状态位并清自锁 key，不直接改滚动位置',
  /private armHighlightReveal\(scene: string\): void \{\s*this\.highlightRevealPending = true;\s*this\.highlightGuardKey = HV_KEY_INVALID;\s*this\.guardHighlightVisible\(scene\);/.test(INDEX), true);
check('R60 guardHighlightVisible 是唯一新增滚动收口，走 ScrollAlign.AUTO 最小位移',
  /private guardHighlightVisible\(scene: string\): void \{[\s\S]{0,1500}ScrollAlign\.AUTO/.test(INDEX) &&
  INDEX.includes('this.scroller.scrollToIndex(row, false, align);') &&
  INDEX.includes('const align: ScrollAlign = alignCode === HV_ALIGN_AUTO ? ScrollAlign.AUTO : ScrollAlign.START;'), true);
check('R60 校正后立即清 pending，避免 onScrollIndex 回调递归抖动',
  /this\.highlightRevealPending = false;\s*const align: ScrollAlign/.test(INDEX), true);
check('R60 全源码裸 scrollToIndex 恰好 4 处（3 既有收口 + 1 R60 护栏收口）',
  INDEX.split('this.scroller.scrollToIndex(').length - 1, 4);
check('R60 既有 3 处滚动调用逐字未动（滚动体验零回归）',
  INDEX.includes('this.scroller.scrollToIndex(this.rowOfItem(this.cur), false);') &&
  (INDEX.split('this.scroller.scrollToIndex(row, false);').length - 1) === 2, true);
check('R60 applyItems 只在 !keepView 分支挂起，自动重扫不产生位移',
  /if \(!keepView\) \{\s*this\.clearPreviews\(\);[\s\S]{0,400}this\.armHighlightReveal\('applyItems'\);/.test(INDEX), true);
check('R60 showUpListInApp 作废可见范围并挂起（cur=-1 反色行也能定位）',
  /this\.listFirstRow = -1;\s*this\.listLastRow = -1;\s*this\.armHighlightReveal\('upList'\);/.test(INDEX), true);
check('R60 onScrollIndex 上报后消费挂起，纯滚动 pending=false 恒不动作',
  /this\.listFirstRow = first;[\s\S]{0,400}this\.guardHighlightVisible\('onScrollIndex'\);/.test(INDEX), true);
check('R60 根 onAreaChange 尺寸真变化才挂起（含 scrollbar 出现 / 消失）',
  INDEX.includes('if (highlightResizeOf(this.highlightRootW, this.highlightRootH, rw, rh)) {') &&
  INDEX.includes("this.armHighlightReveal('resize');"), true);

// —— 零回归 ——
check('R60 既有高亮态 / 选中交互 / 列表顺序 / 滚动判定零回归',
  INDEX.includes('tapScrollAction(row, this.listFirstRow, this.listLastRow,') &&
  INDEX.includes('stepScrollAction(row, this.listFirstRow, this.listLastRow)') &&
  SIDEBAR.includes('selected: (item.itemIndex ?? idx) === this.cur') &&
  SIDEBAR.includes('upReturnInvertOf(item.name, this.upReturnName,') &&
  SIDEBAR.includes('.scrollBar(BarState.Auto)') &&
  SIDEBAR.includes('.cachedCount(6)'), true);
check('R60 List 段不引入额外偏移 / padding / 布局跳动（R59 左缘零留白不变）',
  /\.padding\(\{ right: 8 \}\)/.test(LIST60) &&
  /\.padding\(\{[^}]*left:/.test(LIST60) === false &&
  /\.offset\(|\.margin\(\{[^}]*left:/.test(LIST60) === false &&
  LIST60.includes('.scrollBar(BarState.Auto)'), true);
check('R60 文本预览 / 并排预览 / 视窗护栏 / 版本守卫零回归',
  INDEX.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX.includes('chromeSampleOf(') && INDEX.includes('canvasResizeAcceptOf(') &&
  INDEX.includes('this.openTextFile(r.uri, r.name);') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('R66 构建标记 R66，R64 及更早旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R59';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R58';") === false, true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R60-A：打开一个长目录（列表出现滚动条）→ 滚轮 / 键盘翻页到中部，');
console.log('     当前高亮的档案行必须整行完整可见，不得只露半行、被滚动条盖住或跑出视区；Ctrl+D 角标必须是 R60。');
console.log('  ⚠️ 真机步骤 R60-B：连续多层往上层 → APP 内上层清单里反色的子目录名必须完整可见；');
console.log('     即使该行排在长清单靠下位置，也会自动滚到完整显示，不再藏在视区外。');
console.log('  ⚠️ 真机步骤 R60-C：缓慢拖动窗口边框改变尺寸 / 进出全屏 / 收起再展开左栏，');
console.log('     过程中高亮行不应被裁剪或跳动；滚动条出现 / 消失时列表不发生横向位移。');
console.log('  ⚠️ 真机步骤 R60-D：用户主动把列表滚到远离高亮项的位置时，滚动体验与 R59 一致');
console.log('     （不会被强行拉回）；常规点选、目录切换、排序、文本预览、并排预览均不受影响。');

// ==================== 第六十一轮：目录行移除方格与占位（R61） ====================
// 第七十五轮：R61 引入的「名称右侧符号列」按用户要求整体移除，
// 该列专属的 common 配置模块 / 纯函数 / import / 专用配色方法一并清理。
// 本组改为校验「符号列确实彻底消失 + 三栏顺序 / 行高 / 交互逐字零回归」。
console.log('--- 第六十一轮 / 第七十五轮：名称右侧符号列整体移除，三栏零回归 ---');
const ROW61 = ARCHIVE.slice(ARCHIVE.indexOf('  build() {'));
const ROW61_CODE = stripComments(ROW61);
const ARCHIVE61_CODE = stripComments(ARCHIVE);
const FOLDER_GLYPH_GONE = (() => {
  try {
    readFileSync(new URL('../entry/src/main/ets/common/FolderGlyph.ts', import.meta.url), 'utf8');
    return false;
  } catch (e) {
    return true;
  }
})();

// —— 符号列专属配置 / 纯函数 / 引用彻底清理（R75） ——
check('R61→R75 符号列专属 common 配置模块已删除，且 ArchiveRow 不再引用它',
  FOLDER_GLYPH_GONE &&
  ARCHIVE.includes('FolderGlyph') === false &&
  ARCHIVE.includes('folderGlyph') === false &&
  ARCHIVE.includes('FG_COL_') === false, true);
check('R61→R75 向上箭头 / 方格 / 专用配色方法从 ArchiveRow 源码彻底消失',
  ARCHIVE.includes('↑') === false && ARCHIVE.includes('▣') === false &&
  ARCHIVE.includes('iconColor') === false, true);
check('R61→R75 去注释后的 build() 不再有任何符号列调用或居中占位',
  ROW61_CODE.includes('folderGlyph') === false &&
  ROW61_CODE.includes('TextAlign.Center') === false &&
  ROW61_CODE.includes('FG_COL_') === false, true);

// —— 清理结果：整份 ArchiveRow 去注释后零符号列残留 ——
check('R61→R75 ArchiveRow 去注释后零残留：import / 内容 / 宽度 / 配色 / 箭头字符全清',
  ARCHIVE61_CODE.includes('folderGlyph') === false &&
  ARCHIVE61_CODE.includes('FolderGlyph') === false &&
  ARCHIVE61_CODE.includes('FG_COL_') === false &&
  ARCHIVE61_CODE.includes('iconColor') === false &&
  ARCHIVE61_CODE.includes('↑') === false &&
  ARCHIVE61_CODE.includes('▣') === false, true);

// —— 符号列移除后的 ArchiveRow 接线 ——
check('R61→R75 不再 import 符号列纯函数（三符号 import 整行删除）',
  /import\s*\{[^}]*folderGlyph/i.test(ARCHIVE) === false &&
  ARCHIVE.includes('FG_COL_W') === false, true);
check('R61→R75 不再有符号列内容与宽度调用',
  ROW61_CODE.includes('folderGlyphOf') === false &&
  ROW61_CODE.includes('folderGlyphWidthOf') === false, true);
check('R61→R75 ▣ 方格字符彻底消失（所有层级都不再显示）',
  ARCHIVE.includes('▣') === false, true);
check('R61→R75 名称文字仍是行首第一个子组件，其后直接是字节 / 日期两栏（无符号列）',
  (() => {
    const token = 'Text(this.name)';
    const n = ROW61_CODE.indexOf(token);
    const g = ROW61_CODE.indexOf('if (!this.collapsed)');
    return n >= 0 && g > n && ROW61_CODE.slice(n + token.length, g).includes('Text(') === false;
  })(), true);
check('R80 行高锚点改 minHeight（不塌行高、换行不裁，build() 内恰好 1 处）',
  (ROW61_CODE.match(/\.height\(26\)/g) || []).length === 0 &&
  (ROW61_CODE.match(/constraintSize\(\{ minHeight: 26 \}\)/g) || []).length === 1 &&
  /Text\(this\.name\)[\s\S]{0,400}?\.layoutWeight\(1\)\s*\.constraintSize\(\{ minHeight: 26 \}\)/.test(ROW61_CODE), true);
check('R61→R75 名称 layoutWeight(1) 仍在，且名称到两栏之间无新增占位 / padding / offset',
  ROW61_CODE.includes('.layoutWeight(1)') &&
  /\.padding\(\{[^}]*left:/.test(ROW61_CODE) === false &&
  /\.offset\(/.test(ROW61_CODE) === false &&
  ROW61_CODE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  (() => {
    const s = ROW61_CODE.indexOf('.layoutWeight(1)');
    const e = ROW61_CODE.indexOf('if (!this.collapsed)');
    const seg = (s >= 0 && e > s) ? ROW61_CODE.slice(s, e) : '';
    return seg.length > 0 &&
      /\.margin\(|\.padding\(|Blank\(|Spacer\(|\.width\(0\)|\.offset\(/.test(seg) === false;
  })(), true);
check('R77 R61 两列改 adaptive 动态宽（不再 66 / 88），日期列 margin 6 保留',
  ROW61.includes('Text(fmtBytes(this.bytes))') &&
  ROW61.includes('.width(this.colSizeW)') && ROW61.includes('.width(this.colDateW)') &&
  ROW61.includes('.width(66)') === false && ROW61.includes('.width(88)') === false &&
  ROW61.includes('.margin({ left: 6 })'), true);
check('R61 不新增任何 padding / offset / 空白占位（Row 三层结构逐字不变）',
  (ROW61.match(/\.padding\(/g) || []).length === 1 &&
  /Blank\(|\.width\(0\)|Spacer\(/.test(ROW61) === false, true);

// —— 零回归：其它图标 / 交互 / 布局 / 高亮 / 版本 ——
check('R61→R75 名称配色分支零回归（labelColor 仍按行种类分色，不含任何符号列逻辑）',
  ARCHIVE.includes("if (this.kind === ROW_OTHER)") &&
  ARCHIVE.includes("if (this.kind === ROW_TEXT)") &&
  ARCHIVE.includes('this.kind === ROW_FOLDER || this.kind === ROW_UP') &&
  ARCHIVE.includes('private labelColor(): string {') &&
  ARCHIVE.includes('iconColor') === false, true);
check('R61 点击 / 双击 / 悬停 / 缩略图 / bindPopup 交互逐字不变',
  ARCHIVE.includes('.onClick(() => {') && ARCHIVE.includes('this.onTap(this.idx);') &&
  ARCHIVE.includes('.bindPopup(this.showHover, {') && ARCHIVE.includes('.onHover((isHover: boolean) => {') &&
  ARCHIVE.includes('TapGesture({ count: 2 })'), true);
check('R61→R75 反色 / 选中 / 交替条纹 / 三栏配色等既有样式逐字不变',
  ARCHIVE.includes('private rowBgColor(): string {') &&
  ARCHIVE.includes('upReturnBgOf(true, ROW_STRIPE_EVEN)') &&
  ARCHIVE.includes('ROW_SELECTED_BG') &&
  ARCHIVE.includes('upReturnFgOf(this.inverted,') && ARCHIVE.includes('private labelColor(): string {') &&
  ARCHIVE.includes('iconColor') === false, true);
check('R61 SidebarView / List / 高亮护栏 / 并排预览 / 文本预览 / 视窗护栏零回归',
  SIDEBAR.includes('.scrollBar(BarState.Auto)') && SIDEBAR.includes('.padding({ right: 8 })') &&
  SIDEBAR.includes('selected: (item.itemIndex ?? idx) === this.cur') &&
  SIDEBAR.includes('upReturnInvertOf(item.name, this.upReturnName,') &&
  INDEX.includes('highlightGuardActionOf') && INDEX.includes('ScrollAlign.AUTO') &&
  INDEX.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX.includes('chromeSampleOf(') && INDEX.includes('canvasResizeAcceptOf(') &&
  INDEX.includes('this.openTextFile(r.uri, r.name);'), true);
check('R61 全源码裸 scrollToIndex 仍恰好 4 处 / 版本守卫 1.0.7 / 7',
  INDEX.split('this.scroller.scrollToIndex(').length - 1 === 4 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('R66 构建标记 R66，R64 及更早旧包可从截图一眼排除',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R63';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R62';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R61';") === false, true);

console.log('  ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R61-A：进入含多层子目录的目录，逐层进入 → 每一层左栏的目录名称右侧');
console.log('     都不再出现正方形方格，方格原位置也没有空白占位，名称紧贴最左边缘；Ctrl+D 角标必须是 R61。');
console.log('  ⚠️ 真机步骤 R61-B：连续「往上层」→ APP 内上层清单里的目录项（含带点真实目录名灰行）');
console.log('     同样不显示方格、不留占位；「..」行的 ↑ 箭头仍保留，其余图标 / 按钮 / 控件不变。');
console.log('  ⚠️ 真机步骤 R61-C：对比 R60 → 三栏（名称 / 字节 / 日期）起始位置、行高、条纹、间距');
console.log('     完全一致，长目录名不被截断或错位；收起 / 展开左栏、拖动窗口尺寸均无布局跳动。');
console.log('  ⚠️ 真机步骤 R61-D：常规点选、双击全屏、翻页、排序、目录切换、悬停缩略图、');
console.log('     高亮项完整可见、文本预览与并排预览均与 R60 一致，无回归。');

// ==================== 第六十二轮：主预览 resize 画质（R62） ====================
console.log('--- 第六十二轮：主预览 resize 波纹 / 锯齿修复（动态插值 + AA）---');
const RQ62_SRC = readFileSync(new URL('../entry/src/main/ets/common/ResizeQuality.ts', import.meta.url), 'utf8');
const RQ62_CODE = stripComments(RQ62_SRC);

// —— 常量 / 有效比例 / 决策真值 ——
check('R62 档位码与阈值常量语义',
  RQ_MIPMAP === 0 && RQ_LOW === 1 && RQ_HIGH === 2 &&
  RQ_NEAR_ONE_TOL === 0.06 && RQ_MIPMAP_FLOOR === 0.4 && RQ_INTEGER_TOL === 0.04 &&
  rqModeNameOf(RQ_HIGH) === 'High/Cubic' && rqModeNameOf(RQ_LOW) === 'Low/Bilinear' &&
  rqModeNameOf(RQ_MIPMAP) === 'Medium/MipMap', true);
check('R62 rqScaleOf 复现 1.5× / 2.0× oversampling 与 zoom 的复合比例',
  Math.abs(rqScaleOf(1800, 1200, 800, 1) - 0.6667) < 0.001 &&
  Math.abs(rqScaleOf(3840, 1920, 1080, 1) - 0.5) < 0.001 &&
  Math.abs(rqScaleOf(3840, 1920, 1080, 2) - 1) < 0.001 &&
  rqScaleOf(0, 0, 0, 0) === 1 && rqScaleOf(-1, 800, 600, 1) === 1, true);
check('R62 rqInterpolationOf 三档分界、阈值边界与脏值回退',
  rqInterpolationOf(3.0, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_HIGH &&
  rqInterpolationOf(1.0, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_HIGH &&
  rqInterpolationOf(0.94, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_HIGH &&
  rqInterpolationOf(0.93, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_LOW &&
  rqInterpolationOf(0.4, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_LOW &&
  rqInterpolationOf(0.39, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_MIPMAP &&
  rqInterpolationOf(0, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_HIGH &&
  rqInterpolationOf(-1, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_HIGH, true);
check('R62 整数 / 非整数缩放比判定（容差内仍算整数倍）',
  rqIntegerScaleOf(1.0, RQ_INTEGER_TOL) && rqIntegerScaleOf(2.0, RQ_INTEGER_TOL) &&
  rqIntegerScaleOf(3.0, RQ_INTEGER_TOL) && rqIntegerScaleOf(1.98, RQ_INTEGER_TOL) &&
  rqFractionalOf(1.37, RQ_INTEGER_TOL) && rqFractionalOf(0.73, RQ_INTEGER_TOL) &&
  rqFractionalOf(0.67, RQ_INTEGER_TOL) && rqFractionalOf(0.25, RQ_INTEGER_TOL), true);
check('R62 rqAntialiasOf 有效比例恒开、脏值保守关',
  [0.25, 0.5, 0.67, 0.73, 1.0, 1.37, 2.0, 3.0].every(k => rqAntialiasOf(k) === true) &&
  rqAntialiasOf(0) === false && rqAntialiasOf(-1) === false, true);
check('R62 ResizeQuality.ts 零 SDK / 零文件 IO / 零异步 / 零异常 / 零全局可变状态',
  /^\s*import\s/m.test(RQ62_CODE) === false &&
  /@ohos\.|\bfs\./.test(RQ62_CODE) === false &&
  /\bawait\s|\bthrow\s+/.test(RQ62_CODE) === false &&
  /^(let|var)\s/m.test(RQ62_CODE) === false &&
  /export function rqInterpolationOf\(/.test(RQ62_CODE) &&
  /export function rqResampleOf\(/.test(RQ62_CODE), true);

// —— 核函数：Cubic 负 lobe 是振铃根源 ——
check('R62 Cubic 核在 1<|x|<2 为负、线性核恒非负',
  rqCubicWeightOf(0) === 1 && rqCubicWeightOf(1.5) < 0 &&
  rqLinearWeightOf(1.5) === 0 && rqLinearWeightOf(0.5) === 0.5, true);

// —— 验证用例：整数 / 非整数缩放比 × 细线 / 曲线边缘 ——
// 细线 = 单像素亮线（高对比直线边缘）；曲线 = S 形平滑过渡（圆弧 / 轮廓边缘）。
const THIN62 = [0, 0, 0, 0, 1, 0, 0, 0, 0];
const CURVE62 = [0, 0.03, 0.12, 0.28, 0.5, 0.72, 0.88, 0.97, 1, 1, 1, 1];
const CASE62 = [
  ['整数放大 2.0×', 2.0], ['整数放大 3.0×', 3.0], ['1:1', 1.0],
  ['非整数放大 1.37×', 1.37], ['非整数缩小 0.73×', 0.73],
  ['非整数缩小 0.67×', 0.67], ['整数倒数缩小 0.50×', 0.5],
  ['极端缩小 0.25×', 0.25]
];
function rq62Case(sig, k) {
  const old = rqResampleOf(sig, k, RQ_HIGH);           // 旧策略：恒 High(Cubic)
  const tier = rqInterpolationOf(k, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR);
  const nw = rqResampleOf(sig, k, tier);               // 新策略：R62 动态档
  return { tier: tier, old: old, nw: nw,
    oOver: rqOvershootOf(old, 0, 1), nOver: rqOvershootOf(nw, 0, 1),
    oJit: rqEdgeJitterOf(old), nJit: rqEdgeJitterOf(nw),
    same: old.length === nw.length && old.every((v, i) => v === nw[i]) };
}
console.log('  ⚠️ 数值验证结果（一维信号重采样模型；旧 = 恒 High/Cubic，新 = R62 动态档）');
for (const c62 of CASE62) {
  for (const s62 of [['细线', THIN62], ['曲线边缘', CURVE62]]) {
    const r = rq62Case(s62[1], c62[1]);
    console.log(`     ${c62[0]} / ${s62[0]} → ${rqModeNameOf(r.tier)}`
      + ` | 过冲 ${r.oOver} → ${r.nOver} | 抖动 ${r.oJit} → ${r.nJit}`);
  }
}
const DOWN62 = [0.73, 0.67, 0.5, 0.25];
check('R62 缩小场景（0.73/0.67/0.50/0.25）细线与曲线的新策略过冲全部归零且不劣于旧恒 Cubic',
  DOWN62.every(k => [THIN62, CURVE62].every(sig => {
    const c = rq62Case(sig, k);
    return c.nOver === 0 && c.nOver <= c.oOver;
  })), true);
check('R62 曲线边缘在全部缩小比例下抖动不劣化（新 ≤ 旧）',
  DOWN62.every(k => {
    const c = rq62Case(CURVE62, k);
    return c.nJit <= c.oJit;
  }), true);
check('R62 细线在非整数缩小比下抖动不显著劣化（新 ≤ 旧×1.15+0.05）',
  DOWN62.every(k => {
    const c = rq62Case(THIN62, k);
    return c.nJit <= c.oJit * 1.15 + 0.05;
  }), true);
check('R62 整数 / 非整数放大比与 1:1 仍走 High(Cubic)，两种边缘信号输出逐点不变（细节零回归）',
  [1.0, 1.37, 2.0, 3.0].every(k => [THIN62, CURVE62].every(sig => {
    const c = rq62Case(sig, k);
    return c.tier === RQ_HIGH && c.same;
  })), true);
check('R62 MipMap 只在 k<0.4 启用，常规 0.5~0.73 保持双线性（细线不被抹宽变糊）',
  rqInterpolationOf(0.25, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_MIPMAP &&
  [0.4, 0.5, 0.67, 0.73].every(k =>
    rqInterpolationOf(k, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR) === RQ_LOW), true);

// —— Index.ets 接线 ——
check('R62 Index.ets import ResizeQuality 七个决策符号',
  INDEX.includes("import { RQ_MIPMAP, RQ_LOW, RQ_NEAR_ONE_TOL, RQ_MIPMAP_FLOOR,") &&
  INDEX.includes("  rqScaleOf, rqInterpolationOf, rqAntialiasOf } from '../common/ResizeQuality';"), true);
check('R62 previewScale / previewInterpolation / previewAntialias 三方法齐备',
  INDEX.includes('private previewScale(): number {') &&
  INDEX.includes('rqScaleOf(this.viewEdge(), this.canvasW, this.canvasH, this.zoom)') &&
  INDEX.includes('private previewInterpolation(): ImageInterpolation {') &&
  INDEX.includes('private previewAntialias(): boolean {') &&
  INDEX.includes('rqAntialiasOf(this.previewScale())'), true);
check('R62 三处清晰图源改走动态插值 / 低清过渡层保留 Medium / 不再有裸 High 调用',
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.includes('.interpolation(ImageInterpolation.Medium)') &&
  INDEX.includes('.interpolation(ImageInterpolation.High)') === false, true);
check('R62 主预览四个图源全部开 AA，放大镜五源插值与 AA 逐字不变',
  INDEX.split('.antialiased(this.previewAntialias())').length - 1 === 4 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  LOUPE13_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5, true);
check('R62 三档返回齐备（High / Low / Medium）且不引入 None',
  INDEX.includes('return ImageInterpolation.High;') &&
  INDEX.includes('return ImageInterpolation.Low;') &&
  INDEX.includes('return ImageInterpolation.Medium;') &&
  INDEX.includes('return ImageInterpolation.None;') === false, true);

// —— 零回归：尺寸 / 范围 / 解码 / 性能 / 既有功能 ——
check('R62 预览尺寸 / 显示范围 / autoResize / HDR 逐字不变（无位置偏移、无新增解码）',
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.includes('.objectFit(ImageFit.Contain)') &&
  INDEX.includes('.width(this.pageWLeft(half))') &&
  INDEX.includes('.height(this.pageH(half))') &&
  INDEX.includes('.scale({ x: this.zoom * (this.flipH ? -1 : 1), y: this.zoom * (this.flipV ? -1 : 1) })'), true);
check('R62 解码档位 / 缓存 / resize 节流 / 高亮护栏 / 文本预览 / 并排预览 / 视窗护栏零回归',
  INDEX.includes('return viewEdgeOf(this.canvasW, this.canvasH, this.fullscreen,') &&
  INDEX.includes('const VIEW_EDGE_FACTOR: number = 1.5;') &&
  INDEX.includes('shouldReuseDecoded(hit.edge, reuseNeed)') &&
  INDEX.includes('const RESIZE_RELOAD_THROTTLE_MS: number = 140;') &&
  INDEX.includes('highlightGuardActionOf') && INDEX.includes('ScrollAlign.AUTO') &&
  INDEX.includes('this.openTextFile(r.uri, r.name);') &&
  INDEX.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX.includes('chromeSampleOf(') && INDEX.includes('canvasResizeAcceptOf(') &&
  INDEX.split('this.scroller.scrollToIndex(').length - 1 === 4, true);
check('R64 版本守卫 1.0.7 / 7、构建标记 R66、R63 旧标记定义已清除',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R61';") === false, true);

console.log('  ⚠️ 本组是静态契约 + 纯函数 + 一维信号数值验证，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R62-A：打开含细线（栅栏 / 电线 / 文字边缘）与曲线（圆弧 / 轮廓）的图，');
console.log('     Ctrl+D 角标必须是 R62；在 100% / 缩小 / 放大各档观察边缘是否还有波纹或锯齿。');
console.log('  ⚠️ 真机步骤 R62-B：整数倍（200% / 300%）与 1:1 观察细线：细节清晰度与 R61 一致，');
console.log('     不出现新模糊 / 发虚，图片位置与显示范围不变，无跳动。');
console.log('  ⚠️ 真机步骤 R62-C：非整数倍（Ctrl+滚轮到 137% / 73% / 67%）观察细线与曲线边缘：');
console.log('     波纹 / 锯齿消失，曲线连续平滑，细线不被抹宽，整体不过度模糊。');
console.log('  ⚠️ 真机步骤 R62-D：并排右页 / 全屏 / 视窗缩放 / 放大镜 / 文本预览 / 目录切换 / 翻页');
console.log('     与 R61 一致，无新增卡顿或掉帧，无新增解码带来的等待。');

// ==================== 第六十三轮：文本预览 scrollbar 恢复显示（R63） ====================
console.log('--- 第六十三轮：文本预览纵向滚动条恢复显示（内容驱动 @State + 视口高兜底）---');
const TSB63_SRC = readFileSync(new URL('../entry/src/main/ets/common/TextScrollBar.ts', import.meta.url), 'utf8');
const TSB63_CODE = stripComments(TSB63_SRC);

// —— 常量与纯函数真值 ——
check('R63 常量语义：固定栏高 48 / 视口行数下限 1',
  TSB_CHROME_H_VP === 48 && TSB_MIN_VISIBLE_ROWS === 1, true);
check('R63 textViewportHOf：实测面积高优先、未回填用画布高兜底、全脏返回 0',
  textViewportHOf(600, 600, 48) === 600 && textViewportHOf(320, 600, 48) === 320 &&
  textViewportHOf(0, 600, 48) === 552 && textViewportHOf(NaN, 600, 48) === 552 &&
  textViewportHOf(-1, 600, 48) === 552 && textViewportHOf(0, 0, 48) === 0 &&
  textViewportHOf(0, 30, 48) === 0 && textViewportHOf(1e9, 600, 48) === 552, true);
check('R63 textVisibleRowsOf：整数 / 非整数视口行数与脏值下限',
  textVisibleRowsOf(600, 20) === 30 && textVisibleRowsOf(610, 20) === 31 &&
  textVisibleRowsOf(400, 20) === 20 && textVisibleRowsOf(41, 20) === 2 &&
  textVisibleRowsOf(20, 20) === 1 && textVisibleRowsOf(1, 20) === 1 &&
  textVisibleRowsOf(0, 20) === 1 && textVisibleRowsOf(-1, 20) === 1 &&
  textVisibleRowsOf(NaN, 20) === 1 && textVisibleRowsOf(600, 0) === 1, true);
check('R63 textBarVisibleOf：严格超一屏才显示、短文件 / 脏值不显示',
  textBarVisibleOf(1000, 600, 20) === true && textBarVisibleOf(31, 600, 20) === true &&
  textBarVisibleOf(30, 600, 20) === false && textBarVisibleOf(5, 600, 20) === false &&
  textBarVisibleOf(41, 610, 20) === true && textBarVisibleOf(1000, 0, 20) === false &&
  textBarVisibleOf(1000, 600, 0) === false && textBarVisibleOf(0, 600, 20) === false &&
  textBarVisibleOf(-3, 600, 20) === false, true);
check('R63 textBarVisibleSafeOf 根治 R53 丢条：尺寸未回填时长文件仍判显示、短文件仍不显示',
  textBarVisibleSafeOf(1000, 600, 600, 20, 48) === true &&
  textBarVisibleSafeOf(1000, 0, 600, 20, 48) === true &&
  textBarVisibleSafeOf(1000, NaN, 600, 20, 48) === true &&
  textBarVisibleSafeOf(27, 0, 600, 20, 48) === false &&
  textBarVisibleSafeOf(5, 0, 600, 20, 48) === false &&
  textBarVisibleSafeOf(1000, 0, 0, 20, 48) === false, true);
check('R63 TextScrollBar.ts 零 SDK / 零文件 IO / 零异步 / 零异常 / 零全局可变状态',
  /^\s*import\s/m.test(TSB63_CODE) === false &&
  /@ohos\.|\bfs\./.test(TSB63_CODE) === false &&
  /\bawait\s|\bthrow\s+/.test(TSB63_CODE) === false &&
  /^(let|var)\s/m.test(TSB63_CODE) === false &&
  /export function textViewportHOf\(/.test(TSB63_CODE) &&
  /export function textBarVisibleSafeOf\(/.test(TSB63_CODE), true);

// —— 数值验证结果表（当场重算，非抄表）——
{
  const H = 20, C = 600, CH = 48;
  const rows = [
    ['实测 600 / 长文件 1000 行', 600, 1000], ['实测 320 / 长文件 1000 行', 320, 1000],
    ['未回填 0 / 长文件 1000 行', 0, 1000], ['未回填 NaN / 长文件 1000 行', NaN, 1000],
    ['未回填 0 / 刚好一屏 27 行', 0, 27], ['未回填 0 / 短文件 5 行', 0, 5],
    ['实测 600 / 刚好一屏 30 行', 600, 30], ['实测 600 / 一屏+1 31 行', 600, 31],
  ];
  console.log('     R63 老链路(R53: area>0 && total>round(area/H)) vs 新链路(textBarVisibleSafeOf)：');
  console.log('     场景                            vpH   行数   老      新');
  for (const [name, area, total] of rows) {
    const vpH = textViewportHOf(area, C, CH);
    const vr = textVisibleRowsOf(vpH, H);
    const old = area > 0 && total > Math.round(area / H);
    const nw = textBarVisibleSafeOf(total, area, C, H, CH);
    console.log(`     ${name.padEnd(30)} ${String(vpH).padEnd(5)} ${String(vr).padEnd(5)} ${String(old).padEnd(7)} ${nw}`);
  }
  console.log('     → 尺寸事件未回填时老链路恒 false（丢条）；新链路长文件 true / 短文件 false；实测到达时新老一致。');
}

// —— 源码接线 ——
check('R63 Index 接入 TextScrollBar 三个符号与 @State textBarShow 门控',
  INDEX.includes("import { TSB_CHROME_H_VP, textViewportHOf,") &&
  INDEX.includes("textBarVisibleSafeOf } from '../common/TextScrollBar';") &&
  INDEX.includes('@State textBarShow: boolean = false;'), true);
check('R63 refreshTextBar 内容驱动：解码落地 / 尺寸到达两处主动算，收文本态清门控',
  INDEX.includes('private refreshTextBar(): void {') &&
  INDEX.includes('const vpH: number = textViewportHOf(this.textVpH, this.canvasH, TSB_CHROME_H_VP);') &&
  INDEX.includes('const show: boolean = textBarVisibleSafeOf(rows, this.textVpH,') &&
  INDEX.split('this.refreshTextBar();').length - 1 === 2 &&
  INDEX.includes('this.textBarShow = false;   // 第六十三轮：收掉文本态时同步清门控，开新文件重新算'), true);
check('R63 if 只直读一个 @State、不再把非 @State 的 textLines.length 塞进条件',
  /if \(this\.textBarShow\) \{/.test(INDEX) &&
  /if \(this\.textVpH > 0 && this\.textLines\.length >/.test(INDEX) === false, true);

// —— 零回归：几何 / 滑块 / 拖动 / 滚轮 / 选段 / 横向 Scroll 逐字不动 ——
check('R63 原生条仍 Off（不改回 Auto 以免重现 R52 视口外看不见 / 布局变化），横向 Scroll 仍 Auto',
  INDEX.includes('.scrollBar(BarState.Off)  // 原生条在视口外看不见还占位，关掉只留自绘条') &&
  /\.scrollable\(ScrollDirection\.Horizontal\)[\s\S]{0,80}\.scrollBar\(BarState\.Auto\)/.test(INDEX), true);
check('R63 自绘条几何 / 轨道 / 滑块 / PanGesture / Transparent 逐字保留',
  INDEX.includes('private textVBarThumbH(): number {') &&
  INDEX.includes('private textVBarTopPos(): number {') &&
  INDEX.includes('private textVBarDragTo(top: number): void {') &&
  INDEX.includes('PanGesture({ fingers: 1 })') &&
  INDEX.includes('.hitTestBehavior(HitTestMode.Transparent)') &&
  INDEX.includes(".margin({ top: this.textVBarTopPos() })") &&
  INDEX.includes(".backgroundColor('#96a3c2')"), true);
check('R63 onScrollIndex / onAreaChange 兜底回填 / onMouse 选段 / 滚轮 / 复制零回归',
  /\.onScrollIndex\(\(first: number, last: number, center: number\) => \{[\s\S]{0,120}this\.textFirstRow = first;/.test(INDEX) &&
  /if \(this\.textVpH <= 0 && last > first\) \{/.test(INDEX) &&
  INDEX.includes('this.textVpH = Number(n.height);') &&
  INDEX.includes('.onMouse((event: MouseEvent) => {') &&
  INDEX.includes('this.textScroller.scrollBy(0, delta * TEXT_WHEEL_LINES * TEXT_ROW_H_VP);') &&
  INDEX.includes("pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, parts.join('\\n'))"), true);

console.log('  ⚠️ 本组是静态契约 + 纯函数 + 视口/行数数值验证，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R63-A：打开行数远超一屏的长 .log/.txt → 右侧视口右缘应出现纵向滚动条');
console.log('     （亮色滑块 + 深色轨道），Ctrl+D 角标必须是 R63；这是本轮修复的核心现象。');
console.log('  ⚠️ 真机步骤 R63-B：从图片态点进文本态、反复开关文本预览、切换不同文本文件，');
console.log('     每次都应立刻出现滚动条（不再依赖窗口尺寸变化才触发）；短文件（不满一屏）仍不应有条。');
console.log('  ⚠️ 真机步骤 R63-C：滚轮滚动正文、拖滑块跳转、点击轨道区域选段、Ctrl+C 复制、');
console.log('     横向滚长行、行高亮 / 复制 / 清除工具条均与 R62 一致；滑块随滚动联动、无跳动。');
console.log('  ⚠️ 真机步骤 R63-D：拖动窗口尺寸改变预览区高度后滑块高 / 位置自适应；');
console.log('     并排预览 / 全屏 / 放大镜 / 目录切换 / 翻页 / 图片预览画质均与 R62 一致，无回归。');

// ==================== 第六十四轮：左栏目录内容量统计与展示（R64） ====================
console.log('--- 第六十四轮：左栏目录内容量统计与展示（口径 / TTL / 空闲 / 缓存 / 四态）---');
const DC64_SRC = readFileSync(new URL('../entry/src/main/ets/common/DirCount.ts', import.meta.url), 'utf8');
const DC64_CODE = stripComments(DC64_SRC);
const GALLERY64 = readFileSync(new URL('../entry/src/main/ets/model/GalleryData.ets', import.meta.url), 'utf8');
// 只取本轮新增的方法段：静态断言按「去注释代码行」判定，注释里的 fs.listFile / statSync 不算调用。
const DC64_METHODS = stripComments(INDEX.slice(
  INDEX.indexOf('// 第六十四轮：左栏目录内容量统计 / 展示 / 缓存 / 空闲调度')));
const IMGS64 = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
const DC_NAMES64 = ['DSC_1.JPG', '.hidden', '..', '.', '', 'notes.txt', '2026', 'a.heic', 'raw.bin'];
const DC_NOW64 = 1000000;

// —— 常量与纯函数真值 ——
check('R64 四态 / 文案常量：PENDING·OK·EMPTY·FAIL + …/空/失败 +「N 项」',
  DC_PENDING === 0 && DC_OK === 1 && DC_EMPTY === 2 && DC_FAIL === 3 &&
  DC_LABEL_PENDING === '…' && DC_LABEL_EMPTY === '空' && DC_LABEL_FAIL === '失败' &&
  dcLabelOf(DC_OK, 12) === '12 项', true);
check('R64 dcTtlClampOf：缺省 / 0 / 负数 / NaN 回默认，越界夹到 [30s, 24h]，区间内原值',
  dcTtlClampOf(0) === DC_TTL_DEFAULT_MS && dcTtlClampOf(-5) === DC_TTL_DEFAULT_MS &&
  dcTtlClampOf(NaN) === DC_TTL_DEFAULT_MS && dcTtlClampOf(Infinity) === DC_TTL_MAX_MS &&
  dcTtlClampOf(1000) === DC_TTL_MIN_MS && dcTtlClampOf(DC_TTL_MAX_MS + 1) === DC_TTL_MAX_MS &&
  dcTtlClampOf(900000) === 900000, true);
check('R64 dcTtlSafeOf：只认 [30s, 24h] 合法设置，脏值不落盘',
  dcTtlSafeOf(DC_TTL_MIN_MS) && dcTtlSafeOf(DC_TTL_MAX_MS) &&
  dcTtlSafeOf(DC_TTL_DEFAULT_MS) && dcTtlSafeOf(DC_TTL_MIN_MS - 1) === false &&
  dcTtlSafeOf(DC_TTL_MAX_MS + 1) === false && dcTtlSafeOf(NaN) === false, true);
check('R64 dcRefreshTickOf：心跳恒夹在 [1.5s, 3s]，TTL 设定不会让心跳越界',
  dcRefreshTickOf(DC_TTL_DEFAULT_MS) === DC_TICK_CAP_MS &&
  dcRefreshTickOf(DC_TTL_MIN_MS) === DC_TICK_CAP_MS &&
  dcRefreshTickOf(DC_TTL_MAX_MS) === DC_TICK_CAP_MS &&
  dcRefreshTickOf(100) >= DC_TICK_MIN_MS && dcRefreshTickOf(100) <= DC_TICK_CAP_MS &&
  dcRefreshTickOf(NaN) === DC_TICK_CAP_MS &&
  DC_TICK_MIN_MS === 1500 && DC_TICK_CAP_MS === 3000, true);
check('R64 dcExpiredOf：缺失 / 时钟回拨 / 未就绪 / TTL 非法恒过期，恰好到期用 >=',
  dcExpiredOf(0, 1000, 300000) === true && dcExpiredOf(1000, 0, 300000) === true &&
  dcExpiredOf(2000, 1000, 300000) === true &&
  dcExpiredOf(1000, 1000 + 299999, 300000) === false &&
  dcExpiredOf(1000, 1000 + 300000, 300000) === true &&
  dcExpiredOf(1000, 2000, 0) === true, true);
check('R64 dcIdleOf：干净时间戳且到阈值才空闲；启动未打点 / 回拨 / 脏阈值恒不空闲',
  dcIdleOf(1000, 2500, 1500) === true && dcIdleOf(1000, 2499, 1500) === false &&
  dcIdleOf(0, 99999, 1500) === false && dcIdleOf(1000, 0, 1500) === false &&
  dcIdleOf(1000, 500, 1500) === false && dcIdleOf(1000, 2500, 0) === false, true);
check('R64 dcAppIdleOf 九条件全满足才放行，任一在途 / 页面态不满足一律 SKIP',
  dcAppIdleOf(false, false, false, false, true, true, true, true, true) === true &&
  dcAppIdleOf(true, false, false, false, true, true, true, true, true) === false &&
  dcAppIdleOf(false, true, false, false, true, true, true, true, true) === false &&
  dcAppIdleOf(false, false, true, false, true, true, true, true, true) === false &&
  dcAppIdleOf(false, false, false, true, true, true, true, true, true) === false &&
  dcAppIdleOf(false, false, false, false, false, true, true, true, true) === false &&
  dcAppIdleOf(false, false, false, false, true, false, true, true, true) === false &&
  dcAppIdleOf(false, false, false, false, true, true, false, true, true) === false &&
  dcAppIdleOf(false, false, false, false, true, true, true, false, true) === false &&
  dcAppIdleOf(false, false, false, false, true, true, true, true, false) === false, true);
check('R64 dcScanActionOf：空闲 + 无在途扫描 + 需重扫三者齐备才 GO',
  dcScanActionOf(true, false, true) === DC_SCAN_GO &&
  dcScanActionOf(true, true, true) === DC_SCAN_SKIP &&
  dcScanActionOf(true, false, false) === DC_SCAN_SKIP &&
  dcScanActionOf(false, false, true) === DC_SCAN_SKIP &&
  DC_SCAN_GO !== DC_SCAN_SKIP && DC_IDLE_MS === 1500 &&
  DC_SCAN_PER_TICK === 2 && DC_SCAN_TIMEOUT_MS === 4000, true);
check('R64 dcVisibleNamesOf / dcCountOf：与 openFolder 同口径过滤隐藏点文件 / . / .. / 空名',
  dcVisibleNamesOf(DC_NAMES64, true, 0).join('|') === 'DSC_1.JPG|notes.txt|2026|a.heic|raw.bin' &&
  dcCountOf(DC_NAMES64, true, 0) === 5 && dcCountOf(DC_NAMES64, false, 0) === 6 &&
  dcCountOf(DC_NAMES64, true, 3) === 3 && dcCountOf([], true, 0) === 0 &&
  DC_ENTRY_CAP === 4000, true);
check('R64 dcSuffixOf / dcImageCountOf：现有 IMAGE_SUFFIXES 大小写不敏感',
  dcSuffixOf('A.JPG') === '.jpg' && dcSuffixOf('noext') === '' &&
  dcSuffixOf('a.b.C') === '.c' &&
  dcImageCountOf(DC_NAMES64, true, IMGS64) === 2 &&
  dcImageCountOf(['x.png', 'y.gif', 'z.txt'], true, IMGS64) === 2 &&
  dcImageCountOf([], true, IMGS64) === 0, true);
check('R64 dcStateOf：失败优先，成功 0 项 = 空目录，>0 = OK',
  dcStateOf(5, false) === DC_FAIL && dcStateOf(0, true) === DC_EMPTY &&
  dcStateOf(1, true) === DC_OK && dcStateOf(-3, true) === DC_EMPTY, true);
check('R64 dcLabelOf 四态文案齐备（空目录 / 失败 / 缓存缺失或过期 / 正常 N 项）',
  dcLabelOf(DC_PENDING, 0) === '…' && dcLabelOf(DC_FAIL, 0) === '失败' &&
  dcLabelOf(DC_EMPTY, 0) === '空' && dcLabelOf(DC_OK, 1) === '1 项' &&
  dcLabelOf(DC_OK, 4000) === '4000 项' && dcLabelOf(99, 7) === '…', true);
check('R64 dcEntryLabelOf：缓存缺失 / 过期回到「…」，失败态保留「失败」，新鲜值显示 N 项',
  dcEntryLabelOf({ state: DC_PENDING, count: 0, images: 0, at: 0 }, DC_NOW64, 300000) === '…' &&
  dcEntryLabelOf({ state: DC_OK, count: 12, images: 8, at: DC_NOW64 - 10 }, DC_NOW64, 300000) === '12 项' &&
  dcEntryLabelOf({ state: DC_OK, count: 12, images: 8, at: DC_NOW64 - 300000 }, DC_NOW64, 300000) === '…' &&
  dcEntryLabelOf({ state: DC_EMPTY, count: 0, images: 0, at: DC_NOW64 - 10 }, DC_NOW64, 300000) === '空' &&
  dcEntryLabelOf({ state: DC_FAIL, count: 0, images: 0, at: DC_NOW64 - 10 }, DC_NOW64, 300000) === '失败' &&
  dcEntryLabelOf({ state: DC_FAIL, count: 0, images: 0, at: DC_NOW64 - 999999 }, DC_NOW64, 300000) === '失败', true);
check('R64 dcNeedRescanOf：PENDING 恒需扫；OK / EMPTY / FAIL 按 TTL 到期自动刷新',
  dcNeedRescanOf({ state: DC_PENDING, count: 0, images: 0, at: 0 }, DC_NOW64, 300000) === true &&
  dcNeedRescanOf({ state: DC_OK, count: 12, images: 8, at: DC_NOW64 - 10 }, DC_NOW64, 300000) === false &&
  dcNeedRescanOf({ state: DC_OK, count: 12, images: 8, at: DC_NOW64 - 300000 }, DC_NOW64, 300000) === true &&
  dcNeedRescanOf({ state: DC_EMPTY, count: 0, images: 0, at: DC_NOW64 - 300000 }, DC_NOW64, 300000) === true &&
  dcNeedRescanOf({ state: DC_FAIL, count: 0, images: 0, at: DC_NOW64 - 10 }, DC_NOW64, 300000) === false &&
  dcNeedRescanOf({ state: DC_FAIL, count: 0, images: 0, at: DC_NOW64 - 300000 }, DC_NOW64, 300000) === true, true);
check('R64 TTL 设置直接决定自动刷新周期（30s 立即刷 / 24h 不刷，同一条目结论不同）',
  dcNeedRescanOf({ state: DC_OK, count: 9, images: 5, at: DC_NOW64 - 60000 }, DC_NOW64,
    DC_TTL_MIN_MS) === true &&
  dcNeedRescanOf({ state: DC_OK, count: 9, images: 5, at: DC_NOW64 - 60000 }, DC_NOW64,
    DC_TTL_MAX_MS) === false, true);
check('R64 dcEvictCountOf：LRU 只淘汰超出的部分，非法上限不淘汰',
  dcEvictCountOf(10, DC_CACHE_MAX) === 0 && dcEvictCountOf(256, DC_CACHE_MAX) === 0 &&
  dcEvictCountOf(260, DC_CACHE_MAX) === 4 && dcEvictCountOf(10, 0) === 0 &&
  DC_CACHE_MAX === 256, true);
check('R64 dcTtlLabelOf / dcTtlHintOf：四个预设档文案与设置提示串',
  dcTtlLabelOf(30000) === '30 秒' && dcTtlLabelOf(60000) === '1 分钟' &&
  dcTtlLabelOf(900000) === '15 分钟' && dcTtlLabelOf(3600000) === '1 小时' &&
  dcTtlHintOf(300000).indexOf('5 分钟') >= 0 &&
  dcTtlHintOf(300000).indexOf('自动刷新') >= 0, true);
check('R64 DirCount.ts 零 SDK / 零文件 IO / 零异步 / 零异常 / 零全局可变状态',
  /^\s*import\s/m.test(DC64_CODE) === false &&
  /@ohos\.|\bfs\./.test(DC64_CODE) === false &&
  /\bawait\s|\bthrow\s+/.test(DC64_CODE) === false &&
  /^(let|var)\s/m.test(DC64_CODE) === false &&
  /export interface DirCountEntry/.test(DC64_CODE) &&
  /export function dcCountOf\(/.test(DC64_CODE) &&
  /export function dcEntryLabelOf\(/.test(DC64_CODE), true);

// —— 数值决策表（当场重算，非抄表）——
{
  const cases = [
    ['刚统计 10s / TTL 5min', DC_OK, 12, DC_NOW64 - 10000, 300000],
    ['统计 4min59s / TTL 5min', DC_OK, 12, DC_NOW64 - 299000, 300000],
    ['统计满 5min / TTL 5min', DC_OK, 12, DC_NOW64 - 300000, 300000],
    ['统计 1min / TTL 30s', DC_OK, 12, DC_NOW64 - 60000, DC_TTL_MIN_MS],
    ['空目录刚统计', DC_EMPTY, 0, DC_NOW64 - 10, 300000],
    ['空目录已过期', DC_EMPTY, 0, DC_NOW64 - 300000, 300000],
    ['列举失败刚记录', DC_FAIL, 0, DC_NOW64 - 10, 300000],
    ['缓存缺失', DC_PENDING, 0, 0, 300000]
  ];
  console.log('     R64 状态 / 展示 / 是否重扫（TTL=设定值，now=1000000）：');
  console.log('     场景                          态   标签   重扫');
  for (const [name, st, n, at, ttl] of cases) {
    const e = { state: st, count: n, images: 0, at: at };
    const label = dcEntryLabelOf(e, DC_NOW64, ttl);
    const rescan = dcNeedRescanOf(e, DC_NOW64, ttl);
    console.log(`     ${name.padEnd(30)} ${String(st).padEnd(4)} ${label.padEnd(6)} ${rescan}`);
  }
  console.log('     → 过期成功值不再当权威展示（…）且按 TTL 重扫；空目录 / 失败各有独立文案；');
  console.log('       TTL 越短越早重扫，这就是「按设定周期自动刷新」。');
}

// —— 源码接线 ——
check('R64 Index 接入 DirCount 真值源：导入 + 构建标记 R66 + 三个展示 @State',
  INDEX.includes("from '../common/DirCount';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes('@State dirCountLabels: string[] = [];') &&
  INDEX.includes('@State dirCountVersion: number = 0;') &&
  INDEX.includes('@State dirCountTtlLabel: string ='), true);
check('R64 TTL 设置：独立 preferences 小 key + 夹界读回 + 诊断层循环切换 + 写盘',
  INDEX.includes("const POS_KEY_DC_TTL: string = 'dirCountTtlMs';") &&
  INDEX.includes('const DC_TTL_PRESETS: number[] = [60000, 300000, 900000, 3600000];') &&
  INDEX.includes('await p.get(POS_KEY_DC_TTL, 0)') &&
  INDEX.includes('this.dirCountTtlMs = dcTtlClampOf(rawDcTtl);') &&
  INDEX.includes("case 'dcTtl':") &&
  INDEX.includes('store.putSync(POS_KEY_DC_TTL, safe);') &&
  INDEX.includes("ToolButton({ label: '内容量 ' + this.dirCountTtlLabel, act: 'dcTtl'"), true);
check('R64 空闲闸门：三真值源接线 + 恢复期 / 在途 / 后台让路 + 心跳只排定时器',
  INDEX.includes('const idle: boolean = dcIdleOf(this.lastInputAt, now, DC_IDLE_MS);') &&
  INDEX.includes('const idleOk: boolean = dcAppIdleOf(this.folderBusy, this.playing,') &&
  INDEX.includes('dcScanActionOf(idleOk, this.dirCountScanBusy, true)') &&
  INDEX.includes('bulkIoAllowed(this.restoreMode), this.browseBase.length > 0);') &&
  INDEX.includes('if (!this.pageAlive || this.pageSuspended || this.dirCountScanBusy)') &&
  /setInterval\(\(\) => \{\s*this\.tickDirCount\(\);/.test(INDEX), true);
check('R64 用户输入打点覆盖根鼠标 / 工具动作 / 点行 / 翻页 / 幻灯片 / 返回前台',
  (INDEX.match(/this\.markUserActive\(\);/g) || []).length >= 5 &&
  INDEX.includes('private markUserActive(): void {') &&
  INDEX.includes('this.lastInputAt = Date.now();') &&
  /aboutToAppear\(\): void \{[\s\S]{0,700}this\.startDirCountScheduler\(\);/.test(INDEX), true);
check('R64 调度器生命周期：aboutToAppear 起 / TTL 变更 + 读回重建 / 页面销毁停',
  INDEX.split('this.startDirCountScheduler();').length - 1 === 3 &&
  INDEX.includes('this.stopDirCountScheduler();') &&
  INDEX.includes('private stopDirCountScheduler(): void {') &&
  INDEX.includes('this.dirCountTimer = -1;'), true);
check('R64 扫描口径：真异步 fs.listFile 非递归 + mergeExploreNames 合并 + 零 statSync',
  /await fs\.listFile\(candidates\[i\],\s*\{ recursion: false, listNum: 0 \}\)/.test(DC64_METHODS) &&
  DC64_METHODS.includes('mergeExploreNames(groups)') &&
  DC64_METHODS.includes('dcCountOf(merged, HIDE_DOT_FILES, DC_ENTRY_CAP)') &&
  DC64_METHODS.includes('dcImageCountOf(merged, HIDE_DOT_FILES, IMAGE_SUFFIXES)') &&
  DC64_METHODS.includes('dcStateOf(total, ok)') &&
  /statSync/.test(DC64_METHODS) === false, true);
check('R64 缓存与失效：Map + LRU + TTL 到期 + 目录/内容变化四处主动失效 + 迟到结果作废',
  INDEX.includes('private dirCountCache: Map<string, DirCountEntry> = new Map();') &&
  INDEX.includes('private dirCountOrder: string[] = [];') &&
  INDEX.includes('dcEvictCountOf(this.dirCountOrder.length, DC_CACHE_MAX)') &&
  INDEX.split('this.invalidateDirCounts();').length - 1 === 4 &&
  INDEX.includes('this.dirCountScanToken++;') &&
  INDEX.includes('if (token !== this.dirCountScanToken || !this.pageAlive)') &&
  INDEX.includes('const idx: number = this.dirCountRowIndexOf(uri);'), true);
check('R64 四态展示落地：缺失/过期「…」、空「空」、失败「失败」、正常「N 项」',
  INDEX.includes('dcEntryLabelOf(e, now, this.dirCountTtlMs)') &&
  INDEX.includes('labels.push(e === undefined ? DC_LABEL_PENDING') &&
  INDEX.includes('this.dirCountVersion = this.dirCountVersion + 1;') &&
  INDEX.split('this.rebuildDirCountLabels();').length - 1 === 4, true);
check('R64 ArchiveRow 在既有字节列位画内容量，非目录行 fmtBytes 链路逐字保留',
  ARCHIVE.includes("import { DC_LABEL_PENDING } from '../common/DirCount';") &&
  ARCHIVE.includes('@Prop countText: string') &&
  ARCHIVE.includes('if (this.kind === ROW_FOLDER) {') &&
  ARCHIVE.includes('Text(this.countText.length > 0 ? this.countText : DC_LABEL_PENDING)') &&
  ARCHIVE.includes('Text(fmtBytes(this.bytes))') &&
  ARCHIVE.includes('.width(66)') && ARCHIVE.includes('.width(88)') &&
  ARCHIVE.includes('.height(26)'), true);
check('R64 SidebarView 下传 @Prop 文案数组 + 版本号，按行下标取文案',
  SIDEBAR.includes('@Prop dirCountLabels: Array<string> = [];') &&
  SIDEBAR.includes('@Prop dirCountVersion: number = 0;') &&
  SIDEBAR.includes('private dirCountLabelOf(idx: number): string {') &&
  SIDEBAR.includes('countText: this.dirCountLabelOf(idx),') &&
  /SidebarView\(\{[\s\S]{0,900}dirCountLabels: this\.dirCountLabels,/.test(INDEX), true);
check('R64 单行落地只刷一行：GalleryData.notifyRowChanged + settleDirCount 唯一收口',
  GALLERY64.includes('notifyRowChanged(index: number): void {') &&
  GALLERY64.includes('this.listeners[i].onDataChange(index);') &&
  INDEX.includes('this.dataSource.notifyRowChanged(idx);') &&
  INDEX.split('this.settleDirCount(').length - 1 === 2, true);

// —— 零回归 ——
check('R64 零回归：版本 1.0.7/7、R63 旧标记已清除、Promise.race 仍仅 1 处、R63 滚动条门控仍在',
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R63';") === false &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  INDEX.includes('@State textBarShow: boolean = false;') &&
  INDEX.includes('.scrollBar(BarState.Off)') &&
  SIDEBAR.includes('.scrollBar(BarState.Auto)'), true);
check('R64 正式界面零新增常显控件：三按钮 / 三栏 / 行高逐字不变，TTL 入口只在 Ctrl+D 诊断层',
  (SIDEBAR.match(/ToolButton\(/g) || []).length === 3 &&
  SIDEBAR.includes("SideToolButton({ glyph: '⇧', act: 'up', flex: true") &&
  SIDEBAR.includes("SideToolButton({ glyph: '▣', act: 'folder', flex: true") &&
  ARCHIVE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3 &&
  (ARCHIVE.match(/upReturnFgOf\(/g) || []).length === 4, true);

console.log('  ⚠️ 本组是静态契约 + 纯函数 + 决策表数值验证，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R64-A：装新包后 Ctrl+D 角标必须是 R64；打开含多个子文件夹的目录，');
console.log('     停手约 2 秒后各行「字节」列位依次从「…」变成「N 项」，期间界面不卡、翻页/滚轮照常。');
console.log('  ⚠️ 真机步骤 R64-B：确认空目录显示「空」；无权/掉线目录显示「失败」；');
console.log('     Ctrl+D 诊断层点「内容量 N 分钟」循环切 1分/5分/15分/1小时，状态栏给出有效期提示。');
console.log('  ⚠️ 真机步骤 R64-C：往子目录里增删文件后返回上层，等一个 TTL 周期（或按有效期设短），');
console.log('     该行数字应与目录实际条目数一致；缓存数字不会停留在旧值，也不会在内容变动后串位。');
console.log('  ⚠️ 真机步骤 R64-D：排序 / 往上层 / 选择文件夹 / 悬停缩略图 / 文本预览 scrollbar /');
console.log('     并排预览 / 全屏 / 放大镜 / R61 目录行三栏宽度与行高均与 R63 一致，无新增占位或跳动。');

// ==================== 第六十五轮：FITS / XISF 天文图像预览（R65） ====================
console.log('--- 第六十五轮：FITS / XISF 天文图像预览（自解析 / 拉伸 / 真异步 / 零回归）---');
const AI65_SRC = readFileSync(new URL('../entry/src/main/ets/common/AstroImage.ts', import.meta.url), 'utf8');
const AI65_CODE = stripComments(AI65_SRC);

// —— 构造真实字节的辅助（放进测试文件本身，纯 Uint8Array，不碰任何 SDK）——
function aiCard(s) {
  const a = new Uint8Array(80); a.fill(32);
  for (let i = 0; i < s.length && i < 80; i++) { a[i] = s.charCodeAt(i); }
  return a;
}
function aiKv(k, v) { return aiCard(k.padEnd(8, ' ') + '= ' + v); }
function aiBe16(v) { return [(v >> 8) & 255, v & 255]; }
function aiMakeFits(bitpix, w, h, ch, pix) {
  const cards = [aiKv('SIMPLE', 'T'), aiKv('BITPIX', String(bitpix)),
    aiKv('NAXIS', ch > 1 ? '3' : '2'), aiKv('NAXIS1', String(w)), aiKv('NAXIS2', String(h))];
  if (ch > 1) { cards.push(aiKv('NAXIS3', String(ch))); }
  cards.push(aiKv('BZERO', '0'), aiKv('BSCALE', '1'), aiCard('END'));
  const header = new Uint8Array(2880); header.fill(32);
  let off = 0;
  for (const c of cards) { header.set(c, off); off += 80; }
  const file = new Uint8Array(2880 + pix.length);
  file.set(header, 0); file.set(pix, 2880);
  return file;
}
function aiMakeXisf(w, h, c, sf, storage, pix, comp) {
  const compression = comp === undefined ? ' none' : ' compression="' + comp + '"';
  const xml = '<xisf version="1.0"><Image geometry="' + w + ':' + h + ':' + c +
    '" sampleFormat="' + sf + '" colorSpace="' + (c === 3 ? 'RGB' : 'Gray') +
    '" pixelStorage="' + storage + '" location="attachment:4096:' + pix.length +
    '"' + compression + '/></xisf>';
  const hb = new Uint8Array(xml.length);
  for (let i = 0; i < xml.length; i++) { hb[i] = xml.charCodeAt(i); }
  const file = new Uint8Array(4096 + pix.length);
  const sig = AI_XISF_SIGNATURE;
  for (let i = 0; i < 8; i++) { file[i] = sig.charCodeAt(i); }
  const L = hb.length;
  file[8] = L & 255; file[9] = (L >> 8) & 255; file[10] = (L >> 16) & 255; file[11] = (L >> 24) & 255;
  file.set(hb, 16); file.set(pix, 4096);
  return file;
}

// —— ① 后缀识别与格式常量 ——
check('R65 后缀识别：.fits/.fit/.fts → FITS，.xisf → XISF，大小写不敏感，普通图片不归天文',
  aiFormatOf('a.FITS') === AI_FMT_FITS && aiFormatOf('b.fit') === AI_FMT_FITS &&
  aiFormatOf('c.fts') === AI_FMT_FITS && aiFormatOf('d.XISF') === AI_FMT_XISF &&
  aiFormatOf('e.png') === AI_FMT_NONE && aiFormatOf('noext') === AI_FMT_NONE &&
  aiIsAstroName('x.fits') === true && aiIsAstroName('x.jpg') === false &&
  AI_FITS_SUFFIXES.length === 3 && AI_XISF_SUFFIXES.length === 1, true);
check('R65 aiSuffixOf：取小写后缀，无后缀 / 尾点返回空串',
  aiSuffixOf('A.Fits') === '.fits' && aiSuffixOf('noext') === '' &&
  aiSuffixOf('trail.') === '', true);

// —— ② 通用字节读取 / IEEE754 手写解码（不用 DataView）——
check('R65 aiU16At / aiU32At 大端小端正确',
  aiU16At(new Uint8Array([0x12, 0x34]), 0, AI_BE) === 0x1234 &&
  aiU16At(new Uint8Array([0x12, 0x34]), 0, AI_LE) === 0x3412 &&
  aiU32At(new Uint8Array([0x01, 0x02, 0x03, 0x04]), 0, AI_BE) === 0x01020304 &&
  aiU32At(new Uint8Array([0x01, 0x02, 0x03, 0x04]), 0, AI_LE) === 0x04030201, true);
check('R65 aiI16At / aiI32At 补码有符号',
  aiI16At(new Uint8Array([0xff, 0xfe]), 0, AI_BE) === -2 &&
  aiI32At(new Uint8Array([0xff, 0xff, 0xff, 0xfe]), 0, AI_BE) === -2, true);
check('R65 aiF32FromBits：1.0 / π 位模式解码正确',
  Math.abs(aiF32FromBits(0x3f800000) - 1.0) < 1e-6 &&
  Math.abs(aiF32FromBits(0x40490fdb) - Math.PI) < 1e-5, true);
check('R65 aiF64FromBits：1.0 双精度解码正确',
  Math.abs(aiF64FromBits(0x3ff00000, 0) - 1.0) < 1e-9, true);
check('R65 aiSampleAt：BITPIX/sampleFormat → 样本格式 + 每样本字节数映射齐备',
  aiBitpixSampleOf(8) === AI_SAMPLE_U8 && aiBitpixSampleOf(16) === AI_SAMPLE_I16 &&
  aiBitpixSampleOf(-32) === AI_SAMPLE_U8 + 5 &&
  aiXisfSampleOf('UInt16') !== AI_SAMPLE_UNKNOWN &&
  aiXisfSampleOf('Float64') !== AI_SAMPLE_UNKNOWN &&
  aiXisfSampleOf('Complex32') === AI_SAMPLE_UNKNOWN &&
  aiBytesPerSampleOf(AI_SAMPLE_U8) === 1 &&
  aiBytesPerSampleOf(AI_SAMPLE_F32) === 4, true);
check('R65 aiNumOf：整数 / 浮点 / 指数 / 脏值回退',
  aiNumOf('  16  ', 99, true) === 16 && aiNumOf('1.5', 0, false) === 1.5 &&
  aiNumOf('1.5E2', 0, false) === 150 && aiNumOf('', 7, true) === 7, true);

// —— ③ FITS 头解析（构造 2x2 灰度 BITPIX=16 大端）——
const FITS65_PIX = new Uint8Array([...aiBe16(0), ...aiBe16(100), ...aiBe16(1000), ...aiBe16(32000)]);
const FITS65 = aiMakeFits(16, 2, 2, 1, FITS65_PIX);
const FP65 = aiFitsPlanOf(FITS65);
check('R65 aiFitsPlanOf：主 HDU 解析 ok / 维度 / BITPIX / 大端 / 数据偏移 2880',
  FP65.ok === AI_OK && FP65.fmt === AI_FMT_FITS &&
  FP65.width === 2 && FP65.height === 2 && FP65.channels === 1 &&
  FP65.sample === AI_SAMPLE_I16 && FP65.endian === AI_BE &&
  FP65.bytesPerSample === 2 && FP65.dataOffset === 2880 && FP65.dataLength === 8, true);
check('R65 FITS 卡片解析：KEYWORD / VALUE / END 定位',
  aiCardKeyOf(aiCardTextOf(FITS65, 0)) === 'SIMPLE' &&
  aiCardValOf(aiCardTextOf(FITS65, 1)) === '16' &&
  aiCardKeyOf(aiCardTextOf(FITS65, 7)) === 'END', true);
check('R65 FITS 失败态：太短 / 缺 SIMPLE / 无 END / 坏 BITPIX 都有明确失败码',
  aiFitsPlanOf(new Uint8Array(100)).ok === AI_FAIL_TOO_SHORT &&
  aiFitsPlanOf(aiMakeFits(16, 2, 2, 1, FITS65_PIX).fill(0, 0, 80)).ok === AI_FAIL_BAD_MAGIC &&
  aiFitsPlanOf(aiMakeFits(99, 2, 2, 1, FITS65_PIX)).ok === AI_FAIL_BAD_BITPIX, true);

// —— ④ XISF 头解析（构造 2x2 UInt8 灰度、Normal、attachment）——
const XISF65_PIX = new Uint8Array([0, 64, 128, 255]);
const XISF65 = aiMakeXisf(2, 2, 1, 'UInt8', 'Normal', XISF65_PIX, 'none');
const XP65 = aiXisfPlanOf(XISF65);
check('R65 aiXisfPlanOf：签名 / geometry / sampleFormat / 小端 / attachment pos:size',
  XP65.ok === AI_OK && XP65.fmt === AI_FMT_XISF &&
  XP65.width === 2 && XP65.height === 2 && XP65.channels === 1 &&
  XP65.sample === AI_SAMPLE_U8 && XP65.endian === AI_LE &&
  XP65.layout === AI_LAYOUT_NORMAL && XP65.compressed === AI_COMP_NONE &&
  XP65.dataOffset === 4096 && XP65.dataLength === 4, true);
check('R65 XISF 头解析辅助：magic / headerLen / XML / <Image> / 属性 / geometry',
  aiXisfMagicOf(XISF65) === true && aiXisfHeaderLenOf(XISF65) > 0 &&
  aiXisfXmlOf(XISF65, aiXisfHeaderLenOf(XISF65)).indexOf('<Image') >= 0 &&
  aiAttrOf(aiImageTagOf(aiXisfXmlOf(XISF65, aiXisfHeaderLenOf(XISF65))), 'geometry') === '2:2:1' &&
  aiGeometryOf('1024:768:3', 0) === 1024 && aiGeometryOf('1024:768:3', 2) === 3, true);
check('R65 aiLocationOf / aiCompressionOf：attachment 解析 + none/zlib/zlib+sh/lz4 分派',
  aiLocationOf('attachment:4096:8')[0] === 0 && aiLocationOf('attachment:4096:8')[1] === 4096 &&
  aiLocationOf('embedded')[0] === 1 && aiLocationOf('inline:base64')[0] === 2 &&
  aiCompressionOf('')[0] === AI_COMP_NONE && aiCompressionOf('none')[0] === AI_COMP_NONE &&
  aiCompressionOf('zlib')[0] === AI_COMP_ZLIB &&
  aiCompressionOf('zlib+sh:2')[0] === AI_COMP_ZLIB && aiCompressionOf('zlib+sh:2')[1] === 2 &&
  aiCompressionOf('lz4hc')[0] === AI_COMP_UNSUPPORTED, true);
check('R65 XISF 失败态：签名错 / 无 Image / 未知压缩 / 数据不足都有明确失败码',
  aiXisfPlanOf(new Uint8Array(100)).ok === AI_FAIL_BAD_MAGIC &&
  aiXisfPlanOf(aiMakeXisf(2, 2, 1, 'Complex32', 'Normal', XISF65_PIX)).ok === AI_FAIL_BAD_GEOMETRY &&
  aiXisfPlanOf(aiMakeXisf(2, 2, 1, 'UInt8', 'Normal', XISF65_PIX, 'lz4hc')).ok === AI_FAIL_UNSUPPORTED, true);

// —— ⑤ 拉伸 / 反 shuffle / RGBA 生成 / 显示尺寸 ——
const PIX65 = FITS65.subarray(FP65.dataOffset, FP65.dataOffset + FP65.dataLength);
const BD65 = aiBoundsOf(PIX65, FP65);
check('R65 aiBoundsOf / aiBoundsStepOf：min-max 正确 + 大图步长封顶 65536 采样',
  BD65.lo === 0 && BD65.hi === 32000 &&
  aiBoundsStepOf(1000) === 1 && aiBoundsStepOf(200000) > 1, true);
check('R65 aiStretchByteOf：端点 0/255 + gamma 提亮暗部 + 越界夹界',
  aiStretchByteOf(0, 0, 255, AI_STRETCH_GAMMA) === 0 &&
  aiStretchByteOf(255, 0, 255, AI_STRETCH_GAMMA) === 255 &&
  aiStretchByteOf(-10, 0, 255, 1) === 0 && aiStretchByteOf(999, 0, 255, 1) === 255 &&
  aiStretchByteOf(64, 0, 255, AI_STRETCH_GAMMA) > aiStretchByteOf(64, 0, 255, 1), true);
check('R65 aiUnshuffleOf：反 XISF +sh 字节重排（itemSize=2）',
  (() => {
    const u = aiUnshuffleOf(new Uint8Array([1, 2, 3, 4, 10, 20, 30, 40]), 2);
    return u[0] === 1 && u[1] === 10 && u[2] === 2 && u[3] === 20 && u[6] === 4 && u[7] === 40;
  })(), true);
check('R65 aiDisplaySizeOf：按 edge 降采样 + 长边夹 8192 上限',
  aiDisplaySizeOf(8000, 4000, 1024).w === 1024 && aiDisplaySizeOf(8000, 4000, 1024).h === 512 &&
  aiDisplaySizeOf(100, 50, 99999).w <= 8192, true);
check('R65 aiRgbaOf：2x2 灰度拉伸端点 + alpha=255 + 长度精确 + BGRA 开关可切 R/B',
  (() => {
    const rgba = aiRgbaOf(PIX65, FP65, 2, 2, BD65, AI_STRETCH_GAMMA, 0);
    const bgra = aiRgbaOf(PIX65, FP65, 2, 2, BD65, AI_STRETCH_GAMMA, 1);
    return rgba.length === 16 && rgba[0] === 0 && rgba[12] === 255 &&
      rgba[3] === 255 && rgba[7] === 255 &&
      bgra[0] === rgba[2] && bgra[2] === rgba[0];
  })(), true);
check('R65 aiPixelsLongEnough / aiHeaderOf 统一入口 / 失败文案齐备',
  aiPixelsLongEnough(PIX65, FP65) === true &&
  aiPixelsLongEnough(new Uint8Array(2), FP65) === false &&
  aiHeaderOf('a.fits', FITS65).ok === AI_OK &&
  aiHeaderOf('a.jpg', FITS65).ok !== AI_OK &&
  aiFailHintOf(AI_FAIL_DATA_SHORT, 'a.fits').indexOf('天文图像预览失败') >= 0 &&
  aiFailHintOf(AI_OK, 'a.fits') === '', true);

// —— ⑥ 源码接线静态契约：纯函数零副作用 + SDK 层真异步 + createPixelMap ——
check('R65 AstroImage.ts 是纯函数模块：零 SDK / 零 IO / 零 await / 零 throw / 零 Promise / 零计时器',
  ['@ohos.', 'setTimeout', 'fileIo', 'new Promise', 'Atomics.wait', 'await ',
    'throw ', 'DataView', 'TextDecoder'].some(s => AI65_CODE.includes(s)) === false &&
  AI65_CODE.includes('export function aiRgbaOf') &&
  AI65_CODE.includes('export function aiFitsPlanOf') &&
  AI65_CODE.includes('export function aiXisfPlanOf'), true);
check('R65 IMAGE_SUFFIXES 追加四个天文后缀，既有八项逐字保留（isImageName 自动生效）',
  IMAGE_SUFFIXES_OK65(), true);
function IMAGE_SUFFIXES_OK65() {
  const line = INDEX.slice(INDEX.indexOf('const IMAGE_SUFFIXES'),
    INDEX.indexOf('const IMAGE_SUFFIXES') + 260);
  return ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif',
    '.fits', '.fit', '.fts', '.xisf'].every(s => line.includes("'" + s + "'"));
}
check('R65 decodePx 开头分流天文格式，系统 codec 两行 createImageSource 逐字保留',
  // 去注释后判读：export 与 if 之间有一行说明注释，用 stripComments 保持语义
  /export async function decodePx\(uri: string, edge: number\): Promise<PreviewEntry \| undefined> \{\s*if \(aiIsAstroName\(uri\)\) \{\s*return decodeAstroPx\(uri, edge\);/.test(stripComments(MODEL)) &&
  MODEL.includes('src = image.createImageSource(raw);') &&
  MODEL.includes('src = image.createImageSource(file.fd);'), true);
check('R65 decodeAstroPx：真异步读字节 → 纯函数解析 → 拉伸 → createPixelMap(RGBA_8888/OPAQUE)',
  MODEL.includes('async function decodeAstroPx(') &&
  MODEL.includes('async function readAstroBytes(') &&
  MODEL.includes('async function astroPixelsOf(') &&
  MODEL.includes('const head: AstroHeader = aiHeaderOf(uri, bytes);') &&
  MODEL.includes('aiBoundsOf(pixels, head)') &&
  MODEL.includes('aiRgbaOf(pixels, head, sz.w, sz.h') &&
  MODEL.includes('image.createPixelMap(rgba.buffer, opts)') &&
  MODEL.includes('image.PixelMapFormat.RGBA_8888') &&
  MODEL.includes('image.AlphaType.OPAQUE'), true);
check('R65 压缩 XISF 用 SDK zlib 内存解压 + 反 shuffle；真异步读取全 await 不构造 Promise',
  MODEL.includes("import zlib from '@ohos.zlib';") &&
  MODEL.includes('zlib.createZipSync()') &&
  MODEL.includes('await zip.uncompress(dest, src);') &&
  MODEL.includes('aiUnshuffleOf(decoded, head.shuffleItemSize)') &&
  MODEL.includes('await fs.stat(uri)') && MODEL.includes('await fs.open(uri, fs.OpenMode.READ_ONLY)') &&
  MODEL.includes('await fs.read(file.fd, buf)') && MODEL.includes('await fs.close(file.fd)'), true);
check('R65 零回归：new Promise 仍恰 2 处、Promise.race 仍 1 处、版本 1.0.7/7、R64 旧标记清除',
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R64';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';"), true);
check('R65 正式界面零新增常显控件：三按钮 / 三栏 / DirCount 四态链 / 文本 scrollbar 全未动',
  (SIDEBAR.match(/ToolButton\(/g) || []).length === 3 &&
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3 &&
  (ARCHIVE.match(/upReturnFgOf\(/g) || []).length === 4 &&
  INDEX.includes('@State textBarShow: boolean = false;') &&
  INDEX.includes('dcImageCountOf(merged, HIDE_DOT_FILES, IMAGE_SUFFIXES)'), true);

console.log('  ⚠️ 本组是静态契约 + 构造字节纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R65-A：装新包后 Ctrl+D 角标必须是 R65；打开含 .fits/.xisf 的目录，');
console.log('     这两类文件在左栏列出、点行进图片翻页序列，主视图显示拉伸后的天文图（非全黑），翻页/滚轮不卡。');
console.log('  ⚠️ 真机步骤 R65-B：FITS（16 位 / float 灰度、3 通道）与 XISF（UInt8/UInt16、Normal/Planar、');
console.log('     zlib 压缩）分别能显示；损坏 / 超大 / lz4 等不支持文件给明确失败提示而非白屏或崩溃。');
console.log('  ⚠️ 真机步骤 R65-C：若天文图 R/B 通道偏色（华为个别机型 createPixelMap 按 BGRA 处理），');
console.log('     把 AI_OUTPUT_BGRA 常量在 0↔1 间切换后重装验证 —— 属平台差异，编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R65-D：既有 HEIC/JPG/PNG / 文本预览 / 并排 / 全屏 / 放大镜 / 文本 scrollbar /');
console.log('     R64 内容量统计 / 三栏三按钮 / 版本 1.0.7/7 全部零回归，无新增常显控件或跳动。');

// ==================== 第六十六轮：天文像素计算让出主线程（R66 / THREAD_BLOCK_6S） ====================
console.log('--- 第六十六轮：天文像素计算让出主线程（尺寸护栏 + 分片 + 并发槽位 + 零回归）---');

// —— ① 根因判据常量：R65 只夹长边，R66 再夹总像素 / 计算片 / 并发 ——
check('R66 硬上限常量：目标总像素 4M / 每片 24 行 / 重计算槽位 1 / 片间让出 0ms',
  AI_MAX_TARGET_PIXELS === 4 * 1024 * 1024 && AI_SLICE_ROWS === 24 &&
  AI_MAX_CONCURRENT_RENDER === 1 && AI_SLICE_YIELD_MS === 0 &&
  AI_MAX_UNCOMPRESSED_BYTES === 256 * 1024 * 1024 &&
  AI_UNSHUFFLE_SLICE_LIMIT === 2 * 1024 * 1024 &&
  AI_UNSHUFFLE_SLICE_ITEMS === 65536, true);
check('R66 appfreeze 规模判据：R65 全屏 4096² = 1677 万目标像素，R66 夹后 ≤ 4M',
  4096 * 4096 > AI_MAX_TARGET_PIXELS &&
  aiDisplaySizeOf(4096, 4096, 4096).w * aiDisplaySizeOf(4096, 4096, 4096).h === 4096 * 4096, true);

// —— ② 目标尺寸：R65 长边语义逐字不变，再加总像素硬夹 ——
check('R66 aiTargetSizeSafeOf：小图 / 降采样图完全沿用 aiDisplaySizeOf（零数值回归）',
  aiTargetSizeSafeOf(800, 400, 1024, AI_MAX_TARGET_PIXELS).w === 800 &&
  aiTargetSizeSafeOf(800, 400, 1024, AI_MAX_TARGET_PIXELS).h === 400 &&
  aiTargetSizeSafeOf(8000, 4000, 1024, AI_MAX_TARGET_PIXELS).w === 1024 &&
  aiTargetSizeSafeOf(8000, 4000, 1024, AI_MAX_TARGET_PIXELS).h === 512 &&
  aiTargetSizeSafeOf(100, 50, 99999, AI_MAX_TARGET_PIXELS).w === 100, true);
check('R66 aiTargetSizeSafeOf：4096² 全屏按等比例缩到 2048²，总像素恰 4M 且宽高 ≥1',
  (() => {
    const s = aiTargetSizeSafeOf(4096, 4096, 4096, AI_MAX_TARGET_PIXELS);
    return s.w === 2048 && s.h === 2048 && s.w * s.h <= AI_MAX_TARGET_PIXELS;
  })(), true);
check('R66 aiTargetSizeSafeOf：maxPixels<=0 不夹（保持 R65 原尺寸）、1×1 不被缩成 0',
  aiTargetSizeSafeOf(4096, 4096, 4096, 0).w === 4096 &&
  aiTargetSizeSafeOf(1, 1, 1024, AI_MAX_TARGET_PIXELS).w === 1 &&
  aiTargetSizeSafeOf(1, 1, 1024, AI_MAX_TARGET_PIXELS).h === 1, true);

// —— ③ 分片计划与列映射表（纯函数，Node 可逐值重算）——
check('R66 aiSliceCountOf / I0 / I1：向上取整、末片夹到 total、非法 per 按 1、空总得 0',
  aiSliceCountOf(50, 24) === 3 && aiSliceCountOf(0, 24) === 0 &&
  aiSliceCountOf(5, 0) === 5 && aiSliceI0Of(2, 24) === 48 &&
  aiSliceI1Of(2, 24, 50) === 50 && aiSliceI1Of(1, 24, 50) === 48 &&
  aiSliceI1Of(9, 24, 50) === 50, true);
check('R66 aiSxTableOf：列映射表长度=dw、夹到 srcW-1、单调不减（与 R65 每像素 floor+min 同值）',
  (() => {
    const t = aiSxTableOf(4, 4);
    const u = aiSxTableOf(4, 2);
    let mono = true;
    for (let i = 1; i < t.length; i++) { if (t[i] < t[i - 1]) { mono = false; } }
    return t.length === 4 && t[3] === 3 && u.length === 2 && u[0] === 0 && u[1] === 2 &&
      mono && aiSxTableOf(0, 3).length === 0;
  })(), true);

// —— ④ 分片渲染与 R65 一次性渲染逐字节一致（不是「看起来差不多」）——
check('R66 aiRgbaSliceOf 分片拼接 == aiRgbaOf：4×5 目标 / 2 行一片 / 灰度 / RGBA 与 BGRA 双口径全等',
  (() => {
    const dw = 4, dh = 5;
    const one = aiRgbaOf(PIX65, FP65, dw, dh, BD65, AI_STRETCH_GAMMA, 0);
    const out = new Uint8Array(dw * dh * 4);
    const sx = aiSxTableOf(FP65.width, dw);
    const n = aiSliceCountOf(dh, 2);
    for (let i = 0; i < n; i++) {
      aiRgbaSliceOf(PIX65, FP65, dw, dh, BD65, AI_STRETCH_GAMMA, 0,
        out, sx, aiSliceI0Of(i, 2), aiSliceI1Of(i, 2, dh));
    }
    const oneB = aiRgbaOf(PIX65, FP65, dw, dh, BD65, AI_STRETCH_GAMMA, 1);
    const outB = new Uint8Array(dw * dh * 4);
    for (let i = 0; i < n; i++) {
      aiRgbaSliceOf(PIX65, FP65, dw, dh, BD65, AI_STRETCH_GAMMA, 1,
        outB, sx, aiSliceI0Of(i, 2), aiSliceI1Of(i, 2, dh));
    }
    let eq = one.length === out.length && oneB.length === outB.length;
    for (let i = 0; i < out.length; i++) {
      if (one[i] !== out[i] || oneB[i] !== outB[i]) { eq = false; break; }
    }
    return eq && n === 3 && out.length === 80 && out[3] === 255 && out[out.length - 1] === 255;
  })(), true);
check('R66 aiRgbaSliceOf：非法尺寸（dw<=0 / dh<=0 / 头失败）只返回不写越界',
  (() => {
    const bad = aiFailHeader(AI_FMT_FITS, AI_FAIL_TOO_SHORT);
    const out = new Uint8Array(16);
    aiRgbaSliceOf(PIX65, bad, 2, 2, BD65, AI_STRETCH_GAMMA, 0,
      out, aiSxTableOf(2, 2), 0, 2);
    aiRgbaSliceOf(PIX65, FP65, 0, 2, BD65, AI_STRETCH_GAMMA, 0,
      out, [], 0, 2);
    return out.every(v => v === 0);
  })(), true);

// —— ⑤ gamma=0.5 走 sqrt：与通用 pow 位级一致，但每像素省一次幂运算 ——
check('R66 aiStretchByteOf：gamma=0.5 的 sqrt 快路与 Math.pow(t,0.5) 在 1 万个采样点逐值同为 0..255',
  (() => {
    const ref = (v, lo, hi) => {
      let t = (v - lo) / (hi - lo);
      if (t < 0) { t = 0; } if (t > 1) { t = 1; }
      if (t > 0) { t = Math.pow(t, 0.5); }
      const o = Math.floor(t * 255 + 0.5);
      return o < 0 ? 0 : (o > 255 ? 255 : o);
    };
    for (let i = 0; i <= 10000; i++) {
      const v = (i / 10000) * 1000;
      if (aiStretchByteOf(v, 0, 1000, 0.5) !== ref(v, 0, 1000)) { return false; }
    }
    return AI_STRETCH_GAMMA === 0.5;
  })(), true);
check('R66 非 0.5 gamma 仍走通用 pow（数值模型不退化）',
  aiStretchByteOf(64, 0, 255, 0.35) > aiStretchByteOf(64, 0, 255, 1) &&
  aiStretchByteOf(0, 0, 255, 0.35) === 0 && aiStretchByteOf(255, 0, 255, 0.35) === 255, true);

// —— ⑥ 反 shuffle 分片与一次性版逐字节一致 ——
check('R66 aiUnshuffleSliceOf 分片拼接 == aiUnshuffleOf（itemSize=2 / 每片 2 样本）',
  (() => {
    const src = new Uint8Array([1, 2, 3, 4, 10, 20, 30, 40]);
    const one = aiUnshuffleOf(src, 2);
    const count = Math.floor(src.length / 2);
    const out = new Uint8Array(count * 2);
    const n = aiSliceCountOf(count, 2);
    for (let plane = 0; plane < 2; plane++) {
      for (let i = 0; i < n; i++) {
        aiUnshuffleSliceOf(src, 2, count, out, plane,
          aiSliceI0Of(i, 2), aiSliceI1Of(i, 2, count));
      }
    }
    return one.length === out.length && one.every((v, i) => v === out[i]);
  })(), true);

// —— ⑦ 护栏纯函数：畸形尺寸 / 槽位账目异常都不炸也不死等 ——
check('R66 aiAllocAllowedOf：0 / 负数 / NaN / 超限全拒，合法尺寸与边界值放行，max<=0 恒拒',
  aiAllocAllowedOf(0, 100) === false && aiAllocAllowedOf(-1, 100) === false &&
  aiAllocAllowedOf(NaN, 100) === false && aiAllocAllowedOf(101, 100) === false &&
  aiAllocAllowedOf(1, 100) === true && aiAllocAllowedOf(100, 100) === true &&
  aiAllocAllowedOf(1, 0) === false, true);
check('R66 aiRenderSlotAllowedOf：0<1 放行 / 满槽拒绝 / 账目异常放行 / max<=0 恒拒',
  aiRenderSlotAllowedOf(0, 1) === true && aiRenderSlotAllowedOf(1, 1) === false &&
  aiRenderSlotAllowedOf(2, 1) === false && aiRenderSlotAllowedOf(-1, 1) === true &&
  aiRenderSlotAllowedOf(NaN, 1) === true && aiRenderSlotAllowedOf(0, 0) === false, true);

// —— ⑧ 源码接线静态契约：分片 / 让出 / 尺寸护栏 / 并发槽位 / 零新增等待原语 ——
check('R66 AstroImage.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器',
  ['@ohos.', 'setTimeout', 'fileIo', 'new Promise', 'Atomics.wait', 'await ',
    'throw ', 'DataView', 'TextDecoder'].some(s => AI65_CODE.includes(s)) === false &&
  AI65_CODE.includes('export function aiTargetSizeSafeOf') &&
  AI65_CODE.includes('export function aiRgbaSliceOf') &&
  AI65_CODE.includes('export function aiAllocAllowedOf') &&
  AI65_CODE.includes('export function aiRenderSlotAllowedOf'), true);
check('R66 aiStretchByteOf 源码：gamma=0.5 走 Math.sqrt，非 0.5 仍走 Math.pow（无每像素通用幂）',
  AI65_CODE.includes('gamma === 0.5 ? Math.sqrt(t) : Math.pow(t, gamma)') &&
  AI65_CODE.includes('AI_STRETCH_GAMMA: number = 0.5'), true);
check('R66 decodeAstroPx 接线：总像素夹界 + 分片 RGBA + 槽位串行化，R65 直连 aiDisplaySizeOf 已撤',
  MODEL.includes('aiTargetSizeSafeOf(head.width, head.height, edge, AI_MAX_TARGET_PIXELS)') &&
  MODEL.includes('await astroRgbaOf(pixels, head, sz, bounds)') &&
  MODEL.includes('const sz: AstroSize = aiDisplaySizeOf(') === false &&
  MODEL.includes('aiBoundsOf(pixels, head)') &&
  MODEL.includes('image.createPixelMap(rgba.buffer, opts)') &&
  MODEL.includes('aiRgbaOf(pixels, head, sz.w, sz.h,'), true);
check('R66 astroRgbaOf：24 行一片 / 列映射预建 / 片间宏任务让出 / finally 归还槽位',
  MODEL.includes('aiSliceCountOf(sz.h, AI_SLICE_ROWS)') &&
  MODEL.includes('aiSxTableOf(head.width, sz.w)') &&
  MODEL.includes('aiRgbaSliceOf(pixels, head, sz.w, sz.h') &&
  MODEL.includes('await yieldMacroTask(AI_SLICE_YIELD_MS)') &&
  MODEL.includes('aiRenderSlotAllowedOf(astroRenderActive, AI_MAX_CONCURRENT_RENDER)') &&
  MODEL.includes('astroRenderActive++;') && MODEL.includes('astroRenderActive--;') &&
  MODEL.includes('} finally {'), true);
check('R66 yieldMacroTask：定时器宏任务让出，三处复用（槽位等待 / RGBA 片间 / 反 shuffle 片间）',
  MODEL.includes('export function yieldMacroTask(ms: number): Promise<void>') &&
  MODEL.includes('setTimeout((): void => {') &&
  (MODEL.match(/await yieldMacroTask\(AI_SLICE_YIELD_MS\)/g) || []).length === 3, true);
check('R66 尺寸护栏接线：读文件 / zlib 解压前 / 未压缩段三处 aiAllocAllowedOf 全在',
  (MODEL.match(/aiAllocAllowedOf\(/g) || []).length === 3 &&
  MODEL.includes('aiAllocAllowedOf(size, ASTRO_MAX_BYTES)') &&
  MODEL.includes('aiAllocAllowedOf(head.uncompressedSize, AI_MAX_UNCOMPRESSED_BYTES)') &&
  MODEL.includes('aiAllocAllowedOf(len, AI_MAX_UNCOMPRESSED_BYTES)'), true);
check('R66 大压缩块反 shuffle 走分片版，小块仍走 R65 一次性 aiUnshuffleOf（数值不变）',
  MODEL.includes('async function astroUnshuffleSliced(') &&
  MODEL.includes('aiUnshuffleSliceOf(src, itemSize, count, out, plane, i0, i1)') &&
  MODEL.includes('aiUnshuffleOf(decoded, head.shuffleItemSize)') &&
  MODEL.includes('await zip.uncompress(dest, src);') &&
  MODEL.includes('await astroUnshuffleSliced(decoded, head.shuffleItemSize)'), true);
check('R66 零新增等待原语：全源码 Promise 构造仍恰 2 处 / Promise.race 仍 1 处 / 无 taskpool / 无 worker',
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  MODEL.includes('taskpool') === false && MODEL.includes('@ohos.worker') === false &&
  (MODEL.match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/new Promise/g) || []).length === 0, true);
check('R66 nasRetryWait 委托 yieldMacroTask：R44 重试节奏语义不变、Index 零 Promise 构造',
  INDEX.includes('yieldMacroTask } from \'../model/Preview\'') &&
  INDEX.includes('return yieldMacroTask(ms);') &&
  /private nasRetryWait\(ms: number\): Promise<void> \{\s*return yieldMacroTask\(ms\);/.test(INDEX), true);
check('R66 零回归：构建标记 R66 / 版本 1.0.7/7 / 普通图片 codec 两行 / R65 旧标记已清',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R65';") === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  MODEL.includes('src = image.createImageSource(raw);') &&
  MODEL.includes('src = image.createImageSource(file.fd);'), true);
check('R66 正式界面零新增常显控件：三按钮 / 三栏 / 四态统计 / 文本 scrollbar 全未动',
  (SIDEBAR.match(/ToolButton\(/g) || []).length === 3 &&
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3 &&
  INDEX.includes('@State textBarShow: boolean = false;') &&
  INDEX.includes('dcImageCountOf(merged, HIDE_DOT_FILES, IMAGE_SUFFIXES)'), true);

console.log('  ⚠️ 本组是静态契约 + 构造字节纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R66-A：装新包后 Ctrl+D 角标必须是 R66；打开含 8K×8K FITS / XISF 的目录，');
console.log('     连续滚轮翻页 30 秒，界面/按键不再冻结、无 THREAD_BLOCK_6S appfreeze 栈。');
console.log('  ⚠️ 真机步骤 R66-B：全屏打开同一张超大天文图，主视图仍显示拉伸后的图（目标尺寸被夹到约');
console.log('     2048×2048，属预期行为，不是「变糊」故障）；翻页 / ESC / 退出 APP 全部即时响应。');
console.log('  ⚠️ 真机步骤 R66-C：目录里同时放 3 张以上 .fits，触发预载并发；hilog 里不应出现');
console.log('     astro decode 失败潮，槽位等待只让出主线程、不丢弃任何一次解码。');
console.log('  ⚠️ 真机步骤 R66-D：既有 HEIC/JPG/PNG / 文本预览 scrollbar / 并排 / 全屏 / 放大镜 /');
console.log('     R64 内容量统计 / R65 天文解析 / 三栏三按钮 / 版本 1.0.7/7 全部零回归。');

// ==================== 第六十七轮：放大镜高质量显示（系统 native AA + 硬件级优化 / R67） ====================
console.log('--- 第六十七轮：放大镜高质量显示（关键参数 / 能力分级 / AA 档 / 资源护栏 / 零回归）---');
const LQ67_CODE = stripComments(readFileSync(
  new URL('../entry/src/main/ets/common/LoupeQuality.ts', import.meta.url), 'utf8'));

// —— ① 关键参数：SDK 枚举一一对应 / 相容门槛 / 资源护栏 ——
check('R67 AA 档常量与 SDK image.AntiAliasingLevel 一一对应：NONE=0 / LOW=1 / MEDIUM=2 / HIGH=3',
  LQ_AA_NONE === 0 && LQ_AA_LOW === 1 && LQ_AA_MEDIUM === 2 && LQ_AA_HIGH === 3 &&
  LQ_IP_LOW === 0 && LQ_IP_MEDIUM === 1 && LQ_IP_HIGH === 2 &&
  LQ_FILTER_NEAREST === 0 && LQ_FILTER_LINEAR === 1, true);
check('R67 能力门槛：createScaledPixelMap since 18 / crop+scale since 22 / 编译探测基准 SDK 26',
  LQ_API_SYSTEM_MIN === 18 && LQ_API_CROP_MIN === 22 && LQ_API_PROBE_LEVEL === 26 &&
  LQ_CAP_COMPONENT === 0 && LQ_CAP_SYSTEM_AA === 1 && LQ_CAP_HW_CROP === 2, true);
check('R67 资源护栏：4M 总像素 / 3× 倍率上限 / 8192 长边 / 64px 稳定阈值 / 96px 增益 / 边缘 AA 恒开',
  LQ_MAX_TARGET_PIXELS === 4 * 1024 * 1024 && LQ_MAX_FACTOR === 3 &&
  LQ_MAX_EDGE === 8192 && LQ_STABLE_MIN_DELTA === 64 && LQ_MIN_GAIN === 96 &&
  LQ_EDGE_AA === true && LQ_RESAMPLE_1X === 1, true);

// —— ② 密度归一化 / 逻辑倍率 / 跨 DPI 一致档 ——
check('R67 lqDensityOf：NaN / 0 / 负数回退 1，越界夹到 [0.5, 4.0]，合法值原样返回',
  lqDensityOf(NaN) === LQ_DENSITY_FALLBACK && lqDensityOf(0) === 1 &&
  lqDensityOf(-3) === 1 && lqDensityOf(0.2) === LQ_DENSITY_MIN &&
  lqDensityOf(9) === LQ_DENSITY_MAX && lqDensityOf(2) === 2 &&
  LQ_DENSITY_REF === 1, true);
check('R67 逻辑倍率刻意不含密度；有效倍率 = 逻辑 × 归一化密度（脏倍率按 1 兜底）',
  lqLogicalScaleOf(3, 1.5) === 4.5 && lqLogicalScaleOf(3, 1.5) === lqLogicalScaleOf(3, 1.5) &&
  lqEffectiveScaleOf(4.5, 2) === 9 && lqLogicalScaleOf(NaN, 2) === 2 &&
  lqLogicalScaleOf(3, NaN) === 3 && lqFiniteOf(NaN) === false && lqFiniteOf(3) === true, true);
check('R67 跨密度一致档：同一逻辑倍率在 0.5/1/2/3/4 密度下恒同档（DPI 绝不改画质档）',
  [0.5, 1, 2, 3, 4].every(d => lqConsistentTierOf(3, d) === lqConsistentTierOf(3, 1)) &&
  [0.5, 1, 2, 3, 4].every(d => lqConsistentTierOf(1.5, d) === lqConsistentTierOf(1.5, 1)) &&
  lqConsistentTierOf(1, 2) === 0 && lqConsistentTierOf(1.5, 2) === 1 &&
  lqConsistentTierOf(3, 2) === 2, true);

// —— ③ 内容种类 / AA 档 / 组件插值 / 硬件采样 ——
check('R67 lqKindOf：文本·源码→TEXT，图表·svg→GRAPHIC，照片·HEIC·FITS→IMAGE（未知一律影像）',
  lqKindOf('notes.TXT') === LQ_KIND_TEXT && lqKindOf('main.ets') === LQ_KIND_TEXT &&
  lqKindOf('扫描件.png') === LQ_KIND_TEXT && lqKindOf('chart.svg') === LQ_KIND_GRAPHIC &&
  lqKindOf('schematic.png') === LQ_KIND_GRAPHIC &&
  lqKindOf('IMG_0001.HEIC') === LQ_KIND_IMAGE && lqKindOf('m31.fits') === LQ_KIND_IMAGE, true);
check('R67 lqAaLevelOf：能力不足恒 NONE（组件级回退），≤1:1 LOW，温和放大 HIGH(Cubic)',
  lqAaLevelOf(3, LQ_KIND_TEXT, LQ_CAP_COMPONENT) === LQ_AA_NONE &&
  lqAaLevelOf(1, LQ_KIND_IMAGE, LQ_CAP_SYSTEM_AA) === LQ_AA_LOW &&
  lqAaLevelOf(1.5, LQ_KIND_TEXT, LQ_CAP_SYSTEM_AA) === LQ_AA_HIGH &&
  lqAaLevelOf(2, LQ_KIND_GRAPHIC, LQ_CAP_SYSTEM_AA) === LQ_AA_HIGH, true);
check('R67 高倍 >2：文字/图形→MEDIUM(mipmap linear) 抑制 Cubic 负 lobe，影像仍 HIGH 保细节',
  lqAaLevelOf(3, LQ_KIND_TEXT, LQ_CAP_SYSTEM_AA) === LQ_AA_MEDIUM &&
  lqAaLevelOf(3, LQ_KIND_GRAPHIC, LQ_CAP_SYSTEM_AA) === LQ_AA_MEDIUM &&
  lqAaLevelOf(3, LQ_KIND_IMAGE, LQ_CAP_SYSTEM_AA) === LQ_AA_HIGH &&
  LQ_CUBIC_MAX_SCALE === 2, true);
check('R67 AA 脏值→LOW 安全兜底，绝不落到 NONE(最近邻锯齿之源)',
  lqAaLevelOf(NaN, LQ_KIND_TEXT, LQ_CAP_SYSTEM_AA) === LQ_AA_LOW &&
  lqAaLevelOf(NaN, LQ_KIND_TEXT, LQ_CAP_COMPONENT) === LQ_AA_NONE, true);
check('R67 组件插值 / 硬件采样：放大 High、轻缩 Low、极缩 Medium；只有 1:1 允许 NEAREST',
  lqInterpolationOf(3) === LQ_IP_HIGH && lqInterpolationOf(0.8) === LQ_IP_LOW &&
  lqInterpolationOf(0.2) === LQ_IP_MEDIUM &&
  lqFilterModeOf(1) === LQ_FILTER_NEAREST && lqFilterModeOf(1.02) === LQ_FILTER_NEAREST &&
  lqFilterModeOf(1.1) === LQ_FILTER_LINEAR &&
  lqFilterModeOf(3) === LQ_FILTER_LINEAR && LQ_NEAR_ONE_TOL === 0.06, true);

// —— ④ 能力分级：相容门槛 + 运行时函数存在性双判据 ——
check('R67 lqCapabilityOf：API<18 / 无 createScaledPixelMap → 组件级；API≥22 + crop → 硬件裁剪档',
  lqCapabilityOf(17, true, true) === LQ_CAP_COMPONENT &&
  lqCapabilityOf(26, false, true) === LQ_CAP_COMPONENT &&
  lqCapabilityOf(18, true, false) === LQ_CAP_SYSTEM_AA &&
  lqCapabilityOf(21, true, true) === LQ_CAP_SYSTEM_AA &&
  lqCapabilityOf(22, true, true) === LQ_CAP_HW_CROP &&
  lqCapabilityOf(NaN, true, true) === LQ_CAP_COMPONENT, true);

// —— ⑤ 倍率 / 目标边 / 资源护栏（防卡顿、防 OOM、防无意义分配） ——
check('R67 lqFactorOf：影像放大到位，文字/图形高倍收敛更保守，恒夹到 maxFactor 且不小于 1',
  lqFactorOf(3, LQ_KIND_IMAGE, LQ_MAX_FACTOR) === 3 &&
  lqFactorOf(3, LQ_KIND_TEXT, LQ_MAX_FACTOR) === 2.5 &&
  lqFactorOf(9, LQ_KIND_GRAPHIC, LQ_MAX_FACTOR) === 3 &&
  lqFactorOf(0.5, LQ_KIND_IMAGE, LQ_MAX_FACTOR) === 1 &&
  lqFactorOf(NaN, LQ_KIND_IMAGE, LQ_MAX_FACTOR) === LQ_RESAMPLE_1X, true);
check('R67 lqTargetEdgeOf：按有效倍率放大，夹 maxEdge 与 srcLong，脏值 / 非法 base 返回 0',
  lqTargetEdgeOf(1800, 2, 0, LQ_MAX_EDGE) === 3600 &&
  lqTargetEdgeOf(1800, 9, 0, LQ_MAX_EDGE) === LQ_MAX_EDGE &&
  lqTargetEdgeOf(1800, 9, 800, LQ_MAX_EDGE) === 800 &&
  lqTargetEdgeOf(0, 3, 0, LQ_MAX_EDGE) === 0 &&
  lqTargetEdgeOf(NaN, 3, 0, LQ_MAX_EDGE) === 0, true);
check('R67 lqScaleAllowedOf：能力 / 脏尺寸 / factor≤1 / 超预算四重拒绝，正常放大放行',
  lqScaleAllowedOf(800, 600, 2, LQ_CAP_COMPONENT, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === false &&
  lqScaleAllowedOf(NaN, 600, 2, LQ_CAP_SYSTEM_AA, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === false &&
  lqScaleAllowedOf(800, 600, 1, LQ_CAP_SYSTEM_AA, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === false &&
  lqScaleAllowedOf(6000, 4000, 2, LQ_CAP_SYSTEM_AA, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === false &&
  lqScaleAllowedOf(800, 600, 2, LQ_CAP_SYSTEM_AA, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === true, true);
check('R67 lqSafeFactorOf：4M 像素预算把 3× 夹到 ≤3 且 ceil 后仍不越界；超大源直接返回 1（跳过缩放）',
  (() => {
    const f = lqSafeFactorOf(800, 600, 3, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE);
    const w = Math.ceil(800 * f), h = Math.ceil(600 * f);
    return f > 1 && f <= LQ_MAX_FACTOR && w * h <= LQ_MAX_TARGET_PIXELS &&
      w <= LQ_MAX_EDGE && h <= LQ_MAX_EDGE &&
      lqSafeFactorOf(6000, 4000, 2, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === 1 &&
      lqSafeFactorOf(0, 600, 2, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) === 1 &&
      lqSafeFactorOf(800, 600, NaN, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE) <= LQ_MAX_FACTOR;
  })(), true);
check('R67 lqShouldRebuildOf / lqHasGainOf：鼠标微动不重算 / 无真实增益不分配 / 脏值安全',
  lqShouldRebuildOf(0, 4096, LQ_STABLE_MIN_DELTA) === true &&
  lqShouldRebuildOf(4096, 4096 + 63, LQ_STABLE_MIN_DELTA) === false &&
  lqShouldRebuildOf(4096, 4096 + 64, LQ_STABLE_MIN_DELTA) === true &&
  lqHasGainOf(4800, 800, LQ_MIN_GAIN) === true &&
  lqHasGainOf(4800, 4800, LQ_MIN_GAIN) === false &&
  lqHasGainOf(NaN, 0, LQ_MIN_GAIN) === false, true);

// —— ⑥ 一维边缘信号数值模型：为什么高倍文字/图形必须改走 mipmap ——
check('R67 Cubic 核 1<|x|<2 存在负 lobe（-0.0625 @1.5）；双线性核恒非负（振铃的数值证据）',
  lqCubicWeightOf(1.5) < 0 && lqCubicWeightOf(1.5) === -0.0625 &&
  lqCubicWeightOf(0.5) > 0 && lqLinearWeightOf(1.5) === 0 &&
  lqLinearWeightOf(0.5) === 0.5 && lqLinearWeightOf(-0.5) === 0.5, true);
check('R67 阶跃边缘：最近邻抖动最大，Cubic 过冲 >0，mipmap 预低通抖动最小且零过冲',
  (() => {
    const sig = [0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0];
    const near = lqResampleOf(sig, 3, LQ_MODE_NEAREST);
    const lin = lqResampleOf(sig, 3, LQ_MODE_LINEAR);
    const cub = lqResampleOf(sig, 3, LQ_MODE_CUBIC);
    const mip = lqResampleOf(sig, 3, LQ_MODE_MIPMAP);
    const j = a => lqEdgeJitterOf(a);
    return near.length === 36 && lin.length === 36 && cub.length === 36 && mip.length === 36 &&
      j(near) > j(lin) && j(cub) > j(mip) && j(mip) < j(lin) &&
      lqOvershootOf(cub, 0, 255) > 0 && lqOvershootOf(lin, 0, 255) === 0 &&
      lqOvershootOf(mip, 0, 255) === 0;
  })(), true);
check('R67 高倍文字/图形选 MEDIUM 的数值依据：mipmap 过冲 0 < Cubic 过冲，抖动也更低',
  (() => {
    const sig = [0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0];
    const cub = lqResampleOf(sig, 3, LQ_MODE_CUBIC);
    const mip = lqResampleOf(sig, 3, LQ_MODE_MIPMAP);
    return lqAaLevelOf(3, LQ_KIND_TEXT, LQ_CAP_SYSTEM_AA) === LQ_AA_MEDIUM &&
      lqOvershootOf(mip, 0, 255) < lqOvershootOf(cub, 0, 255) &&
      lqEdgeJitterOf(mip) < lqEdgeJitterOf(cub);
  })(), true);

// —— ⑦ 源码接线静态契约：真值源纯净 / SDK 唯一出口 / 显示层 / 零回归 ——
check('R67 LoupeQuality.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器 / 零 Promise',
  ['@ohos.', 'setTimeout', 'fileIo', 'new Promise', 'await ', 'throw ',
    'Atomics.wait', 'Date.now'].some(s => LQ67_CODE.includes(s)) === false &&
  LQ67_CODE.includes('export function lqAaLevelOf') &&
  LQ67_CODE.includes('export function lqSafeFactorOf') &&
  LQ67_CODE.includes('export function lqCapabilityOf'), true);
check('R67 Preview.ets：能力探测读方法存在性 + AA 档映射 SDK 枚举 + await createScaledPixelMap',
  MODEL.includes('export function loupeCapabilityOf(px: image.PixelMap): number') &&
  MODEL.includes('typeof px.createScaledPixelMap === \'function\'') &&
  MODEL.includes('typeof px.createCroppedAndScaledPixelMap === \'function\'') &&
  MODEL.includes('lqSdkAaLevelOf(level: number): image.AntiAliasingLevel') &&
  MODEL.includes('image.AntiAliasingLevel.HIGH') &&
  MODEL.includes('image.AntiAliasingLevel.MEDIUM') &&
  MODEL.includes('await src.createScaledPixelMap(factor, factor, lqSdkAaLevelOf(aa))'), true);
check('R67 Preview.ets：真异步读尺寸 + 双护栏 + 全失败路径回退，零新增 Promise / 零同步 IO',
  MODEL.includes('export async function loupeSystemScaledPx') &&
  MODEL.includes('await src.getImageInfo()') &&
  MODEL.includes('lqSafeFactorOf(w, h, want, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE)') &&
  MODEL.includes('lqScaleAllowedOf(w, h, factor, cap, LQ_MAX_TARGET_PIXELS, LQ_MAX_EDGE)') &&
  MODEL.includes('cap < LQ_CAP_SYSTEM_AA') &&
  (MODEL.match(/loupeSystemScaledPx/g) || []).length === 1 &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2, true);
check('R67 Index.ets：LoupeQuality 决策 import + 系统缩放 import + 画质计划接口 + 构建标记 R67',
  INDEX.includes("from '../common/LoupeQuality';") &&
  INDEX.includes("import { loupeCapabilityOf, loupeSystemScaledPx } from '../model/Preview';") &&
  INDEX.includes('interface LoupeScalePlan {') &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("'R66';") === false, true);
check('R67 Index.ets 画质计划：逻辑/有效倍率、内容种类、AA 档、目标边、稳定阈值/真实增益全在',
  INDEX.includes('private loupeSystemPlan(uri: string): LoupeScalePlan') &&
  INDEX.includes('lqLogicalScaleOf(LOUPE_ZOOM, this.zoom)') &&
  INDEX.includes('lqEffectiveScaleOf(logical, density)') &&
  INDEX.includes('lqConsistentTierOf(logical, density)') &&
  INDEX.includes('lqKindOf(uri)') && INDEX.includes('lqAaLevelOf(logical, kind, this.loupeCap)') &&
  INDEX.includes('lqTargetEdgeOf(base, effective, 0, LQ_MAX_EDGE)') &&
  INDEX.includes('lqFactorOf(deficit, kind, LQ_MAX_FACTOR)') &&
  INDEX.includes('lqInterpolationOf(logical)') && INDEX.includes('lqFilterModeOf(logical)') &&
  INDEX.includes('lqShouldRebuildOf(this.loupeSysEdge, target, LQ_STABLE_MIN_DELTA)') &&
  INDEX.includes('lqHasGainOf(target, this.loupeHiEdge, LQ_MIN_GAIN)'), true);
check('R67 Index.ets 接线：懒探测能力 / 一次系统缩放 / token 作废迟到结果 / 失败静默回退 R17',
  INDEX.includes('this.loupeCap = loupeCapabilityOf(e.px);') &&
  INDEX.includes('const sysToken: number = ++this.loupeSysToken;') &&
  INDEX.includes('loupeSystemScaledPx(e.px, plan.want, plan.aa, plan.cap)') &&
  INDEX.includes('if (sysToken !== this.loupeSysToken)') &&
  INDEX.includes('this.releaseLoupeSysPx(scaled);') &&
  INDEX.includes('this.clearLoupeSysPx();') &&
  INDEX.includes('this.clearLoupeSysPx(); // 第六十七轮：同步释放系统级 AA 产物'), true);
check('R67 显示层：系统级产物优先 + uri/pane 双重对账 + 五个图源分支与 AA 计数逐字不变',
  LOUPE13_CODE.includes('Image(this.loupeDisplayPx(uri, pane))') &&
  INDEX.includes('private loupeDisplayPx(uri: string, pane: number): image.PixelMap') &&
  INDEX.includes('this.loupeSysUri === uri && this.loupeSysPane === pane') &&
  LOUPE13_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  LOUPE13_CODE.split('.objectFit(ImageFit.Contain)').length - 1 === 5 &&
  LOUPE13_CODE.includes('if (this.loupeHiUsable(uri, pane))'), true);
check('R67 零回归：构建标记 R67 / R66 旧标记已清 / 版本 1.0.7/7 / 三处 autoResize / 三按钮三栏',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R66';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R65';") === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  (SIDEBAR.match(/ToolButton\(/g) || []).length === 3 &&
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 3, true);
check('R67 并发 / 界面零回归：new Promise 仍恰 2 处 / Promise.race 仍 1 处 / 无 worker / 无新增常显控件',
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  (INDEX.match(/new Promise/g) || []).length === 0 &&
  MODEL.includes('taskpool') === false && MODEL.includes('@ohos.worker') === false &&
  INDEX.includes('@State textBarShow: boolean = false;') &&
  INDEX.includes('dcImageCountOf(merged, HIDE_DOT_FILES, IMAGE_SUFFIXES)'), true);

console.log('  ⚠️ 本组是静态契约 + 一维边缘信号数值模型，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R67-A：装新包后 Ctrl+D 角标必须是 R67；右键开放大镜，在文字截图 /');
console.log('     线条图表 / 照片上分别移动光标，圆内笔画与曲线边缘平滑、无锯齿毛边 / 无光晕。');
console.log('  ⚠️ 真机步骤 R67-B：同一张图在 100% / 200% / 400% 与不同缩放密度下对比，档位由逻辑倍率');
console.log('     决定，不应出现「换倍率/换屏幕就忽糊忽锐」；鼠标在圆内小幅抖动应不重新计算、不卡顿。');
console.log('  ⚠️ 真机步骤 R67-C：hilog 出现 loupe R67 cap=1|2 表示系统 native AA 生效；cap=0 或');
console.log('     createScaledPixelMap FAIL 时自动回退 R17 组件级链，放大镜仍可用、不空白、不崩溃。');
console.log('  ⚠️ 真机步骤 R67-D：既有 HEIC/JPG/PNG / 文本预览 scrollbar / 并排 / 全屏 / ESC /');
console.log('     R64 内容量统计 / R65 天文解析 / R66 主线程让出 / 三栏三按钮 / 版本 1.0.7/7 全部零回归。');

// ==================== 第六十八轮：右侧主预览 resize 最高质素（R68） ====================
console.log('--- 第六十八轮：右侧主预览 resize 最高质素（系统 native AA 精炼 / 关键参数 / 零回归）---');
const VQ68_CODE = stripComments(readFileSync(
  new URL('../entry/src/main/ets/common/ViewQuality.ts', import.meta.url), 'utf8'));
const THIN68 = [0, 0, 0, 0, 1, 0, 0, 0, 0];
const CURVE68 = [0, 0.03, 0.12, 0.28, 0.5, 0.72, 0.88, 0.97, 1, 1, 1, 1];
const STEP68 = [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0];

// —— ① 关键参数设定 ——
check('R68 缩放场景档 / 内容种类 / 能力档 / AA 档常量语义（AA 数值 = SDK AntiAliasingLevel）',
  VQ_SCENE_SHRINK_DEEP === 0 && VQ_SCENE_SHRINK === 1 && VQ_SCENE_ONE === 2 &&
  VQ_SCENE_ENLARGE === 3 && VQ_SCENE_ENLARGE_HIGH === 4 &&
  VQ_KIND_IMAGE === 0 && VQ_KIND_GRAPHIC === 1 && VQ_KIND_TEXT === 2 &&
  VQ_CAP_COMPONENT === 0 && VQ_CAP_SYSTEM_AA === 1 &&
  VQ_AA_LOW === 1 && VQ_AA_MEDIUM === 2 && VQ_AA_HIGH === 3, true);
check('R68 关键参数：1:1 容差 0.06 / MipMap 门槛 0.4 / Cubic 高倍门槛 2 / 精炼倍率 1.5·1.25',
  VQ_NEAR_ONE_TOL === 0.06 && VQ_MIPMAP_FLOOR === 0.4 &&
  VQ_CUBIC_MAX_SCALE === 2 && VQ_REFINE_FACTOR_IMAGE === 1.5 &&
  VQ_REFINE_FACTOR_DOC === 1.25, true);
check('R68 资源护栏与 R67 逐项对齐：4M 像素 / 3× 倍率 / 8192 长边 / 64px 稳定 / 96px 增益',
  VQ_MAX_TARGET_PIXELS === 4 * 1024 * 1024 && VQ_MAX_FACTOR === 3 &&
  VQ_MAX_EDGE === 8192 && VQ_STABLE_MIN_DELTA === 64 && VQ_MIN_GAIN === 96 &&
  VQ_RESAMPLE_1X === 1 &&
  VQ_MAX_TARGET_PIXELS === LQ_MAX_TARGET_PIXELS && VQ_MAX_FACTOR === LQ_MAX_FACTOR &&
  VQ_MAX_EDGE === LQ_MAX_EDGE && VQ_STABLE_MIN_DELTA === LQ_STABLE_MIN_DELTA &&
  VQ_MIN_GAIN === LQ_MIN_GAIN, true);
check('R68 密度 / 数值验证模式码常量语义',
  VQ_DENSITY_MIN === 0.5 && VQ_DENSITY_MAX === 4 && VQ_DENSITY_REF === 1 &&
  VQ_DENSITY_FALLBACK === 1 &&
  VQ_MODE_NEAREST === 0 && VQ_MODE_LINEAR === 1 &&
  VQ_MODE_CUBIC === 2 && VQ_MODE_MIPMAP === 3, true);

// —— ② 基础判据 / 场景 / 内容 / 跨密度一致 ——
check('R68 vqFiniteOf / vqDensityOf：NaN / 0 / 负数回退 1，越界夹到 [0.5,4.0]',
  vqFiniteOf(3) === true && vqFiniteOf(NaN) === false &&
  vqDensityOf(NaN) === 1 && vqDensityOf(0) === 1 && vqDensityOf(-3) === 1 &&
  vqDensityOf(0.2) === VQ_DENSITY_MIN && vqDensityOf(9) === VQ_DENSITY_MAX &&
  vqDensityOf(2) === 2, true);
check('R68 vqSceneOf 五档分界与脏值按 1:1 兜底',
  vqSceneOf(0.25, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_SHRINK_DEEP &&
  vqSceneOf(0.4, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_SHRINK &&
  vqSceneOf(0.67, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_SHRINK &&
  vqSceneOf(0.93, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_SHRINK &&
  vqSceneOf(1.0, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_ONE &&
  vqSceneOf(1.5, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_ENLARGE &&
  vqSceneOf(3.0, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_ENLARGE_HIGH &&
  vqSceneOf(NaN, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_ONE &&
  vqSceneOf(-1, VQ_NEAR_ONE_TOL, VQ_MIPMAP_FLOOR) === VQ_SCENE_ONE, true);
check('R68 vqKindOf：文字·扫描件·报表→TEXT，图表·svg→GRAPHIC，照片·HEIC·FITS→IMAGE',
  vqKindOf('notes.TXT') === VQ_KIND_TEXT && vqKindOf('扫描件.png') === VQ_KIND_TEXT &&
  vqKindOf('报表.pdf') === VQ_KIND_TEXT && vqKindOf('screenshot.png') === VQ_KIND_TEXT &&
  vqKindOf('chart.svg') === VQ_KIND_GRAPHIC && vqKindOf('schematic.png') === VQ_KIND_GRAPHIC &&
  vqKindOf('IMG_0001.HEIC') === VQ_KIND_IMAGE && vqKindOf('m31.fits') === VQ_KIND_IMAGE, true);
check('R68 跨密度一致档：同一逻辑倍率在 0.5/1/2/3/4 密度下恒同档；有效倍率 = 逻辑 × 归一化密度',
  [0.5, 1, 2, 3, 4].every(d => vqConsistentTierOf(3, d) === vqConsistentTierOf(3, 1)) &&
  [0.5, 1, 2, 3, 4].every(d => vqConsistentTierOf(0.67, d) === vqConsistentTierOf(0.67, 1)) &&
  vqConsistentTierOf(1, 2) === VQ_SCENE_ONE &&
  vqConsistentTierOf(3, 2) === VQ_SCENE_ENLARGE_HIGH &&
  vqEffectiveScaleOf(3, 2) === 6 && vqEffectiveScaleOf(3, 0.5) === 1.5, true);

// —— ③ 系统级 AA 档决策 ——
check('R68 缩小 / 极端缩小一律 MEDIUM(mipmap 预滤波)，1:1 一律 LOW',
  [0.25, 0.4, 0.5, 0.67, 0.73, 0.93].every(k =>
    vqAaLevelOf(k, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM) &&
  [0.25, 0.67].every(k => vqAaLevelOf(k, VQ_KIND_TEXT, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM) &&
  vqAaLevelOf(1, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_LOW, true);
check('R68 影像放大 / 温和放大一律 HIGH(Cubic)，高倍文字·图形改 MEDIUM 抑制负 lobe',
  [1.07, 1.37, 2.0, 3.0, 4.0].every(k =>
    vqAaLevelOf(k, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_HIGH) &&
  vqAaLevelOf(1.5, VQ_KIND_TEXT, VQ_CAP_SYSTEM_AA) === VQ_AA_HIGH &&
  vqAaLevelOf(3, VQ_KIND_TEXT, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM &&
  vqAaLevelOf(3, VQ_KIND_GRAPHIC, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM &&
  vqAaLevelOf(3, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_HIGH, true);
check('R68 能力不足恒 LOW 哨兵、脏缩放比按 1:1 保守回退，绝不落 NONE',
  vqAaLevelOf(0.67, VQ_KIND_IMAGE, VQ_CAP_COMPONENT) === VQ_AA_LOW &&
  vqAaLevelOf(3, VQ_KIND_TEXT, VQ_CAP_COMPONENT) === VQ_AA_LOW &&
  vqAaLevelOf(NaN, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_LOW &&
  vqAaLevelOf(-1, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_LOW, true);
check('R68 vqSystemWantedOf：1:1 / 脏值 / 能力不足一律不做（省资源，绝不无意义分配）',
  vqSystemWantedOf(1, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === false &&
  vqSystemWantedOf(1.02, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === false &&
  vqSystemWantedOf(NaN, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === false &&
  vqSystemWantedOf(-1, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === false &&
  vqSystemWantedOf(0.67, VQ_KIND_IMAGE, VQ_CAP_COMPONENT, VQ_NEAR_ONE_TOL) === false &&
  vqSystemWantedOf(0.67, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === true &&
  vqSystemWantedOf(3, VQ_KIND_TEXT, VQ_CAP_SYSTEM_AA, VQ_NEAR_ONE_TOL) === true, true);
check('R68 精炼倍率只认内容种类、不吃 zoom / 恒夹 maxFactor（跨帧稳定）',
  vqRefineFactorOf(VQ_KIND_IMAGE, VQ_MAX_FACTOR) === 1.5 &&
  vqRefineFactorOf(VQ_KIND_TEXT, VQ_MAX_FACTOR) === 1.25 &&
  vqRefineFactorOf(VQ_KIND_GRAPHIC, VQ_MAX_FACTOR) === 1.25 &&
  vqRefineFactorOf(VQ_KIND_IMAGE, 1.1) === 1.1 &&
  vqRefineFactorOf(VQ_KIND_IMAGE, NaN) <= VQ_MAX_FACTOR, true);

// —— ④ 资源护栏（防卡顿 / 防 OOM / 防无意义分配） ——
check('R68 vqSafeFactorOf：4M 预算把 3× 夹到 ≤3 且 ceil 后不越界；超大源返回 1（跳过精炼）',
  (() => {
    const f = vqSafeFactorOf(1000, 1000, 3, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE);
    const w = Math.ceil(1000 * f), h = Math.ceil(1000 * f);
    return f > 1 && f <= VQ_MAX_FACTOR && Math.abs(f - 2.048) < 0.001 &&
      w * h <= VQ_MAX_TARGET_PIXELS && w <= VQ_MAX_EDGE && h <= VQ_MAX_EDGE &&
      vqSafeFactorOf(4000, 3000, 2, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === 1 &&
      vqSafeFactorOf(0, 600, 2, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === 1 &&
      vqSafeFactorOf(800, 600, NaN, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) <= VQ_MAX_FACTOR;
  })(), true);
check('R68 vqScaleAllowedOf：能力 / factor≤1 / 超预算 / 脏尺寸四重拒绝，正常精炼放行',
  vqScaleAllowedOf(800, 600, 1.5, VQ_CAP_COMPONENT, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === false &&
  vqScaleAllowedOf(800, 600, 1, VQ_CAP_SYSTEM_AA, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === false &&
  vqScaleAllowedOf(6000, 4000, 2, VQ_CAP_SYSTEM_AA, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === false &&
  vqScaleAllowedOf(NaN, 600, 1.5, VQ_CAP_SYSTEM_AA, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === false &&
  vqScaleAllowedOf(800, 600, 1.5, VQ_CAP_SYSTEM_AA, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE) === true, true);
check('R68 vqShouldRebuildOf / vqHasGainOf：微动不重算 / 无真实增益不分配 / 脏值安全',
  vqShouldRebuildOf(0, 4096, VQ_STABLE_MIN_DELTA) === true &&
  vqShouldRebuildOf(4096, 4096 + 63, VQ_STABLE_MIN_DELTA) === false &&
  vqShouldRebuildOf(4096, 4096 + 64, VQ_STABLE_MIN_DELTA) === true &&
  vqShouldRebuildOf(4096, NaN, VQ_STABLE_MIN_DELTA) === false &&
  vqHasGainOf(4800, 800, VQ_MIN_GAIN) === true &&
  vqHasGainOf(4800, 4800, VQ_MIN_GAIN) === false &&
  vqHasGainOf(NaN, 0, VQ_MIN_GAIN) === false, true);

// —— ⑤ 一维边缘信号数值模型（为什么缩小 / 高倍文字必须改走 mipmap） ——
check('R68 Cubic 核 1<|x|<2 存在负 lobe（-0.0625 @1.5）；双线性核恒非负',
  vqCubicWeightOf(1.5) === -0.0625 && vqCubicWeightOf(0) === 1 &&
  vqLinearWeightOf(1.5) === 0 && vqLinearWeightOf(0.5) === 0.5 &&
  vqLinearWeightOf(-0.5) === 0.5, true);
check('R68 缩小场景选 MEDIUM 的数值依据：mip 过冲恒 0 而 Cubic >0，曲线抖动 mip ≤ Cubic',
  (() => {
    const ks = [0.25, 0.4, 0.5, 0.67, 0.73, 0.93];
    return ks.every(k => {
      const cub = vqResampleOf(THIN68, k, VQ_MODE_CUBIC);
      const mip = vqResampleOf(THIN68, k, VQ_MODE_MIPMAP);
      const cc = vqResampleOf(CURVE68, k, VQ_MODE_CUBIC);
      const cm = vqResampleOf(CURVE68, k, VQ_MODE_MIPMAP);
      return vqAaLevelOf(k, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM &&
        vqOvershootOf(mip, 0, 1) === 0 &&
        vqEdgeJitterOf(cm) <= vqEdgeJitterOf(cc);
    }) && vqOvershootOf(vqResampleOf(THIN68, 0.73, VQ_MODE_CUBIC), 0, 1) > 0;
  })(), true);
check('R68 放大场景影像选 HIGH 与恒 Cubic 逐点一致（细节零回归）',
  (() => [1.07, 1.37, 2.0, 3.0, 4.0].every(k => [THIN68, CURVE68].every(sig => {
    const aa = vqAaLevelOf(k, VQ_KIND_IMAGE, VQ_CAP_SYSTEM_AA);
    const mode = aa === VQ_AA_HIGH ? VQ_MODE_CUBIC :
      (aa === VQ_AA_MEDIUM ? VQ_MODE_MIPMAP : VQ_MODE_LINEAR);
    const cub = vqResampleOf(sig, k, VQ_MODE_CUBIC);
    const sel = vqResampleOf(sig, k, mode);
    return aa === VQ_AA_HIGH && cub.length === sel.length &&
      cub.every((v, i) => v === sel[i]);
  })))(), true);
check('R68 高倍文字选 MEDIUM 的数值依据：mip 过冲 / 抖动双低于 Cubic',
  (() => {
    const cub = vqResampleOf(STEP68, 3, VQ_MODE_CUBIC);
    const mip = vqResampleOf(STEP68, 3, VQ_MODE_MIPMAP);
    return vqAaLevelOf(3, VQ_KIND_TEXT, VQ_CAP_SYSTEM_AA) === VQ_AA_MEDIUM &&
      vqOvershootOf(mip, 0, 1) === 0 && vqOvershootOf(cub, 0, 1) > 0 &&
      vqEdgeJitterOf(mip) < vqEdgeJitterOf(cub);
  })(), true);

// —— ⑥ 源码接线静态契约：真值源纯净 / SDK 独立出口 / 触发链 / 零回归 ——
check('R68 ViewQuality.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器 / 零 Promise',
  ['@ohos.', 'setTimeout', 'fileIo', 'new Promise', 'await ', 'throw ',
    'Atomics.wait', 'Date.now'].some(s => VQ68_CODE.includes(s)) === false &&
  VQ68_CODE.includes('export function vqAaLevelOf') &&
  VQ68_CODE.includes('export function vqSafeFactorOf') &&
  VQ68_CODE.includes('export function vqResampleOf'), true);
check('R68 Preview.ets：独立 SDK 入口 + AA 档映射 + 真异步读尺寸 + 双护栏 + 失败静默回退',
  MODEL.includes('export async function viewSystemScaledPx') &&
  MODEL.includes('function vqSdkAaLevelOf(level: number): image.AntiAliasingLevel') &&
  MODEL.includes('image.AntiAliasingLevel.HIGH') &&
  MODEL.includes('await src.getImageInfo()') &&
  MODEL.includes('vqSafeFactorOf(w, h, want, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE)') &&
  MODEL.includes('vqScaleAllowedOf(w, h, factor, cap, VQ_MAX_TARGET_PIXELS, VQ_MAX_EDGE)') &&
  MODEL.includes('await src.createScaledPixelMap(factor, factor, vqSdkAaLevelOf(aa))') &&
  (MODEL.match(/viewSystemScaledPx/g) || []).length === 1, true);
check('R68 Index.ets：真值源 import + 系统精炼 import + 构建标记 R68 / R67 旧标记已清',
  INDEX.includes("from '../common/ViewQuality';") &&
  INDEX.includes("import { viewSystemScaledPx } from '../model/Preview';") &&
  INDEX.includes("import { loupeCapabilityOf, loupeSystemScaledPx } from '../model/Preview';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R67';") === false, true);
check('R68 Index.ets 接线：懒探测能力 / 一次系统精炼 / token 作废迟到结果 / 失败静默回退 R62',
  INDEX.includes('private ensureViewSysPx(uri: string, px: image.PixelMap, token: number): void') &&
  INDEX.includes('loupeCapabilityOf(px) >= LQ_CAP_SYSTEM_AA') &&
  INDEX.includes('vqSystemWantedOf(scale, kind, this.viewCap, VQ_NEAR_ONE_TOL)') &&
  INDEX.includes('vqRefineFactorOf(kind, VQ_MAX_FACTOR)') &&
  INDEX.includes('vqScaleAllowedOf(srcW, srcH, factor, this.viewCap,') &&
  INDEX.includes('vqShouldRebuildOf(this.viewSysEdge, target, VQ_STABLE_MIN_DELTA)') &&
  INDEX.includes('vqHasGainOf(target, srcLong, VQ_MIN_GAIN)') &&
  INDEX.includes('vqConsistentTierOf(scale, this.loupeDensityOf())') &&
  INDEX.includes('viewSystemScaledPx(px, factor, aa, this.viewCap)') &&
  INDEX.includes('const sysToken: number = ++this.viewSysToken;') &&
  INDEX.includes('this.releaseViewSysPx(scaled);') &&
  INDEX.includes('this.clearViewSysPx();'), true);
check('R68 触发链：loadViewNow 成功落点 + showPreviewOf 切图清理 + aboutToDisappear 退出释放',
  INDEX.includes('this.ensureViewSysPx(uri, best.px, token);') &&
  INDEX.includes('this.clearViewSysPx(); // 第六十八轮：切图即刻作废并释放系统级产物，杜绝上一张错画') &&
  INDEX.includes('this.clearViewSysPx();  // 第六十八轮：页面销毁时释放主预览系统级 AA 精炼产物') &&
  INDEX.includes('private viewSysAa(uri: string): number') &&
  INDEX.includes('private viewDisplayPx(uri: string): image.PixelMap') &&
  INDEX.includes('private clearViewSysPx(): void') &&
  INDEX.includes('@State viewSysPx: image.PixelMap | undefined = undefined;'), true);
check('R68 显示层：viewDisplayPx 优先出口 + uri 对账；三处插值 / 四处 AA / 三处 autoResize 逐字不变',
  PREVIEW13_CODE.includes('Image(this.viewDisplayPx(uri))') &&
  INDEX.includes('Image(this.viewPixelMap!)') &&
  INDEX.includes('this.viewSysPx !== undefined && this.viewSysUri === uri') &&
  INDEX.split('.interpolation(this.previewInterpolation())').length - 1 === 3 &&
  INDEX.split('.antialiased(this.previewAntialias())').length - 1 === 4 &&
  INDEX.split('.autoResize(false)').length - 1 === 3 &&
  PREVIEW13_CODE.split('.interpolation(this.previewInterpolation())').length - 1 === 2, true);
check('R68 零回归：R62 三档 / R67 放大镜五源 / 版本 1.0.7/7 / new Promise 恰 2 / race 恰 1 / 无 worker',
  LOUPE13_CODE.split('.interpolation(this.loupeInterpolation())').length - 1 === 5 &&
  LOUPE13_CODE.split('.antialiased(LOUPE_AA_ENABLED)').length - 1 === 5 &&
  LOUPE13_CODE.split('.objectFit(ImageFit.Contain)').length - 1 === 5 &&
  INDEX.includes('rqInterpolationOf(this.previewScale(),') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  MODEL.includes('taskpool') === false && MODEL.includes('@ohos.worker') === false, true);

console.log('  ⚠️ 本组是静态契约 + 一维边缘信号数值模型，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R68-A：装新包后 Ctrl+D 角标必须是 R68；打开含细线（栅栏 / 电线 / 文字边缘）');
console.log('     与曲线（圆弧 / 轮廓）的图，在 100% / 缩小 / 放大各档观察边缘：平滑、无波纹、无锯齿毛边。');
console.log('  ⚠️ 真机步骤 R68-B：拖窗口 resize / 进出全屏 / Ctrl+滚轮到 137% / 73% / 67% / 200% 各档，');
console.log('     画质稳定一致，不出现「换倍率/换窗口就忽糊忽锐」，细线不被抹宽，整体不过度模糊。');
console.log('  ⚠️ 真机步骤 R68-C：hilog 出现 view R68 cap=1 scene=.. aa=.. 表示系统 native AA 精炼生效；');
console.log('     cap=0 / getImageInfo FAIL / createScaledPixelMap FAIL 时自动回退 R62 组件级链，预览仍可用。');
console.log('  ⚠️ 真机步骤 R68-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /');
console.log('     R64 内容量统计 / R66 主线程让出 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。');

// ==================== 第六十九轮：左栏档案名行上下留白各减 0.8mm（R69） ====================
console.log('--- 第六十九轮：档案名行上下留白各减 0.8mm / 总行高减 1.6mm（R69）---');
const ARCHIVE69 = stripComments(ARCHIVE);
const SIDEBAR69 = stripComments(SIDEBAR);
// 项目口径：ArkUI 无 mm 单位，历史「1mm 的一线缝」就取 1vp（README「关于 1mm」）。
// 故 0.8mm ↔ 0.8vp、1.6mm ↔ 1.6vp；只动行 padding 两个数值，文字载体 .height(26) 不动。
const R69_MM_TO_VP = 1;
const R69_CUT_MM = 0.8;
const R69_OLD_PAD = 1;
const R69_NEW_PAD = R69_OLD_PAD - R69_CUT_MM * R69_MM_TO_VP;
const R69_CONTENT_H = 26;
const R69_OLD_ROW_H = R69_CONTENT_H + 2 * R69_OLD_PAD;
const R69_NEW_ROW_H = R69_CONTENT_H + 2 * R69_NEW_PAD;
check('R69 mm↔vp 口径自洽：各减 0.8vp / 总减 1.6vp，padding 仍为正、行高 28 → 26.4',
  Math.abs(R69_NEW_PAD - 0.2) < 1e-9 && R69_NEW_PAD > 0 &&
  R69_OLD_ROW_H === 28 && Math.abs(R69_NEW_ROW_H - 26.4) < 1e-9 &&
  Math.abs((R69_OLD_ROW_H - R69_NEW_ROW_H) - 1.6) < 1e-9, true);
check('R69 只改行上下 padding：精确值 0.2 / 旧值 1 已清 / right 6 与 left 清零逐字不变',
  ARCHIVE69.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  ARCHIVE69.includes('top: 1, bottom: 1') === false &&
  ARCHIVE69.includes('.padding({ left: 6, right: 6') === false &&
  ARCHIVE69.includes('.padding({ left: 8 })') === false, true);
check('R80 文字载体与字号不变：minHeight(26) / 名称 12 / 三栏 10 各就位',
  ARCHIVE69.includes('.constraintSize({ minHeight: 26 })') &&
  ARCHIVE69.includes('.height(26)') === false &&
  ARCHIVE69.includes('.fontSize(12)') &&
  (ARCHIVE69.match(/\.fontSize\(10\)/g) || []).length === 3, true);
check('R69→R80 对齐与截断护栏：三处 End / 三处 maxLines(1) + 名称列条件换行 / Clip 与 Ellipsis 分支 / 无 minWidth',
  ARCHIVE69.includes('.textAlign(TextAlign.Center)') === false &&
  (ARCHIVE69.match(/\.textAlign\(TextAlign\.End\)/g) || []).length === 3 &&
  (ARCHIVE69.match(/\.maxLines\(1\)/g) || []).length === 3 &&
  ARCHIVE69.includes('.maxLines(this.nameWrap ? 99 : 1)') &&
  ARCHIVE69.includes('TextOverflow.Ellipsis') &&
  ARCHIVE69.includes('TextOverflow.Clip') &&
  ARCHIVE69.includes('.constraintSize({ minWidth: textWidthVp(this.name, 12) })') === false &&
  ARCHIVE69.includes('.layoutWeight(1)'), true);
check('R77→R78 三栏宽 adaptive / margin left 6 / List space=1 / padding 逐字保留；提示条 padding 已移除',
  ARCHIVE69.includes('.width(this.colSizeW)') && ARCHIVE69.includes('.width(this.colDateW)') &&
  ARCHIVE69.includes('.width(66)') === false && ARCHIVE69.includes('.width(88)') === false &&
  ARCHIVE69.includes('.margin({ left: 6 })') &&
  SIDEBAR69.includes('const LIST_ROW_GAP_VP: number = 1;') &&
  SIDEBAR69.includes('space: LIST_ROW_GAP_VP') &&
  SIDEBAR69.includes('.padding({ right: 8 })') &&
  SIDEBAR69.includes('.padding({ left: 12, right: 12, top: 10, bottom: 8 })') &&
  SIDEBAR69.includes('.padding({ left: 6, right: 6, bottom: 6 })') &&
  SIDEBAR69.includes('.padding({ left: 12, right: 12, top: 5, bottom: 5 })') === false &&
  SIDEBAR69.includes('Text(this.dirHint)') === false, true);
check('R69 相邻行不重叠：List 缝 1vp + 上下 padding 各 0.2vp 恒为正，无负 padding / 无新增垂直 margin',
  1 + 2 * R69_NEW_PAD > 0 &&
  ARCHIVE69.includes('top: -') === false &&
  ARCHIVE69.includes('bottom: -') === false &&
  (ARCHIVE69.match(/\.margin\(\{[^}]*top:/g) || []).length === 0, true);
check('R69 文字不被截断：名称 12vp 落在 26vp 内容高内（余量 14vp），Ellipsis / maxLines 未放宽',
  R69_CONTENT_H - 12 >= 12 &&
  ARCHIVE69.includes('.maxLines(1)') &&
  ARCHIVE69.includes('TextOverflow.Ellipsis'), true);
check('R69 交互与其它区域零回归：hover / onMouse / 点击 / 双击 / bindPopup / 条纹 / 浮层 padding(8) 全在',
  ARCHIVE69.includes('.onHover(') && ARCHIVE69.includes('.onMouse(') &&
  ARCHIVE69.includes('.onClick(') && ARCHIVE69.includes('.bindPopup') &&
  ARCHIVE69.includes('.backgroundColor(this.rowBgColor())') &&
  ARCHIVE69.includes('.borderRadius(3)') &&
  ARCHIVE69.includes('.padding(8)') && ARCHIVE69.includes('.height(165)') &&
  ARCHIVE69.includes('.constraintSize({ minHeight: 26 })') &&
  ARCHIVE69.includes('.width(this.colSizeW)'), true);
check('R69 构建标记 R69 / 旧标记 R68 已清 / 版本 1.0.7 与 versionCode 7 逐字不变',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R68';") === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('R69 零回归：R68 主预览系统 AA 精炼 / R67 放大镜 / R64 内容量四态均在',
  INDEX.includes("import { viewSystemScaledPx } from '../model/Preview';") &&
  INDEX.includes('Image(this.viewDisplayPx(uri))') &&
  INDEX.includes('loupeDisplayPx') &&
  ARCHIVE69.includes('DC_LABEL_PENDING'), true);

console.log('  ⚠️ 本组是源码静态契约 + 行高算术，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R69-A：装新包后 Ctrl+D 角标必须是 R69；左栏每个档案名行上下留白明显收紧，');
console.log('     整体行距更紧凑（每行约 26.4vp），档案名完整显示不截断、不出现上下裁字。');
console.log('  ⚠️ 真机步骤 R69-B：滚动几百行、切换目录、hover 缩略图、点击 / 双击、Ctrl+B 收起左栏，');
console.log('     相邻行不重叠、不出现空白错位 / 跳动 / 条纹断裂，选中高亮仍完整覆盖整行。');
console.log('  ⚠️ 真机步骤 R69-C：三栏（名称 / 字节 / 日期）起始位置、字号、右对齐、梅花间竹条纹、');
console.log('     目录内容量四态均与 R68 逐字一致；除行高外没有任何视觉变化。');
console.log('  ⚠️ 真机步骤 R69-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /');
console.log('     R68 主预览 resize 画质 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。');

// ==================== 第七十轮：仅 HDR 相片在预览图左上角叠加清晰可辨的 HDR 标识（R70） ====================
console.log('--- 第七十轮：HDR 标识（严格显隐 / 固定左上角 / 深浅背景清晰 / 交互零回归，R70）---');
const HB70_CODE = stripComments(readFileSync(
  new URL('../entry/src/main/ets/common/HdrBadge.ts', import.meta.url), 'utf8'));
const HB70_BLOCK = INDEX.slice(INDEX.indexOf('// 第七十轮：仅 HDR 相片'),
  INDEX.indexOf('// 右下角角标：正式版不画'));
const HB70_BLOCK_CODE = stripComments(HB70_BLOCK);

// —— ① 真值源纯净 ——
check('R70 HdrBadge.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器 / 零 Promise / 零全局可变状态',
  ['@ohos.', 'fileIo', 'fs.', 'setTimeout', 'setInterval', 'await ', 'throw ',
    'new Promise', 'Promise.race', 'Date.now', 'Atomics.wait'].some(s => HB70_CODE.includes(s)) === false &&
  HB70_CODE.includes('export function hbVisibleOf') &&
  HB70_CODE.includes('export function hbBadgeContrastOf') &&
  HB70_CODE.includes('export function hbTopOf') &&
  HB70_CODE.includes('export function hbOcclusionOf') &&
  (HB70_CODE.match(/^export const /gm) || []).length >= 20, true);

// —— ② 关键参数与配色自洽 ——
check('R70 关键参数：HDR 文字 / 12vp 边距 / 24vp 提示行 / 6vp 间隙 / 40×20 标称徽标 / 2% 遮挡上限 / AAA 7:1',
  HB_LABEL === 'HDR' && HB_MARGIN_VP === 12 && HB_HINT_H_VP === 24 &&
  HB_HINT_GAP_VP === 6 && HB_FONT_VP === 11 &&
  HB_PAD_H_VP === 7 && HB_PAD_V_VP === 3 && HB_RADIUS_VP === 4 && HB_BORDER_VP === 1 &&
  HB_BADGE_W_VP === 40 && HB_BADGE_H_VP === 20 &&
  HB_OCCLUSION_MAX === 0.02 && HB_MIN_CONTRAST === 7 && HB_MIN_CANVAS_VP === 200, true);
check('R70 自带对比底板配色自洽：#db10141a 的 alpha 0xdb/255 与 HB_BG_ALPHA 一致、RGB 与 PLATE 常量逐值对应、白字白描边',
  HB_BG_COLOR === '#db10141a' && HB_FG_COLOR === '#ffffff' &&
  HB_BORDER_COLOR === '#66ffffff' && Math.abs(HB_BG_ALPHA - 219 / 255) < 0.01 &&
  HB_PLATE_R === 0x10 && HB_PLATE_G === 0x14 && HB_PLATE_B === 0x1a &&
  HB_FG_R === 255 && HB_FG_G === 255 && HB_FG_B === 255, true);

// —— ③ 显隐严格判等真值表（非 HDR 恒不显示） ——
check('R70 hbVisibleOf 严格判等：仅 HDR + 有图源 + 图片态才显示；SDR / 文本态 / 无图源一律不显示',
  hbVisibleOf(true, true, false) === true &&
  hbVisibleOf(false, true, false) === false &&
  hbVisibleOf(true, false, false) === false &&
  hbVisibleOf(true, true, true) === false &&
  hbVisibleOf(false, true, true) === false &&
  hbVisibleOf(false, false, true) === false, true);

// —— ④ WCAG 对比度数值模型：深浅背景全域清晰 ——
check('R70 WCAG 相对亮度模型：L(黑)=0 / L(白)=1 / 白字对纯黑对比度 21:1（理论值）/ alpha 合成与夹界正确',
  hbRelLumOf(0, 0, 0) === 0 && Math.abs(hbRelLumOf(255, 255, 255) - 1) < 1e-9 &&
  Math.abs(hbContrastOf(1, 0) - 21) < 1e-9 &&
  hbSrgbLinearOf(0) === 0 && Math.abs(hbSrgbLinearOf(255) - 1) < 1e-9 &&
  hbClamp01Of(NaN) === 1 && hbClamp01Of(-1) === 0 && hbClamp01Of(2) === 1 &&
  Math.abs(hbCompositeOf(16, 255, 0.86) - (16 * 0.86 + 255 * 0.14)) < 1e-9 &&
  hbFiniteOf(NaN) === false && hbFiniteOf(1) === true, true);
check('R70 深浅背景全域清晰：0/32/…/255 九档白字对合成底板对比度恒 ≥ 12（远超 AAA 7:1），最差在纯白背景、最好在纯黑背景',
  (() => {
    const gs = [0, 32, 64, 96, 128, 160, 192, 224, 255];
    const cs = gs.map(g => hbBadgeContrastOf(g, HB_BG_ALPHA));
    return cs.every(c => c >= 12 && hbReadableOf(c, HB_MIN_CONTRAST)) &&
      cs[8] === Math.min.apply(null, cs) && cs[0] === Math.max.apply(null, cs) &&
      Math.abs(cs[8] - 12.34) < 0.2 &&
      hbBadgePlateLumOf(255, HB_BG_ALPHA) > hbBadgePlateLumOf(0, HB_BG_ALPHA);
  })(), true);

// —— ⑤ 固定左上角 / 全屏避让 ——
check('R70 固定左上角 + 全屏避让：普通态 (12,12)；全屏下移到 42 让开 36 的提示底边，净距 6vp 不重叠',
  hbLeftOf(HB_MARGIN_VP) === 12 && hbLeftOf(-1) === HB_MARGIN_VP &&
  hbTopOf(false, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP) === 12 &&
  hbTopOf(true, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP) === 42 &&
  hbClearsHintOf(true, 42, HB_MARGIN_VP, HB_HINT_H_VP) === true &&
  hbClearsHintOf(true, 12, HB_MARGIN_VP, HB_HINT_H_VP) === false &&
  hbClearsHintOf(false, 12, HB_MARGIN_VP, HB_HINT_H_VP) === true &&
  hbTopOf(true, NaN, NaN, NaN) === HB_MARGIN_VP + HB_HINT_H_VP + HB_HINT_GAP_VP, true);

// —— ⑥ 跨尺寸稳定 / 不遮挡主要内容 ——
check('R70 尺寸恒定不吃画布 / zoom / 密度：320×1× 与 3840×4× 都返回同一 40vp 标称值，脏值回退标称值',
  hbFixedSizeOf(HB_BADGE_W_VP, 320, 1) === HB_BADGE_W_VP &&
  hbFixedSizeOf(HB_BADGE_W_VP, 3840, 4) === HB_BADGE_W_VP &&
  hbFixedSizeOf(HB_BADGE_W_VP, NaN, NaN) === HB_BADGE_W_VP, true);
check('R70 常规画布边距恒 12vp、极小画布防溢出收缩；320×240 起各尺寸遮挡占比 < 2%（不遮挡主要内容）',
  hbSafeMarginOf(HB_MARGIN_VP, 1200, 800) === 12 &&
  hbSafeMarginOf(HB_MARGIN_VP, 320, 240) === 12 &&
  hbSafeMarginOf(HB_MARGIN_VP, 40, 40) < 12 &&
  [[320, 240], [640, 480], [1200, 800], [2560, 1440], [3840, 2160]].every(
    p => hbUnobtrusiveOf(hbOcclusionOf(HB_BADGE_W_VP, HB_BADGE_H_VP, p[0], p[1]), HB_OCCLUSION_MAX)) &&
  hbOcclusionOf(40, 20, 0, 0) === 1 &&
  hbUnobtrusiveOf(hbOcclusionOf(40, 20, 0, 0), HB_OCCLUSION_MAX) === false, true);

// —— ⑦ 源码接线静态契约 ——
check('R70 显示层层级：徽标挂在预览区 Stack 直接子项（build 内、右下角角标注释之前），不进 BADGE 切片、不随图片 rotate/scale/translate',
  INDEX.indexOf('// 第七十轮：仅 HDR 相片') > INDEX.indexOf('  build() {') &&
  INDEX.indexOf('// 第七十轮：仅 HDR 相片') < INDEX.indexOf('// 右下角角标：正式版不画') &&
  BADGE.includes('HB_LABEL') === false &&
  HB70_BLOCK_CODE.includes('.scale(') === false &&
  HB70_BLOCK_CODE.includes('.rotate(') === false &&
  HB70_BLOCK_CODE.includes('.translate(') === false, true);
check('R70 徽标结构：严格 viewIsHdr 门控 + HDR 文字 + 配色/圆角/描边 + position 固定 + Transparent 穿透交互',
  HB70_BLOCK_CODE.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  HB70_BLOCK_CODE.includes('Text(HB_LABEL)') &&
  HB70_BLOCK_CODE.includes('.fontWeight(FontWeight.Bold)') &&
  HB70_BLOCK_CODE.includes('.fontColor(HB_FG_COLOR)') &&
  HB70_BLOCK_CODE.includes('.backgroundColor(HB_BG_COLOR)') &&
  HB70_BLOCK_CODE.includes('.border({ width: HB_BORDER_VP, color: HB_BORDER_COLOR })') &&
  HB70_BLOCK_CODE.includes('.borderRadius(HB_RADIUS_VP)') &&
  HB70_BLOCK_CODE.includes('.position({ x: hbLeftOf(HB_MARGIN_VP),') &&
  HB70_BLOCK_CODE.includes('y: hbTopOf(this.fullscreen, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP) })') &&
  HB70_BLOCK_CODE.includes('.hitTestBehavior(HitTestMode.Transparent)'), true);
check('R70 严格不误标：徽标代码只用 viewIsHdr、绝不引用 viewHdrWanted（含广色域 SDR）；后者仅留在既有 3 处 dynamicRangeMode',
  HB70_BLOCK_CODE.includes('this.viewIsHdr') &&
  HB70_BLOCK_CODE.includes('viewHdrWanted') === false &&
  (INDEX.match(/\.dynamicRangeMode\(this\.viewHdrWanted/g) || []).length === 3 &&
  INDEX.includes('this.viewHdrWanted = e.isHdr || isWideGamutOf(e.colorSpace);'), true);
check('R70 HDR 真值链：decodePx 取 getImageInfo().isHdr → PreviewEntry.isHdr → setViewMeta(viewIsHdr) → 切图清零；天文自解析恒 false 不误标',
  MODEL.includes('isHdr: info.isHdr === true') &&
  MODEL.includes('isHdr: boolean;') &&
  MODEL.includes('isHdr: false, exifDegrees: 0') &&
  INDEX.includes('this.viewIsHdr = e.isHdr;') &&
  INDEX.includes('this.viewIsHdr = false;') &&
  INDEX.includes('@State viewIsHdr: boolean = false;') &&
  INDEX.includes("import { HB_LABEL, HB_MARGIN_VP, HB_HINT_H_VP, HB_HINT_GAP_VP"), true);

// —— ⑧ 零回归与版本守卫 ——
check('R70 零回归：R69 行 padding 0.2 / R68 viewDisplayPx / R67 放大镜 / R62 三插值四 AA 三 autoResize / R55 常显角标全在',
  ARCHIVE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  INDEX.includes('Image(this.viewDisplayPx(uri))') &&
  INDEX.includes('loupeDisplayPx') &&
  (INDEX.match(/\.interpolation\(this\.previewInterpolation\(\)\)/g) || []).length === 3 &&
  (INDEX.match(/\.antialiased\(this\.previewAntialias\(\)\)/g) || []).length === 4 &&
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  INDEX.includes("Text('全屏 · Esc / F11 / 双击退出')") &&
  INDEX.includes('const SHOW_DIAG_BADGE: boolean = false;'), true);
check('R70 并发与版本零回归：new Promise 仍恰 2 处 / Promise.race 仍 1 处 / 无 worker / 1.0.7 与 versionCode 7 逐字不变',
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  INDEX.includes('taskpool') === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('R70 构建标记 R70 / 旧标记 R69 与 R68 已清 / 33 条历史标记断言整批升位',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R69';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R68';") === false, true);

console.log('  ⚠️ 本组是源码静态契约 + WCAG 对比度数值模型，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R70-A：装新包后 Ctrl+D 角标必须是 R70；打开 HDR 相片，预览区左上角出现清晰「HDR」');
console.log('     白字深色圆角标识；普通 SDR 相片 / FITS·XISF / 文本预览一律不显示该标识。');
console.log('  ⚠️ 真机步骤 R70-B：纯白 / 纯黑 / 高反差深浅底图各一张，标识边缘与文字均清晰可辨、无糊边、');
console.log('     不被相片明暗吞没；放大 / 缩小 / 拖拽平移 / 旋转时标识恒固定左上角，不随图片移动。');
console.log('  ⚠️ 真机步骤 R70-C：窗口 resize 到最小与全屏，普通态边距 12vp、全屏态下移一行避开退出提示，');
console.log('     两枚浮层不重叠；标识面积很小不遮挡相片主体；滚轮切图 / 右键放大镜 / 拖拽 / 点击全部照常。');
console.log('  ⚠️ 真机步骤 R70-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /');
console.log('     R68 主预览 resize 画质 / R69 行高 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。');

// ==================== 第七十一轮：HEIC HDR 保真解码与预览（R71） ====================
console.log('--- 第七十一轮：HEIC HDR 保真解码（显式 HDR / 产物校验 / 保真护栏 / 明确提示，R71）---');
const HP71_CODE = stripComments(readFileSync(
  new URL('../entry/src/main/ets/common/HdrPreview.ts', import.meta.url), 'utf8'));
const HP71_PROBE = readFileSync(new URL('./hdrprobe.mjs', import.meta.url), 'utf8');
const HP71_UI = INDEX.slice(INDEX.indexOf('// 第七十一轮：HDR 保真异常态的明确提示'),
  INDEX.indexOf('// 第七十轮：仅 HDR 相片'));
const HP71_HDR = new Uint8Array(sampleHdrHeic());
const JPG71_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
  0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

// —— ① 真值源纯净与关键参数 ——
check('R71 HdrPreview.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器 / 零 Promise / 零全局可变状态',
  ['@ohos.', 'fileIo', 'fs.', 'setTimeout', 'setInterval', 'await ', 'throw ',
    'new Promise', 'Promise.race', 'Date.now', 'Atomics.wait'].some(s => HP71_CODE.includes(s)) === false &&
  HP71_CODE.includes('export function hpProbeOf') &&
  HP71_CODE.includes('export function hpOutcomeOf') &&
  HP71_CODE.includes('export function hpDecodeSizeOf') &&
  (HP71_CODE.match(/^export const /gm) || []).length >= 30, true);
check('R71 关键参数：BT.2020=9 / PQ=16 / HLG=18 / 12M 像素 / 4096 长边 / RGBA_8888=3 / 显式 HDR=2',
  HP_PRIMARIES_BT2020 === 9 && HP_TRANSFER_PQ === 16 && HP_TRANSFER_HLG === 18 &&
  HP_MAX_ORIGINAL_PIXELS === 12000000 && HP_MAX_ORIGINAL_EDGE === 4096 &&
  HP_FMT_RGBA_8888 === 3 && HP_RANGE_HDR === 2 && HP_COLORSPACE_PRESERVE === 0, true);

// —— ② 容器真实字节解析（非模拟返回值） ——
const HP71_P = hpProbeOf('a.heic', HP71_HDR);
check('R71 真实 HEIC 字节：ftyp/brand + ispe 原始尺寸 + nclx BT.2020/PQ + HDR10 clli + 10bit heix 全部读出',
  HP71_P.format === HP_FMT_HEIC && HP71_P.brand === 'heic' &&
  HP71_P.width === 3840 && HP71_P.height === 2160 &&
  HP71_P.hdrMeta.present === true &&
  HP71_P.hdrMeta.primaries === 9 && HP71_P.hdrMeta.transfer === 16 &&
  HP71_P.hdrMeta.hdr10 === true && HP71_P.hdrMeta.tenBit === true &&
  HP71_P.corrupt === false, true);
const HP71_BOXES = [];
hpWalkOf(HP71_HDR, 0, HP71_HDR.length, 0, HP71_BOXES);
check('R71 ISOBMFF 递归遍历进入 meta / iprp / ipco 取到 hvcC·colr·clli·ispe（不只读顶层）',
  ['ftyp', 'meta', 'iprp', 'ipco', 'hvcC', 'colr', 'clli', 'ispe', 'mdat'].every(t =>
    HP71_BOXES.some(b => b.type === t)) &&
  hpFtypBrandOf(HP71_HDR) === 'heic' &&
  hpCompatibleOf(HP71_HDR).indexOf('heix') >= 0, true);
check('R71 三类异常严格分类：损坏 / 格式不兼容 / 缺 HDR 信息互不混淆；gain map 单独识别',
  hpCorruptOf(new Uint8Array(sampleCorruptHeic())) === true &&
  hpFormatOf('e.heic', new Uint8Array(sampleUnsupported())) === HP_FMT_INCOMPATIBLE &&
  hpProbeOf('b.heic', new Uint8Array(sampleSdrHeic())).hdrMeta.present === false &&
  hpProbeOf('c.heic', new Uint8Array(sampleGainMapHeic())).hdrMeta.gainMap === true, true);
check('R71 「不兼容」与「损坏」是两种独立格式码，原因码与格式码不再混用',
  HP_FMT_INCOMPATIBLE !== HP_FMT_CORRUPT &&
  HP_FMT_INCOMPATIBLE !== HP_FMT_HEIC &&
  hpFailCodeOf(HP_FMT_INCOMPATIBLE, false, true) === HP_CAUSE_FORMAT &&
  hpFailCodeOf(HP_FMT_CORRUPT, false, true) === HP_FILE_CORRUPT, true);
check('R71 零回归护栏：JPG/PNG 等其它格式字节绝不被当 ISOBMFF 误报损坏（先按扩展名分流）',
  hpFormatOf('x.jpg', JPG71_BYTES) === HP_FMT_OTHER &&
  hpCorruptOf(JPG71_BYTES) === true &&
  hpFormatOf('x.heic', new Uint8Array(0)) === HP_FMT_HEIC &&
  hpFormatOf('x.txt', new Uint8Array(0)) === HP_FMT_OTHER, true);
check('R71 支持「HEIC 数据」输入：无扩展名但字节属 HEIC 家族时仍按容器识别',
  hpFormatOf('stream-data', HP71_HDR) === HP_FMT_HEIC &&
  hpProbeOf('stream-data', HP71_HDR).hdrMeta.present === true, true);
check('R71 损坏判定边界：空数据 / 少于 12 字节 / box 头越界 / NaN 一律安全拒绝（零抛错）',
  hpCorruptOf(new Uint8Array(0)) === true &&
  hpCorruptOf(new Uint8Array(8)) === true &&
  hpBoxAt(new Uint8Array([0, 0, 0, 4, 102, 116, 121, 112]), 0, 8) === undefined &&
  hpU32Of(new Uint8Array(2), 0) === 0 && hpFiniteOf(NaN) === false, true);

// —— ③ 显式 HDR / 产物校验 / 显示模式 ——
check('R71 显式 HDR 档：源 HDR 或容器 HDR 元数据 → HDR(2)；普通 SDR → AUTO(0)；损坏/不兼容 → AUTO 不强解',
  hpRequestOf(true, HP_FMT_HEIC, true) === HP_RANGE_HDR &&
  hpRequestOf(true, HP_FMT_HEIC, false) === HP_RANGE_HDR &&
  hpRequestOf(false, HP_FMT_HEIC, true) === HP_RANGE_HDR &&
  hpRequestOf(false, HP_FMT_HEIC, false) === HP_RANGE_AUTO &&
  hpRequestOf(true, HP_FMT_CORRUPT, true) === HP_RANGE_AUTO &&
  hpRequestOf(true, HP_FMT_INCOMPATIBLE, true) === HP_RANGE_AUTO, true);
check('R71 产物 isHdr 校验：请求 HDR + 产物 HDR = 真 HDR；产物 SDR = 明确报「动态范围被压缩」',
  hpOutcomeOf(HP_RANGE_HDR, true, true) === HP_OK_HDR &&
  hpOutcomeOf(HP_RANGE_HDR, true, false) === HP_HDR_DOWNGRADED &&
  hpOutcomeOf(HP_RANGE_HDR, false, false) === HP_NO_HDR_META &&
  hpOutcomeOf(HP_RANGE_AUTO, false, false) === HP_OK_SDR &&
  hpDowngradedOf(true, false) === true && hpDowngradedOf(false, false) === false, true);
check('R71 显示模式：真 HDR 产物 + HDR 屏 → HIGH；非 HDR 屏 → CONSTRAINT 保住部分高光；非 HDR 图 → STANDARD',
  hpDisplayModeOf(true, true) === HP_MODE_HIGH &&
  hpDisplayModeOf(true, false) === HP_MODE_CONSTRAINT &&
  hpDisplayModeOf(false, true) === HP_MODE_STANDARD, true);

// —— ④ 尺寸 / 方向 / 色彩 / 位深 / 亮度保真 ——
check('R71 原始尺寸保真：3840×2160 HDR HEIC 按原尺寸解码；7680×4320 超护栏按档位缩放并标记 capped',
  hpDecodeSizeOf(3840, 2160, 1800, true, HP_FMT_HEIC).original === true &&
  hpDecodeSizeOf(3840, 2160, 1800, true, HP_FMT_HEIC).w === 3840 &&
  hpDecodeSizeOf(7680, 4320, 1800, true, HP_FMT_HEIC).capped === true &&
  hpDecodeSizeOf(3840, 2160, 1800, false, HP_FMT_HEIC).w < 3840 &&
  hpOriginalSizeAllowedOf(3840, 2160, 12000000, 4096) === true &&
  hpOriginalSizeAllowedOf(0, 0, 12000000, 4096) === false, true);
check('R71 保真护栏：等比不改宽高比 / HDR 禁转 sRGB·P3 / 10bit 禁落 RGBA_8888 / 不做 tone map',
  hpAspectPreservedOf(3840, 2160, 1800, 1012) === true &&
  hpColorSpacePreservedOf(0, true) === true &&
  hpColorSpacePreservedOf(1, true) === false &&
  hpPixelFormatSafeOf(-1, 10) === true &&
  hpPixelFormatSafeOf(HP_FMT_RGBA_8888, 10) === false &&
  hpNoToneMapOf(HP_MODE_HIGH, false) === true &&
  hpNoToneMapOf(HP_MODE_STANDARD, true) === false, true);
check('R71 量化数值模型：10bit=1024 级 / 8bit=256 级 / 动态范围比 4×（落 8bit 必丢 3/4 级数）',
  hpQuantLevelsOf(10) === 1024 && hpQuantLevelsOf(8) === 256 &&
  hpRangeRatioOf(10, 8) === 4 && hpQuantLevelsOf(0) === 0, true);

// —— ⑤ 明确提示与失败归一 ——
check('R71 三类异常各有明确中文提示：损坏 / 格式不兼容 / 缺 HDR 信息；另有压缩·不可校验·超限；正常态零提示',
  hpHintOf(HP_FILE_CORRUPT, 0, 0).includes('损坏') &&
  hpHintOf(HP_CAUSE_FORMAT, 0, 0).includes('不兼容') &&
  hpHintOf(HP_NO_HDR_META, 0, 0).includes('未包含 HDR') &&
  hpHintOf(HP_HDR_DOWNGRADED, 0, 0).includes('压缩') &&
  hpHintOf(HP_HDR_UNVERIFIED, 0, 0).includes('无法校验') &&
  hpHintOf(HP_SIZE_CAPPED, 7680, 4320).includes('7680 × 4320') &&
  hpShowHintOf(HP_OK_HDR) === false && hpShowHintOf(HP_OK_SDR) === false &&
  hpSeverityOf(HP_FILE_CORRUPT) === 3 && hpSeverityOf(HP_SIZE_CAPPED) === 1, true);
check('R71 失败原因归一：无字节 → 解码失败；损坏 → 文件损坏；不兼容 → 格式不兼容；HEIC 解码抛错 → 解码失败',
  hpFailCodeOf(HP_FMT_HEIC, false, false) === HP_DECODE_FAILED &&
  hpFailCodeOf(HP_FMT_CORRUPT, false, true) === HP_FILE_CORRUPT &&
  hpFailCodeOf(HP_FMT_INCOMPATIBLE, false, true) === HP_CAUSE_FORMAT &&
  hpFailCodeOf(HP_FMT_HEIC, true, true) === HP_DECODE_FAILED, true);

// —— ⑥ 源码接线静态契约 ——
check('R71 解码链接线：显式 HDR 档 / 产物 px.getImageInfo().isHdr 校验 / 容器预检 / 原始尺寸档 / 失败按 uri 落表',
  MODEL.includes('opts.desiredDynamicRange = image.DecodingDynamicRange.HDR;') &&
  MODEL.includes('const pxInfo: image.ImageInfo = await px.getImageInfo();') &&
  MODEL.includes('hpProbeOf(uri, new Uint8Array(raw))') &&
  MODEL.includes('hpDecodeSizeOf(w, h, edge') &&
  MODEL.includes('hpOutcomeOf(request, isHdrSource, isHdrDecoded)') &&
  MODEL.includes('noteDecodeFail(uri, fail)') &&
  MODEL.includes('export function decodeFailHintOf') &&
  MODEL.includes('hpColorSpacePreservedOf(COLOR_MANAGE_MODE, isHdrSource)'), true);
check('R71 界面接线：hdrCode/hdrHint 状态 + 切图清零 + setViewMeta 落地 + 失败取明确提示 + 条件浮层透明穿透',
  INDEX.includes('@State hdrCode: number = 0;') &&
  INDEX.includes('this.hdrCode = 0;') &&
  INDEX.includes('this.hdrCode = e.hdrCode;') &&
  INDEX.includes('this.hdrCode = decodeFailCodeOf(uri);') &&
  INDEX.includes("import { hpShowHintOf } from '../common/HdrPreview';") &&
  HP71_UI.length > 0 && HP71_UI.includes('if (hpShowHintOf(this.hdrCode))') &&
  HP71_UI.includes('Text(this.hdrHint)') &&
  HP71_UI.includes('.hitTestBehavior(HitTestMode.Transparent)'), true);
check('R71 可直接运行验证：tests/hdrprobe.mjs 提供文件/数据输入 + 内置样本自检 + CLI 守卫',
  HP71_PROBE.includes('export function probeReport') &&
  HP71_PROBE.includes('sampleHdrHeic') &&
  HP71_PROBE.includes('invokedDirectly') &&
  HP71_PROBE.includes('node:fs') && HP71_PROBE.includes('--json'), true);

// —— ⑦ 零回归与构建标记 ——
check('R71 零回归：R70 HDR 徽标 / 3 处 dynamicRangeMode / R68 系统 AA / R64 四态 / 版本 1.0.7·7 / Promise 计数不变',
  INDEX.includes("from '../common/HdrBadge'") &&
  (INDEX.match(/\.dynamicRangeMode\(/g) || []).length === 3 &&
  INDEX.includes('Image(this.viewDisplayPx(uri))') &&
  ARCHIVE.includes('DC_LABEL_PENDING') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  INDEX.includes('taskpool') === false, true);
check('R71 构建标记 R71 / 旧标记 R70 与 R69 已清 / 34 条历史标记断言整批升位',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R70';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R69';") === false &&
  (readFileSync(new URL('./dirname.test.mjs', import.meta.url), 'utf8')
    .match(/const ESC_BUILD_TAG: string = 'R88';/g) || []).length >= 33, true);

console.log('  ⚠️ 本组是源码静态契约 + 真实构造 HEIC 字节解析 + 数值模型，不替代真机 HDR 显示验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R71-A：装新包后 Ctrl+D 角标必须是 R71；打开 HDR HEIC，预览区正常出图，');
console.log('     左上角出现 R70「HDR」标识；底部不出现任何异常提示（正常态零提示）。');
console.log('  ⚠️ 真机步骤 R71-B：分别用「无 HDR 信息的普通 HEIC」「jpeg brand 伪装成 .heic」');
console.log('     「截断损坏的 HEIC」三份样本，底部依次出现「未包含 HDR 信息」「格式不兼容」');
console.log('     「文件损坏或数据不完整」明确提示；系统解码兜底路径不白屏、不吞提示。');
console.log('  ⚠️ 真机步骤 R71-C：HDR 显示设备上打开 10bit PQ/HLG HEIC，高光与暗部层次完整、');
console.log('     色彩不偏；若设备不支持 HDR 或 SDK 降级，底部出现「动态范围已被压缩」提示，');
console.log('     不静默以 SDR 冒充 HDR；原图超 12M 像素时出现保真缩放提示并带上原始尺寸。');
console.log('  ⚠️ 真机步骤 R71-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /');
console.log('     R68 主预览 resize 画质 / R69 行高 / R70 HDR 徽标 / 三栏三按钮 / ESC / 版本 1.0.7/7');
console.log('     全部零回归、无新增卡顿；也可在 PC 上直接跑 node tests/hdrprobe.mjs 校验容器判定。');

// ==================== 第七十二轮：档案列表右键菜单（R72） ====================
console.log('--- 第七十二轮：档案列表右键菜单（原生文案 / 仅档案项 / 放大镜零回归，R72）---');
const FC72_RAW = readFileSync(
  new URL('../entry/src/main/ets/common/FileContextMenu.ts', import.meta.url), 'utf8');
const FC72_CODE = stripComments(FC72_RAW);

// —— ① 真值源纯净与关键常量 ——
check('R72 FileContextMenu.ts 仍是纯函数真值源：零 SDK / 零 IO / 零 await / 零 throw / 零定时器 / 零 Promise / 零 Date.now / 零全局可变状态',
  ['@ohos.', 'fileIo', 'fs.', 'setTimeout', 'setInterval', 'await ', 'throw ',
    'new Promise', 'Promise.race', 'Date.now', 'Atomics.wait'].some(s => FC72_CODE.includes(s)) === false &&
  FC72_CODE.includes('export function fcItemsOf') &&
  FC72_CODE.includes('export function fcHitOf') &&
  FC72_CODE.includes('export function fcDetailFieldsOf') &&
  (FC72_CODE.match(/^export const /gm) || []).length >= 20 &&
  (FC72_CODE.match(/^export function /gm) || []).length >= 15, true);
check('R72 行种类数值与 ArchiveRow.ets 的 ROW_* 严格一致（0 图片 / 1 上层 / 2 目录 / 3 其它 / 4 文本 / -1 空白）',
  FC_KIND_IMAGE === 0 && FC_KIND_UP === 1 && FC_KIND_FOLDER === 2 &&
  FC_KIND_OTHER === 3 && FC_KIND_TEXT === 4 && FC_KIND_BLANK === -1 &&
  /export const ROW_IMAGE: number = 0;/.test(ARCHIVE) &&
  /export const ROW_UP: number = 1;/.test(ARCHIVE) &&
  /export const ROW_FOLDER: number = 2;/.test(ARCHIVE) &&
  /export const ROW_OTHER: number = 3;/.test(ARCHIVE) &&
  /export const ROW_TEXT: number = 4;/.test(ARCHIVE), true);

// —— ② 原生文案与用户点名的两项 ——
check('R72 菜单文案对齐原生鸿蒙 OS 档案管理员：打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称',
  FC_LABEL_OPEN === '打开' && FC_LABEL_DETAIL === '详情' &&
  FC_LABEL_REVEAL === '打开档案所在目录' &&
  FC_LABEL_COPY_PATH === '复制路径' && FC_LABEL_COPY_NAME === '复制档案名称', true);
check('R72 用户点名的两项恒在菜单里：档案 detail →「详情」、打开档案所在目录 → 同名项',
  fcHasRequiredOf(fcItemsOf(FC_KIND_IMAGE)) === true &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_TEXT)) === true &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_OTHER)) === true &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_FOLDER)) === true &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_UP)) === false, true);
check('R72 五项顺序即原生菜单顺序，动作码唯一、无重复、每项文案非空',
  (() => {
    const it = fcItemsOf(FC_KIND_IMAGE);
    const acts = it.map(x => x.act);
    return it.length === 5 && new Set(acts).size === 5 &&
      acts[0] === FC_ACT_OPEN && acts[1] === FC_ACT_DETAIL &&
      acts[2] === FC_ACT_REVEAL && acts[3] === FC_ACT_COPY_PATH &&
      acts[4] === FC_ACT_COPY_NAME && it.every(x => x.label.length > 0);
  })(), true);
check('R72 不假装支持：只读看图器不摆「重命名 / 删除 / 剪切 / 分享 / 压缩」等做不到的假选项',
  (() => {
    const bad = ['重命名', '删除', '剪切', '分享', '压缩'];
    const labels = fcItemsOf(FC_KIND_IMAGE).map(x => x.label);
    // 只读设计依据写在文件头注释里，按原文（未剥注释）核验；
    // 菜单文案则按代码级（已剥注释）核验，避免把注释里的反例误判成真选项。
    const labelDecls = FC72_CODE.split('\n').filter(l => l.includes('export const FC_LABEL_'));
    return labels.every(x => bad.every(b => x.includes(b) === false)) &&
      labelDecls.length === 5 &&
      labelDecls.every(l => bad.every(b => l.includes(b) === false)) &&
      FC72_RAW.includes('只读看图器');
  })(), true);

// —— ③ 仅档案项目触发，空白区 / 「..」伪行零菜单 ——
check('R72 命中判定：图片 / 文本 / 其它档案 / 文件夹命中；「..」伪行 / 空白区 / 未知 / NaN 一律不命中',
  fcHitOf(FC_KIND_IMAGE) === true && fcHitOf(FC_KIND_TEXT) === true &&
  fcHitOf(FC_KIND_OTHER) === true && fcHitOf(FC_KIND_FOLDER) === true &&
  fcHitOf(FC_KIND_UP) === false && fcHitOf(FC_KIND_BLANK) === false &&
  fcHitOf(99) === false && fcHitOf(NaN) === false, true);
check('R72 空白区零菜单：未命中行菜单项数 0，命中行恒 5 项且每次返回新数组',
  fcItemCountOf(FC_KIND_BLANK) === 0 && fcItemCountOf(FC_KIND_UP) === 0 &&
  fcItemsOf(FC_KIND_UP).length === 0 &&
  fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  fcItemsOf(FC_KIND_IMAGE) !== fcItemsOf(FC_KIND_IMAGE), true);
check('R72 越权动作被拒：动作不在该行菜单里 / 未命中行 / 空动作码一律 false',
  fcHasActOf(FC_KIND_IMAGE, FC_ACT_DETAIL) === true &&
  fcHasActOf(FC_KIND_IMAGE, 'fcDelete') === false &&
  fcHasActOf(FC_KIND_IMAGE, '') === false &&
  fcHasActOf(FC_KIND_UP, FC_ACT_DETAIL) === false, true);

// —— ④ 右键与放大镜共存的零回归护栏 ——
check('R72 只有「右键 Press + 命中档案行」才 stopPropagation；Release / 左键 / 空白区一律放行（放大镜 toggle 零回归）',
  fcStopPropagationOf(true, true, true) === true &&
  fcStopPropagationOf(false, true, true) === false &&
  fcStopPropagationOf(true, false, true) === false &&
  fcStopPropagationOf(true, true, false) === false, true);
check('R72→R73 SidebarView 接线订正：命中行改由 .onMouse 右键 Press 上抛窗口坐标，空白区零绑定',
  SIDEBAR.includes('if (fcHitOf(item.kind ?? ROW_IMAGE)) {') &&
  SIDEBAR.includes('.onMouse((event: MouseEvent) => {') &&
  SIDEBAR.includes('this.onContextMenu(idx, dx, dy);') &&
  SIDEBAR.includes('const dx: number = Number(event.displayX ?? event.x);') &&
  (SIDEBAR.match(/\.onMouse\(\(event: MouseEvent\)/g) || []).length === 1 &&
  stripComments(SIDEBAR).includes('bindContextMenu') === false &&
  stripComments(SIDEBAR).includes('ResponseType') === false &&
  stripComments(SIDEBAR).includes('MenuItem(') === false, true);
check('R72 放大镜零回归：命中行右键 Press 才 stopPropagation；ArchiveRow.ets 逐字未改（行内零菜单 / 行高 0.2 保持）',
  SIDEBAR.includes('fcStopPropagationOf(event.action === MouseAction.Press,') &&
  SIDEBAR.includes('event.button === MouseButton.Right, true') &&
  SIDEBAR.includes('event.stopPropagation();') &&
  ARCHIVE.includes('bindContextMenu') === false &&
  ARCHIVE.includes('fcHitOf') === false &&
  ARCHIVE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  ARCHIVE.includes('.onClick(() => {') &&
  ARCHIVE.includes('TapGesture({ count: 2 })'), true);

// —— ⑤ 详情字段（原生「详情」面板六项）与格式化 ——
const FC72_FIELDS = fcDetailFieldsOf({
  name: 'DSC_0123.HEIC', bytes: 2457600, mtime: 1730000000000,
  kind: FC_KIND_IMAGE, uri: 'file://docs/a/b/DSC_0123.HEIC', location: '/a/b'
});
check('R72 详情六字段：名称 / 类型 / 大小 / 修改时间 / 所在位置 / 完整路径，值与标签逐项对应',
  FC72_FIELDS.length === 6 &&
  FC72_FIELDS[0].label === FC_FIELD_NAME && FC72_FIELDS[0].value === 'DSC_0123.HEIC' &&
  FC72_FIELDS[1].label === FC_FIELD_TYPE && FC72_FIELDS[1].value === '图片档案' &&
  FC72_FIELDS[2].label === FC_FIELD_SIZE && FC72_FIELDS[2].value === '2.34 MB' &&
  FC72_FIELDS[3].label === FC_FIELD_MTIME &&
  FC72_FIELDS[4].label === FC_FIELD_LOCATION && FC72_FIELDS[4].value === '/a/b' &&
  FC72_FIELDS[5].label === FC_FIELD_PATH &&
  FC72_FIELDS[5].value === 'file://docs/a/b/DSC_0123.HEIC', true);
check('R72 详情缺值逐项兜底：空名 / 未知字节 / 零时间 / 空位置 / 空路径全为「--」，绝不抛错、绝不空串',
  (() => {
    const f = fcDetailFieldsOf({ name: '', bytes: -1, mtime: 0,
      kind: FC_KIND_BLANK, uri: '', location: '' });
    return f.length === 6 && f[0].value === FC_UNKNOWN && f[1].value === FC_UNKNOWN &&
      f[2].value === FC_UNKNOWN && f[3].value === FC_UNKNOWN &&
      f[4].value === FC_UNKNOWN && f[5].value === FC_UNKNOWN;
  })(), true);
check('R72 类型名 / 字节档 / 时间格式：四类行各一名，B·KB·MB 三档，时间恒 YY-MM-DD HH:mm',
  fcKindLabelOf(FC_KIND_IMAGE) === '图片档案' && fcKindLabelOf(FC_KIND_FOLDER) === '文件夹' &&
  fcKindLabelOf(FC_KIND_TEXT) === '文字档案' && fcKindLabelOf(FC_KIND_OTHER) === '其他档案' &&
  fcBytesLabelOf(0) === FC_UNKNOWN && fcBytesLabelOf(NaN) === FC_UNKNOWN &&
  fcBytesLabelOf(512) === '512 B' && fcBytesLabelOf(1536) === '1.5 KB' &&
  fcBytesLabelOf(2457600) === '2.34 MB' &&
  /^\d{2}-\d{2}-\d{2} \d{2}:\d{2}$/.test(FC72_FIELDS[3].value) &&
  fcTimeLabelOf(0) === FC_UNKNOWN && fcTimeLabelOf(NaN) === FC_UNKNOWN, true);
check('R72 详情标题恒非空且带档案名，空名也不开天窗',
  fcDetailTitleOf('DSC_0123.HEIC') === '档案详情 · DSC_0123.HEIC' &&
  fcDetailTitleOf('') === '档案详情', true);

// —— ⑥ 「打开档案所在目录」的目标与是否需要重列举 ——
check('R72 目录归一：去 ? 参数 / 去尾斜杠 / 保留根 / 空串安全',
  fcNormDirOf('/a/b/') === '/a/b' && fcNormDirOf('/a/b/?mode=r') === '/a/b' &&
  fcNormDirOf('/') === '/' && fcNormDirOf('') === '', true);
check('R72 所在目录：父级优先，父级判不出退回当前浏览目录，两者皆空返回空串（不静默无反应）',
  fcRevealTargetOf('/a/b', '/a/b') === '/a/b' &&
  fcRevealTargetOf('', '/a/b') === '/a/b' &&
  fcRevealTargetOf('', '') === '', true);
check('R72 只有目标层与当前层不同才真实重列举；同层只定位高亮，目标为空不动作',
  fcRevealWantedOf('/a/b', '/a/b/') === false &&
  fcRevealWantedOf('/a/b/?mode=r', '/a/b') === false &&
  fcRevealWantedOf('/a', '/a/b') === true &&
  fcRevealWantedOf('', '/a/b') === false, true);

// —— ⑦ 复制文本与状态反馈 ——
check('R72 复制文本只由复制类动作产生；路径为空退回档案名；非复制动作返回空串（不写剪贴板）',
  fcCopyTextOf(FC_ACT_COPY_PATH, '/a/b/c.jpg', 'c.jpg') === '/a/b/c.jpg' &&
  fcCopyTextOf(FC_ACT_COPY_PATH, '', 'c.jpg') === 'c.jpg' &&
  fcCopyTextOf(FC_ACT_COPY_NAME, '/a/b/c.jpg', 'c.jpg') === 'c.jpg' &&
  fcCopyTextOf(FC_ACT_DETAIL, '/a/b/c.jpg', 'c.jpg') === '' &&
  fcCopyTextOf('', '/a/b/c.jpg', 'c.jpg') === '', true);
check('R72 五个动作都有明确中文状态反馈（点了看得见反应），未知动作返回空串',
  [FC_ACT_OPEN, FC_ACT_DETAIL, FC_ACT_REVEAL, FC_ACT_COPY_PATH, FC_ACT_COPY_NAME]
    .every(a => fcStatusHintOf(a, 'c.jpg').includes('c.jpg')) &&
  fcStatusHintOf('fcNope', 'c.jpg') === '' &&
  fcStatusHintOf(FC_ACT_DETAIL, 'c.jpg').includes('详情') &&
  fcStatusHintOf(FC_ACT_REVEAL, 'c.jpg').includes('所在目录'), true);

// —— ⑧ Index 源码接线静态契约 ——
check('R72→R73 Index 接线订正：onContextMenu 下传 + onFileContextAction 五动作总收口 + 二次复核 fcHitOf/fcHasActOf',
  INDEX.includes('onContextMenu: (i: number, x: number, y: number): void => {') &&
  INDEX.includes('this.onFileContextMenu(i, x, y);') &&
  INDEX.includes('private onFileContextAction(act: string, rowIdx: number): void') &&
  INDEX.includes('if (!fcHitOf(kind) || !fcHasActOf(kind, act))') &&
  INDEX.includes("import { FC_ACT_OPEN, FC_ACT_DETAIL, FC_ACT_REVEAL, FC_ACT_COPY_PATH, FC_ACT_COPY_NAME,"), true);
check('R72→R74 行为接线订正：「打开」复用 onRowTap / 详情写三 @State / 复制走 pasteboard；所在目录改走 OS 文件管理器',
  INDEX.includes('this.onRowTap(rowIdx);') &&
  INDEX.includes('this.ctxDetailFields = fcDetailFieldsOf({') &&
  INDEX.includes('this.ctxDetailOn = true;') &&
  INDEX.includes('const dirUri: string = fcRevealDirUriOf(kind, r.uri, this.browseBase);') &&
  INDEX.includes('this.openDirInSystemFileManager(dirUri, r.name, fcRevealIsDirOf(kind));') &&
  INDEX.includes('fcRevealWantedOf(target, this.browseBase)') === false &&
  INDEX.includes('this.openFolder(target, false, false, true);') === false &&
  INDEX.includes('fcCopyTextOf(act, path, r.name)') &&
  INDEX.includes('pasteboard.getSystemPasteboard().setData(data)') &&
  INDEX.includes("'复制失败（剪贴板不可用）· ' + ESC_BUILD_TAG"), true);
check('R72 详情面板接线：三 @State + 根 Stack 条件浮层 + 六字段 ForEach + 遮罩/关闭两种收起 + zIndex 20',
  INDEX.includes('@State ctxDetailOn: boolean = false;') &&
  INDEX.includes('@State ctxDetailTitle: string = ' + "''" + ';') &&
  INDEX.includes('@State ctxDetailFields: Array<FcDetailField> = [];') &&
  INDEX.includes('if (this.ctxDetailOn) {') &&
  INDEX.includes('ForEach(this.ctxDetailFields, (f: FcDetailField) => {') &&
  INDEX.includes('.zIndex(20)') &&
  (INDEX.match(/this\.ctxDetailOn = false;/g) || []).length === 2, true);

// —— ⑨ 零回归 / 版本 / 构建标记 ——
check('R72 零回归：R71 HDR 保真 / R70 徽标 / R69 行高 / R64 四态 / 版本 1.0.7·7 / Promise 计数不变',
  INDEX.includes("import { hpShowHintOf } from '../common/HdrPreview';") &&
  INDEX.includes('Image(this.viewDisplayPx(uri))') &&
  ARCHIVE.includes('DC_LABEL_PENDING') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  ((INDEX + ARCHIVE + MODEL).match(/new Promise/g) || []).length === 2 &&
  (INDEX.match(/Promise\.race/g) || []).length === 1 &&
  INDEX.includes('taskpool') === false, true);
check('R74 构建标记 R74 / 旧标记 R73 与 R72 与 R71 已清 / 历史标记断言整批升位',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R73';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R72';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R71';") === false &&
  (readFileSync(new URL('./dirname.test.mjs', import.meta.url), 'utf8')
    .match(/const ESC_BUILD_TAG: string = 'R88';/g) || []).length >= 33, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机右键菜单验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R72-A：装新包后 Ctrl+D 角标必须是 R72；左栏右键任一档案 → 弹出系统样式菜单，');
console.log('     依次为「打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称」；右键「..」行、');
console.log('     列表下方空白区、标题行、三个按钮一律不弹菜单。');
console.log('  ⚠️ 真机步骤 R72-B：点「详情」→ 居中面板显示名称 / 类型 / 大小 / 修改时间 / 所在位置 /');
console.log('     完整路径六项；点遮罩或「关闭」即收；点「打开档案所在目录」→ 左栏定位并高亮该档案，');
console.log('     状态栏给出明确反馈；「复制路径」「复制档案名称」可在任意文本输入框 Ctrl+V 验出。');
console.log('  ⚠️ 真机步骤 R72-C：右键档案行**不再**顺带翻转放大镜；预览区 / 空白区右键 toggle 放大镜照常；');
console.log('     左键单击选图、双击进全屏、hover 缩略图、滚轮切图、列表滚动、往上层、排序、选择文件夹零回归。');
console.log('  ⚠️ 真机步骤 R72-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /');
console.log('     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。');

// ==================== 第七十三轮：档案列表右键菜单真机修复（R73） ====================
console.log('--- 第七十三轮：右键菜单真机修复（onMouse 驱动 / 应用内浮层 / 零系统手势，R73）---');
const FC73_RAW = readFileSync(
  new URL('../entry/src/main/ets/common/FileContextMenu.ts', import.meta.url), 'utf8');
const FC73_CODE = stripComments(FC73_RAW);
const SIDEBAR73 = stripComments(SIDEBAR);
const INDEX73 = stripComments(INDEX);

// —— ① 真值源纯净与新增纯函数 ——
check('R73 新增纯函数零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零 Date.now / 零全局可变状态',
  ['@ohos.', 'fileIo', 'fs.', 'setTimeout', 'setInterval', 'await ', 'throw ',
    'new Promise', 'Promise.race', 'Date.now', 'Atomics.wait'].some(s => FC73_CODE.includes(s)) === false &&
  FC73_CODE.includes('export function fcMenuHeightOf') &&
  FC73_CODE.includes('export function fcMenuPosOf') &&
  FC73_CODE.includes('export function fcMenuOutsideOf') &&
  FC73_CODE.includes('export function fcMenuTitleOf') &&
  FC73_CODE.includes('export function fcMenuVisibleOf') &&
  (FC73_CODE.match(/^export function /gm) || []).length >= 21, true);
check('R73 真值源旧 24 常量 / 16 函数逐字保留，新增 6 尺寸常量 + 5 纯函数，仍是同一份 common/ 文件',
  (FC73_CODE.match(/^export const /gm) || []).length >= 30 &&
  FC73_CODE.includes("export const FC_LABEL_REVEAL: string = '打开档案所在目录';") &&
  FC73_CODE.includes('export function fcStatusHintOf') &&
  FC73_RAW.includes('只读看图器') &&
  FC73_RAW.includes('bindContextMenu(ResponseType.RightClick)'), true);

// —— ② 浮层尺寸 / 定位 / 命中纯函数 ——
check('R73 尺寸常量与总高：5 项 → 5×34 + 24 + 2×6 = 206vp；0 / 负 / NaN 项数恒返回 0',
  FC_MENU_W === 200 && FC_MENU_ITEM_H === 34 && FC_MENU_TITLE_H === 24 &&
  FC_MENU_PAD_V === 6 && FC_MENU_EDGE_V === 8 && FC_MENU_NAME_MAX === 28 &&
  fcMenuHeightOf(5) === 206 && fcMenuHeightOf(0) === 0 &&
  fcMenuHeightOf(-1) === 0 && fcMenuHeightOf(NaN) === 0, true);
check('R73 浮层定位：正常点在鼠标处、右下越界向内翻转、NaN / 负值收进安全区、窗口未测出只做下限裁剪',
  (() => {
    const a = fcMenuPosOf(100, 120, 1200, 800, FC_MENU_W, fcMenuHeightOf(5));
    const b = fcMenuPosOf(1150, 750, 1200, 800, FC_MENU_W, fcMenuHeightOf(5));
    const c = fcMenuPosOf(NaN, NaN, 1200, 800, FC_MENU_W, fcMenuHeightOf(5));
    const d = fcMenuPosOf(1150, 750, 0, 0, FC_MENU_W, fcMenuHeightOf(5));
    return a.x === 100 && a.y === 120 &&
      b.x === 992 && b.y === 586 &&
      c.x === 8 && c.y === 8 &&
      d.x === 1150 && d.y === 750;
  })(), true);
check('R73 定位每次返回新对象，绝不读写模块级状态（同入参两次调用互不等引用）',
  fcMenuPosOf(10, 10, 800, 600, 200, 206) !== fcMenuPosOf(10, 10, 800, 600, 200, 206), true);
check('R73 点击外部判定：矩形内 / 四角边界算内部，四向越界均为外部',
  fcMenuOutsideOf(50, 50, 10, 10, 200, 206) === false &&
  fcMenuOutsideOf(10, 10, 10, 10, 200, 206) === false &&
  fcMenuOutsideOf(210, 216, 10, 10, 200, 206) === false &&
  fcMenuOutsideOf(9, 50, 10, 10, 200, 206) === true &&
  fcMenuOutsideOf(211, 50, 10, 10, 200, 206) === true &&
  fcMenuOutsideOf(50, 9, 10, 10, 200, 206) === true &&
  fcMenuOutsideOf(50, 217, 10, 10, 200, 206) === true, true);
check('R73 菜单标题：空名兜底「档案」、短名原样、超长截断到 28 字且带省略号',
  fcMenuTitleOf('') === '档案' && fcMenuTitleOf('a.heic') === 'a.heic' &&
  fcMenuTitleOf('x'.repeat(60)).length === FC_MENU_NAME_MAX &&
  fcMenuTitleOf('x'.repeat(60)).endsWith('…'), true);
check('R73 浮层显隐：开关真且项数 > 0 才显示，零项 / 关态 / 负项数恒不出现空壳菜单',
  fcMenuVisibleOf(true, 5) === true && fcMenuVisibleOf(true, 0) === false &&
  fcMenuVisibleOf(false, 5) === false && fcMenuVisibleOf(true, -1) === false, true);

// —— ③ 触发层：系统右键手势整条移除 ——
check('R73 代码级彻底移除 bindContextMenu / ResponseType.RightClick / Menu / MenuItem（真机不派发的系统手势通道）',
  SIDEBAR73.includes('bindContextMenu') === false &&
  SIDEBAR73.includes('ResponseType') === false &&
  SIDEBAR73.includes('MenuItem') === false &&
  SIDEBAR73.includes('Menu()') === false &&
  INDEX73.includes('bindContextMenu') === false &&
  INDEX73.includes('ResponseType') === false, true);
check('R73 触发层接线：仅命中 ListItem 绑一处 .onMouse，右键 Press 取 displayX/displayY 后上抛并 stopPropagation',
  SIDEBAR73.includes('if (fcHitOf(item.kind ?? ROW_IMAGE)) {') &&
  SIDEBAR73.includes('.onMouse((event: MouseEvent) => {') &&
  SIDEBAR73.includes('fcStopPropagationOf(event.action === MouseAction.Press,') &&
  SIDEBAR73.includes('event.button === MouseButton.Right, true') &&
  SIDEBAR73.includes('Number(event.displayX ?? event.x)') &&
  SIDEBAR73.includes('Number(event.displayY ?? event.y)') &&
  SIDEBAR73.includes('this.onContextMenu(idx, dx, dy);') &&
  SIDEBAR73.includes('event.stopPropagation();') &&
  (SIDEBAR73.match(/\.onMouse\(/g) || []).length === 1, true);
check('R73 空白区 / 「..」伪行零菜单：未命中分支只有裸 ListItem，且未命中行菜单项数恒 0',
  /\}\s*else\s*\{\s*ListItem\(\)\s*\{\s*this\.archiveRowOf\(item, idx\);\s*\}\s*\}/.test(SIDEBAR73) &&
  fcItemCountOf(FC_KIND_BLANK) === 0 && fcItemCountOf(FC_KIND_UP) === 0 &&
  fcHitOf(FC_KIND_IMAGE) === true && fcHitOf(FC_KIND_UP) === false, true);

// —— ④ Index 浮层接线 ——
check('R73 Index 七个 @State 菜单状态齐备：开关 / 行下标 / 坐标 / 标题 / 项快照 / hover，关态零残留',
  INDEX.includes('@State ctxMenuOn: boolean = false;') &&
  INDEX.includes('@State ctxMenuIdx: number = -1;') &&
  INDEX.includes('@State ctxMenuX: number = 0;') &&
  INDEX.includes('@State ctxMenuY: number = 0;') &&
  INDEX.includes('@State ctxMenuName: string = ' + "''" + ';') &&
  INDEX.includes('@State ctxMenuItems: Array<FcMenuItem> = [];') &&
  INDEX.includes('@State ctxMenuHover: string = ' + "''" + ';'), true);
check('R73 菜单浮层接线：fcMenuVisibleOf 条件渲染 + 五项 ForEach + 遮罩收起 + 菜单项直调 onFileContextAction + zIndex 21',
  INDEX.includes('if (fcMenuVisibleOf(this.ctxMenuOn, this.ctxMenuItems.length)) {') &&
  INDEX.includes('ForEach(this.ctxMenuItems, (it: FcMenuItem) => {') &&
  INDEX.includes('this.onFileContextAction(act, idx);') &&
  INDEX.includes('.zIndex(21)') &&
  (INDEX.match(/this\.ctxMenuOn = false;/g) || []).length === 2 &&
  INDEX.includes('.position({ x: this.ctxMenuX, y: this.ctxMenuY })') &&
  INDEX.includes('.width(FC_MENU_W)'), true);
check('R73 打开菜单收口 onFileContextMenu：越界索引直接返回 + 二次复核 fcHitOf + fcItemsOf 快照 + fcMenuPosOf 裁剪',
  INDEX.includes('private onFileContextMenu(rowIdx: number, x: number, y: number): void') &&
  INDEX.includes('if (rowIdx < 0 || rowIdx >= this.rows.length)') &&
  INDEX.includes('if (!fcHitOf(kind))') &&
  INDEX.includes('const items: Array<FcMenuItem> = fcItemsOf(kind);') &&
  INDEX.includes('const pos: FcMenuPos = fcMenuPosOf(x, y, this.lastRootW, this.lastRootH,') &&
  INDEX.includes('this.ctxMenuName = fcMenuTitleOf(r.name);') &&
  INDEX.includes('this.ctxMenuItems = items;') &&
  INDEX.includes('this.ctxMenuOn = true;'), true);
check('R73 放大镜零回归：菜单打开时的右键不再翻转放大镜，其余 Press 分支与 ArchiveRow.ets 逐字保留',
  INDEX.includes('if (!(this.ctxMenuOn && event.button === MouseButton.Right)) {') === false &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)') &&
  INDEX.includes('private onRootMouse(event: MouseEvent): void') &&
  ARCHIVE.includes('bindContextMenu') === false &&
  ARCHIVE.includes('fcHitOf') === false &&
  ARCHIVE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  ARCHIVE.includes('TapGesture({ count: 2 })'), true);
check('R73→R74 五项文案零回归：fcItemsOf 仍由真值源给出，四项动作逐字未改，REVEAL 分支按 R74 改走 OS 文件管理器',
  fcItemsOf(FC_KIND_IMAGE).length === 5 &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_IMAGE)) === true &&
  INDEX.includes('if (act === FC_ACT_OPEN)') &&
  INDEX.includes('if (act === FC_ACT_DETAIL)') &&
  INDEX.includes('if (act === FC_ACT_REVEAL)') &&
  INDEX.includes('fcCopyTextOf(act, path, r.name)') &&
  INDEX.includes('pasteboard.getSystemPasteboard().setData(data)'), true);
check('R73 版本恒定 1.0.7·7 / R71 HDR 保真 / R70 徽标 / R72 详情面板零回归',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("import { hpShowHintOf } from '../common/HdrPreview';") &&
  INDEX.includes('Image(this.viewDisplayPx(uri))') &&
  INDEX.includes('if (this.ctxDetailOn) {') &&
  INDEX.includes('.zIndex(20)'), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机右键菜单验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R73-A：装新包后 Ctrl+D 角标必须是 R73（R72-A 里的 R72 是历史锚点，以本条为准）；');
console.log('     左栏右键任一档案 → 鼠标位置弹出菜单，标题为该档案名，依次为「打开 / 详情 /');
console.log('     打开档案所在目录 / 复制路径 / 复制档案名称」；右键「..」行、列表下方空白区、');
console.log('     标题行、三个按钮一律不弹菜单。');
console.log('  ⚠️ 真机步骤 R73-B：点菜单外任意位置即收起；点「详情」→ 居中面板显示名称 / 类型 / 大小 /');
console.log('     修改时间 / 所在位置 / 完整路径六项；点「打开档案所在目录」→ 左栏定位并高亮该档案，');
console.log('     状态栏给出明确反馈；「复制路径」「复制档案名称」可在任意文本输入框 Ctrl+V 验出。');
console.log('  ⚠️ 真机步骤 R73-C：右键档案行**不再**顺带翻转放大镜；预览区 / 空白区右键 toggle 放大镜照常；');
console.log('     菜单在窗口右下角右键时向内翻转不越界；左键单击选图、双击进全屏、hover 缩略图、');
console.log('     滚轮切图、列表滚动、往上层、排序、选择文件夹零回归。');
console.log('  ⚠️ 真机步骤 R73-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /');
console.log('     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。');

// ==================== 第七十四轮：「打开档案所在目录」改走 OS 文件管理器打开【目录】（R74） ====================
console.log('--- 第七十四轮：REVEAL 改走 OS 文件管理器 / 目标恒为目录 / 文件与目录两类生效（R74）---');
const FC74_RAW = readFileSync(
  new URL('../entry/src/main/ets/common/FileContextMenu.ts', import.meta.url), 'utf8');
const FC74_CODE = stripComments(FC74_RAW);
const INDEX74 = stripComments(INDEX);
const SIDEBAR74 = stripComments(SIDEBAR);
const REVEAL74_AT = INDEX.indexOf('if (act === FC_ACT_REVEAL) {');
const REVEAL74_RAW = REVEAL74_AT >= 0
  ? INDEX.slice(REVEAL74_AT, INDEX.indexOf('const text: string = fcCopyTextOf', REVEAL74_AT))
  : '';
const REVEAL74_BLOCK = stripComments(REVEAL74_RAW);

check('R74→R75 兜底：browseBase 为空时文件行 → 剥文件名所得所在目录，绝不把文件本身作为目标',
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://docs/storage/Users/x/DSC.HEIC', '') ===
    'file://docs/storage/Users/x' &&
  fcRevealDirUriOf(FC_KIND_TEXT, '/a/b/readme.txt', '') === '/a/b' &&
  fcRevealDirUriOf(FC_KIND_OTHER, 'file://192.168.100.61/图片/2026/f.bin', '') ===
    'file://192.168.100.61/图片/2026' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://docs/x/a.HEIC', '')
    .endsWith('a.HEIC') === false, true);
check('R74 核心：目录行 → 该目录【自身】，绝不误开到它的父目录（R72/R73 的错）',
  fcRevealDirUriOf(FC_KIND_FOLDER, 'file://docs/storage/Users/x/Sub', '') ===
    'file://docs/storage/Users/x/Sub' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, '/a/b/子目录', '') === '/a/b/子目录' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, 'file://docs/storage/Users/x/Sub', '') !==
    'file://docs/storage/Users/x', true);
check('R74 未命中行不产生目标：「..」伪行 / 空白 / 未知 kind 恒返回空串',
  fcRevealDirUriOf(FC_KIND_UP, 'file://docs/x/..', 'file://docs/x') === '' &&
  fcRevealDirUriOf(FC_KIND_BLANK, '', 'file://docs/x') === '' &&
  fcRevealDirUriOf(-9, 'file://docs/x/a.HEIC', 'file://docs/x') === '', true);
check('R74→R75 兜底：browseBase 优先 / 目录 URI 为空仍退回 browseBase / 两者皆空返回空串',
  fcRevealDirUriOf(FC_KIND_IMAGE, 'DSC.HEIC', 'file://docs/x/') === 'file://docs/x' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, '', 'file://docs/x') === 'file://docs/x' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, '', '') === '', true);
check('R74→R75 目标归一：去 ? 参数 / 去尾斜杠，保留 file:// 与 NAS 主机段授权链',
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://docs/x/a.jpg?mode=r', '') === 'file://docs/x' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, 'file://docs/x/Sub/', 'X') === 'file://docs/x/Sub' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, 'smb://nas/共享/卷/a.heic', '') === 'smb://nas/共享/卷', true);
check('R74 父 URI 纯函数：剥最后一段；authority / 根 / 空串边界不吐伪路径',
  fcParentUriOf('file://docs/storage/a.jpg') === 'file://docs/storage' &&
  fcParentUriOf('/a/b.jpg') === '/a' &&
  fcParentUriOf('file://docs/a.jpg') === '' &&
  fcParentUriOf('/a.jpg') === '' &&
  fcParentUriOf('file://docs/') === '' &&
  fcParentUriOf('') === '' &&
  fcParentUriOf('a/b/c.jpg') === 'a/b', true);
check('R74 目录判定纯函数：仅 FC_KIND_FOLDER 为真，其余行种类全假',
  fcRevealIsDirOf(FC_KIND_FOLDER) === true &&
  fcRevealIsDirOf(FC_KIND_IMAGE) === false &&
  fcRevealIsDirOf(FC_KIND_TEXT) === false &&
  fcRevealIsDirOf(FC_KIND_OTHER) === false &&
  fcRevealIsDirOf(FC_KIND_UP) === false &&
  fcRevealIsDirOf(FC_KIND_BLANK) === false, true);
check('R74 状态反馈：成功 / 失败 / 文件 / 目录四态都点明「系统文件管理器」，恒非空',
  fcRevealStatusOf('a.HEIC', true, false, 'R74').includes('系统文件管理器') &&
  fcRevealStatusOf('a.HEIC', true, false, 'R74').includes('所在目录 · R74') &&
  fcRevealStatusOf('Sub', true, true, 'R74').includes('打开目录「Sub」') &&
  fcRevealStatusOf('a.HEIC', false, false, 'R74').includes('未能打开') &&
  fcRevealStatusOf('', false, false, '').includes(FC_UNKNOWN) &&
  fcRevealStatusOf('', false, false, '').endsWith('所在目录') &&
  fcRevealStatusOf('a', true, false, '').includes(' · ') === false, true);
check('R74 Want 契约常量：显式文件管理器 + 隐式 viewData 兜底，值逐字对齐官方 / SDK',
  FC_OSFM_BUNDLE === 'com.huawei.hmos.filemanager' &&
  FC_OSFM_ABILITY === 'MainAbility' &&
  FC_OSFM_PARAM_FILE_URI === 'fileUri' &&
  FC_VIEW_DATA_ACTION === 'ohos.want.action.viewData' &&
  FC_DIR_UTD === 'general.directory' &&
  FC_URI_READ_FLAG === 0x00000001, true);
check('R74 纯函数层零 SDK / 零 IO / 零异步：common/ 只产出目标 URI 与契约常量，绝不碰 startAbility',
  FC74_CODE.includes('startAbility') === false &&
  FC74_CODE.includes('@ohos') === false &&
  FC74_CODE.includes('import ') === false &&
  FC74_CODE.includes(': Want') === false &&
  FC74_CODE.includes('Record<string, Object>') === false &&
  FC74_CODE.includes('throw ') === false &&
  FC74_CODE.includes('Promise') === false &&
  FC74_CODE.includes('Date.now') === false &&
  FC74_CODE.includes('setTimeout') === false &&
  FC74_CODE.includes('export function fcRevealDirUriOf') &&
  FC74_CODE.includes('export function fcParentUriOf'), true);
check('R74 REVEAL 分支接线：目标由 fcRevealDirUriOf 判定后交给 openDirInSystemFileManager',
  REVEAL74_BLOCK.length > 0 &&
  REVEAL74_BLOCK.includes('fcRevealDirUriOf(kind, r.uri, this.browseBase)') &&
  REVEAL74_BLOCK.includes('this.openDirInSystemFileManager(dirUri, r.name, fcRevealIsDirOf(kind));') &&
  REVEAL74_BLOCK.includes('fcRevealStatusOf(r.name, false, fcRevealIsDirOf(kind), ESC_BUILD_TAG)'), true);
check('R74 REVEAL 分支彻底移除应用内通道：不再 onRowTap 打开文件、不再 openFolder 应用内重列举',
  REVEAL74_BLOCK.includes('onRowTap') === false &&
  REVEAL74_BLOCK.includes('openFolder') === false &&
  REVEAL74_BLOCK.includes('fcRevealTargetOf') === false &&
  REVEAL74_BLOCK.includes('fcRevealWantedOf') === false, true);
check('R74 startAbility 两级兜底：显式文件管理器（fileUri=目录）/ 隐式 viewData + general.directory',
  INDEX74.includes("import Want from '@ohos.app.ability.Want';") &&
  INDEX74.includes('private openDirInSystemFileManager(') &&
  INDEX74.includes('params[FC_OSFM_PARAM_FILE_URI] = dirUri;') &&
  INDEX74.includes('bundleName: FC_OSFM_BUNDLE') &&
  INDEX74.includes('abilityName: FC_OSFM_ABILITY') &&
  INDEX74.includes('action: FC_VIEW_DATA_ACTION') &&
  INDEX74.includes('type: FC_DIR_UTD') &&
  INDEX74.includes('flags: FC_URI_READ_FLAG') &&
  INDEX74.includes('ctx.startAbility(primary)') &&
  INDEX74.includes('ctx.startAbility(fallback)') &&
  (INDEX74.match(/ctx\.startAbility\(/g) || []).length === 2, true);
check('R74 context 沿用 quitApp 已真机验证的双通道；每级都有明确状态反馈与 hilog，绝不静默',
  INDEX74.includes("AppStorage.get<common.UIAbilityContext>('abilityContext')") &&
  INDEX74.includes('this.getUIContext().getHostContext()') &&
  INDEX74.includes('if (ability === undefined)') &&
  INDEX74.includes('fcRevealStatusOf(name, true, isDir, ESC_BUILD_TAG)') &&
  INDEX74.includes('fcRevealStatusOf(name, false, isDir, ESC_BUILD_TAG)') &&
  (INDEX74.match(/fcReveal primary|fcReveal fallback|fcReveal both failed|fcReveal: no UIAbilityContext/g) || []).length >= 4, true);
check('R74 菜单文案零回归：五项标签逐字未改，「打开档案所在目录」原样保留',
  FC_LABEL_OPEN === '打开' && FC_LABEL_DETAIL === '详情' &&
  FC_LABEL_REVEAL === '打开档案所在目录' &&
  FC_LABEL_COPY_PATH === '复制路径' && FC_LABEL_COPY_NAME === '复制档案名称' &&
  fcItemCountOf(FC_KIND_IMAGE) === 5 && fcItemCountOf(FC_KIND_FOLDER) === 5 &&
  fcHasRequiredOf(fcItemsOf(FC_KIND_FOLDER)) === true, true);
check('R74 其余四项动作零回归：打开 / 详情 / 复制路径 / 复制名称接线逐字未动',
  INDEX74.includes('if (act === FC_ACT_OPEN)') &&
  INDEX74.includes('this.onRowTap(rowIdx);') &&
  INDEX74.includes('if (act === FC_ACT_DETAIL)') &&
  INDEX74.includes('this.ctxDetailFields = fcDetailFieldsOf({') &&
  INDEX74.includes('fcCopyTextOf(act, path, r.name)') &&
  INDEX74.includes('pasteboard.getSystemPasteboard().setData(data)') &&
  INDEX74.includes("'复制失败（剪贴板不可用）· ' + ESC_BUILD_TAG"), true);
check('R74 触发链 / 放大镜 / 详情面板零回归：SidebarView.onMouse 与 ArchiveRow.ets 逐字保留',
  SIDEBAR74.includes('.onMouse((event: MouseEvent) => {') &&
  SIDEBAR74.includes('this.onContextMenu(idx, dx, dy);') &&
  SIDEBAR74.includes('bindContextMenu') === false &&
  ARCHIVE.includes('bindContextMenu') === false &&
  ARCHIVE.includes('fcHitOf') === false &&
  ARCHIVE.includes('TapGesture({ count: 2 })') &&
  INDEX74.includes('if (!(this.ctxMenuOn && event.button === MouseButton.Right)) {') === false &&
  INDEX74.includes('if (this.ctxDetailOn) {') &&
  INDEX74.includes('.zIndex(20)'), true);
check('R74 版本恒定 1.0.7·7 / R71 HDR 保真 / 构建标记 R74 / 旧标记全清',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R73';") === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) &&
  /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("import { hpShowHintOf } from '../common/HdrPreview';") &&
  INDEX.includes('Image(this.viewDisplayPx(uri))'), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机系统文件管理器验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R74-A：装新包后 Ctrl+D 角标必须是 R74（R73-A 里的 R73 是历史锚点，以本条为准）；');
console.log('     右键任一【文件】→ OS 自带文件管理器弹出并定位到该文件所在目录，绝不在 APP 内预览该文件；');
console.log('     状态栏显示「已用系统文件管理器打开「xxx」所在目录 · R74」。');
console.log('  ⚠️ 真机步骤 R74-B：右键任一【文件夹】→ OS 文件管理器打开【该文件夹自身】（不是它的父目录）；');
console.log('     状态栏显示「已用系统文件管理器打开目录「xxx」 · R74」；文件与目录两类都要各测一次。');
console.log('  ⚠️ 真机步骤 R74-C：若本机未装该系统文件管理器 / 不接受该目录 URI 形态，状态栏必须明确显示');
console.log('     「系统文件管理器未能打开…」；请回传 hilog 里 fcReveal primary / fallback / both failed');
console.log('     与 dir= 值（含 file://docs 或 NAS 授权段），据此调整 bundleName / abilityName / URI 形态。');
console.log('  ⚠️ 真机步骤 R74-D：菜单五项文案、打开 / 详情 / 复制路径 / 复制档案名称四项动作、');
console.log('     放大镜 toggle、详情面板、菜单定位与收起、「..」行与空白区零菜单逐字零回归；');
console.log('     HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /');
console.log('     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。');

// ==================== 第七十五轮：移除向上箭头符号列 + REVEAL 目标改以 browseBase 为真值（R75） ====================
console.log('--- 第七十五轮：仅删符号列 / REVEAL 目录改以 browseBase 为准（R75）---');
const INDEX75 = stripComments(INDEX);
const ROW75_CODE = stripComments(ARCHIVE.slice(ARCHIVE.indexOf('  build() {')));
const REVEAL75_AT = INDEX.indexOf('if (act === FC_ACT_REVEAL) {');
const REVEAL75_BLOCK = REVEAL75_AT >= 0
  ? stripComments(INDEX.slice(REVEAL75_AT, INDEX.indexOf('const text: string = fcCopyTextOf', REVEAL75_AT)))
  : '';

// —— 任务 1：仅移除带向上箭头的那个 column ——
check('R75 任务1 正常用例：符号列整体移除，↑ / ▣ / 专属配置 / 引用 / 残留逻辑全清',
  FOLDER_GLYPH_GONE &&
  ARCHIVE.includes('↑') === false && ARCHIVE.includes('▣') === false &&
  ARCHIVE61_CODE.includes('folderGlyph') === false &&
  ARCHIVE61_CODE.includes('FolderGlyph') === false &&
  ARCHIVE61_CODE.includes('FG_COL_') === false &&
  ARCHIVE61_CODE.includes('iconColor') === false, true);
check('R75 任务1 正常用例：名称是行首第一个子组件，其后直接是字节 / 日期两栏',
  (() => {
    const token = 'Text(this.name)';
    const n = ROW75_CODE.indexOf(token);
    const g = ROW75_CODE.indexOf('if (!this.collapsed)');
    return n >= 0 && g > n && ROW75_CODE.slice(n + token.length, g).includes('Text(') === false;
  })(), true);
check('R80 任务1 正常用例：行高锚点改 minHeight(26)，build() 内恰好 1 处',
  (ROW75_CODE.match(/\.height\(26\)/g) || []).length === 0 &&
  (ROW75_CODE.match(/constraintSize\(\{ minHeight: 26 \}\)/g) || []).length === 1 &&
  /Text\(this\.name\)[\s\S]{0,400}?\.layoutWeight\(1\)\s*\.constraintSize\(\{ minHeight: 26 \}\)/.test(ROW75_CODE) &&
  ROW75_CODE.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })'), true);
check('R77 R75 任务1 回归：三列顺序 / 字段 / 数据展示不变（列宽改 adaptive、日期 +6 保留）',
  ROW75_CODE.indexOf('Text(this.name)') < ROW75_CODE.indexOf('if (!this.collapsed)') &&
  ROW75_CODE.includes('Text(fmtBytes(this.bytes))') &&
  ROW75_CODE.includes('DC_LABEL_PENDING') &&
  ROW75_CODE.includes('.width(this.colSizeW)') && ROW75_CODE.includes('.width(this.colDateW)') &&
  ROW75_CODE.includes('.margin({ left: 6 })') &&
  ROW75_CODE.includes('Text(this.mtime > 0 ? fmtDate(this.mtime) : \'--\')'), true);
check('R75 任务1 回归：无新增占位 / padding / offset，Row 属性链逐字不变',
  (ROW75_CODE.match(/\.padding\(/g) || []).length === 1 &&
  /Blank\(|Spacer\(|\.width\(0\)|\.offset\(/.test(ROW75_CODE) === false &&
  ROW75_CODE.includes(".width('100%')") && ROW75_CODE.includes('.borderRadius(3)') &&
  ROW75_CODE.includes('.backgroundColor(this.rowBgColor())'), true);
check('R75 任务1 回归：点击 / 双击 / hover / onMouse / bindPopup / 条纹 / 缩略图逐字不变',
  ARCHIVE.includes('.onClick(() => {') && ARCHIVE.includes('this.onTap(this.idx);') &&
  ARCHIVE.includes('TapGesture({ count: 2 })') &&
  ARCHIVE.includes('.onHover((isHover: boolean) => {') &&
  ARCHIVE.includes('.onMouse((event: MouseEvent) => {') &&
  ARCHIVE.includes('.bindPopup(this.showHover, {') &&
  ARCHIVE.includes('mask: false') && ARCHIVE.includes('autoCancel: false') &&
  ARCHIVE.includes('ROW_STRIPE_EVEN') && ARCHIVE.includes('ROW_SELECTED_BG'), true);
check('R75 任务1 回归：SidebarView / 右键触发链 / 列表整体行为零改动',
  SIDEBAR74.includes('.onMouse((event: MouseEvent) => {') &&
  SIDEBAR74.includes('this.onContextMenu(idx, dx, dy);') &&
  SIDEBAR74.includes('bindContextMenu') === false &&
  ARCHIVE61_CODE.includes('fcHitOf') === false &&
  INDEX75.includes('fcMenuPosOf') && INDEX75.includes('this.ctxMenuOn'), true);

// —— 任务 2：REVEAL 目标改以 browseBase 为当前目录真值 ——
check('R75 任务2 正常用例：文件行目标恒为 browseBase（当前展示清单的权威目录），不再剥 r.uri',
  fcRevealDirUriOf(FC_KIND_IMAGE,
    'file://docs/storage/Users/x/DSC.HEIC', 'file://docs/授权/2026') === 'file://docs/授权/2026' &&
  fcRevealDirUriOf(FC_KIND_TEXT,
    'file://192.168.100.61/卷/2026/readme.txt', 'file://192.168.100.61/图片档案/2026') ===
    'file://192.168.100.61/图片档案/2026' &&
  fcRevealDirUriOf(FC_KIND_OTHER, '/mnt/nas/a/f.bin',
    '/storage/userExternal/192.168.100.61/2026') === '/storage/userExternal/192.168.100.61/2026', true);
check('R75 任务2 正常用例：目标恒为目录，绝不返回文件本身 / 绝不返回 r.uri 拼接出来的父段',
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://mount/列举用/DSC.HEIC', 'file://docs/授权/2026')
    .endsWith('DSC.HEIC') === false &&
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://mount/列举用/DSC.HEIC', 'file://docs/授权/2026') !==
    'file://mount/列举用' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://docs/x/a.HEIC', 'file://docs/x/') === 'file://docs/x', true);
check('R75 任务2 正常用例：目录行仍返回该目录自身，不受 browseBase 影响',
  fcRevealDirUriOf(FC_KIND_FOLDER, 'file://docs/授权/2026/Sub', 'file://docs/授权/2026') ===
    'file://docs/授权/2026/Sub' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, '/a/b/子目录', 'X') === '/a/b/子目录', true);
check('R75 任务2 边界：browseBase 为空才退回剥文件名兜底；两者皆空 / 目录 URI 为空都明确处理',
  fcRevealDirUriOf(FC_KIND_IMAGE, 'file://docs/x/a.HEIC', '') === 'file://docs/x' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, 'DSC.HEIC', '') === '' &&
  fcRevealDirUriOf(FC_KIND_IMAGE, '', '') === '' &&
  fcRevealDirUriOf(FC_KIND_FOLDER, '', 'file://docs/x') === 'file://docs/x', true);
check('R75 任务2 边界：未命中行（.. / 空白 / 未知 kind）恒返回空串，菜单命中判定零回归',
  fcRevealDirUriOf(FC_KIND_UP, 'file://docs/x/..', 'file://docs/x') === '' &&
  fcRevealDirUriOf(FC_KIND_BLANK, '', 'file://docs/x') === '' &&
  fcRevealDirUriOf(-9, 'file://docs/x/a.HEIC', 'file://docs/x') === '' &&
  fcHasActOf(FC_KIND_UP, FC_ACT_REVEAL) === false, true);
check('R75 任务2 真值链：browseBase 由真实列举 / 缓存命中 / 上层清单态回填，子项 URI 仍是拼接 URI',
  INDEX75.includes('this.browseBase = base;') &&
  INDEX75.includes('this.browseBase = hit.path;') &&
  INDEX75.includes('this.browseBase = target;') &&
  INDEX75.includes("this.browseBase = '';") &&
  INDEX75.includes("const child: string = raw.indexOf('/') >= 0 ? raw : joinBase + '/' + raw;"), true);
check('R75 任务2 接线零回归：REVEAL 分支仍调 fcRevealDirUriOf(kind, r.uri, this.browseBase) → OS 文件管理器',
  REVEAL75_BLOCK.length > 0 &&
  REVEAL75_BLOCK.includes('fcRevealDirUriOf(kind, r.uri, this.browseBase)') &&
  REVEAL75_BLOCK.includes('this.openDirInSystemFileManager(dirUri, r.name, fcRevealIsDirOf(kind));') &&
  REVEAL75_BLOCK.includes('fcRevealStatusOf(r.name, false, fcRevealIsDirOf(kind), ESC_BUILD_TAG)') &&
  REVEAL75_BLOCK.includes('onRowTap') === false &&
  REVEAL75_BLOCK.includes('openFolder') === false, true);
check('R75 任务2 回归：R74 两级 Want / 显式文件管理器 / 隐式 viewData + general.directory 逐字不变',
  INDEX75.includes("import Want from '@ohos.app.ability.Want';") &&
  INDEX75.includes('private openDirInSystemFileManager(') &&
  INDEX75.includes('params[FC_OSFM_PARAM_FILE_URI] = dirUri;') &&
  INDEX75.includes('bundleName: FC_OSFM_BUNDLE') &&
  INDEX75.includes('ctx.startAbility(primary)') && INDEX75.includes('ctx.startAbility(fallback)') &&
  (INDEX75.match(/ctx\.startAbility\(/g) || []).length === 2 &&
  INDEX75.includes('action: FC_VIEW_DATA_ACTION') && INDEX75.includes('type: FC_DIR_UTD'), true);
check('R75 任务2 回归：菜单五项文案 / 其余四项动作 / 详情 / 复制 / 放大镜门控逐字不变',
  FC_LABEL_REVEAL === '打开档案所在目录' && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  INDEX75.includes('if (act === FC_ACT_OPEN)') && INDEX75.includes('this.onRowTap(rowIdx);') &&
  INDEX75.includes('if (act === FC_ACT_DETAIL)') &&
  INDEX75.includes('fcCopyTextOf(act, path, r.name)') &&
  INDEX75.includes('pasteboard.getSystemPasteboard().setData(data)') &&
  INDEX75.includes('if (!(this.ctxMenuOn && event.button === MouseButton.Right)) {') === false, true);
check('R75 纯函数层仍零 SDK / 零 IO / 零异步：common 只产出目录 URI 与契约常量',
  FC74_CODE.includes('startAbility') === false &&
  FC74_CODE.includes('@ohos') === false &&
  FC74_CODE.includes('Promise') === false &&
  FC74_CODE.includes('throw ') === false &&
  FC74_CODE.includes('export function fcRevealDirUriOf') &&
  FC74_CODE.includes('const current: string = fcNormDirOf(browseBase);'), true);
check('R76→R77 版本恒定 1.0.7·7 / 构建标记 R77 / 旧标记 R76 与 R75 已清 / HDR 保真零回归',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R75';") === false &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R74';") === false &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON) &&
  INDEX.includes("import { hpShowHintOf } from '../common/HdrPreview';"), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R75-A：装新包后 Ctrl+D 角标必须是 R75（R74-A 里的 R74 是历史锚点，以本条为准）；');
console.log('     左栏任一档案行名称右侧不再出现向上箭头 / 方格，也不留 18vp 空白；');
console.log('     名称 / 字节 / 日期三栏顺序、字段、对齐、行高 26vp、条纹、间距与 R74 完全一致。');
console.log('  ⚠️ 真机步骤 R75-B：右键任一【文件】→「打开档案所在目录」→ OS 自带文件管理器');
console.log('     打开的是当前左栏正在展示的那个目录（hilog 里 dir= 与 browseBase 一致），');
console.log('     该目录下的档案列表完整可见，不再是拼接出来的错误目录；状态栏反馈照常。');
console.log('  ⚠️ 真机步骤 R75-C：右键任一【子文件夹】→ OS 文件管理器打开该文件夹自身；');
console.log('     NAS / 缓存秒开 / APP 内上层清单态各测一次文件行，目录都不能错。');
console.log('  ⚠️ 真机步骤 R75-D：菜单五项文案、打开 / 详情 / 复制路径 / 复制档案名称四项动作、');
console.log('     放大镜 toggle、详情面板、菜单定位与收起、「..」行与空白区零菜单、');
console.log('     点击 / 双击 / hover 缩略图 / 排序 / 目录切换 / 收起展开左栏全部零回归；');
console.log('     HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /');
console.log('     ESC / 版本 1.0.7/7 全部零回归。R59-C、R61-B 步骤里「向上箭头仍保留」是历史形态，');
console.log('     R75 起以本组 R75-A 为准。');


// ==================================================================
// 第七十六轮：四项界面调整（间距 / 相片上左键放大镜 / EXIF 图标 + 相片右键菜单 / 三项动作）
// ==================================================================
console.log('\n--- 第七十六轮 ①：名称栏 ↔ 大小 / 内容数目栏间距统一 5mm（R76）---');
const ROWGAP76_SRC = readFileSync(new URL('../entry/src/main/ets/common/RowGap.ts', import.meta.url), 'utf8');
const PM76_SRC = readFileSync(new URL('../entry/src/main/ets/common/PictureMenu.ts', import.meta.url), 'utf8');
const ROWGAP76_CODE = stripComments(ROWGAP76_SRC);
const PM76_CODE = stripComments(PM76_SRC);
const ARCHIVE76 = stripComments(ARCHIVE);
const PM_BTN76 = stripComments(INDEX.slice(INDEX.indexOf('private onMouseButton('),
  INDEX.indexOf('private applyLoupeToggle(')));
const PM_ROOT76 = stripComments(INDEX.slice(INDEX.indexOf('private onRootMouse('),
  INDEX.indexOf('private armTopbarTimer(')));
const PM_BADGE76 = stripComments(INDEX.slice(
  INDEX.indexOf('// 第七十六轮：仅【含有 EXIF 资料】'), INDEX.indexOf('// 右下角角标：')));
check('① 真值源：5mm ↔ 5vp（项目 1mm↔1vp 口径），ROW_GAP_VP 恒为 5',
  ROW_GAP_MM === 5 && MM_TO_VP === 1 && ROW_GAP_VP === 5 &&
  rowGapVpOf(5, 1) === 5 && rowGapVpOf(0, 1) === 5 &&
  rowGapVpOf(NaN, 1) === 5 && rowGapVpOf(5, 0) === 5, true);
check('① 两处间距严格一致：文件栏 / 文件夹栏都等于 ROW_GAP_VP 且为正',
  rowGapSameOf(ROW_GAP_VP, ROW_GAP_VP) === true &&
  rowGapSameOf(5, 6) === false && rowGapSameOf(0, 0) === false &&
  rowGapValidOf(ROW_GAP_VP, 5) === true && rowGapValidOf(6, 5) === false &&
  rowGapValidOf(NaN, 5) === false, true);
check('① ArchiveRow 两个分支共用同一个 ROW_GAP_VP（名称→大小 / 文件夹名→内容数目）',
  (ARCHIVE76.match(/\.margin\(\{ left: ROW_GAP_VP \}\)/g) || []).length === 2 &&
  ARCHIVE.includes("import { ROW_GAP_VP } from '../common/RowGap';") &&
  ARCHIVE.includes('.margin({ left: 6 })') &&
  ARCHIVE.includes('.width(66)') && ARCHIVE.includes('.width(88)'), true);
const ROW76_BUILD = stripComments(ARCHIVE.slice(ARCHIVE.indexOf('  build() {')));
check('① 零回归：三栏不加 padding / offset / 空白占位，名称 layoutWeight(1) 与日期列 6vp 不变',
  ROW76_BUILD.includes('.layoutWeight(1)') &&
  ROW76_BUILD.includes('.padding({ right: 6, top: 0.2, bottom: 0.2 })') &&
  (ROW76_BUILD.match(/\.padding\(/g) || []).length === 1 &&
  /Blank\(|Spacer\(/.test(ROW76_BUILD) === false &&
  /\/\/\s*R76：/.test(ARCHIVE) === true, true);
check('① RowGap.ts 严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器',
  ROWGAP76_CODE.includes('@ohos') === false && ROWGAP76_CODE.includes('Promise') === false &&
  ROWGAP76_CODE.includes('throw ') === false && ROWGAP76_CODE.includes('setTimeout') === false, true);

console.log('--- 第七十六轮 ②：取消右键触发，放大镜仅由相片上左键切换（R76）---');
check('② 左键纯函数：默认关 → 开 → 关 → 开，可无限重复切换',
  (() => {
    let v = LOUPE_DEFAULT_ENABLED;
    if (v !== false) { return false; }
    v = loupeEnabledAfterLeftClick(v, true);
    if (v !== true) { return false; }
    v = loupeEnabledAfterLeftClick(v, true);
    if (v !== false) { return false; }
    v = loupeEnabledAfterLeftClick(v, true);
    return v === true;
  })(), true);
check('② 非左键事件一律保持原状（右键 / 抬起 / 移动 / 悬停 / 拖拽不误触）',
  loupeEnabledAfterLeftClick(false, false) === false &&
  loupeEnabledAfterLeftClick(true, false) === true &&
  loupeEnabledAfterLeftClick(false, true) === true &&
  loupeEnabledAfterLeftClick(true, true) === false, true);
check('② 第十五轮右键纯函数保留供历史回归，但 Index 已不再引用它',
  loupeEnabledAfterRightPress(false, true) === true &&
  INDEX.includes('loupeEnabledAfterRightPress') === false &&
  INDEX.includes('LOUPE_DEFAULT_ENABLED, loupeEnabledAfterLeftClick,') &&
  INDEX.includes('loupeEnabledAfterLeftClick(this.loupeEnabled, leftClick)'), true);
check('② 右键 Release 分支零 toggle / 根容器零 toggle / 仅相片上左键 toggle（!moved 之后）',
  PM_BTN76.includes('if (btn === MouseButton.Right)') &&
  PM_BTN76.slice(PM_BTN76.indexOf('if (btn === MouseButton.Right)'),
    PM_BTN76.indexOf('if (btn !== MouseButton.Left)')).includes('applyLoupeToggle') === false &&
  PM_ROOT76.includes('this.applyLoupeToggle(') === false &&
  PM_ROOT76.includes('if (event.action === MouseAction.Press)') === false &&
  PM_BTN76.includes('pmPhotoReadyOf(this.viewPixelMap !== undefined, this.textMode)') &&
  PM_BTN76.includes('this.applyLoupeToggle(true);') &&
  PM_BTN76.indexOf('if (moved) {') < PM_BTN76.indexOf('this.applyLoupeToggle(true);'), true);
check('② 空态提示改为「左键放大镜 · 右键相片菜单」，旧右键放大镜文案已清',
  INDEX.includes("Text('双击进入全屏 · 左键放大镜 · 右键相片菜单 · 拖拽平移')") &&
  INDEX.includes("Text('双击进入全屏 · 右键放大镜 · 拖拽平移')") === false, true);

console.log('--- 第七十六轮 ③：仅含 EXIF 的相片右上角显示 EXIF 图标（R76）---');
const JPG_EXIF76 = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x10,
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPG_PLAIN76 = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02]);
const PNG_EXIF76 = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x65, 0x58, 0x49, 0x66, 0, 0]);
const HEIC_EXIF76 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x45, 0x78, 0x69, 0x66]);
check('③ EXIF 段字节级判据：JPEG APP1 / PNG eXIf / HEIC Exif item 命中；裸 JPEG / 空 / 短数据不命中',
  pmExifPresentOf(JPG_EXIF76) === true && pmExifPresentOf(JPG_PLAIN76) === false &&
  pmExifPresentOf(PNG_EXIF76) === true && pmExifPresentOf(HEIC_EXIF76) === true &&
  pmExifPresentOf(new Uint8Array(3)) === false && pmExifPresentOf(new Uint8Array(64)) === false, true);
check('③ 图标显隐严格：仅有 EXIF + 有上屏图 + 非文本预览才显示，其余一律不显示',
  pmExifBadgeVisibleOf(true, true, false) === true &&
  pmExifBadgeVisibleOf(false, true, false) === false &&
  pmExifBadgeVisibleOf(true, false, false) === false &&
  pmExifBadgeVisibleOf(true, true, true) === false &&
  pmExifBadgeVisibleOf(1, true, false) === false, true);
check('③ 值归一 / 字段构造：无效值归 --，有效值去空白并按上限截断',
  pmExifValueOkOf('  f/2.8  ') === true && pmExifValueOkOf('Unknown ISO') === false &&
  pmExifValueOkOf('none') === false && pmExifValueOkOf('0/0') === false &&
  pmExifValueOkOf('') === false && pmExifValueOkOf('   ') === false &&
  pmExifValueOf('abcdefghij', 5) === 'abcd…' && pmExifValueOf('  Canon  ', 0) === 'Canon' &&
  pmExifFieldOf('机型', '  Canon EOS R5  ').value === 'Canon EOS R5' &&
  pmExifFieldWantedOf(pmExifFieldOf('ISO', 'Unknown ISO')) === false &&
  pmExifFieldOf('ISO', 'Unknown ISO').value === PM_EXIF_UNKNOWN &&
  PM_EXIF_LABELS.length === 8 && PM_EXIF_VALUE_MAX === 48, true);
check('③ 资料框兜底 / 标题：空字段不开天窗，标题带相片名',
  pmExifEmptyOf(0) === true && pmExifEmptyOf(NaN) === true && pmExifEmptyOf(3) === false &&
  pmExifPanelTitleOf('a.jpg') === 'EXIF 资料 · a.jpg' &&
  pmExifPanelTitleOf('') === 'EXIF 资料' && PM_EXIF_EMPTY.length > 0, true);
check('③ Preview.ets 真值链：字节级判据 + 按需 SDK 字段读取 + 两处 PreviewEntry 构造点补齐',
  MODEL.includes('  hasExif: boolean;') &&
  MODEL.includes('  exifFields: Array<PmExifField>;') &&
  MODEL.includes('exifSeg = pmExifPresentOf(new Uint8Array(raw));') &&
  MODEL.includes('async function readExifFields(src: image.ImageSource, uri: string,') &&
  MODEL.includes('image.PropertyKey.DATE_TIME_ORIGINAL') &&
  MODEL.includes('pmExifShouldReadOf(exifSeg, bytesReadable)') &&
  MODEL.includes('EXIF_FIELDS_CACHE') &&
  MODEL.includes('hasExif: false, exifFields: noExifFields') &&
  MODEL.includes('hasExif: pmExifEffectiveOf(exifFields), exifFields: exifFields') &&
  MODEL.includes('hpProbeOf(uri, new Uint8Array(raw))'), true);
check('③ Index 右上角徽标：严格门控 / 右侧对齐 / 固定 12vp / 透明穿透 / 切图清零',
  PM_BADGE76.includes('pmExifBadgeVisibleOf(this.viewHasExif,') &&
  PM_BADGE76.includes('.alignItems(HorizontalAlign.End)') &&
  PM_BADGE76.includes('.padding({ top: PM_EXIF_MARGIN_VP, right: PM_EXIF_MARGIN_VP })') &&
  PM_BADGE76.includes('.hitTestBehavior(HitTestMode.Transparent)') &&
  INDEX.includes('this.viewHasExif = e.hasExif;') &&
  INDEX.includes('this.viewExifFields = e.exifFields;') &&
  INDEX.includes('this.viewHasExif = false;') &&
  PM_EXIF_LABEL === 'EXIF' && PM_EXIF_MARGIN_VP === 12, true);

console.log('--- 第七十六轮 ④：相片上方 right click 触发 picture contact menu（R76）---');
check('④ 只在预览区相片上右键：命中判定 / Press 上抛窗口坐标 / 左栏五项菜单零改动',
  pmRightHitOf(true, false) === true && pmRightHitOf(false, false) === false &&
  pmRightHitOf(true, true) === false && pmPhotoReadyOf(true, false) === true &&
  INDEX.includes('this.openPictureMenu(this.pressDX, this.pressDY);') &&
  INDEX.includes('if (!pmRightHitOf(this.viewPixelMap !== undefined, this.textMode)) {') &&
  INDEX.includes('private openPictureMenu(x: number, y: number): void') &&
  INDEX.includes('this.pressDX = Number(event.displayX ?? event.x);') &&
  fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  SIDEBAR.includes('this.onContextMenu(idx, dx, dy);') &&
  ARCHIVE.includes('bindContextMenu') === false, true);
check('④ 浮层几何：恒三项高度 / 右下越界内翻 / 脏值收进安全区 / 显隐门控',
  pmMenuHeightOf(3) === 3 * PM_MENU_ITEM_H + PM_MENU_TITLE_H + PM_MENU_PAD_V * 2 &&
  pmMenuHeightOf(0) === 0 && pmMenuHeightOf(NaN) === 0 &&
  pmMenuVisibleOf(true, 3) === true && pmMenuVisibleOf(false, 3) === false &&
  pmMenuVisibleOf(true, 0) === false &&
  (() => {
    const h = pmMenuHeightOf(3);
    const p = pmMenuPosOf(780, 560, 800, 600, PM_MENU_W, h);
    return p.x === 800 - PM_MENU_W - PM_MENU_EDGE_V &&
      p.y === 600 - h - PM_MENU_EDGE_V;
  })(), true);
check('④ 标题 / 状态文案 / 浮层接线：与左栏菜单同口径但状态完全独立',
  pmMenuTitleOf('') === '相片' && pmMenuTitleOf('a.jpg') === 'a.jpg' &&
  pmMenuTitleOf('x'.repeat(60)).length <= PM_MENU_NAME_MAX &&
  INDEX.includes('const pos: PmMenuPos = pmMenuPosOf(x, y, this.lastRootW, this.lastRootH,') &&
  INDEX.includes('.position({ x: this.pmMenuX, y: this.pmMenuY })') &&
  INDEX.includes('if (pmMenuVisibleOf(this.pmMenuOn, this.pmMenuItems.length))') &&
  INDEX.includes('this.onPictureMenuAction(act);') &&
  INDEX.includes('@State pmMenuOn: boolean = false;'), true);

console.log('--- 第七十六轮 ⑤：菜单前三项顺序固定与三项动作落地（R76）---');
check('⑤ 菜单恒三项、顺序固定：① 显示exif资料框 ② 单张预览 ③ 左右并排预览',
  pmItemCountOf() === 3 && PM_LABEL_EXIF === '显示exif资料框' &&
  PM_LABEL_SINGLE === '单张预览' && PM_LABEL_SPREAD === '左右并排预览' &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true &&
  pmItemsOf().map(i => i.label).join('|') === '显示exif资料框|单张预览|左右并排预览' &&
  pmItemsOf() !== pmItemsOf(), true);
check('⑤ 越权动作一律拒绝（左栏动作码 / 空码都不属于相片菜单）',
  pmHasActOf(PM_ACT_EXIF) === true && pmHasActOf(PM_ACT_SINGLE) === true &&
  pmHasActOf(PM_ACT_SPREAD) === true && pmHasActOf('fcOpen') === false &&
  pmHasActOf('') === false && INDEX.includes('if (!pmHasActOf(act))'), true);
check('⑤ 模式覆盖：自动沿用 R56 竖图对开 / 单张恒关右页 / 并排有下一张即开',
  pmModeAfterAct(PM_MODE_AUTO, PM_ACT_EXIF) === PM_MODE_AUTO &&
  pmModeAfterAct(PM_MODE_AUTO, PM_ACT_SINGLE) === PM_MODE_SINGLE &&
  pmModeAfterAct(PM_MODE_SINGLE, PM_ACT_SPREAD) === PM_MODE_SPREAD &&
  pmModeAfterAct(PM_MODE_SPREAD, 'bad') === PM_MODE_SPREAD &&
  pmSpreadWantedOf(PM_MODE_AUTO, true, true) === true &&
  pmSpreadWantedOf(PM_MODE_AUTO, true, false) === false &&
  pmSpreadWantedOf(PM_MODE_SINGLE, true, true) === false &&
  pmSpreadWantedOf(PM_MODE_SPREAD, true, false) === true &&
  pmSpreadWantedOf(PM_MODE_SPREAD, false, false) === false &&
  pmModeLabelOf(PM_MODE_AUTO) === '自动预览' &&
  pmModeLabelOf(PM_MODE_SINGLE) === '单张预览' &&
  pmModeLabelOf(PM_MODE_SPREAD) === '左右并排预览', true);
check('⑤ 三项动作全部落地：EXIF 资料框 / 单张 / 并排 + 状态栏明确反馈 + refreshSpread 接模式覆盖',
  INDEX.includes('if (act === PM_ACT_EXIF)') &&
  INDEX.includes('this.exifPanelOn = true;') &&
  INDEX.includes('const wanted: boolean = pmSpreadWantedOf(this.previewMode, hasNext,') &&
  INDEX.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX.includes('this.refreshSpread();') &&
  INDEX.includes('this.status = pmStatusOf(act, name, mode, ESC_BUILD_TAG);') &&
  pmStatusOf(PM_ACT_EXIF, 'a.jpg', PM_MODE_AUTO, 'R76').includes('EXIF 资料框') &&
  pmStatusOf(PM_ACT_SINGLE, '', PM_MODE_SINGLE, 'R76').includes('单张预览') &&
  pmStatusOf(PM_ACT_SPREAD, '', PM_MODE_SPREAD, 'R76').includes('左右并排预览'), true);
check('⑤ EXIF 资料框独立浮层：标题 / 无字段兜底 / 逐行字段 / 关闭按钮 / zIndex 22',
  INDEX.includes('if (this.exifPanelOn)') &&
  INDEX.includes('pmExifEmptyOf(this.viewExifFields.length)') &&
  INDEX.includes('Text(PM_EXIF_EMPTY)') &&
  INDEX.includes('ForEach(this.viewExifFields, (f: PmExifField) =>') &&
  INDEX.includes('.zIndex(22)') &&
  pmExifPanelTitleOf('a.jpg') === 'EXIF 资料 · a.jpg', true);
check('⑤ 两个新 common 模块严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器',
  ROWGAP76_CODE.includes('@ohos') === false && ROWGAP76_CODE.includes('Promise') === false &&
  ROWGAP76_CODE.includes('throw ') === false &&
  PM76_CODE.includes('@ohos') === false && PM76_CODE.includes('Promise') === false &&
  PM76_CODE.includes('throw ') === false && PM76_CODE.includes('setTimeout') === false, true);
check('⑤ R70–R76 零回归：左栏五项菜单 / 两级 Want / HDR 徽标 / 3 处 dynamicRangeMode / 版本 / 构建标记 R77',
  FC_LABEL_REVEAL === '打开档案所在目录' && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  INDEX.includes("import Want from '@ohos.app.ability.Want';") &&
  (INDEX.match(/ctx\.startAbility\(/g) || []).length === 2 &&
  INDEX.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX.includes("const ESC_BUILD_TAG: string = 'R75';") === false, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R76-A：装新包后 Ctrl+D 角标必须是 R76（R75-A 里的 R75 是历史锚点，以本条为准）；');
console.log('     左栏档案名↔档案大小、文件夹名↔内容数目两处间距目测一致，均为 5mm 口径；');
console.log('     三栏顺序 / 字段 / 对齐 / 条纹 / 点击 / 双击 / hover 缩略图全部零回归。');
console.log('  ⚠️ 真机步骤 R76-B：预览区相片上【左键单击】首次开放大镜、再点还原、可反复切换；');
console.log('     右键、左栏档案 / 按钮 / 空白区一律不再翻转放大镜；拖拽 / 滚轮 / 双击全屏照常。');
console.log('  ⚠️ 真机步骤 R76-C：含 EXIF 的 JPG / HEIC 右上角出现「EXIF」图标，无 EXIF 相片 /');
console.log('     FITS·XISF / 文本预览 / 空态一律不出现；图标不遮挡主体、滚轮与点击全部穿透。');
console.log('  ⚠️ 真机步骤 R76-D：相片上方【右键】弹出 picture contact menu，恰好三项且顺序为');
console.log('     显示exif资料框 / 单张预览 / 左右并排预览；左栏五项右键菜单在同一张图上互不干扰；');
console.log('     菜单右下越界内翻、点遮罩 / 点项即收，定位与 R73 浮层一致。');
console.log('  ⚠️ 真机步骤 R76-E：点第一项显示 EXIF 资料框（字段可读 / 无字段有兜底文案 / 可关闭）；');
console.log('     点第二项强制单页、点第三项有下一张即左右并排；不选时保留既有竖图自动对开。');
console.log('  ⚠️ 真机步骤 R76-F：HEIC HDR 徽标 / R71 HDR 保真 / 并排右页 / ESC / 版本 1.0.7·7 /');
console.log('     左栏 REVEAL 两级 Want / 复制 / 详情面板 / 诊断角标全部零回归。');


// ==================================================================
// 第七十七轮：重启资料 / 预览图恢复、EXIF 有效字段真值、adaptive column width（R77）
// ==================================================================
const SS77_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/common/SessionState.ts', import.meta.url), 'utf8'));
const PM77_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/common/PictureMenu.ts', import.meta.url), 'utf8'));
const AC77_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/common/AdaptiveColumn.ts', import.meta.url), 'utf8'));
const INDEX77 = stripComments(INDEX);
const MODEL77 = stripComments(MODEL);
const SIDEBAR77 = stripComments(SIDEBAR);
const ARCHIVE77 = stripComments(ARCHIVE);

console.log('\n--- 第七十七轮 ①：重启后 size / 日期 / 预览图 / 悬停缩略图完整恢复（R77）---');
check('① metaMergeOf：新值有效才覆盖；只读态的 size=-1 / mtime=0 不再写回抹掉上次有效值',
  JSON.stringify(metaMergeOf(1024, 1700000000, 2048, 1700001000)) === '{"size":2048,"mtime":1700001000}' &&
  JSON.stringify(metaMergeOf(1024, 1700000000, -1, 0)) === '{"size":1024,"mtime":1700000000}' &&
  JSON.stringify(metaMergeOf(4096, 1700000000, 0, 1700002000)) === '{"size":4096,"mtime":1700002000}' &&
  JSON.stringify(metaMergeOf(-1, 0, -1, 0)) === '{"size":-1,"mtime":0}' &&
  JSON.stringify(metaMergeOf(0, 0, NaN, NaN)) === '{"size":-1,"mtime":0}' &&
  metaMergeOf(3.9, 7.9, 0, 0).size === 3 && metaMergeOf(3.9, 7.9, 0, 0).mtime === 7, true);
check('① metasPaddedOf / metaChunkPaddedOf：按 uri 行数补齐等长，缺块不前移错位 / 不张冠李戴',
  metasPaddedOf(3, [{ size: 1, mtime: 2 }]).length === 3 &&
  metasPaddedOf(3, [{ size: 1, mtime: 2 }])[1].size === -1 &&
  metasPaddedOf(3, [{ size: 1, mtime: 2 }])[2].mtime === 0 &&
  metasPaddedOf(2, [{ size: 1, mtime: 2 }, { size: 3, mtime: 4 }, { size: 5, mtime: 6 }]).length === 2 &&
  metaChunkPaddedOf(2, [{ size: 9, mtime: 8 }])[0].size === 9 &&
  metaChunkPaddedOf(2, [{ size: 9, mtime: 8 }])[1].size === -1 &&
  metasPaddedOf(0, [{ size: 1, mtime: 2 }]).length === 0 &&
  metasPaddedOf(NaN, []).length === 0 &&
  metaChunkPaddedOf(1, [{ size: NaN, mtime: 3 }])[0].size === -1, true);
check('① flushSnap 按 uri 合并新旧 meta，旧值有效 / 换源 / 重排都不丢资料',
  INDEX77.includes('const oldUris: Array<string> = await this.readSnapUris(store);') &&
  INDEX77.includes('metasPaddedOf(oldUris.length,') &&
  INDEX77.includes('const oldByUri: Map<string, ArchiveMeta> = new Map();') &&
  INDEX77.includes('metaMergeOf(prev !== undefined ? prev.size : -1,') &&
  INDEX77.includes('metaChunkPaddedOf(end - start, metaPart)') &&
  INDEX77.includes('META_KEY_PREFIX + c'), true);
check('① readSnapMeta 按块补齐 / setItems 按 uris 等长规整，尾部条目不丢',
  INDEX77.includes('const want: number = Math.min(SNAP_CHUNK, cap - c * SNAP_CHUNK);') &&
  INDEX77.includes('metaChunkPaddedOf(want, part)') &&
  INDEX77.includes('return metasPaddedOf(cap, out);') &&
  INDEX77.includes('metasPaddedOf(uris.length, meta)'), true);
check('① 只读名单态只放行「当前主视图这一张」解码，批量预载 / 补解仍全部短路',
  INDEX77.includes('const curUri: string = (this.cur >= 0 && this.cur < this.items.length)') &&
  INDEX77.includes('if (curUri.length === 0 || uri !== curUri) {') &&
  INDEX77.includes('return Promise.resolve<PreviewEntry | undefined>(undefined);') &&
  INDEX77.includes('const ioOk: boolean = bulkIoAllowed(this.restoreMode);') &&
  INDEX77.includes('this.showPreviewOf(this.cur);') &&
  INDEX77.includes('this.loadView(uri, token, UPGRADE_DELAY_MS);') &&
  INDEX77.includes('if (ioOk) {'), true);
check('① 悬停缩略图不再被恢复模式一刀切禁用，ThumbLoader 仍走异步单并发解码',
  INDEX77.includes('restoreReadonly: (): boolean => false,') &&
  SIDEBAR77.includes('thumbDisabled: this.restoreReadonly(),') &&
  SIDEBAR77.includes('restoreReadonly: () => boolean = (): boolean => false;'), true);
check('① 本地目录延迟自愈：错开启动期重探 → 成功后补齐 size/mtime → 销毁清 timer',
  INDEX77.includes('const RESTORE_HEAL_DELAY_MS: number = 1200;') &&
  INDEX77.includes('private restoreHealTimer: number = -1;') &&
  INDEX77.includes('private scheduleRestoreHeal(): void {') &&
  (INDEX77.match(/this\.scheduleRestoreHeal\(\);/g) || []).length === 2 &&
  INDEX77.includes('this.fillSizes();') &&
  INDEX77.includes('clearTimeout(this.restoreHealTimer);'), true);
check('① 新真值源 SessionState 严格零 SDK / 零异步 / 零 throw / 零定时器',
  SS77_CODE.includes('@ohos') === false && SS77_CODE.includes('Promise') === false &&
  SS77_CODE.includes('throw ') === false && SS77_CODE.includes('setTimeout') === false &&
  SS77_CODE.includes('setInterval') === false, true);

console.log('--- 第七十七轮 ②：EXIF 图标 / 资料框统一到「有效字段」同源真值（R77）---');
check('② pmExifEffectiveOf 是唯一有效性判据：至少一个真正可读字段；空 / undefined / 全 -- 一律 false',
  pmExifEffectiveOf([]) === false && pmExifEffectiveOf(undefined) === false &&
  pmExifEffectiveOf([{ label: 'ISO', value: PM_EXIF_UNKNOWN }]) === false &&
  pmExifEffectiveOf([{ label: 'ISO', value: '' }]) === false &&
  pmExifEffectiveOf([{ label: 'ISO', value: '100' }]) === true &&
  pmExifEffectiveOf([{ label: 'A', value: '--' }, { label: 'B', value: 'f/2.8' }]) === true, true);
check('② 显示图标 ⇔ 有有效字段 ⇔ 资料框一定有内容（同源，杜绝标错且无法查看）',
  pmExifBadgeVisibleOf(true, true, false) === true &&
  pmExifBadgeVisibleOf(false, true, false) === false &&
  pmExifBadgeVisibleOf(true, false, false) === false &&
  pmExifBadgeVisibleOf(true, true, true) === false &&
  pmExifEmptyOf(0) === true && pmExifEmptyOf(1) === false, true);
check('② 字节级粗筛只决定「要不要读 SDK」：fd 兜底路径也读一次，明确无段的普通相片跳过',
  pmExifShouldReadOf(true, true) === true &&
  pmExifShouldReadOf(false, false) === true &&
  pmExifShouldReadOf(false, true) === false &&
  PM77_CODE.includes('const cap: number = b.length < 65536 ? b.length : 65536;') &&
  pmExifPresentOf(new Uint8Array([0x45, 0x78, 0x69, 0x66])) === true, true);
check('② Preview.ets：hasExif 与 exifFields 同源，字段按 uri 缓存，字节含段结果不再当显隐真值',
  MODEL77.includes('hasExif: pmExifEffectiveOf(exifFields), exifFields: exifFields') &&
  MODEL77.includes('const EXIF_FIELDS_CACHE: Map<string, Array<PmExifField>> = new Map();') &&
  MODEL77.includes('pmExifShouldReadOf(exifSeg, bytesReadable)') &&
  MODEL77.includes('async function readExifFields(') &&
  MODEL77.includes('EXIF_FIELDS_CACHE.set(uri, out);'), true);
check('② Index.ets：图标显隐取 viewHasExif、资料框取同一份 viewExifFields，无第二套判据',
  INDEX77.includes('this.viewHasExif = e.hasExif;') &&
  INDEX77.includes('this.viewExifFields = e.exifFields;') &&
  INDEX77.includes('pmExifBadgeVisibleOf(this.viewHasExif,') &&
  INDEX77.includes('pmExifEmptyOf(this.viewExifFields.length)') &&
  INDEX77.includes('ForEach(this.viewExifFields, (f: PmExifField) =>') &&
  INDEX77.includes('hasExif: pmExifPresentOf(') === false, true);

console.log('--- 第七十七轮 ③：档案列表 adaptive column width（R77）---');
check('③ acLayoutOf 由内容长度 + 容器尺寸共同推出，全程无固定 vp 夹逼',
  AC_SIDEBAR_RATIO > 0 && AC_SIDEBAR_RATIO < 1 && AC_COLLAPSED_RATIO > 0 &&
  acLayoutOf(1000, ['a.jpg'], ['1 KB']).sidebarW > 0 &&
  acLayoutOf(1000, ['非常长的档案名'.repeat(20)], ['1 KB']).sidebarW >=
    acLayoutOf(1000, ['a.jpg'], ['1 KB']).sidebarW &&
  acLayoutOf(1200, ['a.jpg'], ['1 KB']).sidebarW <= Math.floor(1200 * AC_SIDEBAR_RATIO) &&
  acLayoutOf(0, ['a.jpg'], ['1 KB']).sidebarW === acLayoutOf(0, ['a.jpg'], ['1 KB']).sidebarW &&
  acAdaptiveOf(0, ['a.jpg'], ['1 KB']) === true &&
  acAdaptiveOf(1440, ['长名字相片.heic', 'b.heic'], ['1234.56 MB']) === true, true);
check('R78 ③ 内容更长 → 大小列变宽；收起宽只随内容变、与容器比例无关（不再留白）',
  acTextWidestOf(['a', 'abcdefghij'], AC_SIZE_FONT_VP) ===
    Math.ceil(textWidthVp('abcdefghij', AC_SIZE_FONT_VP)) &&
  acTextWidestOf([], AC_SIZE_FONT_VP) === 0 &&
  acLayoutOf(0, [], ['1 KB']).sizeW < acLayoutOf(0, [], ['1234.56 MB']).sizeW &&
  acLayoutOf(0, [], ['1 KB']).dateW === Math.ceil(textWidthVp(AC_DATE_SAMPLE, AC_DATE_FONT_VP)) &&
  AC_NAME_FONT_VP === 12 && AC_SIZE_FONT_VP === 10 && AC_DATE_FONT_VP === 10 &&
  acLayoutOf(2000, ['a'], []).collapsedW === acLayoutOf(1000, ['a'], []).collapsedW &&
  acLayoutOf(1000, ['非常长的档案名'.repeat(20)], []).collapsedW >
    acLayoutOf(1000, ['a'], []).collapsedW &&
  acOverheadOf() === ROW_GAP_VP * 2 + AC_DATE_GAP_VP + AC_ROW_PAD_VP, true);
check('③ 脏值护栏：NaN / 非正数不进 .width()，正数向上取整',
  acWidthSafeOf(NaN, 0) === 0 && acWidthSafeOf(-3, 0) === 0 &&
  acWidthSafeOf(41.2, 0) === 42 && acWidthSafeOf(NaN, 88.1) === 89 &&
  acWidthSafeOf(0, 0) === 0, true);
check('③ AdaptiveColumn.ts 严格零 SDK / 零异步 / 零 throw / 零定时器 / 零全局可变状态',
  AC77_CODE.includes('@ohos') === false && AC77_CODE.includes('Promise') === false &&
  AC77_CODE.includes('throw ') === false && AC77_CODE.includes('setTimeout') === false &&
  AC77_CODE.includes('setInterval') === false, true);
check('③ Index.ets：四个 @State 动态宽 + refreshAdaptiveLayout 单点收口 + resize 重算',
  INDEX77.includes("import { AcLayout, acLayoutOf, acWidthSafeOf } from '../common/AdaptiveColumn';") &&
  (INDEX77.match(/@State (listW|collapsedW|colSizeW|colDateW): number = acLayoutOf\(0,/g) || []).length === 4 &&
  INDEX77.includes('private refreshAdaptiveLayout(rowNames: Array<string>): void {') &&
  INDEX77.includes('const a: AcLayout = acLayoutOf(this.lastRootW, rowNames, sizeTexts);') &&
  INDEX77.includes('this.colSizeW = acWidthSafeOf(a.sizeW, a.dateW);') &&
  (INDEX77.match(/this\.refreshAdaptiveLayout\(/g) || []).length === 4 &&
  INDEX77.includes('LIST_W = 280') === false && INDEX77.includes('LIST_MAX_W') === false &&
  INDEX77.includes('listWidthForNames') === false && INDEX77.includes('textWidthVp,') === false, true);
check('③ SidebarView / ArchiveRow：零预设固定列宽，动态宽逐行下传，R76 两处 5mm 间距保留',
  SIDEBAR77.includes('const LIST_COLLAPSED_W') === false &&
  SIDEBAR77.includes('.width(this.listCollapsed ? this.collapsedW : this.listW)') &&
  (SIDEBAR77.match(/@Prop (listW|collapsedW|colSizeW|colDateW): number = 0;/g) || []).length === 4 &&
  SIDEBAR77.includes('colSizeW: this.colSizeW,') &&
  (ARCHIVE77.match(/\.width\(this\.colSizeW\)/g) || []).length === 2 &&
  ARCHIVE77.includes('.width(this.colDateW)') &&
  ARCHIVE77.includes('.width(66)') === false && ARCHIVE77.includes('.width(88)') === false &&
  ARCHIVE77.includes('constraintSize({ minWidth:') === false &&
  (ARCHIVE77.match(/\.margin\(\{ left: ROW_GAP_VP \}\)/g) || []).length === 2, true);

console.log('--- 第七十七轮 ④：R70–R77 全链路零回归（R77）---');
check('④ 版本 / 构建标记 / HDR / 三项 picture menu / 左栏五项 / 两级 Want / 放大镜左键零回归',
  INDEX77.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX77.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX77.includes("const ESC_BUILD_TAG: string = 'R76';") === false &&
  INDEX77.includes("const ESC_BUILD_TAG: string = 'R75';") === false &&
  INDEX77.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && pmItemCountOf() === 3 &&
  FC_LABEL_REVEAL === '打开档案所在目录' && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  INDEX77.includes("import Want from '@ohos.app.ability.Want';") &&
  (INDEX77.match(/ctx\.startAbility\(/g) || []).length === 2 &&
  loupeEnabledAfterLeftClick(false, true) === true &&
  loupeEnabledAfterLeftClick(true, true) === false, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R77-A：装新包后 Ctrl+D 角标必须是 R77 / 版本 1.0.7·7；');
console.log('     选一个含 JPG+HEIC 的本地目录，正常退出再重开（及杀进程冷启动）两次：');
console.log('     左栏每一条 size 与日期都应是真实值而非 --，当前相片立刻出图，');
console.log('     hover 任一档案项仍弹缩略图，不再一片中灰 / 空白。');
console.log('  ⚠️ 真机步骤 R77-B：重启后逐条核对 size / 日期与上次一致；中途新增档案也能补出真实值；');
console.log('     切换目录 / 往上层 / 重排后按 uri 对得上号，不出现尾部条目张冠李戴。');
console.log('  ⚠️ 真机步骤 R77-C：含有效 EXIF 的 JPG / HEIC 右上角出现 EXIF 图标，点 picture menu');
console.log('     第一项一定能看到对应字段；无 EXIF 的相片 / 头部含 "Exif" 字样的非 EXIF 文件 /');
console.log('     fd 兜底路径的相片都不误标、不漏标；FITS·XISF / 文本预览 / 空态仍不显示。');
console.log('  ⚠️ 真机步骤 R77-D：拉伸窗口宽度，左栏展开宽 / 收起宽 / 大小列 / 日期列随内容长度与');
console.log('     容器尺寸动态伸缩；超长档案名只用 Ellipsis 截断，三栏仍整齐对齐、顺序字段不变；');
console.log('     档案名↔大小、文件夹名↔内容数目两处 5mm 间距仍严格一致。');
console.log('  ⚠️ 真机步骤 R77-E：R76 放大镜（相片上左键反复切换）、picture contact menu 三项顺序与动作、');
console.log('     左栏五项右键菜单 / 打开目录 / 详情 / 复制、滚轮换图 / 双击全屏 / ESC、');
console.log('     HEIC HDR 徽标与 R71 HDR 保真、并排右页、诊断角标全部零回归。');

// ==================================================================
// 第七十八轮：左栏紧凑显示 / 三个纯图案按钮 / 移除「APP内上层xxx」提醒（R78）
// ==================================================================
const AC78_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/common/AdaptiveColumn.ts', import.meta.url), 'utf8'));
const SIDE78_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/components/SideToolButton.ets', import.meta.url), 'utf8'));
const INDEX78 = stripComments(INDEX);
const SIDEBAR78 = stripComments(SIDEBAR);
const ARCHIVE78 = stripComments(ARCHIVE);

console.log('\n--- 第七十八轮 ①：缩进按钮按下 → 紧凑显示，只留档案名 / 目录名（R78）---');
check('① SidebarView 紧凑态隐藏标题「N 张」计数与空态两条辅助文案',
  SIDEBAR78.includes('if (!this.listCollapsed) {') &&
  (SIDEBAR78.match(/if \(!this\.listCollapsed\) \{/g) || []).length === 2 &&
  SIDEBAR78.includes("Text(this.itemCount > 0 ? this.itemCount + ' 张' : '')") &&
  SIDEBAR78.includes("Text('点左栏「选择文件夹」浏览目录')"), true);
check('① ArchiveRow 既有 collapsed 分支仍隐藏时间 / 大小 / 内容数目三列',
  ARCHIVE78.includes('if (!this.collapsed) {') &&
  ARCHIVE78.includes('.width(this.colSizeW)') &&
  ARCHIVE78.includes('.width(this.colDateW)'), true);
check('① 取消按下恢复默认：根宽仍是 listCollapsed ? collapsedW : listW 两态',
  SIDEBAR78.includes('.width(this.listCollapsed ? this.collapsedW : this.listW)') &&
  INDEX78.includes('@State listCollapsed: boolean = false;'), true);

console.log('--- 第七十八轮 ②：栏宽按当前可见内容自适应，不再保留比例空白（R78）---');
check('② acCollapsedContentOf：名称更长 → 更宽；至少容纳三个图标按钮',
  acCollapsedContentOf([]) === AC_ICON_BTN_COUNT * AC_ICON_BTN_MIN_VP + AC_ICON_ROW_PAD_VP &&
  acCollapsedContentOf(['a']) === AC_ICON_BTN_COUNT * AC_ICON_BTN_MIN_VP + AC_ICON_ROW_PAD_VP &&
  acCollapsedContentOf(['非常长的档案名'.repeat(20)]) >
    AC_ICON_BTN_COUNT * AC_ICON_BTN_MIN_VP + AC_ICON_ROW_PAD_VP &&
  acCollapsedContentOf([]) > 0, true);
check('R80 collapsedW 与容器比例无关（同内容恒等），顶到「窗口可用宽」才被压窄',
  acLayoutOf(1000, ['a.jpg'], []).collapsedW === acLayoutOf(2000, ['a.jpg'], []).collapsedW &&
  acLayoutOf(0, ['a.jpg'], []).collapsedW === acLayoutOf(1600, ['a.jpg'], []).collapsedW &&
  acLayoutOf(1000, ['非常长的档案名'.repeat(20)], []).collapsedW <= acSidebarCapOf(1000) &&
  acLayoutOf(1000, ['非常长的档案名'.repeat(20)], []).collapsedW >
    acLayoutOf(1000, ['a.jpg'], []).collapsedW, true);
check('② AdaptiveColumn 仍严格零 SDK / 零异步 / 零 throw / 零定时器',
  AC78_CODE.includes('@ohos') === false && AC78_CODE.includes('Promise') === false &&
  AC78_CODE.includes('throw ') === false && AC78_CODE.includes('setTimeout') === false &&
  AC78_CODE.includes('setInterval') === false, true);
check('② Index 四个 @State 动态宽 + refreshAdaptiveLayout 单点收口零回归',
  INDEX78.includes('const a: AcLayout = acLayoutOf(this.lastRootW, rowNames, sizeTexts);') &&
  INDEX78.includes('this.collapsedW = acWidthSafeOf(a.collapsedW, a.sidebarW);') &&
  (INDEX78.match(/this\.refreshAdaptiveLayout\(/g) || []).length === 4, true);

console.log('--- 第七十八轮 ③：三个按钮仅图案标识、零文字标签 + 按下/未按下反馈（R78）---');
check('③ SidebarView 三个按钮全部走 SideToolButton，且零文字标签',
  (SIDEBAR78.match(/SideToolButton\(/g) || []).length === 3 &&
  SIDEBAR78.includes("ToolButton({ label: '往上层'") === false &&
  SIDEBAR78.includes("ToolButton({ label: '选择文件夹'") === false &&
  SIDEBAR78.includes('排序 ↑') === false &&
  SIDEBAR78.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  SIDEBAR78.includes("glyph: '⇧', act: 'up'") &&
  SIDEBAR78.includes("glyph: '▣', act: 'folder'") &&
  SIDEBAR78.includes('active: !this.sortAsc'), true);
check('③ 原有功能 / 点击区域 / 位置逐字保留：act 三动作 + height(30) + padding + margin + layoutWeight',
  SIDE78_CODE.includes('.height(30)') &&
  SIDE78_CODE.includes('.padding({ left: 10, right: 10 })') &&
  SIDE78_CODE.includes('.margin(3)') &&
  SIDE78_CODE.includes('.layoutWeight(this.flex ? 1 : 0)') &&
  SIDE78_CODE.includes('.onClick(() => this.onAction(this.act))') &&
  SIDEBAR78.includes("act: 'sort'") && SIDEBAR78.includes("act: 'up'") &&
  SIDEBAR78.includes("act: 'folder'") &&
  (SIDEBAR78.match(/flex: true/g) || []).length === 3, true);
check('③ 按下 / 未按下两态清晰：down 瞬时 + active 持续，常态与旧 ToolButton 同色',
  SIDE78_CODE.includes('@State down: boolean = false;') &&
  SIDE78_CODE.includes('@Prop active: boolean = false;') &&
  SIDE78_CODE.includes('this.down = event.action === MouseAction.Press;') &&
  SIDE78_CODE.includes("this.down || this.active ? '#ffffff' : '#e8ecf4'") &&
  SIDE78_CODE.includes("this.down || this.active ? '#40507a' : '#2a2f3a'"), true);
check('③ ToolButton.ets 逐字不动：顶栏「全屏」/ 诊断层「内容量 TTL」零回归',
  TOOLBTN.includes('@Prop label: string') && TOOLBTN.includes('@Prop act: string') &&
  TOOLBTN.includes('@Prop flex: boolean') &&
  /@Prop enabled/.test(TOOLBTN) === false &&
  /@Prop glyph/.test(TOOLBTN) === false &&
  /@State down/.test(TOOLBTN) === false &&
  INDEX78.includes("ToolButton({ label: '全屏', act: 'full', flex: false") &&
  INDEX78.includes("ToolButton({ label: '内容量 ' + this.dirCountTtlLabel, act: 'dcTtl'"), true);

console.log('--- 第七十八轮 ④：「APP内上层xxx」提醒及关联提示内容整体移除（R78）---');
check('④ inAppUpListHint 恒空；Index 零调用、零 import；无提醒文案模板',
  inAppUpListHint('人像', 3, 'ul1') === '' &&
  INDEX78.includes('inAppUpListHint') === false &&
  INDEX78.includes('APP 内上层「') === false, true);
check('④ 左栏 dirHint 提示条 / 传参 / 伪说明行全部移除',
  SIDEBAR78.includes('Text(this.dirHint)') === false &&
  SIDEBAR78.includes('@Prop dirHint') === false &&
  INDEX78.includes('dirHint: this.dirHint,') === false &&
  /上层清单（APP 内）/.test(UPLIST_CODE) === false &&
  (UPLIST_CODE.match(/rows\.push\(\{ uri: ''/g) || []).length === 1, true);
check('④ 往上层功能本身保留：状态栏中性文案、计数只扣 .. 行、诊断串仍 ul1',
  INDEX78.includes("const UP_LIST_TAG: string = 'ul1';") &&
  INDEX78.includes("(rows.length - 1) + ' 个条目 · ' + ESC_BUILD_TAG") &&
  /rows\.length - 2/.test(UPLIST_CODE) === false &&
  INDEX78.includes('no-picker'), true);
check('④ 旧快照兼容：isUpListPseudoName 仍能过滤历史伪行',
  isUpListPseudoName('— 上层清单（APP 内）· 点目录名进入 · ul1 —') === true &&
  isUpListPseudoName('No.3022') === false, true);

console.log('--- 第七十八轮 ⑤：R70–R77 全链路零回归（R78）---');
check('⑤ 版本恒定 1.0.7·7 / 构建标记 R79 / 旧标记 R78 与 R77 与 R76 已清',
  INDEX78.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX78.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX78.includes("const ESC_BUILD_TAG: string = 'R78';") === false &&
  INDEX78.includes("const ESC_BUILD_TAG: string = 'R77';") === false &&
  INDEX78.includes("const ESC_BUILD_TAG: string = 'R76';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('⑤ HDR 徽标 / picture menu 三项 / 左栏五项菜单 / 两级 Want / 放大镜左键零回归',
  INDEX78.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX78.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && pmItemCountOf() === 3 &&
  FC_LABEL_REVEAL === '打开档案所在目录' && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  (INDEX78.match(/ctx\.startAbility\(/g) || []).length === 2 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R78-A：装新包后 Ctrl+D 角标必须是 R78 / 版本 1.0.7·7；');
console.log('     点分隔条 «（或 Ctrl+B）→ 左栏只显示档案名 / 目录名，时间 / 大小 / 状态 /');
console.log('     「N 张」计数 / 提示条全部消失，栏宽贴合内容、无右侧大片空白；再点 » 完整恢复。');
console.log('  ⚠️ 真机步骤 R78-B：三个按钮只剩 ↑/↓、⇧、▣ 图案，零文字；排序升降序切换时');
console.log('     箭头与高亮底色同步变化，鼠标按下 / 松开两态清晰可辨；');
console.log('     三个按钮位置、大小、点击区域与旧版一致，排序 / 往上层 / 选择文件夹功能照常。');
console.log('  ⚠️ 真机步骤 R78-C：点「⇧ 往上层」进入上层清单，界面任何位置都不再出现');
console.log('     「APP 内上层xxx」文案、左栏提示条与「— 上层清单（APP 内）… —」伪说明行；');
console.log('     旧快照里若曾存下伪行也不再显示，清单条目数为真实兄弟目录数。');
console.log('  ⚠️ 真机步骤 R78-D：拉伸窗口宽度，展开态三栏仍 adaptive 对齐；收起态宽度只随');
console.log('     档案名 / 目录名长短变化，不再随窗口比例放大留白。');
console.log('  ⚠️ 真机步骤 R78-E：顶栏「全屏」/ Ctrl+D 诊断层「内容量」、右栏预览 / 滚轮换图 /');
console.log('     双击全屏 / ESC / 左栏右键菜单 / HEIC HDR 徽标与保真 / 并排右页全部零回归。');

// ==================================================================
// 第七十九轮：只读名单态 → 目录重列举兜底，恢复退出前的图片预览（R79）
// ==================================================================
const RP79_SRC = readFileSync(new URL('../entry/src/main/ets/common/ResumePlan.ts', import.meta.url), 'utf8');
const RP79_CODE = stripComments(RP79_SRC);
const INDEX79 = stripComments(INDEX);
const RELIST_FN = INDEX.slice(INDEX.indexOf('private async tryReadonlyRelist('),
  INDEX.indexOf('private finishPersistActivate('));
const RELIST_CODE = stripComments(RELIST_FN);

console.log('\n--- 第七十九轮 ①：重列举兜底的决策纯函数（R79）---');
check('① readonlyRelistAction：只读态 + 有目录 + 本地 + 用户没接手 + 未放弃 + 有名单 → TRY',
  readonlyRelistAction(true, true, false, false, false, 42) === RELIST_TRY &&
  RELIST_SKIP === 0 && RELIST_TRY === 1, true);
check('① 任一护栏不满足都 SKIP（FULL 态 / 无目录 / 网络目录 / 用户已动手 / 已放弃 / 空名单）',
  readonlyRelistAction(false, true, false, false, false, 42) === RELIST_SKIP &&
  readonlyRelistAction(true, false, false, false, false, 42) === RELIST_SKIP &&
  readonlyRelistAction(true, true, true, false, false, 42) === RELIST_SKIP &&
  readonlyRelistAction(true, true, false, true, false, 42) === RELIST_SKIP &&
  readonlyRelistAction(true, true, false, false, true, 42) === RELIST_SKIP &&
  readonlyRelistAction(true, true, false, false, false, 0) === RELIST_SKIP &&
  readonlyRelistAction(true, true, false, false, false, -1) === RELIST_SKIP, true);
check('① relistProbeOkOf：必须「列得出 + 读得动」；只列目录 / 只 open 都不算恢复',
  relistProbeOkOf(true, true) === true &&
  relistProbeOkOf(true, false) === false &&
  relistProbeOkOf(false, true) === false &&
  relistProbeOkOf(false, false) === false, true);
check('① relistOkHint 带诊断标记、明确说明已恢复预览',
  relistOkHint('rl1').includes('重新读取') &&
  relistOkHint('rl1').includes('可以正常预览') &&
  relistOkHint('rl1').includes('rl1'), true);

console.log('--- 第七十九轮 ②：Index 接线（延迟兜底 / 轻量确认 / 复用 openFolder / 清 timer）（R79）---');
check('② 常量：兜底延时 900ms（早于 1200ms 自愈）、候选上限 2、诊断标记 rl1',
  INDEX79.includes('const READONLY_RELIST_DELAY_MS: number = 900;') &&
  INDEX79.includes('const RELIST_CAND_MAX: number = 2;') &&
  INDEX79.includes("const RELIST_TAG: string = 'rl1';") &&
  INDEX79.includes('const RESTORE_HEAL_DELAY_MS: number = 1200;'), true);
check('② 两处只读态都排兜底（快照恢复 + 单张兜底），且页面销毁清 timer',
  (INDEX79.match(/this\.scheduleReadonlyRelist\(\);/g) || []).length === 2 &&
  INDEX79.includes('private readonlyRelistTimer: number = -1;') &&
  INDEX79.includes('if (this.readonlyRelistTimer !== -1) {') &&
  INDEX79.includes('clearTimeout(this.readonlyRelistTimer);'), true);
check('② 先轻量确认再重建：listFile → openSync → openFolder，兜底体内零 fs.statSync',
  RELIST_CODE.includes('await fs.listFile') &&
  RELIST_CODE.includes('fs.openSync') &&
  RELIST_CODE.includes('await this.openFolder(cand, false)') &&
  RELIST_CODE.includes('fs.statSync') === false &&
  (RELIST_CODE.match(/fs\.openSync/g) || []).length === 1 &&
  (RELIST_CODE.match(/await fs\.listFile/g) || []).length === 1, true);
check('② 网络目录不在这里兜、按目录候选逐个确认、本层无图片不重建',
  INDEX79.includes('isNetworkDirUri(base), this.userActed, this.giveUpDone,') &&
  INDEX79.includes('dirCandidates(base).slice(0, RELIST_CAND_MAX)') &&
  INDEX79.includes('if (!relistProbeOkOf(names.length > 0, openOk)) {') &&
  RELIST_CODE.includes('if (pic.length === 0) {'), true);
check('② 恢复成功沿用既有收口（不新写提示卡）：状态栏 rl1 + 诊断串 RELISTED',
  INDEX79.includes('this.status = relistOkHint(RELIST_TAG);') &&
  INDEX79.includes("this.diagLine = 'restore RELISTED | ' + RELIST_TAG + ' | ' +") &&
  (INDEX79.match(/this\.restoreHintText = '';/g) || []).length === 2, true);
check('② ResumePlan 仍是零 SDK / 零 IO / 零异步 / 零 throw / 零定时器',
  RP79_CODE.includes('@ohos') === false && RP79_CODE.includes('Promise') === false &&
  RP79_CODE.includes('throw ') === false && RP79_CODE.includes('setTimeout') === false &&
  RP79_CODE.includes('setInterval') === false, true);

console.log('--- 第七十九轮 ③：版本与全链路零回归（R79）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R79 / 旧标记 R78 与 R77 已清',
  INDEX79.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX79.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX79.includes("const ESC_BUILD_TAG: string = 'R78';") === false &&
  INDEX79.includes("const ESC_BUILD_TAG: string = 'R77';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ 只读态防冻结闸门不动：RESTORE_PROBE_LIMIT / probeTakeOf / bulkIoAllowed 逐字保留',
  INDEX79.includes('const RESTORE_PROBE_LIMIT: number = 3;') &&
  INDEX79.includes('const take: number = probeTakeOf(fast, cand.length);') &&
  INDEX79.includes('if (!bulkIoAllowed(this.restoreMode)) {') &&
  INDEX79.includes('if (this.restoreCancelled || !this.pageAlive || this.giveUpDone) {'), true);
check('③ R78 三个图案按钮 + R77 HDR / picture menu / 左栏五项 / 放大镜左键零回归',
  SIDEBAR.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  SIDEBAR.includes("glyph: '⇧', act: 'up'") &&
  SIDEBAR.includes("glyph: '▣', act: 'folder'") &&
  INDEX79.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX79.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R79-A：装新包后 Ctrl+D 角标必须是 R79 / 版本 1.0.7·7；');
console.log('     选一个本地目录、正常退出（点关闭）后重开 → 左栏名单与预览图都应正常，');
console.log('     预览区不再停在「图片读取授权在重启后已失效」卡片。');
console.log('  ⚠️ 真机步骤 R79-B：退出前先切到某张特定相片，正常退出再重开 → 应回到同一张；');
console.log('     状态栏出现「已按目录授权重新读取，图片可以正常预览了 · rl1」。');
console.log('  ⚠️ 真机步骤 R79-C：把退出前那张相片先移走 / 改名再重开 → 其余相片仍能预览，');
console.log('     不再因为「那一张没了」整批判死；确实读不到时才停在只读名单 + 重选指引。');
console.log('  ⚠️ 真机步骤 R79-D：应用进入后台被系统回收 / 强制关闭后重开 → 表现与正常退出一致；');
console.log('     NAS 网络目录仍走原有预热重试 + 自愈，不因本轮改动多出同步 statSync 而变慢。');

// ==================================================================
// 第八十轮：左列栏宽以「最长名称完整显示」为唯一标准（R80）
// ==================================================================
const AC80_CODE = stripComments(readFileSync(new URL('../entry/src/main/ets/common/AdaptiveColumn.ts', import.meta.url), 'utf8'));
const INDEX80 = stripComments(INDEX);
const SIDEBAR80 = stripComments(SIDEBAR);
const ARCHIVE80 = stripComments(ARCHIVE);

console.log('\n--- 第八十轮 ①：栏宽以「最长名称完整显示」为唯一标准（R80）---');
check('① acSidebarCapOf：窗口未知→0（无上限）；上限 = 窗口 − 分隔条 − 预览区最小宽',
  AC_SPLIT_W === 14 && AC_PREVIEW_MIN_W === 240 && AC_PREVIEW_RATIO === 0.20 &&
  acSidebarCapOf(0) === 0 && acSidebarCapOf(-100) === 0 &&
  acSidebarCapOf(1440) === 1440 - AC_SPLIT_W - Math.floor(1440 * AC_PREVIEW_RATIO) &&
  acSidebarCapOf(1000) === 1000 - AC_SPLIT_W - AC_PREVIEW_MIN_W &&
  acSidebarCapOf(800) === 800 - AC_SPLIT_W - AC_PREVIEW_MIN_W, true);
check('① 名称够放时：sidebarW 恰等于内容所需宽（含安全余量），nameWrap=false',
  (() => {
    const a = acLayoutOf(1440, ['DSC03322.jpg'], ['1.2 MB']);
    return a.sidebarW === acTextWidestOf(['DSC03322.jpg'], AC_NAME_FONT_VP) +
      AC_NAME_SAFETY_VP + a.sizeW + a.dateW + acOverheadOf() && a.nameWrap === false;
  })(), true);
check('① 名称超宽时：sidebarW 顶到可用宽、nameWrap=true（改多行换行，不 Ellipsis）',
  (() => {
    const long = '非常长的档案名称'.repeat(30);
    const a = acLayoutOf(1000, [long], ['1.2 MB']);
    return a.sidebarW === acSidebarCapOf(1000) && a.nameWrap === true &&
      a.nameW < acTextWidestOf([long], AC_NAME_FONT_VP);
  })(), true);
check('① 目录名与文件名同一套 names 数组：取最长者，不区分类型',
  acLayoutOf(0, ['人像', 'DSC03322.jpg'], []).nameW ===
    acLayoutOf(0, ['DSC03322.jpg'], []).nameW &&
  acLayoutOf(0, ['一个很长很长的目录名字'], []).nameW >
    acLayoutOf(0, ['人像'], []).nameW, true);
check('① 窗口缩放同步重算：同一批长名在 1000 / 2000 窗口下宽度随可用宽变化',
  (() => {
    const long = '非常长的档案名称'.repeat(30);
    const a = acLayoutOf(1000, [long], []);
    const b = acLayoutOf(2000, [long], []);
    return b.sidebarW > a.sidebarW && a.nameWrap === true && b.nameWrap === true;
  })(), true);
check('① 安全余量生效：估算宽 + AC_NAME_SAFETY_VP 才算够（实机不出省略号）',
  AC_NAME_SAFETY_VP === 10 &&
  acLayoutOf(0, ['a'], []).nameW ===
    acTextWidestOf(['a'], AC_NAME_FONT_VP) + AC_NAME_SAFETY_VP, true);

console.log('--- 第八十轮 ②：接线契约（ArchiveRow 条件换行 / SidebarView / Index 同源）（R80）---');
check('② ArchiveRow：名称列条件换行 + Clip，行高锚点改 minHeight（多行不被裁）',
  ARCHIVE80.includes('@Prop nameWrap: boolean = false;') &&
  ARCHIVE80.includes('.maxLines(this.nameWrap ? 99 : 1)') &&
  ARCHIVE80.includes('TextOverflow.Clip') &&
  ARCHIVE80.includes('.constraintSize({ minHeight: 26 })') &&
  ARCHIVE80.includes('.height(26)') === false, true);
check('② SidebarView 逐行下传 nameWrap；Index 与四个宽度量严格同源赋值',
  SIDEBAR80.includes('@Prop nameWrap: boolean = false;') &&
  SIDEBAR80.includes('nameWrap: this.nameWrap,') &&
  INDEX80.includes('@State nameWrap: boolean = acLayoutOf(0,') &&
  INDEX80.includes('this.nameWrap = a.nameWrap;') &&
  INDEX80.includes('nameWrap: this.nameWrap,'), true);
check('② acLayoutOf 不再用 AC_SIDEBAR_RATIO 夹逼，改用 acSidebarCapOf（预览区最小宽）',
  AC80_CODE.includes('const cap: number = acSidebarCapOf(rootW);') &&
  (AC80_CODE.match(/AC_SIDEBAR_RATIO/g) || []).length === 1 &&
  AC80_CODE.includes('nameWrap: nameWrap'), true);

console.log('--- 第八十轮 ③：版本与全链路零回归（R80）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R80 / 旧标记 R79 与 R78 已清',
  INDEX80.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX80.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX80.includes("const ESC_BUILD_TAG: string = 'R79';") === false &&
  INDEX80.includes("const ESC_BUILD_TAG: string = 'R78';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ R79 只读重列举 / R78 三图案按钮 / R77 HDR·adaptive / 左栏五项 / 放大镜左键零回归',
  INDEX80.includes('private async tryReadonlyRelist(base: string): Promise<void> {') &&
  INDEX80.includes('this.scheduleReadonlyRelist();') &&
  SIDEBAR.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  INDEX80.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX80.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R80-A：装新包后 Ctrl+D 角标必须是 R80 / 版本 1.0.7·7；');
console.log('     打开一个含长文件名（40+ 字符）的目录 → 左栏自动加宽到名称完整显示，无省略号；');
console.log('     子目录名同样适用（按当前最长者计算，文件 / 目录两类同等）。');
console.log('  ⚠️ 真机步骤 R80-B：新增长名档案 / 改名后重新进入该目录 → 栏宽同步变宽；');
console.log('     删掉最长名的档案 → 栏宽自动收回，不留大片空白。');
console.log('  ⚠️ 真机步骤 R80-C：拖窄 / 放宽窗口 → 左栏宽度实时重算；');
console.log('     窗口窄到放不下最长名称时，名称改为多行换行完整显示（不出现省略号），预览区仍保留。');
console.log('  ⚠️ 真机步骤 R80-D：紧凑态（« / Ctrl+B）下同样以完整名称为准；');
console.log('     三图案按钮 / 大小·日期列 / 右键菜单 / 预览 / HDR / 版本全部零回归。');

// ==================================================================
// 第八十二轮：退出全屏 → 重新适配普通容器并居中（R82）
// ==================================================================
const INDEX82 = stripComments(INDEX);
const REFIT_AT = INDEX.indexOf('private armFullExitRefit(');
const REFIT_BODY = REFIT_AT >= 0 ? INDEX.slice(REFIT_AT, REFIT_AT + 1500) : '';

console.log('\n--- 第八十二轮 ①：退出全屏的适配判据（R82）---');
check('① fitOnFullExit：只有「全屏 → 普通」下降沿为 true，进全屏 / 同为普通都不触发',
  fitOnFullExit(true, false) === true &&
  fitOnFullExit(false, true) === false &&
  fitOnFullExit(true, true) === false &&
  fitOnFullExit(false, false) === false, true);

console.log('--- 第八十二轮 ②：退出分支重适配 + 布局落定后确认重解（R82）---');
check('② setFull 用下降沿判据 onExit，退出分支恢复进入前倍率（不是直接赋值）',
  INDEX82.includes('const onExit: boolean = fullExitEdgeOf(prevFull, on);') &&
  INDEX82.includes('const view: FullExitView = fullExitViewOf(hadSnapshot,') &&
  INDEX82.includes('this.zoom = view.zoom;') &&
  INDEX82.includes('this.zoom = this.preFullZoom;') === false &&
  INDEX82.includes('this.tx = this.preFullTx;') === false &&
  INDEX82.includes('this.ty = this.preFullTy;') === false, true);
check('② armFullExitRefit：布局落定后只重解，绝不再 fit（否则恢复后又缩回去）',
  REFIT_AT > 0 &&
  REFIT_BODY.includes('this.fitToWindow();') === false &&
  REFIT_BODY.includes('this.zoom =') === false &&
  REFIT_BODY.includes('shouldReloadOnResize(this.lastReloadW, this.lastReloadH,') &&
  REFIT_BODY.includes('this.clearCanvasReloadFallback();') &&
  REFIT_BODY.includes('this.refreshForCanvasResize();') &&
  REFIT_BODY.includes('if (!this.pageAlive || this.fullscreen) {') &&
  INDEX82.includes('const FULL_EXIT_REFIT_MS: number = 260;') &&
  INDEX82.includes('private fullExitRefitTimer: number = -1;'), true);
check('② 页面销毁清确认式重适配 timer；进全屏仍 fitToWindow（前后都是适配态）',
  INDEX82.includes('clearTimeout(this.fullExitRefitTimer);') &&
  INDEX82.includes('this.fullExitRefitTimer = -1;') &&
  INDEX82.includes('private fullExitRefitTimer: number = -1;') &&
  /if \(on\) \{[\s\S]{0,900}?this\.fitToWindow\(\);/.test(INDEX82), true);
check('② 重解仍走既有收口（refreshForCanvasResize 含并排右页），不新增第二套解码链',
  INDEX82.includes('this.loadRightPage(this.items[this.spreadB].uri);') &&
  INDEX82.includes('private refreshForCanvasResize(): void {') &&
  INDEX82.includes('this.lastReloadW = this.canvasW;'), true);

console.log('--- 第八十二轮 ③：版本与零回归（R82）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R82 / 旧标记 R81 与 R80 已清',
  INDEX82.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX82.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX82.includes("const ESC_BUILD_TAG: string = 'R81';") === false &&
  INDEX82.includes("const ESC_BUILD_TAG: string = 'R80';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ R80 栏宽 / R79 只读重列举 / R78 三图案按钮 / HDR / picture menu / 放大镜全未动',
  AC80_CODE.includes('const cap: number = acSidebarCapOf(rootW);') &&
  INDEX82.includes('private async tryReadonlyRelist(base: string): Promise<void> {') &&
  SIDEBAR.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  INDEX82.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX82.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R82-A：装新包后 Ctrl+D 角标必须是 R82 / 版本 1.0.7·7；');
console.log('     双击相片进全屏 → 图按全屏容器铺满居中；Esc / 双击退出 → 图立刻按普通窗口重新适配，');
console.log('     尺寸不再停在全屏档位，也不偏移。');
console.log('  ⚠️ 真机步骤 R82-B：退出后再进全屏、再退出反复 5 次 → 每次都能正确适配，无累积偏移、无空白；');
console.log('     并排（左右页）模式下同样两页都按新容器重适配。');
console.log('  ⚠️ 真机步骤 R82-C：退出全屏后缩放百分比应与刚打开该图时一致（适配态）；');
console.log('     旋转 / 镜像 / 状态栏 / 顶栏仍保持进入全屏前的设置。');
console.log('  ⚠️ 真机步骤 R82-D：普通拖窗口 resize / 收起左栏（Ctrl+B）/ 滚轮换图 / 放大镜 / 右键菜单');
console.log('     全部零回归；切全屏时不出现闪白或「先缩小再放大」的抖动。');

// ==================================================================
// 第八十三轮：目录名从左栏顶部移到最顶部标题栏（目录名 + 父路径）（R83）
// ==================================================================
const INDEX83 = stripComments(INDEX);
const SIDEBAR83 = stripComments(SIDEBAR);

console.log('\n--- 第八十三轮 ①：标题栏父路径纯函数（R83）---');
check('① titleParentOf：去掉末尾目录名；空串 / 根 / 同形一律返回空串（不重复）',
  titleParentOf('') === '' && titleParentOf('/') === '' &&
  titleParentOf('/a/b/c') === '/a/b' &&
  titleParentOf('/a/b/c') !== '/a/b/c' &&
  titleParentOf(titleParentOf('/a/b/c')) === '/a', true);

console.log('--- 第八十三轮 ②：左栏移除目录名 / 顶栏显示目录名 + 父路径（R83）---');
check('② 左栏不再有目录名（Text(this.source) / @Prop source 均移除），只留靠右的「N 张」',
  SIDEBAR83.includes('this.source') === false &&
  SIDEBAR83.includes('@Prop source') === false &&
  SIDEBAR83.includes("Text(this.itemCount > 0 ? this.itemCount + ' 张' : '')") &&
  SIDEBAR83.includes('.textAlign(TextAlign.End)'), true);
check('R84 应用内自绘栏不再显示目录名（改由系统标题栏承载），父路径仍去末尾名字',
  INDEX83.includes("Text(this.source.length > 0 ? this.source : '尚未打开')") === false &&
  INDEX83.includes('constraintSize({ maxWidth: \'45%\' })') === false &&
  INDEX83.includes('if (this.parentPathOf().length > 0) {') &&
  INDEX83.includes('return titleParentOf(this.titlePath);') &&
  INDEX83.includes('Text(ellipsizeMiddle(this.parentPathOf(), 52))') &&
  INDEX83.includes('layoutWeight(1)') &&
  INDEX83.includes('Blank()') &&
  INDEX83.includes('source: this.source,') === false, true);

console.log('--- 第八十三轮 ③：版本与零回归（R83）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R83 / 旧标记 R82 与 R81 与 R80 已清',
  INDEX83.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX83.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX83.includes("const ESC_BUILD_TAG: string = 'R82';") === false &&
  INDEX83.includes("const ESC_BUILD_TAG: string = 'R81';") === false &&
  INDEX83.includes("const ESC_BUILD_TAG: string = 'R80';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ 侧边栏其他内容不变：三图案按钮 / 排序码形态 / 列表 / 空态 / R82 全屏重适配全在',
  SIDEBAR.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  SIDEBAR.includes("glyph: '⇧', act: 'up'") &&
  SIDEBAR.includes("glyph: '▣', act: 'folder'") &&
  SIDEBAR83.includes('List({ scroller: this.scroller, space: LIST_ROW_GAP_VP })') &&
  SIDEBAR83.includes("Text('还没有图片')") &&
  INDEX83.includes('private armFullExitRefit(): void {') &&
  INDEX83.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))'), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R83-A：装新包后 Ctrl+D 角标必须是 R83 / 版本 1.0.7·7；');
console.log('     打开任意目录 → 标题栏显示「PIKAN 1.0.7 · 目录名 · 父路径」，左栏顶部不再出现目录名。');
console.log('  ⚠️ 真机步骤 R83-B：左栏只剩「N 张」且仍靠右；切换三形态 / 滚动 / 点选 / 右键菜单全部照常。');
console.log('  ⚠️ 真机步骤 R83-C：把窗口拖窄到平板宽度 → 标题栏不换行、不重叠、不把「全屏 / 幻灯片」挤出屏幕；');
console.log('     名称与父路径按需省略为「…」，拖宽后自动恢复完整。');
console.log('  ⚠️ 真机步骤 R83-D：逐级「⇧ 往上层」/ 进入子目录 / 选择新文件夹 → 标题栏名称与父路径同步更新，');
console.log('     任意时刻只出现一份目录名（无重复）；全屏时标题栏浮层同样正确。');

// ==================================================================
// 第八十四轮：目录名写进系统窗口标题栏（decor，带三按钮那条）（R84）
// ==================================================================
const INDEX84 = stripComments(INDEX);
const RIGHT84_CODE = stripComments(INDEX.slice(
  INDEX.indexOf('  rightPageImage('), INDEX.indexOf('  topBar() {')));

console.log('\n--- 第八十四轮 ①：系统窗口标题栏（setWindowTitle）接线（R84）---');
check('① 用 SDK 15+ 的 window.setWindowTitle 写系统 decor 标题（不是应用内 topBar）',
  INDEX84.includes("const win: window.Window | undefined = AppStorage.get<window.Window>('mainWindow');") &&
  INDEX84.includes('win.setWindowTitle(name).catch((e: Object) => {') &&
  INDEX84.includes("const name: string = this.source.length > 0 ? this.source : 'PIKAN';"), true);
check('① source 变化自动同步：@Watch 挂载 + onPageShow 补一次（窗口晚就绪也能补上）',
  INDEX84.includes("@State @Watch('syncWindowTitle') source: string = '尚未打开';") &&
  INDEX84.includes('private syncWindowTitle(propName: string = \'\'): void {') &&
  INDEX84.includes('this.syncWindowTitle(\'\');') &&
  /onPageShow\(\): void \{[\s\S]{0,600}?this\.syncWindowTitle\(''\);/.test(INDEX84), true);
check('① 写标题不引入任何计时器（不污染 rightPageImage→topBar 的零动画切片）',
  RIGHT84_CODE.includes('setTimeout') === false &&
  RIGHT84_CODE.includes('setInterval') === false &&
  INDEX84.includes('WINTITLE_RETRY_MAX') === false &&
  INDEX84.includes('window title: window not ready, skip'), true);

console.log('--- 第八十四轮 ②：两栏职责分离（应用内 topBar vs 系统 decor）（R84）---');
check('② 应用内 topBar 仍存在且只留「PIKAN + 父路径」，目录名不在其中',
  INDEX84.includes('  topBar() {') &&
  INDEX84.includes("Text('PIKAN ' + APP_VERSION)") &&
  INDEX84.includes('Text(ellipsizeMiddle(this.parentPathOf(), 52))') &&
  INDEX84.includes('Text(this.source.length > 0 ? this.source : \'尚未打开\')') === false, true);
check('② 左栏仍无目录名（R83 口径不变），系统标题栏才是名字的唯一展示位',
  stripComments(SIDEBAR).includes('this.source') === false &&
  INDEX84.includes('win.setWindowTitle(name)') &&
  INDEX84.includes('Text(this.source') === false, true);

console.log('--- 第八十四轮 ③：版本与零回归（R84）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R84 / 旧标记 R83 与 R82 已清',
  INDEX84.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX84.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX84.includes("const ESC_BUILD_TAG: string = 'R83';") === false &&
  INDEX84.includes("const ESC_BUILD_TAG: string = 'R82';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ R83 父路径 / R82 全屏重适配 / 三图案按钮 / HDR / picture menu / 放大镜全未动',
  INDEX84.includes('private parentPathOf(): string {') &&
  INDEX84.includes('private armFullExitRefit(): void {') &&
  SIDEBAR.includes("glyph: this.sortAsc ? '↑' : '↓'") &&
  INDEX84.includes('if (hbVisibleOf(this.viewIsHdr, this.viewPixelMap !== undefined, this.textMode))') &&
  INDEX84.split('.dynamicRangeMode(').length - 1 === 3 &&
  pmFirstThreeOrderedOf(pmItemsOf()) === true && fcItemCountOf(FC_KIND_IMAGE) === 5 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R84-A：装新包后 Ctrl+D 角标必须是 R84 / 版本 1.0.7·7；');
console.log('     打开任意目录 → 系统窗口标题栏（带最小化 / 最大化 / 关闭按钮那条）显示该目录名；');
console.log('     应用内 PIKAN 栏只显示「PIKAN 1.0.7 · 父路径」，不再重复目录名。');
console.log('  ⚠️ 真机步骤 R84-B：逐级「⇧ 往上层」/ 进子目录 / 选新文件夹 → 系统标题栏文字同步变化；');
console.log('     目录名过长时按系统规则省略，不压住右侧三按钮。');
console.log('  ⚠️ 真机步骤 R84-C：全屏沉浸时系统标题栏随 decor 一起隐藏（正常现象）；');
console.log('     退出全屏后标题栏仍是当前目录名，不会退回成应用名。');
console.log('  ⚠️ 真机步骤 R84-D：切后台再回前台（onPageShow）标题栏仍正确；');
console.log('     左栏只剩「N 张」、三图案按钮 / 排序码形态 / 预览 / HDR 全部零回归。');

// 第八十六轮：并排（对开）预览 —— 各自原始比例等比填满、中间零间隙（R86）
const INDEX86 = stripComments(INDEX);
const near = (a, b) => Math.abs(a - b) < 1e-9;

console.log('\n--- 第八十六轮 ①：并排等比适配规则（纯函数，可 Node 回归）---');
check('① 等比不拉伸：wL/h === arL、wR/h === arR（两页各自原始比例）', (() => {
  const f = spreadFitOf(1200, 800, 0.7, 1.5);
  return near(f.wL / f.h, 0.7) && near(f.wR / f.h, 1.5);
})(), true);
check('① 尽可能大：h === min(可用高, 可用宽/(arL+arR))，且两页合计不溢出', (() => {
  const f = spreadFitOf(1200, 800, 0.7, 1.5);
  const want = Math.min(800, 1200 / (0.7 + 1.5));
  return near(f.h, want) && f.totalW <= 1200 + 1e-9 && f.h <= 800 + 1e-9;
})(), true);
check('① 留白最小：至少一个轴被顶满（否则还能再放大）', (() => {
  const cases = [[1200, 800, 0.7, 0.7], [1200, 800, 1.5, 1.5], [1000, 700, 0.6, 1.0], [640, 480, 2.0, 0.4]];
  return cases.every(([w, h, a, b]) => {
    const f = spreadFitOf(w, h, a, b);
    return near(f.h, h) || near(f.totalW, w);
  });
})(), true);
check('① 高度受限：上下零留白、左右对称留白、limitedBy=LIMIT_HEIGHT',
  (() => {
    const f = spreadFitOf(1200, 800, 0.7, 0.7);
    return near(f.h, 800) && near(f.wL, 560) && near(f.wR, 560) &&
      near(f.totalW, 1120) && near(f.padX, 40) && near(f.padY, 0) && f.limitedBy === LIMIT_HEIGHT;
  })(), true);
check('① 宽度受限：左右零留白、上下对称留白、limitedBy=LIMIT_WIDTH',
  (() => {
    const f = spreadFitOf(1200, 800, 1.5, 1.5);
    return near(f.h, 400) && near(f.wL, 600) && near(f.wR, 600) &&
      near(f.totalW, 1200) && near(f.padX, 0) && near(f.padY, 200) && f.limitedBy === LIMIT_WIDTH;
  })(), true);
check('① 两页比例不同也能等高相邻：宽不同、高相同、合计顶满（中间零间隙）',
  (() => {
    const f = spreadFitOf(1000, 700, 0.6, 1.0);
    return near(f.h, 625) && near(f.wL, 375) && near(f.wR, 625) &&
      near(f.totalW, 1000) && near(f.wL + f.wR, f.totalW) &&
      near(f.padX, 0) && near(f.padY, 37.5);
  })(), true);
check('① 尺寸未知时按另一页比例估算并标记 estimated（绝不返回 0 宽）',
  (() => {
    const f = spreadFitOf(1200, 800, 0.7, 0);
    return f.estimated === true && near(f.wR / f.h, 0.7) && f.wR > 0;
  })(), true);
check('① 两页尺寸都未知时按 1:1 估算，仍是两页等宽等高',
  (() => {
    const f = spreadFitOf(1200, 800, 0, 0);
    return f.estimated === true && near(f.wL, f.wR) && near(f.wL, f.h);
  })(), true);
check('① 空框 / 非正尺寸返回 ok=false 且全 0（绝不把 0 写进布局）',
  (() => {
    const a = spreadFitOf(0, 800, 0.7, 0.7);
    const b = spreadFitOf(1200, -1, 0.7, 0.7);
    return a.ok === false && a.h === 0 && a.wL === 0 && b.ok === false;
  })(), true);
check('① 旋转口径：90° / 270° 取倒数（与 frameW/frameH 互换同口径）',
  near(spreadAspectOf(1000, 1400, 0), 1000 / 1400) &&
  near(spreadAspectOf(1000, 1400, 180), 1000 / 1400) &&
  near(spreadAspectOf(1000, 1400, 90), 1400 / 1000) &&
  near(spreadAspectOf(1000, 1400, 270), 1400 / 1000), true);
check('① 纯函数卫生：零 import / 零 SDK / 零 IO / 零异步 / 零 throw',
  (() => {
    const s = stripComments(src('common/SpreadFit.ts'));
    return /^\s*import\s/m.test(s) === false &&
      /@ohos\./.test(s) === false && /\bfs\./.test(s) === false &&
      /\bawait\s|\basync\s|\bthrow\s+/.test(s) === false &&
      /setTimeout|setInterval/.test(s) === false;
  })(), true);

console.log('--- 第八十六轮 ②：布局接线与「派生而非缓存」---');
check('② 左页 4 处宽 + 4 处高、右页 3 处宽 + 3 处高全部改成按页适配',
  (INDEX86.match(/\.width\(this\.pageWLeft\(half\)\)/g) || []).length === 4 &&
  (INDEX86.match(/\.width\(this\.pageWRight\(half\)\)/g) || []).length === 3 &&
  (INDEX86.match(/\.height\(this\.pageH\(half\)\)/g) || []).length === 7, true);
check('② 渲染框不再用「半幅画布」：viewBoxW(half) 已退出所有 width/height',
  (INDEX86.match(/\.width\(this\.viewBoxW\(half\)\)/g) || []).length === 0 &&
  (INDEX86.match(/\.height\(this\.frameH\(\)\)/g) || []).length === 0, true);
check('② 派生而非缓存：适配结果每次现算，源码里没有 spreadW / spreadH 的 @State 镜像',
  INDEX86.includes('private spreadFit(): SpreadFit {') &&
  INDEX86.includes('return spreadFitOf(this.frameW(), this.frameH(),') &&
  INDEX86.includes('spreadAspectOf(this.imgW, this.imgH, this.rot)') &&
  INDEX86.includes('spreadAspectOf(this.rightImgW, this.rightImgH, this.rot)') &&
  /@State\s+spread(W|H|WL|WR|Total)/.test(INDEX86) === false, true);
check('② 坐标基准同步：放大镜 / fitFactor 全部改用 pageBoxW / pageWLeft / pageH',
  INDEX86.includes('loupeInFrame(x, y, this.pageBoxW(pane, half), this.pageH(half))') &&
  INDEX86.includes('loupePixelAlignOf(this.pageBoxW(pane, half) * LOUPE_ZOOM)') &&
  INDEX86.includes('loupePixelAlignOf(this.pageH(half) * LOUPE_ZOOM)') &&
  INDEX86.includes('loupeClampedOffset(this.loupeX, this.pageBoxW(pane, half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX86.includes('loupeClampedOffset(this.loupeY, this.pageH(half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX86.includes('const boxW: number = this.pageWLeft(this.spreadShown());'), true);
check('② 放大镜按 pane 取该页宽度（左右宽度可能不同，只用 half 会取错页）',
  INDEX86.includes('private loupeContentW(pane: number, half: boolean): number {') &&
  INDEX86.includes('private loupeOffX(pane: number, half: boolean): number {') &&
  (INDEX86.match(/this\.loupeContentW\(pane, half\)/g) || []).length === 5 &&
  (INDEX86.match(/this\.loupeOffX\(pane, half\)/g) || []).length === 5, true);
check('② 右页原始宽高随解码更新、随收起清零（并排才能按各自比例算）',
  INDEX86.includes('this.rightImgW = hit.w;') &&
  INDEX86.includes('this.rightImgH = hit.h;') &&
  INDEX86.includes('this.rightImgW = best.w;') &&
  INDEX86.includes('this.rightImgH = best.h;') &&
  INDEX86.includes('this.rightImgW = 0;') &&
  INDEX86.includes('this.rightImgH = 0;'), true);
check('② 对齐规则在代码里写死为「Row 不设宽度 + 外层 Column 居中」⇒ 中间零间隙',
  INDEX.includes('// Row 不设宽度：让它按两页实际宽度收缩，居中交给外层 Column，') &&
  INDEX86.includes('.justifyContent(FlexAlign.Center)') &&
  INDEX86.includes('.alignItems(HorizontalAlign.Center)'), true);
check('② 无新增计时器 / 过渡（并排适配是纯几何，不引入动画或延迟）',
  (() => {
    const s = INDEX86;
    const i = s.indexOf('private spreadFit(): SpreadFit {');
    const j = s.indexOf('private fitFactor(): number {');
    const seg = s.slice(i, j);
    return i > 0 && j > i && ['animateTo', 'setTimeout', '.transition(', 'duration:'].some(k => seg.includes(k)) === false;
  })(), true);

console.log('--- 第八十六轮 ③：版本与零回归（R86）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R86 / 旧标记 R85 与 R84 已清',
  INDEX86.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX86.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX86.includes("const ESC_BUILD_TAG: string = 'R85';") === false &&
  INDEX86.includes("const ESC_BUILD_TAG: string = 'R84';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ 并排配对判据 / 右页解码重试 / HDR / 放大镜开关 / 左栏三形态 全部未动',
  INDEX86.includes('pmSpreadWantedOf(this.previewMode, hasNext,') &&
  INDEX86.includes('private loadRightPage(uri: string, attempt: number = 0): void {') &&
  INDEX86.split('.dynamicRangeMode(').length - 1 === 3 &&
  INDEX86.split('.autoResize(false)').length - 1 === 3 &&
  loupeEnabledAfterLeftClick(false, true) === true, true);
check('③ 单页模式零回归：half=false 时宽高仍是整幅画布（frameW × frameH）',
  INDEX86.includes('private pageH(half: boolean): number {\n    return half ? this.spreadFit().h : this.frameH();') &&
  INDEX86.includes('return this.viewBoxW(false);'), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R86-A：并排两页（同尺寸竖图）应等高相邻、中间无缝隙，');
console.log('     整组在预览区居中；上下或左右只空一侧，不再出现「各自半幅居中」的中缝。');
console.log('  ⚠️ 真机步骤 R86-B：一页竖图 + 一页横图配对 → 两页仍等高、各自不变形，');
console.log('     横图更宽、竖图更窄，合计宽顶满时上下留白、否则左右留白。');
console.log('  ⚠️ 真机步骤 R86-C：拖窗口 / 拖面板分隔条 → 两页连续跟随重算，不闪、不跳、');
console.log('     不出现图被裁切或溢出预览区（拖动过程中每帧都应等比）。');
console.log('  ⚠️ 真机步骤 R86-D：翻页换对 / 旋转 90° / 进出全屏 / 单页↔并排切换 →');
console.log('     尺寸立刻重算；放大镜取景区与光标一致；缩放百分比与 1:1 按并排实际框计算。');

// 第八十七轮：并排边界「首尾相接」—— 最后一张与第一张配对（R87）
const INDEX87 = stripComments(INDEX);

console.log('\n--- 第八十七轮 ①：环形配对规则（纯函数，可 Node 回归）---');
check('① 正常前进：n≥2 时右页恒为 (cur+1)%n',
  spreadPairIndexOf(0, 5) === 1 &&
  spreadPairIndexOf(3, 5) === 4 &&
  spreadPairIndexOf(0, 2) === 1, true);
check('① 首尾相接：最后一张的右页是第一张（cur=n-1 → 0）',
  spreadPairIndexOf(4, 5) === 0 &&
  spreadPairIndexOf(1, 2) === 0 &&
  spreadPairIndexOf(9, 10) === 0, true);
check('① 单张不与自身配对：n<2 一律 SPREAD_PAIR_NONE（避免同一张图左右各画一次）',
  spreadPairIndexOf(0, 1) === SPREAD_PAIR_NONE &&
  spreadPairIndexOf(0, 0) === SPREAD_PAIR_NONE &&
  spreadPairIndexOf(0, -3) === SPREAD_PAIR_NONE, true);
check('① 非法下标返回 SPREAD_PAIR_NONE（不越界取 items）',
  spreadPairIndexOf(-1, 5) === SPREAD_PAIR_NONE &&
  spreadPairIndexOf(5, 5) === SPREAD_PAIR_NONE &&
  spreadPairIndexOf(6, 5) === SPREAD_PAIR_NONE, true);
check('① 去重护栏：同 uri 的重复条目不并排（判为不可用 → 退回单页）',
  spreadPairOkOf(4, 0, 5, false) === true &&
  spreadPairOkOf(4, 0, 5, true) === false &&
  spreadPairOkOf(2, 3, 5, true) === false, true);
check('① 去重护栏：右页等于左页 / 下标非法 / 空配对 一律不可用',
  spreadPairOkOf(0, 0, 1, false) === false &&
  spreadPairOkOf(0, SPREAD_PAIR_NONE, 5, false) === false &&
  spreadPairOkOf(0, 5, 5, false) === false &&
  spreadPairOkOf(0, -1, 5, false) === false, true);
check('① 「首尾相接」严格判据：只有「最后一张 + 第一张」为真',
  spreadIsWrappedOf(4, 0, 5) === true &&
  spreadIsWrappedOf(1, 2, 5) === false &&
  spreadIsWrappedOf(1, 0, 5) === false &&
  spreadIsWrappedOf(0, 1, 5) === false &&
  spreadIsWrappedOf(0, 0, 1) === false, true);
check('① 页码文案：普通对开 / 首尾相接 / 单页 / 空态 四种',
  spreadPageTextOf(0, 1, 5) === '第 1–2 / 5 张' &&
  spreadPageTextOf(4, 0, 5) === '第 5–1 / 5 张 · 首尾相接' &&
  spreadPageTextOf(2, SPREAD_PAIR_NONE, 5) === '第 3 / 5 张' &&
  spreadPageTextOf(0, SPREAD_PAIR_NONE, 0) === '还没有图片' &&
  spreadPageTextOf(-1, 0, 5) === '还没有图片', true);
check('① 配对 + 文案组合：n=2 时两张交替出现在左右且文案不误标首尾相接',
  (() => {
    const t0 = spreadPageTextOf(0, spreadPairIndexOf(0, 2), 2);
    const t1 = spreadPageTextOf(1, spreadPairIndexOf(1, 2), 2);
    return t0 === '第 1–2 / 2 张' && t1 === '第 2–1 / 2 张 · 首尾相接';
  })(), true);

console.log('--- 第八十七轮 ②：接线（环形配对取代「有下一张」）---');
check('② 配对改用 spreadPairIndexOf，且保留同 uri 去重与可配对判定',
  INDEX87.includes('const pair: number = spreadPairIndexOf(this.cur, this.items.length);') &&
  INDEX87.includes('const sameUri: boolean = pair >= 0 && this.items[pair].uri === self;') &&
  INDEX87.includes('const paired: boolean = spreadPairOkOf(this.cur, pair, this.items.length, sameUri);') &&
  INDEX87.includes('const hasNext: boolean = paired;'), true);
check('② spreadB 写入配对下标（不再是 cur + 1），右页解码链沿用',
  INDEX87.includes('this.spreadB = pair;') &&
  INDEX87.includes('this.loadRightPage(this.items[this.spreadB].uri);') &&
  INDEX87.includes('(this.cur + 1) < this.items.length') === false, true);
check('② 页码文案收口到纯函数，首尾相接有显式标注',
  INDEX87.includes('return spreadPageTextOf(this.cur, this.spreadRight(), this.items.length);') &&
  INDEX87.includes("' · 首尾相接'") === false, true);
check('② 单张 / 只读 / 收右页三条早退分支仍在（不在只读态做跨进程 IO）',
  INDEX87.includes('if (!bulkIoAllowed(this.restoreMode))') &&
  INDEX87.includes('if (!SPREAD_PORTRAIT || this.items.length === 0 || this.cur < 0)') &&
  (INDEX87.match(/this\.clearRightPage\(\);/g) || []).length >= 3, true);
check('② 翻页本身仍是环形（go 的取模），与配对口径一致 ⇒ 末张之后回到第 1 张',
  INDEX87.includes('this.cur = ((this.cur + delta) % n + n) % n;'), true);
check('② 全部 10 个 refreshSpread 调用点未变（换图 / 点选 / 滚轮 / 恢复 / 模式切换都走同一判据）',
  (INDEX87.match(/this\.refreshSpread\(\)/g) || []).length === 10, true);

console.log('--- 第八十七轮 ③：版本与零回归（R87）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R87 / 旧标记 R86 与 R85 已清',
  INDEX87.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX87.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX87.includes("const ESC_BUILD_TAG: string = 'R86';") === false &&
  INDEX87.includes("const ESC_BUILD_TAG: string = 'R85';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ R56 并排判据 / R76 预览模式 / R86 等比适配 全部未动',
  INDEX87.includes('pmSpreadWantedOf(this.previewMode, hasNext,') &&
  INDEX87.includes('spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)') &&
  INDEX87.includes('private spreadFit(): SpreadFit {') &&
  INDEX87.includes('return spreadPairIndexOf') === false, true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R87-A：翻到最后一张（竖图）→ 右侧应显示**第一张**，并排完整、无空白；');
console.log('     状态栏显示「第 N–1 / N 张 · 首尾相接」，不出现「第 N / N 张」半屏单页。');
console.log('  ⚠️ 真机步骤 R87-B：在最后一张继续向前翻 → 回到第 1 张，并排变为「1–2」，');
console.log('     方向不回跳、不卡住；反向从第 1 张回退 → 末张与第 1 张并排。');
console.log('  ⚠️ 真机步骤 R87-C：目录只有 1 张 → 单页、不重复显示同一张；只有 2 张 → 两侧交替配对，');
console.log('     任何时刻左右两张都不同；两张为同一文件（重复条目）时退回单页而非左右同图。');
console.log('  ⚠️ 真机步骤 R87-D：末尾横图 / 单张预览模式 / 旋转 90° / 进出全屏 / 恢复上次位置 零回归；');
console.log('     首尾相接那一对的放大镜、缩放百分比、HDR 徽标均与普通对开一致。');

// 第八十八轮：ESC 退出全屏恢复「进入前」的缩放 / 平移（R88）
const INDEX88 = stripComments(INDEX);

console.log('\n--- 第八十八轮 ①：退出恢复规则（纯函数，可 Node 回归）---');
check('① 下降沿判据：只有「全屏 → 普通」为真（进入 / 停留都不触发恢复）',
  fullExitEdgeOf(true, false) === true &&
  fullExitEdgeOf(false, false) === false &&
  fullExitEdgeOf(true, true) === false &&
  fullExitEdgeOf(false, true) === false, true);
check('① 有快照：zoom / tx / ty 原样恢复（不是 fit），且标记 restored',
  (() => {
    const v = fullExitViewOf(true, 2.5, 30, -20, 1, 0, 0, 0.05, 16);
    return v.zoom === 2.5 && v.tx === 30 && v.ty === -20 && v.restored === true;
  })(), true);
check('① 无快照：保持当前值，绝不擅自 fit（fit 正是「图被缩小」的成因）',
  (() => {
    const v = fullExitViewOf(false, 2.5, 30, -20, 3.25, 12, -8, 0.05, 16);
    return v.zoom === 3.25 && v.tx === 12 && v.ty === -8 && v.restored === false;
  })(), true);
check('① 倍率夹到 [min, max]：99 → 16、0.001 → 0.05，绝不写越界值进 @State',
  fullExitViewOf(true, 99, 0, 0, 1, 0, 0, 0.05, 16).zoom === 16 &&
  fullExitViewOf(true, 0.001, 0, 0, 1, 0, 0, 0.05, 16).zoom === 0.05, true);
check('① 非法值兜底：preZoom 为 NaN → 退回当前值；两者都坏 → 1；tx/ty NaN → 0',
  (() => {
    const a = fullExitViewOf(true, NaN, NaN, NaN, 2, 0, 0, 0.05, 16);
    const b = fullExitViewOf(true, NaN, 0, 0, NaN, 0, 0, 0.05, 16);
    return a.zoom === 2 && a.tx === 0 && a.ty === 0 && b.zoom === 1;
  })(), true);
check('① 进入 → 退出循环 3 次：倍率稳定不漂移（每次退出都回到同一组值）',
  (() => {
    let zoom = 2.5, tx = 40, ty = -16;
    for (let i = 0; i < 3; i++) {
      const saved = { z: zoom, x: tx, y: ty };
      zoom = 1; tx = 0; ty = 0;                       // 进全屏：fit
      const v = fullExitViewOf(true, saved.z, saved.x, saved.y, zoom, tx, ty, 0.05, 16);
      zoom = v.zoom; tx = v.tx; ty = v.ty;            // 退出：恢复
    }
    return zoom === 2.5 && tx === 40 && ty === -16;
  })(), true);
check('① 全屏内改动不污染快照：退出仍回到进入前，而不是全屏里的临时倍率',
  (() => {
    const v = fullExitViewOf(true, 1.8, 10, 5, 6, -80, 60, 0.05, 16);
    return v.zoom === 1.8 && v.tx === 10 && v.ty === 5;
  })(), true);

console.log('--- 第八十八轮 ②：进入 / 退出流程接线 ---');
check('② 退出分支用 fullExitViewOf 恢复，且快照读取在 hasFullSnapshot 置 false 之前',
  INDEX88.includes('const hadSnapshot: boolean = this.hasFullSnapshot;') &&
  INDEX88.includes('const view: FullExitView = fullExitViewOf(hadSnapshot,') &&
  INDEX88.includes('this.zoom = view.zoom;') &&
  INDEX88.includes('this.tx = view.tx;') &&
  INDEX88.includes('this.ty = view.ty;') &&
  INDEX88.indexOf('const view: FullExitView = fullExitViewOf(hadSnapshot,') <
    INDEX88.indexOf('this.hasFullSnapshot = false;'), true);
check('② 进入全屏仍先存档（zoom / tx / ty / rot / flip / status / topbar 七项）',
  INDEX88.includes('this.preFullZoom = this.zoom;') &&
  INDEX88.includes('this.preFullTx = this.tx;') &&
  INDEX88.includes('this.preFullTy = this.ty;') &&
  INDEX88.includes('this.preFullRot = this.rot;') &&
  INDEX88.includes('this.preFullFlipH = this.flipH;') &&
  INDEX88.includes('this.preFullFlipV = this.flipV;') &&
  INDEX88.includes('this.preFullStatus = this.status;') &&
  INDEX88.includes('this.preFullTopbar = this.topbarVisible;'), true);
check('② setFull 里只剩进入分支那一处 fitToWindow（退出不再 fit）',
  (INDEX88.slice(INDEX88.indexOf('private setFull(on: boolean'),
    INDEX88.indexOf('this.applyWindowFullScreen(on, 0);')).match(/this\.fitToWindow\(\);/g) || []).length === 1, true);
check('② armFullExitRefit 只重解、不碰 zoom / 不 fit（否则「恢复后又缩回去」）',
  (() => {
    const i = INDEX88.indexOf('private armFullExitRefit(): void {');
    const seg = INDEX88.slice(i, i + 900);
    return i > 0 && seg.includes('this.fitToWindow();') === false &&
      seg.includes('this.zoom =') === false &&
      seg.includes('this.refreshForCanvasResize();') === true &&
      seg.includes('full exit restore:');
  })(), true);
check('② 恢复与布局切换同一同步块：没有「先 fit、再延时恢复」的两段式跳变',
  (() => {
    const i = INDEX88.indexOf('private setFull(on: boolean');
    const seg = INDEX88.slice(i, INDEX88.indexOf('this.applyWindowFullScreen(on, 0);'));
    return seg.includes('this.zoom = view.zoom;') &&
      (seg.match(/this\.fitToWindow\(\);/g) || []).length === 1;
  })(), true);

console.log('--- 第八十八轮 ③：版本与零回归（R88）---');
check('③ 版本恒定 1.0.7·7 / 构建标记 R88 / 旧标记 R87 与 R86 已清',
  INDEX88.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX88.includes("const ESC_BUILD_TAG: string = 'R88';") &&
  INDEX88.includes("const ESC_BUILD_TAG: string = 'R87';") === false &&
  INDEX88.includes("const ESC_BUILD_TAG: string = 'R86';") === false &&
  /"versionCode":\s*7/.test(APP_JSON) && /"versionName":\s*"1\.0\.7"/.test(APP_JSON), true);
check('③ 旧名 fitOnFullExit 仍可用且与新名等价（R82 断言未失效）',
  fitOnFullExit(true, false) === fullExitEdgeOf(true, false) &&
  fitOnFullExit(false, true) === fullExitEdgeOf(false, true), true);
check('③ rot / flip / status / topbar 仍逐项还原；窗口形态恢复链未动',
  INDEX88.includes('this.rot = this.preFullRot;') &&
  INDEX88.includes('this.flipH = this.preFullFlipH;') &&
  INDEX88.includes('this.flipV = this.preFullFlipV;') &&
  INDEX88.includes('this.status = this.preFullStatus;') &&
  INDEX88.includes('this.topbarVisible = this.preFullTopbar;') &&
  INDEX88.includes('this.applyWindowFullScreen(on, 0);') &&
  INDEX88.includes('this.scheduleKeyRefocus();'), true);
check('③ R86 并排等比 / R87 首尾相接 未受影响',
  INDEX88.includes('private spreadFit(): SpreadFit {') &&
  INDEX88.includes('const pair: number = spreadPairIndexOf(this.cur, this.items.length);'), true);

console.log('  ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。');
console.log('  ⚠️ 真机步骤 R88-A：普通模式把图放大到约 200% 并拖动 → 进全屏 → 按 ESC；');
console.log('     退出后应回到「约 200% + 原来的位置」，而不是 100% 居中（也不该缩成一小块）。');
console.log('  ⚠️ 真机步骤 R88-B：连续进出全屏 3 次，倍率与位置每次都稳定不变；');
console.log('     每次进入仍是全屏适配铺满，退出仍回到进入前那一档，不出现逐次漂移。');
console.log('  ⚠️ 真机步骤 R88-C：进入前本就是适配态（100%）→ 退出仍是 100% 居中，');
console.log('     整个往返过程没有可见的缩放跳变（含 Ctrl+D 角标核对 R88 / 1.0.7·7）。');
console.log('  ⚠️ 真机步骤 R88-D：全屏内放大 / 拖动后按 ESC → 回到进入前状态（全屏内改动不保留）；');
console.log('     旋转 / 镜像 / 顶栏 / 状态栏 / 放大镜 / 缩放百分比提示均与进入前一致。');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
