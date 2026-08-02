---
title: "Error Handling"
description: "Functional error handling patterns with Either and TaskEither."
---

Functional error handling replaces `try-catch` with typed values. Errors become first-class data — visible in the type system, composable with pipelines, and impossible to forget.

For an end-to-end example that maps typed application errors to conventional HTTP responses, see [Opinionated Backend Architecture](/guides/opinionated-backend-architecture/).

```typescript
import { pipe } from "@oofp/core/pipe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
```

---

## Core Principles

### 1. No try-catch in business logic

Business logic should never throw or catch exceptions. Use `Either` for synchronous operations and `TaskEither` for asynchronous ones. Errors are values — they flow through the pipeline just like success values.

```typescript
// Bad — invisible error type, no compiler help
const parseAge = (input: string): number => {
  const n = parseInt(input, 10);
  if (isNaN(n)) throw new Error("Invalid age");
  if (n < 0 || n > 150) throw new Error("Age out of range");
  return n;
};

// Good — error type is explicit, compiler tracks it
type ParseError = "invalid_number" | "out_of_range";

const parseAge = (input: string): E.Either<ParseError, number> => {
  const n = parseInt(input, 10);
  if (isNaN(n)) return E.left("invalid_number");
  if (n < 0 || n > 150) return E.left("out_of_range");
  return E.right(n);
};
```

### 2. try-catch only in infrastructure

The only place `try-catch` belongs is at the infrastructure boundary — database calls, HTTP requests, file I/O, third-party SDKs. Use `TE.tryCatch` to capture exceptions and convert them into typed errors immediately.

```typescript
// Infrastructure layer — the ONLY place try-catch lives
const findUserById = (id: string): TE.TaskEither<DbError, User> =>
  pipe(
    () => db.query("SELECT * FROM users WHERE id = $1", [id]),
    TE.tryCatch((err) => ({
      kind: "db_error" as const,
      message: String(err),
    })),
  );
```

### 3. Use domain error types, not generic Error

Never use `Error` or `string` as your error type in business logic. Define discriminated unions that describe what went wrong in domain terms.

```typescript
// Bad — generic error, callers can't pattern match
type AppError = Error;

// Good — discriminated union, exhaustive matching
type AppError =
  | { kind: "not_found"; resource: string; id: string }
  | { kind: "validation"; field: string; message: string }
  | { kind: "unauthorized"; reason: string }
  | { kind: "db_error"; message: string };
```

### 4. Transform errors at boundaries with mapLeft

Each layer of your application should speak its own error language. Use `mapLeft` to translate errors when crossing boundaries.

```typescript
// Repository layer speaks DbError
const findUser = (id: string): TE.TaskEither<DbError, User> => /* ... */;

// Service layer speaks AppError
const getUser = (id: string): TE.TaskEither<AppError, User> =>
  pipe(
    findUser(id),
    TE.mapLeft((dbErr): AppError => ({
      kind: "not_found",
      resource: "user",
      id,
    })),
  );
```

---

## Error Transformation with mapLeft

`mapLeft` transforms the error without touching the success value. It is how you adapt errors when moving between layers.

```typescript
type DbError = { code: string; detail: string };
type ApiError = { status: number; message: string };

const dbToApiError = (err: DbError): ApiError => {
  switch (err.code) {
    case "23505":
      return { status: 409, message: "Resource already exists" };
    case "23503":
      return { status: 400, message: "Referenced resource not found" };
    default:
      return { status: 500, message: "Internal database error" };
  }
};

const createUser = (data: UserInput): TE.TaskEither<ApiError, User> =>
  pipe(
    insertUser(data),                // TE<DbError, User>
    TE.mapLeft(dbToApiError),        // TE<ApiError, User>
  );
```

---

## Recovery with chainLeft / bindLeft

`chainLeft` (alias: `orElse`) runs only when the pipeline is in the error channel. Use it to attempt recovery or provide fallback behavior.

### Sync recovery with Either

```typescript
const fetchFromPrimary = (): E.Either<string, Config> =>
  E.left("primary config missing");

const fetchFromFallback = (err: string): E.Either<string, Config> =>
  E.right({ host: "localhost", port: 3000 });

const config = pipe(
  fetchFromPrimary(),
  E.bindLeft(fetchFromFallback),
);
// Right({ host: "localhost", port: 3000 })
```

### Async recovery with TaskEither

```typescript
const fetchFromCache = (key: string): TE.TaskEither<CacheError, User> => /* ... */;
const fetchFromDb = (key: string): TE.TaskEither<DbError, User> => /* ... */;

const getUser = (id: string): TE.TaskEither<DbError, User> =>
  pipe(
    fetchFromCache(id),
    TE.chainLeft(() => fetchFromDb(id)),
  );
```

### Conditional recovery

Recover only for certain errors; propagate the rest:

```typescript
const getUser = (id: string): TE.TaskEither<AppError, User> =>
  pipe(
    fetchUser(id),
    TE.chainLeft((err) =>
      err.kind === "not_found"
        ? TE.of(guestUser)
        : TE.left(err),
    ),
  );
```

---

## Widening Error Types with chainw

When you chain operations with different error types, use `chainw` (chain-wide) to automatically union the errors. This is essential for composing operations from different modules.

```typescript
type AuthError = { kind: "auth_error"; reason: string };
type DbError = { kind: "db_error"; message: string };
type ValidationError = { kind: "validation_error"; field: string };

const authenticate = (token: string): TE.TaskEither<AuthError, UserId> => /* ... */;
const findUser = (id: UserId): TE.TaskEither<DbError, User> => /* ... */;
const validateProfile = (user: User): TE.TaskEither<ValidationError, ValidUser> => /* ... */;

const getValidatedUser = (token: string) =>
  pipe(
    authenticate(token),             // TE<AuthError, UserId>
    TE.chainw(findUser),             // TE<AuthError | DbError, User>
    TE.chainw(validateProfile),      // TE<AuthError | DbError | ValidationError, ValidUser>
  );
// Result type: TE.TaskEither<AuthError | DbError | ValidationError, ValidUser>
```

Without `chainw`, TypeScript would reject the pipeline because `chain` requires all operations to share the same error type.

---

## Fallback with orElse / alt

### orElse

`orElse` is an alias for `chainLeft`. It replaces the error with a new computation:

```typescript
const fetchWithFallback = (id: string) =>
  pipe(
    fetchFromPrimaryApi(id),
    TE.orElse(() => fetchFromSecondaryApi(id)),
    TE.orElse(() => TE.of(defaultUser)),
  );
```

### alt

`alt` provides a pre-built fallback `TaskEither` (not a function). Use it when the fallback doesn't depend on the error:

```typescript
const fetchWithFallback = (id: string) =>
  pipe(
    fetchFromPrimaryApi(id),
    TE.alt(fetchFromSecondaryApi(id)),
  );
```

---

## Retry with TE.retry

`TE.retry` re-executes a failing `TaskEither` with configurable behavior:

```typescript
type RetryOptions<E> = {
  maxRetries: number;     // maximum number of retry attempts
  delay?: number;         // milliseconds between attempts
  onError?: (e: E) => void;   // callback on each failure
  skipIf?: (e: E) => boolean; // skip retrying for certain errors
};
```

### Basic retry

```typescript
const fetchData = pipe(
  TE.tryCatch((e) => e as HttpError)(
    () => fetch("/api/data").then((r) => r.json()),
  ),
  TE.retry({ maxRetries: 3, delay: 1000 }),
);
```

### Retry with skip conditions

Don't retry client errors (4xx) — they won't succeed on retry:

```typescript
const fetchUser = (id: string) =>
  pipe(
    request<User>(`/api/users/${id}`),
    TE.retry({
      maxRetries: 3,
      delay: 2000,
      onError: (err) => console.warn(`Retry: ${err.message}`),
      skipIf: (err) => err.status >= 400 && err.status < 500,
    }),
  );
```

### Retry + fallback combination

```typescript
const resilientFetch = (id: string) =>
  pipe(
    fetchFromPrimaryApi(id),
    TE.retry({
      maxRetries: 2,
      delay: 1000,
      skipIf: (err) => err.status === 404,
    }),
    TE.orElse((err) =>
      err.status === 404
        ? TE.left(err)
        : fetchFromFallbackApi(id),
    ),
  );
```

---

## Infrastructure Layer Pattern

The infrastructure layer is the adapter between the outside world (databases, APIs, file systems) and your domain. It is the only layer that uses `try-catch`.

### Repository (infrastructure)

```typescript
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

type DbError = { kind: "db_error"; message: string; query: string };

interface UserRow {
  id: string;
  name: string;
  email: string;
}

// try-catch lives here — infrastructure boundary
const findUserById = (db: Database) => (id: string): TE.TaskEither<DbError, UserRow | null> =>
  pipe(
    () => db.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]),
    TE.tryCatch((err): DbError => ({
      kind: "db_error",
      message: String(err),
      query: "findUserById",
    })),
    TE.map((rows) => rows[0] ?? null),
  );

const insertUser = (db: Database) => (user: UserRow): TE.TaskEither<DbError, UserRow> =>
  pipe(
    () => db.query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3)", [user.id, user.name, user.email]),
    TE.tryCatch((err): DbError => ({
      kind: "db_error",
      message: String(err),
      query: "insertUser",
    })),
    TE.map(() => user),
  );
```

### Service (business logic)

```typescript
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

// No try-catch here — only Either/TaskEither
type AppError =
  | { kind: "not_found"; resource: string; id: string }
  | { kind: "validation"; field: string; message: string }
  | { kind: "db_error"; message: string; query: string };

const getUser = (id: string): TE.TaskEither<AppError, User> =>
  pipe(
    findUserById(db)(id),                          // TE<DbError, UserRow | null>
    TE.chainw((row) =>                             // widen to include not_found
      row === null
        ? TE.left<AppError>({ kind: "not_found", resource: "user", id })
        : TE.of(toUser(row)),
    ),
  );

const createUser = (input: CreateUserInput): TE.TaskEither<AppError, User> =>
  pipe(
    validateInput(input),                          // Either<AppError, ValidInput>
    TE.fromEither,                                 // TE<AppError, ValidInput>
    TE.map(toUserRow),                             // TE<AppError, UserRow>
    TE.chain((row) => insertUser(db)(row)),         // TE<AppError, UserRow>
    TE.map(toUser),                                // TE<AppError, User>
  );
```

---

## Error Fold at HTTP Handler Boundary

At the outermost boundary — typically an HTTP handler — you `fold` the `Either` to produce a concrete response. This is where functional error handling meets the real world.

### Express / Hono handler

```typescript
import { pipe } from "@oofp/core/pipe";
import * as TE from "@oofp/core/task-either";
import * as E from "@oofp/core/either";

const toHttpError = (err: AppError): { status: number; body: object } => {
  switch (err.kind) {
    case "not_found":
      return { status: 404, body: { error: `${err.resource} not found` } };
    case "validation":
      return { status: 400, body: { error: err.message, field: err.field } };
    case "unauthorized":
      return { status: 401, body: { error: err.reason } };
    case "db_error":
      return { status: 500, body: { error: "Internal server error" } };
  }
};

app.get("/users/:id", async (req, res) => {
  const result = await pipe(
    getUser(req.params.id),
    TE.fold(
      (err) => toHttpError(err),
      (user) => ({ status: 200, body: user }),
    ),
    (task) => task(),
  );

  res.status(result.status).json(result.body);
});
```

### With ReaderTaskEither

```typescript
app.post("/users", async (req, res) => {
  const result = await pipe(
    createUser(req.body),                // RTE<AppContext, AppError, User>
    RTE.run(appContext),                 // () => Promise<Either<AppError, User>>
  )();

  pipe(
    result,
    E.fold(
      (err) => res.status(toHttpError(err).status).json(toHttpError(err).body),
      (user) => res.status(201).json(user),
    ),
  );
});
```

### Complete handler pattern

```typescript
// Reusable handler wrapper
const handleRTE = <R, E, A>(
  rte: RTE.ReaderTaskEither<R, E, A>,
  ctx: R,
  toError: (e: E) => { status: number; body: object },
  toSuccess: (a: A) => { status: number; body: object },
) =>
  async (_req: Request, res: Response) => {
    const result = await pipe(rte, RTE.run(ctx))();

    pipe(
      result,
      E.fold(
        (err) => {
          const { status, body } = toError(err);
          res.status(status).json(body);
        },
        (data) => {
          const { status, body } = toSuccess(data);
          res.status(status).json(body);
        },
      ),
    );
  };

// Usage
app.get(
  "/users/:id",
  handleRTE(
    getUser(req.params.id),
    appContext,
    toHttpError,
    (user) => ({ status: 200, body: user }),
  ),
);
```

---

## Summary

| Principle | Tool | Example |
|-----------|------|---------|
| No try-catch in business logic | `Either`, `TaskEither` | `E.left(...)`, `TE.of(...)` |
| try-catch only in infrastructure | `TE.tryCatch` | Repos, HTTP clients |
| Domain error types | Discriminated unions | `{ kind: "not_found", ... }` |
| Transform errors at boundaries | `mapLeft` | `TE.mapLeft(dbToApiError)` |
| Recovery | `chainLeft` / `orElse` | Fallback logic |
| Widen errors | `chainw` | Composing different modules |
| Retry transient failures | `TE.retry` | Network, DB timeouts |
| Fold at the edge | `TE.fold` / `E.fold` | HTTP handlers, CLI output |
