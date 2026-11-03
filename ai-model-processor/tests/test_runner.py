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


def _write_job(tmp_path: Path, output_name: str, extra: str = "") -> Path:
    input_path = tmp_path / "input.csv"
    output_path = tmp_path / output_name
    config_path = tmp_path / f"{output_name}.yaml"
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
prompt:
  template: "Rewrite: {{text}}"
{extra}
""",
        encoding="utf-8",
    )
    return config_path


def test_resume_skips_success_and_retries_failure(tmp_path: Path) -> None:
    from ai_model_processor.providers.mock import CALLS

    config_path = _write_job(tmp_path, "out.csv", "options:\n  mock_fail_ids: ['2']\n  mock_prefix: TEST\n")
    first = run_batch(load_config(config_path))
    assert first.failed == 1
    assert read_rows(tmp_path / "out.csv", "csv")[1]["error"] == "mock failure"

    CALLS.clear()
    config_path.write_text(
        config_path.read_text(encoding="utf-8").replace("  mock_fail_ids: ['2']\n", ""),
        encoding="utf-8",
    )
    second = run_batch(load_config(config_path))
    rows = read_rows(tmp_path / "out.csv", "csv")

    assert second.skipped == 1
    assert second.succeeded == 1
    assert CALLS == ["mock-echo:2"]
    assert rows[0]["result"].endswith("Rewrite: hello")
    assert rows[1]["error"] == ""


def test_compare_writes_one_column_per_model(tmp_path: Path) -> None:
    input_path = tmp_path / "input.csv"
    output_path = tmp_path / "compare.csv"
    config_path = tmp_path / "compare.yaml"
    input_path.write_text("id,text\n1,hello\n", encoding="utf-8")
    config_path.write_text(
        f"""
task_type: text_to_text
models:
  - provider: mock
    model: alpha
    options:
      mock_prefix: A
  - provider: mock
    model: beta
    options:
      mock_prefix: B
input:
  path: {input_path}
  format: csv
  id_column: id
  fields:
    text: text
output:
  path: {output_path}
prompt:
  template: "{{text}}"
""",
        encoding="utf-8",
    )

    summary = run_batch(load_config(config_path))
    row = read_rows(output_path, "csv")[0]

    assert summary.succeeded == 2
    assert row["result_alpha"].startswith("A[alpha/")
    assert row["result_beta"].startswith("B[beta/")
    assert row["error_alpha"] == ""
    assert row["error_beta"] == ""
