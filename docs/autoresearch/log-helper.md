# Autoresearch Log Helper

The script `scripts/autoresearch-log-helper.py` automates the program.md logging step:

1. Parse `run.log` after every `uv run train.py`.
2. Extract `val_bpb` and `peak_vram_mb` (converted to GB).
3. Append a row to `results.tsv`, creating the file with the required header if missing.

## Usage

```bash
python scripts/autoresearch-log-helper.py \
  --log run.log \
  --results results.tsv \
  --commit a1b2c3d \
  --status keep \
  --description "baseline run"
```

Options:
- `--val-bpb` and `--memory-gb` override parsed values (helpful for crashes or truncated logs).
- `--status` must be one of `keep`, `discard`, `crash`.

## Failure Handling

- If the parser cannot find metrics and no overrides are provided, it falls back to `0` and prints a warning so you remember to double-check the log.
- Missing logs or malformed values raise a clear error unless overrides are supplied.

## Workflow Fit

This helper keeps the GitHub loop in `program.md` tight:
- Run experiment (`uv run train.py > run.log 2>&1`).
- Execute the helper to record metrics without opening editors.
- Stage/commit only the relevant code changes; keep `results.tsv` untracked.

This mirrors real GitHub skills—repeatable logging, consistent formatting, and fewer manual mistakes when iterating rapidly.
