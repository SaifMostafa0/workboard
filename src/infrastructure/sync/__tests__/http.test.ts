import { describe, expect, it, vi } from 'vitest';
import { createFetchHttpClient, type HttpRequest } from '../http';

const response = (status: number, text: string): Response =>
  ({ status, text: async () => text }) as unknown as Response;

describe('createFetchHttpClient', () => {
  it('serialises the request and parses a JSON response', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      response(200, JSON.stringify({ item: { id: 'p1' } }))
    );
    const client = createFetchHttpClient({
      baseUrl: 'https://sync.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const outcome = await client.request({
      method: 'PUT',
      path: '/storage/projects/p1',
      body: { item: { id: 'p1' } },
    });

    expect(outcome).toEqual({ ok: true, status: 200, body: { item: { id: 'p1' } } });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://sync.example.com/storage/projects/p1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ item: { id: 'p1' } }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('sends no body or content-type header for a GET', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      response(200, JSON.stringify({ items: [] }))
    );
    const client = createFetchHttpClient({
      baseUrl: 'https://sync.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.request({ method: 'GET', path: '/storage/projects' });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toBe('https://sync.example.com/storage/projects');
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toBeUndefined();
  });

  it('keeps a non-JSON body as raw text', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => response(200, 'not json'));
    const client = createFetchHttpClient({
      baseUrl: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const outcome = await client.request({ method: 'GET', path: '/x' } as HttpRequest);
    expect(outcome).toEqual({ ok: true, status: 200, body: 'not json' });
  });

  it('returns ok:false when the transport throws (offline)', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
      throw new Error('Failed to fetch');
    });
    const client = createFetchHttpClient({
      baseUrl: 'https://sync.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const outcome = await client.request({ method: 'GET', path: '/storage/projects' });
    expect(outcome).toEqual({ ok: false, error: 'Failed to fetch' });
  });
});
