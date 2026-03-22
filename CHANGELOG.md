# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-21

### Added

- `createPool()` for generic async resource pooling
- `acquire()` and `release()` lifecycle management
- `withResource()` for scoped auto-release
- Resource validation on acquire
- Max pool size limit with queued waiters
- `drain()` to gracefully destroy all resources
