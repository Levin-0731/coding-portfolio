# AI Model Processor

一个本地批处理脚本框架：读取 CSV 或 Excel，根据 YAML 配置选择 API 供应商、模型、任务类型、输入输出字段和 prompt，批量调用模型并写回结果。

## 当前能力

- CSV / XLSX 输入与输出
- YAML 驱动配置
- provider 插件式抽象
- mock provider，可无密钥跑通端到端流程
- OpenAI Chat Completions provider 初版
- 逐行日志、进度条、耗时预估
- pytest 测试覆盖核心链路

## 安装

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## 运行示例

```bash
ai-model-processor run --config config/example.mock.yaml
```

输出会写入 `outputs/example_output.csv`。

## 配置示例

```yaml
provider: mock
model: mock-echo
task_type: text_to_text

input:
  path: examples/sample_input.csv
  format: csv
  id_column: id
  fields:
    text: text

output:
  path: outputs/example_output.csv
  result_column: result
  error_column: error

prompt:
  template: "请把下面的文本改写得更简洁：{text}"
```

## OpenAI 示例

```yaml
provider: openai
model: gpt-4.1-mini
api:
  api_key_env: OPENAI_API_KEY
  base_url: https://api.openai.com/v1
```

然后运行：

```bash
export OPENAI_API_KEY="..."
ai-model-processor run --config config/your-openai-config.yaml
```

## 设计原则

- 新供应商通过新增 provider 类接入，不复制一份孤立脚本
- 业务变更优先修改 YAML，不改代码
- 输入、输出、prompt 和 provider 解耦
- 默认保留失败行并写入 error 字段，便于重跑与排查
