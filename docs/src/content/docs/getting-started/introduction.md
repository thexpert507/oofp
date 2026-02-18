---
title: Introduction
description: What is OOFP and why use it for TypeScript functional programming.
---

## What is OOFP?

OOFP (Object-Oriented Functional Programming) is a TypeScript library ecosystem for building type-safe applications using functional programming patterns. It provides algebraic data types, composition utilities, and real-world patterns that scale from small utilities to large production applications.

## The Problem

TypeScript applications commonly suffer from:

- **Untyped errors** — `try-catch` loses type information about what can go wrong
- **Implicit dependencies** — Functions reach into global state or closures for their dependencies
- **Nullable chaos** — `null` and `undefined` propagate silently through code
- **Callback hell** — Async operations become deeply nested and hard to follow

## The Solution

OOFP provides algebraic data types that make these problems impossible:

| Problem | OOFP Solution | Type |
|---------|--------------|------|
| Nullable values | **Maybe** — values that may or may not exist | `Maybe<A>` |
| Operations that can fail | **Either** — typed success or failure | `Either<E, A>` |
| Async operations | **Task** — lazy async computation | `Task<A>` |
| Async + failure | **TaskEither** — async that can fail | `TaskEither<E, A>` |
| Dependency injection | **Reader** — function that needs context | `Reader<R, A>` |
| DI + async + failure | **ReaderTaskEither** — the ultimate monad | `RTE<R, E, A>` |

## Design Principles

1. **Type safety first** — No `any`, no type assertions, full inference
2. **Composition over inheritance** — Everything composes with `pipe` and `flow`
3. **Laziness** — Computations describe what to do, not when to do it
4. **Execute at boundaries** — Build pure pipelines, run them at HTTP handlers or CLI entry points
5. **Zero dependencies** — No runtime dependencies, tree-shakeable imports

## Ecosystem

OOFP is a monorepo with 5 packages:

- **[@oofp/core](/packages/core/)** — Foundation: all monads, composition, collections, type classes
- **[@oofp/http](/packages/http/)** — HTTP client built on ReaderTaskEither
- **[@oofp/query](/packages/query/)** — Query cache with TTL and invalidation
- **[@oofp/saga](/packages/saga/)** — Saga pattern for transactional workflows
- **[@oofp/react](/packages/react/)** — React hooks (experimental)

## Inspiration

OOFP is inspired by [fp-ts](https://gcanti.github.io/fp-ts/) and the [Fantasy Land Specification](https://github.com/fantasyland/fantasy-land), with a focus on practical usability and real-world patterns over theoretical purity.
