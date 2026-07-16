import type { PoolOptions, Pool } from './types';

export function createPool<T>(options: PoolOptions<T>): Pool<T> {
  const {
    create,
    destroy,
    validate,
    min = 0,
    max = Infinity,
    idleTimeout,
    acquireTimeout,
  } = options;

  const idle: T[] = [];
  const active = new Set<T>();
  const idleTimers = new Map<T, ReturnType<typeof setTimeout>>();
  const waitQueue: {
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timer?: ReturnType<typeof setTimeout>;
  }[] = [];
  let pendingCreations = 0;
  let draining = false;
  let drainResolve: (() => void) | null = null;

  function totalCount(): number {
    return idle.length + active.size + pendingCreations;
  }

  function clearIdleTimer(resource: T): void {
    const timer = idleTimers.get(resource);
    if (timer) {
      clearTimeout(timer);
      idleTimers.delete(resource);
    }
  }

  function setIdleTimer(resource: T): void {
    if (idleTimeout != null && idleTimeout > 0) {
      const timer = setTimeout(async () => {
        const index = idle.indexOf(resource);
        if (index === -1) {
          return;
        }
        // Keep at least `min` resources alive — re-arm and check again later.
        if (idle.length + active.size <= min) {
          idleTimers.delete(resource);
          setIdleTimer(resource);
          return;
        }
        idle.splice(index, 1);
        idleTimers.delete(resource);
        await destroy(resource);
        checkDrainComplete();
      }, idleTimeout);
      idleTimers.set(resource, timer);
    }
  }

  function checkDrainComplete(): void {
    if (
      draining &&
      idle.length === 0 &&
      active.size === 0 &&
      pendingCreations === 0 &&
      drainResolve
    ) {
      drainResolve();
      drainResolve = null;
    }
  }

  // Hand a freshly created resource to a waiter if one is queued, otherwise
  // park it in the idle set.
  function dispatch(resource: T): void {
    if (waitQueue.length > 0) {
      const waiter = waitQueue.shift()!;
      if (waiter.timer) clearTimeout(waiter.timer);
      active.add(resource);
      waiter.resolve(resource);
      return;
    }
    idle.push(resource);
    setIdleTimer(resource);
  }

  // Pre-warm the pool up to `min` resources without blocking. Guards against
  // over-creation by counting in-flight creations in `totalCount()`.
  function ensureMinimum(): void {
    if (draining) return;
    while (min > 0 && totalCount() < min) {
      pendingCreations++;
      create().then(
        (resource) => {
          pendingCreations--;
          if (draining) {
            destroy(resource).then(() => checkDrainComplete());
            return;
          }
          dispatch(resource);
        },
        () => {
          // Creation failed — stop pre-warming to avoid a tight retry loop.
          pendingCreations--;
        },
      );
    }
  }

  async function acquireFromIdle(): Promise<T | null> {
    while (idle.length > 0) {
      const resource = idle.pop()!;
      clearIdleTimer(resource);

      if (validate) {
        const valid = await validate(resource);
        if (!valid) {
          await destroy(resource);
          continue;
        }
      }

      return resource;
    }
    return null;
  }

  const pool: Pool<T> = {
    async acquire(): Promise<T> {
      if (draining) {
        throw new Error('Pool is draining');
      }

      const fromIdle = await acquireFromIdle();
      if (fromIdle !== null) {
        active.add(fromIdle);
        return fromIdle;
      }

      const totalSize = idle.length + active.size;
      if (totalSize < max) {
        const resource = await create();
        active.add(resource);
        return resource;
      }

      return new Promise<T>((resolve, reject) => {
        const entry: (typeof waitQueue)[number] = { resolve, reject };

        if (acquireTimeout != null && acquireTimeout > 0) {
          entry.timer = setTimeout(() => {
            const index = waitQueue.indexOf(entry);
            if (index !== -1) {
              waitQueue.splice(index, 1);
            }
            reject(new Error('Acquire timeout'));
          }, acquireTimeout);
        }

        waitQueue.push(entry);
      });
    },

    release(resource: T): void {
      active.delete(resource);

      if (draining) {
        destroy(resource).then(() => checkDrainComplete());
        return;
      }

      if (waitQueue.length > 0) {
        const waiter = waitQueue.shift()!;
        if (waiter.timer) clearTimeout(waiter.timer);
        active.add(resource);
        waiter.resolve(resource);
        return;
      }

      idle.push(resource);
      setIdleTimer(resource);
    },

    async withResource<R>(fn: (resource: T) => Promise<R>): Promise<R> {
      const resource = await pool.acquire();
      try {
        return await fn(resource);
      } finally {
        pool.release(resource);
      }
    },

    async clear(): Promise<void> {
      const toDestroy = idle.splice(0, idle.length);
      for (const resource of toDestroy) {
        clearIdleTimer(resource);
        await destroy(resource);
      }
      if (!draining) {
        ensureMinimum();
      }
    },

    async drain(): Promise<void> {
      draining = true;

      for (const waiter of waitQueue) {
        if (waiter.timer) clearTimeout(waiter.timer);
        waiter.reject(new Error('Pool is draining'));
      }
      waitQueue.length = 0;

      while (idle.length > 0) {
        const resource = idle.pop()!;
        clearIdleTimer(resource);
        await destroy(resource);
      }

      if (active.size === 0 && pendingCreations === 0) {
        return;
      }

      return new Promise<void>((resolve) => {
        drainResolve = resolve;
      });
    },

    get size(): number {
      return idle.length + active.size;
    },

    get available(): number {
      return idle.length;
    },

    get pending(): number {
      return waitQueue.length;
    },
  };

  ensureMinimum();

  return pool;
}
