import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWorker extends EventTarget {
  state = 'installing';
  postMessage = vi.fn();
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = vi.fn(async () => undefined);
}

class FakeContainer extends EventTarget {
  controller: FakeWorker | null = null;
  registration = new FakeRegistration();
  register = vi.fn(async () => this.registration);
}

const installContainer = (): FakeContainer => {
  const container = new FakeContainer();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  return container;
};

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const reload = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  reload.mockReset();
  Object.defineProperty(window, 'location', { configurable: true, value: { reload } });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('subscriptions', () => {
  it('notifies immediately with the current state and stops after unsubscribe', async () => {
    const { subscribeToServiceWorkerUpdate } = await import('../serviceWorker');
    const listener = vi.fn();

    const unsubscribe = subscribeToServiceWorkerUpdate(listener);

    expect(listener).toHaveBeenCalledWith(false);

    unsubscribe();
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('registerServiceWorker', () => {
  it('is a no-op in development', async () => {
    const container = installContainer();
    const { registerServiceWorker } = await import('../serviceWorker');

    const dispose = registerServiceWorker();

    expect(container.register).not.toHaveBeenCalled();
    expect(() => dispose()).not.toThrow();
  });

  it('is a no-op when service workers are unsupported', async () => {
    const { registerServiceWorker } = await import('../serviceWorker');
    const dispose = registerServiceWorker();

    expect(() => dispose()).not.toThrow();
  });

  it('registers the worker and leaves the update prompt hidden on first install', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    const { registerServiceWorker, subscribeToServiceWorkerUpdate } =
      await import('../serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdate(listener);

    const dispose = registerServiceWorker();
    await vi.waitFor(() => expect(container.register).toHaveBeenCalledWith('/sw.js'));
    await flushMicrotasks();

    expect(listener).toHaveBeenLastCalledWith(false);
    dispose();
  });

  it('does not prompt when a waiting worker exists but nothing controls the page', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.registration.waiting = new FakeWorker();
    const { registerServiceWorker, subscribeToServiceWorkerUpdate } =
      await import('../serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdate(listener);

    const dispose = registerServiceWorker();
    await flushMicrotasks();

    expect(listener).not.toHaveBeenCalledWith(true);
    dispose();
  });

  it('prompts when the registered worker is already waiting', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.controller = new FakeWorker();
    container.registration.waiting = new FakeWorker();
    const { registerServiceWorker, subscribeToServiceWorkerUpdate } =
      await import('../serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdate(listener);

    const dispose = registerServiceWorker();
    await flushMicrotasks();

    expect(listener).toHaveBeenLastCalledWith(true);
    dispose();
  });

  it('prompts when an update finishes installing and a controller exists', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.controller = new FakeWorker();
    const { registerServiceWorker, subscribeToServiceWorkerUpdate } =
      await import('../serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdate(listener);
    const dispose = registerServiceWorker();
    await flushMicrotasks();

    const installing = new FakeWorker();
    container.registration.installing = installing;
    container.registration.dispatchEvent(new Event('updatefound'));
    installing.state = 'installed';
    installing.dispatchEvent(new Event('statechange'));

    expect(listener).toHaveBeenLastCalledWith(true);
    dispose();
  });

  it('ignores updatefound when nothing is installing', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.controller = new FakeWorker();
    const { registerServiceWorker, subscribeToServiceWorkerUpdate } =
      await import('../serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdate(listener);
    const dispose = registerServiceWorker();
    await flushMicrotasks();

    container.registration.dispatchEvent(new Event('updatefound'));

    expect(listener).not.toHaveBeenCalledWith(true);
    dispose();
  });

  it('swallows registration failures', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.register.mockRejectedValueOnce(new Error('registration blocked'));
    const { registerServiceWorker } = await import('../serviceWorker');

    const dispose = registerServiceWorker();
    await flushMicrotasks();

    expect(container.register).toHaveBeenCalled();
    expect(() => dispose()).not.toThrow();
  });
});

describe('applyServiceWorkerUpdate', () => {
  it('reloads immediately when no worker is waiting', async () => {
    const { applyServiceWorkerUpdate } = await import('../serviceWorker');

    applyServiceWorkerUpdate();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('activates the waiting worker and reloads once the controller changes', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    container.controller = new FakeWorker();
    const { applyServiceWorkerUpdate, registerServiceWorker } = await import('../serviceWorker');
    const dispose = registerServiceWorker();
    await flushMicrotasks();

    const waiting = new FakeWorker();
    container.registration.waiting = waiting;

    applyServiceWorkerUpdate();

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();

    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);

    dispose();
  });

  it('does not reload on controllerchange without a pending update', async () => {
    vi.stubEnv('DEV', false);
    const container = installContainer();
    const { registerServiceWorker } = await import('../serviceWorker');
    const dispose = registerServiceWorker();
    await flushMicrotasks();

    container.dispatchEvent(new Event('controllerchange'));

    expect(reload).not.toHaveBeenCalled();
    dispose();
  });
});
