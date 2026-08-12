# TorqueScout Project Configuration

This workspace corresponds to the **TorqueScout** (formerly Used Car Intelligence App) project.

## Key Information
*   **Project Name:** TorqueScout
*   **Purpose:** A platform for used car chronic problem detection, specification lookup, and AI-powered vehicle risk analysis reports.
## Team Collaboration Rules
* **Prisma Schema & Database Sync:** Whenever `apps/api/prisma/schema.prisma` is edited or updated, always ensure `npx prisma db push --schema=apps/api/prisma/schema.prisma --accept-data-loss` is run to keep the live Neon PostgreSQL database in sync before pushing commits.
* **Auto-Migration Build:** Backend API build script (`apps/api/package.json`) automatically runs `prisma db push` on Render deployments to guarantee zero-downtime schema syncing for all team members.
