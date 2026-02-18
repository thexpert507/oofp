import { ReactNode } from "react";
import { Component } from "./Component";

type RenderProps<C, P> = { component: Component<C, P>; context: C; props: P };
export const Render = <C, P>({ component, context, props }: RenderProps<C, P>): ReactNode => {
  return component(context)(props);
};
