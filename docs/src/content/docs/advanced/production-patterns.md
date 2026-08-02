---
title: "Production Patterns"
description: "Real-world patterns for building applications with OOFP."
---

This page covers six patterns that appear repeatedly in production applications built with OOFP. Each pattern addresses a specific architectural need — from creating services to bridging with React Query.

For a cohesive, runnable backend example rather than isolated patterns, start with [Opinionated Backend Architecture](/guides/opinionated-backend-architecture/).

---

## 1. Service Factory with Reader

Use `Reader` to define a service that depends on a context. The service is constructed lazily when the context is provided.

```typescript
import * as R from "@oofp/core/reader";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Define the context your service needs
interface DbContext {
  db: {
    query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
    execute: (sql: string, params?: unknown[]) => Promise<void>;
  };
}

// Build the service as a Reader — it's a function from context to API
const UserService = R.asks((ctx: DbContext) => ({
  findById: (id: string): TE.TaskEither<Error, User> =>
    TE.tryCatch(
      () => ctx.db.query<User>("SELECT * FROM users WHERE id = $1", [id])
        .then((rows) => rows[0]),
      (err) => new Error(`User query failed: ${err}`),
    ),

  findAll: (): TE.TaskEither<Error, User[]> =>
    TE.tryCatch(
      () => ctx.db.query<User>("SELECT * FROM users"),
      (err) => new Error(`Users query failed: ${err}`),
    ),

  create: (data: CreateUserDto): TE.TaskEither<Error, User> =>
    TE.tryCatch(
      () => ctx.db.query<User>(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
        [data.name, data.email],
      ).then((rows) => rows[0]),
      (err) => new Error(`User creation failed: ${err}`),
    ),
}));

// Provide context at the boundary
const userService = UserService({ db: myDatabasePool });
const users = await userService.findAll()();
```

This pattern keeps your service definitions pure and testable — swap the context for a mock in tests.

---

## 2. Use-Case with RTE.ask()

`RTE.ask()` lets you access the context anywhere inside an RTE pipeline. This is the standard pattern for use-cases that need multiple dependencies.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

interface AppContext {
  userRepo: { findById: (id: string) => Promise<User> };
  emailService: { sendWelcome: (email: string) => Promise<void> };
  logger: { info: (msg: string) => void };
}

const activateUser = (
  userId: string,
): RTE.ReaderTaskEither<AppContext, Error, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.userRepo.findById(userId),
        (err) => new Error(`User not found: ${err}`),
      ),
    ),
    RTE.tap((user) => console.log(`Activating ${user.name}`)),
    RTE.chainwc((user) =>
      pipe(
        RTE.ask<AppContext>(),
        RTE.chaint((ctx) =>
          TE.tryCatch(
            () => ctx.emailService.sendWelcome(user.email),
            (err) => new Error(`Email failed: ${err}`),
          ),
        ),
        RTE.map(() => user),
      ),
    ),
  );

// Execute at the boundary
const result = await pipe(
  activateUser("user-42"),
  RTE.run({
    userRepo: myUserRepo,
    emailService: myEmailService,
    logger: myLogger,
  }),
)();
```

---

## 3. Orchestration with RTE.chainwc()

`chainwc` (chain with context widening) merges the context types of two RTEs. This is how you compose operations that depend on different services without manually threading contexts.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// Each operation declares its own context
interface PaymentContext {
  payments: { charge: (amount: number, userId: string) => Promise<Receipt> };
}

interface InventoryContext {
  inventory: { reserve: (items: Item[]) => Promise<Reservation> };
}

interface NotificationContext {
  notifications: { send: (userId: string, msg: string) => Promise<void> };
}

const chargePayment = (
  userId: string,
  amount: number,
): RTE.ReaderTaskEither<PaymentContext, Error, Receipt> =>
  pipe(
    RTE.ask<PaymentContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.payments.charge(amount, userId),
        (err) => new Error(`Payment failed: ${err}`),
      ),
    ),
  );

const reserveItems = (
  items: Item[],
): RTE.ReaderTaskEither<InventoryContext, Error, Reservation> =>
  pipe(
    RTE.ask<InventoryContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.inventory.reserve(items),
        (err) => new Error(`Reservation failed: ${err}`),
      ),
    ),
  );

const notifyUser = (
  userId: string,
  message: string,
): RTE.ReaderTaskEither<NotificationContext, Error, void> =>
  pipe(
    RTE.ask<NotificationContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.notifications.send(userId, message),
        (err) => new Error(`Notification failed: ${err}`),
      ),
    ),
  );

// Orchestrate — contexts merge automatically
const placeOrder = (order: Order) =>
  pipe(
    chargePayment(order.userId, order.total),
    // PaymentContext
    RTE.chainwc((receipt) => reserveItems(order.items)),
    // PaymentContext & InventoryContext
    RTE.chainwc((reservation) =>
      notifyUser(order.userId, `Order confirmed: ${reservation.id}`),
    ),
    // PaymentContext & InventoryContext & NotificationContext
  );

// At the boundary, provide ALL required contexts
const result = await pipe(
  placeOrder(myOrder),
  RTE.run({
    payments: stripeClient,
    inventory: warehouseClient,
    notifications: pushService,
  }),
)();
```

TypeScript infers the merged context type. If you forget a dependency, you get a compile-time error.

---

## 4. RTE to React Query Bridge

Bridge OOFP use-cases to React Query (TanStack Query) by converting an RTE pipeline to a `Promise`.

```typescript
import { flow } from "@oofp/core/flow";
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { useQuery, useMutation } from "@tanstack/react-query";

// Your use-case
const fetchUser = (
  id: string,
): RTE.ReaderTaskEither<AppContext, Error, User> =>
  pipe(
    RTE.ask<AppContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.userRepo.findById(id),
        (err) => new Error(`Not found: ${err}`),
      ),
    ),
  );

// Bridge: RTE → TaskEither → Promise
const runUseCase = <A>(
  rte: RTE.ReaderTaskEither<AppContext, Error, A>,
): Promise<A> =>
  pipe(
    rte,
    RTE.run(appContext),     // provide context → TaskEither
    TE.toPromise,            // TaskEither → Promise (rejects on Left)
  )();

// In React components
const useUser = (id: string) =>
  useQuery({
    queryKey: ["users", id],
    queryFn: () => runUseCase(fetchUser(id)),
  });

// For mutations
const useCreateUser = () =>
  useMutation({
    mutationFn: (data: CreateUserDto) =>
      runUseCase(createUser(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
```

You can also create a reusable bridge with `flow`:

```typescript
const toQueryFn = <A>(
  useCase: RTE.ReaderTaskEither<AppContext, Error, A>,
) => flow(
  () => useCase,
  RTE.run(appContext),
  TE.toPromise,
);
```

---

## 5. Dynamic Context with RTE.provideRTE()

When a dependency must be constructed asynchronously — or computed from other parts of the context — use `provideRTE`. It lets you build context dynamically before passing it to the pipeline that needs it.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";

// The pipeline needs a DbPool
interface DbPool {
  pool: { query: (sql: string) => Promise<unknown[]> };
}

// But we only have a Config at the boundary
interface Config {
  dbConnectionString: string;
}

// Pipeline that uses the pool
const fetchOrders: RTE.ReaderTaskEither<DbPool, Error, Order[]> =
  pipe(
    RTE.ask<DbPool>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.pool.query("SELECT * FROM orders") as Promise<Order[]>,
        (err) => new Error(`Query failed: ${err}`),
      ),
    ),
  );

// provideRTE: build DbPool from Config dynamically
const fetchOrdersFromConfig = pipe(
  fetchOrders,                                   // RTE<DbPool, Error, Order[]>
  RTE.provideRTE((config: Config) =>             // access current context
    pipe(
      RTE.of(config),
      RTE.chaint((c) =>
        TE.tryCatch(
          () => createConnectionPool(c.dbConnectionString),
          (err) => new Error(`Pool creation failed: ${err}`),
        ),
      ),
      RTE.map((pool) => ({ pool })),             // shape as DbPool
    ),
  ),
  // Result: RTE<Config, Error, Order[]>
);

// Now only Config is needed at the boundary
const result = await pipe(
  fetchOrdersFromConfig,
  RTE.run({ dbConnectionString: "postgres://localhost/mydb" }),
)();
```

This pattern is useful for:

- Creating database connections on demand
- Fetching auth tokens before making API calls
- Building services that depend on configuration resolved at runtime

---

## 6. Parallel Operations with Concurrency

`RTE.concurrency` runs multiple RTEs with bounded concurrency and optional delays between launches. This is critical for batch operations that would overwhelm external services if run all at once.

```typescript
import * as RTE from "@oofp/core/reader-task-either";
import * as E from "@oofp/core/either";
import { pipe } from "@oofp/core/pipe";

interface ApiContext {
  api: { fetchUser: (id: string) => Promise<User> };
}

const fetchUser = (
  id: string,
): RTE.ReaderTaskEither<ApiContext, Error, User> =>
  pipe(
    RTE.ask<ApiContext>(),
    RTE.chaint((ctx) =>
      TE.tryCatch(
        () => ctx.api.fetchUser(id),
        (err) => new Error(`Fetch failed: ${err}`),
      ),
    ),
  );

const userIds = Array.from({ length: 200 }, (_, i) => `user-${i}`);

// Bounded concurrency — 50 at a time, 10ms between launches
const fetchAllUsers = pipe(
  userIds.map(fetchUser),
  RTE.concurrency({ concurrency: 50, delay: 10 }),
  // RTE<ApiContext, Error, User[]>
  RTE.tap((users) => console.log(`Fetched ${users.length} users`)),
);

// Object variant — named results
const fetchDashboard = pipe(
  {
    users: fetchAllUsers,
    orders: fetchAllOrders,
    metrics: fetchMetrics,
  },
  RTE.concurrencyObject({ concurrency: 3 }),
  RTE.map(({ users, orders, metrics }) =>
    buildDashboard(users, orders, metrics),
  ),
);

// Settled — never fails, returns Either[] per result
const fetchBestEffort = pipe(
  userIds.map(fetchUser),
  RTE.concurrentSettled(),
  // RTE<ApiContext, never, Either<Error, User>[]>
  RTE.map((results) => {
    const succeeded = results.filter(E.isRight).map((r) => r.right);
    const failed = results.filter(E.isLeft).map((r) => r.left);
    console.log(`${succeeded.length} ok, ${failed.length} failed`);
    return succeeded;
  }),
);
```

### Concurrency options

| Option | Type | Description |
|--------|------|-------------|
| `concurrency` | `number` | Maximum number of RTEs running at the same time |
| `delay` | `number` | Milliseconds to wait between launching each RTE |

### Variants

| Function | Fails on first error? | Returns |
|----------|----------------------|---------|
| `RTE.sequence` | Yes | `RTE<R, E, A[]>` — sequential |
| `RTE.concurrency` | Yes | `RTE<R, E, A[]>` — bounded parallel |
| `RTE.concurrencyObject` | Yes | `RTE<R, E, Record<string, A>>` |
| `RTE.concurrentSettled` | Never | `RTE<R, never, Either<E, A>[]>` |
