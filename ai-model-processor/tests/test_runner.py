from pathlib import Path

from ai_model_processor.config import load_config
from ai_model_processor.io import read_rows
from ai_model_processor.runner import run_batch


def test_run_batch_with_mock_provider(tmp_path: Path) -> None:
    config_path = tmp_path / "config.yaml"
    input_path = tmp_path / "input.csv"
    output_path = tmp_path / "output.csv"

    input_path.write_text("id,text\n1,hello\n2,world\n", encoding="utf-8")
    config_path.write_text(
        f"""
provider: mock
model: mock-echo
task_type: text_to_text
input:
  path: {input_path}
  format: csv
  id_column: id
  fields:
    text: text
output:
  path: {output_path}
  result_column: result
  error_column: error
prompt:
  template: "Rewrite: {{text}}"
options:
  mock_prefix: TEST
""",
        encoding="utf-8",
    )

    summary = run_batch(load_config(config_path))
    rows = read_rows(output_path, "csv")

    assert summary.total == 2
    assert summary.succeeded == 2
    assert summary.failed == 0
    assert rows[0]["result"] == "TEST[mock-echo/text_to_text]: Rewrite: hello"
    assert rows[0]["error"] == ""
