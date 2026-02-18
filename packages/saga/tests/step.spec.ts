/**
 * Unit Tests - Saga.step()
 *
 * Tests para el constructor de pasos de saga.
 */
import * as E from '@oofp/core/either'
import * as RTE from '@oofp/core/reader-task-either'
import { describe, expect, it, vi } from 'vitest'
import { step } from '../lib/index'
import { TestContext, TestError, createTestContext } from './helpers'

describe('Saga.step', () => {
  describe('step creation', () => {
    it('creates a step with name and action', async () => {
      // Arrange
      const ctx = createTestContext()
      const action = RTE.of<TestContext, Error, string>('result')

      // Act
      const sagaStep = step({ name: 'test-step', action })
      const stateResult = await sagaStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult)) {
        expect(E.isRight(stateResult.value.result)).toBe(true)
        if (E.isRight(stateResult.value.result)) {
          expect(stateResult.value.result.value).toBe('result')
        }
        expect(stateResult.value.completedSteps).toHaveLength(1)
        expect(stateResult.value.completedSteps[0].name).toBe('test-step')
        expect(stateResult.value.completedSteps[0].compensation).toBeUndefined()
      }
    })

    it('creates a step with compensation function', async () => {
      // Arrange
      const ctx = createTestContext()
      const action = RTE.of<TestContext, Error, string>('result')
      const compensation = vi.fn().mockReturnValue(RTE.of<TestContext, Error, void>(undefined))

      // Act
      const sagaStep = step({ name: 'test-step', action, compensate: compensation })
      const stateResult = await sagaStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult)) {
        expect(stateResult.value.completedSteps[0].compensation).toBeDefined()
        expect(compensation).toHaveBeenCalledWith('result')
      }
    })

    it('handles steps without compensation gracefully', async () => {
      // Arrange
      const ctx = createTestContext()
      const action = RTE.of<TestContext, Error, number>(42)

      // Act
      const sagaStep = step({ name: 'no-compensation', action })
      const stateResult = await sagaStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult)) {
        expect(stateResult.value.completedSteps[0].compensation).toBeUndefined()
      }
    })
  })

  describe('step execution with context', () => {
    it('provides context to the action', async () => {
      // Arrange
      const ctx = createTestContext()
      const action = (c: TestContext) => {
        c.log.push('action-executed')
        return RTE.of<TestContext, Error, string>('done')(c)
      }

      // Act
      const sagaStep = step({ name: 'log-action', action })
      await sagaStep(ctx)()

      // Assert
      expect(ctx.log).toContain('action-executed')
    })

    it('provides context to compensation', async () => {
      // Arrange
      const ctx = createTestContext()
      const action = RTE.of<TestContext, Error, string>('value')
      const compensation = (_result: string) => (c: TestContext) => {
        c.log.push('compensation-executed')
        return RTE.of<TestContext, Error, void>(undefined)(c)
      }

      // Act
      const sagaStep = step({ name: 'with-compensation', action, compensate: compensation })
      const stateResult = await sagaStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult) && stateResult.value.completedSteps[0].compensation) {
        await stateResult.value.completedSteps[0].compensation(ctx)()
        expect(ctx.log).toContain('compensation-executed')
      }
    })
  })

  describe('step failure handling', () => {
    it('captures error in SagaState when action fails', async () => {
      // Arrange
      const ctx = createTestContext()
      const error = new TestError('Action failed')
      const action = RTE.left<TestContext, Error, string>(error)

      // Act
      const sagaStep = step({ name: 'failing-step', action })
      const stateResult = await sagaStep(ctx)()

      // Assert
      expect(E.isRight(stateResult)).toBe(true)
      if (E.isRight(stateResult)) {
        expect(E.isLeft(stateResult.value.result)).toBe(true)
        if (E.isLeft(stateResult.value.result)) {
          expect(stateResult.value.result.value).toBe(error)
        }
        expect(stateResult.value.completedSteps).toEqual([])
      }
    })
  })
})
