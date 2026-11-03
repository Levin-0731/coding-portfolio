from __future__ import annotations

from typing import Any


def render_prompt(template: str, row: dict[str, Any], field_map: dict[str, str]) -> str:
    values = {}
    for prompt_name, column_name in field_map.items():
        if column_name not in row:
            raise KeyError(f"Input column '{column_name}' for prompt field '{prompt_name}' not found")
        values[prompt_name] = row[column_name]
    return template.format(**values)
