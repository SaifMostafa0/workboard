import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDevSeed } from '../devSeed';

describe('loadDevSeed', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads and validates the Workboard backlog in development', async () => {
    const seed = await loadDevSeed();

    expect(seed).not.toBeNull();
    if (!seed) return;

    // The seed is this repository's own backlog, so it must contain projects
    // and tasks (not just an empty shell).
    expect(seed.projects.length).toBeGreaterThan(0);
    expect(seed.tasks.length).toBeGreaterThan(0);

    // Every task points at one of the seeded projects.
    const projectIds = new Set(seed.projects.map((project) => project.id));
    expect(seed.tasks.every((task) => projectIds.has(task.projectId))).toBe(true);
  });

  it('returns null outside development so production starts empty', async () => {
    vi.stubEnv('DEV', false);

    expect(await loadDevSeed()).toBeNull();
  });
});
