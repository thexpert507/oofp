import * as M from "@oofp/core/maybe";
import { make } from "../../lib/prism.ts";

export type Shape =
	| { kind: "circle"; radius: number }
	| { kind: "rect"; width: number; height: number };

export const circle = (radius: number): Shape => ({ kind: "circle", radius });
export const rect = (width: number, height: number): Shape => ({
	kind: "rect",
	width,
	height,
});

export const intPrism = make<string, number>(
	(s) => {
		const n = Number.parseInt(s, 10);
		return Number.isNaN(n) ? M.nothing() : M.just(n);
	},
	(n) => String(n),
);
