---
name: api-tester
description: 测试公司内部平台后端接口。接收用户指定的接口名和参数，自动执行 curl 提交任务，轮询查询结果并展示。Use when the user wants to test an API, run a curl request, call an internal endpoint, or check task results. 当用户提到测试接口、跑 curl、调接口、查任务结果时触发。
---

# 公司内部平台接口测试

自动化测试公司内部平台后端接口：提交任务 → 获取 job_id → 轮询结果。

## 环境配置

已注册的接口和对应的默认提交域名见 [endpoints.md](endpoints.md)。如果用户指定了新的接口或域名，以用户提供的为准。

## 工作流程

### Step 1: 确认接口信息

从用户消息中提取：
- **接口名** (path)：如 `AIVideoInspireToVideoV1`
- **请求参数** (body)：用户给出的 JSON 字段
- **提交域名**：优先用户指定 > endpoints.md 中的默认值 > `https://<SUBMIT_HOST>/entry`

如果用户只给了部分参数，查 [endpoints.md](endpoints.md) 补全必填字段说明，向用户确认缺失项。

### Step 2: 提交任务

执行 curl，使用 `-s` 静默模式：

```bash
curl -s --location --request POST '<提交域名>' \
--header 'User-Agent: ios/AIHomeDecor/6748313878/1.0/49a63470274c0eec58450396faa7aa8b' \
--header 'Content-Type: application/json' \
--data-raw '{
    "path": "<接口名>",
    "body": { <用户参数> }
}'
```

从返回 JSON 中提取 `job_id`。如果返回中无 `job_id` 或请求失败，将完整响应展示给用户并停止。

### Step 3: 轮询查询结果

使用 job_id 查询，查询域名固定为 `https://<QUERY_HOST>/entry`：

```bash
curl -s --location --request POST 'https://<QUERY_HOST>/entry' \
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

**轮询策略**：
1. 提交后先等 **5 秒**，再发第一次查询
2. 如果任务未完成（status 不是终态），每隔 **5 秒** 再查一次
3. 最多轮询 **12 次**（共约 60 秒）
4. 超时后告知用户 job_id，让用户稍后手动查询

### Step 4: 展示结果

将查询结果格式化展示给用户：
- 如果结果包含 URL（视频/图片），直接展示链接
- 如果结果是分析类 JSON，格式化为易读表格或列表
- 保留原始 JSON 供用户参考

## 用户只查结果（无需提交）

如果用户只给了 `job_id` 要求查结果，跳过 Step 1-2，直接执行 Step 3-4。

## 用户给出完整 curl

如果用户直接粘贴了完整的 curl 命令，直接执行该 curl，不做改写。然后从返回中提取 job_id 继续轮询。

## 素材必须先上传

**所有接口都不支持 base64 传图/传视频。** `image_url` 等字段必须是公司内部平台 CDN 地址（形如 `https://<CDN_HOST>/<uuid>.<ext>`）。

如果用户提供的是本地文件路径或 base64 数据，需要先使用 `upload-to-s3` skill 将素材上传到 S3，拿到 CDN URL 后再调用接口。

流程：
1. 检测到用户给的是本地路径 → 触发 `upload-to-s3` skill 上传
2. 从上传报告中取得 CDN URL
3. 用 CDN URL 作为参数继续执行接口测试

## 注意事项

- 所有 curl 加 `-s` 避免进度条干扰输出
- body 中的中文内容不要转义，保持原样
- 如果用户指定了不同的 header 或域名，以用户的为准
- 展示结果时先给关键信息摘要，再给原始 JSON
- 图片/视频参数只接受 CDN URL，不支持 base64 或本地路径直传
