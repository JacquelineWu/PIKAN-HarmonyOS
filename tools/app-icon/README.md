# 应用图标（App Icon）

`source.png` 是 1024×1024 的母版（紫色圆角底 + 内嵌面板 + 眼睛 / 山峦 / 暖色光点）。
`make-icons.sh` 从它等比派生出全部尺寸，**不裁切、不重绘、不加边框**，只做 Lanczos 缩放，
≤48px 时加一点 unsharp 保住白色眼形的描边。

## 重新生成

```bash
bash tools/app-icon/make-icons.sh
```

## 尺寸 → 用途

| 尺寸 | 密度桶 | 用途 |
| --- | --- | --- |
| 1024 | `base` | 应用主图标 / 上架素材；`AppScope/.../base/media/`、`entry/.../base/media/` |
| 192 | `xxxldpi` 640dpi | 桌面 / 任务栏 / 窗口标题栏（最高密度） |
| 144 | `xxldpi` 480dpi | 同上（高密度） |
| 96 | `xldpi` 320dpi | 同上（中高密度） |
| 72 | `ldpi` 240dpi | 同上（中密度） |
| 48 | `mdpi` 160dpi | 1x 基准 |
| 36 | `sdpi` 120dpi | 低密度兜底 |
| 16 / 24 / 32 / 64 / 128 / 180 / 256 / 512 | — | 其它平台 / 文档 / 商店物料（`tools/app-icon/out/`） |

> ⚠️ HarmonyOS 的密度限定符与 Android 同名不同义：这里 `ldpi`=240dpi、`xldpi`=320、`xxldpi`=480、
> `xxxldpi`=640、`mdpi`=160、`sdpi`=120。写成 Android 的 `hdpi/xhdpi/xxhdpi` 会让
> `CompileResource` 直接报 `Invalid qualifier key`（本轮实测）。

## 为什么用密度桶而不是「只放 1024」

HarmonyOS 在**任务栏 / 窗口标题栏 / 桌面 / 多任务卡片**里取的都是同一张 ability 图标，
系统按目标屏幕密度挑最近的资源桶。只放 1024 时，系统要临时把它缩到 24–48px，
细描边必然糊；预先把 48/72/96/144/192 缩好（并轻微锐化），小尺寸才清晰可辨。

## HarmonyOS 的引用链（三处同源）

1. `AppScope/app.json5` → `"icon": "$media:app_icon"`（应用级图标）
2. `entry/src/main/module.json5` → `abilities[0].icon: "$media:app_icon"`（ability 图标：
   桌面 / 任务栏 / 窗口标题栏 / 多任务都由它显示）
3. `entry/src/main/module.json5` → `startWindowIcon: "$media:app_icon"`（启动窗口占位图标）

三处都指向同一个资源名，替换 PNG 即可全局生效，**无需改任何 json5**。

## 为什么没有做「分层图标（layered_image）」

分层图标要求前景、背景两张**独立素材**（前景还要按 HarmonyOS 的 824/1024 安全区单独留白）。
源图是一张已经画好的完整位图，自动拆前景/背景只能靠抠图，必然破坏原始视觉特征与比例。
因此保持单层图标，交给系统按原样显示 + 阴影。
