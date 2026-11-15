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
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames, hierPathOf, volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, sameDirPath, isUpTargetOf, upParentCandidates, UP_NAV_NONE, UP_NAV_TOP, UP_NAV_GO, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf, upContextBaseOf, upContextRawOf, pathChainOf, inAppUpListHint,
  isNetworkHost, nasHostOf } from '../entry/src/main/ets/common/DirName.ts';
import { HoverGuard } from '../entry/src/main/ets/common/HoverGuard.ts';
import { preloadWindowSize, preloadOrder, preloadSaturated,
  fullPreloadIndex, preloadConcurrencyOf, preloadBatchOf,
  shouldResetPreloadChain, fullCacheTargetOf,
  preloadBatchBoundedOf } from '../entry/src/main/ets/common/PreloadBudget.ts';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC, FLUSH_SYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  upButtonEnabled, RESTORE_FULL, RESTORE_READONLY, restoreModeOf, bulkIoAllowed,
  restoreProbeUris, readonlyHint, readonlyTapHint, readonlyUpHint,
  restoreUpEnabled, restoreUpHint } from '../entry/src/main/ets/common/ResumePlan.ts';
import { PERSIST_SKIP, PERSIST_ACTIVATE, persistAction, persistPolicyUris,
  persistTimeoutSafe, persistOkHint, persistFailHint, persistLegacyHint } from '../entry/src/main/ets/common/PersistPlan.ts';
import { exifTransformOf, exifSizeOf, viewEdgeOf, preloadEdgeOf, displayEdgeOf,
  shouldReloadOnResize, shouldExitFullOnResize, canvasFromRootOf,
  colorSpaceNameOf, isWideGamutOf, viewHintOf, fullscreenStepsOf } from '../entry/src/main/ets/common/ViewPlan.ts';
import { metaLineOf, parseMetaLine, encodeMeta, decodeMeta, metaForUri,
  packWindowRect, parseWindowRect, windowRectUsable,
  shouldSaveWindowRect, collapsedOf, windowModeFlagOf,
  shouldRestoreMaximized, shouldScheduleWindowRestore } from '../entry/src/main/ets/common/SessionState.ts';
import { decodeEdgeOf, reuseEdgeOf, shouldReuseDecoded,
  decodeKeyOf } from '../entry/src/main/ets/common/DecodeCache.ts';
import { rawFitOf, rawSingleAllowed, rawReadComplete,
  rawCacheTargetOf, rawPrefetchWanted } from '../entry/src/main/ets/common/RawCache.ts';
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
  LOUPE_DEFAULT_ENABLED, loupeEnabledAfterRightPress,
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
const INDEX = readFileSync(new URL('../entry/src/main/ets/pages/Index.ets', import.meta.url), 'utf8');
check('空态判断用 rowCount（左栏实际行数）', /if \(this\.rowCount === 0\)/.test(INDEX), true);
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
check('不再有「选择图片」toolBtn', /toolBtn\('选择图片'/.test(INDEX), false);
check('不再有「回到上次」toolBtn', /toolBtn\('回到上次'/.test(INDEX), false);
check('doAction 无 files 分支', /case 'files':/.test(INDEX), false);
check('doAction 无 resume 分支', /case 'resume':/.test(INDEX), false);
check('三个按钮合并在同一行，且「往上层」恒亮恒可点',
  /toolBtn\('往上层', 'up', true\)[\s\S]{0,220}toolBtn\('选择文件夹', 'folder', true\)/.test(INDEX), true);
check('按钮区不再有原来的第二行',
  /bottom: 4 \}\)\s*Row\(\) \{\s*this\.toolBtn\('选择文件夹', 'folder', true\)/.test(INDEX), false);
check('左栏宽度改用自适应 listW',
  /\.width\(this\.listCollapsed \? LIST_COLLAPSED_W : this\.listW\)/.test(INDEX), true);
check('applyItems 重算 listW', /this\.listW = listWidthForNames\(/.test(INDEX), true);
check('档案名列有 minWidth 兜底', /constraintSize\(\{ minWidth: textWidthVp/.test(INDEX), true);
check('行首图标高度压到 26', /\.height\(26\)/.test(INDEX), true);
check('行上下 padding 继续压到 1（配合 List 缝约 1mm）', /top: 1, bottom: 1/.test(INDEX), true);
check('List 行间距改用 LIST_ROW_GAP_VP 常量且为 1',
  /space: LIST_ROW_GAP_VP/.test(INDEX) &&
  /const LIST_ROW_GAP_VP: number = 1;/.test(INDEX), true);
check('档案列表「梅花间竹」交替色格子：奇偶两色 + 选中色优先',
  /const ROW_STRIPE_EVEN: string = '#1e242e';/.test(INDEX) &&
  /const ROW_STRIPE_ODD: string = '#161a21';/.test(INDEX) &&
  /const ROW_SELECTED_BG: string = '#1f2730';/.test(INDEX) &&
  /private rowBgColor\(\): string \{[\s\S]{0,160}if \(this\.selected\)[\s\S]{0,160}return ROW_SELECTED_BG;[\s\S]{0,160}\(this\.idx % 2\) === 0 \? ROW_STRIPE_EVEN : ROW_STRIPE_ODD/.test(INDEX) &&
  /\.backgroundColor\(this\.rowBgColor\(\)\)/.test(INDEX), true);

console.log('--- sameEntryNames(): 重扫时判断目录内容是否真的变了 ---');
check('空目录一致', sameEntryNames([], []), true);
check('顺序不同仍算一致（不触发重建）', sameEntryNames(['a', '人像'], ['人像', 'a']), true);
check('新增条目 → 不一致', sameEntryNames(['a', 'b'], ['a']), false);
check('删除条目 → 不一致', sameEntryNames(['a'], ['a', 'b']), false);
check('改名 → 不一致', sameEntryNames(['a', 'b'], ['a', 'c']), false);
check('中文 + 空格现场路径一致',
  sameEntryNames(['编号202601 模特 猫', '人像'], ['人像', '编号202601 模特 猫']), true);

console.log('--- 源码静态契约：hover 缩略图纯预览、退出不切回上次 ---');
const HOVER_FN = INDEX.slice(INDEX.indexOf('private onHoverChange('), INDEX.indexOf('hoverThumb()'));
const HOVER_THUMB_START = INDEX.indexOf('hoverThumb()');
const HOVER_THUMB_FN = INDEX.slice(HOVER_THUMB_START, INDEX.indexOf('  build() {', HOVER_THUMB_START));
const APPLY_FN = INDEX.slice(INDEX.indexOf('private applyItems('), INDEX.indexOf('后台分批补测体积'));
// 第十一轮：hover 小图预览改为「零延迟、零动画」，旧的去抖常量 / 计时器 / 代号断言
// 全部按新语义同步更新（不删断言）。
check('第十一轮：不再有 hover 关闭去抖常量',
  /const HOVER_CLOSE_DELAY_MS/.test(INDEX), false);
check('第十一轮：onHover(false) 同步立即隐藏、无去抖代号',
  /this\.showHover = false;/.test(HOVER_FN) &&
  /\+\+this\.hoverSeq/.test(HOVER_FN) === false, true);
check('第十一轮：不再有 hoverCloseTimer 延迟计时器',
  /clearTimeout\(this\.hoverCloseTimer\)/.test(INDEX), false);
check('第十一轮：hover 回来不做计时器复位（无 cancelCloseTimer）',
  /cancelCloseTimer/.test(HOVER_FN) === false &&
  /if \(this\.showHover\) \{[\s\S]{0,120}return;/.test(HOVER_FN), true);
check('onMouse(Move) 不再无条件自动打开（原自激闪烁源）',
  /MouseAction\.Move && !this\.showHover/.test(INDEX), false);
check('hover 回调不触碰选中态 / 列表 / 目录',
  /this\.onTap\(|applyItems\(|openFolder\(|this\.cur =/.test(HOVER_FN), false);
check('第十一轮：aboutToDisappear 同步立即收起浮层、无计时器',
  /aboutToDisappear\(\): void \{[\s\S]{0,300}this\.showHover = false;/.test(INDEX) &&
  /aboutToDisappear\(\): void \{[\s\S]{0,300}cancelCloseTimer/.test(INDEX) === false, true);
check('第十一轮：点击行时立即收起浮层、无去抖代号',
  /\.onClick\(\(\) => \{[\s\S]{0,220}this\.showHover = false;/.test(INDEX) &&
  /\.onClick\(\(\) => \{[\s\S]{0,220}this\.hoverSeq\+\+/.test(INDEX) === false, true);
check('hover 缩略图浮层只放相片、不显示档案名（2026-11-11）',
  /Image\(this\.hoverPx!\)/.test(HOVER_THUMB_FN) &&
  !/Text\(this\.name\)/.test(HOVER_THUMB_FN), true);

check('openFolder 支持 isRescan', /isRescan\?: boolean/.test(INDEX), true);
check('重扫内容未变则跳过列表重建', /isRescan === true && this\.sameDirEntries\(names\)/.test(INDEX), true);
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
const POPUP_START = INDEX.indexOf('.bindPopup(this.showHover');
const POPUP = INDEX.slice(POPUP_START, INDEX.indexOf('.gesture(', POPUP_START));
check('mask:false 关掉吞鼠标事件的透明遮罩（根因①）', /mask: false/.test(POPUP), true);
check('autoCancel:false 禁止系统自行收起 popup（根因②）', /autoCancel: false/.test(POPUP), true);
check('enableArrow:false 减少弹出位置抖动', /enableArrow: false/.test(POPUP), true);
check('onHover 回调里标记 hoverSupported', /HoverGuard\.shared\(\)\.noteHover\(\)/.test(INDEX), true);
check('onMouse 兜底受 hoverSupported 门控',
  /if \(!HoverGuard\.shared\(\)\.hoverSupported\)/.test(INDEX), true);
check('第十一轮：onMouse 在浮层展开时直接返回、不打开（无计时器可续命）',
  /if \(this\.showHover\) \{[\s\S]{0,160}return;/.test(INDEX) &&
  /this\.cancelCloseTimer\(\)/.test(INDEX) === false, true);
check('打开浮层前 take 同步收起上一行',
  /HoverGuard\.shared\(\)\.take\(key, \(\) => this\.forceHide\(\)\)/.test(HOVER_FN), true);
check('forceHide 同步收起、不走延迟',
  /private forceHide\(\)[\s\S]{0,220}this\.showHover = false;/.test(INDEX), true);
check('第十一轮：同步立即隐藏时释放持有者', /HoverGuard\.shared\(\)\.release\(key\)/.test(HOVER_FN), true);
check('aboutToDisappear 释放持有者',
  /HoverGuard\.shared\(\)\.release\(this\.rowKey\(\)\)/.test(INDEX), true);
check('点击行时释放持有者',
  /\.onClick\(\(\) => \{[\s\S]{0,320}HoverGuard\.shared\(\)\.release/.test(INDEX), true);
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
check('按钮文案统一为「往上层」', /toolBtn\('往上层', 'up',/.test(INDEX), true);
check('源码不再出现「回上层」', /回上层/.test(INDEX), false);
const TOOLBTN_FN = INDEX.slice(INDEX.indexOf('  toolBtn(label:'), INDEX.indexOf('/** 主视图：'));
const CODE_LINES = INDEX.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
check('往上层按钮恒亮恒可点（不再传 canGoUp）', /this\.toolBtn\('往上层', 'up', true\)/.test(INDEX), true);
check('toolBtn 三参签名，不接受 enabled 入参',
  /toolBtn\(label: string, act: string, flex: boolean\)/.test(INDEX), true);
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
  /this\.toolBtn\('往上层', 'up', true, this\.canGoUp\)/.test(INDEX) === false &&
  /this\.toolBtn\('往上层', 'up', true\)/.test(INDEX), true);
check('三个按钮都是三参调用（不存在 enabled 实参）',
  /this\.toolBtn\('全屏', 'full', false\)/.test(INDEX) &&
  /this\.toolBtn\('选择文件夹', 'folder', true\)/.test(INDEX), true);
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
check('只读态清掉残留视图与缓存账目（不显示上一批旧图）',
  /this\.releaseViewOwned\(\);\s*\n\s*this\.viewPixelMap = undefined;\s*\n\s*this\.viewFailed = false;/.test(INDEX), true);
const DECODE_FN = INDEX.slice(INDEX.indexOf('private decodeTo('),
  INDEX.indexOf('private decodeTo(') + 1900);
check('解码总闸门在 decodeTo（只读态直接 resolve undefined）',
  /private decodeTo\(uri: string, edge: number,\s*allowReuse: boolean = true\): Promise<PreviewEntry \| undefined> \{/.test(DECODE_FN) &&
  /if \(!bulkIoAllowed\(this\.restoreMode\)\) \{[\s\S]{0,160}return Promise\.resolve<PreviewEntry \| undefined>\(undefined\);/.test(DECODE_FN) &&
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
check('只读态行组件不发起 hover 缩略图解码',
  /@Prop thumbDisabled: boolean = false;/.test(INDEX) &&
  /if \(this\.kind !== ROW_IMAGE \|\| this\.thumbDisabled\)/.test(INDEX) &&
  /thumbDisabled: this\.restoreMode === RESTORE_READONLY,/.test(INDEX), true);
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
  (INDEX.match(/this\.persistFolderUri\(uris\[0\]\);/g) || []).length, 1);
check('persistPermission / activatePermission 各一次，且只用 READ_MODE',
  (INDEX.match(/fileShare\.persistPermission\(policies\)/g) || []).length === 1 &&
  (INDEX.match(/fileShare\.activatePermission\(policies\)/g) || []).length === 1 &&
  (INDEX.match(/fileShare\.OperationMode\.READ_MODE/g) || []).length === 2, true);
check('PolicyInfo 显式类型、SDK 调用都包在 try/catch 内',
  (INDEX.match(/Array<fileShare\.PolicyInfo>/g) || []).length === 2 &&
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
check('启动关键路径仍无 new Promise / Promise.race（不引入同步等待）',
  /new Promise|Promise\.race/.test(INDEX), false);
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
check('三个层级锚点 + titlePath + canGoUp 全部回填',
  /this\.browseBase = base;/.test(UPC_CODE) &&
  /this\.browseDir = raw\.length > 0 \? raw : base;/.test(UPC_CODE) &&
  /this\.pickRootUri = this\.browseDir;/.test(UPC_CODE) &&
  /this\.titlePath = base;/.test(UPC_CODE) &&
  /this\.canGoUp = canGoUpFrom\(base\);/.test(UPC_CODE), true);
check('层级真值与原始 URI 分别由两个纯函数还原',
  /upContextBaseOf\(this\.savedDirUri\)/.test(UPC_CODE) &&
  /upContextRawOf\(this\.savedDirUri\)/.test(UPC_CODE), true);
check('解析不出层级时直接放弃回填',
  /if \(base\.length === 0\) \{\s*\n\s*return;/.test(UPC_CODE), true);
check('恢复期零 IO：方法体无 listFile / statSync / openFolder / startDirPoll / 选择器 / 权限',
  /fs\.listFile|fs\.statSync|fs\.openSync|this\.openFolder|startDirPoll|DocumentViewPicker|PhotoViewPicker|ensureGalleryPermission|loadAllGallery|queryAllPhotos/.test(UPC_CODE), false);
check('两条恢复路径（快照 / 单张兜底）都在 setItems 之后调用',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 2 &&
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

console.log('--- inAppUpListHint(): APP 内清单提示 ---');
const UL_HINT = inAppUpListHint('人像', 3, 'ul1');
check('带目录名 / 项数 / 诊断标记',
  UL_HINT.includes('人像') && UL_HINT.includes('3') && UL_HINT.includes('ul1'), true);
check('明确写了「不弹系统选择器」', UL_HINT.includes('不弹系统选择器'), true);
check('提示可点进入（不是死提示）', UL_HINT.includes('点目录名进入'), true);
check('提示不留在 APP 外（含「APP 内」）', UL_HINT.includes('APP 内'), true);

const UPLIST_FN = INDEX.slice(INDEX.indexOf('private showUpListInApp('),
  INDEX.indexOf('private toggleFull('));
// 去掉注释行再查 IO：方法体注释里为了说明「禁止」而提到了这些名字
const UPLIST_CODE = UPLIST_FN.split('\n').filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
console.log('--- 源码静态契约：往上层不弹系统选择器、改 APP 内清单 ---');
check('UP_LIST_TAG=ul1 是诊断标记、不是版本号',
  /const UP_LIST_TAG: string = 'ul1';/.test(INDEX) &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX), true);
check('Index 引入 pathChainOf / inAppUpListHint / sameDirPath',
  /pathChainOf, inAppUpListHint,/.test(INDEX) && /sameDirPath,/.test(INDEX), true);
check('chooseFolderAt 整个方法已删除（往上层不再弹 FOLDER picker）',
  /chooseFolderAt/.test(INDEX) === false, true);
check('browseUp 函数体内没有 DocumentViewPicker / .select / pickerStartOf / isUpTargetOf',
  /DocumentViewPicker|dv\.select|pickerStartOf\(|isUpTargetOf\(/.test(UP_FN) === false, true);
check('browseUp 两个失败分支都收口 showUpListInApp（loose + 正常层级）',
  (UP_FN.match(/this\.showUpListInApp\(/g) || []).length, 2);
check('showUpListInApp 存在且用 pathChainOf 生成可点层级行',
  UPLIST_CODE.length > 0 && /pathChainOf\(target\)/.test(UPLIST_CODE) &&
  /kind: ROW_FOLDER/.test(UPLIST_CODE), true);
check('showUpListInApp 用 sameDirPath 命中会话缓存、列真实档案清单',
  /sameDirPath\(this\.lastUpPath, target\)/.test(UPLIST_CODE) &&
  /this\.lastUpNames/.test(UPLIST_CODE), true);
check('showUpListInApp 恒列 .. 行与「APP 内」说明行',
  /name: '\.\.'/.test(UPLIST_CODE) && /上层清单（APP 内）/.test(UPLIST_CODE), true);
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
check('清单态标记 inAppUpList 只在三处维护',
  (INDEX.match(/this\.inAppUpList =/g) || []).length, 3);
check('清单行点击禁掉「目录内多选」兜底选择器',
  /this\.openFolder\(r\.uri, true, !this\.inAppUpList\);/.test(INDEX), true);
check('openFolder 进入新目录前缓存上一层条目名（纯字符串）',
  /this\.lastUpNames = cacheNames;/.test(INDEX) &&
  /this\.lastUpPath = stripTrailingSlash\(this\.browseBase\);/.test(INDEX), true);
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
const BADGE = INDEX.slice(INDEX.indexOf('// 右下角角标：只显示'),
  INDEX.indexOf('.onAreaChange((oldV: Area, newV: Area)'));
const BADGE_ALWAYS = BADGE.slice(BADGE.indexOf('// 「缓存 N 张」文案'));
const BADGE_CODE = BADGE_ALWAYS.split('\n')
  .filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
check('SHOW_DIAG_BADGE 默认 false（目录诊断串不画在右下角）',
  /const SHOW_DIAG_BADGE: boolean = false;/.test(INDEX), true);
check('诊断行的渲染被开关包住，diagLine 赋值点一个没删',
  /if \(SHOW_DIAG_BADGE && this\.diagLine\.length > 0\)/.test(BADGE) &&
  (INDEX.match(/this\.diagLine =/g) || []).length >= 10, true);
check('右下角恒显示区：缩放百分比 1 个 Text + 第二十一轮条件诊断 1 个 Text，缓存 N 张仍移除',
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length === 2 &&
  /if \(this\.escDiag\.length > 0\)/.test(BADGE_CODE) &&
  /Text\(this\.escDiag\)/.test(BADGE_CODE) &&
  /Text\('缓存 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) === false &&
  /缓存 N 张/.test(BADGE_CODE) === false, true);
check('右下角不出现 MB / 上限 / 张数分母 / 缓存账目',
  /fmtBytes|PRELOAD_COUNT|PRELOAD_MAX_BYTES|cacheBytes|cacheCount/.test(BADGE_CODE) === false, true);
check('缩放百分比仍在右下角且带 R21 常显构建标记，100% = 原图像素 1:1 口径未改',
  /Text\(this\.zoomPercentText\(\) \+ ' · ' \+ ESC_BUILD_TAG/.test(BADGE_CODE) &&
  /const ESC_BUILD_TAG: string = 'R21';/.test(INDEX) &&
  /const ZOOM_PCT_RELATIVE_TO_PIXEL: boolean = true;/.test(INDEX), true);
check('状态栏「预载 N 张」保持不变（只删百分比上方那一处），不带 MB 占用',
  /Text\('预载 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) &&
  /fmtBytes\(this\.cacheBytes\)/.test(INDEX) === false, true);
check('fmtBytes 未被误删（左栏字节列 + 左上角信息浮层仍在用）',
  (INDEX.match(/fmtBytes\(/g) || []).length >= 3, true);
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
  /src\.getImageProperty\(image\.PropertyKey\.ORIENTATION\)/.test(INDEX) &&
  /opts\.rotate = exif\.degrees;/.test(INDEX) &&
  /await px\.rotate\(exif\.degrees\)/.test(INDEX) &&
  /await px\.flip\(exif\.flipH, exif\.flipV\)/.test(INDEX), true);
check('EXIF 元数据有缓存（避免 201 张预载逐张跨进程读）',
  /const EXIF_CACHE: Map<string, ExifTransform> = new Map\(\)/.test(INDEX) &&
  /const cached: ExifTransform \| undefined = EXIF_CACHE\.get\(uri\)/.test(INDEX), true);
check('HDR：解码 AUTO + 显示端 HIGH / STANDARD 按图切换（主视图 / 兜底 / 右页三处）',
  /opts\.desiredDynamicRange = image\.DecodingDynamicRange\.AUTO;/.test(INDEX) &&
  (INDEX.match(/\.dynamicRangeMode\(this\.viewHdrWanted \? DynamicRangeMode\.HIGH : DynamicRangeMode\.STANDARD\)/g) || []).length === 3, true);
check('色彩：保留内嵌 ICC 或转换到 sRGB / Display P3，并读回 PixelMap 色彩空间',
  /const COLOR_MANAGE_MODE: number = 0;/.test(INDEX) &&
  /opts\.desiredColorSpace = colorSpaceManager\.create\(colorSpaceManager\.ColorSpace\.SRGB\)/.test(INDEX) &&
  /opts\.desiredColorSpace = colorSpaceManager\.create\(colorSpaceManager\.ColorSpace\.DISPLAY_P3\)/.test(INDEX) &&
  /px\.getColorSpace\(\)\.getColorSpaceName\(\)/.test(INDEX), true);
check('最高画质 resample：主视图 / 兜底 / 并排右页均 Cubic(High) + autoResize(false)',
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  (INDEX.match(/\.interpolation\(ImageInterpolation\.High\)/g) || []).length >= 3, true);
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
check('② ESC 退出：还原进全屏前的缩放 / 平移 / 旋转 / 镜像 / 状态栏 / 顶栏',
  /if \(this\.hasFullSnapshot\) \{/.test(SET_FULL_FN) &&
  /this\.zoom = this\.preFullZoom;/.test(SET_FULL_FN) &&
  /this\.tx = this\.preFullTx;/.test(SET_FULL_FN) &&
  /this\.ty = this\.preFullTy;/.test(SET_FULL_FN) &&
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
  /\.interpolation\(ImageInterpolation\.High\)/.test(RIGHT_IMAGE_FN) &&
  /\.autoResize\(false\)/.test(RIGHT_IMAGE_FN) &&
  /\.dynamicRangeMode\(this\.viewHdrWanted \? DynamicRangeMode\.HIGH : DynamicRangeMode\.STANDARD\)/.test(RIGHT_IMAGE_FN), true);
check('④ hover 浮层已无档案名 Text（全文件只剩左栏那一处）',
  (INDEX.match(/Text\(this\.name\)/g) || []).length === 1, true);
check('⑤ 列表两行缝压到 1vp + 交替色格子（回归护栏）',
  /const LIST_ROW_GAP_VP: number = 1;/.test(INDEX) &&
  /top: 1, bottom: 1/.test(INDEX) &&
  /\.backgroundColor\(this\.rowBgColor\(\)\)/.test(INDEX), true);

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
check('左右页显示层仍是最高画质（High + autoResize(false) + HDR 三处齐配）',
  (INDEX.match(/\.autoResize\(false\)/g) || []).length === 3 &&
  (INDEX.match(/\.interpolation\(ImageInterpolation\.High\)/g) || []).length >= 3 &&
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
  (INDEX.match(/\.width\(this\.viewBoxW\(half\)\)/g) || []).length >= 6, true);
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
check('⑤ 根因 C：栏偏移基准由两处回调共同维护，进出全屏重置',
  /this\.chromeW = this\.lastRootW - w;/.test(INDEX) &&
  /this\.chromeW = rw - this\.canvasW;/.test(INDEX) &&
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
check('① flushSnap 同时写 meta 块、清理旧块时一并删',
  /await store\.put\(META_KEY_PREFIX \+ c, encodeMeta\(metaPart\)\);/.test(INDEX) &&
  /await store\.delete\(META_KEY_PREFIX \+ c\);/.test(INDEX) &&
  /metaPart\.push\(\{ size: this\.items\[i\]\.size, mtime: this\.items\[i\]\.mtime \?\? 0 \}\);/.test(INDEX), true);
check('① 快照恢复读 meta 并注入，单张兜底按 uri 找日期',
  /const metas: Array<ArchiveMeta> = await this\.readSnapMeta\(store, uris\.length\);/.test(INDEX) &&
  /this\.setItems\(uris, src, metas\);/.test(INDEX) &&
  /private async readMetaForUri\(/.test(INDEX) &&
  /this\.setItems\(\[single\], src, \[oneMeta\]\);/.test(INDEX) &&
  /return metaForUri\(uris, metas, uri\);/.test(INDEX), true);
check('① 左栏日期列本身没被改掉（回归护栏）',
  /Text\(this\.mtime > 0 \? fmtDate\(this\.mtime\) : '--'\)/.test(INDEX) &&
  /mtime: item\.mtime \?\? 0,/.test(INDEX), true);
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
  /const LIST_ROW_GAP_VP: number = 1;/.test(INDEX) &&
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
check('③ 档案行最左侧圆点已移除（上层 / 目录符号保留，列宽不变）',
  /Text\(this\.kind === ROW_UP \? '↑' : \(this\.kind === ROW_FOLDER \? '▣' : ''\)\)/.test(INDEX) &&
  /ROW_FOLDER \? '▣' : '·'/.test(INDEX) === false &&
  /\.width\(18\)/.test(INDEX), true);
check('④ 右下角百分比上方「缓存 N 张」文案 / 控件已移除（第二十一轮角标改为带构建标记）',
  /Text\('缓存 ' \+ this\.cacheCount \+ ' 张'\)/.test(INDEX) === false &&
  /右下角角标：只显示「缩放百分比」一项/.test(INDEX) &&
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
  /class RawStore \{/.test(INDEX) &&
  /private data: Map<string, ArrayBuffer> = new Map\(\);/.test(INDEX) &&
  /private inflight: Map<string, Promise<ArrayBuffer \| undefined>> = new Map\(\);/.test(INDEX) &&
  /private gen: number = 0;/.test(INDEX) &&
  /const rawStore: RawStore = new RawStore\(\);/.test(INDEX), true);
check('原始档案数据预算与 PixelMap 缓存分开计（防 OOM）',
  /const RAW_CACHE_MAX_BYTES: number = 768 \* 1024 \* 1024;/.test(INDEX) &&
  /const RAW_SINGLE_MAX_BYTES: number = 64 \* 1024 \* 1024;/.test(INDEX) &&
  /const RAW_CACHE_MAX_COUNT: number = 20000;/.test(INDEX) &&
  /const PRELOAD_MAX_BYTES: number = 1024 \* 1024 \* 1024;/.test(INDEX), true);
check('decodePx 优先从内存 ArrayBuffer 建 ImageSource，失败降级 fd',
  /const raw: ArrayBuffer \| undefined = await rawStore\.ensure\(uri\);/.test(INDEX) &&
  /src = image\.createImageSource\(raw\);/.test(INDEX) &&
  /file = fs\.openSync\(uri, fs\.OpenMode\.READ_ONLY\);/.test(INDEX) &&
  /src = image\.createImageSource\(file\.fd\);/.test(INDEX), true);
check('RawStore.read 一次读满并校验完整性 + LRU 准入',
  /const got: number = fs\.readSync\(file\.fd, buf\);/.test(INDEX) &&
  /if \(!rawReadComplete\(got, size\)\)/.test(INDEX) &&
  /const fit: RawFit = rawFitOf\(this\.sizesOf\(\), size,/.test(INDEX) &&
  /for \(let i = 0; i < fit\.evict; i\+\+\)/.test(INDEX), true);
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
  /isNetworkHost\(parts\[1\]\)/.test(DIRNAME_SRC) &&
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
check('ro1 闸门 / 版本 / 按钮 / 启动重扫护栏 / 无同步等待都未动',
  (INDEX.match(/bulkIoAllowed\(this\.restoreMode\)/g) || []).length >= 9 &&
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX) &&
  /new Promise|Promise\.race/.test(INDEX) === false, true);
check('层级重建仍恰好 2 处、全量链与滚轮零解码未动',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 2 &&
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
check('版本 / 按钮永不禁用 / 启动重扫护栏 / 无同步等待都未动',
  /const APP_VERSION: string = '1\.0\.7'/.test(INDEX) &&
  /\.enabled\(/.test(CODE_LINES) === false &&
  /const AUTO_RESUME_ON_START: boolean = false;/.test(INDEX) &&
  /new Promise|Promise\.race/.test(INDEX) === false, true);
check('层级重建仍恰好 2 处、全量链与滚轮零解码未动',
  (INDEX.match(/this\.restoreBrowseContext\(\);/g) || []).length === 2 &&
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
  /Text\(this\.itemCount > 0 \? this\.itemCount \+ ' 张' : ''\)/.test(INDEX), true);

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
  /this\.toolBtn\('全屏', 'full', false\)/.test(TOPBAR_FN) &&
  /\.onClick\(\(\) => this\.doAction\('play'\)\)/.test(TOPBAR_FN) &&
  /Row\(\) \{[\s\S]{0,700}this\.toolBtn\('全屏'/.test(TOPBAR_FN), true);

// ③ hover 小图预览：事件触发立即显示、移出立即隐藏、无动画无延迟
check('③ bindPopup 用 TransitionEffect.IDENTITY 关掉默认淡入淡出',
  /transition: TransitionEffect\.IDENTITY/.test(POPUP), true);
check('③ popup 选项里无 opacity / duration / animateTo 动效（代码行）',
  /\.opacity\(|duration:|animateTo/.test(POPUP_CODE) === false, true);
check('③ 源码全局已无 hover 延迟机制（常量 / 计时器 / 代号 / 复位方法）',
  /HOVER_CLOSE_DELAY_MS|hoverCloseTimer|hoverSeq|cancelCloseTimer/.test(INDEX) === false, true);
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
  /this\.toolBtn\('往上层', 'up', true\)/.test(INDEX) &&
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
  /this\.toolBtn\('往上层', 'up', true\)/.test(INDEX) &&
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
  INDEX.includes('.onScrollIndex((first: number, last: number, center: number) => {') &&
  INDEX.includes('this.listFirstRow = first;') &&
  INDEX.includes('this.listLastRow = last;'), true);
check('②-a applyItems 换源后重置可见范围（不拿旧范围误判）',
  APPLY_FN.includes('this.listFirstRow = -1;') &&
  APPLY_FN.includes('this.listLastRow = -1;'), true);
check('②-a 全源码裸 scrollToIndex 只剩 3 处（换源定位 + 两个收口方法）',
  INDEX.split('this.scroller.scrollToIndex(').length - 1, 3);

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
  INDEX.includes('loupeClampedOffset(this.loupeX, this.viewBoxW(half), LOUPE_D_VP, LOUPE_ZOOM)') &&
  INDEX.includes('loupeClampedOffset(this.loupeY, this.frameH(), LOUPE_D_VP, LOUPE_ZOOM)') &&
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
  INDEX.includes("this.toolBtn('往上层', 'up', true)") &&
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
  LOUPE_MOUSE14_CODE.includes('loupeInFrame(x, y, this.viewBoxW(half), this.frameH())'), true);
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
  INDEX.includes('loupeClampedOffset(this.loupeX, this.viewBoxW(half), LOUPE_D_VP, LOUPE_ZOOM)') &&
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
  INDEX.split('.interpolation(ImageInterpolation.High)').length - 1 >= 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  CODE_LINES.includes('.enabled(') === false &&
  INDEX.includes("this.toolBtn('往上层', 'up', true)") &&
  INDEX.includes('const PRELOAD_ALL: boolean = true;') &&
  TOPBAR_FN.includes('.visibility(this.topToolsVisible ? Visibility.Visible : Visibility.Hidden)') &&
  QUIT_FN.includes('ability.terminateSelf()') &&
  INDEX.includes('@State topBarPeek: boolean = false;') &&
  INDEX.includes('topBarPeekOf(this.topBarPeek, yTop,') &&
  INDEX.includes('tapScrollAction(row, this.listFirstRow, this.listLastRow,') &&
  INDEX.split('this.scroller.scrollToIndex(').length - 1 === 3, true);

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

console.log('--- 第十五轮 ②：Index.ets 源码静态契约（预设关闭 / 右键 toggle / 回归护栏） ---');
check('② @State loupeEnabled 初值取预设常量（默认关闭，单一真值来源）',
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  LOUPE_DEFAULT_ENABLED === false &&
  INDEX.includes('LOUPE_DEFAULT_ENABLED, loupeEnabledAfterRightPress,'), true);
check('② loupeLayer 绘制判定走 loupeVisibleOf（总开关 + 双页独立）',
  LOUPE13_CODE.includes('loupeVisibleOf(this.loupeEnabled, this.loupePane, pane,') &&
  LOUPE13_CODE.includes('this.loupeHover, this.hasLoupeImage(pane)))') &&
  LOUPE13_CODE.includes('loupePaneActiveOf(this.loupePane,') === false, true);
check('② 右键点击改为 toggle 放大镜，移除原「还原视图」',
  MOUSEBTN15_CODE.includes('if (btn === MouseButton.Right)') &&
  MOUSEBTN15_CODE.includes('this.applyLoupeToggle(true);') &&
  MOUSEBTN15_CODE.includes('this.resetView();') === false &&
  MOUSEBTN15_CODE.includes('已还原') === false, true);
check('② 右键点击仍走 !moved 判定（右键拖拽是平移，不翻转开关）',
  MOUSEBTN15_CODE.includes('if (moved) {') &&
  MOUSEBTN15_CODE.indexOf('if (moved) {') < MOUSEBTN15_CODE.indexOf('this.applyLoupeToggle(true);') &&
  MOUSEBTN15_CODE.includes('const btn: number = this.pressBtn;'), true);
check('② 右键 Press 仍 stopPropagation（不弹系统右键菜单）',
  MOUSEBTN15_CODE.includes('event.stopPropagation();') &&
  MOUSEBTN15_CODE.includes('event.button === MouseButton.Right'), true);
check('② applyLoupeToggle 走纯函数且只在真正翻转时写状态',
  TOGGLE15_CODE.includes('loupeEnabledAfterRightPress(this.loupeEnabled, rightClick)') &&
  TOGGLE15_CODE.includes('if (next !== this.loupeEnabled)') &&
  TOGGLE15_CODE.includes('this.loupeEnabled = next;'), true);
check('② 根容器 Press 兜底：非预览区右键也能 toggle，且只认 Press 不重复翻转',
  ROOTMOUSE15_CODE.includes('if (event.action === MouseAction.Press)') &&
  ROOTMOUSE15_CODE.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
  ROOTMOUSE15_CODE.includes('MouseAction.Release') === false, true);
check('② 全屏复位不重置总开关（用户手动开启的开关跨全屏保持）',
  SET_FULL14_CODE.includes('loupeEnabled') === false &&
  SET_FULL14_CODE.includes('this.loupePane = LOUPE_PANE_NONE;') &&
  SET_FULL14_CODE.includes('this.loupeHover = loupeHoverAfterModeChange'), true);
check('② 空态提示文案同步为「右键放大镜」（不再写右键还原）',
  INDEX.includes("Text('双击进入全屏 · 右键放大镜 · 拖拽平移')") &&
  INDEX.includes("Text('双击进入全屏 · 右键还原 · 拖拽平移')") === false, true);
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
  INDEX.includes('return loupePixelAlignOf(this.viewBoxW(half) * LOUPE_ZOOM);') &&
  INDEX.includes('return loupePixelAlignOf(this.frameH() * LOUPE_ZOOM);') &&
  INDEX.includes('loupePixelAlignOf(loupeClampedOffset(this.loupeX, this.viewBoxW(half), LOUPE_D_VP, LOUPE_ZOOM))') &&
  INDEX.includes('loupePixelAlignOf(loupeClampedOffset(this.loupeY, this.frameH(), LOUPE_D_VP, LOUPE_ZOOM))'), true);
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
  INDEX.split('.interpolation(ImageInterpolation.High)').length - 1 >= 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
  INDEX.includes('this.toolBtn(\'往上层\', \'up\', true)') &&
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
  INDEX.split('.interpolation(ImageInterpolation.High)').length - 1 >= 3 &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';") &&
  INDEX.includes('回上层') === false &&
  INDEX.includes('@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED;') &&
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
  INDEX.includes("this.toolBtn('往上层', 'up', true)") &&
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
  // 三处：自愈 / windowStatusChange 回调 / ESC 分派前主动读真值
  INDEX.split('this.setFull(false, true);').length - 1 === 3, true);
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
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
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
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
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
check('① 兼容只派发 KeyType.Up 的 2in1 键盘：未收到 Down 时把 Up 当一次有效 ESC，且绝不双触发',
  ONKEY18_CODE.includes('const rawDown: boolean = (event.type === KeyType.Down);') &&
  ONKEY18_CODE.includes('(code === KeyCode.KEYCODE_ESCAPE && !this.escDownHandled)') &&
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
check('② 诊断串直接拼在既有状态栏 Text 上，不新增组件 / 不改布局 / 不占空间',
  /Text\(this\.status \+ \(this\.escDiag\.length > 0 \?/.test(INDEX) &&
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
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
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
check('② 三处 setFull(false, true) 仍在：自愈 / 窗口状态回调 / ESC 前兜底',
  INDEX.split('this.setFull(false, true);').length - 1 === 3, true);

console.log('--- 第二十一轮 ③：焦点锚点 / 去重 / 常显诊断 / 退出兜底 ---');
check('③ 1vp 透明 Button 焦点锚点：天然可聚焦 + 双通道按键 + 不挡鼠标',
  /Button\(\) \{ \}[\s\S]{0,500}\.id\(KEY_FOCUS_ID\)/.test(INDEX) &&
  INDEX.includes('.hitTestBehavior(HitTestMode.None)') &&
  (INDEX.match(/\.onKeyPreIme\(\(event: KeyEvent\): boolean => this\.onKeyCapture\(event\)\)/g) || []).length === 2 &&
  (INDEX.match(/\.onKeyEvent\(\(event: KeyEvent\): boolean => this\.onKeyConsumed\(event\)\)/g) || []).length === 2, true);
check('③ 重聚焦优先抢 Button 锚点，且 aboutToAppear 也主动抢（不再等 setFull 被调用）',
  INDEX.includes('focusControl.requestFocus(KEY_FOCUS_ID);') &&
  /aboutToAppear\(\): void \{[\s\S]{0,1000}this\.scheduleKeyRefocus\(\);/.test(INDEX), true);
check('③ KeyEvent 对象引用去重：零时间窗，不吞用户连按的第二次 ESC',
  INDEX.includes('if (this.lastKeyEvent === event) {') &&
  INDEX.includes('this.lastKeyEvent = event;') &&
  INDEX.includes('FULL_EXIT_ESC_GUARD_MS') === false, true);
check('③ 常显 R21 构建标记 + 全屏/普通都可见的黄色诊断行（第二十轮只放状态栏的缺陷已修）',
  INDEX.includes("const ESC_BUILD_TAG: string = 'R21';") &&
  /' · ' \+ ESC_BUILD_TAG/.test(INDEX) &&
  INDEX.includes('if (this.escDiag.length > 0) {') &&
  INDEX.includes('Text(this.escDiag)') &&
  INDEX.includes(".fontColor('#ffd479')"), true);
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
  INDEX.includes('this.applyLoupeToggle(event.button === MouseButton.Right);') &&
  INDEX.includes('shouldSelfHealOnResize(this.fullscreen, healReady,') &&
  INDEX.includes("const APP_VERSION: string = '1.0.7';"), true);
console.log('  ⚠️ 本组仍为源码静态契约，不替代真机按键验证；真机步骤见 README 第二十一轮章节。');
console.log('  ⚠️ 截图判定：右下角角标必须出现 R21，否则说明装的是旧包，需重新安装签名 HAP。');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
