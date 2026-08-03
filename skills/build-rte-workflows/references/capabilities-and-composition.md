# Capabilities and composition

## Design narrow capabilities

Declare behavior the use case needs, not an entire infrastructure client.

```typescript
type ClockContext = {
  clock: { now: () => Date };
};

type SaveOrderContext = {
  orders: {
    save: (order: Order) => TE.TaskEither<SaveOrderError, Order>;
  };
};
```

This makes dependencies visible, enables structural composition, and keeps test doubles trivial.

## Merge contexts only when necessary

```typescript
const placeOrder = (input: PlaceOrderInput) =>
  pipe(
    validateOrder(input),
    TE.fromEither,
    RTE.from<SaveOrderContext, ValidationError, ValidOrder>,
    RTE.chainwc((valid) => buildOrder(valid)), // requires ClockContext
    RTE.chaint((order) => saveOrder(order)),
  );
```

The resulting context is the intersection of the contexts required by the composed steps. Prefer `RTE.chain` when both steps already share one context; use `chainwc` for different contexts.

Often it is clearer to start with `RTE.ask` and call capabilities directly:

```typescript
const saveOrder = (order: Order) =>
  pipe(
    RTE.ask<SaveOrderContext>(),
    RTE.chaint(({ orders }) => orders.save(order)),
  );
```

## Provide partial context

Use `RTE.provide` to bind stable configuration or one capability while leaving the rest injectable.

```typescript
const configured = pipe(
  program,
  RTE.provide({ clock: systemClock }),
);
```

Use `provideTE` when constructing a dependency can fail asynchronously without needing the current context. Use `provideRTE` or `provideF` when its construction also depends on existing context.

## Service factories

When several operations share dependencies, a Reader factory can build a record of functions. Keep the produced methods effectful and lazy.

```typescript
import * as R from "@oofp/core/reader";

const UserService = pipe(
  R.ask<UserContext>(),
  R.map((ctx) => ({
    getById: (id: string) => ctx.users.findById(id),
    save: (user: User) => ctx.users.save(user),
  })),
);
```

Prefer direct capabilities when the factory adds no behavior. Use a factory when it meaningfully groups, decorates, or derives operations.
