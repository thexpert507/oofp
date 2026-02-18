import * as E from '@oofp/core/either'
import * as RTE from '@oofp/core/reader-task-either'

export type Compensation<R, E> = RTE.ReaderTaskEither<R, E, void>

export type SagaStepConstructor<R, E, A> = {
  readonly name: string
  readonly action: RTE.ReaderTaskEither<R, E, A>
  readonly compensate?: (result: A) => Compensation<R, E>
}

export type SagaStepResult<R, E> = {
  readonly name: string
  readonly compensation?: Compensation<R, E>
}

export type SagaState<R, E, A> = {
  readonly result: E.Either<E, A>
  readonly completedSteps: ReadonlyArray<SagaStepResult<R, E>>
}

export type SagaStep<R, E, A> = RTE.ReaderTaskEither<R, Error, SagaState<R, E, A>>
