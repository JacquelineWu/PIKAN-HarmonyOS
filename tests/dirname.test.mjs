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
 * 以及同日澄清的「往上层按钮永不 grey out / 永不禁用、点了要有反应」。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames, hierPathOf, volumeRootOf, dirLevelOf, upLevelOf, canGoUpFrom, sameDirPath, isUpTargetOf, upParentCandidates, UP_NAV_NONE, UP_NAV_TOP, UP_NAV_GO, UP_NAV_UNKNOWN, upNavStateOf, upLooseParentOf } from '../entry/src/main/ets/common/DirName.ts';
import { HoverGuard } from '../entry/src/main/ets/common/HoverGuard.ts';
import { preloadWindowSize, preloadOrder, preloadSaturated } from '../entry/src/main/ets/common/PreloadBudget.ts';
import { RESUME_SKIP, RESUME_SINGLE, RESUME_SNAPSHOT, FLUSH_SKIP, FLUSH_ASYNC, FLUSH_SYNC,
  resumeAction, resumeSingleUri, resumeDelaySafe, exitFlushAction, resumeSnapCap,
  upButtonEnabled } from '../entry/src/main/ets/common/ResumePlan.ts';

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
check('行上下 padding 压到 2', /top: 2, bottom: 2/.test(INDEX), true);
check('List 行间距压到 2', /space: 2/.test(INDEX), true);

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

check('openFolder 支持 isRescan', /isRescan\?: boolean/.test(INDEX), true);
check('重扫内容未变则跳过列表重建', /isRescan === true && this\.sameDirEntries\(names\)/.test(INDEX), true);
check('startDirPoll 用 isRescan=true / 不弹多选',
  /this\.openFolder\(this\.browseBase, false, false, true\)/.test(INDEX), true);
check('重扫传给 applyItems 的 preserveView', /rows, isRescan === true/.test(INDEX), true);
check('preserveView 时不 restoreIndex', /keepView \? -1 : this\.restoreIndex\(list\)/.test(APPLY_FN), true);
check('preserveView 时按 uri 保持当前张', /list\[i\]\.uri === prevUri/.test(APPLY_FN), true);
check('preserveView 时不清预览缓存', /if \(!keepView\) \{\s*this\.clearPreviews\(\)/.test(APPLY_FN), true);
check('preserveView 时不重解大图',
  /if \(!keepView\) \{[\s\S]{0,700}this\.showPreviewOf\(this\.cur\)/.test(APPLY_FN), true);
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
const UP_FN = INDEX.slice(INDEX.indexOf('private async browseUp('), INDEX.indexOf('private chooseFolderAt('));
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
  UP_FN.indexOf("this.status = '往上层失败："));
check('browseUp UNKNOWN 失败不进 chooseFolderAt 死锁',
  /if \(loose\) \{/.test(LOOSE_FAIL) && /return;/.test(LOOSE_FAIL) &&
  /chooseFolderAt/.test(LOOSE_FAIL) === false, true);
check('browseUp 不再 pop 浏览历史', /\.pop\(/.test(UP_FN), false);
check('browseUp 候选只用同层 upParentCandidates', /upParentCandidates\(current,/.test(UP_FN), true);
check('成功后清掉 pickRootUri 旧锚点', /this\.pickRootUri = '';/.test(UP_FN), true);
check('目录浏览态恒列 .. 行（不因路径判定消失）',
  /rows\.push\(\{ uri: '', name: '\.\.', size: -1, mtime: 0, kind: ROW_UP/.test(INDEX) &&
  /if \(canGoUpFrom\(base\)\) \{/.test(INDEX) === false, true);
check('补授权只认 isUpTargetOf', /const exactLevel: boolean = isUpTargetOf\(uris\[0\], current\);/.test(INDEX), true);
check('补授权不再按「同名 + 层级」放宽', /pickedName === targetName && dirLevelOf/.test(INDEX), false);
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
check('角标仍显示 PRELOAD_COUNT 与 PRELOAD_MAX_BYTES',
  /'缓存 ' \+ this\.cacheCount \+ ' \/ ' \+ PRELOAD_COUNT \+ ' 张'/.test(INDEX) &&
  /'\/ ' \+ fmtBytes\(PRELOAD_MAX_BYTES\)/.test(INDEX), true);
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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
