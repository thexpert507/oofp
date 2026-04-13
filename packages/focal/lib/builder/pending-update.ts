import { Fn } from "@oofp/core/function";

export class PendingUpdate<S, A = S> {
	constructor(private readonly updater: Fn<S, A>) {}

	run(s: S): A {
		return this.updater(s);
	}
}
