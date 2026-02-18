---
title: "@oofp/react"
description: "React hooks for functional patterns (experimental)."
---

:::caution[Experimental]
`@oofp/react` is experimental and unstable. The API may change significantly between versions. Use in production at your own risk.
:::

`@oofp/react` provides utilities for bridging OOFP functional patterns into the React component lifecycle. It models components as `Reader` monads, separating dependency injection from rendering.

```bash
pnpm add @oofp/react
```

**License:** MIT | **Peer dependencies:** `@oofp/core`, `react` (18 or 19), `react-dom` (18 or 19) | **Runtime dependency:** `immer`

---

## Concept

In `@oofp/react`, a component is modeled as a `Reader` that receives a context and returns a function from props to `ReactNode`:

```typescript
type Component<C, P> = Reader<C, (props: P) => ReactNode>;
```

This separates **what a component needs** (context `C`) from **what it renders** (props `P`), enabling:

- Type-safe dependency injection via Reader
- Context inference with `ICC<C>` (Infer Component Context) and `ICP<C>` (Infer Component Props)
- Composition of components that share or extend contexts

---

## Modules

| Module | Description |
|--------|-------------|
| `Component` | Core `Component<C, P>` type and inference utilities (`ICC`, `ICP`) |
| `Context` | Context creation and provider utilities |
| `Render` | Rendering bridge — resolve Reader components into React components |
| `Actions` | Action dispatching patterns |
| `config` | Configuration utilities |

---

## Basic Usage

```typescript
import * as R from "@oofp/core/reader";
import type { Component } from "@oofp/react";

interface AppServices {
  api: { fetchUser: (id: string) => Promise<User> };
  logger: { info: (msg: string) => void };
}

// Define a component as a Reader
const UserCard: Component<AppServices, { userId: string }> =
  R.asks((services) => (props) => {
    // Use services and props to render
    return <div>{props.userId}</div>;
  });
```

---

## Status

This package is in early development. It currently provides the foundational types and patterns for Reader-based component architecture. Hooks for bridging `ReaderTaskEither` and `TaskEither` to React component lifecycle (data fetching, mutations, etc.) are planned but not yet stable.

Check the [repository](https://github.com/thexpert507/oofp) for the latest updates.
