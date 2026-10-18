# DataCore ERP — Notion Integration Plan
Status: PLANNING ONLY. No ERP code, APK, Firebase rules, or live customer data changed.
Date: 2026-10-18

## Current application / deployment gate
Vite/React + Capacitor Android + Firebase/Firestore. This branch is based on feature/trial-v1, which currently says NOT READY FOR CUSTOMERS. Preserve all features and existing 72-hour trial behavior, separate tenant data, owner account, APK signing and Google login. Trial verification remains higher priority than production Notion sync.

## Goal
Use Notion as a task, planning, engineering documentation and project-summary workspace. ERP/Firestore stays the source of truth for stock, finance, employees, NDT measurements and calculations.

## Proposed databases
- Projects: Project ID, Name, Client Alias, Lead, Dates, Status, Progress.
- Employee Assignments: Employee ID, Role, Team, Project, Shift; minimum necessary personal details.
- NDT Work Orders: Work Order ID, Project ID, Inspection Method, Inspector, Status, Due Date.
- TML Work Tracking: TML ID, Project/Equipment Reference, Responsible Technician, Review Status, Data Entry Status, Workflow Stage. Raw TML readings and specialized formulas STAY IN ERP.
- Store Tasks: Item Reference, Reorder Task, Store Responsible, Status.
- ERP Development: Feature, Bug, Module, Priority, Person, Status.

## Roles to consider
Engineers, inspector specialist, NDT inspectors, technicians A/B/C, data analyst A/B, data entry A/B and future entries, store A/B, helpers, draftspersons, and approved admins. Notion never supersedes ERP role permissions.

## Architecture
ERP mobile/web -> authenticated integration endpoint on Cloudflare Worker -> Notion API.

NOTION_API_TOKEN is server-side only. Never embed it in APK or React bundle.
First release is OWNER-ONLY and MANUAL, with a preview of exact fields to export and explicit confirmation.
Server must verify Firebase ID tokens cryptographically, enforce tenant scope and allowed fields, and never trust a claimed user ID, role or tenant ID from the app.
For future customers, require per-tenant consent and separate Notion OAuth/workspace permissions rather than exposing an owner-wide token.
Use record IDs, idempotency, sync timestamp, logs, pagination, Retry-After/backoff, and conflicts handling.

## Milestones
A. Create Notion sandbox pages and fill test records only.
B. Read an approved owner-only project/task summary through a secure backend after successful authentication.
C. Add one-way manual Send summary to Notion for non-sensitive project data.
D. Test owner, active trial, expired, revoked, cross-tenant and unauthorized access in Firestore emulator and Android device.
E. Consider controlled two-way task sync after production trial/security gates pass. Never auto-overwrite ERP source-of-truth measurements, invoices, payroll, stock or financial records.

## Acceptance criteria
- No change to existing APK, main branch or production Firestore in planning stage.
- No customer or other tenant can see another tenant's content in Notion.
- Repeated one-way export does not duplicate data.
- Revoked token, lost network, invalid source IDs and API rate-limits fail safely.
- No production rollout until verified trial source, Firestore rules and installed APK testing are complete.
