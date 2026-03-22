

# Autoresearch GitHub Skill Exercises

This doc maps three GitHub-style skill drills to karpathy/autoresearch so we can delegate them to three subagents as requested.

## Skill A – Experiment Setup & Branch Hygiene
- Follow `program.md` setup steps end to end: branch creation (`autoresearch/<tag>`), data verification, initializing `results.tsv`.
- Deliverable: concise checklist (`docs/autoresearch/setup-checklist.md`) the team can reuse before every autonomous run, plus confirmation of repo readiness (branch name, data path status).

## Skill B – Experiment Planning in `train.py`
- Read `train.py` and sketch a high-leverage experimental change set (e.g., optimizer tweak, depth/width change, attention pattern).
- Deliverable: `docs/autoresearch/experiment-ideas.md` capturing at least two experiment proposals with rationale, expected impact on `val_bpb`, and how to guard against crashes.

## Skill C – Results Logging Automation
- Implement a helper that parses `run.log` for `val_bpb` and `peak_vram_mb`, then appends/updates `results.tsv` without manual editing.
- Deliverable: new script `scripts/autoresearch-log-helper.py` plus mini README notes explaining usage, assumptions, and failure handling.

## Skill D – Offline Run Simulation (no GPU)
- Simulate 20 experimental runs by drafting branch tags, planned edits, and placeholder TSV entries so we can practice GitHub hygiene without executing training.
- Deliverable: `docs/autoresearch/offline-run-plan.md` describing each run (tag, idea, expected risks, fake val_bpb/memory placeholders) plus instructions for how to log them with the helper once real hardware is available.

Each subagent will own one of these skills so we can practice discrete GitHub workflows (setup, code/change planning, results recording) anchored in the autoresearch repo.
