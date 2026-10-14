# Tickets

This folder is the **source of truth** for the backlog. Each `WB-###-*.md` file is one ticket,
with flat YAML frontmatter plus a markdown body.

- Do not rename a ticket file without updating its `id` (the id and filename prefix must match).
- After editing tickets, run `npm run tickets:build` to refresh `BACKLOG.md` and the Workboard import.
- Progress made in the Workboard app flows back with `npm run tickets:sync <export.json>`.

Full format, taxonomy and workflow: [../docs/project-management.md](../docs/project-management.md).
Machine-readable schema: [../project-management/ticket.schema.json](../project-management/ticket.schema.json).
