# @oofp/core

## 0.3.0

### Minor Changes

- 9447ef1: Improve error-type inference in `chain` / `chainw` pipelines: `TE.of` and `RTE.of` default `E` to `never` (still overridable explicitly). `TE.right` is decoupled from `of` and keeps an open error channel for `Either` semantics.

  **Breaking:** generic order for `of` is now `<A, E = never>` (`TaskEither`) and `<R, A, E = never>` (`ReaderTaskEither`). Update call sites from `of<E, A>` / `of<R, E, A>` to the new order (e.g. `RTE.of<R, A>` instead of `RTE.of<R, never, A>`).

  Adds Vitest type tests for `chain` / `chainw` mixing in `pipe`.

## Unreleased

### Minor Changes

- **`TE.of` / `RTE.of`:** default error type `E` to `never` so success steps in `chain` / `chainw` no longer widen the pipeline to `unknown` when `of` is used without explicit generics (still overridable).
- **`TE.right`:** decoupled from `of`; keeps open `E` for `Either` right-branch semantics. `RTE.right` delegates to `TE.right`.
- **Breaking:** generic parameter order for `of` is `<A, E = never>` (`TaskEither`) and `<R, A, E = never>` (`ReaderTaskEither`). Migrate e.g. `RTE.of<R, never, A>(x)` → `RTE.of<R, A>(x)`.
- Add type tests (`*.chain.types.test.ts`) and Vitest typecheck config for chain error/context inference in `pipe`.

## 0.2.0

### Minor Changes

- Add missing exports: ./error, ./ref, ./bi-compose, and complete ./function with runtime bundles
