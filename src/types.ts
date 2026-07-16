export interface PoolOptions<T> {
  /** Factory that produces a new resource. */
  create: () => Promise<T>;
  /** Cleanup function invoked when a resource is destroyed. */
  destroy: (resource: T) => Promise<void>;
  /** Optional check run before reusing an idle resource; falsy destroys it. */
  validate?: (resource: T) => Promise<boolean>;
  /** Minimum resources to pre-warm and keep alive (default `0`). */
  min?: number;
  /** Maximum pool size; further acquires queue as waiters (default `Infinity`). */
  max?: number;
  /** Destroy idle resources after this many ms (never below `min`). */
  idleTimeout?: number;
  /** Reject `acquire()` if a waiter waits longer than this many ms. */
  acquireTimeout?: number;
}

export interface Pool<T> {
  acquire(): Promise<T>;
  release(resource: T): void;
  withResource<R>(fn: (resource: T) => Promise<R>): Promise<R>;
  clear(): Promise<void>;
  drain(): Promise<void>;
  readonly size: number;
  readonly available: number;
  readonly pending: number;
}
