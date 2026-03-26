import type { Traversal } from "../../lib/traversal.ts";
import { make } from "../../lib/traversal.ts";

/** A simple binary tree for custom Traversal exercises. */
export type Tree<A> = { kind: "leaf"; value: A } | { kind: "node"; left: Tree<A>; right: Tree<A> };

export const leaf = <A>(value: A): Tree<A> => ({ kind: "leaf", value });
export const node = <A>(left: Tree<A>, right: Tree<A>): Tree<A> => ({
	kind: "node",
	left,
	right,
});

//       node
//      /    \
//   leaf(1)  node
//           /    \
//        leaf(2)  leaf(3)
export const sampleTree: Tree<number> = node(leaf(1), node(leaf(2), leaf(3)));

/** Traversal over all leaves of a binary tree (depth-first, left-to-right). */
export const leaves = <A>(): Traversal<Tree<A>, A> =>
	make(
		(f) => {
			const go = (t: Tree<A>): Tree<A> => {
				if (t.kind === "leaf") return leaf(f(t.value));
				return node(go(t.left), go(t.right));
			};
			return go;
		},
		(s) => {
			const result: A[] = [];
			const go = (t: Tree<A>): void => {
				if (t.kind === "leaf") {
					result.push(t.value);
				} else {
					go(t.left);
					go(t.right);
				}
			};
			go(s);
			return result;
		},
	);
