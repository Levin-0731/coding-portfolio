#!/bin/bash

set -e
set -u
cd "$(dirname "$0")"

LOCK_FILE="syncs3.lock"

# 检查锁文件是否存在，若存在则退出
if [ -f "$LOCK_FILE" ]; then
    echo "下载操作正在进行中，锁文件已存在，脚本退出。"
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

image=<PRIVATE_REGISTRY>/down-img:latest

if [ -z $syncfile ]; then
    echo "no file"
    exit 0
fi

export PATH="/usr/local/bin:$PATH"

docker pull ${image}

# 删除旧错误日志

ERROR_LOG="${syncfile}/error.log"

if [ -f "$ERROR_LOG" ]; then

    rm -f "$ERROR_LOG"

    echo "已删除旧日志: $ERROR_LOG"

fi

# 获取 IP
ip=$(ipconfig getifaddr en0)

# 获取 MAC
mac=$(ifconfig en0 | awk '/ether/{print $2}')

docker run -it --rm -v ${syncfile}:/var/data/ ${image} $ip $mac
docker rmi "${image}" > /dev/null 2>&1

exit 0
