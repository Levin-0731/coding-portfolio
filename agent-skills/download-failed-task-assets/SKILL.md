---
name: download-failed-task-assets
description: 按完整 taskid 批量下载公司内部平台失败任务的图片资料，并导出、核验 download_img.csv 与 task_error.csv。Use when the user asks to download failed-task materials, retrieve failed image-task assets, batch export images by task ID, or mentions downImg.command/taskid.csv. 当前仅支持失败任务及 jpg、jpeg、png、webp、gif 图片。
---

# 下载失败任务资料

使用内置 `scripts/downImg.command`，通过 Docker 镜像 `<PRIVATE_REGISTRY>/down-img:latest` 批量下载失败任务图片。

## 输入要求

- 接收用户提供的 `taskid.csv`、任务 ID 列表或聊天中的多行 taskid。
- 只处理失败任务。若用户要求下载成功任务或视频，说明当前脚本不支持，不要伪造结果。
- 每个 taskid 必须完整保留，不要截断。合法示例包括 UUID，以及带 `-image` 后缀的完整 ID。
- `taskid.csv` 必须只有一列，首行为小写 `taskid`，之后每行一个 taskid。
- 支持的图片扩展名为 `jpg`、`jpeg`、`png`、`webp`、`gif`。

## 工作目录

保留用户原文件。为每次运行使用独立目录，避免旧报告与新结果混淆。

- 用户给了 CSV：默认在 CSV 所在目录旁创建 `failed-task-download-YYYYMMDD-HHMMSS/`。
- 用户只给了 taskid：默认在 `$HOME/Downloads/failed-task-assets/` 下创建带时间戳的运行目录。
- 不要把运行目录放在桌面。
- 路径尽量不要包含空格，因为同步脚本来自既有生产脚本。

把 CSV 和脚本放在同一运行目录，文件名必须分别为 `taskid.csv` 和 `downImg.command`：

```bash
cp "/path/to/input.csv" "$RUN_DIR/taskid.csv"
cp "$SKILL_DIR/scripts/downImg.command" "$RUN_DIR/downImg.command"
chmod +x "$RUN_DIR/downImg.command"
```

若用户直接给出 taskid，创建标准 UTF-8 CSV：

```csv
taskid
add722a1-b6c8-42bb-a0bb-32e60bad6ab3
6d1bfeaa-3291-45a5-8523-1ebfe48068b3-image
```

创建后检查行数、空值、额外列与重复项。输入任务数等于除表头外的非空唯一行数；不要把表头计入。

## 前置检查

1. 确认 Docker Desktop 已启动：`docker info` 必须成功。
2. 确认能访问内网镜像仓库 `<PRIVATE_REGISTRY>`。
3. 确认运行目录内只有本次任务的 `taskid.csv`，且至少有一个 taskid。
4. 检查 `syncs3.lock`。若存在，先确认是否还有下载进程；只有确认是异常退出遗留的锁，才删除它。
5. 同一时间只运行一次，不要并行启动多个下载。

## 执行

在可分配 TTY 的终端中运行，以兼容脚本内的 `docker run -it`：

```bash
cd "$RUN_DIR"
bash ./downImg.command
```

使用命令执行工具时开启 TTY。脚本会拉取 Docker 镜像、挂载运行目录到 `/var/data/`、执行下载，并在退出时删除锁文件和本地 Docker 镜像。

不要在下载结束前重复点击或重复启动脚本。若看到“锁文件已存在”，先检查现有进程和目录状态。

## 核验结果

不要只凭脚本退出码或“下载完成”判断成功。检查实际产物：

- 日期命名的输出目录（例如 `output20260804/`）：下载后的图片，文件名以 taskid 为基础。
- `download_img.csv`：逐项标记下载是否成功及失败 URL。
- `task_error.csv`：任务级错误记录。
- `error.log`：若存在，读取并用于诊断。

至少完成以下核验：

1. 读取 `download_img.csv` 与 `task_error.csv`，报告成功数、失败数和错误原因。
2. 统计输出目录中的实际图片数量，并与成功记录数对照。
3. 检查图片不是 0 字节，扩展名属于支持列表。
4. 确认 `syncs3.lock` 已被清理。
5. 若输入数、报告记录数和实际文件数不一致，明确指出差异，不要宣称全部完成。

向用户返回运行目录、输出目录、输入任务数、成功/失败记录数、实际图片数，以及失败明细文件的可点击绝对路径。

## 常见问题

- `docker: command not found` 或 `docker info` 失败：启动或安装 Docker Desktop 后重试。
- `pull access denied`、DNS 或连接失败：当前不在可访问内网镜像仓库的网络环境。
- `ipconfig getifaddr en0` 失败：检查 Mac 的 `en0` 网络接口；原脚本需要其 IP/MAC。
- 只有 CSV、没有图片：读取 `task_error.csv`、`error.log` 和 Docker 输出定位任务无效、非失败任务或源 URL 失败。
- CSV 乱码或列错位：重新生成 UTF-8、单列、表头为 `taskid` 的 CSV。
