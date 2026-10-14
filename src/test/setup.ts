import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock crypto.randomUUID for deterministic tests
let uuidCounter = 0;
const mockUUID = () => {
  // Generate a valid UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const base = '123e4567-e89b-42d3-a456-426614174000';
  const num = uuidCounter.toString(16).padStart(3, '0');
  uuidCounter++;
  return base.slice(0, -3) + num;
};
vi.stubGlobal('crypto', {
  randomUUID: mockUUID,
});

// Mock matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console.error for expected test errors
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return;
  if (args[0]?.includes?.('act(...)')) return;
  originalError.apply(console, args);
};

// In-memory localStorage so tests exercise real read/write behaviour.
const createLocalStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock(),
  configurable: true,
});

// Mock indexedDB
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};
Object.defineProperty(window, 'indexedDB', { value: indexedDBMock });
