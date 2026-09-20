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



