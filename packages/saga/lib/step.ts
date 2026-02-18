import * as E from '@oofp/core/either'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import type { SagaState, SagaStep, SagaStepConstructor } from './types'

export const step = <R, E, A>(step: SagaStepConstructor<R, E, A>): SagaStep<R, E, A> => {
  return pipe(
    step.action as RTE.ReaderTaskEither<R, Error, A>,
    RTE.map(
      (value): SagaState<R, E, A> => ({
        result: E.right(value),
        completedSteps: [{ name: step.name, compensation: step.compensate?.(value) }],
      }),
    ),
    RTE.chainLeftwc(
      (error): SagaStep<R, E, A> => RTE.of({ result: E.left(error as E), completedSteps: [] } as SagaState<R, E, A>),
    ),
  ) as SagaStep<R, E, A>
}
