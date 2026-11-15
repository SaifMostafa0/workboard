import { describe, expect, it } from 'vitest';
import validExport from '../../../../project-management/workboard-import.json';
import { loadSampleData } from '../sampleData';

describe('loadSampleData', () => {
  it('resolves with validated data when the sample file loads', async () => {
    const result = await loadSampleData(async () => new Response(JSON.stringify(validExport)));

    expect(result.projects.length).toBeGreaterThan(0);
  });

  it('rejects with the HTTP status when the sample file cannot be fetched', async () => {
    const load = loadSampleData(async () => new Response('', { status: 404 }));

    await expect(load).rejects.toThrow('HTTP 404');
  });

  it('rejects when the sample file does not match the import schema', async () => {
    const load = loadSampleData(async () => new Response(JSON.stringify({ nope: true })));

    await expect(load).rejects.toThrow();
  });
});
