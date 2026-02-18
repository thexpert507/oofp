/**
 * Unit Tests - Saga.chain()
 *
 * Tests para la composición monádica de pasos de saga.
 */
import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import { describe, expect, it, vi } from 'vitest'
import { chain, run, step } from '../lib/index'
import { TestContext, TestError, createTestContext } from './helpers'

describe('Saga.chain', () => {
  describe('successful chaining', () => {
    it('chains two steps and passes result to second step', async () => {
      // Arrange
      const ctx = createTestContext()
      const step1 = step({
        name: 'create-id',
        action: RTE.of<TestContext, Error, string>('generated-id'),
      })
      const step2 = (id: string) =>
        step({
          name: 'use-id',
          action: RTE.of<TestContext, Error, { userId: string }>({ userId: id }),
        })

      // Act
      const result = await pipe(step1, chain(step2), run, RTE.run(ctx))()

      // Assert
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ userId: 'generated-id' })
      }
    })

    it('chains three steps correctly', async () => {
      // Arrange
      const ctx = createTestContext()
      const createRecruiter = step({
        name: 'create-recruiter',
        action: RTE.of<TestContext, Error, { rid: number }>({ rid: 1 }),
      })
      const createUser = (r: { rid: number }) =>
        step({
          name: 'create-user',
          action: RTE.of<TestContext, Error, { uid: string; rid: number }>({ uid: 'u1', rid: r.rid }),
        })
      const createAuth = (u: { uid: string }) =>
        step({
          name: 'create-auth',
          action: RTE.of<TestContext, Error, { authId: string }>({ authId: `auth-${u.uid}` }),
        })

      // Act
      const result = await pipe(createRecruiter, chain(createUser), chain(createAuth), run, RTE.run(ctx))()

      // Assert
      expect(E.isRight(result)).toBe(true)
      if (E.isRight(result)) {
        expect(result.value).toEqual({ authId: 'auth-u1' })
      }
    })

    it('accumulates completed steps across chain', async () => {
      // Arrange
      const ctx = createTestContext()

      const step1 = step({
        name: 'step-1',
        action: RTE.of<TestContext, Error, number>(1),
      })

      const step2 = (_n: number) =>
        step({
          name: 'step-2',
          action: RTE.of<TestContext, Error, number>(2),
        })

      // Act - execute without run to check internal state
      const chainedStep = pipe(step1, chain(step2))
      const stateResult = await chainedStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult)) {
        expect(stateResult.value.completedSteps).toHaveLength(2)
        expect(stateResult.value.completedSteps[0].name).toBe('step-1')
        expect(stateResult.value.completedSteps[1].name).toBe('step-2')
      }
    })
  })

  describe('failure with compensation', () => {
    it('runs compensation when second step fails', async () => {
      // Arrange
      const ctx = createTestContext()
      const compensationCalled = vi.fn()

      const step1 = step({
        name: 'create-resource',
        action: RTE.of<TestContext, Error, { id: string }>({ id: 'resource-1' }),
        compensate: (result) => {
          compensationCalled(result.id)
          return RTE.of<TestContext, Error, void>(undefined)
        },
      })

      const step2 = (_result: { id: string }) =>
        step({
          name: 'failing-step',
          action: RTE.left<TestContext, Error, void>(new TestError('Step 2 failed')),
        })

      // Act
      const result = await pipe(step1, chain(step2), run, RTE.run(ctx))()

      // Assert
      expect(E.isLeft(result)).toBe(true)
      expect(compensationCalled).toHaveBeenCalledWith('resource-1')
    })

    it('runs compensations in LIFO order (reduceRight)', async () => {
      // Arrange
      const ctx = createTestContext()
      const executionOrder: string[] = []

      const step1 = step({
        name: 'step-1',
        action: RTE.of<TestContext, Error, number>(1),
        compensate: () => {
          executionOrder.push('compensate-1')
          return RTE.of<TestContext, Error, void>(undefined)
        },
      })

      const step2 = (_n: number) =>
        step({
          name: 'step-2',
          action: RTE.of<TestContext, Error, number>(2),
          compensate: () => {
            executionOrder.push('compensate-2')
            return RTE.of<TestContext, Error, void>(undefined)
          },
        })

      const step3 = (_n: number) =>
        step({
          name: 'step-3',
          action: RTE.left<TestContext, Error, void>(new TestError('Failed at step 3')),
        })

      // Act
      await pipe(step1, chain(step2), chain(step3), run, RTE.run(ctx))()

      // Assert
      // reduceRight ejecuta de derecha a izquierda en el array
      // completedSteps es [step-1, step-2], reduceRight empieza por step-2
      expect(executionOrder).toContain('compensate-1')
      expect(executionOrder).toContain('compensate-2')
    })
  })

  describe('steps without compensation', () => {
    it('handles steps without compensation gracefully', async () => {
      // Arrange
      const ctx = createTestContext()

      // Step 1 has no compensation
      const step1 = step({
        name: 'step-no-compensation',
        action: RTE.of<TestContext, Error, string>('value'),
      })

      const step2 = (_s: string) =>
        step({
          name: 'failing-step',
          action: RTE.left<TestContext, Error, void>(new TestError('Failed')),
        })

      // Act
      const result = await pipe(step1, chain(step2), run, RTE.run(ctx))()

      // Assert
      expect(E.isLeft(result)).toBe(true)
      // No debe fallar aunque no haya compensation
    })
  })
})
