#!/bin/zsh
cd "${0:A:h}"
PYTHON=$(command -v python3)
if [[ -z "$PYTHON" ]]; then
 echo '请先安装 Python 3。'; read; exit 1
fi
"$PYTHON" server.py
