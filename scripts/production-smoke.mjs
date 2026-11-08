import assert from "node:assert/strict";

const baseUrl = (process.env.TMS_PRODUCTION_URL || "https://teacher-management-system-nine.vercel.app").replace(/\/$/, "");
const timeout = 15000;

async function request(path) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    signal: AbortSignal.timeout(timeout),
    headers: { "user-agent": "tms-production-smoke/1.0" }
  });
  return { response, body: await response.text() };
}

const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}

await check("public sign-in page", async () => {
  const { response, body } = await request("/auth/sign-in");
  assert.equal(response.status, 200);
  assert.match(body, /Masuk ke workspace/);
});

await check("unauthenticated workspace is redirected to sign-in", async () => {
  const { response, body } = await request("/workspace/reports");
  assert.ok([302, 307].includes(response.status), `expected a sign-in redirect, received ${response.status}`);
  assert.match(response.headers.get("location") || "", /auth\/sign-in/);
});

await check("production database and auth health", async () => {
  const { response, body } = await request("/api/health");
  assert.equal(response.status, 200);
  const health = JSON.parse(body);
  assert.equal(health.status, "ok");
  assert.equal(health.checks?.database, "connected");
  assert.equal(health.checks?.auth, "configured");
});

await check("report API rejects unauthenticated access", async () => {
  const { response, body } = await request("/api/reports?type=students");
  assert.equal(response.status, 401, body.slice(0, 300));
});

await check("registry API rejects unauthenticated access", async () => {
  const { response, body } = await request("/api/registry/teachers");
  assert.equal(response.status, 401, body.slice(0, 300));
});

await check("onboarding status rejects unauthenticated access", async () => {
  const { response, body } = await request("/api/onboarding/status");
  assert.equal(response.status, 401, body.slice(0, 300));
});

await check("report API validates report type", async () => {
  const { response } = await request("/api/reports?type=not-a-report");
  assert.equal(response.status, 400);
});

process.stdout.write(`\nTMS production smoke: ${checks.length}/${checks.length} checks passed.\n`);
