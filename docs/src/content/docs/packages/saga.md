---
title: "@oofp/saga"
description: "Saga pattern for transactional workflows with compensation."
---

`@oofp/saga` implements the saga pattern for orchestrating multi-step operations that need automatic rollback on failure. Each step defines an action and an optional compensation (undo). If any step fails, all previously completed compensations run in reverse order (LIFO).

```bash
pnpm add @oofp/saga
```

**License:** MIT | **Peer dependency:** `@oofp/core`

---

## The Problem

Many workflows involve multiple side effects that must be treated as a logical transaction:

1. Create a database record
2. Register in an external service
3. Send a notification

If step 3 fails, you need to undo steps 1 and 2. Without the saga pattern, you end up with deeply nested `try-catch` blocks and manual cleanup logic.

---

## API

The entire API surface is three functions: `step`, `chain`, and `run`.

```typescript
import * as Saga from "@oofp/saga";
```

### step

Defines a saga step with an action and an optional compensation function.

```typescript
Saga.step({
  name: string,
  action: RTE<R, E, A>,
  compensate?: (result: A) => RTE<R, E, void>,
})
// Returns: SagaStep<R, E, A>
```

- `name` — a label for debugging and logging
- `action` — the `ReaderTaskEither` to execute
- `compensate` — receives the action's result and returns an RTE that undoes it

### chain

Sequences saga steps. The result of the previous step is available to build the next one.

```typescript
Saga.chain((previousResult: A) => nextStep)
// (SagaStep<R1, E1, A>) => SagaStep<R1 & R2, E1 | E2, B>
```

Context types merge (`R1 & R2`) and error types widen (`E1 | E2`) automatically — just like `RTE.chainwc`.

### run

Executes the saga. On success, returns the final result. On failure, runs all accumulated compensations in reverse order before returning the error.

```typescript
Saga.run(sagaStep)
// SagaStep<R, E, A> => RTE<R, E | Error, A>
```

---

## Complete Example

```typescript
import * as Saga from "@oofp/saga";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Types
interface DbContext {
  db: {
    insert: (table: string, data: unknown) => Promise<{ id: string }>;
    delete: (table: string, id: string) => Promise<void>;
  };
}

interface AuthContext {
  auth: {
    register: (email: string) => Promise<{ uid: string }>;
    delete: (uid: string) => Promise<void>;
  };
}

interface MailContext {
  mailer: { send: (to: string, body: string) => Promise<void> };
}

type Recruiter = { id: string; email: string };
type User = { id: string; recruiterId: string };
type AuthIdentity = { uid: string };

// Step 1: Create recruiter in DB
const createRecruiterStep = (email: string) =>
  Saga.step({
    name: "create-recruiter",
    action: pipe(
      RTE.ask<DbContext>(),
      RTE.chaint((ctx) =>
        TE.tryCatch(
          () => ctx.db.insert("recruiters", { email }),
          (err) => new Error(`Insert failed: ${err}`),
        ),
      ),
      RTE.map((row): Recruiter => ({ id: row.id, email })),
    ),
    compensate: (recruiter) =>
      pipe(
        RTE.ask<DbContext>(),
        RTE.chaint((ctx) =>
          TE.tryCatch(
            () => ctx.db.delete("recruiters", recruiter.id),
            (err) => new Error(`Compensation failed: ${err}`),
          ),
        ),
      ),
  });

// Step 2: Register in auth service
const registerAuthStep = (recruiter: Recruiter) =>
  Saga.step({
    name: "register-auth",
    action: pipe(
      RTE.ask<AuthContext>(),
      RTE.chaint((ctx) =>
        TE.tryCatch(
          () => ctx.auth.register(recruiter.email),
          (err) => new Error(`Auth registration failed: ${err}`),
        ),
      ),
    ),
    compensate: (identity) =>
      pipe(
        RTE.ask<AuthContext>(),
        RTE.chaint((ctx) =>
          TE.tryCatch(
            () => ctx.auth.delete(identity.uid),
            (err) => new Error(`Auth compensation failed: ${err}`),
          ),
        ),
      ),
  });

// Step 3: Send welcome email (no compensation needed)
const sendWelcomeStep = (recruiter: Recruiter) =>
  Saga.step({
    name: "send-welcome",
    action: pipe(
      RTE.ask<MailContext>(),
      RTE.chaint((ctx) =>
        TE.tryCatch(
          () => ctx.mailer.send(recruiter.email, "Welcome!"),
          (err) => new Error(`Email failed: ${err}`),
        ),
      ),
    ),
    // No compensate — can't unsend an email
  });

// Compose the saga
const registerRecruiter = (email: string) =>
  pipe(
    createRecruiterStep(email),
    Saga.chain((recruiter) => registerAuthStep(recruiter)),
    Saga.chain((identity) =>
      Saga.step({
        name: "finalize",
        action: RTE.of(identity),
      }),
    ),
    Saga.run,
  );
// Type: RTE<DbContext & AuthContext, Error, AuthIdentity>
```

---

## How Compensation Works

When `Saga.run` executes:

1. Each step runs sequentially
2. Successful steps accumulate their compensation functions
3. If a step fails:
   - Compensations run in **reverse order** (LIFO — last completed, first undone)
   - The original error is returned after all compensations complete
4. If all steps succeed, the final result is returned

```
Step 1 ✓ → Step 2 ✓ → Step 3 ✗
                              ↓
                        Compensate Step 2
                              ↓
                        Compensate Step 1
                              ↓
                        Return original error
```

---

## Types Reference

```typescript
type SagaStepConstructor<R, E, A> = {
  name: string;
  action: RTE<R, E, A>;
  compensate?: (result: A) => RTE<R, E, void>;
};

type SagaStep<R, E, A> = RTE<R, Error, SagaState<R, E, A>>;

type SagaState<R, E, A> = {
  result: Either<E, A>;
  completedSteps: ReadonlyArray<SagaStepResult<R, E>>;
};
```
