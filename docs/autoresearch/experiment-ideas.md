# Autoresearch Experiment Ideas

These proposals come directly from autoresearch/train.py and are designed to drop into the GitHub workflow described in program.md (edit train.py, commit, run `uv run train.py`, log results in results.tsv).

## 1. Deeper Blocks With Balanced Width
- **Change set (train.py hyperparameters):** set `DEPTH = 10` (was 8), lower `ASPECT_RATIO` from 64 to 56 so the computed `n_embd` (~560) remains close to the original parameter budget, and reduce `DEVICE_BATCH_SIZE` from 128 to 112 so `TOTAL_BATCH_SIZE` stays divisible without exploding VRAM. Leave `TOTAL_BATCH_SIZE` constant to keep throughput comparable.
- **Rationale:** Additional transformer blocks improve expressivity and should drive val_bpb down if compute stays within the 5-minute wall clock. Lowering ASPECT_RATIO keeps per-layer width manageable so Muon matmul cost stays close to baseline. Slightly smaller per-device batches protect VRAM and reduce micro-step residency.
- **Guardrails:** After editing the constants, re-check `grad_accum_steps` (it is recomputed from `TOTAL_BATCH_SIZE // (DEVICE_BATCH_SIZE * MAX_SEQ_LEN)`) and confirm it remains an integer. Watch for OOM: if the first attempt crashes, retry with `DEVICE_BATCH_SIZE = 96`. Commit message idea: `git commit -am "bump depth 10 rebalance width"` and log the outcome even if reverted.

## 2. Warmup + Cosine-ish Warndown Schedule
- **Change set:** adjust the LR schedule knobs near the hyperparameter block to `WARMUP_RATIO = 0.05`, `WARMDOWN_RATIO = 0.35`, and `FINAL_LR_FRAC = 0.10`. Update `get_lr_multiplier` (later in train.py) to clamp the warmup denominator to avoid div-by-zero when warmup is positive (already guarded). Optionally taper `WEIGHT_DECAY` a little slower by setting `WEIGHT_DECAY = 0.15` so `get_weight_decay` keeps some regularization near the end.
- **Rationale:** The current setup has no warmup and halves the LR for the entire second half of the run. Adding a short warmup should stabilize the first few hundred steps (reducing spikes that hurt val_bpb), and finishing with 10% LR instead of zero keeps learning active through the 5-minute budget. Slightly lower decay reduces underfitting when LR is already low.
- **Guardrails:** Runs may diverge if warmup is too long; keep it at 5% max so only ~15 seconds ramp. Validate that `progress` transitions still respect `WARMUP_RATIO + WARMDOWN_RATIO <= 1`. If divergence occurs, fall back to `WARMDOWN_RATIO = 0.4`. Commit with a message like `add lr warmup/warndown` and tag the TSV entry accordingly.

## 3. Window Pattern Simplification for Speed
- **Change set:** In the model config builder, flip `WINDOW_PATTERN` from "SSSL" to "LSSL" (or even "LLSS") so every other block can attend globally earlier. This only requires editing the constant near the top of the hyperparameter section.
- **Rationale:** FlashAttention 3 pays a penalty when switching between short and long windows. Giving the first two blocks full context can improve long-range conditioning without increasing depth, potentially improving val_bpb for dialogue-style data.
- **Guardrails:** If runtime exceeds the 5-minute cap or VRAM spikes, revert to "SSSL" or test "SLSL". Ensure `fa3.flash_attn_func` still receives a supported `window_size` pattern; failures will surface as runtime errors before the first optimizer step. Record the status even when reverting.
