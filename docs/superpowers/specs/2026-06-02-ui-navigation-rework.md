# UI Navigation Rework — Implementation Spec

- **Date captured:** 2026-06-02
- **Status:** SPEC — agent-ready. Phases 2–3 carry open product questions; resolve them
  via `superpowers:brainstorming` against this doc before implementing those phases.
  Phase 1 is well-defined and can start directly.
- **Branch/PR:** `docs/ui-navigation-rework` (PR #55). Implementation should branch
  separately, one concern per PR (see [[branch-and-pr-one-concern]]).

## For the agent picking this up — start here

1. Read this whole doc, then read the **Current architecture** map below and open the
   cited files to confirm they still match (the codebase moves; verify before acting).
2. If you're doing **Phase 1** (merge Dashboard + Fleet), the design is settled —
   follow the action items. If **Phase 2/3** (the Server drill-down, Fleet
   repositioning), first run `superpowers:brainstorming` to resolve the **Open
   questions** section, then `superpowers:writing-plans`.
3. Honor the repo conventions in **Conventions** below. Gate every change with
   `make ci-web`; tests live in `packages/web/src/test/`.
4. This is a frontend-only change. No backend/data-layer rewrite is required — the
   multi-instance fan-out already exists (see **Data layer**).

## Goals

- **Eliminate the Dashboard/Fleet overlap.** Today `Dashboard` (active instance only)
  and `Fleet` (all instances) render nearly the same metrics. Merge into one
  server-aware Dashboard.
- **Make the hierarchy navigable as Server → Workspace → Peers / Sessions /
  Conclusions / …**, surfaced as an outline/drill-down. The Workspace→children level
  already exists; the missing level is **Server** (today "server" = the active
  instance, switched globally, not navigated).
- **Unify cross-instance browsing into the Dashboard**: show all workspaces across all
  servers labelled `<workspace> (<server>)`, **filterable by server**. Fleet stops
  being a separate browsing page.
- Keep navigation clear via breadcrumbs + an outline view.

## Non-goals

- No backend or Honcho API changes. No data-layer rewrite — `compareQueries.ts` +
  `scopedClient.ts` already fan out across instances.
- No new "real" server entity — a "Server" is an existing `Instance`
  (`packages/web/src/lib/config.ts:25` `instanceSchema`). This is an IA/UX change, not
  a data-model change.
- Not changing the localStorage multi-instance store model.

## Current architecture (where to look)

> Verified 2026-06-02. Paths relative to repo root; `packages/web/` is the SPA.

### Routes (TanStack flat-route; `routeTree.gen.ts` is generated — never hand-edit)
- Generator: `@tanstack/router-plugin/vite` in `packages/web/vite.config.ts` (regen on save).
- Root layout: `src/routes/__root.tsx` → renders `Sidebar` + `<Outlet/>`; redirects to
  `/settings` when no instance configured.
- Top-level: `src/routes/index.tsx` (`/` → `Dashboard`), `fleet.tsx` (`/fleet` →
  `FleetDashboard`), `workspaces.tsx` (`/workspaces` → `WorkspaceList`),
  `seed-kits.tsx`, `settings.tsx`, `explore.tsx` (redirect helper).
- Workspace-scoped (the existing drill-down): `workspaces_.$workspaceId.tsx`
  (`WorkspaceDetail` hub) and
  `workspaces_.$workspaceId_.{peers,sessions,conclusions,dreams,queue,webhooks}.tsx`.
- Detail/param routes: `workspaces_.$workspaceId_.peers_.$peerId.tsx`,
  `…peers_.$peerId_.{chat,playground}.tsx`, `…sessions_.$sessionId.tsx`.

### Navigation
- `src/components/layout/Sidebar.tsx`:
  - `TOP_NAV` array (~line 33) — top-level items (Dashboard, Fleet, Workspaces, Seed
    Kits, Settings).
  - `WORKSPACE_SECTIONS` array (~line 41) — the workspace sub-nav (Peers, Sessions,
    Conclusions, Dreams, Webhooks), conditionally rendered (~271–335) when a workspace
    route is active.
  - Active-instance switcher (~145–226): renders `active.name`/`baseUrl`, health dot,
    dropdown over `instances` via `useInstances()`; `activate(id)` switches.
  - Active-context detection via `matchRoute({ to: "/workspaces/$workspaceId", fuzzy: true })` (~108).
- `src/components/layout/Breadcrumb.tsx` — used by list pages (e.g. `PeerList.tsx`).

### Dashboard vs Fleet (the overlap to merge)
- `src/components/dashboard/Dashboard.tsx` — **active instance only**. Uses
  `useWorkspaces(page, 50)`; per-workspace `useQueueStatus()` via `WorkspaceQueueRow`;
  `GlobalQueueBanner` aggregates totals. Polls 2.5s active / 10s idle.
- `src/components/fleet/FleetDashboard.tsx` — **all instances**. Iterates
  `useInstances().instances` → one `<FleetRow instance=…>` each.
- `src/components/fleet/FleetRow.tsx` — per-instance metrics via
  `createScopedClient(instance)` + `useScopedWorkspaces` + `useQueries` fan-out of
  `scopedQueueStatusOptions` / `scopedConclusionsCountOptions`.
- `src/components/fleet/fleetAggregates.ts` — `computeFleetAggregates(rows)` sums
  workspaces/conclusions/queue/health across instances. **Pure + transport-agnostic —
  reuse as-is.**

### Data layer (already multi-instance capable)
- `src/api/queries.ts` — active-instance hooks: `useWorkspaces`, `useWorkspace`,
  `useQueueStatus`, `usePeers`, `usePeer`, `usePeerRepresentation`, `usePeerCard`,
  `useSessions`, `useSessionMessages`, `useConclusions`, `useChat`, `useScheduleDream`, …
- `src/api/compareQueries.ts` — **scoped (per-instance)** hooks + `useQueries` option
  builders: `useScopedWorkspaces`, `useScopedPeers`, `useScopedQueueStatus`,
  `useScopedConclusionsCount`, `scopedQueueStatusOptions`, `scopedConclusionsCountOptions`.
  Query keys namespaced by `instance.id` (`CK` map) so caches never collide.
- `src/api/client.ts` (`client.current`, active) vs `src/api/scopedClient.ts`
  (`createScopedClient(instance)`, per-instance). `src/api/keys.ts` — `QK` query keys.
- **Conclusion:** fanning a query across all instances is already a solved pattern
  (FleetRow demonstrates it). Server-level aggregation = generalize that pattern.

### Instance ("Server") store
- `src/lib/config.ts` — `instanceSchema`/`Instance` (~25), `InstanceStore`
  (`{instances, activeId}`), CRUD (`addInstance`/`updateInstance`/`deleteInstance`/
  `setActiveInstance`). Persisted to `localStorage` `openconcho:instances`.
- `src/hooks/useInstances.ts` — `{ instances, active, activeId, add, update, remove, activate }`
  via `useSyncExternalStore`; `activate`/`remove` clear the query cache.
- Tests: `src/test/instances.test.ts` (store CRUD), `src/test/fleet.test.tsx`
  (multi-instance fan-out).

### Domain components to reuse for Server-scoped views
- `workspaces/WorkspaceList.tsx`, `workspaces/WorkspaceDetail.tsx`
- `peers/PeerList.tsx`, `peers/PeerDetail.tsx`
- `sessions/SessionList.tsx`, `sessions/SessionDetail.tsx`
- `conclusions/ConclusionBrowser.tsx`
- Each takes a `workspaceId` and calls the active-instance `use*` hooks.

## Target information architecture

```
Server (= Instance)                         ← NEW navigable level (today: global switcher only)
  └─ Workspace                              ← exists: /workspaces/$workspaceId
       ├─ Peers      (+ Peer → chat/playground)
       ├─ Sessions
       ├─ Conclusions
       └─ Dreams / Queue / Webhooks
```

- **Dashboard** = the all-servers landing: every workspace across every server as
  `<workspace> (<server>)`, **filterable by server**; server filter = "all" by default.
  Selecting a single server narrows to that server (and is the entry to its drill-down).
- **Outline/tree** view makes Server→Workspace→section explicit; breadcrumbs reflect it.

## Phased action items

### Phase 1 — Merge Fleet into a server-aware Dashboard (settled; start here)
**Goal:** one Dashboard that shows all workspaces across all servers, server-filterable;
remove the redundant standalone Fleet *browsing* page (see Phase 3 for Fleet's future).

- **Where:** `src/components/dashboard/Dashboard.tsx`, `src/components/fleet/*`,
  `src/routes/index.tsx`, `src/routes/fleet.tsx`, `src/components/layout/Sidebar.tsx`.
- **Steps:**
  1. Generalize the Dashboard to iterate `useInstances().instances` instead of only the
     active instance. Reuse `FleetRow`'s scoped fan-out pattern
     (`createScopedClient` + `scopedQueueStatusOptions`/`scopedConclusionsCountOptions`)
     and `computeFleetAggregates` (reuse as-is) for the totals banner.
  2. Render a unified workspace table: row per workspace across all servers, labelled
     `<workspace> (<server>)`. Add a **server filter** control (dropdown: "All servers"
     + each `instance.name`); default "All". When one server is selected, the table
     narrows and the row link enters that server's workspace drill-down.
  3. Fold `fleetAggregates.ts` totals into the Dashboard header (workspaces, conclusions,
     healthy/unreachable counts) — this is the current Fleet metric-card content.
  4. Update `Sidebar.tsx` `TOP_NAV`: remove the separate "Fleet" item (or repoint it —
     see Phase 3). Keep "Dashboard".
  5. Redirect `/fleet` → `/` (keep the route file as a redirect for back-compat) OR
     remove it and add a redirect in `__root.tsx`.
- **Reuse:** `fleetAggregates.ts`, `FleetRow` logic, `compareQueries.ts`, `useInstances`.
- **Net-new:** server-filter control; the merged Dashboard table.
- **Tests:** extend `src/test/fleet.test.tsx` (or new `dashboard.test.tsx`): asserts the
  unified table renders rows for ≥2 instances with `<workspace> (<server>)` labels, and
  the server filter narrows to one server. Keep `computeFleetAggregates` snapshot tests.

### Phase 2 — Server as a navigable level + outline drill-down (needs brainstorming)
**Goal:** drill Server → Workspace → section from the Dashboard, with an outline view.

- **Where:** `src/routes/` (new server-scoped routes), `Sidebar.tsx` (server-context
  sub-nav analogous to the existing workspace sub-nav), `Breadcrumb.tsx`.
- **Likely steps (confirm in brainstorming):**
  1. Decide the URL scheme — e.g. `/servers/$serverId/workspaces/$workspaceId/...` vs
     keeping `/workspaces/...` scoped to the active server + server selection as state.
     (Resolve "instance selector vs Server node" open question first.)
  2. Add server-context detection in `Sidebar.tsx` (mirror the `matchRoute` workspace
     pattern ~108) and a server-level sub-nav.
  3. Add an outline/tree component for Server→Workspace→section wayfinding.
  4. Extend breadcrumbs to include the Server segment.
- **Reuse:** existing workspace-scoped routes/components; `createScopedClient` to query a
  non-active server without switching the global active instance.
- **Net-new:** server-scoped routes/loaders; outline component; Sidebar server context.

### Phase 3 — Reposition standalone Fleet as an ops/settings view (needs brainstorming)
**Goal:** decide Fleet's residual job once browsing lives in the Dashboard.

- **Open decision:** does Fleet survive as a *health/ops* surface (per-server health,
  queue depth, version, auth status, reachability) — likely under Settings — or is it
  fully absorbed? Resolve in brainstorming.
- **Where:** `src/components/fleet/*`, `src/components/settings/SettingsPage.tsx`,
  `Sidebar.tsx`.

## Validation

- After every change: `make ci-web` (lint + typecheck + test + build) must pass.
- Targeted tests: `pnpm --filter @openconcho/web exec vitest run src/test/<file>`.
- Manual: `make up` (docker) or `make dev-web` (Vite) with ≥2 instances configured;
  confirm the unified Dashboard lists workspaces across servers, the server filter
  narrows correctly, drill-down navigates Server→Workspace→section, and breadcrumbs are
  correct. Toggle demo mode (masking) and light/dark — both must stay correct.
- Acceptance (write as Gherkin per [[gherkin-acceptance-criteria]] when planning):
  e.g. *Given two configured servers, When I open the Dashboard, Then I see each
  server's workspaces labelled `<workspace> (<server>)`; When I filter to one server,
  Then only its workspaces show.*

## Open questions (resolve in brainstorming before Phase 2/3)

1. **Instance selector vs Server node** — does the global switcher stay, get absorbed
   into the Server level, or coexist (switcher = "default server", drill-down = browse
   any)?
2. **Routing** — `/servers/$serverId/...` nested routes vs server-as-state on the
   existing `/workspaces/...` routes. Affects deep links + breadcrumbs.
3. **Fleet's residual role** — ops/health view under Settings, or fully absorbed?
4. **Server-scoped aggregation** — do Peers/Sessions/Conclusions ever aggregate
   *across workspaces within a server* (new `useServer*` hooks), or is drill-down always
   Server→one Workspace→section (no cross-workspace union)? The latter needs zero new
   queries; the former needs new aggregation hooks in `compareQueries.ts`.
5. **Responsive/mobile** behaviour of the outline/tree.

## Conventions to honor

- TanStack flat-route params: cast `as never` at every `navigate()`/`<Link>` callsite
  (see `Sidebar.tsx`, `PeerList.tsx`). Never hand-edit `routeTree.gen.ts`.
- framer-motion: `import { type Variants }` and annotate variant objects; never
  `as const`.
- CSS variables only for theme colors (`var(--text-1)` etc.) — no Tailwind color
  utilities.
- Tests in `packages/web/src/test/`, behavior-focused, mock only at the fetch boundary
  (`@/lib/http`). Gate with `make ci-web`.
- Conventional commits; one concern per PR; push under `offendingcommit`.
- No environment-specific values in code/docs — use `honcho.example.net` / `192.0.2.x`
  (enforced by the pre-commit secret scan).
