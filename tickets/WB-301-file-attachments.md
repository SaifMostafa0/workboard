---
id: WB-301
title: Add file attachments stored in IndexedDB
status: todo
priority: medium
project: t3-platform
assignee: unassigned
tags: tier:3, area:storage, area:ui, type:feature
created: 2026-10-14
updated: 2026-10-14
source: readme-gaps
---

## Summary

Tasks cannot hold files. Attachments are expected in every comparable tool. Store blobs locally
in IndexedDB so the offline, no-upload promise is preserved.

## Acceptance criteria

- [ ] A task can hold zero or more attachments (name, type, size, blob).
- [ ] Files are stored in a dedicated IndexedDB object store; metadata is validated with Zod.
- [ ] A configurable per-file size limit and total-quota guard surface clear errors on `QUOTA_EXCEEDED`.
- [ ] Attachments can be added via drag-and-drop and a file picker, downloaded, and removed.
- [ ] Non-text files never render inline; downloads use safe `Content-Disposition` behaviour.
- [ ] Import/export clearly states that attachments are local-only (see `WB-404` for the export gap).
- [ ] Tests cover add/remove and error paths; the storage adapter's failure injection is exercised.

## Notes

- Keep blobs out of the JSON export by default to avoid multi-megabyte backups; document the trade-off.
- Consider whether attachments live in the trash lifecycle with their task.
