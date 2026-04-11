import { Fn } from "@oofp/core/function";
import * as R from "@oofp/core/reader";
import { ReactNode } from "react";

export type Component<C, P> = R.Reader<C, Fn<P, ReactNode>>;

// Infer Component context and props
export type ICC<C> = C extends Component<infer C, unknown> ? C : never;
export type ICP<C> = C extends Component<unknown, infer P> ? P : never;
