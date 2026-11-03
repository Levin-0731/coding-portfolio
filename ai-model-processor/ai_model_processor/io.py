from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from openpyxl import Workbook, load_workbook


Row = dict[str, Any]


def read_rows(path: Path, file_format: str) -> list[Row]:
    if file_format == "csv":
        return _read_csv(path)
    if file_format in {"xlsx", "excel"}:
        return _read_xlsx(path)
    raise ValueError(f"Unsupported input format: {file_format}")


def write_rows(path: Path, rows: list[Row], file_format: str | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resolved_format = (file_format or path.suffix.lstrip(".")).lower()
    if resolved_format == "csv":
        _write_csv(path, rows)
        return
    if resolved_format in {"xlsx", "excel"}:
        _write_xlsx(path, rows)
        return
    raise ValueError(f"Unsupported output format: {resolved_format}")


def _read_csv(path: Path) -> list[Row]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def _write_csv(path: Path, rows: list[Row]) -> None:
    fieldnames = _fieldnames(rows)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _read_xlsx(path: Path) -> list[Row]:
    workbook = load_workbook(path)
    worksheet = workbook.active
    values = list(worksheet.iter_rows(values_only=True))
    if not values:
        return []

    headers = [str(value) if value is not None else "" for value in values[0]]
    rows: list[Row] = []
    for raw_row in values[1:]:
        row = {
            headers[index]: value
            for index, value in enumerate(raw_row)
            if index < len(headers) and headers[index]
        }
        rows.append(row)
    return rows


def _write_xlsx(path: Path, rows: list[Row]) -> None:
    workbook = Workbook()
    worksheet = workbook.active
    fieldnames = _fieldnames(rows)
    worksheet.append(fieldnames)
    for row in rows:
        worksheet.append([row.get(fieldname, "") for fieldname in fieldnames])
    workbook.save(path)


def _fieldnames(rows: list[Row]) -> list[str]:
    seen: list[str] = []
    for row in rows:
        for key in row:
            if key not in seen:
                seen.append(key)
    return seen
