#!/bin/sh
# 本机命令行编译（不经 DevEco Studio 图形界面）。
#
# 鸿蒙命令行工具（hmos-clt）位置：/data/service/hnp/hmos-clt.org/hmos-clt_1.0.0
#   ├─ node/bin     hvigor 自带的 Node（必须用它，系统 node 版本不一定兼容）
#   ├─ ohpm/bin     包管理器
#   ├─ hvigor/bin/hvigorw
#   └─ sdk/default   SDK（ets apiVersion 26，见 sdk/default/openharmony/ets/oh-uni-package.json）
#
# 关键：必须显式导出 DEVECO_SDK_HOME=<clt>/sdk，否则报
#   "ERROR: 00303217 Configuration Error: Invalid value of 'DEVECO_SDK_HOME'"
# （DevEco Studio 是自己在进程环境里注入的，命令行跑就得手动给。）
#
# 产物：entry/build/default/outputs/default/entry-default-signed.hap
set -e

CLT=/data/service/hnp/hmos-clt.org/hmos-clt_1.0.0
cd "$(dirname "$0")"

export NODE_HOME=$CLT/node/bin
export PATH=$CLT/node/bin:$CLT/ohpm/bin:$PATH
export DEVECO_SDK_HOME=$CLT/sdk

exec "$CLT/hvigor/bin/hvigorw" --mode module -p product=default assembleHap --no-daemon "$@"
