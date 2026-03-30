/**
 * @oofp/core orchestration helpers using TaskEither
 */
import * as TE from "@oofp/core/task-either";
import { pipe } from "@oofp/core/pipe";
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

// ── Lift raw promises into TaskEither ───────────────────────────

const toTE = <A>(fn: () => Promise<A>): TE.TaskEither<string, A> =>
	TE.tryCatch((e) => String(e))(fn);

const fetchUser: TE.TaskEither<string, User> = toTE(fetchUserRaw);

const validatePermissions = (user: User): TE.TaskEither<string, Permission> =>
	toTE(() => validatePermissionsRaw(user));

const parseInput = (perm: Permission): TE.TaskEither<string, ParsedInput> =>
	toTE(() => parseInputRaw(perm));

const enrichData = (input: ParsedInput): TE.TaskEither<string, EnrichedData> =>
	toTE(() => enrichDataRaw(input));

const transformData = (data: EnrichedData): TE.TaskEither<string, TransformedData> =>
	toTE(() => transformDataRaw(data));

const saveRecord = (data: TransformedData): TE.TaskEither<string, SavedRecord> =>
	toTE(() => saveRecordRaw(data));

const notifyResult = (record: SavedRecord): TE.TaskEither<string, Notification> =>
	toTE(() => notifyResultRaw(record));

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline: TE.TaskEither<string, Notification> = pipe(
	fetchUser,
	TE.chain(validatePermissions),
	TE.chain(parseInput),
	TE.chain(enrichData),
	TE.chain(transformData),
	TE.chain(saveRecord),
	TE.chain(notifyResult),
);

// ── 2. Parallel execution (applicative) ─────────────────────────

const fetchCandidate = TE.fromPromise(fetchCandidateRaw);
const fetchProject = TE.fromPromise(fetchProjectRaw);
const fetchApplication = TE.fromPromise(fetchApplicationRaw);
const fetchConfig = TE.fromPromise(fetchConfigRaw);
const fetchTemplate = TE.fromPromise(fetchTemplateRaw);

export const parallelExecution = TE.concurrency()([
	fetchCandidate,
	fetchProject,
	fetchApplication,
	fetchConfig,
	fetchTemplate,
]);

// ── 3. Controlled concurrency (20 items, max 3 concurrent) ─────

export const controlledConcurrency = (count: number, maxConcurrent: number) => {
	const tasks = Array.from({ length: count }, (_, i) =>
		TE.fromPromise(() => processItemRaw(i)),
	);
	return TE.concurrency({ concurrency: maxConcurrent })(tasks);
};

// ── 4. Error recovery (chainLeft) ───────────────────────────────

const fetchFromCache: TE.TaskEither<string, { id: number; name: string }> = TE.tryCatch(
	(e) => String(e),
)(() => Promise.reject("cache miss"));

const fetchFromDb: TE.TaskEither<string, { id: number; name: string }> = TE.tryCatch(
	(e) => String(e),
)(() => Promise.reject("db error"));

const createDefault: TE.TaskEither<string, { id: number; name: string }> = TE.of({
	id: 0,
	name: "default",
});

const enrichRecord = (r: { id: number; name: string }): TE.TaskEither<string, { id: number; name: string; enriched: boolean }> =>
	TE.of({ ...r, enriched: true });

const saveEnriched = (r: { id: number; name: string; enriched: boolean }): TE.TaskEither<string, { saved: boolean; record: typeof r }> =>
	TE.of({ saved: true, record: r });

export const errorRecoveryPipeline = pipe(
	fetchFromCache,
	TE.chainLeft(() => fetchFromDb),
	TE.chainLeft(() => createDefault),
	TE.chain(enrichRecord),
	TE.chain(saveEnriched),
);

// ── 5. Middleware wrapper (credits pattern) ─────────────────────

const checkCredits: TE.TaskEither<string, { credits: number }> = toTE(() =>
	Promise.resolve({ credits: 10 }),
);

const deductCredits = (_amount: number): TE.TaskEither<string, void> =>
	toTE(() => Promise.resolve(undefined) as Promise<void>);

const rollbackCredits = (_amount: number): TE.TaskEither<string, void> =>
	toTE(() => Promise.resolve(undefined) as Promise<void>);

export const withCredits = <A>(
	mainPipeline: TE.TaskEither<string, A>,
): TE.TaskEither<string, A> =>
	pipe(
		checkCredits,
		TE.chain((creds) =>
			pipe(
				mainPipeline,
				TE.chainw((result) =>
					pipe(
						deductCredits(creds.credits),
						TE.map(() => result),
					),
				),
				TE.chainLeft((err) =>
					pipe(
						rollbackCredits(creds.credits),
						TE.chain(() => TE.left(err)),
					),
				),
			),
		),
	);

export const middlewarePipeline = withCredits(
	pipe(
		TE.of<string, string>("input"),
		TE.chain((s) => toTE(() => transformDataRaw({ query: s, filters: [], metadata: { timestamp: 0, source: "" } }))),
		TE.chain((d) => toTE(() => saveRecordRaw(d))),
	),
);

// ── 6. Fire-and-forget side effects ─────────────────────────────

const logAnalytics = (data: unknown): TE.TaskEither<string, void> =>
	toTE(() => logToAnalyticsRaw(data) as Promise<void>);

const sendNotif = (data: unknown): TE.TaskEither<string, void> =>
	toTE(() => sendNotificationRaw(data) as Promise<void>);

export const fireAndForgetPipeline: TE.TaskEither<string, SavedRecord> = pipe(
	fetchUser,
	TE.chain(validatePermissions),
	TE.chain(parseInput),
	TE.chain(enrichData),
	TE.chain(transformData),
	TE.chain(saveRecord),
	TE.tapTEAsync((record) => logAnalytics(record)),
	TE.tapTEAsync((record) => sendNotif(record)),
);

// ── Run helper ──────────────────────────────────────────────────

export const runTE = TE.run;
