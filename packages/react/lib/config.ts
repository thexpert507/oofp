import { pipe } from "@oofp/core/pipe";
import * as S from "@oofp/core/state";
import { Identity } from "@oofp/core/id";
import { ReactNode, useState } from "react";
import { Component } from "./Component";
import { Actions } from "./Actions";
import { StatefulContext, StatelessContext } from "./Context";

type StatelessConfig<C, P> = {
  type: "stateless";
  ctx?: Identity<C>;
  props?: Identity<P>;
  render: (ctx: StatelessContext<C, P>) => ReactNode;
};

type StatefulConfig<C, S, P, A extends Actions<S>> = {
  type: "stateful";
  ctx?: Identity<C>;
  props?: Identity<P>;
  initialState: S;
  actions: A;
  render: (ctx: StatefulContext<C, S, P, A>) => ReactNode;
};

type Config<C, S, P, A extends Actions<S>> = StatelessConfig<C, P> | StatefulConfig<C, S, P, A>;

const stateless = <C, P>(config: StatelessConfig<C, P>): Component<C, P> => {
  return (ctx: C) => (props: P) => config.render({ type: "stateless", ctx, props });
};

const stateful = <C, S, P, A extends Actions<S>>(
  config: StatefulConfig<C, S, P, A>
): Component<C, P> => {
  return (ctx: C) => (props: P) => {
    const [state, setState] = useState(config.initialState);

    const dispatch = (action: S.State<S, void>) => setState(pipe(action, S.runS(state)));

    return config.render({ type: "stateful", ctx, props, state, mut: [dispatch, config.actions] });
  };
};

export const component = <C, S, P, A extends Actions<S>>(
  config: Config<C, S, P, A>
): Component<C, P> => {
  switch (config.type) {
    case "stateless":
      return stateless(config);
    case "stateful":
      return stateful(config);
  }
};
