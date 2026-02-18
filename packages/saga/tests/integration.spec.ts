/**
 * Integration Tests - Saga Pattern
 *
 * Tests de escenarios reales que demuestran el uso completo del patrón saga
 * con múltiples pasos y compensaciones automáticas.
 */
import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import { describe, expect, it } from 'vitest'
import { chain, run, step } from '../lib/index'
import { TestContext, createTestContext } from './helpers'

describe('Saga Integration: Register Recruiter', () => {
  type Recruiter = { id: number; email: string }
  type User = { id: string; recruiterId: number }
  type AuthIdentity = { uid: string; email: string }

  it('successfully completes all steps', async () => {
    // Arrange
    const ctx = createTestContext()

    const createRecruiter = step<TestContext, Error, Recruiter>({
      name: 'create-recruiter',
      action: (c) => {
        const recruiter = { id: 1, email: 'test@example.com' }
        c.db.recruiters.set(recruiter.id, recruiter)
        return RTE.of<TestContext, Error, Recruiter>(recruiter)(c)
      },
      compensate: (recruiter) => (c) => {
        c.db.recruiters.delete(recruiter.id)
        c.deletions.push(`recruiter-${recruiter.id}`)
        return RTE.of<TestContext, Error, void>(undefined)(c)
      },
    })

    const createUser = (recruiter: Recruiter) =>
      step<TestContext, Error, User>({
        name: 'create-user',
        action: (c) => {
          const user = { id: 'user-1', recruiterId: recruiter.id }
          c.db.users.set(user.id, user)
          return RTE.of<TestContext, Error, User>(user)(c)
        },
        compensate: (user) => (c) => {
          c.db.users.delete(user.id)
          c.deletions.push(`user-${user.id}`)
          return RTE.of<TestContext, Error, void>(undefined)(c)
        },
      })

    const registerFirebase = (user: User) =>
      step<TestContext, Error, AuthIdentity>({
        name: 'register-firebase',
        action: (c) => {
          const identity = { uid: `firebase-${user.id}`, email: 'test@example.com' }
          c.firebase.set(identity.uid, identity)
          return RTE.of<TestContext, Error, AuthIdentity>(identity)(c)
        },
        compensate: (identity) => (c) => {
          c.firebase.delete(identity.uid)
          c.deletions.push(`firebase-${identity.uid}`)
          return RTE.of<TestContext, Error, void>(undefined)(c)
        },
      })

    // Act
    const result = await pipe(createRecruiter, chain(createUser), chain(registerFirebase), run, RTE.run(ctx))()

    // Assert
    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      expect(result.value.uid).toBe('firebase-user-1')
    }

    // Verify all records were created
    expect(ctx.db.recruiters.size).toBe(1)
    expect(ctx.db.users.size).toBe(1)
    expect(ctx.firebase.size).toBe(1)

    // No compensations should have run
    expect(ctx.deletions).toEqual([])
  })

  it('rolls back all changes when Firebase registration fails', async () => {
    // Arrange
    const ctx = createTestContext()

    const createRecruiter = step<TestContext, Error, Recruiter>({
      name: 'create-recruiter',
      action: (c) => {
        const recruiter = { id: 1, email: 'test@example.com' }
        c.db.recruiters.set(recruiter.id, recruiter)
        return RTE.of<TestContext, Error, Recruiter>(recruiter)(c)
      },
      compensate: (recruiter) => (c) => {
        c.db.recruiters.delete(recruiter.id)
        c.deletions.push(`recruiter-${recruiter.id}`)
        return RTE.of<TestContext, Error, void>(undefined)(c)
      },
    })

    const createUser = (recruiter: Recruiter) =>
      step<TestContext, Error, User>({
        name: 'create-user',
        action: (c) => {
          const user = { id: 'user-1', recruiterId: recruiter.id }
          c.db.users.set(user.id, user)
          return RTE.of<TestContext, Error, User>(user)(c)
        },
        compensate: (user) => (c) => {
          c.db.users.delete(user.id)
          c.deletions.push(`user-${user.id}`)
          return RTE.of<TestContext, Error, void>(undefined)(c)
        },
      })

    const registerFirebase = (_user: User) =>
      step<TestContext, Error, AuthIdentity>({
        name: 'register-firebase',
        action: RTE.left(new Error('Firebase quota exceeded')),
      })

    // Act
    const result = await pipe(createRecruiter, chain(createUser), chain(registerFirebase), run, RTE.run(ctx))()

    // Assert
    expect(E.isLeft(result)).toBe(true)
    if (E.isLeft(result)) {
      expect(result.value.message).toBe('Firebase quota exceeded')
    }

    // Verify compensations were run (records deleted)
    expect(ctx.db.recruiters.size).toBe(0)
    expect(ctx.db.users.size).toBe(0)

    // Verify both compensations ran
    expect(ctx.deletions).toContain('user-user-1')
    expect(ctx.deletions).toContain('recruiter-1')
  })
})
