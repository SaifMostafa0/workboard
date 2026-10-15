/**
 * Transport port for the optional sync layer (WB-201 spike).
 *
 * This is intentionally tiny and dependency-free. It separates two failure
 * modes that offline-first code must tell apart:
 *
 * - a **transport failure** (`ok: false`) — the request never reached a server
 *   (offline, DNS, abort, CORS). The caller may retry or queue.
 * - an **HTTP response** (`ok: true`) — the server answered; `status` may still
 *   be an error code, which is the server's opinion and usually not retryable.
 *
 * Nothing here throws: the sync layer converts both into the app's
 * `Result<T, E>` model at the adapter boundary.
 */

export type HttpMethod = 'GET' | 'PUT' | 'DELETE';

export interface HttpRequest {
  method: HttpMethod;
  /** Path relative to the client's base URL, e.g. `/storage/projects/p1`. */
  path: string;
  body?: unknown;
}

export type HttpOutcome =
  { ok: true; status: number; body: unknown } | { ok: false; error: string };

export interface HttpClient {
  request(request: HttpRequest): Promise<HttpOutcome>;
}

export interface FetchHttpClientOptions {
  /** Base URL of the sync API, e.g. `https://sync.example.com`. */
  baseUrl: string;
  /** Injectable for tests; defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
}

/** An `HttpClient` backed by `fetch`. Swallows transport errors into `ok: false`. */
export const createFetchHttpClient = ({
  baseUrl,
  fetchImpl,
}: FetchHttpClientOptions): HttpClient => ({
  async request({ method, path, body }: HttpRequest): Promise<HttpOutcome> {
    const doFetch = fetchImpl ?? globalThis.fetch;

    try {
      const response = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // Leave the raw text; the adapter rejects a body it cannot read.
          parsed = text;
        }
      }

      return { ok: true, status: response.status, body: parsed };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
