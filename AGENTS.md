# Multi-Agent Guardrails

This repository may be edited by multiple agents at the same time.

Before changing, renaming, or deleting any file, claim it first:

```bash
npm run agent:claim -- --agent <agent-id> --reason "<task>" <file ...>
```

Rules:

- Only the agent holding the lock may modify a claimed file.
- Check active locks before touching shared areas: `npm run agent:list`
- Check an individual file before editing: `npm run agent:status -- <file>`
- Release locks when the task is finished: `npm run agent:release -- --agent <agent-id> <file ...>`
- Never delete a file because it "looks wrong" or "seems unused" without checking references and lock ownership first.
- Use the guarded delete command instead of removing files directly: `npm run agent:delete -- --agent <agent-id> <file ...>`

If a lock already exists, do not override it silently. Coordinate first or pick another file.
