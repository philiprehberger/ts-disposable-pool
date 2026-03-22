export interface PoolOptions<T> {
  create: () => Promise<T>;
  destroy: (resource: T) => Promise<void>;
  validate?: (resource: T) => Promise<boolean>;
  min?: number;
  max?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
}

export interface Pool<T> {
  acquire(): Promise<T>;
  release(resource: T): void;
  withResource<R>(fn: (resource: T) => Promise<R>): Promise<R>;
  drain(): Promise<void>;
  readonly size: number;
  readonly available: number;
  readonly pending: number;
}
