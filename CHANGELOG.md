# Changelog

## 0.1.1

- Standardize package metadata, badges, and CHANGELOG

## 0.1.0

- `createPool()` for generic async resource pooling
- `acquire()` and `release()` lifecycle management
- `withResource()` for scoped auto-release
- Resource validation on acquire
- Max pool size limit with queued waiters
- `drain()` to gracefully destroy all resources
