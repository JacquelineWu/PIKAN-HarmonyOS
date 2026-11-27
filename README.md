# PIKAN · 鸿蒙 PC 原生看图软件（ACDSee 风格）

> **开源许可：[MIT](./LICENSE)** · Copyright (c) 2026 JacquelineWu (flyercat)

基于 **HarmonyOS SDK（ArkTS + ArkUI）** 开发的 PC 端看图软件，界面布局仿 ACDSee：

- **左侧**：文件浏览器（档案名 / 字节 / 日期三栏，含 `..` 与子目录），**不常驻缩略图**，鼠标悬停整行才浮出小图；可滚动、点击切换
- **右侧**：大图预览区（**中灰 `#5F5F5F`** 底色，GPU 合成渲染）。左上角信息浮层与右下角
  **缩放百分比**方块（100% = 原图像素 1:1）是 11-11～R54 期间的形态，**R55 起两者均已取消**
  （见下方「真机验证手册」R55 条目）；估算占用 / 上限 / 目录诊断串一律不画。
  **11-16 起 ESC 排查诊断收成默认关闭的诊断层**，按 `Ctrl+D` 即展开 **`R79`** 构建标记、
  `full/win/keys/dsp/hk/wf` 诊断与「退出 APP」入口（见第二十五轮章节）

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
| 纯文本 / 源码预览 | **11-19 起**：左栏直接列出 `.log` / `.txt` / `.c` / `.py` / `.asm` / `.v` 等 **111 种**文本 / 源码后缀；自动识别语言，C-like / Python / ASM / Verilog 启用语法高亮，**未命中高亮规则的文件仍按普通文本完整展示**；只读不写、保留原始换行 / 缩进 / 特殊字符；行号 + 等宽字体；UTF-8 / UTF-16 BOM / GB18030 / Big5 / Windows-1252 兼容；横向滚动不裁长行、纵向 `LazyForEach` 虚拟化可稳定显示十几万行（见第三十七轮章节） |
| 挑图入口 | 仅 `选择文件夹`（`DocumentSelectMode.FOLDER`）；**`打开图库`（v1.0.6）、`选择图片` 与 `回到上次`（11-10）三个按钮均已取消**，界面上不再出现（见「按钮区精简」章节） |
| 目录浏览 | 左栏 `选择文件夹`（`DocumentSelectMode.FOLDER`）；`..` / `往上层` / `退格` 按**目录层级**进入直接父目录（**不按浏览历史回退**，连续点击逐级到卷 / 硬盘逻辑最上层后停止）；左栏抬头正确显示**中文 / 多级 / `%XX` 编码 / 文档 URI / 带尾斜杠**的目录名（见 11-10 修复章节）；目录变了约 1.5s 自检、900ms 去抖重扫且**当前张不闪** |
| 路径选择 / 用户主目录 | **11-19 起（R38）**：`往上层` 到 `/storage/Users/<id>` 这一用户卷根时不再被 TOP 早退锁成死层，用户主动点击即**原地真实重新列举该层全部顶层资料夹**并可正常进入；其它路径（`/` / 盘符 / NAS 设备根 / 深层）的选择与「往上层」行为逐字不变，R28 越级护栏保留（见第三十八轮章节） |
| 左栏 | **R78 起**抬头下三个按钮改为**纯图案标识、零文字标签**：`↑`/`↓`（排序，随升降序切换）、`⇧`（往上层）、`▣`（选择文件夹），**同一行等宽排列**（`⇧` **恒亮恒可点，永不 grey out / 永不禁用**）；按下 / 未按下用高亮底色与图案方向区分；文件浏览器三栏（档案名 / 字节 / 日期），**R77 起列宽 adaptive：按内容长度 + 容器尺寸动态伸缩，零预设 / 固定宽度**（短名收窄、长名放宽，超长名由 Ellipsis 截断，三栏仍对齐）；**R78 起缩进按钮（`«` / `»` 与 Ctrl+B）按下切紧凑显示：只留档案名 / 目录名、隐藏时间 / 大小 / 状态 / 辅助标签，栏宽按当前可见内容自适应、不留多余空白；取消按下恢复完整三栏与默认 adaptive 宽度**；行高紧凑；**自然序**排序（`IMG_2` 在 `IMG_10` 前）；隐藏 `.` 开头文件；**乱码文件名**（GB18030 / GBK / Big5 / Shift-JIS / UTF-8 双重误编码）自动还原，只影响显示、不改名 |
| 悬停缩略图 | **左栏默认不显示任何缩略图**；鼠标停在**整行任意位置**才在右侧浮出 220 DIP 小图；自己的 384px 档 / 24 张 LRU / 同时只解一个；目录行与灰行不弹；点击、滚动、离屏立即收起 |
| 滚轮翻页 | 鼠标滚轮 **上一张 / 下一张**；**Ctrl + 滚轮** = 缩放（互不冲突） |
| 鼠标键 | **预览区相片上左键 toggle 放大镜**（R76 起；预设关闭，见第十五 / 七十六轮）、**双击切换全屏**；左键单击不放大（第七轮起）、右键拖拽平移；双击档案名同样切换全屏。**放大镜放大画质见第十七轮**：>1:1 一律 High(Cubic) 插值 + 五个图源全开 PixelMap 边缘 AA + 真实设备密度 + 按原图上限夹界的重解码（无真实增益则跳过），消锯齿 / 像素化 / 边缘粗糙，1:1 显示不受影响（第十六轮的三档 / MipMap 方案已被推翻，见第十七轮章节） |
| 缩放 | 滚轮(Ctrl) / 双指捏合 / 左键放大 ×1.5；右下角角标 **100% = 原图像素 1:1**（ACDSee / Photoshop 口径，适应窗口通常 13%~30%）。**11-10 起取消 `＋` `－` 按钮**；**第二十六轮起键盘 `↑` `↓` 不再缩放，改为翻页**（见第二十六轮章节） |
| 平移 / 旋转 / 镜像 | 拖拽画布 / `R` 右旋、`Shift+R` 左旋 / `Shift+H` 水平、`Shift+V` 垂直（可叠加）。**11-10 起取消 `左旋` `右旋` `镜像H` `镜像V` 按钮** |
| 复位 / 1:1 | 键盘 `0` 复位适应；`F` 切 1:1（**第十五轮起右键不再复位；R76 起改为相片上左键 toggle 放大镜**）。**11-10 起取消 `适应` `1:1` 按钮** |
| 竖图对开 | 当前与下一张**同为竖图**时左右并排；**点到 / 翻到哪张哪张就在左边**，翻页步长恒一格；横图 / 落单张仍单页；信息浮层列出两个文件名 |
| 幻灯片 | `幻灯片` 按钮 / 空格键，默认 3 秒切换 |
| 键盘翻页 / 往上层 | `←` / `↑` = 上一张，`→` / `↓` = 下一张（**四个方向键同向切换，第二十六轮**）；`退格` 按目录层级往上层（与按钮同一入口） |
| 收起左栏 | `Ctrl+B` 或点左栏与预览区**分隔条正中的 « 按钮**；收起后只留档案名一列，抬头与三个导航按钮仍在；再点 » 展回 |
| 顶栏自动隐藏 | **真全屏下不再显示任何工具顶栏**（`SHOW_FULLSCREEN_CHROME = false`）；需要恢复旧的「贴顶浮出 / 停手 2s 收起」把开关改 `true` |
| 关闭应用 | **`Esc`** 严格按窗口状态两态区分（`escActionByState`，第十九轮定稿，第二十～二十二轮保留）：全屏下首次 `Esc` 只退全屏并恢复进全屏前的几何（**绝不退出 APP**），返回普通模式后再按一次立即关闭。**第二十二轮（R21 截图证据）**：新包角标 `R21 · full=F · win=T` 且**没有黄色诊断行** → `escDiag` 为空 → **零个按键到达 `onKey()`**（不只是 ESC）；`full=F` 说明第二十一轮 `windowStatusChange` 状态同步已生效，剩下的唯一断点是键盘事件被系统 / 焦点拦在 APP 之外。现加 `onKeyEventDispatch` 分发通道（不依赖焦点）、修掉两个 `defaultFocus(true)` 冲突、用官方 `FocusController` + `ANCESTOR_EVENT` 抢焦点并常显结果、关闭在 2in1 上无可见效果却可能让系统保留 ESC 的沉浸最大化、角标常显 `R22` + `keys=N` + 焦点结果。**第二十三轮（R22 截图 `keys=0 · fc=Y f=N r12`）**：判定 ESC 被系统全局消费且焦点树未建立，恢复 `USE_SYSTEM_IMMERSIVE=true`，改走 `inputConsumer.keyPressed` 单键通道（SDK 明确拦截系统默认响应）+ `hotkeyChange` 兜底，补窗口级 `setWindowFocusable` 与「退出全屏瞬间重启焦点重试」，角标加 `dsp/hk/wf`；另提供**右下角可点「退出 APP」**作为不依赖键盘 / 焦点 / 窗口形态的确定解。**第二十四轮（R23 截图 `keys=168 · ESC#1 … (EXIT_FULL)`）**：按键到达与首次 ESC 已完全正常，定位到 `escDownHandled` 永不复位 + 永久对象引用去重吞掉第二次 ESC，改为 Up 配对清除 + ESC 单轮去重，并新增 `Ctrl+Q` 键盘确定解、通道级 `cap/con/dsp` 可观测。**✅ 2026-11-16 实机核验：第二次 ESC 已能正常退出 APP**。见第二十二～二十四轮章节。**第二十五轮**：排查期诊断 UI 收成默认关闭的可开关诊断层（`Ctrl+D` / 单击角标），ESC 退出逻辑一字未改。见第二十五轮章节 |
| 性能 | `LazyForEach` + `cachedCount(6)` 只建屏上几行；**缩略图只在悬停时解码**（滚动列表时一张都不解）；体积补测分批让出主线程，且**翻页 / 换目录 / 幻灯片期间一律让路** |
| 后台预载 | 自动预解码当前位置**前后各 100 张**（按画布尺寸取 1024–1536px 档位，直接可显示），窗口随位置滑动，**翻页不等解码**；`216 张 / 1GB` 双重上限，预算装不下整窗时「尽量」填充并收工（防死循环）；状态栏显示 `预载 N 张`、右下角角标显示 `缓存 N 张`（11-11 起均不再显示 MB 占用）。**第二十七轮起原始档案读取全链路真异步 + 到点即放弃超时闸门**，NAS 路径缓存期间不再占住 UI 主线程（见第二十七轮章节） |
| 切图过渡 | 命中预载 **瞬时上屏、无动画**；未命中才先用 768px 低清占位，清晰图到达后瞬时替换 |
| 位置记忆 | **退出 / 切后台同步记住**「上次停在第几张 + 那张相片 + 列表快照」；**重开 APP 自动显示上次那张图**并尽量恢复整批列表 + 精确落位（首帧后延迟执行，绝不重扫图库 / 弹权限 / 弹选择器，见 11-11 章节）；`restoreIndex` 按 uri 精确落回上次那张 |
| 全屏 | 顶栏 `全屏` / **F11** / **双击画布** / **双击档案名** 进入；`Esc` / `F11` / **双击画布** 退出；**第十八轮**：进全屏前对所有普通窗口态（不再 floating-only）抓窗口尺寸位置内存快照并记录进入前形态，退出时自由窗口在 `recover()`/`EXIT_IMMERSIVE` 之后精确 `resize` + `moveWindowTo` 还原、最大化态保持最大化不误缩；系统消费 ESC 自行退出沉浸时按绝对像素缩小（≥8px）可靠自愈同步状态，且**自愈后不再置任何补发标志**（第十九轮：随后用户主动的第二次 `Esc` 直接退出 APP）；**第二十轮**：进出全屏后延时重抢键盘焦点、ESC 走 `onKeyPreIme` 前置拦截并主动消费，另兼容只派发 `KeyType.Up` 的 2in1 键盘；**第二十一轮**：窗口状态变化由系统直发同步 APP 全屏态（不再靠画布缩小猜）、Button 焦点锚点、首帧即抢焦点、`sawWindowFull` 前置证据防止 2in1 上首次 ESC 误退出；**第二十二轮**：曾把 `USE_SYSTEM_IMMERSIVE` 关成 `false`（纯应用内三栏切换、窗口形态不变），但 R22 截图证明关掉后连「首次 ESC 返回」都失效、`keys` 仍为 0 —— **第二十三轮已恢复 `true`**（保留 `false` 早返回分支作可逆开关）；**画面**：应用内顶栏 / 工具条 / 左栏全部不画，只剩图片与左上角信息浮层 |
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
> 这些能力**没有删除**，仍由键盘与鼠标提供：Ctrl + 滚轮缩放、`↑` / `↓` 缩放（**第二十六轮起已改为翻页，不再缩放**）、
> `R` / `Shift+R` 旋转、`Shift+H` / `Shift+V` 镜像、键盘 `0` 复位、`F` 切 1:1
> （**第十五轮起右键改为 toggle 放大镜，不再复位视图**）。
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

**第十六轮**：ESC 由纯函数 `escActionOf(fullscreen, sinceExitMs, guardMs)` 按当前窗口状态分派；
`setFull()` 下降沿记 `lastFullExitAt`，覆盖 ESC / 双击 / F11 / 系统自愈全部退出路径，
用 400ms 冷却吞掉真全屏下「系统先消费 ESC → 自愈退全屏 → 补发迟到 ESC」那一次，
避免首次 ESC 落到非全屏分支被误当成「再次 ESC」直接退出 APP（详见第十六轮章节）。
退全屏还会按进全屏前的 `preFullRect` 快照精确 `resize` + `moveWindowTo` 还原窗口尺寸位置。

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

## 真机验证手册（依据 `tests/dirname.test.mjs` ⚠️ 步骤整理，2026-11-20）

> **本章是执行清单，不是需求 / 实现说明。** 下面所有 `⚠️` 段落逐字取自
> `tests/dirname.test.mjs` 中 **28 组**含 `⚠️ 真机步骤` 的 `console.log` 块（连同块内的
> 「本组是…」「边界：」行与全部续行），只做按轮次归并与排版，**未新增、未推断、
> 未改写任何验证动作**；每节标注来源行号便于回溯。测试里另有若干
> 「⚠️ 本组…真机步骤见 README 第 X 轮章节」的导航注记，只指向既有章节、不含步骤，
> 故不重复收录。
> README 上方的功能表与各轮章节停在 **R38**；R39–R55 的实现说明见下方
> 「R39–R55 实现说明（依据测试断言名与源码）」章节，该章以测试断言名与
> `Index.ets` / `components/` / `model/` 源码为准，与本章的真机步骤一一对应。
> **R56（返回 APP 自动同步目录 / 并排只看左图比例）、R57（重启 APP 后左侧列表补刷）、
> R58（视窗缩放护栏：右侧预览图不再被过度缩小）、R59（往上层后子目录反色 / 左栏名称紧贴最左边缘）、
> R60（高亮项恒定完整可见：不被滚动条 / 滚动位置 / 尺寸变化裁剪）、
> R61（所有层级目录项不再显示正方形方格及其占位）、
> R62（主预览 resize 画质：动态插值 + AA，消波纹与锯齿）、
> R63（文本预览 scrollbar 恢复显示：内容驱动 @State + 视口高兜底）、
> R64（左栏目录内容量统计与展示：空闲扫描 + TTL 缓存 + 四态显示）、
> R65（FITS / XISF 天文图像预览：自解析头 + 灰度拉伸 + 真异步读字节）、
> R66（天文像素计算让出主线程：总像素硬上限 + 24 行分片 + 宏任务让出 + 并发槽位）、
> R67（放大镜高质量显示：系统 native 抗锯齿缩放 + 能力分级 + 跨密度一致档）、
> R68（右边预览图优化 / resize 最高质素：系统 native AA 精炼 + 内容自适应档 + 跨密度一致）、
> R69（左栏档案名行上下留白各减 0.8mm：总行高减 1.6mm，其余逐字不变）、
> R70（HDR 标识：仅 HDR 相片在预览区左上角叠加清晰可辨标识，深浅背景恒清晰 / 交互零回归）、
> R71（HEIC HDR 保真解码与预览：显式 HDR 档 / 产物 isHdr 校验 / 原始尺寸·色彩·亮度保真 / 三类异常明确提示）、
> R72（档案列表右键菜单：原生文案五项 / 仅档案项触发 / 详情面板 / 打开所在目录 / 复制 / 放大镜零回归）、
> R73（右键菜单真机不弹出修复：改走 .onMouse 通道 / 应用内浮层 / 零系统手势依赖）、
> R74（「打开档案所在目录」改走 OS 自带文件管理器 / 目标恒为目录 / 文件与目录两类生效）、
> R75（移除名称右侧向上箭头符号列 / REVEAL 目录改以 browseBase 为真值）、
> R76（间距 5mm / 放大镜改相片上左键 / 仅含 EXIF 相片右上角 EXIF 图标 / 相片右键三项菜单）、
> R77（重启后 size·日期·预览图·缩略图完整恢复 / EXIF 有效字段同源真值 / 档案列表 adaptive column width）、
> R78（左栏紧凑显示 / 三个纯图案按钮 / 移除「APP 内上层xxx」提醒）、
> R79（只读名单态目录重列举兜底 / 恢复退出前那张预览 / 三场景兼容）
> 见下方十九个独立章节**，其真机步骤在本手册之后、R39–R55 实现说明之前。

### 使用前必读

- **确认装的是新包**：`Ctrl+D` 展开诊断层，角标必须是 **`R79`**。测试里早期轮次写的
  「装 `R38` 包」是当时的历史锚点，执行时一律替换为当前 `R79` 包。
  依据：`⚠️ 截图判定：按 Ctrl+D 展开诊断层后须出现 R38，否则说明装的是旧包。`
  （行号随 R79 新增断言顺延，以 `grep -n 真机步骤 R79 tests/dirname.test.mjs` 为准：10484–10493）
- **证据边界**（逐字取自测试）：
  `⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。`
  真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。
- **抓日志方法**（R53 步骤里给出）：`终端跑 hilog | grep --line-buffered HeicViewer`。
- **R39 / R40 无独立真机步骤**：这两轮是组件化拆分（Phase 0–3：`Index.ets` 拆出
  `components/ArchiveRow.ets`、`components/SidebarView.ets`、`components/ToolButton.ets`
  与 `model/GalleryData.ets`、`model/Preview.ets`），测试里只有「静态契约锚点按逻辑所在文件
  解耦」的说明，验证方式是 `node --experimental-strip-types tests/dirname.test.mjs` 全绿，
  外加下列 R41 起各轮的界面回归。

### 步骤来源对照

| 轮次 | 主题（测试分组标题） | ⚠️ 步骤行号 |
|---|---|---|
| R41 | 恢复态目录清单的行种类保真（.log 重启后可预览） | 6165–6167 |
| R42 | 网盘目录整表缓存（秒开 + 后台刷新） | 6198–6202 |
| R43 | 用户导航抢占在途列举（修 NAS 点资料夹没反应） | 6218–6221 |
| R44 | NAS 重启后 13900002 —— 重连重试 + 恢复态预热 | 6246–6249 |
| R45 | 只读名单态自愈 —— 预热成功即退出 READONLY | 6265–6267 |
| R46 | appfreeze THREAD_BLOCK_6S —— 目录轮询 mtime 探测异步化 | 6288–6289 |
| R47 | 对开右页首开空白 —— 解码失败重试 | 6305–6306 |
| R48 | 右页空白可观测性 —— loadRightPage 全路径留痕 | 6317–6318 |
| R49 | 右页空白根因修复 —— 在途合并落点收口 | 6328–6329 |
| R50 | 重启恢复态不再自称「已恢复上次目录」 | 6341–6342 |
| R51 | 文本预览常显滚动条 + 行段选择复制 | 6362–6364 |
| R52 | 文本纵向滚动条自绘 | 6389–6391 |
| R53 | R52 自绘条真机不显示 —— 条件全直读 + 兜底回填 + 加粗加亮 | 6407–6409 |
| R54 | 选段改为按住左键拖选 | 6427–6428 |
| R55 | 预览区常显角标取消 | 6452–6453 |
| R66 | 天文像素计算让出主线程（THREAD_BLOCK_6S：尺寸护栏 + 分片 + 并发槽位） | 8177–8185 |
| R67 | 放大镜高质量显示（系统 native AA + 能力分级 + 跨密度一致档） | 8413–8421 |
| R68 | 右边预览图优化 / resize 最高质素（系统 native AA 精炼 + 内容自适应档） | 8658–8665 |
| R69 | 左栏档案名行上下留白各减 0.8mm（总行高减 1.6mm，其余逐字不变） | 8738–8745 |
| R70 | HDR 标识（仅 HDR 相片预览区左上角叠加 / 深浅背景恒清晰 / 交互零回归） | 8897–8904 |
| R71 | HEIC HDR 保真解码与预览（显式 HDR / 产物校验 / 原始尺寸保真 / 三类异常明确提示） | 9086–9097 |
| R72 | 档案列表右键菜单（原生文案五项 / 仅档案项 / 详情 / 所在目录 / 复制 / 放大镜零回归） | 9312–9322 |
| R73 | 右键菜单真机不弹出修复（.onMouse 驱动 / 应用内浮层 / 零系统手势） | 9463–9475 |
| R74 | 所在目录改走 OS 文件管理器 / 目标恒为目录 / 文件与目录两类生效 | 9626–9638 |
| R75 | 仅移除向上箭头符号列 / REVEAL 目录改以 browseBase 为真值 | 9775–9789 |
| R76 | 间距 5mm / 左键放大镜 / EXIF 图标 / 相片右键三项菜单 / 单张·并排模式 | 10030–10044 |
| R77 | 重启资料·预览图·缩略图恢复 / EXIF 有效字段同源 / adaptive column width | 10231–10246 |
| R78 | 左栏紧凑显示 / 三个纯图案按钮 / 移除「APP 内上层xxx」提醒 | 10381–10394 |
| R79 | 只读名单态目录重列举兜底 / 恢复退出前那张预览 / 三场景兼容 | 10484–10493 |
| 附 | R36 / R37 / R38 既有步骤 | 5662–5668 / 6019–6027 / 6455–6461 |
| 附 | 更早轮次的 9 组散落步骤（见下方附节） | 4337–5462 |

### R41–R55 真机步骤（原文）

**第四十一轮：恢复态目录清单的行种类保真（.log 重启后可预览）**

> ⚠️ 真机步骤 R41：选 /storage/Users/currentUser → 点开一个 .log 预览 → 退出 App 重开 →
>     恢复态清单里点同一个 .log 应直接进文本预览（不再「不支持预览」）；
>     点「往上层」进上层清单，文件行仍显示「不支持预览」（无授权，原行为）。

**第四十二轮：网盘目录整表缓存（秒开 + 后台刷新）**

> ⚠️ 真机步骤 R42：选一个网盘 / NAS 目录（条目越多越好）→ 记下列目录耗时 →
>     点「往上层」再点回来 / 退出重进 → 目录表应**瞬间**出现（状态栏先显示
>     「已显示缓存目录（后台刷新中…）」，随后变「目录已是最新」或「目录已刷新」）；
>     在网盘侧增删一个文件 → 1.5s 轮询触发重扫 → 列表保位更新；
>     断开网盘后重进该目录 → 应保留缓存视图 +「已显示缓存目录 · 刷新失败」。

**第四十三轮：用户导航抢占在途列举（修 NAS 点资料夹没反应）**

> ⚠️ 真机步骤 R43：进 NAS 目录（缓存秒开、状态栏「后台刷新中…」未消失时）立刻点
>     子资料夹 → 应立即响应（「正在列出 …」→ 进入），不再像没反应；
>     列表途中连点多个资料夹 → 最后点的那个胜出，中间的自动作废不闪屏；
>     「往上层」在列举途中点击也应立即响应。

**第四十四轮：NAS 重启后 13900002 —— 重连重试 + 恢复态预热**

> ⚠️ 真机步骤 R44：重启 App（NAS 场景）→ 恢复态清单出现后立刻点 NAS 子资料夹 →
>     应看到「正在列出 …」或「网络目录未就绪，正在重连（1/2）…」后成功进入；
>     若 NAS 真断线：约 2.4s 后明确报「网络目录未连接？稍候再点一次」；
>     本地已删除目录：不重试、快速报错（行为与 R43 前一致）。

**第四十五轮：只读名单态自愈 —— 预热成功即退出 READONLY**

> ⚠️ 真机步骤 R45：重启 App（NAS 冷启动）→ 若预览区只有档案名（只读名单态）→
>     等约 1~3 秒应自动恢复：状态栏出现「网络目录已恢复连接」，当前张补解显示；
>     翻页应正常出图。若 NAS 真断线：维持只读名单 + 指引卡（原设计）。

**第四十六轮：appfreeze THREAD_BLOCK_6S —— 目录轮询 mtime 探测异步化**

> ⚠️ 真机步骤 R46：NAS 目录停留浏览 ≥10 分钟（含 NAS 休眠 / 断网瞬间）→ App 不应再出现
>     appfreeze THREAD_BLOCK_6S；NAS 侧增删文件后列表仍约 1.5s+去抖自动刷新。

**第四十七轮：对开右页首开空白 —— 解码失败重试**

> ⚠️ 真机步骤 R47：首次打开一个含多张大 JPG 的目录（对开模式）→ 右页应在左页出来后
>     最多约 0.6~2.4 秒内补上；翻页换对应正常；坏文件右页留空但左页与翻页不受影响。

**第四十八轮：右页空白可观测性 —— loadRightPage 全路径留痕**

> ⚠️ 真机步骤 R48：复现右页空白时抓 hilog（grep HeicViewer），日志能直接区分：
>     decode FAIL（真解码失败）/ stale discard（竞态丢弃）/ give up（重试耗尽）三种成因。

**第四十九轮：右页空白根因修复 —— 在途合并落点收口（解好先入缓存）**

> ⚠️ 真机步骤 R49：重启 App → 首次打开大 JPG 目录（对开模式）→ 右页应正常显示；
>     若仍空白，hilog 里 stale discard 行之后不再有右页空白（合并条目已归缓存所有）。

**第五十轮：重启恢复态不再自称「已恢复上次目录」**

> ⚠️ 真机步骤 R50：重启 App → 恢复态列表不再有「— 已恢复上次目录 —」说明行，
>     状态栏显示「目录名 · 本层没有图片 · N 个条目」；旧快照里的说明行也不会再出现。

**第五十一轮：文本预览常显滚动条 + 行段选择复制**

> ⚠️ 真机步骤 R51：打开 .log/.txt → 右侧应常显纵向滚动条；点一条行亮起，
>     再点另一条成段（高亮范围），抬头出现「复制 / 清除」，复制后到别处粘贴验证内容完整；
>     Ctrl+C 同效；关闭文本预览再打开选区应已清除。

*整理者注记（非步骤）：本条的「点一条行亮起，再点另一条成段」是 R51 当时的两次点击定界；
R54 起已改为按住左键拖选，测试断言 `R54 行级 onClick 移除（旧两次点击定界退役）` 有据，
执行选段场景请以 R54 条目为准。*

**第五十二轮：文本纵向滚动条自绘（原生条画在全宽 List 右缘，视口外看不见）**

> ⚠️ 真机步骤 R52：打开长 .log（行超一屏且行宽超视口）→ 视口右缘应有纵向滚动条，
>     滚轮 / 拖滑块都应联动（滑块随滚动移动、拖滑块滚动正文），横向滚动时条不跟着走；
>     短文件（不满一屏）不应有滚动条；滑块区域点击应仍能选中行。

**第五十三轮：R52 自绘条真机不显示 —— if 条件全直读 + 兜底回填 + 加粗加亮**

> ⚠️ 真机步骤 R53：装新包 → 打开长 .log → 视口右缘应有明显的滚动条（亮色滑块 + 深色轨道）；
>     若仍不见：终端跑 hilog | grep --line-buffered HeicViewer，重进一次文本预览，
>     把「text area h=…」行发我（h=0 说明 onAreaChange 没回填，走了兜底会有 fallback=… 行）。

**第五十四轮：选段改为按住左键拖选（hold → 拖动实时扩展 → release 定段）**

> ⚠️ 真机步骤 R54：打开 .log → 按住左键从某行拖到另一行松开 → 应成段高亮 + 抬头出现复制/清除；
>     按住期间滚轮滚动应能跨屏扩展选段；右键 / 中键不碰选区；「清除」按钮和 Ctrl+C 仍可用。

**第五十五轮：预览区常显角标取消（左上档案名浮层 + 右下缩放百分比方块）**

> ⚠️ 真机步骤 R55：打开图片 → 左上角无档案名浮层、右下角无百分比方块；
>     Ctrl+D 诊断层仍可展开（含退出 APP + 全字段角标）；全屏时左上角仅一行退出提示。

### 附：更早轮次的散落真机步骤（测试 4337–5462 行，9 组）

> 这 9 组散落在早期各轮的测试块里，README 已有对应轮次章节；此处汇总便于一次执行。
> 其中的「装 `R38` 包」同为历史锚点，按「使用前必读」替换为当前 `R55` 包。

**4337–4339**

> ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 路径验证。
> ⚠️ 编译校验 ≠ 真机验证：本会话无法安装 HAP / 打开 NAS 目录 / 读取 hilog。
> ⚠️ 真机步骤：装 R38 包 → 打开 NAS 图库 → 观察缓存期间界面是否仍可操作、无 appfreeze。

**4484–4485**

> ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 往上层验证。
> ⚠️ 真机步骤：装 R38 包 → 打开复现路径 → 点「往上层」→ 应进入父目录并列出真实子目录。

**4680–4681**

> ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机 NAS 往上层验证。
> ⚠️ 真机步骤：装 R38 包 → 打开复现路径 → 点「往上层」→ 左栏应列出该层全部子目录（含所有非 2026 目录）。

**4857–4858**

> ⚠️ 本组仍是源码静态契约 + 纯函数回归，不替代真机重启验证。
> ⚠️ 真机步骤：装 R38 包 → 子目录看图 → 退出重开 → 点「往上层」→ 应落在直接父级并列出全部子目录。

**4963–4964**

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机重启验证；真实 ArkTS 编译是另一类证据。
> ⚠️ 真机步骤：装 R38 包 → 子目录看图 → 退出 APP 重开 → 应自动打开原图片档案；点「往上层」应返回上一层界面。

**5073–5074**

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；「不存在该名字的文件夹」是系统文件管理器的 UI 提示，属系统侧行为。
> ⚠️ 真机步骤：装 R38 包 → 制造 persist auth lost → 自动弹「选择路径」→ 选有效 NAS 目录点「选择」→ 应直接返回并进入目录。

**5260–5261**

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤：装 R38 包 → 逐层进入或直接选深层目录 → 点「往上层」→ 目录应上移或出 APP 内清单，绝不再「无响应」。

**5278–5279**

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤：装 R38 包 → 逐层进入 L0→L1→L2→L3 → 连续点「往上层」→ 应逐级 L3→L2→L1→L0，到 L0 保持不变。

**5459–5462**

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤：装 R38 包 → 进入深层目录 → 点「往上层」→ 应列出该层全部子目录（含非当前目录的兄弟目录）。
> ⚠️ 边界：父层完全无 URI 授权、且会话缓存里也没有其它兄弟目录痕迹时，
>     APP 内清单仍只能列出当前目录 —— 零 IO 兜底绝不凭空编造目录名。

### 附：R36 / R37 / R38 既有真机步骤（已有独立章节，此处汇总便于一次执行）

**第三十六轮**（`5662–5667`，见第三十六轮章节）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 A：装 R38 包 → 进入空目录 / 无图片 / 只有子文件夹的目录 → 退出 APP →
>     重开应直接停在该目录（不得回默认目录、不得弹选择器、不得因零图片丢状态）。
> ⚠️ 真机步骤 B：从深层目录连续点「往上层」多级、反复进子目录再上移，
>     每次都应真实列出该层全部资料夹目录（含非当前目录的兄弟目录），不是只显示一个。
> ⚠️ 边界：父层完全无 URI 授权、真实列举一个名字都拿不到时，才退回零 IO 的 APP 内清单；
>     自动重扫（每 1.5s）仍走 R35 早停，绝不放大 NAS IO；启动恢复期仍零文件 IO。

**第三十七轮**（`6019–6026`，见第三十七轮章节）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 A：装 R38 包 → 选含 .log/.txt/.c/.py/.asm/.v 的目录 → 点文本行 →
>     右栏应出行号 + 等宽排版 + 对应语法着色；未知后缀文件按普通文本完整展示。
> ⚠️ 真机步骤 B：UTF-8 / UTF-16 BOM / GB18030 / Big5 / Windows-1252 各准备一份，
>     抬头应显示识别出的编码；CRLF / CR / LF、缩进 / Tab / 特殊字符不得丢失或改写。
> ⚠️ 真机步骤 C：准备数万行大文件 → 滚动应稳定不卡；点图片行 / 滚轮 / 方向键 /
>     「往上层」应退出文本态且图片预览、目录恢复、ESC 等既有链路完全不受影响。
> ⚠️ 边界：单次最多读 8MB / 12 万行，超出在抬头明确提示「已显示前 8 MB / 120000 行」；
>     二进制内容（NUL / 高比例控制字符）按提示展示，不刷满屏乱码；全程只读不写。

**第三十八轮**（`6455–6461`，见第三十八轮章节）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 A：装 R38 包 → 选 /storage/Users/currentUser 或从深层反复点「往上层」到 L0；
>     该层应真实列出 Download / Desktop / Documents / WorkBuddy 等全部顶层资料夹，可点名称进入。
> ⚠️ 真机步骤 B：在任意 NAS 目录 / 盘符根 / 图片列表态点「往上层」，行为应与 R37 完全一致；
>     到 / 或 NAS 设备根仍给「已到最上层」提示，绝不越级到 /storage、/ 等系统目录。
> ⚠️ 边界：只在用户主动点击且当前层恰好是用户卷根时做一次真实全量列举；
>     自动重扫（每 1.5s）/ 启动恢复期仍零新增 IO，绝不重演 THREAD_BLOCK_6S。

---

## 第五十六轮：返回 APP 自动同步目录清单 + 并排预览只看左图比例（2026-11-20，R56）

> 本章依据本轮源码、`tests/dirname.test.mjs` 断言名与真实编译产物撰写；
> **静态契约 / 真实 ArkTS 编译 / 真机验证三类证据严格分开**。
> 用户规格：①「当使用者离开 APP 后再次返回并恢复显示时，自动 refresh 左侧列表，
> 使其重新同步当前目录的档案结构……同一返回事件只触发一次 refresh，且不得中断
> 当前正在进行的操作；若当前选中档案及已展开目录仍存在，则保留选中项与展开状态，
> 若已不存在则清除对应失效状态」；②「以左侧图片比例为准，若左图为 portrait，
> 不论右图为 landscape、portrait 或方形，都保留右侧预览图并显示在右侧；若左图为
> landscape 或方形，则不显示右侧图片，仅将左图置于中间显示」；两项均要求
> 「保持现有功能不受影响」。

### 一、改动范围（4 个文件）

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/ResumeRefresh.ts` | **新增**：返回刷新决策与状态对账的零 IO 纯函数真值源 |
| `entry/src/main/ets/common/ViewPlan.ts` | 新增 `ORIENT_*` 三分类、`imageOrientationOf()`、`spreadRightWantedOf()` |
| `entry/src/main/ets/pages/Index.ets` | 生命周期 / 状态 / 刷新链 / 并排决策接线；`ESC_BUILD_TAG` R55→R56 |
| `tests/dirname.test.mjs` | R56 断言组 +25 条；构建标记与旧包排除批量升级；两处计数型契约 5→6 |

**未改**：`EntryAbility.ets`（`onForeground` / `onBackground` 仍只打日志）、
`openFolder()` / `applyItems()` / `sameDirEntries()` / `loadRightPage()` 主体、
预览区渲染布局、`AppScope/app.json5`（版本恒 `1.0.7 / versionCode 7`）。

### 二、需求一：返回 APP 时左侧清单单次、非侵入刷新

**信号选择**：ArkUI `onPageShow()` 与既有 `onPageHide()` 配对 —— `onPageHide` 的注释
本就明确它覆盖「切后台 / 锁屏 / 被别的应用盖住」。`onPageHide()` 里新增置位
`pageSuspended=true` 并重置 `resumeRefreshHandled=false`；首次进入 `pageSuspended`
恒 false，**启动恢复链绝不会被这次刷新打断**。

**决策真值源**（`ResumeRefresh.ts`：零 SDK / 零文件 IO / 零 `await` / 零 `throw`）：

| 函数 | 作用 |
|---|---|
| `resumeRefreshAction(suspended, handled, busy, hasDir, ioOk)` | 五条件全满足才 `GO`，任一不满足 `SKIP`（保守、零副作用） |
| `resumeSelectedIndex(prevUri, newUris)` | 按 uri 精确命中返回新下标；失效返回 `-1` |
| `resumeDirKept(prevDir, dirExists)` | 目录仍存在才保留层级状态 |
| `resumeRefreshHint(ok, dirKept, selKept, hadSelection)` | 成功 / 目录失效 / 选中失效 / 同步未完成四态文案 |

**真正的列举**：复用既有 `openFolder(this.browseBase, false, false, true)`，与
`pollMtimeOnce()` 的自动重扫**逐字同参**（第 4 参 `isRescan=true`）：

- 真实 `fs.listFile()` 重列举 → `sameDirEntries(names)` 比对 → 有增删 / 改名 / 层级变动
  才 `applyItems(..., preserveView=true)` 重建左栏；条目未变只更新 mtime 基准、视图零抖动。
- `applyItems(preserveView)` 按 uri 保位，不恢复「上次位置」、不滚列表、不清预览缓存、
  不关闭文本预览（`keepView` 时不调 `closeTextMode()`）。

**不中断在途操作**：`busy = folderBusy || playing || mtimeBusy || pickerBusy || !pageAlive`，
`ioOk = bulkIoAllowed(restoreMode)`；任一为真一律让路，最多按 400ms × 3 次延后重试
（`RESUME_REFRESH_RETRY_MS / MAX`），绝不抢占用户导航。`openFolder` 自身对
`isRescan===true && folderBusy` 也会直接 `return false`。重试 timer 在再次离开 APP 与
`aboutToDisappear()` 时都清理。

**只触发一次**：GO 分支**先**置 `resumeRefreshHandled=true; pageSuspended=false` 再发起
列举，窗口状态变化导致 `onPageShow` / 前台回调重复到达时不会刷第二次。

**状态对账**：列举完成后用 `resumeSelectedIndex(prevUri, 新 items uris)` 对账 ——
仍存在则保留（`applyItems` 已按 uri 保位）；已删除 / 改名 / 移走则 `cur=-1` +
`refreshSpread()` 收掉右页，**不会悄悄改选邻近的另一张图**。目录失效时清
`inAppUpList` 与 `dirMtime` 基准；**刻意不清 `browseBase` / `browseDir`** —— 列举失败
也可能是 NAS 未挂载 / 授权暂时失效（R44 有重连重试先例），误清会破坏 R36 的目录恢复；
目录真实消失由既有 1.5s 轮询与用户主动导航纠正。失败时保留 `openFolder` 给出的明确
错误串，不覆盖成泛泛提示。对账只清运行时视图态，不动 `posPending` / 快照写盘链。

### 三、需求二：并排预览以左图比例为准

**旧策略**（R55 及以前）：`refreshSpread()` 要求「左图竖 **且** 右图 `probeCache.get(b)`
也为竖」才并排 —— 右图是横图 / 方图时整页消失。

**新策略**：`ViewPlan.spreadRightWantedOf(leftW, leftH, hasNext, enabled)` 是唯一决策，
**签名刻意不接收右图形态参数**，从类型上杜绝旧逻辑回潮：

- 左图 portrait（`h>w`）→ 只要还有下一张就 `spreadB = cur+1`，右页显示；
  右图 landscape / portrait / square 一律不参与判断。
- 左图 landscape / square / 尺寸未知 → `spreadB=-1` + `clearRightPage()`，
  既有渲染分支走「单页居中」，**布局代码一行未改**。

`Index.ets` 新增 `leftImageSize(uri, seq)`：优先 `previewEntry()` 的已解码原图 `w/h`，
其次 `probeSize` 元数据缓存，都没有才 `probeOne()` 异步探一次并由
`probeOne → refreshSpread` 重算；`probeOne()` 成功 / 失败 / 抛异常三条路径都写
`probeSize`，尺寸未知返回 `0×0` → 保守单页，绝不误开右页。
`isPortrait()` 保留作单张形态查询 / 诊断，但**不再参与并排决策**；右页解码与重试链
（`loadRightPage` / `RIGHT_PAGE_RETRY_DELAYS`）、翻页步长 `go(±1)`、放大镜、
文本预览、目录恢复全部未动。

### 四、验证结果（三类证据严格分开）

| 证据 | 结果 |
|---|---|
| **静态契约 / 纯函数** | `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1859 passed, 0 failed**（R55 基线 1834，新增 25 条 R56 断言）；`git diff --check` 通过 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 17 s 869 ms**，`Finished :entry:default@CompileArkTS... after 11 s 54 ms`（**真实编译，非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（8 条 `preferences` 可能抛异常 + 1 条 `READ_IMAGEVIDEO` 权限 + 8 条 2in1 系统栏 API），与 R55 基线完全一致且全部落在本轮**未改动**区域 |
| **产物核验** | 签名 HAP **1,210,826 B** / 未签名 **1,176,849 B** / `modules.abc` **695,704 B**（R55 为 1,195,104 B / 686,848 B）；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R56=1 / R55=0 / R54=0 / R38=0 / R37=0`**、**`1.0.7=1 / 1.0.6=0`** |
| **真机验证** | ⚠️ **未做**，由使用者完成；**编译校验 ≠ 真机验证**。特别是 `onPageShow()` 在「切后台 / 锁屏 / 被覆盖」三条路径上是否都稳定回调、竖图右页是否按新策略显示，必须实机确认 |

### 五、真机步骤（逐字取自 `tests/dirname.test.mjs` R56 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R56-A：打开任意含图目录 → 切到别的应用 / 锁屏再返回 → 左栏应只刷一次、
>     与磁盘一致（期间新增 / 删除 / 改名 / 建子目录都能反映）；正在翻页 / 幻灯片时不打断。
> ⚠️ 真机步骤 R56-B：原选中档案被删后返回 → 失效选中被清除且不自动改选别张；
>     目录仍在则保留原目录层级；目录不可列时给明确提示且不误回默认目录。
> ⚠️ 真机步骤 R56-C：左图为竖图且后面还有一张 → 无论第二张横 / 竖 / 方，右页都显示；
>     左图为横图或方图 → 右页消失、左图单页居中；翻页 / 放大镜 / 文本预览不受影响。

**边界**：`Ctrl+D` 诊断层角标必须是 **`R56`**；未跑 `build.sh`、未升版本、
未把 HAP 放桌面；本轮**未推送**任何远端（等待使用者指示）。

---

## 第五十七轮：重启 APP 后左侧列表补刷（2026-11-20，R57）

> 使用者反馈：**「重启 app 后左边列表没有刷新」**。本章只讲这一处修复，
> R56 的「切后台返回自动刷新」与「并排只看左图比例」行为保持原样。

### 一、根因链路（四层叠加，逐段核实过调用关系）

| # | 环节 | 事实 |
|---|---|---|
| 1 | 冷启动恢复 | 走 `restoreFromSnapshot()`（上次会话的 **uri 快照**）或 `restoreDirContextOnly()`（`upDirCache` 本层纯清单），**两条都是零 IO 快照**，左栏显示的是退出时的旧档案结构；新增 / 删除 / 改名 / 层级变动都不在其中。 |
| 2 | `setItems()` | 恢复链必经点，会清掉 `browseBase` 与 **`dirPollTimer`**；随后 `restoreBrowseContext()` 只回填目录上下文，**没有重启 `startDirPoll()`**（该函数原本只在 `openFolder` 成功末尾调用）。 |
| 3 | mtime 轮询 | `dirMtime` 冷启动为 `0`，`pollMtimeOnce()` 的条件是 `m > 0 && dirMtime > 0 && m !== dirMtime`，首轮必然跳过；而 `dirMtime` 只有 `openFolder()` 真正列目录成功后才写。 |
| 4 | R56 决策 | `resumeRefreshAction()` 要求 `suspended=true`（**只有 `onPageHide` 置位**），冷启动 `onPageShow` 恒 SKIP —— 这是「不打断启动恢复链」的正确语义，测试里甚至有断言把它固化，不该改。 |

四者叠加，结论是：**重启后左栏永远停在退出时的旧清单，且后续 1.5s 轮询也救不回来**。

### 二、修法（独立决策链，不动 R56 决策）

- `common/ResumeRefresh.ts` 新增 `bootRefreshAction()` / `bootRefreshHint()` 与
  `BOOT_REFRESH_GO` / `BOOT_REFRESH_SKIP`：**七个条件**全满足才放行一次
  （未消费 / `resumeDone` / 无在途操作 / 有目录 / 允许批量 IO / 有上次会话记忆 / 用户未动手）。
  `resumeRefreshAction()` 的 5 参签名与「首次进入恒 SKIP」语义**一字未改**。
- `pages/Index.ets` 把 R56 的 GO 分支执行体抽成 **`runRefreshOnce(scene)`**，
  由「切后台返回」与「冷启动重启」两个入口共用；真正的真实列举仍是
  `openFolder(base, false, false, true)`（`isRescan=true`），
  经 `sameDirEntries` → `applyItems(preserveView)` 按 uri 保位，**没有另起一套 IO**。
  `scene` 只决定状态栏文案是「返回 APP」还是「重启 APP」。
- **主触发点** `markRestoreEntered()`：这是仅目录恢复与快照恢复两条路径
  **统一的「成功进入上次目录」收口**，此刻 `resumeDone=true`、`browseBase` 已回填，
  补刷既真实又不抢恢复期。`onPageShow()` 另加一次 `tryBootRefresh()` 作兜底，
  恢复链走 900ms 定时器 / 3s 看门狗时用 `400ms × 12` 有限延后，`bootRefreshHandled`
  保证**重启只刷一次**。
- **顺带补上轮询**：`runRefreshOnce()` 成功后若 `dirPollTimer === -1` 就调一次
  `startDirPoll()`（幂等：先清再起）。因为重扫命中 `sameDirEntries` 短路时
  `openFolder` 自己不会重启轮询，补上后重启之后的目录变化仍能持续同步。
- 状态对账与 R56 完全一致：选中档案仍存在则按 uri 保位，已不存在则
  `cur=-1` + 收右页，**不悄悄改选邻图**；目录失效只清 `inAppUpList` / `dirMtime`，
  **不误清 `browseBase`**（保 R36 目录恢复）。

### 三、改动范围

| 文件 | 改动 |
|---|---|
| `common/ResumeRefresh.ts` | 新增冷启动补刷决策 / 文案的零 IO 纯函数（文件仍零 SDK / 零 IO / 零 `await` / 零 `throw`） |
| `pages/Index.ets` | `bootRefreshHandled` / `bootRefreshTimer` / `bootRefreshRetry`；`tryBootRefresh()`；抽取 `runRefreshOnce(scene)`；`onPageShow` 双入口；`markRestoreEntered()` 末尾触发；刷新成功后恢复轮询；两个 timer 在 `onPageHide` / `aboutToDisappear` 清理；`ESC_BUILD_TAG` R56→R57 |
| `tests/dirname.test.mjs` | 新增 20 条 R57 断言；构建标记与旧包排除批量升级 R56→R57 |
| `README.md` | 本章 + 抬头 / 「使用前必读」构建标记与测试行号引用同步 |

未动 `EntryAbility.ets`、`openFolder()` / `applyItems()` / `sameDirEntries()` 主体、
预览渲染布局、`refreshSpread()` 并排决策、`AppScope/app.json5`。

### 四、验证结果（三类证据严格分开）

| 证据 | 结果 |
|---|---|
| **静态契约 / 纯函数** | `ALL PASS 1879 passed, 0 failed`（R56 基线 1859，+20）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` 首轮为 `UP-TO-DATE`（按本项目口径**不算**真编译），改一处文件头注释强制输入变化后重跑 → **`BUILD SUCCESSFUL in 20 s 284 ms`**，**`Finished :entry:default@CompileArkTS... after 12 s 387 ms`**（非 UP-TO-DATE），**0 ERROR / 17 WARN**（与 R56 基线一致，全在既有区域） |
| **产物核验** | 签名 HAP **1,218,910 B** / 未签名 **1,184,561 B** / `modules.abc` **699,908 B**；产物晚于源码；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R57=1 / R56=0 / R55=0 / R38=0 / R37=0`**、**`1.0.7=1 / 1.0.6=0`** |
| **真机验证** | ⚠️ **未做，由使用者完成**。**编译校验 ≠ 真机验证** —— 尤其「彻底杀进程后重启」是否稳定走到 `markRestoreEntered()`、以及 NAS / 只读名单态下的表现，必须实机确认 |

### 五、真机步骤（逐字取自 `tests/dirname.test.mjs` R57 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R57-A：打开含图目录后彻底杀进程重启 APP → 恢复出上次目录时左栏应自动与磁盘同步，
>     期间新增 / 删除 / 改名 / 建子目录都能反映；Ctrl+D 角标必须是 R57。
> ⚠️ 真机步骤 R57-B：重启后原选中档案仍在则保留选中；已被删则清除失效选中且不自动改选别张。
> ⚠️ 真机步骤 R57-C：重启落在空目录 / 无图片目录也要恢复并同步；切后台再返回仍只刷一次，
>     正在翻页 / 幻灯片 / 选文件夹时不打断；只读名单态（授权失效）不强行刷、等后台自愈。

**边界**：只读名单态（URI 授权失效、`bulkIoAllowed=false`）**刻意不刷**，
由既有 `warmRestoreDirQuiet()` 后台自愈，避免 R45 那类跨进程 IO 打满主线程；
未跑 `build.sh`、未升版本、未把 HAP 放桌面；本轮**未推送**任何远端。

---

## 第五十八轮：视窗缩放后右侧预览图不再被过度缩小（2026-11-21，R58）

> 使用者反馈：**「视窗模式下右侧预览图的缩放异常：当缩小视窗或动态调整视窗尺寸时，
> 预览图会被过度缩小，只占预览框很小的面积比例」**。本章只改 `onAreaChange` 的
> 画布基准计算，不动 `build()` 布局与 `objectFit(ImageFit.Contain)` 渲染链。

### 一、根因链路（数值复现，不靠推测）

主图 / 右页图的布局框由 `.width(this.viewBoxW(half))` + `.height(this.frameH())` 决定，
而 `frameW()` / `frameH()` / `viewBoxW()` 全部来自 `@State canvasW/canvasH`。画布尺寸有
两个异步数据源：右侧预览 `Stack.onAreaChange` 的**实测值**，以及根
`Stack.onAreaChange` 用 `canvasFromRootOf(rw, rh, chromeW, chromeH)` 的**反推兜底值**
（R5 为「深层 `layoutWeight(1)` 预览 Stack 收不到 onAreaChange」加的）。
`chrome = 根尺寸 − 画布尺寸` 是左栏 + 顶栏等固定占用，**正常 resize 时是常量**。

污染点在预览回调里：

```ts
this.chromeW = this.lastRootW - w;   // 用「上一帧根尺寸」减「本帧画布」
this.chromeH = this.lastRootH - h;
```

PC 拖窗口时两个 `onAreaChange` 异步交错，缩小视窗瞬间预览回调先到，而
`lastRootW/H` 还是旧值 —— 窗口缩小量被整块错算进固定栏偏移：

| 步骤 | 根尺寸 | 实测画布 | chrome | 反推画布 | 图片框占真实预览框 |
|---|---|---|---|---|---|
| 稳态 | 1600×900 | 1300×820 | 300×80 | — | 100% |
| 缩到 1000×600，预览回调先到 | 旧 1600×900 | 700×520 | **900×380**（污染） | — | — |
| 根回调随后用脏 chrome 反推 | 1000×600 | 应为 700×520 | 900×380 | **100×220** | 宽 14.3% / 高 42.3% / **面积 6.0%** |

反推值随后**覆盖**了刚写进去的实测画布，于是 `ImageFit.Contain` 按 100×220 去适配，
实机表现就是「图片缩成预览框角落里的一小块」。放大视窗时则出现「画布大于根」的
同类跨帧错配。数值链由 `/tmp/r58-probe.mjs` 用真实 `canvasFromRootOf()` 复现，并由
测试里两条「数值复现」断言逐值钉死。

### 二、修法（两道护栏，治本 + 保守兜底）

- **治本：`chromeSampleOf()`（零 IO 纯函数）自洽采样固定栏基准**。
  要求 `root` / `canvas` 均为正、`canvas` 不超过 `root`、`chrome = root − canvas` 落在
  `[0, root×0.6]`；基准未就绪时自洽即采信，已就绪时**只挡「异常变大」**（超过基准
  `+2vp` 判为跨帧污染，保持原基准），一致 / 合法变小 / 向更合理值收敛都照常采信。
  由 `CHROME_SAMPLE_TOL = 2` / `CHROME_SAMPLE_MAX_RATIO = 0.6` 参数化。
- **兜底：`canvasResizeAcceptOf()` 拒绝塌缩反推值覆盖实测画布**。
  根回调反推的 `box` 只是 R5 兜底，若小于根尺寸的 0.4 倍或超过根尺寸，一律
  `hilog.info` 后 `return`，保留当前可信画布（通常是预览回调刚写的实测值）。
  **保守拒绝而非猜测改写**，所以永不写错值。由 `CANVAS_MIN_ROOT_RATIO = 0.4` 参数化。
- **结构变化的合法重建**：全屏切换原本就在 `setFull()` 里把 chrome 置 `-1`；R58 在
  「工具栏 `collapse` / `Ctrl+B` / 分割条 `»` 按钮」**三处左栏收起展开**同样置 `-1`，
  让固定栏结构真的变了时能重新建基准（否则「展开 → chrome 变大」会被污染判据挡住）。
  根回调的 seed 也收紧成 `changed && (chrome < 0)`：收起展开时根尺寸不变，绝不拿旧画布
  反推 seed，避免把小 chrome 固化成基准。
- **不动的部分**：`build()` 布局、`.objectFit(ImageFit.Contain)`、`autoResize(false)`、
  `viewBoxW(half)` / `frameH()`、并排策略 `spreadRightWantedOf`、放大镜、文本预览、
  目录恢复 / 返回刷新链全部一字未改 —— 因此其它界面布局零回归。

### 三、改动范围（3 个代码 / 测试文件 + README）

| 文件 | 改动 |
|---|---|
| `common/ViewPlan.ts` | 新增 `chromeSampleOf()` / `canvasResizeAcceptOf()` 两个零 SDK / 零 IO 纯函数（第五十八轮区块） |
| `pages/Index.ets` | import 两个新纯函数 + 3 个护栏常量；预览回调 `chromeW/H` 改走 `chromeSampleOf()`；根回调 seed 加 `changed` 闸门、覆盖画布前加 `canvasResizeAcceptOf()`；3 处左栏收起展开重置 chrome；`ESC_BUILD_TAG` R57→R58 |
| `tests/dirname.test.mjs` | 新增 20 条 R58 断言（纯函数 10 / 数值复现 2 / 源码接线 6 / 零回归 2）；批量升级 21 处构建标记 R57→R58、10 组旧包排除数组首位补 `R57`；改写 1 组 R5 栏偏移接线断言；新增 R58 真机步骤 |
| `README.md` | 本章 + 抬头 / 「使用前必读」构建标记与测试行号同步 |

未动 `AppScope/app.json5`（恒 `1.0.7 / versionCode 7`）、`EntryAbility.ets`、
`components/` / `model/` 五个组件化文件，以及任何目录浏览 / 恢复链代码。

### 四、验证结果（三类证据严格分开）

| 证据 | 结果 |
|---|---|
| **静态契约 / 纯函数** | `ALL PASS 1899 passed, 0 failed`（R57 基线 1879，+20）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 26 s 775 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 16 s 559 ms`**（**非 UP-TO-DATE**，首轮即为真编译，无需强制改注释）；**0 ERROR / 17 WARN**（8 条 `preferences` 可能抛异常 + 1 条 `READ_IMAGEVIDEO` 权限 + 8 条 2in1 系统栏 API，与 R57 基线一致且全部落在未改动区域） |
| **产物核验** | 签名 HAP **1,224,068 B**（R57 为 1,218,910 B）/ 未签名 **1,190,510 B** / `modules.abc` **702,940 B**；产物晚于源码；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R58=1 / R57=0 / R56=0 / R55=0 / R38=0 / R37=0`**、**`1.0.7=1 / 1.0.6=0`**，且 `chromeSampleOf` / `canvasResizeAcceptOf` 各 2 处进入产物 |
| **真机验证** | ⚠️ **未做，由使用者完成**。**编译校验 ≠ 真机验证** —— 「缩小 / 连续拖拽 / 放大 / 全屏往返 / 收起展开左栏」五种视窗变化下右页图的实际适配比例，必须实机截图确认 |

### 五、真机步骤（逐字取自 `tests/dirname.test.mjs` R58 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R58-A：正常视窗打开图片 → 把窗口拖小到约一半 → 右侧（并排右页）预览图应始终
>     按预览框合理适配、占据大部分面积，不得缩成预览框角落里的一小块；Ctrl+D 角标必须是 R58。
> ⚠️ 真机步骤 R58-B：缓慢来回拖动窗口边框连续改变尺寸 → 过程中图片不应突然塌缩；
>     松手后稳定态与同尺寸直接打开的显示比例一致（无残留脏基准）。
> ⚠️ 真机步骤 R58-C：放大视窗 / 进出全屏 / Ctrl+B 或 » 收起再展开左栏后，
>     预览图仍按预览框适配；单页 / 并排、放大镜、文本预览、目录恢复均不受影响。

**边界**：未跑 `build.sh`、未升版本、未把 HAP 放桌面；本轮**未推送**任何远端。
R57 遗留的 GitHub 同步仍需使用者重新提供 PAT（此前 PAT 为进程级临时注入、不落盘）。

---

## 第五十九轮：往上层后返回前子目录反色 + 左栏名称紧贴最左边缘（2026-11-21，R59）

> 使用者要求：**「① 执行『回上层』后，在左侧列表中将返回前所在的子目录名称以反色状态显示；
> 每次返回均需正确更新该状态，且不改变其他列表项的默认样式。② 移除左侧列表中所有档案与
> 目录名称文字的左侧留白（含内边距及缩进），使文字统一紧贴列表最左边缘对齐；
> 上述调整不得影响原有的目录切换与常规选中逻辑」**。本章只新增一条**纯视觉标记链** +
> 调整三层左缘留白，`cur` / `select()` / `dataSource.reload()` / 目录切换主链一行未动。

### 一、两条需求分别落在哪条链

- **反色标记是纯视觉态，不能混进常规选中态**。左栏由 `SidebarView` 的 `LazyForEach`
  渲染 `ArchiveRow`，常规选中由 `@Prop cur` 决定
  （`selected: (item.itemIndex ?? idx) === this.cur`）。若把「往上层后高亮」也塞进
  `cur`，会连带改掉点选 / 翻页 / 预载 / 目录切换。因此 R59 新建**独立**的
  `@State upReturnName`，与 `cur` 并列下传 `SidebarView` → 逐行算 `inverted` →
  `ArchiveRow` 的**独立** `@Prop inverted` 只驱动配色函数，完全不参与任何导航 / 选中逻辑。
- **反色判定抽成零 SDK / 零 IO 纯函数真值源** `common/UpReturn.ts`，可被
  `node --experimental-strip-types` 直接回归：
  `upReturnMarkOf()`（只有真正上移落地 + 能取到合法子目录名才产生标记，过滤 `..` / `.` /
  未命名兜底）、`upReturnRefreshOf()`（每次返回**整体替换**，连续返回不叠加、失败值不残留）、
  `upReturnClearOf()`（换源 / 进子目录 / 恢复清空；自动重扫与保位刷新**保留**）、
  `upReturnInvertOf()`（标记非空 + **名字严格相等** + **目录类行**才反色；
  `ROW_FOLDER` 与 `ROW_OTHER` 都认，图片 / 文本 / `..` 行一律不反色）、
  `upReturnBgOf()` / `upReturnFgOf()`（非命中行逐字返回原配色，亮底沿用奇数条纹、
  深字沿用选中文字色，保持既有色系）。

### 二、反色标记的生命周期（每次返回都正确更新，失败不残留）

| 环节 | 处理 |
|---|---|
| `browseUp()` 入口 | 先 `upReturnClearOf(..., false)` **清掉上一次标记**，保证失败 / 早退 / 只读名单态 / 层级校验不过绝不残留陈旧高亮；同时用 `baseName(current)` 记下 `fromName`（与 `rows.name` 同源，落地后按名字严格相等命中） |
| 正常全量探索落地 `openFolder(...)` 成功 | 真正落到父层后才 `upReturnMarkOf(fromName, true, canUp)` 整体替换标记，并**再 `dataSource.reload(this.rows)` 一遍** —— `applyItems` 已 reload 过一次（那时标记仍为空），不依赖 `@Prop` 对虚拟化节点的刷新时机，确定性更强 |
| R38 卷根原地重列举成功 | 这是「原地重新列举」**不是**上移一层，`canUp=false` 让 `upReturnMarkOf` 返回空标记，显式刷一次清掉旧反色，R28 越级护栏 / R38 行为逐字不改 |
| `showUpListInApp()` APP 内上层清单 | `upReturnMarkOf(curName, true, true)`，**必须在 `dataSource.reload` 之前**设好，让本次 `LazyForEach` 建出来的可见行就带上新标记；带点真实目录名可能是 `ROW_OTHER`，`upReturnInvertOf` 同样认 |
| `applyItems(keepView)` | `keepView=false`（换源 / 进子目录 / 恢复）清标记，避免上一层名字染到新清单里的同名行；`keepView=true`（1.5s 自动重扫 / 保位刷新）**保留**，避免轮询把刚显示的反色抹掉 |
| `onRowTap(ROW_FOLDER)` 进子目录 | 显式清一次，覆盖 `openFolder` 命中整表缓存 → `applyItems(keepView=true)` 会保留标记的分支 |
| `restoreDirContextOnly()` 冷启动恢复 | 全新会话，显式清一次，绝不带入任何反色 |

### 三、名称文字左侧留白清零（三层 left padding + 图标列位置）

原先名称左缘被四层叠加：`SidebarView` 的 `List.padding({ left: 8 })`、
`ArchiveRow` 外层 `Row.padding({ left: 6 })`、行首 18vp 图标列、以及
`Text(this.name).padding({ left: 8 })` + `constraintSize(minWidth: ... + 8)`。R59：

- `List.padding({ left: 8, right: 8 })` → `.padding({ right: 8 })`；
- 外层 `Row.padding({ left: 6, ... })` → `.padding({ right: 6, top: 1, bottom: 1 })`；
- **`Text(this.name)` 移到 `Row()` 第一个子组件**，删掉其 `.padding({ left: 8 })`，
  `minWidth` 去掉 `+8` 补偿（仍由 `layoutWeight(1)` 撑开长名）；
- **18vp 图标列移到名称之后**，`↑` / `▣` 导航符号与 `.width(18)` / `.height(26)`
  静态锚点全部保留；字节 / 日期三栏的列宽与对齐不受影响；
- `DirName.ts` 的 `listWidthForNames()` 固定开销注释按新布局订正为约 **204vp**，
  但估算值**刻意仍按 226 保留 22vp 保守余量、不收窄列宽**，免得长名字刚好顶到
  边界被 `Ellipsis` 截断 —— 纯余量，不参与任何目录 / 选中逻辑。

> **跨文件计数契约**：测试里 `((INDEX + ARCHIVE).match(/Text\(this\.name\)/g)).length === 1`，
> 因此名称仍保持**单个** `Text(this.name)`，只是移动位置 + 改 `.fontColor()` /
> `.backgroundColor()`，不新增第二个名称节点。历史契约还要求 `INDEX` 中不出现旧按钮
> 文案「回上层」，故本轮注释统一用工程术语「往上层」。

### 四、改动范围（5 个代码 / 测试文件 + README）

| 文件 | 改动 |
|---|---|
| `common/UpReturn.ts` | **新建**：11 个导出（5 常量 `UPRET_*` + 6 纯函数）零 SDK / 零 IO / 零 `await` / `throw` / 零全局可变状态 |
| `pages/Index.ets` | import 4 个符号（`UPRET_NONE` + `upReturnMarkOf/RefreshOf/ClearOf`）；新增独立 `@State upReturnName`；`applyItems` 按 `keepView` 清 / 留；`browseUp()` 入口清 + 记 `fromName` + 三个落地分支重设并 reload；`onRowTap(ROW_FOLDER)` / `restoreDirContextOnly()` 显式清；`SidebarView` 并列下传；`ESC_BUILD_TAG` R58→R59、文件头改 R59 主线 |
| `components/SidebarView.ets` | 新增 `@Prop upReturnName`；`ArchiveRow` 调用加 `inverted: upReturnInvertOf(...)`；`List` 左 padding 清零 |
| `components/ArchiveRow.ets` | 新增独立 `@Prop inverted`；`rowBgColor()` / `labelColor()` / `iconColor()` + 字节 / 日期列走 `upReturnBgOf/FgOf`；名称移到行首、图标列后移、三层左缘清零、`minWidth` 去 `+8` |
| `common/DirName.ts` | 仅订正 `listWidthForNames()` 固定开销注释，函数实现一字未改 |
| `tests/dirname.test.mjs` | 新增 32 条 R59 断言（纯函数 / 真值源零依赖 / 全链路接线 / 三层留白 / 静态锚点 / 零回归）；批量升级 22 处构建标记 R58→R59、2 处 `TEST_SELF` 正则、9 组旧包排除数组首位补 `R58`、3 条标题、2 条旧标记定义；新增 R59 真机步骤 |

未动 `AppScope/app.json5`（恒 `1.0.7 / versionCode 7`）、`EntryAbility.ets`、
`model/` 组件化文件、任何目录浏览 / 恢复 / 返回刷新 / 文本预览 / 并排 / 视窗护栏代码。

### 五、验证结果（三类证据严格分开）

| 证据 | 结果 |
|---|---|
| **静态契约 / 纯函数** | `ALL PASS 1931 passed, 0 failed`（R58 基线 1899，+32）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 16 s 808 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 10 s 44 ms`**（**非 UP-TO-DATE**，首轮即为真编译）；**0 ERROR / 17 WARN**（8 条 `preferences` 可能抛异常 + 8 条 2in1 系统栏 API + 1 条 `READ_IMAGEVIDEO` 权限，与 R58 基线一致且全部落在未改动区域） |
| **产物核验** | 签名 HAP **1,237,669 B**（R58 为 1,224,068 B）/ 未签名 **1,201,732 B** / `modules.abc` **709,816 B**；产物 mtime 23:11 晚于源码 22:59；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R59=1 / R58=0 / R57=0 / R56=0 / R55=0 / R38=0 / R37=0`**、**`1.0.7=1 / 1.0.6=0`**，且 `upReturnMarkOf` / `upReturnInvertOf` / `upReturnClearOf` 各 2 处（定义 + 调用点）、`UPRET_INVERT_BG` 1 处进入产物 |
| **真机验证** | ⚠️ **未做，由使用者完成**。**编译校验 ≠ 真机验证** —— 反色是否只命中「刚离开的子目录名」、连续返回是否只剩当前高亮、所有档案名是否真的紧贴最左边缘，必须实机截图确认 |

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs` R59 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R59-A：进入任意子目录后点「往上层」→ 上层清单里**返回前所在的那个子目录名**
>     整行反色（亮底深字），其余目录 / 档案行保持原有条纹与配色；Ctrl+D 角标必须是 R59。
> ⚠️ 真机步骤 R59-B：连续多层往上层 → 每次只反色「刚离开的子目录名」，上一层的高亮必须消失；
>     进入子目录 / 重选文件夹 / 只读恢复态下不应残留任何反色行。
> ⚠️ 真机步骤 R59-C：左栏所有档案名（图片 / 目录 / 文本 / .. 行）文字统一紧贴列表最左边缘，
>     无任何左内边距或缩进；↑ / ▣ 符号改在名称右侧显示，三栏的字节 / 日期列仍对齐。
> ⚠️ 真机步骤 R59-D：常规点选、双击全屏、翻页、排序、目录切换与悬停缩略图行为均与 R58 一致。

**边界**：未跑 `build.sh`、未升版本、未把 HAP 放桌面；本轮**未推送**任何远端。

---

## 第六十轮：高亮项恒定完整可见（2026-11-22，R60）

> 需求（逐字）：请修复档案/目录列表中高亮项被隐藏的问题……当前高亮的档案或目录
> 必须始终完整显示在容器可视区域内，不会因 scrollbar 偏移、滚动位置变化，或滚动条
> 出现/消失造成的布局变化而被裁剪、遮挡或移出视区。保持现有高亮状态、选中交互、
> 列表顺序和滚动体验不变……不引入额外偏移或布局跳动。

### 一、问题定位（按事件响应链，不凭缓存猜）

| 环节 | 现状 | 后果 |
| --- | --- | --- |
| `SidebarView` 的 `List` | `.scrollBar(BarState.Auto)` + `.padding({ right: 8 })`，`.onScrollIndex((first,last,center)=>…)` 把可见范围上报 `Index.listFirstRow/lastRow` | `BarState.Auto` 滚动条出现 / 消失、容器尺寸变化、目录换源都会改变可见范围，但没有任何路径在范围重新上报后复查高亮行 |
| 滚动出口 | 全源码仅 3 处裸 `this.scroller.scrollToIndex(row, false)`（换源定位 / `scrollOnTap` / `scrollOnStep`），默认 `ScrollAlign.START` | `stepScrollAction` 把「目标行 == 可见首 / 末行」判为已在范围内而不滚 → 卡在视区边缘只露半行的高亮永远不会被校正 |
| 两套高亮态 | 常规 `selected`（`cur`）+ R59 `inverted`（`upReturnName`） | `showUpListInApp()` 里 `cur = -1`、反色行是唯一高亮，且该函数**完全没有定位入口**；长清单里反色行靠下就直接藏在视区外 |
| SDK 能力 | `ScrollAlign.AUTO` = 「Scroll the minimum distance to fully display the specified item」 | 最小位移完整显示，已完整可见时不产生位移 → 不引入额外偏移 / 布局跳动 |

### 二、实现

1. **新建纯函数真值源 `common/HighlightVisible.ts`**（零 SDK / 零文件 IO /
   零 `await` / `throw` / 零全局可变状态）：
   - `highlightRowOf()`：主高亮行，常规选中行优先，`cur=-1` 时退回反色行；
   - `highlightSafeOf()`：安全可见区取 `(first, last)` **开区间** —— `onScrollIndex`
     上报的首末行含仅部分可见的边缘行，一律不算完整可见；
   - `highlightGuardKeyOf()` / `highlightGuardActionOf()`：把 `(row, first, last, total)`
     编成自锁 key；**`pending=false`（纯滚动过程）恒 `HV_NONE`**，绝不把用户正在滚走的
     高亮拉回；可见范围未上报时返回 `HV_NONE` 但**不消费挂起**，等下一次上报；
   - `highlightScrollAlignOf()`：只有 `HV_REVEAL` 才给 `HV_ALIGN_AUTO`（`ScrollAlign.AUTO`）；
   - `highlightResizeOf()`：宽 / 高任一 ≥1vp 变化才挂起，脏值 / 无变化不误触发。
2. **`Index.ets` 接线**（既有 3 处滚动调用**逐字未动**）：
   - 新增 4 个普通字段：`highlightRevealPending` / `highlightGuardKey` /
     `highlightRootW` / `highlightRootH`（不进状态系统、不驱动 UI）；
   - `highlightRowNow()` 同时按 `cur → rowOfItem()` 与 `upReturnName → upReturnInvertOf()`
     找主高亮行，覆盖 APP 内上层清单 `cur=-1` 的独有场景；
   - `armHighlightReveal()` 只翻挂起位 + 清自锁 key；`guardHighlightVisible()` 是
     **唯一新增滚动收口**，用 `ScrollAlign.AUTO` 做一次最小位移，随后立即清 `pending` ——
     `onScrollIndex` 回调递归回来时 `guard` 恒 `HV_NONE`，无抖动；
   - 四个挂起点：`applyItems()` 的 `!keepView` 分支（自动重扫不挂起）、
     `showUpListInApp()`（作废旧可见范围 + 挂起）、`onScrollIndex`（消费挂起）、
     根 `Stack.onAreaChange`（尺寸真变化才挂起，放在所有 early return 之前）。
3. **不引入任何额外偏移**：`SidebarView` 的 List / Row / Text 三层左缘留白、
   `.padding({ right: 8 })`、`.scrollBar(BarState.Auto)`、`.cachedCount(6)` 逐字未动；
   不加 `offset` / `margin` / `padding`。

### 三、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/HighlightVisible.ts` | **新增**：4 常量 + 6 纯函数，R60 全部判定的唯一真值源 |
| `pages/Index.ets` | import `HighlightVisible` 十个符号 + `upReturnInvertOf`；文件头 / `ESC_BUILD_TAG` R59→R60；新增 4 字段与 3 方法；4 处挂起 / 消费接线；既有 3 处 `scrollToIndex` 逐字未动 |
| `tests/dirname.test.mjs` | 新增 **29 条** R60 断言（纯函数 / 零依赖 / 全链路接线 / 零回归）；批量升级 23 处构建标记 R59→R60、12 组旧包排除数组首位补 `R59`、4 条标题、2 条旧标记定义；3 处 `scrollToIndex` 计数契约 3→4（3 既有收口 + 1 护栏收口）；放宽 1 条 R59 import 断言以兼容追加的 `upReturnInvertOf`；新增 R60 真机步骤 |
| `README.md` | 本章 + 抬头 / 章节列表 / 「使用前必读」构建标记与测试行号同步 |

### 四、验证结果

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 纯函数** | `ALL PASS 1960 passed, 0 failed`（R59 基线 1931，+29）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 14 s 588 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 8 s 322 ms`**（**非 UP-TO-DATE**，首轮即为真编译）；**0 ERROR / 17 WARN**（与 R59 基线一致，全部落在未改动的 `preferences` / 2in1 系统栏 / `READ_IMAGEVIDEO` 区域） |
| **产物核验** | 签名 HAP **1,255,259 B**（R59 为 1,237,669 B）/ 未签名 **1,214,767 B** / `modules.abc` **716,804 B**；产物 mtime 00:38 晚于源码 00:34；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R60=1 / R59=0 / R58=0 / R57=0 / R56=0 / R55=0 / R38=0 / R37=0`**、**`1.0.7=1 / 1.0.6=0`**，且 `highlightGuardActionOf` / `highlightSafeOf` / `highlightResizeOf` 各 2 处（定义 + 调用点）进入产物 |

> **编译校验 ≠ 真机验证**。真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。

### 五、真机步骤（逐字取自 `tests/dirname.test.mjs:7079` R60 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R60-A：打开一个长目录（列表出现滚动条）→ 滚轮 / 键盘翻页到中部，
>     当前高亮的档案行必须整行完整可见，不得只露半行、被滚动条盖住或跑出视区；Ctrl+D 角标必须是 R60。
> ⚠️ 真机步骤 R60-B：连续多层往上层 → APP 内上层清单里反色的子目录名必须完整可见；
>     即使该行排在长清单靠下位置，也会自动滚到完整显示，不再藏在视区外。
> ⚠️ 真机步骤 R60-C：缓慢拖动窗口边框改变尺寸 / 进出全屏 / 收起再展开左栏，
>     过程中高亮行不应被裁剪或跳动；滚动条出现 / 消失时列表不发生横向位移。
> ⚠️ 真机步骤 R60-D：用户主动把列表滚到远离高亮项的位置时，滚动体验与 R59 一致
>     （不会被强行拉回）；常规点选、目录切换、排序、文本预览、并排预览均不受影响。

### 六、边界

- 纯滚动过程 `pending=false`，护栏**不介入**，用户主动滚走高亮不被强行拉回；
- 自动重扫（`keepView=true`）不挂起，不产生任何位移；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  本轮**未推送**任何远端。

---

## 第六十一轮：左栏目录项移除正方形方格及其占位（2026-11-22，R61）

> 需求（逐字）：请修改左侧目录列表的显示：移除每个目录名称右侧的正方形方格及其占位，
> 使所有层级的目录项都不再显示该方格。保持目录名称、层级结构、列表布局和原有交互不变，
> 不改动其他图标、按钮、控件或新增多余空白。

### 一、问题定位（按 `build()` 结构，不凭截图猜）

| 环节 | 现状 | 后果 |
| --- | --- | --- |
| `ArchiveRow.build()` 符号列 | 名称右侧是**所有行共用**的单个 `Text`：`ROW_UP`→`↑`、`ROW_FOLDER`→`▣`、其余→空串，配 `.width(18)` + `.height(26)` | `▣` 即用户要移除的方格；`.width(18)` 是它的占位，`.height(26)` 同时撑住整行行高 |
| 直接整列删除 | 会连 `↑` 一起删掉，并让 `.height(26)` 消失 | 「往上层」箭头丢失 + 行高塌缩，违反「不改动其他图标 / 控件」「列表布局不变」 |
| 只把 `▣` 换成空串 | 内容没了，但 `.width(18)` 还在 | 目录名右侧留下 18vp 空白，违反「移除占位」「不新增多余空白」 |
| APP 内上层清单目录行 | `showUpListInApp()` 产生的带点真实目录名灰行走 `ROW_OTHER`，不是 `ROW_FOLDER` | 只处理 `ROW_FOLDER` 会在上层清单里漏掉方格，违反「所有层级」 |

### 二、实现

1. **新建纯函数真值源 `common/FolderGlyph.ts`**（零 SDK / 零文件 IO /
   零 `await` / `throw` / 零全局可变状态）：
   - `FG_COL_W = 18` / `FG_COL_NONE = 0` / `FG_UP_ARROW = '↑'` / `FG_BLANK = ''`；
   - `folderGlyphOf(kind, upKind)`：**只有**「往上层」行给 `↑`，目录 / 图片 / 文本 / 其它一律空串，
     源码不再产生 `▣`；
   - `folderGlyphWidthOf(kind, folderKind, otherKind, normalWidth)`：`ROW_FOLDER` 与 `ROW_OTHER`
     两类目录行**列宽归零**，其余行沿用 18；脏宽度（0 / 负数）回填 `FG_COL_W`，不产生负宽；
   - `folderGlyphHiddenOf()`：目录类行判定的唯一入口，覆盖所有层级。
2. **`ArchiveRow.ets` 接线**（保留原 `Text` 作为 `↑` 与行高载体，而非删列）：
   - 内容 `Text(folderGlyphOf(this.kind, ROW_UP))`；
   - 宽度 `.width(folderGlyphWidthOf(this.kind, ROW_FOLDER, ROW_OTHER, FG_COL_W))`；
   - `.height(26)` / `.fontSize(...)` / `.fontColor(...)` / `.textAlign(TextAlign.Center)` 逐字未动，
     行高不塌；
   - 归零的 18vp 由名称文字的 `.layoutWeight(1)` 弹性吸收；字节 66 / 日期 88 +
     `.margin({ left: 6 })` 靠右固定，**三栏起始位置不变**；
   - 不加 `Blank()` / `Spacer()` / `.width(0)` / 新 `padding` / `offset`，不新增任何空白或偏移。
3. **`Index.ets`**：仅文件头轮次说明与 `ESC_BUILD_TAG` R60→R61（供 `Ctrl+D` 判定新包），
   其余运行时逻辑逐字未动。

### 三、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/FolderGlyph.ts` | **新增**：4 常量 + 3 纯函数，R61 符号列内容与宽度的唯一真值源 |
| `components/ArchiveRow.ets` | import 3 符号；符号列 `Text` 内容与宽度改走纯函数；`▣` 字符与 `.width(18)` 字面量从源码消失；`.height(26)` 等静态锚点保留 |
| `pages/Index.ets` | 文件头 / `ESC_BUILD_TAG` R60→R61 |
| `tests/dirname.test.mjs` | 新增 **21 条** R61 断言（纯函数真值 5 / 零依赖 1 / 源码接线 9 / 零回归 6）；批量升级构建标记、12 组旧包排除数组首位补 `R60`、旧标记定义检查；3 条历史 `▣` / `.width(18)` / 图标列断言升级到 `folderGlyphOf()` / `folderGlyphWidthOf()`；新增 R61 真机步骤 |
| `README.md` | 本章 + 抬头 / 章节列表 / 「使用前必读」构建标记与测试行号同步 |

### 四、验证结果

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 纯函数** | `ALL PASS 1981 passed, 0 failed`（R60 基线 1960，+21）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 14 s 369 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 8 s 140 ms`**（**非 UP-TO-DATE**，首轮即为真编译）；**0 ERROR / 17 WARN**（与 R60 基线一致，全部落在未改动区域） |
| **产物核验** | 签名 HAP **1,253,783 B**（R60 为 1,255,259 B）/ 未签名 **1,217,667 B** / `modules.abc` **718,280 B**（R60 为 716,804 B）；产物 mtime 01:49 晚于源码 01:29–01:34；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 **`R61=1 / R60=0`**、**`1.0.7=1`**、**`▣=0`**，且 `folderGlyphOf` / `folderGlyphWidthOf` 各 2 处（定义 + 调用点）、`FG_COL_W=1` 进入产物 |

> **编译校验 ≠ 真机验证**。真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。

### 五、真机步骤（逐字取自 `tests/dirname.test.mjs:7197` R61 组）

> ⚠️ 本组是静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R61-A：进入含多层子目录的目录，逐层进入 → 每一层左栏的目录名称右侧
>     都不再出现正方形方格，方格原位置也没有空白占位，名称紧贴最左边缘；Ctrl+D 角标必须是 R61。
> ⚠️ 真机步骤 R61-B：连续「往上层」→ APP 内上层清单里的目录项（含带点真实目录名灰行）
>     同样不显示方格、不留占位；「..」行的 ↑ 箭头仍保留，其余图标 / 按钮 / 控件不变。
> ⚠️ 真机步骤 R61-C：对比 R60 → 三栏（名称 / 字节 / 日期）起始位置、行高、条纹、间距
>     完全一致，长目录名不被截断或错位；收起 / 展开左栏、拖动窗口尺寸均无布局跳动。
> ⚠️ 真机步骤 R61-D：常规点选、双击全屏、翻页、排序、目录切换、悬停缩略图、
>     高亮项完整可见、文本预览与并排预览均与 R60 一致，无回归。

### 六、边界

- 只改「目录名称右侧符号列」的内容与宽度；`↑`、行高、字节 / 日期列、名称贴左、
  反色 / 选中样式、点击 / 双击 / 悬停交互全部保持；不新增任何空白或偏移；
- R59-C 真机步骤里的 `↑ / ▣` 是 **R59 当时的形态**，按「逐字取自测试」原则不改写；
  **R61 起目录行的 `▣` 及其占位已移除**，`↑` 仍保留；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  本轮**未推送**任何远端。

---

## 第六十二轮：主预览 resize 画质 —— 动态插值 + PixelMap 边缘 AA（2026-11-22，R62）

> 需求（逐字）：请定位并修复现有代码中右侧预览图的 resize 质量问题：当前预览图缩放后，
> 原本平滑的边缘出现波纹和锯齿。请优化相关 resize 算法及参数，确保在不同缩放比例下
> 边缘平滑、细节不过度失真，并避免引入明显模糊、位置偏移或性能下降；保持现有预览尺寸、
> 显示范围和功能行为不变。

### 一、问题定位（按 SDK 枚举语义与缩放链路，不凭缓存猜）

| 环节 | 现状 | 后果 |
| --- | --- | --- |
| 主预览三个清晰图源 | `viewPixelMap` / `Image(uri)` 兜底 / `rightPixelMap` **无条件** `.interpolation(ImageInterpolation.High)` | SDK 26 官方 L190-236：`High` = Cubic（放大最高画质档，核带负 lobe）、`Medium` = MipMap（缩小专用预滤波金字塔）、`Low` = 双线性（默认）、`None` = 最近邻 |
| 有效缩放比 | `viewEdge()` 是 1.5×（普通）/ 2.0×（全屏）oversampling 解码档位；zoom=1 时 GPU 实际在**缩小** 0.67× / 0.50× | Cubic 负 lobe 在无预滤波的缩小采样下产生**过冲 / 振铃（波纹）**；非整数 zoom 相位漂移再叠加一次 |
| 主预览四个图源 | 一个都没开 `.antialiased(...)`；该属性 since 23 **默认关闭** | PixelMap 边缘无 AA → **锯齿**；放大镜层第十七轮早已五源全开 AA，所以「圆内平滑、主视图缩放后反而有波纹锯齿」 |
| 历史修复范围 | 第十七轮只改 `loupeInterpolation()`（按 `loupeScale()` 分 High/Low）+ 五源 AA | 主预览层一直是「恒 High + 零 AA」，是本轮要补的缺口 |
| 解码 / 布局 | `autoResize(false)` / `objectFit(Contain)` / `.scale(zoom)` / `viewEdge()` / 缓存 / resize 节流全部正常 | **不是**档位不足或布局问题，改解码档位只会徒增解码次数与内存，故本轮一律不动 |

### 二、实现

1. **新建纯函数真值源 `common/ResizeQuality.ts`**（零 SDK / 零文件 IO / 零异步 /
   零异常 / 零全局可变状态）：
   - `rqScaleOf(decodedLong, canvasW, canvasH, zoom)`：有效 GPU 缩放比 =
     `(画布长边 / 解码长边) × zoom`；尺寸未就绪 / 脏值回退 `1`（保守保持原画质）。
   - `rqInterpolationOf(scale, nearOneTol=0.06, mipmapFloor=0.4)` 三档决策：
     `k ≥ 0.94` → `High`(Cubic，放大 / 1:1 细节最佳)；`0.4 ≤ k < 0.94` →
     `Low`(双线性，无负 lobe，从根上消振铃且不发糊)；`k < 0.4`（极端缩小）→
     `Medium`(MipMap 预滤波消细线 / 曲线混叠)。整数 / 非整数比例**不另设分支**，
     避免阈值附近档位横跳；非整数相位问题由「无负 lobe + 全源 AA」统一解决。
   - `rqAntialiasOf(scale)`：有效比例恒开 PixelMap 边缘 AA，脏值保守关。
   - `rqIntegerScaleOf()` / `rqFractionalOf()`：整数 / 非整数比例判定，供诊断与验证分组。
   - 另附 `rqCubicWeightOf()` / `rqLinearWeightOf()` / `rqResampleOf()` /
     `rqOvershootOf()` / `rqEdgeJitterOf()` 一维信号重采样模型，**只用于数值验证用例**，
     不参与 UI 渲染。
2. **`Index.ets` 接线**（三个新方法 + 属性改写）：
   - `previewScale()` → `rqScaleOf(this.viewEdge(), this.canvasW, this.canvasH, this.zoom)`；
   - `previewInterpolation()` 把档位码映射到 `ImageInterpolation`，是三处清晰图源
     共用的**唯一画质出口**；放大镜层 `loupeInterpolation()` 逐字未动；
   - `previewAntialias()` → `rqAntialiasOf(this.previewScale())`；
   - 3 处 `.interpolation(ImageInterpolation.High)` 改为
     `.interpolation(this.previewInterpolation())`，主预览 **4 个图源**统一加
     `.antialiased(this.previewAntialias())`；低清过渡层保留原 `Medium` + `blur` 观感。
3. **不引入模糊 / 偏移 / 性能下降**：
   - MipMap 阈值压到 `0.4`，正常 1.5×~2× oversampling 的 0.5~0.67 全部走双线性，
     细线不会被低一级金字塔抹宽；
   - 不改 `.width/.height/objectFit/scale/autoResize/dynamicRangeMode`，故**无位置偏移、
     显示范围不变**；
   - 不改 `viewEdge()` / `decodeTo()` / 缓存 key / `RESIZE_RELOAD_THROTTLE_MS`，只改 GPU
     采样属性，**零新增解码、零新增状态字段、零新增 IO**。

### 三、验证用例与结果（整数 / 非整数缩放比 × 细线 / 曲线边缘）

模型：一维灰度信号重采样，输出像素中心映射回源坐标后按核卷积；
`过冲` = 输出超出 `[0,1]` 的总偏离（Cubic 负 lobe 振铃的直接度量），
`抖动` = 二阶差分总量（波纹 / 阶梯锯齿，越小越平滑）。
细线 `THIN = [0,0,0,0,1,0,0,0,0]`（高对比直线边缘）；
曲线 `CURVE = [0,.03,.12,.28,.5,.72,.88,.97,1,1,1,1]`（S 形平滑过渡，模拟圆弧 / 轮廓）。
对比「旧 = 恒 High/Cubic」与「新 = R62 动态档」。

**细线**

| 用例 | 新档位 | 旧过冲 | 新过冲 | 旧抖动 | 新抖动 |
| --- | --- | --- | --- | --- | --- |
| 整数放大 2.0× | High/Cubic | 0.1875 | 0.1875 | 2.75 | 2.75 |
| 整数放大 3.0× | High/Cubic | 0.2222 | 0.2222 | 1.9259 | 1.9259 |
| 1:1 | High/Cubic | 0 | 0 | 4 | 4 |
| 非整数放大 1.37× | High/Cubic | 0.0985 | 0.0985 | 3.2057 | 3.2057 |
| 非整数缩小 0.73× | Low/Bilinear | 0.0696 | **0** | 3.5644 | 2.8219 |
| 非整数缩小 0.67× | Low/Bilinear | 0 | 0 | 0.9262 | 1.0149 |
| 整数倒数缩小 0.50× | Low/Bilinear | 0.0625 | **0** | 2.4375 | 2 |
| 极端缩小 0.25× | Medium/MipMap | 0.0625 | **0** | 0 | 0 |

**曲线边缘**

| 用例 | 新档位 | 旧过冲 | 新过冲 | 旧抖动 | 新抖动 |
| --- | --- | --- | --- | --- | --- |
| 整数放大 2.0× | High/Cubic | 0.0049 | 0.0049 | 0.2223 | 0.2223 |
| 整数放大 3.0× | High/Cubic | 0.0056 | 0.0056 | 0.1511 | 0.1511 |
| 1:1 | High/Cubic | 0 | 0 | 0.41 | 0.41 |
| 非整数放大 1.37× | High/Cubic | 0.0028 | 0.0028 | 0.3202 | 0.3202 |
| 非整数缩小 0.73× | Low/Bilinear | 0.0022 | **0** | 0.5369 | 0.5193 |
| 非整数缩小 0.67× | Low/Bilinear | 0 | 0 | 0.5875 | 0.5676 |
| 整数倒数缩小 0.50× | Low/Bilinear | 0.0019 | **0** | 0.6631 | 0.635 |
| 极端缩小 0.25× | Medium/MipMap | 0 | 0 | 0.5494 | 0.49 |

结论（已写成静态契约断言）：

- 缩小 4 档 × 2 类信号，新策略**过冲全部为 0** 且不劣于旧恒 Cubic（旧最大 0.0696）；
- 曲线边缘在全部缩小比例下**抖动一律下降**（如 0.73×：0.5369→0.5193）；
- 细线除 0.67× 抖动 0.9262→1.0149（+9.6%，落在「新 ≤ 旧×1.15+0.05」护栏内）外，
  其余全部下降或持平 —— 不引入明显模糊；
- 整数 / 非整数放大与 1:1 共 4 档 × 2 类信号，新旧输出**逐点完全相同**，细节零回归；
- MipMap 只在 `k<0.4` 启用，常规 0.5~0.73 保持双线性。

> 上述是**一维信号模型级数值验证**，不是真机像素测量；结论口径见第五节。

### 四、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/ResizeQuality.ts` | **新增**：3 档位码 + 3 阈值 + 运行时决策 6 函数 + 数值验证模型 5 函数，R62 画质判定的唯一真值源 |
| `pages/Index.ets` | import 7 符号；新增 `previewScale()` / `previewInterpolation()` / `previewAntialias()`；3 处插值改走动态档；主预览 4 源加 AA；文件头 / `ESC_BUILD_TAG` R61→R62 |
| `tests/dirname.test.mjs` | 新增 **20 条** R62 断言（常量 / 决策真值 / 零依赖 / 核函数 / 数值验证 5 / 源码接线 5 / 零回归 3）+ 16 行数值结果表 + 真机步骤 R62-A~D；批量升级构建标记 R61→R62、12 组旧包排除数组首位补 `R61`、2 组旧标记负检查滚动；升级 6 条历史 `High` 计数断言到「动态插值出口恰好 3 处」新语义（保留 `autoResize(false)` / `dynamicRangeMode` 三处护栏） |
| `components/` / `model/` | **未改动**（不改解码档位、不改缓存、不改布局） |
| `README.md` | 本章 + 抬头 / 章节列表（七个独立章节）/ 「使用前必读」构建标记与测试行号同步 |

### 五、验证结果（三类证据严格分开）

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 纯函数 / 数值模型** | `ALL PASS 2001 passed, 0 failed`（R61 基线 1981，+20）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0；数值结果表由 `rqResampleOf` 当场重算打印 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 14 s 67 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 8 s 235 ms`**（**非 UP-TO-DATE**，首轮即为真编译）；**0 ERROR / 17 WARN**（与 R61 基线一致，全部落在未改动区域） |
| **产物核验** | 签名 HAP **1,269,189 B**（R61 为 1,253,783 B）/ 未签名 **1,235,006 B** / `modules.abc` **727,452 B**（R61 为 718,280 B）；产物 mtime 05:17 晚于源码 05:11–05:13；三件产物均检出 **`R62=1 / R61=0 / 1.0.7=1`**，且 `rqInterpolationOf` / `rqScaleOf` / `rqAntialiasOf` / `previewInterpolation` / `previewAntialias` / `rqResampleOf` / `rqOvershootOf` / `rqEdgeJitterOf` 各 2 处（定义 + 调用点）进入产物 |

> **编译校验 ≠ 真机验证**；一维信号数值模型也 **≠** 真机像素验证。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:7364` R62 组）

> ⚠️ 本组是静态契约 + 纯函数 + 一维信号数值验证，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R62-A：打开含细线（栅栏 / 电线 / 文字边缘）与曲线（圆弧 / 轮廓）的图，
>     Ctrl+D 角标必须是 R62；在 100% / 缩小 / 放大各档观察边缘是否还有波纹或锯齿。
> ⚠️ 真机步骤 R62-B：整数倍（200% / 300%）与 1:1 观察细线：细节清晰度与 R61 一致，
>     不出现新模糊 / 发虚，图片位置与显示范围不变，无跳动。
> ⚠️ 真机步骤 R62-C：非整数倍（Ctrl+滚轮到 137% / 73% / 67%）观察细线与曲线边缘：
>     波纹 / 锯齿消失，曲线连续平滑，细线不被抹宽，整体不过度模糊。
> ⚠️ 真机步骤 R62-D：并排右页 / 全屏 / 视窗缩放 / 放大镜 / 文本预览 / 目录切换 / 翻页
>     与 R61 一致，无新增卡顿或掉帧，无新增解码带来的等待。

### 七、边界

- 只改「插值档 + AA」两类 GPU 采样属性；预览尺寸、显示范围、`objectFit(Contain)`、
  `autoResize(false)`、HDR、`viewEdge()` 解码档位、缓存、resize 节流、放大镜五源配置
  全部逐字未动；
- 放大场景仍用 `High`(Cubic)，与第十七轮放大镜口径一致；Cubic 放大的轻微锐化过冲
  在新旧策略中**完全相同**（表中 2.0× 细线 0.1875），属既有行为、非本轮回归；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  本轮未推送任何远端（用户后续另行要求「推送gitee和github」时，R61+R62 已同步）。

---

## 第六十三轮：文本预览 scrollbar 恢复显示（2026-11-22，R63）

> 需求（逐字）：请修复文本档案预览中 scrollbar 消失的问题，恢复原有的 scrollbar
> 显示和滚动行为；确保内容超出预览区域时 scrollbar 可见且可正常使用，同时保持
> 文本档案预览的内容、布局和其他交互不变。

### 一、问题定位（按渲染链与 V1 状态依赖，不凭截图猜）

现状是「视口右缘自绘纵向滚动条」，它是 R37 → R52 → R53 三步演化出来的：

| 轮次 | 形态 | 为什么改 |
| --- | --- | --- |
| R37 初版 | 内层 `List` + 外层横向 `Scroll` 双 `BarState.Auto`（平台原生条） | 初始实现 |
| R51 | 原生条设常显 | 想让条一直可见 |
| R52 | 内层原生条改 `BarState.Off`，`Stack(TopEnd)` 视口右缘**自绘**轨道 + 滑块 | 原生条画在**全宽 `List` 右缘**（x = `textContentW`），长行把横向 `Scroll` 撑宽后它永远在可视区外 |
| R53 | 自绘条真机不显示 → 修 `if` 条件为「全直读 @State」 | `if` 里藏方法调用（`textVBarThumbH()`）时 V1 依赖收集认不出来 |

**本轮的根因（R53 修法里遗留的两个洞）**：

| 环节 | 现状 | 后果 |
| --- | --- | --- |
| `if` 条件 | `this.textVpH > 0 && this.textLines.length > Math.round(this.textVpH / TEXT_ROW_H_VP)` | `textLines` 是**刻意不加 `@State` 的普通字段**（十几万行进状态系统会逐层建代理），V1 依赖收集只追踪 `@State` 的 `textVpH`；文本解码落地填充 `textLines` **不会触发 `if` 重评** |
| `textVpH` 回填 | 只靠 `Scroll.onAreaChange` 的 `Number(n.height)`，外加 `onScrollIndex` 兜底 | 文本态从图片态切过来时**预览区尺寸不变**，`onAreaChange` 可能不回调；`textVpH` 保持 0 → `if` 恒 `false` → **自绘条永久不显示** |
| 叠加 | 两个洞同时存在 | 内容超出一屏也看不到条；`onScrollIndex` 兜底同样依赖事件回调，真机不保证触发 |

> 注意：不能简单把内层 `List` 改回 `BarState.Auto`。那会重现 R52 已定位的「原生条
> 在全宽 List 右缘、长行横向滚出视口后看不见」，且原生条占位会改变布局（违反
> 「保持布局不变」）。正解是保留自绘条结构、修好它的显示判定。

### 二、实现

1. **新建纯函数真值源 `common/TextScrollBar.ts`**（零 SDK / 零文件 IO / 零异步 /
   零异常 / 零全局可变状态）：
   - `textViewportHOf(areaH, canvasH, chromeH)`：`onAreaChange` 实测面积高优先；
     未回填（0 / NaN / 负 / 异常大）时用「画布高 − 固定栏高 48vp」保守兜底；
     连画布高都无效返回 0。恒返回有限非负数，绝不把脏值传给几何计算。
   - `textVisibleRowsOf(viewportH, rowH)`：视口行数（四舍五入、恒 ≥ 1），
     覆盖整数 / 非整数视口高与脏值。
   - `textBarVisibleOf(totalRows, viewportH, rowH)`：**内容行数严格超过视口行数**
     才显示；短文件（未超一屏）与脏值恒不显示。
   - `textBarVisibleSafeOf(...)`：端到端判定，把「尺寸事件没来」一并算进去。
2. **`Index.ets` 接线**（唯一改动在「该不该显示」，几何 / 滑块 / 拖动一字不动）：
   - 新增 `@State textBarShow: boolean = false`，是 `if` **直读的唯一状态**；
     显示判定不再把非 `@State` 的 `textLines.length` 塞进条件。
   - 新增 `refreshTextBar()`：读 `textLines.length`（普通字段）与 `textVpH`，
     用 `textViewportHOf` 拿有效视口高、`textBarVisibleSafeOf` 拿结果，写进
     `@State textBarShow`；尺寸未回填时同时把兜底视口高写回 `textVpH`，让**既有
     滑块几何**（`textVBarThumbH/TopPos/DragTo`）有数可算。
   - 两个主动调用时机：**解码落地 `applyTextDecoded`**（内容驱动，不等尺寸事件）、
     **`onAreaChange` 实测到达**（自愈纠正兜底估计）；`closeTextMode()` 清门控。
   - `Stack(TopEnd)` 里 `if (this.textVpH > 0 && this.textLines.length > …)`
     → `if (this.textBarShow)`。
3. **零回归保证**：`.scrollBar(BarState.Off)`、横向 `Scroll` 的 `BarState.Auto`、
   轨道 10 宽 / 滑块 6 宽亮色 / 最小高 32、`PanGesture`、`HitTestMode.Transparent`、
   `onScrollIndex`（含 `textVpH` 兜底）、`onAreaChange`、`onMouse` 选段、滚轮
   `scrollBy`、Ctrl+C 复制、行高亮 / 工具条、横向滚动全部逐字未动。内容、布局、
   其他交互不变。

### 三、验证用例与结果（尺寸回填 / 内容行数 × 老链路 vs 新链路）

常量：行高 `H=20vp`（`TEXT_ROW_H_VP`）、画布高 `C=600vp`、固定栏 `CH=48vp`、
兜底视口高 `C−CH=552vp`（≈28 行）。老链路 = R53 的 `area>0 && total>round(area/H)`；
新链路 = `textBarVisibleSafeOf`。数值由 `tests/dirname.test.mjs` R63 组当场重算打印。

| 场景 | 视口高 | 视口行数 | 老链路 | 新链路 |
| --- | --- | --- | --- | --- |
| 实测 600 / 长文件 1000 行 | 600 | 30 | true | true |
| 实测 320 / 长文件 1000 行 | 320 | 16 | true | true |
| **尺寸未回填 0 / 长文件 1000 行** | **552（兜底）** | 28 | **false（丢条）** | **true（修复）** |
| **尺寸未回填 NaN / 长文件 1000 行** | **552（兜底）** | 28 | **false（丢条）** | **true（修复）** |
| 尺寸未回填 0 / 刚好一屏 27 行 | 552 | 28 | false | false |
| 尺寸未回填 0 / 短文件 5 行 | 552 | 28 | false | false |
| 实测 600 / 刚好一屏 30 行 | 600 | 30 | false | false |
| 实测 600 / 一屏+1 31 行 | 600 | 30 | true | true |

另：`textVisibleRowsOf` 整数 / 非整数视口高（600→30、610→31、400→20、41→2、
20→1、1→1、0→1、脏值→1）全部符合「四舍五入且恒 ≥ 1」。

结论（已写成静态契约断言）：

- **尺寸事件未回填是全链路最容易丢条的路径**，老链路无论长短文件都判 `false`；
  新链路长文件正确判 `true`（条出现）、短文件仍判 `false`（短文件不该有条）；
- `onAreaChange` 实测值到达时，新老判定**完全一致** —— 正常路径零回归；
- 兜底只在 `textVpH<=0` 生效，实测值随后覆盖，`textVpH` 是 `@State`，滑块几何
  自动自愈重算；
- 全脏（画布高也为 0 / 30）时保守返回 0、不显示条，绝不画错几何。

> 上述是**纯函数 + 视口/行数数值验证**，不是真机像素测量；口径见第五节。

### 四、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/TextScrollBar.ts` | **新增**：2 常量 + 4 纯函数，显示判定与视口高兜底的唯一真值源 |
| `pages/Index.ets` | import 3 符号；新增 `@State textBarShow` 与 `refreshTextBar()`；`if` 改直读 `@State`；`applyTextDecoded` / `onAreaChange` 两处主动算、`closeTextMode` 清门控；文件头 / `ESC_BUILD_TAG` R62→R63；R53 遗留注释订正 |
| `tests/dirname.test.mjs` | 新增 **12 条** R63 断言（常量 / 纯函数真值 4 / 零依赖 / 源码接线 3 / 零回归 3）+ 8 行数值结果表 + 真机步骤 R63-A~D；批量升级构建标记 R62→R63、12 组旧包排除数组首位补 `R62`、2 组旧标记负检查滚动；R53「`if` 全直读」断言升级为 R63「只直读一个 `@State` 门控」 |
| `components/` / `model/` | **未改动** |
| `README.md` | 本章 + 抬头 / 章节列表（八个独立章节）/「使用前必读」构建标记与测试行号同步 |

### 五、验证结果（三类证据严格分开）

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 纯函数 / 数值模型** | `ALL PASS 2013 passed, 0 failed`（R62 基线 2001，+12）；`git diff --check` 通过；本章真机步骤与测试逐字比对缺失 0；数值结果表由 R63 组当场重算打印 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 13 s 464 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 7 s 921 ms`**（**CompileArkTS 非 UP-TO-DATE**，首轮即为真编译；日志里 `UP-TO-DATE` 只出现在 MergeProfile / ProcessResource 等资源类任务）；**0 ERROR / 17 WARN**（与 R62 基线一致，全部落在未改动区域） |
| **产物核验** | 签名 HAP **1,277,828 B**（R62 为 1,269,189 B）/ 未签名 **1,241,401 B** / `modules.abc` **731,100 B**（R62 为 727,452 B）；产物 mtime 09:43 晚于源码 09:38–09:43；三件产物均检出 **`R63=1 / R62=0`**、**`1.0.7=1`**，且 `textBarShow`(4) / `refreshTextBar`(2) / `textViewportHOf`(2) / `textBarVisibleSafeOf`(2) / `textBarVisibleOf`(2) / `TSB_CHROME_H_VP`(1) 进入产物 |

> **编译校验 ≠ 真机验证**；纯函数 / 数值模型也 **≠** 真机像素验证。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:7476` R63 组）

> ⚠️ 本组是静态契约 + 纯函数 + 视口/行数数值验证，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R63-A：打开行数远超一屏的长 .log/.txt → 右侧视口右缘应出现纵向滚动条
>      （亮色滑块 + 深色轨道），Ctrl+D 角标必须是 R63；这是本轮修复的核心现象。
> ⚠️ 真机步骤 R63-B：从图片态点进文本态、反复开关文本预览、切换不同文本文件，
>      每次都应立刻出现滚动条（不再依赖窗口尺寸变化才触发）；短文件（不满一屏）仍不应有条。
> ⚠️ 真机步骤 R63-C：滚轮滚动正文、拖滑块跳转、点击轨道区域选段、Ctrl+C 复制、
>      横向滚长行、行高亮 / 复制 / 清除工具条均与 R62 一致；滑块随滚动联动、无跳动。
> ⚠️ 真机步骤 R63-D：拖动窗口尺寸改变预览区高度后滑块高 / 位置自适应；
>      并排预览 / 全屏 / 放大镜 / 目录切换 / 翻页 / 图片预览画质均与 R62 一致，无回归。

### 七、边界

- 只改「自绘纵向滚动条该不该显示」：新增一个 `@State` 门控与内容驱动的判定；
  原生条 `Off`、横向条 `Auto`、轨道 / 滑块几何、`PanGesture`、`onScrollIndex`、
  `onAreaChange`、`onMouse`、滚轮、选段、复制、行渲染全部逐字未动；内容、布局、
  其他交互不变；
- 「恢复原有的 scrollbar」指恢复**自绘条**（R52 起的既有形态）的显示与滚动行为，
  不是回退到 R37 的原生 `BarState.Auto` —— 后者会重现「长行时看不见」且改变布局；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  本轮**未推送**任何远端。

---

## 第六十四轮：左栏目录内容量统计与展示 —— 空闲扫描 + TTL 缓存 + 四态显示（2026-11-22，R64）

> 需求（逐字）：请在现有项目中实现左侧列表目录的内容量统计与展示：按项目现有口径统计
> 各目录内容量，并在对应目录项上显示结果。仅在应用空闲时自动触发扫描，避免阻塞界面和
> 影响正常操作。为统计结果建立缓存以减少重复扫描，支持缓存有效期设置与按设定周期自动
> 刷新，并在目录或内容变化后使缓存和展示结果与目录实际内容量保持一致。请处理空目录、
> 扫描失败、缓存缺失或过期时的显示状态，保持现有界面风格与交互行为一致。

### 一、口径定义（按 `openFolder()` 现有口径，不另造概念）

「按项目现有口径统计」= 该目录**下一层**由 `fs.listFile(cand, { recursion: false, listNum: 0 })`
列出的**可见条目数**，与 `openFolder()` 建 `rows` 用的是同一套过滤：

| 环节 | 现有口径 | R64 是否沿用 |
| --- | --- | --- |
| URI 写法 | `dirCandidates(uri)` 逐个尝试，结果用 `mergeExploreNames()` 合并去重 | ✅ 完全沿用 |
| 过滤 | 空名 / `.` / `..` / `HIDE_DOT_FILES` 隐藏点文件不计 | ✅ `dcVisibleNamesOf()` |
| 计数 | 图片 / 子目录 / 文本 / 其它各算 **1 项**；恒列的 `..` 行不计 | ✅ 等价于 `rows.length - 1` |
| 范围 | **不递归、不逐个 `statSync`** | ✅ 后台扫描必须非阻塞 |
| 附加 | `dcImageCountOf()` 按 `IMAGE_SUFFIXES` 数「可预览图片张数」 | 仅 hilog 诊断，不改展示主口径 |

数字落在目录行**既有的「字节」列位**（`.width(66)` / `.fontSize(10)` /
`.textAlign(TextAlign.End)` / `.maxLines(1)`），非目录行仍 `fmtBytes(this.bytes)`；
**不新增列、不改行高、不改三栏布局与点击 / 双击 / hover 行为**，正式界面零新增常显控件。
TTL 设置入口只放在既有 `Ctrl+D` 诊断层。

### 二、实现

1. **新建纯函数真值源 `common/DirCount.ts`**（零 SDK / 零文件 IO / 零异步 / 零异常 /
   零全局可变状态；与 `ResumeRefresh` / `TextScrollBar` / `ResizeQuality` 同一条边界）：
   - 四态 `DC_PENDING / DC_OK / DC_EMPTY / DC_FAIL`，文案 `…` / `N 项` / `空` / `失败`；
   - TTL 与调度常量：默认 `300000`（5 分）、夹界 `[30000, 86400000]`（30 秒 ~ 24 小时）、
     心跳 `[1500, 3000]`、空闲阈值 `1500`、单次预算 `2` 个目录、单次超时 `4000`、
     缓存上限 `256`、单目录计数封顶 `4000`；
   - 18 个纯函数 + `DirCountEntry` 接口：TTL 夹界 / 过期 / 空闲九条件 / 放行扫描 /
     可见名过滤 / 计数 / 图片张数 / 四态 / 文案 / 端到端展示 / 是否重扫 / LRU 淘汰量 /
     TTL 文案，全部决策集中在此，UI 里不散落判断。
2. **`Index.ets` 接线（唯一碰磁盘的地方）**：
   - 新增 `POS_KEY_DC_TTL = 'dirCountTtlMs'` 独立 preferences 小 key、
     `DC_TTL_PRESETS = [60000, 300000, 900000, 3600000]`；读入用 `dcTtlClampOf()` 夹界，
     写入前只接受合法区间。
   - 缓存 `Map<string, DirCountEntry>` + `dirCountOrder` LRU（上限 `DC_CACHE_MAX`）；
     三个展示状态 `@State dirCountLabels` / `dirCountVersion` / `dirCountTtlLabel`。
   - 空闲闸门：`markUserActive()` 在根鼠标 / 工具动作 / 点行 / 翻页 / 幻灯片 /
     返回前台等入口打点；`tickDirCount()` 里 `dcIdleOf()`（1.5s 无输入）+
     `dcAppIdleOf()` 九条件（无 `folderBusy` / `playing` / `mtimeBusy` / `pickerBusy`、
     页面存活、恢复完成、`bulkIoAllowed(restoreMode)`、当前有目录态、未切后台）全满足才动手。
   - 非阻塞扫描：每次心跳最多 `DC_SCAN_PER_TICK = 2` 个目录，串行真异步
     `await fs.listFile`、多 URI 写法逐个尝试、不递归不 `statSync`；4 秒挂起用
     `setTimeout` watchdog 推进代际号按「失败」落地，**不新增 `Promise.race`**。
   - 一致性：`onPageShow`、mtime 变化、`applyItems(keepView=true)`、TTL 变更四处调用
     `invalidateDirCounts()`；迟到结果用 `dirCountScanToken` 代际号丢弃，避免旧数字盖回新清单。
   - 生命周期：`aboutToAppear()` 起心跳、`aboutToDisappear()` 停心跳并作废在途结果；
     TTL 变更 / preferences 读回后重建心跳（心跳只排一个 `setInterval`，不碰磁盘）。
3. **展示链路**：`SidebarView` 新增 `@Prop dirCountLabels` / `@Prop dirCountVersion`，
   `dirCountLabelOf(idx)` 按行下标取文案下传 `ArchiveRow` 的 `@Prop countText`；
   `ArchiveRow` 目录行在既有字节列位画内容量（配色复用 `labelColor()`，
   `upReturnFgOf()` 调用数保持 4 不变）、非目录行 `fmtBytes()` 逐字保留。
4. **单行落地**：`GalleryData.notifyRowChanged(index)` 走 `onDataChange(index)`，
   扫描结果只刷对应目录行，不整表 reload、不破坏滚动位置与高亮态。
5. **TTL 设置**：`Ctrl+D` 诊断层 `内容量 N 分钟` 按钮循环
   `1 分 / 5 分 / 15 分 / 1 小时`，状态栏给出「目录内容量缓存有效期：… · 空闲时按此周期
   自动刷新」提示；`dcNeedRescanOf()` 按 TTL 决定是否重扫 —— **周期由有效期设定决定**，
   心跳只决定多久检查一次。

### 三、验证用例与决策表（由 `tests/dirname.test.mjs` R64 组当场重算，非抄表）

常量 `now = 1000000`；四态 → 展示文案 → 是否需要重扫的端到端结果：

| 场景 | 态 | 标签 | 重扫 |
| --- | --- | --- | --- |
| 刚统计 10s / TTL 5min | OK(1) | `12 项` | 否 |
| 统计 4min59s / TTL 5min | OK(1) | `12 项` | 否 |
| **统计满 5min / TTL 5min** | OK(1) | **`…`** | **是** |
| **统计 1min / TTL 30s** | OK(1) | **`…`** | **是** |
| 空目录刚统计 | EMPTY(2) | `空` | 否 |
| **空目录已过期** | EMPTY(2) | **`…`** | **是** |
| 列举失败刚记录 | FAIL(3) | `失败` | 否 |
| **缓存缺失** | PENDING(0) | **`…`** | **是** |

结论（已写成静态契约断言）：

- 缓存**缺失 / 过期**时成功态与空目录的旧数字都不再当权威展示，统一回到 `…`，
  等空闲重扫后显示真实 `N 项`；
- **空目录** `空`、**列举失败** `失败` 各有独立文案；失败态在 TTL 内保留、到期才重试；
- TTL 越短越早重扫 —— 这就是「按设定周期自动刷新」，心跳恒夹在 `[1.5s, 3s]`，
  TTL 设到 24 小时也不会让检查节奏越界。

> 上述是**纯函数 + 决策表数值验证**，不是真机像素 / 文件系统 IO 验证；口径见第五节。

### 四、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/DirCount.ts` | **新增**：4 态 / 3 文案 / 12 项调度常量 / `DirCountEntry` 接口 / 18 个纯函数，统计口径与全部决策的唯一真值源 |
| `pages/Index.ets` | import + 文件头 / `ESC_BUILD_TAG` R63→R64；新增 3 个 `@State`、TTL 小 key 与预设、缓存 / 代际号 / 定时器字段、19 个私有方法；`aboutToAppear` / `onPageShow`（保留 R56/R57 双入口在前）/ `aboutToDisappear` / `applyItems` / `pollMtimeOnce` / `doAction` / `readBrowseExtras` / 多处输入打点接线；诊断层新增 TTL 按钮 |
| `components/ArchiveRow.ets` | 新增 `@Prop countText`；目录行在既有字节列位画内容量，非目录行 `fmtBytes()` 链路逐字保留 |
| `components/SidebarView.ets` | 新增 2 个 `@Prop` + `dirCountLabelOf(idx)`；`ArchiveRow` 调用新增 `countText` |
| `model/GalleryData.ets` | 新增 `notifyRowChanged()`：`onDataChange(index)` 单行刷新 |
| `tests/dirname.test.mjs` | 新增 **31 条** R64 断言 + 8 行决策表 + 真机步骤 R64-A~D；构建标记 R63→R64（26 处）、12 组旧包排除数组首位补 `R63`、2 组 `TEST_SELF` 正则同步、2 处旧标记负检查补 `R63` |
| `README.md` | 本章 + 抬头 / 章节列表（九个独立章节）/「使用前必读」构建标记与测试行号同步 |
| `AppScope/app.json5` | **未改动**：`versionCode 7` / `versionName "1.0.7"` |

### 五、验证结果（三类证据严格分开）

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 纯函数 / 决策表** | `ALL PASS 2044 passed, 0 failed`（R63 基线 2013，+31）；`git diff --check` 通过；决策表由 R64 组当场重算打印；本章真机步骤与测试逐字比对 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 32 s 299 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 11 s 998 ms`**（**CompileArkTS 非 UP-TO-DATE**，首轮即为真编译；日志里 `UP-TO-DATE` 只出现在 MergeProfile / ProcessResource 等资源类任务）；**0 ERROR / 17 WARN**（与 R63 基线一致，全部为既有全屏 `setWindowSystemBarEnable` / `setSpecificSystemBarEnabled` 的 2in1 不可用提示，R64 新增方法段无 WARN） |
| **产物核验** | 签名 HAP **1,350,282 B**（R63 为 1,277,828 B）/ 未签名 **1,314,839 B**（R63 为 1,241,401 B）/ `modules.abc` **781,524 B**（R63 为 731,100 B）；产物 mtime 13:01 晚于源码 12:35–12:49；三件产物均检出 **`R64=1 / R63=0`**、**`1.0.7=1`**，且 `dirCountLabels`(6) / `dcEntryLabelOf`(2) / `dirCountTtlMs`(1) 进入产物 |

> **编译校验 ≠ 真机验证**；纯函数 / 决策表数值模型也 **≠** 真机文件系统与像素验证。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:7727` R64 组）

> ⚠️ 本组是静态契约 + 纯函数 + 决策表数值验证，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R64-A：装新包后 Ctrl+D 角标必须是 R64；打开含多个子文件夹的目录，
>    停手约 2 秒后各行「字节」列位依次从「…」变成「N 项」，期间界面不卡、翻页/滚轮照常。
> ⚠️ 真机步骤 R64-B：确认空目录显示「空」；无权/掉线目录显示「失败」；
>    Ctrl+D 诊断层点「内容量 N 分钟」循环切 1分/5分/15分/1小时，状态栏给出有效期提示。
> ⚠️ 真机步骤 R64-C：往子目录里增删文件后返回上层，等一个 TTL 周期（或按有效期设短），
>    该行数字应与目录实际条目数一致；缓存数字不会停留在旧值，也不会在内容变动后串位。
> ⚠️ 真机步骤 R64-D：排序 / 往上层 / 选择文件夹 / 悬停缩略图 / 文本预览 scrollbar /
>    并排预览 / 全屏 / 放大镜 / R61 目录行三栏宽度与行高均与 R63 一致，无新增占位或跳动。

### 七、边界

- 统计是**会话内内存缓存**（`Map` + LRU），只有 TTL 设置本身落 preferences 小 key；
  重启不复用旧数字，进目录后先 `…` 再空闲补扫，不把过期数字当权威展示；
- 「按设定周期自动刷新」= TTL 到期 + 空闲心跳共同决定，不是无条件定时全量重扫；
  任何在途列举 / 幻灯片 / mtime 探测 / picker / 恢复期 / 切后台一律让路；
- 图片张数只作诊断，不参与展示；不递归、不 `statSync`、单目录封顶 4000 项；
- 正式界面零新增常显控件：三个工具按钮、三栏、行高、hover 缩略图、点击 / 双击、
  文本预览 scrollbar、并排预览 / 全屏 / 放大镜、R61 目录行宽度全部零回归；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  **本轮未 push**（R63 本地提交 `0b3416f` 亦未推送）。

---

## 第六十五轮：FITS / XISF 天文图像预览 —— 自解析头 + 灰度拉伸 + 真异步读字节（2026-11-23，R65）

> 需求（逐字）：支持预览fits，xisf格式

### 一、为什么必须自解析（按真实源码判读，不凭缓存推断）

`decodePx()` 是主预览 / 预载 / 悬停缩略图共用的**唯一解码入口**，现状是
`image.createImageSource(ArrayBuffer)` 交给系统 codec。HarmonyOS 26 的 Image Kit
**不认 FITS / XISF** —— 它不是 JPEG/PNG/HEIC 这类编码流，而是天文仪器 / PixInsight 的
**原始像素容器 + 结构化头**。因此不能只把后缀加进白名单就了事：加了仍会解码失败白屏。
本轮按「纯函数真值源 + 唯一碰 SDK 的解码层」分层自解析：

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 纯函数真值源 | `common/AstroImage.ts` | 零 SDK / 零 IO / 零 await / 零 throw / 零全局可变状态；格式识别、FITS 卡片头、XISF XML 头、手写 IEEE754 字节解码、min-max 拉伸、RGBA 组装全在这里，能被 Node 用构造字节回归 |
| SDK 解码层 | `model/Preview.ets` | 唯一碰 `@ohos.file.fs` / `@ohos.zlib` / `image.createPixelMap` 的地方；`decodePx` 分流 → 真异步读整文件字节 → 纯函数解析 → 生成 PixelMap |
| 接线 | `pages/Index.ets` | `IMAGE_SUFFIXES` 追加 4 个天文后缀；`ESC_BUILD_TAG` R64→R65；文件头 |

**格式口径**（按公开规范 + 实测实现，不臆造）：

| | FITS（`SIMPLE=T` 主 HDU） | XISF 1.0（单文件 `XISF0100`） |
| --- | --- | --- |
| 头 | 2880 字节块，每块 36 张 80 字节 ASCII 卡片；`SIMPLE/BITPIX/NAXIS/NAXISn/BSCALE/BZERO/END` | 8B 签名 + u32 LE 头长 + 4B 保留 + XML 头；`<Image geometry="W:H:C" sampleFormat="…" pixelStorage="…" location="attachment:pos:size" compression="…"/>` |
| 数据位置 | `END` 卡片后补齐到 2880 边界 | `attachment:position:size`，position 从文件开头算 |
| 字节序 | **大端** | **小端**（`byteOrder="big"` 才大端） |
| 样本 | BITPIX 8/16/32/-32/-64 → U8/I16/I32/F32/F64 | UInt8/16/32、Int8/16/32、Float32/64 |
| 物理值 | `BZERO + BSCALE * raw` | 原样本值 |
| 通道 | 2D 灰度；3D 且第三维 3 → RGB 平面（planar） | `Gray` 1 通道 / `RGB` 3 通道；`Normal` 交错 / `Planar` 分平面 |

### 二、实现

1. **`IMAGE_SUFFIXES` 追加 `.fits/.fit/.fts/.xisf`**：后缀进本表即自动获得左栏列出、
   进 `items` 翻页序列、hover 缩略图、文件选择器「图片」下拉、R64 内容量计数的全部既有行为
   —— 与 `AstroImage.ts` 的 `AI_FITS_SUFFIXES + AI_XISF_SUFFIXES` 逐项一致（R65 静态契约校验）。
   正式界面**零新增常显控件**，三按钮 / 三栏 / 行高逐字不变。
2. **`decodePx()` 开头分流**：`aiIsAstroName(uri)` → `decodeAstroPx(uri, edge)`；
   其余格式的系统 codec 两行 `createImageSource` 逐字保留、逻辑一行未动。
3. **真异步读字节**：天文 FITS 动辄上百 MB，刻意**不复用** `rawStore.ensure()`
   （它按 `RAW_SINGLE_MAX_BYTES=64MB` 夹死单文件且会污染普通图片 LRU）。
   新增 `readAstroBytes()` 全 `await fs.stat/open/read/close`，`ASTRO_MAX_BYTES=512MB` 防 OOM，
   **零 `new Promise` / 零竞速等待 / 零同步 IO**（工程全源码 `new Promise` 仍恰 2 处），
   读不满即明确失败、绝不半张图。
4. **解析 + 拉伸**：`aiHeaderOf()` 出 `AstroHeader` 决策（含 10 种明确失败码 + 中文原因文案，
   经 hilog 可见，绝不静默白屏）；`aiBoundsOf()` 最多采样 65536 像素估 min/max；
   `aiStretchByteOf()` 归一化后 `pow(t, 0.5)` 提亮暗部（天文线性数据动态范围极大，
   直接除以满量程几乎全黑）；`aiDisplaySizeOf()` 按 `edge` 直接生成目标尺寸、长边夹 8192，
   **天然防 OOM**（不先生成 8K 全尺寸 RGBA 再缩）。物理值带 `BZERO/BSCALE`，
   支持 planar / normal 两种排布，灰度三通道复用同一值。
5. **压缩 XISF**：`compression="zlib"` / `zlib+sh` 用 SDK `@ohos.zlib` 的内存级
   `createZipSync().uncompress(dest, src)`（API 12+，ArrayBuffer→ArrayBuffer），
   解压后 `aiUnshuffleOf()` 纯函数反 `+sh` 字节重排；`lz4/lz4hc/zstd`、`inline:base64`、
   FITS 扩展 HDU、Complex 样本一律给**明确失败态**，不假装支持。
6. **生成 PixelMap**：`image.createPixelMap(rgba.buffer, { size, pixelFormat: RGBA_8888,
   alphaType: OPAQUE })`。`aiRgbaOf()` 产出的 `Uint8Array.buffer` 长度正好 `w*h*4`。
   华为官方 drawing guide 示例是 R,G,B,A 顺序，但开发者论坛有个别机型报「按 BGRA 处理」——
   **`AI_OUTPUT_BGRA` 常量（默认 0）可一键切换 R/B 填充顺序**，属真机验证项（见真机步骤 R65-C）。
   结果组装成既有 `PreviewEntry`（`colorSpace=0 / isHdr=false / exifDegrees=0`），
   上游 `decodeTo` 的缓存复用 / 在途合并 / 失败黑名单 / 预载链全部零改动。

### 三、验证用例（由 `tests/dirname.test.mjs` R65 组当场用构造字节重算，非抄表）

Node 里构造真实的 FITS 头（2880 字节卡片）+ 大端 int16 像素、XISF 单文件
（`XISF0100` + LE 头长 + XML + 4096 处 attachment），验证端到端：

| 场景 | 结果 |
| --- | --- |
| FITS 2×2 灰度 BITPIX=16 | `ok=AI_OK`、宽高 2×2、I16 大端、`dataOffset=2880 / dataLength=8` |
| 物理值 min-max | 像素 `0/100/1000/32000` → `lo=0 / hi=32000` |
| 灰度拉伸 | `0 → R=0`，`32000(max) → R=255`，`alpha=255`，gamma=0.5 提亮暗部 |
| XISF 2×2 UInt8 Normal | `ok=AI_OK`、小端、`layout=Normal`、`pos=4096 / size=4` |
| IEEE754 手写解码 | float32 `1.0`、`π`；float64 `1.0` 位模式全部正确（不用 DataView） |
| 反 `+sh` shuffle | itemSize=2 的字节平面还原为交错样本 |
| 显示尺寸 | `8000×4000 @edge=1024 → 1024×512`，长边夹 8192 |
| 失败态 | 太短 / 缺 SIMPLE / 坏 BITPIX / 坏 geometry / 未知压缩 / 数据不足各有明确失败码 |

> 上述是**构造字节的纯函数数值回归**，不是真机像素 / 文件系统 IO 验证；口径见第五节。

### 四、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/AstroImage.ts` | **新增**：格式 / 状态 / 布局常量、`AstroHeader`/`AstroBounds`/`AstroSize` 接口、约 40 个纯函数（后缀识别、字节读取、IEEE754 解码、FITS 头、XISF 头、反 shuffle、拉伸、RGBA）；零 SDK / 零 IO / Node 可回归 |
| `model/Preview.ets` | import `zlib` + `AstroImage`；`decodePx` 开头分流；新增 `readAstroBytes` / `astroPixelsOf` / `decodeAstroPx` 三个异步函数（真异步 IO、zlib 解压、createPixelMap）；系统 codec 链逐字保留 |
| `pages/Index.ets` | 文件头 / `ESC_BUILD_TAG` R64→R65；`IMAGE_SUFFIXES` 追加 4 个天文后缀 |
| `tests/dirname.test.mjs` | 新增 **28 条** R65 断言 + 真机步骤 R65-A~D；构建标记 R64→R65（27 处）、12 组旧包排除数组首位补 `R64`、2 组 `TEST_SELF` 正则同步、断言标签同步 |
| `README.md` | 本章 + 抬头 / 章节列表（十个独立章节）/「使用前必读」构建标记与测试行号同步 |
| `AppScope/app.json5` | **未改动**：`versionCode 7` / `versionName "1.0.7"` |

### 五、验证结果（三类证据严格分开）

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 构造字节纯函数** | `ALL PASS 2072 passed, 0 failed`（R64 基线 2044，+28）；`git diff --check` 通过；FITS / XISF 头、拉伸、IEEE754、反 shuffle 全部由 R65 组构造字节当场重算 |
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 59 s 819 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 35 s 179 ms`**（**CompileArkTS 非 UP-TO-DATE**，日志里 `UP-TO-DATE` 只出现在资源类任务）；**0 ERROR / 17 WARN**（与 R64 基线一致，全部为 Index.ets 既有全屏 `setWindowSystemBarEnable` 系 API 的 2in1 提示，R65 新增的 `Preview.ets` / `AstroImage.ts` 零 WARN） |
| **产物核验** | 签名 HAP **1,437,802 B**（R64 为 1,350,282 B）/ 未签名 **1,400,621 B**（R64 为 1,314,839 B）/ `modules.abc` **825,080 B**（R64 为 781,524 B）；产物 mtime 00:15–00:16 晚于源码 23:55–00:13；三件产物均检出 **`R65=1 / R64=0`**、**`1.0.7=1`**，且 `aiFitsPlanOf` / `aiXisfPlanOf` / `decodeAstroPx` / `aiRgbaOf` / `AI_OUTPUT_BGRA` / `XISF0100` 进入产物 |

> **编译校验 ≠ 真机验证**；构造字节的纯函数数值模型也 **≠** 真机文件系统与像素验证。
> 尤其 `createPixelMap` 的 R/B 通道顺序是平台相关行为，真机 DevEco 安装、`hdc` / `hilog`
> 侧验证由使用者完成（见 R65-C）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:7966` R65 组）

> ⚠️ 本组是静态契约 + 构造字节纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R65-A：装新包后 Ctrl+D 角标必须是 R65；打开含 .fits/.xisf 的目录，
>    这两类文件在左栏列出、点行进图片翻页序列，主视图显示拉伸后的天文图（非全黑），翻页/滚轮不卡。
> ⚠️ 真机步骤 R65-B：FITS（16 位 / float 灰度、3 通道）与 XISF（UInt8/UInt16、Normal/Planar、
>    zlib 压缩）分别能显示；损坏 / 超大 / lz4 等不支持文件给明确失败提示而非白屏或崩溃。
> ⚠️ 真机步骤 R65-C：若天文图 R/B 通道偏色（华为个别机型 createPixelMap 按 BGRA 处理），
>    把 AI_OUTPUT_BGRA 常量在 0↔1 间切换后重装验证 —— 属平台差异，编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R65-D：既有 HEIC/JPG/PNG / 文本预览 / 并排 / 全屏 / 放大镜 / 文本 scrollbar /
>    R64 内容量统计 / 三栏三按钮 / 版本 1.0.7/7 全部零回归，无新增常显控件或跳动。

### 七、边界

- 系统 codec 不认 FITS / XISF，本轮只对这两种后缀自解析；普通图片链一行未动；
- 支持主 HDU 未压缩 FITS、单文件 attachment/embedded 的未压缩或 zlib(含 +sh) XISF；
  `lz4/lz4hc/zstd`、`inline:base64`、FITS 扩展 HDU、Complex 样本明确失败态，不假装支持；
- 天文整文件走独立真异步读取（512MB 上限），不进 `rawStore` 的 64MB 图片 LRU；
  目标 RGBA 按 `edge` 直接生成，长边夹 8192，全程零同步 IO、零新增 `new Promise`；
- `AI_OUTPUT_BGRA` 默认 0（R,G,B,A），真机偏色切 1 —— 属平台差异，编译校验无法覆盖；
- 正式界面零新增常显控件：三个工具按钮、三栏、行高、hover 缩略图、点击 / 双击、
  文本预览 scrollbar、并排 / 全屏 / 放大镜、R64 内容量统计全部零回归；
- 未跑 `build.sh`、未升版本（`1.0.7 / versionCode 7`）、未把 HAP 放桌面；
  **本轮未 push**（R63 `0b3416f`、R64 `4881f65` 亦未推送）。

---

## 第七十九轮：重启后「图片授权已失效」误判修复 —— 只读名单态目录重列举兜底（2026-11-27，R79）

> 用户报障（截图 + 原文）：「退出 APP 后再次打开 APP 时，界面显示截图中的错误信息，而且无法预览退出前正在查看的图片。」截图：左栏 42 张名单与当前高亮行都在、三个图案按钮已是 R78 形态，右侧预览区停在「⚠️ 上次名单已恢复，图片暂时不能预览 / 已恢复上次名单（42 张）· 图片读取授权在重启后已失效，点「选择文件夹」重新打开「编号202622 模特 小仙女」即可看图 · ro1」，底部状态栏 `「DSC03381.jpg」暂不能预览（授权已失效）…`。

### 一、现状判读（按真实源码，不凭缓存推断）

- **卡片 / 状态栏 / 诊断标记三者同源**：卡片正文由 `readonlyHint()`（ResumePlan）逐字生成，点行提示由 `readonlyTapHint()` 生成，`ro1` = `RESTORE_TAG` ⇒ 当前确为 `RESTORE_READONLY`。
- **判死点只有一个 uri**：`restoreFromSnapshot()` → `probeRestoreUris(uris, okUri, savedUri, fast=true)` → `probeTakeOf(fast, n)` **恒返回 1**；而 `restoreProbeUris()` 的候选顺序是 `okUri`（最后一次成功显示的那张）→ `savedUri` → 快照前几条。⇒ 只要「退出前正在看的那张」被移走 / 改名 / 换了 URI 形态，整批 42 张就被一起判成「授权失效」。
- **自愈也只探同一个**：`healRestoreMode()`（R77 的本地延迟自愈）同样 `fast=true` → 仍只探 `okUri`，于是整个会话永久停在只读态。
- **目录授权与快照 uri 是两件事**：`openFolder()` 的既有注释写明「picker 的 FOLDER 模式返回的 uri 形态不统一，且 URI 授权是逐项的：能 listFile 不代表能读子文件」。快照里那批旧 uri 不可读，不等于目录持久授权失效；现有链路把两者混为一谈。
- **不能直接 openFolder 兜底**：`openFolder()` 对每个子项 `fs.statSync`（同步跨进程）；在授权不可用的目录上成百上千次同步调用正是历史 appfreeze 的根因。
- **三场景同一条链**：正常退出（`quitApp` → `flushPosSync`）、后台被系统回收、强制关闭，都是冷启动走 `beginRestore()` → `activatePersistedUri` → `showLastOnStart` → `restoreFromSnapshot`。差异只在 `flushPosSync` 是否跑完（影响 `lastPos` 的落点精度）；`savedDirUri` 在选目录时就写盘，不依赖退出落盘 ⇒ 三场景表现一致，修复一处即可覆盖。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/ResumePlan.ts` | 新增 `readonlyRelistAction(readonlyMode, hasDirUri, networkDir, userActed, giveUp, count)`（何时值得兜底）、`relistProbeOkOf(listed, openOk)`（轻量确认判据）、`relistOkHint(tag)`；`RELIST_SKIP / RELIST_TRY` 常量。零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 |
| `pages/Index.ets` | `ESC_BUILD_TAG → R79`；新增 `READONLY_RELIST_DELAY_MS=900` / `RELIST_CAND_MAX=2` / `RELIST_TAG='rl1'` / `readonlyRelistTimer`；新增 `scheduleReadonlyRelist()`（延迟排程）与 `tryReadonlyRelist(base)`（1 次 async `listFile` → 1 次 `openSync` → 通过才 `openFolder(cand, false)` 真实重建）；快照恢复与单张兜底两处 READONLY 分支各排一次；`aboutToDisappear` 清 timer |
| `tests/dirname.test.mjs` | 构建标记整批升位 `R78 → R79`；新增 R79 组 **13 条**断言（纯函数边界 + 接线契约 + 零回归）+ 真机步骤 `R79-A~D`（`10484–10493`） |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R79`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **「只探 1 个」是误判源，但不能简单加大**：`fast` 只探 1 个是为防「失效 uri 的同步 openSync 在 NAS 上挂十几秒」。本轮**不动**这个纪律（`probeTakeOf` / `RESTORE_PROBE_LIMIT` 逐字保留），改在判死之后用一条更可靠的判据补一次：目录能否列出 + 一个子文件能否打开。
- **先轻量确认、再允许 statSync 循环**：`tryReadonlyRelist()` 先 `await fs.listFile(cand)`（异步，不阻塞主线程），再对第一个图片名做**一次** `openSync` 确认可读；两者都过才把目录交给 `openFolder`。此时目录确实可读，`openFolder` 内部逐项 `statSync` 是安全路径（且 size / date / 目录行都回来了）。确认不通过就原样留在只读名单 —— 真授权失效时现有提示仍然正确。
- **只兜本地目录**：`readonlyRelistAction` 对 `isNetworkDirUri(base)` 直接 SKIP；网络目录继续走 R44/R45 的 `warmRestoreDirQuiet` 重试 + `healRestoreMode` 自愈，不引入新的 NAS 同步 IO 风险。
- **落点仍由既有 `restoreIndex` 决定**：`openFolder` → `applyItems(keepView=false)` → `restoreIndex(list)`：先按 `uri` 精确命中，再按 `count + idx` 回退。即使重列举后子 uri 形态变了，只要张数一致就能回到「退出前那张」。
- **成功判定放在 `await` 之后**：`openFolder` 若命中整表缓存会先用旧 uri 渲染一帧，但真实列举随后必然覆盖；`await` 返回时 `items` 已是真实 uri。故用 `ok && this.items.length > 0` 判定「真恢复」；只列出目录（子文件仍不可读）时 `items` 为空，不会被误判成成功。
- **不新起一套提示卡**：成功时只改 `status` + `diagLine`，`restoreHintText` 由既有 `applyPendingRestore` 的 FULL 分支清空；失败什么都不改。

### 四、验证用例（用户要求的三场景 + 回归）

| 场景 | 预期 | 证据 |
| --- | --- | --- |
| **正常退出后重开** | 名单与预览图都正常，回到退出前那张；状态栏出现 `rl1` | `scheduleReadonlyRelist` 两处接线；`readonlyRelistAction(本地 + 有目录 + 只读) → TRY`；`R79-A / R79-B` |
| **后台被系统回收后重开** | 与正常退出表现一致（`savedDirUri` 选目录时已落盘，不依赖退出时 flush） | 同一条 `beginRestore` 冷启动链；`readonlyRelistAction` 不看 `flushPosSync` 结果；`R79-D` |
| **强制关闭后重开** | 同上；即使 `lastPos` 没写盘，最多只是落点从第 1 张起，不再整批白图 | `restoreIndex` 的 `count === list.length` 回退分支；`R79-D` |
| **退出前那张已被移走 / 改名** | 其余相片仍能预览，不再整批判死 | `relistProbeOkOf` 只看「目录可列 + 一个子文件可读」，绕过 `restoreProbeUris` 的单点误判；`R79-C` |
| **真授权失效（目录也不可读）** | 保持只读名单 + 现有重选指引，不假装成功 | `readonlyRelistAction` 通过但 `listFile` / `openSync` 全失败 → 只记日志；`relistProbeOkOf(false, *)` 恒 false |
| 回归检查 | ✅ R70–R78 全部零回归 | 防冻结闸门（`probeTakeOf` / `RESTORE_PROBE_LIMIT` / `bulkIoAllowed`）逐字保留；R78 三图案按钮、R77 adaptive / EXIF / HDR、picture menu、左栏五项菜单、放大镜左键不变 |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2353 passed, 0 failed`**（R78 基线 2340，新增 13 条 R79 断言） |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 48 s 931 ms`**；`Finished :entry:default@CompileArkTS... after 31 s 194 ms`（**非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（与 R69–R78 一致）；日志 `/tmp/r79-build-final.log` |
| 产物 | 签名 HAP **1,819,931 B** / 未签名 **1,778,663 B** / `ets/modules.abc` **1,049,156 B**（R78 分别为 1,801,449 / 1,767,745 / 1,043,064 B），mtime 均为本轮编译时刻 |
| 字节码 | `modules.abc`：**`R79=1 / R78=0 / R77=0 / R76=0 / 1.0.7=1`**；新链路 `rl1=1`、`readonlyRelistAction=2`、`relistProbeOkOf=2`、`relistOkHint=2`、`scheduleReadonlyRelist=2`、`tryReadonlyRelist=2`、`READONLY_RELIST_DELAY_MS=1`、`RELIST_TAG=1`；零回归 `bulkIoAllowed=2`、`probeTakeOf=2`、`openFolder=15`、`ResumePlan=3` |
| 文档一致性 | 测试 R79 步骤块（`10484–10493`）与本章第六节逐字差异 **0** |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R79-A~D`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:10484` R79 组）

>   ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
>   ⚠️ 真机步骤 R79-A：装新包后 Ctrl+D 角标必须是 R79 / 版本 1.0.7·7；
>      选一个本地目录、正常退出（点关闭）后重开 → 左栏名单与预览图都应正常，
>      预览区不再停在「图片读取授权在重启后已失效」卡片。
>   ⚠️ 真机步骤 R79-B：退出前先切到某张特定相片，正常退出再重开 → 应回到同一张；
>      状态栏出现「已按目录授权重新读取，图片可以正常预览了 · rl1」。
>   ⚠️ 真机步骤 R79-C：把退出前那张相片先移走 / 改名再重开 → 其余相片仍能预览，
>      不再因为「那一张没了」整批判死；确实读不到时才停在只读名单 + 重选指引。
>   ⚠️ 真机步骤 R79-D：应用进入后台被系统回收 / 强制关闭后重开 → 表现与正常退出一致；
>      NAS 网络目录仍走原有预热重试 + 自愈，不因本轮改动多出同步 statSync 而变慢。

### 七、边界

- **编译校验 ≠ 真机验证**：静态契约 2353 全绿、真编译成功、字节码有 `R79` 与 `rl1` 标记，只能证明代码 / 产物接线；证明不了 DocumentsProvider 在真机上的授权恢复时机、`listFile` + `openSync` 两次探测的实际耗时、以及重建后落点是否真回到「退出前那张」。请按 `R79-A~D` 回传。
- **不保证「真授权失效」也能救回**：若 picker 的目录持久授权在系统侧真的没了（当初 `persistPermission` 被 `PERSISTENCE_FORBIDDEN` 拒绝、或用户在系统设置里撤销），`listFile` 同样会失败 —— 此时正确行为就是保持只读名单并提示重选，本轮不硬闯。
- **探测纪律未放宽**：`probeTakeOf(fast=true)` 仍恒 1、`RESTORE_PROBE_LIMIT=3` 未动。修复走的是「判死后再用更可靠判据补一次」，不是把启动期的同步 openSync 变多。
- **只兜本地目录**：网络目录仍走 `warmRestoreDirQuiet` 重试 + `healRestoreMode`，避免 NAS 冷挂载时引入新的同步 IO。
- **与 R77 自愈并存**：900ms 的兜底先跑（更可靠），1200ms 的 `healRestoreMode` 仍保留（对「目录列举也慢」是第二道保险）；两者都只在 `!bulkIoAllowed` 时动作，不会互相打架。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、**本轮未 push**（用户未授权；R71–R79 共九个本地提交仍未 push）；GitHub PAT revoke / 轮换提醒仍有效。

---

## 第七十八轮：左栏紧凑显示 / 三个纯图案按钮 / 移除「APP 内上层xxx」提醒（2026-11-26，R78）

> 用户要求（原文）：「请实现以下界面调整，范围限定为左侧档案栏、其上方三个按钮及「APP内上层xxx」提醒，其他界面区域和行为保持不变：当缩进按钮处于按下状态时，档案列表切换为紧凑显示，仅展示档案名或目录名，隐藏时间、大小、状态、辅助标签等所有非名称信息；档案栏宽度根据当前可见内容自动调节，不保留多余空白；当缩进按钮取消按下时，恢复默认布局、完整档案信息和默认宽度表现。将档案栏上方三个按钮统一改为仅显示清晰的图案标识，不显示任何文字标签，同时保留各按钮原有功能、点击区域大小与位置，并确保原有状态反馈清晰可辨，尤其是按下与未按下状态。移除「APP内上层xxx」提醒，确保该文案及其关联提示内容不再出现。」

> 方向澄清（`AskUserQuestion` 三项，用户全部选推荐项）：
> · **「缩进按钮」= 现有 `«` / `»` 分隔条按钮**（与 `Ctrl+B` 共用 `listCollapsed`）—— 按下即紧凑仅名称 + 栏宽按内容自适应，取消即完整三栏 + 默认 adaptive 宽度。
> · **三个按钮用「文字符号 + 方向 / 底色反馈」**：排序 `↑`/`↓` 随升降序切换、往上层用层级上移图案 `⇧`、选择文件夹用几何图案 `▣`；不新增图片资源，按下 / 未按下用高亮底色反馈。
> · **提醒移除范围 = 文案 + 提示条 + 伪说明行**：移除所有 `APP 内上层…` 可见文案、左栏 `dirHint` 提示条 / 状态栏拼接、列表里的 `— 上层清单（APP 内）… —` 伪说明行；「往上层」进入上层清单的功能本身保留。

### 一、现状判读（按真实源码，不凭缓存推断）

- **紧凑态不完整**：`ArchiveRow` 的 `if (!this.collapsed)` 只隐藏大小 / 内容数目 / 日期三列，但 `SidebarView` 抬头仍有 `this.itemCount + ' 张'` 计数、`dirHint` 提示条、空态的 `resumeHint` 与「点左栏「选择文件夹」浏览目录」两行辅助文案 —— 这些都属「非名称信息」，按下态仍会显示。
- **收起宽留白**：`AdaptiveColumn.acLayoutOf()` 里 `collapsedW = floor(rootW * AC_COLLAPSED_RATIO)`（0.30）。1440vp 窗口给出 432vp 的栏宽，而按下态只显示一列名称 ⇒ 右侧一大片空白，正是用户要去掉的「多余空白」。
- **三个按钮带文字标签**：`SidebarView` 里 `ToolButton({ label: '排序 ↑' / '往上层' / '选择文件夹' … })`。`ToolButton.ets` 是左栏、顶栏「全屏」、Ctrl+D 诊断层「内容量 TTL」共用组件，且静态契约锁定它「三参签名 + 无条件恒定外观、恒亮恒可点、永不 grey out」，**不能原地改成带条件颜色的图标按钮**，否则越界影响顶栏 / 诊断层。
- **提醒文案四处可见**：`DirName.inAppUpListHint()` 返回 `APP 内上层「…」清单（N 项）· 点目录名进入 · 不弹系统选择器 · ul1`；`Index.ets` 三处调用（恢复态 `dirHint`、`showUpListInApp` 的 `dirHint` 与状态栏拼接）、一条 `rows.push` 伪说明行、`SidebarView` 的 `dirHint` 提示条 UI。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/AdaptiveColumn.ts` | 新增 `acCollapsedContentOf(names)`：紧凑栏宽按「最长名称估宽 + 行 / List 内边距」与「三个图标按钮并排最小可读宽 + 按钮行 padding」取大推导；`acLayoutOf()` 的 `collapsedW` 改由它推出，`AC_COLLAPSED_RATIO` 从「下限留白」**降级为上限保护**（只可能收窄）。新增 `AC_LIST_PAD_VP` / `AC_ICON_BTN_MIN_VP` / `AC_ICON_BTN_COUNT` / `AC_ICON_ROW_PAD_VP` 四个内容推导常量 |
| `components/SideToolButton.ets`（新） | 左栏三个按钮专用「纯图案」组件：`glyph / act / flex / active` 四参 + `@State down` 瞬时按下态；`onMouse` Press 置位、其余复位 → 高亮底 `#40507a` + 高亮字；`active` 表达排序方向持续态；常态与旧 `ToolButton` 完全同色。**`type/height(30)/padding/margin/layoutWeight/borderRadius` 逐字沿用**，点击区域与位置不变；零图片资源 |
| `components/SidebarView.ets` | 移除 `@Prop dirHint` 与提示条 UI 整块；三按钮改 `SideToolButton({ glyph: … })`（`↑`/`↓` / `⇧` / `▣`，排序另传 `active: !this.sortAsc`）；抬头「N 张」计数与空态两条辅助文案收进 `if (!this.listCollapsed)`（两处）；根宽表达式、四个 `@Prop` 动态宽、`ArchiveRow` 调用逐字不变 |
| `pages/Index.ets` | `ESC_BUILD_TAG → R78`；移除 `inAppUpListHint` import 与三处调用、状态栏拼接、`rows.push` 伪说明行、`dirHint: this.dirHint` 传参；`showUpListInApp` 计数 `rows.length - 2 → - 1`（只扣 `..` 行），状态栏改中性目录态说明；`listCollapsed` / `refreshAdaptiveLayout` 注释升位 R78 语义。`@State dirHint` 保留供右侧预览空态判空（另一界面区域，行为不变） |
| `common/DirName.ts` | `inAppUpListHint()` **恒返回空串**（保留函数导出仅为不破坏纯函数回归的 import 契约），源码里不再有 `APP 内上层「…` 文案模板；`isUpListPseudoName()` 逐字保留，旧快照里的伪行仍被过滤 |
| `tests/dirname.test.mjs` | 构建标记精确串整批升位 `R77 → R78`（43 处）；`ToolButton({ label … })` 旧锚点批改为 `SideToolButton({ glyph … })`；订正 13 条旧语义断言（提示函数 / 伪行计数 / R29·R50 计数 / `dirHint` 提示条 padding / 收起宽随容器变大等）；新增 R78 组 **17 条**断言与真机步骤 `R78-A~E`（`10381–10394`） |
| `README.md` / 记忆 | 抬头 / 功能表 / 手册 / 步骤表升位 `R78`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **紧凑态是「整栏收口」不是「只改行组件」**：`ArchiveRow` 的 `collapsed` 分支本就隐藏三列，本轮补上 `SidebarView` 的抬头计数、`dirHint` 提示条、空态两条辅助文案；hover 缩略图浮层与条纹 / 选中高亮属既有交互与背景，按「其他行为保持不变」保留。
- **栏宽推导 = 当前可见内容**：按下态可见内容只有「名称列 + 三个图标按钮」两样，故 `acCollapsedContentOf(names)` 取两者所需宽度的较大值 —— 既贴合内容、不留空白，又保证三个按钮不被压到看不清 / 点不中。`AC_COLLAPSED_RATIO` 只在内容宽超过根窗口承载时才压窄（**只收窄、绝不制造比例留白**）。静态契约用「同内容不同窗口宽 `collapsedW` 恒等」反证去掉比例下限，用「长内容 > 短内容」证明仍随内容伸缩。
- **另起组件是范围约束的必然**：顶栏「全屏」/ 诊断层「内容量 TTL」仍走 `ToolButton.ets` 且一字未动；若直接给共享组件加 `@State down` / 条件颜色，会连带改变顶栏 / 诊断层外观与历史「恒定外观」断言。新组件命名 `SideToolButton` 含 `ToolButton(` 子串，既有「三个按钮计数」断言继续成立。
- **按下 / 未按下用两态反馈**：`down`（`onMouse` 的 Press 置位、其余复位，走项目 R72/R73 真机验证过的事件通道，零系统手势依赖）→ 瞬时高亮；`active`（由 `sortAsc` 下传）→ 排序方向持续高亮；再叠加 `↑`/`↓` 方向本身，图标化后状态仍一眼可辨。常态色与旧组件逐字相同，视觉零跳变。
- **移除文案要连「生成点」一起拆**：只删提示条 UI 不够 —— `inAppUpListHint()` 仍会被拼进状态栏、`rows.push` 仍会把伪说明行写进列表与快照。本轮把函数体改成恒空、删三处调用 / 拼接 / 伪行 / 传参，计数改 `-1` 只扣 `..`；`UP_LIST_TAG='ul1'` 仍用于诊断串，`isUpListPseudoName()` 继续兜住旧快照。`APP 内上层` 与 `上层清单（APP 内）` 字面串在 HAP 字节码里核验为 **0**。

### 四、验证用例（用户要求的三项 + 回归）

| 确认项 | 结论 | 证据 |
| --- | --- | --- |
| **① 紧凑显示 + 内容自适应宽度** | ✅ 按下只留名称，隐藏时间 / 大小 / 状态 / 辅助标签；栏宽按可见内容自适应、无比例留白；取消按下恢复完整三栏 + 默认 adaptive 宽度 | `SidebarView` 两处 `if (!this.listCollapsed)`；`ArchiveRow` `if (!this.collapsed)`；`acCollapsedContentOf` / `acLayoutOf` 数值回归；`R78-A / R78-D` 真机步骤 |
| **② 三个纯图案按钮 + 状态反馈** | ✅ 零文字标签、图案清晰；功能 / 点击区域 / 位置不变；按下与未按下、升降序均可辨 | `SideToolButton` 三次调用与四个 glyph / act；`height(30)` / `padding(10)` / `margin(3)` / `layoutWeight` / `onClick` 源码契约；`down` / `active` 两态与同色常态断言；`ToolButton.ets` 逐字不动；`R78-B` 真机步骤 |
| **③ 移除「APP 内上层xxx」提醒** | ✅ 文案 / 提示条 / 状态栏拼接 / 伪说明行全部不再出现；往上层功能保留 | `inAppUpListHint(...) === ''`；`INDEX78` 零 `inAppUpListHint` / 零 `APP 内上层「`；`UPLIST_CODE` 零 `上层清单（APP 内）`、仅一条 `uri: ''`（`..` 行）；旧快照 `isUpListPseudoName` 仍过滤；`R78-C` 真机步骤 |
| 回归检查 | ✅ R70–R77 全部零回归 | 版本 `1.0.7 / 7`、构建标记 `R78`、HDR 徽标 / 3 处 `dynamicRangeMode` / R71 HDR 保真、picture menu 三项、左栏五项右键菜单 / 两级 Want、顶栏「全屏」与诊断层「内容量」、放大镜左键、5mm 间距、adaptive 三栏、滚轮 / 双击全屏 / ESC |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2340 passed, 0 failed`**（R77 基线 2323，新增 17 条 R78 断言） |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 17 s 317 ms`**；`Finished :entry:default@CompileArkTS... after 10 s 706 ms`（**非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（与 R69–R77 一致）；日志 `/tmp/r78-build-final.log` |
| 产物 | 签名 HAP **1,801,449 B** / 未签名 **1,767,745 B** / `ets/modules.abc` **1,043,064 B**（R77 分别为 1,792,929 / 1,757,668 / 1,035,196 B），mtime 均为本轮编译时刻 |
| 字节码 | `modules.abc`：**`R78=1 / R77=0 / R76=0 / R75=0 / R74=0 / R73=0 / R72=0 / R71=0 / 1.0.7=1`**；新链路 `SideToolButton=6`、`acCollapsedContentOf=2`、`⇧=1`、`▣=1`、`↑=2`、`↓=2`；**`APP 内上层=0` / `上层清单（APP 内）=0`**（提醒文案与伪说明行字面串彻底消失）；零回归 `ToolButton=12`、`AdaptiveColumn=3`、`refreshAdaptiveLayout=2`、`ROW_GAP_VP=2`、`hbVisibleOf=2`、`startAbility=1` 等 |
| 文档一致性 | 测试 R78 步骤块（`10381–10394`）与本章第六节逐字差异 **0** |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R78-A~E`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:10381` R78 组）

>   ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
>   ⚠️ 真机步骤 R78-A：装新包后 Ctrl+D 角标必须是 R78 / 版本 1.0.7·7；
>      点分隔条 «（或 Ctrl+B）→ 左栏只显示档案名 / 目录名，时间 / 大小 / 状态 /
>      「N 张」计数 / 提示条全部消失，栏宽贴合内容、无右侧大片空白；再点 » 完整恢复。
>   ⚠️ 真机步骤 R78-B：三个按钮只剩 ↑/↓、⇧、▣ 图案，零文字；排序升降序切换时
>      箭头与高亮底色同步变化，鼠标按下 / 松开两态清晰可辨；
>      三个按钮位置、大小、点击区域与旧版一致，排序 / 往上层 / 选择文件夹功能照常。
>   ⚠️ 真机步骤 R78-C：点「⇧ 往上层」进入上层清单，界面任何位置都不再出现
>      「APP 内上层xxx」文案、左栏提示条与「— 上层清单（APP 内）… —」伪说明行；
>      旧快照里若曾存下伪行也不再显示，清单条目数为真实兄弟目录数。
>   ⚠️ 真机步骤 R78-D：拉伸窗口宽度，展开态三栏仍 adaptive 对齐；收起态宽度只随
>      档案名 / 目录名长短变化，不再随窗口比例放大留白。
>   ⚠️ 真机步骤 R78-E：顶栏「全屏」/ Ctrl+D 诊断层「内容量」、右栏预览 / 滚轮换图 /
>      双击全屏 / ESC / 左栏右键菜单 / HEIC HDR 徽标与保真 / 并排右页全部零回归。

### 七、边界

- **编译校验 ≠ 真机验证**：静态契约 2340 全绿、真编译成功、字节码有 `R78` 标记且提醒文案为 0，只能证明代码 / 产物接线；证明不了 `⇧` / `▣` 在实机字体下是否清晰、紧凑态在实机 DPI 下的观感、`onMouse` Press/Release 在 2in1 上的按下反馈是否跟手、以及 `acCollapsedContentOf` 的 42vp 按钮下限是否合适。请按 `R78-A~E` 回传结果。
- **「缩进按钮」按用户澄清固定为 `«` / `»` 与 `Ctrl+B` 共用的 `listCollapsed`**，不是新增控件；`WIN_KEY_COLLAPSED` 持久化形态不变，重启后仍记住收起 / 展开。
- **`inAppUpListHint()` 保留空实现是刻意的**：删函数会连带打掉一整组历史纯函数回归，收益为负；静态契约已断言它恒返回空串且源码零 `APP 内上层「` 文案模板。若后续要彻底删除，需同步改 `tests/dirname.test.mjs` 的 import 与 8 处断言。
- **`dirHint` 状态仍保留**：右侧预览空态「本层没有图片 · 点左侧文件夹进入子目录」用它判空，属另一界面区域，未改动；移除的只是左栏提示条 UI 与传参。
- **紧凑态与按钮行宽的耦合**：三个按钮行 `.width('100%')` 会随紧凑栏宽一起收缩，故 `acCollapsedContentOf` 显式把「三按钮最小可读宽」计入内容下限；按钮自身 `height/padding/margin/layoutWeight` 属性逐字未动，但等分后的实际像素宽会随栏宽变化 —— 这一点需 `R78-B` 真机确认观感。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、**本轮未 push**（用户未授权；R71–R78 共八个本地提交仍未 push）；GitHub PAT revoke / 轮换提醒仍有效。

---

## 第七十七轮：重启资料 / 预览图 / 缩略图完整恢复 + EXIF 有效字段同源 + adaptive column width（2026-11-26，R77）

> 用户要求（原文）：「请修复并调整当前APP的图案/档案列表功能，具体需求如下：
> 1. 重新进入或重启APP后，图案列表需正常显示 size 及日期资料，并完整加载预览图，修复当前资料与缩略图丢失的问题。
> 2. 修正预览图的 EXIF 判定与展示：仅在包含有效EXIF数据时显示EXIF标识，无EXIF时不显示该标识；同时确保存在EXIF时能正确呈现对应的EXIF资料，避免出现标错且无法查看的情况。
> 3. 档案列表改为 adaptive column width，依据内容长度或容器尺寸动态伸缩，移除所有预设/固定宽度限制。
> 请定位相关状态恢复、元数据判断及布局逻辑并完成修正，确保上述场景表现一致且无回归。」

### 一、现状判读（按真实源码，不凭缓存推断）

- **资料丢失**：`flushSnap()` 把只读名单态下 `fillSizes()` 被 IO 闸门挡住而没补上的 `size=-1 / mtime=0` **原样写回** `snapMeta_N`，覆盖掉上次会话的有效值；下一次重启读回的全是未知值，左栏 size / 日期永远显示 `--`，且 `snapDirty` 自我强化，之后每一轮都读不回来。`readSnapMeta()` 遇旧存档缺 meta 块 / 单块写盘失败时直接跳过该块，后续块前移 ⇒ uri 与 meta 错位，尾部条目张冠李戴或全丢。
- **预览图 / 悬停缩略图丢失**：冷启动 `probeRestoreUris()` 一次 `fs.openSync` 失败即误判授权失效 → `RESTORE_READONLY`；`applyItems()` 清空 `viewPixelMap`，预载 / 补尺寸 / 对开探测全被 `bulkIoAllowed` 挡住，`thumbDisabled: this.restoreReadonly()` 又直接掐断悬停缩略图解码。`warmRestoreDirQuiet()` 只对 `isNetworkDirUri()` 网络目录自愈，**本地目录一旦误判就整个会话锁死** —— 名单在、图全白、缩略图不出、size / 日期不补。`decodeTo()` 才是真正的总闸门（只读态直接 `resolve(undefined)`），只改 `showPreviewOf()` 不够。
- **EXIF 标错 / 看不到**：R76 图标显隐用 `pmExifPresentOf()` 的「字节级含段」粗判（HEIC / PNG 头 256KB 内任意 `'Exif'` 四字节即命中会误标），资料框字段却来自 SDK `getImageProperty`；**两者不同源**，于是「标了图标但字段全空看不了」或「有 EXIF 却没图标」。fd 兜底路径拿不到完整 bytes 时恒判无段，必然漏标。
- **固定列宽**：`ArchiveRow` 的 `.width(66)`（大小 / 内容数目）、`.width(88)`（日期）、名称列 `.constraintSize({ minWidth: textWidthVp(name, 12) })`；`SidebarView` 的 `LIST_COLLAPSED_W=224` / `.width(listW)`；`Index` 的 `LIST_W=280` / `LIST_MAX_W=900` 与 `listWidthForNames` 写死的固定开销 226 —— 全是预设 / 固定宽度限制。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/AdaptiveColumn.ts`（新） | adaptive 列宽唯一真值源：`acLayoutOf(rootW, names, sizeTexts)` 按内容长度（`textWidthVp` 估最长文本）+ 容器尺寸（根窗口宽 × 比例）推出左栏展开 / 收起宽与三列宽；`acTextWidestOf` / `acOverheadOf` / `acWidthSafeOf` / `acAdaptiveOf` 为脏值护栏与判据；常量只有比例与既有间距 / 字号，零固定 vp 列宽 |
| `common/SessionState.ts` | 新增 `metaMergeOf()`（新值有效才覆盖、未知则保留上次有效值）、`metasPaddedOf()` / `metaChunkPaddedOf()`（按 uri / 块行数补齐等长，缺块补未知绝不前移）。零 IO / 零 SDK |
| `common/PictureMenu.ts` | 新增 `pmExifEffectiveOf(fields)`（至少一个真正可读字段）与 `pmExifShouldReadOf(segPresent, bytesReadable)`；`pmExifPresentOf` 头窗口 256KB → 64KB，且**降级为「要不要读 SDK」的粗筛，不再是显隐真值** |
| `model/Preview.ets` | `PreviewEntry.hasExif` 改取 `pmExifEffectiveOf(exifFields)`，与 `exifFields` 同源；`readExifFields()` 按 uri 缓存字段（`EXIF_FIELDS_CACHE`）、fd 兜底路径也读一次；天文自解析图与「明确无段的普通相片」零新增跨进程往返 |
| `pages/Index.ets` | `ESC_BUILD_TAG` → `R77`；`flushSnap()` 按 uri 合并新旧 meta、`readSnapMeta()` / `setItems()` 等长补齐；`decodeTo()` 只读态只放行**当前主视图这一张**、批量链路仍全短路；`ThumbLoader` 的 `restoreReadonly` 不再一刀切禁用；新增 `scheduleRestoreHeal()` / `RESTORE_HEAL_DELAY_MS=1200` / `restoreHealTimer`（本地目录延迟自愈 + 成功后 `fillSizes()` + 销毁清 timer）；四个 `@State` 动态宽 + `refreshAdaptiveLayout()` 单点收口 + `onAreaChange` 重算；清理 `textWidthVp` / `listWidthForNames` 死 import |
| `components/SidebarView.ets` | 删除 `LIST_COLLAPSED_W=224`；`listW / collapsedW / colSizeW / colDateW` 四个 `@Prop` 默认 0，由 Index 下传；`.width(this.listCollapsed ? this.collapsedW : this.listW)`；三列动态宽逐行传给 `ArchiveRow` |
| `components/ArchiveRow.ets` | 移除名称列 `constraintSize({ minWidth: ... })` 与 `.width(66)` / `.width(88)`，改 `.width(this.colSizeW)`（两处）/ `.width(this.colDateW)`；R76 两处 `.margin({ left: ROW_GAP_VP })` 与三栏顺序 / 字段 / 对齐 / 交互逐字保留 |
| `tests/dirname.test.mjs` | 构建标记整批升位 `R76 → R77`、订正 14 条旧语义断言（固定宽度 / 只读态清空主视图 / `thumbDisabled` / 旧 EXIF 含段真值 / `fmtBytes` 死代码）；新增 R77 组 **20 条**断言与真机步骤 `R77-A~E`（`10231–10246`） |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R77`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **快照不再自我抹掉有效值**：`flushSnap()` 先读回上一份快照，按 uri 建 `oldByUri`，逐条 `metaMergeOf(旧, 新)` 再写盘；换源 / 重排也不会张冠李戴。`readSnapMeta()` 缺块按整块补未知、`setItems()` 用 `metasPaddedOf(uris.length, meta)` 规整到等长，尾部条目不再丢。
- **只放行「当前一张」，历史 appfreeze 防线不变**：`decodeTo()` 在只读态计算 `curUri`，`uri !== curUri` 一律 `resolve(undefined)`；预载 / statSync / 对开探测 / 缓存命中后的升级补解仍由 `bulkIoAllowed(this.restoreMode)` 严控。单张 `decodePx` 是真异步 `fs.open` + catch，最多一次跨进程往返。
- **本地目录也自愈**：R44/R45 的 `warmRestoreDirQuiet()` 只覆盖网络目录；本轮在探测误判后错开启动期 1200ms 重探一次文件 uri（`healRestoreMode()` 内部仅 1 次 sync open），通了即切 FULL、补解码 / 预载 / 尺寸；定时器在页面销毁时清掉。
- **EXIF 三者同源**：`显示图标 ⇔ pmExifEffectiveOf(exifFields) 为真 ⇔ 资料框一定有内容`。字节级粗筛只决定「要不要发 SDK 读字段」；`pmExifShouldReadOf(false, false)` 让 fd 兜底路径也读一次（R76 恒 false 会漏标），`pmExifShouldReadOf(false, true)` 让明确无段的普通相片零新增往返。字段按 uri 缓存，预载 / 主视图 / 悬停缩略图多次 `decodePx` 同一张只读一轮。
- **adaptive 是「推导」不是「夹逼」**：`acLayoutOf()` 结果只由 `rootW` 与两列显示文本决定；`rootW=0`（首帧 `onAreaChange` 未到）纯按内容长度撑开，窗口尺寸到手后按 `AC_SIDEBAR_RATIO=0.62` / `AC_COLLAPSED_RATIO=0.30` 重算，resize 再重算。名称列仍 `layoutWeight(1)` + Ellipsis 吸收剩余，大小 / 日期列按本列最长内容保持可读。`acWidthSafeOf()` 保证 NaN / 非正数不进 `.width()`。
- **`common/` 首次出现相对 import，显式带 `.ts` 后缀**：`AdaptiveColumn.ts` 需要 `DirName.textWidthVp` 与 `RowGap.ROW_GAP_VP`；Node ESM 测试加载器不解析无后缀相对路径，故写成 `'./DirName.ts'` / `'./RowGap.ts'`。已核验 ArkTS 真编译 0 ERROR，且 `modules.abc` 里导入记录名归一化为 `@bundle:.../common/DirName`（无后缀），设备运行时解析与其余模块一致。
- **R76 的 5mm 是「间距」不是「列宽」**：两处 `ROW_GAP_VP` 与日期列 6vp、行右 padding 6vp 属既有间距 / 内边距，本轮逐字保留；移除的只有预设 / 固定列宽数字。

### 四、验证用例（用户要求的三项 + 回归）

| 确认项 | 结论 | 证据 |
| --- | --- | --- |
| **① 重启资料 / 预览图 / 缩略图** | ✅ 正常退出重开与杀进程冷启动，左栏每条 size / 日期为真实值，当前相片立刻出图，hover 缩略图正常 | `metaMergeOf` / `metasPaddedOf` / `metaChunkPaddedOf` 三组纯函数边界；`decodeTo` 单张放行 + 批量闸门；`restoreReadonly: () => false`；`scheduleRestoreHeal` / `RESTORE_HEAL_DELAY_MS` / `fillSizes()` / `clearTimeout` 源码契约；`R77-A~B` 真机步骤 |
| **② EXIF 判定与展示** | ✅ 仅含有效 EXIF 数据显示图标，且必能查到对应资料；无误标 / 漏标 / 「标了看不到」 | `pmExifEffectiveOf([]) / undefined / 全 '--' 恒 false`、有有效字段恒 true；`pmExifShouldReadOf` 三组（含 fd 兜底）；`hasExif: pmExifEffectiveOf(exifFields)` 与 `exifFields` 同源；`EXIF_FIELDS_CACHE`；`R77-C` 真机步骤 |
| **③ adaptive column width** | ✅ 列宽按内容长度 + 容器尺寸动态伸缩，所有预设 / 固定宽度已移除 | `acLayoutOf` / `acTextWidestOf` / `acWidthSafeOf` / `acAdaptiveOf` 数值回归；四个 `@State` 动态宽 + `refreshAdaptiveLayout` + resize 重算；`SidebarView` 无 `LIST_COLLAPSED_W`、`ArchiveRow` 无 `.width(66)/(88)` / `constraintSize({ minWidth`；`R77-D` 真机步骤 |
| 回归检查 | ✅ R70–R76 全部零回归 | 版本 `1.0.7 / 7`、构建标记 `R77`、HDR 徽标 / 3 处 `dynamicRangeMode` / R71 HDR 保真、picture menu 三项顺序与动作、左栏五项右键菜单 / 两级 Want、放大镜相片上左键、两处 5mm 间距、滚轮 / 双击全屏 / ESC |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2323 passed, 0 failed`**（R76 基线 2303，新增 20 条 R77 断言） |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 24 s 444 ms`**；`Finished :entry:default@CompileArkTS... after 13 s 677 ms`（**非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（与 R69–R76 一致）；日志 `/tmp/r77-build-final.log` |
| 产物 | 签名 HAP **1,792,929 B** / 未签名 **1,757,668 B** / `ets/modules.abc` **1,035,196 B**（R76 分别为 1,755,610 / 1,724,181 / 1,015,176 B），mtime 均为本轮编译时刻 |
| 字节码 | `modules.abc`：**`R77=1 / R76=0 / R75=0 / R74=0 / R73=0 / R72=0 / R71=0 / 1.0.7=1`**；新链路 `AdaptiveColumn=3`、`acLayoutOf=2`、`acWidthSafeOf=2`、`acTextWidestOf=2`、`metaMergeOf=2`、`metasPaddedOf=2`、`metaChunkPaddedOf=2`、`pmExifEffectiveOf=2`、`pmExifShouldReadOf=2`、`EXIF_FIELDS_CACHE=2`、`restoreHealTimer=1`、`scheduleRestoreHeal=2`、`RESTORE_HEAL_DELAY_MS=1`、`refreshAdaptiveLayout=2`、`colSizeW=8`、`colDateW=8`、`collapsedW=6`；零回归 `ROW_GAP_VP=2`、`pmExifBadgeVisibleOf=2`、`viewHasExif=4`、`viewExifFields=4`、`hbVisibleOf=2`、`loupeEnabledAfterLeftClick=2`、`pmItemsOf=2`、`getImageProperty=1`、`hpProbeOf=2`、`startAbility=1`、`com.huawei.hmos.filemanager=1`、`ohos.want.action.viewData=1`、`general.directory=1`、`fileUri=1` |
| 文档一致性 | `/tmp/check_r77_steps.mjs`：测试 R77 步骤块与 README 逐字差异 **0** |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R77-A~E`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:10231` R77 组）

>   ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
>   ⚠️ 真机步骤 R77-A：装新包后 Ctrl+D 角标必须是 R77 / 版本 1.0.7·7；
>      选一个含 JPG+HEIC 的本地目录，正常退出再重开（及杀进程冷启动）两次：
>      左栏每一条 size 与日期都应是真实值而非 --，当前相片立刻出图，
>      hover 任一档案项仍弹缩略图，不再一片中灰 / 空白。
>   ⚠️ 真机步骤 R77-B：重启后逐条核对 size / 日期与上次一致；中途新增档案也能补出真实值；
>      切换目录 / 往上层 / 重排后按 uri 对得上号，不出现尾部条目张冠李戴。
>   ⚠️ 真机步骤 R77-C：含有效 EXIF 的 JPG / HEIC 右上角出现 EXIF 图标，点 picture menu
>      第一项一定能看到对应字段；无 EXIF 的相片 / 头部含 "Exif" 字样的非 EXIF 文件 /
>      fd 兜底路径的相片都不误标、不漏标；FITS·XISF / 文本预览 / 空态仍不显示。
>   ⚠️ 真机步骤 R77-D：拉伸窗口宽度，左栏展开宽 / 收起宽 / 大小列 / 日期列随内容长度与
>      容器尺寸动态伸缩；超长档案名只用 Ellipsis 截断，三栏仍整齐对齐、顺序字段不变；
>      档案名↔大小、文件夹名↔内容数目两处 5mm 间距仍严格一致。
>   ⚠️ 真机步骤 R77-E：R76 放大镜（相片上左键反复切换）、picture contact menu 三项顺序与动作、
>      左栏五项右键菜单 / 打开目录 / 详情 / 复制、滚轮换图 / 双击全屏 / ESC、
>      HEIC HDR 徽标与 R71 HDR 保真、并排右页、诊断角标全部零回归。

### 七、边界

- **编译校验 ≠ 真机验证**：静态契约 2323 全绿、真编译成功、字节码有 `R77` 标记，只能证明代码 / 产物接线；证明不了真机上 DocumentsProvider 授权就绪时机是否真在 1200ms 内、SDK `getImageProperty` 在各类 HEIC / JPG 上是否读到有效字段、adaptive 列宽在实机 DPI 下的观感，以及本地目录自愈后是否 100% 切回 FULL。请按 `R77-A~E` 回传结果。
- **R76 的 EXIF 判据已被本轮取代**：R76 章节「EXIF 图标是含段判据 / fd 兜底保守判无 EXIF」是当时的形态；R77 起显隐一律以 SDK 实际读到的有效字段为准，粗筛只决定是否发起读取。历史断言与历史章节按「逐字保留」原则不改写，以本章为准。
- **`common/` 相对 import 带 `.ts` 后缀是刻意的**：为让 `node tests/dirname.test.mjs` 能直接加载新真值源；ArkTS 编译与 `modules.abc` 导入记录名已核验归一化，若后续把真值源迁出 `common/`，需同步确认 Node 与 ArkTS 两侧解析。
- **只读名单态防线未被放宽**：只额外放行「当前主视图这一张」的单次异步解码与悬停缩略图的异步单并发解码；批量预载 / statSync / 对开探测仍由 `bulkIoAllowed` 严控，R44–R46 / R66 的 appfreeze 防线逐字不变。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、**本轮未 push**（用户未授权；R71–R76 六个本地提交仍未 push）；GitHub PAT revoke / 轮换提醒仍有效。

---

## 第七十六轮：间距 5mm / 放大镜改相片上左键 / 仅含 EXIF 相片右上角图标 / 相片右键三项菜单（2026-11-26，R76）

> 用户要求（原文）：「请在现有界面中完成以下调整，并保持未提及的布局与交互不变：
> 1. 将档案名栏与档案大小栏之间的间距设为5mm，将文件夹名栏与内容数目栏之间的间距也设为5mm，两处间距保持一致。
> 2. 取消放大镜原有的 right click 触发，改为仅由 left click 切换：首次 left click 开启放大镜，在开启状态下再次 left click 还原为原始显示状态，并可在两种状态间重复切换。
> 3. 仅对含有exif资料的相片，在其右上角显示exif图标；不含exif资料的相片不显示该图标。在相片上方 right click 时触发 picture contact menu。
> 4. picture contact menu 的菜单前三项按顺序固定为：第一项「显示exif资料框」，第二项「单张预览」，第三项「左右并排预览」；选择各项时分别显示exif资料框、进入单张预览、进入左右并排预览。
> 完成后确认间距、触发方式、图标显示条件、菜单触发位置及选项顺序均符合要求。」

> 方向澄清（`AskUserQuestion` 四项，用户全部选推荐项）：
> · **预览区相片上** —— 新 picture contact menu 在预览区相片上右键触发，EXIF 图标叠加在预览区右上角；左栏 R72–R75 五项右键菜单完全不动。
> · **仅预览区相片上** —— 放大镜 left click 仅预览区相片上触发；点左栏档案 / 按钮 / 空白区不触发，避免选图误开。
> · **5vp** —— 沿用 README「关于 1mm」与 R69 口径 `1mm ↔ 1vp`（ArkUI 只有 vp，没有 mm），故 `5mm = 5vp`。
> · **就三项 + 模式覆盖** —— 菜单恰好三项、顺序固定；「单张预览」强制单页，「左右并排预览」有下一张即强制并排；不选时保持 R56 既有自动竖图对开行为。

### 一、现状判读（按真实源码，不凭缓存推断）

- **间距**：`ArchiveRow.build()` 在 `!collapsed` 分支里画两个 66vp 列 —— 文件夹行 `countText`（内容数目）、非目录行 `fmtBytes(this.bytes)`（档案大小），名称列 `layoutWeight(1)` 弹性吸收，日期列 `.margin({ left: 6 })` 靠右固定 88vp。两处原本都没有间距常量，靠名称列的剩余弹性自然顶开，无法保证两处相等。
- **放大镜**：R15 起由 `onMouseButton()` 的右键 Release + `onRootMouse()` 的 Press 兜底，经 `loupeEnabledAfterRightPress()` 翻转 `loupeEnabled`。两处都在 `Index.ets`，空态提示也写着「右键放大镜」。
- **EXIF**：`PreviewEntry` 只有 HDR / 色彩 / `exifDegrees`，没有「是否含 EXIF 段」的真值；`decodePx()` 已通过 `rawStore.ensure()` 拿到完整原始字节（R71 容器预检同款），可零新增 IO 做字节级 EXIF 段判定。SDK `image.PropertyKey` 有 `DATE_TIME_ORIGINAL / EXPOSURE_TIME / F_NUMBER / ISO_SPEED_RATINGS / FOCAL_LENGTH / MAKE / MODEL / WHITE_BALANCE`。
- **并排**：`refreshSpread()` 只走 `spreadRightWantedOf(左图比例)`（R56），没有用户可切换的模式态。
- **两套菜单**：左栏 `FileContextMenu.ts`（五项）由 `SidebarView.ets` 的 ListItem `.onMouse` 右键 Press 上抛 `displayX/displayY`，`Index.ets` 用 `zIndex(21)` 画应用内浮层（R73）。新菜单必须完全独立，不能复用其状态或动作码。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/RowGap.ts`（新） | 间距唯一真值源：`ROW_GAP_MM=5` / `MM_TO_VP=1` / `ROW_GAP_VP=5`，外加 `rowGapVpOf` 脏值兜底、`rowGapSameOf` 一致性判据、`rowGapValidOf` 上限护栏。零 SDK / 零 IO / 零异步 |
| `components/ArchiveRow.ets` | import `ROW_GAP_VP`；两个 66vp 列各加一处 `.margin({ left: ROW_GAP_VP })`（文件夹名↔内容数目 / 档案名↔档案大小），共用同一常量天然相等；名称列 `layoutWeight(1)` 少吸收 5vp，66 / 88 列与日期列右边缘逐字不变；三栏顺序 / 字段 / 数据展示 / 点击 / 双击 / hover / 条纹零改动 |
| `common/InteractionPlan.ts` | 新增纯函数 `loupeEnabledAfterLeftClick(wasEnabled, leftClick)`；R15 的 `loupeEnabledAfterRightPress` 原样保留供第十五轮历史回归断言，但 `Index.ets` 不再 import / 调用 |
| `pages/Index.ets` | `ESC_BUILD_TAG` → `R76`；`onMouseButton()` 右键 Press 改弹相片菜单、右键 Release 只清按键态、左键 Release 经 `pmPhotoReadyOf` 门控后调 `applyLoupeToggle(true)`；`applyLoupeToggle()` 改走左键纯函数；`onRootMouse()` 整个 Press toggle 兜底删除；空态提示改「左键放大镜 · 右键相片菜单」；新增 8 个 `@State`（相片菜单 / EXIF 徽标 / 资料框 / `previewMode`）；`showPreviewOf()` 换图清零、`setViewMeta()` 落地 EXIF；右上角 EXIF 徽标、`zIndex(21)` 相片菜单浮层、`zIndex(22)` EXIF 资料框；`openPictureMenu()` / `onPictureMenuAction()` 两个新方法；`refreshSpread()` 接 `pmSpreadWantedOf()` 模式覆盖 |
| `common/PictureMenu.ts`（新） | 相片菜单唯一真值源：三项动作码 / 文案 / 顺序判据 / 越权拒绝、EXIF 图标显隐 / 段字节判据 / 值归一 / 字段标签 / 资料框兜底、三项预览模式与 `pmSpreadWantedOf()`、菜单浮层几何与状态文案、`pmRightHitOf` / `pmPhotoReadyOf` 命中判定。零 SDK / 零 IO / 零异步 / 零 throw |
| `model/Preview.ets` | `PreviewEntry` 新增 `hasExif: boolean` + `exifFields: Array<PmExifField>`；`decodePx()` 在已有原始字节上做 `pmExifPresentOf()` 字节级判据，只在确有 EXIF 段时经 `readExifFields()` 异步读 8 个 `image.PropertyKey`；天文图 `decodeAstroPx()` 恒 `hasExif:false` / 空字段；R71 容器预检 `hpProbeOf(uri, new Uint8Array(raw))` 逐字不动 |
| `tests/dirname.test.mjs` | 构建标记 41 处整批升位 `R75 → R76`；订正 R15 ② 源码断言、9 处旧右键 toggle 回归护栏、3 处 R73 门控断言、空态文案断言；新增 R76 组 26 条断言与真机步骤 `R76-A~F`（`10030–10044`） |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R76`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **两处间距恒等**：两个分支共用 `ROW_GAP_VP` 一个常量，测试用 `rowGapSameOf()` 与源码计数（恰好 2 处 `.margin({ left: ROW_GAP_VP })`）双重锁定；不新增 padding / offset / Blank / Spacer，不改任何列宽与日期列 6vp。
- **右键彻底不触发放大镜**：`onMouseButton()` 的右键 Release 分支只 `return`；根容器 `onRootMouse()` 不再有任何 `applyLoupeToggle`；左键只在 `pmPhotoReadyOf(有上屏图 && !textMode)` 为真时翻转，且仍在 `!moved`（拖拽不算点击）之后。纯函数 `loupeEnabledAfterLeftClick` 是「条件翻转」，`false→true→false→true` 可无限重复。
- **EXIF 图标只认字节级真值**：`pmExifPresentOf()` 对 JPEG APP1 `'Exif\0\0'`、HEIC/HEIF `'Exif'` item type、PNG `'eXIf'` chunk 做头窗口扫描；`pmExifBadgeVisibleOf(hasExif, hasImage, textMode)` 三个参数全部 `=== true/false` 显式判等，无 EXIF / 空态 / 文本预览 / 天文图一律不画。fd 兜底路径没有字节可验时保守判「无 EXIF」，绝不误标。
- **两套菜单零耦合**：左栏 `FileContextMenu` 五项、`startAbility` 两级 Want、REVEAL / 复制 / 详情逐字不动；新菜单用独立 `pmMenuOn / pmMenuX/Y / pmMenuItems / pmMenuHover`，动作码前缀 `pm*` 与左栏 `fc*` 完全隔离，`pmHasActOf()` 拒绝越权动作。触发走预览区 `.onMouse` 右键 Press + `stopPropagation`，与 R73 同一条已真机验证过的通道，零系统手势依赖。
- **模式覆盖而非重写并排**：`pmSpreadWantedOf(PM_MODE_AUTO, hasNext, autoWanted)` 原样回传 `spreadRightWantedOf()` 的结果；`PM_MODE_SINGLE` 恒 false；`PM_MODE_SPREAD` 只要有下一张即 true（尺寸未知也能并排）。`refreshSpread()` 里 `spreadRightWantedOf(sz.w, sz.h, hasNext, SPREAD_PORTRAIT)` 调用形态逐字保留。
- **EXIF 资料框不开天窗**：8 个 SDK 属性逐字段 try/catch，无效值（`Unknown…` / `none` / `null` / `0/0` / `--`）过滤，有效值去空白并按 48 字截断；一个字段都没有时显示 `PM_EXIF_EMPTY` 兜底文案。只有字节级确认含 EXIF 段才发跨进程 `getImageProperty`，普通相片零新增 SDK 往返。

### 四、验证用例（用户要求的五项确认）

| 确认项 | 结论 | 证据 |
| --- | --- | --- |
| **间距** | ✅ 档案名↔档案大小、文件夹名↔内容数目均为 `5mm = 5vp`，两处一致 | `ROW_GAP_VP=5`；`rowGapSameOf(5,5)=true`；ArchiveRow 去注释后两处 `.margin({ left: ROW_GAP_VP })`；三栏列宽 / 日期列 6vp / 交互零回归 |
| **触发方式** | ✅ 取消右键，仅相片上左键切换，可反复开/还原 | `loupeEnabledAfterLeftClick` 序列 `false→true→false→true`；右键 Release 分支与根容器零 `applyLoupeToggle`；左键经 `pmPhotoReadyOf` 门控且在 `!moved` 之后；空态提示已改 |
| **图标显示条件** | ✅ 仅含 EXIF 资料的相片右上角显示，其余不显示 | JPEG APP1 / PNG eXIf / HEIC Exif 命中，裸 JPEG / 空 / 短数据不命中；`pmExifBadgeVisibleOf` 四组边界；天文图 / 文本 / 空态恒 false；徽标 `HorizontalAlign.End` + 12vp + `HitTestMode.Transparent` |
| **菜单触发位置** | ✅ 相片上方右键触发，左栏五项菜单互不影响 | `pmRightHitOf` 命中判定；`openPictureMenu` 由预览区右键 Press 上抛 `displayX/displayY`；`pmMenuPosOf` 右下越界内翻；`zIndex(21)` 独立浮层；`fcItemCountOf=5` 与两级 Want 零回归 |
| **选项顺序** | ✅ 恰好三项且顺序固定，三项动作各自落地 | `pmItemsOf()` 恒 3 项、`pmFirstThreeOrderedOf` 为真、标签逐字为「显示exif资料框 / 单张预览 / 左右并排预览」；EXIF 资料框 / 单张 / 并排各自有状态栏反馈；`pmModeAfterAct` + `pmSpreadWantedOf` 覆盖自动 / 单页 / 并排 |
| 回归检查 | ✅ R70–R75 全部零回归 | 左栏五项菜单、两级 `startAbility`、HDR 徽标、3 处 `dynamicRangeMode`、R71 HDR 保真、并排右页、ESC、版本 `1.0.7 / 7` |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2303 passed, 0 failed`**（R75 基线 2277，新增 26 条） |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 1 min 6 s 727 ms`**；`Finished :entry:default@CompileArkTS... after 35 s 982 ms`（**非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（与 R69–R75 一致）；日志 `/tmp/r76-build-final.log` |
| 产物 | 签名 HAP **1,755,610 B** / 未签名 **1,724,181 B** / `ets/modules.abc` **1,015,176 B**（R75 分别为 1,697,101 / 1,657,681 / 971,284 B） |
| 字节码 | `modules.abc`：**`R76=1 / R75=0 / R74=0 / R73=0 / R72=0 / R71=0 / 1.0.7=1`**；`ROW_GAP_VP=2`、`PictureMenu=7`、`loupeEnabledAfterLeftClick=2`、`pmExifBadgeVisibleOf=2`、`pmItemsOf=2`、`pmRightHitOf=2`、`pmSpreadWantedOf=2`、`hasExif=1`、`exifFields=1`、`getImageProperty=1`；三项中文文案各 1；`openPictureMenu=2` / `onPictureMenuAction=2` / `exifPanelOn=4` / `viewHasExif=4` / `previewMode=4`；`startAbility=1`、`com.huawei.hmos.filemanager=1`、`ohos.want.action.viewData=1`、`general.directory=1`、`fileUri=1` 证明 R74 两级 Want 原样保留；`hbVisibleOf=2` 证明 R70 HDR 徽标零回归 |
| 文档一致性 | `/tmp/check_r76_steps.mjs`：测试 R76 步骤块 **15 行** / README **15 行**，逐字差异 **0** |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R76-A~F`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:10030` R76 组）

>   ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
>   ⚠️ 真机步骤 R76-A：装新包后 Ctrl+D 角标必须是 R76（R75-A 里的 R75 是历史锚点，以本条为准）；
>      左栏档案名↔档案大小、文件夹名↔内容数目两处间距目测一致，均为 5mm 口径；
>      三栏顺序 / 字段 / 对齐 / 条纹 / 点击 / 双击 / hover 缩略图全部零回归。
>   ⚠️ 真机步骤 R76-B：预览区相片上【左键单击】首次开放大镜、再点还原、可反复切换；
>      右键、左栏档案 / 按钮 / 空白区一律不再翻转放大镜；拖拽 / 滚轮 / 双击全屏照常。
>   ⚠️ 真机步骤 R76-C：含 EXIF 的 JPG / HEIC 右上角出现「EXIF」图标，无 EXIF 相片 /
>      FITS·XISF / 文本预览 / 空态一律不出现；图标不遮挡主体、滚轮与点击全部穿透。
>   ⚠️ 真机步骤 R76-D：相片上方【右键】弹出 picture contact menu，恰好三项且顺序为
>      显示exif资料框 / 单张预览 / 左右并排预览；左栏五项右键菜单在同一张图上互不干扰；
>      菜单右下越界内翻、点遮罩 / 点项即收，定位与 R73 浮层一致。
>   ⚠️ 真机步骤 R76-E：点第一项显示 EXIF 资料框（字段可读 / 无字段有兜底文案 / 可关闭）；
>      点第二项强制单页、点第三项有下一张即左右并排；不选时保留既有竖图自动对开。
>   ⚠️ 真机步骤 R76-F：HEIC HDR 徽标 / R71 HDR 保真 / 并排右页 / ESC / 版本 1.0.7·7 /
>      左栏 REVEAL 两级 Want / 复制 / 详情面板 / 诊断角标全部零回归。

### 七、边界

- **编译校验 ≠ 真机验证**：静态契约 2303 全绿、真编译成功、字节码有 `R76` 标记，只能证明代码 / 产物接线；证明不了真机上右键是否按预期弹浮层、EXIF 图标视觉位置是否恰好右上角、SDK `getImageProperty` 在各类 HEIC/JPG 上是否真能读到字段、5vp 在实机 DPI 下的观感是否等于 5mm。
- **`5mm = 5vp` 是项目口径而非物理毫米**：ArkUI 只有 vp 没有 mm，README「关于 1mm」与 R69 已锁定 `1mm ↔ 1vp`；不同屏幕密度下物理尺寸会变，但两处间距仍严格一致。
- **EXIF 图标是「含 EXIF 段」判据**：`pmExifPresentOf` 是文件头字节级扫描，不是「SDK 是否读到某个字段」。含段但字段全读不到时，图标仍显示，资料框给出兜底文案；无段则图标恒不显示。HEIC 的 ASCII 特征扫描以头 256KB 为窗口，属保守近似，真机如遇特殊容器需回传样本。
- **右击与两套菜单互斥**：左栏菜单浮层打开时会盖住预览区，需先点遮罩收起再在相片上右键；这是 R73 应用内浮层的既有机制，本轮未改。EXIF 资料框 `zIndex(22)` 高于两套菜单。
- **第十五轮历史纯函数保留**：`loupeEnabledAfterRightPress` 仍导出、仍被第十五轮 ① 历史断言覆盖，但 `Index.ets` 与字节码中的调用链已完全改到 `loupeEnabledAfterLeftClick`；历史步骤里「右键放大镜」按「逐字取自测试」原则不改写，R76 起以 `R76-B` 为准。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、**本轮未 push**（用户未授权；R71–R75 五个本地提交仍未 push）。

---

## 第七十五轮：移除档案列表向上箭头符号列 + 「打开档案所在目录」改以 `browseBase` 为真值（2026-11-26，R75）

> 用户要求（原文）：「请同时处理以下两项，并保持改动范围最小化。1. 修改档案列表：仅移除带向上箭头图标的那个 column，确保改动仅对该列生效；其余列的顺序、字段、数据展示和现有交互完全不变，不波及其他列及列表整体行为。同步清理仅与该列相关的配置、引用及残留逻辑。2. 修复右键 context menu 中『档案所在目录』的打开结果：当前会输出错误目录且未显示应有的档案列表；修复后应指向当前选中档案所在目录，并正确展示该目录下的档案列表，不影响其他菜单项与既有交互。」
> 方向澄清（选项反馈）：**「保留 OS 文件管理器，只修目录」** —— 不回退 R74、不重新引入 APP 内 `openFolder / onRowTap`。

### 一、现状判读（按真实源码，不凭缓存推断）

- **任务 1**：`ArchiveRow.build()` 里名称右侧的 `Text(folderGlyphOf(this.kind, ROW_UP))` 就是带 `↑` 的那一列：只有 `ROW_UP` 行经 `common/FolderGlyph.ts` 的纯函数拿到 `↑`，其余行为空串 / 列宽归零。该列还**独占** `.height(26)` 行高锚点与 `.textAlign(TextAlign.Center)`；`private iconColor()` 也只被它的 `.fontColor()` 使用。整列删除会塌行高，故必须把 `.height(26)` **原值**迁到 `Text(this.name)`。
- **任务 2 根因**：R74 的 `fcRevealDirUriOf` 对文件行优先 `fcParentUriOf(r.uri)`（剥文件名）。但 `Index.openFolder()` 用 `const child = raw.indexOf('/') >= 0 ? raw : joinBase + '/' + raw;` 拼出的是**列举用** URI，而 `browseBase` 才是「本次真实列举成功 / 缓存命中 / 上层清单态回填」的当前目录（`this.browseBase = base;` / `= hit.path;` / `= target;`，`setItems()` 清空）。NAS 挂载前缀、picker 逐 URI 授权链、APP 内清单态下二者**并不等价** —— 剥出来的父段是列举用路径，系统文件管理器打开后自然不是用户当前看到的那份档案列表。
- **不改的部分**：`Index.ets` 的 REVEAL 分支接线、`openDirInSystemFileManager()` 两级 Want、菜单五项文案、其余四项动作、右键触发链、详情面板、放大镜门控逐字保留。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `components/ArchiveRow.ets` | **仅删**带 `↑` 的符号列 `Text`；把 `.height(26)` 原值迁到 `Text(this.name)`；删该列专属 import 与专用配色方法；补注释说明。名称 / 字节 66 / 日期 88+6 三列的顺序、字段、数据展示与点击 / 双击 / hover / onMouse / bindPopup / 条纹逐字不变 |
| `common/FolderGlyph.ts` | **整文件删除**：R61 引入的该列专属 4 常量 + 3 纯函数 + 配置，已无任何引用 |
| `common/FileContextMenu.ts` | `fcRevealDirUriOf` 文件行改为**优先 `fcNormDirOf(browseBase)`**，为空才退回 `fcParentUriOf(itemUri)`；目录行仍返回自身；未命中行仍 `''`。函数注释与文件头追加 R75 根因。零 SDK / 零 IO / 零异步约束不变 |
| `pages/Index.ets` | `ESC_BUILD_TAG` → `R75`；REVEAL 分支与文件头**注释**同步，**无任何功能代码行改动** |
| `tests/dirname.test.mjs` | 构建标记 39 处整批升位 `R74 → R75`；改写绑定旧符号列的 R59 / R61 / R69 历史断言与 3 条 R74 目标算法断言；新增 R75 组 18 条断言与真机步骤 `R75-A~D`（`9775–9789`） |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R75`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **只删一列，行高不塌**：`.height(26)` 从被删列原值迁入名称列，build() 内恰好 1 处；名称列仍 `layoutWeight(1)` 弹性吸收原来的 18vp，字节 66 / 日期 88 靠右固定宽度不变，不新增任何 padding / margin / offset / Blank / Spacer。
- **清理范围严格限定**：只删该列专属配置模块、import 与专用配色方法；`labelColor()` / `upReturnFgOf()` / `DirCount` / hover / 条纹等其它真值源与逻辑一个不动。
- **`browseBase` 是唯一权威目录真值**：`r.uri` 只作为「`browseBase` 为空」时的兜底输入，目标恒为目录、绝不返回文件本身，也绝不返回拼接出来的列举用父段。
- **不做 APP 内左栏展示**：用户明确选择「保留 OS 文件管理器，只修目录」，故 R74 的 `startAbility` 两级 Want 通道**原样保留**，只换目标目录 URI。

### 四、验证用例

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2277 passed, 0 failed`**（R74 基线 2262）；`git diff --check` 通过 |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**（R71 HDR 真值源零回归） |
| 正常用例 · 任务 1 | 符号列 / `↑` / `▣` / 专属配置 / import / 残留配色方法全清；名称是行首第一个子组件，其后直接是 `if (!this.collapsed)` 两栏；`.height(26)` 落在名称列且 build() 内恰好 1 处 |
| 正常用例 · 任务 2 | 文件行（图片 / 文本 / 其它）目标 = `browseBase`，覆盖 `file://docs` / NAS 授权段 / 纯路径三类；目录行目标 = 自身；目标恒不以文件名结尾、恒不等于 `r.uri` 的父段 |
| 边界用例 | `browseBase` 为空 → 剥文件名兜底；两者皆空 / 目录 URI 为空 → 明确结果；`..` 伪行 / 空白 / 未知 kind → `''` 短路 |
| 回归检查 | 三列顺序 / 字段 / 宽度 / 对齐 / 行高 / 交互、菜单五项文案、其余四项动作、两级 Want、右键触发链、放大镜门控、版本 `1.0.7 / 7`、R71 HDR 保真全部零回归 |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 17 s 194 ms`**；`Finished :entry:default@CompileArkTS... after 10 s 658 ms`（**非 UP-TO-DATE**，`UP-TO-DATE :entry:default@CompileArkTS` 计数 0）；**0 ERROR / 17 WARN**（与 R69–R74 一致）；日志 `/tmp/r75-build.log` |
| 产物核验 | 签名 HAP **1,697,101 B**（R74 1,694,430 B）/ 未签名 **1,657,681 B** / `ets/modules.abc` **971,284 B**；产物 mtime **12:11:13–14** 晚于三份源码 **12:05:24 / 12:05:49 / 12:06:10**，即 HAP 由最终源码编译 |
| 字节码 | `modules.abc`：**`R75=1 / R74=0 / R73=0 / R72=0 / R71=0 / 1.0.7=1`**；**`folderGlyphOf=0` / `FolderGlyph=0`** 证明符号列及其专属配置已从产物彻底消失；`fcRevealDirUriOf=2` / `browseBase=1`；`startAbility=1`、`com.huawei.hmos.filemanager=1`、`ohos.want.action.viewData=1`、`general.directory=1`、`fileUri=1` 证明 R74 两级 Want 通道原样保留 |
| 文档一致性 | `/tmp/check_r75_steps.mjs`：测试 R75 步骤块 **15 行** / README **15 行**，逐字差异 **0** |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R75-A~D`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:9775` R75 组）

> ⚠️ 本组是源码静态契约 + 纯函数回归，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R75-A：装新包后 Ctrl+D 角标必须是 R75（R74-A 里的 R74 是历史锚点，以本条为准）；
>     左栏任一档案行名称右侧不再出现向上箭头 / 方格，也不留 18vp 空白；
>     名称 / 字节 / 日期三栏顺序、字段、对齐、行高 26vp、条纹、间距与 R74 完全一致。
> ⚠️ 真机步骤 R75-B：右键任一【文件】→「打开档案所在目录」→ OS 自带文件管理器
>     打开的是当前左栏正在展示的那个目录（hilog 里 dir= 与 browseBase 一致），
>     该目录下的档案列表完整可见，不再是拼接出来的错误目录；状态栏反馈照常。
> ⚠️ 真机步骤 R75-C：右键任一【子文件夹】→ OS 文件管理器打开该文件夹自身；
>     NAS / 缓存秒开 / APP 内上层清单态各测一次文件行，目录都不能错。
> ⚠️ 真机步骤 R75-D：菜单五项文案、打开 / 详情 / 复制路径 / 复制档案名称四项动作、
>     放大镜 toggle、详情面板、菜单定位与收起、「..」行与空白区零菜单、
>     点击 / 双击 / hover 缩略图 / 排序 / 目录切换 / 收起展开左栏全部零回归；
>     HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /
>     ESC / 版本 1.0.7/7 全部零回归。R59-C、R61-B 步骤里「向上箭头仍保留」是历史形态，
>     R75 起以本组 R75-A 为准。

### 七、边界

- **「正确展示该目录下的档案列表」由 OS 文件管理器负责**：本轮只让 `dir=` 指向当前左栏展示清单的权威目录，不回退到 APP 内 `openFolder`。若本机文件管理器不接受该 URI 形态，R74-C 的 `hilog` 回传步骤继续有效（`fcReveal primary / fallback / both failed`）。
- **编译校验 ≠ 真机验证**：静态契约 2277 全绿、真编译成功、字节码有 `R75` 标记，只能证明代码 / 产物接线，证明不了真机上系统文件管理器是否接受该目录 URI，也证明不了左栏视觉上确实没有残留空白。
- **历史锚点订正**：R59-C / R61-B 真机步骤里「↑ 箭头仍保留」是当时形态，按「逐字取自测试」原则不改写历史块；R75 起以本组 `R75-A` 为准。
- **改动范围**：`ArchiveRow.ets` 只动那一列及其行高载体；`FolderGlyph.ts` 整文件删除；`FileContextMenu.ts` 只改一个纯函数与注释；`Index.ets` 只改构建标记与注释；`SidebarView.ets` / `model/` / `module.json5` / `AppScope/app.json5` 全部零改动。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、**本轮未 push**（用户未授权；R71 `903e544`、R72 `e0223d5`、R73 `71a4b66`、R74 `2dfdb94` 仍在本地）。
- 零新增定时器 / 全局可变状态 / worker；R71 HDR 保真、R70 徽标、R69 行高、R68 resize 画质、R67 放大镜、R64 内容量四态、三栏三按钮、文本预览 scrollbar、ESC 全部零回归。

---

## 第七十四轮：「打开档案所在目录」改走 OS 自带文件管理器 —— 目标恒为目录 / 文件与目录两类分别生效（2026-11-25，R74）

> 用户要求（原文）：「请修复右键点击条目并选择『打开目录』时的行为：应使用 OS 自带的文件管理器
> 打开对应目录，而不是把文件本身作为打开目标。若选中的是文件，打开其所在目录；若选中的是目录，
> 打开该目录本身。仅修正此选项的打开目标，保持菜单文案、其他右键功能和现有交互不变」。

### 一、现状判读（按真实源码 + SDK / 官方契约，不凭缓存推断）

- **两层都不对，且互相叠加**：`Index.ets` 的 `FC_ACT_REVEAL` 分支走的是纯应用内行为 ——
  `fcRevealWantedOf(...)` 为真时 `openFolder(target, false, false, true)`（在 APP 内重列举目录），
  为假（即档案已在当前目录）时 `onRowTap(rowIdx)`（**把文件本身打开预览**）。这两条都不是
  「OS 自带的文件管理器」，其中 `onRowTap` 正是用户点名的「把文件本身作为打开目标」。
- **目录行的目标也算错**：`fcRevealTargetOf(parent, browseBase)` 对**文件夹行同样返回父目录**，
  而用户明确要求「目录 → 打开该目录本身」。R72/R73 的 `fcRevealTargetOf` / `fcRevealWantedOf`
  只服务于应用内列举，无法表达「目录自身」这一语义。
- **系统能力真实核验**（SDK 26）：`UIAbilityContext.startAbility(want: Want): Promise<void>`
  在 `@ohos.app.ability.common.d.ts:61` / `application/UIAbilityContext.d.ts:247` 真实存在；
  `Want`（`@ohos.app.ability.Want.d.ts:31`，`export default class Want`）字段含
  `bundleName / abilityName / action / uri / type / flags / parameters`；
  `EntryAbility.onCreate` 已把 `this.context` 存入 `AppStorage('abilityContext')`，
  `quitApp()` 里 `AppStorage.get<common.UIAbilityContext>('abilityContext')` +
  `getUIContext().getHostContext()` 双通道是多轮真机验证过的可靠取 context 方式。
- **官方 / 社区两种 Want 契约**：
  ① 华为开发者问答「打开当前文件位置，并显示资源管理器」= 显式
  `com.huawei.hmos.filemanager` / `MainAbility` + `parameters.fileUri`；
  ② 官方「拉起文件处理类应用(startAbility)」= 隐式 `ohos.want.action.viewData` +
  `file://` URI + `type` + `flags`；SDK `uniformTypeDescriptor.d.ts:1147` 确有
  `DIRECTORY = 'general.directory'`。两条都保留、逐级兜底，不赌单一通道。
- **URI 形态的关键约束**：本项目 `r.uri` / `browseBase` 是 picker **逐 URI 授权**的
  `file://docs/...` / NAS `file://192.168.x/...` 形态。**不能**用 `fileUri.getUriFromPath()`
  把 `realPathOf()` 后的裸路径转 URI —— SDK 明确该函数只接受「应用沙箱内路径」，
  转出来会丢掉授权段，系统文件管理器反而打不开。故在「URI 字符串」层直接剥文件名，
  保留原 scheme / authority / 百分号编码。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/FileContextMenu.ts` | 新增 6 个 Want 契约常量（`FC_OSFM_BUNDLE` / `FC_OSFM_ABILITY` / `FC_OSFM_PARAM_FILE_URI` / `FC_VIEW_DATA_ACTION` / `FC_DIR_UTD` / `FC_URI_READ_FLAG`）与 4 个纯函数（`fcRevealDirUriOf` / `fcParentUriOf` / `fcRevealIsDirOf` / `fcRevealStatusOf`）。仍严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零 `Date.now` / 零全局可变状态；既有 R72/R73 常量与函数（含 `fcRevealTargetOf` / `fcRevealWantedOf`）**逐字保留**，只是 Index 不再调用 |
| `pages/Index.ets` | `ESC_BUILD_TAG` → `R74`；`FC_ACT_REVEAL` 分支改为 `fcRevealDirUriOf(kind, r.uri, this.browseBase)` 判定目标**目录 URI** 后交给新增的 `openDirInSystemFileManager()`；新增 `import Want`；文件末尾追加 `openDirInSystemFileManager()`（两级 Want + 明确状态反馈 + hilog）。**其余四项动作、菜单文案、详情面板、复制、菜单浮层、放大镜门控、`onFileContextMenu()` 逐字未改** |
| `tests/dirname.test.mjs` | 构建标记 39 处整批升位 `R73 → R74`；订正 2 条与旧 in-app 接线绑定的断言 + 1 条「五动作逐字未改」标签；新增 R74 组 18 条断言与真机步骤 `R74-A~D`（`9626–9638`） |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R74`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **目标恒为「目录」**：`fcRevealDirUriOf` 按行种类分流 —— 图片 / 文本 / 其它档案行 →
  `fcParentUriOf` 剥掉文件名取所在目录；文件夹行 → **该行 URI 自身**（不再取父目录）；
  未命中 kind（`..` 伪行 / 空白 / 未知）→ 空串直接短路；父级判不出 → 退回 `browseBase`；
  两者皆空 → 空串，状态栏明确提示，绝不静默。
- **URI 保留授权链**：`fcParentUriOf` 只在字符串层切最后一个 `/`，并挡住
  `file://docs/a`（authority 边界）、`/a`（根）、`file://`（scheme 斜杠）等伪父级。
  支持 `file://docs/...`、NAS `file://192.168.x/...`、`smb://`、带 `?` 参数、尾斜杠、纯路径。
- **两级 Want 逐级兜底**：① 显式华为文件管理器 + `parameters.fileUri = 目录 URI`；
  ② 隐式 `viewData` + `general.directory` + `FLAG_AUTH_READ_URI_PERMISSION`。
  每级 `.then/.catch` 都写状态栏与 hilog（`fcReveal primary / fallback / both failed`），
  两级都失败明确显示「系统文件管理器未能打开…」。context 复用 `quitApp()` 双通道。
- **只改这一项**：菜单五项文案、打开 / 详情 / 复制路径 / 复制档案名称四项动作、
  `SidebarView.onMouse` 触发链、`ArchiveRow.ets` 行内交互、放大镜门控、详情面板、
  浮层定位全部零改动；R71 HDR / R70 徽标 / 版本 `1.0.7 / 7` 零回归。

### 四、验证用例

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2262 passed, 0 failed`**（R73 基线 2244，+18 条 R74）；`git diff --check` 通过 |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**（R71 HDR 真值源零回归） |
| 纯函数新增覆盖 | 文件→所在目录 / 目录→自身 / 未命中短路 / 双兜底 / `?` 与尾斜杠归一 / NAS 授权段 / 父 URI 边界 / 目录判定 / 状态四态 / Want 契约常量值，共 8 条 |
| 代码级契约 | `REVEAL` 分支（剥注释）内 `onRowTap` / `openFolder` / `fcRevealTargetOf` / `fcRevealWantedOf` 全为 0；`common/` 层无 `startAbility` / `@ohos` / `import` / `: Want`；`ctx.startAbility(` 恰 2 处 |
| 零回归契约 | 五项文案逐字未改、`fcItemCountOf(FOLDER)=5`、其余四项动作接线逐字保留、`SidebarView.onMouse` 与 `ArchiveRow.ets` 未动、版本 `1.0.7 / 7` |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 50 s 534 ms`**；`Finished :entry:default@CompileArkTS... after 30 s 840 ms`（**非 UP-TO-DATE**，`UP-TO-DATE :entry:default@CompileArkTS` 计数 0）；**0 ERROR / 17 WARN**（与 R69–R73 完全一致）；日志 `/tmp/r74-build-final.log` |
| 产物核验 | 签名 HAP **1,694,430 B**（R73 1,687,640 B）/ 未签名 **1,662,037 B** / `ets/modules.abc` **973,956 B**；产物 mtime **18:39:04–06** 晚于三份源码 **18:18:32 / 18:34:24 / 18:37:47**，即 HAP 由最终源码编译 |
| 字节码 | `modules.abc`：**`R74=1 / R73=0 / R72=0 / R71=0 / 1.0.7=1`**；`fcRevealDirUriOf=2` / `fcParentUriOf=2` / `fcRevealStatusOf=2` / `openDirInSystemFileManager=2`；`com.huawei.hmos.filemanager=1` / `ohos.want.action.viewData=1` / `general.directory=1` / **`startAbility=1`**；**`openFolder(target=0`** 证明应用内重列举通道确已移出 REVEAL 产物路径。`fcRevealWantedOf=2` 仍在字节码里是 R72 遗留纯函数（真值源 + 测试保留，Index 已不调用），非回归 |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R74-A~D`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:9626` R74 组）

> ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机系统文件管理器验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R74-A：装新包后 Ctrl+D 角标必须是 R74（R73-A 里的 R73 是历史锚点，以本条为准）；
>     右键任一【文件】→ OS 自带文件管理器弹出并定位到该文件所在目录，绝不在 APP 内预览该文件；
>     状态栏显示「已用系统文件管理器打开「xxx」所在目录 · R74」。
> ⚠️ 真机步骤 R74-B：右键任一【文件夹】→ OS 文件管理器打开【该文件夹自身】（不是它的父目录）；
>     状态栏显示「已用系统文件管理器打开目录「xxx」 · R74」；文件与目录两类都要各测一次。
> ⚠️ 真机步骤 R74-C：若本机未装该系统文件管理器 / 不接受该目录 URI 形态，状态栏必须明确显示
>     「系统文件管理器未能打开…」；请回传 hilog 里 fcReveal primary / fallback / both failed
>     与 dir= 值（含 file://docs 或 NAS 授权段），据此调整 bundleName / abilityName / URI 形态。
> ⚠️ 真机步骤 R74-D：菜单五项文案、打开 / 详情 / 复制路径 / 复制档案名称四项动作、
>     放大镜 toggle、详情面板、菜单定位与收起、「..」行与空白区零菜单逐字零回归；
>     HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /
>     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。

### 七、边界

- **「OS 自带文件管理器」是用户明确要求的系统通道**，与 R72/R73 未验证的
  `bindContextMenu` 手势不同：`startAbility` 是官方跨应用调用契约、SDK 定义完整。
  但该 bundleName / abilityName 是否装在**本机**、是否接受 picker 授权 URI 形态，
  属**真机事实** —— SDK 有 `startAbility`、编译能过、字节码有标记都证明不了。
  因此做两级 Want 兜底 + 明确失败提示，`R74-A/B/C` 请分别按文件 / 目录两类实测。
- **真机若两级都失败**，按 `R74-C` 回传 `hilog`（`fcReveal primary / fallback / both failed`
  与 `dir=` 完整值）；据此调整显式 bundleName / abilityName，或改用本机实际的目录打开
  action / URI 形态（例如把授权 URI 换成系统可识别的 `file://` 写法）。**不假装支持、不静默吞掉**。
- **URI 形态不做二次转换**：目标目录 URI 直接沿用 picker 授权的原始 scheme / authority，
  刻意不经过 `getUriFromPath()`，以免把外部目录误转成本 APP 沙箱 URI。
- **菜单文案「打开档案所在目录」逐字未改**（用户要求保持菜单文案）；改的只是这一项的
  **打开目标**与**打开渠道**。其余四项动作、现有交互全部零回归。
- **版本恒定 `1.0.7 / versionCode 7`**，未跑 `build.sh`、未把 HAP 放桌面、
  **本轮未 push**（用户未授权；R71 `903e544`、R72 `e0223d5`、R73 `71a4b66` 仍在本地）。
- 零新增定时器 / 全局可变状态 / worker；R71 HDR 保真、R70 徽标、R69 行高、R68 resize 画质、
  R67 放大镜、R64 内容量四态、三栏三按钮、文本预览 scrollbar、ESC 全部零回归。
- **编译校验 ≠ 真机验证**；静态契约 ≠ 系统应用真的被拉起；纯函数数值模型 ≠ 目录在文件
  管理器里的实际呈现。

---

## 第七十三轮：右键菜单真机不弹出修复 —— 改走 `.onMouse` 通道 / 应用内浮层 / 零系统手势依赖（2026-11-25，R73）

> 用户真机反馈（原文）：「档案列上右键没有反应」。
> 这是 R72 交付后**真机实测**发现的功能性缺陷：静态契约 2227 条全绿、真编译成功、
> 产物字节码齐全，但菜单在 2in1 上根本不弹 —— 又一次「**编译校验 ≠ 真机验证**」。

### 一、现状判读（按真实源码 + SDK 定义，不凭缓存推断）

- **R72 把菜单挂在没有任何真机证据的系统手势通道上**：`SidebarView.ets` 用
  `bindContextMenu(..., ResponseType.RightClick)`，依赖框架内部把鼠标右键事件识别成
  「上下文菜单手势」再拉起独立子窗口。SDK 26 `common.d.ts:21495` 只证明该 API 存在、
  `enums.d.ts:2989` 只证明 `RightClick` 枚举存在、`ListItemAttribute extends CommonMethod`
  只证明绑定层类型合法 —— **都不能证明系统手势在 2in1 真机上真的派发**。
- **同一个 `ListItem` 上还有自相矛盾的 `stopPropagation`**：R72 为抑制放大镜，在命中行
  的 `.onMouse` 里对 `MouseAction.Press` + `MouseButton.Right` 调了
  `event.stopPropagation()`。SDK `common.d.ts:8826` 明确该 API「Disables event bubbling
  propagation」—— 事件冒泡被掐断后，系统菜单手势识别器拿不到完整右键序列是合理后果。
- **官方资料佐证平台差异**：HarmonyOS 官方 FAQ 有「绑定菜单后无法使用右键触发菜单」条目；
  PC 专文指出 2in1 上右键事件流与左键 `onClick` 分离、一次右键 = Press + Release 两个动作。
- **现成的可靠通道**：项目第十五轮起根 `.onMouse` 的 `MouseAction.Press` +
  `MouseButton.Right` → `applyLoupeToggle(...)` 有多轮真机证据（右键 toggle 放大镜一直有效）。
  `ArchiveRow.ets` 的行内 `.onMouse` / `onHover` 缩略图同样真机有效。
  **结论：改由 `ListItem.onMouse` 的右键 Press 直接驱动菜单，不再赌系统手势。**
- 判读严守「不盲目推断唯一根因」：`stopPropagation` 掐断、系统手势不派发、
  `ListItem` 与 `bindPopup` / `TapGesture` 的手势竞争三者都可能单独致病。R73 不逐条赌，
  而是**把整条系统手势依赖移除**，让触发链落在唯一有真机证据的 `.onMouse` 上。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/FileContextMenu.ts` | 新增 6 个尺寸常量（`FC_MENU_W=200` / `ITEM_H=34` / `TITLE_H=24` / `PAD_V=6` / `EDGE_V=8` / `NAME_MAX=28`）、`FcMenuPos` 接口、5 个纯函数（`fcMenuHeightOf` / `fcMenuPosOf` / `fcMenuOutsideOf` / `fcMenuTitleOf` / `fcMenuVisibleOf`）。仍严格零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零 `Date.now` / 零全局可变状态；既有 24 常量 + 16 函数逐字保留 |
| `components/SidebarView.ets` | **移除** `bindContextMenu` / `ResponseType` / `Menu()` / `MenuItem()` / `fileContextMenuOf` builder 与 `onContextAction` 回调；命中行 `ListItem` 的 `.onMouse` 右键 Press 取 `displayX/displayY`（SDK 15+ 窗口坐标系，vp；缺失退回 `event.x/y`）后上抛 `onContextMenu(idx, x, y)`，再 `stopPropagation()`；未命中分支仍是裸 `ListItem`，零绑定 |
| `pages/Index.ets` | `ESC_BUILD_TAG` → `R73`；新增 7 个 `@State`（`ctxMenuOn/Idx/X/Y/Name/Items/Hover`）；`SidebarView` 接线改 `onContextMenu`；根 `Stack` 内新增 `fcMenuVisibleOf(...)` 条件菜单浮层（标题 + 五项 `ForEach` + hover 高亮 + 点遮罩收起 + `zIndex(21)`）；`onRootMouse` 加一条门控，菜单打开时右键不再翻放大镜；文件末尾追加 `onFileContextMenu()`；`onFileContextAction()` 五动作分支**逐字未改** |
| `tests/dirname.test.mjs` | 构建标记 38 处整批升位 `R72 → R73`；订正 2 条与旧接线绑定的断言；新增 R73 组 17 条断言与真机步骤 `R73-A~D` |
| `README.md` / 记忆 | 抬头 / 手册 / 步骤表升位 `R73`，新增本章，追加当日与长期记忆 |

### 三、设计要点

- **触发链**：右键 Press → `ListItem.onMouse` → `onContextMenu(idx, x, y)` →
  `Index.onFileContextMenu()` → 复核 `fcHitOf` + `fcItemsOf` 快照 + `fcMenuPosOf` 裁剪 →
  `@State ctxMenuOn = true` → 根 `Stack` 条件渲染浮层。全链路是应用内事件与状态，
  **零系统手势、零独立子窗口、零 `CustomBuilder` 隐式调用**。
- **仅档案项触发**：`fcHitOf(kind)` 为真的行才绑 `.onMouse`；「..」伪行、列表下方空白、
  空态、标题行、三个按钮都没有绑定，右键绝不弹菜单（用户硬要求逐字保留）。
- **放大镜零回归**：命中行右键 Press 仍 `stopPropagation()` 阻断冒泡到根 `.onMouse`；
  另在 `onRootMouse` 加 `if (!(this.ctxMenuOn && event.button === MouseButton.Right))` 门控，
  菜单打开期间右键也不会顺带翻放大镜。预览区 / 空白区右键 toggle 逐字保留。
- **浮层定位**：`fcMenuPosOf` 把鼠标窗口坐标裁成菜单左上角坐标，右下越界向内翻转、
  NaN / 负坐标收进 8vp 安全区、窗口尺寸未测出时只做下限裁剪，返回新对象。
- **不假装支持**：菜单仍是「打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称」五项，
  文案与行为对齐原生鸿蒙档案管理员；本 APP 只读，不摆重命名 / 删除 / 剪切 / 分享 / 压缩。
  五项真实行为全部复用 R72 的 `onFileContextAction`，零改动。
- **样式边界如实标注**：R72 用系统 `Menu/MenuItem` 组件、由系统渲染原生样式；R73 改为
  应用内 `Column/Row/Text` 浮层（深色圆角 + 边框 + hover 高亮 + 档案名标题），
  **观感不再由系统主题渲染**，需真机按 `R73-A` 确认是否可接受。

### 四、验证用例

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2244 passed, 0 failed`**（R72 基线 2227，+17 条 R73）；`git diff --check` 通过 |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**（R71 HDR 真值源零回归） |
| 纯函数新增覆盖 | 尺寸 / 总高（5 项 = 206vp）/ 右下翻转 / NaN 兜底 / 新对象 / 点击外部四向 / 标题截断 / 显隐门控，共 6 条 |
| 触发层契约 | 代码级（剥注释）`bindContextMenu` / `ResponseType` / `MenuItem` / `Menu()` 全为 0；`.onMouse` 仅 1 处且只在命中分支 |
| 零回归契约 | `ArchiveRow.ets` 仍无 `bindContextMenu` / `fcHitOf`，行高 `0.2` 与 `TapGesture({ count: 2 })` 逐字保留；版本 `1.0.7 / 7`；R71 HDR / R70 徽标 / R72 详情面板全在 |

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 14 s 515 ms`**；`Finished :entry:default@CompileArkTS... after 8 s 473 ms`（**非 UP-TO-DATE**）；33 tasks：18 executed / 15 up-to-date；**0 ERROR / 17 WARN**（与 R69–R72 完全一致）；日志 `/tmp/r73-build.log` |
| 产物核验 | 签名 HAP **1,687,640 B**（R72 1,671,036 B）/ 未签名 **1,652,103 B** / `ets/modules.abc` **968,456 B**；产物 mtime **14:46:11–12** 晚于三份源码 **14:30:25 / 14:34:36 / 14:38:03** 与测试 **14:45:23**，即 HAP 由最终源码编译 |
| 字节码 | `modules.abc`：**`R73=1 / R72=0 / R71=0 / 1.0.7=1`**，`FileContextMenu=5` / `fcMenuPosOf=1` / `fcMenuVisibleOf=1` / `onFileContextMenu=2` / `打开档案所在目录=1` / `复制档案名称=1`；**`bindContextMenu=0` / `ResponseType=0`** 证明系统手势链路确已移出产物；签名 HAP 内 `R73=1 / R72=0 / 1.0.7=2` |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 `R73-A~D`）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:9463` R73 组）

> ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机右键菜单验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R73-A：装新包后 Ctrl+D 角标必须是 R73（R72-A 里的 R72 是历史锚点，以本条为准）；
>     左栏右键任一档案 → 鼠标位置弹出菜单，标题为该档案名，依次为「打开 / 详情 /
>     打开档案所在目录 / 复制路径 / 复制档案名称」；右键「..」行、列表下方空白区、
>     标题行、三个按钮一律不弹菜单。
> ⚠️ 真机步骤 R73-B：点菜单外任意位置即收起；点「详情」→ 居中面板显示名称 / 类型 / 大小 /
>     修改时间 / 所在位置 / 完整路径六项；点「打开档案所在目录」→ 左栏定位并高亮该档案，
>     状态栏给出明确反馈；「复制路径」「复制档案名称」可在任意文本输入框 Ctrl+V 验出。
> ⚠️ 真机步骤 R73-C：右键档案行**不再**顺带翻转放大镜；预览区 / 空白区右键 toggle 放大镜照常；
>     菜单在窗口右下角右键时向内翻转不越界；左键单击选图、双击进全屏、hover 缩略图、
>     滚轮切图、列表滚动、往上层、排序、选择文件夹零回归。
> ⚠️ 真机步骤 R73-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /
>     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。

### 七、边界

- **R72 的 `bindContextMenu(ResponseType.RightClick)` 路径在本机真机不派发**，本轮整条移除；
  不推断「所有 2in1 都不支持」，只按本机现象换可靠通道。
- **菜单是应用内条件浮层，不是系统原生菜单子窗口**：观感由应用绘制，不再随系统主题；
  `zIndex(21)` 只压过详情面板（20）与贴顶唤出层（10），不接管滚轮 / 拖拽 / 放大镜。
- **`displayX/displayY` 为 SDK 15+ 窗口坐标（vp）**；若设备不上报该字段则退回相对组件的
  `event.x/y`，此时菜单可能不贴鼠标但仍会弹出（绝不空白、绝不抛错）。
- **R71 / R72 真机验证仍由用户完成**；`Ctrl+D` 角标以 `R73-A` 的 `R73` 为准，
  测试里早期轮次的 `R38` / `R71` / `R72` 角标都是当时的历史锚点。
- 未升版本（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面、
  **本轮未 push**（用户未授权；R71 `903e544` 与 R72 `e0223d5` 也仍在本地）。
- 零新增定时器 / 全局可变状态 / worker；R71 HDR 保真、R70 徽标、R69 行高、R68 resize 画质、
  R67 放大镜、R64 内容量四态、三栏三按钮、文本预览 scrollbar、ESC 全部零回归。
- **编译校验 ≠ 真机验证**；静态契约 ≠ 应用内浮层实际观感；纯函数数值模型 ≠ 系统剪贴板 /
  目录列举实际行为。

---

## 第七十二轮：档案列表右键菜单 —— 原生文案五项 / 仅档案项触发 / 详情面板 / 打开所在目录 / 放大镜零回归（2026-11-25，R72）

> 用户诉求（原文）：「请在档案列表中实现右键菜单：当用户 right-click 任一档案项目时，
> 弹出与原生鸿蒙OS档案管理员一致的档案管理选项，至少包含「档案 detail」「打开档案所在目录」
> 等选项。菜单仅在档案项目上触发，空白区域不显示；选项文案与行为对齐原生鸿蒙OS档案管理员，
> 且不影响列表其他交互。」

### 一、现状判读（按真实源码 + 官方 API 语义，不凭缓存推断）

- **原生文案有官方依据**：华为消费者支持文档对鸿蒙电脑档案管理员的用词是「**详情**」
  （`选中文件，打开右键菜单，点击详情，查看打开方式`、`Alt+Enter` 同义），以及
  「打开所在文件夹 / 在文件夹中显示 / 一键打开所在文件夹」。故用户口中的
  「档案 detail」按官方对齐为「详情」，「打开档案所在目录」沿用用户原话。
- **本 APP 是只读看图器**：`module.json5` 只申请 `ohos.permission.READ_IMAGEVIDEO`，
  不具备写入 / 删除 / 重命名 / 分享能力。因此**不摆出做不到的假选项**
  （重命名 / 删除 / 剪切 / 分享 / 压缩），只落地五项真实可执行动作，沿用本项目
  「不假装支持、失败态明确」的一贯口径。
- **右键已被占用**：第十五轮起，根容器 `onRootMouse` 在**任何**右键 `Press` 上 toggle
  放大镜（注释明确「左栏 / 空白处也能切换」）。若直接给行绑菜单，右键会「弹菜单 + 翻转
  放大镜」双响应，属交互回归。而 R15 静态契约要求 `onMouseButton()` 的
  `event.stopPropagation()` 与 `applyLoupeToggle(true)` 形态存在，**不能粗暴删除**。
- **SDK 26 API 真实核验**（非文档推断）：从
  `hmos-clt_1.0.0/sdk/default/openharmony/ets/component/common.d.ts` /
  `enums.d.ts` / `menu_item.d.ts` 确认
  `bindContextMenu(content: CustomBuilder, responseType: ResponseType, options?: ContextMenuOptions): T`、
  `ResponseType.RightClick`、`MenuItemOptions.content`、`MenuItem.onClick` 均可用；
  菜单由系统样式渲染（独立子窗口、点击自动收起），最贴近「与原生档案管理员一致」。
- **一次右键 = Press + Release**：处理逻辑只认其一，避免双触发。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/FileContextMenu.ts` | **新增** 284 行唯一真值源，**43 个导出**（24 常量 + 16 纯函数 + 3 结构）：行种类、动作码 / 菜单文案、命中判定、菜单项、越权拒绝、放大镜抑制、类型名 / 字节档 / 时间格式、详情六字段、目录归一、所在目录决策、复制文本、状态反馈。零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零 `Date.now` / 零全局可变状态 |
| `components/SidebarView.ets` | +89 / −20：新增 `@Builder archiveRowOf()`（两条分支共用同一份 `ArchiveRow` 构造）、`@Builder fileContextMenuOf()`（原生 `Menu()` / 五个 `MenuItem()`）、`onContextAction` 上抛；`LazyForEach` 的 `ListItem` 改为 `fcHitOf()` 条件分支，**仅命中行**绑 `.bindContextMenu(..., ResponseType.RightClick)` 并在右键 Press 用 `fcStopPropagationOf()` 拦冒泡 |
| `pages/Index.ets` | +153 / −2：文件头主线号与 `ESC_BUILD_TAG` `R71 → R72`；新增 `FileContextMenu` import；新增 `@State ctxDetailOn/ctxDetailTitle/ctxDetailFields`；`SidebarView` 下传 `onContextAction`；根 `Stack` 末尾新增条件详情浮层（遮罩 / 关闭两种收起、`zIndex(20)`、六字段 `ForEach`）；文件末新增 `onFileContextAction()` 五动作总收口 |
| `tests/dirname.test.mjs` | +261 / −36：`import` FileContextMenu 全套导出；**33 处以上**历史 `ESC_BUILD_TAG` 断言整批升位 `R72`；新增 R72 组 **26 条**断言与真机步骤 A~D（`9312–9322`） |
| `README.md` / 记忆文件 | 抬头 / 手册 / 步骤对照表同步（`R71 → R72`），新增本章 |

**逐字不变**：`components/ArchiveRow.ets` **零改动**（行内属性、hover、点击 / 双击、行高 0.2
全部保持）；根 `onRootMouse` / `onMouseButton` / `applyLoupeToggle` 形态未删；预览区与空白区
右键 toggle 放大镜照常；`onRowTap` / `onDblTap` / `openFolder` / `pasteboard` 既有链路复用；
`new Promise` 恰 2 处 / `Promise.race` 1 处 / 无 worker；`APP_VERSION 1.0.7` / `versionCode 7`。

### 三、设计要点（全部是纯函数可回归判定）

- **菜单只在档案项上触发**：`fcHitOf(kind)` 只认图片 / 文本 / 其它档案 / 文件夹四类真实行；
  「`..`」往上层是导航伪行、列表下方空白 / 空态 / 标题栏 / 三个按钮都不是 `ListItem`，
  **根本没有 `bindContextMenu` 绑定** ⇒ 右键绝不弹菜单。`fcItemsOf()` 对未命中行返回空数组，
  每次返回新数组，零共享可变状态；未知 / 负数 / `NaN` 一律不命中。
- **放大镜零回归（关键冲突）**：命中行 `ListItem` 的 `.onMouse` 只在
  `MouseAction.Press` + `MouseButton.Right` + 命中三项同时成立时
  `event.stopPropagation()`（`fcStopPropagationOf(isPress, isRight, hit)`）；`Release` /
  左键 / 空白区 / 「`..`」行一律放行，根容器右键 toggle 放大镜完全不受影响。
  绑定层选在 `SidebarView` 的 `ListItem` 而非 `ArchiveRow`，避免改动行组件源码形态。
- **五项动作与真实行为**：`打开`（复用 `onRowTap`，图片预览 / 进目录 / 文本预览逐字不变）、
  `详情`（居中面板六字段：名称 / 类型 / 大小 / 修改时间 / 所在位置 / 完整路径，缺值一律
  `--` 兜底，绝不空串 / 抛错）、`打开档案所在目录`（`fcRevealTargetOf` 父级优先、
  判不出退回当前浏览目录；`fcRevealWantedOf` 只在目标层与当前层不同才
  `openFolder(target, false, false, true)` 真实重列举，同层直接定位并高亮该档案，
  两者皆空给明确状态提示，不静默无反应）、`复制路径` / `复制档案名称`（走既有
  `pasteboard` 链，失败有明确提示）。
- **防御式分发**：`onFileContextAction()` 二次复核 `fcHitOf` + `fcHasActOf`，越权动作 /
  未命中行 / 越界下标一律拒绝；五个动作各有明确中文状态反馈，点了看得见反应。
- **详情面板只存纯字符串字段**，不碰 `items / rows / cur / browseBase / 放大镜 / 滚轮`，
  收起后一切浏览状态原样。

### 四、验证用例（`tests/dirname.test.mjs` R72 组）

26 条：① 真值源纯净（零 SDK/IO/await/throw/定时器/Promise/Date.now/全局状态）；② 行种类与
`ArchiveRow.ets` 的 `ROW_*` 严格一致；③ 五项文案对齐原生；④ 用户点名的两项恒在菜单；
⑤ 顺序 / 动作码唯一 / 文案非空；⑥ **不假装支持**（代码级五条 `FC_LABEL_` 声明与运行时
菜单标签都不含重命名 / 删除 / 剪切 / 分享 / 压缩，只读依据写在文件头注释按原文核验）；
⑦ 命中判定（含 `NaN`）；⑧ 空白区零菜单 / 命中恒 5 项 / 返回新数组；⑨ 越权动作被拒；
⑩ 仅「右键 Press + 命中行」才 `stopPropagation`；⑪ `SidebarView` 条件分支接线；
⑫ `ArchiveRow.ets` 逐字未改的放大镜零回归；⑬ 详情六字段；⑭ 缺值逐项兜底；⑮ 类型名 /
字节档 / 时间格式；⑯ 详情标题恒非空；⑰ 目录归一；⑱ 所在目录父级优先；⑲ 同层只定位；
⑳ 复制文本仅由复制类动作产生；㉑ 五动作状态反馈；㉒ `Index` 接线与二次复核；㉓ 行为接线；
㉔ 详情面板接线；㉕ 零回归（R71 HDR 保真 / R70 徽标 / R69 行高 / R64 四态 / 版本 / Promise 计数）；
㉖ 构建标记 `R72` / 旧标记 `R71` 与 `R70` 已清 / 历史断言整批升位。

> 收口时发现并修正一处**测试契约自身**的误写：原第 ⑥ 条把只读设计依据
> `只读看图器` 放在已剥注释的 `FC72_CODE` 上核验，而该依据只存在于文件头注释，恒为 false。
> 改为「运行时菜单标签 + 代码级五条 `FC_LABEL_` 声明（剥注释）双重核验」+「原文按未剥注释
> 核验」，断言更严且不再自相矛盾；**源码零改动**。

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2227 passed, 0 failed`**（R71 基线 2201，+26 条 R72）；`git diff --check` 通过 |
| 独立零回归脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**（R71 HDR 真值源零回归） |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 11 s 891 ms`**；`Finished :entry:default@CompileArkTS... after 7 s 520 ms`（**非 UP-TO-DATE**，UP-TO-DATE 计数 0）；33 tasks：17 executed / 16 up-to-date；**0 ERROR / 17 WARN**（与 R69/R70/R71 完全一致，全为 `Index.ets` 既有 2in1 / `READ_IMAGEVIDEO` 提示）；成功日志 `/tmp/r72-build2.log` |
| 首次编译失败与修复 | `/tmp/r72-build.log`：详情面板插在根 `Stack` 闭合 `}` 之后、`.width('100%')` 之前，打断属性链 ⇒ `Declaration or statement expected` / `Cannot find name 'width'` / `build()` 多根节点，`COMPILE RESULT:FAIL`。修复：删去原闭合 `}`，把详情面板作为根 `Stack` 内最后子项，之后补 `}` 再接 `.width('100%')`；重编译成功 |
| 产物核验 | 签名 HAP **1,671,036 B**（R71 1,625,883 B）/ 未签名 **1,633,907 B**（R71 1,590,355 B）/ `ets/modules.abc` **956,388 B**（R71 927,812 B）；产物 mtime **12:37:22–23** 晚于三份源码 **12:30:39 / 12:31:45 / 12:37:03**，即 HAP 由最终源码编译；字节码 **`R72=1 / R71=0 / 1.0.7=1`**，`FileContextMenu=3` / `fcHitOf=2` / `fcItemsOf=2` / `fcDetailFieldsOf=2` / `fcStopPropagationOf=2` / `bindContextMenu=1` / `打开档案所在目录=1` / `复制档案名称=2` 全部进包；签名 HAP 内 `R72=1 / R71=0 / 1.0.7=3` |
| SDK 语义 | `bindContextMenu` / `ResponseType.RightClick` / `MenuItem.onClick` 在目标 SDK 26 真编译通过（0 ERROR），非仅文档推断 |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志 / 旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
> `只读看图器` 在字节码中为 0 属预期（仅存在于文件头注释，编译器不写入产物）。
>
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 R72-A~D）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:9312` R72 组）

> ⚠️ 本组是源码静态契约 + 纯函数数值模型，不替代真机右键菜单验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R72-A：装新包后 Ctrl+D 角标必须是 R72；左栏右键任一档案 → 弹出系统样式菜单，
>     依次为「打开 / 详情 / 打开档案所在目录 / 复制路径 / 复制档案名称」；右键「..」行、
>     列表下方空白区、标题行、三个按钮一律不弹菜单。
> ⚠️ 真机步骤 R72-B：点「详情」→ 居中面板显示名称 / 类型 / 大小 / 修改时间 / 所在位置 /
>     完整路径六项；点遮罩或「关闭」即收；点「打开档案所在目录」→ 左栏定位并高亮该档案，
>     状态栏给出明确反馈；「复制路径」「复制档案名称」可在任意文本输入框 Ctrl+V 验出。
> ⚠️ 真机步骤 R72-C：右键档案行**不再**顺带翻转放大镜；预览区 / 空白区右键 toggle 放大镜照常；
>     左键单击选图、双击进全屏、hover 缩略图、滚轮切图、列表滚动、往上层、排序、选择文件夹零回归。
> ⚠️ 真机步骤 R72-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 / 并排右页 / HDR 徽标 / R71 HDR 保真 /
>     R68 resize 画质 / R69 行高 / R64 内容量 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归。

### 七、边界

- **未升版本**（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面、
  **本轮未 push**（用户未授权；R63–R70 此前已在明确授权下同步完毕）。
- **只读语义如实标注**：「打开档案所在目录」是**应用内**定位 / 高亮 / 重列举，
  不调起系统档案管理员窗口（本 APP 无该能力，不假装支持）；「打开」沿用应用内预览，
  不是「打开方式」选择框；五项之外不提供重命名 / 删除 / 剪切 / 分享 / 压缩。
- **详情面板是条件浮层**（`ctxDetailOn` 为真才画，点遮罩 / 关闭即收），不是 R55 所禁止的
  常显角标；`zIndex(20)` 只压过既有贴顶唤出层（10），不接管滚轮 / 拖拽 / 放大镜。
- **`bindContextMenu` 的系统菜单样式、弹出位置、暗色 / 浅色适配由系统渲染**，
  静态契约只能验「绑定层 + 文案 + 命中」；真机菜单观感仍需用户按 R72-A 验证。
- **R71 真机验证仍由用户完成**（HDR 显示、色彩亮度、设备 / SDK 是否真输出 HDR、
  损坏 / 不兼容 / 缺 HDR 信息提示），`编译校验 ≠ 真机验证`。
- 零新增定时器 / 全局可变状态 / worker；R71 HDR 保真、R70 徽标、R69 行高、R68 resize 画质、
  R67 放大镜、R64 内容量四态、三栏三按钮、文本预览 scrollbar、ESC 全部零回归。
- **编译校验 ≠ 真机验证**；静态契约 ≠ 系统菜单实际观感；纯函数数值模型 ≠ 系统剪贴板 /
  目录列举实际行为。

---

## 第七十一轮：HEIC HDR 保真解码与预览 —— 显式 HDR 档 / 产物校验 / 原始尺寸保真 / 三类异常明确提示（2026-11-25，R71）

> 用户诉求（原文）：「实现一个 HEIC 格式解码并以 HDR 形式输出预览的功能：以 HEIC 文件或数据为输入，
> 输出保留原始尺寸、方向、色彩空间、HDR 元数据、高动态范围及正确色彩亮度的可显示预览，
> 避免动态范围压缩与色彩失真；要求在支持 HDR 的显示环境中稳定呈现，对缺失 HDR 信息、
> 格式不兼容或文件损坏给出明确提示，并确保实现可直接运行验证。」

### 一、现状判读（按真实源码 + 官方 API 语义，不凭缓存推断）

- **`AUTO` 会静默降 SDR**：`model/Preview.ets` 的 `decodePx()` 既有
  `opts.desiredDynamicRange = image.DecodingDynamicRange.AUTO`；官方语义是「按资源格式与
  设备能力自适应」，当平台/设备不支持时**允许降为 SDR 且无任何提示**——与用户要求的
  「避免动态范围压缩」直接冲突。官方 `DecodingDynamicRange` 有 `AUTO / SDR / HDR` 三档，
  本轮对 HDR 源显式请求 `HDR`，不再把「是否保住 HDR」交给平台静默决定。
- **只校验源图，未校验产物**：既有链只靠 `ImageSource.getImageInfo().isHdr`（源图是否
  HDR 格式）写 `PreviewEntry.isHdr`，**从未校验真正上屏的 `PixelMap`**。若 SDK 把 HDR
  解成 SDR，界面仍会当成 HDR（R70 徽标照常亮起），属「以 SDR 冒充 HDR」。
  `PixelMap.getImageInfo().isHdr` 才是**解码产物真值**。
- **HEIC 是 ISOBMFF 容器，HDR 线索在盒子里**：`ftyp` 的 `major_brand`/`compatible_brands`
  识别 HEIC/HEIF 家族；`meta/iprp/ipco` 下的 `colr(nclx)` 给出 `primaries=9`(BT.2020)、
  `transfer=16`(PQ)/`18`(HLG)；`clli/mdcv` 为 HDR10 静态元数据；`auxC` URN 含
  `gain`/`hdr` 为 gain map 路线；`heix/hevx` 为 10bit HEVC 路线。既有代码完全没有这层预检。
- **三类异常此前只有 `hilog`**：缺 HDR 信息 / 格式不兼容 / 文件损坏，界面无明确提示，
  用户只看到白屏或普通 SDR 图。既有 3 处
  `.dynamicRangeMode(this.viewHdrWanted ? DynamicRangeMode.HIGH : DynamicRangeMode.STANDARD)`
  是 R42 起既有的显示策略，**本轮逐字不动、零回归**。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/HdrPreview.ts` | **新增** 664 行唯一真值源，**87 个导出**（46 常量 + 5 结构 + 36 纯函数）：ISOBMFF 递归解析 / HDR 元数据识别 / 损坏分类 / 显式动态范围决策 / 产物校验 / 保真护栏 / 明确提示文案。零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零全局可变状态 |
| `model/Preview.ets` | 新增 `HdrPreview` import；`PreviewEntry` 扩展 `srcW/srcH/isHdrDecoded/hdrCode/hdrHint`；新增模块级失败原因表（`noteDecodeFail` / `decodeFailCodeOf` / `decodeFailHintOf`）；`decodePx()` 加入容器预检、显式 `image.DecodingDynamicRange.HDR`、原始尺寸保真档、`await px.getImageInfo()` 产物校验、`hpOutcomeOf()` 结果归一；`decodeAstroPx()` 补齐 R71 字段且恒 `isHdr:false` 不误标 |
| `pages/Index.ets` | 文件头主线号 `R70 → R71`、`ESC_BUILD_TAG` `R70 → R71`；单独一行 import `decodeFailCodeOf/decodeFailHintOf`、`hpShowHintOf`；新增 `@State hdrCode/hdrHint`；`showPreviewOf()` 切图清零、`setViewMeta()` 落地、`loadViewNow()` 解码失败按 uri 取明确提示；预览区新增 `if (hpShowHintOf(this.hdrCode))` 条件浮层（`9033` 起） |
| `tests/hdrprobe.mjs` | **新增** 262 行「可直接运行验证」CLI：内置真实构造的 ISOBMFF/HEIF 字节样本（HDR10 PQ / 普通 SDR / gain map / 截断损坏 / jpeg 伪装）自检 + 传真实文件出探测报告 + `--json` 输出。只依赖 `node:fs` 与 `HdrPreview.ts`，零 SDK / 零真机 |
| `tests/dirname.test.mjs` | `import` HdrPreview 全套导出与 hdrprobe 样本；**34 处**历史 `ESC_BUILD_TAG` 断言整批升位 `R71`；新增 R71 组 **22 条**断言与真机步骤 A~D（`9086–9097`） |
| `README.md` / 记忆文件 | 抬头 / 手册 / 步骤对照表同步，新增本章 |

**逐字不变**：`const raw: ArrayBuffer | undefined = await rawStore.ensure(uri);`、
`isHdr: info.isHdr === true`（R70 徽标真值链）、既有 3 处 `dynamicRangeMode`、
`viewHdrWanted`、EXIF `readExifTransform()`/`exifSizeOf()`、R68 `viewDisplayPx`、
R67 放大镜、R64 四态、`new Promise` 恰 2 处 / `Promise.race` 1 处、无 worker、
`APP_VERSION 1.0.7` / `versionCode 7`。

### 三、为什么能保住 HDR（保真策略，全部是纯函数可回归判定）

- **显式 HDR 档**：`hpRequestOf(isHdrSource, format, metaPresent)` —— 源 HDR 或容器检出
  HDR 元数据 ⇒ `HP_RANGE_HDR(2)`；普通 SDR ⇒ `AUTO(0)`；损坏/不兼容 ⇒ `AUTO` 不强解。
  `decodePx()` 据此写 `opts.desiredDynamicRange = image.DecodingDynamicRange.HDR`。
- **产物校验**：`hpOutcomeOf(request, isHdrSource, isHdrDecoded)` —— 请求 HDR + 产物 HDR
  = `HP_OK_HDR`；请求 HDR 但产物 SDR = **`HP_HDR_DOWNGRADED`（明确报「动态范围已被压缩」）**；
  产物 HDR 标记读不到 = `HP_HDR_UNVERIFIED`。绝不静默以 SDR 冒充 HDR。
- **原始尺寸保真**：`hpDecodeSizeOf()` 对 HDR HEIC 在 **12M 总像素 / 4096 长边**护栏内
  按 `ispe` 原始尺寸解码（3840×2160 直接原尺寸）；超限退到既有等比档并标记 `capped`，
  给「原图超过 HDR 保真上限，已按显示档位缩放（原尺寸 …）」信息提示，不是静默缩小。
- **色彩 / 方向 / 位深 / 亮度护栏**：`hpColorSpacePreservedOf()` HDR 图保留源色彩空间，
  不强制转 sRGB / Display P3；`hpPixelFormatSafeOf()` 10bit 内容不得落到
  `RGBA_8888`(8bit)；`hpNoToneMapOf()` 不做 tone mapping；EXIF 方向继续走既有
  `readExifTransform()`/`exifSizeOf()` 链路；`hpAspectPreservedOf()` 等比不改宽高比。
- **量化数值模型**：`hpQuantLevelsOf(10)=1024` / `(8)=256` 级，`hpRangeRatioOf()=4×`
  —— 落到 8bit 必丢 3/4 级数，故 10bit 护栏是硬约束而非建议。
- **三类异常严格分类不混淆**：原因码 `HP_NO_HDR_META` / `HP_CAUSE_FORMAT` /
  `HP_FILE_CORRUPT` 与格式码 `HP_FMT_CORRUPT` / `HP_FMT_INCOMPATIBLE` **命名空间隔离**
  （初版曾撞值导致「格式不兼容」被误报为「损坏」，已修）。`hpFormatOf()` 先按扩展名
  分流，JPG/PNG 等其它格式字节绝不被当 ISOBMFF 误报损坏；无扩展名但字节确属 HEIC
  家族时仍支持**纯数据输入**。`hpHintOf()` 逐类给中文明确提示，正常态
  `hpShowHintOf()=false` 零提示。

### 四、验证用例（`tests/dirname.test.mjs` R71 组）

22 条：① HdrPreview 纯函数真值源（零 SDK/IO/await/throw/定时器/Promise/全局状态）；② 关键
参数（BT.2020=9 / PQ=16 / HLG=18 / 12M 像素 / 4096 长边 / RGBA_8888=3 / 显式 HDR=2）；
③ 真实 HEIC 字节 `ftyp/brand + ispe + nclx + clli + heix` 全读出；④ ISOBMFF 递归进入
`meta/iprp/ipco`；⑤ 三类异常严格分类 + gain map 单独识别；⑥ 原因码/格式码命名空间隔离；
⑦ JPG/PNG 零回归护栏；⑧ 纯数据输入；⑨ 损坏边界零抛错；⑩ 显式 HDR 档决策；⑪ 产物
`isHdr` 校验（真 HDR / 明确报压缩）；⑫ 显示模式 `HIGH/CONSTRAINT/STANDARD` 模型；⑬ 原始
尺寸保真与超护栏 `capped`；⑭ 等比/色彩/位深/无 tone map 护栏；⑮ 量化级数与 4× 范围比；
⑯ 三类异常各有明确提示、正常态零提示；⑰ 失败原因归一；⑱ 解码链静态接线；⑲ 界面接线；
⑳ 可直接运行验证脚本；㉑ 零回归（R70 徽标 / 3 处 dynamicRangeMode / R68 AA / R64 四态 /
版本 / Promise 计数）；㉒ 构建标记 `R71` / 旧标记已清 / 34 条历史断言整批升位。

### 五、真实编译 / 产物核验（本轮实测）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2201 passed, 0 failed`**（R70 基线 2179，+22 条 R71）；`git diff --check` 通过 |
| 独立验证脚本 | `node tests/hdrprobe.mjs` → **`ALL PASS 16 checks, 0 failed`**；`node tests/hdrprobe.mjs /tmp/r71-sample.heic` → `HEIC / hdrMeta.present:true / HDR(显式) / 3840×2160 / originalSizeKept:true` |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 2 min 14 s 204 ms`**；`Finished :entry:default@CompileArkTS... after 1 min 34 s 508 ms`（**非 UP-TO-DATE**）；33 tasks：18 executed / 15 up-to-date；**0 ERROR / 17 WARN**（与 R69/R70 完全一致，全为 `Index.ets` 既有 2in1 / `READ_IMAGEVIDEO` 提示）；日志 `/tmp/r71-build.log` |
| 产物核验 | 签名 HAP **1,625,883 B**（R70 1,568,303 B）/ 未签名 **1,590,355 B**（R70 1,531,337 B）/ `ets/modules.abc` **927,812 B**（R70 895,280 B）；产物 mtime **02:50** 晚于源码 **02:34–02:47**，即 HAP 由最终源码编译；字节码 **`R71=1 / R70=0 / R69=0 / 1.0.7=1`**，`HdrPreview=3` / `hpRequestOf=2` / `hpProbeOf=2` / `decodeFailHintOf=2` / `decodeFailCodeOf=2` / `DecodingDynamicRange=1` / `HP_HDR_UNVERIFIED=1` / `HP_NO_HDR_META=1` 全部进包 |
| SDK 语义 | `image.DecodingDynamicRange.HDR` 与 `px.getImageInfo()` 在目标 SDK 26 真编译通过（0 ERROR），非仅文档推断 |

> ⚠️ 沿用 R70 教训：收口前先核验**产物字节码标记 + mtime**，确认不是旧日志/旧 HAP
> 充当新包证据；`CompileArkTS` 必须是 `Finished ... after ...` 而非 `UP-TO-DATE`。
>
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 R71-A~D）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:9086` R71 组）

> ⚠️ 本组是源码静态契约 + 真实构造 HEIC 字节解析 + 数值模型，不替代真机 HDR 显示验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R71-A：装新包后 Ctrl+D 角标必须是 R71；打开 HDR HEIC，预览区正常出图，
>     左上角出现 R70「HDR」标识；底部不出现任何异常提示（正常态零提示）。
> ⚠️ 真机步骤 R71-B：分别用「无 HDR 信息的普通 HEIC」「jpeg brand 伪装成 .heic」
>     「截断损坏的 HEIC」三份样本，底部依次出现「未包含 HDR 信息」「格式不兼容」
>     「文件损坏或数据不完整」明确提示；系统解码兜底路径不白屏、不吞提示。
> ⚠️ 真机步骤 R71-C：HDR 显示设备上打开 10bit PQ/HLG HEIC，高光与暗部层次完整、
>     色彩不偏；若设备不支持 HDR 或 SDK 降级，底部出现「动态范围已被压缩」提示，
>     不静默以 SDR 冒充 HDR；原图超 12M 像素时出现保真缩放提示并带上原始尺寸。
> ⚠️ 真机步骤 R71-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /
>     R68 主预览 resize 画质 / R69 行高 / R70 HDR 徽标 / 三栏三按钮 / ESC / 版本 1.0.7/7
>     全部零回归、无新增卡顿；也可在 PC 上直接跑 node tests/hdrprobe.mjs 校验容器判定。

### 七、边界

- **未升版本**（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面；
  提示浮层是**异常态条件显示**（正常态 `hpShowHintOf=false` 零提示），
  不是 R55 所禁止的常显角标；`HitTestMode.Transparent` 保持滚轮 / 拖拽 / 放大镜穿透。
- **显示模式模型与源码接线的真实边界（如实标注）**：`hpDisplayModeOf()` 已提供
  `HIGH / CONSTRAINT / STANDARD` 决策与静态断言，但既有 3 处 `dynamicRangeMode()` 仍保持
  `viewHdrWanted ? HIGH : STANDARD` 逐字不动，**本轮未替换为 `hpDisplayModeOf()` 实际调用**。
  「支持 HDR 的显示环境中稳定呈现」需要显示设备能力判定，当前由系统
  `DynamicRangeMode` 自行处理，**真机显示效果仍需用户按 R71-C 验证**。
- **静态解析 ≠ 解码产物真值**：`hdrprobe.mjs` 是容器层判定；是否真为 HDR 以应用内
  `PixelMap.getImageInfo().isHdr` 为准，二者不可互相替代。
- 零新增定时器 / 全局可变状态 / worker；既有解码缓存、并发槽位、EXIF、R68 系统 AA 精炼、
  R64 内容量统计、三栏三按钮、文本预览 scrollbar 全部零回归。
- **本轮未 push**（用户未授权；R70 及历史提交此前已在用户明确授权下同步完毕）。
- **编译校验 ≠ 真机验证**；字节样本自检 ≠ 真机 HDR 屏观感；数值模型 ≠ 系统 codec 实际行为。

---

## 第七十轮：HDR 标识 —— 仅 HDR 相片在预览区左上角叠加清晰可辨标识（2026-11-25，R70）

> 用户诉求（原文）：「请修改图片预览功能：仅当相片为 HDR 格式时，在预览图左上角叠加显示
> 清晰可辨的 HDR 标识符号；非 HDR 相片不显示该标识。标识应固定在左上角并保留适当边距，
> 在不同预览图尺寸和深浅背景下均保持清晰可读，避免遮挡主要内容，并保持原有预览功能与
> 交互不变。」

### 一、现状判读（按真实源码，不凭缓存推断）

- **HDR 真值链已存在，本轮零新增解码 / 探测 / IO**：`model/Preview.ets` 的 `decodePx()`
  用 `image.ImageSource.getImageInfo()` 读出 `ImageInfo.isHdr`（SDK @since 12，官方语义
  「源图是否为 HDR 格式」）写入 `PreviewEntry.isHdr` → `setViewMeta()` 落到
  `@State viewIsHdr` → `showPreviewOf()` 切图清零。本轮只把这条现成真值接到显示层。
- **严格用 `viewIsHdr`，绝不用 `viewHdrWanted`**：后者是
  `isHdr || isWideGamutOf(colorSpace)`，广色域 SDR 相片会被误标；它仍只服务于既有
  3 处 `dynamicRangeMode`，逐字未动。
- **层级约束**：R55 起预览区没有任何常显角标，全屏时 `(12,12)` 仍有一行
  「全屏 · Esc / F11 / 双击退出」提示。故徽标须全屏下移避让，并挂在**预览区 `Stack`
  直接子项**、与图片 `Column` 平级 ⇒ 不随图片旋转 / 缩放 / 拖拽平移移动。
- **天文自解析图（FITS / XISF）恒 `isHdr=false`**，不会被误标。

### 二、改动清单

| 文件 | 改动 |
| --- | --- |
| `common/HdrBadge.ts` | **新增** 225 行唯一真值源，**41 个导出**（24 常量 + 17 纯函数）：显隐 / 位置 / 尺寸 / 遮挡决策 + WCAG 相对亮度·alpha 合成·对比度数值模型。零 SDK / 零 IO / 零异步 / 零 throw / 零定时器 / 零 Promise / 零全局可变状态 |
| `pages/Index.ets` | 文件头主线号 `R69 → R70`、`ESC_BUILD_TAG` `R69 → R70`；`import` 徽标常量与 3 个决策函数（`hbVisibleOf` / `hbLeftOf` / `hbTopOf`）；预览区 `Stack` 内新增一个 `if (hbVisibleOf(...))` 徽标块（`9018` 起） |
| `tests/dirname.test.mjs` | `import` HdrBadge 全套导出；**33 处**历史 `ESC_BUILD_TAG` 断言由 `R69` 整批升位 `R70`；新增 R70 组 **16 条**断言与真机步骤 A~D（`8897–8904`） |
| `README.md` / 记忆文件 | 抬头 / 手册 / 步骤对照表同步，新增本章 |

徽标本身：`Row` + `Text('HDR')`（`fontSize 11` / `FontWeight.Bold` / 纯白）+
`padding(7, 3)` + 近不透明深色底板 `#db10141a` + 半透明白描边 `#66ffffff` +
`borderRadius(4)` + `.position({ x: hbLeftOf(12), y: hbTopOf(fullscreen, 12, 24, 6) })`
+ `.hitTestBehavior(HitTestMode.Transparent)`。

**逐字不变**：`decodePx` / `setViewMeta` / `showPreviewOf` / `viewIsHdr` /
`viewHdrWanted` 既有 3 处 `dynamicRangeMode`、R69 行 `padding 0.2`、R68
`viewDisplayPx`、R67 放大镜、R62 三插值四 AA 三 `autoResize`、R55 常显角标取消、
三栏三按钮、文本预览 scrollbar、ESC 两态、`new Promise` 恰 2 处 / `Promise.race` 1 处 /
无 worker、`APP_VERSION 1.0.7` / `versionCode 7`。

### 三、为什么「清晰可读 / 固定 / 不遮挡 / 交互不变」

- **深浅背景恒清晰**：徽标自带近不透明深色底板（alpha `0xdb/255 ≈ 0.86`）+ 纯白粗体 +
  半透明白描边，对比度由徽标自身决定，与底下相片内容（纯白 / 纯黑 / 任意灰）几乎无关。
  `hbBadgeContrastOf()` 用 WCAG 相对亮度 + alpha 合成逐点验证：背景灰度取
  `0 / 32 / … / 255` 九档，白字对合成底板对比度**恒 ≥ 12**（远超 AAA 7:1），
  最差在纯白背景、最好在纯黑背景。
- **固定左上角 + 全屏避让**：尺寸 / 边距全部固定 `vp` 常量，不读 `canvasW` / `canvasH` /
  `zoom` / `density`；`hbLeftOf` 恒 12vp；`hbTopOf` 普通态返回 12、全屏返回
  `12 + 24 + 6 = 42`，让开 `12 + 24 = 36` 的提示底边，净距 6vp 不重叠。
- **跨尺寸 / 跨密度一致**：`hbFixedSizeOf()` 在 `320×1×` 与 `3840×4×` 下都返回同一
  40vp 标称值（脏值回退标称值）；`hbSafeMarginOf()` 仅当短边 `< 200vp` 才收缩边距，
  常规画布一律恒 12vp。
- **不遮挡主要内容**：`hbOcclusionOf()` 核算面积占比，`320×240` 起各尺寸均 `< 2%`
  （上限 `HB_OCCLUSION_MAX = 0.02`）。
- **交互零回归**：`HitTestMode.Transparent` 让滚轮切图 / 拖拽 / 右键放大镜 / 点击全部穿透；
  徽标不进图片 `Column`、不进右下角 `BADGE` 切片，不参与任何既有布局测量。

### 四、验证用例（`tests/dirname.test.mjs` R70 组）

16 条：① HdrBadge 纯函数真值源（零 SDK/IO/await/throw/定时器/Promise/全局状态）；② 关键
参数（HDR 文字 / 12vp / 24vp / 6vp / 40×20 / 2% / AAA 7:1）；③ 配色自洽
（alpha 与 `HB_BG_ALPHA`、RGB 与 PLATE 常量逐值对应）；④ `hbVisibleOf` 严格判等
（SDR / 文本态 / 无图源恒不显示）；⑤ WCAG 相对亮度模型（L(黑)=0 / L(白)=1 /
白字对纯黑 21:1 / 合成夹界）；⑥ 深浅背景九档全域对比度 ≥ 12；⑦ 固定左上 + 全屏避让
（12,12 / 42 / 净距 6vp）；⑧ 尺寸恒定不吃画布·zoom·密度；⑨ 常规边距恒 12vp +
极小画布收缩 + 遮挡 < 2%；⑩ 显示层层级（Stack 直接子项、不随 rotate/scale/translate）；
⑪ 徽标结构（门控 / 配色 / 圆角 / 描边 / position / Transparent）；⑫ 严格不误标
（只用 `viewIsHdr`、绝不引用 `viewHdrWanted`）；⑬ HDR 真值链
（`getImageInfo().isHdr → PreviewEntry.isHdr → setViewMeta → 切图清零`，天文恒 false）；
⑭ 零回归（R69 / R68 / R67 / R62 / R55 链路全在）；⑮ 并发与版本零回归；
⑯ 构建标记 `R70` / 旧标记 `R69`·`R68` 已清 / 33 条历史断言整批升位。

### 五、验证结果（真实执行，非推断）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node tests/dirname.test.mjs` → **`ALL PASS 2179 passed, 0 failed`**（R69 基线 2163，+16 条 R70）；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 2 min 43 s 930 ms`**；`Finished :entry:default@CompileArkTS... after 1 min 57 s 340 ms`（**非 UP-TO-DATE**）；33 tasks：18 executed / 15 up-to-date；**0 ERROR / 17 WARN**（与 R69 完全一致，全为 `Index.ets` 既有 2in1 / `READ_IMAGEVIDEO` 提示）；日志 `/tmp/r70-build.log` |
| 产物核验 | 签名 HAP **1,568,303 B**（R69 1,546,333 B）/ 未签名 **1,531,337 B**（R69 1,512,303 B）/ `ets/modules.abc` **895,280 B**（R69 884,484 B）；产物 mtime **02:05** 晚于源码 **01:36–01:41**，即 HAP 由最终源码编译；字节码构建标记常量 **`R70=1 / R69=0 / 1.0.7=1`**，`R68` 字面仅剩 4 处（全为逐字未动的 R68 日志串），`HDR` 字面 3 处 |
| 版本守卫 | `APP_VERSION 1.0.7` / `versionCode 7` / `versionName 1.0.7` 逐字未动 |

> ⚠️ 收口时发现先前 `/tmp/r64-build.log` 与 `entry/build/.../*.hap` 仍是 **R69 包**
> （字节码 `R70=0 / R69=1`、mtime 00:56 早于 R70 源码），故**重新执行了 R70 真编译**
> 并复核产物标记，未用旧产物充当新包证据。
> **编译校验 ≠ 真机验证**，WCAG 对比度是数值模型、遮挡占比是面积算术，
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 R70-A~D）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:8897` R70 组）

> ⚠️ 本组是源码静态契约 + WCAG 对比度数值模型，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R70-A：装新包后 Ctrl+D 角标必须是 R70；打开 HDR 相片，预览区左上角出现清晰「HDR」
>     白字深色圆角标识；普通 SDR 相片 / FITS·XISF / 文本预览一律不显示该标识。
> ⚠️ 真机步骤 R70-B：纯白 / 纯黑 / 高反差深浅底图各一张，标识边缘与文字均清晰可辨、无糊边、
>     不被相片明暗吞没；放大 / 缩小 / 拖拽平移 / 旋转时标识恒固定左上角，不随图片移动。
> ⚠️ 真机步骤 R70-C：窗口 resize 到最小与全屏，普通态边距 12vp、全屏态下移一行避开退出提示，
>     两枚浮层不重叠；标识面积很小不遮挡相片主体；滚轮切图 / 右键放大镜 / 拖拽 / 点击全部照常。
> ⚠️ 真机步骤 R70-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /
>     R68 主预览 resize 画质 / R69 行高 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。

### 七、边界

- 未升版本（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面；
  徽标是**条件显示**（仅 HDR 相片），不是 R55 所禁止的常显角标；
- 零新增解码 / 探测 / 读字节 / SDK 调用 / 异步 / 定时器 / 全局可变状态；
- 右侧预览、顶栏、状态栏、左栏三栏、文本预览、放大镜、R68 主预览 AA 精炼、
  R64 内容量统计等全部零回归；
- **本轮未 push**（R63 `0b3416f` 起各轮均未推送，用户未授权）。

---

## 第六十九轮：左栏档案名行上下留白各减 0.8mm —— 总行高减 1.6mm，其余逐字不变（2026-11-25，R69）

> 用户诉求（原文）：「仅针对左侧档案列表中的每个档案名行，将上、下留白各减少 0.8mm，
> 使该行行高相应缩减（总行高减少 1.6mm）。保持档案名文字、字号、对齐方式及其他未涉及
> 区域和间距不变，确保文字不被截断、相邻行不重叠，列表整体显示正常。」

### 一、先判读「mm」在本工程里的口径（按真实源码，不凭缓存推断）

ArkUI 只有 `vp` / `px`，**没有 mm 单位**。本工程从第十三轮起就把用户口中的「1mm 一线缝」
落成 1vp（README「关于 1mm」：`List space = 1vp` + 行上下 padding 各 `1vp`），
`ArchiveRow.ets` 头部注释亦写「继续压缩到约 1mm 取 1vp」。本轮沿用同一口径：
**0.8mm ↔ 0.8vp、1.6mm ↔ 1.6vp**。

> 若按 160dpi 物理换算 1mm ≈ 6.3vp，则 0.8mm ≈ 5vp 已**超过现有 1vp 留白**，
> 势必要改 `.height(26)` 内容载体才能凑出 1.6mm，与「仅针对上下留白 / 其他区域不变」
> 直接冲突；且用户给的 1.6mm 恰为两个 0.8mm 之和，正好等于两处 padding 缩减量之和。
> 故 1:1 口径是唯一自洽解。

现状（R68）：`Row` 自身不设 height，由符号列 `Text` 的 `.height(26)` 撑起内容高，
行 `.padding({ right: 6, top: 1, bottom: 1 })` → 整行 `26 + 1 + 1 = **28vp**`。
只把 top/bottom 各 `1 → 0.2`（各 −0.8vp），即得 `26 + 0.2 + 0.2 = **26.4vp**`
（−1.6vp = −1.6mm），**恰好由留白单独承担**，文字载体一字不动。

### 二、改动清单（只此一处数值）

| 文件 | 改动 |
| --- | --- |
| `components/ArchiveRow.ets` | `.padding({ right: 6, top: 1, bottom: 1 })` → `.padding({ right: 6, top: 0.2, bottom: 0.2 })`；补 mm↔vp 口径与不变项注释 |
| `pages/Index.ets` | `ESC_BUILD_TAG` `R68` → `R69`（`Ctrl+D` 才显示的诊断角标）、文件头主线号 |
| `tests/dirname.test.mjs` | 32 处构建标记断言 + 6 处 padding 锚点整批升位；新增 R69 组 10 条断言与真机步骤 A~D |
| `README.md` / 记忆文件 | 抬头 / 手册 / 步骤对照表同步，新增本章 |

**逐字不变**：`.height(26)`、名称 `.fontSize(12)` / 三栏 `.fontSize(10)`、
`TextAlign.Center` / 三处 `TextAlign.End`、`.width(66)` / `.width(88)` /
`.margin({ left: 6 })` / `.layoutWeight(1)` / `constraintSize(minWidth)` /
`.maxLines(1)` ×4 / `TextOverflow.Ellipsis`、`.width('100%')`、right padding 6、
`borderRadius(3)`、梅花间竹三色、`LIST_ROW_GAP_VP = 1`、`List space`、
`SidebarView` 抬头 / 工具条 / 列表四处 padding、hover 浮层 `.padding(8)` / `.height(165)`、
hover / onMouse / 点击 / 双击 / bindPopup 全链路。

### 三、为什么不会截断、不会重叠

- 内容高恒为 26vp，名称字号 12vp → 上下各约 7vp 余量；`maxLines(1)` + `Ellipsis` +
  `minWidth` 兜底逐字未动 ⇒ 文字不被裁切，长名仍按既有规则省略；
- 留白仍是**正值** `0.2vp > 0`，且 `List space` 仍 1vp ⇒ 相邻两行间至少 1.4vp 缝，
  不会贴合 / 重叠；条纹底色与选中高亮仍覆盖整行；
- 只改垂直留白，水平方向零改动 ⇒ 三栏起始位置、列宽、右对齐、名称贴左全都不变。

### 四、验证用例（`tests/dirname.test.mjs` R69 组）

10 条：① mm↔vp 口径与行高算术（0.2 / 28 / 26.4 / −1.6）；② padding 精确值 + 旧值已清 +
left 清零；③ 文字载体 / 字号；④ 对齐 / 截断护栏；⑤ 三栏宽度 / List space / 其它区域 padding；
⑥ 不重叠（正值、无负 padding、无新增垂直 margin）；⑦ 文字余量 14vp；
⑧ 交互与其它区域零回归；⑨ 构建标记 / 版本守卫；⑩ R68 / R67 / R64 链路零回归。
另 **32 处**历史 `ESC_BUILD_TAG` 断言由 `R68` 整批升位 `R69`，
**6 处** `top: 1, bottom: 1` 锚点整批升位 `top: 0.2, bottom: 0.2`。

### 五、验证结果（真实执行，非推断）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node --experimental-strip-types tests/dirname.test.mjs` → **`ALL PASS 2163 passed, 0 failed`**（R68 基线 2153，+10 条 R69）；`git diff --check` 通过 |
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**）→ **`BUILD SUCCESSFUL in 17 s 372 ms`**；`Finished :entry:default@CompileArkTS... after 10 s 364 ms`（**非 UP-TO-DATE**）；33 tasks：18 executed / 15 up-to-date；**0 ERROR / 17 WARN**（与 R68 完全一致，全为 `Index.ets` 既有 2in1 / `READ_IMAGEVIDEO` 提示）；日志 `/tmp/r69-build.log` |
| 产物核验 | 签名 HAP **1,546,333 B**（R68 1,546,339 B）/ 未签名 **1,512,303 B**（R68 1,512,292 B）/ `ets/modules.abc` **884,484 B**（R68 884,476 B）；产物 mtime **00:56** 晚于源码 **00:52–00:56**，即 HAP 由最终源码编译；字节码构建标记常量 **`R69`**、`1.0.7=1`，`R68` 字面仅剩 4 处（全为逐字未动的 R68 日志串） |
| 版本守卫 | `APP_VERSION 1.0.7` / `versionCode 7` / `versionName 1.0.7` 逐字未动 |

> ⚠️ `0.2vp` 是极小正值：ArkTS 编译已接受小数 padding，但**不同设备对 <1vp 的取整行为
> 需真机确认**；即便被取整为 0，也只是「留白收尽」，不影响文字载体与行间距，不会截断或重叠。
> **编译校验 ≠ 真机验证**，真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见 R69-A~D）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:8738` R69 组）

> ⚠️ 本组是源码静态契约 + 行高算术，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R69-A：装新包后 Ctrl+D 角标必须是 R69；左栏每个档案名行上下留白明显收紧，
>     整体行距更紧凑（每行约 26.4vp），档案名完整显示不截断、不出现上下裁字。
> ⚠️ 真机步骤 R69-B：滚动几百行、切换目录、hover 缩略图、点击 / 双击、Ctrl+B 收起左栏，
>     相邻行不重叠、不出现空白错位 / 跳动 / 条纹断裂，选中高亮仍完整覆盖整行。
> ⚠️ 真机步骤 R69-C：三栏（名称 / 字节 / 日期）起始位置、字号、右对齐、梅花间竹条纹、
>     目录内容量四态均与 R68 逐字一致；除行高外没有任何视觉变化。
> ⚠️ 真机步骤 R69-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /
>     R68 主预览 resize 画质 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。

### 七、边界

- 未升版本（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面、未加常显控件；
- 只动左栏档案名行的垂直留白，右侧预览、顶栏、状态栏、文本预览、放大镜、
  R68 主预览 AA 精炼、R64 内容量统计等全部零回归；
- **本轮未 push**（R63 `0b3416f` 起各轮均未推送，用户未授权）。

---

## 第六十八轮：右边预览图优化 / resize 最高质素 —— 系统 native AA 精炼 + 内容自适应档 + 跨密度一致（2026-11-25，R68）

> 用户诉求（原文）：「右边预览图优化，resize要保持最高质素」。
> 承接 R62（主预览 resize 动态插值 + PixelMap 边缘 AA）与 R67（放大镜系统 native AA），
> 把同样是系统级的抗锯齿重采样下沉到**右侧主预览**，并让不同倍率 / 窗口尺寸 / 屏幕密度下
> 画质稳定一致，不引入卡顿、延迟或过度资源占用。

### 一、现状判读（按真实源码，不凭缓存推断）

| 层 | R62 既有基线 | 本轮新增 |
| --- | --- | --- |
| 重采样位置 | ArkUI **组件级** `.interpolation()` / `.antialiased()`，每帧由 UI 合成层 GPU 采样 | `image.PixelMap.createScaledPixelMap()` **系统 native 级**一次重采样，产物跨帧复用 |
| 画质档 | `rqInterpolationOf` 三档（High=Cubic / Low=双线性 / Medium=MipMap）+ 全源边缘 AA | `vqAaLevelOf` 按缩放场景 × 内容种类选 `AntiAliasingLevel`（LOW/MEDIUM/HIGH） |
| 像素来源 | `displayEdge()` 按画布 × zoom 重解码，`desiredSize` 只能降采样 | 在已超采样解码的 `viewPixelMap` 上再做一次高密度 AA 精炼（可升采样） |
| 跨帧稳定性 | 倍率 / 相位每帧变，边缘相位随之抖 | 精炼倍率只由内容种类定、**不吃 zoom**；64px 稳定阈值内不重算 |

R67 已在放大镜链路核实 SDK 26 的声明：`@ohos.multimedia.image.d.ts` L2495
`AntiAliasingLevel` NONE=0 / LOW=1 / MEDIUM=2 / HIGH=3，L5302
`createScaledPixelMap(x, y, level?)` **since 18**（x/y 官方语义为 scale factor）。
「编译有声明」≠「运行时一定有」：本轮**直接复用** R67 的 `loupeCapabilityOf(px)` 懒探测结果
（`typeof px.createScaledPixelMap === 'function'`），不另造探针；能力不足即逐字回退 R62。

### 二、关键参数设定（唯一真值源 `common/ViewQuality.ts`）

| 组 | 参数 | 取值 / 语义 |
| --- | --- | --- |
| 缩放场景 | `VQ_SCENE_SHRINK_DEEP / SHRINK / ONE / ENLARGE / ENLARGE_HIGH` | `0/1/2/3/4`；k<0.4 / 0.4≤k<0.94 / \|k−1\|≤0.06 / 1.06≤k≤2 / k>2 |
| 内容种类 | `VQ_KIND_IMAGE / GRAPHIC / TEXT` | `0/1/2`；文字类含中文「扫描 / 截图 / 报表」与 `.txt/.pdf`，图表类含 `.svg` |
| 能力档 | `VQ_CAP_COMPONENT / SYSTEM_AA` | `0/1`；门槛 `since 18`，运行时函数存在性双判据 |
| 系统 AA 档 | `VQ_AA_LOW / MEDIUM / HIGH` | `1/2/3`，与 SDK 枚举**逐值对应**；脏值落 LOW，**绝不落 NONE**（锯齿之源） |
| 档位阈值 | 1:1 容差 `0.06` / mipmap 门槛 `0.4` / 高倍门槛 `2` | `vqSceneOf` 脏值保守按 1:1 处理，绝不劣化 R62 基线 |
| 精炼倍率 | 影像 `1.5` / 文字·图形 `1.25` | **只认内容种类，不吃 zoom** ⇒ resize 抖动时产物密度恒定、跨帧稳定 |
| 资源护栏 | 总像素 `4M` / 倍率 `3.0` / 长边 `8192` | 与 R67 `LQ_*` **逐项对齐**（静态契约逐值断言），`ceil` 上浮后二次复核 |
| 稳定 / 增益 | 重算阈值 `64px` / 最小真实增益 `96px` | 微动不重算、补不出像素就不分配 |
| 屏幕密度 | `[0.5, 4.0]` / 参考 1.0 / 脏值回退 1.0 | **只进像素预算，不进画质档** ⇒ 不同 DPI 同一倍率恒同档 |

`vqSafeFactorOf(w, h, want, maxPixels, maxEdge)` 先按 `sqrt(mp/(w·h))` 与 `me/max(w,h)`
取小并夹到 3×，再以 0.98 逐档收缩复核 `ceil(w·f)·ceil(h·f)` 是否越界（最多 64 次），
最终仍放不下就返回哨兵 `1` ⇒ 页面侧跳过系统级精炼、留在 R62 组件级链。

### 三、为什么缩小 / 高倍文字必须走 MEDIUM（数值证据，不是拍脑袋）

Cubic 的 Catmull-Rom 核在 `1<|x|<2` 有**负 lobe**：`vqCubicWeightOf(1.5) = -0.0625`；
双线性 tent 核恒非负。R68 组用一维细线信号 `THIN68`、曲线信号 `CURVE68`、阶跃 `STEP68`
在 0.25 / 0.4 / 0.5 / 0.67 / 0.73 / 0.93 各缩小档与 1.07 / 1.37 / 2 / 3 / 4 放大档逐点重算：

- 缩小各档：mipmap 预滤波的**过冲恒为 0**，Cubic 在 0.73 细线上 > 0；曲线抖动 mip ≤ Cubic；
- 放大影像：`vqAaLevelOf` = HIGH(Cubic)，选档重采样与恒 Cubic **逐点全等**（细节零回归）；
- 高倍（k=3）文字 / 图形：mip 过冲 0 且抖动低于 Cubic ⇒ 改 MEDIUM 抑制振铃光晕与毛边；
  影像仍 HIGH 保细节。

故 `vqAaLevelOf` 定档：能力不足 → LOW 哨兵；缩小 / 极端缩小 → MEDIUM；1:1 → LOW；
高倍文字·图形 → MEDIUM；其余放大 → HIGH。

### 四、实现（三层分工，与 R62 / R65 / R66 / R67 完全一致）

1. **`common/ViewQuality.ts`（新增，纯函数真值源）**：零 SDK / 零 IO / 零 `await` /
   零 `throw` / 零定时器 / 零 `Promise` / 零全局可变状态。决策函数（场景 / 内容 / 能力 /
   AA 档 / 是否启用 / 精炼倍率 / 有效倍率 / 跨密度一致档 / 护栏 / 稳定 / 增益）供运行时调用；
   核 / 重采样 / 过冲 / 边缘抖动四个数值模型只用于回归用例。
2. **`model/Preview.ets`（唯一碰该 SDK 的入口，R67 代码逐字未动）**：
   `vqSdkAaLevelOf()` 把 `VQ_AA_*` 映射成 `image.AntiAliasingLevel`；
   `viewSystemScaledPx(src, want, aa, cap)` → `await src.getImageInfo()` 拿真实宽高 →
   `vqSafeFactorOf` 夹预算 → `vqScaleAllowedOf` 复核 →
   `await src.createScaledPixelMap(factor, factor, level)`；能力不足 / 尺寸脏值 /
   预算放不下 / SDK 抛错一律返回 `undefined`，**全异步、零新增 `Promise` 构造、零同步 IO**。
3. **`pages/Index.ets`（接线，不动既有交互）**：
   - 新增 `@State viewSysPx` + `viewSysUri / viewSysEdge / viewSysToken / viewCap / viewCapProbed`；
   - `viewSysAa(uri)` 本帧决策；`viewDisplayPx(uri)` 统一图源出口（系统产物优先 + `uri` 对账，
     `@Builder` 内只读选择、不触发解码）；
   - `ensureViewSysPx(uri, px, token)` 是 `loadViewNow` 成功落点、切图 / resize / 全屏 /
     档位升级的共同入口：懒探测一次能力 → `vqSystemWantedOf` / `vqScaleAllowedOf` /
     `vqHasGainOf` / `vqShouldRebuildOf` 四道闸 → 起一次系统精炼；
     `sysToken` + `curToken` 双对账作废迟到结果并 `release()`；失败静默 `clearViewSysPx()`
     回退 R62；
   - 触发链：`loadViewNow` → `ensureViewSysPx(uri, best.px, token)`；`showPreviewOf` 切图
     即刻 `clearViewSysPx()`（杜绝上一张错画）；`aboutToDisappear` 退出释放；
   - **显示层只把 `Image(this.viewPixelMap!)` 换成 `Image(this.viewDisplayPx(uri))`**：
     三处 `.interpolation(this.previewInterpolation())`、四处
     `.antialiased(this.previewAntialias())`、三处 `.autoResize(false)` 逐字未动，
     R62 三档与 R67 放大镜五图源 / 5 处 interpolation / 5 处 antialiased 全部零回归。

**回退链**：`cap=0`（低版本 ROM / 方法缺失）→ 完全走 R62 组件级三档 → 再退既有兜底源；
`getImageInfo FAIL` / `createScaledPixelMap FAIL` / 预算不足同样不空白、不花屏、不崩溃。
HiLog：`view R68 cap=.. scene=.. aa=.. tier=.. factor=..`。

### 五、验证用例（`tests/dirname.test.mjs` R68 组）

- ① 关键参数常量语义、与 R67 `LQ_*` 护栏逐项对齐、密度与模式码；
- ② 有限数 / 密度钳界 / 五档场景分界与脏值兜底 / 内容种类（含中文）/ 跨密度同档；
- ③ AA 档决策：缩小 MEDIUM、1:1 LOW、影像放大 HIGH、高倍文字·图形 MEDIUM、
  能力不足 LOW 哨兵、`vqSystemWantedOf` 四拒绝、精炼倍率不吃 zoom；
- ④ 护栏：`vqSafeFactorOf` 4M 夹界（1000² 的 3× 夹到 2.048）、超大源返回 1、
  `vqScaleAllowedOf` 四重拒绝、64px 稳定阈值与 96px 增益；
- ⑤ 一维边缘信号数值模型（Cubic 负 lobe、缩小 / 高倍 mip 优于 Cubic、放大影像逐点一致）；
- ⑥ 源码静态契约：真值源纯净 / SDK 独立出口 / 接线 / 触发链 / 显示层 / 零回归；
- ⑦ 构建标记迁移：**31 条**历史 `ESC_BUILD_TAG` 断言由 `R67` 整批升位到 `R68`
  （`R67` 旧构建标记定义被显式断言为不存在）。

### 六、验证结果（真实执行，非推断）

| 项 | 结果 |
| --- | --- |
| 静态契约 | `node --experimental-strip-types tests/dirname.test.mjs` → **`ALL PASS 2153 passed, 0 failed`**（R67 基线 2126，R68 新增 **27 条**；另 31 条历史构建标记断言升位，不改变断言条数）；`git diff --check` 通过 |
| 真实 ArkTS 编译 | 严格回到 `hvigorw assembleHap --no-daemon`（**未跑 `build.sh`**，纠正 R66/R67 过程偏差）→ **`BUILD SUCCESSFUL in 1 min 18 s 892 ms`**；`Finished :entry:default@CompileArkTS... after 43 s 395 ms`（**非 UP-TO-DATE**）；33 tasks：18 executed / 15 up-to-date；**0 ERROR / 17 WARN**（全部为 `Index.ets` 既有全屏 `setWindowSystemBarEnable` 系 2in1 提示与 `READ_IMAGEVIDEO` 权限提示，R68 新增的 `ViewQuality.ts` / `Preview.ets` 缩放函数零 WARN）。日志 `/tmp/r68-build.log` |
| 产物核验 | 签名 HAP **1,546,339 B**（R67 1,507,725 B）/ 未签名 **1,512,292 B**（R67 1,469,337 B）/ `ets/modules.abc` **884,476 B**（R67 861,652 B）；产物 mtime **00:17** 晚于全部源码 **00:03–00:15**，即 HAP 由最终源码编译；从签名 HAP 解出的字节码检出 **`R68=5`**、**`1.0.7=1`**、构建标记常量已为 `R68`，`view R68` / `ViewQuality` / `viewSystemScaledPx` / `vqAaLevelOf` 进包（`R67` 字面仅剩 4 处，全部来自逐字未动的 R67 放大镜日志串） |
| 版本守卫 | `APP_VERSION 1.0.7` / `versionCode 7` / `versionName 1.0.7` 逐字未动 |

> **编译校验 ≠ 真机验证**；静态契约 + 一维边缘信号数值模型也 **≠** 真机像素验证。
> 真机 DevEco 安装、`hdc` / `hilog` 侧验证由使用者完成（见下节 R68-A~D）。

### 七、真机步骤（逐字取自 `tests/dirname.test.mjs:8658` R68 组）

> ⚠️ 本组是静态契约 + 一维边缘信号数值模型，不替代真机验证；编译校验 ≠ 真机验证。
> ⚠️ 真机步骤 R68-A：装新包后 Ctrl+D 角标必须是 R68；打开含细线（栅栏 / 电线 / 文字边缘）
>     与曲线（圆弧 / 轮廓）的图，在 100% / 缩小 / 放大各档观察边缘：平滑、无波纹、无锯齿毛边。
> ⚠️ 真机步骤 R68-B：拖窗口 resize / 进出全屏 / Ctrl+滚轮到 137% / 73% / 67% / 200% 各档，
>     画质稳定一致，不出现「换倍率/换窗口就忽糊忽锐」，细线不被抹宽，整体不过度模糊。
> ⚠️ 真机步骤 R68-C：hilog 出现 view R68 cap=1 scene=.. aa=.. 表示系统 native AA 精炼生效；
>     cap=0 / getImageInfo FAIL / createScaledPixelMap FAIL 时自动回退 R62 组件级链，预览仍可用。
> ⚠️ 真机步骤 R68-D：HEIC/JPG/PNG / FITS·XISF / 文本预览 scrollbar / 并排右页 / 放大镜 /
>     R64 内容量统计 / R66 主线程让出 / 三栏三按钮 / ESC / 版本 1.0.7/7 全部零回归、无新增卡顿。

### 八、边界

- 系统级 AA 精炼是图像管线的一次重采样，**不是**凭空恢复不存在的原始细节；
  小图 / 低分辨率原图仍受信息量限制，本轮只保证边缘平滑与跨帧稳定。
- 精炼产物是「某张图某个倍率档下的临时重采样结果」，**刻意不进 `previews` LRU**；
  由 `viewSysToken` + `clearViewSysPx()` 精确释放，不污染解码档位复用判据。
- 未引入 Canvas 绘制层 / 工作线程 / 定时器 / 常显控件；`createScaledPixelMap` 能力探测
  复用 R67 `loupeCapabilityOf`，未新增 SDK 探针；R67 放大镜代码逐字未改。
- 界面零新增常显控件：三栏、行高、hover 缩略图、点击 / 双击、文本 scrollbar、并排 /
  全屏 / 放大镜、R64 内容量统计、R66 让出、ESC 两态、三按钮全部零回归。
- 未升版本（`1.0.7 / versionCode 7`）、未跑 `build.sh`、未把 HAP 放桌面；
  **本轮未 push**（R63 `0b3416f` 起各轮均未推送，用户未授权）。

---

## 第六十七轮：放大镜高质量显示 —— 系统 native 抗锯齿缩放 + 能力分级 + 跨密度一致档（2026-11-24，R67）

> 用户诉求：优化放大镜圆内的显示质量 —— ① 文字 / 图形 / 影像都要清晰；
> ② 边缘平滑、无锯齿毛边；③ 不同放大倍率、不同屏幕密度下表现稳定一致；
> ④ 不卡顿、不延迟、不过度占用资源；**可用且相容时**再用系统级渲染优化 / 硬件加速能力。

### 一、先判读现状与 SDK 26 真实声明（按源码判读，不凭缓存推断）

| 层 | R14–R17 既有基线 | 本轮新增 |
| --- | --- | --- |
| 画质档 | ArkUI **组件级** `.interpolation(High/Low)` + `.antialiased(true)`，只有 High / Low 二值 | 系统 **native 级** `createScaledPixelMap(x, y, AntiAliasingLevel)`，四档可选 |
| 重采样时机 | 每帧由 UI 合成层 GPU 采样；鼠标在圆内高频微动即反复重采样 | 只在**倍率档变化**时做一次，产物跨帧稳定一致 |
| 像素来源 | `loupeHiPx` 按真实像素需求重解码（`desiredSize` 只能降采样） | 同一张高清源再经一次系统 AA 缩放，**可以升采样**，补出小图 / 高倍段缺的真实像素 |
| 失败路径 | 五个图源分支兜底 | 能力不足 / 预算不足 / SDK 抛错 → **逐字回退 R17 链**，零回归 |

SDK 26 声明核实（`sdk/default/openharmony/ets/api`）：

- `@ohos.multimedia.image.d.ts` L2495 `enum AntiAliasingLevel`：`NONE=0`（最近邻）/ `LOW=1`（双线性）/
  `MEDIUM=2`（双线性 + mipmap linear，官方建议缩小用）/ `HIGH=3`（Cubic，放大最高质量档）。
- 同文件 L5302 `createScaledPixelMap(x, y, level?): Promise<PixelMap>` **since 18**；
  L6013 `createCroppedAndScaledPixelMap(region, x, y, level?): Promise<PixelMap>` **since 22**。
- `@ohos.graphics.drawing.d.ts` L1519 `enum FilterMode`：`FILTER_MODE_NEAREST=0` / `FILTER_MODE_LINEAR=1`（since 20）。

⚠️ 「编译 SDK 26 有声明」≠「运行时一定有」：低版本 ROM 上方法不存在。故能力分级是
**API 等级 + 运行时函数存在性双判据**，任一不满足即回退组件级，绝不因新 API 让放大镜空白。

### 二、关键参数设定（唯一真值源 `common/LoupeQuality.ts`）

| 组 | 参数 | 取值 / 语义 |
| --- | --- | --- |
| 能力档 | `LQ_CAP_COMPONENT / SYSTEM_AA / HW_CROP` | `0 / 1 / 2`；门槛 `since 18 / since 22`，探测基准 SDK 26 |
| 内容种类 | `LQ_KIND_IMAGE / GRAPHIC / TEXT` | `0 / 1 / 2`；按后缀 + 文件名关键字粗分（含中文「扫描 / 截图 / 报表 / 图形 / 图表」），未知一律影像 |
| AA 档 | `LQ_AA_NONE / LOW / MEDIUM / HIGH` | `0 / 1 / 2 / 3`，与 SDK 枚举**逐值对应**，不另造语义 |
| 组件插值 | `LQ_IP_LOW / MEDIUM / HIGH` | `0 / 1 / 2`，与 R62 `RQ_*` 同序 |
| 硬件采样 | `LQ_FILTER_NEAREST / LINEAR` | `0 / 1`，只有 1:1 才允许 NEAREST |
| 密度 | `[0.5, 4.0]` / 参考 1.0 / 回退 1.0 | 密度**只进像素预算，绝不进画质档** ⇒ 跨 DPI 一致 |
| 护栏 | 总像素 `4M` / 倍率 `3.0` / 长边 `8192` | 与 R66 `AI_MAX_TARGET_PIXELS` 同量级；`ceil` 上浮后逐档收缩复核 |
| 稳定 | 重算阈值 `64px` / 最小真实增益 `96px` | 鼠标微动不重算、补不出像素就不分配 |

**跨密度一致的唯一判据**：`lqLogicalScaleOf(LOUPE_ZOOM, zoom)` 刻意不含密度，
`lqConsistentTierOf(logical, density)` 的密度参数不参与计算（只保留在签名里供验证
「传不同密度结果相同」）。同一倍率在 0.5 / 1 / 2 / 3 / 4 密度下恒落同一档、同一视觉。

### 三、为什么高倍文字 / 图形必须改走 MEDIUM（数值证据，不是拍脑袋）

Cubic 的 Catmull-Rom 核在 `1<|x|<2` 有**负 lobe**：`lqCubicWeightOf(1.5) = -0.0625`；
双线性 tent 核恒非负。对阶跃边缘 `[0×4, 255×4, 0×4]` 放大 3 倍：

| 模式 | 边缘抖动 `lqEdgeJitterOf` | 过冲 `lqOvershootOf` |
| --- | --- | --- |
| NEAREST | 1020（阶梯最重） | 0 |
| LINEAR | 340 | 0 |
| CUBIC | 491.1111 | **113.3333**（负 lobe 振铃 / 光晕） |
| MIPMAP | **170**（最低） | 0 |

故 `lqAaLevelOf` 定为：≤1:1 → LOW；温和放大 → HIGH(Cubic)；**>2 高倍的文字 / 图形 →
MEDIUM(mipmap linear)** 抑制振铃与毛边，影像仍 HIGH 保细节；脏值一律 LOW 安全兜底，
绝不落到 NONE（最近邻，锯齿之源）。

### 四、实现（三层分工，与 R62 / R65 / R66 的分层完全一致）

1. **`common/LoupeQuality.ts`（新增，纯函数真值源）**：零 SDK / 零 IO / 零 `await` /
   零 `throw` / 零定时器 / 零全局可变状态。决策函数（能力 / 密度 / 逻辑与有效倍率 /
   一致档 / 内容种类 / AA 档 / 插值 / 硬件采样 / 倍率 / 目标边 / 资源护栏 / 稳定阈值 /
   真实增益）供运行时调用；核 / 重采样 / 边缘抖动 / 过冲四个数值模型只用于回归用例。
2. **`model/Preview.ets`（全工程唯一碰该 SDK 的地方）**：
   `loupeCapabilityOf(px)` 只读 `typeof px.createScaledPixelMap === 'function'` 与 crop 版存在性，
   交 `lqCapabilityOf` 收敛成能力档；`lqSdkAaLevelOf` 把 `LQ_AA_*` 映射成
   `image.AntiAliasingLevel`；`loupeSystemScaledPx()` `await src.getImageInfo()` 拿真实宽高 →
   `lqSafeFactorOf` 夹预算 → `lqScaleAllowedOf` 复核 → `await src.createScaledPixelMap(factor,
   factor, level)`；能力不足 / 尺寸脏值 / 预算放不下 / SDK 抛错一律返回 `undefined`。
   **全异步、零新增 `Promise` 构造、零同步 IO**。
3. **`pages/Index.ets`（接线，不动既有交互）**：
   - `interface LoupeScalePlan` + `loupeSystemPlan(uri)` 一次算出本帧全部决策；
     `target = lqTargetEdgeOf(画布长边, effective, 0, LQ_MAX_EDGE)` —— `srcLong` 传 0 是因为
     系统级缩放**可以升采样**，不受 `decodePx.desiredSize` 限制；`want` 取「目标边 / R17 实际
     解码边」的缺口，经 `lqFactorOf` 按内容种类收敛。
   - `loupeSysRebuildWanted()` 双闸门：`lqShouldRebuildOf`（微动不重算）+ `lqHasGainOf`
     （补不出真实像素就不分配）。
   - `ensureLoupeHiRes()` 的解码回调里懒探测一次能力 → 起一次系统缩放；
     `loupeSysToken` 作废迟到结果并 `release()`，失败静默 `clearLoupeSysPx()` 回退 R17。
   - `loupeDisplayPx(uri, pane)` 统一图源出口：系统级产物优先、`uri/pane` 双重对账，
     切图换页绝不把上一张错画到新图上；`clearLoupeHiRes()` 同步释放系统级产物。
   - `loupeLayer()` **只把第一个分支的图源换成 `loupeDisplayPx(uri, pane)`**：
     五个图源分支、`.interpolation(this.loupeInterpolation())` ×5、`.antialiased()` ×5、
     整像素尺寸 / 偏移、圆裁剪、命中模式全部逐字不变。

**回退链**：`cap=0`（低版本 ROM / 方法缺失）→ 完全走 R17 组件级链 → 再退四个既有兜底源；
解码失败 / 系统缩放失败同样不空白、不花屏、不崩溃。

### 五、验证用例（`tests/dirname.test.mjs` R67 组）

- ① 关键参数：SDK 枚举逐值对应 / 相容门槛 / 4M·3×·8192·64·96 护栏；
- ② 密度归一化、逻辑倍率不含密度、跨 DPI 同档（0.5/1/2/3/4 密度全等）；
- ③ 内容种类 / AA 档 / 组件插值 / 硬件采样 / 能力分级双判据；
- ④ 倍率、目标边、`lqScaleAllowedOf` 四重拒绝、`lqSafeFactorOf` 预算夹界、稳定阈值与增益；
- ⑤ 一维边缘信号数值模型（Cubic 负 lobe、抖动 / 过冲排序、mipmap 抑制振铃）；
- ⑥ 源码静态契约：真值源纯净 / SDK 唯一出口 / 接线 / 显示层 / 零回归；
- ⑦ 构建标记迁移：历史 29 条 `ESC_BUILD_TAG` 断言由 `R66` 升到 `R67`，
  `R66 / R65` 旧标记定义仍被显式断言为不存在。

### 六、改动范围

| 文件 | 改动 |
| --- | --- |
| `entry/src/main/ets/common/LoupeQuality.ts` | **新增** 纯函数真值源（决策 + 数值模型） |
| `entry/src/main/ets/model/Preview.ets` | 新增能力探测 / AA 档映射 / 系统级 AA 缩放函数 |
| `entry/src/main/ets/pages/Index.ets` | import / 计划接口 / 状态 / 决策与释放 / 图源出口 / 构建标记 `R67` |
| `tests/dirname.test.mjs` | 新增 R67 组 + 29 条历史构建标记迁移 |
| `README.md` | 本章 |

未升版本（`1.0.7 / versionCode 7`）、未加任何常显控件、未改三按钮 / 三栏 / 四态统计 /
文本 scrollbar / 并排 / 全屏 / ESC / R64 / R65 / R66 行为。

### 七、验证结果（三类证据严格分开）

- **静态契约 + 构造数值回归**：`node --experimental-strip-types tests/dirname.test.mjs`
  → `ALL PASS  2126 passed, 0 failed`（R66 基线 2097，R67 新增 **29 条**；
  另有 29 条历史构建标记断言整批由 `R66` 升位到 `R67`，不改变断言条数）。
- **真实 ArkTS 编译**：`./build.sh`（`hvigorw assembleHap --no-daemon`）→
  **`BUILD SUCCESSFUL in 1 min 37 s 248 ms`**，`Finished :entry:default@CompileArkTS... after
  1 min 6 s 643 ms`（**CompileArkTS 非 UP-TO-DATE**）；**0 ERROR / 9 WARN**，全部是
  `Index.ets` 既有的 `READ_IMAGEVIDEO` 权限提示与 2in1 不支持 API 提示，
  R67 新增的 `LoupeQuality.ts` / `Preview.ets` 缩放函数零 WARN。
- **产物核验**：签名 HAP **1,507,725 B**、未签名 **1,469,337 B**、
  `ets/modules.abc` **861,652 B**；从签名 HAP 解出的字节码检出
  **`R67=5 / R66=0`**，且 `lqAaLevelOf` / `loupeSystemScaledPx` /
  `createScaledPixelMap` / `loupeDisplayPx` / `LoupeQuality` 全部进入产物。
- **静态契约复核**：编译后重跑 `node --experimental-strip-types tests/dirname.test.mjs`
  → **`ALL PASS  2126 passed, 0 failed`**；`git diff --check` 通过。
- **真机验证**：本机无 `hdc` / 真机环境，**未做**；编译校验 ≠ 真机验证，步骤见第八节。

### 八、真机步骤（逐字取自 `tests/dirname.test.mjs` R67 组）

- **R67-A**：装新包后 `Ctrl+D` 角标必须是 `R67`；右键开放大镜，在文字截图 / 线条图表 /
  照片上分别移动光标，圆内笔画与曲线边缘平滑、无锯齿毛边 / 无光晕。
- **R67-B**：同一张图在 100% / 200% / 400% 与不同缩放密度下对比，档位由逻辑倍率决定，
  不应出现「换倍率 / 换屏幕就忽糊忽锐」；鼠标在圆内小幅抖动应不重新计算、不卡顿。
- **R67-C**：`hilog` 出现 `loupe R67 cap=1|2` 表示系统 native AA 生效；`cap=0` 或
  `createScaledPixelMap FAIL` 时自动回退 R17 组件级链，放大镜仍可用、不空白、不崩溃。
- **R67-D**：既有 HEIC/JPG/PNG / 文本预览 scrollbar / 并排 / 全屏 / ESC / R64 内容量统计 /
  R65 天文解析 / R66 主线程让出 / 三栏三按钮 / 版本 `1.0.7/7` 全部零回归。

### 九、边界

- `createScaledPixelMap` 的「高质量」是系统图像管线的一次重采样，**不是**凭空恢复不存在的
  原始细节；小图 / 低分辨率原图仍受信息量限制，本轮只保证放大后的边缘平滑与跨帧稳定。
- `LQ_CAP_HW_CROP`（since 22 的裁剪+缩放一次成型）本轮只做能力探测与档位记录，
  未改 `loupeLayer()` 的几何 / 偏移链；`drawing.SamplingOptions` 的 `FilterMode` 同理只落在
  画质决策与诊断日志里，未引入新的 Canvas 绘制层。两者都是为避免改动既有 5 图源契约。
- 系统级产物是「某张图在某个倍率档下的临时重采样结果」，**刻意不进 `previews` 缓存**；
  由 `loupeSysToken` + `clearLoupeSysPx()` 精确释放，不会污染 LRU 与解码档位复用判据。

---

## 第六十六轮：天文像素计算让出主线程 —— 总像素硬上限 + 24 行分片 + 宏任务让出 + 并发槽位（2026-11-24，R66）

> 触发（真机 appfreeze 栈，逐字判读而非凭日志猜）：栈顶 `aiRgbaOf(AstroImage.ts:874)` /
> `decodeAstroPx(Preview.ets:435)` / `state=R` / `utime=1727` / **266 个 VIP MMITask 堆积**，
> 即 THREAD_BLOCK_6S。用户诉求：修掉「打开超大 FITS / XISF 后整个 APP 冻住」。

### 一、为什么 R65 会冻住（按真实源码判读）

R65 已经把**文件 IO** 全部改成 `await fs.stat/open/read/close`，也把 XISF 的 zlib 解压改成
`await zip.uncompress` —— 所以这一次**不是 IO 卡住**（与 R23 / R27 的 NAS appfreeze 不同）。
`state=R`、`utime=1727` 说明线程在**跑 CPU**。逐行核对 `decodeAstroPx` 的续体：

| 环节 | R65 行为 | 规模 |
| --- | --- | --- |
| `aiDisplaySizeOf` | 只夹**长边** 8192，`edge` 来自 `viewEdge()` / `preloadEdge()` | 全屏 4096 → **4096×4096 = 1677 万**目标像素 |
| `aiRgbaOf` | 挂在一个 `await` 续体上的**单段同步逐像素 JS 循环** | 每像素 3 次 `aiPixelAt` 采样 + 3 次 `aiStretchByteOf`（各含一次 `Math.pow`）+ 4 次索引写 |
| `aiBoundsOf` | 已封顶 65536 采样 | 不是瓶颈 |
| 预载链 `pumpAll` | 一次可发多张解码，每段都排进同一个 UI 线程 | N 段长循环**串行叠加** |

ArkTS 字节码解释执行下，1677 万像素这一段连续执行 > 6 秒；`await` 只在**段与段之间**让出，
段内主线程回不到 EventHandler，266 个 VIP 输入事件全饿死 → appfreeze。

### 二、实现（纯函数真值源 + SDK 层让出，分层与 R65 完全一致）

1. **总像素硬上限**：新增 `AI_MAX_TARGET_PIXELS = 4M` 与
   `aiTargetSizeSafeOf(w,h,edge,maxPixels)` —— 在 R65 `aiDisplaySizeOf` 的长边夹界**之后**再按
   `sqrt(max/total)` 等比例夹总像素；`aiDisplaySizeOf` 本身逐字不动。全屏 4096² → **2048²**，
   单帧计算量降到约 1/4；`maxPixels<=0` 时保持 R65 原尺寸，1×1 不会被缩成 0。
2. **24 行一片 + 片间宏任务让出**：`aiSliceCountOf/I0/I1` 给出分片计划，
   `aiSxTableOf` 预建「目标列 → 源列」映射（省掉 `dw×dh` 次重复除法），
   `aiRgbaSliceOf` 只渲染 `[y0,y1)` 行到调用方预分配的 `out`。SDK 层
   `astroRgbaOf` 按片调用，片与片之间 `await yieldMacroTask(AI_SLICE_YIELD_MS=0)`。
   **宏任务**（`setTimeout` 回调由 EventHandler 派发）而非 `await Promise.resolve()` 的微任务，
   是这轮的关键：微任务队列会被一次排空，VIP 输入事件仍插不进来。
3. **零新增 Promise 构造的让出件**：`yieldMacroTask` 把 R44 `Index.ets/nasRetryWait` 里
   那一处「定时器 + resolve」**原样搬进 `model/Preview.ets` 共用**，
   `nasRetryWait` 改为委托。工程全源码 Promise 构造仍**恰 2 处**
   （`RawStore.readGuarded` 超时闸门 + `yieldMacroTask`）、`Promise.race` 仍 1 处，
   启动恢复路径零新增等待原语，R44 重试节奏语义逐字不变。
4. **并发槽位**：`AI_MAX_CONCURRENT_RENDER = 1` + `aiRenderSlotAllowedOf` 把「重计算」串行化；
   等待方用同一个宏任务让出排队，**绝不丢弃任何一次解码**（不返回失败、不进黑名单），
   `try/finally` 保证异常也归还槽位，不会把链永久堵死。
5. **去掉每像素通用幂**：`aiStretchByteOf` 的 `gamma=0.5`（天文默认档）改走 `Math.sqrt`，
   其余 gamma 仍走 `Math.pow`；Node 侧用 1 万个采样点验证两者输出字节**逐值全等**。
   灰度图 `aiRgbaSliceOf` 还只采样一次（r=g=b），色图保持三通道。
6. **尺寸 / 分配护栏**：`aiAllocAllowedOf` 在**读整文件、zlib 解压前、未压缩段**三处拦截
   0 / 负数 / NaN / 超限；解压后像素段上限 256MB；大压缩块（>2MB）反 shuffle 改走
   `aiUnshuffleSliceOf` 分片版（字节平面 × 65536 样本一片，片间同样宏任务让出），
   小块仍走 R65 一次性 `aiUnshuffleOf`，结果逐字节一致。

> 没有引入 `taskpool` / `worker`：ArkTS 的 `@Concurrent` 对自定义结构体 /
> `Uint8Array` 的传参限制多、真机行为不可在本机编译校验，且会把纯函数真值源劈成两份。
> 分片 + 宏任务让出是**可在本机用 Node 逐值回归 + 真实 ArkTS 编译**验证的方案。

### 三、验证用例（`tests/dirname.test.mjs` R66 组，构造字节 / 源码静态契约）

| 场景 | 结果 |
| --- | --- |
| 全屏 4096² | `aiTargetSizeSafeOf` → 2048×2048，总像素恰 4M；小图 / 降采样图与 `aiDisplaySizeOf` 完全同值 |
| 分片计划 | `aiSliceCountOf(50,24)=3`、末片夹到 total、非法 per 按 1、空总得 0 |
| 列映射表 | `aiSxTableOf(4,2)=[0,2]`，长度=dw、夹到 `srcW-1`、单调不减 |
| **分片渲染 vs R65** | 4×5 目标、2 行一片，`aiRgbaSliceOf` 拼接结果与 `aiRgbaOf` **逐字节全等**（RGBA / BGRA 双口径），alpha 恒 255 |
| gamma 快路 | `sqrt` 与 `Math.pow(t,0.5)` 在 10001 个采样点输出同为 0..255；0.35 档仍走 pow |
| 反 shuffle 分片 | `aiUnshuffleSliceOf`（每片 2 样本）拼接 == `aiUnshuffleOf` 逐字节 |
| 护栏纯函数 | `aiAllocAllowedOf` 拒 0/负数/NaN/超限；`aiRenderSlotAllowedOf` 满槽拒、账目异常放行、max<=0 恒拒 |
| 源码契约 | 纯函数模块零 SDK / 零 IO / 零 await / 零 throw / 零定时器；SDK 层三处 `await yieldMacroTask`；`finally` 归还槽位；Promise 构造恰 2 处 |

> 上述是**静态契约 + 构造字节纯函数数值回归**；分片数值等价 ≠ 真机无 appfreeze。

### 四、改动范围

| 文件 | 改动 |
| --- | --- |
| `common/AstroImage.ts` | 新增 7 个 R66 常量 + `aiAllocAllowedOf` / `aiRenderSlotAllowedOf` / `aiSliceCountOf` / `aiSliceI0Of` / `aiSliceI1Of` / `aiSxTableOf` / `aiTargetSizeSafeOf` / `aiRgbaSliceOf` / `aiUnshuffleSliceOf`；`aiStretchByteOf` gamma 快路；`aiRgbaOf` 改为复用列映射 + 分片函数（对外结果不变） |
| `model/Preview.ets` | 新增 `yieldMacroTask` / `astroRenderActive` / `astroUnshuffleSliced` / `astroRgbaOf`；`astroPixelsOf` 三处尺寸护栏 + 大块分片反 shuffle；`decodeAstroPx` 改走 `aiTargetSizeSafeOf` + `await astroRgbaOf`；普通图片 codec 链逐字未动 |
| `pages/Index.ets` | `ESC_BUILD_TAG` R65→R66；`nasRetryWait` 委托 `yieldMacroTask`；文件头主线号 |
| `tests/dirname.test.mjs` | 新增 **25 条** R66 断言 + 真机步骤 R66-A~D；构建标记 R65→R66（全量）、断言标签同步 |
| `README.md` | 本章 + 抬头 / 章节列表 /「使用前必读」构建标记与行号同步 |
| `AppScope/app.json5` | **未改动**：`versionCode 7` / `versionName "1.0.7"` |

### 五、验证结果（三类证据严格分开）

| 类型 | 结果 |
| --- | --- |
| **静态契约 / 构造字节纯函数** | `ALL PASS 2097 passed, 0 failed`（R65 基线 2072，+25）；`git diff --check` 通过；分片 / 尺寸 / 护栏 / gamma 全部由 R66 组当场重算 |
| **真实 ArkTS 编译** | `./build.sh`（`hvigorw assembleHap --no-daemon`）→ **`BUILD SUCCESSFUL in 19 s 75 ms`**，日志 **`Finished :entry:default@CompileArkTS... after 11 s 753 ms`**（**CompileArkTS 非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（与 R65 基线一致，全部为 Index.ets 既有全屏 `setWindowSystemBarEnable` 系 API 的 2in1 提示，R66 新增的 `Preview.ets` / `AstroImage.ts` 零 WARN） |
| **产物核验** | 签名 HAP **1,453,747 B**（R65 为 1,437,802 B）/ 未签名 **1,417,007 B**（R65 为 1,400,621 B）/ `modules.abc` **833,708 B**（R65 为 825,080 B）；产物 mtime 11:13 晚于源码 11:04–11:12；三件产物均检出 **`R66=1 / R65=0`**、**`1.0.7`**，且 `aiTargetSizeSafeOf` / `yieldMacroTask` / `aiRgbaSliceOf` 进入产物 |

> **编译校验 ≠ 真机验证**；本机没有 EventHandler / appfreeze 监控，
> THREAD_BLOCK_6S 是否真的消失必须由使用者在真机侧确认（见 R66-A）。

### 六、真机步骤（逐字取自 `tests/dirname.test.mjs:8177` R66 组）

> ⚠️ 真机步骤 R66-A：装新包后 Ctrl+D 角标必须是 R66；打开含 8K×8K FITS / XISF 的目录，
>     连续滚轮翻页 30 秒，界面/按键不再冻结、无 THREAD_BLOCK_6S appfreeze 栈。
> ⚠️ 真机步骤 R66-B：全屏打开同一张超大天文图，主视图仍显示拉伸后的图（目标尺寸被夹到约
>     2048×2048，属预期行为，不是「变糊」故障）；翻页 / ESC / 退出 APP 全部即时响应。
> ⚠️ 真机步骤 R66-C：目录里同时放 3 张以上 .fits，触发预载并发；hilog 里不应出现
>     astro decode 失败潮，槽位等待只让出主线程、不丢弃任何一次解码。
> ⚠️ 真机步骤 R66-D：既有 HEIC/JPG/PNG / 文本预览 scrollbar / 并排 / 全屏 / 放大镜 /
>     R64 内容量统计 / R65 天文解析 / 三栏三按钮 / 版本 1.0.7/7 全部零回归。

### 七、边界

- 只治「天文像素计算」这段 CPU 独占；普通图片走系统 codec，链路一行未动；
- 目标尺寸被夹到 4M 像素（约 2048×2048）是**有意的画质/流畅度取舍**，
  真机上超大图会比 R65 稍软，但不会白屏、不会丢图、不会冻住；
- 并发槽位恒为 1，等待用宏任务让出而非丢弃；`AI_SLICE_YIELD_MS=0` 表示「尽快」，
  不是「不等待」，每次仍是独立的宏任务；
- 正式界面零新增常显控件；版本仍 `1.0.7 / versionCode 7`；**本轮只做本地提交，未 push**。

---

## R39–R55 实现说明（依据测试断言名与源码，2026-11-20）

> 本章补 README 缺失的 **R39–R55 实现说明**，与上方「真机验证手册」互补：
> 手册讲「怎么在真机上验」，本章讲「每轮改了什么、落在哪个文件」。
> 素材只有两类且均**逐字引用**：① `tests/dirname.test.mjs` 的 `check('…')` 断言名
> 与 `console.log('--- 第 X 轮…')` 分组标题；② `components/` / `model/` 五个源文件的
> 头部注释、导出符号，以及用脚本逐个核实过的 `Index.ets` 符号落点。
> **无源码 / 无断言支撑的实现细节一律不写**（不是需求文档，也不复述提交信息）。
>
> **一个必须先说清的事实**：`components/` / `model/` 只在 **R39 / R40 组件化拆分**
> 引入；R41–R55 的核心符号（`DirRowsCacheEntry` / `openEpoch` / `NAS_RETRY_DELAYS` /
> `tryMtimeAsync` / `loadRightPage` / `pushPreview` / `textVpH` / `onTextMouse` /
> `zoomPercentText` / `ESC_BUILD_TAG` 等）经脚本逐个 `grep` 核实**全部仍在
> `pages/Index.ets`**，两个新目录只作为跨文件计数断言的拼接源码出现
> （如 R46 的 `new Promise` 计数用 `INDEX + ARCHIVE + MODEL`）。

### 一、组件化拆分：R39 / R40（新增 5 文件，共 1160 行）

测试里**没有**以 `R39` / `R40` 命名的断言 —— 这两轮同时改造了测试自身：
`SRC_FILES` 登记 5 个源文件、锚点按「逻辑所在文件」取源码，跨文件计数型断言改用
拼接源码 `CODE_LINES = (INDEX + ARCHIVE + MODEL + SIDEBAR + TOOLBTN)` 保持原语义。
对应测试注释逐字为：

> `// R39 Phase 0（Index.ets 拆分）：静态契约锚点与文件解耦 —— 断言按「逻辑所在文件」`
> `// 取源码，不再绑死单一文件。当前所有锚点仍指向 pages/Index.ets，行为零变化；`
> `// 后续轮次把组件 / 解码服务迁出时，只需在 SRC_FILES 登记新文件并改锚点指向。`
> `// R40 Phase 3：左栏迁 components/SidebarView.ets、工具按钮迁 components/ToolButton.ets。`

#### 第三十九轮（R39）：Phase 0–1 —— 行组件与解码链迁出

| 文件 | 行数 | 导出 | 头部注释所述迁出内容（逐字摘录） |
|---|---|---|---|
| `components/ArchiveRow.ets` | 479 | `ROW_IMAGE` / `ROW_UP` / `ROW_FOLDER` / `ROW_OTHER` / `ROW_TEXT`、`fmtBytes`、`ArchiveRow` | 「从 `pages/Index.ets` **原样迁出**（零逻辑改动，仅加 export）：`ArchiveRow` 三栏档案行、`ThumbLoader` 悬停缩略图 384px 档 LRU 加载器、`ROW_*` 行种类常量」；「只依赖 `common/` 纯函数层与 `model/Preview` 解码服务，不回指 `pages/` —— 模块图无环」 |
| `model/Preview.ets` | 425 | `TAG` / `DOMAIN` / `RAW_CACHE_MAX_COUNT`、`PreviewEntry`、`RawStore` / `rawStore`、`decodePx` | 「从 `pages/Index.ets` **原样迁出**的顶层解码链（零逻辑改动，仅加 export）：`PreviewEntry` 解码结果结构、`RawStore` / `rawStore` 原始档案 bytes 内存 LRU、`decodePx` 按长边档位解码一张图」；「只依赖 `common/` 纯函数层与 SDK，不回指任何页面 / 组件」 |

> 补充（源码事实）：`Preview.ets` 里 `RAW_CACHE_MAX_BYTES = 768MB`、`RAW_SINGLE_MAX_BYTES =
> 64MB`、`RAW_IO_BASE_MS = 400` / `RAW_IO_PER_MB_MS = 120` / `RAW_IO_CAP_MS = 8000`，
> 均为第八轮 / 第二十七轮既有常量，R39 只是迁出并按需导出，未改数值。

#### 第四十轮（R40）：Phase 2–3 —— 左栏、工具按钮与数据模型迁出

| 文件 | 行数 | 导出 | 头部注释所述迁出内容（逐字摘录） |
|---|---|---|---|
| `components/SidebarView.ets` | 162 | `SidebarView` | 「从 `pages/Index.ets` 的 `build()` **原样迁出**（UI 描述逐行等价）：标题行 → 工具行 → `dirHint` 提示条 → 空态 / `LazyForEach` 档案列表」；「状态仍归 `pages/Index.ets`：本组件只收 `@Prop` 快照 + 回调上抛，不持有任何业务状态」 |
| `components/ToolButton.ets` | 36 | `ToolButton` | 「原 `pages/Index.ets` 的 `@Builder toolBtn`，左栏与顶栏共用；外观与行为一字未动，仅从「结构体方法」改为「共享组件 + `onAction` 回调」」；「恒亮、恒可点，永不 grey out / 永不禁用」 |
| `model/GalleryData.ets` | 58 | `ImageItem`、`GalleryDataSource` | 「从 `pages/Index.ets` **原样迁出**（零逻辑改动，仅加 export）：`ImageItem` 左栏一行 / 翻页序列一项的数据结构（双集合设计：`items` 纯图片、`rows` 含目录行）、`GalleryDataSource` —— `LazyForEach` 的按需数据源」；「若留在 `pages/Index.ets` 会形成页面 ↔ 组件循环 import，放 `model/` 层后依赖方向保持单向」 |

依赖方向（源码注释逐字）：`pages/Index.ets → 本组件 → components/ArchiveRow + model/，无环`；
整体为 `pages / components → model → common`。

拆分后**断言锚点改按新文件取源码**，断言名逐字保留（节选，完整见
`tests/dirname.test.mjs` 285–328 / 553–567 行）：

- `空态判断用 rowCount（左栏实际行数）` → `SIDEBAR`
- `不再用 itemCount 判空态（itemCount 只算图片）` → `INDEX` 取反
- `applyItems 同步 rowCount` / `零图片目录设置 dirHint 提示条` → `INDEX`
- `不再有「选择图片」toolBtn` / `不再有「回到上次」toolBtn` → `INDEX + SIDEBAR` 取反
- `三个按钮合并在同一行，且「往上层」恒亮恒可点` / `按钮区不再有原来的第二行` → `SIDEBAR`
- `左栏宽度改用自适应 listW` / `List 行间距改用 LIST_ROW_GAP_VP 常量且为 1` → `SIDEBAR`
- `档案名列有 minWidth 兜底` / `行首图标高度压到 26` → `ARCHIVE`
- `往上层按钮恒亮恒可点（不再传 canGoUp）` → `SIDEBAR`
- `toolBtn 三参签名，不接受 enabled 入参` / `toolBtn 函数体无 .enabled / 条件颜色 / 条件 opacity`
  / `toolBtn 无条件恒定外观` / `源码非注释行无 .enabled( 禁用属性` → `TOOLBTN` / `CODE_LINES`

> R39 / R40 是纯结构迁移（源码注释明确「零逻辑改动」「外观与行为一字未动」），
> 因此**上方手册里没有这两轮的独立真机步骤**；验证靠静态契约全绿 + R41 起各轮界面回归。

### 二、R41–R55 各轮实现要点（断言名逐字）

以下 15 轮分组标题（去掉 `console.log('--- … ---')` 的装饰符后）与 65 条断言名
均逐字取自 `tests/dirname.test.mjs`；落点统一为 `pages/Index.ets`
（已用脚本逐个核实符号）。**真机步骤见上方手册同编号条目**。

| 轮次 | 主题（测试分组标题） | 断言数 | 落点 |
|---|---|---|---|
| R41 | 恢复态目录清单的行种类保真 | 5 | `Index.ets` |
| R42 | 网盘目录整表缓存（秒开 + 后台刷新） | 7 | `Index.ets` |
| R43 | 用户导航抢占在途列举 | 5 | `Index.ets` |
| R44 | NAS 重启后 13900002 —— 重连重试 + 恢复态预热 | 6 | `Index.ets` |
| R45 | 只读名单态自愈 | 5 | `Index.ets` |
| R46 | appfreeze THREAD_BLOCK_6S —— mtime 探测异步化 | 5 | `Index.ets` |
| R47 | 对开右页首开空白 —— 解码失败重试 | 4 | `Index.ets` |
| R48 | 右页空白可观测性 —— 全路径留痕 | 2 | `Index.ets` |
| R49 | 右页空白根因修复 —— 在途合并落点收口 | 3 | `Index.ets` |
| R50 | 重启恢复态不再自称「已恢复上次目录」 | 3 | `Index.ets` |
| R51 | 文本预览常显滚动条 + 行段选择复制 | 4 | `Index.ets` |
| R52 | 文本纵向滚动条自绘 | 4 | `Index.ets` |
| R53 | 自绘条真机不显示 —— 条件全直读 + 兜底回填 | 4 | `Index.ets` |
| R54 | 选段改为按住左键拖选 | 3 | `Index.ets` |
| R55 | 预览区常显角标取消 | 5 | `Index.ets` |

**第四十一轮：恢复态目录清单的行种类保真（.log 重启后可预览）**

- `R41 根因：upListKindOf 新增 keepFileKinds 形参，true 时直传快照真实种类`
- `R41 修复：restoreDirContextOnly 传 keepFileKinds=true，文本行不再被折叠成 ROW_OTHER`
- `R41 修复：恢复态清单仍是启动期零 IO（兜底只用纯字符串函数，不碰 fs / 选择器）`
- `R41 兜底：恢复态纯清单里的图片行（不在翻页序列）点击即真实重列当前目录，不再静默吞掉`
- `R41 零回归：上层清单（无授权父层）仍不传 keepFileKinds，文件行照旧折叠`

**第四十二轮：网盘目录整表缓存（秒开 + 后台刷新）**

- `R42 缓存结构：DirRowsCacheEntry 接口 + LRU 上限常量`
- `R42 秒开：openFolder 非重扫先查整表缓存，命中立即零 IO 渲染`
- `R42 渲染等价：缓存行按当前排序方向重排，分组顺序与真实列举同构（.. → 目录 → 图片 → 文本 → 其它）`
- `R42 后台刷新：条目没变走 sameDirEntries 短路（视图一个像素不动），变了走 applyItems 保位刷新`
- `R42 离线兜底：缓存已渲染而后台列举失败时保留缓存视图，返回 true 不触发上层清单回退`
- `R42 缓存写入：真实列举成功后整表入 LRU（sameDirPath 去重、超限裁尾），与 upDirCache 快照同点写入`
- `R42 零回归：自动重扫（isRescan）不查缓存；缓存渲染不碰 dirMtime（留 0 等真值）、不清死路径记忆`

**第四十三轮：用户导航抢占在途列举（修 NAS 点资料夹没反应）**

- `R43 抢占：用户导航（isRescan !== true）不再被 folderBusy 吞掉，自动重扫仍让路`
- `R43 作废：在途列举被抢占后结果整段丢弃（epoch 过期即静默退出，不落任何状态）`
- `R43 放锁：只有当前代际持有者释放 folderBusy（被抢占的旧调用不得清掉新调用的锁）`
- `R43 反馈：非缓存、非重扫的列举先同步显示「正在列出 …」，点击必看得见反应`
- `R43 往上层：browseUp 不再因 busy 早退，直接放行由 openFolder 抢占在途列举`

**第四十四轮：NAS 重启后 13900002 —— 重连重试 + 恢复态预热**

- `R44 网络目录判定：isNetworkDirUri（scheme 授权形 / userExternal 挂载形 / UNC；file://docs 与 file://media 是本机 provider 不算）`
- `R44 重试节奏：NAS_RETRY_DELAYS = [600, 1800]，只对网络目录 + ENOENT(13900002) 重试，本地目录快速失败`
- `R44 重试前静默重推持久授权：reactivatePersistQuiet 绝不调用 finishPersistActivate（一次性收口不得重入）`
- `R44 重试期间可被抢占：两次 epoch 校验（等待前 / 等待后），被抢占即让位不落状态`
- `R44 恢复态预热：restoreDirContextOnly 渲染后静默 warmRestoreDirQuiet（纯探测，不碰视图 / 状态栏 / folderBusy）`
- `R44 失败反馈：网络目录 ENOENT 重试耗尽后提示「网络目录未连接？稍候再点一次」`

**第四十五轮：只读名单态自愈 —— 预热成功即退出 READONLY**

- `R45 自愈入口：healRestoreMode（重探条目 URI，能开就退出只读态并补解当前张）`
- `R45 自愈只做一次最轻 sync 探测：fastProbe=true（单候选，不做多候选 openSync）`
- `R45 预热成功即自愈：warmRestoreDirQuiet 列得动目录后调 healRestoreMode`
- `R45 快照恢复 / 单张兜底落只读态时同样后台预热自愈（两处 warmRestoreDirQuiet 调用）`
- `R45 自愈不硬闯：探不通维持 READONLY（真授权失效仍走「选择文件夹」重授权）`

**第四十六轮：appfreeze THREAD_BLOCK_6S —— 目录轮询 mtime 探测异步化**

- `R46 根因修复：tryMtime 的 statSync（主线程同步跨进程 stat）已删除，改 tryMtimeAsync`
- `R46 超时兜底：3s race 超时按「本轮没探到」（0）处理，复用 nasRetryWait 不新增 Promise 构造`
- `R46 轮询不堆叠：mtimeBusy 重入保护（上一轮 stat 未回来跳过本轮，folderBusy/playing 让路语义不变）`
- `R46 基准 mtime 异步取 + epoch 守卫：两处 openFolder 基准赋值不阻塞视图，被抢占的迟到结果丢弃`
- `R46 变动检测语义零改动：mtime 变了仍去抖重扫（isRescan=true / 不弹多选 / 保位）`

> 跨文件计数证据：本轮 `new Promise` / `Promise.race` 断言使用
> `INDEX + ARCHIVE + MODEL` 拼接源码（测试 6277 行），即组件 / 模型源码参与计数，
> 但**不表示 R46 修改了这两个目录**。

**第四十七轮：对开右页首开空白 —— 解码失败重试**

- `R47 右页解码失败不再留空了事：loadRightPage 失败分支按节奏补试（attempt 递增）`
- `R47 重试节奏常量：RIGHT_PAGE_RETRY_DELAYS = [600, 1800]（与 NAS 重试同节奏，试完即止不无限重试）`
- `R47 重试可作废：token 校验（翻页 / 换对后旧重试 no-op）+ clearRightPage 清 pending 重试句柄`
- `R47 页面销毁清重试句柄（aboutToDisappear），成功路径与档位复用逻辑零改动`

**第四十八轮：右页空白可观测性 —— loadRightPage 全路径留痕**

- `R48 解码失败留痕：decode FAIL + retry in + give up 三段日志（区分失败 / 重试 / 放弃）`
- `R48 token 竞态留痕：stale discard（解码成功但被翻页作废）与异常路径都进日志`

**第四十九轮：右页空白根因修复 —— 在途合并落点收口（解好先入缓存）**

- `R49 decodeTo 在途任务解好先 pushPreview 入缓存再交消费者（所有权在交接点收口）`
- `R49 根因链完整：stale 丢弃 → releaseUncachedEntry → 缓存查重跳过（合并条目不再被误释放）`
- `R49 pushPreview 幂等：同一张 px 只刷 LRU 位置，不重复入列不重复计字节（自动入缓存的前提）`

**第五十轮：重启恢复态不再自称「已恢复上次目录」**

- `R50 恢复态列表撤掉说明行伪条目，源码（去注释）不再出现「已恢复上次目录」字样`
- `R50 恢复态计数改为 rows.length - 1（只剩 .. 不计入），状态栏按普通列表呈现`
- `R50 旧快照兼容：isUpListPseudoName 识别旧版「已恢复上次目录」说明行并过滤`

**第五十一轮：文本预览常显滚动条 + 行段选择复制**

- `R51→R52 文本纵向滚动条：原生条在全宽 List 右缘（视口外）看不见 → 改自绘条，原生关掉`
- `R51→R54 行段选择状态：textSelAnchor/textSelFocus（交互已改为按住拖选，见 R54）`
- `R51 行高亮 + 抬头工具条：选中行背景、有选区时抬头换成选区信息 + 复制 / 清除按钮`
- `R51 复制走系统剪贴板（pasteboard）+ Ctrl+C 同效 + 关文件 / 开新文件清选区`

**第五十二轮：文本纵向滚动条自绘（原生条画在全宽 List 右缘，视口外看不见）**

- `R52 自绘条状态与几何：textVpH / textFirstRow / textLastRow + 滑块高 / 位置比例计算`
- `R52→R53 Stack TopEnd 叠放：横向 Scroll 视口右缘叠自绘轨道 + 滑块，不随横向滚动移动`
- `R52 数据回填：List onScrollIndex 回填首行 / 视口高 onAreaChange 回填，开新文件重置`
- `R52 拖滑块换算 scrollToIndex + Transparent 不挡行点击（选段不受滚动条影响）`

**第五十三轮：R52 自绘条真机不显示 —— if 条件全直读 + 兜底回填 + 加粗加亮**

- `R53 if 条件全直读 @State（方法调用藏在条件里 V1 可能不重评 if 分支）`
- `R53 onAreaChange / onScrollIndex 兜底回填 textVpH（防个别路径不触发 onAreaChange）`
- `R53 加粗加亮：滑块 6 宽亮色 + 轨道 10 宽深色底 + 滑块最小高 32`
- `R53 诊断留痕：textVpH 回填与兜底都有 hilog（再不显示可直接抓日志定位哪个数是 0）`

**第五十四轮：选段改为按住左键拖选（hold → 拖动实时扩展 → release 定段）**

- `R54 onMouse 挂 List 统一收口：Press 定起点 / Move 实时扩展 / Release 定终点，只认左键`
- `R54 行号换算：滚动偏移 + 列表内 y → 行号，并夹取到可见范围（不越界选到文档头尾）`
- `R54 行级 onClick 移除（旧两次点击定界退役），清除按钮 / Ctrl+C / 关闭自动清选区保留`

**第五十五轮：预览区常显角标取消（左上档案名浮层 + 右下缩放百分比方块）**

- `R55 左上角信息浮层整体取消：档案名 / 大小 / 色彩三行都不再渲染，spreadNames 一并移除`
- `R55 全屏退出提示保留（唯一指引，仅全屏出现，样式带底色圆角）`
- `R55 右下角百分比方块取消：无常显分支，缩放百分比只在诊断层（Ctrl+D）角标里出现`
- `R55 诊断层入口与内容不变：Ctrl+D 切换、退出 APP 按钮、全字段角标、diagLine 赋值链全保留`
- `R55 死代码清干净：viewHintOf / colorSpaceNameOf / fmtBytes 不再被 Index 引用（定义仍在 common/ArchiveRow）`

### 三、边界与口径差异（据源码核实）

- **R39 / R40 无独立真机步骤**：纯结构迁移，源码注释逐字写明「零逻辑改动」
  「外观与行为一字未动」；验证靠静态契约全绿 + 后续轮次界面回归。
- **R41–R55 未改 `components/` / `model/`**：65 条断言的锚点全是 `INDEX`
  （`pages/Index.ets`）；唯一例外是 R46 的跨文件计数断言拼接了 `ARCHIVE + MODEL`，
  但也只是计数，不是改动。
- ⚠️ **R55 最后一条断言名含过时路径措辞**：断言写「定义仍在 `common/ArchiveRow`」，
  但源码里 `viewHintOf` / `colorSpaceNameOf` 定义在 `common/ViewPlan.ts`（191 / 213 行），
  `fmtBytes` 定义在 `components/ArchiveRow.ets`（46 行），`common/` 下并无 ArchiveRow 文件。
  断言本体（`/viewHintOf/`、`/colorSpaceNameOf/`、`/fmtBytes/` 不在 `INDEX` 中）仍成立；
  本章逐字保留断言名原文，此处仅标注源码实际位置，供后续清理断言措辞时参考。
- **证据边界**：本章是**静态契约 + 源码结构**的说明，`node --experimental-strip-types`
  只剥离 TS 类型、不做完整类型检查；静态契约不能代替真实 ArkTS 编译，
  **编译校验 ≠ 真机验证**。真机 DevEco / `hdc` / `hilog` 验证由使用者完成，
  步骤见上方「真机验证手册」。版本仍 `1.0.7 / versionCode 7`。

---

## 第三十八轮：`/storage/Users/currentUser` 无法选择 —— 用户卷根重新可进入 / 可真实列举（2026-11-19，R38）

**用户需求**：检查相关代码与配置，定位无法选择 `/storage/Users/currentUser` 的原因并修复，使该路径能够正常被选择；**仅调整与路径选择限制相关的逻辑，保持其他路径的选择行为不变**；完成后简要说明改动范围、修复内容和验证结果。经追问确认落点为 **APP 左栏目录行**（不是 WorkBuddy 工作区选择，也不是系统 FOLDER picker 主入口）。

### 排查：按事件链路走，不凭缓存记录推断原因

先排除配置侧：`AppScope/app.json5`（版本守卫）、`module.json5`（仅 `FILE_ACCESS_PERSIST`）、`build-profile.json5`、`.bitfun/project.json`、WorkBuddy `settings.json` 的 96 条 sandbox 规则、客户端 `app.asar` 内的 `HARMONY_USER_DIR_FALLBACKS` / `pickFolder()` / `taskStarter` 默认工作区校验（`Ti` / `NT` 实为过滤 `claw` 内部目录），**均无针对 `/storage/Users/currentUser` 的显式拒绝**。系统 FOLDER picker 侧 `defaultFilePathUri` 也只由 `pickerStartSafe()` 生成干净 URI，不拦该路径。

再按用户要求从**事件入口 → `browseUp()` → 状态标志 → 下游主链**走一遍纯函数探针（`/tmp/r38_probe*.mjs`），而不是从 `upDirCache` 反推：

| 环节 | `/storage/Users/currentUser` 实际值 |
|---|---|
| `volumeRootOf()` | `/storage/Users/currentUser`（**用户卷根 L0**） |
| `upLevelOf()` | `''`（无父层） |
| `upNavStateOf()` | `UP_NAV_TOP` |
| `upParentCandidates()` | `[]`（无同层父候选） |
| `canUp` | `false` → 进入 `browseUp()` 的 `if (!canUp)` 分支 |
| 分支行为 | **无条件按 TOP 早退**，只回一句「已到卷 / 硬盘的逻辑最上层」提示 |

**根因**：R28 的卷根护栏本身是正确的（阻止「往上层」越级到 `/storage`、`/` 这类系统目录），但它的副作用是把**用户主目录本身**锁成了一个「没有父级、没有同层候选、点 `..` / `往上层` 永远只回一句提示、既不重新列举也无法进入」的死层 —— 这正是左栏目录行表现为「无法选择该路径」的原因。

### 改动范围（3 个文件，只碰路径选择限制相关逻辑）

| 文件 | 内容 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十八轮区块 3 个**纯字符串、零 IO、零抛出**函数：`isUserVolumeRootOf()`（精确识别 `/storage/(Users\|media\|emulated)/<id>`，恰好 4 段且 id 非空；深层 / `/` / 盘符 / NAS / URI 碎片一律 false）、`rootReenterWantedOf()`（唯一放行条件 = `TOP` 态**且**当前层恰好是用户卷根）、`rootReenterFormsOf()`（用 `rootFormParentOf()` 把深层 picker 授权 URI 还原成与卷根同 scheme 的写法，加真实路径兜底，并用 `canonicalLevelKeyOf()` 卡死同层、绝不生成 `/storage` / `/`）。**`volumeRootOf()` / `upLevelOf()` / `upNavStateOf()` / `upParentCandidates()` 一字未改** |
| `entry/src/main/ets/pages/Index.ets` | `ESC_BUILD_TAG → R38`；仅在 `browseUp()` 的 `if (!canUp)` 分支内、原有 TOP 早退**之前**插入唯一放行分支：`rootReenterWantedOf(current, state)` 为真时，收集 `pickRootUri` / `browseDir` / `savedDirUri` 作授权形态锚点，调 `rootReenterFormsOf()` 得到同层写法，再 `openFolder(current, false, false, false, reenterForms, true)` **原地真实全量列举本层**；成功更新 `status` / `diagLine`（`up ROOT OK`）并 `return`，失败 `hilog.info()` 后回落到原有 TOP 明确提示。**不弹系统选择器、不动恢复态、不改 `chooseFolder()` / `chooseFilesInDir()` / `openFolder()` 主体** |
| `tests/dirname.test.mjs` | 构建标记 `R37 → R38`、7 组旧包排除数组补 `R37`；新增 **22 条** R38 断言（用户卷根精确识别 / 其它 TOP 一律不重新列举 / 同层写法与越级护栏 / `Index.ets` 接线 / R28 零回归 / 版本与旧包排除 / 新纯函数零 SDK·零 IO·零 await·零 throw），另有 5 条既有构建标记断言随 R38 升级，合计 27 条 `R38` 断言 |

### 三类证据（严格分开）

| 类别 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw --mode module -p product=default assembleHap --no-daemon` → **BUILD SUCCESSFUL in 19 s 551 ms**，日志出现 `Finished :entry:default@CompileArkTS... after 11 s 889 ms`（**真实编译，非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（全为既有 `Function may throw exceptions`，与 R37 基线一致）；签名 HAP **1,101,835 bytes**（R37 为 1,093,949），未签名 1,066,201 bytes |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 signed / unsigned HAP 内 `ets/modules.abc`（均 **624,472 bytes**，R37 为 620,068）检出 **`R38=1 / R37=0 / R36=0 / R35=0 / R34=0 / R33=0`**；`1.0.7=1 / 1.0.6=0`；`isUserVolumeRootOf` / `rootReenterWantedOf` / `rootReenterFormsOf` **各 2 处**进入产物，`up ROOT OK=1`、`up ROOT \|=1` |
| **静态契约 + 纯函数** | **ALL PASS 1769 passed, 0 failed**（R37 为 1747，新增 22 条 R38 断言）；`node --experimental-strip-types`、`node --check`、`git diff --check` 通过；相对 HEAD：`DirName.ts +91`、`Index.ets +42`、`tests/dirname.test.mjs +232/-53`，合计 `312 insertions / 53 deletions` |

> ⚠️ **`node --experimental-strip-types` 只剥离 TS 类型、不做完整类型检查；静态契约不能
> 代替真实 ArkTS 编译，编译校验更不能代替真机验证。** 真机 DevEco / 设备安装 / `hdc` /
> `hilog` 侧验证由用户完成。

### 覆盖的验证场景（请在装有 `R38` 新包的机器上执行）

| # | 场景 | 期望 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R38`（仍是 `R37` 及更早说明装的是旧包） |
| 2 | 从任意子目录反复「往上层」直到 `/storage/Users/currentUser`，再点一次 `..` / `往上层` | 不再只回一句「已到最上层」；**原地重新真实列举**该层全部顶层资料夹（Download / Desktop / Documents / Pictures / Music / Videos …），诊断串出现 `up ROOT OK ... root=1` |
| 3 | 左栏点这些顶层资料夹目录行 | 正常进入子目录，与 R36 / R37 既有目录浏览、退出恢复行为完全一致 |
| 4 | 在 `/`（或 `C:`、NAS 设备根）点「往上层」 | **仍**给「已到卷 / 硬盘的逻辑最上层」提示，绝不越级到 `/storage` / 系统目录（R28 护栏零回归） |
| 5 | 深层目录连续「往上层」、空目录 / 无图片目录、反复进入子目录 | R36 的目录恢复与父层全量列举仍正确；`/storage/Users/currentUser` 只在**用户主动点击且当前层恰好是卷根**时才重列举 |
| 6 | 自动重扫（每 1.5s）/ 启动恢复期 | 零新增 `fs.listFile`，绝不重演 R27 `THREAD_BLOCK_6S` |
| 7 | 系统 FOLDER picker 选择其它任意路径 | 选择行为逐字不变（R32 的起点 / 校验 / 提示链路未动） |

### 边界（刻意保留）

- **只放行一种情况**：`TOP` 态 + 当前层恰好是用户卷根 + 用户主动点击；其它 `TOP`（`/`、`C:`、NAS 设备根）、`NONE` / `GO` / `UNKNOWN` 以及所有深层路径的「往上层」逻辑逐字不变。
- **不越过卷根**：`rootReenterFormsOf()` 用 `canonicalLevelKeyOf()` 卡死同层，产物中不含 `/storage` / `/` 形态；R28 越级护栏保留。
- **零新增常驻 IO**：仅用户主动点击时一次真实全量列举；自动重扫 / 启动恢复期不触发。
- **不动配置**：版本恒为 `1.0.7 / versionCode 7`；`module.json5` 权限、`build-profile.json5`、picker 配置均未改；未 `push`、未跑 `build.sh`、未把 HAP 放桌面。

---

## 第三十七轮：纯文本 / 源码文件预览（2026-11-19，R37）

**用户需求**：为应用增加纯文本文件预览功能，支持 `.log`、`.txt`、`.c`、`.asm` 等常见纯文本及源码文件；自动识别文件类型，对 C、Python、ASM、Verilog 等语言启用对应的代码语法高亮，未匹配到高亮规则的文件仍按普通文本完整展示。预览需保留原始内容、换行、缩进和特殊字符，不修改文件，提供行号与等宽字体排版以保持清晰易读，并兼容常见文本编码，能稳定显示行数较多的文件。

### 设计：真值源 / IO / 渲染三层分开

沿袭 `DirName.ts` / `ResumePlan.ts` 的既有口径，把**所有可判定逻辑放进纯函数真值源**，IO 与 UI 只做接线：

| 层 | 位置 | 约束 |
|---|---|---|
| 真值源 | `entry/src/main/ets/common/TextDoc.ts`（新建，877 行 / 59 个 export） | 零 SDK import、零文件 IO、零 `await` / `throw` 语句、零全局可变状态；输入仅 `string` / `number` / `Uint8Array` / `Array`，可被 `tests/dirname.test.mjs` 直接加载回归 |
| 异步 IO | `Index.ets` 的 `openTextFile()` | `fs.stat/open/read/close` **全用 Promise 版并 await**（R27 `THREAD_BLOCK_6S` 教训：`Promise.resolve(同步读)` 是伪异步）；全程 `READ_ONLY`，绝不写 / 删 / 改名 |
| 渲染 | `TextLineSource` + `textPreview()` / `textRow()` | 大数组刻意不进 `@State`；`LazyForEach` 纵向虚拟化 + 外层 `Scroll` 横向滚动；`textToken` 作废迟到的异步结果 |

**与图片态严格互斥**：文本行只进左栏 `rows`（`ROW_TEXT = 4`），**绝不进 `items`** —— 否则解码 / 预载链会把 `.c` 当图片解。右栏 `if (this.textMode) { textPreview() } else if (this.cur >= 0) { …原有两页预览分支一字未删… }`；点图片行、换源、往上层、方向键、滚轮都会按各自语义收掉 / 绕开文本态。

### 改动（3 个文件）

| 文件 | 内容 |
|---|---|
| `entry/src/main/ets/common/TextDoc.ts`（新增） | ① 后缀 / 语言：`TEXT_SUFFIX_PLAIN`（37）/ `TEXT_SUFFIX_C`（C-like 55）/ `TEXT_SUFFIX_PYTHON`（5）/ `TEXT_SUFFIX_ASM`（6）/ `TEXT_SUFFIX_VERILOG`（8）合计 **111 项**；`textExtOf()` / `textLangOf()` / `isTextFileName()` / `textSuffixListOf()` / `textLangLabelOf()` / `highlightWanted()` —— 只有 `LANG_PLAIN` 不着色、其余按语言着色，`LANG_NONE` 直接不进文本预览；② 编码：`textBomEncodingOf()` / `textBomSkipOf()` / `isValidUtf8()` / `looksBinary()` / `textBodyOf()` / `encodingCandidatesOf()` / `pickDecodedIndexOf()` / `encodingLabelOf()` —— BOM 剥离 + 严格 UTF-8 校验 + GB18030 / Big5 / Windows-1252 回退候选，逐个 `util.TextDecoder` 试解后选**替换字符最少**者；③ 行处理：`textReadCapOf()` / `textByteTruncatedOf()` / `splitTextLines()` / `expandTabsOf()` / `lineNoWidthOf()` / `textContentWidthOf()` / `textStatusOf()` —— CRLF / CR / LF 统一切行、Tab 只在显示层按制表位展开、8MB / 12 万行上限与截断提示、按最长行算横向内容宽并夹到 12000vp；④ 高亮：`TOK_PLAIN`…`TOK_LABEL` 七类 token + `tokenColorOf()` / `tokenizeLine()` / `blockStartsOf()` / `joinTokensOf()` —— 逐行 tokenizer 携多行注释 / Python 三引号跨行状态，`emitTokens=false` 与 `true` 共用同一状态机；不变式 `joinTokensOf(tokens) === expandTabsOf(原行)` 保证**原始内容零改写** |
| `entry/src/main/ets/pages/Index.ets` | ① `ESC_BUILD_TAG → R37`；② `ROW_TEXT = 4`；`FILE_FILTERS` 保留「所有文件」为第一项并新增 `textFileFilterOf()`（与 `textSuffixListOf()` 同源，杜绝两份后缀清单分叉）；③ `openFolder()` 分类：`isDir → 图片 → !statOk 按文件夹兜底 → isTextFileName → 其他`，文本行单独 `texts` 组、自然序排序、只 `rows.push`；④ `ArchiveRow` 文本行独立暖黄配色、hover 缩略图仍只对图片行开放；⑤ `onRowTap()` 文本行走 `openTextFile()` 且 `return`，**绝不 `select(itemIndex)`**；⑥ 新增 `TextLineSource implements IDataSource`（`reload()` 通知 `onDataReloaded`）；⑦ 新增 `openTextFile()` / `applyTextDecoded()` / `closeTextMode()` / `textTokensOf()` / `textRow()` / `textPreview()`；⑧ 互斥护栏：`select()`、`applyItems(!keepView)`、`browseUp()` 收文本态，`go()` / `onWheel()` 文本态下滚动文本行而非翻图片；⑨ 右栏 `textMode` 分支与图片分支互斥，原有 `previewImage` / `rightPageImage` 两页预览分支一字未删 |
| `tests/dirname.test.mjs` | 构建标记 `R36 → R37`、旧包排除补 `R36`；新增 **85 条** R37 断言（① 类型 12 / ② 编码 16 / ③ 行处理 16 / ④ 高亮 15 / ⑤ 接线 22 / ⑥ 零回归 4）；其中「零 await / 零 throw」按**语句形态**判定（关键字表 `'|await|'` / `'|throw|'` 是高亮规则数据，不是语句），`onRowTap` 按**整段分支**判定（分支内必须 `openTextFile` + `return`，且绝不出现 `this.select(`） |

### 三类证据（严格分开）

| 类别 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw --mode module -p product=default assembleHap --no-daemon` → **BUILD SUCCESSFUL in 15 s 92 ms**（33 tasks：18 executed / 15 up-to-date），日志出现 `Finished :entry:default@CompileArkTS... after 8 s 635 ms`（**真实编译，非 UP-TO-DATE**）；**0 ERROR / 17 WARN**（8 条 `preferences` 可能抛异常、1 条 `READ_IMAGEVIDEO` 受限权限、8 条 2in1 系统栏 API），与 R36 基线完全一致且**全部落在 R37 未改动区域**；签名 HAP **1,093,949 bytes**（R36 为 996,788），未签名 1,057,642 bytes |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **620,068 bytes**，R36 为 561,580）检出 **`R37=1 / R36=0 / R35=0 / R34=0`**；`APP_VERSION = '1.0.7'`（`1.0.6=0`）、`module.json` 的 `versionCode 7 / versionName 1.0.7`；`textContentWidthOf` / `tokenizeLine` / `textSuffixListOf` / `textStatusOf` / `openTextFile` / `TextLineSource` / `isTextFileName` / `textBomEncodingOf` / `splitTextLines` / `blockStartsOf` / `applyTextDecoded` / `textFileFilterOf` / `textPreview` / `textRow` / `closeTextMode` **各 2 处**进入产物，`ROW_TEXT=1` |
| **静态契约 + 纯函数** | **ALL PASS 1747 passed, 0 failed**（R36 为 1662，新增 85 条 R37 断言）；`node --experimental-strip-types`、`node --check`、`git diff --check` 通过；源码相对 HEAD：`Index.ets +379/-7`、`tests/dirname.test.mjs +424/-47`，新增 `TextDoc.ts` 877 行 |

> ⚠️ **`node --experimental-strip-types` 只剥离 TS 类型、不做完整类型检查；静态契约不能
> 代替真实 ArkTS 编译，编译校验更不能代替真机验证。** 真机 DevEco / 设备安装 / `hdc` /
> `hilog` 侧验证由用户完成。

### 覆盖的验证场景（请在装有 `R37` 新包的机器上执行）

| # | 场景 | 期望 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R37`（仍是 `R36` 及更早说明装的是旧包） |
| 2 | 打开含 `.log` / `.txt` 的目录，点文本行 | 左栏文本行暖黄显示；右栏出抬头（文件名 / 语言 / 编码 / 行数）+ 行号 + 等宽正文，与图片预览互斥 |
| 3 | `.c` / `.py` / `.asm` / `.v` 源码 | 关键字 / 注释 / 字符串 / 数字 / 预处理 / 标签按各自规则着色；C 多行注释、Python 三引号跨行状态连贯 |
| 4 | 未命中高亮规则的文件（`.md` / `.json` / 无后缀文本） | **仍按普通文本完整展示**，不着色、不丢内容 |
| 5 | CRLF / CR / LF 混排、Tab 缩进、行尾空格、特殊字符 | 换行 / 缩进 / 特殊字符原样保留，长行可横向滚动且不裁切、不自动换行 |
| 6 | UTF-8 / UTF-16LE BOM / UTF-16BE BOM / GB18030 / Big5 / Windows-1252 文件 | 各自正确解码、BOM 不出现在首行、中文不乱码；候选解码挑替换字符最少者 |
| 7 | 数万行大文件 | 滚动稳定不卡、行号不跳动；超过 8MB / 12 万行时抬头明确提示「已显示前 8 MB / 120000 行」 |
| 8 | 二进制 / 伪装成 `.txt` 的文件 | 显示「二进制内容，不按文本显示」，不刷满屏乱码；全程只读、文件校验和不变 |
| 9 | 点图片行 / 滚轮 / 方向键 / 「往上层」/ 选文件夹 | 退出文本态且图片预览、目录恢复、ESC 等既有链路完全不受影响 |
| 10 | 快速连续点两个文本行 | `textToken` 作废迟到结果，右栏恒定显示最后点的那个文件，不会串台 |

### 边界（刻意保留）

- **文本行不进图片翻页序列 `items`**：滚轮 / 方向键在文本态下只滚文本行，不翻图片；要看图先点图片行。
- **只读不写**：`fs.OpenMode.READ_ONLY`，无写 / 删 / 改名 / 截断任何源文件；编码与 Tab 处理只在内存显示层。
- **8MB / 12 万行上限**：超出按字节 / 行数截断并在抬头明确提示，不把整个 NAS 文件读进内存
  （R27 `THREAD_BLOCK_6S` 教训）；二进制内容按提示展示，不刷乱码。
- **高亮是轻量 tokenizer，不是语言服务器**：C-like 共用一套规则、无嵌套语法树；
  未命中规则与 `LANG_PLAIN` 一律原样完整展示，绝不因为「不认识」就吞内容。
- **ArkUI 取舍**：`textRow()` 用 `Row()` 内 `ForEach` 逐 token 生成 `Text()`，而不是
  在 `Text()` 内动态生成 `Span`（ArkUI 不支持）；外层 `Scroll` 横向 + 内层 `List/LazyForEach`
  纵向，两轴不同不抢手势。
- **版本恒为 `1.0.7 / versionCode 7`**；未 `push`、未跑 `build.sh`、未把 HAP 放桌面。

---

## 第三十六轮：空目录 / 无图片目录退出恢复 + 「往上层」真实列出该层全部资料夹（2026-11-19，R36）

**用户报障**：① APP 退出前若停留在任一目录，无论该目录是否为空、是否包含图片，
再次打开都必须恢复到退出前停留的目录位置，**不得回到默认目录，也不得因目录内没有图片而
丢失该状态**；② 在任何层级、任何时间点击「往上层」时，都必须**真实列出该上层目录下的
全部资料夹目录**，而不是只显示其中一个资料夹或局部结果；③ 空目录、无图片目录、多层目录
连续返回及反复进入子目录后，目录恢复与上层列表仍要正确。

### 根因 A：整条持久化 + 恢复链都以「有图片位置」为前提

先按状态传递核对 `applyItems() → markPos() → flushPos()/flushPosSync() → preferences →
readLastPos() → scheduleShowLast() → beginRestore() → showLastOnStart()`：

| 环节 | 旧行为 | 后果 |
|---|---|---|
| `applyItems()` | 零图片时 `cur = -1`，末尾仍调 `markPos()` | 目录表（`rows`）照常渲染，但「位置」不存在 |
| `markPos()` | `cur < 0 \|\| cur >= items.length` 直接 `return` | 不生成 `LastPos`、不排 `scheduleFlush()`；空目录那次 `openFolder()` 设好的 `browseBase` **从不落盘** |
| `flushPos()` | 依赖 `posPending`；无位置直接 `return` | 增强 key（`POS_KEY_BROWSE` / `POS_KEY_UPCACHE`）一个都不写 |
| `flushPosSync()` | `exitFlushAction(p !== undefined, …)` → `FLUSH_SKIP` | 切后台 / ESC 退出也全跳过，连授权根 `POS_KEY_DIR` 都不补 |
| `readLastPos()` | `hasRestoreMemory` 只看 idx / uri / ok / savedDirUri | 空目录会话可能连看门狗都不挂 |
| `showLastOnStart()` | `resumeAction()` 无 `savedUri`/`okUri` → `RESUME_SKIP`；`enterSettledOk(itemCount=0)` 恒 false；只读 / 空快照 / 单张兜底一律 `giveUpNow()` | 把**正常的无图片目录**当成恢复失败 → 回默认目录 + 弹选择器 |
| `restoreFromSnapshot()` | `uris.length === 0` 返回 false；`restoreBrowseContext()` 只在图片快照或单张兜底后调用 | 没有「仅目录态、无图片」的启动恢复路径 |

一句话：**目录位置是独立于图片的纯字符串信息，却硬挂靠 `LastPos`**。空目录、无图片目录、
只有子文件夹的目录三种形态都会踩中。

### 根因 B：R35 只合并了「一个 `openFolder()` 内」的结果，跨候选仍是局部

R35 修好了 `openFolder()` 里多个 URI 写法 `fs.listFile()` 结果被覆盖式 `names = n` 丢弃的
问题，但用户明确要求「任何层级、任何时间真实列出全部资料夹」，R35 刻意保留的两处边界
就不再成立：

1. `browseUp()` 对 `upParentCandidates()` 给出的**多个同层 `parent` 候选**逐个
   `openFolder(parent, false, false)`，**首个成功就 `return`** —— 其余候选真实列出来的
   兄弟资料夹全被丢掉。这正是「只显示一个资料夹」的剩余根因。
2. `openFolder()` 里 `probeChild()` 命中即 `break`，后续 URI 写法不再探索。
3. `showUpListInApp()` 是零 IO 兜底，只靠 `upDirCache` / `lastUpNames` / 当前目录名反推，
   不满足「真实列出」。

### 改动（4 个文件）

| 文件 | 内容 |
|---|---|
| `entry/src/main/ets/common/ResumePlan.ts` | 新增 `DIR_RESUME_NONE`/`DIR_RESUME_CONTEXT`/`DIRCTX_EMPTY` 与三个纯函数：`dirContextFlagOf()`（只有「目录浏览态 + 本层零图片」才给 `'1'`）、`dirContextSaveWanted()`（无图片位置时是否独立落盘）、`dirOnlyResumeWanted()`（目录态恢复**优先于**残留旧图片 uri / 快照，纯判据只看目录态标记）。全部零 IO、零抛出、单字符标记（绝不引入 R31 踩过的 XML 非法控制字符） |
| `entry/src/main/ets/common/DirName.ts` | 新增四个纯函数：`upFullExploreWanted(isUserNav, isRescan)`（**只有用户主动导航**开全量；自动重扫 / 选文件夹 / 点子目录一律关，防 NAS 放大 IO）、`upExploreFormsOf(groups)`（跨所有同层候选把 URI 写法按原名精确去重、优先父级排最前）、`upExploreCapOf()`（夹界）、`upExploreNeedFallback()`（真实列举 0 项才允许零 IO 兜底） |
| `entry/src/main/ets/pages/Index.ets` | ① 新增 `POS_KEY_DIRCTX`（`lastDirCtx`）、`UP_EXPLORE_MAX_FORMS=64`、`savedDirCtx`、`lastUpExploreNames`；② `readBrowseExtras()` 读回目录态标记、`hasRestoreMemory` 把目录态也算有会话记忆；③ `markPos()` 无图片时仍排写盘；`flushPos()` 无 `LastPos` 改走 `flushDirContext()`；`flushPosSync()` 的 `FLUSH_SKIP` 分支改走 `flushDirContextSync()`；两处增强 key 都与位置同批写 `POS_KEY_DIRCTX`（有图片时写 `''` 清旧标记）；④ 新增 `restoreDirContextOnly()`：**零 IO** 用 `restoreBrowseContext()` 回填 `browseBase`/`browseDir`/`pickRootUri`/`titlePath`/`canGoUp`/多层 `upDirCache`，用同层快照画一份纯清单，撤掉看门狗，绝不弹选择器、绝不回默认目录；⑤ `showLastOnStart()` 在图片恢复链**之前**判 `dirOnlyResumeWanted()`；⑥ `openFolder()` 增加 `extraForms` / `fullExplore` 两个可选参数，把跨候选写法并入候选集、按 cap 夹界，**`probeChild` 命中不再裸 `break`**（改 `if (!wantFull) break`），仍只有 1 处真实 `fs.listFile`；⑦ `browseUp()` 收集所有 `parent` 的 `dirCandidates()` → `upExploreFormsOf()` → 一次 `openFolder(landUri, …, allForms, wantFull)` 真实全量列举并合并落地，两处 `showUpListInApp()` 都受 `upExploreNeedFallback()` 夹住；⑧ `readLastPos()` 的死路径记忆、`finishPersistActivate()` 的授权激活失败两处 `giveUpNow()` 早退点加 `!dirOnly` 护栏（目录态恢复零 IO、不依赖 URI 授权，绝不被弹选择器踢回默认目录）；⑨ `ESC_BUILD_TAG` → `R36` |
| `tests/dirname.test.mjs` | 引入 7 个新纯函数；构建标记 `R35 → R36`、旧包排除补 `R35`；`restoreBrowseContext()` 调用数 `2 → 3`、`inAppUpList` 维护点 `3 → 4`；改写 1 条 R34 「首个 parent 成功即 return」旧接线断言为 R36 全量探索断言；新增 R36 **60 条**断言（纯函数 38 / 静态接线·根因护栏·零回归 22） |

### 三类证据（严格分开）

| 类别 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw --mode module -p product=default assembleHap --no-daemon` → **BUILD SUCCESSFUL in 13 s 67 ms**（33 tasks：17 executed / 16 up-to-date），日志出现 `Finished :entry:default@CompileArkTS... after 7 s 577 ms`（**真实编译，非 UP-TO-DATE**），**0 ERROR / 17 WARN**（`preferences` 抛异常、`READ_IMAGEVIDEO` 受限权限、2in1 系统栏 API，与 R35 基线完全一致，全在本轮未改动区域）；签名 HAP **996,788 bytes**（R35 为 971,749），未签名 957,633 bytes |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **561,580 bytes**，R35 为 549,756）检出 **`R36=1 / R35=0 / R34=0`**；`lastDirCtx=1`、`UP_EXPLORE_MAX_FORMS=1`；7 个新纯函数各 2 处进入产物；`flushDirContextSync=3`、`restoreDirContextOnly=2`、`dirOnly=3`（三处恢复入口护栏）、`up FULL=1`、`dironly=1=1`；**覆盖式 `names = n` = 0**、`names = mergeExploreNames(exploreGroups)` 合并仍在 |
| **静态契约 + 纯函数** | **ALL PASS 1662 passed, 0 failed**（R35 为 1602；新增 60 条 R36 断言）；`node --experimental-strip-types`、`node --check`、`git diff --check` 通过；源码相对 HEAD 花括号 / 圆括号 / 方括号净增量各自平衡 |

> ⚠️ **`node --experimental-strip-types` 只剥离 TS 类型、不做完整类型检查；静态契约不能
> 代替真实 ArkTS 编译，编译校验更不能代替真机验证。** 真机 DevEco / 设备安装 / `hdc` /
> `hilog` 侧验证由用户完成。

### 覆盖的验证场景（请在装有 `R36` 新包的机器上执行）

| # | 场景 | 期望 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R36`（仍是 `R35` 及更早说明装的是旧包） |
| 2 | 进入**空目录**（无任何条目）→ 退出 APP → 重开 | 直接停在该空目录，不回默认目录、不弹选择器 |
| 3 | 进入**无图片目录**（只有文档 / 非图片文件）→ 退出 → 重开 | 同上，目录态不因零图片丢失 |
| 4 | 进入**只有子文件夹**的目录（如「人像」）→ 退出 → 重开 | 同上，左栏仍列出该层子文件夹（点名称可重新真实列举） |
| 5 | 在有图片的目录看图 → 退出 → 重开 | **零回归**：直接恢复原图片档案，`POS_KEY_DIRCTX` 被写成 `''`，不误进目录态 |
| 6 | 从深层目录点「往上层」 | 真实列出该父层**全部**资料夹目录（含非当前目录的兄弟目录），不是只显示一个 |
| 7 | 多层 `L0 → L1 → L2 → L3` 连续点「往上层」 | 逐级 `L3→L2→L1→L0`，每次都完整列举，不越级不绕圈 |
| 8 | 反复进入子目录 → 再点「往上层」 | 每次都重新真实列举，目录名 / 层级 / 清单与当前层一致，无残留上一个目录的局部结果 |
| 9 | 恢复后的目录里点 `往上层` / 点某个文件夹行 | 层级链与目录表都正常，不因「启动期零 IO」锁死 |
| 10 | 1.5s 自动重扫 / R32 FOLDER picker 选文件夹 / 只读名单态 | 与 R35 完全一致，零回归、无闪烁、无 appfreeze |

### 边界（刻意保留）

- **用户主动导航是唯一允许真实全量 IO 的入口**。`upFullExploreWanted()` 在自动重扫
  （`startDirPoll()` 每 1.5s）、选文件夹首次进入、点子目录时恒为 `false`，保留 R35 早停，
  绝不把 NAS `listFile` 放大到每轮 5~7 次（R27 `THREAD_BLOCK_6S` 教训）。
- **启动恢复期仍零文件 IO**。`restoreDirContextOnly()` 只读 `preferences` 里的小 key 与
  会话内已还原的 `upDirCache` 快照，纯字符串；真正重新真实列举发生在用户第一次点击时。
- **真实列举一无所获才退回零 IO 清单**。父层完全无 URI 授权、所有形态 `listFile` 都失败时，
  `upExploreNeedFallback(0)` 才允许 `showUpListInApp()`；绝不拿缓存覆盖真实结果，也绝不
  凭空编造目录名凑数。
- **版本恒为 `1.0.7 / versionCode 7`**；未 `push`、未跑 `build.sh`、未把 HAP 放桌面。

---

## 第三十五轮：「往上层」后只显示一个目录 —— 完整探索并列举父层全部目录（2026-11-19，R35）

**用户报障**：按「往上层」之后只显示一个目录，没有探索这一层的其它目录；要求进入父层后
**真正列举该层下的全部目录（含兄弟目录）**，而不是只显示缓存 / 候选构造出来的单一目录。

### 根因：不在事件链，也不在「缓存有没有记过父层」，而在**列举阶段**

R34 已经把事件响应链路修好（三条入口 → `browseUp()` → 层级链 → `openFolder()`），
所以本轮先按数据流核对 `browseUp() → upParentCandidates() → openFolder() → applyItems()`
的每一段，最后定位到 **`openFolder()` 的候选循环**：

```text
browseUp()
  └ upParentCandidates()  → 同层父目录的多个 URI 写法 parents[]
        └ openFolder(parent, false, false)
              └ dirCandidates(parent) → candidates[]（raw / 解码 / FileUri / realPath / hierPath）
                    └ for (c of candidates)
                          n = await fs.listFile(cand)      ← 每个写法都会真列一次
                          ★ 旧版：if (fallbackBase.length===0) { fallbackBase = cand; names = n; }
                          ★ 旧版：if (probeChild(cand, n)) { base = cand; names = n; break; }
                                        └ 两种写法都是**覆盖式赋值**，只保留最后一份 n
```

父层通常**全是子文件夹、本层零图片**，于是 `probeChild()` 恒为 `false`（它只抽查前 12 个
名字里的图片后缀并试 `openSync`），循环不会 `break`、会走完所有候选，但最终 `names` 只有
`fallbackBase` 那一份：**代码探索过多种形态，却把探索结果扔了**。在 picker 逐 URI 授权下，
那一份往往只暴露「被选中的那一个子目录」，其它写法真实列出来的兄弟目录全被丢弃 ——
这就是「只显示一个目录」。

APP 内清单态是同一问题的另一半：`upListNamesOf(target)` 只会收集「与 target 同层的快照
`names`」+ 旧单槽 `lastUpNames` + 恒列的 `currentName`。用户从 picker **直接选深层目录**进入时，
`upDirCache` 里根本没有父层自己的清单快照，于是只剩 `currentName` 一项。

> **结论**：不是「父级候选只命中一个」，也不是「父层目录里真的只有一个子项」，而是
> **列举结果被覆盖 / 父层清单没有来源**。所以修法是「合并而非覆盖 + 从缓存的真实目录结构
> 反推兄弟目录 + 挑列得最全的写法拼子项 URI」，绝不靠凭空补目录名。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十五轮区块三个**纯字符串、零 IO、零抛出**函数：`mergeExploreNames(groups)`（多份 `fs.listFile` 结果并集，按组顺序收纳、按原名去重，过滤空串 / `.` / `..` / 点文件 / APP 内清单伪说明行）、`exploreSiblingNamesOf(levels, target, currentName)`（同层快照 `names` + 以 target 为**直接父级**的更深层路径末段 + `currentName`，反推这一层的兄弟目录）、`exploreBaseOf(forms, groups)`（挑有效条目最多的 URI 写法，并列取第一个） |
| `entry/src/main/ets/pages/Index.ets` | ① `openFolder()` 新增 `exploreForms` / `exploreGroups`，每次成功 `listFile` 都把形态与条目名收进来；**删除两处覆盖式 `names = n`**，循环末统一 `names = mergeExploreNames(exploreGroups)`；② `base` 为空时用 `exploreBaseOf()` 挑列得最全的形态，空结果仍由 `fallbackBase` 兜底，并补 `forms=/names=` 可观测日志；③ `upListNamesOf()` 把 `upDirCache` 转成 `UpCacheLevel[]` 后并入 `exploreSiblingNamesOf()`；④ `ESC_BUILD_TAG` → `R35` |
| `tests/dirname.test.mjs` | 引入三个新纯函数；构建标记 `R34 → R35`、旧包排除补 `R34`；订正文件头注释里被批量替换写错的 R31~R34 历史构建标记；新增 R35 **45 条**断言（纯函数 31 / 静态接线·根因护栏·零回归 14） |
| `README.md` | 抬头 `R34 → R35`；新增本章 |

### 关键设计

- **合并而非覆盖**：`exploreGroups` 收集的每一次 `listFile` 本来就会执行（父层全是子文件夹时
  `probeChild` 恒 false、循环走完所有候选），R35 **零新增 IO**，只是不再丢弃结果。
- **两条落地路径都用完整清单**：真实目录表走 `mergeExploreNames`，APP 内清单走
  `mergeUpListNames(groups)` 且额外并入 `exploreSiblingNamesOf`，伪行 / 隐藏点文件过滤口径一致。
- **绝不编造目录名**：三个纯函数的所有输出都来自「真实 `fs.listFile` 结果 / 缓存里真实列过的
  `names` / 缓存里真实路径的末段名 / 当前目录名」，没有任何按年份、数字、点号猜名字的逻辑。
- **不混入其它层级（R28 回归护栏）**：`exploreSiblingNamesOf` 只认 `sameDirPath` 的同层快照与
  `isStrictParentOf(target, path)` 的**直接**子级；祖先层、孙层、旁支一律排除，
  `canonicalLevelKeyOf` 同时抹平 NAS 的 scheme 授权形态 / 挂载形态 / 百分号编码差异。
- **基准形态按「看得最全」选**：`exploreBaseOf` 让子项 URI 拼在列得最多的那个写法上，
  提高 `statSync` 命中率；全空 / 长度不等 / 空输入都安全退化，绝不越界或返回空形态。
- **零回归**：`probeChild` 仍优先挑「子文件真能读」的形态、`childReadable` / `needFileFallback`
  语义未改；R34 的三条事件入口、无闸门主链、两处 `showUpListInApp` 兜底、缓存优先候选，
  R28~R33 的层级校验 / 多层快照 / 安全编解码 / FOLDER picker 校验，版本 `1.0.7` /
  `versionCode 7`、诊断开关、往上层恒亮不禁用、不弹系统选择器全部未动。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 17 s 217 ms**（33 tasks：18 executed / 15 up-to-date），`CompileArkTS` 真实执行 **10 s 474 ms**、**0 ERROR / 17 WARN**（`preferences` 抛异常、`READ_IMAGEVIDEO` 受限权限、2in1 系统栏 API，与 R34 基线完全一致，全在本轮未改动区域）；签名 HAP **971,749 bytes**（R34 为 962,938 bytes），未签名 934,898 bytes |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **549,756 bytes**，R34 为 546,280 bytes）检出 `R35=1 / R34=0 / R30=1`（`R30` 是 hilog 文案，不是构建标记）；`mergeExploreNames` / `exploreBaseOf` / `exploreSiblingNamesOf` 各 2 处进入产物；**覆盖式 `names = n` = 0**（已从产物彻底消失） |
| **静态契约 + 纯函数** | **ALL PASS 1602 passed, 0 failed**（R34 为 1557；新增 45 条 R35 断言）；`node --check` 与 `git diff --check` 通过 |
| **真机验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R35` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R35`（仍是 `R34` 及更早说明装的是旧包） |
| 2 | 进入深层目录 → 点「往上层」 | 左栏列出**该层全部子目录**（含非当前目录的兄弟目录），不再只有一个 |
| 3 | 父层全是子文件夹（本层零图片）的 NAS 路径 → 点「往上层」 | 多个 URI 写法各自列到的兄弟目录合并进同一份清单，状态栏 `本层没有图片 · N 个子文件夹` 的 N 应显著大于 1 |
| 4 | 父层无授权、降级 APP 内清单 | 清单里出现缓存中曾浏览过的兄弟目录，而不只是当前目录一项；仍**不弹系统选择器** |
| 5 | 逐层进入 `L0 → L1 → L2 → L3` 后连续点「往上层」 | 逐级 `L3→L2→L1→L0`，不越级不绕圈（R34 主链零回归） |
| 6 | 左栏点某个文件夹行 / 1.5s 自动重扫 / 退出重开 | 目录表、当前张、排序、恢复行为与 R34 完全一致，无闪烁、无 appfreeze |
| 7 | 退格 / DEL 键、左栏 `..` 行 | 与按钮一致，三条入口全部正常触发 |
| 8 | 冷启动选目录 / 只读名单态 / R32 FOLDER picker 选文件夹 | 与 R34 之前完全一致，零回归 |

> **边界（必须诚实）**：
> ① 当父层含图片且**首个候选就能打开子文件**时，候选循环仍按既有逻辑在首个可读形态
> `break`，沿用该形态清单 —— 该形态通常已具备完整授权。刻意不为「往上层」额外放大
> `startDirPoll()` 每 1.5s 重扫 / 启动恢复链上的 NAS IO，避免重蹈 R27 的 `THREAD_BLOCK_6S`；
> 也避免把 URI 归一化到不同 provider 的写法混进同一份清单（R28 错误清单的成因）。
> ② APP 内清单是**零 IO 兜底**：父层完全无 URI 授权、且会话缓存里也没有任何其它兄弟目录的
> 真实痕迹时，清单仍只能列出当前目录。此时唯一能拿到完整兄弟目录的办法是重新用
> 「选择文件夹」授权父层；APP **绝不凭空编造目录名**来凑数。
> ③ 真机上的目录可达性仍取决于 picker 逐 URI 授权，编译与静态契约都无法替代实机验证。
>
> ⚠️ **第三十六轮（R36）已收紧本节 ① ②**：用户要求「任何层级、任何时间」都要真实列出
> 父层全部资料夹，故 R36 在**用户主动点「往上层」时**去掉早停、跨所有同层候选合并真实列举；
> 自动重扫 / 选文件夹 / 点子目录与启动恢复期仍严格保留本节 ① ② 的零放大 / 零 IO 边界。
> 详见本章之前的「第三十六轮」章节。

## 第三十四轮：「往上层」无响应修复 —— 缓存索引从唯一闸门降级为优先候选（2026-11-19，R34）

**用户报障（原文）**：「之前的修改反而把功能改坏了：现在触发『返回上层』操作没有任何响应。
请定位并修复该问题，恢复返回上层的正常行为。排查时请聚焦上一层的逻辑结构，厘清它与当前层之间的
调用关系、状态传递与事件响应链路，不要盲目地仅凭缓存记录推断原因。请说明无响应的根因、本次改动
涉及的逻辑范围，并确认修复后返回上层可正常触发且原有功能不受影响。」

（下文沿用 APP 里的按钮名「往上层」，即用户说的「返回上层 / 回上层」。）

### 根因：不是「缓存里缺父级记录」，而是调用结构把事件吞了

先按用户要求完整走一遍**事件响应链路 / 调用关系 / 状态传递**，不先看缓存：

```text
三条入口（R33 全未改动，事件确实到达 browseUp）
  ① 按钮  case 'up'  → doAction() → this.browseUp()
  ② 键盘  KEYCODE_DEL / KEYCODE_BACK → this.browseUp()
  ③ 左栏  ROW_UP（'..' 行）→ onRowTap() → this.browseUp()
        │
        ▼
browseUp()
  ├ folderBusy 早退（正常）
  ├ RESTORE_READONLY && browseBase.length===0 早退（正常）
  ├ const current = this.browseBase
  └ ★ R33 插入的「缓存索引唯一闸门」
       if (upParentBuilt && current.length > 0) {
         TOP / MISS / BADLEVEL / FAIL / OK  ← 五条路径**全部 return**
       }
        ▼（闸门一旦生效，下面整条链永远不可达 → 死代码）
  upNavStateOf → upLevelOf → upParentCandidates → openFolder → showUpListInApp
  （R28~R32 逐轮真机验证过的、唯一真正执行上移 / 出 APP 内清单的层级链）
```

三个层面的结论：

1. **调用关系（主因）**：R33 把「缓存父子索引」从辅助信息**错误提升为 `browseUp()` 入口的唯一
   真值源 + 前置闸门**，且闸门内五条路径全部 `return`。只要闸门生效，下面整条路径层级链就被
   短路成死代码，`openFolder` / `showUpListInApp` 一次都调不到。README 第三十三轮写的
   「原链仅在索引未建立时兜底」在实机上不成立 —— 见下条。
2. **状态传递**：`upParentBuilt` 在恢复链 `restoreUpCache()` 两个出口（**含空缓存**）和每次
   `openFolder` 成功后的 `cacheUpDirSnapshot()` 两个出口都会置 `true`，**全文没有任何复位为
   false 的路径**。因此它是「一旦启动就恒真」的单向锁，闸门恒生效。用户从 picker 直接选一个
   深层目录进入时，`upDirCache` 只有当前一层 → `cachedUpIndexOf()` 建不出任何父子边 →
   `cachedUpStateOf()` 判 `CACHED_UP_TOP`（`minLevel` 正是当前层自己）→ 闸门只写一句状态栏
   文案就 `return`。目录、清单、视图全不动 —— 这就是用户看到的「**没有任何响应**」。
   注意：**缓存里缺父级是常态而非异常**，用「缓存最浅层」冒充「卷根 / 逻辑顶层」是判据错位。
3. **事件响应链路**：三条入口都完好、事件确实进了 `browseUp()`，但被入口闸门吞掉；同时闸门里
   `this.canGoUp = false` 覆盖了 `applyItems` 的同源状态，状态栏与按钮语义互相矛盾。

> 换句话说：**不是数据问题，是控制流问题**。补缓存记录、补父层快照都治不了本 —— 只要
> 「缓存说了算且一律 return」这个结构还在，按钮就恒无响应。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十四轮区块两个纯字符串、零 IO、零抛出函数：`cachedUpPreferredParentOf(index, current, target)`（命中 GO + 严格直接父级 + 与本次逻辑父层同规范层级键时返回缓存父级，否则空串）、`cachedUpPreferredCandidates(preferred, candidates)`（命中则把缓存父级提到候选最前并精确去重，**否则原数组原样返回**）。R33 的索引 / 状态 / 落地校验函数全部保留不动 |
| `entry/src/main/ets/pages/Index.ets` | ① `browseUp()` **整段删除 R33 的「唯一闸门」**（约 48 行、五条 `return` 分支），事件无条件流向原路径层级链；② 在 `upParentCandidates()` 生成同层候选之后、遍历之前接入两个新纯函数，缓存命中仅作**首选候选**；③ `cachedUpLandsAt()` 降级为成功后的**落地一致性诊断**（`up OK … | cache=1/0/-`），不再决定能否上移；④ 顶层恢复由 `upNavStateOf()` + `volumeRootOf()` 判定，不再看缓存 `minLevel`；⑤ 精简 import（移除闸门专用的 `CACHED_UP_TOP/MISS`、`cachedUpStateOf`、`cachedParentOf`）；⑥ `ESC_BUILD_TAG` → `R34`；⑦ 订正四处 R33 过时注释 |
| `tests/dirname.test.mjs` | 构建标记 `R33 → R34`、旧包排除补 `R33`、文件头注释补第三十四轮；**移除 7 条断言「闸门存在」的旧接线断言**（它们断言的正是本轮要修的 bug），新增 R34 **25 条**断言（纯函数 13 / 事件链路·调用关系·状态传递·零回归 12） |
| `README.md` | 抬头 `R33 → R34`；新增本章 |

### 关键设计

- **原链恢复为事件主链**：`browseUp()` 前两个合法早退（`folderBusy` / 只读名单无层级）之后，
  `const current` 无条件进入 `upNavStateOf` → `upLevelOf` → `isStrictParentOf` 严格父级校验 →
  `upParentCandidates` 同层多形态候选 → 逐个 `openFolder(parent, false, false)` → 全失败由
  `showUpListInApp` 出 APP 内清单。**按钮恒有响应**：能上移就上移，列不出就出清单，真到卷根
  给明确提示，绝不静默返回。
- **缓存索引降级为「优先候选佐证」**：初始化预检索 + 触发时复用（R33 的合理部分）全部保留，
  但只在同层候选里把缓存父级**排到最前**，`cachedUpPreferredCandidates` 保证原候选一个不少。
  于是「父子层级一致优先 / 连续返回逐级不漂移」仍成立，而 TOP / MISS / 缺中间层 / 索引未建 /
  target 不同层时一律空串 → 原链照常上移，**缓存再也不能拦事件**。
- **顶层判据归位**：`CACHED_UP_TOP` 的语义是「缓存里最浅的一层」，不是卷根；R34 顶层只由
  `upNavStateOf()` + `volumeRootOf()` 判定，从根上消除「缓存只有一层就被误报成已到最上层」。
- **落地一致性只作诊断**：`cachedUpLandsAt(preferred, current, browseBase)` 写进 `cache=` 诊断字段，
  一致与否都不回滚、不误跳、不影响上移结果。
- **零回归**：三条事件入口、`folderBusy` / `READONLY` 早退、`pickRootUri` 清理、严格父级校验、
  APP 内清单两处兜底、往上层恒亮不禁用、不弹系统选择器、R32 FOLDER picker 校验、R31 安全编解码、
  R30 多层快照持久化、版本 `1.0.7` / `versionCode 7`、诊断开关全部未动。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 19 s 510 ms**（33 tasks：18 executed / 15 up-to-date），`CompileArkTS` 真实执行 **12 s 370 ms**、**0 ERROR / 17 WARN**（`preferences` 抛异常、`READ_IMAGEVIDEO` 受限权限、2in1 系统栏 API，与 R33 基线完全一致，全在本轮未改动区域）；签名 HAP **962,938 bytes**（R33 为 962,004 bytes） |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **546,280 bytes**，R33 为 547,212 bytes）检出 `R34=1 / R33=0 / R32=0`；两个新纯函数各 2 处、`up index built`、`up OK` 进入产物；**闸门诊断串 `up CACHED` = 0**（已从产物彻底消失） |
| **静态契约 + 纯函数** | **ALL PASS 1557 passed, 0 failed**（R33 为 1539；移除 7 条闸门旧断言、新增 25 条 R34 断言）；`node --check` 与 `git diff --check` 通过 |
| **真机启动验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R34` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R34`（仍是 `R33` 及更早说明装的是旧包） |
| 2 | **直接选一个深层目录进入**（缓存只有一层，R33 复现路径）→ 点「往上层」 | **目录正常上移**或出现 APP 内上层清单，绝不再「无响应」 |
| 3 | 逐层进入 `L0 → L1 → L2 → L3` 后连续点「往上层」 | 逐级 `L3→L2→L1→L0`，状态栏 `up OK … | cache=1`（命中缓存父子边），不越级不绕圈 |
| 4 | 在真卷根再点「往上层」 | 提示「已到卷 / 硬盘的逻辑最上层」，保持当前目录不变（由 `upNavStateOf` 判定，不是缓存） |
| 5 | 缓存缺父级 / 缺中间层 / 换授权根后点「往上层」 | 按路径层级链正常上移或出 APP 内清单（`cache=-`），不被缓存拦下 |
| 6 | 退出重开（R30/R31 快照跨会话还原）→ 第一次点「往上层」 | 初始化即预建索引，缓存命中时优先、未命中时照常上移，均有响应 |
| 7 | 退格 / DEL 键、左栏 `..` 行 | 与按钮一致，三条入口全部正常触发 |
| 8 | 冷启动选目录 / 只读名单态 / R32 FOLDER picker 选文件夹 | 与 R33 之前完全一致，零回归 |

> **边界（必须诚实）**：本轮只把「缓存父子索引」从**唯一闸门**降级为**优先候选**，
> 因此第三十三轮规格里「缓存中缺少父级信息时保持当前目录不变、不误跳」这一条**不再生效** ——
> 该条正是导致按钮无响应的直接原因，按本轮「恢复正常行为」的要求必须撤销。现在的行为是：
> 缓存缺信息时按真实目录层级正常上移（或列不出时出 APP 内清单），「不误跳」由
> `isStrictParentOf` / `canonicalLevelKeyOf` 的严格同层校验保证，而非靠「干脆不动」。
> 真机上的目录可达性仍取决于 picker 逐 URI 授权，编译与静态契约都无法替代实机验证。

## 第三十三轮：往上层改走缓存父子逻辑层级（2026-11-19，R33）

**用户规格（原文）**：「触发后应定位到当前目录对应的上一层逻辑目录，而不是简单按路径回退。
功能需在初始化时预先检索缓存中的目录结构，据此确定父子逻辑层级，并在触发时复用结果；
连续返回时保持层级一致，到达顶层或缓存中缺少父级信息时保持当前目录不变、不误跳。
确保回上层后的目录状态与缓存结构中的父子关系一致。」

（下文沿用 APP 里的按钮名「往上层」，即用户说的「回上层」。）

### 现状差距：父级是「触发时按路径剥一层」推出来的

第二十八～三十二轮的 `browseUp()` 已经能处理 NAS 挂载前缀 / URI 形态 / 编码差异，
但父级真值仍然来自**触发时**的路径推导：

```text
browseUp() → upLevelOf(current)             // 按路径字符串剥一层
           → isStrictParentOf(target, current)  // 只校验层级差 1
           → upParentCandidates(...)        // 生成同层不同形态的候选逐个 openFolder
```

`upDirCache`（R29 起的多层真实目录清单快照）只被 `showUpListInApp()` 用来出 APP 内
清单，**完全不参与父子层级判定**。于是有两个不符合本轮规格的地方：
- 父级不是「缓存结构里当前目录对应的上一层」，而是路径推导出来的；
- 缓存里根本没有父级信息时，照样会按路径去试父目录（或在列不出时切到 APP 内清单视图），
  不满足「保持当前目录不变、不误跳」。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十三轮「缓存父子逻辑层级索引」区块（全纯字符串、零 IO、零抛出）：`UpParentEdge` / `UpParentIndex` 两个接口；`CACHED_UP_MISS / TOP / GO` 三个状态常量；`cachedUpIndexOf(levels)` 一次性预建索引、`cachedParentOf(index, current)` 查直接父级、`cachedUpStateOf(index, current)` 判状态、`cachedUpLandsAt(parent, current, landed)` 校验落地层级与缓存一致 |
| `entry/src/main/ets/pages/Index.ets` | ① import 新函数 / 常量 / 接口；② `ESC_BUILD_TAG` → `R33`；③ 新增 `upParentIndex` / `upParentBuilt` 字段与 `rebuildUpParentIndex()`；④ **初始化时**在 `restoreUpCache()` 两个出口（空缓存 / 解码后）预检索缓存结构建索引；⑤ **缓存结构变化时**在 `cacheUpDirSnapshot()` 两个出口刷新索引；⑥ `browseUp()` 开头新增缓存索引优先分支：触发时**只查不建**，非 GO 一律保持当前目录不变，GO 用索引父层 `openFolder(..., false, false)`，成功后做落地一致性校验 |；⑦ 原路径层级链完整保留，仅在索引未建立时兜底 |
| `tests/dirname.test.mjs` | 构建标记 `R32 → R33`、旧包排除补 `R32`、截图 / 真机文案同步；新增第三十三轮 **34 条**断言（纯函数 19 / 源码接线 12 / 零回归 3） |
| `README.md` | 抬头 `R32 → R33`；新增本章 |

### 关键设计

- **初始化预建、触发复用**：`cachedUpIndexOf()` 只在启动恢复回填 `upDirCache` 之后、
  以及每次真实列目录写入快照之后跑；`browseUp()` 触发时只调
  `cachedUpStateOf()` / `cachedParentOf()` 查表，**绝不重新推导路径**。
- **真值源只有缓存**：一层快照的 `path` 是那一层的真实路径，`names` 是真实子目录名。
  父子边要求 `isStrictParentOf()`（恰好差一级）且 `dirLevelOf` 差恰好 1；
  父层 `names` 确实列出该子目录名时优先采纳。**绝不凭空按路径剥一层造父级**。
  `canonicalLevelKeyOf` 抹平 scheme / NAS 挂载前缀 / `%XX` 编码形态差异，
  所以 `file://192.168.100.61/…` 与 `/storage/userExternal/192.168.100.61/…`
  命中同一条边。
- **连续返回层级一致**：同一 `childKey` 只保留一条边，索引在目录结构没变时恒定，
  L3→L2→L1→L0 逐级，不会漂、不会越级、不会绕圈。
- **顶层 / 缺信息不误跳**：`CACHED_UP_TOP`（当前层已是缓存最浅层）与
  `CACHED_UP_MISS`（缓存里没有当前层或没有父级信息）一律 `canGoUp=false` + 明确提示 +
  `return`，**不调 `openFolder`、不切 `showUpListInApp`、不弹选择器**，当前目录原封不动。
  缺中间层的缓存不会建出越级边，因此也不会误跳。
- **落地一致性**：`cachedUpLandsAt()` 要求「索引父层确实是原 current 的直接父级」且
  「实际 `browseBase` 与索引父层是同一个规范层级键」，结果写进状态栏与 `up CACHED OK`
  诊断串；不一致会明确提示「落地层级与缓存不一致，请重新进入目录」，绝不静默。
- **父目录读不出来也保持不变**：`openFolder(cachedParent, false, false)` 返回 false 时
  只给「缓存父级目录不可读取 · 保持当前目录不变」，**绝不退回路径推导兜底**。
- **零回归**：原 `upLevelOf` / `upParentCandidates` / `showUpListInApp` 链、
  「往上层」按钮恒亮、APP 内清单、R32 FOLDER picker 有效起点与返回真值校验、
  R31 安全编解码与核心优先落盘、R30 多层快照持久化、版本 `1.0.7` / `versionCode 7`、
  诊断开关全部未动。新增函数全是纯字符串运算，恢复期仍零 IO。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 15 s 394 ms**（33 tasks：18 executed / 15 up-to-date），`CompileArkTS` **真实执行 8 s 742 ms**、**0 ERROR / 17 WARN**（8 条 `preferences`「Function may throw exceptions」+ 1 条 `READ_IMAGEVIDEO` + 8 条 2in1 系统栏 API，与 R32 基线完全一致，全在本轮**未改动**区域）；签名 HAP **962,004 bytes**（R32 为 949,525 bytes） |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **547,212 bytes**，R32 为 539,212 bytes）检出 `R33=1`（构建标记常量，紧邻 `1.0.7` 与各轮 tag）、`R32=0 / R31=0`；四个新纯函数、`rebuildUpParentIndex`、`up index built` 日志、`up CACHED` 诊断串与三类状态文案全部进入产物 |
| **静态契约 + 纯函数** | **ALL PASS 1539 passed, 0 failed**（1505 → 1539，新增 34 条）；`git diff --check` 通过 |
| **真机启动验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R33` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R33`（仍是 `R32` 及更早说明装的是旧包） |
| 2 | 逐层进入 `L0 → L1 → L2 → L3`（每层都真实列过目录） | 每层写入缓存快照并刷新父子索引 |
| 3 | 连续点「往上层」 | **逐级 L3→L2→L1→L0**，每次状态栏显示「缓存父子层级一致」，不越级不绕圈 |
| 4 | 在 L0 再点「往上层」 | **保持当前目录不变**，提示「已到缓存目录结构的最上层」，`can=0` |
| 5 | 缓存里没有父级信息时（如直接跳进深层、中间层从未列过）点「往上层」 | **保持当前目录不变**，提示「缓存中缺少当前目录的父级信息」，不按路径误跳 |
| 6 | 退出 APP 重开（R30/R31 多层快照跨会话还原） | 初始化时即预建索引，第一次点「往上层」就能按缓存父子层级上移 |
| 7 | NAS 挂载形态与授权 URI 形态混用 | 命中同一条父子边，落地层级仍判定一致 |
| 8 | 冷启动选目录 / 只读名单态 / 换授权根 / R32 FOLDER picker 选文件夹 | 与 R32 完全一致，零回归 |

> **边界（必须诚实）**：本轮把「缓存结构」提升为往上层父级的**唯一真值源**。
> 如果缓存里确实没有当前目录的父级信息（直接跳进一个从未逐层经过的深层目录），
> 按规格会保持当前目录不变并给明确提示 —— 这是为了避免「简单按路径回退」误跳，
> 属于设计取舍而非故障。此时逐层进入一次（让缓存补齐父子结构），或重新用
> 「选择文件夹」打开父层，即可恢复逐级上移能力。
> `upParentBuilt=false`（索引从未建立，如极端早退）时仍走原有路径层级链兜底，
> 保证按钮不会变成完全没反应。

## 第三十二轮：启动阶段文件夹选择误报「不存在该名字的文件夹」（2026-11-18，R32）

**用户报障（原文）**：「进入 APP 时弹出文件夹选择窗口，点击『选择』后错误显示
『不存在该名字的文件夹，请重新选择』……确保成功选择有效文件夹后不再出现该提示且能继续
启动流程，同时保留对文件夹确实不存在或未选择时的明确提示。」

**截图判读（按真实界面，不臆测）**：前台窗口是系统文件管理器
（`com.huawei.hmos.filemanager`）的「选择路径」对话框，路径面包屑为
`192.168.100.61 › 图片档案 › Collection › 4 中 › [奇丘画面] Nine tail Photography`；
底部「文件夹」输入框**完全为空**；APP 状态栏是
`上次目录无法打开 (persist auth lost) · 已立即停止恢复 · 请重新选择文件夹`。
即：启动恢复的持久授权失效 → `giveUpNow('persist auth lost')` 自动打开了 FOLDER picker。

### 先厘清一件事：这句提示不是 APP 弹的

全项目源码、资源文件、**以及完整 git 历史**都搜不到「不存在该名字的文件夹」；
`Index.ets` 里也没有任何 `AlertDialog` / `promptAction` / `CustomDialog` / `TextInput` 弹窗组件。
它是**系统文件管理器**在 FOLDER picker 内对「文件夹名输入框」做的校验提示。
APP 无法改写系统 UI 的文案，但可以修掉**把系统逼到这条校验分支**的接线问题 ——
本轮修的正是后者。

### 问题定位：APP 侧三处接线把有效目录送进了「按名字查找」分支

SDK（`@ohos.file.picker.d.ts`）对 `DocumentSelectOptions.defaultFilePathUri` 的定义是：
「**URI of the file or directory that can be selected. It is empty by default
(the recently opened page is displayed)**」。

1. **FOLDER picker 缺有效起点（主要触发条件）**：`chooseFolder()` 只设了
   `selectMode = FOLDER` / `maxSelectNumber = 1`，**没有 `defaultFilePathUri`**。
   系统只能显示「最近打开的页面」——也就是上次那个授权已失效的 NAS 深层目录，
   且底部「文件夹」名字框为空（截图证实）。用户即使已经导航到有效目录，
   点「选择」时系统仍按空名字去校验，于是对**确实存在的目录**报「不存在」。
   项目里早有 `pickerStartOf()` 专门挑「带 scheme、已授权」的起点，但第二十九轮
   删掉 `chooseFolderAt()` 后再无任何调用点（静态契约甚至断言「Index 不再引用
   `pickerStartOf`」），**起点接线彻底丢失**。
2. **反向把脏串塞给系统（同类误报源）**：`chooseFilesInDir()` 无条件
   `opt.defaultFilePathUri = dirUri`，而 `dirUri` 常是 `dirCandidates()` /
   `upParentCandidates()` 拼出的**纯路径或父 URI**。系统把最后一段当成「文件夹名」
   去查找，找不到就复现同一句误报。
3. **返回值零校验 + 启动结果被丢弃**：`chooseFolder().then` 拿到 `uris[0]` 就直接
   `saveDeadTag('')` → `persistFolderUri()` → `openFolder()`，且 `openFolder()` 的
   `Promise<boolean>` 被 fire-and-forget 丢掉。于是**空名字 / 纯名字 / 无效 URI**
   也会被当成有效目录写进持久授权、清掉死路径记忆；启动流程停在选择窗口，
   而「未选择 / 文件夹确实不存在」在 APP 内**没有明确提示**。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十二轮「FOLDER picker 起点与返回真值校验」区块（全纯字符串、零 IO、零抛出）：四个状态常量 `FOLDER_PICK_NONE / INVALID / OK / UNREADABLE`；`pickerStartSafe(s)` 只认带 scheme 的干净 URI（拒绝纯路径 / 纯名字 / C0 控制字符 / `P1:` 前缀 / 超长）；`folderPickStartOf(browseDir, pickRootUri, savedDirUri)` 按优先级挑起点、去尾斜杠、全不合格返回空串；`pickedFolderUsable(s)` 宽松判定返回 URI（兼容不带 scheme 的绝对路径，但拦下纯名字 / 空串 / 控制字符 / `P1:` 前缀）；`pickedFolderKind(uris)` 收口四种状态；`folderPickHint(kind)` 出三类明确提示 |
| `entry/src/main/ets/pages/Index.ets` | ① import 新函数 / 常量；② `ESC_BUILD_TAG` → `R32`；③ `chooseFolder()` 显式 `opt.defaultFilePathUri = folderPickStartOf(this.browseDir, this.pickRootUri, this.savedDirUri)`，仅在非空时设置 —— 启动阶段两个会话锚点为空，靠 `savedDirUri`（上次 picker 返回的原始 URI）把系统从「失效的最近页面」拉回真实目录；④ `chooseFilesInDir()` 不再直接传 `dirUri`，改走同一安全起点；⑤ picker 结果经 `pickedFolderKind()` 分流：非 OK 只给 `folderPickHint(kind)` 并 `return`，**绝不写持久授权、绝不清死路径记忆、绝不动视图**；⑥ 有效目录才走原「清死路径 → 持久授权 → `openFolder()`」；⑦ `openFolder()` 的 `Promise<boolean>` 用 `.then((ok: boolean) => …)` 收口，失败时保留它自己更具体的「无法列出该目录 · …；可点「选择文件夹」重新选择」只补日志，抛异常才补统一提示；⑧ picker reject 仍给「选择文件夹失败：…」 |
| `tests/dirname.test.mjs` | 构建标记 `R31 → R32`、所有旧包排除列表补 `R31`、截图 / 真机文案同步；`uris[0]` 接线断言改为 `picked`；新增第三十二轮 **30 条**断言（纯函数 17 / 源码接线 10 / 零回归 3） |
| `README.md` | 抬头 `R31 → R32`；新增本章 |

**关键设计**：
- **有效起点优先**：`folderPickStartOf()` 只输出「带 scheme 的干净 URI」，
  把「系统按名字查找」的入口堵死；纯路径 / 纯名字 / `P1:` 快照 / 控制字符
  一律不设起点（SDK 语义下退回「最近页面」，比传一个坏名字安全）。
- **真值而非字符串相等**：是否「有效」以 picker 返回的形态 +
  `openFolder()` 的真实 `fs.listFile` 结果为准，**绝不做目录名字符串比对** ——
  这正是「不误报」的根。
- **三类明确提示一字未丢**：未选择 →「未选择文件夹（已取消）· 可点左栏
  「选择文件夹」重新选择」；名字无效 →「所选文件夹名无效或不存在 · 请重新选择
  文件夹」；确实列不出 → 保留 `openFolder()` 带具体错误原因的
  「无法列出该目录 · …；可点「选择文件夹」重新选择」。
- **零回归**：`openFolder()` / `persistFolderUri()` / `saveDeadTag('')` /
  `giveUpNow()` / 死路径立即放弃 / 「往上层」不弹系统选择器 /
  R31 安全编解码与核心优先落盘 / 版本 `1.0.7` / `versionCode 7` / 诊断开关全部未动。
  恢复期仍然零 IO：新增函数全是纯字符串运算，没有一次 `listFile` / `stat` / `open`。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 12 s 920 ms**（33 tasks：17 executed / 16 up-to-date），`CompileArkTS` **真实执行 8 s 526 ms**、**0 ERROR / 17 WARN**（8 条 `preferences`「Function may throw exceptions」+ 1 条 `READ_IMAGEVIDEO` + 8 条 2in1 系统栏 API，与 R31 基线完全一致，全在本轮**未改动**区域）；签名 HAP **949,525 bytes**（R31 为 941,561 bytes）。详见本节末「编译记录」 |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 **539,212 bytes**，R31 为 534,888 bytes）检出 `R32=1`（构建标记常量，位于字符串常量表，紧邻 `1.0.7` 与各轮 tag）、`R31=0 / R29=0`；四个新纯函数、`chooseFolder start=` 日志、三类新提示文案、`prefsSafeEncode` / `lastBrowseBase` 全部进入产物 |
| **静态契约 + 纯函数** | **ALL PASS 1505 passed, 0 failed**（1475 → 1505，新增 30 条）；`git diff --check` 通过 |
| **真机启动验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R32` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R32`（仍是 `R31` 及更早说明装的是旧包） |
| 2 | 制造 `persist auth lost`（清掉目录授权 / 换 NAS 挂载）后启动 APP | 自动弹「选择路径」，**直接定位到上次的有效目录**，底部「文件夹」名不再为空 |
| 3 | 在该窗口选中有效 NAS 目录 → 点「选择」 | **不再弹「不存在该名字的文件夹」**，picker 直接返回、APP 进入目录浏览并继续启动（本轮回归点） |
| 4 | 点「取消」/ 不选任何目录直接关闭 | APP 给「未选择文件夹（已取消）· 可点左栏「选择文件夹」重新选择」，绝不写持久授权 |
| 5 | 让系统只回一个「名字」（或目录已被删除 / NAS 下线） | APP 给「所选文件夹名无效或不存在 / 无法读取…请重新选择文件夹」，不会假装成功 |
| 6 | 子目录看图 → 退出 APP → 重开 → 点「往上层」 | R31 两项行为零回归：自动恢复原图片、正常返回上一层 |
| 7 | 冷启动首次安装 / 换授权根 / 只读名单态重开 | 与 R31 完全一致，零回归 |

> **边界（必须诚实）**：「不存在该名字的文件夹，请重新选择」是**系统文件管理器**的
> UI 提示，APP 无法改写它的文案。本轮修的是 APP 侧把系统逼到这条校验分支的接线
> （空起点 + 脏 `defaultFilePathUri`）。如果目录**真的**被删除或 NAS 真的下线，
> 系统仍可能提示「不存在」——这是正确行为；此时 APP 侧会给出上表第 5 行的明确指引，
> 用户重新选一个存在的目录即可继续启动流程。

### 编译记录（如实）

- 首次 `assembleHap` 与 `--rerun-tasks` 两次都显示 `CompileArkTS UP-TO-DATE`
  （增量缓存命中，不能当作「本轮代码已编译」的证据）；
- 试 `hvigorw clean` 时被环境挡住：`entry/build` 下产物属主为 `file_manager`，
  当前账号无权删除（`00308004 Operation Error`），HAP 未被清掉；
- 于是在 `DirName.ts` 改了一行注释强制输入变化，再跑一次普通
  `assembleHap --no-daemon`：`CompileArkTS ... after 8 s 526 ms` **真实执行**，
  `BUILD SUCCESSFUL in 12 s 920 ms` / 0 ERROR / 17 WARN，产物重新签名打包。
  **结论以这次为准**。

## 第三十一轮：R30 回归 —— 退出重开不恢复图片 / 「往上层」无响应（2026-11-18，R31）

**用户报障（原文）**：「退出 APP 后再次进入时，应自动恢复并打开退出前原有的图片档案；
执行返回上层操作时，应正常响应并返回上一层界面。」

**复现路径**：装 `R30` 包 → 在 NAS 子目录看图 → 退出 APP → 重新打开 →
① 上次的图片档案不再自动出现；② 点「往上层」像没反应（只给一句「当前是图片列表，没有上层目录」）。

### 问题定位：R30 把含 XML 非法控制字符的文本直接写进 preferences

R30 为跨会话恢复「往上层」层级，新增了 `lastBrowseBase` / `lastUpCache` 两个持久化 key。
其中 `lastUpCache` 是 `encodeUpCacheText()` 产出的**行式文本**，用 `U+0001`(SOH) /
`U+0002`(STX) 作分隔符。HarmonyOS `preferences` 以 XML 持久化 KV，
**C0 控制字符是 XML 1.0 非法字符** —— 这类 value 会让 `putSync` / `flushSync` 抛异常，
甚至写坏整个 KV 文件。四处接线把一次「增强数据写入失败」放大成整条恢复链失效：

1. **写入侧未隔离**：R30 把两个增强 key 的 `put` 排在 `flushSnap()` / `flush()` /
   `flushSync()` **之前**，且与核心「位置 / 相片 / 授权根 / 列表快照」共用同一个 `try`。
   坏 value 一抛，核心状态全部没落盘 → 退出重开不恢复图片。
2. **读取侧未隔离**：两个增强 key 的 `get` 与 `readLastPos()` 主 `try` 共用。
   一旦 `get` 抛异常，整个 `readLastPos` 跳到 `catch` —— `scheduleShowLast()` 根本不排程，
   `lastPos` / 死路径判据 / 预热全部不执行。
3. **导航锚点被清空**：恢复链不跑 → `restoreBrowseContext()` 不执行；而 `setItems()`
   无条件清空 `browseBase` / `browseDir` / `pickRootUri` → `browseUp()` 读到空 `current`
   → `upNavStateOf()` 给 `UP_NAV_NONE` → 只回一句提示就 `return`，用户感知就是「按了没反应」。
4. **稳定失效**：坏数据还可能让恢复链 `giveUpNow()` 写下 `POS_KEY_DEAD`，
   下次启动 `deadMemoryMatches()` 命中即「立即放弃」，形成每次都失败的死循环。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | 新增第三十一轮「preferences 安全编解码」区块：`PREFS_SAFE_TAG = 'P1:'`；`prefsSafeEncode(raw)` 把 `%` → `%25`、C0 控制字符与 DEL → `%HH`，中文 / 可打印字符原样保留，输出恒带 `P1:` 前缀；`prefsSafeDecode(safe)` 只对带前缀的文本反转义，残缺 `%XX` 容错，**无前缀文本一律原样透传**（兼容 R30 裸文本 / 空串 / 含 `%XX` 的 NAS 路径）；`prefsIsLegacyBadCache(text)` 识别含裸 SOH / STX 的旧坏快照；私有 `prefsHexNib()`。四个函数纯字符串、零 IO、零抛出 |
| `entry/src/main/ets/pages/Index.ets` | ① import 三个新函数；② `ESC_BUILD_TAG` → `R31`；③ 新增 `readBrowseExtras(p)`：**契约「绝不抛异常」**，内层 `try` 读两个增强 key，`catch` 一律降级空串；读到 R30 遗留坏数据时丢弃快照并 `saveDeadTag('')` 清死路径记忆，正常数据经 `prefsSafeDecode()` 还原；④ `flushPos()` / `flushPosSync()` 改为**核心状态先单独 `flush()` / `flushSync()` 落盘**，两个增强 key 挪到独立 `try` 单独写 + 单独 flush，失败只 `hilog.warn()`，绝不回卷核心数据、绝不触发外层 `catch` 的异步兜底；⑤ `encodeUpCacheForSave()` 返回 `prefsSafeEncode(raw)`，从根上消除 XML 非法字符；⑥ `restoreUpCache()` 的解码 / 层过滤 / 回填整体包进 `try/catch`，失败只清空缓存，绝不冒泡到 `restoreFromSnapshot()` 的 `catch` 误判整批恢复失败；⑦ catch 三字段按各自类型复位（`upDirCache` / `lastUpNames` 为数组） |
| `tests/dirname.test.mjs` | 构建标记断言 `R30` → `R31` 并在所有旧包排除列表补 `R30`；截图判定 / 真机步骤文案同步；import 三个新函数；新增第三十一轮 **30 条**断言（安全编解码纯函数 15 / 静态接线 11 / 零回归 3 / 类型复位护栏 1），并补一条「catch 三字段按类型复位」护栏防止 ArkTS 类型错误重演 |
| `README.md` | 抬头 `R30` → `R31`；新增本章 |

**关键设计**：
- **核心状态优先**：`POS_KEY_IDX` / `POS_KEY_URI` / `POS_KEY_OK` / `POS_KEY_DIR` / 图片快照
  的 `flush` 先完成，增强 key 后面单独写。即使增强 key 全失败，也只是丢掉「深层层级 +
  多层快照」两项增强能力，退回 R29 语义，**图片恢复绝不丢**。
- **恢复链隔离**：`readLastPos()` 主 `try` 只 `await this.readBrowseExtras(p)`；该方法内部
  吞掉一切异常。`scheduleShowLast()` / `lastPos` / `deadMemoryMatches()` / 预热不再受增强 key 影响。
- **坏数据自愈**：R30 遗留的裸控制字符快照被识别后丢弃，同时清掉可能被 `giveUpNow()`
  写下的 `POS_KEY_DEAD`，打破「每次启动都立即放弃」的稳定失效。
- **兼容性零回归**：`prefsSafeDecode()` 只在 `P1:` 前缀存在时反转义；R30 裸文本、空串、
  含 `%XX` 的 NAS 路径、脏数据一律原样透传（R29 及之前语义完全不变）。
- **恢复期仍零 IO**：`restoreBrowseContext()` / `restoreUpCache()` 全是纯字符串运算，
  防冻结闸门一行未动；真正列父目录仍只发生在用户点击之后。
- 「往上层」既有语义、`browseUp()` 严格层级链 / 父级真值校验 / 候选同层过滤、
  版本 `1.0.7` / `versionCode 7`、诊断开关全部未动。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 14 s 952 ms**（33 tasks：17 executed / 16 up-to-date），**0 ERROR / 17 WARN**（8 条 `preferences`「Function may throw exceptions」+ 1 条 `READ_IMAGEVIDEO` + 8 条 2in1 系统栏 API，与 R30 基线完全一致，全在本轮**未改动**区域）；签名 HAP **941,561 bytes**（R30 为 934,582 bytes） |
| **产物字节码** | `loader_out/default/ets/modules.abc` 与 HAP 内 `ets/modules.abc`（均 534,888 bytes）检出 `R31=1`（构建标记常量，位于字符串常量表，紧邻 `1.0.7` 与各轮 tag）、`R29=0`；`R30` 仅剩 **1 处 hilog 文案**「drop legacy R30 up-cache, clear dead memory」，**不是构建标记**，源码已无 `ESC_BUILD_TAG = 'R30'` 定义；新函数 `prefsSafeEncode` / `prefsSafeDecode` / `prefsIsLegacyBadCache`、`readBrowseExtras`、`P1:` 前缀、`lastBrowseBase` / `lastUpCache`、两条 `save browse extras … failed` 日志全部进入产物 |
| **静态契约 + 纯函数** | **ALL PASS 1475 passed, 0 failed**（1445 → 1475，新增 30 条）；`git diff --check` 通过；`DirName.ts` / `Index.ets` 括号净平衡 0；`node` 实际执行全量断言即语法验证 |
| **真机重启验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

**首轮编译错误与修复（如实记录）**：第一次 `assembleHap` 在 `Index.ets:2564` 报
`10505001 ArkTS Compiler Error: Type 'string' is not assignable to type 'string[]'` ——
新增 `restoreUpCache()` 的 `catch` 把 `lastUpNames`（`Array<string>`）误复位成 `''`。
改为 `[]` 后二次编译通过，并在静态契约里补了「catch 三字段按各自类型复位」断言防止重演。

### 覆盖的验证场景（请在装有 `R31` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R31`（仍是 `R30` / `R29` 说明装的是旧包） |
| 2 | 子目录看图 → 退出 APP → 重新打开 | **自动恢复并打开退出前原有的图片档案**（本轮回归点 ①），标题栏层级正确 |
| 3 | 点「往上层」 | **正常响应并返回上一层界面**（本轮回归点 ②），不再只给「当前是图片列表」提示 |
| 4 | 连续多层进入 / 返回、到卷根 | 严格逐级 L4→L3→L2→L1→L0，不越级、不绕圈，到卷根明确提示 |
| 5 | 冷启动（首次安装 / 清数据）→ 「选择文件夹」→ 逐层进入 / 返回 | 与 R30 完全一致，零回归 |
| 6 | 只读名单态（老快照无授权）重开 → 点「往上层」 | 有层级则继续走层级链，无层级给明确指引，绝不弹系统选择器 |
| 7 | 换一个 picker 授权根 → 退出重开 | 旧授权根的持久化深层 / 快照层被裁决丢弃，不串层 |
| 8 | 从 `R30` 包直接覆盖安装 `R31` 后首次启动 | 自愈逻辑丢弃旧坏快照并清死路径标记，**不再每次启动都直接弹「选择文件夹」** |

> **R30 → R31 升级说明**：若 R30 期间核心位置 key 因写入异常未 flush 而已经丢失，
> 升级后的**第一次**启动可能没有「上次图片」可恢复（数据已在上一版本丢失，无法凭空重建）。
> 此时只需重新打开一次目录 / 图片；R31 退出时会正确落盘，之后每次冷启动都能稳定恢复。
> 自愈逻辑保证不会再出现「每次启动都立即放弃」的死循环。

> 授权边界（与 R29 / R30 同一条）：若持久化层级恰好在授权根、而其父级从未被授权也从未列过，
> APP 内清单仍只能给出已知子目录，不会凭空编造目录名 —— 用「选择文件夹」打开父层一次即可补全。

## 第三十轮：重启后「往上层」层级与内容双错 —— 实际浏览层级持久化 + 多层快照跨会话（2026-11-18，R30）

**复现路径**：退出 APP 前在 picker 授权根的**子目录**里看图（如
`…/[青丘图鉴] Nine tail Photography/2026/编号202618 模特 奶茶`）→ 退出 → 重新打开 →
进入目录浏览并点「往上层」。预期落在直接父级 `2026`（该层全部 `编号XXXX` 子目录可见），
实际却显示错误层级与内容。

### 问题定位：`browseBase` 从不持久化，恢复一律重置到授权根

纯函数探针（`node --experimental-strip-types`）验证：`upContextBaseOf` / `upLevelOf` /
`isStrictParentOf` / `upParentCandidates` 对授权根与子目录的各种 URI 形态（docs 挂载 /
主机 scheme / 纯路径 / 百分号编码）全部给出**正确**的层级与候选 —— 问题不在层级判定，
而在重启后的**运行时状态重建**：

1. **层级跳级**：`browseBase`（用户实际所在的浏览层级）是纯内存态，退出即丢。
   `restoreBrowseContext()` 只用 `savedDirUri`（picker 授权根）重建。用户退出前在
   `编号202618 模特 奶茶`，重开后 `browseBase` 却被重置到授权根 `2026` —— 点「往上层」
   直接跳到 `2026` 的父级 `[青丘图鉴] Nine tail Photography`，**越过了**用户实际所在目录的
   直接父级。
2. **内容缺失**：那个父级没有逐 URI 授权，`fs.listFile` 全部失败 → 降级 APP 内清单；
   而 R29 的 `upDirCache` / `lastUpNames` 也是纯内存态，重启后全空 → 聚合结果只剩
   「恒列当前目录」一项。层级与内容同时错误，正是用户看到的现象。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | ① 新增 `isSameOrUnderLevelOf()`：用规范层级键判「同层或在其之下」（任意深度），抹平 scheme / 挂载前缀 / 编码形态；② 新增 `restoreBrowseLevelOf()`：恢复层级裁决 —— 持久化深层与授权根同层或在其之下才采纳，越级 / 旁支 / 垃圾值 / 空值一律回退授权根（R29 及之前语义零回归）；③ 新增 `rawBrowseFormOf()`：用 picker 原始授权 URI 的**同 scheme / 同编码习惯**拼出更深层目录的 URI（授权根含 `%` 时逐段编码），`browseUp` 的候选 ① 剥一层即得授权形态父 URI；④ 新增 `UpCacheLevel` 接口与 `encodeUpCacheText()` / `decodeUpCacheText()`：多层清单快照的行式编解码（`SOH`/`STX` 分隔，文件名不可能出现），层 / 条目 / 总长三重封顶，解码侧剔除伪行、坏 kind 按 -1、同层保留最后一份 |
| `entry/src/main/ets/pages/Index.ets` | ① 新增持久化 key `POS_KEY_BROWSE`（`lastBrowseBase`，实际浏览层级）与 `POS_KEY_UPCACHE`（`lastUpCache`，多层快照行式文本），容量常量 12 层 × 64 条 × 12000 字符；② `readLastPos()` 一并读回（小 key，与既有 5 个位置记忆 key 同批异步读）；③ `restoreBrowseContext()` 改用 `restoreBrowseLevelOf` 裁决层级、`rawBrowseFormOf` 拼 `browseDir`（`pickRootUri` 恒为授权根原始形态），并调 `restoreUpCache()` 解码快照；④ 新增 `restoreUpCache()`：只保留「授权根子树 ∪ 恢复层级祖先」的层（换过授权根的旧层丢弃），`uris` 不持久化（授权形态重启后可能失效，`upListUriOf` 有 target 拼名兜底），旧单槽同步指向最深层；⑤ `flushPos()` / `flushPosSync()` 与 `POS_KEY_DIR` 一起落盘两个新 key（快照仅 `upCacheDirty` 时写，切后台 / ESC 退出毫秒级必达）；⑥ `cacheUpDirSnapshot()` 置脏标记；⑦ `ESC_BUILD_TAG` → `R30` |
| `tests/dirname.test.mjs` | 构建标记 `R29` → `R30` 并补 `R29` 旧包排除；更新 1 条因实现变化失效的锚点护栏（拆成 3 条更精确的 R30 接线断言）；新增第三十轮 **46 条**断言（层级裁决 9 / 从属与形态 7 / 编解码与容错 9 / Index 静态接线 11 / 常规导航零回归 6，含复现路径端到端纯函数推演） |
| `README.md` | 抬头 `R29` → `R30`；新增本章 |

**关键设计**：
- 恢复链仍是**零 IO**：`restoreBrowseContext` / `restoreUpCache` 全是纯字符串运算，不
  `listFile` / `statSync` / 弹选择器，防冻结闸门一行未动；真正列父目录仍只发生在用户点击之后。
- 「往上层」的既有语义零改动：严格层级链、父级真值校验、候选同层过滤、逐级上移到卷根停、
  `pickRootUri` 成功上移后清空 —— 全部保持 R29 形态。
- 持久化快照 uris 刻意不存：重启后授权按 URI 字符串发放，旧子项 URI 可能失效；
  `upListUriOf()` 的 `target + '/' + 名字` 兜底与 R29 行为一致。
- 诊断串新增 `deep`（恢复到比授权根深的层）与 `uc=N`（还原的快照层数），`Ctrl+D` 可直接判读。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 17 s 33 ms**（真实 `CompileArkTS` 10 s 272 ms），签名 HAP **934,582 bytes**；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 `R30=1 / R29=0 / R28=0 / R27=0`，且新 key `lastBrowseBase` / `lastUpCache` 已进入产物；**0 ERROR**，17 条告警与 R29 基线完全一致（8 条 `preferences`、1 条 `READ_IMAGEVIDEO`、8 条 2in1 系统栏 API），全部落在本轮**未改动**区域 |
| **静态契约 + 纯函数** | **ALL PASS 1445 passed, 0 failed**（1399 → 1445，新增 46 条）；含复现路径端到端推演（`restoreBrowseLevelOf` 采纳深层 / 拒绝越级、`rawBrowseFormOf` 编码 / 未编码两种授权形态、快照往返一致、伪行与坏 kind 容错、容量封顶）；`node --check` 通过 |
| **真机重启验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R30` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层 | 右下角出现 `R30`（仍是 `R29` / `R28` 说明装的是旧包） |
| 2 | 打开 `…/2026/编号202618 模特 奶茶` 子目录看图 → 退出 APP → 重新打开 | 直接出图（与之前一致），标题栏显示 `编号202618 模特 奶茶` 而不是 `2026` |
| 3 | 点「往上层」 | 落在**直接父级 `2026`**（不再跳到 `[青丘图鉴] Nine tail Photography`），且是真实目录列表：该层全部 `编号XXXX` 子目录都在（授权根本身有授权，能被 `fs.listFile` 列出） |
| 4 | 在 `2026` 再点「往上层」 | 走 R29 既有链路：授权形态父 URI 候选 / APP 内清单聚合，行为与不重启时一致 |
| 5 | 退出前先在 `[青丘图鉴] Nine tail Photography` 浏览过一次，再进子目录，退出重开，连点两次「往上层」 | 第二次进入父层 APP 内清单时，**上次见过的兄弟目录仍在**（快照跨会话恢复），不再只剩当前目录一项 |
| 6 | 冷启动（首次安装 / 清数据）→ 「选择文件夹」选目录 → 逐层进入 / 返回 | 与 R29 完全一致：逐级上移、不越级、不绕圈、到卷根停 |
| 7 | 只读名单态（老快照无授权）重开 → 点「往上层」 | 与 R29 一致：有层级则继续走层级链，无层级给明确指引，绝不弹系统选择器 |
| 8 | 换一个 picker 授权根（「选择文件夹」选别的目录）→ 退出重开 | 旧授权根的持久化深层 / 快照层被裁决丢弃，不串层 |

> 授权边界（与 R29 同一条）：若持久化层级恰好在授权根、而其父级从未被授权也从未列过，
> APP 内清单仍只能给出已知子目录，不会凭空编造目录名 —— 用「选择文件夹」打开父层一次即可补全。

## 第二十九轮：上层清单只列 `2026` 且混入伪目录 —— 多层真实清单快照 / 全子目录聚合 / 授权同形态父 URI（2026-11-16，R29）

**复现路径**：`/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026`，点「往上层」进入父目录 `[青丘图鉴] Nine tail Photography`。
该层除 `2026` 外还有其它兄弟目录，APP 内清单必须**全部列出**，不能只纳入 `2026`。

### 截图证据（`@image#1:screenshot_20261116_045747_com.workbuddy.heicviewer.jpg`，R28 包）

| 位置 | 读到的内容 | 含义 |
|---|---|---|
| 右下角诊断 | `100% R28 · full:F · win:T · keys4 · dsp:0 · hk:N · wf:T` | 确认装的是 R28 包，问题不是旧包残留 |
| 顶栏 / 左栏抬头 | `[青丘图鉴] Nine tail Photography` / `APP 内上层「[青丘图鉴] Nine tail Photography」清单（3 项）· 点目录名进入 · 不弹系统选择器 · ul1` | R28 的卷根 / 父级修复已生效，**确实进对了父层**，但仍走 APP 内降级清单 |
| 左栏清单 | `..` / `2026` / **两条带文件夹图标的** `— 上层清单（APP 内）· 点目录名进入 · ul1 —` / 一条真正的说明行 | 真实兄弟目录一个都没有，反而把清单自己追加的说明行缓存下来渲染成可点文件夹 |
| 右侧预览 | `本层没有图片 · 点左窗文件夹进入子目录` | 降级清单态无真实图片，进一步说明父目录没有被真正列出来 |

### 问题定位：**没有**任何「只保留 2026」的判断 / 筛选 / 配置

源码里不存在 `2026` 字面量过滤（`2026` 只是当前目录名）。上层内容被压成单一 `2026` 是三处结构性缺陷叠加，全在**会话缓存与候选生成**，与图片解码、ESC、卷根判定无关：

1. **缓存被 APP 内清单污染**：`openFolder()` 建立「上一层清单」时读的是 `this.rows`（**上一屏 UI 行**）。用户处在 APP 内清单态时，`this.rows` 里除了 `..` 与 `2026`，还含清单自己 push 的说明行 `— 上层清单（APP 内）… —`。它照样被写进 `lastUpNames`，下一次 `showUpListInApp()` 又把这行按 `ROW_FOLDER` 渲染 —— 截图里两条带文件夹图标的伪目录就是这么来的。
2. **单槽缓存 + 命中判定把父层完整清单弄丢**：`lastUpPath` / `lastUpNames` 只有一个槽位，任何一次 `openFolder` 都覆盖它。用户从父层进入 `2026` 后，父层那份含全部兄弟目录的清单一旦被其它层覆盖，`showUpListInApp()` 的 `sameDirPath(lastUpPath, target)` 就命中不了；代码里**唯一恒定存在**的行是「恒列当前目录」，于是清单只剩 `2026`。这就是「上层内容被限制为单一 2026 目录」的直接成因。
3. **父目录 URI 候选丢了授权形态**：picker 的 URI 授权按 URI 字符串发放，但 `openFolder()` 每次成功都会把 `browseDir` 覆写成子目录路径。R28 的 `upParentCandidates()` 只从 `browseDir` / 当前路径推父级，原始 `file://docs/...`、`file://<host>/...` 形态不再出现，`fs.listFile(父目录)` 全部失败 → 只能走 APP 内降级清单。**父目录真列不出来，就永远拿不到该层的全部子目录。**

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | ① 新增 `isUpListPseudoName()`：只按 APP 自己生成的说明行特征识别伪条目，绝不用「含数字 / 年份 / 点号」这类会误伤 `2025`、`4 中`、`Vol.2` 的规则；② 新增 `mergeUpListNames()`：多组来源逐组保序收纳、过滤伪行、按**原名**去重（不 trim，真机目录名可带首尾空格），一份都不漏；③ 新增 `rootFormParentOf()`：按规范层级键算层级差，从 picker 原始授权 URI 尾部剥段，还原出与授权**同 scheme / 同编码习惯**的父层 URI，越级 / 旁支 / 层级判不出一律返回空串；④ `upParentCandidates()` 增加可选 `extraRoots`，把上述同形态父 URI（含解码 / 百分号编码写法）补进候选，仍全部经 `canonicalLevelKeyOf` 严格同层过滤 |
| `entry/src/main/ets/pages/Index.ets` | ① 新增 `UpDirSnapshot` 接口与 `upDirCache` **多层**真实清单快照（上限 24 层，含 `names` / `uris` / `kinds` 三列）；② `openFolder()` 改用本次 `fs.listFile` 真实结果建好的**局部 `rows`** 调 `cacheUpDirSnapshot(base, rows)`，彻底不碰 `this.rows`，过滤 `ROW_UP` 与伪行，同层快照按名字**合并**而非覆盖，并保留旧单槽兼容；③ 新增 `upListNamesOf()` / `upListUriOf()` / `upListKindOf()`：把目标层全部快照 + 旧单槽 + 当前目录名聚合，兄弟目录优先用当时真正能 `listFile` 的 base 拼出的 URI（保证「能访问」），并用 `statSync` 判出的真实种类渲染，带点目录名（`Vol.2`）不会被误判成不可点的 `ROW_OTHER`；④ `showUpListInApp()` 逐条渲染聚合结果，说明行仍只追加一条，当前目录仍用已知真实路径；⑤ `browseUp()` 把 `pickRootUri` / `browseDir` / `savedDirUri` 一起交给 `upParentCandidates()`，让父目录有机会被真正列出；⑥ `ESC_BUILD_TAG` → `R29` |
| `tests/dirname.test.mjs` | 构建标记 `R28` → `R29` 并补 `R28` 旧包排除；更新 3 条因实现变化失效的结构护栏；新增第二十九轮 **55 条**断言（伪行识别 / 多源聚合完整无遗漏 / 截图端到端复现 / 授权同形态父 URI / 父候选补全 / Index 静态接线 / 目录结构与导航零回归） |
| `README.md` | 抬头 `R28` → `R29`；新增本章 |

**关键设计**：
- `mergeUpListNames()` 对非 NAS 路径、单组输入逐字等价于旧行为；伪行判定只匹配 APP 自己生成的说明行，目录结构、目录名、排序、翻页、导航一律不动。
- 多层快照用 `sameDirPath()`（R28 的规范层级键）判「同一层」，scheme / 逻辑 / 挂载三种写法归一，不会把别的层级混进清单。
- `rootFormParentOf()` 的产物仍要过 `upParentCandidates()` 的同层过滤，绝不因为「补候选」引入越级 / 绕圈；`pickRootUri` 依旧只作候选来源，不作层级锚点，成功上移后照旧清空。
- `showUpListInApp()` 仍是**零 IO**、不弹系统选择器、不动恢复模式；`UP_LIST_TAG` 保持 `ul1`，清单计数仍是 `rows.length - 2`，版本仍 `1.0.7` / `versionCode 7`。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 12 s 145 ms**（真实 `CompileArkTS` 7 s 300 ms），签名 HAP **899,710 bytes**；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 `R29=1 / R28=0 / R27=0 / R26=0`；**0 ERROR**，仅剩既有 17 条告警（8 条 `preferences`、1 条 `READ_IMAGEVIDEO`、8 条 2in1 系统栏 API），告警行全部落在本轮**未改动**区域；新增的 `UpDirSnapshot` / `mergeUpListNames` / `rootFormParentOf` 零告警 |
| **静态契约 + 纯函数** | **ALL PASS 1397 passed, 0 failed**（1342 → 1397，新增 55 条）；含 8 个兄弟目录 + 2 个补充目录的聚合断言、截图污染形态端到端复现（结果 `2026\|2025\|2024\|合集`、伪行归零）、`node --check` / `git diff --check` / 版本守卫全绿 |
| **真机 NAS 多目录验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝、无 NAS 访问。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R29` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层，看右下角角标 | 出现 `R29`（仍是 `R28` / `R27` 说明装的是旧包） |
| 2 | 打开复现路径 `…/[青丘图鉴] Nine tail Photography/2026` | 当前目录图片正常，与 R28 一致 |
| 3 | 点「往上层」 | 进入 `[青丘图鉴] Nine tail Photography`，左栏抬头变成该父目录名 |
| 4 | 看左栏清单 | 列出该层**全部**子目录：除 `2026` 外，所有非 2026 兄弟目录（年份目录 / 合集 / 其它命名）都在，一个不漏 |
| 5 | 看清单里有没有伪目录 | **不再**出现任何 `— 上层清单（APP 内）· 点目录名进入 · ul1 —` 带文件夹图标的行；说明行最多一条 |
| 6 | 点任一非 2026 兄弟目录 | 能正常进入该目录（用快照里的真实子项 URI），图片 / 子目录正常；点 `2026` 能回到原目录 |
| 7 | 逐级连点「往上层」 | `2026` → `[青丘图鉴]…` → `4 中` → `Collection` → `图片档案` → `192.168.100.61`（卷根）后停下，不越级、不绕圈 |
| 8 | 先在父层浏览一次（让该层完整清单进入快照），再进入 `2026`，再反复进出其它子目录后点「往上层」 | 父层清单仍**完整**（多层快照不被覆盖），不会退化成只剩 `2026` |

> 若「往上层」这次真的把父目录列出来了（`fs.listFile` 成功），左栏就是系统返回的完整目录表，天然包含全部兄弟目录；
> 若仍因逐 URI 授权拿不到而进入 APP 内清单态，左栏也应给出会话内聚合出的全部真实子目录，且不再有其它层级的文件夹名。

**授权边界（必须说清，不能夸大）**：picker 的目录授权通常只覆盖「选中的那一层及其子层」，不一定覆盖父层。
若用户是**直接选中 `…/2026`** 进入的，`fs.listFile(父层)` 在任何 URI 写法下都拿不到授权，
APP 也就无从得知该层还有哪些兄弟目录 —— 此时左栏只能给出会话内确实列过的真实子目录，
不会凭空编造目录名。R29 新增的 `extraRoots` 专门覆盖另一种更常见的流程：
用户**先选中父层 `[青丘图鉴] Nine tail Photography`**（`savedDirUri` 就是父层原始授权 URI），
再点进 `2026`，此时 `rootFormParentOf()` 直接把该授权 URI 作为父层候选交给 `fs.listFile`，
父层能被真正列出 → 全部兄弟目录自然到齐。
若真机上确认属于「直接选中子目录」的情形，请用「选择文件夹」打开父层一次，
该层完整清单即进入多层快照，此后反复进出子目录都不会再退化成只剩 `2026`。

## 第二十八轮：NAS 路径点「往上层」显示错误文件夹清单 —— 挂载前缀卷根 / 规范层级键 / 真实子目录（2026-11-16，R28）

**复现路径**：`/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2026`。
点「往上层」应进入父目录 `…/[青丘图鉴] Nine tail Photography` 并列出其真实子目录。

### 截图证据（`@image#1:screenshot_20261116_031348…jpg`）

| 位置 | 读到的内容 | 含义 |
|---|---|---|
| 左栏抬头 | `2026` + `APP 内上层「2026」清单（10 项）· 点目录名进入 · 不弹系统选择器 · ul1` | 走的是**降级 APP 内清单**，且目标层级没有真正上移 |
| 左栏列表 | `..` → `/` → `storage` → `userExternal` → `192.168.100.61` → `图片档案` → `Collection` → `4 中` → `[青丘图鉴] Nine tail Photography` → `2026` → `编号202618 模特 奶茶` | 把**整条祖先路径链**当成了「上层文件夹」逐行列出，正是用户说的「显示其他层级的文件夹列表」 |
| 底部状态栏 | `无法列出该目录 · {"code":13900002}；可点「选择文件夹」重新选择` | 父目录 URI 所有候选 `fs.listFile` 全部失败，才触发降级清单 |
| 右侧预览 | `本层没有图片 · 点左窗文件夹进入子目录` | 清单态没有真实图片，进一步说明没有真正进入父目录 |

### 问题定位（三处叠加，全在**层级判定 / URI 形态**，与图片解码、缓存、ESC 无关）

1. **真机 NAS 路径不是 `/<host>/...`，而是挂在系统目录之下**：
   `/storage/userExternal/192.168.100.61/图片档案/Collection/4 中/…`。
   第八轮（`2026-11-12`）的 `volumeRootOf()` 只认 `parts[1]` 是网络主机的情形，
   遇到 `parts[1] === 'storage'` 就退回通用 POSIX 卷根 `/`。于是 `pathChainOf()`
   从 `/` 起逐段累加，把 `/`、`storage`、`userExternal`、`192.168.100.61`
   四层**系统 / 主机目录**当成可浏览文件夹塞进「上层清单」；`dirLevelOf()` 也从
   5 虚高到 8，层级诊断全错。
2. **同层判定把「授权形态」与「挂载形态」判成不同层**：
   picker 逐 URI 授权给的是 `file://192.168.100.61/…`，`hierPathOf()` 得
   `/192.168.100.61/…`；而 `fs.listFile` 实际用的 `browseBase` 是
   `/storage/userExternal/192.168.100.61/…`。旧 `sameDirPath()` 直接比这两个字符串，
   **永远不相等** —— `upParentCandidates()` 把最可能仍带授权的 `file://<host>/…`
   父 URI 全部过滤掉，只剩 1 条未编码纯路径。带**中文 + 空格 + 方括号**的
   `…/[青丘图鉴] Nine tail Photography` 在 URI 形态下需要百分号编码，未编码写法
   直接 `13900002`，整批候选全灭 → 降级伪清单。
3. **降级清单把「路径链」当成了「目录项」**：`showUpListInApp()` 无条件
   `pathChainOf(target)` 逐层 `push` 成 `ROW_FOLDER`。即便父目录真的列不出来，
   也不该把祖先层级画成父目录的子目录 —— 这是截图错误画面的直接渲染来源。

### 改动范围

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/DirName.ts` | ① 新增 `nasHostIndexIn()`：在路径前 4 段内定位网络主机段，兼容 `/<host>/…` 与 `/storage/userExternal/<host>/…`，且不误判深层同名目录；② `nasHostOf()` 改为扫描前 4 段；③ `volumeRootOf()` 用 `nasHostIndexIn()` 取卷根（含挂载前缀），非 NAS 路径逐字不变；④ 新增 `canonicalLevelKeyOf()`：剥掉挂载前缀，让 scheme / 逻辑 / 挂载三种写法归一到同一层级键；⑤ `sameDirPath()` 改用它；⑥ 新增 `encodePathForm()`：逐段 `encodeURIComponent`，空格→`%20`、方括号→`%5B/%5D`、中文→UTF-8 `%XX`，保留 `scheme://` 与 `/`，已编码串返回空串绝不重复编码；⑦ `upParentCandidates()` 的「同层过滤」改用规范键，并补 `file://<host>/…`、逻辑路径、挂载路径、两种百分号编码形态共 5 类候选；⑧ 新增 `isStrictParentOf()`：校验恰好剥一层，杜绝原地不动 / 越级 / 旁支 |
| `entry/src/main/ets/pages/Index.ets` | ① `browseUp()` 接入 `isStrictParentOf(target, current)` 父级真值校验，不通过则给 `up BADLEVEL` 诊断并拒绝上移（仅严格层级链 GO 态启用，`loose` / 卷根判不出时跳过，其它导航零改动）；② `showUpListInApp()` **彻底切断「层级链 → 目录清单」映射**：左栏只列父目录真实子目录（会话内 `lastUpNames` 缓存 + 恒列当前目录并按名字去重），`pathChainOf(target)` 仅用于 `diagLine` 层级计数；③ 引入 `isStrictParentOf`；④ `ESC_BUILD_TAG` → `R28` |
| `tests/dirname.test.mjs` | 23 处构建标记 `R27` → `R28` 并补 `R27` 旧包排除；更新第八轮 NAS 静态护栏（旧护栏钉死 `isNetworkHost(parts[1])` 字面量，改为要求通用扫描 + 三个新纯函数）；新增第二十八轮 **68 条**断言（复现路径混合目录名、挂载形态卷根 / 层级 / 清单、规范层级键、同层判定、百分号编码、父级真值、父 URI 候选、Index 静态接线、其它导航零回归） |
| `README.md` | 抬头 `R27` → `R28`；新增本章 |

**明确不动**：`openFolder()` 的候选试列逻辑、`fs.listFile` 调用、当前目录读取与图片解码、
`RawStore` 真异步读取（R27）、`RawCache` 超时闸门、方向键翻页（R26）、ESC 两态退出全链路、
诊断层开关（R25）、`PRELOAD_*` 与 `RAW_CACHE_*` 常量、`bulkIoAllowed()` ro1 总闸门、
启动恢复路径、`InteractionPlan.ts`、`AppScope/app.json5`（版本仍 `1.0.7` / `versionCode 7`）。
「往上层」到卷根 / 到顶 / UNKNOWN 宽松父级等既有导航行为一律保留。

### 回归验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 14 s 804 ms**（真实 `CompileArkTS` 8 s 538 ms），签名 HAP **883,496 bytes**；`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 `R28=1 / R27=0`；**0 ERROR**，仅剩既有 17 条告警（8 条 `preferences` 可能抛异常、1 条 `READ_IMAGEVIDEO` 权限、8 条 2in1 系统栏 API 不可用），告警行全部落在本轮**未改动**区域；`encodeURIComponent` 等新增调用零告警 |
| **静态契约 + 纯函数** | **ALL PASS 1342 passed, 0 failed**（1274 → 1342，新增 68 条）；`node --check` / `git diff --check` / 注释剥离后括号净平衡 / 版本守卫全绿 |
| **真机 NAS「往上层」验证** | ⚠️ **本会话无法自行完成**：`hdc` 无目标、`bm install` 失败、`hilog` 权限拒绝、无注入工具、无法在真机打开 NAS 目录。**编译校验 ≠ 真机验证** |

### 覆盖的验证场景（请在装有 `R28` 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层，看右下角角标 | 出现 `R28`（若仍是 `R27` / `R26` 说明装的是旧包） |
| 2 | 打开复现路径 `…/[青丘图鉴] Nine tail Photography/2026`，确认当前目录图片正常 | 当前目录读取与 R27 一致，零回归 |
| 3 | 点「往上层」 | 进入 `[青丘图鉴] Nine tail Photography`；左栏抬头变成该父目录名 |
| 4 | 看左栏清单 | 只列父目录的**真实子目录**（含 `2026`），**不再**出现 `/`、`storage`、`userExternal`、`图片档案`、`Collection`、`4 中` 等祖先层级 |
| 5 | 看底部状态栏 | 不再出现 `无法列出该目录 · {"code":13900002}` |
| 6 | 逐级连点「往上层」 | `2026` → `[青丘图鉴] Nine tail Photography` → `4 中` → `Collection` → `图片档案` → `192.168.100.61`（卷根）后停下，不越级、不绕圈 |
| 7 | 点清单里的 `2026` 行 | 回到原目录，图片正常显示 |
| 8 | 换一个含中文 / 空格 / 方括号 / 英文 / 数字混合目录名的 NAS 路径重复 2–6 | 父目录层级与显示名始终精确，不被拆解或误判成主机 |

> 「往上层」若因上级逐 URI 授权确实拿不到而进入 APP 内清单态，左栏也只会显示
> 父目录的已知真实子目录与 `..` 行，不再显示任何其他层级的文件夹列表。

## 第二十七轮：NAS 路径 `THREAD_BLOCK_6S` —— 原始档案读取真异步化 + 到点即放弃（2026-11-16，R27）

用户提供一份真机 appfreeze 日志，描述「打开 NAS 路径浏览图片，在缓存图中出现严重卡顿」：

```
Device info:HUAWEI MateBook Pro S   Version:1.0.7   VersionCode:7
Reason:THREAD_BLOCK_6S   appfreeze: com.workbuddy.heicviewer THREAD_BLOCK_6S at 20261116013719
Process Memory(kB): 939796(Rss)   I/O read_bytes ≈ 692555776
Current Running: start at 2026-11-16 01:37:12.100,
  Event { task name = fs.listFile, caller = [ohos_js_environment_impl.cpp(PostTaskToHandler:72)] }
  —— completeTime 为空，主线程被这一个任务占住 6 秒
JS 栈顶：read (Index.ets:1062:30) = fs.readSync(file.fd, buf)
       → ensure (Index.ets:1035:53) = Promise.resolve(this.read(...))
       → preloadOne → pumpAll → startAllPreload → schedulePreload → applyItems → openFolder
native 栈：read+44 / uv_fs_read / libfs.z.so
```

### 根因：`ensure()` 是**伪异步**

`RawStore.read()` 名义上被 `Promise.resolve<ArrayBuffer | undefined>(this.read(uri, gen))`
包成 Promise，但 JS 求值顺序决定了 `this.read(...)` 在 `Promise.resolve` 的**参数位置就同步执行完了**：

1. `fs.statSync` / `fs.openSync` / `fs.readSync` / `fs.closeSync` 四次同步跨进程 IO；
2. `new ArrayBuffer(size)` 大内存清零（第二份 dump 栈顶 `memset` 即此）；
3. `pumpAll` 一批并发 4 张（`PRELOAD_CONCURRENCY = 4`）连续发起上述同步调用，
   且 `PRELOAD_ALL_YIELD_MS = 0`，批与批之间不让出主线程。

NAS 网络往返叠加到 6 秒，直接触发 `THREAD_BLOCK_6S`。日志里的
`read_bytes ≈ 660MB`、`Rss ≈ 918MB` 也与 `RAW_CACHE_MAX_BYTES = 768MB` 的预算吻合 ——
**不是内存爆了，是主线程被同步 IO 占死了**。

### 改动范围（2 个源码文件 + 测试 + 文档）

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/common/RawCache.ts` | 新增两个纯函数判据：`rawIoTimeoutMs(size, baseMs, perMbMs, capMs)`（按体积加权、硬上限夹界、非有限数归零、恒返回有限整数）与 `rawDenyAfterFailure(genChanged, ioFailed, timedOut)`（换源绝不拉黑、IO 失败 / 超时立即放弃）；零 SDK 依赖，Node 可直接回归 |
| `entry/src/main/ets/pages/Index.ets` | ① `RawStore.read()` 改 `private async ... Promise<ArrayBuffer \| undefined>`，`stat/open/read/close` 全换 Promise 版并 `await`，主线程在每个 `await` 让出；② `ensure()` 废除 `Promise.resolve(this.read(...))` 伪异步，改走新增的 `readGuarded()` 超时闸门（`setTimeout` + `settled` 单闸 + `rawIoTimeoutMs` 上限 + `rawDenyAfterFailure` 拉黑）；③ 新增 `RAW_IO_BASE_MS=400` / `RAW_IO_PER_MB_MS=120` / `RAW_IO_CAP_MS=8000` 三个常量；④ `decodePx()` 的 fd 兜底 `fs.openSync` / `fs.closeSync` 也改 `await fs.open` / `await fs.close`；⑤ `ESC_BUILD_TAG` → `R27`；⑥ 同步更正 6 处过时注释 |
| `tests/dirname.test.mjs` | 7 处构建标记断言 `R26` → `R27`；2 处旧同步 IO 断言改为异步；3 条「全源码零 `new Promise`」护栏**收紧**为「启动恢复路径零 `new Promise`」并新增总数判据；新增第二十七轮 21 条静态契约与纯函数回归 |
| `README.md` | 抬头构建标记 `R26` → `R27`；功能表「后台预载」行补注；新增本章 |

**没有改动**：`InteractionPlan.ts`、`AppScope/app.json5`（版本仍 `1.0.7` / `versionCode 7`）、
`FailFast.ts` / `RestoreTimeout.ts` 等其它纯函数模块、`onKey()` 任何分支、UI 布局与任何其它文件。

### 关键设计点

- **真异步是根治，不是缓解**：只有把同步 IO 换成 Promise 版，主线程才会在每个 `await` 处让出；
  在此之前应用**没有能力**自己设超时（同步 IO 的超时由平台决定、应用无法缩短，见 `FailFast.ts` 的边界声明）。
- **原子性不变**：所有 `await` 集中在 IO 阶段；`buf` 到手后的 `rawFitOf` 预算计算、LRU 淘汰、
  `data.set` 插入仍是**同一段无 `await` 的同步代码**，与改前一样不会被同批其它读取插队。
- **唯一仍同步的操作**：`new ArrayBuffer(size)` 清零 —— 纯内存、无 IPC / 无网络，且被
  `RAW_SINGLE_MAX_BYTES = 64MB` 夹死，不可能挂 6 秒。
- **到点即放弃**：死 NAS 上 `fs.read` 的 Promise 可能永不 settle，没有上限会让 `inflight` /
  `allActive` 永久挂住、整条预载链假死。`readGuarded()` 到点直接 `resolve(undefined)`，
  按 `rawDenyAfterFailure` 记 `denied`，本次解码降级 fd 路径，**功能绝不受损**。
  底层 Promise 无法真正取消：超时后它若在后台返回，`read()` 会因 `denied` 已置位而跳过缓存插入，
  但主线程从始至终空闲，不会再触发 appfreeze。
- **换源不误杀**：`genChanged = true` 时绝不拉黑，否则新图库里同一个 uri 会被永久误判。
- **在途合并 / `inflight` 清理 / 预算 LRU / 换源 `gen` / `clear()` 全部保持原语义**。

### 明确不动的部分（零回归）

- **ESC 链路**：严格两态分派、`escDedupEvent` 单轮去重、`inputConsumer`、窗口焦点、
  `Ctrl+D` 诊断层、`Ctrl+Q` 退出、`quitApp()` / `destroyWindow()`
- **方向键 / 看图交互**：`←` `↑` = 上一张、`→` `↓` = 下一张（第二十六轮），Ctrl + 滚轮缩放、
  双指捏合、`0` 复位、`F` 1:1、空格幻灯片、`R/H/V`、`DEL/BACK`、右键放大镜、双击全屏
- **预载链护栏**：`PRELOAD_CONCURRENCY = 4`、`PRELOAD_ALL_YIELD_MS = 0`、
  `bulkIoAllowed(restoreMode)` 的 ro1 只读名单总闸门（≥9 处）、失败快速放弃、
  3 秒恢复看门狗、3 个预算常量、`RAW_CACHE_MAX_*` 全部原值
- **画质 / 放大镜 / 几何恢复 / 状态恢复 / 诊断层 / 版本**

### 构建标记

`ESC_BUILD_TAG` → `R27`。诊断层默认关闭；按 `Ctrl+D` 或单击右下角缩放百分比展开后可见 `R27`，
用于从截图一眼排除 `R26` 及更早旧包。

### 验证结果（三类证据严格分开）

| 类型 | 结果 |
|---|---|
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 37 s 816 ms**（真实 `CompileArkTS` 19 s 498 ms），签名 HAP **874,653 bytes**，`modules.abc` 与 HAP 内 `ets/modules.abc` 均检出 `R27`（`R26` 计数 0）；**0 ERROR**，仅剩既有 8 条 `preferences` 可能抛异常、1 条 `READ_IMAGEVIDEO` 权限、8 条 2in1 系统栏告警 |
| 静态契约 | **ALL PASS 1274 passed, 0 failed**（1253 → 1274）；`node --check` / `git diff --check` / 注释剥离后 `Index.ets`、`RawCache.ts` 括号净平衡 `0/0/0`（与 HEAD 一致）/ 版本守卫全绿 |
| 真机 NAS 验证 | ⚠️ **本会话无法自行完成**：`hdc` 无目标 / `bm install` 失败 / `hilog` 权限拒绝 / 无按键注入工具 / 无法打开 NAS 目录。**编译校验 ≠ 真机验证**，请按下方步骤在装有 R27 包的机器上确认 |

未跑 `build.sh`、未把 HAP 放桌面、未升版本、未 push。产物仍在
`entry/build/default/outputs/default/entry-default-signed.hap`。

### 覆盖的验证场景（请在装有 R27 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层，看右下角角标 | 出现 `R27`（若还是 `R26` / `R25` 说明装的是旧包） |
| 2 | 打开一个**本地**图库，快速滚轮翻页 | 图片照常瞬时上屏、缩放 / 放大镜 / 双击全屏不受影响（零回归基线） |
| 3 | 打开**NAS 网络目录**，在预载 / 缓存期间持续拖动窗口、点档案列表、按方向键 | 界面**始终可操作**，不再出现 6 秒无响应 / appfreeze |
| 4 | 同一 NAS 目录连续翻页到较靠后的图片 | 命中原始档案缓存的图仍瞬时上屏；`预载 N 张` 持续增长 |
| 5 | 拔掉网线 / 让 NAS 路径变为不可达后继续浏览 | 单张最多约 8 秒即放弃（不再无限挂住），其余图片仍能正常显示，APP 不卡死 |
| 6 | 从 NAS 目录切到另一个图库（换源） | 同一个 uri 不会被误拉黑，新图库图片照常进缓存（验证 `rawDenyAfterFailure` 的换源分支） |
| 7 | 反复进出全屏、按两次 `Esc` | 首次退全屏、第二次退出 APP（ESC 链路零回归） |
| 8 | 查看 hilog 中的 `rawCache read TIMEOUT` / `rawCache read FAIL` | 仅在死路径 / IO 失败时出现，正常 NAS 图库不应刷屏 |

> **判据**：NAS 目录缓存期间界面不冻结、无 `THREAD_BLOCK_6S` 日志，即为本轮生效；
> 若仍出现 6 秒主线程阻塞，请确认装的是 `R27` 包（旧包角标为 `R26` 或更早）。

## 第二十六轮：上下键改翻页 —— `↑`=`←` / `↓`=`→`、移除上下键缩放（2026-11-16，R26）

用户要求精确调整**现有图片浏览的键盘交互**：

> 将上下键改为与左右键相同的切换行为，上键与左键对应相同的切换方向、下键与右键对应
> 相同的切换方向，用于浏览上一张和下一张图片；保留左右键现有切换行为不变；移除上下键
> 原有的放大和缩小功能，确保按上下键不再触发缩放；不要影响其他图片查看交互。

### 改动范围（1 个源码文件，2 个 case 分支）

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/pages/Index.ets` | ① `ESC_BUILD_TAG` → `R26`；② `onKey()` 的 `switch (code)` 里 `KEYCODE_DPAD_UP` 由 `this.zoomBy(1.25)` 改 `this.go(-1)`、`KEYCODE_DPAD_DOWN` 由 `this.zoomBy(0.8)` 改 `this.go(1)`；③ `KEYCODE_DPAD_LEFT` / `KEYCODE_DPAD_RIGHT` **一字未动**，仍是 `go(-1)` / `go(1)` |
| `tests/dirname.test.mjs` | 6 处构建标记断言 `R25` → `R26`；新增第二十六轮 9 条静态契约（方向键同向 / 零 `zoomBy` / 其它入口零回归 / 旧标记排除） |
| `README.md` | 功能表「缩放」行删去键盘 `↑` `↓`、「键盘翻页」行补上四个方向键；两处历史说明加订正；新增本章 |

**没有改动**：`InteractionPlan.ts`、`AppScope/app.json5` 版本、其它任何文件。

### 明确不动的部分（零回归）

- **左右键**：`←` = 上一张、`→` = 下一张，步长与调用完全不变（仍走 `go(-1)` / `go(1)`）
- **其它缩放入口**：Ctrl + 滚轮（`zoomBy(d > 0 ? 0.9 : 1.1)`）、双指捏合、左键放大 ×1.5、键盘 `0` 复位、`F` 切 1:1
- **其它看图交互**：滚轮翻页 `go(d)`、空格幻灯片、`R` / `Shift+R` 旋转、`Shift+H` / `Shift+V` 镜像、`DEL` / `BACK` 往上层、`Ctrl+B` 收起左栏、右键 toggle 放大镜、双击全屏
- **ESC 链路**：严格两态分派、`escDownHandled` Up 配对、ESC 单轮去重、`inputConsumer`、窗口焦点、`Ctrl+D` 诊断层、`Ctrl+Q` 退出、`quitApp()` / `destroyWindow()`
- 画质 / 放大镜 / 几何恢复 / 状态恢复 / 版本 `1.0.7` / `versionCode 7`

按 `↑` / `↓` 现在**只换张，右下角缩放百分比不会变**。

### 构建标记

`ESC_BUILD_TAG` → `R26`。诊断层默认关闭，正式版界面不显示构建标记；
按 `Ctrl+D` 或单击右下角缩放百分比展开后可见 `R26`，用于从截图一眼排除 `R25` 及更早旧包。

### 验证结果（三类证据分开说）

| 类型 | 结果 |
|---|---|
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 41 s 214 ms**（真实 `CompileArkTS` 19 s 137 ms），签名 HAP **870,311 bytes**，`modules.abc` 与 HAP 内 `ets/modules.abc` 均含 `R26`；仅剩既有 2in1 系统栏与 `READ_IMAGEVIDEO` 权限告警 |
| 静态契约 | **ALL PASS 1253 passed, 0 failed**（1244 → 1253）；`node --check` / `git diff --check` / 括号净平衡 / 版本守卫全绿 |
| 真机按键验证 | ⚠️ **本会话仍无法自行完成**：`hdc` 无目标 / `bm install` 失败 / `hilog` 权限拒绝 / 无按键注入工具。请按下方步骤在已安装 R26 包的机器上确认 |

未跑 `build.sh`、未把 HAP 放桌面、未升版本、未 push。

### 覆盖的验证场景（请在装有 R26 新包的机器上执行）

| # | 操作 | 预期 |
|---|---|---|
| 1 | `Ctrl+D` 展开诊断层，看右下角角标 | 出现 `R26`（若还是 `R25` / `R24` 说明装的是旧包） |
| 2 | 记下当前第几张与右下角缩放百分比 | 作为基准 |
| 3 | 按 `←` | 上一张，百分比不变 |
| 4 | 按 `↑` | **上一张**（与 `←` 同向），百分比**不变** |
| 5 | 按 `→` | 下一张，百分比不变 |
| 6 | 按 `↓` | **下一张**（与 `→` 同向），百分比**不变** |
| 7 | 连续按 `↑` / `↓` 多次 | 每次只走一张，不跳格、不缩放、不弹窗 |
| 8 | `Ctrl + 滚轮` | 仍正常缩放（百分比变化），证明缩放入口没被误删 |
| 9 | 全屏态下重复 3~7 | 行为一致（全屏不改变方向键映射） |
| 10 | 按两次 `Esc` | 首次退全屏、第二次退出 APP（ESC 链路零回归） |

> **判据**：按 `↑` / `↓` 时右下角缩放百分比**一动不动、只换张**，即为本轮生效；
> 若百分比跟着变，说明仍是旧包。

## 第二十五轮：诊断层默认关闭 + 可开关入口（2026-11-16，R25）

第二十四轮 ESC 两态退出已实机核验通过。用户要求「**保留一个可开关的诊断入口**」：
把排查期铺在界面上的诊断 UI 收成正式版，但回归复查时仍能一键展开。

### 之前的问题

第十九～二十四轮为定位 ESC 故障，在右下角与状态栏累积了一批**常显**诊断：
`R24` 构建标记、`full/win/keys/dsp/hk/wf` 角标、黄色 `ESC#…` 链路诊断行、
状态栏拼入的 `ESC#1 …`、以及「退出 APP」按钮。故障修好后，这些元素在正式看图时
占预览区、干扰视觉，尤其右下角一长串字段盖在图片上。

### 做法：运行时开关（不是改代码重新编译）

| 项 | 内容 |
|---|---|
| 开关 | `DIAG_OVERLAY_DEFAULT = false` + `@State diagOverlayOn`（**运行时可切**，与编译期 `SHOW_DIAG_BADGE` 不同） |
| 正式版（默认关闭） | 右下角**只显示缩放百分比**（如 `14 %`）；黄色诊断行、「退出 APP」按钮、全字段角标、状态栏 `ESC#…` 全部不画 |
| 展开诊断层 | 显示全部 ESC 排查诊断：`R25` 构建标记 / `full win keys dsp hk wf` / `ESC#` 链路 / `fc=f=rN` 焦点结果 / `cap con dsp` 通道计数 / 「退出 APP」按钮。（目录诊断串 `diagLine` 仍由独立的编译期开关 `SHOW_DIAG_BADGE` 控制，默认关闭，不受本开关影响） |
| 入口 ①（键盘） | **`Ctrl+D`**（`KEYCODE_D = 2020`）—— 不占任何 UI 空间，全屏 / 普通模式都能切 |
| 入口 ②（鼠标） | **单击右下角缩放百分比** —— 关闭时展开、展开时收起；两个分支都绑 `onClick` |
| 日志 | 切换时 `hilog` 打 `DIAG overlay=0/1` |

### 明确不动的部分（零回归）

- ESC 严格两态分派（`escActionByState`）、`escDownHandled` Up 配对修复、ESC 单轮去重：**一字未改**
- 焦点 / 窗口链路：`ensureWindowFocusable()` / `windowStatusChange` / `Button('·')` 锚点
- `inputConsumer` 双通道订阅、`Ctrl+Q` 退出、`quitApp()` 及 `destroyWindow()` 兜底
- `SHOW_DIAG_BADGE` 编译期目录诊断开关与 `diagLine` 全部赋值点（保持原样，独立通道）
- 画质 / 放大镜 / 几何恢复 / 状态恢复 / 版本 `1.0.7` / `versionCode 7`

**本轮只改 UI 显示条件与新增两个开关入口**，不触碰任何按键分派逻辑。

### 构建标记

`ESC_BUILD_TAG` → `R25`。诊断层**展开后**右下角才会显示 `R25`；正式版界面不显示构建标记，
如需确认新包，按 `Ctrl+D` 展开看一眼即可。

### 验证结果

| 类型 | 结果 |
|---|---|
| 真实 ArkTS 编译 | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 2 min 15 s 484 ms**，签名 HAP **870,311 bytes**，`modules.abc` 含 `R25`；仅剩既有 2in1 系统栏与 `READ_IMAGEVIDEO` 权限告警 |
| 静态契约 | **ALL PASS 1244 passed, 0 failed**；`git diff --check` / `node --check` / 括号净平衡 / 版本守卫全绿 |
| ESC 两态退出 | ✅ 已在第二十四轮由用户实机验证通过；本轮不改其逻辑，19～24 轮回归护栏全绿 |

未跑 `build.sh`、未把 HAP 放桌面、未升版本、未 push。

### 使用方式

| 场景 | 操作 |
|---|---|
| 日常看图 | 直接打开即可，右下角只有缩放百分比，界面干净 |
| 回归复查 / 出问题时截图 | `Ctrl+D` 或单击右下角百分比 → 诊断层展开 → 截图发回 |
| 收起诊断层 | 再按一次 `Ctrl+D`，或单击展开后的全字段角标 |
| 非 ESC 退出 | `Ctrl+Q` 恒可用；诊断层展开时另有「退出 APP」鼠标入口；系统标题栏关闭按钮也可用 |

## 第二十四轮：第二次 ESC 被吞 —— `escDownHandled` 永不复位 / 单轮去重 / Ctrl+Q（2026-11-16，R24）

用户发来第四张实机截图（R23 包）。这一张是**转折**：前面几轮卡在「按键根本到不了 APP」，
R23 已经把这条路打通了，剩下的是一个**纯粹的 APP 内部代码缺陷**。

> ✅ **2026-11-16 实机核验通过**：用户确认「第二次 ESC 已能正常退出 APP」。
> 本会话本身仍**无法自行在真机按 ESC**（`hdc` 无目标 / `bm install` 失败 /
> `hilog` 权限拒绝 / 无按键注入工具），因此下文「真机」结论来自用户实机操作与
> 回传截图，与编译校验、静态契约严格分开记录。

### 截图证据（右下角与状态栏放大）

| 位置 | 读到 | 结论 |
|---|---|---|
| 右下角角标 | `14 % · R23 · full=F · win=T · keys=168 · dsp=0 · hk=N · wf=T` | 新包确认；**`keys=168`**（R22 是 `0`）；**`wf=T`**（窗口有焦点） |
| 黄色诊断行 | `ESC#1 full=T type=D act=1 (EXIT_FULL) · fc=Y f=Y r12` | **`f=Y`**（R22 是 `N`）；收到了**第 1 次 ESC**，正确判 `EXIT_FULL` |
| 左下角状态栏 | `第 8 · 9/35 张 \| ESC#1 full=T type=D act=1 (EXIT_FULL)` | 同样只有 `ESC#1` |
| 界面 | 左栏 / 顶栏 / 状态栏全部恢复，`full=F` | **首次 ESC 退出全屏、恢复几何已完全正常** |
| `hk=N` | 系统级 `keyPressed` / `hotkeyChange` 双通道均被拒 | ESC 属平台级占用；但组件通道已通，**不再关键** |
| `dsp=0` | `onKeyEventDispatch` 未派发 | 按键走的是 `onKeyPreIme` / `onKeyEvent` 两通道 |

**结论**：R23 的 `Button('·')` 锚点修复 + `setWindowFocusable(true)` 生效了 ——
焦点建立、按键到达、首次 ESC 正确。唯一剩下的断点是：**诊断串停在 `ESC#1`，
第二次 ESC 没有进入 `onKey()`**。

### 根因（两个明确的 APP 内部 bug）

| # | 缺陷 | 为什么吞掉第二次 ESC |
|---|---|---|
| 1 | **`escDownHandled` 永不复位**（主因） | 该标志只在 ESC 的 `Down` 分支被设 `true`；配套的 `Up` 在 `if (!down) return;` 就提前返回，**从没执行到清除标志的语句**。2in1 上系统常把 ESC 的 Down 消费掉、只派发 `Up`，于是第一次 ESC 之后所有「只派发 Up」的 ESC（含用户主动按下的第二次）都被 `down=false` 挡在 `onKey` 之外。截图 `type=D` 说明第一次是 Down，之后就卡住了 |
| 2 | **永久对象引用去重**（次因） | `lastKeyEvent === event` 永久保存上一个事件对象；2in1 上 ArkUI 会**复用同一个 `KeyEvent` 实例**（只改字段），用户主动按下的第二次 ESC 被误判成「同一事件在另一通道重复派发」而 `return` |

另外核对 SDK 时否决了一个方案：`KeyEvent.timestamp` 虽可用于精确去重，但 SDK 明确标注
**`unavailable to tablet, 2in1`**（编译告警 `This API is unavailable to tablet, 2in1`），
实机可能恒为 0，不能作为判据。

### 改动范围（3 文件）

| 文件 | 改动 |
|---|---|
| `Index.ets` | ① `ESC_BUILD_TAG` → `R24`；② **修 `escDownHandled`**：ESC 的 `Up` 到达时若存在待配对 `Down`，就清标志并忽略（同一次物理按键）；若没有待配对 `Down`，当作一次**独立 ESC** 继续分派，`down = rawDown \|\| isEsc`；③ **双轨去重**：ESC 用 `escDedupEvent` 只在当前事件循环内去重（`setTimeout(0)` 立即清空），非 ESC 沿用永久 `lastKeyEvent` 对象引用去重（翻页 / 缩放行为不变），**完全不依赖 `timestamp`**；④ `escDiag` 的 `type` 改显示**真实 KeyType**（`U` = 系统只派发 Up 的 2in1 路径）；⑤ 新增 `capSeen` / `conSeen`，与 `dispatchSeen` 一起实时拼在黄色诊断行（`cap=N con=N dsp=N`），一图可判第二次 ESC 落在哪一层；⑥ **新增 `Ctrl+Q` 退出**：其它普通键在截图里全部能稳定到达（`keys=168`），这是不依赖 ESC 的键盘确定解 |
| `tests/dirname.test.mjs` | 更新 10 条旧护栏（`R23→R24` / Up 兼容判据 / 去重断言 / 诊断 Text 切片）+ 新增 11 条第二十四轮断言。**1225 → 1236 ALL PASS** |
| `README.md` | 功能表订正 + 本节 |

R23 的 `inputConsumer` 双通道、`ensureWindowFocusable()`、窗口真值同步、`Button('·')` 锚点、
「退出 APP」按钮、第十九轮严格两态**全部原样保留**；`quitApp` / 几何恢复 / 放大镜 / 画质未动；
版本仍 `1.0.7` / `versionCode 7`。

### ⭐ 确定解（两个都不依赖 ESC）

- **`Ctrl+Q`**：普通键通道在实机已证实可用（`keys=168`），组合键不会误触。
- **右下角「退出 APP」**：鼠标点击，不依赖键盘 / 焦点 / 窗口形态，全屏与普通模式都可见。

两者都走 `quitApp()`（同步落盘 → `terminateSelf()` → 400ms 后 `destroyWindow()` 兜底）。
即使 2in1 窗口管理器最终仍不派发第二次 ESC，APP 也有可靠的退出路径。

### 验证结果（三类证据分开说）

| 类型 | 结果 | 能证明什么 |
|---|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 1 min 3 s 70 ms**，签名 HAP **870,139 bytes**，`modules.abc` 含 `R24`；`KeyEvent.timestamp` 的 2in1 告警已消失 | 新去重 / Up 配对 / `Ctrl+Q` 均为合法 SDK 26 用法；仅剩既有 2in1 系统栏与 `READ_IMAGEVIDEO` 权限告警 |
| 静态契约 | **ALL PASS 1236 passed, 0 failed**；`node --check` / `git diff --check` / 括号净平衡 / 版本守卫全绿 | 接线存在、既有护栏未坏；**不证明按键到达、不证明 APP 退出** |
| **真机按两次 ESC** | ✅ **用户实机确认通过**：首次 ESC 退出全屏并恢复三栏，第二次 ESC 正常关闭 APP | 唯一能证明故障消除的验证；已达成 |

未跑 `build.sh`、未把 HAP 放桌面、未升版本、未 push。

### ✅ 实机核验结论（用户第五张截图，2026-11-16 01:03）

用户明确反馈「**现在第二次 ESC 已能正常退出 APP**」；因退出后进程已关闭、无法再截图，
所附截图为**第一次 ESC 触发后、第二次 ESC 之前**的界面状态。APP 能终止到「截不到图」，
本身就是退出成功的直接证据。

| 观察 | 值 | 判定 |
|---|---|---|
| 右下角角标 | `14 % · R24 · full=F · win=T · keys=2 · dsp=0 · hk=N · wf=T` | 新包确认；APP 全屏态已复位为 `F`；窗口焦点 `wf=T` |
| 黄色诊断行 | `ESC#1 full=T type=D act=1 (EXIT_FULL) · fc=Y f=Y r8 · cap=2 con=2 dsp=0` | 第一次 ESC 为 `Down`，严格判 `EXIT_FULL`（`act=1`），**没有误退出 APP**；焦点 `f=Y` 成功；`cap/con` 各 2 次 = 按键经 `onKeyPreIme` / `onKeyEvent` 到达 |
| 状态栏 | `已恢复上次会话 · 35 张 · 第 12 张 · rs1 · p1 目录授权已持久 · 已恢复上次目录「人像」 · uc1 · ESC#1 … (EXIT_FULL)` | 启动状态恢复与 ESC 诊断串同时可见，位置记忆链路未受本轮改动影响 |
| 界面布局 | 系统标题栏 + 顶部工具行（`排序 ↑ / 往上层 / 选择文件夹`）+ 左栏三栏档案表（35 张）+ 双页并排预览 + 底部状态栏 | **普通模式三栏已完整恢复**，全屏时隐藏的顶栏 / 左栏 / 状态栏全部回来 |
| 缩放 / 画面 | `14 %`、双页竖图对开、左上角信息浮层（双页文件名 / `3808 × 2924` / `sRGB`） | 进全屏前的视图状态与几何按快照还原，未出现「系统退了沉浸但界面仍全屏」的脱节 |

**结论**：第一次 ESC 严格走 `EXIT_FULL`，界面、几何、缩放、状态栏全部回到普通模式；
第二次 ESC 按 `escActionByState(false, …) = QUIT_APP` 退出 APP 并经实机确认。
两态分派、Up 配对修复、ESC 单轮去重三项均按预期工作，**核心 ESC 退出逻辑无需再修正**。

### 剩余可清理项（均非功能缺陷，不影响 ESC 退出）

| # | 项 | 性质 | 建议 |
|---|---|---|---|
| 1 | 右下角 `R24` / `full/win/keys/dsp/hk/wf` 角标、黄色 `ESC#…` 诊断行、状态栏拼入的 `ESC#1 …`、「退出 APP」按钮 | 排查期临时可观测 UI；正式看图时占预览区、干扰视觉 | ✅ **第二十五轮已实现**：运行时开关 `diagOverlayOn` 默认关闭，`Ctrl+D` / 单击角标展开 |
| 2 | `inputConsumer` 的 `keyPressed` / `hotkeyChange` 双通道订阅 | 实机 `hk=N` 证明两条均被系统拒绝；组件通道修好后已无实际作用，每次启动仍尝试两次 | 可移除以简化启动路径，或保留作 `hk` 诊断 |
| 3 | 窗口最大化时 `win=T` 恒为真 | `windowStatusIsFullscreen` 把 `MAXIMIZE(2)` 也算全屏；仅用于诊断显示，**不参与分派**（`sawWindowFull` 前置证据防误判） | 标签改 `max=` 或不显示，避免误读为「还在全屏」 |
| 4 | 编译期 `This API is unavailable to 2in1`（系统栏 / maximize API）与 `READ_IMAGEVIDEO` 权限告警 | 平台既有告警，代码已 try/catch 兜住 | 无需处理 |

**功能层面：无待修正项。** 以上 1～3 项属于交付前的界面收尾，按用户偏好决定是否清理。

### 真机验证步骤（已通过，保留作回归复查）

1. 卸载旧包，装 `R24` 签名包 → 确认右下角角标有 `R24`。
2. 双击进全屏 → 第一次 ESC（三栏回来、`full=F`）→ **第二次 ESC**，看是否退出 APP。
3. 读黄色诊断行，预期出现 **`ESC#2 full=F type=U … (QUIT_APP) → quitApp → terminateSelf() → destroyWindow`**。
4. 若仍只有 `ESC#1`，看诊断行末尾的 `cap=N con=N dsp=N`：
   - 计数**有增长**但无 `ESC#2` → 事件到了某通道、被层内逻辑拦下；
   - 计数**不变** → 系统窗口管理器根本没把第二次 ESC 派发给应用（平台限制）。
5. 无论哪种，**按 `Ctrl+Q` 或点「退出 APP」** 都应能退出，请先确认这条确定解。
6. 把右下角整片（含 `ESC#` 诊断行与 `cap/con/dsp`）截图发我。

### 诊断对照表（R24 截图速查）

| 诊断 | 断点定位 | 下一步 |
|---|---|---|
| `ESC#2 type=U (QUIT_APP) → quitApp → terminateSelf` 且 APP 关闭 | ✅ 修复完成 | 无需回传 |
| `ESC#2 type=D (QUIT_APP)` 且 APP 关闭 | ✅ 修复完成（Down 路径） | 无需回传 |
| 仍只有 `ESC#1`，`cap/con` 增长 | 事件到达但被去重 / 配对逻辑拦下 | 回传截图，查 `type=` 与计数 |
| 仍只有 `ESC#1`，`cap/con/dsp` 全不变 | 系统未派发第二次 ESC（平台占用） | 用 `Ctrl+Q` / 「退出 APP」；或改非 ESC 交互 |
| `ESC#2 … (QUIT_APP)` 但 APP 未关闭 | 退出 API 在该窗口形态无效 | 回传截图，查 `quitApp` 后续标记 |
| `keys=0` | 焦点又丢了（R22 老问题） | 回传截图，看 `fc=/f=/wf=` |

### 覆盖的验证场景

| # | 场景 | 预期 |
|---|---|---|
| 1 | 用户复现路径：双击进全屏 → 两次 ESC | 首次返回并恢复几何，第二次退出 APP |
| 2 | 2in1 只派发 `KeyType.Up` 的 ESC | 无待配对 Down 时当独立 ESC 处理，`type=U` 可见 |
| 3 | 同一次 ESC 的 Down + Up 配对 | Up 到达清 `escDownHandled` 并忽略，不双触发 |
| 4 | 连续两次 ESC（ArkUI 复用同一 `KeyEvent` 对象） | ESC 单轮去重已跨循环失效，第二次正常处理 |
| 5 | 连续按方向键 / 空格等非 ESC 键 | 永久对象引用去重不变，翻页不跳格 |
| 6 | 多通道（PreIme / onKeyEvent / Dispatch）派发同一事件 | 同轮内合并，`cap/con/dsp` 各自递增可观测 |
| 7 | `KeyEvent.timestamp` 在 2in1 上不可用 | 代码不读取该字段，编译无相关告警 |
| 8 | 按 `Ctrl+Q` | 立即退出 APP，与 ESC / 焦点 / 窗口形态无关 |
| 9 | 点右下角「退出 APP」 | 立即退出 APP，全屏 / 普通模式都可点 |
| 10 | 第十九～二十三轮全部接线 / 画质放大镜 / 版本 | 静态契约全绿，零回归 |

## 第二十三轮：系统级按键通道 / 窗口级焦点 / 鼠标确定解（2026-11-15，R23）

用户第七次反馈并发来第三张实机截图：「**有 R22，ESC 没有反应**」。
R22 把诊断做到「一刀切」级别，这一张截图终于把断点**精确定位到通道本身**，
也推翻了上一轮「关掉系统沉浸就能让 ESC 变成普通按键」的推测。

> ⚠️ 本会话仍**无法自行在真机按 ESC**（环境限制实测见第二十轮章节：
> `hdc list targets` 空 / `bm install` 恒失败 / `hilog` 权限拒绝 / 无按键注入工具）。
> 以下「真机按两次 ESC」一律标为**待用户验证**，不与编译校验、静态契约混为一谈。

### 三张截图串起来的证据链

| 轮次 | 角标 | 新增信息 |
|---|---|---|
| R21 | `R21 · full=F · win=T`，**无黄色诊断行** | `escDiag` 为空 → `onKey()` 从未被调用；`full=F` 证明 `windowStatusChange` 同步生效 |
| R22 | `keys=0 · fc=Y f=N r12 · 未收到任何按键`、`full=T · win=T · keys=0` | 任意键都没到 APP；12 次全局 `requestFocus` **全部返回 false**；**关掉系统沉浸后连「首次 ESC 返回」都消失** |
| R23 | 待回传 | 用 `dsp` / `hk` / `wf` 三个新字段判定通道与窗口焦点 |

### 根因（五条，逐条有证据）

| # | 发现 | 证据 / 影响 |
|---|---|---|
| 1 | **ESC 被系统窗口管理器全局消费，与是否沉浸无关** | R22 关掉 `USE_SYSTEM_IMMERSIVE` 后 `keys` **依然为 0**，却把「首次 ESC 返回」弄丢了（`full=T`）；对比 R21（开关为 true）的 `full=F` 可证：系统消费首次 ESC 时会退出沉浸并产生 `windowStatusChange`，APP 才能同步回普通态 |
| 2 | **焦点树根本没建立** | `f=N r12` = 全局 `focusControl.requestFocus()` 12 次全失败；`fc=Y` 只说明 `FocusController` 调用没抛异常（该 API 返回 void，**不等于成功**） |
| 3 | 焦点锚点自身不可聚焦 | `Button() { }` 空 builder 可能不生成真实可聚焦节点，且 `.hitTestBehavior(HitTestMode.None)` 让组件完全不参与命中 / 焦点 |
| 4 | **12 次焦点重试在启动后约 4.2s 永久耗尽** | `focusRetryCount` 从不重置；而「第二次 ESC」几乎总在那之后（截图 `r12` 即铁证） |
| 5 | 窗口本身可能 `focusable=false` | ArkUI 只能抢**应用内**焦点；窗口不可聚焦时 `requestFocus()` 恒 false。SDK 提供 `setWindowFocusable()` / `isFocused()`，前几轮完全没用 |

结论：继续改状态机或再加组件级按键通道没有意义，必须换**不经 ArkUI 焦点树**的链路，
并同时给出一个**不依赖键盘**的确定解。

### 为什么是 `inputConsumer`（SDK 26 逐条核对）

| API | 关键语义 | 本轮用法 | 风险 |
|---|---|---|---|
| `inputConsumer.on('keyPressed', KeyPressedConfig, cb)` | SDK 明确「**订阅成功后会拦截系统对该键的默认响应**」，且支持**单键**；要求应用处于前台焦点窗口 | **第一顺位**：`key: KEYCODE_ESCAPE`、`action: 1`、`isRepeat: false` | 该通道文档主要列举音量 / 媒体 / 指纹等系统功能键，**未明确列出 ESC**，实机可能抛 `401` 或不回调；要求窗口有焦点 |
| `inputConsumer.on('hotkeyChange', HotkeyOptions, cb)` | 组合键订阅，同步抛 `4200002`（系统占用）/ `4200003`（他人占用） | **第二顺位**：`preKeys: []` 尝试单键 ESC | ESC 常被注册为全局快捷键，`4200002` 概率高 |
| `Window.setWindowFocusable(true)` / `isFocused()` | 窗口级可聚焦与焦点真值 | 注册窗口监听成功后、以及系统退出全屏瞬间各保障一次 | 2in1 上可能不支持；已用 `try` + `Promise.catch` 双重兜住 |

两通道**互斥**（`subscribed` 标志），避免一次 ESC 触发两次分派；
回调统一走 `applyEscFromSystemChannel()`，与 `onKey` **共用同一套 `escActionByState` 两态真值来源**。
即使 `keyPressed` 拦截了系统默认 ESC 响应，`setFull(false, true)` 内部仍会
`applyWindowFullScreen(false)` 主动退出沉浸，窗口形态不会卡在全屏。

### 改动范围（3 文件）

| 文件 | 改动 |
|---|---|
| `Index.ets` | ① `ESC_BUILD_TAG` → `R23`，**恢复 `USE_SYSTEM_IMMERSIVE=true`**（保留 `false` 早返回分支作可逆开关）；② 新增 `import inputConsumer` 与 `KeyEvent as InputKeyEvent` 别名（避免与 ArkUI 全局 `KeyEvent` 同名不同型）；③ `registerEscHotkey()` 双通道订阅 + `applyEscFromSystemChannel()` 共用分派，`aboutToAppear()` 主动注册；④ `ensureWindowFocusable()` 设窗口可聚焦并读 `isFocused()` 真值；⑤ `onWindowStatusChanged` 在**系统退出全屏瞬间**重置 `focusRetryCount=0` 并重抢焦点；⑥ 修焦点锚点：`Button('·')` 带内容 / 4vp / 移除 `HitTestMode.None`；⑦ 角标新增 `dsp=N`（分发通道到达数）、`hk=kp\|hk\|N`（订阅结果）、`wf=T\|F\|?`（窗口焦点）；⑧ **新增右下角可点击「退出 APP」**，鼠标点击不依赖键盘 / 焦点 / 窗口形态 |
| `tests/dirname.test.mjs` | 更新 10 条旧护栏（`R22→R23` / `USE_SYSTEM_IMMERSIVE` / 锚点 / `setFull` 3→4 处 / 角标 Text 2→3 个 / `onKeyDispatch` 正则）+ 新增 16 条第二十三轮断言。**1209 → 1225 ALL PASS** |
| `README.md` | 功能表「关闭应用」「全屏」两行订正 + 本节 |

第十九轮严格两态、第二十一轮窗口真值同步、第二十二轮 `keys` 诊断与 `destroyWindow()` 兜底
**全部原样保留**；`quitApp` / 几何恢复 / 放大镜 / 画质接线未动；版本仍 `1.0.7` / `versionCode 7`。

### 验证结果（三类证据分开说）

| 类型 | 结果 | 能证明什么 |
|---|---|---|
| **真实 ArkTS 编译** | `hvigorw --mode module -p product=default assembleHap --no-daemon` → **BUILD SUCCESSFUL in 12 s 17 ms**，已签名 HAP **864,490 bytes**；`modules.abc` 含 `R23` / `keyPressed` / `hotkeyChange` / `setWindowFocusable` | 新 API 均为合法 SDK 26 用法，签名链路通；仅剩既有 2in1 系统栏告警与 `READ_IMAGEVIDEO` 权限告警 |
| 静态契约 | **ALL PASS 1225 passed, 0 failed**；`node --check` / `git diff --check` / 括号净平衡 / 版本守卫全绿 | 接线存在、既有护栏未坏；**不证明按键到达、不证明 APP 退出** |
| **真机按两次 ESC** | **本会话无法执行**，待用户验证 | 唯一能证明故障消除的验证 |

按既定约束：未跑 `build.sh`、未把 HAP 放桌面、未升版本、未 push；
产物留 `entry/build/default/outputs/default/entry-default-signed.hap`。

### ⭐ 确定解（不依赖键盘，100% 可用）

右下角缩放角标左侧新增红色 **「退出 APP」**，全屏与普通模式都可见、都可点。
它走 `quitApp()`（同步落盘 → `terminateSelf()` → 400ms 后 `destroyWindow()` 兜底），
**完全不经过任何按键事件、焦点树或窗口形态判定**。
在 `hk=N`（ESC 被平台全局占用）时，这是本应用提供的确定退出入口。

### 真机验证步骤

1. 卸载旧包，装 `R23` 签名包 → 先看右下角角标是否出现 `R23`。**没有就是旧包。**
2. 读三个新字段：`hk=kp`（单键通道成功）/ `hk=hk`（组合键通道成功）/ `hk=N`（均失败 = ESC 被系统占用）、
   `wf=T/F`（窗口是否有焦点）、`dsp=N`（组件分发通道到达数）。
3. 双击进全屏 → 第一次 ESC（三栏回来、`full=F`）→ 第二次 ESC（应退出 APP）。
4. 若仍不退出：**点右下角「退出 APP」**，验证确定解是否生效。
5. 把**右下角整片（含 `hk` / `wf` / `dsp` 与红黄诊断行）截图发我**。

### 诊断对照表（R23 截图速查）

| 角标 | 断点定位 | 下一步 |
|---|---|---|
| 没有 `R23` | 旧包 | 重新卸载安装签名 HAP |
| `hk=kp` 且两次 ESC 正常 | ✅ 单键通道接管成功，修复完成 | 无需回传 |
| `hk=hk` 且两次 ESC 正常 | ✅ 组合键通道接管成功，修复完成 | 无需回传 |
| `hk=N` | **ESC 被系统全局占用或该键不在 `keyPressed` 支持列表**（平台限制） | 应用级无解 → 用「退出 APP」按钮；或改非 ESC 退出交互 |
| `hk=kp/hk` 但 `keys=0`、按 ESC 无反应 | 通道订阅成功却未回调（多半 `wf=F` 窗口无焦点） | 回传截图，看 `wf` 与 `r` 计数 |
| `wf=F` 且 `f=N` | 窗口不可聚焦 | 回传截图；`setWindowFocusable` 在 2in1 可能不生效 |
| `dsp≥1` 但 `keys=0` | 分发通道有事件、`onKey` 去重异常 | 回传截图 |
| `ESC#2 … (QUIT_APP)` 但仍未退出 | 退出 API 在该窗口形态无效 | 回传截图 |

### 覆盖的验证场景

| # | 场景 | 预期 |
|---|---|---|
| 1 | 用户复现路径：双击进全屏 → 两次 ESC | 首次返回并恢复几何，第二次立即退出 APP |
| 2 | `keyPressed` 订阅成功 | `hk=kp`；按 ESC 由系统级回调分派，系统默认响应被拦截但 APP 主动退出沉浸 |
| 3 | `keyPressed` 被拒（401 / 801） | 自动降级到 `hotkeyChange`，`hk=hk` 或 `hk=N`，不崩溃 |
| 4 | 两通道都被拒（`4200002`） | `hk=N`，UI 仍完整可用，鼠标「退出 APP」可退出 |
| 5 | 系统消费首次 ESC 退出沉浸 | `windowStatusChange` 触发，重置焦点重试上限并重抢焦点 |
| 6 | 首次 ESC 后隔很久（>4.2s）再按第二次 | 焦点重试已重启，不再停在 `r12` |
| 7 | 窗口 `focusable=false` | `ensureWindowFocusable()` 显式置 true，`wf=` 常显真值 |
| 8 | 全屏 / 普通模式下点「退出 APP」 | 均立即退出，不依赖键盘 |
| 9 | 一次 ESC | 双通道互斥 + `onKey` 对象引用去重，只分派一次 |
| 10 | 第十九轮两态 / 二十一~二十二轮接线 / 画质放大镜 | 静态契约全绿，零回归 |

## 第二十二轮：零按键到达 APP —— 分发通道 / 焦点冲突 / 常显 keys 诊断（2026-11-15）

用户第六次反馈并发来第二张实机截图：「**有 R21，全屏下按第二次 ESC 没有退出**」。
这排除了「装的是旧包」，并把断点收敛到唯一一处。

> ⚠️ 本会话仍**无法自行在真机按 ESC**（环境限制实测见第二十轮章节）。
> 但这一张截图足以定位：前五轮改的都是「按键到达**之后**」的逻辑。

### 截图证据（右下角角标放大 5 倍）

| 观察 | 值 | 结论 |
|---|---|---|
| 构建标记 | `R21` | ✅ 新包，旧包干扰项排除 |
| APP 全屏态 | `full=F` | ✅ 第二十一轮 `windowStatusChange` 同步**已生效**（左栏 / 顶栏 / 状态栏都回来了） |
| 系统窗口态 | `win=T`（MAXIMIZE=2） | 窗口仍是最大化；本轮判据把 2 算全屏 |
| 黄色诊断行 | **不存在** | 🔴 `escDiag` 为空 → `onKey()` **从未被调用** → **零个按键到达 APP**（不只是 ESC） |
| ESC 行为 | 两次都没退出 | 与上面一致：链路断在「到达 APP」之前，状态机再对也没用 |

第十九轮的严格两态、第二十一轮的状态同步都没错，但**没有一个键进得了 `onKey()`** ——
这才是剩下的唯一断点。

### 为什么按键进不来（SDK 逐条核对）

| # | 发现 | 影响 |
|---|---|---|
| 1 | 页面里**两个 `.defaultFocus(true)`**：根 `Column` 与焦点锚点 `Button` 同时声明 | ArkUI 一页只能有一个默认焦点，双声明互相冲突、谁都拿不到 |
| 2 | `onKeyPreIme` / `onKeyEvent` 都要求「当前组件已获焦点」 | 焦点一丢，两个通道全部收不到任何键 |
| 3 | 全局 `focusControl.requestFocus()` 返回 **boolean**，第二十 / 二十一轮一直没接返回值 | 抢焦点**失败**也完全不可见 |
| 4 | 默认 `KeyProcessingMode.FOCUS_NAVIGATION`：组件不处理时按键用于移动焦点 | 按键不会向祖先冒泡到根组件 |
| 5 | 系统沉浸最大化 API 在 2in1 上标注 `This API is unavailable to 2in1`，且两张截图的系统窗口外观一致 | 没带来可见全屏效果，却可能让窗口管理器把 ESC 保留为「退出沉浸」全局快捷键 |

SDK 里还有三个没用过的抓手：`onKeyEventDispatch`（**分发阶段，不依赖焦点**）、
`UIContext.getFocusController()`（官方焦点 API）、`KeyProcessingMode.ANCESTOR_EVENT`。

### 改动范围（3 文件）

| 文件 | 改动 |
|---|---|
| `Index.ets` | ① 新增 `onKeyEventDispatch` 第三通道（`onKeyDispatch`），挂在根组件，所有键都过 `onKey`（对象引用去重保证只处理一次）、ESC 返回 true 消费；② **移除根 `Column` 的 `.defaultFocus(true)`**，只保留 Button 锚点，消除冲突；③ `requestKeyFocusOnce()` 用 `getUIContext().getFocusController()` 设 `KeyProcessingMode.ANCESTOR_EVENT` + `requestFocus`，并**接住** `focusControl.requestFocus()` 的 boolean 返回值写进 `focusDiag`；④ 只要 `keySeen===0` 就持续重抢焦点（350ms × 12 次），收到任意键立即停；⑤ `USE_SYSTEM_IMMERSIVE=false` 让 `applyWindowFullScreen()` 早返回，全屏只切应用内三栏（改回 true 可恢复旧行为）；⑥ 角标升级 `R22` 并常显 `keys=N`；`keys=0` 时无条件显示红字 `keys=0 · fc=… f=… rN · 未收到任何按键`（含焦点结果），按到键后改黄字显示完整 `ESC#…` 链路 |
| `tests/dirname.test.mjs` | 同步 4 条旧护栏（`R21→R22` / 诊断行条件 / `defaultFocus` 计数改用根组件块切片）+ 新增 12 条第二十二轮断言。**1197 → 1209 ALL PASS** |
| `README.md` | 功能表两行订正 + 本节（截图证据 / SDK 核对 / 改动 / 真机验证 / 诊断对照表 / 9 场景） |

第十九轮严格两态、第二十一轮窗口真值同步与 `destroyWindow()` 兜底**全部原样保留**；
`quitApp` / 几何恢复 / 放大镜 / 画质接线未动。

### 验证结果（三类证据分开说）

| 类型 | 结果 | 能证明什么 |
|---|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL in 22 s**（已签名 HAP 851,809 bytes） | `onKeyEventDispatch` / `getFocusController()` / `KeyProcessingMode.ANCESTOR_EVENT` / `fc.requestFocus()` 均为合法 SDK 26 用法 |
| 静态契约 | **ALL PASS 1209 passed, 0 failed**；`node --check` / `git diff --check` / 括号净平衡全绿 | 接线存在、既有护栏未坏；**不证明按键到达** |
| **真机按两次 ESC** | **本会话无法执行**，待用户验证 | 唯一能证明故障消除的验证 |

按既定约束：未跑 `build.sh`、未放桌面、未升版本（`1.0.7` / `versionCode 7`）、未 push；
产物留 `entry/build/default/outputs/default/`。

### 真机验证步骤（这次一张截图就能定位）

1. 装 `R22` 签名包 → 先看右下角角标：`14% · R22 · full=… · win=… · keys=0`。**没有 `R22` 就是旧包。**
2. ⭐ **先按任意一个非 ESC 键**（例如 `→` 翻页或 `F11`），看 `keys=` 是否变成 ≥1：
   - `keys=0` 且红字 `未收到任何按键` → 键盘事件完全没到 APP，看红字里的 `fc=/f=` 焦点结果；
   - `keys≥1` → 键盘通了，继续第 3 步。
3. 双击进全屏 → 第一次 ESC（三栏回来、`full=F`）→ 第二次 ESC（应退出 APP）。
4. 若仍未退出，把**右下角整片（含红 / 黄诊断行）截图发我**。

### 诊断对照表（按完键看右下角）

| 角标 / 诊断行 | 断点定位 | 下一步 |
|---|---|---|
| 没有 `R22` | 旧包 | 重新卸载安装签名 HAP |
| `keys=0 · fc=Y f=Y rN · 未收到任何按键` | 焦点请求**成功**但零按键 → **ESC 被系统窗口管理器全局消费**（平台限制） | 回传截图；改走 `inputConsumer.hotkeyChange`（有 4200002 被系统占用风险）或提供非 ESC 退出入口 |
| `keys=0 · fc=N f=N` | `FocusController` / `focusControl` 都失败，焦点根本没建立 | 回传截图；换焦点目标或时机 |
| `keys≥1` 但只到 `ESC#1 … (EXIT_FULL)` | 按键通了，首次 ESC 后 `full` 未同步回 F | 回传截图；查 `full=` 与自愈 / 窗口同步 |
| `ESC#2 full=F … (QUIT_APP) → quitApp → terminateSelf() → destroyWindow` 但仍未退出 | 退出 API 在该窗口形态下无效 | 回传截图；改进程退出或换 context |
| 第二次 ESC 后 APP 正常关闭 | ✅ 修复完成 | 无需回传 |

### 覆盖的验证场景

| # | 场景 | 预期 |
|---|---|---|
| 1 | 用户复现路径：双击进全屏 → 两次 ESC | 首次返回并恢复几何，第二次立即退出 APP |
| 2 | 任意非 ESC 键 | `keys` 递增，证明键盘链路通；两次 ESC 才算退出 |
| 3 | 页面启动 / 全屏切换后焦点晚到 | 350ms × 12 次重抢，收到按键即停，不干扰操作 |
| 4 | `onKeyEventDispatch` 与 `onKeyPreIme` / `onKeyEvent` 收到同一事件 | 对象引用去重，只处理一次 |
| 5 | `USE_SYSTEM_IMMERSIVE=false` | 窗口形态不变，ESC 不被系统保留；改回 true 可恢复旧行为 |
| 6 | 连贯快按两次 ESC（<100ms） | 无冷却、无补发标志、无吞键 |
| 7 | 2in1 只发 `KeyType.Up` | 当作一次有效 ESC，不双触发 |
| 8 | `terminateSelf()` 在 PC 上不关窗口 | 400ms 后 `destroyWindow()` 兜底 |
| 9 | 回归：放大镜 / 右键 toggle / 画质三处 / AA 五源 / 顶栏 / 缓存 / 版本 | 全部不变（`1.0.7`） |

## 第二十一轮：截图证据驱动的窗口真值同步 —— 第二次 ESC 仍不退出（2026-11-15）

> ⚠️ **订正（第二十二轮）**：本节「已修复」的判断不成立。用户第二张截图（R21 新包）
> 显示 `full=F` 但**黄色诊断行始终不出现** → `escDiag` 为空 → **零个按键到达 `onKey()`**。
> 本节的 `windowStatusChange` 状态同步**确实生效**（这是 `full=F` 的来源），
> 但按键链路本身没通。**以最上方第二十二轮章节及真机验证为准。**

用户第五次反馈「还没有退出」并**发来实机截图**。本轮第一次拿到了可判读的真机证据，
不再靠猜测改状态机。

> ⚠️ 本会话仍然**无法自行在真实 APP 中按 ESC**（环境限制实测见第二十轮章节：
> `hdc` 无设备、`bm install` 拒绝、`hilog` 权限拒绝、无按键注入工具）。
> 但这次通过**放大分析用户截图**定位到了前四轮一直没看见的断点。

### 截图证据（放大 4~5 倍逐区判读）

| 区域 | 实测 | 推断 |
|---|---|---|
| 窗口形态 | 带 `PIKAN` 标题栏与最小化 / 最大化 / 关闭按钮的**自由窗口**，未占满屏幕 | 系统窗口管理器已消费首次 ESC 并退出沉浸最大化 |
| 底部状态栏 | **整块没有渲染**，只剩画布上的 `9.9%` 缩放角标；而状态栏是 `if (!this.fullscreen)` 常显、`this.status` 初值还非空 | **`this.fullscreen` 仍为 `true`** |
| 左栏 / 顶栏 / 工具条 | 全都不画，左右双页铺满窗口 | 同上：APP 界面仍处全屏布局 |
| 左上角信息浮层 | `_DSC4726.jpg · _DSC4729.jpg` / `JPG · 22.67 MB · 4672×7008` / `全屏 · Esc / F11 / 双击退出` | 文案仍是进全屏时 `setFull(true)` 写入的，从未被 `setFull(false)` 还原 |
| `ESC#` 诊断串 | **完全看不到** | 第二十轮把诊断放在「全屏时整块隐藏」的状态栏里 —— 这是上一轮的设计缺陷，截图天然看不到它 |

**结论**：系统已退出全屏，APP 内部状态却卡在全屏，两者脱节。

### 为什么第二十轮仍然无效（完整因果链）

1. 双击进全屏 → `setFull(true)` → `maximize(ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER)`。
2. 首次 ESC **被系统窗口管理器消费**、自行退出沉浸，窗口恢复自由窗口；**该按键不派发给 APP**。
3. APP 原本只能靠 `onAreaChange` 的 `shouldSelfHealOnResize`（画布缩小 ≥8px 且过 900ms 稳定期）
   「猜」系统退出了全屏。本机该回调没触发（或缩小量不够 / 基准未就绪）→ **自愈 `setFull(false, true)` 从未执行**。
4. 于是 `this.fullscreen` 永远是 `true`；更要命的是第二十轮的 `scheduleKeyRefocus()`
   **只挂在 `setFull()` 里** —— 它一次都没跑过，根组件焦点一直没抢回来。
5. 第二次 ESC 到达时既可能根本进不了 `onKey()`（无焦点），即便进去了也会被
   `escActionByState(true, …)` 判成 `EXIT_FULL` → 视觉上「无任何响应」。
6. 诊断串又恰好放在全屏时隐藏的状态栏 → 用户截图里什么都看不到，无法定位。

补充：真 ArkTS 编译输出大量 `This API is unavailable to 2in1` 警告（集中在
`setWindowSystemBarEnable` / `setSpecificSystemBarEnabled` / `setWindowLayoutFullScreen`），
用户机器是 2in1 鸿蒙 PC，部分窗口 API 不生效 —— 因此**不能无条件用 `getWindowStatus()`
的静态值覆盖 APP 状态**，否则进全屏后第一次 ESC 就会直接退出 APP。本轮加了
`sawWindowFull` 前置证据来防这个误判。

### 改动范围（3 文件）

| 文件 | 改动 |
|---|---|
| `InteractionPlan.ts` | 新增 ⑩ 节两个纯函数：`windowStatusIsFullscreen(status)`（仅 `FULL_SCREEN=1` / `MAXIMIZE=2` 算全屏）、`shouldSyncFullFromWindow(appFull, winStatusFull)`（仅「APP 自认全屏 + 系统已非全屏」才同步，APP 自己进/退全屏不触发，避免递归）。第十九轮 `escActionByState` 严格两态 / `shouldArmSystemEcho` 恒 false **一字未改** |
| `Index.ets` | ① `aboutToAppear` 注册 `win.on('windowStatusChange')`（窗口管理器直发，**不经 ESC 按键 / 不依赖焦点**），系统退出沉浸即 `setFull(false, true)` 同步并顺带恢复三栏、几何快照、重聚焦；② ESC 分支分派前 `syncFullWithWindow()` 主动读 `getWindowStatus()` 兜底；③ 两处同步都要求 `sawWindowFull` 前置证据（进全屏成功时由 `getWindowStatus()` 或回调置位），防 2in1 静态 `FLOATING` 误判；④ 新增 1vp 透明 `Button` 焦点锚点（天然可聚焦，比 `.focusable(true)` 的 Column 可靠），复用 `onKeyPreIme` / boolean 版 `onKeyEvent` 双通道，`onKey` 入口用 **KeyEvent 对象引用**去重（零时间窗，不吞第二次主动 ESC）；⑤ `aboutToAppear` 首帧就抢焦点，不再等 `setFull` 被调用；⑥ 右下角角标**常显 `R21` + `full=T/F` + `win=T/F`**，按过 ESC 后在上方展开黄色诊断行（全屏/普通都可见）；⑦ `quitApp` 在 `terminateSelf()` 后 400ms 若页面仍活着则 `destroyWindow()` 兜底关窗，带 `pageAlive` 与定时器清理 |
| `tests/dirname.test.mjs` | 同步 4 条旧护栏（角标 Text 计数 / `setFull(false,true)` 三处）+ 新增 15 条第二十一轮断言（窗口状态四象限、端到端场景、防误判、焦点锚点、去重、常显诊断、退出兜底、回归护栏）。**1182 → 1197** |

### 验证结果（三类证据分开说）

| 类型 | 结果 | 能证明什么 |
|---|---|---|
| **真实 ArkTS 编译** | `hvigorw assembleHap --no-daemon` → **BUILD SUCCESSFUL**（首次 1m1s / 复核 12s，已签名 HAP） | `win.on('windowStatusChange')`、空 `Button() { }` builder、`destroyWindow().catch()`、`Number(st)` 均为合法 SDK 26 用法 |
| 静态契约测试 | **ALL PASS 1197 passed, 0 failed**；`node --check` / `git diff --check` 全绿 | 接线存在、1171+ 条既有回归护栏未坏；**不证明按键到达** |
| **真机按两次 ESC** | **本会话无法执行**，待用户验证 | 唯一能证明故障消除的验证 |

按既定约束：未跑 `build.sh`、未把 HAP 放桌面、未升版本（`1.0.7` / `versionCode: 7`）、未 push；
编译产物留在项目 `entry/build/default/outputs/default/`。

### 真机验证步骤（请先确认装的是新包）

1. 安装本次签名包 `entry/build/default/outputs/default/entry-default-signed.hap`
   （或在 DevEco Studio 重新编译运行）。
2. **⭐ 先看右下角缩放角标**：必须显示 `9.9% · R21 · full=… · win=…`。
   - **看不到 `R21` → 装的是旧包**，前面五轮改动根本没进真机；请重新卸载安装后再测。
   - 有 `R21` 才能继续判断下面的状态。
3. 启动 APP，**双击进全屏**，记下角标里的 `full=` / `win=` 值。
4. **第一次按 ESC** → 应返回普通模式（左栏 / 顶栏 / 状态栏回来，角标 `full=F`），
   并恢复进入前的窗口尺寸位置。
5. **第二次按 ESC** → 应立即退出 APP。
6. 若仍没退出：**把右下角角标那一整片（含黄色诊断行）截图发我**。

### 诊断对照表（按完两次 ESC 看右下角角标）

| 角标显示 | 断点定位 | 下一步 |
|---|---|---|
| 没有 `R21` | 旧包 / 没重新编译安装 | 重新装签名 HAP 再测 |
| `R21 · full=T · win=T`，完全没出现黄色诊断行 | ESC 事件**根本没到 `onKey()`**（系统消费或焦点仍丢） | 回传截图；需上系统级按键订阅或放弃沉浸最大化形态 |
| 首次 ESC 后 `win=F` 但 `full` 仍 `T` | `windowStatusChange` 没派发且 `sawWindowFull` 未置位 | 回传截图；调整同步触发源 |
| 两次都 `full=T` 且黄色行都是 `(EXIT_FULL)` | 首次 ESC 后 APP 状态没同步回 false | 回传截图；查 `sawWindowFull` / `getWindowStatus()` 返回值 |
| `ESC#2 full=F … (QUIT_APP) → quitApp → terminateSelf()`，APP 仍在 | `terminateSelf()` 不关窗口；400ms 后应出现 `→ destroyWindow` | 回传截图；若 `destroyWindow` 也无效则改进程退出 |
| `NO_CONTEXT` / `REJECTED` / `EXCEPTION` | 上下文 / 退出 Promise / 异常 | 回传截图按标记修 |
| 第二次 ESC 后 APP 正常关闭 | ✅ 修复完成 | 无需回传 |

### 覆盖的验证场景

| # | 场景 | 预期 |
|---|---|---|
| 1 | 用户复现路径：双击进全屏 → 两次 ESC | 首次返回并恢复几何，第二次立即退出 APP |
| 2 | 首次 ESC 被系统消费、画布不缩小 | `windowStatusChange` 直发同步 `full=false`，三栏恢复、重聚焦执行 |
| 3 | 首次 ESC 由 APP 收到 | `EXIT_FULL`，绝不退出 APP |
| 4 | 2in1 上 `getWindowStatus()` 恒 `FLOATING` | `sawWindowFull` 未置位 → 不误同步 → 首次 ESC 不会直接退出 APP |
| 5 | 连贯快按两次 ESC（<100ms） | 对象引用去重只针对同一事件，无冷却、无吞键 |
| 6 | `onKeyPreIme` 与 `onKeyEvent`、Button 与根 Column 多路收到同一 ESC | 只处理一次，首次 ESC 不误退 APP |
| 7 | 只派发 `KeyType.Up` 的键盘 | 当作一次有效 ESC，不双触发 |
| 8 | `terminateSelf()` 在 PC 上不关窗口 | 400ms 后 `destroyWindow()` 兜底 |
| 9 | 回归：放大镜 / 右键 toggle / 画质三处 / AA 五源 / 顶栏 / 缓存 / 版本 | 全部不变（`1.0.7`） |

## 第二十轮：真机链路修复 —— ESC 到达 / 退出不阻塞 / 可观测诊断（2026-11-15）

> ⚠️ **订正（第二十一轮）**：本节把诊断串放在状态栏，而状态栏在 `fullscreen=true` 时
> 整块隐藏 —— 用户截图里因此看不到任何 `ESC#`，这是上一轮的设计缺陷；且
> `scheduleKeyRefocus()` 只挂在 `setFull()` 里，而自愈 `setFull(false,true)` 实机从未触发，
> 导致重聚焦一次都没执行。本节结论（双通道消费 / 同步落盘 / AppStorage 兜底）**保留**，
> 但「已修复」的判断以最上方第二十一轮章节与真机验证为准。

用户第四次反馈：**「全屏模式后按两次 ESC 不能退出 APP，请在真实 APP 中测试验证」**。
本轮不再改状态机纯函数 —— 那部分第十九轮已经对了；改的是**运行时事件链路**，并第一次把
「真机验证」做成可观测、可回传的形式。

> ⚠️ **诚实声明：本会话无法自行完成「在真实 APP 中按两次 ESC」**。前几轮把
> `ALL PASS xxxx passed` 当作「验证结果」，其实那只是纯函数 + 源码文本匹配的**静态契约测试**，
> 它证明不了 ESC 事件真的到达 `onKey()`。这是同一个故障连修三次仍失败的根本原因。
> 本轮能做到的机器校验是**真实 ArkTS 编译**（`hvigorw assembleHap` → `BUILD SUCCESSFUL`，
> 产出已签名 HAP）；按键与日志仍需在装有 APP 的机器上由用户执行，步骤见下方「真机验证」。

### 环境限制实测（为什么我装不了、按不了、看不到日志）

| 通道 | 命令 | 实测结果 |
|---|---|---|
| 设备连接 | `hdc list targets` / `hdc -s 127.0.0.1:8710 list targets` / `hdc tconn` | `[Empty]` / `Connect failed`，无可用设备 |
| 安装 HAP | `bm install -p <signed.hap>` / `bm dump -a` / `bm help` | 恒返回 `error: failed to execute your command.`（本进程 uid=20020176，无 BMS 权限） |
| 启动 ability | `aa start -b com.workbuddy.heicviewer -a EntryAbility` | 回报 `start ability successfully.` 但 `ps` 无对应进程、`aa dump -l` 为空 |
| 读取日志 | `hilog -x` / `hilog -s` | `Socket client init failed [CODE: -46]` / `Errno: 13, Permission denied` |
| 注入按键 | `input` / `uinput` / `uitest` / `/dev/input` | 命令不存在；`/dev/input` `Permission denied`；`sendevent` 为 toybox 未知命令 |

结论：本会话能编译、能改源码、能跑静态契约，**但不能安装 HAP、不能启动窗口、不能注入 ESC、不能读 hilog**。
因此「真机验证」的执行者与观察者只能是用户；本轮把所有可观测信息直接做进 APP 界面，让这一步一次就能定位。

### 真正病根（为什么前三轮改纯函数无效）

`escActionByState(true/false, …)` 只在 **ESC 事件已经进入 `onKey()` 之后** 才被调用。
静态契约测试覆盖的完全是这段「事后分派」，对下面四个运行时断点一无所知：

| # | 断点 | 实机表现 |
|---|---|---|
| 1 | `.onKeyEvent((event) => this.onKey(event))` 命中 SDK 的 **`(event: KeyEvent) => void` 重载**（since 7），返回 `void` 即**不消费事件**，事件继续冒泡 | 真全屏 / 沉浸态下 ESC 被窗口管理器或 IME 优先拿走，APP 的 `onKey()` 收不到 |
| 2 | `.defaultFocus(true)` 只在**首次构建**生效；进出全屏会整块重建 `if (!this.fullscreen)` 子树，窗口管理器切换沉浸态也会收走焦点 | 返回普通模式后焦点已丢，第二次 ESC 同样到不了 `onKey()` |
| 3 | `quitApp()` 里 `await this.flushPos()`：`put` / `flush` / 大快照都是异步 preferences I/O，历史上出现过死路径 / 慢速 NAS 导致 Promise 长期不 resolve | `terminateSelf()` 永远执行不到，按 ESC **完全静默、无任何响应** |
| 4 | `getUIContext().getHostContext()` 偶发为空时旧实现直接 `return`，`terminateSelf()` 抛错也只写 hilog（用户看不到） | 退出失败但无任何可见提示，看起来像「按键没生效」 |

另外补齐一个平台差异：部分 2in1 / PC 键盘的 ESC 只把 `KeyType.Up` 派给应用（`Down` 在沉浸态被系统消费），
而原 `onKey()` 有 `if (!down) return;`，这类按键会被整条丢掉。

### 改动范围（4 文件）

| 文件 | 改动 |
|---|---|
| `entry/src/main/ets/pages/Index.ets` | ① 根组件加 `.id(ROOT_FOCUS_ID)`；② 新增 `onKeyPreIme` 通道（`onKeyCapture`，SDK 12+）在 IME/系统之前拦 ESC 并 `return true` 消费；③ `onKeyEvent` 改用 **`Callback<KeyEvent, boolean>` 重载**（SDK 15+，`onKeyConsumed`）主动消费 ESC；④ 双通道用 `setTimeout(0)` 清标记做「同一次事件」去重（**不是按键冷却**，不会吞第二次主动 ESC）；⑤ `setFull()` 末尾 `scheduleKeyRefocus()` 延时 120ms `focusControl.requestFocus(ROOT_FOCUS_ID)` 抢回焦点，`aboutToDisappear` 清定时器；⑥ `onKey` 兼容只发 `KeyType.Up` 的 ESC；⑦ `quitApp()` 去掉 `await flushPos()`，改同步 `flushPosSync()` 后立即 `terminateSelf()`，加 AppStorage 上下文兜底与 `.then/.catch` 结果日志；⑧ **状态栏内置 `ESCDBG` 诊断串** + hilog 打点；⑨ 原 `onKey` 签名、ESC 分派代码、几何恢复、放大镜、画质接线一字未动 |
| `entry/src/main/ets/entryability/EntryAbility.ets` | `onCreate` 用 `AppStorage.setOrCreate('abilityContext', this.context)` 缓存 UIAbilityContext，供 `quitApp()` 在 `getHostContext()` 为空时兜底 |
| `tests/dirname.test.mjs` | 新增 11 条第二十轮断言（双通道 / 焦点 / Up 兼容 / 去阻塞 / 上下文兜底 / 诊断可观测 / 回归护栏），**1171 → 1182**；并在组内**明确写出「静态契约不替代真机验证」**及环境实测证据 |
| `README.md` | 功能表订正 + 本节（环境限制 / 病根 / 改动 / 真机验证 / 诊断对照表） |

### 验证结果（区分两种「验证」）

| 类型 | 结果 | 能证明什么 |
|---|---|---|
| **真实 ArkTS 编译** | `hvigorw --mode module -p product=default assembleHap --no-daemon` → **`BUILD SUCCESSFUL in 14 s 80 ms`**（33 tasks，已签名 `entry-default-signed.hap` 832,692 bytes） | `focusControl.requestFocus` / `onKeyPreIme` / boolean 版 `onKeyEvent` / `AppStorage` 上下文均为**合法 SDK 26 用法**，不是纸面代码；产物可安装 |
| 静态契约测试 | `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1182 passed, 0 failed** | 接线存在、既有 1171 条回归护栏未坏；**不证明按键到达** |
| 语法 / 补丁 | `node --check`、`git diff --check`、括号净平衡 | 源码可解析、无空白错误 |
| **真机按两次 ESC** | **本会话无法执行**，待用户按下方步骤验证 | 唯一能证明故障已消除的验证 |

按既定约束：**未跑 `build.sh`、未把 HAP 放桌面、未升版本（`1.0.7` / `versionCode: 7`）、未 push**；
编译产物留在项目 `entry/build/default/outputs/default/`。

### 真机验证步骤（请在装有 APP 的机器上执行）

1. 安装本次签名包 `entry/build/default/outputs/default/entry-default-signed.hap`
   （或在 DevEco Studio 里重新编译运行；状态栏出现 `ESC#` 字样即表示装的是本轮新包）。
2. 启动 APP，按原有方式**双击鼠标进入全屏**。
3. **第一次按 ESC** → 应返回普通模式并恢复进入前窗口尺寸位置。
4. **第二次按 ESC** → 应立即退出 APP。
5. 若第 4 步仍没退出：**把状态栏那一行的文字截图发我**（或贴 `hilog` 中 `ESCDBG` 过滤结果）。
   状态栏形如 `已退出全屏  ·  ESC#2 full=F type=D act=3 (QUIT_APP) → quitApp → terminateSelf()`。
6. 若状态栏**完全没有 `ESC#` 字样**，请补做一个判别：在普通模式下按一次 **F11**。
   F11 能切换全屏 → 键盘焦点在、是 ESC 被系统/IME 优先消费；F11 也无反应 → 根组件焦点确实丢了。
   把结果一并回传，可直接定位是该改焦点策略还是加系统级按键订阅。

### 诊断串对照表（按完两次 ESC 看状态栏）

| 状态栏显示 | 断点定位 | 下一步 |
|---|---|---|
| 完全没有 `ESC#` 字样 | ESC 事件**根本没到 `onKey()`**（系统/IME 消费或焦点丢失） | 回传截图；检查窗口焦点，必要时加系统级按键订阅 |
| `ESC#1 full=T … (EXIT_FULL)`，之后没有 `ESC#2` | 第二次 ESC 没到达（返回普通模式后焦点仍丢） | 回传截图；调整重聚焦时机 / 焦点目标 |
| 两次都是 `full=T act=2 (EXIT_FULL)` | 首次 ESC 后 `fullscreen` 没同步回 false（自愈未触发） | 回传截图；查 `onAreaChange` 缩小判据 |
| `ESC#2 full=F … (QUIT_APP) → quitApp → terminateSelf()` 但 APP 未关闭 | `terminateSelf()` 被系统拒绝 / 该形态下不生效 | 回传截图；改用窗口销毁或进程退出兜底 |
| `NO_CONTEXT` / `REJECTED` / `EXCEPTION` | 上下文获取失败 / 退出 Promise 拒绝 / 抛异常 | 回传截图，按具体标记修 |
| APP 在第二次 ESC 正常关闭 | ✅ 修复完成 | 无需回传 |

### 覆盖的验证场景

| # | 场景 | 预期 |
|---|---|---|
| 1 | 用户复现路径：双击进全屏 → 两次 ESC | 首次返回并恢复几何，第二次立即退出 APP |
| 2 | 真全屏沉浸态 ESC 被系统/IME 优先拿 | `onKeyPreIme` 消费或系统自愈 + 重聚焦，两态分派仍生效 |
| 3 | 连贯快按两次 ESC（间隔 <100ms） | 无按键冷却、无补发标志，第一次 `EXIT_FULL`、第二次 `QUIT_APP` |
| 4 | 只派发 `KeyType.Up` 的 2in1 键盘 | 当作一次有效 ESC 处理，且不会双触发 |
| 5 | `onKeyPreIme` 与 `onKeyEvent` 都收到同一次 ESC | `setTimeout(0)` 标记去重，只处理一次，首次 ESC 不会误退 APP |
| 6 | 退出时 preferences I/O 慢 / 死路径 | 同步 `flushPosSync()` 毫秒级必达，`terminateSelf()` 不被阻塞 |
| 7 | `getHostContext()` 为空 | AppStorage 缓存的 UIAbilityContext 兜底；仍失败则状态栏显示 `NO_CONTEXT` |
| 8 | 双击 / F11 / 退出按钮主动退全屏、多次往返 | 严格两态、几何快照幂等、重聚焦不干扰 |
| 9 | 回归：放大镜开关 / 右键 toggle / 画质三处 / AA 五源 / 顶栏 / 缓存 / 版本 | 全部不变（`1.0.7`） |

## 第十九轮：第二次 ESC 无响应修复 —— ESC 严格两态定稿 / 彻底废除补发吞键（2026-11-15）

> ⚠️ **订正（第二十轮）**：本节把 `ALL PASS 1171` 当成「验证结果」，但它只是静态契约测试。
> 用户第四次反馈仍未修好 —— 病根不在纯函数，而在 ESC 事件到达与退出执行链路。
> 本节「严格两态」结论**保留且未被推翻**，但「已修复」的判断**以最上方第二十轮章节及真机验证为准**。

用户实机复现：**进入 APP 后按原有方式双击鼠标（进全屏），第一次按 ESC 可返回，第二次按 ESC 无任何响应**；
按预期「首次 ESC 返回、再次 ESC 正常退出」不符。本轮只修这一处交互，**不改动任何页面布局、既有功能与 `Index.ets` 代码行**。

> ⚠️ **本节取代第十六 / 十八轮关于「系统补发 ESC」的全部结论**：400ms 时间冷却（第十六轮）与
> `pendingSystemEcho` 一次性补发标志（第十八轮）本质都是对「系统消费首次 ESC 后会补发一次给 APP」的
> 错误猜测。实机**系统消费后并不补发**，于是标志永不消费，反而把用户主动按下的第二次 ESC 吞掉。
> 详见第十六 / 十八轮章节订正注记，以本节为准。

### 复现步骤与根因

| 步 | 现象 | 链路 |
|---|---|---|
| 1 | 双击进全屏 | `setFull(true)`，记录 `fullEnterAt` 与全屏画布基准 |
| 2 | 第一次按 ESC「可返回」 | 真全屏 ESC **由系统窗口管理器先消费、自行退出沉浸**，APP 收不到该按键；系统栏 / dock 回来使画布缩小约 20px → `onAreaChange` 的 `shouldSelfHealOnResize`（≥8px 绝对像素）触发自愈 → `setFull(false, true)` 把 `fullscreen` 同步回普通态 |
| 3 | 第二次按 ESC「无任何响应」 | 第十八轮在自愈下降沿经 `shouldArmSystemEcho(true,…)` 置位 `pendingSystemEcho=true`，`escActionByState(false, true)` 返回 `ESC_ACT_NONE`「吞一次补发 ESC」。但**系统并未补发 ESC**，没有任何事件来消费该标志，用户主动的第二次 ESC 到达时标志仍挂着 → 被判 `NONE` 吞掉 → 无响应 |

反证补发不存在：若系统当真补发，那次补发会先消费掉标志（判 `NONE`），用户第二次 ESC 就能落到 `QUIT_APP`
而正常退出 —— 与「第二次 ESC 无响应」矛盾。故「吞补发 ESC」是**无的放矢**，且是本次故障的直接病根。

### 修复（严格两态，零吞键）

| 文件 | 改动 |
|---|---|
| `InteractionPlan.ts` | ① `escActionByState(fullscreen, _pendingSystemEcho)` **严格只按 `fullscreen` 两态分派**：全屏恒 `EXIT_FULL`、普通恒 `QUIT_APP`，删除 `if (pendingSystemEcho) return NONE` 分支（第二参数保留兼容、刻意不参与判定）；② `shouldArmSystemEcho(...)` **恒返回 `false`**，自愈下降沿也不再置位 → `pendingSystemEcho` 恒为 `false`。两个导出名 / 参数个数 / 返回值类型全部不变 |
| `Index.ets` | **代码行一字未改**：ESC 分派仍走 `escActionByState(this.fullscreen, this.pendingSystemEcho)`、`setFull` 仍保留 `bySystemHeal` 与 `setFull(false, true)` 自愈调用。因两个纯函数语义改变，两条「首次 ESC」路径（APP 主动处理 / 系统消费后自愈）都收敛到「普通态再次 ESC → `QUIT_APP`」。仅订正 4 处过时注释（顶部常量区、`setFull` 下降沿、ESC 分支、自愈分支），标注第十九轮定稿与「系统消费后不补发」 |
| `tests/dirname.test.mjs` | 改写 3 条旧机制断言（普通态恒 `QUIT_APP` / `shouldArmSystemEcho` 恒 false / 场景 4 本 bug 回归），订正 6 处过时标题；新增 19 条第十九轮断言（复现路径 + 严格两态四象限全矩阵 + 端到端场景 A~G + 源码静态契约与回归护栏）。**1152 → 1171** |
| `README.md` | 订正功能表「关闭应用」「全屏」两行；新增本节；在第十六 / 十八轮订正注记处追加第十九轮说明 |

设计取舍：不再尝试用时间窗或一次性标志去「猜」系统是否补发 —— 既无法区分补发与主动按键，又会挂住
一个永不消费的标志。**ESC 只看当前窗口状态**：全屏 = 退全屏，普通 = 退 APP，无第三态、无冷却、无吞键。
`pendingSystemEcho` 字段 / `bySystemHeal` 参数 / `setFull(false, true)` 调用刻意保留（供诊断、且避免改动
几何恢复等既有接线），但已完全不参与 ESC 分派，杜绝复发。

### 验证场景与对应预期效果

| # | 场景 | 操作 | 预期效果 |
|---|---|---|---|
| 1 | **用户复现路径（核心）** | 进 APP 双击进全屏 → 第一次 ESC → 第二次 ESC | 第一次返回普通模式并恢复进全屏前尺寸位置；**第二次立即退出 APP**（不再「无任何响应」） |
| 2 | 首次 ESC 由 APP 收到 | 全屏态按一次 ESC | `escActionByState(true,…)` → `EXIT_FULL`：只退全屏、恢复几何，绝不退出 APP |
| 3 | 首次 ESC 被系统消费 | 真全屏系统自行退出沉浸、画布缩小 ~20px | `shouldSelfHealOnResize` 自愈 → `setFull(false, true)` 同步普通态，`shouldArmSystemEcho` 恒 false，**不置任何标志** |
| 4 | 再次 ESC（普通态，标志真/假两种） | 自愈后按 ESC | `escActionByState(false, false)` 与 `(false, true)` 都 → `QUIT_APP`：立即退出 APP，即使残留 `true` 也绝不吞键 |
| 5 | 连贯快按两次 ESC | 间隔 <100ms | 第一次 `EXIT_FULL`、第二次 `QUIT_APP`，无需按到第三次，无 400ms 冷却 |
| 6 | 双击 / F11 / 退出按钮退全屏 | 用非 ESC 方式主动退出 | `bySystemHeal=false` 恒不置位，随后第一次 ESC 立即退出 APP |
| 7 | 多次全屏往返 | 反复进 / 出全屏 | 每轮严格两态，几何快照幂等、最大化态不误缩，无累积标志 |
| 8 | 自由窗口 / 最大化几何 | 不同窗口形态进全屏再 ESC | 上升沿照常抓快照；自由窗口精确 `resize`+`moveWindowTo` 还原、最大化态保持，不受本轮影响 |
| 9 | 回归：全部既有交互 | 放大镜开关 / 右键 toggle / 顶栏滞回 / 主视图画质 / 点选零滚动 / hover / 缓存 / 版本 | 三处画质属性、5 处 `antialiased`、右键 toggle、`topBarPeek`、放大镜几何、版本 `1.0.7` 全部不变 |

### 校验

`node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1171 passed, 0 failed**；
`node --check` / `git diff --check` / 括号净平衡全绿；版本仍 `1.0.7` / `versionCode: 7`。
按既定约束**未编译 HAP / 未放桌面 / 未跑 build.sh / 未升版本 / 未 push**；
DevEco Studio（API 26）编译与实机按上表 9 个场景验证（尤其场景 1 的「第二次 ESC 正常退出」）仍由用户侧完成。

## 第十八轮：窗口模式交互重做 —— ESC 严格两态 / 废除时间冷却 / 全窗口态几何快照 / 绝对像素自愈（2026-11-15）

用户实机反馈第十六轮的「窗口模式 / ESC 分状态 / 全屏往返几何恢复」**没有实现**。本轮不沿用第十六轮
「靠 400ms 时间冷却猜补发键 + 0.92 比例阈值自愈 + floating-only 快照」的思路，重新定位到三处确定根因，
在**完全保留当前交互、页面布局与既有功能**的前提下重做 ESC 状态机与几何恢复。

> ⚠️ **本节取代第十六轮关于 ESC 冷却的结论**：400ms 时间窗无法区分「系统补发 ESC」与
> 「用户主动的第二次 ESC」，是「返回普通模式后再次按 ESC 应退出 APP」失效的主因。详见第十六轮章节订正注记。
>
> ⚠️ **订正（第十九轮）**：本节引入的 `pendingSystemEcho` 一次性补发标志同样会误吞第二次 ESC ——
> 系统消费首次 ESC 后并不补发，标志永不消费，实机把用户主动按下的第二次 ESC 吞成「无响应」。
> 第十九轮已彻底废除：`escActionByState` 严格两态 + `shouldArmSystemEcho` 恒 false，无任何补发 / 吞键分支。
> 本节验证场景 8~11 中「补发 ESC 被吞」相关预期已由第十九轮取代，**以最上方第十九轮章节为准**。

### 诉求

> 请实现窗口模式交互逻辑：从普通模式双击鼠标进入全屏时，保留进入前的窗口尺寸和位置；
> 在全屏状态下首次按 ESC，应退出全屏、返回普通模式，并恢复该尺寸和位置；
> 返回普通模式后再次按 ESC，应退出 APP。确保 ESC 响应按当前窗口状态区分，
> 避免首次按 ESC 直接退出 APP。

拆解：① 双击进全屏保存窗口几何；② 全屏首次 ESC 退全屏 + 恢复几何、绝不退出 APP；
③ 普通模式再次 ESC 退出 APP；④ ESC 只按当前窗口状态区分。

### 根因（「没有实现」的三个确定原因）

| # | 根因 | 为什么导致「没实现」 |
|---|---|---|
| 1 | **400ms 时间冷却误吞主动二次 ESC（主因）** | `escActionOf(false, sinceExitMs, 400)` 在「距上次退出全屏 < 400ms」时把 ESC 判为 `NONE` 吞掉；而 `setFull()` 下降沿（6351）与自愈分支（7362）对**所有**退出路径都无条件刷新 `lastFullExitAt`。用户「退出全屏后紧接着按第二次 ESC」几乎必然落在窗内 → 被当成补发键吞掉 → **「再次 ESC 退出 APP」永远不成立**；用户往往要按到第三次才退出。时间窗根本无法区分「系统补发」与「用户主动按键」 |
| 2 | **自愈比例阈值过严 → 真全屏下状态长期不同步** | 真全屏 ESC 常被窗口管理器先消费，系统自行退出沉浸后往往只是 title / dock / 系统栏回来，画布仅缩小几十 px（约 0.95）；而 `shouldExitFullOnResize` 要求缩到 `0.92` 以下才自愈 → 自愈从不触发 → `fullscreen` 与真实窗口脱节，界面布局卡在全屏态、ESC 「按状态区分」整体失效 |
| 3 | **几何快照 floating-only → 常常根本不抓** | `shouldCaptureWindowRect` 额外要求 `getWindowStatus()===FLOATING`；PC / 2in1 上自由窗口的状态值不总是 FLOATING（也可能 MAXIMIZE / UNDEFINED，或读取抛异常）→ 快照不抓 → 退出时 `hasPreFullRect=false` → **「保留并恢复进入前尺寸位置」不执行** |

### 改动

| 文件 | 改动 |
|---|---|
| `InteractionPlan.ts` | 新增 ⑨ 节纯函数：`escActionByState`（严格两态、无时间冷却）、`shouldArmSystemEcho`（仅系统被动退出置一次补发标志）、`shouldCaptureRectAll`（上升沿 + rect 合法即抓，放宽 floating 限制）、`shouldApplyRectRestore`（仅自由窗口才精确 resize/move）、`shouldSelfHealOnResize`（≥ `minShrinkPx` 绝对像素缩小即自愈）。第十六轮旧 `escActionOf` / `msSinceFullExitOf` / `shouldCaptureWindowRect` / `shouldRestoreWindowRect` 全部保留供回归 |
| `Index.ets` | ① `onKey(ESC)` 改走 `escActionByState(fullscreen, pendingSystemEcho)`，彻底删除时间冷却；② 新增 `pendingSystemEcho` 一次性标志，仅 `setFull(false, true)`（系统自愈）经 `shouldArmSystemEcho` 置位、被任意一次 ESC 消费即清零；③ `setFull(on, bySystemHeal=false)` 加来源参数，主动退出（ESC/F11/双击/按钮）恒清标志 → 二次 ESC 立即退 APP；④ 自愈同时保留 `0.92` 比例快路径 + 新增 `≥8px` 绝对像素判据（捕获系统栏回来）；⑤ `capturePreFullRect` 放宽到所有普通窗口态并记 `preFullFloating`；⑥ `restorePreFullRect` 仅自由窗口 `resize`+`moveWindowTo`，最大化态交给 `EXIT_IMMERSIVE` 维持形态不误缩 |
| `tests/dirname.test.mjs` | 同步 9 条第十六轮旧静态断言到新接线；新增 20 条第十八轮断言（4 组纯函数 + 端到端场景矩阵 + 源码静态契约 + 回归护栏）。**1132 → 1152** |

`FULL_EXIT_ESC_GUARD_MS = 400` 常量与 `escActionOf(...)` / `msSinceFullExitOf(...)` 在 `Index.ets` 的接线
全部移除；`lastFullExitAt` 字段保留但仅用于日志 / 诊断，不再参与 ESC 分派。

### 验证场景与对应预期效果

| # | 场景 | 操作 | 预期效果 |
|---|---|---|---|
| 1 | 自由窗口进全屏 | 普通模式自由窗口（任意尺寸位置）双击进全屏 | 保存进入前 `left,top,width,height` 快照 + 记录「进入前是自由窗口」；真全屏（无标题栏 / dock / 任务栏） |
| 2 | 最大化窗口进全屏 | 窗口已最大化时双击进全屏 | 同样保存快照（不再 floating-only 漏抓），记录「进入前非自由窗口」 |
| 3 | **全屏首次 ESC（核心）** | 全屏态按一次 `Esc` | `escActionByState(true, …)` → `EXIT_FULL`：只退出全屏、返回普通模式、恢复几何；**绝不退出 APP** |
| 4 | 自由窗口几何精确恢复 | 场景 1 后按 ESC | 退出时 `recover()`/`EXIT_IMMERSIVE` 之后精确 `resize`+`moveWindowTo` 还原进入前尺寸与位置 |
| 5 | 最大化态不误缩 | 场景 2 后按 ESC | 保持最大化形态（`EXIT_IMMERSIVE`），不拿 rect 把窗口缩成自由窗口 |
| 6 | **返回普通模式后再次 ESC（核心）** | 场景 3 后紧接着（< 400ms 也测）再按一次 `Esc` | `pendingSystemEcho=false` → `QUIT_APP`：**立即退出 APP**，不再被时间冷却误吞 |
| 7 | 连贯双击式快按 | 进全屏后 ESC 紧接着 ESC（间隔 < 100ms） | 第一次退全屏、第二次退 APP，无「要按第三次」现象 |
| 8 | 系统消费 ESC（小幅缩小） | 真全屏下 ESC 被窗口管理器先消费，系统仅恢复 title/dock，画布缩小 ~20px | `shouldSelfHealOnResize`（≥8px 绝对像素）触发自愈 → `setFull(false, true)` 同步状态 + 恢复几何（比例阈值 0.92 抓不到这种小幅缩小） |
| 9 | 系统补发 ESC | 场景 8 后系统又补发一次 ESC 到 APP | `pendingSystemEcho=true` → `NONE` 吞掉这一次，标志随即清零；**首次 ESC 不会直接退出 APP** |
| 10 | 补发后用户主动 ESC | 场景 9 后用户再按 ESC | `pendingSystemEcho` 已清 → 立即退出 APP |
| 11 | 双击 / F11 / 退出按钮退出全屏 | 用双击、F11、顶栏退出按钮代替 ESC 退全屏 | 都是 `bySystemHeal=false` 主动路径，`pendingSystemEcho` 恒 false，随后第一次 ESC 立即退出 APP |
| 12 | F11 往返 / 多次往返 | 反复进 / 出全屏 | 每轮上升沿清空并重抓快照、用完即清，几何恢复幂等、不串图；放大镜 / 画质不受影响 |
| 13 | 窗口状态读取异常 | `getWindowStatus()` 抛异常 / 返回非 FLOATING | 宽判据仍按 `getWindowProperties().windowRect` 抓几何，`windowRectUsable` 兜底；不误缩窗口 |
| 14 | 非法 rect | 窗口 rect 为 0 / NaN / 超界 | `shouldCaptureRectAll` + `windowRectUsable` 拒绝，退出时 `hasPreFullRect=false` 降级到既有 `recover()`/`EXIT_IMMERSIVE`，绝不拿空 rect 去 resize |
| 15 | 进全屏过渡期抖动 | 刚进全屏 900ms 内画布来回变 | `healReady` 稳定期挡住，不误判为「系统退出沉浸」、不被踢出全屏 |
| 16 | 回归：画质 / 放大镜 / 交互 | 放大镜开关、右键 toggle、顶栏滞回、主视图画质、点选零滚动、hover、缓存、版本 | 三处画质属性、5 处 `antialiased`、右键 toggle、`topBarPeek`、放大镜几何、版本 `1.0.7` 全部不变 |

### 校验

`node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1152 passed, 0 failed**；
`git diff --check` / 括号净平衡 / `node --check` 全绿；版本仍 `1.0.7`。
按既定约束**未编译 HAP / 未放桌面 / 未跑 build.sh / 未升版本 / 未 push**；
DevEco Studio（API 26）编译与实机逐场景验证（尤其场景 1~11 的窗口几何与 ESC 时序）仍由用户侧完成。

---

## 第十七轮：放大镜边缘抗锯齿 —— SDK 插值档语义修正 / 真实密度 / 原图上限夹界 / 增益跳过 / PixelMap 边缘 AA（2026-11-15）

第十六轮把画质全押在「按倍率重解码高清图源」上，并主动放弃了插值档。实机反馈**放大后仍有锯齿**。
本轮核对本机 SDK 26 官方声明后发现：第十六轮把一个关键 API 的限制**张冠李戴**了，
且插值档位完全选反 —— 这才是「仍有锯齿 / 发糊」的直接主因。本轮在**完全不改交互、页面布局与既有功能**
的前提下重定位并修复，覆盖不同放大倍率、不同尺寸图片、常见屏幕显示条件，并保持性能稳定。

> ⚠️ **本节推翻第十六轮关于 `.interpolation()` 的结论**：第十六轮「`.interpolation()` 对 PixelMap
> 不生效」是错的 —— 那其实是 `sourceSize()` 的限制。详见下方「根因」表与第十六轮章节的订正说明。

### 诉求

> 请优化现有图片放大镜功能，修复放大后的图片仍出现锯齿的问题。在保留当前交互、页面布局和已有功能的
> 前提下，定位造成边缘不平滑的关键原因并完成相应代码修改，使不同放大倍率、不同尺寸图片和常见屏幕显示
> 条件下都能保持边缘平滑、细节清晰，避免明显锯齿、像素化和过度模糊；同时确保性能稳定。
> 请列出需要覆盖的验证场景及对应预期效果。

拆解：① 定位真根因（而非继续加码重解码）；② 任意放大倍率都边缘平滑、细节清晰；
③ 不同尺寸图片都避免锯齿 / 像素化 / 过度模糊；④ 常见屏幕条件（尤其高 DPI / 不同 density）下稳定；
⑤ 性能稳定；⑥ 列出验证场景与对应预期效果。

### 根因（核对本机 SDK 26 `component/image.d.ts`）

| # | 根因 | 官方证据 |
|---|---|---|
| 1 | **SDK 误判**：第十六轮断言「`.interpolation()` 对 `PixelMap` 不生效」，于是放弃插值档 | L1070-1086 `interpolation()` 官方注释 "mitigates aliasing during image scaling"，**只排除 SVG / AnimatedDrawableDescriptor**，对 `PixelMap` 正常生效；真正对 PixelMap 不生效的是 L1088-1089 的 **`sourceSize()`** —— 两者被搞混了 |
| 2 | **插值档完全选反（锯齿主因）** | L190-236：`None`=最近邻（锯齿之源）、`Low`=双线性（SDK 默认）、`Medium`=**MipMap（缩小专用低分辨率金字塔）**、`High`=**Cubic（官方 "highest possible quality" 放大档）**。第十六轮 `scale>2 → Medium`，而放大镜 `loupeScale()` 恒为 `3×zoom×1` → **默认恒走 MipMap**，放大既不锐利也不平滑；`≤1:1` 还用 `None`。等于把最该用 Cubic 的场景送进了缩小专用档 |
| 3 | **PixelMap 边缘 AA 默认关闭** | L1723-1745 `antialiased`（since 23，本工程 compileSdk 26 可用）官方 "enable anti-aliasing for the **edges of a pixel map image**"、"If the attribute is not set, anti-aliasing is **disabled by default**"。放大镜正是「PixelMap 放大后裁成圆」的典型场景，五个图源此前一个都没开 |
| 4 | **密度比写死 1，高 DPI 屏低估倍率** | `@ohos.display` `Display.densityPixels ∈ [0.5, 4.0]`（常见 1.0 / 3.0）。第十六轮 `LOUPE_DENSITY_RATIO = 1` 写死，高 DPI 屏 1vp = 2~3 物理像素，有效倍率与「放大后所需真实像素」被严重低估 —— 这是「常见屏幕显示条件下仍发虚」的缺口 |
| 5 | **目标解码边可能超过原图，白解码 + 白占内存** | `decodePx` 的 `desiredSize` **只能降采样、不能升采样**（L1088 "works only when the target size is smaller than the source size"）。第十六轮 `主视图解码边 × 3` 不夹原图长边，小图时请求超过原图边毫无意义，只会白解码一次 + 白占一张大 `PixelMap` |

### 做法

| 环节 | 改动 |
|---|---|
| 纯函数（`InteractionPlan.ts` ⑧ 节） | 新增 `loupeDensityRatioOf`（NaN / 非法回退 1、夹 [0.5,4.0]）、`loupeQualityTierOf`（任意 >1:1 → HIGH，≤1:1 / NaN → LOW）、`loupeResampleEdge2Of`（`base × scale` 夹 cap **再夹原图长边**）、`loupeResampleGainOf`（无真实像素增益返回 false）；常量 `LOUPE_DENSITY_MIN/MAX/FALLBACK`、`LOUPE_AA_ENABLED`、`LOUPE_QA_HIGH/LOW`。**第十六轮旧函数 / 常量保留供回归断言，但 Index.ets 不再 import / 调用** |
| 真实设备密度 | `import display from '@ohos.display'`；`loupeDensityOf()` **懒读一次并缓存** `display.getDefaultDisplaySync().densityPixels`，try/catch 兜底 `LOUPE_DENSITY_RATIO=1` 再经 `loupeDensityRatioOf` 归一化；字段 `loupeDensity` 写在放大镜区，**绝不进 `aboutToAppear` 启动路径**（启动只打常量快照，不引入新的同步 IO）；`loupeScale()` 由写死 1 改为接 `loupeDensityOf()` |
| 插值档修正（核心） | `loupeInterpolation()` 改由 `loupeQualityTierOf(this.loupeScale())` 驱动：**>1:1 一律 `ImageInterpolation.High`(Cubic)**、≤1:1 一律 `Low`(双线性)；**彻底移除 `Medium`(MipMap) 与 `None`(最近邻)** 两处返回 |
| PixelMap 边缘 AA | `loupeLayer()` 的 **5 个图源**（高清 `loupeHiPx` / 右页 `rightPixelMap` / 主视图 `viewPixelMap` / 低清 `lowPixelMap` / `Image(uri)` 兜底）全部加 `.antialiased(LOUPE_AA_ENABLED)`；参数是 `Optional<boolean>`，工程未用 `resizable`、未设 `backgroundColor`，官方两个失效条件都不触发 |
| 目标解码边夹到原图 | `loupeResampleTargetEdge(uri)` 改为 `loupeResampleEdge2Of(this.viewEdge(), this.loupeScale(), this.srcLongOf(uri), 8192)`；`>1:1` 时按真实倍率算需求，夹 `8192` cap 后**再夹到原图长边**（`Math.floor(srcLong)`），`≤1:1` 返回 base 旁路 |
| 无增益跳过（性能稳定） | `ensureLoupeHiRes()` 先过 `loupeResampleGainOf(edge, srcLongOf(uri), viewEdge(), 96)`：**小图 / 原图分辨率不足 / 已按原图满分辨率解过时不重解码**，直接靠 Cubic + AA 保证边缘平滑，并 `clearLoupeHiRes()` 释放已有高清源让它回退到既有 4 个分支 —— 省一次解码、省一张大图内存 |
| 高清源无效正确回退 | `loupeHiUsable()` 保持 `loupeHiPx` 非空 + `loupeHiUri`/`loupeHiPane` 双重校验 + `loupeNeedsResampleOf`；无增益分支清掉高清源后自动落到既有 4 个兜底分支，且这 4 个分支现在也已开 AA + 两档插值，画质不塌陷 |
| 保持不动 | 右键 toggle、6cm 双页独立、全屏保留 / 退出全屏不失效、点选零滚动、顶栏贴顶唤出、hover 缩略图、主视图三处画质计数、resize 实时重解、缓存账目、ESC 分状态 / 窗口几何、版本号 **1.0.7**、整像素对齐、`loupeHiToken` 迟到结果作废、`loupeResampleStableOf` 稳定阈值，全部原样保留 |

### 验证场景及对应预期效果（需覆盖）

| # | 场景 | 操作 | 预期效果 |
|---|---|---|---|
| 1 | 默认放大镜（1:1 以上） | 右键开放大镜，悬停主视图 | 圆内边缘平滑、线条清晰、形状颜色不失真；**不再有 MipMap 造成的发糊 / 像素块**（本轮修复前默认恒走 `Medium`） |
| 2 | 低倍放大（1:1 < 有效倍率 ≤ 2×） | 主视图缩放到刚好 >100% | 走 `High`(Cubic) 而非 `None`/`Medium`；边缘平滑不锯齿 |
| 3 | 高倍放大（有效倍率 > 2×，直至 3× / 9×） | Ctrl+滚轮继续放大 | **仍走 `High`(Cubic)**，不会退化成 `Medium`(MipMap) 或 `None`(最近邻)；细节清晰、无过冲光晕 / 振铃伪影 |
| 4 | 正好 1:1（100%） | 按 `F` / 缩放到 100% | `loupeNeedsResampleOf=false` 完全旁路：不额外解码、不改主视图画质；`Low` 档逐像素对应，画质与修复前一致 |
| 5 | 缩小显示（<100%） | 缩小主视图 | 同 #4 完全旁路，插值 `Low` 比最近邻更平滑，无回归 |
| 6 | 小尺寸图片（原图 1024px 以下） | 打开低分辨率相片并放大 | 目标边夹到原图长边、`loupeResampleGainOf=false` **跳过重解码**；靠 Cubic + AA 保持边缘平滑，不像素化；不白占一张大 `PixelMap` |
| 7 | 大尺寸图片（4000px+ / HEIC 高分辨率） | 打开高分辨率相片并放大 | 目标边按真实倍率补足、夹 8192 cap，重解码出真实像素；细节清晰不模糊、不锯齿 |
| 8 | 常见高 DPI 屏（density 2.0 / 3.0） | 高 DPI 显示器 / 缩放 150%~300% | `densityPixels` 参与有效倍率，所需真实像素不再被低估；边缘仍平滑、不发虚 |
| 9 | 低 DPI / 异常 density（0.5 / 越界 / 读不到） | 低 DPI 屏或 display 读失败 | `loupeDensityRatioOf` 夹到 [0.5,4.0] / 回退 1；放大镜不失效、不崩溃 |
| 10 | 鼠标圆内高频微动（性能） | 在圆内快速来回移动 | `loupeResampleStableOf`（差 <64 复用）+ 无增益跳过，**不反复重解码、不掉帧**；`loupeHiToken` 作废迟到结果不泄漏 |
| 11 | 切图 / 换页 / 对开双页 | 滚轮翻页、左右页各自悬停 | uri/pane 双重校验，绝不把上一张高清图错画到新图上；左右页独立、画质一致（5 源统一 AA） |
| 12 | 全屏 / 退出全屏 | 双击进全屏、ESC 退出 | 放大镜保留且画质不失效；ESC 分状态、窗口几何恢复不受影响 |
| 13 | 开关 / 生命周期 | 右键 toggle 关闭、切模式、页面销毁 | `clearLoupeHiRes()` 释放并作废旧代号；不泄漏 PixelMap |
| 14 | 既有交互回归 | 点选零滚动 / 顶栏贴顶 / hover 缩略图 / resize / 缓存账目 / 往上层 | 全部行为不变（静态契约逐条断言） |
| 15 | 启动路径（性能护栏） | 冷启动 APP | `display` 只在放大镜首次使用时懒读，**不进 `aboutToAppear`**；不引入新的启动同步 IO，无 `APP_INPUT_BLOCK` 回归 |

### 验证（本地，未编译 HAP）

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1132 passed, 0 failed**
  （1116 → 1132，新增 16 条第十七轮契约：4 组纯函数 + 边界矩阵「不同倍率 × 不同尺寸 × 不同 DPI」、
  8 条源码静态契约、旧误判清除断言、回归护栏；**改写 3 条第十六轮旧静态断言**到新接线）。
- 纯函数边界用例：`densityPixels` NaN / 0 / 负 / 越界 / 高 DPI；画质档 `1.0001 / 2 / 3 / 6 / 12 / NaN`；
  目标边 `scale=9` 夹 cap 与原图、原图 1500.9 → 1500、`≤1:1` 旁路；增益阈值 1096/1097、原图未知保守放行。
- `git diff --check` / 剥离字符串注释后括号净平衡全 0 / `node --check` / `node --experimental-strip-types --check` 全绿；
  版本仍 `1.0.7`，`AppScope/app.json5` 未改。
- 计数型护栏：`.antialiased(LOUPE_AA_ENABLED)` **恰好 5 处**、`.interpolation(this.loupeInterpolation())` 5 处、
  `.objectFit(ImageFit.Contain)` 5 处；主视图三处 `autoResize(false)` / `dynamicRangeMode(` / `High` 未动。

### 待用户侧确认（DevEco Studio 编译 + 实机）

1. 在 DevEco Studio（API 26）编译通过 —— 重点确认 `import display from '@ohos.display'`、
   `getDefaultDisplaySync().densityPixels`、`.antialiased(Optional<boolean>)` 三处 API 在真机 SDK 下无签名报错。
2. 按上表 **#1~#9** 逐档实机观察：任意倍率边缘平滑、细节清晰，无锯齿 / 像素化 / 过度模糊；
   高 DPI 屏不发虚；小图不像素化、大图不模糊。
3. **#10~#15** 交互与性能回归：圆内高频移动不掉帧、切图换页不串图、全屏往返不失效、冷启动无卡顿。

**本次仍未编译 HAP / 未放桌面 / 未跑 `build.sh` / 未升版本 / 未 push**；DevEco Studio 编译、
HAP 安装与实机验证仍由用户侧完成。


## 第十六轮：全屏往返窗口几何 / ESC 分状态 / 放大镜 >1:1 重采样（2026-11-15）

> ⚠️ **订正（第十七轮）**：本节「做法（放大镜重采样）」中关于
> 「ArkUI `.interpolation()` 对 `PixelMap` 图源不生效」的判断**有误**（那是 `sourceSize()` 的限制），
> 且三档插值（`None / High / Medium`）档位选反 —— 放大镜恒 3× 却恒落 `Medium`(MipMap，缩小专用)。
> 这两点已在**第十七轮**修正为「放大一律 `High`(Cubic) + 五源全开 `.antialiased(true)` + 真实设备密度」。
> 本节其余内容（整像素对齐 / token 性能护栏）仍然有效。详见上方第十七轮章节。
>
> ⚠️ **订正（第十八轮）**：本节「做法（窗口 / ESC）」里用 **400ms 时间冷却**判「系统补发 ESC」、
> **0.92 比例阈值**自愈、**floating-only** 抓几何快照这三处设计，实机导致整套
> 「窗口模式 / ESC 分状态 / 全屏往返几何恢复」**未真正实现**：冷却把用户主动的第二次 ESC 误吞
> （「再次 ESC 退出 APP」失效）、比例阈值抓不到系统栏回来那种小幅缩小（状态不同步）、
> floating-only 让最大化态 / 状态读取异常时根本不抓快照（几何不恢复）。
> 已在**第十八轮**全部重做：`escActionByState` 严格两态无冷却 + 按来源置位的一次性补发标志 +
> ≥8px 绝对像素自愈 + 全窗口态几何快照（记录进入前形态，最大化态不误缩）。**本节窗口/ESC 做法已被取代**，
> 以最上方第十八轮章节为准；放大镜重采样部分见第十七轮订正。
>
> ⚠️ **订正（第十九轮）**：上句所述第十八轮「按来源置位的一次性补发标志」实机同样把用户主动的
> 第二次 ESC 误吞成「无响应」（系统消费首次 ESC 后并不补发）。已在**第十九轮**彻底废除：
> `escActionByState` 严格只按 `fullscreen` 两态分派、`shouldArmSystemEcho` 恒 false。
> **本节及第十八轮关于「系统补发 ESC」的做法均已被取代**，以最上方第十九轮章节为准。

两件事：① 双击进全屏保留普通模式的窗口尺寸与位置，ESC 首次退全屏并精确还原、
再次 ESC 才退出 APP；② 修复放大镜放大后的锯齿 / 像素化 / 边缘粗糙，>1:1 才补足像素、
消除锯齿且边缘平滑清晰、避免模糊 / 光晕 / 伪影，1:1 显示不受影响、性能稳定。

### 诉求

1. 普通模式双击进全屏时保留进入前的窗口尺寸和位置；全屏首次 ESC 退出全屏、返回普通模式
   并恢复该尺寸位置；返回普通模式后再次 ESC 退出 APP；ESC 按当前窗口状态区分，
   避免首次 ESC 直接退出 APP。
2. 放大镜放大后的锯齿 / 像素化 / 边缘粗糙：>1:1 时用合适的插值 / 重采样补足像素，
   消锯齿 + 边缘平滑 + 线条清晰 + 形状颜色不失真，避免明显模糊 / 光晕 / 伪影，
   兼容现有交互与不同倍率，未缩放 / 1:1 显示不受影响，性能稳定。

### 根因

| 项 | 根因 |
|---|---|
| 首次 ESC 直接退出 APP | 真全屏下 ESC 常被**窗口管理器先消费**：系统自行退出沉浸 → 画布缩小触发自愈 `setFull(false)` → 随后补发 / 迟到的那一次 ESC 落到「非全屏」分支，被当成「再次 ESC」直接 `quitApp()` |
| 退出全屏窗口尺寸位置错 | 旧逻辑只靠 `recover()` / `maximize(EXIT_IMMERSIVE)` 依赖窗口管理器记忆形态，**进全屏前没有自己抓 rect 快照**，无法精确还原普通模式的尺寸位置 |
| 放大镜锯齿 / 像素化 | 圆内原来画的是「按 1:1 显示框分辨率解码」的 `viewPixelMap`，再硬拉 3 倍 → 每个源像素被放大成像素块；且 **ArkUI `.interpolation()` 对 `PixelMap` 图源不生效**，光换插值档救不了 |
| 边缘粗糙 / 错位 | 放大镜尺寸 / 圆心 / 偏移是浮点，GPU 落在子像素上采样，边缘发虚、粗糙 |

### 做法（窗口 / ESC）

| 环节 | 改动 |
|---|---|
| 纯函数 | `InteractionPlan.ts` 新增 `escActionOf(fullscreen, sinceExitMs, guardMs)` → `ESC_ACT_NONE / EXIT_FULL / QUIT_APP`；`shouldCaptureWindowRect` / `shouldRestoreWindowRect` 沿判据；`msSinceFullExitOf` |
| 抓快照 | 进全屏上升沿 + 自由窗口(FLOATING) 才 `capturePreFullRect()`：`getWindowProperties().windowRect` → `packWindowRect` + `windowRectUsable` 校验，存**内存** `preFullRect`。不落盘、不覆盖重启会话记忆 `savedWindowRect`；最大化态 / 窗口未就绪不抓（降级既有形态恢复，绝不误缩） |
| 精确恢复 | 退全屏下降沿标记 `restoreRectPending`，`applyWindowFullScreen(false)` 在 `recover()` / `EXIT_IMMERSIVE` **之后** `restorePreFullRect(win)`：`await win.resize(w,h)` + `await win.moveWindowTo(left,top)`，每步独立 try/catch，用完即清（幂等）。排在形态恢复之后才不会被最大化覆盖 |
| ESC 分派 | `onKey` 的 ESC case 由 `escActionOf(this.fullscreen, msSinceFullExitOf(Date.now(), lastFullExitAt), 400)` **唯一真值来源**驱动：全屏 → `toggleFull()`（绝不退出 APP）；非全屏 + 冷却期内 → `NONE`（吞一次补发 ESC 并把 `lastFullExitAt` 清零）；其余非全屏 → `quitApp()` |
| 冷却覆盖 | `setFull()` 下降沿统一记 `lastFullExitAt`，覆盖 **ESC / 双击 / F11 / 系统自愈**全部退出路径；冷却只吞一次，用户紧接着第二次 ESC 立即退出 APP |

### 做法（放大镜重采样）

| 环节 | 改动 |
|---|---|
| 纯函数 | `loupeEffectiveScaleOf`（有效倍率 = 局部 3× × 主视图 zoom × 密度比）、`loupeNeedsResampleOf`（严格 >1:1 才重采样）、`loupeInterpolationTierOf`（≤1:1→NONE / 1~2×→HIGH / >2×→MEDIUM）、`loupePixelAlignOf`、`loupeResampleEdgeOf`、`loupeResampleStableOf` |
| **补足真实像素**（核心） | `>1:1` 时用项目自己的 `decodeTo(uri, edge, false)`（EXIF 旋转 / ICC / HDR 全链路一致）按 `loupeResampleTargetEdge() = 主视图解码边 × 3`（夹 `8192` 上限控内存）**重解一张高清 `loupeHiPx`**；放大后每个显示像素都有真实源像素，从根上消除像素化 / 锯齿。官方 `.interpolation()` 对 PixelMap 不生效，靠源分辨率而非插值档取胜 |
| 分档插值 | `loupeInterpolation()` 按有效倍率映射 `ImageInterpolation`：≤1:1 → `None`（旁路）、1~2× → `High`(Cubic 保线条清晰)、>2× → `Medium`(平滑重采样，避免 Cubic 锐化核高倍放大欠采样源的过冲光晕 / 振铃伪影) |
| 整像素对齐 | `loupeContentW/H`、`loupeOffX/Y` 全部 `loupePixelAlignOf` 收敛到整像素，消除子像素采样错位导致的边缘粗糙 |
| 不失真 | `objectFit(ImageFit.Contain)` 等比逐点对应、不变形；不改主视图三处 `autoResize(false)` / `dynamicRangeMode` / `High` 画质 |
| 1:1 旁路 | `loupeNeedsResampleOf` 为 false 时不额外解码、不改插值档，未缩放 / 正好 1:1 / 缩小显示完全不受影响 |
| 性能稳定 | `loupeResampleStableOf`（目标边差 <64 复用上一张，鼠标高频微动不反复重解码）；`loupeHiToken` 代号作废迟到结果并 `releaseUncachedEntry` 释放（不泄漏）；`loupeHiUri`+`loupeHiPane` 双重校验，切图换页绝不把上一张错画到新图上；`loupeHiPx` 刻意不进 `previews` LRU 缓存 |
| 生命周期 | hover 移入 / `onMouse(Move)` / 右键开启触发 `ensureLoupeHiRes()`；关闭开关 / `setFull` 模式切换 / `aboutToDisappear` 页面销毁 `clearLoupeHiRes()` 释放并作废旧代号 |

### 行为

- 普通模式双击进全屏：先存尺寸位置；全屏首次 ESC 退出全屏、恢复该尺寸位置，**绝不退出 APP**；
  返回普通模式后再次 ESC 才退出 APP。系统自愈退出沉浸后补发的 ESC 被 400ms 冷却吞掉，不会误退出。
- 放大镜：`>1:1` 时圆内用高清重解码图源 + 分档插值 + 整像素对齐，消锯齿 / 像素化 / 边缘粗糙，
  边缘平滑、线条清晰、形状颜色不失真，无明显模糊 / 光晕 / 伪影；1:1 及以下完全不受影响。
- 其余交互不变：右键 toggle、6cm 双页独立、全屏保留、退出全屏不失效、点选零滚动、
  顶栏贴顶唤出、hover 缩略图、画质三处、resize、缓存全部保持。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1116 passed, 0 failed**
  （1081 → 1116，新增 35 条第十六轮契约；改写 4 条第十四 / 十五轮旧断言到新接线，
  另 2 条因 `loupeClampedOffset` 换行导致切片失效的旧断言，把源码改回单行后原样通过）。
- `git diff --check` / 剥离字符串注释后括号净平衡 HEAD=CUR 全 0 / `node --check` 全绿；
  版本仍 `1.0.7` / `7`，`AppScope/app.json5` 未改。
- 计数型护栏：`.autoResize(false)` 3 处、`.dynamicRangeMode(` 3 处、
  `.interpolation(ImageInterpolation.High)` 3 处（主视图 / 兜底 / 右页）。

### 待用户侧确认（DevEco Studio 编译 + 实机）

1. 双击进全屏 → 全屏首次 ESC 退出全屏并恢复进全屏前的窗口大小与位置；再次 ESC 退出 APP。
2. 真全屏（系统消费 ESC 的场景）下首次 ESC 不直接退出 APP。
3. 放大镜放大后无锯齿 / 像素化 / 边缘粗糙，边缘平滑、线条清晰、无模糊 / 光晕 / 伪影；
   1:1 / 缩小显示画质不变；鼠标在圆内高频移动不掉帧、切图换页不串图。

**本次仍未编译 HAP / 未放桌面 / 未跑 `build.sh` / 未升版本 / 未 push**。


## 第十五轮：放大镜预设关闭 / 鼠标右键 toggle 开关（2026-11-15）

按用户确认，把「右键还原视图」改为「右键 toggle 放大镜」，放大镜改为**默认关闭**。
除右键语义外，其余交互一律不变。

### 诉求

1. 放大镜预设关闭：进入 APP 默认不显示放大镜。
2. 鼠标右键 toggle 放大镜开关：右键点一下开、再点一下关。
3. 保持其他既有交互不受影响。

### 冲突与决策

右键原本绑定「还原视图（适应窗口 + 归位）」（`onMouseButton()` 的 Release 分支，
且 Press 时 `stopPropagation()` 阻止系统右键菜单）。经确认采用**替换**方案：

| 项 | 处理 |
|---|---|
| 右键点击 | 改为 toggle 放大镜总开关 |
| 右键还原视图 | 移除（`resetView()` 仍被键盘 `0` / `F` 等 5 处路径调用，复位能力未丢失） |
| 右键拖拽 | 仍是平移手势，`!moved` 判定保留，不触发 toggle |
| 右键菜单 | Press 分支 `event.stopPropagation()` 保留 |
| 左键 / 双击 / 滚轮 / Ctrl+滚轮 / 键盘 | 全部不变 |

### 做法

| 环节 | 改动 |
|---|---|
| 纯函数 | `InteractionPlan.ts` 新增 `LOUPE_DEFAULT_ENABLED = false`、`loupeEnabledAfterRightPress()`（仅右键翻转一次）、`loupeVisibleOf()`（总开关 + 双页独立 + 悬停 + 有图，四者缺一不可） |
| 状态 | `Index.ets` 新增 `@State loupeEnabled: boolean = LOUPE_DEFAULT_ENABLED` |
| 绘制 | `loupeLayer()` 判定从 `loupePaneActiveOf(...)` 改为 `loupeVisibleOf(this.loupeEnabled, ...)`；关闭时 `loupePane / loupeHover / 坐标` **仍照常维护**，故右键开启后立即显示，不必先移出再移入 |
| 预览区右键 | `onMouseButton()` 的右键 Release 分支改调 `applyLoupeToggle(true)`；仍在 `!moved` 之后，拖拽不翻转 |
| 非预览区兜底 | `onRootMouse()` 在 `MouseAction.Press` 时用 `event.button === MouseButton.Right` 调 `applyLoupeToggle()`；预览区右键 Press 已被 `stopPropagation()` 拦下，只由 Release 分支翻转一次，两处**不会重复** |
| toggle 收口 | 新增 `applyLoupeToggle(rightClick)`，走纯函数判定，只在真正翻转时写 `@State` |
| 全屏 | `setFull()` 复位只清瞬时状态，**不动 `loupeEnabled`** —— 用户手动开启的开关跨「进入全屏 / 退出全屏」保持 |
| 提示文案 | 空态提示 `双击进入全屏 · 右键还原 · 拖拽平移` → `双击进入全屏 · 右键放大镜 · 拖拽平移` |

### 行为

- 默认（未右键）：鼠标在预览图上移动也不会出现放大镜。
- 右键点击（预览区或左栏 / 空白处均可）：开启；鼠标在图上即显示对应页的 6cm / 3 倍放大圆。
- 再右键点击：关闭，圆立即消失；关闭期间鼠标状态照常维护。
- 右键拖拽：平移，不翻转开关；双击全屏、滚轮翻页、Ctrl+滚轮缩放、键盘复位不变。
- 全屏进入 / 使用中 / 退出后：开关状态保持，第十四轮的复位逻辑继续生效。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1081 passed, 0 failed**
  （1060 → 1081，新增 21 条；同步更新 2 条第十四轮旧断言）。
- `git diff --check` / 括号净平衡增量 0 / `node --check` 全绿；版本仍 `1.0.7` / `7`。

### 待用户侧确认（DevEco Studio 编译 + 实机）

1. 打开 APP 默认无放大镜；右键点一下开启、再点一下关闭。
2. 右键拖拽仍是平移、不会误触发开关；右键不再弹系统菜单。
3. 全屏进入 / 使用 / 退出后开关状态不丢失，放大镜仍能正常显示。
4. 键盘 `0` / `F` 复位适应仍可用（右键还原已移除）。

**本次仍未编译 HAP / 未放桌面 / 未跑 `build.sh` / 未升版本 / 未 push**。

## 第十四轮：放大镜 6cm / 左右并排双页独立 / 全屏保留 / 退出全屏后不失效（2026-11-13）

承接第十三轮 `InteractionPlan.ts` 的纯函数真值来源，只改放大镜的「尺寸 / 作用页 / 模式切换」三处，
不动点选滚动、顶栏滞回、缓存、解码、目录层级、恢复、画质等任何既有链路。

### 诉求

1. 放大镜直径由 3cm 翻倍到 6cm，局部放大倍率仍是 3 倍。
2. 左右并排的两张图片都要能生效且互不影响：鼠标在哪页，哪页显示它自己那张图的局部放大。
3. 新的全屏模式下同样保留完整放大镜效果。
4. 修复「从全屏退出到正常模式后放大镜失效」：进入全屏、全屏中使用、退出全屏后都能继续正常使用。
5. 其余既有交互一律不变。

### 根因

| 现象 | 根因 |
|---|---|
| 只有 3cm | `LOUPE_CM = 3` → `loupeDiameterVp(3) = 189vp` |
| 右页没有放大镜 | `loupeLayer()` / `onHover` / `onMouse` 只挂在 `previewImage()`；`rightPageImage()` 完全没有接线 |
| 两页会互相干扰 | 只有单份 `@State loupeHover / loupeX / loupeY`，没有「哪一页被悬停」的标识；两页共用同一份坐标与图源判定 |
| 退出全屏后失效 | `setFull(on)` 切换时整块重建布局、画布尺寸与左右页划分，却从不复位放大镜的悬停态 / 坐标 / 作用页；残留的旧状态与新画布不匹配，且没有归零与重新激活的收口路径 |

补充：预览 `Row`（`previewImage` + `rightPageImage`）在 `build()` 里**始终构建**，并未被
`if (!this.fullscreen)` 之类条件移除，所以只要把放大镜接到两个 builder 上，全屏态自然覆盖。

### 做法

| 环节 | 改动 |
|---|---|
| 尺寸真值来源 | `InteractionPlan.ts` 新增 `LOUPE_CM_14 = 6` / `LOUPE_D_VP_14 = 378`；`Index.ets` 的 `LOUPE_CM` 改为取 `LOUPE_CM_14`（单一真值来源，避免魔数漂移），`LOUPE_ZOOM` 保持 3 |
| 纯函数 | 新增 `loupePaneActiveOf()` / `loupePaneAfterHover()` / `loupeResetOnModeChange()` / `loupeHoverAfterModeChange()`，以及 pane 常量 `LOUPE_PANE_NONE(-1)` / `LEFT(0)` / `RIGHT(1)` |
| 双页独立状态 | 新增 `@State loupePane`，保留单份 `loupeHover / loupeX / loupeY`；坐标是「相对该页显示框」的局部坐标，两页各自解释自己的坐标 |
| 双页独立绘制 | `loupeLayer(pane, uri, half)` 用 `loupePaneActiveOf(this.loupePane, pane, ...)` 判定，只有当前激活页那一层会绘制；`hasLoupeImage(pane)` 按页取源（右页只看 `rightPixelMap`，左页沿用三源） |
| 右页接线 | `rightPageImage()` 也挂 `loupeLayer(LOUPE_PANE_RIGHT, ...)` / `onHover` / `onMouse`；左页改挂 `LOUPE_PANE_LEFT` |
| hover 收口 | 新增 `onLoupeHover(on, pane)` 走 `loupePaneAfterHover()`：移入激活本页，移出**只清本页**，A 页迟到的 `leave` 不会误清 B 页刚置好的激活页 |
| Move 兜底 | `onLoupeMouse(event, pane, half)` 按 pane 取图、按 `loupeInFrame` 兜底显隐，并同步激活页（部分 2in1 只派发 Move） |
| 全屏复位 | `setFull(on)` 在 `this.fullscreen = on` **之前**，用 `loupeResetOnModeChange(this.fullscreen, on)` 判定；模式变化时统一把 `loupePane / loupeHover / loupeX / loupeY` 复位，且**不设任何永久禁用标志** |

`6cm → 6 * 160 / 2.54 ≈ 377.95 → 378vp`，正好是 `189vp` 的两倍；
`loupeCircleOrigin` / `loupeClampedOffset` 几何不变，圆内放大图仍 `objectFit(Contain)` 且边缘夹界不空白。

### 为什么「退出全屏后不失效」

复位只清**瞬时**状态，不写任何 `loupeDisabled` 之类的永久开关；下一次
`onHover(true)` / `onMouse(Move)` 会重新置 `loupePane` 并点亮。因此
「正常模式使用 → 进入全屏（复位）→ 全屏中使用（重新激活，左右页皆可）→
退出全屏（再复位）→ 正常模式继续使用」全链路都通。
所有全屏切换都从 `setFull()` 收口（双击 / F11 / ESC / 画布缩小自愈），
复位放在 early-return 之后、赋值之前，保证只在真正切换时执行一次。

### 回归护栏（保持不变）

- 全文 `.autoResize(false)` 仍恰好 3 处、`.dynamicRangeMode(...)` 仍恰好 3 处；
  右页放大镜刻意**不引入**这两类画质属性（第十三轮踩过 7 条计数型断言同时失败的坑）。
- `HitTestMode.Transparent`、`onHover(false)` 立即隐藏、`onMouse(Move)` 坐标兜底、
  圆形 `borderRadius(d/2) + clip(true)`、零动画零延迟全部保留。
- 点选零滚动 / 顶栏贴顶唤出滞回 / ESC 非全屏退出 / 版本 1.0.7 / 往上层恒亮 /
  全量预载 / 最高画质三处属性，一律未改。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 1060 passed, 0 failed**
  （第十三轮 1029 → 第十四轮 1060，新增 31 条：纯函数 / 源码静态契约 / 全链路模拟 / 回归护栏）。
- 同步更新 4 条第十三轮旧断言（3cm→6cm 常量、3 源→4 源、只挂 previewImage→两页各挂、
  移出隐藏位置），旧断言不删只改。
- `git diff --check` / 三种括号增量均 0 / `node --check` 全绿；版本仍 `1.0.7` / `7`。

### 待用户侧确认（DevEco Studio 编译 + 实机）

1. 放大镜直径目测为原来的两倍，圆内 3 倍局部放大仍与原图逐点对应、不变形。
2. 并排双页：鼠标在左页只放大左页内容、在右页只放大右页内容；从一页滑到另一页不闪烁、不串图。
3. 双击 / F11 进入全屏后放大镜可用；全屏中使用正常；ESC 退出全屏后移动鼠标放大镜重新出现，
   且内容与当前页对应。
4. 点选列表、顶部栏唤出、hover 缩略图、画质、resize、缓存等既有交互未受影响。

**本次仍未编译 HAP / 未放桌面 / 未跑 `build.sh` / 未升版本 / 未 push**。

## 第十三轮：点选零自动滚动 / 顶部栏贴顶唤出 / 预览图 3cm 放大镜（2026-11-13）

三项纯 UI / 交互调整：新增 `InteractionPlan.ts` 把判定从 ArkUI builder 里剥成可单测的纯函数，
`Index.ets` 只负责接线；不改缓存、解码、目录层级、恢复、全屏、画质等既有链路。

### ① 左侧档案列表：点选零自动滚动（仅顶 / 底边界档案例外）

**诉求**：鼠标点选任一档案时，列表默认不自动上下滚动，保持当前滚动位置与可见范围；
只有所选档案是列表最顶端 / 最底端档案时才允许列表上下移动；点选与切换档案不得在
其他情况下改变滚动位置；选中状态与其余交互不变。

**根因**：`select()`（两处，含只读名单态）与 `go()`（两处）都无条件调用
`this.scroller.scrollToIndex(this.rowOfItem(...), false)`，任意一次点选都会把选中行
重新对齐到列表顶部附近，正是「点一下列表就跳一下」的来源。

**做法**：

| 环节 | 改动 |
|---|---|
| 真值来源 | `InteractionPlan.ts` → `isListEdgeRow()` / `tapScrollAction()` / `scrollAllowed()` |
| 可见范围 | `List.onScrollIndex(first, last, center)` 写入普通字段 `listFirstRow / listLastRow`（不进状态系统）；换源时 `applyItems()` 重置为 `-1` |
| 点选收口 | 新增 `scrollOnTap(idx)`，`select()` 两处裸 `scrollToIndex` 全部替换；只有 `tapScrollAction` 返回非 `SCROLL_NONE` 才滚 |
| 翻页收口 | 新增 `scrollOnStep(idx)`，`go()` 两处替换；`stepScrollAction` 只在目标跑出可见范围时跟随（`SCROLL_FOLLOW` 兜底未上报） |
| 换源定位 | `applyItems()` 里那一次 `scrollToIndex` 保留 —— 它是「载入新目录后把恢复位置滚进视野」，不属于鼠标点选语义 |

边界定义（两重，`isListEdgeRow`）：整列表绝对首行 `0` / 末行 `totalRows-1`，
或 `onScrollIndex` 上报的可见范围最顶行 `firstRow` / 最底行 `lastRow`。
可见范围尚未上报时只认绝对首 / 末，其余保守不滚 —— 绝不会因脏数据误滚。
全源码裸 `scroller.scrollToIndex` 收敛为 3 处（换源定位 + 两个收口方法）。

### ② PIKAN 1.0.7 顶部栏：完全隐藏 / 贴顶唤出 / 稳定不闪烁

**诉求**：默认完全隐藏且**不占用布局空间**，让左侧文件列表与预览区最大化；
仅鼠标移动到页面顶部触发区时显示；离开该栏或触发区后自动隐藏；切换稳定不闪烁；
不影响文件列表、预览与其他界面功能。

**与第十一轮的关系**：第十一轮只是把「全屏 / 幻灯片」第二栏工具组用
`Visibility.Hidden` 占位隐藏；本轮把**整个顶栏**（含版本号与路径）升级为
默认不渲染的浮层。第二栏工具组的 `Visibility.Hidden` 逻辑保留，顶栏浮出后照常可用。

**做法**：

| 环节 | 改动 |
|---|---|
| 不占布局 | `build()` 主体 `Column` 里的 `if (!this.fullscreen) { this.topBar(); }` 删除；改为根 `Stack` 末尾的条件渲染浮层 `if (this.topBarPeek && !this.fullscreen)` + `position({x:0,y:0})` + `zIndex(10)` |
| 默认隐藏 | `@State topBarPeek: boolean = false` → 组件根本不存在，比 `Visibility.None` 更彻底（布局、测量、命中测试都不参与） |
| 稳定显隐 | `onRootMouse()` 用 `topBarPeekOf(wasVisible, y, triggerEdge, keepEdge, fullscreen)` 滞回判定：贴顶 `TOPBAR_PEEK_TRIGGER_VP=10` 才显示；已显示时到 `TOPBAR_PEEK_KEEP_VP = TOPBAR_H + TOPBAR_KEEP_PX = 60` 都保持；越过 60 才隐藏 |
| 不闪烁 | `triggerEdge < keepEdge` 形成滞回带（显示阈值窄、隐藏阈值宽），边界微抖不会反复翻转；坐标无效（NaN / 负）保持现状 |
| 无副作用 | 浮层是绝对定位、显隐都不改主体 `Column` 尺寸 → 不触发 `onAreaChange` / resize 重解码；`chromeH` 由首帧 `onAreaChange` 自动重新测量，无需硬编码 |

显隐链零动画 / 零延迟 / 无计时器：纯状态置位 + 条件渲染。

### ③ 预览图：3cm 圆形 / 3 倍放大镜悬停交互

**诉求**：鼠标移入图片时在光标处显示直径 `3cm` 的圆形放大镜并实时跟随；
圆内显示以光标为中心、放大 `3 倍`的局部图像，与原图对应且不变形；
移出立即隐藏；效果仅作用于该预览图片；图片边缘处也不空白、不错位。

**几何（`InteractionPlan.ts`）**：ArkUI 的 `1vp = 1/160 inch`，故 `3cm = 3 × 160 / 2.54 ≈ 188.98vp`，
`loupeDiameterVp(3) = 189vp`（与屏幕 dpi 无关）。

| 函数 | 作用 |
|---|---|
| `cmToVp()` / `loupeDiameterVp()` | cm → vp 换算与整 vp 取整 |
| `loupeCircleOrigin(cursor, d)` | 圆心严格落在光标 → 圆左上角 `cursor - d/2`，实现实时跟随 |
| `loupeImageOffset(cursor, d, zoom)` | 理想偏移 `d/2 - zoom*cursor`：把光标处图像点对齐圆心 |
| `loupeClampedOffset(cursor, size, d, zoom)` | 夹界到 `[d - size*zoom, 0]`，保证圆 `(0..d)` 始终被放大图覆盖 —— 贴左/上夹 `0`、贴右/下夹下界、放大图比圆小则居中 |
| `loupeInFrame()` / `loupeEligibleOf()` | 画框内判定与「仅悬停 + 有图」显示判定 |

**接线**：新增 `@Builder loupeLayer(uri, half)`，作为 `previewImage()` 内 `Stack` 的**最后一层**
（z 序最高）。圆内放大图 = 主预览显示框整体等比放大 `LOUPE_ZOOM=3` 倍
（`objectFit(ImageFit.Contain)` 与主图逐点对应、不变形，`ImageInterpolation.High`），
按 `loupeClampedOffset` 定位；圆形由 `borderRadius(LOUPE_D_VP/2) + clip(true)` 裁出。

| 约束 | 实现 |
|---|---|
| 仅作用于预览图片 | `onHover` / `onMouse` 只挂在 `previewImage()` 的 `Stack` 上；左栏、对开右页、信息 / 角标浮层一律不触发 |
| 移入显示 / 移出立即隐藏 | `onHover(false)` 同步置 `loupeHover=false`；`onMouse(Move)` 用 `loupeInFrame` 按坐标兜底（部分 2in1 只派发 Move） |
| 实时跟随 | 每次 Move 写 `@State loupeX/loupeY`，圆心、放大图偏移、放大图定位全部随之重算 |
| 边缘不空白 / 不错位 | X / Y 两个方向分别 `loupeClampedOffset` 夹界；放大图比圆小则居中 |
| 圆出现不闪烁 | `hitTestBehavior(HitTestMode.Transparent)` 让浮层不吞鼠标事件，避免圆一出现就触发 `onHover(false)` |
| 不破坏主画质契约 | 放大镜是临时放大浮层，刻意不加 `autoResize(false)`；主视图 / 兜底 / 右页三处 `autoResize(false)` 计数保持 3 |

### 验证（本地，未编译 HAP）

```
node --experimental-strip-types tests/dirname.test.mjs
ALL PASS  1029 passed, 0 failed      # 982 既有 + 47 条第十三轮契约
```

- `InteractionPlan.ts` 是纯函数模块（不 import 鸿蒙 SDK / 无 IO / 无计时器 / 不用 `Number.isFinite`）。
- 源码静态契约覆盖：`select()` / `go()` 收口、可见范围记录、顶栏浮层与滞回、
  放大镜几何接线、零动画链路，以及版本未升 / 往上层恒亮 / 不禁用 / 不弹 picker /
  全量预载 / 主画质三处 / 第十一轮 hover 与 ESC 的回归护栏。
- 按长期约束：**未编译 HAP、未放桌面、未跑 `build.sh`、未升版本（仍 1.0.7）、未 push**；
  DevEco Studio 编译、HAP 安装与实机验证由用户侧完成。

### DevEco 侧建议确认点

1. 左栏点中间任意档案，滚动条与可见行应保持不动；点第一张 / 最后一张（或可见范围首 / 末行）才允许列表移动。
2. 非全屏启动后顶部应完全看不到顶栏，左栏与预览一直顶到窗口上沿；鼠标贴到窗口最顶端约 10vp 顶栏浮出，在顶栏内移动不闪，移出即隐。
3. 鼠标在预览图上移动应出现约 189vp 的圆形放大镜并跟随；把光标推到图片四个边缘，圆内始终是对应局部的放大内容、无空白条带；移出图片立即消失。
4. 全屏、resize、对开双页、hover 缩略图、ESC 退出等既有行为保持原样。

## 第十二轮：切换 NAS 目录时 `pumpAll` 换源竞态崩溃修复（2026-11-13）

### 崩溃现场（实机日志 20:00:17.781，HUAWEI MateBook Pro S / 1.0.7 / arm64-v8a）

```
Reason: TypeError
Error message: Cannot read property uri of undefined
at pumpAll  (Index.ets:4894:41)
at anonymous (Index.ets:4939:14)   ← onAllDecoded 的 setTimeout 下一批回调
```

HiLog 时间线还原：

| 时间 | 事件 |
|---|---|
| 20:00:10.017 | `all preload: budget reached, cached 63` —— 旧目录全量预载链跑满预算 |
| 20:00:11.682 | picker 选中新 NAS 目录 `…/2026/编号202617 模特 娇娇`，`openFolder` 起 3 个候选 |
| 20:00:11.745 | `listFile OK [2] … → 64 entries` |
| 20:00:11.755 | `applyItems: 63 items, cur=45 keepView=0` —— **`this.items` 被整批替换** |
| 20:00:15.016 | `openFolder done: 63 imgs, 65 rows` |
| 20:00:17.781 | 旧批次回调带旧 `allOrder` 回来，旧绝对下标落在新数组之外 → **崩溃** |

日志里满屏的 `FeatureManager get config failed, key:multiModalInputOptions ret:1`、
`Vsync: recv vsync timeout`、`GetRSUIDirector: screenId is invalid` 都是 2in1 上与崩溃无关的
平台噪声；`listFile FAIL [0]/[1] → 13900002` 是 NAS 候选路径的正常降级（第 3 个候选成功）。

### 根因

全量预载的 `allOrder` / `allDone` / `allFrom` 是**建链那一刻按旧 `items` 长度生成的绝对下标**。
`onAllDecoded()` 用 `setTimeout` 排下一批 `pumpAll(seq)`，属于异步回调；`applyItems()` 换掉
`this.items` 后，只要有一条路径没让旧 `seq` 失效或没重建 `allOrder`，回调就会拿旧下标访问
新数组：`this.items[idx] === undefined`，再读 `.uri` 直接抛 TypeError 杀掉进程。

原先唯一的作废点是 `clearPreviews()`，而它只在 `!keepView` 分支执行 ——
**目录自动重扫（`preserveView=true`）刻意不清预览缓存，会整个绕过作废**；
且 `startAllPreload()` 在 `allBusy` 为真时被 `shouldResetPreloadChain(PRELOAD_ALL, false)`
短路，不会重建顺序。加上 `pumpAll` 对下标 / 元素零校验，一次竞态就是整个 APP 闪退。

### 落地（只改纯函数模块 + 主页面，不动任何 UI 与交互）

- **① 统一作废收口**：新增 `resetAllPreloadChain()`（`allSeq++` + 清
  `allOrder / allFrom / allDone / allActive / allBusy / allComplete`），在 `applyItems()`
  **替换 `this.items` 之前**调用，覆盖选新目录 / 进子目录 / 往上层 / 自动重扫 /
  快照恢复 / 只读名单态全部路径；`clearPreviews()` 改为复用同一方法，不再散落 7 行状态。
  ⚠️ 只动作废代号与顺序，**不 release 任何 `PixelMap`** —— `keepView` 重扫继续复用已解码缓存，
  与既有「重扫不清缓存、不重解大图」语义完全一致。
- **② 批次夹界纯函数**：`PreloadBudget.ts` 新增
  `preloadBatchBoundedOf(order, from, conc, done, total)`，与 `preloadBatchOf` 同语义但跳过
  `<0 || >= total` 的绝对下标，`nextFrom` 照常推进（不卡住、不死循环）。`pumpAll()` 改用它，
  把当前 `n = this.items.length` 作为 `total` 传入。
- **③ 元素级双保险**：`pumpAll()` 取 `.uri` 前先取 `ImageItem | undefined` 判空，
  把 uri 转成显式可空局部 `string | undefined` 再验 `u.length > 0`
  （直接写 `it.uri !== undefined` 会触发 ArkTS 严格模式的 TS2367「类型无重叠」）；
  先筛出 `valid[]` 再按 **`valid.length`** 设置 `allActive`
  （否则漏调 `preloadOne` 会让这批永远等不到收齐 → 链假死）；`valid` 为空直接收工。
- **④ 回退链同源护栏**：`preloadNext()` 在 `items.length <= 0` 时早退，避免 `wrapIndex`
  返回 NaN 后读 `undefined.uri`（同一类崩溃）。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 982 passed, 0 failed**
  （968 → 982：6 条 `preloadBatchBoundedOf` 纯函数回归 + 7 条源码静态契约 +
  1 条回归护栏；1 条旧断言「全量链用 preloadBatchOf」按新实现同步更新，未删）。
- `git diff --check` 干净；源码括号计数与 HEAD 增量全 0；`node --check` 通过。
- 版本仍 `1.0.7 / versionCode 7`。**未编译 HAP / 未放桌面 / 未跑 build.sh / 未升版本 / 未 push**。

### DevEco 编译侧确认点

本轮不新增任何 ArkUI / SDK API，只加纯 TS 函数与普通成员方法；`ImageItem | undefined`
可空局部在 ArkTS 严格模式下合法。实机请复现一次「旧目录预载到预算触顶 → 立刻换到
张数更少的 NAS 子目录 → 停留数秒」，确认不再闪退；若 DevEco 对
`preloadBatchBoundedOf` 的导入签名报错，把报错原文给我改成本地实现。

## 第十一轮：版本号归位 / 顶部第二栏悬停显隐 / hover 零延迟零动画 / ESC 非全屏退出（2026-11-13）

### 用户诉求（精确改动，其余布局 / 样式 / 按钮功能 / 交互 / 状态一律不变，不重构）

1. 版本号显示在**最顶部标题栏**，并从第二栏移除，避免重复显示。
2. 含「全屏」「幻灯片」按钮的**第二栏默认隐藏**；仅鼠标悬停页面顶部区域
   （含最顶部标题栏及第二栏所在行）时显示，离开立即恢复隐藏；隐藏时不影响其余布局，
   显示时保持该栏原有样式与按钮功能。
3. mouseover 左栏档案行时小图预览**事件触发即显示**；移除预览显示 / 隐藏过程中的
   淡入、淡出、过渡动画及任何延迟逻辑；鼠标移出后的隐藏也不带动画或延迟。
4. **仅非全屏态**按 ESC 触发退出 APP；全屏态保持原有 ESC 相关行为不变，避免与全屏交互冲突。

### 落地（全部在 `Index.ets`，未新增 SDK 能力、未动其它模块）

- **① 版本号归位**：`topBar()` 的 `Text('PIKAN ' + APP_VERSION)` 是版本号唯一显示处；
  左栏抬头原 `Text('v' + APP_VERSION + ' · N 张')` 去掉版本号，改为
  `Text(this.itemCount > 0 ? this.itemCount + ' 张' : '')`。全源码 `Text(...APP_VERSION)` 只剩 1 处。
- **② 第二栏悬停显隐**：把「全屏 / 幻灯片」按钮原样包进一个 `Row`，加
  `@State topToolsVisible: boolean = false`（默认隐藏）与
  `.visibility(this.topToolsVisible ? Visibility.Visible : Visibility.Hidden)`。
  用 **`Visibility.Hidden` 占位隐藏**（不是 `None`）→ 顶栏高度、路径文字宽度、下方主体
  一行都不位移，严格满足「隐藏时不影响其余布局」；显示时按钮样式 / `onAction('play')` 功能不变。
  显隐由 `topBar` 根 Row 的 `.onHover((isHover) => { this.topToolsVisible = isHover; })`
  直接置位（事件触发当帧生效、离开即隐藏），根容器 `onRootMouse` 再按
  `y <= TOPBAR_H` 的 Move 兜底（部分 2in1 SDK 不派发 onHover）。整条链无 `animateTo` /
  `opacity` / `transition` / `setTimeout`。
- **③ hover 零延迟零动画**：删除 `HOVER_CLOSE_DELAY_MS=120`、`hoverSeq`、`hoverCloseTimer`、
  `cancelCloseTimer()` 全部延迟机制；`onHoverChange(false)` 改为同步
  `showHover=false` + 清 px + `release(key)`；`bindPopup` 选项加官方
  `transition: TransitionEffect.IDENTITY` 关掉 popup 默认的淡入 / 淡出 / 缩放动效
  （`mask:false` / `autoCancel:false` / `enableArrow:false` 三项防闪根因配置保持不动）。
  `forceHide` / `aboutToDisappear` / 点击 / `onMouse` 续命分支同步去掉代号作废逻辑。
- **④ ESC 保持不动**：`onKey` 的 `KEYCODE_ESCAPE` 分支本就是
  「全屏 → `toggleFull()`，非全屏 → `quitApp()`（`terminateSelf`）」，正好符合要求，
  按「保持行为不变」原则**逻辑一行未改**，只补注释锁定，并由新增静态契约断言守住。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 968 passed, 0 failed**
  （949 → 968，7 条旧 hover 断言按新语义同步更新、未删，新增 19 条第十一轮契约）。
- 新增断言时踩到「注释也算正则文本」：本轮注释写了「无 setTimeout / duration:0」，
  直接对含注释切片做正则会误命中 → 加了 `stripComments()` 只检测代码行（沿用既有惯例）。
- `git diff --check` 干净；源码括号计数与 HEAD 增量全 0；`node --check` 通过。
- 版本仍 `1.0.7 / versionCode 7`。**未编译 HAP / 未放桌面 / 未跑 build.sh / 未升版本 / 未 push**。

### DevEco 编译侧确认点

`Visibility` / `TransitionEffect.IDENTITY` / `MouseEvent.action === MouseAction.Move` 均为
ArkUI 常用声明式 API，但本机 SDK `.d.ts` 不可见；若 DevEco 报枚举名 / 重载不符，
把报错发我改成数值或 callback 形式即可。行为与像素级布局请实机确认。

## 第十轮：遇到问题立即放弃（错误驱动 + 死路径记忆 + 恢复期零同步 IO）（2026-11-13）

### 用户诉求

> 现在等待死路径超过 20 秒才放弃，改为遇到问题立即放弃。

### 根因：3 秒看门狗被同步 IO 饿死

第九轮的 `RESTORE_ENTER_TIMEOUT_MS = 3000` 本质是 `setTimeout`。但启动恢复链上有两处
**同步**跨进程 IO 会先把它堵死：

```
aboutToAppear → readLastPos
  → warmLast(ok)          +300ms  → decodePx → rawStore.ensure
                                    → fs.statSync / openSync / readSync   ← 同步
  → scheduleShowLast      +900ms  → beginRestore → activatePermission
                                    → showLastOnStart → probeRestoreUris
                                    → fs.openSync ×3                      ← 同步
  → enterWatchdog         +3000ms（名义）
```

死 NAS 路径上一次 `openSync` 能挂十几到二十秒；JS 单线程被占住时，900ms 恢复定时器
和 3 秒看门狗的回调**根本排不上队**，只有等系统 IO 超时返回才轮到 —— 于是实测表现为
「名义 3 秒、实际 20 秒才放弃」。换个更小的超时值也解决不了：定时器本身被饿死了。

### 方案：把「放弃」从计时驱动改为错误驱动

新增 `common/FailFast.ts`（纯函数，零 SDK 依赖，Node 可直接回归）：

| 函数 | 作用 |
|---|---|
| `deadTagOf(dirUri, okUri)` | 生成死路径标记；优先目录授权根，退到图 uri，截断到 256 字符 |
| `deadMemoryMatches(dead, dir, ok)` | 上次记下的死路径是否与本次吻合；用户换过目录就不吻合 |
| `failFastAction(problem, hasMemory, userActed, settled)` | 明确的失败信号 + 有记忆 + 用户未接手 + 未收口 → 立即放弃；首次启动 / 用户已操作一律不干预 |
| `restoreIoHeld(entered, userActed, hasMemory)` | 启动恢复期是否按住同步文件 IO |
| `probeTakeOf(fast, n)` | 启动恢复期只探 1 个候选（第一个打不开就判死），用户主动路径探全部 |
| `elapsedSince(t0, now)` | 诊断串耗时，脏数据归 0 |
| `failFastHint(reason)` | 状态栏文案 |

`Index.ets` 的三层改造：

**① 死路径记忆（跨启动，真正 0 秒）**
`POS_KEY_DEAD` 小 key 记录上次栽在哪个目录。`giveUpNow()` / `abortRestoreForPicker()`
失败时 `putSync + flushSync` 落盘；`readLastPos()` 读到且与本次 `savedDirUri` 吻合 →
**连 900ms 定时器和 3 秒看门狗都不排**，不预热、不探测、不 `openSync`，直接
`giveUpNow(..., 0)` 打开选择文件夹。用户重新选到目录（`chooseFolder().then`）或
任何一次真的列目录成功（`openFolder`）都会清标记，绝不误伤正常恢复。

**② 明确的「问题信号」立即收口，不再等 3 秒**

| 信号 | 原来 | 现在 |
|---|---|---|
| `activatePermission` 失败 / 1500ms 超时 | 继续读快照、走探测 | **立即** `giveUpNow` |
| 快照读不出 / 整批恢复失败 | 降级单张兜底，等看门狗 | **立即** `giveUpNow` |
| ro1 只读名单态 / 空列表 | 留给 3 秒收口 | **立即** `giveUpNow` |
| 单张兜底 | 留给 3 秒收口 | **立即** `giveUpNow` |
| 死路径记忆命中 | 走完整恢复链 | **0 秒** `giveUpNow` |

`giveUpNow()` 与 et1 超时收口做的是同一件事：作废在飞恢复链（`restoreCancelled` /
`resumeDone` / `persistSettled`）、清 `resumeTimer` / `persistTimer` / 看门狗、
`allSeq++` 作废全量预载链、写死路径记忆、打开选择文件夹。区别是**不依赖任何定时器**，
且 `giveUpDone` 保证两条收口路径只弹一次。

**③ 消除同步 IO 饿死定时器**
- `warmLast()` 在启动恢复期（`restoreIoHeld`）直接跳过解码，零文件 IO；放弃后
  （`giveUpDone` / `restoreCancelled`）也不碰文件。恢复成功后的首图由 `applyItems →
  showPreviewOf` 正常解码出图，画面不空白，只是没有了「提前量」。
- `probeRestoreUris()` 新增 `fastProbe` 参数：`restoreFromSnapshot(startupGuard)` 显式传
  `startupGuard`，启动链只探 1 个候选；用户主动路径仍按 `RESTORE_PROBE_LIMIT=3` 探全部。
- 全部同步 IO 收敛到「探测通过之后」：`applyItems` 的解码与全量预载只在 `ioOk=true`
  （非 ro1）时发生，而 `ioOk` 由探测结果决定。

### 边界（必须说清）

系统对不可达网络路径的同步 IO 超时由平台决定，应用无法缩短。本轮保证的是：
**不再额外等 3 秒看门狗**、**不再逐个候选重试**、**所有可先验识别的问题立即放弃**、
**同一死路径复发 0 秒**。唯一残留是「持久授权激活成功、但 NAS 随后物理不可达」时，
第一次探测仍会受一次系统 IO 超时限制 —— 但它只探 1 个候选、失败后立即放弃，并记下
死路径，此后每次启动都是 0 秒。

### 行为变化

- 以前「单张兜底 / ro1 只读名单态」会停在半死界面等 3 秒；现在这两种情况**立即**
  弹出选择文件夹（名单仍在，取消选择器也看得到）。这正是「未能进入上次的目录」的主要表现。
- 启动期不再预热上一张低清图；恢复成功时由 `showPreviewOf` 正常出图。

### 护栏（旧契约一条未动）

`et1` 3000ms 看门狗保留为「完全无信号」兜底；`RESTORE_PROBE_LIMIT=3`、两条恢复路径的
`pendingRestoreReadonly`、ro1 `bulkIoAllowed` 闸门（≥9 处）、「往上层」不弹系统选择器、
`chooseFolderAt` 不存在、按钮永不禁用、`AUTO_RESUME_ON_START=false`、全量链与滚轮零解码、
版本 `1.0.7 / 7` 全部不变。`showLastOnStart()` 函数体仍不含选择器 / 权限 / 全量重扫
字面量（立即放弃统一走 `giveUpNow`）。

### 验证

- `node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 949 passed, 0 failed**
  （877 → 949，新增 72 条：FailFast 纯函数 + 第十轮源码静态契约 + 回归护栏）。
- `git diff --check` 干净；12 个源码文件括号计数与 HEAD 增量全 0；
  `node --check tests/dirname.test.mjs` 通过。
- 两条旧断言按惯例**同步更新**：「恢复失败退回单张」改为「恢复失败立即放弃」、
  `clearTimeout(this.persistTimer)` 计数 3 → 4（并补 `giveUpNow` 函数体切片检查）。
- **未编译 HAP / 未放桌面 / 未跑 build.sh / 未升版本 / 未 push**。

## 第九轮：3 秒内未进入上次目录就停止恢复并直接打开选择文件夹（2026-11-13）

### 用户诉求

> 尝试了 3 秒未能进入上次的目录就停止尝试，直接弹出选择文件夹。

### 背景：启动恢复链原来没有总超时

重开后的恢复链是：

```
aboutToAppear → readLastPos（读小 key）
  → scheduleShowLast        +900ms
  → beginRestore → activatePermission（超时兜底 1500ms）
  → showLastOnStart → 读快照 → probeRestoreUris → setItems → 全量预载
```

`activatePermission` 有 1500ms 兜底，`readLastPos` / 读快照的 `preferences.get` 与
`probeRestoreUris` 的 `fs.openSync` 却可能在上次目录位于 NAS / 网络卷时长时间挂住；
即便全部走完，也可能只落到 **ro1 只读名单态**（名单在、图打不开）或**单张兜底**
（只出一张图，没有进入目录）。此前这几种情况都只能等用户自己发现并去点「选择文件夹」。

### 方案：一个 3 秒看门狗，与恢复链竞速

新增 `common/RestoreTimeout.ts`（纯函数，零 SDK 依赖，Node 可直接回归）：

| 函数 | 作用 |
|---|---|
| `enterTimeoutSafe(budget, min, max)` | 预算合法性校验（有限数 + 落在 `[1000, 10000]`），误配成 300ms 或 20s 一律不挂看门狗 |
| `enterWatchdogWanted(auto, hasMemory, done, userActed)` | **首次启动（无上次记忆）绝不挂**，用户已抢先操作也不挂 |
| `enterSettledOk(probeOk, itemCount, cancelled)` | 「真正进入上次目录」= 非 ro1 只读态 + 列表有图 + 恢复未作废 |
| `enterTimeoutAction(elapsed, budget, settled, entered, userActed, pickerBusy, folderBusy)` | 到期裁决：成功进入 / 用户已操作 / picker 正忙 / 未到预算 → 继续等；否则 `ENTER_ABORT` |
| `enterTimeoutHint(budget)` | 「上次目录 3 秒内未能打开 · 已停止恢复 · 请重新选择文件夹」 |

`Index.ets` 侧（`RESTORE_ENTER_TIMEOUT_MS = 3000`，诊断标记 **et1**）：

- `scheduleShowLast()` 记 `restoreStartedAt`，与 `RESUME_DELAY_MS=900` 的恢复定时器
  **一起**排一个 3000ms 看门狗；只有 `hasRestoreMemory` 为真（读过上次位置 / okUri /
  持久目录 URI）才挂。
- 整批快照恢复成功且非只读态 → `markRestoreEntered()` 撤掉看门狗，正常用户完全无感。
- **单张兜底和 ro1 只读名单态不算「进入目录」**：只置 `restoreSettled`，不撤看门狗，
  到期照样收口 —— 这正是「未能进入上次的目录」的两种主要表现。
- 到期且没人抢先 → `abortRestoreForPicker()`：

  1. `restoreCancelled = true` 作废在飞的恢复链；`showLastOnStart()` 入口与每个 `await`
     之后、`restoreFromSnapshot(startupGuard=true)` 的每个 `await` 之后都检查它并立刻
     返回，**绝不继续 probe / setItems / 启动预载**；
  2. 清掉 `resumeTimer` / `persistTimer` / 看门狗，`resumeDone = true` 防止恢复链再被调度，
     `persistSettled = true` 挡住 activate 竞速收口；
  3. `allSeq++` 作废可能已经拉起的全量预载链，后台不再继续读旧目录；
  4. 写 et1 诊断串与超时文案，**直接调用 `chooseFolder()` 打开 FOLDER picker**。

- `chooseFolder()` 主动入口与 `aboutToDisappear()` 都会清看门狗：用户 1 秒时自己点了
  「选择文件夹」，3 秒时绝不会再弹第二次。

### 判据速查

| 3 秒时的状态 | 动作 |
|---|---|
| 整批恢复成功、非 ro1、列表有图 | 看门狗早已撤销，不干预 |
| ro1 只读名单态 / 单张兜底 / 快照读不出 | 停止尝试 → 打开选择文件夹 |
| activatePermission 或读快照仍挂着 | 停止尝试 → 打开选择文件夹 |
| 用户已选目录 / picker 正忙 / 目录载入中 | 不抢视图、不弹第二次 |
| 首次启动（无任何上次记忆） | 根本不挂看门狗 |

### 护栏（旧契约一条未动）

`showLastOnStart()` 函数体内仍**不含**任何选择器 / 权限申请 / 全量重扫调用（超时弹 picker
在恢复链之外）；「往上层」仍恒可点、不弹系统选择器、在 APP 内出清单；
ro1 防冻结闸门、`bulkIoAllowed()`、`AUTO_RESUME_ON_START=false`、按钮永不禁用、
层级重建恰好 2 处、全量预载链与滚轮零解码、版本 `1.0.7 / 7` 全部不变。

### 验证与约束

`node --experimental-strip-types tests/dirname.test.mjs` → **ALL PASS 877 passed, 0 failed**
（813 → 877，新增 64 条）；`git diff --check` 干净；11 个源码文件括号计数与 HEAD 增量全 0；
`node --check tests/dirname.test.mjs` 通过。**未编译 HAP、未放桌面、未跑 `build.sh`、
未升版本、未 push** —— 编译与实机验证仍由 DevEco Studio 侧完成。

若实机觉得 3 秒偏短（本地大盘、大快照），把 `RESTORE_ENTER_TIMEOUT_MS` 调到 4000~5000
即可，纯函数预算区间允许到 10000；调大只会让「失败后弹 picker」晚一点，不影响成功路径。

## 第八轮：原始档案数据全量载入内存同时解码 / NAS 网络卷层级修复（2026-11-12）

### 用户诉求（两项，一次落地）

1. 缓存逻辑：**档案数据完全载入内存同时解码**，以提高图片档案载入速度；
2. 选择 NAS 路径（例如 `/192.168.100.61/图片档案/Collection/4 中/[青丘图鉴] Nine tail Photography/2023`）
   后按「往上层」会显示错误目录表。

完成后仍须满足：滚轮切换图片、窗口状态恢复、双击全屏正常；「往上层」恒可点、
不弹系统目录选择器、在 APP 内显示上层清单；不编译 / 不升版本 / 不 push。

### ① 档案数据完全载入内存 + 载入时同时解码

第七轮只缓存了**解码后**的 `PixelMap`，`decodePx()` 仍对每张图做
`fs.openSync(uri)` + `image.createImageSource(fd)`。NAS / 网络目录上这两步是跨进程 /
跨网络往返，整库载入时被放大；全屏放大、resize 重解、EXIF/HDR/ICC 重解还要再读一遍文件。

新增 `common/RawCache.ts`（纯函数，Node 可直接回归）：

| 函数 | 作用 |
|---|---|
| `rawFitOf(sizes, incoming, maxBytes, maxCount)` | 插入前算 LRU 淘汰条数；张数 / 字节双预算，全淘汰后必然放得下，不会「解→淘汰→再解」死循环 |
| `rawSingleAllowed(size, maxSingle)` | 超大单文件不进内存（避免一张 4K RAW 吃光预算），仍走 fd 兜底 |
| `rawReadComplete(readBytes, size)` | 一次 `readSync` 没读满绝不把截断数据交给 `ImageSource` |
| `rawCacheTargetOf(total, cap)` | 全量预取目标张数 |
| `rawPrefetchWanted(ioAllowed, total, cap)` | **守住 ro1 只读名单态闸门**，死 uri 绝不批量 openSync / readSync |

`Index.ets` 侧新增模块级 `RawStore`（`Map<string, ArrayBuffer>` + LRU 顺序 + 字节账目 +
在途读取合并 + 换源 `gen`）：

- `pumpAll()` 每批先用 `preloadOne()` → `rawStore.ensure(uri)` 把这一批文件的完整 bytes
  读进内存（`fs.statSync` → `new ArrayBuffer(size)` → `fs.readSync(fd, buf)` → `closeSync`），
  再 `decodeTo(uri, edge)` 解码；**读与解走同一条受控并发链**（`PRELOAD_CONCURRENCY=4`），
  保证「刚读进来的立刻被解」的局部性 —— 另起一条预取链反而会先把预算占满、
  解码链要回网络重读，得不偿失。
- `decodePx()` 优先 `image.createImageSource(ArrayBuffer)` 从内存解码；`ensure` 返回
  undefined（超预算 / 单文件过大 / 读不满 / 无权限）时**降级回原来的 fd 路径**，
  图照样能显示 —— 缓存是加速，不是前置条件。EXIF / HDR / ICC 三件事在两种
  `ImageSource` 上完全一致。
- `probeOne()` 的元数据探测、`ThumbLoader` 的悬停缩略图、`showPreviewOf` 的主视图解码
  全部自动复用同一份内存数据；`clearPreviews()` 在换源 / 退出时 `rawStore.clear()` 一并释放，
  `gen` 自增让在途读取的结果只用于本次解码、不污染新图库。
- 整条链仍由 `applyItems() → schedulePreload()` 在**载入时**启动，
  **滚轮 / 翻页路径本身不含任何读取或解码启动动作**；`decodeTo()` 的 `PixelMap` 复用与
  `decodeInflight` 在途合并、`bulkIoAllowed()` 防冻结闸门一律原样保留。

预算：`RAW_CACHE_MAX_BYTES=768MB`、`RAW_SINGLE_MAX_BYTES=64MB`、`RAW_CACHE_MAX_COUNT=20000`，
与解码后 `PRELOAD_MAX_BYTES=1GB` **分开计账**（峰值约 1.75GB）。这是「尽力全量」的
防 OOM 硬闸，不是容量承诺；触顶按 LRU 淘汰最久没用的原始 bytes（那些图早已解码成
PixelMap，不需要原文件）。内存吃紧可把 `RAW_CACHE_MAX_BYTES` 调回 256MB。

### ② NAS 路径「往上层」显示错误目录表

根因：旧 `realPathOf()` 把 `file://` 后的第一段一律当成文档 URI 的伪 authority（`docs`）
吞掉，于是 NAS 主机段丢失，卷根、父级、APP 内清单三层全错：

| 输入 | 旧结果 | 后果 |
|---|---|---|
| `file://192.168.100.61/图片档案/...` | `/图片档案/...` | 主机段被吞 |
| `volumeRootOf('/192.168.100.61/图片档案/...')` | `/` | NAS 卷没被识别为卷根 |
| `pathChainOf(target)` | `["/", "/192.168.100.61", ...]` | 清单里冒出伪造的文件系统根 `/` |
| `upParentCandidates(base, raw)` | 只剩 1 条真实路径兜底 | 保留授权的 `file://<host>/<parent>` 被 `sameDirPath` 全部剔除，父目录列不出来 |

修法（`common/DirName.ts` 纯函数 + `Index.ets` 兜底同口径）：

- 新增 `isNetworkHost(seg)`：只认明确的网络地址形态（IPv4 / IPv6 / 域名 TLD 以字母开头），
  `docs` / `content` / 中文目录 / 带空格目录一律不误判；
- 新增 `nasHostOf(p)`：从 `file://<host>/…`、`smb://…`、UNC `\\<host>\…`、`/<host>/…` 抽主机；
- `realPathOf()` 对网络主机 authority **保留主机段**（`file://192.168.100.61/…` →
  `/192.168.100.61/…`），对 UNC 折叠分隔符；`file://docs/...` 行为完全不变；
- `volumeRootOf()` 把 `/<host>` 判为 NAS 网络卷根（与鸿蒙用户卷 `/storage/Users/<id>` 同级），
  到卷根即停，不再越级到 `/`；
- `Index.ets` 的 `dirCandidates()` 手工兜底改走 `realPathOf()` / `hierPathOf()`，
  往上层生成的 `file://<host>/<parent>` 也能列出真实路径候选。

修复后 `pathChainOf()` 首行是 `/192.168.100.61`、不再有伪造的 `/`；
`upParentCandidates()` 恢复为 2 条（含带授权形态的父 URI），往上层既能 `openFolder()`
成功，失败时 APP 内清单也是正确层级。「往上层」恒亮可点、不弹系统选择器、
APP 内显示清单等既有行为全部保留。

### 回归护栏

- 「往上层」按钮仍**永不 grey out / 永不禁用**，不弹系统目录选择器；
  `applyItems` 的 `bulkIoAllowed` 闸门、`schedulePreload` 的 ro1 短路、
  `decodeTo` 的解码总闸门、`showUpListInApp` 的零 IO 纯清单一律未动。
- 滚轮 `onAxisEvent → onWheel`、窗口最大化状态恢复、双击全屏、最高画质三处
  `autoResize(false)`、版本号 `1.0.7` / `versionCode 7` 全部未动。
- `node --experimental-strip-types tests/dirname.test.mjs` → **813 / 813 PASS**
  （本轮新增 80 条：NAS 路径层级、RawCache 纯函数、第八轮源码静态契约）。
- `git diff --check` 干净；10 个源码文件括号计数与 HEAD 增量全为 0；
  `node --check tests/dirname.test.mjs` 语法通过。
- 按长期约束：本轮只改源码 / 文档 / 纯函数测试并本地 commit；**不编译 HAP、不放桌面、
  不跑 build.sh、不升版本、不 push**，DevEco Studio 编译由用户侧完成。

## 第七轮：最大化状态重启保持 / 解码数据缓存复用 / 圆点·缓存张数·左键放大精简（2026-11-12）

### 用户诉求（五项，一次落地）

1. APP 窗口最大化后重启、重新打开窗口仍保持最大化，不回退到普通尺寸；
2. 缓存解码后的图片数据并复用，减少重复解码、提升连续查看时的解码与切换速度，
   **不得在鼠标滚轮切换图片时才开始解码**；
3. 移除档案列表最左侧的圆点标记；
4. 移除右侧百分比区域上方显示的「缓存多少张」文案 / 控件；
5. 取消左键单击放大，仅保留双击进入全屏。

完成后滚轮切换图片、窗口状态恢复、双击全屏三项仍正常可用，且不影响其它既有交互。

### ① 最大化状态：形态与 rect 分开记

| 之前 | 第七轮 |
|---|---|
| 只存 `winRect`，`shouldSaveWindowRect()` 只在 FLOATING 时写；最大化时既不记形态、启动也不会 `maximize()` | 新增小 key `winMaximized`（1/0），与 `winRect` 分开持久化 |
| 启动 `applySavedWindowRect()` 见到非 FLOATING 就直接保持现状 | 启动仍是 **FLOATING** 且记忆=1 → `win.maximize(EXIT_IMMERSIVE)` 恢复常规最大化（带标题栏 / dock），**绝不 resize / moveWindowTo**（那两步会把最大化打回普通尺寸） |
| — | 启动已最大化 / 全屏 → 保持现状；APP 自持真全屏、MINIMIZE / UNDEFINED / SPLIT_SCREEN 等未知形态 → **不覆写**记忆 |
| — | 只最大化过、从未存过自由窗口 rect 的用户也要排程（`shouldScheduleWindowRestore()`），不能因 rect 为空短路 |

`SessionState.ts` 新增三个纯函数 `windowModeFlagOf / shouldRestoreMaximized / shouldScheduleWindowRestore`；
SDK 26 `WindowStatusType` 的 `MAXIMIZE(2)` 与 `FULL_SCREEN(1)` 都算「最大化」，重启后统一按
`MaximizePresentation.EXIT_IMMERSIVE` 恢复。状态仍在 `markWindowRect()`（拖窗口 / 最大化触发的
根容器 `onAreaChange`）与 `onPageHide / aboutToDisappear` 里 `putSync + flushSync` 同步落盘。

### ② 解码后的图片数据缓存复用（滚轮切图零解码）

新增 `common/DecodeCache.ts`（纯函数，Node 可直接回归）：

| 函数 | 作用 |
|---|---|
| `decodeEdgeOf(preloadEdge, displayNeed, cap)` | 预载档位抬到「可直接显示」，夹在 `PRELOAD_DECODE_MAX_EDGE=2048`（全屏 2560）内控内存 |
| `reuseEdgeOf(canvasW, canvasH, zoom, headroom, srcLong)` | 按**实际显示像素**判「已解码数据够不够」，不拿含 oversampling 的 `displayEdge()` 逼着每张重解 |
| `shouldReuseDecoded(cachedEdge, needEdge)` | 够就直接复用缓存里的 PixelMap，不解码 |
| `decodeKeyOf(uri, edge)` | 同一张 + 同一档位只解一次，并发请求共用 Promise |

`Index.ets` 侧：
- `previews` 明确为「已解码 PixelMap 的缓存」；`decodeTo()` 先查缓存、再查 `decodeInflight`，
  都没有才 `decodePx()`；`pushPreview()` 对同一 `px` 去重，`releaseUncachedEntry()` 保证
  「代号作废」时只释放还没被缓存接管的那张（复用 / 合并来的绝不能 release）。
- `showPreviewOf()` 命中缓存 → `showDecoded(hit)` 直接上屏；只有 `reuseEdge()` 不够且全清档位
  更高时才延迟后台补解。预载在 `applyItems()` 载入时就铺满整库，
  **滚轮 / 翻页路径本身不含任何解码启动动作**。
- 1GB 预算裁剪后极少数未铺到的张仍由 `loadQuick + loadView` 兜底，解码结果写回缓存，
  下次翻到即命中即上屏。

档位折中：普通画布约 1600vp × 1.05 ≈ 1700 像素需求，预载 2048 已满足；
比按 `displayEdge()`（2400~3840）解全库多驻留约一倍张数，连续翻页更稳。
左右两页、全清升级、resize 重解统一走 `shouldReuseDecoded()`，画质判据一致。

### ③④⑤ 界面精简

| 项 | 改动 |
|---|---|
| 档案行最左侧圆点 | `Text(... : '·')` → `: ''`（图片行 / 灰行留空），上层 `↑` / 目录 `▣` 保留，`.width(18)` 列对齐不变 |
| 右下角「缓存 N 张」 | 百分比上方那一行整个移除，右下角只剩 `zoomPercentText()`；缓存账目仍由 `syncCacheStat()` 维护，**状态栏「预载 N 张」保持不变**（本次只移除百分比上方那一处） |
| 左键放大 | `onMouseButton()` 的 `zoomAt(ZOOM_LEFT, ...)` 删除，左键单击不再改变视图；`TapGesture(count: 2) → onDoubleTapCanvas() → toggleFull()` 仍是唯一的双击进 / 出全屏入口；右键还原、Ctrl+滚轮缩放、拖拽平移、键盘缩放均不变 |

空态提示文案同步改为「双击进入全屏 · 右键还原 · 拖拽平移」「滚轮切换图片 · Ctrl + 滚轮缩放」。

### 回归护栏

- 滚轮 `onAxisEvent → onWheel(v<0?-1:1)`、ESC / F11 / 双击全屏、窗口沉浸 API
  （`ENTER_IMMERSIVE_DISABLE_TITLE_AND_DOCK_HOVER` / `recover`）、最高画质三处
  `autoResize(false)`、版本号 `1.0.7` / `versionCode 7`、按钮永不禁用 —— 全部未动。
- `node --experimental-strip-types tests/dirname.test.mjs` → **733 / 733 PASS**（新增
  `DecodeCache` / `SessionState` 纯函数与第七轮源码静态契约）。
- `git diff --check` 干净；括号增量与 HEAD 一致（0）。
- 按长期约束：本轮只改源码 / 文档 / 纯函数测试并本地 commit；**不编译 HAP、不放桌面、
  不跑 build.sh、不升版本、不 push**，DevEco Studio 编译由用户侧完成。

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
| 预览区右下角（上） | `缓存 N 张` | `/ 216 张`、`xx MB`、`/ 1.00 GB`。**第七轮起这一整行已移除**，右下角只剩缩放百分比（见文首「第七轮」） |
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

快捷键替代：滚轮翻页、**Ctrl + 滚轮**缩放、`↑` / `↓` 缩放（**第二十六轮起已改为翻页**）、左键放大 ×1.5、右键还原、
`R` / `Shift+R` 旋转、`Shift+H` / `Shift+V` 镜像、右键画布或 `0` 复位适应、`F` 切 1:1、双击全屏。
> **第七轮已取消「左键放大 ×1.5」**：左键单击不再改变视图，仅双击进入 / 退出全屏（见文首「第七轮」）。
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
> **第七轮已取消左键放大**（右键也早已改为「还原」）：本节为历史设计记录，当前行为是
> 左键单击不缩放、右键还原、双击进 / 出全屏；锚点数学仍被 `zoomAt()`（键盘 / Ctrl+滚轮路径）复用。

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
