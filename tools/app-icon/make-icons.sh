#!/usr/bin/env bash
# tools/app-icon/make-icons.sh — 从 source.png 生成 HarmonyOS 全套应用图标
#
# 为什么是这些尺寸（不是随手挑的）：
#   · 1024×1024 —— 应用主图标（上架 / 桌面 / 启动窗口的母版，HarmonyOS 图标画布标准）；
#   · 36/48/72/96/144/192 —— 通用「48dp 图标」在各密度桶的像素值。
#     ⚠️ HarmonyOS 的密度限定符命名与 Android 不同：
#        sdpi=120dpi→36、mdpi=160→48、ldpi=240→72、xldpi=320→96、
#        xxldpi=480→144、xxxldpi=640→192
#     （写成 hdpi/xhdpi 会被 CompileResource 判为 "Invalid qualifier key"，
#      这一条是本轮实测踩出来的，勿改。）
#     任务栏 / 窗口标题栏 / 桌面 / 多任务里用的是同一张 ability 图标，
#     系统只按目标密度挑最近的桶 —— 小尺寸的清晰度靠这批「预先缩好的像素」保证，
#     而不是让系统临时把 1024 缩到 24px（那样必然糊）。
#   · 16/24/32 —— 任务栏 / 托盘这类 1x 像素环境用，单独做轻度锐化。
#
# 保持原始图像的比例与视觉特征：全程等比缩放（不裁切、不重绘、不加边框），
# 唯一处理是 ≤48px 时加一点点 unsharp，避免细白描边在缩小时糊成一团。
set -euo pipefail

# 本机 shell 的 cwd 有时不可靠（跨进程 chdir 告警），因此不依赖相对路径：
HERE="$(cd -- "$(dirname -- "$0")" 2>/dev/null && pwd -P || echo "")"
if [ -z "$HERE" ] || [ ! -f "$HERE/source.png" ]; then
  HERE="/storage/Users/currentUser/WorkBuddy/Project/Pikan_HMOS/tools/app-icon"
fi
SRC="$HERE/source.png"
ROOT="${PIKAN_ROOT:-/storage/Users/currentUser/WorkBuddy/Project/Pikan_HMOS}"
OUT="$HERE/out"

mkdir -p "$OUT"

# 等比缩放 + 去元数据；≤48 额外轻度锐化（半径 0.75，量 75%，阈值 0.008 防止噪点被放大）
render() { # $1=px  $2=输出路径
  local px="$1" dst="$2"
  if [ "$px" -le 48 ]; then
    magick "$SRC" -background none -filter Lanczos -resize "${px}x${px}" \
      -unsharp 0x0.75+0.75+0.008 -strip \
      -define png:compression-level=9 -define png:compression-filter=5 "$dst"
  else
    magick "$SRC" -background none -filter Lanczos -resize "${px}x${px}" -strip \
      -define png:compression-level=9 -define png:compression-filter=5 "$dst"
  fi
}

for px in 1024 512 256 192 180 144 128 96 72 64 48 32 24 16; do
  render "$px" "$OUT/app_icon_${px}.png"
done

# HarmonyOS 工程内实际引用的资源（覆盖到仓库里）
render 1024 "$ROOT/AppScope/resources/base/media/app_icon.png"
render 1024 "$ROOT/entry/src/main/resources/base/media/app_icon.png"
render 36  "$ROOT/entry/src/main/resources/sdpi/media/app_icon.png"     # 120dpi
render 48  "$ROOT/entry/src/main/resources/mdpi/media/app_icon.png"     # 160dpi
render 72  "$ROOT/entry/src/main/resources/ldpi/media/app_icon.png"     # 240dpi
render 96  "$ROOT/entry/src/main/resources/xldpi/media/app_icon.png"    # 320dpi
render 144 "$ROOT/entry/src/main/resources/xxldpi/media/app_icon.png"   # 480dpi
render 192 "$ROOT/entry/src/main/resources/xxxldpi/media/app_icon.png"  # 640dpi

echo "== 生成完成 =="
for f in "$ROOT/AppScope/resources/base/media/app_icon.png" \
         "$ROOT/entry/src/main/resources/base/media/app_icon.png" \
         "$ROOT"/entry/src/main/resources/{sdpi,mdpi,ldpi,xldpi,xxldpi,xxxldpi}/media/app_icon.png; do
  magick identify -format '%wx%h\t%[colorspace]\t%B bytes\t%f\n' "$f"
done
