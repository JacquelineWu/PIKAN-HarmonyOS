import UIAbility from '@ohos.app.ability.UIAbility';
import hilog from '@ohos.hilog';
import window from '@ohos.window';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import Want from '@ohos.app.ability.Want';

const TAG = 'ImageViewer';
const DOMAIN = 0x0000;

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onCreate');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onWindowStageCreate');

    // 把主窗口缓存到 AppStorage，供页面在「全屏」时隐藏系统状态栏 / 导航栏使用。
    // 页面侧拿不到 windowStage，只能这样传递（EntryAbility 是唯一持有它的地方）。
    this.cacheMainWindow(windowStage);

    windowStage.loadContent('pages/Index', (err, data) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load content: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, TAG, '%{public}s', 'Succeeded in loading content');

      // 注意：Window.setWindowBackgroundColor 对 tablet / 2in1 形态不可用，
      // 而本工程 module.json5 的 deviceTypes 正是 tablet / 2in1，故不再调用（调用会产生 ArkTS 告警）。
      // 窗口底色交给 UI 自身背景色控制（Index.ets 根 Column 已设为 #101216）。
    });
  }

  /** 缓存主窗口。失败只记日志 —— 页面侧会静默降级为「只隐藏应用内 UI」，功能不受影响。 */
  private async cacheMainWindow(windowStage: window.WindowStage): Promise<void> {
    try {
      const win: window.Window = await windowStage.getMainWindow();
      AppStorage.setOrCreate('mainWindow', win);
      hilog.info(DOMAIN, TAG, '%{public}s', 'main window cached');
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'cacheMainWindow failed: %{public}s', JSON.stringify(e));
    }
  }

  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onBackground');
  }
}
