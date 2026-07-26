import { readFile } from "node:fs/promises";

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
const { execFileSync } = await import("node:child_process");
try {
  const matches = execFileSync("rg", ["-n", "--fixed-strings", "--", "--no-sandbox", ...sourceFiles], { encoding: "utf8" });
  if (matches.trim()) failures.push(`production source contains --no-sandbox:\n${matches}`);
} catch (error) {
  if (error.status !== 1) failures.push("could not scan production source for forbidden sandbox flags");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Release policy validation passed.");
}
