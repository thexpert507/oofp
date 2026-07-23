# @oofp/query

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@oofp/query.svg?style=flat)](https://www.npmjs.com/package/@oofp/query)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0+-blue.svg)](https://www.typescriptlang.org/)

Functional query and cache library for TypeScript. Declarative data fetching with tag-based cache invalidation, request deduplication, pluggable backends, and built-in telemetry. Built on `@oofp/core`.

## Installation

```bash
npm install @oofp/query
# or
pnpm add @oofp/query
```

Peer dependencies:

- `@oofp/core` (required)
- `redis` ^5.0.0 (optional -- only needed for `RedisCache` backend)

## Quick Start

```typescript
import { createQueryClient } from '@oofp/query'
import * as TE from '@oofp/core/task-either'
import * as E from '@oofp/core/either'

const client = createQueryClient({ defaultTTL: 60_000 })

// Fetch with caching
const result = await client.fetchQuery({
  queryKey: ['users', 123],
  queryFn: () => TE.tryCatch(
    () => fetch('/api/users/123').then(r => r.json()),
    (err) => new Error(String(err)),
  ),
  ttl: 30_000,
})()

if (E.isRight(result)) {
  console.log(result.value.data)    // the user object
  console.log(result.value.cached)  // true if served from cache
}
```

## Features

- **Tag-based cache invalidation** -- Structured query keys are automatically decomposed into tags, enabling hierarchical invalidation (e.g. invalidating `['users']` clears all `['users', ...]` entries)
- **Request deduplication** -- Concurrent calls with the same query key share a single in-flight request
- **Pluggable backends** -- `InMemoryCache` (default) or `RedisCache` for distributed deployments; implement `CacheStore` for custom backends
- **Built-in telemetry** -- Event-driven metrics (hit/miss rates, deduplication stats, top keys) with a pub/sub listener API
- **Mutations with auto-invalidation** -- Define which query keys to invalidate after a successful mutation
- **Reader monad integration** -- `QueryClientAccesor` bridges the client into `ReaderTaskEither` for dependency injection
- **All methods return `TaskEither`** -- Composable, lazy, and error-safe by design

## Core Concepts

### Query Keys

Query keys can be any `Serializable` value -- strings, numbers, arrays, or nested objects:

```typescript
// Simple key
client.fetchQuery({ queryKey: 'all-users', queryFn, ttl: 60_000 })

// Hierarchical key
client.fetchQuery({ queryKey: ['users', 123], queryFn, ttl: 60_000 })

// Object key (deterministically serialized)
client.fetchQuery({ queryKey: { entity: 'users', id: 123 }, queryFn, ttl: 60_000 })
```

Tags are automatically extracted from structured keys via `extractTags()`. For example, the key `['users', 123]` produces tags `["[0]:users", "[1]:123"]`. Invalidating `['users']` matches any entry that has the tag `[0]:users`.

### Cache Backends

```typescript
import { createQueryClient, InMemoryCache, RedisCache } from '@oofp/query'

// Default: in-memory
const client = createQueryClient()

// Redis backend
const redis = new RedisCache({ host: 'localhost', port: 6379 })
await redis.connect()
const distributed = createQueryClient({ cache: redis })
```

Custom backends implement the `CacheStore` interface:

```typescript
interface CacheStore {
  get<T>(key: string): TE.TaskEither<Error, M.Maybe<T>>
  set<T>(key: string, entry: CacheEntry<T>): TE.TaskEither<Error, void>
  delete(key: string): TE.TaskEither<Error, void>
  invalidateByTags(tags: string[]): TE.TaskEither<Error, number>
  clear(): TE.TaskEither<Error, void>
}
```

## API Reference

### `createQueryClient(config?)`

Creates a `QueryClient` instance.

```typescript
type QueryClientConfig = {
  defaultTTL?: number        // Default: 300_000 (5 minutes)
  maxCacheSize?: number      // Default: 1000
  cache?: CacheStore         // Default: InMemoryCache
  lruCache?: boolean         // Enable LRU eviction for serialization cache
  telemetry?: TelemetryCollector
}
```

### `QueryClient`

```typescript
interface QueryClient {
  fetchQuery<TData>(options: QueryOptions<TData>): TE.TaskEither<Error, QueryResult<TData>>
  getQueryData<TData>(queryKey: QueryKey): TE.TaskEither<Error, M.Maybe<TData>>
  setQueryData<TData>(queryKey: QueryKey, data: TData, ttl?: number): TE.TaskEither<Error, void>
  invalidateQueries(queryKey: QueryKey): TE.TaskEither<Error, number>
  removeQueries(queryKey: QueryKey): TE.TaskEither<Error, number>
  clear(): TE.TaskEither<Error, void>
  mutate<TData, TVariables>(
    options: MutationOptions<TData, TVariables>
  ): (variables: TVariables) => TE.TaskEither<Error, TData>
}
```

### `QueryOptions<TData>`

```typescript
type QueryOptions<TData> = {
  queryKey: QueryKey
  queryFn: () => TE.TaskEither<Error, TData>
  ttl?: number
  retry?: number | false
  retryDelay?: number
  enabled?: boolean
}
```

### `QueryResult<TData>`

```typescript
type QueryResult<TData> = {
  data: TData
  cached: boolean
  age: number  // milliseconds since cached
}
```

### `MutationOptions<TData, TVariables>`

```typescript
type MutationOptions<TData, TVariables = void> = {
  mutationFn: (variables: TVariables) => TE.TaskEither<Error, TData>
  invalidates?: (variables: TVariables, result: TData) => QueryKey[]
}
```

### Mutations

```typescript
const createUser = client.mutate({
  mutationFn: (data: CreateUserDto) => TE.tryCatch(
    () => fetch('/api/users', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    (err) => new Error(String(err)),
  ),
  invalidates: (_vars, user) => [['users'], ['users', user.id]],
})

await createUser({ name: 'Alice', email: 'alice@example.com' })()
// Automatically invalidates ['users'] and ['users', newId] after success
```

## Reader Monad Integration

`QueryClientAccesor` provides `ReaderTaskEither`-based accessors that pull the `QueryClient` from context:

```typescript
import { QueryClientAccesor } from '@oofp/query'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'

const getUser = (id: number) =>
  QueryClientAccesor.query({
    queryKey: ['users', id],
    queryFn: () => TE.tryCatch(
      () => fetch(`/api/users/${id}`).then(r => r.json()),
      (err) => new Error(String(err)),
    ),
  })

// Compose with other RTE operations
const program = pipe(
  getUser(123),
  RTE.map(result => result.data),
)

// Run with context
const ctx = { query_client: createQueryClient() }
const result = await RTE.run(ctx)(program)()
```

The `wc` ("with context") variants allow `queryFn` / `mutationFn` to access additional context:

```typescript
const getUserWc = (id: number) =>
  QueryClientAccesor.querywc({
    queryKey: ['users', id],
    queryFn: () => (ctx: { apiUrl: string }) => async () =>
      E.right(await fetch(`${ctx.apiUrl}/users/${id}`).then(r => r.json())),
  })

// Context type is { query_client: QueryClient } & { apiUrl: string }
```

## Telemetry

The library includes a built-in telemetry system based on an event-driven observer pattern.

### Basic Usage

```typescript
import { createQueryClient, InMemoryTelemetryCollector } from '@oofp/query'

const telemetry = new InMemoryTelemetryCollector()
const client = createQueryClient({ telemetry })

// After some operations...
const stats = telemetry.getExtendedStats()
console.log(`Hit rate: ${stats.hitRate}%`)
console.log(`Deduplication rate: ${stats.deduplicationRate}%`)
console.log(`Estimated cache size: ${stats.estimatedCacheSize}`)

// Top accessed keys
const topKeys = telemetry.getTopKeys(5)
```

### Real-Time Listeners

```typescript
const unsubscribe = telemetry.subscribe((stats, event) => {
  if (event.type === 'miss') {
    console.log(`Cache miss for key: ${event.key}`)
  }
  if (stats.hitRate < 50) {
    console.warn('Low cache hit rate:', stats.hitRate)
  }
})

// Clean up
unsubscribe()
```

### Cache Events

```typescript
type CacheEvent =
  | { type: 'hit';         key: string; tags: string[]; duration: number }
  | { type: 'miss';        key: string; tags: string[] }
  | { type: 'set';         key: string; tags: string[]; ttl: number }
  | { type: 'invalidate';  tags: string[]; keysAffected: number }
  | { type: 'deduplicate'; key: string; waiters: number }
  | { type: 'delete';      key: string; tags: string[] }
  | { type: 'clear' }
```

### Custom Telemetry Collectors

Implement the `TelemetryCollector` interface:

```typescript
interface TelemetryCollector {
  record(event: CacheEvent): void
  getStats(): CacheStats
}
```

See the [telemetry docs](./docs/TELEMETRY.md) for advanced patterns (Prometheus, logging, composite collectors).

## Utility Functions

### `serialize(data, options?)`

Deterministically serializes a `Serializable` value to a string (sorted object keys).

### `extractTags(data, prefix?)`

Extracts tags from a structured query key for tag-based invalidation.

### `LRUCache<K, V>`

A simple least-recently-used cache, used internally for serialization caching.

```typescript
import { LRUCache } from '@oofp/query'

const cache = new LRUCache<string, number>(100)
cache.set('key', 42)
cache.get('key') // 42
```

## Testing

```bash
pnpm --filter @oofp/query test
```

Note: Redis-dependent tests require a running Redis server and will skip automatically without one.

## License

This project is licensed under the [MIT License](./LICENSE).
