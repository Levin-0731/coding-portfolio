from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


SUPPORTED_TASK_TYPES = {
    "text_to_text",
    "text_to_image",
    "image_to_text",
    "image_to_image",
    "text_to_video",
    "video_to_text",
}


@dataclass(frozen=True)
class InputConfig:
    path: Path
    format: str
    fields: dict[str, str]
    id_column: str | None = None


@dataclass(frozen=True)
class OutputConfig:
    path: Path
    result_column: str = "result"
    error_column: str = "error"


@dataclass(frozen=True)
class PromptConfig:
    template: str


@dataclass(frozen=True)
class ProcessorConfig:
    provider: str
    model: str
    task_type: str
    input: InputConfig
    output: OutputConfig
    prompt: PromptConfig
    api: dict[str, Any] = field(default_factory=dict)
    options: dict[str, Any] = field(default_factory=dict)


def load_config(path: str | Path) -> ProcessorConfig:
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as file:
        raw = yaml.safe_load(file) or {}

    _require_keys(raw, ["provider", "model", "task_type", "input", "output", "prompt"])

    task_type = str(raw["task_type"])
    if task_type not in SUPPORTED_TASK_TYPES:
        supported = ", ".join(sorted(SUPPORTED_TASK_TYPES))
        raise ValueError(f"Unsupported task_type '{task_type}'. Supported: {supported}")

    input_raw = dict(raw["input"])
    output_raw = dict(raw["output"])
    prompt_raw = dict(raw["prompt"])
    _require_keys(input_raw, ["path", "format", "fields"])
    _require_keys(output_raw, ["path"])
    _require_keys(prompt_raw, ["template"])

    return ProcessorConfig(
        provider=str(raw["provider"]),
        model=str(raw["model"]),
        task_type=task_type,
        input=InputConfig(
            path=_resolve_path(config_path, input_raw["path"]),
            format=str(input_raw["format"]).lower(),
            id_column=input_raw.get("id_column"),
            fields={str(key): str(value) for key, value in dict(input_raw["fields"]).items()},
        ),
        output=OutputConfig(
            path=_resolve_path(config_path, output_raw["path"]),
            result_column=str(output_raw.get("result_column", "result")),
            error_column=str(output_raw.get("error_column", "error")),
        ),
        prompt=PromptConfig(template=str(prompt_raw["template"])),
        api=dict(raw.get("api") or {}),
        options=dict(raw.get("options") or {}),
    )


def _require_keys(data: dict[str, Any], keys: list[str]) -> None:
    missing = [key for key in keys if key not in data]
    if missing:
        raise ValueError(f"Missing required config key(s): {', '.join(missing)}")


def _resolve_path(config_path: Path, value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (config_path.parent.parent / path).resolve()
