# @oofp/react

> **Experimental** -- This package is in early development. The API may change without notice.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@oofp/react.svg?style=flat)](https://www.npmjs.com/package/@oofp/react)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Functional React component model using Reader monads from `@oofp/core`. Separates dependency injection (context) from component props, with support for both stateless and stateful components.

## Installation

```bash
npm install @oofp/react
# or
pnpm add @oofp/react
```

Peer dependencies:

- `@oofp/core`
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

## Concept

A `Component<C, P>` is defined as `Reader<C, Fn<P, ReactNode>>` -- a function that first receives a context `C` (dependencies), then props `P`, and returns a `ReactNode`. This cleanly separates:

- **Context (`C`)**: Services, API clients, configuration -- injected once
- **Props (`P`)**: Data that changes per render -- passed by the parent

## Quick Start

### Stateless Component

```typescript
import { component, context, props, Render } from '@oofp/react'

// Define context and props types
interface AppServices {
  api: ApiClient
  logger: Logger
}

interface UserCardProps {
  userId: string
  showEmail: boolean
}

// Create the component
const UserCard = component<AppServices, never, UserCardProps, never>({
  type: 'stateless',
  ctx: context<AppServices>(),
  props: props<UserCardProps>(),
  render: ({ ctx, props }) => (
    <div>
      <h2>User: {props.userId}</h2>
      {props.showEmail && <p>Loading email via {ctx.api.name}...</p>}
    </div>
  ),
})

// Use with Render helper
function App() {
  const services: AppServices = { api: myApiClient, logger: console }

  return (
    <Render
      component={UserCard}
      context={services}
      props={{ userId: '123', showEmail: true }}
    />
  )
}
```

### Stateful Component

```typescript
import { component, context, props, action, iaction, Render } from '@oofp/react'

interface CounterState {
  count: number
  label: string
}

// Pure action (immutable state transformation)
const increment = action<number, CounterState>(
  (amount) => (state) => ({ ...state, count: state.count + amount }),
)

// Immer-based action (mutable draft)
const setLabel = iaction<string, CounterState>(
  (newLabel) => (draft) => { draft.label = newLabel },
)

const Counter = component<{}, CounterState, {}, typeof actions>({
  type: 'stateful',
  initialState: { count: 0, label: 'Counter' },
  actions: { increment, setLabel },
  render: ({ state, mut: [dispatch, actions] }) => (
    <div>
      <h3>{state.label}: {state.count}</h3>
      <button onClick={() => dispatch(actions.increment(1))}>+1</button>
      <button onClick={() => dispatch(actions.setLabel('Updated'))}>Rename</button>
    </div>
  ),
})

const actions = { increment, setLabel }

function App() {
  return <Render component={Counter} context={{}} props={{}} />
}
```

## API Reference

### `component(config)`

Main factory function that creates a `Component<C, P>`.

**Stateless config:**

```typescript
component<C, never, P, never>({
  type: 'stateless',
  ctx?: Identity<C>,       // Created via context<C>()
  props?: Identity<P>,     // Created via props<P>()
  render: (ctx: StatelessContext<C, P>) => ReactNode,
})
```

**Stateful config:**

```typescript
component<C, S, P, A extends Actions<S>>({
  type: 'stateful',
  ctx?: Identity<C>,
  props?: Identity<P>,
  initialState: S,
  actions: A,
  render: (ctx: StatefulContext<C, S, P, A>) => ReactNode,
})
```

### `context<C>()`

Creates an identity token for the context type `C`. Used for type inference in `component()` config.

### `props<P>()`

Creates an identity token for the props type `P`. Used for type inference in `component()` config.

### `action<P, S>(fn)`

Creates a pure (immutable) state action. The function receives a payload `P` and returns a state transformation `S => S`.

```typescript
const increment = action<number, CounterState>(
  (amount) => (state) => ({ ...state, count: state.count + amount }),
)
```

### `iaction<P, S>(fn)`

Creates an Immer-based (mutable draft) state action. The function receives a payload `P` and returns a mutation function applied via `produce`.

```typescript
const addItem = iaction<string, TodoState>(
  (text) => (draft) => { draft.items.push({ text, done: false }) },
)
```

### `Render<C, P>`

React component that bridges `Component<C, P>` into the React tree.

```typescript
<Render
  component={MyComponent}  // Component<C, P>
  context={myContext}       // C
  props={myProps}           // P
/>
```

### Types

```typescript
// The core type: a Reader that takes context and returns a function from props to ReactNode
type Component<C, P> = R.Reader<C, Fn<P, ReactNode>>

// Context provided to stateless render functions
type StatelessContext<C, P> = {
  type: 'stateless'
  ctx: C
  props: P
}

// Context provided to stateful render functions
type StatefulContext<C, S, P, A extends Actions<S>> = {
  type: 'stateful'
  ctx: C
  props: P
  state: S
  mut: [Dispatch<S>, A]
}

// State action type
type Action<S> = (payload?: any) => S.State<S, void>
type Actions<S> = Record<string, Action<S>>
type Dispatch<S> = Fn<S.State<S, void>, void>
```

## Design Rationale

| Aspect | Traditional React | @oofp/react |
|--------|------------------|-------------|
| Dependencies | `useContext`, prop drilling | Reader monad context `C` |
| Props | Single props object | Separated from dependencies |
| State | `useState` / `useReducer` | State monad with `action` / `iaction` |
| Composition | HOCs, hooks | Monadic composition via `pipe` |

## Testing

This package currently has no tests. Contributions welcome.

```bash
pnpm --filter @oofp/react test
```

## License

This project is licensed under the [MIT License](./LICENSE).
