import { URIS, Kind } from "@/hkt";

export type Focal<F extends URIS, S, A> = {
	readonly tag: "Focal";
	readonly optic: Kind<F, S, A>;
};
