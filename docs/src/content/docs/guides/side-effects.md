---
title: "Side Effects"
description: "Choosing the right tap variant for synchronous and asynchronous side effects."
---

Side effects — logging, analytics, notifications, audit trails — are unavoidable in real applications. OOFP provides a family of `tap` operators that let you perform side effects at precise points in a pipeline without altering the value flowing through it.

The key decision is: **should the side effect block the pipeline, and should its failure propagate?**

```typescript
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as E from "@oofp/core/either";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
```

---

## Synchronous Side Effects

Synchronous taps execute immediately, never fail the pipeline, and are available on all monads.

### tap (all monads)

Runs a synchronous side effect on the success value. The return value of the callback is ignored.

```typescript
// Maybe
pipe(
  M.fromNullable(user),
  M.tap((u) => console.log("Found user:", u.name)),
  M.map((u) => u.email),
);

// Either
pipe(
  E.right(42),
  E.tap((n) => console.log("Value:", n)),
  E.map((n) => n * 2),
);

// TaskEither
pipe(
  getUser("123"),
  TE.tap((user) => console.log("Fetched:", user.name)),
  TE.map((user) => user.email),
);
```

### tapLeft (Either, TaskEither, ReaderTaskEither)

Runs a synchronous side effect on the error value. Does nothing on success.

```typescript
pipe(
  getUser("unknown"),
  TE.tapLeft((err) => console.error("Failed:", err.message)),
  TE.map((user) => user.name),
);
```

### tapNothing (Maybe)

Runs a synchronous side effect when the value is `Nothing`. Does nothing on `Just`.

```typescript
pipe(
  M.fromNullable(cachedValue),
  M.tapNothing(() => console.warn("Cache miss")),
  M.getOrElse(defaultValue),
);
```

### tapR (ReaderTaskEither)

Runs a synchronous side effect with access to both the success value and the context.

```typescript
pipe(
  findUser(id),
  RTE.tapR((user, ctx) => ctx.logger.info(`Found user: ${user.name}`)),
  RTE.map((user) => user.email),
);
```

---

## Async Side Effects

Async side effects are only available on `TaskEither` and `ReaderTaskEither`. They come in three variants with very different behavior. Choosing the wrong one is a common source of bugs.

### TaskEither Variants

| Variant | Awaited? | Error propagated? | Use case |
|---------|----------|-------------------|----------|
| `tapTE` | Yes | Yes | Critical: audit logs, compliance |
| `tapTEAsync` | No | No | Fire-and-forget: analytics, metrics |
| `tapTEDetached` | No | No (callback) | Fire-and-forget + error handling |
| `tapLeftTE` | Yes | Yes | Error-path side effects |
| `tapLeftTEAsync` | No | No | Fire-and-forget on error |
| `tapLeftTEDetached` | No | No (callback) | Fire-and-forget on error + callback |

### ReaderTaskEither Variants

| Variant | Awaited? | Error propagated? | Use case |
|---------|----------|-------------------|----------|
| `tapRTE` | Yes | Yes | Critical: audit logs with context |
| `tapRTEAsync` | No | No | Fire-and-forget: analytics with context |
| `tapRTEDetached` | No | No (callback) | Fire-and-forget + error handling with context |
| `tapLeftRTE` | Yes | Yes | Error-path side effects with context |
| `tapLeftRTEAsync` | No | No | Fire-and-forget on error with context |
| `tapLeftRTEDetached` | No | No (callback) | Fire-and-forget on error + callback with context |

---

## Awaited Side Effects: tapTE / tapRTE

The side effect is awaited. If it fails, the error **propagates** into the pipeline and the pipeline fails. Use this for side effects that **must succeed** for the operation to be considered complete.

```typescript
const writeAuditLog = (user: User): TE.TaskEither<AuditError, void> => /* ... */;

const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),               // TE<DbError, User>
    TE.tapTE(writeAuditLog),         // TE<DbError | AuditError, User>
  );
// If audit log fails, the whole pipeline fails.
// Error type is widened to DbError | AuditError.
```

With `RTE` and context access:

```typescript
const writeAuditLog = (user: User): RTE.ReaderTaskEither<AuditContext, AuditError, void> => /* ... */;

const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),               // RTE<DbContext, DbError, User>
    RTE.tapRTE(writeAuditLog),       // RTE<DbContext & AuditContext, DbError | AuditError, User>
  );
```

---

## Fire-and-Forget: tapTEAsync / tapRTEAsync

The side effect is launched but **not awaited**. The pipeline continues immediately. If the side effect fails, the error is **silently swallowed**. Use this for non-critical side effects where you don't want to slow down or risk the main operation.

```typescript
const trackAnalytics = (user: User): TE.TaskEither<never, void> => /* ... */;

const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),               // TE<DbError, User>
    TE.tapTEAsync(trackAnalytics),   // TE<DbError, User> — error type NOT widened
  );
// Analytics runs in the background. Pipeline does not wait.
// If analytics fails, nobody knows.
```

---

## Fire-and-Forget with Error Handling: tapTEDetached / tapRTEDetached

Like `tapTEAsync`, but accepts an error callback so you can observe failures without blocking the pipeline. Use this when you want fire-and-forget semantics but still need to log or alert on side effect failures.

```typescript
const sendWelcomeEmail = (user: User): TE.TaskEither<EmailError, void> => /* ... */;

const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    TE.tapTEDetached(
      sendWelcomeEmail,
      (err) => console.error("Welcome email failed:", err),
    ),
  );
// Email is fire-and-forget, but failures are logged.
```

With `RTE`:

```typescript
const syncToExternalCRM = (user: User): RTE.ReaderTaskEither<CrmContext, CrmError, void> => /* ... */;

const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    RTE.tapRTEDetached(
      syncToExternalCRM,
      (err) => alertOpsChannel(`CRM sync failed: ${err.message}`),
    ),
  );
```

---

## Error-Path Side Effects: tapLeftTE / tapLeftRTE

These run only when the pipeline is in the error channel. The same three variants apply (awaited, async, detached).

### tapLeftTE — Awaited error-path side effect

```typescript
const reportError = (err: AppError): TE.TaskEither<never, void> =>
  TE.fromPromise(() =>
    fetch("/api/errors", {
      method: "POST",
      body: JSON.stringify(err),
    }).then(() => {}),
  );

const getUser = (id: string) =>
  pipe(
    fetchUser(id),
    TE.tapLeftTE(reportError), // awaited — if reporting fails, pipeline error changes
  );
```

### tapLeftTEAsync — Fire-and-forget on error

```typescript
const trackErrorMetric = (err: AppError): TE.TaskEither<never, void> => /* ... */;

const getUser = (id: string) =>
  pipe(
    fetchUser(id),
    TE.tapLeftTEAsync(trackErrorMetric), // fire-and-forget
  );
```

### tapLeftTEDetached — Fire-and-forget on error with callback

```typescript
const getUser = (id: string) =>
  pipe(
    fetchUser(id),
    TE.tapLeftTEDetached(
      reportToSentry,
      (reportErr) => console.error("Sentry report failed:", reportErr),
    ),
  );
```

---

## Common Mistakes

### Mistake: Using tapRTE for analytics

```typescript
// WRONG — analytics failure kills the entire pipeline
const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    RTE.tapRTE(trackAnalytics),   // if analytics service is down, user creation fails!
  );

// CORRECT — use fire-and-forget for non-critical side effects
const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    RTE.tapRTEAsync(trackAnalytics),  // analytics failure is silently ignored
  );
```

### Mistake: Using tapTEAsync for audit logs

```typescript
// WRONG — audit log might not complete before the response is sent
const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    TE.tapTEAsync(writeAuditLog),  // fire-and-forget — audit log may be lost
  );

// CORRECT — audit must complete before we respond
const createUser = (input: UserInput) =>
  pipe(
    insertUser(input),
    TE.tapTE(writeAuditLog),  // awaited — pipeline waits for audit to complete
  );
```

### Mistake: Ignoring errors on important side effects

```typescript
// WRONG — email failure is completely invisible
const onboardUser = (user: User) =>
  pipe(
    activateAccount(user),
    TE.tapTEAsync(sendWelcomeEmail),  // if email fails, nobody knows
  );

// CORRECT — use detached with error callback for observability
const onboardUser = (user: User) =>
  pipe(
    activateAccount(user),
    TE.tapTEDetached(
      sendWelcomeEmail,
      (err) => alertOpsChannel(`Welcome email failed for ${user.id}: ${err}`),
    ),
  );
```

---

## Decision Guide

```
Is the side effect critical (audit, compliance)?
├── YES → Use tapTE / tapRTE (awaited, error propagates)
└── NO → Is failure observation needed?
    ├── YES → Use tapTEDetached / tapRTEDetached (fire-and-forget + callback)
    └── NO → Use tapTEAsync / tapRTEAsync (fire-and-forget, silent)
```

### Quick Reference

| Side effect | Variant |
|-------------|---------|
| Audit log | `tapTE` / `tapRTE` |
| Compliance record | `tapTE` / `tapRTE` |
| Analytics event | `tapTEAsync` / `tapRTEAsync` |
| Metrics counter | `tapTEAsync` / `tapRTEAsync` |
| Welcome email | `tapTEDetached` / `tapRTEDetached` |
| Webhook notification | `tapTEDetached` / `tapRTEDetached` |
| Error reporting (Sentry) | `tapLeftTEDetached` / `tapLeftRTEDetached` |
| Error metrics | `tapLeftTEAsync` / `tapLeftRTEAsync` |
| Console logging | `tap` / `tapLeft` |
