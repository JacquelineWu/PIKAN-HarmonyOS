/**
 * 目录名显示回归测试 —— 直接加载工程里的纯函数源码，不是复制实现。
 *
 *   node --experimental-strip-types tests/dirname.test.mjs
 *
 * 覆盖 2026-11-10 报出的缺陷：选择
 *   /storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像
 * 时左栏抬头空白。同时覆盖中文、%XX 编码、file://docs 文档 URI、
 * 尾部斜杠、? 参数、多级路径、纯 ASCII、空值兜底。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf, textWidthVp, listWidthForNames, sameEntryNames } from '../entry/src/main/ets/common/DirName.ts';

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

console.log('--- parentDirOf(): 回上层的父目录（尾斜杠 / 中文 / 文档 URI） ---');
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

console.log('--- parentDirCandidates(): 回上层逐个尝试的候选 ---');
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
check('三个按钮合并在同一行',
  /toolBtn\('回上层', 'up', true\)\s*this\.toolBtn\('选择文件夹', 'folder', true\)/.test(INDEX), true);
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
  /this\.hoverSeq\+\+;\s*if \(this\.hoverCloseTimer !== -1\)/.test(HOVER_FN), true);
check('onMouse(Move) 只在浮层未展开时补开', /MouseAction\.Move && !this\.showHover/.test(INDEX), true);
check('hover 回调不触碰选中态 / 列表 / 目录',
  /this\.onTap\(|applyItems\(|openFolder\(|this\.cur =/.test(HOVER_FN), false);
check('aboutToDisappear 清理 hover 计时器',
  /aboutToDisappear\(\): void \{[\s\S]{0,400}hoverCloseTimer/.test(INDEX), true);
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
check('诊断串带 hv=2 便于确认新包', /\| hv=2/.test(INDEX), true);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
