#!/usr/bin/env python3
"""
Small utility for appending autoresearch experiment results to results.tsv.

Usage example:
    python scripts/autoresearch-log-helper.py --log run.log --results results.tsv \
        --commit a1b2c3d --status keep --description "baseline"
"""

from __future__ import annotations

import argparse
import pathlib
import sys
from typing import Optional, Tuple


VAL_KEY = "val_bpb:"
VRAM_KEY = "peak_vram_mb:"
STATUS_CHOICES = {"keep", "discard", "crash"}
TSV_HEADER = "commit\tval_bpb\tmemory_gb\tstatus\tdescription\n"


class LogParseError(Exception):
    """Raised when required fields cannot be parsed."""


def parse_log(path: pathlib.Path) -> Tuple[Optional[float], Optional[float]]:
    """Return (val_bpb, memory_gb) extracted from the log."""
    if not path.exists():
        raise FileNotFoundError(f"log file not found: {path}")

    val_bpb: Optional[float] = None
    memory_gb: Optional[float] = None
    try:
        for raw_line in path.read_text().splitlines():
            line = raw_line.strip()
            if line.startswith(VAL_KEY):
                try:
                    val_bpb = float(line.split(VAL_KEY, 1)[1].strip())
                except ValueError as exc:
                    raise LogParseError(f"Could not parse val_bpb from line: {line}") from exc
            elif line.startswith(VRAM_KEY):
                try:
                    peak_mb = float(line.split(VRAM_KEY, 1)[1].strip())
                    memory_gb = round(peak_mb / 1024.0, 1)
                except ValueError as exc:
                    raise LogParseError(f"Could not parse peak_vram_mb from line: {line}") from exc
    except UnicodeDecodeError as exc:
        raise LogParseError(f"Log contains non-UTF8 bytes: {exc}") from exc

    return val_bpb, memory_gb


def ensure_results_file(path: pathlib.Path) -> None:
    """Create results.tsv with header if missing."""
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TSV_HEADER)


def append_result(
    results_path: pathlib.Path,
    commit: str,
    val_bpb: float,
    memory_gb: float,
    status: str,
    description: str,
) -> None:
    """Append one TSV row."""
    ensure_results_file(results_path)
    line = f"{commit}\t{val_bpb:.6f}\t{memory_gb:.1f}\t{status}\t{description}\n"
    with results_path.open("a", encoding="utf-8") as handle:
        handle.write(line)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Parse autoresearch run.log and append to results.tsv."
    )
    parser.add_argument("--log", required=True, help="Path to run.log to parse.")
    parser.add_argument(
        "--results",
        default="results.tsv",
        help="Path to results.tsv (created if missing).",
    )
    parser.add_argument(
        "--commit",
        required=True,
        help="Git commit hash (short).",
    )
    parser.add_argument(
        "--status",
        required=True,
        choices=sorted(STATUS_CHOICES),
        help="Experiment status.",
    )
    parser.add_argument(
        "--description",
        required=True,
        help="Short description of what the experiment attempted.",
    )
    parser.add_argument(
        "--val-bpb",
        type=float,
        default=None,
        help="Override val_bpb value (used for crashes).",
    )
    parser.add_argument(
        "--memory-gb",
        type=float,
        default=None,
        help="Override memory in GB (e.g., crashes). Rounded to 0.1.",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    log_path = pathlib.Path(args.log)
    results_path = pathlib.Path(args.results)

    val_bpb, memory_gb = None, None
    parse_errors = []
    try:
        val_bpb, memory_gb = parse_log(log_path)
    except (FileNotFoundError, LogParseError) as exc:
        parse_errors.append(str(exc))

    if args.val_bpb is not None:
        val_bpb = args.val_bpb
    if args.memory_gb is not None:
        memory_gb = round(args.memory_gb, 1) if args.memory_gb is not None else None

    if val_bpb is None:
        val_bpb = 0.0
    if memory_gb is None:
        memory_gb = 0.0

    if parse_errors and args.val_bpb is None and args.memory_gb is None:
        for err in parse_errors:
            print(f"Warning: {err}", file=sys.stderr)

    append_result(
        results_path=results_path,
        commit=args.commit,
        val_bpb=val_bpb,
        memory_gb=memory_gb,
        status=args.status,
        description=args.description,
    )

    print(
        f"Appended {args.commit} ({args.status}) -> val_bpb={val_bpb:.6f}, "
        f"memory_gb={memory_gb:.1f} into {results_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
