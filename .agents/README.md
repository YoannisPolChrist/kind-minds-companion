# Agent File Locks

This project uses repo-local lock files under `.agents/locks/` so parallel agents do not edit the same file at the same time.

Commands:

```bash
npm run agent:claim -- --agent codex-ui --reason "settings form" app/settings.tsx
npm run agent:status -- app/settings.tsx
npm run agent:list
npm run agent:release -- --agent codex-ui app/settings.tsx
```

Delete protection:

```bash
npm run agent:delete -- --agent codex-ui app/old-file.ts
```

Behavior:

- Lock acquisition is atomic. If another agent already holds the file, the claim fails immediately.
- Locks are stored outside source folders and ignored by Git.
- The delete command refuses to remove unlocked files or files locked by another agent.
- New files can also be claimed before they exist by locking the target path first.
