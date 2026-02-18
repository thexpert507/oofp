import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as TE from '@oofp/core/task-either'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retry, tap, tapLeft, validate, withTimeoutTE } from '../lib/composition'
import type { RetryConfig, ValidationSchema } from '../lib/composition'
import { HttpError } from '../lib/primitives'

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should succeed on first attempt', async () => {
    const successRte: RTE.ReaderTaskEither<unknown, HttpError, string> = () => TE.right('success')

    const retryConfig: RetryConfig = { maxRetries: 3, delay: 100 }
    const result = await pipe(successRte, retry(retryConfig))({})()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe('success')
    }
  })

  it('should retry on failure and succeed', async () => {
    let attempts = 0
    const failTwiceThenSucceed: RTE.ReaderTaskEither<unknown, HttpError, string> = () => () => {
      attempts++
      if (attempts < 3) {
        return Promise.resolve(
          E.left(
            HttpError.of({
              endpoint: '/test',
              method: 'GET',
              message: 'Temporary error',
              cause: null,
            }),
          ),
        )
      }
      return Promise.resolve(E.right('success'))
    }

    const retryConfig: RetryConfig = { maxRetries: 3, delay: 100 }
    const retried = retry(retryConfig)(failTwiceThenSucceed)

    const promise = retried({})()

    // Fast-forward through retries
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(100)

    const result = await promise

    expect(E.isRight(result)).toBe(true)
    expect(attempts).toBe(3)
  })

  it('should fail after maxRetries', async () => {
    const alwaysFail: RTE.ReaderTaskEither<unknown, HttpError, string> = () =>
      TE.left(
        HttpError.of({
          endpoint: '/test',
          method: 'GET',
          message: 'Permanent error',
          cause: null,
        }),
      )

    const retryConfig: RetryConfig = { maxRetries: 2, delay: 50 }
    const retried = retry(retryConfig)(alwaysFail)

    const promise = retried({})()

    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(50)

    const result = await promise

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.message).toBe('Permanent error')
    }
  })

  it('should skip retry based on skipIf condition', async () => {
    const error401 = HttpError.of({
      endpoint: '/test',
      method: 'GET',
      statusCode: 401,
      message: 'Unauthorized',
      cause: null,
    })

    const unauthorizedError: RTE.ReaderTaskEither<unknown, HttpError, string> = () => TE.left(error401)

    const retryConfig: RetryConfig = {
      maxRetries: 3,
      delay: 100,
      skipIf: (err) => HttpError.isUnauthorized(err),
    }

    const result = await pipe(unauthorizedError, retry(retryConfig))({})()

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.statusCode).toBe(401)
    }
  })

  it('should call onError callback on each attempt', async () => {
    const onError = vi.fn()
    let attempts = 0

    const failTwice: RTE.ReaderTaskEither<unknown, HttpError, string> = () => () => {
      attempts++
      if (attempts < 3) {
        return Promise.resolve(
          E.left(
            HttpError.of({
              endpoint: '/test',
              method: 'GET',
              message: 'Error',
              cause: null,
            }),
          ),
        )
      }
      return Promise.resolve(E.right('success'))
    }

    const retryConfig: RetryConfig = { maxRetries: 3, delay: 50, onError }
    const retried = retry(retryConfig)(failTwice)

    const promise = retried({})()

    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(50)

    await promise

    expect(onError).toHaveBeenCalledTimes(2)
  })
})

describe('withTimeoutTE', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should succeed if task completes before timeout', async () => {
    const quickTask: TE.TaskEither<never, string> = () => Promise.resolve(E.right('quick'))

    const result = await withTimeoutTE(1000)(quickTask)()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe('quick')
    }
  })

  it('should timeout if task takes too long', async () => {
    const slowTask: TE.TaskEither<never, string> = () =>
      new Promise((resolve) => setTimeout(() => resolve(E.right('slow')), 2000))

    const promise = withTimeoutTE(1000)(slowTask)()

    await vi.advanceTimersByTimeAsync(1000)

    const result = await promise

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.message).toBe('Request timeout')
    }
  })
})

describe('validate', () => {
  it('should return Right for valid data', () => {
    const schema: ValidationSchema<number> = {
      validate: (data: unknown) => (typeof data === 'number' ? E.right(data) : E.left('Not a number')),
    }

    const result = validate(schema)(42)

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe(42)
    }
  })

  it('should return Left with HttpError for invalid data', () => {
    const schema: ValidationSchema<number> = {
      validate: (data: unknown) => (typeof data === 'number' ? E.right(data) : E.left('Not a number')),
    }

    const result = validate(schema)('invalid')

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value._tag).toBe('HttpError')
      expect(result.value.message).toContain('Validation failed')
      expect(result.value.message).toContain('Not a number')
    }
  })

  it('should work with complex validation schemas', () => {
    type User = { name: string; age: number }

    const userSchema: ValidationSchema<User> = {
      validate: (data: unknown) => {
        if (typeof data !== 'object' || data === null) {
          return E.left('Data must be an object')
        }
        const obj = data as Record<string, unknown>
        if (typeof obj.name !== 'string' || typeof obj.age !== 'number') {
          return E.left('Invalid user shape')
        }
        return E.right({ name: obj.name, age: obj.age })
      },
    }

    const validResult = validate(userSchema)({ name: 'Alice', age: 30 })
    expect(E.isRight(validResult)).toBe(true)

    const invalidResult = validate(userSchema)({ name: 'Bob' })
    expect(E.isLeft(invalidResult)).toBe(true)
  })
})

describe('tap', () => {
  it('should call side effect on success', async () => {
    const sideEffect = vi.fn()
    const successRte: RTE.ReaderTaskEither<unknown, never, string> = () => TE.right('success')

    const result = await pipe(successRte, tap(sideEffect))({})()

    expect(E.isRight(result)).toBe(true)
    expect(sideEffect).toHaveBeenCalledWith('success')
  })

  it('should not call side effect on failure', async () => {
    const sideEffect = vi.fn()
    const failRte: RTE.ReaderTaskEither<unknown, string, never> = () => TE.left('error')

    const result = await pipe(failRte, tap(sideEffect))({})()

    expect(E.isLeft(result)).toBe(true)
    expect(sideEffect).not.toHaveBeenCalled()
  })

  it('should not modify the result', async () => {
    const sideEffect = vi.fn(() => {
      // Side effect that doesn't affect result
    })
    const successRte: RTE.ReaderTaskEither<unknown, never, number> = () => TE.right(42)

    const result = await pipe(successRte, tap(sideEffect))({})()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value).toBe(42)
    }
  })
})

describe('tapLeft', () => {
  it('should call side effect on failure', async () => {
    const sideEffect = vi.fn()
    const failRte: RTE.ReaderTaskEither<unknown, string, never> = () => TE.left('error')

    const result = await pipe(failRte, tapLeft(sideEffect))({})()

    expect(E.isLeft(result)).toBe(true)
    expect(sideEffect).toHaveBeenCalledWith('error')
  })

  it('should not call side effect on success', async () => {
    const sideEffect = vi.fn()
    const successRte: RTE.ReaderTaskEither<unknown, never, string> = () => TE.right('success')

    const result = await pipe(successRte, tapLeft(sideEffect))({})()

    expect(E.isRight(result)).toBe(true)
    expect(sideEffect).not.toHaveBeenCalled()
  })

  it('should not modify the error', async () => {
    const sideEffect = vi.fn(() => {
      // Side effect that doesn't affect result
    })
    const failRte: RTE.ReaderTaskEither<unknown, HttpError, never> = () =>
      TE.left(
        HttpError.of({
          endpoint: '/test',
          method: 'GET',
          message: 'Test error',
          cause: null,
        }),
      )

    const result = await pipe(failRte, tapLeft(sideEffect))({})()

    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.message).toBe('Test error')
    }
  })
})
