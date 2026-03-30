/**
 * Effect orchestration helpers using Effect type
 */
import { Effect, pipe } from "effect";
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

// ── Lift raw promises into Effect ───────────────────────────────

const toEffect = <A>(fn: () => Promise<A>): Effect.Effect<A, string> =>
	Effect.tryPromise({ try: fn, catch: (e) => String(e) });

const fetchUser: Effect.Effect<User, string> = toEffect(fetchUserRaw);

const validatePermissions = (user: User): Effect.Effect<Permission, string> =>
	toEffect(() => validatePermissionsRaw(user));

const parseInput = (perm: Permission): Effect.Effect<ParsedInput, string> =>
	toEffect(() => parseInputRaw(perm));

const enrichData = (input: ParsedInput): Effect.Effect<EnrichedData, string> =>
	toEffect(() => enrichDataRaw(input));

const transformData = (data: EnrichedData): Effect.Effect<TransformedData, string> =>
	toEffect(() => transformDataRaw(data));

const saveRecord = (data: TransformedData): Effect.Effect<SavedRecord, string> =>
	toEffect(() => saveRecordRaw(data));

const notifyResult = (record: SavedRecord): Effect.Effect<Notification, string> =>
	toEffect(() => notifyResultRaw(record));

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline: Effect.Effect<Notification, string> = pipe(
	fetchUser,
	Effect.flatMap(validatePermissions),
	Effect.flatMap(parseInput),
	Effect.flatMap(enrichData),
	Effect.flatMap(transformData),
	Effect.flatMap(saveRecord),
	Effect.flatMap(notifyResult),
);

// ── 2. Parallel execution (Effect.all with concurrency) ─────────

const fetchCandidate = toEffect(fetchCandidateRaw);
const fetchProject = toEffect(fetchProjectRaw);
const fetchApplication = toEffect(fetchApplicationRaw);
const fetchConfig = toEffect(fetchConfigRaw);
const fetchTemplate = toEffect(fetchTemplateRaw);

export const parallelExecution = Effect.all(
	[fetchCandidate, fetchProject, fetchApplication, fetchConfig, fetchTemplate],
	{ concurrency: "unbounded" },
);

// ── 3. Controlled concurrency (native Effect.forEach) ───────────

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const items = Array.from({ length: count }, (_, i) => i);
	return Effect.forEach(items, (i) => toEffect(() => processItemRaw(i)), {
		concurrency: maxConcurrent,
	});
};

// ── 4. Error recovery (catchAll) ────────────────────────────────

const fetchFromCache: Effect.Effect<{ id: number; name: string }, string> =
	Effect.tryPromise({ try: () => Promise.reject("cache miss"), catch: (e) => String(e) });

const fetchFromDb: Effect.Effect<{ id: number; name: string }, string> =
	Effect.tryPromise({ try: () => Promise.reject("db error"), catch: (e) => String(e) });

const createDefault: Effect.Effect<{ id: number; name: string }, string> =
	Effect.succeed({ id: 0, name: "default" });

const enrichRecord = (r: { id: number; name: string }): Effect.Effect<{ id: number; name: string; enriched: boolean }, string> =>
	Effect.succeed({ ...r, enriched: true });

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): Effect.Effect<{ saved: boolean; record: typeof r }, string> =>
	Effect.succeed({ saved: true, record: r });

export const errorRecoveryPipeline = pipe(
	fetchFromCache,
	Effect.catchAll(() => fetchFromDb),
	Effect.catchAll(() => createDefault),
	Effect.flatMap(enrichRecord),
	Effect.flatMap(saveEnriched),
);

// ── 5. Middleware wrapper (acquireUseRelease-like) ───────────────

const checkCredits: Effect.Effect<{ credits: number }, string> = toEffect(() =>
	Promise.resolve({ credits: 10 }),
);

const deductCredits = (_amount: number): Effect.Effect<void, string> =>
	toEffect(() => Promise.resolve(undefined));

const rollbackCredits = (_amount: number): Effect.Effect<void, string> =>
	toEffect(() => Promise.resolve(undefined));

export const withCredits = <A, E>(
	mainPipeline: Effect.Effect<A, E>,
): Effect.Effect<A, E | string> =>
	pipe(
		checkCredits,
		Effect.flatMap((creds) =>
			pipe(
				mainPipeline,
				Effect.flatMap((result) =>
					pipe(
						deductCredits(creds.credits),
						Effect.map(() => result),
					),
				),
				Effect.catchAll((err) =>
					pipe(
						rollbackCredits(creds.credits),
						Effect.flatMap(() => Effect.fail(err)),
					),
				),
			),
		),
	);

export const middlewarePipeline = withCredits(
	pipe(
		Effect.succeed("input"),
		Effect.flatMap((s) => toEffect(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } }))),
		Effect.flatMap((d) => toEffect(() => saveRecordRaw(d))),
	),
);

// ── 6. Fire-and-forget side effects (Effect.fork) ───────────────

const logAnalytics = (data: unknown): Effect.Effect<void, string> =>
	toEffect(() => logToAnalyticsRaw(data));

const sendNotif = (data: unknown): Effect.Effect<void, string> =>
	toEffect(() => sendNotificationRaw(data));

export const fireAndForgetPipeline: Effect.Effect<SavedRecord, string> = pipe(
	fetchUser,
	Effect.flatMap(validatePermissions),
	Effect.flatMap(parseInput),
	Effect.flatMap(enrichData),
	Effect.flatMap(transformData),
	Effect.flatMap(saveRecord),
	Effect.tap((record) =>
		pipe(
			Effect.all([logAnalytics(record), sendNotif(record)], { concurrency: "unbounded" }),
			Effect.catchAll(() => Effect.void),
			Effect.fork,
		),
	),
);

// ── Run helper ──────────────────────────────────────────────────

export const runEffect = <A, E>(effect: Effect.Effect<A, E>) =>
	Effect.runPromise(effect.pipe(Effect.catchAll(() => Effect.succeed(undefined as unknown as A))));
