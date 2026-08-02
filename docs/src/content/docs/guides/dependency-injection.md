---
title: "Dependency Injection"
description: "Pure dependency injection with Reader and ReaderTaskEither."
---

OOFP provides dependency injection through the `Reader` and `ReaderTaskEither` types — no decorators, no containers, no runtime reflection. Dependencies are declared in the type signature and provided at the application boundary.

For a complete NestJS vertical slice using these ideas, see [Opinionated Backend Architecture](/guides/opinionated-backend-architecture/).

```typescript
import { pipe } from "@oofp/core/pipe";
import * as R from "@oofp/core/reader";
import * as TE from "@oofp/core/task-either";
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";
```

---

## Reader as a Function

A `Reader` is just a function that takes a context (environment, dependencies) and returns a value:

```typescript
type Reader<R, A> = (r: R) => A;
```

- `R` — the context type (your dependencies)
- `A` — the return value

The power comes from composition: you build small readers, combine them, and provide the context once at the boundary.

```typescript
interface Config {
  apiUrl: string;
  timeout: number;
}

const getApiUrl: R.Reader<Config, string> = R.from((ctx) => ctx.apiUrl);
const getTimeout: R.Reader<Config, number> = R.from((ctx) => ctx.timeout);

// Combine with map/chain
const getBaseHeaders = pipe(
  getApiUrl,
  R.map((url) => ({ "X-Api-Base": url })),
);

// Provide context at the boundary
const headers = R.run({ apiUrl: "https://api.example.com", timeout: 5000 })(getBaseHeaders);
// { "X-Api-Base": "https://api.example.com" }
```

---

## ReaderTaskEither for Real Applications

In practice, most application logic needs all three: dependency injection, async, and typed errors. `ReaderTaskEither` combines them:

```typescript
type ReaderTaskEither<R, E, A> = (r: R) => () => Promise<Either<E, A>>;
```

- `R` — context (dependencies)
- `E` — typed error
- `A` — success value

Nothing runs until you provide the context and call the resulting thunk.

---

## Service Factory with R.from

Use `R.from` to build service functions that declare their dependencies explicitly:

```typescript
interface UserRepo {
  findById: (id: string) => Promise<User | null>;
  save: (user: User) => Promise<void>;
}

interface Logger {
  info: (msg: string) => void;
  error: (msg: string) => void;
}

// Each function declares what it needs
const findUser = (id: string): R.Reader<{ userRepo: UserRepo }, User | null> =>
  R.from(({ userRepo }) => userRepo.findById(id));

const logAction = (msg: string): R.Reader<{ logger: Logger }, void> =>
  R.from(({ logger }) => logger.info(msg));
```

For async + error handling, use `RTE` directly:

```typescript
interface Deps {
  userRepo: UserRepo;
  logger: Logger;
}

const findUser = (id: string): RTE.ReaderTaskEither<Deps, AppError, User> =>
  pipe(
    RTE.ask<Deps>(),
    RTE.chaint(({ userRepo, logger }) =>
      pipe(
        () => userRepo.findById(id),
        TE.tryCatch((err): AppError => ({ kind: "db_error", message: String(err) })),
        TE.chainw((row) =>
          row === null
            ? TE.left<AppError>({ kind: "not_found", resource: "user", id })
            : TE.of(row),
        ),
      ),
    ),
    RTE.tap((user) => console.log(`Found user: ${user.name}`)),
  );
```

---

## Use-Case with RTE.ask

`RTE.ask` gives you access to the full context. Use it at the start of a pipeline, then chain operations that use the context:

```typescript
interface AppContext {
  db: Database;
  mailer: Mailer;
  config: Config;
}

const sendWelcomeEmail = (user: User): RTE.ReaderTaskEither<AppContext, AppError, void> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint(({ mailer, config }) =>
      TE.tryCatch((err): AppError => ({ kind: "email_error", message: String(err) }))(
        () => mailer.send({
          to: user.email,
          subject: "Welcome!",
          template: config.welcomeTemplate,
        }),
      ),
    ),
  );
```

---

## Context Injection Methods

OOFP provides four ways to inject context into an `RTE` pipeline. Each is appropriate for different situations:

| Method | Input | Behavior |
|--------|-------|----------|
| `provide(ctx)` | Static object | Inject partial context synchronously |
| `provideTE(te)` | `TaskEither<E, Ctx2>` | Compute context asynchronously (no access to current context) |
| `provideRTE(rte)` | `RTE<R0, E, Ctx2>` | Compute context asynchronously with access to current context |
| `provideF(fn)` | `(ctx) => TE<E, Ctx2>` | Same as `provideRTE` (prefer `provideRTE` for clarity) |

### provide — Static context injection

The simplest form. Provide a static object that satisfies part of the context:

```typescript
interface DbContext {
  db: Database;
}

interface LoggerContext {
  logger: Logger;
}

type AppContext = DbContext & LoggerContext;

const program: RTE.ReaderTaskEither<AppContext, AppError, User[]> = /* ... */;

// Satisfy LoggerContext — only DbContext remains
const withLogger = pipe(
  program,
  RTE.provide({ logger: console }),
);
// RTE<DbContext, AppError, User[]>

// Satisfy DbContext at the boundary
const result = await pipe(
  withLogger,
  RTE.run({ db: myDatabase }),
)();
```

### provideTE — Async context computation

Use when the context must be computed asynchronously but doesn't need access to any existing context:

```typescript
interface PoolContext {
  pool: ConnectionPool;
}

const createPool = (): TE.TaskEither<AppError, PoolContext> =>
  pipe(
    () => Pool.create({ host: "localhost", max: 10 }),
    TE.tryCatch((err): AppError => ({ kind: "db_error", message: String(err) })),
    TE.map((pool) => ({ pool })),
  );

const program: RTE.ReaderTaskEither<PoolContext, AppError, User[]> = /* ... */;

const withPool = pipe(
  program,
  RTE.provideTE(createPool()),
);
// RTE<{}, AppError, User[]> — PoolContext has been provided
```

### provideRTE — Async context with current context access

Use when computing the new context requires reading from the current context:

```typescript
interface ConfigContext {
  config: { dbConnectionString: string };
}

interface PoolContext {
  pool: ConnectionPool;
}

const program: RTE.ReaderTaskEither<PoolContext & ConfigContext, AppError, User[]> = /* ... */;

const withPool = pipe(
  program,
  RTE.provideRTE((ctx: ConfigContext) =>
    pipe(
      RTE.of(ctx),
      RTE.chaint((c) =>
        pipe(
          () => Pool.create(c.config.dbConnectionString),
          TE.tryCatch((err): AppError => ({ kind: "db_error", message: String(err) })),
        ),
      ),
      RTE.map((pool) => ({ pool })),
    ),
  ),
);
// RTE<ConfigContext, AppError, User[]> — PoolContext has been provided using ConfigContext
```

### provideF — Function-based context

`provideF` takes a function from the current context to a `TaskEither` of the new context. It's equivalent to `provideRTE` — prefer `provideRTE` for clarity:

```typescript
const withPool = pipe(
  program,
  RTE.provideF((ctx: ConfigContext) =>
    pipe(
      () => Pool.create(ctx.config.dbConnectionString),
      TE.tryCatch((err): AppError => ({ kind: "db_error", message: String(err) })),
      TE.map((pool) => ({ pool })),
    ),
  ),
);
```

---

## Orchestration with chainwc

`chainwc` (chain with context) is the key to composing operations from different modules. It automatically merges context types (`R1 & R2`) and widens error types (`E1 | E2`).

```typescript
interface DbContext {
  db: { findUser: (id: string) => Promise<User> };
}

interface MailContext {
  mailer: { send: (to: string, body: string) => Promise<void> };
}

interface AnalyticsContext {
  analytics: { track: (event: string, data: object) => Promise<void> };
}

const findUser = (id: string): RTE.ReaderTaskEither<DbContext, DbError, User> =>
  pipe(
    RTE.ask<DbContext>(),
    RTE.chaint(({ db }) =>
      TE.tryCatch((err): DbError => ({ kind: "db_error", message: String(err) }))(
        () => db.findUser(id),
      ),
    ),
  );

const sendNotification = (user: User): RTE.ReaderTaskEither<MailContext, MailError, void> =>
  pipe(
    RTE.ask<MailContext>(),
    RTE.chaint(({ mailer }) =>
      TE.tryCatch((err): MailError => ({ kind: "mail_error", message: String(err) }))(
        () => mailer.send(user.email, `Welcome, ${user.name}!`),
      ),
    ),
  );

const trackEvent = (event: string, data: object): RTE.ReaderTaskEither<AnalyticsContext, AnalyticsError, void> =>
  pipe(
    RTE.ask<AnalyticsContext>(),
    RTE.chaint(({ analytics }) =>
      TE.tryCatch((err): AnalyticsError => ({ kind: "analytics_error", message: String(err) }))(
        () => analytics.track(event, data),
      ),
    ),
  );

// chainwc merges all contexts automatically
const onboardUser = (id: string) =>
  pipe(
    findUser(id),                                    // RTE<DbContext, DbError, User>
    RTE.chainwc((user) =>                            // RTE<DbContext & MailContext, DbError | MailError, void>
      sendNotification(user),
    ),
    RTE.chainwc(() =>                                // RTE<DbContext & MailContext & AnalyticsContext, ...>
      trackEvent("user_onboarded", { userId: id }),
    ),
  );
// Final type: RTE<DbContext & MailContext & AnalyticsContext, DbError | MailError | AnalyticsError, void>
```

At the boundary, you provide a single object that satisfies all merged contexts:

```typescript
const result = await pipe(
  onboardUser("user-42"),
  RTE.run({
    db: myDbClient,
    mailer: myMailService,
    analytics: myAnalyticsClient,
  }),
)();
```

---

## Execution at Boundaries

The entire point of Reader-based DI is that nothing executes until you reach a boundary. Boundaries are where you provide context and run the pipeline.

### HTTP Handler

```typescript
app.post("/users", async (req, res) => {
  const result = await pipe(
    createUser(req.body),
    RTE.run(appContext),
  )();

  pipe(
    result,
    E.fold(
      (err) => res.status(toStatusCode(err)).json({ error: err }),
      (user) => res.status(201).json(user),
    ),
  );
});
```

### CLI Entry Point

```typescript
const main = async () => {
  const ctx: AppContext = {
    db: createDatabase(process.env.DATABASE_URL!),
    logger: createLogger("info"),
    config: loadConfig(),
  };

  const result = await pipe(
    processAllUsers(),
    RTE.run(ctx),
  )();

  pipe(
    result,
    E.fold(
      (err) => {
        console.error("Failed:", err);
        process.exit(1);
      },
      (summary) => {
        console.log("Done:", summary);
        process.exit(0);
      },
    ),
  );
};

main();
```

### Testing

Reader-based DI makes testing straightforward — just provide mock dependencies:

```typescript
describe("createUser", () => {
  it("should create a user and send welcome email", async () => {
    const mockDb = {
      insertUser: vi.fn().mockResolvedValue({ id: "1", name: "Alice" }),
    };
    const mockMailer = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    const result = await pipe(
      createUser({ name: "Alice", email: "alice@test.com" }),
      RTE.run({ db: mockDb, mailer: mockMailer }),
    )();

    expect(E.isRight(result)).toBe(true);
    expect(mockMailer.send).toHaveBeenCalledWith(
      "alice@test.com",
      expect.stringContaining("Welcome"),
    );
  });
});
```

---

## Layered Provide Pattern

Build context layer by layer, from infrastructure up to application:

```typescript
// Layer 1: Config (static)
const withConfig = RTE.provide({
  config: loadConfig(),
});

// Layer 2: Logger (static)
const withLogger = RTE.provide({
  logger: createLogger(),
});

// Layer 3: Database (async, needs config)
const withDb = RTE.provideRTE((ctx: { config: Config }) =>
  pipe(
    RTE.of(ctx),
    RTE.chaint((c) =>
      pipe(
        () => createPool(c.config.dbConnectionString),
        TE.tryCatch((err): AppError => ({ kind: "infra_error", message: String(err) })),
      ),
    ),
    RTE.map((db) => ({ db })),
  ),
);

// Compose layers — order matters (innermost context first)
const runApp = (program: RTE.ReaderTaskEither<AppContext, AppError, void>) =>
  pipe(
    program,
    withDb,        // provides db (needs config)
    withLogger,    // provides logger
    withConfig,    // provides config
    RTE.run({}),   // all dependencies satisfied
  )();
```

---

## Summary

| Concept | Tool | When |
|---------|------|------|
| Declare dependencies | `RTE<R, E, A>` type parameter `R` | Always — make deps explicit |
| Access context | `RTE.ask()` | Start of a pipeline |
| Inject static deps | `RTE.provide(obj)` | Known at build time |
| Inject async deps | `RTE.provideTE(te)` | Computed at runtime, no existing context needed |
| Inject deps from context | `RTE.provideRTE(rte)` | Computed from existing context |
| Merge contexts | `RTE.chainwc` | Composing different modules |
| Run at boundary | `RTE.run(ctx)` | HTTP handler, CLI, test |
