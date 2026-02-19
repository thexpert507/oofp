/**
 * Imperative orchestration helpers using async/await + try/catch
 */
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

// ── 1. Sequential 7-step pipeline ──────────────────────────────

export const sequentialPipeline = async (): Promise<{
	ok: boolean;
	value?: Notification;
	error?: string;
}> => {
	try {
		const user: User = await fetchUserRaw();
		const perm: Permission = await validatePermissionsRaw(user);
		const input: ParsedInput = await parseInputRaw(perm);
		const enriched: EnrichedData = await enrichDataRaw(input);
		const transformed: TransformedData = await transformDataRaw(enriched);
		const saved: SavedRecord = await saveRecordRaw(transformed);
		const notif: Notification = await notifyResultRaw(saved);
		return { ok: true, value: notif };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
};

// ── 2. Parallel execution (Promise.all) ─────────────────────────

export const parallelExecution = async () => {
	try {
		const [candidate, project, application, config, template] = await Promise.all([
			fetchCandidateRaw(),
			fetchProjectRaw(),
			fetchApplicationRaw(),
			fetchConfigRaw(),
			fetchTemplateRaw(),
		]);
		return { ok: true as const, value: [candidate, project, application, config, template] };
	} catch (e) {
		return { ok: false as const, error: String(e) };
	}
};

// ── 3. Controlled concurrency (manual batching) ─────────────────

export const controlledConcurrency = async (count: number, maxConcurrent: number) => {
	try {
		const items = Array.from({ length: count }, (_, i) => i);
		const results: { index: number; processed: boolean }[] = [];

		for (let i = 0; i < items.length; i += maxConcurrent) {
			const chunk = items.slice(i, i + maxConcurrent);
			const chunkResults = await Promise.all(chunk.map((idx) => processItemRaw(idx)));
			results.push(...chunkResults);
		}

		return { ok: true as const, value: results };
	} catch (e) {
		return { ok: false as const, error: String(e) };
	}
};

// ── 4. Error recovery (nested try/catch) ────────────────────────

export const errorRecoveryPipeline = async () => {
	try {
		let record: { id: number; name: string };

		try {
			record = await Promise.reject("cache miss");
		} catch {
			try {
				record = await Promise.reject("db error");
			} catch {
				record = { id: 0, name: "default" };
			}
		}

		const enriched = { ...record, enriched: true };
		const saved = { saved: true, record: enriched };
		return { ok: true as const, value: saved };
	} catch (e) {
		return { ok: false as const, error: String(e) };
	}
};

// ── 5. Middleware wrapper (try/finally) ─────────────────────────

export const withCredits = async <A>(mainFn: () => Promise<A>): Promise<{
	ok: boolean;
	value?: A;
	error?: string;
}> => {
	const credits = { credits: 10 };
	try {
		const result = await mainFn();
		// Deduct credits on success
		await Promise.resolve({ remaining: credits.credits - 1 });
		return { ok: true, value: result };
	} catch (e) {
		// Rollback credits on failure
		await Promise.resolve(undefined);
		return { ok: false, error: String(e) };
	}
};

export const middlewarePipeline = () =>
	withCredits(async () => {
		const transformed = await transformDataRaw({
			query: "input",
			filters: [],
			metadata: { timestamp: 0, source: "" },
		});
		const saved = await saveRecordRaw(transformed);
		return saved;
	});

// ── 6. Fire-and-forget side effects ─────────────────────────────

export const fireAndForgetPipeline = async (): Promise<{
	ok: boolean;
	value?: SavedRecord;
	error?: string;
}> => {
	try {
		const user: User = await fetchUserRaw();
		const perm: Permission = await validatePermissionsRaw(user);
		const input: ParsedInput = await parseInputRaw(perm);
		const enriched: EnrichedData = await enrichDataRaw(input);
		const transformed: TransformedData = await transformDataRaw(enriched);
		const saved: SavedRecord = await saveRecordRaw(transformed);

		// Fire-and-forget: launch without awaiting
		logToAnalyticsRaw(saved).catch(() => void 0);
		sendNotificationRaw(saved).catch(() => void 0);

		return { ok: true, value: saved };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
};
