# PIKAN · 鸿蒙 PC 原生看图软件（ACDSee 风格）

> **开源许可：[MIT](./LICENSE)** · Copyright (c) 2026 JacquelineWu (flyercat)

基于 **HarmonyOS SDK（ArkTS + ArkUI）** 开发的 PC 端看图软件，界面布局仿 ACDSee：

- **左侧**：文件浏览器（档案名 / 字节 / 日期三栏，含 `..` 与子目录），**不常驻缩略图**，鼠标悬停整行才浮出小图；可滚动、点击切换
- **右侧**：大图预览区（**中灰 `#5F5F5F`** 底色，GPU 合成渲染），左上角信息浮层；右下角角标**只显示两项**：
  **缓存数量**（`缓存 N 张`）与**缩放百分比**（100% = 原图像素 1:1）；估算占用 / 上限 / 目录诊断串一律不画
  （11-11 起，见「预览右下角角标精简」章节）

> 2026-11-07 已按 [`PIKAN-Win64`](https://gitee.com/flyercat/PIKAN-Win64) 11-04 版全量对齐，
> 分 5 批用 DevEco CLI 编译验证；详见下文「完全对齐 PIKAN-Win64 11-04 版」。

**目标 SDK**：HarmonyOS —— `compileSdkVersion` / `compatibleSdkVersion` / `targetSdkVersion` = **`"26.0.0"`**，
`runtimeOS` = **HarmonyOS**。纯 ArkTS 工程，无 native 代码。

> ⚠️ **API 26 起这三个字段必须是字符串**（统一格式 `"26.0.0"`），**写数字 `26` 会报错
> `Invalid value of compileSdkVersion...`（官方错误码 00306042）**。
> 作为对照：API 10–25 时，HarmonyOS 用字符串（如 `"5.0.0(12)"`）、OpenHarmony 才用数值（如 `12`）。
> 本工程早期用数值 `18` 是因为当时 `runtimeOS` 是 `OpenHarmony`，切到 API 26 后必须改成字符串。

## 功能

| 能力 | 说明 |
|---|---|
| 格式 | HEIC / HEIF / JPG / JPEG / PNG / WEBP / BMP / GIF，走鸿蒙系统解码器 |
| 挑图入口 | 仅 `选择文件夹`（`DocumentSelectMode.FOLDER`）；**`打开图库`（v1.0.6）、`选择图片` 与 `回到上次`（11-10）三个按钮均已取消**，界面上不再出现（见「按钮区精简」章节） |
| 目录浏览 | 左栏 `选择文件夹`（`DocumentSelectMode.FOLDER`）；`..` / `往上层` / `退格` 按**目录层级**进入直接父目录（**不按浏览历史回退**，连续点击逐级到卷 / 硬盘逻辑最上层后停止）；左栏抬头正确显示**中文 / 多级 / `%XX` 编码 / 文档 URI / 带尾斜杠**的目录名（见 11-10 修复章节）；目录变了约 1.5s 自检、900ms 去抖重扫且**当前张不闪** |
| 左栏 | 抬头下 `排序 ↑ / ↓`、`往上层`、`选择文件夹` **同一行等宽排列**（`往上层` **恒亮恒可点，永不 grey out / 永不禁用**）；文件浏览器三栏（档案名 / 字节 / 日期），**列宽按最长档案名自适应**（短名收窄、长名放宽，不截断也不留白）、行高紧凑；**自然序**排序（`IMG_2` 在 `IMG_10` 前）；隐藏 `.` 开头文件；**乱码文件名**（GB18030 / GBK / Big5 / Shift-JIS / UTF-8 双重误编码）自动还原，只影响显示、不改名 |
| 悬停缩略图 | **左栏默认不显示任何缩略图**；鼠标停在**整行任意位置**才在右侧浮出 220 DIP 小图；自己的 384px 档 / 24 张 LRU / 同时只解一个；目录行与灰行不弹；点击、滚动、离屏立即收起 |
| 滚轮翻页 | 鼠标滚轮 **上一张 / 下一张**；**Ctrl + 滚轮** = 缩放（互不冲突） |
| 鼠标键 | 预览区 **左键放大 ×1.5**（以光标为锚点）、**右键还原**（回适应窗口并归位）、**双击切换全屏**（撤销第一下单击的放大）；双击档案名同样切换全屏 |
| 缩放 | 滚轮(Ctrl) / 双指捏合 / 键盘 `↑` `↓` / 左键放大 ×1.5；右下角角标 **100% = 原图像素 1:1**（ACDSee / Photoshop 口径，适应窗口通常 13%~30%）。**11-10 起取消 `＋` `－` 按钮** |
| 平移 / 旋转 / 镜像 | 拖拽画布 / `R` 右旋、`Shift+R` 左旋 / `Shift+H` 水平、`Shift+V` 垂直（可叠加）。**11-10 起取消 `左旋` `右旋` `镜像H` `镜像V` 按钮** |
| 复位 / 1:1 | 右键画布 / 键盘 `0` 复位适应；`F` 切 1:1。**11-10 起取消 `适应` `1:1` 按钮** |
| 竖图对开 | 当前与下一张**同为竖图**时左右并排；**点到 / 翻到哪张哪张就在左边**，翻页步长恒一格；横图 / 落单张仍单页；信息浮层列出两个文件名 |
| 幻灯片 | `幻灯片` 按钮 / 空格键，默认 3 秒切换 |
| 键盘翻页 / 往上层 | `←` `→` 上一张/下一张；`退格` 按目录层级往上层（与按钮同一入口） |
| 收起左栏 | `Ctrl+B` 或点左栏与预览区**分隔条正中的 « 按钮**；收起后只留档案名一列，抬头与三个导航按钮仍在；再点 » 展回 |
| 顶栏自动隐藏 | **真全屏下不再显示任何工具顶栏**（`SHOW_FULLSCREEN_CHROME = false`）；需要恢复旧的「贴顶浮出 / 停手 2s 收起」把开关改 `true` |
| 关闭应用 | **`Esc`**（非全屏时；全屏下 `Esc` 先退全屏，再按一次才关闭） |
| 性能 | `LazyForEach` + `cachedCount(6)` 只建屏上几行；**缩略图只在悬停时解码**（滚动列表时一张都不解）；体积补测分批让出主线程，且**翻页 / 换目录 / 幻灯片期间一律让路** |
| 后台预载 | 自动预解码当前位置**前后各 100 张**（按画布尺寸取 1024–1536px 档位，直接可显示），窗口随位置滑动，**翻页不等解码**；`216 张 / 1GB` 双重上限，预算装不下整窗时「尽量」填充并收工（防死循环）；状态栏显示 `预载 N 张`、右下角角标显示 `缓存 N 张`（11-11 起均不再显示 MB 占用） |
| 切图过渡 | 命中预载 **瞬时上屏、无动画**；未命中才先用 768px 低清占位，清晰图到达后瞬时替换 |
| 位置记忆 | **退出 / 切后台同步记住**「上次停在第几张 + 那张相片 + 列表快照」；**重开 APP 自动显示上次那张图**并尽量恢复整批列表 + 精确落位（首帧后延迟执行，绝不重扫图库 / 弹权限 / 弹选择器，见 11-11 章节）；`restoreIndex` 按 uri 精确落回上次那张 |
| 全屏 | 顶栏 `全屏` / **F11** / **双击画布** / **双击档案名** 进入；`Esc` / `F11` / **双击画布** 退出；**真全屏**：系统标题栏与 dock（任务栏）都不显示，应用内顶栏 / 工具条 / 按钮也全部不画，画面只剩图片与左上角信息浮层 |
| 色彩 / HDR / EXIF | 解码时按 EXIF Orientation 自动摆正（含 4 种镜像）；识别内嵌 ICC 映射到的标准色彩空间（sRGB / Display P3 / BT.2020…）并显示；HDR 图按 HDR 解码 + 显示端 HIGH 动态范围，平台不支持时自动降 SDR。**平台边界**：HarmonyOS 26 没有「从 ICC profile 字节流构造色彩空间」API，详见专章 |

> **HEIC 说明**：HEIC 解码依赖设备系统的图片 codec。在已支持 HEIC 的 HarmonyOS 设备上可直接预览；若某设备系统 codec 未启用 HEIC，对应图片会走 `onError` 提示，不影响其他格式。

## 在 DevEco Studio 打开并编译

1. 用 **DevEco Studio（支持 HarmonyOS 6 / API 26 的版本，如 DevEco Studio 6.x）** 打开本目录（`PIKAN-HarmonyOS`）作为工程。
   系统已安装 DevEco Studio 且**自带 API 26 SDK**，直接打开即可，无需再下载。

   > **本工程有意不带 `local.properties`**。该文件是机器生成的产物（通常应放进 `.gitignore`），
   > 原先它指向本机 `~/tools/ohos-sdk/default`——那个 SDK **只有 API 18**，
   > 留着会让 DevEco 误以为缺 API 26。删掉后 DevEco 会在首次打开时**自动写入指向自身 SDK** 的路径。
2. 等待 Gradle/hvigor 同步完成（首次打开会自动 `ohpm install` 与索引）。
3. 首次运行/构建前，在 **File → Project Structure → Signing Configs** 勾选
   **Automatically generate signature**（DevEco Studio 会自动生成 debug 签名材料），
   或按华为 AGC 流程配置正式签名。本工程 `build-profile.json5` 的 `signingConfigs` 已留空，
   由 IDE 自动补全，**无需手填证书路径**。
   本机 `~/.ohos/config/` 下已有 DevEco 为其它工程生成过的自动签名材料（`material/` + `.cer/.p12/.p7b`），
   说明该机自动签名链路是通的，勾选后即可直接生效。
4. 点击 **Run ▶**（或 **Build → Build Hap(s)/APP(s)**）即可编译出 HAP。

> 本工程为纯 ArkTS 工程，不含 native 代码，编译即用，无需额外工具链配置。

## 命令行编译（不打开 DevEco Studio 也能构建）

本机装了鸿蒙命令行工具 `hmos-clt`，工程根目录的 **`build.sh`** 直接调它：

```sh
./build.sh            # 等价于 assembleHap --mode module -p product=default
```

工具位置与关键点（写在 `build.sh` 注释里了）：

| 项 | 路径 / 值 |
|---|---|
| 命令行工具根目录 | `/data/service/hnp/hmos-clt.org/hmos-clt_1.0.0` |
| Node（必须用自带的） | `<clt>/node/bin` → `NODE_HOME` |
| ohpm | `<clt>/ohpm/bin` |
| hvigor 启动脚本 | `<clt>/hvigor/bin/hvigorw` |
| SDK | `<clt>/sdk/default`（ets `apiVersion 26`）→ **必须**导出成 `DEVECO_SDK_HOME` |
| 产物 | `entry/build/default/outputs/default/entry-default-signed.hap` |

> ⚠️ **不导出 `DEVECO_SDK_HOME` 会直接失败**：
> `ERROR: 00303217 Configuration Error: Invalid value of 'DEVECO_SDK_HOME'`。
> DevEco Studio 是在自己的进程环境里注入该变量的，命令行跑就必须手动给。
>
> 另外：本工程**没有 `local.properties`**（有意不带，见上节），命令行编译同样不需要它。

当前基线（2026-10-17）：`BUILD SUCCESSFUL`，**0 ERROR / 7 WARN** ——
WARN 分别是 `preferences` 调用需处理异常（5 条）、`getAssets` 需受限权限（预期保留）、
`setWindowSystemBarEnable` 的 2in1 兼容性告警（SDK 原文是「非全屏 / 非最大化窗口态不生效」；2in1 上明确不生效的是 `setWindowSystemBarProperties`，均已用 try/catch 兜底，见全屏章节）。

## 工程结构

```
PIKAN-HarmonyOS/
├── AppScope/
│   ├── app.json5                          bundleName: com.workbuddy.heicviewer（保持未改，见下方说明）
│   └── resources/base/element/string.json
├── entry/
│   ├── build-profile.json5                stageMode，无 native 配置
│   ├── hvigorfile.ts
│   ├── oh-package.json5
│   └── src/main/
│       ├── module.json5                   deviceTypes: tablet / 2in1
│       ├── ets/
│       │   ├── common/DirName.ts          文件名 / 目录名纯函数（不依赖 SDK，可被 Node 直接测）
│       │   ├── entryability/EntryAbility.ets
│       │   └── pages/Index.ets            全部 UI 与交互逻辑（ACDSee 布局 + 滚轮翻页）
│       └── resources/
│           ├── base/element/              string.json / color.json
│           ├── base/media/app_icon.png
│           └── base/profile/main_pages.json
├── tests/dirname.test.mjs                 目录名显示回归测试（29 例，直接 import 源码）
├── hvigor/hvigor-config.json5
├── build-profile.json5                    工程级：signingConfigs 留空（IDE 自动补全）
├── hvigorfile.ts
└── oh-package.json5

（不含 local.properties：由 DevEco 首次打开时自动生成）
```

## 实现要点

### 布局（ACDSee 风格）
顶栏（标题 + 当前文件名 + 打开按钮 + 幻灯片）／左侧档案列表（固定 280vp 宽）／右侧预览（占满剩余空间）／底栏状态栏。
> **11-10 起（v1.0.7）左下角视图控制条已按用户要求整体取消**：
> 原先 4 行 × 2 列共 8 个纯文字按钮（`适应` / `1:1` / `－` / `＋` / `左旋` / `右旋` / `镜像H` / `镜像V`）
> 连同 `doAction()` 里对应的 8 个分支一起移除，左栏列表多出约 160vp 高度。
> 这些能力**没有删除**，仍由键盘与鼠标提供：Ctrl + 滚轮缩放、`↑` / `↓` 缩放、
> `R` / `Shift+R` 旋转、`Shift+H` / `Shift+V` 镜像、右键画布或 `0` 复位、`F` 切 1:1。
> 左栏抬头下的 `排序 ↑/↓`、`往上层`、`选择文件夹` 与分隔条 « / » **均保留**。
> 原 8 个按钮的 act 名为 `fit / one / zout / zin / rotl / rotr / fliph / flipv`（供恢复时对照）。

### 全屏（真全屏，2026-11-11 重写）

用户要求「真正全屏，不会有标题列，隐藏 windows 的 taskbar」。分两层：

| 层 | 做什么 |
|---|---|
| 应用内 | 顶栏 / 左栏 / 状态栏不进布局；全屏时**连唤出式工具顶栏与右上角「退出全屏」按钮也不画**（`SHOW_FULLSCREEN_CHROME = false`），画面只剩图片与左上角信息浮层 |
| 窗口级 | 隐藏系统标题栏、dock（PC 任务栏）、状态栏、导航栏、导航指示条 |

窗口级核心是**带参数的 `maximize`**（SDK 26 `@ohos.window.d.ts` L3025，since 14）：

```ts
await win.maximize(window.MaximizePresentation.ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER);
win.setImmersiveModeEnabledState(true);
await win.setWindowLayoutFullScreen(true);
await win.setWindowSystemBarEnable([]);                    // status / navigation
await win.setSpecificSystemBarEnabled('status', false);
await win.setSpecificSystemBarEnabled('navigation', false);
await win.setSpecificSystemBarEnabled('navigationIndicator', false);
```

无参 `maximize()` = `FOLLOW_APP_IMMERSIVE_SETTING`，鼠标一碰热区标题栏 / dock 就回来，
不是真全屏；`ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER` 才明确「热区悬停也不显示
title bar / dock bar」。**即使窗口已经是最大化态也要再调一次**，否则沉浸形态没被设置上。
退出时按反序恢复，只在本次确实从浮动窗口 `maximize()` 过时才 `recover()`。

三个容易漏的点：

1. **每步独立 try/catch**：某步在该机型不支持时只记日志，不把后续步骤全带走；
   窗口实例还没被 `EntryAbility.getMainWindow()` 缓存好时短延时重试（2 次 × 120ms）。
2. **退出出口**：全屏没有任何按钮，靠 `Esc` / `F11` / 双击画布；左上角信息浮层写一行
   `全屏 · Esc / F11 / 双击退出`。`aboutToDisappear` 兜底把标题栏 / dock / 系统栏全部还回去。
3. **改回旧行为**：把 `SHOW_FULLSCREEN_CHROME` 改成 `true` 即可恢复「鼠标贴顶唤出工具顶栏 +
   右上角退出按钮」，代码都在，不用重写。

> 旧文档「取消双击全屏、双击回到复位视图」「主视图按画布长边 ×2 解码」两处与代码不符，
> 已按实现校正：双击画布仍是切全屏，主视图普通态 ×1.5 / 全屏 ×2.0，夹在 `[1200, 4096]`。

### 关闭应用：Esc

`Esc` 是**两级**的：全屏时先退全屏，非全屏时才真正退出应用 ——
否则在全屏下按一次 Esc 就整个退出，等于把「退全屏」这条路堵死了。

退出走 `UIAbilityContext.terminateSelf()`：

- `getUIContext().getHostContext()` 返回的是基类 `common.Context`，**需要先转成 `common.UIAbilityContext`**
  才有 `terminateSelf()`；
- 退出前**必须 `await flushPos()`** 再退出：落盘是异步文件 I/O，不等就 `terminateSelf()`
  会因为进程先结束而丢掉最后一次位置（位置记忆是防抖 500ms 写的，此时多半还在防抖窗口里）；
- **11-11 补强**：`Esc` 不是唯一退出路径。切后台 / 锁屏 / 被系统回收走 `onPageHide()`，
  那里用 `putSync` + `flushSync` **同步**写 6 个小 key（`flushPosSync()`），进程被杀也来得及；
  `aboutToDisappear()` 再兜一次。详见「退出记住位置 / 重开自动显示」章节；
- `terminateSelf()` 返回 Promise 且可能失败，失败只记日志，不弹任何提示。

### 变换分层
ArkUI 同一组件叠加 `rotate`/`scale`/`translate` 时合成顺序不直观，本工程拆两层：
- **外层 Column**（尺寸 = 画布）：`translate`（拖拽）+ `rotate`（旋转）
- **内层 Image**（尺寸 = 旋转自适应框）：`scale`（缩放 + 镜像，镜像通过 `scale.x/y` 取负实现）

旋转 90°/270° 时 `frameW/frameH` 自动交换画布宽高，保证旋转后仍完整落在画布内。

### 后台预载：前后各 100 张的滑动窗口（2026-11-11 扩容）

与 ACDSee 的「先出缩略预览再 sharpen」同一思路，但对齐 Win64 11-04 版之后
**预载本身就是「可直接显示」的清晰度**，命中即上屏、不再补解码：

1. **预载**：后台把当前位置**前 100 / 后 100** 张解码成 `PixelMap` 存入缓存（窗口共 201 张）。
   之所以也要预载后方：只预载前方的话，快速往回滚会一张都命中不了缓存，退化成全靠原图解码。
   前后**交替、先近后远**补齐（`preloadOrder()`），预算不足时两个方向都留有覆盖。
2. **滑动**：位置一变就 `evictOutside()` 主动释放窗口外的图 —— 缓存跟着位置走，
   翻过几千张内存也稳定在窗口大小，不会越攒越多；首尾边界按环绕处理（10-28 四项优化 ④）。
   窗口翻倍后改用一次建好的 `windowUris(): Set<string>` 查表，避免 O(缓存数 × 窗口数) 比较。
3. **显示**：切到某张时若缓存命中，直接 `showDecoded()` 上主视图（**无动画**）；
   只有 `showNeed()` 判定档位不够（多半是放大了）才补一张全清。
4. **调度**：一张一张解码，每张之间 `setTimeout(..., 0)` 让出主线程，不卡 UI；
   切换图片时自增任务代号 `preloadSeq`，旧链自动跟到最新位置，不会并发多条链。
5. **尽量**：201 张常装不进设备内存，触到 `216 张 / 1GB` 预算就收工（`preloadSaturated()`），
   不强行保证整窗驻留；下次切图腾出预算后自动再补。详见「尽量缓存前后 100 张图」章节。
6. **可观测**：右下角角标 `缓存 N 张` + 缩放百分比，状态栏 `预载 N 张`。
   **11-11 起界面不再显示估算内存占用 / 张数上限 / 字节上限**（预算常量 `216 张 / 1GB` 仍是真实约束，
   只是不画在屏幕上；需要看 MB 时把 `fmtBytes(this.cacheBytes)` 接回角标即可）。
   账本本身（`previews` / `preloadBytes`）刻意不是 `@State`（预载每解一张动一次，会让整棵树反复重建），
   只在「入缓存 / 淘汰 / 清空」三个口子上同步一次给 UI（见 `syncCacheStat()`）。

**分辨率必须留够**：预载档位由 `preloadEdge()` 按画布长边 × 1.15 **向上**量化到 256 倍数，
夹在 `[1024, 1536]`（详见「移植自 Win64 版的四项优化」）。早先固定 768px 的方针已经废弃 ——
档位小于屏幕实际要显示的像素时，每张命中缓存的图都还得再解一次全清，那正是切图卡顿的真因。

> 容量 `PRELOAD_COUNT = 216` 必须**大于**窗口 201：容量恰好等于窗口的话，
> 每入一张就淘汰一张、又被预载链加回来，会来回抖动白耗 CPU。
> 方图库（1536×1536，单张约 9.4MB）201 张要 ~1.9GB，会被 `PRELOAD_MAX_BYTES = 1GB` 挤出 ——
> 鸿蒙设备内存普遍小于 PC，角标显示的 `N` 明显小于 201 就是被挤了，属**预期行为**；
> 想全驻留可上调字节上限，或把 `PRELOAD_MAX_EDGE` 调到 1280（单张约 4.4MB，1GB 反而装得下整窗）。
> 与主视图（最大 `VIEW_EDGE_MAX = 4096`，约 67MB）相加，才是一台机器上的常驻总开销。

### 切图过渡：动态模糊 → 对焦 → 清晰

> ⚠️ **2026-11-07 起默认 `FOCUS_BLUR = false`**：命中预载一律**瞬时上屏、无动画**
> （对齐 Win64 11-04 版），未命中才先用 768px 低清占位、清晰图到达后瞬时替换。
> 本节描述的是把 `FOCUS_BLUR` 改回 `true` 时的老过渡效果，代码与开关都还在。

用户要的「跳转中间过渡用动态模糊」。关键结构是**两层**，而不是对一张图反复调模糊：

```
底层 = 清晰图（自解码 PixelMap，不带任何模糊）        ← 最终画面一定锐利
上层 = 低清预览（768px）+ .blur(radius) + .opacity()  ← 只存在过渡这 ~200ms
```

「模糊 → 清晰」是**两层交叉**出来的：上层由 `blur=14 / opacity=1` 收敛到 `0 / 0`，
下层的清晰图就自然露出来。若改成「对清晰图做模糊再撤销」，每帧都要重算大图模糊，
代价极高（一张 4096px 图的 blur 是几十毫秒级），而且最终画面必须恰好落在 blur=0，风险大。

时间线：

| 阶段 | 触发 | 时长 | 行为 |
|---|---|---|---|
| 起手 | `showPreviewOf()` 命中预载缓存 | — | 低清层 `blur=BLUR_MAX(14)`、`opacity=1`，另有 +2% 的「推近」 |
| 对焦 | 起手后每 22ms 一档，共 4 档 | **约 88ms** | `blur` 逐档降到 ~1/4，观感是「镜头在对焦」 |
| 收尾 | 清晰图解码完成（`loadView`） | **约 88ms** | `opacity` 分 4 档 × 22ms 淡出，`blur` 同步归零，结束即撤层 |

> **刻意不用 `animateTo`**：ArkUI 的 `animateTo` 一旦启动无法取消，而滚轮连翻时
> 上一张的淡出（约 88ms）往往还没跑完就切了下一张（`WHEEL_STEP_MS = 120ms`），
> 它会继续把新图的 opacity 往 0 拉，新图的过渡就没了。

> 每档间隔不要低于一帧（16.7ms）：再快也只是让几档挤进同一帧，观感不会更顺滑，
> 反而白白多几次重绘。要再快就**减档数**（如 4 → 2），而不是无脑缩间隔。
> 因此对焦与淡出都走**「分档 + 代号 `focusSeq`」**：切图时 `focusSeq++` 立即作废旧链，
> 状态完全可控 —— 与抗串图用的 `curToken` 是同一套思路。

配套取舍：

- 模糊只加在 **768px 的低清层**上，GPU 开销极小；清晰图始终不带模糊。
- LRU 淘汰时要**同时跳过正在被过渡层使用的那张**（`old.px === this.lowPixelMap`），
  否则 `release()` 掉正在显示的东西会花屏。
- `clearPreviews()`（换源 / 退出）必须先 `clearBlur()` 再释放缓存，理由同上。
- 过渡层的 `scale` 与底层完全一致（外加 `focusZoom()` 的 ±2%），否则缩放/镜像时会错位；
  该系数在对焦完成时恰好为 1，与底层重合。

> 可调常量：`BLUR_MAX`（起始模糊，觉得太糊就调到 8~10）、`BLUR_STEPS` / `BLUR_STEP_MS`
> （对焦档数与节奏）、`BLUR_FADE_STEPS` / `BLUR_FADE_STEP_MS`（淡出档数与节奏）、`BLUR_ZOOM`（推近幅度，0 即关闭）。

### 主视图：自己解码，不用 `Image(uri)` 换源

这是**修复「快速滚动图片移位 / 变模糊」的关键改动**。原实现用 `Image(uri)` 显示大图、
上面再盖一层低清预览，靠 `onComplete` 撤掉预览 —— 有两处竞态：

| 症状 | 根因 |
|---|---|
| 图片移位 | `Image(uri)` 换源后，新图解码完成前组件可能仍显示上一张 |
| 变模糊 | 上一张的 `onComplete` **迟到**，把撤除标志置错 → 低清预览一直盖在上面不撤 |

改为**自己解码成 `PixelMap` 再整体替换**：

- `showPreviewOf()` 先 `curToken++` 作废所有在途回调，命中缓存就先把那张低清图顶上；
- `loadView()` 按 **画布长边 × 1.5**（全屏 ×2.0，夹在 `[1200, 4096]`）解码清晰图，**回来时校验代号**才替换；
- `loadQuick()` 在没命中缓存时并行解一张低清占位，避免解码期间空屏。

显示哪张、什么时候换，完全由代号原子控制 → **不会串图、最终一定是清晰图**。
LRU 淘汰时也会跳过「正在显示的那张」，避免把它 `release()` 掉导致画面变黑。
自解码确认失败（如某些 uri 打不开）才回退到 `Image(uri)` 由系统解码兜底。

> `image.createImageSource(fd)` + `createPixelMap({ desiredSize })` 同样走系统 codec，
> 所以 HEIC 支持不受影响，而且降采样解码比全分辨率更快。

> 相关常量在 `Index.ets` 顶部：`PRELOAD_FWD` / `PRELOAD_BACK` / `PRELOAD_COUNT` /
> `PRELOAD_MAX_BYTES` / `PRELOAD_MAX_EDGE`（`PRELOAD_EDGE` 是早期已删除的旧常量）。
> 内存吃紧的机器把 `PRELOAD_MAX_BYTES` 调回 512MB，或把 `PRELOAD_MAX_EDGE` 调到 1280；
> 详见「尽量缓存前后 100 张图」章节。**不要**把预载档位降到屏幕实际像素以下。

### 大图库稳定性（几百～上万张不崩）

> ⚠️ 本节记录的是**早期**的缩略图实现（`THUMB_EDGE = 128` / 600 张 LRU / 并发 3）。
> 2026-11-09 起左栏已改成「不常驻缩略图、mouse over 才解码」，这些常量已删除；
> 这里保留原记录只为说明 OOM 成因与 `LazyForEach` 的必要性。

早期实现在图片一多时会 OOM 崩溃，四个成因逐个消掉：

| # | 成因 | 修法 |
|---|---|---|
| 1 | 列表用 `Image(item.uri)`：组件按**原图分辨率**解码，一张 4000×3000 ≈ 48MB，几十项就是几个 GB | 改成先解出**缩略图 `PixelMap`**（`THUMB_EDGE = 128`，单张约 60KB）再显示 |
| 2 | `ForEach` 会为数组中**每一项**都创建组件，几百张就是几百个 `ListItem` | 换成 **`LazyForEach` + `GalleryDataSource`**，只为「可见行 + `cachedCount`」建节点 |
| 3 | 載入时逐个 `fs.statSync` 取体积：几百次同步系统调用卡死 UI 线程直至 ANR | 体积初始 -1，后台 `fillSizes()` **分批**（60 张/批 + 让出主线程）补，列表里由 `--` 陆续变成实际值 |
| 4 | 预载（320MB）+ 主视图（67MB）+ 缩略图并发解码叠加，峰值触顶 | 预载降到 **192MB**（`PRELOAD_EDGE` 1024→768）；缩略图解码**并发限流**到 3 |

缩略图加载器 `ThumbLoader` 的关键设计：

- **限并发**：HEIC 解码较重，同时开太多会瞬间吃满内存，故并发上限 `THUMB_CONCURRENCY = 3`。
- **限队列**：快速甩动列表会堆积大量「已划走」的请求，队列上限 `THUMB_QUEUE_MAX = 240`，超了丢最旧的。
- **离屏作废**：每行自己持有 `alive` 标志，`aboutToDisappear` 置 false，队列轮到该任务时直接跳过 ——
  既不浪费解码算力，也不会在已销毁的组件上回调。
- **按行粒度刷新**：缩略图到达只重渲染**那一行**（`ArchiveRow` 自持 `@State thumb`），
  而不是刷新整个列表。
- **刻意不做整体清空**：释放正被某个列表行显示的 `PixelMap` 会花屏崩溃，改用 LRU 自然淘汰
  （淘汰的总是最久没人用的，那时对应的行早已离屏），上限仅 36MB，没必要为此冒险。

### 点「打开图库」后整台机器卡死

> ⚠️ **本节记录的两项修复曾在 2026-10-17 03:30 应要求全部回退**（回到 10-16 22:24 编译那版）。
> 回退前的文件备份：`/tmp/Index.ets.20261017-0326.bak`。
>
> **2026-10-17 03:55 重新修回第 ① 项（预载链无限重试）**：appfreeze 日志已证明真正的启动卡死
> 是 preferences 读大 value（见下文），与预载链无关，而预载链的死循环是**独立存在**的真实缺陷，
> 所以正式补回 `failed` 黑名单。其余三项（`SCAN_CAP = 5000` / `getFirstObject` 分页 /
> `PRELOAD_YIELD_MS = 40`）**仍未启用**，保持 22:24 版的 `SCAN_CAP = 20000` 与 `getAllObjects()`。

现象：点「打开图库」后 CPU 打满、界面乃至整台机器无响应。两个成因，逐个消掉。

#### ① 预载链对「解不开的图」无限重试（CPU 打满）

`preloadNext()` 每轮挑一张「还没进缓存」的图来解码，挑目标时**只排除了已缓存的**。
一旦某张图解不开（图库 uri 没有读取权限 / 文件损坏 / 云端未下载），`decodePx()` 返回 `undefined`
→ 它没进缓存 → 下一轮又被挑中 → 在定时器串起来的链上**无限重试同一批坏图**。
每一步都是「开文件 + 建 `ImageSource` + 取图像信息」，于是变成满载死循环 —— 图库 uri 多半没有
读取权限，这类列表必踩。

| # | 修法 |
|---|---|
| 1 | ✅ 已修回：用 `Set<string> failed` 记下解不开的 uri，挑目标时**同时**排除「已缓存」与「已失败」，链走到窗口末尾即停 |
| 2 | ✅ 已修回：换数据源（`applyItems`）时清空 `failed` —— 换了一批图，上一轮的结论作废 |
| 3 | ⬜ 未启用：连续失败达到 `FAIL_HINT_AT = 6` 张才提示一次状态栏 |
| 4 | ⬜ 未启用：两张之间让出 `PRELOAD_YIELD_MS = 40ms`（当前仍是 `setTimeout(…, 0)`） |

#### ② `getAllObjects()` 一次性物化整个结果集（内存吃满）

`getAssets()` 拿到的是游标，但 `getAllObjects()` 会把它**一次性展开成 `PhotoAsset` 对象数组** ——
图库几万张时能吃到 GB 级内存，这一步发生在任何业务代码之前，光靠业务侧限流救不回来。

改成 `getFirstObject()` / `getNextObject()` 一条条翻：

- 内存只跟「已取回的条数」线性增长，翻到 `SCAN_CAP = 5000` 就停；
- 每次 `await` 都是一次跨进程调用，UI 线程借机空出来渲染，界面不再整段冻住；
- 每 `SCAN_PAGE = 200` 条更新一次状态栏「已取回 N 张」，进度可见。

顺带收掉的另外两处数量级隐患（单独不至于死机，叠加起来会把机器拖到无响应）：

- 不再逐个 `a.get('size')`：几千张时等于在 UI 线程同步跑几千次跨进程调用。
  体积统一交 `fillSizes()` 补（分批 + 让出主线程），且最多只做前 `SIZE_MAX_ITEMS = 3000` 条。
- **`fillSizes()` 的列表重建节流到 400ms 一次**：批间只隔 12ms，跟着批重建会对几万条列表做几百次
  整体重建，而每次重建都会让可见行重新发起缩略图解码，等于间接放大解码量。

#### 还卡怎么办：看 HiLog 的最后一行

**当前代码就是排查版**：`打开图库` 的每一步都打了 `hilog.info`（TAG = `HeicViewer`，共 21 条），
逻辑一行未改。在 DevEco 的 **HiLog** 面板里过滤该 TAG，**最后一行是哪一步，就卡在哪一步**。

一次正常的「打开图库」日志长这样（顺序即执行顺序）：

```
openGallery: step1 scanAll
scanAll: getAssets begin
scanAll: getAssets ok
scanAll: getAllObjects begin
scanAll: getAllObjects got 1234
scanAll: setAssets begin
setAssets: 1234 assets, cap 20000
applyItems: 1234 items, start at 0
loadView: begin edge=3200
loadView: decoded ok            ← FAILED 则说明这张图解不开
fillSizes: 600 / 1234           ← 每 10 批一条
fillSizes: end at 1234 / 1234
preload: window full, stopped at tick 41   ← 窗口 41 张跑完就停，正常
```

**判断表**（看最后停在/反复出现哪一条）：

| 现象 | 结论 |
|---|---|
| 停在 `getAssets begin`（没有 `ok`） | 卡在 `getAssets()` 本身（无权限时可能阻塞） |
| 停在 `getAllObjects begin`（没有 `got N`） | 卡在一次性展开结果集 —— 图库大时内存/耗时都吃不住 |
| 停在 `setAssets begin` | 卡在逐个读 `uri` / `displayName` / `get('size')`（同步跨进程调用） |
| 停在 `step3 requestPermission`（没有 `permission code`） | 卡在系统权限弹窗（`READ_IMAGEVIDEO` 未声明时的行为） |
| `preload: tick 20 / 40 / 60 …` **一直涨**，没有 `window full` | **预载链无限重试 = 死循环**（解不开的图被反复挑中） |
| `preload: N decodes failed` / `N rejects` 持续涨 | 大量图解不开，与上一条同时出现即坐实死循环 |
| 出现 `applyItems: N items` 但 `fillSizes` 停在中间 | 卡在逐个 `statSync` 取体积 |
| `loadView: decoded FAILED` | 单张图解不开（正常显示路径会回退 `Image(uri)`），仅当大面积出现才要管 |

排查完要去掉打点时：删 `probeTick` / `probeFail` 两个字段和全部 `hilog.info` 即可，其余逻辑不受影响。

### 启动 11 秒就 APP_INPUT_BLOCK（卡在 preferences 读快照）

现象：appfreeze，`Reason: APP_INPUT_BLOCK`，`Process life time: 11s` —— **还没点任何按钮就冻住了**，
和上一节「点『打开图库』后卡死」不是一个问题。

appfreeze 日志里的关键三行：

```
Process life time:11s
Current Running: start at 03:43:54.225, task name = PreferencesGetValue   ← 12 秒没有 completeTime
No.7 / 11 / 13 / 15 / 18 / 22 : PreferencesGetValue … completeTime = 03:43:54.192~193   ← 都很快
```

主线程停在 `PreferencesGetValue` 上不动，而它前面 6 个 `get` 全是**毫秒级完成**的。数一下顺序就知道
卡的是第 7 个：5 个位置 key + `snapCount` 都读完了，卡在 **`snap_0`（快照第一块）**。

根因：快照把 **3000 条 uri 分成 15 个 key** 写进 preferences（合计约 150KB）。启动路径
`aboutToAppear → readLastPos → … → readSnapUris` 连着发起一串 `get`，读这种大 value 时
把主线程整个堵住 —— preferences 是轻量 KV，不是数据库，几百 KB 就足以让首帧起不来。

| # | 修法 |
|---|---|
| 1 | `AUTO_RESUME_ON_START = false`：启动**只读 5 个小 key**，不再做「静默重扫图库 / 读快照恢复」。恢复动作留给用户点「打开图库」或「回到上次」—— 那时 `applyItems → restoreIndex` 依然会自动落回上次那张，功能没丢，只是不在启动时抢主线程。**（11-11 历史记录）** 该常量现作为「绝不在启动重扫 / 弹权限」的**护栏**恒为 false；想要「一打开就自动显示上次那张图」用的是新开关 `AUTO_SHOW_LAST_ON_START`（见 11-11 章节），**不要**把它改回 `true` |
| 2 | `SNAP_MAX` 3000 → 600、`SNAP_CHUNK` 600：一块就装下，读回快照只需 1 次 `get` |
| 3 | `flushSnap()` 首次写盘时清掉旧格式残留（`OLD_SNAP_CHUNKS = 15`）—— 新装或清过数据前，老版本留下的十几块没人读的旧值还躺在文件里 |
| 4 | 加计时打点：`readLastPos: got pos in N ms`、`snapshot: read N uris in N ms`，下一轮直接看数字 |

**教训**：`preferences` 只能放小配置。启动路径上只允许 O(1) 次轻量读；任何「可能很大的数据」
要么别存，要么挪到用户主动触发之后。

#### 启动预热「上次成功显示的最后一张」（04:20 补）

关掉自动恢复不等于启动时什么都不做 —— 让**那一张**先解好等着，就是零风险地把首屏提速：

| 环节 | 做法 |
|---|---|
| 记录 | 新增小 key `lastOkUri`。只在**真的解出画面**时才记：`startFocus()`（低清过渡层已可见）与 `loadView()` 成功分支各调一次 `noteShown(uri)`。切过去但没解出来的不算 —— 预热一张打不开的图没意义 |
| 启动 | `readLastPos()` 里读到 `lastOkUri` 就调 `warmLast()`：推迟 `WARM_DELAY_MS = 300ms` 让开首帧，然后只解 1 张 `PRELOAD_EDGE = 768` 的图存进 `this.warm`。不重扫、不读快照 → 不可能再触发 `PreferencesGetValue` 卡死。**（11-11 注）** 这句只描述 `warmLast()` 本身；11-11 新增的「重开自动显示上次相片」排在 `RESUME_DELAY_MS = 900ms`（首帧 + 预热之后）才读快照，且 `SNAP_MAX` 已降到 600 一块装完 —— 与这里「不在启动关键路径读大快照」不矛盾，详见 11-11 章节 |
| 接上 | `applyItems()` 里 `clearPreviews()` 之后把 `warm` 塞进缓存，随后 `showPreviewOf(cur)` 直接命中 → 首屏立刻出图，不用再等一次低清解码。若它不属于这一批（换了别的来源），`schedulePreload → evictOutside` 会顺手释放 |
| 回收 | `aboutToDisappear()` 里若 `warm` 还没被接走就 `release()`，避免 PixelMap 泄漏 |

`this.warm` 独立于 `previews`：启动时 `cur = -1`、列表为空，那时放进缓存会被 `evictOutside`
判成「窗口外」立刻丢掉。

HiLog 上看：`warm: ready in N ms` → `warm: adopted on current`（命中当前张）。

## 完全对齐 PIKAN-Win64 11-04 版（2026-11-07）

参照 [`PIKAN-Win64`](https://gitee.com/flyercat/PIKAN-Win64) `origin/main = 2bcbbb1`
（11-04，`MainWindow.xaml.cs` 5735 行 / `README.md` 655 行）做全量对齐。
用户明确要求**分阶段、每阶段用 DevEco CLI 编译通过再进下一批**，且
**保留 10-17 加的顶栏挑图入口**——Win64 只有「选择文件夹」+ 拖放，没有这套入口，故不删。
（11-10 后续按用户要求取消了其中的 `打开图库`，现保留 `选择图片 / 回到上次`，见 v1.0.6 章节。）

| 批次 | 内容 | 编译 |
|---|---|---|
| A | 预载 20 → **前后各 50**（`PRELOAD_COUNT = 112` / `PRELOAD_MAX_BYTES = 512MB`）；`100% = 1:1` 缩放口径；中灰底 `#5F5F5F`；顶栏 `PIKAN 1.0.4` + 完整路径（中间省略）；状态栏缓存账目；乱码文件名修复；自然序排序；隐藏 `.` 文件；`app.json5` 版本 1.0.4 | `BUILD SUCCESSFUL in 14 s 559 ms` |
| B | 右键还原 / 双击全屏（撤销单击放大）/ `Ctrl+B` / `Shift+R,H,V` / 退格往上层；左栏改文件浏览器数据结构与三栏行；`选择文件夹` / `往上层` / `排序` 按钮；目录 `mtime` 轮询自检；竖图对开配对逻辑 | `BUILD SUCCESSFUL in 10 s 106 ms` |
| C | 对开双页显示：右页解码（`rightToken` 代号校验）、两页各占半宽、信息浮层双名、缓存淘汰保护右页；`clearPreviews()` 同步撤右页引用；右页未就绪用占位而非 `Image(uri)` | `BUILD SUCCESSFUL in 10 s 789 ms` |
| D | 全屏时顶栏自动隐藏（贴顶端浮出 / 停手 2s 收起，`Stack + position` 不占布局）；`Ctrl+B` 收起窄条 224 + 分隔条 « 按钮；体积补测在翻页 / 换目录 / 幻灯片期间让路。**注：2026-11-11 起真全屏默认不画工具顶栏，见全屏章节** | `BUILD SUCCESSFUL in 34 s 698 ms` |
| E | 悬停缩略图（独立 `ThumbLoader` 实例：384px 档 / 24 张 LRU / 并发 1）；启动自检日志 | `BUILD SUCCESSFUL in 41 s 703 ms` |

### 对开双页的两条硬约束

- **点到 / 翻到哪张，哪张就在左边**：`refreshSpread()` 以 `cur` 为左页，仅当 `cur+1` 同为竖图才并排，
  翻页步长恒一格（`go(±1)`）。竖/横判定用 `image.createImageSource(uri).getImageInfo(0)` 只读元数据，
  结果进 `probeCache`；探不到时先单页显示，后台探完再重算，不阻塞切图。
- **所有权**：右页命中预载缓存时 `rightPixelMap` 指向缓存持有的 PixelMap，`rightOwned` 保持 `undefined`，
  由 `pushPreview()` 淘汰时跳过；未命中才自解码并记入 `rightOwned`，切换时单独 `release()`。
  `clearPreviews()` 整批释放缓存后必须一并撤掉 `rightPixelMap`，否则右页会留下一块已释放的 PixelMap（花屏）。
- 所有改变 `cur` 的路径（`select` / `go` / `applyItems` / 目录重扫）都在 `showPreviewOf()` 之后紧跟
  `refreshSpread()`；而 `onAreaChange` 只是进出全屏后按新尺寸重解大图、`cur` 没变，**不重算右页**。

### 平台变形实现（鸿蒙没有等价物的部分）

| Win64 | 鸿蒙侧做法 |
|---|---|
| `FileSystemWatcher` / inotify 目录监听 | SDK 26 无 `@ohos.file.fileObserver`，退化为每 `DIR_POLL_MS = 1500` 比对目录 `mtime`，变化后 `900ms` 去抖重扫，按 uri 找回当前张（预览不闪、缩放不重置） |
| `StrCmpLogicalW` 自然序 | 自写 `naturalCompare()`，数字段按数值比较 |
| `AnsiCodec.cs`（Latin-1 / cp1252 回推，再用 GB18030 / GBK / Big5 / Shift-JIS 试解打分） | `util.TextDecoder` 支持 `gb18030 / gbk / big5 / euc-jp / utf-8`，自写 `repairMojibake()` + `readableScore()` 打分；探测保守，正常中文 / 西文名不会被改，只影响显示、不用于 IO |
| 目录枚举自带 size / mtime（网络盘一趟往返） | `fs.listFile()` 只返回 `string[]`，逐条 `fs.statSync()` 补；体积补测分批 `setTimeout` 让出主线程，且翻页 / 换目录 / 幻灯片期间让路 |
| 左栏按最长档案名 224~900 自适应 | 取固定 280 / 收起 224（够放下抬头三个按钮），换目录不伸缩 |
| 子目录容量只算可见行 / 空闲才算 | 用 `wheelActive / folderBusy / playing` 近似「空闲」，让路只是推后重试（`i` 不变，不会漏算），设 40 次上限防开着幻灯片时永远不补测 |
| 窗口标题栏显示完整路径 | SDK 26 无可用 `setWindowTitle`，放顶栏 `PIKAN 1.0.4` 右侧，`ellipsizeMiddle()` 中间省略保住末尾目录名 |
| 悬停缩略图从预载缓存取 | 独立 384px 档小缓存（24 张 LRU / 并发 1）。**2026-11-09 起鸿蒙也已取消行内常驻缩略图**，与 Win64 一致改为「mouse over 整行才解码并浮出 220 DIP 小图」，未就绪显示「读取预览…」占位 |
| 可观测 trace.log / 环境快照 / 自动安全模式 | 启动打一条常量 `hilog` 快照（版本 / 预载档位 / 对开 / 轮询间隔），**不读 preferences、不枚举磁盘** —— 早期 appfreeze 真根因正是启动路径上的 `PreferencesGetValue` |

### 明确跳过（平台专属，无移植意义）

CUDA 的 `Mitchell` 精修与 AVX2 降级、`D3DImage` 零拷贝、`WPF` 路由事件 / `BlurEffect`、
Windows Forms 发版与 SmartScreen、单文件 exe、拖放文件、命令行传参、
`PowerShell` 打包脚本、系统菜单屏蔽。鸿蒙侧由 ArkUI 渲染服务（`RenderService`）自动做纹理上传与合成，
**本工程没有写 GPU 代码，也没有 NPU / AI 推理**，状态栏只标注「ArkUI GPU 合成」。

### 验证

```
cd /storage/Users/currentUser/WorkBuddy/Project/heicviewer
/storage/Users/currentUser/tools/bin/devecocli build      # 或 ./build.sh
> hvigor BUILD SUCCESSFUL
33 tasks in total: 17 executed, 16 up-to-date
```

批次 A~E 均 **0 ERROR**；仅剩既有的 7 条 WARN（5 条 `preferences` 可能抛异常、
1 条 `ohos.permission.READ_IMAGEVIDEO` 受限权限、1 条 `setWindowSystemBarEnable` 对 2in1 不可用），
均已在代码里 try/catch 或申请权限，不影响功能。产物：
`entry/build/default/outputs/default/entry-default-signed.hap`。

## 第六轮：重启后档案日期不丢失 + 窗口大小 / 位置恢复（2026-11-12）

### 用户诉求

> 左侧档案列表继续显示每个档案的日期，不因关闭并重新打开 APP 而隐藏或丢失；
> APP 启动时恢复退出前的 windows 大小与位置，退出后再次返回 APP 时仍维持该 windows 大小与位置。
> 保持现有档案列表和 windows 交互行为不变，确保重启前后显示内容与界面状态一致。

### 根因（都不在 UI 层）

| # | 现象 | 根因 |
|---|---|---|
| ① 日期变 `--` | 左栏日期列 `Text(this.mtime > 0 ? fmtDate(this.mtime) : '--')` 的数据来自 `ImageItem.mtime`。`flushSnap()` 只把 **uri** 写进快照；重启走 `restoreFromSnapshot() → setItems(uris, src)`，构造 `ImageItem` 时没有 `mtime`（也没有 `size`） | 快照格式里没有元数据 |
| ② 补不回来 | `fillSizes()` 只补体积、**从不补 mtime**；且只读名单态（`RESTORE_READONLY`）下被 `bulkIoAllowed()` 闸门直接挡住，连体积都不补 | 运行时补测这条路本来就走不通 |
| ③ 界面状态不一致 | `@State listCollapsed` 默认 `false` 且从未落盘；用户收起过左栏，重启后变回展开 | 收起态没有持久化 |
| ④ 窗口大小位置 | 代码里**完全没有**窗口 rect 的保存 / 恢复 | 未实现 |

正常「选择文件夹」（`openFolder()`）路径下 `items` 是带 `st.mtime` 的，所以退出前日期是好的；
一重启走快照恢复就全丢 —— 这正是「关闭并重开」才出现的原因。

### 修法

**档案元数据（体积 + 日期）**

- 新增 `common/SessionState.ts`（纯函数，Node 可单测）：`metaLineOf / parseMetaLine /
  encodeMeta / decodeMeta / metaForUri`，一行 `size,mtime`，非法值一律回退 `-1,0`。
- `flushSnap()` 写 `snap_N` 的同时写 **`snapMeta_N`**（与 uri 行一一对应，独立小 key，
  不改既有 `snap_N` 格式 → 老存档照样读得出来）；清理旧块时一并删。
- `readSnapMeta()` / `readMetaForUri()` 恢复时读回；`setItems(uris, src, meta?)` 新增**可选**
  第三参，注入 `size` / `mtime`。不传则保持原有行为（体积后台补、日期原口径），交互不变。
- 两条恢复路径都覆盖：整批快照恢复传 `metas`；单张兜底用 `metaForUri()` 按 uri 找（不靠下标）。
- 这些只是 preferences 小 key，不是逐 URI 的同步磁盘 IO，**不绕过 ro1 `bulkIoAllowed` 总闸门**。

**窗口大小 / 位置**

- 官方 API（`@ohos.window`）：`getWindowProperties().windowRect`（`left/top/width/height`，px）、
  `resize(w,h)`、`moveWindowTo(x,y)`、`getWindowStatus()`；小 key `winRect = 'l,t,w,h'`。
- 保存：`saveWindowRectSync()` 用 `putSync + flushSync` **同步必达**，挂在 `onPageHide()` /
  `aboutToDisappear()`；根 `onAreaChange` 与三处收起态切换点走 `markWindowRect()` 600ms 防抖，
  拖动中被强杀也尽量不丢。
- 恢复：`readLastPos()` 读回后 `scheduleRestoreWindowRect()` 推迟 **900ms**（官方 FAQ 明确
  `aboutToAppear` 阶段窗口尚未可见、`windowRect` 可能不准；也避开启动 watchdog），
  `applySavedWindowRect()` 先 `windowRectUsable()` 校验，再 `resize` → `moveWindowTo`，
  窗口实例没就绪按 120ms × 2 重试；**只跑一次**（`winRectApplied`），之后用户怎么拖都不干预。
- 只在 **FLOATING 自由窗口**态恢复；全屏 / 最大化是既有交互，启动恢复绝不抢走。
  退出时全屏 / 非自由窗口也**不覆盖** rect 记忆（临时形态不是用户调好的窗口）。
- `listCollapsed` 随会话一起落盘；缺失 / 异常一律 `false`（默认展开，字节与日期两列照常显示）。

### 平台边界（需实机确认）

- 本机 SDK `.d.ts` 已不在可见路径，无法像前几轮那样逐条核对声明；上述 API 由华为官方
  文档 / FAQ 核对存在。若 DevEco 报 `resize` / `moveWindowTo` 只提供 callback 重载
  （`resize(w, h, callback)`），把两处 `await win.xxx(...)` 改成
  `await new Promise<void>((resolve) => win.xxx(..., () => resolve()))` 即可，逻辑不变。
- `windowRect` 只在窗口可见后准确；启动 900ms 内若窗口形态还在动画，恢复可能被系统覆盖，
  此时以系统结果为准，不会反复干预。
- 只移动窗口位置（不改大小）不会触发 `onAreaChange`，位置主要靠退出时同步保存。

### 保持既有行为不变

- `snap_N` 格式、快照恢复链、`restoreIndex`、列宽自适应、hover 浮层、全屏 / ESC / 双击、
  resize 重解全部不动；新增的都是**可选参数 + 独立小 key**。
- 版本仍 `1.0.7`；按约定未编译 HAP / 未放桌面 / 未升版本 / 未 push。

## 第五轮：拖窗口 resize 时预览图实时适配（2026-11-12）

用户实机反馈：**「现在 resize windows 还是不会自动调整预览图大小」**。
第四轮已经加了「尺寸变化 → 防抖重解码」，但真机毫无反应。逐条复核后确认这不是单点故障，
而是 **4 个缺陷叠加**，任一存在都会让 resize 看起来失效：

| # | 根因 | 为什么实机不生效 |
|---|---|---|
| A | `@Builder` 按值传宽度数值 | `previewImage(uri, token, this.frameW())` 第三个参数是**数值快照**。ArkUI 对 @Builder 普通参数不做响应式刷新：`canvasW` 变了，builder 内宽度仍停在旧值 → **图片框尺寸冻结**，这是「大小不变」的直接原因 |
| B | 判据用「相邻两帧之差」 | `shouldReloadOnResize(oldW, oldH, w, h, 8)` 的 `oldW` 是上一帧的 `canvasW`。拖窗口每帧只变 1~3vp，**永远到不了 8vp**，累积位移被每帧赋值吃掉 → 重解码一次都不触发 |
| C | 重解用防抖（debounce） | `armResizeReload()` 每次尺寸变化都 `clearTimeout` 重挂计时器；用户只要一直拖着，计时器永不到点，停手前一次都不会重解 |
| D | 只赌深层组件的 `onAreaChange` | 预览 Stack 是 `layoutWeight(1)` 嵌在 Row 里，PC 窗口 resize 时不一定收到 `onAreaChange`；而根 Stack 是 `100%×100%` 直接跟窗口、尺寸必然变化，却没被利用 |

### 修法

1. **A — 去掉 @Builder 的数值参数**：签名改为 `previewImage(uri, token, half: boolean)` /
   `rightPageImage(uri, half: boolean)`，`half` 只是静态布尔（并排两页 `true`、单页 `false`）。
   宽度在 builder **内部**调 `this.viewBoxW(half)`（`= this.frameW() * (half ? 0.5 : 1)`），
   响应式依赖直接挂在 `@State canvasW` 上，不再经过按值参数；
   `frameW()/frameH()` 的旋转 90°/270° 宽高互换语义原样保留。
2. **B — 改成累积差**：新增 `lastReloadW/H`，在 `armResizeReload()` 与
   `refreshForCanvasResize()` 里记「本次重解用的画布」，判据改为
   `shouldReloadOnResize(this.lastReloadW, this.lastReloadH, w, h, RESIZE_MIN_DELTA_PX)`。
   首帧 `0` → 纯函数返回 true，基准自然建立。
3. **C — 防抖改节流**：`armResizeReload()` 开头 `if (this.resizeReloadTimer !== -1) return;`，
   拖动中每 `RESIZE_RELOAD_THROTTLE_MS = 140ms` 按当时画布重解一次，最后一帧后由累积判据补最终尺寸。
   常量从 `RESIZE_RELOAD_DEBOUNCE_MS` 改名，避免误导。
4. **D — 根 Stack 也挂 `onAreaChange`**：新增 `ViewPlan.canvasFromRootOf(rootW, rootH, chromeW, chromeH)`。
   首帧测出固定栏偏移 `chrome = 根尺寸 - 画布尺寸`（左栏 + 顶栏 + 状态栏），
   之后任一次根尺寸变化都精确反推新画布；基准由两处回调共同维护（谁先到都行），
   `setFull()` 进出全屏时置 `-1` 重新测量（栏结构变了）。纯函数对「chrome 未就绪 /
   根尺寸非正 / 结果非正」一律返回 `{w:0,h:0}`，调用方跳过，**绝不把 0 设进 `.width()`**。
5. **尺寸读取归一化**：`Area.width/height` 是 `Length`（个别机型给 `'123vp'` 字符串），
   改用 `Number(newV.width)` + `w > 0 && w === w` 过滤 NaN，避免整段回调被静默跳过。

> 布局层（`@State canvasW/H` → `.width()`/`.height()` + `objectFit(Contain)`）本来就实时；
> 上述 2/3/4 补的是**按新画布档位重新解码**，否则只是把旧小图拉大（发虚 / 锯齿）。

### 验证

`632 → 644/644 通过`（新增 5 例 `canvasFromRootOf` 纯函数 + 7 例静态契约，修正 4 条过时断言）。
`git diff --check` 干净，三个源码文件括号计数与 HEAD 增量全 0。版本仍 `1.0.7`。

## 第四轮：ESC 对齐双击 / 全量缓存并发预解码（2026-11-11）

同批落地的另两项（第 2 项 resize 已由上一节第五轮重修）：

1. **ESC 与双击完全一致**：`onKey` 的 `KEYCODE_ESCAPE` 由单独 `setFull(false)` 改为
   `toggleFull()`，与 F11 / 双击画布 / 左栏双击走同一入口。真全屏
   （`ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER`）下 ESC 常被窗口管理器先消费，
   APP 收不到按键；因此 `onAreaChange` 里加「全屏画布相对基准明显缩小 → 自愈 `setFull(false)`」，
   由 `shouldExitFullOnResize()` 判定，`FULL_SELF_HEAL_GUARD_MS = 900` 稳定期避开
   maximize/layout 异步过渡抖动。退出时 `preFull*` 八项快照逐项还原完整界面。
2. **全量缓存 + 载入即并发预解码**：`PRELOAD_ALL = true` 时 `schedulePreload()` 走
   `startAllPreload()`，`fullPreloadIndex()` 一次生成整库顺序，`preloadConcurrencyOf()` /
   `preloadBatchOf()` 受控并发分批解码，整批落地后 `PRELOAD_ALL_YIELD_MS` 让出主线程；
   位置变化不再 `preloadSeq++` 打断链，只有换数据源由 `clearPreviews()` 自增 `allSeq` 作废旧批次。
   `fullCacheTargetOf()` 与 `preloadSaturated()` 保留 20000 张 / 1GB 双硬闸，
   **ro1 的 `bulkIoAllowed(restoreMode)` 总闸门绝不绕过**（历史上启动冻结的真因就是批量同步 IO）。

## 左右页统一最高画质：修正「左边比右边差」（2026-11-11 第三轮）

用户实机反馈：**「左边显示效果比较右边差，修正为一样，要最好画质」**。

上一轮把右页补齐到左页的画质属性后，右页反而更清楚了 —— 根因不在显示层，而在
**两页用了两套不同的「缓存够不够」判据**：

| 位置 | 旧判据 | 普通态实际档位 | 全屏实际档位 |
|---|---|---|---|
| 左页 | `showNeed(hit)` = `min(ceil(画布长边 × zoom × 1.05), 原图长边)` | 约 1260 → 命中 1536 预载图就判「够用」，**不升级** | 仍沿用 1536 / 2304 |
| 右页 | `hit.edge >= viewEdge()` | 1800（不足就重解） | 3840（不足就重解） |

左页因此长期停留在预载的 1536 档位，右页却已重解到 1800 / 3840 —— 这就是「左边比右边差」。
还有两个加重因素：

1. **全清图从不写回缓存**：旧 `loadViewNow()` / `loadRightPage()` 把重解结果放进了
   `viewOwned` / `rightOwned` **自持有**，`previews` 里同一个 uri 可能仍留着 768 低清占位
   或 1536 预载图。左页命中它判「够用」，右页严格重解。
2. **缓存查询可能拿到低档位图**：旧 `previewEntry()` 是「从队尾往前找第一条同 uri」。
   三条异步链（768 占位 / 1536 预载 / 1800 全清）并行，低清链慢到时就会把低档位图当命中。

修正（全部集中在解码档位与缓存，不动显示层）：

| 改动 | 说明 |
|---|---|
| 新增 `ViewPlan.displayEdgeOf()` 纯函数 | `max(主视图档位 viewEdge(), ceil(画布长边 × zoom × 1.05))`，再夹到原图长边；原图尺寸未知时不夹上限，画布为 0 时回退 `viewEdge()`（绝不返回 0 让 `desiredSize` 算出 1×1） |
| `Index.displayEdge(srcLong)` 统一包装 | 左页 `showNeed()` 委托它、`loadViewNow()` 用它作解码档位、`loadRightPage()` 用它作缓存命中判据 —— **左右页、全清升级、尺寸变化重解全都走同一个函数** |
| `upgradePreview()` 把全清图写回缓存 | 同 uri 只留 `edge` 最大的一张，替换掉 768 / 1536 旧条目；左右页此后命中**同一张**最高档位图，且每张只解一次，不会每次翻页都重解（不卡） |
| `previewEntry()` 改取 `edge` 最大 | 同 uri 存在多条时永远返回最高画质那张，堵住异步竞态 |
| 只升档不降档 | 低清链慢到、或 zoom 变小导致新解档位更低时，保留缓存里更高档位的图并丢弃新解结果 |
| 所有权安全 | 升级前先撤 `viewPixelMap` / `rightPixelMap` 旧引用，再同步 release 被替换的 PixelMap、同一帧换上新引用（不花屏）；仍被过渡层 / 右页引用的那张不 release |

> 显示层保持上一轮的最高画质配置不变：`ImageInterpolation.High`（SDK 注明 Cubic /
> highest possible quality）+ `autoResize(false)` + `dynamicRangeMode(HIGH / STANDARD)`，
> 主视图 / URI 兜底 / 并排右页三处齐配。所以「一样」是把左页**抬到**右页档位，
> 不是把右页降下来。

统一后的档位（原图 4000px 长边举例）：

| 场景 | 左页 `showNeed()` | 右页 `loadRightPage()` | 结果 |
|---|---|---|---|
| 普通窗口 1200×800 | `max(1800, 1260) = 1800` | `displayEdge(4000) = 1800` | 两页都 1800 |
| 全屏 1920×1080 | `max(3840, 2016) = 3840` | `displayEdge(4000) = 3840` | 两页都 3840 |
| 放大 4×（1200×800） | `max(1800, 5040) = 5040` | 同样 5040 | 两页都 5040 |

验证：`556 → 572/572 通过`（新增 16 例：`displayEdgeOf` 纯函数 8 例覆盖普通 / 全屏 /
放大 / 夹原图 / 未知尺寸 / 零画布 / zoom 非正 / 不降档，源码静态契约 8 例覆盖统一包装、
`showNeed` 委托、升级写回、只升档、所有权安全与显示层三处齐配），`git diff --check` 干净，
`Index.ets` / `ViewPlan.ts` 括号计数与 HEAD 完全一致。按约定**未编译 HAP / 未放桌面 /
未升版本（仍 1.0.7）/ 未 push**，DevEco Studio 编译由用户侧完成。

## 五项实机修正：全屏放大 / ESC 还原 / 右页锯齿 / hover 无档案名 / 梅花间竹列表（2026-11-11 第二轮）

用户第二轮实机反馈 5 项，逐条定位与实现：

| # | 反馈 | 根因 | 修正 |
|---|---|---|---|
| ① | 双击切全屏时预览图没跟窗口一齐放大 | `setFull()` 只置 `pendingReload`，没复位 `zoom/tx/ty`；而 `maximize` / `setWindowLayoutFullScreen` 是一串异步 `await`，应用内三块栏先隐藏会触发一次 `onAreaChange`（窗口仍是旧尺寸）把 `pendingReload` 消费掉，等窗口真正变大时已不再重解；并排右页也不在重解范围内 | 新增 `fitToWindow()` 复位缩放平移，让 `objectFit(Contain)` 按新画布铺满；`armCanvasReloadFallback()` 改为到点**无条件**按最终 `canvasW/H` 重解一次；`refreshForCanvasResize()` 连带 `loadRightPage()` 重解右页 |
| ② | ESC 退出没切回之前的完整界面 | 进入时 `maximize(ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER)` 是**持久形态设置**，恢复系统栏 / layout / immersiveMode 都管不到它；旧 `recover()` 只在「进入前是浮动窗口」才调用，PC 上窗口本就最大化时标题栏 / dock / 任务栏永远回不来。另外旧 `setFull(false)` 只翻布尔 + 写固定文案，缩放 / 平移 / 手动旋转 / 状态栏 / 顶栏全丢了 | 进入前把 `zoom/tx/ty/rot/flipH/flipV/status/topbarVisible` 存进 `preFull*` 快照，退出逐项还原；退出窗口形态：浮动窗口走 `recover()`，否则 `maximize(EXIT_IMMERSIVE)`，再双保险 `setWindowDecorVisible(true)` + `setTitleAndDockHoverShown(true, true)` |
| ③ | 并排右页明显锯齿，左页没有 | `rightPageImage()` 只有 `interpolation(High)`，缺 `autoResize(false)`（默认 `true` 会让组件按显示尺寸重采样放大低清图）与 `dynamicRangeMode`；`loadRightPage()` 又用较低的 `preloadEdge()` 解码，且**任意**缓存命中都直接上屏，低档位图被拉成半屏 | 右页补齐与左页完全相同的画质属性；解码档位提到 `viewEdge()`，缓存只在 `hit.edge >= need` 时命中，否则重解 |
| ④ | mouseover 档案列表时缩略图里显示档案名 | `hoverThumb()` 里有一行 `Text(this.name)` | 删掉，浮层只留 `Image(hoverPx)` / `读取预览…` 占位；档案名本来就在左栏那一行上 |
| ⑤ | 档案列表要梅花间竹颜色格子、行距压到 1mm | 行背景原为 `selected ? '#1f2730' : 'transparent'`，透明底看不出格子；`padding top/bottom: 2` + `List space: 2` | 新增 `ROW_STRIPE_EVEN/ODD/ROW_SELECTED_BG` 与 `ArchiveRow.rowBgColor()`（选中优先，其余按 `idx % 2` 交替）；`padding` 改 `top/bottom: 1`、`borderRadius: 3`、`List space: LIST_ROW_GAP_VP = 1` |

> **关于「1mm」**：ArkUI 只有 `vp` / `px`，没有 `mm` 单位。这里把两行之间的缝表达为
> `List space = 1vp` + 行上下 padding 各 `1vp`，在 2in1 高密度屏上视觉就是约 1mm 的一线。
> 实机觉得宽 / 窄只改 `LIST_ROW_GAP_VP` 一个常量即可，不必动每一行。

`common/ViewPlan.ts` 的 `fullscreenStepsOf(false)` 同步补全：退出步骤表新增
`exit-immersive` / `decor-on` / `title-dock-hover-on`（`recover` 与 `exit-immersive` 实机
二选一），hilog 打印的步骤串能与实机对照到「到底跑到哪一步」。

验证：`544 → 556/556 通过`（新增 12 例源码静态契约：全屏快照 / `fitToWindow` / 无条件兜底
重解 / 右页重解 / ESC 逐项还原 / 窗口形态恢复 / 步骤表 / 右页画质 / hover 无档案名 /
列表交替色与 1vp），`git diff --check` 干净，`Index.ets` / `ViewPlan.ts` 括号计数与 HEAD
完全一致。按约定**未编译 HAP / 未放桌面 / 未升版本（仍 1.0.7）/ 未 push**，
DevEco Studio 编译由用户侧完成。

## 真全屏 + 最高画质 resample + ICC / HDR / EXIF（2026-11-11）

用户三项要求与对应实现：

| 要求 | 实现 |
|---|---|
| 真全屏、无标题列、隐藏 taskbar | `maximize(ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER)` + 沉浸式布局 + 关三类系统栏；`SHOW_FULLSCREEN_CHROME = false` 去掉应用内工具顶栏 / 退出按钮 |
| 全屏跟随尺寸适配 + 最高画质 resample | `ViewPlan.viewEdgeOf / preloadEdgeOf` 按全屏画布放大解码档位（主视图 ×2.0、预载上限 2560）；尺寸变化走 `refreshForCanvasResize()` **0 延迟**重解当前张 + 按新档位补预载；显示层 `ImageInterpolation.High`（SDK 注明的 Cubic 最高画质）+ `autoResize(false)`。**第二轮起并排右页同此配置、进出全屏还会 `fitToWindow()` 且兜底无条件重解，见上节** |
| ICC 内嵌色彩 / HDR / EXIF 旋转 | 见下表，全部集中在 `decodePx()` 的一个 `DecodingOptions` |

### 解码选项（全部集中在 `decodePx()`）

| 能力 | SDK 26 接口 | 说明 |
|---|---|---|
| EXIF 旋转 | `ImageSource.getImageProperty(image.PropertyKey.ORIENTATION)` → `ViewPlan.exifTransformOf()` → `DecodingOptions.rotate` / `PixelMap.rotate` / `PixelMap.flip` | 8 种 Orientation 全覆盖（含 4 种镜像）；在解码阶段旋转，少一次重采样；`EXIF_CACHE` 按 uri 缓存，201 张预载不会逐张跨进程读元数据 |
| 内嵌 ICC 色彩 | `PixelMap.getColorSpace()` + `DecodingOptions.desiredColorSpace` | 系统 codec 识别内嵌 ICC 并映射成标准空间（sRGB / Display P3 / BT.2020…），默认**原样保留**；`COLOR_MANAGE_MODE` 可切 `1` = sRGB / `2` = Display P3 在解码时转换；信息浮层显示识别结果 |
| HDR | `DecodingOptions.desiredDynamicRange = DecodingDynamicRange.AUTO` + `Image.dynamicRangeMode(HIGH / STANDARD)` | HDR 图按 HDR 解码，显示端按 `viewHdrWanted` 开 HIGH；平台不支持 HDR 时 SDK 自动降级 SDR |
| 最高画质缩放 | `.interpolation(ImageInterpolation.High)` + `.autoResize(false)` | SDK 明确 `High` = Cubic「highest possible quality」；`autoResize(false)` 不让组件在解码阶段再降采样损信息。**第二轮起主视图 / URI 兜底 / 并排右页三处齐配**（原来右页缺此二项而带锯齿） |

全屏前后档位对比（`ViewPlan` 纯函数，已进回归测试）：

| 场景 | 主视图 `viewEdge()` | 预载 `preloadEdge()` |
|---|---|---|
| 普通窗口 1200×800 | `1200 × 1.5 = 1800` | 按画布 ceil 量化，封顶 1536 |
| 全屏 1920×1080 | `1920 × 2.0 = 3840` | 同一算法放宽到 2304（上限 2560） |

旧实现 `onAreaChange` 只调 `showPreviewOf()`，命中缓存时会被 `showNeed()` 判成「够用」而
沿用旧档位图，等于把小图拉大；现在改为 `curToken++` 后直接 `loadViewNow(uri, token)`（0 延迟）
并 `schedulePreload()`，窗口 API 没产生尺寸回调时还有 800ms 兜底重解。**第二轮起该兜底
改为到点无条件按最终画布重解，且连带重解并排右页，见上节**。

**⚠️ ICC 平台边界（如实说明）**：HarmonyOS 26 的 `@ohos.graphics.colorSpaceManager`
只有 `create(ColorSpace)` 与 `create(primaries, gamma)`，**没有「从 ICC profile 字节流构造
ColorSpaceManager」的 API**，因此做不到 Photoshop / Win64 版那种完整 ICC CMS（读取任意
profile 的 TRC / 矩阵做精确转换）。本工程做的是：让系统 codec 识别内嵌 ICC → 映射到标准
色彩空间 → 原样保留或按常量转换到 sRGB / Display P3 → 把识别结果显示出来。广色域屏上
颜色正确，任意自定义 ICC 的精确转换不在平台能力内。

**⚠️ 两个实机回退开关**：若竖拍图被多转 90°，说明该机型系统 codec 已自动应用 EXIF
Orientation，把 `EXIF_AUTO_ROTATE` 改 `false`；若 `rotate` 与 `desiredSize` 组合在该 codec
上不支持，把 `EXIF_ROTATE_AT_DECODE` 改 `false` 走 `PixelMap.rotate()`。都不改业务流程。

验证：`502 → 544/544 通过`（新增 42 例：`ViewPlan` 纯函数 8 种 EXIF / 档位 / 色彩空间 / 提示，
源码静态契约覆盖窗口沉浸 API、三类系统栏、0 延迟重解、解码选项、Cubic / autoResize 与回归护栏），
`git diff --check` 干净。按约定**未编译 HAP / 未放桌面 / 未升版本（仍 1.0.7）/ 未 push**，
DevEco Studio 编译由用户侧完成。

## 预览右下角角标精简：只显示缓存数量 + 缩放百分比（2026-11-11）

用户实机反馈：**「预览右下角只显示缩图百分比，缓存数量」**。此前右下角堆了四组信息
（`缓存 N / 216 张`、`xx MB`、`/ 1.00 GB`、缩放百分比），目录浏览态还会多一行诊断串。
本次按「只留两项」收口：

| 位置 | 现在显示 | 去掉了什么 |
|---|---|---|
| 预览区右下角（上） | `缓存 N 张` | `/ 216 张`、`xx MB`、`/ 1.00 GB` |
| 预览区右下角（下） | `25 %`（`zoomPercentText()`，100% = 原图像素 1:1） | 无，口径不变 |
| 底部状态栏 | `预载 N 张` | ` · xx MB` |
| 目录诊断串 | **默认不画** | `SHOW_DIAG_BADGE = false` 隐藏整行 |

- **诊断串没有删**：`@State diagLine` 的 14 个赋值点、HiLog 输出全部保留，
  渲染条件从 `if (this.diagLine.length > 0)` 改成
  `if (SHOW_DIAG_BADGE && this.diagLine.length > 0)`。
  需要实机截图排查时把顶部常量 `SHOW_DIAG_BADGE` 改 `true` 编译一次即可，排查完改回 `false`；
  不改任何业务流程，也不动版本。
- **预算逻辑一点没动**：`PRELOAD_COUNT = 216` / `PRELOAD_MAX_BYTES = 1GB` /
  `preloadSaturated()` / `syncCacheStat()` 全部保持原样，只是不再把 MB 画到屏幕上；
  `cacheBytes` 仍是内部账目镜像，`fmtBytes()` 仍用于左栏字节列与左上角信息浮层。
- **缩放口径不变**：仍是相对原图像素的倍率（`ZOOM_PCT_RELATIVE_TO_PIXEL = true`），
  适应窗口通常 13%~30%。

验证：`493 → 502/502 通过`（新增 9 例源码静态契约：开关默认 false、诊断赋值点不减、
恒显示区只有 2 个 Text、缓存行无 MB / 上限、缩放口径与状态栏、预算常量不动、
按钮 / 版本 / 防冻结闸门回归），`git diff --check` 干净。
按约定**未编译 HAP / 未放桌面 / 未升版本（仍 1.0.7）/ 未 push**，DevEco Studio 编译由用户侧完成。

## 尽量缓存前后 100 张图（2026-11-11，历史记录）

> ⚠️ 本节是**历史记录**：同日第四轮已改为「全量尽力缓存 + 载入并发预解码」（见上文《第四轮》）。
> `PRELOAD_ALL = false` 时这条「前后各 100」的窗口链仍作为回退保留，代码与常量都还在。

按用户「尽量缓存前后 100 张图」把预载窗口由**前后各 50** 扩到**前后各 100**：

| 常量 | 旧 | 新 | 说明 |
|---|---|---|---|
| `PRELOAD_FWD` / `PRELOAD_BACK` | 50 / 50 | **100 / 100** | 窗口 = 100 + 100 + 1 = **201 张** |
| `PRELOAD_COUNT` | 112 | **216** | LRU 容量必须 > 窗口，否则每入一张就淘汰一张 |
| `PRELOAD_MAX_BYTES` | 512MB | **1GB** | 旧上限只够约 80 张，窗口扩了也立刻被挤掉 |

> 下文历史章节里的「前后各 50」「112 张 / 512MB」「预载 20 → 50」都是**旧值记录**，
> 保留只为溯源；当前值以本节和 `Index.ets` 顶部常量为准。

### 「尽量」= 目标放宽，预算兜底

201 张 × 1536 档位（3:2 约 6.3MB/张）≈ 1.27GB，方图（1536² 约 9.4MB/张）≈ 1.9GB，
**内存装不下整窗是常态**。所以不是「强行保证 201 张全驻留」，而是：

1. 窗口目标放到 100，能装多少装多少；
2. 触到张数 / 字节预算就**收工**，右下角角标 `缓存 N 张` 与状态栏 `预载 N 张`
   显示真实驻留数（11-11 起不再显示 MB / 上限），同源；
3. 位置一变 `evictOutside()` 释放窗口外旧图，腾出预算后预载链自动再补。

### 为什么必须加「预算收工」

窗口比预算装得下时，预载链会无限重试：解一张 → `pushPreview()` 触顶淘汰最旧的一张 →
下一轮又发现窗口有缺口 → 再解一张 → 再淘汰…… `failed` 黑名单管不到（这些图**解码成功**，
只是被挤掉），于是 `setTimeout(…, 0)` 串起来持续占满 CPU。这正是历史上修过的「预载链
无限重试 = 死循环」的另一种触发方式，只改常量会把它放大 2 倍。

新增 `common/PreloadBudget.ts`（纯函数、可 Node 回归）：

| 函数 | 作用 |
|---|---|
| `preloadWindowSize(back, fwd, total)` | 期望窗口张数，环绕且不超过图库总数 |
| `preloadOrder(back, fwd)` | 前后交替、先近后远的补齐序列 `[1,-1,2,-2,…]` |
| `preloadSaturated(cached, bytes, maxCount, maxBytes)` | 张数 / 字节触顶判据，含「再加一张就会触顶」的提前量，避免淘汰后字节跌回上限下方继续抖动 |

`preloadSaturated()` 返回 true 时 `preloadNext()` 置 `preloadBusy = false` 并打
`preload: budget reached, cached N/M, x/y MB` 日志 —— 这是**正常收工**，不是失败。
HiLog 里看到它就说明设备内存已尽用，角标是真实值。

### 前后交替补齐

旧逻辑「先把前方 50 张全补完，再补后方」在预算不足时会变成「前方 100 张占满、
后方一张都没有」，往回滚仍全靠解码。改为按 `preloadOrder()` 交替补 `[1,-1,2,-2,…]`，
预算只够一半时两个方向各拿到约一半，符合「前后各 100 张」的意图。

### 窗口查表优化

窗口翻倍后 `evictOutside()` 若仍对每条缓存逐张调 `inWindow()`，
复杂度是 O(缓存数 × 窗口数) ≈ 216×201 ≈ 4.3 万次比较 / 每次切图。
改为一次建好 `windowUris(): Set<string>` 再查表，降到 O(缓存数 + 窗口数)。

### 内存吃紧时怎么调

- 把 `PRELOAD_MAX_BYTES` 调回 `512 * 1024 * 1024`：占用减半，代价是驻留张数降到约 80；
- 或把 `PRELOAD_MAX_EDGE` 从 1536 调到 **1280**（单张约 4.4MB），1GB 反而能装下整窗 201 张；
- **不要**调低 `PRELOAD_MIN_EDGE` / 把档位降到 768：档位小于屏幕实际像素时，
  每张命中缓存的图都还要再解一次全清，正是早期切图卡顿的真因（见「移植自 Win64 版的四项优化」）。

### 验证

`node --experimental-strip-types tests/dirname.test.mjs` **204 → 238/238 通过**：
新增 20 例 `PreloadBudget` 纯函数（窗口尺寸、交替顺序、预算触顶 / 提前量 / 不受限配置）
+ 13 例源码静态契约（常量值、旧值已清、预算收工、交替顺序、窗口查表、角标仍绑定）。
按 11-10 约定：**未编译 HAP、未放桌面、未升版本（仍 1.0.7）、未 push**。
实机请在 DevEco Studio 编译后看右下角角标：`缓存 N 张`，
N 即设备实际能驻留的张数；HiLog 的 `preload: budget reached` 是预算用尽的正常收工。

## 往上层按钮永不 grey out（2026-11-11 澄清修正）

用户澄清：

> 1）「回上层」真正 grey out 的意思是不要grey out，不能禁用。
> 之前就是不知道为什么grey out了，我请你修正

**理解反了，已撤销**。上一版把「grey out」读成「要真正禁用」，给按钮加了
`.enabled(false)` + 条件明暗色 / `.opacity(0.45)`，还在 `upEnabledAfterResume()`
里把恢复出来的图片列表态强制判成无父级 —— 于是**重开 APP 一上来按钮就灰着点不动**，
正是用户说的「不知道为什么 grey out」。

### 根因：两个独立原因叠加

| # | 原因 | 后果 |
|---|---|---|
| ① | `upEnabledAfterResume()` 在 `browseBase=''`（启动恢复出的图片列表态）强制 `canGoUp=false`，`toolBtn` 再 `.enabled(false)` | 重开 APP 按钮直接灰掉、完全不可交互 |
| ② | `canGoUpFrom()` / `upLevelOf()` 遇到还原不出绝对路径的 URI（`content://...`、文档碎片）返回 `false` | 明明在深层目录，按钮也被判成「到顶」而灰掉 / 点了没反应；`..` 行也一起消失 |

### 修正

| 位置 | 改动 |
|---|---|
| `toolBtn` | 回到三参签名 `(label, act, flex)`；删 `.enabled()`、条件 `fontColor` / `backgroundColor`、条件 `.opacity`；三个按钮无条件同色同亮度 |
| `ResumePlan.ts` | 删 `upEnabledAfterResume()`，换成恒返回 `true` 的 `upButtonEnabled()`，让「按钮永不禁用」成为可回归的显式契约 |
| `applyItems()` | `canGoUp = canGoUpFrom(browseBase)` 降级为**纯信息状态**（状态栏文案 / 诊断串 / 行为判据），绝不参与按钮外观或可交互性 |
| `openFolder()` | 目录浏览态**恒列 `..` 行**，不再由 `canGoUpFrom(base)` 决定；界面元素不因内部路径判定而消失 |
| `DirName.ts` | 新增 `upNavStateOf()` 四态分派、`upLooseParentOf()` 严格剥一层兜底、`upParentCandidates()` 支持显式父级 |
| `browseUp()` | 按钮 / 退格 / `..` 行三条入口仍全部收口；按四态分派，UNKNOWN 不再误报「已到最上层」 |

### 四态分派（新增纯函数）

| 状态 | 判定 | 点击行为 |
|---|---|---|
| `UP_NAV_NONE` | `browseBase=''`（图片列表态） | 「用「选择文件夹」进入目录浏览」 |
| `UP_NAV_TOP` | 能定出卷根且剥不动（真到顶） | 「已到卷 / 硬盘的逻辑最上层 · 没有父级了」，不移动、不弹选择器 |
| `UP_NAV_GO` | `upLevelOf()` 非空 | 按严格层级链逐级上移，`dirLevelOf` 每步 −1 |
| `UP_NAV_UNKNOWN` | 路径非空但卷根判不出（文档 / `content` URI） | 用 `upLooseParentOf()` 严格剥一层生成候选再试；**绝不假装到顶**。全失败给「请用「选择文件夹」重新进入」的明确指引，且不进补授权选择器（`isUpTargetOf` 此时恒 false，会死锁） |

`upLooseParentOf()` 对**能定出卷根**的路径一律返回 `''` —— 严格链说了算，
防止宽松父级越过 `/storage/Users/<id>` 跑到系统目录（越级）。

### 与 11-10 层级语义的关系

「逐级上移 / 不越级 / 不循环 / 到卷根停止」**全部保留**，改的只是「到顶时怎么表现」：
从「按钮被灰掉」改成「按钮照样可点、点了给一句准确提示」。诊断串新增 `st=` 状态字段
（`up START | up4 | st=2 | L4→L3 ...`），便于实机截图确认新包。

### 验证

`node --experimental-strip-types tests/dirname.test.mjs` **293 → 316/316 通过**：
新增四态分派、宽松父级防越级、UNKNOWN 显式父级候选、`upButtonEnabled()` 恒 true，
以及「源码非注释行无 `.enabled(` / 无条件置灰色」「按钮不传 `canGoUp`」「目录态恒列 `..`」
「UNKNOWN 失败不进补授权死锁」等静态契约。
按 11-10 约定：**未编译 HAP、未放桌面、未升版本（仍 1.0.7）、未 push**。
实机请在 DevEco Studio 编译后重开 APP：按钮应始终亮着可点，状态栏带 `rs1`；
进目录后逐级上移、到卷根给「没有父级了」提示而按钮不变灰。

## 退出记住位置 / 重开自动显示上次相片（2026-11-11）

用户两条需求：

> 1）退出 APP 会记下上次的位置、相片，再次打开 APP 会显示之前的图片
> 2）回上层 grey out

> ⚠️ 需求 2 当时被理解反了：用户是**抱怨按钮被灰掉、要求修正**，不是要禁用。
> 当天晚些时候已撤销禁用，见前文「往上层按钮永不 grey out」章节。需求 1 的实现不受影响。

### 根因：保存一直是好的，断的是「启动恢复」和「退出落盘」

| 环节 | 11-11 之前 | 问题 |
|---|---|---|
| 记住位置 | `markPos → scheduleFlush(500ms) → flushPos` 写 6 个小 key + 分块快照 | 逻辑完整，但 `flushPos()` 是 **async**；`aboutToDisappear` 里只是「尽力而为」，切后台 / 进程被杀时 Promise 常常没跑完 → **位置丢失** |
| 启动恢复 | `AUTO_RESUME_ON_START = false`，`readLastPos()` 读完只设一句 `resumeHint` 提示文字 + `warmLast()` 后台预热 1 张 | **根本不显示图片**。历史上因为「启动读 3000 条大快照 + 全量重扫图库」触发 `PreferencesGetValue` 卡死 8 秒，就把整个恢复动作关掉了（见 appfreeze 章节） |
| 「往上层」按钮 | 明暗色 + `.opacity(0.45)` 的视觉变暗，`onClick` 仍在 | 当时误以为用户要「真正禁用」，这条理解是错的（见前文澄清修正章节） |

### 需求 1：安全的启动恢复（绝不重蹈 appfreeze）

新增 `common/ResumePlan.ts` 纯函数模块 + `Index.ets` 恢复链路。核心是**把恢复从「启动关键路径」推到「首帧之后」**：

| 纯函数 | 作用 |
|---|---|
| `resumeAction()` | 决定 `SKIP`（用户已操作 / 已恢复过 / 开关关 / 无记忆）、`SNAPSHOT`（恢复整批列表）、`SINGLE`（只显示那一张） |
| `resumeSingleUri()` | 优先「最后一次**成功显示**」的 `okUri`（预热的就是它），退化到位置里记的 `uri` |
| `resumeDelaySafe()` | 恢复延迟必须**严格大于**预热延迟 `WARM_DELAY_MS=300` 且 `>= RESUME_MIN_SAFE_MS=600`；配错就拒绝调度 |
| `exitFlushAction()` | 退出时 `SKIP`（无位置）/ `ASYNC`（prefs 没建好）/ `SYNC`（同步落盘） |
| `resumeSnapCap()` | 恢复端再夹一道 `SNAP_MAX=600`，防旧残留的 3000 条被拉进启动路径 |
| `upButtonEnabled()` | 「按钮永不禁用」的显式契约，恒返回 `true`；恢复出来的图片列表态按钮照样亮着可点（11-11 澄清修正后） |

`Index.ets` 的执行链：

```
aboutToAppear → readLastPos()（异步读几个小 key，不阻塞首帧）
              → warmLast(okUri)（300ms 后只解 1 张，存进 this.warm）
              → scheduleShowLast()（只排一个 setTimeout，900ms 后触发）
                  ↓ 首帧 / 窗口初始化 / 预热全部完成
              → showLastOnStart()
                  · resumeAction 决策，只跑一次（resumeDone）
                  · 用户已自己选了文件夹 / 图片 → 立刻 SKIP，不抢视图
                  · 只读 1 个小 key（snapCount）+ 分块快照
                  · SNAPSHOT → restoreFromSnapshot() → setItems → applyItems
                               → restoreIndex 精确落回上次那张 → showPreviewOf 出图
                  · 读不出快照 → SINGLE 兜底：只显示上次那一张，
                                  warm 已预解好 → applyItems adopt 进缓存 → 首屏立即命中
```

**四条硬边界**（每条都是历史上踩过的坑）：

1. **绝不** `loadAllGallery()` 全量重扫、绝不申请权限、绝不弹选择器 —— 无交互、无 ANR；
   旧的 `AUTO_RESUME_ON_START` 恒为 `false`，作为护栏常量保留。
2. 恢复排在 `RESUME_DELAY_MS = 900ms` 之后，且经 `resumeDelaySafe()` 校验；
   `aboutToAppear` 里一个快照都不读。
3. `SNAP_MAX` 已从 3000 降到 600、一块装完，恢复端还有 `resumeSnapCap()` 再夹一道。
4. 单张兜底会**撤销** `setItems` 的落盘副作用（`posPending` / `posTimer` / `snapDirty` / `lastPos`
   全部复位）—— 否则 500ms 后 `flushPos()` 会把「只有 1 张」的列表写进快照，
   **覆盖掉上次会话的整批 uri**，下次就再也恢复不出来了。

> **平台限制与本次解法**：HarmonyOS `DocumentViewPicker` 的 URI 授权是逐 URI、默认不持久的。
> 重启后系统回收授权时，恢复出来的那批 URI 一个都打不开。
> **2026-11-11 分两步处理**：先用下一节的「只读名单态」挡住授权失效时的批量 IO 冻结；
> 再补上「目录 URI 持久授权」一节，从根上让重开能直接出图。

### 实机反馈：重开后「名单在、图片白、往上层没反应、档案列表点不动」（2026-11-11）

三个症状其实是**同一条因果链**，不是三个独立 bug：

| # | 环节 | 后果 |
|---|---|---|
| ① | 快照里的 uri 是上次会话 `openFolder` 拼出来的子项路径；`DocumentViewPicker` 的逐 URI 授权默认不跨进程持久 | 重开后这批 uri **一个都打不开** → 名单（纯字符串）照样能显示，图片却全白 |
| ② | 恢复链 `setItems → applyItems` 像正常换源一样启动全套后台任务：预载最多 201 张 `decodePx`（同步 `openSync`）、补体积最多 600 次 `statSync`、对开元数据 `createImageSource`，再加 `viewFailed` 后系统 `Image(uri)` 反复重试 | 每次对失效授权 uri 的调用都是**同步跨进程**的，几百次累积就把主线程占满 → 与历史 appfreeze 同源 |
| ③ | 主线程被占满 + 恢复出来是图片列表态（`browseBase=''`） | 表现就是「往上层按了没反应、档案列表点不动」，其实按钮和列表根本没被禁用 |

**修法：先证实授权，再决定恢复模式**（决策抽成 `ResumePlan` 纯函数，可 Node 回归）：

- `restoreProbeUris()` 生成最多 `RESTORE_PROBE_LIMIT = 3` 个候选（okUri → savedUri → 快照开头），
  `probeRestoreUris()` 逐个 `fs.openSync` —— **只探 3 张**，绝不探整批（探整批本身就是新的冻结源）。
- 任一能打开 → `restoreModeOf(true) = RESTORE_FULL`，预载 / 补体积 / 解码 / 对开照常跑，旧行为完全不变。
- 全打不开 → `RESTORE_READONLY`：`bulkIoAllowed()` 恒 false，作为**防冻结总闸门**串在
  `decodeTo` / `showPreviewOf` / `fillSizes` / `schedulePreload` / `loadMeta` /
  `refreshSpread` / `probeOne` / `applyItems` 所有会碰 uri 的入口上；
  预览区不再画 `Image(uri)`，改由一张可操作的指引卡接管（带「选择文件夹重新打开」按钮）。
- **按钮与列表绝不禁用、绝不置灰**（延续 11-11 澄清）：只读态下点档案行 / 滚轮翻页仍更新
  位置、高亮与位置记忆，状态栏给 `readonlyTapHint()`；点「往上层」给 `readonlyUpHint()`；
  悬停缩略图由 `@Prop thumbDisabled` 挡掉，连解码都不发起 —— **点了一定看得见反应**。
- `applyItems()` 是唯一收口点：`applyPendingRestore()` 在建列表前落地模式。
  用户主动换源时 pending 恒为 false → 自动回到 `RESTORE_FULL`，无需逐个入口手写清除。
- 诊断标记 **`ro1`**（`RESTORE_TAG`，不是版本号）出现在状态栏 / 提示卡 / 右下角诊断串里，
  实机一眼就能认出新包；`APP_VERSION` 仍为 1.0.7。

### 目录 URI 持久授权：让重开直接出图（2026-11-11 追加）

上一节修的是「授权失效时不要卡死」，这一节修的是「让授权不再失效」。

| 环节 | 做法 |
|---|---|
| 权限 | `module.json5` 声明 `ohos.permission.FILE_ACCESS_PERSIST`。SDK 26 `PermissionDefinitions.json` 里它是 `system_grant / normal / provisionEnable` —— **安装时自动授予、不弹权限框**，也不会像 `READ_IMAGEVIDEO`（`user_grant / system_basic`）那样让 debug 签名安装失败 |
| 选目录时 | `chooseFolder()` 拿到 `picker.select()` 返回的**原始目录 URI** 后，fire-and-forget 调 `fileShare.persistPermission([{uri, READ_MODE}])`，并把该 URI 同步写进 `POS_KEY_DIR`（`lastDirUri`）。「往上层」不再弹选择器，也就不存在「补授权后持久化」这一环 |
| 重开时 | `beginRestore()` 在首帧后 900ms 的定时器里先（有超时兜底地）`activatePermission()`，再进入原恢复链 |
| 裁决 | **探测仍由 `probeRestoreUris()` 说了算**：activate 成功 → 3 张探测通过 → `RESTORE_FULL` 直接出图；activate 失败 / 平台拒绝 → 探测失败 → `RESTORE_READONLY`，防冻结兜底原样保留 |

安全边界（与历史 appfreeze 同源的护栏，逐条保留）：

- `persistPolicyUris()` 恒限量 1：只授权 picker 原始目录 URI，**绝不**把快照里几百条拼出来的
  子文件 URI 塞进 policy —— 那会变成启动期批量跨进程调用，且平台会返回 `PERSISTENCE_FORBIDDEN`。
- `activatePermission` 是异步跨进程调用，`beginRestore()` **不 await** 它：用
  `PERSIST_ACTIVATE_MS = 1500ms` 超时定时器与之竞速，`finishPersistActivate()` 靠
  `persistSettled` 只收口一次，随后照常 `showLastOnStart()`。系统服务挂住也不会让界面停在空态。
- 全部 SDK 异常吞掉并降级；`PersistPlan.ts` 只做纯决策、不依赖鸿蒙 SDK，可 Node 回归。
- 诊断标记 **`p1`**（`PERSIST_TAG`，不是版本号）：激活成功时状态栏带「`p1` 目录授权已持久」，
  右下角诊断串带 `persist OK | p1`；只读名单态诊断串带 `p0/p1`。

> ⚠️ **升级后的首次启动仍要重选一次目录**：老版本保存的快照里没有 `lastDirUri`，也没有建立过
> 持久授权，所以第一次重开会落只读名单态，提示「这是升级后的首次恢复：重新选一次该目录后，
> 以后重开即可直接出图」。再选一次（picker 授权只能由用户给）之后，后续重开才直接出图。
>
> ⚠️ 若平台对该目录 URI 返回 `PERSISTENCE_FORBIDDEN`（某些 picker URI 不允许持久化），
> `persistPermission` 会失败并记日志，重开时探测失败 → 依旧落只读名单态，**不会卡死、不会崩**。

### 实机反馈：重开已能出图，但「往上层」还是按不动（2026-11-11 第三次修正）

`p1` 之后重开能直接出图了，`setItems()` 却**无条件清空** `browseBase` / `browseDir` /
`pickRootUri`，恢复出来是「图片列表态」，`browseUp()` 读到空 `current` →
`UP_NAV_NONE` → 只给一句「当前是图片列表，没有上层目录」就返回。

而 `p1` 已经把 picker 原始目录 URI 存进 `lastDirUri` 并在启动时激活了持久授权 ——
它是纯字符串，完全可以还原目录层级，却只交给 `activatePermission()` 用。

| 新增 | 作用 |
|---|---|
| `ResumePlan.restoreUpEnabled()` | `RESTORE_FULL` / `RESTORE_READONLY` 两种模式、且有持久授权目录 URI 时才回填（层级是纯信息，与授权是否有效无关） |
| `DirName.upContextBaseOf()` | 从原始目录 URI 还原真实路径（`hierPathOf` 归一、`upNavStateOf` 校验，判不出层级返回空串） |
| `DirName.upContextRawOf()` | 保留带 scheme 的原始 picker URI（`upParentCandidates` / 逐 URI 授权只认这个形态） |
| `Index.restoreBrowseContext()` | 在 `setItems()` **之后**回填 `browseBase` / `browseDir` / `pickRootUri` / `titlePath` / `canGoUp` |

- **纯字符串、零 IO**：绝不 `listFile` / `statSync` / `openFolder` / `startDirPoll` /
  弹权限框 / 弹选择器，不把历史 appfreeze 请回启动关键路径。
- 两条恢复路径（`restoreFromSnapshot()` 与单张兜底）都在 `setItems()` 之后调用；
  状态栏两处追加「已恢复上次目录「X」· 可继续往上层 · `uc1`」。
- `browseUp()` 的 READONLY 早退收窄为「只读态**且**没有目录层级」才生效 ——
  层级已重建时继续走正常层级链，父目录列不出来由 `showUpListInApp()` 出清单。
- 诊断标记 **`uc1`**（`UP_CTX_TAG`，不是版本号）。

### 实机反馈：点「往上层」不该弹系统选择目录 dialog（2026-11-11 第四次修正）

用户原话：**「现在按回上层回弹出选择目录 dialog，不是我原意，原意是在 app 内可以显示上层档案目录或档案清单」**。

| 环节 | 之前 | 现在 |
|---|---|---|
| 父目录授权还在 | `openFolder(parent)` 成功 → APP 内列父目录清单 | 不变 |
| 父目录授权失效 | 所有同层候选 `listFile` 失败 → `chooseFolderAt()` 拉起系统 `FOLDER` picker 补授权 | **整个 `chooseFolderAt()` 删除**，改 `showUpListInApp()` 在 APP 内左栏出清单，诊断串 `no-picker` |

实现要点（全部纯字符串、**零 IO**，因此启动恢复后也安全，与历史 appfreeze 护栏不冲突）：

- `pathChainOf(target)`（`DirName.ts`）：从卷根到目标父级的**每一级**目录路径，逐条生成可点的
  `ROW_FOLDER` 行；与 `upLevelOf()` 同一口径，相邻两级严格差一层，不会越级。
- `lastUpNames`：会话内进入子目录前记下那一层的真实条目名；`sameDirPath()` 命中时把完整
  「档案清单」也列出来（档案行走 `ROW_OTHER`，只列名字、不解码、不进翻页序列）。
  重启后为空 → 至少列出「当前目录」这个已知子目录 + 卷根到父级的层级链。
- `showUpListInApp()` **刻意不走 `applyItems()`**：那会重设恢复模式 / 提示卡并触发
  `showPreviewOf` / `fillSizes` / `schedulePreload`。这里只提交一份纯清单，
  `restoreMode`、八个 `bulkIoAllowed` 闸门、只读提示卡全部原样保留。
- 停掉 `dirPollTimer` / `rescanTimer`，否则自动重扫会把刚显示的清单覆盖掉；
  回填 `browseBase` / `titlePath` / `canGoUp`，「往上层」可继续逐级上移。
- `inAppUpList` 标记：清单态下点目录行走 `openFolder(uri, true, false)`，
  连「目录内多选」兜底选择器也一并禁掉 —— **按「往上层」及其后任何交互都不弹系统 dialog**。
- UNKNOWN 态（层级判不出的文档 URI）走宽松父级，同样出 APP 内清单，
  不再给「请用选择文件夹重新进入」的死提示。
- 诊断标记 **`ul1`**（`UP_LIST_TAG`，不是版本号）：状态栏 / 提示条带
  「APP 内上层「X」清单（N 项）· 点目录名进入 · 不弹系统选择器 · ul1」，
  右下角诊断串 `up LIST | ul1 | … | no-picker`。

> 「选择文件夹」按钮仍会拉起系统 picker —— 那是用户**主动**选目录，与「往上层」无关。
> 上层清单里的目录行点进去仍走 `openFolder()`（用户主动点击才发生，不是启动期批量 IO）。

### 需求 1 的另一半：退出必须**同步**落盘

`onPageHide()`（切后台 / 锁屏 / 被别的应用盖住）与 `aboutToDisappear()` 都调 `flushPosSync()`：

- SDK 26 的 `putSync`（API 10）/`flushSync`（API 14）同步写 6 个小 key + 落盘，**毫秒级、必达**；
- `exitFlushAction()` 判定：prefs 已在启动时惰性建好（`readLastPos` 会建）→ `SYNC`；
  极端早退还没建好 → 退回 `FLUSH_ASYNC` 的 `flushPos()`；
- **刻意不写大快照**（几百条 uri 同步写会拖慢页面隐藏），快照在换源时已由 500ms 防抖写过；
  真没写过的极端情况由上面的 SINGLE 兜底覆盖；
- `aboutToDisappear` 还会 `clearTimeout(resumeTimer)`，避免恢复在页面销毁后还去改视图。

### 需求 2：当时理解反了（已撤销）

> 本节记录的是**当天早些时候的错误实现**，保留只为排障溯源。
> 当前状态以前文「往上层按钮永不 grey out（2026-11-11 澄清修正）」章节为准。

当时把「grey out」读成「要真正禁用」，于是给 `toolBtn` 加了
`.enabled(enabled)` + 明暗色 / `.opacity(0.45)`，并用 `upEnabledAfterResume()`
在恢复出来的图片列表态强制 `canGoUp=false`。**这是反的**：用户是在抱怨按钮
莫名其妙变灰、点不动，要求把它修回来。该实现已于同日撤销。

### 验证

`node --experimental-strip-types tests/dirname.test.mjs` **238 → 293 → 367 → 419 → 493/493 通过**：
新增 `ResumePlan` 纯函数用例（恢复决策 8 例、单张 uri、延迟安全、退出落盘、快照限幅、
恢复态按钮）与源码静态契约（`onPageHide` / `putSync+flushSync` / 恢复函数体不含重扫与选择器 /
单张兜底撤销落盘等）。其中与「禁用按钮」相关的断言已在澄清修正时一并替换。
中间 74 例覆盖「恢复态守卫」：`restoreModeOf` / `bulkIoAllowed` / `restoreProbeUris`
（优先级、去重、限量、无空串）/ 三种只读提示文案，以及源码静态契约
（探测上限 3、`applyItems` 先落地模式、7 个 IO 入口各有闸门、两条恢复路径都先探授权、
`select/go/browseUp` 有可见反馈、hover 解码被挡、按钮仍无 `.enabled(`、版本未升）。
最后 52 例覆盖本次「目录 URI 持久授权」：`persistAction` / `persistPolicyUris` /
`persistTimeoutSafe` / 三种提示文案，以及源码静态契约（`module.json5` 只声明
`FILE_ACCESS_PERSIST`、两个 SDK 调用各一次且只用 `READ_MODE`、超时竞速与只跑一次的收口、
目录 URI 四处落盘、旧数据迁移提示），并**逐条回归**上一轮的防冻结兜底
（探测上限 3、两条恢复路径先探授权、≥8 个 `bulkIoAllowed` 闸门、按钮仍无 `.enabled(`、版本未升）。
最后 74 例覆盖「往上层改为 APP 内清单」：`pathChainOf`（逐级链、卷根 / 文件系统根、
Windows 盘符、`file://docs` / %XX / ? 参数归一、判不出层级返回空链、与 `upLevelOf` 互逆）、
`inAppUpListHint`，以及源码静态契约（`chooseFolderAt` 已删、`browseUp` 体内无选择器 /
`pickerStartOf` / `isUpTargetOf`、两个失败分支都收口 `showUpListInApp`、清单方法零 IO 且不动
恢复模式、清单行禁文件多选、三条 `inAppUpList` 维护点、诊断串 `no-picker`），
并逐条回归前几轮的护栏（≥8 个闸门、探测上限 3、按钮仍无 `.enabled(`、版本未升）。
状态栏出现 **`rs1`** / **`ro1`** / **`p1`** / **`uc1`** / **`ul1`** 即新包
（都只是诊断标记，**不是版本号**，`APP_VERSION` 仍 1.0.7）。

按 11-10 约定：**未编译 HAP、未放桌面、未升版本、未 push**。
实机请在 DevEco Studio 编译后：

1. 点「选择文件夹」进一个有图的目录、看几张图（这一步建立持久授权）→ 按 Home / 切后台 →
   重开 APP，应自动回到上次那张图，状态栏带 `rs1 · p1 目录授权已持久`，**无需再选文件夹**。
2. 若是刚升级的首次启动：先看只读名单态提示，按提示重选一次该目录，之后重复第 1 步验证。
3. 此时「往上层」**仍是亮着可点的**；点了**不弹系统选择目录 dialog**，左栏直接切换成
   上层目录 / 档案清单（状态栏带 `ul1 · 不弹系统选择器`），点清单里的目录名继续进入；
   父目录授权还在时则照常列出真实清单。诊断串出现 `up LIST | ul1 | … | no-picker` 即新包。

## 往上层：改为 Windows 文件管理器的目录层级语义（2026-11-10）

按钮从「回上层」改称 **「往上层」**，语义从「沿浏览历史回退」改成对齐 Windows 文件管理器的
**向上 / Up**：目标只由**当前路径**决定，每次只进入直接父目录，连续点击逐级到达卷 / 硬盘的
逻辑最上层后停止。

> 下文历史章节里出现的旧按钮名、`dirStack`、「按浏览历史回退」都是**旧实现记录**，
> 现已全部删除；保留文字只为排障溯源。

### 旧实现的问题

| # | 旧行为 | 后果 |
|---|---|---|
| ① | `browseUp()` 优先 `pop` 浏览历史栈 | 栈里存的是「进子目录前的那个目录」，不是当前路径的父级；连续点击沿来路绕圈 |
| ② | 同时用 `browseBase` / `browseDir` / `pickRootUri` 三个锚点各算一次父级再混着试 | 三个锚点可能处在**不同层级**，命中哪个全看授权 → 越级、状态不一致 |
| ③ | 没有「是否仍有父级」的状态 | 到顶了还会继续弹选择器，按钮也一直亮着 |

### 新模型（全部是 `DirName.ts` 纯函数）

| 函数 | 作用 |
|---|---|
| `hierPathOf()` | 把任意 URI 归一成层级计算用路径（去 query / 尾斜杠、还原 `file://docs`、解码 `%XX`） |
| `volumeRootOf()` | 逻辑卷根：`C:` / `/storage/Users/<id>` / `/`；这就是「往上层」能到达的最高层 |
| `dirLevelOf()` | 层级深度，卷根 = L0，用于诊断串与「每步严格 −1」回归断言 |
| `upLevelOf()` | **直接父目录**，严格只剥一层；到卷根 / 解析不出返回 `''`，绝不返回自身 |
| `canGoUpFrom()` | 是否仍有父级，直接复用 `upLevelOf()` —— 只作行为判据与诊断，**不驱动按钮外观**（11-11 澄清修正） |
| `upNavStateOf()` | 区分 图片列表态 / 真到卷根 / 可上移 / URI 层级判不出，避免把解析失败误报成「已到最上层」（11-11 补） |
| `upLooseParentOf()` | UNKNOWN 态严格剥一层的兜底父级；能定出卷根时返回 `''`，绝不越级（11-11 补） |
| `upParentCandidates()` | 同一父层的不同 URI 写法，每个候选都要过 `sameDirPath()` 校验，杜绝越级 / 绕圈 |
| `isUpTargetOf()` | 补授权时只接受直接父级，拒绝自身 / 祖父 / 旁支 / 同名同层旁支 |

### 状态一致性

| 触发点 | 统一动作 |
|---|---|
| `applyItems()` | **唯一刷新点**：同时更新 `source` / `rowCount` / `listW` / `titlePath` / `canGoUp`；`canGoUp = canGoUpFrom(browseBase)` 只是信息状态，**不控制按钮** |
| `openFolder()` | 成功才写 `browseBase`（实测能列的真实路径），失败不改任何状态；**目录浏览态恒列 `..` 行**（11-11 起不再受路径判定影响） |
| `browseUp()` | 成功经 `openFolder → applyItems` 一起刷新当前路径、目录展示、信息状态，并清掉与层级无关的 `pickRootUri` 旧锚点 |
| 三条入口 | 按钮 / `..` 行 / `退格` 全部收口到 `browseUp()`，行为完全一致 |

- **按钮**：`toolBtn('往上层', 'up', true)` —— **恒亮、恒可点，永不 grey out / 永不禁用**
  （11-11 澄清修正）。`toolBtn` 回到三参签名，无 `.enabled()`、无条件颜色 / 透明度，
  从类型上杜绝再次被禁用。`canGoUp` 只用于状态栏文案与诊断串，不传进按钮。
- **点击行为**（三条入口一致，由 `upNavStateOf()` 分派）：

  | 状态 | 行为 |
  |---|---|
  | `GO` | 按 `upLevelOf()` 逐级上移，成功后 `applyItems` 刷新路径 / 目录表 / 信息状态 |
  | `TOP` | 真到卷根 → 「已到卷 / 硬盘的逻辑最上层 · 没有父级了」，不移动、不弹选择器 |
  | `NONE` | 图片列表态 → 「用「选择文件夹」进入目录浏览」 |
  | `UNKNOWN` | URI 层级判不出 → 用 `upLooseParentOf()` 严格剥一层再试；**绝不误报成到顶**，全失败给明确指引 |

- **目录展示**：目录浏览态恒列 `..` 行，与按钮常亮一致；到卷根时点它只给提示、不上移。
- **无浏览历史**：`Index.ets` 里已彻底删掉历史栈，`openFolder()` 的参数也从 `push` 改名为
  `resetView`（只控制「是否从第一张开始」，与父级推算无关）。

### 连续点击示例

```
/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像/编号202601 模特 猫   L4
  → /storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像              L3
  → /storage/Users/currentUser/Download/com.baidu.netdisk.hmpc                   L2
  → /storage/Users/currentUser/Download                                          L1
  → /storage/Users/currentUser   （卷根 L0，提示「没有父级了」，不再上移；按钮仍亮着可点）
```

Windows 盘符路径同样逐级：`C:/Users/foo/Pictures/2020 → … → C:`，停在盘符根而不进「此电脑」；
通用 POSIX 路径停在 `/`。每一步 `dirLevelOf` 严格减 1，不越级、不循环。

### 验证

`node --experimental-strip-types tests/dirname.test.mjs` **204/204 通过**：新增卷根 / 层级深度 /
逐级上行链（鸿蒙路径、Windows 盘符、POSIX）、到顶停止、候选同层过滤、补授权防越级，
以及 22 条源码静态契约（无历史栈、三条入口收口、逐级链等）。按钮相关契约已在 11-11 澄清修正时改为「永不禁用」。
右下角诊断串带 **`up4`** 与 `L4→L3` 层级标记，便于实机截图辨认新旧包；
`UP_NAV_TAG` 只是诊断标记，**不是版本号**。

按 11-10 约定：**未编译 HAP、未放桌面、未升版本（仍 1.0.7）、未 push**。
请在 DevEco Studio 里编译后实机点几次「往上层」确认逐级上移与到顶提示（按钮始终可点）。
> 「重开自动显示上次相片」与「按钮永不 grey out」是 11-11 的后续需求 / 澄清修正，见前文章节。

## 修复：hover 缩略图「不停闪」（2026-11-10，接上节）

现象：鼠标停在左栏档案行，缩略图浮层反复出现 / 消失，闪个不停。
上一轮加的 `HOVER_CLOSE_DELAY_MS = 120` 去抖只把闪烁周期拉长，**没消除**。

### 真正根因：`CustomPopupOptions` 的两个默认值

查本机 SDK 26 `ets/component/common.d.ts` 的 `CustomPopupOptions`（第 13866 行起）确认：

| 字段 | 默认值 | 后果 |
|---|---|---|
| `mask` | **true** | popup 一显示就铺一层覆盖全窗口的透明遮罩，吞掉鼠标事件 → 宿主行立刻收到 `onHover(false)` → 我们收起 popup → 遮罩消失 → hover 恢复 → 又弹出，**自激循环** |
| `autoCancel` | **true** | 页面上任何操作（含鼠标移动）系统都会自行收起 popup，而 `showHover` 仍为 `true` 又把它拉回来 → 两边打架，高频闪烁 |

两者叠加就是「浮层刚出来就消失、又立刻出来」的不停闪。之前所有去抖 / 代号作废都只是在跟这个循环抢时序。

### 改动

| 改动 | 说明 |
|---|---|
| `bindPopup` 加 `mask: false` / `autoCancel: false` / `enableArrow: false` | 关掉遮罩与系统自动收起，浮层显隐**完全由 `showHover` 决定**；`onHover(false)` 也重新变成可信的「真的移出了」事件 |
| 新增 `common/HoverGuard.ts`（纯逻辑，可单测） | 全局唯一浮层：新行 `take()` 时**同步**收起旧行（不等 120ms），旧行 `release()` 只在自己仍是持有者时生效，不会误关后来打开的行 → 快速跨行不再有两个浮层重叠闪 |
| `onMouse(Move)` 不再无条件自动打开 | 这是第二个自激源：`onHover(false)` 后延迟收起，紧接着一次 Move 又打开。现在只在**整台设备从未派发过 onHover**（`hoverSupported === false`）时兜底；浮层已展开时只续命（取消待收起计时器），不打开 |
| `.onHover` 回调里 `noteHover()` | 必须放在 `.onHover` 内而不是 `onHoverChange()` 内，否则兜底自己调用时会把自己禁掉，只派发 onMouse 的设备就永远弹不出浮层 |
| `forceHide()` / `cancelCloseTimer()` | 同步收起与计时器清理收拢成方法；`aboutToDisappear` / `onClick` / 延迟关闭都会 `release()` 持有者 |
| 诊断串 `hv=2` → `hv=3` | 不升版本时靠它确认跑的是新代码 |

**保留不变**：hover 缩略图功能本身、384px / 24 张 LRU / 并发 1 的解码、整行 hover 触发面积、
点击选图、双击全屏、`Ctrl+B`、目录浏览，以及上一节的 `preserveView` 重扫保护。

### 验证

`node --experimental-strip-types tests/dirname.test.mjs` **129/129 通过**：
新增 10 例 `HoverGuard` 状态机行为用例（跨行切换、旧行延迟回调不误关新行、同一行重复 take、
`hoverSupported` 门控）+ 12 例源码静态契约（断言三个 popup 选项、门控条件、take/release/forceHide 调用链）。
`Index.ets` / `DirName.ts` / `HoverGuard.ts` 括号配平 OK，两个纯逻辑模块经 Node 实际 import 解析通过。

按 11-10 约定**未编译 HAP、未放桌面、未升版本**（仍 1.0.7），请在 DevEco Studio 里编译后实机确认。
截图里右下角诊断串末尾应为 `| hv=3`。

> 备注：项目里那个简易「括号配平」脚本曾有 bug —— 进入 `//` 行注释后换行时没把模式复位，
> 导致后续整段被当注释跳过、对含行注释的文件误报未闭合。已在检查时修正（换行复位 `m='c'`），
> 以 Node 实际 `import` 结果为准。

## 修复：hover 缩略图退出后「切回上次档案 / 目录」（2026-11-10）

现象：鼠标停在左栏档案行会浮出缩略图，移开鼠标后，当前显示的图 / 当前目录会被拉回之前那一份。

**根因不在 hover 回调本身**（它只读自己的 `showHover` / `hoverPx`），而是两条间接链路：

| # | 链路 | 后果 |
|---|---|---|
| ① | hover 缩略图要 `decodePx()` **读图片文件** → 目录 mtime 抖动（网盘同步目录还会写本地缓存）→ `startDirPoll()` 每 1.5s 比对 mtime，去抖 900ms 后 `openFolder(browseBase, false)` 自动重扫 → `applyItems()` 里的 `restoreIndex()` + `scrollToIndex()` + `clearPreviews()` + `showPreviewOf()` | 列表滚回「上次位置」、状态栏闪「已恢复上次位置」、预览重解 —— 观感就是「切回上次档案 / 目录」 |
| ② | `onHover(false)` 立刻关浮层，与 `onMouse(Move)` 兜底的 `onHoverChange(true)` 在同一帧抢状态 | `showHover` 高频翻转 → `bindPopup` 反复创建销毁 → `LazyForEach` 列表被反复重建、滚动位置不稳 |

### 改动

| 改动 | 作用 |
|---|---|
| `HOVER_CLOSE_DELAY_MS = 120` + `hoverSeq` / `hoverCloseTimer` | `onHover(false)` 改为**延迟收起**，期间 hover 回来就取消；`aboutToDisappear` / `onClick` 都会清计时器。浮层一帧内不再反复开关 |
| `onMouse(Move)` 兜底加 `!this.showHover` | 只在浮层没展开时补开一次，不再每次 Move 都排队 384px 解码、不再和 `onHover(false)` 抢状态 |
| hover 回调保持**纯预览** | 不调用 `onTap` / `applyItems` / `openFolder` / 不改 `cur`，静态契约测试锁住这一点 |
| `DirName.ts` 新增纯函数 `sameEntryNames()` | 重扫前比对目录条目名集合（顺序无关）；mtime 抖动但名字没变 → **只更新基准值，不重建列表** |
| `openFolder()` 新增 `isRescan` 参数 | 自动重扫时先 `sameDirEntries(names)`，一致就直接 `return true`；`startDirPoll` 改调 `openFolder(browseBase, false, false, true)`（重扫不弹文件多选） |
| `applyItems()` 新增 `preserveView` 参数 | 内容真的变了才重扫，且此时也**不 `restoreIndex`、不 `scrollToIndex`、不 `resetView`、不 `clearPreviews`、不 `showPreviewOf`、不覆盖状态栏**；只按 uri 把 `cur` 对齐到新列表，保持当前图与滚动位置 |
| `diagLine` 末尾加 `hv=2` | 截图一眼分辨新旧包 |

> 取舍：条目**增删 / 改名**仍会自动重扫（且保住当前图与滚动位置）；仅**文件内容变化**（mtime 变、名字不变）不再触发重建，
> 需要刷新时点「排序」或重新「选择文件夹」即可。这样 hover 解码不会再扰动视图。

验证：`node --experimental-strip-types tests/dirname.test.mjs` **107/107 通过**
（新增 6 例 `sameEntryNames()` 纯函数 + 19 例源码静态契约，断言 hover 回调不碰选中态、延迟关闭、
重扫跳过 / `preserveView` 分支不恢复位置等）、括号配平 OK。
按 11-10 约定**未编译 HAP、未放桌面、未升版本**（仍 1.0.7），请在 DevEco Studio 里编译后实机确认。

## 按钮区精简 + 档案列表列宽自适应（2026-11-10）

按用户要求**只调整按钮区域与档案列表布局**，其余按钮、功能、事件与交互一律不变，
不新增 / 改名 / 重排其他控件。

### 按钮区

| 改动 | 说明 |
|---|---|
| 顶栏移除 `选择图片` 与 `回到上次` | 连同 `doAction()` 的 `case 'files'` / `case 'resume'` 一起删除；顶栏只剩 `全屏` / `幻灯片` |
| 界面文案清理 | 初始状态栏、空态提示、启动提示、多选取消 / 列目录失败的提示，全部改为指向 `选择文件夹`；结果类文案改成「恢复上次位置」—— 界面上不再出现这两个入口名 |
| 底层方法保留 | `openFiles()` / `resumeLast()` / `loadAllGallery()` / `openGallery()` 不删，仍被 `openPicker()` 内部降级链与启动预热复用；只是不再有 UI 入口（与 v1.0.6 处理 `openGallery()` 的方式一致） |
| 左栏三个按钮合并为一行 | `排序 ↑ / ↓`、`往上层`、`选择文件夹` 放进同一个 `Row()`；`toolBtn` 的 `layoutWeight(1)` 三等分、统一 `margin(3)` 保证水平间距一致，统一 `height(30)` + `alignItems(VerticalAlign.Center)` 保证垂直对齐；删掉原来的第二行，按钮区不再有多余垂直空白 / 重叠 / 错位 |

> 三个按钮**保持原文字与 act 不变**（`sort` / `up` / `folder`），只是从两行改为一行。
> `LIST_W = 280` 作为左栏下限，正是「一行三个按钮等宽且不挤」的安全宽度。

### 档案列表

| 改动 | 说明 |
|---|---|
| `DirName.ts` 新增 `textWidthVp()` / `listWidthForNames()` | 纯函数估算最长档案名所需宽度（CJK 按 1 字宽、数字/大写 0.6、其余半角 0.55），加上固定列开销 226vp 得到目标列宽；夹在 `[LIST_W=280, LIST_MAX_W=900]` 内 |
| `@State listW` | `applyItems()` 里按当前 `rows` 重算，`build()` 用 `.width(this.listCollapsed ? LIST_COLLAPSED_W : this.listW)`；**短名字收窄少留白、长名字放宽不截断**；收起态宽度不变 |
| 档案名 Text 加 `constraintSize({ minWidth })` | `layoutWeight(1)` 分配时至少给到名字内容宽，双保险不出现省略号；仅超过 900vp 上限的超长名才由 `Ellipsis` 兜底 |
| 行高压缩 | 行首图标 `height 42 → 26`、行 `padding` 上下 `6 → 2`、`List space 4 → 2`：每行约 **54vp → 30vp**（约 −44%）；**字号保持不变**（名字 12 / 体积、日期 10），可读性不受影响 |

验证：`node --experimental-strip-types tests/dirname.test.mjs` **82/82 通过**
（新增 11 例宽度纯函数 + 12 例源码静态契约，断言两个按钮 / 两个 case 已消失、三个按钮同一行、
列宽与行高改动到位）、括号配平 OK。
按 11-10 约定**未编译 HAP、未放桌面、未升版本**（仍 1.0.7），请在 DevEco Studio 里编译后实机确认。

> 下文「`选择图片` 的两条路线」「权限降级链」等历史章节仍保留作排障记录，
> 其中提到的两个按钮指**已移除的入口**，底层扫描 / 快照 / 权限逻辑仍在被内部降级链复用。

## 选择文件夹后「零图片目录」显示空白（2026-11-10 修复）

现象：选择 `/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像` 后左栏一片空白。
该目录下全是「编号202601 模特 猫」这样的**子文件夹、没有一张图片**。
期望：像 Win64 文件浏览器一样，**不管有没有照片，都要把目录表列出来**。

根因是三个叠加，全部在显示/分支层，不是目录读取失败：

| # | 原因 | 后果 |
|---|---|---|
| ① | 左栏 `build()` 用 `if (this.itemCount === 0)` 判空态，而 `itemCount` **只统计图片数**（`applyItems` 里 = `imgs.length`） | 零图片目录被整块换成「还没有图片」提示，`rows`（含 `..` 和所有子文件夹）**一行都不渲染** → 全白 |
| ② | 逐 URI 授权下 `fs.statSync(child)` 常失败，子文件夹拿不到 `isDirectory()` | 名字不带图片后缀 → 全被归为 `ROW_OTHER` 灰行，显示「不支持预览」且**点不进去**，等于没有目录表 |
| ③ | 「能列目录但子文件读不了」时 `openFolder()` 直接 `chooseFilesInDir()` + `return false` | 目录态根本不建立（`applyItems` 没执行），用户取消多选后左栏依然是空白 |

| 改动 | 说明 |
|---|---|
| 新增 `@State rowCount`（= `this.rows.length`） | `applyItems()` 里与 `itemCount` 同步赋值；`build()` 空态判断改为 `if (this.rowCount === 0)`。**零图片但有子文件夹时列表照常渲染** |
| 新增 `@State dirHint` | 零图片目录在列表上方显示「本层没有图片 · N 个子文件夹（点名称进入）」，右侧空态同步提示「点左侧文件夹进入子目录」；`setItems()`（非目录态）清空 |
| `openFolder()` 分类增加 `statOk` | `statSync` 失败且名字不带图片后缀时按 `ROW_FOLDER` 列出，子文件夹可点击进入；`statSync` 成功时仍按真实 `isDirectory()` 判断，行为不变 |
| 兜底不再 `return false` | 改为 `needFileFallback` 标记：**先建立目录态并 `applyItems()` 列出目录表，末尾再弹多选选择器**。取消多选 → 目录表还在；全选确认 → 换成图片列表。既保留「读不出图片」的补救，又不吞掉目录表 |
| 状态栏 | 零图片时明确写「本层没有图片 · N 个子文件夹」；日志补 `rows=%{public}d` 便于核对 |

> 取舍：`statSync` 失败时，无图片后缀的项一律按文件夹列出。若目录里真有无后缀的普通文件，
> 会被显示成文件夹、点进去提示「无法列出该目录」——比原来「不支持预览」灰行更可操作，
> 且不会影响已能正常 `stat` 的目录。

**回归保护**：`tests/dirname.test.mjs` 末尾新增「源码静态契约」7 例，断言空态判断用
`rowCount`、不再用 `itemCount`、`rowCount` 在 `applyItems` 同步、`dirHint` 存在、
`statOk` 分支存在、兜底不再 `return false`。`node --experimental-strip-types tests/dirname.test.mjs`
**59/59 通过**，括号配平通过。

> 按 11-10 约定**未编译 HAP、未放桌面、未升版本**（仍 1.0.7），请在 DevEco Studio 里编译后实机确认。

## 往上层「仍然失败」二次修复（2026-11-10，接上节）

上节修完后实机点「往上层」仍无反应。复查整条链路（按钮绑定 → `browseUp` → `openFolder` → 授权兜底）后，
确认前两处根因已修对，但**最后一环的 picker 起点传错了**：

| # | 问题 | 后果 |
|---|---|---|
| ③ | `chooseFolderAt(parents[0])` 把 `parents[0]` 当「已授权 URI」传给 `defaultFilePathUri` | `parents[0]` 实际是 `browseBase` 推出的**纯文件系统路径** `/storage/…/人像`，或根本没授权的父 URI。`DocumentViewPicker` 对这种起点会直接 reject / 忽略定位 → 兜底选择器没弹出来，用户看到「仍然没反应」 |
| ④ | 全过程只有一行状态栏文字（单行 Ellipsis） | 卡在哪一步、装的是不是新包，完全看不出来，只能靠猜 |

| 改动 | 说明 |
|---|---|
| `DirName.ts` 新增 `pickerStartOf()` | 只挑**带 scheme 且已授权**的当前目录原始 uri 作起点；纯路径 / 未授权父 URI 一律返回空串（不设起点），避免 reject |
| `chooseFolderAt(targetName)` | 起点改为当前已授权目录 → picker 打开停在当前层，用户点一次「上层」再确认即可拿到父目录授权；带起点被 reject 时**自动去掉起点重试一次**，保证选择器一定能弹出 |
| 「选中的还是当前目录」判断 | 用户在 picker 里没进上层就点确认时，明确提示去点「上层」，不再重新列一遍当前目录造成「没反应」 |
| `openFolder()` 返回值检查 | 补授权后列目录失败时给明确提示，不静默 |
| `browseUp()` 全过程上屏 | 右下角诊断串依次写 `up START`（版本号 + 锚点 + base/raw）、`up N/M | try=…`、`up FAIL | cands all denied | target=…`；成功则由 `openFolder` 换成新目录诊断串。**点一下截图即可判断是不是旧包、卡在哪一步** |

> 📌 逐 URI 授权是系统限制，无法通过字符串变换绕过：祖先目录没授权时，必须让用户
> 在 picker 里确认一次。现在状态栏会写明目标目录名（例如「请在选择器里点『上层』进入『人像』并确认」）。

验证：`tests/dirname.test.mjs` **52 例全通过**（新增 6 例 `pickerStartOf()`）、括号配平通过。
按 11-10 约定**未编译 HAP、未放桌面、未升版本**（仍 1.0.7），请在 DevEco Studio 里编译后实机确认。
若仍不对，请截右下角诊断串——它会直接显示是 `up START`（新代码已跑）还是旧串（装的还是旧包）。

## 往上层在「人像/编号202601 模特 猫」没反应（2026-11-10 修复）

现象：选择文件夹 `/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像/编号202601 模特 猫`
后，点左栏「往上层」完全没反应；期望回到 `…/人像/` 并显示该目录名。

根因有两个，叠在一起：

| # | 原因 | 后果 |
|---|---|---|
| ① | 本地 `dirOf()` **不去尾部斜杠** | picker 返回的目录标识常带 `/`，`lastIndexOf('/')` 落在最后一个字符，`substring(0, i)` 得到的还是**自己**（只少一个斜杠），`openFolder()` 又列了一遍同一个目录 → 界面原地不动 |
| ② | picker 授权是**逐 URI** 的 | 祖先目录（`人像`）没拿到授权，只拿一个父候选去 `listFile` 常常全部失败；旧代码只在状态栏写一句「往上层失败」，很容易被当成没反应 |

| 改动 | 说明 |
|---|---|
| `DirName.ts` 新增 `realPathOf / parentDirOf / parentDirCandidates` | 先去 `?` 与尾斜杠再取父级；`file://docs/...` 还原成 `/storage/...`；`%XX` 安全解码；已是根返回空串；**绝不返回自身** |
| 父候选按优先级逐个试 | ① 保留 scheme 的父 URI → ② 解码后的父 → ③ 真实路径父，每个再经 `dirCandidates()` 展开一次，命中哪个用哪个 |
| `browseUp()` 改 async + 循环 | 状态栏先显示 `往上层 → 人像`；成功才 `pop dirStack`，失败可重试；不再静默 |
| `openFolder()` 新增 `allowFileFallback?` | 「往上层」传 false：不再弹「目录内多选」，`setItems()` 也就不会把刚进去的目录态清掉 |
| 新增 `pickRootUri` | 记住最近一次「选择文件夹」的原始 uri；目录态被「目录内多选」清掉后仍能算出上层。成功进入上层后清空，避免连续往上层时算出「倒退回刚离开的目录」的候选 |
| 新增 `chooseFolderAt()` | 所有父候选都因无授权列不出时，拉起 `FOLDER` picker 补授权（⚠️ 初版把 `defaultFilePathUri` 指向未授权的父目录导致仍失败，已在下节二次修复） |
| `applyItems()` 标题栏 | `dirOf()` → `parentDirOf()`，统一走新口径 |

验证：`tests/dirname.test.mjs` **46 例全通过**（新增 17 例覆盖尾斜杠、中文空格、`%XX`、文档 URI、`?` 参数、根路径、候选不含自身）。
> 按 11-10 约定**未编译 HAP、未放桌面**，请在 DevEco Studio 里编译后实机确认。

## 取消左栏 8 个视图按钮（2026-11-10，v1.0.7）

按用户要求把左栏底部 4 行 × 2 列的视图控制条整体去掉：
`适应` / `1:1` / `－` / `＋` / `左旋` / `右旋` / `镜像H` / `镜像V`。

| 改动 | 说明 |
|---|---|
| 删除 `build()` 里的底部 `Column()` 视图控制条 | 8 个 `toolBtn()`、容器与顶部分隔线一并移除；左栏列表多出约 160vp |
| `doAction()` 移除 8 个 case | `fit / one / zin / zout / rotl / rotr / fliph / flipv` 不再有 UI 入口 |
| 底层方法保留 | `zoomBy / resetView / zoomPixelPerfect / rotateBy / toggleFlipH / toggleFlipV` 仍被键盘、滚轮、鼠标键直接调用，功能不丢 |
| 左栏剩余按钮 | `排序 ↑/↓`、`往上层`、`选择文件夹`、分隔条 « / » 均保留（不在本次取消范围） |
| `versionCode 7` / `versionName 1.0.7` | 每次改版必升版本，避免 `bm install -p` 覆盖同版本包被 BMS 跳过；顶栏显示 `PIKAN 1.0.7` |

快捷键替代：滚轮翻页、**Ctrl + 滚轮**缩放、`↑` / `↓` 缩放、左键放大 ×1.5、右键还原、
`R` / `Shift+R` 旋转、`Shift+H` / `Shift+V` 镜像、右键画布或 `0` 复位适应、`F` 切 1:1、双击全屏。
若以后要恢复按钮，把 `build()` 里的 `Column()` 与 8 个 `toolBtn()`，以及 `doAction()` 的 8 个 case 加回即可。

## 取消「打开图库」按钮（2026-11-10，v1.0.6）

按用户要求把顶栏的 `打开图库` 按钮去掉，界面上不再出现指向该入口的任何提示。

| 改动 | 说明 |
|---|---|
| 顶栏移除 `toolBtn('打开图库', 'gallery', false)` | 现在顶栏依次是 `选择图片` / `回到上次` / `全屏` / `幻灯片` |
| `doAction()` 移除 `case 'gallery'` | 不留隐藏触发路径，按钮取消即入口消失 |
| 空态提示 / 初始 `status` / 启动提示 | 统一改为「点顶栏『选择图片』挑文件，或『选择文件夹』浏览目录」；启动提示只指向「回到上次」 |
| `openGallery()` 保留但不再接 UI | 它内部的 `scanAll` / `restoreFromSnapshot` / 选择器兜底，与「回到上次」复用同一套能力；注释标注【已停用】，将来要恢复只需加回按钮与 case |
| `versionCode 6` / `versionName 1.0.6` | 沿用 v1.0.5 的教训：改版必升版本号，避免 `bm install -p` 覆盖同版本包被 BMS 跳过；顶栏显示 `PIKAN 1.0.6` |

**功能不受影响**：`选择图片`（系统文件选择器）、`选择文件夹`（目录浏览，含中文 / 多级路径 / 往上层）、
`回到上次`（全量扫描或 uri 快照恢复）三条路径都保留。
下文「appfreeze 排查」「`打开图库` 的两条路线」「权限降级链」等历史章节仍保留作排障记录，
其中提到的 `打开图库` 指这个**已移除的入口**；其底层扫描 / 快照 / 权限逻辑仍在被 `回到上次` 使用。

## 版本可辨识 + 目录诊断上屏（2026-11-10，v1.0.5）

用户实机反馈「刚修的左列表问题还没有 fix」。排查后确认**源码与 HAP 都是对的**
（解包 `ets/modules.abc` 能命中 `dirDisplayName` / `stripTrailingSlash` / `读取预览` /
`dirLabel` / `browseUp` / `chooseFilesInDir`），但存在一个真实的交付缺陷：

> 11-04 起四次修复（全量对齐、目录 URI、往上层 + 缩略图、目录名）**全部共用
> `versionCode 4 / 1.0.4`**。`bm install -p` 覆盖同版本包时可能被 BMS 跳过，
> 界面上也**没有任何东西能分辨装的是哪一版**——用户看到的很可能仍是旧包。

| 改动 | 作用 |
|---|---|
| `versionCode 5` / `versionName 1.0.5` | 覆盖安装必然被当作升级接受；`APP_VERSION` 同步，顶栏显示 `PIKAN 1.0.5` |
| 左栏抬头常驻 `v1.0.5` | 顶栏自动隐藏时也能从截图分辨新旧包（只改文字，不动控件与样式） |
| `@State diagLine` | 目录浏览态把 `v1.0.5 \| dir=<显示名> \| raw=<picker 原始 uri> \| base=<实测路径>` **11-11 起默认不画在右下角**（`SHOW_DIAG_BADGE=false`），需要截图排查时把开关改 `true` 即可恢复；非目录态为空 |
| `install-PIKAN.sh` 打印包内 `versionName` | 终端里就能对照「装的哪个版本」与「界面显示哪个版本」 |
| hover 加 `onMouse(Move)` 兜底 | 2in1 上 `onHover` 可能不派发；`onMouse` 是滚轮/点击已在用的可靠通道。SDK 26 的 `MouseAction.Hover` 官方标注 *has no effect*，故只认 `Move`；并加 `showHover` guard 防重复排队解码 |

**为什么需要「把诊断画到屏幕上」**：WorkBuddy agent 运行在 uid `20020176`，
与桌面文件 owner `20001006`、用户终端 `20020101` 不同域，实测
`hidumper` / `hilog` / `bm` 全部 `Permission denied` 或 `failed to execute your command`，
机器里也没有 `snapshot_display` / `screencap` / `uitest` 等截屏工具——
**agent 侧无法截屏、也无法读实机日志**。所以用「一张截图能带全的诊断角标」替代。

> **2026-11-11 变更**：用户要求「预览右下角只显示缩图百分比，缓存数量」，
> 诊断角标默认隐藏（`SHOW_DIAG_BADGE = false`）。下文所有历史章节里写的
> 「截右下角诊断串」仍然可用，但**需先把 `Index.ets` 顶部的 `SHOW_DIAG_BADGE` 临时改成 `true`**
> 再编译；`diagLine` 的全部赋值点与 HiLog 输出都保留，开关不改变任何业务流程。

`devecocli build`：`BUILD SUCCESSFUL`，0 ERROR；回归测试 29 例仍全通过。

## 目录名显示缺陷：左栏抬头空白（2026-11-10 修复）

复现：选择文件夹 `/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/人像`
（或同类中文 / 多级路径）后，**左栏抬头的目录名为空白**，期望显示「人像」。

### 根因

左栏抬头是 `Text(this.source)`，值来自 `openFolder()` 里的
`applyItems(imgs, baseName(base), '', rows)`。而旧 `baseName()` 是：

    const i = s.lastIndexOf('/');
    return i >= 0 ? s.substring(i + 1) : s;

`DocumentViewPicker(FOLDER)` 返回的目录标识**常带尾部斜杠**（`.../人像/`），
`lastIndexOf('/')` 正好落在最后一个字符，`substring(i + 1)` 返回 `''` —— 抬头就整条空白。
中文目录名还可能被 `%XX` 编码、套 `file://docs` 文档 URI、后面带 `?` 参数，
旧实现一样处理不了，显示成乱码串或直接缺失。

`人像` 这类目录又恰好**只有子文件夹、本层零图片**：`probeChild()` 找不到图片可抽查，
`base` 会退到 `fallbackBase`（第一个能 `listFile` 的候选，往往是原始 URI），
把上面几种形态全叠在一起，缺陷必现。

### 修法

| 改动 | 作用 |
|---|---|
| 新增 `common/DirName.ts` | 把 `baseName` / `dirDisplayName` / `stripTrailingSlash` 抽成不依赖 SDK 的纯函数，集中修、可直接用 Node 测 |
| `stripTrailingSlash()` | 去 `?` 参数与 1~N 个尾部斜杠，保留根 `/` 与 scheme 的 `//` |
| `baseName()` | 去尾斜杠 → 安全 `decodeURIComponent` → 取末段；末段为空退回整串，最终兜底「（未命名）」，**恒不返回空串**；普通文件名行为不变 |
| `dirDisplayName(base, raw, candidates)` | 在实测 base、picker 原始 uri、其它候选里逐个取末段，跳过 `file://docs` 碎片与仍是 `%XX` 的串，挑第一个可读目录名；全失败兜底「目录」 |
| `openFolder()` 统一用 `dirLabel` | 左栏抬头 `source` 与三处状态栏文案全部改用同一个 `dirDisplayName()` 结果，中文 / 编码 / 多级路径都显示正确 |
| `joinBase` 规范化 | 拼 child 前 `stripTrailingSlash(base)`，避免 `.../人像//xxx` 让 `fs.statSync` 认不出子目录（顺带修好子目录被误列成灰色「不支持预览」行） |
| `hilog` 打点 | `openFolder dirLabel=... base=... raw=...`，实机一眼能核对系统到底给了什么形态 |

**刻意保持不变**：`dirCandidates()` 的候选生成与挑选顺序、`probeChild()` 的判据、
`rows / items` 结构、`itemIndex` 单向挂钩、`selected` 选中状态、列表点击 / 双击 /
悬停交互、三栏样式与配色，全部未动。本次只改「显示名怎么算」和「拼 child 时去掉尾斜杠」。

### 回归测试（直接跑源码，不是复制实现）

纯函数在 `.ts` 模块里，Node 24 可直接 type-strip 加载：

```sh
node --experimental-strip-types tests/dirname.test.mjs
```

29 条用例，覆盖：

- 现场路径 `/.../人像`、带尾斜杠 `.../人像/`、双尾斜杠 `.../人像//`；
- `file://docs` 文档 URI + `%E4%BA%BA%E5%83%8F` 编码 + `?` 参数；
- 多级中文路径 `.../人像/编号202601 模特 猫/`、中文 + 空格、纯 ASCII `DCIM`、顶层 `/人像/`；
- 普通文件名不受影响、字面 `%` 不误伤、空串 / 根 `/` 兜底非空；
- `dirDisplayName()` 多候选择优、URI 碎片靠 candidates 救回、全失败兜底。

结果：`ALL PASS  29 passed, 0 failed`；`devecocli build`：`BUILD SUCCESSFUL`，
33 tasks 全量重编，**0 ERROR**（仍是既有 7 条 WARN）。

实机若仍有异常，抓 `openFolder dirLabel=` 一行即可定位：
`hilog | grep HeicViewer`。

## 「选择文件夹」读不出图片（2026-11-09 修复）

复现：选 `/storage/Users/currentUser/Download/com.baidu.netdisk.hmpc/编号202601 模特 猫`
（40 张 `DSC*.jpg`，每张 18–30MB）后，列表 / 主视图一片空白。

### 为什么会这样

`DocumentViewPicker` 的 **FOLDER 模式返回的目录标识形态不统一**：

- 可能是 `file://docs/...` 这类文档 URI（`fs.listFile()` 往往不接受）；
- 可能带百分号编码（中文目录名、空格被 `%XX` 化）；
- 也可能是直接的沙箱 / 绝对路径。

而 picker 的授权是**逐 URI**的：**能列出目录 ≠ 能读子文件**。旧实现只拿原始 uri
硬拼 `dirUri + '/' + name`，拼出来的子路径既可能形态不对、也可能没有授权；
偏偏 `decodePx()` 的 `catch` 是静默 `return undefined`，于是屏幕全白、日志全无，
排查全靠猜 —— 这才是这个 bug 最难缠的地方，不是显示层的问题。

### 修法

| 改动 | 作用 |
|---|---|
| `dirCandidates(raw)` | 生成候选写法：原始 uri、`decodeURIComponent`、`new fileUri.FileUri(raw).path`（解码后的真实路径）、`u.toString()`、手工剥掉 `file://<authority>` 前缀；去重后逐个试 |
| `probeChild(base, names)` | 对每个候选抽查前 3 张图片能否 `fs.openSync()` —— 能列目录不算数，**能读子文件才算**；连试 3 张避免被单张坏图误判 |
| `openFolder()` 自动选 base | 优先用「子文件真能打开」的那个候选，并用它拼所有 child；某些实现直接返回完整路径时不再重复拼接 |
| `chooseFilesInDir()` 兜底 | 若所有候选都读不了子文件，自动弹一个以该目录为 `defaultFilePathUri` 的 **FILE 多选选择器**，`Ctrl+A` 全选即可看图（每个文件单独授权，解码一定成功） |
| `decodePx` catch 不再静默 | 打 `decodePx FAIL uri=... err=...`；`chooseFolder` / `listFile` / `probeChild` / `openFolder done` 全链路打点 |
| 状态栏 | 「0 张可预览」时列出支持后缀；授权失败时明确写「子文件无读取授权」，不再假装载入成功 |

### 立即可用的绕路

顶栏 **「选择图片」** → 多选这 40 张 JPG（`DocumentViewPicker` FILE 模式，一次最多 500 个），
每个文件都会单独拿到 URI 授权，一定能显示。

### 如果还不行

把状态栏那行字 + HiLog 贴回来即可定位，日志 TAG 为 `HeicViewer`：

```
hilog | grep HeicViewer        # 或 hdc shell "hilog | grep HeicViewer"
```

重点看这几行：`chooseFolder picked uri=`（系统到底给了什么形态）、
`listFile OK/FAIL [n]`（哪种写法能列）、`probeChild FAIL`（子文件为什么打不开）、
`decodePx FAIL uri=`（最后卡在哪一步）。

## 往上层失效 + 左栏缩略图按需显示（2026-11-09 修复）

### 1. 「往上层 / `..` / 退格」点了没反应

`chooseFolder()` 是 `dirStack = []` + `openFolder(uris[0], false)`（`push=false`）进入首个目录的，
**栈永远是空的**；而旧 `browseUp()` 第一句就是 `dirStack.length === 0 → 提示「没有上层目录」并 return`。
用户只要没先钻进子目录，往上层必然被这句拦死 —— 这就是实机反馈「不能用」的全部原因。

| 改动 | 作用 |
|---|---|
| 新增 `browseBase` | 记下 `openFolder()` 实测「能 `listFile` 且子文件能 `open`」的**真实路径**；原始 uri 可能是 `file://docs/...` 或 `%XX` 编码，`fs.statSync` 认不出来 |
| `browseUp()` 改走两条路 | 进过子目录 → pop 栈里的真实路径（必定可列）；直接选的目录 → 用 `dirOf(browseBase)` 上溯一级真实路径 |
| 先 peek、成功后才 pop | `openFolder()` 改为返回 `Promise<boolean>`，失败时**栈不丢、可重试**，并明确提示「上级目录没有读取授权」，不再静默 |
| 压栈改存 `browseBase` | 以前压的是 picker 原始 uri，回退时还得重新猜形态；现在压真实路径，直接可列 |
| `setItems()` 清目录态 | 从目录浏览切回「打开图库 / 选择图片」时清 `browseDir / browseBase / dirStack` 并停掉 1.5s 轮询 —— 否则旧目录一变动就会把用户刚选的图覆盖掉，标题栏也一直挂着旧路径 |
| 轮询 / 重扫 / 排序 / 标题栏 | 一律改用 `browseBase` 真实路径，`tryMtime()` 才取得准，标题栏也不再是一串 `%XX` |

> 边界：`dirOf()` 上溯到根目录时会得到自身，`browseUp()` 拦住并提示「已经是最上层目录」，
> 不会无限往上跑。若上级目录确实没有读取授权，状态栏会直说，而不是假装在目录浏览态。

### 2. 左栏不常驻缩略图，mouse over 才显示

左栏以前每行都在 `aboutToAppear()` 里排一个 128px 缩略图解码任务（`ThumbLoader` 行内实例：
600 张 LRU / 并发 3）。大图库滚动时这几百个解码请求会和预载抢内存与 CPU。

- 行内缩略图列整个删掉，只留一个 **18vp 的类型标记**（图片 `·` / 目录 `▣` / 上级 `↑`），
  档案名多出 38vp；
- `aboutToAppear()` **不再解码任何图**，滚动列表时一张缩略图都不解；
- `onHover` / `bindPopup` 从「档案名 `Text`」移到**整行 `Row`**：鼠标划过图标、字节、日期列
  都能出图，触发面积大得多（以前必须精确压在档案名上）；
- 只保留一套 `ThumbLoader`：384px 档 / 24 张 LRU / 并发 1；未就绪显示「读取预览…」占位，
  不再用行内小图顶，也不触发任何原图解码；
- 目录行 / 灰行不弹；点击、离屏、划走立刻收起。

`devecocli build`：`BUILD SUCCESSFUL in 10 s 982 ms`（0 ERROR，两次分别验证往上层与缩略图改动）。

## 移植自 Win64 版的四项优化（2026-10-28）

参照 `PIKAN-Win64` 那边的实测结论（10-27 六个提交）回移植。核心是同一条：
**切图不再等解码**。

| # | Win64 提交 | 鸿蒙版改法 |
|---|---|---|
| ① | `51ac4d3` 切图卡顿真因 | 预载档位不再是固定 768px，改由 `preloadEdge()` 按画布尺寸动态取（**向上**量化到 256 倍数，夹 [1024,1536]）。向下量化会让档位小于屏幕实际像素，于是每张命中缓存的图都还要再解一次全清 —— 那才是卡顿来源 |
| ② | `042d2fe` 命中即刻上屏 | `showPreviewOf()` 命中缓存 → `showDecoded()` 直接上主视图，**不再解全清**；只有 `showNeed()` 判定档位不够（多半是放大了）才停手 `UPGRADE_DELAY_MS = 250ms` 补一张，连续翻页会被下一切图作废 |
| ③ | `042d2fe` 取消动态模糊 | 命中/到位一律瞬时替换。保留 `FOCUS_BLUR = false` 开关，改 true 即回到「低清 + 大模糊 → 分档对焦 → 淡出」的老效果（`startFocus` / `finishFocus` / `BLUR_*` 都还在） |
| ④ | `8cde542` 窗口环绕 | `go()` 本来就是模运算循环，而缓存窗口按线性截断 → 跨首尾要重解一批。现 `inWindow()` / `evictOutside()` / `preloadNext()` 三处统一环绕（图库比窗口小时取 `min(span, n-1)`） |

顺带两项（同源思路）：

- **滚轮去掉定时节流**（`649a79c`）：原先「每 120ms 最多翻一张」会把每次切换推迟 40~125ms、
  还会攒成一次跳 2~3 张，滚轮明显比键盘慢。现在预载已是「可直接显示」的清晰度，
  防堆积交给代号校验（在途回调一律作废），不再牺牲跟手感。
- **全清系数 2 → 1.5**（`51ac4d3`）：`viewEdge()` 由「画布长边 ×2」改为「×1.5」，
  下限 1600 → 1200。×2 时一张大图能解 1 秒多，而屏幕实际只需要约 1 倍像素。

所有权细节（易踩）：命中缓存时 `viewPixelMap` 指向的是**缓存持有**的 PixelMap，
不能交给 `viewOwned`（那是「自己解的、要自己 release」）；
缓存侧 `pushPreview` / `evictOutside` 已跳过正被显示的那张，不会花屏。

Win64 的 GPU 显存常驻（`8684c80`）与 CUDA 精修不移植 —— 鸿蒙侧由 ArkUI 渲染服务自动管理。

### GPU 加速
预览与缩略图均使用 ArkUI `Image`（`interpolation: High/Medium`），由平台渲染服务做
纹理上传与合成缩放/旋转，已走硬件加速，满足"快速 + GPU 加速"。

### 滚轮翻页
API 26 起 `MouseEvent` 不再提供 `scrollY` / `ctrlKey`，`@ohos.multimodalInput.mouseEvent`
也不再导出 `MouseAction`；官方要求滚轮改走**轴事件**：

```ts
.onAxisEvent((event: AxisEvent) => {
  const v: number = event.getVerticalAxisValue(); // 注意是「方法」不是属性
  ...
  this.go(v < 0 ? -1 : 1);
})
```

`AxisEvent` 无修饰键字段，`Ctrl` 由 `onKeyEvent` 跟踪 `KEYCODE_CTRL_LEFT/RIGHT` 的按下/抬起得到；
按住 `Ctrl` 滚轮改为缩放，与翻页互不冲突。

### 快速滚动不再「图片移位」

原实现是「来一个轴事件就翻一张 + 120ms 去抖」，快速滚动时会出现图片跳动 / 错位，原因有三：

1. **解码跟不上**：轴事件频率远高于一张图的解码速度（HEIC 尤其慢），
   解码队列堆积，预览层与原图层来回交替，原图可能还停留在上一张。
2. **预览层被提前撤掉**：上一张图的 `onComplete` 可能晚于本次切换才到，
   却把 `fullLoaded` 置成了 true，于是本张的低清预览被撤掉、露出还没解码完的原图层。
3. **左侧列表在追动画**：`scrollToIndex` 默认带平滑动画，每次切换都重启一段动画，
   列表永远落后当前项，观感上就是「图和列表对不上」。

对应三处修复：

1. **去抖 + 合并**（`onWheel()` / `flushWheel()`）：
   同一短窗口内同方向事件只算一步（去抖），攒下的步数再按 `WHEEL_STEP_MS` 的节奏
   **合并成一次跳转**，只渲染最终落点那一张 —— 中间张根本不解码。
   这是关键收益：既保留了滚动量，又让解码永远跟得上。
2. **`curToken` 代号校验**：`Image.onComplete` 回调只对得上当前代号的才生效，
   迟到的旧回调一律忽略，预览层不会被提前撤掉。
3. **`scrollToIndex(cur, false)`**：翻页时不做平滑动画，列表瞬时对齐。

> 可调常量：`WHEEL_NOTCH_MS`（同刻度去抖窗口，若实机上一个刻度被算成两步就调大）、
> `WHEEL_STEP_MS`（实际切换的最小间隔，解码越慢越要调大）。

### 滚轮会被当成「拖拽平移」——大图被滚得上下跑

现象：**快速滚动时，向下滚大图整体上移、向上滚整体下移**，松手后还停在偏移位置。

根因不在翻页逻辑，而在手势：在 PC / 2in1 上，**滚轮 / 触控板滚动会被 ArkUI 一并派发给
`PanGesture`**（当作一次拖拽）。于是画布真被平移了 —— 向下滚 `offsetY` 为负 → 大图上移，
方向完全对得上。`go()` 里的 `resetView()` 每次切图都把 `tx/ty` 清零，但平移是在切图**之后**
打进来的，所以偏移会残留下来。

处理（`WHEEL_PAN_GUARD_MS = 300ms`）：

1. 轴事件到来时置 `wheelActive = true`，300ms 后自动解除；`PanGesture.onActionUpdate`
   里若 `wheelActive`（或 `lastAxisMs` 很近）就**忽略这次平移**。
   两个条件并存是为了不依赖「轴事件与手势谁先到」。
2. 屏蔽期间同步 `baseTx/baseTy = tx/ty - offset`，窗口一过就能从当前偏移接着拖，不会突然跳一大段。
3. 翻页的滚轮一动就 `tx = ty = 0`，万一已被带偏立刻纠正（`Ctrl + 滚轮` 是缩放，不动平移）。

手指/鼠标的真实拖拽不受影响 —— 它们根本不产生轴事件。

### 鼠标左 / 右键缩放

预览区 `.onMouse()` 里，**左键 ×1.5（放大 50%）、右键 ×2.0（放大 100%）**，均以**光标位置为锚点**。

- **区分点击与拖拽**：拓展时也 down→move→up 三态。按下到抬起若位移超过 `CLICK_MOVE_TOL`（4vp）
  就判定为拖拽平移，**不触发点击缩放** —— 否则「按住拖动画布」会顺带缩放。
- **阻止右键菜单**：右键按下时调 `event.stopPropagation()`，避免弹出系统右键菜单。
- **锚点数学**：设 `d` 为光标相对画面中心的偏移、`t` 为平移量、`z` 为缩放，
  光标下的内容点满足 `d = t + z·p`；要让它缩放后仍在原位：

  ```
  d = t' + z'·p = t' + (z'/z)(d − t)   ⇒   t' = d − (z'/z)(d − t)
  ```

  旋转态（rot ≠ 0）下不做坐标旋转，退化为「以画面中心缩放 + 复位平移」，行为最可预期。

> **注意**：`MouseButton` / `MouseAction` 是 ArkUI 的**全局枚举**，
> **不要** `import { MouseAction } from '@ohos.multimodalInput.mouseEvent'` ——
> 本工程早期就是这么写的，会直接报 `has no exported member 'MouseAction'`（详见下节）。

> 若想要「绝对档位」而非相对步进（即左键直接到 50%、右键直接到 100%），
> 把 `zoomAt(ZOOM_LEFT, …)` / `zoomAt(ZOOM_RIGHT, …)` 换成 `setZoomTo(0.5)` / `setZoomTo(1.0)` 即可。

### 上次浏览位置（跨启动记忆）

切图时把位置写进 `preferences`（用户首选项，应用私有、无需任何权限），下次启动自动回到那张。

**存什么 / 怎么定位**（`LastPos`）：`idx` + `uri` + `name` + `count` + `src`。
只存序号不够（图库会新增照片，序号会漂移），只存 uri 也不够（换了图片源就找不到），所以两个都存：

| 情况 | 行为 |
|---|---|
| `uri` 在新列表里命中 | **精确定位到同一张**（最可靠） |
| 没命中但**总数一致** | 按序号回退 —— 同长度基本就是同一批、顺序未变 |
| 都没有 | 从第 1 张开始，**不做无根据的猜测** |

**保存时机**：`select()` / `go()` 里调 `markPos()`，**防抖 500ms** 写盘（`POS_SAVE_MS`），
滚轮连翻不会每张都落盘；`aboutToDisappear()` 再 `flushPos()` 兜底。
> `put()` 之后必须 `flush()`：不 flush 只进内存缓存，进程被杀就丢了。

**启动时怎么恢复**：只有「上次来自 **图库全部**」才会自动重扫并定位（全量扫描不需要用户交互）；
`选择图片` 是系统选择器，程序无权替用户点，只能用「上次会话的 uri 快照」恢复。
自动重扫走 `loadAllGallery()`：**跳过权限弹窗**直接 `getAssets()`，
已授权就恢复，未授权则 `catch` 后静默失败（只记日志）—— 启动时绝不弹窗打断用户。

**为什么还要存一份「上次会话的图片列表」快照**：
全量扫描依赖受限权限（真机上大概率没授权），只存位置的话根本没法自动跳转。
所以换图片源时顺带把 uri 列表存下来（最多 `SNAP_MAX = 3000` 条，
按 `SNAP_CHUNK = 200` 分块存进 preferences，**换行分隔、不用 JSON** —— 既避开单值过大，
也免去 `JSON.parse` 的类型麻烦）。启动时按「静默重扫 → 快照恢复 → 提示用户」三级降级：

| 上次来源 | 启动行为 |
|---|---|
| `图库全部` | 先**静默重扫**（跳过权限弹窗）；拿不到（多半是没权限）→ 退回快照恢复 |
| `选择图片` | 直接用**快照**恢复（系统选择器程序无权替用户点） |
| 快照也没有 | 状态栏 + 空态区提示「上次看到 XXX，重新打开同一批图片会自动回到这里」 |

> ArkTS 细节：`preferences.get()` 返回的是 `ValueType` 联合类型，
> **不能**直接 `Number()` / `String()` 强转，必须逐个 `typeof` 收窄。
>
> 另一处取舍：`lastPos` 刻意**不加 `@State`**（切图时每帧都改会导致整个界面重建），
> 需要刷新 UI 的提示文本另用 `@State resumeHint`。

### 载入图库「全部」图片
两条来源的能力边界不同，按下表选：

| 来源按钮 | 接口 | 数量上限 | 是否需要权限 |
|---|---|---|---|
| `打开图库` | 优先 `PhotoAccessHelper.getAssets`，失败回退 `PhotoViewPicker` | 全量扫描=全部（工程内再按 `SCAN_CAP` = 5000 张兜底截断）；选择器回退=**500**（系统硬上限） | 全量扫描需 `ohos.permission.READ_IMAGEVIDEO`，未授权自动回退 |
| `选择图片` | `DocumentViewPicker` | 取决于用户勾选 | 否 |

### 「选择图片」的默认格式 `*.*`

`DocumentSelectOptions.fileSuffixFilters` 的写法是系统约定的 **`'显示名|后缀1,后缀2,…'`**：
竖线左边是下拉里给人看的文字，右边是实际过滤的后缀（多个用英文逗号分隔）。
`'所有文件(*.*)|.*'` 里的 `.*` 是通配符 —— 表示不过滤、显示所有文件（2in1 支持，API 17 起手机也支持）。

```ts
const FILE_FILTERS: Array<string> = [
  '所有文件(*.*)|.*',                                    // ← 第 1 项 = 默认格式
  '图片(.heic, .heif, .jpg, …)|.heic,.heif,.jpg,…'       // 可切换的备选项
];
```

> ⚠️ **数组第 1 项就是选择器打开时默认选中的格式**，所以「所有文件(*.*)」必须排在最前。
> 排到后面会让选择器默认只显示图片，想选别的格式还得手动切一次下拉。
> 若只想要一个「所有文件」，把第 2 项删掉即可。

选到非图片文件时不会崩：悬停浮层与预览解码失败会走各自的兜底（浮层显示占位、主视图回退
`Image(uri)` 由系统解码），状态栏也会照常显示文件名与体积。

> 📌 以下「`打开图库` 的两条路线」是 **v1.0.6 之前**的排障记录：按钮已取消，
> 这套降级链现在只在「回到上次」里通过 `queryAllPhotos → scanAll` / 快照恢复被复用。

**原 `打开图库` 的两条路线**（`GALLERY_ALWAYS_PICK` 切换）：

| `GALLERY_ALWAYS_PICK` | 点「打开图库」会发生什么 |
|---|---|
| **`true`（当前默认，19:35 改）** | **直接进系统图库界面勾选**，每次都重新挑。不扫描、不读快照、不申请权限 |
| `false`（旧行为） | 走下面的四级降级链 |

`false` 时的四级降级（这是「默认全选」的实现方式）：

| 顺序 | 条件 | 结果 |
|---|---|---|
| ① | 已授权 → `getAssets()` 全量扫描 | 图库全部图片，**零交互** |
| ② | 未授权，但上次会话留有 uri 快照 | 用快照重建列表，**零交互** |
| ③ | 都没有 → 申请一次权限，成功则全量扫描 | 图库全部图片 |
| ④ | 仍不行 → 回退系统选择器 | 需手动勾选，上限 500 张 |

> 旧行为的问题：**② 常常让选择器根本弹不出来**（快照一命中就用旧列表顶替了，用户没法重新挑），
> 而 ③ 那次 `requestPermissionsFromUser` 紧接着拉起选择器也容易互相干扰 —— 实机表现为
> 「选择器弹出来了，但里面的图片选不了」。所以默认改成 `true`：点一下就是重新挑，行为可预期。

**选择器本身也留了一个开关**（`GALLERY_USE_PHOTO_PICKER`）：

| 值 | 用的选择器 |
|---|---|
| `true`（默认） | `photoAccessHelper.PhotoViewPicker` —— 界面就是图库，免权限、可多选、上限 500 |
| `false` | `picker.DocumentViewPicker` + 图片后缀过滤 —— PC/2in1 上更稳，但要自己走到图片目录 |

另外 `PhotoViewPicker` 抛错时会**自动转文件选择器**（状态栏提示 `图库选择器不可用（code N）→ 已改开文件选择器`），
并用 `pickerBusy` 挡住连点 —— 连点会叠出两个选择器，后开的那个往往就是点不动的那个。
HiLog 上看 `openPicker: select begin` → `openPicker: got N uris`。

> ② 刻意排在「申请权限」之前：开发环境里权限基本拿不到，
> 与其每次都弹一个注定失败的框，不如直接用上次的列表。

`ohos.permission.READ_IMAGEVIDEO` 属**受限开放权限**，三方应用默认申请不到：
需在 AGC 提交场景材料申请权限证书并配置正式签名后才会真正授予。

> ⚠️ **别在 `module.json5` 里声明它**（除非你已拿到 AGC 权限证书）。
> 一旦声明，用 DevEco 自动生成的 debug 签名安装会**直接失败**：
> ```
> code: 9568289   install failed due to grant request permissions failed
> ```
> 因为 debug 签名里没有该权限的授权。本工程因此**默认注释掉了这段声明**
> （见 `entry/src/main/module.json5` 里的注释块，取消注释即可启用）。

因此原 `打开图库` 做成上面的三级降级，保证在没有权限证书的开发/调试环境下入口依然可用（该按钮现已取消）。
申请权限时若失败，状态栏提示会区分原因：`authResults[0] === 2` 表示"未声明或受限"，`-1` 表示"未被授予"。

查询用 `DataSharePredicates` 把过滤与排序下沉到媒体库（数据库层）执行，
避免在应用内存里 `Array.filter` 全量数据导致 OOM；另直接读 `PhotoAsset` 的
`uri` / `displayName` 属性与 `get('size')` 元信息，比对每个文件 `stat` 快得多。

> 兼容性细节（这几条都是实机编译踩出来的，换 SDK 版本时容易撞上）：
> - 谓词里写的是媒体库列名 `'media_type'` / `'date_added'`，而非 `PhotoKeys` 枚举 ——
>   该枚举成员名在不同版本 SDK 里有 `PHOTO_TYPE` / `MEDIA_TYPE` 两种写法。
> - 排序方法是 **`orderByDesc()`**，不是 `orderDesc()`。
> - **`PhotoAsset` 上没有 `size` 属性**（`width`/`height` 同理），要用 `get('size')` 取，
>   返回类型是 `string | number`，需自己归一化。
> - 没有调用 `getCount()`，因为它的签名在部分版本是同步 `number`、在另一部分是 `Promise<number>`。
> - **`PermissionRequestResult` 不是 `abilityAccessCtrl` 命名空间的成员**，
>   写 `abilityAccessCtrl.PermissionRequestResult` 会报 "no exported member"；
>   本工程改用 `await`（由 Promise 推导类型）彻底绕开这个类型名。
> - `FetchResult` 的类型参数写法在各版本不一，故同样用 `await` 而非手写泛型。

---

## 开源许可

本项目以 **[MIT License](./LICENSE)** 开源。

```
Copyright (c) 2026 JacquelineWu (flyercat)
```

### 你可以做什么

| 事项 | 是否允许 |
|---|---|
| 个人使用、学习、修改 | ✅ |
| 商业使用（含闭源、收费） | ✅ |
| 二次分发、再许可、出售副本 | ✅ |
| 改名后发布 | ✅（需保留版权与许可声明） |
| 要求作者提供质量保证 | ❌（按「原样」提供，无任何担保） |

唯一义务：**在所有副本或实质性部分中保留版权声明与 MIT 许可文本**。
除此之外不需要署名、不需要开源你的衍生作品、不需要通知原作者。

### 免责声明

软件按「AS IS」提供，不含任何明示或暗示的担保（包括对特定用途适用性、不侵权的默示担保）。
作者不对任何索赔、损害或其他责任负责——详见 [LICENSE](./LICENSE) 全文。

### 第三方依赖与商标

- 本工程为**纯 ArkTS / ArkUI** 实现，**未引入任何第三方开源库或 native 代码**，
  解码能力全部来自 HarmonyOS 系统自带的图片 codec。
- `HarmonyOS`、`ArkTS`、`ArkUI`、`DevEco Studio` 均为华为技术有限公司的商标或注册商标。
  本项目是**独立的第三方开源项目**，与华为无任何隶属、代理或背书关系。
- 界面风格参考 ACDSee 的布局习惯（左列表 + 右预览），仅为交互布局上的借鉴，
  **不含 ACDSee 的任何代码、资源或商标素材**；ACDSee 是 ACD Systems 的商标。

### 关于 bundleName

`bundleName` 仍为 `com.workbuddy.heicviewer`（早期命名遗留）。
改名会使真机上已安装的版本被系统视为另一个应用、无法平滑升级，因此**刻意保持未改**。
如果你要作为全新产品分发，可自行改为自己的包名并重新签名。

### 反馈与贡献

Issue 与 PR 欢迎提交到：

- GitHub：https://github.com/JacquelineWu/PIKAN-HarmonyOS
- Gitee：https://gitee.com/flyercat/PIKAN-HarmonyOS

提交 PR 即表示同意你的贡献同样以 MIT 许可对外提供。
