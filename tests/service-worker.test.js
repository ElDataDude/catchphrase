// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

const createRuntime = () => {
  const listeners = {};
  const cache = {
    addAll: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined)
  };
  const caches = {
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
    match: vi.fn(async () => null),
    open: vi.fn(async () => cache)
  };
  const fetchMock = vi.fn(async () => new Response('network', { status: 200 }));
  const self = {
    location: { origin: 'https://show.example' },
    clients: { claim: vi.fn(async () => undefined) },
    skipWaiting: vi.fn(() => undefined),
    addEventListener: vi.fn((type, handler) => {
      listeners[type] = handler;
    })
  };

  vm.runInNewContext(source, {
    self,
    caches,
    fetch: fetchMock,
    Promise,
    Response,
    URL
  });

  return { cache, caches, fetchMock, listeners, self };
};

const createFetchEvent = (url, options = {}) => {
  const event = {
    request: {
      method: 'GET',
      mode: 'same-origin',
      url,
      ...options
    },
    responsePromise: null,
    respondWith: vi.fn((promise) => {
      event.responsePromise = Promise.resolve(promise);
    })
  };
  return event;
};

describe('service worker caching policy', () => {
  it('never serves or stores same-origin /api requests from caches', async () => {
    const { cache, caches, fetchMock, listeners } = createRuntime();
    const event = createFetchEvent('https://show.example/api/realtime?quizId=quiz_sw');

    listeners.fetch(event);
    await event.responsePromise;

    expect(event.respondWith).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(event.request);
    expect(caches.match).not.toHaveBeenCalled();
    expect(caches.open).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('caches same-origin shell assets on network miss', async () => {
    const { cache, caches, fetchMock, listeners } = createRuntime();
    const event = createFetchEvent('https://show.example/icon.svg');

    listeners.fetch(event);
    const response = await event.responsePromise;

    expect(response).toBeInstanceOf(Response);
    expect(caches.match).toHaveBeenCalledWith(event.request);
    expect(fetchMock).toHaveBeenCalledWith(event.request);
    expect(caches.open).toHaveBeenCalledWith('catchphrase-v2-shell');
    expect(cache.put).toHaveBeenCalledWith(event.request, expect.any(Response));
  });
});
