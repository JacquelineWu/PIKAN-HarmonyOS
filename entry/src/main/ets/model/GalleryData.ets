/**
 * model/GalleryData.ets —— 左栏列表数据模型（R40：Index.ets 拆分 Phase 3 迁出）
 *
 *  从 pages/Index.ets **原样迁出**（零逻辑改动，仅加 export）：
 *    · ImageItem —— 左栏一行 / 翻页序列一项的数据结构（双集合设计：items 纯图片、rows 含目录行）
 *    · GalleryDataSource —— LazyForEach 的按需数据源（真正按需创建节点，图片多不崩）
 *  迁出原因：components/SidebarView.ets 需要这两个类型，若留在 pages/Index.ets 会形成
 *  页面 ↔ 组件 的循环 import；放 model/ 层后依赖方向保持单向（pages/components → model → common）。
 */

/** 左侧档案列表中的一项。
 *  对齐 Win64 的双集合设计：`items` 是纯图片翻页序列，`rows` 是左栏显示行
 *  （可能多出「..」、子文件夹、不支持预览的文件），靠 itemIndex 单向挂钩。 */
export interface ImageItem {
  uri: string;   // 文件 / 图库 URI（可直接喂给 Image 组件）
  name: string;  // 显示文件名（已做乱码修复，仅显示用）
  size: number;  // 字节数（未知为 -1）
  mtime?: number;      // 修改时间（ms），左栏「日期」列用
  kind?: number;       // 0=图片 1=上级「..」 2=子文件夹 3=不支持预览的文件 4=可预览文本/源码
  itemIndex?: number;  // 图片行对应 items 的下标；非图片行 = -1
}

/** LazyForEach 要求的数据源：只有实现了它，列表才会**真正按需**创建节点。
 *  ForEach 会为数组中每一项都创建组件，几百张图就是几百个 ListItem —— 这是
 *  图片一多就崩的另一半原因。 */
export class GalleryDataSource implements IDataSource {
  private items: ImageItem[] = [];
  private listeners: DataChangeListener[] = [];

  totalCount(): number {
    return this.items.length;
  }

  getData(index: number): ImageItem {
    return this.items[index];
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

  reload(list: ImageItem[]): void {
    this.items = list;
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i].onDataReloaded();
    }
  }
}
