from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path

from tqdm import tqdm

from .config import ProcessorConfig
from .io import read_rows, write_rows
from .prompting import render_prompt
from .providers import ProviderRequest, create_provider


@dataclass(frozen=True)
class RunSummary:
    total: int
    succeeded: int
    failed: int
    skipped: int
    elapsed_seconds: float
    output_path: Path


def run_batch(config: ProcessorConfig, *, resume: bool = True) -> RunSummary:
    logger = logging.getLogger(__name__)
    rows = read_rows(config.input.path, config.input.format)
    prior = _load_prior(config) if resume else {}
    start_time = time.perf_counter()
    succeeded = 0
    failed = 0
    skipped = 0
    providers: dict[str, object] = {}

    for index, row in enumerate(tqdm(rows, desc="Processing", unit="row"), start=0):
        row_id = row.get(config.input.id_column) if config.input.id_column else index
        key = _row_key(row, config.input.id_column, index)
        old = prior.get(key, {})
        logger.info("Processing row %s/%s id=%s", index + 1, len(rows), row_id)
        for target in config.targets:
            previous_result = str(old.get(target.result_column, "") or "").strip()
            previous_error = str(old.get(target.error_column, "") or "").strip()
            if previous_result and not previous_error:
                row[target.result_column] = old.get(target.result_column, "")
                row[target.error_column] = ""
                skipped += 1
                continue
            try:
                provider = _provider_for(providers, target.provider, target.api)
                response = provider.process(
                    ProviderRequest(
                        model=target.model,
                        task_type=config.task_type,
                        prompt=render_prompt(config.prompt.template, row, config.input.fields),
                        row=row,
                        options=target.options,
                    )
                )
                row[target.result_column] = response.result
                row[target.error_column] = ""
                succeeded += 1
            except Exception as exc:  # noqa: BLE001 - batch jobs should keep failed rows visible.
                logger.exception("Failed row id=%s model=%s", row_id, target.model)
                row[target.result_column] = ""
                row[target.error_column] = str(exc)
                failed += 1
        write_rows(config.output.path, rows)

    elapsed = time.perf_counter() - start_time
    logger.info(
        "Batch completed total=%s succeeded=%s failed=%s skipped=%s elapsed=%.2fs output=%s",
        len(rows),
        succeeded,
        failed,
        skipped,
        elapsed,
        config.output.path,
    )
    return RunSummary(
        total=len(rows),
        succeeded=succeeded,
        failed=failed,
        skipped=skipped,
        elapsed_seconds=elapsed,
        output_path=config.output.path,
    )


def _provider_for(cache: dict[str, object], name: str, api: dict) -> object:
    key = f"{name}:{json.dumps(api, sort_keys=True, default=str)}"
    if key not in cache:
        cache[key] = create_provider(name, api)
    return cache[key]


def _load_prior(config: ProcessorConfig) -> dict[str, dict]:
    path = config.output.path
    if not path.exists():
        return {}
    file_format = path.suffix.lstrip(".").lower()
    prior: dict[str, dict] = {}
    for index, row in enumerate(read_rows(path, file_format)):
        prior[_row_key(row, config.input.id_column, index)] = row
    return prior


def _row_key(row: dict, id_column: str | None, index: int) -> str:
    if id_column and row.get(id_column) not in (None, ""):
        return str(row[id_column])
    return f"#{index}"
