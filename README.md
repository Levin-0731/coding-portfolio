# 个人项目

用 AI 编程独立做出来的工具。从可交互的产品原型，到浏览器插件、批处理框架和 macOS 应用，都能自己定义、实现并跑通。

| 目录 | 项目 | 技术栈 |
|------|------|--------|
| [`resume-editor`](./resume-editor) | 简历编辑器。Markdown 边写边看 A4，内容多了会自动收进一页，并导出 PDF | HTML / JS + Python |
| [`badminton-scorer`](./badminton-scorer) | 羽毛球计分器。21 分制、单打/双打发球区、局点赛点、暂停换边，断网也能记 | HTML / JS |
| [`feishu-doc-converter-extension`](./feishu-doc-converter-extension) | 飞书文档一键转成公众号、知乎、掘金、小红书的排版 | Vue 3 + Vite + Chrome Extension |
| [`tab-manager-extension`](./tab-manager-extension) | 按域名和站点类型自动分组的标签页管理插件 | 原生 JS + Chrome Extension |
| [`local-media-cropper`](./local-media-cropper) | 本地图片、视频框选裁剪，比例锁定，不上传文件 | HTML / JS + Python + ffmpeg |
| [`ai-model-processor`](./ai-model-processor) | 多模型批处理。YAML 配置供应商和 prompt，支持断点续传和多模型对比 | Python |
| [`human-detect-macos`](./human-detect-macos) | macOS 人体姿态与敏感内容检测，批量看图、叠骨骼、导出结果 | Swift / SwiftUI + Vision + Core ML |
| [`agent-skills`](./agent-skills) | 把重复工作收成 Agent 可调用的技能，Cursor、Claude Code、Codex 通用 | Markdown + Shell / Python |

## 这些项目在体现什么

- **能把产品做出来。** 简历编辑器解决「一页纸」排版，计分器按真实比赛规则处理发球区和换边，而不是只做一个加分按钮。
- **能接上真实工作流。** 飞书文档转多平台排版、标签页分组、本地裁剪，都是自己每天会打开用的工具。
- **能做评测和批处理。** 同一份输入跑多个模型、失败可续跑、结果落表，用来比较效果、成本和稳定性。
- **能把经验写成可复用的技能。** 下面这些 Skill 把接口测试、素材处理、模板生产和模型核验收成固定流程。

## Agent Skills

| Skill | 做什么 |
|-------|--------|
| `api-tester` | 提交生成任务并轮询结果，本地文件会先上传再调用 |
| `ai-face-rate` | 调用脸型分析接口，生成任务后取回结果 |
| `upload-to-s3` | 用 Docker 把图片、视频和 Prompt 传到对象存储 |
| `download-failed-task-assets` | 按 taskid 批量拉失败任务的图片，并核对结果报告 |
| `video-asset-processing` | 视频转成 720×960 H.265（带音频，≤2MB）并抽出首帧 |
| `video-template-naming` | 看视频内容，写出 2–3 个词的英文模板名 |
| `video-template-subtitle` | 给视频模板写一句 50 字以内的英文副标题 |
| `prompt-gender-neutralizer` | 检查生图 prompt 里的性别锁定，改成任意性别都能用 |
| `manga-prompt-designer` | 为图生图、图生视频写可复现的镜头和动作 prompt |
| `claude-skill-model-fingerprint` | 判断 API 背后是不是真实 Claude，识别中转和套壳 |
| `youtube-download` | 下载 YouTube 视频，默认避开 AV1，方便 macOS 直接播放 |
