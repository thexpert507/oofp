import { URIS } from "../hkt";
import { collect } from "./collect";
import { Focal } from "./types";

export const fold =
	<B, A>(init: B, f: (acc: B, a: A) => B) =>
	<F extends URIS, S>(focal: Focal<F, S, A>) =>
	(s: S): B =>
		collect(s)(focal).reduce(f, init);
