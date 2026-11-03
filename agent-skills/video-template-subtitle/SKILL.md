---
name: video-template-subtitle
description: >-
  为 toC 视频 App 的视频模板撰写英文 subtitle（副标题文案）。通过分析首帧图、
  视频标题、生图/生视频 prompt，结合竞品文案风格，为每个模板写一句 <50 字符的
  英文短句。当用户要求写 subtitle、写视频文案、写模板描述、起副标题时触发。
  Use when writing subtitle, tagline, or short copy for video templates.
---

# Video Template Subtitle Writer

## Overview

为面向欧美市场的 toC 视频 App 中的 AI 视频模板撰写 subtitle。每个模板有标题、首帧图（image_s）、生视频方式和 prompt，需要一句简短有吸引力的英文 subtitle。

## Workflow

### Step 1: 定位数据源

找到视频模板数据文件（xlsx/csv），确认需要处理的分组：
- 读取表格，列出所有分组和模板标题
- 确认哪些模板的 subtitle 为空需要填写

### Step 2: 动态收集竞品参考

**每次执行都要扫描竞品目录**，不要依赖写死的示例：

1. 在 `##起Subtitle/` 目录下查找所有竞品子文件夹（命名模式：`*竞品详情页的文案`、`*竞品*` 等）
2. 读取目录中所有图片（.png/.jpg），这些是竞品 App 的模板详情页截图
3. 从每张截图中提取：模板标题 + subtitle 文案
4. 汇总分析竞品风格特征（句式、语气、长度、是否用 emoji）

优先使用**与当前处理分类最相关**的竞品参考。例如处理 Dance 类时，优先看 `Dance竞品详情页的文案/` 目录。

### Step 3: 查看首帧图 + 读取 Prompt + 理解模板

对每个模板，需要综合以下所有信息来理解视频含义：

1. **下载并查看 image_s**（首帧图）——了解视觉风格、场景、人物、氛围
2. **读取生图 prompt**（prompt_image_id 对应的 prompt）——了解图片生成意图、风格描述、关键元素
3. **读取生视频 prompt**（prompt_id 对应的 prompt）——了解视频动作、镜头运动、节奏描述
4. 读取标题、video_type 等元信息

prompt 通常存储在独立的 prompt 文件或数据库中，需要根据 prompt_id / prompt_image_id 查找对应内容。如果表格中没有直接的 prompt 文本列，询问用户 prompt 的存储位置。

注意：
- motion_control 类（如 Dance）通常没有 prompt_image_id，只有 prompt_id
- inspire2video 类同时有 prompt_image_id（生图）和 prompt_id（生视频）
- 首帧图可批量下载到临时目录，处理完后清理

### Step 4: 撰写 Subtitle

基于以上理解，为每个模板写 subtitle。

#### 硬性规则
- 英文，字符数 < 50
- 一句话，不要分号分隔的多句
- **必须是 native English**——像美国 Z 世代写的社交媒体文案，不能有任何翻译腔。用地道的俚语、缩写、口语表达。如果写出来像是从中文翻译的，就重写。

#### 风格指南（参考竞品）

| 风格要素 | 说明 |
|---------|------|
| 句式 | 短句、断句、排比（"X, Y, and Z"） |
| 语气 | 口语化、有号召力、有态度 |
| 修辞 | 对比反差（tiny/big）、拟人、夸张 |
| 节奏 | 有韵律感，读起来朗朗上口 |
| Emoji | 可选，不强制 |

#### 分类风格差异

根据模板分类调整 tone：

| 分类 | Tone | 关键词方向 |
|------|------|-----------|
| Dance（成人） | 酷、自信、街头、释放 | vibe, energy, moves, groove, spotlight |
| Baby Dance | 萌、可爱、温暖、反差萌 | tiny, little, cute, charm, joy |
| Spooky/Horror | 悬疑、紧张、暗黑 | dark, shadow, scream, haunt |
| Awards/Glam | 奢华、闪耀、高级 | spotlight, flash, glamour, star |
| Prank/Funny | 搞笑、出其不意 | caught, busted, surprise |
| Trends | 热梗、潮流、社交感 | viral, trending, iconic |

### Step 5: 写入数据

用 openpyxl 将 subtitle 写入 xlsx 的对应单元格：
- 按 (分组名, 标题) 匹配行
- 写入 subtitle 列
- 保存文件

### Step 6: 输出结果

以表格形式展示所有写好的 subtitle，方便用户审阅：

```
| # | 标题 | Subtitle |
|---|------|----------|
| 1 | XXX  | Short punchy line here. |
```

同时说明写作思路和风格选择。

## 竞品参考目录结构

竞品截图按分类存放在 `##起Subtitle/` 下，命名规则：

```
##起Subtitle/
├── Dance竞品详情页的文案/     ← Dance 类竞品
│   ├── Baby Dance.png
│   ├── Gangsta.png
│   └── ...
├── Horror竞品详情页的文案/    ← Horror 类竞品（示例，用户会持续新增）
│   └── ...
└── ...
```

每次写 subtitle 前，用 Glob 或 ls 扫描这些目录，读取所有截图提取文案。
**不要跳过这一步**，即使之前见过这些文件——用户可能已经新增了截图。

## Notes

- 视频生成方式说明：
  - **motion_control**: 动作控制视频 + 用户图 + prompt → 新视频（Dance 类常用）
  - **ref2v**: 参考视频 + 用户图 + prompt → 新视频
  - **inspire2video**: 用户图 → 新图 → 新视频
- 临时下载的图片处理完后要清理
- 如果竞品参考目录有新截图，优先参考最新的
