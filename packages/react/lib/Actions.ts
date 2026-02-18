import { Fn } from "@oofp/core/function";
import { pipe } from "@oofp/core/pipe";
import * as S from "@oofp/core/state";
import { produce, Immutable } from "immer";

export type Action<S> = (payload?: any) => S.State<S, void>;
export type Actions<S> = Record<string, Action<S>>;
export type Dispatch<S> = Fn<S.State<S, void>, void>;

export const action =
  <P, S>(fn: (payload: P) => Fn<S, S>): Action<S> =>
  (payload): S.State<S, void> =>
  (state) =>
    [undefined, fn(payload)(state)];

export const iaction =
  <P, S>(fn: (payload: P) => Fn<S, void>): Action<S> =>
  (payload): S.State<S, void> =>
  (state) =>
    [undefined, pipe(state as Immutable<S>, produce(fn(payload)))];
