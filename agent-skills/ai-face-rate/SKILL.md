---
name: ai-face-rate
description: 调用 AIFaceRate 接口进行男性脸型分析。传入图片 URL 生成任务，然后查询分析结果。Use when analyzing male face shape, face rating, or calling AIFaceRate API.
---

# AIFaceRate 男性脸型分析

通过公司内部平台 API 对男性面部进行脸型分析。

## API Endpoint

```
https://<QUERY_HOST>/entry
```

## Workflow

### Step 1: 创建分析任务

传入图片 URL，获取 task id：

```bash
curl --location --request POST 'https://<QUERY_HOST>/entry' \
--header 'User-Agent: ios/AIHomeDecor/6748313878/1.0/49a63470274c0eec58450396faa7aa8b' \
--header 'Content-Type: application/json' \
--data-raw '{
    "path": "AIFaceRate",
    "body": {
        "image_url": "<IMAGE_URL>",
        "language": "zh"
    }
}'
```

**参数说明**：
- `image_url`: 图片的 CDN 地址（如 `https://<CDN_HOST>/xxx.jpg`）
- `language`: 语言代码（`zh` 中文, `en` 英文, `ja` 日文）

**返回示例**：
```json
{
    "job_id": "f0e323c4-0228-4e4c-b355-578bfbeaa5e1"
}
```

### Step 2: 查询任务结果

使用返回的 `job_id` 查询分析结果：

```bash
curl --location --request POST 'https://<QUERY_HOST>/entry' \
--header 'x-project-name: heartrate' \
--header 'User-Agent: ios/AIHomeDecor/6748313878/1.0/49a63470274c0eec58450396faa7aa8b' \
--header 'x-project-alias: heartrate-1c' \
--header 'Content-Type: application/json' \
--data-raw '{
    "path": "AITaskResult",
    "body": {
        "job_id": "<JOB_ID>"
    }
}'
```

## 完整示例

```bash
# 1. 创建任务
curl -s --location --request POST 'https://<QUERY_HOST>/entry' \
--header 'User-Agent: ios/AIHomeDecor/6748313878/1.0/49a63470274c0eec58450396faa7aa8b' \
--header 'Content-Type: application/json' \
--data-raw '{
    "path": "AIFaceRate",
    "body": {
        "image_url": "https://<CDN_HOST>/<uuid>.jpg",
        "language": "zh"
    }
}'

# 2. 等待几秒后查询结果
curl -s --location --request POST 'https://<QUERY_HOST>/entry' \
--header 'x-project-name: heartrate' \
--header 'User-Agent: ios/AIHomeDecor/6748313878/1.0/49a63470274c0eec58450396faa7aa8b' \
--header 'x-project-alias: heartrate-1c' \
--header 'Content-Type: application/json' \
--data-raw '{
    "path": "AITaskResult",
    "body": {
        "job_id": "<从上一步获取的job_id>"
    }
}'
```

## Notes

- 任务创建后需要等待几秒再查询结果
- 如果结果未准备好，可能需要多次轮询
