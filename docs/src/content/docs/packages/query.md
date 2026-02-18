---
title: "@oofp/query"
description: "Functional query cache with TTL and invalidation."
---

`@oofp/query` is a functional query cache for managing async data. It provides configurable TTL, tag-based invalidation, deduplication, mutations, and optional Redis support — all built on `TaskEither`.

```bash
pnpm add @oofp/query
```

**License:** MIT | **Peer dependency:** `@oofp/core` | **Optional:** `redis` (for Redis-backed cache)

---

## Overview

`@oofp/query` manages the lifecycle of async data fetches:

- **Cache with configurable TTL** — avoid redundant network calls
- **Tag-based invalidation** — invalidate groups of queries by key
- **Stale-while-revalidate** — serve cached data while refreshing in the background
- **Deduplication** — concurrent identical requests are deduplicated automatically
- **Mutations with cache invalidation** — mutate data and invalidate related queries
- **Telemetry** — built-in cache hit/miss/eviction events
- **Storage backends** — in-memory (with LRU) or Redis

---

## Creating a QueryClient

```typescript
import { createQueryClient } from "@oofp/query";

const queryClient = createQueryClient({
  defaultTTL: 60_000,        // 60 seconds
  maxCacheSize: 1000,        // LRU eviction after 1000 entries
  defaultRetry: 3,           // retry failed queries 3 times
  defaultRetryDelay: 1000,   // 1s between retries
});
```

---

## Fetching Queries

Every query operation returns a `TaskEither<Error, A>` — lazy and composable.

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface User {
  id: string;
  name: string;
}

const fetchUser = (id: string) =>
  queryClient.fetchQuery<User>({
    queryKey: ["users", id],
    queryFn: () =>
      TE.tryCatch(
        () => fetch(`/api/users/${id}`).then((r) => r.json()),
        (err) => new Error(`Failed to fetch user: ${err}`),
      ),
    ttl: 30_000, // cache for 30 seconds
  });

// Execute
const result = await fetchUser("42")();
// Either<Error, QueryResult<User>>
```

---

## QueryResult

The `fetchQuery` method returns a `QueryResult<T>` that includes metadata about the cache interaction:

```typescript
interface QueryResult<T> {
  data: T;
  fromCache: boolean;
  timestamp: number;
}
```

---

## Reading & Writing Cache Directly

```typescript
import * as M from "@oofp/core/maybe";

// Read from cache without fetching
const cached = queryClient.getQueryData<User>(["users", "42"]);
// TaskEither<Error, Maybe<User>>

// Write directly to cache
const write = queryClient.setQueryData(
  ["users", "42"],
  { id: "42", name: "Alice" },
  60_000, // optional TTL override
);
```

---

## Invalidation

```typescript
// Invalidate a specific query
const inv1 = queryClient.invalidateQueries(["users", "42"]);
// TaskEither<Error, number> — returns count of invalidated entries

// Remove queries from cache entirely
const rem = queryClient.removeQueries(["users"]);

// Clear the entire cache
const clr = queryClient.clear();
```

---

## Mutations

Mutations wrap a side-effectful operation and can invalidate related queries on success.

```typescript
const updateUser = queryClient.mutate<User, { name: string }>({
  mutationFn: (variables) =>
    TE.tryCatch(
      () =>
        fetch("/api/users/42", {
          method: "PUT",
          body: JSON.stringify(variables),
        }).then((r) => r.json()),
      (err) => new Error(`Update failed: ${err}`),
    ),
  onSuccess: (data) =>
    queryClient.setQueryData(["users", data.id], data),
});

// Execute mutation
const result = await updateUser({ name: "Alice Updated" })();
```

---

## QueryOptions Reference

```typescript
interface QueryOptions<TData> {
  queryKey: QueryKey;                              // unique cache key
  queryFn: () => TaskEither<Error, TData>;         // the fetch function
  ttl?: number;                                    // time-to-live in ms
  retry?: number | false;                          // retry count (default: 3)
  retryDelay?: number;                             // delay between retries (default: 1000ms)
  enabled?: boolean;                               // skip execution if false
}
```

---

## Additional Exports

| Export | Description |
|--------|-------------|
| `QueryClientAccesor` | Accessor for dependency injection patterns |
| `LRUCache` | Standalone LRU cache implementation |
| `serialize` | Key serialization utilities |
| `extractTags` | Extract tags from query keys |
