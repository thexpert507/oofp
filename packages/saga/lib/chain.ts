import * as E from '@oofp/core/either'
import type { Fn } from '@oofp/core/function'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import type { SagaState, SagaStep } from './types'

const chainStates =
  <R1, E1, A>(state1: SagaState<R1, E1, A>) =>
  <R2, E2, B>(state2: SagaState<R2, E2, B>): SagaState<R2 & R1, E1 | E2, B> => ({
    result: state2.result as E.Either<E1 | E2, B>,
    completedSteps: [...state1.completedSteps, ...state2.completedSteps] as SagaState<
      R2 & R1,
      E1 | E2,
      B
    >['completedSteps'],
  })

export const chain =
  <R2, E2, A, B>(fn: Fn<A, SagaStep<R2, E2, B>>) =>
  <R1, E1>(step: SagaStep<R1, E1, A>): SagaStep<R1 & R2, E1 | E2, B> => {
    return pipe(
      step,
      RTE.chainwc((state): SagaStep<R2 & R1, E1 | E2, B> => {
        return pipe(
          state.result,
          E.fold(
            (err) =>
              RTE.of({
                result: E.left(err),
                completedSteps: [...state.completedSteps],
              } as SagaState<R2 & R1, E1 | E2, B>),
            (value) => pipe(fn(value), RTE.map(chainStates(state))),
          ),
        )
      }),
    ) as SagaStep<R1 & R2, E1 | E2, B>
  }
