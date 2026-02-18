import { Identity, id } from "@oofp/core/id";
import { Actions, Dispatch } from "./Actions";

export const context = <C,>(): Identity<C> => id<C>();
export const props = <P,>(): Identity<P> => id<P>();

export interface StatelessContext<C, P> {
  type: "stateless";
  ctx: C;
  props: P;
}

export interface StatefulContext<C, S, P, A extends Actions<S>> {
  type: "stateful";
  ctx: C;
  props: P;
  state: S;
  mut: [Dispatch<S>, A];
}
