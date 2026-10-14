# Workboard — Competitor Analysis

> Scope: how Workboard, a local-first project & task management app built as a
> portfolio-grade engineering artifact, compares against the commercial tools it
> most resembles — **Jira** (the enterprise anchor), **Trello** (closest analog),
> and **Linear** (closest modern analog).
>
> Pricing and feature notes reflect the 2026 market and are approximate; vendors
> change tiers frequently. Sources are listed at the end.

---

## 1. Executive summary

Workboard is a **single-user, offline-first, browser-local** project and task
manager: Kanban + list views, projects/tasks CRUD, advanced filtering with URL
state, labels, saved views, trash with undo, bulk actions, a `⌘/Ctrl+K` command
palette, WCAG 2.2 AA accessibility, and IndexedDB persistence. It has **no
backend, no accounts, no collaboration, and no sync**.

Because of that, Workboard does not compete with Jira/Trello/Linear as a product
— it competes as a **demonstration of frontend engineering craft**. The right
question is therefore not "will teams switch?" but **"which product's UX and
quality bar is Workboard benchmarking against, and what would it take to become
a real contender?"**

The three products analyzed map cleanly onto that question:

| Tool       | Why it's in the comparison                                                            | What Workboard borrows / aims at                         |
| ---------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Jira**   | The enterprise standard; the default "serious" PM tool                                | Workflow configurability, hierarchy, reporting           |
| **Trello** | The simplest Kanban tool; the closest match to Workboard's **scope**                  | Kanban-first, low-friction, instant, single-board UX     |
| **Linear** | The modern benchmark for **speed + keyboard-driven UX** (the craft Workboard targets) | Command palette, keyboard-first nav, performance, polish |

**Bottom line:** Workboard's feature _surface_ most resembles **Trello**; its
_interaction model and quality bar_ most resemble **Linear**; its _aspirational
scope_ is **Jira**. It matches none of them on collaboration, integrations, or
scale — and it isn't meant to. Its competitive edge is **data ownership +
offline-first + zero-cost + accessibility**, which is a real (if narrow) niche.

---

## 2. Workboard at a glance (as-built)

Grounded in `README.md`, `PROJECT_SPEC.md`, `docs/architecture.md`, `CASE_STUDY.md`,
and `HANDOFF_COMPLETE.md`.

**Product**

- React 18 + TypeScript + Vite; React Router v7; TanStack Query; React Hook Form + Zod.
- Storage: IndexedDB via `idb`, localStorage fallback. **No server, nothing leaves the browser.**
- Views: Dashboard, Projects (+ project Kanban), global Tasks (Kanban/list), Labels, Saved Views, Trash, Settings.
- Features: CRUD for projects/tasks, status/priority/due date/assignee/tags, overdue
  indicators, search + multi-filter + sort + pagination with shareable URL state,
  bulk actions, soft delete + undo toast + trash/restore/purge, Kanban drag & drop,
  command palette + `g`-key navigation + shortcuts dialog, light/dark/system theme,
  JSON import/export with validation, demo data.
- Accessibility: WCAG 2.2 AA target, axe scans in E2E, focus management, live regions.
- Quality: 280 unit tests (~89.6% stmts / 78.5% branches), 144 E2E tests, lint/typecheck
  clean, bundle budget ≤100 KB gzip, Lighthouse targets (perf ≥90, a11y ≥95).

**Honest gaps (from `README.md` "Known Limitations" and `HANDOFF_COMPLETE.md`)**

- No real-time collaboration, no backend/API, no auth, no file attachments,
  no recurring tasks, no task dependencies/subtasks, no calendar/timeline.
- Saved Views are applied on the Tasks page (filters encoded in the URL) and, like labels and
  preferences, round-trip through JSON export/import.
- Scale ceiling ~10,000 tasks before performance degrades (in-memory filter/sort/paginate).
- Single user, single device, manual JSON export to move data.

---

## 3. The comparison set

### Why these three (and not others)

The category splits into roughly five archetypes. Workboard sits in the
**"flexible board/list PM"** archetype and pilfers UX from the **"fast issue
tracker"** archetype.

| Archetype                         | Example tools                      | Relation to Workboard                               |
| --------------------------------- | ---------------------------------- | --------------------------------------------------- |
| Enterprise workflow / ALM         | **Jira**, Azure DevOps, Rally      | Aspirational scope; opposite complexity philosophy  |
| Visual Kanban / lightweight PM    | **Trello**, Plaky, Basecamp        | **Closest scope match**                             |
| Modern issue tracker (DX-focused) | **Linear**, Shortcut, Height       | **Closest UX/quality match**                        |
| All-in-one work OS                | Asana, ClickUp, monday.com, Notion | Adjacent; more features, more bloat                 |
| Personal task manager             | Todoist, TickTick, Things          | Adjacent; single-user overlap, no project structure |

Two competitors are therefore forced and one is chosen:

- **Forced (requested): Jira.**
- **Best analog #1: Trello** — same core job (boards + cards + lists), simplest UX, closest feature scope.
- **Best analog #2: Linear** — the app Workboard is deliberately imitating in tone: keyboard-first, fast, opinionated, polished.

Honorable mentions (Asana, ClickUp, monday.com, Notion, Todoist) are covered briefly
in §7.

---

## 4. Deep dives

### 4.1 Jira (Atlassian) — the enterprise anchor

**What it is.** The dominant enterprise project/issue tracker. Deeply
configurable: custom workflows, issue types, screens, fields, permissions,
sprints/backlogs, roadmaps, epics → stories → subtasks, automation rules,
dashboards, and a vast marketplace (Confluence, Bitbucket, 3,000+ apps).

**Strengths**

- Unmatched **workflow configurability** and governance across many teams.
- **Agile-native**: Scrum/Kanban boards, sprints, velocity, burndown, epics/hierarchy.
- **Ecosystem**: Confluence docs, Bitbucket/GitHub/Bitbucket integration, Marketplace, SSO, audits.
- **Reporting/roadmaps/portfolios** and enterprise-grade permissions/security.
- Scales from 3 people to tens of thousands.

**Weaknesses**

- **Heavy and slow** to configure; notorious admin/project-setup overhead.
- UI complexity and performance complaints; poor "time to first value" for small teams.
- Expensive at Premium/Enterprise tiers; costs escalate fast with seats.
- Overkill for individuals and small, simple boards.

**2026 pricing (approx., per user/month)**

- Free: up to 10 users.
- Standard: ~$7.91–$8.60 (first 100 seats).
- Premium: ~$14.54.
- Enterprise: custom. (Cloud admin/automation limits apply per tier.)

**vs Workboard**

- Jira has hierarchy (epics/subtasks), sprints, reporting, automation, and
  collaboration — Workboard has **none** of these.
- Workboard has **zero setup friction, zero cost, offline operation, and total data
  ownership** — Jira requires cloud accounts, admin config, and a network.
- Philosophy differs deliberately: Jira = _configurable and heavy_; Workboard =
  _fast, opinionated, small_. This is the same philosophical split as Jira vs Linear.

**What Workboard should learn from Jira:** hierarchy (epics/subtasks) and at least a
read-only roadmap/reporting story are the most requested "serious tool" features and
the clearest gaps in Workboard's domain model.

---

### 4.2 Trello (Atlassian) — best analog #1 (closest scope)

**What it is.** The canonical, simplest Kanban tool: boards → lists → cards,
drag & drop, labels, checklists, due dates, attachments, comments, Power-Ups.
Owned by Atlassian, so it integrates with Jira/Confluence.

**Strengths**

- **Lowest learning curve** in the category — "so easy it needs no manual".
- **Visual-first Kanban** with satisfying drag & drop.
- Generous free tier; strong mobile apps; huge template library and Power-Ups.
- Real-time, multi-user collaboration out of the box.

**Weaknesses**

- **Kanban-only** on free (no list/timeline/calendar/dashboard views).
- Weak for large projects: no dependencies, limited hierarchy (checklists ≠ subtasks
  in depth), no native sprint/velocity.
- Free plan caps: **10 open boards / workspace, 10 collaborators, 10 MB per attachment**.
- Reporting, dashboards, timeline, and advanced views are **Premium+**.

**2026 pricing (approx., per user/month)**

- Free: $0 (10 boards, 10 collaborators, 10 MB/attachment).
- Standard: ~$5 annual / ~$6 monthly.
- Premium: ~$10 annual / ~$12.50 monthly (adds Calendar/Timeline/Dashboard views, more automation).
- Enterprise: ~$17.50.

**vs Workboard (the closest head-to-head)**

| Dimension              | Trello                                   | Workboard                                   |
| ---------------------- | ---------------------------------------- | ------------------------------------------- |
| Kanban board           | ✅ core                                  | ✅ (drag & drop, HTML5)                     |
| List view              | ❌ free-tier (table view is Premium-ish) | ✅ native list with sort/pagination         |
| Filtering/sorting      | Basic (per-board filters)                | ✅ advanced multi-filter + sort + URL state |
| Command palette        | ❌ (improving, not core)                 | ✅ `⌘/Ctrl+K` + keyboard nav                |
| Labels                 | ✅ (color labels)                        | ✅ label manager                            |
| Saved views            | ⚠️ via filters (paid features)           | ✅ named views applied to Tasks (URL state) |
| Collaboration          | ✅ real-time                             | ❌ single-user                              |
| Attachments            | ✅ (10 MB free)                          | ❌ none                                     |
| Offline/data ownership | ❌ cloud                                 | ✅ browser-local, JSON export               |
| Cost                   | Freemium; paid for views/scale           | Free, no account                            |

**Takeaway:** Workboard already **out-features free Trello** on the data layer
(list view, advanced filtering, bulk actions, trash/undo, command palette) while
Trello wins decisively on **collaboration, attachments, mobile apps, and polish at
scale**. Trello's free-tier pains (board caps, view paywalls, 10 MB attachments) are
exactly the surfaces where a local-first alternative can claim "unlimited and unlimited-free."

---

### 4.3 Linear — best analog #2 (closest UX / quality bar)

**What it is.** A modern, opinionated issue tracker for software teams, famous for
**speed** and a **keyboard-first, command-driven** interface. Cycles (sprints),
projects, roadmaps, triage, Git integration, and real-time sync.

**Strengths**

- **Extreme performance** — navigation and search feel instant; sub-second interactions.
- **Keyboard-first**: command menu (`⌘K`), shortcuts everywhere, minimal mouse dependence.
- **Opinionated and clean** — little config, strong defaults, excellent information density.
- **Polish + DX** consistently rated above Jira; strong Git/GitHub integration and automation.
- Real-time multiplayer sync and a well-loved, fast mobile app.

**Weaknesses**

- **Too opinionated** for non-software-team workflows; weaker for non-eng departments.
- Less configurable than Jira; fewer enterprise governance/portfolio features.
- Requires cloud accounts and per-seat payment beyond the free/trial tier.
- Occasional complaints about a steep "unlearn old tracker" curve and limited external reporting.

**2026 pricing (approx., per user/month, annual)**

- Free: for small teams (unlimited members, capped active issues per team).
- Basic: ~$10 (adds teams/unlimited issues).
- Business: ~$16 (adds advanced automation/features).
- Enterprise: custom.

**vs Workboard**
Workboard is essentially **"Linear's UX philosophy applied to a local-first,
single-user board app"**: the command palette, keyboard navigation, optimistic
updates, fast client-side filtering, and clean design tokens all echo Linear.

- Linear is **real-time, multiplayer, Git-integrated, and battle-tested at scale**.
- Workboard is **offline, free, private, and self-contained** — but single-user and ~10k-task-capped.
- Linear's own speed comes from a server + sync engine; Workboard's comes from keeping
  everything in memory and the browser.

**What Workboard should learn from Linear:** the performance _budget culture_ (fast
is a feature), the opinionated defaults that reduce configuration, and the fact that
`⌘K` + keyboard-first is a legitimate differentiator, not a gimmick.

---

## 5. Feature matrix (Workboard vs Jira vs Trello vs Linear)

Legend: ✅ full · 🟡 partial/paid-tier/limited · ❌ absent · ➖ N/A (single-user, local)

| Capability                         |     Workboard      |     Jira      |  Trello   | Linear |
| ---------------------------------- | :----------------: | :-----------: | :-------: | :----: |
| Projects / boards                  |         ✅         |      ✅       |    ✅     |   ✅   |
| Tasks / issues / cards             |         ✅         |      ✅       |    ✅     |   ✅   |
| Kanban board                       |         ✅         |      ✅       |    ✅     |   ✅   |
| List/table view                    |         ✅         |      ✅       |    🟡     |   ✅   |
| Calendar / timeline / roadmap      |         ❌         |      ✅       |    🟡     |   ✅   |
| Status / priority / due / assignee |         ✅         |      ✅       |    🟡     |   ✅   |
| Labels / tags                      |         ✅         |      ✅       |    ✅     |   ✅   |
| Advanced filter + sort             |         ✅         |      ✅       |    🟡     |   ✅   |
| Saved views / filters              |         ✅         |      ✅       |    🟡     |   ✅   |
| Bulk actions                       |         ✅         |      ✅       |    🟡     |   ✅   |
| Subtasks / dependencies / epics    |   🟡 (sub-tasks)   |      ✅       |    🟡     |   ✅   |
| Sprints / cycles / velocity        |         ❌         |      ✅       |    ❌     |   ✅   |
| Reporting / dashboards             | 🟡 (basic metrics) |      ✅       |    🟡     |   ✅   |
| Automation rules                   |         ❌         |      ✅       |    🟡     |   🟡   |
| Real-time collaboration            |         ❌         |      ✅       |    ✅     |   ✅   |
| Comments / mentions                |         ❌         |      ✅       |    ✅     |   ✅   |
| File attachments                   |         ❌         |      ✅       |    🟡     |   ✅   |
| Notifications / email              |         ❌         |      ✅       |    ✅     |   ✅   |
| Mobile apps                        |   ❌ (web only)    |      ✅       |    ✅     |   ✅   |
| Integrations / marketplace         |         ❌         |     ✅✅      |    ✅     |   🟡   |
| Git / dev-tool integration         |         ❌         |      ✅       |    🟡     |  ✅✅  |
| Auth / SSO / permissions           |         ❌         |      ✅       |    🟡     |   ✅   |
| Offline / local-first              |         ✅         |      ❌       |    🟡     |   ❌   |
| Data ownership / no-lock-in        |         ✅         |      🟡       |    🟡     |   🟡   |
| Command palette / keyboard-first   |         ✅         |      🟡       |    🟡     |  ✅✅  |
| Accessibility (WCAG 2.2 AA target) |         ✅         |      🟡       |    🟡     |   🟡   |
| Free for unlimited use             |         ✅         | 🟡 (10 users) | 🟡 (caps) |   🟡   |

**Reading the matrix:** Workboard is competitive on the **single-user data and
interaction layer** and still absent from the **collaboration and integration
layers**; hierarchy is now partial (sub-tasks shipped in `WB-102`; epics and
dependencies are still open) — which is exactly its stated limitation, not a
defect to hide.

---

## 6. Dimension-by-dimension analysis

**Feature depth.** Jira ≫ Linear > Workboard ≈ Trello. Workboard is a superset of
_simple_ Trello for a single user, but has no hierarchy, sprints, dependencies,
attachments, or reports.

**UX / interaction quality.** Linear leads (speed + keyboard-first); Workboard
deliberately mirrors it and, by measurement (in-memory filter <5 ms, optimistic
updates ~8 ms), lands in the same league for the workflows it supports. Jira lags on
perceived speed; Trello is easy but shallow.

**Performance & scale.** Linear ≈ Jira ≈ Trello (server-backed, effectively
unbounded) vs Workboard (~10k tasks ceiling, in-memory). Workboard wins raw
**first-paint/offline latency** (no network); loses on dataset size and concurrency.

**Collaboration.** Jira = Trello = Linear (multiplayer) vs Workboard (❌). This is the
single largest gap and the one that disqualifies Workboard as a _team_ tool.

**Pricing / TCO.** Workboard ($0, forever, no account) dominates on cost. Trello free
is capped (10 boards/10 collaborators); Jira free caps at 10 users and gets expensive
at Premium; Linear free is capped by active issues; Asana free is ~2 users.
**For an individual, Workboard is the cheapest "unlimited" option by a wide margin.**

**Data ownership / privacy.** Workboard is local-only → maximum privacy, zero vendor
lock-in, works offline. Competitors are cloud SaaS (some offer export; all require
accounts). This is Workboard's **strongest genuine differentiator.**

**Extensibility / integrations.** Jira (Marketplace + automation) ≫ Linear >
Trello (Power-Ups) ≫ Workboard (none). No API means no automation, no Git hooks, no
Slack.

**Accessibility.** Workboard **targets** WCAG 2.2 AA with automated axe scans — a
strong, verifiable selling point. Competitors vary; large SaaS tools have improved
but historically lag on keyboard/screen-reader polish.

**Platform.** Competitors all ship native mobile apps + desktop; Workboard is
responsive web only, offline-capable.

---

## 7. Honorable mentions (adjacent tools)

| Tool           | Archetype               | One-line position vs Workboard                                                                                                  |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Asana**      | All-in-one PM           | Timeline/portfolios/workloads; free limited to ~2 users; Starter ~$10.99, Advanced ~$24.99/user/mo. More structure, cloud-only. |
| **ClickUp**    | All-in-one "everything" | Feature-maximalist, Free Forever; ~$7–$12/user/mo paid. Workboard is its opposite: minimal and private.                         |
| **monday.com** | Visual work OS          | Highly customizable boards/automation; free ~2 seats, ~$9–$19/seat/mo. More powerful, heavier, cloud.                           |
| **Notion**     | Docs + databases        | Flexible but DIY for task management; collaborative cloud. Different job, overlaps on backlog/wiki.                             |
| **Todoist**    | Personal tasks          | Closest on the _single-user_ axis; no Kanban projects/reporting depth. Free tier + ~$5/mo Pro.                                  |

Together these confirm the archetype split: Workboard's true peers are the
**lightweight board/tracker** tools (Trello, Linear, Todoist), not the all-in-one
work OS suites.

---

## 8. Positioning

**Current reality (for the portfolio):**

> "A Linear-grade interaction model and Trello-grade scope, delivered as a
> zero-cost, offline-first, privacy-respecting, WCAG 2.2 AA web app — built to
> portfolio quality with tests, docs, and measured performance."

**Who it genuinely serves today:** individuals, students, freelancers, and
privacy/offline-sensitive users who want Kanban + list + strong filtering with **no
account, no cost, no cloud**, and who don't need collaboration.

**Who it does NOT serve:** teams, anyone needing sync/share/mobile-native, and
anyone needing hierarchy/sprints/reporting/integrations. That is a deliberate scope
boundary, not a bug.

**One-line competitive claim (defensible):**

> "Unlimited free, offline, private task management with the keyboard-first UX of
> Linear and the simplicity of Trello — no account required."

---

## 9. Strategic recommendations (roadmap)

Ordered by _portfolio value ÷ effort_. The first three turn Workboard's stated gaps
into genuine differentiators; the rest close credibility gaps toward "real tool".

**Tier 1 — Cheap, high-signal (do first)**

1. **Finish Saved Views** — ✅ **done** (`WB-101`): saved `filters` now apply on the Tasks page
   via URL state, with a "save current filters as a view" action and tag filtering. This closed the
   one half-built feature.
2. **Sub-tasks** — ✅ **done** (`WB-102`): optional `parentId` with one-level nesting,
   done/total progress, and cascade delete/restore through the trash. Task
   dependencies (`blockedBy`) remain open (`WB-103`).
3. **Multi-format export/import + print/CSV** — reinforce the data-ownership story
   (CSV/Markdown export, printable board).

**Tier 2 — Differentiators** 4. **Optional, self-hostable sync (CRDT/`Yjs` or a tiny API)** — add an `ApiRepository`
behind the existing repository interface (the architecture already anticipates this).
Turns "no collaboration" into "collaboration _you_ host." 5. **Calendar / timeline view** — closes the view gap with Trello Premium/Asana. 6. **Basic reporting** — cycle time, throughput, overdue trend (uses existing metrics).

**Tier 3 — Platform** 7. **File attachments** (IndexedDB blobs), **recurring tasks**, **reminders/notifications**. 8. **Public REST/plugin API** and webhooks. 9. **PWA / installable offline app** + optional encrypted backup.

**Non-goals (keep deliberately):** real-time multiplayer at Jira scale, marketplace,
SSO/enterprise governance. Owning these would abandon Workboard's differentiators.

---

## 10. Threats & risks to the position

| Risk                                                          | Impact                                 | Mitigation                                                            |
| ------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| "Local-only" reads as a limitation, not a feature             | Undermines the core pitch              | Market it as privacy/offline/ownership; add optional self-host sync   |
| Linear/Trello free tiers keep improving                       | Narrows the "free" advantage           | Compete on offline + ownership + a11y, not just price                 |
| ~10k-task scale ceiling                                       | Blocks power users                     | Virtualize lists; paginate at repo level; document the limit          |
| No collaboration = no teams = a portfolio demo, not a product | Caps real adoption                     | Ship a self-hosted/optional sync path before positioning as a product |
| Half-built Saved Views look unfinished                        | Visible credibility gap in a portfolio | ✅ Resolved (`WB-101`): views apply on the Tasks page                 |

---

## 11. Verdict

- **Against Jira:** Workboard is not a competitor; it's the _anti-Jira_ — instant,
  free, private, unconfigurable. Its gap (hierarchy, reporting, integrations) is Jira's moat.
- **Against Trello:** Workboard already beats **free** Trello on list view, filtering,
  bulk actions, trash/undo, and keyboard UX, while matching its Kanban core. Trello
  wins on collaboration, attachments, mobile, and ecosystem.
- **Against Linear:** Workboard matches Linear's _interaction philosophy_ at a
  fraction of the scope, and only Linear's cloud/sync engine explains the remaining
  performance and collaboration gap.

**Overall:** as a product, Workboard is a credible **solo/offline** alternative with a
sharp, defensible niche (free, private, accessible, keyboard-first). As a portfolio
piece, it benchmarks against the right tools and knows precisely which gaps are
intentional — which is exactly what a competitor analysis should prove.

---

## Sources

- Atlassian — Jira pricing: https://www.atlassian.com/software/jira/pricing
- Atlassian — Explore Jira Cloud plans: https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/
- SaaS reviews — Jira pricing 2026: https://saascrmreview.com/jira-pricing/ , https://www.eesel.ai/blog/jira-pricing-guide
- Trello — Pricing: https://www.trello.com/pricing ; plan limits: https://support.atlassian.com/trello/docs/which-trello-plan-is-best-for-me/
- Trello pricing 2026 (third-party): https://lifestack.ai/blog/trello-pricing , https://www.activepieces.com/blog/trello-pricing-2026-plans-costs-and-hidden-fees , https://ones.com/blog/is-trellos-free-plan-enough-for-project-management-in-2026/
- Linear — Pricing: https://linear.app/pricing ; pricing analysis 2026: https://www.usecarly.com/blog/linear-pricing/ , https://lifestack.ai/blog/linear-pricing
- Linear vs Jira 2026: https://www.laneapp.co/blog/jira-vs-linear-which-tool-wins , https://toolfinder.com/comparisons/linear-vs-jira , https://everhour.com/blog/linear-vs-jira/
- Asana — Pricing: https://asana.com/pricing ; 2026 breakdowns: https://www.rock.so/blog/asana-pricing , https://www.activepieces.com/blog/asana-pricing-2026-plans-tiers-and-real-costs
- Category round-ups (2026): https://till-freitag.com/en/blog/best-project-management-tools , https://asana.com/resources/best-project-management-software

_Compiled: 2026. Pricing/feature details are approximate and subject to change._
