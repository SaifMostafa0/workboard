import { createProjectRepository, createTaskRepository } from '@/infrastructure/repositories';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { createApiProjectRepository, createApiTaskRepository } from '../apiRepositories';
import { createInMemoryApiServer } from '../testing/inMemoryApiServer';
import { repositoryContract } from '../testing/repositoryContract';

// The same suite, run against the in-browser implementation...
repositoryContract('local (FakeStorageAdapter)', () => {
  const adapter = new FakeStorageAdapter();
  return {
    projects: createProjectRepository(adapter),
    tasks: createTaskRepository(adapter),
  };
});

// ...and against the same repositories mounted over a network boundary.
repositoryContract('api (in-memory HTTP server)', () => {
  const server = createInMemoryApiServer();
  return {
    projects: createApiProjectRepository(server.client),
    tasks: createApiTaskRepository(server.client),
  };
});
