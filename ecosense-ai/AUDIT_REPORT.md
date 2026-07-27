# EcoSense AI — Code Audit Report

**Date:** 27 July 2026
**Scope:** Full repository — Django backend (~17k LOC, 12 apps), React frontend (~55 files), Solidity contract, Docker/nginx/CI.
**Method:** Static read-through of application code, config, and infrastructure. No code changed yet (report-first).

---

## 1. Executive summary

EcoSense AI is an ambitious, well-structured multi-tenant platform for digitising Kenyan Environmental Impact Assessments. The **architecture and the data-ingestion layer are genuinely strong** — real integrations with Google Earth Engine, NASA POWER, GBIF, USGS and OpenWeather, plus a solid Django/DRF layout and a functional PDF/DOCX report renderer.

However, the audit surfaced **serious problems in three categories**:

1. **Security — several critical, exploitable flaws.** A payment-bypass that grants free credits, broken multi-tenant isolation (users can read/write other tenants' data), a privilege-escalation path (any user can make themselves admin), unauthenticated payment/IoT/SMS webhooks, and CORS wide open with credentials. These are not theoretical — they are directly reachable from authenticated or public endpoints.

2. **Product substance — the flagship "AI" features are largely faked.** The AI impact-prediction model is trained circularly on 60 rows of random synthetic data (and no model file even ships, so it silently falls back to hardcoded heuristics), the compliance engine hardcodes "passed" on ~15 of ~20 rules, and the "blockchain audit trail" fabricates fake transaction hashes by default. The report renderer is real but is filled with these fabricated inputs.

3. **Operational readiness — the app cannot scale as configured.** Celery is forced into synchronous (`ALWAYS_EAGER`) mode in production, so heavy work (PDF rendering, ML, external API calls) blocks web workers; there is no cache backend, notable N+1 queries, no TLS in the nginx prod config, and near-zero tests on the business-critical modules.

**Bottom line on "does it solve a real-world problem":** The *workflow* it targets is real and valuable, and the baseline/reporting spine genuinely addresses it. But as it stands this is a **polished demo/prototype, not a production-ready product** — the differentiating "intelligence" is façade, and the security posture would not survive contact with real users or real money. The good news is the bones are sound; most issues are fixable without re-architecting.

### Severity tally

| Severity | Count | Examples |
|---|---|---|
| **Critical** | 5 | Payment bypass, broken tenant isolation, privilege escalation, Celery eager in prod, fake ML shipped as real |
| **High** | 13 | IDOR across apps, unauthenticated webhooks, amount tampering, CORS+credentials, tokens in localStorage, N+1s, no TLS |
| **Medium** | ~18 | SSRF in PDF gen, stored XSS, token in URL, missing indexes, no cache, data-loss bug, root containers |
| **Low/Info** | ~15 | Floating pragma, dead deps, AI-noise comments, prod sourcemaps, weak dev passwords |

---

## 2. CRITICAL findings (fix before any real deployment)

### C-1 — Payment bypass grants unlimited free credits
`backend/apps/billing/views.py:44-60` (`TransactionStatusView`)
Any authenticated user can call `GET /api/v1/billing/status/<pk>/?simulate=true`, which runs `txn.complete()` and credits the tenant with no payment. Combined with C-2, the exploit is: create a pending transaction → "simulate" it → unlimited free report credits. `mpesa.py` also mocks payment entirely (`verify_payment` always returns `True`).
**Fix:** Remove the `simulate` branch. Grant credits only from a verified, server-authenticated M-Pesa callback (validated `CheckoutRequestID` + amount reconciliation).

### C-2 — Multi-tenant isolation is effectively disabled platform-wide
`backend/core/models.py:61-75` (`TenantManager`); no tenant middleware in `settings.py`.
The tenant filter only applies when a thread-local `tenant_id` is set, but it is set in exactly one place (login, `accounts/views.py:199`) and never cleared. For every normal JWT request the thread-local is `None`, so `Model.objects` does **no tenant filtering at all**. Worse, the sticky thread-local can leak a value between unrelated requests on reused worker threads. Isolation currently depends entirely on per-view discipline — which several views omit (see H-1, H-2).
**Fix:** Add authentication middleware that calls `set_tenant_id(request.user.tenant_id)` after auth and `clear_tenant_id()` in a `finally`/`process_response`.

### C-3 — Privilege escalation via self-service profile update
`backend/apps/accounts/serializers.py:29-45` + `views.py:139-157`
`UserSerializer` omits `role` and `is_active` from `read_only_fields`, and the profile endpoint saves with `partial=True`. Any user can `PATCH /auth/me/update/` with `{"role": "admin"}` (or `nema_regulator`) to escalate — becoming a tenant admin or a regulator who can approve reports.
**Fix:** Add `role`, `is_active`, `nema_registration_no` to `read_only_fields`; change roles only via an admin-guarded endpoint.

### C-4 — Celery forced synchronous (`ALWAYS_EAGER`) in production
`backend/core/settings.py:206` and again `:246`
Every `.delay()` runs synchronously inside the web request thread. Baseline generation, ML inference, WeasyPrint PDF rendering, NLP, and blockchain writes all block gunicorn workers — the entire Celery/Redis setup is defeated and the app will fall over under load. (Report generation is worse: `reports/views.py:46` calls the work **directly**, not even via `.delay()`, then returns a fake `"task_id": "local-success"`.)
**Fix:** Set `CELERY_TASK_ALWAYS_EAGER = False` in production; keep eager only in `settings_dev.py`. Ensure a real worker is deployed and make report generation a genuine async task with a status endpoint.

### C-5 — "AI/ML" flagship features are fabricated, not real
Multiple files (see Section 5 for evidence).
- **Impact prediction** (`predictions/ml/engine.py`, `training/sample_data.py`, `ml/train.py`): XGBoost trained on 60 rows of random synthetic data whose labels are hardcoded if/else rules; the probability targets are literally `np.random.uniform(...)`. No model `.pkl` ships, so runtime silently falls back to a ~10-line hardcoded heuristic with `confidence = 0.85` hardcoded and static dummy features.
- **Compliance engine** (`compliance/engine.py:118-300`): ~15 of ~20 rules unconditionally set `status = "passed"` with pre-written "evidence", so the compliance grade is near-guaranteed high regardless of the project.
- **Blockchain** (`esg/blockchain.py:96-103`): with no keys (the default), fabricates `tx_hash = "mock_tx_0x..."` and a hardcoded `block_number = 40561234`, persisting fake "confirmed" transactions.
**Fix (product decision required):** Either build/ship real models and real on-chain writes, or **re-frame honestly** — market the prediction layer as a "rules-based expert system" and remove/clearly-label the blockchain claim. Shipping fabricated compliance verdicts and fake audit hashes to clients is a legal/reputational risk in a regulatory product.

---

## 3. HIGH findings

**Backend security**

- **H-1 — Cross-tenant IDOR in report & project viewsets.** `reports/views.py:491-502` (`ReportSectionViewSet`) and `projects/views.py:11-52` (`ProjectDocumentViewSet`, `ProjectMediaViewSet`) scope only by URL `project_id`, never by tenant, so any user can read/write another tenant's report sections, statutory documents (title deeds, licenses), and media, and trigger AI generation on them. **Fix:** filter `project__tenant_id=request.user.tenant_id` in `get_queryset`; assert tenant ownership in `perform_create`.
- **H-2 — Missing object-permission checks in site_visit.** `site_visit/views.py` `FieldMeasurementView`, `SitePhotoView`, `PublicNoticeView`, `PublicSubmissionView` declare `IsSameTenant` but never call `check_object_permissions`, exposing/altering other tenants' field data, photos, notices and submitter PII. **Fix:** call `check_object_permissions` on the resolved project or filter by tenant.
- **H-3 — Amount/credits tampering.** `billing/views.py:10-30` takes `amount` and `credits` straight from the request body with no price validation (`amount=1, credits=1000`). **Fix:** derive amount from a server-side price table.
- **H-4 — Unauthenticated IoT ingestion.** `emp/views.py:24-48` (`AllowAny`, `@csrf_exempt`) lets anyone POST forged sensor readings, triggering false breach alerts (SMS + audit writes) or masking real breaches. **Fix:** per-device HMAC/shared secret or mTLS.
- **H-5 — Unauthenticated/unsigned SMS webhooks.** `community/views.py:123-138` and `site_visit/views.py:361-394` accept spoofed public-participation submissions attributed to any project. **Fix:** verify provider signature + source-IP allowlist.
- **H-6 — CORS wildcard with credentials.** `settings.py:43-44` sets `CORS_ALLOW_ALL_ORIGINS = True` **and** `CORS_ALLOW_CREDENTIALS = True`, overriding the allowlist. Any origin can make credentialed requests. **Fix:** delete the wildcard line.

**Backend performance**

- **H-7 — N+1 on project list.** `projects/serializers.py:65-98` runs ~5 extra queries per project (counts + related lookups) → ~100 queries per 20-item page. Only 2 uses of `select_related`/`prefetch_related` exist in the whole backend. **Fix:** prefetch relations / annotate counts.
- **H-8 — No cache backend despite Redis.** No `CACHES` setting exists, so the login rate-limiter falls back to per-process memory (not shared across workers → bypassable) and Redis is unused for caching. **Fix:** configure `django-redis`.

**Frontend security**

- **H-9 — JWT access + refresh tokens in localStorage.** `store/authStore.js:4-24`, `api/axiosInstance.js`. Any XSS or compromised npm dep can exfiltrate long-lived credentials. **Fix:** refresh token in httpOnly Secure SameSite cookie; access token in memory only.
- **H-10 — Access token leaked in URL.** `pages/projects/ReportPage.jsx:77-78` opens the preview with `?token=<JWT>` (also currently broken — the header is never set). Token lands in history/logs/Referer. **Fix:** authenticated fetch → blob URL, or short-lived signed preview token.
- **H-11 — Broken token-refresh URL.** `api/axiosInstance.js:5-7,88` builds `.../api/v1//auth/refresh/` (double slash) → likely 404, breaking session refresh in production. **Fix:** correct URL join.

**Contracts / infra**

- **H-12 — No access control on the "immutable" audit trail.** `contracts/EcoSenseAudit.sol:17-20` — `recordEvent` is public; anyone can forge/flood events for any project. Immutability holds, integrity does not. **Fix:** OpenZeppelin `AccessControl` with a `RECORDER_ROLE`.
- **H-13 — No TLS in production nginx + `appleboy/ssh-action@master`.** `nginx/prod.conf` only listens on 80 (all `/admin/` and JWT traffic is plaintext); `deploy.yml:87` pins a deploy action to a mutable `@master` ref while holding SSH secrets. **Fix:** add a 443 TLS block + 80→443 redirect; pin the action to a commit SHA.

---

## 4. MEDIUM findings (condensed)

**Backend:** SSRF + no timeout in PDF annex fetch and a `lstrip('/media/')` path bug (`reports/generators/pdf_generator.py:55-63`); WeasyPrint fetches remote resources with no `url_fetcher` restriction (SSRF/local-file read); stored XSS in f-string-built public HTML (`community/views.py:190-224`); JWT accepted in URL query for preview; refresh tokens never actually rotated/blacklisted (`accounts/views.py:259-311`); `ALLOWED_HOSTS` defaults to `["*"]`; unrestricted file uploads (no MIME/size/extension checks); missing DB indexes on frequently-filtered fields (`device_id`, `status`, `category`, `severity`, etc.); broad `except Exception` swallowing that turns real failures into valid-looking "warning"/`None` results; a **500 on every invite acceptance** (`accounts/views.py:439-444` references undefined `user_data`/`tokens`) and `UpdateProfileView` defined twice.

**Frontend:** stored Quill HTML → HTML preview is a stored-XSS path (sanitize server-side + CSP); Mapbox token rendered into the DOM; auth is client-side only with no role-gating on privileged buttons; **data loss** — switching report sections discards unsaved edits with no autosave/dirty warning (`ReportEditorPage.jsx:188-192`); stale-closure polling that freezes "Generating…" on a transient error (`ReportPage.jsx:32-49`); split auth-state source of truth (store vs manual localStorage writes).

**Infra:** containers run as root (all Dockerfiles); no healthchecks / ungated `depends_on` in prod compose (boot races); no nginx security headers and no Django `SECURE_*`/HSTS/secure-cookie settings; two overlapping CI pipelines with conflicting deploy strategies (one builds images on the prod host over SSH).

---

## 5. LOW / informational (condensed)

Solidity: floating pragma vs pinned compiler; event fields not `indexed`; full strings stored on-chain (use `bytes32` for the hash); **deploy target is dead** (Polygon Mumbai was decommissioned — migrate to Amoy). Backend: leftover one-off/demo scripts committed to `backend/` root (`create_test_projects.py`, `diag_visibility.py`, `regenerate_reports.py`, `harden_submission_data.py`, `run_professional_demo.py`, `simulate_*.py`, plus a committed `simulation_report.txt`); pervasive AI-generated "word-salad" docstrings; `pickle.load` of local artifacts. Frontend: **no tests exist** despite full Vitest tooling; unused heavy deps (`three`, `@react-three/fiber`, all `@deck.gl/*` — none imported); zod present but used in only one form (`RegisterPage` never checks `confirm_password` matches); prod sourcemaps enabled (`vite.config.js`); `alert()`-driven error handling throughout; unmemoized global `MapContext` value forcing app-wide re-renders. Infra: images tag-pinned not digest-pinned; `npm install` instead of `npm ci`; `collectstatic ... || true` masks failures; weak dev/CI DB passwords.

---

## 6. Product-viability verdict

**Real and valuable:** the environmental baseline data layer (real GEE + NASA/GBIF/USGS/OpenWeather), the multi-tenant Django structure, and the PDF/DOCX report rendering pipeline. That core — pulling real geospatial/biodiversity/climate data for a Kenyan site and producing a NEMA-style document — solves a genuine, painful workflow.

**Hollow:** the three headline differentiators. AI impact prediction is a hardcoded rule table with an XGBoost veneer that isn't even loaded at runtime; the compliance engine mostly auto-passes; the ESG blockchain fabricates transaction hashes. The presence of `harden_submission_data.py` and `run_professional_demo.py` reinforces that the system is currently optimised to *look* impressive in a demo.

**To become viable:** (1) real predictive models trained on actual EIA datasets, or an honest re-frame as a rules-based expert system; (2) a compliance engine whose checks actually read report content; (3) a real blockchain integration or removal of the claim; (4) turn off `ALWAYS_EAGER` and run real workers; (5) fix the N+1s and add caching; (6) fix the critical security holes; (7) add tests for the flagship modules.

---

## 7. Recommended fix sequence

**Phase 1 — Stop the bleeding (security & correctness).** C-1, C-2, C-3, H-1..H-6, H-9..H-11, H-12, the invite-500 bug, CORS, `ALLOWED_HOSTS`. These are small, surgical, high-impact changes.

**Phase 2 — Production readiness.** C-4 (Celery), H-7/H-8 (N+1 + cache), TLS + security headers + Django `SECURE_*`, non-root containers, healthchecks, remove dead scripts/deps, add prod-hardening settings.

**Phase 3 — Product substance (needs your decisions).** C-5 — decide per feature: build real ML / real on-chain / real compliance checks, or re-frame honestly. Add tests for the modules you keep.

I recommend starting with Phase 1 since it is low-risk, mechanical, and closes the exploitable holes.
