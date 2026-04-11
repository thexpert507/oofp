import * as Prism from "../prism";
import * as Traversal from "../traversal";
import { URIS } from "../hkt";
import { compose } from "./compose";
import { make } from "./internal";
import { Focal } from "./types";

type MatchResult<F extends URIS, S, A, TK extends string, TV extends string> =
	F extends Traversal.URI
		? Focal<Traversal.URI, S, Extract<A, Record<TK, TV>>>
		: Focal<Prism.URI, S, Extract<A, Record<TK, TV>>>;

// Overload 1: with explicit type param — curried tagKey then tagValue, enabling partial matchers.
// The two-step currying ensures TV is fully instantiated before Extract<A, Record<TK, TV>> is
// evaluated, preventing TypeScript from widening TV to its upper bound when A contains
// index-signature members (e.g. catch-all union variants like { [key: string]: unknown }).
//
// Usage — inline:
//   Focal.match<Shape>()("kind")("circle")
//
// Usage — partial matcher (the main benefit):
//   const byKind = Focal.match<Shape>()("kind");
//   pipe(focal, byKind("circle"))
//   pipe(focal, byKind("rect"))
export function match<A>(): <TK extends keyof Prism.StripIndex<A> & string>(
	tagKey: TK,
) => <TV extends Prism.TagValues<A, TK>>(
	tagValue: TV,
) => <F extends URIS, S>(focal: Focal<F, S, A>) => MatchResult<F, S, A, TK, TV>;

// Overload 2: without type param — A inferred from the focal in the pipe.
// Both arguments taken together for convenient inline use.
export function match<TK extends string, TV extends string>(
	tagKey: TK,
	tagValue: TV,
): <F extends URIS, S, A>(focal: Focal<F, S, A>) => MatchResult<F, S, A, TK, TV>;

// Implementation
export function match(...args: [] | [string, string]): unknown {
	const impl =
		(tagKey: string, tagValue: string) =>
		<F extends URIS, S, A>(focal: Focal<F, S, A>): MatchResult<F, S, A, string, string> => {
			const matchPrism = make<Prism.URI, A, Extract<A, Record<string, string>>>(
				Prism.match<A>()(tagKey as never, tagValue as never),
			);
			return compose(matchPrism)(focal as never) as MatchResult<F, S, A, string, string>;
		};
	if (args.length === 0) return (tagKey: string) => (tagValue: string) => impl(tagKey, tagValue);
	return impl(args[0], args[1]);
}
