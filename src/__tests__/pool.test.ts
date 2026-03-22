import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../../dist/index.js';

describe('createPool', () => {
  let counter = 0;

  function makeOptions(overrides: Record<string, unknown> = {}) {
    counter = 0;
    const destroyed: number[] = [];
    return {
      options: {
        create: async () => ++counter,
        destroy: async (r: number) => { destroyed.push(r); },
        ...overrides,
      },
      destroyed,
    };
  }

  it('acquire creates a resource', async () => {
    const { options } = makeOptions();
    const pool = createPool(options);
    const resource = await pool.acquire();
    assert.equal(resource, 1);
    assert.equal(pool.size, 1);
    pool.release(resource);
    await pool.drain();
  });

  it('release returns resource to pool', async () => {
    const { options } = makeOptions();
    const pool = createPool(options);
    const r = await pool.acquire();
    assert.equal(pool.available, 0);
    pool.release(r);
    assert.equal(pool.available, 1);
    await pool.drain();
  });

  it('second acquire reuses released resource', async () => {
    const { options } = makeOptions();
    const pool = createPool(options);
    const r1 = await pool.acquire();
    pool.release(r1);
    const r2 = await pool.acquire();
    assert.equal(r1, r2);
    pool.release(r2);
    await pool.drain();
  });

  it('max limit queues acquire beyond capacity', async () => {
    const { options } = makeOptions({ max: 2 });
    const pool = createPool(options);
    const r1 = await pool.acquire();
    const r2 = await pool.acquire();
    assert.equal(pool.size, 2);

    let r3resolved = false;
    const r3Promise = pool.acquire().then((r) => {
      r3resolved = true;
      return r;
    });

    // Allow microtask to push to waitQueue
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(pool.pending, 1);
    assert.equal(r3resolved, false);

    pool.release(r1);
    const r3 = await r3Promise;
    assert.equal(r3resolved, true);
    assert.equal(r3, r1);

    pool.release(r2);
    pool.release(r3);
    await pool.drain();
  });

  it('withResource auto-releases', async () => {
    const { options } = makeOptions();
    const pool = createPool(options);
    const result = await pool.withResource(async (r) => {
      assert.equal(pool.available, 0);
      return r * 10;
    });
    assert.equal(result, 10);
    assert.equal(pool.available, 1);
    await pool.drain();
  });

  it('drain destroys all resources', async () => {
    const { options, destroyed } = makeOptions();
    const pool = createPool(options);
    const r1 = await pool.acquire();
    const r2 = await pool.acquire();
    pool.release(r1);
    pool.release(r2);
    await pool.drain();
    assert.equal(destroyed.length, 2);
    assert.equal(pool.size, 0);
  });

  it('validate rejects bad resources', async () => {
    let callCount = 0;
    const { options } = makeOptions({
      validate: async (r: number) => r !== 1,
    });
    const origCreate = options.create;
    options.create = async () => {
      callCount++;
      return callCount;
    };
    const pool = createPool(options);

    const r1 = await pool.acquire();
    assert.equal(r1, 1);
    pool.release(r1);

    const r2 = await pool.acquire();
    assert.equal(r2, 2);
    pool.release(r2);
    await pool.drain();
  });
});
