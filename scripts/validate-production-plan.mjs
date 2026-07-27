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
const fixtureMode = process.env.PRODUCTION_PLAN_FIXTURE_MODE === "1"
  && path.basename(process.cwd()).startsWith("bridgepane-plan-fixtures-")
  && process.cwd().startsWith(tmpdir());
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

let plan;
try {
  plan = JSON.parse(await readFile(planPath, "utf8"));
} catch (error) {
  console.error(`Could not parse ${planPath}: ${error.message}`);
  process.exit(1);
}

let basePlan = null;
let baseRevision = null;
if (process.env.PRODUCTION_PLAN_BASE_FILE) {
  try {
    basePlan = JSON.parse(await readFile(process.env.PRODUCTION_PLAN_BASE_FILE, "utf8"));
    baseRevision = "fixture-file";
  } catch (error) {
    console.error(`Could not load production-plan base file: ${error.message}`);
    process.exit(1);
  }
} else {
  const candidate = process.env.PRODUCTION_PLAN_BASE_REF
    || (process.env.GITHUB_EVENT_NAME === "pull_request" ? "HEAD^1" : "HEAD^");
  try {
    baseRevision = execFileSync("git", ["rev-parse", "--verify", `${candidate}^{commit}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    basePlan = JSON.parse(execFileSync("git", ["show", `${baseRevision}:${planPath}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }));
  } catch (error) {
    if (fixtureMode) {
      basePlan = null;
      baseRevision = "fixture-bootstrap";
    } else {
      try {
        baseRevision ||= execFileSync("git", ["rev-parse", "--verify", `${candidate}^{commit}`], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim();
      } catch {
        console.error(`Could not resolve mandatory production-plan base ${candidate}`);
        process.exit(1);
      }
      if (baseRevision !== bootstrapBase) {
        console.error(`Could not load mandatory production-plan base ${baseRevision}:${planPath}`);
        process.exit(1);
      }
      console.log(`Production-plan bootstrap exception: ${planPath} is absent from exact base ${bootstrapBase}.`);
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
  if (!fixtureMode && fullSha.test(document.revision ?? "")) {
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  console.log(`Production-plan fixtures passed: ${cases.length}`);
}

if (process.argv.includes("--self-test") && failures.length === 0) await runSelfTests();
