/**
 * components/SideToolButton.ets —— 第七十八轮：左侧档案栏上方三个工具按钮的「纯图案」专用组件
 *
 *  用户要求（R78）：档案栏上方三个按钮统一改为**仅显示清晰的图案标识，不显示任何文字标签**，
 *  同时保留各按钮原有功能、点击区域大小与位置，并确保「按下 / 未按下」状态反馈清晰可辨。
 *
 *  为什么另起一个组件、不改 ToolButton：
 *   · ToolButton.ets 是左栏（旧）、顶栏「全屏」、Ctrl+D 诊断层「内容量 TTL」共用的组件；
 *     项目静态契约明确锁定它「三参签名 + 无条件恒定外观、恒亮恒可点、永不 grey out」。
 *     改它会把顶栏 / 诊断层一起带偏，超出「范围限定为左侧档案栏」的边界。
 *   · 故 R78 新增本组件**只供左栏三个按钮使用**，ToolButton.ets 逐字不动，
 *     顶栏 / 诊断层的全部外观与行为零回归。
 *
 *  点击区域与位置逐字沿用原 ToolButton：
 *   type(Normal) / height(30) / padding({left:10,right:10}) / margin(3) /
 *   layoutWeight(flex ? 1 : 0) / borderRadius(6) / fontColor / backgroundColor 常态色，
 *  仅把 label 文本换成图案符号、把 fontSize 12→16 让图案更清晰（不改变任何几何尺寸）。
 *
 *  状态反馈（两态，均为纯显示层，绝不改 onAction / 不禁用 / 不 grey out）：
 *   · down（瞬时「按下」）：onMouse 的 Press 置位、其余事件复位 → 高亮底 + 高亮字；
 *     松开即回常态。onMouse 是本项目 R72/R73 真机验证过的事件通道，零系统手势依赖。
 *   · active（持续「激活」）：由调用方按业务状态下传（排序方向）→ 同款高亮底，
 *     让「升序 / 降序」在只剩图案时仍一眼可辨。
 *  常态（未按下）：与旧 ToolButton 完全同色 #2a2f3a / #e8ecf4，视觉零跳变。
 *
 *  三个图案（纯文字符号，不新增任何图片资源）：
 *   排序      → '↑' / '↓'（随 sortAsc 切换，方向本身即状态）
 *   往上层    → '←'（左向箭头 = 退回上一层；R105 起由 '⇧' 换成它，与 ↑ / ↓ 同一套箭头语言）
 *   选择文件夹 → '▣'（清晰几何 / 文件夹格）
 */
@Component
export struct SideToolButton {
  /** 仅图案符号，绝不接受任何文字标签。 */
  @Prop glyph: string = '';
  @Prop act: string = '';
  @Prop flex: boolean = false;
  /** 持续激活态（如排序降序）；false = 常态。 */
  @Prop active: boolean = false;
  /** 瞬时按下态：Press 置位、其余鼠标事件复位。 */
  @State down: boolean = false;
  onAction: (act: string) => void = (act: string): void => {
  };

  build() {
    Button(this.glyph)
      .type(ButtonType.Normal)
      .fontSize(16)
      .fontColor(this.down || this.active ? '#ffffff' : '#e8ecf4')
      .backgroundColor(this.down || this.active ? '#40507a' : '#2a2f3a')
      .borderRadius(6)
      .height(30)
      .padding({ left: 10, right: 10 })
      .margin(3)
      .layoutWeight(this.flex ? 1 : 0)
      .onMouse((event: MouseEvent) => {
        this.down = event.action === MouseAction.Press;
      })
      .onClick(() => this.onAction(this.act))
  }
}
