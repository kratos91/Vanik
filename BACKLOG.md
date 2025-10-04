# Vanik Improvement Backlog (Initial Consolidation)

This file centralizes refinement items (UI polish + missing features) inferred from code, docs (`CONTEXT.md`), and current implementation state. Use it as a living backlog. Priorities:
- P0 = Critical / foundational gap
- P1 = High impact / near-term
- P2 = Nice-to-have / medium-long term

---
## 1. UI / Visual Refinement
- [ ] (P0) Unify design tokens (colors, spacing, elevation) into a single theme file; audit hard‑coded Tailwind classes for repetition.
- [ ] (P0) Standardize card and panel shadows ("material-shadow" appears ad-hoc) → replace with semantic utility classes.
- [ ] (P0) Create a reusable <DataTable /> wrapper (sorting, pagination, empty state) and migrate pages (sales-orders, purchase-orders, stock-levels) to it.
- [ ] (P1) Introduce layout density toggle (comfortable / compact) for data-heavy users.
- [ ] (P1) Consistent skeleton loaders: extract dashboard inline skeleton blocks into shared components.
- [ ] (P1) Add global dark mode toggle (looks partially themed but confirm variable coverage).
- [ ] (P1) Normalize badge color semantics (status, transaction types, alerts) through a mapping object.
- [ ] (P2) Animated micro-interactions (hover elevations, button transitions) kept subtle (reduce cognitive load).
- [ ] (P2) Add printable views (clean layout) for GRN, Sales Challan, Order documents.

## 2. UX / Workflow Enhancements
- [ ] (P0) Inline edit modals for master data (customers, suppliers, processors) with optimistic updates.
- [ ] (P0) Bulk actions (delete / deactivate / export) on master data tables.
- [ ] (P1) Wizard-style GRN creation when sourced from Purchase Order (pre-fill & diff view).
- [ ] (P1) Sales order → challan conversion UI: show allocation breakdown per lot.
- [ ] (P1) Stock levels page: expandable row reveals lot-level table + movement history.
- [ ] (P1) Add quick global search (Ctrl+K) for products / customers / orders.
- [ ] (P2) Recently viewed panel (persist in localStorage).
- [ ] (P2) Toast undo for soft deletions (where applicable).

## 3. Accessibility (A11y)
- [ ] (P0) Ensure all interactive elements have discernible labels (audit icon-only buttons).
- [ ] (P0) Color contrast audit against WCAG AA (especially warning/yellow badges & muted text on white).
- [ ] (P1) Keyboard focus ring standardization (custom ring utilities) + skip-to-content link.
- [ ] (P1) Dialog / modal focus trapping verification (Radix primitives OK but test custom wrappers).
- [ ] (P2) Add aria-live regions for async mutation success/error.

## 4. Frontend Performance
- [ ] (P0) Verify React Query staleTime & gcTime choices—reduce memory footprint for large datasets.
- [ ] (P0) Implement row-level virtualization for any table > 300 rows (stock-levels, transactions) – one shared virtualized table component.
- [ ] (P1) Debounce search inputs (currently likely immediate fetch).
- [ ] (P1) Pre-fetch related master data on idle (categories, products) for faster form open.
- [ ] (P2) Code-split rarely used pages (settings, user-management) with Suspense boundary spinners.

## 5. Backend Feature / Parity Gaps
- [ ] (P0) Align status vocabulary (docs use "Order Placed", code uses 'New' / 'Delivered' / 'Cancelled'). Decide canonical set; update DB constraint + frontend mapping.
- [ ] (P0) Audit log table name mismatch (`audit_log` vs queries referencing `audit_logs`). Fix or add DB view alias.
- [ ] (P0) Implement inventory reservation atomicity validations across all reservation & release paths (confirm SELECT ... FOR UPDATE used in unscanned segments).
- [ ] (P1) Token authentication: add expiry + move to signed JWT (PyJWT) with configurable TTL.
- [ ] (P1) Password storage: replace demo credentials with users table + bcrypt hashed passwords + seed script.
- [ ] (P1) GRN → Inventory Lots: expose lot breakdown endpoint `/api/grns/:id/lots`.
- [ ] (P1) Stock alert generation logic server-side (currently placeholder arrays in dashboard endpoints) with thresholds configurable per product.
- [ ] (P2) Processing (WIP) return variance reporting (loss % analytics endpoint).

## 6. Security & Hardening
- [ ] (P0) Add CORS configuration (explicit allow-list) & remove wide-open defaults.
- [ ] (P0) Rate limiting / simple sliding window (at least login + mutation endpoints). Could add lightweight Redis or in-memory leaky bucket.
- [ ] (P1) Enforce HTTPS redirects and secure cookies when behind a proxy (prod settings file).
- [ ] (P1) Input validation server-side: consistent length / numeric / enum constraints (mirror Zod schemas).
- [ ] (P2) Add audit entries for authentication events (login, logout, failed attempts).

## 7. Data Integrity & Observability
- [ ] (P0) Introduce migrations; remove table creation from runtime (Django migrations or Alembic-like raw SQL set).
- [ ] (P0) Add NOT NULL & CHECK constraints (weights >= 0, reserved_weight <= current_weight).
- [ ] (P1) Background reconciliation script: detect negative available_weight or orphan reservations.
- [ ] (P1) Partition `inventory_transactions` by month if volume > threshold.
- [ ] (P2) Add materialized view for stock summary (refresh on schedule) to accelerate dashboard.

## 8. Testing
- [ ] (P0) Setup backend test harness (pytest) + minimal fixtures for categories/products/customers.
- [ ] (P0) Add unit tests for reservation logic (edge: exact match weight, partial lot allocation, multi-lot splice, insufficient inventory).
- [ ] (P1) Frontend: set up Vitest / RTL skeleton; snapshot for dashboard cards; form validation tests.
- [ ] (P1) Load test script (Locust) adapted to current endpoints; baseline metrics recorded.
- [ ] (P2) Visual regression (Storybook + Chromatic or Loki) for core components.

## 9. Developer Experience
- [ ] (P0) Create `.env.example` with required vars (some listed in CONTEXT.md but not checked in).
- [ ] (P1) Pre-commit hooks (lint, type-check staged files) using Husky + simple Python flake8 or ruff (if adopted).
- [ ] (P1) Add `Makefile` or `tasks.ps1` with common commands (dev, test, migrate, lint).
- [ ] (P2) Storybook for UI component library (Radix + custom wrappers) to accelerate iteration.

## 10. Documentation
- [ ] (P0) Rename occurrences of "YarnFlow" to "Vanik" for consistency.
- [ ] (P0) Split giant `CONTEXT.md` into: `ARCHITECTURE.md`, `API.md`, `WORKFLOWS.md`, `DEPLOYMENT.md`.
- [ ] (P1) Add `API_SPEC.md` or generate OpenAPI from annotated route metadata.
- [ ] (P1) Add `SECURITY.md` summarizing auth, token TTL, password policy.
- [ ] (P2) Add `CHANGELOG.md` (Keep a Changelog format) starting with current snapshot.

## 11. Quick Wins (Suggested First Sprint)
1. Fix audit table naming & status alignment (P0).
2. Add JWT expiry + password hashing (P1 but security critical—elevate if shipping soon).
3. Standardize table component + skeleton loader extraction (P0/P1 hybrid: boosts perceived performance + consistency).
4. Add unified response schema wrapper for new endpoints; gradually retrofit.
5. Implement indexes documented but absent (verify with `psql \d+`): composite queries for filtering by status/date.

## 12. Open Questions (Clarify Before Implementation)
- Should legacy Node server piece (`server/index.ts`) remain or be replaced by a Python-only process manager? (If not needed, simplify scripts.)
- Do we anticipate multi-tenant support (namespace separation) soon? Would influence schema naming & auth scoping.
- Required audit retention period? Impacts partition / archival strategy.

## 13. Tracking Conventions
Use GitHub issues with labels:
- `area:frontend`, `area:backend`, `area:db`, `type:refactor`, `type:feature`, `priority:P0|P1|P2`.
Reference backlog line numbers or copy exact bullet for traceability.

---
### Updating This File
When a task is moved in progress or completed, annotate:
- Append `(In Progress @ <branch>)` or `(Done #PR_NUMBER)`.
Keep historical bullets (strikethrough optional) to preserve context.

---
Generated initial version on first consolidation pass. Expand after deeper audit of remaining DB methods (orders, inventory transactions) if required.
