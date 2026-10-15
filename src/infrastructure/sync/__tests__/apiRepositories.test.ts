import { describe, expect, it } from 'vitest';
import {
  createApiEpicRepository,
  createApiLabelRepository,
  createApiProjectRepository,
  createApiSavedViewRepository,
  createApiSettingsRepository,
  createApiTaskRepository,
} from '../apiRepositories';
import { createInMemoryApiServer } from '../testing/inMemoryApiServer';

describe('createApi*Repository', () => {
  it('exposes an interface-complete repository for every collection', async () => {
    const server = createInMemoryApiServer();

    // Empty-server reads succeed and prove the remote adapter is wired for each.
    expect((await createApiEpicRepository(server.client).list()).ok).toBe(true);
    expect((await createApiLabelRepository(server.client).list()).ok).toBe(true);
    expect((await createApiSavedViewRepository(server.client).list()).ok).toBe(true);
    expect((await createApiSettingsRepository(server.client).get()).ok).toBe(true);

    const projects = createApiProjectRepository(server.client);
    const tasks = createApiTaskRepository(server.client);
    expect(typeof projects.list).toBe('function');
    expect(typeof projects.search).toBe('function');
    expect(typeof tasks.list).toBe('function');
    expect(typeof tasks.listPage).toBe('function');
    expect(typeof tasks.summary).toBe('function');
  });
});
