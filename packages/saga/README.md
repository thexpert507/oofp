# @oofp/saga

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@oofp/saga.svg?style=flat)](https://www.npmjs.com/package/@oofp/saga)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0+-blue.svg)](https://www.typescriptlang.org/)

Saga pattern for distributed transactions with automatic compensations. Define multi-step operations where each step has an action and an optional rollback -- if any step fails, all previously completed steps are compensated in reverse order (LIFO). Built on `@oofp/core` using `ReaderTaskEither`.

## Installation

```bash
npm install @oofp/saga
# or
pnpm add @oofp/saga
```

Peer dependencies: `@oofp/core`

## Quick Start

```typescript
import { step, chain, run } from '@oofp/saga'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as E from '@oofp/core/either'

interface Deps {
  db: Database
  auth: AuthService
}

// Step 1: Create user in database
const createUser = step<Deps, Error, User>({
  name: 'create-user',
  action: ({ db }) => async () => {
    const user = await db.users.create({ name: 'Alice' })
    return E.right(user)
  },
  compensate: (user) => ({ db }) => async () => {
    await db.users.delete(user.id)
    return E.right(undefined)
  },
})

// Step 2: Register in auth system
const registerAuth = (user: User) =>
  step<Deps, Error, AuthIdentity>({
    name: 'register-auth',
    action: ({ auth }) => async () => {
      const identity = await auth.register(user.email)
      return E.right(identity)
    },
    compensate: (identity) => ({ auth }) => async () => {
      await auth.delete(identity.uid)
      return E.right(undefined)
    },
  })

// Compose and run
const result = await pipe(
  createUser,
  chain(registerAuth),
  run,
  RTE.run({ db, auth }),
)()

if (E.isRight(result)) {
  console.log('Success:', result.value)
} else {
  console.error('Failed (all steps rolled back):', result.value)
}
```

## How It Works

1. **`step()`** creates a saga step with a forward `action` and an optional `compensate` function
2. **`chain()`** sequences steps, threading the result of one step into the next. Contexts (`R`) are intersected, errors (`E`) are unioned
3. **`run()`** executes the saga:
   - If all steps succeed, returns the final result
   - If any step fails, runs all previously registered compensations in **reverse order** (last completed step is compensated first), then returns the original error

## API Reference

### `step(config)`

Creates an initial saga step.

```typescript
function step<R, E, A>(config: SagaStepConstructor<R, E, A>): SagaStep<R, E, A>

type SagaStepConstructor<R, E, A> = {
  name: string
  action: RTE.ReaderTaskEither<R, E, A>
  compensate?: (result: A) => RTE.ReaderTaskEither<R, E, void>
}
```

- `name` -- Identifier for the step (useful for logging/debugging)
- `action` -- The forward operation as a `ReaderTaskEither`
- `compensate` -- Optional rollback function that receives the action's result and returns a compensation `ReaderTaskEither`

### `chain(fn)`

Sequences saga steps, passing the previous result to a function that returns the next step.

```typescript
function chain<R2, E2, A, B>(
  fn: (a: A) => SagaStep<R2, E2, B>,
): <R1, E1>(prev: SagaStep<R1, E1, A>) => SagaStep<R1 & R2, E1 | E2, B>
```

- Context types are intersected: `R1 & R2`
- Error types are unioned: `E1 | E2`
- If the previous step failed, the chained step is skipped

### `run(saga)`

Executes the composed saga and handles compensation on failure.

```typescript
function run<R, E, A>(
  saga: SagaStep<R, E, A>,
): RTE.ReaderTaskEither<R, E | Error, A>
```

- On success: returns the final step's result
- On failure: runs all compensations in reverse order, then returns the error

### Namespace Export

All three functions are also available as a namespace:

```typescript
import { Saga } from '@oofp/saga'

Saga.step(...)
Saga.chain(...)
Saga.run(...)
```

## Examples

### Multi-Step Transaction with Partial Failure

```typescript
const createOrder = step<Deps, Error, Order>({
  name: 'create-order',
  action: ({ db }) => async () => E.right(await db.orders.create(orderData)),
  compensate: (order) => ({ db }) => async () => {
    await db.orders.delete(order.id)
    return E.right(undefined)
  },
})

const chargePayment = (order: Order) =>
  step<Deps, Error, Payment>({
    name: 'charge-payment',
    action: ({ payments }) => async () => E.right(await payments.charge(order.total)),
    compensate: (payment) => ({ payments }) => async () => {
      await payments.refund(payment.id)
      return E.right(undefined)
    },
  })

const sendConfirmation = (payment: Payment) =>
  step<Deps, Error, void>({
    name: 'send-confirmation',
    action: ({ email }) => async () => {
      await email.send('Order confirmed')
      return E.right(undefined)
    },
    // No compensate -- emails can't be unsent
  })

const saga = pipe(
  createOrder,
  chain(chargePayment),
  chain(sendConfirmation),
  run,
)

// If sendConfirmation fails:
//   1. chargePayment is compensated (refund)
//   2. createOrder is compensated (delete order)
//   3. Original error is returned
```

### Steps Without Compensation

Steps without a `compensate` function are simply skipped during rollback:

```typescript
const logAction = step({
  name: 'log-action',
  action: ({ logger }) => async () => {
    logger.info('Action started')
    return E.right('logged')
  },
  // No compensate -- log entries don't need rollback
})
```

## Type Safety

The saga system provides full type safety:

- **Context intersection**: Chaining steps with different context requirements produces the union of all required dependencies
- **Error union**: All possible error types are tracked across the chain
- **Result threading**: Each step receives the correctly typed result of the previous step

```typescript
// TypeScript infers:
// - Context: DepsA & DepsB & DepsC
// - Error: ErrorA | ErrorB | ErrorC
// - Result: ResultC (from the last step)
const saga = pipe(
  stepA,           // SagaStep<DepsA, ErrorA, ResultA>
  chain(fnB),      // SagaStep<DepsA & DepsB, ErrorA | ErrorB, ResultB>
  chain(fnC),      // SagaStep<DepsA & DepsB & DepsC, ErrorA | ErrorB | ErrorC, ResultC>
  run,
)
```

## Testing

```bash
pnpm --filter @oofp/saga test
```

## License

This project is licensed under the [MIT License](./LICENSE).
