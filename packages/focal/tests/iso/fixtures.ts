import { make } from "../../lib/iso.ts";

/** Celsius ↔ Fahrenheit */
export const celsiusToFahrenheit = make<number, number>(
	(c) => (c * 9) / 5 + 32,
	(f) => ((f - 32) * 5) / 9,
);

/** string ↔ char[] (split/join on "") */
export const stringToChars = make<string, string[]>(
	(s) => s.split(""),
	(chars) => chars.join(""),
);

/** A pair record ↔ tuple */
export interface Pair {
	fst: number;
	snd: string;
}

export const pairToTuple = make<Pair, [number, string]>(
	(p) => [p.fst, p.snd],
	([fst, snd]) => ({ fst, snd }),
);

/** Fahrenheit → Rankine (just add 459.67) */
export const fahrenheitToRankine = make<number, number>(
	(f) => f + 459.67,
	(r) => r - 459.67,
);
