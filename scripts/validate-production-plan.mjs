import { access, readFile } from "node:fs/promises";

const planPath = "docs/production-readiness/plan.json";
const statuses = new Set(["planned", "ready", "in_progress", "in_review", "blocked", "complete"]);
const active = new Set(["ready", "in_progress", "in_review", "complete"]);
const assigned = new Set(["in_progress", "in_review", "complete"]);
const failures = [];
const fail = (message) => failures.push(message);
const requireArray = (value, label) => {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
};
const localReference = (value) =>
  typeof value === "string" && !value.includes("://") && !value.includes("*") && !value.startsWith("#");

let plan;
try {
  plan = JSON.parse(await readFile(planPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${planPath}: ${error.message}`);
  process.exit(1);
}

if (plan.schemaVersion !== 1) fail("schemaVersion must be 1");
if (plan.canonicalStatusSource !== planPath) fail(`canonicalStatusSource must be ${planPath}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.updated ?? "")) fail("updated must use YYYY-MM-DD");
requireArray(plan.principles, "principles");

const phases = Array.isArray(plan.phases) ? plan.phases : [];
const items = Array.isArray(plan.workItems) ? plan.workItems : [];
if (phases.length === 0) fail("phases must be a non-empty array");
if (items.length === 0) fail("workItems must be a non-empty array");

const phaseById = new Map();
const phaseOrders = new Set();
for (const phase of phases) {
  if (!/^PH\d+$/.test(phase.id ?? "")) fail(`invalid phase id: ${phase.id}`);
  if (phaseById.has(phase.id)) fail(`duplicate phase id: ${phase.id}`);
  if (!Number.isInteger(phase.order) || phase.order < 0) fail(`${phase.id}.order must be non-negative`);
  if (phaseOrders.has(phase.order)) fail(`duplicate phase order: ${phase.order}`);
  if (!String(phase.name ?? "").trim()) fail(`${phase.id}.name is required`);
  if (!String(phase.objective ?? "").trim()) fail(`${phase.id}.objective is required`);
  if (!String(phase.exitCriteria ?? "").trim()) fail(`${phase.id}.exitCriteria is required`);
  phaseById.set(phase.id, phase);
  phaseOrders.add(phase.order);
}
for (const [index, order] of [...phaseOrders].sort((a, b) => a - b).entries()) {
  if (order !== index) fail(`phase orders must be contiguous from zero; found ${order} at index ${index}`);
}

const itemById = new Map();
for (const item of items) {
  const id = item.id ?? "<missing-id>";
  if (!/^[A-Z]{2,4}-\d{3}$/.test(id)) fail(`invalid work-item id: ${id}`);
  if (itemById.has(id)) fail(`duplicate work-item id: ${id}`);
  if (!phaseById.has(item.phase)) fail(`${id} uses unknown phase ${item.phase}`);
  if (!String(item.title ?? "").trim()) fail(`${id}.title is required`);
  if (!statuses.has(item.status)) fail(`${id} has invalid status ${item.status}`);
  if (typeof item.releaseBlocker !== "boolean") fail(`${id}.releaseBlocker must be boolean`);
  if (!String(item.owner ?? "").trim()) fail(`${id}.owner is required`);
  if (!Array.isArray(item.dependsOn)) fail(`${id}.dependsOn must be an array`);
  requireArray(item.controls, `${id}.controls`);
  requireArray(item.acceptanceCriteria, `${id}.acceptanceCriteria`);
  requireArray(item.evidenceRequired, `${id}.evidenceRequired`);
  requireArray(item.references, `${id}.references`);
  if (!Array.isArray(item.evidence)) fail(`${id}.evidence must be an array`);

  if (assigned.has(item.status) && ["unassigned", "maintainers"].includes(item.owner)) {
    fail(`${id} cannot be ${item.status} without one named accountable owner`);
  }
  if (item.status === "blocked" && !String(item.blocker ?? "").trim()) {
    fail(`${id} is blocked without a blocker explanation`);
  }
  if (item.status === "complete") {
    if (!String(item.reviewer ?? "").trim()) fail(`${id} is complete without an independent reviewer`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.completedAt ?? "")) {
      fail(`${id} is complete without a YYYY-MM-DD completedAt value`);
    }
    requireArray(item.evidence, `${id}.evidence`);
  } else if (item.completedAt) {
    fail(`${id} has completedAt while status is ${item.status}`);
  }
  itemById.set(id, item);
}

for (const item of items) {
  for (const dependency of item.dependsOn ?? []) {
    const target = itemById.get(dependency);
    if (!target) {
      fail(`${item.id} has unknown dependency ${dependency}`);
      continue;
    }
    const itemOrder = phaseById.get(item.phase)?.order;
    const dependencyOrder = phaseById.get(target.phase)?.order;
    if (dependencyOrder > itemOrder) fail(`${item.id} depends on later-phase item ${dependency}`);
    if (active.has(item.status) && target.status !== "complete") {
      fail(`${item.id} is ${item.status} while dependency ${dependency} is ${target.status}`);
    }
  }
}

const visiting = new Set();
const visited = new Set();
function visit(item) {
  if (visiting.has(item.id)) {
    fail(`dependency cycle includes ${item.id}`);
    return;
  }
  if (visited.has(item.id)) return;
  visiting.add(item.id);
  for (const dependency of item.dependsOn ?? []) {
    const target = itemById.get(dependency);
    if (target) visit(target);
  }
  visiting.delete(item.id);
  visited.add(item.id);
}
for (const item of items) visit(item);

for (const item of items) {
  if (!active.has(item.status)) continue;
  const order = phaseById.get(item.phase)?.order;
  const earlier = items.filter((candidate) =>
    candidate.releaseBlocker &&
    phaseById.get(candidate.phase)?.order < order &&
    candidate.status !== "complete"
  );
  if (earlier.length) {
    fail(`${item.id} is ${item.status} ahead of earlier blockers: ${earlier.map(({ id }) => id).join(", ")}`);
  }
}

for (const item of items) {
  const paths = [
    ...(item.references ?? []).filter(localReference),
    ...(item.status === "complete" ? (item.evidence ?? []).filter(localReference) : []),
  ];
  for (const path of paths) {
    try {
      await access(path);
    } catch {
      fail(`${item.id} references missing local path ${path}`);
    }
  }
}

try {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const stable = /^\d+\.\d+\.\d+$/.test(packageJson.version ?? "");
  const blockers = items.filter((item) => item.releaseBlocker && item.status !== "complete");
  if (stable && blockers.length) {
    fail(`package version ${packageJson.version} is stable while blockers remain: ${blockers.map(({ id }) => id).join(", ")}`);
  }
} catch (error) {
  fail(`could not validate package version: ${error.message}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const counts = Object.fromEntries(
  [...statuses].map((status) => [status, items.filter((item) => item.status === status).length]),
);
const openBlockers = items.filter((item) => item.releaseBlocker && item.status !== "complete").length;
console.log(`Production-readiness plan validation passed: ${items.length} items, ${openBlockers} open release blockers.`);
console.log(`Status: ${Object.entries(counts).map(([status, count]) => `${status}=${count}`).join(", ")}`);
