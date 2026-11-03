from __future__ import annotations

import re
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
class ModelTarget:
    provider: str
    model: str
    api: dict[str, Any]
    options: dict[str, Any]
    result_column: str
    error_column: str


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
    targets: tuple[ModelTarget, ...] = ()


def load_config(path: str | Path) -> ProcessorConfig:
    config_path = Path(path)
    with config_path.open("r", encoding="utf-8") as file:
        raw = yaml.safe_load(file) or {}

    required = ["task_type", "input", "output", "prompt"]
    if not raw.get("models"):
        required = ["provider", "model", *required]
    _require_keys(raw, required)

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
    targets = tuple(_model_targets(raw, output_raw))
    first = targets[0]

    return ProcessorConfig(
        provider=first.provider,
        model=first.model,
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
        api=first.api,
        options=first.options,
        targets=targets,
    )


def _model_targets(raw: dict[str, Any], output_raw: dict[str, Any]) -> list[ModelTarget]:
    shared_options = dict(raw.get("options") or {})
    if raw.get("models"):
        targets: list[ModelTarget] = []
        used: set[str] = set()
        for index, item in enumerate(raw["models"]):
            if not isinstance(item, dict) or "model" not in item:
                raise ValueError(f"models[{index}] 需要包含 model")
            provider = str(item.get("provider") or raw.get("provider") or "")
            if not provider:
                raise ValueError(f"models[{index}] 缺少 provider")
            model = str(item["model"])
            slug = _unique_slug(model, used)
            targets.append(
                ModelTarget(
                    provider=provider,
                    model=model,
                    api=dict(item.get("api") or raw.get("api") or {}),
                    options={**shared_options, **dict(item.get("options") or {})},
                    result_column=str(item.get("result_column") or f"result_{slug}"),
                    error_column=str(item.get("error_column") or f"error_{slug}"),
                )
            )
        if len(targets) < 2:
            raise ValueError("对比模式至少配置两个模型；单模型请只写 provider 和 model")
        columns = [target.result_column for target in targets] + [target.error_column for target in targets]
        if len(columns) != len(set(columns)):
            raise ValueError("模型输出列名重复")
        return targets

    return [
        ModelTarget(
            provider=str(raw["provider"]),
            model=str(raw["model"]),
            api=dict(raw.get("api") or {}),
            options=shared_options,
            result_column=str(output_raw.get("result_column", "result")),
            error_column=str(output_raw.get("error_column", "error")),
        )
    ]


def _unique_slug(model: str, used: set[str]) -> str:
    base = re.sub(r"[^0-9A-Za-z]+", "_", model).strip("_").lower() or "model"
    slug = base
    number = 2
    while slug in used:
        slug = f"{base}_{number}"
        number += 1
    used.add(slug)
    return slug


def _require_keys(data: dict[str, Any], keys: list[str]) -> None:
    missing = [key for key in keys if key not in data]
    if missing:
        raise ValueError(f"Missing required config key(s): {', '.join(missing)}")


def _resolve_path(config_path: Path, value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (config_path.parent.parent / path).resolve()
