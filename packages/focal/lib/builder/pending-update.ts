import { Fn } from "@oofp/core/function";

export type PendingUpdate<S, A = S> = Fn<S, A>;
