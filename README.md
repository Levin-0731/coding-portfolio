# Coding Portfolio

个人 AI 编程项目合集。所有项目均已脱敏：密钥、内部域名、个人信息已替换为占位符，使用前需按各项目说明自行配置。

| 目录 | 项目 | 技术栈 |
|------|------|--------|
| [`resume-editor`](./resume-editor) | 简历编辑器：Markdown 编辑、A4 实时预览、自动一页排版、PDF 导出 | HTML / JS + Python（零依赖） |
| [`agent-skills`](./agent-skills) | 为日常工作流编写的 Agent Skills（Cursor / Claude Code / Codex 通用） | Markdown + Shell / Python |
| [`feishu-doc-converter-extension`](./feishu-doc-converter-extension) | 飞书文档转换 Chrome 插件：一键转为公众号、知乎、掘金、小红书排版 | Vue 3 + Vite + Chrome Extension |
| [`tab-manager-extension`](./tab-manager-extension) | 标签页智能分组 Chrome / Edge 插件 | 原生 JS + Chrome Extension |
| [`local-media-cropper`](./local-media-cropper) | 本地图片 / 视频框选裁剪工具 | HTML / JS + Python + ffmpeg |
| [`ai-model-processor`](./ai-model-processor) | 多模型批量处理框架：CSV 输入、Provider 可插拔、批量调用与结果导出 | Python |
| [`human-detect-macos`](./human-detect-macos) | macOS 人体姿态与敏感内容检测 App | Swift / SwiftUI + Vision + Core ML |

## Agent Skills 列表

| Skill | 作用 |
|-------|------|
| `api-tester` | 自动提交后端任务并轮询结果 |
| `ai-face-rate` | 调用脸型分析接口并查询结果 |
| `upload-to-s3` | 通过 Docker 把素材与 Prompt 上传到 S3 |
| `download-failed-task-assets` | 按 taskid 批量下载失败任务素材并核验报告 |
| `video-asset-processing` | 视频批量转码（H.265、≤2MB）并提取首帧 |
| `video-template-naming` | 抽帧分析视频内容，生成模板英文名 |
| `video-template-subtitle` | 为视频模板撰写英文副标题文案 |
| `prompt-gender-neutralizer` | 检查并修复生图 prompt 中的性别锁定问题 |
| `manga-prompt-designer` | 为图生图 / 图生视频设计 prompt |
| `claude-skill-model-fingerprint` | 检测 API 背后是否为真实 Claude 模型（识别中转与套壳） |
| `youtube-download` | 基于 yt-dlp 下载 YouTube 视频，默认避开 AV1 |

## 脱敏说明

- 飞书 App ID / Secret、Google Analytics 密钥、OAuth Client ID 改为从 `.env` 读取，见 `feishu-doc-converter-extension/.env.example`
- 内部接口域名、CDN 域名、私有镜像仓库地址替换为 `<SUBMIT_HOST>`、`<QUERY_HOST>`、`<CDN_HOST>`、`<PRIVATE_REGISTRY>`
- 简历编辑器只附带占位符示例简历和灰色占位照片
- Xcode 的 `DEVELOPMENT_TEAM` 已清空，测试图片未上传
