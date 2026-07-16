# Changelog

## 0.2.0

- Implement the `min` option to pre-warm and maintain a minimum number of resources
- `idleTimeout` no longer reaps resources below `min`
- Add `clear()` to destroy idle resources and re-warm up to `min`
- Add README card image and document `min` and `clear()`

## 0.1.2

- Standardize README to 3-badge format with emoji Support section
- Update CI actions to v5 for Node.js 24 compatibility
- Add GitHub issue templates, dependabot config, and PR template

## 0.1.1

- Standardize package metadata, badges, and CHANGELOG

## 0.1.0

- `createPool()` for generic async resource pooling
- `acquire()` and `release()` lifecycle management
- `withResource()` for scoped auto-release
- Resource validation on acquire
- Max pool size limit with queued waiters
- `drain()` to gracefully destroy all resources
