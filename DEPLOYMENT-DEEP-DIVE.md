# Deployment Deep-Dive — The Moat (build → container → URL → verify)

**Created:** 2026-05-26 | **Scope:** V2 backend (`Produsa-ai`, fresh clone `/root/produsa-ai-chatfix`), shared by both produsa.app and fatline-studio frontends.
**Question:** How does a user's *generated app* go from built artifacts → a live URL → verified — and where does it break?

> This is the thread where Lovable/Emergent stall and where Produsa can win. The architecture is genuinely clever; the implementation is half-dead in the places that matter.

---

## TL;DR

1. **There are two deploy paths and only one is real.** The production path is **automatic** — it runs at the end of a production build inside `_finalizeBuild`. The **"Ship" button** (`POST /deploy`, used by both Studio.jsx and fatline-studio) calls the **legacy VPS `Deployer.deploy()`** path, which is mostly `isECS`-skipped, points DNS at a **dead Hostinger IP**, and crashes on its own error path.
2. **Apps are served as static HTML out of Postgres, keyed by Host header, by one shared Express server.** There is no per-app container for page loads. This is the moat (instant, zero cold-start, trivially scalable) — and the single biggest thing competitors can't match cheaply.
3. **The chain that turns that into a real `<slug>.produsa.app` subdomain is incoherent:** three different slug/domain implementations, a CNAME target (`multitenant-router.produsa.app`) that is defined nowhere in the repo, and a 100%-pass smoke gate whose strongest check (browser render) is silently skipped if chromium isn't in the image.

---

## 1. The happy path, end to end (the AUTO path — what production actually uses)

```
POST /api/projects/:id/build/production        orchestrator.js:5674
  └─ preflight gate (discovery/integrations)   :5682
  └─ buildLockManager.acquire(projectId)        :5698
  └─ transitionStage → 'building'               :5963
  └─ runTasks(...) async ─────────────────────► build runs
        └─ _finalizeBuild(projectId, io)        :1793 / def :3037
              ├─ npmInstall + dep reconcile      :3094
              ├─ extractAgentOutputsToDisk        :3108  (===FILE: blocks → /data/apps/<id>/)
              ├─ validatePrototypeCompleteness    :3123
              ├─ snapshotAssets + progress=100    :3211
              ├─ runDeploy()  (deployRunner.js:74)
              │     └─ bundleManifestHTML         manifestBundler.js:334  (reads build_tasks / prototype_pages from DB)
              │     └─ atomic DB write: prototype_index_html + subdomain   deployRunner.js:163
              │     └─ on ECS: STOP (skips stage transition)               :200
              └─ AUTO-DEPLOY BLOCK                 orchestrator.js:3246
                    ├─ emit project:deploy_started :3250
                    ├─ [manifest branch] generateSubdomainSlug → bundleManifestHTML
                    │     └─ provisionSubdomain(id, name)   :3334  → projectSubdomainManager.js:210
                    │     │     └─ CF CNAME <slug>.produsa.app → multitenant-router.produsa.app   :111
                    │     │     └─ claim projects.subdomain (atomic)        :209
                    │     └─ runDeploySmoke(id, appUrl)      :3344  ◄── HARD GATE (100% pass)
                    │     └─ stage='live' + upsert apps row  :3377
                    │     └─ emit project:deployed + build:production_complete  :3394
                    └─ finally: if still 'building' → force deploy_failed     :3610
```

**Live URL the user actually gets** (deployRunner v1): `https://proto.produsa.app/proto/p/<id>` — a path on a shared host, served by `routes/proto.js:53` (another DB column read). True per-subdomain routing is explicitly deferred (`deployRunner.js:18` → `aws-infra/SUBDOMAIN-WILDCARD-TODO.md`).

## 2. The serving model (the key insight)

**When a deployed app loads, nothing is "running." A column is read.**

- Inbound request → `middleware/subdomainRouter.js` (registered `server.js:205`) matches `^<slug>.produsa.(dev|app)$`, looks up the project (4 fallback queries: `projects.subdomain` → `metadata->>'subdomain'` → name-slug → `apps.subdomain`), sets `req.deployedProject`.
- `server.js:227` dispatches:
  - `/api/*` → `projectRunner.handle()` — **only here** does an app get a forked Node child (`fork()` `projectRunner.js:290`, port `5300+(id%1000)`), and only if `/data/apps/<id>/src/server.js` exists.
  - everything else → `servePublicApp()` (`routes/public-app.js`): returns `projects.manifest_html` (.app) or `projects.prototype_index_html` (.dev) — a self-contained Babel-CDN React SPA string, straight from Postgres.

So: **static HTML by hostname, served from the DB by one shared Express app.** Optional forked child for API routes; optional Cloudflare Pages build (`reactBuilder.js:381`) as a *separate* `*.pages.dev` URL.

**Why this is the moat:** no per-app container to cold-start, no orchestration, no per-app cost, instant "deploy" (it's a DB write), scales to thousands of apps on one box. Lovable/Emergent burn money and latency spinning up infra per project; Produsa serves a row. *If* the routing/DNS layer were coherent, this is a structural cost-and-speed advantage.

## 3. Where it breaks (ranked)

### A. Concrete bugs (fix these first)

1. **`emit()` ReferenceError on the build-gate failure path** — `deployer.js:254,267` call `emit(...)`, but only `this.emitStep` exists in `Deployer.deploy()`. When an app's `npm run build` fails, the first thing the handler does is throw `ReferenceError: emit is not defined` — *before* writing the sanitized `deploy_failed` reason at `:269`. Result: the real compile error is masked behind a generic "Deploy service error," and the intended failure metadata is never persisted. **This is the single clearest bug.**

2. **The "Ship" button hits the dead VPS path.** Both `Studio.jsx:4379` and `fatline-studio/src/lib/api.js:211` call `POST /api/projects/:id/deploy {approved:true}` → `deploy.js:44` → `Deployer.deploy()`. On ECS that path is mostly `isECS`-skipped, **creates a CF A-record to `187.77.189.126` (the decommissioned Hostinger VPS)** with a **hardcoded zone id** (`deployer.js:442,452`), and logs the wrong domain (`.dev` while creating `.app`, `:459`). So a manual Ship on ECS either no-ops or writes a DNS record to a dead box. The *real* deploy already happened automatically in `_finalizeBuild`.

3. **`/deploy/status` can report `not_deployed` for a live app.** The status route reads `apps.deploy_status/deployed_url` (`deploy.js:130`) — columns written by `Deployer.deploy()` (`deployer.js:691`). The **ECS auto-deploy path upserts a *different* shape** (`ON CONFLICT (project_id)`, `orchestrator.js:3388`) and never writes `deploy_status`. So an app that is `stage='live'` and serving fine can show "not deployed" to the user polling status.

### B. Structural / DNS gaps

4. **The CNAME target is defined nowhere.** `projectSubdomainManager.js:22` points every subdomain at `multitenant-router.produsa.app`. That hostname has no DNS-creation code and no definition in this repo. **If it doesn't resolve to the live ALB/API, every CNAME-provisioned subdomain is dead at the DNS layer.** → needs a runtime `dig` to confirm. This is the highest-leverage unknown.

5. **Three slug/domain implementations disagree.** `projectSubdomainManager` (→ `produsa.app`, hashes for uniqueness, checks `projects.subdomain`) vs `deployer.generateSlug` (different algorithm, checks `apps.subdomain`) vs `projectProvisioning` (claims `*.app.produsa.dev`). Different algorithms + different columns ⇒ the slug in the estimate can differ from the deployed one, and the domain suffix is inconsistent. (`projectDomain.js:17`: id ≤ 227 → `.dev`, id > 227 → `.app`.)

6. **Reserved-word check is one-sided.** Router rejects `api/www/proto/...` (`subdomainRouter.js:14`) but no allocator consults that list — a project named "api" can claim a slug the router then refuses to resolve.

### C. Verification gaps

7. **Blank-SPA passes smoke when chromium is absent.** Smoke requires 100% pass (`deploySmokeRunner.js:531`). The only render-level check is Phase 3 Playwright, and "chromium not installed" is swallowed to `[]` (`:522`). A Babel-CDN SPA that throws at runtime still returns a >1KB HTML shell → `landing_page` passes on size+content-type → deploy goes `live` **blank**. → needs confirmation that chromium is actually in the ECS image.

8. **No deploy sweeper — `deploy_failed` is terminal.** `instant-build-sweeper.js` only auto-retries `building_instant` (`:74`). Nothing recovers `deploy_failed`; the only path back is a human clicking `retry-deploy` (`orchestrator.js:6335`). A transient DNS/cold-start failure strands the project permanently.

9. **Swallowed infra steps leave no durable trace.** In the VPS path, DB-schema-create, CF DNS, nginx, SSL all catch-and-continue with `steps[]` entries that are **never persisted to DB** (`deployer.js:152,461,524,563`). A deploy can be declared `success` while DNS/TLS/schema silently failed.

10. **Stub-router masking.** Missing backend files are auto-stubbed to return `{status:'stub'}` (`deployer.js:213`); smoke accepts `[200,204,401]`, a stub returns 200 → a hollow backend passes smoke and goes "live."

---

## 4. The moat verdict

The serve-from-Postgres model is a real, defensible advantage — **the build→URL step that kills competitors is, for Produsa, a DB write.** But today it's gated by:
- a "Ship" button wired to a dead legacy path (#2),
- a DNS target that may not resolve (#4),
- a render check that may be silently off (#7),
- and no automatic recovery (#8).

The win condition is **collapsing to one coherent path:** Ship button → the same auto-deploy logic; one slug/domain authority; a confirmed wildcard/CNAME target; chromium guaranteed in the image; a deploy sweeper mirroring the build sweeper.

---

## 5. Recommended next actions (none deploy anything)

1. **Runtime DNS check (read-only):** `dig multitenant-router.produsa.app` and `dig <a-known-live-slug>.produsa.app` — confirm whether CNAME-provisioned subdomains resolve. Resolves the #4 unknown.
2. **Confirm chromium in ECS image** (Dockerfile / `playwright-core` install) — resolves #7.
3. **Fix #1 (`emit` ReferenceError)** — tiny, safe, high-value; surfaces real build-failure reasons. Branch only, approval before merge.
4. **Decide the Ship-button question (#2):** repoint `POST /deploy` at the auto-deploy logic, or remove the button and rely on auto-deploy. Product decision for Fatman.
5. **Unify slug/domain authority (#5)** — one module owns subdomain allocation.
