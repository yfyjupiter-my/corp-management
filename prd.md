# PRD: Corp Management Platform — SEA IT Infrastructure Registry

| Field | Value |
|---|---|
| **Document Status** | Draft v1.0 |
| **Author** | Chris Goh |
| **Date** | 2026-07-07 |
| **Countries in Scope** | Vietnam, Thailand, Indonesia, Malaysia |
| **Tech Stack** | Next.js (App Router) + Tailwind CSS + TypeScript |
| **Deployment** | Docker (Dockerfile) + Supabase (Postgres, Auth, Storage) |

---

## 1. Executive Summary

### Problem Statement

IT infrastructure information (network configurations, CCTV systems) for the company's four SEA country offices is scattered across spreadsheets, chat threads, and individual staff knowledge. When an incident occurs — a site outage, a camera failure, an ISP contract renewal — HQ has no single, current source of truth, and troubleshooting depends on reaching the right local person.

### Proposed Solution

A centralized, role-based web platform where HQ admins and country managers register, view, and maintain network details (sites, ISP circuits, network devices, IP schemes, VPN links) and CCTV details (NVR/DVR systems, cameras, retention settings, maintenance records) for Vietnam, Thailand, Indonesia, and Malaysia.

### Success Criteria (KPIs)

1. **100% of active sites** across the 4 countries have their network and CCTV inventory recorded within 60 days of launch.
2. **Time to locate infrastructure info** (e.g., "which ISP serves the Hanoi office and what is the circuit ID?") drops from hours/days to **under 2 minutes** via search.
3. **Data freshness**: ≥ 90% of records reviewed or updated within their assigned review cycle (default: 6 months), tracked via a `last_verified_at` field.
4. **Adoption**: All country managers (4+) and HQ admins log in at least weekly within the first month.
5. **Zero cross-country data leaks**: country managers can never read or write another country's records (enforced and tested via Supabase Row Level Security).

---

## 2. User Experience & Functionality

### User Personas

| Persona | Description | Access |
|---|---|---|
| **HQ Admin** | Regional IT lead at headquarters. Oversees all 4 countries, runs audits, manages users. | Full read/write across all countries; user & role management. |
| **Country Manager** | Local IT/office manager in VN, TH, ID, or MY. Maintains their own country's records. | Read/write for their assigned country only. |
| **HQ Viewer** (v1.1) | Finance/ops staff who need reference info (e.g., ISP contracts for budgeting). | Read-only, all countries. |

### User Stories & Acceptance Criteria

#### Story 1 — Site registry
> As an HQ admin, I want to register each office/site per country so that all infrastructure records hang off a consistent location structure.

**Acceptance Criteria:**
- Can create/edit/archive a site with: country, site name, address, timezone, local contact (name, phone, email), and notes.
- Sites are grouped by country in the navigation; each country shows a site count.
- Archived sites are hidden by default but remain queryable (no hard deletes of referenced records).

#### Story 2 — Network details
> As a country manager, I want to record my country's network details so that HQ can troubleshoot and audit without contacting me first.

**Acceptance Criteria:**
- Per site, can record **ISP circuits**: provider, circuit/account ID, bandwidth, type (fiber/broadband/LTE), static IPs, contract start/end, monthly cost, support hotline.
- Per site, can record **network devices**: type (router/firewall/switch/AP), brand/model, hostname, management IP, firmware version, serial number, install date, warranty end.
- Per site, can record **IP scheme**: LAN subnets, VLAN table (ID, name, subnet, purpose), gateway, DNS, DHCP range.
- Per site, can record **VPN/WAN links**: peer site or HQ, tunnel type, status.
- Sensitive fields (device credentials) are **out of scope for MVP** — the record stores a *reference* to the password manager entry, never the secret itself.
- Every record shows `created_by`, `updated_at`, and `last_verified_at`, with a one-click "Verify — still accurate" action.

#### Story 3 — CCTV details
> As a country manager, I want to record my country's CCTV systems so that camera coverage, retention, and maintenance are auditable centrally.

**Acceptance Criteria:**
- Per site, can record **recorders (NVR/DVR)**: brand/model, channel count, storage capacity, retention days, firmware version, management IP reference, physical location.
- Per recorder, can record **cameras**: label, location description, type (dome/bullet/PTZ), resolution, indoor/outdoor, status (active/faulty/offline).
- Can log **maintenance events**: date, action taken (e.g., HDD replaced), performed by, next due date.
- A country dashboard shows totals: cameras active/faulty, recorders, and any retention setting below the company minimum (configurable, default 30 days) is flagged.

#### Story 4 — Role-based access
> As an HQ admin, I want country managers restricted to their own country so that data stays partitioned and accountable.

**Acceptance Criteria:**
- Users sign in via Supabase Auth (email + password; magic link optional).
- HQ admin can invite users and assign role (`hq_admin`, `country_manager`) and country.
- A country manager receives a 403/empty result when attempting to access another country's data via UI **or** direct API call (RLS-enforced, not just UI hiding).
- All create/update/delete actions are written to an audit log visible to HQ admins.

#### Story 5 — Search & overview
> As an HQ admin, I want to search across all records so that I can answer infrastructure questions in under 2 minutes.

**Acceptance Criteria:**
- Global search box matches across site names, device hostnames, ISP providers, circuit IDs, IPs, and camera labels; results grouped by type; returns within 500ms for the expected dataset (< 10k records).
- Landing dashboard shows per-country cards: site count, device count, camera health, circuits expiring within 90 days, and stale records (past review cycle).

#### Story 6 — Expiry & staleness visibility
> As an HQ admin, I want to see upcoming ISP contract expiries and warranty ends so that renewals are never missed.

**Acceptance Criteria:**
- A "Renewals" view lists contract ends and warranty ends within a selectable window (30/60/90 days), sorted by date, filterable by country.
- MVP is in-app visibility only; email notifications are v1.1.

### Non-Goals (MVP)

- ❌ **Live monitoring** — no SNMP polling, ping checks, camera stream viewing, or uptime dashboards. This is a registry, not an NMS.
- ❌ **Credential storage** — no passwords/secrets in the database; store references to the existing password manager only.
- ❌ **Automated network discovery** — all data is entered manually or via CSV import (import itself is v1.1).
- ❌ **Mobile app** — responsive web only.
- ❌ **Additional countries or non-IT modules** (HR, finance) — schema should not preclude them, but they are not built.
- ❌ **Multi-language UI** — English only for MVP.

---

## 3. AI System Requirements

Not applicable. This is a CRUD/registry platform with no AI-powered features in MVP. (Future consideration: natural-language search over the registry — explicitly deferred, not designed here.)

---

## 4. Technical Specifications

### Architecture Overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Next.js App (Docker)       │        │  Supabase (managed)          │
│  ─ App Router, TypeScript   │  HTTPS │  ─ Postgres (RLS enforced)   │
│  ─ Tailwind CSS UI          │───────▶│  ─ Auth (email/password)     │
│  ─ Server Components /      │        │  ─ Storage (site photos,     │
│    Route Handlers           │        │    floor plans — v1.1)       │
│  ─ supabase-js + @supabase/ │        │                              │
│    ssr (cookie sessions)    │        │                              │
└─────────────────────────────┘        └──────────────────────────────┘
```

- **Rendering**: Server Components for data pages; client components only for forms/interactivity.
- **Data access**: All queries go through the Supabase client with the user's JWT so RLS applies. The `service_role` key is used only in server-side admin routes (user invitation), never shipped to the browser.
- **Validation**: Zod schemas shared between client forms and route handlers.

### Data Model (core tables)

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | user_id (FK auth.users), full_name, role (`hq_admin` \| `country_manager`), country_code (nullable for HQ) | Role/country drive RLS. |
| `sites` | id, country_code (`VN` \| `TH` \| `ID` \| `MY`), name, address, timezone, contact fields, archived_at | Root of all records. |
| `isp_circuits` | site_id, provider, circuit_id, bandwidth, type, static_ips[], contract_start, contract_end, monthly_cost, support_phone | |
| `network_devices` | site_id, device_type, brand, model, hostname, mgmt_ip, firmware, serial, warranty_end, credential_ref | `credential_ref` is a text pointer, never a secret. |
| `ip_schemes` / `vlans` | site_id, subnet, vlan_id, name, purpose, gateway, dns, dhcp_range | |
| `vpn_links` | site_id, peer, tunnel_type, status | |
| `cctv_recorders` | site_id, brand, model, channels, storage_tb, retention_days, firmware, location | |
| `cctv_cameras` | recorder_id, label, location_desc, camera_type, resolution, outdoor, status | |
| `maintenance_logs` | target_table, target_id, date, action, performed_by, next_due | Shared for network + CCTV. |
| `audit_log` | actor, action, table, record_id, diff, timestamp | Insert via Postgres triggers. |

Common columns on all inventory tables: `created_by`, `created_at`, `updated_at`, `last_verified_at`.

### Integration Points

- **Supabase Auth**: email/password with invited-users-only signup (public signup disabled). Session handled via `@supabase/ssr` cookies.
- **Supabase Postgres**: schema + RLS policies managed as SQL migrations in-repo (`supabase/migrations`), applied via Supabase CLI in CI.
- **Supabase Storage** (v1.1): site photos and network diagrams, bucket-level policies mirroring country RLS.
- **No third-party APIs** in MVP.

### Security & Privacy

- **Row Level Security (mandatory)**: every table has RLS enabled. Policy pattern: `hq_admin` → all rows; `country_manager` → rows whose `site.country_code` matches their profile. RLS policies covered by automated tests (pgTAP or integration tests using two test users).
- **No secrets in the database**: enforced by convention + code review; `credential_ref` fields are labeled in the UI ("link to password manager entry").
- **Transport**: HTTPS only; Docker container sits behind a TLS-terminating reverse proxy.
- **Environment**: `SUPABASE_SERVICE_ROLE_KEY` only in server env, never `NEXT_PUBLIC_*`.
- **Audit**: immutable `audit_log` (no update/delete policies) for all mutations.
- **Data residency**: Supabase project region chosen in Southeast Asia (Singapore) — closest to all four countries; no PII beyond staff contact info, but note Indonesia PDP Law / Vietnam Decree 13 if employee data expands later.

### Deployment

- **Dockerfile**: multi-stage build (`node:22-alpine` → `next build` with `output: "standalone"` → minimal runtime image, non-root user, `PORT=3000`).
- **Config via env**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Environments**: one Supabase project for staging, one for production; migrations promoted via CI.
- **Host**: any Docker-capable host (VPS, container service); out of scope for this document beyond the Dockerfile contract.

---

## 5. Risks & Roadmap

### Phased Rollout

| Phase | Scope | Target |
|---|---|---|
| **MVP (v1.0)** | Auth + roles + RLS, sites, network details (circuits, devices, IP schemes, VPN), CCTV details (recorders, cameras, maintenance logs), global search, dashboard, renewals view, audit log. Seed with 1 pilot country (Malaysia). | ~4–6 weeks |
| **v1.1** | CSV import/export, email notifications for expiries and stale records, HQ Viewer role, Supabase Storage for photos/diagrams, per-site printable summary. | +4 weeks |
| **v2.0** | Additional record types (servers, licenses, telephony), optional read-only API for other internal tools, additional countries, natural-language search (evaluate). | TBD |

### Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **RLS policy mistakes** leak cross-country data | High — trust/security failure | Automated RLS tests with per-role test users in CI; deny-by-default policies; manual pen-test of API routes before launch. |
| **Data entry burden** — managers don't populate records | High — empty registry is worthless | Pilot with one country first; keep forms minimal (required fields only); CSV import prioritized in v1.1; adoption KPI tracked. |
| **Data goes stale** after initial entry | Medium | `last_verified_at` + review-cycle flagging on dashboard from day one; email nudges in v1.1. |
| **Secrets creep into free-text fields** | High | UI warnings on notes fields; periodic regex scan for password-like strings; policy in onboarding doc. |
| **Supabase vendor lock-in** | Low–Medium | Plain Postgres schema + SQL migrations; auth is the main coupling — acceptable for an internal tool. |
| **Schema churn** as real-world device data doesn't fit fields | Medium | Include a structured `attributes jsonb` column on device/camera tables for country-specific extras; review after pilot. |

---

## Open Questions

1. Should HQ define a **standard retention minimum** for CCTV (proposed default: 30 days) — and does any country have a stricter legal requirement to encode?
2. Is there an existing **password manager** (e.g., Bitwarden, 1Password) whose entry URLs `credential_ref` should link to?
3. Pilot country confirmation — Malaysia assumed. Correct?
4. Expected record volume per country (sites × devices × cameras) — assumed < 10k total records; confirm no site has hundreds of cameras.
