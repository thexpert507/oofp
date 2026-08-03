---
title: "Dependency Injection in TypeScript Without Classes or Decorators"
date: 2025-07-20
authors:
  - thexpert507
tags:
  - typescript
  - functional-programming
  - dependency-injection
excerpt: "Stop fighting IoC containers. The Reader pattern gives you compile-time dependency injection in TypeScript using plain functions and types — no decorators, no reflect-metadata, no runtime overhead."
cover:
  alt: "Dependency injection without classes: database, logger, and config flow directly into a Reader program while the container is crossed out."
  image: ../../../assets/blog/dependency-injection-typescript-reader-pattern.webp
---

You want dependency injection in TypeScript. So you reach for InversifyJS, tsyringe, or NestJS. You add `reflect-metadata` to your entry point. You slap `@Injectable()` on every class. You register bindings in a container. You configure modules. You emit decorator metadata. You lose tree-shaking. And after all that setup, the compiler still cannot tell you if you forgot to register a dependency — you find out at runtime.

There is a simpler way. One that uses the type system itself as the DI container.

## The Class-Based DI Tax

Here is what dependency injection looks like in most TypeScript projects:

```typescript
import { injectable, inject } from "tsyringe";

@injectable()
class UserRepository {
  constructor(@inject("Database") private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.query("SELECT * FROM users WHERE id = ?", [id]);
  }
}

@injectable()
class UserService {
  constructor(
    @inject(UserRepository) private userRepo: UserRepository,
    @inject("Logger") private logger: Logger,
  ) {}

  async getUser(id: string): Promise<User> {
    this.logger.info(`Fetching user ${id}`);
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}

// Somewhere in bootstrap code...
container.register("Database", { useClass: PostgresDatabase });
container.register("Logger", { useClass: ConsoleLogger });
const service = container.resolve(UserService);
```

This works. But count the costs:

- **Runtime reflection.** `reflect-metadata` must be imported before anything else. Decorator metadata is emitted into JavaScript output, adding bundle weight.
- **String tokens.** `@inject("Database")` is a string. Rename it and nothing warns you. Forget to register it and you get a runtime error.
- **No tree-shaking.** The container holds references to everything. Bundlers cannot eliminate unused code.
- **Class coupling.** Every service must be a class. Every dependency must go through the constructor. You cannot use plain functions.
- **Testing ceremony.** To test `UserService`, you create a testing module, override providers, resolve from a test container. That is a lot of machinery for calling a function with a mock.

What if the type system could do all of this at compile time, with zero runtime overhead?

## The Reader Pattern

A `Reader<R, A>` is a function:

```typescript
type Reader<R, A> = (context: R) => A;
```

`R` is what the function *needs*. `A` is what it *produces*. The dependency requirements are encoded in the type signature, not in decorators or a container registry.

```typescript
import * as R from "@oofp/core/reader";
import { pipe } from "@oofp/core/pipe";

interface Config {
  apiUrl: string;
  timeout: number;
}

const getApiUrl: R.Reader<Config, string> = R.from((ctx) => ctx.apiUrl);

const buildHeaders = pipe(
  getApiUrl,
  R.map((url) => ({ "X-Api-Base": url })),
);

// Provide the context at the boundary
const headers = R.run({ apiUrl: "https://api.example.com", timeout: 5000 })(buildHeaders);
// { "X-Api-Base": "https://api.example.com" }
```

`ask()` gives you the entire context:

```typescript
const program = pipe(
  R.ask<Config>(),
  R.map((ctx) => `Connecting to ${ctx.apiUrl} with timeout ${ctx.timeout}ms`),
);
```

`chain` lets you sequence computations that share the same context:

```typescript
const getUser = (id: string): R.Reader<{ userRepo: UserRepo }, User | null> =>
  R.from(({ userRepo }) => userRepo.findById(id));

const logResult = (user: User | null): R.Reader<{ logger: Logger }, string> =>
  R.from(({ logger }) => {
    const msg = user ? `Found: ${user.name}` : "Not found";
    logger.info(msg);
    return msg;
  });
```

Use `chainw` to merge contexts from different modules:

```typescript
const findAndLog = (id: string) =>
  pipe(
    getUser(id),
    R.chainw(logResult),
  );
// Reader<{ userRepo: UserRepo } & { logger: Logger }, string>
```

TypeScript infers the combined requirement. No registration step.

## ReaderTaskEither for Real Applications

`Reader` handles dependency injection. But real application code is async and can fail. `ReaderTaskEither<R, E, A>` combines all three:

```typescript
type ReaderTaskEither<R, E, A> = (r: R) => () => Promise<Either<E, A>>;
```

- `R` — dependencies the computation requires
- `E` — typed error on failure
- `A` — success value

Nothing executes until you provide the context and call the resulting thunk. The entire pipeline is a description, not an execution.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Define what your functions need via types
type Database = { db: { findUser: (id: string) => Promise<User | null> } };
type Logger = { logger: { info: (msg: string) => void } };

type AppError = { code: string; message: string };

// Each function declares its dependencies in the R type parameter
const findUser = (id: string): RTE.ReaderTaskEither<Database, AppError, User> =>
  pipe(
    RTE.ask<Database>(),
    RTE.chaint(({ db }) =>
      pipe(
        () => db.findUser(id),
        TE.tryCatch((err): AppError => ({ code: "DB_ERROR", message: String(err) })),
        TE.chain((user) =>
          user === null
            ? TE.left<AppError>({ code: "NOT_FOUND", message: "User not found" })
            : TE.of(user),
        ),
      ),
    ),
  );

const logAction = (msg: string): RTE.ReaderTaskEither<Logger, never, void> =>
  pipe(
    RTE.ask<Logger>(),
    RTE.map(({ logger }) => logger.info(msg)),
  );
```

Look at `findUser`. Its type signature says: "Give me a `Database` in the context, and I will asynchronously return either an `AppError` or a `User`." That is the entire dependency injection contract, enforced by the compiler.

## Composing Services

The key insight is what happens when you chain functions that need *different* contexts. `chainwc` (chain with context widening) merges them automatically:

```typescript
type OrderService = { orderRepo: { findByUserId: (id: string) => Promise<Order[]> } };

const getUserOrders = (userId: string): RTE.ReaderTaskEither<OrderService, AppError, Order[]> =>
  pipe(
    RTE.ask<OrderService>(),
    RTE.chaint(({ orderRepo }) =>
      pipe(
        () => orderRepo.findByUserId(userId),
        TE.tryCatch((err): AppError => ({ code: "DB_ERROR", message: String(err) })),
      ),
    ),
  );

// Compose operations from different modules
const getUserWithOrders = (id: string) =>
  pipe(
    findUser(id),                                // RTE<Database, AppError, User>
    RTE.chainwc((user) =>                        // merges Database & OrderService & Logger
      pipe(
        logAction(`Fetching orders for ${user.name}`),
        RTE.chainwc(() => getUserOrders(user.id)),
        RTE.map((orders) => ({ user, orders })),
      ),
    ),
  );
// Final type: RTE<Database & OrderService & Logger, AppError, { user: User; orders: Order[] }>
```

TypeScript computed the intersection `Database & OrderService & Logger` from the composition. You did not write it. You did not register it. The compiler inferred it from how you composed your functions.

This is compile-time dependency injection. If you forget to provide `orderRepo` when you run this pipeline, the compiler rejects it. Not at runtime — at build time.

## Providing Dependencies

`RTE.provide` satisfies part of the context, removing those keys from the type:

```typescript
const program = getUserWithOrders("123");
// RTE<Database & OrderService & Logger, AppError, { user: User; orders: Order[] }>

const withLogger = pipe(
  program,
  RTE.provide({ logger: { info: console.log } }),
);
// RTE<Database & OrderService, AppError, { user: User; orders: Order[] }>

const withDb = pipe(
  withLogger,
  RTE.provide({ db: createDb() }),
);
// RTE<OrderService, AppError, { user: User; orders: Order[] }>

const fullyProvided = pipe(
  withDb,
  RTE.provide({ orderRepo: createOrderRepo() }),
);
// RTE<{}, AppError, { user: User; orders: Order[] }>
```

Each `provide` call narrows the `R` type. When `R` reaches `{}`, all dependencies are satisfied and you can run the pipeline.

For async dependency creation, use `provideTE`:

```typescript
const createDbPool = (): TE.TaskEither<AppError, Database> =>
  pipe(
    () => Pool.create({ host: "localhost", max: 10 }),
    TE.tryCatch((err): AppError => ({ code: "POOL_ERROR", message: String(err) })),
    TE.map((pool) => ({ db: { findUser: (id) => pool.query("SELECT ...") } })),
  );

const withDb = pipe(
  program,
  RTE.provideTE(createDbPool()),
);
```

When a dependency itself depends on another part of the context, use `provideRTE`:

```typescript
type Config = { config: { dbConnectionString: string } };

const withDbFromConfig = pipe(
  program,
  RTE.provideRTE((ctx: Config) =>
    pipe(
      RTE.of(ctx),
      RTE.chaint((c) =>
        pipe(
          () => Pool.create(c.config.dbConnectionString),
          TE.tryCatch((err): AppError => ({ code: "POOL_ERROR", message: String(err) })),
        ),
      ),
      RTE.map((pool) => ({ db: pool })),
    ),
  ),
);
// Database is provided, but Config is now required
```

### Running at the Boundary

At the edge of your application — an HTTP handler, a CLI command, a test — you provide the full context and execute:

```typescript
import * as E from "@oofp/core/either";

app.get("/users/:id/orders", async (req, res) => {
  const result = await pipe(
    getUserWithOrders(req.params.id),
    RTE.run({
      db: appDb,
      orderRepo: appOrderRepo,
      logger: appLogger,
    }),
  )();

  pipe(
    result,
    E.fold(
      (err) => res.status(err.code === "NOT_FOUND" ? 404 : 500).json({ error: err.message }),
      (data) => res.status(200).json(data),
    ),
  );
});
```

## Testing

This is where the Reader pattern delivers the biggest practical win. Testing a function that uses `ReaderTaskEither` means providing a plain object with mock implementations. That is it.

```typescript
import { describe, it, expect, vi } from "vitest";
import * as E from "@oofp/core/either";

describe("findUser", () => {
  it("returns the user when found", async () => {
    const mockDb = {
      findUser: vi.fn().mockResolvedValue({ id: "1", name: "Alice", email: "alice@test.com" }),
    };

    const result = await pipe(
      findUser("1"),
      RTE.run({ db: mockDb }),
    )();

    expect(E.isRight(result)).toBe(true);
    expect(mockDb.findUser).toHaveBeenCalledWith("1");
  });

  it("returns NOT_FOUND when user is null", async () => {
    const mockDb = { findUser: vi.fn().mockResolvedValue(null) };

    const result = await pipe(
      findUser("999"),
      RTE.run({ db: mockDb }),
    )();

    expect(result).toEqual(E.left({ code: "NOT_FOUND", message: "User not found" }));
  });
});

describe("getUserWithOrders", () => {
  it("composes user and order lookups", async () => {
    const result = await pipe(
      getUserWithOrders("1"),
      RTE.run({
        db: { findUser: vi.fn().mockResolvedValue({ id: "1", name: "Alice" }) },
        orderRepo: { findByUserId: vi.fn().mockResolvedValue([{ id: "o1", total: 50 }]) },
        logger: { info: vi.fn() },
      }),
    )();

    expect(E.isRight(result)).toBe(true);
  });
});
```

Compare this with the NestJS testing equivalent:

```typescript
// NestJS testing setup
const module = await Test.createTestingModule({
  providers: [
    UserService,
    { provide: UserRepository, useValue: mockUserRepo },
    { provide: "Logger", useValue: mockLogger },
    { provide: "Database", useValue: mockDb },
  ],
}).compile();

const service = module.get<UserService>(UserService);
const result = await service.getUser("1");
```

The NestJS version requires importing `Test` from `@nestjs/testing`, creating a module, registering providers, compiling the module, and resolving the service. The Reader version calls a function with an object.

## Why This Beats IoC Containers

- **No runtime overhead.** No container instantiation, no reflection, no metadata emission. `ReaderTaskEither` compiles down to plain function calls.
- **Tree-shakeable.** Everything is functions and types. Bundlers eliminate unused code normally.
- **Type-safe at compile time.** If you forget to provide a dependency, the compiler tells you. Not a runtime error — a red squiggle in your editor before you save the file.
- **No decorators or metadata.** No `emitDecoratorMetadata` in your tsconfig. No `reflect-metadata` import. No experimental features.
- **Works everywhere.** Browser, Node, Deno, Bun, Cloudflare Workers. No environment-specific runtime requirements.
- **Dependencies are explicit.** Every function's signature declares exactly what it needs. Read the type, know the contract.
- **Testing is trivial.** Provide a plain object with mocks. No container setup, no module configuration, no `@Injectable()`.
- **Incremental adoption.** You can use `ReaderTaskEither` in one module without converting your entire codebase. It composes with existing code.

## Getting Started

Install the library:

```bash
npm install @oofp/core
```

Start with these resources:

- [ReaderTaskEither reference](/core/reader-task-either/) — full API documentation
- [Dependency injection guide](/guides/dependency-injection/) — patterns for structuring applications
- [Reader reference](/core/reader/) — the synchronous building block

The pattern scales from a single function to an entire application architecture. Start by replacing one service class with a function that returns `ReaderTaskEither`. Chain it with another. Watch the compiler infer your dependency graph. You will not go back to decorators.
