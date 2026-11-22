/**
 * components/ArchiveRow.ets —— 左侧档案列表行组件（R39：Index.ets 拆分 Phase 1 迁出）
 *
 *  从 pages/Index.ets **原样迁出**（零逻辑改动，仅加 export）：
 *    · ArchiveRow —— 三栏档案行（文件名 / 字节 / 日期）；悬停缩略图解码完成只重渲染本行
 *    · ThumbLoader —— 悬停缩略图 384px 档 LRU 加载器（模块级单例，并发 1）
 *    · ROW_* 行种类常量 —— Index 构建左栏行数据时也用，故导出
 *  依赖方向：只依赖 common/ 纯函数层与 model/Preview 解码服务，不回指 pages/ —— 模块图无环。
 */

import image from '@ohos.multimedia.image';
import hilog from '@ohos.hilog';
import { textWidthVp } from '../common/DirName';
// 第五十九轮：往上层后「返回前所在子目录」反色显示，常态逐字返回原配色。
import { upReturnBgOf, upReturnFgOf } from '../common/UpReturn';
// 第六十一轮：名称右侧符号列按行种类决定内容与宽度的纯函数真值源（零 SDK / 零 IO）。
import { FG_COL_W, folderGlyphOf, folderGlyphWidthOf } from '../common/FolderGlyph';
// 第六十四轮：目录行「内容量」四态文案的兜底常量（零 SDK / 零 IO 的真值源）。
import { DC_LABEL_PENDING } from '../common/DirCount';
import { HoverGuard } from '../common/HoverGuard';
import { decodePx, PreviewEntry, TAG, DOMAIN } from '../model/Preview';

/** 左栏行种类 */
export const ROW_IMAGE: number = 0;
export const ROW_UP: number = 1;
export const ROW_FOLDER: number = 2;
export const ROW_OTHER: number = 3;
/** 第三十七轮：可预览的纯文本 / 源码文件行。只进左栏 rows，
 *  **绝不进 items**（图片翻页序列）—— 否则解码 / 预载链会把 .c 当图片解。 */
export const ROW_TEXT: number = 4;

/** 「梅花间竹」交替色格子（2026-11-11 用户要求）：档案列表奇偶行两种底色，
 *  形成一格一格的棋盘条纹；选中行用独立高亮色，优先级最高（见 ArchiveRow.rowBgColor）。
 *  两行之间的垂直缝按「继续压缩到约 1mm」取 1vp —— ArkUI 只有 vp / px，没有 mm 单位，
 *  1vp 在 2in1 高密度屏上就是极细的一线缝；实机觉得宽/窄只改 LIST_ROW_GAP_VP 一个常量即可。 */
const ROW_STRIPE_EVEN: string = '#1e242e';
const ROW_STRIPE_ODD: string = '#161a21';
const ROW_SELECTED_BG: string = '#1f2730';

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

/** 字节数 → 'B / KB / MB'，左栏「字节」列用；Index 左上角信息浮层也在用（R39 随行组件迁出并导出）。 */
export function fmtBytes(n: number): string {
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
/** 第十一轮：悬停小图预览「零延迟、零动画」—— 不再有关闭去抖常量 / 关闭计时器。
 *  onHover(true) 同步展开、onHover(false) 同步收起；popup 的显隐动效由
 *  bindPopup 的 transition: TransitionEffect.IDENTITY 关掉（见下方选项说明）。
 *  闪烁真正的根因仍是 bindPopup 默认的 mask / autoCancel，两项保持关闭。 */
/** 待处理队列上限。快速滑动列表会堆积大量「已划走」的请求，超了就丢最旧的，
 *  否则一次甩动可能排进上千个任务 */
const THUMB_QUEUE_MAX: number = 240;

/** 一个缩略图请求任务 */
interface ThumbTask {
  uri: string;
  alive: () => boolean;                          // 请求方还活着吗（离屏的行会被跳过）
  cb: (p: image.PixelMap | undefined) => void;
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
export struct ArchiveRow {
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
  /** 第五十九轮：往上层后「返回前所在子目录」的反色标记。与 selected 完全独立：
   *  不参与 cur / select() / onRowTap / 目录切换，只由 SidebarView 按名字 + 行种类算出。 */
  @Prop inverted: boolean = false;
  @Prop collapsed: boolean = false;  // 收起左栏时只留档案名一列
  /** 第六十四轮：目录行内容量展示文案（由 SidebarView 按行下标下传）。
   *  非目录行恒不读它；缓存缺失 / 过期的「…」也由它带下来，本组件只负责画。 */
  @Prop countText: string = '';
  /** 只读名单态：快照 uri 的授权已失效，悬停时**绝不**发起 384px 缩略图解码
   *  （ThumbLoader 走 decodePx → await fs.open；虽已异步，死 uri 仍会白等一次
   *  跨进程往返并挤占 IO 队列，故继续在入口短路）。 */
  @Prop thumbDisabled: boolean = false;
  // ⚠️ 回调也不能加 private：ArkTS 会报
  //    "Property 'onTap' is private and can not be initialized through the component constructor"。
  onTap: (idx: number) => void = () => {};
  onDblTap: (idx: number) => void = () => {};
  @State showHover: boolean = false;                       // 悬停浮层是否展开
  @State hoverPx: image.PixelMap | undefined = undefined;  // 悬停大图（384px 档）
  private alive: boolean = true;
  /** 第十一轮：显隐完全同步，不再有去抖代号 / 关闭计时器。
   *  hover 只碰上面两个 @State，绝不调用父组件的 onTap / 列表 / 目录方法
   *  （否则退出 hover 会把当前档案 / 目录带走）。 */

  /** 行标识：同一目录里 uri 唯一，排序 / 重扫改变 idx 也不会串位。 */
  private rowKey(): string {
    return this.uri;
  }

  /** 被 HoverGuard 同步收起（另一行接手浮层）：立刻关，不走延迟，
   *  否则「旧行还没收、新行已经弹出」会看到两个浮层重叠闪一下。
   *  只碰 hover 自己的状态，绝不调用 onTap / 列表 / 目录方法。 */
  private forceHide(): void {
    this.showHover = false;
    this.hoverPx = undefined;
  }

  /** Win64 bac9ff9：图片粉、目录粉蓝、不支持预览的文件灰；上级行用中性色 */
  /** 行首类型标记的颜色（不是缩略图，只是 18vp 的小符号）。 */
  private iconColor(): string {
    if (this.inverted) {
      return upReturnFgOf(true, '#8fb8e8');
    }
    if (this.kind === ROW_OTHER) {
      return '#4b5260';
    }
    if (this.kind === ROW_IMAGE) {
      return this.selected ? '#e8ecf4' : '#e2a8cf';
    }
    // 第三十七轮：文本 / 源码行用暖黄，与图片粉、目录蓝、灰行区分。
    if (this.kind === ROW_TEXT) {
      return this.selected ? '#e8ecf4' : '#d8c78a';
    }
    return '#8fb8e8';
  }

  private labelColor(): string {
    if (this.inverted) {
      return upReturnFgOf(true, '#8fb8e8');
    }
    if (this.selected) {
      return '#e8ecf4';
    }
    if (this.kind === ROW_FOLDER || this.kind === ROW_UP) {
      return '#8fb8e8';
    }
    if (this.kind === ROW_OTHER) {
      return '#6b7280';
    }
    if (this.kind === ROW_TEXT) {
      return '#d8c78a';
    }
    return '#e2a8cf';
  }

  /** 「梅花间竹」交替底色：选中态优先，其余按 idx 奇偶两色成格（2026-11-11）。 */
  private rowBgColor(): string {
    if (this.inverted) {
      return upReturnBgOf(true, ROW_STRIPE_EVEN);
    }
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
    HoverGuard.shared().release(this.rowKey());
    this.showHover = false; // 行划出屏幕 / 滚动列表：浮层立刻收起（无延迟 / 无动画）
    this.hoverPx = undefined;
  }

  /** Win64 51 行：鼠标停在档案行任意位置，右侧浮出小图（左栏本身不常驻缩略图）。
   *  先查悬停自己的 LRU，命中即同步出图；没命中才后台解一张 384px（同时最多一个）。
   *  目录行 / 不支持预览的灰行不弹；离屏、点击、划走由 alive / showHover 收起。
   *  第十一轮：mouseover 事件触发当帧就展开 / 收起 —— 不排队、不 setTimeout、不淡入淡出。 */
  private onHoverChange(on: boolean): void {
    // 只读名单态：连浮层都不弹，彻底断掉 hover 解码链（预览区指引卡会说明原因）。
    if (this.kind !== ROW_IMAGE || this.thumbDisabled) {
      return;
    }
    const key: string = this.rowKey();
    if (!on) {
      // 鼠标移出：立即隐藏，不排队、不等计时器、不带淡出。
      // 已被 HoverGuard 同步收起（换到另一行 / 点击 / 离屏）就别再重复释放。
      if (!this.showHover) {
        return;
      }
      this.showHover = false;
      this.hoverPx = undefined;
      HoverGuard.shared().release(key);
      return;
    }
    // on === true：事件触发即同步展开（showHover 置位的同一帧浮层就在）。
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
      // 第五十九轮：名称文字统一紧贴列表最左边缘，List / Row / Text 三层 left padding 清零。
      // 第六十一轮：名称右侧符号列改为按行种类决定内容与宽度 —— 目录类行不再显示
      // 正方形方格，列宽归零（占位一并移除）；「往上层」↑ 与其余行逐字不变。
      // 归零的 18vp 由上方名称文字的 layoutWeight(1) 弹性吸收，字节 66 / 日期 88
      // 两列靠右固定宽度，三栏起始位置与下方 .height(26) 行高完全不变，
      // 不新增任何空白或偏移；悬停缩略图仍只在 mouse over 整行时由 bindPopup 浮出。
      Text(this.name)
        .fontSize(12)
        .fontColor(this.labelColor())
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        // 左栏已按最长档案名自适应（listWidthForNames），这里再兜一层：
        // layoutWeight 分配宽度时至少给到名字内容宽，长名字不会被压出省略号；
        // 极少数超过 LIST_MAX_W 的超长名才由 Ellipsis 截断。
        .constraintSize({ minWidth: textWidthVp(this.name, 12) })
        .layoutWeight(1)

      Text(folderGlyphOf(this.kind, ROW_UP))
        .fontSize(this.kind === ROW_IMAGE ? 14 : 18)
        .fontColor(this.iconColor())
        .width(folderGlyphWidthOf(this.kind, ROW_FOLDER, ROW_OTHER, FG_COL_W))
        .height(26)   // 11-10 起压缩行高：42 → 26，配合下方 padding 把每行从 54vp 收到 30vp
        .textAlign(TextAlign.Center)

      // 三栏的另外两栏：字节 / 日期（Win64 30599ac）。收起时隐藏。
      // 第六十四轮：目录行在既有「字节」列位改画内容量统计结果 —— 同字号 10 /
      // 同颜色 / 同宽 66 / 同右对齐，不新增列、不改行高、不改三栏起始位置。
      // 非目录行（图片 / 文本 / 灰行 / 上层）的 fmtBytes 链路逐字保留，交互零回归。
      if (!this.collapsed) {
        if (this.kind === ROW_FOLDER) {
          Text(this.countText.length > 0 ? this.countText : DC_LABEL_PENDING)
            .fontSize(10)
            // 复用既有目录行名称配色（含反色 / 选中态），不新增 upReturnFgOf 调用点，
            // 目录行内容量与目录名同色，反色行仍清晰可读；非目录行仍走原字节列配色。
            .fontColor(this.labelColor())
            .width(66)
            .textAlign(TextAlign.End)
            .maxLines(1)
        } else {
          Text(fmtBytes(this.bytes))
            .fontSize(10)
            .fontColor(upReturnFgOf(this.inverted, '#7f88a8'))
            .width(66)
            .textAlign(TextAlign.End)
            .maxLines(1)
        }
        Text(this.mtime > 0 ? fmtDate(this.mtime) : '--')
          .fontSize(10)
          .fontColor(upReturnFgOf(this.inverted, '#6b7385'))
          .width(88)
          .textAlign(TextAlign.End)
          .maxLines(1)
          .margin({ left: 6 })
      }
    }
    .width('100%')
    // 11-11 起继续压缩：上下 padding 2 → 1，配合 List space=1 把两行缝压到约 1mm。
    // 行背景改为「梅花间竹」交替色格子（奇偶两色），选中行仍是高亮色。
    .padding({ right: 6, top: 1, bottom: 1 })
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
        // 浮层已展开：本行内的移动不重复打开（第十一轮起已无计时器可续命）。
        return;
      }
      // ⚠️ 绝不能无条件自动打开：正常设备由 onHover 当帧收口，
      // 一次 Move 又打开会「收起→打开→收起」自激成不停闪。
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
      enableArrow: false, // 少一次箭头位置计算，弹出的位置更稳定
      // 第十一轮：关掉 popup 默认的淡入 / 淡出 / 缩放动效 —— 显示与隐藏都是瞬时的。
      // CustomPopupOptions.transition 设为 IDENTITY 即「无过渡」，比设 duration:0 更彻底。
      transition: TransitionEffect.IDENTITY
    })
    .onClick(() => {
      // 鼠标按下选图：浮层立刻收起（第十一轮起无计时器、无淡出）。
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
