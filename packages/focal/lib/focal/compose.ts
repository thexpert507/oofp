import { URIS } from "@/hkt";
import * as Iso from "@/iso";
import * as Lens from "@/lens";
import * as Prism from "@/prism";
import * as Traversal from "@/traversal";
import { compose as RawCompose } from "../compose";
import { Focal } from "./types";

// prettier-ignore
export type ComposeResult<FTo extends URIS, FFrom extends URIS, S, B> = FTo extends Traversal.URI
	? Focal<Traversal.URI, S, B>
	: FTo extends Prism.URI
		? FFrom extends Traversal.URI
			? Focal<Traversal.URI, S, B>
			: Focal<Prism.URI, S, B>
		: FTo extends Lens.URI
			? FFrom extends Traversal.URI
				? Focal<Traversal.URI, S, B>
				: FFrom extends Prism.URI
					? Focal<Prism.URI, S, B>
					: Focal<Lens.URI, S, B>
			: // Iso:
				FFrom extends Traversal.URI
				? Focal<Traversal.URI, S, B>
				: FFrom extends Prism.URI
					? Focal<Prism.URI, S, B>
					: FFrom extends Lens.URI
						? Focal<Lens.URI, S, B>
						: Focal<Iso.URI, S, B>;

export const compose =
	<A, B, FTo extends URIS>(to: Focal<FTo, A, B>) =>
	<S, FFrom extends URIS>(from: Focal<FFrom, S, A>): ComposeResult<FTo, FFrom, S, B> =>
		({
			tag: "Focal",
			optic: RawCompose(to.optic as never)(from.optic as never),
		}) as ComposeResult<FTo, FFrom, S, B>;
