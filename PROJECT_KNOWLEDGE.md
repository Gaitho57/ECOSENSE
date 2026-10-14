# ECOSENSE AI — MASTER PROJECT KNOWLEDGE & CONTINUITY CONTEXT

> **Status:** Active Production Development & Freelance Commercialization  
> **Last Updated:** October 2026  
> **Target Jurisdiction:** NEMA Kenya (National Environment Management Authority)  
> **Core Purpose:** Automated, legally-compliant, hallucination-free Environmental Impact Assessment (ESIA / EIA) Study and Project Reports.

---

## 1. System Architecture Overview

* **Frontend:** React + Vite + Tailwind CSS + Lucide Icons + Leaflet GIS Mapping (`frontend/src/`).
  * Primary Intake Component: `frontend/src/components/projects/PhasedIntakeWizard.jsx` (5-phase progressive disclosure intake).
* **Backend:** Django 4.x + Django REST Framework + PostGIS + Celery (`backend/`).
  * Core models: `apps/projects/models.py` (`Project`, `ProjectDocument`, `ProjectMedia`).
  * Reports engine: `apps/reports/` (`EIAReport`, `ReportSection`, `views.py`, `tasks.py`).
* **Database Options:**
  * Local Docker PostGIS (`ecosense-user:ecosense_dev_password@localhost:5432/ecosense`).
  * Cloud Neon PostgreSQL cluster (`neondb` on AWS us-east-1).
  * MCP Integration: `@modelcontextprotocol/server-postgres` configured in `C:\Users\User\.gemini\config\mcp_config.json`.
* **RAG & Knowledge Base:** 
  * 60+ Kenyan statutory and environmental regulatory PDFs vectorized into local vector storage (`ingest_regulations.py`).
  * Hard hallucination guardrails: Model outputs `**[MISSING: parameter]**` if any baseline parameter is omitted from intake.

---

## 2. Key Accomplishments & Code Modifications

### A. Phased Intake Wizard (`PhasedIntakeWizard.jsx`)
* **AST & Layout Bug Fixed:** Removed a rogue `</div>` at line 693 that was prematurely truncating Phase 1 and causing React DOM reconciliation failures. Tag balancing confirmed (199 open tags, 199 close tags).
* **Multi-Flag Sub-form Stability:** All 3 critical sub-forms now render and stack as stable siblings without state loss:
  1. *Resettlement Action Plan (RAP)* — Displacement triggers.
  2. *Protected Area Overlap* — Riparian buffers, forest reserves, national parks.
  3. *Contaminated Land & Brownfields* — Historic industrial use, soil/groundwater hazards.
* **New Load-Bearing Fields Injected:**
  * `rapLivelihoodRestoration` (Textarea: relocation grants, site assistance).
  * `rapTimeline` (Text input: schedule relative to civil works).
  * 3 File Upload slots: `rap_report` (RAP Document), `statutory_consent` (KWS/KFS/WRA Consent), `phase1_esa` (Phase 1/2 ESA Report).
* **Phase 4 Summary & Attestation:** Added Livelihood Restoration and Timeline summaries, plus Lead Expert statutory attestation checkbox before submission.

### B. Report Generation Engine & Artifacts
* **`backend/generate_groq_report.py`**: Updated extraction dictionary to pull `rap_households`, `rap_individuals`, `rap_livelihood_restoration`, and `rap_timeline` into the AI prompt.
* **`backend/Athi_River_ESIA_Report_Clean.docx`**: 50+ page fully styled Word document verifying the three-track regulatory logic.

---

## 3. The Benchmark Test Project: "Athi River Industrial Park Redevelopment"

Used as the baseline stress-test for simultaneous multi-regulatory triggers:

* **Proponent:** Sisal Valley Industrial Developers Ltd. (KRA PIN: `P073619284S`, Lead Expert: Dr. Peninah Wanjiru `NEMA/EIA/0876`).
* **Location:** Athi River, Machakos County (LR No. 15920/6, 11.2 hectares, Coordinates: `-1.4562, 36.9781`).
* **Cost & Lifespan:** KES 940,000,000 | 22 months construction | 35 years operation.
* **Three-Track Regulatory Framing (Strictly Maintained):**
  1. **NEMA General EIA (EMCA Cap 387):** Air quality (PM2.5: 21 µg/m³, PM10: 47 µg/m³), Noise (56 dBA), sensitive receptors (Athi River Primary School 540m North, Estate Borehole 310m West).
  2. **Water Resources Authority (WRA Riparian Consent - Water Act 2016):** 0.4 ha encroachment into the statutory 30m Athi River riparian buffer. Requires WRA consent, redesign of attenuation pond, and KES 900,000 mitigation budget.
  3. **Resettlement Action Plan (RAP - Land Act 2012):** Compulsory displacement of 12 PAHs / 58 PAPs, 9 informal dwellings, 3 workshops. Methodology: Replacement cost, no depreciation, unconditional relocation assistance grant (KES 3.6M budget).
* **Brownfield Contamination:** Historic cement bagging & battery recycling (Lead up to 890 mg/kg soil, 0.04 mg/L groundwater). Remediation: Targeted excavation of lead hotspot + concrete capping of cement dust (KES 4.2M budget).

---

## 4. Business & Commercial Strategy (KES 100k Monthly Profit Blueprint)

* **Business Model:** Tech-Enabled Drafting Service ("EIA Technical Drafter / Ghostwriter for Licensed Experts").
  * *Why this model:* Bypasses NEMA lead expert licensing restrictions. The licensed expert does fieldwork and stamps the report; EcoSense generates the 50-page draft.
* **Price Point:** **KES 10,000** per report (delivered in 3–5 days).
* **Unit Economics (Using Claude 3.5 Sonnet API):**
  * Input tokens (~20k context): ~$0.06 (KES 8)
  * Output tokens (~30k tokens for 50 pages): ~$0.45 (KES 60)
  * Total API Cost per report: ~KES 130–150.
  * **Gross Margin:** ~98.5% (KES 9,850 profit per report).
* **Target:** **10 reports per month = KES 100,000 pure monthly profit.**
* **Zero-Risk Bootstrap Playbook:**
  1. *Portfolio Bait:* Use `Athi_River_ESIA_Report_Clean.docx` (exported to PDF) as proof of work.
  2. *Lead Source:* The public NEMA Register of Licensed EIA Experts and Firms.
  3. *Offer:* Pitch busy experts to take their field notes and deliver a 50-page draft in 3 days for KES 10k.
  4. *Funding:* Require a 50% deposit (KES 5,000). Use KES 1,000 to buy Anthropic API credits. Zero out-of-pocket risk.

---

## 5. Model & API Architectural Best Practices

* **Free-Tier Limits:** Groq on-demand and Gemini free-tier have strict Output Tokens Per Minute (OTPM) limits (e.g. 1,000 tokens/min on Qwen), causing rate-limit errors and text degeneration loops ("KS KS KS").
* **Production Recommendation:** Anthropic Claude 3.5 Sonnet via Developer API (`console.anthropic.com`).
  * 200,000 token context window.
  * Exceptional long-form legal/technical writing without looping.
  * Strict adherence to negative constraints ("Do not hallucinate").
* **Template Engine:** A hybrid model using `python-docx` / `docxtpl` with standard NEMA statutory boilerplate + AI-generated project-specific chapters guarantees zero hallucinations and fast compile times.

---

## 6. Database & MCP Configuration

* **Neon Cloud Database:**
  * Host: `ep-shiny-grass-amsukolh-pooler.c-5.us-east-1.aws.neon.tech`
  * Database: `neondb`
  * Connection String: `postgresql://neondb_owner:npg_D9BLR2dHFoJV@ep-shiny-grass-amsukolh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require`
* **MCP Server Location:**
  * File: `C:\Users\User\.gemini\config\mcp_config.json`
  * Command: `npx.cmd -y @modelcontextprotocol/server-postgres [NEON_URL]`
  * Verified: Stdio transport and SSL handshake verified working.

---

## 7. NEMA Radar Module (Kenya Gazette Watcher) — COMPLETED

* **Statutory Mandate:** Section 59 of EMCA (Cap 387) and Regulation 21 (Notice of EIA Study Reports).
* **Models Implemented:** `NEMAGazetteNotice` in `apps/reports/models.py`.
  * Fields: `notice_number`, `gazette_issue`, `publication_date`, `project_title`, `proponent_name`, `county`, `plot_number`, `public_comments_deadline`, `matched_project`, `match_confidence`, `match_reason`, `status`.
* **Services Engine:** `apps/reports/services/gazette_radar.py` (`GazetteRadarService`).
  * Text & PDF Parsing: Extracts Gazette Notice No, proponent, plot number, county, and 30-day public comment deadline.
  * Correlation Engine: Cross-references scraped notices with active `Project` database records based on Plot Numbers (0.95), Proponent Name (0.90), and Title Keywords (0.85).
  * Auto-Sync: Updates `project.nema_ref` and `eiareport.submission_deadline` automatically on match.
* **API Endpoints:**
  * `GET /api/reports/radar/` — List all tracked notices with `matched_only`, `county`, and `search` filters.
  * `POST /api/reports/radar/scan/` — Trigger radar scan on raw gazette text or demo feed.
* **Verification:** Tested against simulated Kenya Gazette notice for "Athi River Industrial Park Redevelopment". Successfully matched with 90% confidence and calculated a 30-day statutory public comment deadline.

---

## 8. Immediate Next Engineering Steps

1. **Frontend Radar View:** Add a tab/page in React to display the NEMA Radar feed and matched projects.
2. **Mobile Fieldwork Enhancements:** Add 1-tap browser GPS coordinate capture and camera input to `PhasedIntakeWizard.jsx`.
3. **Escrow Watermarking:** Add diagonal "DRAFT — NOT FOR SUBMISSION" watermark on pre-payment exports.
