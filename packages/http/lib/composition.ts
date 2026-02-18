// @oofp/http - Composition
// Capa 3: Retry, timeout, validation

import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as TE from '@oofp/core/task-either'
import type { HttpError } from './primitives'
import { HttpError as HttpErrorConstructor } from './primitives'

// ============= RETRY =============

export type RetryConfig = {
  maxRetries: number
  delay?: number
  skipIf?: (error: HttpError) => boolean
  onError?: (error: HttpError, attempt: number) => void
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const retry =
  <R, A>(config: RetryConfig) =>
  (rte: RTE.ReaderTaskEither<R, HttpError, A>): RTE.ReaderTaskEither<R, HttpError, A> =>
  (ctx: R) => {
    const execute = (attempt: number): TE.TaskEither<HttpError, A> =>
      pipe(
        rte(ctx),
        TE.chainLeft((error) => {
          if (config.onError) {
            config.onError(error, attempt)
          }

          if (config.skipIf && config.skipIf(error)) {
            return TE.left(error)
          }

          if (attempt >= config.maxRetries) {
            return TE.left(error)
          }

          return pipe(
            TE.tryCatch((e: unknown) => HttpErrorConstructor.fromError(e, 'retry-delay', 'GET'))(() =>
              sleep(config.delay || 1000),
            ),
            TE.chain(() => execute(attempt + 1)),
          )
        }),
      )

    return execute(1)
  }

// ============= TIMEOUT =============

export const withTimeoutTE =
  (timeout: number) =>
  <E, A>(te: TE.TaskEither<E, A>): TE.TaskEither<E | HttpError, A> =>
  () => {
    const timeoutPromise = new Promise<E.Either<E | HttpError, A>>((resolve) =>
      setTimeout(
        () =>
          resolve(
            E.left(
              HttpErrorConstructor.of({
                endpoint: 'timeout',
                method: 'GET',
                message: 'Request timeout',
                cause: new Error('Timeout'),
              }),
            ),
          ),
        timeout,
      ),
    )

    return Promise.race([te(), timeoutPromise])
  }

// ============= VALIDATION =============

export type ValidationSchema<T> = {
  validate: (data: unknown) => E.Either<string, T>
}

export const validate =
  <T>(schema: ValidationSchema<T>) =>
  (data: unknown): E.Either<HttpError, T> =>
    pipe(
      schema.validate(data),
      E.mapLeft((message) =>
        HttpErrorConstructor.of({
          endpoint: 'validation',
          method: 'GET',
          message: `Validation failed: ${message}`,
          cause: data,
        }),
      ),
    )

// ============= TAP (LOGGING/SIDE EFFECTS) =============

export const tap =
  <R, E, A>(fn: (value: A) => void) =>
  (rte: RTE.ReaderTaskEither<R, E, A>): RTE.ReaderTaskEither<R, E, A> =>
    pipe(rte, RTE.tap(fn))

export const tapLeft =
  <R, E, A>(fn: (error: E) => void) =>
  (rte: RTE.ReaderTaskEither<R, E, A>): RTE.ReaderTaskEither<R, E, A> =>
    pipe(rte, RTE.tapLeft(fn))
