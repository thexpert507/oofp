/**
 * @oofp/saga - Saga Pattern Utility
 *
 * Provides transactional operations with automatic compensations (rollback)
 * when failures occur. Designed to work naturally with @oofp/core monads.
 *
 * @example
 * ```typescript
 * import * as Saga from '@oofp/saga'
 *
 * const createRecruiterStep = (dto: CreateRecruiterDto) =>
 *   Saga.step({
 *     name: 'create-recruiter',
 *     action: createRecruiterRTE(dto),
 *     compensate: (recruiter) => deleteRecruiterRTE(recruiter.id)
 *   })
 *
 * const createUserStep = (recruiter: Recruiter, dto: CreateUserDto) =>
 *   Saga.step({
 *     name: 'create-user',
 *     action: createUserRTE(recruiter, dto),
 *     compensate: (user) => deleteUserRTE(user.id)
 *   })
 *
 * const registerInFirebaseStep = (user: User) =>
 *   Saga.step({
 *     name: 'register-firebase',
 *     action: registerInFirebaseRTE(user),
 *     compensate: (identity) => deleteFirebaseUserRTE(identity.uid)
 *   })
 *
 * const registerRecruiter = (dto: RegisterDto) =>
 *   pipe(
 *     createRecruiterStep(dto),
 *     Saga.chain((recruiter) => createUserStep(recruiter, dto)),
 *     Saga.chain((user) => registerInFirebaseStep(user)),
 *     Saga.run
 *   )
 * // Returns RTE<Context, Error, AuthIdentity>
 * // On failure: automatically runs compensations in reverse order (LIFO)
 * ```
 */

// Re-export types
export type { Compensation, SagaState, SagaStep, SagaStepConstructor, SagaStepResult } from './types'

// Re-export combinators
export { step } from './step'
export { chain } from './chain'
export { run } from './run'

// Namespace export for convenient usage: import * as Saga from '@oofp/saga'
import { chain } from './chain'
import { run } from './run'
import { step } from './step'

export const Saga = { step, chain, run }
