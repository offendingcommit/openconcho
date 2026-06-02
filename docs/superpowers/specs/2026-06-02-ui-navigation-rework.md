# UI Navigation Rework — Future Improvements (Draft)

- **Date captured:** 2026-06-02
- **Status:** DRAFT — vision captured from discussion, **not yet brainstormed or scheduled**.
  Needs a full `brainstorming` → `writing-plans` pass before any implementation.
- **Author intent:** reduce overlap between three navigation surfaces and make
  drill-down navigation clearer.

## Motivation

Today three surfaces overlap:

- **Instance selector** — pick the active Honcho connection.
- **Dashboard** (`packages/web/src/components/dashboard/Dashboard.tsx`) — workspace
  count + queue status for the active instance.
- **Fleet** (`packages/web/src/components/fleet/`) — cross-instance observability:
  workspaces / sessions / queue side-by-side per instance.

Dashboard and Fleet are **nearly identical** in what they show (workspace/queue
metrics), differing mainly in single-instance vs all-instances scope. That overlap
is the thing to collapse.

## Proposed information architecture

A single hierarchical drill-down, navigable as an **outline / tree**:

```
Server (instance)
  └─ Workspace
       ├─ Peers
       ├─ Sessions
       ├─ Conclusions
       └─ … (queue, dreams, webhooks, etc.)
```

- Navigation drills **Server → Workspace → {Peers | Sessions | Conclusions | …}**.
- An **outline view** makes the hierarchy explicit and improves wayfinding (vs. the
  current flat per-feature pages).

## Fleet folds into Dashboard

- The Dashboard becomes the **unified, all-servers view**: every workspace across
  every server, each labelled **`<workspace> (<server>)`**.
- **Filterable by server** — selecting a server narrows the Dashboard to that
  server's workspaces. Fleet stops being a separate page and becomes an **overlay /
  filter state** on the Dashboard.

## Open question: does standalone Fleet survive?

Fleet "still has merit" — but possibly **repositioned as a settings/management-style
view** (fleet health, per-instance admin) rather than a primary nav destination.
To decide in brainstorming: what is Fleet's unique job once cross-instance browsing
lives in the Dashboard? (Likely: fleet *health/ops*, not fleet *browsing*.)

## Open questions (resolve during brainstorming)

- How does the **instance selector** relate to the new top-level "Server" node — is
  it absorbed into the tree, or kept as a global switcher?
- **Routing**: how does `Server → Workspace → …` map onto TanStack Router flat-route
  files, and how are deep links / breadcrumbs handled?
- What exactly lives in a **settings-like Fleet** (health, queue depth, version, auth
  status)?
- Responsive/mobile behaviour of the outline/tree.
- Migration: does the current `/fleet` route redirect, or stay as the ops view?

## Non-goals (for this capture)

- This is a **vision record**, not an implementation plan. No code, no schedule.
- Does not change the data layer — `compareQueries.ts` / `fleetAggregates.ts`
  already fan out across instances and can back a unified Dashboard unchanged.

## Next step

When prioritised: run `superpowers:brainstorming` against this doc to resolve the
open questions, then `writing-plans` for the implementation. Keep it a separate
concern (its own branch/PR) from the proxy work in #54.
