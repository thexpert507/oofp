import { Fn } from "@oofp/core/function";

export class PendingUpdate<S, A = S> {
	constructor(private readonly updater: Fn<S, A>) {
		this.run = this.run.bind(this);
	}

	run(s: S): A {
		return this.updater(s);
	}
}
