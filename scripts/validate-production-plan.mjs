import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path, { join } from "node:path";
import { tmpdir } from "node:os";

const planPath = "docs/production-readiness/plan.json";
const statuses = new Set(["planned", "ready", "in_progress", "in_review", "blocked", "complete"]);
const active = new Set(["ready", "in_progress", "in_review", "complete"]);
const assigned = new Set(["in_progress", "in_review", "complete"]);
const legalTransitions = {
  planned: new Set(["planned", "ready", "blocked"]),
  ready: new Set(["ready", "in_progress", "blocked"]),
  in_progress: new Set(["in_progress", "in_review", "blocked"]),
  in_review: new Set(["in_review", "in_progress", "complete", "blocked"]),
  blocked: new Set(["blocked", "ready", "in_progress"]),
  complete: new Set(["complete"]),
};
const fullSha = /^[0-9a-f]{40}$/;
const sha256 = /^[0-9a-f]{64}$/;
const repositoryUrlBase = "https://github.com/itecob/bridgepane-linux";
const immutableUrl = /^https:\/\/github\.com\/itecob\/bridgepane-linux\/(?:commit\/[0-9a-f]{40}|actions\/runs\/\d+(?:\/job\/\d+)?|pull\/\d+#(?:issuecomment|pullrequestreview)-\d+)$/;
const commitUrl = /^https:\/\/github\.com\/itecob\/bridgepane-linux\/commit\/([0-9a-f]{40})$/;
const issueUrl = /^https:\/\/github\.com\/itecob\/bridgepane-linux\/issues\/\d+$/;
const bootstrapBase = "350c48f042da85f54af058aafb03c06a189a55b2";
const insideFixtureTree = process.cwd().startsWith(tmpdir())
  && process.cwd().split(path.sep).some((part) => part.startsWith("bridgepane-plan-fixtures-"));
const fixtureMode = process.env.PRODUCTION_PLAN_FIXTURE_MODE === "1"
  && path.basename(process.cwd()).startsWith("bridgepane-plan-fixtures-")
  && insideFixtureTree;
const syntheticGitMode = process.env.PRODUCTION_PLAN_SYNTHETIC_GIT_MODE === "1" && insideFixtureTree;
const failures = [];
const fail = (message) => failures.push(message);
const requireArray = (value, label) => {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array`);
};
const localReference = (value) => {
  if (typeof value !== "string" || !value || value.includes("://") || value.includes("*") || value.startsWith("#")) return false;
  if (path.isAbsolute(value) || value.includes("\\") || value.includes("\0")) return false;
  const normalized = path.posix.normalize(value);
  return normalized === value && normalized !== ".." && !normalized.startsWith("../");
};

const git = (args, options = {}) => execFileSync("git", args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  ...options,
}).trim();

const resolveCommit = (revision, label) => {
  try {
    const resolved = git(["rev-parse", "--verify", `${revision}^{commit}`]);
    if (!fullSha.test(resolved)) throw new Error("not a full SHA");
    return resolved;
  } catch {
    throw new Error(`Could not resolve ${label} ${revision}`);
  }
};

const readEvent = async () => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GitHub Actions requires GITHUB_EVENT_PATH");
  try {
    return JSON.parse(await readFile(eventPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not parse GitHub event payload: ${error.message}`);
  }
};

async function selectBase() {
  if (process.env.PRODUCTION_PLAN_BASE_FILE) {
    if (!fixtureMode) throw new Error("PRODUCTION_PLAN_BASE_FILE is restricted to isolated fixtures");
    return { mode: "fixture-file", source: process.env.PRODUCTION_PLAN_BASE_FILE, head: "fixture", revision: null };
  }
  if (fixtureMode) {
    return { mode: "fixture-unbased", source: "isolated-self-test", head: "fixture", revision: null };
  }
  const head = resolveCommit("HEAD", "HEAD");
  if (process.env.PRODUCTION_PLAN_BASE_REF) {
    if (process.env.GITHUB_ACTIONS === "true") {
      throw new Error("PRODUCTION_PLAN_BASE_REF is prohibited in GitHub Actions");
    }
    if (!fullSha.test(process.env.PRODUCTION_PLAN_BASE_REF)) {
      throw new Error("PRODUCTION_PLAN_BASE_REF must be a full 40-character commit SHA");
    }
    return {
      mode: "explicit-diagnostic",
      source: "PRODUCTION_PLAN_BASE_REF",
      head,
      revision: resolveCommit(process.env.PRODUCTION_PLAN_BASE_REF, "explicit production-plan base"),
    };
  }
  if (process.env.GITHUB_ACTIONS === "true") {
    const event = await readEvent();
    const eventName = process.env.GITHUB_EVENT_NAME;
    const parents = git(["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/).slice(1);
    if (eventName === "pull_request") {
      const eventBase = event?.pull_request?.base?.sha;
      const eventHead = event?.pull_request?.head?.sha;
      if (!fullSha.test(eventBase ?? "") || !fullSha.test(eventHead ?? "")) {
        throw new Error("Pull-request event requires full base and head SHAs");
      }
      if (parents.length === 0) {
        throw new Error("Pull-request base cannot be resolved from checkout history; fetch-depth must be at least 2");
      }
      if (parents.length !== 2) throw new Error(`Pull-request verification requires a two-parent merge checkout; found ${parents.length}`);
      const resolvedBase = resolveCommit(eventBase, "pull-request event base");
      const resolvedHead = resolveCommit(eventHead, "pull-request event head");
      if (parents[0] !== resolvedBase || parents[1] !== resolvedHead) {
        throw new Error("Pull-request event SHAs do not match merge checkout parents");
      }
      return { mode: "pull-request-merge", source: "event.pull_request.base.sha", head, revision: resolvedBase };
    }
    if (eventName === "push" && process.env.GITHUB_REF === "refs/heads/main") {
      const before = event?.before;
      if (!fullSha.test(before ?? "") || /^0{40}$/.test(before)) {
        throw new Error("Main push event requires a full non-zero before SHA");
      }
      const resolvedBefore = resolveCommit(before, "push event before");
      if (parents.length < 1 || parents[0] !== resolvedBefore) {
        throw new Error("Main push before SHA does not match HEAD first parent");
      }
      return { mode: "main-push", source: "event.before", head, revision: resolvedBefore };
    }
    throw new Error(`Unsupported GitHub Actions event for plan validation: ${String(eventName)}`);
  }
  const mainRef = "refs/remotes/origin/main";
  resolveCommit(mainRef, "local tracking ref");
  let mergeBases;
  try {
    mergeBases = git(["merge-base", "--all", "HEAD", mainRef]).split(/\s+/).filter(Boolean);
  } catch {
    throw new Error(`Could not compute merge base of HEAD and ${mainRef}`);
  }
  if (mergeBases.length !== 1 || !fullSha.test(mergeBases[0])) {
    throw new Error(`Expected exactly one merge base of HEAD and ${mainRef}; found ${mergeBases.length}`);
  }
  let revision = resolveCommit(mergeBases[0], "local merge base");
  let source = mainRef;
  if (revision === head) {
    const parents = git(["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/).slice(1);
    if (parents.length < 1) throw new Error("Cannot select a base for a root commit");
    revision = resolveCommit(parents[0], "local main first parent");
    source = "HEAD^1";
  }
  return { mode: "local-merge-base", source, head, revision };
}

let plan;
try {
  plan = JSON.parse(await readFile(planPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${planPath}: ${error.message}`);
  process.exit(1);
}

let basePlan = null;
let selection;
try {
  selection = await selectBase();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const baseRevision = selection.revision;
console.log(`Production-plan base: mode=${selection.mode} source=${selection.source} head=${selection.head} base=${baseRevision ?? "fixture-file"}`);

if (selection.mode === "fixture-file") {
  try {
    basePlan = JSON.parse(await readFile(process.env.PRODUCTION_PLAN_BASE_FILE, "utf8"));
  } catch (error) {
    console.error(`Could not load production-plan base file: ${error.message}`);
    process.exit(1);
  }
} else if (fixtureMode && !baseRevision) {
  basePlan = null;
} else {
  let baseText = null;
  try {
    baseText = execFileSync("git", ["show", `${baseRevision}:${planPath}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (baseRevision !== bootstrapBase) {
      console.error(`Could not load mandatory production-plan base ${baseRevision}:${planPath}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Production-plan bootstrap exception: ${planPath} is absent from exact base ${bootstrapBase}.`);
  }
  if (baseText !== null) {
    try {
      basePlan = JSON.parse(baseText);
    } catch (error) {
      console.error(`Could not parse production-plan base ${baseRevision}:${planPath}: ${error.message}`);
      process.exit(1);
    }
  }
}


if (plan.schemaVersion !== 2) fail("schemaVersion must be 2");
if (plan.canonicalStatusSource !== planPath) fail(`canonicalStatusSource must be ${planPath}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.updated ?? "")) fail("updated must use YYYY-MM-DD");
requireArray(plan.principles, "principles");
if (plan.authorityModel?.soleHumanAuthority !== "itecob") fail("authorityModel must name itecob as sole human authority");
if (JSON.stringify(plan.authorityModel?.requiredAgentRoles) !== JSON.stringify(["architect", "implementer", "verifier"])) fail("authorityModel.requiredAgentRoles must be exactly architect, implementer, verifier");
if (plan.authorityModel?.agentReviewsAreHumanApproval !== false) fail("agent reviews must not be represented as human approval");
if (plan.authorityModel?.ownerDecisionRequired !== true) fail("owner decisions must remain required");
if (plan.authorityModel?.independentHumanReviewRequired !== false) fail("authorityModel must not claim a second human is required");

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

async function validateBoundDocument(document, label) {
  if (!document || typeof document !== "object") {
    fail(`${label} is missing`);
    return;
  }
  if (!String(document.id ?? "").trim()) fail(`${label}.id is required`);
  if (!fullSha.test(document.revision ?? "")) fail(`${label}.revision must be a full commit SHA`);
  if (!localReference(document.path)) fail(`${label}.path is unsafe`);
  if (!sha256.test(document.sha256 ?? "")) fail(`${label}.sha256 is invalid`);
  if (!localReference(document.path) || !sha256.test(document.sha256 ?? "")) return;
  try {
    const working = await readFile(document.path);
    const actual = createHash("sha256").update(working).digest("hex");
    if (actual !== document.sha256) fail(`${label} working-tree digest does not match`);
  } catch {
    fail(`${label}.path cannot be read`);
  }
  if (!fixtureMode && !syntheticGitMode && fullSha.test(document.revision ?? "")) {
    try {
      const historical = execFileSync("git", ["show", `${document.revision}:${document.path}`], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const actual = createHash("sha256").update(historical).digest("hex");
      if (actual !== document.sha256) fail(`${label} revision digest does not match`);
    } catch {
      fail(`${label} cannot be read at declared revision`);
    }
  }
}

function validateVerificationReview(review, label) {
  if (!review || typeof review !== "object") {
    fail(`${label} must be an object`);
    return;
  }
  if (review.role !== "verifier-agent") fail(`${label}.role must be verifier-agent`);
  if (!["accepted", "accepted_with_compensating_controls"].includes(review.decision)) {
    fail(`${label}.decision must be accepted`);
  }
  if (!fullSha.test(review.reviewedCommit ?? "")) fail(`${label}.reviewedCommit must be a full commit SHA`);
  if (!immutableUrl.test(review.url ?? "")) fail(`${label}.url must be immutable evidence from ${repositoryUrlBase}`);
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

  if (active.has(item.status)) {
    for (const role of ["architecture", "verification"]) {
      const pair = item.protocol?.[role];
      if (!pair?.request || !pair?.response) {
        fail(`${id} is active without ${role} request and response`);
        continue;
      }
      await validateBoundDocument(pair.request, `${id}.${role}.request`);
      await validateBoundDocument(pair.response, `${id}.${role}.response`);
      if (pair.response.requestRevision !== pair.request.revision) fail(`${id} ${role} response is bound to a stale request`);
      if (pair.response.decision !== "accepted") fail(`${id} ${role} response is not accepted`);
    }
    requireArray(item.verificationReviews, `${id}.verificationReviews`);
    for (const [index, review] of (item.verificationReviews ?? []).entries()) {
      validateVerificationReview(review, `${id}.verificationReviews[${index}]`);
    }
    requireArray(item.independenceLimitations, `${id}.independenceLimitations`);
    if (!Array.isArray(item.residualRisks)) fail(`${id}.residualRisks must be an array`);
    const approval = item.authorityApproval;
    if (approval?.owner !== "itecob" || approval?.decision !== "accepted") fail(`${id} lacks owner authority acceptance`);
    if (!fullSha.test(approval?.reviewedCommit ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(approval?.date ?? "") || !immutableUrl.test(approval?.url ?? "")) fail(`${id} owner authority is not immutably bound`);
  }


  if (assigned.has(item.status) && ["unassigned", "maintainers"].includes(item.owner)) {
    fail(`${id} cannot be ${item.status} without one named accountable owner`);
  }
  if (item.status === "blocked" && !String(item.blocker ?? "").trim()) {
    fail(`${id} is blocked without a blocker explanation`);
  }
  if (item.status === "complete") {
    if (!String(item.reviewer ?? "").trim() || item.reviewer === item.owner) fail(`${id} is complete without a separate verifier role`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.completedAt ?? "")) {
      fail(`${id} is complete without a YYYY-MM-DD completedAt value`);
    }
    if (!fullSha.test(item.sourceCommit ?? "")) fail(`${id} is complete without an exact source commit`);
    requireArray(item.evidence, `${id}.evidence`);
    const sourceEvidence = (item.evidence ?? []).some((entry) => {
      const match = typeof entry === "string" ? entry.match(commitUrl) : null;
      return match?.[1] === item.sourceCommit;
    });
    if (!sourceEvidence) fail(`${id} is complete without exact source-commit evidence`);
    const matchingReview = (item.verificationReviews ?? []).some((review) =>
      review?.reviewedCommit === item.sourceCommit && immutableUrl.test(review?.url ?? "")
    );
    if (!matchingReview) fail(`${id} completion is not bound to a verifier review of sourceCommit`);
    if (item.authorityApproval?.reviewedCommit !== item.sourceCommit
      || !immutableUrl.test(item.authorityApproval?.url ?? "")) {
      fail(`${id} completion is not bound to owner approval of sourceCommit`);
    }
  } else {
    if (item.completedAt) fail(`${id} has completedAt while status is ${item.status}`);
    if (item.sourceCommit) fail(`${id} has sourceCommit while status is ${item.status}`);
  }
  itemById.set(id, item);
}

for (const item of items) {
  for (const dependency of item.dependsOn ?? []) {
    if (dependency === item.id) fail(`${item.id} depends on itself`);
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

if (basePlan) {
  const baseItems = new Map((basePlan.workItems ?? []).map((item) => [item.id, item]));
  for (const item of items) {
    const base = baseItems.get(item.id);
    if (!base) continue;
    if (!legalTransitions[base.status]?.has(item.status)) fail(`${item.id} has illegal transition ${base.status} -> ${item.status}`);
    if (base.releaseBlocker && !item.releaseBlocker) fail(`${item.id} weakens releaseBlocker`);
    for (const field of ["acceptanceCriteria", "evidenceRequired"]) {
      for (const value of base[field] ?? []) {
        if (!(item[field] ?? []).includes(value)) fail(`${item.id} weakens ${field}`);
      }
    }
    if (active.has(base.status)) {
      if (JSON.stringify(base.protocol) !== JSON.stringify(item.protocol)) {
        fail(`${item.id} mutates accepted protocol after activation`);
      }
      for (const field of ["verificationReviews", "independenceLimitations", "residualRisks"]) {
        for (const value of base[field] ?? []) {
          if (!(item[field] ?? []).some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))) {
            fail(`${item.id} removes accepted ${field} after activation`);
          }
        }
      }
      if (item.status !== "complete"
        && JSON.stringify(base.authorityApproval) !== JSON.stringify(item.authorityApproval)) {
        fail(`${item.id} mutates owner authority approval before completion`);
      }
    }
  }
}

const gov2Complete = itemById.get("GOV-002")?.status === "complete";
if (gov2Complete) {
  const seenIssues = new Set();
  for (const item of items) {
    const issue = item.issue;
    if (!issueUrl.test(issue ?? "")) fail(`${item.id} lacks exactly one repository tracking issue`);
    else if (seenIssues.has(issue)) fail(`${item.id} shares tracking issue ${issue}`);
    else seenIssues.add(issue);
  }
}

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
  for (const reference of item.references ?? []) {
    if (!localReference(reference)) {
      fail(`${item.id} has unsafe local reference ${String(reference)}`);
      continue;
    }
    if (!active.has(item.status)) continue;
    try {
      await access(reference);
    } catch {
      fail(`${item.id} references missing local path ${reference}`);
    }
  }
  for (const evidence of item.evidence ?? []) {
    if (immutableUrl.test(evidence ?? "")) continue;
    if (!localReference(evidence)) {
      fail(`${item.id} has unsafe or mutable evidence ${String(evidence)}`);
      continue;
    }
    if (item.status !== "complete") continue;
    try {
      await access(evidence);
    } catch {
      fail(`${item.id} references missing local path ${evidence}`);
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
function validateWorkflowFixture(name, text, { pullRequest = false, release = false } = {}) {
  const problems = [];
  for (const match of text.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)) {
    if (!/^[0-9a-f]{40}$/.test(match[1])) problems.push(`${name} uses mutable Action reference ${match[1]}`);
  }
  if (pullRequest && /permissions:[\s\S]*?(?:contents:\s*write|id-token:\s*write|attestations:\s*write)/.test(text)) {
    problems.push(`${name} grants privileged capability to pull requests`);
  }
  if (release && !/environment:\s*stable-release/.test(text)) problems.push(`${name} release job lacks protected environment`);
  return problems;
}

async function runSelfTests() {
  const root = await mkdtemp(join(tmpdir(), "bridgepane-plan-fixtures-"));
  const scriptTarget = join(root, "scripts", "validate-production-plan.mjs");
  const planTarget = join(root, planPath);
  const packageTarget = join(root, "package.json");
  const baseTarget = join(root, "base-plan.json");
  const originalPackage = JSON.parse(await readFile("package.json", "utf8"));
  const cases = [];
  const bindCompletion = (item, source = "c".repeat(40)) => {
    item.status = "complete";
    item.reviewer = "verifier-agent";
    item.completedAt = "2026-07-27";
    item.sourceCommit = source;
    item.evidence = [`https://github.com/itecob/bridgepane-linux/commit/${source}`];
    item.verificationReviews = [
      ...(item.verificationReviews ?? []),
      {
        role: "verifier-agent",
        decision: "accepted",
        reviewedCommit: source,
        url: `https://github.com/itecob/bridgepane-linux/commit/${source}`,
      },
    ];
    item.authorityApproval = {
      owner: "itecob",
      decision: "accepted",
      date: "2026-07-27",
      reviewedCommit: source,
      url: `https://github.com/itecob/bridgepane-linux/commit/${source}`,
    };
  };
  const cleanBaseEnv = () => {
    const env = { ...process.env };
    for (const key of [
      "GITHUB_ACTIONS",
      "GITHUB_EVENT_NAME",
      "GITHUB_EVENT_PATH",
      "GITHUB_REF",
      "PRODUCTION_PLAN_BASE_FILE",
      "PRODUCTION_PLAN_BASE_REF",
      "PRODUCTION_PLAN_FIXTURE_MODE",
      "PRODUCTION_PLAN_SYNTHETIC_GIT_MODE",
    ]) delete env[key];
    return env;
  };
  const gitIn = (cwd, args) => execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const prepareGitRepo = async (name, initialPlan = plan) => {
    const repo = join(root, name);
    await cp("docs/production-readiness", join(repo, "docs", "production-readiness"), { recursive: true });
    await mkdir(join(repo, "scripts"), { recursive: true });
    await cp(new URL(import.meta.url), join(repo, "scripts", "validate-production-plan.mjs"));
    await writeFile(join(repo, "docs", "production-readiness", "plan.json"), `${JSON.stringify(initialPlan, null, 2)}\n`);
    await writeFile(join(repo, "package.json"), `${JSON.stringify(originalPackage, null, 2)}\n`);
    gitIn(repo, ["init", "-b", "main"]);
    gitIn(repo, ["config", "user.name", "BridgePane fixture"]);
    gitIn(repo, ["config", "user.email", "fixture@bridgepane.invalid"]);
    gitIn(repo, ["add", "."]);
    gitIn(repo, ["commit", "-m", "base"]);
    const base = gitIn(repo, ["rev-parse", "HEAD"]);
    gitIn(repo, ["update-ref", "refs/remotes/origin/main", base]);
    return { repo, base };
  };
  const syntheticEnv = () => ({
    ...cleanBaseEnv(),
    PRODUCTION_PLAN_SYNTHETIC_GIT_MODE: "1",
  });
  const runRepo = (repo, env = {}) => execFileSync(
    process.execPath,
    ["scripts/validate-production-plan.mjs"],
    { cwd: repo, env: { ...syntheticEnv(), ...env }, encoding: "utf8", stdio: "pipe" },
  );
  const expectRepoFailure = (name, repo, expected, env = {}) => {
    try {
      runRepo(repo, env);
      throw new Error(`${name}: validator unexpectedly passed`);
    } catch (error) {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      if (!output.includes(expected)) {
        throw new Error(`${name}: expected '${expected}', got '${output.trim()}'`);
      }
    }
    cases.push(name);
  };
  try {
    await cp("docs/production-readiness", join(root, "docs", "production-readiness"), { recursive: true });
    await mkdir(join(root, "scripts"), { recursive: true });
    await cp(new URL(import.meta.url), scriptTarget);
    const runFailure = async (name, mutate, expected, options = {}) => {
      const candidate = structuredClone(plan);
      const base = structuredClone(plan);
      const packageJson = structuredClone(originalPackage);
      mutate(candidate, packageJson, base);
      await writeFile(planTarget, `${JSON.stringify(candidate, null, 2)}\n`);
      await writeFile(packageTarget, `${JSON.stringify(packageJson, null, 2)}\n`);
      const env = { ...process.env, PRODUCTION_PLAN_FIXTURE_MODE: "1" };
      if (options.withBase) {
        await writeFile(baseTarget, `${JSON.stringify(base, null, 2)}\n`);
        env.PRODUCTION_PLAN_BASE_FILE = baseTarget;
      } else delete env.PRODUCTION_PLAN_BASE_FILE;
      try {
        execFileSync(process.execPath, [scriptTarget], { cwd: root, env, encoding: "utf8", stdio: "pipe" });
        throw new Error(`${name}: validator unexpectedly passed`);
      } catch (error) {
        const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
        if (!output.includes(expected)) throw new Error(`${name}: expected '${expected}', got '${output.trim()}'`);
      }
      cases.push(name);
    };
    const runSuccess = async (name, mutate) => {
      const candidate = structuredClone(plan);
      const base = structuredClone(plan);
      const packageJson = structuredClone(originalPackage);
      mutate(candidate, base);
      await writeFile(planTarget, `${JSON.stringify(candidate, null, 2)}\n`);
      await writeFile(baseTarget, `${JSON.stringify(base, null, 2)}\n`);
      await writeFile(packageTarget, `${JSON.stringify(packageJson, null, 2)}\n`);
      execFileSync(process.execPath, [scriptTarget], {
        cwd: root,
        env: { ...process.env, PRODUCTION_PLAN_BASE_FILE: baseTarget, PRODUCTION_PLAN_FIXTURE_MODE: "1" },
        encoding: "utf8",
        stdio: "pipe",
      });
      cases.push(name);
    };
    await runFailure("stable blocker", (_p, pkg) => { pkg.version = "1.0.0"; }, "stable while blockers remain");
    await runFailure("missing response", (p) => { delete p.workItems[0].protocol.architecture.response; }, "request and response");
    await runFailure("stale response", (p) => { p.workItems[0].protocol.verification.response.requestRevision = "stale"; }, "stale request");
    await runFailure("rejected response", (p) => { p.workItems[0].protocol.verification.response.decision = "rejected"; }, "response is not accepted");
    await runFailure("missing request", (p) => { delete p.workItems[0].protocol.verification.request; }, "request and response");
    await runFailure("missing response file", (p) => { p.workItems[0].protocol.verification.response.path = "docs/missing-response.md"; }, "path cannot be read");
    await runFailure("invalid request revision", (p) => { p.workItems[0].protocol.architecture.request.revision = "main"; }, "revision must be a full commit SHA");
    await runFailure("invalid response revision", (p) => { p.workItems[0].protocol.architecture.response.revision = "main"; }, "revision must be a full commit SHA");
    await runFailure("response digest mismatch", (p) => { p.workItems[0].protocol.architecture.response.sha256 = "0".repeat(64); }, "working-tree digest does not match");
    await runFailure("null verifier review", (p) => { p.workItems[0].verificationReviews = [null]; }, "must be an object");
    await runFailure("wrong verifier role", (p) => { p.workItems[0].verificationReviews[0].role = "architect"; }, "role must be verifier-agent");
    await runFailure("foreign verifier evidence", (p) => { p.workItems[0].verificationReviews[0].url = "https://github.com/o/r/commit/" + "a".repeat(40); }, "url must be immutable evidence");
    await runFailure("false human approval setting", (p) => { p.authorityModel.agentReviewsAreHumanApproval = true; }, "must not be represented as human approval");
    await runFailure("false owner decision setting", (p) => { p.authorityModel.ownerDecisionRequired = false; }, "owner decisions must remain required");
    await runFailure("false second-human setting", (p) => { p.authorityModel.independentHumanReviewRequired = true; }, "must not claim a second human");
    await runFailure("wrong agent roles", (p) => { p.authorityModel.requiredAgentRoles = ["implementer"]; }, "must be exactly architect");
    await runFailure("completion missing date isolated", (p) => { bindCompletion(p.workItems[0]); delete p.workItems[0].completedAt; }, "without a YYYY-MM-DD completedAt value");
    await runFailure("completion invalid source isolated", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].sourceCommit = "missing"; }, "without an exact source commit");
    await runFailure("completion missing evidence isolated", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].evidence = []; }, "evidence must be a non-empty array");
    await runFailure("completion missing immutable evidence isolated", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].evidence = ["docs/production-readiness/README.md"]; }, "without exact source-commit evidence");
    await runFailure("completion missing source evidence", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].evidence = ["https://github.com/itecob/bridgepane-linux/actions/runs/1"]; }, "without exact source-commit evidence");
    await runFailure("completion mismatched review", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].verificationReviews.at(-1).reviewedCommit = "d".repeat(40); }, "not bound to a verifier review");
    await runFailure("completion mismatched approval", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].authorityApproval.reviewedCommit = "d".repeat(40); }, "not bound to owner approval");
    await runFailure("completion malformed evidence", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].evidence.push("../evidence"); }, "unsafe or mutable evidence");
    await runFailure("completion foreign evidence", (p) => { bindCompletion(p.workItems[0]); p.workItems[0].evidence = ["https://github.com/o/r/commit/" + "c".repeat(40)]; }, "unsafe or mutable evidence");
    await runFailure("mutated request", (p) => { p.workItems[0].protocol.architecture.request.revision = "changed"; p.workItems[0].protocol.architecture.response.requestRevision = "changed"; }, "mutates accepted protocol", { withBase: true });
    await runFailure("removed verifier record", (p) => { p.workItems[0].verificationReviews = []; }, "removes accepted verificationReviews", { withBase: true });
    await runFailure("mutated owner approval", (p) => { p.workItems[0].authorityApproval.date = "2026-07-27"; }, "mutates owner authority approval", { withBase: true });
    await runFailure("unknown dependency", (p) => { p.workItems[0].dependsOn = ["BAD-999"]; }, "unknown dependency");
    await runFailure("self dependency", (p) => { p.workItems[0].dependsOn = ["CTL-001"]; }, "depends on itself");
    await runFailure("dependency cycle", (p) => { p.workItems[0].dependsOn = ["HK-001"]; p.workItems[1].dependsOn = ["CTL-001"]; }, "dependency cycle includes");
    await runFailure("incomplete dependency", (p) => { p.workItems[0].dependsOn = ["HK-001"]; }, "while dependency HK-001 is planned");
    await runFailure("unnamed owner", (p) => { p.workItems[0].owner = "unassigned"; }, "without one named accountable owner");
    await runFailure("invalid completion", (p) => { p.workItems[0].status = "complete"; p.workItems[0].reviewer = "itecob"; }, "without a separate verifier role");
    await runFailure("illegal transition", (_p, _pkg, base) => { base.workItems[0].status = "complete"; }, "illegal transition complete -> in_review", { withBase: true });
    await runFailure("weakened blocker", (p, _pkg, base) => { base.workItems[0].releaseBlocker = true; p.workItems[0].releaseBlocker = false; }, "weakens releaseBlocker", { withBase: true });
    await runFailure("weakened criteria", (p, _pkg, base) => { base.workItems[0].acceptanceCriteria.push("must remain"); }, "weakens acceptanceCriteria", { withBase: true });
    await runFailure("weakened evidence", (p, _pkg, base) => { base.workItems[0].evidenceRequired.push("must remain"); }, "weakens evidenceRequired", { withBase: true });
    await runFailure("duplicate item", (p) => { p.workItems.push(structuredClone(p.workItems[0])); }, "duplicate work-item id");
    await runFailure("duplicate phase", (p) => { p.phases.push(structuredClone(p.phases[0])); }, "duplicate phase id");
    await runFailure("duplicate phase order", (p) => { p.phases[1].order = 0; }, "duplicate phase order");
    await runFailure("missing local reference", (p) => { p.workItems[0].references = ["docs/missing.md"]; }, "references missing local path");
    await runFailure("missing local evidence", (p) => { p.workItems[0].status = "complete"; p.workItems[0].reviewer = "verifier-agent"; p.workItems[0].completedAt = "2026-07-27"; p.workItems[0].sourceCommit = "a".repeat(40); p.workItems[0].evidence = ["docs/missing-evidence.md", "https://github.com/o/r/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]; }, "references missing local path");
    await runFailure("unsafe path", (p) => { p.workItems[0].references = ["../outside"]; p.workItems[0].protocol.architecture.request.path = "../outside"; }, "is unsafe");
    await runFailure("URL used as local reference", (p) => { p.workItems[0].references = ["https://example.com/doc"]; }, "unsafe local reference");
    await runFailure("GOV-002 issue gate", (p) => { p.workItems.find(({ id }) => id === "GOV-002").status = "complete"; }, "lacks exactly one repository tracking issue");
    await runFailure("foreign issue URLs", (p) => { p.workItems.find(({ id }) => id === "GOV-002").status = "complete"; p.workItems.forEach((item, index) => { item.issue = `https://github.com/o/r/issues/${index + 1}`; }); }, "repository tracking issue");
    await runFailure("shared issue URL", (p) => { p.workItems.find(({ id }) => id === "GOV-002").status = "complete"; p.workItems.forEach((item) => { item.issue = "https://github.com/itecob/bridgepane-linux/issues/1"; }); }, "shares tracking issue");
    await runFailure("earlier-phase blocker gate", (p) => { p.workItems.find(({ id }) => id === "SEC-001").status = "ready"; }, "ahead of earlier blockers");
    const workflowCases = [
      ["mutable Action", "uses: actions/checkout@v4", {}, "mutable Action reference"],
      ["privileged PR", "permissions:\n  contents: write", { pullRequest: true }, "privileged capability"],
      ["release environment", "jobs:\n  publish:\n    runs-on: ubuntu-latest", { release: true }, "protected environment"],
    ];
    for (const [name, text, options, expected] of workflowCases) {
      const output = validateWorkflowFixture(name, text, options);
      if (!output.some((message) => message.includes(expected))) throw new Error(`${name}: fixture unexpectedly passed`);
      cases.push(name);
    }
    for (const [before, afterSet] of Object.entries(legalTransitions)) {
      for (const after of afterSet) {
        await runSuccess(`legal transition ${before} -> ${after}`, (candidate, base) => {
          candidate.workItems = [candidate.workItems[0]];
          base.workItems = [base.workItems[0]];
          const currentItem = candidate.workItems[0];
          const baseItem = base.workItems[0];
          baseItem.status = before;
          currentItem.status = after;
          if (before === "blocked") baseItem.blocker = "fixture blocker";
          if (after === "blocked") currentItem.blocker = "fixture blocker";
          if (after === "complete") bindCompletion(currentItem);
          else {
            currentItem.completedAt = null;
            currentItem.sourceCommit = null;
          }
        });
      }
    }

    const completePlan = structuredClone(plan);
    const ctl = completePlan.workItems[0];
    completePlan.workItems.forEach((item, index) => {
      item.status = "complete";
      item.owner = "itecob";
      item.reviewer = "verifier-agent";
      item.completedAt = "2026-07-27";
      item.sourceCommit = "c".repeat(40);
      item.references = ["docs/production-readiness/README.md"];
      item.evidence = [
        "https://github.com/itecob/bridgepane-linux/commit/cccccccccccccccccccccccccccccccccccccccc",
      ];
      item.protocol = structuredClone(ctl.protocol);
      item.verificationReviews = [{
        role: "verifier-agent",
        decision: "accepted",
        reviewedCommit: "c".repeat(40),
        url: "https://github.com/itecob/bridgepane-linux/commit/cccccccccccccccccccccccccccccccccccccccc",
      }];
      item.authorityApproval = {
        owner: "itecob",
        decision: "accepted",
        date: "2026-07-27",
        reviewedCommit: "c".repeat(40),
        url: "https://github.com/itecob/bridgepane-linux/commit/cccccccccccccccccccccccccccccccccccccccc",
      };
      item.independenceLimitations = structuredClone(ctl.independenceLimitations);
      item.residualRisks = [];
      item.issue = `https://github.com/itecob/bridgepane-linux/issues/${index + 1}`;
    });
    const stablePackage = structuredClone(originalPackage);
    stablePackage.version = "1.0.0";
    await writeFile(planTarget, `${JSON.stringify(completePlan, null, 2)}\n`);
    await writeFile(packageTarget, `${JSON.stringify(stablePackage, null, 2)}\n`);
    const stableEnv = { ...process.env, PRODUCTION_PLAN_FIXTURE_MODE: "1" };
    delete stableEnv.PRODUCTION_PLAN_BASE_FILE;
    delete stableEnv.PRODUCTION_PLAN_BASE_REF;
    execFileSync(process.execPath, [scriptTarget], { cwd: root, env: stableEnv, encoding: "utf8" });
    cases.push("complete stable release");

    const localGraph = await prepareGitRepo("local-graph");
    gitIn(localGraph.repo, ["switch", "-c", "feature"]);
    gitIn(localGraph.repo, ["commit", "--allow-empty", "-m", "feature one"]);
    gitIn(localGraph.repo, ["commit", "--allow-empty", "-m", "feature two"]);
    const localOutput = runRepo(localGraph.repo);
    if (!localOutput.includes(`mode=local-merge-base`) || !localOutput.includes(`base=${localGraph.base}`)) {
      throw new Error(`local multi-commit base: wrong selection: ${localOutput}`);
    }
    cases.push("local multi-commit selects merge base");

    const invalidOverrideEnv = { ...cleanBaseEnv(), PRODUCTION_PLAN_BASE_REF: "HEAD^" };
    expectRepoFailure("invalid diagnostic override", localGraph.repo, "must be a full 40-character commit SHA", invalidOverrideEnv);
    gitIn(localGraph.repo, ["update-ref", "-d", "refs/remotes/origin/main"]);
    expectRepoFailure("missing local origin main", localGraph.repo, "Could not resolve local tracking ref");

    const prGraph = await prepareGitRepo("pull-request-graph");
    gitIn(prGraph.repo, ["switch", "-c", "feature"]);
    gitIn(prGraph.repo, ["commit", "--allow-empty", "-m", "feature"]);
    const prHead = gitIn(prGraph.repo, ["rev-parse", "HEAD"]);
    gitIn(prGraph.repo, ["switch", "main"]);
    gitIn(prGraph.repo, ["merge", "--no-ff", "feature", "-m", "merge fixture"]);
    const eventPath = join(prGraph.repo, "event.json");
    await writeFile(eventPath, `${JSON.stringify({ pull_request: { base: { sha: prGraph.base }, head: { sha: prHead } } })}\n`);
    const prEnv = {
      ...cleanBaseEnv(),
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/pull/1/merge",
    };
    const prOutput = runRepo(prGraph.repo, prEnv);
    if (!prOutput.includes("mode=pull-request-merge") || !prOutput.includes(`base=${prGraph.base}`)) {
      throw new Error(`pull-request merge base: wrong selection: ${prOutput}`);
    }
    cases.push("pull-request merge selects event base");

    await writeFile(eventPath, `${JSON.stringify({ pull_request: { base: { sha: prHead }, head: { sha: prGraph.base } } })}\n`);
    expectRepoFailure("pull-request parent mismatch", prGraph.repo, "do not match merge checkout parents", prEnv);
    await writeFile(eventPath, "{malformed\n");
    expectRepoFailure("malformed pull-request event", prGraph.repo, "Could not parse GitHub event payload", prEnv);
    await writeFile(eventPath, `${JSON.stringify({ pull_request: { base: { sha: prGraph.base }, head: { sha: prHead } } })}\n`);

    const shallowRepo = join(root, "shallow-pr");
    execFileSync("git", ["clone", "--depth", "1", `file://${prGraph.repo}`, shallowRepo], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const shallowEvent = join(shallowRepo, "event.json");
    await writeFile(shallowEvent, `${JSON.stringify({ pull_request: { base: { sha: prGraph.base }, head: { sha: prHead } } })}\n`);
    expectRepoFailure("depth-one pull-request checkout", shallowRepo, "fetch-depth must be at least 2", {
      ...cleanBaseEnv(),
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: shallowEvent,
      GITHUB_REF: "refs/pull/1/merge",
    });
    const missingEventEnv = { ...prEnv };
    delete missingEventEnv.GITHUB_EVENT_PATH;
    expectRepoFailure("missing pull-request event", prGraph.repo, "requires GITHUB_EVENT_PATH", missingEventEnv);
    expectRepoFailure("CI diagnostic override prohibited", prGraph.repo, "is prohibited in GitHub Actions", {
      ...prEnv,
      PRODUCTION_PLAN_BASE_REF: prGraph.base,
    });

    await writeFile(eventPath, `${JSON.stringify({ before: prGraph.base })}\n`);
    const pushEnv = {
      ...cleanBaseEnv(),
      GITHUB_ACTIONS: "true",
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/heads/main",
    };
    const pushOutput = runRepo(prGraph.repo, pushEnv);
    if (!pushOutput.includes("mode=main-push") || !pushOutput.includes(`base=${prGraph.base}`)) {
      throw new Error(`main push base: wrong selection: ${pushOutput}`);
    }
    cases.push("main push selects before SHA");

    const missingLedger = await prepareGitRepo("missing-ledger");
    gitIn(missingLedger.repo, ["rm", planPath]);
    gitIn(missingLedger.repo, ["commit", "-m", "remove plan at base"]);
    const missingLedgerBase = gitIn(missingLedger.repo, ["rev-parse", "HEAD"]);
    gitIn(missingLedger.repo, ["update-ref", "refs/remotes/origin/main", missingLedgerBase]);
    await writeFile(join(missingLedger.repo, planPath), `${JSON.stringify(plan, null, 2)}\n`);
    gitIn(missingLedger.repo, ["add", planPath]);
    gitIn(missingLedger.repo, ["commit", "-m", "restore candidate plan"]);
    expectRepoFailure("missing non-bootstrap base ledger", missingLedger.repo, "Could not load mandatory production-plan base");

    const invalidLedger = await prepareGitRepo("invalid-ledger");
    await writeFile(join(invalidLedger.repo, planPath), "{invalid\n");
    gitIn(invalidLedger.repo, ["add", planPath]);
    gitIn(invalidLedger.repo, ["commit", "-m", "invalid plan at base"]);
    const invalidLedgerBase = gitIn(invalidLedger.repo, ["rev-parse", "HEAD"]);
    gitIn(invalidLedger.repo, ["update-ref", "refs/remotes/origin/main", invalidLedgerBase]);
    await writeFile(join(invalidLedger.repo, planPath), `${JSON.stringify(plan, null, 2)}\n`);
    gitIn(invalidLedger.repo, ["add", planPath]);
    gitIn(invalidLedger.repo, ["commit", "-m", "valid candidate plan"]);
    expectRepoFailure("invalid base ledger JSON", invalidLedger.repo, "Could not parse production-plan base");

    const strengthened = structuredClone(plan);
    strengthened.workItems[0].acceptanceCriteria.push("fixture criterion must remain");
    const weakening = await prepareGitRepo("multi-commit-weakening", strengthened);
    gitIn(weakening.repo, ["switch", "-c", "feature"]);
    await writeFile(join(weakening.repo, planPath), `${JSON.stringify(plan, null, 2)}\n`);
    gitIn(weakening.repo, ["add", planPath]);
    gitIn(weakening.repo, ["commit", "-m", "weaken in first feature commit"]);
    gitIn(weakening.repo, ["commit", "--allow-empty", "-m", "second feature commit"]);
    expectRepoFailure("multi-commit weakening uses merge base", weakening.repo, "weakens acceptanceCriteria");

    const ambiguous = await prepareGitRepo("ambiguous-merge-base");
    const tree = gitIn(ambiguous.repo, ["rev-parse", "HEAD^{tree}"]);
    const a1 = gitIn(ambiguous.repo, ["commit-tree", tree, "-p", ambiguous.base, "-m", "A1"]);
    const b1 = gitIn(ambiguous.repo, ["commit-tree", tree, "-p", ambiguous.base, "-m", "B1"]);
    const a2 = gitIn(ambiguous.repo, ["commit-tree", tree, "-p", a1, "-p", b1, "-m", "A2"]);
    const b2 = gitIn(ambiguous.repo, ["commit-tree", tree, "-p", b1, "-p", a1, "-m", "B2"]);
    gitIn(ambiguous.repo, ["update-ref", "refs/heads/feature", a2]);
    gitIn(ambiguous.repo, ["update-ref", "refs/remotes/origin/main", b2]);
    gitIn(ambiguous.repo, ["switch", "feature"]);
    expectRepoFailure("ambiguous local merge base", ambiguous.repo, "Expected exactly one merge base");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  console.log(`Production-plan fixtures passed: ${cases.length}`);
}

if (process.argv.includes("--self-test") && failures.length === 0) await runSelfTests();
