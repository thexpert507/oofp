import type { InjectionToken, Provider } from "@nestjs/common";
import { pipe } from "@oofp/core/pipe";
import * as R from "@oofp/core/reader";

type TokenMap<Context extends object> = { [Key in keyof Context]: InjectionToken };

export const provideReader = <Context extends object, Service>(options: {
	provide: InjectionToken;
	reader: R.Reader<Context, Service>;
	context: TokenMap<Context>;
}): Provider => ({
	provide: options.provide,
	useFactory: (...dependencies: unknown[]) => {
		const keys = Object.keys(options.context) as Array<keyof Context>;
		const context = Object.fromEntries(
			keys.map((key, index) => [key, dependencies[index]]),
		) as Context;
		return pipe(options.reader, R.run(context));
	},
	inject: Object.values(options.context),
});
