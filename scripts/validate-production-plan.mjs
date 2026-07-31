import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
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
      const enteringComplete = base.status !== "complete" && item.status === "complete";
      if (!enteringComplete
        && JSON.stringify(base.authorityApproval) !== JSON.stringify(item.authorityApproval)) {
        fail(`${item.id} mutates owner authority approval after acceptance`);
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
  const sourceRoot = await realpath(process.cwd());
  const temporaryParent = await realpath(tmpdir());
  const root = await mkdtemp(join(temporaryParent, "bridgepane-plan-fixtures-"));
  const resolvedRoot = await realpath(root);
  if (path.dirname(resolvedRoot) !== temporaryParent
    || !path.basename(resolvedRoot).startsWith("bridgepane-plan-fixtures-")) {
    throw new Error("fixture root escaped the expected temporary parent");
  }
  const fixtureRootMetadata = await lstat(resolvedRoot, { bigint: true });
  if (!fixtureRootMetadata.isDirectory()
    || (fixtureRootMetadata.mode & 0o077n) !== 0n
    || (typeof process.getuid === "function" && fixtureRootMetadata.uid !== BigInt(process.getuid()))) {
    throw new Error("fixture root is not a private directory owned by this process user");
  }
  const scriptTarget = join(root, "scripts", "validate-production-plan.mjs");
  const planTarget = join(root, planPath);
  const packageTarget = join(root, "package.json");
  const baseTarget = join(root, "base-plan.json");
  const originalPackage = JSON.parse(await readFile("package.json", "utf8"));
  const cases = [];
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  const exactItem = (candidate, id) => {
    const matches = (candidate.workItems ?? []).filter((item) => item.id === id);
    if (matches.length !== 1) {
      throw new Error(`fixture requires exactly one ${id}; found ${matches.length}`);
    }
    return matches[0];
  };
  const fixtureCtl = (candidate) => exactItem(candidate, "CTL-001");
  const fixtureHk = (candidate) => exactItem(candidate, "HK-001");
  const ctlTemplate = exactItem(plan, "CTL-001");
  const protocolTemplate = structuredClone(ctlTemplate.protocol);
  const limitationTemplate = [
    "Synthetic fixture role separation is not independent-human review",
  ];
  const syntheticReview = (source = "a".repeat(40)) => ({
    role: "verifier-agent",
    decision: "accepted",
    reviewedCommit: source,
    url: `https://github.com/itecob/bridgepane-linux/commit/${source}`,
  });
  const syntheticApproval = (source = "a".repeat(40)) => ({
    owner: "itecob",
    decision: "accepted",
    date: "2026-07-27",
    reviewedCommit: source,
    url: `https://github.com/itecob/bridgepane-linux/commit/${source}`,
  });
  const clearLifecycle = (item) => {
    item.owner = "itecob";
    item.reviewer = null;
    item.evidence = [];
    delete item.blocker;
    delete item.completedAt;
    delete item.sourceCommit;
    delete item.protocol;
    delete item.verificationReviews;
    delete item.authorityApproval;
    delete item.independenceLimitations;
    delete item.residualRisks;
  };
  const setIncompleteState = (item, status = "in_review") => {
    clearLifecycle(item);
    item.status = status;
    if (status === "blocked") item.blocker = "fixture blocker";
    if (active.has(status)) {
      item.protocol = structuredClone(protocolTemplate);
      item.verificationReviews = [syntheticReview()];
      item.authorityApproval = syntheticApproval();
      item.independenceLimitations = structuredClone(limitationTemplate);
      item.residualRisks = [];
    }
  };
  const bindCompletion = (item, source = "c".repeat(40)) => {
    const accepted = active.has(item.status) ? {
      protocol: structuredClone(item.protocol),
      verificationReviews: structuredClone(item.verificationReviews ?? []),
      independenceLimitations: structuredClone(item.independenceLimitations ?? []),
      residualRisks: structuredClone(item.residualRisks ?? []),
    } : null;
    setIncompleteState(item, "in_review");
    if (accepted) {
      item.protocol = accepted.protocol;
      item.verificationReviews = accepted.verificationReviews;
      item.independenceLimitations = accepted.independenceLimitations;
      item.residualRisks = accepted.residualRisks;
    }
    item.status = "complete";
    item.reviewer = "verifier-agent";
    item.completedAt = "2026-07-27";
    item.sourceCommit = source;
    item.evidence = [`https://github.com/itecob/bridgepane-linux/commit/${source}`];
    item.verificationReviews = [
      ...(item.verificationReviews ?? []),
      syntheticReview(source),
    ];
    item.authorityApproval = syntheticApproval(source);
  };
  const canonicalSeedPlan = (source = plan) => {
    const seeded = structuredClone(source);
    for (const item of seeded.workItems ?? []) {
      setIncompleteState(item, "planned");
      item.dependsOn = [];
      item.references = ["docs/production-readiness/README.md"];
    }
    const ctl = exactItem(seeded, "CTL-001");
    bindCompletion(ctl, "e".repeat(40));
    return seeded;
  };
  const seedPlan = (status, source = plan) => {
    const seeded = canonicalSeedPlan(source);
    const ctl = exactItem(seeded, "CTL-001");
    if (status !== "complete") setIncompleteState(ctl, status);
    return seeded;
  };
  const prepareTransition = (candidate, base, before, after) => {
    const candidateItem = structuredClone(exactItem(candidate, "CTL-001"));
    const baseItem = structuredClone(exactItem(base, "CTL-001"));
    candidate.workItems = [candidateItem];
    base.workItems = [baseItem];
    if (before === "complete") bindCompletion(baseItem, "b".repeat(40));
    else setIncompleteState(baseItem, before);
    const currentItem = structuredClone(baseItem);
    if (after === "complete" && before !== "complete") {
      bindCompletion(currentItem);
    } else if (after !== "complete") {
      setIncompleteState(currentItem, after);
      if (active.has(before)) {
        for (const field of [
          "protocol",
          "verificationReviews",
          "authorityApproval",
          "independenceLimitations",
          "residualRisks",
        ]) {
          currentItem[field] = structuredClone(baseItem[field]);
        }
      }
    }
    candidate.workItems = [currentItem];
    return { currentItem, baseItem };
  };
  const rebindCompletion = (item, source = "d".repeat(40)) => {
    item.sourceCommit = source;
    item.evidence = [`https://github.com/itecob/bridgepane-linux/commit/${source}`];
    item.verificationReviews = [
      ...item.verificationReviews,
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
      date: "2026-07-28",
      reviewedCommit: source,
      url: `https://github.com/itecob/bridgepane-linux/commit/${source}`,
    };
  };
  const assertSafeFixtureReference = (reference) => {
    if (!localReference(reference)
      || /^[A-Za-z]:/.test(reference)
      || reference.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
      throw new Error(`unsafe fixture reference ${JSON.stringify(reference)}`);
    }
    return reference.split("/");
  };
  const assertContained = (parent, candidate, label) => {
    const relative = path.relative(parent, candidate);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
      throw new Error(`${label} escaped fixture root`);
    }
  };
  const identity = ({ dev, ino }) => ({ dev, ino });
  const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;
  const inspectSourceComponents = async (rootPath, segments) => {
    let current = rootPath;
    const snapshots = [];
    for (const segment of segments) {
      current = join(current, segment);
      let metadata;
      try {
        metadata = await lstat(current, { bigint: true });
      } catch (error) {
        if (error.code === "ENOENT") throw new Error(`missing fixture source ${segments.join("/")}`);
        throw error;
      }
      if (metadata.isSymbolicLink()) {
        throw new Error(`symlinked fixture source ${segments.join("/")}`);
      }
      if (snapshots.length === segments.length - 1 && !metadata.isFile()) {
        throw new Error(`fixture source is not a regular file ${segments.join("/")}`);
      }
      snapshots.push({ path: current, ...identity(metadata) });
    }
    return { path: current, snapshots };
  };
  const assertComponentIdentities = async (snapshots, label) => {
    for (const snapshot of snapshots) {
      const current = await lstat(snapshot.path, { bigint: true });
      if (current.isSymbolicLink() || !sameIdentity(snapshot, current)) {
        throw new Error(`${label} changed during copy`);
      }
    }
  };
  const prepareDestinationParent = async (rootPath, segments) => {
    let current = rootPath;
    const snapshots = [];
    for (const segment of segments.slice(0, -1)) {
      current = join(current, segment);
      assertContained(rootPath, current, "fixture destination");
      try {
        const metadata = await lstat(current, { bigint: true });
        if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
          throw new Error(`unsafe fixture destination parent ${segments.join("/")}`);
        }
        snapshots.push({ path: current, ...identity(metadata) });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await mkdir(current, { mode: 0o700 });
        const metadata = await lstat(current, { bigint: true });
        snapshots.push({ path: current, ...identity(metadata) });
      }
    }
    return snapshots;
  };
  const copyFixtureReference = async (fromRoot, toRoot, reference) => {
    const segments = assertSafeFixtureReference(reference);
    const suppliedSourceRoot = await lstat(fromRoot, { bigint: true });
    const suppliedDestinationRoot = await lstat(toRoot, { bigint: true });
    if (suppliedSourceRoot.isSymbolicLink() || !suppliedSourceRoot.isDirectory()) {
      throw new Error("unsafe fixture source root");
    }
    if (suppliedDestinationRoot.isSymbolicLink() || !suppliedDestinationRoot.isDirectory()) {
      throw new Error("unsafe fixture destination root");
    }
    const resolvedFromRoot = await realpath(fromRoot);
    const resolvedToRoot = await realpath(toRoot);
    if (resolvedFromRoot !== sourceRoot) {
      assertContained(resolvedRoot, resolvedFromRoot, "fixture source root");
    }
    if (resolvedToRoot !== resolvedRoot) {
      assertContained(resolvedRoot, resolvedToRoot, "fixture destination root");
    }
    const destinationRootMetadata = await lstat(resolvedToRoot, { bigint: true });
    if (!destinationRootMetadata.isDirectory()) {
      throw new Error("unsafe fixture destination root");
    }
    const sourceInspection = await inspectSourceComponents(resolvedFromRoot, segments);
    const resolvedSource = await realpath(sourceInspection.path);
    assertContained(resolvedFromRoot, resolvedSource, "fixture source");
    const validatedSource = sourceInspection.snapshots.at(-1);
    const handle = await open(sourceInspection.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    let bytes;
    let before;
    let after;
    try {
      before = await handle.stat({ bigint: true });
      if (!before.isFile() || !sameIdentity(validatedSource, before)) {
        throw new Error(`fixture source is not the validated regular file ${reference}`);
      }
      await assertComponentIdentities(sourceInspection.snapshots, `fixture source ${reference}`);
      bytes = await handle.readFile();
      after = await handle.stat({ bigint: true });
      await assertComponentIdentities(sourceInspection.snapshots, `fixture source ${reference}`);
    } finally {
      await handle.close();
    }
    if (!after.isFile()
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.size !== BigInt(bytes.length)) {
      throw new Error(`fixture source changed during copy ${reference}`);
    }
    const destinationParents = await prepareDestinationParent(resolvedToRoot, segments);
    const destinationPath = join(resolvedToRoot, ...segments);
    assertContained(resolvedToRoot, destinationPath, "fixture destination");
    let destinationHandle;
    try {
      destinationHandle = await open(
        destinationPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600,
      );
    } catch (error) {
      if (["EEXIST", "ELOOP", "EISDIR"].includes(error.code)) {
        throw new Error(`fixture destination already exists ${reference}`);
      }
      throw error;
    }
    try {
      const openedDestination = await destinationHandle.stat({ bigint: true });
      if (!openedDestination.isFile()) {
        throw new Error(`fixture destination is not a regular file ${reference}`);
      }
      await destinationHandle.writeFile(bytes);
    } finally {
      await destinationHandle.close();
    }
    const currentDestinationRoot = await lstat(resolvedToRoot, { bigint: true });
    if (!sameIdentity(destinationRootMetadata, currentDestinationRoot)) {
      throw new Error(`fixture destination root changed during copy ${reference}`);
    }
    await assertComponentIdentities(destinationParents, `fixture destination ${reference}`);
    const destinationMetadata = await lstat(destinationPath, { bigint: true });
    if (destinationMetadata.isSymbolicLink() || !destinationMetadata.isFile()) {
      throw new Error(`fixture destination is not a regular file ${reference}`);
    }
    const destinationBytes = await readFile(destinationPath);
    const sourceDigest = digest(bytes);
    const destinationDigest = digest(destinationBytes);
    if (sourceDigest !== destinationDigest) throw new Error(`fixture copy digest mismatch ${reference}`);
    return {
      path: reference,
      type: "file",
      bytes: bytes.length,
      sha256: sourceDigest,
    };
  };
  const allowedItemKeys = new Set([
    "id", "phase", "title", "status", "releaseBlocker", "owner", "reviewer",
    "dependsOn", "controls", "acceptanceCriteria", "evidenceRequired", "evidence",
    "references", "protocol", "verificationReviews", "authorityApproval",
    "independenceLimitations", "residualRisks", "deviation", "issue", "sourceCommit",
    "completedAt", "blocker",
  ]);
  const fixtureReferenceRecords = (item) => {
    const records = [];
    for (const reference of item.references ?? []) records.push({ kind: "reference", path: reference });
    if (item.status === "complete") {
      for (const evidence of item.evidence ?? []) records.push({ kind: "evidence", path: evidence });
    }
    for (const role of ["architecture", "verification"]) {
      const pair = item.protocol?.[role];
      if (pair && Object.keys(pair).some((key) => !["request", "response"].includes(key))) {
        throw new Error(`unclassified fixture protocol field ${role}`);
      }
      for (const document of [pair?.request, pair?.response]) {
        if (document && Object.keys(document).some((key) => ![
          "id", "revision", "path", "sha256", "requestRevision", "decision",
        ].includes(key))) {
          throw new Error(`unclassified fixture protocol document field ${role}`);
        }
        if (document?.path) records.push({ kind: `protocol ${role}`, path: document.path });
      }
    }
    return records;
  };
  const fixtureReferenceClosure = (candidate) => {
    const references = new Set([
      "package.json",
      "package-lock.json",
      "scripts/validate-production-plan.mjs",
    ]);
    for (const item of candidate.workItems ?? []) {
      for (const key of Object.keys(item)) {
        if (!allowedItemKeys.has(key)) throw new Error(`unclassified fixture item field ${key}`);
      }
      if (!active.has(item.status)) continue;
      for (const record of fixtureReferenceRecords(item)) {
        if (localReference(record.path)) references.add(record.path);
      }
    }
    return [...references].sort();
  };
  const provisionFixture = async (fromRoot, toRoot, candidate) => {
    const manifest = [];
    for (const reference of fixtureReferenceClosure(candidate)) {
      manifest.push(await copyFixtureReference(fromRoot, toRoot, reference));
    }
    const paths = manifest.map(({ path: reference }) => reference);
    if (paths.length !== new Set(paths).size
      || JSON.stringify(paths) !== JSON.stringify([...paths].sort())) {
      throw new Error("fixture reference manifest is not sorted and de-duplicated");
    }
    return manifest;
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
      "PRODUCTION_PLAN_SKIP_VARIANCE_MATRIX",
      "PRODUCTION_PLAN_EMIT_CASE_INVENTORY",
    ]) delete env[key];
    return env;
  };
  const gitIn = (cwd, args) => execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const prepareGitRepo = async (name, initialPlan = canonicalSeedPlan()) => {
    const repo = join(root, name);
    await mkdir(repo);
    await provisionFixture(sourceRoot, repo, initialPlan);
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
    await provisionFixture(sourceRoot, root, canonicalSeedPlan());
    const expectCopyFailure = async (name, fromRoot, toRoot, reference, expected) => {
      try {
        await copyFixtureReference(fromRoot, toRoot, reference);
        throw new Error(`${name}: unsafe fixture copy unexpectedly passed`);
      } catch (error) {
        if (!String(error.message).includes(expected)) {
          throw new Error(`${name}: expected '${expected}', got '${error.message}'`);
        }
      }
      cases.push(name);
    };
    const safetySource = join(root, "reference-safety-source");
    await mkdir(safetySource);
    await writeFile(join(safetySource, "valid.txt"), "fixture bytes\n");
    await mkdir(join(safetySource, "directory"));
    await mkdir(join(safetySource, "nested"));
    await writeFile(join(safetySource, "nested", "valid.txt"), "nested fixture bytes\n");
    await symlink("valid.txt", join(safetySource, "linked-file"));
    await symlink("nested", join(safetySource, "linked-directory"));
    const fifoPath = join(safetySource, "special-file");
    execFileSync("mkfifo", [fifoPath]);

    const safeDestination = join(root, "reference-safety-valid");
    await mkdir(safeDestination);
    const safeManifest = await copyFixtureReference(
      safetySource,
      safeDestination,
      "valid.txt",
    );
    if (safeManifest.path !== "valid.txt"
      || safeManifest.type !== "file"
      || safeManifest.bytes !== 14
      || safeManifest.sha256 !== digest("fixture bytes\n")) {
      throw new Error(`safe fixture copy produced an invalid manifest`);
    }
    cases.push("safe fixture copy manifest");

    const copyFailureCases = [
      ["missing fixture source rejected", "missing.txt", "missing fixture source"],
      ["absolute fixture source rejected", "/etc/passwd", "unsafe fixture reference"],
      ["drive-prefixed fixture source rejected", "C:/outside", "unsafe fixture reference"],
      ["traversal fixture source rejected", "../outside", "unsafe fixture reference"],
      ["NUL fixture source rejected", "bad\0path", "unsafe fixture reference"],
      ["non-normal fixture source rejected", "nested//valid.txt", "unsafe fixture reference"],
      ["directory fixture source rejected", "directory", "not a regular file"],
      ["special fixture source rejected", "special-file", "not a regular file"],
      ["symlinked fixture file rejected", "linked-file", "symlinked fixture source"],
      ["symlinked fixture component rejected", "linked-directory/valid.txt", "symlinked fixture source"],
    ];
    for (const [name, reference, expected] of copyFailureCases) {
      const destination = join(root, `reference-safety-${cases.length}`);
      await mkdir(destination);
      await expectCopyFailure(name, safetySource, destination, reference, expected);
    }

    const overwriteDestination = join(root, "reference-safety-overwrite");
    await mkdir(overwriteDestination);
    await writeFile(join(overwriteDestination, "valid.txt"), "unexpected\n");
    await expectCopyFailure(
      "fixture destination overwrite rejected",
      safetySource,
      overwriteDestination,
      "valid.txt",
      "already exists",
    );

    const directoryDestination = join(root, "reference-safety-destination-directory");
    await mkdir(directoryDestination);
    await mkdir(join(directoryDestination, "valid.txt"));
    await expectCopyFailure(
      "wrong-type fixture destination rejected",
      safetySource,
      directoryDestination,
      "valid.txt",
      "already exists",
    );

    const symlinkDestination = join(root, "reference-safety-destination-symlink");
    const destinationOutside = join(root, "reference-safety-destination-outside");
    await mkdir(symlinkDestination);
    await mkdir(destinationOutside);
    await symlink(destinationOutside, join(symlinkDestination, "nested"));
    await expectCopyFailure(
      "symlinked fixture destination parent rejected",
      safetySource,
      symlinkDestination,
      "nested/valid.txt",
      "unsafe fixture destination parent",
    );

    for (const [name, parent, candidate, expected] of [
      ["out-of-root fixture source rejected", safetySource, destinationOutside, "fixture source escaped fixture root"],
      ["out-of-root fixture destination rejected", safeDestination, destinationOutside, "fixture destination escaped fixture root"],
    ]) {
      try {
        assertContained(parent, candidate, name.includes("source") ? "fixture source" : "fixture destination");
        throw new Error(`${name}: containment check unexpectedly passed`);
      } catch (error) {
        if (!String(error.message).includes(expected)) throw error;
      }
      cases.push(name);
    }
    try {
      assertSafeFixtureReference("nested/../valid.txt");
      throw new Error("fixture destination traversal unexpectedly passed");
    } catch (error) {
      if (!String(error.message).includes("unsafe fixture reference")) throw error;
    }
    cases.push("fixture destination traversal rejected");

    const referencePlan = canonicalSeedPlan();
    const referenceHk = fixtureHk(referencePlan);
    setIncompleteState(referenceHk, "ready");
    referenceHk.references = ["package-lock.json"];
    const referenceRepo = join(root, "bridgepane-plan-fixtures-reference-validation");
    await mkdir(referenceRepo);
    const referenceManifest = await provisionFixture(sourceRoot, referenceRepo, referencePlan);
    if (!referenceManifest.some(({ path: reference }) => reference === "package-lock.json")) {
      throw new Error("active fixture reference closure omitted package-lock.json");
    }
    await writeFile(
      join(referenceRepo, planPath),
      `${JSON.stringify(referencePlan, null, 2)}\n`,
    );
    await writeFile(
      join(referenceRepo, "package.json"),
      `${JSON.stringify(originalPackage, null, 2)}\n`,
    );
    const referenceEnv = {
      ...process.env,
      PRODUCTION_PLAN_FIXTURE_MODE: "1",
    };
    delete referenceEnv.PRODUCTION_PLAN_BASE_FILE;
    execFileSync(process.execPath, ["scripts/validate-production-plan.mjs"], {
      cwd: referenceRepo,
      env: referenceEnv,
      encoding: "utf8",
      stdio: "pipe",
    });
    cases.push("provisioned active reference validates");
    await rm(join(referenceRepo, "package-lock.json"));
    try {
      execFileSync(process.execPath, ["scripts/validate-production-plan.mjs"], {
        cwd: referenceRepo,
        env: referenceEnv,
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("removed fixture reference unexpectedly passed");
    } catch (error) {
      const diagnostics = String(error.stderr ?? "")
        .split(/\r?\n/)
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2));
      const expected = ["HK-001 references missing local path package-lock.json"];
      if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
        throw new Error(
          `removed fixture reference expected ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`,
        );
      }
    }
    cases.push("removed active reference fails normally");

    const hermeticSource = join(root, "bridgepane-plan-fixtures-hermetic-source");
    const hermeticDestination = join(root, "bridgepane-plan-fixtures-hermetic-destination");
    await mkdir(hermeticSource);
    await mkdir(hermeticDestination);
    const hermeticPlan = canonicalSeedPlan();
    await provisionFixture(sourceRoot, hermeticSource, hermeticPlan);
    await writeFile(join(hermeticSource, planPath), `${JSON.stringify(hermeticPlan, null, 2)}\n`);
    await writeFile(join(hermeticSource, "package.json"), `${JSON.stringify(originalPackage, null, 2)}\n`);
    await provisionFixture(hermeticSource, hermeticDestination, hermeticPlan);
    await writeFile(join(hermeticDestination, planPath), `${JSON.stringify(hermeticPlan, null, 2)}\n`);
    await writeFile(join(hermeticDestination, "package.json"), `${JSON.stringify(originalPackage, null, 2)}\n`);
    const resolvedHermeticSource = await realpath(hermeticSource);
    assertContained(resolvedRoot, resolvedHermeticSource, "hermetic source");
    await rm(resolvedHermeticSource, { recursive: true });
    execFileSync(process.execPath, ["scripts/validate-production-plan.mjs"], {
      cwd: hermeticDestination,
      env: {
        ...cleanBaseEnv(),
        PRODUCTION_PLAN_FIXTURE_MODE: "1",
        PRODUCTION_PLAN_SYNTHETIC_GIT_MODE: "1",
      },
      encoding: "utf8",
      stdio: "pipe",
    });
    cases.push("provisioned fixture remains hermetic after source removal");

    for (const id of ["CTL-001", "HK-001"]) {
      for (const [kind, candidate] of [
        ["missing", { workItems: [] }],
        ["duplicate", { workItems: [{ id }, { id }] }],
      ]) {
        const name = `${kind} exact ${id} fixture ID rejected`;
        try {
          exactItem(candidate, id);
          throw new Error(`${name}: exact-ID lookup unexpectedly passed`);
        } catch (error) {
          if (!String(error.message).includes(`fixture requires exactly one ${id}`)) {
            throw error;
          }
        }
        cases.push(name);
      }
    }

    const unclassifiedPlan = canonicalSeedPlan();
    fixtureHk(unclassifiedPlan).localFiles = ["package-lock.json"];
    try {
      fixtureReferenceClosure(unclassifiedPlan);
      throw new Error("unclassified fixture field unexpectedly passed");
    } catch (error) {
      if (!String(error.message).includes("unclassified fixture item field localFiles")) throw error;
    }
    cases.push("new local-reference field fails closed");

    for (const status of ["planned", "ready", "in_progress", "in_review", "complete"]) {
      const projection = structuredClone(fixtureHk(canonicalSeedPlan()));
      if (status === "complete") bindCompletion(projection, "9".repeat(40));
      else setIncompleteState(projection, status);
      const mustBeActive = active.has(status);
      const hasActiveRecords = Boolean(
        projection.protocol
        && projection.verificationReviews?.length
        && projection.authorityApproval
        && projection.independenceLimitations?.length
        && Array.isArray(projection.residualRisks),
      );
      if (projection.status !== status
        || mustBeActive !== hasActiveRecords
        || (status === "complete" && (
          !projection.completedAt
          || !projection.sourceCommit
          || projection.reviewer !== "verifier-agent"
        ))
        || (status !== "complete" && (
          projection.completedAt
          || projection.sourceCommit
          || projection.reviewer
        ))) {
        throw new Error(`${status} lifecycle projection is not explicit and schema-coupled`);
      }
      cases.push(`explicit ${status} lifecycle projection`);
    }

    const diagnosticsFrom = (stderr) => String(stderr ?? "")
      .split(/\r?\n/)
      .filter((line) => line.startsWith("- "))
      .map((line) => line.slice(2));
    const assertCompleteDiagnostics = (name, actual, expected) => {
      const fragments = Array.isArray(expected) ? expected : [expected];
      const unmatched = [...actual];
      for (const fragment of fragments) {
        const index = unmatched.findIndex((diagnostic) => diagnostic.includes(fragment));
        if (index === -1) {
          throw new Error(`${name}: missing diagnostic '${fragment}', got ${JSON.stringify(actual)}`);
        }
        unmatched.splice(index, 1);
      }
      if (unmatched.length || actual.length !== fragments.length) {
        throw new Error(`${name}: unexpected diagnostics ${JSON.stringify(unmatched)}; all ${JSON.stringify(actual)}`);
      }
    };
    const runFailure = async (name, mutate, expected, options = {}) => {
      const seed = options.seedStatus ? seedPlan(options.seedStatus) : canonicalSeedPlan();
      const candidate = structuredClone(seed);
      const base = structuredClone(seed);
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
        assertCompleteDiagnostics(name, diagnosticsFrom(error.stderr), expected);
      }
      cases.push(name);
    };
    const runExactFailure = async (name, mutate, expectedDiagnostics) => {
      const candidate = canonicalSeedPlan();
      const packageJson = structuredClone(originalPackage);
      mutate(candidate);
      await writeFile(planTarget, `${JSON.stringify(candidate, null, 2)}\n`);
      await writeFile(packageTarget, `${JSON.stringify(packageJson, null, 2)}\n`);
      const env = { ...process.env, PRODUCTION_PLAN_FIXTURE_MODE: "1" };
      delete env.PRODUCTION_PLAN_BASE_FILE;
      try {
        execFileSync(process.execPath, [scriptTarget], {
          cwd: root,
          env,
          encoding: "utf8",
          stdio: "pipe",
        });
        throw new Error(`${name}: validator unexpectedly passed`);
      } catch (error) {
        const actual = diagnosticsFrom(error.stderr).sort();
        const expected = [...expectedDiagnostics].sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `${name}: expected diagnostics ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          );
        }
      }
      cases.push(name);
    };
    const runSuccess = async (name, mutate, options = {}) => {
      const seed = options.seedStatus ? seedPlan(options.seedStatus) : canonicalSeedPlan();
      const candidate = structuredClone(seed);
      const base = structuredClone(seed);
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
    await runFailure("missing response", (p) => { delete fixtureCtl(p).protocol.architecture.response; }, "request and response");
    await runFailure("stale response", (p) => { fixtureCtl(p).protocol.verification.response.requestRevision = "stale"; }, "stale request");
    await runFailure("rejected response", (p) => { fixtureCtl(p).protocol.verification.response.decision = "rejected"; }, "response is not accepted");
    await runFailure("missing request", (p) => { delete fixtureCtl(p).protocol.verification.request; }, "request and response");
    await runFailure("missing response file", (p) => { fixtureCtl(p).protocol.verification.response.path = "docs/missing-response.md"; }, "path cannot be read");
    await runFailure("invalid request revision", (p) => { fixtureCtl(p).protocol.architecture.request.revision = "main"; }, [
      "revision must be a full commit SHA",
      "architecture response is bound to a stale request",
    ]);
    await runFailure("invalid response revision", (p) => { fixtureCtl(p).protocol.architecture.response.revision = "main"; }, "revision must be a full commit SHA");
    await runFailure("response digest mismatch", (p) => { fixtureCtl(p).protocol.architecture.response.sha256 = "0".repeat(64); }, "working-tree digest does not match");
    await runFailure("null verifier review", (p) => { fixtureCtl(p).verificationReviews = [null]; }, [
      "must be an object", "completion is not bound to a verifier review",
    ]);
    await runFailure("wrong verifier role", (p) => { fixtureCtl(p).verificationReviews[0].role = "architect"; }, "role must be verifier-agent");
    await runFailure("foreign verifier evidence", (p) => { fixtureCtl(p).verificationReviews[0].url = "https://github.com/o/r/commit/" + "a".repeat(40); }, "url must be immutable evidence");
    await runFailure("false human approval setting", (p) => { p.authorityModel.agentReviewsAreHumanApproval = true; }, "must not be represented as human approval");
    await runFailure("false owner decision setting", (p) => { p.authorityModel.ownerDecisionRequired = false; }, "owner decisions must remain required");
    await runFailure("false second-human setting", (p) => { p.authorityModel.independentHumanReviewRequired = true; }, "must not claim a second human");
    await runFailure("wrong agent roles", (p) => { p.authorityModel.requiredAgentRoles = ["implementer"]; }, "must be exactly architect");
    await runFailure("completion missing date isolated", (p) => { bindCompletion(fixtureCtl(p)); delete fixtureCtl(p).completedAt; }, "without a YYYY-MM-DD completedAt value");
    await runFailure("completion invalid source isolated", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).sourceCommit = "missing"; }, [
      "without an exact source commit",
      "without exact source-commit evidence",
      "not bound to a verifier review of sourceCommit",
      "not bound to owner approval of sourceCommit",
    ]);
    await runFailure("completion missing evidence isolated", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).evidence = []; }, [
      "evidence must be a non-empty array", "without exact source-commit evidence",
    ]);
    await runFailure("completion missing immutable evidence isolated", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).evidence = ["docs/production-readiness/README.md"]; }, "without exact source-commit evidence");
    await runFailure("completion missing source evidence", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).evidence = ["https://github.com/itecob/bridgepane-linux/actions/runs/1"]; }, "without exact source-commit evidence");
    await runFailure("completion mismatched review", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).verificationReviews.at(-1).reviewedCommit = "d".repeat(40); }, "not bound to a verifier review");
    await runFailure("completion mismatched approval", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).authorityApproval.reviewedCommit = "d".repeat(40); }, "not bound to owner approval");
    await runFailure("completion malformed evidence", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).evidence.push("../evidence"); }, "unsafe or mutable evidence");
    await runFailure("completion foreign evidence", (p) => { bindCompletion(fixtureCtl(p)); fixtureCtl(p).evidence = ["https://github.com/o/r/commit/" + "c".repeat(40)]; }, [
      "without exact source-commit evidence", "unsafe or mutable evidence",
    ]);
    await runFailure("mutated request", (p) => { fixtureCtl(p).protocol.architecture.request.revision = "changed"; fixtureCtl(p).protocol.architecture.response.requestRevision = "changed"; }, [
      "revision must be a full commit SHA", "mutates accepted protocol",
    ], { withBase: true });
    await runFailure("removed verifier record", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "in_review", "in_review");
      currentItem.verificationReviews = [];
    }, ["verificationReviews must be a non-empty array", "removes accepted verificationReviews"], { withBase: true });
    await runFailure("mutated owner approval", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "in_review", "in_review");
      currentItem.authorityApproval.date = "2026-07-28";
    }, "mutates owner authority approval", { withBase: true });
    await runFailure("completed approval date mutation", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "complete", "complete");
      currentItem.authorityApproval.date = "2026-07-28";
    }, "mutates owner authority approval", { withBase: true, seedStatus: "in_review" });
    await runFailure("completed approval URL mutation", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "complete", "complete");
      currentItem.authorityApproval.url = "https://github.com/itecob/bridgepane-linux/actions/runs/1";
    }, "mutates owner authority approval", { withBase: true, seedStatus: "complete" });
    await runFailure("completed approval commit mutation", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "complete", "complete");
      currentItem.authorityApproval.reviewedCommit = "d".repeat(40);
    }, ["not bound to owner approval of sourceCommit", "mutates owner authority approval"], { withBase: true, seedStatus: "complete" });
    await runFailure("completed package rebinding", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "complete", "complete");
      rebindCompletion(currentItem);
    }, "mutates owner authority approval", { withBase: true, seedStatus: "complete" });
    await runFailure("entering completion mismatched owner", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "in_review", "complete");
      currentItem.authorityApproval.reviewedCommit = "d".repeat(40);
    }, "not bound to owner approval", { withBase: true, seedStatus: "complete" });
    await runFailure("entering completion missing verifier", (p, _pkg, base) => {
      const { currentItem } = prepareTransition(p, base, "in_review", "complete");
      currentItem.verificationReviews = currentItem.verificationReviews.filter(
        (review) => review.reviewedCommit !== currentItem.sourceCommit,
      );
    }, "not bound to a verifier review", { withBase: true, seedStatus: "complete" });
    await runFailure("unknown dependency", (p) => { fixtureCtl(p).dependsOn = ["BAD-999"]; }, "unknown dependency");
    await runFailure("self dependency", (p) => { fixtureCtl(p).dependsOn = ["CTL-001"]; }, [
      "depends on itself", "dependency cycle includes CTL-001",
    ]);
    await runFailure("dependency cycle", (p) => {
      bindCompletion(fixtureHk(p));
      fixtureCtl(p).dependsOn = ["HK-001"];
      fixtureHk(p).dependsOn = ["CTL-001"];
    }, "dependency cycle includes");
    const configureDependencyCase = (candidate, dependencyStatus, dependentStatus) => {
      const dependency = fixtureHk(candidate);
      const dependent = fixtureCtl(candidate);
      dependency.dependsOn = [];
      dependency.references = ["package-lock.json"];
      if (dependencyStatus === "complete") bindCompletion(dependency, "f".repeat(40));
      else setIncompleteState(dependency, dependencyStatus);
      dependent.dependsOn = ["HK-001"];
      if (dependentStatus === "complete") bindCompletion(dependent, "d".repeat(40));
      else setIncompleteState(dependent, dependentStatus);
    };
    for (const dependencyStatus of ["planned", "ready"]) {
      for (const dependentStatus of ["in_progress", "complete"]) {
        const name = `${dependencyStatus} dependency blocks ${dependentStatus} dependent`;
        await runExactFailure(name, (candidate) => {
          configureDependencyCase(candidate, dependencyStatus, dependentStatus);
        }, [
          `CTL-001 is ${dependentStatus} while dependency HK-001 is ${dependencyStatus}`,
        ]);
      }
    }
    for (const dependentStatus of ["in_progress", "complete"]) {
      await runSuccess(`complete dependency permits ${dependentStatus} dependent`, (candidate, base) => {
        configureDependencyCase(candidate, "complete", dependentStatus);
        configureDependencyCase(base, "complete", dependentStatus);
      });
    }
    await runFailure("unnamed owner", (p) => { fixtureCtl(p).owner = "unassigned"; }, "without one named accountable owner");
    await runFailure("invalid completion", (p) => { fixtureCtl(p).status = "complete"; fixtureCtl(p).reviewer = "itecob"; }, "without a separate verifier role");
    await runFailure("illegal transition", (p, _pkg, base) => {
      prepareTransition(p, base, "complete", "in_review");
    }, "illegal transition complete -> in_review", { withBase: true, seedStatus: "complete" });
    await runFailure("weakened blocker", (p, _pkg, base) => { fixtureCtl(base).releaseBlocker = true; fixtureCtl(p).releaseBlocker = false; }, "weakens releaseBlocker", { withBase: true });
    await runFailure("weakened criteria", (p, _pkg, base) => { fixtureCtl(base).acceptanceCriteria.push("must remain"); }, "weakens acceptanceCriteria", { withBase: true });
    await runFailure("weakened evidence", (p, _pkg, base) => { fixtureCtl(base).evidenceRequired.push("must remain"); }, "weakens evidenceRequired", { withBase: true });
    await runFailure("duplicate item", (p) => { p.workItems.push(structuredClone(fixtureCtl(p))); }, "duplicate work-item id");
    await runFailure("duplicate phase", (p) => { p.phases.push(structuredClone(p.phases[0])); }, [
      "duplicate phase id", "duplicate phase order",
    ]);
    await runFailure("duplicate phase order", (p) => { p.phases[1].order = 0; }, [
      "duplicate phase order",
      "found 2 at index 1",
      "found 3 at index 2",
      "found 4 at index 3",
      "found 5 at index 4",
      "found 6 at index 5",
    ]);
    await runFailure("missing local reference", (p) => { fixtureCtl(p).references = ["docs/missing.md"]; }, "references missing local path");
    await runFailure("missing local evidence", (p) => { fixtureCtl(p).status = "complete"; fixtureCtl(p).reviewer = "verifier-agent"; fixtureCtl(p).completedAt = "2026-07-27"; fixtureCtl(p).sourceCommit = "a".repeat(40); fixtureCtl(p).evidence = ["docs/missing-evidence.md", "https://github.com/o/r/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]; }, [
      "without exact source-commit evidence",
      "not bound to owner approval of sourceCommit",
      "references missing local path docs/missing-evidence.md",
      "unsafe or mutable evidence",
    ]);
    await runFailure("unsafe path", (p) => { fixtureCtl(p).references = ["../outside"]; fixtureCtl(p).protocol.architecture.request.path = "../outside"; }, [
      "architecture.request.path is unsafe", "unsafe local reference ../outside",
    ]);
    await runFailure("URL used as local reference", (p) => { fixtureCtl(p).references = ["https://example.com/doc"]; }, "unsafe local reference");
    const assignUniqueIssues = (candidate) => candidate.workItems.forEach((item, index) => {
      item.issue = `https://github.com/itecob/bridgepane-linux/issues/${index + 1}`;
    });
    await runFailure("GOV-002 issue gate", (p) => {
      assignUniqueIssues(p);
      const gov = exactItem(p, "GOV-002");
      bindCompletion(gov);
      delete gov.issue;
    }, "GOV-002 lacks exactly one repository tracking issue");
    await runFailure("foreign issue URLs", (p) => {
      assignUniqueIssues(p);
      const gov = exactItem(p, "GOV-002");
      bindCompletion(gov);
      gov.issue = "https://github.com/o/r/issues/1";
    }, "GOV-002 lacks exactly one repository tracking issue");
    await runFailure("shared issue URL", (p) => {
      assignUniqueIssues(p);
      const gov = exactItem(p, "GOV-002");
      bindCompletion(gov);
      gov.issue = exactItem(p, "CTL-001").issue;
    }, "GOV-002 shares tracking issue");
    await runFailure("earlier-phase blocker gate", (p) => {
      setIncompleteState(exactItem(p, "SEC-001"), "ready");
    }, "ahead of earlier blockers");
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
    for (const seedStatus of ["in_review", "complete"]) {
      for (const [before, afterSet] of Object.entries(legalTransitions)) {
        for (const after of afterSet) {
          const suffix = seedStatus === "in_review" ? "" : " from complete seed";
          await runSuccess(`legal transition ${before} -> ${after}${suffix}`, (candidate, base) => {
            prepareTransition(candidate, base, before, after);
          }, { seedStatus });
        }
      }
    }

    const completePlan = structuredClone(plan);
    const ctl = fixtureCtl(completePlan);
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
    fixtureCtl(strengthened).acceptanceCriteria.push("fixture criterion must remain");
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

    if (process.env.PRODUCTION_PLAN_SKIP_VARIANCE_MATRIX !== "1") {
      const variants = [];
      const plannedVariant = structuredClone(plan);
      variants.push(["planned", plannedVariant]);
      const readyVariant = structuredClone(plan);
      const readyHk = fixtureHk(readyVariant);
      setIncompleteState(readyHk, "ready");
      readyHk.references = ["package-lock.json"];
      variants.push(["ready", readyVariant]);
      const completeVariant = structuredClone(plan);
      const completeHk = fixtureHk(completeVariant);
      bindCompletion(completeHk, "8".repeat(40));
      completeHk.references = ["package-lock.json"];
      variants.push(["complete", completeVariant]);

      let expectedInventory = null;
      for (const [status, variant] of variants) {
        const variantRoot = join(
          root,
          `bridgepane-plan-fixtures-source-${status}`,
        );
        await mkdir(variantRoot);
        await provisionFixture(sourceRoot, variantRoot, variant);
        await writeFile(
          join(variantRoot, planPath),
          `${JSON.stringify(variant, null, 2)}\n`,
        );
        await writeFile(
          join(variantRoot, "package.json"),
          `${JSON.stringify(originalPackage, null, 2)}\n`,
        );
        const variantEnv = {
          ...process.env,
          PRODUCTION_PLAN_FIXTURE_MODE: "1",
          PRODUCTION_PLAN_SKIP_VARIANCE_MATRIX: "1",
          PRODUCTION_PLAN_EMIT_CASE_INVENTORY: "1",
        };
        delete variantEnv.PRODUCTION_PLAN_BASE_FILE;
        delete variantEnv.PRODUCTION_PLAN_BASE_REF;
        const output = execFileSync(
          process.execPath,
          ["scripts/validate-production-plan.mjs", "--self-test"],
          {
            cwd: variantRoot,
            env: variantEnv,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        const match = output.match(/Production-plan case inventory: (\[[^\n]+\])/);
        if (!match) throw new Error(`${status} source variance omitted case inventory`);
        const inventory = JSON.parse(match[1]);
        expectedInventory ??= inventory;
        if (JSON.stringify(inventory) !== JSON.stringify(expectedInventory)) {
          throw new Error(
            `${status} source variance changed fixture inventory`,
          );
        }
        cases.push(`full suite with source HK-001 ${status}`);
      }
    }
  } finally {
    const cleanupRoot = await realpath(root);
    if (cleanupRoot !== resolvedRoot
      || path.dirname(cleanupRoot) !== temporaryParent
      || !path.basename(cleanupRoot).startsWith("bridgepane-plan-fixtures-")) {
      throw new Error("refusing to clean an unverified fixture root");
    }
    await rm(cleanupRoot, { recursive: true });
  }
  if (process.env.PRODUCTION_PLAN_EMIT_CASE_INVENTORY === "1") {
    console.log(`Production-plan case inventory: ${JSON.stringify(cases)}`);
  }
  console.log(`Production-plan fixtures passed: ${cases.length}`);
}

if (process.argv.includes("--self-test") && failures.length === 0) await runSelfTests();
