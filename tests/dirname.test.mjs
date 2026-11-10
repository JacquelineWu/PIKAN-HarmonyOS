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
import { baseName, dirDisplayName, stripTrailingSlash, realPathOf, parentDirOf, parentDirCandidates, pickerStartOf } from '../entry/src/main/ets/common/DirName.ts';

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

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILED'}  ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exitCode = 1;
}
