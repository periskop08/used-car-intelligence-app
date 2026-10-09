# TorqueScout Project Configuration

This workspace corresponds to the **TorqueScout** (formerly Used Car Intelligence App) project.

## Key Information
*   **Project Name:** TorqueScout
*   **Purpose:** A platform for used car chronic problem detection, specification lookup, and AI-powered vehicle risk analysis reports.
## Team Collaboration Rules
* **Prisma Schema & Database Sync:** Whenever `apps/api/prisma/schema.prisma` is edited or updated, always ensure `npx prisma db push --schema=apps/api/prisma/schema.prisma --accept-data-loss` is run to keep the live Neon PostgreSQL database in sync before pushing commits.
* **Auto-Migration Build:** Backend API build script (`apps/api/package.json`) automatically runs `prisma db push` on Render deployments to guarantee zero-downtime schema syncing for all team members.

## 🔒 LOCKED AI REPORT CONFIGURATION (FROZEN - DO NOT ALTER)
* **Prompt & Schema Integrity (`VehicleReportPromptService`):** System/user prompts, 16,384 max output tokens, EU/TR market catalog specification rules, facelift/makyaj transition year rules, trim feature comparison rules, and 100% AI-generated `technicalSpecifications` JSON schemas are **LOCKED**. Do not alter prompt structures or response schema without explicit user directive.
* **Global Normalized Cache (`VehicleReportCacheService`):** Global variant report caching with normalized vehicle identity matching (Brand + Model + Year + Trim + Engine + Fuel + Transmission) across all users is **LOCKED**.
* **Frontend Report Shell (`VehicleReportShell.tsx`):** Turkish fuel type formatting (`Benzin`, `Dizel`, `Hibrit`, `Elektrik`), Motor Gücü (HP) prominent card, and 6-card dynamic technical specification grid are **LOCKED**.
* **Zero Deterministic Fallback Policy:** Generic deterministic fallback is permanently disabled. In case of AI provider degradation, system must throw custom exception: *"TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin."* with redirect button to `/dashboard/support/feedback?category=VEHICLE_QUERY_AI_REPORT`.

## 🔒 LOCKED TECHNICAL SPECIFICATIONS & PROVENANCE CONFIGURATION (FROZEN - DO NOT ALTER)
* **Targeted AI Catalog Extraction (`researchVehicleSpecsViaAi` & `researchPowerViaAiCatalog`):** Fast, targeted vehicle technical specification extraction via automotive catalog intelligence (OpenAI `gpt-4o-mini` with Gemini fallback) is **FROZEN & LOCKED**. It specifically extracts exact official manufacturer catalog displacement (cc) and power (HP) for Turkish and European market models. Do NOT alter prompt rules, JSON schema, or domain verification without explicit user directive.
* **Displacement & Power Consistency Gates (`VariantTechnicalFactsService` & `VehiclePowerEnrichmentService`):** Physical boundary gating (600-8000 cc, 30-1500 HP), decimal badge consistency (tolerance ±70 cc), BMW Turkey sanity checks (1598 cc B48B16 / 1998 cc global), Tier 3 catalog domain classification (`catalog.torquescout.com`), and `direct_fetch` provider provenance are **FROZEN & LOCKED**.
* **Listing Creation Auto-Resolution & Protection (`/listings/create` & Backend Reconciliation):** Simultaneous resolution and reconciliation of displacement and power, immutable verified record protection (never regressing or overwriting `VERIFIED` status to `MISSING`), and listing autofill are **FROZEN & LOCKED**.
* **Mandatory Warning & Gatekeeper Policy:** Any proposed modification, refactoring, or external touch directly or indirectly affecting `VariantTechnicalFactsService`, `VehiclePowerEnrichmentService`, or technical consistency gates MUST trigger an explicit warning to the user before proceeding, requiring explicit confirmation. Unsettling or modifying this settled system is strictly prohibited.

## 🔒 LOCKED MOTORCYCLE FILTER SEMANTICS & CONTRACT (FROZEN - DO NOT ALTER)
* **Motor / Versiyon ≠ Motor Hacmi Distinction:** `MOTOR / VERSİYON` is strictly reserved for genuine canonical commercial or technical variant designations (e.g. GV250i, EFI, ABS, SP, R, S, Touring, Factory). It must NEVER be used to redundantly display displacement (e.g. "249 cc"). `MOTOR HACMİ` is the separate canonical displacement range classification (e.g. 151–250 cc, 251–350 cc...).
* **Zero Fake Synthetic Version Labels:** If a brand + model + year combination has only one true commercial variant, it resolves cleanly without fabricating synthetic version labels (e.g. no "249 cc V-Twin"). Technical specs (cc, cylinder layout, cooling, timing, power) live in technical fields, not synthetic version labels.
* **Single-Option Global Auto-Select & Cascading:** Whenever any dependent filter in the motorcycle chain (`Model Ailesi`, `Yıl`, `Tip / Kasa Tipi`, `Motor / Versiyon`, `Yakıt / Güç Ünitesi`, `Motor Hacmi`, `Vites Tipi`) has exactly 1 valid option, it MUST be automatically selected by the system without requiring user click. This automatically triggers cascading resolution down the chain until 0 or >1 options remain.
* **Upstream Invalidation & Zero Stale Selections:** Whenever an upstream selection (Brand, Model, Year) is modified, any downstream selections that are no longer valid MUST be immediately cleared. Stale downstream selections are strictly prohibited. Recalculation and single-option auto-selection must execute immediately.
* **Canonical 17 Type Taxonomy:** The 17 canonical types defined in `apps/web/src/contracts/motorcycleTaxonomyContract.ts` derived from market classifications are locked. Zero invented categories. Aliases (e.g. "Trike" -> `Üç Tekerlekli`, "Naked / Roadstar" -> `Naked / Roadster`) must be normalized through `normalizeMotorcycleType`.

## 🔒 LOCKED PHYSICAL SPECIFICATIONS & ZERO-NULL CARDS CONTRACT (FROZEN - DO NOT ALTER)
* **Zero-Null Card Guarantee (Rule 14 & UI Invariant):** The technical specification cards (`Motor Gücü`, `Motor Hacmi / Elektrik`, `MTV`, `Maksimum Hız`, `0-100 Hızlanma`, `Menzil (WLTP) / Ort. Tüketim`, `Bagaj Hacmi`, `Boş Ağırlık`) across Web (`VehicleReportShell.tsx`) and Mobile (`vehicle-report.tsx`) MUST NEVER display empty/null (`—`).
* **3-Layer Defensive Architecture:**
  1. **Layer 1 (Context Builder Proactive Extraction):** `VehicleReportContextBuilderService.researchPhysicalSpecsViaAi` automatically queries official catalog specs via OpenAI `gpt-4o-mini` (Gemini fallback) whenever a variant's physical specs are missing, upserting them immediately to Prisma `TechnicalSpec`.
  2. **Layer 2 (Prompt Enforcement):** `VehicleReportPromptService` mandates Rule 14 and directly feeds acceleration, top speed, trunk, curb weight, WLTP range, and battery capacity into the prompt, strictly forbidding `null` output.
  3. **Layer 3 (Reconciliation & Heuristic Fallback):** `VehicleReportProviderService.reconcileVariantIdentityInReport` guarantees non-null realistic physical fallback boundaries (by HP, body type, and EV status) and synchronizes both alias naming schemes (`zeroToHundredKmh` / `zeroToHundredSec`, `trunkCapacityLiters` / `luggageCapacityL`, `curbWeightKg` / `weightKg`).
* **Electric Vehicle Statutory MTV Brackets (`calculateVehicleMtv.ts`):** EV power-to-equivalent displacement mappings strictly follow Turkey MTV Law Article 9 / General Communique No. 56, correctly handling high-power EV brackets (>240 kW / >4000 cc tavan dilimi at 25% statutory rate).

## 🔒 LOCKED EV POWERTRAIN ISOLATION & OPEN-ENDED ADVISOR CONTRACT (FROZEN - DO NOT ALTER)
* **EV Architecture Strict Isolation (Rule 7 & Reliability Pipeline):** When an EV (BEV) is analyzed, all ICE-specific defect mechanisms (engine block deformation, overheating, head gasket, spark plugs, fuel injectors, timing belt/chain, exhaust emissions, DPF, mechanical coolant/thermostat leaks, clutches, DSG/dual-clutch mechatronics, and gear shift shudder) are strictly forbidden across defect scoring, context building, seller questions, purchase conditions, and walk away conditions. `VehicleReliabilityResearchService` and `sanitizeTurkishDefectReason` must strictly isolate and suppress combustion defects for electric vehicles.
* **Open-Ended Nuanced Automotive Advisory Tone (Rule 11 & Rule 12):** Responses must preserve the authoritative yet engaging tone of a senior automotive test editor and independent inspection consultant. Rigid, single-variable conclusions (such as judging cabin space solely on wheelbase) and harsh binary verdicts ("kesinlikle aileye uygun değildir / aile aracıdır") are strictly prohibited. The advisor must deliver nuanced, multi-dimensional assessments (e.g. "geniş aileler için bagaj yükleme eşiği ve dikey hacim kısıtlayıcı olabilir; buna karşılık 4 kişilik çekirdek aileler için uzun yol konforu ve diz mesafesi oldukça ferah bir yaşam alanı sunar").
* **Power & Acceleration Fidelity (Rule 10 & Rule 12):** The narrative analysis must strictly align with official catalog power (HP) and acceleration metrics (0-100 km/s). Under no circumstances may a high-output vehicle (e.g. 500+ HP AWD electric sedan) be described as lacking instant torque. Real-world engineering trade-offs (e.g. high-speed sustained consumption, rapid tire wear from instant torque, 2+ ton battery curb weight inertia in quick transitions) must be evaluated instead.
* **Score & Short Verdict Harmony:** The short verdict in report synthesis and the UI score hero must systematically synchronize with the 100-point decision score tier across all vehicles. A vehicle scoring 90-100 (EXCELLENT) must display *"Sınıfında referans kondisyonda, kontrolleri teyit edilerek doğrudan değerlendirilebilir."* and must NEVER display the generic moderate-tier text (*"Belirli kontrollerin sağlanması şartıyla..."*).
* **Lithium Battery Electrochemical Fidelity (Rule 12 EV Compromises):** In EV temperature compromises, technical fidelity is mandatory: winter cold causes temporary chemical range reduction (%15-30), while summer heat causes range reduction due to high active liquid cooling and AC compressor electrical loads, not an electric motor power/torque drop.
## 🔒 LOCKED MULTI-VEHICLE (MOTORCYCLE, SUV/PICKUP, MINIVAN/PANELVAN) 3-AGENT RESEARCH & ZERO-HALLUCINATION CONTRACT (FROZEN - DO NOT ALTER)
* **3-Agent Adversarial Architecture (`MultiVehicleAgentService`):**
  1. **Agent 1 (Primary Grounded Research Specialist):** Grounds technical research using user-selected filters (Year, Engine, Fuel, Transmission). Strictly forbids few-shot token pollution.
  2. **Agent 2 (Adversarial Red Team Validator):** Adversarially audits Agent 1 output: challenges fake carburetors on born-EFI bikes, challenges fake EFI/Euro 3 on pre-2008 carburetor models, challenges ABS on drum brake vehicles, challenges cylinder layout discrepancies, and flags competitor comparisons.
  3. **Agent 3 (Adjudication & FMEA Score):** Reconciles claims, calculates calibrated FMEA decision score, and filters rejected claims.
  4. **Closed Report Writer:** Operates with 0 internet access and 0 fact invention, generating fluent, high-level automotive analysis.
  5. **Harmonizer & Safety Filter:** Programmatically enforces physical/mechanical consistency (e.g. stripping ABS on drum brakes, stripping DTS-i/3-spark on V-Twin, stripping FI lambası on carburetor bikes).
* **Zero Prompt Bleeding & Zero Competitor Comparisons:**
  - System prompts MUST NEVER contain specific vehicle model examples (e.g. NO "Bosch tek kanal ABS", NO "3 bujili DTS-i motor", NO "FI arıza lambası" in prompt instructions).
  - Competitor comparisons are STRICTLY FORBIDDEN across all vehicle categories: zero competitor brand names, zero competitor model names, and zero comparative phrases ("rakiplerine kıyasla", "sınıfındaki rakipleri gibi").
* **Fuel Induction & Mechanical Grounding Rules (Motorcycle):**
  - **Born-EFI Models:** Bikes launched with electronic injection (Bajaj Pulsar 200 RS/NS, KTM Duke/RC, Yamaha R25/MT-25, Honda CBR250R) NEVER have carburetor eras or carburetor tradeoffs.
  - **Vintage / Pre-2008 Models:** Classic cruisers and older series (e.g. 2001-2007 Honda VT 750 Shadow, Yamaha Dragstar, Hyosung GV250 early series) are strictly CARBURETOR from factory; NEVER labeled as EFI or Euro 3.
  - **Braking & Cylinders:** Models with drum brakes (Ön Disk Arka Kampana) CANNOT claim ABS. V-Twin / multi-cylinder engines CANNOT claim 3 spark plugs or single-cylinder characteristics.
  - **Dealbreaker Harmonization:** Carburetor models MUST NOT have "FI arıza lambası" in walkAway conditions; they must have genuine mechanical dealbreakers (e.g. krank yatak vuruntusu, karbüratör boğaz çatlağı).
* **Filtre Garantisi & Context-Scoped Cache (`vehicleContextHash`):**
  - **Motosiklet Kapsamı (Model Ailesi):** Motosiklette yıl seçimi YOKTUR; arama yalnızca Marka + Model bazında yapılır. Sistem tüm model ailesini (tüm üretim dönemleri, karbüratörden enjeksiyona geçiş haritası) bir bütün olarak inceler.
  - **Otomobil, SUV & Ticari Kapsamı:** Kullanıcının seçtiği filtreler (Yıl, Kasa, Motor, Yakıt, Vites, Donanım) doğrudan araştırmaya ve `contextHash: vehicleContextHash` ile önbelleğe bağlanır.
  - `GeneratedVehicleReport` sorgusu her zaman `contextHash` eşleşmesi arar. Asla önceki bir kod versiyonuna ait veya farklı kapsama sahip eski bir rapor önbellekten sunulamaz.
* **Mandatory Warning & Gatekeeper Policy:**
  - Any proposed modification, refactoring, or external touch directly or indirectly affecting `MultiVehicleAgentService`, `VehicleReportService` cache lookup, or multi-vehicle context builder MUST trigger an explicit warning to the user before proceeding, requiring explicit confirmation.

## 🔒 ZERO STATIC VEHICLE DEFAULTS & USER FILTER INTEGRITY CONTRACT (FROZEN - DO NOT ALTER)
* **Strict User Selection Grounding:** All vehicle research and intelligence (whether Minivan, Panelvan, SUV, Pickup, Motorcycle, or Automobile) MUST derive strictly and exclusively from the user's selected filter set: **Marka + Model + Yıl + Donanım/Motor + Vites (+ Yakıt)**.
* **Zero Hardcoded Spec Dictionaries / Default Files Ban:** Creating static vehicle lookup files (such as `commercial-vehicle-defaults.ts`), hardcoded vehicle spec dictionaries, or synthetic in-code fallback mappings is STRICTLY FORBIDDEN. No memory files, lookup tables, or manual spec overrides may be created or maintained in the codebase.
* **Dynamic AI Research & Verification:**
  - Transmission architectures (e.g. 5-speed manual vs 6-speed manual, ETG6 vs EAT8, DSG DQ500 vs ZF 9-speed, factory automatic availability for that exact year and trim), suspension types (Bi-Link independent/helezon vs parabolic leaf springs), and body volumes must be researched and verified dynamically by the AI agent pipeline (`MultiVehicleAgentService`) strictly for the user-selected model year, engine, and trim.
  - The AI pipeline investigates the authentic manufacturer catalog and automotive evidence dynamically without relying on static code presets.
* **Context-Scoped Cache & Final Locking Policy (`vehicleContextHash`):**
  - The research output is bound directly to `contextHash: vehicleContextHash` (Marka + Model + Yıl + Donanım + Motor + Vites + Yakıt).
  - Once reports are verified and produced with 100% accuracy, they are locked and cached globally under their unique hash. Zero hardcoded dictionary files are permitted.
* **Anti-Cliché, Tone & Semantic Integrity:**
  - Prompt phrases or synthetic clichés must never be echoed verbatim.
  - `compromisesAndLimitations` (Tavizler ve Sınırlar) cannot contain advantages or praise.
  - Vehicles with verified automatic options cannot claim "otomatik şanzıman eksikliği", and vehicles that are strictly manual-only cannot have hallucinated automatic gearbox failure modes.
  - Zero serialization defects: `[object Object]` output is strictly forbidden across all report fields.
