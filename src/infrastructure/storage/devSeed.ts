import type { ImportDataValidated } from '@/domain/validation';
import { validateImportData } from '@/domain/validation';

/**
 * Loads this repository's own Workboard backlog as first-run seed data —
 * **development only**.
 *
 * The payload is the generated `project-management/workboard-import.json`
 * (produced from `tickets/WB-*.md` by `npm run tickets:build`), so running
 * `npm run dev` dogfoods the app with the very projects and tasks that track
 * its own development. `initializeApp` re-applies it whenever the app has no
 * projects, so deleting your data while developing never leaves you with a
 * permanently empty Workboard. The dynamic import sits behind a
 * statically-analysable `import.meta.env.DEV` guard, so production builds drop
 * the branch (and never emit the seed JSON): an installed production app starts
 * empty, with no placeholder data, and never re-seeds.
 */
export async function loadDevSeed(): Promise<ImportDataValidated | null> {
  if (!import.meta.env.DEV) return null;

  const module = await import('../../../project-management/workboard-import.json');
  return validateImportData(module.default);
}
