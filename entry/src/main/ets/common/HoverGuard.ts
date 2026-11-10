/** 悬停缩略图浮层的全局协调器（纯逻辑，不依赖 ArkUI，可独立回归测试）。
 *
 *  背景：左栏每一行各自用 bindPopup 显示缩略图。鼠标快速跨行时，旧行还在走
 *  120ms 延迟收起、新行已经弹出，两个浮层会短暂重叠；而 LazyForEach 会复用行
 *  组件，旧行那条「延迟收起」回调还可能误关后来打开的新行 —— 表现就是不停闪。
 *
 *  这里只保证一件事：**同一时刻只有一行持有浮层**。新行 take() 时同步收起旧行
 *  （不等延迟），旧行的 release() 仅在自己仍是持有者时才生效，绝不误伤后来者。
 *
 *  另外记录 hoverSupported：部分 2in1 设备不派发 onHover、只派发 onMouse。
 *  为 false 时行内允许 onMouse(Move) 兜底打开浮层；一旦任意行收到过 onHover，
 *  就关掉兜底 —— 否则「收起 → Move 又打开」会自激成无限闪烁。 */
export class HoverGuard {
  private static inst: HoverGuard = new HoverGuard();

  static shared(): HoverGuard {
    return HoverGuard.inst;
  }

  private active: string = '';
  // 恒可调用：避开 ArkTS 对「函数类型 | undefined」联合的限制，也省掉空值判断
  private activeClose: () => void = () => {};

  /** onHover 通道是否可用（任意行收到过一次 onHover 即为 true）。 */
  hoverSupported: boolean = false;

  noteHover(): void {
    this.hoverSupported = true;
  }

  /** 某行准备显示浮层：先同步收起上一行，再登记自己的「立即收起」回调。
   *  同一行重复 take 不触发任何收起动作（鼠标跨过行内子元素时的抖动）。 */
  take(key: string, close: () => void): void {
    if (this.active.length > 0 && this.active !== key) {
      const prev: () => void = this.activeClose;
      // 先清空再回调：旧行的 release() 不会把即将登记的新持有者清掉
      this.active = '';
      this.activeClose = () => {};
      prev();
    }
    this.active = key;
    this.activeClose = close;
  }

  /** 某行收起浮层：只有它仍是当前持有者才清空，避免误关后来打开的那一行。 */
  release(key: string): void {
    if (this.active === key) {
      this.active = '';
      this.activeClose = () => {};
    }
  }

  isActive(key: string): boolean {
    return this.active === key;
  }
}
