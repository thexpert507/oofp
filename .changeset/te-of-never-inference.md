---
"@oofp/core": minor
---

Improve error-type inference in `chain` / `chainw` pipelines: `TE.of` and `RTE.of` default `E` to `never` (still overridable explicitly). `TE.right` is decoupled from `of` and keeps an open error channel for `Either` semantics.

**Breaking:** generic order for `of` is now `<A, E = never>` (`TaskEither`) and `<R, A, E = never>` (`ReaderTaskEither`). Update call sites from `of<E, A>` / `of<R, E, A>` to the new order (e.g. `RTE.of<R, A>` instead of `RTE.of<R, never, A>`).

Adds Vitest type tests for `chain` / `chainw` mixing in `pipe`.
