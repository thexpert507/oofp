export const run =
	<S>(s: S) =>
	<T>(updater: (s: S) => T): T =>
		updater(s);
