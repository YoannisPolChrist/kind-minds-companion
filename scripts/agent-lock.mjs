#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const locksDir = path.join(repoRoot, ".agents", "locks");
const isWindows = process.platform === "win32";

async function main() {
  const [command, ...rawArgs] = process.argv.slice(2);

  switch (command) {
    case "claim":
      await claimLocks(rawArgs);
      break;
    case "release":
      await releaseLocks(rawArgs);
      break;
    case "status":
      await printStatus(rawArgs);
      break;
    case "list":
      await listLocks();
      break;
    case "delete":
      await deleteFiles(rawArgs);
      break;
    default:
      printHelp();
      process.exit(command ? 1 : 0);
  }
}

function printHelp() {
  console.log(`Usage:
  npm run agent:claim -- --agent <agent-id> --reason "<task>" <file ...>
  npm run agent:release -- --agent <agent-id> <file ...>
  npm run agent:status -- <file ...>
  npm run agent:list
  npm run agent:delete -- --agent <agent-id> <file ...>`);
}

function parseOptions(args) {
  const options = {
    agent: "",
    reason: "",
    force: false,
    files: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === "--agent") {
      options.agent = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (current === "--reason") {
      options.reason = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (current === "--force") {
      options.force = true;
      continue;
    }

    if (current.startsWith("--")) {
      throw new Error(`Unknown option: ${current}`);
    }

    options.files.push(current);
  }

  return options;
}

async function claimLocks(args) {
  const options = parseOptions(args);
  ensureAgent(options.agent);
  const files = normalizeTargets(options.files);
  const claimed = [];

  await ensureLocksDir();

  try {
    for (const file of files) {
      const lock = {
        agent: options.agent,
        reason: options.reason || "unspecified task",
        relativePath: file.relativePath,
        createdAt: new Date().toISOString(),
      };

      await fs.writeFile(file.lockPath, `${JSON.stringify(lock, null, 2)}\n`, {
        flag: "wx",
      });
      claimed.push(file);
    }
  } catch (error) {
    await rollbackClaim(claimed);

    if (error && error.code === "EEXIST") {
      const conflict = await findConflict(files);
      throw new Error(
        `Lock already held for ${conflict.relativePath} by ${conflict.agent} (${conflict.reason}) since ${conflict.createdAt}.`
      );
    }

    throw error;
  }

  console.log(`Locked ${files.length} file(s) for ${options.agent}.`);
  for (const file of files) {
    console.log(`  ${file.relativePath}`);
  }
}

async function releaseLocks(args) {
  const options = parseOptions(args);
  ensureAgent(options.agent);
  const files = normalizeTargets(options.files);

  for (const file of files) {
    const existing = await readLock(file.lockPath);

    if (!existing) {
      throw new Error(`No lock exists for ${file.relativePath}.`);
    }

    if (existing.agent !== options.agent && !options.force) {
      throw new Error(
        `Cannot release ${file.relativePath}: lock belongs to ${existing.agent}.`
      );
    }

    await fs.unlink(file.lockPath);
  }

  console.log(`Released ${files.length} lock(s) for ${options.agent}.`);
}

async function printStatus(args) {
  const options = parseOptions(args);
  const files = normalizeTargets(options.files);

  for (const file of files) {
    const existing = await readLock(file.lockPath);

    if (!existing) {
      console.log(`${file.relativePath}: free`);
      continue;
    }

    console.log(
      `${file.relativePath}: locked by ${existing.agent} (${existing.reason}) since ${existing.createdAt}`
    );
  }
}

async function listLocks() {
  await ensureLocksDir();
  const entries = await fs.readdir(locksDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  if (files.length === 0) {
    console.log("No active file locks.");
    return;
  }

  const locks = [];
  for (const entry of files) {
    const lock = await readLock(path.join(locksDir, entry.name));
    if (lock) {
      locks.push(lock);
    }
  }

  locks.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  for (const lock of locks) {
    console.log(
      `${lock.relativePath} | ${lock.agent} | ${lock.reason} | ${lock.createdAt}`
    );
  }
}

async function deleteFiles(args) {
  const options = parseOptions(args);
  ensureAgent(options.agent);
  const files = normalizeTargets(options.files);

  for (const file of files) {
    const existing = await readLock(file.lockPath);

    if (!existing) {
      throw new Error(
        `Refusing to delete ${file.relativePath}: file is not locked. Claim it first.`
      );
    }

    if (existing.agent !== options.agent) {
      throw new Error(
        `Refusing to delete ${file.relativePath}: lock belongs to ${existing.agent}.`
      );
    }
  }

  for (const file of files) {
    await fs.rm(file.absolutePath, { force: false });
    await fs.unlink(file.lockPath);
    console.log(`Deleted ${file.relativePath}`);
  }
}

function ensureAgent(agent) {
  if (!agent) {
    throw new Error("Missing --agent <agent-id>.");
  }
}

function normalizeTargets(files) {
  if (!files.length) {
    throw new Error("Specify at least one file.");
  }

  const normalized = [];
  const seen = new Set();

  for (const file of files) {
    const absolutePath = path.resolve(repoRoot, file);
    const relativePathRaw = path.relative(repoRoot, absolutePath);

    if (!relativePathRaw || relativePathRaw.startsWith("..") || path.isAbsolute(relativePathRaw)) {
      throw new Error(`Path must stay inside the repository: ${file}`);
    }

    const relativePath = relativePathRaw.split(path.sep).join("/");
    const key = isWindows ? relativePath.toLowerCase() : relativePath;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      absolutePath,
      relativePath,
      lockPath: path.join(locksDir, `${encodeLockName(key)}.json`),
    });
  }

  normalized.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return normalized;
}

async function rollbackClaim(files) {
  await Promise.all(
    files.map((file) =>
      fs.unlink(file.lockPath).catch((error) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      })
    )
  );
}

async function findConflict(files) {
  for (const file of files) {
    const existing = await readLock(file.lockPath);
    if (existing) {
      return existing;
    }
  }

  throw new Error("Unable to identify conflicting lock.");
}

async function readLock(lockPath) {
  try {
    const content = await fs.readFile(lockPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function ensureLocksDir() {
  await fs.mkdir(locksDir, { recursive: true });
}

function encodeLockName(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
