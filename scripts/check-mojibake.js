#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const targetDirs = ["src", "app", "components"];
const excludedSuffixes = [path.join("utils", "i18n.ts")];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mdx"]);

const patterns = [
  { label: "umlaut-prefix", needle: "\u00C3" },
  { label: "punctuation-prefix", needle: "\u00E2" },
  { label: "emoji-prefix", needle: "\u00F0\u0178" },
  { label: "middle-dot-sequence", needle: "\u00C2\u00B7" },
  { label: "em-dash-sequence", needle: "\u00E2\u20AC\u201D" },
  { label: "en-dash-sequence", needle: "\u00E2\u20AC\u201C" },
  { label: "ellipsis-sequence", needle: "\u00E2\u20AC\u00A6" },
  { label: "box-drawing-sequence", needle: "\u00E2\u20AC" },
];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isExcluded(relativePath) {
  const normalized = toPosix(relativePath);
  return excludedSuffixes.some((suffix) => normalized.endsWith(toPosix(suffix)));
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.has(ext);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build" || entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFile(filePath) {
  const relativePath = path.relative(repoRoot, filePath);
  if (isExcluded(relativePath) || !shouldScanFile(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("\u0000")) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    const markers = patterns
      .filter((pattern) => line.includes(pattern.needle))
      .map((pattern) => pattern.label);

    if (markers.length > 0) {
      findings.push({
        line: index + 1,
        markers: [...new Set(markers)],
        snippet: line.trim(),
      });
    }
  });

  return findings;
}

function main() {
  const files = targetDirs.flatMap((dir) => walk(path.join(repoRoot, dir)));
  const findings = [];

  for (const filePath of files) {
    findings.push(
      ...scanFile(filePath).map((finding) => ({
        file: path.relative(repoRoot, filePath),
        ...finding,
      }))
    );
  }

  if (findings.length === 0) {
    console.log("No Mojibake markers found in UI-facing files.");
    return;
  }

  console.error("Mojibake markers found:");
  for (const finding of findings) {
    console.error(`${toPosix(finding.file)}:${finding.line} [${finding.markers.join(", ")}] ${finding.snippet}`);
  }

  process.exitCode = 1;
}

main();
