import { readdir, readFile } from "node:fs/promises";

const requiredFiles = [
  "LICENSE",
  "NOTICE",
  "SECURITY.md",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "SUPPORT.md",
  "docs/THREAT_MODEL.md",
  "docs/RELEASING.md",
];

const failures = [];
for (const path of requiredFiles) {
  try {
    const content = await readFile(path, "utf8");
    if (!content.trim()) failures.push(`${path} is empty`);
  } catch {
    failures.push(`${path} is missing`);
  }
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.license === "UNLICENSED") failures.push("package license is UNLICENSED");
if (!String(packageJson.description).toLowerCase().includes("unofficial")) {
  failures.push("package description must identify the app as unofficial");
}
const targets = packageJson.build?.linux?.target ?? [];
if (targets.includes("AppImage")) failures.push("AppImage must remain outside the default production targets");

const sourceFiles = ["desktop", "src"];

async function findForbiddenSandboxFlags(path) {
  const matches = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      matches.push(...await findForbiddenSandboxFlags(childPath));
    } else if (entry.isFile()) {
      const lines = (await readFile(childPath, "utf8")).split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        if (line.includes("--no-sandbox")) {
          matches.push(`${childPath}:${index + 1}:${line}`);
        }
      }
    }
  }
  return matches;
}

try {
  const matches = (await Promise.all(sourceFiles.map(findForbiddenSandboxFlags))).flat();
  if (matches.length) failures.push(`production source contains --no-sandbox:\n${matches.join("\n")}`);
} catch {
  failures.push("could not scan production source for forbidden sandbox flags");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Release policy validation passed.");
}
