# HEIC 看图 · 鸿蒙 PC 原生看图软件（ACDSee 风格）

基于 **HarmonyOS SDK（ArkTS + ArkUI）** 开发的 PC 端看图软件，界面布局仿 ACDSee：

- **左侧**：图像档案列表（缩略图 + 文件名 + 格式 + 体积），可滚动、点击切换
- **右侧**：大图预览区（深色背景，GPU 合成渲染），带左上角信息浮层与右下角缩放角标

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
| 滚轮翻页 | 鼠标滚轮 **上一张 / 下一张**；**Ctrl + 滚轮** = 缩放（互不冲突） |
| 鼠标键缩放 | 预览区 **左键放大 50%**（×1.5）、**右键放大 100%**（×2.0），均以光标为锚点 |
| 缩放 | 滚轮(Ctrl) / 双指捏合 / `＋` `－` 按钮 / 键盘 `↑` `↓` |
| 平移 | 单指/鼠标拖拽画布 |
| 旋转 | `左旋` `右旋` 各 90°；键盘 `R` |
| 镜像 | `镜像H` `镜像V`（可叠加） |
| 复位 | **双击画布** / `适应` 按钮 / 键盘 `0` |
| 1:1 | `1:1` 按钮 / 键盘 `F`（一个图片像素对应一个 vp 像素） |
| 幻灯片 | `幻灯片` 按钮 / 空格键，默认 3 秒切换 |
| 键盘翻页 | `←` `→` 上一张/下一张 |
| 关闭应用 | **`Esc`**（非全屏时；全屏下 `Esc` 先退全屏，再按一次才关闭） |
| 来源 | `打开图库`（默认载入图库内**全部**图片，不用逐张勾选）/ `选择图片`（DocumentViewPicker，默认格式 `*.*`） |
| 性能 | ArkUI `Image` 由平台渲染服务做纹理上传 + 合成缩放/旋转（硬件加速）；列表 `LazyForEach` 真正按需建节点，缩略图独立解码 + LRU 缓存，大图库不崩 |
| 后台预载 | 自动预先解码当前位置**前后各 20 张**（低清预览），窗口随位置滑动，切换时先出预览、原图就绪后自动覆盖，翻页几乎无等待 |
| 切图过渡 | 新图先以「低清 + 大模糊」出现 → **分档对焦** → 清晰图就绪后整层淡出（动态模糊过渡，全程约 0.1s） |
| 位置记忆 | 用 `preferences` 记住「上次停在第几张」，**下次打开自动跳回那张**（顶栏「回到上次」可随时手动跳） |
| 全屏 | 顶栏 `全屏` 按钮 / **F11** 进入，**Esc**（退全屏）/ **F11** / 右上角「退出全屏」退出；隐藏应用三块栏 **并隐藏系统状态栏 / 导航栏**，画布铺满整个屏幕，只留右上角退出按钮 |

> **HEIC 说明**：HEIC 解码依赖设备系统的图片 codec。在已支持 HEIC 的 HarmonyOS 设备上可直接预览；若某设备系统 codec 未启用 HEIC，对应图片会走 `onError` 提示，不影响其他格式。

## 在 DevEco Studio 打开并编译

1. 用 **DevEco Studio（支持 HarmonyOS 6 / API 26 的版本，如 DevEco Studio 6.x）** 打开本目录（`heicviewer`）作为工程。
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
`setWindowSystemBarEnable` 标注 2in1 不可用（已用 try/catch 兜底，不影响功能）。

## 工程结构

```
heicviewer/
├── AppScope/
│   ├── app.json5                          bundleName: com.workbuddy.heicviewer
│   └── resources/base/element/string.json
├── entry/
│   ├── build-profile.json5                stageMode，无 native 配置
│   ├── hvigorfile.ts
│   ├── oh-package.json5
│   └── src/main/
│       ├── module.json5                   deviceTypes: tablet / 2in1
│       ├── ets/
│       │   ├── entryability/EntryAbility.ets
│       │   └── pages/Index.ets            全部 UI 与交互逻辑（ACDSee 布局 + 滚轮翻页）
│       └── resources/
│           ├── base/element/              string.json / color.json
│           ├── base/media/app_icon.png
│           └── base/profile/main_pages.json
├── hvigor/hvigor-config.json5
├── build-profile.json5                    工程级：signingConfigs 留空（IDE 自动补全）
├── hvigorfile.ts
└── oh-package.json5

（不含 local.properties：由 DevEco 首次打开时自动生成）
```

## 实现要点

### 布局（ACDSee 风格）
顶栏（标题 + 当前文件名 + 打开按钮 + 幻灯片）／左侧档案列表（固定 280vp 宽）／右侧预览（占满剩余空间）／底栏状态栏。
左下角是视图控制条，4 行 × 2 列的**纯文字按钮**，与顶栏共用同一个 `toolBtn()`：

| 行 | 左 | 右 |
|---|---|---|
| 1 | `适应`（fit） | `1:1`（one） |
| 2 | `－`（zout） | `＋`（zin） |
| 3 | `左旋`（rotl） | `右旋`（rotr） |
| 4 | `镜像H`（fliph） | `镜像V`（flipv） |

按钮高 30、字号 12，控制条整体约 160vp —— 比图形版矮一半，左侧列表能拿到更多高度。

### 全屏（沉浸）模式

两层一起做，缺一层都去不掉「上方那条边」：

| 层 | 做什么 | 怎么做的 |
|---|---|---|
| 应用内 | 顶栏 / 左侧档案栏 / 状态栏整体不进入布局 | `@State fullscreen` + `if (!this.fullscreen) {}` |
| 窗口级 | 最大化 + 沉浸式布局 + **隐藏系统状态栏 / 导航栏** | `window` 接口（见下） |

窗口级三步**有依赖顺序**，顺序错了不生效：

```ts
win.maximize();                       // ① 自由窗口 → 最大化（默认 ENTER_IMMERSIVE 沉浸式布局）
win.setWindowLayoutFullScreen(true);  // ② 布局不避让系统栏
win.setWindowSystemBarEnable([]);     // ③ 隐藏状态栏/导航栏 —— 只有已进入全屏才生效
```

窗口实例页面侧拿不到（`windowStage` 只在 Ability 里），故 `EntryAbility.onWindowStageCreate()`
里 `getMainWindow()` 后存进 `AppStorage`，页面用 `AppStorage.get<window.Window>('mainWindow')` 取。
**三步全部包在 try/catch 里**：拿不到窗口或某步失败就静默降级成「只隐藏应用内 UI」，
按钮与快捷键照常可用，不会卡在全屏里出不来。退出时按反序恢复，并且只在我们主动
`maximize()` 过时才 `recover()`（避免把用户原本的最大化状态一起还原掉）。

另三个容易漏的点：

1. **必须留退出出口**：顶栏被隐藏后，`全屏` 按钮也一起没了。所以全屏时右上角浮出一个
   「退出全屏」按钮，键盘另给 `Esc` / `F11`；`aboutToDisappear` 里兜底恢复系统栏。
2. **画布变大后要重解码**：主视图是按「画布长边 ×2」解码的，进入全屏后画布变大，
   若沿用旧分辨率就只是把小图拉大（发虚）。故 `setFull()` 置 `pendingReload`，
   等 `onAreaChange` 把新尺寸报上来再 `showPreviewOf(this.cur)` 重解一次。
3. **双击不用于全屏**：曾把双击接成进出全屏，但双击与「单击以光标为锚点放大」天然冲突 ——
   要让单击立即生效，一次双击就会先放大两次（×1.5 × ×1.5 = 2.25）再全屏，画面直接歪掉；
   唯一解是给单击加 ~220ms 延迟消歧，而单击放大是最高频操作，发滞感很明显。
   权衡后**取消双击全屏**，双击回到「复位视图」，单击放大保持零延迟。
   全屏改由顶栏按钮 / `F11` / `Esc` 承担，均不与单击冲突。

### 关闭应用：Esc

`Esc` 是**两级**的：全屏时先退全屏，非全屏时才真正退出应用 ——
否则在全屏下按一次 Esc 就整个退出，等于把「退全屏」这条路堵死了。

退出走 `UIAbilityContext.terminateSelf()`：

- `getUIContext().getHostContext()` 返回的是基类 `common.Context`，**需要先转成 `common.UIAbilityContext`**
  才有 `terminateSelf()`；
- 退出前**必须 `await flushPos()`** 再退出：落盘是异步文件 I/O，不等就 `terminateSelf()`
  会因为进程先结束而丢掉最后一次位置（位置记忆是防抖 500ms 写的，此时多半还在防抖窗口里）；
- `terminateSelf()` 返回 Promise 且可能失败，失败只记日志，不弹任何提示。

### 变换分层
ArkUI 同一组件叠加 `rotate`/`scale`/`translate` 时合成顺序不直观，本工程拆两层：
- **外层 Column**（尺寸 = 画布）：`translate`（拖拽）+ `rotate`（旋转）
- **内层 Image**（尺寸 = 旋转自适应框）：`scale`（缩放 + 镜像，镜像通过 `scale.x/y` 取负实现）

旋转 90°/270° 时 `frameW/frameH` 自动交换画布宽高，保证旋转后仍完整落在画布内。

### 后台预载：前后各 20 张的滑动窗口
与 ACDSee 的「先出缩略预览再 sharpen」同一思路：

1. **预载**：后台把当前位置**前 20 / 后 20** 张**解码成低清 `PixelMap`** 存入缓存。
   之所以也要预载后方：只预载前方的话，快速往回滚会一张都命中不了缓存，退化成全靠原图解码。
2. **滑动**：位置一变就 `evictOutside()` 主动释放窗口外的图 —— 缓存跟着位置走，
   翻过几千张内存也稳定在窗口大小，不会越攒越多。
3. **显示**：切到某张时若缓存命中，立刻把那张低清 `PixelMap` 顶上做占位。
4. **调度**：一张一张解码，每张之间 `setTimeout(..., 0)` 让出主线程，不卡 UI；
   切换图片时自增任务代号 `preloadSeq`，旧链自动跟到最新位置，不会并发多条链。

**为什么必须压低分辨率**：预载图长边压到 `PRELOAD_EDGE = 768px`。
按原图分辨率预载几十张就是几个 GB，必然 OOM；768px 时单张约 1.7MB（768×576×4），
41 张 ≈ 70MB，可控。缓存另有「张数 48 + 总字节 96MB」双重上限兜底。

> 容量 `PRELOAD_COUNT = 48` 必须**大于**窗口大小 41：容量恰好等于窗口的话，
> 每入一张就淘汰一张、又被预载链加回来，会来回抖动白耗 CPU。
> 与主视图（最大 `VIEW_EDGE_MAX = 4096`，约 67MB）相加，才是一台机器上的常驻总开销。

### 切图过渡：动态模糊 → 对焦 → 清晰

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
- `loadView()` 按 **画布长边 × 2**（夹在 `[1600, 4096]`）解码清晰图，**回来时校验代号**才替换；
- `loadQuick()` 在没命中缓存时并行解一张低清占位，避免解码期间空屏。

显示哪张、什么时候换，完全由代号原子控制 → **不会串图、最终一定是清晰图**。
LRU 淘汰时也会跳过「正在显示的那张」，避免把它 `release()` 掉导致画面变黑。
自解码确认失败（如某些 uri 打不开）才回退到 `Image(uri)` 由系统解码兜底。

> `image.createImageSource(fd)` + `createPixelMap({ desiredSize })` 同样走系统 codec，
> 所以 HEIC 支持不受影响，而且降采样解码比全分辨率更快。

> 相关常量在 `Index.ets` 顶部：`PRELOAD_COUNT` / `PRELOAD_EDGE` / `PRELOAD_MAX_BYTES`。
> 内存吃紧的机器把 `PRELOAD_EDGE` 调到 640、`PRELOAD_COUNT` 调到 50 即可。

### 大图库稳定性（几百～上万张不崩）

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
| 1 | `AUTO_RESUME_ON_START = false`：启动**只读 5 个小 key**，不再做「静默重扫图库 / 读快照恢复」。恢复动作留给用户点「打开图库」或「回到上次」—— 那时 `applyItems → restoreIndex` 依然会自动落回上次那张，功能没丢，只是不在启动时抢主线程。想要「一打开就自动回上次图」把它改回 `true` |
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
| 启动 | `readLastPos()` 里读到 `lastOkUri` 就调 `warmLast()`：推迟 `WARM_DELAY_MS = 300ms` 让开首帧，然后只解 1 张 `PRELOAD_EDGE = 768` 的图存进 `this.warm`。不重扫、不读快照 → 不可能再触发 `PreferencesGetValue` 卡死 |
| 接上 | `applyItems()` 里 `clearPreviews()` 之后把 `warm` 塞进缓存，随后 `showPreviewOf(cur)` 直接命中 → 首屏立刻出图，不用再等一次低清解码。若它不属于这一批（换了别的来源），`schedulePreload → evictOutside` 会顺手释放 |
| 回收 | `aboutToDisappear()` 里若 `warm` 还没被接走就 `release()`，避免 PixelMap 泄漏 |

`this.warm` 独立于 `previews`：启动时 `cur = -1`、列表为空，那时放进缓存会被 `evictOutside`
判成「窗口外」立刻丢掉。

HiLog 上看：`warm: ready in N ms` → `warm: adopted on current`（命中当前张）。

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

选到非图片文件时不会崩：缩略图与预览解码失败会走各自的兜底（列表显示占位、主视图回退
`Image(uri)` 由系统解码），状态栏也会照常显示文件名与体积。

**`打开图库` 的两条路线**（`GALLERY_ALWAYS_PICK` 切换）：

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

因此 `打开图库` 做成上面的三级降级，保证在没有权限证书的开发/调试环境下按钮依然可用。
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
