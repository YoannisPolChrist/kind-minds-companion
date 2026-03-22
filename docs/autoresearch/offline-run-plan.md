# Offline Run Simulation Plan

Use this plan when no GPU is available. Follow `docs/autoresearch/setup-checklist.md` to practice run tagging, branching, and cache validation, then pretend to apply the listed changes in `train.py`. Log placeholders with `scripts/autoresearch-log-helper.py` once real metrics exist.

| # | Run Tag / Branch | Experiment Idea | train.py Adjustments | Risk Notes | Placeholder val_bpb | Placeholder memory_gb |
|---|------------------|-----------------|----------------------|------------|---------------------|-----------------------|
| 1 | autoresearch/mar19a | Baseline confirmation | No changes; commit baseline | None; sanity check logging | pending | pending |
| 2 | autoresearch/mar19b | Depth + width rebalance | DEPTH=10, ASPECT_RATIO=56, DEVICE_BATCH_SIZE=112 | Slight VRAM bump, grad_accum mismatch | ~0.995 | ~42.0 |
| 3 | autoresearch/mar19c | Conservative depth bump | DEPTH=9, keep width | Minor speed loss | ~0.996 | ~41.5 |
| 4 | autoresearch/mar19d | Warmup+warndown schedule | WARMUP_RATIO=0.05, WARMDOWN=0.35, FINAL_LR_FRAC=0.10 | Divergence if warmup too long | ~0.994 | 41.8 |
| 5 | autoresearch/mar19e | Warmup only | WARMUP_RATIO=0.03, rest default | Under-training later steps | ~0.996 | 41.8 |
| 6 | autoresearch/mar19f | Window pattern LSSL | WINDOW_PATTERN=\"LSSL\" | Runtime spike if FA3 unhappy | ~0.995 | 42.2 |
| 7 | autoresearch/mar19g | Window pattern LLSS | WINDOW_PATTERN=\"LLSS\" | VRAM jump from more global blocks | ~0.996 | 42.8 |
| 8 | autoresearch/mar19h | Device batch trim | DEVICE_BATCH_SIZE=96, keep TOTAL | More grad steps, but safer VRAM | ~0.997 | 40.0 |
| 9 | autoresearch/mar19i | Higher LR | BASE_LR x1.2 | Instability mid-run | ~0.993 | 41.8 |
|10 | autoresearch/mar19j | Muon-only optimizer | Disable AdamW fallback | Fewer stability checks | ~0.995 | 41.7 |
|11 | autoresearch/mar19k | AdamW-only | Disable Muon | Throughput drop | ~0.999 | 41.5 |
|12 | autoresearch/mar19l | Lower weight decay | WEIGHT_DECAY=0.15 | Overfitting risk | ~0.995 | 41.8 |
|13 | autoresearch/mar19m | Higher dropout | Dropout +0.05 | Underfitting | ~0.998 | 41.6 |
|14 | autoresearch/mar19n | Rotary freq tweak | Adjust rope_base | Implementation bug risk | pending | pending |
|15 | autoresearch/mar19o | Flash block skip | Alternate FA3 + SDPA | Complexity, possible crash | pending | pending |
|16 | autoresearch/mar19p | Token limit cut | MAX_SEQ_LEN 768 (mirror prepare change later) | Need matching data prep eventually | pending | pending |
|17 | autoresearch/mar19q | Gradient clipping | Enable clip at 1.0 | Might mask divergence | ~0.996 | 41.7 |
|18 | autoresearch/mar19r | Mixed precision tweak | Force torch.compile dynamic | Compile overhead >5m | pending | pending |
|19 | autoresearch/mar19s | Data order shuffle | Change dataloader seed | Low impact; ensures workflow practice | pending | pending |
|20 | autoresearch/mar19t | Combined warmup + depth | DEPTH=9 with WARMUP 0.05 | Double-change harder to debug | ~0.993 | 42.3 |

## Converting to Real TSV Entries

1. After each real `uv run train.py`, capture output into `run.log`.
2. Run `python scripts/autoresearch-log-helper.py --log run.log --results results.tsv --commit <hash> --status keep|discard|crash --description "<tag summary>"`.
3. Replace each placeholder val_bpb/memory in the table with the actual numbers before (or after) logging, so the plan reflects completed runs.
4. Keep `results.tsv` untracked per `program.md`; only code/config commits land in git.

Repeat the checklist + logging steps for all 20 runs to ingrain the GitHub workflow even if the underlying experiments are simulated.
