import * as L from '@oofp/core/list'
import { pipe } from '@oofp/core/pipe'
import * as RTE from '@oofp/core/reader-task-either'
import * as TE from '@oofp/core/task-either'
import type { SagaState, SagaStep, SagaStepResult } from './types'

const toVoid = <A>(_: A): void => void 0

const runCompensations = <R, E, A>(state: SagaState<R, E, A>): RTE.ReaderTaskEither<R, E, void> => {
  const compensations: SagaStepResult<R, E>[] = [...state.completedSteps]
  return pipe(
    compensations,
    L.reduceRight(RTE.of(toVoid(0)) as RTE.ReaderTaskEither<R, E, void>, (acc, current) =>
      pipe(
        acc,
        RTE.chain(() => current.compensation ?? (RTE.of(toVoid(undefined)) as RTE.ReaderTaskEither<R, E, void>)),
      ),
    ),
  )
}

export const run = <R, E, A>(step: SagaStep<R, E, A>): RTE.ReaderTaskEither<R, E | Error, A> => {
  return pipe(
    step as RTE.ReaderTaskEither<R, E | Error, SagaState<R, E, A>>,
    RTE.chainwc((state): RTE.ReaderTaskEither<R, E | Error, A> => {
      return pipe(
        RTE.from(TE.fromEither(state.result)),
        RTE.tapLeftRTE(() => runCompensations<R, E, A>(state)),
      ) as RTE.ReaderTaskEither<R, E | Error, A>
    }),
  )
}
