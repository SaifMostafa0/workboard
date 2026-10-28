---
id: WB-301
title: Add file attachments stored in IndexedDB
status: done
priority: medium
project: t3-platform
assignee: agent:opencode
tags: tier:3, area:storage, area:ui, type:feature
created: 2026-10-14
updated: 2026-10-28
source: readme-gaps
---

## Summary

Tasks cannot hold files. Attachments are expected in every comparable tool. Store blobs locally
in IndexedDB so the offline, no-upload promise is preserved.

## Acceptance criteria

- [x] A task can hold zero or more attachments (name, type, size, blob).
- [x] Files are stored in a dedicated IndexedDB object store; metadata is validated with Zod.
- [x] A configurable per-file size limit and total-quota guard surface clear errors on `QUOTA_EXCEEDED`.
- [x] Attachments can be added via drag-and-drop and a file picker, downloaded, and removed.
- [x] Non-text files never render inline; downloads use safe `Content-Disposition` behaviour.
- [x] Import/export clearly states that attachments are local-only (see `WB-404` for the export gap).
- [x] Tests cover add/remove and error paths; the storage adapter's failure injection is exercised.

## Updates

**2026-10-28 — done**

- `AttachmentStore` (separate from the JSON `StorageAdapter`) is backed by a dedicated IndexedDB
  `attachments` object store (schema v2); blobs are keyed by `taskId:attachmentId`.
- `src/domain/attachment.ts` enforces 5 MB per file, 10 files per task, 25 MB per task and 100 MB
  total, with sanitised filenames and Zod metadata validation.
- `AttachmentsSection` supports drag-and-drop and a picker, download, remove, inline quota errors
  and a local-only explanatory note. Blobs are cleaned up when a task or project is purged.
- Downloads sanitise the filename again and never render inline; exports (plain and encrypted)
  carry metadata only.
- Tests: domain limits/sanitisation, repository add/get/remove/quota/`NOT_FOUND`/storage-failure
  injection, and component add/drop/remove/download/error paths.

## Notes

- Keep blobs out of the JSON export by default to avoid multi-megabyte backups; document the trade-off.
- Consider whether attachments live in the trash lifecycle with their task.
