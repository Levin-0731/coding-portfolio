# 已知接口列表

## 提交域名

| 环境 | 域名 |
|------|------|
| dev (默认) | `https://<SUBMIT_HOST>/entry` |
| 查询结果 | `https://<QUERY_HOST>/entry` |

## 接口定义

### AIVideoInspireToVideoV1 — 首帧生视频

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_url | string | 是 | 首帧图片 CDN 地址 |
| prompt_id | string | 是 | 视频动作/运镜 prompt |
| prompt_image_id | string | 是 | 图片风格描述 prompt |
| duration | number | 是 | 视频时长（秒），通常 5 |
| aspect_ratio | string | 是 | 画面比例，如 `9:16` |

### AIVideoInspireToVideoV2 — 首帧 + 尾帧生视频

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_url | string | 是 | 首帧图片 CDN 地址 |
| prompt_id | string | 是 | 视频动作/运镜 prompt |
| prompt_image_id | string | 是 | 图片风格描述 prompt |
| duration | number | 是 | 视频时长（秒），通常 5 |
| aspect_ratio | string | 是 | 画面比例，如 `9:16` |

### AIFaceRate — 男性脸型分析

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_url | string | 是 | 人脸图片 CDN 地址 |
| language | string | 否 | 语言代码：`zh`/`en`/`ja`，默认 `zh` |

**注意**: AIFaceRate 的提交域名为 `https://<QUERY_HOST>/entry`（与查询域名相同）。

---

> 新增接口时在此文件中追加即可，格式保持一致。
