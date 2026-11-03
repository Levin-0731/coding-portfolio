---
name: video-asset-processing
description: 批量处理视频模板素材：将 MP4 源视频转换为 720×960 H.265 视频（带音频，≤2MB）并提取首帧图。自动创建标准目录结构并执行全流程转换。当用户提到处理视频素材、转换视频格式、提取首帧、或准备视频模板物料时触发。
---

# 视频模板素材批量处理

将 MP4 源视频一键转换为视频模板所需的全部产物。

## 使用场景

- 拿到新的 MP4 视频模板，需要生成各格式产物
- 批量生成 720×960 H.265 视频
- 提取视频首帧图
- 为新模板组创建标准目录结构

## 产物规格

| 产物 | 目录 | 格式 | 分辨率 | 大小限制 | 编码 | 说明 |
|------|------|------|--------|----------|------|------|
| 视频 | `video_s/` | .mp4 | 720×960 | ≤2MB | H.265 main10 + hvc1，AAC 128k | 裁剪适配无黑边，保留音频 |
| 首帧图 | `image_s/` | .jpg | 720×960 | - | JPEG q:2 | 从 `video_s` 提取第一帧 |

## 目录结构规范

每个模板组的标准结构：

```
【编号】模板组名/
├── mp4 原始/         # 可选，存放原始源文件
├── video_s/          # 720×960 H.265 带音频
└── image_s/          # 首帧 JPG（720×960）
```

文件命名保持一致：所有产物与源文件同名（仅扩展名不同）。

## 处理流程

### 前置检查

确认工具已安装：

```bash
ffmpeg -version && ffprobe -version
```

未安装则执行：`brew install ffmpeg`

同时确认 ffmpeg 启用了 libx265（`ffmpeg -encoders 2>/dev/null | grep libx265`）。

### 步骤 1：创建目录结构

用户指定模板组路径后，创建标准子目录：

```bash
base_dir="目标路径"
mkdir -p "$base_dir/video_s" "$base_dir/image_s"
```

### 步骤 2：转换 720×960（H.265 main10 + hvc1，带音频，≤2MB）

裁剪适配到 720×960，居中裁剪无黑边，保留音频：

```bash
ffmpeg -y -i "源.mp4" \
  -vf 'scale=720:960:force_original_aspect_ratio=increase,crop=720:960' \
  -c:v libx265 -preset medium -crf 28 \
  -profile:v main10 -pix_fmt yuv420p10le \
  -tag:v hvc1 \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -movflags +faststart \
  "video_s/同名.mp4"
```

文件体积控制：CRF 28 通常已足够小。若超过 2MB，依次尝试 CRF 30、CRF 32 重压缩；仍超出时再回退到比特率控制：

```bash
# 比特率回退（仅在 CRF 32 仍超 2MB 时使用）
video_bitrate=$(awk -v d="$duration" 'BEGIN { printf "%d", (2 * 8 * 1024 / d) * 0.8 - 128 }')
ffmpeg -y -i "源.mp4" \
  -vf 'scale=720:960:force_original_aspect_ratio=increase,crop=720:960' \
  -c:v libx265 -preset medium -b:v ${video_bitrate}k \
  -maxrate ${video_bitrate}k -bufsize $((video_bitrate * 2))k \
  -profile:v main10 -pix_fmt yuv420p10le -tag:v hvc1 \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -movflags +faststart \
  "video_s/同名.mp4"
```

### 步骤 3：提取首帧图（从 video_s 提取）

首帧图必须从 `video_s` 提取，确保分辨率与最终视频一致（720×960）：

```bash
ffmpeg -y -ss 0.0 -i "video_s/同名.mp4" -vframes 1 -f image2 -q:v 2 "image_s/同名.jpg"
```

## 一体化处理脚本

优先使用 `scripts/process_videos.py`，一次性完成全部转换：

```bash
# 处理指定目录下所有 mp4
python process_videos.py /path/to/template_group/

# 处理指定文件
python process_videos.py video1.mp4 video2.mp4

# 指定输出目录
python process_videos.py -o /output/path/ video1.mp4

# 自定义子目录名（默认 video_s / image_s）
python process_videos.py \
  --dir-video custom_video --dir-frame custom_image \
  /path/to/template_group/

# 只压缩视频，不生成首帧图（也不会创建首帧图目录）
python process_videos.py --no-frame /path/to/template_group/

# 跳过已存在产物（断点续跑）
python process_videos.py --skip-existing /path/to/template_group/
```

脚本默认目录命名：`video_s / image_s`。使用 `--no-frame` 时只生成 `video_s/`，跳过首帧图步骤。

脚本位置：本 skill 目录下的 `scripts/process_videos.py`

## 注意事项

- 源视频比例不是 3:4 时，720×960 版本会居中裁剪适配（`force_original_aspect_ratio=increase` + `crop`）
- H.265 main10 + hvc1 标签可被 iOS / macOS QuickTime 直接播放并启用硬件解码
- 文件命名需与源文件保持一致（如 `【1】Honey Blonde Wave`），各目录下仅扩展名不同
- 处理大批量文件时建议逐个处理，避免内存溢出
- 若部署目标设备不支持 H.265，可在脚本里改回 `libx264`（无 `-profile:v main10 -pix_fmt yuv420p10le -tag:v hvc1`）
