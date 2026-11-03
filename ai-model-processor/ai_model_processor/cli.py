from __future__ import annotations

import argparse
import logging
from pathlib import Path

from .config import load_config
from .runner import run_batch


def main() -> None:
    parser = argparse.ArgumentParser(prog="ai-model-processor")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run a configured batch job.")
    run_parser.add_argument("--config", required=True, help="Path to YAML config.")
    run_parser.add_argument("--log-file", default="logs/batch.log", help="Path to log file.")
    run_parser.add_argument("--verbose", action="store_true", help="Enable console debug logs.")

    args = parser.parse_args()
    if args.command == "run":
        _setup_logging(Path(args.log_file), args.verbose)
        config = load_config(args.config)
        summary = run_batch(config)
        print(
            "Completed: "
            f"total={summary.total}, succeeded={summary.succeeded}, failed={summary.failed}, "
            f"elapsed={summary.elapsed_seconds:.2f}s, output={summary.output_path}"
        )


def _setup_logging(log_file: Path, verbose: bool) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    handlers: list[logging.Handler] = [logging.FileHandler(log_file, encoding="utf-8")]
    if verbose:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=handlers,
    )


if __name__ == "__main__":
    main()
