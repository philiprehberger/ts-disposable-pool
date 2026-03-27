# @philiprehberger/disposable-pool

[![CI](https://github.com/philiprehberger/ts-disposable-pool/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-disposable-pool/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/disposable-pool)](https://www.npmjs.com/package/@philiprehberger/disposable-pool)
[![License](https://img.shields.io/github/license/philiprehberger/ts-disposable-pool)](LICENSE)
[![Sponsor](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ec6cb9)](https://github.com/sponsors/philiprehberger)

Generic async resource pool with acquire/release, validation, and auto-scaling.

## Installation

```bash
npm install @philiprehberger/disposable-pool
```

## Usage

```ts
import { createPool } from '@philiprehberger/disposable-pool';

const pool = createPool({
  create: async () => await connectToDatabase(),
  destroy: async (conn) => await conn.close(),
  validate: async (conn) => conn.isAlive(),
  max: 10,
  acquireTimeout: 5000,
});

// Auto-release with withResource
const result = await pool.withResource(async (conn) => {
  return await conn.query('SELECT * FROM users');
});

// Manual acquire/release
const conn = await pool.acquire();
try {
  await conn.query('INSERT INTO logs ...');
} finally {
  pool.release(conn);
}

// Graceful shutdown
await pool.drain();
```

## API

### `createPool<T>(options: PoolOptions<T>): Pool<T>`

Creates a new resource pool.

#### `PoolOptions<T>`

- **`create`** — Factory function returning a new resource
- **`destroy`** — Cleanup function for a resource
- **`validate?`** — Check if a resource is still valid before reuse
- **`max?`** — Maximum pool size (default: `Infinity`)
- **`idleTimeout?`** — Destroy idle resources after this many ms
- **`acquireTimeout?`** — Reject acquire if waiting longer than this many ms

#### `Pool<T>`

- **`acquire()`** — Get a resource from the pool
- **`release(resource)`** — Return a resource to the pool
- **`withResource(fn)`** — Acquire, run fn, auto-release
- **`drain()`** — Destroy all resources and reject pending waiters
- **`size`** — Total resources (idle + active)
- **`available`** — Number of idle resources
- **`pending`** — Number of queued waiters

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
