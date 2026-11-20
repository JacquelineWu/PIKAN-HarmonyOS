/**
 * components/ToolButton.ets —— 工具按钮共享组件（R40：Index.ets 拆分 Phase 3 迁出）
 *
 *  原 pages/Index.ets 的 @Builder toolBtn，左栏（SidebarView）与顶栏（topBar）共用；
 *  外观与行为一字未动，仅从「结构体方法」改为「共享组件 + onAction 回调」。
 *
 *  三个工具按钮共用的外观 —— **恒亮、恒可点，永不 grey out / 永不禁用**。
 *
 *  2026-11-11 用户澄清：上一版把「按钮 grey out」的反馈理解反了，那是**抱怨**按钮被灰掉、
 *  要求修正，不是要禁用。所以这里回到无条件外观：
 *   · 无 .enabled()、无 .opacity() 条件、无条件 fontColor / backgroundColor；
 *   · 只收 label / act / flex 三参，不接受任何「是否可用」入参，从类型上杜绝再次被禁用；
 *   · 到卷根 / 图片列表态 / 启动恢复态点击都照常进 doAction('up') → browseUp()，
 *     由 upNavStateOf 给准确提示，不移动目录。诊断信息完整保留。 */
@Component
export struct ToolButton {
  @Prop label: string = '';
  @Prop act: string = '';
  @Prop flex: boolean = false;
  onAction: (act: string) => void = (act: string): void => {
  };

  build() {
    Button(this.label)
      .type(ButtonType.Normal)
      .fontSize(12)
      .fontColor('#e8ecf4')
      .backgroundColor('#2a2f3a')
      .borderRadius(6)
      .height(30)
      .padding({ left: 10, right: 10 })
      .margin(3)
      .layoutWeight(this.flex ? 1 : 0)
      .onClick(() => this.onAction(this.act))
  }
}
