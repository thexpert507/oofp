// Pure imperative implementations using try/catch, null checks, async/await

// ── Creation ────────────────────────────────────────────────────

export const createSuccess = (v: number) => ({ ok: true as const, value: v });
export const createFailure = (e: string) => ({ ok: false as const, error: e });

// ── Pipeline (5-step) ───────────────────────────────────────────

export const pipeline = (input: string): { ok: boolean; value?: string; error?: string } => {
	try {
		const n = Number(input);
		if (Number.isNaN(n)) throw new Error("parse error");
		if (n < 0 || n > 1000) throw new Error("out of range");
		const doubled = n * 2;
		if (doubled % 2 !== 0) throw new Error("not even");
		return { ok: true, value: `Result: ${doubled}` };
	} catch (e) {
		return { ok: false, error: (e as Error).message };
	}
};

// ── Error handling ──────────────────────────────────────────────

export const handleSuccess = (input: string): string => {
	try {
		const n = Number(input);
		if (Number.isNaN(n)) throw new Error("parse error");
		if (n < 0 || n > 1000) throw new Error("out of range");
		const doubled = n * 2;
		return `ok: ${doubled}`;
	} catch {
		return "error";
	}
};

export const handleFailure = (input: string): string => {
	try {
		const n = Number(input);
		if (Number.isNaN(n)) throw new Error("parse error");
		if (n < 0 || n > 1000) throw new Error("out of range");
		const doubled = n * 2;
		return `ok: ${doubled}`;
	} catch {
		return "error";
	}
};

export const handleRecovery = (input: string): { ok: boolean; value: number } => {
	try {
		const n = Number(input);
		if (Number.isNaN(n)) throw new Error("parse error");
		if (n < 0 || n > 1000) throw new Error("out of range");
		return { ok: true, value: n };
	} catch {
		return { ok: true, value: 0 };
	}
};

// ── Async pipeline ──────────────────────────────────────────────

export const asyncPipeline = async (input: string): Promise<{ ok: boolean; value?: string; error?: string }> => {
	try {
		const n = Number(input);
		if (n < 0) throw new Error("parse error");
		if (n > 1000) throw new Error("out of range");
		const doubled = n * 2;
		return { ok: true, value: `Result: ${doubled}` };
	} catch (e) {
		return { ok: false, error: (e as Error).message };
	}
};

export const runAsync = <T>(p: Promise<T>) => p;
