# Vanik Improvement Backlog (Initial Consolidation)

## what's to be done first and asap
If you only have 2–3 days to get this repo into a safer, demo‑ready state, focus on the minimum set that (a) removes highest risk (security & data corruption), (b) stabilizes core flows, and (c) enables confidence to demo or hand over. Skip polish, advanced analytics, and non-blocking UI tweaks.

### Ultra‑Critical (Day 1)
1. Implement real authentication
	- Add `users` table (username, password_hash, role, is_active, timestamps)
	- Hash passwords with bcrypt on create/update
	- Replace in‑memory tokens with signed JWT (PyJWT) including `exp` (e.g. 30–60 min) & `sub`
	- Middleware: reject expired tokens; unify 401 response shape
	- Seed one admin user via a simple migration or seed script
2. Fix audit logging & status consistency
	- Resolve `audit_log` vs `audit_logs` naming mismatch (rename table OR create `CREATE VIEW audit_logs AS SELECT * FROM audit_log`)
	- Decide canonical order statuses (e.g. `"Order Placed" | "Order Received" | "Order Cancelled"`) and update DB constraint + existing rows + frontend mapping

### High Risk Data Integrity (Day 2)
3. Add schema constraints & migrations
	- Introduce first formal migration set (dump existing CREATE TABLE statements into versioned SQL or Django migrations)
	- Remove runtime table creation from `DatabaseManager.init_tables()` (guard or delete after migration)
	- Add CHECK constraints: `current_weight >= 0`, `reserved_weight >= 0`, `reserved_weight <= current_weight`
	- Add NOT NULL where logically required (e.g., foreign keys, weights)
4. Enforce atomic inventory reservation
	- Ensure all reservation code paths use a single transaction with `SELECT ... FOR UPDATE` on lots
	- Add a protective function that revalidates post‑update invariants, raising/rolling back if violated

5. Minimal test harness (pytest)
	- Test A: GRN creation inserts lot + inbound transaction
	- Test B: Sales order reserves inventory without overshooting available_weight
	- Test C: Challan conversion decreases current_weight and never goes negative
6. Health & environment basics
	- Add `/api/health` endpoint (DB connectivity + version)
	- Add `.env.example` (DATABASE_URL, JWT_SECRET, DEMO_ADMIN credentials placeholder)

### Hardening & Cleanup (Day 3)
7. Standard response envelope for new/modified endpoints
	- `{ "success": true|false, "data": ..., "error": { code, message }? }`
	- Apply at least to auth, health, orders, inventory endpoints touched above
8. Critical indexes
	- `CREATE INDEX IF NOT EXISTS idx_sales_orders_date_status ON sales_orders(order_date, status);`
	- `CREATE INDEX IF NOT EXISTS idx_inventory_lots_product_location ON inventory_lots(product_id, location_id);`
	- `CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);`
9. Remove or clearly mark unused packages (e.g., DRF if not leveraged yet) to reduce confusion

### Deliverables & Acceptance Checklist
- [ ] Can log in with seeded admin; token expires properly
- [ ] Negative or over‑reservation impossible (constraint + test proves)
- [ ] Order statuses consistent across DB, API, UI
- [ ] Audit logs endpoint returns data (no table name error)
- [ ] Tests: all 3 core integrity tests pass locally
- [ ] Health endpoint returns JSON with status=healthy when DB reachable
- [ ] README updated with quick start + auth note

> Stretch (only if ahead of schedule): Add rate limiting to login & mutation endpoints; add simple role field enforcement in middleware.

---

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
