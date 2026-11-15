import type { ImportDataValidated } from '@/domain/validation';
import { validateImportData } from '@/domain/validation';
import sampleDataUrl from '../../../project-management/workboard-import.json?url';

/**
 * Fetches Workboard's own backlog as demo data. Loaded on demand (never on startup) and emitted
 * as a separate JSON asset, so it costs nothing in the JS bundle. Throws on a network error or
 * on data that fails validation.
 */
export async function loadSampleData(
  fetchImpl: typeof fetch = fetch
): Promise<ImportDataValidated> {
  const response = await fetchImpl(sampleDataUrl);
  if (!response.ok) throw new Error(`Sample data could not be loaded (HTTP ${response.status}).`);
  const data: unknown = await response.json();
  return validateImportData(data);
}
