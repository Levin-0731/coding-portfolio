---
name: upload-to-s3
description: 上传图片、视频素材或 Prompt 到公司内部平台 S3（通过 Docker）。当用户要求上传素材、上传 prompt、同步资源到 S3、或提到公司内部平台上传流程时触发。Use when uploading assets, prompts, syncing resources to S3, or when the user mentions the internal platform upload.
---

# 上传素材到公司内部平台

支持两种上传模式：**素材上传**（图片/视频）和 **Prompt 上传**。

## 上传目录

```
UPLOAD_DIR=$HOME/work/upload
```

目录结构：

```
upload/
├── image/           # 待上传图片
├── video/           # 待上传视频
├── prompt.csv       # 待上传 prompt
├── imagetmp/        # 图片上传结果（每次运行清空）
├── videotmp/        # 视频上传结果（每次运行清空）
├── prompttmp/       # prompt 上传结果（每次运行清空）
├── old_image/       # 已上传图片归档
├── old_video/       # 已上传视频归档
├── imagefail/       # 上传失败的图片
├── videofail/       # 上传失败的视频
├── promptfail/      # 上传失败的 prompt
├── upload_report.csv           # 素材总上传记录
├── syncs3toolres.command       # 素材上传脚本
└── processPrompt.command       # prompt 上传脚本
```

## 工作流程

### Step 1: 放入素材

将图片复制到 `image/`，视频复制到 `video/`。

```bash
cp /path/to/images/*.{png,jpg,jpeg} "$UPLOAD_DIR/image/"
cp /path/to/videos/*.mp4 "$UPLOAD_DIR/video/"
```

确认文件已正确放入：

```bash
ls "$UPLOAD_DIR/image/"
ls "$UPLOAD_DIR/video/"
```

### Step 2: 确保脚本存在

上传脚本必须和素材目录在同一层（Docker 挂载 `$(pwd)` 需要）。先检查上传目录中是否已有脚本，没有就从 skill 目录复制过去：

```bash
SKILL_DIR="$HOME/.cursor/skills/upload-to-s3"

for script in syncs3toolres.command processPrompt.command; do
  if [ ! -f "$UPLOAD_DIR/$script" ]; then
    cp "$SKILL_DIR/$script" "$UPLOAD_DIR/$script"
    echo "已从 skill 复制: $script"
  fi
done
```

脚本说明：
- `syncs3toolres.command` — 素材上传（Docker 镜像 `<PRIVATE_REGISTRY>/dev-tool:syncs3-tool-res`）
- `processPrompt.command` — Prompt 处理（Docker 镜像 `<PRIVATE_REGISTRY>/process-prompt:latest`）

### Step 3: 执行上传

前置条件：Docker Desktop 必须已启动。

**AI agent 调用方式**（非交互模式，避免 TTY 问题）：

```bash
cd "$UPLOAD_DIR"
syncfile="$(pwd)"
image="<PRIVATE_REGISTRY>/dev-tool:syncs3-tool-res"
echo "yes" | docker run -i --rm -v "${syncfile}:/var/data/" ${image}
```

**人工交互方式**：

```bash
cd "$UPLOAD_DIR"
bash syncs3toolres.command
```

脚本会自动：
- 清空 `imagetmp/`、`videotmp/`、`imagefail/`、`videofail/`
- 上传素材到 S3，文件重命名为 UUID
- 在 `imagetmp/images_upload_report.csv` 和 `videotmp/videos_upload_report.csv` 生成上传报告

### Step 4: 检查上传结果

读取本次上传报告，确认所有文件上传成功：

```bash
cat "$UPLOAD_DIR/imagetmp/images_upload_report.csv" 2>/dev/null
cat "$UPLOAD_DIR/videotmp/videos_upload_report.csv" 2>/dev/null
```

报告格式：`原素材名,新素材名,是否上传成功,对应素材地址url`

上传成功后，CDN 地址格式为：`https://<CDN_HOST>/<uuid>.<ext>`

如有失败文件，检查 `imagefail/` 和 `videofail/`。

### Step 5: 归档素材

将已上传的原始文件移到 old 目录：

```bash
mv "$UPLOAD_DIR/image/"*.{png,jpg,jpeg,gif,bmp,webp} "$UPLOAD_DIR/old_image/" 2>/dev/null
mv "$UPLOAD_DIR/video/"*.{mp4,avi,mkv,mov,wmv,flv,mp3} "$UPLOAD_DIR/old_video/" 2>/dev/null
```

### Step 6: 更新总 CSV

将本次上传记录追加到 `upload_report.csv`。

总 CSV 格式：

```
类型,原素材名,新素材名,是否上传成功,对应素材地址url,上传日期
```

从 `imagetmp/images_upload_report.csv` 提取记录，加上 `图片` 类型前缀和当天日期；从 `videotmp/videos_upload_report.csv` 提取，加上 `视频` 类型前缀和当天日期。跳过 CSV 首行表头。

```python
import csv
from datetime import date

upload_dir = "$HOME/work/upload"
today = date.today().isoformat()

with open(f"{upload_dir}/upload_report.csv", "a", newline="") as out:
    writer = csv.writer(out)
    for type_label, report in [("图片", "imagetmp/images_upload_report.csv"),
                                ("视频", "videotmp/videos_upload_report.csv")]:
        try:
            with open(f"{upload_dir}/{report}", "r") as f:
                reader = csv.reader(f)
                next(reader)  # skip header
                for row in reader:
                    if row:
                        writer.writerow([type_label] + row + [today])
        except FileNotFoundError:
            pass
```

---

## Prompt 上传流程

用于将 `prompt.csv` 中的 prompt 文本上传到 S3。

### Step 1: 准备 prompt.csv

将 prompt.csv 放入上传目录。CSV 格式：首行为表头 `prompt`，每行一个 prompt（用双引号包裹，内部双引号转义为 `""`）。

### Step 2: 确保脚本存在

```bash
SKILL_DIR="$HOME/.cursor/skills/upload-to-s3"
if [ ! -f "$UPLOAD_DIR/processPrompt.command" ]; then
  cp "$SKILL_DIR/processPrompt.command" "$UPLOAD_DIR/processPrompt.command"
fi
```

### Step 3: 执行上传

**AI agent 调用方式**：

```bash
cd "$UPLOAD_DIR"
syncfile="$(pwd)"
image="<PRIVATE_REGISTRY>/process-prompt:latest"
echo "yes" | docker run -i --rm -v "${syncfile}:/var/data/" ${image}
```

### Step 4: 检查结果并更新总 CSV

报告位于 `prompttmp/prompt_processed_report.csv`，格式：`prompt,唯一标识,是否上传成功,对应S3地址`

**注意**：prompt 内容含逗号和引号，标准 CSV 解析会列错位。唯一标识、状态、S3 地址固定在每行最后 3 列。

将 prompt 记录追加到 `upload_report.csv`：

```python
import csv
from datetime import date

upload_dir = "$HOME/work/upload"
today = date.today().isoformat()

with open(f"{upload_dir}/prompttmp/prompt_processed_report.csv", "r") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    records = []
    for row in reader:
        if not row:
            continue
        identifier = row[-3]   # prompt_YYYYMMDD_<hash>
        success = row[-2]
        prompt_content = ",".join(row[:-3])  # rejoin split prompt
        records.append((prompt_content, identifier, success))

with open(f"{upload_dir}/upload_report.csv", "a", newline="") as out:
    writer = csv.writer(out)
    for prompt_content, identifier, success in records:
        # 类型, 原素材名(prompt内容), 新素材名(空), 是否上传成功, URL(标识符), 上传日期
        writer.writerow(["prompt", prompt_content, "", success, identifier, today])
```

如有失败，检查 `promptfail/` 目录。

---

## 注意事项

- Docker Desktop 必须已启动，否则上传命令会失败
- 每次上传前确认 `image/` 和 `video/` 中只有本次要上传的文件
- 上传脚本会清空 tmp 和 fail 目录，上一次的结果不会保留
- 归档到 old 目录是为了防止下次误传
- prompt 上传后不需要归档，prompt.csv 可直接删除或保留
