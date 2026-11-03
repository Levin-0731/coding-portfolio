#!/bin/bash

set -e
set -u
cd "$(dirname "$0")"

LOCK_FILE="syncs3.lock"

# 检查锁文件是否存在，若存在则退出
if [ -f "$LOCK_FILE" ]; then
    echo "同步操作正在进行中，锁文件已存在，脚本退出。"
    exit 1
fi

# 确保在脚本结束时删除锁文件
cleanup() {
    rm -f "$LOCK_FILE"
    echo "锁文件已删除"
}

# 捕获 EXIT 信号，在脚本退出时执行 cleanup
trap cleanup EXIT

# 创建锁文件
touch "$LOCK_FILE"

# 你的 Docker 命令
docker --version

syncfile=${1:-$(pwd)}

filepath=game

image=<PRIVATE_REGISTRY>/dev-tool:syncs3-tool-res

if [ -z $syncfile ]; then
    echo "no file"
    exit 0
fi

export PATH="/usr/local/bin:$PATH"

# docker pull ${image}

docker run -it --rm -v ${syncfile}:/var/data/ ${image}


exit 0
