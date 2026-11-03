---
name: youtube-download
description: 使用 yt-dlp 下载 YouTube 视频/Shorts/音频，默认避开 AV1 编码以保证 macOS QuickTime 可直接播放。当用户提到下载 YouTube 视频、下载 Shorts、保存 YouTube 音频/MP3、抓 B 站以外的网络视频，或提供 youtube.com / youtu.be / youtube.com/shorts 链接并要求保存时使用。Use when downloading YouTube videos, shorts, or extracting audio.
---

# YouTube 下载

## 前置检查

依次确认工具是否已装：

```bash
command -v yt-dlp && command -v ffmpeg
```

- 缺 `yt-dlp` 或 `ffmpeg`：`brew install yt-dlp`（会自动带上 ffmpeg）
- 不要用 `pip3 install yt-dlp`，macOS 系统 Python 受 PEP 668 保护会失败

## 默认下载命令（推荐）

两个关键点：
1. **避开 AV1 编码**：QuickTime 在非 M3 及以上芯片上无法解码 AV1，会出现"只有声音、没画面"。优先 H.264/AVC，回退 VP9。
2. **绕过 "Sign in to confirm you're not a bot"**：默认带 `player_client=tv,web_safari`，比 cookie 方案稳定（cookie 方案在 macOS 会弹钥匙串、Edge/Chrome Beta 路径还经常对不上）。

```bash
cd ~/Downloads && yt-dlp \
  --extractor-args "youtube:player_client=tv,web_safari" \
  -f 'bv*[vcodec~="^(avc|h264)"]+ba/bv*[vcodec~="vp9"]+ba/b' \
  --merge-output-format mp4 \
  '<URL>' '<URL2>' '<URL3>' ...
```

支持一次传多个 URL 批量下载。下载到 `~/Downloads/`，文件名按视频标题自动生成。

> 提示：tv client 的视频流通常是 HLS（m3u8 分片）。日志里会出现 `[hlsnative]` 与 `Fixing MPEG-TS in MP4`，属正常现象，最终产物就是标准 mp4。

## 常见变体

### 只要音频（MP3）

```bash
yt-dlp -x --audio-format mp3 --audio-quality 0 '<URL>'
```

### 限制画质（省流量）

```bash
yt-dlp -S "vcodec:h264,res:720,acodec:m4a" --merge-output-format mp4 '<URL>'
```

`res:720` 表示最高 720p，可换成 480/1080。

### 指定输出路径与命名

```bash
yt-dlp -o '~/Downloads/%(title)s.%(ext)s' '<URL>'
```

### 下载播放列表

```bash
yt-dlp -o '~/Downloads/%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s' '<URL>'
```

不想要整列只想要单个视频时加 `--no-playlist`。

### 带字幕

```bash
yt-dlp --write-subs --sub-langs 'en,zh-Hans' --convert-subs srt '<URL>'
```

## 下载完成后的核验

下载完成后，用 ffprobe 确认视频流编码：

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of default=nw=1 '<file>'
```

如果 `codec_name=av1`，说明命令没生效（fallback 到 `b`）或源站只有 AV1 流。**用户播放反馈"只有音频"时，几乎一定是 AV1 问题**，转码即可：

```bash
ffmpeg -i '<input.mp4>' -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 192k '<output h264.mp4>'
```

## 报错排查

| 现象 | 原因 | 解决 |
|------|------|------|
| `Sign in to confirm you're not a bot` | YouTube 反爬 | 优先加 `--extractor-args "youtube:player_client=tv,web_safari"`（默认命令已带）；仍失败再试 `brew upgrade yt-dlp` 或 `--cookies-from-browser chrome` |
| `could not find chrome cookies database` | 系统装的是 Chrome Beta / Edge | 用 `--cookies-from-browser "chrome:Chrome Beta"` 或 `edge`；Edge 会弹钥匙串确认，必须手动允许，否则会卡住 |
| `Requested format is not available` | 站源没有匹配编码 | 把 format 表达式末尾的 `/b` 当作兜底，或显式 `-f bv+ba/b` |
| 下载完只有音频 | 视频是 AV1，播放器不支持 | 见上文转 H.264 |
| `ERROR: unable to download video data` | 网络/Cookie | 重试，或加 `--cookies-from-browser chrome` |

## 工作流

收到下载请求时按这个顺序：

1. 检查 `yt-dlp` / `ffmpeg`，缺则 `brew install yt-dlp`
2. 用上方"默认下载命令"下载（除非用户指定要 mp3 / 仅音频 / 指定画质）
3. 下载完用 `ffprobe` 核验编码 & 时长，给用户简短反馈（路径、大小、时长、编码）
4. 若编码是 AV1，主动提醒用户并询问是否转 H.264

## 注意事项

- 不要用 `youtube-dl`（停止维护多年），始终用 `yt-dlp`
- Shorts 链接 `youtube.com/shorts/<id>` 与普通 `watch?v=<id>` yt-dlp 都支持，无需特殊处理
- 默认下到 `~/Downloads/`，除非用户另有要求
- 不要尝试下载付费/会员专属内容，遇到提示直接告知用户
