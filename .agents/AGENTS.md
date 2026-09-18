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

