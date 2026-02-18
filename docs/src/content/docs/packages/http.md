---
title: "@oofp/http"
description: "Functional HTTP client built on ReaderTaskEither."
---

`@oofp/http` is a functional HTTP client that wraps the native `fetch` API with `ReaderTaskEither`. Every request returns `RTE<HttpContext, HttpError, A>` — lazy, typed, and composable.

```bash
pnpm add @oofp/http
```

**License:** MIT | **Peer dependency:** `@oofp/core`

---

## Why a Functional HTTP Client?

Traditional HTTP clients return raw Promises with untyped errors. `@oofp/http` gives you:

- **Typed errors** — `HttpError` with status codes, timestamps, and guards (`isUnauthorized`, `isNotFound`, etc.)
- **Laziness** — nothing executes until you call `RTE.run(context)`
- **Dependency injection** — `HttpContext` configures base URL, headers, timeout, and credentials
- **Composable middleware** — interceptors and retries via pure function composition

Every request is an `RTE<HttpContext, HttpError, A>`, which means it slots naturally into any OOFP pipeline.

---

## Core Types

```typescript
import type { HttpContext, HttpError, HttpMethod } from "@oofp/http";

type HttpContext = {
  baseUrl?: string;
  signal?: AbortSignal;
  timeout?: number;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  unwrapEithers?: boolean;
};

type HttpError = {
  _tag: "HttpError";
  endpoint: string;
  method: HttpMethod;
  statusCode?: number;
  message: string;
  cause: unknown;
  timestamp: number;
};
```

---

## Making Requests

### Convenience functions

```typescript
import { get, post, put, patch, del } from "@oofp/http";
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

interface User {
  id: string;
  name: string;
}

// GET request — returns RTE<HttpContext, HttpError, User[]>
const fetchUsers = get<User[]>("/api/users");

// POST request
const createUser = (data: { name: string }) =>
  post<User>("/api/users", JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });

// Execute at the boundary
const result = await pipe(
  fetchUsers,
  RTE.run({ baseUrl: "https://api.example.com" }),
)();
```

### Specialized parsers

```typescript
import { getJson, getText, getBlob, getArrayBuffer } from "@oofp/http";

const users = getJson<User[]>("/api/users");
const html = getText("/page");
const image = getBlob("/image.png");
const binary = getArrayBuffer("/file.bin");
```

### HttpClient instance

```typescript
import { createHttpClient } from "@oofp/http";

const http = createHttpClient();

const fetchUser = (id: string) => http.get<User>(`/api/users/${id}`);
const updateUser = (id: string, data: Partial<User>) =>
  http.put<User>(`/api/users/${id}`, JSON.stringify(data));
```

---

## Context & Interceptors

Interceptors transform the `HttpContext` before a request is made. They compose cleanly.

```typescript
import {
  withBearer,
  withHeaders,
  withTimeout,
  withContentType,
  composeContextInterceptors,
} from "@oofp/http";
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

// Provide static context
const withAuth = pipe(
  fetchUsers,
  RTE.provide({
    baseUrl: "https://api.example.com",
    headers: { Authorization: "Bearer token123" },
    timeout: 5000,
  }),
);

// Or use interceptors per-request
const fetchWithOptions = get<User[]>("/api/users", {
  contextInterceptors: [
    withBearer("token123"),
    withTimeout(5000),
    withContentType("application/json"),
  ],
});
```

---

## Retry & Composition

```typescript
import { retry } from "@oofp/http";
import { get } from "@oofp/http";

// Retry configuration
const fetchWithRetry = get<User[]>("/api/users", {
  retry: { maxRetries: 3, delay: 1000 },
});
```

---

## Error Handling

`HttpError` includes type guards for common HTTP status codes:

```typescript
import { HttpError as HttpErr } from "@oofp/http";
import * as RTE from "@oofp/core/reader-task-either";
import { pipe } from "@oofp/core/pipe";

const fetchUser = (id: string) =>
  pipe(
    get<User>(`/api/users/${id}`),
    RTE.tapLeft((err) => {
      if (HttpErr.isNotFound(err)) console.log("User not found");
      if (HttpErr.isUnauthorized(err)) console.log("Needs auth");
      if (HttpErr.isServerError(err)) console.log("Server error");
    }),
  );
```

---

## Submodule Imports

For fine-grained imports, `@oofp/http` exposes submodules:

| Import | Contents |
|--------|----------|
| `@oofp/http` | Full public API |
| `@oofp/http/primitives` | `fetchBase`, `validateResponse`, parsers, core types |
| `@oofp/http/interceptors` | `withBearer`, `withHeaders`, `withTimeout`, etc. |
| `@oofp/http/composition` | `retry`, `validate`, `tap`, `tapLeft` |
| `@oofp/http/client` | `createHttpClient`, `get`, `post`, `put`, `patch`, `del` |
