/**
 * purify-ts orchestration helpers using EitherAsync
 */
import { EitherAsync, Right, Left } from "purify-ts";
import type { Either } from "purify-ts";
import type {
	User,
	Permission,
	ParsedInput,
	EnrichedData,
	TransformedData,
	SavedRecord,
	Notification,
} from "./shared.ts";
import {
	fetchUserRaw,
	validatePermissionsRaw,
	parseInputRaw,
	enrichDataRaw,
	transformDataRaw,
	saveRecordRaw,
	notifyResultRaw,
	fetchCandidateRaw,
	fetchProjectRaw,
	fetchApplicationRaw,
	fetchConfigRaw,
	fetchTemplateRaw,
	processItemRaw,
	logToAnalyticsRaw,
	sendNotificationRaw,
} from "./shared.ts";

// ── Lift raw promises into EitherAsync ──────────────────────────

const toEA = <A>(fn: () => Promise<A>): EitherAsync<string, A> =>
	EitherAsync.fromPromise<string, A>(() =>
		fn().then(
			(v): Either<string, A> => Right(v),
			(e): Either<string, A> => Left(String(e)),
		),
	);

const fetchUser: EitherAsync<string, User> = toEA(fetchUserRaw);

const validatePermissions = (user: User): EitherAsync<string, Permission> =>
	toEA(() => validatePermissionsRaw(user));

const parseInput = (perm: Permission): EitherAsync<string, ParsedInput> =>
	toEA(() => parseInputRaw(perm));

const enrichData = (input: ParsedInput): EitherAsync<string, EnrichedData> =>
	toEA(() => enrichDataRaw(input));

const transformData = (data: EnrichedData): EitherAsync<string, TransformedData> =>
	toEA(() => transformDataRaw(data));

const saveRecord = (data: TransformedData): EitherAsync<string, SavedRecord> =>
	toEA(() => saveRecordRaw(data));

const notifyResult = (record: SavedRecord): EitherAsync<string, Notification> =>
	toEA(() => notifyResultRaw(record));

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline: EitherAsync<string, Notification> = fetchUser
	.chain(validatePermissions)
	.chain(parseInput)
	.chain(enrichData)
	.chain(transformData)
	.chain(saveRecord)
	.chain(notifyResult);

// ── 2. Parallel execution (EitherAsync.all) ─────────────────────

const fetchCandidate = toEA(fetchCandidateRaw);
const fetchProject = toEA(fetchProjectRaw);
const fetchApplication = toEA(fetchApplicationRaw);
const fetchConfig = toEA(fetchConfigRaw);
const fetchTemplate = toEA(fetchTemplateRaw);

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous tuple requires any cast for EitherAsync.all
export const parallelExecution: EitherAsync<string, any[]> = EitherAsync.all([
	fetchCandidate as EitherAsync<string, unknown>,
	fetchProject as EitherAsync<string, unknown>,
	fetchApplication as EitherAsync<string, unknown>,
	fetchConfig as EitherAsync<string, unknown>,
	fetchTemplate as EitherAsync<string, unknown>,
]);

// ── 3. Controlled concurrency (manual batching — no native support)

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const items = Array.from({ length: count }, (_, i) => i);
	const chunks: number[][] = [];
	for (let i = 0; i < items.length; i += maxConcurrent) {
		chunks.push(items.slice(i, i + maxConcurrent));
	}

	let result: EitherAsync<string, { index: number; processed: boolean }[]> =
		EitherAsync.fromPromise<string, { index: number; processed: boolean }[]>(() =>
			Promise.resolve(Right([] as { index: number; processed: boolean }[])),
		);

	for (const chunk of chunks) {
		result = result.chain((prev) =>
			EitherAsync.all(chunk.map((i) => toEA(() => processItemRaw(i)))).map(
				(chunkResults) => [...prev, ...chunkResults],
			),
		);
	}
	return result;
};

// ── 4. Error recovery (chainLeft) ───────────────────────────────

const fetchFromCache: EitherAsync<string, { id: number; name: string }> =
	EitherAsync.fromPromise<string, { id: number; name: string }>(() =>
		Promise.resolve(Left("cache miss")),
	);

const fetchFromDb: EitherAsync<string, { id: number; name: string }> =
	EitherAsync.fromPromise<string, { id: number; name: string }>(() =>
		Promise.resolve(Left("db error")),
	);

const createDefault: EitherAsync<string, { id: number; name: string }> =
	EitherAsync.fromPromise<string, { id: number; name: string }>(() =>
		Promise.resolve(Right({ id: 0, name: "default" })),
	);

const enrichRecord = (r: { id: number; name: string }): EitherAsync<string, { id: number; name: string; enriched: boolean }> =>
	EitherAsync.fromPromise<string, { id: number; name: string; enriched: boolean }>(() =>
		Promise.resolve(Right({ ...r, enriched: true })),
	);

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): EitherAsync<string, { saved: boolean; record: typeof r }> =>
	EitherAsync.fromPromise<string, { saved: boolean; record: typeof r }>(() =>
		Promise.resolve(Right({ saved: true, record: r })),
	);

export const errorRecoveryPipeline = fetchFromCache
	.chainLeft((_e: string) => fetchFromDb)
	.chainLeft((_e: string) => createDefault)
	.chain(enrichRecord)
	.chain(saveEnriched);

// ── 5. Middleware wrapper (manual composition) ──────────────────

const checkCredits: EitherAsync<string, { credits: number }> = toEA(() =>
	Promise.resolve({ credits: 10 }),
);

const deductCredits = (_amount: number): EitherAsync<string, void> =>
	toEA(() => Promise.resolve(undefined));

const rollbackCredits = (_amount: number): EitherAsync<string, void> =>
	toEA(() => Promise.resolve(undefined));

export const withCredits = <A>(
	mainPipeline: EitherAsync<string, A>,
): EitherAsync<string, A> =>
	checkCredits.chain((creds) =>
		mainPipeline
			.chain((result) => deductCredits(creds.credits).map(() => result))
			.chainLeft((_err: string) =>
				rollbackCredits(creds.credits).chain(() =>
					EitherAsync.fromPromise<string, A>(() => Promise.resolve(Left(_err))),
				),
			),
	);

export const middlewarePipeline = withCredits(
	toEA<string>(() => Promise.resolve("input"))
		.chain((s) => toEA(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } })))
		.chain((d) => toEA(() => saveRecordRaw(d))),
);

// ── 6. Fire-and-forget side effects (manual) ────────────────────

export const fireAndForgetPipeline: EitherAsync<string, SavedRecord> = fetchUser
	.chain(validatePermissions)
	.chain(parseInput)
	.chain(enrichData)
	.chain(transformData)
	.chain(saveRecord)
	.ifRight((record) => {
		// Fire-and-forget: launch without awaiting
		logToAnalyticsRaw(record).catch(() => void 0);
		sendNotificationRaw(record).catch(() => void 0);
	});

// ── Run helper ──────────────────────────────────────────────────

export const runEA = <L, R>(ea: EitherAsync<L, R>) => ea.run();
