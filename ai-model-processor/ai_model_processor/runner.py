from __future__ import annotations

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
    elapsed_seconds: float
    output_path: Path


def run_batch(config: ProcessorConfig) -> RunSummary:
    logger = logging.getLogger(__name__)
    rows = read_rows(config.input.path, config.input.format)
    provider = create_provider(config.provider, config.api)
    start_time = time.perf_counter()
    succeeded = 0
    failed = 0

    for index, row in enumerate(tqdm(rows, desc="Processing", unit="row"), start=1):
        row_id = row.get(config.input.id_column) if config.input.id_column else index
        logger.info("Processing row %s/%s id=%s", index, len(rows), row_id)
        try:
            prompt = render_prompt(config.prompt.template, row, config.input.fields)
            response = provider.process(
                ProviderRequest(
                    model=config.model,
                    task_type=config.task_type,
                    prompt=prompt,
                    row=row,
                    options=config.options,
                )
            )
            row[config.output.result_column] = response.result
            row[config.output.error_column] = ""
            succeeded += 1
        except Exception as exc:  # noqa: BLE001 - batch jobs should keep failed rows visible.
            logger.exception("Failed row id=%s", row_id)
            row[config.output.result_column] = ""
            row[config.output.error_column] = str(exc)
            failed += 1

    write_rows(config.output.path, rows)
    elapsed = time.perf_counter() - start_time
    logger.info(
        "Batch completed total=%s succeeded=%s failed=%s elapsed=%.2fs output=%s",
        len(rows),
        succeeded,
        failed,
        elapsed,
        config.output.path,
    )
    return RunSummary(
        total=len(rows),
        succeeded=succeeded,
        failed=failed,
        elapsed_seconds=elapsed,
        output_path=config.output.path,
    )
