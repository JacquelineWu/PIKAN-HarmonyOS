/**
 * components/SidebarView.ets —— 左侧档案列表栏（R40：Index.ets 拆分 Phase 3 迁出）
 *
 *  从 pages/Index.ets 的 build() **原样迁出**（UI 描述逐行等价）：
 *    · 标题行（来源 + 档案张数）→ 工具行（第七十八轮起三个纯图案按钮）
 *    → 空态 / LazyForEach 档案列表（ArchiveRow 行 + 悬停缩略图）
 *  第七十八轮：dirHint 提示条随「APP 内上层xxx」提醒一并移除；缩进按钮按下时
 *  左栏切紧凑显示，只留档案名 / 目录名，隐藏全部非名称信息，栏宽按可见内容自适应。
 *  状态仍归 pages/Index.ets（Phase 3 约定）：本组件只收 @Prop 快照 + 回调上抛，
 *  不持有任何业务状态；scroller / dataSource 是共享对象引用，由 Index 创建。
 *  依赖方向：pages/Index.ets → 本组件 → components/ArchiveRow + model/，无环。
 */

import { ArchiveRow, ROW_IMAGE, ROW_FOLDER, ROW_OTHER } from './ArchiveRow';
// 第七十八轮：左栏三个按钮改「仅图案标识」专用组件；ToolButton.ets 仍供顶栏「全屏」
// 与 Ctrl+D 诊断层「内容量 TTL」使用，本组件不再引入它 ⇒ 顶栏 / 诊断层零回归。
import { SideToolButton } from './SideToolButton';
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
  // 第八十三轮：目录名已移到最顶部标题栏，本节不再接收 source（避免两处重复显示）。
  @Prop itemCount: number = 0;
  @Prop sortAsc: boolean = true;
  /** 第七十八轮：「APP 内上层xxx」提醒整体移除 —— 左栏不再接收 / 渲染 dirHint 提示条。
   *  Index 侧仍保留 @State dirHint 供右侧预览空态判空，属另一界面区域，行为不变。 */
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
  /** 第七十九轮：名称列放不下完整名称时改多行换行（逐行共用同一判定）。 */
  @Prop nameWrap: boolean = false;
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
      // 第七十九轮：名称完整优先 —— 放不下时整列改多行换行，不用 Ellipsis 截断。
      nameWrap: this.nameWrap,
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
        // 第八十三轮：目录名已移到最顶部标题栏，左栏不再重复显示。
        // 这里只剩档案张数，并保持原来「靠右」的位置（旧版是目录名 layoutWeight(1) 把它推到右边）。
        // 第十一轮：版本号只在最顶部标题栏（topBar 的 PIKAN 版本号）显示一次，第二栏不重复。
        // 第七十八轮：缩进按钮按下（紧凑态）只显示名称，隐藏「N 张」这类状态 / 辅助标签。
        if (!this.listCollapsed) {
          Text(this.itemCount > 0 ? this.itemCount + ' 张' : '')
            .fontSize(12)
            .fontColor('#7f88a3')
            .layoutWeight(1)
            .textAlign(TextAlign.End)
        }
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 10, bottom: 8 })

      // 第七十八轮：三个按钮统一改为「仅图案标识、零文字标签」。
      //  · 排序：'↑' / '↓' 随 sortAsc 切换，方向本身即状态；降序再叠加 active 高亮底色。
      //  · 往上层：'⇧' 层级上移图案；选择文件夹：'▣' 清晰几何 / 文件夹格图案。
      //  · SideToolButton 逐字沿用旧 ToolButton 的 height(30) / padding / margin /
      //    layoutWeight(1) 三等分 / borderRadius，点击区域大小与位置完全不变；
      //    功能仍由 act → doAction('sort' / 'up' / 'folder') 收口，恒亮恒可点。
      //  · 按下 / 未按下：组件内 down 瞬时高亮 + active 持续高亮两态反馈。
      Row() {
        SideToolButton({ glyph: this.sortAsc ? '↑' : '↓', act: 'sort', flex: true,
          active: !this.sortAsc, onAction: this.onAction })
        // 「往上层」恒亮恒可点（2026-11-11：不要 grey out、不能禁用）。
        // canGoUp 只用于状态栏 / 诊断串 / browseUp 行为判据，不传进按钮。
        SideToolButton({ glyph: '⇧', act: 'up', flex: true, onAction: this.onAction })
        SideToolButton({ glyph: '▣', act: 'folder', flex: true, onAction: this.onAction })
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)
      .padding({ left: 6, right: 6, bottom: 6 })
      .border({ width: { bottom: 1 }, color: '#2a2f3a' })

      // 第七十八轮：「APP 内上层xxx」提醒及其关联的左栏 dirHint 提示条整体移除，
      //  该文案 / 提示内容在左栏不再出现；下方仍是原来的空态 / LazyForEach 档案列表。

      // ⚠️ 判空态用 rowCount（左栏实际行数），不能用 itemCount（只算图片）：
      // 「人像」这类全是子文件夹、零图片的目录 itemCount=0 但 rows 有内容，
      // 旧版会整块换成「还没有图片」空态，目录表一行都不显示。
      if (this.rowCount === 0) {
        Column() {
          Text('还没有图片')
            .fontSize(13)
            .fontColor('#7f88a3')
            .margin({ bottom: 6 })
          // 第七十八轮：紧凑态隐藏恢复提示 / 操作指引等所有非名称辅助标签，
          //  只保留上方那一行空态占位；展开时逐字恢复原来的完整辅助文案。
          if (!this.listCollapsed) {
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
