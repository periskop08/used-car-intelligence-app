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
