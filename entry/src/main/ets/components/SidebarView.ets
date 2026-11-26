/**
 * components/SidebarView.ets —— 左侧档案列表栏（R40：Index.ets 拆分 Phase 3 迁出）
 *
 *  从 pages/Index.ets 的 build() **原样迁出**（UI 描述逐行等价）：
 *    · 标题行（来源 + 档案张数）→ 工具行（排序 / 往上层 / 选择文件夹）→ dirHint 提示条
 *    → 空态 / LazyForEach 档案列表（ArchiveRow 行 + 悬停缩略图）
 *  状态仍归 pages/Index.ets（Phase 3 约定）：本组件只收 @Prop 快照 + 回调上抛，
 *  不持有任何业务状态；scroller / dataSource 是共享对象引用，由 Index 创建。
 *  依赖方向：pages/Index.ets → 本组件 → components/ArchiveRow + model/，无环。
 */

import { ArchiveRow, ROW_IMAGE, ROW_FOLDER, ROW_OTHER } from './ArchiveRow';
import { ToolButton } from './ToolButton';
import { GalleryDataSource, ImageItem } from '../model/GalleryData';
// 第五十九轮：往上层后反色标记的行级命中判定（名字严格相等 + 目录类行）。
import { upReturnInvertOf } from '../common/UpReturn';
// 第七十二轮：档案列表右键菜单的纯函数真值源（命中判定 / 放大镜抑制）。
// 第七十三轮真机修复：R72 的 bindContextMenu(ResponseType.RightClick) 依赖系统右键手势，
// 2in1 真机实测「右键完全没反应」；改由 ListItem.onMouse 的右键 Press 直接上抛窗口坐标，
// 菜单改画成 Index 里的应用内条件浮层（与 R72 详情面板同一套机制，零系统手势依赖）。
// 只在真实档案 / 文件夹行上绑定，空白区与「..」伪行零菜单。
import { fcHitOf, fcStopPropagationOf } from '../common/FileContextMenu';

/** 第七十七轮：收起态宽度不再是固定 224vp，改由 Index 侧 acLayoutOf 按容器尺寸
 *  动态下传（@Prop collapsedW）；展开宽 / 三列宽同样全部 adaptive，零预设固定宽度。 */
/** List 行间距（第十三轮：两行缝压到 1vp）；原 Index.ets 同值迁入。 */
const LIST_ROW_GAP_VP: number = 1;

@Component
export struct SidebarView {
  // ---- Index 下传的状态快照（@Prop：父侧 @State 变化即同步重渲染）----
  @Prop source: string = '';
  @Prop itemCount: number = 0;
  @Prop sortAsc: boolean = true;
  @Prop dirHint: string = '';
  @Prop rowCount: number = 0;
  @Prop resumeHint: string = '';
  @Prop cur: number = -1;
  /** 第五十九轮：Index 下传的「返回前所在子目录名」；空串表示没有行反色。
   *  与 cur / selected 完全独立，不参与常规选中与目录切换。 */
  @Prop upReturnName: string = '';
  @Prop listCollapsed: boolean = false;
  /** 第七十七轮：三个动态宽度全部由 Index 的 acLayoutOf 下传，无预设固定值。 */
  @Prop listW: number = 0;
  @Prop collapsedW: number = 0;
  @Prop colSizeW: number = 0;
  @Prop colDateW: number = 0;
  /** 第六十四轮：与 Index 的 rows 同下标的目录内容量文案（非目录行为空串）。
   *  @Prop 数组每次整份换新引用；读它的方法同时读 dirCountVersion 建立 V1 依赖。 */
  @Prop dirCountLabels: Array<string> = [];
  @Prop dirCountVersion: number = 0;
  // ---- 共享对象引用（非状态：scroller 供翻页滚动判定，dataSource 供 LazyForEach）----
  scroller: Scroller = new Scroller();
  dataSource: GalleryDataSource = new GalleryDataSource();
  // ---- 回调上抛（闭包在 Index 侧定义，读的永远是 Index 的最新状态）----
  restoreReadonly: () => boolean = (): boolean => false;
  onRowTap: (i: number) => void = (i: number): void => {
  };
  onDblTap: (i: number) => void = (i: number): void => {
  };
  onAction: (act: string) => void = (act: string): void => {
  };
  onScrollIndex: (first: number, last: number) => void = (first: number, last: number): void => {
  };
  /** 第七十三轮：右键 Press 命中档案行 → 上抛 (rows 下标, 窗口 X, 窗口 Y)。
   *  x/y 取 MouseEvent.displayX/displayY（SDK 15+ 的窗口坐标系，单位 vp），
   *  缺失时退回相对组件的 x/y，由 Index 侧 fcMenuPosOf 再裁剪，绝不让 NaN 进浮层。
   *  Index 侧仍会用 fcHitOf 复核一次，菜单项与全部行为都由 Index 收口。 */
  onContextMenu: (idx: number, x: number, y: number) => void =
    (idx: number, x: number, y: number): void => {
    };

  /** 第六十四轮：取某一行的内容量文案。读两个 @Prop 建立 V1 依赖，
   *  统计落地换数组 / 版本号 +1 时可见行随之重算；非目录行返回空串。 */
  private dirCountLabelOf(idx: number): string {
    const v: number = this.dirCountVersion;
    const labels: Array<string> = this.dirCountLabels;
    if (v < 0 || idx < 0 || idx >= labels.length) {
      return '';
    }
    return labels[idx];
  }

  /** 第七十二轮：把原有的 ArchiveRow 构造原样收进 @Builder，让「带菜单 / 不带菜单」
   *  两条 ListItem 分支共用同一份构造代码 —— 行内属性、hover、点击、双击逐字不变。
   *  绝不在 ArchiveRow 里塞菜单：行组件只负责画与既有交互，零回归最稳。 */
  @Builder
  archiveRowOf(item: ImageItem, idx: number) {
    ArchiveRow({
      uri: item.uri,
      name: item.name,
      bytes: item.size,
      mtime: item.mtime ?? 0,
      kind: item.kind ?? ROW_IMAGE,
      idx: idx,
      selected: (item.itemIndex ?? idx) === this.cur,
      // 第五十九轮：只对「返回前所在子目录」那一行反色，其余行默认样式不变。
      inverted: upReturnInvertOf(item.name, this.upReturnName,
        item.kind ?? ROW_IMAGE, ROW_FOLDER, ROW_OTHER),
      countText: this.dirCountLabelOf(idx),
      collapsed: this.listCollapsed,
      // 第七十七轮：三列宽按内容 / 容器动态伸缩，逐行共用同一套值。
      colSizeW: this.colSizeW,
      colDateW: this.colDateW,
      thumbDisabled: this.restoreReadonly(),
      onTap: (i: number) => {
        this.onRowTap(i);
      },
      onDblTap: (i: number) => {
        this.onDblTap(i);
      }
    })
  }

  build() {
    Column() {
      Row() {
        Text(this.source)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#dfe5ef')
          .layoutWeight(1)
        // 第十一轮：版本号只在最顶部标题栏（topBar 的 PIKAN 版本号）显示一次，
        // 第二栏不再重复；这里只留档案张数，样式 / 位置都不变。
        Text(this.itemCount > 0 ? this.itemCount + ' 张' : '')
          .fontSize(12)
          .fontColor('#7f88a3')
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 10, bottom: 8 })

      // 11-10 起：排序 / 往上层 / 选择文件夹 三个按钮水平排在同一行。
      // ToolButton 的 layoutWeight(1) 三等分宽度 → 水平间距由统一的 margin(3) 决定，一致；
      // 统一 height(30) + Row 垂直居中 → 垂直对齐整齐；
      // 合并掉原来的第二行后，按钮区不再有多余垂直空白，也不会重叠 / 错位。
      Row() {
        ToolButton({ label: this.sortAsc ? '排序 ↑' : '排序 ↓', act: 'sort', flex: true, onAction: this.onAction })
        // 「往上层」恒亮恒可点（2026-11-11：不要 grey out、不能禁用）。
        // canGoUp 只用于状态栏 / 诊断串 / browseUp 行为判据，不传进按钮。
        ToolButton({ label: '往上层', act: 'up', flex: true, onAction: this.onAction })
        ToolButton({ label: '选择文件夹', act: 'folder', flex: true, onAction: this.onAction })
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
            // 第七十三轮：右键菜单**只由命中档案行的 .onMouse 右键 Press 触发**。
            //  · R72 用 bindContextMenu(ResponseType.RightClick) 依赖系统右键手势，
            //    2in1 真机实测「右键完全没反应」；本轮整条系统手势依赖移除，
            //    改走项目里已有多轮真机证据的 MouseEvent 通道（放大镜 toggle 同款）。
            //  · 「..」往上层是导航伪行、列表下方空白 / 空态 / 标题 / 按钮都不是
            //    命中 ListItem，根本没有 .onMouse 绑定 ⇒ 右键绝不弹菜单（用户硬要求）。
            //  · 命中行右键 Press 先上抛窗口坐标，再 stopPropagation 阻断冒泡到根
            //    .onMouse，避免顺带翻转放大镜；预览区 / 空白区右键 toggle 逐字保留。
            //  · 两条分支共用 archiveRowOf()，行内一切属性 / 交互零差异。
            if (fcHitOf(item.kind ?? ROW_IMAGE)) {
              ListItem() {
                this.archiveRowOf(item, idx);
              }
              .onMouse((event: MouseEvent) => {
                if (fcStopPropagationOf(event.action === MouseAction.Press,
                  event.button === MouseButton.Right, true)) {
                  const dx: number = Number(event.displayX ?? event.x);
                  const dy: number = Number(event.displayY ?? event.y);
                  this.onContextMenu(idx, dx, dy);
                  event.stopPropagation();
                }
              })
            } else {
              ListItem() {
                this.archiveRowOf(item, idx);
              }
            }
          }, (item: ImageItem) => item.uri)
        }
        .layoutWeight(1)
        .width('100%')
        .scrollBar(BarState.Auto)
        // 第五十九轮：名称文字紧贴列表最左边缘 —— 去掉 List 左内边距，右侧留白保留。
        .padding({ right: 8 })
        .cachedCount(6)
        // 第十三轮：记录左栏可见范围，供点选 / 翻页的滚动判定使用。
        // 只读数值、不驱动 UI，故直接写普通字段（不进状态系统）。
        .onScrollIndex((first: number, last: number, center: number) => {
          this.onScrollIndex(first, last);
        })
      }

      // 11-10 起按用户要求取消左下角 4 行 × 2 列共 8 个视图控制按钮。
      // 缩放 / 旋转 / 镜像 / 复位能力仍由键盘与鼠标提供（见 README 快捷键表）。
    }
    .width(this.listCollapsed ? this.collapsedW : this.listW)
    .height('100%')
    .backgroundColor('#161a21')
  }
}
