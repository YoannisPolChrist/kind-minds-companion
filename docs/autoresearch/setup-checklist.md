# Autoresearch Setup Checklist

Follow these steps before letting an agent touch `train.py`.

1. **Pick a run tag**
   - Use lowercase yyyymmdd-style (e.g., `mar19a`).
   - Confirm no branch named `autoresearch/<tag>` exists yet: `git branch --list "autoresearch/<tag>"`.

2. **Create the experiment branch**
   - From an up-to-date `main`: `git checkout main && git pull`.
   - Create the branch: `git checkout -b autoresearch/<tag>`.
   - Record the branch/tag in your run log.

3. **Sync dependencies**
   - Ensure [uv](https://docs.astral.sh/uv) is installed.
   - From repo root run `uv sync` to install/update the virtual environment.

4. **Prepare data / tokenizer**
   - Run `uv run prepare.py` once per machine or when switching datasets.
   - Verify cache artifacts exist under `~/.cache/autoresearch/` (`train.bin`, `val.bin`, `tokenizer.model`, etc.).

5. **Initialize results.tsv**
   - Create `results.tsv` (git-ignored) with header:  
     `commit\tval_bpb\tmemory_gb\tstatus\tdescription`
   - Leave it staged? No — keep untracked per `program.md`.

6. **Pre-flight sanity checks**
   - Confirm `uv run train.py` launches and respects the 5-minute budget (Ctrl+C afterwards if only testing).
   - Ensure `run.log` is ignored or cleared before each experiment.
   - Note GPU availability (nvidia-smi) and VRAM headroom.

7. **Ready signal**
   - Share run tag, branch name, and cache status with whoever operates the agent.
   - Only after all boxes are checked should the autonomous experiment loop begin.
