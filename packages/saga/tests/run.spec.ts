/**
 * Unit Tests - Saga.run()
 *
 * Tests para la ejecución de sagas (single step).
 */
import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import { describe, expect, it, vi } from 'vitest'
import { run, step } from '../lib/index'
import { TestContext, TestError, createTestContext } from './helpers'

describe('Saga.run', () => {
  describe('successful execution', () => {
    it('executes a single step and returns the result', async () => {
      // Arrange
      const ctx = createTestContext()
      const sagaStep = step({
        name: 'create-user',
        action: RTE.of<TestContext, Error, { id: string }>({ id: 'user-1' }),
      })

      // Act
      const result = await pipe(sagaStep, run, RTE.run(ctx))()

      // Assert
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ id: 'user-1' })
      }
    })

    it('provides context to the action', async () => {
      // Arrange
      const ctx = createTestContext()
      const sagaStep = step({
        name: 'log-action',
        action: (c: TestContext) => {
          c.log.push('action-executed')
          return RTE.of<TestContext, Error, string>('done')(c)
        },
      })

      // Act
      await pipe(sagaStep, run, RTE.run(ctx))()

      // Assert
      expect(ctx.log).toContain('action-executed')
    })
  })

  describe('failed execution', () => {
    it('returns error when step fails', async () => {
      // Arrange
      const ctx = createTestContext()
      const sagaStep = step({
        name: 'failing-step',
        action: RTE.left<TestContext, Error, string>(new TestError('Step failed')),
      })

      // Act
      const result = await pipe(sagaStep, run, RTE.run(ctx))()

      // Assert
      expect(E.isLeft(result)).toBe(true)
      if (E.isLeft(result)) {
        expect(result.value).toBeInstanceOf(Error)
        expect(result.value.message).toBe('Step failed')
      }
    })

    it('does not run compensation for failed step without prior completions', async () => {
      // Arrange
      const ctx = createTestContext()
      const compensationSpy = vi.fn().mockReturnValue(RTE.of<TestContext, Error, void>(undefined))

      const sagaStep = step({
        name: 'failing-immediately',
        action: RTE.left<TestContext, Error, string>(new TestError('Failed')),
        compensate: compensationSpy,
      })

      // Act
      const result = await pipe(sagaStep, run, RTE.run(ctx))()

      // Assert
      expect(E.isLeft(result)).toBe(true)
      expect(compensationSpy).not.toHaveBeenCalled()
    })
  })
})
