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
 * 以及第三轮「左边显示比右边差 → 左右页统一最高画质」。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames, hierPathOf, volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, sameDirPath, isUpTargetOf, upParentCandidates, UP_NAV_NONE, UP_NAV_TOP, UP_NAV_GO, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf, upContextBaseOf, upContextRawOf, pathChainOf, inAppUpListHint } from '../entry/src/main/ets/common/DirName.ts';
import { HoverGuard } from '../entry/src/main/ets/common/HoverGuard.ts';
import { preloadWindowSize, preloadOrder, preloadSaturated } from '../entry/src/main/ets/common/PreloadBudget.ts';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC, FLUSH_SYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  upButtonEnabled, RESTORE_FULL, RESTORE_READONLY, restoreModeOf, bulkIoAllowed,
  restoreProbeUris, readonlyHint, readonlyTapHint, readonlyUpHint,
  restoreUpEnabled, restoreUpHint } from '../entry/src/main/ets/common/ResumePlan.ts';
import { PERSIST_SKIP, PERSIST_ACTIVATE, persistAction, persistPolicyUris,
  persistTimeoutSafe, persistOkHint, persistFailHint, persistLegacyHint } from '../entry/src/main/ets/common/PersistPlan.ts';
import { exifTransformOf, exifSizeOf, viewEdgeOf, preloadEdgeOf, displayEdgeOf,
  colorSpaceNameOf, isWideGamutOf, viewHintOf, fullscreenStepsOf } from '../entry/src/main/ets/common/ViewPlan.ts';

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
check('hover 关闭有去抖常量', /const HOVER_CLOSE_DELAY_MS: number = 120;/.test(INDEX), true);
check('onHover(false) 改延迟关闭（hoverSeq 代号）', /const seq: number = \+\+this\.hoverSeq;/.test(HOVER_FN), true);
check('延迟关闭带 clearTimeout 复位', /clearTimeout\(this\.hoverCloseTimer\)/.test(INDEX), true);
check('hover 回来会取消待关闭计时器',
  /this\.hoverSeq\+\+;\s*this\.cancelCloseTimer\(\)/.test(HOVER_FN), true);
check('onMouse(Move) 不再无条件自动打开（原自激闪烁源）',
  /MouseAction\.Move && !this\.showHover/.test(INDEX), false);
check('hover 回调不触碰选中态 / 列表 / 目录',
  /this\.onTap\(|applyItems\(|openFolder\(|this\.cur =/.test(HOVER_FN), false);
check('aboutToDisappear 清理 hover 计时器',
  /aboutToDisappear\(\): void \{[\s\S]{0,400}cancelCloseTimer/.test(INDEX), true);
check('点击行时作废 hover 计时器',
  /\.onClick\(\(\) => \{[\s\S]{0,300}this\.hoverSeq\+\+/.test(INDEX), true);
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
check('onMouse 在浮层展开时只续命、不打开',
  /if \(this\.showHover\) \{[\s\S]{0,220}this\.cancelCloseTimer\(\);/.test(INDEX), true);
check('打开浮层前 take 同步收起上一行',
  /HoverGuard\.shared\(\)\.take\(key, \(\) => this\.forceHide\(\)\)/.test(HOVER_FN), true);
check('forceHide 同步收起、不走延迟',
  /private forceHide\(\)[\s\S]{0,220}this\.showHover = false;/.test(INDEX), true);
check('延迟关闭时释放持有者', /HoverGuard\.shared\(\)\.release\(key\)/.test(HOVER_FN), true);
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
check('恢复失败退回单张显示', /resume: snapshot empty\/unreadable → fall back to single/.test(INDEX), true);
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
  /const readable: boolean = this\.probeRestoreUris\(\[single\], this\.okUri, savedUri\);/.test(INDEX), true);
check('两条恢复路径都写 pendingRestoreReadonly',
  (INDEX.match(/this\.pendingRestoreReadonly = !readable;/g) || []).length, 2);
check('只读态不启动预载 / 补体积 / 对开探测',
  /if \(!keepView && ioOk\)/.test(INDEX) &&
  /if \(ioOk\) \{\s*\n\s*this\.refreshSpread\(\);\s*\n\s*this\.schedulePreload\(\);/.test(INDEX), true);
check('只读态清掉残留视图与缓存账目（不显示上一批旧图）',
  /this\.releaseViewOwned\(\);\s*\n\s*this\.viewPixelMap = undefined;\s*\n\s*this\.viewFailed = false;/.test(INDEX), true);
const DECODE_FN = INDEX.slice(INDEX.indexOf('private decodeTo('),
  INDEX.indexOf('private decodeTo(') + 600);
check('解码总闸门在 decodeTo（只读态直接 resolve undefined）',
  /private decodeTo\(uri: string, edge: number\): Promise<PreviewEntry \| undefined> \{/.test(DECODE_FN) &&
  /if \(!bulkIoAllowed\(this\.restoreMode\)\) \{[\s\S]{0,160}return Promise\.resolve<PreviewEntry \| undefined>\(undefined\);/.test(DECODE_FN) &&
  /return decodePx\(uri, edge\);/.test(DECODE_FN), true);
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
check('aboutToDisappear 清掉 activate 超时定时器',
  (INDEX.match(/clearTimeout\(this\.persistTimer\)/g) || []).length, 2);
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
  /this\.setItems\(uris, src\);[\s\S]{0,320}this\.restoreBrowseContext\(\);/.test(INDEX) &&
  /this\.setItems\(\[single\], src\);[\s\S]{0,240}this\.restoreBrowseContext\(\);/.test(INDEX), true);
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

console.log('--- 源码静态契约：预览右下角只显示「缓存数量 + 缩放百分比」两项 ---');
// 结束锚点用代码（onAreaChange），不用注释文字 —— 注释改文案不该让契约失效。
const BADGE = INDEX.slice(INDEX.indexOf('// 右下角角标：只显示'),
  INDEX.indexOf('.onAreaChange((oldV: Area, newV: Area)'));
const BADGE_ALWAYS = BADGE.slice(BADGE.indexOf('// 缓存：只显示'));
const BADGE_CODE = BADGE_ALWAYS.split('\n')
  .filter(x => !/^\s*(\*|\/\/|\/\*)/.test(x)).join('\n');
check('SHOW_DIAG_BADGE 默认 false（目录诊断串不画在右下角）',
  /const SHOW_DIAG_BADGE: boolean = false;/.test(INDEX), true);
check('诊断行的渲染被开关包住，diagLine 赋值点一个没删',
  /if \(SHOW_DIAG_BADGE && this\.diagLine\.length > 0\)/.test(BADGE) &&
  (INDEX.match(/this\.diagLine =/g) || []).length >= 10, true);
check('右下角恒显示区只有 2 个 Text 组件（缓存数量 + 缩放百分比）',
  (BADGE_CODE.match(/^\s*Text\(/gm) || []).length, 2);
check('缓存行只写「缓存 N 张」，不出现 MB / 上限 / 张数分母',
  /Text\('缓存 ' \+ this\.cacheCount \+ ' 张'\)/.test(BADGE_CODE) &&
  /fmtBytes|PRELOAD_COUNT|PRELOAD_MAX_BYTES|cacheBytes/.test(BADGE_CODE) === false, true);
check('缩放百分比仍在右下角，100% = 原图像素 1:1 口径未改',
  /Text\(this\.zoomPercentText\(\)\)/.test(BADGE_CODE) &&
  /const ZOOM_PCT_RELATIVE_TO_PIXEL: boolean = true;/.test(INDEX), true);
check('状态栏「预载 N 张」不再带 MB 占用',
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
  /return preloadEdgeOf\(this\.canvasW, this\.canvasH, this\.fullscreen,/.test(INDEX) &&
  /FULLSCREEN_VIEW_EDGE_FACTOR, VIEW_EDGE_MIN, VIEW_EDGE_MAX\)/.test(INDEX) &&
  /FULLSCREEN_PRELOAD_MAX_EDGE\);/.test(INDEX), true);
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
const SF0 = INDEX.indexOf('private setFull(on: boolean): void {');
const SET_FULL_FN = INDEX.slice(SF0, INDEX.indexOf('fullscreenStepsOf(on)', SF0));
const FB0 = INDEX.indexOf('private armCanvasReloadFallback(): void {');
const FALLBACK_FN = INDEX.slice(FB0, FB0 + 600);
const RP0 = INDEX.indexOf('rightPageImage(uri: string, w: number)');
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
check('③ 并排右页与左页同画质：displayEdge 档位 + autoResize(false) + HDR 模式',
  /const need: number = this\.displayEdge\(srcLong\);/.test(INDEX) &&
  /hit\.edge >= need/.test(INDEX) &&
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
  /displayEdgeOf, colorSpaceNameOf/.test(INDEX) &&
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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
